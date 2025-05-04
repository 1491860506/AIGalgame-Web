<template>
  <div class="tab-content-container processing-tab-content">
    <div class="title-frame">
      <h3 class="title-label">AI 绘画后处理设置</h3>
      <span class="subtitle-label">配置图像背景移除 (rembg) 和分辨率自动调整参数。</span>
    </div>

    <hr class="separator thin-separator">

    <!-- rembg配置区域 -->
    <div class="section-frame card">
      <h4 class="section-title">背景去除设置 (rembg)</h4>

      <div class="form-grid rembg-grid">
         <div class="form-group grid-span-2">
            <label for="rembg-location" class="form-label">rembg 服务地址:</label>
            <input
              id="rembg-location"
              type="text"
              v-model="rembgLocation"
              class="input"
              placeholder="例如: http://localhost:7000/api/remove"
              @focus="clearSelection"
            />
         </div>

         <div class="form-group">
            <label for="rembg-model-select" class="form-label">rembg 模型:</label>
            <select
               id="rembg-model-select"
              v-model="rembgModel"
              class="select"
              @focus="loadRembgModels"
            >
               <option v-if="rembgModels.length === 0" value="" disabled>-- 无可用模型 --</option>
              <option v-for="model in rembgModels" :key="model" :value="model">{{ model }}</option>
            </select>
         </div>

        <!-- 模型导入功能 -->
        <div class="form-group model-import-group">
          <label class="form-label">上传新模型 (.onnx):</label>
          <div class="file-upload-wrapper">
              <label for="model-file-input" class="btn btn-outline btn-sm file-input-label">
                  <font-awesome-icon :icon="['fas', 'folder-open']" />
                  {{ modelFile ? modelFile.name : '选择文件...' }}
              </label>
              <input
                type="file"
                accept=".onnx"
                id="model-file-input"
                ref="modelFileInput"
                class="hidden-file-input"
                @change="handleModelFileChange"
              />
            <button class="btn btn-secondary btn-sm" @click="uploadModel" :disabled="!modelFile || uploadStatus === '正在上传...'">
              <font-awesome-icon :icon="['fas', 'upload']" /> 上传
            </button>
          </div>
           <div v-if="uploadStatus" class="upload-status" :class="{'upload-success': uploadSuccess, 'upload-error': !uploadSuccess}">
              <font-awesome-icon :icon="['fas', uploadSuccess ? 'check-circle' : 'times-circle']" />
              {{ uploadStatus }}
           </div>
        </div>
      </div>

      <div class="button-frame single-button">
        <button class="btn btn-secondary" @click="saveProcessingConfig">
          <font-awesome-icon :icon="['fas', 'save']" /> 保存 Rembg 设置
        </button>
      </div>
    </div>

    <!-- 分辨率调整设置区域 -->
    <div class="section-frame card">
      <h4 class="section-title">分辨率调整设置</h4>

      <!-- 人物分辨率调整 -->
      <div class="resolution-section">
         <div class="toggle-row">
           <div class="switch-container">
             <div class="switch">
               <input type="checkbox" id="char-res-switch" v-model="characterResolution" @change="saveProcessingConfig" />
               <label for="char-res-switch" class="switch-slider"></label>
             </div>
             <label for="char-res-switch" class="switch-label label-bold">启用人物绘画分辨率调整</label>
           </div>
         </div>

        <div v-if="characterResolution" class="settings-container">
          <div class="form-grid resolution-grid">
            <div class="form-group">
              <label for="char-width-input" class="form-label">目标宽度 (px):</label>
              <input
                id="char-width-input"
                type="number"
                v-model.number="characterWidth"
                class="input size-input"
                min="1" max="4096"
                @blur="validateAndSave('width')"
                @keyup.enter="validateAndSave('width')"
              />
            </div>

             <div class="form-group">
                <label for="char-height-input" class="form-label">目标高度 (px):</label>
                <input
                  id="char-height-input"
                  type="number"
                  v-model.number="characterHeight"
                  class="input size-input"
                  min="1" max="4096"
                  @blur="validateAndSave('height')"
                  @keyup.enter="validateAndSave('height')"
                />
             </div>

            <div class="form-group">
              <label for="char-resize-select" class="form-label">非目标比例处理:</label>
              <select id="char-resize-select" v-model="characterResize" class="select medium-select" @change="saveProcessingConfig">
                <option value="裁剪">裁剪 (Crop)</option>
                <option value="填充">填充 (Pad)</option>
                <option value="拉伸">拉伸 (Stretch)</option>
              </select>
            </div>
          </div>
          <p class="tip-text help-text">设置人物图的目标分辨率及比例不符时的处理方式。</p>
        </div>
      </div>

      <hr class="separator thin-separator" />

      <!-- 背景分辨率调整 -->
      <div class="resolution-section">
          <div class="toggle-row">
              <div class="switch-container">
                 <div class="switch">
                   <input type="checkbox" id="bg-res-switch" v-model="backgroundResolution" @change="saveProcessingConfig" />
                   <label for="bg-res-switch" class="switch-slider"></label>
                 </div>
                 <label for="bg-res-switch" class="switch-label label-bold">启用背景绘画分辨率调整 (至 16:9)</label>
              </div>
          </div>

        <div v-if="backgroundResolution" class="settings-container">
           <div class="form-grid resolution-grid single-col-grid"> <!-- Use single column for this one -->
              <div class="form-group">
                <label for="bg-resize-select" class="form-label">非 16:9 比例处理:</label>
                <select id="bg-resize-select" v-model="backgroundResize" class="select medium-select" @change="saveProcessingConfig">
                  <option value="裁剪">裁剪 (Crop)</option>
                  <option value="填充">填充 (Pad)</option>
                  <option value="拉伸">拉伸 (Stretch)</option>
                </select>
              </div>
           </div>
           <p class="tip-text help-text">背景图将自动调整为 16:9 比例，此选项控制调整方法。</p>
        </div>
      </div>
    </div>

    <!-- 状态显示区域 -->
    <div class="status-frame">
      <span class="status-label">{{ processingStatus }}</span>
    </div>
  </div>
