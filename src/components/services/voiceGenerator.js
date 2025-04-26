// voiceGenerator.js

import { readFile, writeFile, listDirectory, getMetadata, createFolder } from './IndexedDBFileSystem.js';
import proxyfetch from './proxyfetch.js' // Ensure this is imported

// --- 辅助函数 (与 musicGenerator.js 中的可能重复，这里为了独立性重新实现) ---

/**
 * 从localStorage加载配置
 * @returns {object} 配置对象，如果不存在则返回默认结构
 */
function loadConfig() {
    try {
      const configStr = localStorage.getItem('aiGalgameConfig');
      if (!configStr) {
        console.error("配置文件未找到");
        // Note: Original code returns null, keep this behavior
        return null;
      }
      return JSON.parse(configStr);
    } catch (error) {
      console.error("加载配置失败:", error);
       // Note: Original code returns null, keep this behavior
      return null;
    }
  }

/**
 * 将配置保存到localStorage
 * @param {object} config - 要保存的配置对象
 */
function saveConfig(config) {
    try {
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        console.log("Config saved to localStorage.");
    } catch (e) {
        console.error("Failed to save config to localStorage:", e);
    }
}


// --- 语音生成核心逻辑 ---

/**
 * Generates a single audio file using SOVITS.
 * @param {number} nameId - Character ID used for SOVITS model lookup.
 * @param {string} text - Text to synthesize.
 * @param {number} status - 0 to set weights, 1 to reuse weights.
 * @param {string} outputName - The name for the output file (without extension).
 * @param {object} config - The loaded configuration object.
 * @param {string} audioDirectoryPath - The IndexedDB path to the audio directory.
 * @param {Function} updateStatus - Callback to update status.
 * @returns {Promise<string>} "ok" on success, "error" on failure.
 */
