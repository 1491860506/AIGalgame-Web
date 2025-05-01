<template>
  <div class="manage-page">
    <div class="header">
      <h1>管理</h1>
    </div>

    <div class="content">
      <div class="management-cards">
        <!-- 故事管理卡片 -->
        <div class="card" @click="showStoryManager">
          <div class="card-icon">
            <!-- Replace emoji -->
            <!-- <span>📖</span> -->
             <font-awesome-icon :icon="['fas', 'book-open']" />
          </div>
          <div class="card-content">
            <h2>故事管理</h2>
            <p>创建、编辑和管理游戏故事内容</p>
          </div>
          <div class="card-action">
            <button class="action-button">
              <!-- Replace emoji -->
              <!-- <span>▶</span> -->
               <font-awesome-icon :icon="['fas', 'chevron-right']" />
            </button>
          </div>
        </div>

        <!-- 大纲管理卡片 -->
        <div class="card" @click="showOutlineManager">
          <div class="card-icon">
            <!-- Replace emoji -->
            <!-- <span>📜</span> -->
             <font-awesome-icon :icon="['fas', 'scroll']" />
          </div>
          <div class="card-content">
            <h2>大纲管理</h2>
            <p>创建、编辑和管理游戏剧情大纲</p>
          </div>
          <div class="card-action">
            <button class="action-button">
              <!-- Replace emoji -->
              <!-- <span>▶</span> -->
               <font-awesome-icon :icon="['fas', 'chevron-right']" />
            </button>
          </div>
        </div>

        <!-- 文件管理卡片 -->
        <div class="card" @click="showFileManager">
          <div class="card-icon">
            <!-- Replace emoji -->
            <!-- <span>📂</span> -->
             <font-awesome-icon :icon="['fas', 'folder-open']" />
          </div>
          <div class="card-content">
            <h2>文件管理</h2>
            <p>管理系统文件、资源和配置</p>
          </div>
          <div class="card-action">
            <button class="action-button">
              <!-- Replace emoji -->
              <!-- <span>▶</span> -->
               <font-awesome-icon :icon="['fas', 'chevron-right']" />
            </button>
          </div>
        </div>
      </div>

      <!-- 系统信息卡片 -->
      <div class="system-info">
        <div class="info-card">
          <h3>信息</h3>
          <div class="info-item">
            <span class="label">版本:</span>
            <span class="value">v1.0.5</span>
          </div>
          <div class="info-item">
            <span class="label">IndexedDB:</span>
            <span class="value">{{ storageUsage }}</span>
          </div>
          <div class="info-item">
            <span class="label">LocalStorage:</span>
            <span class="value">{{ localStorageInfo }}</span>
          </div>
           <!-- Optional: Add Last Backup info if applicable -->
           <!--
           <div v-if="lastBackup" class="info-item">
                <span class="label">最后备份:</span>
                <span class="value">{{ lastBackup }}</span>
           </div>
           -->
        </div>
      </div>
    </div>

    <!-- 故事管理器弹窗 -->
    <div
      class="floating-window-container"
      v-if="showStoryModal"
      @click.self="closeStoryManager"
    >
      <div
        class="floating-window story-window"
        :class="{ 'animate-in': animateStoryWindow }"
      >
        <div class="window-header">
          <h2>故事管理</h2>
          <button class="close-button" @click="closeStoryManager">
             <!-- Replace emoji span with icon -->
            <!-- <span>❌</span> -->
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="window-content">
          <component v-if="storyWindowLoaded" :is="StoryManageComponent" @show-message="$emit('show-message', $event)" />
          <div v-else class="loading-indicator">
            <!-- Replace custom loader with Font Awesome spinner -->
            <!-- <span class="loader"></span> -->
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon-fa" />
            <span>加载中...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 大纲管理器弹窗 -->
    <div
      class="floating-window-container"
      v-if="showOutlineModal"
      @click.self="closeOutlineManager"
    >
      <div
        class="floating-window outline-window"
        :class="{ 'animate-in': animateOutlineWindow }"
      >
        <div class="window-header">
          <h2>大纲管理</h2>
          <button class="close-button" @click="closeOutlineManager">
             <!-- Replace emoji span with icon -->
            <!-- <span>❌</span> -->
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="window-content">
          <component v-if="outlineWindowLoaded" :is="OutlineManageComponent" @show-message="$emit('show-message', $event)" />
          <div v-else class="loading-indicator">
             <!-- Replace custom loader with Font Awesome spinner -->
            <!-- <span class="loader"></span> -->
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon-fa" />
            <span>加载中...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件管理器弹窗 -->
    <div
      class="floating-window-container"
      v-if="showFileModal"
      @click.self="closeFileManager"
    >
      <div
        class="floating-window file-window"
        :class="{ 'animate-in': animateFileWindow }"
      >
        <div class="window-header">
          <h2>文件管理</h2>
          <button class="close-button" @click="closeFileManager">
             <!-- Replace emoji span with icon -->
            <!-- <span>❌</span> -->
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="window-content">
          <component v-if="fileWindowLoaded" :is="FileManageComponent" @show-message="$emit('show-message', $event)" />
          <div v-else class="loading-indicator">
             <!-- Replace custom loader with Font Awesome spinner -->
            <!-- <span class="loader"></span> -->
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon-fa" />
            <span>加载中...</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// 1. 从 'vue' 中导入 markRaw
