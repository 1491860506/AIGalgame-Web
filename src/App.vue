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
      selectDiv.classList.add('import-dialog');
    selectDiv.style.position = 'fixed';
    selectDiv.style.top = '50%';
    selectDiv.style.left = '50%';
    selectDiv.style.transform = 'translate(-50%, -50%)';
    selectDiv.style.zIndex = '1000';
    selectDiv.style.width = '90%'; // Responsive width
      
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
          cancelButton.onmouseenter = () => cancelButton.style.backgroundColor = 'var(--hover-overlay)';
    cancelButton.onmouseleave = () => cancelButton.style.backgroundColor = 'transparent';

      const confirmButton = document.createElement('button');
      confirmButton.textContent = '确认导入';
      confirmButton.style.padding = '8px 16px';
      confirmButton.style.backgroundColor = 'var(--primary-color)';
      confirmButton.style.color = 'white';
      confirmButton.style.border = 'none';
      confirmButton.style.borderRadius = '4px';
      confirmButton.style.cursor = 'pointer';
          confirmButton.onmouseenter = () => confirmButton.style.backgroundColor = 'var(--primary-dark)';
    confirmButton.onmouseleave = () => confirmButton.style.backgroundColor = 'var(--primary-color)';

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

/* 全局布局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--background-color);
  color: var(--text-primary);
  line-height: 1.6;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

#app {
  display: flex;
  min-height: 100vh;
}

/* 侧边栏样式 */
.sidebar {
  width: 260px;
  min-width: 260px;
  background-color: var(--surface-color);
  box-shadow: 0 0 10px var(--shadow-color);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  border-right: 1px solid var(--border-color);
  transition: all var(--transition-speed);
}

/* Logo区域 */
.sidebar .logo {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border-bottom: 1px solid var(--border-color);
}

.sidebar .logo img {
  width: 64px;
  height: 64px;
  margin-bottom: 10px;
}

.sidebar .logo h1 {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  color: var(--primary-color);
  text-align: center;
}

/* 导航菜单 */
.sidebar nav {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.sidebar nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar nav li {
  margin: -5px 0;
}

.sidebar nav a {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-speed);
  border-left: 3px solid transparent;
}

.sidebar nav a svg,
.sidebar nav a .icon {
  margin-right: 12px;
  width: 20px;
  height: 20px;
}

.sidebar nav a:hover {
  background-color: var(--hover-overlay);
  color: var(--text-primary);
}

.sidebar nav a.active {
  background-color: var(--hover-overlay);
  color: var(--primary-color);
  border-left-color: var(--primary-color);
  font-weight: 500;
}

/* 侧边栏底部 */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.theme-toggle-container {
  margin-bottom: 16px;
}

.theme-toggle {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-speed);
}

.theme-toggle:hover {
  background-color: var(--hover-overlay);
  color: var(--text-primary);
}

.theme-toggle svg,
.theme-toggle .icon {
  margin-right: 8px;
}

.dark-theme .theme-toggle {
  color: var(--text-primary);
}

/* 数据操作按钮 */
.data-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.action-btn {
  flex: 1;
  padding: 8px;
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-speed);
}

.action-btn:first-child {
  margin-right: 8px;
}

.action-btn:hover {
  background-color: var(--hover-overlay);
  color: var(--text-primary);
}

.action-btn svg,
.action-btn .icon {
  margin-right: 6px;
}

.version {
  display: block;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.8rem;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  margin-left: 260px; /* 同侧边栏宽度 */
  padding: 24px;
  transition: all var(--transition-speed);
}

