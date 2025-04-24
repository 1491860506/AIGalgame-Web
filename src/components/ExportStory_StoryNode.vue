<template>
  <li class="tree-node" :class="{ 'has-children': node.children.length > 0, 'expanded': expanded }">
    <div class="node-content">
      <span 
        class="node-label" 
        :class="{ 'has-story': node.hasStory }"
        @click="toggleExpand"
      >
        {{ node.label }}
      </span>
      
      <div class="node-actions" v-if="node.hasStory">
        <button class="view-btn" @click="$emit('view', node)">
          <i class="fas fa-eye"></i>
          <span>查看</span>
        </button>
      </div>
    </div>
    
    <ul v-if="node.children.length > 0" class="nested" :class="{ 'active': expanded }">
      <story-node 
        v-for="child in node.children" 
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        @view="$emit('view', $event)"
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
      required: true
    },
    depth: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      expanded: this.depth === 0 // Root node is expanded by default
    };
  },
  methods: {
    toggleExpand() {
      if (this.node.children.length > 0) {
        this.expanded = !this.expanded;
      }
    }
  }
};
</script>

<style scoped>
.tree-node {
  margin: 5px 0;
  position: relative;
  padding-left: 15px;
}

.tree-node::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  border-left: 1px dashed var(--border-color, #e2e8f0);
  height: 100%;
}

.tree-node:last-child::before {
  height: 15px;
}

.tree-node::after {
  content: "";
  position: absolute;
  top: 15px;
  left: 0;
  width: 15px;
  height: 1px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.node-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 5px 0;
}

.node-label {
  display: inline-block;
  padding: 6px 10px;
  background-color: var(--hover-bg, #f1f5f9);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-primary, #1e293b);
  cursor: pointer;
  transition: all 0.2s;
}

.node-label:hover {
  background-color: var(--border-color, #e2e8f0);
}

.node-label.has-story {
  border-color: var(--primary-color, #4f46e5);
  background-color: rgba(79, 70, 229, 0.05);
}

.has-children > .node-content > .node-label::before {
  content: "▶";
  margin-right: 5px;
  font-size: 9px;
  color: var(--text-secondary, #64748b);
  display: inline-block;
  transition: transform 0.2s;
}

.expanded > .node-content > .node-label::before {
  transform: rotate(90deg);
}

.node-actions {
  display: flex;
  gap: 5px;
}

.view-btn, .export-btn {
  padding: 4px 8px;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  color: white;
  transition: opacity 0.2s;
}

.view-btn {
  background-color: #2ecc71;
}

.export-btn {
  background-color: #f39c12;
}

.view-btn:hover, .export-btn:hover {
  opacity: 0.9;
}

ul.nested {
  list-style-type: none;
  padding-left: 15px;
  margin-left: 0;
  display: none;
}

ul.nested.active {
  display: block;
}

/* Responsive Styles */
@media (max-width: 600px) {
  .view-btn span, .export-btn span {
    display: none;
  }
  
  .view-btn, .export-btn {
    padding: 5px;
  }
}
</style>