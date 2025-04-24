<template>
  <div class="ai-music-config-container">
    <!-- Title Section -->
    <div class="title-section">
      <h1 class="page-title">AI 音乐配置</h1>
      <div class="separator"></div>
    </div>

    <!-- Toggle Switches Section -->
    <div class="config-panel">
      <h2 class="panel-title">音乐生成选项</h2>
      <div class="toggle-grid">
        <div class="toggle-row">
          <label class="toggle-label-music">生成背景音乐:</label>
          <div class="toggle-switch">
            <input 
              type="checkbox" 
              id="ai-music-switch" 
              v-model="aiMusicSwitch"
              @change="saveAiMusicSwitch"
            />
            <label for="ai-music-switch" class="toggle-label-switch"></label>
          </div>
        </div>
        <div class="toggle-row">
          <label class="toggle-label-music">生成开头音乐:</label>
          <div class="toggle-switch">
            <input 
              type="checkbox" 
              id="ai-opening-music-switch" 
              v-model="aiOpeningMusicSwitch"
              @change="saveAiMusicSwitch"
            />
            <label for="ai-opening-music-switch" class="toggle-label-switch"></label>
          </div>
        </div>
        <div class="toggle-row">
          <label class="toggle-label-music">生成结尾音乐:</label>
          <div class="toggle-switch">
            <input 
              type="checkbox" 
              id="ai-ending-music-switch" 
              v-model="aiEndingMusicSwitch"
              @change="saveAiMusicSwitch"
            />
            <label for="ai-ending-music-switch" class="toggle-label-switch"></label>
          </div>
        </div>
      </div>
    </div>

    <!-- API Configuration Section -->
    <div class="config-panel">
      <h2 class="panel-title">API 配置</h2>
      <div class="form-group">
        <label>音乐 URL:</label>
        <input 
          type="text" 
          v-model="musicUrl" 
          class="text-input"
          placeholder="输入音乐生成的API端点URL"
        />
      </div>
      <div class="form-group token-group">
        <label>音乐 Token:</label>
        <input 
          type="text" 
          v-model="musicToken" 
          class="text-input"
          placeholder="输入API Token"
        />
        <button 
          class="btn btn-outline"
          @click="openTokenManagement"
        >
          Token管理
        </button>
      </div>
    </div>

    <!-- Button Section -->
    <div class="action-container">
      <button 
        class="btn btn-accent"
        @click="saveAiMusicConfig"
      >
        <i class="icon">💾</i> 保存配置
      </button>
    </div>

    <!-- Token Management Dialog -->
    <div class="modal-overlay" v-if="showTokenManagement" @click="closeTokenManagement">
      <div class="modal-container token-management-modal" @click.stop>
        <div class="modal-header">
          <h2>Token 管理</h2>
          <button class="close-button" @click="closeTokenManagement">&times;</button>
        </div>
        <div class="modal-body">
          <div class="top-section">
            <div class="initial-token-section">
              <label>初始验证token:</label>
              <input 
                type="text" 
                v-model="initialVerifyToken" 
                class="text-input"
                @blur="saveInitialToken"
                @keyup.enter="saveInitialToken"
              />
            </div>
          </div>
          <div class="separator"></div>

          <div class="main-area">
            <div class="pool-info">
              <div class="info-panel">
                <h3>token池信息</h3>
                <div class="token-info">
                  <p>{{ musicTokenCount }}</p>
                  <div class="button-group">
                    <button 
                      class="btn btn-primary"
                      :disabled="isProcessingMusic"
                      @click="runGetToken('music')"
                    >
                      <span v-if="isProcessingMusic">处理中...</span>
                      <span v-else>获取token</span>
                    </button>
                    <button 
                      class="btn btn-primary"
                      :disabled="isProcessingMusic"
                      @click="runClearToken('music')"
                    >
                      <span v-if="isProcessingMusic">处理中...</span>
                      <span v-else>清除无效token</span>
                    </button>
                  </div>
                </div>

                <div class="separator token-separator"></div>

                <div class="token-info">
                  <p>{{ verifyTokenCount }}</p>
                  <div class="button-group">
                    <button 
                      class="btn btn-primary"
                      :disabled="isProcessingVerify"
                      @click="runGetToken('verify')"
                    >
                      <span v-if="isProcessingVerify">处理中...</span>
                      <span v-else>获取token</span>
                    </button>
                    <button 
                      class="btn btn-primary"
                      :disabled="isProcessingVerify"
                      @click="runClearToken('verify')"
                    >
                      <span v-if="isProcessingVerify">处理中...</span>
                      <span v-else>清除无效token</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="log-section">
              <h3>日志</h3>
              <div class="log-container" ref="logContainer">
                <div v-for="(log, index) in logs" :key="index" :class="`log-entry ${log.type}`">
                  {{ log.message }}
                </div>
                <div class="pulse-cursor" v-if="isProcessing"></div>
              </div>
            </div>
          </div>
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
import { gettoken, cleartoken } from './services/aimusicService';

