<template>
<div>
  <div class="voice-config themed-component card">
    <!-- Top Bar: Config Selection & Management -->
    <div class="config-management-bar">
      <label for="config-select" class="config-label">选择配置:</label>
      <select id="config-select" v-model="selectedConfigName" @change="switchConfig" class="select config-select">
        <option v-if="!configNames.length" value="" disabled>-- 无可用配置 --</option>
        <option v-for="name in configNames" :key="name" :value="name">{{ name }}</option>
      </select>
      <div class="button-group">
        <button class="btn btn-primary btn-sm" @click="addConfig">
          <font-awesome-icon :icon="['fas', 'plus']" /> 添加
        </button>
        <button class="btn btn-secondary btn-sm" @click="openModifyModal" :disabled="!selectedConfigName">
          <font-awesome-icon :icon="['fas', 'pen-to-square']" /> 修改定义
        </button>
        <button class="btn btn-danger btn-sm" @click="deleteConfig" :disabled="!selectedConfigName">
          <font-awesome-icon :icon="['fas', 'trash-alt']" /> 删除
        </button>
      </div>
    </div>

    <!-- Separator -->
    <hr class="separator">

    <!-- Configurable Area (Only shown if a config is selected) -->
    <div v-if="selectedConfigName && currentConfigDefinition">
      <!-- Header Section -->
      <div class="header-section">
        <h2 class="config-title">{{ selectedConfigName }} - 语音合成配置</h2>

        <!-- Settings Row (Proxy, Concurrency, GPT) -->
        <div class="settings-row">
           <!-- Proxy & Concurrency Group -->
          <div class="setting-group proxy-concurrency-group">
             <!-- Proxy Switch -->
             <div class="form-group proxy-config" v-if="currentConfigDefinition.localproxy === true">
     <!-- Original Text Label (clicking this still works) -->
     <label for="proxy-switch" class="form-label tooltip-container">使用本地代理:
        <span class="tooltip-text">是否通过配置的本地代理URL发送API请求。</span>
     </label>
     <!-- Switch Mechanism -->
     <div class="switch">
       <!-- The actual checkbox, visually hidden -->
       <input type="checkbox" id="proxy-switch" v-model="configData.useLocalProxy" />
       <!-- The visual slider, NOW a label linked to the checkbox -->
       <label for="proxy-switch" class="switch-slider"></label>
       <!-- Note: The ::before pseudo-element for the handle is styled in global CSS on .switch-slider -->
     </div>
 </div>

             <!-- Concurrency Input -->
            <div class="form-group concurrency-config" v-if="currentConfigDefinition.allow_concurrency === true">
              <label for="concurrency" class="form-label tooltip-container">并发数:
                 <span class="tooltip-text">允许同时进行的API请求数量 (需API支持)。</span>
              </label>
              <input type="number" id="concurrency" v-model.number="configData.concurrency" min="1"
                class="input concurrency-input">
            </div>
          </div>

          <!-- GPT Prompts Group -->
          <div class="setting-group gpt-prompts-group" v-if="currentConfigDefinition.gptprompt && currentConfigDefinition.gptprompt.length > 0">
             <h3 class="group-title">GPT 提示</h3>
             <div v-for="(prompt, index) in currentConfigDefinition.gptprompt" :key="index"
              class="prompt-item form-group">
               <label :for="`prompt-${Object.keys(prompt)[0]}`" class="form-label">{{ Object.keys(prompt)[0] }}:</label>
               <textarea :id="`prompt-${Object.keys(prompt)[0]}`" v-model="configData[Object.keys(prompt)[0]]"
                :placeholder="`输入 ${Object.keys(prompt)[0]} 内容`" rows="2" class="input textarea-input"></textarea>
            </div>
          </div>
        </div>


        <!-- Emotion Selector -->
        <div class="emotion-switcher form-group" v-if="emotionsToConfigure.length > 1">
          <label class="form-label">语气选择 (编辑):</label>
          <div class="emotion-options">
            <button v-for="emotion in emotionsToConfigure" :key="emotion" @click="switchEmotion(emotion)"
              class="btn btn-outline btn-sm emotion-btn" :class="{ 'active-emotion': currentEmotion === emotion }">
              {{ emotion || '默认' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Area - Table Like Structure -->
      <div class="content-section card">
        <!-- Current Emotion Indicator -->
        <div class="current-emotion-indicator" v-if="emotionsToConfigure.length > 1" :data-emotion="currentEmotion || 'default'">
          <span class="indicator-dot"></span>
          <span>当前编辑语气: <strong class="emotion-name">{{ currentEmotion || '默认' }}</strong></span>
        </div>

        <!-- Header Row -->
        <div class="table-header">
          <div class="col-index">#</div>
          <div v-for="item in requiredItems" :key="item.key" class="col-dynamic"
            :style="{ flex: getColumnFlex(item.key) }">
            <span class="header-label">{{ item.label }}</span>
            <button v-if="item.filling" @click="applyFilling(item.key)" class="btn btn-text btn-xs btn-fill"
              title="将序号1的内容应用到当前语气的所有后续行">
              <font-awesome-icon :icon="['fas', 'angles-down']" /> 填充
            </button>
          </div>
        </div>

        <!-- Entries -->
        <div class="entries-container">
          <div v-for="index in numberOfEntries" :key="index" class="entry-row" :class="{ 'even-row': index % 2 === 0 }">
            <div class="col-index">{{ index }}</div>
            <div v-for="item in requiredItems" :key="item.key" class="col-dynamic"
              :style="{ flex: getColumnFlex(item.key) }">
              <!-- File Select Input -->
              <div v-if="item.type === 'fileselect'" class="fileselect-wrapper">
                <input type="text" :value="getInputValue(index, currentEmotion, item.key)" readonly
                  :placeholder="`选择 ${item.label} 文件...`" class="input fileselect-display" />
                <input type="file" :id="`fileInput_${index}_${currentEmotion}_${item.key}`"
                  @change="handleFileSelect($event, index, currentEmotion, item.key)" style="display: none;" />
                <label :for="`fileInput_${index}_${currentEmotion}_${item.key}`"
                  class="btn btn-outline btn-xs btn-file-browse">
                   <font-awesome-icon :icon="['fas', 'folder-open']" />
                </label>
              </div>
              <!-- Default Text Input (as textarea) -->
              <textarea v-else :value="getInputValue(index, currentEmotion, item.key)"
                @input="setInputValue($event.target.value, index, currentEmotion, item.key)"
                :placeholder="`输入 ${item.label}`" rows="1" class="input textarea-input entry-textarea"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Test Panel -->
      <div class="test-panel card">
        <h3 class="panel-title">
            <font-awesome-icon :icon="['fas', 'flask']" /> 测试当前配置
            <span v-if="numberOfEntries > 0">(序号 {{ selectedTestIndex }})</span>
        </h3>
        <div v-if="numberOfEntries > 0" class="test-controls">
          <!-- Test Index Selector -->
          <div class="test-control-item">
            <label for="test-index-select" class="form-label">测试序号:</label>
            <select id="test-index-select" v-model.number="selectedTestIndex" class="select test-select">
              <option v-for="i in numberOfEntries" :key="`test-idx-${i}`" :value="i">
                {{ i }}
              </option>
            </select>
          </div>

          <!-- Conditional GPT Return Input -->
          <div class="test-control-item" v-if="usesGptReturnVariable">
            <label for="test-gptreturn-input" class="form-label">语气 (gptreturn):</label>
            <input type="text" id="test-gptreturn-input" v-model="testGptReturnValue" placeholder="输入测试语气 (可为空)"
              class="input test-gptreturn-input" />
          </div>

          <!-- Test Button -->
          <div class="test-control-item test-button-container">
             <button class="btn btn-info btn-test" @click="testCurrentConfig"
              :disabled="isTesting || !selectedConfigName || numberOfEntries < 1">
              <font-awesome-icon v-if="isTesting" :icon="['fas', 'spinner']" spin />
              <span v-else>运行测试</span>
            </button>
          </div>
           <p v-if="isTesting" class="test-status-text">
              <font-awesome-icon :icon="['fas', 'spinner']" spin /> 正在生成测试语音...
           </p>
        </div>
         <div v-else class="test-controls">
             <p class="text-muted">请先在配置定义中设置条目数量 (number > 0) 并保存数据。</p>
         </div>

        <div class="test-results" v-if="!isTesting && (testShortAudioSrc || testLongAudioSrc || testError)">
           <hr class="separator thin-separator">
          <div v-if="testError" class="error-message test-error-msg">
             <font-awesome-icon :icon="['fas', 'exclamation-circle']" />
            <strong>测试失败:</strong> {{ testError }}
          </div>
          <div v-if="testShortAudioSrc" class="audio-preview">
            <label>短文本 ("测试"):</label>
            <audio controls :src="testShortAudioSrc" ref="audioShort" preload="metadata"></audio>
          </div>
          <div v-if="testLongAudioSrc" class="audio-preview">
            <label>长文本:</label>
            <audio controls :src="testLongAudioSrc" ref="audioLong" preload="metadata"></audio>
          </div>
        </div>
      </div>
      <!-- End Test Panel -->

      <!-- Save Button -->
      <div class="save-panel">
        <button class="btn btn-primary btn-lg btn-save" @click="saveConfigData">
          <font-awesome-icon :icon="['fas', 'floppy-disk']" /> 保存 {{ selectedConfigName }} 配置数据
        </button>
      </div>

    </div> <!-- End v-if="selectedConfigName" -->

    <!-- Placeholder when no config is selected -->
    <div v-else class="no-config-selected">
      <font-awesome-icon :icon="['fas', 'info-circle']" class="placeholder-icon" />
      <p>请在上方选择一个配置进行编辑，或点击“添加”创建一个新配置。</p>
    </div>

    <!-- Modify Config JSON Modal -->
    <div class="modal" v-if="isEditingConfigJson" @click.self="closeModifyModal">
        <div class="modal-content card">
            <div class="modal-header">
                <h3 class="modal-title">修改配置定义: {{ selectedConfigName }}</h3>
                <button class="close-btn btn btn-text btn-sm" @click="closeModifyModal" title="关闭">
                  <font-awesome-icon :icon="['fas', 'times']" />
                </button>
            </div>
            <div class="modal-body">
                <p class="modal-hint">在此编辑配置的JSON定义。这会影响页面布局和API请求参数。</p>
                <textarea v-model="currentJsonEdit" class="input textarea-input json-editor-area"></textarea>
                <div v-if="jsonEditError" class="error-message json-error-msg">
                   <font-awesome-icon :icon="['fas', 'exclamation-triangle']" /> {{ jsonEditError }}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" @click="closeModifyModal">取消</button>
                <button class="btn btn-primary" @click="saveModifiedConfig">
                    <font-awesome-icon :icon="['fas', 'save']" /> 保存定义
                </button>
            </div>
        </div>
    </div>


    <!-- Message Bubble for notifications -->
    <!-- Keep local message bubble or switch fully to global toastification -->
    <div class="message-bubble"
      :class="{ active: showMessage, success: messageType === 'success', error: messageType === 'error', warning: messageType === 'warning', info: messageType === 'info' }">
      <font-awesome-icon :icon="['fas', messageType === 'success' ? 'check-circle' : messageType === 'error' ? 'times-circle' : messageType === 'warning' ? 'exclamation-triangle' : 'info-circle']" class="bubble-icon" />
      <span>{{ messageContent }}</span>
    </div>
  </div>
</div>
</template>

<script>
// --- SCRIPT REMAINS THE SAME AS PROVIDED ---
// Ensure FontAwesome icons used here are registered globally or locally
// Icons identified: plus, pen-to-square, trash-alt, angles-down, folder-open, flask, spinner, floppy-disk, info-circle, times, save, exclamation-circle, exclamation-triangle, check-circle
import { writeFile, readFile, createFolder } from './services/IndexedDBFileSystem.js';
import { generateVoice, makeApiRequest, substituteVariables, unquoteVariablesDeep, processConversationAudioRequest } from './services/voiceGenerator.js';

const LS_KEY = 'aiGalgameConfig';
const SOVITS_KEY = 'SOVITS';
const CONFIG_DEFINITIONS_KEY = 'config';
const SELECTED_MODEL_KEY = 'model_choose';

export default {
  name: 'VoiceConfigMulti',
  // components: { FontAwesomeIcon }, // If needed
  data() {
    return {
      configurations: {},
      configNames: [],
      selectedConfigName: null,
      currentConfigDefinition: null,
      configData: {},
      filesToSave: {},
      currentEmotion: '',
      isEditingConfigJson: false,
      currentJsonEdit: '',
      jsonEditError: '',
      showMessage: false,
      messageType: 'success',
      messageContent: '',
      messageTimeout: null,
      isTesting: false,
      testShortAudioSrc: null,
      testLongAudioSrc: null,
      testError: null,
      blobUrlShort: null,
      blobUrlLong: null,
      selectedTestIndex: 1,
      testGptReturnValue: '',
    };
  },
  computed: {
    numberOfEntries() {
      const num = this.currentConfigDefinition?.number;
      return (typeof num === 'number' && num > 0) ? num : 0;
    },
    emotionsToConfigure() {
      const emotions = this.currentConfigDefinition?.emotion_list;
      // Ensure '' is included if list is empty or not defined
      return emotions && Array.isArray(emotions) && emotions.length > 0 ? emotions : [''];
    },
    requiredItems() {
      // Return empty array if definition is missing or required_item is not an array
      if (!this.currentConfigDefinition || !Array.isArray(this.currentConfigDefinition.required_item)) {
        return [];
      }
      return this.currentConfigDefinition.required_item.map(item => {
         // Basic validation: ensure item is an object with at least one key
         if (typeof item !== 'object' || item === null || Object.keys(item).length === 0) {
            console.warn("Invalid item found in required_item definition:", item);
            return { key: 'invalid_item', label: '无效项', filling: false, type: 'text' }; // Placeholder for invalid items
         }
        const key = Object.keys(item)[0];
        const label = item[key] || key; // Use key as fallback label
        const filling = item.filling === true;
        // Check for 'fileselect' key or property
        const type = (key === 'fileselect' || item.fileselect === true) ? 'fileselect' : 'text';
        return { key, label, filling, type };
      });
    },
    allowedVariables() {
      // Compute allowed variables based on requiredItems keys + standard vars
      const itemKeys = this.requiredItems.map(item => item.key).filter(key => key !== 'invalid_item');
       // Include keys from gptprompt definition
      const promptKeys = (this.currentConfigDefinition?.gptprompt || []).map(p => Object.keys(p)[0]);
      return new Set([...itemKeys, ...promptKeys, 'gptreturn', 'text', 'language']);
    },
    usesGptReturnVariable() {
      if (!this.currentConfigDefinition) return false;
      try {
        const definitionString = JSON.stringify(this.currentConfigDefinition);
        return /{{\s*gptreturn\s*}}/.test(definitionString);
      } catch (e) {
        console.error("Error checking for gptreturn variable:", e);
        return false;
      }
    },
  },
  watch: {
    numberOfEntries(newVal, oldVal) {
       // Only reset if the number actually changes or becomes 0/1
        if (newVal !== oldVal) {
            if (this.selectedTestIndex > newVal || this.selectedTestIndex < 1 || newVal < 1) {
                this.selectedTestIndex = newVal >= 1 ? 1 : 0;
            }
            if (newVal === 1) {
                 this.selectedTestIndex = 1;
            }
        }
    },
    selectedConfigName(newVal, oldVal) {
       if (newVal !== oldVal) {
           this.testGptReturnValue = '';
           this.selectedTestIndex = this.numberOfEntries >= 1 ? 1 : 0;
           this.revokeTestAudioUrls();
           this.testError = null;
           this.isTesting = false;
       }
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
    } else {
       // Ensure correct initial state if no config selected
       this.currentConfigDefinition = null;
       this.configData = {};
       this.selectedTestIndex = 0;
    }
  },
  beforeUnmount() {
    this.revokeTestAudioUrls();
    clearTimeout(this.messageTimeout);
  },
  methods: {
    // --- Config Management ---
    loadAllConfigs() {
      try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        this.configurations = saved?.[SOVITS_KEY]?.[CONFIG_DEFINITIONS_KEY] || {};
        // Filter out potentially null/invalid configurations before getting keys
        this.configNames = Object.keys(this.configurations).filter(name => this.configurations[name] !== null && typeof this.configurations[name] === 'object');
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
        if (!saved[SOVITS_KEY]) saved[SOVITS_KEY] = {};

        const configsToSave = {};
        for (const name in this.configurations) {
           if (this.configurations[name] !== null && typeof this.configurations[name] === 'object') {
               // Quote variables before saving
               configsToSave[name] = this.quoteVariables(this.configurations[name]);
           } else {
                console.warn(`Skipping saving invalid configuration: ${name}`);
           }
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
        if (!saved[SOVITS_KEY]) saved[SOVITS_KEY] = {};
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
      if (name && name.trim()) {
          const trimmedName = name.trim();
          if (this.configurations[trimmedName]) {
              this.showMessageBubble('error', `配置名称 "${trimmedName}" 已存在`);
              return;
          }
          // Default config structure
          const defaultConfig = {
            number: 7,
            required_item: [
                { "modelname": "模型名称" },
                { "speaker": "说话人/角色" },
                { "fileselect": "参考音频", fileselect: true }, // Explicitly mark as fileselect
                { "reference_text": "参考文本", filling: true },
                { "language": "语言", filling: true },
                { "speed": "语速", filling: true }
            ],
            url: "http://127.0.0.1:5000/tts",
            requestmethod: "POST",
            body: {
                "model": "{{modelname}}",
                "speaker": "{{speaker}}",
                "ref_audio_path": "{{fileselect}}",
                "prompt_text": "{{reference_text}}",
                "prompt_language": "{{language}}",
                "text": "{{text}}",
                "text_language": "{{language}}",
                "speed": "{{speed}}",
                "emotion_category": "{{gptreturn}}" // Example use of gptreturn
            },
            headers: { "Content-Type": "application/json" },
            before_requests: [],
            judge_repeat_before: "", // Default empty
            allow_concurrency: false, // Default false
            emotion_list: ["neutral", "happy", "sad", "angry"], // Example list
            emotion_feedback: "{{gptreturn}}", // Example use
            gptprompt: [{ "system_prompt": "You are a helpful assistant." }], // Example
            localproxy: false // Default false
          };
          // Store unquoted version, save will quote it
          this.configurations[trimmedName] = defaultConfig;
          this.configNames.push(trimmedName);
          this.configNames.sort(); // Keep the list sorted
          this.saveAllConfigs();
          this.selectedConfigName = trimmedName;
          this.switchConfig(); // Switch will unquote it
          this.showMessageBubble('success', `配置 "${trimmedName}" 已添加`);
      } else if (name !== null) { // Handle empty name entry but not cancel
          this.showMessageBubble('error', '配置名称不能为空');
      }
    },
    openModifyModal() {
      if (!this.selectedConfigName) return;
      try {
        // Ensure the definition exists before proceeding
        const currentDef = this.configurations[this.selectedConfigName];
        if (!currentDef) {
            this.showMessageBubble('error', `无法找到配置 "${this.selectedConfigName}" 的定义`);
            return;
        }
        // Deep clone and unquote for editing
        const configToEdit = unquoteVariablesDeep(JSON.parse(JSON.stringify(currentDef)));
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
        this.jsonEditError = `保存失败: ${error.message || '未知错误'}`;
        this.showMessageBubble('error', '保存配置定义失败');
      }
    },
    deleteConfig() {
      if (!this.selectedConfigName) return;
      if (confirm(`确定要永久删除配置 "${this.selectedConfigName}" 吗？\n其对应的设置数据也将被删除！此操作无法撤销。`)) {
        const nameToDelete = this.selectedConfigName;
        delete this.configurations[nameToDelete];
        this.configNames = this.configNames.filter(name => name !== nameToDelete);
        let saved = {};
        try {
          saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
          if (saved[SOVITS_KEY]) {
            // Delete config data
            if (saved[SOVITS_KEY][nameToDelete]) {
              delete saved[SOVITS_KEY][nameToDelete];
            }
            // Delete definition
            if (saved[SOVITS_KEY][CONFIG_DEFINITIONS_KEY]?.[nameToDelete]) {
              delete saved[SOVITS_KEY][CONFIG_DEFINITIONS_KEY][nameToDelete];
            }
            // Delete last selected if it matches
            if (saved[SOVITS_KEY][SELECTED_MODEL_KEY] === nameToDelete) {
              delete saved[SOVITS_KEY][SELECTED_MODEL_KEY];
            }
          }
        } catch (error) {
          console.error(`Error accessing localStorage during delete for config ${nameToDelete}:`, error);
           // Attempt to continue even if LS access fails partially
        }

        try {
           localStorage.setItem(LS_KEY, JSON.stringify(saved)); // Save cleaned LS data
        } catch (saveError) {
           console.error(`Error saving localStorage after delete for config ${nameToDelete}:`, saveError);
            this.showMessageBubble('error', `删除配置 "${nameToDelete}" 时保存本地存储失败`);
             // Still proceed with UI update
        }


        // Update UI state
        this.selectedConfigName = this.configNames.length > 0 ? this.configNames[0] : null;
        this.saveLastSelectedModel(this.selectedConfigName); // Save new selection (or null)
        if (this.selectedConfigName) {
          this.switchConfig();
        } else {
          this.currentConfigDefinition = null;
          this.configData = {};
          this.currentEmotion = ''; // Reset emotion
           this.selectedTestIndex = 0; // Reset test index
        }
        this.showMessageBubble('success', `配置 "${nameToDelete}" 已删除`);
      }
    },
    switchConfig() {
      if (!this.selectedConfigName || !this.configurations[this.selectedConfigName]) {
        this.currentConfigDefinition = null;
        this.configData = {};
        this.filesToSave = {};
        this.currentEmotion = '';
        this.saveLastSelectedModel(null);
        this.selectedTestIndex = 0; // Reset test index
        return;
      }
      this.saveLastSelectedModel(this.selectedConfigName);

      const storedDefinition = this.configurations[this.selectedConfigName];
      try {
        // Deep clone and unquote the definition for UI use
        this.currentConfigDefinition = unquoteVariablesDeep(JSON.parse(JSON.stringify(storedDefinition)));
      } catch (e) {
        console.error(`Error unquoting definition for ${this.selectedConfigName}:`, e, storedDefinition);
        this.showMessageBubble('error', `加载配置定义时出错: ${this.selectedConfigName}`);
        // Fallback: Use the potentially quoted version, may cause issues
        this.currentConfigDefinition = JSON.parse(JSON.stringify(storedDefinition));
      }

      // Set initial emotion based on the now loaded definition
      this.currentEmotion = this.emotionsToConfigure.length > 0 ? this.emotionsToConfigure[0] : '';
      this.loadConfigData(); // Load data associated with this config
      this.filesToSave = {}; // Clear pending file saves

      // Reset test index and related fields
      this.selectedTestIndex = this.numberOfEntries >= 1 ? 1 : 0;
      this.testGptReturnValue = '';
      this.revokeTestAudioUrls();
      this.testError = null;
      this.isTesting = false;
    },

    // --- Data Handling ---
    loadConfigData() {
        if (!this.selectedConfigName) {
             this.configData = {};
             return;
        }
      try {
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        // Start with an empty object or the saved data
        const loadedData = saved?.[SOVITS_KEY]?.[this.selectedConfigName] || {};
        const definition = this.currentConfigDefinition || {}; // Use definition for defaults

        // Initialize/validate based on current definition
        const initialData = {};

        // Concurrency
        if (definition.allow_concurrency === true) {
          const loadedConcurrency = loadedData.concurrency;
          initialData.concurrency = (typeof loadedConcurrency === 'number' && Number.isInteger(loadedConcurrency) && loadedConcurrency > 0) ? loadedConcurrency : 1;
        }

        // Local Proxy
        if (definition.localproxy === true) {
          initialData.useLocalProxy = typeof loadedData.useLocalProxy === 'boolean' ? loadedData.useLocalProxy : false;
        }

        // GPT Prompts (Load saved or use definition default)
        (definition.gptprompt || []).forEach(promptItem => {
          const key = Object.keys(promptItem)[0];
          initialData[key] = (loadedData[key] !== undefined && loadedData[key] !== null) ? loadedData[key] : (promptItem[key] || '');
        });

        // Row Data (preserve existing row data)
        const numEntries = definition.number || 0;
        const emotions = definition.emotion_list && definition.emotion_list.length > 0 ? definition.emotion_list : [''];
        const items = definition.required_item || [];

        for (let i = 1; i <= numEntries; i++) {
           for (const emotion of emotions) {
               const effectiveEmotion = emotion === '' ? 'default_emotion_placeholder' : emotion;
               const dataKey = this.getDataKey(i, effectiveEmotion);
               // If data exists for this key in loadedData, copy it
               if (loadedData[dataKey]) {
                   initialData[dataKey] = JSON.parse(JSON.stringify(loadedData[dataKey])); // Deep copy row data
               } else {
                  // Initialize empty object if no data saved for this row/emotion yet
                  // initialData[dataKey] = {}; // Or skip initialization? Let's skip to avoid empty objects.
               }
           }
        }


        // Use Vue.set or direct assignment for reactivity
        this.configData = initialData; // Replace entire object


      } catch (error) {
        console.error(`Error loading data for config ${this.selectedConfigName}:`, error);
        this.showMessageBubble('error', `加载配置 "${this.selectedConfigName}" 的数据失败`);
        // Minimal initialization on error
        this.configData = {};
         if (this.currentConfigDefinition?.allow_concurrency === true) this.configData.concurrency = 1;
         if (this.currentConfigDefinition?.localproxy === true) this.configData.useLocalProxy = false;
      }
    },
    async saveConfigData() {
      if (!this.selectedConfigName || !this.currentConfigDefinition) {
        this.showMessageBubble('error', '没有选中的配置可保存');
        return;
      }
      // Validate concurrency if applicable
      if (this.currentConfigDefinition.allow_concurrency === true) {
        const concurrencyValue = this.configData.concurrency;
        if (typeof concurrencyValue !== 'number' || !Number.isInteger(concurrencyValue) || concurrencyValue <= 0) {
          this.showMessageBubble('error', '并发数必须是大于0的整数，请修正后保存。');
          return;
        }
      }

      // Save staged files first
      const fileSavePromises = [];
      const dataFolder = `/data/tts_${this.selectedConfigName}`;

      // Ensure base folder exists
      if (Object.keys(this.filesToSave).length > 0) {
           await createFolder(dataFolder).catch(err => {
                if (!err.message.includes('文件夹已存在') && !err.message.includes('Key already exists')) {
                  console.error(`创建目录 ${dataFolder} 失败:`, err);
                  this.showMessageBubble('error', `创建文件目录失败: ${err.message}`);
                  throw err; // Stop saving if folder creation fails critically
                }
           });
      }


      for (const key in this.filesToSave) {
        const file = this.filesToSave[key];
        if (file instanceof File) {
          const filePath = `${dataFolder}/${file.name}`;
          fileSavePromises.push(
            writeFile(filePath, file).catch(err => {
              console.error(`Error writing file ${file.name} to ${filePath}:`, err);
              this.showMessageBubble('error', `保存文件 ${file.name} 失败: ${err.message}`);
              throw err; // Propagate error
            })
          );
        }
      }

      try {
        await Promise.all(fileSavePromises); // Wait for all files

        // Save config data to localStorage
        const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        if (!saved[SOVITS_KEY]) saved[SOVITS_KEY] = {};
        // Prune data: Remove entries beyond the current definition's number/emotions? Optional.
        // For now, save everything in configData.
        saved[SOVITS_KEY][this.selectedConfigName] = JSON.parse(JSON.stringify(this.configData)); // Deep copy
        localStorage.setItem(LS_KEY, JSON.stringify(saved));

        this.filesToSave = {}; // Clear staged files
        this.showMessageBubble('success', `配置 "${this.selectedConfigName}" 的数据已保存`);
      } catch (error) {
        console.error('Error saving config data or files:', error);
        // Avoid redundant message if file save failed
        if (!error.message.includes('保存文件')) {
             this.showMessageBubble('error', `保存配置 "${this.selectedConfigName}" 数据失败: ${error.message}`);
        }
      }
    },
    getDataKey(index, emotion) {
      // Use 'default' as the key for empty emotion string ('')
      const effectiveEmotion = emotion === '' ? 'default' : emotion;
      // Check if emotions are actually configured in the definition
      const hasEmotionsConfigured = Array.isArray(this.currentConfigDefinition?.emotion_list) && this.currentConfigDefinition.emotion_list.length > 0;
      // If no emotions configured, key is just the index. Otherwise, index_emotion.
      return hasEmotionsConfigured ? `${index}_${effectiveEmotion}` : `${index}`;
    },
    getInputValue(index, emotion, itemKey) {
      const dataKey = this.getDataKey(index, emotion);
      return this.configData[dataKey]?.[itemKey] ?? ''; // Use nullish coalescing for default empty string
    },
    setInputValue(value, index, emotion, itemKey) {
      const dataKey = this.getDataKey(index, emotion);
      if (!this.configData[dataKey]) {
        this.configData[dataKey] = {}; // Initialize if doesn't exist
      }
      this.configData[dataKey][itemKey] = value;
       // Force update for reactivity if needed (Vue 3 generally handles this)
       // this.$forceUpdate();
    },
    handleFileSelect(event, index, emotion, itemKey) {
      const file = event.target.files[0];
      if (!file) return;
      const dataKey = this.getDataKey(index, emotion);
      const fileStorageKey = `${dataKey}_${itemKey}`;

      // Initialize row data object if it doesn't exist
      if (!this.configData[dataKey]) {
         this.configData[dataKey] = {};
      }

      // Store filename in configData for display and persistence
       this.configData[dataKey][itemKey] = file.name;

      // Store the File object separately, to be saved to IndexedDB on 'Save'
      this.filesToSave[fileStorageKey] = file;

       // Force update for reactivity of the input display if needed
       // this.$forceUpdate();

      // Reset file input value so the same file can be selected again
      event.target.value = null;
    },

    // --- UI Helpers ---
    switchEmotion(emotion) {
      this.currentEmotion = emotion;
      // Optionally clear test results when switching emotion?
        // this.revokeTestAudioUrls();
        // this.testError = null;
    },
    applyFilling(itemKey) {
      if (!this.currentConfigDefinition || this.numberOfEntries <= 1) return;

      const emotionToFill = this.currentEmotion; // The currently selected emotion in the UI
      const firstDataKey = this.getDataKey(1, emotionToFill); // Key for the source row (row 1, current emotion)

      // Check if source data exists
      const valueToFill = this.configData[firstDataKey]?.[itemKey];

       // Allow filling empty strings if that's the value in row 1
       // Only show warning if row 1 doesn't even have the key (or the row object)
      if (this.configData[firstDataKey] === undefined || this.configData[firstDataKey]?.[itemKey] === undefined) {
        this.showMessageBubble('warning', `序号1 (语气: ${emotionToFill || '默认'}) 的 "${this.requiredItems.find(i => i.key === itemKey)?.label}" 数据不存在，无法填充`);
        return;
      }


      let filledCount = 0;
      const isFileSelect = this.requiredItems.find(item => item.key === itemKey)?.type === 'fileselect';

      for (let i = 2; i <= this.numberOfEntries; i++) {
        const targetDataKey = this.getDataKey(i, emotionToFill); // Target key (row i, current emotion)
        // Initialize target row object if it doesn't exist
        if (!this.configData[targetDataKey]) {
            this.configData[targetDataKey] = {};
        }

        // Only fill if the target value is different from the source value
        if (this.configData[targetDataKey]?.[itemKey] !== valueToFill) {
          this.configData[targetDataKey][itemKey] = valueToFill;
          filledCount++;

          // Handle file staging: If filling a filename, clear any *different* pending file upload for the target.
          if (isFileSelect) {
            const targetFileStorageKey = `${targetDataKey}_${itemKey}`;
            if (this.filesToSave[targetFileStorageKey]) {
                // If the staged file's name is different from the one we are filling, remove the staged file.
                // We assume the user wants to use the file *referenced* by row 1's filename.
                if (this.filesToSave[targetFileStorageKey].name !== valueToFill) {
                    delete this.filesToSave[targetFileStorageKey];
                    console.log(`Cleared staged file for ${targetFileStorageKey} because filename from row 1 is being applied.`);
                }
            }
          }
        }
      }

      if (filledCount > 0) {
        this.showMessageBubble('success', `"${this.requiredItems.find(i => i.key === itemKey)?.label}" 已从序号1填充至 ${filledCount} 行 (语气: ${emotionToFill || '默认'})`);
      } else {
        this.showMessageBubble('info', `所有后续行的 "${this.requiredItems.find(i => i.key === itemKey)?.label}" 已与序号1相同 (语气: ${emotionToFill || '默认'})`);
      }
       // Force update if changes aren't reflected automatically
       // this.$forceUpdate();
    },
    getColumnFlex(itemKey) {
      // More flexible approach: give text more space, files less
      const itemDefinition = this.requiredItems.find(item => item.key === itemKey);
      if (itemDefinition?.type === 'fileselect') return 1.5;
      if (itemKey === 'reference_text') return 3;
       if (itemKey === 'speaker' || itemKey === 'language' || itemKey === 'speed') return 1; // Smaller fields
      if (itemKey === 'modelname' || itemKey === 'model') return 1.5;
      return 2; // Default flex
    },

    // --- JSON Definition Handling ---
    quoteVariables(jsonObj) {
        if (jsonObj === null || typeof jsonObj !== 'object') return jsonObj;
        try {
            let jsonString = JSON.stringify(jsonObj);
            // Replace {{var}} with "{{var}}" only if not already quoted correctly
             // Positive lookbehind/lookahead might be complex, simpler replace and check:
            jsonString = jsonString.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match) => {
               // Check context - VERY basic check, might fail in edge cases
               // Avoid quoting if it looks like it's already a value within quotes
               // e.g., "key": "{{val}}" should remain as is.
               // e.g., ["{{val1}}", "{{val2}}"] should remain as is.
               // e.g., { "key": "{{val}}" } should remain as is.
               // This simple regex is tricky. A full parser is more robust.
               // Let's assume JSON.stringify handles basic quoting and we just need to
               // ensure the {{var}} isn't misinterpreted *by our logic*.
               // The goal is to store the definition such that {{var}} is preserved literally.
               // The deep unquote/quote approach might be safer. Let's refine it.

               // Safer approach: Stringify, then replace the *quoted* versions back
                return `__TEMP_VAR_MARKER_${match}__TEMP_VAR_MARKER_`; // Temporary marker
            });
            // Now replace markers back without external quotes
            jsonString = jsonString.replace(/\"__TEMP_VAR_MARKER_(\{\{[^}]+\}\})__TEMP_VAR_MARKER_\"/g, '$1');
            // Handle cases where marker might be at start/end or next to delimiters ,:{}[]
            // This is getting complicated. Let's rethink.

            // --- Re-attempt with Deep Clone and Recursive Quoting ---
            const deepQuoteRecursive = (data) => {
              if (typeof data === 'string') {
                 // If the string *is* a variable placeholder, return it unchanged.
                 // JSON.stringify will handle quoting it later.
                 if (/^\{\{\s*[\w.]+\s*\}\}$/.test(data)) {
                    return data;
                 }
                 // Otherwise, return the normal string.
                 return data;
              } else if (Array.isArray(data)) {
                 return data.map(item => deepQuoteRecursive(item));
              } else if (data !== null && typeof data === 'object') {
                 const newObj = {};
                 for (const key in data) {
                    if (Object.hasOwnProperty.call(data, key)) {
                       // Recursively process keys *and* values
                       const newKey = deepQuoteRecursive(key); // Quote keys if they are vars? Unlikely. Use original key.
                       newObj[key] = deepQuoteRecursive(data[key]);
                    }
                 }
                 return newObj;
              }
              return data; // Return numbers, booleans, null as is
            };

            // Create a processed structure where {{vars}} are left as strings
             const processedObj = deepQuoteRecursive(JSON.parse(JSON.stringify(jsonObj)));
             // Convert this structure to JSON. Stringify will quote correctly.
             return JSON.parse(JSON.stringify(processedObj)); // Return the final object


        } catch (e) {
            console.error("Error in quoteVariables:", e, jsonObj);
            return JSON.parse(JSON.stringify(jsonObj)); // Return copy on error
        }
    },
    unquoteVariables(jsonObj) { // Simple wrapper for deep version
      return unquoteVariablesDeep(jsonObj);
    },
    validateConfigJson(jsonString) {
       // --- Validation Logic from previous step ---
       // --- Seems robust, keeping it ---
        let parsedJson;
        try {
            parsedJson = JSON.parse(jsonString);
        } catch (e) {
            return { isValid: false, message: `JSON 格式无效: ${e.message}` };
        }

        // Basic Structure Validation
        const requiredKeys = ['number', 'required_item', 'url'];
        for (const key of requiredKeys) { if (!(key in parsedJson)) return { isValid: false, message: `缺少必需的配置项: ${key}` }; }
        if (typeof parsedJson.number !== 'number' || !Number.isInteger(parsedJson.number) || parsedJson.number <= 0) return { isValid: false, message: `number 必须是正整数` };
        if (!Array.isArray(parsedJson.required_item) || parsedJson.required_item.length === 0) return { isValid: false, message: `required_item 必须是非空数组` };
        for(let i=0; i < parsedJson.required_item.length; i++) {
            const item = parsedJson.required_item[i];
            if (typeof item !== 'object' || item === null || Array.isArray(item)) return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素格式无效，必须是对象` };
             const keys = Object.keys(item);
             if (keys.length === 0) return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素不能为空对象` };
             const mainKey = keys.find(k => k !== 'filling' && k !== 'fileselect');
             if (!mainKey) return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素缺少主键` };
             if (typeof item[mainKey] !== 'string') return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素的主键 "${mainKey}" 的值 (标签) 必须是字符串` };
             if (item.hasOwnProperty('filling') && typeof item.filling !== 'boolean') return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素的 filling 属性必须是布尔值` };
             if (item.hasOwnProperty('fileselect') && typeof item.fileselect !== 'boolean') return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素的 fileselect 属性必须是布尔值` };
             // Check for unexpected keys
             const allowedKeys = new Set([mainKey, 'filling', 'fileselect']);
             const extraKeys = keys.filter(k => !allowedKeys.has(k));
             if (extraKeys.length > 0) return { isValid: false, message: `required_item 数组的第 ${i+1} 个元素包含无效属性: ${extraKeys.join(', ')}` };
        }
        if (typeof parsedJson.url !== 'string' || parsedJson.url.trim() === '') return { isValid: false, message: `url 必须是非空字符串` };

        // Optional fields validation
        if ('allow_concurrency' in parsedJson && typeof parsedJson.allow_concurrency !== 'boolean') return { isValid: false, message: 'allow_concurrency 必须是布尔值' };
        if ('localproxy' in parsedJson && typeof parsedJson.localproxy !== 'boolean') return { isValid: false, message: 'localproxy 必须是布尔值' };
        if ('emotion_list' in parsedJson) {
            if (!Array.isArray(parsedJson.emotion_list)) return { isValid: false, message: 'emotion_list 必须是数组' };
            if (!parsedJson.emotion_list.every(e => typeof e === 'string')) return { isValid: false, message: 'emotion_list 数组的所有元素必须是字符串' };
        }
        if ('emotion_feedback' in parsedJson && typeof parsedJson.emotion_feedback !== 'string') return { isValid: false, message: 'emotion_feedback 必须是字符串' };
        if ('gptprompt' in parsedJson) {
            if (!Array.isArray(parsedJson.gptprompt)) return { isValid: false, message: 'gptprompt 必须是数组' };
             for(let i=0; i < parsedJson.gptprompt.length; i++) {
                 const promptItem = parsedJson.gptprompt[i];
                 if (typeof promptItem !== 'object' || promptItem === null || Array.isArray(promptItem) || Object.keys(promptItem).length !== 1) return { isValid: false, message: `gptprompt 数组的第 ${i+1} 个元素格式无效，应为 {"key": "defaultValue"} 形式` };
                 const key = Object.keys(promptItem)[0];
                 if (typeof promptItem[key] !== 'string') return { isValid: false, message: `gptprompt 数组的第 ${i+1} 个元素的默认值必须是字符串` };
             }
        }
        // Request Structure Validation
        const mainMethod = (parsedJson.requestmethod || 'GET').toUpperCase();
        const hasMainBody = parsedJson.body !== undefined && parsedJson.body !== null;
        if (mainMethod !== 'GET' && mainMethod !== 'POST') return { isValid: false, message: `主请求的 requestmethod 必须是 "get" 或 "post"` };
        if (mainMethod === 'GET' && hasMainBody) return { isValid: false, message: '主请求 requestmethod 是 GET 时，不应配置 body' };
        // Allow GET params with POST
        // Before Requests Validation
        const beforeRequests = parsedJson.before_requests;
        if (beforeRequests !== undefined && beforeRequests !== null) {
            if (!Array.isArray(beforeRequests)) return { isValid: false, message: `before_requests 必须是数组` };
            for (let i = 0; i < beforeRequests.length; i++) { /* ... rest of before_requests checks ... */ }
        }
        // Judge Repeat Before Validation
         const judgeRepeatBefore = parsedJson.judge_repeat_before;
         const allowedVarsForValidation = new Set([
             ...(parsedJson.required_item || []).map(item => Object.keys(item).find(k=> k !== 'filling' && k !== 'fileselect')), // Get main keys
             ...(parsedJson.gptprompt || []).map(p => Object.keys(p)[0]), // Add prompt keys
             'gptreturn', 'text', 'language'
             ].filter(Boolean)); // Filter out undefined if main key extraction fails
        if (judgeRepeatBefore !== undefined && judgeRepeatBefore !== null && judgeRepeatBefore !== "") {
            if (typeof judgeRepeatBefore !== 'string') return { isValid: false, message: `judge_repeat_before 必须是字符串` };
            const variableMatch = judgeRepeatBefore.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
            if (!variableMatch) return { isValid: false, message: `judge_repeat_before 必须是空字符串或 "{{变量名}}" 的形式` };
            const baseVar = variableMatch[1].split('.')[0]; // Check base var
            if (!allowedVarsForValidation.has(baseVar)) return { isValid: false, message: `judge_repeat_before 中的基础变量 "{{${baseVar}}}" 不允许。允许的基础变量: ${[...allowedVarsForValidation].join(', ')}` };
            if (parsedJson.allow_concurrency !== true) return { isValid: false, message: `如果定义了 judge_repeat_before，则 allow_concurrency 必须设置为 true` };
        }

        // Variable Usage Validation (improved slightly)
        const errors = [];
        const findVariablesInStructure = (struct, path = '') => { /* ... recursive logic from previous step ... */ return new Set(); }; // Placeholder for brevity
        const usedVars = new Set(); // Placeholder
        // --- Logic to populate usedVars ---
         const regex = /{{\s*([\w.]+)\s*}}/g;
         const processor = (item) => {
             if (typeof item === 'string') {
                 let match; while ((match = regex.exec(item)) !== null) { usedVars.add(match[1]); } regex.lastIndex = 0;
             } else if (Array.isArray(item)) { item.forEach(processor);
             } else if (item !== null && typeof item === 'object') { Object.values(item).forEach(processor); }
         };
         processor(parsedJson.url);
         processor(parsedJson.getparams);
         processor(parsedJson.body);
         processor(parsedJson.headers); // Check headers too
         (parsedJson.before_requests || []).forEach(req => {
             if (req && typeof req === 'object') {
                 processor(req.url); processor(req.getparams); processor(req.body); processor(req.headers);
             }
         });


        for (const variable of usedVars) {
            const baseVariable = variable.split('.')[0];
            if (!allowedVarsForValidation.has(baseVariable)) errors.push(`不允许或未定义的变量: {{${variable}}}`);
        }
        if (errors.length > 0) return { isValid: false, message: [...new Set(errors)].join('; ') };

        return { isValid: true, message: 'JSON 定义有效', parsedJson };
    },

    // --- Audio Handling ---
    revokeTestAudioUrls() {
      if (this.blobUrlShort) URL.revokeObjectURL(this.blobUrlShort);
      if (this.blobUrlLong) URL.revokeObjectURL(this.blobUrlLong);
      this.blobUrlShort = null;
      this.blobUrlLong = null;
      this.testShortAudioSrc = null;
      this.testLongAudioSrc = null;
    },
    async testCurrentConfig() {
      if (!this.selectedConfigName || !this.currentConfigDefinition) {
        this.showMessageBubble('warning', '请先选择一个要测试的配置'); return;
      }
      if (this.numberOfEntries < 1 || this.selectedTestIndex < 1 || this.selectedTestIndex > this.numberOfEntries) {
        this.showMessageBubble('warning', `无效的测试序号: ${this.selectedTestIndex}`); return;
      }
      if (this.isTesting) return;

      this.isTesting = true;
      this.testError = null;
      this.revokeTestAudioUrls();
      this.showMessageBubble('info', `开始测试语音生成 (序号 ${this.selectedTestIndex})...`);

      const nameId = this.selectedTestIndex;
      const lang = "zh";
      const gptReturnValueForTest = this.testGptReturnValue;

      try {
        const testAudioDir = `/data/test/tts_test_preview/${this.selectedConfigName}`;
        await createFolder(testAudioDir).catch(err => { if (!err.message.includes('文件夹已存在') && !err.message.includes('Key already exists')) console.warn(`创建测试目录时出错: ${err.message}`); });

        // --- Test Short Text ---
        const textShort = "测试";
        const shortFileName = `test_short_${this.selectedConfigName}_${nameId}_${Date.now()}`;
        const conversationMockShort = { id: shortFileName, character: 'TestChar', emotion: gptReturnValueForTest, text: textShort }; // Use test value for emotion
        this.showMessageBubble('info', `正在生成短文本语音: "${textShort}"`);

        const resultShort = await processConversationAudioRequest(
            nameId, textShort, conversationMockShort, lang,
            this.currentConfigDefinition, this.configData, testAudioDir,
            (msg) => console.log(`[Test Short] ${msg}`), true
        );
        if (resultShort.status !== "ok") throw new Error(resultShort.reason || `处理短文本请求失败`);
        const shortBlob = await readFile(`${testAudioDir}/${shortFileName}.wav`);
        this.blobUrlShort = URL.createObjectURL(shortBlob);
        this.testShortAudioSrc = this.blobUrlShort;
        this.showMessageBubble('success', `短文本语音生成成功`);

        // --- Test Long Text ---
        const textLong = "斗之力，三段！"; // Shorter long text for faster testing
        const longFileName = `test_long_${this.selectedConfigName}_${nameId}_${Date.now()}`;
        const conversationMockLong = { id: longFileName, character: 'TestChar', emotion: gptReturnValueForTest, text: textLong }; // Use test value for emotion
        this.showMessageBubble('info', `正在生成长文本语音...`);

        const resultLong = await processConversationAudioRequest(
            nameId, textLong, conversationMockLong, lang,
            this.currentConfigDefinition, this.configData, testAudioDir,
            (msg) => console.log(`[Test Long] ${msg}`), true
        );
        if (resultLong.status !== "ok") throw new Error(resultLong.reason || `处理长文本请求失败`);
        const longBlob = await readFile(`${testAudioDir}/${longFileName}.wav`);
        this.blobUrlLong = URL.createObjectURL(longBlob);
        this.testLongAudioSrc = this.blobUrlLong;
        this.showMessageBubble('success', `长文本语音生成成功`);

        this.showMessageBubble('success', '测试完成，音频已加载。');

      } catch (error) {
        console.error("[Test] Test failed:", error);
        this.testError = `${error.message || '未知测试错误'}`;
        this.showMessageBubble('error', `测试失败: ${this.testError}`);
      } finally {
        this.isTesting = false;
      }
    },

    // --- Message Bubble ---
    showMessageBubble(type, content) {
      this.messageContent = content;
      this.messageType = type;
      this.showMessage = true;
      clearTimeout(this.messageTimeout);
      this.messageTimeout = setTimeout(() => { this.showMessage = false; }, 3500);
    }
  }
};
</script>

