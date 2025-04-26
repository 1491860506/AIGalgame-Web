// image-processing.worker.js

// --- Helper Functions (Moved from original ImageProcessor.js) ---
// These functions should operate only on raw pixel data arrays (Uint8Array, Float32Array)
// and dimensions, NOT on File/Blob/ImageData objects or Canvas elements.

/**
 * Convert raw RGB Uint8ClampedArray to Grayscale Float32Array
 * @param {Uint8ClampedArray} rgbaData - Raw pixel data (R,G,B,A)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Float32Array} - Grayscale image data (0-255 range)
 */
function convertToGrayscaleWorker(rgbaData, width, height) {
    const gray = new Float32Array(width * height);
    for (let i = 0, j = 0; i < rgbaData.length; i += 4, j++) {
        gray[j] = 0.299 * rgbaData[i] + 0.587 * rgbaData[i + 1] + 0.114 * rgbaData[i + 2];
    }
    return gray;
}

/**
 * Apply Gamma Correction
 * @param {Float32Array} image - Grayscale image data (0-255 range)
 * @param {number} gamma - Gamma value
 * @returns {Float32Array} - Gamma corrected image (0-255 range)
 */
function applyGammaWorker(image, gamma) {
    const result = new Float32Array(image.length);
    for (let i = 0; i < image.length; i++) {
        result[i] = 255 * Math.pow(image[i] / 255, gamma);
    }
    return result;
}

/**
 * Resize Grayscale Image Data (simple nearest neighbor approach)
 * @param {Float32Array} image - Grayscale image data
 * @param {number} sourceWidth - Original width
 * @param {number} sourceHeight - Original height
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @returns {Float32Array} - Resized grayscale image
 */
function resizeImageDataWorker(image, sourceWidth, sourceHeight, targetWidth, targetHeight) {
    const result = new Float32Array(targetWidth * targetHeight);
    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            const sourceX = Math.floor(x * sourceWidth / targetWidth);
            const sourceY = Math.floor(y * sourceHeight / targetHeight);
            const sourceIdx = sourceY * sourceWidth + sourceX;
            const targetIdx = y * targetWidth + x;
            result[targetIdx] = image[sourceIdx];
        }
    }
    return result;
}

/**
 * Normalize Grayscale Image (scale to 0-1 range)
 * @param {Float32Array} image - Grayscale image data (0-255 range)
 * @returns {Float32Array} - Normalized image (0-1 range)
 */
function normalizeImageWorker(image) {
    const result = new Float32Array(image.length);
    for (let i = 0; i < image.length; i++) {
        result[i] = image[i] / 255.0;
    }
    return result;
}

/**
 * Compute Sobel Gradients on Grayscale Image
 * @param {Float32Array} image - Grayscale image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} scaleRatio - Scale ratio for results
 * @returns {Array<Float32Array>} - Gradient arrays [gradX, gradY]
 */
function computeSobelGradientsWorker(image, width, height, scaleRatio = 1.0) {
    const gradX = new Float32Array(image.length);
    const gradY = new Float32Array(image.length);
    const kernelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]; // Flattened kernel
    const kernelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]; // Flattened kernel

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sumX = 0;
            let sumY = 0;
            let kernelIdx = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixelIdx = (y + ky) * width + (x + kx);
                    sumX += image[pixelIdx] * kernelX[kernelIdx];
                    sumY += image[pixelIdx] * kernelY[kernelIdx];
                    kernelIdx++;
                }
            }
            const idx = y * width + x;
            gradX[idx] = sumX * scaleRatio;
            gradY[idx] = sumY * scaleRatio;
        }
    }
    return [gradX, gradY];
}

/**
 * Compute Gradient Magnitude
 * @param {Float32Array} gradX - X gradients
 * @param {Float32Array} gradY - Y gradients
 * @returns {Float32Array} - Gradient magnitude
 */
function computeGradientMagnitudeWorker(gradX, gradY) {
    const result = new Float32Array(gradX.length);
    for (let i = 0; i < gradX.length; i++) {
        result[i] = Math.sqrt(gradX[i] * gradX[i] + gradY[i] * gradY[i]);
    }
    return result;
}

