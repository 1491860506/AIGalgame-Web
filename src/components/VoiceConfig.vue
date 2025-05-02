<template>
  <div class="voice-config">
    <!-- Top Bar: Config Selection & Management -->
    <div class="config-management-bar">
      <label for="config-select">选择配置:</label>
      <select id="config-select" v-model="selectedConfigName" @change="switchConfig">
        <option v-if="!configNames.length" value="" disabled>-- 无可用配置 --</option>
        <option v-for="name in configNames" :key="name" :value="name">{{ name }}</option>
      </select>
      <button class="btn btn-sm btn-add" @click="addConfig">
        <span class="btn-icon">➕</span> 添加
      </button>
      <button class="btn btn-sm btn-modify" @click="openModifyModal" :disabled="!selectedConfigName">
        <span class="btn-icon">✏️</span> 修改定义
      </button>
      <button class="btn btn-sm btn-delete" @click="deleteConfig" :disabled="!selectedConfigName">
        <span class="btn-icon">🗑️</span> 删除
      </button>
    </div>

    <!-- Separator -->
    <div class="separator thick-separator"></div>

    <!-- Configurable Area (Only shown if a config is selected) -->
    <div v-if="selectedConfigName && currentConfigDefinition">
      <!-- Header Section (Proxy, URL, Prompts based on Definition) -->
      <div class="header-section">
        <h1 class="title">{{ selectedConfigName }} - 语音合成配置</h1>
        <!-- Subtitle removed as requested -->
        <!-- <p class="subtitle">配置语音文件、文本内容和模型参数</p> -->

        <!-- Proxy Switch (Conditional) -->
        <div class="proxy-config" v-if="currentConfigDefinition.localproxy === true">
          <label for="proxy-switch" class="proxy-label">使用本地代理:</label>
          <label class="toggle-switch">
            <input type="checkbox" id="proxy-switch" v-model="configData.useLocalProxy">
            <span class="toggle-label-switch"></span>
          </label>
        </div>

        <!-- Concurrency Input (Conditional based on allow_concurrency) -->
        <div class="concurrency-config" v-if="currentConfigDefinition.allow_concurrency === true">
           <label for="concurrency" class="concurrency-label">并发数:</label>
           <input type="number" id="concurrency" v-model.number="configData.concurrency" min="1" class="concurrency-input">
        </div>


        <!-- GPT Prompts (Conditional) -->
        <div v-if="currentConfigDefinition.gptprompt && currentConfigDefinition.gptprompt.length > 0" class="gpt-prompts">
           <div v-for="(prompt, index) in currentConfigDefinition.gptprompt" :key="index" class="prompt-item">
             <label :for="`prompt-${Object.keys(prompt)[0]}`">{{ Object.keys(prompt)[0] }}:</label>
             <textarea
               :id="`prompt-${Object.keys(prompt)[0]}`"
               v-model="configData[Object.keys(prompt)[0]]"
               :placeholder="`输入 ${Object.keys(prompt)[0]} 内容`"
               rows="3"
             ></textarea>
           </div>
        </div>

        <!-- Emotion Selector (Conditional) -->
        <div class="emotion-switcher" v-if="emotionsToConfigure.length > 1">
          <div class="emotion-title">语气选择:</div>
          <div class="emotion-options">
            <button
              v-for="emotion in emotionsToConfigure"
              :key="emotion"
              @click="switchEmotion(emotion)"
              class="emotion-btn"
              :class="{ active: currentEmotion === emotion }"
              :data-emotion="emotion"
            >
              <span class="emotion-label">{{ emotion || '默认' }}</span> <!-- Show '默认' if emotion is empty string -->
            </button>
          </div>
        </div>

        <!-- Separator (optional, can be removed if redundant) -->
        <!-- <div class="separator"></div> -->
      </div>

      <!-- Main Content Area -->
      <div class="content-section">
        <!-- Current Emotion Indicator (Conditional) -->
        <div class="current-emotion-indicator" v-if="emotionsToConfigure.length > 1" :class="`emotion-${currentEmotion || 'default'}`"> <!-- Added default class -->
          <span class="emotion-indicator-text">当前配置语气: {{ currentEmotion || '默认' }}</span>
        </div>

        <!-- Header Row (Dynamic) -->
        <div class="table-header">
          <div class="col-index">序号</div>
          <div v-for="item in requiredItems" :key="item.key" class="col-dynamic" :style="{ flex: getColumnFlex(item.key) }">
            <span>{{ item.label }}</span> <!-- Wrap label in span for alignment -->
             <button
                v-if="item.filling"
                @click="applyFilling(item.key)"
                class="btn btn-xs btn-fill"
                title="将序号1的内容应用到全部"
              >
                <span class="btn-icon-xs">⏬</span> 一键填入
              </button>
          </div>
        </div>

        <!-- Entries (Dynamic) - REMOVED internal scroll container -->
        <!-- <div class="entries-container-no-scroll"> -->
          <div
            v-for="index in numberOfEntries"
            :key="index"
            class="entry-row"
            :class="{ 'even-row': (index - 1) % 2 === 1 }"
          >
            <div class="col-index">{{ index }}</div>
            <div v-for="item in requiredItems" :key="item.key" class="col-dynamic" :style="{ flex: getColumnFlex(item.key) }">
              <!-- File Select Input -->
              <div v-if="item.type === 'fileselect'" class="fileselect-wrapper">
                 <input
                   type="text"
                   :value="getInputValue(index, currentEmotion, item.key)"
                   readonly
                   placeholder="选择文件..."
                   class="fileselect-display"
                 />
                 <input
                   type="file"
                   :id="`fileInput_${index}_${currentEmotion}_${item.key}`"
                   @change="handleFileSelect($event, index, currentEmotion, item.key)"
                   style="display: none;"
                  />
                 <label :for="`fileInput_${index}_${currentEmotion}_${item.key}`" class="btn btn-xs btn-file">选择文件</label>
              </div>
              <!-- Default Text Input -->
              <textarea
                v-else
                :value="getInputValue(index, currentEmotion, item.key)"
                @input="setInputValue($event.target.value, index, currentEmotion, item.key)"
                :placeholder="`输入 ${item.label}`"
                rows="2"
              ></textarea>
            </div>
          </div>
        <!-- </div> --> <!-- End of removed scroll container -->
      </div>

      <!-- ***** NEW: Test Panel ***** -->
      <div class="test-panel">
        <h3 class="panel-title">测试当前配置 (序号 1)</h3>
        <div class="test-controls">
          <button class="btn btn-info btn-test" @click="testCurrentConfig" :disabled="isTesting || !selectedConfigName">
            <span v-if="isTesting" class="spinner"></span>
            <span v-else class="btn-icon">🧪</span>
            {{ isTesting ? '正在测试中...' : '运行测试' }}
          </button>
          <p v-if="isTesting" class="test-status-text">正在生成测试语音，请稍候...</p>
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
          <span class="btn-icon">💾</span> 保存 {{ selectedConfigName }} 配置数据
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
            <textarea v-model="currentJsonEdit" class="json-editor-area"></textarea>
            <div v-if="jsonEditError" class="error-message">{{ jsonEditError }}</div>
            <div class="modal-actions">
                <button class="btn btn-secondary" @click="closeModifyModal">取消</button>
                <button class="btn btn-primary" @click="saveModifiedConfig">保存定义</button>
            </div>
        </div>
    </div>

    <!-- Message Bubble for notifications -->
    <div
      class="message-bubble"
      :class="{ active: showMessage, success: messageType === 'success', error: messageType === 'error', warning: messageType === 'warning', info: messageType === 'info' }"
    >
      <span>{{ messageContent }}</span>
    </div>
  </div>
</template>

<script>
import { writeFile, readFile, createFolder } from './services/IndexedDBFileSystem.js'; // Assuming this path is correct
// Import necessary functions, including the renamed processing function
import { generateVoice, makeApiRequest, substituteVariables, unquoteVariablesDeep, processConversationAudioRequest } from './services/voiceGenerator.js'; // Adjust path if needed

const LS_KEY = 'aiGalgameConfig';
const SOVITS_KEY = 'SOVITS';
const CONFIG_DEFINITIONS_KEY = 'config'; // Store definitions under aiGalgameConfig.SOVITS.config
const SELECTED_MODEL_KEY = 'model_choose'; // Key to store the selected config name

