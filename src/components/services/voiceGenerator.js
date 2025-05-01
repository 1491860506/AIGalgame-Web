// voiceGenerator.js

import { readFile, writeFile, listDirectory, getMetadata, createFolder } from './IndexedDBFileSystem.js';
import proxyfetch from './proxyfetch.js'; // Ensure this is imported

// --- Configuration Keys ---
const LS_KEY = 'aiGalgameConfig';
const SOVITS_KEY = 'SOVITS';
const CONFIG_DEFINITIONS_KEY = 'config';
const SELECTED_MODEL_KEY = 'model_choose';

// --- Helper Functions ---

/**
 * Loads the entire configuration object from localStorage.
 * @returns {object | null} The full config object or null if not found/error.
 */
function loadFullConfig() {
    try {
      const configStr = localStorage.getItem(LS_KEY);
      if (!configStr) {
        console.error("Configuration not found in localStorage.");
        return null;
      }
      return JSON.parse(configStr);
    } catch (error) {
      console.error("Failed to load or parse configuration:", error);
      return null;
    }
}

/**
 * Saves the entire configuration object to localStorage.
 * @param {object} config - The full config object to save.
 */
function saveFullConfig(config) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(config));
        // console.log("Config saved to localStorage."); // Maybe too verbose
    } catch (e) {
        console.error("Failed to save config to localStorage:", e);
    }
}


/**
 * Deeply unquotes variables like "{{variable}}" back to {{variable}}
 * This is needed because definitions are stored with quoted variables.
 * It recursively traverses objects and arrays.
 * It specifically looks for string values that are EXACTLY "{{variable}}" after JSON.parse
 * and unquotes them.
 * @param {*} data - The data (object, array, string) to unquote.
 * @returns {*} - The data with variables unquoted.
 */
function unquoteVariablesDeep(data) {
    if (typeof data === 'string') {
         // Check if the string is EXACTLY a quoted variable like '"{{var}}"'
         // This regex matches the escaped quotes and the variable placeholder inside
         // Note: JSON.parse would turn '"{{var}}"' into '"{{var}}"', so we need to match the string value that starts and ends with quotes.
         // A simpler approach that works with JSON.parse behavior: If the string value contains {{...}} and is meant to be a variable,
         // it's usually stored as a string like "{{variable}}" in the JSON.
         // The goal here is to remove those surrounding quotes so it's just {{variable}} for logic/editing.
         // Let's refine the regex based on how `quoteVariables` works. If `quoteVariables` wraps "{{var}}" in quotes resulting in "\"{{var}}\"",
         // then JSON.parse reads it as the string '"{{var}}"' inside JS.
         // So, we look for strings that start and end with literal quotes AND contain {{...}} inside.
         const match = data.match(/^"({{\s*\w+\s*}})"$/);
         if (match) {
             return match[1]; // Return the variable placeholder {{var}} without the surrounding quotes
         }
        return data; // Return original string if not a quoted variable placeholder
    } else if (Array.isArray(data)) {
        return data.map(item => unquoteVariablesDeep(item));
    } else if (data !== null && typeof data === 'object') {
        const newObj = {};
        for (const key in data) {
            if (Object.hasOwnProperty.call(data, key)) {
                newObj[key] = unquoteVariablesDeep(data[key]);
            }
        }
        return newObj;
    }
    return data;
}


/**
 * Recursively substitutes variables like {{variable}} in a template structure (string, array, object).
 * @param {*} template - The template structure containing variables.
 * @param {object} variablesMap - A map of variable names to their values.
 * @returns {*} - The structure with variables substituted.
 */
function substituteVariables(template, variablesMap) {
    if (typeof template === 'string') {
        return template.replace(/{{\s*(\w+)\s*}}/g, (match, variableName) => {
            // Return the value if found and not null/undefined, otherwise return the original match (e.g., "{{unknown_var}}")
            // Use String() to ensure substitution is a string, as it's going into a string template
            // Check if variableName exists in the map AND the value is not undefined or null
            const value = variablesMap[variableName];
            return (value !== undefined && value !== null)
                   ? String(value)
                   : match; // Return original placeholder if variable not found or value is null/undefined
        });
    } else if (Array.isArray(template)) {
        return template.map(item => substituteVariables(item, variablesMap));
    } else if (template !== null && typeof template === 'object') {
        const newObj = {};
        for (const key in template) {
            if (Object.hasOwnProperty.call(template, key)) {
                // Substitute variables in values.
                newObj[key] = substituteVariables(template[key], variablesMap);
            }
        }
        return newObj;
    }
    return template;
}

