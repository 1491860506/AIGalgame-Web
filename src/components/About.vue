<template>
  <!-- Main container using global card style -->
  <div class="about-container card">
    <!-- Title Section -->
    <div class="title-section">
      <div class="logo-title">
        <!-- Re-use app logo style -->
        <div class="app-logo">
          <font-awesome-icon :icon="['fas', 'gamepad']" />
        </div>
        <h1 class="app-title">AI galgame生成器</h1>
      </div>
      <div class="version-info">版本: V{{ currentVersion }}</div>
    </div>

    <hr class="separator"> <!-- Use global separator -->

    <!-- Update Buttons Section -->
    <div class="update-section">
      <button class="btn btn-primary" @click="checkForUpdates" :disabled="isCheckingOrLoading">
        <font-awesome-icon v-if="isCheckingUpdate" :icon="['fas', 'spinner']" spin />
        <font-awesome-icon v-else :icon="['fas', 'sync']" />
        {{ isCheckingUpdate ? '检查中...' : '检查更新' }}
      </button>
      <button class="btn btn-secondary" @click="showVersionSelector" :disabled="isCheckingOrLoading">
        <font-awesome-icon v-if="isLoadingVersions" :icon="['fas', 'spinner']" spin />
        <font-awesome-icon v-else :icon="['fas', 'download']" />
         {{ isLoadingVersions ? '加载版本...' : '下载特定版本' }}
      </button>
    </div>

    <hr class="separator">

    <!-- Content Section -->
    <div class="content-section">
      <!-- Help & Documentation Section -->
      <div class="inner-card card"> <!-- Apply card style to inner sections -->
        <h2 class="inner-card-title">
          <font-awesome-icon :icon="['fas', 'book']" />
          帮助与文档
        </h2>
        <div class="card-content">
          <div class="action-row">
            <div class="action-label">
              <span>用户手册 / 项目文档</span>
            </div>
            <button class="btn btn-outline" @click="openUrl('https://aigal.qqframe.cn')">
              <font-awesome-icon :icon="['fas', 'file-alt']" />
              查看文档
            </button>
          </div>
        </div>
      </div>

      <!-- About Software Section -->
      <div class="inner-card card"> <!-- Apply card style to inner sections -->
        <h2 class="inner-card-title">
          <font-awesome-icon :icon="['fas', 'info-circle']" />
          关于软件
        </h2>
        <div class="card-content">
          <p class="description">
            这是一款利用AI自动生成galgame的工具，支持角色、背景音乐、语音和场景的生成。
          </p>

          <div class="features-grid"> <!-- Use a grid for features -->
            <div class="feature-item">
              <font-awesome-icon :icon="['fas', 'users']" class="feature-icon" />
              <span class="feature-text">角色生成</span>
            </div>
            <div class="feature-item">
              <font-awesome-icon :icon="['fas', 'music']" class="feature-icon" />
              <span class="feature-text">背景音乐</span>
            </div>
            <div class="feature-item">
              <font-awesome-icon :icon="['fas', 'microphone']" class="feature-icon" />
              <span class="feature-text">语音生成</span>
            </div>
            <div class="feature-item">
              <font-awesome-icon :icon="['fas', 'image']" class="feature-icon" />
              <span class="feature-text">场景生成</span>
            </div>
          </div>

          <p class="copyright">© 2025 开发团队. 保留所有权利。</p>
        </div>
      </div>
    </div>

    <hr class="separator">

    <!-- Footer Section -->
    <div class="footer-section">
      <button class="btn btn-text" @click="openUrl('https://github.com/1491860506/AIGal')">
        <font-awesome-icon :icon="['fab', 'github']" />
        GitHub
      </button>

      <button class="btn btn-text" @click="openUrl('https://aigal.qqframe.cn')">
        <font-awesome-icon :icon="['fas', 'globe']" />
        官方网站
      </button>

      <button class="btn btn-text" @click="openUrl('mailto:admin@qqframe.cn')">
        <font-awesome-icon :icon="['fas', 'envelope']" />
        联系我们
      </button>
    </div>
  </div>

  <!-- Update Modal - Only shown if updateStatus is 'update-available' -->
  <!-- Added @click.self="closeModal" for backdrop click close -->
  <div class="modal" v-if="showUpdateModal && updateStatus === 'update-available'" @click.self="closeModal">
    <div class="modal-content card"> <!-- Apply card style -->
      <div class="modal-header">
        <h3 class="modal-title">软件更新</h3>
        <button class="close-button btn btn-text btn-sm" @click="closeModal" title="关闭">
          <font-awesome-icon :icon="['fas', 'times']" />
        </button>
      </div>
      <div class="modal-body">
          <p>检测到新版本：</p>
          <div class="version-option card" v-if="latestStableVersion"> <!-- Apply card style -->
            <h4 class="version-option-title">
              <font-awesome-icon :icon="['fas', 'check-circle']" class="version-icon stable" />
              正式版 V{{ latestStableVersion.version }}
            </h4>
            <p class="version-description">{{ latestStableVersion.description }}</p>
            <button class="btn btn-primary" @click="downloadVersion(latestStableVersion)">
              <font-awesome-icon :icon="['fas', 'download']" />
              下载正式版
            </button>
          </div>
          <div class="version-option card" v-if="latestTestVersion"> <!-- Apply card style -->
            <h4 class="version-option-title">
              <font-awesome-icon :icon="['fas', 'flask']" class="version-icon test" />
              测试版 V{{ latestTestVersion.version }}
            </h4>
            <p class="version-description">{{ latestTestVersion.description }}</p>
            <button class="btn btn-secondary" @click="downloadVersion(latestTestVersion)">
              <font-awesome-icon :icon="['fas', 'download']" />
              下载测试版
            </button>
          </div>
      </div>
       <!-- No footer needed for this modal -->
    </div>
  </div>

  <!-- Version Selector Modal - Only shown if versionList is populated -->
   <!-- Added @click.self="closeModal" for backdrop click close -->
  <div class="modal" v-if="showVersionSelectorModal && versionList.length > 0" @click.self="closeModal">
    <div class="modal-content card"> <!-- Apply card style -->
      <div class="modal-header">
        <h3 class="modal-title">选择下载版本</h3>
        <button class="close-button btn btn-text btn-sm" @click="closeModal" title="关闭">
          <font-awesome-icon :icon="['fas', 'times']" />
        </button>
      </div>
      <div class="modal-body">
         <div class="os-selector form-group">
           <label class="form-label">选择操作系统：</label>
           <select v-model="selectedOS" class="select">
             <option value="windows">Windows</option>
             <option value="linux">Linux</option>
             <option value="mac">macOS</option>
             <option value="android">Android</option>
           </select>
         </div>

         <div class="version-list">
           <div v-for="(version, index) in versionList" :key="index" class="version-item card"> <!-- Apply card style -->
             <div class="version-header">
               <h4 class="version-item-title">
                 <font-awesome-icon
                   :icon="['fas', isTestVersion(version.version) ? 'flask' : 'check-circle']"
                   :class="['version-icon', isTestVersion(version.version) ? 'test' : 'stable']"
                 />
                 V{{ version.version }}
               </h4>
               <span class="version-tag" :class="isTestVersion(version.version) ? 'warning' : 'secondary'"> <!-- Use badge-like classes -->
                 {{ isTestVersion(version.version) ? '测试版' : '正式版' }}
               </span>
             </div>
             <p class="version-description">{{ version.description }}</p>
             <button class="btn btn-primary" @click="downloadVersion(version)">
               <font-awesome-icon :icon="['fas', 'download']" />
               下载此版本 ({{ selectedOS }})
             </button>
           </div>
         </div>
      </div>
       <!-- No footer needed for this modal -->
    </div>
  </div>

