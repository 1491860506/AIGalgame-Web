<template>
  <div class="story-management">
    <h2>游戏故事管理</h2>

    <!-- New Story button - Optional, if story creation is needed -->
    <!-- <button @click="createNewStory" class="create-button"><font-awesome-icon :icon="['fas', 'plus']" /> 新建故事</button> -->

    <div v-if="isLoading" class="loading-indicator">
      <!-- Replace <i> with component -->
      <!-- <i class="fas fa-spinner fa-spin"></i> -->
      <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon-fa" /> 加载故事列表中...
    </div>

    <div v-else-if="stories.length === 0" class="empty-state">
      <!-- Add icon to empty state -->
      <p>
         <font-awesome-icon :icon="['fas', 'info-circle']" class="empty-icon-fa" />
        还没有任何故事。是时候创造新的冒险了！
      </p>
      <!-- <button @click="createNewStory" class="create-button"><font-awesome-icon :icon="['fas', 'plus']" /> 创建第一个故事</button> -->
    </div>

    <ul v-else class="story-list">
      <li v-for="story in stories" :key="story.title" class="story-item">
        <div class="story-info">
          <div class="story-cover">
            <img v-if="story.coverUrl" :src="story.coverUrl" alt="封面" class="cover-image" @error="onCoverError(story)">
            <div v-else class="default-icon">
              <!-- Replace <i> with component -->
              <!-- <i class="fas fa-book"></i> -->
               <font-awesome-icon :icon="['fas', 'book']" />
            </div>
          </div>
          <span class="story-title">{{ story.title }}</span>
          <span v-if="story.loadingCover" class="loading-cover">
             <!-- Add loading spinner icon for cover -->
             <font-awesome-icon :icon="['fas', 'spinner']" spin /> 加载封面...
            </span>
        </div>
        <div class="story-actions">
          <!-- Replace text buttons with icon buttons -->
          <button @click="viewStoryContent(story)" class="action-button icon-button" title="查看内容">
             <font-awesome-icon :icon="['fas', 'eye']" />
          </button>
          <button @click="viewStoryResources(story)" class="action-button icon-button" title="查看资源">
             <font-awesome-icon :icon="['fas', 'boxes-stacked']" />
          </button>
          <button @click="renameStory(story)" class="action-button icon-button" title="重命名">
             <font-awesome-icon :icon="['fas', 'pen']" />
          </button>
          <button @click="deleteStory(story)" class="action-button icon-button" title="删除">
             <font-awesome-icon :icon="['fas', 'trash-alt']" />
          </button>
        </div>
      </li>
    </ul>

    <!-- Floating window container: for loading ExportStory.vue -->
    <div
      class="floating-window-container"
      v-if="showContentModal"
      @click.self="closeContentModal"
    >
      <div class="floating-window" :class="{ 'animate-in': animateContentWindow }">
        <div class="window-header">
          <h2>查看故事内容: {{ currentStoryTitle }}</h2>
          <button class="close-button" @click="closeContentModal">
            <!-- Replace <i> and text with component -->
            <!-- <i class="fas fa-times"></i>❌ -->
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="window-content">
          <component
            v-if="contentWindowLoaded"
            :is="ExportStoryComponent"
            :storyTitle="currentStoryTitle"
            @close="closeContentModal"
            @show-message="$emit('show-message', $event)"
             />
          <div v-else class="loading-indicator">
            <!-- Replace <i> with component -->
            <!-- <i class="fas fa-spinner fa-spin"></i> -->
            <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon-fa" /> 加载中...
          </div>
        </div>
      </div>
    </div>

     <!-- Floating window container: for loading readresources.vue -->
     <div
      class="floating-window-container"
      v-if="showResourcesModal"
      @click.self="closeResourcesModal"
    >
      <div class="floating-window" :class="{ 'animate-in': animateResourcesWindow }">
        <div class="window-header">
          <h2>查看故事资源: {{ currentStoryTitle }}</h2>
          <button class="close-button" @click="closeResourcesModal">
            <!-- Replace <i> and text with component -->
            <!-- <i class="fas fa-times"></i>❌ -->
             <font-awesome-icon :icon="['fas', 'times']" />
          </button>
        </div>
        <div class="window-content">
           <component
            v-if="resourcesWindowLoaded"
            :is="ReadResourcesComponent"
            :storyTitle="currentStoryTitle"
            @close="closeResourcesModal"
            @show-message="$emit('show-message', $event)"
            />
            <div v-else class="loading-indicator">
               <!-- Replace <i> with component -->
               <!-- <i class="fas fa-spinner fa-spin"></i> -->
              <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon-fa" /> 加载中...
            </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
