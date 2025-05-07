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

      <!-- "使用远程 rembg" Switch -->
      <div class="form-group" :class="{'grid-span-2': !useRemoteRembg}" style="margin-bottom: 20px;">
        <div class="switch-container">
          <div class="switch">
            <input type="checkbox" id="use-remote-rembg-switch" v-model="useRemoteRembg" @change="clearRemoteParamsError" />
            <label for="use-remote-rembg-switch" class="switch-slider"></label>
          </div>
          <label for="use-remote-rembg-switch" class="switch-label">使用远程 rembg</label>
        </div>
      </div>

      <!-- Remote Rembg Settings (if switch is ON) -->
      <div v-if="useRemoteRembg" class="form-grid rembg-grid">
        <div class="form-group grid-span-2">
          <label for="remote-rembg-url" class="form-label">远程 rembg 服务地址:</label>
          <input
            id="remote-rembg-url"
            type="text"
            v-model="remoteRembgUrl"
            class="input"
            placeholder="例如: http://your-remote-server/api/remove"
            @focus="clearSelection"
          />
        </div>

        <div class="form-group">
          <label class="form-label"> </label> <!-- Spacer for alignment or could be grid-span-1 for URL-->
          <div class="switch-container" style="margin-top: 5px;"> <!-- Adjust alignment as needed -->
            <div class="switch">
              <input type="checkbox" id="use-local-proxy-switch" v-model="useLocalProxy" />
              <label for="use-local-proxy-switch" class="switch-slider"></label>
            </div>
            <label for="use-local-proxy-switch" class="switch-label">是否使用本地代理</label>
          </div>
        </div>

        <div class="form-group grid-span-2">
          <label for="remote-rembg-params" class="form-label">参数 (JSON):</label>
          <textarea
            id="remote-rembg-params"
            v-model="remoteRembgParamsText"
            class="input"
            rows="6"
            :placeholder="defaultRemoteParamsPlaceholder"
            @input="clearRemoteParamsError"
          ></textarea>
          <p v-if="remoteParamsError" class="help-text error-text">{{ remoteParamsError }}</p>
        </div>
      </div>

      <!-- Local Rembg Settings (if switch is OFF) -->
      <div v-else class="form-grid rembg-grid">
         <!-- Original rembg 服务地址 input is now intentionally removed when useRemoteRembg is false, as per request -->
         <!--
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
         -->

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
      <!-- ... rest of the template for resolution settings remains unchanged ... -->
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
           <div class="form-grid resolution-grid single-col-grid">
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

    <div class="status-frame">
      <span class="status-label">{{ processingStatus }}</span>
    </div>
  </div>
</template>

<script>
import { writeFile, listDirectory, createFolder } from './services/IndexedDBFileSystem.js';

const defaultRemoteRembgParams = {
  model: "isnet-anime",
  a: "true", // As per example, these are strings
  af: 240
};

