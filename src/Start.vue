<template>
  <div class="start-container">
    <h1>故事生成</h1>

    <!-- 加载指示器 -->
    <div v-if="isLoading" class="loading-indicator">
      <div class="spinner"></div>
      <span>正在处理中，请稍候...</span>
    </div>

    <!-- Main Display Area (Progress + Logs) -->
    <div class="display-area" v-if="isLoading || showCompletionMessage || errorMessage">
      <!-- Left Panel: Real-time Progress -->
      <div class="progress-panel">
        <div class="progress-status-container">
          <div class="progress-header">
            <h2>实时进度</h2>
            <div class="progress-time">
              <i class="time-icon"></i> {{ formatElapsedTime(elapsedTime) }} ({{ formatTime(currentTimeDate) }})
            </div>
          </div>

          <table class="progress-table">
             <tbody>
               <!-- Outline -->
               <tr>
                 <td class="task-name">大纲:</td>
                 <td class="task-progress">
                   <div class="progress-bar"
                        :class="statusClass(taskTimeState.outline.status)">
                     <div class="progress-fill"
                          :style="{width: computeProgressWidth(progressState.outline.progress)}"></div>
                   </div>
                 </td>
                 <td class="task-status" :class="statusClass(taskTimeState.outline.status)">
                   {{ statusText(taskTimeState.outline.status) }}
                   <span v-if="progressState.outline.title" class="task-detail"> - {{ progressState.outline.title }}</span>
                 </td>
                 <td class="task-time">{{ formatElapsedTime(taskTimeState.outline.elapsedTime) }}</td>
               </tr>
               <!-- Story Text -->
               <tr>
                 <td class="task-name">故事文本:</td>
                 <td class="task-progress">
                   <div class="progress-bar"
                        :class="statusClass(taskTimeState.story.status)">
                     <div class="progress-fill"
                          :style="{width: computeProgressWidth(progressState.story.progress)}"></div>
                   </div>
                 </td>
                 <td class="task-status" :class="statusClass(taskTimeState.story.status)">
                   {{ statusText(taskTimeState.story.status) }}
                 </td>
                 <td class="task-time">{{ formatElapsedTime(taskTimeState.story.elapsedTime) }}</td>
               </tr>
               <!-- Music -->
               <tr>
                 <td class="task-name">音乐:</td>
                 <td class="task-progress">
                   <div class="progress-bar"
                        :class="statusClass(taskTimeState.music.status, !progressState.music.enabled)">
                     <div class="progress-fill"
                          :style="{width: computeProgressWidth(progressState.music.progress)}"></div>
                   </div>
                 </td>
                 <td class="task-status" :class="statusClass(taskTimeState.music.status, !progressState.music.enabled)">
                   {{ !progressState.music.enabled ? '已禁用' : statusText(taskTimeState.music.status) }}
                 </td>
                 <td class="task-time">{{ formatElapsedTime(taskTimeState.music.elapsedTime) }}</td>
               </tr>
               <!-- Image Title -->
               <tr>
                 <td class="task-name">图片-标题:</td>
                 <td class="task-progress">
                    <div class="progress-bar"
                        :class="statusClass(taskTimeState.imageTitle.status)">
                     <div class="progress-fill"
                          :style="{width: computeProgressWidth(progressState.imageTitle.progress)}"></div>
                   </div>
                 </td>
                 <td class="task-status" :class="statusClass(taskTimeState.imageTitle.status)">
                   {{ statusText(taskTimeState.imageTitle.status) }}
                   <span class="task-detail">{{ progressState.imageTitle.progress }}</span>
                 </td>
                 <td class="task-time">{{ formatElapsedTime(taskTimeState.imageTitle.elapsedTime) }}</td>
               </tr>
               <!-- Image Character -->
               <tr>
                 <td class="task-name">图片-角色:</td>
                 <td class="task-progress">
                    <div class="progress-bar"
                        :class="statusClass(taskTimeState.imageCharacter.status)">
                     <div class="progress-fill"
                          :style="{width: computeProgressWidth(progressState.imageCharacter.progress)}"></div>
                   </div>
                 </td>
                 <td class="task-status" :class="statusClass(taskTimeState.imageCharacter.status)">
                   {{ statusText(taskTimeState.imageCharacter.status) }}
                   <span class="task-detail">{{ progressState.imageCharacter.progress }}</span>
                 </td>
                 <td class="task-time">{{ formatElapsedTime(taskTimeState.imageCharacter.elapsedTime) }}</td>
               </tr>
               <!-- Image Background -->
               <tr>
                 <td class="task-name">图片-背景:</td>
                 <td class="task-progress">
                    <div class="progress-bar"
                        :class="statusClass(taskTimeState.imageBackground.status)">
                     <div class="progress-fill"
                          :style="{width: computeProgressWidth(progressState.imageBackground.progress)}"></div>
                   </div>
                 </td>
                 <td class="task-status" :class="statusClass(taskTimeState.imageBackground.status)">
                   {{ statusText(taskTimeState.imageBackground.status) }}
                   <span class="task-detail">{{ progressState.imageBackground.progress }}</span>
                 </td>
                 <td class="task-time">{{ formatElapsedTime(taskTimeState.imageBackground.elapsedTime) }}</td>
               </tr>
               <!-- Voice -->
               <tr>
                 <td class="task-name">语音:</td>
                 <td class="task-progress">
                    <div class="progress-bar" :class="voiceStatusClass">
                     <div class="progress-fill" :style="{width: voiceProgressWidth}"></div>
                   </div>
                 </td>
                 <td class="task-status" :class="voiceStatusClass">
                   {{ voiceStatusText }}
                    <span class="task-detail">
                      ({{ voiceProgressState.success }}/{{ voiceProgressState.failed }}/{{ voiceProgressState.total }})
                      <span v-if="voiceProgressState.concurrency > 0 && voiceProgressState.status === 'processing'"> 并发:{{ voiceProgressState.concurrency }}</span>
                    </span>
                 </td>
                 <td class="task-time">{{ formatElapsedTime(taskTimeState.voice.elapsedTime) }}</td>
               </tr>
             </tbody>
          </table>
        </div>
      </div>

      <!-- Right Panel: Categorized Logs -->
      <div class="log-panel">
        <div class="log-header">
          <h2>进度日志</h2>
          <div class="log-categories">
            <button
              v-for="cat in logCategories"
              :key="cat.key"
              :class="{ active: selectedLogCategory === cat.key }"
              @click="selectedLogCategory = cat.key">
              {{ cat.name }} ({{ categorizedLogs[cat.key].length }})
            </button>
          </div>
        </div>
        <div class="progress-log-container">
          <div class="progress-log" ref="logContainer">
            {{ displayedLogs }}
          </div>
        </div>
      </div>
    </div>

    <!-- Messages and Notifications (remain below the main display area) -->
    <div class="message-area">
      <!-- Toast Notification -->
      <div class="toast-container" v-if="toastMessage.show">
        <!-- Toast content -->
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

      <!-- Initial Check Message -->
      <div v-if="initialCheckMessage && !isLoading" class="initial-check-message">
        {{ initialCheckMessage }}
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="error-message">
          <div class="error-icon">!</div>
          <div class="error-content">
            <h3>发生错误</h3>
            <p>{{ errorMessage }}</p>
          </div>
      </div>

      <!-- Debug Info -->
      <div v-if="debugMode" class="debug-info">
          <h3>调试信息</h3>
          <p>跳转状态: {{ navigationAttempted ? '已尝试' : '未尝试' }}</p>
          <p>倒计时完成: {{ countdownComplete ? '是' : '否' }}</p>
          <button @click="performManualNavigation" class="debug-button">手动跳转</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted, reactive, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useStoryGenerator } from './components/services/useStoryGenerator'; // Adjust path
