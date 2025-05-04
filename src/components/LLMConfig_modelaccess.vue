<template>
  <!-- The outer modal structure (overlay, container) is handled by the parent llm-config.vue -->
  <!-- This component starts with its content -->
  <div class="model-access-content">
    <!-- Modal Header (Provided by this component as requested) -->
    <div class="modal-header">
      <h2 class="modal-title">接入模型配置</h2>
      <button class="close-btn btn btn-text btn-sm" @click="$emit('close')" title="关闭">
        <font-awesome-icon :icon="['fas', 'times']" />
      </button>
    </div>

    <!-- Main Modal Body -->
    <div class="modal-body">
      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="tab-item"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="tab-content-area">
        <!-- Model Settings Tab Content (Not '提示词') -->
        <div v-if="activeTab !== '提示词'" class="settings-tab-content">
          <div class="settings-controls">
             <!-- Using button-row for consistency -->
            <div class="button-row">
              <button class="btn btn-primary btn-sm" @click="addSetting">
                <font-awesome-icon :icon="['fas', 'plus']" /> 新增设置
              </button>
              <button class="btn btn-success btn-sm" @click="saveSettings">
                <font-awesome-icon :icon="['fas', 'save']" /> 保存设置
              </button>
            </div>
          </div>

          <div class="settings-table">
              <div class="settings-header">
                <div class="header-item header-config">配置</div>
                <div class="header-item header-model">模型</div>
                <div class="header-item header-weight">权重</div>
                <div class="header-item header-priority">优先级 ↓</div> <!-- Added arrow indicator -->
                <div class="header-item header-action">操作</div>
              </div>

              <div class="settings-list-container" ref="settingsContainer">
                 <p v-if="sortedSettings.length === 0" class="info-message">
                     暂无设置，请点击“新增设置”。
                 </p>
                 <!-- *** MODIFICATION: Use computed sortedSettings *** -->
                <div
                  v-for="(setting, index) in sortedSettings"
                  :key="setting.id" 
                  class="setting-row"
                  :class="{ 'odd-row': index % 2 !== 0 }"
                >
                  <div class="setting-cell setting-config">
                    <select
                      v-model="setting.config"
                      class="select setting-select"
                       title="选择配置"
                    >
                      <option value="" disabled>-- 选择配置 --</option>
                      <option v-for="name in configNames" :key="name" :value="name">
                        {{ name }}
                      </option>
                       <option v-if="configNames.length === 0" value="" disabled>无可用配置</option>
                    </select>
                  </div>
                  <div class="setting-cell setting-model">
                    <select
                      v-model="setting.model"
                      class="select setting-select"
                      :disabled="!setting.config || (modelsByConfig[setting.config] || []).length === 0"
                       title="选择模型"
                    >
                     <option value="" disabled>-- 选择模型 --</option>
                      <option
                        v-for="name in modelsByConfig[setting.config] || []"
                        :key="name"
                        :value="name"
                      >
                        {{ name }}
                      </option>
                      <option v-if="setting.config && (modelsByConfig[setting.config] || []).length === 0" value="" disabled>配置无模型</option>
                      <option v-if="!setting.config" value="" disabled>先选配置</option>
                    </select>
                  </div>
                  <div class="setting-cell setting-weight">
                    <input
                      type="number"
                      v-model="setting.weight"
                      class="input setting-input"
                      @input="validatePositiveInt($event, setting, 'weight')"
                      placeholder="权重 (正整数)"
                      min="1"
                      title="权重 (必须为正整数)"
                    />
                  </div>
                  <div class="setting-cell setting-priority">
                    <input
                      type="number"
                      v-model="setting.priority"
                      class="input setting-input"
                      @input="validateNatureInt($event, setting, 'priority')"
                      placeholder="优先级 (整数)"
                       min="0"
                       title="优先级 (必须为非负整数)"
                    />
                  </div>
                  <div class="setting-cell setting-action">
                    <!-- Find original index to delete -->
                    <button class="btn btn-danger btn-sm btn-icon-only" @click="deleteSetting(findIndexInOriginal(setting))" title="删除此行设置">
                      <font-awesome-icon :icon="['fas', 'trash-alt']" />
                    </button>
                  </div>
                </div>
              </div>
          </div>

        </div>

        <!-- Prompt Config Tab Content -->
        <div v-else class="prompt-tab-content">

          <div class="prompt-controls">
            <div class="button-row">
              <button class="btn btn-outline btn-sm" @click="importPromptConfig" title="导入JSON格式的提示词配置">
                <font-awesome-icon :icon="['fas', 'upload']" /> 导入提示词
              </button>
              <button class="btn btn-outline btn-sm" @click="exportPromptConfig" title="将当前所有提示词导出为JSON文件">
                <font-awesome-icon :icon="['fas', 'download']" /> 导出提示词
              </button>
              <button class="btn btn-success btn-sm" @click="savePromptConfig" :disabled="!selectedKind || !selectedId" title="保存当前编辑的提示词">
                <font-awesome-icon :icon="['fas', 'save']" /> 保存配置
              </button>
              <button class="btn btn-info btn-sm" @click="testPrompt" :disabled="!selectedKind || !selectedId" title="测试当前提示词的处理结果">
                <font-awesome-icon :icon="['fas', 'flask']" /> 测试提示词
              </button>
            </div>
          </div>

          <div class="prompt-selector">
            <div class="selector-item form-group">
              <label for="kind-select" class="input-label">提示词类型:</label>
              <select
                id="kind-select"
                v-model="selectedKind"
                class="select kind-dropdown"
                @change="updateIdDropdown"
              >
               <option value="" disabled>-- 选择类型 --</option>
                <option
                  v-for="item in kindNumberData"
                  :key="item.kind"
                  :value="item.kind"
                >
                  {{ item.kind }}
                </option>
                 <option v-if="kindNumberData.length === 0" value="" disabled>无类型数据</option>
              </select>
            </div>
            <div class="selector-item form-group">
              <label for="id-select" class="input-label">提示词编号:</label>
              <select
                id="id-select"
                v-model="selectedId"
                class="select id-dropdown"
                @change="loadPromptContent"
                :disabled="idOptions.length === 0"
              >
                <option value="" disabled>-- 选择编号 --</option>
                <option
                  v-for="id in idOptions"
                  :key="id"
                  :value="id"
                >
                  {{ id }}
                </option>
                 <option v-if="selectedKind && idOptions.length === 0" value="" disabled>无可用编号</option>
                 <option v-if="!selectedKind" value="" disabled>先选类型</option>
              </select>
            </div>
          </div>

          <!-- Prompt Editor - Dual Text Areas -->
          <div class="prompt-editor">
              <p v-if="!selectedKind || !selectedId" class="info-message">请先选择提示词类型和编号以编辑内容。</p>
            <div v-else class="editor-container-dual">
              <!-- Prompt Variable Panel -->
              <div class="prompt-editor-panel">
                <label class="input-label prompt-label">提示词变量 (可选):</label>
                 <textarea
                  v-model="promptVarContent"
                  class="input prompt-textarea prompt-var-textarea"
                  placeholder="处理后将作为 prompt1 输出..."
                 ></textarea>
              </div>

              <!-- Prompt Content Panel -->
              <div class="prompt-editor-panel">
                <label class="input-label prompt-label">提示词主体:</label>
                 <textarea
                  v-model="promptContent"
                  class="input prompt-textarea prompt-main-textarea"
                  placeholder="处理后将作为 prompt2 输出..."
                 ></textarea>
               </div>
            </div>
          </div>
           <div class="editor-status">
               <span class="status-text">{{ statusMessage }}</span>
           </div>
        </div>
      </div>
    </div>

    <!-- *** MODIFICATION: Wrapped Test Result Modal in standard .modal overlay *** -->
    <div class="modal" v-if="showTestResultModal" @click.self="closeTestResultModal">
        <div class="modal-content test-result-modal-content card">
            <div class="modal-header">
            <h3 class="modal-title">提示词测试结果</h3>
            <button class="close-btn btn btn-text btn-sm" @click="closeTestResultModal" title="关闭">
                <font-awesome-icon :icon="['fas', 'times']" />
            </button>
            </div>
            <div class="modal-body">
            <div class="result-tabs tab-navigation"> <!-- Reuse tab nav style -->
                <button
                    class="tab-item result-tab"
                    :class="{ active: activeResultTab === 'prompt1' }"
                    @click="activeResultTab = 'prompt1'"
                >
                    Prompt 1
                </button>
                <button
                    class="tab-item result-tab"
                    :class="{ active: activeResultTab === 'prompt2' }"
                    @click="activeResultTab = 'prompt2'"
                >
                    Prompt 2
                </button>
            </div>
            <div class="result-content">
                <textarea
                :value="activeResultTab === 'prompt1' ? testResult.prompt1 : testResult.prompt2"
                class="input result-textarea"
                readonly
                ></textarea>
            </div>
            </div>
            <div class="modal-footer">
            <button class="btn btn-outline" @click="copyTestResult">
                <font-awesome-icon :icon="['fas', 'copy']" /> 复制当前内容
            </button>
            <button class="btn btn-secondary" @click="closeTestResultModal">
                关闭
            </button>
            </div>
      </div>
    </div>

    <!-- Import/Export File Dialog -->
    <input
      type="file"
      ref="fileInput"
      style="display: none;"
      accept=".json"
      @change="handleFileUpload"
    />
  </div>
