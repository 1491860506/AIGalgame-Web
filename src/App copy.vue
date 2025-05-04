<template>
  <div id="app">
    <div class="sidebar">
      <div class="logo">
        <img src="@/assets/window_icon.png" alt="Logo" />
        <h1>AI Galgame生成</h1>
      </div>
      <nav>
        <ul>
          <li>
            <router-link to="/" :class="{ active: $route.path === '/' }">
              <!-- <i class="fas fa-home"></i> -->
              <font-awesome-icon :icon="['fas', 'home']" />
              <span>首页</span>
            </router-link>
          </li>
          <li>
            <router-link to="/llm-config" :class="{ active: $route.path === '/llm-config' }">
              <!-- <i class="fas fa-brain"></i> -->
              <font-awesome-icon :icon="['fas', 'brain']" />
              <span>LLM 配置</span>
            </router-link>
          </li>
          <li>
            <router-link to="/voice-config" :class="{ active: $route.path === '/voice-config' }">
              <!-- <i class="fas fa-microphone"></i> -->
              <font-awesome-icon :icon="['fas', 'microphone']" />
              <span>语音配置</span>
            </router-link>
          </li>
          <li>
            <router-link to="/ai-drawing-config" :class="{ active: $route.path === '/ai-drawing-config' }">
              <!-- <i class="fas fa-paint-brush"></i> -->
              <font-awesome-icon :icon="['fas', 'paint-brush']" />
              <span>AI 绘画配置</span>
            </router-link>
          </li>
          <li>
            <router-link to="/ai-music-config" :class="{ active: $route.path === '/ai-music-config' }">
              <!-- <i class="fas fa-music"></i> -->
              <font-awesome-icon :icon="['fas', 'music']" />
              <span>AI 音乐配置</span>
            </router-link>
          </li>
          <li>
            <router-link to="/snapshot" :class="{ active: $route.path === '/snapshot' }">
              <!-- <i class="fas fa-camera"></i> -->
              <font-awesome-icon :icon="['fas', 'camera']" />
              <span>快照</span>
            </router-link>
          </li>
          <li>
            <router-link to="/logs" :class="{ active: $route.path === '/logs' }">
              <!-- <i class="fas fa-clipboard-list"></i> -->
              <font-awesome-icon :icon="['fas', 'clipboard-list']" />
              <span>日志</span>
            </router-link>
          </li>
          <li>
            <router-link to="/manage" :class="{ active: $route.path === '/manage' }">
              <!-- <i class="fas fa-magic"></i> -->
              <font-awesome-icon :icon="['fas', 'magic']" />
              <span>管理</span>
            </router-link>
          </li>
          <li>
            <router-link to="/about" :class="{ active: $route.path === '/about' }">
              <!-- <i class="fas fa-info-circle"></i> -->
              <font-awesome-icon :icon="['fas', 'info-circle']" />
              <span>关于</span>
            </router-link>
          </li>
        </ul>
      </nav>
      <div class="sidebar-footer">
        <div class="theme-toggle-container">
          <button class="theme-toggle" @click="toggleTheme">
            <!-- <i :class="isDarkMode ? 'fas fa-sun' : 'fas fa-moon'"></i> -->
            <font-awesome-icon :icon="['fas', isDarkMode ? 'sun' : 'moon']" />
            <span>{{ isDarkMode ? '亮色模式' : '深色模式' }}</span>
          </button>
        </div>

        <div class="data-actions">
          <button class="action-btn" @click="exportConfig" title="导出配置">
            <!-- <i class="fas fa-download"></i> -->
            <font-awesome-icon :icon="['fas', 'download']" />
            <span>导出配置</span>
          </button>
          <input
            type="file"
            ref="fileInput"
            style="display: none"
            accept=".json"
            @change="importConfig"
          />
          <button class="action-btn" @click="triggerFileInput" title="导入配置">
            <!-- <i class="fas fa-upload"></i> -->
            <font-awesome-icon :icon="['fas', 'upload']" />
            <span>导入配置</span>
          </button>
        </div>
        <span class="version">v1.0.5</span>
      </div>
    </div>

    <div class="main-content">
      <div class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" @show-message="showMessageBubble" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script>
