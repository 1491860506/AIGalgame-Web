<template>
  <div class="model-access-container">
    <div class="modal-header">
      <h2>接入模型配置区</h2>
      <button class="close-button" @click="$emit('close')">×</button>
    </div>

    <div class="modal-content">
      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <div
          v-for="tab in tabs"
          :key="tab"
          class="tab-item"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab }}
        </div>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Model Settings Tab -->
        <template v-if="activeTab !== '提示词'">
          <div class="model-settings">
            <div class="settings-controls">
              <div class="controls-left">
                <button class="btn btn-primary" @click="addSetting">
                  <i class="icon">➕</i> 新增设置
                </button>
                <button class="btn btn-accent" @click="saveSettings">
                  <i class="icon">💾</i> 保存设置
                </button>
              </div>
            </div>

            <div class="settings-header">
              <div class="header-config">配置</div>
              <div class="header-model">模型</div>
              <div class="header-weight">权重</div>
              <div class="header-priority">优先级</div>
              <div class="header-action">操作</div>
            </div>

            <div class="settings-container" ref="settingsContainer">
              <div
                v-for="(setting, index) in settings"
                :key="index"
                class="setting-row"
                :class="{ 'odd-row': index % 2 === 0, 'even-row': index % 2 === 1 }"
              >
                <div class="setting-config">
                  <select
                    v-model="setting.config"
                    class="config-dropdown"
                  >
                    <option v-for="name in configNames" :key="name" :value="name">
                      {{ name }}
                    </option>
                  </select>
                </div>
                <div class="setting-model">
                  <select
                    v-model="setting.model"
                    class="model-dropdown"
                  >
                    <option
                      v-for="name in modelsByConfig[setting.config] || []"
                      :key="name"
                      :value="name"
                    >
                      {{ name }}
                    </option>
                  </select>
                </div>
                <div class="setting-weight">
                  <input
                    type="text"
                    v-model="setting.weight"
                    class="weight-input"
                    @input="validatePositiveInt($event, setting, 'weight')"
                  />
                </div>
                <div class="setting-priority">
                  <input
                    type="text"
                    v-model="setting.priority"
                    class="priority-input"
                    @input="validateNatureInt($event, setting, 'priority')"
                  />
                </div>
                <div class="setting-action">
                  <button class="btn btn-danger btn-sm" @click="deleteSetting(index)">
                    <i class="icon">🗑</i> 删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Prompt Config Tab -->
        <div v-else class="prompt-config">

          <div class="prompt-controls">
            <div class="controls-left">
              <button class="btn btn-primary" @click="importPromptConfig">
                <i class="icon">📥</i> 导入提示词
              </button>
              <button class="btn btn-primary" @click="exportPromptConfig">
                <i class="icon">📤</i> 导出提示词
              </button>
              <button class="btn btn-accent" @click="savePromptConfig">
                <i class="icon">💾</i> 保存配置
              </button>
              <button class="btn btn-primary" @click="testPrompt">
                <i class="icon">🔍</i> 测试提示词
              </button>
            </div>
          </div>

          <div class="prompt-selector">
            <div class="selector-item">
              <label>提示词类型:</label>
              <select
                v-model="selectedKind"
                class="kind-dropdown"
                @change="updateIdDropdown"
              >
                <option
                  v-for="item in kindNumberData"
                  :key="item.kind"
                  :value="item.kind"
                >
                  {{ item.kind }}
                </option>
              </select>
            </div>
            <div class="selector-item">
              <label>提示词编号:</label>
              <select
                v-model="selectedId"
                class="id-dropdown"
                @change="loadPromptContent"
              >
                <option
                  v-for="id in idOptions"
                  :key="id"
                  :value="id"
                >
                  {{ id }}
                </option>
              </select>
            </div>
          </div>

          <!-- Prompt Editor - Dual Text Areas -->
          <div class="prompt-editor">

            <!-- Dual editor container -->
            <div class="editor-container-dual">
              <!-- Prompt Variable Panel -->
              <div class="prompt-editor-panel">
                <label class="prompt-label">提示词变量:</label>
                 <textarea
                  v-model="promptVarContent"
                  class="prompt-textarea"
                  placeholder="请输入提示词变量内容（可选）..."
                 ></textarea>
              </div>

              <!-- Prompt Content Panel -->
              <div class="prompt-editor-panel">
                <label class="prompt-label">提示词:</label>
                 <textarea
                  v-model="promptContent"
                  class="prompt-textarea"
                  placeholder="请输入主要的提示词内容..."
                 ></textarea>
               </div>
            </div>

            <div class="editor-status">
              <div class="status-text">{{ statusMessage }}</div>
              <div class="shortcut-hints">提示: Ctrl+Z 撤销, Ctrl+Y 重做, Ctrl+A 全选</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Test Result Modal -->
    <div class="modal-overlay" v-if="showTestResultModal" @click="closeTestResultModal">
      <div class="modal-container result-modal" @click.stop>
        <div class="modal-header">
          <h2>提示词测试结果</h2>
          <button class="close-button" @click="closeTestResultModal">×</button>
        </div>
        <div class="modal-body">
          <div class="result-tabs">
            <div
              class="result-tab"
              :class="{ active: activeResultTab === 'prompt1' }"
              @click="activeResultTab = 'prompt1'"
            >
              提示词1 (Prompt Var)
            </div>
            <div
              class="result-tab"
              :class="{ active: activeResultTab === 'prompt2' }"
              @click="activeResultTab = 'prompt2'"
            >
              提示词2 (Prompt)
            </div>
          </div>
          <div class="result-content">
            <textarea
              v-if="activeResultTab === 'prompt1'"
              class="result-textarea"
              v-model="testResult.prompt1"
              readonly
            ></textarea>
            <textarea
              v-else
              class="result-textarea"
              v-model="testResult.prompt2"
              readonly
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="copyTestResult">
            复制当前内容
          </button>
          <button class="btn btn-default" @click="closeTestResultModal">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- Import/Export File Dialog -->
    <input
      type="file"
      ref="fileInput"
      style="display: none;"
      accept=".json"
      @change="handleFileUpload"
    />
  </div>