export default {
  name: 'VoiceConfigMulti',
  data() {
    return {
      configurations: {}, // Stores all config definitions { name: { definition } }
      configNames: [], // Stores names for the dropdown
      selectedConfigName: null, // Currently selected config name
      currentConfigDefinition: null, // JSON definition of the selected config
      configData: {}, // Holds the actual user-entered data for the selected config
      filesToSave: {}, // Temporary store for File objects { dataKey_itemKey: File }

      currentEmotion: '', // Currently selected emotion for editing

      // UI State
      isEditingConfigJson: false,
      currentJsonEdit: '',
      jsonEditError: '',

      // Message system
      showMessage: false,
      messageType: 'success',
      messageContent: '',
      messageTimeout: null,

      // ***** NEW: Test State *****
      isTesting: false,
      testShortAudioSrc: null,
      testLongAudioSrc: null,
      testError: null,
      // Store blob URLs to revoke them later
      blobUrlShort: null,
      blobUrlLong: null,
      // ---------------------------
    };
  },
  computed: {
    // --- Computed properties based on currentConfigDefinition ---
    numberOfEntries() {
      return this.currentConfigDefinition?.number || 0;
    },
    emotionsToConfigure() {
      const emotions = this.currentConfigDefinition?.emotion_list;
      return emotions && emotions.length > 0 ? emotions : ['']; // Use '' for default/no emotion case
    },
    requiredItems() {
        return (this.currentConfigDefinition?.required_item || []).map(item => {
            const key = Object.keys(item)[0];
            const label = item[key];
            const filling = item.filling === true;
            // Determine type based on key name pattern or specific key like 'fileselect'
            // Note: The 'fileselect' key itself is the type indicator in the config.
            const type = key === 'fileselect' ? 'fileselect' : 'text';
            return { key, label, filling, type };
        });
    },
    // --- Helpers ---
    allowedVariables() {
        const itemKeys = (this.currentConfigDefinition?.required_item || []).map(item => Object.keys(item)[0]);
        // Add standard internal variables available for substitution
        return new Set([...itemKeys, 'gptreturn', 'text', 'language']);
    }
  },
  mounted() {
    this.loadAllConfigs();
    // Load the previously selected model if available
    const lastSelected = this.loadLastSelectedModel();
    if (lastSelected && this.configNames.includes(lastSelected)) {
        this.selectedConfigName = lastSelected;
    } else if (this.configNames.length > 0) {
       this.selectedConfigName = this.configNames[0]; // Fallback to first
    }

    if (this.selectedConfigName) {
       this.switchConfig(); // Load definition and data for the selected/default config
    }
  },
  beforeUnmount() {
      // ***** NEW: Revoke Blob URLs on component destroy *****
      this.revokeTestAudioUrls();
      // ---------------------------------------------------
      clearTimeout(this.messageTimeout); // Also clear message timeout
  },
  methods: {
    // --- Config Management ---
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
                // Quote variables before saving definition JSON
                configsToSave[name] = this.quoteVariables(this.configurations[name]);
            }
             saved[SOVITS_KEY][CONFIG_DEFINITIONS_KEY] = configsToSave;

            localStorage.setItem(LS_KEY, JSON.stringify(saved));
        } catch (error) {
            console.error('Error saving config definitions:', error);
            this.showMessageBubble('error', '保存配置列表失败');
        }
    },

    // --- NEW: Function to save the currently selected config name ---
    saveLastSelectedModel(configName) {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
            if (!saved[SOVITS_KEY]) {
                saved[SOVITS_KEY] = {};
            }
            if (configName) {
                saved[SOVITS_KEY][SELECTED_MODEL_KEY] = configName;
            } else {
                // If configName is null or undefined, remove the key
                delete saved[SOVITS_KEY][SELECTED_MODEL_KEY];
            }
            localStorage.setItem(LS_KEY, JSON.stringify(saved));
        } catch (error) {
             console.error('Error saving last selected model name:', error);
             // Non-critical error, maybe don't show bubble
        }
    },

    // --- NEW: Function to load the previously selected config name ---
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
        // Updated defaultConfig structure
        const defaultConfig = {
          number: 7,
          required_item: [
            { "modelname": "模型名称" }
          ],
          url: "http://test.com/tts",
          requestmethod: "get",
          getparams: [{ "model": "{{modelname}}" }],
          // Add example before_requests
          "before_requests": [
            {
              "url": "http://test.com/auth",
              "requestmethod": "post",
              "body": { "key": "your_api_key" }
            }
          ],
          "judge_repeat_before": "{{modelname}}", // Example repeat logic
          "allow_concurrency": false // Default to false
        };

        this.configurations[trimmedName] = defaultConfig;
        this.configNames.push(trimmedName);
        this.saveAllConfigs();
        this.selectedConfigName = trimmedName;
        this.switchConfig(); // This will now also save the selected name
        this.showMessageBubble('success', `配置 "${trimmedName}" 已添加`);
      } else if (name) {
        this.showMessageBubble('error', `配置名称 "${name.trim()}" 已存在或无效`);
      }
    },

    openModifyModal() {
        if (!this.selectedConfigName) return;
        try {
            // Unquote variables before displaying in editor
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
            // Quote variables back before saving the definition internally
            this.configurations[this.selectedConfigName] = this.quoteVariables(newDefinition);
            this.saveAllConfigs();
            // Reload the definition after saving (it will be unquoted by switchConfig)
            this.switchConfig(); // Reload everything for the current config
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

        // 1. Delete definition
        delete this.configurations[nameToDelete];
        this.configNames = this.configNames.filter(name => name !== nameToDelete);

        // 2. Delete associated data
        try {
            const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
            if (saved[SOVITS_KEY]?.[nameToDelete]) {
                 delete saved[SOVITS_KEY][nameToDelete];
                 // Check if the deleted config was the last selected one
                 if (saved[SOVITS_KEY]?.[SELECTED_MODEL_KEY] === nameToDelete) {
                     delete saved[SOVITS_KEY][SELECTED_MODEL_KEY]; // Remove it if it was selected
                 }
                 localStorage.setItem(LS_KEY, JSON.stringify(saved));
            }
        } catch(error) {
            console.error(`Error deleting data for config ${nameToDelete}:`, error);
        }

        // 3. Save updated definitions
        this.saveAllConfigs();

        // 4. Update UI
        this.selectedConfigName = this.configNames.length > 0 ? this.configNames[0] : null;

        // *** Save the new selected config name (or null if none left) ***
        this.saveLastSelectedModel(this.selectedConfigName);

        if (this.selectedConfigName) {
            this.switchConfig(); // Load the next selected config
        } else {
            this.currentConfigDefinition = null;
            this.configData = {}; // Clear data if no config is left
        }

        this.showMessageBubble('success', `配置 "${nameToDelete}" 已删除`);
      }
    },

    switchConfig() {
        if (!this.selectedConfigName) {
            this.currentConfigDefinition = null;
            this.configData = {};
            this.filesToSave = {};
            this.saveLastSelectedModel(null); // Save null if no config is selected
            return;
        }

        // *** Save the newly selected config name ***
        this.saveLastSelectedModel(this.selectedConfigName);

        // Load definition and unquote variables for use in UI/logic
        this.currentConfigDefinition = unquoteVariablesDeep(
             JSON.parse(JSON.stringify(this.configurations[this.selectedConfigName] || {}))
        );

        // Set initial emotion
        this.currentEmotion = this.emotionsToConfigure.length > 0 ? this.emotionsToConfigure[0] : ''; // Default to first or empty

        // Load data for the selected config
        this.loadConfigData();
        this.filesToSave = {}; // Clear pending files
    },

    // --- Data Handling ---
    loadConfigData() {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
            // Ensure we get a fresh object copy to avoid potential reactivity issues with direct localStorage reference
            const loadedData = saved?.[SOVITS_KEY]?.[this.selectedConfigName] || {};

            // Initialize concurrency if enabled and missing/invalid
            if (this.currentConfigDefinition?.allow_concurrency === true) {
                const loadedConcurrency = loadedData.concurrency;
                if (typeof loadedConcurrency !== 'number' || !Number.isInteger(loadedConcurrency) || loadedConcurrency <= 0) {
                    loadedData.concurrency = 1; // Default to 1 if invalid or missing
                }
            } else {
                 // If concurrency is not enabled in definition, ensure it's not set in data or ignored
                 delete loadedData.concurrency;
            }


            this.configData = JSON.parse(JSON.stringify(loadedData)); // Deep copy for reactivity


            // Initialize default values from required_item and gptprompt if missing in loaded data
            // Note: This only initializes the first entry (index 1) and top-level gptprompt data
             (this.currentConfigDefinition?.required_item || []).forEach(item => {
                 const key = Object.keys(item)[0]; // e.g., 'fileselect', 'modelname'
                 // If the item key is meant to be a file select, don't set a default text value
                 if (item.hasOwnProperty('fileselect') || key === 'fileselect') { // Check both key and potential property name
                     // Skip this specific key or definition indicating fileselect
                     if (key === 'fileselect' || item.fileselect === true) return;
                 }

                 // Initialize if the key is not present or is explicitly null/undefined in loaded data for the first entry (index 1)
                 if (this.configData[1] === undefined || this.configData[1][key] === undefined || this.configData[1][key] === null) {
                      // Note: We only initialize the *first* entry (index 1) with the default from the definition.
                      // Other entries are expected to be empty unless saved data exists.
                     if (!this.configData[1]) this.configData[1] = {};
                     const itemDefaultValue = item[key];
                     // Initialize with default value from definition, default to '' if definition value is not primitive or is null/undefined
                     this.configData[1][key] = (typeof itemDefaultValue === 'string' || typeof itemDefaultValue === 'number' || typeof itemDefaultValue === 'boolean') ? itemDefaultValue : '';
                 }
             });

             (this.currentConfigDefinition?.gptprompt || []).forEach(promptItem => {
                 const key = Object.keys(promptItem)[0];
                 if (this.configData[key] === undefined || this.configData[key] === null) {
                     // Initialize gptprompt keys with their default values from definition
                     this.configData[key] = promptItem[key] || ''; // Use default from definition
                 }
             });

             if (this.currentConfigDefinition?.localproxy === true && typeof this.configData.useLocalProxy === 'undefined') {
                 this.configData.useLocalProxy = false;
             }

        } catch (error) {
            console.error(`Error loading data for config ${this.selectedConfigName}:`, error);
            this.showMessageBubble('error', `加载配置 "${this.selectedConfigName}" 的数据失败`);
            this.configData = {}; // Reset on error
            // Re-initialize concurrency and proxy defaults if definition allows, even after error
            if (this.currentConfigDefinition?.allow_concurrency === true) {
                 this.configData.concurrency = 1;
            }
             if (this.currentConfigDefinition?.localproxy === true) {
                 this.configData.useLocalProxy = false;
            }
        }
    },

    async saveConfigData() {
        if (!this.selectedConfigName || !this.currentConfigDefinition) {
            this.showMessageBubble('error', '没有选中的配置可保存');
            return;
        }

        // Validate concurrency value before saving if enabled
        if (this.currentConfigDefinition.allow_concurrency === true) {
            const concurrencyValue = this.configData.concurrency;
            if (typeof concurrencyValue !== 'number' || !Number.isInteger(concurrencyValue) || concurrencyValue <= 0) {
                this.showMessageBubble('error', '并发数必须是大于0的整数，请修正后保存。');
                // Reset to 1 or previous valid value if needed, but for now just prevent save.
                // this.configData.concurrency = 1; // Or revert to previous valid state if stored
                return;
            }
        }


        const fileSavePromises = [];
        for (const key in this.filesToSave) {
            const file = this.filesToSave[key];
            if (file instanceof File) {
                // Construct path: /data/tts_config_name/filename
                const filePath = `/data/tts_${this.selectedConfigName}/${file.name}`;
                fileSavePromises.push(
                    createFolder(`/data/tts_${this.selectedConfigName}`) // Ensure directory exists first
                    .catch(err => {
                        // Ignore if folder already exists, log other errors
                        if (!err.message.includes('文件夹已存在') && !err.message.includes('Key already exists')) {
                            console.warn(`创建文件目录时出错 (可能已存在): ${err.message}`);
                         }
                    })
                    .then(() => writeFile(filePath, file)) // Then write the file
                    .catch(err => {
                        console.error(`Error writing file ${file.name} to ${filePath}:`, err);
                        this.showMessageBubble('error', `保存文件 ${file.name} 失败: ${err.message}`);
                        throw err; // Re-throw to fail Promise.all
                    })
                );
            }
        }

        try {
            await Promise.all(fileSavePromises);

            // Save configData to localStorage
            const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
            if (!saved[SOVITS_KEY]) {
                saved[SOVITS_KEY] = {};
            }
            // Save a deep copy of the current data
            // Include concurrency value if present in configData
            saved[SOVITS_KEY][this.selectedConfigName] = JSON.parse(JSON.stringify(this.configData));
            localStorage.setItem(LS_KEY, JSON.stringify(saved));

            this.filesToSave = {}; // Clear pending files
            this.showMessageBubble('success', `配置 "${this.selectedConfigName}" 的数据已保存`);

        } catch (error) {
            console.error('Error saving config data or files:', error);
             // Avoid double message if file write failed (Promise.all will catch it)
             if (fileSavePromises.length === 0 || !fileSavePromises.some(p => p.status === 'rejected')) { // Check if any file save explicitly rejected
                this.showMessageBubble('error', `保存配置 "${this.selectedConfigName}" 数据失败`);
            }
        }
    },


    // --- Dynamic Input Getters/Setters ---
    getDataKey(index, emotion) {
        // Use index + 1 as the key (matches story JSON 1-based indexing)
        // Only append emotion if emotions are configured in the definition and a non-empty emotion is provided
         const hasEmotionsConfigured = Array.isArray(this.currentConfigDefinition?.emotion_list) && this.currentConfigDefinition.emotion_list.length > 0;
        return hasEmotionsConfigured && emotion ? `${index}_${emotion}` : `${index}`;
    },

    getInputValue(index, emotion, itemKey) {
        const dataKey = this.getDataKey(index, emotion);
        // Check if configData[dataKey] exists before accessing itemKey
        return this.configData[dataKey]?.[itemKey] || '';
    },

    setInputValue(value, index, emotion, itemKey) {
        const dataKey = this.getDataKey(index, emotion);
        // Vue 3: Use $set for reactivity with nested objects
        if (!this.configData[dataKey]) {
            // Note: While $set is technically for Vue 2, directly assigning properties to
            // an existing reactive object *usually* works in Vue 3 Composition API
            // or when the parent object is reactive. For clarity and compatibility,
            // especially with potentially empty configData[dataKey], ensure reactivity.
            // Using `this.$set` is safe, or ensure `configData` is initialized properly.
            // Let's stick to direct assignment as `configData` itself is reactive.
            this.configData[dataKey] = this.configData[dataKey] || {}; // Ensure the object exists
        }
        // Ensure the target object is reactive or use a method that guarantees reactivity
        // Vue 3 typically makes nested objects reactive upon access/assignment to the reactive parent
        this.configData[dataKey][itemKey]=value;

        // Ensure reactivity update if needed (sometimes necessary for deeply nested or new properties)
        // This is more for Vue 2, but can sometimes help ensure view updates in edge cases in Vue 3 reactivity nuances.
        // Consider if `this.$set` is still preferred or if a direct assignment is sufficient.
        // For typical data structures loaded from JSON, direct assignment like `this.configData[dataKey][itemKey] = value;` should be reactive in Vue 3
        // if `this.configData` is properly reactive and `dataKey` already exists or is assigned an object.
        // Since we ensure `this.configData[dataKey]` is an object, this direct assignment *should* work.
    },


    handleFileSelect(event, index, emotion, itemKey) {
        const file = event.target.files[0];
        if (!file) return;

        const dataKey = this.getDataKey(index, emotion);
        const fileStorageKey = `${dataKey}_${itemKey}`;

        // Ensure the target object for reactivity exists before setting the value
         if (!this.configData[dataKey]) {
             this.configData[dataKey] = {};
         }
        this.configData[dataKey][itemKey] = file.name; // Set file name string in configData

        this.filesToSave[fileStorageKey] = file; // Store the actual file object separately
        event.target.value = null; // Clear input value so selecting the same file triggers change event next time
    },

    // --- UI Helpers ---
    switchEmotion(emotion) {
        this.currentEmotion = emotion;
    },

    applyFilling(itemKey) {
        if (!this.currentConfigDefinition || this.numberOfEntries <= 1) return;

        const firstDataKey = this.getDataKey(1, this.currentEmotion);
        // Ensure the source data key exists before accessing
        if (!this.configData[firstDataKey]) {
             this.showMessageBubble('warning', `序号1的配置数据不存在，无法填充`);
             return;
        }
        const valueToFill = this.configData[firstDataKey][itemKey];


        // Check for null/undefined/empty string as values to fill
        if (typeof valueToFill === 'undefined' || valueToFill === null || valueToFill === '') {
            this.showMessageBubble('warning', `序号1的 "${this.requiredItems.find(i => i.key === itemKey)?.label}" 为空，无法填充`);
            return;
        }

        let filledCount = 0;
        for (let i = 2; i <= this.numberOfEntries; i++) {
             const targetDataKey = this.getDataKey(i, this.currentEmotion);

              // Ensure the target data key object exists for reactivity
             if (!this.configData[targetDataKey]) {
                 this.configData[targetDataKey] = {};
             }

             // Only fill if the target is currently empty or different from the source value
             if (this.getInputValue(i, this.currentEmotion, itemKey) !== valueToFill) {
                 // Directly assign to ensure reactivity after ensuring the parent object exists
                 this.configData[targetDataKey][itemKey] = valueToFill;
                 filledCount++;

                 // If it's a fileselect, remove any pending file for the target index
                 if(this.requiredItems.find(item => item.key === itemKey)?.type === 'fileselect') {
                     const fileStorageKey = `${targetDataKey}_${itemKey}`;
                     if (this.filesToSave[fileStorageKey]) {
                        delete this.filesToSave[fileStorageKey];
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
        // Adjust flex based on item key or type
        if (itemKey === 'reference_text') return 3; // Text area like inputs
        if (itemKey === 'fileselect') return 3; // File select inputs often need more space
        if (itemKey === 'model' || itemKey === 'modelname') return 2; // Model identifiers
        // Default flex for other text inputs
        return 2;
    },

    // --- JSON Definition Handling ---
    // Quote variables inside string *values* like "key": "{{variable}}" -> "key": "\"{{variable}}\""
    // This function prepares the definition for localStorage storage to avoid JSON.parse issues later
    quoteVariables(jsonObj) {
         try {
             // Use unquoteVariablesDeep first to ensure variables are {{var}} not "{{var}}"
             // This prevents double quoting if a user manually quoted in the editor.
             let unquotedObj = unquoteVariablesDeep(jsonObj);

             // Now, recursively traverse the object and quote any string value that is exactly {{variable}}
             const quoteRecursive = (data) => {
                 if (typeof data === 'string') {
                     // Check if the string value is *exactly* a variable placeholder
                     if (/^{{\s*\w+\s*}}$/.test(data)) {
                         // Quote the string value
                         return JSON.stringify(data); // This adds the quotes and escapes inner quotes if any (though not expected here)
                     }
                     return data; // Return original string if not a variable placeholder
                 } else if (Array.isArray(data)) {
                     return data.map(item => quoteRecursive(item));
                 } else if (data !== null && typeof data === 'object') {
                     const newObj = {};
                     for (const key in data) {
                         if (Object.hasOwnProperty.call(data, key)) {
                             newObj[key] = quoteRecursive(data[key]);
                         }
                     }
                     return newObj;
                 }
                 return data;
             };

             return quoteRecursive(unquotedObj);

         } catch (e) {
             console.error("Error quoting variables:", e);
             // Return original if error, but this could lead to subtle issues on load later
             return jsonObj;
         }
    },

    // Unquote variables from string *values* like "key": "\"{{variable}}\"" -> "key": "{{variable}}"
    // This function prepares the definition loaded from localStorage for use (editing, logic)
    unquoteVariables(jsonObj) {
         // Use the robust deep unquoting function from voiceGenerator
         try {
             return unquoteVariablesDeep(jsonObj);
         } catch (e) {
              console.error("Error unquoting variables:", e);
              // Return a deep clone of the original object if error
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

        // Basic required keys check
        const requiredKeys = ['number', 'required_item', 'url'];
        for (const key of requiredKeys) {
            if (!(key in parsedJson)) {
                return { isValid: false, message: `缺少必需的配置项: ${key}` };
            }
        }
        // Validate basic types and content
        if (!Array.isArray(parsedJson.required_item) || parsedJson.required_item.length === 0) {
            return { isValid: false, message: `required_item 必须是非空数组` };
        }
         // Ensure number is a positive integer
       if (typeof parsedJson.number !== 'number' || !Number.isInteger(parsedJson.number) || parsedJson.number <= 0) {
            return { isValid: false, message: `number 必须是正整数` };
       }
       if (typeof parsedJson.url !== 'string' || parsedJson.url.trim() === '') {
            return { isValid: false, message: `url 必须是非空字符串` };
       }

       // Validate allow_concurrency if present
        if ('allow_concurrency' in parsedJson && typeof parsedJson.allow_concurrency !== 'boolean') {
             return { isValid: false, message: 'allow_concurrency 必须是布尔值 (true 或 false)' };
        }


        // Validate main URL request method/params/body consistency
        const mainMethod = parsedJson.requestmethod ? parsedJson.requestmethod.toUpperCase() : 'GET';
        const hasMainGet = Array.isArray(parsedJson.getparams) && parsedJson.getparams.length > 0;
        // Check if body is present and not null/undefined
        const hasMainBody = parsedJson.body !== undefined && parsedJson.body !== null;
        if (mainMethod === 'GET' && hasMainBody) {
             return { isValid: false, message: 'requestmethod 是 GET 时，不应配置 body' };
        }
         if (mainMethod === 'POST' && hasMainGet) {
             return { isValid: false, message: 'requestmethod 是 POST 时，不应配置 getparams' };
         }
         if (mainMethod !== 'GET' && mainMethod !== 'POST') {
              return { isValid: false, message: `requestmethod 必须是 "get" 或 "post"` };
         }

        // --- Validate before_requests array ---
        const beforeRequests = parsedJson.before_requests;
        if (beforeRequests !== undefined && beforeRequests !== null) { // It's optional
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
                 const reqMethod = req.requestmethod ? req.requestmethod.toUpperCase() : 'GET';
                 if (reqMethod !== 'GET' && reqMethod !== 'POST') {
                      return { isValid: false, message: `before_requests 数组的第 ${i + 1} 个请求的 requestmethod 必须是 "get" 或 "post"` };
                 }
                 const hasReqGet = Array.isArray(req.getparams) && req.getparams.length > 0;
                 const hasReqBody = req.body !== undefined && req.body !== null;
                 if (reqMethod === 'GET' && hasReqBody) {
                     return { isValid: false, message: `before_requests 数组的第 ${i + 1} 个请求 requestmethod 是 GET 时，不应配置 body` };
                 }
                  if (reqMethod === 'POST' && hasReqGet) {
                     return { isValid: false, message: `before_requests 数组的第 ${i + 1} 个请求 requestmethod 是 POST 时，不应配置 getparams` };
                 }
             }
        }
        // --- End validation for before_requests ---


        // Validate judge_repeat_before
        const judgeRepeatBefore = parsedJson.judge_repeat_before;
        if (judgeRepeatBefore !== undefined && judgeRepeatBefore !== null && judgeRepeatBefore !== "") {
            if (typeof judgeRepeatBefore !== 'string') {
                return { isValid: false, message: `judge_repeat_before 必须是字符串` };
            }
            // Check format: must be "{{param}}" exactly
            const variableMatch = judgeRepeatBefore.match(/^\{\{\s*(\w+)\s*\}\}$/);
            if (!variableMatch) {
                 return { isValid: false, message: `judge_repeat_before 必须是空字符串或 "{{变量名}}" 的形式` };
            }
            const variableName = variableMatch[1];
            // Check if the variable name is allowed (from required_item, gptreturn, text, language)
            if (!this.allowedVariables.has(variableName)) {
                 return { isValid: false, message: `judge_repeat_before 中的变量 "{{${variableName}}}" 不允许。允许的变量有: ${[...this.allowedVariables].join(', ')}` };
            }
             // If judge_repeat_before is set, allow_concurrency must be true
             if (parsedJson.allow_concurrency !== true) {
                  return { isValid: false, message: `如果定义了 judge_repeat_before，则 allow_concurrency 必须设置为 true 以启用并发控制。` };
             }
        } else {
             // judge_repeat_before is optional or empty, no further validation needed for its content
        }


        // Validate variable usage in url, getparams, body, and all before_requests parts
        const errors = [];
        const allowedVars = this.allowedVariables; // Use computed property

        // Helper to find variables in a structure
        const findVariablesInStructure = (struct) => {
            const vars = new Set();
            // Regex to find {{ variable }} anywhere in a string
            const regex = /{{\s*(\w+)\s*}}/g;

            const process = (item) => {
                if (typeof item === 'string') {
                    let match;
                    // Use exec in a loop to find all matches
                    while ((match = regex.exec(item)) !== null) {
                        vars.add(match[1]);
                    }
                    // Reset regex lastIndex if needed (though for simple global regex it's fine)
                    regex.lastIndex = 0;

                } else if (Array.isArray(item)) {
                    item.forEach(process);
                } else if (item !== null && typeof item === 'object') {
                    for (const key in item) {
                         if (Object.hasOwnProperty.call(item, key)) {
                             process(item[key]);
                         }
                    }
                }
            };

            // Check main config parts
            process(parsedJson.url);
            process(parsedJson.requestmethod); // check method string too just in case
            process(parsedJson.getparams);
            process(parsedJson.body);

            // Check before_requests parts if array exists
            if (Array.isArray(parsedJson.before_requests)) {
                 parsedJson.before_requests.forEach(req => {
                     if (req && typeof req === 'object') {
                         process(req.url);
                         process(req.requestmethod); // check method string too just in case
                         process(req.getparams);
                         process(req.body);
                     }
                 });
            }

            // Check judge_repeat_before itself if it's a variable string
             if (judgeRepeatBefore && typeof judgeRepeatBefore === 'string') {
                const variableMatch = judgeRepeatBefore.match(/^\{\{\s*(\w+)\s*\}\}$/);
                if (variableMatch) {
                     vars.add(variableMatch[1]); // Add the variable name found in judge_repeat_before
                }
             }

            return vars;
        };

        const usedVars = findVariablesInStructure(parsedJson); // Check the entire parsed JSON structure

        for (const variable of usedVars) {
            if (!allowedVars.has(variable)) {
                // Only add error if the variable is NOT allowed.
                // The judge_repeat_before specific check already happened above.
                // Remove the specific judge_repeat_before check here as it's already validated above.
                 errors.push(`不允许或未定义的变量: {{${variable}}}. 允许的变量可能来自 required_item, gptreturn, text, language.`);
            }
        }

        if (errors.length > 0) {
            // Filter unique errors
            return { isValid: false, message: [...new Set(errors)].join('; ') };
        }

        // Return the original parsed JSON
        return { isValid: true, message: 'JSON 定义有效', parsedJson };
    },


    // ***** NEW: Method to revoke existing Blob URLs *****
    revokeTestAudioUrls() {
        if (this.blobUrlShort) {
            URL.revokeObjectURL(this.blobUrlShort);
            this.blobUrlShort = null;
            this.testShortAudioSrc = null; // Clear src as well
        }
        if (this.blobUrlLong) {
            URL.revokeObjectURL(this.blobUrlLong);
            this.blobUrlLong = null;
            this.testLongAudioSrc = null; // Clear src as well
        }
    },
    // --------------------------------------------------

    // ***** NEW: Test Configuration Method *****
    async testCurrentConfig() {
        if (!this.selectedConfigName || !this.currentConfigDefinition) {
            this.showMessageBubble('warning', '请先选择一个要测试的配置');
            return;
        }
        if (this.isTesting) {
            return; // Prevent multiple simultaneous tests
        }

        this.isTesting = true;
        this.testError = null;
        // Revoke previous URLs before starting new test
        this.revokeTestAudioUrls();
        this.showMessageBubble('info', '开始测试语音生成...');

        // Test parameters
        const nameId = 1; // Use first entry config (1-based index)
        const lang = "zh"; // Assume Chinese for test text
        const testEmotion = this.currentEmotion || (this.emotionsToConfigure.length > 0 ? this.emotionsToConfigure[0] : ''); // Use current UI emotion or default

        // For testing, use the local proxy setting from configData
        const useLocalProxy = this.configData?.useLocalProxy === true;

        try {
            // --- Prepare Variables Map for Test (using index 1 data) ---
            // This map is needed for both before_requests and main url substitutions for the test case (index 1, current emotion)
             const testVariablesMap = {};
             testVariablesMap['language'] = lang; // Add language variable
             // Note: The test text ("测试") and long text are added *later* specifically for the main request calls.
             // They are NOT part of the map used for *before_requests*.
             testVariablesMap['gptreturn'] = testEmotion; // Use the emotion chosen for the test

             // Determine the data key based on test index (1) and test emotion
            const hasEmotionsConfigured = Array.isArray(this.currentConfigDefinition?.emotion_list) && this.currentConfigDefinition.emotion_list.length > 0;
            // Determine the effective emotion for the data key look based on testEmotion and configured emotion list
            let emotionUsedForKey = ''; // Default to empty string
             if (hasEmotionsConfigured) {
                  const emotionList = this.currentConfigDefinition.emotion_list || [];
                  let effectiveEmotion = testEmotion || '';

                  if (effectiveEmotion === '' || !emotionList.includes(effectiveEmotion)) {
                      const feedbackEmotion = this.currentConfigDefinition?.emotion_feedback;
                       if (typeof feedbackEmotion === 'string' && feedbackEmotion !== '' && emotionList.includes(feedbackEmotion)) {
                          effectiveEmotion = feedbackEmotion;
                       }
                  }
                   emotionUsedForKey = effectiveEmotion;
             }
             const dataKey = hasEmotionsConfigured && emotionUsedForKey ? `${nameId}_${emotionUsedForKey}` : `${nameId}`;
             const rowData = this.configData?.[dataKey] || {};

             // Add values from required_item in configData (index 1, effective emotion) to the variables map
            (this.currentConfigDefinition?.required_item || []).forEach(item => {
                const itemKey = Object.keys(item)[0]; // e.g., 'fileselect', 'modelname'
                const valueFromData = rowData[itemKey];
                 const itemDefaultValue = item[itemKey]; // Default value from definition { "key": "Default Value" }
                 if (valueFromData !== undefined && valueFromData !== null && valueFromData !== '') {
                     testVariablesMap[itemKey] = valueFromData;
                 } else if (typeof itemDefaultValue === 'string' || typeof itemDefaultValue === 'number' || typeof itemDefaultValue === 'boolean') {
                     testVariablesMap[itemKey] = itemDefaultValue;
                 } else {
                      testVariablesMap[itemKey] = ''; // Default to empty string
                 }
            });

            console.log("Test variables (excluding text) for substitution:", testVariablesMap);

            // --- Handle Before Requests for Test ---
            // The test function ALWAYS runs the before_requests if defined, ignoring judge_repeat_before.
            const beforeRequests = this.currentConfigDefinition?.before_requests;

            if (Array.isArray(beforeRequests) && beforeRequests.length > 0) {
                 this.showMessageBubble('info', `正在进行测试前置请求 (共 ${beforeRequests.length} 个)...`);

                 for (let i = 0; i < beforeRequests.length; i++) {
                     const beforeReqDef = beforeRequests[i];
                     if (!beforeReqDef || typeof beforeReqDef !== 'object' || !beforeReqDef.url) {
                         console.warn(`Skipping invalid before_request definition at index ${i}:`, beforeReqDef);
                         continue; // Skip invalid entries in the array
                     }

                     const beforeReqDetails = {
                         url: beforeReqDef.url,
                         requestmethod: beforeReqDef.requestmethod || 'GET', // Default to GET if not specified
                         getparams: beforeReqDef.getparams || [],
                         body: beforeReqDef.body,
                     };

                     // Substitute variables in beforeurl details using the test variables map (which doesn't include text yet)
                     const substitutedBeforeReqDetails = substituteVariables(beforeReqDetails, testVariablesMap);
                     console.log(`Substituted Before Request ${i + 1} details:`, substitutedBeforeReqDetails);

                     try {
                         this.showMessageBubble('info', `正在进行测试前置请求 ${i + 1}/${beforeRequests.length}: ${substitutedBeforeReqDetails.url}`);
                         // Make the beforeurl request
                         await makeApiRequest(
                             substitutedBeforeReqDetails.url,
                             substitutedBeforeReqDetails.requestmethod.toUpperCase(),
                             substitutedBeforeReqDetails.getparams,
                             substitutedBeforeReqDetails.body,
                             useLocalProxy
                         );
                         this.showMessageBubble('info', `测试前置请求 ${i + 1} 成功。`);
                         console.log(`Test Before Request ${i + 1} successful.`);

                     } catch (beforeError) {
                         console.error(`测试前置请求 ${i + 1} 失败:`, beforeError);
                         this.testError = `测试前置请求 ${i + 1} 失败: ${beforeError.message}`;
                         this.showMessageBubble('error', `测试前置请求 ${i + 1} 失败: ${beforeError.message}`);
                         this.isTesting = false;
                         this.revokeTestAudioUrls();
                         return; // Stop test if any before request fails
                     }
                 }
                 this.showMessageBubble('success', '所有测试前置请求成功。');

            } else {
                 console.log("No before_requests configured or array is empty. Skipping before requests test.");
            }
            // --- End Handle Before Requests ---


            // --- Handle Main URL for Test (Short Text) ---
            const textShort = "测试";
            // Generate a unique filename for test previews
            const shortFileName = `test_short_${this.selectedConfigName}_${Date.now()}`;
            // Create a variables map *including* the specific text for the short audio test
            const shortTextVariablesMap = { ...testVariablesMap, text: textShort };

            this.showMessageBubble('info', `正在生成短文本语音...`);
            // Use processConversationAudioRequest for the main request, passing appropriate data
             try {
                 // processConversationAudioRequest requires a mock conversation object and output directory
                 const conversationMockShort = { id: shortFileName, character: 'TestChar', emotion: testEmotion, text: textShort }; // Mock object for structure/emotion
                 const testAudioDir = `/data/test/tts_test_preview/${this.selectedConfigName}`; // Distinct temp directory

                 // Ensure test preview directory exists
                 await createFolder(testAudioDir).catch(err => {
                     if (!err.message.includes('文件夹已存在') && !err.message.includes('Key already exists')) {
                         console.warn(`创建测试预览目录时出错 (可能已存在): ${err.message}`);
                     }
                 });

                 // Call processConversationAudioRequest
                 const resultShort = await processConversationAudioRequest(
                     nameId, // Use index 1 for data lookup
                     textShort, // Pass the actual text to synthesize
                     conversationMockShort, // Pass the mock conversation object
                     lang, // Pass language
                     //shortFileName, // Filename without extension
                     this.currentConfigDefinition, // Pass unquoted definition
                     this.configData, // Pass user data (includes proxy, concurrency - though concurrency is ignored by this function)
                     testAudioDir, // Pass directory path
                     (msg) => console.log(`Test (Short): ${msg}`) // Simple status logging for this step
                     // Note: processConversationAudioRequest builds its own variables map internally.
                     // We pass the raw data and definition, and it does the substitution.
                     // This is consistent with how generateVoice will use it.
                 );

                 if (resultShort["status"] !== "ok") {
                     throw new Error(`processConversationAudioRequest for short text returned status "${resultShort}"`);
                 }

                 // Read the saved file blob and create URL
                 const shortBlob = await readFile(`${testAudioDir}/${shortFileName}.wav`);
                 this.blobUrlShort = URL.createObjectURL(shortBlob); // Store for revocation
                 this.testShortAudioSrc = this.blobUrlShort; // Assign to src
                 this.showMessageBubble('success', `短文本语音生成成功`);
                 console.log(`Short audio generated and loaded: ${this.blobUrlShort}`);

             } catch (shortAudioError) {
                console.error("Generating short audio failed:", shortAudioError);
                this.testError = `生成短文本语音失败: ${shortAudioError.message}`;
                this.showMessageBubble('error', `生成短文本语音失败`);
                this.isTesting = false;
                this.revokeTestAudioUrls(); // Clean up any URLs created so far
                return; // Stop if short audio fails
             }

            // --- Handle Main URL for Test (Long Text) ---
            const textLong = "斗之力，三段！望着测验魔石碑上面闪亮得甚至有些刺眼的五个大字，少年面无表情，唇角有着一抹自嘲，紧握的手掌，因为大力，而导致略微尖锐的指甲深深的刺进了掌心之中，带来一阵阵钻心的疼痛…";
             // Generate a unique filename for test previews
            const longFileName = `test_long_${this.selectedConfigName}_${Date.now()}`;
             // Create a variables map *including* the specific text for the long audio test
            const longTextVariablesMap = { ...testVariablesMap, text: textLong }; // Note: This map isn't directly passed to pCAR, but represents the variables available.

            this.showMessageBubble('info', `正在生成长文本语音...`);
            try {
                 // processConversationAudioRequest requires a mock conversation object and output directory
                 const conversationMockLong = { id: longFileName, character: 'TestChar', emotion: testEmotion, text: textLong }; // Mock object for structure/emotion
                 const testAudioDir = `/data/test/tts_test_preview/${this.selectedConfigName}`; // Same distinct temp directory

                 // Directory should already exist from the short audio step, but ensure anyway
                 await createFolder(testAudioDir).catch(err => {
                      if (!err.message.includes('文件夹已存在') && !err.message.includes('Key already exists')) {
                         console.warn(`创建测试预览目录时出错 (可能已存在): ${err.message}`);
                     }
                 });

                 // Call processConversationAudioRequest
                 const resultLong = await processConversationAudioRequest(
                     nameId, // Use index 1 for data lookup
                     textLong, // Pass the actual text to synthesize
                     conversationMockLong, // Pass the mock conversation object
                     lang, // Pass language
                     //longFileName, // Filename without extension
                     this.currentConfigDefinition, // Pass unquoted definition
                     this.configData, // Pass user data
                     testAudioDir, // Pass directory path
                      (msg) => console.log(`Test (Long): ${msg}`) // Simple status logging
                 );

                 if (resultLong["status"] !== "ok") {
                     throw new Error(`processConversationAudioRequest for long text returned status "${resultLong}"`);
                 }

                // Read the saved file blob and create URL
                const longBlob = await readFile(`${testAudioDir}/${longFileName}.wav`);
                this.blobUrlLong = URL.createObjectURL(longBlob); // Store for revocation
                this.testLongAudioSrc = this.blobUrlLong; // Assign to src
                 this.showMessageBubble('success', `长文本语音生成成功`);
                 console.log(`Long audio generated and loaded: ${this.blobUrlLong}`);

            } catch (longAudioError) {
                console.error("Generating long audio failed:", longAudioError);
                // Set testError if it wasn't already set by a previous step
                this.testError = this.testError || `生成长文本语音失败: ${longAudioError.message}`;
                 this.showMessageBubble('error', `生成长文本语音失败`);
                 // Don't return, still want to potentially show short audio if it succeeded
            }

            // 5. Final Status Update
            if (!this.testError) {
                 this.showMessageBubble('success', '测试完成，音频已加载。');
            } else {
                 // testError already contains a message from one of the steps
                 this.showMessageBubble('error', '测试完成，但有步骤失败。');
            }


        } catch (error) {
            // Catch any unexpected errors during setup or processing not caught in specific steps
            console.error("An unexpected error occurred during test:", error);
            // Set testError if it wasn't already set
            this.testError = this.testError || `发生意外错误: ${error.message}`;
            this.showMessageBubble('error', `测试中止: ${error.message}`);

        } finally {
            this.isTesting = false;
            // Clean up test preview files if needed? Or let IndexedDB manage?
            // For now, leave them. Could add cleanup logic here if they accumulate.
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
        }, 3500); // Show for 3.5 seconds
    }
  }
};
</script>



<style scoped>
/* Reuse existing styles and add new ones */
:root {
  /* Re-declare variables if not globally available, or import from a global CSS file */
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --primary-light: #e0e7ff;
  --success-color: #10b981;
  --success-hover: #059669;
  --error-color: #ef4444;
  --error-hover: #dc2626; /* Darker red */
  --warning-color: #f59e0b;
  --info-color: #3b82f6;
  --background-color: #f9fafb; /* Light gray background */
  --card-bg: #ffffff;
  --text-color: #1f2937; /* Darker text */
  --text-secondary: #6b7280; /* Medium gray text */
  --border-color: #e5e7eb; /* Lighter border */
  --separator-color: #f3f4f6; /* Very light separator */
  --input-bg: #ffffff;
  --input-border: #d1d5db; /* Gray border */
  --input-text: #111827; /* Very dark input text */
  --input-focus: #6366f1; /* Indigo focus ring */
  --header-bg: #f3f4f6; /* Slightly darker header */
  --even-row-bg: #f9fafb; /* Match background */
  --odd-row-bg: #ffffff; /* White rows */
  --shadow-light: rgba(0, 0, 0, 0.04);
  --shadow-medium: rgba(0, 0, 0, 0.08);
  --transition-speed: 0.25s;
  --border-radius: 6px; /* Slightly smaller radius */
  --active-bg: #e0e7ff; /* Light indigo for active */

  /* Emotion colors */
   --emotion-default-color: #64748b; /* Slate */
   --emotion-default-bg: #f1f5f9;
   --emotion-happy-color: #f59e0b; /* Amber */
   --emotion-happy-bg: #fef3c7;
   --emotion-sad-color: #3b82f6; /* Blue */
   --emotion-sad-bg: #dbeafe;
   --emotion-angry-color: #ef4444; /* Red */
   --emotion-angry-bg: #fee2e2;
}

/* Dark theme variables */
body.dark-theme {
  --primary-color: #6366f1;
  --primary-hover: #818cf8;
  --primary-light: #312e81; /* Darker indigo */
  --success-color: #34d399; /* Lighter green */
  --success-hover: #6ee7b7;
  --error-color: #f87171; /* Lighter red */
  --error-hover: #fb9292;
  --warning-color: #fbbf24; /* Lighter amber */
  --info-color: #60a5fa; /* Lighter blue */
  --background-color: #111827; /* Very dark blue-gray */
  --card-bg: #1f2937; /* Dark blue-gray */
  --text-color: #e5e7eb; /* Light gray text */
  --text-secondary: #9ca3af; /* Medium gray text */
  --border-color: #374151; /* Darker border */
  --separator-color: #1f2937; /* Match card bg */
  --input-bg: #374151; /* Medium dark input */
  --input-border: #4b5563; /* Darker input border */
  --input-text: #f3f4f6; /* Very light input text */
  --input-focus: #818cf8; /* Lighter indigo focus */
  --header-bg: #1f2937; /* Match card bg */
  --even-row-bg: #1f2937; /* Match card bg */
  --odd-row-bg: #1a2331; /* Slightly darker than card bg */
  --active-bg: #3730a3; /* Darker indigo active */

  /* Dark theme emotion colors */
   --emotion-default-bg: #334155; /* Dark Slate */
   --emotion-default-color: #94a3b8;
   --emotion-happy-bg: #78350f; /* Dark Amber */
   --emotion-happy-color: #fcd34d;
   --emotion-sad-bg: #1e3a8a; /* Dark Blue */
   --emotion-sad-color: #93c5fd;
   --emotion-angry-bg: #7f1d1d; /* Dark Red */
   --emotion-angry-color: #fca5a5;
}


.voice-config {
  padding: 1.5rem 2rem; /* More horizontal padding */
  max-width: 1500px; /* Slightly wider */
  margin: 1.5rem auto;
  font-family: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  color: var(--text-color);
  position: relative;
  background-color: var(--background-color);
  transition: background-color var(--transition-speed);
  border-radius: var(--border-radius);
}

/* Config Management Bar */
.config-management-bar {
  display: flex;
  align-items: center;
  gap: 1rem; /* Increased gap */
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  background-color: var(--card-bg);
  padding: 1rem 1.5rem;
  border-radius: var(--border-radius);
  box-shadow: 0 2px 4px var(--shadow-light);
  border: 1px solid var(--border-color);
}

.config-management-bar label {
  font-weight: 500; /* Slightly less bold */
  white-space: nowrap;
  color: var(--text-secondary); /* Subtle color */
}

.config-management-bar select {
  padding: 0.5rem 2.5rem 0.5rem 0.8rem; /* Space for arrow */
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius);
  background-color: var(--input-bg);
  color: var(--input-text);
  min-width: 200px;
  flex-grow: 1;
  max-width: 350px;
  font-size: 0.9rem;
  box-shadow: none; /* Remove inner shadow */
  transition: border-color var(--transition-speed), box-shadow var(--transition-speed);
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /%3E%3C/svg%3E");
  background-position: right 0.6rem center;
  background-repeat: no-repeat;
  background-size: 1.25em 1.25em;
}

