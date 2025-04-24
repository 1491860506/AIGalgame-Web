<template>
  <div class="llm-config-container">
    <!-- Title Section -->
    <div class="title-section">
      <h1 class="page-title">大语言模型配置</h1>
      <div class="separator"></div>
    </div>

    <!-- Configuration Management Section -->
    <div class="config-panel">
      <h2 class="panel-title">配置管理</h2>
      <div class="config-selection-row">
        <div class="config-dropdown-container">
          <label>选择配置:</label>
          <select 
            v-model="selectedConfig" 
            class="config-dropdown"
            @change="onConfigSelect"
          >
            <option v-for="name in configNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>
        <div class="config-buttons">
          <button class="btn btn-default" @click="addLLMConfig">
            <i class="icon">➕</i> 新增
          </button>
          <button class="btn btn-default" @click="copyLLMConfig">
            <i class="icon">📋</i> 复制
          </button>
          <button class="btn btn-danger" @click="deleteLLMConfig">
            <i class="icon">🗑</i> 删除
          </button>
        </div>
      </div>
      <div class="integration-row">
        <button class="btn btn-accent" @click="openIntegrationWindow">
          <i class="icon">⚙️</i> 接入模型配置
        </button>
      </div>
    </div>

    <!-- Content Tabs -->
    <div class="content-tabs">
      <div class="tab-headers">
        <div 
          class="tab-header" 
          :class="{ active: activeTab === 'basic' }"
          @click="activeTab = 'basic'"
        >
          基本连接信息
        </div>
        <div 
          class="tab-header" 
          :class="{ active: activeTab === 'model' }"
          @click="activeTab = 'model'"
        >
          模型参数设置
        </div>
      </div>

      <!-- Basic Connection Tab -->
      <div class="tab-content" v-show="activeTab === 'basic'">
        <div class="form-group">
          <label>模型 BaseURL:</label>
          <input 
            type="text" 
            v-model="modelBaseUrl" 
            class="text-input"
            placeholder="例如: https://api.openai.com/v1"
          />
        </div>
        <div class="form-group">
          <label>API Key:</label>
          <div class="api-key-container">
            <input 
              :type="showApiKey ? 'text' : 'password'" 
              v-model="apiKey" 
              class="text-input"
              placeholder="输入您的API密钥"
            />
            <label class="show-key-label">
              <input type="checkbox" v-model="showApiKey" />
              显示
            </label>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-accent" @click="saveLLMConfig">
            <i class="icon">💾</i> 保存基本配置
          </button>
        </div>
      </div>

      <!-- Model Parameters Tab -->
      <div class="tab-content" v-show="activeTab === 'model'">
        <!-- Model Management Section -->
        <div class="model-section">
          <h3 class="section-title">模型管理</h3>
          <div class="model-selection-row">
            <label>选择模型:</label>
            <select 
              v-model="selectedModel" 
              class="model-dropdown"
              @change="onModelSelect"
            >
              <option v-for="name in modelNames" :key="name" :value="name">{{ name }}</option>
            </select>
          </div>
          <div class="model-buttons-row">
            <div class="model-buttons-left">
              <button class="btn btn-default" @click="addLLMModel">
                <i class="icon">➕</i> 新增模型
              </button>
              <button class="btn btn-danger" @click="deleteLLMModel">
                <i class="icon">🗑</i> 删除模型
              </button>
            </div>
            <div class="model-buttons-right">
              <button class="btn btn-default" @click="getModelsFromServer">
                <i class="icon">📥</i> 从服务器获取模型
              </button>
              <button class="btn btn-default" @click="testLLMModel">
                <i class="icon">✔</i> 测试模型
              </button>
            </div>
          </div>
        </div>

        <!-- Model Parameters Section -->
        <div class="params-section">
          <h3 class="section-title">模型参数</h3>
          <div class="params-grid">
            <div class="param-cell">
              <label>最大尝试次数:</label>
              <input 
                type="number" 
                v-model="modelRetry" 
                class="param-input"
                min="1"
              />
            </div>
            <div class="param-cell">
              <label>Temperature:</label>
              <input 
                type="number" 
                v-model="temperature" 
                class="param-input"
                min="0"
                max="2"
                step="0.1"
              />
            </div>
            <div class="param-cell">
              <label>Top P:</label>
              <input 
                type="number" 
                v-model="topP" 
                class="param-input"
                min="0"
                max="1"
                step="0.1"
              />
            </div>
            <div class="param-cell">
              <label>Freq Penalty:</label>
              <input 
                type="number" 
                v-model="frequencyPenalty" 
                class="param-input"
                min="-2"
                max="2"
                step="0.1"
              />
            </div>
            <div class="param-cell">
              <label>Pres Penalty:</label>
              <input 
                type="number" 
                v-model="presencePenalty" 
                class="param-input"
                min="-2"
                max="2"
                step="0.1"
              />
            </div>
            <div class="param-cell">
              <label>Max Tokens:</label>
              <input 
                type="number" 
                v-model="maxTokens" 
                class="param-input"
                min="1"
              />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-accent" @click="saveModelConfig">
              <i class="icon">💾</i> 保存模型参数
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Model Integration Dialog -->
    <div class="modal-overlay" v-if="showIntegrationModal" @click="closeIntegrationModal">
      <div class="modal-container" @click.stop>
        <LLMConfig_modelaccess 
          v-if="showIntegrationModal" 
          @close="closeIntegrationModal"
          @show-message="showMessageBubble"
        />
      </div>
    </div>

    <!-- Model Selection Dialog -->
    <div class="modal-overlay" v-if="showModelSelectionModal" @click="closeModelSelectionModal">
      <div class="modal-container model-selection-modal" @click.stop>
        <div class="modal-header">
          <h2>选择需要导入的模型</h2>
          <button class="close-button" @click="closeModelSelectionModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="filter-section">
            <label>筛选:</label>
            <div class="filter-container">
              <input 
                type="text" 
                v-model="modelFilter" 
                class="filter-input" 
                @keyup.enter="applyModelFilter"
                placeholder="输入关键词筛选模型"
              />
              <button class="btn btn-default" @click="applyModelFilter">筛选</button>
            </div>
          </div>

          <div class="pagination-section">
            <label>页面:</label>
            <select v-model="currentPage" class="page-dropdown">
              <option 
                v-for="(label, index) in pageLabels" 
                :key="index" 
                :value="index"
              >{{ label }}</option>
            </select>
            <div class="page-buttons">
              <button 
                class="btn btn-small" 
                @click="prevPage" 
                :disabled="currentPage === 0"
              >上一页</button>
              <button 
                class="btn btn-small" 
                @click="nextPage" 
                :disabled="currentPage >= totalPages - 1"
              >下一页</button>
            </div>
          </div>

          <div class="model-list">
            <div 
              v-for="(model, index) in paginatedModels" 
              :key="index" 
              class="model-item"
            >
              <label class="model-checkbox">
                <input 
                  type="checkbox" 
                  v-model="modelSelections[model]"
                />
                <span :title="model">{{ truncateText(model) }}</span>
              </label>
            </div>
          </div>

          <div class="selection-actions">
            <button class="btn btn-default" @click="selectAllModels">全选</button>
            <button class="btn btn-default" @click="deselectAllModels">取消全选</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="closeModelSelectionModal">取消</button>
          <button class="btn btn-accent" @click="confirmModelSelection">确定</button>
        </div>
      </div>
    </div>

    <!-- Input Dialog -->
    <div class="modal-overlay" v-if="showInputDialog" @click="closeInputDialog">
      <div class="input-dialog" @click.stop>
        <h3>{{ inputDialogTitle }}</h3>
        <input 
          type="text" 
          v-model="inputDialogValue" 
          class="text-input"
          @keyup.enter="confirmInputDialog"
        />
        <div class="dialog-buttons">
          <button class="btn btn-default" @click="closeInputDialog">取消</button>
          <button class="btn btn-accent" @click="confirmInputDialog">确定</button>
        </div>
      </div>
    </div>

    <!-- Message Bubble -->
    <div 
      class="message-bubble" 
      :class="{ 
        active: showMessage, 
        success: messageType === 'success', 
        error: messageType === 'error' 
      }"
    >
      {{ messageContent }}
    </div>
  </div>