</template>

<script>
// Ensure icons used are imported in main.js for global registration
// Icons: gamepad, sync, download, book, file-alt, info-circle, users, music, microphone, image, github (fab), globe, envelope, times, check-circle, flask, spinner

export default {
  name: 'About',
  emits: ['showMessage'], // Declare emitted events
  data() {
    return {
      currentVersion: '1.0.5', // Assume this is fetched or defined elsewhere, or hardcoded
      versionList: [], // Full list of versions
      showUpdateModal: false, // Controls update modal visibility
      showVersionSelectorModal: false, // Controls version selector modal visibility
      updateStatus: '', // 'checking', 'up-to-date', 'update-available', 'error', 'downloading' (simplified states for fetch)
      errorMessage: '', // Store error message if fetch fails
      latestStableVersion: null, // Latest stable fetched
      latestTestVersion: null, // Latest test fetched
      // downloadingVersion: '', // Not strictly needed with the new flow, can show message via emit
      selectedOS: this.detectOS(), // Detected or selected OS
      isCheckingUpdate: false, // Loading state for check update button
      isLoadingVersions: false, // Loading state for download specific version button
    };
  },
  computed: {
    // Helper to disable buttons while checking or loading versions
    isCheckingOrLoading() {
        return this.isCheckingUpdate || this.isLoadingVersions;
    }
  },
  methods: {
    // Emit message using the global toastification
    emitMessage(type, message) {
        // Map types to toastification types (success, error, warning, info)
        const toastType = type === 'success' ? 'success' :
                           type === 'error' ? 'error' :
                           type === 'warning' ? 'warning' :
                           'info'; // Default to info

        this.$emit('showMessage', { title: toastType, message: message });
    },

    openUrl(url) {
      const targetUrl = url.startsWith('/') ? window.location.origin + url : url;
      window.open(targetUrl, '_blank');
    },

    detectOS() {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.indexOf('windows') !== -1) return 'windows';
      if (userAgent.indexOf('mac') !== -1) return 'mac';
      if (userAgent.indexOf('android') !== -1) return 'android';
      if (userAgent.indexOf('linux') !== -1) return 'linux'; // Generic linux after android
      return 'windows'; // Default fallback
    },

    // Fetch version information with error handling
    async fetchVersionInfo() {
        try {
            const response = await fetch('https://cors_proxy.qqframe.cn/aigalweb_version');
            if (!response.ok) {
                 // Use response status text or custom error message
                const errorDetail = response.statusText || 'Unknown network error';
                console.error(`Failed to fetch version info: HTTP status ${response.status}`, errorDetail);
                throw new Error(`无法获取版本信息 (状态: ${response.status})`);
            }
            const data = await response.json();
            // Basic check if the data looks like a list of versions
            if (!Array.isArray(data) || data.length === 0 || !data[0].hasOwnProperty('version')) {
                 console.error("Fetched data is not a valid version list:", data);
                 throw new Error('获取的版本信息格式不正确');
            }
            return data;
        } catch (error) {
            console.error('Fetch version info failed:', error);
            // Rethrow the error so the caller can catch it and emit a message
            throw error;
        }
    },

    // Check for updates
    async checkForUpdates() {
      this.isCheckingUpdate = true; // Start loading state
      this.updateStatus = 'checking'; // Indicate state (for internal logic if needed)
      this.errorMessage = ''; // Clear previous errors
      this.latestStableVersion = null;
      this.latestTestVersion = null;
      this.closeModal(); // Ensure other modals are closed

      this.emitMessage('info', '正在检查更新...');

      try {
        const versions = await this.fetchVersionInfo();

        // Process versions only on success
        const stableVersions = versions.filter(v => !this.isTestVersion(v.version));
        const testVersions = versions.filter(v => this.isTestVersion(v.version));

        this.latestStableVersion = this.findLatestVersion(stableVersions);
        this.latestTestVersion = this.findLatestVersion(testVersions);

        // Determine if update is needed
        const needsUpdate =
          (this.latestStableVersion && this.compareVersions(this.latestStableVersion.version, this.currentVersion) > 0) ||
          (this.latestTestVersion && this.compareVersions(this.latestTestVersion.version.replace('t', ''), this.currentVersion) > 0); // Compare test versions without 't' prefix

        if (needsUpdate) {
            this.updateStatus = 'update-available'; // State indicates update is available
            this.emitMessage('info', '检测到新版本');
             this.showUpdateModal = true; // Open modal only if update is available
        } else {
            this.updateStatus = 'up-to-date'; // State indicates it's up-to-date
            this.emitMessage('success', `当前已是最新版本 (V${this.currentVersion})`);
             // Do NOT open modal if it's up-to-date
             this.showUpdateModal = false; // Explicitly ensure it's false
        }

      } catch (error) {
        // Fetch failed - emit error message and do NOT open modal (handled by v-if)
        this.updateStatus = 'error';
        this.errorMessage = error.message;
        this.emitMessage('error', `检查更新失败: ${error.message}`);
         this.showUpdateModal = false; // Explicitly ensure it's false
      } finally {
        this.isCheckingUpdate = false; // End loading state
      }
    },

    // Show version selector
    async showVersionSelector() {
      this.isLoadingVersions = true; // Start loading state
      this.versionList = []; // Clear previous list
      this.errorMessage = ''; // Clear previous errors
      this.closeModal(); // Ensure other modals are closed

      this.emitMessage('info', '正在加载版本列表...');

      try {
        const versions = await this.fetchVersionInfo();

        // Sort versions descending
        this.versionList = versions.sort((a, b) =>
          this.compareVersions(b.version.replace(/^t/, ''), a.version.replace(/^t/, '')) // Use regex for robust 't' removal
        );
        this.emitMessage('success', '版本列表加载成功');
        this.showVersionSelectorModal = true; // Open modal on success

      } catch (error) {
        // Fetch failed - emit error message and do NOT open modal (handled by v-if)
        this.errorMessage = error.message;
        this.emitMessage('error', `加载版本列表失败: ${error.message}`);
         this.showVersionSelectorModal = false; // Explicitly ensure it's false
      } finally {
        this.isLoadingVersions = false; // End loading state
      }
    },

    // Download specified version
    downloadVersion(version) {
      // Check if version object is valid and has the necessary properties
      if (!version || typeof version.version !== 'string') {
           console.error("Invalid version object provided for download:", version);
           this.emitMessage('error', '无效的版本信息，无法下载。');
           return;
      }

      const osMap = {
        'windows': 'url_windows',
        'linux': 'url_linux',
        'mac': 'url_mac',
        'android': 'url_android'
      };

      const downloadUrl = version[osMap[this.selectedOS]];

      if (downloadUrl) {
        this.emitMessage('info', `正在尝试下载 V${version.version} (${this.selectedOS})...`);
        window.open(downloadUrl, '_blank');
        this.closeModal(); // Close modal after initiating download
      } else {
        // Download URL not found for the selected OS
        const errorMessage = `没有找到适用于 "${this.selectedOS}" 的 V${version.version} 下载链接。`;
        console.warn(errorMessage, version);
        this.errorMessage = errorMessage; // Store internally if needed for debug
        this.emitMessage('warning', errorMessage);
        // Do NOT close the modal here, the user might want to select a different OS or version
      }
    },

    closeModal() {
      this.showUpdateModal = false;
      this.showVersionSelectorModal = false;
      this.updateStatus = ''; // Reset status when closing
      this.errorMessage = ''; // Clear error message
      // Do not reset latest versions or versionList here, they persist until next fetch
    },

    isTestVersion(version) {
      return version.startsWith('t');
    },

    findLatestVersion(versions) {
      if (!versions || versions.length === 0) return null;

      return versions.reduce((latest, current) => {
        // Ensure comparison ignores the 't' prefix for test versions
        const latestVer = latest.version.replace(/^t/, '');
        const currentVer = current.version.replace(/^t/, '');
        return this.compareVersions(currentVer, latestVer) > 0 ? current : latest;
      }, versions[0]);
    },

    compareVersions(v1, v2) {
      const parts1 = v1.split('.').map(Number);
      const parts2 = v2.split('.').map(Number);

      const maxLength = Math.max(parts1.length, parts2.length);

      for (let i = 0; i < maxLength; i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;

        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
      }
      return 0;
    }
  }
};
</script>

