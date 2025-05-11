<template>
  <div class="resource-viewer">
    <div v-if="isLoading" class="loading-indicator">
      <!-- Use FontAwesomeIcon if globally registered -->
       <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon-fa large" />
      <span>加载资源中...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="error-icon-fa large" />
      <p>加载资源失败: {{ error }}</p>
    </div>

    <!-- New Layout Container -->
    <div v-else class="resource-layout-container">

      <!-- Resource List Area (Scrollable Left Panel) -->
      <div class="resource-list-area card">
        <div v-if="!hasResources && !hasMissingResources" class="empty-state">
          <font-awesome-icon :icon="['fas', 'box-open']" class="empty-icon-fa medium" />
          <p>此故事暂无资源文件。</p>
          <p v-if="!audioDirExists && !imageDirExists && !musicDirExists && !storyDirExists && !characterFileExists" class="text-muted">(对应的资源目录或文件不存在)</p>
        </div>
        <div v-else class="resource-list-content">
          <!-- Voice Resources -->
          <div v-if="hasAudioResources || hasMissingAudioResources" class="resource-category">
            <h3 class="category-title"><font-awesome-icon :icon="['fas', 'volume-up']" /> 语音 (audio)</h3>
            <!-- Story Segment Audio -->
            <div v-for="(audioItems, storyId) in classifiedAudio.byStory" :key="'audio-story-' + storyId" class="resource-folder">
              <h4 class="folder-title">
                <font-awesome-icon :icon="['fas', 'folder']" /> 故事片段 {{ storyId }}
              </h4>
              <ul class="resource-items">
                <li v-for="item in audioItems" :key="item.file.path"
                    :class="['resource-item', { selected: selectedResource && selectedResource.path === item.file.path }]"
                    @click="selectResource(item.file, 'audio')"
                    :title="`路径: ${item.file.path}`">
                  <font-awesome-icon :icon="['fas', 'volume-up']" class="resource-icon audio-icon" />
                  <span class="item-label">{{ item.text || `[${item.file.name}]` }}</span>
                </li>
                <!-- Missing Audio -->
                <li v-for="item in getMissingAudioForStory(storyId)" :key="'missing-' + item.id"
                    class="resource-item missing-resource"
                    @click="handleMissingResourceClick(item)">
                  <font-awesome-icon v-if="isGenerating[`audio-${storyId}-${item.id}`]" :icon="['fas', 'spinner']" spin class="resource-icon missing-icon generating" />
                  <font-awesome-icon v-else :icon="['fas', 'volume-mute']" class="resource-icon missing-icon" />
                  <span class="item-label">{{ item.text }} <span class="missing-tag">[缺失]</span></span>
                  <button class="btn btn-warning btn-xs btn-action" @click.stop="regenerateAudio(storyId)" :disabled="isGenerating[`audio-${storyId}-${item.id}`]">
                    <font-awesome-icon v-if="isGenerating[`audio-${storyId}-${item.id}`]" :icon="['fas', 'spinner']" spin />
                    <font-awesome-icon v-else :icon="['fas', 'plus']" /> 补齐
                  </button>
                </li>
              </ul>
            </div>
            <!-- Missing Story Segment Audio -->
             <template v-for="(items, storyId) in missingAudioByStory" :key="'missing-story-audio-' + storyId">
                 <div v-if="!classifiedAudio.byStory[storyId]" class="resource-folder missing-folder">
                    <h4 class="folder-title missing">
                       <font-awesome-icon :icon="['fas', 'folder-minus']" /> 故事片段 {{ storyId }} <span class="missing-tag">[缺失]</span>
                       <button class="btn btn-danger btn-xs btn-action" @click="regenerateAudio(storyId)" :disabled="isGenerating[`audio-${storyId}`]">
                         <font-awesome-icon v-if="isGenerating[`audio-${storyId}`]" :icon="['fas', 'spinner']" spin />
                         <font-awesome-icon v-else :icon="['fas', 'sync-alt']" /> 重生成
                       </button>
                    </h4>
                    <ul class="resource-items">
                       <li v-for="item in items" :key="'missing-full-' + item.id" class="resource-item missing-resource" @click="handleMissingResourceClick(item)">
                          <font-awesome-icon v-if="isGenerating[`audio-${storyId}-${item.id}`]" :icon="['fas', 'spinner']" spin class="resource-icon missing-icon generating" />
                          <font-awesome-icon v-else :icon="['fas', 'volume-mute']" class="resource-icon missing-icon" />
                          <span class="item-label">{{ item.text }} <span class="missing-tag">[缺失]</span></span>
                         <button class="btn btn-warning btn-xs btn-action" @click.stop="regenerateAudio(storyId)" :disabled="isGenerating[`audio-${storyId}-${item.id}`]">
                            <font-awesome-icon v-if="isGenerating[`audio-${storyId}-${item.id}`]" :icon="['fas', 'spinner']" spin />
                            <font-awesome-icon v-else :icon="['fas', 'plus']" /> 补齐
                         </button>
                       </li>
                    </ul>
                 </div>
            </template>
            <!-- Uncategorized Audio -->
            <div v-if="classifiedAudio.uncategorized.length > 0" class="resource-folder">
              <h4 class="folder-title"><font-awesome-icon :icon="['fas', 'question-circle']" /> 其他语音</h4>
              <ul class="resource-items">
                <li v-for="file in classifiedAudio.uncategorized" :key="file.path"
                     :class="['resource-item', { selected: selectedResource && selectedResource.path === file.path }]"
                     @click="selectResource(file, 'audio')" :title="`路径: ${file.path}`">
                   <font-awesome-icon :icon="['fas', 'volume-up']" class="resource-icon audio-icon" />
                   <span class="item-label">{{ file.name }}</span>
                 </li>
              </ul>
            </div>
          </div>

          <!-- Image Resources -->
          <div v-if="hasImageResources || hasMissingImageResources" class="resource-category">
            <h3 class="category-title"><font-awesome-icon :icon="['fas', 'image']" /> 图片 (images)</h3>
            <!-- Title Image -->
            <div v-if="classifiedImages.title.length > 0 || missingTitleImage" class="resource-folder">
              <h4 class="folder-title">
                <font-awesome-icon :icon="['fas', 'bookmark']" /> 封面图片
                <button class="btn btn-secondary btn-xs btn-action" @click="regenerateTitleImage()" :disabled="isGenerating['image-title']">
                  <font-awesome-icon v-if="isGenerating['image-title']" :icon="['fas', 'spinner']" spin />
                  <font-awesome-icon v-else :icon="['fas', 'sync-alt']" /> 重生成
                </button>
              </h4>
              <ul class="resource-items">
                <li v-for="file in classifiedImages.title" :key="file.path"
                    :class="['resource-item', { selected: selectedResource && selectedResource.path === file.path }]"
                    @click="selectResource(file, 'image')" :title="`路径: ${file.path}`">
                  <font-awesome-icon :icon="['fas', 'image']" class="resource-icon image-icon" />
                  <span class="item-label">{{ file.name }}</span>
                </li>
                <li v-if="missingTitleImage" class="resource-item missing-resource" @click="handleMissingResourceClick(missingTitleImage)">
                  <font-awesome-icon v-if="isGenerating['image-title']" :icon="['fas', 'spinner']" spin class="resource-icon missing-icon generating" />
                   <font-awesome-icon v-else :icon="['fas', 'image']" class="resource-icon missing-icon faded" />
                  <span class="item-label">title.png <span class="missing-tag">[缺失]</span></span>
                  <button class="btn btn-warning btn-xs btn-action" @click.stop="regenerateTitleImage()" :disabled="isGenerating['image-title']">
                     <font-awesome-icon v-if="isGenerating['image-title']" :icon="['fas', 'spinner']" spin />
                     <font-awesome-icon v-else :icon="['fas', 'plus']" /> 补齐
                  </button>
                </li>
              </ul>
            </div>
            <!-- Character Images -->
            <div v-if="classifiedImages.characters.length > 0 || missingCharacterImages.length > 0" class="resource-folder">
               <h4 class="folder-title">
                 <font-awesome-icon :icon="['fas', 'user-friends']" /> 人物
                 <button class="btn btn-secondary btn-xs btn-action" @click="showCharacterSelection(true)" :disabled="isGenerating['image-characters']">
                   <font-awesome-icon v-if="isGenerating['image-characters']" :icon="['fas', 'spinner']" spin />
                   <font-awesome-icon v-else :icon="['fas', 'sync-alt']" /> 重生成
                 </button>
               </h4>
               <ul class="resource-items">
                 <li v-for="file in classifiedImages.characters" :key="file.path" :class="['resource-item', { selected: selectedResource && selectedResource.path === file.path }]" @click="selectResource(file, 'image')" :title="`路径: ${file.path}`">
                    <font-awesome-icon :icon="['fas', 'image']" class="resource-icon image-icon" />
                    <span class="item-label">{{ file.name }}</span>
                 </li>
                 <li v-for="item in missingCharacterImages" :key="'missing-char-' + item.name" class="resource-item missing-resource" @click="handleMissingResourceClick(item)">
                     <font-awesome-icon v-if="isGenerating[`image-character-${item.name}`]" :icon="['fas', 'spinner']" spin class="resource-icon missing-icon generating" />
                     <font-awesome-icon v-else :icon="['fas', 'image']" class="resource-icon missing-icon faded" />
                     <span class="item-label">{{ item.name }}.png <span class="missing-tag">[缺失]</span></span>
                     <button class="btn btn-warning btn-xs btn-action" @click.stop="showCharacterSelection(false)" :disabled="isGenerating['image-characters'] || isAnyCharacterGenerating">
                         <font-awesome-icon v-if="isGenerating['image-characters'] || isAnyCharacterGenerating" :icon="['fas', 'spinner']" spin />
                         <font-awesome-icon v-else :icon="['fas', 'plus']" /> 补齐
                     </button>
                 </li>
               </ul>
            </div>
             <!-- Background Images -->
            <div v-if="Object.keys(classifiedImages.backgrounds.byStory).length > 0 || Object.keys(missingBackgroundsByStory).length > 0" class="resource-folder">
                 <h4 class="folder-title"><font-awesome-icon :icon="['fas', 'map-marked-alt']" /> 背景图 (按故事片段)</h4>
                 <!-- Existing Backgrounds -->
                 <div v-for="(bgFiles, storyId) in classifiedImages.backgrounds.byStory" :key="'bg-story-' + storyId" class="resource-folder sub-folder">
                     <h5 class="sub-folder-title">
                         <font-awesome-icon :icon="['fas', 'folder-open']" /> 故事片段 {{ storyId }}
                         <button class="btn btn-secondary btn-xs btn-action" @click="showBackgroundSelection(storyId, true)" :disabled="isGenerating[`image-bg-${storyId}`]">
                             <font-awesome-icon v-if="isGenerating[`image-bg-${storyId}`]" :icon="['fas', 'spinner']" spin />
                             <font-awesome-icon v-else :icon="['fas', 'sync-alt']" /> 重生成
                         </button>
                     </h5>
                     <ul class="resource-items">
                         <li v-for="file in bgFiles" :key="file.path" :class="['resource-item', { selected: selectedResource && selectedResource.path === file.path }]" @click="selectResource(file, 'image')" :title="`路径: ${file.path}`">
                            <font-awesome-icon :icon="['fas', 'image']" class="resource-icon image-icon" />
                            <span class="item-label">{{ file.name }}</span>
                         </li>
                         <!-- Missing within existing story ID -->
                         <li v-for="item in getMissingBackgroundsForStory(storyId)" :key="'missing-bg-' + storyId + '-' + item.name" class="resource-item missing-resource" @click="handleMissingResourceClick(item)">
                             <font-awesome-icon v-if="isGenerating[`image-bg-${storyId}-${item.name}`]" :icon="['fas', 'spinner']" spin class="resource-icon missing-icon generating" />
                             <font-awesome-icon v-else :icon="['fas', 'image']" class="resource-icon missing-icon faded" />
                             <span class="item-label">{{ item.name }}.png <span class="missing-tag">[缺失]</span></span>
                             <button class="btn btn-warning btn-xs btn-action" @click.stop="showBackgroundSelection(storyId, false)" :disabled="isGenerating[`image-bg-${storyId}`]">
                                 <font-awesome-icon v-if="isGenerating[`image-bg-${storyId}`]" :icon="['fas', 'spinner']" spin />
                                 <font-awesome-icon v-else :icon="['fas', 'plus']" /> 补齐
                             </button>
                         </li>
                     </ul>
                 </div>
                 <!-- Missing Backgrounds (entire story ID section missing) -->
                 <template v-for="(items, storyId) in missingBackgroundsByStory" :key="'missing-bg-story-' + storyId">
                     <div v-if="!classifiedImages.backgrounds.byStory[storyId]" class="resource-folder sub-folder missing-folder">
                         <h5 class="sub-folder-title missing">
                            <font-awesome-icon :icon="['fas', 'folder-minus']" /> 故事片段 {{ storyId }} <span class="missing-tag">[缺失]</span>
                            <button class="btn btn-danger btn-xs btn-action" @click="showBackgroundSelection(storyId, true)" :disabled="isGenerating[`image-bg-${storyId}`]">
                               <font-awesome-icon v-if="isGenerating[`image-bg-${storyId}`]" :icon="['fas', 'spinner']" spin />
                               <font-awesome-icon v-else :icon="['fas', 'sync-alt']" /> 重生成
                            </button>
                         </h5>
                         <ul class="resource-items">
                            <li v-for="item in items" :key="'missing-bg-full-' + storyId + '-' + item.name" class="resource-item missing-resource" @click="handleMissingResourceClick(item)">
                               <font-awesome-icon v-if="isGenerating[`image-bg-${storyId}-${item.name}`]" :icon="['fas', 'spinner']" spin class="resource-icon missing-icon generating" />
                               <font-awesome-icon v-else :icon="['fas', 'image']" class="resource-icon missing-icon faded" />
                               <span class="item-label">{{ item.name }}.png <span class="missing-tag">[缺失]</span></span>
                               <button class="btn btn-warning btn-xs btn-action" @click.stop="showBackgroundSelection(storyId, false)" :disabled="isGenerating[`image-bg-${storyId}`]">
                                   <font-awesome-icon v-if="isGenerating[`image-bg-${storyId}`]" :icon="['fas', 'spinner']" spin />
                                   <font-awesome-icon v-else :icon="['fas', 'plus']" /> 补齐
                               </button>
                            </li>
                         </ul>
                     </div>
                 </template>
            </div>
             <!-- Uncategorized Backgrounds -->
            <div v-if="classifiedImages.backgrounds.uncategorized.length > 0" class="resource-folder">
                 <h4 class="folder-title"><font-awesome-icon :icon="['fas', 'question-circle']" /> 其他背景图</h4>
                 <ul class="resource-items">
                    <li v-for="file in classifiedImages.backgrounds.uncategorized" :key="file.path" :class="['resource-item', { selected: selectedResource && selectedResource.path === file.path }]" @click="selectResource(file, 'image')" :title="`路径: ${file.path}`">
                        <font-awesome-icon :icon="['fas', 'image']" class="resource-icon image-icon" />
                        <span class="item-label">{{ file.name }}</span>
                    </li>
                 </ul>
            </div>
          </div>

          <!-- Music Resources -->
          <div v-if="hasMusicResources || missingMusicFiles.length > 0" class="resource-category">
            <h3 class="category-title">
              <font-awesome-icon :icon="['fas', 'music']" /> 音乐 (music)
              <button class="btn btn-secondary btn-xs btn-action" @click="regenerateMusic()" :disabled="isGenerating['music']">
                <font-awesome-icon v-if="isGenerating['music']" :icon="['fas', 'spinner']" spin />
                <font-awesome-icon v-else :icon="['fas', 'sync-alt']" /> 重生成
              </button>
            </h3>
            <ul class="resource-items">
              <li v-for="file in resourceCategories.music" :key="file.path"
                  :class="['resource-item', { selected: selectedResource && selectedResource.path === file.path }]"
                  @click="selectResource(file, 'audio')" :title="`路径: ${file.path}`">
                <font-awesome-icon :icon="['fas', 'music']" class="resource-icon music-icon" />
                <span class="item-label">{{ file.name }}</span>
              </li>
              <li v-for="item in missingMusicFiles" :key="'missing-music-' + item.name"
                  class="resource-item missing-resource"
                  @click="handleMissingResourceClick(item)">
                <font-awesome-icon v-if="isGenerating['music']" :icon="['fas', 'spinner']" spin class="resource-icon missing-icon generating" />
                 <font-awesome-icon v-else :icon="['fas', 'music']" class="resource-icon missing-icon faded" />
                <span class="item-label">{{ item.name }} <span class="missing-tag">[缺失]</span></span>
                <button class="btn btn-warning btn-xs btn-action" @click.stop="regenerateMusic()" :disabled="isGenerating['music']">
                   <font-awesome-icon v-if="isGenerating['music']" :icon="['fas', 'spinner']" spin />
                   <font-awesome-icon v-else :icon="['fas', 'plus']" /> 补齐
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Resource Preview Area (Right Panel) -->
      <div class="resource-preview-area card">
        <div v-if="!selectedResource" class="preview-placeholder">
           <font-awesome-icon :icon="['fas', 'hand-pointer']" class="placeholder-icon" />
           选择左侧资源进行预览
        </div>
        <div v-else class="preview-content">
          <h4 class="preview-title">预览: {{ selectedResource.name }}</h4>
          <div class="preview-container">
            <img v-if="selectedResource.type === 'image' && previewUrl && !loadingPreview && !previewError" :src="previewUrl" alt="预览图片" class="preview-image">
            <div v-else-if="selectedResource.type === 'audio' && previewUrl" class="audio-preview">
              <audio ref="audioPlayer" controls :src="previewUrl"
                     @error="handleAudioError" @ended="handleAudioEnded" preload="metadata">
                     您的浏览器不支持 Audio 标签。
              </audio>
            </div>
            <div v-if="loadingPreview" class="loading-indicator small">
                 <font-awesome-icon :icon="['fas', 'spinner']" spin /> 加载预览中...
            </div>
            <div v-if="previewError && !loadingPreview" class="error-state small">
                 加载或播放预览失败
            </div>
            <div v-if="selectedResource && !previewUrl && !loadingPreview && !previewError && !selectedResource.isMissing" class="preview-placeholder small">
                此文件类型不支持预览
            </div>
             <div v-if="selectedResource && selectedResource.isMissing" class="preview-placeholder small">
                 资源文件不存在，无法预览
            </div>
          </div>
        </div>
      </div>

    </div><!-- End Layout Container -->

    <!-- Character Selection Dialog -->
    <div v-if="showCharacterDialog" class="modal">
        <div class="modal-content selection-dialog card">
           <div class="modal-header">
             <h3 class="modal-title"><font-awesome-icon :icon="['fas', 'user-friends']" /> 选择需要生成的人物图片</h3>
             <button class="close-btn btn btn-text btn-sm" @click="closeCharacterDialog" title="关闭">
                <font-awesome-icon :icon="['fas', 'times']" />
             </button>
           </div>
           <div class="modal-body">
             <div class="selection-options">
               <label class="select-all-container option-label-item">
                 <div class="option-text">全选/取消全选</div>
                 <div class="switch">
                   <input type="checkbox" id="select-all-chars" v-model="selectAllCharacters" @change="toggleAllCharacters" class="switch-input">
                   <label for="select-all-chars" class="switch-slider"></label>
                 </div>
               </label>
               <hr class="separator thin-separator">
               <div class="options-grid">
                 <label v-for="character in characterSelectionList" :key="character.name" :for="`char-${character.name}`" class="option-label-item">
                   <div class="option-text">{{ character.name }}</div>
                   <div class="switch">
                     <input type="checkbox" :id="`char-${character.name}`" v-model="character.selected" class="switch-input">
                     <label :for="`char-${character.name}`" class="switch-slider"></label>
                   </div>
                 </label>
               </div>
             </div>
           </div>
           <div class="modal-footer">
             <button class="btn btn-secondary" @click="closeCharacterDialog">取消</button>
             <button class="btn btn-primary" @click="confirmCharacterSelection" :disabled="!hasSelectedCharacters || isGenerating['image-characters'] || isAnyCharacterGenerating">
                 <font-awesome-icon v-if="isGenerating['image-characters'] || isAnyCharacterGenerating" :icon="['fas', 'spinner']" spin />
                 <span v-else><font-awesome-icon :icon="['fas', 'check']" /> 确认生成</span>
             </button>
           </div>
        </div>
    </div>

    <!-- Background Selection Dialog -->
     <div v-if="showBackgroundDialog" class="modal">
        <div class="modal-content selection-dialog card">
           <div class="modal-header">
             <h3 class="modal-title"><font-awesome-icon :icon="['fas', 'map-marked-alt']" /> 选择背景图片 (片段 {{ currentStoryId }})</h3>
             <button class="close-btn btn btn-text btn-sm" @click="closeBackgroundDialog" title="关闭">
                <font-awesome-icon :icon="['fas', 'times']" />
             </button>
           </div>
           <div class="modal-body">
             <div class="selection-options">
               <label class="select-all-container option-label-item">
                 <div class="option-text">全选/取消全选</div>
                 <div class="switch">
                   <input type="checkbox" id="select-all-bgs" v-model="selectAllBackgrounds" @change="toggleAllBackgrounds" class="switch-input">
                   <label for="select-all-bgs" class="switch-slider"></label>
                 </div>
               </label>
                <hr class="separator thin-separator">
               <div class="options-grid">
                 <label v-for="place in backgroundSelectionList" :key="place.name" :for="`bg-${currentStoryId}-${place.name}`" class="option-label-item">
                   <div class="option-text">{{ place.name }}</div>
                   <div class="switch">
                     <input type="checkbox" :id="`bg-${currentStoryId}-${place.name}`" v-model="place.selected" class="switch-input">
                     <label :for="`bg-${currentStoryId}-${place.name}`" class="switch-slider"></label>
                   </div>
                 </label>
               </div>
             </div>
           </div>
           <div class="modal-footer">
             <button class="btn btn-secondary" @click="closeBackgroundDialog">取消</button>
             <button class="btn btn-primary" @click="confirmBackgroundSelection" :disabled="!hasSelectedBackgrounds || isGenerating[`image-bg-${currentStoryId}`]">
                 <font-awesome-icon v-if="isGenerating[`image-bg-${currentStoryId}`]" :icon="['fas', 'spinner']" spin />
                 <span v-else><font-awesome-icon :icon="['fas', 'check']" /> 确认生成</span>
             </button>
           </div>
        </div>
    </div>

  </div>
