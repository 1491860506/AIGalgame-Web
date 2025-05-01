<template>
  <div>
    <!-- Header Section -->
    <div class="header-section">
      <h1 class="welcome-title">欢迎使用AI Galgame生成器</h1>
      <div class="separator"></div>
    </div>
    <div class="home-container">

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
                <input type="checkbox" id="outline-switch" v-model="outlineSwitch" @change="saveOutlineSwitch" />
                <label for="outline-switch" class="toggle-label"></label>
              </div>
            </div>

            <!-- Language Selection -->
            <div class="setting-item">
              <label class="setting-label">游戏语言:</label>
              <select class="dropdown" v-model="language" @change="saveLanguage">
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
              <select class="dropdown" v-model="storyTitle" @change="saveStoryTitle">
                <option value="">-- 创建新故事 --</option>
                <option v-for="name in storyNames" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>

            <!-- Story Management Buttons -->
            <div class="button-group">
              <button class="btn btn-outline" @click="renameStory" :disabled="!storyTitle">
                <font-awesome-icon :icon="['fas', 'pencil-alt']" class="btn-icon" /> 故事改名
              </button>
              <button class="btn btn-danger" @click="deleteStory" :disabled="!storyTitle">
                <font-awesome-icon :icon="['fas', 'trash-alt']" class="btn-icon" /> 删除故事
              </button>
              <button class="btn btn-outline" @click="showImportDialog = true">
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
          <textarea class="story-textarea" v-model="outlineContent"
            placeholder="请在此处输入您的故事背景、角色设定和情节提示，AI将根据您的描述生成游戏内容..." @blur="saveOutlineContent"></textarea>
        </div>
        <!-- Action Buttons -->
        <div class="action-container">
          <div class="left-action">
            <button class="btn btn-success btn-large" @click="startGame">
              <font-awesome-icon :icon="['fas', 'play']" class="btn-icon" /> 开始游戏
            </button>
          </div>
          <div class="right-action">
            <button class="btn btn-outline" @click="openAdvancedOptionsDialog">
              <font-awesome-icon :icon="['fas', 'cog']" class="btn-icon" /> 高级选项
            </button>
          </div>
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
                <input ref="characterFileInput" type="file" accept=".txt,.json"
                  @change="handleFileSelection('character')" class="real-file-input" />
                <input type="text" :value="characterFileName || '未选择文件'" readonly class="text-input" />
                <button class="btn btn-outline" @click="$refs.characterFileInput.click()">浏览...</button>
              </div>
            </div>

            <div v-if="importOpeningText" class="form-group">
              <label>开头文本:</label>
              <div class="file-input">
                <input ref="openingFileInput" type="file" accept=".txt,.json" @change="handleFileSelection('opening')"
                  class="real-file-input" />
                <input type="text" :value="openingFileName || '未选择文件'" readonly class="text-input" />
                <button class="btn btn-outline" @click="$refs.openingFileInput.click()">浏览...</button>
              </div>
            </div>

            <div v-if="importOutline" class="form-group">
              <label>故事大纲:</label>
              <div class="file-input">
                <input ref="outlineFileInput" type="file" accept=".txt,.json" @change="handleFileSelection('outline')"
                  class="real-file-input" />
                <input type="text" :value="outlineFileName || '未选择文件'" readonly class="text-input" />
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
      <div class="message-bubble"
        :class="{ active: showMessage, success: messageType === 'success', error: messageType === 'error' }">
        <span>{{ messageContent }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { getAllTitles, readFile, writeFile, deletePath, renamePath } from './services/IndexedDBFileSystem';
import { gpt, gptDestroy } from './services/AiModelService';
import { processPrompt } from './services/PromptService'
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
        this.$emit('show-message', { title: "error", message: '保存配置失败' });
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
        this.$emit('show-message', { title: "error", message: '保存配置失败' });
      }
    },

    saveLanguage() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        config.剧情.language = this.language;
        this.saveConfig(config);
        this.$emit('show-message', { title: "success", message: `成功切换到语言：${this.language}` });
      } catch (error) {
        console.error('Failed to save language:', error);
        this.$emit('show-message', { title: "error", message: '保存配置失败' });
      }
    },

    saveStoryTitle() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        config.剧情.story_title = this.storyTitle;
        this.saveConfig(config);

        if (this.storyTitle) {
          this.$emit('show-message', { title: "success", message: `成功切换故事到${this.storyTitle}` });
        } else {
          this.$emit('show-message', { title: "success", message: '已选择空项，开始游戏将会创建新故事' });
        }
      } catch (error) {
        console.error('Failed to save story title:', error);
        this.$emit('show-message', { title: "error", message: '保存配置失败' });
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
        this.$emit('show-message', { title: "error", message: '保存配置失败' });
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
        this.$emit('show-message', { title: "error", message: '加载高级配置失败' });
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
        this.$emit('show-message', { title: "success", message: '高级配置保存成功' });
        this.showAdvancedOptionsDialog = false; // Close dialog on save
      } catch (error) {
        console.error('Failed to save advanced configuration:', error);
        this.$emit('show-message', { title: "error", message: '保存高级配置失败' });
      }
    },

    resetAdvancedConfig() {
      this.proxyUrl = this.defaultProxyUrl;
      this.proxyPassword = this.defaultProxyPassword;
      // Optionally save defaults immediately after reset, or wait for user to click Save
      // Let's save automatically for simplicity
      this.saveAdvancedConfig(); // This will save the defaults and close the dialog
      this.$emit('show-message', { title: "success", message: '高级配置已恢复默认值并保存' });
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
        indexToRemove = titles.indexOf('source');
        if (indexToRemove !== -1) {
          titles.splice(indexToRemove, 1);
        }
        this.storyNames = titles.sort();
      } catch (error) {
        console.error('Failed to load story list:', error);
        this.storyNames = [];
        this.$emit('show-message', { title: "error", message: '加载故事列表失败' });
      }
    },

    async renameStory() {
      if (!this.storyTitle) {
        this.$emit('show-message', { title: "error", message: '当前未选中故事' });
        return;
      }

      const newName = prompt('请输入新的故事名称:', this.storyTitle);

      if (!newName || newName.trim() === '' || newName === this.storyTitle) {
        if (newName && newName.trim() === '') {
          this.$emit('show-message', { title: "error", message: '故事名称不能为空' });
        }
        return;
      }

      try {
        // Check if new name already exists (case-insensitive check recommended)
        const titles = await getAllTitles();
        if (titles.map(t => t.toLowerCase()).includes(newName.trim().toLowerCase())) {
          this.$emit('show-message', { title: "error", message: '故事名称已存在' });
          return;
        }


        this.isLoading = true;
        this.loadingText = '正在重命名故事...';

        // Update localStorage config *before* DB operation in case DB fails? Or after?
        // Doing it after ensures the DB operation succeeded first.
        // Wait for DB operation
        await renamePath(`/data/${this.storyTitle}`, `${newName.trim()}`);

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
        this.$emit('show-message', { title: "success", message: '故事重命名成功' });
      } catch (error) {
        console.error('Failed to rename story:', error);
        this.isLoading = false;
        this.$emit('show-message', { title: "error", message: `重命名故事失败: ${error.message}` });
      }
    },

    async deleteStory() {
      if (!this.storyTitle) {
        this.$emit('show-message', { title: "error", message: '当前未选中故事' });
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
        this.$emit('show-message', { title: "success", message: '故事删除成功' });
      } catch (error) {
        console.error('Failed to delete story:', error);
        this.isLoading = false;
        this.$emit('show-message', { title: "error", message: `删除故事失败: ${error.message}` });
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
        this.$emit('show-message', { title: "error", message: '请输入故事名称' });
        return;
      }

      if (!this.importCharacterIntro && !this.importOpeningText && !this.importOutline) {
        this.$emit('show-message', { title: "error", message: '请至少选择一项导入内容' });
        return;
      }

      // Validate file selections for checked options
      if ((this.importCharacterIntro && !this.characterFile) ||
        (this.importOpeningText && !this.openingFile) ||
        (this.importOutline && !this.outlineFile)) {
        this.$emit('show-message', { title: "error", message: '请为所有选中的内容选择文件' });
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
        this.$emit('show-message', { title: "success", message: '故事导入成功！' });

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
        this.$emit('show-message', { title: "error", message: `导入故事失败: ${error.message}` });
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
      if (this.$refs.characterFileInput) this.$refs.characterFileInput.value = null;
      if (this.$refs.openingFileInput) this.$refs.openingFileInput.value = null;
      if (this.$refs.outlineFileInput) this.$refs.outlineFileInput.value = null;
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
        character_content: character_data ? String(character_data) : "",
        story_content: story_data ? String(story_data) : "",
        outline_content: outline_data ? String(outline_data) : "",
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
          this.$emit('show-message', { title: "success", message: 'GPT已尝试补全故事内容' });
        } else if (gptResult === "error") {
          this.$emit('show-message', { title: "error", message: 'GPT补全故事内容失败' });
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
            } catch (e) { /* not JSON, save as text */ }
            await writeFile(`/data/${title}/outline.json`, outlineContentToSave);
            saveSuccess = true;
            console.log("GPT generated outline data saved.");
          }

          if (needsStory && this.processStoryData(data.conversations || { conversations: data.story }) === "pass") {
            // GPT might return {conversations: [...]} or just {story: [...]} or just [...]
            // Try to normalize into { conversations: [...] }
            let storyJson = data.conversations || data.story;
            if (Array.isArray(storyJson)) storyJson = { conversations: storyJson };
            else if (storyJson && Array.isArray(storyJson.conversations)) {/* ok */ }
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

<style scoped>
/* Scoped styles for Home.vue */

/* Basic layout and spacing */
.home-container {
  padding: 2rem;
  display: flex;
  flex-direction: row;
  gap: 2rem;
  /* Space between main sections */
  min-height: calc(100vh - var(--header-height, 0px));
  /* Adjust if header height affects layout */
  background-color: var(--content-bg);
  color: var(--text-primary);
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

/* Header styles */
.header-section {
  text-align: center;
  margin-bottom: 1.5rem;
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.separator {
  width: 80%;
  max-width: 500px;
  margin: 1rem auto 0;
  border-bottom: 2px solid var(--primary-color);
}

/* Panel styles */
.settings-panel,
.content-panel {
  background-color: var(--sidebar-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--shadow);
  transition: background-color var(--transition-speed), border-color var(--transition-speed), box-shadow var(--transition-speed);
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  transition: color var(--transition-speed), border-color var(--transition-speed);
}

/* Settings Grid Layout */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  /* Responsive columns */
  gap: 2rem;
}

.settings-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  /* Space between setting items */
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px dashed var(--border-color);
  transition: border-color var(--transition-speed);
}

.setting-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.setting-label {
  font-size: 1rem;
  color: var(--text-primary);
  flex-shrink: 0;
  margin-right: 1rem;
  transition: color var(--transition-speed);
}

/* Custom Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 45px;
  height: 25px;
  flex-shrink: 0;
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
  background-color: var(--border-color);
  transition: all 0.3s ease;
  border-radius: 34px;
}

.toggle-label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 4px;
  bottom: 3.5px;
  background-color: white;
  transition: all 0.3s ease;
  border-radius: 50%;
}

input:checked+.toggle-label {
  background-color: var(--primary-color);
}

input:checked+.toggle-label:before {
  transform: translateX(20px);
}

/* Dropdown styles */
.dropdown {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--content-bg);
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
  outline: none;
  appearance: none;
  /* Remove default arrow */
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2C114.7L159.1%2C7.2c-7.5-7.5-19.8-7.5-27.3%2C0L5.1%2C114.7c-7.5%2C7.5-7.5%2C19.8%2C0%2C27.3l11.3%2C11.3c7.5%2C7.5%2C19.8%2C7.5%2C27.3%2C0l86.9-86.9v166.1c0%2C10.9%2C8.9%2C19.8%2C19.8%2C19.8h16c10.9%2C0%2C19.8-8.9%2C19.8-19.8V66.4l86.9%2C86.9c7.5%2C7.5%2C19.8%2C7.5%2C27.3%2C0l11.3-11.3C294.5%2C134.5%2C294.5%2C122.2%2C287%2C114.7z%22%2F%3E%3C%2Fsvg%3E');
  /* Custom arrow */
  background-repeat: no-repeat;
  background-position: right 10px top 50%;
  background-size: 12px auto;
  transition: border-color var(--transition-speed), background-color var(--transition-speed), color var(--transition-speed);
}

