<template>
  <div class="manage-page">
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">
        <font-awesome-icon :icon="['fas', 'cogs']" /> 管理中心
      </h1>
      <p class="page-subtitle">访问不同的管理工具和查看系统信息。</p>
      <hr class="separator thick-separator">
    </div>

    <div class="page-content">
      <!-- Management Cards Section -->
      <div class="management-cards">
        <!-- 故事管理卡片 -->
        <div class="management-card card clickable" @click="showStoryManager">
          <div class="card-icon-container bg-primary-light">
            <font-awesome-icon :icon="['fas', 'book-open']" class="card-main-icon text-primary" />
          </div>
          <div class="card-content">
            <h2 class="card-title">故事管理</h2>
            <p class="card-description">查看、导出或删除已生成的游戏故事。</p>
          </div>
          <div class="card-action-container">
             <font-awesome-icon :icon="['fas', 'chevron-right']" class="card-action-icon" />
          </div>
        </div>

        <!-- 大纲管理卡片 (If Manage_Outline.vue exists) -->
        <div class="management-card card clickable" @click="showOutlineManager">
           <div class="card-icon-container bg-secondary-light">
             <font-awesome-icon :icon="['fas', 'scroll']" class="card-main-icon text-secondary" />
          </div>
          <div class="card-content">
            <h2 class="card-title">大纲管理</h2>
            <p class="card-description">创建、编辑和管理游戏剧情大纲。</p>
          </div>
           <div class="card-action-container">
             <font-awesome-icon :icon="['fas', 'chevron-right']" class="card-action-icon" />
          </div>
        </div>

        <!-- 文件管理卡片 (If Manage_File.vue exists) -->
        <div class="management-card card clickable" @click="showFileManager">
           <div class="card-icon-container bg-info-light">
             <font-awesome-icon :icon="['fas', 'folder-open']" class="card-main-icon text-info" />
          </div>
          <div class="card-content">
            <h2 class="card-title">文件管理</h2>
            <p class="card-description">管理本地存储的文件、资源和配置。</p>
          </div>
           <div class="card-action-container">
             <font-awesome-icon :icon="['fas', 'chevron-right']" class="card-action-icon" />
          </div>
        </div>
      </div>

      <!-- System Info Section -->
      <div class="system-info-section">
        <div class="info-card card">
          <h3 class="info-card-title">
            <font-awesome-icon :icon="['fas', 'info-circle']" /> 系统信息
          </h3>
          <div class="info-item">
            <span class="label">应用版本:</span>
            <span class="value version-value">v1.0.5</span>
          </div>
          <div class="info-item">
            <span class="label tooltip-container">IndexedDB 容量:
               <span class="tooltip-text">浏览器为本站分配的 IndexedDB 存储空间估算 (可能不完全准确)。</span>
            </span>
            <span class="value">{{ storageUsage }}</span>
          </div>
          <div class="info-item">
            <span class="label tooltip-container">LocalStorage 大小:
                 <span class="tooltip-text">当前存储在 LocalStorage 中的配置数据大小估算。</span>
            </span>
            <span class="value">{{ localStorageInfo }}</span>
          </div>
           <!-- Optional: Add Last Backup info if applicable -->
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Story Manager Modal -->
    <div class="modal" v-if="showStoryModal" @click.self="closeStoryManager">
      <div class="modal-content manage-modal story-modal card" :class="{ 'animate-in': animateStoryWindow }">
        <div class="modal-header">
          <h2 class="modal-title">
             <font-awesome-icon :icon="['fas', 'book-open']" /> 故事管理
          </h2>
          <button class="close-btn btn btn-text btn-sm" @click="closeStoryManager" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <!-- Ensure event is forwarded -->
          <component v-if="storyWindowLoaded" :is="StoryManageComponent" @show-message="handleShowMessage" />
          <div v-else class="modal-loading-indicator">
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon" />
            <span>加载中...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Outline Manager Modal -->
    <div class="modal" v-if="showOutlineModal" @click.self="closeOutlineManager">
      <div class="modal-content manage-modal outline-modal card" :class="{ 'animate-in': animateOutlineWindow }">
        <div class="modal-header">
          <h2 class="modal-title">
            <font-awesome-icon :icon="['fas', 'scroll']" /> 大纲管理
          </h2>
          <button class="close-btn btn btn-text btn-sm" @click="closeOutlineManager" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <!-- Ensure event is forwarded -->
          <component v-if="outlineWindowLoaded" :is="OutlineManageComponent" @show-message="handleShowMessage" />
           <div v-else class="modal-loading-indicator">
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon" />
            <span>加载中...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- File Manager Modal -->
     <div class="modal" v-if="showFileModal" @click.self="closeFileManager">
      <div class="modal-content manage-modal file-modal card" :class="{ 'animate-in': animateFileWindow }">
        <div class="modal-header">
          <h2 class="modal-title">
             <font-awesome-icon :icon="['fas', 'folder-open']" /> 文件管理
          </h2>
          <button class="close-btn btn btn-text btn-sm" @click="closeFileManager" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
           <!-- Ensure event is forwarded -->
          <component v-if="fileWindowLoaded" :is="FileManageComponent" @show-message="handleShowMessage" />
           <div v-else class="modal-loading-indicator">
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon" />
            <span>加载中...</span>
          </div>
        </div>
      </div>
    </div>

     <!-- Message Bubble is handled globally by app.vue -->
  </div>