import { useToast } from 'vue-toastification';



const toast = useToast(); // 获取全局 toast 实例

export default {
  data() {
    return {
      isDarkMode: false,
    };
  },
  methods: {
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode;
      document.body.classList.toggle('dark-theme', this.isDarkMode);
    },
    // 导出 aiGalgameConfig 数据到 JSON 文件
    exportConfig() {
      try {
        // 仅获取 aiGalgameConfig 数据
        const configData = localStorage.getItem('aiGalgameConfig');
        
        if (!configData) {
          this.showMessageBubble({ title: 'error', message: '没有找到配置数据' });
          return;
        }

        // 创建 JSON 文件
        const blob = new Blob([configData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // 创建下载链接并触发下载
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-galgame-config-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();

        // 清理
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);

        this.showMessageBubble({ title: 'success', message: '配置导出成功' });
      } catch (error) {
        console.error('导出配置失败:', error);
        this.showMessageBubble({ title: 'error', message: '导出配置失败' });
      }
    },
    // 触发文件选择对话框
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    // 从 JSON 文件导入 aiGalgameConfig
    importConfig(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      // 验证 JSON 格式
      const jsonData = e.target.result;
      const importData = JSON.parse(jsonData); // 检查是否为有效的 JSON
      
      // 获取当前配置
      let currentConfig = {};
      try {
        const currentConfigData = localStorage.getItem('aiGalgameConfig');
        if (currentConfigData) {
          currentConfig = JSON.parse(currentConfigData);
        }
      } catch (error) {
        console.error('获取当前配置失败:', error);
        currentConfig = {};
      }
      
      // 创建导入选择对话框
      const keys = Object.keys(importData);
      if (keys.length === 0) {
        this.showMessageBubble({ title: 'error', message: '导入文件没有有效的配置项' });
        return;
      }
      
      // 构建选择对话框
      const selectDiv = document.createElement('div');
      selectDiv.style.position = 'fixed';
      selectDiv.style.top = '50%';
      selectDiv.style.left = '50%';
      selectDiv.style.transform = 'translate(-50%, -50%)';
      selectDiv.style.backgroundColor = 'var(--content-bg)';
      selectDiv.style.padding = '20px';
      selectDiv.style.borderRadius = '8px';
      selectDiv.style.boxShadow = 'var(--shadow)';
      selectDiv.style.zIndex = '1000';
      selectDiv.style.maxWidth = '400px';
      selectDiv.style.width = '90%';
      
      const title = document.createElement('h3');
      title.textContent = '选择要导入的配置项';
      title.style.marginBottom = '15px';
      title.style.color = 'var(--text-primary)';
      selectDiv.appendChild(title);
      
      // 全选按钮
      const allContainer = document.createElement('div');
      allContainer.style.marginBottom = '10px';
      
      const allCheckbox = document.createElement('input');
      allCheckbox.type = 'checkbox';
      allCheckbox.id = 'select-all';
      allCheckbox.checked = true;
      allCheckbox.style.marginRight = '8px';
      
      const allLabel = document.createElement('label');
      allLabel.htmlFor = 'select-all';
      allLabel.textContent = '全选';
      allLabel.style.color = 'var(--text-primary)';
      
      allContainer.appendChild(allCheckbox);
      allContainer.appendChild(allLabel);
      selectDiv.appendChild(allContainer);
      
      // 分隔线
      const divider = document.createElement('hr');
      divider.style.margin = '10px 0';
      divider.style.border = 'none';
      divider.style.borderTop = '1px solid var(--border-color)';
      selectDiv.appendChild(divider);
      
      // 创建各个配置项的复选框
      const checkboxes = {};
      
      keys.forEach(key => {
        const container = document.createElement('div');
        container.style.marginBottom = '8px';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `select-${key}`;
        checkbox.checked = true;
        checkbox.style.marginRight = '8px';
        checkboxes[key] = checkbox;
        
        const label = document.createElement('label');
        label.htmlFor = `select-${key}`;
        label.textContent = key;
        label.style.color = 'var(--text-primary)';
        
        container.appendChild(checkbox);
        container.appendChild(label);
        selectDiv.appendChild(container);
      });
      
      // 全选/取消全选功能
      allCheckbox.addEventListener('change', () => {
        for (const key in checkboxes) {
          checkboxes[key].checked = allCheckbox.checked;
        }
      });
      
      // 按钮区域
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'flex-end';
      buttonContainer.style.marginTop = '20px';
      buttonContainer.style.gap = '10px';
      
      const cancelButton = document.createElement('button');
      cancelButton.textContent = '取消';
      cancelButton.style.padding = '8px 16px';
      cancelButton.style.backgroundColor = 'var(--btn-bg)';
      cancelButton.style.color = 'var(--text-secondary)';
      cancelButton.style.border = 'none';
      cancelButton.style.borderRadius = '4px';
      cancelButton.style.cursor = 'pointer';
      
      const confirmButton = document.createElement('button');
      confirmButton.textContent = '确认导入';
      confirmButton.style.padding = '8px 16px';
      confirmButton.style.backgroundColor = 'var(--primary-color)';
      confirmButton.style.color = 'white';
      confirmButton.style.border = 'none';
      confirmButton.style.borderRadius = '4px';
      confirmButton.style.cursor = 'pointer';
      
      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(confirmButton);
      selectDiv.appendChild(buttonContainer);
      
      document.body.appendChild(selectDiv);
      
      // 取消按钮事件
      cancelButton.addEventListener('click', () => {
        document.body.removeChild(selectDiv);
      });
      
      // 确认按钮事件
      confirmButton.addEventListener('click', () => {
        try {
          // 根据选择合并配置
          for (const key in checkboxes) {
            if (checkboxes[key].checked && importData[key] !== undefined) {
              currentConfig[key] = importData[key];
            }
          }
          
          // 保存到 localStorage
          localStorage.setItem('aiGalgameConfig', JSON.stringify(currentConfig));
          
          this.showMessageBubble({ title: 'success', message: '配置导入成功' });
        } catch (error) {
          console.error('合并配置失败:', error);
          this.showMessageBubble({ title: 'error', message: '导入配置失败: ' + error.message });
        }
        
        document.body.removeChild(selectDiv);
      });
    } catch (error) {
      console.error('导入配置失败:', error);
      this.showMessageBubble({ title: 'error', message: '导入配置失败: 无效的JSON格式' });
    }
  };

  reader.readAsText(file);
  // 重置文件输入，以便可以重复导入相同的文件
  event.target.value = '';
},
    // 显示通知提示
    showMessageBubble(arg) {
      if (arg.title === 'success') {
        toast.success(arg.message);
      } else if (arg.title === 'error') {
        toast.error(arg.message);
      } else {
        toast.warning(arg.message);
      }
    }
  },
  mounted() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      document.body.classList.add('dark-theme');
    }
  },
  watch: {
    isDarkMode(newVal) {
      localStorage.setItem('theme', newVal ? 'dark' : 'light');
    }
  }
};