// Assuming these functions are in the same directory or can be imported via relative path
import {
  getAllTitles,
  readFile,
  renamePath,
  deletePath
} from './services/IndexedDBFileSystem'; // Please modify according to the actual path

// *** DO NOT MODIFY THE FUNCTIONS BELOW THIS LINE THAT INTERACT WITH THE FILE SYSTEM ***
// getAllTitles, readFile, renamePath, deletePath
// The logic and calls to these functions in the methods below are also NOT MODIFIED.
// Only icon representation and dark mode styling are changed.
// *** DO NOT MODIFY THE FUNCTIONS ABOVE THIS LINE THAT INTERACT WITH THE FILE SYSTEM ***

export default {
  name: 'ManageStory',
  data() {
    return {
      isLoading: true,
      stories: [], // Stores the list of stories, each element is { title: string, coverUrl: string | null, loadingCover: boolean }

      // View content floating window state (UNCHANGED)
      showContentModal: false,
      contentWindowLoaded: false,
      animateContentWindow: false,
      ExportStoryComponent: null,
      currentStoryTitle: '', // Current story title being operated on

      // View resources floating window state (UNCHANGED)
      showResourcesModal: false,
      resourcesWindowLoaded: false,
      animateResourcesWindow: false,
      ReadResourcesComponent: null,

      // Stores Object URLs to release memory before destroying
      objectUrls: {} // UNCHANGED
    };
  },
  async mounted() {
    // Load story list after component is mounted
    this.fetchStories(); // UNCHANGED logic
  },
   beforeDestroy() {
    // Release all Object URLs before component is destroyed
    this.releaseObjectUrls(); // UNCHANGED logic
  },
  methods: {
    async fetchStories() {
      this.isLoading = true; // UNCHANGED
      this.stories = []; // Clear existing list - UNCHANGED
      this.releaseObjectUrls(); // Clean up old Object URLs - UNCHANGED

      try {
        const titles = await getAllTitles(); // Call UNCHANGED function
        // Remove 'test' entry if it exists - UNCHANGED
        let indexToRemove = titles.indexOf('test');
          if (indexToRemove !== -1) {
            titles.splice(indexToRemove, 1);
          }
        console.log('Fetched story titles:', titles);

        // Create a story object for each title and try to load the cover - UNCHANGED logic structure
        this.stories = await Promise.all(titles.map(async (title) => {
           const story = {
             title: title,
             coverUrl: null,
             loadingCover: true // Add loading cover state - UNCHANGED
           };
           try {
             // Try to read cover image /data/{title}/images/title.png
             // Assume readFile returns Blob or ArrayBuffer - UNCHANGED
             const fileData = await readFile(`/data/${title}/images/title.png`); // Call UNCHANGED function
             if (fileData instanceof Blob) {
               // Use URL.createObjectURL to create a temporary Blob URL - UNCHANGED
               const url = URL.createObjectURL(fileData);
               story.coverUrl = url; // Set cover URL - UNCHANGED
               this.objectUrls[title] = url; // Store URL for release - UNCHANGED
               console.log(`Loaded cover for ${title}`);
             } else {
                console.warn(`Cover for ${title} is not a Blob or ArrayBuffer, or file not found.`);
                 // If readFile doesn't return expected type, or throws error, set to null
                story.coverUrl = null; // UNCHANGED
             }
           } catch (error) {
             // If file does not exist or other read error, use default icon
             console.warn(`Failed to load cover for "${title}":`, error);
             story.coverUrl = null; // Set to null on error - UNCHANGED
           } finally {
              story.loadingCover = false; // Cover loading attempt ends - UNCHANGED
           }
           return story; // Return story object - UNCHANGED
        }));

         // Sort story list by title (Optional) - UNCHANGED
         this.stories.sort((a, b) => a.title.localeCompare(b.title));

      } catch (error) {
        console.error('加载故事列表失败:', error);
        this.showNotification('加载故事列表失败', 'error'); // Show notification - UNCHANGED
      } finally {
        this.isLoading = false; // Reset loading state - UNCHANGED
      }
    },

    // Handle cover image loading error - UNCHANGED
    onCoverError(story) {
        console.warn(`Error loading cover image for "${story.title}", falling back to default icon.`);
        story.coverUrl = null; // Set coverUrl to null to display the default icon - UNCHANGED
    },


    // View story content (load ExportStory.vue) - UNCHANGED logic
    async viewStoryContent(story) {
      this.currentStoryTitle = story.title; // Set current title - UNCHANGED
      this.showContentModal = true; // Show modal - UNCHANGED
      this.contentWindowLoaded = false; // Reset loaded state immediately - UNCHANGED

      if (!this.ExportStoryComponent) { // Check if component is already loaded - UNCHANGED
        try {
          // Dynamic import ExportStory.vue - UNCHANGED
          const module = await import('./ExportStory.vue'); // Please check actual path
          this.ExportStoryComponent = module.default; // Assign component - UNCHANGED
        } catch (error) {
          console.error('加载 ExportStory.vue 组件失败:', error);
          this.showNotification('加载故事内容查看器失败', 'error'); // Show error - UNCHANGED
          this.closeContentModal(); // Close modal on error - UNCHANGED
          return;
        }
      }

      // Use nextTick to ensure modal structure is rendered - UNCHANGED
      this.$nextTick(() => {
        this.animateContentWindow = true; // Start animation - UNCHANGED
         // Delay showing component content - UNCHANGED
        setTimeout(() => {
             this.contentWindowLoaded = true; // Set loaded state - UNCHANGED
        }, 300); // 300ms should match CSS transition time - UNCHANGED
      });
    },

    // Close view content floating window - UNCHANGED
    closeContentModal() {
      this.animateContentWindow = false; // Start reverse animation - UNCHANGED
      setTimeout(() => {
        this.showContentModal = false; // Hide modal after animation - UNCHANGED
        this.contentWindowLoaded = false; // Reset loaded state - UNCHANGED
        this.currentStoryTitle = ''; // Reset current story title - UNCHANGED
      }, 300); // 300ms should match CSS transition time - UNCHANGED
    },

    // View story resources (load readresources.vue) - UNCHANGED logic
    async viewStoryResources(story) {
      this.currentStoryTitle = story.title; // Set current title - UNCHANGED
      this.showResourcesModal = true; // Show modal - UNCHANGED
      this.resourcesWindowLoaded = false; // Reset loaded state immediately - UNCHANGED

      if (!this.ReadResourcesComponent) { // Check if component is already loaded - UNCHANGED
        try {
          // Dynamic import readresources.vue - UNCHANGED
          const module = await import('./Manage_readresources.vue'); // Please check actual path
          this.ReadResourcesComponent = module.default; // Assign component - UNCHANGED
        } catch (error) {
          console.error('加载 readresources.vue 组件失败:', error);
          this.showNotification('加载故事资源查看器失败', 'error'); // Show error - UNCHANGED
          this.closeResourcesModal(); // Close modal on error - UNCHANGED
          return;
        }
      }

       // Use nextTick to ensure modal structure is rendered - UNCHANGED
       this.$nextTick(() => {
        this.animateResourcesWindow = true; // Start animation - UNCHANGED
        // Delay showing component content - UNCHANGED
        setTimeout(() => {
            this.resourcesWindowLoaded = true; // Set loaded state - UNCHANGED
        }, 300); // 300ms should match CSS transition time - UNCHANGED
      });
    },

    // Close view resources floating window - UNCHANGED
    closeResourcesModal() {
       this.animateResourcesWindow = false; // Start reverse animation - UNCHANGED
       setTimeout(() => {
        this.showResourcesModal = false; // Hide modal after animation - UNCHANGED
        this.resourcesWindowLoaded = false; // Reset loaded state - UNCHANGED
        this.currentStoryTitle = ''; // Reset current story title - UNCHANGED
      }, 300); // 300ms should match CSS transition time - UNCHANGED
    },


    // Rename story - UNCHANGED logic
    async renameStory(story) {
      const oldTitle = story.title; // UNCHANGED
      const newTitle = prompt(`请输入 "${oldTitle}" 的新名称:`, oldTitle); // UNCHANGED

      // Check if a new title was provided and is different - UNCHANGED
      if (newTitle && newTitle.trim() !== '' && newTitle !== oldTitle) {
         // Simple validation for new name - UNCHANGED
        if (newTitle.includes('/') || newTitle.includes('\\') || newTitle.includes('.')) {
             this.showNotification('故事名称不能包含 / \\ .', 'warning'); // UNCHANGED
             return;
         }
        // Check if the new name already exists - UNCHANGED
        if (this.stories.some(s => s.title === newTitle.trim())) {
            this.showNotification(`故事 "${newTitle.trim()}" 已存在`, 'warning'); // UNCHANGED
            return;
        }

        try {
          // Call the imported rename function - UNCHANGED
          await renamePath(`/data/${oldTitle}`, newTitle.trim()); // Use trimmed newTitle
          console.log(`故事 "${oldTitle}" 已重命名为 "${newTitle.trim()}"`); // Use trimmed newTitle in log
          this.showNotification(`故事 "${oldTitle}" 已重命名为 "${newTitle.trim()}"`, 'success'); // UNCHANGED

          // Update list - Reloading is the safest way - UNCHANGED
          this.fetchStories();

        } catch (error) {
          console.error(`重命名故事 "${oldTitle}" 失败:`, error); // UNCHANGED
          this.showNotification(`重命名故事 "${oldTitle}" 失败`, 'error'); // UNCHANGED
        }
      } else if (newTitle === oldTitle) {
          // User entered the same name, do nothing - UNCHANGED
          console.log('新名称与原名称相同，取消重命名');
      } else {
        // User cancelled or entered empty name - UNCHANGED
        console.log('重命名操作已取消');
      }
    },

    // Delete story - UNCHANGED logic
    async deleteStory(story) {
      const titleToDelete = story.title; // UNCHANGED
      const confirmed = confirm(`确定要删除故事 "${titleToDelete}" 吗？此操作不可逆！`); // UNCHANGED

      if (confirmed) { // UNCHANGED
        try {
          // Call the imported delete function - UNCHANGED
          await deletePath(`/data/${titleToDelete}`); // Assuming deletePath handles the path
          console.log(`故事 "${titleToDelete}" 已删除`); // UNCHANGED
          this.showNotification(`故事 "${titleToDelete}" 已删除`, 'success'); // UNCHANGED

          // Remove the story from the list - UNCHANGED
          this.stories = this.stories.filter(s => s.title !== titleToDelete);

          // Release the Object URL associated with this story - UNCHANGED
          if (this.objectUrls[titleToDelete]) {
             URL.revokeObjectURL(this.objectUrls[titleToDelete]);
             delete this.objectUrls[titleToDelete];
          }

        } catch (error) {
          console.error(`删除故事 "${titleToDelete}" 失败:`, error); // UNCHANGED
          this.showNotification(`删除故事 "${titleToDelete}" 失败`, 'error'); // UNCHANGED
        }
      } else {
        console.log('删除操作已取消'); // UNCHANGED
      }
    },

    // Release all Object URLs - UNCHANGED
    releaseObjectUrls() {
       for (const title in this.objectUrls) {
           // Check if the property belongs to the object itself (not prototype chain)
           if (Object.prototype.hasOwnProperty.call(this.objectUrls, title) && this.objectUrls[title]) {
               URL.revokeObjectURL(this.objectUrls[title]);
           }
       }
       this.objectUrls = {}; // Clear storage - UNCHANGED
    },

    // Show notification (assuming parent component provides show-message event) - UNCHANGED logic
    showNotification(message, type = 'info') {
       // Emit event to parent - UNCHANGED
       this.$emit('show-message', { title: type, message: message});
       console.log(`[ManageStory][${type.toUpperCase()}] ${message}`); // UNCHANGED
       // If no parent component event, you can use a global event bus or simple alert/console.log - UNCHANGED logic
    }

    // Optional: Add createNewStory method - NOT MODIFIED as per request
    /*
    createNewStory() { ... }
    */
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
  --danger-color: #dc2626;
  --danger-hover: #b91c1c;
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
    /* Danger colors might also need adjustment in dark mode */
    --danger-color: #f87171; /* Lighter red for dark mode */
    --danger-hover: #ef4444; /* Lighter red hover */
}


/* --- Base Container Styles --- */
.story-management {
  padding: 20px;
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--text-primary); /* Use variable */
  transition: color 0.3s;
}