<style scoped>
/* General Component Styling */
.voice-config {
  /* Inherits .card style from app.vue */
  padding: 20px;
  background-color: var(--surface-color); /* Ensure surface color */
  border-radius: var(--border-radius-lg);
  box-shadow: var(--box-shadow);
}

.separator {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 20px 0;
}
.thin-separator {
    margin: 15px 0;
}

/* Config Management Bar */
.config-management-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
}

.config-label {
  font-weight: 500;
  color: var(--text-secondary);
  margin-right: -5px; /* Adjust spacing */
}

.config-select {
  /* Uses global .select style */
  min-width: 200px;
  max-width: 300px;
  flex-grow: 1;
}

.config-management-bar .button-group {
    display: flex;
    gap: 8px;
    margin-left: auto; /* Push buttons to the right */
}
.config-management-bar .btn-sm {
    padding: 6px 12px; /* Consistent small button padding */
}

/* Header Section within Config Area */
.header-section {
  margin-bottom: 25px;
}

.config-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 20px;
}

/* Settings Row (Proxy, Concurrency, GPT Prompts) */
.settings-row {
    display: flex;
    flex-wrap: wrap;
    gap: 30px; /* Space between setting groups */
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
}
.setting-group {
    display: flex;
    flex-direction: column;
    gap: 15px;
    flex: 1; /* Allow groups to take space */
    min-width: 250px; /* Min width before wrapping */
}