async function generateSingleAudio(nameId, text, status, outputName, config, audioDirectoryPath, updateStatus) {
    updateStatus(`  - 生成音频 ${outputName}.wav ...`);
    const modelConfig = config['SOVITS'];

    // --- Modifications Start Here ---

    // Determine the SOVITS base URL from config or use default
    const configuredSovitsUrl = modelConfig?.['sovitsURL'];
    const soVitsBaseUrl = (configuredSovitsUrl && configuredSovitsUrl.trim() !== '')
        ? configuredSovitsUrl.trim() // Use configured URL if it exists and is not empty
        : 'http://127.0.0.1:9880'; // Otherwise, use the previous hardcoded default

    // Determine which fetch method to use based on config
    const useLocalProxy = modelConfig?.['useLocalProxy']; // This is read from config and can be any type
    // Check if useLocalProxy exists and is strictly boolean true
    const fetchMethod = (useLocalProxy === true) ? proxyfetch : fetch;
    console.log(`Using SOVITS base URL: ${soVitsBaseUrl}`);
    console.log(`Using fetch method: ${fetchMethod === proxyfetch ? 'proxyfetch' : 'fetch'}`);

    // --- Modifications End Here ---


    const modelName = modelConfig?.[`model${nameId}`];
    const promptPath = modelConfig?.[`path${nameId}`];
    const promptText = modelConfig?.[`text${nameId}`];

    if (!modelName || !promptPath || !promptText) {
        console.error(`SOVITS config missing for nameId ${nameId}`);
        updateStatus(`  - SOVITS 配置缺失 nameId ${nameId}`);
        return "error";
    }


    try {
        if (status === 0) {
            console.log(`  - Setting SOVITS weights for model: ${modelName}`);
             updateStatus(`  - 设置模型权重: ${modelName}`);
            // Note: Python paths "GPT_weights_v2/" and "SoVITS_weights_v2/" are relative paths
            // We'll pass them as-is to the local SOVITS API, assuming it resolves them correctly server-side.
            const setGptUrl = `${soVitsBaseUrl}/set_gpt_weights?weights_path=GPT_weights_v2/${modelName}.ckpt`;
            const setSovitsUrl = `${soVitsBaseUrl}/set_sovits_weights?weights_path=SoVITS_weights_v2/${modelName}.pth`;
            // Make sure to await these calls
            // --- Use fetchMethod instead of fetch ---
            const gptResponse = await fetchMethod(setGptUrl);
            if (!gptResponse.ok) {
                console.error("Failed to set GPT weights:", gptResponse.statusText);
                 // Continue anyway? Or return error? Python doesn't check success here. Let's continue but log error.
            } else {
                 console.log("  - GPT weights set successfully.");
            }
            // --- Use fetchMethod instead of fetch ---
            const sovitsResponse = await fetchMethod(setSovitsUrl);
             if (!sovitsResponse.ok) {
                console.error("Failed to set SoVITS weights:", sovitsResponse.statusText);
                 // Continue anyway? Or return error? Python doesn't check success here. Let's continue but log error.
            } else {
                 console.log("  - SoVITS weights set successfully.");
            }
        }

        let lang = "zh";
        const themeLanguage = config['剧情']?.['language']; // Read from config
        if (themeLanguage === "英文") {
            lang = "en";
        } else if (themeLanguage === "日文") { // Assuming "日文" based on Python else case
            lang = "ja";
        }
         console.log(`  - Using language: ${lang}`);


        // Construct the TTS URL
        // Encode text and promptText for URL
        const encodedText = encodeURIComponent(text);
        const encodedPromptText = encodeURIComponent(promptText);
        const encodedPromptPath = encodeURIComponent(promptPath); // Prompt path might also contain special chars

        const ttsUrl = `${soVitsBaseUrl}/tts?text=${encodedText}&text_lang=${lang}&ref_audio_path=${encodedPromptPath}&prompt_lang=zh&prompt_text=${encodedPromptText}&text_split_method=cut5&batch_size=1&media_type=wav&streaming_mode=false`;

        console.log(`  - Calling SOVITS TTS: ${ttsUrl}`);
        // --- Use fetchMethod instead of fetch ---
        const response = await fetchMethod(ttsUrl);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`SOVITS TTS API response error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        // Get the response as a Blob (for binary data like WAV)
        const audioBlob = await response.blob();

        // Save the Blob to IndexedDB
        const outputPath = `${audioDirectoryPath}/${outputName}.wav`;
        console.log(`  - Saving audio to IndexedDB: ${outputPath}`);
        await writeFile(outputPath, audioBlob);
        console.log(`  - Audio saved successfully: ${outputPath}`);
         updateStatus(`  - 音频 ${outputName}.wav 保存成功`);

        return "ok";

    } catch (e) {
        console.error(`Error generating audio for ${outputName}:`, e);
         updateStatus(`  - 音频 ${outputName}.wav 生成失败: ${e.message}`);
        return "error";
    }
}

/**
 * Generates voice audio files for a given story ID.
 * @param {string|number} storyId - The ID of the story segment (corresponds to {story_id}.json).
 * @param {Function} updateStatus - Callback function to update the status message in the UI.
 * @returns {Promise<string>} "ok" on success, an error message string on failure.
 */
async function generateVoice(storyId, updateStatus= console.log) {
    updateStatus(`开始生成故事 ${storyId} 的语音...`);
    const config = loadConfig();

    // Ensure config is loaded before accessing properties
    if (!config) {
        const errorMsg = "生成语音失败：无法加载配置。";
        updateStatus(errorMsg);
        console.error(errorMsg);
        return errorMsg;
    }

    const storyTitle = config.剧情?.story_title; // Use optional chaining in case 剧情 is missing

    if (!storyTitle) {
         const errorMsg = "生成语音失败：配置中 '剧情.story_title' 未设置。";
         updateStatus(errorMsg);
         console.error(errorMsg);
         return errorMsg;
    }

    // Ensure SOVITS config exists and has required models before proceeding
    const sovitsConfig = config['SOVITS'];
    if (!sovitsConfig) {
        const errorMsg = "生成语音失败：配置中 'SOVITS' 部分未找到。";
        updateStatus(errorMsg);
        console.error(errorMsg);
        return errorMsg;
    }
     // Basic check for at least one model config
     if (!sovitsConfig.model1 || !sovitsConfig.path1 || !sovitsConfig.text1) {
        // This check might be too strict depending on how many characters are expected.
        // generateSingleAudio already checks for the specific nameId being processed.
        // Removing this general check here to rely on the specific check in generateSingleAudio.
     }


    const baseDataDir = `/data/${storyTitle}`;
    const audioDirectoryPath = `${baseDataDir}/audio/${storyId}`;
    const storyFilePath = `${baseDataDir}/story/${storyId}.json`;
    const characterFilePath = `${baseDataDir}/character.json`;

    // Ensure audio directory exists
     updateStatus(`确保音频目录存在: ${audioDirectoryPath}`);
    try {
        await createFolder(audioDirectoryPath);
         console.log(`Ensured audio directory exists: ${audioDirectoryPath}`);
    } catch (e) {
        // Log a warning but continue, as writeFile might create parents
        console.warn(`Failed to create audio directory ${audioDirectoryPath}. writeFile might create parents anyway:`, e);
    }


    // Read story and character data
    let storyData;
    let characterData;

    updateStatus(`读取故事文件: ${storyFilePath}`);
    try {
        storyData = await readFile(storyFilePath);
        console.log(`Story data read successfully from ${storyFilePath}`);
    } catch (e) {
        const errorMsg = `读取故事文件失败: ${storyFilePath}. 错误: ${e.message}`;
        updateStatus(errorMsg);
        console.error(errorMsg);
        return errorMsg;
    }

    updateStatus(`读取角色文件: ${characterFilePath}`);
    try {
        characterData = await readFile(characterFilePath);
        console.log(`Character data read successfully from ${characterFilePath}`);
    } catch (e) {
         const errorMsg = `读取角色文件失败: ${characterFilePath}. 错误: ${e.message}`;
        updateStatus(errorMsg);
        console.error(errorMsg);
        return errorMsg;
    }


    if (!storyData || !Array.isArray(storyData.conversations)) {
        const errorMsg = `故事数据无效或缺少 'conversations' 列表在 ${storyFilePath}`;
        updateStatus(errorMsg);
        console.error(errorMsg);
        return errorMsg;
    }

    if (!characterData || !Array.isArray(characterData)) {
         const errorMsg = `角色数据无效或不是数组在 ${characterFilePath}`;
        updateStatus(errorMsg);
        console.error(errorMsg);
        return errorMsg;
    }

    // Determine the starting ID
    let startId = 1;



    let previousModelName = null;
    let processedCount = 0;

    // Filter conversations to process only those >= startId
    const conversationsToProcess = storyData.conversations.filter(conv => conv.id >= startId);

    if (conversationsToProcess.length === 0) {
        const message = `没有找到 ID >= ${startId} 的对话需要生成音频。`;
         updateStatus(message);
         console.log(message);
        return "ok"; // Nothing to process is a success case
    }

     updateStatus(`找到 ${conversationsToProcess.length} 个对话需要生成音频 (从 ID ${startId} 开始)...`);

    for (const conversation of conversationsToProcess) {
        const characterName = conversation["character"];
        const storyText = conversation["text"];
        const conversationId = conversation["id"];

        // Check if the audio file already exists (double check in case files were added between listing and processing)
         const outputPath = `${audioDirectoryPath}/${conversationId}.wav`;
         const metadata = await getMetadata(outputPath).catch(() => ({exists: false})); // Ignore error, assume not exists
         if (metadata.exists) {
             console.log(`Audio file already exists for conversation ID: ${conversationId}. Skipping.`);
             updateStatus(`跳过 ID ${conversationId}: 音频文件已存在`);
             processedCount++; // Count towards total processed if it was >= startId
             // Need to update previousModelName for correct status calculation in the next iteration
             const char = characterData.find(char => char.name === characterName);
             if (char) {
                 const placeId = characterData.indexOf(char) + 1;
                  previousModelName = config['SOVITS']?.[`model${placeId}`];
             } else {
                 previousModelName = null; // Reset if character not found
             }
             continue;
         }


        if (!characterName) {
            console.log(`Skipping conversation ID ${conversationId}: character name is empty.`);
             updateStatus(`跳过 ID ${conversationId}: 角色名为空`);
             // Don't update previousModelName as this conversation doesn't set a model.
            continue;
        }

        // Remove parentheses and their contents
        const textWithoutParentheses = storyText.replace(/[\(（].*?[\)）]/g, ''); // Use /g for global replacement

        // Replace space with chinese comma and newline with chinese period.
        const textReplaced = textWithoutParentheses.replace(/ /g, "，").replace(/\n/g, "。");

        // Remove leading commas and periods.
        let final_text = textReplaced;
        while (final_text.startsWith("，") || final_text.startsWith("。")) {
            final_text = final_text.substring(1);
        }

        // Skip if the text is empty after processing
        if (!final_text.trim()) {
             console.log(`Skipping conversation ID ${conversationId}: text is empty after processing.`);
             updateStatus(`跳过 ID ${conversationId}: 文本处理后为空`);
             // Don't update previousModelName
            continue;
        }

        let placeId = 6; // Default value if character not found

        const character = characterData.find(char => char.name === characterName);
        if (character) {
            placeId = characterData.indexOf(character) + 1; // JSON indices start from 1
        } else {
             console.warn(`Character "${characterName}" not found in character data for conversation ID ${conversationId}. Using default placeId ${placeId}.`);
             // Don't update previousModelName if character isn't found, as we don't know which model was *actually* used.
        }

        // Retrieve model name based on determined placeId
        const modelName = config['SOVITS']?.[`model${placeId}`];

        // If modelName isn't found for the placeId (even if character was found), skip
        if (!modelName) {
             console.warn(`SOVITS config missing model for placeId ${placeId} (character "${characterName}") for conversation ID ${conversationId}. Skipping.`);
             updateStatus(`跳过 ID ${conversationId}: 角色模型未配置`);
             // Don't update previousModelName
            continue;
        }


        let status = 0; // Default to set weights
        if (previousModelName !== null && modelName === previousModelName) {
            status = 1; // Reuse weights if model is the same as previous
        }

        console.log(`Processing conversation ID ${conversationId} for character ${characterName} (placeId ${placeId}) using model ${modelName}`);
        updateStatus(`处理 ID ${conversationId} (${processedCount + 1}/${conversationsToProcess.length}) 角色: ${characterName}`);

        const result = await generateSingleAudio(
            placeId, // Pass placeId, which is used as nameId in generateSingleAudio
            final_text,
            status,
            String(conversationId), // Ensure output name is string ID
            config,
            audioDirectoryPath,
            updateStatus // Pass updateStatus down
        );

        if (result === "ok") {
            processedCount++;
            previousModelName = modelName; // Update previous model only on successful generation for this model
        } else {
             // If generation fails, log and continue.
             console.error(`Failed to generate audio for conversation ID ${conversationId}. Continuing to next.`);
             // Don't update previousModelName on failure, so the next *successful* generation will likely reset weights (status 0) if the character/model changes.
        }
    }

    const finalMessage = `完成故事 ${storyId} 的语音生成。处理了 ${processedCount} 个对话。`;
    updateStatus(finalMessage);
    console.log(finalMessage);
    // Return ok even if some failed, unless we want a strict "all or nothing" failure.
    // The original code implies continuing after a single error, so returning "ok" at the end seems consistent.
    return "ok";

}

// Export the main function
export {
    generateVoice,
    loadConfig, // Also export loadConfig/saveConfig for the UI
    saveConfig
};