</template>





<!-- Script section remains IDENTICAL to the one provided in the previous step -->
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
   emits: ['show-message', 'close'], // Declare emitted events
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
               if (!audioIdMatch) { // Add check if match fails
                    console.warn(`Could not extract numeric ID from audio filename: ${audioFilename}`);
                    uncategorized.push(file);
                    return;
               }
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

       // Ensure characterData is an array before mapping
       const characterNames = new Set(
    Array.isArray(this.characterData)
        ? this.characterData
            .map(char => char && typeof char === 'object' ? char.name : null)
            .filter(Boolean)
            .flatMap(name => ['happy', 'sad', 'angry'].map(suffix => `${name}-${suffix}`).concat(name))
        : []
);
       this.resourceCategories.images.forEach(file => {
           const imageNameWithoutExt = file.name.replace(/\.png$/, '');
           if (imageNameWithoutExt==="title"){
               title.push(file)
           }
           else if (characterNames.has(imageNameWithoutExt)) {
               characters.push(file);
           }
            else {
            let foundInStories = [];

            for (const storyId in this.storyData) {
                const storyJson = this.storyData[storyId];
                // Ensure storyJson and conversations exist and are correct types
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
                // Sort story IDs numerically
                foundInStories.sort((a, b) => Number(a) - Number(b));

                // Add image to each relevant story ID group
                foundInStories.forEach(storyId => {
                    if (!backgrounds.byStory[storyId]) {
                        backgrounds.byStory[storyId] = [];
                    }
                    // Add a copy of the file object
                    backgrounds.byStory[storyId].push({...file});
                });
            } else {
                // If not found in any story's places, add to uncategorized
                backgrounds.uncategorized.push(file);
            }
           }
       });

       // Sort characters by name
       characters.sort((a, b) => a.name.localeCompare(b.name));

       // Sort story IDs numerically for backgrounds
       const sortedBgByStoryKeys = Object.keys(backgrounds.byStory).sort((a, b) => Number(a) - Number(b));
       const sortedBgByStory = {};
       sortedBgByStoryKeys.forEach(key => {
            // Sort files within each story group by name
            sortedBgByStory[key] = backgrounds.byStory[key].sort((a, b) => a.name.localeCompare(b.name));
       });
       backgrounds.byStory = sortedBgByStory;

       // Sort uncategorized backgrounds by name
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
      handler(newTitle, oldTitle) {
         if (newTitle !== oldTitle) { // Prevent fetch on initial undefined->value transition if handled by mounted
             console.log(`Story title changed to: ${newTitle}, fetching resources.`);
             this.fetchResources();
         }
      }
    }
  },
  mounted() {
     console.log(`ReadResources mounted with storyTitle: ${this.storyTitle}`);
     if (this.storyTitle) {
         this.fetchResources(); // Fetch resources when component mounts with a valid title
     } else {
         console.warn("ReadResources mounted without a storyTitle prop.");
         this.isLoading = false; // Stop loading state if no title
         this.error = "未指定故事标题";
     }
  },
  beforeUnmount() { // Changed from beforeDestroy
    this.stopAudio();
    this.releaseObjectUrls();
  },
  methods: {
    // 设置localStorage的aiGalgameConfig剧情
    setStoryTitleConfig() {
      try {
        // 读取现有配置或创建新配置
        let config = {};
        const configStr = localStorage.getItem('aiGalgameConfig');
        if (configStr) {
            config = JSON.parse(configStr);
        }

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

      const generationKey = `audio-${storyId}`;
      // Vue 3 reactivity: direct assignment should work
      this.isGenerating[generationKey] = true;
      this.showNotification(`开始生成片段 ${storyId} 的语音，请稍候...`, 'info');

      try {
          // Call generateVoice (assuming it handles errors internally or throws)
          await generateVoice(storyId); // Pass only storyId
          console.log(`已请求重新生成语音: 故事ID ${storyId}`);
          this.showNotification(`故事片段 ${storyId} 的语音生成请求已发送`, 'success');

          // Refresh resource list after generation completes (or potentially after a delay)
          // Consider adding a mechanism to know when generation is actually done if generateVoice is async *background* task
          await this.fetchResources();

      } catch (err) {
          console.error(`请求生成语音失败: 故事ID ${storyId}`, err);
          this.showNotification(`请求生成语音失败 (片段 ${storyId}): ${err.message || '未知错误'}`, 'error');
      } finally {
          // Reset generating state regardless of success/failure
           this.isGenerating[generationKey] = false;
      }
    },

    // 新增：重新生成标题图片的方法
    async regenerateTitleImage() {
      this.setStoryTitleConfig();
      const generationKey = 'image-title';
      this.isGenerating[generationKey] = true;
      this.showNotification('开始生成封面图片...', 'info');

      try {
        await getTitleImagesJS(1); // Assuming 1 means generate title image
        console.log('已请求重新生成标题图片');
        this.showNotification('封面图片生成请求已发送', 'success');
        await this.fetchResources(); // Refresh list
      } catch (err) {
        console.error('请求生成标题图片失败:', err);
        this.showNotification(`生成封面图片失败: ${err.message || '未知错误'}`, 'error');
      } finally {
        this.isGenerating[generationKey] = false;
      }
    },

    // 新增：显示人物选择对话框
    showCharacterSelection(isRegenerate) {
      this.isCharacterRegenerating = isRegenerate;
      const charactersAvailable = Array.isArray(this.characterData) ? this.characterData.filter(char => char && typeof char === 'object' && char.name) : [];

      if (isRegenerate) {
        this.characterSelectionList = charactersAvailable.map(char => ({ name: char.name, selected: false }));
      } else {
        const missingNames = new Set(this.missingCharacterImages.map(item => item.name));
        this.characterSelectionList = charactersAvailable
            .filter(char => missingNames.has(char.name)) // Filter to only missing characters
            .map(char => ({ name: char.name, selected: true })); // Default select missing ones
      }

       // Update selectAll state based on the list
      this.selectAllCharacters = this.characterSelectionList.length > 0 && this.characterSelectionList.every(char => char.selected);
      this.showCharacterDialog = true;
    },

    // 新增：关闭人物选择对话框
    closeCharacterDialog() {
      this.showCharacterDialog = false;
      this.characterSelectionList = []; // Clear list
    },

    // 新增：全选/取消全选人物
    toggleAllCharacters() {
      this.characterSelectionList.forEach(char => {
        // Use Vue's reactivity by assigning directly
        char.selected = this.selectAllCharacters;
      });
    },

    // 新增：确认人物选择并生成
    async confirmCharacterSelection() {
      this.setStoryTitleConfig();
      const selectedCharacters = this.characterSelectionList
        .filter(char => char.selected)
        .map(char => char.name);

      if (selectedCharacters.length === 0) {
        this.showNotification('请至少选择一个人物', 'warning');
        return;
      }

      this.closeCharacterDialog(); // Close dialog first

      // Set generating state for the overall group and individual characters
      const groupKey = 'image-characters';
      this.isGenerating[groupKey] = true;
      selectedCharacters.forEach(charName => {
         this.isGenerating[`image-character-${charName}`] = true;
      });
       this.showNotification(`开始生成 ${selectedCharacters.length} 个人物图片...`, 'info');


      try {
        await getSinglePersonImageJS(selectedCharacters);
        console.log('已请求生成人物图片:', selectedCharacters);
        this.showNotification(`已请求生成 ${selectedCharacters.length} 个人物图片`, 'success');
        await this.fetchResources(); // Refresh list
      } catch (err) {
        console.error('请求生成人物图片失败:', err);
        this.showNotification(`生成人物图片失败: ${err.message || '未知错误'}`, 'error');
      } finally {
        // Reset generating state
         this.isGenerating[groupKey] = false;
         selectedCharacters.forEach(charName => {
            this.isGenerating[`image-character-${charName}`] = false;
         });
      }
    },

    // 新增：显示背景选择对话框
    showBackgroundSelection(storyId, isRegenerate) {
      this.currentStoryId = storyId;
      this.isBackgroundRegenerating = isRegenerate;
      const storyJson = this.storyData[storyId];
      const usedPlaces = new Set();

      if (storyJson && Array.isArray(storyJson.conversations)) {
        storyJson.conversations.forEach(conv => {
          if (conv && conv.place && conv.place !== "") usedPlaces.add(conv.place);
        });
      }

       if (isRegenerate) {
          this.backgroundSelectionList = Array.from(usedPlaces).map(place => ({ name: place, selected: false }));
       } else {
           const missingBackgrounds = this.getMissingBackgroundsForStory(storyId);
           const missingPlaces = new Set(missingBackgrounds.map(item => item.name));
           // Combine used places from story with missing list, ensuring unique names
           const allPossiblePlaces = new Set([...usedPlaces, ...missingPlaces]);
           this.backgroundSelectionList = Array.from(allPossiblePlaces)
               .map(place => ({
                   name: place,
                   selected: missingPlaces.has(place) // Default select missing ones
               }));
       }


       this.selectAllBackgrounds = this.backgroundSelectionList.length > 0 && this.backgroundSelectionList.every(place => place.selected);
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
      this.setStoryTitleConfig();
      const storyId = this.currentStoryId;
      const selectedPlaces = this.backgroundSelectionList
        .filter(place => place.selected)
        .map(place => place.name);

      if (selectedPlaces.length === 0) {
        this.showNotification('请至少选择一个背景', 'warning');
        return;
      }

      this.closeBackgroundDialog(); // Close dialog first

      const groupKey = `image-bg-${storyId}`;
      this.isGenerating[groupKey] = true;
      selectedPlaces.forEach(placeName => {
         this.isGenerating[`image-bg-${storyId}-${placeName}`] = true;
      });
       this.showNotification(`开始准备并生成片段 ${storyId} 的 ${selectedPlaces.length} 个背景图片...`, 'info');


      try {
        // 1. Merge story data (necessary for getPlacesImagesJS)
        await mergeStory(storyId);
        console.log(`已合并故事数据: 故事ID ${storyId}`);

        // 2. Write selected places to place.json
        const placesPath = `/data/${this.storyTitle}/story/place.json`;
        // Ensure data is always an array, even if empty
        const placesData = JSON.stringify(selectedPlaces || []);
        try {
          await writeFile(placesPath, placesData);
          console.log(`已写入地点数据: ${placesPath}`, selectedPlaces);
        } catch (writeErr) {
          console.error(`写入地点数据失败: ${placesPath}`, writeErr);
          throw new Error(`写入地点数据失败: ${writeErr.message}`); // Rethrow to be caught below
        }

        // 3. Generate background images
        await getPlacesImagesJS(1); // Assuming 1 means generate based on place.json
        console.log(`已请求生成背景图片: 地点 ${selectedPlaces.join(', ')}`);
        this.showNotification(`已请求生成 ${selectedPlaces.length} 个背景图片`, 'success');
        await this.fetchResources(); // Refresh list
      } catch (err) {
        console.error(`生成背景图片失败: 故事ID ${storyId}`, err);
        this.showNotification(`生成背景图片失败 (片段 ${storyId}): ${err.message || '未知错误'}`, 'error');
      } finally {
        // Reset generating state
         this.isGenerating[groupKey] = false;
         selectedPlaces.forEach(placeName => {
            this.isGenerating[`image-bg-${storyId}-${placeName}`] = false;
         });
      }
    },

    // 新增：生成音乐的方法
    async regenerateMusic() {
      this.setStoryTitleConfig();
      const generationKey = 'music';
      this.isGenerating[generationKey] = true;
      this.showNotification('开始生成背景音乐...', 'info');

      try {
        let gengeratestatus=await generateBackgroundMusic(console.log); // Pass console.log for progress
        console.log('已请求生成背景音乐');
        if(gengeratestatus==="error"){
          this.showNotification(`生成背景音乐失败:未知错误`, 'error');
          return;
        }
        this.showNotification('背景音乐生成请求已发送', 'success');
        await this.fetchResources(); // Refresh list
      } catch (err) {
        console.error('请求生成背景音乐失败:', err);
        this.showNotification(`生成背景音乐失败: ${err.message || '未知错误'}`, 'error');
      } finally {
        this.isGenerating[generationKey] = false;
      }
    },


    async fetchResources() {
      this.isLoading = true;
      this.error = null;
      // Reset state carefully
      this.resourceCategories = { voice: [], images: [], music: [] };
      this.storyData = {};
      this.characterData = [];
      this.audioDirExists = false;
      this.imageDirExists = false;
      this.musicDirExists = false;
      this.storyDirExists = false;
      this.characterFileExists = false;
      // Don't reset selectedResource or previewUrl here, let selectResource handle it
      // this.selectedResource = null;
      // this.previewUrl = null;
      // Do release old URLs
      this.releaseObjectUrls();
      this.missingAudioByStory = {};
      this.missingTitleImage = null;
      this.missingCharacterImages = [];
      this.missingBackgroundsByStory = {};
      this.missingMusicFiles = [];
      this.isGenerating = {}; // Reset generating status

      const baseDir = `/data/${this.storyTitle}`;
      const audioDir = `${baseDir}/audio`;
      const imagesDir = `${baseDir}/images`;
      const musicDir = `${baseDir}/music`;
      const storyDir = `${baseDir}/story`;
      const characterFilePath = `${baseDir}/character.json`;

      // --- safeListDirectory, safeReadFile, processJsonData helpers remain the same ---
      const safeListDirectory = async (path) => { /* ... */ try { const items = await listDirectory(path); return { items: items || [], exists: true }; } catch (err) { if (err.message && (err.message.includes('目录不存在') || err.message.includes('标题') || err.message.includes('不存在'))) { console.warn(`Directory "${path}" does not exist or access denied, skipping listing.`, err.message); return { items: [], exists: false }; } else { console.error(`Failed to list directory "${path}":`, err); throw err; } } };
      const safeReadFile = async (path) => { /* ... */ try { const data = await readFile(path); if (data === undefined) { console.warn(`File "${path}" read returned undefined, treating as non-existent.`); return { data: null, exists: false }; } return { data: data, exists: true }; } catch (err) { if (err.message && (err.message.includes('文件不存在') || err.message.includes('不存在') || err.message.includes('无法读取'))) { console.warn(`File "${path}" does not exist or access denied, skipping read.`, err.message); return { data: null, exists: false }; } else { console.error(`Failed to read file "${path}":`, err); throw err; } } };
      const processJsonData = (rawData, filePath) => { /* ... */ if (typeof rawData === 'string') { try { return JSON.parse(rawData); } catch (e) { console.error(`Failed to parse JSON string from ${filePath}:`, e); throw new Error(`Invalid JSON format in ${filePath}`); } } else if (rawData instanceof ArrayBuffer) { try { return JSON.parse(new TextDecoder().decode(rawData)); } catch(e) { console.error(`Failed to decode/parse ArrayBuffer from ${filePath}:`, e); throw new Error(`Invalid JSON format (from ArrayBuffer) in ${filePath}`); } } else if (typeof rawData === 'object' && rawData !== null) { return rawData; } else { throw new Error(`Unexpected or invalid data type for ${filePath}: ${typeof rawData}`); } };

      try {
        // === Load Metadata (Character and Story) ===
        const { data: characterFileData, exists: charFileExists } = await safeReadFile(characterFilePath);
        this.characterFileExists = charFileExists;
        if (charFileExists && characterFileData !== null) { try { this.characterData = processJsonData(characterFileData, characterFilePath); if (!Array.isArray(this.characterData)) { console.error('Character data is not an array:', this.characterData); this.characterData = []; } } catch (e) { this.showNotification(`处理 character.json 失败: ${e.message}`, 'error'); this.characterData = []; } } else { console.log(`Character file ${characterFilePath} ${charFileExists ? 'is null' : 'not found'}.`); }

        const { items: storyItems, exists: sDirExists } = await safeListDirectory(storyDir);
        this.storyDirExists = sDirExists;
        if (sDirExists && storyItems.length > 0) {
             const jsonFiles = storyItems.filter(item => !item.isFolder && item.name.endsWith('.json') && /^\d+\.json$/.test(item.name));
             const storyPromises = jsonFiles.map(async file => { const { data: fileData, exists: fileExists } = await safeReadFile(file.path); if (fileExists && fileData !== null) { try { const storyId = file.name.replace(/\.json$/, ''); const jsonData = processJsonData(fileData, file.path); if (typeof jsonData !== 'object' || jsonData === null || !Array.isArray(jsonData.conversations)) { throw new Error("Missing or non-array 'conversations' property."); } return { id: storyId, json: jsonData }; } catch (e) { this.showNotification(`处理故事 JSON "${file.name}" 失败: ${e.message}`, 'error'); return null; } } return null; });
             const storyResults = await Promise.all(storyPromises);
             this.storyData = storyResults.reduce((acc, result) => { if (result) acc[result.id] = result.json; return acc; }, {});
        }

        // === Load Resource Files ===
        const { items: audioTopLevelItems, exists: aDirExists } = await safeListDirectory(audioDir);
        this.audioDirExists = aDirExists;
        const collectedAudioFiles = [];
        if (aDirExists && audioTopLevelItems.length > 0) {
             const subDirPromises = audioTopLevelItems.filter(item => item.isFolder && /^\d+$/.test(item.name)).map(async (folderItem) => { const subDirPath = `${audioDir}/${folderItem.name}`; try { const { items: filesInFolder, exists: subDirListed } = await safeListDirectory(subDirPath); return subDirListed ? filesInFolder.filter(f => !f.isFolder && f.name.endsWith('.wav') && /^\d+\.wav$/.test(f.name)) : []; } catch (subDirError) { console.error(`Error listing audio sub-directory ${subDirPath}:`, subDirError); return []; } });
             const filesFromSubDirs = await Promise.all(subDirPromises);
             filesFromSubDirs.forEach(files => collectedAudioFiles.push(...files));
        }
        this.resourceCategories.voice = collectedAudioFiles;

        const { items: imageItems, exists: iDirExists } = await safeListDirectory(imagesDir);
        this.imageDirExists = iDirExists;
        if (iDirExists) this.resourceCategories.images = imageItems.filter(item => !item.isFolder && item.name.endsWith('.png'));

        const { items: musicItems, exists: mDirExists } = await safeListDirectory(musicDir);
        this.musicDirExists = mDirExists;
        if (mDirExists) this.resourceCategories.music = musicItems.filter(item => !item.isFolder && item.name.endsWith('.mp3'));

        this.generateMissingResourcesList();

      } catch (err) {
        console.error('加载资源列表或元数据时发生严重错误:', err);
        this.error = err.message || '发生未知错误';
        this.showNotification('加载资源时发生严重错误', 'error');
      } finally {
        this.isLoading = false;
      }
    },

    // --- generateMissingResourcesList, findMissingAudioFiles, findMissingImageFiles, findMissingMusicFiles ---
    // --- getMissingAudioForStory, getMissingBackgroundsForStory, handleMissingResourceClick ---
    // --- Methods remain IDENTICAL to the one provided in the previous step ---
        // 生成缺失资源列表的新方法
    generateMissingResourcesList() {
      this.findMissingAudioFiles();
      this.findMissingImageFiles();
      this.findMissingMusicFiles();
      console.log('Generated missing resources list.');
    },
    // 查找缺失的语音文件
    findMissingAudioFiles() {
       this.missingAudioByStory = {}; // Reset
       for (const storyId in this.storyData) {
         const storyJson = this.storyData[storyId];
         if (storyJson && Array.isArray(storyJson.conversations)) {
           const existingAudioItems = this.classifiedAudio.byStory[storyId] || [];
           const existingAudioIds = new Set(existingAudioItems.map(item => item.audioId));
           const missingAudios = [];
           storyJson.conversations.forEach(conversation => {
             if (conversation && conversation.character && conversation.character !== "" && typeof conversation.id === 'number') {
               const audioId = conversation.id;
               if (!existingAudioIds.has(audioId)) {
                 let final_text=String(conversation.text || '').replace(/[\(（].*?[\)）]/g, '').replace(/ /g, "，").replace(/\n/g, "。");
                 while (final_text.startsWith("，") || final_text.startsWith("。")) final_text = final_text.substring(1);
                 if (final_text.trim()){
                   missingAudios.push({ id: audioId, name: `${audioId}.wav`, text: conversation.text || `对话 ${audioId}`, path: `/data/${this.storyTitle}/audio/${storyId}/${audioId}.wav`, type: 'audio', isMissing: true });
                 }
               }
             }
           });
           if (missingAudios.length > 0) this.missingAudioByStory[storyId] = missingAudios;
         }
       }
    },
    // 查找缺失的图片文件
    findMissingImageFiles() {
       this.missingTitleImage = null; // Reset
       this.missingCharacterImages = []; // Reset
       this.missingBackgroundsByStory = {}; // Reset

       // Title image
       if (this.classifiedImages.title.length === 0) {
         this.missingTitleImage = { name: 'title', path: `/data/${this.storyTitle}/images/title.png`, type: 'image', isMissing: true };
       }

       // Character images
       if (Array.isArray(this.characterData)) {
         const existingCharacterImages = new Set(this.classifiedImages.characters.map(file => file.name.replace(/\.png$/, '')));
         this.characterData.forEach(character => {
           if (character && character.name && !existingCharacterImages.has(character.name)) {
             this.missingCharacterImages.push({ name: character.name, path: `/data/${this.storyTitle}/images/${character.name}.png`, type: 'image', isMissing: true });
           }
         });
       }

       // Background images
       for (const storyId in this.storyData) {
           const storyJson = this.storyData[storyId];
           if (storyJson && Array.isArray(storyJson.conversations)) {
             const usedPlaces = new Set();
             storyJson.conversations.forEach(conv => { if (conv && conv.place && conv.place !== "") usedPlaces.add(conv.place); });
             if (usedPlaces.size > 0) {
               const existingBackgrounds = this.classifiedImages.backgrounds.byStory[storyId] || [];
               const existingBackgroundNames = new Set(existingBackgrounds.map(file => file.name.replace(/\.png$/, '')));
               const missingBackgrounds = [];
               usedPlaces.forEach(place => { if (!existingBackgroundNames.has(place)) missingBackgrounds.push({ name: place, path: `/data/${this.storyTitle}/images/${place}.png`, type: 'image', isMissing: true }); });
               if (missingBackgrounds.length > 0) this.missingBackgroundsByStory[storyId] = missingBackgrounds;
             }
           }
         }
    },
    // 查找缺失的音乐文件
    findMissingMusicFiles() {
       this.missingMusicFiles = []; // Reset
       const existingMusicNames = new Set(this.resourceCategories.music.map(file => file.name));
       this.expectedMusicFiles.forEach(musicFile => {
         if (!existingMusicNames.has(musicFile)) {
           this.missingMusicFiles.push({ name: musicFile, path: `/data/${this.storyTitle}/music/${musicFile}`, type: 'audio', isMissing: true });
         }
       });
    },
    // 获取特定故事ID的缺失语音
    getMissingAudioForStory(storyId) { return this.missingAudioByStory[storyId] || []; },
    // 获取特定故事ID的缺失背景图
    getMissingBackgroundsForStory(storyId) { return this.missingBackgroundsByStory[storyId] || []; },
    // 处理点击缺失资源的事件
    handleMissingResourceClick(item) {
      this.showNotification(`资源 "${item.name}" 不存在，无法预览`, 'warning');
      this.selectedResource = item;
      this.previewUrl = null;
      this.previewError = true;
      this.loadingPreview = false;
    },

    // --- selectResource, stopAudio, handleAudioError, handleAudioEnded, releaseObjectUrls ---
    // --- Methods remain IDENTICAL to the one provided in the previous step ---
    async selectResource(resource, type) {
       if (!resource || !resource.path) return; // Guard against invalid resource
      // If clicking the currently selected item and it's audio, toggle play/pause
      if (this.selectedResource && this.selectedResource.path === resource.path) {
           if (type === 'audio' && this.$refs.audioPlayer) {
               try {
                   if (this.$refs.audioPlayer.paused) { await this.$refs.audioPlayer.play(); }
                   else { this.$refs.audioPlayer.pause(); }
               } catch (e) { console.error("Play/Pause audio failed:", e); }
           }
           return;
      }

      // Stop previous audio, clear old preview/URLs
      this.stopAudio();
      this.releaseObjectUrls(); // Release only previous URLs
      this.selectedResource = null; // Clear selection first
      this.previewUrl = null;
      this.previewError = false;
      this.loadingPreview = true; // Set loading state

      // Set new selection (important to do this after clearing)
      this.selectedResource = { ...resource, type };
      console.log('Selecting resource:', this.selectedResource);

      try {
        const fileData = await readFile(resource.path); // Read file data
         if (fileData === undefined || fileData === null) throw new Error(`File read returned null/undefined`);

        console.log(`File read successful for ${resource.name}, data type:`, fileData.constructor.name);

        let blob;
        if (fileData instanceof Blob) blob = fileData;
        else if (fileData instanceof ArrayBuffer) blob = new Blob([fileData]);
        else throw new Error(`Unsupported file data type: ${fileData.constructor.name}`);

        const url = URL.createObjectURL(blob);
        this.previewUrl = url;
        this.objectUrls[resource.path] = url; // Store URL for later release
        console.log('Blob URL created:', url);

        // Handle audio playback after URL is set
        if (type === 'audio') {
           await this.$nextTick(); // Wait for DOM update
           if (this.$refs.audioPlayer) {
                this.$refs.audioPlayer.load(); // Ensure player loads new source
                try {
                    await this.$refs.audioPlayer.play(); // Attempt to play
                } catch (e) {
                    console.warn("Audio autoplay failed:", e);
                }
           } else { throw new Error("Audio player ref not found"); }
        }
        // If image, URL is set, nothing more needed here.

      } catch (err) {
        console.error(`Select/Read/Preview failed for ${resource.path}:`, err);
        this.previewError = true;
        this.showNotification(`加载预览 "${resource.name}" 失败: ${err.message}`, 'error');
         // Ensure URL is cleared on error
         if (this.objectUrls[resource.path]) {
             URL.revokeObjectURL(this.objectUrls[resource.path]);
             delete this.objectUrls[resource.path];
         }
         this.previewUrl = null;
      } finally {
         this.loadingPreview = false; // Clear loading state
      }
    },
    stopAudio() { if (this.$refs.audioPlayer) { if (!this.$refs.audioPlayer.paused) { this.$refs.audioPlayer.pause(); } this.$refs.audioPlayer.removeAttribute('src'); this.$refs.audioPlayer.load(); } },
    handleAudioError(e) { console.error('Audio playback error:', e); let msg = '音频播放失败'; const err = e.target.error; if (err) { /* ... error code mapping ... */ msg += `: ${err.code}`; } this.previewError = true; this.showNotification(msg, 'error'); this.stopAudio(); },
    handleAudioEnded() { console.log('Audio playback ended'); },
    releaseObjectUrls() { Object.values(this.objectUrls).forEach(url => URL.revokeObjectURL(url)); this.objectUrls = {}; },

    // --- Use emit for notifications ---
    showNotification(message, type = 'info') {
       // Check if component is mounted/not destroyed
       // _isDestroyed is Vue 2, in Vue 3 you might use getCurrentInstance() check or similar flag
       // For simplicity, just emit. If component is unmounted, emit might not reach parent listener.
       this.$emit('show-message', { title: type, message: message});
       console.log(`[ReadResources][${type.toUpperCase()}] ${message}`);
    },

    // --- Emit close event ---
    close() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
/* Overall container styling */
.resource-viewer {
  /* background-color: var(--surface-color); */ /* Let parent modal handle background */
  padding: 0; /* Remove padding, handled by layout container or modal body */
  height: 100%; /* Fill parent modal body */
  box-sizing: border-box;
  display: flex; /* Enable flex for loading/error states */
  flex-direction: column;
}

/* Loading and Error States */
.loading-indicator, .error-state {
  flex-grow: 1; /* Take up all space when shown */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}
.loading-indicator.full-height, .error-state.full-height {
    height: 100%; /* Ensure it fills the container */
}
.loading-indicator.small, .error-state.small {
    min-height: 80px; /* Smaller height for preview area */
    padding: 15px;
    font-size: 0.9rem;
}

.loading-icon-fa, .error-icon-fa {
  font-size: 2rem;
  margin-bottom: 15px;
  color: var(--primary-color);
}
.error-icon-fa { color: var(--danger-color); }
.loading-icon-fa.large, .error-icon-fa.large { font-size: 2.5rem; }

/* New Layout Container */
.resource-layout-container {
  display: flex;
  flex-grow: 1; /* Fill remaining space */
  gap: 15px; /* Space between list and preview */
  overflow: hidden; /* Prevent container itself from scrolling */
  height: 100%; /* Crucial for child height % */
}

/* Resource List Area (Left Panel) */
.resource-list-area {
  /* Inherit .card styles */
  flex: 0 0 350px; /* Fixed width, adjust as needed */
  min-width: 280px; /* Minimum width */
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* Enable vertical scrolling ONLY for this area */
   padding: 15px; /* Add padding inside the list area */
   box-sizing: border-box;
   border-right: 1px solid var(--border-color); /* Optional separator */
   height:400px;
}


.empty-state { /* Styles for empty list */
   padding: 20px;
   text-align: center;
   color: var(--text-tertiary);
}
.empty-icon-fa.medium { font-size: 2rem; margin-bottom: 10px; }
.text-muted { color: var(--text-tertiary); font-size: 0.85rem; }


/* Resource Categories and Folders */
.resource-category {
  margin-bottom: 20px;
}
.category-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 8px;
}
.category-title .svg-inline--fa {
    color: var(--primary-color); /* Icon color for category titles */
}
.category-title .btn-action {
    margin-left: auto; /* Push button to the right */
}


.resource-folder {
  margin-bottom: 15px;
  padding-left: 10px; /* Indent folders */
}
.folder-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.folder-title .svg-inline--fa {
    color: var(--text-tertiary);
}
.folder-title.missing {
    color: var(--danger-color);
}
.folder-title.missing .svg-inline--fa {
    color: var(--danger-color);
}
.folder-title .btn-action {
    margin-left: auto;
}

.sub-folder {
    margin-left: 15px;
    margin-top: 10px;
    padding-left: 10px;
    border-left: 2px solid var(--hover-overlay);
}
.sub-folder-title {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-tertiary);
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    gap: 6px;
}