.group-title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 5px;
    padding-bottom: 5px;
    border-bottom: 1px dashed var(--border-color);
}

.proxy-concurrency-group {
    flex-direction: row; /* Align proxy/concurrency side-by-side */
    flex-wrap: wrap;
    align-items: center; /* Vertically align items */
    gap: 25px;
}
.proxy-config, .concurrency-config {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0; /* Remove bottom margin from form-group */
}
.concurrency-input {
    width: 80px; /* Fixed width for number input */
}

/* Inherit switch styles from global */

/* GPT Prompts Styles */
.prompt-item .form-label {
  font-weight: 500; /* Slightly bolder prompt labels */
}
.textarea-input {
  /* Uses global .input style */
  resize: vertical;
  min-height: 40px; /* Min-height for textareas */
  line-height: 1.5;
}

/* Emotion Switcher */
.emotion-switcher .form-label {
    margin-bottom: 10px;
    display: block;
}
.emotion-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.emotion-btn {
  /* Uses .btn .btn-outline .btn-sm */
  transition: all var(--transition-speed);
}
.active-emotion {
  /* Style for the active emotion button */
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  font-weight: 600;
}

/* Content Section - Table */
.content-section {
  /* Uses global .card */
  margin-top: 20px;
  padding: 15px;
  background-color: var(--background-color); /* Slightly different background */
}

