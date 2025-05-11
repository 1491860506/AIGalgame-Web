/**
 * AI模型服务
 * 基于配置管理多模型请求，支持优先级和权重选择
 */

// 全局状态存储
const gptModelList = new Map();
const pendingDestruction = new Set();

/**
 * 映射模型种类
 * @param {string} kind - 原始种类名称
 * @returns {string} - 映射后的种类名称
 */
function mapKind(kind) {
  const kindMappings = [
    { "大纲": ["outline", "纲要", "目录生成", "章节规划"] },
    { "正文": ["plot", "文本生成", "故事发展", "剧情推进"] },
    { "选项": ["choice", "choose", "option", "分支选择", "用户决策"] },
    { "人物": ["character", "character_ai_draw", "角色设计", "人物设定", "NPC生成", "角色对话"] },
    { "背景": ["background", "background_ai_draw", "世界观", "场景描述", "环境设定", "地点生成"] },
    { "音乐": ["music", "music_prompt", "BGM推荐", "音效建议", "氛围音乐", "background_music"] },
    { "总结": ["summary", "要点归纳", "内容摘要"] },
  ];

  for (const mapping of kindMappings) {
    for (const [configKind, aliases] of Object.entries(mapping)) {
      if (aliases.map(a => a.toLowerCase()).includes(kind.toLowerCase())) {
        return configKind;
      }
    }
  }
  return kind;
}

/**
 * 从localStorage加载配置
 * @returns {Object} 配置对象
 */
function loadConfig() {
  try {
    const configData = localStorage.getItem('aiGalgameConfig');
    return configData ? JSON.parse(configData) : {};
  } catch (error) {
    console.error("加载配置错误:", error);
    return {};
  }
}

/**
 * 初始化模型列表
 * @param {number} id - 请求ID
 * @param {Array} kindConfig - 种类配置列表
 */
function initializeModels(id, kindConfig) {
  const models = [];
  const config = loadConfig();
  
  if (!config || !config.模型 || !config.模型.configs) {
    pendingDestruction.add(id);
    return;
  }
  
  for (const item of kindConfig) {
    const configName = item.config;
    const modelName = item.model;
    
    try {
      const configList = config.模型.configs;
      const modelList = configList[configName]?.models;
      
      if (!modelList) continue;
      
      const modelInfo = modelList.find(m => m.name === modelName);
      if (!modelInfo) continue;
      
      models.push({
        config: configName,
        model: modelName,
        weigh: parseInt(item.weigh),
        priority: parseInt(item.priority),
        max_retry: parseInt(modelInfo.max_retry || 3),
        temperature: modelInfo.temperature || "",
        top_p: modelInfo.top_p || "",
        penalty: modelInfo.frequency_penalty || "",
        max_tokens: modelInfo.max_tokens || ""
      });
    } catch (error) {
      console.error(`初始化模型错误 (${configName}/${modelName}):`, error);
      continue;
    }
  }
  
  // 处理空模型列表情况
  if (models.length === 0) {
    pendingDestruction.add(id);
    return;
  }
  
  gptModelList.set(id, models);
}

/**
 * 根据权重和优先级选择模型
 * @param {Array} currentModels - 当前可用模型列表
 * @returns {Object|null} 选择的模型或null
 */
function selectModel(currentModels) {
  if (!currentModels || currentModels.length === 0) {
    return null;
  }
  
  // 按优先级分组
  const priorityGroups = {};
  for (const model of currentModels) {
    const priority = model.priority;
    if (!priorityGroups[priority]) {
      priorityGroups[priority] = [];
    }
    priorityGroups[priority].push(model);
  }
  
  if (Object.keys(priorityGroups).length === 0) {
    return null;
  }
  
  // 选择最高优先级组
  const maxPriority = Math.max(...Object.keys(priorityGroups).map(Number));
  const candidates = priorityGroups[maxPriority];
  
  // 计算总权重
  const totalWeight = candidates.reduce((sum, m) => sum + m.weigh, 0);
  if (totalWeight <= 0) {
    return null;
  }
  
  // 按权重随机选择
  const weights = candidates.map(m => m.weigh);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < candidates.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return candidates[i];
    }
  }
  
  return candidates[0]; // 防止舍入误差
}

/**
 * 发送GPT请求
 * @param {string} system - 系统提示
 * @param {string} prompt - 用户提示
 * @param {string} kind - 请求类型
 * @param {number} id - 请求ID
 * @returns {Promise<string>} 响应结果
 */
