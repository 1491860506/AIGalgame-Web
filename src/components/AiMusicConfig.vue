<template>
<div>
  <div class="ai-music-config-container card">
    <!-- Title Section -->
    <div class="title-section">
      <h1 class="page-title">AI 音乐配置</h1>
      <p class="page-subtitle">管理音乐生成服务的开关、API端点和Token池。</p>
      <hr class="separator"> <!-- Replaced div with hr for semantics -->
    </div>

    <!-- Toggle Switches & API Config Section -->
    <!-- Combine these into a single panel for better grouping -->
    <div class="config-panel card">
      <h2 class="panel-title">常规设置</h2>
      <div class="settings-grid">
        <!-- Left Column: Toggles -->
        <div class="settings-column toggle-column">
          <h3 class="column-title">功能开关</h3>
          <div class="toggle-item">
            <label for="ai-music-switch" class="form-label">启用 AI 音乐:</label>
            <div class="switch">
              <input
                type="checkbox"
                id="ai-music-switch"
                v-model="aiMusicSwitch"
                @change="saveAiMusicSwitches"
              />
              <label for="ai-music-switch" class="switch-slider"></label>
            </div>
          </div>
          <div class="toggle-item">
            <label for="ai-opening-music-switch" class="form-label">生成开头音乐:</label>
            <div class="switch">
              <input
                type="checkbox"
                id="ai-opening-music-switch"
                v-model="aiOpeningMusicSwitch"
                @change="saveAiMusicSwitches"
              />
              <label for="ai-opening-music-switch" class="switch-slider"></label>
            </div>
          </div>
          <div class="toggle-item">
            <label for="ai-ending-music-switch" class="form-label">生成结尾音乐:</label>
            <div class="switch">
              <input
                type="checkbox"
                id="ai-ending-music-switch"
                v-model="aiEndingMusicSwitch"
                @change="saveAiMusicSwitches"
              />
              <label for="ai-ending-music-switch" class="switch-slider"></label>
            </div>
          </div>
        </div>

        <!-- Right Column: API -->
        <div class="settings-column api-column">
           <h3 class="column-title">API 配置</h3>
          <div class="form-group">
            <label for="music-url" class="form-label">音乐 API URL:</label>
            <input
              id="music-url"
              type="text"
              v-model="musicUrl"
              class="input"
              placeholder="输入音乐生成的API端点URL"
            />
          </div>
          <div class="form-group token-group">
             <label for="fallback-token" class="form-label">备用 API Token:</label>
             <div class="input-group">
                <input
                  id="fallback-token"
                  type="password"
                  v-model="fallbackMusicToken"
                  class="input"
                  placeholder="输入通用的API Token (备用)"
                />
                 <button
                  class="btn btn-secondary btn-manage-token"
                  @click="openTokenManagement"
                  title="管理Token池"
                >
                   <font-awesome-icon :icon="['fas', 'key']" /> Token管理
                </button>
             </div>
          </div>
        </div>
      </div>
       <!-- Button Section - Moved inside the panel -->
      <div class="action-container panel-actions">
        <button
          class="btn btn-primary btn-save-general"
          @click="saveGeneralAiMusicConfig"
        >
          <font-awesome-icon :icon="['fas', 'save']" /> 保存常规设置
        </button>
      </div>
    </div>


    <!-- Token Management Dialog -->
    <div class="modal" v-if="showTokenManagement" @click.self="closeTokenManagement">
      <div class="modal-content token-management-modal card" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">
             <font-awesome-icon :icon="['fas', 'key']" /> Token 管理
          </h3>
          <button class="close-btn btn btn-text btn-sm" @click="closeTokenManagement" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body token-modal-body">
           <!-- Top Section: Model Select & Verify Token -->
           <div class="token-top-section">
             <div class="form-group">
               <label for="music-model-select" class="form-label">当前音乐模型:</label>
               <select
                 id="music-model-select"
                 v-model="selectedMusicModel"
                 class="select"
                 @change="saveSelectedMusicModel"
                 :disabled="musicModels.length <= 1"
               >
                  <option v-if="musicModels.length === 0" value="" disabled>无可用音乐模型</option>
                 <option
                   v-for="model in musicModels"
                   :key="model.name"
                   :value="model.name"
                 >
                   {{ model.name }}
                 </option>
               </select>
                <span v-if="musicModels.length <= 1" class="info-text">(仅一个模型可用)</span>
             </div>

             <div class="form-group">
               <label for="initial-verify-token-input" class="form-label">初始验证Token:</label>
                <div class="input-group">
                   <input
                     id="initial-verify-token-input"
                     type="password"
                     v-model="initialVerifyToken"
                     class="input"
                     @blur="saveInitialToken"
                     @keyup.enter="saveInitialToken"
                     placeholder="用于生成新Token的验证Key"
                   />
                    <button
                       class="btn btn-primary btn-generate-all"
                       :disabled="isProcessingAnyTokenOperation"
                       @click="runGenerateAllTokens"
                       title="生成所有类型Token"
                     >
                       <font-awesome-icon :icon="['fas', 'sync-alt']" :spin="processingState.generate"/>
                       <span v-if="!processingState.generate">生成所有</span>
                     </button>
                </div>
             </div>
           </div>
          <hr class="separator thin-separator">

          <!-- Main Area: Info & Logs -->
          <div class="token-main-area">
            <!-- Left: Token Pool Info -->
            <div class="pool-info">
               <h4 class="area-title">Token 池信息</h4>
                <!-- Group tokens by kind -->
                <div v-for="(services, kind) in servicesGroupedByKind" :key="kind" class="token-kind-group card">
                    <div class="token-kind-header">
                        <h5>{{ kindDisplayNames[kind] || kind }} Token</h5>
                        <span class="badge token-count">{{ getTokenCountForKind(kind) }} 个</span>
                    </div>
                    <div class="token-kind-body">
                        <div v-for="service in services" :key="service.name" class="token-service-item">
                            <span class="service-name">{{ service.name }}:</span>
                            <span class="service-count">{{ tokenCountsByName[service.name] || 0 }} 个</span>
                            <button
                              class="btn btn-warning btn-xs btn-clear-single"
                              :disabled="isProcessingAnyTokenOperation"
                              @click="runClearToken(service.name)"
                              title="清除该服务无效的Token"
                            >
                              <font-awesome-icon :icon="['fas', 'broom']" :spin="processingState[service.name]"/>
                              <span v-if="!processingState[service.name]">清除</span>
                            </button>
                        </div>
                    </div>
                </div>
               <div v-if="Object.keys(servicesGroupedByKind).length === 0" class="no-services-msg">
                   <p>未配置任何服务或服务信息无效。</p>
               </div>
            </div>

            <!-- Right: Logs -->
            <div class="log-section">
              <h4 class="area-title">操作日志</h4>
              <div class="log-container card" ref="logContainer">
                <div v-for="(log, index) in logs" :key="index" :class="`log-entry log-${log.type}`">
                   <span class="log-message">{{ log.message }}</span>
                </div>
                <!-- Optional: Indicate processing at the end -->
                <div class="log-entry log-processing" v-if="isProcessingAnyTokenOperation">
                    <font-awesome-icon :icon="['fas', 'spinner']" spin /> 正在处理...
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Modal Footer is implicitly handled by layout now -->
      </div>
    </div>

    <!-- Message Bubble removed, relies on global toast -->
  </div>
  </div>
