<template>
  <!-- ... (template remains the same as the previous version) ... -->
  <div class="resource-viewer">
    <div v-if="isLoading" class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i> 加载资源中...
    </div>

<div v-else-if="error" class="error-state">
  <p>加载资源失败: {{ error }}</p>
</div>

<div v-else class="resource-content">
  <!-- 资源列表区域 -->
  <div class="resource-list-area">
    <div v-if="!hasResources && !hasMissingResources" class="empty-state">
         <p>此故事暂无资源文件。</p>
         <p v-if="!audioDirExists && !imageDirExists && !musicDirExists && !storyDirExists && !characterFileExists">(对应的资源目录或文件不存在)</p>
    </div>
    <div v-else>
        <!-- 语音资源 -->
        <div v-if="hasAudioResources || hasMissingAudioResources" class="resource-category">
          <h3>语音 (audio)</h3>
           <!-- 按故事ID分类的语音 -->
          <div v-for="(audioItems, storyId) in classifiedAudio.byStory" :key="'audio-story-' + storyId" class="voice-folder">
              <h4>
                故事片段 {{ storyId }}
              </h4>
               <ul class="resource-items">
                  <li v-for="item in audioItems" :key="item.file.path"
                      :class="{ selected: selectedResource && selectedResource.path === item.file.path }"
                      @click="selectResource(item.file, 'audio')">
                    <i class="fas fa-volume-up resource-icon"></i>
                    <!-- Display associated text, fallback to filename if text is missing -->
                    <span>{{ item.text || `[${item.file.name}]` }}</span>
                  </li>
                  
                  <!-- 显示本应存在但不存在的语音 -->
                  <li v-for="item in getMissingAudioForStory(storyId)" :key="'missing-' + item.id"
                      class="missing-resource"
                      @click="handleMissingResourceClick(item)">
                    <i v-if="isGenerating[`audio-${storyId}-${item.id}`]" class="fas fa-spinner fa-spin resource-icon missing-icon"></i>
                    <i v-else class="fas fa-volume-up resource-icon missing-icon"></i>
                    <span>{{ item.text }} <span class="missing-label">[不存在]</span></span>
                    <button class="btn-complete" @click.stop="regenerateAudio(storyId)" :disabled="isGenerating[`audio-${storyId}-${item.id}`]">
                      <i v-if="isGenerating[`audio-${storyId}-${item.id}`]" class="fas fa-spinner fa-spin"></i>
                      <i v-else class="fas fa-plus"></i> 补齐
                    </button>
                  </li>
               </ul>
          </div>
          
          <!-- 缺失的故事片段的语音 -->
          <template v-for="(items, storyId) in missingAudioByStory" :key="'missing-story-audio-' + storyId" >
          <div v-if="!classifiedAudio.byStory[storyId]"
               class="voice-folder missing-folder">
              <h4>
                故事片段 {{ storyId }} <span class="missing-section-label">[缺失]</span>
                <button class="btn-regenerate" @click="regenerateAudio(storyId)" :disabled="isGenerating[`audio-${storyId}`]">
                  <i v-if="isGenerating[`audio-${storyId}`]" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-sync-alt"></i> 重新生成
                </button>
              </h4>
               <ul class="resource-items">
                  <li v-for="item in items" :key="'missing-full-' + item.id"
                      class="missing-resource"
                      @click="handleMissingResourceClick(item)">
                    <i v-if="isGenerating[`audio-${storyId}-${item.id}`]" class="fas fa-spinner fa-spin resource-icon missing-icon"></i>
                    <i v-else class="fas fa-volume-up resource-icon missing-icon"></i>
                    <span>{{ item.text }} <span class="missing-label">[不存在]</span></span>
                    <button class="btn-complete" @click.stop="regenerateAudio(storyId)" :disabled="isGenerating[`audio-${storyId}-${item.id}`]">
                      <i v-if="isGenerating[`audio-${storyId}-${item.id}`]" class="fas fa-spinner fa-spin"></i>
                      <i v-else class="fas fa-plus"></i> 补齐
                    </button>
                  </li>
               </ul>
          </div>
        </template>
          
          <!-- 未分类的语音 -->
           <div v-if="classifiedAudio.uncategorized.length > 0" class="voice-folder">
             <h4>其他语音 (路径或关联错误)</h4>
              <ul class="resource-items">
                <li v-for="file in classifiedAudio.uncategorized" :key="file.path"
                     :class="{ selected: selectedResource && selectedResource.path === file.path }"
                     @click="selectResource(file, 'audio')">
                   <i class="fas fa-volume-up resource-icon"></i>
                   <span>{{ file.name }}</span>
                 </li>
              </ul>
           </div>
        </div>

        <!-- 图片资源 -->
        <div v-if="hasImageResources || hasMissingImageResources" class="resource-category">
          <h3>图片 (images)</h3>

           <!-- 标题图片 -->
           <div v-if="classifiedImages.title.length > 0 || missingTitleImage" class="voice-folder">
               <h4>
                 封面图片
                 <button class="btn-regenerate" @click="regenerateTitleImage()" :disabled="isGenerating['image-title']">
                   <i v-if="isGenerating['image-title']" class="fas fa-spinner fa-spin"></i>
                   <i v-else class="fas fa-sync-alt"></i> 重新生成
                 </button>
               </h4>
               <ul class="resource-items">
                   <li v-for="file in classifiedImages.title" :key="file.path"
                       :class="{ selected: selectedResource && selectedResource.path === file.path }"
                       @click="selectResource(file, 'image')">
                     <i class="fas fa-image resource-icon"></i>
                     <span>{{ file.name }}</span>
                   </li>
                   
                   <!-- 显示缺失的标题图片 -->
                   <li v-if="missingTitleImage" 
                       class="missing-resource"
                       @click="handleMissingResourceClick(missingTitleImage)">
                     <i v-if="isGenerating['image-title']" class="fas fa-spinner fa-spin resource-icon missing-icon"></i>
                     <i v-else class="fas fa-image resource-icon missing-icon"></i>
                     <span>title.png <span class="missing-label">[不存在]</span></span>
                     <button class="btn-complete" @click.stop="regenerateTitleImage()" :disabled="isGenerating['image-title']">
                       <i v-if="isGenerating['image-title']" class="fas fa-spinner fa-spin"></i>
                       <i v-else class="fas fa-plus"></i> 补齐
                     </button>
                   </li>
               </ul>
           </div>

           <!-- 人物图片 -->
           <div v-if="classifiedImages.characters.length > 0 || missingCharacterImages.length > 0" class="voice-folder">
               <h4>
                 人物
                 <button class="btn-regenerate" @click="showCharacterSelection(true)" :disabled="isGenerating['image-characters']">
                   <i v-if="isGenerating['image-characters']" class="fas fa-spinner fa-spin"></i>
                   <i v-else class="fas fa-sync-alt"></i> 重新生成
                 </button>
               </h4>
               <ul class="resource-items">
                   <li v-for="file in classifiedImages.characters" :key="file.path"
                       :class="{ selected: selectedResource && selectedResource.path === file.path }"
                       @click="selectResource(file, 'image')">
                     <i class="fas fa-image resource-icon"></i>
                     <span>{{ file.name }}</span>
                   </li>
                   
                   <!-- 显示缺失的人物图片 -->
                   <li v-for="item in missingCharacterImages" :key="'missing-char-' + item.name"
                       class="missing-resource"
                       @click="handleMissingResourceClick(item)">
                     <i v-if="isGenerating[`image-character-${item.name}`]" class="fas fa-spinner fa-spin resource-icon missing-icon"></i>
                     <i v-else class="fas fa-image resource-icon missing-icon"></i>
                     <span>{{ item.name }}.png <span class="missing-label">[不存在]</span></span>
                     <button class="btn-complete" @click.stop="showCharacterSelection(false)" :disabled="isGenerating['image-characters'] || isAnyCharacterGenerating">
                       <i v-if="isGenerating['image-characters'] || isAnyCharacterGenerating" class="fas fa-spinner fa-spin"></i>
                       <i v-else class="fas fa-plus"></i> 补齐
                     </button>
                   </li>
               </ul>
           </div>
           <!-- 背景图片按故事ID分类 -->
           <div v-if="Object.keys(classifiedImages.backgrounds.byStory).length > 0 || Object.keys(missingBackgroundsByStory).length > 0" class="voice-folder">
                <h4>背景图 (按故事片段)</h4>
                 <div v-for="(bgFiles, storyId) in classifiedImages.backgrounds.byStory" :key="'bg-story-' + storyId" class="voice-folder sub-folder">
                      <h5>
                        故事片段 {{ storyId }}
                        <button class="btn-regenerate" @click="showBackgroundSelection(storyId, true)" :disabled="isGenerating[`image-bg-${storyId}`]">
                          <i v-if="isGenerating[`image-bg-${storyId}`]" class="fas fa-spinner fa-spin"></i>
                          <i v-else class="fas fa-sync-alt"></i> 重新生成
                        </button>
                      </h5>
                      <ul class="resource-items">
                         <li v-for="file in bgFiles" :key="file.path"
                             :class="{ selected: selectedResource && selectedResource.path === file.path }"
                             @click="selectResource(file, 'image')">
                           <i class="fas fa-image resource-icon"></i>
                           <span>{{ file.name }}</span>
                         </li>
                         
                         <!-- 显示该故事片段缺失的背景图 -->
                         <li v-for="item in getMissingBackgroundsForStory(storyId)" :key="'missing-bg-' + storyId + '-' + item.name"
                             class="missing-resource"
                             @click="handleMissingResourceClick(item)">
                           <i v-if="isGenerating[`image-bg-${storyId}-${item.name}`]" class="fas fa-spinner fa-spin resource-icon missing-icon"></i>
                           <i v-else class="fas fa-image resource-icon missing-icon"></i>
                           <span>{{ item.name }}.png <span class="missing-label">[不存在]</span></span>
                           <button class="btn-complete" @click.stop="showBackgroundSelection(storyId, false)" :disabled="isGenerating[`image-bg-${storyId}`]">
                            <i v-if="isGenerating[`image-bg-${storyId}`]" class="fas fa-spinner fa-spin"></i>
                            <i v-else class="fas fa-plus"></i> 补齐
                          </button>
                         </li>
                      </ul>
                 </div>
                 
                <!-- 显示缺失故事片段的背景图 -->
                <template v-for="(items, storyId) in missingBackgroundsByStory" :key="'missing-bg-story-' + storyId" >
                    <div v-if="!classifiedImages.backgrounds.byStory[storyId]"
                     class="voice-folder sub-folder missing-folder">
                      <h5>
                        故事片段 {{ storyId }} <span class="missing-section-label">[缺失]</span>
                        <button class="btn-regenerate" @click="showBackgroundSelection(storyId, true)" :disabled="isGenerating[`image-bg-${storyId}`]">
                          <i v-if="isGenerating[`image-bg-${storyId}`]" class="fas fa-spinner fa-spin"></i>
                          <i v-else class="fas fa-sync-alt"></i> 重新生成
                        </button>
                      </h5>
                      <ul class="resource-items">
                         <li v-for="item in items" :key="'missing-bg-full-' + storyId + '-' + item.name"
                             class="missing-resource"
                             @click="handleMissingResourceClick(item)">
                           <i v-if="isGenerating[`image-bg-${storyId}-${item.name}`]" class="fas fa-spinner fa-spin resource-icon missing-icon"></i>
                           <i v-else class="fas fa-image resource-icon missing-icon"></i>
                           <span>{{ item.name }}.png <span class="missing-label">[不存在]</span></span>
                           <button class="btn-complete" @click.stop="showBackgroundSelection(storyId, false)" :disabled="isGenerating[`image-bg-${storyId}`]">
                             <i v-if="isGenerating[`image-bg-${storyId}`]" class="fas fa-spinner fa-spin"></i>
                             <i v-else class="fas fa-plus"></i> 补齐
                           </button>
                         </li>
                      </ul>
                 </div>
              </template>
           </div>
           <!-- 未分类背景图片 -->
           <div v-if="classifiedImages.backgrounds.uncategorized.length > 0" class="voice-folder">
                <h4>背景图 (未关联场景)</h4>
               <ul class="resource-items">
                   <li v-for="file in classifiedImages.backgrounds.uncategorized" :key="file.path"
                       :class="{ selected: selectedResource && selectedResource.path === file.path }"
                       @click="selectResource(file, 'image')">
                     <i class="fas fa-image resource-icon"></i>
                     <span>{{ file.name }}</span>
                   </li>
               </ul>
           </div>
        </div>

        <!-- 音乐资源 -->
        <div v-if="hasMusicResources || missingMusicFiles.length > 0" class="resource-category">
          <h3>
            音乐 (music)
            <button class="btn-regenerate" @click="regenerateMusic()" :disabled="isGenerating['music']">
              <i v-if="isGenerating['music']" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-sync-alt"></i> 重新生成
            </button>
          </h3>
          <ul class="resource-items">
            <li v-for="file in resourceCategories.music" :key="file.path"
                :class="{ selected: selectedResource && selectedResource.path === file.path }"
                @click="selectResource(file, 'audio')">
              <i class="fas fa-music resource-icon"></i>
              <span>{{ file.name }}</span>
            </li>
            
            <!-- 显示缺失的音乐文件 -->
            <li v-for="item in missingMusicFiles" :key="'missing-music-' + item.name"
                class="missing-resource"
                @click="handleMissingResourceClick(item)">
              <i v-if="isGenerating['music']" class="fas fa-spinner fa-spin resource-icon missing-icon"></i>
              <i v-else class="fas fa-music resource-icon missing-icon"></i>
              <span>{{ item.name }} <span class="missing-label">[不存在]</span></span>
              <button class="btn-complete" @click.stop="regenerateMusic()" :disabled="isGenerating['music']">
                <i v-if="isGenerating['music']" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-plus"></i> 补齐
              </button>
            </li>
          </ul>
        </div>
    </div>
  </div>

  <!-- 资源预览区域 -->
  <div class="resource-preview-area">
    <div v-if="!selectedResource" class="preview-placeholder">
      选择一个资源进行预览
    </div>
    <div v-else class="preview-content">
      <h4>预览: {{ selectedResource.name }}</h4>
      <div class="preview-container">
        <img v-if="selectedResource.type === 'image' && previewUrl && !loadingPreview && !previewError" :src="previewUrl" alt="预览图片" class="preview-image">
        <!-- 音频预览 -->
        <div v-else-if="selectedResource.type === 'audio' && previewUrl" class="audio-preview">
          <audio ref="audioPlayer" controls :src="previewUrl"
                 @error="handleAudioError" @ended="handleAudioEnded">
                 您的浏览器不支持 Audio 标签，请尝试更新浏览器。
          </audio>
        </div>
         <!-- 加载指示器 -->
         <div v-if="loadingPreview" class="loading-indicator small">
             <i class="fas fa-spinner fa-spin"></i> 加载预览中...
         </div>
          <!-- 错误状态 -->
          <div v-if="previewError && !loadingPreview" class="error-state small">
             加载或播放预览失败
         </div>
          <!-- 如果选中了但没有预览内容 -->
         <div v-if="selectedResource && !previewUrl && !loadingPreview && !previewError" class="preview-placeholder small">
            此文件类型不支持预览
         </div>
      </div>
    </div>
  </div>
