<template>
  <div class="music-generator-test">
    <h1>AI 音乐生成测试</h1>

    <div class="config-section">
      <h2>配置</h2>
      <div>
        <label for="storyTitle">故事标题:</label>
        <input id="storyTitle" v-model="storyTitle" @input="saveCurrentConfig" />
      </div>
      <div>
        <label for="musicUrl">AI 音乐 API Base URL:</label>
        <input id="musicUrl" v-model="musicUrl" @input="saveCurrentConfig" placeholder="例如: https://api.example.com/music" />
      </div>
       <div>
           <label for="apiKey">AI 音乐 API Key:</label>
           <input id="apiKey" v-model="apiKey" @input="saveCurrentConfig" placeholder="例如: sk-..." />
       </div>
    </div>

    <div class="generator-section">
      <h2>背景音乐</h2>
      <button @click="startGenerateBackgroundMusic" :disabled="isGenerating">生成背景音乐</button>
    </div>

    <div class="generator-section">
      <h2>结尾音乐</h2>
      <div>
        <label for="storyId">故事 ID:</label>
        <input id="storyId" v-model="storyId" type="number" min="1" />
      </div>
      <button @click="startGenerateEndMusic" :disabled="isGenerating || !storyId">生成结尾音乐</button>
    </div>

    <div class="status-section">
      <h2>状态</h2>
      <p>{{ status }}</p>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    </div>

     <div class="file-list-section">
         <h2>生成的文件 (IndexedDB /data/{{ storyTitle }}/music)</h2>
         <button @click="listMusicFiles" :disabled="isGenerating || !storyTitle">刷新文件列表</button>
         <ul>
             <li v-for="file in musicFiles" :key="file.path">
                 {{ file.name }} ({{ file.isFolder ? '文件夹' : '文件' }}) - {{ file.path }}
             </li>
              <li v-if="musicFiles.length === 0 && !initialLoad">
                  暂无文件或目录不存在。
              </li>
         </ul>
     </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
// 导入音乐生成函数和配置函数
import { generateBackgroundMusic, generateEndMusic, loadConfig, saveConfig } from './services/aimusicService';
// 导入 IndexedDB 文件系统模拟的列出目录函数
import { listDirectory,getMetadata } from './services/IndexedDBFileSystem';

// 响应式状态
const storyTitle = ref('MyNewStory');
const musicUrl = ref('');
const apiKey = ref(''); // Assuming apiKey is part of the config
const storyId = ref(1);
const status = ref('等待操作...');
const errorMessage = ref('');
const isGenerating = ref(false);
const musicFiles = ref([]);
const initialLoad = ref(true); // Flag to show "暂无文件" after first list attempt

// 加载配置
const loadInitialConfig = () => {
  const config = loadConfig();
  storyTitle.value = config["剧情"]?.["story_title"] || 'MyNewStory';
  musicUrl.value = config["AI音乐"]?.["base_url"] || '';
  apiKey.value = config["AI音乐"]?.["api_key"] || ''; // Load api_key
};

// 保存当前配置到 localStorage
const saveCurrentConfig = () => {
    const currentConfig = {
        "剧情": {
            "story_title": storyTitle.value
            // Add other story config if needed
        },
        "AI音乐": {
            "base_url": musicUrl.value,
            "api_key": apiKey.value // Save api_key
            // Add other music config if needed
        }
    };
    saveConfig(currentConfig);
};

// 更新状态的函数
const updateStatus = (msg) => {
  status.value = msg;
  if (msg.startsWith("生成音乐失败") || msg.startsWith("下载或保存") || msg.startsWith("LLM调用失败")) {
      errorMessage.value = msg;
  } else {
      errorMessage.value = ''; // Clear error message on new status
  }
};