</template>

<script>
import { processPrompt } from './services/PromptService'; // 确保路径正确
import { v4 as uuidv4 } from 'uuid'; // Import uuid for unique keys

export default {
  name: 'LLMConfig_modelaccess',
  emits: ['close', 'show-message'],
  data() {
    return {
      tabs: ['默认', '大纲', '正文', '选项', '人物', '背景', '音乐', '对话', '总结', '本地导入', '其他', '提示词'],
      activeTab: '默认',
      configNames: [],
      modelNames: [],
      modelsByConfig: {},
      settings: [], // Original settings array

      // Prompt Config state... (same as before)
      kindNumberData: [ { kind: "大纲", number: 6 }, { kind: "选项", number: 6 }, { kind: "故事开头", number: 6 }, { kind: "故事继续", number: 6 }, { kind: "故事结尾", number: 6 }, { kind: "全部人物绘画", number: 2 }, { kind: "单个人物绘画", number: 2 }, { kind: "故事地点绘画", number: 2 }, { kind: "背景音乐生成", number: 2 }, { kind: "开头音乐生成", number: 6 }, { kind: "结尾音乐生成", number: 6 }, { kind: "故事总结", number: 6 }, { kind: "本地导入", number: 6 }, { kind: "重写提示词", number: 1 }, { kind: "首页背景生成", number: 2 }, { kind: "翻译", number: 6 } ],
      selectedKind: '',
      selectedId: '',
      idOptions: [],
      promptContent: '',
      promptVarContent: '',
      currentKind: '',
      currentId: '',
      statusMessage: '准备就绪',

      // Test Result state... (same as before)
      showTestResultModal: false,
      activeResultTab: 'prompt1',
      testResult: { prompt1: '', prompt2: '' },

      // File Upload state... (same as before)
      fileUploadType: null
    };
  },
  // *** MODIFICATION: Added computed property for sorting ***
  computed: {
      sortedSettings() {
        // Create a shallow copy to avoid mutating the original array during sort
        // Add a unique temporary id to each setting if it doesn't have one,
        // needed for reliable v-for key and finding original index
        const settingsWithId = this.settings.map(s => ({ ...s, id: s.id || uuidv4() }));

        return settingsWithId.sort((a, b) => {
            const priorityA = parseInt(a.priority || '0', 10);
            const priorityB = parseInt(b.priority || '0', 10);
            // Sort descending (higher priority first)
            return priorityB - priorityA;
        });
      }
  },
  mounted() {
    this.loadConfigNames();
    this.loadModelNames();
    this.handleTabChange(this.activeTab);
  },
   watch: {
      activeTab(newTab) {
           this.handleTabChange(newTab);
      },
      'settings': {
        deep: true,
        handler(newSettings, oldSettings) {
          if (this.activeTab === '提示词') return;
          if (newSettings && oldSettings) {
            for (let i = 0; i < newSettings.length; i++) {
              // Add unique ID if missing (needed for deleting from sorted list)
              if (!newSettings[i].id) {
                 newSettings[i].id = uuidv4();
              }
              if (i < oldSettings.length && newSettings[i].config !== oldSettings[i].config) {
                  const configModels = this.modelsByConfig[newSettings[i].config] || [];
                  if (configModels.length > 0 && !configModels.includes(newSettings[i].model)) {
                      newSettings[i].model = configModels[0];
                  } else if (configModels.length === 0) {
                       newSettings[i].model = '';
                  }
              } else if (i >= oldSettings.length) {
                  const configModels = this.modelsByConfig[newSettings[i].config] || [];
                  if (configModels.length > 0 && !configModels.includes(newSettings[i].model)) {
                       newSettings[i].model = configModels[0];
                  } else if (configModels.length === 0) {
                      newSettings[i].model = '';
                  }
              }
            }
          }
        }
      }
    },
  methods: {
    // *** MODIFICATION: Helper to find original index using the temporary ID ***
    findIndexInOriginal(settingToFind) {
        return this.settings.findIndex(s => s.id === settingToFind.id);
    },
    handleTabChange(newTab) {
         if (newTab !== '提示词') {
            this.loadSettings();
          } else {
             if (this.kindNumberData.length > 0) {
                if (!this.selectedKind) { this.selectedKind = this.kindNumberData[0].kind; }
                this.updateIdDropdown();
              } else {
                 this.selectedKind = ''; this.selectedId = ''; this.idOptions = []; this.promptContent = ''; this.promptVarContent = ''; this.currentKind = ''; this.currentId = ''; this.statusMessage = '无提示词类型数据';
              }
          }
    },
    loadConfigNames() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (config.模型 && config.模型.configs) { this.configNames = Object.keys(config.模型.configs).sort(); }
      } catch (error) { console.error('Failed to load config names:', error); this.showMessage('error', '加载LLM配置名称失败'); }
    },
    loadModelNames() {
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        this.modelsByConfig = {};
        if (config.模型 && config.模型.configs) {
          for (const configName in config.模型.configs) {
            const models = config.模型.configs[configName].models || [];
            this.modelsByConfig[configName] = Array.isArray(models) ? models.map(model => model.name) : [];
          }
        }
      } catch (error) { console.error('Failed to load model names:', error); this.showMessage('error', '加载LLM模型列表失败'); }
    },
    loadSettings() {
       if (this.activeTab === '提示词') return;
      try {
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        const settingKey = `${this.activeTab}_setting`;
        const savedSettings = config?.模型?.[settingKey];
        if (Array.isArray(savedSettings)) {
          this.settings = savedSettings.map(setting => {
             const configModels = this.modelsByConfig[setting.config] || [];
             let model = setting.model || '';
             if (model && !configModels.includes(model)) { model = configModels.length > 0 ? configModels[0] : ''; }
             else if (!model && configModels.length > 0) { model = configModels[0]; }
              return {
                 config: setting.config || '',
                 model: model,
                 weight: setting.weigh?.toString() || '1',
                 priority: setting.priority?.toString() || '0',
                 id: uuidv4() // Assign unique ID on load for keying/deleting
             };
          });
        } else { this.settings = []; }
      } catch (error) { console.error(`Failed to load settings for ${this.activeTab}:`, error); this.showMessage('error', `加载 ${this.activeTab} 设置失败`); }
    },
    addSetting() {
       let initialConfig = ''; let initialModel = '';
       if (this.configNames.length > 0) {
           initialConfig = this.configNames[0];
           const modelsForFirstConfig = this.modelsByConfig[initialConfig] || [];
           if (modelsForFirstConfig.length > 0) { initialModel = modelsForFirstConfig[0]; }
       }
      this.settings.push({
        config: initialConfig, model: initialModel, weight: '1', priority: '0', id: uuidv4() // Add ID
      });
      this.$nextTick(() => {
        const container = this.$refs.settingsContainer; if (container) { container.scrollTop = container.scrollHeight; }
      });
    },
    // *** MODIFICATION: Use original index found via ID ***
    deleteSetting(originalIndex) {
      if (originalIndex >= 0 && originalIndex < this.settings.length) {
         this.settings.splice(originalIndex, 1);
      } else {
           console.warn("Could not find setting to delete with index:", originalIndex);
      }
    },
    saveSettings() {
      if (this.activeTab === '提示词') return;
      try {
        for (let i = 0; i < this.settings.length; i++) {
          const setting = this.settings[i];
          if (!setting.config) { this.showMessage('error', `配置项不能为空 (行: ${i + 1})`); return; }
          const modelsForConfig = this.modelsByConfig[setting.config] || [];
          if (!setting.model || !modelsForConfig.includes(setting.model)) { this.showMessage('error', `模型项无效或为空 (行: ${i + 1})`); return; }
          if (!setting.weight || !this.isPositiveInt(setting.weight)) { this.showMessage('error', `权重必须是正整数 (行: ${i + 1})`); return; }
          if (setting.priority === null || setting.priority === undefined || !this.isNatureInt(String(setting.priority))) { this.showMessage('error', `优先级必须是非负整数 (行: ${i + 1})`); return; }
        }
        // Format settings for storage (remove temporary id)
        const formattedSettings = this.settings.map(({id, ...rest}) => ({
          config: rest.config,
          model: rest.model,
          weigh: parseInt(rest.weight),
          priority: parseInt(rest.priority)
        }));
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        if (!config.模型) config.模型 = {};
        config.模型[`${this.activeTab}_setting`] = formattedSettings;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        this.showMessage('success', `${this.activeTab} 设置已保存！`);
      } catch (error) { console.error('Failed to save settings:', error); this.showMessage('error', `保存 ${this.activeTab} 设置时出错: ${error.message}`); }
    },
    validateInput(event, setting, field, validationFn) {
        const value = event.target.value;
        if (value === '' || validationFn(value)) { setting[field] = value; event.target.classList.remove('invalid-input'); }
        else { event.target.classList.add('invalid-input'); }
    },
    validatePositiveInt(event, setting, field) { this.validateInput(event, setting, field, this.isPositiveInt); },
    validateNatureInt(event, setting, field) { this.validateInput(event, setting, field, this.isNatureInt); },
    isPositiveInt(value) { return /^[1-9]\d*$/.test(value); },
    isNatureInt(value) { return /^(0|[1-9]\d*)$/.test(value); },

    // --- Prompt Management Methods (Unchanged) ---
    updateIdDropdown() {
      this.saveCurrentPrompt(); const kind = this.selectedKind;
      if (!kind) { this.idOptions = []; this.selectedId = ''; this.promptContent = ''; this.promptVarContent = ''; this.currentKind = ''; this.currentId = ''; this.statusMessage = '请选择提示词类型'; return; }
      const kindData = this.kindNumberData.find(item => item.kind === kind);
      if (kindData) { const numPrompts = kindData.number; this.idOptions = Array.from({ length: numPrompts }, (_, i) => (i + 1).toString()); if (!this.idOptions.includes(this.selectedId)) { this.selectedId = this.idOptions.length > 0 ? this.idOptions[0] : ''; } this.loadPromptContent(); }
      else { this.idOptions = []; this.selectedId = ''; this.promptContent = ''; this.promptVarContent = ''; this.currentKind = kind; this.currentId = ''; this.statusMessage = `未找到 "${kind}" 类型的提示词配置`; }
    },
    loadPromptContent() {
      this.saveCurrentPrompt(); const kind = this.selectedKind; const id = this.selectedId;
      if (!kind || !id) { this.promptContent = ''; this.promptVarContent = ''; this.currentKind = ''; this.currentId = ''; this.statusMessage = '请选择提示词类型和编号'; return; }
      const promptConfig = this.loadPromptSettings(); let found = false; this.promptContent = ''; this.promptVarContent = '';
      for (const kindConfig of promptConfig) { if (kindConfig.kind === kind) { for (const content of kindConfig.content) { if (content.id === id) { this.promptContent = content.prompt || ''; this.promptVarContent = content.prompt_var || ''; found = true; break; } } if (found) break; } }
      this.currentKind = kind; this.currentId = id; this.statusMessage = `已加载: ${kind} - ${id}`;
    },
    saveCurrentPrompt() {
      const kind = this.currentKind; const id = this.currentId; const content = this.promptContent; const varContent = this.promptVarContent;
      if (!kind || !id) { return false; } const promptConfig = this.loadPromptSettings(); let kindConfig = promptConfig.find(config => config.kind === kind);
      if (!kindConfig) { kindConfig = { kind, content: [] }; promptConfig.push(kindConfig); } let promptItem = kindConfig.content.find(item => item.id === id);
      if (!promptItem) { promptItem = { id, prompt: content, prompt_var: varContent }; kindConfig.content.push(promptItem); } else { promptItem.prompt = content; promptItem.prompt_var = varContent; }
      try { const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}'); if (!config.提示词) config.提示词 = []; const kindIndex = config.提示词.findIndex(item => item.kind === kind); if (kindIndex !== -1) { config.提示词[kindIndex] = kindConfig; } else { config.提示词.push(kindConfig); } localStorage.setItem('aiGalgameConfig', JSON.stringify(config)); return true; }
      catch (error) { console.error('Failed to save prompt:', error); this.showMessage('error', `保存提示词时出错: ${error.message}`); return false; }
    },
    savePromptConfig() {
      if (this.saveCurrentPrompt()) { this.showMessage('success', '提示词配置已保存！'); this.statusMessage = '配置已保存'; }
      else { if (!this.currentKind || !this.currentId) { this.showMessage('error', '请先选择要保存的提示词类型和编号'); this.statusMessage = '保存失败: 未选择提示词'; } }
    },
    loadPromptSettings() {
      try { const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}'); return Array.isArray(config.提示词) ? config.提示词 : []; }
      catch (error) { console.error('Failed to load prompt settings:', error); this.showMessage('error', '加载提示词配置失败'); return []; }
    },
    importPromptConfig() { this.fileUploadType = 'prompt'; this.$refs.fileInput.click(); },
    handleFileUpload(event) {
      const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
      reader.onload = (e) => { try { const data = JSON.parse(e.target.result); if (this.fileUploadType === 'prompt') { this.processPromptImport(data); } } catch (error) { console.error('Failed to process file:', error); this.showMessage('error', `文件处理失败: ${error.message}`); } event.target.value = ''; };
      reader.readAsText(file);
    },
    processPromptImport(data) {
      try { if (!Array.isArray(data)) { throw new Error('无效的JSON格式：根元素应为列表 []'); } for (const item of data) { if (!item || typeof item !== 'object' || !item.kind || !Array.isArray(item.content)) { throw new Error('无效的JSON格式：项目必须是包含kind和content的对象'); } for(const contentItem of item.content) { if (!contentItem || typeof contentItem !== 'object' || !contentItem.id || contentItem.prompt === undefined) { throw new Error(`无效的JSON格式："${item.kind}" 内容项目格式错误`); } if (contentItem.prompt_var === undefined) { contentItem.prompt_var = ''; } } } const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}'); config.提示词 = data; localStorage.setItem('aiGalgameConfig', JSON.stringify(config)); this.updateIdDropdown(); this.showMessage('success', '提示词已成功导入'); this.statusMessage = '导入成功'; }
      catch (error) { console.error('Prompt import failed:', error); this.showMessage('error', `导入失败: ${error.message}`); this.statusMessage = '导入失败'; }
    },
    exportPromptConfig() {
      this.saveCurrentPrompt(); const promptConfig = this.loadPromptSettings(); const dataStr = JSON.stringify(promptConfig, null, 2); const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr); const exportFileDefaultName = 'ai_galgame_prompts.json'; const linkElement = document.createElement('a'); linkElement.setAttribute('href', dataUri); linkElement.setAttribute('download', exportFileDefaultName); document.body.appendChild(linkElement); linkElement.click(); document.body.removeChild(linkElement); this.showMessage('success', '提示词已导出'); this.statusMessage = '导出成功';
    },
    async testPrompt() {
      this.saveCurrentPrompt(); const kind = this.selectedKind; const id = this.selectedId;
      if (!kind || !id) { this.showMessage('error', '请选择提示词类型和编号进行测试'); this.statusMessage = '测试失败: 未选择提示词'; return; }
      this.statusMessage = '正在测试提示词...';
      try { const [prompt1, prompt2] = await processPrompt(kind, id);
        if (prompt1 === 'error' && prompt2 === 'error') { this.showMessage('error', '提示词处理失败，请检查配置和日志'); this.statusMessage = '测试失败'; return; }
        else if (prompt1 === null && prompt2 === null) { this.showMessage('warning', '未找到对应的提示词模板，测试结果为空。'); this.testResult.prompt1 = '未找到对应的提示词变量模板'; this.testResult.prompt2 = '未找到对应的提示词模板'; this.statusMessage = '测试完成: 模板未找到'; this.showTestResultModal = true; this.activeResultTab = 'prompt1'; return; }
        this.testResult.prompt1 = prompt1 || '无提示词变量输出'; this.testResult.prompt2 = prompt2 || '无提示词输出'; this.showTestResultModal = true; this.activeResultTab = 'prompt1'; this.statusMessage = '测试完成'; }
      catch (error) { console.error('Failed to test prompt:', error); this.showMessage('error', `测试失败: ${error.message}`); this.statusMessage = '测试失败'; }
    },
    closeTestResultModal() { this.showTestResultModal = false; },
    copyTestResult() {
      const textToCopy = this.activeResultTab === 'prompt1' ? this.testResult.prompt1 : this.testResult.prompt2;
      navigator.clipboard.writeText(textToCopy)
        .then(() => { this.showMessage('success', '内容已复制到剪贴板'); })
        .catch(err => { console.error('Failed to copy text:', err); try { const textarea = document.createElement('textarea'); textarea.value = textToCopy; textarea.style.position = 'fixed'; document.body.appendChild(textarea); textarea.focus(); textarea.select(); document.execCommand('copy'); document.body.removeChild(textarea); this.showMessage('success', '内容已复制到剪贴板 (兼容模式)'); } catch (e) { console.error('Fallback copy failed:', e); this.showMessage('error', '复制失败，请手动复制。'); } });
    },
    showMessage(type, content) {
       let titleType = type; if (type === 'success') titleType = 'success'; else if (type === 'error') titleType = 'error'; else if (type === 'warning') titleType = 'warning';
       this.$emit('show-message', titleType,content );
    }
  }
};
</script>

