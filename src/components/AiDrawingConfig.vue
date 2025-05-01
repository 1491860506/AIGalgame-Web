<template>
  <div class="ai-drawing-config">
    <!-- Title Section -->
    <div class="title-section">
      <h1>AI 绘画配置</h1>
      <p>配置和管理AI绘图服务接口</p>
      <div class="separator"></div>
    </div>
    
    <!-- Configuration Selection Area -->
    <div class="config-selection-frame">
      <div class="top-controls">
        <div class="left-controls">
          <!-- Config selection dropdown -->
          <div class="config-combo-frame">
            <label for="config-edit-combo">选择配置:</label>
            <select 
              id="config-edit-combo" 
              class="config-edit-combo" 
              v-model="selectedConfig"
              @change="loadSelectedConfig">
              <option v-for="config in configs" :key="config" :value="config">{{ config }}</option>
            </select>
          </div>
        </div>
        
        <div class="right-controls">
          <div class="button-frame">
            <button class="btn add-config" @click="addConfig">
              <i class="fas fa-plus"></i> 新增
            </button>
            <button class="btn copy-config" @click="copyConfig">
              <i class="fas fa-copy"></i> 复制配置
            </button>
            <button class="btn rename-config secondary" @click="renameConfig">
              <i class="fas fa-pen"></i> 配置改名
            </button>
            <button class="btn delete-config danger" @click="deleteConfig">
              <i class="fas fa-trash"></i> 删除
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Shared Parameters Section -->
    <div class="shared-params-section">
      <h2>全局参数</h2>
      <div class="shared-params-container">
        <div class="shared-params-grid">
          <!-- Left column - Numeric parameters -->
          <div class="params-column">
            <div class="param-group">
              <label for="max-attempts">最大尝试次数:</label>
              <input 
                id="max-attempts" 
                type="number" 
                v-model="maxAttempts" 
                min="1" 
                class="number-input"
              />
            </div>
            
            <div class="param-group">
              <label for="delay-time">重试间隔 (秒):</label>
              <input 
                id="delay-time" 
                type="number" 
                v-model="delayTime" 
                min="0" 
                class="number-input"
              />
            </div>
            
            <div class="param-group">
              <label for="max-concurrency">最大并发数:</label>
              <input 
                id="max-concurrency" 
                type="number" 
                v-model="maxConcurrency" 
                min="1" 
                class="number-input"
              />
            </div>
          </div>
          
          <!-- Right column - Toggles -->
          <div class="params-column">
            <div class="switch-wrapper">
              <div class="switch-container">
                <label class="switch">
                  <input type="checkbox" v-model="useRembg">
                  <span class="slider round"></span>
                </label>
                <span class="switch-label">使用本地rembg移除背景</span>
              </div>
              
              <div class="switch-container">
                <label class="switch">
                  <input type="checkbox" v-model="useCors">
                  <span class="slider round"></span>
                </label>
                <span class="switch-label">启用本地代理跨域</span>
              </div>
              
              <!-- Second request switch -->
              <div class="switch-container">
                <label class="switch">
                  <input type="checkbox" v-model="secondRequest" @change="toggleSecondRequest">
                  <span class="slider round"></span>
                </label>
                <span class="switch-label">启用二次请求</span>
              </div>
            </div>
            
            <!-- Request selection (only visible when second request is enabled) -->
            <div class="request-selection-container" v-if="secondRequest">
              <div class="request-selection-frame">
                <label for="request-type">当前编辑:</label>
                <select 
                  id="request-type" 
                  v-model="requestType" 
                  class="request-type-combo"
                  @change="switchRequestView">
                  <option value="一次请求">一次请求</option>
                  <option value="二次请求">二次请求</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Configuration Content Area -->
    <div class="config-content">
      <div class="tabs">
        <div 
          class="tab" 
          :class="{ active: activeTab === 'general' }" 
          @click="activeTab = 'general'">基本设置</div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'headers' }" 
          @click="activeTab = 'headers'">请求头</div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'body' }" 
          @click="activeTab = 'body'">请求体</div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'response' }" 
          @click="activeTab = 'response'">响应处理</div>
      </div>
      
      <div class="tab-content">
        <!-- General Settings Tab -->
        <div v-show="activeTab === 'general'" class="tab-pane">
          <!-- URL and method frame -->
          <div class="request-info-frame">
            <h3>请求基本信息</h3>
            <div class="url-frame">
              <label for="request-url">请求URL:</label>
              <input id="request-url" type="text" v-model="requestUrl" class="request-url-input" />
            </div>
            
            <div class="method-frame">
              <div class="method-group">
                <label for="request-method">请求方法:</label>
                <select id="request-method" v-model="requestMethod" @change="toggleRequestBody">
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
              
              <div class="timeout-group">
                <label for="request-timeout">超时时间 (秒):</label>
                <input 
                  id="request-timeout" 
                  type="number" 
                  v-model="requestTimeout" 
                  min="1" 
                  class="number-input"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Headers Tab -->
        <div v-show="activeTab === 'headers'" class="tab-pane">
          <div class="header-control-frame">
            <div class="header-actions">
              <button class="btn" @click="addHeader">
                <i class="fas fa-plus"></i> 新增请求头
              </button>
              <div v-if="secondRequest && currentRequestViewType === '二次请求'">
                <button class="btn copy-headers-btn" @click="copyHeadersFromFirstRequest">
                  <i class="fas fa-copy"></i> 复制一次请求头
                </button>
              </div>
            </div>
            
            <select 
              v-if="totalHeaderPages > 1" 
              v-model="currentHeaderPage" 
              @change="updateHeaderPagination" 
              class="header-page-combo">
              <option v-for="page in totalHeaderPages" :key="page" :value="page">{{ page }}</option>
            </select>
          </div>
          
          <div class="headers-entries-frame">
            <div 
              v-for="(header, index) in visibleHeaders" 
              :key="index" 
              class="header-item">
              <button class="delete-btn" @click="deleteHeader(header.id)">
                <i class="fas fa-trash"></i>
              </button>
              <input 
                type="text" 
                v-model="header.key" 
                placeholder="Header Key" 
                class="header-key" 
              />
              <input 
                type="text" 
                v-model="header.value" 
                placeholder="Header Value" 
                class="header-value" 
              />
            </div>
          </div>
        </div>
        
        <!-- Request Body Tab -->
        <div v-show="activeTab === 'body'" class="tab-pane">
          <div class="request-body-frame" v-if="requestMethod === 'POST'">
            <div class="body-label-frame">
              <label for="request-body">请求体 JSON:</label>
              <button class="btn" @click="validateRequestJson">检验JSON</button>
              <span class="body-help-label">请按照JSON格式输入, {prompt}和{random}分别指代提示词和随机数</span>
            </div>
            
            <textarea 
              id="request-body" 
              v-model="requestBody" 
              class="request-body-text" 
              spellcheck="false"
              placeholder='{"prompt": "{prompt}", "seed": "{random}"}'
            ></textarea>
          </div>
          <div v-else class="no-body-message">
            GET 请求没有请求体
          </div>
        </div>
        
        <!-- Response Processing Tab -->
        <div v-show="activeTab === 'response'" class="tab-pane">
          <div class="json-path-frame">
            <label for="json-path">JSON路径:</label>
            <input id="json-path" type="text" v-model="jsonPath" />
            
            <label for="parse-entry" class="parse-label">解析响应:</label>
            <input id="parse-entry" type="text" v-model="parse" />
          </div>
          
          <div class="conditions-frame">
            <h3>响应条件</h3>
            
            <!-- Success condition -->
            <div class="condition-row">
              <label for="success-condition">成功条件:</label>
              <input id="success-condition" type="text" v-model="successCondition" />
            </div>
            
            <!-- Failure condition -->
            <div class="condition-row">
              <label for="fail-condition">失败条件:</label>
              <input id="fail-condition" type="text" v-model="failCondition" />
            </div>
            
            <!-- Forbid condition -->
            <div class="condition-row">
              <label for="forbid-condition">违禁条件:</label>
              <input id="forbid-condition" type="text" v-model="forbidCondition" />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Save Button & Advanced Settings -->
    <div class="bottom-controls">
      <button class="btn accent character-background-config" @click="openCharacterBackgroundSettings">
        <i class="fas fa-cog"></i> 人物与背景绘画设置
      </button>
      
      <button class="btn save-button accent" @click="saveCurrentConfig">
        <i class="fas fa-save"></i> 保存配置
      </button>
    </div>
    
    <!-- Character Background Settings Dialog -->
    <div class="modal" v-if="showCharacterBackgroundDialog" @click.self="showCharacterBackgroundDialog = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>人物与背景绘画设置</h2>
          <button class="close-btn" @click="showCharacterBackgroundDialog = false">&times;</button>
        </div>
        <div class="modal-body">
          <AiDrawingConfig_character_background />
        </div>
      </div>
    </div>
    
    <!-- Notification -->
    <div class="notification" v-if="notification.show" :class="notification.type">
      {{ notification.message }}
    </div>
  </div>