import { markRaw } from 'vue';

export default {
  name: 'Manage',
  data() {
    return {
      // System Info (Keep)
      storageUsage: '计算中...',
      localStorageInfo: '计算中...',

      // Window States (Keep)
      showStoryModal: false,
      storyWindowLoaded: false,
      animateStoryWindow: false,

      showOutlineModal: false,
      showFileModal: false,
      outlineWindowLoaded: false,
      fileWindowLoaded: false,
      animateOutlineWindow: false,
      animateFileWindow: false,

      // Component References (Keep)
      // 这些属性本身是响应式的，但它们存储的值（组件定义）通过 markRaw 来阻止响应式化
      StoryManageComponent: null,
      OutlineManageComponent: null,
      FileManageComponent: null,
    };
  },
  methods: {
    async showStoryManager() {
      this.showStoryModal = true;
      this.storyWindowLoaded = false;

      if (!this.StoryManageComponent) {
        try {
          const module = await import('./Manage_Story.vue');
          // 2. 使用 markRaw 包裹组件定义
          this.StoryManageComponent = markRaw(module.default);
        } catch (error) {
          console.error('加载故事管理器组件失败:', error);
          this.showNotification('加载故事管理器组件失败', 'error');
          this.showStoryModal = false;
          return;
        }
      }

      this.$nextTick(() => {
        this.animateStoryWindow = true;
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

      if (!this.OutlineManageComponent) {
        try {
          const module = await import('./Manage_Outline.vue');
           // 2. 使用 markRaw 包裹组件定义
          this.OutlineManageComponent = markRaw(module.default);
        } catch (error) {
          console.error('加载大纲管理器组件失败:', error);
          this.showNotification('加载组件失败', 'error');
           this.showOutlineModal = false;
          return;
        }
      }

      this.$nextTick(() => {
        this.animateOutlineWindow = true;
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

      if (!this.FileManageComponent) {
        try {
          const module = await import('./Manage_File.vue');
           // 2. 使用 markRaw 包裹组件定义
          this.FileManageComponent = markRaw(module.default); // <-- 这里是关键修改
        } catch (error) {
          console.error('加载文件管理器组件失败:', error);
          this.showNotification('加载组件失败', 'error');
           this.showFileModal = false;
          return;
        }
      }

      this.$nextTick(() => {
        this.animateFileWindow = true;
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

    showNotification(message, type = 'info') {
      this.$emit('show-message', { title: type, message: message});
      console.log(`[ManagePage][${type.toUpperCase()}] ${message}`);
    },

    calculateStorageUsage() {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          navigator.storage
            .estimate()
            .then(({ usage, quota }) => {
              const usedMB = Math.round((usage / (1024 * 1024)) * 10) / 10;
              const totalGB = Math.round((quota / (1024 * 1024 * 1024)) * 10) / 10;
              if (isNaN(usedMB) || !isFinite(usedMB)) {
                  this.storageUsage = '无法计算使用量';
              } else if (isNaN(totalGB) || !isFinite(totalGB) || totalGB === 0) {
                  this.storageUsage = `${usedMB} MB / 容量未知`;
              }
              else {
                  this.storageUsage = `${usedMB} MB / ${totalGB} GB`;
              }
            })
            .catch((err) => {
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
        const sizeInKB = (sizeInBytes / 1024).toFixed(2);
        this.localStorageInfo = `${sizeInKB} KB`;
      } catch (error) {
        console.error('计算 localStorage 大小失败:', error);
        this.localStorageInfo = '无法计算';
      }
    },

    getLocalStorageSize() {
      try {
        const jsonString = JSON.stringify(localStorage);
        if (typeof Blob === 'undefined') {
             return jsonString.length * 2;
        }
        const blob = new Blob([jsonString], { type: 'application/json' });
        return blob.size;
      } catch (e) {
          console.error('获取 localStorage size 失败:', e);
          return 0;
      }
    },
  },
  mounted() {
    this.calculateStorageUsage();
    this.calculateLocalStorageUsage();
  },
  beforeDestroy() {
    // Cleanup removed timers
  }
};
</script>

<style scoped>
/* --- CSS Variables (ensure these are also in your global theme styles) --- */
/* Added basic variables here for standalone clarity, but they should ideally
   be consistent with your root/dark-theme definitions elsewhere. */
:root {
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  --content-bg: #ffffff;
  --sidebar-bg: #f8fafc;
  --hover-bg: #f1f5f9;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --card-hover-shadow: 0 12px 24px rgba(0, 0, 0, 0.1); /* Default for light mode */
}

/* Dark theme variables (should ideally be in your global theme styles) */
body.dark-theme {
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --border-color: #334155;
    --content-bg: #1e293b;
    --sidebar-bg: #0f172a;
    --hover-bg: #334155;
    --shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    --primary-color: #818cf8; /* Lighter primary for dark mode */
    --primary-hover: #6366f1; /* Lighter primary hover */
    --card-hover-shadow: 0 12px 24px rgba(0, 0, 0, 0.3); /* Darker shadow for dark mode */
}


/* --- Base Container Styles --- */
.manage-page {
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px;
  color: var(--text-primary); /* Use variable */
  min-height: 100vh;
  transition: all 0.3s ease;
  background-color: var(--content-bg); /* Add background color */
}

.header {
  display: flex;
  justify-content: flex-start; /* Align left after removing user info */
  align-items: center;
  margin-bottom: 40px;
  position: relative;
}

.header h1 {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color); /* Use variable */
  margin: 0;
  position: relative;
}

.header h1::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, var(--primary-color), transparent); /* Use variable */
  border-radius: 3px;
}

/* Removed .user-info styles */
/*
.user-info { ... }
.user { ... }
.timestamp { ... }
*/

.content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  transition: all 0.3s ease;
}

.management-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.card {
  display: flex;
  align-items: center;
  background-color: var(--sidebar-bg); /* Use variable */
  border-radius: 14px;
  padding: 24px;
  box-shadow: var(--shadow); /* Use variable */
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent; /* Initial border */
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--card-hover-shadow); /* Use variable */
  border-color: var(--primary-color); /* Use variable for hover border */
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--primary-color); /* Use variable */
  opacity: 0;
  transition: opacity 0.3s;
}

.card:hover::before {
  opacity: 1;
}

.card-icon {
  width: 56px;
  height: 56px;
  background-color: rgba(var(--primary-color-rgb, 79, 70, 229), 0.1); /* Use variable/rgba */
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  flex-shrink: 0;
  font-size: 28px; /* Controls icon size */
  color: var(--primary-color); /* Default icon color */
  transition: all 0.3s ease;
}

/* Dark theme specific card icon background */
/* Not needed if using rgba(var(--primary-color-rgb), 0.1) */
/*
body.dark-theme .card-icon {
  background-color: rgba(79, 70, 229, 0.2);
}
*/

.card:hover .card-icon {
  background-color: var(--primary-color); /* Use variable */
  color: white;
  transform: scale(1.05);
}

.card-content {
  flex: 1;
}

.card-content h2 {
  font-size: 19px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary); /* Use variable */
  transition: color 0.3s ease;
}

.card-content p {
  font-size: 14px;
  color: var(--text-secondary); /* Use variable */
  margin: 0;
  line-height: 1.5;
  transition: color 0.3s ease;
}

.card-action {
  margin-left: 16px;
}

.action-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(var(--primary-color-rgb, 79, 70, 229), 0.1); /* Use variable/rgba */
  border: none;
  color: var(--primary-color); /* Use variable */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px; /* Controls icon size */
}