</template>

<script>
import { processPrompt } from './services/PromptService'; // 确保路径正确

export default {
  name: 'LLMConfig_modelaccess',
  data() {
    return {
      tabs: ['默认', '大纲', '正文', '选项', '人物', '背景', '音乐', '对话', '总结', '本地导入', '其他', '提示词'],
      activeTab: '默认',
      configNames: [],
      modelNames: [], // This might be redundant, modelsByConfig is used now
      modelsByConfig: {},
      settings: [],

      // Prompt Config
      kindNumberData: [
        { kind: "大纲", number: 6 },
        { kind: "选项", number: 6 },
        { kind: "故事开头", number: 6 },
        { kind: "故事继续", number: 6 },
        { kind: "故事结尾", number: 6 },
        { kind: "全部人物绘画", number: 2 },
        { kind: "单个人物绘画", number: 2 },
        { kind: "故事地点绘画", number: 2 },
        { kind: "背景音乐生成", number: 2 },
        { kind: "开头音乐生成", number: 6 },
        { kind: "结尾音乐生成", number: 6 },
        { kind: "故事总结", number: 6 },
        { kind: "本地导入", number: 6 },
        { kind: "重写提示词", number: 1 },
        { kind: "首页背景生成", number: 2 },
        { kind: "翻译", number: 6 }
      ],
      selectedKind: '',
      selectedId: '',
      idOptions: [],
      promptContent: '', // Main prompt content
      promptVarContent: '', // Prompt variable content (new)
      currentKind: '',
      currentId: '',
      statusMessage: '准备就绪',

      // Test Result
      showTestResultModal: false,
      activeResultTab: 'prompt1',
      testResult: {
        prompt1: '', // Corresponds to prompt_var result
        prompt2: ''  // Corresponds to prompt result
      },

      // File Upload Type
      fileUploadType: null
    };
  },
  mounted() {
    this.loadConfigNames();
    this.loadModelNames();
    this.loadSettings();

    // Set default prompt kind if available and active tab is '提示词'
    // Delay loading prompt until '提示词' tab is active
    // Or initialize if '提示词' is the default activeTab (though it's not in the list)
    // Let's just load when the tab becomes active, or if manually set to '提示词' initially.
    // The current code sets default tab to '默认', so prompt load happens when '提示词' is clicked.
  },
   watch: {
      activeTab: {
        immediate: true, // Run on component mount if activeTab is initially '提示词'
        handler(newTab) {
          if (newTab !== '提示词') {
            this.loadSettings();
          } else {
            // When switching TO '提示词' tab
             if (this.kindNumberData.length > 0) {
                // Set initial kind and id if not already set
                if (!this.selectedKind) {
                     this.selectedKind = this.kindNumberData[0].kind;
                }
                 // Update IDs based on selectedKind, which also triggers loadPromptContent
                this.updateIdDropdown();
              } else {
                 // No kind data, clear everything
                 this.selectedKind = '';
                 this.selectedId = '';
                 this.idOptions = [];
                 this.promptContent = '';
                 this.promptVarContent = '';
                 this.currentKind = '';
                 this.currentId = '';
                 this.statusMessage = '无提示词类型数据';
              }
          }
        }
      },
      // Watch for changes in configuration selection in Model Settings tab
      'settings': {
        deep: true,
        handler(newSettings, oldSettings) {
          // Only run if activeTab is NOT '提示词'
          if (this.activeTab === '提示词') return;

          // Check if any config selection has changed
          if (newSettings && oldSettings) {
            for (let i = 0; i < newSettings.length; i++) {
              if (i >= oldSettings.length || newSettings[i].config !== oldSettings[i].config) {
                // Config changed for this setting, update its model options
                const configModels = this.modelsByConfig[newSettings[i].config] || [];
                if (configModels.length > 0 && !configModels.includes(newSettings[i].model)) {
                  newSettings[i].model = configModels[0];
                }
              }
            }
          }
        }
      }
    },
  methods: {
    // Settings Management (No changes needed for dual prompt)
    loadConfigNames() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (config.模型 && config.模型.configs) {
          this.configNames = Object.keys(config.模型.configs).sort();
        }
      } catch (error) {
        console.error('Failed to load config names:', error);
      }
    },

    loadModelNames() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        this.modelsByConfig = {};

        if (config.模型 && config.模型.configs) {
          for (const configName in config.模型.configs) {
            const models = config.模型.configs[configName].models || [];
            this.modelsByConfig[configName] = models.map(model => model.name);
          }
        }
         // Initialize with all models - This part might be less necessary
         // as modelsByConfig now drives the dropdowns
        // You might still want a flat list if needed elsewhere
        this.modelNames = Object.values(this.modelsByConfig).flat().filter((v, i, a) => a.indexOf(v) === i);

      } catch (error) {
        console.error('Failed to load model names:', error);
      }
    },

    // updateModelDropdowns() is watched by the settings changes

    loadSettings() {
       if (this.activeTab === '提示词') return; // Don't load settings for prompt tab

      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');

        if (config.模型 && config.模型[`${this.activeTab}_setting`]) {
          this.settings = config.模型[`${this.activeTab}_setting`].map(setting => ({
            config: setting.config || '',
            model: setting.model || '',
            weight: setting.weigh?.toString() || '1',
            priority: setting.priority?.toString() || '0'
          }));
        } else {
          this.settings = [];
        }
         // Update model options for the loaded settings
         this.settings.forEach(setting => {
            const configModels = this.modelsByConfig[setting.config] || [];
            if (configModels.length > 0 && !configModels.includes(setting.model)) {
                setting.model = configModels[0];
            } else if (configModels.length === 0 && setting.model) {
                 // Config has no models, clear selected model
                 setting.model = '';
            } else if (configModels.length > 0 && !setting.model) {
                 // Config has models but none selected, set to first
                 setting.model = configModels[0];
            }
         });

      } catch (error) {
        console.error(`Failed to load settings for ${this.activeTab}:`, error);
      }
    },

    addSetting() {
      this.settings.push({
        config: this.configNames.length > 0 ? this.configNames[0] : '',
        // Set model based on the selected config, or first available model if configNames is empty
        model: this.configNames.length > 0 && this.modelsByConfig[this.configNames[0]]?.length > 0
                ? this.modelsByConfig[this.configNames[0]][0]
                : '',
        weight: '1',
        priority: '0'
      });

      // Scroll to the bottom of the settings container
      this.$nextTick(() => {
        if (this.$refs.settingsContainer) {
          this.$refs.settingsContainer.scrollTop = this.$refs.settingsContainer.scrollHeight;
        }
      });
    },

    deleteSetting(index) {
      this.settings.splice(index, 1);
    },

    saveSettings() {
      if (this.activeTab === '提示词') return; // Don't save settings for prompt tab
      try {
        // Validate settings
        for (let i = 0; i < this.settings.length; i++) {
          const setting = this.settings[i];

          if (!setting.config) {
            this.showMessage('error', `配置项不能为空 (行: ${i + 1})`);
            return;
          }

          // Check if selected model exists in the selected config's models
           const modelsForConfig = this.modelsByConfig[setting.config] || [];
           if (!setting.model || !modelsForConfig.includes(setting.model)) {
               this.showMessage('error', `模型项无效或为空 (行: ${i + 1})`);
               return;
           }


          if (!setting.weight || !this.isPositiveInt(setting.weight)) {
            this.showMessage('error', `权重必须是正整数 (行: ${i + 1})`);
            return;
          }

          if (!setting.priority || !this.isNatureInt(setting.priority)) {
            this.showMessage('error', `优先级必须是非负整数 (行: ${i + 1})`);
            return;
          }
        }

        // Format settings for storage
        const formattedSettings = this.settings.map(setting => ({
          config: setting.config,
          model: setting.model,
          weigh: parseInt(setting.weight),
          priority: parseInt(setting.priority)
        }));

        // Save to localStorage
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.模型) config.模型 = {};

        config.模型[`${this.activeTab}_setting`] = formattedSettings;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));

        this.showMessage('success', `${this.activeTab} 设置已保存！`);
      } catch (error) {
        console.error('Failed to save settings:', error);
        this.showMessage('error', `保存 ${this.activeTab} 设置时出错: ${error.message}`);
      }
    },

    validatePositiveInt(event, setting, field) {
      const value = event.target.value;
      // Allow empty string temporarily while typing, or valid positive int
      if (value === '' || /^[1-9]\d*$/.test(value)) {
        setting[field] = value;
        event.target.classList.remove('invalid-input'); // Remove invalid class if input becomes valid
      } else {
        // Visual feedback for invalid input
        event.target.classList.add('invalid-input');
        // Optional: Revert to previous valid value or clear invalid input after a delay
         // This simple version just adds the class. Saving will validate formally.
      }
    },

    validateNatureInt(event, setting, field) {
      const value = event.target.value;
       // Allow empty string temporarily while typing, or valid non-negative int (nature number)
      if (value === '' || /^(0|[1-9]\d*)$/.test(value)) {
        setting[field] = value;
         event.target.classList.remove('invalid-input'); // Remove invalid class if input becomes valid
      } else {
        // Visual feedback for invalid input
        event.target.classList.add('invalid-input');
        // Optional: Revert to previous valid value or clear invalid input after a delay
         // This simple version just adds the class. Saving will validate formally.
      }
    },

    isPositiveInt(value) {
      return /^[1-9]\d*$/.test(value);
    },

    isNatureInt(value) {
      return /^(0|[1-9]\d*)$/.test(value);
    },

    // Prompt Management
    updateIdDropdown() {
      this.saveCurrentPrompt(); // Save before changing kind/id

      const kind = this.selectedKind;
      if (!kind) {
        this.idOptions = [];
        this.selectedId = '';
        this.promptContent = '';
        this.promptVarContent = ''; // Clear prompt_var
        this.currentKind = '';
        this.currentId = '';
        this.statusMessage = '请选择提示词类型';
        return;
      }

      const kindData = this.kindNumberData.find(item => item.kind === kind);
      if (kindData) {
        const numPrompts = kindData.number;
        this.idOptions = Array.from({ length: numPrompts }, (_, i) => (i + 1).toString());
        // If current selectedId is not valid for the new kind, set to the first ID
        if (!this.idOptions.includes(this.selectedId)) {
             this.selectedId = this.idOptions.length > 0 ? this.idOptions[0] : '';
        }
        this.loadPromptContent(); // Load content for the new kind/id
      } else {
          this.idOptions = [];
          this.selectedId = '';
          this.promptContent = '';
          this.promptVarContent = '';
          this.currentKind = kind; // Keep current kind even if no data found
          this.currentId = '';
          this.statusMessage = `未找到 "${kind}" 类型的提示词配置`;
      }
      // Note: loadPromptContent updates currentKind and currentId
    },

    loadPromptContent() {
      this.saveCurrentPrompt(); // Save before loading new content

      const kind = this.selectedKind;
      const id = this.selectedId;

      if (!kind || !id) {
        this.promptContent = '';
        this.promptVarContent = ''; // Clear prompt_var
        this.currentKind = '';
        this.currentId = '';
        this.statusMessage = '请选择提示词类型和编号';
        return;
      }

      const promptConfig = this.loadPromptSettings();
      let found = false;

      this.promptContent = ''; // Default empty
      this.promptVarContent = ''; // Default empty

      for (const kindConfig of promptConfig) {
        if (kindConfig.kind === kind) {
          for (const content of kindConfig.content) {
            if (content.id === id) {
              this.promptContent = content.prompt || '';
              this.promptVarContent = content.prompt_var || ''; // Load prompt_var
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }

      // If not found, content stays empty, which is correct

      this.currentKind = kind;
      this.currentId = id;
      this.statusMessage = `已加载: ${kind} - ${id}`;
    },

    saveCurrentPrompt() {
      const kind = this.currentKind;
      const id = this.currentId;
      const content = this.promptContent; // Don't trim here, allow leading/trailing whitespace
      const varContent = this.promptVarContent; // Don't trim here

      if (!kind || !id) {
        return false; // Nothing to save if kind or id is not set
      }

      const promptConfig = this.loadPromptSettings();

      // Find the kind configuration or create a new one
      let kindConfig = promptConfig.find(config => config.kind === kind);
      if (!kindConfig) {
        kindConfig = { kind, content: [] };
        promptConfig.push(kindConfig);
      }

      // Find the prompt with the specified ID or create a new one
      let promptItem = kindConfig.content.find(item => item.id === id);
      if (!promptItem) {
        // Ensure the object structure includes both fields even if new
        promptItem = { id, prompt: content, prompt_var: varContent };
        kindConfig.content.push(promptItem);
      } else {
        // Update existing item
        promptItem.prompt = content;
        promptItem.prompt_var = varContent;
      }

      // Save to localStorage
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.提示词) config.提示词 = [];

        // Replace or add the kind configuration
        const kindIndex = config.提示词.findIndex(item => item.kind === kind);
        if (kindIndex !== -1) {
          config.提示词[kindIndex] = kindConfig; // Replace existing
        } else {
          config.提示词.push(kindConfig); // Add new
        }

        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        return true; // Indicate success
      } catch (error) {
        console.error('Failed to save prompt:', error);
        this.showMessage('error', `保存提示词时出错: ${error.message}`);
        return false; // Indicate failure
      }
    },

    savePromptConfig() {
      if (this.saveCurrentPrompt()) {
        this.showMessage('success', '提示词配置已保存！');
        this.statusMessage = '配置已保存';
      } else {
         // saveCurrentPrompt already shows error message on failure,
         // but we can add a generic one if it returned false for no kind/id
         if (!this.currentKind || !this.currentId) {
              this.showMessage('error', '请先选择要保存的提示词类型和编号');
              this.statusMessage = '保存失败: 未选择提示词';
         }
      }
    },

    loadPromptSettings() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        // Return the array structure, ensuring it's an array
        return Array.isArray(config.提示词) ? config.提示词 : [];
      } catch (error) {
        console.error('Failed to load prompt settings:', error);
        this.showMessage('error', '加载提示词配置失败');
        return [];
      }
    },

    // Prompt Import/Export
    importPromptConfig() {
      this.fileUploadType = 'prompt';
      this.$refs.fileInput.click();
    },

    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);

          if (this.fileUploadType === 'prompt') {
            this.processPromptImport(data);
          }
        } catch (error) {
          console.error('Failed to process file:', error);
          this.showMessage('error', `文件处理失败: ${error.message}`);
        }

        // Reset file input
        event.target.value = ''; // Clear file input value to allow importing the same file again
      };

      reader.readAsText(file);
    },

    processPromptImport(data) {
      try {
        // Validate imported data structure (basic check)
        if (!Array.isArray(data)) {
          throw new Error('无效的JSON格式：根元素应为列表 []');
        }

        for (const item of data) {
          if (!item || typeof item !== 'object' || !item.kind || !Array.isArray(item.content)) {
             throw new Error('无效的JSON格式：列表中的每个项目必须是包含kind和content字段的对象');
          }
          for(const contentItem of item.content) {
              if (!contentItem || typeof contentItem !== 'object' || !contentItem.id || contentItem.prompt === undefined) { // Check for id and prompt field presence
                   throw new Error(`无效的JSON格式："${item.kind}" 类型下的内容项目格式错误`);
              }
              // Ensure prompt_var exists even if null/undefined in import
              if (contentItem.prompt_var === undefined) {
                  contentItem.prompt_var = '';
              }
          }
        }

        // Save to localStorage
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        config.提示词 = data; // Replace existing prompts with imported data
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));

        // Reload prompt content for the currently selected kind/id (if any)
        // Or update the dropdowns first, then load. updateIdDropdown does both.
        this.updateIdDropdown();

        this.showMessage('success', '提示词已成功导入');
        this.statusMessage = '导入成功';
      } catch (error) {
        console.error('Prompt import failed:', error);
        this.showMessage('error', `导入失败: ${error.message}`);
        this.statusMessage = '导入失败';
      }
    },

    exportPromptConfig() {
      // Save current prompt first to ensure latest edits are included
      this.saveCurrentPrompt();

      // Get prompt config from storage (including the changes just saved)
      const promptConfig = this.loadPromptSettings();

      // Create a downloadable file
      const dataStr = JSON.stringify(promptConfig, null, 2); // Use 2 spaces for pretty printing
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      // Create a download link and trigger it
      const exportFileDefaultName = 'ai_galgame_prompts.json';
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      document.body.appendChild(linkElement); // Append to body is sometimes needed for Firefox
      linkElement.click();

      document.body.removeChild(linkElement); // Clean up the link element

      this.showMessage('success', '提示词已导出');
      this.statusMessage = '导出成功';
    },

    // Prompt Testing
    async testPrompt() {
      this.saveCurrentPrompt(); // Save current prompt before testing

      const kind = this.selectedKind;
      const id = this.selectedId;

      if (!kind || !id) {
        this.showMessage('error', '请选择提示词类型和编号进行测试');
        this.statusMessage = '测试失败: 未选择提示词';
        return;
      }

      this.statusMessage = '正在测试提示词...';

      try {
        // Call the processPrompt function imported from services
        // Assuming processPrompt uses the kind and id to fetch the stored
        // prompt and prompt_var from localStorage and processes them.
        // It should return [processed_prompt_var, processed_prompt].
        const [prompt1, prompt2] = await processPrompt(kind, id); // Pass kind and id to processPrompt

        if (prompt1 === 'error' && prompt2 === 'error') {
           // Handle specific error reporting if processPrompt returns detailed errors
          this.showMessage('error', '提示词处理失败，请检查配置和日志');
          this.statusMessage = '测试失败';
          return;
        } else if (prompt1 === null && prompt2 === null) {
             this.showMessage('warning', '未找到对应的提示词模板，测试结果为空。请先保存。');
             this.testResult.prompt1 = '未找到对应的提示词变量模板';
             this.testResult.prompt2 = '未找到对应的提示词模板';
             this.statusMessage = '测试完成: 模板未找到';
             this.showTestResultModal = true;
             this.activeResultTab = 'prompt1';
             return;
        }


        // Display results in modal
        this.testResult.prompt1 = prompt1 || '无提示词变量输出'; // Display default text if null/empty
        this.testResult.prompt2 = prompt2 || '无提示词输出'; // Display default text if null/empty
        this.showTestResultModal = true;
        this.activeResultTab = 'prompt1'; // Default to showing prompt1 (prompt_var)

        this.statusMessage = '测试完成';
      } catch (error) {
        console.error('Failed to test prompt:', error);
        this.showMessage('error', `测试失败: ${error.message}`);
        this.statusMessage = '测试失败';
      }
    },

    closeTestResultModal() {
      this.showTestResultModal = false;
    },

    copyTestResult() {
      const textToCopy = this.activeResultTab === 'prompt1'
        ? this.testResult.prompt1
        : this.testResult.prompt2;

      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          this.showMessage('success', '内容已复制到剪贴板');
        })
        .catch(err => {
          console.error('Failed to copy text:', err);
          // Fallback for older browsers or insecure contexts
          try {
              const textarea = document.createElement('textarea');
              textarea.value = textToCopy;
              textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page in MS Edge.
              document.body.appendChild(textarea);
              textarea.focus();
              textarea.select();

              document.execCommand('copy');

              document.body.removeChild(textarea);
              this.showMessage('success', '内容已复制到剪贴板 (兼容模式)');
          } catch (e) {
               console.error('Failed to copy text via fallback:', e);
               this.showMessage('error', '复制失败，请手动复制。');
          }
        });
    },

    // Utility Functions
    showMessage(type, content) {
      // Assuming the parent component handles 'show-message' events
      this.$emit('show-message', type, content);
    }
  }
};
</script>

