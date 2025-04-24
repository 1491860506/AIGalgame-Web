/**
 * 选项管理服务
 * 处理AI生成的选项，保存和检索选项数据
 * 
 * Current Date and Time (UTC): 2025-04-19 04:20:53
 * Current User's Login: djfaaa
 */

import { gpt, gptDestroy } from './AiModelService';
import { processPrompt } from './PromptService';
import { readFile, writeFile, createFolder } from './IndexedDBFileSystem';

/**
 * 加载配置
 * @returns {Object|null} 配置对象，如果加载失败则返回 null
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
    console.error("解析配置文件失败:", error);
    return null;
  }
}

/**
 * 获取选项
 * @param {string} targetId - 目标ID
 * @returns {Promise<string>} 处理结果，成功返回"success"，失败返回"error"
 */
async function getChoice(targetId) {
  console.log(`开始为目标ID ${targetId} 获取选项`);
  
  // 加载配置
  const config = loadConfig();
  if (!config) {
    console.error("加载配置失败");
    return "error";
  }
  
  // 获取故事标题
  const storyTitle = config.剧情?.story_title;
  if (!storyTitle) {
    console.error("配置中未找到故事标题");
    return "error";
  }
  
  // 构建保存路径
  const savePath = `/data/${storyTitle}/choice.json`;
  
  
  // 构建提示词
  let prompt1, prompt2;
  try {
    [prompt1, prompt2] = await processPrompt('选项');
  } catch (error) {
    console.error("处理提示词失败:", error);
    return "error";
  }
  
  // 生成用于 GPT 调用的随机 request_id
  const requestId = Math.floor(Math.random() * 100000) + 1;
  
  while (true) {
    try {
      // 调用 GPT
      const output = await gpt(prompt1, prompt2, 'option', requestId);
      
      if (output === "error") {
        console.error(`GPT 返回错误，requestId: ${requestId}`);
        continue; // 继续尝试
      } else if (output === "over_times") {
        console.error(`GPT 调用超出最大重试次数，requestId: ${requestId}`);
        return "error";
      }
      
      // 从输出中提取 JSON
      const startIndex = output.indexOf('{');
      const endIndex = output.lastIndexOf('}');
      
      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        const jsonString = output.substring(startIndex, endIndex + 1);
        
        try {
          // 解析提取的 JSON
          const parsedData = JSON.parse(jsonString);
          
          // 验证 JSON 是否包含必要的键
          if ("choice1" in parsedData && "choice2" in parsedData && "choice3" in parsedData) {
            // 获取选项值
            const choice1Val = parsedData["choice1"];
            const choice2Val = parsedData["choice2"];
            const choice3Val = parsedData["choice3"];
            
            // 读取现有文件内容，如果不存在则创建新对象
            let finalData = {};
            try {
              const existingData = await readFile(savePath);
              if (existingData) {
                finalData = existingData;
              }
            } catch (error) {
              // 文件不存在或读取错误，使用空对象
              console.log(`未找到现有选项文件或读取错误: ${error.message}`);
            }
            
            // 找到最大 ID
            let maxId = -1;
            
            // 遍历所有键和列表
            for (const [key, value] of Object.entries(finalData)) {
              if (Array.isArray(value)) {
                for (const item of value) {
                  if (typeof item === 'object' && item !== null && "id" in item) {
                    try {
                      const currentId = parseInt(item["id"]);
                      maxId = Math.max(maxId, currentId);
                    } catch (error) {
                      console.warn(`发现无效的ID格式: ${item['id']}, 跳过`);
                    }
                  }
                }
              }
            }
            
            // 尝试将 targetId 转为整数并更新 maxId
            try {
              const targetIdInt = parseInt(targetId);
              maxId = Math.max(maxId, targetIdInt);
            } catch (error) {
              console.warn(`无效的目标ID格式: ${targetId}, 在生成新ID时不会考虑它`);
            }
            
            // 生成新ID
            const newId1 = (maxId + 1).toString();
            const newId2 = (maxId + 2).toString();
            const newId3 = (maxId + 3).toString();
            
            // 创建包含选项和新ID的数组
            const choiceList = [
              { "choice1": choice1Val, "id": newId1 },
              { "choice2": choice2Val, "id": newId2 },
              { "choice3": choice3Val, "id": newId3 }
            ];
            
            // 使用 targetId 作为键，将结果保存到 finalData
            finalData[targetId] = choiceList;
            
            // 保存到文件
            console.log(`保存最终的JSON结构到: ${savePath}`);
            await writeFile(savePath, finalData);
            
            console.log(`成功保存目标ID '${targetId}' 的选项到 ${savePath}`);
            gptDestroy(requestId); // 成功后销毁 GPT 实例
            return "success";
          } else {
            console.error(`解析的JSON不包含必要的键 ('choice1', 'choice2', 'choice3'): ${parsedData}`);
            continue; // 继续尝试
          }
        } catch (error) {
          console.error(`JSON解析错误，requestId ${requestId}: ${error.message}`);
          console.error(`有问题的JSON字符串: ${jsonString}`);
          continue; // 继续尝试
        }
      } else {
        console.error(`在GPT输出中未找到JSON起始和结束标记，requestId: ${requestId}`);
        continue; // 继续尝试
      }
    } catch (error) {
      // 捕获更广泛的循环内错误
      console.error(`循环内发生意外错误，requestId ${requestId}: ${error.message}`);
      console.error(error.stack);
      continue; // 继续尝试
    }
  }
}