.content {
  max-width: 1200px;
  margin: 0 auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  
  .sidebar.show {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0;
  }
}
/* 基础变量 - 会被主题覆盖 */
:root {
  /* 主色系 */
  --primary-color: #3498db;
  --primary-light: #5dade2;
  --primary-dark: #2980b9;
  --secondary-color: #2ecc71;
  --secondary-light: #58d68d;
  --secondary-dark: #27ae60;
  --danger-color: #e74c3c;
  --danger-light: #ec7063;
  --danger-dark: #c0392b;
  --warning-color: #f39c12;
  --warning-light: #f5b041;
  --warning-dark: #d35400;
  --info-color: #9b59b6;
  --info-light: #af7ac5;
  --info-dark: #8e44ad;
  
  /* 中性色系 */
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --border-color: #e0e0e0;
  --background-color: #ffffff;
  --surface-color: #f9f9f9;
  --hover-overlay: rgba(0, 0, 0, 0.05);
  --shadow-color: rgba(0, 0, 0, 0.1);
  
  /* 动画参数 */
  --transition-speed: 0.3s;
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --box-shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 深色模式 */
.dark-theme {
  /* 主色系调整 */
  --primary-color: #4dabf7;
  --primary-light: #74c0fc;
  --primary-dark: #3b8fd2;
  --secondary-color: #40c057;
  --secondary-light: #69db7c;
  --secondary-dark: #2f9e44;
  --danger-color: #fa5252;
  --danger-light: #ff8787;
  --danger-dark: #e03131;
  --warning-color: #fcc419;
  --warning-light: #ffda3d;
  --warning-dark: #e6b800;
  --info-color: #ae81ff;
  --info-light: #bf9eff;
  --info-dark: #9b6dff;
  
  /* 中性色系反转 */
  --text-primary: #e1e1e1;
  --text-secondary: #b0b0b0;
  --text-tertiary: #777777;
  --border-color: #444444;
  --background-color: #121212;
  --surface-color: #1e1e1e;
  --hover-overlay: rgba(255, 255, 255, 0.05);
  --shadow-color: rgba(0, 0, 0, 0.3);
}

/* ------------ 组件样式 ------------ */

/* 按钮基础样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: var(--border-radius-md);
  font-weight: 500;
  transition: all var(--transition-speed);
  border: none;
  cursor: pointer;
  text-align: center;
  gap: 8px;
}

.btn svg,
.btn .icon {
  font-size: 1em;
}

/* 主要按钮 */
.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-dark);
  box-shadow: var(--box-shadow-hover);
}

/* 次要按钮 */
.btn-secondary {
  background-color: var(--secondary-color);
  color: white;
}

.btn-secondary:hover {
  background-color: var(--secondary-dark);
  box-shadow: var(--box-shadow-hover);
}

/* 危险按钮 */
.btn-danger {
  background-color: var(--danger-color);
  color: white;
}

.btn-danger:hover {
  background-color: var(--danger-dark);
  box-shadow: var(--box-shadow-hover);
}

/* 提示按钮 */
.btn-info {
  background-color: var(--info-color);
  color: white;
}

.btn-info:hover {
  background-color: var(--info-dark);
  box-shadow: var(--box-shadow-hover);
}

/* 警告按钮 */
.btn-warning {
  background-color: var(--warning-color);
  color: white;
}

.btn-warning:hover {
  background-color: var(--warning-dark);
  box-shadow: var(--box-shadow-hover);
}

/* 轮廓按钮 */
.btn-outline {
  background-color: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
}

.btn-outline:hover {
  background-color: var(--primary-color);
  color: white;
}

/* 文本按钮 */
.btn-text {
  background-color: transparent;
  color: var(--primary-color);
  padding: 6px 8px;
}

.btn-text:hover {
  background-color: var(--hover-overlay);
}

/* 按钮尺寸 */
.btn-sm {
  padding: 4px 12px;
  font-size: 0.85rem;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 1.1rem;
}

/* 禁用按钮 */
.btn[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

/* 输入框样式 */
.input-group {
  position: relative;
  margin-bottom: 1rem;
}

.input {
  width: 100%;
  padding: 10px 16px;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-primary);
  transition: all var(--transition-speed);
  outline: none;
  font-size: 0.95rem;
}

.input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb, 52, 152, 219), 0.2);
}

.input::placeholder {
  color: var(--text-tertiary);
}

.dark-theme .input {
  background-color: var(--surface-color);
}

/* 输入框标签 */
.input-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 选择框/下拉菜单 */
.select {
  appearance: none;
  width: 100%;
  padding: 10px 16px;
  padding-right: 36px;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-primary);
  transition: all var(--transition-speed);
  outline: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
}

.dark-theme .select {
  background-color: var(--surface-color);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ccc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
}

.select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb, 52, 152, 219), 0.2);
}

/* 开关 */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: .4s;
  border-radius: 24px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .switch-slider {
  background-color: var(--primary-color);
}

input:focus + .switch-slider {
  box-shadow: 0 0 1px var(--primary-color);
}

input:checked + .switch-slider:before {
  transform: translateX(26px);
}

/* 复选框 */
.checkbox-input {
  position: absolute;
  opacity: 0;
}

.checkbox-label {
  position: relative;
  padding-left: 26px;
  cursor: pointer;
  display: inline-block;
  line-height: 20px;
}

.checkbox-label:before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--background-color);
  transition: all var(--transition-speed);
}

.checkbox-input:checked + .checkbox-label:before {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-input:checked + .checkbox-label:after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* 卡片样式 */
.card {
  background-color: var(--surface-color);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--box-shadow);
  padding: 20px;
  margin-bottom: 20px;
  transition: box-shadow var(--transition-speed);
}

.card:hover {
  box-shadow: var(--box-shadow-hover);
}