import * as idbFs from './components/services/IndexedDBFileSystem'; // Adjust path

const router = useRouter();
const { isLoading, progressLog, generateNewStory, generateLocalStory } = useStoryGenerator();
const initialCheckMessage = ref('');
const logContainer = ref(null);
const errorMessage = ref('');
const debugMode = ref(false);
const navigationAttempted = ref(false);
const countdownComplete = ref(false);
const showCompletionMessage = ref(false); // Controls visibility of progress area after completion

// --- Toast Notification System ---
const toastMessage = reactive({ /* ... (keep existing toast logic) ... */
  show: false,
  type: 'info', // 'info', 'success', 'warning', 'error'
  title: '',
  text: '',
  countdown: 0,
  action: '跳转',
  timer: null
});
function showToast(title, text, type = 'info', countdown = 0, action = '跳转') {
  if (toastMessage.timer) clearInterval(toastMessage.timer);
  Object.assign(toastMessage, { show: true, type, title, text, countdown, action });
  if (countdown > 0) {
    toastMessage.timer = setInterval(() => {
      toastMessage.countdown--;
      if (toastMessage.countdown <= 0) {
        clearInterval(toastMessage.timer);
        countdownComplete.value = true;
        if (type === 'success' && action === '跳转') performNavigation();
      }
    }, 1000);
  }
}
function performNavigation() {
  console.log("Attempting navigation to /webgal/index.html");
  navigationAttempted.value = true;
  try {
    window.location.href = '/webgal/index.html';
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
function performManualNavigation() { performNavigation(); }
function closeToast() {
  if (toastMessage.timer) clearInterval(toastMessage.timer);
  toastMessage.show = false;
}

// --- Real-time Progress State (General) ---
const progressState = reactive({
  outline: { title: '', progress: '0/1' },
  story: { progress: '0/1' },
  music: { progress: '0/1', enabled: true },
  imageTitle: { progress: '0/0' },
  imageCharacter: { progress: '0/0' },
  imageBackground: { progress: '0/0' },
  // Note: voice progress is handled separately now in voiceProgressState
});

// --- Detailed Voice Progress State ---
const voiceProgressState = reactive({
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    concurrency: 0,
    status: 'pending', // 'pending', 'processing', 'completed_success', 'completed_failed', 'failed_early'
    startTime: null,
    endTime: null,
    processedIds: new Set() // Track processed IDs to prevent duplicates
});

// --- Time Tracking System ---
const startTime = ref(null);
const elapsedTime = ref(0);
const currentTimeDate = ref(new Date());
const updateTimer = ref(null);

const taskTimeState = reactive({
  outline: { startTime: null, endTime: null, elapsedTime: null, status: 'pending' },
  story: { startTime: null, endTime: null, elapsedTime: null, status: 'pending' },
  music: { startTime: null, endTime: null, elapsedTime: null, status: 'pending' },
  imageTitle: { startTime: null, endTime: null, elapsedTime: null, status: 'pending' },
  imageCharacter: { startTime: null, endTime: null, elapsedTime: null, status: 'pending' },
  imageBackground: { startTime: null, endTime: null, elapsedTime: null, status: 'pending' },
  voice: { startTime: null, endTime: null, elapsedTime: null, status: 'pending' } // Still use this for overall voice task timing
});

function startTaskTimer(taskKey) {
  if (taskTimeState[taskKey].status === 'pending') {
    taskTimeState[taskKey].startTime = Date.now();
    taskTimeState[taskKey].status = 'processing';
    updateTaskElapsedTime(taskKey);
  }
}
function endTaskTimer(taskKey, status = 'success') {
  // Only end if it was actually started and is processing
  if (taskTimeState[taskKey].startTime && taskTimeState[taskKey].status === 'processing') {
    taskTimeState[taskKey].endTime = Date.now();
    taskTimeState[taskKey].status = status; // 'success', 'failed', 'disabled'
    updateTaskElapsedTime(taskKey);

    // Special handling for images on success
    if (status === 'success' && ['imageTitle', 'imageCharacter', 'imageBackground'].includes(taskKey)) {
        updateImageProgressToComplete(taskKey);
    }
  } else if (taskTimeState[taskKey].status === 'pending' && status === 'disabled') {
      // Handle cases like music being disabled before it starts processing
      taskTimeState[taskKey].startTime = taskTimeState[taskKey].startTime || Date.now(); // Set a start time if none
      taskTimeState[taskKey].endTime = Date.now();
      taskTimeState[taskKey].status = status;
      updateTaskElapsedTime(taskKey);
  }
}

function updateImageProgressToComplete(taskKey) {
  const taskProgress = progressState[taskKey].progress;
  const parts = taskProgress.split('/');
  if (parts.length === 2 && parts[1] !== '0') {
    progressState[taskKey].progress = `${parts[1]}/${parts[1]}`;
  } else {
    progressState[taskKey].progress = '1/1'; // Fallback
  }
}
function updateTaskElapsedTime(taskKey) {
  const task = taskTimeState[taskKey];
  if (task.startTime) {
    const endPoint = task.endTime || Date.now();
    task.elapsedTime = endPoint - task.startTime;
  }
}
function updateAllTaskTimers() {
  Object.keys(taskTimeState).forEach(key => {
    if (taskTimeState[key].startTime && !taskTimeState[key].endTime) {
      updateTaskElapsedTime(key);
    }
  });
}

// --- Helper Functions ---
function formatTime(date) { /* ... (keep existing) ... */
  if (!date) return '00:00:00';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
function formatElapsedTime(ms) { /* ... (keep existing) ... */
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

// Compute progress bar width (general)
function computeProgressWidth(progress) {
  if (!progress || typeof progress !== 'string') return '0%';
  const parts = progress.split('/');
  if (parts.length !== 2) return '0%';
  const current = parseInt(parts[0], 10);
  const total = parseInt(parts[1], 10);
  if (isNaN(current) || isNaN(total) || total === 0) return '0%';
  return `${Math.min(100, Math.max(0, (current / total) * 100))}%`;
}

// Get status class (general)
function statusClass(status, disabled = false) {
  if (disabled) return 'status-disabled';
  switch (status) {
    case 'success': return 'status-success';
    case 'failed': return 'status-failed';
    case 'processing': return 'status-processing';
    default: return 'status-pending';
  }
}
// Get status text (general)
function statusText(status) {
  switch (status) {
    case 'success': return '已完成';
    case 'failed': return '失败';
    case 'processing': return '进行中';
    case 'disabled': return '已禁用';
    default: return '待处理';
  }
}

// Start/Stop global timer
function startUpdateTimer() {
  if (updateTimer.value) clearInterval(updateTimer.value);
  if (!startTime.value) {
    startTime.value = Date.now();
  }
  updateTimer.value = setInterval(() => {
    currentTimeDate.value = new Date();
    if (startTime.value) {
      elapsedTime.value = Date.now() - startTime.value;
    }
    updateAllTaskTimers();
  }, 1000);
}
function stopUpdateTimer() {
  if (updateTimer.value) {
    clearInterval(updateTimer.value);
    updateTimer.value = null;
  }
   // Ensure final calculation for all tasks
   updateAllTaskTimers();
}

// --- Log Categorization and Processing ---
const lastProcessedLogIndex = ref(-1);
const categorizedLogs = reactive({
  outlineStory: [],
  voice: [],
  music: [],
  image: [],
  other: [],
});
const logCategories = [
  { key: 'outlineStory', name: '大纲/故事' },
  { key: 'voice', name: '语音' },
  { key: 'music', name: '音乐' },
  { key: 'image', name: '图片' },
  { key: 'other', name: '其他' },
];
const selectedLogCategory = ref('outlineStory'); // Default view

const displayedLogs = computed(() => {
  return categorizedLogs[selectedLogCategory.value].join('\n');
});

// Keywords for classification
const logKeywords = {
  outlineStory: ['正在生成大纲', '获取到故事标题', '正在生成故事开篇', '故事开篇生成失败', '故事开篇完成', '开始生成新故事', '开始准备本地故事', '故事文件'],
  voice: ['语音处理ID', '语音生成失败：', '语音生成结束', '开始生成语音', '语音信息：', '语音生成并发数：', '语音待生成数：', '语音合成完成', '语音合成失败'], // Combined keywords
  music: ['生成音乐：', '生成音乐失败：', '背景音乐已禁用', '背景音乐生成失败', '下载并保存音乐文件'], // Combined keywords
  image: ['AI_draw Error:', 'AI_draw:', '图像生成失败', 'Progress:', 'Main model manager exhausted', 'tasks completed normally', '生成图片'], // Combined keywords + common terms
};

// Function to classify and process a single *new* log line
function classifyAndProcessLogLine(line, index) {
  let category = 'other'; // Default

  // Determine category
  if (logKeywords.voice.some(kw => line.includes(kw))) category = 'voice';
  else if (logKeywords.outlineStory.some(kw => line.includes(kw))) category = 'outlineStory';
  else if (logKeywords.music.some(kw => line.includes(kw))) category = 'music';
  // Image check needs regex from old code too
  else if (logKeywords.image.some(kw => line.includes(kw)) || /(title|character|background)\s+(Progress:|Main model|All\s+\d+\s+tasks)/i.test(line)) category = 'image';

  // Add to categorized log
  // We add a simple index prefix for context, can be removed if not needed
  categorizedLogs[category].push(`[${index + 1}] ${line}`);

  // Call specific update functions based on category
  switch (category) {
    case 'outlineStory':
      updateOutlineStoryProgress(line);
      break;
    case 'voice':
      updateVoiceProgressStateMachine(line);
      break;
    case 'music':
      updateMusicProgress(line);
      break;
    case 'image':
      updateImageProgress(line);
      break;
    // 'other' category usually doesn't trigger state changes
  }
}

// --- Specific Progress Update Functions ---

function updateOutlineStoryProgress(line) {
    let match;
    // Outline Part
    if (line.includes('正在生成大纲') && taskTimeState.outline.status === 'pending') {
        // Timer should have started on mount
    }
    match = line.match(/获取到故事标题:\s*(.*)/);
    if (match && taskTimeState.outline.status !== 'success') {
        progressState.outline.title = match[1].trim();
        progressState.outline.progress = '1/1';
        endTaskTimer('outline', 'success');
        // Trigger dependent tasks
        startTaskTimer('music'); // Music can start after outline
        startTaskTimer('imageTitle'); // Title image depends on title/outline
        startTaskTimer('imageCharacter'); // Character images might depend on outline
    }
    // Story Part
    if (line.includes('正在生成故事开篇') && taskTimeState.story.status === 'pending') {
        startTaskTimer('story');
    }
    if (line.includes('故事开篇完成') && taskTimeState.story.status !== 'success') {
        progressState.story.progress = '1/1';
        endTaskTimer('story', 'success');
        // Trigger dependent tasks
        startTaskTimer('imageBackground'); // Background images after story
        // Voice generation starts after story text is ready
        // The actual trigger for voice processing is "开始生成语音"
    }
    if (line.includes('故事开篇生成失败') && taskTimeState.story.status !== 'failed') {
        progressState.story.progress = '0/1';
        endTaskTimer('story', 'failed');
    }
}

function updateMusicProgress(line) {
    if (line.includes('背景音乐已禁用') && progressState.music.enabled) {
        progressState.music.enabled = false;
        progressState.music.progress = '0/1';
        endTaskTimer('music', 'disabled');
    } else if (line.includes('生成音乐失败') || line.includes('背景音乐生成失败')) {
        if (progressState.music.enabled && taskTimeState.music.status !== 'failed') {
            progressState.music.progress = '0/1';
            endTaskTimer('music', 'failed');
        }
    } else if (line.includes('下载并保存音乐文件')) { // Assuming this means success
         if (progressState.music.enabled && taskTimeState.music.status !== 'success') {
            progressState.music.progress = '1/1';
            endTaskTimer('music', 'success');
         }
    }
}

function updateImageProgress(line) {
    let match;
    // Progress Update (e.g., "title Progress: 1/5")
    match = line.match(/(title|character|background)\s+Progress:\s*(\d+)\/(\d+)/i);
    if (match) {
        const kind = match[1].toLowerCase();
        const current = parseInt(match[2], 10);
        const total = parseInt(match[3], 10);
        const stateKey = `image${kind.charAt(0).toUpperCase() + kind.slice(1)}`;
        if (progressState[stateKey]) {
            progressState[stateKey].progress = `${current}/${total}`;
            // If timer hasn't started, start it now
             if (taskTimeState[stateKey].status === 'pending') {
                 startTaskTimer(stateKey);
             }
        }
    }

    // Failure (e.g., "title Main model manager exhausted")
    match = line.match(/(title|character|background)\s+Main model manager exhausted/i);
    if (match) {
        const kind = match[1].toLowerCase();
        const stateKey = `image${kind.charAt(0).toUpperCase() + kind.slice(1)}`;
        if (progressState[stateKey] && taskTimeState[stateKey].status !== 'failed') {
            // Set progress to reflect failure if possible, otherwise keep last known
            endTaskTimer(stateKey, 'failed');
        }
    }

     // Failure (Generic)
     if (line.includes('图像生成失败') || line.includes('AI_draw Error:')) {
         // Determine which image type failed might be tricky without more context
         // For now, let's assume it could affect any active image task
         ['imageTitle', 'imageCharacter', 'imageBackground'].forEach(stateKey => {
             if (taskTimeState[stateKey].status === 'processing') {
                 endTaskTimer(stateKey, 'failed');
             }
         });
     }


    // Success (e.g., "title All 5 tasks completed normally")
    match = line.match(/(title|character|background)\s+All\s+(\d+)\s+tasks completed normally/i);
    if (match) {
        const kind = match[1].toLowerCase();
        const totalTasks = parseInt(match[2], 10);
        const stateKey = `image${kind.charAt(0).toUpperCase() + kind.slice(1)}`;
        if (progressState[stateKey] && taskTimeState[stateKey].status !== 'success') {
            progressState[stateKey].progress = `${totalTasks}/${totalTasks}`;
            endTaskTimer(stateKey, 'success'); // This will call updateImageProgressToComplete
        }
    }
}

// Voice State Machine Logic
function updateVoiceProgressStateMachine(line) {
    let match;

    // ① Start block
    if (line.includes("开始生成语音")) {
        if (voiceProgressState.status === 'pending') {
            voiceProgressState.status = 'processing';
            voiceProgressState.startTime = Date.now();
            startTaskTimer('voice'); // Start the main voice task timer
        }
    }
    match = line.match(/语音待生成数：(\d+)/);
    if (match && voiceProgressState.total === 0) { // Only set total once
        voiceProgressState.total = parseInt(match[1], 10);
    }
    match = line.match(/语音生成并发数：(\d+)/);
    if (match && voiceProgressState.concurrency === 0) { // Only set concurrency once
        voiceProgressState.concurrency = parseInt(match[1], 10);
    }

    // ② Early failure
    match = line.match(/语音生成失败：(.*)/);
    if (match && voiceProgressState.status === 'processing') {
        voiceProgressState.status = 'failed_early';
        voiceProgressState.endTime = Date.now();
        endTaskTimer('voice', 'failed'); // End main voice task timer as failed
    }

    // ③ Individual results
    match = line.match(/语音处理ID\s+(\d+)\s+成功/);
    if (match && voiceProgressState.status === 'processing') {
        const id = match[1];
        if (!voiceProgressState.processedIds.has(id)) {
            voiceProgressState.processedIds.add(id);
            voiceProgressState.success++;
        }
    }
    match = line.match(/语音处理ID\s+(\d+)\s+失败(?: 原因：(.*))?/); // Optional reason capture
    if (match && voiceProgressState.status === 'processing') {
        const id = match[1];
        if (!voiceProgressState.processedIds.has(id)) {
            voiceProgressState.processedIds.add(id);
            voiceProgressState.failed++;
        }
    }

    // ④ End block - This overrides intermediate counts
    match = line.match(/语音生成结束，成功数：(\d+)\/失败数：(\d+)\/跳过数：(\d+)/);
    if (match && (voiceProgressState.status === 'processing' || voiceProgressState.status === 'pending')) { // Allow ending even if start msg missed
        voiceProgressState.success = parseInt(match[1], 10);
        voiceProgressState.failed = parseInt(match[2], 10);
        voiceProgressState.skipped = parseInt(match[3], 10);
        // Ensure total is at least the sum of outcomes if initial total wasn't found
        if (voiceProgressState.total < voiceProgressState.success + voiceProgressState.failed + voiceProgressState.skipped) {
           voiceProgressState.total = voiceProgressState.success + voiceProgressState.failed + voiceProgressState.skipped;
        }
        voiceProgressState.status = voiceProgressState.failed > 0 ? 'completed_failed' : 'completed_success';
        voiceProgressState.endTime = Date.now();
        // End main timer based on final status
        endTaskTimer('voice', voiceProgressState.failed > 0 ? 'failed' : 'success');
    }

    // Handle generic completion/failure messages if the specific "End" message isn't present
    if (line.includes('语音合成完成') && voiceProgressState.status === 'processing') {
        voiceProgressState.status = 'completed_success';
        voiceProgressState.endTime = Date.now();
        // Assume all non-failed are success if total is known
        if(voiceProgressState.total > 0) {
             voiceProgressState.success = voiceProgressState.total - voiceProgressState.failed - voiceProgressState.skipped;
        }
        endTaskTimer('voice', 'success');
    }
     if (line.includes('语音合成失败') && voiceProgressState.status === 'processing') {
         // This is ambiguous, could be one failure or total failure. Mark as completed_failed.
         voiceProgressState.status = 'completed_failed';
         voiceProgressState.endTime = Date.now();
         endTaskTimer('voice', 'failed');
     }

}


// --- Computed Properties for Voice Display ---
const voiceProgressWidth = computed(() => {
    if (voiceProgressState.total === 0) return '0%';
    const processed = voiceProgressState.success + voiceProgressState.failed;
    return `${Math.min(100, Math.max(0, (processed / voiceProgressState.total) * 100))}%`;
});

const voiceStatusClass = computed(() => {
    switch (voiceProgressState.status) {
        case 'completed_success': return 'status-success';
        case 'failed_early':
        case 'completed_failed': return 'status-failed';
        case 'processing': return 'status-processing';
        default: return 'status-pending';
    }
});

const voiceStatusText = computed(() => {
    switch (voiceProgressState.status) {
        case 'completed_success': return '已完成';
        case 'failed_early': return '启动失败';
        case 'completed_failed': return '部分失败'; // Or '已完成(含失败)'
        case 'processing': return '进行中';
        default: return '待处理';
    }
});


// --- Watchers ---
watch(isLoading, (newIsLoading, oldIsLoading) => {
  if (newIsLoading && !oldIsLoading) {
    // Reset state ONLY when starting fresh (might need refinement)
    // Resetting timers and progress might be complex if reusing the component
    console.log("isLoading changed to true. Starting timer.");
    startTime.value = Date.now();
    elapsedTime.value = 0;
    startUpdateTimer();
    showCompletionMessage.value = true; // Show progress area immediately
    // Ensure outline timer starts if not already running
    if (taskTimeState.outline.status === 'pending') {
        startTaskTimer('outline');
    }
  } else if (!newIsLoading && oldIsLoading) {
    // Loading finished
    console.log("isLoading changed to false.");
    if (startTime.value) {
      elapsedTime.value = Date.now() - startTime.value; // Final update
    }
  }
});

// Watch log changes to parse progress and scroll log view
watch(() => progressLog.value.length, (newLength) => {
    const startIndex = lastProcessedLogIndex.value + 1;
    if (newLength > startIndex) {
        const newLines = progressLog.value.slice(startIndex);
        console.log(`Processing ${newLines.length} new log lines (from index ${startIndex})`);

        newLines.forEach((line, relativeIndex) => {
            classifyAndProcessLogLine(line, startIndex + relativeIndex);
        });

        lastProcessedLogIndex.value = newLength - 1; // Update the index to the last processed line

        // Auto-scroll log container for the *currently selected* category
        if (logContainer.value) {
            nextTick(() => {
                logContainer.value.scrollTop = logContainer.value.scrollHeight;
            });
        }
    }
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  console.log("Start.vue onMounted: Starting initial checks...");
  progressLog.value.push("开始检查配置和文件...");
  showCompletionMessage.value = true; // Show progress area from the start

  // Start timer immediately for the clock
  startTime.value = Date.now();
  startUpdateTimer();
  startTaskTimer('outline'); // Start outline timer immediately

  try {
    const config = loadConfig();
    const storyTitle = config?.剧情?.story_title;

    if (storyTitle) {
       // ... (keep existing logic for checking title and zw file) ...
       await idbFs.writeFile('/data/source/title.txt', storyTitle);
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
           progressLog.value.push("调用本地故事生成...");
           const result = await generateLocalStory();
           progressLog.value.push(`本地故事生成结果: ${result}`);
           // isLoading is handled by useStoryGenerator
       } else {
           progressLog.value.push("标记文件不存在，无需生成操作。");
           initialCheckMessage.value = `故事 '${storyTitle}' 已存在无需重新处理。`;
           isLoading.value = false;
           markAllItemsAsCompleted(storyTitle); // Mark as done since we skip
           // End outline timer since we found a title but skipped generation
           if (taskTimeState.outline.status === 'processing') {
                endTaskTimer('outline', 'success'); // Or maybe 'skipped'? Let's use success for now.
                progressState.outline.title = storyTitle; // Ensure title is set
                progressState.outline.progress = '1/1';
           }

           await nextTick();
           showToast('已存在的故事', `故事 '${storyTitle}' 已存在，无需重新生成。`, 'success', 2, '跳转');
           return;
       }
    } else {
      progressLog.value.push("未发现故事标题，调用新故事生成...");
      const result = await generateNewStory();
      progressLog.value.push(`新故事生成结果: ${result}`);
      // isLoading is handled by useStoryGenerator
    }
  } catch (error) {
    console.error("Start.vue onMounted Error:", error);
    progressLog.value.push(`启动过程中发生严重错误: ${error.message}`);
    errorMessage.value = error.message || "未知错误";
    isLoading.value = false;
    stopUpdateTimer(); // Stop timer on critical error
    await nextTick();
    showToast('生成错误', `发生错误: ${error.message}`, 'error', 0, '');
    return;
  }

  // --- Post-Generation Handling (Only if generation ran) ---
  // This block runs ONLY after successful generateLocalStory or generateNewStory
  if (!initialCheckMessage.value) { // Check if we didn't skip generation
      progressLog.value.push("生成处理完成，准备跳转...");
      console.log("Generation complete. Preparing navigation...");

      // Ensure isLoading is false (should be handled by useStoryGenerator, but double-check)
      if (isLoading.value) {
        console.warn("isLoading is still true after generation supposedly finished.");
        isLoading.value = false;
      }

      // Update final timer states one last time
       stopUpdateTimer(); // Stop the timer now, calculation done within stopUpdateTimer
       elapsedTime.value = Date.now() - startTime.value; // Final precise time

      // Use the title from the progress state
      const finalTitle = progressState.outline.title ? `'${progressState.outline.title}' ` : '';

      await nextTick();
      showToast('生成完成', `故事 ${finalTitle}生成完成！`, 'success', 2, '跳转');
  }
});

// Cleanup timers on unmount
onUnmounted(() => {
  stopUpdateTimer();
  if (toastMessage.timer) clearInterval(toastMessage.timer);
});

// Helper to load config
const loadConfig = () => { /* ... (keep existing) ... */
  try {
    const configStr = localStorage.getItem('aiGalgameConfig');
    return configStr ? JSON.parse(configStr) : {};
  } catch (e) {
    console.error("Config load error in Start.vue:", e);
    return {};
  }
};

// Mark all items as completed (used when skipping generation)
function markAllItemsAsCompleted(title = '') {
  const completionTime = Date.now();

  // Update progress state
  progressState.outline.title = title || progressState.outline.title || '已存在';
  progressState.outline.progress = '1/1';
  progressState.story.progress = '1/1';
  progressState.music.progress = progressState.music.enabled ? '1/1' : '0/1';
  progressState.imageTitle.progress = '1/1'; // Assume complete if skipping
  progressState.imageCharacter.progress = '1/1';
  progressState.imageBackground.progress = '1/1';
  // Voice state needs careful handling - mark as skipped or complete?
  voiceProgressState.status = 'completed_success'; // Assume success if skipped
  voiceProgressState.total = 0; // Or 1? Set to 0 for skipped.
  voiceProgressState.success = 0;

  // Update time tracking
  Object.keys(taskTimeState).forEach(key => {
    if (!taskTimeState[key].startTime) {
      // If timer never started, set a minimal duration ending now
      taskTimeState[key].startTime = key === 'outline' ? startTime.value : completionTime - 10; // Use actual start for outline
      taskTimeState[key].endTime = completionTime;
    } else if (!taskTimeState[key].endTime) {
      // If timer started but didn't finish (e.g., outline was processing)
      taskTimeState[key].endTime = completionTime;
    }
    // Set final status
    taskTimeState[key].status = (key === 'music' && !progressState.music.enabled) ? 'disabled' : 'success';
    updateTaskElapsedTime(key); // Recalculate elapsed time
  });

  stopUpdateTimer(); // Stop the main timer
  elapsedTime.value = Date.now() - startTime.value; // Final overall time
}

</script>

<style scoped>
/* --- Base & Layout --- */
.start-container {
  padding: 1.5rem; /* Reduced padding */
  max-width: 1100px; /* Wider for two columns */
  margin: 1rem auto; /* Reduced top margin */
  font-family: 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: #f8f9fa; /* Lighter background */
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.07);
}

h1 {
  font-size: 2rem; /* Slightly smaller */
  margin-bottom: 1.5rem;
  color: #343a40;
  text-align: center;
  position: relative;
  font-weight: 600;
}
h1:after { /* Keep the gradient line */
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 3px;
  border-radius: 1.5px;
  background: linear-gradient(90deg, #007bff, #6610f2);
}

h2 {
  color: #495057;
  font-size: 1.25rem; /* Smaller H2 */
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.display-area {
  display: flex;
  gap: 1.5rem; /* Space between panels */
  width: 100%;
  margin-top: 1.5rem;
}

.progress-panel {
  flex: 1; /* Take up available space */
  min-width: 450px; /* Minimum width */
}

.log-panel {
  flex: 1; /* Take up available space */
  min-width: 400px; /* Minimum width */
  display: flex;
  flex-direction: column;
}

.message-area {
    width: 100%;
    margin-top: 1.5rem; /* Space above messages */
    position: relative; /* For toast positioning relative to this area if needed */
}


/* --- Loading Indicator --- */
.loading-indicator { /* Keep existing style */
  display: flex; align-items: center; justify-content: center;
  margin: 20px 0 24px; padding: 12px 32px;
  background: linear-gradient(120deg, #e7f5ff, #e3f2fd);
  border-radius: 40px; box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
  animation: pulse 2s infinite;
}
@keyframes pulse { /* Keep existing */
  0% { box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15); }
  50% { box-shadow: 0 4px 16px rgba(52, 152, 219, 0.3); }
  100% { box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15); }
}
.loading-indicator span { /* Keep existing */
  font-size: 1.1rem; color: #2980b9; margin-left: 12px; font-weight: 500;
}
.spinner { /* Keep existing */
  width: 24px; height: 24px; border: 3px solid rgba(52, 152, 219, 0.2);
  border-radius: 50%; border-top-color: #3498db;
  animation: spin 1s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
@keyframes spin { /* Keep existing */
  0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }
}


/* --- Progress Panel --- */
.progress-status-container {
  width: 100%;
  padding: 1rem 1.25rem; /* Adjusted padding */
  background-color: #ffffff;
  border-left: 4px solid #007bff; /* Changed color */
  border-radius: 8px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.05);
}

.progress-header { /* Keep existing */
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1rem; border-bottom: 1px solid #dee2e6; padding-bottom: 0.75rem;
}
.progress-header h2 { margin: 0; font-size: 1.15rem; display: flex; align-items: center; } /* Adjusted size */

.progress-time { /* Keep existing */
  display: flex; align-items: center; font-family: 'Consolas', 'SFMono-Regular', monospace;
  background-color: #e9ecef; padding: 3px 8px; border-radius: 5px;
  font-size: 0.9rem; color: #007bff; /* Adjusted size and color */
}
.time-icon { /* Keep existing, adjusted color */
  display: inline-block; width: 14px; height: 14px; margin-right: 6px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23007bff' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'/%3E%3C/svg%3E");
  background-size: contain;
}

/* --- Progress Table --- */
.progress-table { /* Keep existing */
  width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.9rem; /* Smaller base font */
}
.progress-table tr:hover { background-color: #f8f9fa; }
.progress-table td { padding: 6px 4px; vertical-align: middle; border-bottom: 1px solid #f1f3f5; } /* Add subtle border */
.progress-table tr:last-child td { border-bottom: none; }

.task-name { width: 90px; font-weight: 500; color: #495057; } /* Adjusted width */
.task-progress { width: 150px; position: relative; } /* Adjusted width */

.progress-bar { /* Keep existing */
  height: 10px; background-color: #e9ecef; border-radius: 5px; overflow: hidden; width: 100%; position: relative;
}
/* Remove progress value display from here */
/* .progress-value { ... } */

/* Status Colors */
.progress-bar.status-success .progress-fill { background: linear-gradient(90deg, #28a745, #218838); } /* Green */
.progress-bar.status-processing .progress-fill { background: linear-gradient(90deg, #007bff, #0056b3); animation: progress-pulse 1.5s ease infinite; } /* Blue */
.progress-bar.status-failed .progress-fill { background: linear-gradient(90deg, #dc3545, #c82333); } /* Red */
.progress-bar.status-disabled .progress-fill { background: linear-gradient(90deg, #adb5bd, #6c757d); } /* Gray */

@keyframes progress-pulse { /* Keep existing */
  0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; }
}
.progress-fill { height: 100%; transition: width 0.3s ease; width: 0; }

.task-status {
  /* width: auto; */ /* Allow status to take remaining space */
  flex-grow: 1; /* Take remaining space */
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 10px; /* Space after progress bar */
}
.task-detail {
    font-weight: normal;
    font-size: 0.8em;
    color: #6c757d;
    margin-left: 5px;
}

/* Status Text Colors */
.status-success { color: #218838; }
.status-failed { color: #dc3545; }
.status-processing { color: #0056b3; animation: blink 1.5s ease infinite; }
.status-pending { color: #adb5bd; }
.status-disabled { color: #6c757d; font-style: italic; }

@keyframes blink { /* Keep existing */
  0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; }
}

.task-time { width: 65px; text-align: right; font-family: 'Consolas', 'SFMono-Regular', monospace; color: #495057; } /* Adjusted width */

/* --- Log Panel --- */
.log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding: 0 0.5rem; /* Add some padding */
}
.log-header h2 {
    margin: 0;
    font-size: 1.15rem; /* Match progress header */
}
.log-categories {
    display: flex;
    gap: 0.5rem;
}
.log-categories button {
    padding: 4px 10px;
    font-size: 0.85rem;
    border: 1px solid #ced4da;
    background-color: #f8f9fa;
    color: #495057;
    border-radius: 15px; /* Pill shape */
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.log-categories button:hover {
    background-color: #e9ecef;
    border-color: #adb5bd;
}
.log-categories button.active {
    background-color: #007bff;
    color: #fff;
    border-color: #007bff;
    font-weight: 500;
}

.progress-log-container { /* Wraps the scrollable log */
  flex-grow: 1; /* Takes remaining vertical space */
  overflow: hidden; /* Prevents buttons from causing overflow */
  border-radius: 6px;
  background-color: #ffffff;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef; /* Subtle border */
  display: flex; /* Needed for flex-grow on child */
}

.progress-log { /* The actual scrollable area */
  white-space: pre-wrap; word-wrap: break-word;
  height: 300px; /* Fixed height, adjust as needed */
  width: 100%; /* Take full width of container */
  overflow-y: auto;
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  font-size: 0.85rem; /* Slightly smaller log font */
  background-color: #fdfdff; /* Very light background */
  padding: 12px;
  color: #495057;
  line-height: 1.4;
  flex-grow: 1; /* Grow to fill container */
}

/* Custom scrollbar styles */
.progress-log::-webkit-scrollbar { width: 6px; }
.progress-log::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
.progress-log::-webkit-scrollbar-thumb { background: #ced4da; border-radius: 3px; }
.progress-log::-webkit-scrollbar-thumb:hover { background: #adb5bd; }

/* --- Messages & Notifications (Toast, Error, etc.) --- */

.initial-check-message {
    margin: 1rem 0; /* Adjusted margin */
    width: auto; /* Let it size naturally */
    display: inline-block; /* Center alignment works better */
    max-width: 90%;
    /* Keep other styles */
    font-style: italic; color: #4a5568; text-align: center; background-color: #fffaf0;
    padding: 10px 20px; border-radius: 6px; border-left: 4px solid #ed8936;
}
.error-message {
    margin: 1rem auto; /* Center and adjust margin */
    width: 95%; /* Slightly wider */
    /* Keep other styles */
    padding: 14px; background-color: #fff5f5; border-radius: 6px;
    box-shadow: 0 4px 12px rgba(229, 62, 62, 0.1); display: flex;
    align-items: flex-start; border-left: 4px solid #e53e3e;
}
.error-icon { /* Slightly smaller icon */
    width: 32px; height: 32px; font-size: 20px; margin-right: 12px;
    /* Keep other styles */
    display: flex; justify-content: center; align-items: center; border-radius: 50%;
    background-color: #fed7d7; color: #e53e3e; font-weight: bold; flex-shrink: 0;
}
.error-content h3 { font-size: 1.05rem; } /* Adjust size */
.error-content p { font-size: 0.9rem; } /* Adjust size */

/* Toast Styling (Example - Keep your preferred styles) */
.toast-container { position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 380px; width: calc(100% - 40px); }
.toast-message { display: flex; align-items: flex-start; padding: 14px; border-radius: 6px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1); background-color: #fff; position: relative; margin-bottom: 10px; }
.toast-message.success { border-left: 4px solid #28a745; }
.toast-message.error { border-left: 4px solid #dc3545; }
.toast-message.info { border-left: 4px solid #007bff; }
.toast-icon { display: flex; justify-content: center; align-items: center; width: 28px; height: 28px; border-radius: 50%; margin-right: 10px; flex-shrink: 0; font-weight: bold; font-size: 16px; }
.success .toast-icon { background-color: #d4edda; color: #155724; }
.error .toast-icon { background-color: #f8d7da; color: #721c24; }
.info .toast-icon { background-color: #cce5ff; color: #004085; }
.toast-content { flex: 1; }
.toast-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 3px; color: #343a40; }
.toast-body { color: #495057; font-size: 0.85rem; margin-bottom: 5px; }
.toast-countdown { font-size: 0.75rem; color: #6c757d; }
.toast-close { position: absolute; top: 5px; right: 5px; background: none; border: none; font-size: 18px; cursor: pointer; color: #adb5bd; width: 20px; height: 20px; line-height: 20px; text-align: center; border-radius: 50%; }
.toast-close:hover { background-color: #e9ecef; color: #495057; }
</style>