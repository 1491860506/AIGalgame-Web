<template>
  <div class="tab-content-container judging-tab-content">
    <div class="title-frame">
      <h3 class="title-label">图片质量判断设置</h3>
      <span class="subtitle-label">配置 AI 绘画结果的自动质量评估方法和阈值。</span>
    </div>

    <hr class="separator thin-separator">

    <!-- 判断方法 -->
    <div class="section-frame card">
      <h4 class="section-title">判断方法选择</h4>
      <div class="method-select-frame form-group">
        <label for="quality-method-select" class="form-label label-bold">质量判断方法:</label>
        <select id="quality-method-select" v-model="qualityMethod" @change="loadMethodThresholds" class="select method-select">
           <!-- Options loaded dynamically or predefined -->
          <option value="a">方法 A (自适应锐度)</option>
          <option value="b">方法 B (特征/细节)</option>
          <option value="c">方法 C (美学/色彩)</option>
        </select>
      </div>
       <p class="method-info help-text">{{ methodInfoText }}</p>
    </div>

    <!-- 质量判断开关 -->
    <div class="section-frame card">
      <h4 class="section-title">质量判断开关</h4>
       <div class="switch-grid">
           <div class="switch-container">
               <div class="switch">
                 <input type="checkbox" id="char-quality-switch" v-model="characterQualityJudgment" />
                 <label for="char-quality-switch" class="switch-slider"></label>
               </div>
               <label for="char-quality-switch" class="switch-label">启用人物绘画质量判断</label>
           </div>
            <div class="switch-container">
               <div class="switch">
                 <input type="checkbox" id="bg-quality-switch" v-model="backgroundQualityJudgment"/>
                 <label for="bg-quality-switch" class="switch-slider"></label>
               </div>
               <label for="bg-quality-switch" class="switch-label">启用背景绘画质量判断</label>
           </div>
       </div>
      <p class="info-text help-text">启用后，系统将自动评估生成图像质量，低于阈值的图像将被丢弃并尝试重新生成。</p>
    </div>

    <!-- 质量阈值设置 -->
    <div class="section-frame card">
      <h4 class="section-title">质量阈值设置 (方法: {{ qualityMethod.toUpperCase() }})</h4>
      <div class="threshold-grid">
        <div class="form-group threshold-item">
          <label for="char-threshold-input" class="form-label">人物质量阈值:</label>
          <div class="input-with-range">
             <input
               id="char-threshold-input"
               type="number"
               v-model="characterQualityThreshold"
               class="input threshold-input"
               min="0" max="100" step="1"
               @input="handleThresholdInput($event, 'characterQualityThreshold')"
             />
             <span class="range-text">(0-100)</span>
          </div>
        </div>
        <div class="form-group threshold-item">
          <label for="bg-threshold-input" class="form-label">背景质量阈值:</label>
           <div class="input-with-range">
              <input
                id="bg-threshold-input"
                type="number"
                v-model="backgroundQualityThreshold"
                class="input threshold-input"
                 min="0" max="100" step="1"
                @input="handleThresholdInput($event, 'backgroundQualityThreshold')"
              />
              <span class="range-text">(0-100)</span>
           </div>
        </div>
      </div>
      <p class="info-text help-text">阈值越高要求越严格。不同判断方法的推荐阈值不同。</p>
    </div>

    <!-- 功能按钮区域 -->
    <div class="button-frame">
      <button class="btn btn-info" @click="openJudgingTestWindow">
        <font-awesome-icon :icon="['fas', 'vial']" /> 测试质量判断工具
      </button>
      <button class="btn btn-primary" @click="saveAiDrawJudgingConfig">
        <font-awesome-icon :icon="['fas', 'save']" /> 保存设置
      </button>
    </div>

    <!-- 状态栏 -->
    <div class="status-frame">
      <span class="status-label">{{ judgingStatus }}</span>
    </div>

    <!-- ImageQualityChecker 模态窗口 (Styling handled within its own scope or globally) -->
    <!-- Assuming the modal itself is styled globally or within its component -->
     <div class="modal" v-if="showQualityCheckerModal" @click.self="showQualityCheckerModal = false">
         <div class="modal-content card quality-checker-modal-content">
             <div class="modal-header">
                <h3 class="modal-title">图像质量检查 & 处理工具</h3>
                <button class="close-btn btn btn-text btn-sm" @click="showQualityCheckerModal = false" title="关闭">
                  <font-awesome-icon :icon="['fas', 'times']" />
                </button>
             </div>
             <div class="modal-body quality-checker-modal-body">
                 <ImageQualityChecker
                  :qualityMethod="qualityMethod"
                  :characterThreshold="parseInt(characterQualityThreshold) || 0"
                  :backgroundThreshold="parseInt(backgroundQualityThreshold) || 0"
                  :characterJudgmentEnabled="characterQualityJudgment"
                  :backgroundJudgmentEnabled="backgroundQualityJudgment"
                  @show-message="$emit('show-message', $event)"
                  @update-status="updateStatus"
                  @close="showQualityCheckerModal = false"
                />
            </div>
         </div>
     </div>

  </div>
