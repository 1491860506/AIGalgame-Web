<template>
  <div>
  <div class="about-container">
    <!-- Title Section -->
    <div class="title-section">
      <div class="logo-title">
        <div class="app-logo">
          <font-awesome-icon :icon="['fas', 'gamepad']" />
        </div>
        <h1 class="app-title">AI galgame生成器</h1>
      </div>
      <div class="version-info">V{{ currentVersion }}</div>
    </div>

    <div class="divider"></div>

    <!-- Update Buttons Section -->
    <div class="update-section">
      <button class="btn btn-primary" @click="checkForUpdates">
        <font-awesome-icon :icon="['fas', 'sync']" class="btn-icon-fa" />
        检查更新
      </button>
      <button class="btn btn-secondary" @click="showVersionSelector">
        <font-awesome-icon :icon="['fas', 'download']" class="btn-icon-fa" />
        下载特定版本
      </button>
    </div>

    <div class="divider"></div>

    <!-- Content Section -->
    <div class="content-section">
      <!-- Help & Documentation Section -->
      <div class="card">
        <h2 class="card-title">
          <font-awesome-icon :icon="['fas', 'book']" class="card-icon-fa" />
          帮助与文档
        </h2>
        <div class="card-content">
          <!-- 原“查看在线文档”改为“查看项目文档” -->
          <div class="action-row">
            <div class="action-label">
              <span>用户手册</span>
            </div>
            <button class="btn btn-primary" @click="openUrl('https://aigal.qqframe.cn')">
              <font-awesome-icon :icon="['fas', 'file-alt']" class="btn-icon-fa" />
              查看项目文档
            </button>
          </div>

          <!-- 新增“查看配置说明” -->
          <div class="action-row">
             <div class="action-label">
              <span>配置说明</span>
            </div>
            <button class="btn btn-primary" @click="openUrl('/docs')">
              <font-awesome-icon :icon="['fas', 'cogs']" class="btn-icon-fa" /> <!-- 使用齿轮图标或您喜欢的其他图标 -->
              查看配置说明
            </button>
          </div>

        </div>
      </div>

      <!-- About Software Section -->
      <div class="card">
        <h2 class="card-title">
          <font-awesome-icon :icon="['fas', 'info-circle']" class="card-icon-fa" />
          关于软件
        </h2>
        <div class="card-content">
          <p class="description">
            这是一款利用AI自动生成galgame的工具，支持角色、背景音乐、语音和场景的生成。
          </p>

          <div class="features">
            <div class="feature-item">
              <font-awesome-icon :icon="['fas', 'users']" class="feature-icon-fa" />
              <span class="feature-text">角色生成</span>
            </div>
            <div class="feature-item">
              <font-awesome-icon :icon="['fas', 'music']" class="feature-icon-fa" />
              <span class="feature-text">背景音乐</span>
            </div>
            <div class="feature-item">
              <font-awesome-icon :icon="['fas', 'microphone']" class="feature-icon-fa" />
              <span class="feature-text">语音生成</span>
            </div>
            <div class="feature-item">
              <font-awesome-icon :icon="['fas', 'image']" class="feature-icon-fa" />
              <span class="feature-text">场景生成</span>
            </div>
          </div>

          <p class="copyright">© 2025 开发团队. 保留所有权利。</p>
        </div>
      </div>
    </div>

    <!-- Footer Section -->
    <div class="footer-section">
      <button class="btn btn-link" @click="openUrl('https://github.com/1491860506/AIGal')">
        <font-awesome-icon :icon="['fab', 'github']" class="btn-icon-fa" />
        GitHub
      </button>

      <button class="btn btn-link" @click="openUrl('https://aigal.qqframe.cn')">
        <font-awesome-icon :icon="['fas', 'globe']" class="btn-icon-fa" />
        官方网站
      </button>

      <button class="btn btn-link" @click="openUrl('mailto:admin@qqframe.cn')">
        <font-awesome-icon :icon="['fas', 'envelope']" class="btn-icon-fa" />
        联系我们
      </button>
    </div>
  </div>

  <!-- Update Modal -->
  <div class="modal" v-if="showUpdateModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>软件更新</h3>
        <button class="close-button" @click="closeModal">
          <font-awesome-icon :icon="['fas', 'times']" />
        </button>
      </div>
      <div class="modal-body">
        <div v-if="updateStatus === 'checking'">
          <p>正在检查更新...</p>
          <div class="loading-spinner"></div>
        </div>
        <div v-else-if="updateStatus === 'up-to-date'">
          <p>当前已是最新版本 (V{{ currentVersion }})</p>
        </div>
        <div v-else-if="updateStatus === 'update-available'">
          <p>检测到新版本：</p>
          <div class="version-option" v-if="latestStableVersion">
            <h4>
              <font-awesome-icon :icon="['fas', 'check-circle']" class="version-icon stable" />
              正式版 V{{ latestStableVersion.version }}
            </h4>
            <p class="version-description">{{ latestStableVersion.description }}</p>
            <button class="btn btn-primary" @click="downloadVersion(latestStableVersion)">
              <font-awesome-icon :icon="['fas', 'download']" class="btn-icon-fa" />
              下载正式版
            </button>
          </div>
          <div class="version-option" v-if="latestTestVersion">
            <h4>
              <font-awesome-icon :icon="['fas', 'flask']" class="version-icon test" />
              测试版 V{{ latestTestVersion.version }}
            </h4>
            <p class="version-description">{{ latestTestVersion.description }}</p>
            <button class="btn btn-secondary" @click="downloadVersion(latestTestVersion)">
              <font-awesome-icon :icon="['fas', 'download']" class="btn-icon-fa" />
              下载测试版
            </button>
          </div>
        </div>
        <div v-else-if="updateStatus === 'downloading'">
          <p>正在准备下载 V{{ downloadingVersion }}...</p>
        </div>
        <div v-else-if="updateStatus === 'error'">
          <p>检查更新时发生错误：{{ errorMessage }}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Version Selector Modal -->
  <div class="modal" v-if="showVersionSelectorModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>选择下载版本</h3>
        <button class="close-button" @click="closeModal">
          <font-awesome-icon :icon="['fas', 'times']" />
        </button>
      </div>
      <div class="modal-body">
        <div v-if="versionList.length === 0">
          <p>正在加载版本信息...</p>
          <div class="loading-spinner"></div>
        </div>
        <div v-else>
          <div class="os-selector">
            <label>选择操作系统：</label>
            <select v-model="selectedOS">
              <option value="windows">Windows</option>
              <option value="linux">Linux</option>
              <option value="mac">macOS</option>
              <option value="android">Android</option>
            </select>
          </div>
          
          <div class="version-list">
            <div v-for="(version, index) in versionList" :key="index" class="version-item">
              <div class="version-header">
                <h4>
                  <font-awesome-icon 
                    :icon="['fas', isTestVersion(version.version) ? 'flask' : 'check-circle']" 
                    :class="['version-icon', isTestVersion(version.version) ? 'test' : 'stable']" 
                  />
                  V{{ version.version }}
                </h4>
                <span class="version-tag" v-if="isTestVersion(version.version)">测试版</span>
                <span class="version-tag stable" v-else>正式版</span>
              </div>
              <p class="version-description">{{ version.description }}</p>
              <button class="btn btn-primary" @click="downloadVersion(version)">
                <font-awesome-icon :icon="['fas', 'download']" class="btn-icon-fa" />
                下载此版本
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>