export default {
  name: 'AiMusicConfig',
  data() {
    return {
      // Config State
      aiMusicSwitch: false,
      aiOpeningMusicSwitch: false,
      aiEndingMusicSwitch: false,
      musicUrl: '',
      musicToken: '',
      
      // Token Management
      showTokenManagement: false,
      initialVerifyToken: '',
      musicTokenCount: '音乐token数: 0',
      verifyTokenCount: '验证token数: 0',
      logs: [],
      isProcessingMusic: false,
      isProcessingVerify: false,
      
      // Console capture
      originalConsole: null,
      
      // Message Bubble
      showMessage: false,
      messageType: 'success',
      messageContent: '',
      messageTimeout: null
    };
  },
  computed: {
    isProcessing() {
      return this.isProcessingMusic || this.isProcessingVerify;
    }
  },
  mounted() {
    this.loadAiMusicConfig();
  },
  methods: {
    // Console Capture Methods
    setupConsoleCapture() {
      // Store original console methods
      this.originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
      };
      
      // Override console methods
      console.log = (message, ...args) => {
        this.originalConsole.log(message, ...args); // Still log to console
        this.captureConsoleOutput('log', message, args);
      };
      
      console.info = (message, ...args) => {
        this.originalConsole.info(message, ...args);
        this.captureConsoleOutput('info', message, args);
      };
      
      console.warn = (message, ...args) => {
        this.originalConsole.warn(message, ...args);
        this.captureConsoleOutput('warning', message, args);
      };
      
      console.error = (message, ...args) => {
        this.originalConsole.error(message, ...args);
        this.captureConsoleOutput('error', message, args);
      };
    },
    
    restoreConsole() {
      if (this.originalConsole) {
        console.log = this.originalConsole.log;
        console.info = this.originalConsole.info;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
      }
    },
    
    captureConsoleOutput(type, message, args) {
      if (!this.showTokenManagement) return; // Only capture when token management is open
      
      let formattedMessage = message;
      
      if (typeof message === 'object') {
        try {
          formattedMessage = JSON.stringify(message, null, 2);
        } catch (err) {
          formattedMessage = String(message);
        }
      }
      
      if (args && args.length > 0) {
        try {
          const formattedArgs = args.map(arg => {
            if (typeof arg === 'object') {
              return JSON.stringify(arg, null, 2);
            } else {
              return String(arg);
            }
          }).join(' ');
          formattedMessage = `${formattedMessage} ${formattedArgs}`;
        } catch (err) {
          // Ignore error in formatting args
        }
      }
      
      this.logToTokenWindow(formattedMessage, type);
    },
    
    // Config Management
    loadAiMusicConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (config.AI音乐) {
          this.aiMusicSwitch = config.AI音乐.if_on || false;
          this.aiOpeningMusicSwitch = config.AI音乐.opening_if_on || false;
          this.aiEndingMusicSwitch = config.AI音乐.ending_if_on || false;
          this.musicUrl = config.AI音乐.base_url || '';
          this.musicToken = config.AI音乐.api_key || '';
        }
      } catch (error) {
        console.error('Failed to load AI music config:', error);
      }
    },
    
    saveAiMusicSwitch() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (!config.AI音乐) {
          config.AI音乐 = {};
        }
        
        config.AI音乐.if_on = this.aiMusicSwitch;
        config.AI音乐.opening_if_on = this.aiOpeningMusicSwitch;
        config.AI音乐.ending_if_on = this.aiEndingMusicSwitch;
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
      } catch (error) {
        console.error('Failed to save AI music switch:', error);
        this.showMessageBubble('error', '保存配置失败');
      }
    },
    
    saveAiMusicConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (!config.AI音乐) {
          config.AI音乐 = {};
        }
        
        config.AI音乐.base_url = this.musicUrl;
        config.AI音乐.api_key = this.musicToken;
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        this.showMessageBubble('success', 'AI音乐配置保存成功!');
      } catch (error) {
        console.error('Failed to save AI music config:', error);
        this.showMessageBubble('error', '保存配置失败');
      }
    },
    
    // Token Management
    openTokenManagement() {
      this.showTokenManagement = true;
      this.loadTokenManagementConfig();
      this.updateTokenCounts();
      this.logs = []; // Clear logs
      this.logToTokenWindow('Token管理窗口已打开', 'info');
      
      // Setup console capture when opening token management
      this.$nextTick(() => {
        this.setupConsoleCapture();
      });
    },
    
    closeTokenManagement() {
      // Save token before closing
      this.saveInitialToken();
      
      // Restore console
      this.restoreConsole();
      
      this.showTokenManagement = false;
    },
    
    loadTokenManagementConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (config.AI音乐 && config.AI音乐.tokenpool) {
          this.initialVerifyToken = config.AI音乐.tokenpool.initial_verify_token || '';
        }
      } catch (error) {
        console.error('Failed to load token management config:', error);
      }
    },
    
    saveInitialToken() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (!config.AI音乐) {
          config.AI音乐 = {};
        }
        
        if (!config.AI音乐.tokenpool) {
          config.AI音乐.tokenpool = {};
        }
        
        config.AI音乐.tokenpool.initial_verify_token = this.initialVerifyToken;
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        this.logToTokenWindow('初始验证token已保存', 'success');
      } catch (error) {
        console.error('Failed to save initial token:', error);
        this.logToTokenWindow('保存初始验证token失败', 'error');
      }
    },
    
    updateTokenCounts() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        const musicTokens = config.AI音乐?.tokenpool?.music_token_list || [];
        const verifyTokens = config.AI音乐?.tokenpool?.verify_token_list || [];
        
        const musicCount = Array.isArray(musicTokens) ? musicTokens.length : 0;
        const verifyCount = Array.isArray(verifyTokens) ? verifyTokens.length : 0;
        
        this.musicTokenCount = `音乐token数: ${musicCount}`;
        this.verifyTokenCount = `验证token数: ${verifyCount}`;
        
        this.logToTokenWindow(`Token数量已刷新 (音乐: ${musicCount}, 验证: ${verifyCount})`, 'info');
      } catch (error) {
        console.error('Failed to update token counts:', error);
      }
    },
    
    logToTokenWindow(message, type = 'info') {
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const logMessage = `[${timeString}] ${message}`;
      
      this.logs.push({ message: logMessage, type });
      
      // Limit logs to prevent performance issues
      if (this.logs.length > 100) {
        this.logs.shift();
      }
      
      // Scroll to bottom of log container
      this.$nextTick(() => {
        if (this.$refs.logContainer) {
          this.$refs.logContainer.scrollTop = this.$refs.logContainer.scrollHeight;
        }
      });
    },
    
    // Token Operations
    async runGetToken(kind) {
      this.logToTokenWindow(`开始请求获取 ${kind} token...`, 'info');
      
      if (kind === 'music') {
        this.isProcessingMusic = true;
      } else {
        this.isProcessingVerify = true;
      }
      
      try {
        const result = await gettoken(kind);
        
        if (result === 'success') {
          this.logToTokenWindow(`获取 ${kind} token 成功.`, 'success');
          this.updateTokenCounts();
        } else {
          this.logToTokenWindow(`获取 ${kind} token 失败 (错误信息: ${result}).`, 'error');
        }
      } catch (error) {
        console.error(`Failed to get ${kind} token:`, error);
        this.logToTokenWindow(`获取 ${kind} token 失败: ${error.message}`, 'error');
      } finally {
        if (kind === 'music') {
          this.isProcessingMusic = false;
        } else {
          this.isProcessingVerify = false;
        }
      }
    },
    
    async runClearToken(kind) {
      this.logToTokenWindow(`开始请求清除无效 ${kind} token...`, 'info');
      
      if (kind === 'music') {
        this.isProcessingMusic = true;
      } else {
        this.isProcessingVerify = true;
      }
      
      try {
        const result = await cleartoken(kind);
        
        if (result === 'success') {
          this.logToTokenWindow(`清除无效 ${kind} token 操作成功.`, 'success');
          this.updateTokenCounts();
        } else {
          this.logToTokenWindow(`清除无效 ${kind} token 操作失败 (结果: ${result}).`, 'error');
        }
      } catch (error) {
        console.error(`Failed to clear ${kind} tokens:`, error);
        this.logToTokenWindow(`清除无效 ${kind} token 失败: ${error.message}`, 'error');
      } finally {
        if (kind === 'music') {
          this.isProcessingMusic = false;
        } else {
          this.isProcessingVerify = false;
        }
      }
    },
    
    // Message Bubble
    showMessageBubble(type, content) {
      this.messageType = type;
      this.messageContent = content;
      this.showMessage = true;
      
      // Clear previous timeout if exists
      if (this.messageTimeout) {
        clearTimeout(this.messageTimeout);
      }
      
      // Hide message after 3 seconds
      this.messageTimeout = setTimeout(() => {
        this.showMessage = false;
      }, 3000);
    }
  },
  beforeUnmount() {
    // Make sure to restore console when component is unmounted
    this.restoreConsole();
    
    // Clear any pending timeouts
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
  }
};
</script>