body.dark-theme .dropdown {
  /* Adjust arrow color for dark mode if needed, though using --text-secondary might be enough */
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23cbd5e1%22%20d%3D%22M287%2C114.7L159.1%2C7.2c-7.5-7.5-19.8-7.5-27.3%2C0L5.1%2C114.7c-7.5%2C7.5-7.5%2C19.8%2C0%2C27.3l11.3%2C11.3c7.5%2C7.5%2C19.8%2C7.5%2C27.3%2C0l86.9-86.9v166.1c0%2C10.9%2C8.9%2C19.8%2C19.8%2C19.8h16c10.9%2C0%2C19.8-8.9%2C19.8-19.8V66.4l86.9%2C86.9c7.5%2C7.5%2C19.8%2C7.5%2C27.3%2C0l11.3-11.3C294.5%2C134.5%2C294.5%2C122.2%2C287%2C114.7z%22%2F%3E%3C%2Fsvg%3E');
}

.dropdown:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
  /* Primary color with opacity */
}


/* Button Group styles */
.button-group {
  display: flex;
  gap: 0.5rem;
  /* Space between buttons */
  flex-wrap: wrap;
  /* Allow buttons to wrap on small screens */
  justify-content: flex-end;
}

.settings-column .button-group {
  margin-top: 1rem;
  /* Add space above buttons in settings */
}


