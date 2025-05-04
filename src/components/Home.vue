<template>
  <div>
    <!-- Header Section -->
    <div class="header-section">
      <h1 class="welcome-title">欢迎使用 AI Galgame 生成器</h1>
      <p class="welcome-subtitle">配置您的游戏并开始创作独一无二的互动故事吧！</p>
      <div class="separator"></div>
    </div>

    <div class="home-container">
      <!-- Left Panel: Game Settings -->
      <div class="panel settings-panel card">
        <h2 class="panel-title">
          <font-awesome-icon :icon="['fas', 'cogs']" /> 游戏设置
        </h2>
        <div class="settings-grid">
          <!-- Settings Group 1 -->
          <div class="settings-column">
            <!-- Outline Guide Switch - MODIFIED STRUCTURE -->
            <div class="setting-item">
              <!-- The label now wraps the text, tooltip, and the switch div -->
              <label class="setting-label tooltip-container switch-label-container">
                大纲指导生成:
                <span class="tooltip-text">是否启用大纲来指导后续内容的生成。</span>
                <!-- The switch div is now inside the label -->
                <div class="switch">
                  <!-- Input and span are inside the switch div -->
                  <!-- id and for attributes can be removed if input is inside label -->
                  <input type="checkbox" v-model="outlineSwitch" @change="saveOutlineSwitch" />
                  <span class="switch-slider"></span>
                </div>
              </label>
            </div>

            <!-- Language Selection -->
            <div class="setting-item">
              <label for="language-select" class="setting-label">游戏语言:</label>
              <select id="language-select" class="select setting-select" v-model="language" @change="saveLanguage">
                <option value="" disabled>-- 请选择语言 --</option>
                <option value="中文">中文</option>
                <option value="英文">英文</option>
                <option value="日文">日文</option>
              </select>
            </div>
          </div>

          <!-- Settings Group 2 -->
          <div class="settings-column">
            <!-- Story Selection -->
            <div class="setting-item">
              <label for="story-select" class="setting-label">选择或创建故事:</label>
              <select id="story-select" class="select setting-select" v-model="storyTitle" @change="saveStoryTitle">
                <option value="">-- 创建新故事 --</option>
                <option v-for="name in storyNames" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>

            <!-- Story Management Buttons -->
            <div class="setting-item button-group">
               <label class="setting-label">故事管理:</label>
               <div class="button-row">
                  <button class="btn btn-outline btn-sm" @click="renameStory" :disabled="!storyTitle" title="重命名当前选择的故事">
                    <font-awesome-icon :icon="['fas', 'pen-to-square']" />
                  </button>
                  <button class="btn btn-danger btn-sm" @click="deleteStory" :disabled="!storyTitle" title="删除当前选择的故事">
                    <font-awesome-icon :icon="['fas', 'trash-alt']" />
                  </button>
                  <button class="btn btn-secondary btn-sm" @click="showImportDialog = true" title="从本地文件导入故事">
                    <font-awesome-icon :icon="['fas', 'file-import']" />
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Story Content / Prompt -->
      <div class="panel content-panel card">
        <h2 class="panel-title">
          <font-awesome-icon :icon="['fas', 'scroll']" /> 故事生成提示
        </h2>
        <div class="content-container">
          <label for="story-prompt" class="input-label">输入故事设定、角色、初始情节等:</label>
          <textarea id="story-prompt" class="story-textarea input" v-model="outlineContent"
            placeholder="例如：\n故事背景：魔法与科技并存的浮空城市。\n主要角色：\n- 艾莉：乐观的机械师少女\n- 凯恩：失忆的神秘骑士\n情节提示：艾莉意外发现了凯恩，两人决定一起探索城市的秘密..."
            @blur="saveOutlineContent"></textarea>
        </div>
        <!-- Action Buttons -->
        <div class="action-container">
           <button class="btn btn-primary btn-lg start-game-btn" @click="startGame">
            <font-awesome-icon :icon="['fas', 'play']" /> 开始游戏
          </button>
          <button class="btn btn-outline" @click="openAdvancedOptionsDialog">
            <font-awesome-icon :icon="['fas', 'cog']" /> 高级选项
          </button>
        </div>
      </div>

      <!-- Import Dialog -->
      <div class="modal" v-if="showImportDialog" @click.self="showImportDialog = false">
        <div class="modal-content import-modal-content card">
          <div class="modal-header">
            <h3 class="modal-title">本地导入故事</h3>
            <button class="close-btn btn btn-text btn-sm" @click="showImportDialog = false" title="关闭">
              <font-awesome-icon :icon="['fas', 'times']" />
            </button>
          </div>
          <div class="modal-body">
            <!-- Story Name -->
            <div class="form-group">
              <label for="import-story-name" class="input-label">故事名称 <span class="required">*</span>:</label>
              <input type="text" id="import-story-name" v-model="importStoryName" class="input" placeholder="为导入的故事命名">
            </div>

            <!-- Content Selection - MODIFIED TO USE SWITCHES -->
            <div class="form-group import-options">
              <h4 class="import-options-title">选择导入内容 <span class="required">*</span></h4>
              <!-- Use a container for the switches -->
              <div class="import-switch-group">
                <!-- Each option is now a label wrapping the switch -->
                <label class="import-switch-label">
                  人物介绍:
                  <div class="switch">
                    <!-- Input remains type checkbox for the switch mechanism -->
                    <input type="checkbox" v-model="importCharacterIntro">
                    <!-- The visual slider -->
                    <span class="switch-slider"></span>
                  </div>
                </label>
                <label class="import-switch-label">
                  开头文本:
                  <div class="switch">
                    <input type="checkbox" v-model="importOpeningText">
                    <span class="switch-slider"></span>
                  </div>
                </label>
                <label class="import-switch-label">
                  故事大纲:
                  <div class="switch">
                    <input type="checkbox" v-model="importOutline">
                    <span class="switch-slider"></span>
                  </div>
                </label>
              </div>
               <p class="import-note">提示：至少选择一项。文件格式：.txt (按特定格式) 或 .json (按特定结构)。</p>
            </div>

            <!-- File Selectors -->
            <div v-if="importCharacterIntro" class="form-group">
              <label class="input-label">人物介绍文件:</label>
              <div class="file-input">
                <!-- Real file input is hidden -->
                <input ref="characterFileInput" type="file" accept=".txt,.json" @change="handleFileSelection('character')" class="real-file-input" id="char-file"/>
                 <!-- Display input is readonly -->
                <input type="text" :value="characterFileName || '未选择文件'" readonly class="input file-display-input" />
                 <!-- Label acts as the clickable button for the hidden input -->
                <label for="char-file" class="btn btn-outline btn-sm browse-btn">浏览...</label>
              </div>
            </div>

            <div v-if="importOpeningText" class="form-group">
              <label class="input-label">开头文本文件:</label>
              <div class="file-input">
                 <input ref="openingFileInput" type="file" accept=".txt,.json" @change="handleFileSelection('opening')" class="real-file-input" id="open-file"/>
                 <input type="text" :value="openingFileName || '未选择文件'" readonly class="input file-display-input" />
                <label for="open-file" class="btn btn-outline btn-sm browse-btn">浏览...</label>
              </div>
            </div>

            <div v-if="importOutline" class="form-group">
              <label class="input-label">故事大纲文件:</label>
              <div class="file-input">
                 <input ref="outlineFileInput" type="file" accept=".txt,.json" @change="handleFileSelection('outline')" class="real-file-input" id="outline-file"/>
                 <input type="text" :value="outlineFileName || '未选择文件'" readonly class="input file-display-input" />
                <label for="outline-file" class="btn btn-outline btn-sm browse-btn">浏览...</label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showImportDialog = false">取消</button>
            <button class="btn btn-primary" @click="confirmImport" :disabled="!canConfirmImport">
                <font-awesome-icon :icon="['fas', 'file-import']" /> 确认导入
            </button>
          </div>
        </div>
      </div>

      <!-- Advanced Options Dialog -->
      <div class="modal" v-if="showAdvancedOptionsDialog" @click.self="showAdvancedOptionsDialog = false">
        <div class="modal-content advanced-modal-content card">
          <div class="modal-header">
             <h3 class="modal-title">高级选项</h3>
            <button class="close-btn btn btn-text btn-sm" @click="showAdvancedOptionsDialog = false" title="关闭">
               <font-awesome-icon :icon="['fas', 'times']" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="proxy-url" class="input-label tooltip-container">
                跨域代理URL:
                 <span class="tooltip-text">用于解决API跨域问题的代理服务器地址。</span>
              </label>
              <input id="proxy-url" type="text" v-model="proxyUrl" class="input" placeholder="例如: http://localhost:5436/proxy">
            </div>
            <div class="form-group">
              <label for="proxy-pass" class="input-label tooltip-container">
                代理密码:
                 <span class="tooltip-text">如果代理服务器需要密码验证，请在此输入。</span>
              </label>
              <input id="proxy-pass" type="password" v-model="proxyPassword" class="input" placeholder="输入代理密码 (可选)">
            </div>
          </div>
          <div class="modal-footer">
             <button class="btn btn-warning" @click="resetAdvancedConfig">
              <font-awesome-icon :icon="['fas', 'arrows-rotate']" /> 恢复默认
            </button>
            <button class="btn btn-primary" @click="saveAdvancedConfig">
              <font-awesome-icon :icon="['fas', 'save']" /> 保存设置
            </button>
          </div>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" v-if="isLoading">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-text">{{ loadingText }}</div>
        </div>
      </div>

    </div>
    <!-- Removed local message bubble, assuming vue-toastification handles messages via $emit -->
  </div>
