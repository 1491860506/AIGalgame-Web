// src/composables/useStoryGenerator.js
import { ref } from 'vue';
import * as idbFs from './IndexedDBFileSystem.js'; // Assuming path is correct
import { getOutline } from './OutlineService.js';
import { beginStory, continueStory, endStory } from './StoryGenerator.js'; // Assuming unused continue/end for Start.vue
import { getChoice, mergeStory, getChoiceId } from './ChoiceManager.js'; // Assuming unused getChoiceId for Start.vue
import { generateVoice } from './voiceGenerator.js';
import { getAllPersonsImagesJS, getPlacesImagesJS, getTitleImagesJS } from './ImageGenerationService.js'; // Renamed exports used
import {gettoken, generateBackgroundMusic, generateEndMusic } from './aimusicService.js'; // Assuming unused endMusic for Start.vue

// Helper to load config from localStorage
function loadConfig() {
    try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        if (!configStr) {
            console.warn("aiGalgameConfig not found in localStorage. Returning empty object.");
            return {};
        }
        return JSON.parse(configStr) || {};
    } catch (error) {
        console.error("Failed to parse aiGalgameConfig from localStorage:", error);
        return {}; // Return empty object on error
    }
}

export function useStoryGenerator() {
    const isLoading = ref(false);
    const progressLog = ref([]); // Use an array for a log

    // Function to update status (appends to log)
    const updateStatus = (message) => {
        console.log("Status Update:", message);
        progressLog.value.push(`[${new Date().toLocaleTimeString()}] ${message}`);
        // Optional: Keep log size manageable
        // if (progressLog.value.length > 50) {
        //     progressLog.value.shift();
        // }
    };

    /**
     * Generates a new story from scratch. Equivalent to Python's main().
     * All core tasks are awaited. Background tasks run concurrently without waiting.
     */
    const generateNewStory = async () => {
        if (isLoading.value) return 'busy';
        isLoading.value = true;
        progressLog.value = []; // Clear log
        updateStatus('开始生成新故事...');
        const startTime = performance.now();

        try {
            let config = loadConfig(); // Load initial config
            const coreTasks = [];
            // --- Outline Generation (Sequential) ---
            updateStatus('正在生成大纲...');
            const outlineResult = await getOutline(); // Assumes getOutline updates config internally if needed
            if (outlineResult !== 'success') {
                 throw new Error('大纲生成失败');
            }
            // --- Reload config AFTER outline to get story_title ---
            config = loadConfig();
            const storyTitle = config?.剧情?.story_title;
            if (!storyTitle) {
                throw new Error("未能从配置中获取 story_title");
            }
            updateStatus(`获取到故事标题: ${storyTitle}`);
            await idbFs.writeFile('/data/source/title.txt',storyTitle);
            //coreTasks.push(gettoken('music'));
            // --- Concurrent Tasks (Not Awaited in Main Flow) ---
            // These run in the background. Errors are logged but don't stop the primary flow immediately.
            //updateStatus('启动并发任务(角色图, 背景音乐，标题图)...');
            coreTasks.push(getAllPersonsImagesJS(updateStatus).catch(e => {
                console.error('后台任务失败 - 角色图像生成:', e);
                updateStatus(`警告: 角色图像生成失败 - ${e.message}`);
            }));

            if (config?.AI音乐?.if_on === true) {
                coreTasks.push(generateBackgroundMusic(updateStatus).catch(e => {
                    console.error('后台任务失败 - 背景音乐生成:', e);
                    updateStatus(`警告: 背景音乐生成失败 - ${e.message}`);
                }));
            } else {
                updateStatus("背景音乐已禁用 (配置)。");
            }
            
            coreTasks.push(getTitleImagesJS(0,updateStatus).catch(e => {
                console.error('后台任务失败 - 标题图片生成:', e);
                updateStatus(`警告: 标题图像生成失败 - ${e.message}`);
            }));

            // --- Story Generation (Sequential) ---
            updateStatus('正在生成故事开篇...');
            const beginResult = await beginStory();
             if (!beginResult || typeof beginResult !== 'string' || beginResult.toLowerCase().includes('fail')) {
                // Handle potential error messages from beginStory
                 throw new Error(`故事开篇生成失败: ${beginResult || '未知错误'}`);
             }
            updateStatus('故事开篇完成.');

            //updateStatus('正在合并初始故事...');
            await mergeStory("0"); // Merge the initial story part
            //updateStatus('初始故事合并完成.');

            // --- Concurrent Tasks (Awaited via Promise.all) ---
            //updateStatus('启动并发任务 (语音, 选项, 地点图)...');
            

            coreTasks.push(generateVoice("0", updateStatus).catch(e => { throw new Error(`语音生成(0)失败: ${e.message}`) }));
            coreTasks.push(getChoice("0").catch(e => { throw new Error(`选项生成(0)失败: ${e.message}`) }));
            coreTasks.push(getPlacesImagesJS(0, updateStatus).catch(e => { throw new Error(`地点图像生成失败: ${e.message}`) }));

            //updateStatus('等待任务完成...');
            await Promise.all(coreTasks); // Wait for voice, choice, places images
            updateStatus('任务完成.');

            // --- Final Success ---
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);
            updateStatus(`新故事生成成功！总用时: ${duration}秒`);
            isLoading.value = false;
            return 'success';

        } catch (error) {
            console.error("generateNewStory 发生错误:", error);
            updateStatus(`错误: ${error.message}`);
            isLoading.value = false;
            return 'error';
        }
    };

    /**
     * Prepares a story from local files, assuming zw marker exists. Equivalent to Python's localstory().
     * All tasks are awaited.
     */
    const generateLocalStory = async () => {
        if (isLoading.value) return 'busy';
        isLoading.value = true;
        progressLog.value = []; // Clear log
        updateStatus('开始准备本地故事...');
        const startTime = performance.now();

        try {
            const config = loadConfig();
            const coreTasks = [];
            const storyTitle = config?.剧情?.story_title;
            if (!storyTitle) {
                throw new Error("未能从配置中获取 story_title");
            }
            updateStatus(`获取到故事标题: ${storyTitle}`);
            const storyJsonPath = `/data/${storyTitle}/story/0.json`;
            const zwPath = `/data/${storyTitle}/zw`;
            // --- Process story/0.json ---
            updateStatus(`正在读取故事文件 ${storyJsonPath}...`);
            let storyData;
            try {
                storyData = await idbFs.readFile(storyJsonPath);
            } catch (e) {
                 throw new Error(`读取初始故事文件失败 (${storyJsonPath}): ${e.message}`);
            }

            if (!storyData || !Array.isArray(storyData.conversations)) {
                throw new Error(`故事文件 ${storyJsonPath} 格式无效或缺少 conversations`);
            }
            //coreTasks.push(gettoken('music'));
            updateStatus('正在处理故事文件 (添加ID, 清理地点)...');
            let previousPlace = null;
            storyData.conversations = storyData.conversations.map((conv, index) => {
                 const currentPlace = conv.place || ""; // Ensure place exists
                 let processedPlace = currentPlace;
                 if (currentPlace === previousPlace && currentPlace !== "") {
                    processedPlace = ""; // Clear duplicate place
                 } else if (currentPlace !== "") {
                    previousPlace = currentPlace; // Update last valid place
                 }
                 return { ...conv, id: index + 1, place: processedPlace }; // Add ID starting from 1
            });

            updateStatus('正在写回处理后的故事文件...');
            try {
                 await idbFs.writeFile(storyJsonPath, storyData);
            } catch (e) {
                 throw new Error(`写回故事文件失败 (${storyJsonPath}): ${e.message}`);
            }

            // --- Merge Story ---
            //updateStatus('正在合并故事...');
            await mergeStory("0");
            //updateStatus('故事合并完成.');

            // --- Concurrent Tasks (Awaited via Promise.all) ---
            //updateStatus('启动并发任务 (语音, 选项, 角色图, 地点图)...');
            

            coreTasks.push(generateVoice("0", updateStatus).catch(e => { throw new Error(`语音生成(0)失败: ${e.message}`) }));
            coreTasks.push(getChoice("0").catch(e => { throw new Error(`选项生成(0)失败: ${e.message}`) }));
            coreTasks.push(getAllPersonsImagesJS(updateStatus).catch(e => { throw new Error(`角色图像生成失败: ${e.message}`) }));
            coreTasks.push(getPlacesImagesJS(0, updateStatus).catch(e => { throw new Error(`地点图像生成失败: ${e.message}`) }));

            updateStatus('等待任务完成...');
            await Promise.all(coreTasks);
            updateStatus('任务完成.');

            // --- Remove Marker File ---
            updateStatus(`正在删除标记文件 ${zwPath}...`);
            try {
                await idbFs.deletePath(zwPath);
                updateStatus('标记文件删除成功.');
            } catch (e) {
                 // Log warning but don't fail the whole process if marker deletion fails
                 console.warn(`删除标记文件 ${zwPath} 失败: ${e.message}`);
                 updateStatus(`警告: 删除标记文件 ${zwPath} 失败: ${e.message}`);
            }

            // --- Final Success ---
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);
            updateStatus(`本地故事准备完成！总用时: ${duration}秒`);
            isLoading.value = false;
            return 'success';

        } catch (error) {
            console.error("generateLocalStory 发生错误:", error);
            updateStatus(`错误: ${error.message}`);
            isLoading.value = false;
            return 'error';
        }
    };

    return {
        isLoading,
        progressLog,
        generateNewStory,
        generateLocalStory
    };
}