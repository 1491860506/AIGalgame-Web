<template>
  <div class="llm-config-page">
    <!-- Title Section -->
    <div class="page-header-section">
      <h1 class="page-title">
        <font-awesome-icon :icon="['fas', 'brain']" /> 大语言模型配置
      </h1>
      <p class="page-subtitle">管理您的大语言模型 (LLM) 连接和参数设置。</p>
      <div class="separator"></div>
    </div>

    <!-- Content Area -->
    <div class="config-content-area">

      <!-- Configuration Management Panel -->
      <div class="panel card config-management-panel">
        <h2 class="panel-title">配置管理</h2>
        <div class="config-actions">
          <div class="form-group config-select-group">
            <label for="config-select" class="input-label">选择或新增配置:</label>
            <select
              id="config-select"
              v-model="selectedConfig"
              class="select config-dropdown"
              @change="onConfigSelect"
            >
              <option value="" disabled>-- 选择一个配置 --</option>
              <option v-for="name in configNames" :key="name" :value="name">{{ name }}</option>
              <option v-if="configNames.length === 0" value="" disabled>暂无配置</option>
            </select>
          </div>
          <div class="button-row config-crud-buttons">
            <button class="btn btn-primary btn-sm" @click="addLLMConfig" title="新增一个空白配置">
              <font-awesome-icon :icon="['fas', 'plus']" /> 新增
            </button>
            <button class="btn btn-outline btn-sm" @click="copyLLMConfig" :disabled="!selectedConfig" title="复制当前选中的配置">
              <font-awesome-icon :icon="['fas', 'copy']" /> 复制
            </button>
            <button class="btn btn-danger btn-sm" @click="deleteLLMConfig" :disabled="!canDeleteConfig" title="删除当前选中的配置 (至少保留一个)">
              <font-awesome-icon :icon="['fas', 'trash-alt']" /> 删除
            </button>
          </div>
        </div>
         <div class="integration-section">
             <button class="btn btn-secondary" @click="openIntegrationWindow" title="通过第三方API导入模型配置">
              <font-awesome-icon :icon="['fas', 'cloud-arrow-down']" /> 接入模型配置
            </button>
         </div>
      </div>

      <!-- Configuration Details Panel -->
      <div class="panel card config-details-panel">
         <p v-if="!selectedConfig" class="info-message large-info">← 请先在左侧选择或新增一个配置。</p>
         <div v-else class="config-details-content">
            <div class="tab-headers">
              <button
                class="tab-header"
                :class="{ active: activeTab === 'basic' }"
                @click="activeTab = 'basic'"
              >
                 <font-awesome-icon :icon="['fas', 'link']" /> 基本连接信息
              </button>
              <button
                class="tab-header"
                :class="{ active: activeTab === 'model' }"
                @click="activeTab = 'model'"
              >
                 <font-awesome-icon :icon="['fas', 'sliders']" /> 模型参数设置
              </button>
            </div>

            <!-- Basic Connection Tab -->
            <div class="tab-content" v-show="activeTab === 'basic'">
                <div class="form-section">
                    <div class="form-group">
                      <label for="model-baseurl" class="input-label tooltip-container">
                        模型 BaseURL:
                        <span class="tooltip-text">LLM API 的基础URL，例如 OpenAI 或兼容 API 的地址。</span>
                      </label>
                      <input
                        id="model-baseurl"
                        type="text"
                        v-model="modelBaseUrl"
                        class="input"
                        placeholder="例如: https://api.openai.com/v1"
                      />
                    </div>
                    <div class="form-group">
                      <label for="api-key" class="input-label tooltip-container">
                        API Key:
                         <span class="tooltip-text">访问 LLM API 所需的密钥。请妥善保管。</span>
                      </label>
                      <div class="api-key-container input-group">
                        <input
                          id="api-key"
                          :type="showApiKey ? 'text' : 'password'"
                          v-model="apiKey"
                          class="input api-key-input"
                          placeholder="输入您的API密钥"
                        />
                        <!-- Updated Label for Show/Hide API Key -->
                        <label class="show-key-toggle-label">
                          <input type="checkbox" v-model="showApiKey" class="checkbox-input visually-hidden" />
                          <font-awesome-icon :icon="['fas', showApiKey ? 'eye-slash' : 'eye']" />
                          <span>{{ showApiKey ? '隐藏密钥' : '显示密钥' }}</span>
                        </label>
                      </div>
                    </div>
                    <div class="form-actions">
                      <button class="btn btn-primary" @click="saveLLMConfig">
                        <font-awesome-icon :icon="['fas', 'save']" /> 保存基本配置
                      </button>
                    </div>
                </div>
            </div>

            <!-- Model Parameters Tab -->
            <div class="tab-content" v-show="activeTab === 'model'">
                <div class="form-section">
                    <!-- Model Management Section -->
                    <div class="model-section">
                      <h3 class="section-title">模型管理</h3>
                      <div class="model-actions">
                          <div class="form-group model-select-group">
                            <label for="model-select" class="input-label">选择模型:</label>
                            <select
                              id="model-select"
                              v-model="selectedModel"
                              class="select model-dropdown"
                              @change="onModelSelect"
                              :disabled="modelNames.length === 0"
                            >
                              <option value="" disabled>-- 选择一个模型 --</option>
                              <option v-for="name in modelNames" :key="name" :value="name">{{ name }}</option>
                              <option v-if="modelNames.length === 0" value="" disabled>暂无模型</option>
                            </select>
                          </div>
                           <div class="button-row model-crud-buttons">
                              <button class="btn btn-primary btn-sm" @click="addLLMModel" title="新增一个空白模型到当前配置">
                                <font-awesome-icon :icon="['fas', 'plus']" /> 新增模型
                              </button>
                              <button class="btn btn-danger btn-sm" @click="deleteLLMModel" :disabled="!selectedModel" title="删除当前选中的模型">
                                <font-awesome-icon :icon="['fas', 'trash-alt']" /> 删除模型
                              </button>
                          </div>
                       </div>
                       <div class="model-fetch-test-buttons button-row">
                            <button class="btn btn-outline btn-sm" @click="getModelsFromServer" :disabled="!modelBaseUrl || !apiKey" title="从当前 BaseURL 获取模型列表并导入">
                                <font-awesome-icon :icon="['fas', 'cloud-download']" /> 从服务器获取
                            </button>
                            <button class="btn btn-info btn-sm" @click="testLLMModel" :disabled="!selectedModel || !modelBaseUrl || !apiKey" title="测试当前选中的模型是否可用">
                                <font-awesome-icon :icon="['fas', 'circle-check']" /> 测试模型
                            </button>
                       </div>
                    </div>

                    <!-- Model Parameters Section -->
                    <div class="params-section">
                      <h3 class="section-title">模型参数</h3>
                       <p v-if="!selectedModel" class="info-message">← 请先在上方选择或新增一个模型。</p>
                       <div v-else class="params-grid">
                            <!-- Removed tooltips from labels below -->
                            <div class="param-cell form-group">
                              <label for="model-retry" class="input-label">最大尝试次数:</label>
                              <input
                                id="model-retry"
                                type="number"
                                v-model="modelRetry"
                                class="input param-input"
                                min="1"
                                placeholder="例如: 3"
                              />
                            </div>
                            <div class="param-cell form-group">
                              <label for="temperature" class="input-label">Temperature:</label>
                              <input
                                id="temperature"
                                type="number"
                                v-model="temperature"
                                class="input param-input"
                                min="0"
                                max="2"
                                step="0.01"
                                placeholder="0.0 - 2.0"
                              />
                            </div>
                            <div class="param-cell form-group">
                              <label for="top-p" class="input-label">Top P:</label>
                              <input
                                id="top-p"
                                type="number"
                                v-model="topP"
                                class="input param-input"
                                min="0"
                                max="1"
                                step="0.01"
                                 placeholder="0.0 - 1.0"
                              />
                            </div>
                            <div class="param-cell form-group">
                              <label for="freq-penalty" class="input-label">Frequency Penalty:</label>
                              <input
                                id="freq-penalty"
                                type="number"
                                v-model="frequencyPenalty"
                                class="input param-input"
                                min="-2"
                                max="2"
                                step="0.01"
                                placeholder="-2.0 - 2.0"
                              />
                            </div>
                            <div class="param-cell form-group">
                              <label for="pres-penalty" class="input-label">Presence Penalty:</label>
                              <input
                                id="pres-penalty"
                                type="number"
                                v-model="presencePenalty"
                                class="input param-input"
                                min="-2"
                                max="2"
                                step="0.01"
                                 placeholder="-2.0 - 2.0"
                              />
                            </div>
                            <div class="param-cell form-group">
                              <label for="max-tokens" class="input-label">Max Tokens:</label>
                              <input
                                id="max-tokens"
                                type="number"
                                v-model="maxTokens"
                                class="input param-input"
                                min="1"
                                 placeholder="例如: 1000"
                              />
                            </div>
                        </div>
                       <div v-if="selectedModel" class="form-actions">
                        <button class="btn btn-primary" @click="saveModelConfig">
                          <font-awesome-icon :icon="['fas', 'save']" /> 保存模型参数
                        </button>
                      </div>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </div>


    <!-- Modals -->

    <!-- Model Integration Dialog -->
    <!-- Removed @click.self from the modal wrapper -->
    <div class="modal" v-if="showIntegrationModal">
      <div class="modal-content integration-modal-content card">
         <!-- LLMConfig_modelaccess component should have its own internal header/close -->
         <LLMConfig_modelaccess
          @close="closeIntegrationModal"
          @show-message="showMessageBubble"
        />
      </div>
    </div>

    <!-- Model Selection Dialog -->
    <!-- Kept @click.self here as we want click-outside to close this specific modal -->
    <div class="modal" v-if="showModelSelectionModal" @click.self="closeModelSelectionModal">
      <div class="modal-content model-selection-modal-content card">
        <div class="modal-header">
          <h3 class="modal-title">选择需要导入的模型 ({{ filteredModels.length }} 项)</h3>
          <button class="close-btn btn btn-text btn-sm" @click="closeModelSelectionModal" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="filter-section form-group">
            <label for="model-filter" class="input-label">筛选模型:</label>
            <div class="filter-input-group">
              <input
                id="model-filter"
                type="text"
                v-model="modelFilter"
                class="input filter-input"
                @keyup.enter="applyModelFilter"
                placeholder="输入关键词进行模糊筛选"
              />
              <button class="btn btn-outline" @click="applyModelFilter">
                <font-awesome-icon :icon="['fas', 'search']" /> 筛选
              </button>
            </div>
          </div>

          <div class="pagination-section form-group">
            <label for="page-select" class="input-label">选择页面:</label>
            <select v-model="currentPage" class="select page-dropdown">
              <option
                v-for="(label, index) in pageLabels"
                :key="index"
                :value="index"
              >{{ label }}</option>
            </select>
            <div class="page-buttons">
              <button
                class="btn btn-outline btn-sm"
                @click="prevPage"
                :disabled="currentPage === 0"
                 title="上一页"
              >
                <font-awesome-icon :icon="['fas', 'angle-left']" />
              </button>
              <button
                class="btn btn-outline btn-sm"
                @click="nextPage"
                :disabled="currentPage >= totalPages - 1"
                 title="下一页"
              >
                <font-awesome-icon :icon="['fas', 'angle-right']" />
              </button>
            </div>
          </div>

          <div class="model-list-container">
             <p v-if="paginatedModels.length === 0 && filteredModels.length > 0" class="info-message">当前页没有模型。</p>
             <p v-else-if="paginatedModels.length === 0 && filteredModels.length === 0 && allModels.length > 0" class="info-message">没有匹配筛选条件的模型。</p>
              <p v-else-if="allModels.length === 0" class="info-message">请先从服务器获取模型列表。</p>
            <div class="model-list">
              <div
                v-for="(model, index) in paginatedModels"
                :key="index"
                class="model-item checkbox-group"
              >
                 <!-- Modified label - removed input and custom-checkbox -->
                <label class="model-checkbox checkbox-label1"
                       :class="{ selected: modelSelections[model] }"
                       @click="toggleModelSelection(model)">
                   <!-- Removed input type="checkbox" and span.custom-checkbox -->
                   <!-- Text span remains -->
                  <span class="model-name-text" :title="model">{{ truncateText(model) }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="selection-actions button-row">
             <!-- Updated button icons -->
            <button class="btn btn-outline btn-sm" @click="selectAllModels">
                <font-awesome-icon :icon="['fas', 'check']" /> 全选当前页
            </button>
            <button class="btn btn-outline btn-sm" @click="deselectAllModels">
                <font-awesome-icon :icon="['fas', 'xmark']" /> 取消全选当前页
            </button>
          </div>
        </div>
        <div class="modal-footer">
           <!-- Updated button icons -->
          <button class="btn btn-secondary" @click="closeModelSelectionModal">
             <font-awesome-icon :icon="['fas', 'xmark']" /> 取消
          </button>
          <button class="btn btn-primary" @click="confirmModelSelection">
             <font-awesome-icon :icon="['fas', 'check']" /> 确定导入
          </button>
        </div>
      </div>
    </div>

    <!-- Input Dialog -->
     <div class="modal" v-if="showInputDialog" @click.self="closeInputDialog">
      <div class="modal-content input-dialog-content card">
         <div class="modal-header">
            <h3 class="modal-title">{{ inputDialogTitle }}</h3>
             <button class="close-btn btn btn-text btn-sm" @click="closeInputDialog" title="关闭">
               <font-awesome-icon :icon="['fas', 'times']" />
            </button>
         </div>
         <div class="modal-body">
            <div class="form-group">
              <label for="input-dialog-value" class="input-label">请输入名称:</label>
               <input
                  id="input-dialog-value"
                  type="text"
                  v-model="inputDialogValue"
                  class="input"
                  @keyup.enter="confirmInputDialog"
                  ref="inputDialogInput"
                  placeholder="例如: My New Config"
                />
            </div>
         </div>
        <div class="modal-footer">
           <!-- Updated button icons -->
          <button class="btn btn-secondary" @click="closeInputDialog">
             <font-awesome-icon :icon="['fas', 'xmark']" /> 取消
          </button>
          <button class="btn btn-primary" @click="confirmInputDialog">
             <font-awesome-icon :icon="['fas', 'check']" /> 确定
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
// Script section remains the same as in the previous response
// No changes needed in the JavaScript logic based on the new requirements.
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
      inputDialogCallback: null, // Function to call when dialog confirmed

      // Configuration Selection
      configNames: [],
      selectedConfig: '',

      // Basic Connection Info
      modelBaseUrl: '',
      apiKey: '',

      // Model Selection
      models: [], // Array of model objects with params
      modelNames: [], // Array of just model names for dropdown
      selectedModel: '', // Currently selected model name in the dropdown
      currentModelName: '', // Model name whose parameters are currently loaded in the form

      // Model Parameters
      modelRetry: '3',
      temperature: '',
      topP: '',
      frequencyPenalty: '',
      presencePenalty: '',
      maxTokens: '',

      // Model Selection Dialog
      allModels: [], // Full list of models fetched from server
      filteredModels: [], // Models filtered by user input
      modelSelections: {}, // Object to track checkbox selections { modelName: boolean }
      modelFilter: '', // User input for filtering
      pageSize: 36, // Number of models per page in the dialog
      currentPage: 0, // Current page index (0-based)
      totalPages: 1, // Total number of pages
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
      const totalItems = this.filteredModels.length;
      const totalPages = this.totalPages;

      if (totalItems === 0) {
          return ['无模型'];
      }

      for (let i = 0; i < totalPages; i++) {
        const start = i * this.pageSize;
        const end = Math.min(start + this.pageSize, totalItems);

        if (start < end) {
          const firstModel = this.filteredModels[start];
          const lastModel = this.filteredModels[end - 1];
          const firstChar = firstModel && typeof firstModel === 'string' && firstModel.length > 0 ? firstModel[0] : '?';
          const lastChar = lastModel && typeof lastModel === 'string' && lastModel.length > 0 ? lastModel[0] : '?';

          labels.push(`第 ${i + 1} 页 (${firstChar}-${lastChar}) [${end - start}项]`);
        } else {
          labels.push(`第 ${i + 1} 页 (空页) [0项]`);
        }
      }

      return labels;
    },
     // Disable delete button if only one config exists
     canDeleteConfig() {
         return this.selectedConfig && this.configNames.length > 1;
     }
  },
  watch: {
      showInputDialog(newValue) {
          if (newValue) {
              this.$nextTick(() => {
                  this.$refs.inputDialogInput?.focus();
              });
          }
      },
       filteredModels() {
           this.updateTotalPages();
           this.$nextTick(() => {
              if (this.currentPage >= this.totalPages) {
                  this.currentPage = Math.max(0, this.totalPages - 1);
              }
           });
       }
  },
   beforeUnmount() {
       if (this.selectedConfig && this.currentModelName) {
          try {
              this.saveModelConfig(false);
              console.log(`Unsaved parameters for model "${this.currentModelName}" in config "${this.selectedConfig}" saved before leaving.`);
          } catch (e) {
              console.error(`Failed to auto-save model "${this.currentModelName}" before leaving:`, e);
          }
       }
   },
  mounted() {
    this.loadConfig();
  },
  methods: {
    // --- All methods (loadConfig, loadConfigValues, saveLLMConfig, etc.) ---
    // --- remain exactly the same as in the previous response ---
    // Config Management
    loadConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.模型 || !config.模型.configs) {
          config.模型 = { configs: {} };
           if (Object.keys(config.模型.configs).length === 0) {
               config.模型.configs['默认配置'] = {
                   model_baseurl: '',
                   api_key: '',
                   models: [{ name: 'gpt-4o', max_retry: '3' }]
               };
           }
           localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        } else if (Object.keys(config.模型.configs).length === 0) {
              config.模型.configs['默认配置'] = {
                   model_baseurl: '',
                   api_key: '',
                   models: [{ name: 'gpt-4o', max_retry: '3' }]
               };
             localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        }

        this.configNames = Object.keys(config.模型.configs).sort((a, b) => a.localeCompare(b));
         const mainConfig = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
         const savedSelectedConfig = mainConfig?.剧情?.llm_config_name;
         if (savedSelectedConfig && this.configNames.includes(savedSelectedConfig)) {
             this.selectedConfig = savedSelectedConfig;
         } else if (this.configNames.length > 0) {
             this.selectedConfig = this.configNames[0];
         } else {
            this.selectedConfig = '';
         }

        if (this.selectedConfig) {
          this.loadConfigValues(this.selectedConfig);
        } else {
             this.selectedConfig = '';
             this.clearConfigValues();
             this.clearModelValues();
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
        this.showMessageBubble('error', '加载配置失败，已重置为默认配置');
         localStorage.removeItem('aiGalgameConfig');
         this.loadConfig();
      }
    },
    loadConfigValues(configName) {
      try {
         if (this.selectedConfig && this.currentModelName && this.selectedConfig !== configName) {
               this.saveModelConfig();
         }

        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        const configData = config.模型.configs[configName] || {};

        this.modelBaseUrl = configData.model_baseurl || '';
        this.apiKey = configData.api_key || '';
        this.models = JSON.parse(JSON.stringify(configData.models || []));
        this.modelNames = this.models.map(model => model.name);

        const savedModelName = configData.selected_model_name;
        if (savedModelName && this.modelNames.includes(savedModelName)) {
             this.selectedModel = savedModelName;
        } else if (this.modelNames.length > 0) {
          this.selectedModel = this.modelNames[0];
        } else {
          this.selectedModel = '';
          this.clearModelValues();
        }
        this.loadModelValues(this.selectedModel);

        const mainConfig = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!mainConfig.剧情) mainConfig.剧情 = {};
        mainConfig.剧情.llm_config_name = configName;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(mainConfig));

      } catch (error) {
        console.error('Failed to load config values:', error);
        this.showMessageBubble('error', '加载配置详情失败');
        this.clearConfigValues();
        this.clearModelValues();
      }
    },
    saveLLMConfig() {
      try {
        if (!this.selectedConfig) {
          this.showMessageBubble('error', '没有选中的配置可保存');
          return;
        }
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.模型 || !config.模型.configs || !config.模型.configs[this.selectedConfig]) {
             this.showMessageBubble('error', '当前配置不存在或结构无效，无法保存');
             console.error("Attempted to save config that doesn't exist in localStorage:", this.selectedConfig);
            return;
        }
        config.模型.configs[this.selectedConfig].model_baseurl = this.modelBaseUrl.trim();
        config.模型.configs[this.selectedConfig].api_key = this.apiKey;
        config.模型.configs[this.selectedConfig].selected_model_name = this.selectedModel;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        this.showMessageBubble('success', '成功保存基本连接配置！');
      } catch (error) {
        console.error('Failed to save basic config:', error);
        this.showMessageBubble('error', '保存基本连接配置失败');
      }
    },
    onConfigSelect() {
       this.loadConfigValues(this.selectedConfig);
    },
    addLLMConfig() {
      this.showInputDialogPrompt('新增配置', '请输入新的配置名称')
         .then(newConfigName => {
             if (!newConfigName) {
                 if (newConfigName === '') this.showMessageBubble('error', '配置名称不能为空');
                 return;
             }
             newConfigName = newConfigName.trim();
             try {
                 const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
                 if (!config.模型 || !config.模型.configs) {
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
                 this.configNames.sort((a, b) => a.localeCompare(b));
                 this.selectedConfig = newConfigName;
                 this.loadConfigValues(newConfigName);
                 this.showMessageBubble('success', `配置 "${newConfigName}" 已创建`);
             } catch (error) {
                 console.error('Failed to add config:', error);
                 this.showMessageBubble('error', '创建配置失败');
             }
         })
         .catch(() => { /* User cancelled input dialog */ });
    },
    copyLLMConfig() {
      if (!this.selectedConfig) {
        this.showMessageBubble('warning', '请选择要复制的配置');
        return;
      }
       this.showInputDialogPrompt(`复制配置 "${this.selectedConfig}"`, '请输入新配置的名称', `${this.selectedConfig}_复制`)
          .then(newConfigName => {
               if (!newConfigName) {
                   if (newConfigName === '') this.showMessageBubble('error', '配置名称不能为空');
                   return;
               }
              newConfigName = newConfigName.trim();
               if (newConfigName === this.selectedConfig) {
                  this.showMessageBubble('warning', '新配置名称不能与原配置相同');
                  return;
              }
              try {
                 const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
                  if (!config.模型?.configs?.[this.selectedConfig]) {
                       this.showMessageBubble('error', '原配置不存在，无法复制');
                       console.error("Attempted to copy non-existent config:", this.selectedConfig);
                       this.loadConfig();
                      return;
                  }
                  if (config.模型.configs[newConfigName]) {
                      this.showMessageBubble('error', `配置名称 "${newConfigName}" 已存在`);
                      return;
                  }
                 const sourceConfigData = config.模型.configs[this.selectedConfig];
                 config.模型.configs[newConfigName] = JSON.parse(JSON.stringify(sourceConfigData));
                 localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
                 this.configNames.push(newConfigName);
                 this.configNames.sort((a, b) => a.localeCompare(b));
                 this.selectedConfig = newConfigName;
                 this.loadConfigValues(newConfigName);
                 this.showMessageBubble('success', `配置 "${newConfigName}" 已复制`);
             } catch (error) {
                 console.error('Failed to copy config:', error);
                 this.showMessageBubble('error', '复制配置失败');
             }
          })
           .catch(() => { /* User cancelled */ });
    },
    deleteLLMConfig() {
      if (!this.selectedConfig) {
        this.showMessageBubble('warning', '请选择要删除的配置');
        return;
      }
      if (this.configNames.length <= 1) {
           this.showMessageBubble('warning', '不能删除最后一个配置');
           return;
      }
      if (!confirm(`确定要删除配置 "${this.selectedConfig}" 吗？\n删除后不可恢复！`)) {
        return;
      }
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
         if (!config.模型?.configs?.[this.selectedConfig]) {
             this.showMessageBubble('error', '配置已不存在');
             console.error("Attempted to delete non-existent config:", this.selectedConfig);
             this.loadConfig();
             return;
         }
        delete config.模型.configs[this.selectedConfig];
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        const deletedConfigName = this.selectedConfig;
        const index = this.configNames.indexOf(deletedConfigName);
        if (index > -1) {
            this.configNames.splice(index, 1);
        }
        if (this.configNames.length > 0) {
          this.selectedConfig = this.configNames[0];
          this.loadConfigValues(this.selectedConfig);
        } else {
            this.selectedConfig = '';
            this.clearConfigValues();
            this.clearModelValues();
        }
         const mainConfig = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
         if (mainConfig?.剧情?.llm_config_name === deletedConfigName) {
              mainConfig.剧情.llm_config_name = this.selectedConfig || '';
              localStorage.setItem('aiGalgameConfig', JSON.stringify(mainConfig));
         }
        this.showMessageBubble('success', `配置 "${deletedConfigName}" 已删除`);
      } catch (error) {
        console.error('Failed to delete config:', error);
        this.showMessageBubble('error', '删除配置失败');
        this.loadConfig();
      }
    },
    clearConfigValues() {
      this.modelBaseUrl = '';
      this.apiKey = '';
      this.models = [];
      this.modelNames = [];
      this.selectedModel = '';
      this.clearModelValues();
    },
    // Model Management
    loadModelValues(modelName) {
      this.currentModelName = modelName;
      const model = this.models.find(m => m.name === modelName);
      if (model) {
        this.modelRetry = model.max_retry !== undefined && model.max_retry !== null ? String(model.max_retry) : '3';
        this.temperature = model.temperature !== undefined && model.temperature !== null ? String(model.temperature) : '';
        this.topP = model.top_p !== undefined && model.top_p !== null ? String(model.top_p) : '';
        this.frequencyPenalty = model.frequency_penalty !== undefined && model.frequency_penalty !== null ? String(model.frequency_penalty) : '';
        this.presencePenalty = model.presence_penalty !== undefined && model.presence_penalty !== null ? String(model.presence_penalty) : '';
        this.maxTokens = model.max_tokens !== undefined && model.max_tokens !== null ? String(model.max_tokens) : '';
      } else {
        this.clearModelValues();
      }
    },
    saveModelConfig(notice=true) {
      if (!this.selectedConfig || !this.currentModelName) {
        return;
      }
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        const currentConfig = config.模型.configs[this.selectedConfig];
        if (!currentConfig) {
             console.error("Current config not found in localStorage when saving model", this.selectedConfig);
             this.showMessageBubble('error', '当前配置不存在，无法保存模型参数');
             return;
        }
        const models = currentConfig.models || [];
        const modelIndex = models.findIndex(m => m.name === this.currentModelName);
        if (modelIndex !== -1) {
          if (!models[modelIndex]) {
              models[modelIndex] = { name: this.currentModelName };
          }
          models[modelIndex].max_retry = this.modelRetry === '' ? '3' : String(this.modelRetry);
          models[modelIndex].temperature = this.temperature === '' ? undefined : Number(this.temperature);
          models[modelIndex].top_p = this.topP === '' ? undefined : Number(this.topP);
          models[modelIndex].frequency_penalty = this.frequencyPenalty === '' ? undefined : Number(this.frequencyPenalty);
          models[modelIndex].presence_penalty = this.presencePenalty === '' ? undefined : Number(this.presencePenalty);
          models[modelIndex].max_tokens = this.maxTokens === '' ? undefined : Number(this.maxTokens);
          currentConfig.models = models;
        } else {
           console.warn(`Model "${this.currentModelName}" not found in config "${this.selectedConfig}" during parameter save.`);
            this.showMessageBubble('error', `模型 "${this.currentModelName}" 未找到，无法保存参数`);
           return;
        }
        currentConfig.selected_model_name = this.currentModelName;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        const localModelIndex = this.models.findIndex(m => m.name === this.currentModelName);
         if(localModelIndex !== -1) {
             this.models[localModelIndex].max_retry = this.modelRetry === '' ? '3' : String(this.modelRetry);
             this.models[localModelIndex].temperature = this.temperature === '' ? undefined : Number(this.temperature);
             this.models[localModelIndex].top_p = this.topP === '' ? undefined : Number(this.topP);
             this.models[localModelIndex].frequency_penalty = this.frequencyPenalty === '' ? undefined : Number(this.frequencyPenalty);
             this.models[localModelIndex].presence_penalty = this.presencePenalty === '' ? undefined : Number(this.presencePenalty);
             this.models[localModelIndex].max_tokens = this.maxTokens === '' ? undefined : Number(this.maxTokens);
         } else {
            console.warn(`Model "${this.currentModelName}" not found in component's local models array after saving.`);
             this.loadConfigValues(this.selectedConfig);
         }
         if(notice!==false){
        this.showMessageBubble('success', `模型 "${this.currentModelName}" 参数已保存`);}
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
        this.showMessageBubble('warning', '请先选择一个配置');
        return;
      }
      this.showInputDialogPrompt('新增模型', '请输入新模型的名称')
         .then(newModelName => {
             if (!newModelName) {
                 if (newModelName === '') this.showMessageBubble('error', '模型名称不能为空');
                 return;
             }
             newModelName = newModelName.trim();
             if (this.modelNames.includes(newModelName)) {
                 this.showMessageBubble('error', `模型名称 "${newModelName}" 已存在于当前配置`);
                 return;
             }
             try {
                 const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
                 const currentConfig = config.模型.configs[this.selectedConfig];
                 if (!currentConfig) {
                     console.error("Current config not found during add model confirmation", this.selectedConfig);
                     this.showMessageBubble('error', '当前配置不存在，无法新增模型');
                     return;
                 }
                 if (this.selectedModel && this.currentModelName) {
                     this.saveModelConfig();
                 }
                 const newModel = {
                     name: newModelName,
                     max_retry: '3',
                 };
                 currentConfig.models.push(newModel);
                 currentConfig.models.sort((a, b) => a.name.localeCompare(b.name));
                 currentConfig.selected_model_name = newModelName;
                 localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
                 this.models.push(newModel);
                 this.models.sort((a, b) => a.name.localeCompare(b.name));
                 this.modelNames = this.models.map(m => m.name);
                 this.selectedModel = newModelName;
                 this.loadModelValues(newModelName);
                 this.showMessageBubble('success', `模型 "${newModelName}" 已添加`);
             } catch (error) {
                 console.error('Failed to add model:', error);
                 this.showMessageBubble('error', '添加模型失败');
             }
         })
         .catch(() => { /* User cancelled */ });
    },
    deleteLLMModel() {
      if (!this.selectedConfig) {
        this.showMessageBubble('warning', '请先选择一个配置');
        return;
      }
      if (!this.selectedModel) {
        this.showMessageBubble('warning', '请选择要删除的模型');
        return;
      }
      if (!confirm(`确定要删除模型 "${this.selectedModel}" 吗？\n删除后不可恢复！`)) {
        return;
      }
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        const currentConfig = config.模型.configs[this.selectedConfig];
         if (!currentConfig) {
             console.error("Current config not found during delete model", this.selectedConfig);
             this.showMessageBubble('error', '当前配置不存在，无法删除模型');
             return;
         }
        const models = currentConfig.models || [];
        const modelIndex = models.findIndex(m => m.name === this.selectedModel);
        const deletedModelName = this.selectedModel;
        if (modelIndex !== -1) {
          models.splice(modelIndex, 1);
          currentConfig.models = models;
           localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        } else {
            console.warn(`Model "${this.selectedModel}" not found in config "${this.selectedConfig}" during deletion attempt.`);
            this.showMessageBubble('error', `模型 "${this.selectedModel}" 未找到，可能已被删除`);
        }
        const index = this.modelNames.indexOf(deletedModelName);
        if (index > -1) {
            this.models.splice(index, 1);
            this.modelNames.splice(index, 1);
        }
        if (this.modelNames.length > 0) {
           const nextSelectedIndex = Math.min(index, this.modelNames.length - 1);
          this.selectedModel = this.modelNames[Math.max(0, nextSelectedIndex)];
          this.loadModelValues(this.selectedModel);
        } else {
          this.selectedModel = '';
          this.clearModelValues();
        }
         currentConfig.selected_model_name = this.selectedModel || '';
         localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        this.showMessageBubble('success', `模型 "${deletedModelName}" 已删除`);
      } catch (error) {
        console.error('Failed to delete model:', error);
        this.showMessageBubble('error', '删除模型失败');
         this.loadConfigValues(this.selectedConfig);
      }
    },
    clearModelValues() {
      this.currentModelName = '';
      this.modelRetry = '3';
      this.temperature = '';
      this.topP = '';
      this.frequencyPenalty = '';
      this.presencePenalty = '';
      this.maxTokens = '';
    },
    // Model Integration Modal
    openIntegrationWindow() {
      this.showIntegrationModal = true;
    },
    closeIntegrationModal() {
      this.showIntegrationModal = false;
      this.loadConfig();
    },
    // Input Dialog (Promise-based helper)
    showInputDialogPrompt(title, message, defaultValue = '') {
        return new Promise((resolve, reject) => {
            this.inputDialogTitle = title;
            this.inputDialogValue = defaultValue;
            this.showInputDialog = true;
            this.inputDialogCallback = (confirmed) => {
                this.showInputDialog = false;
                if (confirmed) {
                    resolve(this.inputDialogValue);
                } else {
                    resolve(null);
                }
                this.inputDialogCallback = null;
            };
        });
    },
    confirmInputDialog() {
       if (this.inputDialogCallback) {
           this.inputDialogCallback(true);
       }
    },
    closeInputDialog() {
         if (this.inputDialogCallback) {
           this.inputDialogCallback(false);
       }
    },
    // Model Fetching
    getModelsFromServer() {
      if (!this.selectedConfig) {
           this.showMessageBubble('warning', '请先选择一个配置');
           return;
      }
      if (!this.modelBaseUrl.trim() || !this.apiKey) {
        this.showMessageBubble('error', '请先填写模型BaseURL和API Key');
        return;
      }
      this.showMessageBubble('info', '正在从服务器获取模型列表...');
      this.fetchModelsFromServer(this.modelBaseUrl.trim(), this.apiKey)
        .then(models => {
          this.allModels = models;
          this.applyModelFilter();
          this.modelSelections = {};
          this.allModels.forEach(model => {
            this.modelSelections[model] = this.modelNames.includes(model);
          });
          this.showModelSelectionModal = true;
          this.showMessageBubble('success', `获取到 ${this.allModels.length} 个模型`);
        })
        .catch(error => {
          console.error('Failed to fetch models:', error);
          let errorMessage = '获取模型列表失败';
           if (error instanceof Error && error.message) {
               errorMessage += ': ' + error.message.replace(/fetch failed|Failed to fetch|network error/i, '网络或服务器错误').substring(0, 100);
           }
          this.showMessageBubble('error', errorMessage);
        });
    },
    async fetchModelsFromServer(baseUrl, apiKey) {
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 20000);
       try {
           const url = `${baseUrl.replace(/\/+$/, '')}/models`;
           const headers = {
               'Accept': 'application/json',
               'Authorization': apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
           };
           const response = await fetch(url, { headers, signal: controller.signal });
            if (!response.ok) {
               let errorDetail = `HTTP error! status: ${response.status}`;
               try {
                   const errorBody = await response.text();
                   console.error(`Fetch models failed: ${response.status} ${response.statusText}\nBody: ${errorBody}`);
                    try {
                       const errorJson = JSON.parse(errorBody);
                       if (errorJson.error && errorJson.error.message) {
                           throw new Error(`API Error: ${errorJson.error.message}`);
                       } else if (errorJson.message) {
                           throw new Error(`API Error: ${errorJson.message}`);
                       } else { throw new Error(`HTTP error! status: ${response.status}.`); }
                    } catch (parseError) { throw new Error(`HTTP error! status: ${response.status}.`); }
               } catch (readError) { throw new Error(`HTTP error! status: ${response.status}.`); }
            }
           const data = await response.json();
           if (data && Array.isArray(data.data)) {
               const models = data.data
                   .filter(item => item && item.id && typeof item.id === 'string')
                   .map(item => item.id);
               return models.sort((a, b) => {
                   const hasChineseA = /[\u4e00-\u9fa5]/.test(a);
                   const hasChineseB = /[\u4e00-\u9fa5]/.test(b);
                   if (hasChineseA && !hasChineseB) return -1;
                   if (!hasChineseA && hasChineseB) return 1;
                   return a.toLowerCase().localeCompare(b.toLowerCase(), undefined, { sensitivity: 'base' });
               });
           } else {
               console.warn("Unexpected response structure from models endpoint:", data);
               throw new Error("服务器返回格式异常");
           }
       } catch (error) {
           console.error('Error during fetchModelsFromServer:', error);
            if (error.name === 'AbortError') { throw new Error('请求超时'); }
           throw error;
       } finally {
           clearTimeout(timeoutId);
       }
    },
    // Model Selection Dialog
    applyModelFilter() {
      const filter = this.modelFilter.toLowerCase().trim();
      if (!filter) {
        this.filteredModels = [...this.allModels];
      } else {
        this.filteredModels = this.allModels.filter(model =>
          model.toLowerCase().includes(filter)
        );
      }
      this.currentPage = 0;
       this.showMessageBubble('info', `筛选结果: ${this.filteredModels.length} 项`);
    },
    updateTotalPages() {
        this.totalPages = Math.max(1, Math.ceil(this.filteredModels.length / this.pageSize));
    },
    prevPage() {
      if (this.currentPage > 0) {
        this.currentPage--;
         this.$nextTick(() => this.ensureModelSelectionsExistForCurrentPage());
      }
    },
    nextPage() {
      if (this.currentPage < this.totalPages - 1) {
        this.currentPage++;
         this.$nextTick(() => this.ensureModelSelectionsExistForCurrentPage());
      }
    },
     ensureModelSelectionsExistForCurrentPage() {
         this.paginatedModels.forEach(model => {
             if (this.modelSelections[model] === undefined) {
                 this.modelSelections[model] = this.modelNames.includes(model);
             }
         });
     },
          // New method to toggle selection on click
    toggleModelSelection(modelName) {
        // Use $forceUpdate to ensure the binding reactivity updates immediately if needed
        // Although Vue 3's reactivity is usually sufficient
        this.modelSelections[modelName] = !this.modelSelections[modelName];
        // If you need immediate visual feedback across the app, you might need
        // this.$forceUpdate(); // Use cautiously
    },
    selectAllModels() {
      const start = this.currentPage * this.pageSize;
      const end = Math.min(start + this.pageSize, this.filteredModels.length);
      let count = 0;
      for (let i = start; i < end; i++) {
        const model = this.filteredModels[i];
        if (this.modelSelections[model] !== true) {
             this.modelSelections[model] = true;
             count++;
        }
      }
       if (count > 0) { this.showMessageBubble('info', `已选中当前页的 ${count} 个模型`); }
       else { this.showMessageBubble('info', '当前页模型已全部选中'); }
    },
    deselectAllModels() {
      const start = this.currentPage * this.pageSize;
      const end = Math.min(start + this.pageSize, this.filteredModels.length);
       let count = 0;
      for (let i = start; i < end; i++) {
        const model = this.filteredModels[i];
         if (this.modelSelections[model] !== false) {
            this.modelSelections[model] = false;
            count++;
         }
      }
       if (count > 0) { this.showMessageBubble('info', `已取消选中当前页的 ${count} 个模型`); }
       else { this.showMessageBubble('info', '当前页模型已全部取消选中'); }
    },
    truncateText(text) {
      const maxLength = 45;
      if (typeof text !== 'string') return String(text);
      if (text.length > maxLength) { return text.substring(0, maxLength) + '...'; }
      return text;
    },
    confirmModelSelection() {
      if (!this.selectedConfig) {
           this.showMessageBubble('error', '没有选中的配置，无法导入模型');
           this.closeModelSelectionModal();
           return;
      }
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        const currentConfig = config.模型.configs[this.selectedConfig];
         if (!currentConfig) {
              console.error("Current config not found during model selection confirmation", this.selectedConfig);
              this.showMessageBubble('error', '当前配置不存在，无法导入模型');
              this.closeModelSelectionModal();
              return;
         }
        if (this.selectedModel && this.currentModelName) {
             const isCurrentModelKept = this.modelSelections[this.currentModelName] !== false;
             if (isCurrentModelKept) { this.saveModelConfig(false); }
        }
        const updatedModels = [];
        const selectedModelNames = [];
        let firstNewModelName = null;
        this.allModels.forEach(modelName => {
            const isSelected = this.modelSelections[modelName];
            if (isSelected) {
                const existingModel = this.models.find(m => m.name === modelName);
                if (existingModel) {
                     const localExisting = this.models.find(m => m.name === modelName);
                     if (localExisting) { updatedModels.push(localExisting); }
                     else {
                        console.warn(`Model "${modelName}" was marked selected but not found locally.`);
                         updatedModels.push({ name: modelName, max_retry: '3' });
                     }
                } else {
                     const newModel = { name: modelName, max_retry: '3' };
                     updatedModels.push(newModel);
                     if (!firstNewModelName) { firstNewModelName = modelName; }
                }
                 selectedModelNames.push(modelName);
            }
        });
         updatedModels.sort((a, b) => a.name.localeCompare(b.name));
        selectedModelNames.sort((a, b) => a.localeCompare(b));
        currentConfig.models = updatedModels;
         let nextSelectedModelName = '';
         if (this.selectedModel && selectedModelNames.includes(this.selectedModel)) {
              nextSelectedModelName = this.selectedModel;
         } else if (selectedModelNames.length > 0) {
              nextSelectedModelName = selectedModelNames[0];
         }
        currentConfig.selected_model_name = nextSelectedModelName || '';
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        this.models = updatedModels;
        this.modelNames = selectedModelNames;
        this.selectedModel = nextSelectedModelName;
        this.loadModelValues(this.selectedModel);
        this.closeModelSelectionModal();
        this.showMessageBubble('success', `模型列表已更新。导入/更新了 ${updatedModels.length} 个模型。`);
      } catch (error) {
        console.error('Failed to update models after selection:', error);
        this.showMessageBubble('error', '更新模型列表失败');
         this.loadConfig();
      }
    },
    closeModelSelectionModal() {
      this.showModelSelectionModal = false;
      this.modelFilter = '';
      this.currentPage = 0;
      this.allModels = [];
      this.filteredModels = [];
      this.modelSelections = {};
    },
    // Test Model
    testLLMModel() {
      if (!this.selectedConfig) { this.showMessageBubble('warning', '请先选择一个配置'); return; }
       if (!this.selectedModel) { this.showMessageBubble('warning', '请选择要测试的模型'); return; }
      if (!this.modelBaseUrl.trim() || !this.apiKey) { this.showMessageBubble('error', '请先填写模型BaseURL和API Key'); return; }
      this.showMessageBubble('info', `开始测试模型 "${this.selectedModel}"...`);
      if (this.currentModelName) { this.saveModelConfig(false); }
      this.testModel(this.modelBaseUrl.trim(), this.apiKey, this.selectedModel)
        .then(success => {
          if (success) { this.showMessageBubble('success', `模型 "${this.selectedModel}" 测试通过`); }
          else { this.showMessageBubble('error', `模型 "${this.selectedModel}" 测试不通过 (未知错误)`); }
        })
        .catch((error) => {
             console.error('Error during model test:', error);
             let errorMessage = `模型 "${this.selectedModel}" 测试失败`;
             if (error instanceof Error && error.message) { errorMessage += `: ${error.message}`; }
             else if (typeof error === 'string') { errorMessage += `: ${error}`; }
          this.showMessageBubble('error', errorMessage);
        });
    },
    async testModel(baseUrl, apiKey, modelName) {
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 20000);
       try {
           const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
           const headers = {
               'Accept': 'application/json',
               'Authorization': apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
               'Content-Type': 'application/json'
           };
           const data = {
               model: modelName,
               messages: [{ role: 'user', content: '你好，请简要介绍一下你自己。' }],
               max_tokens: 50,
               temperature: 0,
                stream: false
           };
           const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data), signal: controller.signal });
            if (!response.ok) {
               let errorDetail = `HTTP error! status: ${response.status}`;
               try {
                   const errorBody = await response.text();
                   console.error(`Test API call failed: ${response.status} ${response.statusText}\nBody: ${errorBody}`);
                    try {
                       const errorJson = JSON.parse(errorBody);
                       if (errorJson.error && errorJson.error.message) { throw new Error(`API Error: ${errorJson.error.message}`); }
                       else if (errorJson.message) { throw new Error(`API Error: ${errorJson.message}`); }
                       else { throw new Error(`HTTP error! status: ${response.status}.`); }
                    } catch (parseError) { throw new Error(`HTTP error! status: ${response.status}.`); }
               } catch (readError) { throw new Error(`HTTP error! status: ${response.status}.`); }
            }
           const result = await response.json();
           const testSuccess = !!( result && Array.isArray(result.choices) && result.choices.length > 0 && result.choices[0].message && typeof result.choices[0].message.content === 'string' && result.choices[0].message.content.trim().length > 0 );
           if (!testSuccess) {
                console.warn("Model test failed: Unexpected response structure or empty content", result);
                throw new Error("API返回格式异常或内容为空");
           }
           return testSuccess;
       } catch (error) {
           console.error('Error during testModel fetch or processing:', error);
            if (error.name === 'AbortError') { throw new Error('测试超时'); }
           throw error;
       } finally {
           clearTimeout(timeoutId);
       }
    },
    showMessageBubble(type, content) {
       this.$emit('show-message', { title: type, message: content });
    }
  }
};
</script>

