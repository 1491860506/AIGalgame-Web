<template>
  <div class="home-container">
    <!-- Header Section -->
    <div class="header-section">
      <h1 class="welcome-title">欢迎使用AI Galgame生成器</h1>
      <div class="separator"></div>
    </div>

    <!-- Game Settings Section -->
    <div class="settings-panel">
      <h2 class="panel-title">游戏设置</h2>
      <div class="settings-grid">
        <!-- Left Settings Group -->
        <div class="settings-column">
          <!-- Outline Guide Switch -->
          <div class="setting-item">
            <label class="setting-label">大纲指导生成:</label>
            <div class="toggle-switch">
              <input
                type="checkbox"
                id="outline-switch"
                v-model="outlineSwitch"
                @change="saveOutlineSwitch"
              />
              <label for="outline-switch" class="toggle-label"></label>
            </div>
          </div>

          <!-- Language Selection -->
          <div class="setting-item">
            <label class="setting-label">游戏语言:</label>
            <select
              class="dropdown"
              v-model="language"
              @change="saveLanguage"
            >
              <option value="">-- 请选择 --</option>
              <option value="中文">中文</option>
              <option value="英文">英文</option>
              <option value="日文">日文</option>
            </select>
          </div>
        </div>

        <!-- Right Settings Group -->
        <div class="settings-column">
          <!-- Story Selection -->
          <div class="setting-item">
            <label class="setting-label">选择故事:</label>
            <select
              class="dropdown"
              v-model="storyTitle"
              @change="saveStoryTitle"
            >
              <option value="">-- 创建新故事 --</option>
              <option
                v-for="name in storyNames"
                :key="name"
                :value="name"
              >{{ name }}</option>
            </select>
          </div>

          <!-- Story Management Buttons -->
          <div class="button-group">
            <button
              class="btn btn-outline"
              @click="renameStory"
              :disabled="!storyTitle"
            >
               <font-awesome-icon :icon="['fas', 'pencil-alt']" class="btn-icon" /> 故事改名
            </button>
            <button
              class="btn btn-danger"
              @click="deleteStory"
              :disabled="!storyTitle"
            >
              <font-awesome-icon :icon="['fas', 'trash-alt']" class="btn-icon" /> 删除故事
            </button>
            <button
              class="btn btn-outline"
              @click="showImportDialog = true"
            >
              <font-awesome-icon :icon="['fas', 'file-import']" class="btn-icon" /> 本地导入
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Story Content Section -->
    <div class="content-panel">
      <h2 class="panel-title">故事生成提示</h2>
      <div class="content-container">
        <textarea
          class="story-textarea"
          v-model="outlineContent"
          placeholder="请在此处输入您的故事背景、角色设定和情节提示，AI将根据您的描述生成游戏内容..."
          @blur="saveOutlineContent"
        ></textarea>
      </div>
      <div class="hint-text">
        请在此处输入您的故事背景、角色设定和情节提示，AI将根据您的描述生成游戏内容...
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-container">
      <div class="left-action">
        <button
          class="btn btn-success btn-large"
          @click="startGame"
        >
          <font-awesome-icon :icon="['fas', 'play']" class="btn-icon" /> 开始游戏
        </button>
      </div>
      <div class="right-action">
        <button
          class="btn btn-outline"
          @click="openAdvancedOptionsDialog"
        >
          <font-awesome-icon :icon="['fas', 'cog']" class="btn-icon" /> 高级选项
        </button>
      </div>
    </div>

    <!-- Import Dialog -->
    <div class="modal" v-if="showImportDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h2>本地导入故事</h2>
          <span class="close-btn" @click="showImportDialog = false">×</span>
        </div>
        <div class="modal-body">
          <!-- Story Name -->
          <div class="form-group">
            <label>故事名称:</label>
            <input type="text" v-model="importStoryName" class="text-input">
          </div>

          <!-- Content Selection -->
          <div class="import-options">
            <h3>包含内容</h3>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="importCharacterIntro">
                人物介绍
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="importOpeningText">
                开头文本
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="importOutline">
                故事大纲
              </label>
            </div>
          </div>

          <!-- File Selectors -->
          <div v-if="importCharacterIntro" class="form-group">
            <label>人物介绍:</label>
            <div class="file-input">
              <input
                ref="characterFileInput"
                type="file"
                accept=".txt,.json"
                @change="handleFileSelection('character')"
                class="real-file-input"
              />
              <input
                type="text"
                :value="characterFileName || '未选择文件'"
                readonly
                class="text-input"
              />
              <button class="btn btn-outline" @click="$refs.characterFileInput.click()">浏览...</button>
            </div>
          </div>

          <div v-if="importOpeningText" class="form-group">
            <label>开头文本:</label>
            <div class="file-input">
              <input
                ref="openingFileInput"
                type="file"
                accept=".txt,.json"
                @change="handleFileSelection('opening')"
                class="real-file-input"
              />
              <input
                type="text"
                :value="openingFileName || '未选择文件'"
                readonly
                class="text-input"
              />
              <button class="btn btn-outline" @click="$refs.openingFileInput.click()">浏览...</button>
            </div>
          </div>

          <div v-if="importOutline" class="form-group">
            <label>故事大纲:</label>
            <div class="file-input">
              <input
                ref="outlineFileInput"
                type="file"
                accept=".txt,.json"
                @change="handleFileSelection('outline')"
                class="real-file-input"
              />
              <input
                type="text"
                :value="outlineFileName || '未选择文件'"
                readonly
                class="text-input"
              />
              <button class="btn btn-outline" @click="$refs.outlineFileInput.click()">浏览...</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-success" @click="confirmImport">确认导入</button>
        </div>
      </div>
    </div>

    <!-- Advanced Options Dialog (New) -->
    <div class="modal" v-if="showAdvancedOptionsDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h2>高级选项</h2>
          <span class="close-btn" @click="showAdvancedOptionsDialog = false">×</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>跨域代理URL:</label>
            <input type="text" v-model="proxyUrl" class="text-input">
          </div>
          <div class="form-group">
            <label>代理密码:</label>
            <input type="text" v-model="proxyPassword" class="text-input">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="resetAdvancedConfig">
            <font-awesome-icon :icon="['fas', 'arrows-rotate']" class="btn-icon" /> 恢复默认
          </button>
          <button class="btn btn-success" @click="saveAdvancedConfig">
            <font-awesome-icon :icon="['fas', 'save']" class="btn-icon" /> 保存
          </button>
        </div>
      </div>
    </div>


    <!-- Loading Overlay -->
    <div class="loading-overlay" v-if="isLoading">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ loadingText }}</div>
    </div>

    <!-- Message Bubble -->
    <div
      class="message-bubble"
      :class="{ active: showMessage, success: messageType === 'success', error: messageType === 'error' }"
    >
      <span>{{ messageContent }}</span>
    </div>
  </div>