/**
 * Compute Variance of Image
 * @param {Float32Array|Array} image - Image data
 * @returns {number} - Variance
 */
function computeVarianceWorker(image) {
    if (image.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < image.length; i++) {
        sum += image[i];
    }
    const mean = sum / image.length;
    let variance = 0;
    for (let i = 0; i < image.length; i++) {
        variance += Math.pow(image[i] - mean, 2);
    }
    return variance / image.length;
}

/**
 * Compute Local Variance using sliding window
 * @param {Float32Array} image - Grayscale image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} kernelSize - Size of square kernel
 * @returns {Float32Array} - Local variance
 */
function computeLocalVarianceWorker(image, width, height, kernelSize) {
    const localVar = new Float32Array(image.length);
    const halfKernel = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let sumSq = 0;
            let count = 0;
            const startY = Math.max(0, y - halfKernel);
            const endY = Math.min(height, y + halfKernel + 1);
            const startX = Math.max(0, x - halfKernel);
            const endX = Math.min(width, x + halfKernel + 1);

            for (let wy = startY; wy < endY; wy++) {
                for (let wx = startX; wx < endX; wx++) {
                    const val = image[wy * width + wx];
                    sum += val;
                    sumSq += val * val;
                    count++;
                }
            }
            const mean = sum / count;
            const variance = sumSq / count - mean * mean;
            localVar[y * width + x] = variance;
        }
    }
    return localVar;
}

/**
 * Calculate Percentile of Array
 * @param {Float32Array|Array<number>} array - Input array
 * @param {number} percentile - Percentile to calculate (0-100)
 * @returns {number} - Percentile value
 */
function calculatePercentileWorker(array, percentile) {
    if (array.length === 0) return 0;
    const sorted = Array.from(array).sort((a, b) => a - b);
    const index = Math.max(0, Math.ceil(percentile / 100 * sorted.length) - 1);
    return sorted[index];
}


/**
 * Apply edge-preserving blur (bilateral filter approximation)
 * @param {Float32Array} image - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} radius - Filter radius
 * @returns {Float32Array} - Filtered image
 */
function applyEdgePreservingBlurWorker(image, width, height, radius) {
    const result = new Float32Array(image.length);
    const sigma_space = radius / 3;
    const sigma_color = 30; // Controls how much an adjacent pixel is downweighted due to color difference

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const centerIdx = y * width + x;
        const centerValue = image[centerIdx];
        let sum = 0;
        let totalWeight = 0;

        const startY = Math.max(0, y - radius);
        const endY = Math.min(height, y + radius + 1);
        const startX = Math.max(0, x - radius);
        const endX = Math.min(width, x + radius + 1);

        for (let wy = startY; wy < endY; wy++) {
          for (let wx = startX; wx < endX; wx++) {
            const dx = wx - x;
            const dy = wy - y;
            const dist2 = dx * dx + dy * dy;
            if (dist2 > radius * radius) continue;

            const idx = wy * width + wx;
            const val = image[idx];

            const spatialWeight = Math.exp(-dist2 / (2 * sigma_space * sigma_space));
            const colorDiff = val - centerValue;
            const colorWeight = Math.exp(-(colorDiff * colorDiff) / (2 * sigma_color * sigma_color));

            const weight = spatialWeight * colorWeight;

            sum += val * weight;
            totalWeight += weight;
          }
        }
        result[centerIdx] = totalWeight > 0 ? sum / totalWeight : centerValue;
      }
    }
    return result;
}

/**
 * Compute modified Laplacian (uses multiple directions, better than standard Laplacian)
 * @param {Float32Array} image - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Float32Array} - Modified Laplacian response
 */
function computeModifiedLaplacianWorker(image, width, height) {
    const result = new Float32Array(image.length);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const dx = Math.abs(2 * image[idx] - image[idx - 1] - image[idx + 1]);
        const dy = Math.abs(2 * image[idx] - image[idx - width] - image[idx + width]);
        const diag1 = Math.abs(2 * image[idx] - image[idx - width - 1] - image[idx + width + 1]);
        const diag2 = Math.abs(2 * image[idx] - image[idx - width + 1] - image[idx + width - 1]);
        result[idx] = dx + dy + 0.5 * (diag1 + diag2);
      }
    }
    return result;
}