// 开始生成背景音乐
const startGenerateBackgroundMusic = async () => {
  isGenerating.value = true;
  errorMessage.value = '';
  updateStatus('开始生成背景音乐...');
  try {
    const result = await generateBackgroundMusic(updateStatus);
    if (result) { // If result is not void, it's an error message
        errorMessage.value = result;
        status.value = `背景音乐生成失败: ${result}`;
    } else {
       // Success is reported by updateStatus inside the function
       // Wait a moment then refresh file list
       await new Promise(resolve => setTimeout(resolve, 500));
       listMusicFiles();
    }
  } catch (error) {
    console.error("Error during background music generation:", error);
    const msg = `发生未预期错误: ${error.message}`;
     errorMessage.value = msg;
    updateStatus(msg);
  } finally {
    isGenerating.value = false;
  }
};

// 开始生成结尾音乐
const startGenerateEndMusic = async () => {
  if (!storyId.value) {
    alert('请输入故事 ID');
    return;
  }
  isGenerating.value = true;
  errorMessage.value = '';
  updateStatus(`开始生成结尾音乐 (Story ID: ${storyId.value})...`);
   try {
    const result = await generateEndMusic(storyId.value, updateStatus);
     if (result) { // If result is not void, it's an error message
        errorMessage.value = result;
         status.value = `结尾音乐生成失败: ${result}`;
    } else {
       // Success is reported by updateStatus inside the function
        // Wait a moment then refresh file list
       await new Promise(resolve => setTimeout(resolve, 500));
       listMusicFiles();
    }
  } catch (error) {
    console.error("Error during end music generation:", error);
     const msg = `发生未预期错误: ${error.message}`;
     errorMessage.value = msg;
    updateStatus(msg);
  } finally {
    isGenerating.value = false;
  }
};

// 列出音乐目录下的文件
const listMusicFiles = async () => {
    if (!storyTitle.value) {
        musicFiles.value = [];
        initialLoad.value = false;
        return;
    }
    const musicDir = `/data/${storyTitle.value}/music`;
    console.log(`Listing files in ${musicDir}`);
    try {
        // Check if directory exists first
        const metadata = await getMetadata(musicDir);
         if (!metadata.exists || !metadata.isFolder) {
            console.warn(`Directory ${musicDir} does not exist or is not a folder.`);
            musicFiles.value = [];
            initialLoad.value = false;
            return;
         }

        const files = await listDirectory(musicDir);
        musicFiles.value = files;
         initialLoad.value = false;
        console.log(`Files in ${musicDir}:`, files);
    } catch (error) {
        console.error(`Failed to list directory ${musicDir}:`, error);
         musicFiles.value = [];
         initialLoad.value = false;
         errorMessage.value = `列出文件失败: ${error.message}`;
         status.value = `列出文件失败`;
    }
};


// 生命周期钩子
onMounted(() => {
  loadInitialConfig();
  // Automatically list files for the initial storyTitle
  listMusicFiles();
});

// Watch for storyTitle changes to update file list
watch(storyTitle, (newVal, oldVal) => {
    if (newVal !== oldVal) {
        listMusicFiles();
    }
});

// 假设全局提供了 getMusicKey, processPrompt, gpt, gptDestroy 的模拟实现
// 如果不是全局的，请确保在 MusicGeneratorTest.vue 或其父组件中导入它们，
// 或者通过provide/inject传递给musicGenerator.js

// Mock implementations for testing purposes if they are not truly external
// In a real app, you'd import the real ones or ensure they're globally available as expected
/*
import { getMusicKey as mockGetMusicKey } from './musicGenerator.js'; // Import the mocks from musicGenerator if they are exported there
import { processPrompt as mockProcessPrompt } from './musicGenerator.js';
import { gpt as mockGpt, gptDestroy as mockGptDestroy } from './AiModelService.js'; // Import actual mocks or real implementations

// Assign mocks to global scope if musicGenerator expects them there
// Or preferably, modify musicGenerator.js to accept these as arguments or imports
if (typeof window !== 'undefined') {
    window.getMusicKey = mockGetMusicKey;
    window.processPrompt = mockProcessPrompt;
    window.gpt = mockGpt;
    window.gptDestroy = mockGptDestroy;
}
*/

</script>

<style scoped>
.music-generator-test {
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
  width: 150px;
  margin-bottom: 5px;
}

input[type="text"], input[type="number"] {
  width: 300px;
  padding: 5px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
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
}

.file-list-section li:last-child {
    border-bottom: none;
}
</style>