</template>

<script>
import AiDrawingConfig_character_background from './AiDrawingConfig_character_background.vue';

export default {
  name: 'AiDrawingConfig',
  components: {
    AiDrawingConfig_character_background
  },
  data() {
    return {
      // UI States
      activeTab: 'general',
      showCharacterBackgroundDialog: false,
      notification: {
        show: false,
        message: '',
        type: 'success',
        timeout: null
      },
      
      // Configuration Selection
      configs: [],
      selectedConfig: '',
      
      // Shared Parameters
      maxAttempts: 1,
      delayTime: 5,
      maxConcurrency: 1,
      useRembg: false,
      useCors: false,
      
      // Request Configuration
      secondRequest: false,
      requestType: '一次请求',
      currentRequestViewType: '一次请求',
      
      // URL and Method
      requestUrl: '',
      requestMethod: 'POST',
      requestTimeout: 30,
      
      // Request Body
      requestBody: '',
      
      // Headers
      headers: [],
      headersPerPage: 6,
      currentHeaderPage: 1,
      
      // Response Processing
      jsonPath: '',
      parse: '',
      successCondition: '',
      failCondition: '',
      forbidCondition: '',
      
      // Config Data
      configData: {},
      
      // Current timestamp for logging
      currentTimestamp: '2025-04-21 19:05:43'
    };
  },
  computed: {
    visibleHeaders() {
      const start = (this.currentHeaderPage - 1) * this.headersPerPage;
      const end = start + this.headersPerPage;
      return this.headers.slice(start, end);
    },
    totalHeaderPages() {
      return Math.max(1, Math.ceil(this.headers.length / this.headersPerPage));
    }
  },
  mounted() {
    this.loadConfigNames();
  },
  methods: {
    // Helper Methods
    showNotification(message, type = 'success') {
      this.$emit('show-message', { title: type, message: message});
    },
    
    // Configuration Management
    loadConfigNames() {
      try {
        const storedConfig = localStorage.getItem('aiGalgameConfig');
        if (storedConfig) {
          const config = JSON.parse(storedConfig);
          if (config && config.AI_draw && config.AI_draw.configs) {
            this.configs = Object.keys(config.AI_draw.configs).sort();
            this.configData = config;
            if (this.configs.length > 0) {
              this.selectedConfig = this.configs[0];
              this.loadSelectedConfig();
            }
          } else {
            this.initializeConfig();
          }
        } else {
          this.initializeConfig();
        }
      } catch (error) {
        console.error('Error loading config names:', error);
        this.initializeConfig();
      }
    },
    
    initializeConfig() {
      // Get existing configuration if available
      let existingConfig = {};
      try {
        const storedConfig = localStorage.getItem('aiGalgameConfig');
        if (storedConfig) {
          existingConfig = JSON.parse(storedConfig);
        }
      } catch (error) {
        console.error('Error loading existing config:', error);
      }
      
      // Initialize or update AI_draw section
      this.configData = {
        ...existingConfig,
        AI_draw: {
          configs: {},
          character_config: [],
          background_config: []
        }
      };
      
      this.saveConfig();
    },
    
    saveConfig() {
      try {
        // Get existing configuration if available
        let existingConfig = {};
        try {
          const storedConfig = localStorage.getItem('aiGalgameConfig');
          if (storedConfig) {
            existingConfig = JSON.parse(storedConfig);
          }
        } catch (error) {
          console.error('Error loading existing config before save:', error);
        }
        
        // Merge with the existing configuration
        const mergedConfig = {
          ...existingConfig,
          AI_draw: this.configData.AI_draw
        };
        
        // Save the merged configuration
        localStorage.setItem('aiGalgameConfig', JSON.stringify(mergedConfig));
        
        // Log the save operation (for debugging)
        console.log(`Configuration saved at ${this.currentTimestamp}`);
      } catch (error) {
        console.error('Error saving config:', error);
        this.showNotification('保存配置时发生错误', 'error');
      }
    },
    
    addConfig() {
      const configName = prompt('请输入配置名称:');
      if (!configName) return;
      
      if (this.configs.includes(configName)) {
        this.showNotification('配置名称已存在！', 'error');
        return;
      }
      
      // Create new config
      this.configData.AI_draw.configs[configName] = {
        max_attempts: '1',
        delay_time: '5',
        maxconcurrency: '1',
        use_rembg: false,
        use_cors: false,
        request_timeout: '30',
        request_method: 'POST',
        request_url: '',
        request_body: '',
        json_path: '',
        success_condition: '',
        fail_condition: '',
        forbid_condition: '',
        headers: [],
        second_request: false,
        second_request_timeout: '30',
        second_request_method: 'POST',
        second_request_url: '',
        second_request_body: '',
        second_json_path: '',
        second_success_condition: '',
        second_fail_condition: '',
        second_forbid_condition: '',
        second_headers: []
      };
      
      this.configs.push(configName);
      this.configs.sort();
      this.selectedConfig = configName;
      this.saveConfig();
      this.loadSelectedConfig();
      this.showNotification('配置已创建！');
    },
    
    copyConfig() {
      if (!this.selectedConfig) {
        this.showNotification('请选择要复制的配置！', 'error');
        return;
      }
      
      const newConfigName = prompt('请输入复制后的配置名称:');
      if (!newConfigName) return;
      
      if (this.configs.includes(newConfigName)) {
        this.showNotification('配置名称已存在！', 'error');
        return;
      }
      
      // Copy config
      this.configData.AI_draw.configs[newConfigName] = JSON.parse(
        JSON.stringify(this.configData.AI_draw.configs[this.selectedConfig])
      );
      
      this.configs.push(newConfigName);
      this.configs.sort();
      this.selectedConfig = newConfigName;
      this.saveConfig();
      this.loadSelectedConfig();
      this.showNotification('配置已复制！');
    },
    
    renameConfig() {
      if (!this.selectedConfig) {
        this.showNotification('请选择要改名的配置！', 'error');
        return;
      }
      
      const newConfigName = prompt('请输入新的配置名称:', this.selectedConfig);
      if (!newConfigName || newConfigName === this.selectedConfig) return;
      
      if (this.configs.includes(newConfigName)) {
        this.showNotification('配置名称已存在！', 'error');
        return;
      }
      
      // Rename config
      this.configData.AI_draw.configs[newConfigName] = this.configData.AI_draw.configs[this.selectedConfig];
      delete this.configData.AI_draw.configs[this.selectedConfig];
      
      const index = this.configs.indexOf(this.selectedConfig);
      this.configs.splice(index, 1, newConfigName);
      this.configs.sort();
      this.selectedConfig = newConfigName;
      this.saveConfig();
      this.showNotification('配置已改名！');
    },
    
    deleteConfig() {
      if (!this.selectedConfig) {
        this.showNotification('请选择要删除的配置！', 'error');
        return;
      }
      
      if (!confirm(`确定要删除配置 '${this.selectedConfig}' 吗？`)) return;
      
      // Delete config
      delete this.configData.AI_draw.configs[this.selectedConfig];
      
      const index = this.configs.indexOf(this.selectedConfig);
      this.configs.splice(index, 1);
      
      if (this.configs.length > 0) {
        this.selectedConfig = this.configs[0];
        this.loadSelectedConfig();
      } else {
        this.selectedConfig = '';
        this.clearConfigFields();
      }
      
      this.saveConfig();
      this.showNotification('配置已删除！');
    },
    
    // Load & Save Config
    loadSelectedConfig() {
      if (!this.selectedConfig || !this.configData.AI_draw.configs[this.selectedConfig]) {
        this.clearConfigFields();
        return;
      }
      
      const config = this.configData.AI_draw.configs[this.selectedConfig];
      
      // Load shared parameters
      this.maxAttempts = config.max_attempts || '1';
      this.delayTime = config.delay_time || '5';
      this.maxConcurrency = config.maxconcurrency || '1';
      this.useRembg = config.use_rembg || false;
      this.useCors = config.use_cors || false;
      
      // Load request configuration
      this.secondRequest = config.second_request || false;
      this.requestType = '一次请求';
      this.currentRequestViewType = '一次请求';
      
      // Load the first request view
      this.loadViewFromConfig('一次请求');
    },
    
    loadViewFromConfig(requestType) {
      if (!this.selectedConfig || !this.configData.AI_draw.configs[this.selectedConfig]) return;
      
      const config = this.configData.AI_draw.configs[this.selectedConfig];
      const prefix = requestType === '一次请求' ? '' : 'second_';
      
      // Clear previous request-specific data
      this.clearRequestSpecificFields();
      
      // Load URL and method
      this.requestUrl = config[`${prefix}request_url`] || '';
      this.requestMethod = config[`${prefix}request_method`] || 'POST';
      this.requestTimeout = config[`${prefix}request_timeout`] || '30';
      
      // Load request body
      this.requestBody = config[`${prefix}request_body`] || '';
      
      // Load headers
      try {
        let headersData = config[`${prefix}headers`] || [];
        if (typeof headersData === 'string') {
          headersData = JSON.parse(headersData);
        }
        
        this.headers = Array.isArray(headersData) 
          ? headersData.map((header, index) => ({
              id: index,
              key: header[0] || '',
              value: header[1] || ''
            }))
          : [];
          
        this.currentHeaderPage = 1;
      } catch (error) {
        console.error('Error loading headers:', error);
        this.headers = [];
      }
      
      // Load response processing
      this.jsonPath = config[`${prefix}json_path`] || '';
      this.parse = config[`${prefix}userdefine`] || '';
      this.successCondition = config[`${prefix}success_condition`] || '';
      this.failCondition = config[`${prefix}fail_condition`] || '';
      this.forbidCondition = config[`${prefix}forbid_condition`] || '';
    },
    
    saveViewToConfig(requestType) {
      if (!this.selectedConfig || !this.configData.AI_draw.configs[this.selectedConfig]) return;
      
      const config = this.configData.AI_draw.configs[this.selectedConfig];
      const prefix = requestType === '一次请求' ? '' : 'second_';
      
      // Save URL and method
      config[`${prefix}request_url`] = this.requestUrl;
      config[`${prefix}request_method`] = this.requestMethod;
      config[`${prefix}request_timeout`] = this.requestTimeout;
      
      // Save request body
      config[`${prefix}request_body`] = this.requestMethod === 'POST' ? this.requestBody : '';
      
      // Save headers
      config[`${prefix}headers`] = this.headers.map(header => [header.key, header.value]);
      
      // Save response processing
      config[`${prefix}json_path`] = this.jsonPath;
      config[`${prefix}userdefine`] = this.parse;
      config[`${prefix}success_condition`] = this.successCondition;
      config[`${prefix}fail_condition`] = this.failCondition;
      config[`${prefix}forbid_condition`] = this.forbidCondition;
      
      // Save switch state
      if (prefix === '') {
        config.second_request = this.secondRequest;
      }
    },
    
    saveCurrentConfig() {
      if (!this.selectedConfig) {
        this.showNotification('请选择要保存的配置！', 'error');
        return;
      }
      
      if (!this.configData.AI_draw.configs[this.selectedConfig]) {
        this.showNotification('配置数据丢失，无法保存！', 'error');
        return;
      }
      
      // Save shared parameters
      const config = this.configData.AI_draw.configs[this.selectedConfig];
      config.max_attempts = this.maxAttempts;
      config.delay_time = this.delayTime;
      config.maxconcurrency = this.maxConcurrency;
      config.use_rembg = this.useRembg;
      config.use_cors = this.useCors;
      
      // Save the currently displayed view's data
      this.saveViewToConfig(this.currentRequestViewType);
      
      // Get the existing configuration from localStorage
      let existingConfig = {};
      try {
        const storedConfig = localStorage.getItem('aiGalgameConfig');
        if (storedConfig) {
          existingConfig = JSON.parse(storedConfig);
        }
      } catch (error) {
        console.error('Error loading existing config for save:', error);
      }
      
      // Merge with the existing configuration
      const mergedConfig = {
        ...existingConfig,
        AI_draw: this.configData.AI_draw
      };
      
      // Save the merged configuration
      localStorage.setItem('aiGalgameConfig', JSON.stringify(mergedConfig));
      
      // Update local config data with merged data
      this.configData = mergedConfig;
      
      this.showNotification(`配置 '${this.selectedConfig}' 已保存！`);
      
      // Log the save operation
      console.log(`Configuration saved at ${this.currentTimestamp}`);
    },
    
    clearConfigFields() {
      // Clear shared parameters
      this.maxAttempts = '1';
      this.delayTime = '5';
      this.maxConcurrency = '1';
      this.useRembg = false;
      this.useCors = false;
      
      // Clear request configuration
      this.secondRequest = false;
      this.requestType = '一次请求';
      this.currentRequestViewType = '一次请求';
      
      // Clear request-specific fields
      this.clearRequestSpecificFields();
    },
    
    clearRequestSpecificFields() {
      // Clear URL and method
      this.requestUrl = '';
      this.requestMethod = 'POST';
      this.requestTimeout = '30';
      
      // Clear request body
      this.requestBody = '';
      
      // Clear headers
      this.headers = [];
      this.currentHeaderPage = 1;
      
      // Clear response processing
      this.jsonPath = '';
      this.parse = '';
      this.successCondition = '';
      this.failCondition = '';
      this.forbidCondition = '';
    },
    
    // Request Configuration
    toggleSecondRequest() {
      if (this.selectedConfig && this.configData.AI_draw.configs[this.selectedConfig]) {
        this.configData.AI_draw.configs[this.selectedConfig].second_request = this.secondRequest;
      }
    },
    
    switchRequestView() {
      if (this.requestType === this.currentRequestViewType) return;
      
      // Save the current view's data
      this.saveViewToConfig(this.currentRequestViewType);
      
      // Load the new view's data
      this.loadViewFromConfig(this.requestType);
      
      // Update tracker
      this.currentRequestViewType = this.requestType;
    },
    
    toggleRequestBody() {
      // No action needed in Vue template, controlled by v-if
    },
    
    // Headers Management
    addHeader() {
      this.headers.push({
        id: Date.now(), // Use timestamp as unique ID
        key: '',
        value: ''
      });
      
      // Go to last page if adding new header
      this.currentHeaderPage = this.totalHeaderPages;
    },
    
    deleteHeader(id) {
      const index = this.headers.findIndex(h => h.id === id);
      if (index !== -1) {
        this.headers.splice(index, 1);
        
        // Adjust current page if needed
        if (this.currentHeaderPage > this.totalHeaderPages) {
          this.currentHeaderPage = Math.max(1, this.totalHeaderPages);
        }
      }
    },
    
    copyHeadersFromFirstRequest() {
      if (this.currentRequestViewType !== '二次请求' || !this.selectedConfig) {
        return;
      }
      
      const config = this.configData.AI_draw.configs[this.selectedConfig];
      if (!config || !Array.isArray(config.headers)) {
        this.showNotification('无法获取一次请求的请求头', 'error');
        return;
      }
      
      try {
        // Get first request headers
        let firstHeaders = config.headers || [];
        
        // Convert to our format
        this.headers = firstHeaders.map((header, index) => ({
          id: Date.now() + index,
          key: header[0] || '',
          value: header[1] || ''
        }));
        
        this.currentHeaderPage = 1;
        this.showNotification('已复制一次请求的请求头', 'success');
      } catch (error) {
        console.error('Error copying headers:', error);
        this.showNotification('复制请求头时出错', 'error');
      }
    },
    
    updateHeaderPagination() {
      // No action needed in Vue, computed property handles this
    },
    
    // Request Body
    validateRequestJson() {
      try {
        // Get current request body text
        let jsonText = this.requestBody;
        
        // Replace variables
        jsonText = jsonText.replace('{prompt}', 'test').replace('{random}', '1');
        
        // Try to parse JSON
        JSON.parse(jsonText);
        this.showNotification('检验通过', 'success');
      } catch (error) {
        this.showNotification(`JSON格式错误: ${error.message}`, 'error');
      }
    },
    
    // Character Background Settings
    openCharacterBackgroundSettings() {
      this.showCharacterBackgroundDialog = true;
    }
  }
};
</script>

