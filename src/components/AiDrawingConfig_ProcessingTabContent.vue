<template>
  <div class="main-container">
    <div class="title-frame">
      <h3 class="title-label">AI绘画后处理设置</h3>
      <span class="subtitle-label">配置图像处理选项和自动调整参数</span>
    </div>

    <div class="separator"></div>

    <!-- rembg配置区域 -->
    <div class="section-frame">
      <h4 class="section-title">背景去除设置 (rembg)</h4>

      <div class="input-row">
        <label class="input-label">rembg地址:</label>
        <input
          type="text"
          v-model="rembgLocation"
          class="input-field"
          @focus="clearSelection"
        />
      </div>

      <div class="input-row">
        <label class="input-label">rembg模型:</label>
        <input
          type="text"
          v-model="rembgModel"
          class="input-field"
          @focus="clearSelection"
        />
      </div>

      <div class="button-row">
        <button class="save-button" @click="saveProcessingConfig">
          💾 保存Rembg设置
        </button>
      </div>
    </div>

    <!-- 分辨率调整设置区域 -->
    <div class="section-frame">
      <h4 class="section-title">分辨率调整设置</h4>

      <!-- 人物分辨率调整 -->
      <div class="section-container">
        <div class="toggle-row">
          <div class="toggle-container">
            <input
              type="checkbox"
              v-model="characterResolution"
              class="toggle"
              @change="saveProcessingConfig"
            />
            <div class="toggle-slider"></div>
          </div>
          <label class="toggle-label1">启用人物绘画分辨率调整</label>
        </div>

        <div v-if="characterResolution" class="settings-container">
          <div class="grid-container">
            <div class="grid-row">
              <label class="grid-label">宽度:</label>
              <input
                type="number"
                v-model.number="characterWidth"
                class="size-input"
                min="1"
                @blur="validateAndSave('width')"
                @keyup.enter="validateAndSave('width')"
              >

              <label class="grid-label ml-15">高度:</label>
              <input
                type="number"
                v-model.number="characterHeight"
                class="size-input"
                min="1"
                @blur="validateAndSave('height')"
                @keyup.enter="validateAndSave('height')"
              >
            </div>

            <div class="grid-row">
              <label class="grid-label">非指定比例方案:</label>
              <select v-model="characterResize" class="medium-select" @change="saveProcessingConfig">
                <option value="裁剪">裁剪</option>
                <option value="填充">填充</option>
                <option value="拉伸">拉伸</option>
              </select>
            </div>
          </div>

          <p class="tip-text">提示: 设置人物图像的宽高比例，非指定比例时的处理方式</p>
        </div>
      </div>

      <!-- 背景分辨率调整 -->
      <div class="section-container">
        <div class="toggle-row">
          <div class="toggle-container">
            <input
              type="checkbox"
              v-model="backgroundResolution"
              class="toggle"
              @change="saveProcessingConfig"
            />
            <div class="toggle-slider"></div>
          </div>
          <label class="toggle-label1">启用背景绘画分辨率调整</label>
        </div>

        <div v-if="backgroundResolution" class="settings-container">
          <div class="grid-container">
            <div class="grid-row">
              <label class="grid-label">非16:9比例方案:</label>
              <select v-model="backgroundResize" class="medium-select" @change="saveProcessingConfig">
                <option value="裁剪">裁剪</option>
                <option value="填充">填充</option>
                <option value="拉伸">拉伸</option>
              </select>
            </div>
          </div>

          <p class="tip-text">提示: 背景图像将自动调整为16:9比例，此选项控制调整方法</p>
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
export default {
  name: 'ProcessingTabContent',
  data() {
    return {
      // rembg设置
      rembgLocation: "http://localhost:7000/api/remove",
      rembgModel: "isnet-anime",

      // 分辨率调整设置
      characterResolution: false,
      backgroundResolution: false,
      characterWidth: 1024,
      characterHeight: 1024,
      characterResize: "裁剪",
      backgroundResize: "裁剪",

      // 状态信息
      processingStatus: "准备就绪"
    }
  },
  methods: {
    // 清除选择
    clearSelection(event) {
      event.target.select();
    },

    // 加载配置
    loadProcessingConfig() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        if (!configStr) return;

        const config = JSON.parse(configStr);
        if (!config.AI_draw || !config.AI_draw.processing_config) return;

        const processingConfig = config.AI_draw.processing_config;

        // 加载rembg设置
        this.rembgLocation = processingConfig.rembg_location || "http://localhost:7000/api/remove";
        this.rembgModel = processingConfig.rembg_model || "isnet-anime";

        // 加载开关状态
        this.characterResolution = processingConfig.character_resolution || false;
        this.backgroundResolution = processingConfig.background_resolution || false;

        // 加载分辨率设置
        if (processingConfig.character_width !== undefined && processingConfig.character_width !== null) {
          this.characterWidth = processingConfig.character_width;
        }
        if (processingConfig.character_height !== undefined && processingConfig.character_height !== null) {
          this.characterHeight = processingConfig.character_height;
        }
        if (processingConfig.character_resize) {
          this.characterResize = processingConfig.character_resize;
        }
        if (processingConfig.background_resize) {
          this.backgroundResize = processingConfig.background_resize;
        }
      } catch (error) {
        console.error("加载后处理配置时出错:", error);
      }
    },

    // 保存配置
    saveProcessingConfig() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        const config = configStr ? JSON.parse(configStr) : {};

        // 确保配置结构存在
        if (!config.AI_draw) config.AI_draw = {};
        if (!config.AI_draw.processing_config) config.AI_draw.processing_config = {};

        const processingConfig = {
          rembg_location: this.rembgLocation || "http://localhost:7000/api/remove",
          rembg_model: this.rembgModel || "isnet-anime",
          character_resolution: this.characterResolution,
          background_resolution: this.backgroundResolution
        };

        // 仅当开关启用时保存对应设置
        if (this.characterResolution) {
          processingConfig.character_width = parseInt(this.characterWidth);
          processingConfig.character_height = parseInt(this.characterHeight);
          processingConfig.character_resize = this.characterResize;
        }

        if (this.backgroundResolution) {
          processingConfig.background_resize = this.backgroundResize;
        }

        // 更新配置
        config.AI_draw.processing_config = processingConfig;

        // 保存到localStorage
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));

        // 更新状态
        this.processingStatus = "设置已保存";
        setTimeout(() => {
          this.processingStatus = "准备就绪";
        }, 2000);

        // 显示成功提示
        // This.$emit relies on the parent App.vue having a listener for 'show-message'
        // If it doesn't, this line can be removed or replaced with a local notification
        this.$emit('show-message', {
           title: "success",
           message: "后处理配置已保存！"
         });
         console.log("后处理配置已保存！"); // Fallback logging
      } catch (error) {
        console.error("保存后处理配置时出错:", error);
      }
    },

    // 切换人物分辨率设置 - Note: This method isn't directly used by @change
    // The @change on the checkbox directly calls saveProcessingConfig.
    // This method definition can likely be removed unless there's another use case.
    // toggleCharacterResolutionSettings(triggeredByUser = false) {
    //   if (this.characterResolution && triggeredByUser) {
    //     // 设置默认值
    //     if (!this.characterWidth) this.characterWidth = 1;
    //     if (!this.characterHeight) this.characterHeight = 1;
    //     if (!this.characterResize) this.characterResize = "裁剪";
    //     this.saveProcessingConfig();
    //   }
    // },

    // 切换背景分辨率设置 - Similar to the above, not used by @change
    // toggleBackgroundResolutionSettings(triggeredByUser = false) {
    //   if (this.backgroundResolution && triggeredByUser) {
    //     // 设置默认值
    //     if (!this.backgroundResize) this.backgroundResize = "裁剪";
    //     this.saveProcessingConfig();
    //   }
    // },

    validateAndSave(type) {
      const minValue = 1;
      const maxValue = 4096;

      // 验证逻辑
      if (type === 'width') {
        // Ensure it's a number before validation, default to 1024 if not a valid number
        this.characterWidth = parseInt(this.characterWidth);
        if (isNaN(this.characterWidth)) this.characterWidth = 1024;
        this.characterWidth = Math.max(minValue, Math.min(maxValue, this.characterWidth));
      } else { // type === 'height'
         // Ensure it's a number before validation, default to 1024 if not a valid number
        this.characterHeight = parseInt(this.characterHeight);
        if (isNaN(this.characterHeight)) this.characterHeight = 1024;
        this.characterHeight = Math.max(minValue, Math.min(maxValue, this.characterHeight));
      }

      this.saveProcessingConfig();
    },
  },
  mounted() {
    this.loadProcessingConfig();
  }
}
</script>