/* Generic Button styles (using App.vue theme vars) */
.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  /* Space between icon and text */
  font-weight: 500;
}

.btn-icon {
  margin-right: 0.3rem;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn:active {
  transform: translateY(0);
  box-shadow: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Specific button variants */
.btn-outline {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
}

.btn-outline:hover {
  background-color: var(--btn-hover-bg);
  border-color: var(--btn-hover-bg);
  color: var(--text-primary);
  /* Or var(--primary-color); depending on desired hover */
}

body.dark-theme .btn-outline:hover {
  background-color: var(--btn-hover-bg);
  border-color: var(--btn-hover-bg);
  color: var(--text-primary);
}


.btn-success {
  background-color: var(--success-color);
  color: white;
}

.btn-success:hover {
  background-color: darken(var(--success-color), 5%);
  /* Placeholder, use a real darken function or define variable */
}

/* Manual darken example for dark mode */
body.dark-theme .btn-success:hover {
  background-color: #0b8c5f;
  /* Darker shade of #10b981 */
}


.btn-danger {
  background-color: var(--error-color);
  color: white;
}

.btn-danger:hover {
  background-color: darken(var(--error-color), 5%);
  /* Placeholder */
}

/* Manual darken example for dark mode */
body.dark-theme .btn-danger:hover {
  background-color: #c81e1e;
  /* Darker shade of #ef4444 */
}

.btn-large {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
}


/* Textarea styles */
.content-container {
  margin-bottom: 1rem;
  /* Space between textarea and hint */
}

.story-textarea {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
  line-height: 1.5;
  background-color: var(--content-bg);
  color: var(--text-primary);
  resize: vertical;
  /* Allow vertical resizing */
  outline: none;
  transition: border-color var(--transition-speed), background-color var(--transition-speed), color var(--transition-speed);
}

.story-textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
  /* Primary color with opacity */
}

.story-textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}