/* Resource Items List */
.resource-items {
  list-style: none;
  padding: 0;
  margin: 0;
}

.resource-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 4px; /* Spacing between items */
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  gap: 8px;
  overflow: hidden; /* Prevent long text overflow */
}
.resource-item:hover {
  background-color: var(--hover-overlay);
}
.resource-item.selected {
  background-color: var(--primary-light);
  color: white;
  font-weight: 500;
}
.resource-item.selected .resource-icon {
  color: white;
}
.resource-item.selected .missing-tag {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
}


.resource-icon {
  flex-shrink: 0;
  width: 1.1em; /* Consistent icon width */
  text-align: center;
  color: var(--text-secondary);
}
.audio-icon { color: var(--info-color); }
.image-icon { color: var(--secondary-color); }
.music-icon { color: var(--warning-color); }


.item-label {
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
}

/* Missing Resource Styling */
.missing-resource {
  color: var(--text-tertiary);
  font-style: italic;
  cursor: default; /* Indicate not selectable for normal preview */
  position: relative; /* For button positioning */
}
.missing-resource:hover {
    background-color: transparent; /* Don't highlight on hover */
}
.missing-resource.selected {
  background-color: transparent; /* Don't highlight missing when 'selected' */
  color: var(--text-tertiary); /* Keep text color */
}

