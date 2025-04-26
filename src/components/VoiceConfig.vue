<template>
  <div class="voice-config">
    <!-- Header Section -->
    <div class="header-section">
      <h1 class="title">语音合成配置</h1>
      <p class="subtitle">配置语音文件、文本内容和模型参数</p>

      <!-- Proxy Switch -->
      <div class="proxy-config">
        <label for="proxy-switch" class="proxy-label">使用本地代理:</label>
        <label class="toggle-switch">
          <input type="checkbox" id="proxy-switch" v-model="useLocalProxy">
          <span class="toggle-label-switch"></span>
        </label>
      </div>

      <!-- SoVITS URL Input -->
      <div class="sovits-url-config">
        <label for="sovits-url">SoVITS URL:</label>
        <input type="text" id="sovits-url" v-model="sovitsURL" placeholder="http://127.0.0.1:9880">
      </div>

      <!-- Emotion Selector -->
      <div class="emotion-switcher">
        <div class="emotion-title">语气选择:</div>
        <div class="emotion-options">
          <button
            v-for="emotion in emotions"
            :key="emotion.value"
            @click="switchEmotion(emotion.value)"
            class="emotion-btn"
            :class="{ active: currentEmotion === emotion.value }"
          >
            <span class="emotion-icon">{{ emotion.icon }}</span>
            <span class="emotion-label">{{ emotion.label }}</span>
          </button>
        </div>
      </div>

      <div class="separator"></div>
    </div>

    <!-- Main Content Area -->
    <div class="content-section">
      <!-- Current Emotion Indicator -->
      <div class="current-emotion-indicator" :class="`emotion-${currentEmotion}`">
        <span class="emotion-indicator-icon">{{ getCurrentEmotionIcon() }}</span>
        <span class="emotion-indicator-text">当前配置语气: {{ getCurrentEmotionLabel() }}</span>
      </div>

      <!-- Header Row -->
      <div class="table-header">
        <div class="col-index">序号</div>
        <div class="col-file">音频文件</div>
        <div class="col-text">文本内容</div>
        <div class="col-model">模型名称</div>
      </div>

      <!-- Entries without scroll -->
      <div class="entries-container-no-scroll">
        <div
          v-for="(_, index) in 7"
          :key="index"
          class="entry-row"
          :class="{ 'even-row': index % 2 === 1 }"
        >
          <div class="col-index">{{ index + 1 }}</div>
          <div class="col-file">
            <textarea
              v-model="filePaths[index]"
              placeholder="输入音频文件路径"
              rows="2"
            ></textarea>
          </div>
          <div class="col-text">
            <textarea
              v-model="textContents[index]"
              placeholder="输入文本内容"
              rows="2"
            ></textarea>
          </div>
          <div class="col-model">
            <textarea
              v-model="modelNames[index]"
              placeholder="输入模型名称"
              rows="2"
            ></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Control Panel -->
    <div class="control-panel">
      <h3 class="panel-title">批量操作</h3>

      <div class="control-row">
        <button class="btn btn-primary" @click="fillTextContent">
          <span class="btn-icon">✍️</span> 一键填入文本内容
        </button>

        <div class="model-fill-section">
          <label>批量设置模型名称:</label>
          <input
            type="text"
            v-model="batchModelName"
            placeholder="输入要应用的模型名称"
          />
          <button class="btn btn-primary" @click="fillModelNames">
            <span class="btn-icon">✍️</span> 应用到全部
          </button>
        </div>
      </div>

      <div class="control-row">
        <span class="help-text">
          <span class="tip-highlight">提示:</span>
          当前编辑的是<strong>{{ getCurrentEmotionLabel() }}</strong>语气的配置
        </span>
        <button class="btn btn-success" @click="saveConfig">
          <span class="btn-icon">💾</span> 保存配置
        </button>
      </div>
    </div>

    <!-- Message Bubble for notifications -->
    <div
      class="message-bubble"
      :class="{ active: showMessage, success: messageType === 'success', error: messageType === 'error' }"
    >
      <span>{{ messageContent }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VoiceConfig',
  data() {
    return {
      // Emotion configuration
      emotions: [
        { value: 'normal', label: '普通', icon: '😐' },
        { value: 'happy', label: '开心', icon: '😄' },
        { value: 'sad', label: '悲伤', icon: '😢' },
        { value: 'angry', label: '生气', icon: '😠' }
      ],
      currentEmotion: 'normal',

      // Configuration arrays
      filePaths: Array(7).fill(''),
      textContents: Array(7).fill(''),
      modelNames: Array(7).fill(''),

      // Batch operations
      batchModelName: '',

      // Message system
      showMessage: false,
      messageType: 'success',
      messageContent: '',
      messageTimeout: null,

      // Proxy and URL settings
      useLocalProxy: false,
      sovitsURL: 'http://127.0.0.1:9880' // Default value
    };
  },
  mounted() {
    // Load saved configuration on component mount
    this.loadConfig();
  },
  watch: {
    useLocalProxy(newVal) {
      this.saveConfig(); //save immediately, or saveConfig will use default config when change page.
    },
    sovitsURL(newVal) {
      this.saveConfig(); //save immediately, or saveConfig will use default config when change page.
    }
  },
  methods: {
    // Emotion related methods
    switchEmotion(emotion) {
      // Save current configuration before switching
      this.saveConfig(true); // Silent save

      // Update current emotion
      this.currentEmotion = emotion;

      // Load configuration for the selected emotion
      this.loadConfig();

    },

    getCurrentEmotionLabel() {
      return this.emotions.find(e => e.value === this.currentEmotion).label;
    },

    getCurrentEmotionIcon() {
      return this.emotions.find(e => e.value === this.currentEmotion).icon;
    },

    getConfigKeySuffix() {
      // For normal emotion, don't add any suffix
      if (this.currentEmotion === 'normal') return '';

      // For other emotions, add the appropriate suffix
      return `_${this.currentEmotion}`;
    },

    // Text processing
    fillTextContent() {
      for (let i = 0; i < this.filePaths.length; i++) {
        if (this.filePaths[i]) {
          try {
            // Extract filename from path
            const filepath = this.filePaths[i].trim();
            const filename = filepath.split(/[\/\\]/).pop(); // Works for both Unix and Windows paths
            let nameWithoutExtension = filename.split('.')[0];

            // Clean up the name (remove content in brackets like [text] or 【text】)
            nameWithoutExtension = nameWithoutExtension.replace(/\【.*?\】/g, '');
            nameWithoutExtension = nameWithoutExtension.replace(/\[.*?\]/g, '');

            this.textContents[i] = nameWithoutExtension.trim();
          } catch (error) {
            console.error(`Error processing file path at index ${i}:`, error);
          }
        }
      }

      this.showMessageBubble('success', '文本内容已根据文件名填充');
    },

    fillModelNames() {
      if (this.batchModelName.trim()) {
        this.modelNames = this.modelNames.map(() => this.batchModelName.trim());
        this.showMessageBubble('success', '模型名称已批量设置');
      } else {
        this.showMessageBubble('error', '请先输入要应用的模型名称');
      }
    },

    // Configuration management
    loadConfig() {
      try {
        const savedConfig = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        const sovitsConfig = savedConfig.SOVITS || {};

        // Get the suffix for the current emotion
        const suffix = this.getConfigKeySuffix();

        // Load file paths, text content, and model names
        for (let i = 0; i < 7; i++) {
          const pathKey = `path${i + 1}${suffix}`;
          const textKey = `text${i + 1}${suffix}`;
          const modelKey = `model${i + 1}${suffix}`;

          this.filePaths[i] = sovitsConfig[pathKey] || '';
          this.textContents[i] = sovitsConfig[textKey] || '';
          this.modelNames[i] = sovitsConfig[modelKey] || '';
        }
        // Load proxy and URL settings
        this.useLocalProxy = sovitsConfig.useLocalProxy !== undefined ? sovitsConfig.useLocalProxy : false;
        this.sovitsURL = sovitsConfig.sovitsURL || 'http://127.0.0.1:9880';  // Use default if config doesn't exist
      } catch (error) {
        console.error('Error loading voice configuration:', error);
        this.showMessageBubble('error', '加载配置失败');
      }
    },

    saveConfig(silent = false) {
      try {
        const savedConfig = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');

        if (!savedConfig.SOVITS) {
          savedConfig.SOVITS = {};
        }

        // Get the suffix for the current emotion
        const suffix = this.getConfigKeySuffix();

        // Save file paths, text content, and model names
        for (let i = 0; i < 7; i++) {
          const pathKey = `path${i + 1}${suffix}`;
          const textKey = `text${i + 1}${suffix}`;
          const modelKey = `model${i + 1}${suffix}`;

          savedConfig.SOVITS[pathKey] = this.filePaths[i].trim();
          savedConfig.SOVITS[textKey] = this.textContents[i].trim();
          savedConfig.SOVITS[modelKey] = this.modelNames[i].trim();
        }

        // Save proxy and URL settings
        savedConfig.SOVITS.useLocalProxy = this.useLocalProxy;
        savedConfig.SOVITS.sovitsURL = this.sovitsURL;

        localStorage.setItem('aiGalgameConfig', JSON.stringify(savedConfig));

        this.showMessageBubble('success', `${this.getCurrentEmotionLabel()}语气配置已保存`);

      } catch (error) {
        console.error('Error saving voice configuration:', error);
        if (!silent) {
          this.showMessageBubble('error', '保存配置失败');
        }
      }
    },

    showMessageBubble(type, content) {
      this.$emit('show-message', { title: type, message: content });
    }
  }
};
</script>