<style scoped>
/* Main Container */
.ai-music-config-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Segoe UI', Arial, sans-serif;
  color: var(--text-primary);
  position: relative;
  transition: color 0.3s;
}

/* Title Section */
.title-section {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  transition: color 0.3s;
}

.separator {
  height: 1px;
  background-color: var(--border-color);
  margin: 0.75rem 0;
  transition: background-color 0.3s;
}

/* Config Panels */
.config-panel {
  background-color: var(--sidebar-bg);
  border-radius: 12px;
  padding: 1.75rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow);
  transition: all 0.3s;
  border: 1px solid var(--border-color);
}

.panel-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.75rem;
  transition: color 0.3s, border-color 0.3s;
}

/* Toggle Grid */
.toggle-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.toggle-row {
  display: flex;
  align-items: center;
}

.toggle-label-music {
  min-width: 150px;
  font-weight: 500;
  color: var(--text-primary);
  transition: color 0.3s;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 30px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label-switch {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: .4s;
  border-radius: 34px;
}

.toggle-label-switch:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-label-switch {
  background-color: var(--active-bg);
}

input:checked + .toggle-label-switch:before {
  transform: translateX(30px);
}

/* Form Elements */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
  transition: color 0.3s;
}

.token-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.token-group label {
  margin-bottom: 0;
  min-width: 100px;
}

