<template>
  <div class="export-story">

    <main>
      <div class="content-wrapper">
        <!-- Story Choice Tree -->
        <section class="choice-tree-section">
          <h2>故事选择树</h2>
          <div class="tree-container">
            <div v-if="isLoading" class="loading-indicator">
              <div class="spinner"></div>
              <p>正在加载故事结构...</p>
            </div>
            <div v-else-if="errorMessage" class="error-message">
              <i class="fas fa-exclamation-circle"></i>
              <p>{{ errorMessage }}</p>
            </div>
            <div v-else>

              <ul class="tree">
                <story-node 
                  :node="rootNode" 
                  :depth="0"
                  @view="viewStory"
                  @export="prepareExport"
                />
              </ul>
            </div>
          </div>
        </section>

        <!-- Preview Panel -->
        <section class="preview-section" :class="{ active: selectedStory }">
          <div class="preview-header">
            <h2>故事预览</h2>
            <div class="format-controls">
              <button 
                v-for="format in previewFormats" 
                :key="format.id"
                :class="['format-btn', { active: currentPreviewFormat === format.id }]"
                @click="currentPreviewFormat = format.id"
              >
                {{ format.name }}
              </button>
            </div>
            <button class="close-btn" @click="selectedStory = null" aria-label="Close preview">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="preview-body">
            <div v-if="!selectedStory" class="no-selection">
              <i class="fas fa-book-open"></i>
              <p>请从故事树中选择一个节点预览</p>
            </div>
            <div v-else>
              <div class="story-meta">
                <span class="story-id">ID: {{ selectedStory.id }}</span>
                <span v-if="storyIdChain.length > 1" class="story-path">
                  路径: {{ storyIdChain.join(' → ') }}
                </span>
              </div>
              
              <!-- Text Preview -->
              <div v-if="currentPreviewFormat === 'text'" class="preview-text">
                <pre>{{ formattedStoryText }}</pre>
              </div>
              
              <!-- HTML Preview -->
              <div v-else-if="currentPreviewFormat === 'html'" class="preview-html">
                <div class="html-story" v-html="formattedStoryHtml"></div>
              </div>
              
              <!-- JSON Preview -->
              <div v-else-if="currentPreviewFormat === 'json'" class="preview-json">
                <pre>{{ formattedStoryJson }}</pre>
              </div>
            </div>
          </div>
          
          <div v-if="selectedStory" class="preview-footer">
            <div class="export-options">
              <div class="include-previous-toggle">
                <label class="toggle-switch">
                  <input type="checkbox" v-model="includePreviewContent">
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label1">包含上文内容</span>
              </div>
              
              <div class="export-buttons">
                <button 
                  v-for="format in exportFormats"
                  :key="format.id"
                  class="export-btn"
                  :class="format.class"
                  @click="exportStory(format.id)"
                >
                  <i :class="format.icon"></i> {{ format.name }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Notification -->
    <div 
      v-if="notification.show" 
      :class="['notification', notification.type]"
    >
      <i :class="notification.icon"></i>
      {{ notification.message }}
    </div>

    <!-- Loading Overlay -->
    <div v-if="isExporting" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p>{{ exportingMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { readFile, listDirectory } from './services/IndexedDBFileSystem';
import StoryNode from './ExportStory_StoryNode.vue';
import { traceIdChain } from './services/ChoiceManager'

export default {
  name: 'ExportStory',
  components: {
    StoryNode
  },
  props: {
    storyTitle: {
      type: String,
      required: true // 标记为必需，父组件必须传递
    }
  },
  data() {
    return {
      // User info
      
      // Loading states
      isLoading: true,
      isExporting: false,
      exportingMessage: '',
      errorMessage: '',
      
      choiceData: {},
      storyContents: {}, // Cache for story contents
      rootNode: null,
      
      // Preview data
      selectedStory: null,
      currentPreviewFormat: 'html',
      includePreviewContent: false,
      storyIdChain: [],
      
      // UI configurations
      previewFormats: [
        { id: 'text', name: '文本' },
        { id: 'html', name: 'HTML' },
        { id: 'json', name: 'JSON' }
      ],
      exportFormats: [
        { id: 'text', name: '导出文本', class: 'text-btn', icon: 'fas fa-file-alt' },
        { id: 'html', name: '导出HTML', class: 'html-btn', icon: 'fas fa-file-code' },
        { id: 'json', name: '导出JSON', class: 'json-btn', icon: 'fas fa-file-code' }
      ],
      
      // Notification
      notification: {
        show: false,
        message: '',
        type: 'info',
        icon: 'fas fa-info-circle',
        timer: null
      }
    };
  },
  computed: {
    formattedStoryText() {
      if (!this.selectedStory) return '';
      
      const conversations = this.getStoryConversations();
      if (!conversations || !Array.isArray(conversations)) {
        return '无法加载故事内容';
      }
      
      return conversations.map(conv => {
        const character = conv.character || '';
        const text = conv.text || '';
        const place = conv.place || '';
        
        const prefix = character ? `${character}：` : '旁白：';
        const suffix = place ? ` [${place}]` : '';
        
        return `${prefix}${text}${suffix}`;
      }).join('\n');
    },
    
    formattedStoryHtml() {
      if (!this.selectedStory) return '';
      
      const conversations = this.getStoryConversations();
      if (!conversations || !Array.isArray(conversations)) {
        return '<p class="error">无法加载故事内容</p>';
      }
      
      let currentPlace = null;
      let currentCharacter = null;
      let result = '';
      
      
      for (let i = 0; i < conversations.length; i++) {
        const conv = conversations[i];
        const character = conv.character || '';
        const text = conv.text || '';
        const place = conv.place || '';
        
        // Add place as a section divider if it's new
        if (place && place !== currentPlace) {
          currentPlace = place;
          result += `
            <div class="story-place">
              <h3>${this.escapeHtml(place)}</h3>
              <div class="place-divider"></div>
            </div>
          `;
        }
        
        // Handle narration (no character)
        if (!character) {
          result += `
            <div class="story-narration">
              <p class="narration-text">${this.formatDialogText(text)}</p>
            </div>
          `;
          continue;
        }
        
        // Handle character dialog
        // For character change, create a new character section
        if (character !== currentCharacter) {
          currentCharacter = character;
          result += `
            <div class="character-section">
              <div class="character-name">${this.escapeHtml(character)}</div>
          `;
        }
        
        // Add dialog for current character
        result += `
          <div class="dialog-bubble">
            ${this.formatDialogText(text)}
          </div>
        `;
        
        // Check if next conversation has a different character or is narration
        // If so, close the current character section
        const nextConv = i + 1 < conversations.length ? conversations[i + 1] : null;
        if (!nextConv || !nextConv.character || nextConv.character !== currentCharacter) {
          result += `</div>`; // Close character-section
          currentCharacter = null;
        }
      }
      
      // Add custom CSS styles with dark mode support
      result = `
        <style>
          .story-preview-container {
            font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            color: var(--text-primary, #1e293b);
            background-color: var(--content-bg, #ffffff);
            padding: 20px;
            border-radius: 8px;
          }
          
          .story-place {
            margin: 25px 0 15px;
          }
          
          .story-place h3 {
            margin: 0 0 8px 0;
            font-size: 22px;
            font-weight: 600;
            color: var(--primary-color, #4361ee);
          }
          
          .place-divider {
            height: 2px;
            background: linear-gradient(to right, var(--primary-color, #4361ee), transparent);
            margin-bottom: 15px;
          }
          
          .story-narration {
            margin-bottom: 20px;
            padding-left: 15px;
          }
          
          .narration-text {
            font-style: italic;
            color: var(--text-secondary, #64748b);
            line-height: 1.7;
            background-color: var(--hover-bg, rgba(241, 245, 249, 0.5));
            padding: 12px 18px;
            border-left: 4px solid var(--border-color, #94a3b8);
            margin: 0;
          }
          
          .character-section {
            margin-bottom: 20px;
          }
          
          .character-name {
            font-weight: bold;
            color: var(--primary-color, #4361ee);
            font-size: 17px;
            margin-bottom: 8px;
          }
          
          .dialog-bubble {
            background-color: var(--hover-bg, #f1f5f9);
            padding: 12px 16px;
            border-radius: 12px;
            margin: 5px 0 10px 15px;
            position: relative;
            max-width: 90%;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          
          .dialog-bubble:before {
            content: '';
            position: absolute;
            top: 15px;
            left: -8px;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 8px 10px 8px 0;
            border-color: transparent var(--hover-bg, #f1f5f9) transparent transparent;
          }
          
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            .story-preview-container {
              color: #f1f5f9;
              background-color: #1e293b;
            }
            
            .dialog-bubble {
              background-color: #334155;
            }
            
            .dialog-bubble:before {
              border-color: transparent #334155 transparent transparent;
            }
            
            .narration-text {
              background-color: rgba(30, 41, 59, 0.5);
              border-left-color: #475569;
              color: #cbd5e1;
            }
            
            .character-name {
              color: #818cf8;
            }
            
            .story-place h3 {
              color: #818cf8;
            }
            
            .place-divider {
              background: linear-gradient(to right, #818cf8, transparent);
            }
          }
          
          /* For app.vue dark-theme class */
          .dark-theme .story-preview-container {
            color: #f1f5f9;
            background-color: #1e293b;
          }
          
          .dark-theme .dialog-bubble {
            background-color: #334155;
          }
          
          .dark-theme .dialog-bubble:before {
            border-color: transparent #334155 transparent transparent;
          }
          
          .dark-theme .narration-text {
            background-color: rgba(30, 41, 59, 0.5);
            border-left-color: #475569;
            color: #cbd5e1;
          }
          
          .dark-theme .character-name {
            color: #818cf8;
          }
          
          .dark-theme .story-place h3 {
            color: #818cf8;
          }
          
          .dark-theme .place-divider {
            background: linear-gradient(to right, #818cf8, transparent);
          }
        </style>
        <div class="story-preview-container">
          ${result}
        </div>
      `;
      
      return result;
    },
    
    formattedStoryJson() {
      if (!this.selectedStory) return '';
      
      const conversations = this.getStoryConversations();
      if (!conversations) {
        return 'Error: Unable to load story conversations.';
      }
      
      const jsonData = {
        conversations: conversations.map(conv => {
          // Create a clean copy without id field
          const { id, ...cleanConv } = conv;
          return cleanConv;
        })
      };
      
      return JSON.stringify(jsonData, null, 2);
    },
    
    currentUser() {
      return new Date().toLocaleString();
    },
    
    currentTimestamp() {
      return new Date().toLocaleString();
    }
  },
  async mounted() {
    try {
      await this.loadStoryData();
      this.buildTreeStructure();
      this.isLoading = false;
    } catch (error) {
      console.error('Failed to load story data:', error);
      this.errorMessage = '加载故事数据失败: ' + error.message;
      this.isLoading = false;
    }
  },
  methods: {
    /**
     * 加载故事数据
     */
    async loadStoryData() {
      // 移除从 localStorage 加载配置的部分
      // const configStr = localStorage.getItem('aiGalgameConfig');
      // if (!configStr) {
      //   throw new Error('未找到配置文件');
      // }
      // const config = JSON.parse(configStr);
      // this.storyTitle = config.剧情?.story_title || ''; // 不再需要

      // --- 直接使用 prop ---
      if (!this.storyTitle) {
        throw new Error('故事标题未从父组件传递');
      }
      // --- 修改结束 ---

      // 加载选项数据
      const choicePath = `/data/${this.storyTitle}/choice.json`;
      try {
        this.choiceData = await readFile(choicePath) || {};
      } catch (error) {
        console.warn(`未找到或无法读取选择文件: ${choicePath}`, error);
        // 如果 choice.json 不是必须的，可以设置为空对象并继续
        this.choiceData = {};
        // 如果是必须的，可以抛出错误：
        // throw new Error(`无法加载必要的选择文件: ${choicePath}`);
      }

      // 预加载故事内容
      const storyDir = `/data/${this.storyTitle}/story`;
      try {
        const storyFiles = await listDirectory(storyDir);
        console.log('Story files found:', storyFiles);
        // 并行加载故事内容
        await Promise.all(storyFiles
          .filter(file => !file.isDirectory && file.name.endsWith('.json'))
          .map(async file => {
            const storyId = file.name.replace('.json', '');
            try {
              const storyContent = await readFile(`${storyDir}/${file.name}`);
              this.storyContents[storyId] = storyContent;
            } catch (error) {
              console.warn(`无法加载故事内容 ID ${storyId}:`, error);
              // 可以选择忽略加载失败的单个故事文件
            }
          }));
      } catch (error) {
        // 如果 story 目录不存在，这是一个可接受的状态，表示没有故事内容
        if (error.message && error.message.includes('目录不存在')) {
          console.warn(`故事内容目录不存在: ${storyDir}`);
        } else {
          // 其他错误（如权限问题）则记录
          console.error(`无法列出故事内容目录: ${storyDir}`, error);
        }
        // 即使目录不存在或列出失败，也继续执行，允许只显示选择树
      }
    },

    buildTreeStructure() {
      // 创建根节点
      this.rootNode = {
        id: '0',
        label: '开始 (ID: 0)',
        parentId: null,
        children: [],
        hasStory: this.storyContents.hasOwnProperty('0') // Check if root has story content
      };

      // 构建节点映射以便快速查找
      const nodeMap = { '0': this.rootNode };

      // 第一遍：创建所有节点
      for (const [parentId, choices] of Object.entries(this.choiceData)) {
        if (!Array.isArray(choices)) continue;

        for (const choice of choices) {
          if (!choice || !choice.id) continue; // Add null/undefined check for choice

          const childId = choice.id;
          const childLabel = Object.entries(choice)
            .find(([key]) => key.startsWith('choice'))
            ?.[1] || '未知选项'; // Changed default label

          // 检查子节点是否已存在 (避免重复创建)
          if (!nodeMap[childId]) {
            // 创建子节点
            nodeMap[childId] = {
              id: childId,
              label: `${childLabel} (ID: ${childId})`,
              parentId,
              children: [],
              // 检查此节点是否有故事内容
              hasStory: this.storyContents.hasOwnProperty(childId)
            };
          } else {
            // 如果节点已存在，更新其父ID（如果不同，可能表示数据问题）
            if(nodeMap[childId].parentId === null && parentId !== null) {
              nodeMap[childId].parentId = parentId;
            } else if (nodeMap[childId].parentId !== parentId) {
              console.warn(`Node ${childId} has multiple parents: ${nodeMap[childId].parentId} and ${parentId}. Using the first one found.`);
            }
            // 确保hasStory状态正确
            nodeMap[childId].hasStory = this.storyContents.hasOwnProperty(childId);
          }
        }
      }

      // 第二遍：构建树结构 (只处理在choiceData中明确定义的父子关系)
      for (const [parentId, choices] of Object.entries(this.choiceData)) {
        const parentNode = nodeMap[parentId];
        if (!parentNode || !Array.isArray(choices)) continue;

        for (const choice of choices) {
          if (!choice || !choice.id) continue;
          const childNode = nodeMap[choice.id];
          // 确保子节点存在且尚未被添加到此父节点下
          if (childNode && !parentNode.children.some(c => c.id === childNode.id)) {
            parentNode.children.push(childNode);
          }
        }
      }


      // 检查是否存在没有父级的节点（除了根节点 '0'）
      Object.values(nodeMap).forEach(node => {
        if (node.id !== '0' && node.parentId === null) {
          console.warn(`Node ${node.id} (${node.label}) appears to be an orphan node (no parent found in choice data).`);
          // 可以选择将其添加到根节点或其他处理方式
          // this.rootNode.children.push(node);
        } else if (node.parentId !== null && !nodeMap[node.parentId]) {
          console.warn(`Node ${node.id} has parentId ${node.parentId}, but the parent node was not found.`);
          // 可能需要将其视为孤儿节点处理
        }
      });
    },
    
    /**
     * 查看故事
     */
    async viewStory(node) {
      if (!node.hasStory) {
        this.showNotification('该节点没有故事内容', 'warning');
        return;
      }
      
      const storyId = node.id;
      
      try {
        // 获取故事内容
        const storyContent = this.storyContents[storyId];
        if (!storyContent) {
          throw new Error(`未找到ID为 ${storyId} 的故事内容`);
        }
        
        // 设置选中故事
        this.selectedStory = {
          id: storyId,
          content: storyContent
        };
        
        // 获取ID链
        const title=`${this.storyTitle}`;
        this.storyIdChain = await traceIdChain(storyId,title);
      } catch (error) {
        console.error(`查看故事失败 (ID: ${storyId}):`, error);
        this.showNotification(`查看故事失败: ${error.message}`, 'error');
      }
    },
    
    /**
     * 准备导出
     */
    prepareExport(node) {
      this.viewStory(node);
    },
    
    /**
     * 导出故事
     */
    async exportStory(format) {
      if (!this.selectedStory) return;
      
      this.isExporting = true;
      this.exportingMessage = `正在导出 ${format.toUpperCase()} 格式...`;
      
      try {
        const fileName = `story_${this.selectedStory.id}_${format}`;
        let content;
        let mimeType;
        
        switch (format) {
          case 'text':
            content = this.formattedStoryText;
            mimeType = 'text/plain';
            this.downloadFile(`${fileName}.txt`, content, mimeType);
            break;
          case 'json':
            content = this.formattedStoryJson;
            mimeType = 'application/json';
            this.downloadFile(`${fileName}.json`, content, mimeType);
            break;
          case 'html':
            content = this.generateHtmlDocument();
            mimeType = 'text/html';
            this.downloadFile(`${fileName}.html`, content, mimeType);
            break;
        }
        
        this.showNotification(`成功导出为 ${format.toUpperCase()} 格式`, 'success');
      } catch (error) {
        console.error(`导出故事失败:`, error);
        this.showNotification(`导出失败: ${error.message}`, 'error');
      } finally {
        this.isExporting = false;
      }
    },
    
    /**
     * 生成HTML文档
     */
    generateHtmlDocument() {
      const title = `故事: ${this.storyTitle} (ID: ${this.selectedStory.id})`;
      const storyHtml = this.formattedStoryHtml;
      
      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --text-primary: #333;
      --text-secondary: #7f8c8d;
      --content-bg: #fff;
      --primary-color: #3498db;
      --border-color: #eee;
      --hover-bg: #f8f9fa;
      --dialog-bg: #f8f9fa;
      --narration-bg: #f0f2f5;
      --narration-border: #95a5a6;
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --content-bg: #1e293b;
        --primary-color: #818cf8;
        --border-color: #334155;
        --hover-bg: #334155;
        --dialog-bg: #334155;
        --narration-bg: rgba(30, 41, 59, 0.5);
        --narration-border: #475569;
      }
    }
    
    body {
      font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      line-height: 1.6;
      color: var(--text-primary);
      background-color: #f5f5f5;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0f172a;
      }
    }
    
    .story-container {
      background-color: var(--content-bg);
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    header {
      margin-bottom: 30px;
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }
    
    h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: var(--primary-color);
    }
    
    .story-meta {
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    .story-place {
      margin: 25px 0 15px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 5px;
    }
    
    .story-place h3 {
      margin: 0;
      color: var(--primary-color);
      font-size: 20px;
      font-weight: 500;
    }
    
    .story-dialog {
      margin-bottom: 15px;
      line-height: 1.7;
    }
    
    .character {
      color: var(--primary-color);
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .dialog-text {
      margin-left: 16px;
      background-color: var(--dialog-bg);
      padding: 10px 15px;
      border-radius: 8px;
      position: relative;
    }
    
    .dialog-text:before {
      content: '';
      position: absolute;
      left: -8px;
      top: 15px;
      border-style: solid;
      border-width: 8px 8px 8px 0;
      border-color: transparent var(--dialog-bg) transparent transparent;
    }
    
    .story-narration {
      margin-bottom: 20px;
      font-style: italic;
    }
    
    .narration-text {
      background-color: var(--narration-bg);
      padding: 12px 18px;
      border-left: 4px solid var(--narration-border);
      color: var(--text-secondary);
      line-height: 1.8;
    }
    
    footer {
      margin-top: 30px;
      text-align: center;
      font-size: 13px;
      color: var(--text-secondary);
    }
  </style>
</head>
<body>
  <div class="story-container">
    <header>
      <h1>${title}</h1>
      <div class="story-meta">
        <span>故事ID: ${this.selectedStory.id}</span>
        ${this.storyIdChain.length > 1 ? `<span> | 路径: ${this.storyIdChain.join(' → ')}</span>` : ''}
        <span> | 导出时间: ${this.currentTimestamp}</span>
      </div>
    </header>
    
    <div class="story-content">
      ${storyHtml}
    </div>
    
    <footer>
      <p>由 AI Galgame Studio 生成 | ${this.currentUser}</p>
    </footer>
  </div>
</body>
</html>`;
    },
    
    
    /**
     * 下载文件
     */
    downloadFile(fileName, content, mimeType = 'text/plain') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    
    
    /**
     * 获取故事对话
     */
    getStoryConversations() {
      if (!this.selectedStory) return null;
      
      if (this.includePreviewContent && this.storyIdChain.length > 1) {
        // 包含上文内容，合并所有ID的对话
        const allConversations = [];
        
        // 根据ID链加载所有故事内容
        for (const id of this.storyIdChain) {
          const storyContent = this.storyContents[id];
          if (storyContent && storyContent.conversations) {
            allConversations.push(...storyContent.conversations);
          }
        }
        
        return allConversations;
      } else {
        // 仅显示当前ID的对话
        return this.selectedStory.content?.conversations || [];
      }
    },
    
    /**
     * 转义HTML
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    
    /**
     * 格式化对话文本
     */
    formatDialogText(text) {
      // 转义HTML并保留换行
      return this.escapeHtml(text).replace(/\n/g, '<br>');
    },
    
    /**
     * 显示通知
     */
    showNotification(message, type = 'success') {
      // 清除之前的定时器
      if (this.notification.timer) {
        clearTimeout(this.notification.timer);
      }
      
      // 设置图标
      let icon;
      switch (type) {
        case 'success': icon = 'fas fa-check-circle'; break;
        case 'error': icon = 'fas fa-exclamation-circle'; break;
        case 'warning': icon = 'fas fa-exclamation-triangle'; break;
        default: icon = 'fas fa-info-circle';
      }
      
      this.notification = {
        show: true,
        message,
        type,
        icon,
        timer: setTimeout(() => {
          this.notification.show = false;
        }, 3000)
      };
    }
  }
};
</script>

<style scoped>
/* Global Styles */
.export-story {
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: var(--text-primary, #1e293b);
  position: relative;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

h1 {
  font-size: 26px;
  margin: 0;
  color: var(--primary-color, #4f46e5);
}

.user-info {
  text-align: right;
  font-size: 14px;
  color: var(--text-secondary, #64748b);
}


main {
  min-height: calc(84vh - 150px);
}

h2 {
  font-size: 20px;
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--text-primary, #1e293b);
}

/* Layout */
.content-wrapper {
  display: flex;
  gap: 20px;
  height: calc(84vh - 150px);
}

.choice-tree-section {
  width: 40%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-section {
  width: 60%;
  height: 100%;
  background-color: var(--sidebar-bg, #f8fafc);
  border-radius: 10px;
  border: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Tree Styles */
.tree-container {
  background-color: var(--sidebar-bg, #f8fafc);
  border-radius: 10px;
  border: 1px solid var(--border-color, #e2e8f0);
  padding: 15px;
  overflow: auto;
  flex-grow: 1;
}


.tree {
  list-style-type: none;
  padding-left: 10px;
  margin-top: 10px;
  user-select: none;
}

/* Preview Styles */
.preview-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--content-bg, #ffffff);
}

.format-controls {
  display: flex;
  gap: 10px;
}

.format-btn {
  padding: 5px 12px;
  font-size: 13px;
  border: 1px solid var(--border-color, #e2e8f0);
  background-color: var(--hover-bg, #f1f5f9);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-primary, #1e293b);
  transition: all 0.2s;
}

.format-btn.active {
  background-color: var(--primary-color, #4f46e5);
  color: white;
  border-color: var(--primary-color, #4f46e5);
}

.format-btn:hover:not(.active) {
  background-color: var(--border-color, #e2e8f0);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  font-size: 18px;
  padding: 0;
}

.preview-body {
  padding: 20px;
  overflow: auto;
  flex-grow: 1;
  background-color: var(--content-bg, #ffffff);
}

.story-meta {
  margin-bottom: 15px;
  font-size: 14px;
  color: var(--text-secondary, #64748b);
  display: flex;
  gap: 15px;
}

.story-id {
  padding: 3px 8px;
  background-color: var(--primary-color, #4f46e5);
  color: white;
  border-radius: 4px;
}

.story-path {
  padding: 3px 8px;
  background-color: var(--hover-bg, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 4px;
}

.preview-text pre, .preview-json pre {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.5;
  padding: 15px;
  background-color: var(--hover-bg, #f1f5f9);
  border-radius: 6px;
  overflow: auto;
  max-height: 100%;
}

.preview-html {
  max-height: 100%;
  overflow: auto;
}

.html-story {
  line-height: 1.6;
}

.preview-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color, #e2e8f0);
  background-color: var(--content-bg, #ffffff);
}

.export-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.include-previous-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--primary-color, #4f46e5);
}

input:focus + .toggle-slider {
  box-shadow: 0 0 1px var(--primary-color, #4f46e5);
}

input:checked + .toggle-slider:before {
  -webkit-transform: translateX(20px);
  -ms-transform: translateX(20px);
  transform: translateX(20px);
}

.toggle-label1 {
  font-size: 14px;
  color: var(--text-primary, #1e293b);
}

.export-buttons {
  display: flex;
  gap: 10px;
}

.export-btn {
  padding: 8px 16px;
  font-size: 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  transition: opacity 0.2s;
}

.export-btn:hover {
  opacity: 0.9;
}

.export-btn.text-btn {
  background-color: #2ecc71;
}

.export-btn.html-btn {
  background-color: #3498db;
}

.export-btn.json-btn {
  background-color: #f39c12;
}

.export-btn.zip-btn {
  background-color: #9b59b6;
}

/* Notification */
.notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 15px 25px;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  z-index: 1000;
  animation: slide-in 0.3s forwards;
}

.dark-theme .notification {
  background-color: var(--sidebar-bg, #0f172a);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
}

@keyframes slide-in {
  0% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

.notification.success {
  background-color: #f0fff4;
  border-left: 4px solid #2ecc71;
  color: #2ecc71;
}

.dark-theme .notification.success {
  background-color: rgba(16, 185, 129, 0.2);
  color: #4ade80;
}

.notification.error {
  background-color: #fff5f5;
  border-left: 4px solid #e74c3c;
  color: #e74c3c;
}

.dark-theme .notification.error {
  background-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.notification.warning {
  background-color: #fffbeb;
  border-left: 4px solid #f1c40f;
  color: #f39c12;
}

.dark-theme .notification.warning {
  background-color: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.notification.info {
  background-color: #ebf8ff;
  border-left: 4px solid #3498db;
  color: #3498db;
}

.dark-theme .notification.info {
  background-color: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

/* Loading Styles */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary, #64748b);
}

.spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 3px solid var(--primary-color, #4f46e5);
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.dark-theme .spinner {
  border-color: rgba(255, 255, 255, 0.1);
  border-top-color: var(--primary-color, #818cf8);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.loading-content {
  background-color: var(--content-bg, white);
  padding: 30px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  color: #e74c3c;
  text-align: center;
}

.dark-theme .error-message {
  color: #f87171;
}

.error-message i {
  font-size: 40px;
  margin-bottom: 15px;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary, #64748b);
  text-align: center;
}

.no-selection i {
  font-size: 50px;
  margin-bottom: 15px;
  opacity: 0.5;
}

/* Responsive Design */
@media (max-width: 900px) {
  .content-wrapper {
    flex-direction: column;
    height: auto;
  }
  
  .choice-tree-section, .preview-section {
    width: 100%;
    height: 500px;
  }
  
  .export-options {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .export-buttons {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 600px) {
  .export-story {
    padding: 10px;
  }
  
  header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .user-info {
    text-align: left;
    margin-top: 10px;
  }
  
  .choice-tree-section, .preview-section {
    height: 400px;
  }
  
  .preview-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .export-btn {
    padding: 8px;
  }
  
  .export-btn span {
    display: none;
  }
}

/* Dark Theme Support */
.dark-theme .preview-body,
.dark-theme .preview-header,
.dark-theme .preview-footer {
  background-color: var(--content-bg, #1e293b);
}

.dark-theme .tree-container,
.dark-theme .preview-section {
  background-color: var(--sidebar-bg, #0f172a);
  border-color: var(--border-color, #334155);
}

.dark-theme .preview-text pre, 
.dark-theme .preview-json pre {
  background-color: var(--hover-bg, #334155);
  color: var(--text-primary, #f8fafc);
}

.dark-theme .story-path {
  background-color: var(--hover-bg, #334155);
  border-color: var(--border-color, #475569);
}

.dark-theme .format-btn {
  background-color: var(--hover-bg, #334155);
  border-color: var(--border-color, #475569);
  color: var(--text-primary, #f8fafc);
}

.dark-theme .format-btn:hover:not(.active) {
  background-color: var(--border-color, #475569);
}

.dark-theme .format-btn.active {
  background-color: var(--primary-color, #818cf8);
  border-color: var(--primary-color, #818cf8);
}

.dark-theme h1,
.dark-theme h2 {
  color: var(--text-primary, #f8fafc);
}

.dark-theme .story-id {
  background-color: var(--primary-color, #818cf8);
}

.dark-theme .toggle-label1 {
  color: var(--text-primary, #f8fafc);
}

.dark-theme input:checked + .toggle-slider {
  background-color: var(--primary-color, #818cf8);
}

</style>