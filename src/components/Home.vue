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
              <span class="btn-icon">🖋</span> 故事改名
            </button>
            <button 
              class="btn btn-danger"
              @click="deleteStory"
              :disabled="!storyTitle"
            >
              <span class="btn-icon">🗑</span> 删除故事
            </button>
            <button 
              class="btn btn-outline"
              @click="showImportDialog = true"
            >
              <span class="btn-icon">📤</span> 本地导入
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
          <span class="btn-icon">▶</span> 开始游戏
        </button>
      </div>
      <div class="right-action">
        <button 
          class="btn btn-outline"
          @click="showAdvancedOptions"
        >
          <span class="btn-icon">⚙️</span> 高级选项
        </button>
      </div>
    </div>

    <!-- Import Dialog -->
    <div class="modal" v-if="showImportDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h2>本地导入故事</h2>
          <span class="close-btn" @click="showImportDialog = false">&times;</span>
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

export default {
  name: 'Home',
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
      messageTimeout: null
    };
  },
  mounted() {
    this.loadStoryList();
    // Load saved configurations
    this.loadHomeConfig();
    
    // Load available stories from IndexedDB
  },
  methods: {
    // Configuration Management
    async loadHomeConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (config.剧情) {
          this.outlineSwitch = config.剧情.if_on || false;
          this.language = config.剧情.language || '';
          this.storyTitle = config.剧情.story_title || '';
          this.outlineContent = config.剧情.outline_content_entry || '';
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    },
    
    saveConfig() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (!config.剧情) {
          config.剧情 = {};
        }
        
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
      } catch (error) {
        console.error('Failed to save configuration:', error);
        this.$emit('show-message', { title: "error", message: '保存配置失败'});
      }
    },
    
    saveOutlineSwitch() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (!config.剧情) {
          config.剧情 = {};
        }
        
        config.剧情.if_on = this.outlineSwitch;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
      } catch (error) {
        console.error('Failed to save outline switch state:', error);
        this.$emit('show-message', { title: "error", message: '保存配置失败'});
      }
    },
    
    saveLanguage() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (!config.剧情) {
          config.剧情 = {};
        }
        
        config.剧情.language = this.language;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        this.$emit('show-message', { title: "success", message: `成功切换到语言：${this.language}`});
      } catch (error) {
        console.error('Failed to save language:', error);
        this.$emit('show-message', { title: "error", message: '保存配置失败'});
      }
    },
    
    saveStoryTitle() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        if (!config.剧情) {
          config.剧情 = {};
        }
        
        config.剧情.story_title = this.storyTitle;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
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
        
        if (!config.剧情) {
          config.剧情 = {};
        }
        
        config.剧情.outline_content_entry = this.outlineContent;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
      } catch (error) {
        console.error('Failed to save outline content:', error);
        this.$emit('show-message', { title: "error", message: '保存配置失败'});
      }
    },
    
    // Story Management
    async loadStoryList() {
      try {
        // Get titles from IndexedDB
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
      
      if (!newName || newName === this.storyTitle) {
        return;
      }
      
      try {
        // Check if new name already exists
        const titles = await getAllTitles();
        if (titles.includes(newName)) {
          this.$emit('show-message', { title: "error", message: '故事名称已存在'});
          return;
        }
        
        this.isLoading = true;
        this.loadingText = '正在重命名故事...';
        
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (config.剧情 && config.剧情.story_title === this.storyTitle) {
          config.剧情.story_title = newName;
          localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        }
        await renamePath(`/data/${this.storyTitle}`,`${newName}`)
        // Update current selection and refresh list
        this.storyTitle = newName;
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
        
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (config.剧情 && config.剧情.story_title === this.storyTitle) {
          config.剧情.story_title = '';
          localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        }
        
        // Update current selection and refresh list
        await deletePath(`/data/${this.storyTitle}`);
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
      if (window.location.href.includes('/home')) {
        window.location.href = window.location.href.replace('/home', '/start');
      } else {
        // Open start.vue in a new tab
        const startUrl = `${window.location.origin}/start`;
        window.open(startUrl, '_blank');
      }
    },
    
    monitorStoryTitle() {
      // Check for story title changes in config
      const intervalId = setInterval(() => {
        try {
          const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
          const newStoryTitle = config.剧情?.story_title || '';
          
          if (newStoryTitle && newStoryTitle !== this.storyTitle) {
            this.storyTitle = newStoryTitle;
            this.loadStoryList();
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('Error monitoring story title:', error);
          clearInterval(intervalId);
        }
      }, 5000); // Check every 5 seconds
      
      // Clear interval after 3 minutes to prevent memory leaks
      setTimeout(() => {
        clearInterval(intervalId);
      }, 180000);
    },
    
    // Advanced Options
    showAdvancedOptions() {
      alert('高级选项功能尚未实现');
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
        
        if (titles.includes(title)) {
          if (!confirm(`故事"${title}"已存在，是否覆盖？`)) {
            this.isLoading = false;
            return;
          }
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
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        
        // Update current story title and refresh list
        this.storyTitle = title;
        await this.loadStoryList();
        
        // Reset import dialog
        this.resetImportDialog();
        
        this.isLoading = false;
        this.$emit('show-message', { title: "success", message: '故事导入成功！'});
        
        // Redirect to game if appropriate
        if ((character_data && this.processCharacterData(character_data) === 'pass' && outline_data && this.importOutline) ||
            (character_data && this.processCharacterData(character_data) === 'pass' && story_data && this.processStoryData(story_data) === 'pass')) {
          setTimeout(() => {
            this.startGame();
          }, 1000);
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
    async loadLocalStory(title, character_data, story_data, outline_data, outline_status) {
      // Status tracking
      let character_status = "null";
      let story_status = "null";
      let outline_status_str = "null";
      
      // Process character data
      if (character_data) {
        character_status = this.processCharacterData(character_data);
        
        if (character_status === "pass") {
          // Save character data to IndexedDB
          await writeFile(`/data/${title}/character.json`, 
            typeof character_data === 'string' ? JSON.parse(character_data || '[]') : character_data);
        }
      }
      
      // Process story data
      if (story_data) {
        story_status = this.processStoryData(story_data);
        
        if (story_status === "pass") {
          // Create story directory structure
          let processedData = typeof story_data === 'string' ? 
            JSON.parse(this.extractJson(story_data) || '{"conversations": []}') : story_data;
          
          // Ensure conversations is present
          if (!processedData.conversations && Array.isArray(processedData)) {
            processedData = { conversations: processedData };
          }
          
          // Save story data to IndexedDB
          await writeFile(`/data/${title}/story/0.json`, processedData);
        }
      }
      
      // Process outline data
      if (outline_data) {
        outline_status_str = outline_data.trim() ? "pass" : "fail";
        
        if (outline_status_str === "pass") {
          try {
            // Try to parse as JSON
            let outlineJson = JSON.parse(this.extractJson(outline_data) || outline_data);
            await writeFile(`/data/${title}/outline.json`, outlineJson);
          } catch (e) {
            // If not JSON, save as text
            await writeFile(`/data/${title}/outline.json`, outline_data);
          }
        }
      }
      
      // Set outline status based on checkbox
      if (outline_status) {
        if (outline_status_str === "null" || outline_status_str === "fail") {
          outline_status_str = "fail";
        }
      } else {
        outline_status_str = "pass";
      }
      
      // Update config with import status
      const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
      if (!config.剧情) config.剧情 = {};
      
      // Store local story import status
      config.剧情.local_story = {
        character_content: character_data ? String(character_data): "",
        story_content: story_data ? String(story_data): "",
        outline_content: outline_data ? String(outline_data): "",
        character_status: character_status,
        stroy_status: story_status, // Note: keeping the typo for compatibility
        outline_status: outline_status_str
      };
      
      localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
      
      // Create placeholder file to indicate story is ready
      await writeFile(`/data/${title}/zw`, "");
      
      // If data is insufficient, try using GPT to generate missing content
      if (!((character_status === "pass" && outline_status_str === "pass" && outline_data) || 
            (character_status === "pass" && story_status === "pass"))) {
        await this.useGptForImport(title, character_data, story_data, outline_data);
      }
      
      return "success";
    },
    
    // Process character data
    processCharacterData(data) {
      try {
        // Try to parse as JSON if it's a string
        let parsedData = typeof data === 'string' ? JSON.parse(data || data) : data;
        console.log(parsedData)
        // Check if it's a valid character array
        if (Array.isArray(parsedData) && 
            parsedData.length > 0 && 
            parsedData.every(item => typeof item === 'object' && item.name)) {
          return "pass";
        }}catch (error) {
          console.log('not json')}

        try{
        // If not an array, check for text format with name：description pattern
        if (typeof data === 'string') {
          const lines = data.split('\n').filter(line => line.trim());
          if (lines.length > 0 && lines.every(line => line.includes('：'))) {
            return "pass";
          }
        }}catch (error) {
        console.error("Error processing character data:", error);
        return "fail";
        
       
      }
    },
    
    // Process story data
    processStoryData(data) {
      try {
        // Try to parse as JSON if it's a string
        let parsedData = typeof data === 'string' ? JSON.parse(this.extractJson(data) || data) : data;
        
        // Check if it has conversations or is an array of conversation items
        if ((parsedData.conversations && Array.isArray(parsedData.conversations)) || 
            (Array.isArray(parsedData) && 
             parsedData.length > 0 && 
             parsedData.every(item => typeof item === 'object' && 
                              (('place' in item || 'character' in item || 'text' in item))))) {
          return "pass";
        }
      }catch (error) {
        console.log('not json')}

        
        try {
        // Check for text format with character：text pattern
        if (typeof data === 'string') {
          const lines = data.split('\n').filter(line => line.trim());
          let valid = true;
          
          for (const line of lines) {
            // Remove anything in brackets
            const lineStripped = line.replace(/\[.*?\]/g, '');
            if (!lineStripped.includes('：')) {
              valid = false;
              break;
            }
          }
          
          if (valid && lines.length > 0) {
            return "pass";
          }
        }
      }catch (error){
        console.error("Error processing story data:", error);
        return "fail";}
       
      
    },
    
    // Use GPT to complete missing data
    async useGptForImport(title, character_data, story_data, outline_data) {
      try {
        // Extract GPT-friendly data
        const [prompt1,prompt2] = await processPrompt('本地导入');

        // Generate a random ID for the GPT request
        const id = Math.floor(Math.random() * 100000) + 1;
        
        // Call GPT
        const gptResponse = await gpt(prompt1, prompt2, '本地导入', id);
        
        if (gptResponse === 'over_times' || gptResponse === 'error') {
          console.error("GPT处理失败");
          return;
        }
        
        // Process the GPT response
        const jsonData = this.extractJson(gptResponse);
        if (!jsonData) {
          console.error("无法从GPT响应中提取JSON");
          return;
        }
        
        try {
          const data = JSON.parse(jsonData);
          
          // Save the generated data
          if (data.character) {
            await writeFile(`/data/${title}/character.json`, data.character);
          }
          
          if (data.outline) {
            await writeFile(`/data/${title}/outline.json`, data.outline);
          }
          
          if (data.conversations) {
            await writeFile(`/data/${title}/story/0.json`, { conversations: data.conversations });
          }
          
          // Clean up GPT instance
          gptDestroy(id);
          
          return "success";
        } catch (error) {
          console.error("处理GPT响应失败:", error);
          return "error";
        }
      } catch (error) {
        console.error("GPT处理失败:", error);
        return "error";
      }
    },
    
    // Helper to extract JSON from text
    extractJson(inputString) {
      if (!inputString) return null;
      
      try {
        const startIndex = inputString.indexOf('{');
        const endIndex = inputString.lastIndexOf('}');
        
        if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
          return null;
        }
        
        return inputString.substring(startIndex, endIndex + 1);
      } catch (error) {
        console.error("提取JSON失败:", error);
        return null;
      }
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

.btn-icon {
  margin-right: 0.5rem;
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

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--modal-bg);
  border-radius: 0.75rem;
  width: 100%;
  max-width: 1000px;
  max-height: 95vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  transition: background-color 0.3s;
}

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
  justify-content: flex-end;
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
  }
  
  .welcome-title {
    font-size: 1.5rem;
  }
  
  .modal-content {
    width: 95%;
    max-width: none;
  }
}
</style>