</template>

<script>
import { getAllTitles, readFile, writeFile, deletePath,renamePath } from './services/IndexedDBFileSystem';
import { gpt, gptDestroy } from './services/AiModelService';
import {processPrompt} from './services/PromptService'
// Import Font Awesome components and icons
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
// Import specific solid icons you need
import {
  faCog, // gear for advanced options
  faPlay, // play for start game
  faPencilAlt, // pencil for rename
  faTrashAlt, // trash for delete
  faFileImport, // file-import for import
  faSave, // save for saving config
  faArrowsRotate // arrows-rotate for reset default
} from '@fortawesome/free-solid-svg-icons';

// Add icons to the library
library.add(faCog, faPlay, faPencilAlt, faTrashAlt, faFileImport, faSave, faArrowsRotate);


export default {
  name: 'Home',
  components: {
    FontAwesomeIcon // Register the component for use in template
  },
  data() {
    return {
      // Current date and user info
      timestamp: '2025-04-17 15:00:01',
      username: 'aaaaaa',

      // Game Settings
      outlineSwitch: false,
      language: '',
      storyTitle: '',
      storyNames: [],
      outlineContent: '',

      // Import Dialog
      showImportDialog: false,
      importStoryName: '',
      importCharacterIntro: false,
      importOpeningText: false,
      importOutline: false,

      // File selections
      characterFile: null,
      openingFile: null,
      outlineFile: null,
      characterFileName: '',
      openingFileName: '',
      outlineFileName: '',

      // Loading state
      isLoading: false,
      loadingText: '加载中...',

      // Message Bubble
      showMessage: false,
      messageType: 'success',
      messageContent: '',
      messageTimeout: null,

      // Advanced Options Dialog (New)
      showAdvancedOptionsDialog: false,
      proxyUrl: 'http://127.0.0.1:5436/proxy', // Default value for proxyUrl
      proxyPassword: 'defaultpassword', // Default value for proxyPassword

      // Define default values for reset (optional, good practice)
      defaultProxyUrl: 'http://127.0.0.1:5436/proxy',
      defaultProxyPassword: 'defaultpassword',
    };
  },
  mounted() {
    this.loadStoryList();
    // Load saved configurations (including advanced config)
    this.loadHomeConfig();
  },
  methods: {
    // Configuration Management
    async loadHomeConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');

        // Load basic game settings
        if (config.剧情) {
          this.outlineSwitch = config.剧情.if_on || false;
          this.language = config.剧情.language || '';
          this.storyTitle = config.剧情.story_title || '';
          this.outlineContent = config.剧情.outline_content_entry || '';
          // Optionally load the local_story import status if needed elsewhere
        }

        // Load advanced configuration (New)
        if (config.高级配置) {
            this.proxyUrl = config.高级配置.proxyUrl || this.defaultProxyUrl;
            this.proxyPassword = config.高级配置.proxyPassword || this.defaultProxyPassword;
        } else {
             // If no advanced config exists, use defaults
            this.proxyUrl = this.defaultProxyUrl;
            this.proxyPassword = this.defaultProxyPassword;
        }

      } catch (error) {
        console.error('Failed to load configuration:', error);
        // Consider adding a user-facing message here if load fails critically
      }
    },

    // Helper to save the entire config object
    saveConfig(config) {
       try {
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
       } catch (error) {
         console.error('Failed to save configuration:', error);
         this.$emit('show-message', { title: "error", message: '保存配置失败'});
       }
    },

    saveOutlineSwitch() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        config.剧情.if_on = this.outlineSwitch;
        this.saveConfig(config);
      } catch (error) {
        console.error('Failed to save outline switch state:', error);
        this.$emit('show-message', { title: "error", message: '保存配置失败'});
      }
    },

    saveLanguage() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        config.剧情.language = this.language;
        this.saveConfig(config);
        this.$emit('show-message', { title: "success", message: `成功切换到语言：${this.language}`});
      } catch (error) {
        console.error('Failed to save language:', error);
        this.$emit('show-message', { title: "error", message: '保存配置失败'});
      }
    },

    saveStoryTitle() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        config.剧情.story_title = this.storyTitle;
        this.saveConfig(config);

        if (this.storyTitle) {
          this.$emit('show-message', { title: "success", message: `成功切换故事到${this.storyTitle}`});
        } else {
          this.$emit('show-message', { title: "success", message: '已选择空项，开始游戏将会创建新故事'});
        }
      } catch (error) {
        console.error('Failed to save story title:', error);
        this.$emit('show-message', { title: "error", message: '保存配置失败'});
      }
    },

    saveOutlineContent() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        config.剧情.outline_content_entry = this.outlineContent;
        this.saveConfig(config);
      } catch (error) {
        console.error('Failed to save outline content:', error);
        this.$emit('show-message', { title: "error", message: '保存配置失败'});
      }
    },

    // --- Advanced Options Methods (New) ---
    openAdvancedOptionsDialog() {
       // Load existing advanced config *before* showing the modal
       this.loadAdvancedConfig();
       this.showAdvancedOptionsDialog = true;
    },

    loadAdvancedConfig() {
       try {
         const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
         if (config.高级配置) {
           this.proxyUrl = config.高级配置.proxyUrl || this.defaultProxyUrl;
           this.proxyPassword = config.高级配置.proxyPassword || this.defaultProxyPassword;
         } else {
           // If no advanced config exists, use defaults
           this.proxyUrl = this.defaultProxyUrl;
           this.proxyPassword = this.defaultProxyPassword;
         }
       } catch (error) {
         console.error('Failed to load advanced configuration:', error);
         this.$emit('show-message', { title: "error", message: '加载高级配置失败'});
         // Revert to defaults if loading fails
         this.proxyUrl = this.defaultProxyUrl;
         this.proxyPassword = this.defaultProxyPassword;
       }
    },

    saveAdvancedConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.高级配置) config.高级配置 = {}; // Ensure the object exists
        config.高级配置.proxyUrl = this.proxyUrl;
        config.高级配置.proxyPassword = this.proxyPassword;
        this.saveConfig(config); // Use the helper save function
        this.$emit('show-message', { title: "success", message: '高级配置保存成功'});
        this.showAdvancedOptionsDialog = false; // Close dialog on save
      } catch (error) {
        console.error('Failed to save advanced configuration:', error);
        this.$emit('show-message', { title: "error", message: '保存高级配置失败'});
      }
    },

    resetAdvancedConfig() {
      this.proxyUrl = this.defaultProxyUrl;
      this.proxyPassword = this.defaultProxyPassword;
      // Optionally save defaults immediately after reset, or wait for user to click Save
      // Let's save automatically for simplicity
      this.saveAdvancedConfig(); // This will save the defaults and close the dialog
      this.$emit('show-message', { title: "success", message: '高级配置已恢复默认值并保存'});
    },
    // --- End Advanced Options Methods ---


    // Story Management
    async loadStoryList() {
      try {
        const titles = await getAllTitles();
        let indexToRemove = titles.indexOf('test');
        if (indexToRemove !== -1) {
          titles.splice(indexToRemove, 1);
        }
        this.storyNames = titles.sort();
      } catch (error) {
        console.error('Failed to load story list:', error);
        this.storyNames = [];
        this.$emit('show-message', { title: "error", message: '加载故事列表失败'});
      }
    },

    async renameStory() {
      if (!this.storyTitle) {
        this.$emit('show-message', { title: "error", message: '当前未选中故事'});
        return;
      }

      const newName = prompt('请输入新的故事名称:', this.storyTitle);

      if (!newName || newName.trim() === '' || newName === this.storyTitle) {
        if (newName && newName.trim() === '') {
             this.$emit('show-message', { title: "error", message: '故事名称不能为空'});
        }
        return;
      }

      try {
        // Check if new name already exists (case-insensitive check recommended)
        const titles = await getAllTitles();
         if (titles.map(t => t.toLowerCase()).includes(newName.trim().toLowerCase())) {
           this.$emit('show-message', { title: "error", message: '故事名称已存在'});
           return;
         }


        this.isLoading = true;
        this.loadingText = '正在重命名故事...';

        // Update localStorage config *before* DB operation in case DB fails? Or after?
        // Doing it after ensures the DB operation succeeded first.
        // Wait for DB operation
        await renamePath(`/data/${this.storyTitle}`,`${newName.trim()}`);

        // Update localStorage config if the renamed story was the selected one
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (config.剧情 && config.剧情.story_title === this.storyTitle) {
          config.剧情.story_title = newName.trim();
          this.saveConfig(config);
        }

        // Update current selection and refresh list
        this.storyTitle = newName.trim();
        await this.loadStoryList();

        this.isLoading = false;
        this.$emit('show-message', { title: "success", message: '故事重命名成功'});
      } catch (error) {
        console.error('Failed to rename story:', error);
        this.isLoading = false;
        this.$emit('show-message', { title: "error", message: `重命名故事失败: ${error.message}`});
      }
    },

    async deleteStory() {
      if (!this.storyTitle) {
        this.$emit('show-message', { title: "error", message: '当前未选中故事'});
        return;
      }

      if (!confirm(`确定要删除故事 "${this.storyTitle}" 吗？此操作不可撤销。`)) {
        return;
      }

      try {
        this.isLoading = true;
        this.loadingText = '正在删除故事...';

        // Update localStorage config *before* DB operation? Or after?
        // After is safer, but might leave config pointing to non-existent story if DB fails.
        // Let's update config after successful DB deletion.
        await deletePath(`/data/${this.storyTitle}`);

        // Update localStorage config if the deleted story was the selected one
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (config.剧情 && config.剧情.story_title === this.storyTitle) {
          config.剧情.story_title = '';
          this.saveConfig(config);
        }

        // Update current selection and refresh list
        this.storyTitle = '';
        await this.loadStoryList();

        this.isLoading = false;
        this.$emit('show-message', { title: "success", message: '故事删除成功'});
      } catch (error) {
        console.error('Failed to delete story:', error);
        this.isLoading = false;
        this.$emit('show-message', { title: "error", message: `删除故事失败: ${error.message}`});
      }
    },

    // Game Start
    startGame() {
      this.saveOutlineContent();

      // If no story is selected, create a new one
      if (!this.storyTitle) {
        // Start monitoring for new story in a separate thread
        this.monitorStoryTitle();
      }

      // Navigate to start page or open in new tab
      // Use router push or direct window open depending on setup
      // Assuming window.open for simplicity as in original code
      const startUrl = `${window.location.origin}/start`;
      window.open(startUrl, '_blank');
    },

    monitorStoryTitle() {
      // Check for story title changes in config
      // Note: This monitoring logic seems a bit complex and potentially buggy
      // if localStorage updates rapidly or from multiple sources.
      // A more robust approach might involve a shared state management (like Vuex)
      // or an IPC channel if running in Electron.
      // Keeping the original logic for now but acknowledging its potential issues.
      const intervalId = setInterval(() => {
        try {
          const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
          const newStoryTitle = config.剧情?.story_title || '';

          if (newStoryTitle && newStoryTitle !== this.storyTitle) {
            this.storyTitle = newStoryTitle;
            this.loadStoryList(); // Reload list to show the new story
            clearInterval(intervalId); // Stop monitoring once title is set
          }
        } catch (error) {
          console.error('Error monitoring story title:', error);
          clearInterval(intervalId);
        }
      }, 5000); // Check every 5 seconds

      // Clear interval after 3 minutes to prevent memory leaks
      setTimeout(() => {
        clearInterval(intervalId);
        console.log("Stopped monitoring for new story title.");
      }, 180000); // 3 minutes
    },


    // File Import Handling
    handleFileSelection(type) {
      const fileInput = this.$refs[`${type}FileInput`];
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];

        switch (type) {
          case 'character':
            this.characterFile = file;
            this.characterFileName = file.name;
            break;
          case 'opening':
            this.openingFile = file;
            this.openingFileName = file.name;
            break;
          case 'outline':
            this.outlineFile = file;
            this.outlineFileName = file.name;
            break;
        }
      } else {
         // Handle case where file is unselected (e.g., user cancels)
         switch (type) {
          case 'character':
            this.characterFile = null;
            this.characterFileName = '';
            break;
          case 'opening':
            this.openingFile = null;
            this.openingFileName = '';
            break;
          case 'outline':
            this.outlineFile = null;
            this.outlineFileName = '';
            break;
        }
      }
    },

    async confirmImport() {
      // Validate input
      if (!this.importStoryName.trim()) {
        this.$emit('show-message', { title: "error", message: '请输入故事名称'});
        return;
      }

      if (!this.importCharacterIntro && !this.importOpeningText && !this.importOutline) {
        this.$emit('show-message', { title: "error", message: '请至少选择一项导入内容'});
        return;
      }

      // Validate file selections for checked options
      if ((this.importCharacterIntro && !this.characterFile) ||
          (this.importOpeningText && !this.openingFile) ||
          (this.importOutline && !this.outlineFile)) {
        this.$emit('show-message', { title: "error", message: '请为所有选中的内容选择文件'});
        return;
      }

      try {
        this.isLoading = true;
        this.loadingText = '正在导入故事...';

        // Clean story name and check if it exists
        const title = this.importStoryName.trim();
        const titles = await getAllTitles();

        if (titles.map(t => t.toLowerCase()).includes(title.toLowerCase())) {
          if (!confirm(`故事"${title}"已存在，是否覆盖？`)) {
            this.isLoading = false;
            return;
          }
           // If confirming overwrite, delete the existing story first
           // This prevents issues if previous import was partial
           await deletePath(`/data/${title}`).catch(e => console.warn("Failed to delete existing story before overwrite:", e));
        }

        // Read file contents
        const character_data = this.importCharacterIntro ? await this.readFileContent(this.characterFile) : null;
        const story_data = this.importOpeningText ? await this.readFileContent(this.openingFile) : null;
        const outline_data = this.importOutline ? await this.readFileContent(this.outlineFile) : null;

        // Process and save the data
        await this.loadLocalStory(title, character_data, story_data, outline_data, this.importOutline);

        // Update configuration
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        config.剧情.story_title = title;
        this.saveConfig(config);

        // Update current story title and refresh list
        this.storyTitle = title;
        await this.loadStoryList();

        // Reset import dialog
        this.resetImportDialog();

        this.isLoading = false;
        this.$emit('show-message', { title: "success", message: '故事导入成功！'});

        // Redirect to game if appropriate
        // The logic here might need refinement depending on exact game start requirements
        // For now, keep the original logic
        const charPass = this.importCharacterIntro ? this.processCharacterData(character_data) === 'pass' : true; // If not importing, consider it 'passed' for redirect logic
        const outlinePass = this.importOutline ? this.processOutlineData(outline_data) === 'pass' : true; // Added processOutlineData
        const storyPass = this.importOpeningText ? this.processStoryData(story_data) === 'pass' : true;

        if ((charPass && outlinePass && this.importOutline) || // Character + Outline
            (charPass && storyPass && this.importOpeningText)) { // Character + Story
            // Add a small delay before navigating
            setTimeout(() => {
               // Check if a story is actually selected before navigating
               if (this.storyTitle === title) {
                 this.startGame();
               } else {
                 console.warn("Imported story is not the selected story, skipping auto-start.");
               }
            }, 1000);
        } else {
             console.log("Imported data not sufficient for auto-start, staying on Home.");
        }

      } catch (error) {
        console.error('Failed to import story:', error);
        this.isLoading = false;
        this.$emit('show-message', { title: "error", message: `导入故事失败: ${error.message}`});
      }
    },

    resetImportDialog() {
      this.showImportDialog = false;
      this.importStoryName = '';
      this.importCharacterIntro = false;
      this.importOpeningText = false;
      this.importOutline = false;
      this.characterFile = null;
      this.openingFile = null;
      this.outlineFile = null;
      this.characterFileName = '';
      this.openingFileName = '';
      this.outlineFileName = '';
      // Reset file inputs visually (if needed, might not be strictly necessary with v-if)
       if(this.$refs.characterFileInput) this.$refs.characterFileInput.value = null;
       if(this.$refs.openingFileInput) this.$refs.openingFileInput.value = null;
       if(this.$refs.outlineFileInput) this.$refs.outlineFileInput.value = null;
    },

    // File Reading Helper
    async readFileContent(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
          resolve(event.target.result);
        };

        reader.onerror = (error) => {
          reject(error);
        };

        reader.readAsText(file);
      });
    },

    // Process and save story data to IndexedDB
    async loadLocalStory(title, character_data, story_data, outline_data, outline_checkbox_checked) {
      // Status tracking
      let character_status = "null";
      let story_status = "null";
      let outline_status_str = "null"; // Status derived from *content*

      // Process character data
      if (character_data !== null) { // Check explicitly for null, not just truthiness
        character_status = this.processCharacterData(character_data);
        if (character_status === "pass") {
           // Save character data as JSON array
           let charJson = typeof character_data === 'string' ? this.parseCharacterData(character_data) : character_data;
           if (Array.isArray(charJson)) { // Ensure it's an array before saving
             await writeFile(`/data/${title}/character.json`, charJson);
           } else {
             console.warn("Processed character data was not an array, skipping save to character.json");
             character_status = "fail"; // Mark as fail if processing didn't yield array
           }
        }
      }


      // Process story data
      if (story_data !== null) { // Check explicitly for null
        story_status = this.processStoryData(story_data);

        if (story_status === "pass") {
           // Save story data as JSON object with conversations array
           let storyJson = typeof story_data === 'string' ? this.parseStoryData(story_data) : story_data;
           if (storyJson && Array.isArray(storyJson.conversations)) { // Ensure structure
             await writeFile(`/data/${title}/story/0.json`, storyJson);
           } else {
              console.warn("Processed story data was not in expected format, skipping save to story/0.json");
              story_status = "fail"; // Mark as fail if processing didn't yield correct structure
           }
        }
      }

      // Process outline data
      if (outline_data !== null) { // Check explicitly for null
        outline_status_str = this.processOutlineData(outline_data); // Use new function

        if (outline_status_str === "pass") {
           // Outline can be text or JSON
           let outlineContentToSave = outline_data;
           try {
              // Try parsing as JSON first
              const jsonAttempt = JSON.parse(this.extractJson(outline_data) || outline_data);
               // If it parses as JSON, check if it has expected outline structure (optional but good)
               // For simplicity, just save it if it parses as JSON, or as text if not.
               outlineContentToSave = jsonAttempt; // Save as parsed JSON
           } catch (e) {
              // Not valid JSON, keep as text
              console.log("Outline data is not JSON, saving as text.");
           }
           await writeFile(`/data/${title}/outline.json`, outlineContentToSave);
        }
      }

      // Determine final outline status based on checkbox and content
      // The logic seems slightly contradictory in the original comments.
      // Let's clarify:
      // If the user *checked* the outline box: Status is "pass" if *content* was good, "fail" otherwise.
      // If the user *didn't check* the outline box: Status is "pass" (meaning, we don't *need* an outline because the box wasn't checked).
      const final_outline_status = outline_checkbox_checked ? outline_status_str : "pass";


      // Update config with import status
      const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
      if (!config.剧情) config.剧情 = {};

      // Store local story import status
      config.剧情.local_story = {
        character_content: character_data ? String(character_data): "",
        story_content: story_data ? String(story_data): "",
        outline_content: outline_data ? String(outline_data): "",
        character_status: character_status,
        story_status: story_status, // Corrected typo
        outline_status: final_outline_status // Use the final status
      };

      this.saveConfig(config);

      // Create placeholder file to indicate story is ready
      // await writeFile(`/data/${title}/zw`, ""); // This seems like an outdated concept or placeholder

      // If data is insufficient, try using GPT to generate missing content
      // Define 'sufficient' data:
      // Option 1: Character (pass) + Outline (pass)
      // Option 2: Character (pass) + Story (pass)
      // Option ⚠️: The original code *only* considers Character+Outline OR Character+Story. What if they import only Outline? Or only Story?
      // Let's stick to the original sufficient conditions for GPT call trigger.
      const isSufficient = (character_status === "pass" && final_outline_status === "pass") ||
                           (character_status === "pass" && story_status === "pass");

      if (!isSufficient) {
        console.log("Imported data insufficient. Attempting GPT generation...");
         // Pass the *raw* data to GPT function, not just status
         // The prompt service should handle figuring out what's missing
        const gptResult = await this.useGptForImport(title, character_data, story_data, outline_data);
        if (gptResult === "success") {
            this.$emit('show-message', { title: "success", message: 'GPT已尝试补全故事内容'});
        } else if (gptResult === "error") {
             this.$emit('show-message', { title: "error", message: 'GPT补全故事内容失败'});
        }
         // Reload config after GPT attempt to potentially update statuses/content
         this.loadHomeConfig(); // This might overwrite some statuses if not careful
         // Better: Re-evaluate statuses and update local_story config manually after GPT call
         // For simplicity, let's assume GPT saves directly and we might need a config reload later.
      }

      return "success";
    },

    // Helper function to parse text-based character data (name：description)
    parseCharacterData(textData) {
       if (typeof textData !== 'string') return textData; // Already an object/array?
       try {
          const trimmedText = textData.trim();
          if (trimmedText.startsWith('[') || trimmedText.startsWith('{')) {
             // Looks like JSON, try parsing
             try {
                const json = JSON.parse(this.extractJson(textData) || textData);
                return Array.isArray(json) ? json : []; // Ensure it's an array
             } catch (e) {
                console.error("Could not parse character data as JSON:", e);
                return []; // Failed to parse JSON
             }
          }

          // Assume text format: Name：Description
          const lines = trimmedText.split('\n').filter(line => line.trim());
          const characters = [];
          for (const line of lines) {
             const parts = line.split('：');
             if (parts.length >= 2) {
                const name = parts[0].trim();
                const description = parts.slice(1).join('：').trim();
                if (name) { // Ensure name is not empty
                    characters.push({ name, description });
                }
             }
          }
          return characters;
       } catch (error) {
         console.error("Error parsing character text data:", error);
         return []; // Return empty array on failure
       }
    },


    // Process character data (returns "pass" or "fail")
    processCharacterData(data) {
       const parsedData = this.parseCharacterData(data); // Use the new parser
       return Array.isArray(parsedData) && parsedData.length > 0 && parsedData.every(item => typeof item === 'object' && item !== null && typeof item.name === 'string' && item.name.trim() !== '') ? "pass" : "fail";
    },

     // Helper function to parse text-based story data (character：text)
    parseStoryData(textData) {
       if (typeof textData !== 'string') return textData; // Already an object/array?
       try {
          const trimmedText = textData.trim();
           if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
             // Looks like JSON, try parsing
             try {
                const json = JSON.parse(this.extractJson(textData) || textData);
                // Return expected structure { conversations: [...] } or try to wrap if it's just an array
                 if (json && Array.isArray(json.conversations)) return json;
                 if (Array.isArray(json)) return { conversations: json };
                 console.warn("Parsed story JSON is not in expected format.");
                 return { conversations: [] }; // Failed to parse JSON correctly
             } catch (e) {
                console.error("Could not parse story data as JSON:", e);
                return { conversations: [] }; // Failed to parse JSON
             }
          }

          // Assume text format: [optional_tag]Character：Text
          const lines = trimmedText.split('\n').filter(line => line.trim());
          const conversations = [];
          for (const line of lines) {
             const match = line.match(/^(?:\[.*?\]\s*)?([^：]+)[\s]*：[\s]*(.*)$/); // Capture optional tag, character, and text
             if (match && match[1].trim() !== '') {
                 const character = match[1].trim();
                 const text = match[2].trim();
                 // Simple parsing, doesn't extract place/image etc. from tags yet
                 conversations.push({ character, text });
             } else if (line.trim()) {
                 // Handle lines without a clear character: text format, maybe narrator or just text
                 conversations.push({ text: line.trim() });
             }
          }
          return { conversations }; // Wrap in the expected structure
       } catch (error) {
         console.error("Error parsing story text data:", error);
         return { conversations: [] }; // Return empty structure on failure
       }
    },

    // Process story data (returns "pass" or "fail")
    processStoryData(data) {
      const parsedData = this.parseStoryData(data); // Use the new parser
      return parsedData && Array.isArray(parsedData.conversations) && parsedData.conversations.length > 0 ? "pass" : "fail";
    },

    // Process outline data (returns "pass" or "fail")
    processOutlineData(data) {
       // Outline can be simple text or JSON
       if (typeof data === 'string') {
          return data.trim() !== '' ? "pass" : "fail";
       }
       // If it's an object or array, assume it's "pass" as long as it's not null/undefined
       return data !== null && data !== undefined ? "pass" : "fail";
    },


    // Use GPT to complete missing data
    async useGptForImport(title, character_data_raw, story_data_raw, outline_data_raw) {
      try {
        this.loadingText = '数据不足，正在尝试使用AI补全内容...';

        // Process data to determine what's missing and prepare for prompt
        const character_status = this.processCharacterData(character_data_raw);
        const story_status = this.processStoryData(story_data_raw);
        const outline_status = this.processOutlineData(outline_data_raw); // Status of raw data

        const needsCharacter = character_status !== "pass";
        const needsStory = story_status !== "pass";
        // Only ask GPT for outline if the checkbox was checked AND the content was bad
        const needsOutline = this.importOutline && outline_status !== "pass"; // Checkbox state matters here

        // If nothing is needed, return early
        if (!needsCharacter && !needsStory && !needsOutline) {
            console.log("GPT not needed, all imported data was valid.");
            return "pass"; // Indicate it passed validation, not that GPT ran
        }

         // Prepare prompt data based on what's available
         const promptData = {
            title: title,
            character_content: character_status === "pass" ? character_data_raw : null,
            story_content: story_status === "pass" ? story_data_raw : null,
            outline_content: outline_status === "pass" ? outline_data_raw : null, // Pass raw data if valid
            needs: {
               character: needsCharacter,
               story: needsStory,
               outline: needsOutline,
            }
         };

        // Get processed prompts from PromptService
        // Assuming processPrompt('本地导入') takes promptData as an argument
        const [prompt1, prompt2] = await processPrompt('本地导入', promptData);

         if (!prompt1 || !prompt2) {
             console.error("Failed to get prompts from PromptService.");
             return "error";
         }

        // Generate a random ID for the GPT request
        const id = Math.floor(Math.random() * 100000) + 1;

        // Call GPT
        const gptResponse = await gpt(prompt1, prompt2, '本地导入', id);

        if (gptResponse === 'over_times' || gptResponse === 'error') {
          console.error("GPT处理失败:", gptResponse);
           gptDestroy(id); // Clean up the instance
          return "error";
        }

        // Process the GPT response (expecting JSON)
        const jsonData = this.extractJson(gptResponse);
        if (!jsonData) {
          console.error("无法从GPT响应中提取JSON:", gptResponse);
          gptDestroy(id); // Clean up the instance
          return "error";
        }

        try {
          const data = JSON.parse(jsonData);
          let saveSuccess = false;

          // Save the generated data if it exists and is valid
          if (needsCharacter && this.processCharacterData(data.character) === "pass") {
             const charJson = this.parseCharacterData(data.character);
              if (Array.isArray(charJson)) {
                await writeFile(`/data/${title}/character.json`, charJson);
                saveSuccess = true;
                console.log("GPT generated character data saved.");
             } else {
                 console.warn("GPT generated character data was not array, skipping save.");
             }
          }

          if (needsOutline && this.processOutlineData(data.outline) === "pass") {
             // Outline can be text or JSON from GPT
             let outlineContentToSave = data.outline;
             try {
                 const jsonAttempt = JSON.parse(this.extractJson(data.outline) || data.outline);
                 outlineContentToSave = jsonAttempt; // Save as parsed JSON if possible
             } catch(e) { /* not JSON, save as text */ }
             await writeFile(`/data/${title}/outline.json`, outlineContentToSave);
             saveSuccess = true;
             console.log("GPT generated outline data saved.");
          }

          if (needsStory && this.processStoryData(data.conversations || {conversations: data.story}) === "pass") {
             // GPT might return {conversations: [...]} or just {story: [...]} or just [...]
             // Try to normalize into { conversations: [...] }
              let storyJson = data.conversations || data.story;
              if (Array.isArray(storyJson)) storyJson = { conversations: storyJson };
              else if (storyJson && Array.isArray(storyJson.conversations)) {/* ok */}
              else storyJson = { conversations: [] }; // Fail if format is unexpected

             if (storyJson && Array.isArray(storyJson.conversations) && storyJson.conversations.length > 0) {
                await writeFile(`/data/${title}/story/0.json`, storyJson);
                saveSuccess = true;
                console.log("GPT generated story data saved.");
             } else {
                  console.warn("GPT generated story data was not in expected format, skipping save.");
             }
          }

          // Note: The local_story status in localStorage is NOT updated here based on GPT results.
          // It currently only reflects the *imported* data's status.
          // If you need the UI to reflect that GPT *successfully added* missing pieces,
          // you would need to re-process the data from IndexedDB after saving GPT results
          // and update the local_story config accordingly. For this task, we skip that complexity.


          // Clean up GPT instance
          gptDestroy(id);

          return saveSuccess ? "success" : "error"; // Indicate success only if at least one piece was saved
        } catch (error) {
          console.error("处理GPT响应失败:", error);
          gptDestroy(id); // Clean up the instance
          return "error";
        }
      } catch (error) {
        console.error("GPT处理或prompt生成失败:", error);
        // If gpt() was called, gptDestroy might be needed here too,
        // but the try/catch structure might make it complex.
        // Assuming gpt() handles its own cleanup on internal errors.
        return "error";
      }
    },


    // Helper to extract JSON from text (improved regex)
    extractJson(inputString) {
       if (typeof inputString !== 'string' || !inputString) return null;

       // Look for content between the first { and the last }
       // or between the first [ and the last ]
       const jsonMatch = inputString.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
       if (jsonMatch) {
           return jsonMatch[0];
       }

       console.warn("No JSON object or array found in string:", inputString);
       return null;
    },

  }
};
</script>

