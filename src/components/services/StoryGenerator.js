/**
 * 故事生成服务
 * 使用localStorage配置和IndexedDB文件存储

 */

import { gpt, gptDestroy } from './AiModelService';
import { processPrompt } from './PromptService';
import { readFile, writeFile, createFolder,deletePath } from './IndexedDBFileSystem';
import {getChoiceText} from './ChoiceManager';
/**
 * 加载配置
 * @returns {Object} 配置对象
 */
function loadConfig() {
  try {
    const configStr = localStorage.getItem('aiGalgameConfig');
    if (!configStr) {
      console.error("配置文件未找到");
      return null;
    }
    return JSON.parse(configStr);
  } catch (error) {
    console.error("加载配置失败:", error);
    return null;
  }
}

/**
 * 生成JSON数据
 * @param {string} prompt1 - 系统提示词
 * @param {string} prompt2 - 用户提示词
 * @param {string} storyTitle - 故事标题
 * @param {number} id - 请求ID
 * @param {string} storyId - 故事ID
 * @returns {Promise<string>} - 生成结果
 */
async function generateJson(prompt1, prompt2, storyTitle, id, storyId) {
  const failures = [];
  
  while (true) {
    try {
      console.log(`开始生成故事片段 ID:${id}, 故事ID:${storyId}`);
      
      // 调用GPT生成内容
      const jsonString = await gpt(prompt1, prompt2, 'plot', id);
      
      if (jsonString === "error") {
        failures.push("GPT返回错误");
        continue;
      } else if (jsonString === "over_times") {
        console.error("GPT调用超出最大重试次数");
        return `故事生成错误：达到最大尝试次数，失败原因：${failures.join(", ")}`;
      }
      
      // 处理JSON数据
      const filePath = `/data/${storyTitle}/story/${storyId}.json`;
      const result = await processJsonData(jsonString, filePath);
      
      if (result === "success") {
        gptDestroy(id);
        return "成功生成对话";
      }
      
      failures.push("无效的JSON数据");
    } catch (error) {
      failures.push(`异常：${error.message}`);
      console.error("生成JSON数据失败:", error);
    }
  }
}

/**
 * 处理JSON数据
 * @param {string} jsonStr - JSON字符串
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} - 处理结果
 */
async function processJsonData(jsonStr, filePath) {
  try {
    // 提取有效的JSON对象
    const newObjects = extractValidObjects(jsonStr);
    if (!newObjects || newObjects.length === 0) {
      console.error("未找到有效的JSON对象");
      return "error";
    }
    
    // 更新对话ID，每次都从1开始
    for (let i = 0; i < newObjects.length; i++) {
      newObjects[i].id = i + 1;
    }
    
    // 处理场景重复问题
    let previousPlace = null;
    for (const conv of newObjects) {
      const current = conv.place;
      if (current === previousPlace) {
        conv.place = "";
      } else if (current !== "") {
        previousPlace = current;
      }
    }
    
    // 确保目录存在
    await createFolder(filePath.substring(0, filePath.lastIndexOf('/')));
    
    // 保存数据，覆盖现有文件
    const dataToSave = { conversations: newObjects };
    await writeFile(filePath, dataToSave);
    
    console.log(`成功保存对话到: ${filePath}`);
    return "success";
  } catch (error) {
    console.error("处理JSON数据失败:", error);
    return "error";
  }
}

/**
 * 提取有效的JSON对象
 * @param {string} jsonStr - JSON字符串
 * @returns {Array} - 有效的JSON对象数组
 */
function extractValidObjects(jsonStr) {
  const objects = [];
  const startIndex = jsonStr.indexOf('[') + 1;
  
  if (startIndex <= 0) {
    // 尝试直接解析整个字符串
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        return parsed.filter(obj => 
          obj && typeof obj === 'object' && 
          'place' in obj && 'character' in obj && 'text' in obj
        );
      }
    } catch (e) {
      console.warn("无法直接解析JSON字符串");
    }
  }
  
  // 手动解析嵌套的对象
  let braceLevel = 0;
  let buffer = [];
  
  for (const char of jsonStr.substring(startIndex)) {
    if (char === '{') {
      braceLevel++;
      buffer.push(char);
    } else if (char === '}') {
      braceLevel--;
      buffer.push(char);
      
      if (braceLevel === 0) {
        try {
          const obj = JSON.parse(buffer.join(''));
          if ('place' in obj && 'character' in obj && 'text' in obj) {
            objects.push(obj);
          }
          buffer = [];
        } catch (error) {
          buffer = [];
        }
      }
    } else if (buffer.length > 0) {
      buffer.push(char);
    }
  }
  
  return objects;
}

/**
 * 开始故事
 * @returns {Promise<string>} - 操作结果
 */
async function beginStory() {
  const configData = loadConfig();
  if (!configData) return "配置加载失败";
  
  const storyTitle = configData.剧情?.story_title || "";
  if (!storyTitle) return "未找到故事标题";
  
  // 确保故事目录存在
  await createFolder(`/data/${storyTitle}/story`);
  
  // 获取提示词
  const [prompt1, prompt2] = await processPrompt('故事开头');
  
  // 生成故事
  const id = Math.floor(Math.random() * 100000) + 1;
  const result = await generateJson(prompt1, prompt2, storyTitle, id, "0");
  if(result!=="成功生成对话"){
    throw new Error(result);
    
  }
  console.log(result);
  return result;
}

/**
 * 继续故事
 * @param {string} answer - 用户选择的答案
 * @param {string} storyId - 故事ID
 * @returns {Promise<string>} - 操作结果
 */
async function continueStory(answer, storyId) {
  const configData = loadConfig();
  if (!configData) return "配置加载失败";
  
  const storyTitle = configData.剧情?.story_title || "";
  if (!storyTitle) return "未找到故事标题";
  
  // 保存用户回答
  const answerPath = `/data/${storyTitle}/answer.txt`;
  answer=await getChoiceText(answer);
  await writeFile(answerPath, answer);
  
  // 获取提示词
  const [prompt1, prompt2] = await processPrompt('故事继续');
  
  // 继续故事
  const id = Math.floor(Math.random() * 100000) + 1;
  const result = await generateJson(prompt1, prompt2, storyTitle, id, storyId);
  
  // 删除临时回答文件
  try {
    await deletePath(answerPath);
  } catch (error) {
    console.warn("删除临时回答文件失败", error);
  }
  
  console.log(result);
  return result;
}

/**
 * 结束故事
 * @param {string} storyId - 故事ID
 * @returns {Promise<string>} - 操作结果
 */
async function endStory(storyId) {
  console.log("开始end_story");
  
  const configData = loadConfig();
  if (!configData) return "配置加载失败";
  
  const storyTitle = configData.剧情?.story_title || "";
  if (!storyTitle) return "未找到故事标题";
  
  // 获取提示词
  const [prompt1, prompt2] = await processPrompt('故事结尾');
  
  // 生成故事结尾
  const id = Math.floor(Math.random() * 100000) + 1;
  const result = await generateJson(prompt1, prompt2, storyTitle, id, storyId);
  
  return result;
}



export {
  beginStory,
  continueStory,
  endStory
};