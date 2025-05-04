<template>
  <div class="export-story-page">
    <!-- Main Content Wrapper -->
    <div class="content-wrapper">
      <!-- Story Choice Tree Section -->
      <section class="choice-tree-section card">
        <h2 class="section-title">
           <font-awesome-icon :icon="['fas', 'code-branch']" /> 故事选择树
        </h2>
        <div class="tree-container">
          <div v-if="isLoading" class="loading-indicator">
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon" />
            <p>正在加载故事结构...</p>
          </div>
          <div v-else-if="errorMessage" class="error-message">
            <font-awesome-icon :icon="['fas', 'exclamation-circle']" />
            <p>{{ errorMessage }}</p>
          </div>
          <div v-else class="tree-content">
             <!-- Add a check if rootNode exists -->
             <ul class="tree" v-if="rootNode">
                <story-node
                   :node="rootNode"
                   :depth="0"
                   @view="viewStory"
                   @export="prepareExport"
                   @show-message="handleShowMessage"
                />
             </ul>
             <div v-else class="empty-tree-state">
                 <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
                 <p>未能构建故事树结构。</p>
             </div>
          </div>
        </div>
      </section>

      <!-- Preview Panel Section -->
      <section class="preview-section card" :class="{ active: selectedStory }">
        <div class="preview-header">
          <h2 class="section-title">
             <font-awesome-icon :icon="['fas', 'eye']" /> 故事预览
          </h2>
          <div class="format-controls">
            <button
              v-for="format in previewFormats"
              :key="format.id"
              :class="['btn btn-sm btn-outline format-btn', { 'active-format': currentPreviewFormat === format.id }]"
              @click="currentPreviewFormat = format.id"
            >
              {{ format.name }}
            </button>
          </div>
          <button class="btn btn-text btn-sm close-btn" @click="selectedStory = null" aria-label="Close preview" title="关闭预览">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>

        <div class="preview-body">
          <div v-if="!selectedStory" class="no-selection">
            <font-awesome-icon :icon="['fas', 'book-open']" class="placeholder-icon" />
            <p>请从故事树中选择一个节点预览</p>
          </div>
          <div v-else>
            <div class="story-meta">
              <span class="story-id badge badge-primary">ID: {{ selectedStory.id }}</span>
              <span v-if="storyIdChain && storyIdChain.length > 1" class="story-path text-secondary">
                路径: {{ storyIdChain.join(' → ') }}
              </span>
            </div>

            <!-- Text Preview -->
            <div v-if="currentPreviewFormat === 'text'" class="preview-text">
              <pre>{{ formattedStoryText }}</pre>
            </div>

            <!-- HTML Preview -->
            <div v-else-if="currentPreviewFormat === 'html'" class="preview-html styled-html-preview">
              <!-- The inner HTML content is styled by the <style> tag generated within formattedStoryHtml -->
              <div v-html="formattedStoryHtml"></div>
            </div>

            <!-- JSON Preview -->
            <div v-else-if="currentPreviewFormat === 'json'" class="preview-json">
              <pre>{{ formattedStoryJson }}</pre>
            </div>
          </div>
        </div>

        <div v-if="selectedStory" class="preview-footer">
          <div class="export-options">
            <div class="include-previous-toggle form-group">
              <label class="switch">
                <input type="checkbox" v-model="includePreviewContent" class="switch-input">
                <span class="switch-slider"></span>
              </label>
              <span class="toggle-label tooltip-container">包含上文内容
                <span class="tooltip-text">导出时是否包含当前节点之前的所有故事内容。</span>
              </span>
            </div>

            <div class="export-buttons">
              <button
                v-for="format in exportFormats"
                :key="format.id"
                class="btn btn-primary export-btn"
                :class="format.class"
                @click="exportStory(format.id)"
                 :disabled="isExporting"
              >
                <font-awesome-icon :icon="format.icon" /> {{ format.name }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isExporting" class="loading-overlay">
      <div class="loading-content">
        <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon" />
        <p>{{ exportingMessage }}</p>
      </div>
    </div>

     <!-- Message Bubble is handled globally via $emit('show-message') -->
  </div>
</template>

<script>
// Import Font Awesome icons needed for this component if not globally registered
// import { faCodeBranch, faEye, faTimes, faBookOpen, faFileAlt, faFileCode, faSpinner, faExclamationCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
// import { library } from '@fortawesome/fontawesome-svg-core';
// library.add(faCodeBranch, faEye, faTimes, faBookOpen, faFileAlt, faFileCode, faSpinner, faExclamationCircle, faExclamationTriangle);


import { readFile, listDirectory } from './services/IndexedDBFileSystem';
import StoryNode from './Manage_ExportStory_StoryNode.vue'; // Assuming this is the correct path
import { traceIdChain } from './services/ChoiceManager';

export default {
  name: 'ExportStory',
  components: {
    StoryNode
  },
  props: {
    storyTitle: {
      type: String,
      required: true
    }
  },
  // Declare emitted events
  emits: ['show-message', 'close'],
  data() {
    return {
      isLoading: true,
      isExporting: false,
      exportingMessage: '',
      errorMessage: '',

      choiceData: {},
      storyContents: {}, // Cache for story contents (parsed JSON)
      rootNode: null,

      selectedStory: null, // { id: string, content: object }
      currentPreviewFormat: 'html',
      includePreviewContent: false,
      storyIdChain: [], // Array of story IDs ['0', '1', '5', ...]

      previewFormats: [
        { id: 'text', name: '文本' },
        { id: 'html', name: 'HTML' },
        { id: 'json', name: 'JSON' }
      ],
      exportFormats: [
        { id: 'text', name: '导出文本', class: 'btn-primary-outline', icon: ['fas', 'file-alt'] }, // Using array format for icon
        { id: 'html', name: '导出HTML', class: 'btn-secondary', icon: ['fas', 'file-code'] },
        { id: 'json', name: '导出JSON', class: 'btn-info', icon: ['fas', 'file-code'] }
      ],

      // Removed local notification state
      // notification: { ... }
    };
  },
  computed: {
    // Computed properties for formatted content (remain largely the same, but reference cached data)
    formattedStoryText() {
      if (!this.selectedStory) return '';
      const conversations = this.getStoryConversations();
      if (!conversations || !Array.isArray(conversations)) {
        return 'Error: 故事内容格式无效或无法加载';
      }
      // ... existing logic to format text ...
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
         return '<p class="error">Error: 故事内容格式无效或无法加载</p>';
       }
      // ... existing logic to format HTML ...
       let currentPlace = null;
       let currentCharacter = null;
       let result = '';

       for (let i = 0; i < conversations.length; i++) {
         const conv = conversations[i];
         const character = conv.character || '';
         const text = conv.text || '';
         const place = conv.place || '';

         // Add place as a section divider if it's new and not empty
         if (place && place !== currentPlace) {
           currentPlace = place;
           result += `
             <div class="story-place">
               <h3>${this.escapeHtml(place)}</h3>
               <div class="place-divider"></div>
             </div>
           `;
         }

         // Handle narration (no character or character is "旁白")
         const isNarration = !character || character === "旁白";
         if (isNarration) {
           result += `
             <div class="story-narration">
               <p class="narration-text">${this.formatDialogText(text)}</p>
             </div>
           `;
           // Reset character if it was "旁白" to correctly start character section later
           if (character === "旁白") currentCharacter = null;
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
         const nextIsNarration = nextConv && (!nextConv.character || nextConv.character === "旁白");
         if (!nextConv || nextIsNarration || nextConv.character !== currentCharacter) {
           result += `</div>`; // Close character-section
           currentCharacter = null; // Ensure currentCharacter is reset
         }
       }

       // The inline <style> block and wrapper div are added by generateHtmlDocument for export,
       // but for *preview* within the modal, we just need the generated content.
       // Let's remove the style block and wrapper here and let the parent modal's CSS handle it.
       // OR... keep the style block and wrapper for consistent preview rendering regardless of parent CSS.
       // Keeping it is simpler for inline preview.
       return `
         <style>
           /* Add styles specific to HTML preview here */
           /* These styles are included directly in the generated HTML */
           /* Ensure they use standard CSS variable fallbacks */

           .story-preview-container {
             font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
             line-height: 1.6;
             max-width: 800px;
             margin: 0 auto;
             color: var(--text-primary, #333); /* Added default fallback */
             background-color: var(--content-bg, #fff); /* Added default fallback */
             padding: 20px;
             border-radius: 8px;
           }

           .story-place { margin: 25px 0 15px; }
           .story-place h3 { margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: var(--primary-color, #3498db); } /* Added default fallback */
           .place-divider { height: 2px; background: linear-gradient(to right, var(--primary-color, #3498db), transparent); margin-bottom: 15px; } /* Added default fallback */

           .story-narration { margin-bottom: 20px; padding-left: 15px; }
           .narration-text {
             font-style: italic; color: var(--text-secondary, #7f8c8d); /* Added default fallback */
             line-height: 1.7; background-color: var(--hover-overlay, rgba(0,0,0,0.05)); /* Using hover-overlay var */
             padding: 12px 18px; border-left: 4px solid var(--border-color, #eee); /* Using border-color var */
             margin: 0; border-radius: var(--border-radius-sm, 4px); /* Added border-radius */
           }

           .character-section { margin-bottom: 20px; }
           .character-name { font-weight: bold; color: var(--primary-color, #3498db); font-size: 17px; margin-bottom: 8px; } /* Added default fallback */

           .dialog-bubble {
             background-color: var(--surface-color, #f9f9f9); /* Using surface-color var */
             padding: 12px 16px; border-radius: var(--border-radius-md, 8px); /* Using border-radius-md var */
             margin: 5px 0 10px 15px; position: relative; max-width: 90%; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
           }
           .dialog-bubble:before {
             content: ''; position: absolute; top: 15px; left: -8px; width: 0; height: 0; border-style: solid;
             border-width: 8px 10px 8px 0; border-color: transparent var(--surface-color, #f9f9f9) transparent transparent; /* Using surface-color var */
           }

           /* Dark mode support (adjusting variables for app.vue's dark-theme class) */
           /* These styles will apply if the parent body has dark-theme class */
           body.dark-theme .story-preview-container {
             color: var(--text-primary); background-color: var(--content-bg);
           }
            body.dark-theme .dialog-bubble { background-color: var(--surface-color); }
            body.dark-theme .dialog-bubble:before { border-color: transparent var(--surface-color) transparent transparent; }
            body.dark-theme .narration-text { background-color: var(--hover-overlay); border-left-color: var(--border-color); color: var(--text-secondary); }
            body.dark-theme .character-name { color: var(--primary-color); }
            body.dark-theme .story-place h3 { color: var(--primary-color); }
            body.dark-theme .place-divider { background: linear-gradient(to right, var(--primary-color), transparent); }


         </style>
         <div class="story-preview-container">
           ${result}
         </div>
       `;
    },

    formattedStoryJson() {
      if (!this.selectedStory) return '';
      const conversations = this.getStoryConversations();
      if (!conversations) {
        return 'Error: Unable to load story conversations.';
      }
      // ... existing logic to format JSON ...
      const jsonData = {
        conversations: conversations.map(conv => {
          const { id, ...cleanConv } = conv; // Remove internal ID if exists
          return cleanConv;
        })
      };
      return JSON.stringify(jsonData, null, 2);
    },

    // Helper to get formatted current time (optional, could remove)
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
      this.errorMessage = '加载故事数据失败: ' + (error.message || '未知错误');
      this.isLoading = false;
      // Don't show toast here, the persistent error message is better for critical load failure
    }
  },
  methods: {
    /**
     * 加载故事数据
     */
    async loadStoryData() {
      // Use prop directly - NO localStorage reading needed here
      if (!this.storyTitle) {
        // This case should ideally not happen if prop is required, but good check
         console.error('Story title prop is missing.');
        throw new Error('内部错误：故事标题未传递');
      }

      // 加载选项数据
      const choicePath = `/data/${this.storyTitle}/choice.json`;
      try {
        // readFile returns data directly or throws if not found/read fails
        this.choiceData = await readFile(choicePath);
        console.log(`Choice data loaded from ${choicePath}.`);
        // If file exists but is empty or invalid JSON, readFile might return null/undefined/error
        // Handle null/undefined explicitly if readFile doesn't throw for empty/non-existent
         if (this.choiceData === null || typeof this.choiceData !== 'object') {
             console.warn(`Choice file ${choicePath} loaded but data is empty or invalid type.`);
             this.choiceData = {}; // Default to empty object if content is null/non-object
         }
      } catch (error) {
        // Catch errors for non-existent file, permissions, etc.
        if (error.message && (error.message.includes('不存在') || error.message.includes('找不到'))) {
             console.warn(`Choice file "${choicePath}" does not exist, assuming no choices.`);
        } else {
             console.error(`无法读取选择文件: ${choicePath}`, error);
             this.handleShowMessage({ title: 'error', message: `无法加载选择文件: ${error.message}` });
        }
        this.choiceData = {}; // Default to empty object if file doesn't exist or fails to read gracefully
      }


      // 预加载故事内容
      const storyDir = `/data/${this.storyTitle}/story`;
      this.storyContents = {}; // Clear previous cache
      try {
        const storyFiles = await listDirectory(storyDir);
        console.log(`Found ${storyFiles ? storyFiles.length : 0} items in story directory.`);

        if (storyFiles && storyFiles.length > 0) {
            await Promise.all(storyFiles
              .filter(file => !file.isFolder && file.name.endsWith('.json') && /^\d+\.json$/.test(file.name)) // Filter for files matching {id}.json format
              .map(async file => {
                const storyId = file.name.replace('.json', '');
                const filePath = `${storyDir}/${file.name}`;
                try {
                  const storyContent = await readFile(filePath);
                   // Basic validation: ensure it's an object and has conversations array
                   if (storyContent && typeof storyContent === 'object' && Array.isArray(storyContent.conversations)) {
                       this.storyContents[storyId] = storyContent;
                   } else {
                       console.warn(`Story file "${filePath}" loaded but content is invalid or missing 'conversations'.`, storyContent);
                        this.handleShowMessage({ title: 'warning', message: `故事文件格式无效: ${file.name}` });
                   }
                } catch (error) {
                  console.warn(`无法加载或处理故事内容 "${filePath}":`, error);
                   this.handleShowMessage({ title: 'warning', message: `无法加载故事内容: ${file.name}` });
                  // Do not add to storyContents cache on failure
                }
              }));
             console.log(`Loaded and processed ${Object.keys(this.storyContents).length} story content files.`);
        } else if (storyFiles && storyFiles.length === 0) {
             console.log(`Story directory "${storyDir}" is empty.`);
        }


      } catch (error) {
        // Catch error if listDirectory fails (e.g., directory doesn't exist or permission error)
        if (error.message && (error.message.includes('目录不存在') || error.message.includes('找不到'))) {
          console.warn(`故事内容目录不存在: ${storyDir}, no story content to load.`);
           // This is not a critical error if only choices are present
        } else {
          console.error(`无法列出故事内容目录: ${storyDir}`, error);
           this.handleShowMessage({ title: 'error', message: `无法读取故事内容目录: ${error.message}` });
           // Critical enough to set error message if listing failed unexpectedly?
           // Let's keep it as a toast for now.
        }
        // storyContents remains {} if loading fails
      }
    },

    buildTreeStructure() {
      // Create root node (ID '0' is always assumed the start)
      this.rootNode = {
        id: '0',
        label: '开始 (ID: 0)',
        parentId: null, // Root has no parent
        children: [],
        hasStory: this.storyContents.hasOwnProperty('0') // Check if story 0 content exists
      };

      // Use a map to easily reference nodes by ID
      const nodeMap = { '0': this.rootNode };

      // First pass: Create all nodes based on choice data
      // This ensures all potential nodes from choices exist in the map
      for (const parentId in this.choiceData) {
         // Ensure parentId is a valid number if needed, or keep as string
         const choices = this.choiceData[parentId];
         if (!Array.isArray(choices)) continue; // Skip invalid choice data

         // Ensure parent node exists in the map (create if necessary, though '0' should be the only case)
         if (!nodeMap[parentId]) {
              // This case might indicate a choice pointing *from* a node not generated by previous choices
              // or a missing story file that choice.json refers to.
              // For simplicity, only process if the parent ID is in the loaded story contents OR is '0'.
              if (parentId !== '0' && !this.storyContents.hasOwnProperty(parentId)) {
                  console.warn(`Choice found from ID "${parentId}", but no story content or root node for it. Skipping choice links from here.`);
                  continue; // Skip choices from this parent if its story content isn't loaded and it's not the root
              }
              // Create parent node if it wasn't '0' and didn't have story content but was listed in choice.json as a parent
              // This is a complex edge case, let's stick to nodes derived from '0' or existing story content keys.
               // A more robust tree builder would handle disconnected graphs or try to infer nodes from all IDs present.
               // For this task, let's assume valid choice data mostly links existing story IDs or 0.
               // Let's proceed assuming any parent ID in choiceData is a valid node candidate.
              nodeMap[parentId] = {
                  id: parentId,
                  label: `Node ${parentId}`, // Temporary label, will be updated if story content is found
                  parentId: null, // Parent ID will be set later
                  children: [],
                  hasStory: this.storyContents.hasOwnProperty(parentId)
              };
              console.warn(`Created node for parentId ${parentId} found in choice data but not in story contents or as root.`);
         }


        for (const choice of choices) {
          if (!choice || choice.id === undefined || choice.id === null) { // Check for undefined/null explicitly
            console.warn(`Invalid choice object found for parent ID ${parentId}:`, choice);
            continue; // Skip invalid choice objects
          }

          const childId = String(choice.id); // Ensure ID is string for map keys
          // Find the choice text (key starting with 'choice')
          const choiceTextEntry = Object.entries(choice).find(([key]) => key.startsWith('choice'));
          const childLabel = choiceTextEntry ? choiceTextEntry[1] : '未知选项'; // Use the value of the first choice key as label


          // Create child node if it doesn't exist
          if (!nodeMap[childId]) {
            nodeMap[childId] = {
              id: childId,
              label: `${childLabel} (ID: ${childId})`,
              parentId: parentId, // Assign parentId
              children: [],
              hasStory: this.storyContents.hasOwnProperty(childId)
            };
          } else {
             // If node exists, update its label based on the choice text if it was a temporary label
             if (!nodeMap[childId].label.startsWith('Node ')) { // Check if it's not the default 'Node X' label
                nodeMap[childId].label = `${childLabel} (ID: ${childId})`;
             }
             // Update parentId if currently null (meaning it was created as root/orphan initially)
             if (nodeMap[childId].parentId === null) {
                  nodeMap[childId].parentId = parentId;
             } else if (nodeMap[childId].parentId !== parentId) {
                 // This indicates multiple paths lead to the same node ID
                 console.warn(`Node ${childId} found via parent ${parentId}, but it already has parent ${nodeMap[childId].parentId}. Keeping the first parent association for tree building.`);
                 // We don't update parentId here, sticking to the first parent found for the primary tree path
             }
             // Ensure hasStory state is correct (it might have been created before content was loaded)
             nodeMap[childId].hasStory = this.storyContents.hasOwnProperty(childId);
          }
        }
      }

      // Second pass: Build the tree links
      for (const parentId in this.choiceData) {
          const parentNode = nodeMap[parentId];
          const choices = this.choiceData[parentId];
          if (!parentNode || !Array.isArray(choices)) continue;

          for (const choice of choices) {
              if (!choice || choice.id === undefined || choice.id === null) continue;
              const childId = String(choice.id);
              const childNode = nodeMap[childId];
               // Ensure child node exists and is not already a child of this parent
              if (childNode && !parentNode.children.some(c => c.id === childNode.id)) {
                  parentNode.children.push(childNode);
              }
          }
      }

      // Log nodes created vs story contents loaded
      const nodeIds = Object.keys(nodeMap);
      const storyContentIds = Object.keys(this.storyContents);
      console.log(`Nodes created from choices: ${nodeIds.length}`, nodeIds);
      console.log(`Story contents loaded: ${storyContentIds.length}`, storyContentIds);

      // Check for story content IDs that don't have corresponding nodes created from choices
      const orphanStoryContentIds = storyContentIds.filter(id => id !== '0' && !nodeMap[id]);
      if (orphanStoryContentIds.length > 0) {
         console.warn(`Found story content for IDs (${orphanStoryContentIds.join(', ')}) that are not linked by any choices.`);
          // You might want to create these nodes as orphans or add them to the root depending on desired behavior
          // For this task, we'll just log the warning.
      }

      // Check for nodes created from choices that don't have story content (except '0')
       const nodesWithoutStoryContent = nodeIds.filter(id => id !== '0' && !this.storyContents.hasOwnProperty(id));
       if (nodesWithoutStoryContent.length > 0) {
           console.warn(`Nodes created from choices (${nodesWithoutStoryContent.join(', ')}) do not have corresponding story content.`);
            // These nodes will be displayed in the tree but marked as 'no story'
       }


    },

    /**
     * Get story conversations for preview/export
     * Includes parent story contents if includePreviewContent is true and path is available
     */
    getStoryConversations() {
      if (!this.selectedStory) return null;

      if (this.includePreviewContent && this.storyIdChain && this.storyIdChain.length > 1) {
        const allConversations = [];
        for (const id of this.storyIdChain) {
          const storyContent = this.storyContents[id];
          if (storyContent && Array.isArray(storyContent.conversations)) {
            allConversations.push(...storyContent.conversations);
          } else if (storyContent && typeof storyContent === 'object') {
               console.warn(`Story content for ID ${id} is an object but missing 'conversations' array:`, storyContent);
          } else if (storyContent !== undefined) {
               console.warn(`Story content for ID ${id} is not a valid object:`, storyContent);
          } else {
               console.warn(`Story content for ID ${id} not found in cache.`);
          }
        }
        return allConversations;
      } else {
        // Only return conversations for the selected node's story content
        const selectedStoryContent = this.storyContents[this.selectedStory.id];
         if (selectedStoryContent && Array.isArray(selectedStoryContent.conversations)) {
            return selectedStoryContent.conversations;
         } else if (selectedStoryContent && typeof selectedStoryContent === 'object') {
            console.warn(`Selected story content for ID ${this.selectedStory.id} is object but missing 'conversations' array.`, selectedStoryContent);
            return []; // Return empty array if conversations property is missing
         } else {
             console.warn(`Selected story content for ID ${this.selectedStory.id} not found or is invalid.`);
             return []; // Return empty array if content is missing or invalid
         }
      }
    },

    /**
     * Escape HTML entities in text
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Format dialog text for HTML (escape and convert newlines)
     */
    formatDialogText(text) {
      if (typeof text !== 'string') return ''; // Ensure text is a string
      return this.escapeHtml(text).replace(/\n/g, '<br>');
    },

    /**
     * Generate full HTML document for export
     */
    generateHtmlDocument() {
      const title = `故事: ${this.storyTitle} (ID: ${this.selectedStory.id})`;
      // Get the formatted HTML content (which includes the inline <style> and wrapper)
      const storyHtmlContent = this.formattedStoryHtml;

      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
   <!-- Link to a potential external CSS file if you want to manage styles centrally -->
   <!-- <link rel="stylesheet" href="styles.css"> -->
   <!-- Or keep inline styles as generated by formattedStoryHtml -->
</head>
<body class="story-export-body"> <!-- Add a class for body if needed for specific styling -->
  <header>
    <h1>${this.escapeHtml(title)}</h1>
    <div class="story-meta">
      <span>故事ID: ${this.escapeHtml(this.selectedStory.id)}</span>
      ${this.storyIdChain && this.storyIdChain.length > 1 ? `<span> | 路径: ${this.escapeHtml(this.storyIdChain.join(' → '))}\n</span>` : ''}
      <span> | 导出时间: ${this.escapeHtml(this.currentTimestamp)}</span>
    </div>
     <hr style="margin-top: 15px; border: none; border-top: 1px solid var(--border-color, #eee);"> <!-- Simple separator -->
  </header>

  <div class="story-content">
    <!-- Include the content generated by formattedStoryHtml -->
    ${storyHtmlContent}
  </div>

  <footer style="margin-top: 30px; text-align: center; font-size: 13px; color: var(--text-secondary, #7f8c8d);">
    <p>导出自 AI Galgame 生成器 | 导出时间: ${this.escapeHtml(this.currentTimestamp)}</p>
  </footer>
</body>
</html>`;
    },

    /**
     * Download file helper
     */
    downloadFile(fileName, content, mimeType = 'text/plain') {
      try {
         const blob = new Blob([content], { type: mimeType });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = fileName;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
          console.log(`File "${fileName}" downloaded successfully.`);
      } catch (error) {
          console.error(`Failed to download file "${fileName}":`, error);
           // Emit error message if download fails (e.g., browser restrictions)
           this.handleShowMessage({ title: 'error', message: `文件下载失败: ${fileName}` });
      }
    },

    /**
     * View story node content
     */
    async viewStory(node) {
      if (!node || !node.hasStory) {
        this.handleShowMessage({ title: 'warning', message: '该节点没有故事内容可预览' });
        this.selectedStory = null; // Clear previous selection
        return;
      }

      const storyId = node.id;
      // Check if content is already loaded
      const storyContent = this.storyContents[storyId];

      if (!storyContent) {
        // This case shouldn't happen if hasStory is true based on storyContents cache,
        // but added as a safeguard.
         console.warn(`Story content for ID ${storyId} not found in cache despite hasStory flag.`);
         this.handleShowMessage({ title: 'error', message: `无法加载故事内容 (ID: ${storyId})` });
         this.selectedStory = null;
         return;
      }

      try {
        // Set selected story data
        this.selectedStory = {
          id: storyId,
          content: storyContent // Use the cached parsed content
        };

        // Get the ID chain for path display
        // traceIdChain needs choiceData and targetId, and optionally rootId
        // Assumes traceIdChain can find a path or returns partial/empty array
         const fullStoryTitle = this.storyTitle; // Use the prop
        this.storyIdChain = await traceIdChain(storyId, fullStoryTitle);
        console.log(`ID chain for ${storyId}:`, this.storyIdChain);

      } catch (error) {
        console.error(`查看故事失败 (ID: ${storyId}):`, error);
        this.handleShowMessage({ title: 'error', message: `查看故事失败: ${error.message}` });
        this.selectedStory = null; // Clear selection on error
      }
    },

    /**
     * Prepare for export (same as view for now)
     */
    prepareExport(node) {
      this.viewStory(node); // Simply view the story content when "Export" is clicked on a node
    },

    /**
     * Export selected story in a specific format
     */
    async exportStory(format) {
      if (!this.selectedStory) {
         this.handleShowMessage({ title: 'warning', message: '请先选择一个故事节点进行预览' });
         return;
      }

      this.isExporting = true;
      this.exportingMessage = `正在导出 ${format.toUpperCase()} 格式...`;

      try {
        const fileName = `${this.storyTitle}_story_${this.selectedStory.id}_${format}`;
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
          default:
             throw new Error(`不支持的导出格式: ${format}`);
        }

        // Note: downloadFile already handles potential download errors and shows a toast
        // So, if downloadFile succeeds without throwing, we show success toast
         this.handleShowMessage({ title: 'success', message: `成功导出为 ${format.toUpperCase()} 格式` });

      } catch (error) {
        console.error(`导出故事失败:`, error);
        // If an error occurred before calling downloadFile, show it here
        if (!error.message.includes('下载失败')) { // Avoid duplicate toast
             this.handleShowMessage({ title: 'error', message: `导出失败: ${error.message}` });
        }
      } finally {
        this.isExporting = false;
        this.exportingMessage = '';
      }
    },

    /**
     * Handle messages emitted from child components (StoryNode)
     */
    handleShowMessage(payload) {
       // Forward the message event upwards to the parent (ManageStory)
       // ManageStory will then forward it to Manage, which forwards to App.vue
       this.$emit('show-message', payload);
    },

    // Optional: Method to close the modal itself (if ExportStory is used in a modal)
    // This method should be called by a close button in the modal header (handled by parent)
    closeModal() {
       this.$emit('close'); // Emit 'close' event to parent (ManageStory.vue)
    }
  }
};
</script>

<style scoped>
/* Outer container styles */
.export-story-page {
   padding: 15px; /* Add some padding */
   display: flex;
   flex-direction: column;
   height: 100%; /* Fill parent modal height */
   box-sizing: border-box; /* Include padding in height calculation */
}

/* Main content wrapper for split layout */
.content-wrapper {
  display: flex;
  gap: 20px; /* Space between tree and preview sections */
  flex-grow: 1; /* Allow wrapper to fill space */
  min-height: 0; /* Crucial for flex children with overflow */
}

/* Shared styles for tree and preview sections */
.choice-tree-section, .preview-section {
  /* Inherit .card styles */
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Contain content */
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0; /* Prevent title from shrinking */
}


/* Choice Tree Section Specifics */
.choice-tree-section {
  flex: 0 0 350px; /* Fixed width for tree or a preferred flex basis */
  min-width: 280px;
  max-height:500px;
}

.tree-container {
  flex-grow: 1; /* Allow tree container to fill space */
  overflow-y: auto; /* Enable scrolling for the tree */
  /* padding-right: 10px; Optional: Add padding for scrollbar */
}

.loading-indicator, .error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 150px;
  color: var(--text-secondary);
}
.loading-icon { /* Specific to this component */
    font-size: 2rem;
    color: var(--primary-color);
    margin-bottom: 15px;
}

.error-message {
    color: var(--danger-color);
    background-color: rgba(var(--danger-color-rgb, 231, 76, 60), 0.1);
    border: 1px solid var(--danger-color);
    border-radius: var(--border-radius-md);
    padding: 15px;
}
.error-message .svg-inline--fa {
    font-size: 1.5rem;
    margin-bottom: 10px;
}

.tree-content {
   /* Container for the actual ul.tree */
   /* No specific styles needed if ul.tree handles its own layout */
}

.tree {
  list-style: none;
  padding: 0;
  margin: 0;
}

.empty-tree-state {
    text-align: center;
    padding: 30px 15px;
    color: var(--text-tertiary);
    min-height: 150px;
}
.empty-tree-state .svg-inline--fa {
    font-size: 2rem;
    margin-bottom: 15px;
    color: var(--warning-color);
}


/* Preview Section Specifics */
.preview-section {
  flex: 1; /* Allow preview to take remaining space */
  min-width: 400px;
  max-height:500px;
  opacity: 0.5; /* Dim when not active */
  pointer-events: none; /* Prevent interaction when not active */
  transition: opacity 0.3s ease;
}
.preview-section.active {
  opacity: 1;
  pointer-events: auto;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  flex-shrink: 0;
  /* .section-title has bottom border, no need here */
}
.preview-header .section-title {
    margin-bottom: 0;
    border-bottom: none;
    flex-shrink: 1; /* Allow shrinking */
}


.format-controls {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto; /* Push formats to the right */
}
.format-btn {
    /* Uses btn btn-sm btn-outline */
    padding: 4px 10px;
    font-size: 0.85rem;
}
.active-format {
   background-color: var(--primary-color);
   color: white;
   border-color: var(--primary-color);
}
.active-format:hover {
    background-color: var(--primary-dark);
    border-color: var(--primary-dark);
}




.preview-body {
  flex-grow: 1; /* Allow body to take available space */
  overflow-y: auto; /* Enable scrolling for preview content */
  padding-bottom: 15px;
   padding-right: 10px; /* Space for scrollbar */
   margin-right: -10px; /* Compensate for padding */
}

.no-selection {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-tertiary);
}
.placeholder-icon { /* Specific to preview placeholder */
    font-size: 2.5rem;
    margin-bottom: 15px;
    color: var(--text-tertiary);
}


.story-meta {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}
.story-id {
   /* Uses badge badge-primary */
   margin-right: 15px;
}
.story-path {
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.preview-text pre {
  white-space: pre-wrap; /* Wrap text in pre */
  word-wrap: break-word;
  background-color: var(--surface-color);
  padding: 15px;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 0.95rem;
  line-height: 1.6;
}

/* Styling for the generated HTML preview content */
/* These styles are included IN the generated HTML itself */
.styled-html-preview {
    /* No direct styles here, refer to inline styles in formattedStoryHtml computed property */
    /* However, ensure overflow works correctly */
}


.preview-json pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: var(--surface-color);
  padding: 15px;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 0.95rem;
  line-height: 1.6;
}

.preview-footer {
    flex-shrink: 0; /* Prevent footer from shrinking */
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid var(--border-color);
}

.export-options {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    justify-content: space-between;
}

.include-previous-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    /* Uses global switch styles */
}
.include-previous-toggle .toggle-label {
     font-size: 0.95rem;
     color: var(--text-secondary);
}

.export-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
.export-btn {
    /* Uses global btn classes */
    padding: 8px 16px;
    font-size: 0.95rem;
}

/* Loading Overlay */
.loading-overlay {
  position: absolute; /* Position relative to parent modal content */
  inset: 0; /* Cover the whole modal content */
  background-color: rgba(var(--surface-color-rgb, 249, 249, 249), 0.8); /* Use surface color with opacity */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1; /* Above preview content but below modal header/footer */
  backdrop-filter: blur(2px);
  border-radius: var(--border-radius-lg); /* Match parent border radius */
}
.dark-theme .loading-overlay {
   background-color: rgba(var(--surface-color-rgb, 30, 30, 30), 0.8);
}

.loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    color: var(--text-primary);
}


/* Tooltip Styles (Copied from Manage.vue for consistency) */
.tooltip-container {
  position: relative;
  cursor: help;
}
.tooltip-text {
  visibility: hidden; width: 200px; background-color: var(--text-primary);
  color: var(--background-color); text-align: center; border-radius: var(--border-radius-sm);
  padding: 5px 8px; position: absolute; z-index: 1; bottom: 125%; left: 50%;
  margin-left: -100px; opacity: 0; transition: opacity 0.3s; font-size: 0.8rem; font-weight: normal;
  white-space: normal; /* Allow text to wrap */
}
.tooltip-text::after {
  content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px;
  border-width: 5px; border-style: solid; border-color: var(--text-primary) transparent transparent transparent;
}
.tooltip-container:hover .tooltip-text { visibility: visible; opacity: 1; }
.dark-theme .tooltip-text { background-color: var(--surface-color); color: var(--text-primary); }
.dark-theme .tooltip-text::after { border-top-color: var(--surface-color); }


/* Responsive */
@media (max-width: 768px) {
    .content-wrapper {
        flex-direction: column; /* Stack tree and preview */
        gap: 15px;
    }
    .choice-tree-section, .preview-section {
        flex: none; /* Remove flex constraints when stacked */
        min-width: 0;
    }
    .preview-section {
        order: -1; /* Place preview above tree on mobile */
        opacity: 1; /* Always active when stacked */
        pointer-events: auto;
    }
    .preview-header {
        flex-direction: column; /* Stack header elements */
        align-items: flex-start;
        gap: 10px;
    }
    .preview-header .section-title {
        margin-bottom: 0;
    }
    .format-controls, .export-buttons {
        margin-left: 0; /* Align left */
        width: 100%; /* Full width buttons */
        justify-content: center; /* Center buttons */
    }
     .export-options {
         flex-direction: column;
         align-items: stretch;
         gap: 15px;
     }
     .export-buttons {
        flex-direction: column;
        gap: 8px;
     }
     .export-btn {
        width: 100%;
     }
     .include-previous-toggle {
        width: 100%;
        justify-content: space-between; /* Spread label and switch */
     }

}

</style>