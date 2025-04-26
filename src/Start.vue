<template>
  <div class="start-container">
    <h1>故事生成</h1>

    <!-- 加载指示器 -->
    <div v-if="isLoading" class="loading-indicator">
      <div class="spinner"></div>
      <span>正在处理中，请稍候...</span>
    </div>

    <!-- 实时进度显示区域 - 更紧凑美化版本 -->
    <div class="progress-status-container" v-if="isLoading || showCompletionMessage">
      <div class="progress-header">
        <h2>实时进度</h2>
        <!-- 显示总体耗时 -->
        <div class="progress-time">
          <i class="time-icon"></i> {{ formatElapsedTime(elapsedTime) }} ({{ formatTime(currentTimeDate) }})
        </div>
      </div>
      
      <!-- 进度状态表格 -->
      <table class="progress-table">
        <tbody>
          <tr>
            <td class="task-name">大纲:</td>
            <td class="task-progress">
              <div class="progress-bar" 
                   :class="{'success': taskTimeState.outline.status === 'success', 
                           'failed': taskTimeState.outline.status === 'failed',
                           'processing': taskTimeState.outline.status === 'processing'}">
                <div class="progress-fill" 
                     :style="{width: computeProgressWidth(progressState.outline.progress)}"></div>
              </div>
              <div class="progress-value">{{ progressState.outline.progress }}</div>
            </td>
            <td class="task-status" :class="statusClass(taskTimeState.outline.status)">
              {{ statusText(taskTimeState.outline.status) }}
              <span v-if="progressState.outline.title"> - {{ progressState.outline.title }}</span>
            </td>
            <td class="task-time">{{ formatElapsedTime(taskTimeState.outline.elapsedTime) }}</td>
          </tr>
          <tr>
            <td class="task-name">故事文本:</td>
            <td class="task-progress">
              <div class="progress-bar"
                   :class="{'success': taskTimeState.story.status === 'success', 
                           'failed': taskTimeState.story.status === 'failed',
                           'processing': taskTimeState.story.status === 'processing'}">
                <div class="progress-fill" 
                     :style="{width: computeProgressWidth(progressState.story.progress)}"></div>
              </div>
              <div class="progress-value">{{ progressState.story.progress }}</div>
            </td>
            <td class="task-status" :class="statusClass(taskTimeState.story.status)">
              {{ statusText(taskTimeState.story.status) }}
            </td>
            <td class="task-time">{{ formatElapsedTime(taskTimeState.story.elapsedTime) }}</td>
          </tr>
          <tr>
            <td class="task-name">音乐:</td>
            <td class="task-progress">
              <div class="progress-bar"
                   :class="{'success': taskTimeState.music.status === 'success', 
                           'failed': taskTimeState.music.status === 'failed',
                           'disabled': !progressState.music.enabled,
                           'processing': taskTimeState.music.status === 'processing'}">
                <div class="progress-fill" 
                     :style="{width: computeProgressWidth(progressState.music.progress)}"></div>
              </div>
              <div class="progress-value">{{ progressState.music.progress }}</div>
            </td>
            <td class="task-status" :class="statusClass(taskTimeState.music.status, !progressState.music.enabled)">
              {{ !progressState.music.enabled ? '已禁用' : statusText(taskTimeState.music.status) }}
            </td>
            <td class="task-time">{{ formatElapsedTime(taskTimeState.music.elapsedTime) }}</td>
          </tr>
          <tr>
            <td class="task-name">图片-标题:</td>
            <td class="task-progress">
              <div class="progress-bar"
                   :class="{'success': taskTimeState.imageTitle.status === 'success', 
                           'failed': taskTimeState.imageTitle.status === 'failed',
                           'processing': taskTimeState.imageTitle.status === 'processing'}">
                <div class="progress-fill" 
                     :style="{width: computeProgressWidth(progressState.imageTitle.progress)}"></div>
              </div>
              <div class="progress-value">{{ progressState.imageTitle.progress }}</div>
            </td>
            <td class="task-status" :class="statusClass(taskTimeState.imageTitle.status)">
              {{ statusText(taskTimeState.imageTitle.status) }}
            </td>
            <td class="task-time">{{ formatElapsedTime(taskTimeState.imageTitle.elapsedTime) }}</td>
          </tr>
          <tr>
            <td class="task-name">图片-角色:</td>
            <td class="task-progress">
              <div class="progress-bar"
                   :class="{'success': taskTimeState.imageCharacter.status === 'success', 
                           'failed': taskTimeState.imageCharacter.status === 'failed',
                           'processing': taskTimeState.imageCharacter.status === 'processing'}">
                <div class="progress-fill" 
                     :style="{width: computeProgressWidth(progressState.imageCharacter.progress)}"></div>
              </div>
              <div class="progress-value">{{ progressState.imageCharacter.progress }}</div>
            </td>
            <td class="task-status" :class="statusClass(taskTimeState.imageCharacter.status)">
              {{ statusText(taskTimeState.imageCharacter.status) }}
            </td>
            <td class="task-time">{{ formatElapsedTime(taskTimeState.imageCharacter.elapsedTime) }}</td>
          </tr>
          <tr>
            <td class="task-name">图片-背景:</td>
            <td class="task-progress">
              <div class="progress-bar"
                   :class="{'success': taskTimeState.imageBackground.status === 'success', 
                           'failed': taskTimeState.imageBackground.status === 'failed',
                           'processing': taskTimeState.imageBackground.status === 'processing'}">
                <div class="progress-fill" 
                     :style="{width: computeProgressWidth(progressState.imageBackground.progress)}"></div>
              </div>
              <div class="progress-value">{{ progressState.imageBackground.progress }}</div>
            </td>
            <td class="task-status" :class="statusClass(taskTimeState.imageBackground.status)">
              {{ statusText(taskTimeState.imageBackground.status) }}
            </td>
            <td class="task-time">{{ formatElapsedTime(taskTimeState.imageBackground.elapsedTime) }}</td>
          </tr>
          <tr>
            <td class="task-name">语音:</td>
            <td class="task-progress">
              <div class="progress-bar"
                   :class="{'success': taskTimeState.voice.status === 'success', 
                           'failed': taskTimeState.voice.status === 'failed',
                           'processing': taskTimeState.voice.status === 'processing'}">
                <div class="progress-fill" 
                     :style="{width: computeProgressWidth(progressState.voice.progress)}"></div>
              </div>
              <div class="progress-value">{{ progressState.voice.progress }}</div>
            </td>
            <td class="task-status" :class="statusClass(taskTimeState.voice.status)">
              {{ statusText(taskTimeState.voice.status) }}
            </td>
            <td class="task-time">{{ formatElapsedTime(taskTimeState.voice.elapsedTime) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 进度日志区域 -->
    <div class="progress-log-container">
      <h2>进度日志:</h2>
      <div class="progress-log" ref="logContainer">{{ formattedLog }}</div>
    </div>

    <!-- 消息气泡通知 (替代页面跳转) -->
    <div class="toast-container" v-if="toastMessage.show">
      <div class="toast-message" :class="toastMessage.type">
        <div class="toast-icon" v-if="toastMessage.type === 'success'">✓</div>
        <div class="toast-icon" v-else-if="toastMessage.type === 'error'">✕</div>
        <div class="toast-icon" v-else>!</div>
        <div class="toast-content">
          <div class="toast-title">{{ toastMessage.title }}</div>
          <div class="toast-body">{{ toastMessage.text }}</div>
          <div v-if="toastMessage.countdown > 0" class="toast-countdown">
            {{ toastMessage.countdown }}秒后{{ toastMessage.action }}...
          </div>
        </div>
        <button class="toast-close" @click="closeToast">×</button>
      </div>
    </div>

    <!-- 初始检查消息 -->
    <div v-if="initialCheckMessage" class="initial-check-message">
      {{ initialCheckMessage }}
    </div>
    
    <!-- 错误消息显示 -->
    <div v-if="errorMessage" class="error-message">
      <div class="error-icon">!</div>
      <div class="error-content">
        <h3>发生错误</h3>
        <p>{{ errorMessage }}</p>
      </div>
    </div>
    
    <!-- 调试信息 - 可以在生产环境移除 -->
    <div v-if="debugMode" class="debug-info">
      <h3>调试信息</h3>
      <p>跳转状态: {{ navigationAttempted ? '已尝试' : '未尝试' }}</p>
      <p>倒计时完成: {{ countdownComplete ? '是' : '否' }}</p>
      <button @click="performManualNavigation" class="debug-button">手动跳转</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted, reactive, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useStoryGenerator } from './components/services/useStoryGenerator'; // Adjust path as needed
import * as idbFs from './components/services/IndexedDBFileSystem'; // Adjust path as needed

const router = useRouter();
const { isLoading, progressLog, generateNewStory, generateLocalStory } = useStoryGenerator();
const initialCheckMessage = ref(''); // Message for initial checks
const logContainer = ref(null);
const errorMessage = ref(''); // Error message storage
const debugMode = ref(false); // Set to true to show debug information
const navigationAttempted = ref(false); // Track navigation attempts
const countdownComplete = ref(false); // Track if countdown finished

// --- Toast Notification System ---
const toastMessage = reactive({
  show: false,
  type: 'info', // 'info', 'success', 'warning', 'error'
  title: '',
  text: '',
  countdown: 0,
  action: '跳转',
  timer: null
});

// Show toast notification
function showToast(title, text, type = 'info', countdown = 0, action = '跳转') {
  // Clear existing toast and timer
  if (toastMessage.timer) clearInterval(toastMessage.timer);
  
  // Set new toast properties
  Object.assign(toastMessage, {
    show: true,
    type,
    title,
    text,
    countdown,
    action
  });
  
  // Start countdown if needed
  if (countdown > 0) {
    toastMessage.timer = setInterval(() => {
      toastMessage.countdown--;
      if (toastMessage.countdown <= 0) {
        clearInterval(toastMessage.timer);
        countdownComplete.value = true;
        // If this is a success notification, we'll navigate
        if (type === 'success' && action === '跳转') {
          performNavigation();
        }
      }
    }, 1000);
  }
}

// Function to handle navigation
function performNavigation() {
  console.log("Attempting navigation to /webgal/index.html");
  navigationAttempted.value = true;
  
  // Try multiple navigation methods for better browser compatibility
  try {
    // Method 1: Direct location change
    window.location.href = '/webgal/index.html';
    
    // Method 2: After a short delay, try replace if the first method didn't work
    setTimeout(() => {
      if (document.location.href.indexOf('/webgal/index.html') === -1) {
        console.log("Trying location.replace method");
        window.location.replace('/webgal/index.html');
      }
    }, 100);
  } catch (error) {
    console.error("Navigation error:", error);
    errorMessage.value = `跳转失败: ${error.message}`;
  }
}

// For debugging - manual navigation button
function performManualNavigation() {
  performNavigation();
}

// Close toast manually
function closeToast() {
  if (toastMessage.timer) {
    clearInterval(toastMessage.timer);
  }
  toastMessage.show = false;
}

// --- Real-time Progress State ---
const progressState = reactive({
  outline: { title: '', status: 'pending', progress: '0/1' }, // 'pending', 'success', 'failed'
  story: { status: 'pending', progress: '0/1' },
  music: { status: 'pending', progress: '0/1', enabled: true }, 
  imageTitle: { status: 'pending', progress: '0/0' },
  imageCharacter: { status: 'pending', progress: '0/0' },
  imageBackground: { status: 'pending', progress: '0/0' },
  voice: { status: 'pending', progress: '0/0' }
});

// --- Time Tracking System ---
// Basic overall timing
const startTime = ref(null); // Timestamp when processing starts
const elapsedTime = ref(0); // Overall elapsed time in milliseconds
const currentTimeDate = ref(new Date()); // For the clock display
const updateTimer = ref(null); // Combined timer for clock and elapsed time

// Per-task timing system (tracks when each task starts/ends)
const taskTimeState = reactive({
  outline: { 
    startTime: null, 
    endTime: null, 
    elapsedTime: null, 
    status: 'pending' // 'pending', 'processing', 'success', 'failed'
  },
  story: { 
    startTime: null, 
    endTime: null, 
    elapsedTime: null, 
    status: 'pending'
  },
  music: { 
    startTime: null, 
    endTime: null, 
    elapsedTime: null, 
    status: 'pending'
  },
  imageTitle: { 
    startTime: null, 
    endTime: null, 
    elapsedTime: null, 
    status: 'pending'
  },
  imageCharacter: { 
    startTime: null, 
    endTime: null, 
    elapsedTime: null, 
    status: 'pending'
  },
  imageBackground: { 
    startTime: null, 
    endTime: null, 
    elapsedTime: null, 
    status: 'pending'
  },
  voice: { 
    startTime: null, 
    endTime: null, 
    elapsedTime: null, 
    status: 'pending'
  }
});

// Helper function to start task timer
function startTaskTimer(taskKey) {
  if (taskTimeState[taskKey].status === 'pending') {
    taskTimeState[taskKey].startTime = Date.now();
    taskTimeState[taskKey].status = 'processing';
    updateTaskElapsedTime(taskKey);
  }
}

// Helper function to end task timer
function endTaskTimer(taskKey, status = 'success') {
  if (taskTimeState[taskKey].startTime && taskTimeState[taskKey].status === 'processing') {
    taskTimeState[taskKey].endTime = Date.now();
    taskTimeState[taskKey].status = status;
    updateTaskElapsedTime(taskKey);
    
    // If it's an image task and completed successfully, ensure progress is complete
    if (status === 'success' && (taskKey === 'imageTitle' || taskKey === 'imageCharacter' || taskKey === 'imageBackground')) {
      updateImageProgressToComplete(taskKey);
    }
  }
}

// Update image progress to complete when successful
function updateImageProgressToComplete(taskKey) {
  const taskProgress = progressState[taskKey].progress;
  if (taskProgress) {
    const parts = taskProgress.split('/');
    if (parts.length === 2 && parts[1] !== '0') {
      progressState[taskKey].progress = `${parts[1]}/${parts[1]}`;
    } else {
      // If we don't have a valid denominator, set it to a default of 1
      progressState[taskKey].progress = '1/1';
    }
  } else {
    progressState[taskKey].progress = '1/1';
  }
}

// Update task elapsed time (called from timer)
function updateTaskElapsedTime(taskKey) {
  const task = taskTimeState[taskKey];
  
  if (task.startTime) {
    const endPoint = task.endTime || Date.now();
    task.elapsedTime = endPoint - task.startTime;
  }
}

// Update all active task timers
function updateAllTaskTimers() {
  Object.keys(taskTimeState).forEach(key => {
    if (taskTimeState[key].startTime && !taskTimeState[key].endTime) {
      updateTaskElapsedTime(key);
    }
  });
}

// --- Helper Functions ---

// Format current time (HH:MM:SS)
function formatTime(date) {
  if (!date) return '00:00:00';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Format elapsed time (MM:SS or HH:MM:SS)
function formatElapsedTime(ms) {
  if (ms === null || ms === undefined || ms < 0) return '--:--';
  
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Compute progress bar width percentage
function computeProgressWidth(progress) {
  if (!progress || progress === '0/0') return '0%';
  
  const parts = progress.split('/');
  if (parts.length !== 2) return '0%';
  
  const current = parseInt(parts[0], 10);
  const total = parseInt(parts[1], 10);
  
  if (isNaN(current) || isNaN(total) || total === 0) return '0%';
  
  return `${Math.min(100, Math.max(0, (current / total) * 100))}%`;
}

// Get status class for styling
function statusClass(status, disabled = false) {
  if (disabled) return 'status-disabled';
  
  switch (status) {
    case 'success': return 'status-success';
    case 'failed': return 'status-failed';
    case 'processing': return 'status-processing';
    default: return 'status-pending';
  }
}

// Get status display text
function statusText(status) {
  switch (status) {
    case 'success': return '已完成';
    case 'failed': return '失败';
    case 'processing': return '进行中';
    default: return '待处理';
  }
}

// Start timer for clock and elapsed time
function startUpdateTimer() {
  if (updateTimer.value) clearInterval(updateTimer.value); // Clear existing

  // Set start time if not already set
  if (!startTime.value) {
    startTime.value = Date.now();
    
    // Start outline timer immediately when page loads (fixed issue #2)
    startTaskTimer('outline');
  }

  updateTimer.value = setInterval(() => {
    currentTimeDate.value = new Date(); // Update clock time
    
    if (startTime.value) {
      elapsedTime.value = Date.now() - startTime.value; // Update overall elapsed time
    }
    
    // Update all active task timers
    updateAllTaskTimers();
  }, 1000);
}

// Stop timer
function stopUpdateTimer() {
  if (updateTimer.value) {
    clearInterval(updateTimer.value);
    updateTimer.value = null;
  }
}

// Mark all items as completed (used when marker file doesn't exist)
function markAllItemsAsCompleted() {
  // Update progress state
  Object.keys(progressState).forEach(key => {
    if (key === 'music' && !progressState[key].enabled) {
      progressState[key].status = 'disabled';
    } else {
      const match = progressState[key].progress.match(/\d+\/(\d+)/);
      const total = match ? match[1] : '1';
      progressState[key].status = 'success';
      progressState[key].progress = `${total}/${total}`;
    }
  });
  
  // Update time tracking
  const completionTime = Date.now();
  Object.keys(taskTimeState).forEach(key => {
    // Make sure outline timer starts from page load, not from completion time
    if (!taskTimeState[key].startTime) {
      taskTimeState[key].startTime = key === 'outline' ? startTime.value : completionTime - 1000;
    }
    taskTimeState[key].endTime = completionTime;
    taskTimeState[key].status = key === 'music' && !progressState.music.enabled ? 'disabled' : 'success';
    updateTaskElapsedTime(key);
  });
}

// --- Log Parsing Logic ---
function parseLogAndUpdateProgress() {
  // We need to identify when each step starts/ends for timing

  progressLog.value.forEach((line, index) => {
    // 1. Outline
    let match = line.match(/获取到故事标题:\s*(.*)/);
    if (match && progressState.outline.status !== 'success') {
      progressState.outline.title = match[1].trim();
      progressState.outline.status = 'success';
      progressState.outline.progress = '1/1';
      
      // End outline timer and start music timer
      endTaskTimer('outline', 'success');
      startTaskTimer('music');
      startTaskTimer('imageTitle');
      startTaskTimer('imageCharacter');
    }

    // 2. Story Text
    if (line.includes('生成故事开篇') && taskTimeState.story.status === 'pending') {
      startTaskTimer('story');
    }
    
    if (line.includes('故事开篇完成') && progressState.story.status !== 'success') {
      progressState.story.status = 'success';
      progressState.story.progress = '1/1';
      
      // End story timer
      endTaskTimer('story', 'success');
      
      // Start image timers after story is complete
      
      startTaskTimer('imageBackground');
      startTaskTimer('voice');
    }

    // 3. Music
    if (line.includes('背景音乐已禁用') && progressState.music.enabled) {
      progressState.music.status = 'disabled';
      progressState.music.enabled = false;
      progressState.music.progress = '0/1';
      
      // End music timer as disabled
      endTaskTimer('music', 'disabled');
    } else if (line.includes('背景音乐生成失败') && progressState.music.status !== 'failed' && progressState.music.enabled) {
      progressState.music.status = 'failed';
      progressState.music.progress = '0/1';
      
      // End music timer as failed
      endTaskTimer('music', 'failed');
    } else if (line.includes('下载并保存音乐文件') && progressState.music.status !== 'success' && progressState.music.enabled) {
      progressState.music.status = 'success';
      progressState.music.progress = '1/1';
      
      // End music timer as success
      endTaskTimer('music', 'success');
    }

    // 4. Images (Title, Character, Background)
    match = line.match(/(title|character|background)\s+Progress:\s*(\d+)\/(\d+)/i);
    if (match) {
      const kind = match[1].toLowerCase();
      const current = parseInt(match[2], 10);
      const total = parseInt(match[3], 10);
      const stateKey = `image${kind.charAt(0).toUpperCase() + kind.slice(1)}`;
      if (progressState[stateKey]) {
        progressState[stateKey].progress = `${current}/${total}`;
      }
    }

    match = line.match(/(title|character|background)\s+Main model manager exhausted/i);
    if (match) {
      const kind = match[1].toLowerCase();
      const stateKey = `image${kind.charAt(0).toUpperCase() + kind.slice(1)}`;
      if (progressState[stateKey] && progressState[stateKey].status !== 'failed') {
        progressState[stateKey].status = 'failed';
        
        // End image timer as failed
        endTaskTimer(stateKey, 'failed');
      }
    }

    match = line.match(/(title|character|background)\s+All\s+(\d+)\s+tasks completed normally/i);
    if (match) {
      const kind = match[1].toLowerCase();
      const totalTasks = parseInt(match[2], 10);
      const stateKey = `image${kind.charAt(0).toUpperCase() + kind.slice(1)}`;
      if (progressState[stateKey] && progressState[stateKey].status !== 'success') {
        progressLog.value.push(`${kind} Progress: ${totalTasks}/${totalTasks}. `);
        progressState[stateKey].progress = `${totalTasks}/${totalTasks}`;
        progressState[stateKey].status = 'success';
        
        
        // End image timer as success
        endTaskTimer(stateKey, 'success');
      }
    }

    // 5. Voice
    match = line.match(/处理 ID\s+(\d+)\s+\((\d+)\/(\d+)\)/);
    if (match) {
      const current = parseInt(match[1], 10);
      const total = parseInt(match[3], 10);
      if (progressState.voice.status === 'pending' || progressState.voice.status === 'processing') {
        progressState.voice.progress = `${current}/${total}`;
        progressState.voice.status = 'processing';
        
        if (current === total) {
          progressState.voice.status = 'success';
          
          // End voice timer as success
          endTaskTimer('voice', 'success');
        }
      }
    }
    
    // Additional voice checks
    if (line.includes('语音合成完成') && progressState.voice.status !== 'success') {
      progressState.voice.status = 'success';
      const parts = progressState.voice.progress.split('/');
      if (parts.length === 2) {
        progressState.voice.progress = `${parts[1]}/${parts[1]}`;
      }
      endTaskTimer('voice', 'success');
    }
    
    if (line.includes('语音合成失败') && progressState.voice.status !== 'failed') {
      progressState.voice.status = 'failed';
      endTaskTimer('voice', 'failed');
    }
  });
}


// --- Computed Properties ---

// Formatted log for display
const formattedLog = computed(() => {
  return progressLog.value.join('\n');
});

// --- Watchers ---

// Watch for changes in isLoading to start/stop timer and reset state
watch(isLoading, (newIsLoading) => {
  if (newIsLoading) {
    // Reset progress state when loading starts (optional)
    startTime.value = Date.now(); // Record start time
    elapsedTime.value = 0; // Reset elapsed time
    startUpdateTimer(); // Start clock and elapsed timer
  } else {
    // Loading finished
    if (startTime.value) { // Ensure elapsed time is calculated one last time
      elapsedTime.value = Date.now() - startTime.value;
    }
    // Don't stop the timer yet - we'll keep it running so the user can see the final times
  }
});

// Watch log changes to parse progress and scroll log view
watch(() => progressLog.value.length, () => {
  // Parse logs to update the reactive progressState
  parseLogAndUpdateProgress();

  // Auto-scroll log container
  if (logContainer.value) {
    setTimeout(() => {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }, 10); // Short delay to allow DOM update
  }
});

// --- Lifecycle Hooks ---

onMounted(async () => {
  console.log("Start.vue onMounted: Starting initial checks...");
  progressLog.value.push("开始检查配置和文件...");

  // Start timer immediately for the clock and outline task
  startTime.value = Date.now();
  startUpdateTimer();
  startTaskTimer('outline'); // Start outline timer from page load (fix for issue #2)

  try {
    const config = loadConfig();
    const storyTitle = config?.剧情?.story_title;

    if (storyTitle) {
      await idbFs.writeFile('/data/test/title.txt',storyTitle);
      progressLog.value.push(`发现故事标题: ${storyTitle}`);
      const zwPath = `/data/${storyTitle}/zw`;
      progressLog.value.push(`检查标记文件: ${zwPath}...`);

      let zwExists = false;
      try {
        const metadata = await idbFs.getMetadata(zwPath);
        zwExists = metadata.exists && !metadata.isFolder;
        progressLog.value.push(zwExists ? `标记文件存在.` : `标记文件不存在.`);
      } catch (e) {
        progressLog.value.push(`检查标记文件时出错: ${e.message}`);
        console.warn(`Error checking metadata for ${zwPath}:`, e);
        zwExists = false;
      }

      if (zwExists) {
        // Scenario ①: story_title exists, zw file exists -> Run localstory
        progressLog.value.push("调用本地故事生成...");
        // isLoading will be set true by useStoryGenerator
        const result = await generateLocalStory(); // This sets isLoading=true then false
        progressLog.value.push(`本地故事生成结果: ${result}`);
        // isLoading should be false now
      } else {
        // Scenario ②: story_title exists, zw file does NOT exist -> Do nothing, navigate
        progressLog.value.push("标记文件不存在，无需生成操作。");
        initialCheckMessage.value = `故事 '${storyTitle}' 已存在无需重新处理。`;
        isLoading.value = false; // Ensure loading indicator is off
        
        // Mark all items as completed if we're skipping generation
        markAllItemsAsCompleted();
        
        // End outline timer since we found a title
        if (taskTimeState.outline.status === 'processing') {
          endTaskTimer('outline', 'success');
        }
        
        // Show toast notification instead of redirecting
        await nextTick();
        showToast(
          '已存在的故事', 
          `故事 '${storyTitle}' 已存在，无需重新生成。`, 
          'success', 
          2, 
          '跳转'
        );
        
        return; // Prevent executing further code
      }
    } else {
      // Scenario ③: story_title does NOT exist -> Run main
      progressLog.value.push("未发现故事标题，调用新故事生成...");
      // isLoading will be set true by useStoryGenerator
      const result = await generateNewStory(); // This sets isLoading=true then false
      progressLog.value.push(`新故事生成结果: ${result}`);
      // isLoading should be false now
    }
  } catch (error) {
    console.error("Start.vue onMounted Error:", error);
    progressLog.value.push(`启动过程中发生严重错误: ${error.message}`);
    
    // Update error state to show in UI
    errorMessage.value = error.message || "未知错误";
    
    isLoading.value = false; // Ensure loading stops on error
    
    // Show error toast instead of redirecting
    showToast('生成错误', `发生错误: ${error.message}`, 'error', 0, '');
    
    return; // Stop further execution
  }

  // This block now runs only after successful generation (Scenario 1 or 3)
  progressLog.value.push("生成处理完成，准备跳转...");
  console.log("Generation complete. Navigating to /webgal/index.html");

  // Ensure isLoading is false before showing final message
  isLoading.value = false;

  // Use the title from the progress state if available
  const finalTitle = progressState.outline.title ? `'${progressState.outline.title}' ` : '';
  
  // Make sure all DOM updates are processed before showing the toast
  await nextTick();
  
  // Show toast notification instead of redirecting
  showToast(
    '生成完成', 
    `故事 ${finalTitle}生成完成！`, 
    'success', 
    2, 
    '跳转'
  );
});

// Cleanup timers on unmount
onUnmounted(() => {
  stopUpdateTimer();
  if (toastMessage.timer) clearInterval(toastMessage.timer);
});

// Helper to load config (keep as is)
const loadConfig = () => {
  try {
    const configStr = localStorage.getItem('aiGalgameConfig');
    return configStr ? JSON.parse(configStr) : {};
  } catch (e) {
    console.error("Config load error in Start.vue:", e);
    return {};
  }
};
</script>

<style scoped>
/* Base container styling */
.start-container {
  padding: 2rem;
  max-width: 950px;
  margin: 0 auto;
  font-family: 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #f9fafc;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  position: relative; /* For absolute positioning of notifications */
}

/* Typography */
h1 {
  font-size: 2.4rem;
  margin-bottom: 1.8rem;
  color: #2c3e50;
  text-align: center;
  position: relative;
  font-weight: 600;
}

h1:after {
  content: '';
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, #3498db, #5c6bc0);
}

h2 {
  color: #2c3e50;
  font-size: 1.4rem;
  margin-bottom: 0.8rem;
  font-weight: 500;
}

/* Loading indicator styling */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0 24px;
  padding: 12px 32px;
  background: linear-gradient(120deg, #e7f5ff, #e3f2fd);
  border-radius: 40px;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15); }
  50% { box-shadow: 0 4px 16px rgba(52, 152, 219, 0.3); }
  100% { box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15); }
}