<style scoped>
/* Main container using global card style */
.about-container {
  /* Inherits .card style from app.vue */
  padding: 20px; /* Override default card padding if needed */
  max-width: 800px; /* Limit max width for better readability */
  margin: 0 auto; /* Center the container */
  background-color: var(--surface-color); /* Ensure background is set */
  border-radius: var(--border-radius-lg);
  box-shadow: var(--box-shadow);
}

/* Use global separator */
.separator {
  margin: 20px 0;
  border: none;
  border-top: 1px solid var(--border-color);
}

/* Title Section */
.title-section {
  text-align: center;
  margin-bottom: 20px;
}

.logo-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 10px;
}

.app-logo {
  font-size: 3rem;
  color: var(--primary-color);
}

.app-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.version-info {
  font-size: 1rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Update Buttons Section */
.update-section {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap; /* Allow buttons to wrap on small screens */
}

.update-section .btn {
  /* Inherits global btn styles */
  padding: 10px 20px; /* Adjust padding */
}
.update-section .btn .fa-spinner {
    margin-right: 8px; /* Space for spinner */
}


/* Content Section (Help & About) */
.content-section {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap; /* Allow sections to stack */
}

.inner-card {
  /* Inherits global card styles */
  flex: 1 1 calc(50% - 10px); /* Two columns layout */
  min-width: 280px; /* Minimum width before stacking */
  padding: 20px; /* Padding for inner cards */
   background-color: var(--background-color); /* Use background color for inner cards */
}

.inner-card-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-content {
  /* Padding handled by .inner-card */
}

/* Help/Docs specific styles */
.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap; /* Allow wrapping */
  gap: 10px;
}