</template>

<script>
// --- Script remains unchanged ---
import { writeFile, listDirectory, createFolder } from './services/IndexedDBFileSystem.js'; // Added createFolder

export default {
  name: 'ProcessingTabContent',
  data() {
    return {
      rembgLocation: "http://localhost:7000/api/remove",
      rembgModel: "isnet-anime",
      rembgModels: ["isnet-anime"],
      modelFile: null,
      uploadStatus: "",
      uploadSuccess: false,
      characterResolution: false,
      backgroundResolution: false,
      characterWidth: 1024,
      characterHeight: 1024,
      characterResize: "裁剪",
      backgroundResize: "裁剪",
      processingStatus: "准备就绪"
    }
  },
  methods: {
    clearSelection(event) {
      // event.target.select(); // This might be annoying, consider removing if not needed
    },
    loadProcessingConfig() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        if (!configStr) { this.initializeDefaultProcessingConfig(); return; } // Init if no config

        const config = JSON.parse(configStr);
        // Ensure processing_config exists
        if (!config.AI_draw || !config.AI_draw.processing_config) {
             this.initializeDefaultProcessingConfig(); // Init if structure missing
             // Use the initialized defaults if necessary by re-reading config
             const updatedConfigStr = localStorage.getItem('aiGalgameConfig');
             const updatedConfig = updatedConfigStr ? JSON.parse(updatedConfigStr) : config;
             const processingConfig = updatedConfig?.AI_draw?.processing_config || {};
             this.applyConfigValues(processingConfig);
        } else {
             this.applyConfigValues(config.AI_draw.processing_config);
        }

        this.loadRembgModels(); // Load models after potentially initializing
      } catch (error) {
        console.error("加载后处理配置时出错:", error);
        this.$emit('show-message', { title: "error", message: `加载后处理配置失败: ${error.message}`});
         this.initializeDefaultProcessingConfig(); // Attempt to initialize on error
         this.loadRembgModels(); // Load models after potential init
      }
    },

    // Helper to apply loaded values to data properties
    applyConfigValues(processingConfig) {
        this.rembgLocation = processingConfig.rembg_location || "http://localhost:7000/api/remove";
        this.rembgModel = processingConfig.rembg_model || "isnet-anime";
        this.characterResolution = processingConfig.character_resolution === true; // Ensure boolean
        this.backgroundResolution = processingConfig.background_resolution === true; // Ensure boolean
        this.characterWidth = parseInt(processingConfig.character_width, 10) || 1024;
        this.characterHeight = parseInt(processingConfig.character_height, 10) || 1024;
        this.characterResize = processingConfig.character_resize || "裁剪";
        this.backgroundResize = processingConfig.background_resize || "裁剪";
    },

     // Helper to initialize defaults if missing
     initializeDefaultProcessingConfig() {
        try {
            const configStr = localStorage.getItem('aiGalgameConfig');
            let config = {};
            try { config = configStr ? JSON.parse(configStr) : {}; } catch (e) { console.error("Error parsing LS on init processing default:", e); }

            let needsSave = false;
            if (!config.AI_draw) { config.AI_draw = {}; needsSave = true; }
            if (!config.AI_draw.processing_config) {
                config.AI_draw.processing_config = { // Set all defaults
                    rembg_location: "http://localhost:7000/api/remove",
                    rembg_model: "isnet-anime",
                    character_resolution: false,
                    background_resolution: false,
                    character_width: 1024,
                    character_height: 1024,
                    character_resize: "裁剪",
                    background_resize: "裁剪",
                };
                needsSave = true;
            } else {
                // Check individual defaults if processing_config exists but might be incomplete
                const pc = config.AI_draw.processing_config;
                if (pc.rembg_location === undefined) { pc.rembg_location = "http://localhost:7000/api/remove"; needsSave = true; }
                if (pc.rembg_model === undefined) { pc.rembg_model = "isnet-anime"; needsSave = true; }
                if (pc.character_resolution === undefined) { pc.character_resolution = false; needsSave = true; }
                if (pc.background_resolution === undefined) { pc.background_resolution = false; needsSave = true; }
                if (pc.character_width === undefined) { pc.character_width = 1024; needsSave = true; }
                if (pc.character_height === undefined) { pc.character_height = 1024; needsSave = true; }
                if (pc.character_resize === undefined) { pc.character_resize = "裁剪"; needsSave = true; }
                if (pc.background_resize === undefined) { pc.background_resize = "裁剪"; needsSave = true; }
            }

            if (needsSave) {
                localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
                console.log("Initialized/Updated default processing config in localStorage.");
            }
        } catch (error) {
            console.error("初始化默认后处理配置时出错:", error);
        }
    },

    async loadRembgModels() {
      const modelDir = "/data/source/rembg-model";
      try {
        const files = await listDirectory(modelDir);
        const modelNames = files
          .filter(file => !file.isFolder && file.name.toLowerCase().endsWith('.onnx'))
          .map(file => file.name.replace(/\.onnx$/i, '')); // Case-insensitive extension removal

        if (modelNames.length > 0) {
          this.rembgModels = modelNames.sort(); // Sort alphabetically
           // Ensure the currently selected model still exists, otherwise default
           if (!this.rembgModels.includes(this.rembgModel)) {
                this.rembgModel = this.rembgModels[0] || "isnet-anime"; // Fallback further if needed
           }
        } else {
            this.rembgModels = ["isnet-anime"]; // Default if directory is empty
             this.rembgModel = "isnet-anime";
        }
      } catch (error) {
        if (error.message && error.message.includes("目录不存在")) {
          console.log(`Directory ${modelDir} not found, attempting to create.`);
          try {
            await this.ensureRembgModelDir(); // Create directory
            this.rembgModels = ["isnet-anime"]; // Set default after creation
            this.rembgModel = "isnet-anime";
          } catch (dirError) {
            console.error("创建rembg模型目录时出错:", dirError);
            this.rembgModels = ["isnet-anime"]; // Fallback default
             this.rembgModel = "isnet-anime";
          }
        } else {
          console.error("加载rembg模型列表时出错:", error);
          this.rembgModels = ["isnet-anime"]; // Fallback default
           this.rembgModel = "isnet-anime";
        }
      }
    },
    async ensureRembgModelDir() {
        // Use createFolder which handles nested creation
        const modelDir = "/data/source/rembg-model";
        try {
           await createFolder(modelDir);
           console.log(`Ensured directory exists: ${modelDir}`);
           // Optional: Create a placeholder file if needed, but createFolder is usually sufficient
           // await writeFile(`${modelDir}/.placeholder`, "rembg models directory");
        } catch (error) {
            // Ignore "already exists" errors
            if (!error.message.includes('文件夹已存在') && !error.message.includes('Key already exists')) {
                console.error(`创建目录 ${modelDir} 时出错:`, error);
                throw error; // Re-throw critical errors
            }
        }
    },
    handleModelFileChange(event) {
      const files = event.target.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.name.toLowerCase().endsWith('.onnx')) {
          this.modelFile = file;
          this.uploadStatus = `已选择: ${file.name}`;
          this.uploadSuccess = true; // Mark as ready
        } else {
          this.modelFile = null;
          this.uploadStatus = "错误: 请选择 .onnx 文件";
          this.uploadSuccess = false;
           this.$emit('show-message', { title: "error", message: "请选择 ONNX 格式的模型文件 (.onnx)" });
           event.target.value = ''; // Clear invalid selection
        }
      } else {
        this.modelFile = null;
        this.uploadStatus = "";
      }
    },
    async uploadModel() {
      if (!this.modelFile) {
        this.uploadStatus = "错误: 未选择文件";
        this.uploadSuccess = false;
        return;
      }

      this.uploadStatus = "正在上传...";
      this.uploadSuccess = false;
      try {
        await this.ensureRembgModelDir(); // Ensure directory exists

        // No need for FileReader if writeFile handles Blob/File directly
        const filePath = `/data/source/rembg-model/${this.modelFile.name}`;
        await writeFile(filePath, this.modelFile); // Pass the File object

        this.uploadStatus = `模型 "${this.modelFile.name}" 上传成功`;
        this.uploadSuccess = true;
        await this.loadRembgModels(); // Refresh dropdown

        // Select the newly uploaded model
        const modelNameOnly = this.modelFile.name.replace(/\.onnx$/i, '');
        if (this.rembgModels.includes(modelNameOnly)) {
             this.rembgModel = modelNameOnly;
             this.saveProcessingConfig(); // Save selection
        }

        this.$refs.modelFileInput.value = ''; // Clear file input
        this.modelFile = null;
         this.$emit('show-message', { title: "success", message: this.uploadStatus });

      } catch (error) {
        console.error("上传模型时出错:", error);
        this.uploadStatus = `上传失败: ${error.message}`;
        this.uploadSuccess = false;
        this.$emit('show-message', { title: "error", message: this.uploadStatus });
      }
    },
    saveProcessingConfig() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        const config = configStr ? JSON.parse(configStr) : {};
        if (!config.AI_draw) config.AI_draw = {};
        // Initialize sub-object if it doesn't exist
        if (!config.AI_draw.processing_config) config.AI_draw.processing_config = {};

        // Create the processing config object with current values
        const processingConfig = {
          rembg_location: this.rembgLocation || "http://localhost:7000/api/remove",
          rembg_model: this.rembgModel || "isnet-anime",
          character_resolution: this.characterResolution, // Save boolean
          background_resolution: this.backgroundResolution, // Save boolean
           // Save numbers, ensuring they are valid
          character_width: parseInt(this.characterWidth, 10) || 1024,
          character_height: parseInt(this.characterHeight, 10) || 1024,
          character_resize: this.characterResize,
          background_resize: this.backgroundResize
        };

        // Update the main config object
        config.AI_draw.processing_config = processingConfig;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));

        this.processingStatus = "设置已保存";
        setTimeout(() => { this.processingStatus = "准备就绪"; }, 2000);
        this.$emit('show-message', { title: "success", message: "后处理配置已保存！" });
      } catch (error) {
        console.error("保存后处理配置时出错:", error);
        this.$emit('show-message', { title: "error", message: `保存失败: ${error.message}` });
        this.processingStatus = "保存失败";
      }
    },
     validateAndSave(type) {
        const isWidth = type === 'width';
        let currentValue = isWidth ? this.characterWidth : this.characterHeight;
        let num = parseInt(currentValue, 10);

        if (isNaN(num)) {
            num = 1024; // Default if invalid
        } else {
             num = Math.max(1, Math.min(4096, num)); // Clamp between 1 and 4096
        }

        // Update the data property
        if (isWidth) {
            this.characterWidth = num;
        } else {
            this.characterHeight = num;
        }

        // Save the config after validation
        this.saveProcessingConfig();
    }
  },
  mounted() {
    this.loadProcessingConfig();
  }
}
</script>

