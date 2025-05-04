<template>
  <div class="file-manager page-container">
    <!-- File Browser Area -->
    <div class="card file-browser-card">
      <!-- Path Navigation (Breadcrumb) -->
      <div class="breadcrumb">
        <span @click="navigateTo('/data')" class="breadcrumb-link">
          <font-awesome-icon :icon="['fas', 'home']" class="breadcrumb-icon-fa" />
          <span>首页</span>
        </span>
        <template v-if="currentTitle">
          <span class="separator">/</span>
          <span @click="navigateTo(`/data/${currentTitle}`)" class="breadcrumb-link">{{ currentTitle }}</span>
          <template v-for="(segment, index) in pathSegments" :key="index">
            <span class="separator">/</span>
            <span @click="navigateTo(buildPathUpTo(index + 1))" class="breadcrumb-link">{{ segment }}</span>
          </template>
        </template>
      </div>

      <!-- Action Buttons -->
      <div class="actions button-group">
        <button class="btn btn-sm btn-secondary" @click="showCreateFileModal = true" :disabled="!isDataSubpath">
          <font-awesome-icon :icon="['fas', 'file-circle-plus']" />
          新建文件
        </button>
         <button class="btn btn-sm btn-secondary" @click="showCreateFolderModal = true" :disabled="!isDataSubpath">
          <font-awesome-icon :icon="['fas', 'folder-plus']" />
          新建文件夹
        </button>
        <button class="btn btn-sm btn-info" @click="triggerFileUpload" :disabled="!isDataSubpath">
          <font-awesome-icon :icon="['fas', 'upload']" />
          上传文件
        </button>
        <button class="btn btn-sm btn-outline" @click="refreshCurrentPath()">
          <font-awesome-icon :icon="['fas', 'sync-alt']" />
          刷新
        </button>
      </div>
      <!-- Hidden file input -->
      <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none;" multiple /> <!-- Allow multiple? Changed to single based on handleFileUpload -->

      <!-- Files Table -->
      <div class="files-container">
        <table class="files-table">
          <thead>
            <tr>
              <th class="col-name">名称</th>
              <th class="col-type">类型</th>
              <th class="col-size">大小</th>
              <th class="col-actions">操作</th>
            </tr>
          </thead>
          <tbody>
            <!-- Navigate Up Row -->
            <tr v-if="canNavigateUp" class="item-row folder-row navigate-up-row" @click="navigateUp()" tabindex="0" @keyup.enter="navigateUp">
              <td colspan="4" class="navigate-up-cell">
                  <font-awesome-icon :icon="['fas', 'level-up-alt']" class="item-icon-fa folder-icon-fa" />
                  返回上级...
              </td>
              <!-- Empty cells for alignment -->
              <!-- <td></td>
              <td></td>
              <td></td> -->
            </tr>
            <!-- File/Folder Rows -->
            <tr v-for="item in items" :key="item.path" :class="['item-row', { 'folder-row': item.isFolder }]" tabindex="0" @keyup.enter="handleItemClick(item)" @dblclick="handleItemClick(item)">
              <td class="col-name" @click="handleItemClick(item)">
                <font-awesome-icon :icon="['fas', getItemIconName(item)]"
                  :class="['item-icon-fa', { 'folder-icon-fa': item.isFolder }]" />
                <span class="item-name">{{ item.name }}</span>
              </td>
              <td class="col-type">{{ item.isFolder ? '文件夹' : getFileType(item.name) }}</td>
              <td class="col-size">{{ item.isFolder ? '-' : formatSize(item.size) }}</td>
              <td class="col-actions actions-cell">
                 <!-- Actions: Preview, Edit, Rename, Download, Delete -->
                 <button v-if="!item.isFolder && canPreview(item.name)" class="btn btn-text btn-xs" @click.stop="handlePreview(item)" title="预览">
                    <font-awesome-icon :icon="['fas', 'eye']" />
                 </button>
                 <button v-if="!item.isFolder && canEdit(item.name)" class="btn btn-text btn-xs" @click.stop="handleEdit(item)" title="编辑">
                    <font-awesome-icon :icon="['fas', 'pen-to-square']" />
                 </button>
                  <button class="btn btn-text btn-xs" @click.stop="handleRename(item)" title="重命名">
                    <font-awesome-icon :icon="['fas', 'pen']" />
                  </button>
                  <button v-if="!item.isFolder" class="btn btn-text btn-xs" @click.stop="downloadFile(item)" title="下载">
                    <font-awesome-icon :icon="['fas', 'download']" />
                  </button>
                  <button class="btn btn-text btn-xs text-danger" @click.stop="handleDelete(item)" title="删除">
                    <font-awesome-icon :icon="['fas', 'trash-alt']" />
                  </button>
              </td>
            </tr>
            <!-- Empty Folder Message -->
            <tr v-if="items.length === 0 && canNavigateUp" class="empty-row">
              <td colspan="4" class="empty-message">
                <font-awesome-icon :icon="['fas', 'folder-open']" class="empty-icon-fa" />
                此文件夹为空
              </td>
            </tr>
            <!-- Empty Root Message (/data) -->
             <tr v-if="items.length === 0 && !canNavigateUp" class="empty-row">
              <td colspan="4" class="empty-message">
                <font-awesome-icon :icon="['fas', 'info-circle']" class="empty-icon-fa" />
                没有可用的项目或配置。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals -->
    <!-- Create File Modal -->
    <div class="modal" v-if="showCreateFileModal" @click.self="showCreateFileModal = false">
      <div class="modal-content card">
        <div class="modal-header">
          <h2 class="modal-title">创建新文件</h2>
          <button class="close-btn btn btn-text btn-sm" @click="showCreateFileModal = false" title="关闭">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="file-name" class="form-label">文件名: <span class="required">*</span></label>
            <input type="text" id="file-name" v-model="newFileName" placeholder="例如: config.json, notes.txt" class="input">
          </div>
          <div class="form-group">
            <label for="file-content" class="form-label">文件内容:</label>
            <textarea id="file-content" v-model="newFileContent" rows="8" placeholder="输入文件内容 (可选)" class="input textarea-input"></textarea>
          </div>
        </div>
         <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCreateFileModal = false">取消</button>
            <button class="btn btn-primary" @click="createFile">创建</button>
          </div>
      </div>
    </div>

    <!-- Create Folder Modal -->
     <div class="modal" v-if="showCreateFolderModal" @click.self="showCreateFolderModal = false">
      <div class="modal-content card">
        <div class="modal-header">
          <h2 class="modal-title">创建新文件夹</h2>
          <button class="close-btn btn btn-text btn-sm" @click="showCreateFolderModal = false" title="关闭">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="folder-name" class="form-label">文件夹名: <span class="required">*</span></label>
            <input type="text" id="folder-name" v-model="newFolderName" placeholder="例如: images, audio_clips" class="input">
          </div>
        </div>
         <div class="modal-footer">
            <button class="btn btn-secondary" @click="showCreateFolderModal = false">取消</button>
            <button class="btn btn-primary" @click="createFolder">创建</button>
          </div>
      </div>
    </div>

    <!-- Rename Modal -->
     <div class="modal" v-if="showRenameModal" @click.self="showRenameModal = false">
      <div class="modal-content card">
        <div class="modal-header">
          <h2 class="modal-title">重命名{{ selectedItem && selectedItem.isFolder ? '文件夹' : '文件' }}</h2>
          <button class="close-btn btn btn-text btn-sm" @click="showRenameModal = false" title="关闭">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
             <label for="rename-name" class="form-label">原名称:</label>
             <input type="text" :value="selectedItem ? selectedItem.name : ''" class="input" readonly disabled>
          </div>
          <div class="form-group">
            <label for="rename-name" class="form-label">新名称: <span class="required">*</span></label>
            <input type="text" id="rename-name" v-model="newItemName" placeholder="输入新名称" class="input" @keyup.enter="renameItem">
          </div>
        </div>
         <div class="modal-footer">
            <button class="btn btn-secondary" @click="showRenameModal = false">取消</button>
            <button class="btn btn-primary" @click="renameItem">确认</button>
          </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="modal" v-if="showDeleteModal" @click.self="showDeleteModal = false">
      <div class="modal-content delete-confirm-modal card">
        <div class="modal-header">
          <h2 class="modal-title">确认删除</h2>
           <button class="close-btn btn btn-text btn-sm" @click="showDeleteModal = false" title="关闭">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="delete-confirmation">
             <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="warning-icon-fa" />
             <p>确定要删除 {{ selectedItem && selectedItem.isFolder ? '文件夹' : '文件' }}
                <strong>"{{ selectedItem ? selectedItem.name : '' }}"</strong> 吗？
             </p>
             <p v-if="selectedItem && selectedItem.isFolder" class="delete-warning">
                 警告：删除文件夹将会永久删除其中的所有内容！此操作无法撤销。
             </p>
              <p v-else class="delete-warning">
                 此操作无法撤销。
             </p>
          </div>
        </div>
         <div class="modal-footer">
            <button class="btn btn-secondary" @click="showDeleteModal = false">取消</button>
            <button class="btn btn-danger" @click="deleteItem">确认删除</button>
          </div>
      </div>
    </div>

    <!-- File Preview Modal -->
     <div class="modal" v-if="showPreviewModal" @click.self="closePreview">
      <div class="modal-content preview-modal card">
        <div class="modal-header">
          <h2 class="modal-title">{{ selectedItem ? selectedItem.name : '' }} 预览</h2>
          <button class="close-btn btn btn-text btn-sm" @click="closePreview" title="关闭">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body preview-body">
          <div v-if="previewLoading" class="modal-loading">
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon-fa large" />
            <span>加载中...</span>
          </div>
          <div v-else-if="previewError" class="modal-error error-message">
             <font-awesome-icon :icon="['fas', 'circle-xmark']" class="modal-error-icon-fa" />
            <span>{{ previewError }}</span>
          </div>
          <div v-else class="preview-content">
            <!-- JSON Preview -->
            <div v-if="isJsonFile(selectedItem?.name) && isValidJson(previewContent)" class="json-preview">
               <vue-json-pretty :data="parseJsonContent(previewContent)" :deep="5" :show-double-quotes="true"
                :show-length="true" :show-line="true" :show-icon="true" :showLineNumber="true" editable></vue-json-pretty>
            </div>
            <!-- Image Preview -->
            <div v-else-if="isImageFile(selectedItem?.name)" class="image-preview">
              <img :src="previewContent" :alt="selectedItem?.name">
            </div>
            <!-- Audio Preview -->
            <div v-else-if="isAudioFile(selectedItem?.name)" class="audio-preview">
              <audio
        ref="audioPreviewPlayer"
        controls
        :src="previewContent"
        :type="getAudioMimeType(selectedItem?.name)"
        @loadedmetadata="handleAudioMetadataLoaded"  
    >
                您的浏览器不支持音频播放
              </audio>
            </div>
            <!-- Video Preview -->
            <div v-else-if="isVideoFile(selectedItem?.name)" class="video-preview">
              <video controls :src="previewContent" :type="getVideoMimeType(selectedItem?.name)">
                您的浏览器不支持视频播放
              </video>
            </div>
            <!-- Text/Code/Default Preview -->
            <div v-else class="text-preview">
              <pre><code>{{ previewContent }}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- File Edit Modal -->
    <div class="modal" v-if="showEditModal" @click.self="closeEdit(false)">
      <div class="modal-content edit-modal card">
        <div class="modal-header">
          <h2 class="modal-title">编辑文件: {{ selectedItem ? selectedItem.name : '' }}</h2>
           <button class="close-btn btn btn-text btn-sm" @click="closeEdit(false)" title="关闭">
            <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="editError" class="edit-error error-message">
            <font-awesome-icon :icon="['fas', 'circle-xmark']" class="modal-error-icon-fa"/>
            <span>{{ editError }}</span>
          </div>
          <div class="form-group">
             <!-- Consider using a proper code editor component here for better experience -->
            <textarea class="input textarea-input edit-textarea" v-model="editContent" rows="20"></textarea>
          </div>
        </div>
         <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeEdit(false)">取消</button>
            <button class="btn btn-primary" @click="saveEditedContent">保存</button>
          </div>
      </div>
    </div>

    <!-- Local Notification removed, using $emit -->

  </div>