</template>

<script>
// Import the functions from the refactored JS module
import {
  clearInvalidTokens,
  generateTokens,
  getTokenCounts, // Get counts by name
  getPlatformServicesList // Get the list of all configured services
} from './services/aimusicService';
// Assuming FontAwesomeIcon is globally registered
// import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'; // If not global

export default {
  name: 'AiMusicConfig',
  // components: { FontAwesomeIcon }, // If needed
  data() {
    return {
      // Config State (General)
      aiMusicSwitch: false,
      aiOpeningMusicSwitch: false,
      aiEndingMusicSwitch: false,
      musicUrl: '',
      fallbackMusicToken: '',

      // Token Management State
      showTokenManagement: false,
      initialVerifyToken: '',
      platformServicesList: [],
      musicModels: [],
      selectedMusicModel: '',
      tokenCountsByName: {},
      kindDisplayNames: {
        'verify': '验证',
        'music': '音乐',
        'video': '视频',
        'image': '图像',
      },
      logs: [],
      processingState: {},
      originalConsole: null,

      // Message Bubble State Removed
      // showMessage: false,
      // messageType: 'success',
      // messageContent: '',
      // messageTimeout: null,
    };
  },
  computed: {
      servicesGroupedByKind() {
          const grouped = {};
          (this.platformServicesList || []).forEach(service => { // Add null check for safety
              if (!service || !service.kind) return; // Skip invalid services
              if (!grouped[service.kind]) {
                  grouped[service.kind] = [];
                  if (this.processingState[service.kind] === undefined) {
                      this.processingState[service.kind] = false;
                  }
              }
              if (this.processingState[service.name] === undefined) {
                 this.processingState[service.name] = false;
              }
              grouped[service.kind].push(service);
          });
          if (this.processingState.generate === undefined) {
             this.processingState['generate'] = false;
          }
          return grouped;
      },
      isProcessingAnyTokenOperation() {
          return Object.values(this.processingState).some(state => state === true);
      }
  },
  mounted() {
    this.loadAiMusicConfig();
  },
  beforeUnmount() {
    this.restoreConsole();
    // No timeout to clear
    // if (this.messageTimeout) {
    //   clearTimeout(this.messageTimeout);
    // }
  },
  methods: {
    // --- Console Capture Methods (Keep as is) ---
    setupConsoleCapture() {
      if (this.originalConsole) return;
      this.originalConsole = { log: console.log, info: console.info, warn: console.warn, error: console.error, debug: console.debug };
      const capture = (type, ...args) => {
         if (this.originalConsole?.[type]) { // Check if originalConsole exists before calling
             this.originalConsole[type](...args);
         }
         if (this.showTokenManagement) {
             let message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
             this.logToTokenWindow(message, type);
         }
      };
      console.log = (...args) => capture('log', ...args);
      console.info = (...args) => capture('info', ...args);
      console.warn = (...args) => capture('warning', ...args);
      console.error = (...args) => capture('error', ...args);
      console.debug = (...args) => capture('debug', ...args);
    },
    restoreConsole() {
      if (this.originalConsole) {
        console.log = this.originalConsole.log;
        console.info = this.originalConsole.info;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
        console.debug = this.originalConsole.debug;
        this.originalConsole = null;
      }
    },

    // --- Config Management (General) ---
    loadAiMusicConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (config.AI音乐) {
          this.aiMusicSwitch = config.AI音乐.if_on ?? false;
          this.aiOpeningMusicSwitch = config.AI音乐.opening_if_on ?? false;
          this.aiEndingMusicSwitch = config.AI音乐.ending_if_on ?? false;
          this.musicUrl = config.AI音乐.base_url || '';
          this.fallbackMusicToken = config.AI音乐.api_key || '';
          this.selectedMusicModel = config.AI音乐.model || '';
        }
      } catch (error) {
        console.error('Failed to load AI music config:', error);
        this.$emit('show-message', { title: 'error', message: '加载AI音乐配置失败' }); // Use $emit
      }
    },
    saveAiMusicSwitches() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.AI音乐) config.AI音乐 = {};
        config.AI音乐.if_on = this.aiMusicSwitch;
        config.AI音乐.opening_if_on = this.aiOpeningMusicSwitch;
        config.AI音乐.ending_if_on = this.aiEndingMusicSwitch;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        // No local message bubble, emit success if needed
        // this.$emit('show-message', { title: 'success', message: '音乐开关配置已保存' });
      } catch (error) {
        console.error('Failed to save AI music switches:', error);
        this.$emit('show-message', { title: 'error', message: '保存开关配置失败' }); // Use $emit
      }
    },
    saveGeneralAiMusicConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.AI音乐) config.AI音乐 = {};
        config.AI音乐.base_url = this.musicUrl;
        config.AI音乐.api_key = this.fallbackMusicToken;
        // selectedMusicModel saved separately
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        this.$emit('show-message', { title: 'success', message: 'AI音乐常规配置已保存' }); // Use $emit
      } catch (error) {
        console.error('Failed to save general AI music config:', error);
        this.$emit('show-message', { title: 'error', message: '保存常规配置失败' }); // Use $emit
      }
    },

    // --- Token Management Modal ---
    async openTokenManagement() {
      this.showTokenManagement = true;
      this.logs = [];
      this.logToTokenWindow('Token管理窗口已打开', 'info');
      this.loadTokenManagementConfig();
      try {
          this.platformServicesList = getPlatformServicesList();
          this.musicModels = (this.platformServicesList || []).filter(service => service.kind === 'music'); // Add null check

           if (!this.selectedMusicModel && this.musicModels.length > 0) {
               this.selectedMusicModel = this.musicModels[0].name;
               this.saveSelectedMusicModel();
           } else if (this.selectedMusicModel && !this.musicModels.find(m => m.name === this.selectedMusicModel)) {
               this.selectedMusicModel = this.musicModels.length > 0 ? this.musicModels[0].name : '';
               this.saveSelectedMusicModel();
           }

          // Initialize processing state
          this.processingState = {}; // Reset state
           (this.platformServicesList || []).forEach(service => { // Add null check
                if (service && service.name) this.processingState[service.name] = false;
            });
            this.processingState['generate'] = false;

      } catch (error) {
          console.error('Failed to load platform services list:', error);
          this.logToTokenWindow('加载服务列表失败', 'error');
           this.platformServicesList = []; // Ensure it's an empty array on error
           this.musicModels = [];
      }
      this.updateTokenCounts();
      this.setupConsoleCapture();
    },
    closeTokenManagement() {
      this.saveInitialToken();
      this.restoreConsole();
      this.showTokenManagement = false;
      this.processingState = {}; // Clear state on close
    },
    loadTokenManagementConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        this.initialVerifyToken = config?.AI音乐?.tokenpool?.initial_verify_token || '';
         // Ensure structure exists if loading for the first time
         if (!config.AI音乐) config.AI音乐 = {};
         if (!config.AI音乐.tokenpool) {
             config.AI音乐.tokenpool = { initial_verify_token: '' };
             localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
         }
      } catch (error) {
        console.error('Failed to load token management config:', error);
        this.logToTokenWindow('加载Token管理配置失败', 'error');
      }
    },
     saveSelectedMusicModel() {
        try {
            const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
            if (!config.AI音乐) config.AI音乐 = {};
            config.AI音乐.model = this.selectedMusicModel;
            localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
            // Optional: Log success to modal if open
            if(this.showTokenManagement) {
                 this.logToTokenWindow(`音乐生成模型已设置为: ${this.selectedMusicModel || '无'}`, 'success');
            }
        } catch (error) {
            console.error('Failed to save selected music model:', error);
             if(this.showTokenManagement) {
                this.logToTokenWindow('保存音乐模型失败', 'error');
             }
            // Optionally emit global error
            this.$emit('show-message', { title: 'error', message: '保存音乐模型选择失败' });
        }
     },
    saveInitialToken() {
      // Only save if the modal is *not* open, or maybe on blur/enter inside modal
      // This prevents saving an empty token just by closing the modal if it was never set.
      // Let's trigger save on blur/enter and close.
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.AI音乐) config.AI音乐 = {};
        if (!config.AI音乐.tokenpool) config.AI音乐.tokenpool = {};
        config.AI音乐.tokenpool.initial_verify_token = this.initialVerifyToken;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        // Don't log here unless specifically triggered by user action (blur/enter)
      } catch (error) {
        console.error('Failed to save initial token:', error);
        // Log error only if modal is open
        if (this.showTokenManagement) {
            this.logToTokenWindow('自动保存初始验证token失败', 'error');
        }
      }
    },
    async updateTokenCounts() {
      try {
        this.tokenCountsByName = await getTokenCounts();
        if (this.showTokenManagement) { // Only log if modal is open
            this.logToTokenWindow('Token数量已刷新', 'info');
        }
      } catch (error) {
        console.error('Failed to update token counts:', error);
         if (this.showTokenManagement) {
             this.logToTokenWindow('刷新Token数量失败', 'error');
         }
        this.tokenCountsByName = {};
      }
    },
    getTokenCountForKind(kind) {
         let total = 0;
         const servicesOfKind = (this.servicesGroupedByKind[kind] || []);
         servicesOfKind.forEach(service => {
             total += this.tokenCountsByName[service.name] || 0;
         });
         return total;
     },
    logToTokenWindow(message, type = 'info') {
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const logMessage = `[${timeString}] ${message}`;
      this.logs.push({ message: logMessage, type });
      if (this.logs.length > 200) this.logs.shift();
      this.$nextTick(() => {
        const container = this.$refs.logContainer;
        if (container) container.scrollTop = container.scrollHeight;
      });
    },

    // --- Token Operations ---
    async runGenerateAllTokens() {
      this.logToTokenWindow(`开始生成所有类型 Token...`, 'info');
      this.processingState['generate'] = true;
      try {
        const result = await generateTokens();
        if (result === 'success') {
          this.logToTokenWindow(`Token 生成成功.`, 'success');
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.updateTokenCounts();
        } else {
          this.logToTokenWindow(`Token 生成失败 (详见控制台).`, 'error');
        }
      } catch (error) {
        console.error(`Token generation error:`, error);
        this.logToTokenWindow(`Token 生成失败: ${error.message}`, 'error');
      } finally {
        this.processingState['generate'] = false;
        this.logToTokenWindow('Token 生成结束.', 'info');
      }
    },
    async runClearToken(serviceName) {
       if (!serviceName) return;
      this.logToTokenWindow(`开始清除无效 ${serviceName} Token...`, 'info');
      this.processingState[serviceName] = true;
      try {
        const result = await clearInvalidTokens(serviceName);
        if (result === 'success') {
          this.logToTokenWindow(`清除无效 ${serviceName} Token 成功.`, 'success');
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.updateTokenCounts();
        } else {
          this.logToTokenWindow(`清除无效 ${serviceName} Token 失败 (详见控制台).`, 'error');
        }
      } catch (error) {
        console.error(`Error clearing ${serviceName} tokens:`, error);
        this.logToTokenWindow(`清除无效 ${serviceName} token 失败: ${error.message}`, 'error');
      } finally {
        this.processingState[serviceName] = false;
        this.logToTokenWindow(`清除无效 ${serviceName} Token 结束.`, 'info');
      }
    },

    // --- Message Bubble Method Removed ---
    // showMessageBubble(type, content) { ... } removed
  }
};
</script>