</template>

<script>
// --- Script remains exactly the same as before, no changes needed in logic ---
import { getAllTitles, readFile, writeFile, deletePath, renamePath } from './services/IndexedDBFileSystem';
import { gpt, gptDestroy } from './services/AiModelService';
import { processPrompt } from './services/PromptService';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
// Icons are added globally in main.js, so no need to add them here again.

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

      // Advanced Options Dialog (New)
      showAdvancedOptionsDialog: false,
      proxyUrl: 'http://127.0.0.1:5436/proxy',
      proxyPassword: 'defaultpassword',

      // Define default values for reset
      defaultProxyUrl: 'http://127.0.0.1:5436/proxy',
      defaultProxyPassword: 'defaultpassword',
    };
  },
  computed: {
    canConfirmImport() {
      if (!this.importStoryName.trim()) return false;
      if (!this.importCharacterIntro && !this.importOpeningText && !this.importOutline) return false;
      if (this.importCharacterIntro && !this.characterFile) return false;
      if (this.importOpeningText && !this.openingFile) return false;
      if (this.importOutline && !this.outlineFile) return false;
      return true;
    }
  },
  mounted() {
    this.loadStoryList();
    this.loadHomeConfig();
  },
  methods: {
    // --- All methods (loadHomeConfig, saveConfig, saveOutlineSwitch, ..., extractJson) ---
    // --- remain exactly as provided in the previous response ---
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
        }

        // Load advanced configuration
        if (config.高级配置) {
          this.proxyUrl = config.高级配置.proxyUrl || this.defaultProxyUrl;
          this.proxyPassword = config.高级配置.proxyPassword || this.defaultProxyPassword;
        } else {
          this.proxyUrl = this.defaultProxyUrl;
          this.proxyPassword = this.defaultProxyPassword;
        }
        // Ensure language has a default if empty after load
        if (!this.language) {
           this.language = ""; // Set to the disabled option value
        }

      } catch (error) {
        console.error('Failed to load configuration:', error);
        this.$emit('show-message', { title: "error", message: '加载配置失败，部分设置可能为默认值' });
        // Set defaults on error
        this.outlineSwitch = false;
        this.language = '';
        this.storyTitle = '';
        this.outlineContent = '';
        this.proxyUrl = this.defaultProxyUrl;
        this.proxyPassword = this.defaultProxyPassword;
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
        // Optional: Add success message
        // this.$emit('show-message', { title: "success", message: `大纲指导已${this.outlineSwitch ? '开启' : '关闭'}` });
      } catch (error) {
        console.error('Failed to save outline switch state:', error);
        this.$emit('show-message', { title: "error", message: '保存大纲开关状态失败' });
      }
    },

    saveLanguage() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        config.剧情.language = this.language;
        this.saveConfig(config);
        if (this.language) {
            this.$emit('show-message', { title: "success", message: `游戏语言已设置为：${this.language}` });
        }
      } catch (error) {
        console.error('Failed to save language:', error);
        this.$emit('show-message', { title: "error", message: '保存语言设置失败' });
      }
    },

    saveStoryTitle() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        config.剧情.story_title = this.storyTitle;
        this.saveConfig(config);

        if (this.storyTitle) {
          this.$emit('show-message', { title: "success", message: `已选择故事: ${this.storyTitle}` });
        } else {
          this.$emit('show-message', { title: "info", message: '未选择故事，开始游戏将创建新故事' });
        }
      } catch (error) {
        console.error('Failed to save story title:', error);
        this.$emit('show-message', { title: "error", message: '保存故事选择失败' });
      }
    },

    saveOutlineContent() {
      // Debounce this? Or just save on blur is fine.
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        config.剧情.outline_content_entry = this.outlineContent;
        this.saveConfig(config);
        // Maybe add a subtle indicator that it saved, rather than a toast.
      } catch (error) {
        console.error('Failed to save outline content:', error);
        this.$emit('show-message', { title: "error", message: '自动保存故事提示失败' });
      }
    },

    // --- Advanced Options Methods ---
    openAdvancedOptionsDialog() {
      this.loadAdvancedConfig(); // Load current config before showing
      this.showAdvancedOptionsDialog = true;
    },

    loadAdvancedConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (config.高级配置) {
          this.proxyUrl = config.高级配置.proxyUrl || this.defaultProxyUrl;
          this.proxyPassword = config.高级配置.proxyPassword || this.defaultProxyPassword;
        } else {
          this.proxyUrl = this.defaultProxyUrl;
          this.proxyPassword = this.defaultProxyPassword;
        }
      } catch (error) {
        console.error('Failed to load advanced configuration:', error);
        this.$emit('show-message', { title: "error", message: '加载高级配置失败' });
        this.proxyUrl = this.defaultProxyUrl;
        this.proxyPassword = this.defaultProxyPassword;
      }
    },

    saveAdvancedConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.高级配置) config.高级配置 = {};
        config.高级配置.proxyUrl = this.proxyUrl.trim(); // Trim whitespace
        config.高级配置.proxyPassword = this.proxyPassword; // Don't trim password
        this.saveConfig(config);
        this.$emit('show-message', { title: "success", message: '高级配置保存成功' });
        this.showAdvancedOptionsDialog = false;
      } catch (error) {
        console.error('Failed to save advanced configuration:', error);
        this.$emit('show-message', { title: "error", message: '保存高级配置失败' });
      }
    },

    resetAdvancedConfig() {
      this.proxyUrl = this.defaultProxyUrl;
      this.proxyPassword = this.defaultProxyPassword;
      this.saveAdvancedConfig(); // Save defaults automatically
      this.$emit('show-message', { title: "success", message: '高级配置已恢复默认值并保存' });
      // Keep dialog open for confirmation or close immediately? Let's close.
      // this.showAdvancedOptionsDialog = false; // saveAdvancedConfig already closes it
    },
    // --- End Advanced Options Methods ---


    // Story Management
    async loadStoryList() {
      try {
        let titles = await getAllTitles();
        // Filter out reserved names more robustly
        const reservedNames = ['test', 'source'];
        titles = titles.filter(title => !reservedNames.includes(title.toLowerCase()));
        this.storyNames = titles.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })); // Case-insensitive sort
      } catch (error) {
        console.error('Failed to load story list:', error);
        this.storyNames = [];
        this.$emit('show-message', { title: "error", message: '加载故事列表失败' });
      }
    },

   async renameStory() {
      if (!this.storyTitle) {
        this.$emit('show-message', { title: "warning", message: '请先选择一个要重命名的故事' });
        return;
      }

      const newName = prompt(`请输入新的故事名称 (原名: ${this.storyTitle}):`, this.storyTitle);

      if (!newName) { // User cancelled
          return;
      }
      const trimmedNewName = newName.trim();
      if (!trimmedNewName) {
          this.$emit('show-message', { title: "error", message: '故事名称不能为空' });
          return;
      }
      if (trimmedNewName === this.storyTitle) {
          this.$emit('show-message', { title: "info", message: '新名称与原名称相同' });
          return;
      }
       // Reserved name check
      const reservedNames = ['test', 'source'];
      if (reservedNames.includes(trimmedNewName.toLowerCase())) {
        this.$emit('show-message', { title: "error", message: `不能使用保留名称 "${trimmedNewName}"` });
        return;
      }

      this.isLoading = true;
      this.loadingText = '正在重命名故事...';

      try {
        const titles = await getAllTitles();
        if (titles.map(t => t.toLowerCase()).includes(trimmedNewName.toLowerCase())) {
          this.isLoading = false;
          this.$emit('show-message', { title: "error", message: `故事名称 "${trimmedNewName}" 已存在` });
          return;
        }

        await renamePath(`/data/${this.storyTitle}`, `${trimmedNewName}`);

        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (config.剧情 && config.剧情.story_title === this.storyTitle) {
          config.剧情.story_title = trimmedNewName;
          this.saveConfig(config);
        }

        this.storyTitle = trimmedNewName; // Update selection immediately
        await this.loadStoryList(); // Refresh list
        this.isLoading = false;
        this.$emit('show-message', { title: "success", message: `故事已重命名为 "${trimmedNewName}"` });

      } catch (error) {
        console.error('Failed to rename story:', error);
        this.isLoading = false;
        this.$emit('show-message', { title: "error", message: `重命名故事失败: ${error.message || '未知错误'}` });
        // Attempt to reload list in case of partial failure or state inconsistency
        await this.loadStoryList();
      }
    },

   async deleteStory() {
      if (!this.storyTitle) {
        this.$emit('show-message', { title: "warning", message: '请先选择一个要删除的故事' });
        return;
      }

      if (!confirm(`确定要永久删除故事 "${this.storyTitle}" 吗？\n此操作无法撤销！`)) {
        return;
      }

      this.isLoading = true;
      this.loadingText = '正在删除故事...';

      try {
        await deletePath(`/data/${this.storyTitle}`);

        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (config.剧情 && config.剧情.story_title === this.storyTitle) {
          config.剧情.story_title = ''; // Clear selection in config
          this.saveConfig(config);
        }

        this.storyTitle = ''; // Clear current selection
        await this.loadStoryList(); // Refresh list

        this.isLoading = false;
        this.$emit('show-message', { title: "success", message: `故事 "${this.storyTitle || '(已删除)'}" 删除成功` }); // Use old name in message as it's gone now

      } catch (error) {
        console.error('Failed to delete story:', error);
        this.isLoading = false;
        this.$emit('show-message', { title: "error", message: `删除故事失败: ${error.message || '未知错误'}` });
        // Refresh list even on error
         await this.loadStoryList();
      }
    },

    // Game Start
    startGame() {
      this.saveOutlineContent(); // Save latest prompt before starting

      let targetStoryTitle = this.storyTitle;

      if (!targetStoryTitle) {
          // No story selected, implies creating a new one.
          // The creation logic seems to happen *within* the /start page based on config.
          // We just need to ensure the config reflects the *intent* to create a new story.
          const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
          if (!config.剧情) config.剧情 = {};
          config.剧情.story_title = ''; // Explicitly set to empty for new story
          // Pass the current prompt content for the new story
          config.剧情.outline_content_entry = this.outlineContent;
          this.saveConfig(config);
          console.log("Starting game with intent to create a new story.");
          // Don't monitor here, let the /start page handle creation based on empty story_title
      } else {
           // Existing story selected, ensure it's saved in config
           const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
           if (!config.剧情) config.剧情 = {};
           config.剧情.story_title = targetStoryTitle;
           // Also save the current prompt potentially for this existing story? Or clear it?
           // Let's assume the prompt applies to the selected story too.
           config.剧情.outline_content_entry = this.outlineContent;
           this.saveConfig(config);
           console.log(`Starting game with selected story: ${targetStoryTitle}`);
      }


      // Open the start page in a new tab
      try {
         const startUrl = `${window.location.origin}/start`; // Or use Vue Router's resolve
         window.open(startUrl, '_blank');
         this.$emit('show-message', { title: "info", message: '游戏将在新标签页中打开...' });
      } catch (error) {
          console.error("Failed to open start URL:", error);
          this.$emit('show-message', { title: "error", message: '无法打开游戏页面' });
      }
    },

    // Removed monitorStoryTitle as the logic seems better handled by the /start page

    // File Import Handling
    handleFileSelection(type) {
      const fileInput = this.$refs[`${type}FileInput`];
      const file = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;

      switch (type) {
        case 'character':
          this.characterFile = file;
          this.characterFileName = file ? file.name : '';
          break;
        case 'opening':
          this.openingFile = file;
          this.openingFileName = file ? file.name : '';
          break;
        case 'outline':
          this.outlineFile = file;
          this.outlineFileName = file ? file.name : '';
          break;
      }
    },

    async confirmImport() {
       // Use computed property for basic validation check
      if (!this.canConfirmImport) {
           this.$emit('show-message', { title: "error", message: '请填写故事名称并为选中的内容选择文件' });
           return;
       }

      const title = this.importStoryName.trim();
      // Reserved name check
      const reservedNames = ['test', 'source'];
      if (reservedNames.includes(title.toLowerCase())) {
        this.$emit('show-message', { title: "error", message: `不能使用保留名称 "${title}"` });
        return;
      }


      this.isLoading = true;
      this.loadingText = '准备导入故事...';

      try {
        const titles = await getAllTitles();

        if (titles.map(t => t.toLowerCase()).includes(title.toLowerCase())) {
          if (!confirm(`故事 "${title}" 已存在。确定要覆盖它吗？`)) {
            this.isLoading = false;
            return;
          }
          this.loadingText = '正在删除旧故事...';
          await deletePath(`/data/${title}`).catch(e => console.warn("Failed to delete existing story before overwrite:", e));
        }

        this.loadingText = '正在读取文件...';
        const character_data = this.importCharacterIntro ? await this.readFileContent(this.characterFile) : null;
        const story_data = this.importOpeningText ? await this.readFileContent(this.openingFile) : null;
        const outline_data = this.importOutline ? await this.readFileContent(this.outlineFile) : null;

        this.loadingText = '正在处理和保存数据...';
        await this.loadLocalStory(title, character_data, story_data, outline_data, this.importOutline);

        // Update configuration to select the newly imported story
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        config.剧情.story_title = title;
        // Clear the prompt area after import? Or keep it? Let's clear it.
        config.剧情.outline_content_entry = '';
        this.saveConfig(config);

        // Update UI state
        this.storyTitle = title;
        this.outlineContent = ''; // Clear prompt area in UI
        await this.loadStoryList(); // Refresh story list

        // Reset import dialog state
        this.resetImportDialog();

        this.isLoading = false;
        this.$emit('show-message', { title: "success", message: `故事 "${title}" 导入成功！` });

        // Decide whether to auto-start (based on the status *after* potential GPT completion)
        // Re-check status from the saved config
        const postImportConfig = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        const statuses = postImportConfig?.剧情?.local_story || {};
        const charPass = statuses.character_status === 'pass';
        const outlinePass = statuses.outline_status === 'pass'; // This reflects the final status (checked AND valid content OR not checked)
        const storyPass = statuses.story_status === 'pass';

        // Auto-start conditions (Stricter: Require character + (outline or story))
        if (charPass && (outlinePass || storyPass)) {
          this.$emit('show-message', { title: "info", message: '导入数据完整，将在几秒后自动开始游戏...' });
          setTimeout(() => {
              // Ensure the title is still the one we imported before starting
              const currentConfig = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
              if (currentConfig?.剧情?.story_title === title) {
                  this.startGame();
              } else {
                 console.warn("Selected story changed after import, cancelling auto-start.");
                  this.$emit('show-message', { title: "warning", message: '故事选择已更改，取消自动开始' });
              }
          }, 3000); // 3 second delay
        } else {
            console.log("Imported data (potentially after GPT) may not be sufficient for auto-start.");
             this.$emit('show-message', { title: "info", message: '导入完成。您可能需要检查或补充内容。' });
        }

      } catch (error) {
        console.error('Failed to import story:', error);
        this.isLoading = false;
        this.$emit('show-message', { title: "error", message: `导入故事失败: ${error.message || '未知错误'}` });
        // Refresh list in case of partial changes
         await this.loadStoryList();
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
      // Reset file inputs visually by clearing their value
       if (this.$refs.characterFileInput) this.$refs.characterFileInput.value = null;
       if (this.$refs.openingFileInput) this.$refs.openingFileInput.value = null;
       if (this.$refs.outlineFileInput) this.$refs.outlineFileInput.value = null;
    },

    // File Reading Helper
    async readFileContent(file) {
       if (!file) return null; // Handle null file case
       return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => {
            console.error("File reading error:", error);
            reject(new Error(`无法读取文件 ${file.name}`));
        };
        reader.readAsText(file); // Assuming text files
       });
    },

    // Process and save story data to IndexedDB
    async loadLocalStory(title, character_data_raw, story_data_raw, outline_data_raw, outline_checkbox_checked) {
      let character_status = "null";
      let story_status = "null";
      let outline_content_status = "null"; // Status based purely on content validity

      // Process and potentially save Character Data
      if (character_data_raw !== null) {
        character_status = this.processCharacterData(character_data_raw);
        if (character_status === "pass") {
          const charJson = this.parseCharacterData(character_data_raw);
          if (Array.isArray(charJson)) {
            await writeFile(`/data/${title}/character.json`, charJson);
            console.log("Character data saved.");
          } else {
            console.warn("Processed character data was not array, status set to fail.");
            character_status = "fail"; // Correct status if parsing failed post-process check
          }
        } else {
            console.warn("Raw character data failed validation.");
        }
      }

      // Process and potentially save Story Data
      if (story_data_raw !== null) {
        story_status = this.processStoryData(story_data_raw);
        if (story_status === "pass") {
          const storyJson = this.parseStoryData(story_data_raw);
          if (storyJson && Array.isArray(storyJson.conversations)) {
             await writeFile(`/data/${title}/story/0.json`, storyJson);
             console.log("Story data saved.");
          } else {
            console.warn("Processed story data not in expected format, status set to fail.");
            story_status = "fail";
          }
        } else {
            console.warn("Raw story data failed validation.");
        }
      }

      // Process and potentially save Outline Data
      if (outline_data_raw !== null) {
        outline_content_status = this.processOutlineData(outline_data_raw); // Check content validity
        if (outline_content_status === "pass") {
            let outlineContentToSave = outline_data_raw;
            try { // Attempt to save as JSON if possible
                const jsonAttempt = JSON.parse(this.extractJson(outline_data_raw) || outline_data_raw);
                // Basic check if it's an object or non-empty array
                if (typeof jsonAttempt === 'object' && jsonAttempt !== null && (Array.isArray(jsonAttempt) ? jsonAttempt.length > 0 : Object.keys(jsonAttempt).length > 0)) {
                   outlineContentToSave = jsonAttempt;
                } else if (typeof jsonAttempt === 'object') {
                     // It's JSON but empty object/array, maybe save as text instead? Or keep as empty JSON? Let's keep JSON.
                     outlineContentToSave = jsonAttempt;
                }
            } catch (e) { /* Not JSON, save as text */ }
            await writeFile(`/data/${title}/outline.json`, outlineContentToSave);
            console.log("Outline data saved.");
        } else {
             console.warn("Raw outline data failed validation.");
        }
      }

       // Determine the final outline status for the config
       // Status = "pass" if (checkbox unchecked) OR (checkbox checked AND content was valid)
       // Status = "fail" if (checkbox checked AND content was invalid)
      const final_outline_status = outline_checkbox_checked
                                      ? (outline_content_status === "pass" ? "pass" : "fail")
                                      : "pass";


      // Save status to config *before* calling GPT
      const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
      if (!config.剧情) config.剧情 = {};
      config.剧情.local_story = {
        // Store raw content for potential reprocessing or display? Maybe too large. Let's skip raw content storage.
        // character_content: character_data_raw ? String(character_data_raw).substring(0, 500) : "", // Example: Store truncated
        // story_content: story_data_raw ? String(story_data_raw).substring(0, 500) : "",
        // outline_content: outline_data_raw ? String(outline_data_raw).substring(0, 500) : "",
        character_status: character_status,
        story_status: story_status,
        outline_status: final_outline_status // Use the combined status
      };
      this.saveConfig(config);

      // Check if GPT completion is needed
      // Needs completion if *any* required part failed validation
      const needsCompletion = (character_status !== "pass") ||
                              (story_status !== "pass") ||
                              (outline_checkbox_checked && outline_content_status !== "pass"); // Need outline only if checked and content failed


      if (needsCompletion) {
        this.loadingText = '基础数据不足或无效，尝试使用AI补全...';
        console.log("Attempting GPT generation for missing/invalid parts...");
        const gptResult = await this.useGptForImport(title,
           character_status === "pass" ? character_data_raw : null, // Pass valid raw data to GPT
           story_status === "pass" ? story_data_raw : null,
           (outline_checkbox_checked && outline_content_status === "pass") ? outline_data_raw : null, // Only pass outline if checked and valid initially
           outline_checkbox_checked // Let GPT know if outline was intended
           );

        if (gptResult === "success") {
          this.$emit('show-message', { title: "success", message: 'AI已尝试补全或修正故事内容' });
          // Re-fetch config to update status based on GPT result
           this.loadHomeConfig(); // This should reload the potentially updated local_story status
        } else if (gptResult === "error") {
          this.$emit('show-message', { title: "error", message: 'AI补全故事内容失败' });
        }
      } else {
          console.log("Imported data sufficient, skipping GPT completion.");
      }

      return "success"; // Overall import process succeeded structurally
    },

    // Helper function to parse text-based character data
    parseCharacterData(data) {
        if (!data) return [];
        if (typeof data === 'object') return Array.isArray(data) ? data : []; // Already parsed

        try {
            const trimmedText = String(data).trim();
            // Try parsing as JSON first
            if (trimmedText.startsWith('[') || trimmedText.startsWith('{')) {
                try {
                    const json = JSON.parse(this.extractJson(trimmedText) || trimmedText);
                    if (Array.isArray(json) && json.every(item => typeof item === 'object' && item !== null && typeof item.name === 'string')) {
                         return json; // Valid JSON array structure
                    }
                } catch (e) { /* Ignore JSON parse error, fallback to text */ }
            }

            // Fallback to text format: Name：Description
            const lines = trimmedText.split(/[\r\n]+/).filter(line => line.trim());
            const characters = [];
            for (const line of lines) {
                const parts = line.split(/[：:]/, 2); // Split by Chinese or English colon, max 2 parts
                if (parts.length === 2) {
                    const name = parts[0].trim();
                    const description = parts[1].trim();
                    if (name) {
                        characters.push({ name, description });
                    }
                }
            }
            return characters;
        } catch (error) {
            console.error("Error parsing character data:", error);
            return [];
        }
    },


    // Process character data (returns "pass" or "fail")
    processCharacterData(data) {
      const parsedData = this.parseCharacterData(data);
      // Pass if it's a non-empty array of objects with non-empty string 'name'
      return Array.isArray(parsedData) && parsedData.length > 0 &&
             parsedData.every(item => typeof item === 'object' && item !== null && typeof item.name === 'string' && item.name.trim() !== '')
             ? "pass" : "fail";
    },

    // Helper function to parse text-based story data
    parseStoryData(data) {
       if (!data) return { conversations: [] };
       if (typeof data === 'object') { // Already parsed
           if (Array.isArray(data)) return { conversations: data }; // Wrap array
           if (data && Array.isArray(data.conversations)) return data; // Correct structure
           return { conversations: [] };
       }

        try {
            const trimmedText = String(data).trim();
             // Try parsing as JSON first
            if (trimmedText.startsWith('[') || trimmedText.startsWith('{')) {
                 try {
                     const json = JSON.parse(this.extractJson(trimmedText) || trimmedText);
                     if (Array.isArray(json)) return { conversations: json }; // Wrap array
                     if (json && Array.isArray(json.conversations)) return json; // Correct structure
                 } catch (e) { /* Ignore JSON parse error, fallback to text */ }
            }

            // Fallback to text format: [Tag] Character：Text or just Text (Narrator)
            const lines = trimmedText.split(/[\r\n]+/).filter(line => line.trim());
            const conversations = [];
            const lineRegex = /^(?:\[(.*?)\]\s*)?(?:([^：:]+)[\s]*[：:]\s*)?(.*)$/;

            for (const line of lines) {
                const match = line.match(lineRegex);
                if (match) {
                     const tag = match[1]?.trim(); // Optional tag
                     const character = match[2]?.trim(); // Optional character
                     const text = match[3]?.trim(); // The rest is text

                     if (text || character) { // Only add if there's text or a character name
                         const conversation = {};
                         if (character) conversation.character = character;
                         if (text) conversation.text = text;
                         // Basic tag parsing (could be expanded)
                         if (tag) {
                             if (tag.toLowerCase() === 'bg') conversation.place = text; // Example: Treat [BG] differently
                             else if (tag.toLowerCase() === 'img') conversation.image = text; // Example: Treat [IMG] differently
                             else conversation.tag = tag; // Store other tags generically
                         }
                         // Ensure text exists, even if empty, if character is present
                         if (character && !conversation.text) {
                            conversation.text = "";
                         }
                         conversations.push(conversation);
                     }
                }
            }
            return { conversations };
        } catch (error) {
             console.error("Error parsing story text data:", error);
             return { conversations: [] };
        }
    },

    // Process story data (returns "pass" or "fail")
    processStoryData(data) {
      const parsedData = this.parseStoryData(data);
      // Pass if it's an object with a non-empty 'conversations' array
      return parsedData && Array.isArray(parsedData.conversations) && parsedData.conversations.length > 0 ? "pass" : "fail";
    },

    // Process outline data (returns "pass" or "fail")
    processOutlineData(data) {
      if (data === null || data === undefined) return "fail";
      // If it's a string, it must be non-empty after trimming
      if (typeof data === 'string') {
        return data.trim() !== '' ? "pass" : "fail";
      }
      // If it's an object (including arrays), check if it's "empty"
      if (typeof data === 'object') {
          if (Array.isArray(data)) return data.length > 0 ? "pass" : "fail";
          return Object.keys(data).length > 0 ? "pass" : "fail"; // Pass for non-empty objects
      }
      // Other types (number, boolean?) are likely invalid for outline
      return "fail";
    },


    // Use GPT to complete missing data
    async useGptForImport(title, character_data_valid_raw, story_data_valid_raw, outline_data_valid_raw, outline_was_checked) {
      try {
        // Determine precisely what GPT needs to generate
        const needsCharacter = character_data_valid_raw === null;
        const needsStory = story_data_valid_raw === null;
        // Need outline ONLY if user checked the box AND initial content was invalid/null
        const needsOutline = outline_was_checked && outline_data_valid_raw === null;

        if (!needsCharacter && !needsStory && !needsOutline) {
          console.log("GPT generation skipped: All required initial data was valid.");
          // Update status to reflect success *without* GPT intervention if needed
          // This path shouldn't normally be hit due to the check in loadLocalStory
          return "pass"; // Or maybe "skipped"?
        }

        // Prepare prompt data based on what's available *and* what's needed
        const promptData = {
          title: title,
          // Provide valid initial data to GPT for context
          character_content: character_data_valid_raw,
          story_content: story_data_valid_raw,
          outline_content: outline_data_valid_raw,
          // Tell GPT exactly what to generate
          needs: {
            character: needsCharacter,
            story: needsStory,
            outline: needsOutline,
          }
        };

        // Get processed prompts
        const [systemPrompt, userPrompt] = await processPrompt('本地导入', promptData);

        if (!systemPrompt || !userPrompt) {
          console.error("Failed to generate prompts for GPT import completion.");
          return "error";
        }

        const id = `gpt-import-${Date.now()}`; // Unique ID

        // Call GPT
        const gptResponse = await gpt(systemPrompt, userPrompt, '本地导入', id);

        if (gptResponse === 'over_times' || gptResponse === 'error' || !gptResponse) {
          console.error("GPT call failed or returned empty:", gptResponse);
          gptDestroy(id);
          return "error";
        }

        // Process the GPT response (expecting JSON)
        const jsonData = this.extractJson(gptResponse);
        if (!jsonData) {
          console.error("Could not extract JSON from GPT response:", gptResponse);
          gptDestroy(id);
          return "error";
        }

        let gptData;
        try {
          gptData = JSON.parse(jsonData);
        } catch (error) {
           console.error("Failed to parse JSON from GPT response:", error, jsonData);
           gptDestroy(id);
           return "error";
        }

        let savedSomething = false;
        let finalCharacterStatus = "null";
        let finalStoryStatus = "null";
        let finalOutlineContentStatus = "null"; // Status of content after GPT

        // --- Attempt to save GENERATED data ---
        if (needsCharacter) {
            const generatedCharData = gptData.character;
            finalCharacterStatus = this.processCharacterData(generatedCharData);
            if (finalCharacterStatus === "pass") {
                const charJson = this.parseCharacterData(generatedCharData);
                await writeFile(`/data/${title}/character.json`, charJson);
                console.log("GPT generated character data saved.");
                savedSomething = true;
            } else {
                 console.warn("GPT generated character data failed validation.");
                 finalCharacterStatus = "fail"; // Explicitly mark as fail
            }
        } else {
            finalCharacterStatus = "pass"; // Kept original valid data
        }

        if (needsOutline) { // Only save if needed
            const generatedOutlineData = gptData.outline;
            finalOutlineContentStatus = this.processOutlineData(generatedOutlineData);
            if (finalOutlineContentStatus === "pass") {
                let outlineContentToSave = generatedOutlineData;
                try { // Attempt to save as JSON if possible
                    const jsonAttempt = JSON.parse(this.extractJson(generatedOutlineData) || generatedOutlineData);
                     if (typeof jsonAttempt === 'object' && jsonAttempt !== null) {
                         outlineContentToSave = jsonAttempt;
                     }
                } catch(e) {/* ignore, save as text */}
                await writeFile(`/data/${title}/outline.json`, outlineContentToSave);
                console.log("GPT generated outline data saved.");
                savedSomething = true;
            } else {
                 console.warn("GPT generated outline data failed validation.");
                 finalOutlineContentStatus = "fail";
            }
        } else if (outline_was_checked) {
             finalOutlineContentStatus = "pass"; // Kept original valid outline data
        } else {
             finalOutlineContentStatus = "null"; // Outline wasn't needed/checked
        }


        if (needsStory) {
             // GPT might return {conversations: [...]} or just {story: [...]} or just [...] for story
             const generatedStoryData = gptData.conversations || gptData.story || gptData; // Try different keys or assume root is array
             finalStoryStatus = this.processStoryData(generatedStoryData);
             if (finalStoryStatus === "pass") {
                 const storyJson = this.parseStoryData(generatedStoryData); // Reparse to ensure structure
                 await writeFile(`/data/${title}/story/0.json`, storyJson);
                 console.log("GPT generated story data saved.");
                 savedSomething = true;
             } else {
                 console.warn("GPT generated story data failed validation.");
                 finalStoryStatus = "fail";
             }
        } else {
             finalStoryStatus = "pass"; // Kept original valid story data
        }

        // --- Update config status AGAIN, reflecting GPT results ---
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.剧情) config.剧情 = {};
        // Determine final outline status based on checkbox and *final* content status
         const finalOutlineStatusCombined = outline_was_checked
                                      ? (finalOutlineContentStatus === "pass" ? "pass" : "fail")
                                      : "pass";

        config.剧情.local_story = {
          character_status: finalCharacterStatus,
          story_status: finalStoryStatus,
          outline_status: finalOutlineStatusCombined
        };
        this.saveConfig(config);

        gptDestroy(id); // Clean up GPT instance

        return savedSomething ? "success" : "error"; // Success only if GPT actually generated and saved something valid

      } catch (error) {
        console.error("Error during GPT import completion process:", error);
        // Ensure cleanup if id was generated
         if (typeof id !== 'undefined') gptDestroy(id);
        return "error";
      }
    },


    // Helper to extract JSON from text
    extractJson(inputString) {
      if (typeof inputString !== 'string' || !inputString) return null;
      // Prioritize JSON within ```json ... ``` blocks
      const fencedJsonMatch = inputString.match(/```json\s*([\s\S]*?)\s*```/);
      if (fencedJsonMatch && fencedJsonMatch[1]) {
        try {
           // Validate the extracted JSON slightly
           JSON.parse(fencedJsonMatch[1]);
           return fencedJsonMatch[1];
        } catch(e) {
            console.warn("Invalid JSON inside fenced block, falling back.");
        }
      }

      // Fallback: Look for content between the first { and the last } or first [ and last ]
      // Be careful with nested structures if text surrounds the JSON.
      const firstBrace = inputString.indexOf('{');
      const firstBracket = inputString.indexOf('[');
      let startIndex = -1;

      if (firstBrace === -1 && firstBracket === -1) return null; // No JSON found

      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
          startIndex = firstBrace;
          const lastBrace = inputString.lastIndexOf('}');
          if (lastBrace > startIndex) {
              try {
                 JSON.parse(inputString.substring(startIndex, lastBrace + 1));
                 return inputString.substring(startIndex, lastBrace + 1);
              } catch(e) {/* Ignore parse error */}
          }
      } else if (firstBracket !== -1) {
           startIndex = firstBracket;
           const lastBracket = inputString.lastIndexOf(']');
           if (lastBracket > startIndex) {
               try {
                 JSON.parse(inputString.substring(startIndex, lastBracket + 1));
                 return inputString.substring(startIndex, lastBracket + 1);
               } catch(e) {/* Ignore parse error */}
           }
      }

       console.warn("Could not reliably extract JSON from string:", inputString.substring(0, 100) + "...");
       // As a last resort, return the whole string if it looks like it starts with JSON
       const trimmed = inputString.trim();
       if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;

       return null; // Give up
    },

  }
};
</script>

