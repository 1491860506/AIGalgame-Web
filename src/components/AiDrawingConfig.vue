<template>
  <div>
  <div class="ai-drawing-config card">
    <!-- Title Section -->
    <div class="title-section">
      <h1><font-awesome-icon :icon="['fas', 'paint-brush']" /> AI 绘画配置</h1>
      <p>配置和管理 AI 绘图服务接口</p>
    </div>
    <hr class="separator" />

    <!-- Configuration Selection Area -->
    <div class="config-selection-frame">
      <div class="top-controls">
        <!-- Config selection dropdown -->
        <div class="config-combo-frame form-group">
          <label for="config-edit-combo" class="form-label">选择配置:</label>
          <select
            id="config-edit-combo"
            class="select config-edit-combo"
            v-model="selectedConfig"
            @change="loadSelectedConfig">
            <option v-if="configs.length === 0" value="" disabled>-- 无可用配置 --</option>
            <option v-for="config in configs" :key="config" :value="config">{{ config }}</option>
          </select>
        </div>

        <div class="button-frame">
          <button class="btn btn-primary btn-sm" @click="addConfig">
            <font-awesome-icon :icon="['fas', 'plus']" /> 新增
          </button>
          <button class="btn btn-secondary btn-sm" @click="copyConfig" :disabled="!selectedConfig">
            <font-awesome-icon :icon="['fas', 'copy']" /> 复制
          </button>
          <button class="btn btn-outline btn-sm" @click="renameConfig" :disabled="!selectedConfig">
            <font-awesome-icon :icon="['fas', 'pen']" /> 改名
          </button>
          <button class="btn btn-danger btn-sm" @click="deleteConfig" :disabled="!selectedConfig">
            <font-awesome-icon :icon="['fas', 'trash']" /> 删除
          </button>
        </div>
      </div>
    </div>

    <!-- Separator -->
    <hr class="separator thin-separator" v-if="selectedConfig" />

    <!-- Section displayed only when a config is selected -->
    <div v-if="selectedConfig">

      <!-- Shared Parameters Section -->
      <div class="shared-params-section card">
        <h2 class="section-title"><font-awesome-icon :icon="['fas', 'cogs']" /> 全局参数</h2>
        <div class="shared-params-grid">
          <!-- Left column - Numeric parameters -->
          <div class="params-column">
            <div class="form-group">
              <label for="max-attempts" class="form-label tooltip-container">最大尝试次数:
                <span class="tooltip-text">单个图像生成请求失败时的最大重试次数。</span>
              </label>
              <input
                id="max-attempts"
                type="number"
                v-model.number="maxAttempts"
                min="1"
                class="input number-input"
              />
            </div>

            <div class="form-group">
              <label for="delay-time" class="form-label tooltip-container">重试间隔 (秒):
                 <span class="tooltip-text">每次重试之间的等待时间。</span>
              </label>
              <input
                id="delay-time"
                type="number"
                v-model.number="delayTime"
                min="0"
                class="input number-input"
              />
            </div>

            <div class="form-group">
              <label for="max-concurrency" class="form-label tooltip-container">最大并发数:
                 <span class="tooltip-text">允许同时向此API发送的最大请求数。</span>
              </label>
              <input
                id="max-concurrency"
                type="number"
                v-model.number="maxConcurrency"
                min="1"
                class="input number-input"
              />
            </div>
          </div>

          <!-- Right column - Toggles and Request Selection -->
          <div class="params-column">
             <!-- Switches Group -->
            <div class="form-group switch-group">
               <label class="form-label">全局开关:</label>
               <div class="switch-container">
                 <div class="switch">
                   <input type="checkbox" id="use-rembg-switch" v-model="useRembg">
                   <label for="use-rembg-switch" class="switch-slider"></label>
                 </div>
                 <label for="use-rembg-switch" class="switch-label">使用本地 rembg 移除背景</label>
               </div>

               <div class="switch-container">
                 <div class="switch">
                   <input type="checkbox" id="use-cors-switch" v-model="useCors">
                   <label for="use-cors-switch" class="switch-slider"></label>
                 </div>
                 <label for="use-cors-switch" class="switch-label">启用本地代理跨域</label>
               </div>

               <div class="switch-container">
                 <div class="switch">
                   <input type="checkbox" id="second-request-switch" v-model="secondRequest" @change="toggleSecondRequest">
                   <label for="second-request-switch" class="switch-slider"></label>
                 </div>
                 <label for="second-request-switch" class="switch-label">启用二次请求</label>
               </div>
             </div>


             <!-- Request selection (only visible when second request is enabled) -->
             <div class="form-group" v-if="secondRequest">
               <label for="request-type" class="form-label">当前编辑:</label>
               <select
                 id="request-type"
                 v-model="requestType"
                 class="select request-type-combo"
                 @change="switchRequestView">
                 <option value="一次请求">一次请求</option>
                 <option value="二次请求">二次请求</option>
               </select>
             </div>
          </div>
        </div>
      </div>

      <!-- Configuration Content Area (Tabs) -->
      <div class="config-content card">
        <div class="tabs">
          <button
            class="tab-button"
            :class="{ active: activeTab === 'general' }"
            @click="activeTab = 'general'">
              <font-awesome-icon :icon="['fas', 'sliders-h']" /> 基本设置
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'headers' }"
            @click="activeTab = 'headers'">
             <font-awesome-icon :icon="['fas', 'list-alt']" /> 请求头
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'body' }"
            @click="activeTab = 'body'"
            :disabled="requestMethod !== 'POST'">
             <font-awesome-icon :icon="['fas', 'file-alt']" /> 请求体
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'response' }"
            @click="activeTab = 'response'">
             <font-awesome-icon :icon="['fas', 'exchange-alt']" /> 响应处理
          </button>
        </div>

        <div class="tab-content">
          <!-- General Settings Tab -->
          <div v-show="activeTab === 'general'" class="tab-pane">
            <h3 class="pane-title">请求基本信息</h3>
            <div class="form-grid">
               <div class="form-group grid-span-2">
                 <label for="request-url" class="form-label">请求 URL:</label>
                 <input id="request-url" type="text" v-model="requestUrl" class="input" placeholder="例如: http://127.0.0.1:7860/sdapi/v1/txt2img" />
               </div>

               <div class="form-group">
                 <label for="request-method" class="form-label">请求方法:</label>
                 <select id="request-method" v-model="requestMethod" @change="toggleRequestBody" class="select">
                   <option value="POST">POST</option>
                   <option value="GET">GET</option>
                 </select>
               </div>

               <div class="form-group">
                 <label for="request-timeout" class="form-label">超时时间 (秒):</label>
                 <input
                   id="request-timeout"
                   type="number"
                   v-model.number="requestTimeout"
                   min="1"
                   class="input number-input"
                 />
               </div>
             </div>
          </div>

          <!-- Headers Tab -->
          <div v-show="activeTab === 'headers'" class="tab-pane">
             <div class="header-controls">
                <button class="btn btn-secondary btn-sm" @click="addHeader">
                    <font-awesome-icon :icon="['fas', 'plus']" /> 添加请求头
                </button>
                <button class="btn btn-outline btn-sm" @click="copyHeadersFromFirstRequest" v-if="secondRequest && currentRequestViewType === '二次请求'">
                    <font-awesome-icon :icon="['fas', 'copy']" /> 复制一次请求头
                </button>
                 <!-- Pagination (optional, keep if needed) -->
                <select
                  v-if="totalHeaderPages > 1"
                  v-model="currentHeaderPage"
                  @change="updateHeaderPagination"
                  class="select header-page-select">
                   <option v-for="page in totalHeaderPages" :key="page" :value="page">第 {{ page }} 页</option>
                </select>
            </div>

            <div class="headers-list">
                <div v-if="headers.length === 0" class="empty-state">没有配置请求头</div>
                <div
                  v-for="(header) in visibleHeaders"
                  :key="header.id"
                  class="header-item">
                  <input
                    type="text"
                    v-model="header.key"
                    placeholder="Header Key"
                    class="input header-key"
                  />
                  <input
                    type="text"
                    v-model="header.value"
                    placeholder="Header Value"
                    class="input header-value"
                  />
                   <button class="btn btn-danger btn-xs btn-delete-header" @click="deleteHeader(header.id)" title="删除此行">
                    <font-awesome-icon :icon="['fas', 'trash']" />
                  </button>
                </div>
            </div>
          </div>

          <!-- Request Body Tab -->
          <div v-show="activeTab === 'body'" class="tab-pane">
            <div v-if="requestMethod === 'POST'">
               <div class="body-controls">
                   <label for="request-body" class="form-label">请求体 (JSON 格式):</label>
                   <div>
                      <span class="body-help-text">提示: 可用变量 <code>{prompt}</code> 提示词, <code>{random}</code> 随机种子</span>
                      <button class="btn btn-info btn-xs btn-validate-json" @click="validateRequestJson">
                          <font-awesome-icon :icon="['fas', 'check']" /> 检验JSON
                      </button>
                   </div>
               </div>
               <textarea
                  id="request-body"
                  v-model="requestBody"
                  class="input textarea-input request-body-text"
                  spellcheck="false"
                  placeholder='例如：
{
  "prompt": "{prompt}",
  "seed": "{random}",
  "steps": 20,
  "negative_prompt": "low quality"
}'
                ></textarea>
            </div>
            <div v-else class="empty-state">
              GET 请求没有请求体。
            </div>
          </div>

          <!-- Response Processing Tab -->
          <div v-show="activeTab === 'response'" class="tab-pane">
            <h3 class="pane-title">响应数据提取与判断</h3>
             <div class="form-grid response-grid">
                <div class="form-group grid-span-2">
                  <label for="json-path" class="form-label tooltip-container">图像数据 JSON 路径:
                     <span class="tooltip-text">用于从 API 响应 JSON 中提取图像数据 (通常是 Base64 字符串或url地址) 的路径。例如: ["data"][0]</span>
                  </label>
                  <input id="json-path" type="text" v-model="jsonPath" class="input" placeholder="例如: [&quotdata&quot][0]"/>
                </div>
                <div class="form-group grid-span-2">
                  <label for="parse-entry" class="form-label tooltip-container">响应解析 (可选):
                     <span class="tooltip-text">用于处理响应的函数，允许使用direct(content)和b64decode(result)，分别表示直接取对应内容和base64解码。</span>
                  </label>
                  <input id="parse-entry" type="text" v-model="parse" class="input" placeholder="例如: b64decode(result)"/>
                </div>

                 <hr class="separator grid-span-2 thin-separator">

                 <div class="form-group">
                  <label for="success-condition" class="form-label tooltip-container">成功条件:
                     <span class="tooltip-text">用于判断请求是否成功的条件表达式。</span>
                  </label>
                  <input id="success-condition" type="text" v-model="successCondition" class="input" placeholder="例如: response.status == 200"/>
                </div>
                <div class="form-group">
                  <label for="fail-condition" class="form-label tooltip-container">失败条件:
                     <span class="tooltip-text">用于判断请求是否失败的条件表达式。</span>
                  </label>
                  <input id="fail-condition" type="text" v-model="failCondition" class="input" placeholder="例如: responsestatus != 200"/>
                </div>
                 <div class="form-group">
                  <label for="forbid-condition" class="form-label tooltip-container">违禁条件:
                     <span class="tooltip-text">用于判断提示词是否包含违禁内容的条件表达式。</span>
                  </label>
                  <input id="forbid-condition" type="text" v-model="forbidCondition" class="input" placeholder="例如: response.nsfw == true"/>
                </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Controls Area -->
      <div class="bottom-controls">
        <button class="btn btn-secondary character-background-config" @click="openCharacterBackgroundSettings">
          <font-awesome-icon :icon="['fas', 'user-astronaut']" /> 人物与背景生成设置
        </button>

        <button class="btn btn-primary btn-lg save-button" @click="saveCurrentConfig">
          <font-awesome-icon :icon="['fas', 'save']" /> 保存当前配置
        </button>
      </div>

    </div> <!-- End v-if="selectedConfig" -->
     <!-- Placeholder when no config is selected -->
    <div v-else class="no-config-selected">
      <font-awesome-icon :icon="['fas', 'info-circle']" class="placeholder-icon" />
      <p>请在上方选择一个配置进行编辑，或点击“新增”创建一个新配置。</p>
    </div>

    <!-- Character Background Settings Dialog -->
    <div class="modal" v-if="showCharacterBackgroundDialog" @click.self="showCharacterBackgroundDialog = false">
      <div class="modal-content card">
         <div class="modal-header">
            <h3 class="modal-title">人物与背景绘画设置</h3>
            <button class="close-btn btn btn-text btn-sm" @click="showCharacterBackgroundDialog = false" title="关闭">
              <font-awesome-icon :icon="['fas', 'times']" />
            </button>
         </div>
        <div class="modal-body">
          <!-- Embed the component directly -->
          <AiDrawingConfig_character_background />
        </div>
         <!-- Optional: Add save/cancel buttons if the child component emits events -->
         <!-- <div class="modal-footer"> ... </div> -->
      </div>
    </div>

    <!-- Notification Placeholder - Assuming global toastification handles this via $emit -->
    <!--
    <div class="notification" v-if="notification.show" :class="notification.type">
      {{ notification.message }}
    </div>
     -->
  </div>
  </div>