/**
 * Makes an API request using fetch or proxyfetch.
 * Handles URL parameters for GET and JSON body for POST.
 * @param {string} url - The target URL.
 * @param {string} method - HTTP method ('GET' or 'POST'). Case-insensitive input is handled.
 * @param {Array<object>} [getParams=[]] - Array of GET parameters [{key: value}].
 * @param {*} [postBody] - The request body for POST requests (can be any JSON-serializable type).
 * @param {boolean} useLocalProxy - Whether to use the local proxy.
 * @returns {Promise<Response>} The Response object on success. Throws an error on failure.
 */
async function makeApiRequest(url, method, getParams = [], postBody, useLocalProxy) {
    const fetchMethod = useLocalProxy ? proxyfetch : fetch;
    const fetchMethodName = useLocalProxy ? 'proxyfetch' : 'fetch';
    const requestMethod = method.toUpperCase(); // Ensure method is uppercase

    console.log(`Using fetch method: ${fetchMethodName} for ${requestMethod} request`);
    console.log(`Target URL: ${url}`);

    let finalUrl = url;
    const fetchOptions = {
        method: requestMethod,
        headers: {},
    };

    // Append GET parameters to URL
    if (requestMethod === 'GET' && Array.isArray(getParams) && getParams.length > 0) {
        const urlParams = new URLSearchParams();
        getParams.forEach(paramObj => {
            const key = Object.keys(paramObj)[0];
            const value = paramObj[key];
            // Ensure value is treated as string for URLSearchParams
            // Handle cases where substitution might have resulted in non-primitive unexpectedly
            if (value !== undefined && value !== null) { // Append if value is not null or undefined
                 // Check if value is a primitive or has a sensible toString
                 if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                      urlParams.append(key, String(value));
                 } else {
                      console.warn(`Skipping non-primitive GET parameter "${key}" with value:`, value);
                 }
            } else {
                 console.warn(`Skipping null/undefined GET parameter "${key}".`);
            }
        });
         const queryString = urlParams.toString();
         if (queryString) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
         }
        console.log(`Constructed GET URL: ${finalUrl}`);
    } else if (requestMethod === 'GET' && getParams && Object.keys(getParams).length > 0 && typeof getParams === 'object' && !Array.isArray(getParams)) {
         // Handle case where getParams might be an object { key: value } instead of [{key:value}]
         console.warn("GET params might be an object {key: value}, expecting array of objects [{key:value}]:", getParams);
         const urlParams = new URLSearchParams();
          for(const key in getParams) {
               if (Object.hasOwnProperty.call(getParams, key)) {
                   const value = getParams[key];
                    if (value !== undefined && value !== null) { // Append if value is not null or undefined
                         if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                              urlParams.append(key, String(value));
                        } else {
                             console.warn(`Skipping non-primitive GET parameter "${key}" with value:`, value);
                        }
                    } else {
                        console.warn(`Skipping null/undefined GET parameter "${key}".`);
                    }
               }
          }
           const queryString = urlParams.toString();
         if (queryString) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
         }
           console.log(`Constructed GET URL (from object): ${finalUrl}`);
    }


    // Prepare POST body
    if (requestMethod === 'POST') {
        if (postBody !== undefined && postBody !== null) {
            try {
                 // Attempt to stringify the body. It could be any JSON-serializable structure
                 // resulting from substitution.
                 fetchOptions.body = JSON.stringify(postBody);
                 fetchOptions.headers['Content-Type'] = 'application/json'; // Assume JSON body for POST
                 console.log(`Constructed POST Body: ${fetchOptions.body}`);
            } catch (e) {
                 console.error("Error JSON stringifying POST body:", e);
                 throw new Error(`构建请求体失败: ${e.message}`);
            }
        } else {
             console.log("POST request specified but body is null/undefined. Sending no body.");
             // fetchOptions.body remains undefined, which is valid for fetch for no body.
             // Do not set Content-Type for empty body unless specifically required by API.
             delete fetchOptions.body; // Ensure body is explicitly not set
        }
    }

    try {
        console.log(`Executing API call to ${finalUrl}`);
        const response = await fetchMethod(finalUrl, fetchOptions);

        if (!response.ok) {
            let errorText = '';
            try {
                // Try reading text for detailed error
                errorText = await response.text();
                 // Truncate long error text for log/status
                if (errorText.length > 200) errorText = errorText.substring(0, 200) + '...';
            } catch (e) {
                 errorText = '(无法读取响应体)';
            }
            const statusError = `API 响应错误: ${response.status} ${response.statusText}`;
            console.error(`${statusError} - ${errorText}`);
            throw new Error(`${statusError} - ${errorText}`);
        }

        console.log(`API call successful: ${response.status}`);
        return response; // Return the full response object

    } catch (e) {
        console.error(`请求失败: ${e.message}`, e);
        // Re-throw the caught error
        throw e;
    }
}


