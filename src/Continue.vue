<template>
  <div>
    <h1>Task Monitor</h1>
    <p>Status: {{ status }}</p>
    <p v-if="errorMessage">Last Error: {{ errorMessage }}</p>
    <p v-if="currentTitle">Monitoring Title: <strong>{{ currentTitle }}</strong></p>
    <p v-else>Waiting for title file...</p>
     <p v-if="isProcessing" style="color: orange;">Working...</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as idbFs from './components/services/IndexedDBFileSystem'; // Adjust path if needed
import { useApiEndpoints } from './components/services/useStoryContinue'; // Adjust path if needed

// --- Reactive State ---
const status = ref('Initializing...'); // Overall status for UI display
const currentTitle = ref(null);       // Loaded from /data/source/title.txt
const errorMessage = ref('');         // Stores the last error message
const isProcessing = ref(false);      // Lock to prevent concurrent tasks
const monitorInterval = ref(null);    // Holds the interval ID for cleanup
const titleFilePath = '/data/source/title.txt';
const POLLING_INTERVAL = 1000; // Check every 1 second

// --- API Endpoints ---
const api = useApiEndpoints();

// --- Helper Functions ---

/**
 * Updates the status and optionally clears/sets the error message.
 * @param {string} newStatus - The new status message.
 * @param {Error | string | null} error - Optional error object or message.
 */
const updateStatus = (newStatus, error = null) => {
    console.log(`Status update: ${newStatus}`, error ? `Error: ${error}` : '');
    status.value = newStatus;
    errorMessage.value = error ? String(error.message || error) : '';
};

/**
 * Safely writes content to a file, handling errors and updating status.
 * @param {string} path - The file path in idbFs.
 * @param {string} content - The content to write.
 * @returns {Promise<boolean>} - True if write was successful, false otherwise.
 */
const safeWriteFile = async (path, content) => {
    try {
        await idbFs.writeFile(path, content);
        console.log(`Successfully wrote "${content}" to ${path}`);
        return true;
    } catch (err) {
        console.error(`Failed to write "${content}" to ${path}:`, err);
        // Don't update global status here, let the caller decide context
        // updateStatus(`Error: Failed writing to ${path}`, err);
        errorMessage.value = `Failed writing "${content}" to ${path}: ${err.message}`;
        return false;
    }
};

/**
 * Safely deletes a file, handling errors (especially "not found").
 * @param {string} path - The file path in idbFs.
 * @returns {Promise<boolean>} - True if deletion was successful or file was already gone, false otherwise.
 */
const safeDeleteFile = async (path) => {
    try {
        await idbFs.deletePath(path);
        console.log(`Successfully deleted ${path}`);
        return true;
    } catch (err) {
        // Check if the error is "file not found" - this might be okay.
        // Note: Error message might vary based on IndexedDBFileSystem implementation detail
        if (err.message?.includes('不存在') || err.message?.toLowerCase().includes('not found') || err.message?.toLowerCase().includes('failed to execute \'delete\'')) {
             console.warn(`Attempted to delete ${path}, but it might have been already gone or deletion failed non-critically.`);
             return true; // Consider it successful enough if it's already gone or deletion failed non-critically
        }
        console.error(`Failed to delete ${path}:`, err);
        errorMessage.value = `Failed deleting ${path}: ${err.message}`;
        return false; // Indicate a more serious deletion failure
    }
};

// --- Core Task Processing Logic ---

/**
 * Handles the entire task flow triggered by continue.txt content.
 * @param {string} content - The validated, non-empty content of continue.txt.
 */