<style scoped>
/* Global CSS variables for dark mode compatibility */
/* These variables are good practice, ensure they are defined globally in your app */
:root {
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --background-color: #ffffff;
  --panel-bg: #f9f9f9;
  --text-color: #333333;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
  --input-bg: #ffffff;
  --input-border: #cccccc;
  --btn-default-bg: #f0f0f0;
  --btn-default-color: #333333;
  --btn-default-border: #cccccc;
  --btn-default-hover: #e0e0e0;
  --btn-accent-bg: #4f46e5;
  --btn-accent-color: #ffffff;
  --btn-accent-hover: #4338ca;
  --btn-danger-bg: #ef4444;
  --btn-danger-color: #ffffff;
  --btn-danger-hover: #dc2626;
  --modal-bg: #ffffff;
  --modal-overlay: rgba(0, 0, 0, 0.5);
  --success-color: #10b981;
  --error-color: #ef4444;
  --shadow-color: rgba(0, 0, 0, 0.1);
  --tab-active-border: #4f46e5;
  --tab-active-color: #4f46e5;
  --hover-bg: #f5f5f5;
  --odd-row-bg: #f9f9f9;
  --even-row-bg: #ffffff;
  --tooltip-bg: #333333;
  --tooltip-color: #ffffff;
  --header-bg: #f5f5f5;
  --transition-speed: 0.2s;
  --border-radius: 6px;
   --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Dark theme variables */
body.dark-theme {
  --background-color: #1e1e2e;
  --panel-bg: #2d2d3a;
  --text-color: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #444444;
  --input-bg: #38384a;
  --input-border: #555555;
  --btn-default-bg: #38384a;
  --btn-default-color: #e0e0e0;
  --btn-default-border: #555555;
  --btn-default-hover: #454555;
  --btn-accent-bg: #6366f1;
  --btn-accent-color: #ffffff;
  --btn-accent-hover: #5253cc;
  --btn-danger-bg: #f87171;
  --btn-danger-color: #ffffff;
  --btn-danger-hover: #ef4444;
  --modal-bg: #2d2d3a;
  --modal-overlay: rgba(0, 0, 0, 0.7);
  --shadow-color: rgba(0, 0, 0, 0.3);
  --tab-active-border: #6366f1;
  --tab-active-color: #6366f1;
  --hover-bg: #38384a;
  --odd-row-bg: #2a2a36;
  --even-row-bg: #323240;
  --tooltip-bg: #1e1e2e;
  --tooltip-color: #e0e0e0;
  --header-bg: #252532;
   --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
}


/* Model Access Container */
/* Ensures the container fills its parent */
.model-access-container {
  display: flex;
  flex-direction: column;
  height: 100%; /* Take full height of parent */
  width: 100%; /* Take full width of parent */
  font-family: 'Segoe UI', Arial, sans-serif;
  color: var(--text-color);
  background-color: var(--background-color);
  transition: color var(--transition-speed), background-color var(--transition-speed);
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--panel-bg);
  transition: all var(--transition-speed);
  flex-shrink: 0; /* Prevent header from shrinking */
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  font-size: 1.75rem;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: 50%;
  transition: all var(--transition-speed);
}