/**
 * 追溯ID链
 * @param {string} startId - 起始ID
 * @returns {Promise<string[]>} ID链，如果追溯失败则返回空数组
 */
async function traceIdChain(startId,storyTitle='None') {
  console.log(`开始追溯ID链，起始ID: ${startId}`);
  startId=String(startId)
  // 如果起始ID是"0"，直接返回
  if (startId === "0") {
    return ["0"];
  }
  if (storyTitle==='None'){
  // 加载配置
  const config = loadConfig();
  if (!config) {
    console.error("加载配置失败");
    return [];
  }
  
  // 获取故事标题
  storyTitle = config.剧情?.story_title;
  if (!storyTitle) {
    console.error("配置中未找到故事标题");
    return [];
  }}
  
  // 构建选项文件路径
  const savePath = `/data/${storyTitle}/choice.json`;
  
  // 读取选项文件
  let finalData;
  try {
    finalData = await readFile(savePath);
  } catch (error) {
    console.error(`选项文件未找到或包含无效的JSON: ${savePath}`);
    return [];
  }
  
  // 开始追溯
  const chain = [startId];
  let currentId = startId;
  
  while (currentId !== "0") {
    let found = false;
    
    for (const [targetId, choices] of Object.entries(finalData)) {
      // 确保选项是数组，并遍历其中的每个对象
      if (Array.isArray(choices)) {
        for (const choice of choices) {
          // 确保选项是对象且包含ID键
          if (typeof choice === 'object' && choice !== null && "id" in choice) {
            if (choice["id"] === currentId) {
              chain.push(targetId);
              currentId = targetId;
              found = true;
              break;
            }
          }
        }
        if (found) {
          break; // 如果找到，跳出外层循环
        }
      }
    }
    
    if (!found) {
      console.error(`无法追溯ID: ${currentId}，返回空数组`);
      return [];
    }
  }
  
  // 将ID从小到大排序
  return chain.sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * 合并故事
 * @param {string} targetId - 目标ID
 * @returns {Promise<number>} 1: 成功合并所有文件，0: 目标ID文件不存在但成功合并其他文件，-1: 合并失败
 */
async function mergeStory(targetId) {
  targetId=String(targetId);
  console.log(`开始合并故事，目标ID: ${targetId}`);
  
  // 加载配置
  const config = loadConfig();
  if (!config) {
    console.error("加载配置失败");
    return -1;
  }
  
  // 获取故事标题
  const storyTitle = config.剧情.story_title;
  if (!storyTitle) {
    console.error("配置中未找到故事标题");
    return -1;
  }
  
  // 构建路径
  const storyDirectory = `/data/${storyTitle}/story`;
  const outputJsonPath = `${storyDirectory}/story.json`;
  const outputTxtPath = `${storyDirectory}/story.txt`;
  const placeJsonPath = `${storyDirectory}/place.json`;
  
  // 确保目录存在
  await createFolder(storyDirectory);
  
  // 获取ID链
  const idChain = await traceIdChain(targetId);
  if (!idChain || idChain.length === 0) {
    console.error("获取ID链失败");
    return -1;
  }
  
  // 合并对话
  const mergedConversations = [];
  let isTargetFileExist = 0; // 标记目标ID文件是否存在
  let lastValidPlace = ""; // 追踪上一个非空场景
  const totalPlaces = new Set(); // 用于记录所有非重复场景
  const newPlacesInTargetId = []; // 目标ID中的新场景
  
  try {
    for (const id of idChain) {
      const filePath = `${storyDirectory}/${id}.json`;
      
      // 检查是否为目标ID
      if (id === targetId) {
        try {
          const data = await readFile(filePath);
          if (data) {
            isTargetFileExist = 1;
            const conversations = data.conversations || [];
            
            // 收集目标ID文件中的新场景
            for (const conv of conversations) {
              const place = conv.place || "";
              if (place && !totalPlaces.has(place)) {
                newPlacesInTargetId.push(place);
                totalPlaces.add(place);
              }
            }
            
            mergedConversations.push(...conversations);
          }
        } catch (error) {
          // 目标文件不存在，isTargetFileExist保持为0
          console.log(`目标文件不存在: ${filePath}`);
        }
        continue;
      }
      
      // 读取其他ID的文件
      try {
        const data = await readFile(filePath);
        if (!data) {
          console.error(`文件内容无效: ${filePath}`);
          return -1;
        }
        
        const conversations = data.conversations || [];
        mergedConversations.push(...conversations);
        
        // 记录出现过的场景
        for (const conv of conversations) {
          const place = conv.place || "";
          if (place) {
            totalPlaces.add(place);
          }
        }
      } catch (error) {
        console.error(`无法读取必要的文件: ${filePath}`);
        return -1;
      }
    }
    
    // 清理对话中的ID和场景重复
    for (let i = 0; i < mergedConversations.length; i++) {
      // 删除ID字段
      if ('id' in mergedConversations[i]) {
        delete mergedConversations[i]['id'];
      }
      
      // 处理场景重复
      const currentPlace = mergedConversations[i].place || "";
      
      if (currentPlace !== lastValidPlace && currentPlace !== "") {
        // 不同的有效场景，记录它
        lastValidPlace = currentPlace;
      } else if (currentPlace === lastValidPlace && currentPlace !== "") {
        // 与上次相同的场景，置空
        mergedConversations[i].place = "";
      }
      // 如果当前场景为空，不做处理
    }
  } catch (error) {
    console.error(`合并故事时发生错误: ${error.message}`);
    return -1;
  }
  
  // 保存合并后的数据到JSON文件
  try {
    await writeFile(outputJsonPath, { conversations: mergedConversations });
    console.log(`成功合并对话并保存到: ${outputJsonPath}`);
  } catch (error) {
    console.error(`保存到输出JSON文件失败: ${error.message}`);
    return -1;
  }
  
  // 保存为TXT文件
  try {
    let txtContent = "";
    
    for (const conv of mergedConversations) {
      const character = conv.character || "";
      const text = conv.text || "";
      const place = conv.place || "";
      
      let line;
      if (character) {
        line = `${character}：${text}`;
      } else {
        line = `旁白：${text}`;
      }
      
      if (place) {
        line += `[${place}]`;
      }
      
      txtContent += line + "\n";
    }
    
    await writeFile(outputTxtPath, txtContent);
    console.log(`成功保存对话到TXT文件: ${outputTxtPath}`);
  } catch (error) {
    console.error(`保存到输出TXT文件失败: ${error.message}`);
    return -1;
  }
  
  // 处理场景JSON文件（仅在目标文件存在时）
  if (isTargetFileExist) {
    try {
      await writeFile(placeJsonPath, newPlacesInTargetId);
      console.log(`成功保存新场景到: ${placeJsonPath}`);
    } catch (error) {
      console.error(`保存到场景JSON文件失败: ${error.message}`);
      // 场景文件保存失败不影响整体流程
    }
  }
  
  return isTargetFileExist ? 1 : 0;
}

/**
 * 获取选项ID
 * @param {string} targetId - 目标ID
 * @param {string} choiceText - 选项文本
 * @returns {Promise<string|number>} 选项ID或-1表示出错
 */
async function getChoiceId(targetId, choiceText) {
  console.log(`开始获取选项ID，目标ID: ${targetId}，选项文本: ${choiceText}`);
  if (targetId==='none'){
    return parseInt(choiceText);
  }
  // 加载配置
  const config = loadConfig();
  if (!config) {
    console.error("加载配置失败");
    return -1;
  }
  
  // 获取故事标题
  const storyTitle = config.剧情?.story_title;
  if (!storyTitle) {
    console.error("配置中未找到故事标题");
    return -1;
  }
  
  // 构建选项文件路径
  const savePath = `/data/${storyTitle}/choice.json`;
  
  // 读取选项文件
  let finalData;
  try {
    finalData = await readFile(savePath);
  } catch (error) {
    console.log(`选项文件未找到或包含无效的JSON: ${savePath}`);
    finalData = {}; // 如果文件不存在，创建空对象
  }
  
  // 查找现有选项
  if (targetId in finalData) {
    for (const choice of finalData[targetId]) {
      // 检查是否存在该选项
      const values = Object.values(choice);
      if (values.includes(choiceText)) {
        return choice.id.toString();
      }
    }
  } else {
    console.error(`目标ID '${targetId}' 在选项文件中未找到`);
  }
  
  // 如果目标ID存在但未找到选项文本，添加新选项
  if (targetId in finalData) {
    // 找到最大ID
    let maxId = -1;
    
    // 遍历所有键和列表
    for (const [key, value] of Object.entries(finalData)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && "id" in item) {
            try {
              const currentId = parseInt(item.id);
              maxId = Math.max(maxId, currentId);
            } catch (error) {
              console.warn(`发现无效的ID格式: ${item.id}, 跳过: ${error.message}`);
            }
          }
        }
      }
    }
    
    // 生成新ID
    const newId = (maxId + 1).toString();
    
    // 创建新选项
    const newChoice = { "choice": choiceText, "id": newId };
    
    // 添加到现有数据
    finalData[targetId].push(newChoice);
    console.log(`为目标ID '${targetId}' 创建了新选项，ID: '${newId}'`);
    
    // 保存修改后的数据
    try {
      await writeFile(savePath, finalData);
      return newId;
    } catch (error) {
      console.error(`保存到选项文件失败: ${error.message}`);
      return -1;
    }
  } else {
    console.error(`目标ID不存在: ${targetId}`);
    return -1;
  }
}