<style scoped>
.ai-drawing-config {
  padding: 20px;
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  color: var(--text-primary);
  max-width: 1200px;
  margin: 0 auto;
}

/* Title Section */
.title-section {
  margin-bottom: 20px;
}

.title-section h1 {
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  color: var(--primary-color);
}

.title-section p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 5px 0 15px;
}

.separator {
  height: 1px;
  background-color: var(--border-color);
  margin-top: 10px;
}

/* Configuration Selection Frame */
.config-selection-frame {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  background-color: var(--sidebar-bg);
}

.top-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-controls {
  display: flex;
  align-items: center;
}

.config-combo-frame {
  display: flex;
  align-items: center;
}

.config-combo-frame label {
  margin-right: 10px;
  white-space: nowrap;
  font-weight: 500;
}

.config-edit-combo {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 250px;
  background-color: var(--content-bg);
  color: var(--text-primary);
  font-size: 14px;
}

.right-controls {
  display: flex;
  align-items: center;
}

.button-frame {
  display: flex;
  gap: 10px;
}

/* Shared Parameters Section */
.shared-params-section {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  background-color: var(--sidebar-bg);
}

.shared-params-section h2 {
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--text-primary);
}

.shared-params-container {
  background-color: var(--content-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 15px;
}

.shared-params-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.params-column {
  flex: 1;
  min-width: 300px;
}

.param-group {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.param-group label {
  width: 140px;
  margin-right: 10px;
}

.number-input {
  width: 80px;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--content-bg);
  color: var(--text-primary);
}

.switch-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request-selection-container {
  margin-top: 15px;
}

.request-selection-frame {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--sidebar-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.request-selection-frame label {
  margin-right: 10px;
  font-weight: 500;
}

.request-type-combo {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--content-bg);
  color: var(--text-primary);
}

/* Content area */
.config-content {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
  background-color: var(--sidebar-bg);
}

/* Tabs */
.tabs {
  display: flex;
  background-color: var(--sidebar-bg);
  border-bottom: 1px solid var(--border-color);
}

.tab {
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  font-weight: 500;
  color: var(--text-secondary);
}

.tab:hover {
  color: var(--text-primary);
  background-color: var(--hover-bg);
}

.tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background-color: rgba(var(--primary-rgb), 0.05);
}