const processTask = async (content) => {
    if (isProcessing.value) {
        console.warn("processTask called while already processing. Ignoring.");
        return;
    }

    isProcessing.value = true; // Acquire lock
    updateStatus('Starting Task');
    const continueFilePath = `/data/${currentTitle.value}/continue.txt`;
    const statusFilePath = `/data/${currentTitle.value}/status.txt`;
    let story_id = null;
    let taskType = 'continue'; // Default type ('continue' or 'end')
    let success = false; // Track overall success for final status update

    try {
        // 1. Write 'start' to status.txt
        if (!await safeWriteFile(statusFilePath, 'start')) {
             updateStatus('Error: Failed to write start status. Aborting task.', errorMessage.value);
             // We failed before even starting the core logic, don't delete continue.txt yet.
             isProcessing.value = false; // Release lock
             return;
        }

        content = content.trim();
        const isNumeric = !isNaN(parseFloat(content)) && isFinite(content);
        const isABFormat = content.includes('-');

        let generationPromise;

        // 2. Determine action based on content and call generation API
        if (isNumeric) {
            const id = parseFloat(content);
            taskType = 'continue';
            updateStatus(`Generating Text (ID: ${id})...`);
            generationPromise = api.callTextGeneration('none', id);
        } else if (isABFormat) {
            const parts = content.split('-');
            // Handle potential multiple hyphens in b: use slice(1).join('-')
            const a = parts[0]?.trim();
            const b = parts.slice(1).join('-')?.trim();

            if (!a || b === undefined || b === null) { // Basic validation
                throw new Error(`Invalid a-b format: a='${a}', b='${b}'`);
            }

            if (b === '结束游戏') {
                taskType = 'end';
                updateStatus(`Generating End Sequence (ID: ${a})...`);
                generationPromise = api.callEndGeneration(a);
            } else {
                taskType = 'continue';
                updateStatus(`Generating Text (Choice: ${a} -> ${b})...`);
                generationPromise = api.callTextGeneration(a, b);
            }
        } else {
            // Invalid format
            updateStatus('Error: Invalid content format in continue.txt', `Content: "${content}"`);
            await safeWriteFile(statusFilePath, 'error_invalid_format'); // Write specific error status
            await safeDeleteFile(continueFilePath); // Delete invalid trigger file
            isProcessing.value = false; // Release lock
            return;
        }

        // 3. Await generation result and handle success/failure
        const generationResult = await generationPromise;

        if (generationResult.status === 'error') {
            updateStatus('Error: Text Generation Failed', generationResult.message);
            await safeWriteFile(statusFilePath, 'text_fail');
            await safeDeleteFile(continueFilePath); // Delete on failure
            isProcessing.value = false; // Release lock
            return;
        }

        // --- Generation Success ---
        story_id = generationResult.story_id;
        if (!await safeWriteFile(statusFilePath, `text_success:${story_id}`)) {
             updateStatus('Error: Failed to write text_success status. Continuing cleanup.', errorMessage.value);
             // Continue the process even if status write fails, but log it.
        }
        updateStatus(`Text Generation Success (Story ID: ${story_id}). Running post-tasks...`);

        // 4. Fire-and-forget NoJoinTasks
        api.callNoJoinTasks(story_id, taskType)
           .then(result => {
               if (result.status === 'success') {
                   console.log(`Successfully initiated NoJoinTasks (Type: ${taskType}, StoryID: ${story_id})`);
               } else {
                   // Log non-blocking error
                   console.error(`Failed to initiate NoJoinTasks (Type: ${taskType}, StoryID: ${story_id}):`, result.message);
               }
           })
           .catch(err => {
                // Log non-blocking error
               console.error(`Error initiating NoJoinTasks (Type: ${taskType}, StoryID: ${story_id}):`, err);
           });

        // 5. Wait for JoinTasks
        updateStatus(`Waiting for JoinTasks (Type: ${taskType}, StoryID: ${story_id})...`);
        let joinSuccess = false;
        try {
            const joinResult = await api.callJoinTasks(story_id, taskType);
            if (joinResult.status === 'success') {
                console.log(`JoinTasks completed successfully (Type: ${taskType}, StoryID: ${story_id})`);
                joinSuccess = true; // Mark join as successful
            } else {
                console.warn(`JoinTasks failed (Type: ${taskType}, StoryID: ${story_id}):`, joinResult.message);
                errorMessage.value = `JoinTasks failed: ${joinResult.message}`; // Record the failure reason
            }
        } catch (err) {
            console.error(`Error during callJoinTasks (Type: ${taskType}, StoryID: ${story_id}):`, err);
            errorMessage.value = `Error in JoinTasks: ${err.message}`; // Record the failure reason
        }

        // 6. Final steps (regardless of join tasks success/failure)
        updateStatus('Finalizing Task...');
        if (!await safeWriteFile(statusFilePath, `end:${story_id}`)) {
            updateStatus('Error: Failed to write end status. Cleanup may be incomplete.', errorMessage.value);
             // Log error, but proceed to delete continue.txt
        }
        if (!await safeDeleteFile(continueFilePath)) {
             updateStatus('Error: Failed to delete continue.txt after task completion.', errorMessage.value);
             // Log error, task is conceptually done but cleanup failed.
        }

        // Update final UI status based on whether join tasks succeeded
        success = joinSuccess; // Overall success depends on join tasks completing without error reports
        updateStatus(success ? 'Task Completed Successfully. Monitoring...' : 'Task Completed (Join Tasks had issues). Monitoring...');


    } catch (error) {
        // Catch unexpected errors during the main process flow
        console.error("Unhandled error during processTask:", error);
        updateStatus('Critical Error during processing', error);
        // Attempt cleanup even on unexpected error
        await safeWriteFile(statusFilePath, 'error_unexpected'); // Specific status
        await safeDeleteFile(continueFilePath); // Try to delete continue.txt
    } finally {
        isProcessing.value = false; // Release lock in all cases
        console.log("Processing finished. Lock released.");
    }
};