</template>

<script>
// --- SCRIPT REMAINS THE SAME ---
import {
  readFile,
  writeFile,
  deletePath,
  renamePath,
  listDirectory,
  getMetadata,
  getAllTitles,
  createFolder as createFolderFs // Alias to avoid conflict if needed, though not used here
} from './services/IndexedDBFileSystem';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

export default {
  name: 'FileManager',
  components: {
    VueJsonPretty
  },
   emits: ['show-message'], // Declare event
  data() {
    return {
      titles: [],
      currentTitle: '',
      currentPath: '/data',
      pathSegments: [],
      items: [],
      showCreateFileModal: false,
      showCreateFolderModal: false,
      showRenameModal: false,
      showDeleteModal: false,
      showPreviewModal: false,
      showEditModal: false,
      newFileName: '',
      newFileContent: '',
      newFolderName: '',
      newItemName: '',
      editContent: '',
      editError: '',
      originalJsonValid: false,
      selectedItem: null,
      previewLoading: false,
      previewError: '',
      previewContent: null,
      // Local notification removed
      // notification: { show: false, message: '', type: 'info', timeout: null }
    };
  },
   computed: {
     // Helper computed property to check if the current path allows modifications
     isDataSubpath() {
       return this.currentPath && this.currentPath !== '/data';
     },
     canNavigateUp() {
        // Can navigate up if we are not in the root /data directory
        return this.currentPath && this.currentPath !== '/data';
     }
   },
  mounted() {
    this.navigateTo('/data');
    this.loadTitles();
  },
  methods: {
    async loadTitles() {
      try {
        this.titles = await getAllTitles();
      } catch (error) {
        console.error('加载标题失败:', error);
        this.handleShowMessage({ title: 'error', message: '加载标题失败' }); // Use emit
      }
    },
    selectTitle(title) {
      this.currentTitle = title;
      this.navigateTo(`/data/${title}`);
    },
    buildPathUpTo(index) {
      let path = `/data/${this.currentTitle}`;
      for (let i = 0; i < index; i++) { path += `/${this.pathSegments[i]}`; }
      return path;
    },
    async navigateTo(path) {
      try {
        this.currentPath = path;
        const pathParts = path.split('/').filter(Boolean);
        if (pathParts.length > 1) {
          this.currentTitle = pathParts[1];
          this.pathSegments = pathParts.slice(2);
        } else {
          this.currentPath = '/data';
          this.currentTitle = '';
          this.pathSegments = [];
        }
        await this.loadCurrentPath();
      } catch (error) {
        console.error('导航失败:', error);
        this.handleShowMessage({ title: 'error', message: '导航失败: ' + error.message }); // Use emit
      }
    },
    navigateUp() {
       if (this.pathSegments.length === 0 && this.currentTitle !== '') { this.navigateTo('/data'); return; }
       const lastSlashIndex = this.currentPath.lastIndexOf('/');
       if (lastSlashIndex > 0) { this.navigateTo(this.currentPath.substring(0, lastSlashIndex)); }
    },
    async loadCurrentPath() {
      this.items = []; // Clear items while loading
      try {
        if (this.currentPath === '/data') {
          await this.loadTitles();
          this.items = this.titles.map(title => ({ name: title, isFolder: true, path: `/data/${title}`, size: 0 }));
          return;
        }
        const listedItems = await listDirectory(this.currentPath);
         // Fetch metadata in parallel
        const itemsWithMetadata = await Promise.all(listedItems.map(async (item) => {
             try {
                 const metadata = await getMetadata(item.path);
                 return { ...item, size: metadata.size };
             } catch (error) {
                 console.warn(`获取 ${item.path} 元信息失败:`, error);
                 return { ...item, size: undefined }; // Use undefined for failed size
             }
         }));

         // Sort: folders first, then by name
         this.items = itemsWithMetadata.sort((a, b) => {
             if (a.isFolder && !b.isFolder) return -1;
             if (!a.isFolder && b.isFolder) return 1;
             return a.name.localeCompare(b.name); // Sort alphabetically
         });
      } catch (error) {
        console.error('加载路径内容失败:', error);
        this.handleShowMessage({ title: 'error', message: '加载目录内容失败' }); // Use emit
        this.items = [];
      }
    },
    refreshCurrentPath() {
      this.loadCurrentPath();
      this.handleShowMessage({ title: 'info', message: '已刷新' }); // Use emit
    },
    handleItemClick(item) {
      if (item.isFolder) { this.navigateTo(item.path); }
      else {
        if (this.canPreview(item.name)) { this.handlePreview(item); }
        else if (this.canEdit(item.name)) { this.handleEdit(item); }
        else { this.handleShowMessage({ title: 'info', message: '此文件类型不支持预览或编辑' }); } // Use emit
      }
    },
    handleRename(item) { this.selectedItem = item; this.newItemName = item.name; this.showRenameModal = true; },
    async renameItem() {
       if (!this.newItemName?.trim() || this.newItemName.trim() === this.selectedItem.name) {
         this.showRenameModal = false;
         if (!this.newItemName?.trim()) this.handleShowMessage({ title: 'error', message: '新名称不能为空' }); return; // Use emit
       }
       if (this.newItemName.includes('/') || this.newItemName.includes('\\')) {
         this.handleShowMessage({ title: 'error', message: '名称不能包含斜杠或反斜杠' }); return; // Use emit
       }
       try {
         await renamePath(this.selectedItem.path, this.newItemName.trim());
         this.handleShowMessage({ title: 'success', message: '重命名成功' }); // Use emit
         this.showRenameModal = false; this.loadCurrentPath();
       } catch (error) {
         console.error('重命名失败:', error);
         this.handleShowMessage({ title: 'error', message: '重命名失败: ' + (error.message || '未知错误') }); // Use emit
       }
    },
    handleDelete(item) { this.selectedItem = item; this.showDeleteModal = true; },
    async deleteItem() {
      try {
        await deletePath(this.selectedItem.path);
        this.handleShowMessage({ title: 'success', message: `${this.selectedItem.isFolder ? '文件夹' : '文件'} "${this.selectedItem.name}" 已删除` }); // Use emit
        this.showDeleteModal = false; this.loadCurrentPath();
      } catch (error) {
        console.error('删除失败:', error);
        this.handleShowMessage({ title: 'error', message: '删除失败: ' + (error.message || '未知错误') }); // Use emit
      }
    },
     async createFile() {
        if (!this.newFileName?.trim()) { this.handleShowMessage({ title: 'error', message: '请输入文件名'}); return; } // Use emit
        if (this.newFileName.includes('/') || this.newFileName.includes('\\')) { this.handleShowMessage({ title: 'error', message: '文件名不能包含斜杠或反斜杠'}); return; } // Use emit
        try {
            const filePath = `${this.currentPath}/${this.newFileName.trim()}`;
            await writeFile(filePath, this.newFileContent);
            this.handleShowMessage({ title: 'success', message: `文件 "${this.newFileName.trim()}" 已创建`}); // Use emit
            this.newFileName = ''; this.newFileContent = ''; this.showCreateFileModal = false; this.loadCurrentPath();
        } catch (error) {
            console.error('创建文件失败:', error);
            this.handleShowMessage({ title: 'error', message: '创建文件失败: ' + (error.message || '未知错误')}); // Use emit
        }
    },
    async createFolder() {
        if (!this.newFolderName?.trim()) { this.handleShowMessage({ title: 'error', message: '请输入文件夹名'}); return; } // Use emit
        if (this.newFolderName.includes('/') || this.newFolderName.includes('\\')) { this.handleShowMessage({ title: 'error', message: '文件夹名不能包含斜杠或反斜杠'}); return; } // Use emit
        try {
            const folderPath = `${this.currentPath}/${this.newFolderName.trim()}`;
            await createFolderFs(folderPath);
            this.handleShowMessage({ title: 'success', message: `文件夹 "${this.newFolderName.trim()}" 已创建`}); // Use emit
            this.newFolderName = ''; this.showCreateFolderModal = false; this.loadCurrentPath();
        } catch (error) {
            console.error('创建文件夹失败:', error);
            this.handleShowMessage({ title: 'error', message: '创建文件夹失败: ' + (error.message || '未知错误')}); // Use emit
        }
    },
    async handlePreview(item) {
      this.selectedItem = item; this.showPreviewModal = true; this.previewLoading = true; this.previewError = ''; this.previewContent = null;
      try {
        const content = await readFile(item.path);
        if ((this.isImageFile(item.name) || this.isAudioFile(item.name) || this.isVideoFile(item.name)) && content instanceof Blob) {
          this.previewContent = URL.createObjectURL(content);
          // Check if it's specifically an audio file before trying to play
        } else if (this.isJsonFile(item.name) && typeof content === 'object') {
          this.previewContent = content; // Assign object directly for vue-json-pretty
        } else {
           // Assume text-like content, handle ArrayBuffer conversion if needed
           if (content instanceof ArrayBuffer) {
               try { this.previewContent = new TextDecoder().decode(content); }
               catch(decodeError) {
                   console.error("Failed to decode ArrayBuffer:", decodeError);
                   throw new Error("无法解码文件内容"); // Throw specific error
               }
           } else {
               this.previewContent = content; // Assume string or handled type
           }
        }
        this.previewLoading = false;
      } catch (error) {
        console.error('预览失败:', error);
        this.previewError = '加载预览失败: ' + (error.message || '未知错误'); this.previewLoading = false; this.previewContent = null;
      }
    },
     closePreview() {
        // Revoke URL only if it's a string (created by createObjectURL)
        if (this.previewContent && typeof this.previewContent === 'string' && this.previewContent.startsWith('blob:')) {
            URL.revokeObjectURL(this.previewContent);
        }
        this.showPreviewModal = false; this.previewContent = null; this.previewError = ''; this.selectedItem = null;
    },
    async handleEdit(item) {
      this.selectedItem = item; this.showEditModal = true; this.editError = ''; this.editContent = '';
      try {
        const content = await readFile(item.path);
        if (this.isJsonFile(item.name)) {
           // Always store the string representation for editing
           this.originalJsonValid = this.isValidJson(content);
           if (typeof content === 'object') { this.editContent = JSON.stringify(content, null, 2); }
           else { this.editContent = String(content); } // Convert non-object content to string
        } else {
            // Handle ArrayBuffer for text-like files
            if (content instanceof ArrayBuffer) {
                 try { this.editContent = new TextDecoder().decode(content); }
                 catch(decodeError) {
                     console.error("Failed to decode ArrayBuffer for edit:", decodeError);
                     throw new Error("无法解码文件内容进行编辑");
                 }
            } else {
                 this.editContent = String(content); // Convert other types to string
            }
        }
      } catch (error) {
        console.error('加载编辑内容失败:', error);
        this.editError = '加载文件内容失败: ' + (error.message || '未知错误'); this.editContent = '';
      }
    },
    closeEdit(saved = false) {
        // Simplified close logic, always close without complex unsaved check
        this.showEditModal = false; this.editContent = ''; this.editError = ''; this.selectedItem = null;
    },
    async saveEditedContent() {
      if (!this.selectedItem) { this.closeEdit(true); return; }
      let contentToSave = this.editContent; // Content is already a string
      try {
         // Validate JSON format if necessary before saving
        if (this.isJsonFile(this.selectedItem.name)) {
             try {
                 const parsedJson = JSON.parse(contentToSave); // Attempt to parse
                 // If successful parsing is needed to save as object (optional):
                 // contentToSave = parsedJson;
             } catch (jsonError) {
                 this.editError = '无效的JSON格式，无法保存';
                 this.handleShowMessage({ title: 'error', message: '无效的JSON格式，请修正后再保存' });
                 return;
             }
        }
        // Save the content (currently string)
        await writeFile(this.selectedItem.path, contentToSave);
        this.handleShowMessage({ title: 'success', message: '文件保存成功'}); // Use emit
        this.closeEdit(true); this.loadCurrentPath();
      } catch (error) {
        console.error('保存文件失败:', error);
        this.editError = '保存文件失败: ' + (error.message || '未知错误');
        this.handleShowMessage({ title: 'error', message: '保存文件失败'}); // Use emit
      }
    },
    async downloadFile(item) {
      try {
        const content = await readFile(item.path);
        let blob; let fileName = item.name;
        if (content instanceof Blob) { blob = content; }
        else if (typeof content === 'object') { blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json'}); }
        else { blob = new Blob([content], { type: this.isJsonFile(fileName) ? 'application/json' : 'application/octet-stream' }); } // Default to octet-stream

        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = fileName; document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
        this.handleShowMessage({ title: 'success', message: `文件 "${fileName}" 下载成功`}); // Use emit
      } catch (error) {
        console.error('下载文件失败:', error);
        this.handleShowMessage({ title: 'error', message: '下载文件失败: ' + (error.message || '未知错误')}); // Use emit
      }
    },
    // --- handleShowMessage method to emit event ---
    handleShowMessage(payload) {
        this.$emit('show-message', payload);
        console.log(`[FileManager][${payload.title?.toUpperCase()}] ${payload.message}`);
    },
    formatSize(size) {
       if (size === undefined || size === null) return '-'; // Handle undefined from metadata failure
       if (size === 0) return '0 B'; // Show 0 B explicitly
       if (size < 1024) return `${size} B`;
       if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`; // Use 1 decimal for KB/MB
       return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    },
    getFileType(filename) {
      if (!filename) return '未知';
      const extension = filename.split('.').pop()?.toLowerCase() || '';
      const typeMap = { 'txt': '文本', 'json': 'JSON', 'js': 'JavaScript', 'html': 'HTML', 'css': 'CSS', 'png': 'PNG图片', 'jpg': 'JPG图片', 'jpeg': 'JPEG图片', 'gif': 'GIF图片', 'md': 'Markdown', 'wav': 'WAV音频', 'mp3': 'MP3音频', 'mp4': 'MP4视频' };
      return typeMap[extension] || `${extension.toUpperCase()} 文件`;
    },
     getItemIconName(item) {
        if (item.isFolder) return 'folder';
        const extension = item.name.split('.').pop()?.toLowerCase() || '';
        const iconNameMap = { 'txt': 'file-lines', 'json': 'file-code', 'js': 'file-code', 'html': 'file-code', 'css': 'file-code', 'png': 'file-image', 'jpg': 'file-image', 'jpeg': 'file-image', 'gif': 'file-image', 'md': 'file-lines', 'wav': 'file-audio', 'mp3': 'file-audio', 'mp4': 'file-video' };
        return iconNameMap[extension] || 'file';
    },
    canPreview(filename) {
        if (!filename) return false;
        const extension = filename.split('.').pop()?.toLowerCase() || '';
        const previewableExtensions = [ 'txt', 'json', 'js', 'html', 'css', 'md', 'png', 'jpg', 'jpeg', 'gif', 'wav', 'mp3', 'mp4' ];
        return previewableExtensions.includes(extension);
    },
    canEdit(filename) {
      if (!filename) return false;
      const extension = filename.split('.').pop()?.toLowerCase() || '';
      const editableExtensions = ['txt', 'json', 'js', 'html', 'css', 'md'];
      return editableExtensions.includes(extension);
    },
    isJsonFile(filename) { return !!filename && filename.toLowerCase().endsWith('.json'); },
    isValidJson(content) {
        if (typeof content === 'object' && content !== null) return true;
        if (typeof content !== 'string' || !content.trim()) return false;
        try { JSON.parse(content); return true; } catch (e) { return false; }
    },
    parseJsonContent(content) {
        if (typeof content === 'object' && content !== null) return content;
        try { return JSON.parse(content); } catch (e) { return null; }
    },
    isImageFile(filename) { return !!filename && /\.(png|jpg|jpeg|gif)$/i.test(filename); },
    isAudioFile(filename) { return !!filename && /\.(wav|mp3)$/i.test(filename); },
    isVideoFile(filename) { return !!filename && /\.(mp4)$/i.test(filename); },
    getAudioMimeType(filename) {
        if (!filename) return '';
        const extension = filename.split('.').pop()?.toLowerCase() || '';
        const mimeMap = { 'wav': 'audio/wav', 'mp3': 'audio/mpeg' };
        return mimeMap[extension] || '';
    },
    getVideoMimeType(filename) {
        if (!filename) return '';
        const extension = filename.split('.').pop()?.toLowerCase() || '';
        const mimeMap = { 'mp4': 'video/mp4' };
        return mimeMap[extension] || '';
    },
     triggerFileUpload() { this.$refs.fileInput.click(); },
     async handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) { event.target.value = null; return; }
        const file = files[0];
        const filePath = `${this.currentPath}/${file.name}`;
        try {
            let contentToSave = file; // Default to saving the File object
            if (this.isJsonFile(file.name)) {
                const textContent = await file.text();
                if (this.isValidJson(textContent)) { contentToSave = JSON.parse(textContent); }
                else {
                    contentToSave = textContent;
                    this.handleShowMessage({ title: 'warning', message: `文件 "${file.name}" 不是有效的JSON，将以纯文本保存`}); // Use emit
                }
            }
            await writeFile(filePath, contentToSave);
            this.handleShowMessage({ title: 'success', message: `文件 "${file.name}" 已上传`}); // Use emit
            this.loadCurrentPath();
        } catch (error) {
            console.error('上传文件失败:', error);
            this.handleShowMessage({ title: 'error', message: '上传文件失败: ' + (error.message || '未知错误')}); // Use emit
        } finally { event.target.value = null; }
    },
  
  handleAudioMetadataLoaded() {
    console.log("Audio metadata loaded, attempting to play...");
    const audioPlayer = this.$refs.audioPreviewPlayer; // Access the audio element via ref

    // Ensure the element exists and the play method is available
    if (audioPlayer && typeof audioPlayer.play === 'function') {
        // Attempt to play. play() returns a Promise.
        audioPlayer.play().catch(error => {
            // Catch potential errors like browser blocking autoplay
            console.warn("音频自动播放失败:", error);
            // You could optionally show a user message here if you want to inform them
            // this.handleShowMessage({ title: 'info', message: '浏览器阻止了自动播放，请手动点击播放。'});
        });
    } else {
         // This case shouldn't happen if the ref is correctly placed and the v-if is true,
         // but it's good practice to check.
        console.error("Audio player ref not found or play function missing when metadata loaded.");
    }
},
  }
};
</script>

<style scoped>
/* General Page / Component Styles */
.file-manager {
  padding: 15px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.file-browser-card {
  /* Inherits .card */
  padding: 20px;
  background-color: var(--surface-color);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--box-shadow);
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent content spill */
}

/* Breadcrumb Navigation */
.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap; /* Wrap on smaller screens */
  gap: 5px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.95rem;
}
.breadcrumb-link {
  display: inline-flex; /* Use inline-flex for icon alignment */
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: var(--border-radius-sm);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.breadcrumb-link:hover {
  background-color: var(--hover-overlay);
  color: var(--primary-color);
}
.breadcrumb-link:last-child {
  color: var(--text-primary);
  font-weight: 500;
  cursor: default;
  background-color: transparent;
}
.breadcrumb-icon-fa {
   color: var(--primary-color);
   margin-right: 2px; /* Adjust spacing */
}
.breadcrumb-link:last-child .breadcrumb-icon-fa {
   color: var(--text-primary); /* Match last item text */
}
.breadcrumb .separator {
  color: var(--text-tertiary);
  margin: 0 3px;
}

/* Action Buttons */
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}
.actions .btn { /* Apply styles to direct button children */
  /* Use global .btn .btn-sm etc. */
  gap: 6px; /* Space between icon and text */
}

/* Files Table Container */
.files-container {
  flex-grow: 1; /* Allow table container to fill space */
  overflow-y: auto; /* Enable vertical scroll for the table */
  margin: 0 -10px -10px -10px; /* Adjust padding for scrollbar visibility */
  padding: 0 10px 10px 10px;
}

/* Files Table */
.files-table {
  width: 100%;
  border-collapse: collapse;
}
.files-table th, .files-table td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--hover-overlay);
  white-space: nowrap;
}
.files-table th {
  font-weight: 500;
  color: var(--text-secondary);
  background-color: var(--background-color); /* Slightly different bg for header */
  font-size: 0.9rem;
  position: sticky; /* Make header sticky */
  top: 0;
  z-index: 1;
}

.item-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.item-row:hover, .item-row:focus-visible {
  background-color: var(--hover-overlay);
}

/* Column Specific Styles */
.col-name { width: 45%; }
.col-type { width: 20%; }
.col-size { width: 15%; text-align: right; }
.col-actions { width: 20%; text-align: right; }

/* Navigate Up Row Styles */
.navigate-up-row { font-weight: 500; color: var(--primary-color); }
.navigate-up-cell { /* Full width cell */ padding-left: 12px; /* Match name column padding */}

/* Item Name & Icon */
td.col-name {
  display: flex;
  align-items: center;
  gap: 10px;
  width:400px;
  overflow: hidden; /* Prevent long names from breaking layout */
}
.item-icon-fa {
  flex-shrink: 0;
  font-size: 1.1rem;
  color: var(--text-secondary);
}
.folder-icon-fa { color: var(--primary-color); } /* Folder icon color */
.item-name {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.folder-row .item-name { font-weight: 500; }

/* Item Actions */
.actions-cell { white-space: nowrap; } /* Prevent actions wrapping */
.actions-cell .btn { /* Style buttons within actions cell */
  margin-left: 4px;
  padding: 3px 5px; /* Smaller padding */
}
.actions-cell .btn .svg-inline--fa { font-size: 0.9em; } /* Smaller icons */
.actions-cell .text-danger .svg-inline--fa { color: var(--danger-color); } /* Ensure danger color */

/* Empty Row */
.empty-row td {
  text-align: center;
  padding: 30px;
  color: var(--text-tertiary);
}
.empty-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.empty-icon-fa { font-size: 1.2rem; }

/* Modal Styles */
.modal {
  position: fixed; inset: 0; background-color: rgba(0,0,0,0.6);
  display: flex; justify-content: center; align-items: center;
  z-index: 1050; padding: 20px; overflow-y: auto;
}
.modal-content {
  /* Inherits .card */
  width: 100%; background-color: var(--surface-color);
  border-radius: var(--border-radius-lg); box-shadow: var(--box-shadow-hover);
  display: flex; flex-direction: column; overflow: hidden;
  max-height: 65vh;
}
/* Modal Sizes */
.modal-content:not(.preview-modal):not(.edit-modal) { max-width: 500px; /* Default size */ }
.preview-modal { max-width: 80vw; /* Wider for preview */ }
.edit-modal { max-width: 700px; }
.delete-confirm-modal { max-width: 450px; }


.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--border-color); padding: 15px 20px; flex-shrink: 0;
}
.modal-title { font-size: 1.3rem; font-weight: 600; margin: 0; }
.modal-content .close-btn { /* Style close button inside modals */
   /* Uses btn btn-text btn-sm */ color: var(--text-secondary);
}
.modal-content .close-btn:hover { color: var(--danger-color); }
.modal-content .close-btn .svg-inline--fa { font-size: 1.2rem; }

.modal-body { padding: 25px 20px; overflow-y: auto; flex-grow: 1; }

/* Form elements in modals */
.form-group { margin-bottom: 18px; }
.form-label { /* Use global form styles */
    display: block; margin-bottom: 6px; color: var(--text-secondary); font-weight: 500;
}
.required { color: var(--danger-color); margin-left: 4px; }
.input, .textarea-input { /* Use global styles */ width: 100%; }
.textarea-input { min-height: 100px; resize: vertical; }

.form-actions {
    display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px;
}

/* Delete Confirmation */
.delete-confirmation { text-align: center; padding: 10px 0; }
.warning-icon-fa { font-size: 2.5rem; color: var(--warning-color); margin-bottom: 15px; }
.delete-confirmation p { margin: 5px 0; font-size: 1.05rem; }
.delete-warning { font-weight: bold; color: var(--danger-color); }

/* Preview Modal Specifics */
.preview-modal .modal-body { padding: 0; /* Remove padding, content handles it */ }
.preview-body { height: 70vh; /* Fixed height for preview area */ overflow: auto; } /* Allow scrolling */

.preview-loading {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; color: var(--text-secondary);
}
.loading-spinner-fa { font-size: 2.5rem; color: var(--primary-color); margin-bottom: 10px; }

.preview-error {
    display: flex; align-items: center; justify-content: center; height: 100%;
    padding: 20px; color: var(--danger-color); text-align: center;
    gap: 8px; font-size: 1.1rem;
}

.preview-content { height: 100%; } /* Ensure content fills the body */
.text-preview pre, .json-preview pre {
    margin: 0; padding: 20px; height: 100%; box-sizing: border-box;
    white-space: pre-wrap; word-break: break-all; font-size: 0.9rem;
    background-color: var(--background-color); color: var(--text-primary);
    font-family: monospace;
}
/* vue-json-pretty styling */
.json-preview .vjs-tree { padding: 20px !important; background-color: var(--background-color) !important; font-size: 0.9rem !important;}
.dark-theme .json-preview .vjs-tree { background-color: var(--background-color) !important; } /* Dark theme adjustments */


.image-preview {
    display: flex; justify-content: center; align-items: center; height: 100%; padding: 10px;
}
.image-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }

.audio-preview, .video-preview {
    display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; padding: 20px;
}
.audio-preview audio, .video-preview video { width: 100%; max-width: 600px; }
.audio-info { margin-top: 15px; text-align: center; color: var(--text-secondary); font-size: 0.9rem;}

/* Edit Modal Specifics */
.edit-modal .modal-body { padding: 15px; }
.edit-textarea {
    min-height: 400px; /* Taller textarea for editing */
    font-family: monospace;
    font-size: 0.95rem;
    line-height: 1.6;
}
.edit-error { /* Uses global .error-message */ margin-bottom: 15px; }

/* Notification removed, handled globally */

/* Responsive */
@media (max-width: 768px) {
    .file-manager { padding: 10px; }
    .file-browser-card { padding: 15px; }
    .breadcrumb { font-size: 0.9rem; margin-bottom: 15px; }
    .actions { margin-bottom: 15px; padding-bottom: 15px; }
    .actions .btn { font-size: 0.85rem; padding: 5px 10px; }

    .files-table th, .files-table td { padding: 8px 6px; }
    .col-type, .col-size { display: none; } /* Hide less important columns */
    .col-name { width: 60%; }
    .col-actions { width: 40%; }
    .item-icon-fa { font-size: 1rem; }
    .actions-cell .btn { margin-left: 2px; padding: 2px 4px;}
    .actions-cell .btn .svg-inline--fa { font-size: 0.8em; }

    .modal-content { max-width: 95%; }
    .preview-modal, .edit-modal { max-width: 95%; }
    .modal-body { padding: 15px; }
    .preview-body { height: 60vh; } /* Adjust preview height */
    .edit-textarea { min-height: 300px; }
}

</style>