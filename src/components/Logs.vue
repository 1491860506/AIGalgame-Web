<template>
  <div class="logs-container card">
    <!-- Header Section -->
    <div class="logs-header">
      <h2 class="page-title">系统日志</h2>
      <div class="logs-actions">
        <button class="btn btn-primary btn-sm" @click="refreshLogs" title="刷新日志列表">
          <font-awesome-icon :icon="['fas', 'sync-alt']" />
          刷新
        </button>
        <button class="btn btn-danger btn-sm" @click="clearLogs" title="清除所有本地日志">
          <font-awesome-icon :icon="['fas', 'trash-alt']" />
          清除
        </button>
        <button class="btn btn-secondary btn-sm" @click="downloadLogs" title="将当前所有日志导出为 JSON 文件">
          <font-awesome-icon :icon="['fas', 'download']" />
          导出
        </button>
      </div>
    </div>

    <!-- Filter and Search Section -->
    <div class="logs-controls">
      <div class="filter-group">
        <label class="filter-label">筛选类型:</label>
        <div class="filter-options">
          <!-- Using custom-styled checkboxes approach -->
          <label class="custom-checkbox">
            <input type="checkbox" v-model="filters.log" />
            <span class="checkmark"></span>
            <span class="filter-type log">日志</span>
          </label>
          <label class="custom-checkbox">
            <input type="checkbox" v-model="filters.info" />
            <span class="checkmark"></span>
            <span class="filter-type info">信息</span>
          </label>
          <label class="custom-checkbox">
            <input type="checkbox" v-model="filters.warn" />
            <span class="checkmark"></span>
            <span class="filter-type warn">警告</span>
          </label>
          <label class="custom-checkbox">
            <input type="checkbox" v-model="filters.error" />
            <span class="checkmark"></span>
            <span class="filter-type error">错误</span>
          </label>
        </div>
      </div>
      <div class="search-box input-group">
        <font-awesome-icon :icon="['fas', 'search']" class="search-icon" />
        <input type="text" placeholder="搜索日志内容、时间..." v-model="searchQuery" class="input search-input" />
      </div>
    </div>

    <!-- Separator -->
    <hr class="separator">

    <!-- Logs Table Area -->
    <div class="logs-table-container">
      <table class="logs-table">
        <thead>
          <tr>
            <th class="col-type">类型</th>
            <th class="col-timestamp">时间</th>
            <th class="col-message">消息 / 错误堆栈</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading" class="state-row">
            <td colspan="3" class="loading-cell">
              <font-awesome-icon :icon="['fas', 'spinner']" spin />
              正在加载日志...
            </td>
          </tr>
          <tr v-else-if="filteredLogs.length === 0" class="state-row">
            <td colspan="3" class="no-logs-cell">
              <font-awesome-icon :icon="['fas', 'info-circle']" />
              {{ searchQuery ? '没有匹配搜索的日志记录' : '没有符合筛选条件的日志记录' }}
            </td>
          </tr>
          <!-- Log Rows -->
          <template v-for="(log, index) in filteredLogs" :key="log.id || index"> <!-- Use log.id if available -->
            <tr class="log-row" :class="['log-' + log.type, { 'clickable': log.stack }]" @click="toggleStack(index)">
              <td class="col-type">
                <span class="log-badge" :class="log.type" :title="log.type">
                  <font-awesome-icon :icon="['fas', getIconNameForType(log.type)]" />
                </span>
              </td>
              <td class="col-timestamp">
                 <span :title="log.timestamp">{{ formatTimestamp(log.timestamp) }}</span>
              </td>
              <td class="col-message">
                <div class="message-content">
                  <span>{{ log.message }}</span>
                  <font-awesome-icon
                    v-if="log.stack"
                    :icon="['fas', expandedStacks[index] ? 'chevron-up' : 'chevron-down']"
                    class="stack-toggle-icon"
                    title="查看/隐藏错误堆栈"
                  />
                </div>
              </td>
            </tr>
            <!-- Error Stack Row (conditionally rendered) -->
            <tr v-if="log.stack && expandedStacks[index]" class="stack-row" :key="`stack-${log.id || index}`">
              <td colspan="3" class="stack-cell">
                <div class="error-stack">
                  <pre class="error-stack-trace">{{ formatStackTrace(log.stack) }}</pre>
                </div>
              </td>
            </tr>
          </template>
          <!-- End Log Rows -->
        </tbody>
      </table>
    </div>

    <!-- Footer: Stats and Pagination -->
    <div class="logs-footer">
      <div class="log-stats">
        <div class="stat-item total">总计: <strong>{{ logs.length }}</strong></div>
        <div class="stat-item log">日志: <strong>{{ countLogsByType('log') }}</strong></div>
        <div class="stat-item info">信息: <strong>{{ countLogsByType('info') }}</strong></div>
        <div class="stat-item warn">警告: <strong>{{ countLogsByType('warn') }}</strong></div>
        <div class="stat-item error">错误: <strong>{{ countLogsByType('error') }}</strong></div>
      </div>
      <div class="pagination" v-if="pageCount > 1">
        <button class="btn btn-outline btn-xs pagination-btn" :disabled="currentPage === 1" @click="changePage(1)" title="第一页">
          <font-awesome-icon :icon="['fas', 'angle-double-left']" />
        </button>
        <button class="btn btn-outline btn-xs pagination-btn" :disabled="currentPage === 1" @click="changePage(currentPage - 1)" title="上一页">
          <font-awesome-icon :icon="['fas', 'angle-left']" />
        </button>
        <span class="page-info">第 {{ currentPage }} 页 / 共 {{ pageCount }} 页</span>
        <button class="btn btn-outline btn-xs pagination-btn" :disabled="currentPage === pageCount" @click="changePage(currentPage + 1)" title="下一页">
          <font-awesome-icon :icon="['fas', 'angle-right']" />
        </button>
        <button class="btn btn-outline btn-xs pagination-btn" :disabled="currentPage === pageCount" @click="changePage(pageCount)" title="最后一页">
          <font-awesome-icon :icon="['fas', 'angle-double-right']" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// --- SCRIPT REMAINS THE SAME ---