</template>

<script>
// --- Script remains unchanged ---
import ImageQualityChecker from './AiDrawingConfig_ImageQualityChecker.vue';
// Assume icons are registered globally or import them here
// Icons Used: vial, save, times

export default {
  name: 'JudgingTabContent',
  components: {
    ImageQualityChecker
    // FontAwesomeIcon // If needed
  },
  data() {
    return {
      qualityMethod: "a",
      characterQualityJudgment: false,
      backgroundQualityJudgment: false,
      characterQualityThreshold: "",
      backgroundQualityThreshold: "",
      judgingStatus: "准备就绪",
      showQualityCheckerModal: false,
      methodInfoMap: {
        "a": "方法A: 基于动态掩码和梯度幅值分位数的自适应锐度评估法",
        "b": "方法B: 基于人物特征识别和背景细节度评估",
        "c": "方法C: 基于综合美学分析和色彩协调度评估"
      }
    }
  },
  computed: {
    methodInfoText() {
      return this.methodInfoMap[this.qualityMethod] || "未知方法";
    }
  },
  methods: {
     loadConfig() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        let config = {};
        let judgingConfig = {};

        if (configStr) {
            config = JSON.parse(configStr);
            judgingConfig = config?.AI_draw?.judging_config || {};
        }

        // Initialize defaults if judging_config or methods are missing
        // This ensures the structure exists before accessing properties
        if (!config.AI_draw) config.AI_draw = {};
        if (!config.AI_draw.judging_config) {
            this.initializeDefaultConfig(); // This will set defaults in localStorage
            // Re-read after initializing
            const updatedConfigStr = localStorage.getItem('aiGalgameConfig');
            config = updatedConfigStr ? JSON.parse(updatedConfigStr) : config; // Use updated or original
            judgingConfig = config?.AI_draw?.judging_config || {}; // Update judgingConfig ref
        } else if (!config.AI_draw.judging_config.methods) {
             // If only methods are missing, initialize them
             this.initializeDefaultConfig(); // This ensures methods are added
             const updatedConfigStr = localStorage.getItem('aiGalgameConfig');
             config = updatedConfigStr ? JSON.parse(updatedConfigStr) : config;
             judgingConfig = config?.AI_draw?.judging_config || {};
        }


        // Now safely load values
        this.characterQualityJudgment = judgingConfig.character_quality_judgment === true; // Ensure boolean
        this.backgroundQualityJudgment = judgingConfig.background_quality_judgment === true; // Ensure boolean
        this.qualityMethod = judgingConfig.selected_method || "a";

        this.loadMethodThresholds(); // Load thresholds based on the potentially updated method

      } catch (error) {
        console.error("加载配置时出错:", error);
        this.$emit('show-message', { title: "error", message: `加载配置失败: ${error.message}` });
        // Attempt to initialize and load defaults on error
        this.initializeDefaultConfig();
        this.loadMethodThresholds();
      }
    },
    initializeDefaultConfig() {
        const defaultMethods = {
            "a": { "character_quality_threshold": "10", "background_quality_threshold": "15" },
            "b": { "character_quality_threshold": "65", "background_quality_threshold": "60" },
            "c": { "character_quality_threshold": "70", "background_quality_threshold": "65" }
        };
        try {
            const configStr = localStorage.getItem('aiGalgameConfig');
            let config = {};
            try { config = configStr ? JSON.parse(configStr) : {}; } catch (e) { console.error("Error parsing LS on init default:", e); }

            let needsSave = false;
            if (!config.AI_draw) { config.AI_draw = {}; needsSave = true; }
            if (!config.AI_draw.judging_config) {
                config.AI_draw.judging_config = {
                    character_quality_judgment: false,
                    background_quality_judgment: false,
                    selected_method: "a",
                    methods: defaultMethods
                };
                needsSave = true;
            } else {
                 if (config.AI_draw.judging_config.character_quality_judgment === undefined) { config.AI_draw.judging_config.character_quality_judgment = false; needsSave = true; }
                 if (config.AI_draw.judging_config.background_quality_judgment === undefined) { config.AI_draw.judging_config.background_quality_judgment = false; needsSave = true; }
                 if (config.AI_draw.judging_config.selected_method === undefined) { config.AI_draw.judging_config.selected_method = "a"; needsSave = true; }
                 if (!config.AI_draw.judging_config.methods) { config.AI_draw.judging_config.methods = defaultMethods; needsSave = true; }
                 // Optional: Ensure all default methods exist if methods object exists but is incomplete
                 for (const methodKey in defaultMethods) {
                     if (!config.AI_draw.judging_config.methods[methodKey]) {
                         config.AI_draw.judging_config.methods[methodKey] = defaultMethods[methodKey];
                         needsSave = true;
                     }
                 }
            }

            if (needsSave) {
                localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
                console.log("Initialized/Updated default judging config in localStorage.");
            }
        } catch (error) {
            console.error("初始化默认配置时出错:", error);
        }
    },
    loadMethodThresholds() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        // Ensure config is loaded, default gracefully
        const config = configStr ? JSON.parse(configStr) : { AI_draw: { judging_config: { methods: {} } } };
        const methods = config?.AI_draw?.judging_config?.methods || {};
        const methodConfig = methods[this.qualityMethod] || {};

        // Load thresholds, defaulting to empty string if not found
        this.characterQualityThreshold = methodConfig.character_quality_threshold || "";
        this.backgroundQualityThreshold = methodConfig.background_quality_threshold || "";

      } catch (error) {
        console.error("加载方法阈值时出错:", error);
        this.$emit('show-message', { title: "error", message: `加载阈值失败: ${error.message}` });
        this.characterQualityThreshold = "";
        this.backgroundQualityThreshold = "";
      }
    },
    saveAiDrawJudgingConfig() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        const config = configStr ? JSON.parse(configStr) : {};

        // Ensure structure exists, initialize if needed
        if (!config.AI_draw) config.AI_draw = {};
        if (!config.AI_draw.judging_config) config.AI_draw.judging_config = { methods: {} };
        if (!config.AI_draw.judging_config.methods) config.AI_draw.judging_config.methods = {};

        const judgingConfig = config.AI_draw.judging_config;
        // Ensure the object for the current method exists
        if (!judgingConfig.methods[this.qualityMethod]) {
            judgingConfig.methods[this.qualityMethod] = {};
        }

        // Save threshold strings directly
        judgingConfig.methods[this.qualityMethod].character_quality_threshold = this.characterQualityThreshold;
        judgingConfig.methods[this.qualityMethod].background_quality_threshold = this.backgroundQualityThreshold;

        // Save global settings
        judgingConfig.character_quality_judgment = this.characterQualityJudgment;
        judgingConfig.background_quality_judgment = this.backgroundQualityJudgment;
        judgingConfig.selected_method = this.qualityMethod;

        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));

        this.judgingStatus = "设置已保存";
        setTimeout(() => { this.judgingStatus = "准备就绪"; }, 2000);
        this.$emit('show-message', { title: "success", message: "质量判断设置已保存！" });
      } catch (error) {
        console.error("保存配置时出错:", error);
        this.$emit('show-message', { title: "error", message: "保存配置失败" });
        this.judgingStatus = "保存失败";
      }
    },
     handleThresholdInput(event, type) {
        let value = event.target.value;
        if (value === '') { this[type] = ''; return; }
        value = value.replace(/\D/g, ''); // Remove non-digits
        if (value === '') { this[type] = ''; return; } // If only non-digits were entered

        let num = parseInt(value, 10);
        if (isNaN(num)) { this[type] = ''; return; } // Should not happen

        // Clamp value
        num = Math.max(0, Math.min(100, num));
        this[type] = String(num); // Update data model

        // Ensure input visually reflects the clamped value
        this.$nextTick(() => {
            if (event.target.value !== this[type]) {
                 event.target.value = this[type];
            }
        });
    },
    openJudgingTestWindow() {
      this.showQualityCheckerModal = true;
      this.updateStatus("打开质量检查工具..."); // Update status immediately
    },
    updateStatus(message) {
        this.judgingStatus = message;
    }
  },
  mounted() {
    this.loadConfig();
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
.section-title { font-size: 1.1rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px dashed var(--border-color); }

/* Form Elements */
.form-group { margin-bottom: 15px; }
.form-label { display: block; margin-bottom: 6px; color: var(--text-secondary); font-size: 0.95rem; font-weight: 500; }
.label-bold { font-weight: 600; color: var(--text-primary); }

/* Method Selection */
.method-select-frame {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap; /* Allow wrapping */
}
.method-select { /* uses .select */ width: 200px; flex-shrink: 0;}
.method-info { font-size: 0.9rem; color: var(--text-secondary); flex-grow: 1; }

/* Quality Switches */
.switch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Responsive columns */
    gap: 15px;
    margin-bottom: 10px; /* Space before info text */
}
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

