import { readFile } from './IndexedDBFileSystem';

async function processPrompt(kind) {
    try {
      // Load config from localStorage
      const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
      
      // Get language and story settings
      const lang = config?.剧情?.language || '中文';
      const storyTitle = config?.剧情?.story_title || '';
      
      // In browser environment, we need to handle paths differently
      // We'll use a relative path from the root
      const dataPath = `/data/${storyTitle}`;
      
      /**
       * Recursively retrieves a value from a nested dictionary given a list of keys.
       * Handles integer keys and string keys differently.
       */
      function getNestedValue(data, keys) {
        try {
          for (const key of keys) {
            // Attempt to convert key to integer, but only if it's not a string representation
            const parsedKey = key.isDigit ? parseInt(key) : key;
            data = data[parsedKey];
          }
          return data;
        } catch (error) {
          return null;
        }
      }
      
      /**
       * Replaces config variables in the template with values from config
       */
      function replaceConfigMatch(match, group1, group2, group3, group4) {
        try {
          group1 = group1.trim();
          group2 = group2.trim();
          group3 = group3.trim();
          group4 = group4.trim();
          
          // Process group4 to retrieve the config value
          let configValue = '';
          if (group4 && group4.includes(',')) {
            const keys = group4.split(',').map(part => part.trim());
            const value = getNestedValue(config, keys);
            configValue = value !== null ? String(value) : '';
          }
          
          if (!group1) {
            return `${group3}${configValue}`;
          } else {
            // Process group1
            let group1Value = null;
            if (group1 && group1.includes(',')) {
              const group1Keys = group1.split(',').map(part => part.trim());
              group1Value = getNestedValue(config, group1Keys);
            }
            
            // Process group2
            let comparisonValue;
            let group1Processed = group1Value !== null ? group1Value : false;
            
            if (/^\d+$/.test(group2)) {
              // If group2 is a number, check if it's odd
              const condition = parseInt(group2) % 2 === 1;
              comparisonValue = condition;
              group1Processed = Boolean(group1Processed);
            } else {
              // Group2 is a string or a reference to a config value
              if (group2.includes(',')) {
                const group2Keys = group2.split(',').map(part => part.trim());
                const group2Value = getNestedValue(config, group2Keys);
                comparisonValue = group2Value !== null ? String(group2Value) : '';
              } else if (group2.startsWith('!') && String(group2.substring(1)) !== String(group1Processed)) {
                return `${group3}${configValue}`;
              } else {
                comparisonValue = group2;
              }
              
              group1Processed = group1Processed !== null ? String(group1Processed) : '';
            }
            
            if (String(group1Processed) === String(comparisonValue)) {
              return `${group3}${configValue}`;
            } else {
              return '';
            }
          }
        } catch (error) {
          console.error('Config replacement error:', error);
          return '';
        }
      }
      
      /**
       * 使用IndexedDB文件系统读取文件内容
       * @param {string} match - 完整匹配字符串
       * @param {string} argsStr - 文件路径参数
       * @returns {Promise<string>} - 文件内容
       */
       async function replaceGetFile(match, argsStr) {
          try {
            // 处理路径参数
            const normalizedPath = argsStr.replace(/\\/g, '/').trim();
            
            // 构建完整路径
            let fullPath;
            if (normalizedPath.startsWith('/data/')) {
              // 已经是绝对路径
              fullPath = normalizedPath;
            } else if (normalizedPath.startsWith('/')) {
              // 路径以"/"开头但不是"/data/"开头
              fullPath = `/data/${storyTitle}${normalizedPath}`;
            } else {
              // 相对路径
              fullPath = `${dataPath}${normalizedPath}`;
            }
            
            console.log(`尝试读取文件: ${fullPath}`);
            
            // 使用 IndexedDBFileSystem 读取文件
            const content = await readFile(fullPath);
            
            // 确保返回字符串，无论内容是什么类型
            if (content === null || content === undefined) {
              return '';
            } else if (typeof content === 'string') {
              return content;
            } else if (content instanceof Blob) {
              // 如果是二进制数据，尝试转换为文本
              return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(`[二进制文件: ${argsStr}]`);
                reader.readAsText(content);
              });
            } else if (typeof content === 'object') {
              // 如果是对象（包括JSON），转换为格式化的JSON字符串
              try {
                return JSON.stringify(content, null, 2);
              } catch (error) {
                console.error('JSON转换失败:', error);
                return `[无法序列化对象: ${argsStr}]`;
              }
            } else {
              // 其他任何类型（数字、布尔值等）转换为字符串
              return String(content);
            }
          } catch (error) {
            console.error('读取文件失败:', error);
            return `[无法读取文件: ${argsStr}]`;
          }
        }
      
      // Load prompt data from localStorage
      const promptData = config?.提示词 || [];
      
      // Find the target kind
      const target = promptData.find(item => item.kind === kind);
      if (!target) {
        return ['error', 'error'];
      }
      
      // Build content dictionary
      const contentDict = {};
      for (const item of target.content) {
        contentDict[item.id] = item.prompt || '';
      }
      
      // Language mapping logic
      const langMap = {
        '中文': ['1', '2'],
        '英文': ['3', '4'],
        '日文': ['5', '6']
      };
      
      const ids = langMap[lang] || ['1', '2'];
      let p1 = contentDict[ids[0]] || '';
      let p2 = contentDict[ids[1]] || '';
      
      // Fallback logic
      if (!p1.trim() && !p2.trim()) {
        p1 = contentDict['1'] || '';
        p2 = contentDict['2'] || '';
        if (!p1.trim() && !p2.trim()) {
          console.error('No prompt templates set');
          return ['error', 'error'];
        }
      }
      
      /**
       * 处理提示词模板，替换变量
       * @param {string} text - 提示词模板
       * @returns {Promise<string>} - 处理后的提示词
       */
      async function process(text) {
        // Replace config variables
        let processed = text.replace(/\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|/g, 
          (match, g1, g2, g3, g4) => replaceConfigMatch(match, g1, g2, g3, g4));
        
        // Replace path variables
        processed = processed.replace(/{data_path}/g, dataPath);
        
        // Fix any trailing commas in JSON structures
        processed = processed.replace(/,\}/g, '}').replace(/,\]/g, ']');
        
        // Handle file inclusions with the updated replaceGetFile function
        // Since this is now async, we need to process them differently
        const fileMatches = processed.match(/\{getfile\((.*?)\)\}/g) || [];
        for (const fileMatch of fileMatches) {
          const argsStr = fileMatch.match(/\{getfile\((.*?)\)\}/)[1];
          const fileContent = await replaceGetFile(fileMatch, argsStr);
          processed = processed.replace(fileMatch, fileContent);
        }
        
        return processed;
      }
      
      // Process both prompts
      const processedP1 = p1.trim() ? await process(p1) : '';
      const processedP2 = p2.trim() ? await process(p2) : '';
      
      return [processedP1, processedP2];
    } catch (error) {
      console.error('Error processing prompt:', error);
      return ['error', 'error'];
    }
  }


  export { processPrompt }