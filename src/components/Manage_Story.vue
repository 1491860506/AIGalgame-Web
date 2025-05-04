<template>
  <div class="story-management">
    <!-- Header can be simplified or removed if title is in modal header -->
    <!-- <h2>游戏故事管理</h2> -->

    <div v-if="isLoading" class="loading-indicator full-height">
      <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon-fa large" />
      <span>加载故事列表中...</span>
    </div>

    <div v-else-if="stories.length === 0" class="empty-state full-height">
      <font-awesome-icon :icon="['fas', 'box-open']" class="empty-icon-fa large" />
      <p>还没有任何故事。</p>
      <!-- Optional: Add creation button if functionality exists -->
      <!-- <button @click="createNewStory" class="btn btn-primary"><font-awesome-icon :icon="['fas', 'plus']" /> 创建第一个故事</button> -->
    </div>

    <ul v-else class="story-list">
      <li v-for="story in stories" :key="story.title" class="story-item card">
        <div class="story-cover">
          <img v-if="story.coverUrl" :src="story.coverUrl" alt="封面" class="cover-image" @error="onCoverError(story)">
           <div v-else-if="story.loadingCover" class="default-icon cover-loading">
             <font-awesome-icon :icon="['fas', 'spinner']" spin />
          </div>
          <div v-else class="default-icon cover-placeholder">
             <font-awesome-icon :icon="['fas', 'book']" />
          </div>
        </div>
        <div class="story-info">
          <span class="story-title">{{ story.title }}</span>
           <!-- Optional: Add description or date modified later -->
           <!-- <span class="story-description">上次修改: ...</span> -->
        </div>
        <div class="story-actions">
          <button @click="viewStoryContent(story)" class="action-button btn btn-sm btn-outline" title="查看内容">
             <font-awesome-icon :icon="['fas', 'eye']" />
          </button>
          <button @click="viewStoryResources(story)" class="action-button btn btn-sm btn-outline" title="查看资源">
             <font-awesome-icon :icon="['fas', 'boxes-stacked']" />
          </button>
          <button @click="renameStory(story)" class="action-button btn btn-sm btn-secondary" title="重命名">
             <font-awesome-icon :icon="['fas', 'pen']" />
          </button>
          <button @click="deleteStory(story)" class="action-button btn btn-sm btn-danger" title="删除">
             <font-awesome-icon :icon="['fas', 'trash-alt']" />
          </button>
        </div>
      </li>
    </ul>

    <!-- Floating window container: for loading ExportStory.vue -->
    <div class="modal" v-if="showContentModal" @click.self="closeContentModal">
      <div class="modal-content manage-child-modal card" :class="{ 'animate-in': animateContentWindow }">
        <div class="modal-header">
          <h2 class="modal-title">查看故事内容: {{ currentStoryTitle }}</h2>
          <button class="close-btn btn btn-text btn-sm" @click="closeContentModal" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
          <!-- Ensure event forwarding -->
          <component
            v-if="contentWindowLoaded"
            :is="ExportStoryComponent"
            :storyTitle="currentStoryTitle"
            @close="closeContentModal"
            @show-message="handleShowMessage"
             />
          <div v-else class="modal-loading-indicator">
            <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon" /> 加载中...
          </div>
        </div>
      </div>
    </div>

     <!-- Floating window container: for loading readresources.vue -->
     <div class="modal" v-if="showResourcesModal" @click.self="closeResourcesModal">
      <div class="modal-content manage-child-modal card" :class="{ 'animate-in': animateResourcesWindow }">
        <div class="modal-header">
          <h2 class="modal-title">查看故事资源: {{ currentStoryTitle }}</h2>
          <button class="close-btn btn btn-text btn-sm" @click="closeResourcesModal" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="modal-body">
           <!-- Ensure event forwarding -->
           <component
            v-if="resourcesWindowLoaded"
            :is="ReadResourcesComponent"
            :storyTitle="currentStoryTitle"
            @close="closeResourcesModal"
            @show-message="handleShowMessage"
            />
            <div v-else class="modal-loading-indicator">
              <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon" /> 加载中...
            </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { markRaw } from 'vue'; // Import markRaw
import {
  getAllTitles,
  readFile,
  renamePath,
  deletePath
} from './services/IndexedDBFileSystem';

// FontAwesome icons are assumed to be globally registered