<style scoped>
/* Page specific container */
.llm-config-page {
  padding-bottom: 20px; /* Add some padding at the bottom */
}

/* Page Header Section */
.page-header-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.page-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
}

/* Main Content Layout */
.config-content-area {
  display: flex;
  gap: 24px; /* Space between the two main panels */
  flex-wrap: wrap; /* Allow panels to stack on smaller screens */
}

/* Left Panel: Configuration Management */
.config-management-panel {
  flex: 0 0 300px;
  min-width: 280px;
  max-width: 350px;
  display: flex;
  flex-direction: column;
}

.config-management-panel .panel-title {
  font-size: 1.3rem;
  margin-bottom: 20px;
}

.config-actions {
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.config-select-group .input-label {
    margin-bottom: 8px;
}

.config-dropdown {
  width: 100%;
}

.config-crud-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.integration-section {
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
    text-align: center;
}

/* Right Panel: Configuration Details (Tabs) */
.config-details-panel {
  flex: 1;
  min-width: 350px;
  display: flex;
  flex-direction: column;
}

.config-details-panel .info-message.large-info {
    font-size: 1.1rem;
    color: var(--text-secondary);
    text-align: center;
    padding: 40px 20px;
}

.config-details-content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

/* Tab Headers */
.tab-headers {
  display: flex;
  border-bottom: 2px solid var(--border-color);
  margin-bottom: 20px;
  flex-shrink: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.tab-headers::-webkit-scrollbar { display: none; }

.tab-header {
  background-color: transparent;
  border: none;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-secondary);
  transition: color var(--transition-speed);
  position: relative;
  bottom: -2px;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tab-header:hover { color: var(--text-primary); }
.tab-header.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  font-weight: 500;
}

/* Tab Content */
.tab-content {
  padding-top: 10px;
  flex-grow: 1;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* API Key Specifics */
.api-key-container {
  display: flex;
  align-items: center;
  gap: 10px;
}
.api-key-input { flex-grow: 1; }

/* Updated Show/Hide Key Toggle */
.show-key-toggle-label {
  flex-shrink: 0;
  white-space: nowrap;
  cursor: pointer;
  display: inline-flex; /* Use inline-flex for alignment */
  align-items: center;
  gap: 6px; /* Space between icon and text */
  padding: 5px 8px; /* Add some padding for click area */
  border-radius: var(--border-radius-sm);
  transition: background-color var(--transition-speed);
  color: var(--text-secondary);
}
.show-key-toggle-label:hover {
  background-color: var(--hover-overlay);
  color: var(--text-primary);
}
.show-key-toggle-label .visually-hidden { /* Ensure checkbox is hidden */
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
}


.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  gap: 12px;
}

/* Model Management within Tab */
.model-section {
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--border-color);
}
.model-section .section-title { margin-bottom: 15px; font-size: 1.1rem; font-weight: 500;}

