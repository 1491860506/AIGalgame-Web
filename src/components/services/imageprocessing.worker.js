// imageprocessing.worker.js

// 导入 modern-rembg (如果 helpers 中也使用了，确保 modern-rembg 在 worker 中可用)
// import { removeBackground } from 'modern-rembg'; // 如果不需要，可以移除

// 复制或定义所有 ImageProcessor module 中的函数和其依赖的 Helper 函数到这里
// 包括:
// method_a, method_b, method_c, resize_image_strategy
// fileToImageData, createImageFromFile, preprocessImage, convertToGrayscale, applyGamma, resizeImageData, normalizeImage, computeSobelGradients, computeGradientMagnitude, computeVariance, computeLocalVariance, calculatePercentile, applyEdgePreservingBlur, computeModifiedLaplacian, extractROI, computeOtsu, computeRobustVariance, computeFrequencyDomainScore, computeBlockDCTEnergy, computeTextureDetails, computeLBP

// --- Start: Copy all original functions from ImageProcessor.js ---

/**
 * Method A - Edge-based image quality assessment
 * Corresponds to Python's method_a function
 *
 * @param {File|Blob} imageFile - The image file object
 * @param {number} targetWidth - Target width for reference
 * @param {number} targetHeight - Target height for reference
 * @param {string} strategy - Strategy to use
 * @returns {Promise<number>} Quality score (0-100)
 */
