// src/composables/useApiEndpoints.js
import { ref } from 'vue';
import * as idbFs from './IndexedDBFileSystem.js'; // Assuming path is correct
import { continueStory, endStory } from './StoryGenerator.js';
import { getChoice, mergeStory, getChoiceId } from './ChoiceManager.js';
import { generateVoice } from './voiceGenerator.js';
import { getPlacesImagesJS } from './ImageGenerationService.js';
import { generateEndMusic, gettoken } from './aimusicService.js';

// Helper function similar to the one in useStoryGenerator
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

export function useApiEndpoints() {
    // Optional: Add refs for loading state or logs if needed for UI feedback
    // const isProcessing = ref(false);
    // const apiLog = ref([]);
    // const updateLog = (message) => apiLog.value.push(`[${new Date().toLocaleTimeString()}] ${message}`);

    /**
     * ① 调用文本生成 (Equivalent to core part of story_continue)
     * No check for existing file. Returns new story_id on success.
     * Does NOT wait for background tasks like voice/image/choice generation.
     */
    const callTextGeneration = async (story_id, answer) => {
        // updateLog(`API callTextGeneration received: story_id=${story_id}, answer=${answer}`);
        // isProcessing.value = true; // Example state management
        try {
            if (!story_id || answer === undefined || answer === null) {
                throw new Error("Missing required parameters: story_id or answer");
            }

            // 1. Calculate the next story ID
            const new_story_id = await getChoiceId(story_id, answer);
            if (!new_story_id && new_story_id !== 0) { // Check if getChoiceId failed
                throw new Error(`Failed to calculate next story_id from ${story_id} with answer "${answer}"`);
            }
            // updateLog(`Calculated new story_id: ${new_story_id}`);
            await mergeStory(new_story_id);
            // 2. Call continue_story
            // updateLog(`Calling continueStory with answer: ${answer}, new_story_id: ${new_story_id}`);
            const continueResult = await continueStory(answer, new_story_id);
             // Assuming continueStory returns a success indicator or throws on error
            if (typeof continueResult === 'string' && continueResult.toLowerCase().includes('fail')) {
                throw new Error(`continueStory failed: ${continueResult}`);
            }
            // updateLog(`continueStory completed.`);

             // 3. Merge story after generation
            // updateLog(`Merging story for new_story_id: ${new_story_id}`);
            await mergeStory(new_story_id);
            // updateLog(`Merge story completed.`);

            // isProcessing.value = false; // Example state management
            // updateLog(`API callTextGeneration success. Returning new story_id: ${new_story_id}`);
            return { status: 'success', story_id: new_story_id };

        } catch (error) {
            console.error("Error in callTextGeneration:", error);
            // updateLog(`Error in callTextGeneration: ${error.message}`);
            // isProcessing.value = false; // Example state management
            return { status: 'error', message: error.message || 'Unknown error during text generation' };
        }
    };

    /**
     * ② 后续需要等待完成的任务 (Equivalent to thread.join)
     * continue: getchoice, get_places_images
     * end: generate_end_music (if enabled), get_places_images
     */
    const callJoinTasks = async (story_id, type) => { // type is 'continue' or 'end'
        // updateLog(`API callJoinTasks received: story_id=${story_id}, type=${type}`);
        // isProcessing.value = true; // Example state management
        try {
            if (!story_id || !type) {
                throw new Error("Missing required parameters: story_id or type ('continue'/'end')");
            }
            const config = loadConfig();
            const tasks = [];
            // updateLog(`Starting joinable tasks for story_id: ${story_id}, type: ${type}`);
            //gettoken('music'); // Assuming token needed before music tasks

            if (type === 'continue') {
                // Tasks to join for story_continue
                tasks.push(getChoice(story_id).catch(e => { throw new Error(`getChoice(${story_id}) failed: ${e.message}`) }));
                tasks.push(getPlacesImagesJS(0 /*, updateLog*/).catch(e => { throw new Error(`getPlacesImagesJS(${story_id}) failed: ${e.message}`) }));
                // updateLog(`Tasks added for 'continue': getChoice, getPlacesImagesJS`);
            } else if (type === 'end') {
                // Tasks to join for end
                const endMusicEnabled = config?.AI音乐?.ending_if_on === true;
                // updateLog(`Ending music enabled: ${endMusicEnabled}`);
                if (endMusicEnabled) {
                    tasks.push(generateEndMusic(story_id /*, updateLog*/).catch(e => { throw new Error(`generateEndMusic(${story_id}) failed: ${e.message}`) }));
                    // updateLog(`Task added for 'end': generateEndMusic`);
                }
                tasks.push(getPlacesImagesJS(0 /*, updateLog*/).catch(e => { throw new Error(`getPlacesImagesJS(${story_id}) failed: ${e.message}`) }));
                // updateLog(`Task added for 'end': getPlacesImagesJS`);
            } else {
                throw new Error(`Invalid type specified for callJoinTasks: ${type}`);
            }

            if (tasks.length > 0) {
                // updateLog(`Waiting for ${tasks.length} joinable tasks to complete...`);
                await Promise.all(tasks);
                // updateLog(`All joinable tasks completed.`);
            } else {
                // updateLog(`No joinable tasks to execute for type ${type}.`);
            }

            // isProcessing.value = false; // Example state management
            // updateLog(`API callJoinTasks success.`);
            return { status: 'success' };

        } catch (error) {
            console.error("Error in callJoinTasks:", error);
            // updateLog(`Error in callJoinTasks: ${error.message}`);
            // isProcessing.value = false; // Example state management
            return { status: 'error', message: error.message || 'Unknown error during joined tasks execution' };
        }
    };

    /**
     * ③ 后续不等待完成的任务 (Fire-and-forget, equivalent to non-joined threads)
     * Always getvoice for both 'continue' and 'end'.
     */
    const callNoJoinTasks = async (story_id, type) => { // type is 'continue' or 'end'
        // updateLog(`API callNoJoinTasks received: story_id=${story_id}, type=${type}`);
        // No isProcessing.value = true here, as we don't wait

        try {
            if (!story_id || !type) {
                 throw new Error("Missing required parameter: story_id or type ('continue'/'end')");
            }

            // The only non-joined task is generateVoice, regardless of type 'continue' or 'end'
            // updateLog(`Initiating non-joined task generateVoice for story_id: ${story_id}, type: ${type}`);
            generateVoice(story_id /*, updateLog*/) // Fire and forget
                .then(() => {
                    // updateLog(`Non-joined task generateVoice(${story_id}) completed successfully (in background).`);
                })
                .catch(e => {
                    console.error(`Non-joined task generateVoice(${story_id}) failed in background: ${e.message}`);
                    // updateLog(`Non-joined task generateVoice(${story_id}) failed: ${e.message}`);
                    // Optionally notify admin or log centrally
                });
            // updateLog(`Non-joined task generateVoice started.`);

            // Important: Return success immediately as this is fire-and-forget
            // updateLog(`API callNoJoinTasks initiated successfully.`);
            return { status: 'success' }; // Return success for the *initiation*

        } catch (error) { // Catch errors during the *initiation* phase only
            console.error("Error initiating callNoJoinTasks:", error);
            // updateLog(`Error initiating callNoJoinTasks: ${error.message}`);
            return { status: 'error', message: error.message || 'Unknown error initiating non-joined tasks' };
        }
    };

     /**
     * Handles the actual ending text generation process (core part of `end`).
     * Similar structure to callTextGeneration but calls endStory.
     * Does NOT include any background tasks.
     */
    const callEndGeneration = async (story_id) => {
        // updateLog(`API callEndGeneration received: story_id=${story_id}`);
        // isProcessing.value = true; // Example state management
        try {
            if (!story_id) {
                throw new Error("Missing required parameter: story_id");
            }

            // 1. Calculate the final story ID using a specific "end game" choice
            const end_story_id = await getChoiceId(story_id, "结束游戏"); // Using "结束游戏" as the end trigger
            if (!end_story_id && end_story_id !== 0) {
                throw new Error(`Failed to calculate end story_id from ${story_id}`);
            }
             // updateLog(`Calculated end story_id: ${end_story_id}`);

             // 2. Call end_story
             // updateLog(`Calling endStory with end_story_id: ${end_story_id}`);
             const endResult = await endStory(end_story_id);
             if (typeof endResult === 'string' && endResult.toLowerCase().includes('fail')) {
                 throw new Error(`endStory failed: ${endResult}`);
             }
             // updateLog(`endStory completed.`);

             // 3. Merge story after generation
             // updateLog(`Merging story for end_story_id: ${end_story_id}`);
             await mergeStory(end_story_id);
             // updateLog(`Merge story completed.`);

            // isProcessing.value = false; // Example state management
            // updateLog(`API callEndGeneration success. Returning end story_id: ${end_story_id}`);
             // Return the final ID, similar to callTextGeneration
             return { status: 'success', story_id: end_story_id };

        } catch (error) {
            console.error("Error in callEndGeneration:", error);
            // updateLog(`Error in callEndGeneration: ${error.message}`);
            // isProcessing.value = false; // Example state management
            return { status: 'error', message: error.message || 'Unknown error during end generation' };
        }
    };


    return {
        // isProcessing, // Expose if needed by UI
        // apiLog,       // Expose if needed by UI
        callTextGeneration,
        callJoinTasks,       // Executes tasks that need waiting
        callNoJoinTasks,     // Executes tasks that run in background
        callEndGeneration,
    };
}