export default {
  name: 'ProcessingTabContent',
  data() {
    return {
      // Original rembg settings
      rembgLocation: "http://localhost:7000/api/remove", // Still kept for local/default config
      rembgModel: "isnet-anime",
      rembgModels: ["isnet-anime"],
      modelFile: null,
      uploadStatus: "",
      uploadSuccess: false,

      // New remote rembg settings
      useRemoteRembg: false,
      remoteRembgUrl: "", // e.g., "http://localhost:7001/api/remote_rembg"
      useLocalProxy: false,
      remoteRembgParamsText: JSON.stringify(defaultRemoteRembgParams, null, 2),
      remoteParamsError: "",

      // Resolution settings
      characterResolution: false,
      backgroundResolution: false,
      characterWidth: 1024,
      characterHeight: 1024,
      characterResize: "裁剪",
      backgroundResize: "裁剪",
      processingStatus: "准备就绪"
    }
  },
  computed: {
    defaultRemoteParamsPlaceholder() {
      return `例如:\n${JSON.stringify(defaultRemoteRembgParams, null, 2)}`;
    }
  },
  methods: {
    clearSelection(event) {
      // event.target.select();
    },
    clearRemoteParamsError() {
        this.remoteParamsError = "";
    },
    loadProcessingConfig() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        if (!configStr) { this.initializeDefaultProcessingConfig(); return; }

        const config = JSON.parse(configStr);
        if (!config.AI_draw || !config.AI_draw.processing_config) {
             this.initializeDefaultProcessingConfig();
             const updatedConfigStr = localStorage.getItem('aiGalgameConfig');
             const updatedConfig = updatedConfigStr ? JSON.parse(updatedConfigStr) : config;
             const processingConfig = updatedConfig?.AI_draw?.processing_config || {};
             this.applyConfigValues(processingConfig);
        } else {
             this.applyConfigValues(config.AI_draw.processing_config);
        }
        this.loadRembgModels();
      } catch (error) {
        console.error("加载后处理配置时出错:", error);
        this.$emit('show-message', { title: "error", message: `加载后处理配置失败: ${error.message}`});
         this.initializeDefaultProcessingConfig();
         this.loadRembgModels();
      }
    },

    applyConfigValues(processingConfig) {
        // Original values
        this.rembgLocation = processingConfig.rembg_location || "http://localhost:7000/api/remove";
        this.rembgModel = processingConfig.rembg_model || "isnet-anime";

        // New remote rembg values
        this.useRemoteRembg = processingConfig.use_remote_rembg === true; // Ensure boolean
        this.remoteRembgUrl = processingConfig.remote_rembg_url || "";
        this.useLocalProxy = processingConfig.use_local_proxy === true; // Ensure boolean
        // Ensure remoteRembgParamsText is a string and attempt to pretty-print if it's valid JSON
        try {
            const paramsObj = JSON.parse(processingConfig.remote_rembg_params || JSON.stringify(defaultRemoteRembgParams));
            this.remoteRembgParamsText = JSON.stringify(paramsObj, null, 2);
        } catch (e) {
            this.remoteRembgParamsText = processingConfig.remote_rembg_params || JSON.stringify(defaultRemoteRembgParams, null, 2);
        }


        // Resolution values
        this.characterResolution = processingConfig.character_resolution === true;
        this.backgroundResolution = processingConfig.background_resolution === true;
        this.characterWidth = parseInt(processingConfig.character_width, 10) || 1024;
        this.characterHeight = parseInt(processingConfig.character_height, 10) || 1024;
        this.characterResize = processingConfig.character_resize || "裁剪";
        this.backgroundResize = processingConfig.background_resize || "裁剪";
    },

     initializeDefaultProcessingConfig() {
        try {
            const configStr = localStorage.getItem('aiGalgameConfig');
            let config = {};
            try { config = configStr ? JSON.parse(configStr) : {}; } catch (e) { console.error("Error parsing LS on init processing default:", e); }

            let needsSave = false;
            if (!config.AI_draw) { config.AI_draw = {}; needsSave = true; }
            if (!config.AI_draw.processing_config) {
                config.AI_draw.processing_config = {
                    rembg_location: "http://localhost:7000/api/remove",
                    rembg_model: "isnet-anime",
                    use_remote_rembg: false,
                    remote_rembg_url: "",
                    use_local_proxy: false,
                    remote_rembg_params: JSON.stringify(defaultRemoteRembgParams, null, 2),
                    character_resolution: false,
                    background_resolution: false,
                    character_width: 1024,
                    character_height: 1024,
                    character_resize: "裁剪",
                    background_resize: "裁剪",
                };
                needsSave = true;
            } else {
                const pc = config.AI_draw.processing_config;
                if (pc.rembg_location === undefined) { pc.rembg_location = "http://localhost:7000/api/remove"; needsSave = true; }
                if (pc.rembg_model === undefined) { pc.rembg_model = "isnet-anime"; needsSave = true; }
                if (pc.use_remote_rembg === undefined) { pc.use_remote_rembg = false; needsSave = true; }
                if (pc.remote_rembg_url === undefined) { pc.remote_rembg_url = ""; needsSave = true; }
                if (pc.use_local_proxy === undefined) { pc.use_local_proxy = false; needsSave = true; }
                if (pc.remote_rembg_params === undefined) { pc.remote_rembg_params = JSON.stringify(defaultRemoteRembgParams, null, 2); needsSave = true; }
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
      // This logic remains the same as it's for local models
      const modelDir = "/data/source/rembg-model";
      try {
        const files = await listDirectory(modelDir);
        const modelNames = files
          .filter(file => !file.isFolder && file.name.toLowerCase().endsWith('.onnx'))
          .map(file => file.name.replace(/\.onnx$/i, ''));

        if (modelNames.length > 0) {
          this.rembgModels = modelNames.sort();
           if (!this.rembgModels.includes(this.rembgModel)) {
                this.rembgModel = this.rembgModels[0] || "isnet-anime";
           }
        } else {
            this.rembgModels = ["isnet-anime"];
             this.rembgModel = "isnet-anime";
        }
      } catch (error) {
        if (error.message && error.message.includes("目录不存在")) {
          console.log(`Directory ${modelDir} not found, attempting to create.`);
          try {
            await this.ensureRembgModelDir();
            this.rembgModels = ["isnet-anime"];
            this.rembgModel = "isnet-anime";
          } catch (dirError) {
            console.error("创建rembg模型目录时出错:", dirError);
            this.rembgModels = ["isnet-anime"];
             this.rembgModel = "isnet-anime";
          }
        } else {
          console.error("加载rembg模型列表时出错:", error);
          this.rembgModels = ["isnet-anime"];
           this.rembgModel = "isnet-anime";
        }
      }
    },
    async ensureRembgModelDir() {
        const modelDir = "/data/source/rembg-model";
        try {
           await createFolder(modelDir);
           console.log(`Ensured directory exists: ${modelDir}`);
        } catch (error) {
            if (!error.message.includes('文件夹已存在') && !error.message.includes('Key already exists')) {
                console.error(`创建目录 ${modelDir} 时出错:`, error);
                throw error;
            }
        }
    },
    handleModelFileChange(event) {
      // This logic remains the same
      const files = event.target.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.name.toLowerCase().endsWith('.onnx')) {
          this.modelFile = file;
          this.uploadStatus = `已选择: ${file.name}`;
          this.uploadSuccess = true;
        } else {
          this.modelFile = null;
          this.uploadStatus = "错误: 请选择 .onnx 文件";
          this.uploadSuccess = false;
           this.$emit('show-message', { title: "error", message: "请选择 ONNX 格式的模型文件 (.onnx)" });
           event.target.value = '';
        }
      } else {
        this.modelFile = null;
        this.uploadStatus = "";
      }
    },
    async uploadModel() {
      // This logic remains the same
      if (!this.modelFile) {
        this.uploadStatus = "错误: 未选择文件";
        this.uploadSuccess = false;
        return;
      }
      this.uploadStatus = "正在上传...";
      this.uploadSuccess = false;
      try {
        await this.ensureRembgModelDir();
        const filePath = `/data/source/rembg-model/${this.modelFile.name}`;
        await writeFile(filePath, this.modelFile);
        this.uploadStatus = `模型 "${this.modelFile.name}" 上传成功`;
        this.uploadSuccess = true;
        await this.loadRembgModels();
        const modelNameOnly = this.modelFile.name.replace(/\.onnx$/i, '');
        if (this.rembgModels.includes(modelNameOnly)) {
             this.rembgModel = modelNameOnly;
             // Do not auto-save here, let user click save button
        }
        this.$refs.modelFileInput.value = '';
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
      this.remoteParamsError = ""; // Clear previous errors

      if (this.useRemoteRembg) {
        try {
          JSON.parse(this.remoteRembgParamsText); // Validate JSON
        } catch (e) {
          this.remoteParamsError = "参数 JSON 格式无效，请检查。";
          this.$emit('show-message', { title: "error", message: "远程 Rembg 参数 JSON 格式无效，无法保存。" });
          this.processingStatus = "保存失败: JSON无效";
          return; // Prevent save
        }
      }

      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        const config = configStr ? JSON.parse(configStr) : {};
        if (!config.AI_draw) config.AI_draw = {};
        if (!config.AI_draw.processing_config) config.AI_draw.processing_config = {};

        const processingConfig = {
          // Original local rembg settings
          rembg_location: this.rembgLocation || "http://localhost:7000/api/remove",
          rembg_model: this.rembgModel || "isnet-anime",

          // New remote rembg settings
          use_remote_rembg: this.useRemoteRembg,
          remote_rembg_url: this.remoteRembgUrl,
          use_local_proxy: this.useLocalProxy,
          remote_rembg_params: this.remoteRembgParamsText, // Save as string

          // Resolution settings
          character_resolution: this.characterResolution,
          background_resolution: this.backgroundResolution,
          character_width: parseInt(this.characterWidth, 10) || 1024,
          character_height: parseInt(this.characterHeight, 10) || 1024,
          character_resize: this.characterResize,
          background_resize: this.backgroundResize
        };

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
        // This logic remains the same
        const isWidth = type === 'width';
        let currentValue = isWidth ? this.characterWidth : this.characterHeight;
        let num = parseInt(currentValue, 10);

        if (isNaN(num)) {
            num = 1024;
        } else {
             num = Math.max(1, Math.min(4096, num));
        }

        if (isWidth) {
            this.characterWidth = num;
        } else {
            this.characterHeight = num;
        }
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

.section-frame { margin-bottom: 25px; padding: 20px; }
.section-title { font-size: 1.1rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 20px; padding-bottom: 8px; border-bottom: 1px dashed var(--border-color); }

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px 25px;
}
.grid-span-2 {
    grid-column: span 2 / span 2;
}
@media (max-width: 600px) {
   .grid-span-2 { grid-column: span 1 / span 1; }
}

.form-group { margin-bottom: 0; }
.form-label { display: block; margin-bottom: 6px; color: var(--text-secondary); font-size: 0.95rem; font-weight: 500; }
.input, .select, textarea.input { width: 100%; } /* Ensure textarea also takes full width */


.model-import-group label.form-label { margin-bottom: 8px; }

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
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: calc(100% - 100px);
    flex-grow: 1;
    justify-content: flex-start;
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
.button-frame.single-button { justify-content: flex-end; }

.resolution-section { margin-bottom: 20px; }
.resolution-section:last-child { margin-bottom: 0; }
.toggle-row { margin-bottom: 15px; }
.settings-container {
    padding-left: 20px;
    margin-top: 10px;
    border-left: 2px solid var(--hover-overlay);
}
.resolution-grid { gap: 15px 20px; }
.size-input { max-width: 100px; text-align: center; }
.medium-select { max-width: 150px; }
.single-col-grid { grid-template-columns: minmax(200px, 300px); }
.tip-text { margin-top: 10px; }
.help-text { font-size: 0.85rem; color: var(--text-tertiary); line-height: 1.4; }
.error-text { color: var(--danger-color, #e74c3c); font-weight: 500; margin-top: 5px; }


.switch-container { display: flex; align-items: center; gap: 10px; }
.switch { position: relative; display: inline-block; width: 50px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border-color); transition: .4s; border-radius: 24px; }
.switch-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.switch input:checked + .switch-slider { background-color: var(--primary-color); }
.switch input:focus + .switch-slider { box-shadow: 0 0 1px var(--primary-color); }
.switch input:checked + .switch-slider:before { transform: translateX(26px); }
.switch-label { font-size: 1rem; color: var(--text-primary); cursor: pointer; user-select: none; }
.label-bold { font-weight: 600; }

.status-frame { margin-top: 20px; padding: 8px 12px; background-color: var(--hover-overlay); border-radius: var(--border-radius-sm); display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; }
.status-label { color: var(--text-secondary); font-style: italic; }

/* Ensure textarea for JSON is styled like other inputs */
textarea.input {
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background-color: var(--input-bg);
    color: var(--text-input);
    font-family: inherit; /* Or specify a monospace font for JSON */
    font-size: 0.9rem;
    line-height: 1.5;
    min-height: 100px; /* Give it some default height */
}
textarea.input:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-transparent);
    outline: none;
}
</style>