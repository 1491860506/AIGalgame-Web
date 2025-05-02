// voiceGenerator.js

import { readFile, writeFile, listDirectory, getMetadata, createFolder } from './IndexedDBFileSystem.js';
import proxyfetch from './proxyfetch.js'; // Ensure this is imported
import pLimit from 'p-limit'; // Import the concurrency limiter utility

// --- Configuration Keys ---
const LS_KEY = 'aiGalgameConfig';
const SOVITS_KEY = 'SOVITS';
const CONFIG_DEFINITIONS_KEY = 'config';
const SELECTED_MODEL_KEY = 'model_choose';

// --- Module-scoped Global State for judge_repeat_before ---
// This variable holds the value of the 'judge_repeat_before' variable from the
// last conversation for which the 'before_requests' were successfully executed
// for the currently selected configuration.
// Using a Symbol ensures that the initial value will never strictly match any
// valid variable value (string, number, boolean, null, undefined).
let lastJudgeRepeatValue = Symbol('initial_judge_repeat_value');

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
 * This function is generally not used by generateVoice itself, but provided for completeness.
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
 * Deeply unquotes variables like '"{{variable}}"' back to '{{variable}}'
 * This is needed because definitions are stored with quoted variables by the Vue component.
 * It recursively traverses objects and arrays.
 * @param {*} data - The data (object, array, string) to unquote.
 * @returns {*} - The data with variables unquoted.
 */