// --- File Monitoring Logic ---

/**
 * Checks the continue.txt file existence and content.
 */
const checkContinueFile = async () => {
    if (isProcessing.value || !currentTitle.value) {
        // console.log("Skipping check: Processing or title not loaded.");
        return; // Don't check if busy or title not loaded
    }

    const continueFilePath = `/data/${currentTitle.value}/continue.txt`;

    try {
        // Use getMetadata first - avoids readFile errors for non-existent files
        const metadata = await idbFs.getMetadata(continueFilePath);

        if (!metadata.exists) {
            // File doesn't exist. If status was something else, reset to Idle/Monitoring.
            if (!status.value.startsWith('Monitoring') && !status.value.startsWith('Idle') && !status.value.startsWith('Task Completed') && !isProcessing.value) {
                updateStatus('Monitoring...');
            }
            return;
        }

        // File exists, now read content
        const content = await idbFs.readFile(continueFilePath);
        const trimmedContent = content ? String(content).trim() : '';

        if (trimmedContent === '') {
            // File exists but is empty, treat as not ready. Reset status if needed.
             if (!status.value.startsWith('Monitoring') && !status.value.startsWith('Idle') && !status.value.startsWith('Task Completed') && !isProcessing.value) {
                 updateStatus('Idle (continue.txt empty)');
             }
            return;
        }

        // File exists and has valid content, trigger processing
        console.log(`Found valid trigger in ${continueFilePath}. Content: "${trimmedContent}"`);
        await processTask(trimmedContent); // Pass content to the processing function

    } catch (error) {
        // Handle errors during check (e.g., file system error)
        // Avoid logging "not found" repeatedly as it's handled by metadata.
        if (!(error.message?.includes('不存在') || error.message?.toLowerCase().includes('not found'))) {
             console.error("Error checking continue file:", error);
             updateStatus('Error checking file system', error);
             // Consider pausing monitoring temporarily if FS errors persist
        } else {
            // File not found error during readFile (should be rare after metadata check, but handle defensively)
            if (!status.value.startsWith('Monitoring') && !status.value.startsWith('Idle') && !status.value.startsWith('Task Completed') && !isProcessing.value) {
                 updateStatus('Monitoring...');
            }
        }
    }
};

// --- Initialization Logic ---

/**
 * Loads the title from the specified file path.
 */
const loadTitle = async () => {
     try {
         const titleContent = await idbFs.readFile(titleFilePath);
         const trimmedTitle = titleContent ? String(titleContent).trim() : null;
         if (trimmedTitle) {
             currentTitle.value = trimmedTitle;
             updateStatus('Monitoring...'); // Ready to monitor
             return true;
         } else {
             updateStatus('Error: title.txt is empty or invalid.');
             return false;
         }
     } catch (error) {
          console.error(`Failed to load title from ${titleFilePath}:`, error);
          updateStatus(`Error: Failed to load ${titleFilePath}`, error);
          return false; // Cannot proceed without title
     }
};

// --- Lifecycle Hooks ---
onMounted(async () => {
    updateStatus('Initializing...');
    const titleLoaded = await loadTitle();

    if (titleLoaded && currentTitle.value) {
        // Start monitoring only if title was loaded successfully
        console.log(`Starting monitor for title: ${currentTitle.value}`);
        monitorInterval.value = setInterval(checkContinueFile, POLLING_INTERVAL);
        // Perform an initial check immediately after starting
        checkContinueFile();
    } else {
         console.error("Monitoring cannot start: Title not loaded.");
         // Status already reflects the title loading error
    }
});

onUnmounted(() => {
    if (monitorInterval.value) {
        clearInterval(monitorInterval.value);
        console.log("Monitor interval cleared.");
    }
    updateStatus('Monitor stopped.');
});

</script>

<style scoped>
/* Add simple styling if desired */
div {
    font-family: sans-serif;
    padding: 15px;
    margin: 10px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background-color: #f8f9fa;
    max-width: 500px;
}
h1 {
    margin-top: 0;
    font-size: 1.5em;
    color: #333;
}
p {
    margin: 8px 0;
    line-height: 1.4;
    color: #555;
}
strong {
    color: #0056b3;
}
</style>