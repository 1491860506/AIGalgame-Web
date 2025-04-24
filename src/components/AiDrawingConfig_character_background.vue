<template>
  <div class="character-background-settings">
    <div class="tabs-container">
      <div class="tabs">
        <div 
          v-for="(tab, index) in tabs" 
          :key="index" 
          :class="['tab', { active: activeTabIndex === index }]"
          @click="activeTabIndex = index"
        >
          <span class="tab-name">{{ tab.name }}</span>
        </div>
      </div>
      
      <div class="tab-content">
        <!-- 人物绘画配置区 -->
        <div v-if="activeTabIndex === 0" class="character-tab">
          <CharacterTabContent 
            @show-message="showMessageBubble"
          />
        </div>
        
        <!-- 背景绘画配置区 -->
        <div v-if="activeTabIndex === 1" class="background-tab">
          <BackgroundTabContent 
            @show-message="showMessageBubble"
          />
        </div>
        
        <!-- 判断生成质量 -->
        <div v-if="activeTabIndex === 2" class="judging-tab">
          <JudgingTabContent 
            @open-quality-checker="openJudgingTestWindow"
            @show-message="showMessageBubble"
          />
        </div>
        
        <!-- 后处理 -->
        <div v-if="activeTabIndex === 3" class="processing-tab">
          <ProcessingTabContent 
            @show-message="showMessageBubble"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useToast } from 'vue-toastification';

const toast = useToast(); // 获取全局 toast 实例

import CharacterTabContent from './AiDrawingConfig_CharacterTabContent.vue'
import BackgroundTabContent from './AiDrawingConfig_BackgroundTabContent.vue'
import ProcessingTabContent from './AiDrawingConfig_ProcessingTabContent.vue'
import JudgingTabContent from './AiDrawingConfig_JudgingTabContent.vue'

export default {
  name: 'CharacterBackgroundSettings',
  components: {
    CharacterTabContent,
    BackgroundTabContent,
    ProcessingTabContent,
    JudgingTabContent
  },
  data() {
    return {
      activeTabIndex: 0, // Default to judging tab for testing
      tabs: [
        { name: "人物绘画配置区" },
        { name: "背景绘画配置区" },
        { name: "判断生成质量" },
        { name: "后处理" }
      ]
    }
  },
  methods: {
    close() {
      this.$emit('close');
    },
    
    // 打开测试窗口
    openJudgingTestWindow() {
      this.$emit('open-quality-checker');
    },
    
    // 显示消息气泡
    showMessageBubble(arg) {
      if (arg.title === 'success'){
        toast.success(arg.message);
      } else if (arg.title === 'error'){
        toast.error(arg.message);
      } else {
        toast.warning(arg.message);
      }
    }
  }
}
</script>

<style scoped>
.character-background-settings {
  width: 100%;
  height: 100%;
  background-color: var(--content-bg);
  border-radius: 12px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  transition: all var(--transition-speed);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color var(--transition-speed);
}

.close-button:hover {
  color: var(--primary-color);
}

.tabs-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--sidebar-bg);
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.tab {
  padding: 14px 20px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-speed);
  position: relative;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-name {
  font-weight: 500;
  font-size: 0.95rem;
}

.tab:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
}

.tab.active {
  border-bottom: 2px solid var(--primary-color);
  font-weight: 600;
  color: var(--primary-color);
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 2px;
  background-color: var(--primary-color);
  border-radius: 2px;
}

.tab-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
  background-color: var(--content-bg);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

/* Media queries for responsiveness */
@media (max-width: 768px) {
  .tabs {
    overflow-x: auto;
    white-space: nowrap;
  }
  
  .tab {
    padding: 12px 16px;
  }
  
  .tab-name {
    font-size: 0.85rem;
  }
}
</style>