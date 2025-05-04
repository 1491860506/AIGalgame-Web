<template>
  <div class="character-background-settings">
    <div class="tabs-container">
      <!-- Use button elements for better accessibility and styling -->
      <div class="tabs">
        <button
          v-for="(tab, index) in tabs"
          :key="index"
          :class="['tab-button', { active: activeTabIndex === index }]"
          @click="activeTabIndex = index"
        >
           <!-- Add icons for visual appeal -->
          <font-awesome-icon :icon="getTabIcon(index)" class="tab-icon" />
          <span class="tab-name">{{ tab.name }}</span>
        </button>
      </div>

      <div class="tab-content card">
        <!-- Keep v-if for conditional rendering -->
        <div v-if="activeTabIndex === 0">
          <CharacterTabContent @show-message="showMessageBubble" />
        </div>
        <div v-if="activeTabIndex === 1">
          <BackgroundTabContent @show-message="showMessageBubble" />
        </div>
        <div v-if="activeTabIndex === 2">
          <JudgingTabContent
            @open-quality-checker="openJudgingTestWindow"
            @show-message="showMessageBubble"
          />
        </div>
        <div v-if="activeTabIndex === 3">
          <ProcessingTabContent @show-message="showMessageBubble" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// --- Script remains unchanged ---
import { useToast } from 'vue-toastification';
const toast = useToast();
import CharacterTabContent from './AiDrawingConfig_CharacterTabContent.vue'
import BackgroundTabContent from './AiDrawingConfig_BackgroundTabContent.vue'
import ProcessingTabContent from './AiDrawingConfig_ProcessingTabContent.vue'
import JudgingTabContent from './AiDrawingConfig_JudgingTabContent.vue'
// Assume icons are registered globally or import them here
// Example icons: user, image, check-double, magic
// import { faUser, faImage, faCheckDouble, faMagic } from '@fortawesome/free-solid-svg-icons';
// library.add(faUser, faImage, faCheckDouble, faMagic);

export default {
  name: 'CharacterBackgroundSettings',
  components: {
    CharacterTabContent,
    BackgroundTabContent,
    ProcessingTabContent,
    JudgingTabContent
    // FontAwesomeIcon // If needed
  },
  data() {
    return {
      activeTabIndex: 0,
      tabs: [
        { name: "人物绘画", icon: ['fas', 'user'] }, // Add icon data
        { name: "背景绘画", icon: ['fas', 'image'] },
        { name: "质量判断", icon: ['fas', 'check-double'] },
        { name: "后处理", icon: ['fas', 'magic'] }
      ]
    }
  },
  methods: {
    getTabIcon(index) {
        // Helper to get icon array for font-awesome component
        return this.tabs[index]?.icon || ['fas', 'question-circle']; // Default icon
    },
    close() {
      this.$emit('close');
    },
    openJudgingTestWindow() {
      // This component is likely inside a modal, emitting 'close' might be better
      // Or emit a specific event for the parent to handle window opening
      console.warn("Opening quality checker window from here might not be ideal if inside modal.");
      // Re-emit or handle differently if needed
       this.$emit('open-quality-checker');
    },
    showMessageBubble(arg) {
      // Use global toastification via $emit in child components is preferred
      // This method is kept if children directly call it via prop/ref (less ideal)
      if (arg.title === 'success'){
        toast.success(arg.message);
      } else if (arg.title === 'error'){
        toast.error(arg.message);
      } else {
        toast.info(arg.message); // Use info for warnings or general messages
      }
    }
  }
}
</script>

<style scoped>
.character-background-settings {
  /* Container takes full width/height available in the modal body */
  width: 100%;
}

.tabs-container {
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: -1px; /* Overlap border with card's top border */
  flex-wrap: nowrap; /* Prevent wrapping */
  overflow-x: auto; /* Allow horizontal scroll on small screens */
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
.tabs::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}


.tab-button {
  padding: 12px 18px;
  cursor: pointer;
  border: none;
  background-color: transparent;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
  transition: all var(--transition-speed);
  border-bottom: 3px solid transparent;
  margin-bottom: -1px; /* Align border with container's border */
  display: inline-flex; /* Use inline-flex */
  align-items: center;
  gap: 8px;
  white-space: nowrap; /* Prevent wrapping within button */
}

.tab-button:hover {
  color: var(--text-primary);
  background-color: var(--hover-overlay);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background-color: var(--surface-color); /* Match card background */
   /* Add slight top radius to blend with card */
  border-top-left-radius: var(--border-radius-md);
  border-top-right-radius: var(--border-radius-md);
}

.tab-icon {
  font-size: 1em; /* Adjust icon size relative to text */
}

.tab-content {
  /* uses .card style from parent modal */
  padding: 20px;
  border-top-left-radius: 0; /* Remove top-left radius if first tab isn't active */
  /* Add min-height if needed */
  /* min-height: 400px; */
}

/* Adjust radius based on active tab */
.tabs-container .tab-button:first-child.active ~ .tab-content {
   border-top-left-radius: 0;
}
/* If other tabs can be active first, similar rules might be needed */

</style>