.tab-content {
  padding: 20px;
}

.tab-pane {
  width: 100%;
}

/* Request Info Frame */
.request-info-frame {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: var(--content-bg);
}

.request-info-frame h3 {
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--text-primary);
}

.url-frame {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.url-frame label {
  width: 80px;
  font-weight: 500;
}

.request-url-input {
  flex-grow: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--content-bg);
  color: var(--text-primary);
}

.method-frame {
  display: flex;
  gap: 20px;
}

.method-group, .timeout-group {
  display: flex;
  align-items: center;
}

.method-group label, .timeout-group label {
  margin-right: 10px;
  font-weight: 500;
}

.method-group select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--content-bg);
  color: var(--text-primary);
  min-width: 100px;
}

/* Headers Tab */
.header-control-frame {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.copy-headers-btn {
  background-color: var(--accent-color);
  color: white;
}

.header-page-combo {
  width: 60px;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--content-bg);
  color: var(--text-primary);
}

.headers-entries-frame {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--content-bg);
}

.header-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.delete-btn {
  background-color: var(--error-color);
  color: white;
  border: none;
  border-radius: 4px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.header-key {
  flex-basis: 30%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--content-bg);
  color: var(--text-primary);
}

.header-value {
  flex-basis: 70%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--content-bg);
  color: var(--text-primary);
}