<script>
export default {
  name: 'About',
  emits: ['showMessage'],
  data() {
    return {
      currentVersion: '1.0.5',
      versionList: [],
      showUpdateModal: false,
      showVersionSelectorModal: false,
      updateStatus: '',
      errorMessage: '',
      latestStableVersion: null,
      latestTestVersion: null,
      downloadingVersion: '',
      selectedOS: this.detectOS(),
    };
  },
  methods: {
    openUrl(url) {
      // Open URL in a new tab
      // Added window.location.origin for local paths like /docs
      const targetUrl = url.startsWith('/') ? window.location.origin + url : url;
      window.open(targetUrl, '_blank');
    },
    
    // 检测当前操作系统
    detectOS() {
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (userAgent.indexOf('windows') !== -1) return 'windows';
      if (userAgent.indexOf('mac') !== -1) return 'mac';
      if (userAgent.indexOf('linux') !== -1 && userAgent.indexOf('android') === -1) return 'linux';
      if (userAgent.indexOf('android') !== -1) return 'android';
      
      // 默认返回 windows
      return 'windows';
    },
    
    // 获取版本信息
    async fetchVersionInfo() {
      try {
        const response = await fetch('https://r2.qqframe.cn/aigal/version_web.json');
        if (!response.ok) {
          throw new Error('无法获取版本信息');
        }
        return await response.json();
      } catch (error) {
        console.error('获取版本信息失败：', error);
        this.errorMessage = error.message;
        this.updateStatus = 'error';
        return [];
      }
    },
    
    // 检查更新
    async checkForUpdates() {
      this.showUpdateModal = true;
      this.updateStatus = 'checking';
      
      try {
        const versions = await this.fetchVersionInfo();
        
        if (versions.length === 0) {
          this.updateStatus = 'error';
          this.errorMessage = '没有找到版本信息';
          return;
        }
        
        // 分离正式版和测试版
        const stableVersions = versions.filter(v => !this.isTestVersion(v.version));
        const testVersions = versions.filter(v => this.isTestVersion(v.version));
        
        // 找出最新的正式版和测试版
        this.latestStableVersion = this.findLatestVersion(stableVersions);
        this.latestTestVersion = this.findLatestVersion(testVersions);
        
        // 决定是否需要更新
        const needsUpdate = 
          (this.latestStableVersion && this.compareVersions(this.latestStableVersion.version, this.currentVersion) > 0) ||
          (this.latestTestVersion && this.compareVersions(this.latestTestVersion.version.replace('t', ''), this.currentVersion) > 0);
        
        this.updateStatus = needsUpdate ? 'update-available' : 'up-to-date';
        
      } catch (error) {
        console.error('检查更新失败：', error);
        this.updateStatus = 'error';
        this.errorMessage = error.message;
      }
    },
    
    // 显示版本选择器
    async showVersionSelector() {
      this.showVersionSelectorModal = true;
      this.versionList = [];
      
      try {
        const versions = await this.fetchVersionInfo();
        // 按版本号排序（降序）
        this.versionList = versions.sort((a, b) => 
          this.compareVersions(b.version.replace('t', ''), a.version.replace('t', ''))
        );
      } catch (error) {
        console.error('获取版本列表失败：', error);
      }
    },
    
    // 下载指定版本
    downloadVersion(version) {
      this.downloadingVersion = version.version;
      this.updateStatus = 'downloading';
      
      // 根据所选操作系统确定下载链接
      const osMap = {
        'windows': 'url_windows',
        'linux': 'url_linux',
        'mac': 'url_mac',
        'android': 'url_android'
      };
      
      const downloadUrl = version[osMap[this.selectedOS]];
      
      if (downloadUrl) {
        // 执行下载操作
        window.open(downloadUrl, '_blank');
        
        // 延迟关闭模态框
        setTimeout(() => {
          this.closeModal();
        }, 1000);
      } else {
        this.errorMessage = `没有找到适用于 ${this.selectedOS} 的下载链接`;
        this.updateStatus = 'error';
      }
    },
    
    // 关闭所有模态框
    closeModal() {
      this.showUpdateModal = false;
      this.showVersionSelectorModal = false;
      this.updateStatus = '';
    },
    
    // 判断是否为测试版本
    isTestVersion(version) {
      return version.startsWith('t');
    },
    
    // 查找最新版本
    findLatestVersion(versions) {
      if (versions.length === 0) return null;
      
      return versions.reduce((latest, current) => {
        const latestVersion = latest.version.replace('t', '');
        const currentVersion = current.version.replace('t', '');
        
        return this.compareVersions(currentVersion, latestVersion) > 0 ? current : latest;
      }, versions[0]);
    },
    
    // 版本号比较
    compareVersions(v1, v2) {
      // 移除前缀 't' (if any)
      v1 = v1.replace(/^t/, '');
      v2 = v2.replace(/^t/, '');
      
      const parts1 = v1.split('.').map(Number);
      const parts2 = v2.split('.').map(Number);
      
      const maxLength = Math.max(parts1.length, parts2.length);
      
      for (let i = 0; i < maxLength; i++) {
        const p1 = parts1[i] || 0; // Treat missing parts as 0
        const p2 = parts2[i] || 0;
        
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
      }
      
      return 0; // Versions are equal
    }
  }
};
</script>