/* Dark theme specific action button background */
/* Not needed if using rgba(var(--primary-color-rgb), 0.1) */
/*
body.dark-theme .action-button {
  background-color: rgba(79, 70, 229, 0.2);
}
*/

.card:hover .action-button {
  background-color: var(--primary-color); /* Use variable */
  color: white;
  transform: scale(1.1);
}

/* System info styles */
.system-info {
  padding-top: 10px;
}

.info-card {
  background-color: var(--sidebar-bg); /* Use variable */
  border-radius: 14px;
  padding: 24px;
  box-shadow: var(--shadow); /* Use variable */
  transition: all 0.3s ease;
  border: 1px solid transparent; /* Initial border */
}

.info-card:hover {
  border-color: var(--primary-color); /* Use variable for hover border */
  transform: translateY(-2px);
}

.info-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 18px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color); /* Use variable */
  color: var(--text-primary); /* Use variable */
  position: relative;
}

.info-card h3::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 60px;
  height: 2px;
  background: var(--primary-color); /* Use variable */
  border-radius: 2px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  font-size: 14px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--border-color); /* Use variable */
}

.info-item:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.info-item .label {
  color: var(--text-secondary); /* Use variable */
  font-weight: 500;
}

.info-item .value {
  font-weight: 600;
  color: var(--text-primary); /* Use variable */
  padding: 4px 10px;
  background-color: rgba(var(--primary-color-rgb, 79, 70, 229), 0.08); /* Use variable/rgba */
  border-radius: 6px;
  white-space: nowrap; /* Prevent value from wrapping */
}