<style scoped>
/* Use scoped styles for component-specific adjustments and layout */

/* Header Section */
.header-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.welcome-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.welcome-subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
}

/* Main Layout Container */
.home-container {
  display: flex;
  flex-wrap: wrap; /* Allow panels to stack on smaller screens */
  gap: 24px; /* Space between panels */
}

/* Panels (Settings and Content) */
.panel {
  flex: 1 1 calc(50% - 12px); /* Flex basis for two columns minus half the gap */
  min-width: 320px; /* Minimum width before stacking */
  display: flex;
  flex-direction: column;
  /* Card styles are applied globally via .card class */
}

.panel-title {
  font-size: 1.3rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 8px; /* Space between icon and text */
}

/* Settings Panel Specifics */
.settings-grid {
  display: flex;
  flex-wrap: wrap; /* Allow columns to stack if needed */
  gap: 20px;
}

.settings-column {
  flex: 1;
  min-width: 240px; /* Minimum width for a settings column */
  display: flex;
  flex-direction: column;
  gap: 18px; /* Space between setting items */
}

/* Setting Item - Basic */
.setting-item {
  display: flex;
  flex-wrap: wrap; /* Allow label and control to stack on very narrow */
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.setting-label {
  color: var(--text-secondary);
  font-size: 0.95rem;
  flex-shrink: 0; /* Prevent label from shrinking too much */
}

/* MODIFIED: Style for the label that contains the switch */
.switch-label-container {
  display: flex; /* Make the label itself a flex container */
  align-items: center;
  justify-content: space-between; /* Distribute its contents (text and switch) */
  flex-grow: 1; /* Allow the label to take available width in the setting-item */
  cursor: pointer; /* Indicate the whole label is clickable */
}

.setting-select {
  /* Select gets global .select style, add width constraints if needed */
  /* max-width: 200px; */
   flex-grow: 1; /* Allow select to take available space */
}


/* Button Group Styles */
.button-group {
  align-items: flex-start; /* Align label to top */
}
.button-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap; /* Allow buttons to wrap */
    justify-content: flex-end; /* Align buttons to the right */
    flex-grow: 1;
}