<style scoped>
.about-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Arial', sans-serif;
  color: var(--text-primary, #333);
  background-color: var(--content-bg, #f9f9f9);
  border-radius: 12px;
  box-shadow: var(--shadow, 0 2px 12px rgba(0, 0, 0, 0.1));
  transition: all 0.3s ease;
  position: relative; /* For modal positioning */
}

/* Title Section */
.title-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.5rem;
}

.logo-title {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.app-logo {
  font-size: 3rem;
  margin-right: 1rem;
  background-color: var(--hover-bg, #f1f5f9);
  border-radius: 50%;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.app-logo svg {
    color: var(--primary-color);
    width: 0.8em;
    height: 0.8em;
}

.app-title {
  font-size: 2rem;
  font-weight: bold;
  color: var(--text-primary, #4a4a4a);
  margin: 0;
  background: linear-gradient(to right, var(--primary-color, #4f46e5), #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.version-info {
  font-size: 0.9rem;
  color: var(--text-secondary, #666);
  margin-left: 4.5rem;
  padding: 0.3rem 0.7rem;
  background-color: var(--hover-bg, #f5f5f5);
  border-radius: 20px;
  display: inline-block;
  max-width: fit-content;
}

.divider {
  height: 1px;
  background-color: var(--border-color, #e0e0e0);
  margin: 1.5rem 0;
}

/* Update Section - NEW */
.update-section {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1rem 0;
}

/* Content Section */
.content-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.card {
  background-color: var(--content-bg, white);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  border: 1px solid var(--border-color, #e0e0e0);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.card-title {
  font-size: 1.2rem;
  padding: 1rem 1.5rem;
  margin: 0;
  background-color: var(--hover-bg, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-primary, #4a4a4a);
  display: flex;
  align-items: center;
}

.card-icon-fa {
  margin-right: 0.5rem;
  font-size: 1.2rem;
  vertical-align: middle;
}

.card-content {
  padding: 1.5rem;
  display: flex; /* Use flexbox for the content to stack rows */
  flex-direction: column; /* Stack rows vertically */
  gap: 1rem; /* Add space between action rows */
}

.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* margin-bottom removed, using gap in card-content instead */
}

.action-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--text-primary, #4a4a4a);
  font-size: 1.1rem;
}

.description {
  margin-bottom: 1.5rem;
  line-height: 1.6;
  color: var(--text-primary, #4a4a4a);
  font-size: 1.05rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1rem;
  background-color: var(--hover-bg, #f5f5f5);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.feature-item:hover {
  background-color: var(--border-color, #e0e0e0);
}

.feature-icon-fa {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  color: var(--primary-color);
}

.feature-text {
  color: var(--text-primary, #4a4a4a);
  font-weight: 500;
}

.copyright {
  font-size: 0.9rem;
  color: var(--text-secondary, #999);
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e0e0e0);
  margin-top: 1.5rem;
}

/* Footer Section */
.footer-section {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.2rem;
  background-color: var(--content-bg, #fff);
  color: var(--text-primary, #4a4a4a);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background-color: var(--hover-bg, #f5f5f5);
  border-color: var(--border-color, #ccc);
}

.btn-icon-fa {
    font-size: 1em;
    vertical-align: middle;
}

.btn-primary {
  background-color: var(--primary-color, #4f46e5);
  color: var(--active-text, white);
  border: none;
}

.btn-primary:hover {
  background-color: var(--primary-hover, #4338ca);
  transform: translateY(-2px);
}

.btn-secondary {
  background-color: var(--secondary-color, #64748b);
  color: var(--active-text, white);
  border: none;
}

.btn-secondary:hover {
  background-color: var(--secondary-hover, #475569);
  transform: translateY(-2px);
}

.btn-link {
  background-color: transparent;
  border: none;
  color: var(--primary-color, #0066cc);
  padding: 0.5rem 0.8rem;
}

.btn-link:hover {
   background-color: rgba(79, 70, 229, 0.05);
  text-decoration: underline;
}

/* Modal - NEW */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--content-bg, white);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  background-color: var(--hover-bg, #f5f5f5);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary, #333);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-secondary, #666);
}

.close-button:hover {
  color: var(--text-primary, #333);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  max-height: calc(90vh - 70px);
}

/* Version Options - NEW */
.version-option {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  background-color: var(--hover-bg, #f8f9fa);
}

.version-option h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.version-icon {
  font-size: 1rem;
}

.version-icon.stable {
  color: #10b981; /* Green */
}

.version-icon.test {
  color: #f59e0b; /* Amber */
}

.version-description {
  margin-bottom: 1rem;
  white-space: pre-line;
  font-size: 0.95rem;
  color: var(--text-secondary, #666);
}

/* Loading Spinner - NEW */
.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 1rem auto;
  border: 4px solid var(--hover-bg, #f3f4f6);
  border-top: 4px solid var(--primary-color, #4f46e5);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Version List - NEW */
.version-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.version-item {
  padding: 1rem;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  background-color: var(--hover-bg, #f8f9fa);
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.version-tag {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 20px;
  background-color: #f59e0b;
  color: white;
}

.version-tag.stable {
  background-color: #10b981;
}

/* OS Selector - NEW */
.os-selector {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.os-selector select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-color, #ddd);
  background-color: var(--content-bg, white);
  color: var(--text-primary, #333);
  font-size: 0.95rem;
}

/* For small screens */
@media (max-width: 600px) {
  .about-container {
    padding: 1rem;
  }

  .app-logo {
    font-size: 2.5rem;
    width: 55px;
    height: 55px;
    margin-right: 0.7rem;
  }
  .app-logo svg {
    width: 0.7em;
    height: 0.7em;
  }

  .app-title {
    font-size: 1.5rem;
  }

  .version-info {
    margin-left: 3.2rem;
    font-size: 0.85rem;
  }

  .divider {
    margin: 1rem 0;
  }

  .update-section {
    flex-direction: column;
    gap: 0.5rem;
  }

  .content-section {
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .card-title {
    padding: 0.8rem 1rem;
    font-size: 1.1rem;
  }

  .card-icon-fa {
    font-size: 1.1rem;
  }

  .card-content {
    padding: 1rem;
    gap: 0.8rem; /* Adjust gap for smaller screens */
  }

  .description {
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .action-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.8rem; /* Gap between label and button when stacked */
  }

  .action-label {
    font-size: 1rem;
  }

  .btn {
    width: 100%;
    justify-content: center;
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }

  .btn-icon-fa {
    font-size: 1em;
  }

  .features {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.8rem;
    margin-bottom: 1rem;
  }

  .feature-item {
    padding: 0.8rem;
  }

  .feature-icon-fa {
    font-size: 1.5rem;
  }

  .feature-text {
    font-size: 0.9rem;
  }

  .copyright {
    font-size: 0.85rem;
    padding-top: 0.8rem;
    margin-top: 1rem;
  }

  .footer-section {
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.8rem;
    margin-top: 0.8rem;
  }

  .btn-link {
    padding: 0.4rem 0.6rem;
    font-size: 0.9rem;
  }

  /* Modal adjustments for small screens */
  .modal-content {
    width: 95%;
    max-height: 95vh;
  }

  .modal-header {
    padding: 0.8rem 1rem;
  }

  .modal-body {
    padding: 1rem;
  }

  .version-option {
    padding: 0.8rem;
  }

  .version-item {
    padding: 0.8rem;
  }
}
</style>