</div>

  </div>
  
  <!-- 角色选择对话框 -->
  <div v-if="showCharacterDialog" class="modal-overlay">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>选择需要生成的人物</h3>
        <button class="close-btn" @click="closeCharacterDialog">&times;</button>
      </div>
      <div class="modal-body">
        <div class="selection-options">
          <label class="select-all-container">
            <input type="checkbox" v-model="selectAllCharacters" @change="toggleAllCharacters">
            <span>全选</span>
          </label>
          <div class="character-options">
            <label v-for="character in characterSelectionList" :key="character.name">
              <input type="checkbox" v-model="character.selected">
              <span>{{ character.name }}</span>
            </label>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="closeCharacterDialog">取消</button>
        <button class="btn-confirm" @click="confirmCharacterSelection" :disabled="!hasSelectedCharacters">
          确认
        </button>
      </div>
    </div>
  </div>
  
  <!-- 背景选择对话框 -->
  <div v-if="showBackgroundDialog" class="modal-overlay">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>选择需要生成的背景 (故事片段 {{ currentStoryId }})</h3>
        <button class="close-btn" @click="closeBackgroundDialog">&times;</button>
      </div>
      <div class="modal-body">
        <div class="selection-options">
          <label class="select-all-container">
            <input type="checkbox" v-model="selectAllBackgrounds" @change="toggleAllBackgrounds">
            <span>全选</span>
          </label>
          <div class="character-options">
            <label v-for="place in backgroundSelectionList" :key="place.name">
              <input type="checkbox" v-model="place.selected">
              <span>{{ place.name }}</span>
            </label>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="closeBackgroundDialog">取消</button>
        <button class="btn-confirm" @click="confirmBackgroundSelection" :disabled="!hasSelectedBackgrounds">
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// 导入 IndexedDB 文件系统函数
import {
  listDirectory,
  readFile,
  deletePath,
  writeFile
} from './services/IndexedDBFileSystem'; // 请根据实际路径修改