</template>

<script>
import LLMConfig_modelaccess from './LLMConfig_modelaccess.vue';

export default {
  name: 'LLMConfig',
  components: {
    LLMConfig_modelaccess
  },
  data() {
    return {
      // UI State
      activeTab: 'basic',
      showApiKey: false,
      showIntegrationModal: false,
      showModelSelectionModal: false,
      showInputDialog: false,
      inputDialogTitle: '',
      inputDialogValue: '',
      inputDialogCallback: null,
      
      // Configuration Selection
      configNames: [],
      selectedConfig: '',
      
      // Basic Connection Info
      modelBaseUrl: '',
      apiKey: '',
      
      // Model Selection
      modelNames: [],
      selectedModel: '',
      currentModelName: '',
      models: [],
      
      // Model Parameters
      modelRetry: '3',
      temperature: '',
      topP: '',
      frequencyPenalty: '',
      presencePenalty: '',
      maxTokens: '',
      
      // Model Selection Dialog
      allModels: [],
      filteredModels: [],
      modelSelections: {},
      modelFilter: '',
      pageSize: 36,
      currentPage: 0,
      totalPages: 1,
      
      // Message Bubble
      showMessage: false,
      messageType: 'success',
      messageContent: '',
      messageTimeout: null
    };
  },
  computed: {
    paginatedModels() {
      const start = this.currentPage * this.pageSize;
      const end = start + this.pageSize;
      return this.filteredModels.slice(start, end);
    },
    pageLabels() {
      const labels = [];
      for (let i = 0; i < this.totalPages; i++) {
        const start = i * this.pageSize;
        const end = Math.min(start + this.pageSize, this.filteredModels.length);
        
        if (start < end) {
          const firstModel = this.filteredModels[start];
          const lastModel = this.filteredModels[end - 1];
          const firstLetter = firstModel[0].toUpperCase();
          const lastLetter = lastModel[0].toUpperCase();
          labels.push(`第 ${i + 1} 页 (${firstLetter}-${lastLetter}) [${end-start}项]`);
        } else {
          labels.push(`第 ${i + 1} 页 (空页)`);
        }
      }
      return labels;
    }
  },
  mounted() {
    this.loadConfig();
  },
  methods: {
    // Config Management
    loadConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (!config.模型 || !config.模型.configs) {
          config.模型 = {
            configs: {}
          };
          localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        }
        
        this.configNames = Object.keys(config.模型.configs).sort();
        
        if (this.configNames.length > 0) {
          this.selectedConfig = this.configNames[0];
          this.loadConfigValues(this.selectedConfig);
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
        this.showMessageBubble('error', '加载配置失败');
      }
    },
    
    loadConfigValues(configName) {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        const configData = config.模型.configs[configName] || {};
        
        this.modelBaseUrl = configData.model_baseurl || '';
        this.apiKey = configData.api_key || '';
        
        this.models = configData.models || [];
        this.modelNames = this.models.map(model => model.name);
        
        if (this.modelNames.length > 0) {
          this.selectedModel = this.modelNames[0];
          this.loadModelValues(this.selectedModel);
        } else {
          this.selectedModel = '';
          this.clearModelValues();
        }
      } catch (error) {
        console.error('Failed to load config values:', error);
        this.showMessageBubble('error', '加载配置值失败');
      }
    },
    
    saveLLMConfig() {
      try {
        if (!this.selectedConfig) {
          this.showMessageBubble('error', '请先选择一个配置');
          return;
        }
        
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (!config.模型) {
          config.模型 = { configs: {} };
        }
        
        if (!config.模型.configs[this.selectedConfig]) {
          config.模型.configs[this.selectedConfig] = { models: [] };
        }
        
        config.模型.configs[this.selectedConfig].model_baseurl = this.modelBaseUrl;
        config.模型.configs[this.selectedConfig].api_key = this.apiKey;
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        this.showMessageBubble('success', '成功保存配置信息！');
      } catch (error) {
        console.error('Failed to save config:', error);
        this.showMessageBubble('error', '保存配置失败');
      }
    },
    
    onConfigSelect() {
      this.saveModelConfig();
      this.loadConfigValues(this.selectedConfig);
    },
    
    addLLMConfig() {
      this.inputDialogTitle = '新增配置';
      this.inputDialogValue = '';
      this.inputDialogCallback = this.confirmAddConfig;
      this.showInputDialog = true;
    },
    
    confirmAddConfig() {
      const newConfigName = this.inputDialogValue.trim();
      
      if (!newConfigName) {
        this.showMessageBubble('error', '配置名称不能为空');
        return;
      }
      
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (!config.模型) {
          config.模型 = { configs: {} };
        }
        
        if (config.模型.configs[newConfigName]) {
          this.showMessageBubble('error', '配置名称已存在');
          return;
        }
        
        config.模型.configs[newConfigName] = {
          model_baseurl: '',
          api_key: '',
          models: []
        };
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        this.configNames.push(newConfigName);
        this.configNames.sort();
        this.selectedConfig = newConfigName;
        
        this.clearConfigValues();
        this.clearModelValues();
        
        this.closeInputDialog();
        this.showMessageBubble('success', '成功创建新配置');
      } catch (error) {
        console.error('Failed to add config:', error);
        this.showMessageBubble('error', '创建配置失败');
      }
    },
    
    copyLLMConfig() {
      if (!this.selectedConfig) {
        this.showMessageBubble('error', '请选择要复制的配置');
        return;
      }
      
      this.inputDialogTitle = '复制配置';
      this.inputDialogValue = `${this.selectedConfig} 副本`;
      this.inputDialogCallback = this.confirmCopyConfig;
      this.showInputDialog = true;
    },
    
    confirmCopyConfig() {
      const newConfigName = this.inputDialogValue.trim();
      
      if (!newConfigName) {
        this.showMessageBubble('error', '配置名称不能为空');
        return;
      }
      
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (config.模型.configs[newConfigName]) {
          this.showMessageBubble('error', '配置名称已存在');
          return;
        }
        
        const sourceConfig = config.模型.configs[this.selectedConfig];
        config.模型.configs[newConfigName] = JSON.parse(JSON.stringify(sourceConfig));
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        this.configNames.push(newConfigName);
        this.configNames.sort();
        this.selectedConfig = newConfigName;
        
        this.loadConfigValues(newConfigName);
        
        this.closeInputDialog();
        this.showMessageBubble('success', '成功复制配置');
      } catch (error) {
        console.error('Failed to copy config:', error);
        this.showMessageBubble('error', '复制配置失败');
      }
    },
    
    deleteLLMConfig() {
      if (!this.selectedConfig) {
        this.showMessageBubble('error', '请选择要删除的配置');
        return;
      }
      
      if (!confirm(`确定要删除配置 "${this.selectedConfig}" 吗？`)) {
        return;
      }
      
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        delete config.模型.configs[this.selectedConfig];
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        const index = this.configNames.indexOf(this.selectedConfig);
        this.configNames.splice(index, 1);
        
        if (this.configNames.length > 0) {
          this.selectedConfig = this.configNames[0];
          this.loadConfigValues(this.selectedConfig);
        } else {
          this.selectedConfig = '';
          this.clearConfigValues();
          this.clearModelValues();
        }
        
        this.showMessageBubble('success', '已删除');
      } catch (error) {
        console.error('Failed to delete config:', error);
        this.showMessageBubble('error', '删除配置失败');
      }
    },
    
    clearConfigValues() {
      this.modelBaseUrl = '';
      this.apiKey = '';
      this.models = [];
      this.modelNames = [];
      this.selectedModel = '';
    },
    
    // Model Management
    loadModelValues(modelName) {
      this.currentModelName = modelName;
      
      const model = this.models.find(m => m.name === modelName);
      
      if (model) {
        this.modelRetry = model.max_retry || '3';
        this.temperature = model.temperature || '';
        this.topP = model.top_p || '';
        this.frequencyPenalty = model.frequency_penalty || '';
        this.presencePenalty = model.presence_penalty || '';
        this.maxTokens = model.max_tokens || '';
      } else {
        this.clearModelValues();
      }
    },
    
    saveModelConfig() {
      if (!this.selectedConfig || !this.currentModelName) {
        return;
      }
      
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        const models = config.模型.configs[this.selectedConfig].models || [];
        
        const modelIndex = models.findIndex(m => m.name === this.currentModelName);
        
        if (modelIndex !== -1) {
          models[modelIndex] = {
            name: this.currentModelName,
            max_retry: this.modelRetry,
            temperature: this.temperature,
            top_p: this.topP,
            frequency_penalty: this.frequencyPenalty,
            presence_penalty: this.presencePenalty,
            max_tokens: this.maxTokens
          };
        }
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        this.showMessageBubble('success', '模型参数已保存');
      } catch (error) {
        console.error('Failed to save model config:', error);
        this.showMessageBubble('error', '保存模型参数失败');
      }
    },
    
    onModelSelect() {
      this.saveModelConfig();
      this.loadModelValues(this.selectedModel);
    },
    
    addLLMModel() {
      if (!this.selectedConfig) {
        this.showMessageBubble('error', '请先选择一个配置');
        return;
      }
      
      this.inputDialogTitle = '新增模型';
      this.inputDialogValue = '';
      this.inputDialogCallback = this.confirmAddModel;
      this.showInputDialog = true;
    },
    
    confirmAddModel() {
      const newModelName = this.inputDialogValue.trim();
      
      if (!newModelName) {
        this.showMessageBubble('error', '模型名称不能为空');
        return;
      }
      
      if (this.modelNames.includes(newModelName)) {
        this.showMessageBubble('error', '模型名称已存在');
        return;
      }
      
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        const newModel = {
          name: newModelName,
          max_retry: '3',
          temperature: '',
          top_p: '',
          frequency_penalty: '',
          presence_penalty: '',
          max_tokens: ''
        };
        
        config.模型.configs[this.selectedConfig].models.push(newModel);
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        this.models.push(newModel);
        this.modelNames.push(newModelName);
        this.selectedModel = newModelName;
        this.currentModelName = newModelName;
        
        this.clearModelValues();
        this.modelRetry = '3';
        
        this.closeInputDialog();
        this.showMessageBubble('success', '成功添加新模型');
      } catch (error) {
        console.error('Failed to add model:', error);
        this.showMessageBubble('error', '添加模型失败');
      }
    },
    
    deleteLLMModel() {
      if (!this.selectedConfig) {
        this.showMessageBubble('error', '请先选择一个配置');
        return;
      }
      
      if (!this.selectedModel) {
        this.showMessageBubble('error', '请选择要删除的模型');
        return;
      }
      
      if (!confirm(`确定要删除模型 "${this.selectedModel}" 吗？`)) {
        return;
      }
      
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        const models = config.模型.configs[this.selectedConfig].models;
        const modelIndex = models.findIndex(m => m.name === this.selectedModel);
        
        if (modelIndex !== -1) {
          models.splice(modelIndex, 1);
        }
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        const index = this.modelNames.indexOf(this.selectedModel);
        this.models.splice(index, 1);
        this.modelNames.splice(index, 1);
        
        if (this.modelNames.length > 0) {
          this.selectedModel = this.modelNames[0];
          this.loadModelValues(this.selectedModel);
        } else {
          this.selectedModel = '';
          this.clearModelValues();
        }
        
        this.showMessageBubble('success', '已删除模型');
      } catch (error) {
        console.error('Failed to delete model:', error);
        this.showMessageBubble('error', '删除模型失败');
      }
    },
    
    clearModelValues() {
      this.modelRetry = '3';
      this.temperature = '';
      this.topP = '';
      this.frequencyPenalty = '';
      this.presencePenalty = '';
      this.maxTokens = '';
    },
    
    // Integration Modal
    openIntegrationWindow() {
      this.showIntegrationModal = true;
    },
    
    closeIntegrationModal() {
      this.showIntegrationModal = false;
    },
    
    // Input Dialog
    closeInputDialog() {
      this.showInputDialog = false;
      this.inputDialogValue = '';
    },
    
    confirmInputDialog() {
      if (this.inputDialogCallback) {
        this.inputDialogCallback();
      }
    },
    
    // Model Fetching
    getModelsFromServer() {
      if (!this.modelBaseUrl || !this.apiKey) {
        this.showMessageBubble('error', '请先填写模型baseurl和api-key');
        return;
      }
      
      this.showMessageBubble('success', '正在从服务器获取模型列表...');
      
      // Fetch models from server
      this.fetchModelsFromServer(this.modelBaseUrl, this.apiKey)
        .then(models => {
          this.allModels = models;
          this.filteredModels = [...models];
          this.updateTotalPages();
          
          // Initialize model selections based on existing models
          this.modelSelections = {};
          this.allModels.forEach(model => {
            this.modelSelections[model] = this.modelNames.includes(model);
          });
          
          this.showModelSelectionModal = true;
        })
        .catch(error => {
          console.error('Failed to fetch models:', error);
          this.showMessageBubble('error', '获取模型列表失败');
        });
    },
    
    async fetchModelsFromServer(baseUrl, apiKey) {
      try {
        const url = `${baseUrl}/models`;
        const headers = { 'Authorization': apiKey };
        
        const response = await fetch(url, { headers });
        const data = await response.json();
        
        if (data && data.data) {
          const models = data.data
            .filter(item => item.id)
            .map(item => item.id);
          
          // Sort models (Chinese characters first, then alphabetically)
          return models.sort((a, b) => {
            const hasChineseA = /[\u4e00-\u9fa5]/.test(a);
            const hasChineseB = /[\u4e00-\u9fa5]/.test(b);
            
            if (hasChineseA && !hasChineseB) return -1;
            if (!hasChineseA && hasChineseB) return 1;
            return a.toLowerCase().localeCompare(b.toLowerCase());
          });
        }
        
        return [];
      } catch (error) {
        console.error('Error fetching models:', error);
        throw error;
      }
    },
    
    // Model Selection Dialog
    applyModelFilter() {
      const filter = this.modelFilter.toLowerCase();
      
      if (!filter) {
        this.filteredModels = [...this.allModels];
      } else {
        this.filteredModels = this.allModels.filter(model => 
          model.toLowerCase().includes(filter)
        );
      }
      
      this.currentPage = 0;
      this.updateTotalPages();
    },
    
    updateTotalPages() {
      this.totalPages = Math.max(1, Math.ceil(this.filteredModels.length / this.pageSize));
    },
    
    prevPage() {
      if (this.currentPage > 0) {
        this.currentPage--;
      }
    },
    
    nextPage() {
      if (this.currentPage < this.totalPages - 1) {
        this.currentPage++;
      }
    },
    
    selectAllModels() {
      const start = this.currentPage * this.pageSize;
      const end = Math.min(start + this.pageSize, this.filteredModels.length);
      
      for (let i = start; i < end; i++) {
        const model = this.filteredModels[i];
        this.modelSelections[model] = true;
      }
    },
    
    deselectAllModels() {
      const start = this.currentPage * this.pageSize;
      const end = Math.min(start + this.pageSize, this.filteredModels.length);
      
      for (let i = start; i < end; i++) {
        const model = this.filteredModels[i];
        this.modelSelections[model] = false;
      }
    },
    
    truncateText(text) {
      const maxLength = 40;
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },
    
    confirmModelSelection() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        const modelsToAdd = [];
        const modelsToRemove = [];
        
        // Determine which models to add and remove
        Object.keys(this.modelSelections).forEach(model => {
          const selected = this.modelSelections[model];
          const existing = this.modelNames.includes(model);
          
          if (selected && !existing) {
            modelsToAdd.push(model);
          } else if (!selected && existing) {
            modelsToRemove.push(model);
          }
        });
        
        // Add new models
        modelsToAdd.forEach(modelName => {
          const newModel = {
            name: modelName,
            max_retry: '3',
            temperature: '',
            top_p: '',
            frequency_penalty: '',
            presence_penalty: '',
            max_tokens: ''
          };
          
          config.模型.configs[this.selectedConfig].models.push(newModel);
          this.models.push(newModel);
          this.modelNames.push(modelName);
        });
        
        // Remove models
        modelsToRemove.forEach(modelName => {
          const configModels = config.模型.configs[this.selectedConfig].models;
          const modelIndex = configModels.findIndex(m => m.name === modelName);
          
          if (modelIndex !== -1) {
            configModels.splice(modelIndex, 1);
          }
          
          const index = this.modelNames.indexOf(modelName);
          this.models.splice(index, 1);
          this.modelNames.splice(index, 1);
        });
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        // Update selected model
        if (modelsToRemove.includes(this.selectedModel)) {
          if (this.modelNames.length > 0) {
            this.selectedModel = this.modelNames[0];
            this.loadModelValues(this.selectedModel);
          } else {
            this.selectedModel = '';
            this.clearModelValues();
          }
        }
        
        this.closeModelSelectionModal();
        this.showMessageBubble('success', '模型列表已更新');
      } catch (error) {
        console.error('Failed to update models:', error);
        this.showMessageBubble('error', '更新模型列表失败');
      }
    },
    
    closeModelSelectionModal() {
      this.showModelSelectionModal = false;
      this.modelFilter = '';
      this.currentPage = 0;
    },
    
    // Test Model
    testLLMModel() {
      if (!this.modelBaseUrl || !this.apiKey || !this.selectedModel) {
        this.showMessageBubble('error', '请先填写模型baseurl、api-key和选择模型');
        return;
      }
      
      this.showMessageBubble('success', `开始测试${this.selectedModel}`);
      
      this.testModel(this.modelBaseUrl, this.apiKey, this.selectedModel)
        .then(success => {
          if (success) {
            this.showMessageBubble('success', `${this.selectedModel}测试通过`);
          } else {
            this.showMessageBubble('error', `${this.selectedModel}测试失败`);
          }
        })
        .catch(() => {
          this.showMessageBubble('error', `${this.selectedModel}测试不通过`);
        });
    },
    
    async testModel(baseUrl, apiKey, modelName) {
      try {
        const url = `${baseUrl}/chat/completions`;
        const headers = {
          'Accept': 'application/json',
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        };
        
        const data = {
          model: modelName,
          messages: [{ role: 'user', content: '你好' }]
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        return !!(
          result.choices &&
          result.choices.length > 0 &&
          result.choices[0].message &&
          result.choices[0].message.content
        );
      } catch (error) {
        console.error('Error testing model:', error);
        throw error;
      }
    },
    
    // Message Bubble
    showMessageBubble(type, content) {

      
      this.$emit('show-message', { title: type, message: content});
    }
  }
};
</script>

