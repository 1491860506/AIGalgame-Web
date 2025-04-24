<template>
  <div class="judging-tab">
    <div class="main-container">
      <div class="title-frame">
        <h3 class="title-label">图片质量判断设置</h3>
        <span class="subtitle-label">配置AI绘画结果的质量评估参数</span>
      </div>

      <div class="separator"></div>

      <!-- 判断方法 -->
      <div class="section-frame">
        <h4 class="section-title">判断方法</h4>
        <div class="method-select-frame">
          <label class="label-bold">质量判断方法:</label>
          <select v-model="qualityMethod" @change="loadMethodThresholds" class="method-select">
            <option value="a">a</option>
            <option value="b">b</option>
            <option value="c">c</option>
          </select>
          <span class="method-info">{{ methodInfoText }}</span>
        </div>
      </div>

      <!-- 质量判断开关 -->
      <div class="section-frame">
        <h4 class="section-title">质量判断开关</h4>
        <div class="grid-frame">
          <div class="grid-row">
            <label class="label">人物绘画质量判断:</label>
            <div class="toggle-container">
              <input type="checkbox" v-model="characterQualityJudgment" class="toggle" />
              <div class="toggle-slider"></div>
            </div>
          </div>
          <div class="grid-row">
            <label class="label">背景绘画质量判断:</label>
            <div class="toggle-container">
              <input type="checkbox" v-model="backgroundQualityJudgment" class="toggle" />
              <div class="toggle-slider"></div>
            </div>
          </div>
        </div>
        <p class="info-text">启用质量判断后，系统将自动评估生成图像质量，低于阈值的图像将被丢弃并重新生成</p>
      </div>

      <!-- 质量阈值设置 -->
      <div class="section-frame">
        <h4 class="section-title">质量阈值设置</h4>
        <div class="threshold-grid">
          <div class="grid-row">
            <label class="label">人物质量阈值:</label>
            <input
              type="text"
              v-model="characterQualityThreshold"
              class="threshold-input"
              @input="handleThresholdInput($event, 'characterQualityThreshold')" 
            />
            <span class="range-text">(0-100)</span>
          </div>
          <div class="grid-row">
            <label class="label">背景质量阈值:</label>
            <input
              type="text"
              v-model="backgroundQualityThreshold"
              class="threshold-input"
              @input="handleThresholdInput($event, 'backgroundQualityThreshold')" 
            />
            <span class="range-text">(0-100)</span>
          </div>
        </div>
        <p class="info-text">阈值范围为0-100，数值越高要求越严格。不同判断方法的推荐阈值可能有所不同。</p>
      </div>

      <!-- 功能按钮区域 -->
      <div class="button-frame">
        <button class="test-button" @click="openJudgingTestWindow">
          🧪 测试质量判断
        </button>
        <button class="save-button" @click="saveAiDrawJudgingConfig">
          💾 保存设置
        </button>
      </div>

      <!-- 状态栏 -->
      <div class="status-frame">
        <span class="status-label">{{ judgingStatus }}</span>
      </div>
    </div>

    <!-- ImageQualityChecker 模态窗口 -->
    <ImageQualityChecker
      v-if="showQualityCheckerModal"
      @close="showQualityCheckerModal = false"
      :qualityMethod="qualityMethod"
      :characterThreshold="parseInt(characterQualityThreshold) || 0" 
      :backgroundThreshold="parseInt(backgroundQualityThreshold) || 0" 
      :characterJudgmentEnabled="characterQualityJudgment"
      :backgroundJudgmentEnabled="backgroundQualityJudgment"
      @show-message="$emit('show-message', $event)"
      @update-status="updateStatus"
    />

  </div>
</template>

<script>
import ImageQualityChecker from './AiDrawingConfig_ImageQualityChecker.vue'; // 引入 ImageQualityChecker 组件，确保路径正确