<style scoped>
/* Reuse styles from Character/BackgroundTabContent where applicable */
.tab-content-container { /* Basic container */ }

.title-frame { margin-bottom: 15px; }
.title-label { font-size: 1.4rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.subtitle-label { font-size: 0.95rem; color: var(--text-secondary); }

.separator { border: none; border-top: 1px solid var(--border-color); margin: 15px 0; }
.thin-separator { margin: 10px 0; border-color: var(--hover-overlay); }

.section-frame { /* uses .card */ margin-bottom: 25px; padding: 20px; }
.section-title { font-size: 1.1rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 20px; padding-bottom: 8px; border-bottom: 1px dashed var(--border-color); }

/* Form Grid */
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px 25px; /* Row gap, Column gap */
}
.grid-span-2 {
    grid-column: span 2 / span 2;
}
@media (max-width: 600px) {
   .grid-span-2 { grid-column: span 1 / span 1; }
}

.form-group { margin-bottom: 0; } /* Remove margin when inside grid */
.form-label { display: block; margin-bottom: 6px; color: var(--text-secondary); font-size: 0.95rem; font-weight: 500; }
.input-field { /* Base for text input and select */ width: 100%; }
.input { /* From global */ }
.select { /* From global */ }

/* Rembg Specific */
.rembg-grid { /* Specific grid layout for rembg */ }
.model-import-group label { margin-bottom: 8px; } /* Extra space for button row */

