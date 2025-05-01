<template>
  <div class="doc-container">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="logo">
        <h2>Documentation</h2>
      </div>
      
      <!-- Search Box -->
      <div class="search-container">
        <input 
          type="text" 
          class="search-input" 
          v-model="searchQuery" 
          placeholder="搜索文档..." 
          @input="handleSearch"
        />
        <div class="search-results" v-if="searchResults.length > 0 && searchQuery">
          <div 
            v-for="(result, index) in searchResults" 
            :key="index" 
            class="search-result-item"
            @click="selectMenuItem(result.menuItem)"
          >
            <div class="result-title">{{ result.menuItem.title }}</div>
            <div class="result-context" v-html="result.context"></div>
          </div>
        </div>
      </div>
      
      <!-- Menu Items -->
      <div class="menu">
        <div 
          v-for="(item, index) in menuItems" 
          :key="index" 
          class="menu-item"
          :class="{ 'active': activeMenuItem === item }"
          @click="selectMenuItem(item)"
        >
          {{ item.title }}
        </div>
      </div>
    </div>
    
    <!-- Main Content Area -->
    <div class="content">
      <component 
        :is="currentComponent" 
        ref="currentComponentRef"
        @content-loaded="registerComponentContent"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, defineAsyncComponent, onMounted } from 'vue';

// Lazy load components
const Overview = defineAsyncComponent(() => import('./Overview.vue'));
const LLMConfig = defineAsyncComponent(() => import('./LLMConfig.vue'));
const VoiceSynthConfig = defineAsyncComponent(() => import('./VoiceSynthConfig.vue'));

export default {
  name: 'App',
  setup() {
    // Menu items with their corresponding components and searchable content
    const menuItems = ref([
      { 
        title: '概述', 
        component: Overview, 
        content: '',
        id: 'overview'
      },
      { 
        title: 'LLM配置', 
        component: LLMConfig, 
        content: '',
        id: 'llm-config'
      },
      { 
        title: '语音合成配置', 
        component: VoiceSynthConfig, 
        content: '',
        id: 'voice-synth-config'
      },
    ]);
    
    // Active menu item
    const activeMenuItem = ref(menuItems.value[0]);
    
    // Search functionality
    const searchQuery = ref('');
    const searchResults = ref([]);
    const currentComponentRef = ref(null);
    
    // Current component based on active menu item
    const currentComponent = computed(() => activeMenuItem.value.component);
    
    // Select menu item function
    const selectMenuItem = (item) => {
      activeMenuItem.value = item;
      searchQuery.value = '';
      searchResults.value = [];
    };

    // Register component content for search indexing
    const registerComponentContent = (id, content) => {
      const item = menuItems.value.find(item => item.id === id);
      if (item) {
        item.content = content;
      }
    };
    
    // Extract text content from HTML
    const extractTextFromHTML = (html) => {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.textContent || div.innerText || '';
    };

    // Highlight search term in results
    const highlightSearchTerm = (text, term) => {
      if (!term) return text;
      const regex = new RegExp(`(${term})`, 'gi');
      return text.replace(regex, '<span class="highlight">$1</span>');
    };

    // Find context around the search term
    const getContextAroundTerm = (text, term, contextLength = 50) => {
      const lowerText = text.toLowerCase();
      const lowerTerm = term.toLowerCase();
      const index = lowerText.indexOf(lowerTerm);
      
      if (index === -1) return '';
      
      const start = Math.max(0, index - contextLength);
      const end = Math.min(text.length, index + term.length + contextLength);
      let context = text.substring(start, end);
      
      // Add ellipsis if needed
      if (start > 0) context = '...' + context;
      if (end < text.length) context += '...';
      
      return highlightSearchTerm(context, term);
    };
    
    // Search function
    const handleSearch = () => {
      if (!searchQuery.value.trim()) {
        searchResults.value = [];
        return;
      }
      
      const query = searchQuery.value.toLowerCase();
      const results = [];
      
      menuItems.value.forEach(item => {
        const titleMatch = item.title.toLowerCase().includes(query);
        const contentText = item.content;
        const contentMatch = contentText.toLowerCase().includes(query);
        
        if (titleMatch || contentMatch) {
          let context = '';
          
          if (contentMatch) {
            context = getContextAroundTerm(contentText, query);
          } else {
            context = `在标题中找到匹配项`;
          }
          
          results.push({
            menuItem: item,
            context: context
          });
        }
      });
      
      searchResults.value = results;
    };
    
    // Preload all component content for search indexing
    const preloadAllContent = async () => {
      for (const item of menuItems.value) {
        if (!item.content) {
          try {
            // Dynamically import the component and extract content
            const component = await import(`./components/${item.component.name}.vue`);
            if (component.default && component.default.searchContent) {
              item.content = component.default.searchContent;
            }
          } catch (error) {
            console.error(`Failed to preload content for ${item.title}:`, error);
          }
        }
      }
    };
    
    // Add new menu item function
    const addMenuItem = (title, component, content = '', id = '') => {
      const itemId = id || title.toLowerCase().replace(/\s+/g, '-');
      menuItems.value.push({ 
        title, 
        component, 
        content,
        id: itemId
      });
    };
    
    onMounted(() => {
      preloadAllContent();
    });
    
    return {
      menuItems,
      activeMenuItem,
      currentComponent,
      currentComponentRef,
      selectMenuItem,
      searchQuery,
      searchResults,
      handleSearch,
      addMenuItem,
      registerComponentContent
    };
  }
}
</script>

<style scoped>
.doc-container {
  display: flex;
  height: 100vh;
  font-family: Arial, sans-serif;
}

.sidebar {
  width: 250px;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.logo {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.search-container {
  padding: 15px;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-results {
  position: absolute;
  width: 90%;
  max-height: 300px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  z-index: 10;
  margin-top: 5px;
  left: 15px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
}

.search-result-item {
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.search-result-item:hover {
  background-color: #f0f0f0;
}

.result-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.result-context {
  font-size: 13px;
  color: #555;
  line-height: 1.4;
}

.highlight {
  background-color: #ffffa0;
  font-weight: bold;
}

.menu {
  flex-grow: 1;
  padding: 10px 0;
}

.menu-item {
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-left: 4px solid transparent;
}

.menu-item:hover {
  background-color: #e9e9e9;
}

.menu-item.active {
  background-color: #e0e0e0;
  border-left-color: #4285f4;
  font-weight: bold;
}

.content {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #fff;
}
</style>