</template>

<script>
import { markRaw } from 'vue';

export default {
  name: 'Manage',
  // Props definition to accept the event from parent if needed,
  // but we will emit directly to the root listener setup by app.vue
  // props: {
  //   showGlobalMessage: Function // Example if passing down
  // },
  emits: ['show-message'], // Declare the event
  data() {
    return {
      storageUsage: '计算中...',
      localStorageInfo: '计算中...',
      showStoryModal: false,
      storyWindowLoaded: false,
      animateStoryWindow: false,
      showOutlineModal: false,
      outlineWindowLoaded: false,
      animateOutlineWindow: false,
      showFileModal: false,
      fileWindowLoaded: false,
      animateFileWindow: false,
      StoryManageComponent: null,
      OutlineManageComponent: null,
      FileManageComponent: null,
    };
  },
  methods: {
    // --- Component Loading Methods (show/close Story/Outline/File Manager) ---
    // --- Keep the existing logic using dynamic import and markRaw ---
    // --- Add null checks for components before using them ---
     async showStoryManager() {
      this.showStoryModal = true;
      this.storyWindowLoaded = false;
      this.animateStoryWindow = false;

      if (!this.StoryManageComponent) {
        try {
          console.log("Loading Manage_Story.vue...");
          const module = await import('./Manage_Story.vue');
          this.StoryManageComponent = markRaw(module.default);
          console.log("Manage_Story.vue loaded.");
        } catch (error) {
          console.error('加载故事管理器组件失败:', error);
          this.handleShowMessage({ title: 'error', message: '加载故事管理器组件失败' });
          this.showStoryModal = false;
          return;
        }
      }

       this.$nextTick(() => {
         setTimeout(() => { this.animateStoryWindow = true; }, 50);
         setTimeout(() => {
           this.storyWindowLoaded = true;
         }, 300);
       });
    },
    closeStoryManager() {
      this.animateStoryWindow = false;
      setTimeout(() => {
        this.showStoryModal = false;
        this.storyWindowLoaded = false;
      }, 300);
    },
    async showOutlineManager() {
       this.showOutlineModal = true;
       this.outlineWindowLoaded = false;
       this.animateOutlineWindow = false;

       if (!this.OutlineManageComponent) {
         try {
           console.log("Loading Manage_Outline.vue..."); // Assume this exists
           const module = await import('./Manage_Outline.vue');
            this.OutlineManageComponent = markRaw(module.default);
           console.log("Manage_Outline.vue loaded.");
         } catch (error) {
           console.error('加载大纲管理器组件失败:', error);
           this.handleShowMessage({ title: 'error', message: '加载大纲管理器组件失败 (可能文件不存在)' });
            this.showOutlineModal = false;
           return;
         }
       }

       this.$nextTick(() => {
          setTimeout(() => { this.animateOutlineWindow = true; }, 50);
         setTimeout(() => {
           this.outlineWindowLoaded = true;
         }, 300);
       });
    },
    closeOutlineManager() {
       this.animateOutlineWindow = false;
       setTimeout(() => {
         this.showOutlineModal = false;
         this.outlineWindowLoaded = false;
       }, 300);
    },
    async showFileManager() {
       this.showFileModal = true;
       this.fileWindowLoaded = false;
       this.animateFileWindow = false;

       if (!this.FileManageComponent) {
         try {
           console.log("Loading Manage_File.vue..."); // Assume this exists
           const module = await import('./Manage_File.vue');
            this.FileManageComponent = markRaw(module.default);
            console.log("Manage_File.vue loaded.");
         } catch (error) {
           console.error('加载文件管理器组件失败:', error);
           this.handleShowMessage({ title: 'error', message: '加载文件管理器组件失败 (可能文件不存在)' });
            this.showFileModal = false;
           return;
         }
       }

       this.$nextTick(() => {
         setTimeout(() => { this.animateFileWindow = true; }, 50);
         setTimeout(() => {
           this.fileWindowLoaded = true;
         }, 300);
       });
    },
    closeFileManager() {
       this.animateFileWindow = false;
       setTimeout(() => {
         this.showFileModal = false;
         this.fileWindowLoaded = false;
       }, 300);
    },

    // --- Notification Handling ---
    // Renamed showNotification to handleShowMessage for clarity
    // This method now just emits the event upwards
    handleShowMessage(payload) {
      // Check if payload is valid
      if (payload && typeof payload === 'object' && payload.message && payload.title) {
        this.$emit('show-message', payload);
      } else {
        console.warn("Invalid payload received for show-message:", payload);
        // Optionally emit a generic error message
        this.$emit('show-message', { title: 'error', message: '收到无效的通知请求' });
      }
    },

    // --- Storage Calculation Methods (Keep existing logic) ---
    calculateStorageUsage() {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          navigator.storage.estimate().then(({ usage, quota }) => {
              const usedMB = (usage / (1024 * 1024)).toFixed(1);
              const quotaGB = quota ? (quota / (1024 * 1024 * 1024)).toFixed(1) : 0; // Ensure quota exists
               if (quota === 0 || isNaN(quotaGB) || quotaGB === '0.0') {
                    this.storageUsage = `${usedMB} MB / 容量未知`;
               } else {
                    this.storageUsage = `${usedMB} MB / ${quotaGB} GB`;
               }
            }).catch((err) => {
              console.error('存储估算错误:', err);
              this.storageUsage = '估算失败';
            });
        } else {
          this.storageUsage = '浏览器不支持估算';
        }
      } catch (error) {
        console.error('计算存储空间使用情况失败:', error);
        this.storageUsage = '计算失败';
      }
    },
    calculateLocalStorageUsage() {
      try {
        const sizeInBytes = this.getLocalStorageSize();
        let sizeFormatted = '无法计算';
        if (!isNaN(sizeInBytes)) {
             if (sizeInBytes > 1024 * 1024) { // MB
                sizeFormatted = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
             } else if (sizeInBytes > 1024) { // KB
                sizeFormatted = `${(sizeInBytes / 1024).toFixed(2)} KB`;
             } else { // Bytes
                 sizeFormatted = `${sizeInBytes} Bytes`;
             }
        }
        this.localStorageInfo = sizeFormatted;
      } catch (error) {
        console.error('计算 localStorage 大小失败:', error);
        this.localStorageInfo = '计算失败';
      }
    },
    getLocalStorageSize() {
      try {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                 const value = localStorage.getItem(key);
                 if (value) {
                     // Estimate size: key length + value length (UTF-16, 2 bytes/char)
                     total += (key.length + value.length) * 2;
                 }
            }
        }
        return total;
      } catch (e) {
          console.error('获取 localStorage size 失败:', e);
          return NaN; // Return NaN on error
      }
    },
  },
  mounted() {
    this.calculateStorageUsage();
    this.calculateLocalStorageUsage();
  },
};
</script>