<style scoped>
/* Global CSS variables for dark mode compatibility */
:root {
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --success-color: #10b981;
  --success-hover: #059669;
  --error-color: #ef4444;
  --background-color: #ffffff;
  --card-bg: #ffffff;
  --text-color: #2c3e50;
  --text-secondary: #7f8c8d;
  --border-color: #e0e0e0;
  --separator-color: #e9ecef;
  --input-bg: #ffffff;
  --input-border: #ced4da;
  --input-text: #333333;
  --header-bg: #f8f9fa;
  --even-row-bg: #f8f9fa;
  --odd-row-bg: #ffffff;
  --shadow-light: rgba(0, 0, 0, 0.1);
  --shadow-medium: rgba(0, 0, 0, 0.15);
  --transition-speed: 0.3s;
  --border-radius: 8px;

  /* Emotion colors */
  --emotion-normal-color: #64748b;
  --emotion-happy-color: #f59e0b;
  --emotion-sad-color: #3b82f6;
  --emotion-angry-color: #ef4444;
  --emotion-normal-bg: #f1f5f9;
  --emotion-happy-bg: #fef3c7;
  --emotion-sad-bg: #dbeafe;
  --emotion-angry-bg: #fee2e2;
}

/* Dark theme variables */
body.dark-theme {
  --primary-color: #6366f1;
  --primary-hover: #818cf8;
  --success-color: #10b981;
  --success-hover: #34d399;
  --error-color: #ef4444;
  --background-color: #1e1e2e;
  --card-bg: #2d2d3a;
  --text-color: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #444444;
  --separator-color: #3f3f5a;
  --input-bg: #383850;
  --input-border: #4a4a65;
  --input-text: #e0e0e0;
  --header-bg: #252538;
  --even-row-bg: #2a2a40;
  --odd-row-bg: #2d2d3a;
  --shadow-light: rgba(0, 0, 0, 0.3);
  --shadow-medium: rgba(0, 0, 0, 0.4);

  /* Emotion colors for dark theme */
  --emotion-normal-bg: #334155;
  --emotion-happy-bg: #78350f;
  --emotion-sad-bg: #1e3a8a;
  --emotion-angry-bg: #7f1d1d;
}