.loading-indicator span {
  font-size: 1.15rem;
  color: #2980b9;
  margin-left: 16px;
  font-weight: 500;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(52, 152, 219, 0.2);
  border-radius: 50%;
  border-top-color: #3498db;
  animation: spin 1s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Progress status container - enhanced layout */
.progress-status-container {
  width: 95%;
  margin: 20px 0;
  padding: 18px;
  background-color: #ffffff;
  border-left: 5px solid #3498db;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid #edf2f7;
  padding-bottom: 10px;
}

.progress-header h2 {
  margin: 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
}

.progress-time {
  display: flex;
  align-items: center;
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  background-color: #f8f9fa;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 1rem;
  color: #3498db;
  position: relative;
}

.time-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%233498db' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'/%3E%3C/svg%3E");
  background-size: contain;
}

/* Progress table styling */
.progress-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.95rem;
}

.progress-table tr:hover {
  background-color: #f8f9fa;
}

.progress-table td {
  padding: 8px 4px;
  vertical-align: middle;
}

.task-name {
  width: 110px;
  font-weight: 500;
  color: #4a5568;
}

.task-progress {
  width: 180px;
  position: relative;
}

.progress-bar {
  height: 12px;
  background-color: #edf2f7;
  border-radius: 6px;
  overflow: hidden;
  width: 100%;
  position: relative;
}

