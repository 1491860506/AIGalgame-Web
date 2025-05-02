<template>
  <div>
    <!-- Apply theme class for easier scoping if needed, though direct variables should work -->
    <div class="voice-config themed-component">
      <!-- Top Bar: Config Selection & Management -->
      <div class="config-management-bar">
        <label for="config-select">选择配置:</label>
        <select id="config-select" v-model="selectedConfigName" @change="switchConfig">
          <option v-if="!configNames.length" value="" disabled>-- 无可用配置 --</option>
          <option v-for="name in configNames" :key="name" :value="name">{{ name }}</option>
        </select>
        <button class="btn btn-sm btn-add" @click="addConfig">
          <font-awesome-icon :icon="['fas', 'plus']" class="btn-icon" /> 添加
        </button>
        <button class="btn btn-sm btn-modify" @click="openModifyModal" :disabled="!selectedConfigName">
          <font-awesome-icon :icon="['fas', 'pen-to-square']" class="btn-icon" /> 修改定义
        </button>
        <button class="btn btn-sm btn-delete" @click="deleteConfig" :disabled="!selectedConfigName">
          <font-awesome-icon :icon="['fas', 'trash-alt']" class="btn-icon" /> 删除
        </button>
      </div>

      <!-- Separator -->
      <div class="separator thick-separator"></div>

      <!-- Configurable Area (Only shown if a config is selected) -->
      <div v-if="selectedConfigName && currentConfigDefinition">
        <!-- Header Section -->
        <div class="header-section">
          <h1 class="title">{{ selectedConfigName }} - 语音合成配置</h1>

          <!-- NEW: Proxy & Concurrency Row Wrapper -->
          <div class="proxy-concurrency-row" v-if="currentConfigDefinition.localproxy === true || currentConfigDefinition.allow_concurrency === true">
             <!-- Proxy Switch -->
             <div class="form-group proxy-config" v-if="currentConfigDefinition.localproxy === true">
               <label for="proxy-switch" class="proxy-label">使用本地代理:</label>
               <label class="toggle-switch">
                 <input type="checkbox" id="proxy-switch" v-model="configData.useLocalProxy">
                 <span class="toggle-label-switch"></span>
               </label>
             </div>

             <!-- Concurrency Input -->
             <div class="form-group concurrency-config" v-if="currentConfigDefinition.allow_concurrency === true">
               <label for="concurrency" class="concurrency-label">并发数:</label>
               <input type="number" id="concurrency" v-model.number="configData.concurrency" min="1"
                 class="concurrency-input form-input">
             </div>
          </div>


          <!-- GPT Prompts -->
          <div v-if="currentConfigDefinition.gptprompt && currentConfigDefinition.gptprompt.length > 0"
            class="gpt-prompts">
            <div v-for="(prompt, index) in currentConfigDefinition.gptprompt" :key="index"
              class="prompt-item form-group">
              <label :for="`prompt-${Object.keys(prompt)[0]}`">{{ Object.keys(prompt)[0] }}:</label>
              <textarea :id="`prompt-${Object.keys(prompt)[0]}`" v-model="configData[Object.keys(prompt)[0]]"
                :placeholder="`输入 ${Object.keys(prompt)[0]} 内容`" rows="3" class="form-textarea"></textarea>
            </div>
          </div>

          <!-- Emotion Selector -->
          <div class="emotion-switcher" v-if="emotionsToConfigure.length > 1">
            <div class="emotion-title">语气选择 (编辑):</div>
            <div class="emotion-options">
              <button v-for="emotion in emotionsToConfigure" :key="emotion" @click="switchEmotion(emotion)"
                class="emotion-btn" :class="{ active: currentEmotion === emotion }" :data-emotion="emotion">
                <span class="emotion-label">{{ emotion || '默认' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="content-section">
          <!-- Current Emotion Indicator -->
          <div class="current-emotion-indicator" v-if="emotionsToConfigure.length > 1"
            :class="`emotion-${currentEmotion || 'default'}`">
            <span class="emotion-indicator-text">当前编辑语气: {{ currentEmotion || '默认' }}</span>
          </div>

          <!-- Header Row -->
          <div class="table-header">
            <div class="col-index">序号</div>
            <div v-for="item in requiredItems" :key="item.key" class="col-dynamic"
              :style="{ flex: getColumnFlex(item.key) }">
              <span>{{ item.label }}</span>
              <button v-if="item.filling" @click="applyFilling(item.key)" class="btn btn-xs btn-fill"
                title="将序号1的内容应用到全部">
                <font-awesome-icon :icon="['fas', 'angles-down']" /> 一键填入
              </button>
            </div>
          </div>

          <!-- Entries -->
          <div v-for="index in numberOfEntries" :key="index" class="entry-row"
            :class="{ 'even-row': (index - 1) % 2 === 1 }">
            <div class="col-index">{{ index }}</div>
            <div v-for="item in requiredItems" :key="item.key" class="col-dynamic"
              :style="{ flex: getColumnFlex(item.key) }">
              <!-- File Select Input -->
              <div v-if="item.type === 'fileselect'" class="fileselect-wrapper">
                <input type="text" :value="getInputValue(index, currentEmotion, item.key)" readonly
                  placeholder="选择文件..." class="fileselect-display form-input" />
                <input type="file" :id="`fileInput_${index}_${currentEmotion}_${item.key}`"
                  @change="handleFileSelect($event, index, currentEmotion, item.key)" style="display: none;" />
                <label :for="`fileInput_${index}_${currentEmotion}_${item.key}`"
                  class="btn btn-xs btn-file"><font-awesome-icon :icon="['fas', 'folder-open']" /> 选择文件</label>
                  <!-- Optional: Added folder-open icon -->
              </div>
              <!-- Default Text Input -->
              <textarea v-else :value="getInputValue(index, currentEmotion, item.key)"
                @input="setInputValue($event.target.value, index, currentEmotion, item.key)"
                :placeholder="`输入 ${item.label}`" rows="2" class="form-textarea"></textarea>
            </div>
          </div>
        </div>

        <!-- ***** NEW: Test Panel ***** -->
        <div class="test-panel">
          <!-- Updated Title -->
          <h3 class="panel-title">测试当前配置 (序号 {{ selectedTestIndex }})</h3>
          <div class="test-controls">
            <!-- Test Index Selector -->
            <div class="test-control-item">
              <label for="test-index-select">选择测试序号:</label>
              <select id="test-index-select" v-model.number="selectedTestIndex" class="form-select">
                <option v-for="i in numberOfEntries" :key="`test-idx-${i}`" :value="i">
                  {{ i }}
                </option>
              </select>
            </div>

            <!-- Conditional GPT Return Input -->
            <div class="test-control-item" v-if="usesGptReturnVariable">
              <label for="test-gptreturn-input">语气 (gptreturn):</label>
              <input type="text" id="test-gptreturn-input" v-model="testGptReturnValue" placeholder="输入测试语气 (可为空)"
                class="form-input test-gptreturn-input" />
            </div>

            <!-- Test Button -->
            <div class="test-control-item test-button-container">
              <button class="btn btn-info btn-test" @click="testCurrentConfig"
                :disabled="isTesting || !selectedConfigName || numberOfEntries < 1">
                <font-awesome-icon v-if="isTesting" :icon="['fas', 'spinner']" spin class="btn-icon" />
                <font-awesome-icon v-else :icon="['fas', 'flask']" class="btn-icon" />
                {{ isTesting ? '正在测试中...' : '运行测试' }}
              </button>
              <p v-if="isTesting" class="test-status-text">正在生成测试语音，请稍候...</p>
            </div>
          </div>
          <div class="test-results" v-if="!isTesting && (testShortAudioSrc || testLongAudioSrc || testError)">
            <div v-if="testError" class="error-message test-error-msg">
              <strong>测试失败:</strong> {{ testError }}
            </div>
            <div v-if="testShortAudioSrc" class="audio-preview">
              <label>短文本 ("测试"):</label>
              <audio controls :src="testShortAudioSrc" ref="audioShort"></audio>
            </div>
            <div v-if="testLongAudioSrc" class="audio-preview">
              <label>长文本:</label>
              <audio controls :src="testLongAudioSrc" ref="audioLong"></audio>
            </div>
          </div>
        </div>
        <!-- ***** End Test Panel ***** -->

        <!-- Save Button -->
        <div class="save-panel">
          <button class="btn btn-success btn-save" @click="saveConfigData">
            <font-awesome-icon :icon="['fas', 'floppy-disk']" class="btn-icon" /> 保存 {{ selectedConfigName }} 配置数据
          </button>
        </div>

      </div> <!-- End v-if="selectedConfigName" -->

      <!-- Placeholder when no config is selected -->
      <div v-else class="no-config-selected">
        <p>请在上方选择一个配置，或点击“添加”创建一个新配置。</p>
      </div>

      <!-- Modify Config JSON Modal -->
      <div class="modal-overlay" v-if="isEditingConfigJson" @click.self="closeModifyModal">
        <div class="modal-content">
          <h2>修改配置定义: {{ selectedConfigName }}</h2>
          <p class="modal-hint">在此处编辑配置的JSON定义，控制页面布局和请求参数。</p>
          <textarea v-model="currentJsonEdit" class="json-editor-area form-textarea"></textarea>
          <div v-if="jsonEditError" class="error-message">{{ jsonEditError }}</div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closeModifyModal">取消</button>
            <button class="btn btn-primary" @click="saveModifiedConfig">保存定义</button>
          </div>
        </div>
      </div>

      <!-- Message Bubble for notifications -->
      <div class="message-bubble"
        :class="{ active: showMessage, success: messageType === 'success', error: messageType === 'error', warning: messageType === 'warning', info: messageType === 'info' }">
        <span>{{ messageContent }}</span>
      </div>
    </div>
  </div>
</template>

<script>
// --- IMPORT FontAwesomeIcon (if not globally registered) ---
// import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'; // Assuming it's globally registered in main.js

import { writeFile, readFile, createFolder } from './services/IndexedDBFileSystem.js';
import { generateVoice, makeApiRequest, substituteVariables, unquoteVariablesDeep, processConversationAudioRequest } from './services/voiceGenerator.js';

const LS_KEY = 'aiGalgameConfig';
const SOVITS_KEY = 'SOVITS';
const CONFIG_DEFINITIONS_KEY = 'config';
const SELECTED_MODEL_KEY = 'model_choose';

export default {
  name: 'VoiceConfigMulti',
  // --- ADD FontAwesomeIcon to components if not global ---
  // components: {
  //   FontAwesomeIcon
  // },
  data() {
    return {
      configurations: {},
      configNames: [],
      selectedConfigName: null,
      currentConfigDefinition: null,
      configData: {},
      filesToSave: {},

      currentEmotion: '', // Editing emotion

      // UI State
      isEditingConfigJson: false,
      currentJsonEdit: '',
      jsonEditError: '',

      // Message system
      showMessage: false,
      messageType: 'success',
      messageContent: '',
      messageTimeout: null,

      // Test State
      isTesting: false,
      testShortAudioSrc: null,
      testLongAudioSrc: null,
      testError: null,
      blobUrlShort: null,
      blobUrlLong: null,
      selectedTestIndex: 1, // NEW: Index for testing
      testGptReturnValue: '', // NEW: Input for gptreturn testing
    };
  },
  computed: {
    numberOfEntries() {
      // Ensure it returns 0 if definition is null or number is invalid
      const num = this.currentConfigDefinition?.number;
      return (typeof num === 'number' && num > 0) ? num : 0;
    },
    emotionsToConfigure() {
      const emotions = this.currentConfigDefinition?.emotion_list;
      return emotions && emotions.length > 0 ? emotions : [''];
    },
    requiredItems() {
      return (this.currentConfigDefinition?.required_item || []).map(item => {
        const key = Object.keys(item)[0];
        const label = item[key];
        const filling = item.filling === true;
        // Correctly identify fileselect type
        const type = (key === 'fileselect' || (item.hasOwnProperty('fileselect') && item.fileselect === true)) ? 'fileselect' : 'text';
        return { key, label, filling, type };
      });
    },
    allowedVariables() {
      const itemKeys = (this.currentConfigDefinition?.required_item || []).map(item => Object.keys(item)[0]);
      return new Set([...itemKeys, 'gptreturn', 'text', 'language']);
    },
    // NEW: Computed property to check if {{gptreturn}} is used in the definition
    usesGptReturnVariable() {
      if (!this.currentConfigDefinition) return false;
      try {
        // Check the *unquoted* definition string
        const definitionString = JSON.stringify(this.currentConfigDefinition);
        // Search for the literal string '{{gptreturn}}' or '{{ gptreturn }}' etc.
        return /{{\s*gptreturn\s*}}/.test(definitionString);
      } catch (e) {
        console.error("Error checking for gptreturn variable:", e);
        return false;
      }
    },
  },
  watch: {
    // Reset test index if number of entries changes (e.g., loading new config)
    numberOfEntries(newVal) {
      if (this.selectedTestIndex > newVal || this.selectedTestIndex < 1) {
        this.selectedTestIndex = newVal >= 1 ? 1 : 0; // Reset to 1 if possible, else 0
      }
      // Also reset if only 1 entry exists
      if (newVal === 1) {
          this.selectedTestIndex = 1;
      }
    },
    // Optionally reset testGptReturnValue when config changes
    selectedConfigName() {
      this.testGptReturnValue = ''; // Reset tone input on config switch
      this.selectedTestIndex = this.numberOfEntries >= 1 ? 1 : 0; // Also reset index
      // Clear previous test results when config changes
      this.revokeTestAudioUrls();
      this.testError = null;
      this.isTesting = false; // Ensure testing state is reset
    }
  },
  mounted() {
    this.loadAllConfigs();
    const lastSelected = this.loadLastSelectedModel();
    if (lastSelected && this.configNames.includes(lastSelected)) {
      this.selectedConfigName = lastSelected;
    } else if (this.configNames.length > 0) {
      this.selectedConfigName = this.configNames[0];
    }

    if (this.selectedConfigName) {
      this.switchConfig();
    }
  },
  beforeUnmount() {
    this.revokeTestAudioUrls();
    clearTimeout(this.messageTimeout);
  },
  methods: {
    // --- Config Management --- (KEEP EXISTING methods: loadAllConfigs, saveAllConfigs, saveLastSelectedModel, loadLastSelectedModel, addConfig, openModifyModal, closeModifyModal, saveModifiedConfig, deleteConfig, switchConfig)
    // --- START Existing Methods (Keep as is) ---
    loadAllConfigs() {
      try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        this.configurations = saved?.[SOVITS_KEY]?.[CONFIG_DEFINITIONS_KEY] || {};
        this.configNames = Object.keys(this.configurations);
      } catch (error) {
        console.error('Error loading config definitions:', error);
        this.showMessageBubble('error', '加载配置列表失败');
        this.configurations = {};
        this.configNames = [];
      }
    },
    saveAllConfigs() {
      try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        if (!saved[SOVITS_KEY]) {
          saved[SOVITS_KEY] = {};
        }
        const configsToSave = {};
        for (const name in this.configurations) {
          // Ensure quoting happens correctly
          configsToSave[name] = this.quoteVariables(this.configurations[name]);
        }
        saved[SOVITS_KEY][CONFIG_DEFINITIONS_KEY] = configsToSave;
        localStorage.setItem(LS_KEY, JSON.stringify(saved));
      } catch (error) {
        console.error('Error saving config definitions:', error);
        this.showMessageBubble('error', '保存配置列表失败');
      }
    },
    saveLastSelectedModel(configName) {
      try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        if (!saved[SOVITS_KEY]) {
          saved[SOVITS_KEY] = {};
        }
        if (configName) {
          saved[SOVITS_KEY][SELECTED_MODEL_KEY] = configName;
        } else {
          delete saved[SOVITS_KEY][SELECTED_MODEL_KEY];
        }
        localStorage.setItem(LS_KEY, JSON.stringify(saved));
      } catch (error) {
        console.error('Error saving last selected model name:', error);
      }
    },
    loadLastSelectedModel() {
      try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        return saved?.[SOVITS_KEY]?.[SELECTED_MODEL_KEY] || null;
      } catch (error) {
        console.error('Error loading last selected model name:', error);
        return null;
      }
    },
    addConfig() {
      const name = prompt("请输入新配置的名称:", "NewConfig");
      if (name && name.trim() && !this.configurations[name.trim()]) {
        const trimmedName = name.trim();
        const defaultConfig = {
          number: 7,
          required_item: [{ "modelname": "模型名称" }, { "fileselect": "参考音频" }, { "reference_text": "参考文本" }],
          url: "http://test.com/tts",
          requestmethod: "get",
          getparams: [{ "model": "{{modelname}}", "text": "{{text}}" }],
          "before_requests": [],
          "judge_repeat_before": "",
          "allow_concurrency": false,
          "emotion_list": ["happy", "sad", "angry"],
          "emotion_feedback": "happy",
          "gptprompt": [{ "system_prompt": "You are a helpful assistant." }],
          "localproxy": false
        };
        // Store the unquoted version internally, quote on save
        this.configurations[trimmedName] = defaultConfig; // Store as is initially
        this.configNames.push(trimmedName);
        this.saveAllConfigs(); // Save will quote it
        this.selectedConfigName = trimmedName;
        this.switchConfig(); // Switch will unquote it for use
        this.showMessageBubble('success', `配置 "${trimmedName}" 已添加`);
      } else if (name) {
        this.showMessageBubble('error', `配置名称 "${name.trim()}" 已存在或无效`);
      }
    },
    openModifyModal() {
      if (!this.selectedConfigName) return;
      try {
        // Get the stored config (might be quoted), unquote it for editing
        const configToEdit = unquoteVariablesDeep(JSON.parse(JSON.stringify(this.configurations[this.selectedConfigName] || {})));
        this.currentJsonEdit = JSON.stringify(configToEdit, null, 2);
        this.jsonEditError = '';
        this.isEditingConfigJson = true;
      } catch (error) {
        console.error("Error preparing JSON for editing:", error);
        this.showMessageBubble('error', '无法加载配置进行编辑');
      }
    },
    closeModifyModal() {
      this.isEditingConfigJson = false;
      this.currentJsonEdit = '';
      this.jsonEditError = '';
    },
    saveModifiedConfig() {
      try {
        const validationResult = this.validateConfigJson(this.currentJsonEdit);
        if (!validationResult.isValid) {
          this.jsonEditError = validationResult.message;
          return;
        }
        const newDefinition = validationResult.parsedJson;
        // Store the unquoted definition internally
        this.configurations[this.selectedConfigName] = newDefinition;
        this.saveAllConfigs(); // Save will quote it
        this.switchConfig(); // Reload the (now unquoted) definition for the UI
        this.closeModifyModal();
        this.showMessageBubble('success', `配置 "${this.selectedConfigName}" 定义已更新`);

      } catch (error) {
        console.error("Error saving modified JSON:", error);
        this.jsonEditError = `保存失败: ${error.message}`;
        this.showMessageBubble('error', '保存配置定义失败');
      }
    },
    deleteConfig() {
      if (!this.selectedConfigName) return;
      if (confirm(`确定要删除配置 "${this.selectedConfigName}" 吗？其对应的设置数据也将被删除。`)) {
        const nameToDelete = this.selectedConfigName;
        delete this.configurations[nameToDelete];
        this.configNames = this.configNames.filter(name => name !== nameToDelete);
        try {
          const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
          if (saved[SOVITS_KEY]?.[nameToDelete]) {
            delete saved[SOVITS_KEY][nameToDelete];
          }
          // Also remove the definition from the stored config
          if (saved[SOVITS_KEY]?.[CONFIG_DEFINITIONS_KEY]?.[nameToDelete]) {
             delete saved[SOVITS_KEY][CONFIG_DEFINITIONS_KEY][nameToDelete];
          }
          if (saved[SOVITS_KEY]?.[SELECTED_MODEL_KEY] === nameToDelete) {
             delete saved[SOVITS_KEY][SELECTED_MODEL_KEY];
          }
          localStorage.setItem(LS_KEY, JSON.stringify(saved));

        } catch (error) {
          console.error(`Error deleting data or definition for config ${nameToDelete}:`, error);
        }
        // Don't call saveAllConfigs here as we manually removed from LS
        this.selectedConfigName = this.configNames.length > 0 ? this.configNames[0] : null;
        this.saveLastSelectedModel(this.selectedConfigName); // Save new selection
        if (this.selectedConfigName) {
          this.switchConfig();
        } else {
          this.currentConfigDefinition = null;
          this.configData = {};
        }
        this.showMessageBubble('success', `配置 "${nameToDelete}" 已删除`);
      }
    },
    switchConfig() {
      if (!this.selectedConfigName) {
        this.currentConfigDefinition = null;
        this.configData = {};
        this.filesToSave = {};
        this.saveLastSelectedModel(null);
        return;
      }
      this.saveLastSelectedModel(this.selectedConfigName);

      // Ensure we are using the unquoted version for the UI
      const storedDefinition = this.configurations[this.selectedConfigName];
      if (!storedDefinition) {
           console.error(`Definition for ${this.selectedConfigName} not found in configurations object.`);
           this.showMessageBubble('error', `无法加载配置定义: ${this.selectedConfigName}`);
           this.currentConfigDefinition = null;
           this.configData = {};
           return;
      }
      try {
        // Deep clone and unquote
        this.currentConfigDefinition = unquoteVariablesDeep(
          JSON.parse(JSON.stringify(storedDefinition))
        );
      } catch(e) {
         console.error(`Error unquoting definition for ${this.selectedConfigName}:`, e, storedDefinition);
         this.showMessageBubble('error', `加载配置定义时出错: ${this.selectedConfigName}`);
         // Fallback: try to use the stored definition as is, might cause issues
         this.currentConfigDefinition = JSON.parse(JSON.stringify(storedDefinition));
      }


      this.currentEmotion = this.emotionsToConfigure.length > 0 ? this.emotionsToConfigure[0] : '';
      this.loadConfigData();
      this.filesToSave = {};
      // Reset test index to 1 when switching config
      this.selectedTestIndex = this.numberOfEntries >= 1 ? 1 : 0;
      this.testGptReturnValue = ''; // Reset tone input
      // Clear previous test results
      this.revokeTestAudioUrls();
      this.testError = null;
      this.isTesting = false;
    },
    // --- END Existing Methods (Keep as is) ---

    // --- Data Handling --- (KEEP EXISTING methods: loadConfigData, saveConfigData, getDataKey, getInputValue, setInputValue, handleFileSelect)
    // --- START Existing Methods (Keep as is) ---
    loadConfigData() {
      try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        const loadedData = saved?.[SOVITS_KEY]?.[this.selectedConfigName] || {};

        // Ensure concurrency has a default if needed
        if (this.currentConfigDefinition?.allow_concurrency === true) {
          const loadedConcurrency = loadedData.concurrency;
          // Initialize or correct concurrency
          if (typeof loadedConcurrency !== 'number' || !Number.isInteger(loadedConcurrency) || loadedConcurrency <= 0) {
            loadedData.concurrency = 1; // Default to 1
          }
        } else {
           // Remove concurrency if not allowed by definition
          delete loadedData.concurrency;
        }

        // Initialize useLocalProxy if needed
        if (this.currentConfigDefinition?.localproxy === true && typeof loadedData.useLocalProxy === 'undefined') {
          loadedData.useLocalProxy = false; // Default to false
        } else if (this.currentConfigDefinition?.localproxy !== true) {
           // Remove proxy setting if not allowed by definition
           delete loadedData.useLocalProxy;
        }

        // Initialize GPT prompts if needed
        (this.currentConfigDefinition?.gptprompt || []).forEach(promptItem => {
          const key = Object.keys(promptItem)[0];
          if (loadedData[key] === undefined || loadedData[key] === null) {
            loadedData[key] = promptItem[key] || ''; // Use default from definition or empty string
          }
        });

        // Set the configData
        this.configData = JSON.parse(JSON.stringify(loadedData)); // Deep clone

      } catch (error) {
        console.error(`Error loading data for config ${this.selectedConfigName}:`, error);
        this.showMessageBubble('error', `加载配置 "${this.selectedConfigName}" 的数据失败`);
        // Initialize with defaults based on definition
        this.configData = {};
        if (this.currentConfigDefinition?.allow_concurrency === true) {
          this.configData.concurrency = 1;
        }
        if (this.currentConfigDefinition?.localproxy === true) {
          this.configData.useLocalProxy = false;
        }
        (this.currentConfigDefinition?.gptprompt || []).forEach(promptItem => {
           const key = Object.keys(promptItem)[0];
           this.configData[key] = promptItem[key] || '';
        });
      }
    },
    async saveConfigData() {
      if (!this.selectedConfigName || !this.currentConfigDefinition) {
        this.showMessageBubble('error', '没有选中的配置可保存');
        return;
      }
      if (this.currentConfigDefinition.allow_concurrency === true) {
        const concurrencyValue = this.configData.concurrency;
        if (typeof concurrencyValue !== 'number' || !Number.isInteger(concurrencyValue) || concurrencyValue <= 0) {
          this.showMessageBubble('error', '并发数必须是大于0的整数，请修正后保存。');
          return;
        }
      }

      const fileSavePromises = [];
      for (const key in this.filesToSave) {
        const file = this.filesToSave[key];
        if (file instanceof File) {
          const filePath = `/data/tts_${this.selectedConfigName}/${file.name}`;
          fileSavePromises.push(
            createFolder(`/data/tts_${this.selectedConfigName}`)
              .catch(err => {
                if (!err.message.includes('文件夹已存在') && !err.message.includes('Key already exists')) {
                  console.warn(`创建文件目录时出错 (可能已存在): ${err.message}`);
                }
              })
              .then(() => writeFile(filePath, file))
              .catch(err => {
                console.error(`Error writing file ${file.name} to ${filePath}:`, err);
                this.showMessageBubble('error', `保存文件 ${file.name} 失败: ${err.message}`);
                throw err; // Propagate error to stop saving data if file save fails
              })
          );
        }
      }

      try {
        await Promise.all(fileSavePromises); // Wait for all files to be saved

        // Now save the config data to localStorage
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        if (!saved[SOVITS_KEY]) {
          saved[SOVITS_KEY] = {};
        }
        // Save a deep copy of the current config data
        saved[SOVITS_KEY][this.selectedConfigName] = JSON.parse(JSON.stringify(this.configData));
        localStorage.setItem(LS_KEY, JSON.stringify(saved));

        this.filesToSave = {}; // Clear pending files after successful save
        this.showMessageBubble('success', `配置 "${this.selectedConfigName}" 的数据已保存`);
      } catch (error) {
        console.error('Error saving config data or files:', error);
        // Don't show generic error if file save error was already shown
        if (!error.message.startsWith('保存文件')) {
             this.showMessageBubble('error', `保存配置 "${this.selectedConfigName}" 数据失败: ${error.message}`);
        }
      }
    },
    getDataKey(index, emotion) {
      const hasEmotionsConfigured = Array.isArray(this.currentConfigDefinition?.emotion_list) && this.currentConfigDefinition.emotion_list.length > 0;
      // Use the actual emotion string, even if it's empty for default
      return hasEmotionsConfigured ? `${index}_${emotion || 'default_emotion_placeholder'}` : `${index}`;
    },
    getInputValue(index, emotion, itemKey) {
      // Handle empty emotion string correctly
      const effectiveEmotion = emotion === '' ? 'default_emotion_placeholder' : emotion;
      const dataKey = this.getDataKey(index, effectiveEmotion);
      return this.configData[dataKey]?.[itemKey] || '';
    },
    setInputValue(value, index, emotion, itemKey) {
       // Handle empty emotion string correctly
      const effectiveEmotion = emotion === '' ? 'default_emotion_placeholder' : emotion;
      const dataKey = this.getDataKey(index, effectiveEmotion);
      if (!this.configData[dataKey]) {
        // Vue 3 reactivity should handle this, but Vue.set was needed in Vue 2
        this.configData[dataKey] = {};
      }
      this.configData[dataKey][itemKey] = value;
    },
    handleFileSelect(event, index, emotion, itemKey) {
      const file = event.target.files[0];
      if (!file) return;
      // Handle empty emotion string correctly
      const effectiveEmotion = emotion === '' ? 'default_emotion_placeholder' : emotion;
      const dataKey = this.getDataKey(index, effectiveEmotion);
      const fileStorageKey = `${dataKey}_${itemKey}`; // Key for filesToSave map

      if (!this.configData[dataKey]) {
         this.configData[dataKey] = {};
      }
      // Store only the filename in configData
      this.configData[dataKey][itemKey] = file.name;
      // Store the actual File object to be saved later
      this.filesToSave[fileStorageKey] = file;

      // Reset file input to allow selecting the same file again if needed
      event.target.value = null;
    },
    // --- END Existing Methods (Keep as is) ---

    // --- UI Helpers --- (KEEP EXISTING methods: switchEmotion, applyFilling, getColumnFlex)
    // --- START Existing Methods (Keep as is) ---
    switchEmotion(emotion) {
      this.currentEmotion = emotion;
    },
    applyFilling(itemKey) {
      if (!this.currentConfigDefinition || this.numberOfEntries <= 1) return;

      // Handle empty emotion string correctly for getting data
      const effectiveEmotion = this.currentEmotion === '' ? 'default_emotion_placeholder' : this.currentEmotion;
      const firstDataKey = this.getDataKey(1, effectiveEmotion);

      if (!this.configData[firstDataKey] || this.configData[firstDataKey][itemKey] === undefined) {
        this.showMessageBubble('warning', `序号1的 "${this.requiredItems.find(i => i.key === itemKey)?.label}" 数据不存在，无法填充`);
        return;
      }

      const valueToFill = this.configData[firstDataKey][itemKey];

      // Check if value is meaningfully empty (allow filling 'false' or 0)
      if (valueToFill === null || valueToFill === '') {
        this.showMessageBubble('warning', `序号1的 "${this.requiredItems.find(i => i.key === itemKey)?.label}" 为空，无法填充`);
        return;
      }

      let filledCount = 0;
      const isFileSelect = this.requiredItems.find(item => item.key === itemKey)?.type === 'fileselect';

      for (let i = 2; i <= this.numberOfEntries; i++) {
        const targetDataKey = this.getDataKey(i, effectiveEmotion);
        if (!this.configData[targetDataKey]) {
           this.configData[targetDataKey] = {};
        }

        // Check if the value needs updating
        if (this.configData[targetDataKey][itemKey] !== valueToFill) {
          this.configData[targetDataKey][itemKey] = valueToFill;
          filledCount++;

          // If it's a file select, we need to copy the *reference* (filename),
          // but potentially clear any pending file *upload* for the target row.
          // The actual file isn't copied here, only its name reference.
          if (isFileSelect) {
            const targetFileStorageKey = `${targetDataKey}_${itemKey}`;
            // If there was a different file staged for upload for this target row, remove it.
            // We assume the user wants to use the file referenced by row 1.
            if (this.filesToSave[targetFileStorageKey]) {
              delete this.filesToSave[targetFileStorageKey];
              // We might need to find the original File object from row 1 if it was staged
              // const sourceFileStorageKey = `${firstDataKey}_${itemKey}`;
              // if (this.filesToSave[sourceFileStorageKey]) {
              //    this.filesToSave[targetFileStorageKey] = this.filesToSave[sourceFileStorageKey]; // This might be complex if not just saving
              // }
              // Simpler: Just set the filename. Assume the file from row 1 already exists or will be handled separately.
            }
          }
        }
      }
      if (filledCount > 0) {
        this.showMessageBubble('success', `"${this.requiredItems.find(i => i.key === itemKey)?.label}" 已从序号1填充至 ${filledCount} 行`);
      } else {
        this.showMessageBubble('info', `所有行的 "${this.requiredItems.find(i => i.key === itemKey)?.label}" 已与序号1相同`);
      }
    },
    getColumnFlex(itemKey) {
      // Adjust flex values as needed for layout
      if (itemKey === 'reference_text') return 3;
      const itemDefinition = this.requiredItems.find(item => item.key === itemKey);
      if (itemDefinition?.type === 'fileselect') return 3; // Check type property
      if (itemKey === 'model' || itemKey === 'modelname') return 2;
      return 2; // Default flex
    },
    // --- END Existing Methods (Keep as is) ---

    // --- JSON Definition Handling --- (KEEP EXISTING methods: quoteVariables, unquoteVariables, validateConfigJson)
    // --- START Existing Methods (Keep as is) ---
     quoteVariables(jsonObj) {
        // Ensure the input is treated as an object
        if (jsonObj === null || typeof jsonObj !== 'object') return jsonObj;

        // Deep clone the object to avoid modifying the original
        let objToQuote = JSON.parse(JSON.stringify(jsonObj));

        const quoteRecursive = (data) => {
          if (typeof data === 'string') {
            // Check if the string is exactly in the format "{{variable}}"
            if (/^\{\{\s*[\w.]+\s*\}\}$/.test(data)) {
              // Return the string wrapped in JSON quotes (escaped)
              return `"${data}"`; // Wrap in quotes to make it a JSON string literal
            }
            // Otherwise, return the original string (it will be quoted by JSON.stringify later if needed)
            return data;
          } else if (Array.isArray(data)) {
            // Recursively process each item in the array
            return data.map(item => quoteRecursive(item));
          } else if (data !== null && typeof data === 'object') {
             // Recursively process each value in the object
            const newObj = {};
            for (const key in data) {
              if (Object.hasOwnProperty.call(data, key)) {
                newObj[key] = quoteRecursive(data[key]);
              }
            }
            return newObj;
          }
          // Return non-string, non-array, non-object values as is
          return data;
        };

        try {
            // Process the object recursively
            const processedObj = quoteRecursive(objToQuote);

            // Convert the processed structure back to a string, then parse it to get the final object
            // This relies on JSON.parse correctly handling the '"{{variable}}"' strings we created
            let jsonString = JSON.stringify(processedObj);

            // Replace the explicitly quoted variables '"{{variable}}"' with just "{{variable}}"
            // Use a regex to find these patterns and unwrap them
             jsonString = jsonString.replace(/"(\{\{\s*[\w.]+\s*\}\})"/g, (match, p1) => p1);


            // Parse the modified string back into a JavaScript object
            return JSON.parse(jsonString);

        } catch (e) {
            console.error("Error quoting variables:", e, jsonObj);
            // Return the original object in case of error
            return JSON.parse(JSON.stringify(jsonObj));
        }
    },
     unquoteVariables(jsonObj) { // Kept for potential direct use, but unquoteVariablesDeep is preferred
        if (jsonObj === null || typeof jsonObj !== 'object') return jsonObj;
        try {
             // The deep version handles nested structures
            return unquoteVariablesDeep(jsonObj);
        } catch (e) {
            console.error("Error unquoting variables:", e, jsonObj);
            // Return a deep copy of the original object in case of error
            return JSON.parse(JSON.stringify(jsonObj));
        }
    },
    validateConfigJson(jsonString) {
        let parsedJson;
        try {
            parsedJson = JSON.parse(jsonString);
        } catch (e) {
            return { isValid: false, message: `JSON 格式无效: ${e.message}` };
        }

        // --- Basic Structure Validation ---
        const requiredKeys = ['number', 'required_item', 'url'];
        for (const key of requiredKeys) {
            if (!(key in parsedJson)) {
            return { isValid: false, message: `缺少必需的配置项: ${key}` };
            }
        }
        if (typeof parsedJson.number !== 'number' || !Number.isInteger(parsedJson.number) || parsedJson.number <= 0) {
            return { isValid: false, message: `number 必须是正整数` };
        }
        if (!Array.isArray(parsedJson.required_item) || parsedJson.required_item.length === 0) {
            return { isValid: false, message: `required_item 必须是非空数组` };
        }
        // Validate structure of required_item elements
        for(let i=0; i < parsedJson.required_item.length; i++) {
            const item = parsedJson.required_item[i];
            if (typeof item !== 'object' || item === null || Array.isArray(item) || Object.keys(item).length !== 1) {
                 return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素格式无效，应为 {"key": "label"} 形式` };
            }
            const key = Object.keys(item)[0];
            if (typeof item[key] !== 'string') {
                return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素的标签值必须是字符串` };
            }
            // Check for optional 'filling' or 'fileselect' properties (only one key + optional properties)
            let propCount = 1;
            if (item.hasOwnProperty('filling')) {
                if (typeof item.filling !== 'boolean') return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素的 filling 属性必须是布尔值` };
                propCount++;
            }
             if (item.hasOwnProperty('fileselect')) {
                if (typeof item.fileselect !== 'boolean') return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素的 fileselect 属性必须是布尔值` };
                 propCount++;
            }
            // Allow only the main key and optional boolean flags
             if (Object.keys(item).length > propCount) {
                // Example: {"key": "label", "filling": true, "extra": "bad"}
                const extraKeys = Object.keys(item).filter(k => k !== key && k !== 'filling' && k !== 'fileselect');
                 if (extraKeys.length > 0) {
                     return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素包含无效属性: ${extraKeys.join(', ')}` };
                 }
            }

        }

        if (typeof parsedJson.url !== 'string' || parsedJson.url.trim() === '') {
            return { isValid: false, message: `url 必须是非空字符串` };
        }

        // Optional fields validation
        if ('allow_concurrency' in parsedJson && typeof parsedJson.allow_concurrency !== 'boolean') {
            return { isValid: false, message: 'allow_concurrency 必须是布尔值 (true 或 false)' };
        }
         if ('localproxy' in parsedJson && typeof parsedJson.localproxy !== 'boolean') {
            return { isValid: false, message: 'localproxy 必须是布尔值 (true 或 false)' };
        }
        if ('emotion_list' in parsedJson && !Array.isArray(parsedJson.emotion_list)) {
             return { isValid: false, message: 'emotion_list 必须是字符串数组' };
        }
        if ('emotion_list' in parsedJson && Array.isArray(parsedJson.emotion_list)) {
             if (!parsedJson.emotion_list.every(e => typeof e === 'string')) {
                 return { isValid: false, message: 'emotion_list 数组中的所有元素必须是字符串' };
             }
        }
        if ('emotion_feedback' in parsedJson && typeof parsedJson.emotion_feedback !== 'string') {
             return { isValid: false, message: 'emotion_feedback 必须是字符串' };
        }
        if ('gptprompt' in parsedJson && !Array.isArray(parsedJson.gptprompt)) {
             return { isValid: false, message: 'gptprompt 必须是数组' };
        }
         if ('gptprompt' in parsedJson && Array.isArray(parsedJson.gptprompt)) {
             for(let i=0; i < parsedJson.gptprompt.length; i++) {
                 const promptItem = parsedJson.gptprompt[i];
                 if (typeof promptItem !== 'object' || promptItem === null || Array.isArray(promptItem) || Object.keys(promptItem).length !== 1) {
                    return { isValid: false, message: `gptprompt 数组的第 ${i+1} 个元素格式无效，应为 {"key": "defaultValue"} 形式` };
                 }
                 const key = Object.keys(promptItem)[0];
                 if (typeof promptItem[key] !== 'string') {
                     return { isValid: false, message: `gptprompt 数组的第 ${i+1} 个元素的默认值必须是字符串` };
                 }
             }
        }


        // --- Request Structure Validation ---
        const mainMethod = (parsedJson.requestmethod || 'GET').toUpperCase();
        const hasMainGet = Array.isArray(parsedJson.getparams) && parsedJson.getparams.length > 0;
        const hasMainBody = parsedJson.body !== undefined && parsedJson.body !== null;

        if (mainMethod !== 'GET' && mainMethod !== 'POST') {
            return { isValid: false, message: `主请求的 requestmethod 必须是 "get" 或 "post"` };
        }
        if (mainMethod === 'GET' && hasMainBody) {
            return { isValid: false, message: '主请求 requestmethod 是 GET 时，不应配置 body' };
        }
        if (mainMethod === 'POST' && hasMainGet) {
             // Allow GET params even for POST, some APIs use this (e.g., path/query params + body)
            // return { isValid: false, message: '主请求 requestmethod 是 POST 时，不应配置 getparams' };
            console.warn("Validation Warning: Main request is POST but also has getparams defined. This is allowed but potentially unusual.")
        }
        if (mainMethod === 'POST' && !hasMainBody) {
            console.warn("Validation Warning: Main request is POST but has no body defined.");
        }


        // --- Before Requests Validation ---
        const beforeRequests = parsedJson.before_requests;
        if (beforeRequests !== undefined && beforeRequests !== null) {
            if (!Array.isArray(beforeRequests)) {
            return { isValid: false, message: `before_requests 必须是数组` };
            }
            for (let i = 0; i < beforeRequests.length; i++) {
                const req = beforeRequests[i];
                if (req === null || typeof req !== 'object') {
                    return { isValid: false, message: `before_requests 数组的第 ${i + 1} 个元素必须是对象` };
                }
                if (typeof req.url !== 'string' || req.url.trim() === '') {
                    return { isValid: false, message: `before_requests 数组的第 ${i + 1} 个请求缺少或包含无效的 url` };
                }
                const reqMethod = (req.requestmethod || 'GET').toUpperCase();
                if (reqMethod !== 'GET' && reqMethod !== 'POST') {
                    return { isValid: false, message: `before_requests 数组的第 ${i + 1} 个请求的 requestmethod 必须是 "get" 或 "post"` };
                }
                const hasReqGet = Array.isArray(req.getparams) && req.getparams.length > 0;
                const hasReqBody = req.body !== undefined && req.body !== null;
                if (reqMethod === 'GET' && hasReqBody) {
                    return { isValid: false, message: `before_requests 数组的第 ${i + 1} 个请求 requestmethod 是 GET 时，不应配置 body` };
                }
                if (reqMethod === 'POST' && hasReqGet) {
                    // Allow GET params even for POST
                     console.warn(`Validation Warning: Before request ${i+1} is POST but also has getparams defined.`)
                    // return { isValid: false, message: `before_requests 数组的第 ${i + 1} 个请求 requestmethod 是 POST 时，不应配置 getparams` };
                }
                 if (reqMethod === 'POST' && !hasReqBody) {
                    console.warn(`Validation Warning: Before request ${i+1} is POST but has no body defined.`);
                 }
            }
        }

        // --- Judge Repeat Before Validation ---
        const judgeRepeatBefore = parsedJson.judge_repeat_before;
        const allowedVarsForValidation = new Set([
             ...(parsedJson.required_item || []).map(item => Object.keys(item)[0]),
             'gptreturn', 'text', 'language' // Standard allowed variables
             ]);
        if (judgeRepeatBefore !== undefined && judgeRepeatBefore !== null && judgeRepeatBefore !== "") {
            if (typeof judgeRepeatBefore !== 'string') {
                return { isValid: false, message: `judge_repeat_before 必须是字符串` };
            }
            const variableMatch = judgeRepeatBefore.match(/^\{\{\s*([\w.]+)\s*\}\}$/); // Allow dot notation
            if (!variableMatch) {
                return { isValid: false, message: `judge_repeat_before 必须是空字符串或 "{{变量名}}" 的形式` };
            }
            const variableName = variableMatch[1];

            if (!allowedVarsForValidation.has(variableName)) {
                return { isValid: false, message: `judge_repeat_before 中的变量 "{{${variableName}}}" 不允许。允许的变量: ${[...allowedVarsForValidation].join(', ')}` };
            }
            if (parsedJson.allow_concurrency !== true) {
                return { isValid: false, message: `如果定义了 judge_repeat_before，则 allow_concurrency 必须设置为 true 以启用并发控制。` };
            }
        }

        // --- Variable Usage Validation ---
        const errors = [];
        const findVariablesInStructure = (struct) => {
            const vars = new Set();
            const regex = /{{\s*([\w.]+)\s*}}/g; // Allow dot notation e.g. {{headers.content-type}}

            const process = (item) => {
            if (typeof item === 'string') {
                let match;
                while ((match = regex.exec(item)) !== null) {
                vars.add(match[1]); // Add the full variable name (e.g., 'user.name')
                }
                regex.lastIndex = 0; // Reset regex state
            } else if (Array.isArray(item)) {
                item.forEach(process);
            } else if (item !== null && typeof item === 'object') {
                // Process both keys and values in objects, as keys might contain variables too
                for (const key in item) {
                    if (Object.hasOwnProperty.call(item, key)) {
                        process(key); // Check key itself for variables
                        process(item[key]); // Check value
                    }
                }
            }
            };

            // Process relevant parts of the config
            process(parsedJson.url);
            process(parsedJson.getparams);
            process(parsedJson.body);
            if (Array.isArray(parsedJson.before_requests)) {
            parsedJson.before_requests.forEach(req => {
                if (req && typeof req === 'object') {
                process(req.url);
                process(req.getparams);
                process(req.body);
                }
            });
            }
             // Don't check judge_repeat_before here, it was checked specifically above

            return vars;
        };

        const usedVars = findVariablesInStructure(parsedJson);

        for (const variable of usedVars) {
             // Simple check: does the base variable name exist?
            // Doesn't validate dot notation paths deeply, but checks the root.
            const baseVariable = variable.split('.')[0];
            if (!allowedVarsForValidation.has(baseVariable)) {
                errors.push(`不允许或未定义的变量: {{${variable}}}. 允许的基础变量: ${[...allowedVarsForValidation].join(', ')}.`);
            }
        }

        if (errors.length > 0) {
             // Remove duplicates
             const uniqueErrors = [...new Set(errors)];
            return { isValid: false, message: uniqueErrors.join('; ') };
        }

        // If all checks pass
        return { isValid: true, message: 'JSON 定义有效', parsedJson };
    },
    // --- END Existing Methods (Keep as is) ---


    // --- Audio Handling ---
    revokeTestAudioUrls() {
      if (this.blobUrlShort) {
        URL.revokeObjectURL(this.blobUrlShort);
        this.blobUrlShort = null;
        this.testShortAudioSrc = null;
      }
      if (this.blobUrlLong) {
        URL.revokeObjectURL(this.blobUrlLong);
        this.blobUrlLong = null;
        this.testLongAudioSrc = null;
      }
    },

    // ***** UPDATED: Test Configuration Method *****
    async testCurrentConfig() {
      if (!this.selectedConfigName || !this.currentConfigDefinition) {
        this.showMessageBubble('warning', '请先选择一个要测试的配置');
        return;
      }
      // Check if selectedTestIndex is valid
      if (this.numberOfEntries < 1 || this.selectedTestIndex < 1 || this.selectedTestIndex > this.numberOfEntries) {
        this.showMessageBubble('warning', `无效的测试序号: ${this.selectedTestIndex} (总条目: ${this.numberOfEntries})`);
        return;
      }
      if (this.isTesting) {
        return; // Prevent multiple simultaneous tests
      }

      this.isTesting = true;
      this.testError = null;
      this.revokeTestAudioUrls(); // Revoke previous URLs
      this.showMessageBubble('info', `开始测试语音生成 (序号 ${this.selectedTestIndex})...`);

      // Test parameters
      const nameId = this.selectedTestIndex; // Use selected index
      const lang = "zh"; // Assume Chinese for test text

      // The {{gptreturn}} variable value comes from the test input field
      const gptReturnValueForTest = this.testGptReturnValue;

      // Determine if local proxy should be used based on current config data
      const useLocalProxy = this.configData?.useLocalProxy === true && this.currentConfigDefinition?.localproxy === true;

      try {
        // --- Prepare Variables Map for Test (using selected index data) ---
        const testVariablesMap = {};
        testVariablesMap['language'] = lang;
        // ***** Use the value from the new input field for the {{gptreturn}} variable *****
        testVariablesMap['gptreturn'] = gptReturnValueForTest;

        // Determine the data key based on test index (nameId) and UI-selected emotion (currentEmotion)
        const hasEmotionsConfigured = Array.isArray(this.currentConfigDefinition?.emotion_list) && this.currentConfigDefinition.emotion_list.length > 0;
         // Use currentEmotion directly, map '' to the placeholder for key lookup
        const emotionForDataLookup = this.currentEmotion === '' ? 'default_emotion_placeholder' : this.currentEmotion;
        const dataKey = this.getDataKey(nameId, emotionForDataLookup); // Use getDataKey

        console.log(`[Test] Using data key: ${dataKey} for index ${nameId}, emotion '${this.currentEmotion}'`);
        const rowData = this.configData?.[dataKey] || {};
        console.log(`[Test] Loaded row data:`, JSON.parse(JSON.stringify(rowData)));


        // Add values from required_item in configData (selected index, UI emotion) to the variables map
        // Also include defaults from the definition if data is missing
        (this.currentConfigDefinition?.required_item || []).forEach(itemDef => {
          const itemKey = Object.keys(itemDef)[0];
          const valueFromData = rowData[itemKey];
          const definitionDefault = itemDef[itemKey]; // Default value from the definition label (might not be intended as a functional default)

          if (valueFromData !== undefined && valueFromData !== null && valueFromData !== '') {
            testVariablesMap[itemKey] = valueFromData;
          } else {
            // Fallback: Use definition label as value? Or better, empty string?
            // Using empty string is safer than using the label.
            // If a real default is needed, it should be explicitly defined, perhaps in the configData loading.
            testVariablesMap[itemKey] = '';
             console.warn(`[Test] No value found for '${itemKey}' in data key '${dataKey}'. Using empty string.`);
            // If you *want* to use the label as fallback:
            // testVariablesMap[itemKey] = (typeof definitionDefault === 'string') ? definitionDefault : '';
          }

          // Special handling for fileselect: if value is a filename, construct path
          const isFileItem = itemDef.hasOwnProperty('fileselect') && itemDef.fileselect === true;
          if (isFileItem && typeof testVariablesMap[itemKey] === 'string' && testVariablesMap[itemKey]) {
              const filename = testVariablesMap[itemKey];
              // Assume file is in the standard location for this config
              testVariablesMap[itemKey] = `/data/tts_${this.selectedConfigName}/${filename}`;
              console.log(`[Test] Mapped fileselect key '${itemKey}' to path: ${testVariablesMap[itemKey]}`);
          }

        });

        // Add GPT prompt values from configData to the map
         (this.currentConfigDefinition?.gptprompt || []).forEach(promptItem => {
             const key = Object.keys(promptItem)[0];
             testVariablesMap[key] = this.configData[key] || promptItem[key] || ''; // Use data, fallback to definition, fallback to empty
         });


        console.log("[Test] Variables for substitution (excluding text):", JSON.parse(JSON.stringify(testVariablesMap)));

        // --- Handle Before Requests for Test ---
        const beforeRequests = this.currentConfigDefinition?.before_requests;
        if (Array.isArray(beforeRequests) && beforeRequests.length > 0) {
          this.showMessageBubble('info', `正在进行测试前置请求 (共 ${beforeRequests.length} 个)...`);
          for (let i = 0; i < beforeRequests.length; i++) {
            const beforeReqDef = beforeRequests[i];
            if (!beforeReqDef || typeof beforeReqDef !== 'object' || !beforeReqDef.url) continue;

            // Deep copy the definition before substitution
            const beforeReqDetails = JSON.parse(JSON.stringify({
                url: beforeReqDef.url,
                requestmethod: beforeReqDef.requestmethod || 'GET',
                getparams: beforeReqDef.getparams || [], // Ensure array
                body: beforeReqDef.body,
                headers: beforeReqDef.headers || {} // Include headers
            }));

            try {
              // Substitute variables using the map (which includes testGptReturnValue for {{gptreturn}})
              const substitutedBeforeReqDetails = substituteVariables(beforeReqDetails, testVariablesMap, readFile); // Pass readFile for file content
              console.log(`[Test] Substituted Before Request ${i + 1} details:`, JSON.parse(JSON.stringify(substitutedBeforeReqDetails)));

              this.showMessageBubble('info', `正在进行测试前置请求 ${i + 1}/${beforeRequests.length}: ${substitutedBeforeReqDetails.url}`);
              await makeApiRequest(
                  substitutedBeforeReqDetails.url,
                  substitutedBeforeReqDetails.requestmethod.toUpperCase(),
                  substitutedBeforeReqDetails.getparams, // Already substituted
                  substitutedBeforeReqDetails.body, // Already substituted (or file content loaded)
                  useLocalProxy,
                  substitutedBeforeReqDetails.headers // Pass substituted headers
                );
              this.showMessageBubble('info', `测试前置请求 ${i + 1} 成功。`);
              console.log(`[Test] Before Request ${i + 1} successful.`);
            } catch (beforeError) {
              console.error(`[Test] Before Request ${i + 1} 失败:`, beforeError);
              this.testError = `测试前置请求 ${i + 1} 失败: ${beforeError.message}`;
              this.showMessageBubble('error', `测试前置请求 ${i + 1} 失败: ${beforeError.message}`);
              this.isTesting = false;
              return; // Stop test if before request fails
            }
          }
          this.showMessageBubble('success', '所有测试前置请求成功。');
        } else {
          console.log("[Test] No before_requests configured. Skipping.");
        }
        // --- End Handle Before Requests ---


        // --- Handle Main Request for Test (Short Text) ---
        const textShort = "测试";
        const shortFileName = `test_short_${this.selectedConfigName}_${nameId}_${Date.now()}`;
        this.showMessageBubble('info', `正在生成短文本语音: "${textShort}"`);
        try {
          // Mock conversation object uses the gptReturnValueForTest as its emotion
          const conversationMockShort = { id: shortFileName, character: 'TestChar', emotion: gptReturnValueForTest, text: textShort };
          const testAudioDir = `/data/test/tts_test_preview/${this.selectedConfigName}`;
          await createFolder(testAudioDir).catch(err => { if (!err.message.includes('文件夹已存在') && !err.message.includes('Key already exists')) console.warn(`创建测试预览目录时出错: ${err.message}`); });

          // Pass nameId (selected test index)
          // Pass the *current* configData (not just rowData) as it contains global settings like concurrency, proxy toggle, gpt prompts
          const resultShort = await processConversationAudioRequest(
                nameId, // Index of the data row to use
                textShort,
                conversationMockShort,
                lang,
                this.currentConfigDefinition,
                this.configData, // Pass the full configData object
                testAudioDir,
                (msg) => console.log(`[Test Short] ${msg}`), // Progress callback
                true // Indicate this is a test call
                );

          if (resultShort.status !== "ok") {
            throw new Error(resultShort.reason || `处理短文本请求失败，状态: "${resultShort.status}"`);
          }

          const shortBlob = await readFile(`${testAudioDir}/${shortFileName}.wav`);
          this.blobUrlShort = URL.createObjectURL(shortBlob);
          this.testShortAudioSrc = this.blobUrlShort;
          this.showMessageBubble('success', `短文本语音生成成功`);
          console.log(`[Test] Short audio generated: ${this.blobUrlShort}`);

        } catch (shortAudioError) {
          console.error("[Test] Generating short audio failed:", shortAudioError);
          this.testError = `生成短文本语音失败: ${shortAudioError.message}`;
          this.showMessageBubble('error', `生成短文本语音失败: ${shortAudioError.message}`);
          // Don't return, allow long text test to proceed if desired, but mark error
        }

        // --- Handle Main Request for Test (Long Text) ---
        // Only proceed if short text didn't set a fatal error (optional - could skip)
        // if (!this.testError || !this.testError.startsWith("生成短文本语音失败")) { // Example condition
        const textLong = "斗之力，三段！望着测验魔石碑上面闪亮得甚至有些刺眼的五个大字，少年面无表情，唇角有着一抹自嘲。";
        const longFileName = `test_long_${this.selectedConfigName}_${nameId}_${Date.now()}`;
        this.showMessageBubble('info', `正在生成长文本语音...`);
        try {
             // Mock conversation object uses the gptReturnValueForTest as its emotion
            const conversationMockLong = { id: longFileName, character: 'TestChar', emotion: gptReturnValueForTest, text: textLong };
            const testAudioDir = `/data/test/tts_test_preview/${this.selectedConfigName}`; // Should exist now
            // No need to create folder again if short test succeeded or ran

            // Pass nameId (selected test index)
             const resultLong = await processConversationAudioRequest(
                 nameId,
                 textLong,
                 conversationMockLong,
                 lang,
                 this.currentConfigDefinition,
                 this.configData, // Pass full configData
                 testAudioDir,
                 (msg) => console.log(`[Test Long] ${msg}`),
                 true // Indicate test call
                 );


            if (resultLong.status !== "ok") {
                throw new Error(resultLong.reason || `处理长文本请求失败，状态: "${resultLong.status}"`);
            }

            const longBlob = await readFile(`${testAudioDir}/${longFileName}.wav`);
            this.blobUrlLong = URL.createObjectURL(longBlob);
            this.testLongAudioSrc = this.blobUrlLong;
            this.showMessageBubble('success', `长文本语音生成成功`);
            console.log(`[Test] Long audio generated: ${this.blobUrlLong}`);

        } catch (longAudioError) {
            console.error("[Test] Generating long audio failed:", longAudioError);
            // Append error if short text also failed, or set if it's the first error
            const longErrorMsg = `生成长文本语音失败: ${longAudioError.message}`;
            this.testError = this.testError ? `${this.testError}; ${longErrorMsg}` : longErrorMsg;
            this.showMessageBubble('error', longErrorMsg);
        }
        // } else {
        //   console.log("[Test] Skipping long text test due to short text failure.");
        // }


        // --- Final Status Update ---
        if (!this.testError) {
          this.showMessageBubble('success', '测试完成，音频已加载。');
        } else {
          // Error message already shown for specific step failures
           this.showMessageBubble('warning', '测试完成，但有步骤失败，请检查日志和错误信息。');
        }


      } catch (error) {
        console.error("[Test] An unexpected error occurred during test:", error);
         const unexpectedErrorMsg = `发生意外错误: ${error.message}`;
        this.testError = this.testError ? `${this.testError}; ${unexpectedErrorMsg}` : unexpectedErrorMsg;
        this.showMessageBubble('error', `测试中止: ${error.message}`);

      } finally {
        this.isTesting = false;
      }
    },
    // ---------------------------------------

    // --- Message Bubble ---
    showMessageBubble(type, content) {
      this.messageContent = content;
      this.messageType = type;
      this.showMessage = true;

      clearTimeout(this.messageTimeout);
      this.messageTimeout = setTimeout(() => {
        this.showMessage = false;
      }, 3500);
    }
  }
};
</script>

<style scoped>
/* Main Container Styling */
.voice-config {
  color: var(--text-color);
  background-color: var(--bg-color);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 24px;
  position: relative;
  transition: background-color 0.3s ease, color 0.3s ease; /* Added color transition */
}

/* Variable declarations (Light Mode) */
.voice-config {
  --bg-color: #ffffff;
  --text-color: #333333;
  --text-secondary: #667085; /* Added for hints */
  --border-color: #e0e0e0;
  --separator-color: #eaeaea;
  --primary-color: #4f46e5;
  --primary-color-hover: #4338ca;
  --secondary-color: #6366f1;
  --danger-color: #ef4444;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --info-color: #3b82f6;
  --disabled-color: #9ca3af;
  --input-bg: #f9fafb;
  --input-border: #d1d5db;
  --input-focus-border: #4f46e5; /* Renamed for clarity */
  --input-focus-shadow: rgba(79, 70, 229, 0.2); /* Renamed for clarity */
  --btn-text: #ffffff;
  --panel-bg: #f8fafc;
  --even-row-bg: #f3f4f6;
  --hover-bg: #f0f4ff;
  --test-panel-bg: #f0f9ff;
  --test-panel-border: rgba(59, 130, 246, 0.3); /* Added */
  --emotion-button-bg: #e5e7eb;
  --emotion-active-bg: #4f46e5;
  --emotion-active-text: #ffffff;
  --modal-overlay-bg: rgba(0, 0, 0, 0.5); /* Added */
  --error-bg: #fef2f2; /* Added */
  --error-border: #f87171; /* Added */
  --error-text: #b91c1c; /* Added */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Dark mode styling */
:global(body.dark-theme) .voice-config {
  --bg-color: #1e293b; /* Dark blue-gray */
  --text-color: #f3f4f6; /* Light gray */
  --text-secondary: #94a3b8; /* Lighter gray for hints */
  --border-color: #374151; /* Medium gray */
  --separator-color: #2d3748; /* Darker gray */
  --primary-color: #6366f1; /* Slightly lighter purple */
  --primary-color-hover: #818cf8; /* Lighter hover */
  /* --secondary-color: #818cf8; */ /* Adjust if needed */
  /* --danger-color: #f87171; */ /* Adjust if needed */
  /* --success-color: #34d399; */ /* Adjust if needed */
  /* --warning-color: #fbbf24; */ /* Adjust if needed */
  --info-color: #60a5fa; /* Lighter blue */
  --input-bg: #111827; /* Very dark blue-gray */
  --input-border: #4b5563; /* Darker medium gray */
  --input-focus-border: #6366f1; /* Match primary */
  --input-focus-shadow: rgba(99, 102, 241, 0.3); /* Adjust alpha if needed */
  --panel-bg: #0f172a; /* Very dark blue */
  --even-row-bg: #283548; /* Slightly lighter dark blue-gray */
  --hover-bg: #2c3344; /* Darker hover state */
  --test-panel-bg: #172042; /* Darker blue */
  --test-panel-border: rgba(96, 165, 250, 0.4); /* Lighter blue border */
  --emotion-button-bg: #374151; /* Medium gray */
  --emotion-active-bg: #6366f1; /* Match primary */
  --emotion-active-text: #ffffff;
  --modal-overlay-bg: rgba(0, 0, 0, 0.7); /* Darker overlay */
  --error-bg: rgba(239, 68, 68, 0.15); /* Transparent red */
  --error-border: #ef4444; /* Keep danger color */
  --error-text: #fca5a5; /* Light red text */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}

/* Top Configuration Selection & Management */
.config-management-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.config-management-bar label {
  font-weight: 600;
  margin-right: 4px;
  white-space: nowrap;
  color: var(--text-color); /* Use variable */
}

#config-select {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  font-size: 1rem;
  border: 1px solid var(--input-border);
  border-radius: 6px;
  background-color: var(--input-bg);
  color: var(--text-color);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

#config-select:focus {
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 2px var(--input-focus-shadow);
}

/* Button styling */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: var(--shadow-sm);
  color: var(--btn-text); /* Default button text color */
}

.btn:focus {
  outline: none;
   box-shadow: 0 0 0 3px var(--input-focus-shadow); /* Consistent focus */
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--disabled-color); /* Indicate disabled state more clearly */
   box-shadow: none;
   transform: none;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.9rem;
}

.btn-xs {
  padding: 4px 8px;
  font-size: 0.8rem;
  gap: 4px; /* Smaller gap for xs buttons */
}
.btn-xs .svg-inline--fa { /* Target FA icons specifically if needed */
   font-size: 0.8em; /* Make icon slightly smaller in xs */
}


.btn-add { background-color: var(--primary-color); }
.btn-add:hover:not(:disabled) { background-color: var(--primary-color-hover); transform: translateY(-1px); }

.btn-modify { background-color: var(--info-color); }
.btn-modify:hover:not(:disabled) { background-color: var(--primary-color-hover); transform: translateY(-1px); } /* Using primary hover for consistency */

.btn-delete { background-color: var(--danger-color); }
.btn-delete:hover:not(:disabled) { background-color: #dc2626; transform: translateY(-1px); }

.btn-file { background-color: var(--info-color); }
.btn-file:hover:not(:disabled) { background-color: #2563eb; }

.btn-fill { background-color: var(--warning-color); }
.btn-fill:hover:not(:disabled) { background-color: #ea580c; }

.btn-success { background-color: var(--success-color); }
.btn-success:hover:not(:disabled) { background-color: #059669; transform: translateY(-1px); }

.btn-info { background-color: var(--info-color); }
.btn-info:hover:not(:disabled) { background-color: #2563eb; }

.btn-secondary { background-color: #6b7280; } /* Slightly darker secondary */
.btn-secondary:hover:not(:disabled) { background-color: #4b5563; }

.btn-primary { background-color: var(--primary-color); }
.btn-primary:hover:not(:disabled) { background-color: var(--primary-color-hover); }

/* Class for icons inside buttons */
.btn-icon {
  /* display: inline-block; */ /* Not needed with flex */
  /* margin-right: 4px; */ /* Gap handles spacing */
  /* vertical-align: middle; */ /* Flex handles alignment */
}


/* Separator */
.separator {
  margin: 16px 0;
  height: 1px;
  background-color: var(--separator-color);
  width: 100%;
}

.thick-separator {
  height: 2px;
  margin: 20px 0;
}

/* No config selected placeholder */
.no-config-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px; /* Use min-height */
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  margin: 24px 0;
  padding: 20px; /* Add padding */
  color: var(--text-secondary); /* Use secondary text color */
  opacity: 0.8; /* Slightly less opaque */
  text-align: center;
}

/* Header Section */
.header-section {
  margin-bottom: 24px;
}

.title {
  font-size: 1.8rem;
  margin-bottom: 20px; /* Increased margin */
  color: var(--primary-color);
  font-weight: 700;
}

/* Form Group Styling */
.form-group {
  margin-bottom: 16px;
  /* Removed background/border/shadow from individual proxy/concurrency groups */
}
.form-group:last-child {
    margin-bottom: 0; /* Remove margin from last group in a container */
}


.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--text-color); /* Use variable */
}

.form-input, .form-textarea, .form-select {
  width: 100%;
  padding: 10px 12px; /* Adjusted padding */
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--text-color);
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-input::placeholder, .form-textarea::placeholder {
    color: var(--text-secondary); /* Style placeholder text */
    opacity: 0.7;
}


.form-input:focus, .form-textarea:focus, .form-select:focus {
  outline: none;
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px var(--input-focus-shadow); /* Slightly larger focus shadow */
}

.form-textarea {
  resize: vertical;
  min-height: 60px; /* Reduced default height */
}

/* --- NEW: Proxy & Concurrency Row --- */
.proxy-concurrency-row {
    display: flex;
    flex-wrap: wrap; /* Allow wrapping on smaller screens */
    align-items: center;
    gap: 24px; /* Increased gap */
    margin-bottom: 20px;
    padding: 16px;
    background-color: var(--panel-bg); /* Add panel background to the row */
    border-radius: 8px;
    box-shadow: var(--shadow-sm);
}
.proxy-concurrency-row .form-group {
    margin-bottom: 0; /* Remove bottom margin from inner groups */
    display: flex; /* Align label and control */
    align-items: center;
    gap: 10px;
}
.proxy-concurrency-row .form-group label {
    margin-bottom: 0; /* Remove bottom margin from labels inside */
    white-space: nowrap;
}

/* Specific adjustments for proxy/concurrency items inside the row */
.proxy-config {
  /* Removed background/padding/shadow */
}
.concurrency-config {
   /* Removed background/padding/shadow */
}
.concurrency-input {
  width: 70px; /* Slightly narrower */
  padding: 8px; /* Adjust padding */
  text-align: center;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px; /* Smaller toggle */
  height: 22px;
  flex-shrink: 0; /* Prevent shrinking */
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
  background-color: #ccc;
  transition: .4s;
  border-radius: 22px; /* Match height */
}

.toggle-label-switch:before {
  position: absolute;
  content: "";
  height: 16px; /* Smaller circle */
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2); /* Add subtle shadow */
}

input:checked + .toggle-label-switch {
  background-color: var(--primary-color);
}

input:focus + .toggle-label-switch {
  box-shadow: 0 0 0 3px var(--input-focus-shadow); /* Consistent focus */
}

input:checked + .toggle-label-switch:before {
  transform: translateX(22px); /* Adjust translation distance */
}

/* GPT Prompts */
.gpt-prompts {
  margin-top: 20px; /* Consistent margin */
  padding: 16px;
  background-color: var(--panel-bg);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.prompt-item {
  margin-bottom: 16px;
}

.prompt-item:last-child {
  margin-bottom: 0;
}

/* Emotion Selector */
.emotion-switcher {
  margin: 20px 0; /* Consistent margin */
  padding: 16px;
  background-color: var(--panel-bg);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.emotion-title {
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-color); /* Use variable */
}

.emotion-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.emotion-btn {
  background-color: var(--emotion-button-bg);
  border: 1px solid transparent; /* Add border for definition */
  padding: 6px 14px; /* Slightly adjust padding */
  border-radius: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary); /* Use secondary text */
}

.emotion-btn:hover {
  background-color: var(--hover-bg); /* Use hover variable */
  color: var(--text-primary);
  transform: translateY(-1px);
  border-color: var(--border-color); /* Show border on hover */
}

.emotion-btn.active {
  background-color: var(--emotion-active-bg);
  color: var(--emotion-active-text);
  box-shadow: var(--shadow-sm);
  border-color: transparent; /* Hide border when active */
   font-weight: 600; /* Make active bolder */
}

/* Content Section (Table Area) */
.content-section {
  background-color: var(--panel-bg);
  border-radius: 12px;
  padding: 0; /* Remove padding, apply to inner elements */
  box-shadow: var(--shadow-sm);
  margin-bottom: 24px;
  overflow: hidden; /* Clip child corners */
}

/* Current Emotion Indicator */
.current-emotion-indicator {
  margin: 16px 16px 0; /* Adjust margin */
  padding: 8px 12px;
  border-radius: 6px;
  background-color: var(--primary-color);
  color: white;
  font-weight: 600;
  display: inline-block;
   font-size: 0.9rem;
}

/* Table Header */
.table-header {
  display: flex;
  background-color: var(--primary-color); /* Use primary */
  color: white;
  padding: 12px 16px; /* Adjust padding */
  /* border-radius: 8px 8px 0 0; */ /* Removed, handled by content-section */
  font-weight: 600;
  align-items: center;
   margin-top: 16px; /* Add margin if no emotion indicator */
}
.content-section:not(:has(.current-emotion-indicator)) .table-header {
    margin-top: 0; /* Remove top margin if indicator is absent */
    border-radius: 8px 8px 0 0; /* Add border radius if it's the first element */
}


.col-index {
  width: 50px; /* Narrower index */
  text-align: center;
  flex-shrink: 0;
  padding-right: 8px;
}

.col-dynamic {
  display: flex;
  flex-grow: 1; /* Use flex-grow */
  flex-basis: 0; /* Allow shrinking */
  align-items: center;
  justify-content: space-between; /* Push button to right */
  padding: 0 10px; /* Horizontal padding */
  gap: 8px; /* Gap between label and button */
  border-left: 1px solid rgba(255, 255, 255, 0.2); /* Subtle separator */
}
.col-dynamic:first-of-type {
    border-left: none; /* No separator for first dynamic column */
}
.col-dynamic > span {
    flex-grow: 1; /* Allow label to take space */
    text-align: left;
}
.col-dynamic .btn-fill {
    flex-shrink: 0; /* Prevent button shrinking */
}

/* Entries */
.entry-row {
  display: flex;
  padding: 12px 16px; /* Adjust padding */
  border-bottom: 1px solid var(--border-color);
  align-items: stretch; /* Stretch items to fill height */
  transition: background-color 0.2s;
  background-color: var(--bg-color); /* Default row background */
}
.entry-row .col-dynamic {
    border-left: 1px solid var(--border-color); /* Use border color for rows */
    padding-top: 8px; /* Add padding for textarea */
    padding-bottom: 8px;
}
.entry-row .col-dynamic:first-of-type {
    border-left: none;
}
.entry-row .col-index {
    padding-top: 10px; /* Align index number better */
}


.entry-row:hover {
  background-color: var(--hover-bg);
}

.entry-row:last-child {
  border-bottom: none;
  /* border-radius: 0 0 8px 8px; */ /* Removed, handled by content-section */
}

.even-row {
  background-color: var(--even-row-bg); /* Use variable for even rows */
}
.even-row:hover {
  background-color: var(--hover-bg); /* Hover overrides even row color */
}

/* File Select */
.fileselect-wrapper {
  /* position: relative; */ /* Not needed with flex */
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.fileselect-display {
  flex-grow: 1;
  /* padding-right: 90px; */ /* Removed, gap handles spacing */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
   padding: 8px 10px; /* Match input padding */
   min-height: 38px; /* Match input height */
}

.btn-file {
  /* position: absolute; */ /* Removed */
  /* right: 0; */ /* Removed */
  /* top: 0; */ /* Removed */
  /* bottom: 0; */ /* Removed */
  /* border-radius: 0 6px 6px 0; */ /* Removed */
  border-radius: 6px; /* Standard radius */
  /* display: flex; */ /* Already a flex item */
  /* align-items: center; */ /* Already aligned */
  flex-shrink: 0; /* Prevent shrinking */
}

/* Textarea inside rows */
.entry-row .form-textarea {
    min-height: 40px; /* Smaller min-height */
    height: auto; /* Allow shrinking */
    padding: 8px 10px; /* Adjust padding */
     resize: none; /* Disable manual resize */
}


/* Test Panel */
.test-panel {
  background-color: var(--test-panel-bg);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--test-panel-border); /* Use variable */
}

.panel-title {
  color: var(--info-color);
  font-size: 1.4rem;
  margin-bottom: 16px;
  font-weight: 600;
}

.test-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end; /* Align items to bottom */
  gap: 16px;
  margin-bottom: 16px;
}

.test-control-item {
  flex: 1; /* Allow items to grow */
  min-width: 180px; /* Adjust min-width */
}

.test-control-item label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--text-color); /* Use variable */
}

.test-button-container {
  /* align-self: flex-end; */ /* Flex aligns this already */
  display: flex;
  flex-direction: column; /* Stack button and status */
  align-items: flex-start;
  flex-basis: 200px; /* Give button container some base width */
  flex-grow: 0; /* Don't let it grow excessively */
}

.test-status-text {
  font-size: 0.9rem;
  color: var(--info-color);
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.test-gptreturn-input {
  width: 100%;
}

/* Test Results */
.test-results {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--test-panel-border); /* Use variable */
}

.audio-preview {
  margin-bottom: 16px; /* Increased spacing */
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.05); /* Subtle background */
   border: 1px solid var(--border-color); /* Add border */
  border-radius: 8px;
}
:global(body.dark-theme) .audio-preview {
    background-color: rgba(0, 0, 0, 0.1); /* Darker subtle background */
}


.audio-preview label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600; /* Bolder label */
  color: var(--info-color); /* Use info color */
   font-size: 0.9rem;
}

.audio-preview audio {
  width: 100%;
  border-radius: 4px;
  /* Improve audio player appearance in dark mode */
  filter: var(--audio-filter, none);
}
:global(body.dark-theme) .audio-preview audio {
   /* Example: Invert colors for dark mode if needed */
   /* filter: invert(1) hue-rotate(180deg); */
   --audio-filter: contrast(1.1) brightness(0.9); /* Adjust contrast/brightness */
   border: 1px solid var(--border-color); /* Add border in dark mode */
}


/* Save Panel */
.save-panel {
  display: flex;
  justify-content: center;
  margin-top: 32px; /* Increased margin */
  padding-top: 24px; /* Add padding top */
  border-top: 1px solid var(--separator-color); /* Separator */
}

.btn-save {
  padding: 12px 24px;
  font-size: 1.1rem;
  min-width: 250px; /* Give save button min width */
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--modal-overlay-bg); /* Use variable */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(3px); /* Slightly more blur */
  padding: 20px; /* Add padding to overlay */
}

.modal-content {
  background-color: var(--bg-color);
  border-radius: 12px;
  padding: 24px 32px; /* Adjust padding */
  max-width: 800px;
  width: 100%; /* Use full width up to max */
  max-height: calc(100vh - 80px); /* Limit height */
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  overflow: hidden; /* Prevent content overflow */
}
.modal-content h2 {
  margin-bottom: 16px;
  color: var(--primary-color);
  font-size: 1.5rem; /* Adjust size */
  flex-shrink: 0; /* Prevent shrinking */
}

.modal-hint {
  margin-bottom: 16px;
  color: var(--text-secondary); /* Use secondary text */
  font-size: 0.9rem;
  flex-shrink: 0; /* Prevent shrinking */
}

.json-editor-area {
  flex-grow: 1; /* Allow editor to take available space */
  /* height: 400px; */ /* Removed fixed height */
  min-height: 200px; /* Set minimum height */
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  margin-bottom: 16px;
   border: 1px solid var(--input-border); /* Add border */
   background-color: var(--input-bg); /* Use input bg */
   color: var(--text-color); /* Use text color */
}
.json-editor-area:focus {
    border-color: var(--input-focus-border);
    box-shadow: 0 0 0 3px var(--input-focus-shadow);
    outline: none;
}


.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  flex-shrink: 0; /* Prevent shrinking */
}

/* Error Messages */
.error-message {
  padding: 10px 16px; /* Adjust padding */
  background-color: var(--error-bg); /* Use variable */
  border-left: 5px solid var(--danger-color); /* Thicker border */
  color: var(--error-text); /* Use variable */
  margin-bottom: 16px;
  border-radius: 4px;
  font-size: 0.9rem; /* Adjust size */
  line-height: 1.4; /* Improve readability */
}
.error-message strong {
    font-weight: 600;
    margin-right: 4px;
}

/* Applied directly in :global(body.dark-theme) .voice-config */
/* :global(body.dark-theme) .error-message { */
  /* background-color: rgba(239, 68, 68, 0.2); */
  /* color: #fca5a5; */
/* } */

.test-error-msg {
   /* Inherits general error styling */
   margin-top: 10px; /* Add margin if it appears in results */
}


/* Message Bubble */
.message-bubble {
  position: fixed;
  bottom: -100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  background-color: var(--bg-color); /* Use bg color */
  color: var(--text-color); /* Use text color */
  border: 1px solid var(--border-color); /* Add subtle border */
  box-shadow: var(--shadow-md); /* Use darker shadow */
  z-index: 1000;
  transition: bottom 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55); /* Bouncy transition */
  max-width: 90%;
  text-align: center;
  font-weight: 500;
}

.message-bubble.active {
  bottom: 24px;
}

/* Type indicator borders */
.message-bubble.success { border-left: 4px solid var(--success-color); }
.message-bubble.error { border-left: 4px solid var(--danger-color); }
.message-bubble.warning { border-left: 4px solid var(--warning-color); }
.message-bubble.info { border-left: 4px solid var(--info-color); }

/* Loading Spinner (Used by Font Awesome now) */
/* .spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
} */

/* Responsive Design */
@media (max-width: 768px) {
  .voice-config {
      padding: 16px; /* Reduce padding */
  }
  .config-management-bar {
    /* flex-direction: column; */ /* Keep flex-row but allow wrap */
    /* align-items: stretch; */
    gap: 8px; /* Reduce gap */
  }
  #config-select {
      min-width: 150px; /* Adjust min-width */
  }

  .proxy-concurrency-row {
      gap: 16px; /* Reduce gap */
      padding: 12px; /* Reduce padding */
  }

  .test-controls {
    /* flex-direction: column; */ /* Keep row but allow wrap */
    /* align-items: stretch; */ /* Keep align-items: flex-end */
     gap: 12px; /* Reduce gap */
  }
  .test-control-item {
      min-width: 150px; /* Reduce min-width */
  }


  .content-section {
    overflow-x: auto; /* Keep horizontal scroll for table */
  }

  .table-header, .entry-row {
    min-width: 700px; /* Adjust min-width as needed */
  }
  .col-dynamic {
      padding: 0 8px; /* Reduce padding */
  }

  .modal-content {
      padding: 16px 20px; /* Reduce modal padding */
      max-height: calc(100vh - 40px); /* Adjust max height */
  }
  .json-editor-area {
      font-size: 13px; /* Slightly smaller font */
  }
}
</style>