.close-button:hover {
  color: var(--text-color);
  background-color: var(--hover-bg);
}

/* Modal Content */
/* Allows content area to fill space and handle scrolling */
.modal-content {
  display: flex;
  flex-direction: column;
  flex: 1; /* Allow content to grow and fill vertical space */
  overflow: hidden; /* Hide overflow within the content area */
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  overflow-x: auto;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  transition: background-color var(--transition-speed), border-color var(--transition-speed);
  scrollbar-width: thin;
  scrollbar-color: var(--text-secondary) var(--panel-bg);
  flex-shrink: 0; /* Prevent tabs from shrinking */
}

.tab-navigation::-webkit-scrollbar {
  height: 6px;
}

.tab-navigation::-webkit-scrollbar-track {
  background: var(--panel-bg);
}

.tab-navigation::-webkit-scrollbar-thumb {
  background-color: var(--text-secondary);
  border-radius: 3px;
}

.tab-item {
  padding: 0.875rem 1.5rem;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
  transition: all var(--transition-speed);
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
}

.tab-item:hover {
  background-color: var(--hover-bg);
  color: var(--text-color);
}

.tab-item.active {
  color: var(--tab-active-color);
  border-bottom: 3px solid var(--tab-active-border);
  background-color: var(--background-color); /* Active tab background matches content */
}