<style>
/* Light/Dark Mode Variables */
:root {
  /* Light theme (default) */
  --home-bg: #f8fafc;
  --panel-bg: #ffffff;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-hint: #94a3b8;
  --border-color: #e2e8f0;
  --input-bg: #ffffff;
  --input-border: #cbd5e1;
  --input-focus: #3b82f6;
  --btn-primary: #4f46e5;
  --btn-primary-hover: #4338ca;
  --btn-danger: #ef4444;
  --btn-danger-hover: #dc2626;
  --btn-outline: #f1f5f9;
  --btn-outline-hover: #e2e8f0;
  --btn-text: #1e293b;
  --toggle-bg-off: #cbd5e1;
  --toggle-bg-on: #4f46e5;
  --dropdown-arrow: #64748b;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --success-color: #10b981;
  --error-color: #ef4444;
  --modal-bg: #ffffff;
  --overlay-bg: rgba(0, 0, 0, 0.7);
   /* Add icon color variables if needed */
  --icon-color-default: #1e293b; /* Match btn-text */
  --icon-color-danger: white; /* Match btn-danger */
  --icon-color-success: white; /* Match btn-success */
}

/* Dark theme variables - applied when body has dark-theme class */
body.dark-theme {
  --home-bg: #0f172a;
  --panel-bg: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-hint: #94a3b8;
  --border-color: #334155;
  --input-bg: #1e293b;
  --input-border: #475569;
  --input-focus: #3b82f6;
  --btn-primary: #4f46e5;
  --btn-primary-hover: #4338ca;
  --btn-danger: #ef4444;
  --btn-danger-hover: #dc2626;
  --btn-outline: #334155;
  --btn-outline-hover: #475569;
  --btn-text: #f1f5f9;
  --toggle-bg-off: #475569;
  --toggle-bg-on: #4f46e5;
  --dropdown-arrow: #94a3b8;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
  --success-color: #10b981;
  --error-color: #ef4444;
  --modal-bg: #1e293b;
  --overlay-bg: rgba(0, 0, 0, 0.8);
  /* Add icon color variables if needed */
   --icon-color-default: #f1f5f9; /* Match btn-text */
   --icon-color-danger: white;
   --icon-color-success: white;
}


