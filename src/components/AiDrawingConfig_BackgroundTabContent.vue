<template>
    <div class="main-container">
      <div class="title-frame">
        <h3 class="title-label">背景绘画模型配置</h3>
        <span class="subtitle-label">配置AI绘画背景图片生成模型</span>
      </div>
      
      <div class="separator"></div>
      
      <!-- 上下文设置区域 -->
      <div class="section-frame">
        <h4 class="section-title">上下文设置</h4>
        
        <div class="context-options-frame">
          <div class="left-options">
            <label class="label-bold">传入上下文:</label>
            <select v-model="conveyContext" class="context-select" @change="toggleContextEntry">
              <option value="不传入">不传入</option>
              <option value="部分传入">部分传入</option>
              <option value="全部传入">全部传入</option>
            </select>
            
            <template v-if="conveyContext === '部分传入'">
              <label class="entry-label">传入条数:</label>
              <input 
                type="text" 
                v-model="contextEntry" 
                class="entry-input" 
                @input="validateNaturalNumber"
                @blur="saveBackgroundConfig"
              />
            </template>
          </div>
          
          <div class="right-info">
            <p class="context-info">
              传入上下文选项决定AI绘画生成背景图时参考的对话数量，有助于使背景图更贴近故事情境。
            </p>
          </div>
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
            <button class="save-button" @click="saveBackgroundConfig">
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
            v-for="(entry, index) in backgroundConfig" 
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
                @input="validateNaturalNumberForEntry($event, entry, 'priority')"
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
        <span class="status-label">{{ backgroundStatus }}</span>
        <span class="priority-tip">提示: 优先级数值越高越优先使用，同级则按权重比例分配</span>
      </div>
    </div>
  </template>
  
  <script>