<style scoped>
/* Use scoped styles for component-specific layout and adjustments */

/* General Component Styling */
.ai-music-config-container {
  /* Inherits .card */
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

.page-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 5px;
}
.page-subtitle {
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: 15px;
}

/* Config Panel (General Settings) */
.config-panel {
  /* Inherits .card */
  padding: 20px;
  margin-bottom: 25px;
  background-color: var(--surface-color); /* Slightly different background */
}
.panel-title {
  font-size: 1.3rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

/* Settings Grid Layout */
.settings-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 30px; /* Space between columns */
}
.settings-column {
    flex: 1;
    min-width: 280px; /* Minimum width before stacking */
    display: flex;
    flex-direction: column;
    gap: 15px;
}
.column-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 5px;
}

/* Toggle Styles */
.toggle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px dashed var(--border-color);
}
.toggle-item:last-child {
    border-bottom: none;
}
.toggle-item .form-label {
    margin-bottom: 0; /* Remove bottom margin */
    color: var(--text-primary); /* Make label text primary */
}
/* Inherit switch styles from global */

/* API Column Styles */
.form-group {
    margin-bottom: 15px;
}
.form-label {
    display: block;
    margin-bottom: 6px;
    color: var(--text-secondary);
    font-size: 0.95rem;
    font-weight: 500;
}
.input-group {
    display: flex;
    gap: 10px;
    align-items: center;
}
.input-group .input {
    flex-grow: 1; /* Input takes available space */
}
.btn-manage-token {
    flex-shrink: 0; /* Prevent button from shrinking */
}