.model-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    align-items: flex-end;
    margin-bottom: 15px;
}
.model-select-group {
    flex-grow: 1;
    min-width: 200px;
    margin-bottom: 0;
}
.model-crud-buttons { gap: 8px; flex-shrink: 0; margin-bottom: 0; }

.model-fetch-test-buttons { justify-content: flex-end; gap: 8px; }


/* Model Parameters within Tab */
.params-section .section-title { margin-bottom: 15px; font-size: 1.1rem; font-weight: 500; }
.params-section .info-message { margin-bottom: 20px; }

/* Updated Params Grid */
.params-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* Exactly 3 columns */
  gap: 20px;
  margin-bottom: 20px;
}

.param-cell .input-label { margin-bottom: 8px; }
.param-input { width: 100%; }


/* Modals */
.modal { /* Ensure modal positioning is fixed and centered */
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  padding: 15px;
  overflow-y: auto;
}

.modal-content {
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Parent handles scroll via modal-body */
}

.integration-modal-content { max-width: 800px; }
.model-selection-modal-content { max-width: 650px; }
.input-dialog-content { max-width: 450px; }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 15px;
  margin-bottom: 20px;
  padding-right: 0;
  flex-shrink: 0;
}
.modal-title { font-size: 1.25rem; color: var(--text-primary); margin: 0; }
.close-btn { color: var(--text-secondary); padding: 4px 8px; }
.close-btn:hover { color: var(--text-primary); background-color: var(--hover-overlay); }
.close-btn svg { font-size: 1.1rem; }