.button-group .btn-sm {
   padding: 5px 10px; /* Slightly adjust small button padding */
}

/* Content Panel Specifics */
.content-container {
  flex-grow: 1; /* Allow textarea container to fill space */
  display: flex;
  flex-direction: column;
}

.story-textarea {
  /* Input gets global .input style */
  min-height: 250px; /* Make textarea taller */
  flex-grow: 1; /* Allow textarea to grow */
  resize: vertical;
  font-size: 0.95rem;
  line-height: 1.6;
}

.action-container {
  display: flex;
  justify-content: space-between; /* Push buttons to ends */
  align-items: center;
  margin-top: 20px;
  flex-wrap: wrap; /* Wrap buttons on small screens */
  gap: 10px;
}

.start-game-btn {
  min-width: 150px; /* Give start button more prominence */
}


/* Modal Styles (Scoped) */
.modal {
  position: fixed;
  inset: 0; /* top, right, bottom, left = 0 */
  background-color: rgba(0, 0, 0, 0.6); /* Darker overlay */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050; /* Ensure modal is on top */
  padding: 15px; /* Padding for small screens */
  overflow-y: auto; /* Enable scrolling on the overlay if content overflows */
}

.modal-content {
  /* Card styles applied globally */
  width: 100%;
  max-width: 600px; /* Default max width */
  max-height: 90vh; /* Limit height */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent content overflow, rely on modal-body scroll */
}