.home-container {
  padding: 2rem;
  background-color: var(--home-bg);
  min-height: calc(100vh - var(--header-height, 0px));
  transition: background-color 0.3s, color 0.3s;
}

/* Header Section */
.header-section {
  margin-bottom: 2rem;
}

.welcome-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1rem;
  transition: color 0.3s;
}

.separator {
  height: 4px;
  background: linear-gradient(to right, var(--btn-primary), var(--btn-primary-hover));
  width: 100px;
  border-radius: 2px;
  margin-bottom: 1.5rem;
}

/* Panels */
.settings-panel,
.content-panel {
  background-color: var(--panel-bg);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-md);
  padding: 1.5rem;
  margin-bottom: 2rem;
  transition: background-color 0.3s, box-shadow 0.3s;
}

.panel-title {
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  transition: color 0.3s;
}

/* Settings Grid */
.settings-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.settings-column {
  flex: 1;
  min-width: 250px;
}

.setting-item {
  margin-bottom: 1.5rem;
}

.setting-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  transition: color 0.3s;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--toggle-bg-off);
  transition: 0.3s;
  border-radius: 34px;
}

.toggle-label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-label {
  background-color: var(--toggle-bg-on);
}

input:checked + .toggle-label:before {
  transform: translateX(24px);
}