<style scoped>
/* Import variables from App.vue's global styles */
/* Note:Scoped styles don't technically "import" variables like this.
  Variables defined on :root or body in the parent component
  are inherited or accessible by children elements regardless of scoping.
  This comment is just for conceptual clarity. */

.main-container {
  padding: 20px;
  /* background-color inherits from body, which is var(--content-bg) */
}

.title-frame {
  margin-bottom: 15px;
}

.title-label {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 0;
  /* color: #24292e; */
  color: var(--text-primary); /* Use variable */
}

.subtitle-label {
  display: block;
  /* color: #586069; */
  color: var(--text-secondary); /* Use variable */
  margin-top: 5px;
}

.separator {
  height: 1px;
  /* background-color: #e1e4e8; */
  background-color: var(--border-color); /* Use variable */
  margin: 15px 0;
}

.section-frame {
  /* background-color: white; */
  background-color: var(--content-bg); /* Use variable */
  /* border: 1px solid #e1e4e8; */
  border: 1px solid var(--border-color); /* Use variable */
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
  /* box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); */
  box-shadow: var(--shadow); /* Use variable from App.vue */
}

.section-title {
  font-size: 1rem;
  margin: 0 0 15px 0;
  /* color: #24292e; */
  color: var(--text-primary); /* Use variable */
  font-weight: bold;
}