export default {
  name: 'ManageStory',
  // Inherit listeners to allow forwarding events without declaring them
  inheritAttrs: false,
  emits: ['show-message', 'close'], // Declare events this component emits itself
  data() {
    return {
      isLoading: true,
      stories: [],
      showContentModal: false,
      contentWindowLoaded: false,
      animateContentWindow: false,
      ExportStoryComponent: null,
      currentStoryTitle: '',
      showResourcesModal: false,
      resourcesWindowLoaded: false,
      animateResourcesWindow: false,
      ReadResourcesComponent: null,
      objectUrls: {}
    };
  },
  async mounted() {
    this.fetchStories();
  },
   beforeUnmount() { // Changed from beforeDestroy
    this.releaseObjectUrls();
  },
  methods: {
    async fetchStories() {
      this.isLoading = true;
      this.stories = [];
      this.releaseObjectUrls();

      try {
        let titles = await getAllTitles();
        const reservedNames = ['test', 'source'];
        titles = titles.filter(title => !reservedNames.includes(title.toLowerCase()));
        console.log('Fetched story titles:', titles);

        this.stories = await Promise.all(titles.map(async (title) => {
           const story = { title: title, coverUrl: null, loadingCover: true };
           try {
             const fileData = await readFile(`/data/${title}/images/title.png`);
             if (fileData instanceof Blob) {
               const url = URL.createObjectURL(fileData);
               story.coverUrl = url;
               this.objectUrls[title] = url;
             } else { story.coverUrl = null; }
           } catch (error) { story.coverUrl = null; }
           finally { story.loadingCover = false; }
           return story;
        }));
        this.stories.sort((a, b) => a.title.localeCompare(b.title));
      } catch (error) {
        console.error('加载故事列表失败:', error);
        this.handleShowMessage({ title: 'error', message: '加载故事列表失败' });
      } finally {
        this.isLoading = false;
      }
    },

    onCoverError(story) {
        if (story) { // Add null check for story
            console.warn(`Error loading cover image for "${story.title}", falling back to default icon.`);
            story.coverUrl = null; // Set coverUrl to null to display the default icon
        }
    },

    async viewStoryContent(story) {
      if (!story) return;
      this.currentStoryTitle = story.title;
      this.showContentModal = true;
      this.contentWindowLoaded = false;
      this.animateContentWindow = false; // Reset animation state

      if (!this.ExportStoryComponent) {
        try {
          const module = await import('./Manage_ExportStory.vue');
          this.ExportStoryComponent = markRaw(module.default); // Use markRaw
        } catch (error) {
          console.error('加载 ExportStory.vue 组件失败:', error);
          this.handleShowMessage({ title: 'error', message: '加载故事内容查看器失败' });
          this.closeContentModal();
          return;
        }
      }
      this.$nextTick(() => {
        setTimeout(() => { this.animateContentWindow = true; }, 50); // Trigger animation
        setTimeout(() => { this.contentWindowLoaded = true; }, 300);
      });
    },
    closeContentModal() {
      this.animateContentWindow = false;
      setTimeout(() => {
        this.showContentModal = false;
        this.contentWindowLoaded = false;
        this.currentStoryTitle = '';
      }, 300);
    },

    async viewStoryResources(story) {
       if (!story) return;
       this.currentStoryTitle = story.title;
       this.showResourcesModal = true;
       this.resourcesWindowLoaded = false;
       this.animateResourcesWindow = false; // Reset

       if (!this.ReadResourcesComponent) {
         try {
           const module = await import('./Manage_readresources.vue');
           this.ReadResourcesComponent = markRaw(module.default); // Use markRaw
         } catch (error) {
           console.error('加载 readresources.vue 组件失败:', error);
           this.handleShowMessage({ title: 'error', message: '加载故事资源查看器失败' });
           this.closeResourcesModal();
           return;
         }
       }
        this.$nextTick(() => {
            setTimeout(() => { this.animateResourcesWindow = true; }, 50); // Trigger animation
            setTimeout(() => { this.resourcesWindowLoaded = true; }, 300);
        });
    },
    closeResourcesModal() {
        this.animateResourcesWindow = false;
        setTimeout(() => {
            this.showResourcesModal = false;
            this.resourcesWindowLoaded = false;
            this.currentStoryTitle = '';
        }, 300);
    },

    async renameStory(story) {
       if (!story) return;
       const oldTitle = story.title;
       const newTitle = prompt(`请输入 "${oldTitle}" 的新名称:`, oldTitle);
       if (newTitle && newTitle.trim() && newTitle.trim() !== oldTitle) {
         const trimmedNewTitle = newTitle.trim();
          if (trimmedNewTitle.includes('/') || trimmedNewTitle.includes('\\') || trimmedNewTitle.includes('.')) {
               this.handleShowMessage({ title: 'warning', message: '故事名称不能包含 / \\ .' }); return;
          }
          if (this.stories.some(s => s.title === trimmedNewTitle)) {
               this.handleShowMessage({ title: 'warning', message: `故事 "${trimmedNewTitle}" 已存在` }); return;
          }
          try {
             await renamePath(`/data/${oldTitle}`, trimmedNewTitle);
             this.handleShowMessage({ title: 'success', message: `故事 "${oldTitle}" 已重命名为 "${trimmedNewTitle}"` });
             this.fetchStories(); // Refresh list
          } catch (error) {
             console.error(`重命名故事 "${oldTitle}" 失败:`, error);
             this.handleShowMessage({ title: 'error', message: `重命名故事 "${oldTitle}" 失败` });
          }
       }
    },

    async deleteStory(story) {
       if (!story) return;
       const titleToDelete = story.title;
       if (confirm(`确定要删除故事 "${titleToDelete}" 吗？此操作不可逆！`)) {
         try {
           await deletePath(`/data/${titleToDelete}`);
           this.handleShowMessage({ title: 'success', message: `故事 "${titleToDelete}" 已删除` });
           this.stories = this.stories.filter(s => s.title !== titleToDelete);
           if (this.objectUrls[titleToDelete]) {
              URL.revokeObjectURL(this.objectUrls[titleToDelete]);
              delete this.objectUrls[titleToDelete];
           }
         } catch (error) {
           console.error(`删除故事 "${titleToDelete}" 失败:`, error);
           this.handleShowMessage({ title: 'error', message: `删除故事 "${titleToDelete}" 失败` });
         }
       }
    },

    releaseObjectUrls() {
       Object.values(this.objectUrls).forEach(url => URL.revokeObjectURL(url));
       this.objectUrls = {};
    },

    // Method to handle the event and emit it upwards
    handleShowMessage(payload) {
       // Directly emit the event received from children or generated locally
       this.$emit('show-message', payload);
    }
  }
};
</script>