.modal-body {
  overflow-y: auto;
  padding-right: 10px;
  margin-right: -10px;
  margin-bottom: 20px;
  flex-grow: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--border-color);
  padding-top: 15px;
  flex-shrink: 0;
}

/* Model Checkbox Label Styling */
.model-checkbox.checkbox-label1 {
    width: 100%;
     padding: 8px 12px; /* Adjust padding */
     border-radius: var(--border-radius-md); /* Use medium radius */
     background-color: var(--surface-color);
     border: 1px solid var(--border-color);
     transition: background-color var(--transition-speed), border-color var(--transition-speed);
     display: flex;
     align-items: center;
     cursor: pointer; /* Indicate clickable */
}
.model-checkbox.checkbox-label1:hover {
    background-color: var(--hover-overlay);
     border-color: var(--primary-light);
}

/* Style for Selected Model Item */
.model-checkbox.checkbox-label1.selected {
    background-color: var(--primary-color); /* Primary color background */
    border-color: var(--primary-dark); /* Darker border */
    color: white; /* White text */
    font-weight: 500;
}
.dark-theme .model-checkbox.checkbox-label1.selected {
     background-color: var(--primary-dark);
     border-color: var(--primary-color);
     color: white;
}

.model-name-text {
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.9rem;
    color: var(--text-primary); /* Default text color */
}
/* Ensure text color is white when selected */
.model-checkbox.checkbox-label1.selected .model-name-text {
     color: inherit; /* Inherit color from parent (.selected label) */
}
.dark-theme .model-name-text { color: var(--text-primary); }