import { generateJS, loadConfigJS } from './services/ImageGenerationService.js';

  export default {
    name: 'BackgroundTabContent',
    data() {
      return {
        conveyContext: "不传入",
        contextEntry: "50",
        backgroundConfig: [],
        backgroundStatus: "准备就绪"
      }
    },
    methods: {
      // 加载配置
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

      loadBackgroundConfig() {
        try {
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
          
          // 加载上下文设置
          this.conveyContext = config.AI_draw.convey_context || "不传入";
          this.contextEntry = config.AI_draw.context_entry?.toString() || "50";
          
          // 加载模型配置
          this.backgroundConfig = config.AI_draw.background_config || [];
          
          // 确保渲染后显示/隐藏条数输入框
          this.$nextTick(() => {
            this.toggleContextEntry();
          });
        } catch (error) {
          console.error("加载背景配置时出错:", error);
          this.initializeDefaultConfig();
        }
      },
      
      // 初始化默认配置
      initializeDefaultConfig() {
        const defaultConfig = {
          AI_draw: {
            convey_context: "不传入",
            context_entry: 50,
            background_config: [
              { config: "阿里_fluxdev", weigh: 1, priority: 1 }
            ]
          }
        };
        
        try {
          const configStr = localStorage.getItem('aiGalgameConfig');
          const config = configStr ? JSON.parse(configStr) : {};
          
          config.AI_draw = config.AI_draw || {};
          config.AI_draw.convey_context = defaultConfig.AI_draw.convey_context;
          config.AI_draw.context_entry = defaultConfig.AI_draw.context_entry;
          config.AI_draw.background_config = defaultConfig.AI_draw.background_config;
          
          localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
          
          // 更新本地数据
          this.conveyContext = defaultConfig.AI_draw.convey_context;
          this.contextEntry = defaultConfig.AI_draw.context_entry.toString();
          this.backgroundConfig = defaultConfig.AI_draw.background_config;
        } catch (error) {
          console.error("初始化默认配置时出错:", error);
        }
      },
      
      // 切换上下文条目输入框
      toggleContextEntry() {
        // 在Vue中，这是通过v-if/v-show在模板中实现的
        // 这个函数主要用于保存设置
        if (this.conveyContext !== "部分传入") {
          this.contextEntry = "";
        } else if (!this.contextEntry) {
          this.contextEntry = "50";
        }
        
        // 触发保存
        this.saveBackgroundConfig();
      },
      
      // 保存背景配置
      saveBackgroundConfig() {
        try {
          // 验证数据
          const validConfig = this.backgroundConfig.filter(entry => {
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
          
          // 保存模型配置
          config.AI_draw.background_config = validConfig;
          
          // 保存上下文设置
          config.AI_draw.convey_context = this.conveyContext;
          
          // 根据选项保存条数
          if (this.conveyContext === "部分传入") {
            const contextNum = parseInt(this.contextEntry);
            if (!isNaN(contextNum) && contextNum >= 0) {
              config.AI_draw.context_entry = contextNum;
            } else {
              // 默认值
              this.contextEntry = "50";
              config.AI_draw.context_entry = 50;
            }
          } else {
            // 非"部分传入"时清空条数设置
            config.AI_draw.context_entry = "";
          }
          
          // 保存到localStorage
          localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
          
          // 更新状态
          this.backgroundStatus = "配置已保存";
          setTimeout(() => {
            this.backgroundStatus = "准备就绪";
          }, 2000);
          
          this.$emit('show-message', { title: "success", message: "背景配置已保存！"});
          
        } catch (error) {
          this.$emit('show-message', { title: "error", message: "保存背景配置时出错:"+error});
        }
      },
      
      // 添加新配置条目
      addConfigEntry() {
        this.backgroundConfig.push({
          config: this.availableModels[0],
          weigh: 1,
          priority: 0
        });
        
        // 更新状态
        this.backgroundStatus = "已添加新模型配置";
        setTimeout(() => {
          this.backgroundStatus = "准备就绪";
        }, 2000);
      },
      
      // 删除配置条目
      deleteConfigEntry(index) {
        this.backgroundConfig.splice(index, 1);
      },
      
      // 测试配置
      async testConfig(modelName) {
      // Update status for user feedback
      this.$emit('show-message', {
        title: "info",
        message: `开始测试模型: ${modelName}...`
      });
      this.backgroundStatus = `正在测试模型: ${modelName}...`;

      try {
        // 1. Load current configuration
        const config = loadConfigJS();
        if (!config) {
          this.$emit('show-message', {
            title: "error",
            message: "测试失败: 无法加载配置."
          });
          this.backgroundStatus = "测试失败: 无法加载配置";
          return;
        }

        // 2. Define test parameters
        const testBaseDir = '/data/test'; // Base directory for testing as requested
        const testImagesDir = `${testBaseDir}/images`; // Specific directory for generated test images
        const testPrompt = "Design a hyper-realistic scene, showcasing a weathered wooden house teetering on the edge of a rugged cliff, viewed from a low angle. The house features a small balcony with laundry hanging out to dry, casting sharp shadows under the bright midday sun. Lush greenery envelops the base of the cliff, while the expansive landscape is mostly hidden by dense foliage. Although the day is clear, the scene evokes an eerie and isolated atmosphere, with sharp, high-contrast details amplifying the sense of desolation and solitude"; // Specific background prompt
        // Create a unique filename to avoid collisions, sanitizing modelName
        const sanitizedModelName = modelName.replace(/[^a-zA-Z0-9_.-]/g, '_'); // Basic sanitization
        const testImageName = `test_${sanitizedModelName}_${Date.now()}`;

        // Optional: Explicitly ensure the test directory exists
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
        this.backgroundStatus = `正在生成测试图像 ${testImageName}.png ...`;


        // 3. Call generateJS from ImageGenerationService
        // Parameters: config, imagesDir, prompt, imageName, model
        const status = await generateJS(config, testImagesDir, testPrompt, testImageName, modelName);

        // 4. Report result based on the status returned by generateJS
        if (status === 'success') {
          this.$emit('show-message', {
            title: "success",
            message: `模型 ${modelName} 测试成功! 图像已生成: ${testImagesDir}/${testImageName}.png`
          });
          this.backgroundStatus = `模型 ${modelName} 测试成功!`;
        } else if (status === 'forbid') {
           this.$emit('show-message', {
            title: "warning",
            message: `模型 ${modelName} 测试被阻止 (Forbid). 可能触发了敏感词或特定规则.`
          });
          this.backgroundStatus = `模型 ${modelName} 测试被阻止 (Forbid).`;
        } else { // Includes 'error' and potentially other failure statuses
          this.$emit('show-message', {
            title: "error",
            message: `模型 ${modelName} 测试失败. 返回状态: ${status}`
          });
          this.backgroundStatus = `模型 ${modelName} 测试失败 (状态: ${status})`;
        }

      } catch (error) {
        // Catch any unexpected errors during the process
        console.error(`测试模型 ${modelName} 时发生错误:`, error);
        this.$emit('show-message', {
          title: "error",
          message: `测试模型 ${modelName} 时发生异常: ${error.message}`
        });
        this.backgroundStatus = `测试模型 ${modelName} 时发生异常`;
      } finally {
         // Optional: Reset status after a delay
         setTimeout(() => {
             if (this.backgroundStatus.startsWith(`模型 ${modelName} 测试`)) {
                 this.backgroundStatus = "准备就绪";
             }
         }, 5000);
      }
    },
      
      // 显示帮助
      showHelp() {
        const helpText = "传入上下文选项是指，LLM模型会传入最近对话的多少条来生成背景绘画提示词，这是为了使生成的背景图更贴近故事。程序优先选择优先级最高的图像生成模型，并在同等优先级的模型中，根据预设的权重分配生成任务，权重高的模型承担更多任务。当高优先级模型达到并发上限或生成失败时，程序会动态调整任务分配，或自动切换到较低优先级的模型继续生成。";
        
        this.$emit('show-message', { title: "success", message: helpText
      });
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
      
      // 验证自然数输入（包括0）- 针对条目
      validateNaturalNumberForEntry(event, entry, field) {
        const value = event.target.value;
        if (value === '') return;
        
        const regex = /^(0|[1-9]\d*)$/;
        if (!regex.test(value)) {
          event.target.value = entry[field].toString().replace(/[^0-9]/g, '') || '0';
          entry[field] = parseInt(event.target.value);
        } else {
          entry[field] = parseInt(value);
        }
      },
      
      // 验证自然数输入（包括0）- 针对上下文条数
      validateNaturalNumber(event) {
        const value = event.target.value;
        if (value === '') return;
        
        const regex = /^(0|[1-9]\d*)$/;
        if (!regex.test(value)) {
          this.contextEntry = this.contextEntry.replace(/[^0-9]/g, '') || '50';
        }
      }
    },
    mounted() {
      this.loadBackgroundConfig();
    }
  }
  </script>
  
  <style scoped>
  /* Variables should ideally be imported or defined in a shared place if not global */
  /* For this example, we assume App.vue's variables are accessible globally via :root / body.dark-theme */
  
  .main-container {
    padding: 20px;
    /* Add transition for smooth background change if needed, though main-content handles it */
    /* transition: background-color 0.3s ease; */
  }
  
  .title-frame {
    margin-bottom: 15px;
  }
  
  .title-label {
    font-size: 1.25rem;
    font-weight: bold;
    margin: 0;
    color: var(--text-primary); /* Use theme variable */
    transition: color 0.3s ease;
  }
  
  .subtitle-label {
    display: block;
    color: var(--text-secondary); /* Use theme variable */
    margin-top: 5px;
    transition: color 0.3s ease;
  }
  
  .separator,
  .separator-small {
    height: 1px;
    background-color: var(--border-color); /* Use theme variable */
    margin: 15px 0;
    transition: background-color 0.3s ease;
  }
  
  .separator-small {
    margin: 10px 0;
  }
  
  .section-frame {
    background-color: var(--content-bg); /* Use theme variable */
    border: 1px solid var(--border-color); /* Use theme variable */
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
    /* box-shadow is handled by App.vue on body, but you can add one here too */
    /* box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); */
    transition: background-color 0.3s ease, border-color 0.3s ease;
  }
  
  .section-title {
    font-size: 1rem;
    margin: 0 0 15px 0;
    color: var(--text-primary); /* Use theme variable */
    font-weight: bold;
    transition: color 0.3s ease;
  }
  
  /* 上下文设置样式 */
  .context-options-frame {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    padding: 5px;
  }
  
  .left-options {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .label-bold {
    font-weight: bold;
    margin-right: 10px;
    color: var(--text-primary); /* Use theme variable */
    transition: color 0.3s ease;
  }
  
  .context-select,
  .entry-input {
    padding: 6px 10px;
    border: 1px solid var(--border-color); /* Use theme variable */
    border-radius: 4px;
    transition: border-color 0.3s ease, background-color 0.3s ease, color 0.3s ease;
  }
  
  .context-select {
     margin-right: 5px;
     /* Default light mode style */
     background-color: white;
     color: initial; /* Use default text color */
  }
  
  .entry-label {
    margin: 0 10px 0 15px;
    color: var(--text-primary); /* Use theme variable */
    transition: color 0.3s ease;
  }
  
  .entry-input {
    width: 60px;
    /* Default light mode style */
     background-color: white;
     color: initial; /* Use default text color */
  }
  
  
  .right-info {
    flex: 1;
    min-width: 300px;
    margin-left: 20px;
  }
  
  .context-info {
    color: var(--text-secondary); /* Use theme variable */
    font-size: 0.9rem;
    margin: 0;
    transition: color 0.3s ease;
  }
  
  /* 模型列表样式 */
  .model-list-frame {
    flex: 1;
    display: flex;
    flex-direction: column;
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
  
  .add-button, .save-button {
    padding: 6px 12px;
    border: 1px solid transparent; /* Start with transparent border for simpler transition */
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    margin-right: 5px;
    transition: all 0.3s ease; /* Smooth transition for colors/background/border */
  }
  
  .add-button {
    background-color: #f1f8ff; /* Light mode specific color */
    color: #0366d6; /* Light mode specific color */
    border-color: #c8e1ff; /* Light mode specific color */
  }
  
  .save-button {
    background-color: #28a745; /* Light mode specific color */
    color: white; /* Light mode specific color */
  }
  
  .help-text-small {
    font-size: 0.9rem;
    color: var(--text-secondary); /* Use theme variable */
    margin-right: 5px;
    transition: color 0.3s ease;
  }
  
  .help-button {
    background: none;
    border: 1px solid var(--border-color); /* Use theme variable */
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--primary-color); /* Use theme variable */
    font-size: 12px;
    transition: all 0.3s ease; /* Smooth transition */
  }
  
  /* 列表标题样式 */
  .header-frame {
    display: flex;
    padding: 8px 5px;
    font-weight: bold;
    color: var(--text-primary); /* Use theme variable */
    background-color: var(--hover-bg); /* Use theme variable, hover-bg is good for headers/alternating rows */
    border-radius: 4px 4px 0 0;
    border-bottom: 1px solid var(--border-color); /* Use theme variable */
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
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
    border: 1px solid var(--border-color); /* Use theme variable */
    border-top: none;
    border-radius: 0 0 4px 4px;
    transition: border-color 0.3s ease;
  }
  
  .entry-frame {
    display: flex;
    padding: 8px 5px;
    border-bottom: 1px solid var(--border-color); /* Use theme variable */
    background-color: var(--content-bg); /* Default row background */
    transition: background-color 0.3s ease, border-color 0.3s ease;
  }
  
  .entry-frame:last-child {
    border-bottom: none;
  }
  
  .even-row {
    background-color: var(--hover-bg); /* Use theme variable for alternating background */
  }
  
  .model-select,
  .weight-input,
  .priority-input {
    width: 100%; /* Adjusted widths slightly */
    padding: 5px;
    border: 1px solid var(--border-color); /* Use theme variable */
    border-radius: 4px;
    transition: border-color 0.3s ease, background-color 0.3s ease, color 0.3s ease;
     /* Default light mode styles */
    background-color: white;
    color: initial; /* Use default text color */
  }
  
  .weight-input,
  .priority-input {
      width: 80%; /* Restore specific widths */
  }
  
  
  .action-buttons {
    display: flex;
  }
  
  .delete-button, .test-button {
    width: 30px;
    height: 30px;
    border: 1px solid transparent; /* Start with transparent border */
    border-radius: 4px;
    cursor: pointer;
    margin-right: 5px;
    transition: all 0.3s ease; /* Smooth transition */
  }
  
  .delete-button {
    background-color: #ffdce0; /* Light mode specific color */
    color: #cb2431; /* Light mode specific color */
  }
  
  .test-button {
    background-color: #f1f8ff; /* Light mode specific color */
    color: #0366d6; /* Light mode specific color */
  }
  
  /* 状态栏样式 */
  .status-frame {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
  }
  
  .status-label {
    color: var(--text-secondary); /* Use theme variable */
    transition: color 0.3s ease;
  }
  
  .priority-tip {
    color: var(--text-secondary); /* Use theme variable */
    font-size: 0.85rem;
    transition: color 0.3s ease;
  }
  
  /* --- Dark Theme Specific Styles --- */
  /* Apply styles when the body has the 'dark-theme' class */
  body.dark-theme {
  
    /* Override colors for inputs/selects in dark mode */
    /* Browser default styles for inputs often need explicit overrides */
    .context-select,
    .entry-input,
    .model-select,
    .weight-input,
    .priority-input {
        background-color: var(--content-bg); /* Or a slightly darker color like var(--sidebar-bg) */
        color: var(--text-primary);
        border-color: var(--border-color);
    }
  
    /* Override button styles in dark mode */
    .add-button {
      background-color: var(--hover-bg); /* Use a darker background */
      color: var(--primary-color); /* Keep primary color for text/icon */
      border-color: var(--border-color); /* Use theme border color */
    }
  
    .save-button {
      background-color: var(--success-color); /* Use theme success color */
      color: white; /* Ensure good contrast */
    }
  
    .help-button {
      border-color: var(--border-color); /* Use theme border color */
      color: var(--primary-color); /* Keep primary color for icon */
      background-color: transparent; /* Ensure background is transparent */
    }
  
    .delete-button {
      background-color: var(--error-color); /* Use theme error color */
      color: white; /* Ensure good contrast */
    }
  
    .test-button {
      background-color: var(--hover-bg); /* Use a darker background */
      color: var(--primary-color); /* Keep primary color for text/icon */
    }
  
    /* Re-apply even row background for dark theme */
    /* Ensure contrast between odd and even rows in dark mode */
    /* Default entry-frame background is var(--content-bg) */
    /* even-row background should be different, e.g., var(--hover-bg) */
    .entry-frame {
        background-color: var(--content-bg); /* Odd rows use the main content background */
    }
    .even-row {
        background-color: var(--hover-bg); /* Even rows use the hover background (slightly darker) */
    }
  
    /* Re-apply header background for dark theme */
     .header-frame {
        background-color: var(--hover-bg); /* Match even rows or use sidebar-bg */
    }
  
  }
  </style>