/* Main container */
.voice-config {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Inter', 'Microsoft YaHei', sans-serif;
  color: var(--text-color);
  position: relative;
  background-color: var(--background-color);
  transition: all var(--transition-speed);
  border-radius: var(--border-radius);
  box-shadow: 0 10px 25px var(--shadow-light);
}

/* Header Section */
.header-section {
  margin-bottom: 2.5rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 1.25rem;
  transition: color var(--transition-speed);
}

.separator {
  height: 2px;
  background-color: var(--border-color);
  margin: 1rem 0;
  transition: background-color var(--transition-speed);
}

/* Emotion Switcher */
.emotion-switcher {
  margin: 1.5rem 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.emotion-title {
  font-weight: 600;
  font-size: 1.05rem;
  color: var(--text-color);
}

.emotion-options {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.emotion-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: var(--border-radius);
  border: 2px solid var(--border-color);
  background-color: var(--card-bg);
  color: var(--text-color);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-speed);
}

.emotion-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-light);
}

.emotion-btn.active {
  border-color: var(--primary-color);
  background-color: rgba(99, 102, 241, 0.1);
}

.emotion-btn.active[data-emotion="normal"] {
  border-color: var(--emotion-normal-color);
  background-color: var(--emotion-normal-bg);
}

.emotion-btn.active[data-emotion="happy"] {
  border-color: var(--emotion-happy-color);
  background-color: var(--emotion-happy-bg);
}