/* Dropdown Styles */
.dropdown {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  appearance: none;
  /* Using background-image for the arrow */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  transition: border-color 0.3s, background-color 0.3s, color 0.3s;
}

.dropdown:focus {
  outline: none;
  border-color: var(--input-focus);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}

/* Button Styles */
.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s, box-shadow 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  outline: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Icon spacing */
.btn-icon {
  margin-right: 0.5rem;
  /* Add icon color based on button type if using Font Awesome components */
  /* This can also be handled by inheriting text color or specific classes */
}

/* Specific button color overrides for icons if not inheriting */
.btn-outline .btn-icon {
  color: var(--icon-color-default); /* Use variable for icon color */
}
.btn-danger .btn-icon {
   color: var(--icon-color-danger); /* Use variable for icon color */
}
.btn-success .btn-icon {
   color: var(--icon-color-success); /* Use variable for icon color */
}


.btn-outline {
  background-color: var(--btn-outline);
  color: var(--btn-text);
  border: 1px solid var(--border-color);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--btn-outline-hover);
}

.btn-danger {
  background-color: var(--btn-danger);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: var(--btn-danger-hover);
}

.btn-success {
  background-color: var(--btn-primary);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: var(--btn-primary-hover);
}

.btn-large {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

/* Content Area */
.content-container {
  position: relative;
  margin-bottom: 0.5rem;
}

.story-textarea {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.3s, background-color 0.3s, color 0.3s;
}

.story-textarea:focus {
  outline: none;
  border-color: var(--input-focus);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}

.hint-text {
  font-size: 0.875rem;
  color: var(--text-hint);
  margin-top: 0.5rem;
  transition: color 0.3s;
}

/* Action Container */
.action-container {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
}

/* Modal Styles (applies to Import and Advanced) */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--overlay-bg); /* Use overlay variable */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--modal-bg); /* Use modal bg variable */
  border-radius: 0.75rem;
  width: 100%;
  max-width: 600px; /* Adjusted max-width for potentially smaller advanced modal */
  max-height: 95vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  transition: background-color 0.3s;
}