.config-management-bar select:focus {
  outline: none;
  border-color: var(--input-focus);
  box-shadow: 0 0 0 2px var(--primary-light); /* Focus ring */
}

/* Common button styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-weight: 500;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all var(--transition-speed);
  border: 1px solid transparent; /* Base border */
  outline: none;
  font-size: 0.875rem;
  line-height: 1.25rem;
  box-shadow: 0 1px 2px 0 var(--shadow-medium); /* Subtle shadow */
}
.btn:hover {
  transform: translateY(-1px); /* Slight lift */
  box-shadow: 0 2px 4px 0 var(--shadow-medium);
}
.btn:active { transform: translateY(0); box-shadow: 0 1px 2px 0 var(--shadow-medium); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

/* Specific Button Styles */
.btn-primary { background-color: var(--primary-color); color: white; }
.btn-primary:hover:not(:disabled) { background-color: var(--primary-hover); }
.btn-secondary { background-color: var(--text-secondary); color: white; border-color: var(--text-secondary); }
.btn-secondary:hover:not(:disabled) { background-color: #4b5563; border-color: #4b5563; }
.btn-success { background-color: var(--success-color); color: white; }
.btn-success:hover:not(:disabled) { background-color: var(--success-hover); }
.btn-add { background-color: var(--success-color); color: white; }
.btn-add:hover:not(:disabled) { background-color: var(--success-hover); }
.btn-modify { background-color: var(--primary-color); color: white; }
.btn-modify:hover:not(:disabled) { background-color: var(--primary-hover); }
.btn-delete { background-color: var(--error-color); color: white; }
.btn-delete:hover:not(:disabled) { background-color: var(--error-hover); }

/* Small button styles */
.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}
.btn-icon { margin-right: 0.4rem; font-size: 0.9em; vertical-align: middle; }
.btn-icon-xs { margin-right: 0.3rem; font-size: 0.8em; }

/* Separators */
.separator { height: 1px; background-color: var(--border-color); margin: 1.5rem 0; width: 100%; }
.separator.thick-separator { height: 2px; background: var(--border-color); margin: 1.5rem 0 2rem 0; border-radius: 1px; }

/* Header Section */
.header-section { margin-bottom: 1.5rem; }
.title { font-size: 1.5rem; font-weight: 600; color: var(--text-color); margin-bottom: 1.5rem; letter-spacing: -0.01em; }

/* Proxy Config & Concurrency Config */
.proxy-config,
.concurrency-config {
    display: flex;
    align-items: center;
    margin: 1rem 0; /* Adjusted margin */
    padding: 0.75rem;
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}
/* Add margin between proxy and concurrency if both are visible */
.proxy-config + .concurrency-config,
.concurrency-config + .proxy-config {
    margin-top: 0.5rem; /* Reduce space if both are present */
}


.proxy-label,
.concurrency-label {
  font-weight: 500;
  margin-right: 0.75rem;
  color: var(--text-color);
  white-space: nowrap; /* Prevent wrapping */
}

.concurrency-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--input-border);
    border-radius: var(--border-radius);
    background-color: var(--input-bg);
    color: var(--input-text);
    width: 80px; /* Fixed width for number input */
    text-align: center;
     transition: border-color var(--transition-speed), box-shadow var(--transition-speed);
}
.concurrency-input:focus {
    outline: none;
    border-color: var(--input-focus);
    box-shadow: 0 0 0 2px var(--primary-light);
}