/**
 * Saves a Blob object to IndexedDB file system.
 * @param {Blob} blob - The Blob to save.
 * @param {string} filePath - The target path in IndexedDB.
 * @returns {Promise<void>} Resolves on success, rejects on failure.
 */
async function saveBlobToFile(blob, filePath) {
    console.log(`Attempting to save blob to IndexedDB: ${filePath}`);
    try {
        await writeFile(filePath, blob);
        console.log(`Blob saved successfully: ${filePath}`);
    } catch (e) {
        console.error(`Error saving blob to file ${filePath}:`, e);
        throw new Error(`保存文件失败: ${e.message}`);
    }
}


// --- Voice Generation Core Logic for a Single Conversation's *Main* Request ---

/**
 * Processes the main audio request for a single conversation using a pre-built variables map.
 * This function does NOT handle the beforeurl logic or judge_repeat_before.
 * It constructs the variables map specific to the conversation, substitutes
 * variables in the *main* config parameters, makes the API call, and saves the audio.
 * @param {number} nameId - Character index + 1 (used to determine dataKey lookup).
 * @param {string} final_text - The processed text to synthesize.
 * @param {object} conversation - The current conversation object (includes emotion, storytext), used to derive dataKey and gptreturn.
 * @param {string} lang - Language code ('zh', 'en', 'ja'), used for language variable.
 * @param {string} outputName - The name for the output file (without extension).
 * @param {object} selectedConfigDefinition - The *unquoted* JSON definition for the selected config.
 * @param {object} configData - The user-entered data for the selected config (e.g., { "1_happy": { "filepath": "..." } }).
 * @param {string} audioDirectoryPath - The IndexedDB path to the audio directory.
 * @param {Function} updateStatus - Callback to update status specific to this main request.
 * @returns {Promise<string>} "ok" on success, "error" on failure.
 */