export default {
  name: 'JudgingTabContent',
  components: {
    ImageQualityChecker // 注册组件
  },
  data() {
    return {
      // 判断质量相关状态
      qualityMethod: "a",
      characterQualityJudgment: false,
      backgroundQualityJudgment: false,
      characterQualityThreshold: "", // Keep as string for input binding
      backgroundQualityThreshold: "", // Keep as string for input binding
      judgingStatus: "准备就绪",

      // 控制 ImageQualityChecker 模态窗口的显示
      showQualityCheckerModal: false,

      // 方法说明文本
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
    // 加载配置
    loadConfig() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        if (configStr) {
          const config = JSON.parse(configStr);
          const judgingConfig = config?.AI_draw?.judging_config || {};

          this.characterQualityJudgment = judgingConfig.character_quality_judgment || false;
          this.backgroundQualityJudgment = judgingConfig.background_quality_judgment || false;
          this.qualityMethod = judgingConfig.selected_method || "a";
          this.loadMethodThresholds(); // Load thresholds based on the loaded method
        } else {
          this.initializeDefaultConfig();
          this.loadMethodThresholds(); // Ensure thresholds are loaded after default init
        }
      } catch (error) {
        console.error("加载配置时出错:", error);
        this.initializeDefaultConfig();
        this.loadMethodThresholds(); // Ensure thresholds are loaded after error init
      }
    },

    // 初始化默认配置 (should only set defaults, not necessarily load to UI here)
    initializeDefaultConfig() {
      const defaultMethods = {
        "a": {"character_quality_threshold": "10", "background_quality_threshold": "15"},
        "b": {"character_quality_threshold": "65", "background_quality_threshold": "60"},
        "c": {"character_quality_threshold": "70", "background_quality_threshold": "65"}
      };

      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        const config = configStr ? JSON.parse(configStr) : {};

        // Only initialize if judging_config or methods are missing
        if (!config.AI_draw) config.AI_draw = {};
        if (!config.AI_draw.judging_config) {
            config.AI_draw.judging_config = {
                character_quality_judgment: false,
                background_quality_judgment: false,
                selected_method: "a",
                methods: defaultMethods
            };
             localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
             console.log("Initialized default judging config.");
        } else if (!config.AI_draw.judging_config.methods) {
             config.AI_draw.judging_config.methods = defaultMethods;
             localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
             console.log("Initialized default judging methods.");
        }
        // Don't directly set UI state here, let loadConfig handle that
      } catch (error) {
        console.error("初始化默认配置时出错:", error);
        // Avoid setting UI state directly in case of error during init
      }
    },

    // 根据选中的判断方法加载对应的阈值
    loadMethodThresholds() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        if (!configStr) {
            console.warn("No config found in localStorage for loading thresholds.");
            // Maybe set to default values for the current method if needed?
            this.characterQualityThreshold = ""; // Or default like "0"
            this.backgroundQualityThreshold = ""; // Or default like "0"
            return;
        };

        const config = JSON.parse(configStr);
        // Add more robust checks
        const methods = config?.AI_draw?.judging_config?.methods;

        if (!methods) {
          console.warn("Methods config not found, initializing defaults before loading.");
          this.initializeDefaultConfig(); // Attempt to init if missing
          // Re-read config after potential init
          const updatedConfigStr = localStorage.getItem('aiGalgameConfig');
          const updatedConfig = updatedConfigStr ? JSON.parse(updatedConfigStr) : {};
          const updatedMethods = updatedConfig?.AI_draw?.judging_config?.methods;
          if (!updatedMethods) {
             console.error("Failed to initialize or find methods config.");
             this.characterQualityThreshold = "";
             this.backgroundQualityThreshold = "";
             return;
          }
           const methodConfig = updatedMethods[this.qualityMethod] || {};
           this.characterQualityThreshold = methodConfig.character_quality_threshold || "";
           this.backgroundQualityThreshold = methodConfig.background_quality_threshold || "";

        } else {
            const methodConfig = methods[this.qualityMethod] || {};
            // Update data properties, v-model will update the inputs
            this.characterQualityThreshold = methodConfig.character_quality_threshold || "";
            this.backgroundQualityThreshold = methodConfig.background_quality_threshold || "";
        }

        // Update status message (optional)
        // this.judgingStatus = `已加载方法 ${this.qualityMethod} 的阈值设置`;
        // setTimeout(() => { this.judgingStatus = "准备就绪"; }, 2000);

      } catch (error) {
        console.error("加载方法阈值时出错:", error);
        // Reset to empty strings or known defaults on error
        this.characterQualityThreshold = "";
        this.backgroundQualityThreshold = "";
      }
    },

    // 保存质量判断配置
    saveAiDrawJudgingConfig() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        const config = configStr ? JSON.parse(configStr) : {};

        // Ensure structure exists
        if (!config.AI_draw) config.AI_draw = {};
        if (!config.AI_draw.judging_config) config.AI_draw.judging_config = {};
        if (!config.AI_draw.judging_config.methods) config.AI_draw.judging_config.methods = {};

        const judgingConfig = config.AI_draw.judging_config;
        const methods = judgingConfig.methods;

        if (!methods[this.qualityMethod]) methods[this.qualityMethod] = {};

        // Save current UI values to the config for the selected method
        methods[this.qualityMethod].character_quality_threshold = this.characterQualityThreshold;
        methods[this.qualityMethod].background_quality_threshold = this.backgroundQualityThreshold;

        // Save global settings
        judgingConfig.character_quality_judgment = this.characterQualityJudgment;
        judgingConfig.background_quality_judgment = this.backgroundQualityJudgment;
        judgingConfig.selected_method = this.qualityMethod;

        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));

        this.judgingStatus = "设置已保存";
        setTimeout(() => { this.judgingStatus = "准备就绪"; }, 2000);

        // Use the existing mechanism for showing messages
        this.$emit('show-message', { title: "success", message: "质量判断设置已保存！" });

      } catch (error) {
        console.error("保存配置时出错:", error);
         this.$emit('show-message', { title: "error", message: "保存配置失败" });
         this.judgingStatus = "保存失败";
      }
    },

    // REMOVED: Old problematic validation method
    // validateNumberInput(event) { ... }

    // REMOVED: Unused validation method
    // updateThreshold(event, thresholdType) { ... }

    // REVISED/KEPT: Validation logic, now used by both inputs via template binding
    handleThresholdInput(event, type) {
      // 'type' will be 'characterQualityThreshold' or 'backgroundQualityThreshold'
      let value = event.target.value;

      // Allow empty string
      if (value === '') {
          this[type] = '';
          return;
      }

      // Remove any non-digit characters (allows pasting, etc.)
      value = value.replace(/\D/g, '');

      // If after removing non-digits, it's empty, set data to empty
      if (value === '') {
          this[type] = '';
          return;
      }

      const num = parseInt(value);

      // Should not be NaN here because we removed non-digits, but check anyway
      if (isNaN(num)) {
           this[type] = ''; // Or maybe '0'? Empty seems better.
           return;
      }

      // Clamp the value between 0 and 100
      if (num < 0) {
          this[type] = '0';
      } else if (num > 100) {
          this[type] = '100';
      } else {
          // Update the data property with the valid number (as a string)
          // Use String(num) to remove leading zeros (e.g., "05" becomes "5")
          this[type] = String(num);
      }

      // Important: Let Vue update the input field's value from the data property.
      // Avoid direct manipulation like event.target.value = this[type]; here,
      // as it can interfere with v-model's control flow, especially if the input
      // framework does things asynchronously. By just updating the data `this[type]`,
      // v-model ensures the input field reflects the correct state.
      // If the input field doesn't update immediately, ensure Vue's reactivity is working correctly.
      // A $nextTick *might* be needed in complex scenarios, but usually isn't for simple v-model.
       this.$nextTick(() => {
            // If the input sometimes doesn't visually update correctly after clamping/parsing
            // you might force the value here, but it's usually better practice
            // to rely on v-model updating from the data property change.
            // event.target.value = this[type]; // Generally avoid this if v-model works
       });
    },


    // 打开测试窗口
    openJudgingTestWindow() {
      this.showQualityCheckerModal = true;
      this.updateStatus("正在打开测试窗口...");
    },


    // 更新状态栏信息
    updateStatus(message) {
        this.judgingStatus = message;
        // Optional: Reset status after a delay
        // setTimeout(() => { if (this.judgingStatus === message) this.judgingStatus = "准备就绪"; }, 3000);
    }
  },
  mounted() {
    this.loadConfig();
  }
}
</script>