/* Tab Content */
/* Allows tab content to fill space and handle scrolling */
.tab-content {
  flex: 1; /* Allow tab content to grow and fill vertical space */
  overflow-y: auto; /* Enable vertical scrolling if content overflows */
  padding: 1.75rem;
  background-color: var(--background-color);
  transition: background-color var(--transition-speed);
  scrollbar-width: thin;
  scrollbar-color: var(--text-secondary) var(--background-color);
  display: flex; /* Use flexbox for inner layout (e.g., settings or prompt config) */
  flex-direction: column; /* Arrange children vertically */
  min-height: 0; /* Important for flex items */
}

.tab-content::-webkit-scrollbar {
  width: 8px;
}

.tab-content::-webkit-scrollbar-track {
  background: var(--background-color);
}

.tab-content::-webkit-scrollbar-thumb {
  background-color: var(--text-secondary);
  border-radius: 4px;
}


/* Model Settings Styles (kept for completeness) */
.model-settings {
    display: flex;
    flex-direction: column;
    flex: 1; /* Allows settings area to fill space in tab-content */
    min-height: 0; /* Important for flex item */
}

/* Settings Controls */
.settings-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.75rem;
  gap: 1rem;
  flex-wrap: wrap; /* Allow controls to wrap on smaller screens */
}