function unquoteVariablesDeep(data) {
    if (typeof data === 'string') {
         // Check if the string is EXACTLY a quoted variable like '"{{var}}"'
         // This regex matches the escaped quotes and the variable placeholder inside
         // JSON.parse results in a string value like '"{{var}}"' if the original JSON was "\"{{var}}\""
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
 * @param {Array<object>|object} [getParams] - Array of GET parameters [{key: value}] or object {key: value}.
 * @param {*} [postBody] - The request body for POST requests (can be any JSON-serializable type).
 * @param {boolean} useLocalProxy - Whether to use the local proxy.
 * @returns {Promise<Response>} The Response object on success. Throws an error on failure.
 */
async function makeApiRequest(url, method, getParams, postBody, useLocalProxy) {
    const fetchMethod = useLocalProxy ? proxyfetch : fetch;
    const fetchMethodName = useLocalProxy ? 'proxyfetch' : 'fetch';
    const requestMethod = method.toUpperCase(); // Ensure method is uppercase

    // console.log(`Using fetch method: ${fetchMethodName} for ${requestMethod} request`); // Avoid excessive logging
    console.log(`Executing API call to ${url}`); // Log original URL for clarity

    let finalUrl = url;
    const fetchOptions = {
        method: requestMethod,
        headers: {},
    };

    // Append GET parameters to URL
    if (requestMethod === 'GET' && (Array.isArray(getParams) || (typeof getParams === 'object' && getParams !== null))) {
        const urlParams = new URLSearchParams();

        const addParam = (key, value) => {
            if (value !== undefined && value !== null) {
                 // Check if value is a primitive or has a sensible toString
                 if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                      urlParams.append(key, String(value));
                 } else {
                      console.warn(`Skipping non-primitive GET parameter "${key}" with value:`, value);
                 }
            } else {
                 console.warn(`Skipping null/undefined GET parameter "${key}".`);
            }
        };

        if (Array.isArray(getParams)) {
            getParams.forEach(paramObj => {
                 if (typeof paramObj === 'object' && paramObj !== null) {
                     for(const key in paramObj) {
                          if (Object.hasOwnProperty.call(paramObj, key)) {
                              addParam(key, paramObj[key]);
                          }
                     }
                 } else {
                      console.warn("Skipping invalid GET parameter object in array:", paramObj);
                 }
            });
        } else { // Handle object case { key: value }
            for(const key in getParams) {
                if (Object.hasOwnProperty.call(getParams, key)) {
                   addParam(key, getParams[key]);
                }
            }
        }

        const queryString = urlParams.toString();
         if (queryString) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
         }
        console.log(`Constructed GET URL: ${finalUrl}`);
    }


    // Prepare POST body
    if (requestMethod === 'POST') {
        if (postBody !== undefined && postBody !== null) {
            try {
                 // Attempt to stringify the body. It could be any JSON-serializable structure
                 // resulting from substitution.
                 fetchOptions.body = JSON.stringify(postBody);
                 fetchOptions.headers['Content-Type'] = 'application/json'; // Assume JSON body for POST
                 // console.log(`Constructed POST Body: ${fetchOptions.body}`); // Avoid excessive logging
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
 * This function does NOT handle the before_requests logic or judge_repeat_before check.
 * It constructs the variables map specific to the conversation, substitutes
 * variables in the *main* config parameters, makes the API call, and saves the audio.
 * It reports its own success/failure status using the provided updateStatus callback.
 * @param {number} nameId - Character index + 1 (used to determine dataKey lookup).
 * @param {string} final_text - The processed text to synthesize.
 * @param {object} conversation - The current conversation object (includes emotion, storytext, id).
 * @param {string} lang - Language code ('zh', 'en', 'ja'), used for language variable.
 * @param {object} selectedConfigDefinition - The *unquoted* JSON definition for the selected config.
 * @param {object} configData - The user-entered data for the selected config (e.g., { "1_happy": { "filepath": "..." } }).
 * @param {string} audioDirectoryPath - The IndexedDB path to the audio directory.
 * @param {Function} updateStatus - Callback to update the status message (for per-item status).
 * @returns {Promise<{status: 'ok'|'error', reason?: string, conversationId: string|number}>} A result object.
 */
async function processConversationAudioRequest(nameId, final_text, conversation, lang, selectedConfigDefinition, configData, audioDirectoryPath, updateStatus) {
    const conversationId = conversation.id;
    // console.log(`Processing main audio request for ID ${conversationId}`); // Avoid excessive logging

    // 1. Prepare Variables Map for Substitution for THIS Conversation
    const variablesMap = {};
    variablesMap['text'] = final_text; // Cleaned text for {{text}}
    variablesMap['language'] = lang; // Language variable
    // The {{gptreturn}} variable gets the raw emotion from the conversation
    const conversationEmotion = conversation?.["emotion"];
    variablesMap['gptreturn'] = conversationEmotion || '';
    // console.log(`Conversation Emotion (for {{gptreturn}} in main request) for ID ${conversationId}: "${variablesMap['gptreturn']}"`); // Avoid excessive logging

    // Determine the actual emotion used for the dataKey lookup based on emotion_list and emotion_feedback
    const hasEmotionsConfigured = Array.isArray(selectedConfigDefinition?.emotion_list) && selectedConfigDefinition.emotion_list.length > 0;
    let emotionUsedForKey = ''; // Default to empty string (for key like '1')

    if (hasEmotionsConfigured) {
        const emotionList = selectedConfigDefinition.emotion_list || [];
        let effectiveEmotion = conversationEmotion || ''; // Start with conversation emotion

        // If conversation emotion is empty OR not found in the list
        if (effectiveEmotion === '' || !emotionList.includes(effectiveEmotion)) {
            // console.log(`Conversation emotion "${conversationEmotion || 'empty'}" not found in configured emotion_list. Trying emotion_feedback.`); // Avoid excessive logging
            // If not found/empty, try using emotion_feedback
            const feedbackEmotion = selectedConfigDefinition?.emotion_feedback;

            // Check if feedbackEmotion exists, is a non-empty string, AND is in the configured list
             if (typeof feedbackEmotion === 'string' && feedbackEmotion !== '' && emotionList.includes(feedbackEmotion)) {
                 // console.log(`Using valid emotion_feedback "${feedbackEmotion}" as fallback for data key.`); // Avoid excessive logging
                 effectiveEmotion = feedbackEmotion; // Use feedback as the emotion for the key
             } else {
                  console.warn(`Invalid or empty emotion_feedback "${feedbackEmotion}" or feedback emotion not in configured emotion_list for ID ${conversationId}. Falling back to index-only key if conversation emotion was invalid.`);
                  // effectiveEmotion remains the empty string it was initialized with from `conversationEmotion || ''`.
             }
        } else {
             // console.log(`Using conversation emotion "${effectiveEmotion}" for data key lookup.`); // Avoid excessive logging
            // effectiveEmotion is already the valid conversation emotion
        }
         // Assign the determined effectiveEmotion to emotionUsedForKey
         emotionUsedForKey = effectiveEmotion;
    } else {
        // If no emotion_list is defined, emotions are not configured for keys.
        // emotionUsedForKey remains '' (default).
        // console.log("emotion_list is not configured. Using index-only data key for main request for ID ${conversationId}."); // Avoid excessive logging
    }
    // Construct the dataKey (e.g., "1" or "1_happy")
    // Only append emotion if hasEmotionsConfigured is true AND a non-empty emotionUsedForKey was determined.
    // Remember data index is 1-based (placeId)
    const dataKey = hasEmotionsConfigured && emotionUsedForKey ? `${nameId}_${emotionUsedForKey}` : `${nameId}`;
    const rowData = configData?.[dataKey] || {}; // Get the data for this specific row/emotion key

    // console.log(`Looking up config data for main request for ID ${conversationId} using key: "${dataKey}"`); // Avoid excessive logging
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

    // console.log(`Final variables for main audio request substitution for ID ${conversationId}:`, variablesMap); // Avoid excessive logging

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
    const outputPath = `${audioDirectoryPath}/${conversationId}.wav`;
    try {
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
             const errorMsg = `API返回的音频 Blob 为空`;
             console.warn(`${errorMsg} for ID ${conversationId}.wav`);
             throw new Error(errorMsg + "。请检查API响应或配置。");
        }
        if (!audioBlob.type.startsWith('audio/') && audioBlob.type !== '' && audioBlob.type !== 'application/json') { // Allow empty type, or application/json if API indicates error via JSON
             console.warn(`警告: API返回 Blob 类型 "${audioBlob.type}" for ID ${conversationId}.wav，可能不是音频.`);
             // Consider if 'application/json' response should be treated as an error here if expecting audio
        }

        // Save the Blob to IndexedDB
        await saveBlobToFile(audioBlob, outputPath);
        // updateStatus(`  - 音频 ID ${conversationId}.wav 保存成功`); // Status handled by main loop aggregation
        updateStatus(`语音处理ID ${conversationId} 成功`);
        return { status: 'ok', conversationId };

    } catch (e) {
        const reason = e.message || '未知错误';
        console.error(`Error during main API call or file saving for ID ${conversationId}:`, e);
        // The specific error message from makeApiRequest or saveBlobToFile is in e.message
        updateStatus(`语音处理ID ${conversationId} 失败 原因：${reason}`);
        return { status: 'error', reason: reason, conversationId }; // Indicate failure with reason
    }
}


// --- Main Generation Process ---

/**
 * Generates voice audio files for a given story ID using the selected configuration.
 * This function orchestrates the process, including before_requests calls with shared state,
 * file existence checks, text processing, concurrency management, and status updates.
 * @param {string|number} storyId - The ID of the story segment.
 * @param {Function} updateStatus - Callback function to update the status message.
 * @returns {Promise<string>} "ok" on success, an error message string on failure that stopped the process, or a summary message if some tasks failed.
 */
async function generateVoice(storyId, updateStatus = console.log) {
    updateStatus("开始生成语音"); // Initial status update

    const fullConfig = loadFullConfig();

    if (!fullConfig) {
        const errorMsg = "语音生成失败：无法加载主配置。";
        updateStatus(errorMsg);
        return errorMsg;
    }

    // --- Get Selected Configuration ---
    const sovitsRoot = fullConfig[SOVITS_KEY];
    if (!sovitsRoot) {
        const errorMsg = `语音生成失败：配置中缺少 '${SOVITS_KEY}' 部分。`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    const selectedConfigName = sovitsRoot[SELECTED_MODEL_KEY];
    if (!selectedConfigName) {
        const errorMsg = `语音生成失败：未在配置中找到选定的模型 ('${SELECTED_MODEL_KEY}')。请在配置页面选择一个配置。`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    const configDefinitions = sovitsRoot[CONFIG_DEFINITIONS_KEY];
    if (!configDefinitions || !configDefinitions[selectedConfigName]) {
        const errorMsg = `语音生成失败：找不到名为 "${selectedConfigName}" 的配置定义。`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    // Unquote variables in the selected definition for use
    let selectedConfigDefinition;
    try {
        selectedConfigDefinition = unquoteVariablesDeep(configDefinitions[selectedConfigName]);
        console.log(`Using configuration definition "${selectedConfigName}"`);
        // console.log(selectedConfigDefinition); // Avoid excessive logging
    } catch(e) {
        const errorMsg = `语音生成失败：解析或处理配置 "${selectedConfigName}" 定义时出错: ${e.message}`;
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
         const errorMsg = "语音生成失败：配置中 '剧情.story_title' 未设置。";
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


    // Read story and character data
    let storyData;
    let characterData;

    // updateStatus(`读取故事文件: ${storyFilePath}`); // Status format change, remove this
    try {
        storyData = await readFile(storyFilePath);
         console.log(`Story file read: ${storyFilePath}`);
    } catch (e) {
        const errorMsg = `语音生成失败：读取故事文件失败: ${storyFilePath}. 错误: ${e.message}`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    // updateStatus(`读取角色文件: ${characterFilePath}`); // Status format change, remove this
    try {
        characterData = await readFile(characterFilePath);
        console.log(`Character file read: ${characterFilePath}`);
    } catch (e) {
        const errorMsg = `语音生成失败：读取角色文件失败: ${characterFilePath}. 错误: ${e.message}`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    if (!storyData || !Array.isArray(storyData.conversations)) {
        const errorMsg = `语音生成失败：故事数据无效或缺少 'conversations' 列表在 ${storyFilePath}`;
        updateStatus(errorMsg);
        return errorMsg;
    }
    if (!characterData || !Array.isArray(characterData)) {
        const errorMsg = `语音生成失败：角色数据无效或不是数组在 ${characterFilePath}`;
        updateStatus(errorMsg);
        return errorMsg;
    }

    const conversations = storyData.conversations;

    if (conversations.length === 0) {
         const message = `语音生成结束，成功数：0/失败数：0/跳过数：0`; // No conversations to start with
         updateStatus(message);
         console.log(`Story ${storyId} has no conversations.`);
         return "ok"; // Or a specific code for "nothing to process"? "ok" implies no errors occurred.
    }

    // Ensure audio directory exists
    // updateStatus(`确保音频目录存在: ${audioDirectoryPath}`); // Status format change, remove this
    try {
        await createFolder(audioDirectoryPath);
         console.log(`Audio directory ensured: ${audioDirectoryPath}`);
    } catch (e) {
        // Ignore if folder already exists, log other errors
        if (!e.message.includes('文件夹已存在') && !e.message.includes('Key already exists')) {
             console.warn(`无法创建音频目录 ${audioDirectoryPath} (可能已存在):`, e);
        }
    }


    let skippedCount = 0;
    // Array to hold conversations that actually need processing (after initial checks)
    const conversationsToProcessFiltered = [];

    // --- Initial Filtering and Skipping (Sequential - checks file existence, character, text) ---
    // This is done sequentially before starting concurrent tasks.
    for (const conversation of conversations) {
        const conversationId = conversation.id;
        const characterName = conversation.character;
        const storyText = conversation.text; // Use this for cleaning
         const outputPath = `${audioDirectoryPath}/${conversationId}.wav`;

         // Check if audio exists FIRST, as it's the most common skip case
         const metadata = await getMetadata(outputPath).catch(() => ({ exists: false }));
        if (metadata.exists) {
             console.log(`ID ${conversationId}: 音频文件已存在，跳过生成。`);
             updateStatus(`语音处理ID ${conversationId} 跳过 原因：文件已存在`);
             skippedCount++;
             continue; // Skip this conversation
        }

        if (!characterName) {
            console.log(`ID ${conversationId}: 角色名为空，跳过。`);
            updateStatus(`语音处理ID ${conversationId} 跳过 原因：角色名为空`);
            skippedCount++;
            continue;
        }

        // Basic text processing - remove content in various brackets and replace spaces/newlines
        // () , （） , [] , 【】 , {} , 『』 , <>
        const textReplaced = (storyText || '').replace(/[\(（\[【\{『<\s\S]*?[\)）\]】\}』>]/g, '').replace(/ /g, "，").replace(/\n/g, "。");
        // Trim leading/trailing commas and periods (handles cases where text starts/ends with brackets/newlines)
        let final_text = textReplaced.replace(/^[,。]+|[,。]+$/g, '');
        // Ensure minimum text length or presence after processing
        if (!final_text.trim()) {
           console.log(`ID ${conversationId}: 文本处理后为空，跳过。`);
           updateStatus(`语音处理ID ${conversationId} 跳过 原因：文本为空`);
           skippedCount++;
           continue;
       }

        // If it passed all initial checks, add to the list for potential concurrent processing
        // We also need the character's placeId for the dataKey lookup later
        let placeId = -1;
        const character = characterData.find(char => char.name === characterName);
        if (character) {
            placeId = characterData.indexOf(character) + 1; // JSON indices start from 1
        } else {
            placeId = 7; // Default fallback
        }
        conversationsToProcessFiltered.push({ conversation, final_text, placeId }); // Store original conversation, processed text, and placeId
    }
    // --- End Initial Filtering ---
    updateStatus(`语音待生成数：${conversationsToProcessFiltered.length}`);
    if (conversationsToProcessFiltered.length === 0) {
        // All conversations were either non-existent or skipped in the initial pass
        const finalMessage = `语音生成结束，成功数：0/失败数：0/跳过数：${skippedCount}`;
        updateStatus(finalMessage);
        console.log(`All conversations for story ${storyId} were filtered out or skipped.`);
        return "ok"; // No errors occurred, just nothing needed processing
    }

    // --- Before Requests Logic (Batch Level Check and Execution) ---
    // Determine if before_requests should run based on judge_repeat_before variable value
    const beforeRequestsDefinitions = selectedConfigDefinition?.before_requests; // Can be null, undefined, or []
    const judgeRepeatBeforeConfig = selectedConfigDefinition?.judge_repeat_before;

    let judgeRepeatVariableName = null;
    let currentJudgeRepeatValue = null; // Value derived from the *first* conversation needing processing
    let needsBeforeRequestsCall = true; // Default to true

    // Only proceed with judge_repeat logic if 'allow_concurrency' is true AND judge_repeat_before is configured
    if (selectedConfigDefinition?.allow_concurrency === true && judgeRepeatBeforeConfig && typeof judgeRepeatBeforeConfig === 'string' && judgeRepeatBeforeConfig.trim() !== '') {
         const variableMatch = judgeRepeatBeforeConfig.match(/^\{\{\s*(\w+)\s*\}\}$/);
         if (variableMatch) {
              judgeRepeatVariableName = variableMatch[1];
              console.log(`judge_repeat_before variable identified: {{${judgeRepeatVariableName}}}`);

              // *** Derive currentJudgeRepeatValue from the FIRST conversation that needs processing ***
              const firstConvItem = conversationsToProcessFiltered[0];
              const firstConv = firstConvItem.conversation;
              const firstConvPlaceId = firstConvItem.placeId; // Use the already determined placeId

              // Build variables map for the first conversation (logic similar to pCAR)
              const firstConvVariablesMap = {};
              firstConvVariablesMap['text'] = firstConvItem.final_text; // Use processed text
              firstConvVariablesMap['language'] = lang;
              firstConvVariablesMap['gptreturn'] = firstConv?.emotion || ''; // Raw emotion from story data

              const hasEmotionsConfigured = Array.isArray(selectedConfigDefinition?.emotion_list) && selectedConfigDefinition.emotion_list.length > 0;
              let firstConvEmotionUsedForKey = '';
               if (hasEmotionsConfigured) {
                    const emotionList = selectedConfigDefinition.emotion_list || [];
                    let effectiveEmotion = firstConvVariablesMap['gptreturn']; // Start with gptreturn value
                    if (effectiveEmotion === '' || !emotionList.includes(effectiveEmotion)) {
                        const feedbackEmotion = selectedConfigDefinition?.emotion_feedback;
                         if (typeof feedbackEmotion === 'string' && feedbackEmotion !== '' && emotionList.includes(feedbackEmotion)) {
                            effectiveEmotion = feedbackEmotion;
                         }
                    }
                    firstConvEmotionUsedForKey = effectiveEmotion;
               }

              const firstConvDataKey = hasEmotionsConfigured && firstConvEmotionUsedForKey ? `${firstConvPlaceId}_${firstConvEmotionUsedForKey}` : `${firstConvPlaceId}`;
              const firstConvRowData = configData?.[firstConvDataKey] || {};

               (selectedConfigDefinition?.required_item || []).forEach(item => {
                  const itemKey = Object.keys(item)[0];
                  const valueFromData = firstConvRowData[itemKey];
                   const itemDefault = item[itemKey];
                   if (valueFromData !== undefined && valueFromData !== null && valueFromData !== '') {
                      firstConvVariablesMap[itemKey] = valueFromData;
                  } else if (typeof itemDefault === 'string' || typeof itemDefault === 'number' || typeof itemDefault === 'boolean') {
                      firstConvVariablesMap[itemKey] = itemDefault;
                  } else {
                       firstConvVariablesMap[itemKey] = '';
                  }
               });

              // Get the variable value from the map
              currentJudgeRepeatValue = firstConvVariablesMap[judgeRepeatVariableName];
              console.log(`Derived judge_repeat_before value for the batch (from first item needing processing, ID ${firstConv.id}): "${currentJudgeRepeatValue}"`);
              console.log(`Global last judge repeat value: "${String(lastJudgeRepeatValue)}"`); // Convert Symbol to string for logging

              // Determine if BEFORE requests are needed: only if current value is DIFFERENT from the last successful value.
              // The initial Symbol value ensures the first run always needs the call.
              needsBeforeRequestsCall = currentJudgeRepeatValue !== lastJudgeRepeatValue;

              if (!Array.isArray(beforeRequestsDefinitions) || beforeRequestsDefinitions.length === 0) {
                  console.log("judge_repeat_before is configured, but before_requests array is empty. Skipping before requests logic.");
                  needsBeforeRequestsCall = false; // No requests to make anyway
              }


         } else {
              console.warn(`judge_repeat_before is configured but format is invalid ("${judgeRepeatBeforeConfig}") or allow_concurrency is false. judge_repeat logic will be ignored. Before requests will run every time if defined and not empty.`);
         }
    } else {
         console.log("judge_repeat_before is not configured or allow_concurrency is false. Before requests will run every time if defined and not empty.");
    }

    // If beforeRequestsDefinitions is not an array or is empty, we don't run them anyway, so needsBeforeRequestsCall is false implicitly.
    if (!Array.isArray(beforeRequestsDefinitions) || beforeRequestsDefinitions.length === 0) {
         needsBeforeRequestsCall = false; // Explicitly set to false if there are no requests defined
    }


    const useLocalProxy = configData?.useLocalProxy === true;

    if (needsBeforeRequestsCall) {
        updateStatus(`语音信息：执行前置请求 (共 ${beforeRequestsDefinitions.length} 个)...`);
        try {
             // Execute each request in the before_requests array sequentially *before* starting concurrent tasks.
             // The variables for the before requests are derived from the *first* conversation that needs processing.
             // If before_requests need variables that change per conversation, this batch approach won't work.
             // This assumes before_requests are setup/auth calls depending on a shared variable like model name.
             const firstConvItem = conversationsToProcessFiltered[0]; // Guaranteed to exist if needsBeforeRequestsCall is true and list > 0
             const firstConv = firstConvItem.conversation;
             const firstConvPlaceId = firstConvItem.placeId;

             // Rebuild variables map for the first conversation for use in before_requests substitution
             const firstConvVariablesMap = {};
             firstConvVariablesMap['text'] = firstConvItem.final_text;
             firstConvVariablesMap['language'] = lang;
             firstConvVariablesMap['gptreturn'] = firstConv?.emotion || '';

             const hasEmotionsConfigured = Array.isArray(selectedConfigDefinition?.emotion_list) && selectedConfigDefinition.emotion_list.length > 0;
             let firstConvEmotionUsedForKey = '';
              if (hasEmotionsConfigured) {
                   const emotionList = selectedConfigDefinition.emotion_list || [];
                   let effectiveEmotion = firstConvVariablesMap['gptreturn'];
                   if (effectiveEmotion === '' || !emotionList.includes(effectiveEmotion)) {
                       const feedbackEmotion = selectedConfigDefinition?.emotion_feedback;
                        if (typeof feedbackEmotion === 'string' && feedbackEmotion !== '' && emotionList.includes(feedbackEmotion)) {
                           effectiveEmotion = feedbackEmotion;
                        }
                   }
                   firstConvEmotionUsedForKey = effectiveEmotion;
              }

             const firstConvDataKey = hasEmotionsConfigured && firstConvEmotionUsedForKey ? `${firstConvPlaceId}_${firstConvEmotionUsedForKey}` : `${firstConvPlaceId}`;
             const firstConvRowData = configData?.[firstConvDataKey] || {};

              (selectedConfigDefinition?.required_item || []).forEach(item => {
                 const itemKey = Object.keys(item)[0];
                 const valueFromData = firstConvRowData[itemKey];
                  const itemDefault = item[itemKey];
                  if (valueFromData !== undefined && valueFromData !== null && valueFromData !== '') {
                     firstConvVariablesMap[itemKey] = valueFromData;
                 } else if (typeof itemDefault === 'string' || typeof itemDefault === 'number' || typeof itemDefault === 'boolean') {
                     firstConvVariablesMap[itemKey] = itemDefault;
                 } else {
                      firstConvVariablesMap[itemKey] = '';
                 }
              });


             for (let j = 0; j < beforeRequestsDefinitions.length; j++) {
                 const beforeReqDef = beforeRequestsDefinitions[j];
                  if (!beforeReqDef || typeof beforeReqDef !== 'object' || !beforeReqDef.url) {
                     console.warn(`Skipping invalid before_request definition at index ${j}:`, beforeReqDef);
                     updateStatus(`语音信息：  - 跳过无效前置请求 ${j+1}`);
                     continue; // Skip invalid entries
                 }

                 const beforeReqDetails = {
                     url: beforeReqDef.url,
                     requestmethod: beforeReqDef.requestmethod || 'GET', // Default to GET
                     getparams: beforeReqDef.getparams || [],
                     body: beforeReqDef.body,
                 };

                 // Substitute variables in before request details using the *first conversation's variables map*
                 const substitutedBeforeReqDetails = substituteVariables(beforeReqDetails, firstConvVariablesMap);

                 updateStatus(`语音信息：  - 执行前置请求 ${j+1}/${beforeRequestsDefinitions.length}: ${substitutedBeforeReqDetails.url}`);
                 await makeApiRequest(
                     substitutedBeforeReqDetails.url,
                     substitutedBeforeReqDetails.requestmethod.toUpperCase(),
                     substitutedBeforeReqDetails.getparams,
                     substitutedBeforeReqDetails.body,
                     useLocalProxy
                 );
                 updateStatus(`语音信息：  - 前置请求 ${j+1} 成功`);
             }
             updateStatus(`语音信息：所有前置请求成功`);

            // Update the global state ONLY if before requests were successfully executed
            // AND if judge_repeat_before logic was active (judgeRepeatVariableName is not null)
            if (judgeRepeatVariableName !== null) {
                 lastJudgeRepeatValue = currentJudgeRepeatValue;
                 console.log(`Updated global last judge repeat value to: "${lastJudgeRepeatValue}"`);
             }

        } catch (beforeError) {
            console.error(`前置请求失败:`, beforeError);
            const errorMsg = `语音生成中止: 前置请求失败: ${beforeError.message}`;
            updateStatus(errorMsg);
            // Don't update lastJudgeRepeatValue on failure
            return errorMsg; // Stop the entire process
        }
    } else {
        // Only report skipping if judge_repeat_before logic was active and caused the skip
         if (judgeRepeatVariableName !== null) {
             updateStatus(`语音信息：跳过前置请求: judge_repeat_before 值未改变.`);
             console.log(`Skipping before requests as judge_repeat_before value is unchanged.`);
         } else {
              console.log(`Skipping before requests as they are not configured or empty.`);
         }
    }
    // --- End Before Requests Logic ---


    // --- Concurrent Processing of Main Requests ---
    // Get concurrency value from configData, validate it, default to 1
    const concurrencyValue = configData.concurrency;
    let concurrencyLimit = Math.max(1, (typeof concurrencyValue === 'number' && Number.isInteger(concurrencyValue) && concurrencyValue > 0) ? concurrencyValue : 1);

    // If allow_concurrency is false in the definition, force concurrency to 1, ignoring the value in configData
     if (selectedConfigDefinition?.allow_concurrency !== true) {
         console.log(`Configuration "${selectedConfigName}" does not allow concurrency. Forcing concurrency limit to 1.`);
         concurrencyLimit = 1; // Re-declare or reassign, depends on preference, let's reassign.
     }

    updateStatus(`语音生成并发数：${concurrencyLimit}`)
    console.log(`Starting concurrent processing with limit: ${concurrencyLimit} for ${conversationsToProcessFiltered.length} items.`);

    // Create a p-limit instance with the determined concurrency limit
    const limit = pLimit(concurrencyLimit);

    // Map each conversation requiring processing to a promise using p-limit
    const processingPromises = conversationsToProcessFiltered.map(item =>
        limit(() =>
             processConversationAudioRequest(
                 item.placeId, // Use the placeId derived earlier for this conversation
                 item.final_text,
                 item.conversation, // Pass the full conversation object
                 lang,
                 selectedConfigDefinition, // Pass unquoted definition
                 configData, // Pass user data (includes proxy, concurrency)
                 audioDirectoryPath,
                 updateStatus // Pass the global updateStatus callback (it handles per-item format)
             )
        )
    );

    // Wait for all concurrent tasks to complete.
    // Promise.allSettled waits for all promises to finish, regardless of success or failure.
    const results = await Promise.allSettled(processingPromises);

    // Aggregate results after all promises are settled
    let successCountConcurrent = 0;
    let errorCountConcurrent = 0;

    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.status === 'ok') {
            successCountConcurrent++;
        } else if (result.status === 'fulfilled' && result.value.status === 'error') {
             errorCountConcurrent++;
        } else {
            // This case handles promises that were rejected before returning the { status: ... } object,
            // which shouldn't happen with the current processConversationAudioRequest structure,
            // but good defensive coding.
            console.error("A processing promise was rejected unexpectedly:", result.reason);
            errorCountConcurrent++;
             // If the rejection reason has a conversationId, try to log a status for it
            if (result.reason && result.reason.conversationId !== undefined) {
                 updateStatus(`语音处理ID ${result.reason.conversationId} 失败 原因：意外错误 (${result.reason.message || '未知'})`);
             } else {
                 // Generic error status if conversationId is unknown
                  updateStatus(`语音处理ID 未知 失败 原因：意外处理错误 (${result.reason?.message || '未知'})`);
             }
        }
    });

    // Total counts including initial skips
    successCount += successCountConcurrent; // successCount was 0 initially
    errorCount += errorCountConcurrent; // errorCount was 0 initially


    // --- Final Status Update ---
    const finalMessage = `语音生成结束，成功数：${successCount}/失败数：${errorCount}/跳过数：${skippedCount}`;
    updateStatus(finalMessage);
    console.log(finalMessage);

    // Decide return value based on errors encountered during concurrent processing
    if (errorCountConcurrent > 0) {
         return `完成但有 ${errorCountConcurrent} 个对话生成失败。`;
    } else if (successCountConcurrent > 0 || skippedCount > 0) {
         return "ok"; // Some processing/skipping happened without errors
    } else {
         // This case might be rare if conversationsToProcessFiltered is non-empty
         // and no errors occurred, but zero success/error means something was missed.
         // However, based on logic, this branch should only be hit if conversationsToProcessFiltered was empty,
         // which is handled earlier. Returning "ok" here is the safest default for "no critical errors".
         return "ok";
    }
}

// Export the main function and helpers needed by UI or other modules
export {
    generateVoice,
    loadFullConfig as loadConfig, // Rename export for consistency if UI uses loadConfig
    saveFullConfig as saveConfig, // Rename export for consistency if UI uses saveConfig
    makeApiRequest, // Export for testing/re-use
    substituteVariables, // Export for testing/validation
    unquoteVariablesDeep, // Export for loading/editing
    processConversationAudioRequest, // Export for testing in VoiceConfig.vue
    // saveBlobToFile // Internal helper, typically not exported
};