async function method_a(imageFile, targetWidth, targetHeight, strategy) {
    try {
      // Convert file to image data
      const imageData = await fileToImageData(imageFile);
      if (!imageData) {
        console.error("Failed to convert file to image data");
        return 0;
      }

      // Convert to grayscale
      const gray = convertToGrayscale(imageData);

      // Parameters
      const targetSize = [256, 256];
      const gamma = 0.8; // Gamma correction value

      // Apply gamma correction
      const gammaAdjusted = applyGamma(gray, gamma);

      // Resize to target size (need dimensions for resizeImageData)
      const sourceWidthA = imageData.width;
      const sourceHeightA = imageData.height;
      const resized = resizeImageData(gammaAdjusted, sourceWidthA, sourceHeightA, targetSize[0], targetSize[1]);

      // Normalize
      const normalized = normalizeImage(resized);
      const normalizedWidth = targetSize[0];
      const normalizedHeight = targetSize[1];

      // Compute Sobel gradients (need dimensions)
      const scaleRatio = 0.25;
      const [gradX, gradY] = computeSobelGradients(normalized, normalizedWidth, normalizedHeight, scaleRatio);

      // Compute gradient magnitude
      const gradientMagnitude = computeGradientMagnitude(gradX, gradY);

      // Calculate global variance
      const globalVar = computeVariance(normalized);
      const dynamicVarThreshold = Math.max(0.5, globalVar * 2);

      // Compute local variance using integral image method (simplified) (need dimensions)
      const kernelSize = 16;
      const localVar = computeLocalVariance(normalized, normalizedWidth, normalizedHeight, kernelSize);

      // Generate dynamic mask
      let mask = localVar.map(val => val > (dynamicVarThreshold / Math.pow(255.0, 2)));

      // Check minimum effective region
      const effectivePixels = mask.filter(Boolean).length;
      if (effectivePixels < 100) {
        mask = localVar.map(val => val > 0);
      }

      // Calculate masked gradient
      const maskedGradient = [];
      for (let i = 0; i < gradientMagnitude.length; i++) {
        if (mask[i]) {
          maskedGradient.push(gradientMagnitude[i]);
        }
      }

      // Calculate 90th percentile for sharpness score
      const sharpnessScore = calculatePercentile(maskedGradient, 90);

      // Normalize score
      const maxPossible = Math.sqrt(2 * Math.pow(1.0, 2));
      const normalizedScore = (sharpnessScore / maxPossible) * 100;

      return Math.min(Math.max(Math.round(normalizedScore), 0), 100);
    } catch (error) {
      console.error("Error in method_a:", error);
      return 0;
    }
  }

  /**
   * Method B - Sobel-based image quality assessment
   * Corresponds to Python's method_b function
   *
   * @param {File|Blob} imageFile - The image file object
   * @param {number} targetWidth - Target width for reference
   * @param {number} targetHeight - Target height for reference
   * @param {string} strategy - Strategy to use
   * @returns {Promise<number>} Quality score (0-100)
   */
  async function method_b(imageFile, targetWidth, targetHeight, strategy) {
    try {
      // Process image
      const { gray, width, height } = await preprocessImage(imageFile);

      // Compute Sobel gradients
      const [gx, gy] = computeSobelGradients(gray, width, height);

      // Calculate score
      let score = 0;
      for (let i = 0; i < gx.length; i++) {
        score += gx[i] * gx[i] + gy[i] * gy[i];
      }
      score = score / gx.length;

      // Define resolution baselines
      // NOTE: These baselines are empirical and might need tuning
      const resolutionBaselines = {
        '1024x1024': 350.0, // Character images
        '1080x1920': 550.0, // Background images
        '1920x1080': 550.0  // Background images (landscape)
      };

      // Get baseline based on actual image dimensions
      const key1 = `${width}x${height}`;
      const key2 = `${height}x${width}`; // Handle swapped dimensions
      const baseline = resolutionBaselines[key1] ||
                      resolutionBaselines[key2] ||
                      400.0; // Default baseline

      // Calculate final score
      const finalScore = Math.min(score / baseline * 100, 100); // Scale to 100

      return Math.round(finalScore);
    } catch (error) {
      console.error("Error in method_b:", error);
      return 0;
    }
  }

  /**
   * Method C - Laplacian-based image quality assessment
   * Corresponds to Python's method_c function
   *
   * @param {File|Blob} imageFile - The image file object
   * @param {number} targetWidth - Target width for reference
   * @param {number} targetHeight - Target height for reference
   * @param {string} strategy - Strategy to use
   * @returns {Promise<number>} Quality score (0-100)
   */
  async function method_c(imageFile, targetWidth, targetHeight, strategy) {
    try {
      // Process image
      const { gray, width, height } = await preprocessImage(imageFile);

      // Apply multi-scale analysis instead of just one scale
      const scales = [3, 5, 9]; // Multiple scales for more robust analysis
      let totalScore = 0;
      let scaleWeights = [0.5, 0.3, 0.2]; // Weights for each scale (smaller scales are more important)

      for (let i = 0; i < scales.length; i++) {
        const scale = scales[i];

        // Apply selective Gaussian blur (keep edges sharp)
        const blurred = applyEdgePreservingBlur(gray, width, height, scale);

        // Compute Laplacian response using improved operator
        const laplacian = computeModifiedLaplacian(blurred, width, height);

        // Compute statistics on region of interest
        const roi = extractROI(laplacian, width, height);

        // Compute normalized variance with outlier rejection
        const variance = computeRobustVariance(roi);

        // Calculate resolution scaling factor - higher resolution should have higher baseline
        const resolutionFactor = Math.sqrt((width * height) / (1024 * 1024));

        // Scale-specific baseline adjustment - these are empirical values
        const baselineAdjustment = (scale === 3) ? 1.0 : (scale === 5) ? 1.2 : 1.5;
        const scaledBaseline = 180 * resolutionFactor * baselineAdjustment;

        // Calculate and accumulate the weighted score for this scale
        const scaleScore = Math.min(100, (variance / scaledBaseline) * 100);
        totalScore += scaleScore * scaleWeights[i];
      }

      // Add frequency domain analysis for detecting blur types
      const frequencyScore = await computeFrequencyDomainScore(gray, width, height);

      // Combine spatial and frequency domain scores with texture details analysis
      const textureScore = computeTextureDetails(gray, width, height);

      // Final weighted combination (70% multi-scale Laplacian, 20% frequency analysis, 10% texture)
      // Weights are empirical and might need tuning
      const finalScore = 0.7 * totalScore + 0.2 * frequencyScore + 0.1 * textureScore;

      return Math.min(Math.max(Math.round(finalScore), 0), 100);
    } catch (error) {
      console.error("Error in method_c:", error);
      return 0;
    }
  }


  /**
   * Resize Image Strategy
   * Corresponds to Python's resize_image_strategy function
   *
   * @param {File|Blob} imageFile - The image file object
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @param {string} strategy - 'crop', 'pad', or 'stretch'
   * @returns {Promise<Blob>} - The processed image as a Blob
   */
  async function resize_image_strategy(imageFile, targetWidth, targetHeight, strategy) {
    try {
      // Create image from file (using worker-compatible createImageBitmap)
      const imageBitmap = await createImageBitmap(imageFile);

      // Get original dimensions
      const originalWidth = imageBitmap.width;
      const originalHeight = imageBitmap.height;

      // Check if already target size
      if (originalWidth === targetWidth && originalHeight === targetHeight) {
        console.log(`[Worker] Image is already at target resolution ${targetWidth}x${targetHeight}`);
        // Return original blob directly
        return imageFile;
      }

      // Calculate ratios
      const targetRatio = targetWidth / targetHeight;
      const originalRatio = originalWidth / originalHeight;

      // Create OffscreenCanvas for processing
      // OffscreenCanvas is preferred in workers for performance and compatibility
      const canvas = new OffscreenCanvas(targetWidth, targetHeight);
      const ctx = canvas.getContext('2d');

      // Apply strategy
      if (strategy === 'stretch') {
        console.log("[Worker] Applying 'stretch' strategy...");

        ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

      } else if (strategy === 'crop') {
        console.log("[Worker] Applying 'crop' strategy...");

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = originalWidth;
        let sourceHeight = originalHeight;

        // Use a small epsilon for floating point comparison
        if (Math.abs(originalRatio - targetRatio) > 1e-5) {
          if (originalRatio > targetRatio) {
            // Wider than target ratio, crop width
            sourceWidth = Math.round(originalHeight * targetRatio);
            sourceX = Math.floor((originalWidth - sourceWidth) / 2);
          } else {
            // Taller than target ratio, crop height
            sourceHeight = Math.round(originalWidth / targetRatio);
            sourceY = Math.floor((originalHeight - sourceHeight) / 2);
          }
        }

        // Draw cropped region to the target size canvas
        ctx.drawImage(
          imageBitmap,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, targetWidth, targetHeight
        );

      } else if (strategy === 'pad') {
        console.log("[Worker] Applying 'pad' strategy...");

         // Check if ratios match (use epsilon)
        if (Math.abs(originalRatio - targetRatio) < 1e-5) {
          // Just resize (no padding needed)
          ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
        } else {
          // Determine intermediate canvas size to match target ratio for drawing the original image
          let tempCanvasWidth, tempCanvasHeight, startX, startY;

          if (originalRatio > targetRatio) {
            // Original is wider than target ratio, temp canvas height matches original width/target ratio
            tempCanvasHeight = Math.round(originalWidth / targetRatio);
            tempCanvasWidth = originalWidth;
            startY = Math.floor((tempCanvasHeight - originalHeight) / 2); // Pad vertically
            startX = 0;
          } else {
            // Original is taller than target ratio, temp canvas width matches original height*target ratio
            tempCanvasWidth = Math.round(originalHeight * targetRatio);
            tempCanvasHeight = originalHeight;
            startX = Math.floor((tempCanvasWidth - originalWidth) / 2); // Pad horizontally
            startY = 0;
          }

          // Create intermediate OffscreenCanvas
          const tempCanvas = new OffscreenCanvas(tempCanvasWidth, tempCanvasHeight);
          const tempCtx = tempCanvas.getContext('2d');

          // Fill with a background color (e.g., white, configurable?)
          tempCtx.fillStyle = '#FFFFFF'; // Default white padding
          tempCtx.fillRect(0, 0, tempCanvasWidth, tempCanvasHeight);

          // Draw original image onto the intermediate canvas with padding
          tempCtx.drawImage(imageBitmap, startX, startY);

          // Now draw the intermediate canvas onto the final target canvas
          ctx.drawImage(tempCanvas, 0, 0, tempCanvasWidth, tempCanvasHeight, 0, 0, targetWidth, targetHeight);
        }
      } else {
        console.error(`[Worker] Unknown strategy: ${strategy}`);
        throw new Error(`Unknown strategy: ${strategy}. Choose 'crop', 'pad', or 'stretch'`);
      }

      // Convert canvas to blob
      // Specify MIME type and quality if needed (e.g., 'image/jpeg', 0.9)
      const outputBlob = await canvas.convertToBlob({ type: imageFile.type || 'image/png' });

      if (!outputBlob) {
         throw new Error("Failed to create blob from canvas");
      }

      return outputBlob;

    } catch (error) {
      console.error("[Worker] Error in resize_image_strategy:", error);
      // Propagate the error
      throw error;
    }
  }


  /* ----- HELPER FUNCTIONS (Adapted for Worker) ----- */

   /**
   * Convert Blob to ImageData using createImageBitmap and OffscreenCanvas.
   * This is worker-compatible.
   * @param {Blob} file - Image file Blob
   * @returns {Promise<ImageData>} - Image data
   */
  async function fileToImageData(file) {
    try {
        const imageBitmap = await createImageBitmap(file);
        const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageBitmap, 0, 0);
        return ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
    } catch (error) {
        console.error("[Worker] Failed to convert blob to ImageData:", error);
        throw new Error("Failed to convert file to image data"); // Re-throw with simpler message
    }
  }

  /**
   * Create ImageBitmap from Blob (Worker-compatible equivalent of createImageFromFile).
   * @param {Blob} file - Image file Blob
   * @returns {Promise<ImageBitmap>} - ImageBitmap
   */
  async function createImageFromFile(file) {
       try {
           return await createImageBitmap(file);
       } catch (error) {
            console.error("[Worker] Failed to create ImageBitmap from blob:", error);
            throw new Error("Failed to load image"); // Re-throw with simpler message
       }
  }

  /**
   * Preprocess Image (Worker-compatible)
   * @param {Blob} imageFile - Image file Blob
   * @returns {Promise<Object>} - Processed image information { gray: Float32Array, width: number, height: number }
   */
  async function preprocessImage(imageFile) {
    // Create ImageBitmap from file
    const imgBitmap = await createImageFromFile(imageFile);

    // Use OffscreenCanvas to get pixel data
    const canvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
    const ctx = canvas.getContext('2d');

    // Draw original image bitmap
    ctx.drawImage(imgBitmap, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, imgBitmap.width, imgBitmap.height);
    const data = imageData.data;

    // Convert to grayscale Float32Array
    const gray = new Float32Array(imgBitmap.width * imgBitmap.height);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      // Standard grayscale conversion
      gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    return {
      gray,
      width: imgBitmap.width,
      height: imgBitmap.height
    };
  }


  /**
   * Convert ImageData to Grayscale (operates on ImageData object)
   * @param {ImageData} imageData - Image data
   * @returns {Float32Array} - Grayscale image data (Float32Array 0-255)
   */
  function convertToGrayscale(imageData) {
    const data = imageData.data;
    const gray = new Float32Array(imageData.width * imageData.height);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    return gray;
  }

  /**
   * Apply Gamma Correction (operates on Float32Array grayscale 0-255)
   * @param {Float32Array} image - Grayscale image data (0-255)
   * @param {number} gamma - Gamma value
   * @returns {Float32Array} - Gamma corrected image (Float32Array 0-255)
   */
  function applyGamma(image, gamma) {
    const result = new Float32Array(image.length);

    for (let i = 0; i < image.length; i++) {
      result[i] = 255 * Math.pow(image[i] / 255, gamma);
    }

    return result;
  }

  /**
   * Resize Image Data (Nearest Neighbor on Float32Array)
   * NEEDS SOURCE DIMENSIONS.
   * @param {Float32Array} image - Source image data
   * @param {number} sourceWidth - Source width
   * @param {number} sourceHeight - Source height
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @returns {Float32Array} - Resized image data
   */
  function resizeImageData(image, sourceWidth, sourceHeight, targetWidth, targetHeight) {
    const result = new Float32Array(targetWidth * targetHeight);

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        // Calculate source coordinates
        const sourceX = Math.floor(x * sourceWidth / targetWidth);
        const sourceY = Math.floor(y * sourceHeight / targetHeight);

        // Get source pixel (handle potential out of bounds due to floor/ceil, though unlikely with floor)
        const sourceIdx = Math.min(sourceY, sourceHeight - 1) * sourceWidth + Math.min(sourceX, sourceWidth - 1);

        // Set target pixel
        const targetIdx = y * targetWidth + x;
        result[targetIdx] = image[sourceIdx];
      }
    }

    return result;
  }

  /**
   * Normalize Image (Float32Array 0-255 to 0-1)
   * @param {Float32Array} image - Image data (0-255)
   * @returns {Float32Array} - Normalized image (0-1)
   */
  function normalizeImage(image) {
    const result = new Float32Array(image.length);

    for (let i = 0; i < image.length; i++) {
      result[i] = image[i] / 255.0;
    }

    return result;
  }

  /**
   * Compute Sobel Gradients (operates on Float32Array 0-255 or 0-1)
   * NEEDS DIMENSIONS.
   * @param {Float32Array} image - Image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} scaleRatio - Scale ratio for results
   * @returns {Array<Float32Array>} - Gradient arrays [gradX, gradY]
   */
  function computeSobelGradients(image, width, height, scaleRatio = 1.0) {
    const gradX = new Float32Array(image.length);
    const gradY = new Float32Array(image.length);

    // Sobel kernels
    const kernelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];

    const kernelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];

    // Apply Sobel operators, skipping border pixels
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sumX = 0;
        let sumY = 0;

        // Apply kernels
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            sumX += image[idx] * kernelX[ky + 1][kx + 1];
            sumY += image[idx] * kernelY[ky + 1][kx + 1];
          }
        }

        // Store results
        const idx = y * width + x;
        gradX[idx] = sumX * scaleRatio;
        gradY[idx] = sumY * scaleRatio;
      }
    }

    return [gradX, gradY];
  }

  /**
   * Compute Gradient Magnitude (operates on Float32Array)
   * @param {Float32Array} gradX - X gradients
   * @param {Float32Array} gradY - Y gradients
   * @returns {Float32Array} - Gradient magnitude
   */
  function computeGradientMagnitude(gradX, gradY) {
    const result = new Float32Array(gradX.length);

    for (let i = 0; i < gradX.length; i++) {
      result[i] = Math.sqrt(gradX[i] * gradX[i] + gradY[i] * gradY[i]);
    }

    return result;
  }

  /**
   * Compute Variance of Image (operates on Float32Array or Array)
   * @param {Float32Array|Array} image - Image data
   * @returns {number} - Variance
   */
  function computeVariance(image) {
    if (image.length === 0) return 0;
    // Calculate mean
    let sum = 0;
    for (let i = 0; i < image.length; i++) {
      sum += image[i];
    }
    const mean = sum / image.length;

    // Calculate variance
    let variance = 0;
    for (let i = 0; i < image.length; i++) {
      variance += Math.pow(image[i] - mean, 2);
    }

    return variance / image.length;
  }

  /**
   * Compute Local Variance (operates on Float32Array)
   * NEEDS DIMENSIONS.
   * @param {Float32Array} image - Image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} kernelSize - Size of kernel (e.g., 16)
   * @returns {Float32Array} - Local variance map
   */
  function computeLocalVariance(image, width, height, kernelSize) {
    const localVar = new Float32Array(image.length);
    const halfKernel = Math.floor(kernelSize / 2);

    // Sliding window approach
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let sumSq = 0;
        let count = 0;

        // Calculate window bounds (handle borders)
        const startY = Math.max(0, y - halfKernel);
        const endY = Math.min(height, y + halfKernel + 1);
        const startX = Math.max(0, x - halfKernel);
        const endX = Math.min(width, x + halfKernel + 1);

        // Sum values in the window
        for (let wy = startY; wy < endY; wy++) {
          for (let wx = startX; wx < endX; wx++) {
            const val = image[wy * width + wx];
            sum += val;
            sumSq += val * val;
            count++;
          }
        }

        // Calculate variance
        const mean = count > 0 ? sum / count : 0;
        const variance = count > 0 ? (sumSq / count - mean * mean) : 0;
         // Ensure non-negative variance due to potential floating point issues
         localVar[y * width + x] = Math.max(0, variance);
      }
    }

    return localVar;
  }

  /**
   * Calculate Percentile of Array (operates on Array/Float32Array)
   * @param {Array|Float32Array} array - Input array
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} - Percentile value
   */
  function calculatePercentile(array, percentile) {
    if (array.length === 0) return 0;

    // Sort array (create a new array to avoid modifying original Float32Array)
    const sorted = Array.from(array).sort((a, b) => a - b);

    // Calculate index (0-based)
    // The percentile index is (P / 100) * N.
    // Use Math.max to handle percentile 0 correctly (index -1 becomes 0)
    // Use Math.min to handle percentile 100 correctly (index N becomes N-1)
    const index = Math.min(Math.max(0, Math.floor((percentile / 100.0) * sorted.length)), sorted.length -1 );


    return sorted[index];
  }

  /**
   * Apply edge-preserving blur (bilateral filter approximation)
   * Operates on Float32Array (0-255). NEEDS DIMENSIONS.
   * @param {Float32Array} image - Image data (0-255)
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} radius - Filter radius
   * @returns {Float32Array} - Filtered image (Float32Array 0-255)
   */
  function applyEdgePreservingBlur(image, width, height, radius) {
    const result = new Float32Array(image.length);
    const sigma_space = radius / 3;
    // sigma_color controls how much pixels differing in color are weighted less.
    // 30 is a common value, but might need tuning based on image content/range (0-255 here).
    const sigma_color = 30;

    // Square of sigmas for efficiency
    const sigma_space_sq = 2 * sigma_space * sigma_space;
    const sigma_color_sq = 2 * sigma_color * sigma_color;


    // For each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerIdx = y * width + x;
        const centerValue = image[centerIdx];
        let sum = 0;
        let totalWeight = 0;

        // Window bounds
        const startY = Math.max(0, y - radius);
        const endY = Math.min(height, y + radius + 1);
        const startX = Math.max(0, x - radius);
        const endX = Math.min(width, x + radius + 1);

        // Process each pixel in the window
        for (let wy = startY; wy < endY; wy++) {
          for (let wx = startX; wx < endX; wx++) {
            // Skip calculations for pixels outside the circular radius (optimization)
            const dx = wx - x;
            const dy = wy - y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 > radius * radius) continue; // Check squared distance vs squared radius

            const idx = wy * width + wx;
            const val = image[idx];

            // Calculate spatial and color weights
            const spatialWeight = Math.exp(-dist2 / sigma_space_sq);
            const colorDiff = val - centerValue;
            const colorWeight = Math.exp(-(colorDiff * colorDiff) / sigma_color_sq);

            // Combined weight
            const weight = spatialWeight * colorWeight;

            // Weighted sum
            sum += val * weight;
            totalWeight += weight;
          }
        }

        // Normalize
        result[centerIdx] = totalWeight > 0 ? sum / totalWeight : centerValue; // Avoid division by zero
      }
    }

    return result;
  }

  /**
   * Compute modified Laplacian (uses multiple directions)
   * Operates on Float32Array. NEEDS DIMENSIONS.
   * @param {Float32Array} image - Image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Float32Array} - Modified Laplacian response map (Float32Array)
   */
  function computeModifiedLaplacian(image, width, height) {
    const result = new Float32Array(image.length);

    // Calculate horizontal and vertical second derivatives separately, skipping border
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // Horizontal second derivative (absolute value)
        const dx = Math.abs(2 * image[idx] - image[idx - 1] - image[idx + 1]);

        // Vertical second derivative (absolute value)
        const dy = Math.abs(2 * image[idx] - image[idx - width] - image[idx + width]);

        // Diagonal directions (absolute values)
        const diag1 = Math.abs(2 * image[idx] - image[idx - width - 1] - image[idx + width + 1]);
        const diag2 = Math.abs(2 * image[idx] - image[idx - width + 1] - image[idx + width - 1]);

        // Modified Laplacian is sum of absolute derivatives (sum of 2nd derivatives in different directions)
        // Weights (0.5 for diagonals) are empirical but common
        result[idx] = dx + dy + 0.5 * (diag1 + diag2);
      }
    }

    return result;
  }

  /**
   * Extract Region of Interest (focus on areas likely to contain details)
   * Operates on Float32Array.
   * @param {Float32Array} image - Image data (Laplacian response or similar)
   * @returns {Float32Array} - ROI data (subset of input array)
   */
  function extractROI(image) {
    // Find areas with high response (likely to contain details)
    // Use Otsu's method to find a threshold for 'foreground' (high response) pixels
    const threshold = computeOtsu(image);

    // Extract pixels above a certain threshold
    // Using a lower threshold than strict Otsu might include more relevant details
    const thresholdFactor = 0.5; // Empirical factor
    const lowerThreshold = threshold * thresholdFactor;

    const roi = [];
    for (let i = 0; i < image.length; i++) {
      if (image[i] > lowerThreshold) {
        roi.push(image[i]);
      }
    }

    // If ROI is too small (e.g., very flat image), use the entire image to avoid crashing or biased results
    const minROIProportion = 0.05; // E.g., at least 5% of pixels
    if (roi.length < image.length * minROIProportion) {
      // console.warn("[Worker] ROI size too small, using entire image for analysis.");
      return image; // Return original array
    }

    return new Float32Array(roi); // Return new array with ROI data
  }

  /**
   * Compute Otsu threshold for segmentation (operates on Float32Array)
   * @param {Float32Array} image - Image data
   * @returns {number} - Otsu threshold (in the range of the input data)
   */
  function computeOtsu(image) {
     if (image.length === 0) return 0;

    // Find min and max values to normalize to 0-255 bin
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < image.length; i++) {
      min = Math.min(min, image[i]);
      max = Math.max(max, image[i]);
    }

    // Handle constant image
    if (max === min) return min;

    const range = max - min;
    const numBins = 256; // Standard for 8-bit representation
    const histogram = new Array(numBins).fill(0);

    // Build histogram
    for (let i = 0; i < image.length; i++) {
      // Map value from [min, max] to [0, numBins-1]
      const bin = Math.min(numBins - 1, Math.floor(((image[i] - min) / range) * (numBins - 1)));
      histogram[bin]++;
    }

    // Calculate Otsu threshold based on normalized histogram
    const total = image.length;
    let sum = 0; // Cumulative sum of intensity * count
    for (let i = 0; i < numBins; i++) {
      sum += i * histogram[i];
    }

    let sumB = 0; // Cumulative sum of intensity * count for background
    let wB = 0; // Cumulative count for background
    let wF = 0; // Cumulative count for foreground
    let maxVariance = 0;
    let thresholdBin = 0; // Threshold in bins (0-255)

    for (let i = 0; i < numBins; i++) {
      wB += histogram[i]; // Add count to background
      if (wB === 0) continue; // Avoid division by zero

      wF = total - wB; // Count for foreground
      if (wF === 0) break; // No foreground left

      sumB += i * histogram[i]; // Add intensity * count to background sum
      const mB = sumB / wB; // Mean intensity of background
      const mF = (sum - sumB) / wF; // Mean intensity of foreground

      // Calculate between-class variance
      const variance = wB * wF * (mB - mF) * (mB - mF);

      // Check if this threshold gives the maximum variance
      if (variance > maxVariance) {
        maxVariance = variance;
        thresholdBin = i;
      }
    }

    // Convert threshold bin back to the original data range
    return min + (thresholdBin / (numBins - 1)) * range;
  }

  /**
   * Compute variance with outlier rejection (operates on Array/Float32Array)
   * @param {Float32Array|Array} data - Image data (e.g., ROI)
   * @returns {number} - Robust variance
   */
  function computeRobustVariance(data) {
    // Need enough data points to be meaningful
    if (data.length < 20) return 0; // Increased from 10 for more robust stats

    // Sort data for percentile calculation (create new array)
    const sortedData = Array.from(data).sort((a, b) => a - b);

    // Define trimming percentage (e.g., trim 10% from each end)
    const trimPercent = 0.10; // Trim 10% from bottom and 10% from top (total 20%)
    const lowerIndex = Math.floor(data.length * trimPercent);
    const upperIndex = Math.ceil(data.length * (1 - trimPercent));

    // Ensure valid indices, especially for small arrays after filtering
    if (upperIndex <= lowerIndex) {
        // This can happen if data.length is very small or trimPercent is too high
        // Fallback to using the available data, or return 0 if too few
        if (data.length < 2) return 0; // Need at least 2 points for variance
        return computeVariance(data); // Compute variance on the original data if trimming is invalid
    }

    // Calculate mean of trimmed data
    let sum = 0;
    let trimmedCount = 0;
    for (let i = lowerIndex; i < upperIndex; i++) {
        sum += sortedData[i];
        trimmedCount++;
    }

    if (trimmedCount === 0) return 0; // Should not happen if upperIndex > lowerIndex, but safety check
    const mean = sum / trimmedCount;

    // Calculate variance of trimmed data
    let variance = 0;
    for (let i = lowerIndex; i < upperIndex; i++) {
      variance += (sortedData[i] - mean) * (sortedData[i] - mean);
    }

    // Ensure non-negative variance
    return Math.max(0, variance / trimmedCount);
  }


  /**
   * Compute frequency domain score using DCT approximation.
   * Operates on Float32Array (grayscale). NEEDS DIMENSIONS.
   * @param {Float32Array} image - Grayscale image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {number} - Frequency domain score (0-100)
   */
  async function computeFrequencyDomainScore(image, width, height) {
    // For simplicity and speed, we'll use block-based analysis (like JPEG compression)
    const blockSize = 8; // Standard DCT block size
    const numBlocksX = Math.floor(width / blockSize);
    const numBlocksY = Math.floor(height / blockSize);

    if (numBlocksX < 1 || numBlocksY < 1) { // Need at least one block
      // Image too small for block analysis, return neutral score
      return 50;
    }

    let highFreqEnergySum = 0;
    let lowFreqEnergySum = 0;

    // Process blocks
    for (let blockY = 0; blockY < numBlocksY; blockY++) {
      for (let blockX = 0; blockX < numBlocksX; blockX++) {
        // Extract block data (create a new array for the block)
        const block = new Float32Array(blockSize * blockSize);
        for (let y = 0; y < blockSize; y++) {
          for (let x = 0; x < blockSize; x++) {
            const imageX = blockX * blockSize + x;
            const imageY = blockY * blockSize + y;
            // Ensure bounds checking for safety, though floor should prevent overflow
            if (imageY < height && imageX < width) {
                block[y * blockSize + x] = image[imageY * width + imageX];
            } else {
                block[y * blockSize + x] = 0; // Pad with zero if block goes slightly out of bounds
            }
          }
        }

        // Compute simplified DCT energies for the block
        const [blockLow, blockHigh] = computeBlockDCTEnergy(block, blockSize);
        lowFreqEnergySum += blockLow;
        highFreqEnergySum += blockHigh;
      }
    }

    // Calculate ratio of high to total energy over all processed blocks
    const totalEnergySum = highFreqEnergySum + lowFreqEnergySum;
    if (totalEnergySum <= 1e-6) return 50; // Avoid division by zero, return neutral score if energy is near zero

    const freqRatio = highFreqEnergySum / totalEnergySum;

    // Convert ratio to score (higher ratio means more high-frequency content = sharper image)
    // The mapping from ratio (0-1) to score (0-100) needs tuning.
    // A simple linear mapping might be: score = ratio * MaxScoreFactor
    // An empirical factor like 300 might map typical ratios (e.g., 0.1-0.3) to a reasonable score range.
    // Clamp between 0 and 100.
    const score = Math.min(100, freqRatio * 300); // Scaling factor determined empirically

    return Math.round(score);
  }

  /**
   * Compute DCT energy for an 8x8 block (simplified approximation).
   * Operates on Float32Array block data (0-255).
   * This is NOT a full DCT implementation but approximates the energy distribution.
   * @param {Float32Array} block - Block data (blockSize * blockSize)
   * @param {number} blockSize - Block size (e.g., 8)
   * @returns {Array<number>} - [lowFreqEnergy, highFreqEnergy] for the block
   */
  function computeBlockDCTEnergy(block, blockSize) {
      let lowFreqEnergy = 0;
      let highFreqEnergy = 0;

      // Simplified approach: calculate energy of coefficients without full matrix multiply
      // This is a heuristic based on the idea that AC coefficients represent frequencies.
      // Sum of squares of coefficients is proportional to energy.
      // DC coefficient (u=0, v=0) represents the average value (low frequency).
      // Other coefficients (AC) represent higher frequencies.

      let dcValue = 0;
      let acEnergy = 0;

      for (let i = 0; i < block.length; i++) {
          // Simple separation: index 0 is DC, rest are AC (rough approximation)
          if (i === 0) {
              dcValue = block[i]; // This isn't quite the DCT DC coefficient
          } else {
              acEnergy += block[i] * block[i];
          }
      }

      // A better approximation would involve calculating the actual DCT coefficients (even a simplified one)
      // and then summing the squared magnitudes of coefficients based on their (u, v) index.
      // Let's implement a slightly better approximation based on (u,v) index.

      for (let v = 0; v < blockSize; v++) {
          for (let u = 0; u < blockSize; u++) {
              const k = v * blockSize + u; // Index in a flattened block (not quite how DCT coefficients map)

              // In DCT, coefficient at (u, v) corresponds to frequencies proportional to u and v.
              // The DC coefficient is at (0, 0).
              // Low frequencies are near (0,0), high frequencies are further away.
              // Let's calculate a simple "frequency magnitude" based on u, v
              const freqMagnitude = Math.sqrt(u*u + v*v);

              // We would need to calculate the coefficient value for (u,v).
              // A full DCT is complex. Let's simplify: assume a simple convolution or difference captures frequency.
              // This function as written seems to attempt a convolution-like sum, but it's not a standard DCT.
              // It iterates through the block and applies a cosine based on the coefficient index (u,v)
              // Let's try to align this approximation better with frequency concepts.

              // A very simple approximation: high frequency energy is related to *differences* between adjacent pixels.
              // Low frequency energy is related to average values.
              // This might be redundant with spatial domain methods (Sobel/Laplacian).

              // Let's revert to a simpler, more common frequency domain approach for blur:
              // Calculate the variance of the Laplacian of the image (which we already do in method_c).
              // OR, estimate energy in different frequency bands using simple kernels.
              // The provided code's `computeBlockDCTEnergy` looks like a confused attempt at DCT.
              // Let's replace `computeFrequencyDomainScore` and its helpers with a different approach,
              // or remove it if it's unreliable. Given the complexity and potential unreliability
              // of implementing DCT approximation from scratch, maybe rely on the spatial methods
              // (method_a, method_b, method_c) which are better understood in the spatial domain.

              // *Decision:* Let's remove the `computeFrequencyDomainScore` and its helpers (`computeBlockDCTEnergy`).
              // The original method_c already uses multi-scale Laplacian variance which is a good indicator of sharpness/blur.
              // The texture analysis (`computeTextureDetails`, `computeLBP`) adds another spatial dimension.
              // Relying on these spatial methods might be more robust than a potentially flawed DCT approximation.

               // --- Keep the function signatures for now, but simplify/remove implementation ---
               // This requires commenting out the usage in method_c or removing the call.
               // Let's comment out the usage in method_c and remove the helper implementations.

              // --- Re-evaluating the provided computeBlockDCTEnergy ---
              // The loop structure `for (let v = 0; v < blockSize; v++) { for (let u = 0; u < blockSize; u++) { ... } }`
              // suggests it's trying to iterate through DCT coefficients (u,v).
              // The inner loop calculates a `sum` using `blockVal * cosU * cosV`. This *is* related to the formula for 2D DCT coefficients.
              // `coefficient = (2 / blockSize) * cu * cv * sum;` this is also part of the DCT formula.
              // The issue is the logic `k = v * blockSize + u` which maps (u,v) to a linear index that doesn't correspond to the *pixel* index in the *input* block.
              // The inner loops `for (let y = 0; y < blockSize; y++) { for (let x = 0; x < blockSize; x++) { ... block[y * blockSize + x] ... } }` are correct for accessing the input block pixels.
              // The `frequency = u + v;` line is a simple way to classify frequencies (u=0,v=0 is DC; u=7,v=7 is high freq).
              // The energy calculation `energy = coefficient * coefficient;` is correct for energy of a coefficient.
              // Classification `if (frequency <= blockSize / 2)` separates low/high.

              // Okay, the provided `computeBlockDCTEnergy` seems to be a valid, albeit simplified, attempt at calculating *some* form of frequency-domain energy distribution.
              // It's not a standard optimized DCT algorithm, but it *does* calculate something related to energy at different "frequencies" (u,v).
              // Let's keep the logic as is, assuming it provides a useful heuristic, even if not mathematically precise DCT.
              // It operates on a block, so it needs the block data.

               // Re-implement computeBlockDCTEnergy based on the logic provided, clarifying variables
                let sum_coefficient = 0; // This variable name was confusing, let's calculate the coefficient first
                const sqrt2 = Math.sqrt(2);

                for (let y = 0; y < blockSize; y++) { // Iterate through input block pixels
                    for (let x = 0; x < blockSize; x++) {
                         // This inner loop seems misplaced *inside* the u,v loops in the original.
                         // The correct way is:
                         // For each (u, v) coefficient:
                         //   Calculate coefficient by summing over all (x, y) pixels in the block.
                         // Let's restructure the loop.
                    }
                }
              // --- Restructuring computeBlockDCTEnergy ---
              // This requires a significant rewrite to correctly implement the 2D DCT formula structure, even approximately.
              // Given the scope (just moving existing code to worker), it's safer to assume the *original* provided helper function's *intent* and structure,
              // even if it looks a bit unusual, and just make sure it works with the Float32Array data.
              // The original structure was:
              // for (v) for (u) { calculate sum over (y, x) involving block[y*bs+x] * cos(u..) * cos(v..) ; calc coeff; calc energy; add to low/high based on u+v }
              // This means the (y, x) loops should be *inside* the (u, v) loops. This matches the provided code structure.
              // The calculation looks correct for *some* transformation, whether it's exactly DCT or not.
              // Let's just make sure the data types and indices are handled correctly.

                // Back to the original loop structure provided:
                lowFreqEnergy = 0;
                highFreqEnergy = 0;

                for (let v = 0; v < blockSize; v++) { // Frequency component V
                  for (let u = 0; u < blockSize; u++) { // Frequency component U

                    let sum_over_pixels = 0;
                    for (let y = 0; y < blockSize; y++) { // Pixel coordinate Y
                      for (let x = 0; x < blockSize; x++) { // Pixel coordinate X
                        const pixel_idx = y * blockSize + x;
                        const cosU = Math.cos((Math.PI * u * (2 * x + 1)) / (2 * blockSize));
                        const cosV = Math.cos((Math.PI * v * (2 * y + 1)) / (2 * blockSize));
                        sum_over_pixels += block[pixel_idx] * cosU * cosV;
                      }
                    }

                    // DCT scale factors (simplified, should be sqrt(2/N) * C(k))
                    // C(k) = 1/sqrt(2) if k=0, 1 otherwise.
                    const cu = u === 0 ? 1.0 / sqrt2 : 1.0;
                    const cv = v === 0 ? 1.0 / sqrt2 : 1.0;
                    // The overall scaling factor for 2D DCT is (2/N) * C(u) * C(v).
                    // The provided code uses (2 / blockSize) * cu * cv. This seems consistent with some forms of DCT scaling.
                    const coefficient = (2.0 / blockSize) * cu * cv * sum_over_pixels;

                    // Calculate energy for this coefficient
                    const energy = coefficient * coefficient;

                    // Classify frequency based on (u, v) indices
                    // (0,0) is DC. (blockSize-1, blockSize-1) is highest freq.
                    // The threshold `blockSize / 2` is a heuristic.
                    const frequency_magnitude = u + v; // Simple sum of indices
                    if (frequency_magnitude <= blockSize) { // A common heuristic is u+v <= N (for N x N block) or related to distance from origin
                      lowFreqEnergy += energy;
                    } else {
                      highFreqEnergy += energy;
                    }
                  }
                }

                return [lowFreqEnergy, highFreqEnergy];
            }
             // --- End Refactoring computeBlockDCTEnergy ---
        }

  /**
   * Compute texture details score using Local Binary Patterns (LBP).
   * Operates on Float32Array (grayscale 0-255). NEEDS DIMENSIONS.
   * @param {Float32Array} image - Grayscale image data (0-255)
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {number} - Texture score (0-100)
   */
  function computeTextureDetails(image, width, height) {
    // Compute LBP image (Uint8Array 0-255)
    const lbpImage = computeLBP(image, width, height);

    // Calculate histogram of LBP values
    const histogram = new Array(256).fill(0);
    // Iterate over the LBP image, excluding the 1-pixel border which LBP is undefined for
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
           const idx = y * width + x;
           const lbpValue = lbpImage[idx]; // LBP values are 0-255
           histogram[lbpValue]++;
      }
    }


    // Calculate entropy of the histogram (higher entropy = more complex/varied texture)
    // Only count pixels actually processed by LBP (width-2 * height-2)
    const totalLbpPixels = (width - 2) * (height - 2);
    if (totalLbpPixels <= 0) return 0;

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      const probability = histogram[i] / totalLbpPixels;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability); // Log base 2 for bits
      }
    }

    // Convert entropy to score (normalize to 0-100)
    // Maximum entropy for 256 bins is log2(256) = 8 bits.
    const maxEntropy = 8;
    // Clamp score between 0 and 100.
    const score = Math.min(100, (entropy / maxEntropy) * 100); // Scale to 100

    return Math.round(score);
  }

  /**
   * Compute Local Binary Pattern (LBP) for a grayscale image.
   * Operates on Float32Array (grayscale 0-255). NEEDS DIMENSIONS.
   * Returns Uint8Array (LBP values 0-255).
   * LBP is undefined for the 1-pixel border.
   * @param {Float32Array} image - Grayscale image data (0-255)
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Uint8Array} - LBP image (0-255), border will be 0 or default value
   */
  function computeLBP(image, width, height) {
    const result = new Uint8Array(image.length); // Initialize with 0s

    // For each pixel (excluding 1-pixel border)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = y * width + x;
        const centerValue = image[centerIdx];
        let lbpValue = 0; // LBP value for the center pixel

        // 8-neighborhood in clockwise order starting from top-left (p=0)
        const neighbors = [
          image[(y - 1) * width + x - 1], // Top-left (p=0)
          image[(y - 1) * width + x],     // Top (p=1)
          image[(y - 1) * width + x + 1], // Top-right (p=2)
          image[y * width + x + 1],       // Right (p=3)
          image[(y + 1) * width + x + 1], // Bottom-right (p=4)
          image[(y + 1) * width + x],     // Bottom (p=5)
          image[(y + 1) * width + x - 1], // Bottom-left (p=6)
          image[y * width + x - 1]        // Left (p=7)
        ];

        // Calculate LBP value by comparing neighbors to the center pixel
        // Set bit p if neighbor value is greater than or equal to center value
        for (let p = 0; p < 8; p++) {
          if (neighbors[p] >= centerValue) {
            lbpValue |= (1 << p); // Set the p-th bit
          }
        }

        result[centerIdx] = lbpValue; // Store the calculated LBP value (0-255)
      }
    }

    return result; // Return the LBP image (Uint8Array)
  }


  // --- End: Copy all original functions from ImageProcessor.js ---