/**
 * Extract Region of Interest (focus on areas likely to contain details)
 * @param {Float32Array} image - Image data
 * @returns {Float32Array} - ROI data
 */
function extractROIWorker(image) { // width, height are implicitly known from image length
    const threshold = computeOtsuWorker(image);
    const roi = [];
    for (let i = 0; i < image.length; i++) {
      if (image[i] > threshold * 0.5) {
        roi.push(image[i]);
      }
    }
     const width = Math.sqrt(image.length); // Need width/height for original size check
     const height = image.length / width;
    if (roi.length < width * height * 0.05) {
      return image;
    }
    return new Float32Array(roi);
}

/**
 * Compute Otsu threshold for segmentation
 * @param {Float32Array} image - Image data
 * @returns {number} - Otsu threshold
 */
function computeOtsuWorker(image) {
    const histogram = new Array(256).fill(0);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < image.length; i++) {
      min = Math.min(min, image[i]);
      max = Math.max(max, image[i]);
    }
    if (max === min) return 0;

    const range = max - min;
    for (let i = 0; i < image.length; i++) {
      const bin = Math.floor(((image[i] - min) / range) * 255);
      histogram[bin]++;
    }

    const total = image.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) { sum += i * histogram[i]; }
    let sumB = 0, wB = 0, wF = 0, maxVariance = 0, threshold = 0;

    for (let i = 0; i < 256; i++) {
      wB += histogram[i];
      if (wB === 0) continue;
      wF = total - wB;
      if (wF === 0) break;
      sumB += i * histogram[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);
      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = i;
      }
    }
    return min + (threshold / 255) * range;
}

/**
 * Compute variance with outlier rejection
 * @param {Float32Array} data - Image data
 * @returns {number} - Robust variance
 */
function computeRobustVarianceWorker(data) {
    if (data.length < 10) return 0;
    const sortedData = Array.from(data).sort((a, b) => a - b);
    const lower = Math.floor(data.length * 0.05);
    const upper = Math.ceil(data.length * 0.95);
    if (upper <= lower) return 0; // Handle edge case with too few data points
    let sum = 0;
    for (let i = lower; i < upper; i++) { sum += sortedData[i]; }
    const mean = sum / (upper - lower);
    let variance = 0;
    for (let i = lower; i < upper; i++) {
        variance += (sortedData[i] - mean) * (sortedData[i] - mean);
    }
    return variance / (upper - lower);
}

/**
 * Compute DCT energy for a block (Simplified Approximation)
 * @param {Float32Array} block - Block data
 * @param {number} blockSize - Block size
 * @returns {Array<number>} - [lowFreqEnergy, highFreqEnergy]
 */
function computeBlockDCTEnergyWorker(block, blockSize) {
    let lowFreqEnergy = 0;
    let highFreqEnergy = 0;

    // Simplified DCT calculation (approximated)
    for (let v = 0; v < blockSize; v++) {
      for (let u = 0; u < blockSize; u++) {
        let sum = 0;
        for (let y = 0; y < blockSize; y++) {
          for (let x = 0; x < blockSize; x++) {
            const blockVal = block[y * blockSize + x];
            // Simplified cosines - may need more accurate versions
            const cosU = Math.cos((Math.PI * u * (2 * x + 1)) / (2 * blockSize));
            const cosV = Math.cos((Math.PI * v * (2 * y + 1)) / (2 * blockSize));
            sum += blockVal * cosU * cosV;
          }
        }

        // Apply scale factors (simplified)
        const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
        const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
        const coefficient = (2 / blockSize) * cu * cv * sum; // Missing normalization factor usually
        const energy = coefficient * coefficient;

        const frequency = u + v;
        if (frequency <= blockSize / 2) {
          lowFreqEnergy += energy;
        } else {
          highFreqEnergy += energy;
        }
      }
    }
    return [lowFreqEnergy, highFreqEnergy];
}