.token-group .text-input {
  flex: 1;
}

.text-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background-color: var(--content-bg);
  color: var(--text-primary);
  transition: all 0.3s;
}

.text-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
}

.text-input::placeholder {
  color: var(--text-secondary);
}

/* Action Container */
.action-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;
}

/* Token Management Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background-color: var(--content-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 850px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow);
  border: 1px solid var(--border-color);
  transition: all 0.3s;
}

.token-management-modal {
  height: 650px;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--sidebar-bg);
  transition: all 0.3s;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.3s;
}

.close-button:hover {
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1.75rem;
  max-height: 77vh;
  background-color: var(--content-bg);
  transition: background-color 0.3s;
}

/* Token Management Content */
.top-section {
  margin-bottom: 1.5rem;
}

.initial-token-section {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.initial-token-section label {
  font-weight: 500;
  white-space: nowrap;
  color: var(--text-primary);
  transition: color 0.3s;
}

.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 1.75rem;
}

.pool-info {
  flex: 0 0 300px;
}

.info-panel {
  background-color: var(--sidebar-bg);
  border-radius: 12px;
  padding: 1.5rem;
  height: 100%;
  border: 1px solid var(--border-color);
  transition: all 0.3s;
}

.info-panel h3 {
  margin-top: 0;
  margin-bottom: 1.25rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s;
}

