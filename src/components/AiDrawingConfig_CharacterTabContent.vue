<template>
  <div class="main-container">
    <div class="title-frame">
      <h3 class="title-label">人物绘画模型配置</h3>
      <span class="subtitle-label">配置AI绘画人物图片生成模型</span>
    </div>
    
    <div class="separator"></div>
    
    <!-- 基本设置区域 -->
    <div class="section-frame">
      <h4 class="section-title">基本设置</h4>
      
      <div class="switch-frame">
        <label class="switch-label">绘制非主要人物:</label>
        
        <div class="toggle-container2">
          <input type="checkbox" v-model="drawNonMainCharacter" class="toggle" @change="saveCharacterSwitch" />
          <div class="toggle-slider"></div>
        </div>
        
        <span class="toggle-text">启用</span>
        
        <p class="help-text">
          启用此功能后，系统将为故事中的非主要人物也生成AI绘画。注意：这会增加LLM模型和AI绘图的使用量。
        </p>
      </div>
    </div>
    
    <!-- 模型配置列表区域 -->
    <div class="section-frame model-list-frame">
      <h4 class="section-title">模型配置列表</h4>
      
      <div class="toolbar-frame">
        <div class="left-buttons">
          <button class="add-button" @click="addConfigEntry">
            ➕ 新增模型
          </button>
          <button class="save-button" @click="saveCharacterConfig">
            💾 保存配置
          </button>
        </div>
        
        <div class="right-buttons">
          <span class="help-text-small">说明</span>
          <button class="help-button" @click="showHelp" title="点击查看帮助">❔</button>
        </div>
      </div>
      
      <div class="separator-small"></div>
      
      <!-- 列表标题 -->
      <div class="header-frame">
        <div class="model-col">模型</div>
        <div class="weight-col">权重</div>
        <div class="priority-col">优先级</div>
        <div class="action-col">操作</div>
      </div>
      
      <!-- 列表内容 -->
      <div class="entries-container" ref="entriesContainer">
        <div 
          v-for="(entry, index) in characterConfig" 
          :key="index"
          class="entry-frame"
          :class="{ 'even-row': index % 2 === 0 }"
        >
          <div class="model-col">
            <select v-model="entry.config" class="model-select">
              <option v-for="model in availableModels" :key="model" :value="model">
                {{ model }}
              </option>
            </select>
          </div>
          
          <div class="weight-col">
            <input 
              type="text" 
              v-model="entry.weigh" 
              class="weight-input"
              @input="validatePositiveInt($event, entry, 'weigh')"
            />
          </div>
          
          <div class="priority-col">
            <input 
              type="text" 
              v-model="entry.priority" 
              class="priority-input"
              @input="validateNaturalNumber($event, entry, 'priority')"
            />
          </div>
          
          <div class="action-col">
            <div class="action-buttons">
              <button class="delete-button" @click="deleteConfigEntry(index)" title="删除">
                🗑
              </button>
              <button class="test-button" @click="testConfig(entry.config)" title="测试">
                🔍
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 状态栏 -->
    <div class="status-frame">
      <span class="status-label">{{ characterStatus }}</span>
      <span class="priority-tip">提示: 优先级数值越高越优先使用，同级则按权重比例分配</span>
    </div>
  </div>
</template>



<script>
import { generateJS, loadConfigJS } from './services/ImageGenerationService.js';