/* 徽章样式 */
.badge {
  display: inline-block;
  padding: 3px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 20px;
  background-color: var(--primary-light);
  color: white;
}

.badge-secondary {
  background-color: var(--secondary-light);
}

.badge-danger {
  background-color: var(--danger-light);
}

.badge-warning {
  background-color: var(--warning-light);
  color: var(--text-primary);
}

.badge-info {
  background-color: var(--info-light);
}

/* 导入分隔框样式 */
.import-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--background-color);
  border-radius: var(--border-radius-lg);
  padding: 24px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 24px var(--shadow-color);
  z-index: 1000;
}

.import-dialog h3 {
  margin-top: 0;
  color: var(--text-primary);
}

.import-dialog-item {
  margin: 12px 0;
  display: flex;
  align-items: center;
}

.import-dialog-divider {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 16px 0;
}

.import-dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-speed);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Tooltip Styles */
.tooltip-container {
  position: relative;
  /* cursor: help; -- Moved to switch-label-container */
}

.tooltip-text {
  visibility: hidden;
  width: 200px;
  background-color: var(--text-primary);
  color: var(--background-color);
  text-align: center;
  border-radius: var(--border-radius-sm);
  padding: 5px 8px;
  position: absolute;
  z-index: 1;
  bottom: 125%; /* Position above the label */
  left: 100%;
  margin-left: -100px; /* Center the tooltip */
  opacity: 0;
  transition: opacity 0.3s;
  font-size: 0.8rem;
  font-weight: normal; /* Reset font weight */
  pointer-events: none; /* Do not interfere with mouse events */
}

/* Arrow */
.tooltip-text::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: var(--text-primary) transparent transparent transparent;
}

.tooltip-container:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}
.dark-theme .tooltip-text {
    background-color: var(--surface-color);
    color: var(--text-primary);
}
.dark-theme .tooltip-text::after {
    border-top-color: var(--surface-color);
}

/*按钮*/
.close-btn {
  background: var(--hover-bg); /* Use variable */
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary); /* Use variable */
  font-size: 16px; /* Controls icon size */
  transition: all 0.3s ease;
}

.close-btn:hover {
  background-color: rgba(var(--error-color-rgb, 239, 68, 68), 0.1); /* Use variable/rgba */
  color: #ef4444; /* Keep red for close button */
  transform: rotate(90deg);
}

.import-dialog {
  position: fixed; /* Keep for clarity, JS also sets it */
  top: 50%; /* Keep for clarity */
  left: 50%; /* Keep for clarity */
  transform: translate(-50%, -50%); /* Keep for clarity */
  
  background-color: var(--surface-color); /* MODIFIED: Use surface-color for a card-like appearance */
  border-radius: var(--border-radius-md); /* MODIFIED: Use md radius (e.g., 8px) */
  padding: 20px; /* MODIFIED: Adjust padding */
  width: 90%; /* Keep for clarity, ensures responsiveness */
  max-width: 400px; /* MODIFIED: Adjust max-width */
  box-shadow: var(--box-shadow); /* MODIFIED: Use standard card box-shadow */
  z-index: 1000; /* Keep for clarity */
  color: var(--text-primary); /* Ensures text color is appropriate for the background */
}

/* Optional: If you want to control more styles of inner elements via CSS,
   you would assign classes in JS and define them here.
   For example, if buttons were given .btn and .btn-primary classes in JS:
.import-dialog .btn { ... }
.import-dialog .btn-primary { ... }
   The JS changes above for buttons are minimal inline fixes.
*/

/* Styles for elements within .import-dialog that are created by JS */
/* These styles are mostly already set inline by the JS, but having them in CSS can be a fallback or override if JS changes */
.import-dialog h3 {
  margin-top: 0;
  color: var(--text-primary); /* Matches JS inline style */
  margin-bottom: 15px; /* Matches JS inline style */
}

.import-dialog-item { /* This class is not explicitly added in the provided JS for item containers but would be good practice */
  margin: 8px 0; /* Matches JS implied margin for checkbox containers */
  display: flex;
  align-items: center;
}

.import-dialog .checkbox-label { /* Assuming labels next to checkboxes could use this if structured so */
    color: var(--text-primary); /* Matches JS inline style for labels */
    margin-left: 8px; /* Corresponds to checkbox.style.marginRight */
}

.import-dialog-divider { /* Matches JS created divider styling */
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 10px 0;
}

.import-dialog-buttons { /* Matches JS created button container styling */
  display: flex;
  justify-content: flex-end;
  gap: 10px; /* Matches JS (was 10px in original code, 12px in CSS example) */
  margin-top: 20px;
}
</style>