/* Panel Actions */
.panel-actions {
    margin-top: 20px;
    text-align: right;
}

/* Token Management Modal Styles */
.modal {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  padding: 15px;
  overflow-y: auto; /* Allow modal overlay to scroll if needed */
}

.modal-content.token-management-modal {
  width: 100%;
  max-width: 900px; /* Wider modal for two columns */
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent card overflow, body will scroll */
  padding: 0; /* Remove padding from card, apply to sections */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding: 15px 20px;
  flex-shrink: 0;
}
.modal-title {
  font-size: 1.25rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.close-btn {
  /* Uses .btn .btn-text .btn-sm */
}

.modal-body.token-modal-body {
  overflow-y: auto; /* Scroll only the body */
  flex-grow: 1;
  padding: 20px; /* Add padding inside the body */
}

/* Token Modal Top Section */
.token-top-section {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: flex-end; /* Align bottom */
    margin-bottom: 15px;
}
.token-top-section .form-group {
    flex: 1;
    min-width: 250px;
    margin-bottom: 0; /* Remove default margin */
}
.token-top-section .input-group {
    align-items: stretch; /* Make button same height */
}
.btn-generate-all {
    white-space: nowrap;
}

.info-text {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    display: block;
    margin-top: 4px;
}

/* Token Modal Main Area (2 columns) */
.token-main-area {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 15px;
}
.pool-info, .log-section {
  flex: 1;
  min-width: 300px; /* Min width before stacking */
  display: flex;
  flex-direction: column;
}
.area-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 15px;
}