/* Toggle Switch */
.toggle-switch { position: relative; display: inline-block; width: 40px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-label-switch { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .3s; border-radius: 20px; }
.toggle-label-switch:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
input:checked + .toggle-label-switch { background-color: var(--primary-color); }
input:focus + .toggle-label-switch { box-shadow: 0 0 0 2px var(--primary-light); }
input:checked + .toggle-label-switch:before { transform: translateX(20px); }

/* GPT Prompts Section */
.gpt-prompts { margin: 1.5rem 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.prompt-item { background-color: var(--card-bg); padding: 1rem 1.25rem; border-radius: var(--border-radius); border: 1px solid var(--border-color); transition: all var(--transition-speed); }
.prompt-item:hover { box-shadow: 0 3px 6px var(--shadow-light); border-color: var(--primary-light); }
.prompt-item label { display: block; font-weight: 500; margin-bottom: 0.6rem; color: var(--text-color); font-size: 0.9rem; }
.prompt-item textarea { width: 100%; min-height: 70px; padding: 0.6rem 0.8rem; border: 1px solid var(--input-border); border-radius: var(--border-radius); background-color: var(--input-bg); color: var(--input-text); font-size: 0.875rem; transition: all var(--transition-speed); resize: vertical; }
.prompt-item textarea:focus { outline: none; border-color: var(--input-focus); box-shadow: 0 0 0 2px var(--primary-light); }

/* Emotion Switcher */
.emotion-switcher { margin: 1.75rem 0; background-color: var(--card-bg); border: 1px solid var(--border-color); padding: 1rem 1.5rem; border-radius: var(--border-radius); }
.emotion-title { font-weight: 500; margin-bottom: 0.8rem; color: var(--text-color); font-size: 0.95rem; }
.emotion-options { display: flex; flex-wrap: wrap; gap: 0.6rem; }
.emotion-btn { padding: 0.4rem 0.9rem; border-radius: var(--border-radius); background-color: var(--input-bg); color: var(--text-secondary); border: 1px solid var(--border-color); cursor: pointer; transition: all var(--transition-speed); font-weight: 400; font-size: 0.85rem; box-shadow: none; }
.emotion-btn:hover { background-color: var(--separator-color); border-color: var(--input-border); color: var(--text-color); }
.emotion-btn.active { color: var(--primary-color); border-color: var(--primary-color); background-color: var(--primary-light); font-weight: 500; }
.emotion-btn[data-emotion="happy"].active { color: var(--emotion-happy-color); border-color: var(--emotion-happy-color); background-color: var(--emotion-happy-bg); }
.emotion-btn[data-emotion="sad"].active { color: var(--emotion-sad-color); border-color: var(--emotion-sad-color); background-color: var(--emotion-sad-bg); }
.emotion-btn[data-emotion="angry"].active { color: var(--emotion-angry-color); border-color: var(--emotion-angry-color); background-color: var(--emotion-angry-bg); }
.emotion-label { display: inline-block; position: relative; }

/* Current Emotion Indicator */
.current-emotion-indicator { display: inline-flex; align-items: center; padding: 0.5rem 1rem; border-radius: var(--border-radius); margin-bottom: 1.25rem; font-weight: 500; font-size: 0.875rem; }
.current-emotion-indicator.emotion-default { background-color: var(--emotion-default-bg); color: var(--emotion-default-color); }
.current-emotion-indicator.emotion-happy { background-color: var(--emotion-happy-bg); color: var(--emotion-happy-color); }
.current-emotion-indicator.emotion-sad { background-color: var(--emotion-sad-bg); color: var(--emotion-sad-color); }
.current-emotion-indicator.emotion-angry { background-color: var(--emotion-angry-bg); color: var(--emotion-angry-color); }
.emotion-indicator-text { font-weight: 500; }

/* Content Section - Table Styling */
.content-section { background-color: var(--card-bg); border-radius: var(--border-radius); border: 1px solid var(--border-color); margin-bottom: 2rem; overflow: hidden; /* Keep overflow hidden for border-radius clipping */ }
.table-header { display: flex; background-color: var(--header-bg); padding: 0.75rem 1rem; font-weight: 500; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); align-items: center; font-size: 0.85rem; }
.col-index { width: 50px; flex-shrink: 0; text-align: center; font-weight: 500; color: var(--text-color); }
.col-dynamic { padding: 0.5rem 0.75rem; flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; /* Align label and button */ }
.table-header .col-dynamic span { font-weight: 500; color: var(--text-secondary); }

/* REMOVED .entries-container-no-scroll styling for max-height and overflow */

.entry-row { display: flex; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); transition: background-color var(--transition-speed); align-items: center; }
.entry-row:hover { background-color: var(--separator-color); }
.entry-row:last-child { border-bottom: none; }
.even-row { background-color: var(--even-row-bg); }
.entry-row .col-dynamic { align-items: stretch; /* Let inputs fill height */ padding: 0.5rem 0.75rem; } /* Adjust padding for rows */