</script>

<style>
/* Global styles */
:root {
  --primary-color: #4f46e5;
  --primary-hover: #aca5ef;
  --sidebar-bg: #f8fafc;
  --content-bg: #ffffff;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  --active-bg: #4f46e5;
  --active-text: #ffffff;
  --hover-bg: #f1f5f9;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --header-height: 70px;
  --sidebar-width: 250px;
  --transition-speed: 0.3s;
  --success-color: #10b981;
  --error-color: #ef4444;
  --btn-bg: #e2e8f0;
  --btn-hover-bg: #cbd5e1;
}

/* Dark theme variables */
body.dark-theme {
  --sidebar-bg: #0f172a;
  --content-bg: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --border-color: #334155;
  --hover-bg: #334155;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.4);
  --btn-bg: #334155;
  --btn-hover-bg: #475569;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
}

body {
  background-color: var(--content-bg);
  color: var(--text-primary);
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

/* App layout */
#app {
  display: flex;
  min-height: 100vh;
  position: relative;
}

/* Sidebar styles - fixed position */
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background-color: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: all var(--transition-speed);
  box-shadow: var(--shadow);
  z-index: 10;
  position: fixed;
  left: 0;
  top: 0;
}

.logo {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.logo img {
  width: 32px;
  height: 32px;
  margin-right: 10px;
}

.logo h1 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--primary-color);
}