/**
 * Compute frequency domain score using DCT approximation
 * @param {Float32Array} image - Grayscale image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} - Frequency domain score
 */
function computeFrequencyDomainScoreWorker(image, width, height) {
    const blockSize = 8;
    const numBlocksX = Math.floor(width / blockSize);
    const numBlocksY = Math.floor(height / blockSize);

    if (numBlocksX < 3 || numBlocksY < 3) { return 50; }

    let highFreqEnergy = 0;
    let lowFreqEnergy = 0;

    for (let blockY = 0; blockY < numBlocksY; blockY++) {
      for (let blockX = 0; blockX < numBlocksX; blockX++) {
        const block = new Float32Array(blockSize * blockSize);
        for (let y = 0; y < blockSize; y++) {
          for (let x = 0; x < blockSize; x++) {
            const imageX = blockX * blockSize + x;
            const imageY = blockY * blockSize + y;
            block[y * blockSize + x] = image[imageY * width + imageX];
          }
        }
        const [blockLow, blockHigh] = computeBlockDCTEnergyWorker(block, blockSize);
        lowFreqEnergy += blockLow;
        highFreqEnergy += blockHigh;
      }
    }

    const totalEnergy = highFreqEnergy + lowFreqEnergy;
    if (totalEnergy <= 0) return 50;
    const freqRatio = highFreqEnergy / totalEnergy;

    return Math.min(100, freqRatio * 300);
}

/**
 * Compute Local Binary Pattern
 * @param {Float32Array} image - Grayscale image
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Uint8Array} - LBP image
 */
function computeLBPWorker(image, width, height) {
    const result = new Uint8Array(image.length);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = y * width + x;
        const centerValue = image[centerIdx];
        let lbpValue = 0;
        const neighbors = [
          image[(y - 1) * width + x],     // Top
          image[(y - 1) * width + x + 1], // Top-right
          image[y * width + x + 1],       // Right
          image[(y + 1) * width + x + 1], // Bottom-right
          image[(y + 1) * width + x],     // Bottom
          image[(y + 1) * width + x - 1], // Bottom-left
          image[y * width + x - 1],       // Left
          image[(y - 1) * width + x - 1]  // Top-left
        ];
        for (let i = 0; i < 8; i++) {
          if (neighbors[i] >= centerValue) {
            lbpValue |= (1 << i);
          }
        }
        result[centerIdx] = lbpValue;
      }
    }
    return result;
}

/**
 * Compute texture details score
 * @param {Float32Array} image - Grayscale image
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} - Texture score
 */
function computeTextureDetailsWorker(image, width, height) {
    const lbpImage = computeLBPWorker(image, width, height);
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < lbpImage.length; i++) {
      histogram[lbpImage[i]]++;
    }
    const total = lbpImage.length;
    if (total === 0) return 0;
    for (let i = 0; i < 256; i++) { histogram[i] /= total; }
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > 0) {
        entropy -= histogram[i] * Math.log2(histogram[i]);
      }
    }
    const maxEntropy = 8; // For 256 bins
    return Math.min(100, (entropy / maxEntropy) * 100);
}


// --- Main Quality Assessment Methods (Adapted for Worker) ---

/**
 * Method A - Edge-based image quality assessment
 * Operates on raw pixel data in the worker.
 * @param {Float32Array} gray - Grayscale image data (0-255 range)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} Quality score (0-100)
 */