/* Request Body */
.request-body-frame {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  background-color: var(--content-bg);
}

.body-label-frame {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.body-label-frame label {
  font-weight: 500;
  margin-right: 15px;
}

.body-help-label {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: 12px;
}

.request-body-text {
  width: 100%;
  height: 200px;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--sidebar-bg);
  color: var(--text-primary);
  resize: vertical;
}

.no-body-message {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  background-color: var(--content-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

/* Response Processing */
.json-path-frame {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 15px;
  margin-bottom: 15px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--content-bg);
}

.json-path-frame label {
  width: 90px;
  font-weight: 500;
}

.json-path-frame input {
  flex-grow: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--content-bg);
  color: var(--text-primary);
  margin-right: 15px;
}

.parse-label {
  width: 90px !important;
  margin-top: 10px;
}

.conditions-frame {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  background-color: var(--content-bg);
}

.conditions-frame h3 {
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--text-primary);
}

.condition-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.condition-row label {
  width: 100px;
  font-weight: 500;
}

.condition-row input {
  flex-grow: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--content-bg);
  color: var(--text-primary);
}

/* Bottom Controls */
.bottom-controls {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  gap: 20px;
}

/* Switch */
.switch-container {
  display: flex;
  align-items: center;
}

.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  margin-right: 10px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.switch-label {
  color: var(--text-primary);
  font-size: 14px;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  max-width: 800px;
  max-height: 90vh;
  background-color: var(--content-bg);
  border-radius: 8px;
  box-shadow: var(--shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background-color: var(--sidebar-bg);
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex-grow: 1;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  background-color: var(--hover-bg);
  color: var(--text-primary);
}

.btn:hover {
  opacity: 0.9;
}

.btn.secondary {
  background-color: var(--text-secondary);
  color: white;
}

.btn.danger {
  background-color: var(--error-color);
  color: white;
}

.btn.accent {
  background-color: var(--primary-color);
  color: white;
}

.save-button {
  padding: 10px 20px;
  font-size: 15px;
}

/* Notification */
.notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 6px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
  color: white;
  font-weight: 500;
  z-index: 1100;
  animation: slideIn 0.3s ease-out;
}

.notification.success {
  background-color: var(--success-color, #4caf50);
}

.notification.error {
  background-color: var(--error-color, #f44336);
}

@keyframes slideIn {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .top-controls {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .right-controls {
    margin-top: 15px;
    width: 100%;
  }
  
  .button-frame {
    flex-wrap: wrap;
    width: 100%;
  }
  
  .shared-params-grid {
    flex-direction: column;
  }
  
  .method-frame {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .json-path-frame {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .json-path-frame label,
  .json-path-frame input {
    width: 100%;
    margin: 5px 0;
  }
  
  .bottom-controls {
    flex-direction: column;
  }
}
</style>