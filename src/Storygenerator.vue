<template>
  <div class="novel-generator-container">
    <div class="novel-generator">
      <h1 class="title">男频小说生成器</h1>
      
      <!-- 模型选择部分 -->
      <div class="section card" v-if="step === 'config'">
        <h2 class="section-title">选择AI模型配置</h2>
        
        <div class="config-selection">
          <div class="model-selector">
            <h3>大纲生成模型</h3>
            <div class="select-group">
              <label for="outline-config-select">配置:</label>
              <select id="outline-config-select" v-model="outlineConfig" @change="loadModelsForConfig('outline')">
                <option v-for="config in configNames" :key="config" :value="config">{{ config }}</option>
              </select>
            </div>
            <div class="select-group">
              <label for="outline-model-select">模型:</label>
              <select id="outline-model-select" v-model="outlineModel">
                <option v-for="model in outlineModels" :key="model.name" :value="model.name">{{ model.name }}</option>
              </select>
            </div>
          </div>
          
          <div class="model-selector">
            <h3>正文生成模型</h3>
            <div class="select-group">
              <label for="content-config-select">配置:</label>
              <select id="content-config-select" v-model="contentConfig" @change="loadModelsForConfig('content')">
                <option v-for="config in configNames" :key="config" :value="config">{{ config }}</option>
              </select>
            </div>
            <div class="select-group">
              <label for="content-model-select">模型:</label>
              <select id="content-model-select" v-model="contentModel">
                <option v-for="model in contentModels" :key="model.name" :value="model.name">{{ model.name }}</option>
              </select>
            </div>
          </div>
        </div>
        <button class="primary-btn next-btn" @click="goToStep('requirements')">下一步：设置小说要求</button>
      </div>
      
      <!-- 小说要求输入部分 -->
      <div class="section" v-if="step === 'requirements'">
        <h2 class="section-title">设置小说要求</h2>
        
        <div class="requirements-layout">
          <div class="requirements-main">
            <div class="requirement-group card">
              <h3>小说分类</h3>
              <div class="tag-group">
                <div v-for="(item, index) in categories" :key="'cat-'+index" class="tag-item" :class="{ 'selected': item.selected }" @click="toggleSelection(item)">{{ item.name }}</div>
                <div class="custom-input-group"><input type="text" v-model="newCategory" placeholder="自定义分类" @keyup.enter="addCustomItem('category')"><button @click="addCustomItem('category')" class="add-btn">添加</button></div>
              </div>
            </div>
            <div class="requirement-group card">
              <h3>小说流派</h3>
              <div class="tag-group">
                <div v-for="(item, index) in genres" :key="'gen-'+index" class="tag-item" :class="{ 'selected': item.selected }" @click="toggleSelection(item)">{{ item.name }}</div>
                <div class="custom-input-group"><input type="text" v-model="newGenre" placeholder="自定义流派" @keyup.enter="addCustomItem('genre')"><button @click="addCustomItem('genre')" class="add-btn">添加</button></div>
              </div>
            </div>
            <div class="requirement-group card">
              <h3>男主性格</h3>
              <div class="tag-group">
                <div v-for="(item, index) in personalities" :key="'per-'+index" class="tag-item" :class="{ 'selected': item.selected }" @click="toggleSelection(item)">{{ item.name }}</div>
                <div class="custom-input-group"><input type="text" v-model="newPersonality" placeholder="自定义性格" @keyup.enter="addCustomItem('personality')"><button @click="addCustomItem('personality')" class="add-btn">添加</button></div>
              </div>
            </div>
            <div class="requirement-group card full-width-group">
              <h3>其他要求</h3>
              <textarea v-model="otherRequirements" placeholder="请输入其他具体要求..."></textarea>
            </div>
          </div>
          <div class="requirements-sidebar card">
            <h3>核心设定</h3>
            <div class="setting-item">
              <label for="female-leads">女主数量:</label>
              <div class="number-input">
                <button @click="decrementFemaleLeads" :disabled="femaleLeads <= 0">-</button>
                <input id="female-leads" type="number" v-model.number="femaleLeads" min="0" max="10">
                <button @click="incrementFemaleLeads" :disabled="femaleLeads >= 10">+</button>
              </div>
            </div>
            <div class="setting-item">
              <label for="total-chapters">预计章节数:</label>
              <input id="total-chapters" type="number" v-model.number="totalChapters" min="10" step="10">
            </div>
            <div class="setting-item">
              <label for="chapter-word-count">每章字数:</label>
              <input id="chapter-word-count" type="number" v-model.number="chapterWordCount" min="500" step="100">
            </div>
          </div>
        </div>
        
        <div class="button-group">
          <button class="secondary-btn" @click="goToStep('config')">返回</button>
          <button class="primary-btn" @click="generateOutline" :disabled="outlineLoading">
            <span v-if="outlineLoading"><span class="button-spinner"></span> 生成中...</span><span v-else>生成大纲</span>
          </button>
        </div>
      </div>
      
      <!-- 大纲生成和修改部分 -->
      <div class="section" v-if="step === 'outline'">
        <h2 class="section-title">小说大纲</h2>
        <div v-if="outlineLoading" class="loading-indicator card"><div class="spinner"></div><p>正在生成大纲，请稍候...</p></div>
        <div v-if="outlineError" class="error-message card"><p>{{ outlineError }}</p><button @click="generateOutline" class="primary-btn">重新生成</button></div>
        
        <div v-if="!outlineLoading && !outlineError && parsedOutline" class="outline-content card">
          <div class="outline-display">
            <div class="outline-header"><h3>{{ parsedOutline.title || '未命名作品' }}</h3><button v-if="!isEditingOutline" class="edit-btn icon-btn" @click="startEditOutline" title="编辑大纲">✏️</button></div>
            <div v-if="!isEditingOutline">
              <div class="outline-section"><h4>主要人物</h4>
                <div v-if="parsedOutline.characters && parsedOutline.characters.length" class="characters-grid">
                  <div v-for="(char, idx) in parsedOutline.characters" :key="'char-'+idx" class="character-card-item"><h5>{{ char.name }}</h5><div class="character-details">
                    <p v-if="char.gender"><strong>性别：</strong> {{ char.gender }}</p><p v-if="char.age"><strong>年龄：</strong> {{ char.age }}</p><p v-if="char.personality"><strong>性格：</strong> {{ char.personality }}</p><p v-if="char.appearance"><strong>外貌：</strong> {{ char.appearance }}</p><p v-if="char.background"><strong>背景：</strong> {{ char.background }}</p><p v-if="char.relationships"><strong>人际关系：</strong> {{ char.relationships }}</p><p v-if="char.description"><strong>介绍：</strong> {{ char.description }}</p>
                  </div></div>
                </div><p v-else>暂无人物信息。</p>
              </div>
              <div class="outline-section"><h4>故事背景</h4><p>{{ parsedOutline.background || '暂无背景描述' }}</p></div>
              <div class="outline-section"><h4>章节规划</h4>
                <div v-if="parsedOutline.chapters && parsedOutline.chapters.length">
                  <div v-for="(part, idx) in parsedOutline.chapters" :key="'part-'+idx" class="chapter-part-item"><h5>{{ part.range }}</h5><p>{{ part.description }}</p></div>
                </div><p v-else>暂无章节规划。</p>
              </div>
            </div>
            <div v-else class="outline-editor"><textarea v-model="outlineEditContent" class="large-textarea outline-edit-textarea"></textarea><div class="button-group"><button @click="cancelEditOutline" class="secondary-btn">取消</button><button @click="saveOutlineEdit" class="primary-btn">保存</button></div></div>
          </div>
          <div class="outline-modification" v-if="!isEditingOutline"><h4>大纲修改意见</h4><textarea v-model="outlineModification" placeholder="请输入修改意见..." class="large-textarea"></textarea><div class="button-group"><button @click="modifyOutline" :disabled="outlineLoading" class="secondary-btn"><span v-if="outlineLoading && !confirmingOutline"><span class="button-spinner"></span> 处理中...</span><span v-else>提交修改</span></button><button @click="confirmOutline" :disabled="outlineLoading" class="primary-btn">确认大纲，生成细纲</button></div></div>
        </div>
      </div>
      
      <!-- 小说内容生成部分 -->
      <div class="section story-section" v-if="step === 'content'">
        <div class="story-container">
          <div class="chapter-list-wrapper">
            <div class="chapter-list card">
              <h3>章节列表</h3>
              <div class="chapter-controls">
                <button @click="toggleGeneratingAll" class="primary-btn full-width-btn"><span v-if="generatingBatch"><span class="button-spinner"></span> 停止生成</span><span v-else>生成全部</span></button>
                <button @click="exportNovel" class="secondary-btn full-width-btn export-btn">导出小说 (TXT)</button>
                <div class="context-setting"><label for="context-chapter-count">上下文章节数:</label><select id="context-chapter-count" v-model.number="contextChapterCount"><option value="0">无限制</option><option v-for="n in 10" :key="n" :value="n">{{ n }}</option></select></div>
                <button @click="showOutlineModal = true" class="secondary-btn full-width-btn">查看大纲</button>
                <button @click="showDetailPlansModal = true" class="secondary-btn full-width-btn">查看/管理细纲</button>
              </div>
              <ul>
                <li v-for="(chapter, index) in chapters" :key="'chap-'+index" :class="{ active: currentChapterIndex === index, generated: chapter.status === 'generated', generating: chapter.status === 'generating', error: chapter.status === 'error' }" @click="selectChapter(index)">
                  第{{ index + 1 }}章 <span v-if="chapter.title">- {{ chapter.title }}</span>
                  <span v-if="chapter.status === 'generated'" class="word-count">({{ chapter.wordCount }}字)</span>
                  <span v-if="chapter.status === 'generating'" class="status-badge generating">生成中...</span>
                  <span v-if="chapter.status === 'pending'" class="status-badge pending">待生成</span>
                  <span v-if="chapter.status === 'error'" class="status-badge error">生成失败</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div class="content-area-wrapper">
            <div class="content-area card">
              <div v-if="isDetailPlanStep" class="detail-plan">
                <h3>细纲生成 ({{ currentDetailPlanRange }})</h3>
                <div v-if="detailPlanLoading" class="loading-indicator"><div class="spinner"></div><p>正在生成细纲，请稍候...</p></div>
                <div v-else-if="detailPlanError" class="error-message"><p>{{ detailPlanError }}</p><button @click="generateDetailPlan" class="primary-btn">重新生成细纲</button></div>
                <div v-else class="detail-plan-content">
                  <div v-if="!isEditingDetailPlan">
                    <div v-for="(chapter, idx) in parsedDetailPlan" :key="'detail-'+idx" class="detail-chapter-item"><h4>第{{ (currentDetailPlanStart + idx) }}章: {{ chapter.title }}</h4><p>{{ chapter.summary }}</p></div>
                    <div class="button-group"><button @click="startEditDetailPlan" class="secondary-btn">✏️ 编辑细纲</button><button @click="confirmDetailPlanAndScroll" :disabled="detailPlanLoading" class="primary-btn">确认细纲</button></div>
                  </div>
                  <div v-else class="detail-plan-editor"><textarea v-model="detailPlanEditContent" class="large-textarea detail-plan-edit-textarea"></textarea><div class="button-group"><button @click="cancelEditDetailPlan" class="secondary-btn">取消</button><button @click="saveDetailPlanEdit" class="primary-btn">保存</button></div></div>
                  <div class="detail-plan-modification" v-if="!isEditingDetailPlan"><h4>细纲修改意见</h4><textarea v-model="detailPlanModification" placeholder="请输入修改意见..." class="large-textarea"></textarea><div class="button-group"><button @click="modifyDetailPlan" :disabled="detailPlanLoading" class="secondary-btn"><span v-if="detailPlanLoading"><span class="button-spinner"></span> 处理中...</span><span v-else>提交修改</span></button></div></div>
                </div>
              </div>
              
              <div v-else class="chapter-content">
                 <div class="chapter-navigation-top" v-if="currentChapter">
                    <button @click="navigateToPreviousChapter" :disabled="!canNavigatePrevious" class="nav-btn">
                      <span class="arrow">←</span> 上一章
                    </button>
                    <h3 class="current-chapter-title-nav">
                        第{{ currentChapterIndex + 1 }}章: {{ currentChapter.title || '未命名' }}
                    </h3>
                    <button @click="navigateToNextChapter" :disabled="!canNavigateNext" class="nav-btn">
                      {{ nextChapterButtonText }} <span class="arrow">→</span>
                    </button>
                </div>

                <div v-if="!currentChapter" class="placeholder-message"><p>请从左侧选择章节或点击“生成全部”按钮开始创作。</p></div>
                <div v-else-if="currentChapter.status === 'generating'" class="loading-indicator"><div class="spinner"></div><p>正在生成章节内容，请稍候...</p></div>
                <div v-else-if="currentChapter.status === 'error'" class="error-message"><p>生成失败: {{ currentChapter.error }}</p><button @click="regenerateChapter(currentChapterIndex)" class="primary-btn">重新生成</button></div>
                <div v-else-if="currentChapter.status === 'generated'" class="chapter-display">
                  <div class="chapter-header-main">
                      <!-- Title moved to chapter-navigation-top -->
                      <button @click="startEditChapter" class="edit-btn icon-btn" title="编辑章节">✏️</button>
                  </div>
                  <div v-if="!isEditingChapter" class="chapter-text formatted-text" v-html="formattedChapterContent"></div>
                  <div v-else class="chapter-editor"><textarea v-model="chapterEditContent" class="large-textarea chapter-edit-textarea"></textarea><div class="button-group"><button @click="cancelEditChapter" class="secondary-btn">取消</button><button @click="saveChapterEdit" class="primary-btn">保存</button></div></div>
                  <div class="chapter-modification" v-if="!isEditingChapter"><h4>修改内容</h4><textarea v-model="contentModification" placeholder="请输入修改意见或内容指导..." class="large-textarea"></textarea>
                    <div class="button-group">
                      <button @click="modifyChapter" :disabled="contentLoading && !generatingNext" class="secondary-btn"><span v-if="contentLoading && !generatingNext"><span class="button-spinner"></span> 处理中...</span><span v-else>修改当前章节</span></button>
                      <!-- Next chapter button moved to top navigation -->
                    </div>
                  </div>
                </div>
                <div v-else-if="currentChapter.status === 'pending'" class="placeholder-message"><p>此章节待生成。您可以点击上方“{{nextChapterButtonText}}”或等待自动生成。</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 大纲查看模态窗口 -->
      <div v-if="showOutlineModal" class="modal-overlay" @click="showOutlineModal = false">
        <div class="modal-content card" @click.stop><div class="modal-header"><h3>{{ parsedOutline.title || '小说大纲' }}</h3><button class="close-btn" @click="showOutlineModal = false" title="关闭">×</button></div>
          <div class="modal-body formatted-text">
            <div class="outline-section"><h4>主要人物</h4>
              <div v-if="parsedOutline.characters && parsedOutline.characters.length" class="characters-grid">
                <div v-for="(char, idx) in parsedOutline.characters" :key="'modal-char-'+idx" class="character-card-item"><h5>{{ char.name }}</h5><div class="character-details">
                  <p v-if="char.gender"><strong>性别：</strong> {{ char.gender }}</p><p v-if="char.age"><strong>年龄：</strong> {{ char.age }}</p><p v-if="char.personality"><strong>性格：</strong> {{ char.personality }}</p><p v-if="char.appearance"><strong>外貌：</strong> {{ char.appearance }}</p><p v-if="char.background"><strong>背景：</strong> {{ char.background }}</p><p v-if="char.relationships"><strong>人际关系：</strong> {{ char.relationships }}</p><p v-if="char.description"><strong>介绍：</strong> {{ char.description }}</p>
                </div></div>
              </div><p v-else>暂无人物信息。</p>
            </div>
            <div class="outline-section"><h4>故事背景</h4><p>{{ parsedOutline.background || '暂无背景描述' }}</p></div>
            <div class="outline-section"><h4>章节规划</h4>
              <div v-if="parsedOutline.chapters && parsedOutline.chapters.length">
                <div v-for="(part, idx) in parsedOutline.chapters" :key="'modal-part-'+idx" class="chapter-part-item"><h5>{{ part.range }}</h5><p>{{ part.description }}</p></div>
              </div><p v-else>暂无章节规划。</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 细纲查看/管理模态窗口 -->
      <div v-if="showDetailPlansModal" class="modal-overlay" @click="showDetailPlansModal = false">
        <div class="modal-content card detail-plan-modal" @click.stop>
          <div class="modal-header"><h3>细纲管理</h3><button class="close-btn" @click="showDetailPlansModal = false" title="关闭">×</button></div>
          <div class="modal-body">
            <div v-if="!detailPlans.length" class="placeholder-message"><p>尚未生成任何细纲。</p></div>
            <div v-for="(plan, planIndex) in detailPlans" :key="'modal-plan-'+planIndex" class="detail-plan-item-modal">
              <div class="detail-plan-header-modal" @click="toggleDetailPlanCollapseInModal(planIndex)">
                <span class="collapse-icon">{{ plan.collapsed ? '▶' : '▼' }}</span>
                细纲: {{ plan.range }}
                <button @click.stop="editDetailPlanFromModal(planIndex)" class="edit-btn icon-btn mini-btn" title="编辑此细纲">✏️</button>
              </div>
              <div v-if="!plan.collapsed" class="detail-plan-chapters-modal">
                <div v-for="(chapter, idx) in plan.chapters" :key="'modal-plan-chapter-'+idx" class="detail-chapter-item">
                  <h5>第{{ plan.startChapter + idx }}章: {{ chapter.title }}</h5>
                  <p>{{ chapter.summary }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 回到顶部按钮 -->
      <button v-show="showScrollTopButton" @click="scrollToTop" class="scroll-top-btn" title="回到顶部">↑</button>
    </div>
  </div>
</template>

<script>
import { gptChat } from './components/services/AiModelService.js'; // 确保路径正确

export default {
  name: 'NovelGenerator',
  data() {
    return {
      step: 'config',
      outlineLoading: false,
      outlineError: null,
      confirmingOutline: false,
      
      configs: {},
      configNames: [],
      outlineConfig: '',
      outlineModel: '',
      outlineModels: [],
      contentConfig: '',
      contentModel: '',
      contentModels: [],
      
      categories: [
        { name: '玄幻', selected: false }, { name: '奇幻', selected: false },
        { name: '仙侠', selected: false }, { name: '武侠', selected: false },
        { name: '科幻', selected: false }, { name: '未来世界', selected: false },
        { name: '都市', selected: false }, { name: '都市异能', selected: false },
        { name: '职场', selected: false }, { name: '历史', selected: false },
        { name: '军事', selected: false }, { name: '谍战', selected: false },
        { name: '游戏', selected: false }, { name: '体育', selected: false },
        { name: '悬疑', selected: false }, { name: '探险', selected: false },
        { name: '轻小说', selected: false }, { name: '同人', selected: false }
      ],
      genres: [
        { name: '升级练功', selected: false }, { name: '重生', selected: false },
        { name: '穿越', selected: false }, { name: '系统流', selected: false },
        { name: '无敌流', selected: false }, { name: '废柴崛起', selected: false },
        { name: '学院流', selected: false }, { name: '召唤流', selected: false },
        { name: '种田流', selected: false }, { name: '经营养成', selected: false },
        { name: '文娱明星', selected: false }, { name: '学霸科技', selected: false },
        { name: '美食', selected: false }, { name: '日常', selected: false },
        { name: '搞笑', selected: false }, { name: '迪化流', selected: false },
        { name: '群像', selected: false }, { name: '末世', selected: false },
      ],
      personalities: [
        { name: '杀伐果断', selected: false }, { name: '冷静理智', selected: false },
        { name: '热血冲动', selected: false }, { name: '幽默风趣', selected: false },
        { name: '腹黑', selected: false }, { name: '扮猪吃虎', selected: false },
        { name: '温柔体贴', selected: false }, { name: '孤僻高冷', selected: false },
        { name: '阳光开朗', selected: false }, { name: '成熟稳重', selected: false },
        { name: '正直善良', selected: false }, { name: '睚眦必报', selected: false },
        { name: '苟道', selected: false }, { name: '无耻', selected: false },
        { name: '奋斗逼', selected: false }, { name: '咸鱼', selected: false }
      ],
      femaleLeads: 1,
      totalChapters: 30,
      chapterWordCount: 2000,
      otherRequirements: '',
      
      newCategory: '',
      newGenre: '',
      newPersonality: '',
      
      outlineContent: '',
      parsedOutline: { title: '', characters: [], background: '', chapters: [] },
      outlineModification: '',
      isEditingOutline: false,
      outlineEditContent: '',
      showOutlineModal: false,
      showDetailPlansModal: false, // For new detail plans modal
      
      isDetailPlanStep: false,
      currentDetailPlanStart: 1,
      currentDetailPlanEnd: 10,
      detailPlanContent: '',
      parsedDetailPlan: [],
      detailPlanLoading: false,
      detailPlanError: null,
      detailPlanModification: '',
      isEditingDetailPlan: false,
      detailPlanEditContent: '',
      detailPlans: [], 
      
      chapters: [],
      currentChapterIndex: null,
      contentModification: '',
      contentLoading: false,
      generatingNext: false,
      generatingBatch: false,
      shouldStopGenerating: false,
      contextChapterCount: 3, 
      isEditingChapter: false,
      chapterEditContent: '',
      showScrollTopButton: false,
    };
  },
  computed: {
    currentChapter() {
      return this.currentChapterIndex !== null && this.chapters[this.currentChapterIndex] 
             ? this.chapters[this.currentChapterIndex] 
             : null;
    },
    isLastChapter() {
      if (this.currentChapterIndex === null) return false;
      return this.currentChapterIndex >= this.chapters.length - 1;
    },
    formattedChapterContent() {
      if (!this.currentChapter || !this.currentChapter.content) return '';
      return this.currentChapter.content.split('\n').map(p => {
        const trimmedP = p.trim();
        if (trimmedP === '') return '<br>';
        if (trimmedP.length > 0) {
           return `<p style="text-indent: 2em;">${trimmedP.replace(/</g, '<').replace(/>/g, '>')}</p>`;
        }
        return `<p>${trimmedP.replace(/</g, '<').replace(/>/g, '>')}</p>`;
      }).join('');
    },
    currentDetailPlanRange() {
      return `第${this.currentDetailPlanStart}章 - 第${this.currentDetailPlanEnd}章`;
    },
    canNavigatePrevious() {
      return this.currentChapterIndex !== null && this.currentChapterIndex > 0;
    },
    canNavigateNext() {
      return this.currentChapterIndex !== null && this.currentChapterIndex < this.chapters.length - 1;
    },
    nextChapterButtonText() {
      if (!this.canNavigateNext || this.currentChapterIndex === null) return '下一章';
      const nextChapter = this.chapters[this.currentChapterIndex + 1];
      if (nextChapter && nextChapter.status === 'generated') {
        return '查看下一章';
      }
      return '生成下一章';
    },
  },
  methods: {
    handleScroll() {
      this.showScrollTopButton = window.scrollY > 200;
    },
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    async loadConfigData() {
      try {
        const module = await import('./components/services/AiModelService.js');
        const loadedConfig = module.loadConfig();
        this.configs = loadedConfig?.模型?.configs || {};
        this.configNames = Object.keys(this.configs);
        if (this.configNames.length > 0) {
          this.outlineConfig = this.configNames[0];
          this.contentConfig = this.configNames[0];
          this.loadModelsForConfig('outline');
          this.loadModelsForConfig('content');
        } else {
          this.outlineError = '模型配置文件为空或格式不正确。';
        }
      } catch (error) {
        this.outlineError = '无法加载模型配置: ' + error.message;
      }
    },
    loadModelsForConfig(type) {
      const configName = type === 'outline' ? this.outlineConfig : this.contentConfig;
      if (!configName || !this.configs[configName]) {
          if (type === 'outline') { this.outlineModels = []; this.outlineModel = ''; } 
          else { this.contentModels = []; this.contentModel = ''; }
          return;
      }
      const models = this.configs[configName]?.models || [];
      if (type === 'outline') {
        this.outlineModels = models;
        this.outlineModel = models.length > 0 ? models[0].name : '';
      } else {
        this.contentModels = models;
        this.contentModel = models.length > 0 ? models[0].name : '';
      }
    },
    goToStep(step) { this.step = step; },
    toggleSelection(item) { item.selected = !item.selected; },
    addCustomItem(type) {
      let newItemStr = ''; let list; let inputField;
      if (type === 'category') { newItemStr = this.newCategory.trim(); list = this.categories; inputField = 'newCategory'; } 
      else if (type === 'genre') { newItemStr = this.newGenre.trim(); list = this.genres; inputField = 'newGenre'; } 
      else if (type === 'personality') { newItemStr = this.newPersonality.trim(); list = this.personalities; inputField = 'newPersonality'; } 
      else { return; }
      if (newItemStr && !list.some(item => item.name === newItemStr)) { list.push({ name: newItemStr, selected: true }); }
      this[inputField] = '';
    },
    decrementFemaleLeads() { if (this.femaleLeads > 0) this.femaleLeads--; },
    incrementFemaleLeads() { if (this.femaleLeads < 10) this.femaleLeads++; },
    async generateOutline() {
      this.outlineLoading = true; this.outlineError = null; this.confirmingOutline = false;
      try {
        const systemPrompt = `你是一位专业的男频小说大纲策划师。请根据用户的要求，创作一个小说大纲。
输出格式必须是严格的JSON格式，包含以下字段：
{
"title": "小说标题",
"characters": [ { "name": "角色名", "gender": "性别", "age": "年龄 (可选)", "personality": "性格特点", "appearance": "外貌描述 (可选)", "background": "角色背景", "relationships": "与其他角色的关系 (可选)", "description": "其他重要信息 (可选)" } ],
"background": "故事背景详细描述 (世界观、时代等)",
"chapters": [ { "range": "第1-5章", "description": "这部分剧情概述" } ]
}
请确保你的输出是有效的JSON格式，不要添加额外的解释或前言后语。对于角色描述，请务必详细介绍主要角色的性格、背景等信息。`;
        const requirements = this.buildRequirementsText();
        const response = await gptChat( this.outlineConfig, this.outlineModel, systemPrompt, [requirements] );
        this.outlineContent = response; this.parseOutlineContent();
        if (!this.outlineError) { this.goToStep('outline'); }
      } catch (error) { this.outlineError = `生成大纲失败: ${error.message || '未知错误'}`; } 
      finally { this.outlineLoading = false; }
    },
    buildRequirementsText() {
      let text = "请为我创作一部男频小说大纲，要求如下：\n\n";
      const sc = this.categories.filter(c => c.selected).map(c => c.name); if (sc.length > 0) text += `小说分类：${sc.join('、')}\n`;
      const sg = this.genres.filter(g => g.selected).map(g => g.name); if (sg.length > 0) text += `小说流派：${sg.join('、')}\n`;
      const sp = this.personalities.filter(p => p.selected).map(p => p.name); if (sp.length > 0) text += `男主性格：${sp.join('、')}\n`;
      text += `女主数量：${this.femaleLeads}\n`; text += `预计章节数：${this.totalChapters}\n`; text += `每章字数大约：${this.chapterWordCount}字\n`;
      if (this.otherRequirements.trim()) { text += `其他要求：${this.otherRequirements.trim()}\n`; }
      text += "\n请根据以上要求，设计一个完整的男频小说大纲。大纲中应包括小说标题、主要人物介绍（包括详细的性格、背景等）、故事背景，以及详细的章节规划。章节规划需按照每5章为一个部分进行划分，直至结局。";
      return text;
    },
    parseOutlineContent() {
      try {
        let jsonContent = this.outlineContent; const firstBrace = jsonContent.indexOf('{'); const lastBrace = jsonContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) { jsonContent = jsonContent.substring(firstBrace, lastBrace + 1); } 
        else { throw new Error("无法找到有效的JSON对象。"); }
        const parsed = JSON.parse(jsonContent);
        this.parsedOutline = { title: parsed.title || '', characters: Array.isArray(parsed.characters) ? parsed.characters : [], background: parsed.background || '', chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [] };
        this.outlineEditContent = JSON.stringify(this.parsedOutline, null, 2); this.outlineError = null;
      } catch (error) { this.outlineError = '解析大纲JSON格式失败。错误: ' + error.message; this.parsedOutline = { title: '', characters: [], background: '', chapters: [] }; }
    },
    startEditOutline() { this.isEditingOutline = true; this.outlineEditContent = JSON.stringify(this.parsedOutline, null, 2); },
    cancelEditOutline() { this.isEditingOutline = false; },
    saveOutlineEdit() {
      try {
        const parsed = JSON.parse(this.outlineEditContent);
        this.parsedOutline = { title: parsed.title || '', characters: parsed.characters || [], background: parsed.background || '', chapters: parsed.chapters || [] };
        this.outlineContent = JSON.stringify(parsed); this.isEditingOutline = false;
      } catch (error) { alert('JSON格式错误: ' + error.message); }
    },
    async modifyOutline() {
      if (!this.outlineModification.trim()) { alert("请输入修改意见。"); return; }
      this.outlineLoading = true; this.outlineError = null; this.confirmingOutline = false;
      try {
        const systemPrompt = `你是一位专业的男频小说大纲策划师。用户对之前生成的大纲有一些修改意见。请根据用户的修改意见，更新小说大纲。输出格式必须是严格的JSON，同原始格式。`;
        const currentOutlineJson = JSON.stringify(this.parsedOutline, null, 2);
        const response = await gptChat( this.outlineConfig, this.outlineModel, systemPrompt, [ "这是当前的大纲内容：\n" + currentOutlineJson, "我已经了解当前大纲。", "请根据以下修改意见更新大纲：\n" + this.outlineModification ] );
        this.outlineContent = response; this.parseOutlineContent(); this.outlineModification = '';
      } catch (error) { this.outlineError = `修改大纲失败: ${error.message || '未知错误'}`; } 
      finally { this.outlineLoading = false; }
    },
    confirmOutline() {
      this.confirmingOutline = true; this.outlineLoading = true;
      this.chapters = Array.from({ length: this.totalChapters }, (_, i) => ({ title: '', content: '', status: 'pending', error: null, wordCount: 0 }));
      this.detailPlans = []; this.isDetailPlanStep = true;
      this.currentDetailPlanStart = 1; this.currentDetailPlanEnd = Math.min(10, this.totalChapters);
      this.$nextTick(async () => {
          try { await this.generateDetailPlan(); this.goToStep('content'); } 
          catch (error) { /* handled in generateDetailPlan */ } 
          finally { this.outlineLoading = false; this.confirmingOutline = false; }
      });
    },
    async generateDetailPlan() {
      this.detailPlanLoading = true; this.detailPlanError = null;
      try {
        const partIndex = Math.floor((this.currentDetailPlanStart - 1) / 10);
        const currentPartDesc = this.parsedOutline.chapters[partIndex]?.description || '无特定描述';
        const systemPrompt = `你是一位专业的男频小说内容策划师。根据小说大纲和当前部分的剧情概述，生成详细的章节细纲。
输出格式必须是严格的JSON数组，每个元素代表一章：
[ { "title": "章节标题 (不含'第X章')", "summary": "本章详细内容概述 (至少50字)" } ]
请确保生成 ${this.currentDetailPlanEnd - this.currentDetailPlanStart + 1} 章的细纲。内容应包含足够细节，以便后续生成约 ${this.chapterWordCount} 字的章节正文。仅输出JSON数组，不要添加额外解释。`;
        let octx = `小说标题：${this.parsedOutline.title}\n故事背景：${this.parsedOutline.background}\n主要角色：\n`;
        this.parsedOutline.characters.forEach(c => { octx += `- ${c.name}：${c.personality || ''} ${c.background || ''}\n`; });
        octx += `\n整体章节规划：\n${this.parsedOutline.chapters.map(p => `${p.range}：${p.description}`).join('\n')}\n`;
        octx += `\n当前规划部分：${this.currentDetailPlanRange}\n当前部分大纲描述：${currentPartDesc}`;
        const response = await gptChat( this.contentConfig, this.contentModel, systemPrompt, [octx] );
        this.detailPlanContent = response; this.parseDetailPlanContent();
      } catch (error) { this.detailPlanError = `生成细纲失败: ${error.message || '未知错误'}`; } 
      finally { this.detailPlanLoading = false; }
    },
    parseDetailPlanContent() {
      try {
        let jsonContent = this.detailPlanContent;
        const firstBracket = jsonContent.indexOf('['); const lastBracket = jsonContent.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) { jsonContent = jsonContent.substring(firstBracket, lastBracket + 1); } 
        else { throw new Error("无法找到有效的JSON数组。"); }
        const parsed = JSON.parse(jsonContent);
        this.parsedDetailPlan = Array.isArray(parsed) ? parsed : [];
        this.detailPlanEditContent = JSON.stringify(this.parsedDetailPlan, null, 2); this.detailPlanError = null;
      } catch (error) { this.detailPlanError = '解析细纲JSON格式失败: ' + error.message; this.parsedDetailPlan = []; }
    },
    startEditDetailPlan() { this.isEditingDetailPlan = true; this.detailPlanEditContent = JSON.stringify(this.parsedDetailPlan, null, 2); },
    cancelEditDetailPlan() { this.isEditingDetailPlan = false; },
    saveDetailPlanEdit() {
      try {
        const parsed = JSON.parse(this.detailPlanEditContent);
        this.parsedDetailPlan = Array.isArray(parsed) ? parsed : [];
        this.detailPlanContent = JSON.stringify(parsed); this.isEditingDetailPlan = false;
      } catch (error) { alert('JSON格式错误: ' + error.message); }
    },
    async modifyDetailPlan() {
      if (!this.detailPlanModification.trim()) { alert("请输入修改意见。"); return; }
      this.detailPlanLoading = true; this.detailPlanError = null;
      try {
        const systemPrompt = `你是一位专业的男频小说内容策划师。用户对之前生成的章节细纲有修改意见。请根据修改意见更新细纲。输出格式必须是严格的JSON数组，同原始格式。确保生成 ${this.currentDetailPlanEnd - this.currentDetailPlanStart + 1} 章的细纲，每章概述至少50字，以便后续生成约 ${this.chapterWordCount} 字的章节。`;
        const currentDetailPlanJson = JSON.stringify(this.parsedDetailPlan, null, 2);
        const response = await gptChat( this.contentConfig, this.contentModel, systemPrompt, [ "当前章节细纲：\n" + currentDetailPlanJson, "我已了解当前细纲。", "请根据以下修改意见更新：\n" + this.detailPlanModification ] );
        this.detailPlanContent = response; this.parseDetailPlanContent(); this.detailPlanModification = '';
      } catch (error) { this.detailPlanError = `修改细纲失败: ${error.message || '未知错误'}`; } 
      finally { this.detailPlanLoading = false; }
    },
    confirmDetailPlan() {
      if (!this.parsedDetailPlan || this.parsedDetailPlan.length === 0) { alert("细纲内容为空，无法确认。"); return; }
      this.parsedDetailPlan.forEach((detail, i) => {
        const chapIdx = this.currentDetailPlanStart + i - 1;
        if (chapIdx < this.chapters.length) { this.chapters[chapIdx].title = detail.title || `未命名章节 ${chapIdx + 1}`; }
      });
      const existingPlanIdx = this.detailPlans.findIndex(p => p.startChapter === this.currentDetailPlanStart);
      const newPlan = { startChapter: this.currentDetailPlanStart, endChapter: this.currentDetailPlanEnd, range: this.currentDetailPlanRange, chapters: [...this.parsedDetailPlan], collapsed: false };
      if (existingPlanIdx !== -1) { this.detailPlans.splice(existingPlanIdx, 1, newPlan); } 
      else { this.detailPlans.push(newPlan); this.detailPlans.sort((a, b) => a.startChapter - b.startChapter); }
      this.isDetailPlanStep = false;
      if (this.currentChapterIndex === null || this.currentChapterIndex < this.currentDetailPlanStart -1 || this.currentChapterIndex > this.currentDetailPlanEnd -1) { this.selectChapter(this.currentDetailPlanStart - 1); }
      if (this.currentChapter && this.currentChapter.status === 'pending' && this.currentChapterIndex >= this.currentDetailPlanStart - 1 && this.currentChapterIndex <= this.currentDetailPlanEnd - 1) { this.generateChapterContent(this.currentChapterIndex); }
    },
    confirmDetailPlanAndScroll() {
      this.confirmDetailPlan();
      this.scrollToTop();
    },
    toggleDetailPlanCollapseInModal(index) { this.detailPlans[index].collapsed = !this.detailPlans[index].collapsed; },
    editDetailPlanFromModal(planIndex) {
      const plan = this.detailPlans[planIndex];
      this.currentDetailPlanStart = plan.startChapter; this.currentDetailPlanEnd = plan.endChapter;
      this.parsedDetailPlan = [...plan.chapters]; this.detailPlanContent = JSON.stringify(plan.chapters);
      this.detailPlanEditContent = JSON.stringify(plan.chapters, null, 2);
      this.isDetailPlanStep = true; this.isEditingDetailPlan = false;
      this.detailPlanError = null; this.detailPlanLoading = false;
      this.showDetailPlansModal = false; // Close modal
      this.goToStep('content'); // Ensure correct step
    },
    async selectChapter(index) {
      if (index < 0 || index >= this.chapters.length) return;

      // Rule: No skipping generation for 'pending' chapters
      if (this.chapters[index].status === 'pending') {
        for (let i = 0; i < index; i++) {
          if (this.chapters[i].status === 'pending') {
            alert(`请先生成第 ${i + 1} 章。`);
            return;
          }
        }
      }

      const chapterNumber = index + 1;
      const partIndex = Math.floor(index / 10);
      const partStart = partIndex * 10 + 1;
      const partEnd = Math.min(partStart + 9, this.totalChapters);
      const existingPlan = this.detailPlans.find(p => chapterNumber >= p.startChapter && chapterNumber <= p.endChapter);

      if (!existingPlan) {
        if (this.isDetailPlanStep && (this.currentDetailPlanStart !== partStart || this.currentDetailPlanEnd !== partEnd)) {
          const proceed = confirm('您正在编辑/查看一个细纲部分，切换到新的细纲部分将丢失当前未确认的细纲更改。是否继续？');
          if (!proceed) return;
        }
        this.currentDetailPlanStart = partStart; this.currentDetailPlanEnd = partEnd;
        this.isDetailPlanStep = true; await this.generateDetailPlan();
        return; 
      }
      
      this.isDetailPlanStep = false; this.currentChapterIndex = index;
      this.contentModification = ''; this.isEditingChapter = false;
      
      if (this.chapters[index].status === 'pending') { this.generateChapterContent(index); }
    },
    async generateChapterContent(index) {
      // ... (core generation logic remains unchanged, ensure it uses this.chapterWordCount)
      if (index < 0 || index >= this.chapters.length || this.chapters[index].status === 'generating') return;
      this.chapters[index].status = 'generating'; this.chapters[index].error = null; this.contentLoading = true;
      try {
        const chapterNumber = index + 1;
        const detailPlan = this.detailPlans.find(p => chapterNumber >= p.startChapter && chapterNumber <= p.endChapter);
        if (!detailPlan) throw new Error(`找不到第 ${chapterNumber} 章的细纲。请先生成并确认对应区间的细纲。`);
        const chapterDetailIndex = chapterNumber - detailPlan.startChapter;
        const chapterDetailPlan = detailPlan.chapters[chapterDetailIndex];
        if (!chapterDetailPlan) throw new Error(`细纲中缺少第 ${chapterNumber} 章的具体规划。`);
        
        let prevChapsCtx = []; let ctxCount = parseInt(this.contextChapterCount);
        if (ctxCount === 0) ctxCount = index; else ctxCount = Math.min(ctxCount, index);
        for (let i = Math.max(0, index - ctxCount); i < index; i++) {
          if (this.chapters[i].status === 'generated') { prevChapsCtx.push(`第${i + 1}章 ${this.chapters[i].title}:\n${this.chapters[i].content}\n`); }
        }
        
        const systemPrompt = `你是一位专业的男频小说创作者。根据大纲、细纲和上文，创作小说章节。输出一章完整小说内容，约 ${this.chapterWordCount} 字，情节连贯，描写生动。直接输出正文，无需章节标题或额外说明。由于是长篇小说，因此章节内容与上文应该有好的衔接关系，除了根据大纲或细纲得知待生成的是结局章节，否则为了保证内容的连贯性，输出的结尾不需要有总结性话语`;
        let userMsg = `小说标题：${this.parsedOutline.title}\n当前章节：第${chapterNumber}章 ${chapterDetailPlan.title}\n\n小说大纲摘要：\n背景：${this.parsedOutline.background}\n主要角色：\n`;
        this.parsedOutline.characters.forEach(c => { userMsg += `- ${c.name} (${c.personality || 'N/A'}): ${c.description || c.background || 'N/A'}\n`; });
        const partIdx = Math.floor(index / 10);
        userMsg += `\n当前剧情部分 (${this.parsedOutline.chapters[partIdx]?.range || 'N/A'}): ${this.parsedOutline.chapters[partIdx]?.description || 'N/A'}\n`;
        userMsg += `\n本章细纲 (${chapterDetailPlan.title}): ${chapterDetailPlan.summary}\n\n`;
        if (prevChapsCtx.length > 0) { userMsg += "上文回顾 (摘要)：\n" + prevChapsCtx.join("\n") + "\n"; }
        userMsg += `请创作第${chapterNumber}章《${chapterDetailPlan.title}》的内容，要求字数约 ${this.chapterWordCount} 字。`;
        if (this.contentModification.trim() && this.currentChapterIndex === index) { userMsg += `\n\n修改/续写要求：${this.contentModification.trim()}`; }
        
        const response = await gptChat( this.contentConfig, this.contentModel, systemPrompt, [userMsg] );
        this.chapters[index].content = response; this.chapters[index].status = 'generated';
        this.chapters[index].wordCount = countChineseWords(response); this.chapters[index].title = chapterDetailPlan.title;
        if (this.currentChapterIndex === index) this.contentModification = '';
      } catch (error) { this.chapters[index].status = 'error'; this.chapters[index].error = error.message || '未知错误'; } 
      finally { if (this.currentChapterIndex === index) { this.contentLoading = false; } }
    },
    startEditChapter() { if (this.currentChapter && this.currentChapter.status === 'generated') { this.isEditingChapter = true; this.chapterEditContent = this.currentChapter.content; } },
    cancelEditChapter() { this.isEditingChapter = false; },
    saveChapterEdit() { if (this.currentChapterIndex !== null) { this.chapters[this.currentChapterIndex].content = this.chapterEditContent; this.chapters[this.currentChapterIndex].wordCount = countChineseWords(this.chapterEditContent); this.isEditingChapter = false; } },
    async modifyChapter() {
      // ... (core logic unchanged)
      if (!this.currentChapter || this.currentChapter.status !== 'generated' || !this.contentModification.trim()) { alert("请先选中一个已生成的章节并输入修改意见。"); return; }
      const index = this.currentChapterIndex; this.contentLoading = true; this.generatingNext = false;
      try {
        const systemPrompt = `你是一位专业的男频小说创作者。用户对之前生成的章节内容有修改意见。请根据修改意见更新章节内容。输出一章完整小说内容，约 ${this.chapterWordCount} 字。直接输出修改后的正文。`;
        const response = await gptChat( this.contentConfig, this.contentModel, systemPrompt, [ `当前第${index + 1}章《${this.chapters[index].title}》的内容：\n${this.chapters[index].content}`, "我已了解当前章节内容。", `请根据以下修改意见更新章节（重点修改或补充）：\n${this.contentModification}` ] );
        this.chapters[index].content = response; this.chapters[index].wordCount = countChineseWords(response); this.contentModification = '';
      } catch (error) { alert(`修改章节失败: ${error.message || '未知错误'}`); } 
      finally { this.contentLoading = false; }
    },
    navigateToPreviousChapter() {
      if (this.canNavigatePrevious) {
        this.selectChapter(this.currentChapterIndex - 1);
      }
    },
    async navigateToNextChapter() {
      if (!this.canNavigateNext) return;
      const nextIndex = this.currentChapterIndex + 1;
      if (this.chapters[nextIndex] && this.chapters[nextIndex].status === 'generated') {
        this.selectChapter(nextIndex);
      } else {
        // This will trigger generation if pending, or show error if error, respecting no-skip rule
        this.contentLoading = true; 
        this.generatingNext = true;
        await this.selectChapter(nextIndex); 
        // selectChapter handles its own loading for generation, but we manage general button state
        // Wait for status change or error
         const checkInterval = setInterval(() => {
            if (this.chapters[nextIndex] && (this.chapters[nextIndex].status === 'generated' || this.chapters[nextIndex].status === 'error')) {
                this.contentLoading = false;
                this.generatingNext = false;
                clearInterval(checkInterval);
            } else if (!this.chapters[nextIndex]) { // Safety break
                this.contentLoading = false;
                this.generatingNext = false;
                clearInterval(checkInterval);
            }
        }, 500);
      }
    },
    regenerateChapter(index) { if (index < 0 || index >= this.chapters.length) return; this.contentModification = ''; this.generateChapterContent(index); },
    toggleGeneratingAll() { if (this.generatingBatch) { this.shouldStopGenerating = true; } else { this.shouldStopGenerating = false; this.generateAllChapters(); } },
    async generateAllChapters() {
      // ... (core logic largely unchanged, respects no-skip via sequential processing)
      if (this.generatingBatch && !this.shouldStopGenerating) return; 
      this.generatingBatch = true;
      let currentIndex = this.chapters.findIndex(ch => ch.status === 'pending');
      if (currentIndex === -1 && this.currentChapterIndex !== null && this.currentChapterIndex < this.chapters.length -1) {
          currentIndex = this.currentChapterIndex + 1;
          if (currentIndex >= this.chapters.length || this.chapters[currentIndex].status !== 'pending') { currentIndex = -1; }
      }
      if (currentIndex === -1) { currentIndex = this.chapters.findIndex(ch => ch.status === 'pending'); }
      if (currentIndex === -1) { alert("所有章节已生成或正在生成中。"); this.generatingBatch = false; return; }

      while (currentIndex < this.chapters.length && !this.shouldStopGenerating) {
        if (this.chapters[currentIndex].status === 'pending') {
          this.currentChapterIndex = currentIndex; 
          const chapterNumber = currentIndex + 1; const partIndex = Math.floor(currentIndex / 10);
          const partStart = partIndex * 10 + 1; const partEnd = Math.min(partStart + 9, this.totalChapters);
          let detailPlan = this.detailPlans.find(p => chapterNumber >= p.startChapter && chapterNumber <= p.endChapter);
          if (!detailPlan) {
            this.currentDetailPlanStart = partStart; this.currentDetailPlanEnd = partEnd; this.isDetailPlanStep = true;
            await this.generateDetailPlan();
            if (this.detailPlanError || this.shouldStopGenerating) { this.isDetailPlanStep = false; break;  }
            this.confirmDetailPlan(); this.isDetailPlanStep = false; 
          }
          await this.generateChapterContent(currentIndex);
          if (this.chapters[currentIndex].status === 'error' || this.shouldStopGenerating) { break; }
        }
        currentIndex++; await new Promise(resolve => setTimeout(resolve, 100)); 
      }
      this.generatingBatch = false; this.shouldStopGenerating = false;
    },
    exportNovel() {
      // ... (core logic unchanged)
      let novelContent = `书名：${this.parsedOutline.title || '未命名作品'}\n\n作者：AI生成\n\n总章节数：${this.totalChapters}\n每章目标字数：${this.chapterWordCount}\n\n--------------------\n小说大纲\n--------------------\n\n故事背景：\n${this.parsedOutline.background || '暂无背景描述'}\n\n主要人物：\n`;
      if (this.parsedOutline.characters && this.parsedOutline.characters.length > 0) { this.parsedOutline.characters.forEach(char => { novelContent += `- ${char.name || '未知角色'}:\n`; if(char.gender) novelContent += `  性别: ${char.gender}\n`; if(char.age) novelContent += `  年龄: ${char.age}\n`; if(char.personality) novelContent += `  性格: ${char.personality}\n`; if(char.appearance) novelContent += `  外貌: ${char.appearance}\n`; if(char.background) novelContent += `  背景: ${char.background}\n`; if(char.relationships) novelContent += `  人际关系: ${char.relationships}\n`; if(char.description) novelContent += `  简介: ${char.description}\n`; novelContent += "\n"; }); } else { novelContent += "暂无人物信息。\n\n"; }
      novelContent += "章节规划概要：\n"; if (this.parsedOutline.chapters && this.parsedOutline.chapters.length > 0) { this.parsedOutline.chapters.forEach(part => { novelContent += `- ${part.range || '未知范围'}: ${part.description || '暂无描述'}\n`; }); } else { novelContent += "暂无章节规划。\n"; } novelContent += "\n\n--------------------\n小说正文\n--------------------\n\n";
      let generatedCount = 0; this.chapters.forEach((chapter, index) => { if (chapter.status === 'generated' && chapter.content) { novelContent += `第 ${index + 1} 章 ${chapter.title || ''}\n\n`; const paragraphs = chapter.content.split('\n').map(p => p.trim()).filter(p => p.length > 0); paragraphs.forEach(p => { novelContent += `　　${p}\n\n`; }); novelContent += "\n--------------------\n\n"; generatedCount++; } });
      if (generatedCount === 0) { novelContent += "暂无已生成的章节内容。\n"; }
      const blob = new Blob([novelContent], { type: 'text/plain;charset=utf-8' }); const link = document.createElement('a'); const fileName = (this.parsedOutline.title || '我的AI小说').replace(/[<>:"/\\|?*]+/g, '_'); link.download = `${fileName}.txt`; link.href = URL.createObjectURL(blob); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); alert(`小说已开始下载为 "${fileName}.txt"`);
    }
  },
  mounted() {
    this.loadConfigData();
    window.addEventListener('scroll', this.handleScroll);
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  }
};

function countChineseWords(text) {
  if (!text) return 0; const cleanText = text.replace(/\s+/g, '');
  const cjkRegex = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4DC0-\u4DFF\u4E00-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF]/g;
  const cjkMatches = cleanText.match(cjkRegex); const cjkCount = cjkMatches ? cjkMatches.length : 0;
  const nonCjkText = cleanText.replace(cjkRegex, ' ').trim();
  const otherWords = nonCjkText.split(/\s+/).filter(Boolean).length;
  return cjkCount + otherWords;
}
</script>

