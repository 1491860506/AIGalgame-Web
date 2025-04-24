// ImageGenerationService.js (Add or Modify ImageProcessor section)

// Ensure the worker file path is correct relative to your built application
const IMAGE_PROCESSING_WORKER_URL = new URL('./image-processing.worker.js', import.meta.url);

// Simple Worker pool (optional but recommended for performance if tasks are frequent)
// For simplicity here, we'll create a new worker per task.
// A pool would manage N workers and a queue of tasks.

// Wrapper function to handle sending a task to a worker and getting a promise result
async function runWorkerTask(method, imageFile, params = {}) {
    return new Promise(async (resolve, reject) => {
        // 1. Load image data in the main thread (cannot do this in Worker)
        let imageData = null;
        let imgWidth = 0;
        let imgHeight = 0;
        try {
            // createImageFromFile and fileToImageData are helper functions that use DOM/Canvas
            const img = await createImageFromFile(imageFile);
            imgWidth = img.width;
            imgHeight = img.height;
            const canvas = document.createElement('canvas');
            canvas.width = imgWidth;
            canvas.height = imgHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            imageData = ctx.getImageData(0, 0, imgWidth, imgHeight);
        } catch (error) {
            console.error(`[Main] Failed to load image data for worker task "${method}":`, error);
            return reject(new Error(`Failed to load image data: ${error.message}`));
        }


        // 2. Create a new Worker instance for this task
        // In a real app, you'd manage a pool of workers instead.
        const worker = new Worker(IMAGE_PROCESSING_WORKER_URL, { type: 'module' });
        const taskId = Date.now() + '-' + Math.random(); // Unique ID for this task instance

        let timeoutId = null; // Optional: Implement timeout for the worker task itself

        // Set up listeners
        worker.onmessage = (event) => {
            const { id, status, method: responseMethod, error, ...responseData } = event.data;

            if (id !== taskId) {
                // Ignore messages not for this task ID (if using a pool)
                console.warn(`[Main] Received message for unknown task ID: ${id}`);
                return;
            }

            // clearTimeout(timeoutId); // Clear timeout if implemented

            if (status === 'success') {
                console.debug(`[Main] Worker task "${responseMethod}" (${id}) successful.`);
                if (responseMethod === 'resize_image_strategy') {
                    // Handle resize result: Draw raw pixel data onto canvas and get Blob
                    const { data: resizedData, width: resizedWidth, height: resizedHeight } = responseData;
                    const outputCanvas = document.createElement('canvas');
                    outputCanvas.width = resizedWidth;
                    outputCanvas.height = resizedHeight;
                    const outputCtx = outputCanvas.getContext('2d');
                    // putImageData takes Uint8ClampedArray
                    const outputImageData = new ImageData(resizedData, resizedWidth, resizedHeight);
                    outputCtx.putImageData(outputImageData, 0, 0);

                    outputCanvas.toBlob(blob => {
                        if (blob) {
                            console.debug(`[Main] Successfully created blob for resized image (${id}).`);
                            resolve(blob);
                        } else {
                            console.error(`[Main] Failed to create blob from canvas for resized image (${id}).`);
                            reject(new Error("Failed to create resized image Blob"));
                        }
                         worker.terminate(); // Task done, terminate worker
                    }, imageFile.type || 'image/png'); // Use original file type or default
                } else {
                    // Handle quality assessment results (scores)
                     console.debug(`[Main] Received score result for ${responseMethod} (${id}):`, responseData.score);
                    resolve(responseData.score);
                     worker.terminate(); // Task done, terminate worker
                }
            } else if (status === 'error') {
                console.error(`[Main] Worker task "${responseMethod}" (${id}) failed:`, error?.message || 'Unknown error');
                // Reject the promise with the error information
                reject(new Error(`Worker error in "${responseMethod}": ${error?.message || 'Unknown error'}`));
                 worker.terminate(); // Task failed, terminate worker
            } else {
                 console.warn(`[Main] Worker task "${method}" (${id}) sent unknown status: "${status}"`);
                 reject(new Error(`Worker returned unknown status: ${status}`));
                  worker.terminate();
            }
        };

        // Handle worker errors (e.g. script loading errors, uncaught exceptions)
        worker.onerror = (error) => {
            // clearTimeout(timeoutId); // Clear timeout if implemented
            console.error(`[Main] Uncaught error in worker for task "${method}" (${taskId}):`, error);
            // Prevent double rejection if onmessage also reported an error
            reject(new Error(`Worker encountered an error: ${error.message}`));
             worker.terminate(); // Terminate on uncaught error
        };

         // Optional: Implement timeout
         // timeoutId = setTimeout(() => {
         //      console.error(`[Main] Worker task "${method}" (${taskId}) timed out.`);
         //      worker.terminate(); // Terminate the worker
         //      reject(new Error(`Worker task "${method}" timed out`));
         // }, 60000); // Example: 60 seconds timeout


        // 3. Send the task to the Worker
        // Transfer the pixel data's ArrayBuffer for efficiency
        worker.postMessage({
            id: taskId,
            method: method,
            imageData: imageData.data, // Pass the Uint8ClampedArray
            width: imgWidth,
            height: imgHeight,
            params: params // Pass method-specific parameters
        }, [imageData.data.buffer]); // Transfer the underlying ArrayBuffer

    }); // End of Promise
}

/**
 * Method A - Edge-based image quality assessment (Worker Wrapper)
 * @param {File|Blob} imageFile - The image file object
 * @param {number} targetWidth - Target width for reference (passed to worker params)
 * @param {number} targetHeight - Target height for reference (passed to worker params)
 * @param {string} strategy - Strategy to use (passed to worker params)
 * @returns {Promise<number>} Quality score (0-100)
 */