.action-label span {
  font-weight: 500;
  color: var(--text-secondary);
}

.action-row .btn {
    /* Inherits global btn-outline */
     padding: 8px 16px;
}

/* About Software specific styles */
.description {
  margin-bottom: 20px;
  color: var(--text-primary);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* Responsive grid */
  gap: 15px;
  margin-bottom: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.feature-icon {
  font-size: 1.1rem;
  color: var(--primary-color); /* Use primary color for icons */
}

.feature-text {
  font-size: 0.95rem;
}

.copyright {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  text-align: center;
  margin-top: 20px;
}


/* Footer Section */
.footer-section {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap; /* Allow buttons to wrap */
}

.footer-section .btn-text {
  /* Inherits global btn-text styles */
  color: var(--text-secondary);
  padding: 6px 10px; /* Adjust padding */
}
.footer-section .btn-text:hover {
    color: var(--text-primary);
    background-color: var(--hover-overlay);
}

/* Modal Styling (Based on global styles) */
.modal {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  padding: 15px;
  overflow-y: auto;
}

.modal-content {
  /* Inherits global card styles */
  width: 100%;
  max-width: 550px; /* Adjust max width for modals */
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px; /* Padding inside the modal content */
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 15px;
  margin-bottom: 15px;
  flex-shrink: 0;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-button {
  /* Uses global btn-text btn-sm */
  color: var(--text-secondary);
}
.close-button:hover {
    color: var(--text-primary);
    background-color: var(--hover-overlay);
}

.modal-body {
  overflow-y: auto;
  flex-grow: 1;
  margin-bottom: 0; /* No bottom margin if no footer */
}

/* Update Modal Specifics */
.version-option {
    /* Inherits global card style */
    margin-bottom: 15px;
    padding: 15px;
    background-color: var(--background-color); /* Use background for inner card */
    border: 1px solid var(--border-color); /* Add a border */
}
.version-option:last-child {
    margin-bottom: 0;
}

.version-option-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.version-icon {
   font-size: 1.2em;
}
.version-icon.stable {
    color: var(--secondary-color); /* Green for stable */
}
.version-icon.test {
    color: var(--warning-color); /* Yellow/Orange for test */
}

.version-description {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 15px;
}
.version-option .btn {
    /* Inherits global btn styles */
    padding: 8px 16px;
}

/* Version Selector Modal Specifics */
.os-selector {
    margin-bottom: 20px;
    /* Uses global form-group and select */
}
.os-selector label {
    /* Uses global form-label */
     margin-right: 10px;
     display: inline-block; /* Keep label next to select */
}
.os-selector .select {
     width: auto; /* Auto width for select */
     min-width: 120px;
     padding: 8px 16px;
}


.version-list {
  /* List container */
}

.version-item {
   /* Inherits global card style */
   margin-bottom: 15px;
   padding: 15px;
   background-color: var(--background-color); /* Use background */
   border: 1px solid var(--border-color); /* Add border */
}
.version-item:last-child {
    margin-bottom: 0;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
  flex-wrap: wrap; /* Allow wrap */
}

.version-item-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.version-tag {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px; /* Rounded corners */
  white-space: nowrap; /* Prevent wrapping */
  /* Colors inherited from global badge styles via classes like .secondary, .warning */
}
.version-tag.stable {
    background-color: var(--secondary-light);
    color: white;
}
.version-tag.warning { /* Used for '测试版' */
    background-color: var(--warning-light);
    color: var(--text-primary); /* Use dark text on warning */
}


.version-item .version-description {
   font-size: 0.9rem;
   color: var(--text-secondary);
   margin-bottom: 15px;
}

.version-item .btn {
   /* Inherits global btn styles */
   padding: 8px 16px;
}

/* Optional: Loading spinner style if needed inside modal body */
.modal-body .loading-spinner {
    width: 30px;
    height: 30px;
    margin: 20px auto;
    border: 3px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive Adjustments */
@media (max-width: 768px) {
    .about-container {
        padding: 15px; /* Reduce padding on small screens */
    }
    .title-section {
        padding-bottom: 15px;
    }
    .logo-title {
        flex-direction: column;
        gap: 5px;
    }
    .app-logo {
        font-size: 2.5rem;
    }
    .app-title {
        font-size: 1.6rem;
    }
    .version-info {
        font-size: 0.9rem;
    }
    .update-section {
        flex-direction: column; /* Stack buttons */
        gap: 10px;
    }
    .update-section .btn {
        width: 100%; /* Full width */
    }
    .content-section {
        flex-direction: column; /* Stack inner cards */
        gap: 15px;
    }
     .inner-card {
        flex-basis: auto; /* Reset flex-basis when stacked */
        min-width: 0;
        padding: 15px;
     }
    .inner-card-title {
        font-size: 1.1rem;
    }
    .action-row {
        flex-direction: column;
        align-items: stretch;
    }
    .action-row .btn {
        width: 100%;
    }
     .features-grid {
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); /* Adjust min width for features */
        gap: 10px;
     }
    .feature-item {
         flex-direction: column; /* Stack icon and text */
         text-align: center;
         gap: 4px;
    }
     .feature-icon {
        font-size: 1.4rem;
     }
     .feature-text {
         font-size: 0.85rem;
     }
     .footer-section {
        flex-direction: column; /* Stack footer links */
        gap: 10px;
        align-items: center;
     }
     .footer-section .btn-text {
         width: 100%; /* Full width links */
     }

    /* Modal Adjustments */
    .modal-content {
        max-width: 95%;
        padding: 15px;
    }
    .modal-title {
        font-size: 1.1rem;
    }
    .version-option, .version-item {
        padding: 12px;
    }
    .version-option-title, .version-item-title {
        font-size: 1rem;
    }
     .os-selector label {
         display: block; /* Stack label above select */
         margin-right: 0;
         margin-bottom: 5px;
     }
     .os-selector .select {
         width: 100%;
     }
}
</style>