.emotion-btn.active[data-emotion="sad"] {
  border-color: var(--emotion-sad-color);
  background-color: var(--emotion-sad-bg);
}

.emotion-btn.active[data-emotion="angry"] {
  border-color: var(--emotion-angry-color);
  background-color: var(--emotion-angry-bg);
}

.emotion-icon {
  font-size: 1.25rem;
}

/* Current Emotion Indicator */
.current-emotion-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background-color: var(--emotion-normal-bg);
  border-radius: var(--border-radius) var(--border-radius) 0 0;
  font-weight: 600;
  color: var(--text-color);
}

.emotion-normal {
  background-color: var(--emotion-normal-bg);
  border-bottom: 3px solid var(--emotion-normal-color);
}

.emotion-happy {
  background-color: var(--emotion-happy-bg);
  border-bottom: 3px solid var(--emotion-happy-color);
}

.emotion-sad {
  background-color: var(--emotion-sad-bg);
  border-bottom: 3px solid var(--emotion-sad-color);
}

.emotion-angry {
  background-color: var(--emotion-angry-bg);
  border-bottom: 3px solid var(--emotion-angry-color);
}

.emotion-indicator-icon {
  font-size: 1.5rem;
}

.emotion-indicator-text {
  font-size: 1.1rem;
}

/* Content Section - Table Layout */
.content-section {
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 16px var(--shadow-light);
  margin-bottom: 2.5rem;
  overflow: hidden;
  transition: all var(--transition-speed);
  border: 1px solid var(--border-color);
}

.table-header {
  display: flex;
  background-color: var(--header-bg);
  border-bottom: 2px solid var(--separator-color);
  font-weight: 600;
  padding: 1.25rem 1rem;
  color: var(--text-color);
  transition: all var(--transition-speed);
}

/* Entries container without scroll */
.entries-container-no-scroll {
  width: 100%;
  transition: background-color var(--transition-speed);
}

.entry-row {
  display: flex;
  border-bottom: 1px solid var(--separator-color);
  padding: 1rem;
  align-items: center;
  background-color: var(--odd-row-bg);
  transition: all var(--transition-speed);
}

.entry-row:hover {
  background-color: var(--header-bg);
}

.entry-row:last-child {
  border-bottom: none;
}

.even-row {
  background-color: var(--even-row-bg);
}

/* Column widths */
.col-index {
  width: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.col-file {
  flex: 3;
  padding: 0 0.75rem;
}

.col-text {
  flex: 3;
  padding: 0 0.75rem;
}

.col-model {
  flex: 2;
  padding: 0 0.75rem;
}

/* Text Areas */
textarea {
  width: 100%;
  padding: 0.85rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  font-size: 0.95rem;
  resize: vertical;
  font-family: inherit;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: all var(--transition-speed);
  line-height: 1.5;
}

textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

textarea:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

/* Control Panel */
.control-panel {
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 16px var(--shadow-light);
  padding: 1.75rem;
  transition: all var(--transition-speed);
  border: 1px solid var(--border-color);
}

.panel-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--separator-color);
  padding-bottom: 0.85rem;
  transition: all var(--transition-speed);
}

.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.control-row:last-child {
  margin-bottom: 0;
}