.controls-left {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* Tooltip Container */
.tooltip-container {
  position: relative;
  display: inline-block; /* Make container fit its content */
}

.tooltip-text {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  padding: 1rem;
  background-color: var(--tooltip-bg);
  color: var(--tooltip-color);
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  line-height: 1.5;
  z-index: 10;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0.3s;
  box-shadow: 0 4px 12px var(--shadow-color);
  pointer-events: none;
  transform: translateY(5px); /* Initial slight offset */
}

.tooltip-container:hover .tooltip-text {
  opacity: 1;
  visibility: visible;
  transform: translateY(0); /* Slide up slightly on hover */
}

/* Settings Header */
.settings-header {
  display: flex;
  align-items: center;
  padding: 0.875rem 0.75rem;
  font-weight: 600;
  border-bottom: 2px solid var(--border-color);
  background-color: var(--panel-bg);
  margin-bottom: 0.75rem;
  border-radius: var(--border-radius) var(--border-radius) 0 0;
  transition: background-color var(--transition-speed), border-color var(--transition-speed);
  color: var(--text-color); /* Ensure text color respects theme */
}

.header-config,
.header-model,
.header-weight,
.header-priority,
.header-action {
  padding: 0 0.5rem;
  /* Removed color here, let parent .settings-header define it */
}

.header-config {
  flex: 3;
}

.header-model {
  flex: 3;
}

.header-weight {
  flex: 1;
  text-align: center;
}

.header-priority {
  flex: 1;
  text-align: center;
}

.header-action {
  flex: 1.5;
  text-align: center;
}

/* Settings Container (where rows are) */
.settings-container {
  max-height: 400px; /* Keep a max-height, but allow flex to determine overall size */
  overflow-y: auto; /* Ensure scrolling */
  border: 1px solid var(--border-color);
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  transition: border-color var(--transition-speed);
  scrollbar-width: thin;
  scrollbar-color: var(--text-secondary) var(--panel-bg);
  flex: 1; /* Allow the settings container to grow vertically */
  min-height: 0; /* Important for flex item */
}

.settings-container::-webkit-scrollbar {
  width: 8px;
}

.settings-container::-webkit-scrollbar-track {
  background: var(--panel-bg);
  border-radius: 0 0 var(--border-radius) 0;
}

.settings-container::-webkit-scrollbar-thumb {
  background-color: var(--text-secondary);
  border-radius: 4px;
}

/* Setting Row */
.setting-row {
  display: flex;
  align-items: center;
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
  transition: background-color var(--transition-speed), border-color var(--transition-speed);
}

.setting-row:last-child {
  border-bottom: none;
}

.odd-row {
  background-color: var(--odd-row-bg);
}

.even-row {
  background-color: var(--even-row-bg);
}

.setting-config,
.setting-model,
.setting-weight,
.setting-priority,
.setting-action {
  padding: 0 0.5rem;
}

.setting-config {
  flex: 3;
}

.setting-model {
  flex: 3;
}

.setting-weight {
  flex: 1;
}

.setting-priority {
  flex: 1;
}

.setting-action {
  flex: 1.5;
  text-align: center;
}

/* Dropdowns and Inputs */
.config-dropdown,
.model-dropdown,
.kind-dropdown,
.id-dropdown,
.page-dropdown {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 0.95rem;
  transition: all var(--transition-speed);
  appearance: none;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6"><path fill="%23666666" d="M0 0l6 6 6-6z"/></svg>'); /* Custom arrow */
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem; /* Make space for arrow */
  cursor: pointer; /* Indicate clickable */
}

.config-dropdown:focus,
.model-dropdown:focus,
.kind-dropdown:focus,
.id-dropdown:focus,
.page-dropdown:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); /* Use primary color with transparency */
}