function method_a_worker(gray, width, height) {
    // Steps are the same, but use the Worker-adapted helper functions
    const targetSize = [256, 256];
    const gamma = 0.8;

    const gammaAdjusted = applyGammaWorker(gray, gamma);
    const resized = resizeImageDataWorker(gammaAdjusted, width, height, targetSize[0], targetSize[1]);
    const normalized = normalizeImageWorker(resized);

    const scaleRatio = 0.25;
    const [gradX, gradY] = computeSobelGradientsWorker(normalized, targetSize[0], targetSize[1], scaleRatio);
    const gradientMagnitude = computeGradientMagnitudeWorker(gradX, gradY);

    const globalVar = computeVarianceWorker(normalized);
    const dynamicVarThreshold = Math.max(0.5, globalVar * 2);

    const kernelSize = 16;
    const localVar = computeLocalVarianceWorker(normalized, targetSize[0], targetSize[1], kernelSize);

    let mask = localVar.map(val => val > (dynamicVarThreshold / Math.pow(255.0, 2)));
    const effectivePixels = mask.filter(Boolean).length;
    if (effectivePixels < 100) {
        mask = localVar.map(val => val > 0);
    }

    const maskedGradient = [];
    for (let i = 0; i < gradientMagnitude.length; i++) {
        if (mask[i]) {
            maskedGradient.push(gradientMagnitude[i]);
        }
    }

    const sharpnessScore = calculatePercentileWorker(maskedGradient, 90);
    const maxPossible = Math.sqrt(2 * Math.pow(1.0, 2));
    const normalizedScore = (sharpnessScore / maxPossible) * 100;

    return Math.min(Math.max(Math.round(normalizedScore), 0), 100);
}

/**
 * Method B - Sobel-based image quality assessment
 * Operates on raw pixel data in the worker.
 * @param {Float32Array} gray - Grayscale image data (0-255 range)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} Quality score (0-100)
 */
function method_b_worker(gray, width, height) {
    // Steps are the same, but use the Worker-adapted helper functions
    const [gx, gy] = computeSobelGradientsWorker(gray, width, height);

    let score = 0;
    for (let i = 0; i < gx.length; i++) {
        score += gx[i] * gx[i] + gy[i] * gy[i];
    }
     if (gx.length > 0) {
        score = score / gx.length;
     } else {
         return 0; // Handle empty image case
     }


    const resolutionBaselines = {
        '1024x1024': 350.0,
        '1080x1920': 550.0,
        '1920x1080': 550.0
    };

    const key1 = `${width}x${height}`;
    const key2 = `${height}x${width}`;
    const baseline = resolutionBaselines[key1] ||
                     resolutionBaselines[key2] ||
                     400.0;

    const finalScore = Math.min(score / baseline, 100);

    return Math.round(finalScore);
}

/**
 * Method C - Laplacian-based image quality assessment
 * Operates on raw pixel data in the worker.
 * @param {Float32Array} gray - Grayscale image data (0-255 range)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} Quality score (0-100)
 */
function method_c_worker(gray, width, height) {
    const scales = [3, 5, 9];
    let totalScore = 0;
    let scaleWeights = [0.5, 0.3, 0.2];

    for (let i = 0; i < scales.length; i++) {
        const scale = scales[i];
        const blurred = applyEdgePreservingBlurWorker(gray, width, height, scale);
        const laplacian = computeModifiedLaplacianWorker(blurred, width, height);
        const roi = extractROIWorker(laplacian); // width, height implicitly used by extractROIWorker helpers
        const variance = computeRobustVarianceWorker(roi);

        const resolutionFactor = Math.sqrt((width * height) / (1024 * 1024));
        const baselineAdjustment = (scale === 3) ? 1.0 : (scale === 5) ? 1.2 : 1.5;
        const scaledBaseline = 180 * resolutionFactor * baselineAdjustment;

        const scaleScore = Math.min(100, (scaledBaseline > 0 ? variance / scaledBaseline : 0) * 100); // Avoid division by zero
        totalScore += scaleScore * scaleWeights[i];
    }

    const frequencyScore = computeFrequencyDomainScoreWorker(gray, width, height);
    const textureScore = computeTextureDetailsWorker(gray, width, height);

    const finalScore = 0.7 * totalScore + 0.2 * frequencyScore + 0.1 * textureScore;

    return Math.min(Math.max(Math.round(finalScore), 0), 100);
}


// --- Resize Function (Adapted for Worker) ---

/**
 * Resize Image Data Strategy
 * Operates on raw pixel data in the worker.
 * Returns resized raw pixel data. The final Blob conversion happens in the main thread.
 *
 * @param {Uint8ClampedArray} rgbaData - Raw pixel data (R,G,B,A) from original image
 * @param {number} originalWidth - Original width
 * @param {number} originalHeight - Original height
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @param {string} strategy - 'crop', 'pad', or 'stretch'
 * @returns {object} - { data: Uint8ClampedArray, width: number, height: number } - Resized raw pixel data and new dimensions
 */