async function gpt(system, prompt, kind, id) {
  // 处理待销毁状态
  if (pendingDestruction.has(id)) {
    pendingDestruction.delete(id);
    gptDestroy(id);
    return "over_times";
  }
  
  // 检查已销毁状态
  if (!gptModelList.has(id) && pendingDestruction.has(id)) {
    return "over_times";
  }
  
  // Kind映射处理
  const mappedKind = mapKind(kind);
  
  // 配置获取
  const config = loadConfig();
  if (!config || !config.模型) {
    console.error("配置丢失");
    return "over_times";
  }
  
  let kindConfig = null;
  for (const checkKind of [mappedKind, "默认"]) {
    const kindConfigKey = `${checkKind}_setting`;
    // Check if config exists AND is not empty (empty array, empty object)
    if (config.模型[kindConfigKey] && 
        !(Array.isArray(config.模型[kindConfigKey]) && config.模型[kindConfigKey].length === 0) && 
        !(typeof config.模型[kindConfigKey] === 'object' && 
          config.模型[kindConfigKey] !== null && 
          Object.keys(config.模型[kindConfigKey]).length === 0)) {
      kindConfig = config.模型[kindConfigKey];
      break;
    }
  }
  
  if (!kindConfig) {
    console.error("未在接入模型配置中配置模型");
    return "over_times";
  }
  
  // 初始化检测
  if (!gptModelList.has(id)) {
    initializeModels(id, kindConfig);
    if (pendingDestruction.has(id)) {
      return "over_times";
    }
  }
  
  const currentModels = gptModelList.get(id) || [];
  if (currentModels.length === 0) {
    pendingDestruction.add(id);
    return "over_times";
  }
  
  // 模型选择
  const selectedModel = selectModel(currentModels);
  if (!selectedModel) {
    pendingDestruction.add(id);
    return "over_times";
  }
  
  // API准备
  let baseurl, apikey;
  try {
    baseurl = config.模型.configs[selectedModel.config].model_baseurl;
    apikey = config.模型.configs[selectedModel.config].api_key;
  } catch (error) {
    console.error("API配置错误:", error);
    pendingDestruction.add(id);
    return "error";
  }
  if(!prompt){
    prompt="   ";
  }
  // 构建请求
  const data = {
    model: selectedModel.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ]
  };
  
  // 参数处理
  for (const param of ["temperature", "top_p", "penalty"]) {
    const paramValue = String(selectedModel[param]).trim();
    if (paramValue) {
      try {
        data[param] = parseFloat(paramValue);
      } catch (error) {
        console.warn(`参数转换错误 (${param}):`, error);
      }
    }
  }
  
  // 执行请求
  let result;
  try {
    const response = await fetch(`${baseurl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apikey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const responseData = await response.json();
    const content = responseData.choices[0].message.content;
    
    // 移除思考标签
    result = content.replace(/<think>[\s\S]*?<\/think>/g, '');
  } catch (error) {
    console.error("API请求错误:", error);
    result = "error";
  }
  
  // 更新模型状态
  selectedModel.max_retry -= 1;
  if (selectedModel.max_retry <= 0) {
    const updatedModels = currentModels.filter(m => m !== selectedModel);
    gptModelList.set(id, updatedModels);
  }
  
  // 检查是否需要销毁
  if ((gptModelList.get(id) || []).length === 0) {
    pendingDestruction.add(id);
  }
  
  return result;
}

/**
 * 销毁GPT请求实例
 * @param {number} id - 请求ID
 */
function gptDestroy(id) {
  pendingDestruction.delete(id);
  if (gptModelList.has(id)) {
    gptModelList.delete(id);
  }
}


/**
 * 发送多轮对话GPT请求 (直接指定模型，无选择/重试逻辑)
 * @param {string} configName - 配置名称 (e.g., "默认配置") from the main config.
 * @param {string} modelName - 模型名称 (e.g., "gpt-3.5-turbo") listed under the configName.
 * @param {string} systemprompt - 系统提示内容. Can be null or empty.
 * @param {Array<string>} dialogues - 对话列表. Must be non-empty, odd length, alternating user/assistant, ending with user.
 *                                   Example: ['Hi','Hello! How can I help?','Tell me a joke']
 * @returns {Promise<string>} The AI's response content, with <think> tags removed.
 * @throws {Error} If configuration is missing/invalid, input `dialogues` is malformed,
 *                 or an API request error occurs (network, auth, server-side, bad response).
 */
async function gptChat(configName, modelName, systemprompt, dialogues) {
  if (!Array.isArray(dialogues) || dialogues.length === 0) {
    throw new Error("Dialogues must be a non-empty array.");
  }
  if (dialogues.length % 2 === 0) {
    throw new Error("Dialogues list must have an odd number of items, ending with a user message.");
  }

  const messages = [];
  if (systemprompt && typeof systemprompt === 'string' && systemprompt.trim() !== "") {
    messages.push({ role: "system", content: systemprompt });
  }

  for (let i = 0; i < dialogues.length; i++) {
    if (i % 2 === 0) {
      messages.push({ role: "user", content: dialogues[i] });
    } else {
      messages.push({ role: "assistant", content: dialogues[i] });
    }
  }

  // Ensure the last message is from the user, which is implicitly handled by the odd length check.
  // And ensure at least one non-system message.
  if (messages.length === 0 || (messages.length === 1 && messages[0].role === "system")) {
      throw new Error("Dialogues must contain at least one user message.");
  }


  const config = loadConfig();
  if (!config || !config.模型 || !config.模型.configs) {
    throw new Error("AI configuration is missing or invalid (模型.configs).");
  }

  const targetConfigGroup = config.模型.configs[configName];
  if (!targetConfigGroup) {
    throw new Error(`Configuration group '${configName}' not found.`);
  }

  const baseurl = targetConfigGroup.model_baseurl;
  const apikey = targetConfigGroup.api_key;

  if (!baseurl || typeof baseurl !== 'string' || baseurl.trim() === "") {
    throw new Error(`API base URL (model_baseurl) is missing or invalid for config group '${configName}'.`);
  }
  if (!apikey || typeof apikey !== 'string' || apikey.trim() === "") {
    throw new Error(`API key (api_key) is missing or invalid for config group '${configName}'.`);
  }

  const modelList = targetConfigGroup.models;
  if (!modelList || !Array.isArray(modelList)) {
    throw new Error(`Model list (models) for config group '${configName}' is missing or not an array.`);
  }

  const modelInfo = modelList.find(m => m.name === modelName);
  if (!modelInfo) {
    throw new Error(`Model '${modelName}' not found in configuration group '${configName}'.`);
  }

  const requestData = {
    model: modelName,
    messages: messages,
  };

  // Optional parameters from modelInfo
  const paramsConfig = [
    { key: "temperature", type: "float" },
    { key: "top_p", type: "float" },
    { key: "frequency_penalty", type: "float" },
    { key: "presence_penalty", type: "float" }, // Added common param
    { key: "max_tokens", type: "integer" },
  ];

  for (const param of paramsConfig) {
    if (modelInfo[param.key] !== undefined && modelInfo[param.key] !== null) {
      const valueStr = String(modelInfo[param.key]).trim();
      if (valueStr !== "") {
        let parsedValue;
        if (param.type === "float") {
          parsedValue = parseFloat(valueStr);
        } else if (param.type === "integer") {
          parsedValue = parseInt(valueStr, 10);
        }

        if (isNaN(parsedValue)) {
          throw new Error(`Invalid ${param.key} value ('${modelInfo[param.key]}') in config for model '${modelName}'. Must be a valid ${param.type}.`);
        }
        requestData[param.key] = parsedValue;
      }
    }
  }
  
  try {
    const response = await fetch(`${baseurl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apikey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      let errorBody = null;
      try {
          errorBody = await response.text(); // Try to get more details from the body
      } catch (e) {
          // Ignore if can't read body
      }
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}. Body: ${errorBody || 'N/A'}`);
    }

    const responseData = await response.json();

    if (!responseData.choices || responseData.choices.length === 0 || !responseData.choices[0].message || !responseData.choices[0].message.content) {
      throw new Error("Invalid response structure from API.");
    }

    // As per existing gpt function, remove <think> tags.
    // Let's assume this is a desired general behavior.
    let content = responseData.choices[0].message.content;
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
    
    return content;

  } catch (error) {
    // If error is already an Error object, rethrow it. Otherwise, wrap it.
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`API request failed: ${String(error)}`);
    }
  }
}

export { gpt, gptDestroy,gptChat,loadConfig };