export default {
  name: 'CharacterTabContent',
  data() {
    return {
      drawNonMainCharacter: false,
      characterConfig: [],
      availableModels: [],  // 将改为动态获取
      characterStatus: "准备就绪"
    }
  },
  methods: {
    // 获取AI_draw.configs下的所有键名
    getConfigKeys() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        if (!configStr) return [];
        
        const config = JSON.parse(configStr);
        if (!config.AI_draw || !config.AI_draw.configs) return [];
        
        // 返回configs下的所有键名
        return Object.keys(config.AI_draw.configs);
      } catch (error) {
        console.error("获取配置键名时出错:", error);
        return [];
      }
    },
    
    // 加载配置
    loadCharacterConfig() {
      try {
        // 获取AI_draw.configs下的所有键名作为下拉框选项
        this.availableModels = this.getConfigKeys();
        
        // 如果没有可用模型，添加一个默认选项
        if (this.availableModels.length === 0) {
          this.availableModels = ["默认模型"];
        }
        
        const configStr = localStorage.getItem('aiGalgameConfig');
        if (!configStr) {
          this.initializeDefaultConfig();
          return;
        }
        
        const config = JSON.parse(configStr);
        if (!config.AI_draw) {
          this.initializeDefaultConfig();
          return;
        }
        
        // 加载非主要人物绘制开关
        // 修正：使用配置中实际存储的属性名
        this.drawNonMainCharacter = config.AI_draw.draw_non_main_character || false;
        
        // 加载模型配置
        this.characterConfig = config.AI_draw.character_config || [];
        
      } catch (error) {
        console.error("加载人物配置时出错:", error);
        this.initializeDefaultConfig();
      }
    },
    
    // 初始化默认配置
    initializeDefaultConfig() {
      // 获取默认模型（如果有）
      const defaultModel = this.availableModels.length > 0 ? this.availableModels[0] : "默认模型";
      
      const defaultConfig = {
        AI_draw: {
          draw_non_main_character: false,
          character_config: [
            { config: defaultModel, weigh: 1, priority: 1 }
          ]
        }
      };
      
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        const config = configStr ? JSON.parse(configStr) : {};
        
        config.AI_draw = config.AI_draw || {};
        config.AI_draw.draw_non_main_character = defaultConfig.AI_draw.draw_non_main_character;
        config.AI_draw.character_config = defaultConfig.AI_draw.character_config;
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        // 更新本地数据
        this.drawNonMainCharacter = defaultConfig.AI_draw.draw_non_main_character;
        this.characterConfig = defaultConfig.AI_draw.character_config;
      } catch (error) {
        console.error("初始化默认配置时出错:", error);
      }
    },
    
    // 保存开关状态
    saveCharacterSwitch() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        const config = configStr ? JSON.parse(configStr) : {};
        
        if (!config.AI_draw) config.AI_draw = {};
        // 修正：使用配置中实际存储的属性名
        config.AI_draw.draw_non_main_character = this.drawNonMainCharacter;
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        this.$emit('show-message', { title: "success", message: "开关已保存"})
      } catch (error) {
        this.$emit('show-message', { title: "success", message: "保存开关状态出错"+error})
        console.error("保存开关状态时出错:", error);
      }
    },
    
    // 保存人物配置
    saveCharacterConfig() {
      try {
        // 验证数据
        const validConfig = this.characterConfig.filter(entry => {
          return entry.config && entry.weigh && /^\d+$/.test(entry.weigh.toString());
        });
        
        if (validConfig.length === 0) {
          this.$emit('show-message', { title: "warning", message: "至少需要一个有效的模型配置"
          });
          return;
        }
        
        const configStr = localStorage.getItem('aiGalgameConfig');
        const config = configStr ? JSON.parse(configStr) : {};
        
        if (!config.AI_draw) config.AI_draw = {};
        config.AI_draw.character_config = validConfig;
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        // 更新状态
        this.characterStatus = "配置已保存";
        setTimeout(() => {
          this.characterStatus = "准备就绪";
        }, 2000);
        
        this.$emit('show-message', { title: "success", message: "人物配置已保存！"
      });
      } catch (error) {
        console.error("保存人物配置时出错:", error);
      }
    },
    
    // 添加新配置条目
    addConfigEntry() {
      // 使用可用模型中的第一个作为默认值
      const defaultModel = this.availableModels.length > 0 ? this.availableModels[0] : "";
      
      this.characterConfig.push({
        config: defaultModel,
        weigh: 1,
        priority: 0
      });
      
      // 更新状态
      this.characterStatus = "已添加新模型配置";
      setTimeout(() => {
        this.characterStatus = "准备就绪";
      }, 2000);
    },
    
    // 删除配置条目
    deleteConfigEntry(index) {
      this.characterConfig.splice(index, 1);
    },
    
    // 测试配置
    async testConfig(modelName) {
      // Update status for user feedback
      this.$emit('show-message', {
        title: "info",
        message: `开始测试模型: ${modelName}...`
      });
      this.characterStatus = `正在测试模型: ${modelName}...`;

      try {
        // 1. Load current configuration
        const config = loadConfigJS();
        if (!config) {
          this.$emit('show-message', {
            title: "error",
            message: "测试失败: 无法加载配置."
          });
          this.characterStatus = "测试失败: 无法加载配置";
          return;
        }

        // 2. Define test parameters
        const testBaseDir = '/data/test'; // Base directory for testing as requested
        const testImagesDir = `${testBaseDir}/images`; // Specific directory for generated test images
        const testPrompt = "(masterpiece), 1girl, micro bangs, widow's peak, black eyes, jungle, kimono skirt, cashmere, scenery, chibi, one eye closed, open mouth, smile, looking at viewer, sparkle, cute creature"; // Specific character prompt
        // Create a unique filename to avoid collisions, sanitizing modelName
        const sanitizedModelName = modelName.replace(/[^a-zA-Z0-9_.-]/g, '_'); // Basic sanitization
        const testImageName = `test_${sanitizedModelName}_${Date.now()}`;

        // Optional: Explicitly ensure the test directory exists (generateJS might handle this via idbFs implicitly)
        // try {
        //   await idbFs.createFolder(testImagesDir);
        //   console.log(`Ensured test directory exists: ${testImagesDir}`);
        // } catch (dirError) {
        //   console.warn(`Could not ensure test directory ${testImagesDir}, proceeding anyway...`, dirError);
        // }

        this.$emit('show-message', {
          title: "info",
          message: `使用模型 ${modelName} 生成测试图像: ${testImageName}.png 到 ${testImagesDir}`
        });
        this.characterStatus = `正在生成测试图像 ${testImageName}.png ...`;


        // 3. Call generateJS from ImageGenerationService
        // Parameters: config, imagesDir, prompt, imageName, model
        const status = await generateJS(config, testImagesDir, testPrompt, testImageName, modelName);

        // 4. Report result based on the status returned by generateJS
        if (status === 'success') {
          this.$emit('show-message', {
            title: "success",
            message: `模型 ${modelName} 测试成功! 图像已生成: ${testImagesDir}/${testImageName}.png`
          });
          this.characterStatus = `模型 ${modelName} 测试成功!`;
        } else if (status === 'forbid') {
           this.$emit('show-message', {
            title: "warning",
            message: `模型 ${modelName} 测试被阻止 (Forbid). 可能触发了敏感词或特定规则.`
          });
          this.characterStatus = `模型 ${modelName} 测试被阻止 (Forbid).`;
        } else { // Includes 'error' and potentially other failure statuses
          this.$emit('show-message', {
            title: "error",
            message: `模型 ${modelName} 测试失败. 返回状态: ${status}`
          });
          this.characterStatus = `模型 ${modelName} 测试失败 (状态: ${status})`;
        }

      } catch (error) {
        // Catch any unexpected errors during the process
        console.error(`测试模型 ${modelName} 时发生错误:`, error);
        this.$emit('show-message', {
          title: "error",
          message: `测试模型 ${modelName} 时发生异常: ${error.message}`
        });
        this.characterStatus = `测试模型 ${modelName} 时发生异常`;
      } finally {
         // Optional: Reset status after a delay
         setTimeout(() => {
             if (this.characterStatus.startsWith(`模型 ${modelName} 测试`)) {
                 this.characterStatus = "准备就绪";
             }
         }, 5000);
      }
    },
    
    // 显示帮助
    showHelp () {
      const helpText = "开启绘制非主要人物则会尝试为配角生成AI绘画提示词并生成图片。这会增加LLM模型和AI绘图消耗量。程序优先选择优先级最高的图像生成模型，并在同等优先级的模型中，根据预设的权重分配生成任务，权重高的模型承担更多任务。当高优先级模型达到并发上限或生成失败时，程序会动态调整任务分配，或自动切换到较低优先级的模型继续生成。";
      
      this.$emit('show-message', { title: "success", message: helpText});
    },
    
    // 验证正整数输入
    validatePositiveInt(event, entry, field) {
      const value = event.target.value;
      if (value === '') return;
      
      const regex = /^[1-9]\d*$/;
      if (!regex.test(value)) {
        event.target.value = entry[field].toString().replace(/[^0-9]/g, '') || '1';
        entry[field] = parseInt(event.target.value);
      } else {
        entry[field] = parseInt(value);
      }
    },
    
    // 验证自然数输入（包括0）
    validateNaturalNumber(event, entry, field) {
      const value = event.target.value;
      if (value === '') return;
      
      const regex = /^(0|[1-9]\d*)$/;
      if (!regex.test(value)) {
        event.target.value = entry[field].toString().replace(/[^0-9]/g, '') || '0';
        entry[field] = parseInt(event.target.value);
      } else {
        entry[field] = parseInt(value);
      }
    }
  },
  mounted() {
    this.loadCharacterConfig();
  }
}
</script>