.model-fill-section {
  display: flex;
  align-items: center;
  flex: 1;
  margin-left: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.model-fill-section label {
  white-space: nowrap;
  font-weight: 500;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.model-fill-section input {
  flex: 1;
  min-width: 200px;
  padding: 0.75rem 1rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  font-size: 0.95rem;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: all var(--transition-speed);
}

.model-fill-section input::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.model-fill-section input:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.help-text {
  color: var(--text-secondary);
  font-size: 0.95rem;
  transition: color var(--transition-speed);
  font-style: italic;
}

.tip-highlight {
  color: var(--primary-color);
  font-weight: 600;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-speed);
  border: none;
  font-size: 0.95rem;
  box-shadow: 0 2px 4px var(--shadow-light);
  min-width: 120px;
}

.btn:active {
  transform: translateY(1px);
}

.btn-icon {
  margin-right: 0.75rem;
  font-size: 1.1rem;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-hover);
  box-shadow: 0 4px 8px var(--shadow-medium);
}

.btn-success {
  background-color: var(--success-color);
  color: white;
}

.btn-success:hover {
  background-color: var(--success-hover);
  box-shadow: 0 4px 8px var(--shadow-medium);
}

/* Message bubble */
.message-bubble {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: var(--border-radius);
  background-color: var(--card-bg);
  box-shadow: 0 4px 12px var(--shadow-medium);
  color: var(--text-color);
  font-weight: 500;
  transform: translateY(150%);
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 1000;
  opacity: 0;
}

.message-bubble.active {
  transform: translateY(0);
  opacity: 1;
}

.message-bubble.success {
  border-left: 4px solid var(--success-color);
}

.message-bubble.error {
  border-left: 4px solid var(--error-color);
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .voice-config {
    padding: 1.5rem;
  }
}

@media (max-width: 992px) {
  .control-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .emotion-switcher {
    flex-direction: column;
    align-items: flex-start;
  }

  .model-fill-section {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }

  .model-fill-section input {
    flex: 1;
  }

  .btn {
    padding: 0.7rem 1.25rem;
  }

  .control-row:last-child {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 1.5rem;
  }

  .control-row:last-child .btn {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .table-header,
  .entry-row {
    font-size: 0.9rem;
  }

  .title {
    font-size: 1.75rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .col-index {
    width: 40px;
    font-size: 1rem;
  }

  .col-file,
  .col-text,
  .col-model {
    padding: 0 0.5rem;
  }

  textarea,
  input {
    padding: 0.7rem;
  }

  .emotion-options {
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
  }

  .emotion-btn {
    flex: 1;
    min-width: 120px;
  }
}

@media (max-width: 576px) {
  .voice-config {
    padding: 1rem;
  }

  .table-header {
    padding: 0.75rem 0.5rem;
  }

  .entry-row {
    padding: 0.75rem 0.5rem;
  }

  .model-fill-section {
    flex-direction: column;
    align-items: stretch;
  }

  .model-fill-section label {
    margin-bottom: 0.5rem;
  }

  .panel-title {
    font-size: 1.2rem;
  }

  .emotion-btn {
    padding: 0.6rem 1rem;
  }
}

/* Animation effects */
@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

/* Add specific emotion colors for buttons */
.emotion-btn[data-emotion="normal"] {
  border-color: var(--emotion-normal-color);
}

.emotion-btn[data-emotion="happy"] {
  border-color: var(--emotion-happy-color);
}

.emotion-btn[data-emotion="sad"] {
  border-color: var(--emotion-sad-color);
}

.emotion-btn[data-emotion="angry"] {
  border-color: var(--emotion-angry-color);
}

/* Proxy and URL Config Styles */
.proxy-config,
.sovits-url-config {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.75rem;
}

.proxy-config label,
.sovits-url-config label {
  font-weight: 500;
  color: var(--text-color);
  transition: color var(--transition-speed);
  white-space: nowrap; /* Prevent label text from wrapping */
}

.proxy-config input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.sovits-url-config input[type="text"] {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  font-size: 0.95rem;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: all var(--transition-speed);
}

.sovits-url-config input[type="text"]::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.sovits-url-config input[type="text"]:focus {
  border-color: var(--primary-color);
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

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
</style>