/* Add progress value display (issue #1 fix) */
.progress-value {
  position: absolute;
  right: 10px;
  top: -2px;
  font-size: 0.8rem;
  color: #718096;
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  background-color: rgba(255, 255, 255, 0.85);
  padding: 0 4px;
  border-radius: 3px;
}

.progress-bar.success .progress-fill {
  background: linear-gradient(90deg, #48bb78, #38a169);
}

.progress-bar.processing .progress-fill {
  background: linear-gradient(90deg, #4299e1, #3182ce);
  animation: progress-pulse 1.5s ease infinite;
}

.progress-bar.failed .progress-fill {
  background: linear-gradient(90deg, #e53e3e, #c53030);
}

.progress-bar.disabled .progress-fill {
  background: linear-gradient(90deg, #a0aec0, #718096);
}

@keyframes progress-pulse {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
  width: 0;
}

.task-status {
  width: 120px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-success {
  color: #38a169;
}

.status-failed {
  color: #e53e3e;
}

.status-processing {
  color: #3182ce;
  animation: blink 1.5s ease infinite;
}

.status-pending {
  color: #a0aec0;
}

.status-disabled {
  color: #718096;
  font-style: italic;
}

@keyframes blink {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

.task-time {
  width: 80px;
  text-align: right;
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  color: #4a5568;
}

/* Progress log styling */
.progress-log-container {
  width: 95%;
  margin: 20px 0;
  padding: 18px;
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.progress-log {
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 250px;
  min-height: 120px;
  overflow-y: auto;
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  font-size: 0.9rem;
  background-color: #f7f9fc;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  color: #4a5568;
  line-height: 1.5;
}

/* Custom scrollbar styles */
.progress-log::-webkit-scrollbar {
  width: 8px;
}
.progress-log::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}
.progress-log::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}
.progress-log::-webkit-scrollbar-thumb:hover {
  background: #718096;
}

/* Toast notification styling */
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000;
  max-width: 400px;
  width: calc(100% - 48px);
  animation: slide-in 0.3s ease;
}

@keyframes slide-in {
  0% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

.toast-message {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  background-color: #fff;
  position: relative;
}

.toast-message.success {
  border-left: 5px solid #38a169;
}

.toast-message.error {
  border-left: 5px solid #e53e3e;
}

.toast-message.warning {
  border-left: 5px solid #ed8936;
}

.toast-message.info {
  border-left: 5px solid #3182ce;
}

.toast-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
  font-weight: bold;
  font-size: 18px;
}

.success .toast-icon {
  background-color: #c6f6d5;
  color: #38a169;
}

.error .toast-icon {
  background-color: #fed7d7;
  color: #e53e3e;
}

.warning .toast-icon {
  background-color: #feebc8;
  color: #ed8936;
}

.info .toast-icon {
  background-color: #bee3f8;
  color: #3182ce;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 4px;
  color: #2d3748;
}

.toast-body {
  color: #4a5568;
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.toast-countdown {
  font-size: 0.8rem;
  color: #718096;
}

.toast-close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #a0aec0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.toast-close:hover {
  background-color: #edf2f7;
  color: #4a5568;
}

/* Initial check message */
.initial-check-message {
  margin: 20px 0;
  font-style: italic;
  color: #4a5568;
  text-align: center;
  background-color: #fffaf0;
  padding: 12px 24px;
  border-radius: 8px;
  border-left: 4px solid #ed8936;
  width: 90%;
}

/* Error message styling */
.error-message {
  width: 90%;
  margin: 20px 0;
  padding: 16px;
  background-color: #fff5f5;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(229, 62, 62, 0.15);
  display: flex;
  align-items: flex-start;
  border-left: 5px solid #e53e3e;
}

.error-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #fed7d7;
  color: #e53e3e;
  font-weight: bold;
  font-size: 22px;
  margin-right: 16px;
  flex-shrink: 0;
}

.error-content {
  flex: 1;
}

.error-content h3 {
  margin: 0 0 8px;
  color: #e53e3e;
  font-size: 1.1rem;
}

.error-content p {
  margin: 0;
  color: #4a5568;
  font-size: 0.95rem;
  line-height: 1.5;
}

/* Debug info panel - can be removed in production */
.debug-info {
  margin: 20px 0;
  padding: 15px;
  background-color: #e2e8f0;
  border-radius: 6px;
  font-family: monospace;
  width: 90%;
  color: #4a5568;
}

.debug-button {
  background-color: #4299e1;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
}

.debug-button:hover {
  background-color: #3182ce;
}
</style>