async function processConversationAudioRequest(nameId, final_text, conversation, lang, outputName, selectedConfigDefinition, configData, audioDirectoryPath, updateStatus) {
    updateStatus(`  - 生成音频 ${outputName}.wav ...`);

    // 1. Prepare Variables Map for Substitution
    // Note: This map should ideally be built *outside* this function in generateVoice
    // and passed in, to ensure the *same* map is used for judge_repeat_before checks,
    // before_requests substitution, and main request substitution.
    // For now, replicate the logic here for clarity based on the original function's role,
    // but acknowledge this map derivation is duplicated with generateVoice.

    const variablesMap = {};
    variablesMap['text'] = final_text; // Cleaned text for {{text}}
    variablesMap['language'] = lang;

    // The {{gptreturn}} variable gets the raw emotion from the conversation
    const conversationEmotion = conversation?.["emotion"];
    variablesMap['gptreturn'] = conversationEmotion || '';
    console.log(`Conversation Emotion (for {{gptreturn}} in main request): "${variablesMap['gptreturn']}"`);

    // Determine the actual emotion used for the dataKey lookup based on emotion_list and emotion_feedback
    const hasEmotionsConfigured = Array.isArray(selectedConfigDefinition?.emotion_list) && selectedConfigDefinition.emotion_list.length > 0;
    let emotionUsedForKey = ''; // Default to empty string (for key like '1')

    if (hasEmotionsConfigured) {
        const emotionList = selectedConfigDefinition.emotion_list || [];
        let effectiveEmotion = conversationEmotion || ''; // Start with conversation emotion

        // If conversation emotion is empty OR not found in the list
        if (effectiveEmotion === '' || !emotionList.includes(effectiveEmotion)) {
            console.log(`Conversation emotion "${conversationEmotion || 'empty'}" not found in configured emotion_list. Trying emotion_feedback.`);
            // If not found/empty, try using emotion_feedback
            const feedbackEmotion = selectedConfigDefinition?.emotion_feedback;

            // Check if feedbackEmotion exists, is a non-empty string, AND is in the configured list
             if (typeof feedbackEmotion === 'string' && feedbackEmotion !== '' && emotionList.includes(feedbackEmotion)) {
                 console.log(`Using valid emotion_feedback "${feedbackEmotion}" as fallback for data key.`);
                 effectiveEmotion = feedbackEmotion; // Use feedback as the emotion for the key
             } else {
                  console.warn(`Invalid or empty emotion_feedback "${feedbackEmotion}" or feedback emotion not in configured emotion_list. Falling back to index-only key if conversation emotion was invalid.`);
                  // effectiveEmotion remains the empty string it was initialized with from `conversationEmotion || ''`.
             }
        } else {
             console.log(`Using conversation emotion "${effectiveEmotion}" for data key lookup.`);
            // effectiveEmotion is already the valid conversation emotion
        }
         // Assign the determined effectiveEmotion to emotionUsedForKey
         emotionUsedForKey = effectiveEmotion;
    } else {
        // If no emotion_list is defined, emotions are not configured for keys.
        // emotionUsedForKey remains '' (default).
        console.log("emotion_list is not configured. Using index-only data key for main request.");
    }
    // Construct the dataKey (e.g., "1" or "1_happy")
    // Only append emotion if hasEmotionsConfigured is true AND a non-empty emotionUsedForKey was determined.
    const dataKey = hasEmotionsConfigured && emotionUsedForKey ? `${nameId}_${emotionUsedForKey}` : `${nameId}`;
    const rowData = configData?.[dataKey] || {}; // Get the data for this specific row/emotion key

    console.log(`Looking up config data for main request using key: "${dataKey}"`);
    // console.log("Data found for dataKey:", rowData); // Avoid excessive logging

    // Add values from required_item in configData to the variables map
    (selectedConfigDefinition?.required_item || []).forEach(item => {
        const itemKey = Object.keys(item)[0]; // e.g., 'fileselect', 'modelname'
        // Get value from the corresponding rowData based on dataKey
        // Prefer saved data from rowData if it exists and is not empty/null.
        // Otherwise, use the default value from the definition if it's a primitive type.
         const valueFromData = rowData[itemKey]; // Value from user config data
         const itemDefault = item[itemKey]; // Default value from definition { "key": "Default Value" }

         if (valueFromData !== undefined && valueFromData !== null && valueFromData !== '') {
             variablesMap[itemKey] = valueFromData; // Use saved data if it exists and is not empty
         } else if (typeof itemDefault === 'string' || typeof itemDefault === 'number' || typeof itemDefault === 'boolean') {
             variablesMap[itemKey] = itemDefault; // Use default from definition if saved data is empty
         } else {
              // Default to empty string if no saved data and no primitive default
              variablesMap[itemKey] = '';
         }
    });

    console.log("Final variables for main audio request substitution:", variablesMap);

    // 2. Substitute Variables in Main Config Parameters
    const mainUrlDetails = {
        url: selectedConfigDefinition?.url || '',
        requestmethod: (selectedConfigDefinition?.requestmethod || 'GET').toUpperCase(),
        getparams: selectedConfigDefinition?.getparams || [],
        body: selectedConfigDefinition?.body,
    };

    const substitutedMainUrlDetails = substituteVariables(mainUrlDetails, variablesMap);

    // 3. Determine Fetch Method
    const useLocalProxy = configData?.useLocalProxy === true;

    // 4. Make the Main API Call
    try {
        console.log(`Making main request to: ${substitutedMainUrlDetails.url}`);
        const response = await makeApiRequest(
            substitutedMainUrlDetails.url,
            substitutedMainUrlDetails.requestmethod,
            substitutedMainUrlDetails.getparams,
            substitutedMainUrlDetails.body,
            useLocalProxy
            // makeApiRequest handles its own internal logging
        );

        // 5. Read Audio Blob and Save
        const audioBlob = await response.blob();

        // Basic check for binary data
        if (audioBlob.size === 0) {
             const errorMsg = `API返回的音频 Blob 为空 for ${outputName}.wav.`;
             console.warn(errorMsg);
             throw new Error(errorMsg + " 请检查API响应或配置。");
        }
        if (!audioBlob.type.startsWith('audio/') && audioBlob.type !== '' && audioBlob.type !== 'application/json') { // Allow empty type, or application/json if API indicates error via JSON
             console.warn(`警告: API返回 Blob 类型 "${audioBlob.type}" for ${outputName}.wav，可能不是音频.`);
             // Consider if 'application/json' response should be treated as an error here if expecting audio
        }

        // Save the Blob to IndexedDB
        const outputPath = `${audioDirectoryPath}/${outputName}.wav`;
        await saveBlobToFile(audioBlob, outputPath);
        updateStatus(`  - 音频 ${outputName}.wav 保存成功`);

        return "ok";

    } catch (e) {
        console.error(`Error during main API call or file saving for ${outputName}:`, e);
        // The specific error message from makeApiRequest or saveBlobToFile is in e.message
        updateStatus(`  - 音频 ${outputName}.wav 生成失败: ${e.message}`);
        return "error"; // Indicate failure
    }
}


// --- Main Generation Process ---