</template>

<script>
// --- SCRIPT REMAINS THE SAME ---
import AiDrawingConfig_character_background from './AiDrawingConfig_character_background.vue';
// Assume Font Awesome icons are globally registered or import them here
// Icons Used: paint-brush, plus, copy, pen, trash, cogs, sliders-h, list-alt, file-alt, exchange-alt, check, user-astronaut, save, info-circle, times

export default {
  name: 'AiDrawingConfig',
  components: {
    AiDrawingConfig_character_background
    // FontAwesomeIcon // If needed
  },
  data() {
    return {
      activeTab: 'general',
      showCharacterBackgroundDialog: false,
      notification: { show: false, message: '', type: 'success', timeout: null }, // Keep for now if local logic uses it
      configs: [],
      selectedConfig: '',
      maxAttempts: 1,
      delayTime: 5,
      maxConcurrency: 1,
      useRembg: false,
      useCors: false,
      secondRequest: false,
      requestType: '一次请求',
      currentRequestViewType: '一次请求',
      requestUrl: '',
      requestMethod: 'POST',
      requestTimeout: 30,
      requestBody: '',
      headers: [],
      headersPerPage: 6,
      currentHeaderPage: 1,
      jsonPath: '',
      parse: '', // Renamed from userdefine in template? Check consistency. Assuming 'parse' is correct based on template.
      successCondition: '',
      failCondition: '',
      forbidCondition: '',
      configData: {}, // Should be populated from localStorage
      currentTimestamp: new Date().toISOString() // More dynamic timestamp
    };
  },
  computed: {
    visibleHeaders() {
      const start = (this.currentHeaderPage - 1) * this.headersPerPage;
      const end = start + this.headersPerPage;
      // Ensure headers is always an array
      return Array.isArray(this.headers) ? this.headers.slice(start, end) : [];
    },
    totalHeaderPages() {
       // Ensure headers is always an array
       const headersArray = Array.isArray(this.headers) ? this.headers : [];
      return Math.max(1, Math.ceil(headersArray.length / this.headersPerPage));
    }
  },
  mounted() {
    this.loadConfigNames();
    this.updateTimestamp(); // Update timestamp initially
  },
  methods: {
     // Helper to update timestamp (less critical, for logging)
    updateTimestamp() {
      this.currentTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    },
    // Helper Methods
    showNotification(message, type = 'success') {
       // Use the global event emitter for toast notifications
       this.$emit('show-message', { title: type, message: message });

       // Keep local notification logic commented out or remove if fully switching
       /*
       this.notification.message = message;
       this.notification.type = type;
       this.notification.show = true;
       clearTimeout(this.notification.timeout);
       this.notification.timeout = setTimeout(() => {
         this.notification.show = false;
       }, 3000);
       */
    },

    // Configuration Management
    loadConfigNames() {
        try {
            const storedConfig = localStorage.getItem('aiGalgameConfig');
            let config = {};
            if (storedConfig) {
                config = JSON.parse(storedConfig);
            }

            // Ensure AI_draw and configs exist
            if (!config.AI_draw) {
                config.AI_draw = { configs: {}, character_config: [], background_config: [] };
            }
            if (!config.AI_draw.configs) {
                config.AI_draw.configs = {};
            }

            this.configData = config; // Store the loaded/initialized structure
            this.configs = Object.keys(config.AI_draw.configs).sort();

            if (this.configs.length > 0) {
                // Check if last selected exists and is valid
                 const lastSelected = config.AI_draw.lastSelectedConfig; // Assuming you save last selected
                 if (lastSelected && this.configs.includes(lastSelected)) {
                     this.selectedConfig = lastSelected;
                 } else {
                     this.selectedConfig = this.configs[0]; // Default to first
                 }
                this.loadSelectedConfig();
            } else {
                // No configs exist
                this.selectedConfig = '';
                this.clearConfigFields(); // Clear fields if no config is loaded
                 this.configData.AI_draw.lastSelectedConfig = ''; // Clear last selected
            }

        } catch (error) {
            console.error('Error loading config names:', error);
            this.showNotification('加载配置列表失败，将初始化。', 'error');
            this.initializeConfig(); // Initialize if loading fails
        }
    },

    initializeConfig() {
        // Creates the AI_draw structure if it doesn't exist in localStorage
        let currentFullConfig = {};
        try {
            const stored = localStorage.getItem('aiGalgameConfig');
            if (stored) currentFullConfig = JSON.parse(stored);
        } catch (e) { console.error("Error parsing localStorage on init:", e); }

        if (!currentFullConfig.AI_draw) {
            currentFullConfig.AI_draw = { configs: {}, character_config: [], background_config: [] };
            try {
                 localStorage.setItem('aiGalgameConfig', JSON.stringify(currentFullConfig));
            } catch (saveError) {
                 console.error("Failed to save initialized config:", saveError);
                 this.showNotification('初始化配置存储失败', 'error');
            }
        }
         this.configData = currentFullConfig; // Update local data
         this.configs = [];
         this.selectedConfig = '';
         this.clearConfigFields();
    },

    saveConfig() {
        // Saves the entire this.configData object back to localStorage
        // Note: loadConfigNames and loadSelectedConfig work directly with this.configData
        try {
            // Save last selected config name within the AI_draw structure
            if (this.configData && this.configData.AI_draw) {
                this.configData.AI_draw.lastSelectedConfig = this.selectedConfig;
            } else {
                 console.warn("Cannot save last selected config, configData.AI_draw is missing.");
            }

            localStorage.setItem('aiGalgameConfig', JSON.stringify(this.configData));
            this.updateTimestamp(); // Update timestamp on save
            // console.log(`Configuration saved at ${this.currentTimestamp}`); // Keep if needed for debug
        } catch (error) {
            console.error('Error saving config:', error);
            this.showNotification('保存配置时发生错误', 'error');
        }
    },

    addConfig() {
      const configName = prompt('请输入新配置的名称:');
      if (!configName || !configName.trim()) {
          if (configName !== null) this.showNotification('配置名称不能为空', 'warning');
          return;
      }
      const trimmedName = configName.trim();

      if (this.configs.includes(trimmedName)) {
        this.showNotification(`配置名称 "${trimmedName}" 已存在！`, 'error');
        return;
      }

      // Create default structure for a new config
      const newConfigEntry = {
        max_attempts: '1', // Keep as string if model expects string? Or parse later? Let's keep as number where applicable.
        delay_time: 5,
        maxconcurrency: 1,
        use_rembg: false,
        use_cors: false,
        // Request 1
        request_timeout: 30,
        request_method: 'POST',
        request_url: '',
        request_body: JSON.stringify({ prompt: "{prompt}", seed: "{random}", steps: 20 }, null, 2), // Default pretty JSON
        json_path: '', // Example: images[0]
        userdefine: '', // Keep name consistent if used elsewhere, or rename to 'parse'
        success_condition: '', // Example: response.status === 200
        fail_condition: '',
        forbid_condition: '',
        headers: [['Content-Type', 'application/json']], // Default header example
        // Request 2 Defaults
        second_request: false,
        second_request_timeout: 30,
        second_request_method: 'POST',
        second_request_url: '',
        second_request_body: '',
        second_json_path: '',
        second_userdefine: '', // Consistency
        second_success_condition: '',
        second_fail_condition: '',
        second_forbid_condition: '',
        second_headers: []
      };

      // Ensure AI_draw.configs exists
      if (!this.configData.AI_draw) this.configData.AI_draw = { configs: {} };
      if (!this.configData.AI_draw.configs) this.configData.AI_draw.configs = {};

      this.configData.AI_draw.configs[trimmedName] = newConfigEntry;
      this.configs.push(trimmedName);
      this.configs.sort();
      this.selectedConfig = trimmedName;
      this.saveConfig(); // Save the updated structure
      this.loadSelectedConfig(); // Load the new config into the UI
      this.showNotification(`配置 "${trimmedName}" 已创建！`);
    },

    copyConfig() {
      if (!this.selectedConfig) {
        this.showNotification('请选择要复制的配置！', 'warning');
        return;
      }

      const newConfigName = prompt(`请输入复制后的新配置名称:`, `${this.selectedConfig}_copy`);
      if (!newConfigName || !newConfigName.trim()) {
         if (newConfigName !== null) this.showNotification('新配置名称不能为空', 'warning');
         return;
      }
       const trimmedNewName = newConfigName.trim();


      if (this.configs.includes(trimmedNewName)) {
        this.showNotification(`配置名称 "${trimmedNewName}" 已存在！`, 'error');
        return;
      }

      // Deep copy the selected config's data
      try {
         const originalConfig = this.configData.AI_draw.configs[this.selectedConfig];
         this.configData.AI_draw.configs[trimmedNewName] = JSON.parse(JSON.stringify(originalConfig));

         this.configs.push(trimmedNewName);
         this.configs.sort();
         this.selectedConfig = trimmedNewName; // Switch to the new copy
         this.saveConfig();
         this.loadSelectedConfig(); // Load the copied data into UI
         this.showNotification(`配置已复制为 "${trimmedNewName}"！`);
      } catch (error) {
          console.error("Error copying config:", error);
          this.showNotification('复制配置时出错', 'error');
      }

    },

    renameConfig() {
      if (!this.selectedConfig) {
        this.showNotification('请选择要改名的配置！', 'warning');
        return;
      }

      const newConfigName = prompt('请输入新的配置名称:', this.selectedConfig);
      if (!newConfigName || !newConfigName.trim() || newConfigName.trim() === this.selectedConfig) {
          if (newConfigName !== null && newConfigName.trim() === this.selectedConfig) return; // No change
           if (newConfigName !== null) this.showNotification('新配置名称不能为空', 'warning');
           return;
      }
      const trimmedNewName = newConfigName.trim();

      if (this.configs.includes(trimmedNewName)) {
        this.showNotification(`配置名称 "${trimmedNewName}" 已存在！`, 'error');
        return;
      }

      // Perform rename
      this.configData.AI_draw.configs[trimmedNewName] = this.configData.AI_draw.configs[this.selectedConfig];
      delete this.configData.AI_draw.configs[this.selectedConfig];

      // Update the configs array state
      const index = this.configs.indexOf(this.selectedConfig);
      if (index > -1) {
           this.configs.splice(index, 1, trimmedNewName);
      } else {
           this.configs.push(trimmedNewName); // Should not happen if selectedConfig was valid
      }
      this.configs.sort();
      this.selectedConfig = trimmedNewName; // Update selection
      this.saveConfig();
      // No need to reload UI fields as the data object was just moved
      this.showNotification(`配置已改名为 "${trimmedNewName}"！`);
    },

    deleteConfig() {
      if (!this.selectedConfig) {
        this.showNotification('请选择要删除的配置！', 'warning');
        return;
      }

      if (!confirm(`确定要永久删除配置 "${this.selectedConfig}" 吗？\n此操作无法撤销！`)) return;

      // Delete from data structure
      delete this.configData.AI_draw.configs[this.selectedConfig];

      // Delete from UI list
      const index = this.configs.indexOf(this.selectedConfig);
      if (index > -1) {
           this.configs.splice(index, 1);
      }

      // Select a new config or clear fields
      if (this.configs.length > 0) {
        // Select the previous one or the first one
        this.selectedConfig = this.configs[Math.max(0, index - 1)];
      } else {
        this.selectedConfig = '';
      }

      this.saveConfig(); // Save the deletion and new selection

      if (this.selectedConfig) {
          this.loadSelectedConfig(); // Load the newly selected config
      } else {
          this.clearConfigFields(); // Clear UI if no configs left
      }

      this.showNotification(`配置 "${this.selectedConfig || '(已删除)'}" 删除成功！`); // Use old name in message
    },

    // Load & Save Config Data <-> UI Fields
    loadSelectedConfig() {
      // Save the newly selected config name persistently
      if (this.configData && this.configData.AI_draw) {
          this.configData.AI_draw.lastSelectedConfig = this.selectedConfig;
          // Avoid saving the entire config here, just update the last selected flag if needed
          // this.saveConfig(); // Only save if you want every selection change persisted immediately
      }


      if (!this.selectedConfig || !this.configData?.AI_draw?.configs?.[this.selectedConfig]) {
        this.clearConfigFields();
        this.activeTab = 'general'; // Reset tab
        return;
      }

      const config = this.configData.AI_draw.configs[this.selectedConfig];

      // Load shared parameters (parse numbers)
      this.maxAttempts = parseInt(config.max_attempts || '1', 10) || 1;
      this.delayTime = parseInt(config.delay_time || '5', 10) || 5;
      this.maxConcurrency = parseInt(config.maxconcurrency || '1', 10) || 1; // Ensure correct key
      this.useRembg = config.use_rembg === true; // Explicit boolean check
      this.useCors = config.use_cors === true; // Explicit boolean check

      // Load second request state
      this.secondRequest = config.second_request === true; // Explicit boolean check
      // Reset view to first request initially when loading a new config
      this.requestType = '一次请求';
      this.currentRequestViewType = '一次请求';

      // Load the data for the '一次请求' view
      this.loadViewFromConfig('一次请求');

      // Reset tab to general
      this.activeTab = 'general';
       // Reset header pagination
       this.currentHeaderPage = 1;
    },

    loadViewFromConfig(requestTypeToLoad) {
      if (!this.selectedConfig || !this.configData?.AI_draw?.configs?.[this.selectedConfig]) {
          this.clearRequestSpecificFields();
          return;
      }

      const config = this.configData.AI_draw.configs[this.selectedConfig];
      const prefix = requestTypeToLoad === '一次请求' ? '' : 'second_';

      // Load URL, Method, Timeout
      this.requestUrl = config[`${prefix}request_url`] || '';
      this.requestMethod = config[`${prefix}request_method`] || 'POST';
      this.requestTimeout = parseInt(config[`${prefix}request_timeout`] || '30', 10) || 30;

      // Load Body
      this.requestBody = config[`${prefix}request_body`] || '';
       // Ensure body is cleared if method is GET for the loaded view
       if (this.requestMethod === 'GET') {
          this.requestBody = '';
       }


      // Load Headers
      try {
        let headersData = config[`${prefix}headers`]; // Could be array of arrays or string
        let parsedHeaders = [];

        if (typeof headersData === 'string' && headersData.trim() !== '') {
          // Attempt to parse if it's a non-empty string
          parsedHeaders = JSON.parse(headersData);
        } else if (Array.isArray(headersData)) {
           // Assume it's already an array of arrays
           parsedHeaders = headersData;
        }
        // If parsing failed or it wasn't a string/array, parsedHeaders remains []

         // Map to the {id, key, value} format for the UI
        this.headers = Array.isArray(parsedHeaders)
          ? parsedHeaders.map((header, index) => ({
              id: Date.now() + index, // Generate unique ID for UI key
              key: Array.isArray(header) ? (header[0] || '') : '', // Handle malformed header array
              value: Array.isArray(header) ? (header[1] || '') : ''
            }))
          : [];
      } catch (error) {
        console.error(`Error loading/parsing headers for ${requestTypeToLoad}:`, error, config[`${prefix}headers`]);
        this.headers = []; // Reset headers on error
        this.showNotification(`加载 ${requestTypeToLoad} 的请求头失败，请检查配置格式。`, 'error');
      }
      this.currentHeaderPage = 1; // Reset pagination

      // Load Response Processing
      this.jsonPath = config[`${prefix}json_path`] || '';
      // Use 'userdefine' key from config, assign to 'parse' data property
      this.parse = config[`${prefix}userdefine`] || '';
      this.successCondition = config[`${prefix}success_condition`] || '';
      this.failCondition = config[`${prefix}fail_condition`] || '';
      this.forbidCondition = config[`${prefix}forbid_condition`] || '';

       // Update the tracker for the currently viewed type
       this.currentRequestViewType = requestTypeToLoad;
    },

    saveViewToConfig(requestTypeToSave) {
      // Saves the current UI fields' state into the this.configData structure for the specified request type
      if (!this.selectedConfig || !this.configData?.AI_draw?.configs?.[this.selectedConfig]) return;

      const config = this.configData.AI_draw.configs[this.selectedConfig];
      const prefix = requestTypeToSave === '一次请求' ? '' : 'second_';

      // Save basic info
      config[`${prefix}request_url`] = this.requestUrl;
      config[`${prefix}request_method`] = this.requestMethod;
      config[`${prefix}request_timeout`] = this.requestTimeout; // Keep as number

      // Save body only if POST
      config[`${prefix}request_body`] = this.requestMethod === 'POST' ? this.requestBody : '';

      // Save headers in [key, value] array format
      config[`${prefix}headers`] = Array.isArray(this.headers)
          ? this.headers.map(header => [header.key || '', header.value || '']) // Ensure key/value are strings
          : [];

      // Save response processing fields (use 'userdefine' key for config)
      config[`${prefix}json_path`] = this.jsonPath;
      config[`${prefix}userdefine`] = this.parse; // Save 'parse' data property back to 'userdefine' config key
      config[`${prefix}success_condition`] = this.successCondition;
      config[`${prefix}fail_condition`] = this.failCondition;
      config[`${prefix}forbid_condition`] = this.forbidCondition;

       // Save the second_request toggle state ONLY when saving the "一次请求" view
       if (requestTypeToSave === '一次请求') {
           config.second_request = this.secondRequest;
       }
    },

    saveCurrentConfig() {
      if (!this.selectedConfig || !this.configData?.AI_draw?.configs?.[this.selectedConfig]) {
        this.showNotification('请选择有效的配置进行保存！', 'error');
        return;
      }

      // 1. Save Shared Parameters into this.configData
      const config = this.configData.AI_draw.configs[this.selectedConfig];
      config.max_attempts = this.maxAttempts; // Save as number
      config.delay_time = this.delayTime; // Save as number
      config.maxconcurrency = this.maxConcurrency; // Save as number, ensure correct key
      config.use_rembg = this.useRembg; // Save as boolean
      config.use_cors = this.useCors; // Save as boolean

      // 2. Save the currently displayed view's data into this.configData
      this.saveViewToConfig(this.currentRequestViewType);

      // 3. Save the entire updated this.configData to localStorage
      this.saveConfig(); // This handles saving the whole structure

      this.showNotification(`配置 "${this.selectedConfig}" 已保存！`);
       this.updateTimestamp(); // Log save time
       console.log(`Configuration saved at ${this.currentTimestamp}`);
    },

    clearConfigFields() {
        // Clear shared
        this.maxAttempts = 1;
        this.delayTime = 5;
        this.maxConcurrency = 1;
        this.useRembg = false;
        this.useCors = false;
        // Clear request state
        this.secondRequest = false;
        this.requestType = '一次请求';
        this.currentRequestViewType = '一次请求';
        this.activeTab = 'general'; // Reset tab
        // Clear specific fields
        this.clearRequestSpecificFields();
    },

    clearRequestSpecificFields() {
        this.requestUrl = '';
        this.requestMethod = 'POST';
        this.requestTimeout = 30;
        this.requestBody = '';
        this.headers = [];
        this.currentHeaderPage = 1;
        this.jsonPath = '';
        this.parse = ''; // Clear 'parse' data property
        this.successCondition = '';
        this.failCondition = '';
        this.forbidCondition = '';
    },

    // Request Configuration UI Logic
    toggleSecondRequest() {
      // Logic is handled by @change triggering saveViewToConfig ('一次请求') during saveCurrentConfig
      // Need to potentially update the config immediately if user toggles and doesn't save?
      // Let's update the config directly here for responsiveness.
       if (this.selectedConfig && this.configData?.AI_draw?.configs?.[this.selectedConfig]) {
         this.configData.AI_draw.configs[this.selectedConfig].second_request = this.secondRequest;
         // Optionally save immediately, or wait for main save button
         // this.saveConfig();
         // If toggled off, maybe switch view back to first request?
         if (!this.secondRequest && this.requestType === '二次请求') {
            this.requestType = '一次请求';
            this.switchRequestView(); // Switch view if toggled off
         }
       }
    },

    switchRequestView() {
      // Avoid saving/loading if the view type hasn't actually changed
      if (this.requestType === this.currentRequestViewType) return;

      // Save the data from the view we are leaving
      this.saveViewToConfig(this.currentRequestViewType);

      // Load the data for the view we are switching to
      this.loadViewFromConfig(this.requestType);

      // Update the tracker (already done by loadViewFromConfig)
      // this.currentRequestViewType = this.requestType;

      // Reset tab to general when switching views
      this.activeTab = 'general';
       // Reset header pagination
      this.currentHeaderPage = 1;
    },

    toggleRequestBody() {
       // Clear request body if switching to GET
      if (this.requestMethod === 'GET') {
        this.requestBody = '';
      }
       // When switching *back* to POST, the previously saved body will be loaded by loadViewFromConfig if needed
       // Activate body tab if switching to POST? Optional UX enhancement.
       // if(this.requestMethod === 'POST' && this.activeTab !== 'body') {
       //    this.activeTab = 'body';
       // }
    },

    // Headers Management
    addHeader() {
       if (!Array.isArray(this.headers)) {
           this.headers = []; // Initialize if not array
       }
      this.headers.push({ id: Date.now(), key: '', value: '' });
      // Optionally switch to the last page
       this.$nextTick(() => { // Ensure DOM updates before calculating page
           this.currentHeaderPage = this.totalHeaderPages;
       });
    },

    deleteHeader(id) {
        if (!Array.isArray(this.headers)) return; // Safety check
        const index = this.headers.findIndex(h => h.id === id);
        if (index !== -1) {
            this.headers.splice(index, 1);
            // Adjust page if needed
            const totalP = this.totalHeaderPages; // Recalculate
            if (this.currentHeaderPage > totalP) {
                this.currentHeaderPage = Math.max(1, totalP);
            }
        }
    },

    copyHeadersFromFirstRequest() {
      if (this.currentRequestViewType !== '二次请求' || !this.selectedConfig) {
        this.showNotification('请先切换到“二次请求”视图以复制一次请求头。', 'warning');
        return;
      }
       if (!this.configData?.AI_draw?.configs?.[this.selectedConfig]) {
           this.showNotification('无法加载配置数据。', 'error');
           return;
       }

      const config = this.configData.AI_draw.configs[this.selectedConfig];
      // Get headers from the *first* request config section
      const firstHeadersData = config.headers; // Should be array of arrays

      if (!Array.isArray(firstHeadersData)) {
        this.showNotification('无法获取一次请求的请求头数据，或格式不正确。', 'error');
        return;
      }

      try {
        // Convert [key, value] arrays to {id, key, value} objects for the current view
        this.headers = firstHeadersData.map((header, index) => ({
          id: Date.now() + index, // Generate new unique IDs
          key: Array.isArray(header) ? (header[0] || '') : '',
          value: Array.isArray(header) ? (header[1] || '') : ''
        }));

        this.currentHeaderPage = 1; // Reset pagination for the current (second request) view
        this.showNotification('已将一次请求的请求头复制到当前视图', 'success');
      } catch (error) {
        console.error('Error copying headers:', error);
        this.showNotification('复制请求头时出错', 'error');
      }
    },

    updateHeaderPagination() {
      // Handled by computed property `visibleHeaders` reacting to `currentHeaderPage` change
    },

    // Request Body Validation
    validateRequestJson() {
      let bodyToValidate = this.requestBody;
       if (!bodyToValidate || this.requestMethod !== 'POST') {
           this.showNotification('请求体为空或当前请求方法不是 POST', 'warning');
           return;
       }

      try {
        // Basic placeholder replacement for validation purposes
        // Use simple string replacement, avoid complex regex if not needed
        let tempBody = bodyToValidate.replace(/\{prompt\}/g, 'test prompt'); // Replace with valid JSON string
        tempBody = tempBody.replace(/\{random\}/g, Math.floor(Math.random() * 1000000)); // Replace with number

        JSON.parse(tempBody);
        this.showNotification('请求体 JSON 格式检验通过', 'success');
      } catch (error) {
         console.error("JSON Validation Error:", error);
        this.showNotification(`JSON 格式错误: ${error.message}`, 'error');
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
/* General Component Styling */
.ai-drawing-config {
  /* Inherits .card from app.vue */
  padding: 20px;
}

.separator {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 20px 0;
}
.thin-separator {
  margin: 15px 0;
}

/* Title Section */
.title-section {
  margin-bottom: 10px; /* Reduced margin */
}
.title-section h1 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.title-section p {
  color: var(--text-secondary);
  font-size: 1rem;
  margin-bottom: 15px;
}

/* Config Selection */
.config-selection-frame {
  margin-bottom: 20px;
}
.top-controls {
  display: flex;
  flex-wrap: wrap; /* Allow wrapping */
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}
.config-combo-frame {
   display: flex;
   align-items: center;
   gap: 10px;
   flex-grow: 1; /* Allow dropdown part to grow */
   min-width: 250px;
}
.config-combo-frame label {
    white-space: nowrap;
    color: var(--text-secondary);
    font-weight: 500;
}
.config-edit-combo {
  /* uses .select */
  flex-grow: 1; /* Allow select to fill space */
  max-width: 400px;
}
.button-frame {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Shared Parameters Section */
.shared-params-section {
  /* uses .card */
  margin-bottom: 25px;
  padding: 20px;
}
.section-title {
  font-size: 1.3rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
   display: flex;
  align-items: center;
  gap: 8px;
}
.shared-params-grid {
  display: flex;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* Responsive columns */
  gap: 30px;
}
.params-column {
  display: flex;
  flex-direction: column;
  gap: 18px; /* Space between items in a column */
}
.number-input {
   /* uses .input */
   max-width: 120px; /* Limit width of number inputs */
}
.form-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

/* Switches styling */
.switch-group {
    display: flex;
    flex-direction: column;
    gap: 15px; /* Space between switches */
}
.switch-container {
  display: flex;
  align-items: center;
  gap: 12px;
}
.switch-label {
  font-size: 0.95rem;
  color: var(--text-primary);
  cursor: pointer; /* Make label clickable */
}
/* Use global .switch styles */
.switch {
  position: relative;
  display: inline-block;
  width: 50px; /* Adjust width */
  height: 24px; /* Adjust height */
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-slider {
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
.switch-slider:before {
  position: absolute;
  content: "";
  height: 18px; /* Handle size */
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.switch input:checked + .switch-slider {
  background-color: var(--primary-color);
}
.switch input:focus + .switch-slider {
  box-shadow: 0 0 1px var(--primary-color);
}
.switch input:checked + .switch-slider:before {
  transform: translateX(26px); /* (Width - HandleWidth - 2*LeftOffset) */
}

.request-type-combo {
  /* uses .select */
  max-width: 200px;
}

/* Config Content Area */
.config-content {
  /* uses .card */
  margin-top: 25px;
  padding: 0; /* Remove card padding, handle inside */
  overflow: hidden; /* Prevent content spill */
}

/* Tabs */
.tabs {
  display: flex;
  background-color: var(--hover-overlay);
  border-bottom: 1px solid var(--border-color);
}
.tab-button {
  padding: 12px 20px;
  cursor: pointer;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  font-weight: 500;
  transition: all var(--transition-speed);
  border-bottom: 3px solid transparent;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tab-button:hover {
  color: var(--text-primary);
  background-color: rgba(var(--primary-color-rgb, 52, 152, 219), 0.1);
}
.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}
.tab-button:disabled {
    color: var(--text-tertiary);
    cursor: not-allowed;
    background-color: transparent;
    opacity: 0.6;
}

/* Tab Content */
.tab-content {
  padding: 25px;
}
.pane-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 20px;
}
.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}
.grid-span-2 {
    grid-column: span 2 / span 2;
}
@media (max-width: 600px) {
   .grid-span-2 { grid-column: span 1 / span 1; } /* Stack on small screens */
   .response-grid { grid-template-columns: 1fr; } /* Force single column */
}

/* Headers Tab */
.header-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    flex-wrap: wrap;
    gap: 10px;
}
.header-page-select {
    /* uses .select */
    max-width: 120px;
}
.headers-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 300px; /* Limit height and allow scroll */
    overflow-y: auto;
    padding-right: 5px; /* Space for scrollbar */
}
.header-item {
    display: flex;
    align-items: center;
    gap: 10px;
}
.header-key {
    flex: 1;
}
.header-value {
    flex: 2;
}
.btn-delete-header {
    /* uses .btn .btn-danger .btn-xs */
    padding: 4px 8px; /* Adjust xs padding */
}

/* Request Body Tab */
.body-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    flex-wrap: wrap;
    gap: 10px;
}
.body-help-text {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    margin-right: 10px;
}
.btn-validate-json {
    /* uses .btn .btn-info .btn-xs */
    padding: 4px 8px;
}
.request-body-text {
  /* uses .input .textarea-input */
  min-height: 200px;
  font-family: monospace;
  font-size: 0.9rem;
}

/* Response Tab */
.response-grid label {
    font-weight: normal; /* Less emphasis on labels here */
}

/* Empty / Placeholder States */
.empty-state, .no-config-selected {
  text-align: center;
  padding: 30px 20px;
  color: var(--text-tertiary);
  border: 2px dashed var(--border-color);
  border-radius: var(--border-radius-lg);
  margin-top: 20px;
}
.placeholder-icon {
    font-size: 2rem;
    margin-bottom: 15px;
    display: block;
    margin-left: auto;
    margin-right: auto;
}

/* Bottom Controls */
.bottom-controls {
  margin-top: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

/* Modal Styling (using global classes) */
.modal {
  position: fixed; inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex; justify-content: center; align-items: center;
  z-index: 1050; padding: 15px; overflow-y: auto;
}
.modal-content {
  /* uses .card */
  width: 100%; max-width: 800px; /* Wider for background config */
  max-height: 90vh; display: flex; flex-direction: column;
  overflow: hidden; padding: 20px;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 15px; margin-bottom: 15px; flex-shrink: 0;
}
.modal-title { font-size: 1.25rem; margin: 0; }
.modal-body { overflow-y: auto; flex-grow: 1; margin-bottom: 15px; padding-right: 5px; }


/* Tooltip Styles (using global) */
.tooltip-container { position: relative; cursor: help; display: inline-flex; align-items: center;}
.tooltip-container:hover .tooltip-text { visibility: visible; opacity: 1; }

/* General Form Styles */
.form-group { margin-bottom: 15px; }
.form-group .input, .form-group .select { width: 100%; } /* Make inputs/selects full width within their grid cell */

/* Responsive Adjustments */
@media (max-width: 768px) {
  .top-controls, .button-frame {
    justify-content: center;
  }
  .bottom-controls {
     flex-direction: column-reverse; /* Stack buttons, save on bottom */
     align-items: stretch;
  }
   .bottom-controls .btn {
      width: 100%;
   }
   .config-content { margin-top: 20px; }
   .shared-params-section { margin-bottom: 20px; }
    .tabs { overflow-x: auto; } /* Allow tabs to scroll horizontally */
    .tab-button { white-space: nowrap; }
}

</style>