/* Optional: Give specific modals slightly different styles if needed */
/* .modal-content.advanced-options-modal { max-width: 500px; } */
/* .modal-content.import-modal { max-width: 1000px; } */


.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
  transition: color 0.3s;
  margin: 0;
}

.close-btn {
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.3s;
  background: none;
  border: none;
  line-height: 1;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end; /* Align buttons to the right */
  gap: 0.75rem; /* Space between buttons */
  border-top: 1px solid var(--border-color);
}

/* Form Elements */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  transition: color 0.3s;
}

.text-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.3s, background-color 0.3s, color 0.3s;
}

.text-input:focus {
  outline: none;
  border-color: var(--input-focus);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}

.file-input {
  display: flex;
  gap: 0.5rem;
}

.file-input .text-input {
  flex: 1;
}

.real-file-input {
  display: none;
}

.import-options {
  margin: 1.5rem 0;
}

.import-options h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  transition: color 0.3s;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  color: var(--text-primary);
  cursor: pointer;
  transition: color 0.3s;
}

.checkbox-label input {
  margin-right: 0.5rem;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--overlay-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: white;
  font-size: 1.2rem;
}

/* Message Bubble Styles (kept from original) */
.message-bubble {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  z-index: 1002;
}

.message-bubble.active {
  opacity: 1;
  visibility: visible;
}

.message-bubble.success {
  background-color: var(--success-color); /* Use success color */
  color: white;
}

.message-bubble.error {
  background-color: var(--error-color); /* Use error color */
  color: white;
}


/* Responsive Adjustments */
@media (max-width: 768px) {
  .home-container {
    padding: 1rem;
  }

  .settings-grid {
    flex-direction: column;
    gap: 1rem;
  }

  .action-container {
    flex-direction: column;
    gap: 1rem;
  }

  .right-action {
    text-align: center;
    width: 100%;
  }

  .left-action {
    width: 100%;
    text-align: center; /* Center the start button */
  }
  .left-action .btn-large {
      width: 100%; /* Make start button full width */
  }


  .welcome-title {
    font-size: 1.5rem;
  }

  .modal-content {
    width: 95%;
    max-width: none; /* Remove max-width on small screens */
  }

  .button-group {
    flex-direction: column; /* Stack story buttons vertically */
  }
  .button-group .btn {
      width: 100%; /* Make story buttons full width */
  }

  .modal-footer {
      flex-direction: column; /* Stack modal footer buttons vertically */
      gap: 0.5rem; /* Adjust gap */
  }
   .modal-footer .btn {
       width: 100%; /* Make modal footer buttons full width */
   }
}
</style>