/* Threshold Settings */
.threshold-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
     margin-bottom: 10px; /* Space before info text */
}
.threshold-item { /* uses .form-group */ }
.input-with-range {
    display: flex;
    align-items: center;
    gap: 10px;
}
.threshold-input { /* uses .input */ width: 100px; text-align: center; }
.range-text { font-size: 0.85rem; color: var(--text-tertiary); }

/* Info/Help Text */
.info-text, .help-text { font-size: 0.85rem; color: var(--text-tertiary); line-height: 1.4; }

/* Button Frame */
.button-frame {
    margin-top: 25px;
    display: flex;
    justify-content: flex-end; /* Align buttons to the right */
    gap: 15px;
}
.button-frame .btn { /* Apply to buttons directly */
    min-width: 150px; /* Ensure buttons have decent width */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

/* Status Bar */
.status-frame { margin-top: 20px; padding: 8px 12px; background-color: var(--hover-overlay); border-radius: var(--border-radius-sm); display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; }
.status-label { color: var(--text-secondary); font-style: italic; }

/* Modal Styles (copied from previous component) */
.modal { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1050; padding: 15px; overflow-y: auto; }
.modal-content { /* uses .card */ width: 100%; max-width: 900px; /* Wider for checker */ max-height: 95vh; display: flex; flex-direction: column; overflow: hidden; padding: 0; /* Remove padding, let content handle */ }
/* Specific modal content for checker */
.quality-checker-modal-content {
   /* Add specific overrides if needed */
}
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding: 15px 20px; flex-shrink: 0; background-color: var(--surface-color); /* Header background */ }
.modal-title { font-size: 1.25rem; margin: 0; }
.close-btn { /* uses .btn .btn-text .btn-sm */ }
.modal-body { overflow-y: auto; flex-grow: 1; padding: 20px; /* Add padding back to body */ }
.quality-checker-modal-body {
    /* Add specific padding/styles if needed */
     background-color: var(--background-color); /* Body background */
}

</style>