/* Token Pool Info Styles */
.token-kind-group {
    /* Inherits .card */
    margin-bottom: 15px;
    padding: 15px;
    background-color: var(--background-color); /* Slightly different */
}
.token-kind-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px dashed var(--border-color);
}
.token-kind-header h5 {
    margin: 0;
    font-size: 1rem;
    color: var(--primary-color);
}
.token-count {
    /* Uses global .badge */
    font-size: 0.8rem;
}
.token-kind-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.token-service-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
    padding: 5px 0;
}
.service-name {
    font-weight: 500;
    color: var(--text-secondary);
}
.service-count {
    color: var(--text-primary);
}
.btn-clear-single {
    /* Uses .btn .btn-warning .btn-xs */
    padding: 3px 8px;
}
.no-services-msg {
    color: var(--text-tertiary);
    padding: 10px;
    text-align: center;
}

/* Log Section Styles */
.log-container {
  /* Inherits .card */
  flex-grow: 1;
  overflow-y: auto;
  height: 300px; /* Fixed height for scroll */
  padding: 10px;
  font-size: 0.85rem;
  line-height: 1.6;
  background-color: var(--background-color); /* Slightly different */
}
.log-entry {
  margin-bottom: 5px;
  padding-bottom: 5px;
  border-bottom: 1px dotted var(--border-color);
  word-wrap: break-word;
  white-space: pre-wrap; /* Preserve whitespace/newlines */
}
.log-entry:last-child {
  border-bottom: none;
}
/* Log Types */
.log-info { color: var(--text-secondary); }
.log-success { color: var(--secondary-color); font-weight: 500; }
.log-warning { color: var(--warning-color); }
.log-error { color: var(--danger-color); font-weight: 500;}
.log-debug { color: var(--info-color); opacity: 0.8; }
.log-log { color: var(--text-primary); } /* Default console.log */

.log-processing {
    color: var(--primary-color);
    font-style: italic;
    display: flex;
    align-items: center;
    gap: 5px;
}

/* Message Bubble Styling Removed */

/* Responsive Adjustments */
@media (max-width: 768px) {
    .settings-grid {
        flex-direction: column; /* Stack general settings columns */
    }
    .token-main-area {
        flex-direction: column; /* Stack token info and logs */
    }
     .modal-content.token-management-modal {
        max-width: 95%; /* Allow modal more width */
     }
}

</style>