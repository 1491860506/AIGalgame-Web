<template>
  <!-- Individual tree node -->
  <li :class="['story-node-item', { 'has-story': node.hasStory, 'is-root': depth === 0, 'is-end-game': isEndGameNode }]" ref="storyNodeItem">
    <div class="node-content">
      <!-- Node Label -->
      <span class="node-label" @click.stop="toggleChildren">
         <font-awesome-icon v-if="node.children && node.children.length > 0"
                            :icon="['fas', showChildren ? 'chevron-down' : 'chevron-right']"
                            class="node-toggle-icon" />
        <span :class="['node-text-wrapper', { 'story-title': node.hasStory, 'no-story': !node.hasStory }]" :title="node.label">
            {{ node.label }}
             <font-awesome-icon v-if="node.hasStory && !isEndGameNode" :icon="['fas', 'book']" class="story-icon" title="包含故事内容" />
             <!-- Optional: Different icon or additional text for end game nodes -->
             <span v-if="isEndGameNode" class="end-game-indicator" title="这是一个结局节点">🏁</span>
        </span>
      </span>

      <!-- Node Actions -->
      <div class="node-actions">
         <button v-if="node.hasStory" @click.stop="viewNode" class="btn btn-text btn-sm" title="预览故事内容">
            <font-awesome-icon :icon="['fas', 'eye']" />
         </button>
         <button v-if="node.hasStory" @click.stop="exportNode" class="btn btn-text btn-sm" title="导出故事内容">
            <font-awesome-icon :icon="['fas', 'download']" />
         </button>
      </div>
    </div>

    <!-- Children Nodes (Recursive) -->
    <ul v-if="node.children && node.children.length > 0 && showChildren" class="node-children">
      <story-node
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        @view="$emit('view', $event)"
        @export="$emit('export', $event)"
        @show-message="$emit('show-message', $event)"
        @node-expanded="$emit('node-expanded', $event)"
      />
    </ul>
  </li>
</template>

<script>
export default {
  name: 'StoryNode',
  props: {
    node: {
      type: Object,
      required: true,
      validator: (value) => value && value.id !== undefined && value.label !== undefined && Array.isArray(value.children) && value.hasStory !== undefined,
    },
    depth: {
      type: Number,
      default: 0,
    },
  },
  emits: ['view', 'export', 'show-message', 'node-expanded'],
  data() {
    return {
      showChildren: false,
    };
  },
  computed: {
    isEndGameNode() {
      // Keywords to identify an "end game" node. Case-insensitive.
      const endGameKeywords = ['结束游戏', '游戏结束', '结局', 'ending', 'game over'];
      if (this.node && this.node.label) {
        const labelLower = this.node.label.toLowerCase();
        return endGameKeywords.some(keyword => labelLower.includes(keyword.toLowerCase()));
      }
      return false;
    }
  },
  watch: {
    node: {
      handler() {},
      deep: true,
    },
     depth() {
         if (this.depth === 0 && !this.showChildren) {
             // this.showChildren = true; // auto-expand is now in mounted
         }
     }
  },
   mounted() {
     if (this.depth === 0) {
         this.showChildren = true;
     }
   },
  methods: {
    toggleChildren() {
       if (this.node.children && this.node.children.length > 0) {
            const expanding = !this.showChildren;
            this.showChildren = !this.showChildren;
            if (expanding) {
              this.$nextTick(() => {
                this.$emit('node-expanded', this.$refs.storyNodeItem); // Pass the li element itself
              });
            }
        }
    },
    viewNode() {
      this.$emit('view', this.node);
    },
    exportNode() {
      this.$emit('export', this.node);
    },
  },
};
</script>

<style scoped>
/* Individual Node Item */
.story-node-item {
  list-style: none;
  margin: 0;
  padding: 0;
  padding-left: 20px; /* Base indentation */
  position: relative;
}

/* Styling for End Game Nodes */
.story-node-item.is-end-game > .node-content {
  background-color: var(--surface-attention-subtle, rgba(250, 173, 20, 0.08)); /* Light yellow/orange, adjust var if needed */
  border-left: 3px solid var(--border-attention, #fabd14); /* A more prominent color for the border */
  padding-left: 5px; /* Adjust padding slightly due to border */
  margin-left: -8px; /* Compensate for padding-left and border */
}

.story-node-item.is-end-game .node-text-wrapper {
  color: var(--text-attention, #d48806); /* Darker, more prominent text color for endings */
  font-weight: 600; /* Bolder text for endings */
}

.end-game-indicator {
  margin-left: 5px;
  font-weight: normal; /* Reset font-weight if parent is bold */
  color: var(--text-primary); /* Or a specific color for the indicator */
}


.node-content {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-radius: var(--border-radius-sm);
  transition: background-color 0.2s ease;
  user-select: none;
}
.node-content:hover:not(.is-end-game > *) { /* Don't override end-game bg on hover */
  background-color: var(--hover-overlay);
}
.story-node-item.is-end-game > .node-content:hover {
  background-color: var(--surface-attention-subtle-hover, rgba(250, 173, 20, 0.15)); /* Slightly darker hover for end game nodes */
}


.node-label {
  flex-grow: 1;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
}

.node-toggle-icon {
    color: var(--text-secondary);
    transition: transform 0.2s ease;
    width: 1em;
    flex-shrink: 0;
    margin-top: 0.15em;
}

.node-text-wrapper {
  display: inline-block;
  width: 210px; /* Target: 15 CJK chars. Adjust based on font. */
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.45;
  text-align: left;
}


.story-title { /* Applied to .node-text-wrapper if node.hasStory */
    font-weight: 500;
    color: var(--primary-color);
}
.no-story { /* Applied to .node-text-wrapper if !node.hasStory */
    font-style: italic;
    color: var(--text-tertiary);
}

.story-icon {
    font-size: 0.9em;
    color: var(--primary-dark);
    margin-left: 5px;
}


.node-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
  margin-left: auto;
}

.node-content:hover .node-actions {
  opacity: 1;
}

.node-children {
  list-style: none;
  padding: 0;
  margin: 0;
}

@media (max-width: 768px) {
   .story-node-item {
      padding-left: 15px;
   }
   .node-label {
       font-size: 0.9rem;
   }
    .node-actions {
        opacity: 1;
    }
    .node-text-wrapper {
        width: 150px; /* Adjust for smaller screens if needed */
    }
    .story-node-item.is-end-game > .node-content {
        margin-left: -6px; /* Adjust for smaller padding-left */
        padding-left: 3px;
    }
}
</style>