.input-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.input-label {
  width: 100px;
  flex-shrink: 0;
  color: var(--text-primary); /* Ensure text color adapts */
}

.input-field {
  flex: 1;
  padding: 6px 10px;
  /* border: 1px solid #e1e4e8; */
  border: 1px solid var(--border-color); /* Use variable */
  border-radius: 4px;
  /* background-color: white; */
  background-color: var(--content-bg); /* Use variable */
  /* color: initial; */
  color: var(--text-primary); /* Ensure text color adapts */
}

 .input-field:focus {
   outline: 2px solid var(--primary-color); /* Use variable */
   outline-offset: -1px;
 }

.button-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.save-button {
  padding: 8px 16px;
  /* background-color: #28a745; */
  background-color: var(--success-color); /* Use variable from App.vue */
  border: none;
  border-radius: 4px;
  /* color: white; */
  color: var(--active-text); /* Use variable (white works too) */
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}

/* Hover color might need adjustment in dark mode, but using a darker shade of the base color is common */
.save-button:hover {
  /* background-color: #218838; */
   /* A slightly darker green for hover, need to find a value that works in dark mode too */
   /* Using a fixed color for hover might be better than trying to calculate a shade of a variable */
   /* Let's keep the original for now, or define a new variable if needed */
   filter: brightness(90%); /* A simple way to darken the background */
}

/* 分辨率设置样式 */
.section-container {
  margin-bottom: 15px;
}

.toggle-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.toggle-container {
  position: relative;
  width: 40px;
  height: 20px;
  margin-right: 8px;
}

.toggle {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  margin: 0;
  cursor: pointer;
  z-index: 1;
}
  .toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* background-color: #ccc; */
  background-color: var(--border-color); /* Use variable for unselected */
  transition: .4s;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  /* background-color: white; */
  background-color: var(--content-bg); /* Use variable for the thumb */
  transition: .4s;
  border-radius: 50%;
}

.toggle:checked + .toggle-slider {
  /* background-color: #0366d6; */
  background-color: var(--primary-color); /* Use variable for selected */
}

.toggle:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.toggle-label1 {
  font-weight: 500;
   color: var(--text-primary); /* Ensure text color adapts */
}

.settings-container {
  margin-left: 20px;
  padding: 10px;
  /* background-color: #f6f8fa; */
  background-color: var(--hover-bg); /* Use variable for light background */
  border-radius: 4px;
  /* border: 1px solid var(--border-color); Optional border */
}

.grid-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.grid-row {
  display: flex;
  align-items: center;
}

.grid-label {
    color: var(--text-primary); /* Ensure text color adapts */
}

.small-select {
  width: 60px;
  padding: 4px;
  border-radius: 4px;
  /* border: 1px solid #e1e4e8; */
  border: 1px solid var(--border-color); /* Use variable */
   /* background-color: white; */
  background-color: var(--content-bg); /* Use variable */
  /* color: initial; */
  color: var(--text-primary); /* Ensure text color adapts */
}

.medium-select {
  width: 100px;
  padding: 4px;
  border-radius: 4px;
  /* border: 1px solid #e1e4e8; */
  border: 1px solid var(--border-color); /* Use variable */
  /* background-color: white; */
  background-color: var(--content-bg); /* Use variable */
  /* color: initial; */
  color: var(--text-primary); /* Ensure text color adapts */
}

.ml-15 {
  margin-left: 15px;
}

.tip-text {
  /* color: #586069; */
  color: var(--text-secondary); /* Use variable */
  font-size: 0.85rem;
  margin-top: 8px;
}

.status-frame {
  margin-top: 15px;
  /* color: #586069; */
  color: var(--text-secondary); /* Use variable */
}

/* 新增输入框样式 */
.size-input {
  width: 80px;
  padding: 4px 8px;
  /* border: 1px solid #e1e4e8; */
  border: 1px solid var(--border-color); /* Use variable */
  border-radius: 4px;
  margin-right: 10px;
   /* background-color: white; */
  background-color: var(--content-bg); /* Use variable */
  /* color: initial; */
  color: var(--text-primary); /* Ensure text color adapts */
}

.size-input:focus {
  /* outline: 2px solid #0366d6; */
  outline: 2px solid var(--primary-color); /* Use variable */
  outline-offset: -1px;
}
</style>