.story-management h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--primary-color); /* Use variable */
  border-bottom: 1px solid var(--border-color); /* Use variable */
  padding-bottom: 15px;
  transition: color 0.3s, border-color 0.3s;
}


/* --- Font Awesome Icon Styling --- */
/* Base style for all Font Awesome icons in this component */
.story-management .svg-inline--fa {
    vertical-align: middle; /* Align icons nicely with text */
    /* Default size set by parent font size unless overridden */
}

/* Specific icon size/margin adjustments */
/* Loading/Empty state icons */
.loading-icon-fa, .empty-icon-fa {
    font-size: 24px; /* Adjusted size */
    margin-right: 10px; /* Space after icon */
    color: var(--primary-color); /* Color from variable */
}
/* Empty state icon color override if needed, e.g., for text-secondary */
.empty-state .empty-icon-fa {
    color: var(--text-secondary);
}

/* Story cover default icon */
.story-cover .default-icon .svg-inline--fa {
  font-size: 20px; /* Match original size */
  color: var(--primary-color); /* Color from variable */
}

/* Loading cover spinner */
.loading-cover .svg-inline--fa {
    font-size: 1em; /* Size inherited from parent */
    margin-right: 5px;
}

/* Action button icons */
.action-button.icon-button .svg-inline--fa {
    font-size: 16px; /* Size for icon buttons */
}