<style scoped>
/* Styles specific to this component, assuming modal base styles are handled by parent */

.model-access-content {
  display: flex;
  flex-direction: column;
  height: 100%; /* Occupy full height of the modal content area */
  width: 100%;
}

/* Reuse parent's modal header styles if needed, or define here */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding: 15px 20px;
  flex-shrink: 0;
}
.modal-title {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin: 0;
}
.close-btn { /* Inherits from parent scope or define here */ }

/* Modal body specific to this component */
.modal-body {
  padding: 0; /* Remove padding from parent modal-body */
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden; /* Prevent body scroll, handle within tabs */
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  flex-wrap: nowrap; /* Prevent wrapping */
  overflow-x: auto; /* Enable horizontal scrolling */
  background-color: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0; /* Prevent shrinking */
  padding: 0 10px; /* Add padding for scroll space */
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: var(--border-color) var(--surface-color); /* Firefox */
}
.tab-navigation::-webkit-scrollbar { height: 4px; }
.tab-navigation::-webkit-scrollbar-track { background: var(--surface-color); }
.tab-navigation::-webkit-scrollbar-thumb { background-color: var(--border-color); border-radius: 2px; }


.tab-item {
  padding: 10px 13px;
  cursor: pointer;
  border: none;
  background: none;
  color: var(--text-secondary);
  white-space: nowrap;
  font-size: 0.95rem;
  transition: color 0.2s, border-bottom 0.2s;
  border-bottom: 2px solid transparent;
}

