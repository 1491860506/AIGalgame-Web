// voiceGenerator.js

import { readFile, writeFile, listDirectory, getMetadata, createFolder } from './IndexedDBFileSystem.js';

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
        return null;
      }
      return JSON.parse(configStr);
    } catch (error) {
      console.error("加载配置失败:", error);
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
    const modelName = modelConfig?.[`model${nameId}`];
    const promptPath = modelConfig?.[`path${nameId}`];
    const promptText = modelConfig?.[`text${nameId}`];

    if (!modelName || !promptPath || !promptText) {
        console.error(`SOVITS config missing for nameId ${nameId}`);
        return "error";
    }

    const soVitsBaseUrl = 'http://127.0.0.1:9880'; // Hardcoded SOVITS URL as in Python

    try {
        if (status === 0) {
            console.log(`  - Setting SOVITS weights for model: ${modelName}`);
             updateStatus(`  - 设置模型权重: ${modelName}`);
            // Note: Python paths "GPT_weights_v2/" and "SoVITS_weights_v2/" are relative paths
            // We'll pass them as-is to the local SOVITS API, assuming it resolves them correctly server-side.
            const setGptUrl = `${soVitsBaseUrl}/set_gpt_weights?weights_path=GPT_weights_v2/${modelName}.ckpt`;
            const setSovitsUrl = `${soVitsBaseUrl}/set_sovits_weights?weights_path=SoVITS_weights_v2/${modelName}.pth`;
            // Make sure to await these calls
            const gptResponse = await fetch(setGptUrl);
            if (!gptResponse.ok) {
                console.error("Failed to set GPT weights:", gptResponse.statusText);
                 // Continue anyway? Or return error? Python doesn't check success here. Let's continue but log error.
            } else {
                 console.log("  - GPT weights set successfully.");
            }

            const sovitsResponse = await fetch(setSovitsUrl);
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
        const response = await fetch(ttsUrl);

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
    const storyTitle = config.剧情.story_title;

    if (!storyTitle) {
         const errorMsg = "生成语音失败：配置中 '剧情.story_title' 未设置。";
         updateStatus(errorMsg);
         console.error(errorMsg);
         return errorMsg;
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
        console.warn(`Failed to create audio directory ${audioDirectoryPath}. writeFile might create parents anyway:`, e);
        // Continue, as writeFile should handle parent directory creation
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
    updateStatus(`检查已生成的音频文件以确定起始ID...`);
    try {
        const files = await listDirectory(audioDirectoryPath);
        console.log(`Existing files in ${audioDirectoryPath}:`, files);
        const audioFiles = files.filter(f => f.name.endsWith(".wav") && !f.isFolder);

        if (audioFiles.length > 0) {
            const ids = audioFiles
                .map(f => parseInt(f.name.replace(".wav", ""), 10))
                .filter(id => !isNaN(id)); // Only keep valid numbers

            if (ids.length > 0) {
                const maxId = Math.max(...ids);
                startId = maxId + 1; // Start from the next ID after the largest existing one
                console.log(`Largest existing audio ID is ${maxId}, resuming from ${startId}`);
                 updateStatus(`找到最大音频ID ${maxId}, 从 ID ${startId} 继续`);
            } else {
                 console.log("No valid numeric audio filenames found. Starting from ID 1.");
                 updateStatus("未找到有效数字命名的音频文件。从 ID 1 开始");
            }
        } else {
            console.log("No existing audio files found. Starting from ID 1.");
             updateStatus("未找到现有音频文件。从 ID 1 开始");
        }
    } catch (e) {
         console.warn(`Error listing audio directory ${audioDirectoryPath}. Assuming startId 1:`, e);
         updateStatus(`列出目录失败，从 ID 1 开始: ${e.message}`);
        startId = 1; // Default to 1 if listing fails
    }


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
             processedCount++; // Count even skipped ones if they were >= startId
             // Need to update previousModelName even for skipped ones if it's relevant for the *next* conversation
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
             // Need to update previousModelName even for skipped ones if it's relevant for the *next* conversation
              // For empty character, the previous model doesn't change relevant state for the _next_ *valid* character
              // So we don't update previousModelName here.
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
        }

        const modelName = config['SOVITS']?.[`model${placeId}`];

        let status = 0; // Default to set weights
        if (previousModelName !== null && modelName === previousModelName) {
            status = 1; // Reuse weights if model is the same as previous
        }

        console.log(`Processing conversation ID ${conversationId} for character ${characterName} (placeId ${placeId})`);
        updateStatus(`处理 ID ${conversationId} (${processedCount + 1}/${conversationsToProcess.length}) 角色: ${characterName}`);

        const result = await generateSingleAudio(
            placeId,
            final_text,
            status,
            String(conversationId), // Ensure output name is string ID
            config,
            audioDirectoryPath,
            updateStatus // Pass updateStatus down
        );

        if (result === "ok") {
            processedCount++;
            previousModelName = modelName; // Update previous model only on success
        } else {
             // If generation fails, stop processing? Or just log and continue?
             // Python code doesn't explicitly stop on generate_single_audio error. Let's log and continue.
             console.error(`Failed to generate audio for conversation ID ${conversationId}. Continuing to next.`);
             // Don't update previousModelName on failure, so the next *successful* generation will likely reset weights (status 0)
        }
    }

    const finalMessage = `完成故事 ${storyId} 的语音生成。处理了 ${processedCount} 个对话。`;
    updateStatus(finalMessage);
    console.log(finalMessage);
    return "ok"; // Return ok even if some failed, unless we want a strict "all or nothing"

}

// Export the main function
export {
    generateVoice,
    loadConfig, // Also export loadConfig/saveConfig for the UI
    saveConfig
};