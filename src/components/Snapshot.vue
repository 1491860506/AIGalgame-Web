<template>
  <div class="voice-generator-test">
    <h1>AI 语音生成测试 (SOVITS)</h1>

    <div class="config-section">
      <h2>配置</h2>
      <div>
        <label for="storyTitle">故事标题:</label>
        <input id="storyTitle" v-model="storyTitle" @input="saveCurrentConfig" />
        <p class="config-hint">语音和角色文件应位于 /data/{{ storyTitle }}/story/ 和 /data/{{ storyTitle }}/character.json</p>
      </div>
      <div>
          <label for="themeLanguage">主题语言 (影响SOVITS Lang参数):</label>
           <select id="themeLanguage" v-model="themeLanguage" @change="saveCurrentConfig">
               <option value="中文">中文</option>
               <option value="英文">英文</option>
               <option value="日文">日文</option>
           </select>
      </div>
       <p class="config-hint">SOVITS模型配置 (modelX, pathX, textX) 需要在浏览器的 localStorage 中手动编辑 'aiGalgameConfig' 的 "SOVITS" 部分。</p>
    </div>

    <div class="generator-section">
      <h2>生成语音</h2>
      <div>
        <label for="storyId">故事 Segment ID:</label>
        <input id="storyId" v-model="storyId"/>
      </div>
      <button @click="startGenerateVoice" :disabled="isGenerating || !storyId || !storyTitle">生成语音</button>
    </div>

    <div class="status-section">
      <h2>状态</h2>
      <p v-html="status"></p> <!-- Use v-html to potentially render line breaks -->
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    </div>

    <div class="file-list-section" v-if="storyTitle && storyId">
         <h2>生成的文件 (IndexedDB /data/{{ storyTitle }}/audio/{{ storyId }})</h2>
         <button @click="listAudioFiles" :disabled="isGenerating || !storyTitle || !storyId">刷新文件列表</button>
         <ul>
             <li v-for="file in audioFiles" :key="file.path">
                 {{ file.name }} ({{ file.isFolder ? '文件夹' : '文件' }}) - {{ file.path }}
             </li>
              <li v-if="audioFiles.length === 0 && !initialLoad">
                  暂无文件或目录不存在。
              </li>
         </ul>
     </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
// 导入语音生成函数和配置函数
import { generateVoice, loadConfig, saveConfig } from './services/voiceGenerator'; // Assuming voiceGenerator.js is in the same directory
// 导入 IndexedDB 文件系统模拟的列出目录函数
import { listDirectory, getMetadata } from './services/IndexedDBFileSystem';

// 响应式状态
const storyTitle = ref('MyNewStory');
const themeLanguage = ref('中文');
const storyId = ref(0);
const status = ref('等待操作...');
const errorMessage = ref('');
const isGenerating = ref(false);
const audioFiles = ref([]);
const initialLoad = ref(true); // Flag to show "暂无文件" after first list attempt

// 加载配置
const loadInitialConfig = () => {
  const config = loadConfig();
  storyTitle.value = config["剧情"]?.["story_title"] || 'MyNewStory';
  themeLanguage.value = config["剧情"]?.["language"] || '中文';
  // SOVITS config (modelX, pathX, textX) is loaded within generateVoice,
  // no need to expose all of them as reactive properties in the UI unless you want to edit them there.
  // The hint text tells the user they might need to edit localStorage directly.
};

// 保存当前配置到 localStorage
const saveCurrentConfig = () => {
    const currentConfig = loadConfig(); // Load existing config first to preserve SOVITS section
    currentConfig["剧情"] = currentConfig["剧情"] || {}; // Ensure structure
    currentConfig["剧情"]["story_title"] = storyTitle.value;
    currentConfig["剧情"]["language"] = themeLanguage.value;
    // Note: SOVITS config is *not* saved here, it's assumed to be managed elsewhere or manually.
    // If you want to save SOVITS config from UI, add inputs for each model/path/text and include them here.
    saveConfig(currentConfig);
};

// 更新状态的函数
const updateStatus = (msg) => {
  // Append message with a newline, useful for seeing progression
  status.value += (status.value === '等待操作...' ? '' : '<br>') + msg;

  // Basic error detection in status message for errorMessage
  if (msg.includes("失败") || msg.includes("错误:")) {
      errorMessage.value = msg;
  }
};