.missing-icon {
    color: var(--danger-color);
    opacity: 0.6;
}
.missing-icon.faded {
    opacity: 0.4;
}
.missing-icon.generating {
    opacity: 1;
    color: var(--warning-color); /* Indicate generating */
}

.missing-tag {
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--danger-light);
  margin-left: 5px;
  background-color: rgba(var(--danger-color-rgb, 231, 76, 60), 0.1);
  padding: 1px 4px;
  border-radius: var(--border-radius-sm);
}

.missing-resource .btn-action {
    margin-left: auto; /* Push button to the right */
    flex-shrink: 0;
}


/* Resource Preview Area (Right Panel) */
.resource-preview-area {
  /* Inherit .card styles */
  flex: 1; /* Take remaining space */
  display: flex;
  flex-direction: column;
  height: 100%; /* Fill the vertical space */
  overflow: hidden; /* Prevent preview area from getting its own scrollbar */
   padding: 15px;
   box-sizing: border-box;
}

.preview-placeholder {
  flex-grow: 1; /* Fill space when no selection */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-tertiary);
}
.preview-placeholder .placeholder-icon {
    font-size: 2.5rem;
    margin-bottom: 15px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  height: 100%; /* Ensure content fills the area */
}

.preview-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0; /* Prevent shrinking */
}