.file-upload-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
}
.hidden-file-input {
    width: 0.1px; height: 0.1px; opacity: 0;
    overflow: hidden; position: absolute; z-index: -1;
}
.file-input-label {
    /* uses .btn .btn-outline .btn-sm */
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: calc(100% - 100px); /* Adjust based on upload button width */
    flex-grow: 1;
    justify-content: flex-start; /* Align text left */
}
.upload-status {
    font-size: 0.85rem;
    margin-top: 8px;
    padding: 5px 8px;
    border-radius: var(--border-radius-sm);
}
.upload-success { color: var(--secondary-dark); background-color: rgba(var(--secondary-color-rgb, 46, 204, 113), 0.1); border: 1px solid var(--secondary-light); }
.upload-error { color: var(--danger-dark); background-color: rgba(var(--danger-color-rgb, 231, 76, 60), 0.1); border: 1px solid var(--danger-light); }
.upload-status .fa-icon { margin-right: 5px; }

.button-frame { margin-top: 20px; display: flex; }
.button-frame.single-button { justify-content: flex-end; } /* Align single save button right */
.button-frame .btn { /* Uses global .btn */ }


/* Resolution Settings */
.resolution-section { margin-bottom: 20px; }
.resolution-section:last-child { margin-bottom: 0; }
.toggle-row { margin-bottom: 15px; }
.settings-container {
    padding-left: 20px; /* Indent settings under toggle */
    margin-top: 10px;
    border-left: 2px solid var(--hover-overlay);
}
.resolution-grid { gap: 15px 20px; }
.size-input { /* uses .input */ max-width: 100px; text-align: center; }
.medium-select { /* uses .select */ max-width: 150px; }
.single-col-grid { grid-template-columns: minmax(200px, 300px); } /* Limit width for single column grid */
.tip-text { margin-top: 10px; }
.help-text { font-size: 0.85rem; color: var(--text-tertiary); line-height: 1.4; }

/* Shared Switch Styles */
.switch-container { display: flex; align-items: center; gap: 10px; }
/* Use global .switch styles here */
.switch { position: relative; display: inline-block; width: 50px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border-color); transition: .4s; border-radius: 24px; }
.switch-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.switch input:checked + .switch-slider { background-color: var(--primary-color); }
.switch input:focus + .switch-slider { box-shadow: 0 0 1px var(--primary-color); }
.switch input:checked + .switch-slider:before { transform: translateX(26px); }
/* End global switch styles */
.switch-label { font-size: 1rem; color: var(--text-primary); cursor: pointer; }
.label-bold { font-weight: 600; }


/* Status Bar */
.status-frame { margin-top: 20px; padding: 8px 12px; background-color: var(--hover-overlay); border-radius: var(--border-radius-sm); display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; }
.status-label { color: var(--text-secondary); font-style: italic; }

</style>