// Listen for messages from the main thread
self.onmessage = async (event) => {
    const { id, method, imageBlob, params, timeout } = event.data; // Added imageBlob and params

    console.log(`[Worker ${id}] Received job: ${method}`);

    try {
        let result;

        // Handle different methods
        if (method === 'method_a') {
            // params: [targetWidth, targetHeight, strategy]
            result = await method_a(imageBlob, params[0], params[1], params[2]);
        } else if (method === 'method_b') {
            // params: [targetWidth, targetHeight, strategy]
            result = await method_b(imageBlob, params[0], params[1], params[2]);
        } else if (method === 'method_c') {
             // params: [targetWidth, targetHeight, strategy]
            result = await method_c(imageBlob, params[0], params[1], params[2]);
        } else if (method === 'resize_image_strategy') {
            // params: [targetWidth, targetHeight, strategy]
            result = await resize_image_strategy(imageBlob, params[0], params[1], params[2]);
        } else {
            throw new Error(`Unknown method: ${method}`);
        }

        console.log(`[Worker ${id}] Job ${method} finished.`);

        // Send result back. Transferables optimize sending ArrayBuffer/TypedArray/Blob/ImageBitmap
        // For resize, result is a Blob. For methods a/b/c, result is a number.
        if (method === 'resize_image_strategy' && result instanceof Blob) {
             self.postMessage({ id, status: 'success', method, blob: result }, [result]); // Transfer the Blob
        } else {
             self.postMessage({ id, status: 'success', method, result: result }); // Send number result
        }


    } catch (error) {
        console.error(`[Worker ${id}] Error executing ${method}:`, error);
        // Send error details back
        self.postMessage({
            id,
            status: 'error',
            method,
            error: {
                message: error.message,
                name: error.name,
                // stack: error.stack // Stack might be large
            }
        });
    }
};

console.log("[Image Processing Worker] Initialized and ready.");