/* Action Button container */
.action-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
  transition: border-color var(--transition-speed);
}

.left-action,
.right-action {
  display: flex;
  align-items: center;
  gap: 1rem;
  /* Space between potential multiple buttons */
}


/* Modal styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  /* Semi-transparent black background */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  /* Ensure modal is on top */
  backdrop-filter: blur(5px);
  /* Optional blur effect */
}

.modal-content {
  background-color: var(--content-bg);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: var(--shadow);
  max-width: 500px;
  width: 90%;
  position: relative;
  color: var(--text-primary);
  transition: background-color var(--transition-speed), color var(--transition-speed), box-shadow var(--transition-speed);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  transition: border-color var(--transition-speed);
}

.modal-header h2 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: color var(--transition-speed);
}

.close-btn {
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 1rem;
  color: var(--text-primary);
  transition: color var(--transition-speed);
}

.text-input {
  padding: 0.6rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
  background-color: var(--content-bg);
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--transition-speed), background-color var(--transition-speed), color var(--transition-speed);
}

.text-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
}

.import-options {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  transition: border-color var(--transition-speed);
}

.import-options h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
  transition: color var(--transition-speed);
}

.checkbox-group {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-primary);
  transition: color var(--transition-speed);
}

.checkbox-label input[type="checkbox"] {
  margin-right: 0.5rem;
  /* Style checkboxes if needed, or rely on browser defaults/custom library */
}