<style scoped>
/* 判断质量标签页样式 */
.judging-tab {
  width: 100%;
  /* 如果这个组件是主内容区域，确保 position 不是 fixed 或 absolute */
  position: relative; /* Added relative position just in case, common for containing fixed modals */
}

.main-container {
  padding: 20px;
}

.title-frame {
  margin-bottom: 15px;
}

/* 使用 App.vue 定义的变量 */
.title-label {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 0;
  color: var(--text-primary); /* 使用变量 */
}

/* 使用 App.vue 定义的变量 */
.subtitle-label {
  display: block;
  color: var(--text-secondary); /* 使用变量 */
  margin-top: 5px;
}

/* 使用 App.vue 定义的变量 */
.separator {
  height: 1px;
  background-color: var(--border-color); /* 使用变量 */
  margin: 15px 0;
}

/* 使用 App.vue 定义的变量 */
.section-frame {
  background-color: var(--content-bg); /* 使用变量 */
  border: 1px solid var(--border-color); /* 使用变量 */
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: var(--shadow); /* 使用变量 */
}

/* 使用 App.vue 定义的变量 */
.section-title {
  font-size: 1rem;
  margin: 0 0 15px 0;
  color: var(--text-primary); /* 使用变量 */
  font-weight: bold;
}

.method-select-frame {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

/* 确保 label 在深色模式下可见 */
.label-bold,
.label {
  font-weight: bold;
  margin-right: 10px;
  color: var(--text-primary); /* 使用变量 */
}

/* 使用 App.vue 定义的变量 */
.method-select {
  padding: 5px 10px;
  border: 1px solid var(--border-color); /* 使用变量 */
  border-radius: 4px;
  margin-right: 10px;
  background-color: var(--content-bg); /* 使用变量 */
  color: var(--text-primary); /* 使用变量 */
  /* Add reset styles for appearance */
  -webkit-appearance: none; /* Remove default arrow on Chrome/Safari */
  -moz-appearance: none;    /* Remove default arrow on Firefox */
  appearance: none;         /* Remove default arrow */
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23888%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13.2-6.4H18.6c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); /* Custom arrow */
  background-repeat: no-repeat;
  background-position: right 8px top 50%;
  background-size: 12px auto; /* Adjust arrow size */
  padding-right: 25px; /* Make space for the arrow */
}


 /* 使用 App.vue 定义的变量 */
