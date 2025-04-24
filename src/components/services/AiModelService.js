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

export { gpt, gptDestroy };