<style scoped>
/* 样式适应深色模式 */
.main-container {
  padding: 20px;
  /* Inherits background and text color from App.vue .content */
}

.title-frame {
  margin-bottom: 15px;
}

.title-label {
  font-size: 1.25rem;
  font-weight: bold;
  margin: 0;
  /* Use text-primary variable */
  color: var(--text-primary); /* Changed */
  transition: color var(--transition-speed); /* Added transition */
}

.subtitle-label {
  display: block;
  /* Use text-secondary variable */
  color: var(--text-secondary); /* Changed */
  margin-top: 5px;
  transition: color var(--transition-speed); /* Added transition */
}

.separator, .separator-small {
  height: 1px;
  /* Use border-color variable */
  background-color: var(--border-color); /* Changed */
  margin: 15px 0;
  transition: background-color var(--transition-speed); /* Added transition */
}

.separator-small {
   margin: 10px 0;
}


.section-frame {
  /* Use content-bg for background in both modes, App.vue handles the base */
  background-color: var(--content-bg); /* Changed */
  /* Use border-color variable */
  border: 1px solid var(--border-color); /* Changed */
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
  /* Use shadow variable, App.vue handles dark mode shadow */
  box-shadow: var(--shadow); /* Changed */
  transition: background-color var(--transition-speed), border-color var(--transition-speed), box-shadow var(--transition-speed); /* Added transition */
}