/* Dark theme specific info value background */
/* Not needed if using rgba(var(--primary-color-rgb), 0.08) */
/*
body.dark-theme .info-item .value {
  background-color: rgba(79, 70, 229, 0.15);
}
*/


/* --- Floating Window Styles --- */
.floating-window-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(15, 23, 42, 0.7); /* Keep dark semi-transparent background */
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.floating-window {
  background-color: var(--content-bg); /* Use variable */
  border-radius: 16px;
  width: 90%;
  max-width: 1100px;
  height: 85vh;
  box-shadow: var(--shadow); /* Use variable */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transform: scale(0.95);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--border-color); /* Use variable */
}

.floating-window.animate-in {
  opacity: 1;
  transform: scale(1);
}

.window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-color); /* Use variable */
  flex-shrink: 0;
  background-color: var(--sidebar-bg); /* Use variable */
}

.window-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary); /* Use variable */
  position: relative;
  padding-left: 16px;
}

.window-header h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: var(--primary-color); /* Use variable */
  border-radius: 2px;
}

.close-button {
  background: var(--hover-bg); /* Use variable */
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary); /* Use variable */
  font-size: 16px; /* Controls icon size */
  transition: all 0.3s ease;
}

.close-button:hover {
  background-color: rgba(var(--error-color-rgb, 239, 68, 68), 0.1); /* Use variable/rgba */
  color: #ef4444; /* Keep red for close button */
  transform: rotate(90deg);
}

/* Remove span style as icon is now component */
/* .close-button span { display: none; } */


.window-content {
  flex: 1;
  overflow: auto;
  position: relative;
  padding: 24px;
}

.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  color: var(--text-secondary); /* Use variable */
}

/* Style for Font Awesome loading icon */
.loading-indicator .loading-icon-fa {
    font-size: 48px; /* Match original loader size */
    color: var(--primary-color); /* Use variable */
    /* animation handled by spin prop */
}

/* Remove custom loader styles */
/*
.loader { ... }
@keyframes rotation { ... }
*/


/* Dark theme specific overrides for shadows */
/* Already defined with variables at the top or in global style */
/*
:root { --card-hover-shadow: ... }
body.dark-theme { --card-hover-shadow: ... }
body.dark-theme .card:hover { box-shadow: var(--card-hover-shadow); }
body.dark-theme .floating-window { box-shadow: ... }
*/


/* --- Responsive Design --- */
@media (max-width: 900px) {
  .content {
    grid-template-columns: 1fr; /* Single column layout */
    gap: 24px;
  }

  .management-cards {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .manage-page {
    padding: 20px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
    margin-bottom: 30px;
  }
  /* Removed .user-info styles */
  /* .user-info { align-items: flex-start; } */


  .content { gap: 20px; }
  .management-cards {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .card { padding: 18px; }
  .card-icon {
    width: 48px;
    height: 48px;
    font-size: 24px; /* Adjusted size */
  }
  .card-content h2 { font-size: 18px; }
  .card-content p { font-size: 13px; }
  .action-button {
    width: 32px;
    height: 32px;
    font-size: 13px; /* Adjusted size */
  }


  .floating-window {
    width: 95%;
    height: 90vh;
  }
  .window-header { padding: 16px 20px; }
  .window-header h2 { font-size: 18px; }
  .window-content { padding: 20px; }
}

@media (max-width: 480px) {
  .manage-page {
    padding: 15px;
  }

  .header h1 { font-size: 24px; }

  .card { padding: 16px; }
  .card-icon {
    width: 42px;
    height: 42px;
    font-size: 22px; /* Adjusted size */
    margin-right: 15px;
  }
  .card-content h2 { font-size: 17px; }
  .card-content p { font-size: 13px; }
  .action-button {
    width: 32px;
    height: 32px;
    font-size: 12px; /* Adjusted size */
  }

  .window-header h2 { font-size: 18px; }
  .close-button {
    width: 32px;
    height: 32px;
    font-size: 16px; /* Adjusted size */
  }
}
</style>