<style>
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
  --model-item-hover: #f5f5f5;
  --input-placeholder: #aaaaaa;
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
  --model-item-hover: #38384a;
  --input-placeholder: #777777;
}

/* Main Container */
.llm-config-container {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Segoe UI', Arial, sans-serif;
  color: var(--text-color);
  position: relative;
  background-color: var(--background-color);
  border-radius: var(--border-radius);
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

/* Title Section */
.title-section {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 0.75rem;
  transition: color var(--transition-speed);
}

.separator {
  height: 2px;
  background-color: var(--border-color);
  margin: 0.5rem 0;
  transition: background-color var(--transition-speed);
}

/* Panels */
.config-panel {
  background-color: var(--panel-bg);
  border-radius: var(--border-radius);
  padding: 1.75rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px var(--shadow-color);
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.panel-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  color: var(--text-color);
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 0.75rem;
  transition: color var(--transition-speed), border-color var(--transition-speed);
}

/* Configuration Selection Row */
.config-selection-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.config-dropdown-container {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 300px;
}

.config-dropdown-container label {
  margin-right: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.config-dropdown {
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  font-size: 1rem;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all var(--transition-speed);
  appearance: none;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6"><path fill="%23666" d="M0 0l6 6 6-6z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;
}

.config-dropdown:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.config-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* Integration Row */
.integration-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.25rem;
}

/* Tabs */
.content-tabs {
  background-color: var(--panel-bg);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 6px var(--shadow-color);
  margin-bottom: 2rem;
  overflow: hidden;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.tab-headers {
  display: flex;
  border-bottom: 2px solid var(--border-color);
  background-color: var(--panel-bg);
  transition: border-color var(--transition-speed), background-color var(--transition-speed);
}

.tab-header {
  padding: 1.25rem 1.75rem;
  cursor: pointer;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
  transition: all var(--transition-speed);
  position: relative;
}

.tab-header:hover {
  color: var(--text-color);
}

.tab-header.active {
  color: var(--tab-active-color);
  border-bottom: 3px solid var(--tab-active-border);
  background-color: var(--background-color);
}

.tab-content {
  padding: 2rem;
  background-color: var(--background-color);
  transition: background-color var(--transition-speed);
}

/* Form Elements */
.form-group {
  margin-bottom: 1.75rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.625rem;
  font-weight: 500;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.text-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  font-size: 1rem;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all var(--transition-speed);
}

.text-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.text-input::placeholder {
  color: var(--input-placeholder);
}

.api-key-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.api-key-container .text-input {
  flex: 1;
}

.show-key-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color var(--transition-speed);
  white-space: nowrap;
}

.show-key-label:hover {
  color: var(--text-color);
}

.show-key-label input {
  margin-right: 0.5rem;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;
}

/* Model Section */
.model-section {
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-color);
  transition: border-color var(--transition-speed);
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.model-selection-row {
  display: flex;
  align-items: center;
  margin-bottom: 1.25rem;
}

.model-selection-row label {
  margin-right: 0.75rem;
  font-weight: 500;
  min-width: 100px;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.model-dropdown {
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  font-size: 1rem;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all var(--transition-speed);
  appearance: none;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6"><path fill="%23666" d="M0 0l6 6 6-6z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;
}

.model-dropdown:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.model-buttons-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  gap: 1rem;
}

.model-buttons-left, .model-buttons-right {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* Parameters Section */
.params-section {
  margin-bottom: 1.5rem;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.param-cell {
  display: flex;
  flex-direction: column;
}

.param-cell label {
  margin-bottom: 0.625rem;
  font-weight: 500;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.param-input {
  padding: 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  font-size: 1rem;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all var(--transition-speed);
}

.param-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

/* Buttons */
.btn {
  padding: 0.75rem 1.25rem;
  border-radius: var(--border-radius);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  transition: all var(--transition-speed);
  white-space: nowrap;
  min-width: 100px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  margin-right: 0.5rem;
  font-size: 1rem;
}

.btn-default {
  background-color: var(--btn-default-bg);
  color: var(--btn-default-color);
  border: 1px solid var(--btn-default-border);
}

.btn-default:hover:not(:disabled) {
  background-color: var(--btn-default-hover);
}

.btn-accent {
  background-color: var(--btn-accent-bg);
  color: var(--btn-accent-color);
  border: 1px solid var(--btn-accent-bg);
}

.btn-accent:hover:not(:disabled) {
  background-color: var(--btn-accent-hover);
  border-color: var(--btn-accent-hover);
}

.btn-danger {
  background-color: var(--btn-danger-bg);
  color: var(--btn-danger-color);
  border: 1px solid var(--btn-danger-bg);
}

.btn-danger:hover:not(:disabled) {
  background-color: var(--btn-danger-hover);
  border-color: var(--btn-danger-hover);
}

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  min-width: 80px;
}

/* Modal */
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
  backdrop-filter: blur(2px);
  transition: background-color var(--transition-speed);
}

.modal-container {
  background-color: var(--modal-bg);
  border-radius: var(--border-radius);
  width: 100%;
  max-width: 1000px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 16px var(--shadow-color);
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.modal-header {
  padding: 1.25rem 1.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  transition: border-color var(--transition-speed);
}

.modal-header h2 {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.modal-body {
  padding: 1.75rem;
}

.modal-footer {
  padding: 1.25rem 1.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  transition: border-color var(--transition-speed);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.75rem;
  cursor: pointer;
  padding: 0;
  color: var(--text-secondary);
  transition: color var(--transition-speed);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.close-button:hover {
  color: var(--text-color);
  background-color: var(--hover-bg);
}

/* Model Selection Dialog */
.model-selection-modal {
  max-width: 900px;
}

.filter-section {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.filter-section label {
  margin-right: 0.75rem;
  font-weight: 500;
  min-width: 60px;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.filter-container {
  display: flex;
  flex: 1;
}

.filter-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius) 0 0 var(--border-radius);
  font-size: 1rem;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all var(--transition-speed);
}

.filter-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.filter-container .btn {
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
  margin-left: -1px;
}

.pagination-section {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.pagination-section label {
  margin-right: 0.75rem;
  font-weight: 500;
  min-width: 60px;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.page-dropdown {
  flex: 1;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  font-size: 1rem;
  margin-right: 1rem;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all var(--transition-speed);
  appearance: none;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6"><path fill="%23666" d="M0 0l6 6 6-6z"/></svg>');
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;
}

.page-dropdown:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.page-buttons {
  display: flex;
  gap: 0.75rem;
}

.model-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.75rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  background-color: var(--input-bg);
  transition: all var(--transition-speed);
}

.model-item {
  padding: 0.625rem;
  border-radius: var(--border-radius);
  transition: background-color var(--transition-speed);
}

.model-item:hover {
  background-color: var(--model-item-hover);
}

.model-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.model-checkbox input {
  margin-right: 0.75rem;
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.selection-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

/* Input Dialog */
.input-dialog {
  background-color: var(--modal-bg);
  border-radius: var(--border-radius);
  padding: 1.75rem;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 8px 16px var(--shadow-color);
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.input-dialog h3 {
  margin-top: 0;
  margin-bottom: 1.25rem;
  font-size: 1.4rem;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.75rem;
}


/* Responsive Adjustments */
@media (max-width: 992px) {
  .params-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
  
  .model-list {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

@media (max-width: 768px) {
  .llm-config-container {
    padding: 1rem;
  }
  
  .config-selection-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .config-dropdown-container {
    margin-right: 0;
    margin-bottom: 1rem;
  }
  
  .model-buttons-row {
    flex-direction: column;
  }
  
  .model-buttons-left, .model-buttons-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .modal-container {
    width: 95%;
  }
  
  .tab-header {
    padding: 1rem;
    font-size: 0.9rem;
  }
  
  .tab-content {
    padding: 1.5rem 1rem;
  }
}

@media (max-width: 576px) {
  .model-list {
    grid-template-columns: 1fr;
  }
  
  .params-grid {
    grid-template-columns: 1fr;
  }
  
  .btn {
    padding: 0.625rem 1rem;
    font-size: 0.9rem;
  }
  
  .api-key-container {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .show-key-label {
    margin-top: 0.5rem;
    margin-left: 0;
  }
  
  .pagination-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .page-dropdown {
    width: 100%;
    margin-right: 0;
    margin-bottom: 0.75rem;
    margin-top: 0.5rem;
  }
  
  .page-buttons {
    width: 100%;
    justify-content: space-between;
  }
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

/* Custom Scrollbar */
.model-list::-webkit-scrollbar {
  width: 8px;
}

.model-list::-webkit-scrollbar-track {
  background: var(--input-bg);
  border-radius: var(--border-radius);
}

.model-list::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: var(--border-radius);
}

.model-list::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-secondary);
}

/* Focus states for accessibility */
button:focus, 
input:focus, 
select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.4);
}

/* Improved checkbox styling */
input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 1px solid var(--input-border);
  border-radius: 3px;
  background-color: var(--input-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all var(--transition-speed);
}

input[type="checkbox"]:checked {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

input[type="checkbox"]:checked::after {
  content: '';
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  position: absolute;
  transform: rotate(45deg);
  top: 2px;
}


input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>