/**
 * 获取选项文本
 * @param {string} targetId - 目标ID
 * @returns {Promise<string>} 选项文本
 */
async function getChoiceText(targetId){
    // 构建选项文件路径
    const config = loadConfig();
    const storyTitle = config.剧情?.story_title;
    if (!storyTitle) {
      console.error("配置中未找到故事标题");
      return targetId;
    }
    const Path = `/data/${storyTitle}/choice.json`;
  
    // 读取选项文件
    let jsonData;
    try {
      jsonData = await readFile(Path);
    } catch (error) {
      console.log(`选项文件未找到或包含无效的JSON: ${Path}`);
      jsonData = {}; // 如果文件不存在，创建空对象
    }

    for (const key in jsonData) {
      if (jsonData.hasOwnProperty(key)) {
        const choices = jsonData[key];
        for (const choiceObj of choices) {
          if (choiceObj.id === String(targetId)) {
            // 找到匹配的 id，从对象中找到 choice 对应的键和值
            for (const choiceKey in choiceObj) {
              if (choiceKey.startsWith("choice")) { // 确保是 choice 类型的键 (choice1, choice2, choice等)
                return choiceObj[choiceKey];
              }
            }
          }
        }
      }
    }
    return targetId; // 如果没有找到匹配的 id，返回 null

}

export { getChoice, traceIdChain, mergeStory, getChoiceId,getChoiceText };