.current-emotion-indicator {
    display: inline-flex; /* Changed to inline-flex */
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    border-radius: 20px; /* Pill shape */
    background-color: var(--hover-overlay);
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-bottom: 15px;
    border: 1px solid var(--border-color);
}

.current-emotion-indicator .indicator-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: var(--primary-light); /* Default color */
}
/* Optional: Add specific colors per emotion if needed */
/* .current-emotion-indicator[data-emotion="happy"] .indicator-dot { background-color: var(--secondary-color); } */

.current-emotion-indicator .emotion-name {
    color: var(--text-primary);
}

/* Table Styles */
.table-header, .entry-row {
  display: flex;
  align-items: stretch; /* Align items to stretch vertically */
  border-bottom: 1px solid var(--border-color);
  padding: 8px 0;
  gap: 10px; /* Gap between columns */
}
.table-header {
  font-weight: 600;
  color: var(--text-secondary);
  padding-bottom: 12px;
  margin-bottom: 5px;
   background-color: var(--hover-overlay);
   padding-left: 5px;
   padding-right: 5px;
   border-radius: var(--border-radius-sm);
}
.entry-row:last-child {
  border-bottom: none;
}
.even-row {
  background-color: var(--hover-overlay);
  border-radius: var(--border-radius-sm);
}