.model-list-frame {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 1rem;
  margin: 0 0 15px 0;
  /* Use text-primary variable */
  color: var(--text-primary); /* Changed */
  font-weight: bold;
  transition: color var(--transition-speed); /* Added transition */
}

/* 开关样式 */
.switch-frame {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 10px 5px;
}

.switch-label {
  font-weight: bold;
  margin-right: 10px;
  /* Inherits text color from parent (main-container/section-frame) */
  color: var(--text-primary); /* Ensure it uses primary text color */
  transition: color var(--transition-speed); /* Added transition */
}

.toggle-container2 {
  position: relative;
  width: 40px;
  height: 20px;
  margin-right: 5px;
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
  background-color: #ccc; /* Default light mode color */
  transition: .4s;
  border-radius: 20px;
}

body.dark-theme .toggle-slider {
    background-color: #555; /* Dark mode color when off */
}


.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white; /* Default light mode handle */
  transition: .4s;
  border-radius: 50%;
}

body.dark-theme .toggle-slider:before {
    background-color: #eee; /* Dark mode handle color */
}


.toggle:checked + .toggle-slider {
  background-color: #0366d6; /* Default light mode active */
}

body.dark-theme .toggle:checked + .toggle-slider {
  background-color: var(--primary-color); /* Use primary color in dark mode */
}


.toggle:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.toggle-text {
  margin-right: 20px;
  /* Inherits text color from parent */
  color: var(--text-primary); /* Ensure it uses primary text color */
  transition: color var(--transition-speed); /* Added transition */
}

.help-text {
  margin-left: 20px;
  /* Use text-secondary variable */
  color: var(--text-secondary); /* Changed */
  flex: 1;
  transition: color var(--transition-speed); /* Added transition */
}