<style scoped>
.manage-page {
  padding: 15px; /* Add padding to the page container */
}

/* Page Header */
.page-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
}

.separator {
  border: none;
  border-top: 1px solid var(--border-color);
  margin-top: 16px;
}

.thick-separator {
    border-top-width: 2px;
}


.page-content {
  display: flex;
  gap: 24px;
}

/* Management Cards */
.management-cards {
  grid-column: 1 / -1; /* Span full width initially */
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px; /* Space below cards */
}

.management-card {
  /* Inherits .card style */
  display: flex;
  align-items: center;
  padding: 18px;
  gap: 18px;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}
.management-card.clickable {
    cursor: pointer;
}
.management-card.clickable:hover {
    transform: translateY(-3px);
    box-shadow: var(--box-shadow-hover);
}

.card-icon-container {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
   /* background-color: var(--hover-overlay); Added specific bg colors */
}
.bg-primary-light { background-color: rgba(var(--primary-color-rgb, 52, 152, 219), 0.1); }
.bg-secondary-light { background-color: rgba(var(--secondary-color-rgb, 46, 204, 113), 0.1); }
.bg-info-light { background-color: rgba(var(--info-color-rgb, 155, 89, 182), 0.1); }


.card-main-icon {
  font-size: 1.6rem;
   /* color: var(--primary-color); Added specific text colors */
}
.text-primary { color: var(--primary-color); }
.text-secondary { color: var(--secondary-color); }
.text-info { color: var(--info-color); }