async function method_a(imageFile, targetWidth, targetHeight, strategy) {
    console.debug("Offloading method_a to worker...");
    try {
        // targetWidth, targetHeight, strategy are not directly used in method_a_worker
        // but keep the signature for consistency with original, pass dummy params if needed
        const score = await runWorkerTask('method_a', imageFile, {
             targetWidth, targetHeight, strategy // Pass through if worker needs them for context
        });
        // runWorkerTask resolves with the score (number) or rejects with error
        return score;
    } catch (error) {
        console.error("Method A worker failed:", error);
        // Decide how to handle worker errors in ImageProcessor. Returning 0 or re-throwing.
        // Re-throwing is better to signal failure upwards.
        throw error;
    }
}

/**
 * Method B - Sobel-based image quality assessment (Worker Wrapper)
 * @param {File|Blob} imageFile - The image file object
 * @param {number} targetWidth - Target width for reference
 * @param {number} targetHeight - Target height for reference
 * @param {string} strategy - Strategy to use
 * @returns {Promise<number>} Quality score (0-100)
 */
async function method_b(imageFile, targetWidth, targetHeight, strategy) {
     console.debug("Offloading method_b to worker...");
     try {
         const score = await runWorkerTask('method_b', imageFile, {
              targetWidth, targetHeight, strategy
         });
         return score;
     } catch (error) {
         console.error("Method B worker failed:", error);
         throw error;
     }
}

/**
 * Method C - Laplacian-based image quality assessment (Worker Wrapper)
 * @param {File|Blob} imageFile - The image file object
 * @param {number} targetWidth - Target width for reference
 * @param {number} targetHeight - Target height for reference
 * @param {string} strategy - Strategy to use
 * @returns {Promise<number>} Quality score (0-100)
 */
async function method_c(imageFile, targetWidth, targetHeight, strategy) {
     console.debug("Offloading method_c to worker...");
     try {
         const score = await runWorkerTask('method_c', imageFile, {
              targetWidth, targetHeight, strategy
         });
         return score;
     } catch (error) {
         console.error("Method C worker failed:", error);
         throw error;
     }
}

/**
 * Resize Image Strategy (Worker Wrapper)
 * @param {File|Blob} imageFile - The image file object
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @param {string} strategy - 'crop', 'pad', or 'stretch'
 * @returns {Promise<Blob>} - The processed image as a Blob
 */
async function resize_image_strategy(imageFile, targetWidth, targetHeight, strategy) {
     console.debug("Offloading resize_image_strategy to worker...");
     try {
         const resizedBlob = await runWorkerTask('resize_image_strategy', imageFile, {
             targetWidth,
             targetHeight,
             strategy
         });
         // runWorkerTask for resize resolves with the final Blob
         return resizedBlob;
     } catch (error) {
         console.error("Resize worker failed:", error);
         throw error; // Re-throw the error to be handled upstream (e.g., in generateImageTask)
     }
}


// --- Helper Functions (Keep in Main Thread) ---
// These functions REQUIRE access to DOM/Canvas APIs

/**
 * Convert File to ImageData (Uses DOM/Canvas)
 * @param {File|Blob} file - Image file
 * @returns {Promise<ImageData>} - Image data
 */
async function fileToImageData(file) {
    // This implementation is correct for the main thread
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(ctx.getImageData(0, 0, img.width, img.height));
          };
          img.onerror = () => reject(new Error("Failed to load image for ImageData conversion"));
          img.src = e.target.result;
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (e) => reject(new Error(`Failed to read file: ${e.target?.error?.message}`));
      reader.readAsDataURL(file);
    });
}

/**
 * Create Image from File (Uses DOM)
 * @param {File|Blob} file - Image file
 * @returns {Promise<HTMLImageElement>} - HTML Image element
 */
async function createImageFromFile(file) {
     // This implementation is correct for the main thread
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = (e) => {
         const img = new Image();
         img.onload = () => resolve(img);
         img.onerror = () => reject(new Error("Failed to load image for HTMLImageElement"));
         img.src = e.target.result;
       };
       reader.onerror = (e) => reject(new Error(`Failed to read file for image element: ${e.target?.error?.message}`));
       reader.readAsDataURL(file);
     });
}

// --- Other Helper Functions (Can be moved to Worker or duplicated if needed by both) ---
// preprocessImage - Used only by b/c in original, can be adapted for worker or kept in main if needed elsewhere.
//                     Since we convert to grayscale in the worker now, preprocessImage is probably not needed in main.
// computeVariance - Used by method_a in original. Moved to worker as computeVarianceWorker.
// computeLocalVariance - Used by method_a in original. Moved to worker as computeLocalVarianceWorker.
// calculatePercentile - Used by method_a in original. Moved to worker as calculatePercentileWorker.
// applyGaussianBlur - Not used by a,b,c directly. If not used elsewhere, remove. If used, move to worker if CPU-heavy.
// computeLaplacian - Used by method_c in original (or a variant). Moved to worker as computeModifiedLaplacianWorker helpers.

// Ensure the exported functions from this file are correct for the main application
export {
    // ... other exports like runMainProcess, getAllPersonsImagesJS, etc. ...
    // Export the wrappers that use the worker:
    method_a,
    method_b,
    method_c,
    resize_image_strategy,
    // Keep main-thread helpers if they are used elsewhere in main thread code:
     createImageFromFile, // Might be used elsewhere
     fileToImageData // Might be used elsewhere
};