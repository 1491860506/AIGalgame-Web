<template>
  <div class="model-access-container">
    <div class="modal-header">
      <h2>接入模型配置区</h2>
      <button class="close-button" @click="$emit('close')">&times;</button>
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
              <div class="controls-right">
                <div class="tooltip-container">
                  <button class="btn btn-icon btn-help">
                    <i class="icon">ℹ️</i>
                  </button>
                  <div class="tooltip-text">
                    程序会首先使用最高优先级下的模型：同一优先级下权重越高的模型被选中的概率越大，
                    当该优先级下的全部模型均超出尝试次数而失败时，程序会选择下一优先级。
                    当对应项未选择接入模型时，则使用默认配置，否则优先使用对应项下的配置
                  </div>
                </div>
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
                <!-- Replace the setting-model div in the template with this updated version -->
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
        
        <div v-else class="prompt-config">
          <div class="prompt-header">
            <h3>提示词模板配置</h3>
            <p class="subtitle">配置各种场景下使用的提示词模板</p>
          </div>
          
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
          
          <div class="prompt-editor">
            <div class="editor-hint">
              在此编辑提示词模板。您可以使用变量 {variable_name} 来表示需要在运行时替换的值。
              提示词应当简明扼要，明确指示AI需要执行的任务和期望的输出格式。
            </div>
            <div class="editor-container">
              <textarea 
                v-model="promptContent" 
                class="prompt-textarea"
                placeholder="请输入提示词内容..."
              ></textarea>
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
          <button class="close-button" @click="closeTestResultModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="result-tabs">
            <div 
              class="result-tab" 
              :class="{ active: activeResultTab === 'prompt1' }"
              @click="activeResultTab = 'prompt1'"
            >
              提示词1
            </div>
            <div 
              class="result-tab" 
              :class="{ active: activeResultTab === 'prompt2' }"
              @click="activeResultTab = 'prompt2'"
            >
              提示词2
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
import { processPrompt } from './services/PromptService';