/* Modal icons */
.floating-window .loading-indicator .svg-inline--fa {
    font-size: 32px; /* Match original size */
    color: var(--primary-color); /* Color from variable */
}
.close-button .svg-inline--fa {
   font-size: 1em; /* Size inherited from button font-size */
   vertical-align: middle;
}


/* --- Loading and Empty States --- */
.loading-indicator, .empty-state {
  text-align: center;
  color: var(--text-secondary); /* Use variable */
  padding: 40px 0;
  transition: color 0.3s;
  display: flex; /* Use flex for alignment */
  flex-direction: column; /* Stack icon and text */
  align-items: center;
  justify-content: center;
  gap: 10px; /* Space between icon and text */
}

/* Remove i styles as they are replaced by .loading-icon-fa */
/* .loading-indicator i { ... } */


/* --- Story List --- */
.story-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.story-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--content-bg); /* Use variable */
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 15px 20px;
  box-shadow: var(--shadow); /* Use variable */
  transition: transform 0.2s, box-shadow 0.2s, background-color 0.3s, border-color 0.3s;
  border: 1px solid var(--border-color); /* Use variable */
}

.story-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
}

.story-info {
  display: flex;
  align-items: center;
  flex-grow: 1;
  margin-right: 20px;
  min-width: 0; /* Allow shrink */
}

