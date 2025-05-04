<template>
  <div class="outline-generator page-container">
    <!-- Main content area -->
    <div class="main-content-area card">
      <!-- Outlines Panel -->
      <div class="outlines-panel">
        <div class="panel-header">
          <h2 class="panel-title">
             <font-awesome-icon :icon="['fas', 'list-ul']" /> 大纲列表
          </h2>
          <button class="btn btn-sm btn-outline" @click="loadOutlineTitles" title="刷新列表">
            <font-awesome-icon :icon="['fas', 'sync-alt']" /> 刷新
          </button>
        </div>

        <div class="panel-content">
          <div v-if="isLoading" class="loading-state">
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon-fa" />
            <span>加载中...</span>
          </div>

          <div v-else-if="outlineTitles.length === 0" class="empty-state">
             <font-awesome-icon :icon="['fas', 'file-lines']" class="empty-icon-fa" />
            <p>暂无大纲</p>
            <!-- Optional: Add create button here -->
          </div>

          <div v-else class="outlines-list">
            <div
              v-for="title in outlineTitles"
              :key="title"
              :class="['outline-item', { active: selectedOutline === title }]"
              @click="selectOutline(title)"
              tabindex="0" @keyup.enter="selectOutline(title)" @keyup.space="selectOutline(title)"
            >
               <div class="outline-icon">
                 <font-awesome-icon :icon="['fas', 'book-open']" />
              </div>
              <div class="outline-info">
                <div class="outline-title">{{ title }}</div>
              </div>
               <!-- Actions appear on hover/focus -->
               <div class="outline-actions">
                  <button class="btn btn-text btn-sm action-btn" @click.stop="viewOutline(title)" title="查看">
                     <font-awesome-icon :icon="['fas', 'eye']" />
                  </button>
                  <button class="btn btn-text btn-sm action-btn" @click.stop="editOutline(title)" title="编辑">
                     <font-awesome-icon :icon="['fas', 'pen-to-square']" />
                  </button>
                  <button class="btn btn-text btn-sm action-btn" @click.stop="exportOutline(title)" title="导出">
                     <font-awesome-icon :icon="['fas', 'file-export']" />
                  </button>
                  <button class="btn btn-text btn-sm action-btn text-danger" @click.stop="confirmDeleteOutline(title)" title="删除">
                     <font-awesome-icon :icon="['fas', 'trash-alt']" />
                  </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Outline View Modal -->
    <div class="modal" v-if="showViewModal" @click.self="showViewModal = false">
      <div class="modal-content view-modal card">
        <div class="modal-header">
          <h2 class="modal-title">大纲查看: {{ currentTitle }}</h2>
           <button class="close-btn btn btn-text btn-sm" @click="showViewModal = false" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
           </button>
        </div>
        <div class="modal-body">
          <div v-if="isViewLoading" class="modal-loading">
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon-fa" />
            <span>加载中...</span>
          </div>
          <div v-else-if="viewError" class="modal-error error-message">
             <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="modal-error-icon-fa" />
            <span>{{ viewError }}</span>
          </div>
          <div v-else class="outline-content">
             <!-- Title Section -->
            <div class="outline-view-section">
              <h3 class="section-heading">
                <font-awesome-icon :icon="['fas', 'thumbtack']" class="section-icon-fa" />
                标题
              </h3>
              <div class="section-content view-text">
                <p>{{ currentOutlineContent.outline?.title || '(无标题)' }}</p>
              </div>
            </div>
            <!-- Outline Section -->
            <div class="outline-view-section">
              <h3 class="section-heading">
                 <font-awesome-icon :icon="['fas', 'scroll']" class="section-icon-fa" />
                剧情大纲
              </h3>
              <div class="section-content view-text">
                 <!-- Handle different outline formats for display -->
                 <div v-if="!currentOutlineContent.outline?.outline" class="text-muted">(无大纲内容)</div>
                 <div v-else-if="typeof currentOutlineContent.outline.outline === 'string'">
                   <pre>{{ currentOutlineContent.outline.outline }}</pre>
                 </div>
                 <ul v-else-if="Array.isArray(currentOutlineContent.outline.outline)">
                   <li v-for="(item, index) in currentOutlineContent.outline.outline" :key="index">
                     {{ typeof item === 'object' ? JSON.stringify(item) : item }}
                   </li>
                 </ul>
                 <div v-else-if="typeof currentOutlineContent.outline.outline === 'object'">
                   <div v-for="(value, key) in currentOutlineContent.outline.outline" :key="key" class="outline-object-item">
                     <strong>{{ key }}:</strong>
                     <pre>{{ typeof value === 'object' ? JSON.stringify(value, null, 2) : value }}</pre>
                   </div>
                 </div>
              </div>
            </div>
             <!-- Character Section -->
            <div class="outline-view-section">
              <h3 class="section-heading">
                 <font-awesome-icon :icon="['fas', 'users']" class="section-icon-fa" />
                角色设定
              </h3>
              <div class="section-content">
                  <div v-if="!currentOutlineContent.character || (Array.isArray(currentOutlineContent.character) && currentOutlineContent.character.length === 0)" class="text-muted">(无角色设定)</div>
                 <!-- Always display as array -->
                 <div v-else-if="Array.isArray(currentOutlineContent.character)" class="character-view-list">
                   <div v-for="(character, index) in currentOutlineContent.character" :key="index" class="character-view-card card">
                     <div class="character-header">
                       <h4 class="character-name">{{ character.name || `角色 ${index + 1}` }}</h4>
                       <div>
                           <span v-if="character.gender" class="badge badge-secondary">{{ character.gender }}</span>
                           <span v-if="character.age !== undefined && character.age !== null" class="badge badge-info age-badge">{{ character.age }}岁</span>
                       </div>
                     </div>
                     <div class="character-properties">
                       <div v-for="(value, key) in character" :key="key" class="character-property" v-if="key !== 'name' && key !== 'gender' && key !== 'age'">
                         <div class="property-label">{{ getPropertyLabel(key) }}</div>
                         <div class="property-value">
                           <pre v-if="typeof value === 'object' && value !== null"><code>{{ JSON.stringify(value, null, 2) }}</code></pre>
                           <p v-else>{{ value }}</p>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
                  <!-- Fallback for non-array character data (should be converted by load, but handle just in case) -->
                 <div v-else class="view-text">
                     <pre>{{ JSON.stringify(currentOutlineContent.character, null, 2) }}</pre>
                 </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
           <button class="btn btn-secondary" @click="showViewModal = false">
             <font-awesome-icon :icon="['fas', 'times']" /> 关闭
           </button>
           <button class="btn btn-primary" @click="editOutline(currentTitle)">
             <font-awesome-icon :icon="['fas', 'pen']" /> 编辑大纲
           </button>
        </div>
      </div>
    </div>

    <!-- Outline Edit Modal -->
    <div class="modal" v-if="showEditModal" @click.self="showEditModal = false">
      <div class="modal-content edit-modal card">
        <div class="modal-header">
          <h2 class="modal-title">大纲编辑: {{ currentTitle }}</h2>
           <button class="close-btn btn btn-text btn-sm" @click="showEditModal = false" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
           </button>
        </div>
        <div class="modal-body">
          <div v-if="isEditLoading" class="modal-loading">
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon-fa" />
            <span>加载中...</span>
          </div>
          <div v-else-if="editError" class="modal-error error-message">
             <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="modal-error-icon-fa" />
            <span>{{ editError }}</span>
          </div>
          <div v-else class="edit-form">
            <!-- Title Edit -->
            <div class="form-group">
              <label for="edit-title" class="form-label">
                 <font-awesome-icon :icon="['fas', 'thumbtack']" class="form-icon-fa" /> 标题 <span class="required">*</span>
              </label>
              <input type="text" id="edit-title" v-model="editOutlineContent.title" placeholder="输入标题" class="input"/>
            </div>

            <!-- Outline Edit -->
            <div class="form-group">
              <label for="edit-outline" class="form-label">
                 <font-awesome-icon :icon="['fas', 'scroll']" class="form-icon-fa" /> 剧情大纲
              </label>
              <!-- JSON Object Editor -->
              <div v-if="editOutlineFormat.outline === 'json'" class="json-editor">
                <div v-for="(item, index) in editOutlineContent.outlineJson" :key="index" class="json-item">
                   <input type="text" v-model="item.key" placeholder="键名" class="input json-key-input"/>
                   <textarea v-model="item.value" placeholder="值 (纯文本或JSON字符串)" rows="3" class="input textarea-input json-value-input"></textarea>
                   <button class="btn btn-danger btn-sm remove-json-btn" @click="removeOutlineJsonItem(index)" title="删除项">
                      <font-awesome-icon :icon="['fas', 'minus']" />
                   </button>
                </div>
                <button class="btn btn-outline btn-sm add-json-btn" @click="addOutlineJsonItem">
                   <font-awesome-icon :icon="['fas', 'plus']" /> 添加项
                </button>
              </div>
              <!-- Plain Text Editor -->
              <textarea v-else id="edit-outline" v-model="editOutlineContent.outlineText" placeholder="输入剧情大纲" rows="8" class="input textarea-input"></textarea>
            </div>

            <!-- Character Editor -->
            <div class="form-group">
              <label class="form-label">
                 <font-awesome-icon :icon="['fas', 'users']" class="form-icon-fa" /> 角色设定
              </label>
              <div class="characters-editor">
                <div v-for="(character, index) in editOutlineContent.characters" :key="index" class="character-edit-card card">
                  <div class="character-edit-header">
                    <h4 class="character-edit-title">角色 {{ index + 1 }}</h4>
                    <button class="btn btn-danger btn-sm remove-character-btn" @click="removeCharacter(index)" title="删除角色">
                       <font-awesome-icon :icon="['fas', 'minus']" />
                    </button>
                  </div>
                   <!-- Basic Info Fields -->
                  <div class="character-basic-info">
                     <div class="form-group character-field">
                        <label :for="'char-name-'+index" class="form-label small-label">名称 <span class="required">*</span></label>
                        <input :id="'char-name-'+index" type="text" v-model="character.name" placeholder="角色名称" class="input character-input"/>
                     </div>
                     <div class="form-group character-field">
                         <label :for="'char-gender-'+index" class="form-label small-label">性别</label>
                         <select :id="'char-gender-'+index" v-model="character.gender" class="select character-input">
                           <option value="">--</option>
                           <option value="男">男</option>
                           <option value="女">女</option>
                           <option value="其他">其他</option>
                         </select>
                      </div>
                      <div class="form-group character-field">
                          <label :for="'char-age-'+index" class="form-label small-label">年龄</label>
                          <input :id="'char-age-'+index" type="number" v-model.number="character.age" placeholder="年龄" class="input character-input" min="0"/>
                      </div>
                  </div>
                  <!-- Dynamic Properties -->
                  <div class="character-properties-edit">
                    <div v-for="(propValue, propKey) in getEditableProperties(character)" :key="propKey" class="form-group character-property-edit">
                      <div class="property-edit-header">
                        <label :for="'char-prop-'+index+'-'+propKey" class="form-label small-label">{{ getPropertyLabel(propKey) }}</label>
                        <!-- Remove button for custom properties -->
                        <button v-if="!standardProperties.includes(propKey)"
                                class="btn btn-text btn-xs remove-property-btn text-danger"
                                @click="removeCharacterProperty(character, propKey)"
                                title="删除属性">
                           <font-awesome-icon :icon="['fas', 'times']" />
                        </button>
                      </div>
                      <textarea :id="'char-prop-'+index+'-'+propKey" v-model="character[propKey]" :placeholder="`输入${getPropertyLabel(propKey)}`" rows="2" class="input textarea-input property-textarea"></textarea>
                    </div>
                    <!-- Add New Property -->
                    <div class="add-property">
                      <input type="text" v-model="newPropertyKey" placeholder="新属性名称" class="input property-key-input" @keyup.enter="addCharacterProperty(character)"/>
                      <button class="btn btn-outline btn-sm" @click="addCharacterProperty(character)" :disabled="!newPropertyKey.trim()">
                         <font-awesome-icon :icon="['fas', 'plus']" /> 添加属性
                      </button>
                    </div>
                  </div>
                </div>
                <button class="btn btn-secondary add-character-btn" @click="addCharacter">
                   <font-awesome-icon :icon="['fas', 'user-plus']" /> 添加角色
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
           <button class="btn btn-secondary" @click="showEditModal = false">
             <font-awesome-icon :icon="['fas', 'ban']" /> 取消
           </button>
           <button class="btn btn-primary" @click="saveEditedOutline" :disabled="isSaving">
             <font-awesome-icon :icon="['fas', isSaving ? 'spinner' : 'floppy-disk']" :spin="isSaving" />
             {{ isSaving ? '保存中...' : '保存修改' }}
           </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="modal" v-if="showDeleteModal" @click.self="showDeleteModal = false">
      <div class="modal-content delete-modal card">
        <div class="modal-header">
          <h2 class="modal-title">确认删除</h2>
           <button class="close-btn btn btn-text btn-sm" @click="showDeleteModal = false" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
           </button>
        </div>
        <div class="modal-body">
          <div class="delete-confirmation">
             <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="warning-icon-fa" />
            <p>确定要删除大纲 <strong>"{{ outlineToDelete }}"</strong> 吗？</p>
            <p class="delete-warning">此操作无法撤销！</p>
          </div>
        </div>
        <div class="modal-footer">
           <button class="btn btn-secondary" @click="showDeleteModal = false">
             <font-awesome-icon :icon="['fas', 'ban']" /> 取消
           </button>
           <button class="btn btn-danger" @click="deleteOutline" :disabled="isDeleting">
             <font-awesome-icon :icon="['fas', isDeleting ? 'spinner' : 'trash-alt']" :spin="isDeleting" />
             {{ isDeleting ? '删除中...' : '确认删除' }}
           </button>
        </div>
      </div>
    </div>

    <!-- Export Modal -->
    <div class="modal" v-if="showExportModal" @click.self="showExportModal = false">
      <div class="modal-content export-modal card">
        <div class="modal-header">
          <h2 class="modal-title">导出大纲: {{ outlineToExport }}</h2>
           <button class="close-btn btn btn-text btn-sm" @click="showExportModal = false" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
           </button>
        </div>
        <div class="modal-body">
          <div v-if="isExportLoading" class="modal-loading">
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon-fa" />
            <span>准备导出数据中...</span>
          </div>
          <div v-else class="export-options">
            <p>请选择要导出的格式：</p>
            <div class="export-format-options">
              <button class="btn btn-outline export-format-btn" @click="exportAsJson">
                 <font-awesome-icon :icon="['fas', 'file']" class="export-format-icon-fa" />
                <span class="btn-text">JSON</span>
              </button>
              <button class="btn btn-outline export-format-btn" @click="exportAsText">
                 <font-awesome-icon :icon="['fas', 'file-lines']" class="export-format-icon-fa" />
                <span class="btn-text">Text</span>
              </button>
              <button class="btn btn-outline export-format-btn" @click="exportAsMarkdown">
                 <font-awesome-icon :icon="['fab', 'markdown']" class="export-format-icon-fa" />
                <span class="btn-text">Markdown</span>
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
           <button class="btn btn-secondary" @click="showExportModal = false">
              <font-awesome-icon :icon="['fas', 'ban']" /> 取消
           </button>
        </div>
      </div>
    </div>

    <!-- Local Notification removed, using $emit now -->

  </div>