export default {
  name: 'LLMConfig_modelaccess',
  data() {
    return {
      tabs: ['默认', '大纲', '正文', '选项', '人物', '背景', '音乐', '对话', '总结', '本地导入', '其他', '提示词'],
      activeTab: '默认',
      configNames: [],
      modelNames: [],
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
      promptContent: '',
      currentKind: '',
      currentId: '',
      statusMessage: '准备就绪',
      
      // Test Result
      showTestResultModal: false,
      activeResultTab: 'prompt1',
      testResult: {
        prompt1: '',
        prompt2: ''
      },
      
      // File Upload Type
      fileUploadType: null
    };
  },
  mounted() {
    this.loadConfigNames();
    this.loadModelNames();
    this.loadSettings();
    
    // Set default prompt kind if available
    if (this.kindNumberData.length > 0) {
      this.selectedKind = this.kindNumberData[0].kind;
      this.updateIdDropdown();
    }
  },
  methods: {
    // Settings Management
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
    
  // Replace the loadModelNames method with this updated version
    loadModelNames() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        // We'll store models by config name for easy lookup
        this.modelsByConfig = {}; 
        
        if (config.模型 && config.模型.configs) {
          // Collect models for each config separately
          for (const configName in config.模型.configs) {
            const models = config.模型.configs[configName].models || [];
            this.modelsByConfig[configName] = models.map(model => model.name);
          }
        }
        
        // Initialize with all models for backward compatibility
        this.updateModelDropdowns();
      } catch (error) {
        console.error('Failed to load model names:', error);
      }
    },

    // Add this new method to update model options based on selected config
    updateModelDropdowns() {
      // Update models for all settings
      this.settings.forEach(setting => {
        const configModels = this.modelsByConfig[setting.config] || [];
        
        // If the current model is not in the new config's models, reset it
        if (configModels.length > 0 && !configModels.includes(setting.model)) {
          setting.model = configModels[0]; // Set to first model in the config
        }
      });
    },

    // Add a watch for changes to settings.config
    watch: {
      activeTab() {
        this.loadSettings();
      },
      // Watch for changes in configuration selection
      'settings': {
        deep: true,
        handler(newSettings, oldSettings) {
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
    
    loadSettings() {
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
      } catch (error) {
        console.error(`Failed to load settings for ${this.activeTab}:`, error);
      }
    },
    
    addSetting() {
      this.settings.push({
        config: this.configNames.length > 0 ? this.configNames[0] : '',
        model: this.modelNames.length > 0 ? this.modelNames[0] : '',
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
      try {
        // Validate settings
        for (let i = 0; i < this.settings.length; i++) {
          const setting = this.settings[i];
          
          if (!setting.config) {
            this.showMessage('error', `配置项不能为空 (行: ${i + 1})`);
            return;
          }
          
          if (!setting.model) {
            this.showMessage('error', `模型项不能为空 (行: ${i + 1})`);
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
      if (value === '' || this.isPositiveInt(value)) {
        setting[field] = value;
      } else {
        // Visual feedback for invalid input
        event.target.classList.add('invalid-input');
        setTimeout(() => {
          event.target.classList.remove('invalid-input');
        }, 1000);
      }
    },
    
    validateNatureInt(event, setting, field) {
      const value = event.target.value;
      if (value === '' || this.isNatureInt(value)) {
        setting[field] = value;
      } else {
        // Visual feedback for invalid input
        event.target.classList.add('invalid-input');
        setTimeout(() => {
          event.target.classList.remove('invalid-input');
        }, 1000);
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
      this.saveCurrentPrompt(); // Save before changing
      
      const kind = this.selectedKind;
      if (!kind) {
        this.idOptions = [];
        this.selectedId = '';
        this.promptContent = '';
        return;
      }
      
      const kindData = this.kindNumberData.find(item => item.kind === kind);
      if (kindData) {
        const numPrompts = kindData.number;
        this.idOptions = Array.from({ length: numPrompts }, (_, i) => (i + 1).toString());
        this.selectedId = this.idOptions.length > 0 ? this.idOptions[0] : '';
        this.loadPromptContent();
      }
      
      this.currentKind = kind;
      this.currentId = this.selectedId;
      this.statusMessage = `已选择: ${kind} - ${this.selectedId}`;
    },
    
    loadPromptContent() {
      this.saveCurrentPrompt(); // Save before loading new content
      
      const kind = this.selectedKind;
      const id = this.selectedId;
      
      if (!kind || !id) {
        this.promptContent = '';
        this.currentKind = '';
        this.currentId = '';
        return;
      }
      
      const promptConfig = this.loadPromptSettings();
      let found = false;
      
      for (const kindConfig of promptConfig) {
        if (kindConfig.kind === kind) {
          for (const content of kindConfig.content) {
            if (content.id === id) {
              this.promptContent = content.prompt || '';
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
      
      if (!found) {
        this.promptContent = '';
      }
      
      this.currentKind = kind;
      this.currentId = id;
      this.statusMessage = `已加载: ${kind} - ${id}`;
    },
    
    saveCurrentPrompt() {
      const kind = this.currentKind;
      const id = this.currentId;
      const content = this.promptContent.trim();
      
      if (!kind || !id) {
        return false; // Nothing to save
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
        promptItem = { id, prompt: content };
        kindConfig.content.push(promptItem);
      } else {
        promptItem.prompt = content;
      }
      
      // Save to localStorage
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.提示词) config.提示词 = [];
        
        // Replace or add the kind configuration
        const kindIndex = config.提示词.findIndex(item => item.kind === kind);
        if (kindIndex !== -1) {
          config.提示词[kindIndex] = kindConfig;
        } else {
          config.提示词.push(kindConfig);
        }
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        return true;
      } catch (error) {
        console.error('Failed to save prompt:', error);
        return false;
      }
    },
    
    savePromptConfig() {
      if (this.saveCurrentPrompt()) {
        this.showMessage('success', '提示词配置已保存！');
        this.statusMessage = '配置已保存';
      }
    },
    
    loadPromptSettings() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        return config.提示词 || [];
      } catch (error) {
        console.error('Failed to load prompt settings:', error);
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
        this.$refs.fileInput.value = '';
      };
      
      reader.readAsText(file);
    },
    
    processPromptImport(data) {
      try {
        // Validate imported data
        if (!Array.isArray(data)) {
          throw new Error('无效的JSON格式：应为列表');
        }
        
        for (const item of data) {
          if (!item.kind || !Array.isArray(item.content)) {
            throw new Error('无效的JSON格式：每个项目必须包含kind和content字段');
          }
        }
        
        // Save to localStorage
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        config.提示词 = data;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        // Reload prompt content
        this.updateIdDropdown();
        this.showMessage('success', '提示词已成功导入');
        this.statusMessage = '导入成功';
      } catch (error) {
        this.showMessage('error', `导入失败: ${error.message}`);
        this.statusMessage = '导入失败';
      }
    },
    
    exportPromptConfig() {
      // Save current prompt first
      this.saveCurrentPrompt();
      
      // Get prompt config
      const promptConfig = this.loadPromptSettings();
      
      // Create a downloadable file
      const dataStr = JSON.stringify(promptConfig, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      // Create a download link and trigger it
      const exportFileDefaultName = 'ai_galgame_prompts.json';
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      this.showMessage('success', '提示词已导出');
      this.statusMessage = '导出成功';
    },
    
    // Prompt Testing
    async testPrompt() {
      this.saveCurrentPrompt(); // Save current prompt
      
      const kind = this.selectedKind;
      if (!kind) {
        this.showMessage('error', '请选择提示词类型');
        return;
      }
      
      this.statusMessage = '正在测试提示词...';
      
      try {
        // Call the processPrompt function imported from functions.vue
        const [prompt1, prompt2] = await processPrompt(kind);
        
        if (prompt1 === 'error' && prompt2 === 'error') {
          this.showMessage('error', '提示词处理失败');
          this.statusMessage = '测试失败';
          return;
        }
        
        // Display results in modal
        this.testResult.prompt1 = prompt1;
        this.testResult.prompt2 = prompt2;
        this.showTestResultModal = true;
        this.activeResultTab = 'prompt1';
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
          this.showMessage('error', '复制失败');
        });
    },
    
    // Utility Functions
    showMessage(type, content) {
      this.$emit('show-message', type, content);
    }
  },
  watch: {
    activeTab() {
      this.loadSettings();
    }
  }
};
</script>

<style scoped>
/* Global CSS variables for dark mode compatibility */
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
}

/* Model Access Container */
.model-access-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
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
.modal-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
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
  background-color: var(--background-color);
}

/* Tab Content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.75rem;
  background-color: var(--background-color);
  transition: background-color var(--transition-speed);
  scrollbar-width: thin;
  scrollbar-color: var(--text-secondary) var(--background-color);
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

/* Settings Controls */
.settings-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.75rem;
  gap: 1rem;
}

.controls-left {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* Tooltip Container */
.tooltip-container {
  position: relative;
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
}

.tooltip-container:hover .tooltip-text {
  opacity: 1;
  visibility: visible;
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
}

.header-config,
.header-model,
.header-weight,
.header-priority,
.header-action {
  padding: 0 0.5rem;
  color: var(--text-color);
  transition: color var(--transition-speed);
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

/* Settings Container */
.settings-container {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  transition: border-color var(--transition-speed);
  scrollbar-width: thin;
  scrollbar-color: var(--text-secondary) var(--panel-bg);
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
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6"><path fill="%23666666" d="M0 0l6 6 6-6z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;
}

.config-dropdown:focus,
.model-dropdown:focus,
.kind-dropdown:focus,
.id-dropdown:focus,
.page-dropdown:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
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
.prompt-header {
  margin-bottom: 1.75rem;
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
}

.prompt-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin-bottom: 1.75rem;
}

.selector-item {
  display: flex;
  align-items: center;
}

.selector-item label {
  font-weight: 600;
  margin-right: 0.875rem;
  white-space: nowrap;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

/* Prompt Editor */
.prompt-editor {
  display: flex;
  flex-direction: column;
  flex: 1;
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
}

.editor-container {
  flex: 1;
  margin-bottom: 1.25rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  overflow: hidden;
  transition: border-color var(--transition-speed);
}

.prompt-textarea {
  width: 100%;
  height: 300px;
  padding: 1rem;
  border: none;
  resize: vertical;
  font-family: 'Consolas', monospace;
  font-size: 0.95rem;
  line-height: 1.6;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all var(--transition-speed);
}

.prompt-textarea:focus {
  outline: none;
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
}

/* Result Modal Styles */
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
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 30px var(--shadow-color);
  transition: all var(--transition-speed);
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-modal {
  height: 80vh;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1.75rem;
}

.result-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1.25rem;
  transition: border-color var(--transition-speed);
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
  flex: 1;
  overflow: hidden;
}

.result-textarea {
  width: 100%;
  height: 100%;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  resize: none;
  font-family: 'Consolas', monospace;
  font-size: 0.95rem;
  line-height: 1.6;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all var(--transition-speed);
}

.modal-footer {
  padding: 1.25rem 1.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.875rem;
  transition: border-color var(--transition-speed);
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
  border: 1px solid var(--btn-accent-bg);
}

.btn-accent:hover {
  background-color: var(--btn-accent-hover);
  border-color: var(--btn-accent-hover);
}

.btn-danger {
  background-color: var(--btn-danger-bg);
  color: var(--btn-danger-color);
  border: 1px solid var(--btn-danger-bg);
}

.btn-danger:hover {
  background-color: var(--btn-danger-hover);
  border-color: var(--btn-danger-hover);
}

.btn-default {
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


.modal-content {
  background-color: var(--modal-bg);
  border-radius: 0.75rem;
  width: 100%;
  max-width: 1000px;
  max-height: 95vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  transition: background-color 0.3s;
}
/* Focus states for accessibility */
button:focus, 
input:focus, 
select:focus,
textarea:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
}

/* Responsive Adjustments */
@media (max-width: 992px) {
  .prompt-selector {
    flex-direction: column;
    gap: 1rem;
  }
  
  .selector-item {
    width: 100%;
  }
  
  .settings-header {
    font-size: 0.9rem;
  }
}

@media (max-width: 768px) {
  .settings-container {
    max-height: 400px;
  }
  
  .prompt-textarea {
    height: 250px;
  }
  
  .controls-left {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .btn {
    width: 100%;
  }
  
  .tab-item {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
  
  .modal-header h2 {
    font-size: 1.3rem;
  }
}

@media (max-width: 576px) {
  .setting-row {
    flex-wrap: wrap;
    padding: 1rem 0.5rem;
  }
  
  .setting-config, 
  .setting-model {
    flex: 1 0 100%;
    margin-bottom: 0.75rem;
  }
  
  .setting-weight, 
  .setting-priority {
    flex: 1;
  }
  
  .setting-action {
    flex: 2;
  }
  
  .header-config, 
  .header-model,
  .header-weight, 
  .header-priority,
  .header-action {
    display: none;
  }
  
  .editor-status {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .tab-navigation {
    flex-wrap: wrap;
  }
  
  .modal-container {
    width: 95%;
  }
}
</style>