.selection-actions { margin-top: 15px; }

/* Input Dialog Specifics */
.input-dialog-content { max-width: 450px; }
.input-dialog-content .modal-body { padding-bottom: 0; }

/* Responsive Adjustments */
@media (max-width: 992px) {
  .config-management-panel { flex-basis: 100%; max-width: 100%; margin-bottom: 10px; }
  .config-details-panel { flex-basis: 100%; min-width: 0; }
   .config-content-area { gap: 20px; }
  .config-actions { flex-direction: column; gap: 15px; }
  .config-crud-buttons { justify-content: center; }
   .model-actions { flex-direction: column; gap: 15px; }
   .model-select-group { min-width: auto; }
    .model-crud-buttons { justify-content: center; }
    .model-fetch-test-buttons { justify-content: center; flex-direction: column; gap: 10px; }
     .model-fetch-test-buttons .btn { width: 100%; }
   /* Adjust params grid for smaller screens */
   .params-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; }
    .filter-section, .pagination-section { flex-direction: column; align-items: stretch; gap: 10px; }
    .filter-input-group { width: 100%; }
     .page-dropdown { width: 100%; max-width: 100%; }
      .page-buttons { width: 100%; justify-content: center; }
       .selection-actions { justify-content: center; }
}

/* Further adjustments for smaller screens */
@media (max-width: 576px) {
     .page-title { font-size: 1.5rem; }
     .page-subtitle { font-size: 0.9rem; }
     .panel-title { font-size: 1.2rem; }
      .tab-header { font-size: 0.9rem; padding: 10px 15px; gap: 6px; }
      .form-group { margin-bottom: 15px; }
      .form-actions { flex-direction: column; gap: 10px; }
      .form-actions .btn { width: 100%; justify-content: center; }
        /* Allow params grid to fit just one column if needed */
       .params-grid { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
       .model-list { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
       .model-checkbox.checkbox-label1 { padding: 6px; font-size: 0.85rem; }
       .model-name-text { font-size: 0.85rem; }
       .modal-content { padding: 15px; }
       .modal-header { flex-direction: column; align-items: flex-start; gap: 10px; padding-bottom: 10px; margin-bottom: 15px; }
       .modal-title { font-size: 1.1rem; }
       .close-btn { position: absolute; top: 10px; right: 10px; }
        .modal-body { margin-bottom: 15px; padding-right: 5px; margin-right: -5px; }
       .modal-footer { flex-direction: column; gap: 10px; padding-top: 15px; }
        .modal-footer .btn { width: 100%; justify-content: center; }
}
</style>