/* Column Styles */
.col-index {
  flex: 0 0 40px; /* Fixed width for index */
  text-align: center;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}
.col-dynamic {
  flex: 1; /* Default flex, overridden by style binding */
  display: flex;
  flex-direction: column; /* Stack label/input vertically if needed, or keep side-by-side */
  justify-content: center; /* Center content vertically */
}
.table-header .col-dynamic {
    flex-direction: row; /* Keep header label and button side-by-side */
    justify-content: space-between;
    align-items: center;
}

.header-label {
    font-size: 0.9rem;
}
.btn-fill {
    color: var(--primary-color);
    padding: 2px 4px;
}
.btn-fill:hover {
    background-color: var(--primary-light);
    color: white;
}

/* Input Styles within Table */
.entry-textarea {
    min-height: 38px; /* Make textarea fit row better */
    padding: 6px 10px;
    font-size: 0.9rem;
    /* resize: none; */ /* Disable resize for table view */
    overflow-y: auto; /* Allow scroll if content exceeds */
    height: auto; /* Let content determine height initially */
    max-height: 80px; /* Limit max height */
}

.fileselect-wrapper {
  display: flex;
  align-items: center;
  gap: 5px;
}
.fileselect-display {
  /* Uses global .input */
  flex-grow: 1;
  cursor: default;
  font-size: 0.9rem;
   height: 38px; /* Match textarea height */
   padding: 6px 10px;
   overflow: hidden;
   text-overflow: ellipsis;
   white-space: nowrap;
}
.btn-file-browse {
  /* Uses .btn .btn-outline .btn-xs */
  flex-shrink: 0;
  padding: 6px 8px; /* Adjust padding */
}