.card-content {
  flex-grow: 1;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--text-primary);
}

.card-description {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.card-action-container {
    margin-left: auto; /* Push arrow to the right */
    flex-shrink: 0;
}

.card-action-icon {
    font-size: 1rem;
    color: var(--text-tertiary);
    transition: color 0.2s ease;
}
.management-card:hover .card-action-icon {
    color: var(--primary-color);
}


/* System Info Section */
.system-info-section {
  grid-column: 1 / -1; /* Span full width */
}

.info-card {
  /* Inherits .card style */
  padding: 20px;
}

.info-card-title {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 0.95rem;
  border-bottom: 1px solid var(--hover-overlay);
}
.info-item:last-child {
    border-bottom: none;
}

.info-item .label {
  color: var(--text-secondary);
  font-weight: 500;
}

.info-item .value {
  color: var(--text-primary);
  font-weight: 400;
}

.version-value {
    font-weight: 500;
    padding: 2px 6px;
    background-color: var(--primary-light);
    color: white;
    border-radius: var(--border-radius-sm);
    font-size: 0.9rem;
}
.dark-theme .version-value {
     background-color: var(--primary-dark);
}

/* Modal Styles */
.modal { /* Changed from .modal-overlay for consistency */
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  padding: 20px;
  overflow: visible; /* Prevent body scroll when modal is open */
}

.modal-content {
  /* Inherits .card style */
  position: relative;
  width: 100%;
  background-color: var(--surface-color); /* Use surface color for modal */
  border-radius: var(--border-radius-lg);
  box-shadow: var(--box-shadow-hover);
  display: flex;
  flex-direction: column;
  overflow: visible;
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-content.animate-in {
  opacity: 1;
  transform: scale(1);
}

/* Specific Modal Sizes */
.manage-modal {
    max-height: 90vh;
}
.story-modal { max-width: 900px; /* Wider for story management */ }
.outline-modal { max-width: 700px; }
.file-modal { max-width: 1000px; /* Potentially wide for file lists */ }


.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding: 15px 20px;
  flex-shrink: 0; /* Prevent header from shrinking */
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
   display: flex;
   align-items: center;
   gap: 10px;
}


.modal-body {
  padding: 20px;
  overflow-y: auto; /* Enable scrolling for content */
  flex-grow: 1; /* Allow body to take available space */
  min-height: 200px; /* Ensure a minimum height */
}

.modal-loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 150px; /* Ensure indicator is visible */
    color: var(--text-secondary);
    font-size: 1rem;
}
.modal-loading-icon {
    font-size: 2rem;
    margin-bottom: 15px;
    color: var(--primary-color);
}


/* Tooltip Styles (Copied from previous example for consistency) */
.tooltip-container {
  position: relative;
  cursor: help;
}
.tooltip-text {
  visibility: hidden; width: 200px; background-color: var(--text-primary);
  color: var(--background-color); text-align: center; border-radius: var(--border-radius-sm);
  padding: 5px 8px; position: absolute; z-index: 1; bottom: 125%; left: 50%;
  margin-left: -100px; opacity: 0; transition: opacity 0.3s; font-size: 0.8rem; font-weight: normal;
}
.tooltip-text::after {
  content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px;
  border-width: 5px; border-style: solid; border-color: var(--text-primary) transparent transparent transparent;
}
.tooltip-container:hover .tooltip-text { visibility: visible; opacity: 1; }
.dark-theme .tooltip-text { background-color: var(--surface-color); color: var(--text-primary); }
.dark-theme .tooltip-text::after { border-top-color: var(--surface-color); }


/* Responsive */
@media (max-width: 992px) {
    .page-content {
        grid-template-columns: 1fr; /* Stack info below cards */
    }
    .management-cards {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Adjust card min-width */
    }
}
@media (max-width: 768px) {
    .manage-page {
        padding: 10px;
    }
    .management-cards {
         grid-template-columns: 1fr; /* Stack cards */
    }
    .modal-content {
        max-width: 95%;
        max-height: 85vh;
    }
    .modal-body {
        padding: 15px;
    }
}
.story-management {
  position: relative; /* 确保子组件可以相对于父容器定位 */
  overflow: visible; /* 允许子组件超出父容器的边界 */
}
</style>