.story-cover {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  margin-right: 15px;
  background-color: var(--sidebar-bg); /* Use variable */
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color); /* Use variable */
  transition: background-color 0.3s, border-color 0.3s;
}

.story-cover .cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Remove default-icon i styles as it's now a component */
/* .story-cover .default-icon i { ... } */


.story-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary); /* Use variable */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
  transition: color 0.3s;
}

.loading-cover {
  font-size: 12px;
  color: var(--text-secondary); /* Use variable */
  margin-left: 10px;
  transition: color 0.3s;
  display: flex; /* Use flex to align icon and text */
  align-items: center;
  gap: 5px; /* Space between icon and text */
}

.story-actions {
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* Button Styles */
.action-button {
  background: none;
  border: none; /* Default no border */
  padding: 8px; /* Added padding for touch target/spacing */
  cursor: pointer;
  font-size: 14px; /* Base font size */
  color: var(--primary-color); /* Use variable */
  transition: color 0.2s, background-color 0.2s, transform 0.2s;
  border-radius: 6px; /* Add some border radius */
  display: inline-flex; /* Use flex for alignment */
  align-items: center;
  justify-content: center;
  gap: 5px; /* Gap for icon and text */
}

.action-button:hover {
  background-color: var(--hover-bg); /* Use variable */
  color: var(--primary-hover); /* Use variable */
  transform: translateY(-1px); /* Subtle lift */
}

/* Icon buttons (style applied to action-button directly now) */
.action-button.icon-button {
    padding: 8px; /* Uniform padding for icon-only buttons */
    /* font-size controlled by .svg-inline--fa */
}
.action-button.icon-button .svg-inline--fa {
    font-size: 16px; /* Match original desired icon size */
}


/* Remove text-action specific styles */
/* .action-button.text-action { ... } */
/* .action-button.text-action:hover { ... } */





/* --- Floating Window Styles --- */
.floating-window-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(15, 23, 42, 0.6); /* Keep dark semi-transparent background */
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.floating-window {
  background-color: var(--content-bg); /* Use variable */
  border-radius: 16px;
  width: 90%;
  max-width: 1000px;
  height: 80vh;
  box-shadow: var(--shadow); /* Use variable */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.3s ease, transform 0.3s ease, background-color 0.3s;
}

.floating-window.animate-in {
  opacity: 1;
  transform: scale(1);
}

.window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color); /* Use variable */
  flex-shrink: 0;
  transition: border-color 0.3s;
}