.sidebar nav {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
}

.sidebar ul {
  list-style: none;
  padding: 0 0.5rem;
}

.sidebar li {
  margin-bottom: 0.5rem;
}

.sidebar a {
  display: flex;
  align-items: center;
  padding: 0.575rem 1rem;
  text-decoration: none;
  color: var(--text-secondary);
  border-radius: 0.5rem;
  transition: all var(--transition-speed);
  font-weight: 500;
}

.sidebar a:hover {
  background-color: var(--hover-bg);
  color: var(--text-primary);
}

.sidebar a.active {
  background-color: var(--active-bg);
  color: var(--active-text);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.sidebar a i {
  font-size: 1.2rem;
  margin-right: 0.875rem;
  width: 24px;
  text-align: center;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.theme-toggle-container {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.theme-toggle {
  background: var(--btn-bg);
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition-speed);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  width: 100%;
}

.theme-toggle:hover {
  background-color: var(--btn-hover-bg);
  color: var(--primary-color);
}

.data-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.action-btn {
  background: var(--btn-bg);
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all var(--transition-speed);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
}

.action-btn:hover {
  background-color: var(--btn-hover-bg);
  color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.version {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
  margin-top: 5px;
}

/* Main content area - adjusted to accommodate fixed sidebar */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--content-bg);
  transition: background-color var(--transition-speed);
  margin-left: var(--sidebar-width); /* Offset content by sidebar width */
  width: calc(100% - var(--sidebar-width));
}

/* Content area */
.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background-color: var(--content-bg);
  transition: background-color var(--transition-speed);
}

/* Notification styles */
.app-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  background-color: var(--sidebar-bg);
  color: var(--text-primary);
  box-shadow: var(--shadow);
  z-index: 1000;
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.3s ease;
  max-width: 300px;
}

.app-notification.success {
  border-left: 4px solid var(--success-color);
}

.app-notification.error {
  border-left: 4px solid var(--error-color);
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Media queries for responsiveness */
@media (max-width: 768px) {
  .sidebar {
    width: 70px;
    overflow: hidden;
  }

  .sidebar .logo h1,
  .sidebar a span,
  .theme-toggle span,
  .action-btn span {
    display: none;
  }
  /* Adjust icon margin when text is hidden */
  .sidebar a svg {
     margin-right: 0;
  }

  .main-content {
    margin-left: 70px;
    width: calc(100% - 70px);
  }

  .sidebar-footer {
    padding: 0.5rem;
  }

  .data-actions {
    flex-direction: column;
  }
  .action-btn svg { /* Remove gap when text is hidden */
     margin-right: 0;
     gap: 0;
  }

  .theme-toggle, .action-btn {
    padding: 10px;
    justify-content: center;
  }
   .theme-toggle svg { /* Remove gap when text is hidden */
     margin-right: 0;
     gap: 0;
   }

  .version {
    display: none;
  }
}
</style>