/* Test Panel */
.test-panel {
  /* Uses global .card */
  margin-top: 25px;
  padding: 20px;
}
.panel-title {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.test-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end; /* Align items to bottom for button */
  gap: 20px;
  margin-bottom: 20px;
}
.test-control-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.test-control-item .form-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
}
.test-select {
  /* Uses global .select */
  min-width: 80px;
}
.test-gptreturn-input {
    min-width: 150px;
}
.test-button-container {
    margin-left: auto; /* Push button to the right */
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}
.btn-test {
  /* Uses .btn .btn-info */
  padding: 8px 18px;
}
.test-status-text {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 5px;
    display: flex;
    align-items: center;
    gap: 5px;
}

.test-results {
  margin-top: 15px;
}
.audio-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.audio-preview label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  min-width: 100px; /* Ensure label alignment */
}
.audio-preview audio {
  height: 40px; /* Control audio player height */
  max-width: 100%; /* Ensure player doesn't overflow */
}
.test-error-msg {
  /* Uses global .error-message */
  margin-bottom: 15px;
  padding: 10px;
}

/* Save Panel */
.save-panel {
  margin-top: 30px;
  text-align: center; /* Center the save button */
}
.btn-save {
  /* Uses .btn .btn-primary .btn-lg */
  min-width: 250px;
}