.token-info {
  margin-bottom: 1.75rem;
}

.token-info p {
  margin: 0 0 1rem 0;
  font-weight: 500;
  color: var(--text-primary);
  transition: color 0.3s;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.token-separator {
  margin: 1.75rem 0;
}

.log-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s;
}

.log-container {
  flex: 1;
  background-color: var(--sidebar-bg);
  border-radius: 12px;
  padding: 1.25rem;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  font-family: 'Consolas', monospace;
  font-size: 0.9rem;
  color: var(--text-primary);
  transition: all 0.3s;
  position: relative;
}

.log-entry {
  margin-bottom: 0.75rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.log-entry.info {
  color: var(--text-primary);
}

.log-entry.success {
  color: #4ade80;
}

.log-entry.warning {
  color: #facc15;
}

.log-entry.error {
  color: #f87171;
}

.pulse-cursor {
  position: relative;
  width: 10px;
  height: 16px;
  background-color: var(--active-bg);
  display: inline-block;
  margin-left: 4px;
  vertical-align: middle;
  animation: cursor-blink 1.2s infinite;
}

@keyframes cursor-blink {
  0% { opacity: 1; }
  50% { opacity: 0.2; }
  100% { opacity: 1; }
}

/* Buttons */
.btn {
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  margin-right: 0.75rem;
}

.btn-primary {
  background-color: var(--hover-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  transition: all 0.3s;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--sidebar-bg);
  transform: translateY(-1px);
}

.btn-outline {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  transition: all 0.3s;
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--hover-bg);
  transform: translateY(-1px);
}

.btn-accent {
  background-color: var(--active-bg);
  color: white;
  transition: all 0.3s;
}

.btn-accent:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(79, 70, 229, 0.3);
}

/* Message Bubble */
.message-bubble {
  position: fixed;
  bottom: 30px;
  right: 30px;
  padding: 12px 18px;
  border-radius: 8px;
  background-color: var(--sidebar-bg);
  color: var(--text-primary);
  font-size: 0.95rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transform: translateY(100px);
  opacity: 0;
  transition: all 0.3s ease-out;
  z-index: 1100;
  border: 1px solid var(--border-color);
}

.message-bubble.active {
  transform: translateY(0);
  opacity: 1;
}

.message-bubble.success {
  background-color: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #10b981;
}

.message-bubble.error {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #ef4444;
}

/* Responsive Adjustments */
@media (max-width: 900px) {
  .main-area {
    flex-direction: column;
  }
  
  .pool-info {
    flex: 0 0 auto;
    width: 100%;
    margin-bottom: 1.5rem;
  }
  
  .log-container {
    max-height: 500px;
  }
}

@media (max-width: 768px) {
  .token-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .token-group label {
    margin-bottom: 0.5rem;
  }
  
  .config-panel {
    padding: 1.5rem;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .ai-music-config-container {
    padding: 1.5rem 1rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .initial-token-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>