</template>

<script>
import {
  loadOutlineContent,
  getAllOutlineTitles,
  saveOutlineContent
} from './services/OutlineService';
import { deletePath } from './services/IndexedDBFileSystem';

// Assume FontAwesome icons are globally registered

export default {
  name: 'OutlineGenerator',
  emits: ['show-message'], // Declare the event
  data() {
    return {
      outlineTitles: [],
      selectedOutline: null,
      isLoading: false,

      showViewModal: false,
      currentTitle: '',
      currentOutlineContent: { outline: {}, character: [] },
      isViewLoading: false,
      viewError: '',

      showEditModal: false,
      editOutlineContent: { title: '', outlineText: '', outlineJson: [], characters: [] },
      editOutlineFormat: { outline: 'text', character: 'array' },
      isEditLoading: false,
      editError: '',
      isSaving: false,

      newPropertyKey: '',
      standardProperties: ['name', 'gender', 'age', 'appearance', 'personality', 'relations', 'others'],
      propertyLabels: { name: '名称', gender: '性别', age: '年龄', appearance: '外貌', personality: '性格', relations: '关系', others: '其他' },

      showDeleteModal: false,
      outlineToDelete: '',
      isDeleting: false,

      showExportModal: false,
      outlineToExport: '',
      isExportLoading: false,

      // Local notification state removed
      // notification: { ... }
    };
  },
  mounted() {
    this.loadOutlineTitles();
  },
  methods: {
    // --- CORE LOGIC METHODS (Unchanged as requested) ---
    async loadOutlineTitles() {
      this.isLoading = true;
      try {
        this.outlineTitles = await getAllOutlineTitles();
        let indexToRemove = this.outlineTitles.indexOf('test');
        if (indexToRemove !== -1) this.outlineTitles.splice(indexToRemove, 1);
        indexToRemove = this.outlineTitles.indexOf('source');
        if (indexToRemove !== -1) this.outlineTitles.splice(indexToRemove, 1);
        // Sort titles alphabetically
        this.outlineTitles.sort((a, b) => a.localeCompare(b));
      } catch (error) {
        console.error('加载大纲标题失败:', error);
        this.handleShowMessage({ title: 'error', message: '加载大纲列表失败' });
      } finally {
        this.isLoading = false;
      }
    },
    selectOutline(title) { this.selectedOutline = title; },
    async viewOutline(title) {
      this.currentTitle = title;
      this.showViewModal = true;
      this.isViewLoading = true;
      this.viewError = '';
      try {
        const content = await loadOutlineContent(title);
        this.currentOutlineContent = content;
      } catch (error) {
        console.error('加载大纲详情失败:', error);
        this.viewError = '加载大纲内容失败: ' + (error.message || '未知错误');
        this.handleShowMessage({ title: 'error', message: '加载大纲内容失败' });
      } finally { this.isViewLoading = false; }
    },
    async editOutline(title) {
      if (this.showViewModal) this.showViewModal = false;
      this.currentTitle = title;
      this.showEditModal = true;
      this.isEditLoading = true;
      this.editError = '';
      this.newPropertyKey = '';
      try {
        const content = await loadOutlineContent(title);
        this.detectAndSetEditFormat(content);
        this.prepareEditContent(content);
      } catch (error) {
        console.error('加载大纲编辑数据失败:', error);
        this.editError = '加载大纲内容失败: ' + (error.message || '未知错误');
        this.handleShowMessage({ title: 'error', message: '加载编辑数据失败' });
      } finally { this.isEditLoading = false; }
    },
    detectAndSetEditFormat(content) {
      if (typeof content.outline?.outline === 'object' && content.outline.outline !== null && !Array.isArray(content.outline.outline)) {
        this.editOutlineFormat.outline = 'json';
      } else { this.editOutlineFormat.outline = 'text'; }
      this.editOutlineFormat.character = 'array';
    },
    prepareEditContent(content) {
      this.editOutlineContent.title = content.outline?.title || '';
      if (this.editOutlineFormat.outline === 'json') {
        this.editOutlineContent.outlineJson = this.convertObjectToJsonItems(content.outline?.outline);
        this.editOutlineContent.outlineText = '';
      } else {
        this.editOutlineContent.outlineText = this.convertOutlineToText(content.outline?.outline);
        this.editOutlineContent.outlineJson = [];
      }
      this.editOutlineContent.characters = this.convertToCharacterArray(content.character);
    },
     convertToCharacterArray(characterData) {
        if (!characterData) return [this.createEmptyCharacter()];
        let characters = [];
        if (Array.isArray(characterData)) {
            characters = characterData;
        } else if (typeof characterData === 'object' && characterData !== null) {
            characters = Object.entries(characterData).map(([name, props]) => ({ name, ...props }));
        } else if (typeof characterData === 'string') {
            characters = [{ name: '角色', description: characterData }];
        } else {
            return [this.createEmptyCharacter()];
        }

        // Ensure standard properties and stringify nested objects for editing
        return characters.map((char, index) => {
             const finalChar = { // Ensure standard properties exist
                name: char.name || `角色 ${index + 1}`,
                gender: char.gender || '',
                age: (char.age === undefined || char.age === null || isNaN(char.age)) ? null : Number(char.age),
             };
             // Add other properties, stringifying objects
            for (const key in char) {
                 if (char.hasOwnProperty(key) && !['name', 'gender', 'age'].includes(key)) {
                    const value = char[key];
                     // Stringify non-null objects (excluding arrays) for textarea editing
                     if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        try {
                             finalChar[key] = JSON.stringify(value, null, 2);
                        } catch (e) {
                             console.warn(`Could not stringify property ${key} for character ${finalChar.name}. Saving as string.`);
                             finalChar[key] = String(value); // Fallback to string
                        }
                    } else {
                         finalChar[key] = value; // Keep other types (string, number, boolean, null, array) as is
                    }
                 }
            }
            return finalChar;
        });
    },
    createEmptyCharacter() { return { name: '', gender: '', age: null, appearance: '', personality: '', relations: '', others: '' }; },
    addCharacter() { this.editOutlineContent.characters.push(this.createEmptyCharacter()); },
    removeCharacter(index) {
        this.editOutlineContent.characters.splice(index, 1);
        if (this.editOutlineContent.characters.length === 0) this.addCharacter();
    },
    getEditableProperties(character) {
      const properties = {};
      if (character && typeof character === 'object') {
        for (const key in character) {
          if (character.hasOwnProperty(key) && !['name', 'gender', 'age'].includes(key)) {
            properties[key] = character[key];
          }
        }
      }
      return properties;
    },
     addCharacterProperty(character) {
        if (!character || typeof character !== 'object') return;
        const key = this.newPropertyKey.trim();
        if (!key) { this.handleShowMessage({ title: 'warning', message: '属性名称不能为空'}); return; }
        if (key.includes('.') || key.includes('$') || key.includes('#') || key.includes('[') || key.includes(']')) {
             this.handleShowMessage({ title: 'warning', message: '属性名称不能包含特殊字符 (. $ # [ ])'}); return;
        }
        if (character.hasOwnProperty(key)) { this.handleShowMessage({ title: 'warning', message: `角色已存在属性 "${key}"`}); return; }

        character[key] = ''; // Add property

        // Add to global labels if needed for consistent display (original logic)
        if (!this.standardProperties.includes(key)) {
            this.standardProperties.push(key);
            this.propertyLabels[key] = key;
        }
        this.newPropertyKey = '';
    },
    removeCharacterProperty(character, key) {
        if (character && typeof character === 'object' && character.hasOwnProperty(key) && !['name', 'gender', 'age'].includes(key)) {
            delete character[key];
             // Consider removing from standardProperties/propertyLabels if no longer used anywhere (complex)
        } else if (['name', 'gender', 'age'].includes(key)) {
            this.handleShowMessage({ title: 'warning', message: `无法删除标准属性 "${this.getPropertyLabel(key)}"`});
        }
    },
    getPropertyLabel(key) { return this.propertyLabels[key] || key; },
    convertObjectToJsonItems(obj) {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
      return Object.entries(obj).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
      }));
    },
    convertOutlineToText(outline) {
      if (!outline) return '';
      if (typeof outline === 'string') return outline;
      if (Array.isArray(outline)) return outline.map(item => typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)).join('\n\n');
      if (typeof outline === 'object' && outline !== null) {
        let text = '';
        for (const [key, value] of Object.entries(outline)) {
          const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
          text += `${key}:\n${valueStr}\n\n`;
        }
        return text.trim();
      }
      return '';
    },
    addOutlineJsonItem() { this.editOutlineContent.outlineJson.push({ key: '', value: '' }); },
    removeOutlineJsonItem(index) { this.editOutlineContent.outlineJson.splice(index, 1); },
    async saveEditedOutline() {
      this.isSaving = true; this.editError = '';
      if (!this.editOutlineContent.title?.trim()) {
        this.handleShowMessage({ title: 'error', message: '大纲标题不能为空' }); this.isSaving = false; return;
      }
      try {
        const outlineObj = { title: this.editOutlineContent.title.trim() };
        if (this.editOutlineFormat.outline === 'json') {
          const outlineJsonData = {};
          this.editOutlineContent.outlineJson.forEach(item => {
            if (item.key.trim()) { try { outlineJsonData[item.key.trim()] = JSON.parse(item.value); } catch (e) { outlineJsonData[item.key.trim()] = item.value; }}
          });
          outlineObj.outline = outlineJsonData;
        } else { outlineObj.outline = this.editOutlineContent.outlineText; }

        // Process characters - parse JSON properties back
        const charactersToSave = this.editOutlineContent.characters
            .filter(char => char && char.name?.trim()) // Filter out characters without names
            .map(editedChar => {
                const finalChar = {};
                 for (const key in editedChar) {
                    if (editedChar.hasOwnProperty(key)) {
                         const value = editedChar[key];
                         if (key === 'name') finalChar.name = value.trim();
                         else if (key === 'gender') finalChar.gender = value.trim() || undefined; // Store empty string as undefined? Or keep? Let's keep empty for now unless DB requires undefined.
                         else if (key === 'age') {
                             const ageNum = Number(value);
                             if (!isNaN(ageNum) && value !== null && value !== '' && value !== undefined) finalChar.age = ageNum;
                         } else if (value !== null && value !== undefined) { // For other props
                            try {
                                // Attempt to parse IF value looks like JSON (starts with { or [)
                                if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
                                     finalChar[key] = JSON.parse(value);
                                } else {
                                     finalChar[key] = value; // Keep as is (string, number, bool, etc.)
                                }
                            } catch (e) {
                                 finalChar[key] = value; // Save as string if parsing fails
                            }
                         }
                    }
                 }
                return finalChar;
        });


        const result = await saveOutlineContent(this.currentTitle, outlineObj, charactersToSave);
        if (result) {
          this.handleShowMessage({ title: 'success', message: '大纲保存成功' });
          this.showEditModal = false;
          await this.loadOutlineTitles();
          const newTitle = this.editOutlineContent.title.trim();
          this.selectedOutline = newTitle; // Update selection
          // If title changed, update currentTitle for consistency, though modal closes
          this.currentTitle = newTitle;
        }
      } catch (error) {
        console.error('保存大纲失败:', error);
        const errorMsg = '保存大纲时发生错误: ' + (error.message || '未知错误');
        this.handleShowMessage({ title: 'error', message: errorMsg });
        this.editError = errorMsg;
      } finally { this.isSaving = false; }
    },
    confirmDeleteOutline(title) { this.outlineToDelete = title; this.showDeleteModal = true; },
    async deleteOutline() {
      this.isDeleting = true;
      try {
        await deletePath(`/data/${this.outlineToDelete}`);
        this.handleShowMessage({ title: 'success', message: `大纲 "${this.outlineToDelete}" 已删除` });
        this.showDeleteModal = false;
        await this.loadOutlineTitles();
        if (this.selectedOutline === this.outlineToDelete) this.selectedOutline = null;
      } catch (error) {
        console.error('删除大纲失败:', error);
        this.handleShowMessage({ title: 'error', message: '删除大纲失败: ' + (error.message || '未知错误') });
      } finally { this.isDeleting = false; }
    },
    exportOutline(title) {
      this.outlineToExport = title;
      this.showExportModal = true;
      this.isExportLoading = true;
      loadOutlineContent(title).then(content => {
        this.currentOutlineContent = content;
        this.isExportLoading = false;
      }).catch(error => {
        console.error('加载大纲导出数据失败:', error);
        this.handleShowMessage({ title: 'error', message: '准备导出数据失败' });
        this.showExportModal = false;
        this.isExportLoading = false;
      });
    },
     exportAsJson() {
        try {
            const exportData = {
                outline: this.currentOutlineContent?.outline || {}, // Use loaded content
                character: this.currentOutlineContent?.character || []
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            this.createDownload(blob, `${this.outlineToExport}.json`);
            this.showExportModal = false;
            this.handleShowMessage({ title: 'success', message: '大纲已导出为JSON格式'});
        } catch (error) {
            console.error('导出JSON失败:', error);
            this.handleShowMessage({ title: 'error', message: '导出JSON失败: ' + (error.message || '未知错误')});
        }
    },
    exportAsText() {
        try {
            let textContent = `标题: ${this.currentOutlineContent?.outline?.title || '(无标题)'}\n\n`;
            textContent += `==== 剧情大纲 ====\n\n`;
            textContent += this.convertOutlineToText(this.currentOutlineContent?.outline?.outline);
            textContent += `\n\n==== 角色设定 ====\n\n`;

            const characters = this.convertToCharacterArray(this.currentOutlineContent?.character); // Use the consistent array format
            if (characters.length > 0) {
                characters.forEach((char, index) => {
                    textContent += `【${char.name || `角色 ${index + 1}`}】\n`;
                    if (char.gender) textContent += `性别: ${char.gender}\n`;
                    if (char.age !== undefined && char.age !== null && !isNaN(char.age)) textContent += `年龄: ${char.age}岁\n`;
                    Object.entries(char).forEach(([key, value]) => {
                        if (!['name', 'gender', 'age'].includes(key) && value !== undefined && value !== null && value !== '') {
                             // Use the string value directly as it was prepared for textareas (JSON objects already stringified)
                             textContent += `${this.getPropertyLabel(key)}: ${value}\n`;
                        }
                    });
                    textContent += '\n';
                });
            } else {
                textContent += '(无角色设定)\n';
            }

            const blob = new Blob([textContent.trim()], { type: 'text/plain;charset=utf-8' });
            this.createDownload(blob, `${this.outlineToExport}.txt`);
            this.showExportModal = false;
            this.handleShowMessage({ title: 'success', message: '大纲已导出为文本格式'});
        } catch (error) {
            console.error('导出文本失败:', error);
            this.handleShowMessage({ title: 'error', message: '导出文本失败: ' + (error.message || '未知错误')});
        }
    },
     exportAsMarkdown() {
        try {
            let mdContent = `# ${this.currentOutlineContent?.outline?.title || '(无标题大纲)'}\n\n`;
            mdContent += `## 剧情大纲\n\n`;
            const outline = this.currentOutlineContent?.outline?.outline;
            if (typeof outline === 'string') { mdContent += outline.replace(/\n/g, '\n\n'); }
            else if (Array.isArray(outline)) {
                outline.forEach(item => {
                    const itemText = typeof item === 'object' ? `\`\`\`json\n${JSON.stringify(item, null, 2)}\n\`\`\`` : String(item);
                    mdContent += `- ${itemText}\n`;
                });
            } else if (typeof outline === 'object' && outline !== null) {
                for (const [key, value] of Object.entries(outline)) {
                    const valueText = typeof value === 'object' ? `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`` : String(value).replace(/\n/g, '\n  ');
                    mdContent += `### ${key}\n\n${valueText}\n\n`;
                }
            }

            mdContent += `\n## 角色设定\n\n`;
            const characters = this.convertToCharacterArray(this.currentOutlineContent?.character); // Use the consistent array format
             if (characters.length > 0) {
                characters.forEach((char, index) => {
                    mdContent += `### ${char.name || `角色 ${index + 1}`}\n\n`;
                    let basicInfo = '';
                    if (char.gender) basicInfo += `- **性别**: ${char.gender}\n`;
                    if (char.age !== undefined && char.age !== null && !isNaN(char.age)) basicInfo += `- **年龄**: ${char.age}岁\n`;
                    if (basicInfo) mdContent += `${basicInfo}\n`;

                    Object.entries(char).forEach(([key, value]) => {
                        if (!['name', 'gender', 'age'].includes(key) && value !== undefined && value !== null && value !== '') {
                            let displayValue = '';
                             // The value here is already potentially stringified JSON from convertToCharacterArray
                             // Try to parse it back for Markdown code block, otherwise treat as plain text
                            try {
                                if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
                                     const parsed = JSON.parse(value);
                                     displayValue = `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
                                } else {
                                    // Treat as plain text, handle newlines for Markdown
                                     displayValue = String(value).replace(/\n/g, '\n\n');
                                }
                            } catch(e) {
                                // If parsing failed, treat as plain text
                                displayValue = String(value).replace(/\n/g, '\n\n');
                            }
                            mdContent += `**${this.getPropertyLabel(key)}**:\n\n${displayValue}\n\n`;
                        }
                    });
                });
             } else {
                  mdContent += '(无角色设定)\n';
             }


            const blob = new Blob([mdContent.trim()], { type: 'text/markdown;charset=utf-8' });
            this.createDownload(blob, `${this.outlineToExport}.md`);
            this.showExportModal = false;
            this.handleShowMessage({ title: 'success', message: '大纲已导出为Markdown格式'});
        } catch (error) {
            console.error('导出Markdown失败:', error);
            this.handleShowMessage({ title: 'error', message: '导出Markdown失败: ' + (error.message || '未知错误')});
        }
    },
    createDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    },

    // --- Notification Method ---
    handleShowMessage(payload) {
        // Emit the event to be caught by the parent (Manage.vue -> App.vue)
        this.$emit('show-message', payload);
        console.log(`[OutlineGenerator][${payload.title?.toUpperCase()}] ${payload.message}`);
    }
  }
};
</script>

<style scoped>
/* --- General Page / Component Styles --- */
.outline-generator {
  /* Removed padding, assuming parent modal body provides it */
  padding: 0;
  height: 100%; /* Fill parent modal body */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent this component from scrolling */
}

.main-content-area {
  /* Base styles, no border/shadow/padding assuming parent handles it */
  background-color: var(--surface-color);
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Contained scrolling within */
  border-radius: 0;
}

/* --- Outlines Panel --- */
.outlines-panel {
  display: flex;
  flex-direction: column;
  height: 100%; /* Fill the main content area */
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 15px 10px 15px; /* Padding inside header */
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.panel-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-content {
  flex-grow: 1;
  overflow-y: auto; /* Allow the list itself to scroll */
  padding: 0 5px 10px 15px; /* Adjust padding for list */
  margin-right: -10px; /* Offset scrollbar if needed */
}

/* --- Loading/Empty States --- */
.loading-state, .empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; text-align: center;
  padding: 40px 20px; color: var(--text-secondary); height: 100%;
}
.loading-icon-fa, .empty-icon-fa {
  font-size: 2.5rem; margin-bottom: 15px; color: var(--primary-color);
}
.empty-icon-fa { color: var(--text-tertiary); }



.outline-item {
  display: flex; align-items: center; padding: 12px 10px;
  border-bottom: 1px solid var(--hover-overlay); cursor: pointer;
  transition: background-color 0.2s ease; position: relative;
}
.outline-item:last-child { border-bottom: none; }
.outline-item:hover, .outline-item:focus-visible { background-color: var(--hover-overlay); }
.outline-item.active {
  background-color: var(--primary-light); color: white;
  border-left: 3px solid var(--primary-dark); padding-left: 7px;
}
.outline-item.active .outline-title,
.outline-item.active .outline-icon .svg-inline--fa { color: white; }
.outline-icon { margin-right: 12px; color: var(--primary-color); font-size: 1.1rem; }
.outline-info { flex-grow: 1; overflow: hidden; }
.outline-title {
  font-weight: 500; color: var(--text-primary); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.outline-actions {
  display: flex; gap: 5px; margin-left: auto; opacity: 0;
  transition: opacity 0.2s ease;
}
.outline-item:hover .outline-actions,
.outline-item:focus-within .outline-actions,
.outline-item.active .outline-actions { opacity: 1; }
.action-btn { padding: 4px 6px; }
.action-btn-icon-fa { font-size: 0.9rem; }
.text-danger .svg-inline--fa { color: var(--danger-color); }
.text-danger:hover .svg-inline--fa { color: var(--danger-dark); }
.outline-item.active .action-btn { color: white; }
.outline-item.active .text-danger .svg-inline--fa { color: var(--danger-light); }
.outline-item.active .text-danger:hover .svg-inline--fa { color: white; }

/* --- Base Modal Overlay Style --- */
/* This applies to the container for *each* modal type */
.modal {
  position: fixed; /* Fixed overlay covering the viewport */
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7); /* Slightly darker overlay */
  display: flex; /* Use flex to center smaller modals (delete/export) */
  justify-content: center;
  align-items: center;
  z-index: 1100; /* Ensure nested modals are above parent */
  padding: 20px; /* Padding around the content */
  /* IMPORTANT: Overlay scrolls if content overflows viewport */
  overflow-y: auto;
}

/* --- Base Modal Content Style --- */
/* Applies basic structure, but SIZE/POSITIONING will be overridden for view/edit */
.modal-content {
  /* Inherits .card styles (background, border-radius, shadow) */
  background-color: var(--surface-color);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--box-shadow-hover);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Content scrolls inside modal-body */
  max-height: 90vh; /* Max height relative to viewport */
  width: 100%; /* Take available space within padding initially */
  margin: auto; /* Center within the flex overlay */
  position: relative; /* Default position for delete/export */
  /* Remove transform from base, apply only for specific types if needed */
}

/* --- >>> Positioning & Sizing Overrides for VIEW and EDIT Modals <<< --- */
/* We make the *content* fixed, allowing it to ignore the parent component's boundaries */
.modal-content.view-modal,
.modal-content.edit-modal {
  position: fixed; /* Position relative to the viewport */
  width: 90vw;     /* Occupy 90% of the viewport width */
  height: 90vh;    /* Occupy 90% of the viewport height */
  max-width: 1200px; /* Set a maximum pixel width (adjust as needed) */
  max-height: 90vh; /* Redundant but safe */
  margin: 0;       /* Override centering margin */
  transform: none;   /* No need for translate centering */
  /* Ensure it has card styles if not applied globally */
  background-color: var(--surface-color);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--box-shadow-hover);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Still needed for internal structure */
}

/* Optional: Slightly different max-width for edit */
.modal-content.edit-modal {
  max-width: 1300px;
}
/* --- End Positioning & Sizing Overrides --- */


/* Keep Delete/Export modals smaller and centered using flexbox */
.modal-content.delete-modal {
    max-width: 450px;
    /* position: relative; (default) */
    /* margin: auto; (default flex centering) */
}
.modal-content.export-modal {
    max-width: 500px;
    /* position: relative; (default) */
    /* margin: auto; (default flex centering) */
}

/* Modal Header, Body, Footer (Keep styles as before) */
.modal-header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid var(--border-color); padding: 15px 20px; flex-shrink: 0;
}
.modal-title { font-size: 1.3rem; font-weight: 600; margin: 0; }
.close-btn { color: var(--text-secondary); }
.close-btn:hover { color: var(--danger-color); }
.close-btn .svg-inline--fa { font-size: 1.2rem; }

.modal-body {
  padding: 20px;
  overflow-y: auto; /* THIS is where content scrolls */
  flex-grow: 1;
  /* Set a sensible min-height to prevent collapse when empty */
  min-height: 150px;
}
.modal-loading, .modal-error {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 150px; text-align: center; color: var(--text-secondary);
}
.modal-loading-icon-fa, .modal-error-icon-fa { font-size: 2rem; margin-bottom: 15px; color: var(--primary-color); }
.modal-error { color: var(--danger-color); }
.modal-error-icon-fa { color: var(--danger-color); }

.modal-footer {
    display: flex; justify-content: flex-end; gap: 12px;
    border-top: 1px solid var(--border-color); padding: 15px 20px; flex-shrink: 0;
}


/* --- View Modal Content Styles (Keep as before) --- */
.outline-view-section { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px dashed var(--border-color); }
.outline-view-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.section-heading { font-size: 1.1rem; font-weight: 500; color: var(--primary-color); margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px; }
.section-icon-fa { font-size: 1em; }
.section-content { padding-left: 24px; }
.view-text p, .view-text ul, .view-text pre { margin: 0 0 10px 0; line-height: 1.6; color: var(--text-primary); }
.view-text ul { padding-left: 20px; }
.view-text pre { background-color: var(--hover-overlay); padding: 10px; border-radius: var(--border-radius-sm); white-space: pre-wrap; word-break: break-all; font-family: monospace; font-size: 0.9rem; }
.outline-object-item { margin-bottom: 10px; }
.outline-object-item strong { color: var(--text-secondary); }
.character-view-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; }
.character-view-card { padding: 15px; background-color: var(--background-color); /* Uses card style */ }
.character-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color); }
.character-name { margin: 0; font-size: 1.1rem; font-weight: 600; }
.character-header div { display: flex; gap: 5px; }
.badge { font-size: 0.75rem; }
.character-property { margin-bottom: 12px; }
.property-label { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500; }
.property-value p { margin: 0; line-height: 1.5; }
.property-value pre { margin: 0; background-color: var(--hover-overlay); padding: 5px 8px; border-radius: var(--border-radius-sm); font-size: 0.85rem; white-space: pre-wrap; word-break: break-all;} /* Added wrap/break */

/* --- Edit Modal Content Styles (Keep as before) --- */
.form-group { margin-bottom: 20px; }
.form-label { display: block; margin-bottom: 8px; color: var(--text-secondary); font-weight: 500; display: flex; align-items: center; gap: 6px; }
.form-icon-fa { font-size: 1em; }
.required { color: var(--danger-color); margin-left: 4px; }
.json-editor { border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 15px; background-color: var(--background-color); }
.json-item { display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-start; }
.json-key-input { width: 150px; flex-shrink: 0; }
.json-value-input { flex-grow: 1; min-height: 60px; font-family: monospace; font-size: 0.9rem;}
.remove-json-btn { margin-top: 5px; }
.add-json-btn { margin-top: 10px; }
.characters-editor { border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 15px; background-color: var(--background-color); display: flex; flex-direction: column; gap: 20px; }
.character-edit-card { padding: 15px; border: 1px solid var(--border-color); border-radius: var(--border-radius-md); }
.character-edit-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed var(--border-color); }
.character-title-group { display: flex; align-items: center; gap: 10px; }
.character-edit-title { margin: 0; font-size: 1.1rem; font-weight: 600; }
.character-basic-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 15px; }
.character-field { margin-bottom: 0; }
.small-label { font-size: 0.85rem; margin-bottom: 4px; }
.character-properties-edit { margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border-color); }
.character-property-edit { margin-bottom: 15px; }
.property-edit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.remove-property-btn { padding: 2px 4px; }
.property-textarea { min-height: 50px; }
.add-property { display: flex; align-items: center; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--hover-overlay); }
.property-key-input { flex-grow: 1; }
.add-character-btn { margin-top: 20px; }
.add-character-btn .svg-inline--fa { margin-right: 6px;}

/* --- Delete Modal Styles (Keep as before) --- */
.delete-confirmation { text-align: center; padding: 20px 0; }
.warning-icon-fa { font-size: 2.5rem; color: var(--warning-color); margin-bottom: 15px; }
.delete-confirmation p { margin: 5px 0; font-size: 1.05rem; }
.delete-warning { font-weight: bold; color: var(--danger-color); }

/* --- Export Modal Styles (Keep as before) --- */
.export-options { padding: 10px 0; }
.export-options p { margin-bottom: 15px; font-size: 1rem; color: var(--text-secondary); }
.export-format-options { display: flex; justify-content: center; gap: 15px; flex-wrap: wrap; }
.export-format-btn { display: flex; flex-direction: column; align-items: center; padding: 15px 20px; min-width: 120px; gap: 8px; }
.export-format-icon-fa { font-size: 1.8rem; }
.export-format-btn .btn-text { font-size: 0.95rem; }

/* --- Responsive (Minor adjustment for fixed modal) --- */
@media (max-width: 768px) {
   .outline-item { padding: 10px; }
   .outline-actions { gap: 3px; opacity: 1; }
   .action-btn { padding: 3px 5px; }
   /* Fixed modals need adjustments for small screens */
   .modal-content.view-modal,
   .modal-content.edit-modal {
       width: 95vw; /* Use more viewport width */
       height: 95vh; /* Use more viewport height */
       transform: none; /* Override centering transform */
   }
   .modal-content.delete-modal,
   .modal-content.export-modal {
       max-width: 95vw; /* Ensure small modals fit */
   }
   .modal-body { padding: 15px; }
   .character-basic-info { grid-template-columns: 1fr; }
}
</style>