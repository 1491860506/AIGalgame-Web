/**
 * 大纲生成服务
 * 使用IndexedDBFileSystem模块实现文件操作

 */

import { gpt, gptDestroy } from './AiModelService';
import { processPrompt } from './PromptService';
import { 
  readFile, 
  writeFile, 
  createFolder, 
  listDirectory, 
  getMetadata, 
  getAllTitles 
} from './IndexedDBFileSystem';

/**
 * 从字符串中提取JSON对象
 * @param {string} inputString - 输入字符串
 * @returns {string|null} - 提取的JSON字符串，如果找不到则返回null
 */
function getJsonOutline(inputString) {
  try {
    const startIndex = inputString.indexOf('{');
    const endIndex = inputString.lastIndexOf('}');
    
    if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
      return null; // 未找到有效的JSON
    }
    
    const jsonString = inputString.substring(startIndex, endIndex + 1);
    return jsonString;
  } catch (error) {
    console.error("提取JSON时发生错误:", error);
    return null;
  }
}

/**
 * 清理文件名，替换或移除不允许的字符
 * @param {string} filename - 原始文件名
 * @returns {string} - 清理后的文件名
 */
function cleanFilename(filename) {
  const replacements = {
    "\\": "、",
    "/": "、",
    ":": "：",
    "*": "＊",
    "?": "？",
    "\"": "”",
    "<": "＜",
    ">": "＞",
    "|": "｜"
  };
  
  let cleanedName = filename;
  for (const [char, replacement] of Object.entries(replacements)) {
    cleanedName = cleanedName.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
  }
  
  // 删除replacements里没有的特殊字符
  cleanedName = cleanedName.replace(/[\\/:*?"<>|]/g, '');
  
  return cleanedName;
}

/**
 * 获取大纲
 * @returns {Promise<string>} - 成功返回"success"，失败返回"error"
 */
async function getOutline() {
  // 加载配置
  let config;
  try {
    const configStr = localStorage.getItem('aiGalgameConfig');
    if (!configStr) {
      console.error("配置文件未找到");
      return "配置文件未找到";
    }
    
    config = JSON.parse(configStr);
  } catch (error) {
    console.error("解析配置文件失败:", error);
    return "解析配置文件失败:";
  }
  
  // 从配置获取主题
  const theme = config.剧情?.outline_content_entry || "";
  
  // 处理提示词
  const [prompt, userInput] = await processPrompt('大纲');
  
  // 生成随机ID
  const id = Math.floor(Math.random() * 100000) + 1;
  
  while (true) {
    try {
      // 调用GPT生成大纲
      console.log(`[${new Date().toISOString()}] 正在调用GPT生成大纲...`);
      const gptResponse = await gpt(prompt, userInput, '大纲', id);
      
      if (gptResponse === "error") {
        console.error("尝试失败，失败原因：GPT函数返回错误");
        continue;
      } else if (gptResponse === "over_times") {
        console.error("GPT调用超出最大重试次数");
        return "GPT调用超出最大重试次数";
      }
      
      // 提取JSON对象
      const extractedJson = getJsonOutline(gptResponse);
      if (extractedJson === null) {
        console.error("尝试失败，失败原因：未提取到有效的JSON对象");
        continue;
      }
      
      // 解析JSON
      let jsonObject;
      try {
        jsonObject = JSON.parse(extractedJson);
        if (!jsonObject.title || !jsonObject.outline || !jsonObject.character) {
          console.error("尝试失败，失败原因：JSON对象不包含必要的键 (title, outline, character)");
          continue;
        }
      } catch (error) {
        console.error("尝试失败，失败原因：JSON解码错误:", error);
        continue;
      }
      
      try {
        // 清理标题
        const title = jsonObject.title;
        const cleanedTitle = cleanFilename(title);
        jsonObject.title = cleanedTitle;
        
        // 检查标题是否存在，如果存在则添加序号
        let finalTitle = cleanedTitle;
        const titles = await getAllTitles();
        
        if (titles.includes(cleanedTitle)) {
          let index = 1;
          while (true) {
            const newTitle = `${cleanedTitle}-${index}`;
            if (!titles.includes(newTitle)) {
              finalTitle = newTitle;
              break;
            }
            index++;
          }
        }
        
        console.log(`[${new Date().toISOString()}] 使用标题: ${finalTitle}`);
        
        // 确保文件夹结构存在
        const dirPath = `/data/${finalTitle}`;
        
        // 使用IndexedDBFileSystem创建文件夹
        try {
          await createFolder(dirPath);
          console.log(`[${new Date().toISOString()}] 创建目录: ${dirPath}`);
        } catch (error) {
          // 如果文件夹已存在，这个错误可以忽略
          console.log(`[${new Date().toISOString()}] 目录已存在或创建失败: ${error.message}`);
        }
        
        // 保存character.json
        const characterFilePath = `${dirPath}/character.json`;
        await writeFile(characterFilePath, jsonObject.character);
        console.log(`[${new Date().toISOString()}] 已保存: ${characterFilePath}`);
        
        // 保存outline.json（删除character后）
        const outlineData = { ...jsonObject };
        delete outlineData.character;
        
        const outlineFilePath = `${dirPath}/outline.json`;
        await writeFile(outlineFilePath, outlineData);
        console.log(`[${new Date().toISOString()}] 已保存: ${outlineFilePath}`);
        
        // 更新配置
        config.剧情 = config.剧情 || {};
        config.剧情.story_title = finalTitle;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        console.log(`[${new Date().toISOString()}] 获取大纲成功`);
        gptDestroy(id);
        return "success";
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 尝试失败，失败原因：处理JSON或创建存储时发生错误:`, error);
        continue;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 尝试失败，失败原因：发生内部错误:`, error);
      continue;
    }
  }
}

/**
 * 加载大纲内容
 * @param {string} title - 大纲标题
 * @returns {Promise<{outline: Object, character: Object}>} 大纲内容
 */
async function loadOutlineContent(title) {
  try {
    // 读取outline.json
    const outlineData = await readFile(`/data/${title}/outline.json`);
    
    // 读取character.json
    const characterData = await readFile(`/data/${title}/character.json`);
    
    return {
      outline: outlineData,
      character: characterData
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 加载大纲内容失败:`, error);
    throw error;
  }
}

/**
 * 获取所有大纲标题
 * @returns {Promise<string[]>} 标题列表
 */
async function getAllOutlineTitles() {
  try {
    return await getAllTitles();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 获取大纲标题列表失败:`, error);
    return [];
  }
}

/**
 * 获取大纲目录结构
 * @param {string} title - 大纲标题
 * @returns {Promise<Array>} 目录结构
 */
async function getOutlineStructure(title) {
  try {
    const rootItems = await listDirectory(`/data/${title}`);
    
    // 递归获取子目录结构
    const structure = [];
    
    for (const item of rootItems) {
      const itemInfo = {
        name: item.name,
        isFolder: item.isFolder,
        path: item.path
      };
      
      if (item.isFolder) {
        // 递归获取子目录
        const subItems = await listDirectory(item.path);
        itemInfo.children = subItems.map(subItem => ({
          name: subItem.name,
          isFolder: subItem.isFolder,
          path: subItem.path
        }));
      } else {
        // 获取文件元数据
        const metadata = await getMetadata(item.path);
        itemInfo.size = metadata.size;
        itemInfo.lastModified = metadata.lastModified;
      }
      
      structure.push(itemInfo);
    }
    
    return structure;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 获取大纲目录结构失败:`, error);
    return [];
  }
}

/**
 * 保存大纲内容
 * @param {string} title - 大纲标题
 * @param {Object} outlineData - 大纲数据
 * @param {Object} characterData - 角色数据
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveOutlineContent(title, outlineData, characterData) {
  try {
    // 保存outline.json
    await writeFile(`/data/${title}/outline.json`, outlineData);
    
    // 保存character.json
    await writeFile(`/data/${title}/character.json`, characterData);
    
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 保存大纲内容失败:`, error);
    return false;
  }
}

// 导出服务功能
export {
  getOutline,
  loadOutlineContent,
  getAllOutlineTitles,
  getOutlineStructure,
  saveOutlineContent,
  cleanFilename
};