<style scoped>
:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --light-bg: #f4f7f9;
  --card-bg: #ffffff;
  --text-color: #333;
  --border-color: #e0e6ed;
  --header-height: 60px; /* Example, adjust if you have a fixed header */
}

body {
  font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--light-bg);
  color: var(--text-color);
  line-height: 1.6;
  margin: 0;
}

.novel-generator-container {
  max-width: 1600px; /* Increased max-width for wider layout */
  margin: 20px auto;
  padding: 0px 20px 20px 20px; /* No top padding, handled by title */
}

.novel-generator {
  display: flex;
  flex-direction: column;
  gap: 20px; /* Reduced gap between sections */
}

.title {
  text-align: center;
  color: #2c3e50;
  font-size: 2.2em;
  margin: 20px 0 25px 0;
  font-weight: 600;
}

.section {
  /* Sections are now more about logical grouping, cards provide visual separation */
}

.section-title {
  font-size: 1.6em;
  color: #34495e;
  margin-bottom: 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.card {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  margin-bottom: 20px;
}

/* Config Section */
.config-selection { display: flex; gap: 25px; justify-content: space-around; margin-bottom: 20px; }
.model-selector { flex: 1; min-width: 280px; }
.model-selector h3 { font-size: 1.2em; color: var(--primary-color); margin-bottom: 15px; }
.select-group { margin-bottom: 15px; display: flex; align-items: center; }
.select-group label { margin-right: 10px; font-weight: 500; min-width: 50px; }
select { width: 100%; padding: 10px 12px; border: 1px solid #bdc3c7; border-radius: 6px; background-color: var(--card-bg); font-size: 1em; }
select:focus { border-color: var(--primary-color); outline: none; box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2); }

/* Requirements Section Layout */
.requirements-layout {
  display: flex;
  gap: 20px;
}
.requirements-main {
  flex-grow: 3; /* Main content takes more space */
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.requirements-sidebar {
  flex-grow: 1;
  min-width: 280px; /* Ensure sidebar has decent width */
  max-width: 320px;
  align-self: flex-start; /* Align to top */
}
.requirements-sidebar h3 {
  font-size: 1.2em;
  color: var(--primary-color);
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color);
}
.setting-item {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column; /* Stack label and input vertically */
  gap: 5px;
}
.setting-item label { font-weight: 500; font-size: 0.95em; }
.setting-item .number-input, .setting-item input[type="number"] { width: 100%; }
.setting-item input[type="number"] { box-sizing: border-box; } /* Ensure padding doesn't add to width */
.setting-item .number-input span { margin-left: 5px; }


.requirement-group h3 { font-size: 1.1em; color: #2c3e50; margin-bottom: 12px; }
.tag-group { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-item { padding: 6px 12px; border: 1px solid var(--primary-color); color: var(--primary-color); border-radius: 15px; cursor: pointer; font-size: 0.9em; }
.tag-item:hover { background-color: #eaf5fb; }
.tag-item.selected { background-color: var(--primary-color); color: white; }
.custom-input-group { display: flex; gap: 8px; align-items: center; width: 100%; margin-top:8px; }
.custom-input-group input[type="text"] { flex-grow: 1; padding: 8px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9em; }
.add-btn { padding: 8px 12px; background-color: var(--secondary-color); color: white; border: none; border-radius: 4px; cursor: pointer; }
.add-btn:hover { background-color: #27ae60; }

.number-input { display: flex; align-items: center; gap: 5px; }
.number-input input[type="number"] { width: 60px; padding: 8px; text-align: center; border: 1px solid #ccc; border-radius: 4px; }
.number-input input[type="number"]::-webkit-inner-spin-button, .number-input input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.number-input input[type="number"] { -moz-appearance: textfield; }
.number-input button { padding: 6px 10px; background-color: #ecf0f1; border: 1px solid #bdc3c7; border-radius: 4px; cursor: pointer; }
.number-input button:disabled { opacity: 0.5; cursor: not-allowed; }

textarea.large-textarea { /* Class for wider textareas */
  width: 100%;
  min-height: 150px; /* Increased default height */
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1em;
  resize: vertical;
  box-sizing: border-box;
}
.outline-edit-textarea, .detail-plan-edit-textarea, .chapter-edit-textarea {
  font-family: 'Courier New', Courier, monospace;
  line-height: 1.5;
  min-height: 350px; /* Ensure ample space */
}

/* Outline Section */
.outline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.outline-header h3 { color: var(--primary-color); font-size: 1.5em; }
.outline-section h4 { font-size: 1.15em; color: #34495e; margin-top: 18px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px dashed #eee; }
.characters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; } /* Wider cards */
.character-card-item { border: 1px solid var(--border-color); border-radius: 6px; padding: 15px; background-color: #fdfdfd;}
.character-card-item h5 { font-size: 1.05em; color: #2c3e50; margin-bottom: 8px; }
.character-details p { font-size: 0.9em; margin-bottom: 5px; color: #555; }
.chapter-part-item { margin-bottom: 15px; padding: 10px; background-color: #f9f9f9; border-left: 3px solid var(--primary-color); }
.chapter-part-item h5 { font-size: 1.05em; color: var(--primary-color); margin-bottom: 5px; }

/* Story Content Section */
.story-section { padding: 0; /* Remove section padding, card will handle it */ }
.story-container {
  position: relative;
}

.chapter-list-wrapper {
  position: fixed;
  left: 20px; /* 调整与视口左侧的间距 */
  top: 100px; /* 根据标题实际高度调整，避免覆盖标题 */
  width: 320px; /* 固定宽度 */
  height: calc(99vh - 120px); /* 计算高度，留出顶部和底部空间 */
  overflow-y: auto; /* 允许章节列表滚动 */
  z-index: 100; /* 确保显示在内容上方 */
  background: var(--card-bg); /* 背景色避免透明 */
  box-shadow: 0 2px 8px rgba(0,0,0,0.1); /* 可选阴影效果 */
}
.chapter-list.card {
  height: 96%;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Parent controls overflow */
}
.chapter-list h3 { font-size: 1.3em; color: #2c3e50; margin-bottom: 15px; }
.chapter-list ul {
  list-style-type: none;
  padding: 0; margin: 0;
  overflow-y: auto; /* Scrollbar for the list itself */
  flex-grow: 1; /* Take remaining space */
}
.chapter-list li { padding: 9px 12px; border-bottom: 1px solid #ecf0f1; cursor: pointer; border-radius: 4px; margin-bottom: 4px; font-size: 0.9em; }
.chapter-list li:hover { background-color: #f0f4f7; }
.chapter-list li.active { background-color: var(--primary-color); color: white; font-weight: 500; }
.chapter-list li.active .word-count, .chapter-list li.active .status-badge { color: #f0f4f7; }
.chapter-list li.generated { border-left: 3px solid var(--secondary-color); }
.chapter-list li.generating { border-left: 3px solid #f39c12; }
.chapter-list li.error { border-left: 3px solid #e74c3c; }

.word-count { font-size: 0.8em; color: #7f8c8d; margin-left: 5px; }
.status-badge { font-size: 0.75em; padding: 2px 6px; border-radius: 10px; margin-left: 5px; color: white; }
.status-badge.generating { background-color: #f39c12; }
.status-badge.pending { background-color: #95a5a6; }
.status-badge.error { background-color: #e74c3c; }

.content-area-wrapper {
  margin-left: 340px; /* 320px左侧栏宽度 + 20px间距 */
  width: calc(100% - 340px); /* 占据剩余宽度 */
  height: calc(99vh - 180px); /* 根据实际情况调整高度 */
  overflow-y: hidden; /* 允许内容区域滚动 */
}
.content-area.card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* Scrollbar for the content area */
}

.chapter-controls { margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px; }
.full-width-btn { width: 100%; }
.export-btn { background-color: #16a085; color:white; }
.export-btn:hover { background-color: #1abc9c; }
.context-setting { display: flex; align-items: center; gap: 8px; font-size: 0.85em; margin: 3px 0; }
.context-setting label { white-space: nowrap; }
.context-setting select { flex-grow: 1; padding: 5px 8px; font-size: 0.9em;}

.chapter-navigation-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}
.current-chapter-title-nav {
  font-size: 1.4em;
  color: var(--primary-color);
  margin: 0;
  text-align: center;
  flex-grow: 1;
}
.nav-btn {
  background-color: #f0f4f7;
  border: 1px solid #dce4ec;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.nav-btn:hover:not(:disabled) { background-color: #e4e9ed; }
.nav-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.nav-btn .arrow { font-weight: bold; }


.placeholder-message { display: flex; justify-content: center; align-items: center; flex-grow: 1; color: #7f8c8d; font-size: 1.1em; text-align: center; }
.chapter-header-main { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 5px; } /* Title removed */
.formatted-text p, .formatted-text div { margin-bottom: 1em; line-height: 1.7; }
.formatted-text br { display: block; content: ""; margin-top: 0.5em; }

/* Buttons */
.primary-btn, .secondary-btn, .edit-btn, .add-btn { padding: 9px 18px; border: none; border-radius: 5px; cursor: pointer; font-size: 0.95em; font-weight: 500; transition: background-color 0.2s, box-shadow 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.primary-btn { background-color: var(--primary-color); color: white; }
.primary-btn:hover { background-color: #2980b9; }
.primary-btn:disabled { background-color: #a9d6f5; cursor: not-allowed; }
.secondary-btn { background-color: #ecf0f1; color: #2c3e50; border: 1px solid #bdc3c7; }
.secondary-btn:hover { background-color: #dde1e2; }
.secondary-btn:disabled { background-color: #f5f7f7; color: #aaa; cursor: not-allowed; }
.edit-btn.icon-btn { background: none; border: none; color: var(--primary-color); font-size: 1.4em; padding: 5px; }
.edit-btn.icon-btn:hover { color: #2980b9; background-color: #f0f4f7; }
.button-group { display: flex; gap: 12px; margin-top: 18px; flex-wrap: wrap; }
.next-btn { width: 100%; margin-top: 20px; font-size: 1.05em; padding: 11px; }

/* Spinners and Loaders */
.loading-indicator { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; text-align: center; color: #555; flex-grow: 1; }
.spinner { border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color); border-radius: 50%; width: 35px; height: 35px; animation: spin 1s linear infinite; margin-bottom: 12px; }
.button-spinner { display: inline-block; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; width: 0.9em; height: 0.9em; animation: spin 0.8s linear infinite; }
.secondary-btn .button-spinner { border-color: rgba(0,0,0,0.1); border-top-color: var(--primary-color); }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.error-message { background-color: #ffebee; color: #c62828; padding: 12px; border-radius: 6px; border-left: 4px solid #e53935; margin: 12px 0; }
.error-message p { margin-bottom: 8px; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; }
.modal-content { background-color: white; padding: 20px; border-radius: 8px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 5px 20px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 12px; margin-bottom: 18px; }
.modal-header h3 { font-size: 1.4em; color: var(--primary-color); margin: 0; }
.close-btn { background: none; border: none; font-size: 1.7em; color: #7f8c8d; cursor: pointer; padding: 0 5px; line-height: 1; }
.close-btn:hover { color: #555; }
.modal-body .outline-section:last-child { margin-bottom: 0; }

/* Detail Plan Modal Specifics */
.detail-plan-modal { max-width: 800px; } /* Wider for detail plans */
.detail-plan-item-modal { margin-bottom: 10px; border: 1px solid var(--border-color); border-radius: 4px; }
.detail-plan-header-modal { padding: 10px; background-color: #f9f9f9; cursor: pointer; font-weight: 500; display: flex; align-items: center; justify-content: space-between; }
.detail-plan-header-modal:hover { background-color: #f0f4f7; }
.collapse-icon { margin-right: 8px; font-size: 0.8em; }
.detail-plan-chapters-modal { padding: 0 10px 10px 10px; }
.detail-chapter-item { margin-top: 10px; font-size: 0.9em; } /* Re-use from content-area if possible */
.detail-chapter-item h5 { font-size: 1em; color: #555; margin-bottom: 3px; }
.detail-chapter-item p { font-size: 0.95em; color: #666; margin-left: 10px; }
.mini-btn { padding: 2px 5px; font-size: 0.8em; line-height: 1; }
.chapter-display{max-height:60vh;overflow-y:auto}

/* Scroll to Top Button */
.scroll-top-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  transition: opacity 0.3s, transform 0.3s;
  opacity: 0;
  transform: translateY(100px);
  z-index: 999;
}
.scroll-top-btn:hover { background-color: #2980b9; }
.scroll-top-btn[style*="opacity: 1"] { /* For v-show binding */
  opacity: 1;
  transform: translateY(0);
}

input[type="number"],
input[type="text"],
textarea,
select {
  -webkit-appearance: none; /* 移除默认样式，特别是在iOS上 */
  -moz-appearance: none;
  appearance: none;
  background-color: var(--card-bg);
  border: 1px solid #ced4da;
  border-radius: 0.375rem;
  color: var(--text-color);
  display: block; /* 确保占据全部宽度 */
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  padding: 0.5rem 0.75rem; /* 增加一些内部空间 */
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; /* 添加过渡效果 */
  width: 100%; /* 默认占据全部宽度 */
  box-sizing: border-box; /* 使用 border-box 避免 padding 撑大尺寸 */
}

input[type="number"]:focus,
input[type="text"]:focus,
textarea:focus,
select:focus {
  border-color: var(--primary-color);
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25); /* 使用 primary-color */
}

/* 特定输入框的覆盖样式 */
#female-leads {
  width: 50px; /* 或其他适合的数量输入框宽度 */
  display: inline-block;
}

#total-chapters,
#chapter-word-count {
  width: 120px; /* 或其他适合的宽度 */
  display: inline-block;
}

textarea {
  min-height: 100px; /* 增加默认高度，便于输入 */
}

select {
    height: auto; /* 移除固定高度 */
    padding: 0.5rem; /* 调整内边距 */
    line-height: 1.5; /* 设置行高 */
}

/* 修正自定义input-group中的input text样式 */
.custom-input-group input[type="text"] {
    -webkit-appearance: auto;
    -moz-appearance: auto;
    appearance: auto;
    background-color: var(--card-bg);
    border: 1px solid #ced4da;
    border-radius: 0.375rem;
    color: var(--text-color);
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.5;
    padding: 0.5rem 0.75rem;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    width: 100%;
    box-sizing: border-box;
}
@media (max-width: 1200px) { /* Adjustments for slightly smaller desktops */
    .story-container { height: calc(100vh - var(--header-height) - 160px); } /* Less aggressive height reduction */
    .chapter-list-wrapper { width: 300px; }
  }
/* Responsive Adjustments */
@media (max-width: 992px) {
  .novel-generator-container { padding: 0 15px 15px 15px; }
  .requirements-layout { flex-direction: column; }
  .requirements-sidebar { max-width: 100%; }
  .story-container { flex-direction: column; height: auto; min-height: 0; }
  .chapter-list-wrapper { width: 100%; position: static; height: auto; max-height: 45vh; margin-bottom: 20px;}
  .chapter-list.card { height: auto; }
  .content-area-wrapper { height: auto; max-height: 60vh; /* Give content area more space when stacked */}
}
@media (max-width: 768px) { /* Mobile */
  .title { font-size: 1.8em; } .section-title { font-size: 1.3em; }
  .config-selection { flex-direction: column; }
  .model-selector { min-width:unset; }
  .button-group { justify-content: center; }
  .button-group > button { flex-grow: 1; }
  .chapter-navigation-top { flex-direction: column; gap: 8px; align-items: stretch; }
  .nav-btn { justify-content: center; }
  .current-chapter-title-nav { order: -1; margin-bottom: 5px; } /* Move title to top in column layout */
  .formatted-text p, .formatted-text div { font-size: 1em; }
  .modal-content { padding: 20px; max-width: 95%; }
  .scroll-top-btn { bottom: 20px; right: 20px; width: 44px; height: 44px; font-size: 20px;}
}
</style>