<style scoped>
.story-management {
  padding: 5px; /* Minimal padding, assumes modal provides padding */
  /* height: 100%; *//* Let modal body handle height/scrolling */
  overflow: visible; /* 允许内容溢出 */
  position: relative; /*  为子元素的绝对定位提供参照 */
}

/* Loading and Empty States */
.loading-indicator, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}
.full-height {
    min-height: 200px; /* Ensure it takes some space */
    /* Consider height: 100%; if the container allows it */
}
.loading-icon-fa, .empty-icon-fa {
  font-size: 2.5rem;
  margin-bottom: 15px;
  color: var(--primary-color);
}
.empty-icon-fa {
    color: var(--text-tertiary);
}
.loading-indicator.large, .empty-state.large {
    font-size: 1.1rem;
}

/* Story List */
.story-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* Responsive grid */
  gap: 15px;
  overflow: visible; /* 允许内容溢出 */
}

.story-item {
  /* Inherits .card */
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px;
  transition: box-shadow 0.2s ease;
}
.story-item:hover {
   box-shadow: var(--box-shadow-hover);
}

.story-cover {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  background-color: var(--hover-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-icon {
  font-size: 1.8rem;
  color: var(--text-tertiary);
}
.cover-placeholder .svg-inline--fa { /* Target icon within placeholder */
    color: var(--text-tertiary);
}
.cover-loading .svg-inline--fa { /* Target icon within loading */
    color: var(--primary-color);
}

.story-info {
  flex-grow: 1;
  overflow: hidden; /* Prevent title overflow */
}

.story-title {
  display: block;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}

.story-description { /* Style for optional description */
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.story-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto; /* Push actions to the right */
}

.action-button {
  /* Use global .btn .btn-sm and color variants */
  padding: 5px 8px; /* Smaller padding for icon buttons */
}
.action-button .svg-inline--fa { /* Style icon size */
    font-size: 0.9rem;
}

/* Modal Styles (Copied from Manage.vue for consistency, adjusted size) */
.modal {
  position: fixed; inset: 0; background-color: rgba(0,0,0,0.6);
  display: flex; justify-content: center; align-items: center;
  z-index: 1100; /* Higher than parent modal */
  padding: 20px;
}
.modal-content {
  /* Inherits .card */
  width: 100%; background-color: var(--surface-color);
  border-radius: var(--border-radius-lg); box-shadow: var(--box-shadow-hover);
  display: flex; flex-direction: column; overflow: hidden;
  opacity: 0; transform: scale(0.95);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.modal-content.animate-in { opacity: 1; transform: scale(1); }

.manage-child-modal {
    max-width: 100%; /* Allow child modals to be wide */
    max-height: 85vh;
}

.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--border-color); padding: 15px 20px; flex-shrink: 0;
}
.modal-title {
  font-size: 1.2rem; font-weight: 600; margin: 0;
}


.modal-body {
  padding: 0; /* Remove padding, let child component handle it */
  overflow: visible;
   flex-grow: 1; min-height: 200px;
}
.modal-loading-indicator {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 150px; color: var(--text-secondary); font-size: 1rem;
}
.modal-loading-icon { font-size: 2rem; margin-bottom: 15px; color: var(--primary-color); }

/* Responsive */
@media (max-width: 768px) {
    .story-list {
        grid-template-columns: 1fr; /* Stack list items */
    }
    .story-item {
        flex-direction: column; /* Stack content vertically on small screens */
        align-items: flex-start; /* Align left */
        gap: 10px;
    }
    .story-cover {
        width: 100%;
        height: 120px; /* Adjust height for stacked view */
    }
     .story-info {
        width: 100%; /* Take full width */
    }
    .story-actions {
        margin-left: 0; /* Align left */
        margin-top: 10px;
        width: 100%;
        justify-content: flex-end; /* Keep buttons grouped right */
    }
     .manage-child-modal {
        max-width: 100%;
        max-height: 90vh;
     }
}

</style>