.weight-input,
.priority-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  text-align: center;
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 0.95rem;
  transition: all var(--transition-speed);
}

.weight-input:focus,
.priority-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.invalid-input {
  border-color: var(--error-color);
  background-color: rgba(239, 68, 68, 0.1);
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

/* Prompt Config Styles */
.prompt-config {
    display: flex;
    flex-direction: column;
    flex: 1; /* Allows prompt config area to fill space in tab-content */
    min-height: 0; /* Important for flex item */
}

.prompt-header {
  margin-bottom: 1.75rem;
  flex-shrink: 0; /* Prevent header from shrinking */
}

.prompt-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  transition: color var(--transition-speed);
}

.prompt-controls {
  margin-bottom: 1.75rem;
   flex-shrink: 0; /* Prevent controls from shrinking */
}

.prompt-selector {
  display: flex;
  flex-wrap: wrap; /* Allow wrapping */
  gap: 2rem;
  margin-bottom: 1.75rem;
   flex-shrink: 0; /* Prevent selector from shrinking */
}

.selector-item {
  display: flex;
  align-items: center;
  /* Allow items to grow if needed, but shrink below content size */
  flex-grow: 1;
  flex-shrink: 1;
  min-width: 200px; /* Minimum width before wrapping */
}

.selector-item label {
  font-weight: 600;
  margin-right: 0.875rem;
  white-space: nowrap;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

/* Prompt Editor Container - This is the main area with textareas */
.prompt-editor {
  display: flex;
  flex-direction: column;
  flex: 1; /* Allows editor section to fill available vertical space */
  min-height: 0; /* Important for flex item */
}

.editor-hint {
  margin-bottom: 1.25rem;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.95rem;
  padding: 0.875rem;
  background-color: var(--panel-bg);
  border-radius: var(--border-radius);
  border-left: 4px solid var(--primary-color);
  transition: all var(--transition-speed);
   flex-shrink: 0; /* Prevent hint from shrinking */
}

/* NEW: Container for the two text areas side-by-side */
.editor-container-dual {
  display: flex; /* Use flexbox for side-by-side */
  gap: 1.5rem; /* Space between the two text areas */
  flex: 1; /* Allow the container to grow and fill remaining space */
  min-height: 0; /* Important for nested flex container */
}

/* NEW: Panel for each text area including its label */
.prompt-editor-panel {
  display: flex;
  flex-direction: column; /* Stack label and textarea */
  flex: 1; /* Make both panels take equal width */
  min-width: 0; /* Allow shrinking below content size if needed */
}

/* NEW: Label for each textarea */
.prompt-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  transition: color var(--transition-speed);
  flex-shrink: 0; /* Prevent label from shrinking */
}


/* Style for Textareas (applies to both) */
.prompt-textarea {
  width: 100%; /* Fill the panel width */
  flex: 1; /* Make textarea fill the panel height */
  min-height: 200px; /* Ensure a minimum height */
  padding: 1rem;
  border: 1px solid var(--input-border); /* Add border back to individual text areas */
  border-radius: var(--border-radius); /* Add border-radius back */
  resize: vertical; /* Allow vertical resizing */
  font-family: 'Consolas', monospace; /* Monospace for code-like editing */
  font-size: 0.95rem;
  line-height: 1.6;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all var(--transition-speed);
}

.prompt-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.prompt-textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.editor-status {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition: color var(--transition-speed);
  margin-top: 0.75rem; /* Add margin above status */
   flex-shrink: 0; /* Prevent status from shrinking */
}

.shortcut-hints {
    font-size: 0.85rem;
    opacity: 0.8;
}


/* Result Modal Styles (kept for completeness) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--modal-overlay);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(3px);
  transition: background-color var(--transition-speed);
}

.modal-container {
  background-color: var(--modal-bg);
  border-radius: var(--border-radius);
  width: 100%;
  max-width: 1000px; /* Adjusted max-width for better viewing of prompt results */
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Hide overflow for rounded corners */
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-speed);
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-modal {
  height: 80vh; /* Give result modal a fixed large height */
  max-height: 800px; /* Cap max height */
}

.modal-body {
  flex: 1; /* Allow body to grow */
  overflow: hidden; /* Contain scrolling within result-content */
  display: flex;
  flex-direction: column;
  padding: 1.75rem;
}

.result-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.25rem;
  transition: border-color var(--transition-speed);
   flex-shrink: 0; /* Prevent tabs from shrinking */
}

.result-tab {
  padding: 0.875rem 1.5rem;
  cursor: pointer;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  color: var(--text-secondary);
  transition: all var(--transition-speed);
}

.result-tab:hover {
  color: var(--text-color);
  background-color: var(--hover-bg);
}

.result-tab.active {
  color: var(--tab-active-color);
  border-bottom: 3px solid var(--tab-active-border);
}

.result-content {
  flex: 1; /* Allow result content to grow */
  overflow-y: auto; /* Enable scrolling for long results */
  min-height: 0; /* Important for flex item */
}

.result-textarea {
  width: 100%;
  height: 100%; /* Fill the parent result-content */
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  resize: none; /* Prevent resizing test result textareas */
  font-family: 'Consolas', monospace;
  font-size: 0.95rem;
  line-height: 1.6;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all var(--transition-speed);
  box-sizing: border-box; /* Include padding and border in element's total width and height */
}