.tab-item:hover {
  color: var(--text-primary);
}

.tab-item.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  font-weight: 500;
}

.tab-content-area {
  padding: 20px;
  flex-grow: 1;
  overflow-y: auto; /* Allow content within tabs to scroll */
  background-color: var(--background-color); /* Ensure background */
}

/* Settings Tab Styles */
.settings-tab-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.settings-controls {
  margin-bottom: 15px;
}
.settings-controls .button-row { /* Reuse button row styling */
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}


/* Settings Table Layout */
.settings-table {
   border: 1px solid var(--border-color);
   border-radius: var(--border-radius-md);
   overflow: hidden; /* Clip content within border */
   display: flex;
   flex-direction: column;
   max-height: 450px; /* Set max height for the table area */
}

.settings-header {
  display: flex;
  background-color: var(--surface-color);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.9rem;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.header-item {
  padding: 0 5px;
  text-align: left;
}

/* Define column widths using flex basis */
.header-config, .setting-config { flex: 1 1 25%; min-width: 150px; }
.header-model, .setting-model   { flex: 1 1 25%; min-width: 150px; }
.header-weight, .setting-weight { flex: 0 0 15%; min-width: 80px; }
.header-priority, .setting-priority { flex: 0 0 15%; min-width: 80px; }
.header-action, .setting-action { flex: 0 0 15%; min-width: 70px; text-align: center; }


.settings-list-container {
   overflow-y: auto; /* Make the list scrollable */
   flex-grow: 1;
}
.settings-list-container .info-message {
    padding: 20px;
    text-align: center;
    color: var(--text-secondary);
}


.setting-row {
  display: flex;
  align-items: center; /* Vertically align items in the row */
  border-bottom: 1px solid var(--border-color);
  padding: 8px 10px;
  transition: background-color var(--transition-speed);
}
.setting-row:last-child {
  border-bottom: none;
}
.setting-row.odd-row {
  background-color: var(--surface-color); /* Striping */
}
.setting-row:hover {
  background-color: var(--hover-overlay);
}

.setting-cell {
  padding: 0 5px;
}

.setting-select, .setting-input {
  width: 100%;
  font-size: 0.9rem;
  /* Inherits .select or .input styles */
}

/* Add red border for invalid input */
.setting-input.invalid-input {
  border-color: var(--danger-color);
  box-shadow: 0 0 0 2px rgba(var(--danger-color-rgb, 231, 76, 60), 0.2);
}

.setting-action {
  text-align: center;
}
.btn-icon-only {
   padding: 4px 8px; /* Smaller padding for icon only */
}

/* Prompt Tab Styles */
.prompt-tab-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.prompt-controls {
  margin-bottom: 10px; /* Space below controls */
}
.prompt-controls .button-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}