// 导入生成资源相关的函数
import { generateVoice } from './services/voiceGenerator';
import { getTitleImagesJS, getSinglePersonImageJS, getPlacesImagesJS } from './services/ImageGenerationService';
import { generateBackgroundMusic } from './services/aimusicService';
import { mergeStory } from './services/ChoiceManager';

export default {
  name: 'ReadResources',
  props: {
    storyTitle: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      isLoading: true,
      loadingPreview: false,
      error: null,
      previewError: false,
      resourceCategories: {
        voice: [], // Stores raw audio file objects {name, path, isFolder}
        images: [],
        music: []
      },
      storyData: {}, // Stores parsed story JSON, keyed by storyId string
      characterData: [], // Stores parsed character JSON array
      selectedResource: null,
      previewUrl: null,
      objectUrls: {},
      audioDirExists: false,
      imageDirExists: false,
      musicDirExists: false,
      storyDirExists: false,
      characterFileExists: false,
      // 新增：缺失资源的数据结构
      missingAudioByStory: {}, // 按故事ID存储缺失的语音文件
      missingTitleImage: null, // 缺失的标题图片
      missingCharacterImages: [], // 缺失的角色图片
      missingBackgroundsByStory: {}, // 按故事ID存储缺失的背景图片
      missingMusicFiles: [], // 缺失的音乐文件
      expectedMusicFiles: ['background.mp3', 'background1.mp3'], // 预期的音乐文件
      
      // 新增：生成资源状态跟踪
      isGenerating: {}, // 通过键值对跟踪每个资源的生成状态
      
      // 人物选择对话框
      showCharacterDialog: false,
      characterSelectionList: [], // 要选择的人物列表
      selectAllCharacters: false,
      isCharacterRegenerating: false, // 是重新生成(true)还是补齐(false)
      
      // 背景选择对话框
      showBackgroundDialog: false,
      backgroundSelectionList: [], // 要选择的背景列表
      selectAllBackgrounds: false,
      isBackgroundRegenerating: false, // 是重新生成(true)还是补齐(false)
      currentStoryId: null, // 当前选中的故事ID（用于背景生成）
    };
  },
  computed: {
    // 分类音频资源：按故事ID分组并关联对话文本
    classifiedAudio() {
      const byStory = {};
      const uncategorized = [];
      // Construct the base path dynamically to remove it correctly
      const basePathToRemove = `/data/${this.storyTitle}/audio/`;

      this.resourceCategories.voice.forEach(file => {
          // Ensure file path starts with the expected base path
          if (!file.path.startsWith(basePathToRemove)) {
              console.warn(`Audio file ${file.path} does not start with expected base path ${basePathToRemove}. Skipping.`);
              uncategorized.push(file);
              return;
          }

          // Get relative path like "1/3.wav"
          const relativePath = file.path.substring(basePathToRemove.length);
          const parts = relativePath.split('/'); // Should be ["storyid", "id.wav"]

          // Validate path structure: exactly two parts, first is numeric, second is numeric ID + .wav
          if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d+\.wav$/.test(parts[1])) {
              const storyIdStr = parts[0]; // Keep as string, as keys in storyData are strings
              const audioFilename = parts[1];
              const audioIdMatch = audioFilename.match(/^(\d+)\.wav$/);
              const audioId = parseInt(audioIdMatch[1]); // Numeric ID from filename

              // Check if corresponding story data exists
              if (this.storyData && this.storyData[storyIdStr]) {
                  const storyJson = this.storyData[storyIdStr];
                  let foundConversation = null;

                  // Validate story data structure before accessing conversations
                  if (storyJson && typeof storyJson === 'object' && Array.isArray(storyJson.conversations)) {
                       foundConversation = storyJson.conversations.find(c => c && typeof c === 'object' && c.id === audioId);
                  } else {
                      console.warn(`Invalid story data structure for story ID ${storyIdStr} when classifying audio ${file.name}`, storyJson);
                  }

                  if (foundConversation) {
                       // Ensure foundConversation.text is a string or provide a fallback
                       const textContent = (typeof foundConversation.text === 'string') ? foundConversation.text : `(对话 ${audioId} 无文本)`;

                       if (!byStory[storyIdStr]) {
                           byStory[storyIdStr] = [];
                       }
                       byStory[storyIdStr].push({
                           file: file,
                           text: textContent,
                           storyId: storyIdStr,
                           audioId: audioId
                       });
                  } else {
                       // Story data exists, but conversation ID not found within it
                       console.warn(`Audio file ${file.path} links to story ${storyIdStr}, but conversation ID ${audioId} not found.`);
                       uncategorized.push(file);
                  }
              } else {
                  // Story data for this storyId doesn't exist (wasn't loaded or failed parsing)
                  console.warn(`Audio file ${file.path} links to non-existent or invalid story data for ID ${storyIdStr}.`);
                  uncategorized.push(file);
              }
          } else {
              // Path structure doesn't match /storyid/id.wav
              console.warn(`Audio file ${file.path} has unexpected path structure (expected /storyid/id.wav).`);
              uncategorized.push(file);
          }
      });

      // Sort within each story group by audioId
      for (const storyId in byStory) {
           byStory[storyId].sort((a, b) => a.audioId - b.audioId);
      }
      // Sort the story groups themselves by storyId (numeric comparison)
      const sortedByStoryKeys = Object.keys(byStory).sort((a, b) => Number(a) - Number(b));
      const sortedByStory = {};
      sortedByStoryKeys.forEach(key => sortedByStory[key] = byStory[key]);

      // Sort uncategorized files by path for consistency
      uncategorized.sort((a, b) => a.path.localeCompare(b.path));

      return { byStory: sortedByStory, uncategorized };
    },

    // classifiedImages computed property remains the same as previous version
    classifiedImages() {
       const characters = [];
       const title=[];
       const backgrounds = { byStory: {}, uncategorized: [] };

       const characterNames = new Set(Array.isArray(this.characterData) ? this.characterData.map(char => char && typeof char === 'object' ? char.name : null).filter(Boolean) : []);


       this.resourceCategories.images.forEach(file => {
           const imageNameWithoutExt = file.name.replace(/\.png$/, '');
           if (imageNameWithoutExt==="title"){
               title.push(file)
           }
           else if (characterNames.has(imageNameWithoutExt)) {
               characters.push(file);
           } else {
            let foundInStories = [];

            for (const storyId in this.storyData) {
                const storyJson = this.storyData[storyId];
                if (storyJson && typeof storyJson === 'object' && Array.isArray(storyJson.conversations)) {
                    const placeMatch = storyJson.conversations.some(c => c && typeof c === 'object' && c.place === imageNameWithoutExt && c.place !== "");
                    if (placeMatch) {
                        foundInStories.push(storyId);
                    }
                } else {
                    console.warn(`Invalid story data structure for story ID ${storyId} during image classification`, storyJson);
                }
            }

            if (foundInStories.length > 0) {
                // 对找到的故事ID进行排序，确保结果一致
                foundInStories.sort((a, b) => Number(a) - Number(b));
                
                // 在每个使用该场景的故事中都添加该图片
                foundInStories.forEach(storyId => {
                    if (!backgrounds.byStory[storyId]) {
                        backgrounds.byStory[storyId] = [];
                    }
                    // 创建文件的副本，避免引用同一对象
                    backgrounds.byStory[storyId].push({...file});
                });
            } else {
                backgrounds.uncategorized.push(file);
            }
           }
       });

       characters.sort((a, b) => a.name.localeCompare(b.name));

        const sortedBgByStoryKeys = Object.keys(backgrounds.byStory).sort((a, b) => Number(a) - Number(b));
       const sortedBgByStory = {};
       sortedBgByStoryKeys.forEach(key => {
            sortedBgByStory[key] = backgrounds.byStory[key];
            sortedBgByStory[key].sort((a, b) => a.name.localeCompare(b.name));
       });
        backgrounds.byStory = sortedBgByStory;

       backgrounds.uncategorized.sort((a, b) => a.name.localeCompare(b.name));

       return { characters, backgrounds, title };
    },

    // 关于缺失资源的计算属性
    hasMissingAudioResources() {
      return Object.values(this.missingAudioByStory).some(items => items.length > 0);
    },
    
    hasMissingImageResources() {
      return this.missingTitleImage || 
             this.missingCharacterImages.length > 0 || 
             Object.values(this.missingBackgroundsByStory).some(items => items.length > 0);
    },
    
    hasMissingResources() {
      return this.hasMissingAudioResources || 
             this.hasMissingImageResources || 
             this.missingMusicFiles.length > 0;
    },

    // 原有资源计算属性
    hasAudioResources() {
      return Object.keys(this.classifiedAudio.byStory).length > 0 || this.classifiedAudio.uncategorized.length > 0;
    },
    hasImageResources() {
      return this.classifiedImages.characters.length > 0 ||
             this.classifiedImages.title.length > 0 ||
             Object.keys(this.classifiedImages.backgrounds.byStory).length > 0 ||
             this.classifiedImages.backgrounds.uncategorized.length > 0;
    },
    hasMusicResources() {
      return this.resourceCategories.music.length > 0;
    },
    hasResources() {
      return this.hasAudioResources || this.hasImageResources || this.hasMusicResources;
    },
    
    // 新增：判断是否有选中的角色
    hasSelectedCharacters() {
      return this.characterSelectionList.some(char => char.selected);
    },
    
    // 新增：判断是否有选中的背景
    hasSelectedBackgrounds() {
      return this.backgroundSelectionList.some(place => place.selected);
    },
    
    // 新增：判断是否有任何角色正在生成中
    isAnyCharacterGenerating() {
      return Object.keys(this.isGenerating).some(key => key.startsWith('image-character-') && this.isGenerating[key]);
    }
  },
  watch: {
    storyTitle: {
      immediate: true,
      handler() {
        this.fetchResources();
      }
    }
  },
  mounted() {
    // Event listeners are bound in the template
  },
  beforeDestroy() {
    this.stopAudio();
    this.releaseObjectUrls();
  },
  methods: {
    // 设置localStorage的aiGalgameConfig剧情
    setStoryTitleConfig() {
      try {
        // 读取现有配置或创建新配置
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig'));
        
        // 确保剧情对象存在
        if (!config.剧情) {
          config.剧情 = {};
        }
        
        // 设置story_title
        config.剧情.story_title = this.storyTitle;
        
        // 保存回localStorage
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        console.log('已设置本地存储的剧情title为:', this.storyTitle);
      } catch (err) {
        console.error('设置localStorage配置失败:', err);
        this.showNotification('设置生成配置失败', 'error');
      }
    },

    // 新增：重新生成语音的方法
    async regenerateAudio(storyId) {
      // 设置localStorage配置
      this.setStoryTitleConfig();
      
      this.isGenerating[`audio-${storyId}`] = true;
      
      try {
        // 获取该故事片段下所有语音（包括缺失的）
        const existingItems = this.classifiedAudio.byStory[storyId] || [];
        const missingItems = this.missingAudioByStory[storyId] || [];
        
        try {
          await generateVoice(storyId);
          console.log(`已重新生成语音: 故事ID ${storyId}`);
        } catch (err) {
          console.error(`生成语音失败: 故事ID ${storyId}`, err);
          this.showNotification(`生成语音失败: 故事ID ${storyId}`, 'error');
        } finally {
          //this.$set(this.isGenerating, `audio-${storyId}-${item.audioId}`, false);
          //this.isGenerating[`audio-${storyId}-${item.audioId}`]=false;
        }
        
        
        
        this.showNotification(`故事片段 ${storyId} 的语音生成完成`, 'success');
        
        // 重新加载资源列表以显示新生成的资源
        await this.fetchResources();
        
      } catch (err) {
        console.error(`重新生成语音失败: 故事ID ${storyId}`, err);
        this.showNotification(`重新生成语音失败: 故事片段 ${storyId}`, 'error');
      } finally {
        //this.$set(this.isGenerating, `audio-${storyId}`, false);
        this.isGenerating[`audio-${storyId}`]=false;
      }
    },
        
    // 新增：重新生成标题图片的方法
    async regenerateTitleImage() {
      // 设置localStorage配置
      this.setStoryTitleConfig();
      
      //this.$set(this.isGenerating, 'image-title', true);
      this.isGenerating['image-title']=true;
      try {
        await getTitleImagesJS(1);
        console.log('已重新生成标题图片');
        this.showNotification('标题图片生成完成', 'success');
        
        // 重新加载资源列表以显示新生成的资源
        await this.fetchResources();
        
      } catch (err) {
        console.error('生成标题图片失败:', err);
        this.showNotification('生成标题图片失败', 'error');
      } finally {
        this.isGenerating['image-title']=false
        //this.$set(this.isGenerating, 'image-title', false);
      }
    },
    
    // 新增：显示人物选择对话框
    showCharacterSelection(isRegenerate) {
      this.isCharacterRegenerating = isRegenerate;
      
      // 准备人物选择列表
      if (isRegenerate) {
        // 重新生成：包括所有人物，默认全不选
        this.characterSelectionList = Array.isArray(this.characterData) 
          ? this.characterData
            .filter(char => char && typeof char === 'object' && char.name)
            .map(char => ({
              name: char.name,
              selected: false
            }))
          : [];
      } else {
        // 补齐：只包括缺失的人物，默认全选
        this.characterSelectionList = this.missingCharacterImages.map(item => ({
          name: item.name,
          selected: true
        }));
      }
      
      // 设置全选状态
      this.selectAllCharacters = this.characterSelectionList.length > 0 && 
                                this.characterSelectionList.every(char => char.selected);
      
      // 显示对话框
      this.showCharacterDialog = true;
    },
    
    // 新增：关闭人物选择对话框
    closeCharacterDialog() {
      this.showCharacterDialog = false;
      this.characterSelectionList = [];
    },
    
    // 新增：全选/取消全选人物
    toggleAllCharacters() {
      this.characterSelectionList.forEach(char => {
        char.selected = this.selectAllCharacters;
      });
    },
    
    // 新增：确认人物选择并生成
    async confirmCharacterSelection() {
      // 设置localStorage配置
      this.setStoryTitleConfig();
      
      // 获取选中的人物名称
      const selectedCharacters = this.characterSelectionList
        .filter(char => char.selected)
        .map(char => char.name);
      
      if (selectedCharacters.length === 0) {
        this.showNotification('请至少选择一个人物', 'warning');
        return;
      }
      
      // 关闭对话框
      this.closeCharacterDialog();
      
      // 设置生成状态
      //this.$set(this.isGenerating, 'image-characters', true);
      this.isGenerating['image-characters']=true;
      selectedCharacters.forEach(charName => {
        this.isGenerating[`image-character-${charName}`]=true;
        //this.$set(this.isGenerating, `image-character-${charName}`, true);
      });
      
      try {
        // 调用生成函数
        await getSinglePersonImageJS(selectedCharacters);
        console.log('已生成人物图片:', selectedCharacters);
        this.showNotification(`已生成 ${selectedCharacters.length} 个人物图片`, 'success');
        
        // 重新加载资源列表以显示新生成的资源
        await this.fetchResources();
        
      } catch (err) {
        console.error('生成人物图片失败:', err);
        this.showNotification('生成人物图片失败', 'error');
      } finally {
        // 重置生成状态
        //this.$set(this.isGenerating, 'image-characters', false);
        this.isGenerating['image-characters']=false;
        selectedCharacters.forEach(charName => {
          //this.$set(this.isGenerating, `image-character-${charName}`, false);
          this.isGenerating[`image-character-${charName}`]=false;
        });
      }
    },
    
    // 新增：显示背景选择对话框
    showBackgroundSelection(storyId, isRegenerate) {
      this.currentStoryId = storyId;
      this.isBackgroundRegenerating = isRegenerate;
      
      // 从故事数据中获取可能的背景场景
      const storyJson = this.storyData[storyId];
      const usedPlaces = new Set();
      
      if (storyJson && Array.isArray(storyJson.conversations)) {
        storyJson.conversations.forEach(conversation => {
          if (conversation && conversation.place && conversation.place !== "") {
            usedPlaces.add(conversation.place);
          }
        });
      }
      
      // 准备背景选择列表
      if (isRegenerate) {
        // 重新生成：包括所有背景，默认全不选
        this.backgroundSelectionList = Array.from(usedPlaces).map(place => ({
          name: place,
          selected: false
        }));
      } else {
        // 补齐：只包括缺失的背景，默认全选
        const missingBackgrounds = this.getMissingBackgroundsForStory(storyId);
        this.backgroundSelectionList = missingBackgrounds.map(item => ({
          name: item.name,
          selected: true
        }));
      }
      
      // 设置全选状态
      this.selectAllBackgrounds = this.backgroundSelectionList.length > 0 && 
                                 this.backgroundSelectionList.every(place => place.selected);
      
      // 显示对话框
      this.showBackgroundDialog = true;
    },
    
    // 新增：关闭背景选择对话框
    closeBackgroundDialog() {
      this.showBackgroundDialog = false;
      this.backgroundSelectionList = [];
      this.currentStoryId = null;
    },
    
    // 新增：全选/取消全选背景
    toggleAllBackgrounds() {
      this.backgroundSelectionList.forEach(place => {
        place.selected = this.selectAllBackgrounds;
      });
    },
    
    // 新增：确认背景选择并生成
    async confirmBackgroundSelection() {
      // 设置localStorage配置
      this.setStoryTitleConfig();
      
      const storyId = this.currentStoryId;
      
      // 获取选中的背景名称
      const selectedPlaces = this.backgroundSelectionList
        .filter(place => place.selected)
        .map(place => place.name);
      
      if (selectedPlaces.length === 0) {
        this.showNotification('请至少选择一个背景', 'warning');
        return;
      }
      
      // 关闭对话框
      this.closeBackgroundDialog();
      
      // 设置生成状态
      //his.$set(this.isGenerating, `image-bg-${storyId}`, true);
      this.isGenerating[`image-bg-${storyId}`]=true;
      selectedPlaces.forEach(placeName => {
        //this.$set(this.isGenerating, `image-bg-${storyId}-${placeName}`, true);
        this.isGenerating[`image-bg-${storyId}-${placeName}`]=true;
      });
      
      try {
        // 1. 合并故事数据
        await mergeStory(storyId);
        console.log(`已合并故事数据: 故事ID ${storyId}`);
        
        // 2. 写入选中的地点
        const placesPath = `/data/${this.storyTitle}/story/place.json`;
        const placesData = JSON.stringify(selectedPlaces);
        try {
          // 这里需要实现一个写入文件的方法，该示例假设IndexedDBFileSystem中有writeFile方法
          // 如果没有，您需要自行实现或修改此处逻辑
          await writeFile(placesPath, placesData);
          console.log(`已写入地点数据: ${placesPath}`, selectedPlaces);
        } catch (err) {
          console.error(`写入地点数据失败: ${placesPath}`, err);
          throw new Error(`写入地点数据失败: ${err.message}`);
        }
        
        // 3. 生成背景图片
        await getPlacesImagesJS(1);
        console.log(`已生成背景图片: 地点 ${selectedPlaces.join(', ')}`);
        this.showNotification(`已生成 ${selectedPlaces.length} 个背景图片`, 'success');
        
        // 重新加载资源列表以显示新生成的资源
        await this.fetchResources();
        
      } catch (err) {
        console.error(`生成背景图片失败: 故事ID ${storyId}`, err);
        this.showNotification('生成背景图片失败', 'error');
      } finally {
        // 重置生成状态
        //this.$set(this.isGenerating, `image-bg-${storyId}`, false);
        this.isGenerating[`image-bg-${storyId}`]=false;
        selectedPlaces.forEach(placeName => {
          //this.$set(this.isGenerating, `image-bg-${storyId}-${placeName}`, false);
          this.isGenerating[`image-bg-${storyId}-${placeName}`]=false;
        });
      }
    },
    
    // 新增：生成音乐的方法
    async regenerateMusic() {
      // 设置localStorage配置
      this.setStoryTitleConfig();
      
      //this.$set(this.isGenerating, 'music', true);
      this.isGenerating['music']=true;
      
      try {
        await generateBackgroundMusic(console.log);
        console.log('已生成背景音乐');
        this.showNotification('背景音乐生成完成', 'success');
        
        // 重新加载资源列表以显示新生成的资源
        await this.fetchResources();
        
      } catch (err) {
        console.error('生成背景音乐失败:', err);
        this.showNotification('生成背景音乐失败', 'error');
      } finally {
        //this.$set(this.isGenerating, 'music', false);
        this.isGenerating['music']=false;
      }
    },
    

    async fetchResources() {
      this.isLoading = true;
      this.error = null;
      // Reset state
      this.resourceCategories = { voice: [], images: [], music: [] };
      this.storyData = {};
      this.characterData = [];
      this.audioDirExists = false;
      this.imageDirExists = false;
      this.musicDirExists = false;
      this.storyDirExists = false;
      this.characterFileExists = false;
      this.selectedResource = null;
      this.previewUrl = null;
      this.releaseObjectUrls();
      // 重置缺失资源数据
      this.missingAudioByStory = {};
      this.missingTitleImage = null;
      this.missingCharacterImages = [];
      this.missingBackgroundsByStory = {};
      this.missingMusicFiles = [];
      // 重置生成状态
      this.isGenerating = {};

      const baseDir = `/data/${this.storyTitle}`;
      const audioDir = `${baseDir}/audio`; // Base audio directory
      const imagesDir = `${baseDir}/images`;
      const musicDir = `${baseDir}/music`;
      const storyDir = `${baseDir}/story`;
      const characterFilePath = `${baseDir}/character.json`;

      // Helper to safely list directory
      const safeListDirectory = async (path) => {
          try {
              const items = await listDirectory(path);
              return { items: items || [], exists: true };
          } catch (err) {
               if (err.message && (err.message.includes('目录不存在') || err.message.includes('标题') || err.message.includes('不存在'))) {
                   console.warn(`Directory "${path}" does not exist or access denied, skipping listing.`, err.message);
                   return { items: [], exists: false };
               } else {
                   console.error(`Failed to list directory "${path}":`, err);
                   throw err; // Rethrow unexpected errors
               }
          }
      };

       // Helper to safely read file
       const safeReadFile = async (path) => {
            try {
                const data = await readFile(path);
                // Check if data is explicitly undefined, often indicating file not found by readFile implementation
                if (data === undefined) {
                    console.warn(`File "${path}" read returned undefined, treating as non-existent.`);
                    return { data: null, exists: false };
                }
                return { data: data, exists: true };
            } catch (err) {
                 // Catch explicit errors from readFile
                if (err.message && (err.message.includes('文件不存在') || err.message.includes('不存在') || err.message.includes('无法读取'))) {
                    console.warn(`File "${path}" does not exist or access denied, skipping read.`, err.message);
                    return { data: null, exists: false };
                } else {
                    console.error(`Failed to read file "${path}":`, err);
                    throw err; // Rethrow unexpected errors
                }
            }
       };

       // Helper to process potentially pre-parsed JSON data
       const processJsonData = (rawData, filePath) => {
           if (typeof rawData === 'string') {
               try {
                  return JSON.parse(rawData);
               } catch (e) {
                   console.error(`Failed to parse JSON string from ${filePath}:`, e);
                   throw new Error(`Invalid JSON format in ${filePath}`);
               }
           } else if (rawData instanceof ArrayBuffer) {
               try {
                  return JSON.parse(new TextDecoder().decode(rawData));
               } catch(e) {
                   console.error(`Failed to decode/parse ArrayBuffer from ${filePath}:`, e);
                   throw new Error(`Invalid JSON format (from ArrayBuffer) in ${filePath}`);
               }
           } else if (typeof rawData === 'object' && rawData !== null) {
               // Assume it's already parsed correctly
               return rawData;
           } else {
               throw new Error(`Unexpected or invalid data type for ${filePath}: ${typeof rawData}`);
           }
       };


      try {
        // === Load Metadata Files (Character and Story) first ===

        // Load character.json
        const { data: characterFileData, exists: charFileExists } = await safeReadFile(characterFilePath);
        this.characterFileExists = charFileExists;
        if (charFileExists && characterFileData !== null) {
             try {
                  this.characterData = processJsonData(characterFileData, characterFilePath);
                  if (!Array.isArray(this.characterData)) {
                      console.error('Character data is not an array:', this.characterData);
                      this.showNotification('character.json 格式错误 (应为数组)', 'error');
                      this.characterData = [];
                  } else {
                     console.log('Character data loaded successfully.');
                  }
             } catch (e) {
                 this.showNotification(`处理 character.json 失败: ${e.message}`, 'error');
                 this.characterData = [];
             }
        } else {
             console.log(`Character file "${characterFilePath}" ${charFileExists ? 'read returned null' : 'does not exist or is inaccessible.'}`);
        }

        // Load story/{id}.json files
        const { items: storyItems, exists: sDirExists } = await safeListDirectory(storyDir);
        this.storyDirExists = sDirExists;
        if (sDirExists && storyItems.length > 0) {
             const jsonFiles = storyItems.filter(item =>
                 !item.isFolder &&
                 item.name.endsWith('.json') &&
                 /^\d+$/.test(item.name.replace(/\.json$/, ''))
             );
             console.log(`Found ${jsonFiles.length} numeric story JSON files to process.`);

             const storyPromises = jsonFiles.map(async file => {
                 const { data: fileData, exists: fileExists } = await safeReadFile(file.path);
                 if (fileExists && fileData !== null) {
                     try {
                         const storyId = file.name.replace(/\.json$/, '');
                         const jsonData = processJsonData(fileData, file.path);
                          if (typeof jsonData !== 'object' || jsonData === null || !Array.isArray(jsonData.conversations)) {
                              throw new Error("Missing or non-array 'conversations' property.");
                          }
                         return { id: storyId, json: jsonData };
                     } catch (e) {
                         console.error(`Failed to process story JSON ${file.name}:`, e);
                         this.showNotification(`处理故事 JSON "${file.name}" 失败: ${e.message}`, 'error');
                         return null; // Skip this file on error
                     }
                 } else {
                      console.log(`Story file "${file.path}" ${fileExists ? 'read returned null' : 'does not exist or is inaccessible.'}`);
                      return null; // Skip if file doesn't exist or read failed safely
                 }
             });

            const storyResults = await Promise.all(storyPromises);
            this.storyData = storyResults.reduce((acc, result) => {
                 if (result && result.id && result.json) {
                     acc[result.id] = result.json; // Key is the string ID
                 }
                 return acc;
            }, {});
            console.log('Story data loaded for IDs:', Object.keys(this.storyData));

        } else {
             console.log(`Story directory "${storyDir}" ${sDirExists ? 'is empty or contains no numeric JSON files' : 'does not exist or is inaccessible.'}`);
        }

        // === Load Resource Files (Audio, Image, Music) ===

        // Load Audio Resources from /audio/{storyid}/{id}.wav
        const { items: audioTopLevelItems, exists: aDirExists } = await safeListDirectory(audioDir);
        this.audioDirExists = aDirExists;
        const collectedAudioFiles = []; // Use a temporary array

        if (aDirExists && audioTopLevelItems.length > 0) {
            const subDirPromises = audioTopLevelItems
                // Filter for top-level items that are folders with numeric names
                .filter(item => item.isFolder && /^\d+$/.test(item.name))
                .map(async (folderItem) => {
                    const storyId = folderItem.name;
                    const subDirPath = `${audioDir}/${storyId}`;
                    try {
                        // List contents of the numeric subdirectory
                                                // List contents of the numeric subdirectory
                        const { items: filesInFolder, exists: subDirListed } = await safeListDirectory(subDirPath);
                         if (subDirListed) {
                              // Filter for .wav files directly inside this storyId folder whose name is {id}.wav
                              return filesInFolder.filter(f =>
                                  !f.isFolder &&
                                  f.name.endsWith('.wav') &&
                                  /^\d+\.wav$/.test(f.name)
                              );
                         } else {
                              return []; // Subdirectory listing failed safely
                         }
                    } catch (subDirError) {
                        // Catch errors if safeListDirectory rethrows
                        console.error(`Error listing audio sub-directory ${subDirPath}:`, subDirError);
                        return []; // Return empty on error
                    }
                });

            // Wait for all subdirectory listings to complete
            const filesFromSubDirs = await Promise.all(subDirPromises);
            // Flatten the array of arrays and add to collectedAudioFiles
            filesFromSubDirs.forEach(files => collectedAudioFiles.push(...files));

            console.log('Audio items fetched from story subfolders:', collectedAudioFiles.length);

        } else {
             console.log(`Audio directory "${audioDir}" ${aDirExists ? 'is empty or contains no numeric subfolders' : 'does not exist or is inaccessible.'}`);
        }

        // Assign the collected files to the reactive property
        this.resourceCategories.voice = collectedAudioFiles;

        // Load Image Resources (assuming flat structure in /images)
        const { items: imageItems, exists: iDirExists } = await safeListDirectory(imagesDir);
        this.imageDirExists = iDirExists;
        if (iDirExists) {
            this.resourceCategories.images = imageItems.filter(item => !item.isFolder && item.name.endsWith('.png'));
            console.log('Image items fetched:', this.resourceCategories.images.length);
        } else {
             console.log(`Image directory "${imagesDir}" does not exist or is inaccessible.`);
        }

        // Load Music Resources (assuming flat structure in /music)
        const { items: musicItems, exists: mDirExists } = await safeListDirectory(musicDir);
        this.musicDirExists = mDirExists;
        if (mDirExists) {
            this.resourceCategories.music = musicItems.filter(item => !item.isFolder && item.name.endsWith('.mp3'));
             console.log('Music items fetched:', this.resourceCategories.music.length);
        } else {
             console.log(`Music directory "${musicDir}" does not exist or is inaccessible.`);
        }

        // 生成"本应存在"但实际不存在的资源列表
        this.generateMissingResourcesList();

         // Log the final count of raw resources
         const totalResources = this.resourceCategories.voice.length + this.resourceCategories.images.length + this.resourceCategories.music.length;
         console.log(`Total raw resource files loaded for "${this.storyTitle}": ${totalResources}`);

      } catch (err) {
        // Catch errors rethrown by helpers or other unexpected errors
        console.error('加载资源列表或元数据时发生严重错误:', err);
        this.error = err.message || '发生未知错误';
        this.showNotification('加载资源时发生严重错误', 'error');
      } finally {
        this.isLoading = false;
      }
    },

    // 生成缺失资源列表的新方法
    generateMissingResourcesList() {
      // 1. 检查缺失的语音文件
      this.findMissingAudioFiles();
      
      // 2. 检查缺失的图片文件
      this.findMissingImageFiles();
      
      // 3. 检查缺失的音乐文件
      this.findMissingMusicFiles();
      
      console.log('生成缺失资源列表完成');
      console.log('- 缺失语音:', Object.keys(this.missingAudioByStory).length > 0);
      console.log('- 缺失封面图:', !!this.missingTitleImage);
      console.log('- 缺失角色图:', this.missingCharacterImages.length);
      console.log('- 缺失背景图:', Object.keys(this.missingBackgroundsByStory).length);
      console.log('- 缺失音乐:', this.missingMusicFiles.length);
    },
    
    // 查找缺失的语音文件
    findMissingAudioFiles() {
      // 遍历所有故事数据
      for (const storyId in this.storyData) {
        const storyJson = this.storyData[storyId];
        if (storyJson && Array.isArray(storyJson.conversations)) {
          // 获取故事片段ID的已有语音文件
          const existingAudioItems = this.classifiedAudio.byStory[storyId] || [];
          const existingAudioIds = new Set(existingAudioItems.map(item => item.audioId));
          
          // 检查每个对话项
          const missingAudios = [];
          storyJson.conversations.forEach(conversation => {
            // 找出具有有效character且带有id的对话
            if (conversation && conversation.character && conversation.character !== "" && 
                typeof conversation.id === 'number') {
              const audioId = conversation.id;
              
              // 如果该ID的语音文件不存在，添加到缺失列表
              if (!existingAudioIds.has(audioId)) {
                const final_text=conversation.text.replace(/[\(（].*?[\)）]/g, '').replace(/ /g, "，").replace(/\n/g, "。");
                while (final_text.startsWith("，") || final_text.startsWith("。")) {
                    final_text = final_text.substring(1);
                }
                if (final_text.trim()){
                missingAudios.push({
                  id: audioId,
                  name: `${audioId}.wav`,
                  text: conversation.text || `对话 ${audioId}`,
                  path: `/data/${this.storyTitle}/audio/${storyId}/${audioId}.wav`,
                  type: 'audio',
                  isMissing: true
                });
              }
              }
            }
          });
          
          // 如果有缺失的语音文件，添加到对应故事ID
          if (missingAudios.length > 0) {
            this.missingAudioByStory[storyId] = missingAudios;
          }
        }
      }
    },
    
    // 查找缺失的图片文件
    findMissingImageFiles() {
      // 1. 检查缺失的标题图片
      const titleImageExists = this.classifiedImages.title.length > 0;
      if (!titleImageExists) {
        this.missingTitleImage = {
          name: 'title',
          path: `/data/${this.storyTitle}/images/title.png`,
          type: 'image',
          isMissing: true
        };
      }
      
      // 2. 检查缺失的人物图片
      if (Array.isArray(this.characterData)) {
        const existingCharacterImages = new Set(
          this.classifiedImages.characters.map(file => file.name.replace(/\.png$/, ''))
        );
        
        this.characterData.forEach(character => {
          if (character && character.name && !existingCharacterImages.has(character.name)) {
            this.missingCharacterImages.push({
              name: character.name,
              path: `/data/${this.storyTitle}/images/${character.name}.png`,
              type: 'image',
              isMissing: true
            });
          }
        });
      }
      
      // 3. 检查缺失的背景图片
      for (const storyId in this.storyData) {
          const storyJson = this.storyData[storyId];
          if (storyJson && Array.isArray(storyJson.conversations)) {
            // 获取故事片段中使用的所有非空背景场景
            const usedPlaces = new Set();
            storyJson.conversations.forEach(conversation => {
              if (conversation && conversation.place && conversation.place !== "") {
                usedPlaces.add(conversation.place);
              }
            });
            
            // 如果该故事片段有背景场景
            if (usedPlaces.size > 0) {
              // 获取该故事片段已有的背景图片
              const existingBackgrounds = this.classifiedImages.backgrounds.byStory[storyId] || [];
              const existingBackgroundNames = new Set(
                existingBackgrounds.map(file => file.name.replace(/\.png$/, ''))
              );
              
              // 检查缺失的背景图片
              const missingBackgrounds = [];
              usedPlaces.forEach(place => {
                if (!existingBackgroundNames.has(place)) {
                  missingBackgrounds.push({
                    name: place,
                    path: `/data/${this.storyTitle}/images/${place}.png`,
                    type: 'image',
                    isMissing: true
                  });
                }
              });
              
              // 如果有缺失的背景图片，添加到对应故事ID
              if (missingBackgrounds.length > 0) {
                this.missingBackgroundsByStory[storyId] = missingBackgrounds;
              }
            }
          }
        }
    },
    
    // 查找缺失的音乐文件
    findMissingMusicFiles() {
      // 检查预期的音乐文件是否存在
      const existingMusicNames = new Set(
        this.resourceCategories.music.map(file => file.name)
      );
      
      this.expectedMusicFiles.forEach(musicFile => {
        if (!existingMusicNames.has(musicFile)) {
          this.missingMusicFiles.push({
            name: musicFile,
            path: `/data/${this.storyTitle}/music/${musicFile}`,
            type: 'audio',
            isMissing: true
          });
        }
      });
    },
    
    // 获取特定故事ID的缺失语音
    getMissingAudioForStory(storyId) {
      return this.missingAudioByStory[storyId] || [];
    },
    
    // 获取特定故事ID的缺失背景图
    getMissingBackgroundsForStory(storyId) {
      return this.missingBackgroundsByStory[storyId] || [];
    },
    
    // 处理点击缺失资源的事件
    handleMissingResourceClick(item) {
      this.showNotification(`资源 "${item.name}" 不存在，无法预览`, 'warning');
      this.selectedResource = item;
      this.previewUrl = null;
      this.previewError = true;
      this.loadingPreview = false;
    },

    // selectResource and other methods remain the same as the previous version
    async selectResource(resource, type) {
      if (this.selectedResource && this.selectedResource.path === resource.path) {
           if (type === 'audio' && this.$refs.audioPlayer) {
               if (this.$refs.audioPlayer.paused) {
                   this.$refs.audioPlayer.play().catch(e => console.error("继续播放音频失败:", e));
               } else {
                   this.$refs.audioPlayer.pause();
               }
           }
           return;
      }

      this.stopAudio();
      this.releaseObjectUrls();
      this.selectedResource = null;
      this.previewUrl = null;
      this.previewError = false;
      this.loadingPreview = true;
      this.selectedResource = { ...resource, type };
      console.log('Selecting resource:', this.selectedResource);

      try {
        const fileData = await readFile(resource.path);
         if (fileData === undefined || fileData === null) {
             throw new Error(`读取文件失败 (null/undefined)`);
         }
        console.log(`File read successful for ${resource.name}, data type:`, fileData.constructor.name);

        if (fileData instanceof Blob || fileData instanceof ArrayBuffer) {
           const blob = fileData instanceof ArrayBuffer ? new Blob([fileData]) : fileData;
           const url = URL.createObjectURL(blob);
           this.previewUrl = url;
           this.objectUrls[resource.path] = url;
           console.log('Blob URL created:', url);

           if (type === 'audio') {
               await this.$nextTick();
               if (this.$refs.audioPlayer) {
                    this.$refs.audioPlayer.load();
                    this.$refs.audioPlayer.play().catch(e => {
                         console.warn("音频自动播放失败:", e);
                         this.showNotification('音频自动播放失败，请手动播放', 'warning');
                         this.previewError = false;
                    });
               } else {
                    console.error("Audio element ref not available after nextTick.");
                    this.previewError = true;
                    this.showNotification('无法获取音频播放器', 'error');
               }
           } else if (type === 'image') {
               console.log('Image preview URL set.');
           } else {
               this.previewError = true;
           }
        } else {
           console.warn(`读取的数据类型 (${fileData.constructor.name}) 无法创建 Blob URL.`);
           this.previewError = true;
           this.showNotification('无法预览此文件类型', 'warning');
        }
      } catch (err) {
        console.error(`选择或读取文件 ${resource.path} 失败:`, err);
        this.previewError = true;
        this.showNotification(`加载预览 "${resource.name}" 失败: ${err.message}`, 'error');
      } finally {
         this.loadingPreview = false;
         console.log('Preview loading finished.');
      }
    },

    stopAudio() {
      console.log('Attempting to stop audio...');
      if (this.$refs.audioPlayer) {
          if (!this.$refs.audioPlayer.paused) {
              this.$refs.audioPlayer.pause();
          }
           this.$refs.audioPlayer.removeAttribute('src');
           this.$refs.audioPlayer.load();
           console.log('Audio stopped and source cleared.');
      }
    },

    handleAudioError(e) {
        console.error('音频播放错误:', e);
        const error = e.target.error;
        let errorMessage = '音频播放失败';
        if (error) {
            switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED: errorMessage += ': 中断'; break;
                case MediaError.MEDIA_ERR_NETWORK: errorMessage += ': 网络错误'; break;
                case MediaError.MEDIA_ERR_DECODE: errorMessage += ': 解码错误'; break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMessage += ': 源不支持'; break;
                default: errorMessage += ': 未知'; break;
            }
             console.error('MediaError code:', error.code, 'message:', error.message);
        }
        this.previewError = true;
        this.showNotification(errorMessage, 'error');
        this.stopAudio();
    },

    handleAudioEnded() {
         console.log('音频播放结束');
    },

    releaseObjectUrls() {
       console.log('Releasing object URLs...');
       for (const path in this.objectUrls) {
           if (this.objectUrls[path]) {
               URL.revokeObjectURL(this.objectUrls[path]);
               console.log('Revoked URL for:', path);
           }
       }
       this.objectUrls = {};
    },

    showNotification(message, type = 'info') {
       if (!this._isDestroyed) {
           this.$emit('show-message', { title: type, message: message});
           console.log(`[ReadResources][${type.toUpperCase()}] ${message}`);
       } else {
           console.log(`[ReadResources][${type.toUpperCase()}][Destroyed] ${message}`);
       }
    },

    close() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