.window-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary); /* Use variable */
  border-bottom: none;
  padding-bottom: 0;
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
  /* background-color set by hover-bg */
}

.close-button:hover {
  background-color: rgba(var(--error-color-rgb, 239, 68, 68), 0.1); /* Use variable/rgba */
  color: var(--error-color); /* Use variable */
  transform: rotate(90deg);
}

/* Remove the span element that contained a Unicode X character */
.close-button span { display: none; }


.window-content {
  flex: 1;
  overflow: auto; 
  position: relative;
  padding: 5px;
}

.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  color: var(--text-secondary); /* Use variable */
}

/* Remove i styles as it's now a component */
/* .loading-indicator i { ... } */


/* Dark mode specific overrides */
/* Relying on variables defined in main.css body.dark-theme */
/* If specific scoped overrides are needed, add them here */

/* Responsive design */
@media (max-width: 768px) {
  .story-management {
      padding: 15px; /* Adjusted padding */
  }
  .story-management h2 {
      font-size: 20px; /* Adjusted font size */
      margin-bottom: 15px; /* Adjusted margin */
      padding-bottom: 10px; /* Adjusted padding */
  }
  .loading-indicator, .empty-state {
      padding: 30px 0; /* Adjusted padding */
      gap: 8px; /* Adjusted gap */
  }
   .loading-icon-fa, .empty-icon-fa {
       font-size: 20px; /* Adjusted size */
       margin-right: 8px; /* Adjusted margin */
   }
   .empty-state p {
        font-size: 14px; /* Adjusted font size */
   }

  .story-item {
    flex-direction: column;
    align-items: flex-start;
    padding: 15px;
    margin-bottom: 10px; /* Adjusted margin */
  }

  .story-info {
    width: 100%;
    margin-right: 0;
    margin-bottom: 15px;
    flex-direction: row; /* Keep info inline */
    flex-wrap: wrap; /* Allow wrapping if title is long */
    align-items: center; /* Re-align items */
    gap: 10px; /* Gap between cover, title, loading */
  }

  .story-cover {
    width: 30px;
    height: 30px;
    margin-right: 0; /* Remove margin-right if gap is used */
    font-size: 16px;
  }

  .story-title {
    font-size: 15px;
    max-width: none;
    white-space: normal;
    word-break: break-word;
    flex-grow: 1; /* Allow title to take space */
     overflow: visible; /* Prevent ellipsis if wrapping */
     text-overflow: unset;
     margin-right: 0;
  }

  .loading-cover {
    font-size: 12px;
    margin-left: 0; /* Remove margin if gap is used */
  }

  .story-actions {
    width: 100%;
    justify-content: flex-start; /* Align actions left */
    gap: 8px; /* Adjusted gap */
  }

  .action-button {
    font-size: 14px; /* Adjusted font size */
    padding: 6px 10px; /* Adjusted padding */
    flex-grow: 0; /* Do not force grow */
    text-align: center;
    border: 1px solid var(--border-color); /* Use variable */
    gap: 5px; /* Ensure gap for icon+text if used */
    display: inline-flex; /* Ensure inline-flex */
  }
   .action-button.icon-button {
       padding: 6px; /* Adjusted padding for icon-only */
       width: 32px; /* Fixed width for icon-only */
       height: 32px; /* Fixed height for icon-only */
   }
    .action-button.icon-button .svg-inline--fa {
        font-size: 16px; /* Adjusted size */
    }


  .floating-window {
    width: 95%;
    height: 90vh;
    border-radius: 10px;
  }

  .window-header {
    padding: 12px 18px;
  }

  .window-header h2 {
    font-size: 18px;
  }

  .close-button {
    width: 28px;
    height: 28px;
    font-size: 14px;
     /* icon size controlled by font-size */
  }

  .window-content {
    padding: 18px;
  }

    .floating-window .loading-indicator .svg-inline--fa {
       font-size: 28px; /* Adjusted size */
    }
}