.modal-footer {
  padding: 1.25rem 1.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.875rem;
  transition: border-color var(--transition-speed);
   flex-shrink: 0; /* Prevent footer from shrinking */
}

/* Button Styles */
.btn {
  padding: 0.625rem 1.25rem;
  border-radius: var(--border-radius);
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-speed);
  white-space: nowrap;
  min-width: 80px;
}

.btn .icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

/* Use more descriptive names or keep existing */
.btn-primary {
  background-color: var(--btn-default-bg);
  color: var(--btn-default-color);
  border: 1px solid var(--btn-default-border);
}

.btn-primary:hover {
  background-color: var(--btn-default-hover);
}

.btn-accent {
  background-color: var(--btn-accent-bg);
  color: var(--btn-accent-color);
  border: 1px solid var(--btn-accent-bg); /* Consistent border */
}

.btn-accent:hover {
  background-color: var(--btn-accent-hover);
  border-color: var(--btn-accent-hover);
}

.btn-danger {
  background-color: var(--btn-danger-bg);
  color: var(--btn-danger-color);
  border: 1px solid var(--btn-danger-bg); /* Consistent border */
}

.btn-danger:hover {
  background-color: var(--btn-danger-hover);
  border-color: var(--btn-danger-hover);
}

.btn-default { /* Used in modal footer */
  background-color: var(--btn-default-bg);
  color: var(--btn-default-color);
  border: 1px solid var(--btn-default-border);
}

.btn-default:hover {
  background-color: var(--btn-default-hover);
}


.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  min-width: 70px;
}

.btn-icon {
  padding: 0.375rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--btn-default-bg);
  color: var(--btn-default-color);
  border: 1px solid var(--btn-default-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background-color: var(--btn-default-hover);
}

.btn-help {
  font-size: 1.125rem;
}


/* Focus states for accessibility */
button:focus,
input:focus,
select:focus,
textarea:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3); /* Stronger focus indicator */
  border-color: var(--primary-color); /* Highlight border */
}

/* Responsive Adjustments */
@media (max-width: 992px) {
  .prompt-selector {
    /* Allow items to take more width or stack if necessary */
    gap: 1rem;
    flex-direction: column; /* Stack selector items */
  }

  .selector-item {
      width: 100%; /* Make stacked items full width */
      min-width: auto;
  }

  .settings-header {
    font-size: 0.9rem;
  }

  /* Stack dual editor on medium screens */
  .editor-container-dual {
      flex-direction: column;
      gap: 1rem;
  }

   .prompt-editor-panel {
       width: 100%;
   }
   .prompt-textarea {
       min-height: 150px; /* Reduce min-height when stacked */
   }

   .modal-container {
       max-width: 800px; /* Slightly smaller modal */
   }
}

@media (max-width: 768px) {
  .settings-container {
    max-height: 300px; /* Further reduce settings height */
  }

  /* Stack model settings rows on smaller screens */
  .setting-row {
    flex-wrap: wrap;
    padding: 1rem 0.5rem;
  }

  .setting-config,
  .setting-model {
    flex: 1 0 100%; /* Take full width and shrink */
    margin-bottom: 0.75rem;
  }

  .setting-weight,
  .setting-priority {
    flex: 1; /* Share remaining width */
    min-width: 60px; /* Ensure a minimum width */
  }

  .setting-action {
    flex: 2; /* Give action more space */
    margin-top: 0.75rem; /* Add space above action button */
  }

  /* Hide header row on small screens as rows stack */
  .settings-header {
    display: none;
  }

  .prompt-textarea {
    min-height: 120px; /* Further reduce min-height */
  }

  .controls-left {
    flex-direction: column;
    gap: 0.5rem;
     width: 100%; /* Ensure button group takes full width if needed */
  }
  .controls-left .btn {
      width: 100%; /* Make buttons full width when stacked */
  }

  .prompt-controls .controls-left { /* Specificity for prompt controls */
      width: auto; /* Reset width if not full width needed */
  }
  .prompt-controls .controls-left .btn {
       width: auto; /* Reset button width if not full width needed */
  }


  .tab-item {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }

  .modal-header h2 {
    font-size: 1.3rem;
  }

  .editor-status {
    flex-direction: column;
    gap: 0.5rem;
  }

  .modal-container {
    width: 95%; /* Make modal take almost full width */
  }
}

@media (max-width: 480px) {
     /* Adjust padding and margins for very small screens */
     .modal-header,
     .tab-content,
     .modal-footer {
         padding: 1rem 1.25rem;
     }

     .tab-navigation {
        padding: 0 1.25rem;
     }

     .tab-item {
         padding: 0.75rem 0.75rem;
     }

     .prompt-header,
     .prompt-controls,
     .prompt-selector {
         margin-bottom: 1.25rem;
     }
      .editor-hint {
         margin-bottom: 1rem;
         padding: 0.75rem;
     }
     .editor-container-dual {
        gap: 0.75rem;
     }
     .prompt-textarea {
        min-height: 100px;
        padding: 0.75rem;
     }
     .editor-status {
        font-size: 0.8rem;
     }
      .shortcut-hints {
         font-size: 0.75rem;
     }

     .btn {
        padding: 0.5rem 1rem;
        min-width: 60px;
     }
     .btn-sm {
         padding: 0.3rem 0.5rem;
         font-size: 0.8rem;
         min-width: 50px;
     }
}

/* Ensure main container flex properties work */
.model-access-container > * { /* Direct children of model-access-container */
    flex-shrink: 0; /* Prevent header, tab nav from shrinking */
}
.model-access-container .modal-content {
    flex-grow: 1; /* Allow modal-content to grow */
    flex-shrink: 1;
    min-height: 0; /* Allows flex item to shrink */
}

/* Ensure tab-content's children (settings or prompt-config) fill vertical space */
.tab-content > * {
    flex-grow: 1;
    flex-shrink: 1;
    min-height: 0;
}
</style>