function resize_image_strategy_worker(rgbaData, originalWidth, originalHeight, targetWidth, targetHeight, strategy) {
    // Cannot use HTMLImageElement or Canvas in Worker directly.
    // Need to perform pixel manipulations based on the strategy.

    // If already target size, return original data
    if (originalWidth === targetWidth && originalHeight === targetHeight) {
        console.log(`[Worker] Image is already at target resolution ${targetWidth}x${targetHeight}`);
        return { data: rgbaData, width: originalWidth, height: originalHeight }; // Return original data and dimensions
    }

    const originalRatio = originalWidth / originalHeight;
    const targetRatio = targetWidth / targetHeight;

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = originalWidth;
    let sourceHeight = originalHeight;

    let destX = 0;
    let destY = 0;
    let destWidth = targetWidth;
    let destHeight = targetHeight;

    let intermediateWidth = targetWidth;
    let intermediateHeight = targetHeight;
    let intermediateData = new Uint8ClampedArray(targetWidth * targetHeight * 4); // Result array

    // Helper to get pixel (handling out of bounds with clamping or default)
    const getPixel = (data, w, h, x, y) => {
        x = Math.max(0, Math.min(w - 1, Math.round(x))); // Nearest neighbor, clamp
        y = Math.max(0, Math.min(h - 1, Math.round(y)));
        const i = (y * w + x) * 4;
        return [data[i], data[i + 1], data[i + 2], data[i + 3]]; // RGBA
    };

     // Helper to set pixel
     const setPixel = (data, w, h, x, y, r, g, b, a) => {
         if (x >= 0 && x < w && y >= 0 && y < h) {
            const i = (y * w + x) * 4;
            data[i] = r;
            data[i+1] = g;
            data[i+2] = b;
            data[i+3] = a;
         }
     };


    if (strategy === 'stretch') {
        console.log("[Worker] Applying 'stretch' strategy...");
        // Simplest: resize directly using nearest neighbor or bilinear interpolation (bilinear is more complex)
        // Using nearest neighbor for simplicity here:
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const srcX = (x / targetWidth) * originalWidth;
                const srcY = (y / targetHeight) * originalHeight;
                const pixel = getPixel(rgbaData, originalWidth, originalHeight, srcX, srcY);
                setPixel(intermediateData, targetWidth, targetHeight, x, y, ...pixel);
            }
        }

    } else if (strategy === 'crop') {
        console.log("[Worker] Applying 'crop' strategy...");

        if (Math.abs(originalRatio - targetRatio) > 1e-5) {
            if (originalRatio > targetRatio) {
                // Wider than target ratio, crop width from source
                sourceWidth = Math.round(originalHeight * targetRatio);
                sourceX = Math.floor((originalWidth - sourceWidth) / 2);
            } else {
                // Taller than target ratio, crop height from source
                sourceHeight = Math.round(originalWidth / targetRatio);
                sourceY = Math.floor((originalHeight - sourceHeight) / 2);
            }
        }

        // Now resize the cropped source region to the target size
         const x_scale = targetWidth / sourceWidth;
         const y_scale = targetHeight / sourceHeight;

        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                 const srcX = sourceX + (x / x_scale);
                 const srcY = sourceY + (y / y_scale);
                 const pixel = getPixel(rgbaData, originalWidth, originalHeight, srcX, srcY);
                 setPixel(intermediateData, targetWidth, targetHeight, x, y, ...pixel);
            }
        }

    } else if (strategy === 'pad') {
        console.log("[Worker] Applying 'pad' strategy...");

        if (Math.abs(originalRatio - targetRatio) < 1e-5) {
             // Ratios match, just stretch/shrink
            for (let y = 0; y < targetHeight; y++) {
                for (let x = 0; x < targetWidth; x++) {
                    const srcX = (x / targetWidth) * originalWidth;
                    const srcY = (y / targetHeight) * originalHeight;
                    const pixel = getPixel(rgbaData, originalWidth, originalHeight, srcX, srcY);
                    setPixel(intermediateData, targetWidth, targetHeight, x, y, ...pixel);
                }
            }
        } else {
            // Ratios don't match, need padding
            let drawWidth, drawHeight;
            let padX = 0, padY = 0;

            if (originalRatio > targetRatio) {
                // Wider than target, fit width, pad height
                drawWidth = targetWidth;
                drawHeight = Math.round(targetWidth / originalRatio);
                padY = Math.floor((targetHeight - drawHeight) / 2);
            } else {
                // Taller than target, fit height, pad width
                drawHeight = targetHeight;
                drawWidth = Math.round(targetHeight * originalRatio);
                padX = Math.floor((targetWidth - drawWidth) / 2);
            }

            // Fill background (default white RGBA)
            const bgColor = [255, 255, 255, 255]; // White opaque
             intermediateData.fill(bgColor[0]); // Fill R
             for (let i = 0; i < intermediateData.length / 4; i++) {
                 intermediateData[i*4+1] = bgColor[1]; // G
                 intermediateData[i*4+2] = bgColor[2]; // B
                 intermediateData[i*4+3] = bgColor[3]; // A
             }

            // Resize original image to fit within padded area (maintaining aspect ratio)
            const x_scale = drawWidth / originalWidth;
            const y_scale = drawHeight / originalHeight;

            for (let y = 0; y < drawHeight; y++) {
                for (let x = 0; x < drawWidth; x++) {
                     const srcX = (x / x_scale);
                     const srcY = (y / y_scale);
                     const pixel = getPixel(rgbaData, originalWidth, originalHeight, srcX, srcY);
                     // Draw onto the intermediate canvas at the padded position
                     setPixel(intermediateData, targetWidth, targetHeight, padX + x, padY + y, ...pixel);
                }
            }
        }
    } else {
        console.error(`[Worker] Unknown strategy: ${strategy}`);
        // Return original data or throw error? Let's return original data but log error.
         return { data: rgbaData, width: originalWidth, height: originalHeight };
    }

    return { data: intermediateData, width: targetWidth, height: targetHeight };
}