@media (max-width: 480px) {
    .story-management h2 {
        font-size: 18px; /* Further adjusted */
    }
     .loading-indicator, .empty-state {
         padding: 20px 0; /* Further adjusted */
     }
      .loading-icon-fa, .empty-icon-fa {
          font-size: 18px; /* Further adjusted */
      }
     .empty-state p {
          font-size: 13px; /* Further adjusted */
     }


     .story-item {
         padding: 12px; /* Further adjusted */
     }
      .story-info {
          gap: 8px; /* Further adjusted */
          margin-bottom: 10px;
      }
      .story-cover {
          width: 28px;
          height: 28px;
          font-size: 14px;
      }
      .story-title {
          font-size: 14px; /* Further adjusted */
      }


    .story-actions {
        gap: 6px; /* Further adjusted */
        justify-content: center; /* Center actions */
    }
     .action-button {
         font-size: 13px; /* Further adjusted */
         padding: 5px 8px; /* Further adjusted */
         gap: 4px;
     }
      .action-button.icon-button {
          padding: 5px; /* Further adjusted */
          width: 30px;
          height: 30px;
      }
       .action-button.icon-button .svg-inline--fa {
           font-size: 14px; /* Further adjusted */
       }


    .floating-window {
        border-radius: 8px; /* Further adjusted */
    }
     .window-header {
         padding: 10px 15px; /* Further adjusted */
     }
      .window-header h2 {
          font-size: 16px; /* Further adjusted */
      }
      .close-button {
          width: 26px;
          height: 26px;
          font-size: 13px; /* Further adjusted icon size */
      }
     .window-content {
         padding: 15px; /* Further adjusted */
     }
      .floating-window .loading-indicator .svg-inline--fa {
          font-size: 24px; /* Further adjusted */
      }
}
</style>