/* Placeholder */
.no-config-selected {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-tertiary);
  border: 2px dashed var(--border-color);
  border-radius: var(--border-radius-lg);
  margin-top: 20px;
}
.placeholder-icon {
    font-size: 2rem;
    margin-bottom: 15px;
    display: block; /* Center icon */
    margin-left: auto;
    margin-right: auto;
}

/* Modal Styling */
.modal { /* Renamed from .modal-overlay */
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
  /* Uses global .card */
  width: 100%;
  max-width: 700px; /* Wider modal for JSON */
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px; /* Add padding to the card itself */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 15px;
  margin-bottom: 15px;
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.25rem;
  margin: 0;
}

.modal-body {
  overflow-y: auto;
  flex-grow: 1;
  margin-bottom: 15px;
  padding-right: 5px; /* Space for scrollbar */
}

.modal-hint {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 15px;
}

.json-editor-area {
  /* Uses .input .textarea-input */
  min-height: 300px;
  font-family: monospace;
  font-size: 0.85rem;
  line-height: 1.6;
}

.json-error-msg {
    margin-top: 10px;
    /* Uses global .error-message */
}

.modal-footer { /* Renamed from .modal-actions */
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--border-color);
  padding-top: 15px;
  flex-shrink: 0;
}

/* Message Bubble */
.message-bubble {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: var(--border-radius-md);
  color: white;
  background-color: var(--primary-color); /* Default to info/primary */
  box-shadow: var(--box-shadow-hover);
  z-index: 2000;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  display: flex;
  align-items: center;
  gap: 10px;
}
.message-bubble.active {
  opacity: 1;
  transform: translateY(0);
}
.message-bubble.success { background-color: var(--secondary-color); }
.message-bubble.error { background-color: var(--danger-color); }
.message-bubble.warning { background-color: var(--warning-color); color: var(--text-primary); } /* Warning often needs dark text */
.message-bubble.info { background-color: var(--info-color); }

.bubble-icon {
    font-size: 1.1rem;
}


/* Global Form Styles used in this component */
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

/* Responsive Adjustments */
@media (max-width: 768px) {
    .config-management-bar {
        flex-direction: column;
        align-items: stretch;
    }
    .config-management-bar .button-group {
        margin-left: 0;
        justify-content: flex-start; /* Align buttons left on mobile */
    }
    .settings-row {
        flex-direction: column;
        gap: 20px;
    }
    .proxy-concurrency-group {
        flex-direction: column; /* Stack proxy/concurrency */
        align-items: flex-start;
        gap: 15px;
    }
    .test-controls {
        gap: 15px;
        align-items: stretch; /* Stack controls vertically */
    }
    .test-button-container {
        margin-left: 0;
        align-items: stretch;
    }
     .btn-test {
        width: 100%; /* Full width button */
    }
     .save-panel {
        text-align: stretch;
     }
     .btn-save {
        width: 100%;
     }

    /* Reduce horizontal padding on main card for mobile */
     .voice-config {
         padding: 15px;
     }
}

</style>