// --- Worker Message Handling ---

self.onmessage = async (event) => {
    const { id, method, imageData, width, height, params } = event.data;
    console.log(`[Worker ${id}] Received job for method: ${method}`);

    try {
        let result = null;
        let responseData = {};

        switch (method) {
            case 'method_a':
                const gray_a = convertToGrayscaleWorker(imageData, width, height);
                result = method_a_worker(gray_a, width, height);
                responseData = { score: result };
                break;
            case 'method_b':
                const gray_b = convertToGrayscaleWorker(imageData, width, height);
                result = method_b_worker(gray_b, width, height);
                responseData = { score: result };
                break;
            case 'method_c':
                const gray_c = convertToGrayscaleWorker(imageData, width, height);
                result = method_c_worker(gray_c, width, height);
                responseData = { score: result };
                break;
            case 'resize_image_strategy':
                const { targetWidth, targetHeight, strategy } = params;
                const resizeResult = resize_image_strategy_worker(imageData, width, height, targetWidth, targetHeight, strategy);
                 // For resize, send back the processed pixel data and its new dimensions
                 responseData = {
                     data: resizeResult.data,
                     width: resizeResult.width,
                     height: resizeResult.height
                 };
                break;
            default:
                throw new Error(`[Worker ${id}] Unknown method: ${method}`);
        }

        console.log(`[Worker ${id}] Finished method: ${method}`);
        // Post success message back to main thread
        // Use the transferable object list for performance
        self.postMessage({ id, status: 'success', method, ...responseData },
                          responseData.data ? [responseData.data.buffer] : []); // Transfer ArrayBuffer for pixel data

    } catch (error) {
        console.error(`[Worker ${id}] Error in method "${method}":`, error);
        // Post error message back to main thread
        self.postMessage({
            id,
            status: 'error',
            method,
            error: {
                message: error.message,
                name: error.name,
                // stack: error.stack // Consider if needed; can be large
            }
        });
    }
};

console.log("[Image Processing Worker] Initialized and ready.");