.prompt-selector {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  align-items: flex-end; /* Align dropdowns at the bottom */
}

.selector-item {
  /* inherits .form-group styles if applied */
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1 1 200px; /* Allow items to grow and wrap */
}
.selector-item .input-label { /* Reuse label style */ }
.selector-item .select { /* Reuse select style */ width: 100%; }


/* Prompt Editor Layout */
.prompt-editor {
  display: flex;
  flex-direction: column;
  flex-grow: 1; /* Take remaining space */
  min-height: 300px; /* Ensure editor has some minimum height */
}

.editor-container-dual {
  display: flex;
  gap: 20px;
  flex-grow: 1;
  min-height: 250px; /* Min height for text areas container */
}

.prompt-editor-panel {
  flex: 1; /* Each panel takes half the space */
  display: flex;
  flex-direction: column;
}

.prompt-label {
   margin-bottom: 8px;
   color: var(--text-secondary);
   font-weight: 500;
}

.prompt-textarea {
  width: 100%;
  flex-grow: 1; /* Textarea fills the panel */
  resize: vertical;
  min-height: 200px; /* Minimum height for textareas */
  font-family: monospace; /* Use monospace for code-like text */
  font-size: 0.9rem;
  line-height: 1.5;
   /* inherits .input styles */
}

.editor-status {
  margin-top: 10px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
}
.shortcut-hints {
    font-style: italic;
    display: none; /* Hide hints for now */
}