/* 工具栏样式 */
.toolbar-frame {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.left-buttons, .right-buttons {
  display: flex;
  align-items: center;
}

.add-button, .save-button, .help-button, .delete-button, .test-button {
  padding: 6px 12px;
  border: none; /* Buttons will have specific borders in dark mode */
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  margin-right: 5px;
  transition: background-color var(--transition-speed), color var(--transition-speed), border-color var(--transition-speed); /* Added transition */
}

/* Specific Button Styles & Dark Mode Overrides */

.add-button {
  background-color: #f1f8ff; /* Light mode */
  color: #0366d6; /* Light mode */
  border: 1px solid #c8e1ff; /* Light mode */
}
body.dark-theme .add-button {
  background-color: var(--hover-bg); /* Dark mode */
  color: var(--primary-color); /* Dark mode */
  border-color: var(--border-color); /* Dark mode */
}

.save-button {
  background-color: #28a745; /* Light mode */
  color: white; /* Light mode */
}
body.dark-theme .save-button {
  background-color: var(--success-color); /* Dark mode */
  color: var(--text-primary); /* Dark mode */
}

.help-text-small {
  font-size: 0.9rem;
  /* Use text-secondary variable */
  color: var(--text-secondary); /* Changed */
  margin-right: 5px;
  transition: color var(--transition-speed); /* Added transition */
}

.help-button {
  background: none;
  border: 1px solid #e1e4e8; /* Light mode */
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #0366d6; /* Light mode */
  font-size: 12px;
}
body.dark-theme .help-button {
  border-color: var(--border-color); /* Dark mode */
  color: var(--primary-color); /* Dark mode */
}


/* 列表标题样式 */
.header-frame {
  display: flex;
  padding: 8px 5px;
  font-weight: bold;
  /* Use text-primary variable */
  color: var(--text-primary); /* Changed */
  background-color: #f6f8fa; /* Light mode */
  border-radius: 4px 4px 0 0;
  border-bottom: 1px solid #e1e4e8; /* Light mode */
  transition: background-color var(--transition-speed), border-color var(--transition-speed), color var(--transition-speed); /* Added transition */
}
body.dark-theme .header-frame {
  background-color: var(--hover-bg); /* Dark mode */
  border-color: var(--border-color); /* Dark mode */
}


.model-col {
  flex: 55;
  padding: 0 5px;
}

.weight-col, .priority-col, .action-col {
  flex: 15;
  padding: 0 5px;
}

/* 列表内容样式 */
.entries-container {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e1e4e8; /* Light mode */
  border-top: none;
  border-radius: 0 0 4px 4px;
  transition: border-color var(--transition-speed); /* Added transition */
}
body.dark-theme .entries-container {
  border-color: var(--border-color); /* Dark mode */
}


.entry-frame {
  display: flex;
  padding: 8px 5px;
  border-bottom: 1px solid #e1e4e8; /* Light mode */
  transition: background-color var(--transition-speed), border-color var(--transition-speed); /* Added transition */
}
body.dark-theme .entry-frame {
  border-color: var(--border-color); /* Dark mode */
}

.entry-frame:last-child {
  border-bottom: none;
}

.even-row {
  background-color: #f8f9fa; /* Light mode */
}
body.dark-theme .even-row {
  background-color: var(--hover-bg); /* Dark mode */
}


.model-select, .weight-input, .priority-input {
  width: 100%; /* Model select takes full width */
  padding: 5px;
  border: 1px solid #e1e4e8; /* Light mode */
  border-radius: 4px;
  /* Default light mode background/color */
  background-color: white;
  color: #24292e;
  transition: background-color var(--transition-speed), color var(--transition-speed), border-color var(--transition-speed); /* Added transition */
}

.weight-input, .priority-input {
    width: 80%; /* Match original width */
}

body.dark-theme .model-select,
body.dark-theme .weight-input,
body.dark-theme .priority-input {
   border-color: var(--border-color); /* Dark mode */
   background-color: #334155; /* A slightly darker background for inputs */
   color: var(--text-primary); /* Dark mode */
}
/* Style for the dropdown arrow color in dark mode */
body.dark-theme .model-select {
    -webkit-appearance: none; /* Remove default arrow */
    -moz-appearance: none;
    appearance: none;
    background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23CBD5E1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-6.5%200-12.3%203.2-15.9%208.1-3.5%204.9-3.7%2011.3-0.8%2016.2l127.9%20127.9c5.7%205.7%2013.3%208.8%2021.2%208.8s15.5-3.1%2021.2-8.8L287%2091.1c3-5%202.7-11.3-0.7-16.1z%22%2F%3E%3C%2Fsvg%3E'); /* Light grey arrow */
    background-repeat: no-repeat;
    background-position: right 8px top 50%;
    background-size: 12px auto;
    padding-right: 30px; /* Make space for arrow */
}
/* Add a neutral background for the dropdown options themselves */
body.dark-theme .model-select option {
  background-color: #334155; /* Same as input background */
  color: var(--text-primary);
}


.action-buttons {
  display: flex;
}

.delete-button, .test-button {
  width: 30px;
  height: 30px;
  border: none; /* Buttons will have specific borders in dark mode */
  border-radius: 4px;
  cursor: pointer;
  margin-right: 5px;
   transition: background-color var(--transition-speed), color var(--transition-speed), border-color var(--transition-speed); /* Added transition */
}

.delete-button {
  background-color: #ffdce0; /* Light mode */
  color: #cb2431; /* Light mode */
}
body.dark-theme .delete-button {
  background-color: #441f23; /* Dark mode */
  color: var(--error-color); /* Dark mode */
}

.test-button {
  background-color: #f1f8ff; /* Light mode */
  color: #0366d6; /* Light mode */
}
body.dark-theme .test-button {
  background-color: var(--hover-bg); /* Dark mode */
  color: var(--primary-color); /* Dark mode */
}


/* Status bar样式 */
.status-frame {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  /* Inherits background from parent */
  /* Inherits text color from parent */
}

.status-label {
  /* Use text-secondary variable */
  color: var(--text-secondary); /* Changed */
  transition: color var(--transition-speed); /* Added transition */
}

.priority-tip {
  /* Use text-secondary variable */
  color: var(--text-secondary); /* Changed */
  font-size: 0.85rem;
  transition: color var(--transition-speed); /* Added transition */
}
</style> 