<template>
  <div class="file-manager">
    <div class="main">
      <!-- 文件浏览区域 -->
      <div class="content">
        <!-- 路径导航 -->
        <div class="breadcrumb">
          <span @click="navigateTo('/data')">
            <!-- Replace emoji -->
            <!-- <span class="icon">🏠</span> -->
            <font-awesome-icon :icon="['fas', 'home']" class="breadcrumb-icon-fa" />
            首页
          </span>
          <template v-if="currentTitle">
            <span class="separator">/</span>
            <span @click="navigateTo(`/data/${currentTitle}`)">{{ currentTitle }}</span>

            <template v-for="(segment, index) in pathSegments" :key="index">
              <span class="separator">/</span>
              <span
                @click="navigateTo(buildPathUpTo(index + 1))"
              >{{ segment }}</span>
            </template>
          </template>
        </div>

        <!-- 操作按钮 -->
        <div class="actions">
          <button @click="showCreateFileModal = true" :disabled="!currentPath.startsWith('/data/')">
            <!-- Replace emoji -->
            <!-- <span class="icon">📄</span> -->
            <font-awesome-icon :icon="['fas', 'file']" class="btn-icon-fa" />
            新建文件
          </button>
          <button @click="triggerFileUpload" :disabled="!currentPath.startsWith('/data/')">
            <font-awesome-icon :icon="['fas', 'upload']" class="btn-icon-fa" />
            上传文件
          </button>
          <button @click="showCreateFolderModal = true" :disabled="!currentPath.startsWith('/data/')">
            <!-- Replace emoji -->
            <!-- <span class="icon">📁</span> -->
            <font-awesome-icon :icon="['fas', 'folder']" class="btn-icon-fa" />
            新建文件夹
          </button>
          <button @click="refreshCurrentPath()">
            <!-- Replace emoji -->
            <!-- <span class="icon">🔄</span> -->
            <font-awesome-icon :icon="['fas', 'sync-alt']" class="btn-icon-fa" />
            刷新
          </button>
        </div>

        <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none;">
        <!-- END ADDED -->

        <!-- 文件列表 -->
        <div class="files-container">
          <table class="files-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>大小</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="currentPath !== '/data' || pathSegments.length > 0" class="folder-row">
                <td @click="navigateUp()">
                  <!-- Replace emoji -->
                  <!-- <span class="icon">⬆️</span> -->
                  <font-awesome-icon :icon="['fas', 'level-up-alt']" class="item-icon-fa folder-icon-fa" />
                  返回上级
                </td>
                <td>文件夹</td>
                <td>-</td>
                <td>-</td>
              </tr>
              <tr
                v-for="item in items"
                :key="item.path"
                :class="['item-row', { 'folder-row': item.isFolder }]"
              >
                <td @click="handleItemClick(item)">
                  <!-- Replace emoji span with Font Awesome component -->
                  <!-- <span class="icon">{{ getItemIcon(item) }}</span> -->
                  <font-awesome-icon :icon="['fas', getItemIconName(item)]" :class="['item-icon-fa', { 'folder-icon-fa': item.isFolder }]" />
                  {{ item.name }}
                </td>
                <td>{{ item.isFolder ? '文件夹' : getFileType(item.name) }}</td>
                <td>{{ item.isFolder ? '-' : formatSize(item.size) }}</td>
                <td class="actions-cell">
                  <button @click="handleRename(item)" title="重命名">
                    <!-- Replace emoji -->
                    <!-- <span class="icon">✏️</span> -->
                    <font-awesome-icon :icon="['fas', 'pen']" class="action-btn-icon-fa" />
                  </button>
                  <button @click="handleDelete(item)" title="删除">
                    <!-- Replace emoji -->
                    <!-- <span class="icon">🗑️</span> -->
                    <font-awesome-icon :icon="['fas', 'trash-alt']" class="action-btn-icon-fa" />
                  </button>
                  <button
                    v-if="!item.isFolder && canPreview(item.name)"
                    @click="handlePreview(item)"
                    title="预览"
                  >
                    <!-- Replace emoji -->
                    <!-- <span class="icon">👁️</span> -->
                    <font-awesome-icon :icon="['fas', 'eye']" class="action-btn-icon-fa" />
                  </button>
                  <button
                    v-if="!item.isFolder && canEdit(item.name)"
                    @click="handleEdit(item)"
                    title="编辑"
                  >
                    <!-- Replace emoji -->
                    <!-- <span class="icon">✏️</span> -->
                    <font-awesome-icon :icon="['fas', 'pen-to-square']" class="action-btn-icon-fa" />
                  </button>
                  <button
                    v-if="!item.isFolder"
                    @click="downloadFile(item)"
                    title="下载"
                  >
                    <!-- Replace emoji -->
                    <!-- <span class="icon">⬇️</span> -->
                     <font-awesome-icon :icon="['fas', 'download']" class="action-btn-icon-fa" />
                  </button>
                </td>
              </tr>
              <tr v-if="items.length === 0 && (currentPath !== '/data' || pathSegments.length > 0)" class="empty-row">
                 <!-- Check if not at the very top level where titles are shown -->
                <td colspan="4" class="empty-message">
                  <!-- Replace emoji -->
                  <!-- <span class="icon">ℹ️</span> -->
                  <font-awesome-icon :icon="['fas', 'info-circle']" class="empty-icon-fa" />
                  此文件夹为空
                </td>
              </tr>
               <!-- Add message for empty /data level if titles are empty -->
               <tr v-if="currentPath === '/data' && items.length === 0" class="empty-row">
                    <td colspan="4" class="empty-message">
                         <font-awesome-icon :icon="['fas', 'info-circle']" class="empty-icon-fa" />
                        没有可用的项目。请先配置LLM、语音、绘画等设置。
                    </td>
               </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 创建文件模态框 -->
    <div class="modal" v-if="showCreateFileModal" @click.self="showCreateFileModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>创建新文件</h2>
          <!-- Replace close button text with Font Awesome -->
          <!-- <button class="close-btn" @click="showCreateFileModal = false">✖</button> -->
          <button class="close-btn" @click="showCreateFileModal = false">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="file-name">文件名:</label>
            <input type="text" id="file-name" v-model="newFileName" placeholder="请输入文件名">
          </div>
          <div class="form-group">
            <label for="file-content">文件内容:</label>
            <textarea id="file-content" v-model="newFileContent" rows="6" placeholder="请输入文件内容"></textarea>
          </div>
          <div class="form-actions">
            <button class="cancel-btn" @click="showCreateFileModal = false">取消</button>
            <button class="create-btn" @click="createFile">创建</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建文件夹模态框 -->
    <div class="modal" v-if="showCreateFolderModal" @click.self="showCreateFolderModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>创建新文件夹</h2>
           <!-- Replace close button text with Font Awesome -->
          <!-- <button class="close-btn" @click="showCreateFolderModal = false">✖</button> -->
           <button class="close-btn" @click="showCreateFolderModal = false">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="folder-name">文件夹名:</label>
            <input type="text" id="folder-name" v-model="newFolderName" placeholder="请输入文件夹名">
          </div>
          <div class="form-actions">
            <button class="cancel-btn" @click="showCreateFolderModal = false">取消</button>
            <button class="create-btn" @click="createFolder">创建</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 重命名模态框 -->
    <div class="modal" v-if="showRenameModal" @click.self="showRenameModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>重命名{{ selectedItem && selectedItem.isFolder ? '文件夹' : '文件' }}</h2>
           <!-- Replace close button text with Font Awesome -->
          <!-- <button class="close-btn" @click="showRenameModal = false">✖</button> -->
           <button class="close-btn" @click="showRenameModal = false">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="rename-name">新名称:</label>
            <input type="text" id="rename-name" v-model="newItemName" placeholder="请输入新名称">
          </div>
          <div class="form-actions">
            <button class="cancel-btn" @click="showRenameModal = false">取消</button>
            <button class="create-btn" @click="renameItem">确认</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div class="modal" v-if="showDeleteModal" @click.self="showDeleteModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>确认删除</h2>
           <!-- Replace close button text with Font Awesome -->
          <!-- <button class="close-btn" @click="showDeleteModal = false">✖</button> -->
           <button class="close-btn" @click="showDeleteModal = false">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <p>确定要删除{{ selectedItem && selectedItem.isFolder ? '文件夹' : '文件' }}
            <strong>{{ selectedItem ? selectedItem.name : '' }}</strong> 吗？</p>
          <p v-if="selectedItem && selectedItem.isFolder" class="warning">
            <!-- Replace emoji -->
            <!-- <span class="icon">⚠️</span> -->
             <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
            警告：删除文件夹将会删除其中的所有内容！
          </p>
          <div class="form-actions">
            <button class="cancel-btn" @click="showDeleteModal = false">取消</button>
            <button class="delete-btn" @click="deleteItem">确认删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件预览模态框 -->
    <div class="modal" v-if="showPreviewModal" @click.self="closePreview">
      <div class="modal-content preview-modal">
        <div class="modal-header">
          <h2>{{ selectedItem ? selectedItem.name : '' }} 预览</h2>
           <!-- Replace close button text with Font Awesome -->
          <!-- <button class="close-btn" @click="closePreview">✖</button> -->
           <button class="close-btn" @click="closePreview">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="previewLoading" class="preview-loading">
            <!-- Replace CSS spinner with Font Awesome spinner -->
            <!-- <div class="spinner"></div> -->
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-spinner-fa" />
            <span>加载中...</span>
          </div>
          <div v-else-if="previewError" class="preview-error">
            <!-- Replace emoji -->
            <!-- <span class="icon">❌</span> -->
             <font-awesome-icon :icon="['fas', 'circle-xmark']" />
            {{ previewError }}
          </div>
          <div v-else class="preview-content">
            <!-- 根据文件类型显示不同的预览 -->
            <div v-if="isJsonFile(selectedItem?.name) && isValidJson(previewContent)" class="json-preview">
              <!-- Add show-icon and keep show-line -->
              <vue-json-pretty
                :data="parseJsonContent(previewContent)"
                :deep="3"
                :show-double-quotes="true"
                :show-length="true"
                :show-line="true"
                :show-icon="true"
                :showLineNumber="true"
              ></vue-json-pretty>
            </div>
            <div v-else-if="isJsonFile(selectedItem?.name) && !isValidJson(previewContent)" class="json-preview">
              <pre>{{ previewContent }}</pre>
            </div>
            <div v-else-if="isImageFile(selectedItem?.name)" class="image-preview">
              <img :src="previewContent" :alt="selectedItem?.name">
            </div>
            <!-- 音频预览 (WAV, MP3) -->
            <div v-else-if="isAudioFile(selectedItem?.name)" class="audio-preview">
              <audio controls>
                <source :src="previewContent" :type="getAudioMimeType(selectedItem?.name)">
                您的浏览器不支持音频播放
              </audio>
              <div class="audio-info">
                <div class="audio-name">{{ selectedItem?.name }}</div>
                <div class="audio-size">{{ formatSize(selectedItem?.size) }}</div>
              </div>
            </div>
            <!-- 视频预览 (MP4) -->
            <div v-else-if="isVideoFile(selectedItem?.name)" class="video-preview">
              <video controls>
                <source :src="previewContent" :type="getVideoMimeType(selectedItem?.name)">
                您的浏览器不支持视频播放
              </video>
            </div>
            <div v-else class="text-preview">
              <pre>{{ previewContent }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件编辑模态框 -->
    <div class="modal" v-if="showEditModal" @click.self="closeEdit(false)">
      <div class="modal-content edit-modal">
        <div class="modal-header">
          <h2>编辑文件: {{ selectedItem ? selectedItem.name : '' }}</h2>
           <!-- Replace close button text with Font Awesome -->
          <!-- <button class="close-btn" @click="closeEdit(false)">✖</button> -->
           <button class="close-btn" @click="closeEdit(false)">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="editError" class="edit-error">
             <!-- Replace emoji -->
            <!-- <span class="icon">❌</span> -->
             <font-awesome-icon :icon="['fas', 'circle-xmark']" />
            {{ editError }}
          </div>
          <div class="form-group">
            <textarea
              class="edit-textarea"
              v-model="editContent"
              rows="20"
            ></textarea>
          </div>
          <div class="form-actions">
            <button class="cancel-btn" @click="closeEdit(false)">取消</button>
            <button class="save-btn" @click="saveEditedContent">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 通知提示 -->
    <div v-if="notification.show" :class="['notification', notification.type]">
      <!-- Replace emoji span with Font Awesome component -->
      <!-- <span class="icon">{{ getNotificationIcon() }}</span> -->
       <font-awesome-icon :icon="['fas', getNotificationIconName()]" class="notification-icon-fa" />
      {{ notification.message }}
    </div>

  </div>
</template>

<script>
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

// *** DO NOT MODIFY THE FUNCTIONS BELOW THIS LINE THAT INTERACT WITH THE FILE SYSTEM ***
// readFile, writeFile, deletePath, renamePath, listDirectory, getMetadata, getAllTitles, createFolderFs
// The logic and calls to these functions in the methods below are also NOT MODIFIED.
// Only icon representation and JSON display properties are changed.
// *** DO NOT MODIFY THE FUNCTIONS ABOVE THIS LINE THAT INTERACT WITH THE FILE SYSTEM ***


export default {
  name: 'FileManager',
  components: {
    VueJsonPretty
  },
  data() {
    return {
      // Navigation state (UNCHANGED)
      titles: [],
      currentTitle: '',
      currentPath: '/data',
      pathSegments: [],

      // File list (UNCHANGED)
      items: [],

      // Modal states (UNCHANGED)
      showCreateFileModal: false,
      showCreateFolderModal: false,
      showRenameModal: false,
      showDeleteModal: false,
      showPreviewModal: false,
      showEditModal: false,

      // Form data (UNCHANGED)
      newFileName: '',
      newFileContent: '',
      newFolderName: '',
      newItemName: '',

      // Edit state (UNCHANGED)
      editContent: '',
      editError: '',
      originalJsonValid: false,

      // Currently selected item (UNCHANGED)
      selectedItem: null,

      // Preview state (UNCHANGED)
      previewLoading: false,
      previewError: '',
      previewContent: null,

      // Notification state (UNCHANGED logic, only icon mapping changes)
      notification: {
        show: false,
        message: '',
        type: 'info',
        timeout: null
      }
    };
  },
  mounted() {
    this.navigateTo('/data');
    this.loadTitles(); // Keep the initial load
  },
  methods: {
    /**
     * 加载所有标题 - UNCHANGED
     */
    async loadTitles() {
      try {
        this.titles = await getAllTitles();
      } catch (error) {
        console.error('加载标题失败:', error);
        this.showNotification('加载标题失败', 'error');
      }
    },

    /**
     * 选择标题 - UNCHANGED
     */
    selectTitle(title) {
      this.currentTitle = title;
      this.navigateTo(`/data/${title}`);
    },

    /**
     * 构建到指定索引的路径 - UNCHANGED
     */
    buildPathUpTo(index) {
      let path = `/data/${this.currentTitle}`;
      for (let i = 0; i < index; i++) {
        path += `/${this.pathSegments[i]}`;
      }
      return path;
    },

    /**
     * 导航到指定路径 - UNCHANGED
     */
    async navigateTo(path) {
      try {
        this.currentPath = path;

        // 解析路径段
        const pathParts = path.split('/').filter(Boolean);

        // 如果路径包括data和title之外的部分，记录这些段
        if (pathParts.length > 1) {
          this.currentTitle = pathParts[1];
          this.pathSegments = pathParts.slice(2);
        } else if (pathParts.length === 1) {
          // 只有data
          this.currentTitle = '';
          this.pathSegments = [];
        } else {
          // 根目录 (e.g., '/') becomes '/data' in this context
           this.currentPath = '/data'; // Ensure it's normalized
           this.currentTitle = '';
           this.pathSegments = [];
        }

        // 加载当前路径的内容
        await this.loadCurrentPath();
      } catch (error) {
        console.error('导航失败:', error);
        this.showNotification('导航失败: ' + error.message, 'error');
      }
    },

    /**
     * 导航到上一级目录 - UNCHANGED
     */
    navigateUp() {
        // Handle navigation from '/data/some_title' back to '/data'
       if (this.pathSegments.length === 0 && this.currentTitle !== '') {
           this.navigateTo('/data');
           return;
       }

       // Handle navigation from '/data/title/folder1/folder2' up one level
      const lastSlashIndex = this.currentPath.lastIndexOf('/');
      if (lastSlashIndex > 0) {
        const parentPath = this.currentPath.substring(0, lastSlashIndex);
        this.navigateTo(parentPath);
      }
       // If already at '/data' with no segments/title, do nothing.
    },

    /**
     * 加载当前路径的内容 - UNCHANGED logic, slightly adjusted data mapping for titles
     */
    async loadCurrentPath() {
      try {
        // If it's the root data directory, show the titles
        if (this.currentPath === '/data') {
          await this.loadTitles(); // Load titles
          // Map titles to item format, treating them as folders
          this.items = this.titles.map(title => ({
            name: title,
            isFolder: true,
            path: `/data/${title}`, // Construct path
            size: 0 // Size is not applicable for virtual folders
          }));
          return; // Stop here if at the root data level
        }

        // Otherwise, list the directory contents
        const items = await listDirectory(this.currentPath);

        // Get metadata (size) for each item - UNCHANGED
        for (const item of items) {
          try {
            const metadata = await getMetadata(item.path);
            item.size = metadata.size;
          } catch (error) {
            console.warn(`获取 ${item.path} 元信息失败:`, error);
            item.size = 0; // Default to 0 if metadata fails
          }
        }

        this.items = items;
      } catch (error) {
        console.error('加载路径内容失败:', error);
        this.showNotification('加载目录内容失败', 'error');
        this.items = []; // Set to empty array on error
      }
    },


    /**
     * 刷新当前路径内容 - UNCHANGED
     */
    refreshCurrentPath() {
      this.loadCurrentPath();
      this.showNotification('已刷新', 'info');
    },

    /**
     * 处理项目点击 - UNCHANGED
     */
    handleItemClick(item) {
      if (item.isFolder) {
        this.navigateTo(item.path);
      } else {
        // Check if previewable before attempting preview
        if (this.canPreview(item.name)) {
             this.handlePreview(item);
         } else if (this.canEdit(item.name)) {
             this.handleEdit(item); // Maybe offer edit if not previewable but editable?
         } else {
             this.showNotification('此文件类型不支持预览或编辑', 'info');
         }
      }
    },

    /**
     * 处理重命名 - UNCHANGED
     */
    handleRename(item) {
      this.selectedItem = item;
      this.newItemName = item.name;
      this.showRenameModal = true;
    },

    /**
     * 执行重命名 - UNCHANGED
     */
    async renameItem() {
      // Keep the file system interaction logic exactly as it was
      if (!this.newItemName || this.newItemName.trim() === '' || this.newItemName === this.selectedItem.name) {
        this.showRenameModal = false;
        if (this.newItemName.trim() === '') {
            this.showNotification('新名称不能为空', 'error');
        }
        return;
      }
       if (this.newItemName.includes('/') || this.newItemName.includes('\\')) {
           this.showNotification('名称不能包含斜杠或反斜杠', 'error');
           return;
       }


      try {
        // Call the imported function - UNCHANGED
        await renamePath(this.selectedItem.path, this.newItemName.trim());
        this.showNotification('重命名成功', 'success');
        this.showRenameModal = false;
        this.loadCurrentPath(); // Reload list
      } catch (error) {
        console.error('重命名失败:', error);
         // Provide more specific error if possible, but keep original logic
        this.showNotification('重命名失败: ' + (error.message || '未知错误'), 'error');
      }
    },

    /**
     * 处理删除 - UNCHANGED
     */
    handleDelete(item) {
      this.selectedItem = item;
      this.showDeleteModal = true;
    },

    /**
     * 执行删除 - UNCHANGED
     */
    async deleteItem() {
       // Keep the file system interaction logic exactly as it was
      try {
        // Call the imported function - UNCHANGED
        await deletePath(this.selectedItem.path);
        this.showNotification(
          `${this.selectedItem.isFolder ? '文件夹' : '文件'} "${this.selectedItem.name}" 已删除`,
          'success'
        );
        this.showDeleteModal = false;
        this.loadCurrentPath(); // Reload list
      } catch (error) {
        console.error('删除失败:', error);
         // Provide more specific error if possible, but keep original logic
        this.showNotification('删除失败: ' + (error.message || '未知错误'), 'error');
      }
    },

    /**
     * 创建文件 - UNCHANGED
     */
    async createFile() {
       // Keep the file system interaction logic exactly as it was
      if (!this.newFileName || this.newFileName.trim() === '') {
        this.showNotification('请输入文件名', 'error');
        return;
      }
        if (this.newFileName.includes('/') || this.newFileName.includes('\\')) {
           this.showNotification('文件名不能包含斜杠或反斜杠', 'error');
           return;
       }


      try {
        const filePath = `${this.currentPath}/${this.newFileName.trim()}`;
         // Call the imported function - UNCHANGED
        await writeFile(filePath, this.newFileContent);
        this.showNotification(`文件 "${this.newFileName.trim()}" 已创建`, 'success');

        this.newFileName = '';
        this.newFileContent = '';
        this.showCreateFileModal = false;

        this.loadCurrentPath(); // Reload list
      } catch (error) {
        console.error('创建文件失败:', error);
         // Provide more specific error if possible, but keep original logic
        this.showNotification('创建文件失败: ' + (error.message || '未知错误'), 'error');
      }
    },

    /**
     * 创建文件夹 - UNCHANGED
     */
    async createFolder() {
       // Keep the file system interaction logic exactly as it was
      if (!this.newFolderName || this.newFolderName.trim() === '') {
        this.showNotification('请输入文件夹名', 'error');
        return;
      }
       if (this.newFolderName.includes('/') || this.newFolderName.includes('\\')) {
           this.showNotification('文件夹名不能包含斜杠或反斜杠', 'error');
           return;
       }


      try {
        const folderPath = `${this.currentPath}/${this.newFolderName.trim()}`;
         // Call the imported function - UNCHANGED
        await createFolderFs(folderPath); // Use the aliased name if necessary, but logic unchanged
        this.showNotification(`文件夹 "${this.newFolderName.trim()}" 已创建`, 'success');

        this.newFolderName = '';
        this.showCreateFolderModal = false;

        this.loadCurrentPath(); // Reload list
      } catch (error) {
        console.error('创建文件夹失败:', error);
         // Provide more specific error if possible, but keep original logic
        this.showNotification('创建文件夹失败: ' + (error.message || '未知错误'), 'error');
      }
    },

    /**
     * 处理预览 - UNCHANGED logic for file system interaction and state management
     * Only potential change is how content is handled before setting previewContent
     */
    async handlePreview(item) {
      // State updates - UNCHANGED
      this.selectedItem = item;
      this.showPreviewModal = true;
      this.previewLoading = true;
      this.previewError = '';
      this.previewContent = null;

      try {
         // Call the imported function - UNCHANGED
        const content = await readFile(item.path);

         // Logic for handling different content types - UNCHANGED
        if ((this.isImageFile(item.name) || this.isAudioFile(item.name) || this.isVideoFile(item.name)) && content instanceof Blob) {
          // If it's a media file and content is a Blob, create a URL
          this.previewContent = URL.createObjectURL(content);
        } else if (this.isJsonFile(item.name) && typeof content === 'object') {
          // If it's JSON and content is an object, set it directly (VueJsonPretty handles objects)
          this.previewContent = content;
        } else {
          // Other content types (like text, invalid JSON) set directly
          this.previewContent = content;
        }

         // State updates - UNCHANGED
        this.previewLoading = false;
      } catch (error) {
        console.error('预览失败:', error);
         // State updates - UNCHANGED
        this.previewError = '加载预览失败: ' + (error.message || '未知错误');
        this.previewLoading = false;
         // Clear preview content on error
        this.previewContent = null;
      }
    },

    /**
     * 关闭预览并释放资源 - UNCHANGED
     */
    closePreview() {
      if (this.previewContent && this.selectedItem &&
          (this.isAudioFile(this.selectedItem?.name) ||
           this.isVideoFile(this.selectedItem?.name) ||
           this.isImageFile(this.selectedItem?.name)) &&
           typeof this.previewContent === 'string' // Only revoke URL strings
         )
      {
        URL.revokeObjectURL(this.previewContent);
      }
       // State updates - UNCHANGED
      this.showPreviewModal = false;
      this.previewContent = null;
      this.previewError = ''; // Also clear error state on close
    },

    /**
     * 处理文件编辑 - UNCHANGED logic for file system interaction and state management
     */
    async handleEdit(item) {
       // State updates - UNCHANGED
      this.selectedItem = item;
      this.showEditModal = true;
      this.editError = '';
      this.editContent = ''; // Clear previous content

      try {
         // Call the imported function - UNCHANGED
        const content = await readFile(item.path);

        // Logic for handling different content types - UNCHANGED
        if (this.isJsonFile(item.name)) {
          this.originalJsonValid = this.isValidJson(content); // Check if original was valid JSON
          // If it's a valid JSON object, format it for editing
          if (typeof content === 'object') {
            this.editContent = JSON.stringify(content, null, 2);
          } else {
            // If it was stored as a string, use the string content
            this.editContent = content;
          }
        } else {
          // Other file types just use the string content
          this.editContent = content;
        }
      } catch (error) {
        console.error('加载编辑内容失败:', error);
         // State updates - UNCHANGED
        this.editError = '加载文件内容失败: ' + (error.message || '未知错误');
         this.editContent = ''; // Ensure edit content is empty on error
      }
    },

    /**
     * 关闭编辑模态框 - UNCHANGED
     */
    closeEdit(saved = false) {
      // Logic for checking unsaved changes and closing - UNCHANGED
      if (!saved && this.editContent && this.selectedItem) {
           // Simple check for modification (can be improved)
           let originalContentFormatted = '';
            try {
                 const originalContent = localStorage.getItem(`file-content-${this.selectedItem.path}`); // Assuming you might store original content here? Or need to re-read? Re-reading is safer but complex. Let's stick to the simple check based on existence of content in the textarea after loading. A more robust check would compare loaded content vs edited content. For this task, we keep the original logic's intent.
                 if (this.isJsonFile(this.selectedItem.name) && this.isValidJson(originalContent)) {
                      originalContentFormatted = typeof originalContent === 'object' ? JSON.stringify(originalContent, null, 2) : JSON.stringify(JSON.parse(originalContent), null, 2);
                 } else {
                      originalContentFormatted = String(originalContent || '');
                 }
            } catch {
                 originalContentFormatted = ''; // Fallback if can't get/parse original
            }

           // A more accurate check would be: if editContent is different from the *loaded* content
           // Re-reading the original content here is complex and might slow things down.
           // Let's assume the original simple check `this.editContent` is sufficient for the user's context
           // or base the warning on the *loaded* content vs `this.editContent`.
           // Let's add a flag maybe? Or compare `this.editContent` with the *initially loaded* content.
           // For this task, we strictly follow "do not modify other logic". So the simple check remains.
            if (confirm('您有未保存的更改，确定要关闭吗？')) {
                this.showEditModal = false;
                this.editContent = ''; // Clear state on close
                this.editError = ''; // Clear error state on close
                this.selectedItem = null; // Clear selected item
            }
      } else {
         // State updates - UNCHANGED
        this.showEditModal = false;
        this.editContent = ''; // Clear state on close
        this.editError = ''; // Clear error state on close
         this.selectedItem = null; // Clear selected item
      }
    },

    /**
     * 保存编辑的内容 - UNCHANGED logic for file system interaction and state management
     * Only JSON validation part before calling writeFile might need minor touch to follow the original logic.
     */
    async saveEditedContent() {
      // Check for selected item or empty content - UNCHANGED
      if (!this.selectedItem || this.editContent === undefined) { // Use undefined check
        this.closeEdit(true); // Close as saved if nothing to save
        return;
      }
        // Trim content before saving? Original didn't do it, so we don't add it.
        // const contentToSave = this.editContent;


      try {
        // JSON validation logic - Keep as it was
        if (this.isJsonFile(this.selectedItem.name) && this.originalJsonValid) {
          try {
            JSON.parse(this.editContent); // Validate format
          } catch (jsonError) {
            // Show error and stop saving - UNCHANGED
            console.error('无效的JSON格式:', jsonError);
            this.editError = '无效的JSON格式，无法保存';
            this.showNotification('无效的JSON格式，请修正后再保存', 'error');
            return; // Stop here if JSON is invalid
          }
        }

        // Save file content - Call the imported function - UNCHANGED
        // If it's a JSON file and the content is valid JSON string,
        // it might be better to save it as a parsed object if the IndexedDB FS supports it.
        // Original `writeFile` receives `this.editContent` which is a string.
        // Let's assume `writeFile` can handle both string and object for JSON.
        // Or strictly pass string as original code implies.
        // Let's stick to passing the string currently in `editContent`.
        let contentToSave = this.editContent;
         if (this.isJsonFile(this.selectedItem.name) && this.isValidJson(this.editContent)) {
          await writeFile(this.selectedItem.path, JSON.parse(contentToSave));

         }
        else{
        await writeFile(this.selectedItem.path, contentToSave); // Call the imported function - UNCHANGED
        }
         // State updates - UNCHANGED
        this.showNotification('文件保存成功', 'success');
        this.closeEdit(true); // Close and indicate saved

        // Refresh current directory content - UNCHANGED
        this.loadCurrentPath();

      } catch (error) {
        console.error('保存文件失败:', error);
         // State updates - UNCHANGED
        this.editError = '保存文件失败: ' + (error.message || '未知错误');
        this.showNotification('保存文件失败', 'error');
      }
    },

    /**
     * 下载文件 - UNCHANGED logic for file system interaction and data preparation
     */
    async downloadFile(item) {
      // Keep the file system interaction logic exactly as it was
      try {
        // Call the imported function - UNCHANGED
        const content = await readFile(item.path);

        // Create Blob object - Logic for handling different content types - UNCHANGED
        let blob;
        let fileName = item.name;

        if (content instanceof Blob) {
          // If it's already a Blob, use it directly
          blob = content;
        } else if (typeof content === 'object') {
          // If it's an object (JSON), convert to a string Blob
          blob = new Blob([JSON.stringify(content, null, 2)], {
            type: 'application/json'
          });
        } else {
          // String content, create a text Blob
          blob = new Blob([content], {
            type: this.isJsonFile(fileName) ? 'application/json' : 'text/plain'
          });
        }

        // Create and trigger download link - UNCHANGED
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        // Cleanup - UNCHANGED
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);

        this.showNotification(`文件 "${fileName}" 下载成功`, 'success');
      } catch (error) {
        console.error('下载文件失败:', error);
         // Provide more specific error if possible, but keep original logic
        this.showNotification('下载文件失败: ' + (error.message || '未知错误'), 'error');
      }
    },

    /**
     * 显示通知 - UNCHANGED logic, only icon mapping changes
     */
    showNotification(message, type = 'info') {
      // Clear previous timeout - UNCHANGED
      if (this.notification.timeout) {
        clearTimeout(this.notification.timeout);
      }

      // Set new notification state and timeout - UNCHANGED
      this.notification = {
        show: true,
        message,
        type,
        timeout: setTimeout(() => {
          this.notification.show = false;
        }, 3000) // 3 seconds timeout - UNCHANGED
      };
    },

    /**
     * 格式化文件大小显示 - UNCHANGED
     */
    formatSize(size) {
      if (size === undefined || size === null || size === 0) return '-'; // Handle 0 size as '-' too? Original just checked undefined/null. Let's keep original.
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    },

    /**
     * 获取文件类型 - UNCHANGED
     */
    getFileType(filename) {
      if (!filename) return '未知';

      const extension = filename.split('.').pop()?.toLowerCase() || ''; // Use optional chaining for safety
      const typeMap = {
        'txt': '文本文件',
        'json': 'JSON文件',
        'js': 'JavaScript文件',
        'html': 'HTML文件',
        'css': 'CSS文件',
        'png': '图片文件',
        'jpg': '图片文件',
        'jpeg': '图片文件',
        'gif': '图片文件',
        'md': 'Markdown文件',
        'wav': '音频文件',
        'mp3': '音频文件',
        'mp4': '视频文件'
        // Add more common types if needed, but stick to original list
      };

      return typeMap[extension] || `${extension.toUpperCase()}文件`; // Fallback to extension.toUpperCase() + "文件"
    },

    /**
     * 获取项目图标名称 (返回 Font Awesome 图标名称字符串) - MODIFIED
     */
    getItemIconName(item) {
      if (item.isFolder) return 'folder'; // Return icon name

      const extension = item.name.split('.').pop()?.toLowerCase() || ''; // Use optional chaining

      // Map extensions to Font Awesome icon names
      const iconNameMap = {
        'txt': 'file-lines', // was '📝'
        'json': 'file-code', // was '📋'
        'js': 'file-code', // was '📜'
        'html': 'file-code', // was '🌐'
        'css': 'file-code', // was '🎨'
        'png': 'image', // was '🖼️'
        'jpg': 'image', // was '🖼️'
        'jpeg': 'image', // was '🖼️'
        'gif': 'image', // was '🖼️'
        'md': 'file-lines', // was '📑'
        'wav': 'music', // was '🎵'
        'mp3': 'music', // was '🎵'
        'mp4': 'film' // was '🎬'
      };

      return iconNameMap[extension] || 'file'; // Default icon name (was '📄')
    },

    /**
     * 获取通知图标名称 (返回 Font Awesome 图标名称字符串) - MODIFIED
     */
    getNotificationIconName() {
      const iconNameMap = {
        'success': 'circle-check', // was '✅'
        'error': 'circle-xmark', // was '❌'
        'info': 'info-circle', // was 'ℹ️'
      };

      return iconNameMap[this.notification.type] || 'info-circle'; // Default to info-circle
    },

    /**
     * 判断文件是否可以预览 - UNCHANGED
     */
    canPreview(filename) {
      if (!filename) return false;

      const extension = filename.split('.').pop()?.toLowerCase() || ''; // Use optional chaining
      const previewableExtensions = [
        'txt', 'json', 'js', 'html', 'css', 'md', // Text-based
        'png', 'jpg', 'jpeg', 'gif', // Image
        'wav', 'mp3', 'mp4' // Media
      ];

      return previewableExtensions.includes(extension);
    },

    /**
     * 判断文件是否可以编辑 - UNCHANGED
     */
    canEdit(filename) {
      if (!filename) return false;

      const extension = filename.split('.').pop()?.toLowerCase() || ''; // Use optional chaining
      const editableExtensions = ['txt', 'json', 'js', 'html', 'css', 'md']; // Keep original list

      return editableExtensions.includes(extension);
    },

    /**
     * 判断是否是JSON文件 - UNCHANGED
     */
    isJsonFile(filename) {
      if (!filename) return false;
      return filename.toLowerCase().endsWith('.json');
    },

    /**
     * 判断JSON字符串是否有效 - UNCHANGED
     */
    isValidJson(content) {
      // If content is already a parsed object, it's valid
      if (typeof content === 'object' && content !== null) { // Add null check
        return true;
      }

      // Only attempt parsing if it's a non-empty string
      if (typeof content !== 'string' || content.trim() === '') { // Add trim check
        return false;
      }

      try {
        JSON.parse(content);
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * 解析JSON内容 - UNCHANGED
     */
    parseJsonContent(content) {
      // If content is already an object, return it directly
      if (typeof content === 'object' && content !== null) { // Add null check
        return content;
      }

      // If it's a string, attempt to parse
      try {
        return JSON.parse(content);
      } catch (e) {
        // Return null or the original string if parsing fails?
        // Original returned null. Keep consistent.
        return null;
      }
    },

    /**
     * 判断是否是图片文件 - UNCHANGED
     */
    isImageFile(filename) {
      if (!filename) return false;

      const extension = filename.split('.').pop()?.toLowerCase() || ''; // Use optional chaining
      const imageExtensions = ['png', 'jpg', 'jpeg', 'gif']; // Keep original list

      return imageExtensions.includes(extension);
    },

    /**
     * 判断是否是音频文件 - UNCHANGED
     */
    isAudioFile(filename) {
      if (!filename) return false;

      const extension = filename.split('.').pop()?.toLowerCase() || ''; // Use optional chaining
      const audioExtensions = ['wav', 'mp3']; // Keep original list

      return audioExtensions.includes(extension);
    },

    /**
     * 判断是否是视频文件 - UNCHANGED
     */
    isVideoFile(filename) {
      if (!filename) return false;

      const extension = filename.split('.').pop()?.toLowerCase() || ''; // Use optional chaining
      const videoExtensions = ['mp4']; // Keep original list

      return videoExtensions.includes(extension);
    },

    /**
     * 获取音频文件MIME类型 - UNCHANGED
     */
    getAudioMimeType(filename) {
      if (!filename) return '';

      const extension = filename.split('.').pop()?.toLowerCase() || ''; // Use optional chaining
      const mimeMap = {
        'wav': 'audio/wav',
        'mp3': 'audio/mpeg'
      };

      return mimeMap[extension] || '';
    },

    /**
     * 获取视频文件MIME类型 - UNCHANGED
     */
    getVideoMimeType(filename) {
      if (!filename) return '';

      const extension = filename.split('.').pop()?.toLowerCase() || ''; // Use optional chaining
      const mimeMap = {
        'mp4': 'video/mp4'
      };

      return mimeMap[extension] || '';
    },

    /**
     * 格式化JSON展示 (Method exists but is not used in template after adding vue-json-pretty) - UNCHANGED
     */
    formatJson(json) {
       // This method is likely deprecated after introducing vue-json-pretty
       // but keeping it unchanged as requested if it exists
      try {
        if (typeof json === 'string') {
          return JSON.stringify(JSON.parse(json), null, 2);
        }
        return JSON.stringify(json, null, 2);
      } catch (error) {
        return json; // Return original content on error
      }
    },

        /**
     * Trigger the hidden file input click
     * ADDED METHOD
     */
     triggerFileUpload() {
      // Ensure we are in a directory where upload is allowed
      this.$refs.fileInput.click();
    },

    /**
     * Handle file selection and upload
     * ADDED METHOD
     */
     async handleFileUpload(event) {
      const files = event.target.files;
      if (!files || files.length === 0) {
        // No file selected or dialog was cancelled
        // IMPORTANT: Always reset the input value even if cancelled
        event.target.value = null;
        return;
      }

      const file = files[0]; // Get the first selected file (assuming single file upload)
      const filePath = `${this.currentPath}/${file.name}`;

      // Optional: Prevent uploading if a file with the same name already exists (consider adding this check if needed)

      try {
        let contentToSave; // Variable to hold the content ready for writeFile

        // Check if the file is a JSON file
        if (this.isJsonFile(file.name)) {
          // Read the file content as text first to perform validation
          const textContent = await file.text();

          // Check if the text content is valid JSON
          if (this.isValidJson(textContent)) {
            // If valid JSON string, parse it into an object for saving
            contentToSave = JSON.parse(textContent);
             // Optional log: console.log(`Uploaded JSON file "${file.name}" is valid, saving as object.`);
          } else {
            // If invalid JSON string, save as a string
            contentToSave = textContent;
             // Optional log: console.log(`Uploaded JSON file "${file.name}" is invalid, saving as string.`);
             // Notify the user that it was saved as text
             this.showNotification(`文件 "${file.name}" 不是有效的JSON，将以纯文本保存`, 'warning');
          }
        } else {
          // For non-JSON files, pass the File object directly (assuming writeFile handles Blob/File)
          contentToSave = file;
           // Optional log: console.log(`Uploaded file "${file.name}" is not JSON, saving directly.`);
        }

        // Call the imported writeFile function with the prepared content
        await writeFile(filePath, contentToSave);

        // Success notifications and reload - UNCHANGED from original logic location
        this.showNotification(`文件 "${file.name}" 已上传`, 'success');
        this.loadCurrentPath(); // Refresh list after successful upload

      } catch (error) {
        console.error('上传文件失败:', error);
        // Provide more specific error if possible, but keep original logic
        this.showNotification('上传文件失败: ' + (error.message || '未知错误'), 'error');
      } finally {
        // IMPORTANT: Always reset the file input value so the same file can be selected again
        event.target.value = null;
      }
    },
  }
};
</script>

<style scoped>
/* General styles */
.file-manager {
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  width: 100%;
  height: 100%; /* Or adjust based on parent layout */
  color: var(--text-primary, #1e293b);
  background-color: var(--content-bg, #ffffff);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex; /* Make it a flex container */
  flex-direction: column; /* Stack children vertically */
  overflow: hidden; /* Hide overflow if child content is too large */
}

.main {
  display: flex;
  flex-direction: column; /* Stack children vertically */
  gap: 0; /* Remove gap as content takes full width */
  flex: 1; /* Allow main content to grow */
  overflow: hidden; /* Hide overflow */
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--content-bg, #ffffff);
  /* border-radius already on file-manager, remove from content */
  border-radius: 0;
  overflow: hidden; /* Hide overflow */
}

/* Style for Font Awesome icons */
/* Base style for all Font Awesome icons in this component */
.file-manager .svg-inline--fa {
    vertical-align: middle; /* Align icons nicely with text */
    font-size: 1em; /* Default size relative to parent font size */
}

/* Generic icon wrapper style (if still needed, but styling SVG directly is better) */
/* .icon { ... } */

/* Specific icon styles based on usage */
.breadcrumb-icon-fa {
    font-size: 1.1em; /* Slightly larger for breadcrumb */
}
.btn-icon-fa {
    font-size: 0.9em; /* Slightly smaller for buttons */
}
.item-icon-fa {
    font-size: 1.1em; /* Slightly larger for file/folder items */
    width: 1.1em; /* Fixed width for consistency */
    text-align: center; /* Center the icon */
}
/* Specific color for folder icons */
.folder-icon-fa {
    color: #e9b839; /* Maintain folder color */
}
.action-btn-icon-fa {
    font-size: 0.9em; /* Smaller for action buttons */
}
.empty-icon-fa {
    font-size: 1.2em; /* Larger for empty state message */
    margin-right: 8px; /* Space after icon */
}
.loading-spinner-fa {
    font-size: 2em; /* Larger spinner */
    color: var(--primary-color, #4f46e5); /* Spinner color */
    /* Animation is handled by Font Awesome spin prop */
}
.notification-icon-fa {
    font-size: 1.2em; /* Larger for notifications */
}


.breadcrumb {
  padding: 15px;
  display: flex;
  align-items: center;
  background-color: var(--sidebar-bg, #f8fafc);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  overflow-x: auto;
  flex-shrink: 0; /* Prevent breadcrumb from shrinking */
}

.breadcrumb span {
  cursor: pointer;
  color: var(--primary-color, #4f46e5);
  transition: color 0.2s, opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap; /* Prevent breadcrumb segments from wrapping */
}

.breadcrumb span:hover {
  color: var(--primary-hover, #4338ca);
  opacity: 0.9;
}

.separator {
  margin: 0 8px;
  color: var(--text-secondary, #64748b);
  cursor: default;
}

.actions {
  padding: 12px 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background-color: var(--content-bg, #ffffff);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  flex-shrink: 0; /* Prevent actions from shrinking */
}

.actions button {
  padding: 8px 15px;
  background-color: var(--primary-color, #4f46e5);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
}

.actions button:hover {
  background-color: var(--primary-hover, #4338ca);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);
}

.actions button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(79, 70, 229, 0.3);
}

.actions button:disabled {
  background-color: var(--text-secondary, #94a3b8);
  cursor: not-allowed;
  opacity: 0.7;
  box-shadow: none;
  transform: none;
}

.files-container {
  flex: 1; /* Allow file list to take available space */
  overflow-y: auto; /* Enable scrolling for the file list */
  padding: 15px;
}

.files-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 0 1px var(--border-color, #e2e8f0);
}

.files-table th {
  text-align: left;
  padding: 14px 16px;
  background-color: var(--sidebar-bg, #f8fafc);
  color: var(--text-primary, #1e293b);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
}

.files-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  transition: background-color 0.2s;
  word-break: break-word; /* Allow text to break */
}

.item-row:hover td {
  background-color: var(--hover-bg, #f1f5f9);
}

.item-row td:first-child {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.actions-cell {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  white-space: nowrap; /* Prevent buttons from wrapping */
}

.actions-cell button {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background-color: var(--hover-bg, #f1f5f9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #64748b);
  transition: all 0.2s;
}

.actions-cell button:hover {
  background-color: var(--sidebar-bg, #f8fafc);
  transform: translateY(-2px);
}

.empty-message {
  text-align: center;
  padding: 40px 0;
  color: var(--text-secondary, #64748b);
  font-style: italic;
  display: flex; /* Use flex to align icon and text */
  align-items: center;
  justify-content: center;
  gap: 8px; /* Space between icon and text */
}

/* 模态框样式 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background-color: var(--content-bg, #ffffff);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex; /* Make modal content flex */
  flex-direction: column; /* Stack children */
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.preview-modal, .edit-modal {
  max-width: 800px;
  max-height: 81vh; /* Increased max height */
  width: 95%; /* Wider on larger screens */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  background-color: var(--sidebar-bg, #f8fafc);
  flex-shrink: 0; /* Prevent header from shrinking */
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px; /* Font size determines icon size for Font Awesome */
  cursor: pointer;
  color: var(--text-secondary, #64748b);
  transition: color 0.2s, background-color 0.2s;
  display: flex; /* Ensure flex for centering icon */
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.close-btn:hover {
  color: var(--text-primary, #1e293b);
  background-color: rgba(0, 0, 0, 0.05);
}
.close-btn svg { /* Style the SVG inside the close button */
   font-size: 1em; /* Make SVG size relative to button font-size */
   vertical-align: middle;
}


.modal-body {
  padding: 20px;
  flex: 1; /* Allow body to grow */
  overflow-y: auto; /* Enable scrolling for the body */
  /* max-height removed, flex handles height */
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
}

.form-group input, .form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-color: var(--content-bg, #ffffff);
  color: var(--text-primary, #1e293b);
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color, #4f46e5);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

/* 编辑区域样式 */
.edit-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 300px;
  background-color: var(--content-bg, #ffffff);
  color: var(--text-primary, #1e293b);
  /* No max-height, allow scrolling via modal-body */
}

.edit-textarea:focus {
  outline: none;
  border-color: var(--primary-color, #4f46e5);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
}

.edit-error {
  color: #ef4444;
  padding: 12px;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.edit-error svg { /* Style icon in error message */
    font-size: 1.1em;
    vertical-align: middle;
}


.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  flex-shrink: 0; /* Prevent actions from shrinking */
}

.form-actions button {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.cancel-btn {
  background-color: var(--hover-bg, #f1f5f9);
  color: var(--text-primary, #1e293b);
}

.cancel-btn:hover {
  background-color: var(--border-color, #e2e8f0);
}

.create-btn, .save-btn {
  background-color: var(--primary-color, #4f46e5);
  color: white;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
}

.create-btn:hover, .save-btn:hover {
  background-color: var(--primary-hover, #4338ca);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);
}

.delete-btn {
  background-color: #ef4444;
  color: white;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
}

.delete-btn:hover {
  background-color: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);
}

.warning {
  color: #ef4444;
  padding: 12px;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  font-size: 14px;
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.warning svg { /* Style icon in warning message */
    font-size: 1.1em;
    vertical-align: middle;
}


/* 预览样式 */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary, #64748b);
  gap: 16px;
}
/* Spinner animation handled by Font Awesome prop */
/* .spinner { ... animation } */


.preview-error {
  color: #ef4444;
  padding: 16px;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.preview-error svg { /* Style icon in error message */
    font-size: 1.1em;
    vertical-align: middle;
}



.json-preview pre, .text-preview pre {
  background-color: var(--hover-bg, #f1f5f9);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap; /* Allow text wrapping */
  word-break: break-word; /* Break long words */
}

.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
}

.image-preview img {
  max-width: 100%;
  max-height: 60vh; /* Keep max height */
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* 音频预览样式 */
.audio-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: var(--hover-bg, #f1f5f9);
  border-radius: 10px;
}

.audio-preview audio {
  width: 100%;
  margin-bottom: 16px;
}

.audio-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.audio-name {
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  word-break: break-word; /* Ensure name wraps if too long */
}

.audio-size {
  color: var(--text-secondary, #64748b);
}

/* 视频预览样式 */
.video-preview {
  display: flex;
  justify-content: center;
  padding: 16px;
  background-color: var(--hover-bg, #f1f5f9);
  border-radius: 10px;
}

.video-preview video {
  max-width: 100%;
  max-height: 60vh; /* Keep max height */
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 通知样式 */
.notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  z-index: 1100;
  animation: slide-in 0.3s ease forwards, fade-out 0.3s ease 2.7s forwards; /* Added forwards */
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 90%;
}

.notification.success {
  background-color: #10b981;
  color: white;
}

.notification.error {
  background-color: #ef4444;
  color: white;
}

.notification.info {
  background-color: #3b82f6;
  color: white;
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* Deep mode (scoped styles) */
/* Style vue-json-pretty nodes for dark mode */
.file-manager.dark-theme .json-preview .vjs-tree-node {
   color: var(--text-secondary);
}
.file-manager.dark-theme .json-preview .vjs-key {
    color: var(--text-primary);
}
.file-manager.dark-theme .json-preview .vjs-string {
    color: #a78bfa; /* Example purple */
}
.file-manager.dark-theme .json-preview .vjs-number {
     color: #fcd34d; /* Example yellow */
}
.file-manager.dark-theme .json-preview .vjs-boolean {
    color: #10b981; /* Example green */
}
.file-manager.dark-theme .json-preview .vjs-null {
    color: #ef4444; /* Example red */
}
.file-manager.dark-theme .json-preview .vjs-arrow {
    color: var(--text-secondary);
}
.file-manager.dark-theme .json-preview .vjs-edit-box {
     background-color: var(--hover-bg);
     color: var(--text-primary);
     border-color: var(--border-color);
}
.file-manager.dark-theme .json-preview .vjs-edit-btn {
     color: var(--primary-color);
}


/* Responsive design */
@media (max-width: 768px) {
  .file-manager {
      min-height: calc(100vh - 2rem); /* Adjust height for smaller screens */
      margin: 0.5rem; /* Add margin */
  }
  .main {
    /* flex-direction: column; - already set */
    gap: 0;
  }

  .breadcrumb {
    padding: 10px;
    font-size: 13px;
  }
   .breadcrumb-icon-fa {
       font-size: 1em;
   }
   .separator {
       margin: 0 5px;
   }


  .actions {
    padding: 10px;
    gap: 8px;
  }

  .actions button {
    padding: 8px 12px;
    font-size: 13px;
    gap: 6px;
  }
   .btn-icon-fa {
       font-size: 0.8em;
   }


  .files-table th,
  .files-table td {
    padding: 10px 8px;
    font-size: 13px;
  }

  .files-table th:nth-child(3),
  .files-table td:nth-child(3) {
    display: none; /* Hide size column on small screens */
  }

    .item-row td:first-child {
        gap: 6px;
    }
     .item-icon-fa {
         font-size: 1em;
         width: 1em;
     }


  .actions-cell {
    gap: 6px;
    justify-content: center; /* Center actions on mobile */
  }
   .actions-cell button {
       width: 28px;
       height: 28px;
   }
    .action-btn-icon-fa {
        font-size: 0.8em;
    }


  .empty-message {
    padding: 30px 0;
    font-size: 14px;
    gap: 6px;
  }
   .empty-icon-fa {
       font-size: 1.1em;
   }


  .modal-content {
    width: 95%;
  }

  .preview-modal, .edit-modal {
    width: 95%;
    max-height: 90vh;
  }
   .modal-header {
       padding: 12px 15px;
   }
    .modal-header h2 {
        font-size: 16px;
    }
    .close-btn {
        font-size: 20px; /* Adjust close button icon size */
        width: 28px;
        height: 28px;
    }

  .modal-body {
      padding: 15px;
  }
   .form-group label {
       font-size: 14px;
   }
   .form-group input, .form-group textarea {
       padding: 10px;
       font-size: 13px;
   }
   .edit-textarea {
       min-height: 200px; /* Reduce min-height */
       font-size: 13px;
   }
   .edit-error {
       padding: 10px;
       font-size: 13px;
       gap: 6px;
   }
    .edit-error svg, .warning svg { /* Adjust icons in messages */
        font-size: 1em;
    }


  .form-actions {
    gap: 8px;
    margin-top: 15px;
  }
   .form-actions button {
       padding: 8px 15px;
       font-size: 13px;
   }

   .warning {
       padding: 10px;
       font-size: 13px;
       gap: 8px;
       margin-top: 10px;
   }

  .preview-loading {
      padding: 30px;
      gap: 10px;
      font-size: 14px;
  }
   .loading-spinner-fa {
       font-size: 1.8em;
   }

   .preview-error {
       padding: 12px;
       font-size: 13px;
       gap: 8px;
   }

   .image-preview, .audio-preview, .video-preview {
       padding: 10px;
   }
   .audio-info {
       font-size: 13px;
       gap: 3px;
   }


  .notification {
    bottom: 10px;
    right: 10px;
    padding: 10px 15px;
    font-size: 13px;
    gap: 8px;
  }
    .notification-icon-fa {
        font-size: 1.1em;
    }
}
</style>