/* 更新的样式支持亮色和深色模式 */
.resource-viewer {
  padding: 20px;
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--text-primary);
  background-color: var(--content-bg);
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.loading-indicator, .error-state, .empty-state {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  border-radius: 8px;
  background-color: var(--sidebar-bg);
  margin: 10px 0;
}

.loading-indicator.small, .error-state.small, .preview-placeholder.small {
  padding: 10px;
  font-size: 0.9em;
  color: var(--text-secondary);
}

.resource-content {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 30px;
  flex-grow: 1;
  overflow: hidden;
}

.resource-list-area {
  overflow-y: auto;
  padding-right: 15px;
  scrollbar-width: thin;
  scrollbar-color: var(--text-secondary) var(--sidebar-bg);
}

/* 美化滚动条 */
.resource-list-area::-webkit-scrollbar {
  width: 6px;
}

.resource-list-area::-webkit-scrollbar-track {
  background: var(--sidebar-bg);
  border-radius: 10px;
}

.resource-list-area::-webkit-scrollbar-thumb {
  background-color: var(--text-secondary);
  border-radius: 10px;
}

.resource-category {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.resource-category:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.resource-category h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-color);
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--primary-color);
  display: inline-block;
}

.voice-folder {
  margin-bottom: 15px;
  padding: 15px;
  background-color: var(--sidebar-bg);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.voice-folder.sub-folder {
  margin-top: 10px;
  margin-bottom: 5px;
  padding: 12px;
  background-color: var(--content-bg);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
}

.voice-folder h4 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-top: 0;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.voice-folder h5 {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-top: 0;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px dotted var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.resource-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.resource-items li {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background-color: var(--content-bg);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: relative;
}

.resource-items li:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background-color: var(--hover-bg);
}

.resource-items li.selected {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.resource-icon {
  margin-right: 10px;
  font-size: 16px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.resource-items li.selected .resource-icon {
  color: white;
}

.resource-items li span {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  flex-grow: 1;
  font-size: 14px;
}

.resource-preview-area {
  overflow-y: auto;
  padding: 25px;
  background-color: var(--sidebar-bg);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.preview-placeholder {
  text-align: center;
  color: var(--text-secondary);
  padding: 40px;
  border: 2px dashed var(--border-color);
  border-radius: 10px;
  width: 100%;
  margin-top: 20px;
}

.preview-content {
  width: 100%;
  max-width: 600px;
  text-align: center;
}

.preview-content h4 {
  font-size: 18px;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--text-primary);
  word-break: break-word;
  position: relative;
  display: inline-block;
}

.preview-content h4:after {
  content: '';
  position: absolute;
  width: 50%;
  height: 2px;
  background-color: var(--primary-color);
  bottom: -8px;
  left: 25%;
}

.preview-container {
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--content-bg);
  border-radius: 10px;
  box-shadow: var(--shadow);
  min-height: 150px;
  padding: 20px;
  transition: all 0.3s ease;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.audio-preview {
  width: 100%;
  padding: 15px;
  background-color: var(--hover-bg);
  border-radius: 8px;
}

.audio-preview audio {
  width: 100%;
  display: block;
  border-radius: 8px;
}

/* 缺失资源的特殊样式 */
.missing-resource {
  background-color: var(--content-bg) !important;
  border: 1px dashed #ff6b6b !important;
  opacity: 0.8;
  position: relative;
}

.missing-resource:hover {
  opacity: 1;
  border-color: #ff4757 !important;
  background-color: rgba(255, 107, 107, 0.1) !important;
}

.missing-icon {
  color: #ff6b6b !important;
}

.missing-label {
  font-size: 0.85em;
  color: #ff6b6b;
  font-style: italic;
  margin-left: 5px;
  font-weight: 500;
}

.missing-folder {
  border: 1px dashed #ff6b6b;
  background-color: rgba(255, 107, 107, 0.05);
}

.missing-section-label {
  font-size: 0.85em;
  color: #ff6b6b;
  font-style: italic;
  margin-left: 5px;
}

/* 新增：重新生成按钮和补齐资源按钮样式 */
.btn-regenerate, .btn-complete {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.btn-regenerate {
  background-color: var(--primary-color);
}

.btn-complete {
  background-color: #4CAF50;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.btn-regenerate:hover, .btn-complete:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-regenerate:disabled, .btn-complete:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}

/* 新增：对话框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-dialog {
  width: 90%;
  max-width: 500px;
  background-color: var(--content-bg);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
  max-height: 50vh;
  overflow-y: auto;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel, .btn-confirm {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
}

.btn-cancel {
  background-color: var(--sidebar-bg);
  color: var(--text-primary);
}

.btn-confirm {
  background-color: var(--primary-color);
  color: white;
}

.btn-confirm:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* 选择选项样式 */
.selection-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.select-all-container {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  cursor: pointer;
  user-select: none;
}

.character-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.character-options label {
  display: flex;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
}

.character-options label:hover {
  background-color: var(--hover-bg);
}

/* 响应式设计优化 */
@media (max-width: 768px) {
  .resource-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .resource-list-area, .resource-preview-area {
    padding-right: 0;
    overflow-y: visible;
    max-height: none;
  }

  .resource-preview-area {
    padding: 15px;
  }

  .resource-category h3 { 
    font-size: 16px; 
  }
  
  .voice-folder h4 { 
    font-size: 15px; 
  }
  
  .voice-folder h5 { 
    font-size: 13px; 
  }
  
  .resource-items li { 
    font-size: 14px; 
    padding: 10px; 
  }
  
  .resource-icon { 
    font-size: 16px; 
  }
  
  .preview-content h4 { 
    font-size: 15px; 
  }
  
  .preview-container { 
    max-height: 300px; 
  }

  .resource-items {
    grid-template-columns: 1fr;
  }
  
  .modal-dialog {
    width: 95%;
  }
  
  .character-options {
    grid-template-columns: 1fr;
  }
}

/* 资源项目的动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.resource-items li {
  animation: fadeIn 0.3s ease-out forwards;
}

/* 改进的暗色模式支持 */
.dark-theme .resource-viewer {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark-theme .resource-items li {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.dark-theme .resource-items li:hover {
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.dark-theme .preview-container {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.dark-theme .preview-image {
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
}

/* 暗色模式下缺失资源的样式调整 */
.dark-theme .missing-resource {
  border-color: #ff6b6b !important;
}

.dark-theme .missing-resource:hover {
  background-color: rgba(255, 107, 107, 0.15) !important;
}

.dark-theme .missing-folder {
  background-color: rgba(255, 107, 107, 0.08);
}

/* 暗色模式下对话框样式调整 */
.dark-theme .modal-dialog {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}
</style>