// Icons needed: sync-alt, trash-alt, download, search, spinner, info-circle,
// check-circle(badge-log), info-circle(badge-info), exclamation-triangle(badge-warn),
// exclamation-circle(badge-error), dot-circle(badge-default), chevron-up, chevron-down,
// angle-double-left, angle-left, angle-right, angle-double-right

export default {
  name: 'Logs',
  data() {
    return {
      logs: [],
      filteredLogs: [],
      searchQuery: '',
      filters: {
        log: true,
        info: true,
        warn: true,
        error: true
      },
      isLoading: true,
      currentPage: 1,
      logsPerPage: 50, // Adjust as needed
      pageCount: 1,
      expandedStacks: {} // Track expanded state by index
    };
  },
  methods: {
    async loadLogs() {
      try {
        this.isLoading = true;
        if (window.getStoredLogs) {
          const logs = await window.getStoredLogs();
          // Add a simple ID if logs don't have one, useful for keys
          this.logs = (logs || []).map((log, index) => ({ ...log, id: log.id || `log-${index}-${Date.now()}` }));
        } else {
          console.error('getStoredLogs function not found');
          this.logs = [];
        }
        this.applyFiltersAndPagination(); // Apply filters even if logs are empty
      } catch (error) {
        console.error('Error loading logs:', error);
        this.logs = [];
        this.applyFiltersAndPagination(); // Apply filters on error
      } finally {
        this.isLoading = false;
      }
    },
    async refreshLogs() {
      await this.loadLogs();
    },
    async clearLogs() {
      if (confirm('确定要清除所有日志吗？此操作不可恢复。')) {
        try {
          this.isLoading = true;
          if (window.clearStoredLogs) {
            await window.clearStoredLogs();
            this.logs = [];
            this.currentPage = 1; // Reset page
            this.applyFiltersAndPagination();
          } else {
            console.error('clearStoredLogs function not found');
          }
        } catch (error) {
          console.error('Error clearing logs:', error);
           this.$emit('show-message', { title: "error", message: '清除日志失败' }); // Use global message if available
        } finally {
          this.isLoading = false;
        }
      }
    },
    async downloadLogs() {
      try {
        let dataToExport;
        if (window.exportLogs) {
          dataToExport = await window.exportLogs();
        } else {
          dataToExport = this.logs; // Fallback to current state
        }
        if (!dataToExport || dataToExport.length === 0) {
           this.$emit('show-message', { title: "warning", message: '没有日志可以导出' });
           return;
        }

        // Create a cleaner export version (optional, removes internal ID)
        const exportData = dataToExport.map(({ id, ...rest }) => rest);

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const exportFileName = `logs_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', url);
        linkElement.setAttribute('download', exportFileName);
        document.body.appendChild(linkElement); // Required for Firefox
        linkElement.click();
        document.body.removeChild(linkElement); // Clean up
        URL.revokeObjectURL(url); // Clean up blob URL

      } catch (error) {
        console.error('Error exporting logs:', error);
         this.$emit('show-message', { title: "error", message: '导出日志失败' });
      }
    },
    formatTimestamp(timestamp) {
      try {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
      } catch (e) {
        return 'Invalid Date';
      }
    },
    getIconNameForType(type) {
      switch (type) {
        case 'log': return 'check-circle'; // Use check for plain log? Or info? Let's use check.
        case 'info': return 'info-circle';
        case 'warn': return 'exclamation-triangle';
        case 'error': return 'exclamation-circle';
        default: return 'dot-circle'; // Fallback
      }
    },
    countLogsByType(type) {
      // Count from the original, unfiltered list
      return this.logs.filter(log => log.type === type).length;
    },
    toggleStack(indexInFilteredLogs) {
        // Need to map the filtered index back to the original log object if using log.id as key
        // Simpler: Use the index directly in the expandedStacks object as before.
        const log = this.filteredLogs[indexInFilteredLogs];
        if (log && log.stack) {
            // Use the index itself as the key for simplicity, assuming filteredLogs order is stable between renders
            const currentKey = indexInFilteredLogs; // Or use log.id if available and unique
            this.expandedStacks[currentKey] = !this.expandedStacks[currentKey];
        }
    },
    formatStackTrace(stack) {
        if (!stack) return '无堆栈信息';
        // Assuming stack is an object { name: 'Error', message: 'msg', stack: 'trace...' }
        // or just a string.
        let trace = '';
        if (typeof stack === 'object' && stack !== null && stack.stack) {
            trace = stack.stack;
        } else if (typeof stack === 'string') {
            trace = stack;
        } else {
            return JSON.stringify(stack, null, 2); // Fallback for unexpected format
        }

        // Simple formatting: just return the trace part
        return trace.trim(); // Trim whitespace
    },

    applyFiltersAndPagination() {
      const query = this.searchQuery.toLowerCase().trim();
      const activeFilters = Object.entries(this.filters)
                               .filter(([, value]) => value)
                               .map(([key]) => key);

      const filtered = this.logs.filter(log => {
        // Type filter
        if (!activeFilters.includes(log.type)) {
          return false;
        }

        // Search filter
        if (query) {
          const message = String(log.message || '').toLowerCase();
          const timestamp = this.formatTimestamp(log.timestamp).toLowerCase();
          let stackTrace = '';
          if (log.stack) {
              stackTrace = (typeof log.stack === 'string' ? log.stack : log.stack.stack || '').toLowerCase();
          }
          if (!message.includes(query) && !timestamp.includes(query) && !stackTrace.includes(query)) {
            return false;
          }
        }
        return true;
      });

      // Pagination calculations
      this.pageCount = Math.max(1, Math.ceil(filtered.length / this.logsPerPage));
      if (this.currentPage > this.pageCount) {
        this.currentPage = this.pageCount; // Adjust if current page is out of bounds
      }
      if (this.currentPage < 1) {
          this.currentPage = 1;
      }

      // Slice for current page
      const startIndex = (this.currentPage - 1) * this.logsPerPage;
      this.filteredLogs = filtered.slice(startIndex, startIndex + this.logsPerPage);

      // Reset expanded stacks when filters/page change significantly
      this.expandedStacks = {};
    },
    changePage(page) {
      const newPage = Math.max(1, Math.min(page, this.pageCount));
      if (newPage !== this.currentPage) {
        this.currentPage = newPage;
        this.applyFiltersAndPagination();
         // Scroll to top of table maybe?
         this.$el.querySelector('.logs-table-container')?.scrollTo(0, 0);
      }
    }
  },
  watch: {
    searchQuery() {
      // Reset to page 1 when searching
      if (this.currentPage !== 1) {
          this.currentPage = 1;
      }
      this.applyFiltersAndPagination();
    },
    filters: {
      deep: true,
      handler() {
        // Reset to page 1 when filters change
        if (this.currentPage !== 1) {
           this.currentPage = 1;
        }
        this.applyFiltersAndPagination();
      }
    }
  },
  async mounted() {
    await this.loadLogs();
  }
};
</script>

<style scoped>
.logs-container {
  /* Inherits .card styles */
  padding: 20px;
  background-color: var(--surface-color);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--box-shadow);
  display: flex;
  flex-direction: column;
  gap: 20px; /* Consistent spacing between sections */
}

/* Header */
.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

.page-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--primary-color);
  margin: 0;
}

.logs-actions {
  display: flex;
  gap: 10px;
}
.logs-actions .btn-sm {
    padding: 6px 12px;
}

/* Controls: Filter & Search */
.logs-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-label {
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-options {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

/* Custom Checkbox Style */
.custom-checkbox {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  padding-left: 26px; /* Space for custom checkbox */
  user-select: none;
  gap: 6px;
}

.custom-checkbox input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 18px;
  width: 18px;
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.custom-checkbox:hover input ~ .checkmark {
  border-color: var(--primary-light);
}

.custom-checkbox input:checked ~ .checkmark {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.custom-checkbox input:checked ~ .checkmark:after {
  display: block;
}


.filter-type {
  font-size: 0.9rem;
  padding: 3px 8px;
  border-radius: var(--border-radius-sm);
  color: white; /* Default text color */
}
.filter-type.log { background-color: var(--info-color); }
.filter-type.info { background-color: var(--primary-color); }
.filter-type.warn { background-color: var(--warning-color); color: #333; } /* Adjust text color for yellow */
.filter-type.error { background-color: var(--danger-color); }

/* Search Box */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative; /* Needed for icon positioning */
  min-width: 250px;
}
.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    pointer-events: none; /* Prevent icon from blocking input */
}
.search-input {
  /* Uses global .input */
  padding-left: 35px; /* Space for the icon */
  width: 100%;
}


.separator {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 0; /* Reset margin if gap is used in container */
}

/* Table Area */
.logs-table-container {
  overflow-x: auto; /* Allow horizontal scroll on small screens */
  flex-grow: 1; /* Allow table to take available vertical space if needed */
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  table-layout: fixed; /* Prevent content from stretching columns too much */
}

.logs-table th,
.logs-table td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: top; /* Align content top */
  border-bottom: 1px solid var(--border-color);
   word-wrap: break-word; /* Allow long words/messages to break */
}

.logs-table thead th {
  background-color: var(--hover-overlay);
  color: var(--text-secondary);
  font-weight: 600;
  position: sticky; /* Keep header visible on scroll */
  top: 0;
  z-index: 1;
}

/* Column Widths */
.col-type { width: 70px; }
.col-timestamp { width: 180px; }
.col-message { width: auto; } /* Takes remaining space */

/* Log Row Styling */
.log-row.clickable {
    cursor: pointer;
}
.log-row:hover {
    background-color: var(--hover-overlay);
}

.log-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: white;
  font-size: 0.9em;
}
.log-badge.log { background-color: var(--info-color); }
.log-badge.info { background-color: var(--primary-color); }
.log-badge.warn { background-color: var(--warning-color); color: #333; }
.log-badge.error { background-color: var(--danger-color); }
.log-badge.default { background-color: var(--text-tertiary); } /* Fallback */

.col-message .message-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start; /* Align icon top right */
    gap: 10px;
}
.col-message .message-content > span {
    flex-grow: 1; /* Allow message text to take space */
}

.stack-toggle-icon {
  color: var(--text-tertiary);
  cursor: pointer;
  margin-left: 10px;
  transition: color 0.2s ease;
  flex-shrink: 0; /* Prevent icon from shrinking */
}
.stack-toggle-icon:hover {
  color: var(--primary-color);
}

/* Stack Trace Row */
.stack-row td {
    padding: 0; /* Remove padding for full width */
    border-bottom: 1px dashed var(--danger-light); /* Different border for stack */
     background-color: rgba(var(--danger-color-rgb, 231, 76, 60), 0.05); /* Faint red background */
     /* Ensure correct RGB is set in global CSS */
}
.dark-theme .stack-row td {
     background-color: rgba(var(--danger-color-rgb, 250, 82, 82), 0.1);
}

.error-stack {
  padding: 15px 20px 15px 40px; /* Indent stack */
}
.error-stack-trace {
  font-family: monospace;
  font-size: 0.85em;
  color: var(--danger-dark);
  background-color: transparent; /* Remove default pre background */
  border: none; /* Remove default pre border */
  padding: 0;
  margin: 0;
  white-space: pre-wrap; /* Allow wrapping */
  word-break: break-all;
  max-height: 300px; /* Limit height */
  overflow-y: auto; /* Add scroll if needed */
}
.dark-theme .error-stack-trace {
    color: var(--danger-light);
}

/* Loading / No Logs State */
.state-row td {
    text-align: center;
    padding: 30px;
    color: var(--text-tertiary);
}
.loading-cell svg, .no-logs-cell svg {
    margin-right: 8px;
    font-size: 1.1em;
}

/* Footer */
.logs-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}

.log-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  font-size: 0.9rem;
}
.stat-item {
  color: var(--text-secondary);
}
.stat-item strong {
    margin-left: 4px;
    color: var(--text-primary);
    font-weight: 600;
}
.stat-item.log strong { color: var(--info-color); }
.stat-item.info strong { color: var(--primary-color); }
.stat-item.warn strong { color: var(--warning-color); }
.stat-item.error strong { color: var(--danger-color); }
.stat-item.total strong { color: var(--text-primary); }


.pagination {
  display: flex;
  align-items: center;
  gap: 5px;
}
.pagination-btn {
  /* Uses .btn .btn-outline .btn-xs */
   padding: 4px 8px; /* Adjust xs padding */
}
.pagination-btn:disabled {
   opacity: 0.5;
   cursor: not-allowed;
}
.page-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 5px;
  white-space: nowrap;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
    .logs-header, .logs-controls, .logs-footer {
        flex-direction: column;
        align-items: stretch; /* Stretch items full width */
    }
    .logs-actions, .filter-options, .pagination {
        justify-content: flex-start; /* Align items left */
        width: 100%;
    }
     .logs-actions .btn {
         flex-grow: 1; /* Make action buttons take equal space */
     }
    .log-stats {
        justify-content: space-around; /* Distribute stats */
        width: 100%;
        margin-bottom: 10px;
    }
    .pagination {
        justify-content: center; /* Center pagination */
    }

    .col-timestamp { width: 140px; } /* Reduce timestamp width */
    .col-type { width: 50px; } /* Reduce type width */
}

</style>