.entry-row textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid var(--input-border); border-radius: var(--border-radius); background-color: var(--input-bg); color: var(--input-text); font-size: 0.875rem; transition: all var(--transition-speed); resize: vertical; min-height: 40px; line-height: 1.4; }
.entry-row textarea:focus { outline: none; border-color: var(--input-focus); box-shadow: 0 0 0 2px var(--primary-light); }

/* File Select Input Styling */
.fileselect-wrapper { display: flex; width: 100%; align-items: center; }
.fileselect-display { flex-grow: 1; padding: 0.6rem 0.8rem; border: 1px solid var(--input-border); border-right: none; border-radius: var(--border-radius) 0 0 var(--border-radius); background-color: var(--input-bg); color: var(--text-secondary); font-size: 0.875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4; height: calc(1.4em + 1.2rem + 2px); /* Match textarea height */ }
.btn-file { padding: 0.6rem 1rem; border-radius: 0 var(--border-radius) var(--border-radius) 0; background-color: var(--text-secondary); color: white; cursor: pointer; white-space: nowrap; display: flex; align-items: center; justify-content: center; font-weight: 500; transition: all var(--transition-speed); border: 1px solid var(--text-secondary); font-size: 0.8rem; height: calc(1.4em + 1.2rem + 2px); box-shadow: none; }
.btn-file:hover { background-color: #4b5563; border-color: #4b5563; }

/* Tiny Action Buttons */
.btn-xs { padding: 0.3rem 0.6rem; font-size: 0.75rem; min-width: unset; margin-left: 0.5rem; line-height: 1.2; border-radius: calc(var(--border-radius) - 2px); box-shadow: none; vertical-align: middle; }
.btn-fill { background-color: var(--primary-color); color: white; border: 1px solid var(--primary-color); }
.btn-fill:hover { background-color: var(--primary-hover); border-color: var(--primary-hover); transform: none; }

/* Save Panel */
.save-panel { margin-top: 2rem; display: flex; justify-content: flex-end; padding-top: 1.5rem; border-top: 1px solid var(--border-color); }
.btn-save { min-width: 200px; padding: 0.75rem 1.5rem; font-size: 0.95rem; font-weight: 500; }
.btn-save .btn-icon { margin-right: 0.6rem; font-size: 1.1em; }

/* No Config Selected Placeholder */
.no-config-selected { text-align: center; padding: 4rem 2rem; color: var(--text-secondary); background-color: var(--card-bg); border: 1px dashed var(--border-color); border-radius: var(--border-radius); margin: 2rem 0; font-size: 1rem; }

/* Modal Styling */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); backdrop-filter: blur(2px); display: flex; justify-content: center; align-items: center; z-index: 1000; animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal-content { background-color: var(--background-color); padding: 2rem; border-radius: var(--border-radius); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15); width: 90%; max-width: 800px; max-height: 85vh; display: flex; flex-direction: column; animation: slideIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.1); overflow: hidden; }
@keyframes slideIn { from { transform: translateY(20px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
.modal-content h2 { margin-top: 0; margin-bottom: 0.75rem; color: var(--text-color); font-weight: 600; font-size: 1.25rem; }
.modal-hint { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.5; }
.json-editor-area { width: 100%; flex-grow: 1; min-height: 300px; border: 1px solid var(--input-border); border-radius: var(--border-radius); font-family: 'Fira Code', 'Consolas', monospace; font-size: 0.85rem; padding: 1rem; background-color: var(--input-bg); color: var(--input-text); resize: vertical; margin-bottom: 1.25rem; line-height: 1.6; }
.json-editor-area:focus { outline: none; border-color: var(--input-focus); box-shadow: 0 0 0 2px var(--primary-light); }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
.error-message { color: var(--error-color); background-color: rgba(239, 68, 68, 0.05); border: 1px solid var(--error-color); border-left-width: 3px; padding: 0.75rem 1rem; border-radius: var(--border-radius); margin-top: 1rem; font-size: 0.85rem; }

/* Message Bubble */
.message-bubble { position: fixed; bottom: -100px; left: 50%; transform: translateX(-50%); padding: 0.8rem 1.5rem; border-radius: var(--border-radius); color: white; font-weight: 500; z-index: 1100; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1); opacity: 0; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); max-width: 80%; text-align: center; font-size: 0.9rem; }
.message-bubble.active { bottom: 1.5rem; opacity: 1; }
.message-bubble.success { background-color: var(--success-color); }
.message-bubble.error { background-color: var(--error-color); }
.message-bubble.warning { background-color: var(--warning-color); color: var(--text-color); }
.message-bubble.info { background-color: var(--info-color); }

/* Responsive Adjustments */
@media (max-width: 768px) {
  .voice-config { padding: 1rem; }
  .config-management-bar { flex-direction: column; align-items: stretch; padding: 1rem; }
  .config-management-bar select { max-width: none; }
   .proxy-config, .concurrency-config { flex-direction: column; align-items: stretch; }
   .proxy-config label, .concurrency-config label { margin-right: 0; margin-bottom: 0.5rem; }
   .concurrency-input { width: 100%; text-align: left;}

  .gpt-prompts { grid-template-columns: 1fr; }
  .table-header, .entry-row { flex-wrap: wrap; padding: 0.5rem; }
  .col-index { width: 100%; text-align: left; margin-bottom: 0.5rem; padding: 0.5rem 0; font-size: 1rem; font-weight: 600; color: var(--text-color); border-bottom: 1px solid var(--border-color); }
  .entry-row .col-index { border-bottom: none; margin-bottom: 0.75rem; font-size: 0.9rem;}
  .col-dynamic { width: 100%; flex: none; margin-bottom: 0.75rem; padding: 0; justify-content: flex-start;} /* Reset padding */
  .table-header .col-dynamic { padding: 0.5rem 0; } /* Add padding back to header cols */
  .entry-row .col-dynamic { flex-direction: column; align-items: stretch; } /* Stack file input */
  .fileselect-wrapper { flex-direction: column; align-items: stretch; }
  .fileselect-display { border-radius: var(--border-radius) var(--border-radius) 0 0; border-right: 1px solid var(--input-border); margin-bottom: -1px; }
  .btn-file { border-radius: 0 0 var(--border-radius) var(--border-radius); width: 100%; }
  .save-panel { justify-content: center; }
  .modal-content { width: 95%; padding: 1.5rem; max-height: 90vh; }

  .test-controls { flex-direction: column; align-items: stretch; }
  .audio-preview { flex-direction: column; align-items: stretch; gap: 0.5rem; }
  .audio-preview label { min-width: unset; }
}

/* ***** NEW: Test Panel Styles ***** */
.test-panel {
  margin-top: 2.5rem;
  padding: 1.5rem;
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 8px var(--shadow-light);
}

.test-panel .panel-title { /* Reuse panel title style or define specific */
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--separator-color);
}