.import-modal-content {
   max-width: 700px; /* Wider modal for import */
}
.advanced-modal-content {
   max-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 15px;
  margin-bottom: 20px;
  padding-right: 0; /* Adjust padding if close button overlaps */
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin: 0;
}

.modal-body {
  overflow-x:hidden;
  overflow-y: auto; /* Enable scrolling only for the body */
  padding-right: 10px; /* Add padding to prevent scrollbar overlap */
  margin-right: -10px; /* Compensate for padding */
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

/* Form Elements inside Modal */
.form-group {
  margin-bottom: 20px;
}

.form-group .input-label {
  margin-bottom: 8px;
  font-weight: 500;
}

.required {
  color: var(--danger-color);
  margin-left: 4px;
}

/* Import Specifics */
.import-options-title {
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 10px;
    color: var(--text-secondary);
}
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.import-note {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    margin-top: 10px;
}

/* File Input Styling */
.file-input {
  display: flex;
  align-items: center;
  gap: 10px;
}

.real-file-input {
  /* Hide the actual file input */
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  z-index: -1;
}

.file-display-input {
  flex-grow: 1;
  cursor: default; /* Indicate it's not directly editable */
  background-color: var(--background-color) !important; /* Override potential focus styles */
}

.browse-btn {
  /* Uses .btn .btn-outline .btn-sm */
  white-space: nowrap;
  cursor: pointer; /* Ensure label acts like a button */
}


/* Loading Overlay */
.loading-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(var(--background-color-rgb, 255, 255, 255), 0.8); /* Use background color with opacity */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000; /* Highest z-index */
  backdrop-filter: blur(2px);
}
.dark-theme .loading-overlay {
   background-color: rgba(var(--background-color-rgb, 18, 18, 18), 0.8);
}

.loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    background-color: var(--surface-color);
    padding: 30px 40px;
    border-radius: var(--border-radius-lg);
    box-shadow: var(--box-shadow-hover);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: var(--text-primary);
  font-weight: 500;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}




/* Responsive Adjustments */
@media (max-width: 768px) {
  .home-container {
    flex-direction: column; /* Stack panels vertically */
    gap: 20px;
  }

  .panel {
    flex-basis: auto; /* Reset flex-basis when stacked */
    min-width: 0; /* Reset min-width */
  }

  .action-container {
     justify-content: center; /* Center buttons when stacked */
  }

   .modal-content {
     max-width: 95%; /* Allow modal to use more width */
     max-height: 85vh;
   }
}

</style>