.threshold-input {
  padding: 5px 10px;
  border: 1px solid var(--border-color); /* 使用变量 */
  border-radius: 4px;
  width: 80px;
  background-color: var(--content-bg); /* 使用变量 */
  color: var(--text-primary); /* 使用变量 */
}

/* 使用 App.vue 定义的变量 */
.method-info,
.info-text,
.range-text,
.status-label {
  color: var(--text-secondary); /* 使用变量 */
  font-size: 0.9rem; /* method-info, range-text, status-label */
  /* info-text already has 0.85rem, will override */
}

/* Override for info-text specifically if needed, but secondary color should be fine */
.info-text {
   font-size: 0.85rem;
   margin-top: 10px;
}

 .status-frame {
   margin-top: 15px;
   min-height: 1.2em; /* Ensure it takes space even if empty */
   /* color is set above with .status-label */
 }

.grid-frame {
  display: flex;
  flex-direction: column;
}

.grid-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

/* 自定义开关样式 */
.toggle-container {
  position: relative;  /* 确保子元素绝对定位基于此容器 */
  width: 40px;
  height: 20px;
  margin-right: 10px;
}

/* 调整原生input覆盖整个容器 */
.toggle {
  position: absolute;  /* 改为绝对定位 */
  width: 100%;         /* 覆盖容器宽度 */
  height: 100%;        /* 覆盖容器高度 */
  opacity: 0;
  margin: 0;
  z-index: 1;          /* 确保input在滑块上层 */
  cursor: pointer;     /* 显示手型指针 */
}

/* 使用 App.vue 定义的变量 或 选择合适的深色 */
.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color); /* 使用边框颜色作为默认off状态背景 */
  transition: .4s;
  border-radius: 20px;
}

/* 使用 App.vue 定义的变量 或 选择合适的深色 */
.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: var(--content-bg); /* 滑块圆点背景，使用内容背景色 */
  transition: .4s;
  border-radius: 50%;
}

/* 开启状态颜色保持一致，通常蓝色在深色背景下也可见 */
.toggle:checked + .toggle-slider {
  background-color: #0366d6; /* 保持原色 */
}

.toggle:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.threshold-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* threshold-input already updated above */
/* range-text already updated above */

/* info-text already updated above */

.button-frame {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

/* Buttons colors are distinct, keeping them as is should be fine for dark mode */
.test-button, .save-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: white;
  font-weight: bold;
  transition: background-color 0.2s;
}

.test-button {
  background-color: #6f42c1; /* Purple */
}

.test-button:hover {
  background-color: #5a32a3; /* Darker Purple */
}

.save-button {
  background-color: #28a745; /* Green */
}

.save-button:hover {
  background-color: #218838; /* Darker Green */
}

/* status-frame and status-label updated above */
</style>