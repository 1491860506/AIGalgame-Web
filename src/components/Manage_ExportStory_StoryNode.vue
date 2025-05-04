<template>
  <!-- Individual tree node -->
  <li :class="['story-node-item', { 'has-story': node.hasStory, 'is-root': depth === 0 }]">
    <div class="node-content">
      <!-- Node Label -->
      <span class="node-label" @click.stop="toggleChildren">
         <font-awesome-icon v-if="node.children && node.children.length > 0"
                            :icon="['fas', showChildren ? 'chevron-down' : 'chevron-right']"
                            class="node-toggle-icon" />
        <span :class="{ 'story-title': node.hasStory, 'no-story': !node.hasStory }">
            {{ node.label }}
             <font-awesome-icon v-if="node.hasStory" :icon="['fas', 'book']" class="story-icon" title="包含故事内容" />
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
      />
    </ul>
  </li>
</template>

<script>
// Import Font Awesome icons if not globally registered
// import { faChevronRight, faChevronDown, faBook, faEye, faDownload } from '@fortawesome/free-solid-svg-icons';
// import { library } from '@fortawesome/fontawesome-svg-core';
// library.add(faChevronRight, faChevronDown, faBook, faEye, faDownload);

export default {
  name: 'StoryNode', // Recursive component name
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
  // Declare emitted events
  emits: ['view', 'export', 'show-message'],
  data() {
    return {
      showChildren: false,
    };
  },
   // Optionally watch depth or node changes if needed, but not strictly necessary for basic tree display
  watch: {
    node: {
      handler() {
        // If the node object changes, maybe reset showChildren?
        // Not needed for simple display, but useful if expanding/collapsing state should reset.
        // this.showChildren = false;
      },
      deep: true, // Watch nested properties if needed
    },
     depth() {
         // Maybe automatically expand the root node?
         if (this.depth === 0) {
             this.showChildren = true;
         }
     }
  },
   mounted() {
     // Automatically expand the root node on mount
     if (this.depth === 0) {
         this.showChildren = true;
     }
   },
  methods: {
    toggleChildren() {
       if (this.node.children && this.node.children.length > 0) {
            this.showChildren = !this.showChildren;
        }
    },
    viewNode() {
      // Emit 'view' event with the current node data
      this.$emit('view', this.node);
    },
    exportNode() {
      // Emit 'export' event with the current node data
      this.$emit('export', this.node);
    },
    // If this node component ever needed to show a message itself,
    // it would use this method to emit upwards.
    // For now, notifications are handled by the parent (ExportStory).
    // handleShowMessage(payload) {
    //    this.$emit('show-message', payload);
    // }
  },
};
</script>

<style scoped>
/* Individual Node Item */
.story-node-item {
  list-style: none; /* Remove default list style */
  margin: 0;
  padding: 0;
  /* Add indentation based on depth */
  padding-left: 20px; /* Base indentation */
  position: relative;
}

/* Connectors (Optional, complex CSS) */
/* Could add lines connecting nodes using ::before/::after pseudos */
/* .story-node-item:not(.is-root)::before { ... } */
/* .story-node-item:not(:last-child)::after { ... } */


.node-content {
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
  border-radius: var(--border-radius-sm);
  transition: background-color 0.2s ease;
  user-select: none; /* Prevent text selection on click */
}
.node-content:hover {
  background-color: var(--hover-overlay);
}

.node-label {
  flex-grow: 1; /* Allow label to take space */
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.node-toggle-icon {
    color: var(--text-secondary);
    transition: transform 0.2s ease;
    width: 1em; /* Ensure consistent icon width */
}
/* No rotation needed as chevron icons handle orientation */
/* .node-toggle-icon.rotate { transform: rotate(90deg); } */


.story-title {
    font-weight: 500; /* Bolder for nodes with story */
    color: var(--primary-color); /* Primary color for story nodes */
}
.no-story {
    font-style: italic;
    color: var(--text-tertiary); /* Dimmer for nodes without story */
}

.story-icon {
    font-size: 0.9em; /* Smaller icon next to label */
    color: var(--primary-dark);
}


.node-actions {
  display: flex;
  align-items: center;
  gap: 4px; /* Smaller gap between action buttons */
  flex-shrink: 0; /* Prevent actions from shrinking */
  opacity: 0; /* Hide actions by default */
  transition: opacity 0.2s ease;
}

/* Show actions on hover of the whole node content */
.node-content:hover .node-actions {
  opacity: 1;
}

.action-button {
  /* Use global btn btn-text btn-sm */
  padding: 4px 6px; /* Small padding for icon buttons */
}
.action-button .svg-inline--fa {
    font-size: 0.8em; /* Smaller icon size */
}


.node-children {
  list-style: none;
  padding: 0;
  margin: 0;
  /* Indentation is handled by the recursive .story-node-item padding-left */
}

/* Style for nodes at specific depths if needed */
/* .story-node-item[data-depth="1"] { padding-left: 30px; } */


/* Optional: Style for selected/active node */
/* .story-node-item.is-selected > .node-content { background-color: var(--selected-overlay); } */


/* Responsive adjustments (optional) */
@media (max-width: 768px) {
   .story-node-item {
      padding-left: 15px; /* Reduce indentation on smaller screens */
   }
   .node-label {
       font-size: 0.9rem;
   }
    .node-actions {
        opacity: 1; /* Always show actions on touch devices / small screens */
    }
}

</style>