// 开始生成语音
const startGenerateVoice = async () => {
  if (!storyTitle.value || !storyId.value) {
    alert('请输入故事标题和故事 ID');
    return;
  }
  isGenerating.value = true;
  errorMessage.value = '';
  status.value = '开始生成语音...'; // Reset status for new operation

  try {
    const result = await generateVoice(storyId.value, updateStatus);
    if (result !== "ok") { // If result is not "ok", it's an error message
        errorMessage.value = result;
         status.value += '<br>' + `语音生成失败: ${result}`;
    } else {
       // Success messages are handled by updateStatus internally
       // Wait a moment then refresh file list
       await new Promise(resolve => setTimeout(resolve, 500));
       listAudioFiles();
    }
  } catch (error) {
    console.error("Error during voice generation:", error);
    const msg = `发生未预期错误: ${error.message}`;
    errorMessage.value = msg;
    status.value += '<br>' + msg;
  } finally {
    isGenerating.value = false;
  }
};

// 列出音频目录下的文件
const listAudioFiles = async () => {
    if (!storyTitle.value || !storyId.value) {
        audioFiles.value = [];
        initialLoad.value = false;
        return;
    }
    const audioDir = `/data/${storyTitle.value}/audio/${storyId.value}`;
    console.log(`Listing files in ${audioDir}`);
    updateStatus(`尝试列出文件: ${audioDir}`);
    try {
        // Check if directory exists first
        const metadata = await getMetadata(audioDir).catch(() => ({exists: false})); // Handle potential errors like title not existing

         if (!metadata.exists || !metadata.isFolder) {
            console.warn(`Directory ${audioDir} does not exist or is not a folder.`);
            audioFiles.value = [];
            initialLoad.value = false;
             updateStatus(`目录不存在或为空: ${audioDir}`);
            return;
         }

        const files = await listDirectory(audioDir);
        audioFiles.value = files;
         initialLoad.value = false;
        console.log(`Files in ${audioDir}:`, files);
         updateStatus(`列出文件成功，共 ${files.length} 个`);
    } catch (error) {
        console.error(`Failed to list directory ${audioDir}:`, error);
         audioFiles.value = [];
         initialLoad.value = false;
         errorMessage.value = `列出文件失败: ${error.message}`;
         status.value += '<br>' + `列出文件失败`;
    }
};


// 生命周期钩子
onMounted(() => {
  loadInitialConfig();
  // Automatically list files for the initial storyTitle and storyId if valid
  if (storyTitle.value && storyId.value) {
     listAudioFiles();
  } else {
      initialLoad.value = false; // Ensure flag is set if no list attempt on mount
  }

});

// Watch for storyTitle or storyId changes to update file list
watch([storyTitle, storyId], ([newTitle, newId], [oldTitle, oldId]) => {
    // Only refresh if both are non-empty and at least one changed
    if (newTitle && newId && (newTitle !== oldTitle || newId !== oldId)) {
        listAudioFiles();
    } else if (!newTitle || !newId) {
        audioFiles.value = []; // Clear list if title or id becomes empty
        initialLoad.value = false;
    }
});

</script>

<style scoped>
.voice-generator-test {
  padding: 20px;
  font-family: sans-serif;
}

.config-section, .generator-section, .status-section, .file-list-section {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 5px;
}

label {
  display: inline-block;
  width: 180px; /* Adjusted width */
  margin-bottom: 5px;
}

input[type="text"], input[type="number"], select {
  width: 300px;
  padding: 5px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.config-hint {
    font-size: 0.9em;
    color: #666;
    margin-top: -5px;
    margin-bottom: 10px;
    margin-left: 185px; /* Align with input */
}


button {
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.status-section p {
  font-weight: bold;
  white-space: pre-wrap; /* Preserve line breaks from v-html */
}

.error-message {
    color: red;
    font-weight: bold;
    margin-top: 10px;
}

.file-list-section ul {
    list-style: none;
    padding: 0;
    margin-top: 10px;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #eee;
    border-radius: 4px;
    padding: 10px;
    background-color: #f9f9f9;
}

.file-list-section li {
    padding: 5px 0;
    border-bottom: 1px dashed #ddd;
    word-break: break-all; /* Prevent long paths from overflowing */
}

.file-list-section li:last-child {
    border-bottom: none;
}
</style>