.test-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.btn-test {
  min-width: 140px; /* Ensure button text fits */
  background-color: var(--info-color);
  color: white; /* White text on info color */
  border-color: var(--info-color);
}
body.dark-theme .btn-test {
     color: var(--text-color); /* Dark theme text on info color */
}

.btn-test:hover:not(:disabled) {
  background-color: #2563eb; /* Darker info blue */
  border-color: #2563eb;
}
body.dark-theme .btn-test:hover:not(:disabled) {
    background-color: #93c5fd; /* Lighter blue hover for dark */
    border-color: #93c5fd;
}


.test-status-text {
    color: var(--text-secondary);
    font-style: italic;
    font-size: 0.9rem;
}

.test-results {
    margin-top: 1rem;
    border-top: 1px solid var(--separator-color);
    padding-top: 1.5rem;
}

.test-error-msg {
    margin-bottom: 1rem;
    /* Use existing error-message styles or customize */
}

.audio-preview {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap; /* Wrap on small screens */
}

.audio-preview label {
  font-weight: 500;
  min-width: 120px; /* Align labels */
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.audio-preview audio {
  height: 40px; /* Control audio player height */
  max-width: 100%; /* Ensure player is responsive */
  flex-grow: 1;
}

/* Spinner animation */
.spinner {
  display: inline-block;
  width: 1em; /* Size relative to font size */
  height: 1em;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  margin-right: 0.5rem;
  vertical-align: middle; /* Align with text */
}
body.dark-theme .spinner {
    border: 2px solid rgba(255, 255, 255, 0.3); /* Spinner color for dark theme */
    border-top-color: #fff;
}


@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ***** End Test Panel Styles ***** */

/* Adjust other styles if needed */

/* Ensure message bubble has warning/info styles if not present */
.message-bubble.warning {
  background-color: var(--warning-color);
  color: #1f2937; /* Darker text on yellow */
}
.message-bubble.info {
  background-color: var(--info-color);
}
body.dark-theme .message-bubble.warning {
   background-color: var(--warning-color);
   color: var(--text-color); /* Lighter text on dark yellow */
}
body.dark-theme .message-bubble.info {
   background-color: var(--info-color);
}
</style>