/**
 * Generates voice audio files for a given story ID using the selected configuration.
 * This function orchestrates the process, including before_requests calls and judge_repeat_before logic.
 * @param {string|number} storyId - The ID of the story segment.
 * @param {Function} updateStatus - Callback function to update the status message.
 * @returns {Promise<string>} "ok" on success, an error message string on failure.
 */
async function generateVoice(storyId, updateStatus = console.log) {
    updateStatus(`开始生成故事 ${storyId} 的语音...`);
    const fullConfig = loadFullConfig();

    if (!fullConfig) {
        const errorMsg = "生成语音失败：无法加载主配置。";
        updateStatus(errorMsg);
        return errorMsg;
    }

    // --- Get Selected Configuration ---
    const sovitsRoot = fullConfig[SOVITS_KEY];
    if (!sovitsRoot) {
        const errorMsg = `生成语音失败：配置中缺少 '${SOVITS_KEY}' 部分。`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    const selectedConfigName = sovitsRoot[SELECTED_MODEL_KEY];
    if (!selectedConfigName) {
        const errorMsg = `生成语音失败：未在配置中找到选定的模型 ('${SELECTED_MODEL_KEY}')。请在配置页面选择一个配置。`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    const configDefinitions = sovitsRoot[CONFIG_DEFINITIONS_KEY];
    if (!configDefinitions || !configDefinitions[selectedConfigName]) {
        const errorMsg = `生成语音失败：找不到名为 "${selectedConfigName}" 的配置定义。`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    // Unquote variables in the selected definition for use
    let selectedConfigDefinition;
    try {
        selectedConfigDefinition = unquoteVariablesDeep(configDefinitions[selectedConfigName]);
        console.log("Using configuration definition:", selectedConfigName, selectedConfigDefinition);
    } catch(e) {
        const errorMsg = `生成语音失败：解析或处理配置 "${selectedConfigName}" 定义时出错: ${e.message}`;
        updateStatus(errorMsg);
        console.error(errorMsg, configDefinitions[selectedConfigName]); // Log the raw definition
        return errorMsg;
    }

    // Get the corresponding user data for the selected config
    // Ensure we get a fresh object copy
    const configData = JSON.parse(JSON.stringify(sovitsRoot[selectedConfigName] || {}));
    if (Object.keys(configData).length === 0) {
         console.warn(`警告：配置 "${selectedConfigName}" 的用户数据未找到或为空。某些变量可能无法替换。`);
    }
     // -----------------------------------

    const storyTitle = fullConfig.剧情?.story_title;
    if (!storyTitle) {
         const errorMsg = "生成语音失败：配置中 '剧情.story_title' 未设置。";
         updateStatus(errorMsg);
         return errorMsg;
    }

    // --- Language Determination ---
    let lang = "zh"; // Default
    const themeLanguage = fullConfig.剧情?.['language'];
    if (themeLanguage === "英文") {
        lang = "en";
    } else if (themeLanguage === "日文") {
        lang = "ja";
    }
    console.log(`Using language for API calls and {{language}} variable: ${lang}`);
    // ------------------------------

    const baseDataDir = `/data/${storyTitle}`;
    // Use storyId as the folder name for audio files for this story segment
    const audioDirectoryPath = `${baseDataDir}/audio/${storyId}`;
    const storyFilePath = `${baseDataDir}/story/${storyId}.json`;
    const characterFilePath = `${baseDataDir}/character.json`;

    // Ensure audio directory exists
    updateStatus(`确保音频目录存在: ${audioDirectoryPath}`);
    try {
        await createFolder(audioDirectoryPath);
         console.log(`Audio directory ensured: ${audioDirectoryPath}`);
    } catch (e) {
        // Ignore if folder already exists, log other errors
        if (!e.message.includes('文件夹已存在') && !e.message.includes('Key already exists')) {
             console.warn(`无法创建音频目录 ${audioDirectoryPath} (可能已存在):`, e);
        }
    }

    // Read story and character data
    let storyData;
    let characterData;

    updateStatus(`读取故事文件: ${storyFilePath}`);
    try {
        storyData = await readFile(storyFilePath);
         console.log(`Story file read: ${storyFilePath}`);
    } catch (e) {
        const errorMsg = `读取故事文件失败: ${storyFilePath}. 错误: ${e.message}`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    updateStatus(`读取角色文件: ${characterFilePath}`);
    try {
        characterData = await readFile(characterFilePath);
        console.log(`Character file read: ${characterFilePath}`);
    } catch (e) {
        const errorMsg = `读取角色文件失败: ${characterFilePath}. 错误: ${e.message}`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    if (!storyData || !Array.isArray(storyData.conversations)) {
        const errorMsg = `故事数据无效或缺少 'conversations' 列表在 ${storyFilePath}`;
        updateStatus(errorMsg);
        return errorMsg;
    }
    if (!characterData || !Array.isArray(characterData)) {
        const errorMsg = `角色数据无效或不是数组在 ${characterFilePath}`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    const conversationsToProcess = storyData.conversations;

    if (conversationsToProcess.length === 0) {
         const message = `故事 ${storyId} 中没有找到对话需要生成音频。`;
         updateStatus(message);
         console.log(message);
         return "ok";
    }

    // --- Before Requests Setup ---
    // before_requests is an array of request definitions
    const beforeRequestsDefinitions = selectedConfigDefinition?.before_requests; // Can be null, undefined, or []

    let judgeRepeatVariableName = null;
    const judgeRepeatBeforeConfig = selectedConfigDefinition?.judge_repeat_before;

    if (judgeRepeatBeforeConfig && typeof judgeRepeatBeforeConfig === 'string' && judgeRepeatBeforeConfig.trim() !== '') {
         // Expects format "{{variableName}}"
         const variableMatch = judgeRepeatBeforeConfig.match(/^\{\{\s*(\w+)\s*\}\}$/);
         if (variableMatch) {
             judgeRepeatVariableName = variableMatch[1];
             console.log(`judge_repeat_before variable identified: {{${judgeRepeatVariableName}}}`);
         } else {
             console.warn(`Invalid judge_repeat_before format: "${judgeRepeatBeforeConfig}". It will be ignored and before_requests will always run (if defined).`);
         }
    } else {
        console.log("judge_repeat_before is not configured or empty. Before requests will run every time if before_requests array is defined and not empty.");
    }

    // State for judge_repeat_before logic
    // Use a unique symbol or object to ensure the first evaluated value is always considered 'different' from the initial state.
    let lastJudgeRepeatValue = Symbol('initial_judge_repeat_value');
    const useLocalProxy = configData?.useLocalProxy === true;
    // --- End Before Requests Setup ---


    updateStatus(`开始处理 ${conversationsToProcess.length} 个对话 (使用配置: ${selectedConfigName})...`);

    let processedCount = 0; // Count successfully processed audios (main requests)
    let skippedCount = 0; // Count skipped audios (already exist)
    let errorCount = 0; // Count main request errors

    for (let i = 0; i < conversationsToProcess.length; i++) {
        const conversation = conversationsToProcess[i];
        const characterName = conversation["character"];
        const storyText = conversation["text"]; // Use this for cleaning
        const conversationId = conversation["id"];

        updateStatus(`处理 ID ${conversationId} (${i + 1}/${conversationsToProcess.length}) 角色: ${characterName || '旁白/无'}`);

        // --- Check if audio exists ---
        const outputPath = `${audioDirectoryPath}/${conversationId}.wav`;
        const metadata = await getMetadata(outputPath).catch(() => ({ exists: false }));
        if (metadata.exists) {
            console.log(`ID ${conversationId}: 音频文件已存在，跳过生成。`);
            updateStatus(`  - 跳过 ID ${conversationId}: 文件已存在`);
            skippedCount++;
            continue; // Skip to next conversation
        }
        // ---------------------------

        if (!characterName) {
            console.log(`ID ${conversationId}: 角色名为空，跳过。`);
            updateStatus(`  - 跳过 ID ${conversationId}: 角色名为空`);
            skippedCount++;
            continue;
        }

        // --- Text Processing ---
        // Remove content within parentheses/brackets and replace spaces/newlines
        // More brackets: (), （）, [], 【】, {}, 『』, <>
        const textReplaced = (storyText || '').replace(/[\(（].*?[\)）]/g, '').replace(/ /g, "，").replace(/\n/g, "。"); // Remove various brackets and content inside
         // Trim leading/trailing commas and periods (handles cases where text starts/ends with brackets/newlines)
         let final_text = textReplaced.replace(/^[,。]+|[,。]+$/g, ''); // Trim leading/trailing
         // Ensure minimum text length or presence after processing
         if (!final_text.trim()) {
            console.log(`ID ${conversationId}: 文本处理后为空，跳过。`);
            updateStatus(`  - 跳过 ID ${conversationId}: 文本为空`);
            skippedCount++;
            continue;
        }
        // -----------------------

        // --- Find Character ID (for dataKey) ---
        let placeId = -1;
        const character = characterData.find(char => char.name === characterName);
        if (character) {
            placeId = characterData.indexOf(character) + 1; // JSON indices start from 1
        } else {
            placeId=7;
        }
        // -----------------------

        // --- Prepare Variables Map for This Conversation ---
        // This map is needed for both before_requests and main url substitutions for this specific conversation
        const conversationVariablesMap = {};
        conversationVariablesMap['text'] = final_text; // Cleaned text for {{text}}
        conversationVariablesMap['language'] = lang; // Language variable
        // The {{gptreturn}} variable gets the raw emotion from the conversation
        conversationVariablesMap['gptreturn'] = conversation?.["emotion"] || ''; // Use the emotion from the story data

        // Add values from required_item in configData based on character ID (placeId) and emotion
        const hasEmotionsConfigured = Array.isArray(selectedConfigDefinition?.emotion_list) && selectedConfigDefinition.emotion_list.length > 0;
        let emotionUsedForKey = '';
        if (hasEmotionsConfigured) {
             const emotionList = selectedConfigDefinition.emotion_list || [];
             let effectiveEmotion = conversationVariablesMap['gptreturn']; // Start with gptreturn value

             if (effectiveEmotion === '' || !emotionList.includes(effectiveEmotion)) {
                 const feedbackEmotion = selectedConfigDefinition?.emotion_feedback;
                 if (typeof feedbackEmotion === 'string' && feedbackEmotion !== '' && emotionList.includes(feedbackEmotion)) {
                     effectiveEmotion = feedbackEmotion;
                 }
             }
             emotionUsedForKey = effectiveEmotion;
        }
        // Construct the dataKey (e.g., "1" or "1_happy") for looking up user data
        // Remember user data index is 1-based, emotions are optional part of the key
        const dataKey = hasEmotionsConfigured && emotionUsedForKey ? `${placeId}_${emotionUsedForKey}` : `${placeId}`;
        const rowData = configData?.[dataKey] || {};

        (selectedConfigDefinition?.required_item || []).forEach(item => {
            const itemKey = Object.keys(item)[0];
             const valueFromData = rowData[itemKey];
             const itemDefault = item[itemKey];
             // Prioritize user data value, then default from definition (if primitive), then empty string
             if (valueFromData !== undefined && valueFromData !== null && valueFromData !== '') {
                 conversationVariablesMap[itemKey] = valueFromData;
             } else if (typeof itemDefault === 'string' || typeof itemDefault === 'number' || typeof itemDefault === 'boolean') {
                 conversationVariablesMap[itemKey] = itemDefault;
             } else {
                  conversationVariablesMap[itemKey] = ''; // Default to empty string for variables if no user data or primitive default
             }
        });
        // --- End Variables Map Preparation ---


        // --- Handle Before Requests Array ---
        if (Array.isArray(beforeRequestsDefinitions) && beforeRequestsDefinitions.length > 0) {
             let currentJudgeRepeatValue = null;
             let needsBeforeRequestsCall = true; // Default to true if no judge_repeat_before or variable value

             if (judgeRepeatVariableName) {
                 // Get the current value of the judge_repeat_before variable for this conversation
                 // Note: variablesMap is built using data from index `placeId` and emotion `emotionUsedForKey`
                 currentJudgeRepeatValue = conversationVariablesMap[judgeRepeatVariableName]; // Could be undefined if variable key doesn't exist in map
                 console.log(`Judge repeat variable {{${judgeRepeatVariableName}}} value for ID ${conversationId}: "${currentJudgeRepeatValue}"`);
                 console.log(`Last judge repeat value: "${lastJudgeRepeatValue}"`);

                 // Determine if the call is needed: needed if current value is DIFFERENT from the last successful value.
                 // The initial state (Symbol) ensures the first call is always needed if judgeRepeatVariableName is set.
                 // Compare using strict inequality (===) to handle null, undefined, "", 0, false distinctly if they are valid variable values.
                 needsBeforeRequestsCall = currentJudgeRepeatValue !== lastJudgeRepeatValue;
             } else {
                 // If judge_repeat_before is not configured or invalid format, always call before_requests if array is defined and not empty
                 needsBeforeRequestsCall = true;
             }

            if (needsBeforeRequestsCall) {
                updateStatus(`  - 正在进行前置请求 (ID ${conversationId}, 共 ${beforeRequestsDefinitions.length} 个)...`);
                 try {
                     // Execute each request in the before_requests array sequentially
                     for (let j = 0; j < beforeRequestsDefinitions.length; j++) {
                         const beforeReqDef = beforeRequestsDefinitions[j];
                          if (!beforeReqDef || typeof beforeReqDef !== 'object' || !beforeReqDef.url) {
                             console.warn(`Skipping invalid before_request definition at index ${j} for ID ${conversationId}:`, beforeReqDef);
                             updateStatus(`  - 跳过无效前置请求 ${j+1} (ID ${conversationId})`);
                             continue; // Skip invalid entries in the array
                         }

                         const beforeReqDetails = {
                             url: beforeReqDef.url,
                             requestmethod: beforeReqDef.requestmethod || 'GET', // Default to GET if not specified
                             getparams: beforeReqDef.getparams || [], // Default to empty array
                             body: beforeReqDef.body, // Can be undefined, null, or any value
                         };

                         // Substitute variables in before request details using the *current conversation's* variables map
                         const substitutedBeforeReqDetails = substituteVariables(beforeReqDetails, conversationVariablesMap);
                         console.log(`Substituted Before Request ${j + 1} details for ID ${conversationId}:`, substitutedBeforeReqDetails);

                         // Make the before request call
                         updateStatus(`  - 执行前置请求 ${j+1}/${beforeRequestsDefinitions.length}: ${substitutedBeforeReqDetails.url}`);
                         await makeApiRequest(
                             substitutedBeforeReqDetails.url,
                             substitutedBeforeReqDetails.requestmethod, // Use the determined method (default GET)
                             substitutedBeforeReqDetails.getparams,
                             substitutedBeforeReqDetails.body,
                             useLocalProxy
                             // makeApiRequest logs errors internally, which will be caught here
                         );
                         console.log(`Before Request ${j + 1} successful for ID ${conversationId}.`);
                         updateStatus(`  - 前置请求 ${j+1} 成功 (ID ${conversationId}).`);

                     } // End loop through before_requests array

                     updateStatus(`  - 所有前置请求成功 (ID ${conversationId}).`);
                     console.log(`All before requests successful for ID ${conversationId}.`);

                     // Update the last successful judge repeat value IF the calls were made based on the variable
                     if (judgeRepeatVariableName) {
                          lastJudgeRepeatValue = currentJudgeRepeatValue;
                          console.log(`Updated last judge repeat value to: "${lastJudgeRepeatValue}"`);
                     }

                 } catch (beforeError) {
                     console.error(`前置请求失败 (ID ${conversationId}):`, beforeError);
                     const errorMsg = `生成语音失败: ID ${conversationId} 前置请求失败: ${beforeError.message}`;
                     updateStatus(errorMsg);
                     errorCount++; // Count the error (although we are stopping the process)
                     // If any before request fails, stop the entire generation process for this story ID.
                     return errorMsg; // Stop the whole process and return the error message
                 }
            } else {
                updateStatus(`  - 跳过前置请求 (ID ${conversationId}): judge_repeat_before 值未改变.`);
                 console.log(`Skipping before requests for ID ${conversationId} as judge_repeat_before value is unchanged.`);
            }
        } else {
             console.log(`No before_requests configured or array is empty for config "${selectedConfigName}". Skipping before requests logic.`);
        }
        // --- End Handle Before Requests ---


        // --- Generate Main Audio (call processConversationAudioRequest) ---
        // If we reached here, either before_requests ran successfully or was skipped/not configured.
        // Now, proceed with the main audio generation for the current conversation.
        const result = await processConversationAudioRequest(
            placeId, // Use character ID + 1 for dataKey lookups inside
            final_text,
            conversation, // Pass the full conversation object (includes 'emotion')
            lang,
            String(conversationId), // Ensure output name is string ID
            selectedConfigDefinition, // Pass the *unquoted* definition
            configData, // Pass the user data object for this config
            audioDirectoryPath,
            updateStatus // Pass updateStatus callback
        );
        // --------------------

        if (result === "ok") {
            processedCount++;
        } else {
            // Error already logged by processConversationAudioRequest
            // updateStatus already called by processConversationAudioRequest
            errorCount++; // Count the generation error
            // Continue loop for the next conversation
        }
    } // End conversation loop

    const finalMessage = `完成故事 ${storyId} 的语音生成。成功 ${processedCount} 个，跳过 ${skippedCount} 个，失败 ${errorCount} 个。`;
    updateStatus(finalMessage);
    console.log(finalMessage);

    // Return "ok" if there were no *generation* errors, otherwise return a summary error message.
    // Note: Before request failures cause the function to return early.
    return errorCount === 0 ? "ok" : `完成但有 ${errorCount} 个对话生成失败。`;
}

// Export the main function and helpers needed by UI or other modules
export {
    generateVoice,
    loadFullConfig as loadConfig, // Rename export for consistency if UI uses loadConfig
    saveFullConfig as saveConfig, // Rename export for consistency if UI uses saveConfig
    makeApiRequest, // Export for testing in Vue component
    substituteVariables, // Export for testing/validation in Vue component
    unquoteVariablesDeep, // Export for loading/editing in Vue component
    processConversationAudioRequest, // Exporting this for the test function in VoiceConfig.vue
    // saveBlobToFile // Internal helper, typically not exported
};