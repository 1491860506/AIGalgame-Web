<template>
  <div class="image-quality-checker">
    <header>
      <h1>AI图像质量检查 & 处理工具</h1>
      <div class="user-info">
        <div class="timestamp">{{ currentTimestamp }}</div>
        <div class="username">{{ username }}</div>
      </div>
    </header>
    
    <div class="uploader-section">
      <div class="file-drop-area" 
           :class="{ active: isDragging }" 
           @dragenter.prevent="onDragEnter" 
           @dragover.prevent="onDragOver" 
           @dragleave.prevent="onDragLeave" 
           @drop.prevent="onFileDrop">
        <input type="file" 
               ref="fileInput" 
               @change="onFileSelected" 
               accept="image/*" 
               :multiple="false" />
        <div class="drop-message">
          <span v-if="!imageFile">
            <i class="fas fa-cloud-upload-alt"></i>
            拖拽图片文件到这里或点击选择
          </span>
          <span v-else>
            <i class="fas fa-check-circle"></i>
            已选择文件: {{ imageFile.name }}
          </span>
        </div>
      </div>
    </div>
    
    <div class="options-section" v-if="imageFile">
      <div class="image-preview">
        <img :src="previewUrl" alt="Image preview" />
      </div>
      
      <div class="options-panel">
        <h2>图像质量评估</h2>
        
        <div class="quality-results">
          <div class="quality-method" v-for="(score, name) in qualityScores" :key="name">
            <div class="method-name">{{ name }}</div>
            <div class="progress-bar">
              <div class="progress" :style="{ width: `${score}%` }"></div>
            </div>
            <div class="score-value">{{ score }}%</div>
          </div>
          
          <button class="check-quality-btn" 
                  @click="checkImageQuality" 
                  :disabled="isProcessing">
            {{ isProcessing ? '处理中...' : '检测图像质量' }}
          </button>
        </div>
        
        <h2>图像处理选项</h2>
        
        <div class="resize-options">
          <div class="input-group">
            <label for="target-width">目标宽度</label>
            <input type="number" id="target-width" v-model.number="targetWidth" min="1" />
          </div>
          
          <div class="input-group">
            <label for="target-height">目标高度</label>
            <input type="number" id="target-height" v-model.number="targetHeight" min="1" />
          </div>
          
          <div class="input-group">
            <label for="resize-strategy">调整策略</label>
            <select id="resize-strategy" v-model="resizeStrategy">
              <option value="crop">裁剪 (Crop)</option>
              <option value="pad">填充 (Pad)</option>
              <option value="stretch">拉伸 (Stretch)</option>
            </select>
          </div>
          
          <button class="resize-btn" 
                  @click="resizeImage" 
                  :disabled="isProcessing">
            {{ isProcessing ? '处理中...' : '调整图片尺寸' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 结果展示区域 -->
    <div class="results-section" v-if="processedImageUrl">
      <h2>处理结果</h2>
      <div class="result-image">
        <img :src="processedImageUrl" alt="Processed image" />
      </div>
      <div class="result-actions">
        <button class="download-btn" @click="downloadProcessedImage">
          <i class="fas fa-download"></i> 下载处理后的图片
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { method_a, method_b, method_c, resize_image_strategy } from './services/ImageProcessor';

export default {
  name: 'ImageQualityChecker',
  data() {
    return {
      currentTimestamp: '2025-04-19 06:40:58',
      username: 'djfaaa',
      
      imageFile: null,
      previewUrl: null,
      processedImageUrl: null,
      processedBlob: null,
      
      isDragging: false,
      isProcessing: false,
      
      targetWidth: 1024,
      targetHeight: 1024,
      resizeStrategy: 'crop',
      
      qualityScores: {
        '方法A (边缘检测)': 0,
        '方法B (Sobel梯度)': 0,
        '方法C (Laplacian)': 0
      }
    };
  },
  methods: {
    // File handling methods
    onDragEnter(e) {
      this.isDragging = true;
    },
    
    onDragOver(e) {
      this.isDragging = true;
    },
    
    onDragLeave(e) {
      this.isDragging = false;
    },
    
    onFileDrop(e) {
      this.isDragging = false;
      
      if (e.dataTransfer.files.length > 0) {
        this.handleFileSelection(e.dataTransfer.files[0]);
      }
    },
    
    onFileSelected(e) {
      if (e.target.files.length > 0) {
        this.handleFileSelection(e.target.files[0]);
      }
    },
    
    handleFileSelection(file) {
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      
      this.imageFile = file;
      this.previewUrl = URL.createObjectURL(file);
      
      // Reset processing results
      this.processedImageUrl = null;
      this.processedBlob = null;
      
      // Reset quality scores
      for (const key in this.qualityScores) {
        this.qualityScores[key] = 0;
      }
    },
    
    // Image quality assessment
    async checkImageQuality() {
      if (!this.imageFile) return;
      
      this.isProcessing = true;
      
      try {
        // Run all three methods concurrently
        const [scoreA, scoreB, scoreC] = await Promise.all([
          method_a(this.imageFile, this.targetWidth, this.targetHeight, this.resizeStrategy),
          method_b(this.imageFile, this.targetWidth, this.targetHeight, this.resizeStrategy),
          method_c(this.imageFile, this.targetWidth, this.targetHeight, this.resizeStrategy)
        ]);
        
        // Update scores with animation
        this.animateScores({
          '方法A (边缘检测)': scoreA,
          '方法B (Sobel梯度)': scoreB,
          '方法C (Laplacian)': scoreC
        });
        
      } catch (error) {
        console.error('Image quality assessment failed:', error);
        alert('图像质量评估失败: ' + error.message);
      } finally {
        this.isProcessing = false;
      }
    },
    
    animateScores(targetScores) {
      const duration = 1000; // Animation duration in ms
      const startTime = performance.now();
      const startScores = { ...this.qualityScores };
      
      const animate = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Update scores based on progress
        for (const key in targetScores) {
          const start = startScores[key] || 0;
          const target = targetScores[key];
          this.qualityScores[key] = Math.round(start + (target - start) * progress);
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    },
    
    // Image resizing
    async resizeImage() {
      if (!this.imageFile) return;
      
      this.isProcessing = true;
      
      try {
        // Process image
        const processedBlob = await resize_image_strategy(
          this.imageFile,
          this.targetWidth,
          this.targetHeight,
          this.resizeStrategy
        );
        
        // Update preview
        if (this.processedImageUrl) {
          URL.revokeObjectURL(this.processedImageUrl);
        }
        
        this.processedBlob = processedBlob;
        this.processedImageUrl = URL.createObjectURL(processedBlob);
        
      } catch (error) {
        console.error('Image processing failed:', error);
        alert('图像处理失败: ' + error.message);
      } finally {
        this.isProcessing = false;
      }
    },
    
    // Download processed image
    downloadProcessedImage() {
      if (!this.processedBlob) return;
      
      const filename = this.getProcessedFilename(this.imageFile.name);
      const a = document.createElement('a');
      a.href = this.processedImageUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    
    getProcessedFilename(originalName) {
      const parts = originalName.split('.');
      const extension = parts.pop();
      const baseName = parts.join('.');
      return `${baseName}_processed_${this.resizeStrategy}_${this.targetWidth}x${this.targetHeight}.${extension}`;
    }
  },
  beforeUnmount() {
    // Clean up object URLs
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    if (this.processedImageUrl) {
      URL.revokeObjectURL(this.processedImageUrl);
    }
  }
}
</script>

<style scoped>
/* Use variables defined in App.vue's global styles */
.image-quality-checker {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  /* Use the text-primary variable */
  color: var(--text-primary, #1e293b);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

h1 {
  font-size: 24px;
  margin: 0;
  /* Use the primary-color variable */
  color: var(--primary-color, #4f46e5);
}

.user-info {
  text-align: right;
  font-size: 13px;
  /* Use the text-secondary variable */
  color: var(--text-secondary, #64748b);
}

.username {
  font-weight: 600;
  margin-top: 3px;
}

.uploader-section {
  margin-bottom: 30px;
}

.file-drop-area {
  position: relative;
  /* Use the border-color variable */
  border: 2px dashed var(--border-color, #e2e8f0);
  border-radius: 8px;
  padding: 50px 20px;
  text-align: center;
  transition: all 0.3s;
  /* Use the sidebar-bg variable */
  background-color: var(--sidebar-bg, #f8fafc);
  cursor: pointer;
}

.file-drop-area.active {
  /* Use the primary-color variable for border */
  border-color: var(--primary-color, #4f46e5);
  /* Default background color for light mode */
  background-color: rgba(79, 70, 229, 0.05);
}

/* --- Dark mode specific styles for the active drop area --- */
/* Use :deep to target the class on the body from this scoped component */
:deep(body.dark-theme) .file-drop-area.active {
  /* Use a different background color for dark theme active state */
  /* Option 1: A slightly more visible transparent primary color */
   background-color: rgba(79, 70, 229, 0.1);
  /* Option 2: A transparent version of the dark sidebar background itself (less prominent) */
  /* background-color: rgba(15, 23, 42, 0.15); */
  /* Option 3: A transparent version of the hover background color */
  /* background-color: rgba(51, 65, 85, 0.15); */
}
/* ---------------------------------------------------------- */


.file-drop-area input[type="file"] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.drop-message {
  font-size: 16px;
  /* Use the text-secondary variable */
  color: var(--text-secondary, #64748b);
}

.drop-message i {
  font-size: 24px;
  margin-right: 10px;
  /* Use the primary-color variable */
  color: var(--primary-color, #4f46e5);
}

.options-section {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
}

.image-preview {
  flex: 1;
  max-width: 400px;
  border-radius: 8px;
  overflow: hidden;
  /* Use the shadow variable */
  box-shadow: var(--shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.options-panel {
  flex: 1;
  /* Use the sidebar-bg variable */
  background-color: var(--sidebar-bg, #f8fafc);
  border-radius: 8px;
  padding: 20px;
  /* Use the shadow variable */
  box-shadow: var(--shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
}

h2 {
  font-size: 18px;
  margin: 0 0 15px;
}

.quality-results {
  margin-bottom: 30px;
}

.quality-method {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.method-name {
  width: 150px;
  font-size: 14px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  /* Use the border-color variable */
  background-color: var(--border-color, #e2e8f0);
  border-radius: 4px;
  overflow: hidden;
  margin: 0 15px;
}

.progress {
  height: 100%;
  /* Use the primary-color variable */
  background-color: var(--primary-color, #4f46e5);
  width: 0;
  transition: width 1s ease-out;
}

.score-value {
  font-weight: 600;
  width: 50px;
  text-align: right;
}

.check-quality-btn {
  width: 100%;
  /* Use the primary-color variable */
  background-color: var(--primary-color, #4f46e5);
  color: white; /* White text works on both light and dark primary color */
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 15px;
}

.check-quality-btn:hover:not(:disabled) {
  /* Use the primary-hover variable */
  background-color: var(--primary-hover, #4338ca);
}

.check-quality-btn:disabled {
  /* Use the text-secondary variable */
  background-color: var(--text-secondary, #64748b);
  opacity: 0.6;
  cursor: not-allowed;
}

.resize-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.input-group {
  margin-bottom: 10px;
}

.input-group:last-of-type {
  grid-column: span 2;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  /* Use the text-primary variable */
  color: var(--text-primary, #1e293b);
}

input[type="number"],
select {
  width: 100%;
  padding: 10px;
  /* Use the border-color variable */
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 4px;
  font-size: 14px;
  /* Use the text-primary variable */
  color: var(--text-primary, #1e293b);
  /* Use sidebar-bg as background for consistency with panels */
  /* Note: App.vue's global :deep rule also sets this in dark mode,
           but setting it here makes the component more self-contained. */
  background-color: var(--sidebar-bg, white); /* Use sidebar-bg variable */
}

/* Adjustments for input/select background in dark mode */
/* Note: This rule might be redundant if App.vue already handles it globally with :deep */
:deep(body.dark-theme) input[type="number"],
:deep(body.dark-theme) select {
    background-color: var(--sidebar-bg); /* Ensure dark mode background */
    color: var(--text-primary); /* Ensure dark mode text color */
    border-color: var(--border-color); /* Ensure dark mode border color */
}


.resize-btn {
  grid-column: span 2;
  /* Use the primary-color variable */
  background-color: var(--primary-color, #4f46e5);
  color: white; /* White text works on both light and dark primary color */
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.resize-btn:hover:not(:disabled) {
  /* Use the primary-hover variable */
  background-color: var(--primary-hover, #4338ca);
}

.resize-btn:disabled {
  /* Use the text-secondary variable */
  background-color: var(--text-secondary, #64748b);
  opacity: 0.6;
  cursor: not-allowed;
}

.results-section {
  margin-top: 30px;
  /* Use the sidebar-bg variable */
  background-color: var(--sidebar-bg, #f8fafc);
  border-radius: 8px;
  padding: 20px;
  /* Use the shadow variable */
  box-shadow: var(--shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
}

.result-image {
  margin: 15px 0;
  text-align: center;
}

.result-image img {
  max-width: 100%;
  max-height: 500px;
  border-radius: 4px;
  /* Use the shadow variable from App.vue */
  box-shadow: var(--shadow, 0 2px 6px rgba(0, 0, 0, 0.1));
}

.result-actions {
  text-align: center;
  margin-top: 20px;
}

.download-btn {
  /* Use the primary-color variable */
  background-color: var(--primary-color, #4f46e5);
  color: white; /* White text works on both light and dark primary color */
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.download-btn:hover {
  /* Use the primary-hover variable */
  background-color: var(--primary-hover, #4338ca);
}

.download-btn i {
  font-size: 16px;
}

/* --- Explicit Dark mode overrides (mostly redundant due to App.vue's :deep rules, but kept for clarity) --- */
/* These rules are likely covered by App.vue's global :deep rules targeting body.dark-theme,
   but defining them here makes the component's dark mode support clearer within its own scope. */
/* Note: If App.vue's :deep rules are more specific or use !important, they might override these. */
/* However, standard cascading should allow these scoped rules with :deep to work. */
:deep(body.dark-theme) .image-quality-checker {
    /* color is already handled by var(--text-primary) */
}

:deep(body.dark-theme) .file-drop-area,
:deep(body.dark-theme) .options-panel,
:deep(body.dark-theme) .results-section {
  /* background-color is already handled by var(--sidebar-bg) */
  /* border-color is already handled by var(--border-color) */
}

:deep(body.dark-theme) .drop-message,
:deep(body.dark-theme) .user-info,
:deep(body.dark-theme) .method-name,
:deep(body.dark-theme) .score-value,
:deep(body.dark-theme) .input-group label {
  /* color is already handled by var(--text-secondary) or var(--text-primary) */
}

:deep(body.dark-theme) .progress-bar {
    /* background-color is already handled by var(--border-color) */
}

/* ------------------------------------------------------------------------------------------- */


/* Responsive design */
@media (max-width: 768px) {
  .options-section {
    flex-direction: column;
  }
  
  .image-preview {
    max-width: 100%;
  }
  
  .resize-options {
    grid-template-columns: 1fr;
  }
  
  .input-group:last-of-type,
  .resize-btn {
    grid-column: auto;
  }
}
</style>