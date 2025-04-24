<template>
  <div class="logs-container">
    <!-- Header Section -->
    <div class="logs-header">
      <h1>系统日志</h1>
      <div class="logs-actions">
        <button class="btn btn-primary" @click="refreshLogs">
          <!-- <i class="fas fa-sync-alt"></i> -->
          <font-awesome-icon :icon="['fas', 'sync-alt']" />
          刷新
        </button>
        <button class="btn btn-danger" @click="clearLogs">
          <!-- <i class="fas fa-trash-alt"></i> -->
          <font-awesome-icon :icon="['fas', 'trash-alt']" />
          清除
        </button>
        <button class="btn" @click="downloadLogs">
          <!-- <i class="fas fa-download"></i> -->
          <font-awesome-icon :icon="['fas', 'download']" />
          导出
        </button>
      </div>
    </div>

    <div class="logs-filter">
      <div class="filter-group">
        <label>筛选:</label>
        <div class="filter-options">
          <label class="filter-checkbox">
            <input type="checkbox" v-model="filters.log" />
            <span class="filter-type log">日志</span>
          </label>
          <label class="filter-checkbox">
            <input type="checkbox" v-model="filters.info" />
            <span class="filter-type info">信息</span>
          </label>
          <label class="filter-checkbox">
            <input type="checkbox" v-model="filters.warn" />
            <span class="filter-type warn">警告</span>
          </label>
          <label class="filter-checkbox">
            <input type="checkbox" v-model="filters.error" />
            <span class="filter-type error">错误</span>
          </label>
        </div>
      </div>
      <div class="search-box">
        <!-- <i class="fas fa-search"></i> -->
        <font-awesome-icon :icon="['fas', 'search']" />
        <input type="text" placeholder="搜索日志..." v-model="searchQuery" />
      </div>
    </div>

    <!-- Log Table -->
    <div class="logs-table-container">
      <table class="logs-table">
        <thead>
          <tr>
            <th class="type-column">类型</th>
            <th class="timestamp-column">时间</th>
            <th class="message-column">消息</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="3" class="loading-logs">
              <!-- <i class="fas fa-spinner fa-spin"></i> -->
              <font-awesome-icon :icon="['fas', 'spinner']" spin /> <!-- Use spin prop -->
              正在加载日志...
            </td>
          </tr>
          <tr v-else-if="filteredLogs.length === 0">
            <td colspan="3" class="no-logs">
              <!-- <i class="fas fa-info-circle"></i> -->
              <font-awesome-icon :icon="['fas', 'info-circle']" />
              没有匹配的日志记录
            </td>
          </tr>
          <tr v-for="(log, index) in filteredLogs" :key="index" :class="'log-row log-' + log.type">
            <td class="type-column">
              <span class="log-badge" :class="log.type">
                <!-- <i :class="getIconForType(log.type)"></i> -->
                 <!-- Update binding to use the method returning icon name -->
                <font-awesome-icon :icon="['fas', getIconNameForType(log.type)]" />
              </span>
            </td>
            <td class="timestamp-column">{{ formatTimestamp(log.timestamp) }}</td>
            <td class="message-column">{{ log.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Statistics Footer -->
    <div class="logs-footer">
      <div class="log-stats">
        <!-- Stats remain the same -->
        <div class="stat-item">
          <span class="stat-label">总计:</span>
          <span class="stat-value">{{ logs.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">日志:</span>
          <span class="stat-value log">{{ countLogsByType('log') }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">信息:</span>
          <span class="stat-value info">{{ countLogsByType('info') }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">警告:</span>
          <span class="stat-value warn">{{ countLogsByType('warn') }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">错误:</span>
          <span class="stat-value error">{{ countLogsByType('error') }}</span>
        </div>
      </div>
      <div class="pagination" v-if="pageCount > 1">
        <button
          class="pagination-btn"
          :disabled="currentPage === 1"
          @click="changePage(1)"
        >
          <!-- <i class="fas fa-angle-double-left"></i> -->
          <font-awesome-icon :icon="['fas', 'angle-double-left']" />
        </button>
        <button
          class="pagination-btn"
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          <!-- <i class="fas fa-angle-left"></i> -->
          <font-awesome-icon :icon="['fas', 'angle-left']" />
        </button>
        <span class="page-info">{{ currentPage }} / {{ pageCount }}</span>
        <button
          class="pagination-btn"
          :disabled="currentPage === pageCount"
          @click="changePage(currentPage + 1)"
        >
          <!-- <i class="fas fa-angle-right"></i> -->
          <font-awesome-icon :icon="['fas', 'angle-right']" />
        </button>
        <button
          class="pagination-btn"
          :disabled="currentPage === pageCount"
          @click="changePage(pageCount)"
        >
          <!-- <i class="fas fa-angle-double-right"></i> -->
          <font-awesome-icon :icon="['fas', 'angle-double-right']" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
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
      pageCount: 1
    };
  },
  methods: {
    async loadLogs() {
      try {
        this.isLoading = true;
        if (window.getStoredLogs) {
          const logs = await window.getStoredLogs();
          this.logs = logs || [];
          this.applyFiltersAndPagination();
        } else {
          console.error('getStoredLogs function not found');
          this.logs = [];
          this.applyFiltersAndPagination(); // Apply even if empty
        }
      } catch (error) {
        console.error('Error loading logs:', error);
        this.logs = [];
        this.applyFiltersAndPagination(); // Apply even on error
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
            this.applyFiltersAndPagination(); // Update view after clearing
          } else {
            console.error('clearStoredLogs function not found');
          }
        } catch (error) {
          console.error('Error clearing logs:', error);
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
          dataToExport = this.logs; // Fallback
        }
        if (!dataToExport || dataToExport.length === 0) {
            alert("没有日志可以导出。");
            return;
        }

        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileName = `logs_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
      } catch (error) {
        console.error('Error exporting logs:', error);
        alert("导出日志失败。");
      }
    },
    formatTimestamp(timestamp) {
      try {
        const date = new Date(timestamp);
        // Check if date is valid before formatting
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
      } catch (e) {
          return 'Invalid Date';
      }
    },
    // Renamed method to clarify it returns the icon NAME, not class
    getIconNameForType(type) {
      switch (type) {
        case 'log': return 'info'; // Returns name 'info'
        case 'info': return 'info-circle';
        case 'warn': return 'exclamation-triangle';
        case 'error': return 'exclamation-circle';
        default: return 'dot-circle';
      }
    },
    countLogsByType(type) {
      return this.logs.filter(log => log.type === type).length;
    },
    applyFiltersAndPagination() {
      // Apply type filters and search query
      const filtered = this.logs.filter(log => {
        // Check type exists in filters object before accessing
        if (!this.filters.hasOwnProperty(log.type) || !this.filters[log.type]) {
          return false;
        }

        // Apply search query
        if (this.searchQuery && this.searchQuery.trim() !== '') {
          const query = this.searchQuery.toLowerCase();
          const message = String(log.message || '').toLowerCase(); // Handle null/undefined message
          const timestamp = this.formatTimestamp(log.timestamp).toLowerCase();
          return message.includes(query) || timestamp.includes(query);
        }

        return true;
      });

      // Calculate pagination
      this.pageCount = Math.max(1, Math.ceil(filtered.length / this.logsPerPage));

      // Ensure current page is valid
      if (this.currentPage > this.pageCount) {
        this.currentPage = this.pageCount;
      }

      // Apply pagination
      const startIndex = (this.currentPage - 1) * this.logsPerPage;
      this.filteredLogs = filtered.slice(startIndex, startIndex + this.logsPerPage);
    },
    changePage(page) {
        if (page >= 1 && page <= this.pageCount) {
            this.currentPage = page;
            this.applyFiltersAndPagination();
        }
    }
  },
  watch: {
    searchQuery() {
      this.currentPage = 1; // Reset to first page on new search
      this.applyFiltersAndPagination();
    },
    filters: {
      deep: true,
      handler() {
        this.currentPage = 1; // Reset to first page on filter change
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
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--content-bg);
  color: var(--text-primary);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--shadow);
}

/* Header */
.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.logs-header h1 {
  font-size: 1.5rem;
  margin: 0;
  font-weight: 600;
  color: var(--text-primary);
}

.logs-actions {
  display: flex;
  gap: 0.5rem;
}

/* Filter Section */
.logs-filter {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background-color: var(--sidebar-bg);
  border-bottom: 1px solid var(--border-color);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.filter-group label {
  font-weight: 500;
}

.filter-options {
  display: flex;
  gap: 0.75rem;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
}

.filter-type {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.filter-type.log {
  background-color: rgba(0, 122, 255, 0.1);
  color: #007aff;
}

.filter-type.info {
  background-color: rgba(0, 200, 83, 0.1);
  color: #00c853;
}

.filter-type.warn {
  background-color: rgba(255, 171, 0, 0.1);
  color: #ffab00;
}

.filter-type.error {
  background-color: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.search-box {
  display: flex;
  align-items: center;
  background-color: var(--hover-bg);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  width: 250px;
}

.search-box i {
  color: var(--text-secondary);
  margin-right: 0.5rem;
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  width: 100%;
}

.search-box input::placeholder {
  color: var(--text-secondary);
}

/* Log Table */
.logs-table-container {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
}

.logs-table th {
  background-color: var(--sidebar-bg);
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-primary);
  position: sticky;
  top: 0;
  z-index: 1;
  box-shadow: 0 1px 0 var(--border-color);
}

.logs-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

.logs-table tbody tr:hover {
  background-color: var(--hover-bg);
}

.type-column {
  width: 60px;
}

.timestamp-column {
  width: 180px;
}

.message-column {
  min-width: 300px;
}

.log-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.log-badge.log {
  background-color: rgba(0, 122, 255, 0.15);
  color: #007aff;
}

.log-badge.info {
  background-color: rgba(0, 200, 83, 0.15);
  color: #00c853;
}

.log-badge.warn {
  background-color: rgba(255, 171, 0, 0.15);
  color: #ffab00;
}

.log-badge.error {
  background-color: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}

.no-logs {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.no-logs i {
  margin-right: 0.5rem;
}

.loading-logs {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.loading-logs i {
  margin-right: 0.5rem;
  animation: spin 1s infinite linear;
}

/* Stats Footer */
.logs-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  background-color: var(--sidebar-bg);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-stats {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-label {
  font-weight: 500;
  color: var(--text-secondary);
}

.stat-value {
  font-weight: 600;
}

.stat-value.log {
  color: #007aff;
}

.stat-value.info {
  color: #00c853;
}

.stat-value.warn {
  color: #ffab00;
}

.stat-value.error {
  color: #ff3b30;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--content-bg);
  color: var(--text-primary);
  cursor: pointer;
}

.pagination-btn:hover:not(:disabled) {
  background-color: var(--hover-bg);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.875rem;
  color: var(--text-secondary);
  padding: 0 0.5rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
  background-color: var(--content-bg);
  color: var(--text-primary);
}

.btn:hover {
  background-color: var(--hover-bg);
}

.btn i {
  font-size: 0.9rem;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-primary:hover {
  background-color: var(--primary-hover);
}

.btn-danger {
  background-color: #ff3b30;
  color: white;
  border-color: #ff3b30;
}

.btn-danger:hover {
  background-color: #e02e24;
}

/* Animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive adjustments */
@media screen and (max-width: 768px) {
  .logs-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .logs-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .logs-filter {
    flex-direction: column;
    gap: 1rem;
  }
  
  .filter-group, .search-box {
    width: 100%;
  }
  
  .timestamp-column {
    width: 120px;
  }
  
  .logs-footer {
    flex-direction: column;
    gap: 1rem;
  }
  
  .log-stats {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>