/* Test Result Modal Styles */
/* --- MODIFICATION: Added standard modal positioning --- */
.modal { /* Ensure modal positioning is fixed and centered */
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  padding: 15px;
  overflow-y: auto;
}
.test-result-modal-content {
    max-width: 900px; /* Wider modal for results */
    /* Other modal-content styles inherited or defined in parent */
}
.result-tabs { /* Reuse tab nav styles */
    display: flex;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 15px;
    flex-shrink: 0;
}
.result-tab { /* Reuse tab item styles */
    padding: 10px 15px;
    cursor: pointer;
    border: none;
    background: none;
    color: var(--text-secondary);
    font-size: 0.95rem;
    border-bottom: 2px solid transparent;
}
.result-tab:hover { color: var(--text-primary); }
.result-tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 500;}

.result-content {
  width:800px;
    flex-grow: 1;
}

.result-textarea {
  width: 100%;
  height: 350px; /* Fixed height for result display */
  resize: none; /* Disable resizing */
  font-family: monospace;
  font-size: 0.9rem;
   /* inherits .input styles */
}

/* Responsive Adjustments */
@media (max-width: 768px) {
    .header-item { font-size: 0.8rem; }
    .header-config, .setting-config { flex-basis: 30%; min-width: 120px; }
    .header-model, .setting-model   { flex-basis: 30%; min-width: 120px; }
    .header-weight, .setting-weight { flex-basis: 15%; min-width: 60px; }
    .header-priority, .setting-priority { flex-basis: 15%; min-width: 60px; }
    .header-action, .setting-action { flex-basis: 10%; min-width: 50px; }

    .editor-container-dual {
        flex-direction: column; /* Stack textareas */
        gap: 15px;
    }
    .prompt-textarea {
        min-height: 150px;
    }
     .modal-body { padding: 15px; } /* Add padding back for smaller screens */
     .tab-content-area { padding: 15px; }
}

@media (max-width: 576px) {
     .tab-navigation { padding: 0 5px; }
     .tab-item { font-size: 0.9rem; padding: 8px 10px; }
     .settings-header { display: none; /* Hide header on very small screens */ }
     .setting-row { flex-direction: column; align-items: stretch; gap: 8px; padding: 10px; }
     .setting-cell { padding: 0; }
     .header-config, .setting-config,
     .header-model, .setting-model,
     .header-weight, .setting-weight,
     .header-priority, .setting-priority,
     .header-action, .setting-action {
         flex-basis: auto; /* Reset flex basis */
         min-width: 0; /* Reset min width */
         width: 100%; /* Full width */
         text-align: left; /* Reset text align */
     }
      .setting-action { text-align: right; } /* Align delete button right */
      .settings-table { max-height: none; } /* Remove max height */

      .prompt-selector { flex-direction: column; gap: 10px; }
      .selector-item { flex-basis: auto; }
}
</style>