.preview-container {
  flex-grow: 1; /* Allow container to fill space */
  display: flex;
  align-items: center; /* Center content vertically */
  justify-content: center; /* Center content horizontally */
  overflow-y: auto; /* Enable scroll ONLY if preview content overflows */
  position: relative; /* For loading indicator */
  min-height: 100px; /* Ensure some minimum height */
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--border-radius-md);
}

.audio-preview {
  width: 100%;
}
.audio-preview audio {
  width: 100%;
  height: 45px;
}

/* Selection Dialog Styles */
.modal { /* Reusing name from Manage.vue */
  position: fixed; inset: 0; background-color: rgba(0,0,0,0.6);
  display: flex; justify-content: center; align-items: center;
  z-index: 1150; /* Above resource viewer modal */
  padding: 15px;
}
.modal-content.selection-dialog {
   width: 100%;
   max-width: 500px; /* Limit width for selection */
   max-height: 80vh;
   display: flex; flex-direction: column;
   overflow: hidden;
   padding: 0; /* Use header/body/footer padding */
}
.modal-header { padding: 15px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.modal-title { font-size: 1.2rem; margin: 0; font-weight: 600;}
.modal-body { padding: 20px; overflow-y: auto; flex-grow: 1; }
.modal-footer { padding: 15px 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0; }
.close-btn { /* Uses .btn .btn-text .btn-sm */ color: var(--text-secondary); }
.close-btn:hover { color: var(--danger-color); }


.selection-options {
    display: flex;
    flex-direction: column;
    gap: 15px;
}
.select-all-container {
    font-weight: 500;
    padding-bottom: 10px;
    /* border-bottom: 1px solid var(--border-color); */
}
.options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* Responsive columns */
    gap: 10px;
}
.option-item {
    /* Uses global .checkbox-label */
    padding: 5px 0; /* Add some padding */
}


/* Thin separator */
.separator.thin-separator {
    margin: 10px 0;
}

/* Global styles used */
.btn-xs { /* Define extra small button if not global */
    padding: 3px 6px;
    font-size: 0.75rem;
}

/* Ensure FontAwesome icons are used if fas classes are present */
.fa-spinner { /* Placeholder if FontAwesome component isn't used */
    display: inline-block;
    animation: fa-spin 1s linear infinite;
}
@keyframes fa-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Ensure global card, btn, input, select, switch, checkbox styles are available */

</style>