.file-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.real-file-input {
  display: none;
  /* Hide the actual file input */
}

.file-input .text-input {
  flex-grow: 1;
  /* Make the text input fill space */
  cursor: pointer;
  /* Indicate it's interactive */
}


.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  transition: border-color var(--transition-speed);
}


/* Loading Overlay styles */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  /* Higher than modal */
  color: white;
}

.loading-spinner {
  border: 8px solid rgba(255, 255, 255, 0.3);
  border-top: 8px solid var(--primary-color);
  /* Primary color spinner */
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 1rem;
  font-size: 1.2rem;
  color: white;
}


/* Message Bubble styles (controlled by Vue component's state/props) */
/* Assuming App.vue handles the actual Toastification component rendering */
/* If this was a custom bubble component within Home.vue, styles would go here: */
/*
.message-bubble {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  background-color: var(--sidebar-bg); // Or a specific notification background color
  color: var(--text-primary);
  box-shadow: var(--shadow);
  z-index: 1500;
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.3s ease;
  max-width: 300px;
  pointer-events: none; // Don't block clicks when hidden
}

.message-bubble.active {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto; // Allow clicks when active
}

.message-bubble.success {
  border-left: 4px solid var(--success-color);
  // background-color: rgba(var(--success-color), 0.1); // Optional lighter background
}

.message-bubble.error {
  border-left: 4px solid var(--error-color);
   // background-color: rgba(var(--error-color), 0.1); // Optional lighter background
}
*/


/* Responsive adjustments */
@media (max-width: 768px) {
  .home-container {
    padding: 1rem;
    gap: 1.5rem;
  }

  .welcome-title {
    font-size: 2rem;
  }

  .panel-title {
    font-size: 1.3rem;
  }

  .settings-grid {
    grid-template-columns: 1fr;
    /* Stack columns on small screens */
    gap: 1.5rem;
  }

  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .setting-label {
    margin-right: 0;
    margin-bottom: 0.25rem;
    /* Space below label when stacked */
  }

  .toggle-switch,
  .dropdown {
    align-self: flex-end;
    /* Align input/switch to the right */
  }


  .button-group {
    flex-direction: column;
    /* Stack buttons vertically */
    gap: 0.75rem;
    justify-content: stretch;
    /* Stretch buttons to full width */
  }

  .button-group .btn {
    width: 100%;
  }

  .action-container {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .left-action,
  .right-action {
    width: 100%;
    justify-content: center;
    /* Center buttons within stacked actions */
    gap: 0.75rem;
  }

  .left-action .btn,
  .right-action .btn {
    width: 100%;
    justify-content: center;
    /* Center text/icon in full-width buttons */
  }

  .modal-content {
    padding: 1rem;
    width: 95%;
    /* Allow modal to be slightly wider on very small screens */
  }

  .modal-header h2 {
    font-size: 1.2rem;
  }

  .text-input,
  .dropdown,
  .story-textarea {
    font-size: 0.95rem;
  }
}
</style>