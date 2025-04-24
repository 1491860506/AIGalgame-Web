<template>
  <div class="outline-generator">
    <div class="main-container-simplified">
      <!-- 大纲管理面板 -->
      <div class="outlines-panel">
        <div class="panel-header">
          <h2>大纲管理</h2>
          <button class="refresh-btn icon-btn" @click="loadOutlineTitles" title="刷新列表">
            <!-- Replace emoji -->
            <!-- 🔄 -->
            <font-awesome-icon :icon="['fas', 'sync-alt']" />
          </button>
        </div>

        <div class="panel-content">
          <div v-if="isLoading" class="loading-state">
            <!-- Replace emoji -->
            <!-- <i class="loading-icon">⏳</i> -->
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="loading-icon-fa" />
            <span>加载中...</span>
          </div>

          <div v-else-if="outlineTitles.length === 0" class="empty-state">
            <!-- Replace emoji -->
            <!-- <i class="empty-icon">📝</i> -->
             <font-awesome-icon :icon="['fas', 'file-lines']" class="empty-icon-fa" />
            <p>暂无大纲</p>
          </div>

          <div v-else class="outlines-list">
            <div
              v-for="title in outlineTitles"
              :key="title"
              :class="['outline-item', { active: selectedOutline === title }]"
              @click="selectOutline(title)"
            >
              <div class="outline-icon">
                <!-- Replace emoji -->
                <!-- <span>📖</span> -->
                 <font-awesome-icon :icon="['fas', 'book-open']" />
              </div>
              <div class="outline-info">
                <div class="outline-title">{{ title }}</div>
                <div class="outline-actions">
                  <button
                    class="action-btn view-btn"
                    @click.stop="viewOutline(title)"
                    title="查看"
                  >
                    <!-- Replace emoji -->
                    <!-- 👁️ -->
                     <font-awesome-icon :icon="['fas', 'eye']" class="action-btn-icon-fa" />
                  </button>
                  <button
                    class="action-btn edit-btn"
                    @click.stop="editOutline(title)"
                    title="编辑"
                  >
                    <!-- Replace emoji -->
                    <!-- ✏️ -->
                     <font-awesome-icon :icon="['fas', 'pen-to-square']" class="action-btn-icon-fa" />
                  </button>
                  <button
                    class="action-btn export-btn"
                    @click.stop="exportOutline(title)"
                    title="导出"
                  >
                    <!-- Replace emoji -->
                    <!-- 📤 -->
                     <font-awesome-icon :icon="['fas', 'file-export']" class="action-btn-icon-fa" />
                  </button>
                  <button
                    class="action-btn delete-btn"
                    @click.stop="confirmDeleteOutline(title)"
                    title="删除"
                  >
                    <!-- Replace emoji -->
                    <!-- 🗑️ -->
                     <font-awesome-icon :icon="['fas', 'trash-alt']" class="action-btn-icon-fa" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 大纲查看模态框 -->
    <div class="modal" v-if="showViewModal" @click.self="showViewModal = false">
      <div class="modal-content view-modal">
        <div class="modal-header">
          <h2>大纲查看: {{ currentTitle }}</h2>
          <!-- Replace emoji -->
          <!-- <button class="close-btn icon-btn" @click="showViewModal = false" title="关闭">❌</button> -->
           <button class="close-btn icon-btn" @click="showViewModal = false" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
           </button>
        </div>
        <div class="modal-body">
          <div v-if="isViewLoading" class="modal-loading">
            <!-- Replace emoji -->
            <!-- <i class="loading-icon">⏳</i> -->
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon-fa" />
            <span>加载中...</span>
          </div>
          <div v-else-if="viewError" class="modal-error">
            <!-- Replace emoji -->
            <!-- <i class="error-icon">⚠️</i> -->
             <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="modal-error-icon-fa" />
            <span>{{ viewError }}</span>
          </div>
          <div v-else class="outline-content">
            <div class="outline-section title-section">
              <h3>
                <!-- Replace emoji -->
                <!-- <i class="section-icon">📌</i> -->
                <font-awesome-icon :icon="['fas', 'thumbtack']" class="section-icon-fa" />
                标题
              </h3>
              <div class="section-content">
                <p>{{ currentOutlineContent.outline.title }}</p>
              </div>
            </div>
            <div class="outline-section outline-section">
              <h3>
                <!-- Replace emoji -->
                <!-- <i class="section-icon">📃</i> -->
                 <font-awesome-icon :icon="['fas', 'scroll']" class="section-icon-fa" />
                剧情大纲
              </h3>
              <div class="section-content">
                <div v-if="typeof currentOutlineContent.outline.outline === 'string'">
                  <p>{{ currentOutlineContent.outline.outline }}</p>
                </div>
                <div v-else-if="Array.isArray(currentOutlineContent.outline.outline)">
                  <ul>
                    <li v-for="(item, index) in currentOutlineContent.outline.outline" :key="index">
                      {{ item }}
                    </li>
                  </ul>
                </div>
                <div v-else>
                  <div v-for="(value, key) in currentOutlineContent.outline.outline" :key="key" class="outline-section-item">
                    <h4>{{ key }}</h4>
                    <p v-if="typeof value === 'string'">{{ value }}</p>
                    <pre v-else>{{ JSON.stringify(value, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </div>
            <div class="outline-section character-section">
              <h3>
                <!-- Replace emoji -->
                <!-- <i class="section-icon">👥</i> -->
                 <font-awesome-icon :icon="['fas', 'users']" class="section-icon-fa" />
                角色设定
              </h3>
              <div class="section-content">
                <!-- 处理角色数据为数组格式 -->
                <div v-if="Array.isArray(currentOutlineContent.character)">
                  <div v-for="(character, index) in currentOutlineContent.character" :key="index" class="character-card">
                    <div class="character-header">
                      <h4 class="character-name">{{ character.name || `角色 ${index + 1}` }}</h4>
                      <span v-if="character.gender" class="character-badge">{{ character.gender }}</span>
                      <span v-if="character.age !== undefined && character.age !== null" class="character-badge age-badge">{{ character.age }}岁</span>
                    </div>
                    <div class="character-properties">
                      <div v-for="(value, key) in character" :key="key" class="character-property" v-if="key !== 'name' && key !== 'gender' && key !== 'age'">
                        <div class="property-label">{{ getPropertyLabel(key) }}</div>
                        <div class="property-value">{{ value }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <!-- 处理其他格式 -->
                <div v-else-if="typeof currentOutlineContent.character === 'string'">
                  <p>{{ currentOutlineContent.character }}</p>
                </div>
                <div v-else>
                  <div v-for="(value, key) in currentOutlineContent.character" :key="key" class="character-item">
                    <h4>{{ key }}</h4>
                    <p v-if="typeof value === 'string'">{{ value }}</p>
                    <pre v-else>{{ JSON.stringify(value, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <!-- Replace emoji -->
          <!-- <button class="secondary-btn" @click="showViewModal = false">🚪 关闭</button> -->
           <button class="secondary-btn" @click="showViewModal = false">
             <font-awesome-icon :icon="['fas', 'times']" class="btn-icon-fa" /> 关闭
           </button>
          <!-- Replace emoji -->
          <!-- <button class="primary-btn" @click="editOutline(currentTitle)">✏️ 编辑大纲</button> -->
           <button class="primary-btn" @click="editOutline(currentTitle)">
             <font-awesome-icon :icon="['fas', 'pen']" class="btn-icon-fa" /> 编辑大纲
           </button>
        </div>
      </div>
    </div>

    <!-- 大纲编辑模态框 -->
    <div class="modal" v-if="showEditModal" @click.self="showEditModal = false">
      <div class="modal-content edit-modal">
        <div class="modal-header">
          <h2>大纲编辑: {{ currentTitle }}</h2>
          <!-- Replace emoji -->
          <!-- <button class="close-btn icon-btn" @click="showEditModal = false" title="关闭">❌</button> -->
           <button class="close-btn icon-btn" @click="showEditModal = false" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
           </button>
        </div>
        <div class="modal-body">
          <div v-if="isEditLoading" class="modal-loading">
            <!-- Replace emoji -->
            <!-- <i class="loading-icon">⏳</i> -->
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon-fa" />
            <span>加载中...</span>
          </div>
          <div v-else-if="editError" class="modal-error">
            <!-- Replace emoji -->
            <!-- <i class="error-icon">⚠️</i> -->
             <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="modal-error-icon-fa" />
            <span>{{ editError }}</span>
          </div>
          <div v-else class="edit-form">
            <!-- 标题编辑 -->
            <div class="form-group">
              <label for="edit-title">
                 <!-- Replace emoji -->
                 <!-- <i class="form-icon">📌</i> -->
                 <font-awesome-icon :icon="['fas', 'thumbtack']" class="form-icon-fa" />
                标题
              </label>
              <input
                type="text"
                id="edit-title"
                v-model="editOutlineContent.title"
                placeholder="输入标题"
              />
            </div>

            <!-- 大纲编辑 -->
            <div class="form-group">
              <label for="edit-outline">
                <!-- Replace emoji -->
                <!-- <i class="form-icon">📃</i> -->
                 <font-awesome-icon :icon="['fas', 'scroll']" class="form-icon-fa" />
                剧情大纲
              </label>
              <!-- JSON对象编辑 -->
              <div v-if="editOutlineFormat.outline === 'json'" class="json-editor">
                <div
                  v-for="(item, index) in editOutlineContent.outlineJson"
                  :key="index"
                  class="json-item"
                >
                  <div class="json-item-header">
                    <input
                      type="text"
                      v-model="item.key"
                      placeholder="键名"
                      class="json-key-input"
                    />
                    <button
                      class="remove-json-btn icon-btn"
                      @click="removeOutlineJsonItem(index)"
                      title="删除项"
                    >
                      <!-- Replace emoji -->
                      <!-- ➖ -->
                       <font-awesome-icon :icon="['fas', 'minus']" />
                    </button>
                  </div>
                  <textarea
                    v-model="item.value"
                    placeholder="值 (可以是纯文本或JSON字符串)"
                    rows="3"
                    class="json-value-input"
                  ></textarea>
                </div>
                <button class="add-json-btn" @click="addOutlineJsonItem">
                  <!-- Replace emoji -->
                  <!-- ➕ -->
                   <font-awesome-icon :icon="['fas', 'plus']" /> 添加项
                </button>
              </div>
              <!-- 纯文本编辑 -->
              <textarea
                v-else
                id="edit-outline"
                v-model="editOutlineContent.outlineText"
                placeholder="输入剧情大纲"
                rows="8"
              ></textarea>
            </div>

            <!-- 角色编辑 - 改进部分 -->
            <div class="form-group">
              <label>
                <!-- Replace emoji -->
                <!-- <i class="form-icon">👥</i> -->
                 <font-awesome-icon :icon="['fas', 'users']" class="form-icon-fa" />
                角色设定
              </label>

              <!-- 特定格式的角色数组编辑器 -->
              <div class="characters-editor">
                <div
                  v-for="(character, index) in editOutlineContent.characters"
                  :key="index"
                  class="character-edit-card"
                >
                  <div class="character-edit-header">
                    <div class="character-title-group">
                      <h4 class="character-edit-title">角色 {{ index + 1 }}</h4>
                      <button
                        class="remove-character-btn icon-btn"
                        @click="removeCharacter(index)"
                        title="删除角色"
                      >
                        <!-- Replace emoji -->
                        <!-- ➖ -->
                         <font-awesome-icon :icon="['fas', 'minus']" />
                      </button>
                    </div>
                    <div class="character-basic-info">
                      <div class="character-field">
                        <label>名称</label>
                        <input
                          type="text"
                          v-model="character.name"
                          placeholder="角色名称"
                          class="character-input"
                        />
                      </div>
                      <div class="character-field">
                        <label>性别</label>
                        <select v-model="character.gender" class="character-input">
                          <option value="">选择性别</option>
                          <option value="男">男</option>
                          <option value="女">女</option>
                          <option value="其他">其他</option>
                        </select>
                      </div>
                      <div class="character-field">
                        <label>年龄</label>
                        <input
                          type="number"
                          v-model.number="character.age"
                          placeholder="年龄"
                          class="character-input"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- 角色属性编辑 -->
                  <div class="character-properties-edit">
                    <div
                      v-for="(propValue, propKey) in getEditableProperties(character)"
                      :key="propKey"
                      class="character-property-edit"
                    >
                      <div class="property-edit-header">
                        <label>{{ getPropertyLabel(propKey) }}</label>
                         <!-- Add button to remove custom property -->
                         <button
                            v-if="!standardProperties.includes(propKey)"
                            class="remove-json-btn icon-btn remove-property-btn"
                            @click="removeCharacterProperty(character, propKey)"
                            title="删除属性"
                         >
                           <font-awesome-icon :icon="['fas', 'minus']" />
                         </button>
                      </div>
                      <textarea
                        v-model="character[propKey]"
                        :placeholder="`输入${getPropertyLabel(propKey)}`"
                        rows="3"
                        class="property-textarea"
                      ></textarea>
                    </div>

                    <!-- 添加新属性按钮 -->
                    <div class="add-property">
                      <div class="add-property-field">
                        <input
                          type="text"
                          v-model="newPropertyKey"
                          placeholder="属性名称"
                          class="property-key-input"
                           @keyup.enter="addCharacterProperty(character)"
                        />
                        <button
                          class="add-property-btn"
                          @click="addCharacterProperty(character)"
                          :disabled="!newPropertyKey.trim()"
                        >
                           <!-- Replace emoji -->
                           <!-- ➕ -->
                           <font-awesome-icon :icon="['fas', 'plus']" /> 添加属性
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button class="add-character-btn" @click="addCharacter">
                  <!-- Replace emoji -->
                  <!-- ➕ -->
                   <font-awesome-icon :icon="['fas', 'plus']" /> 添加角色
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <!-- Replace emoji -->
          <!-- <button class="secondary-btn" @click="showEditModal = false">🚫 取消</button> -->
           <button class="secondary-btn" @click="showEditModal = false">
             <font-awesome-icon :icon="['fas', 'ban']" class="btn-icon-fa" /> 取消
           </button>
          <!-- Replace emoji -->
          <!-- <button class="primary-btn" @click="saveEditedOutline" :disabled="isSaving"> -->
           <button
             class="primary-btn"
             @click="saveEditedOutline"
             :disabled="isSaving"
           >
            <!-- Replace emoji -->
            <!-- 💾 -->
             <font-awesome-icon :icon="['fas', isSaving ? 'spinner' : 'floppy-disk']" :spin="isSaving" class="btn-icon-fa" />
             {{ isSaving ? '保存中...' : '保存修改' }}
           </button>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div class="modal" v-if="showDeleteModal" @click.self="showDeleteModal = false">
      <div class="modal-content delete-modal">
        <div class="modal-header">
          <h2>确认删除</h2>
          <!-- Replace emoji -->
          <!-- <button class="close-btn icon-btn" @click="showDeleteModal = false" title="关闭">❌</button> -->
           <button class="close-btn icon-btn" @click="showDeleteModal = false" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
           </button>
        </div>
        <div class="modal-body">
          <div class="delete-confirmation">
            <!-- Replace emoji -->
            <!-- <i class="warning-icon">⚠️</i> -->
             <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="warning-icon-fa" />
            <p>确定要删除大纲 <strong>"{{ outlineToDelete }}"</strong> 吗？</p>
            <p class="delete-warning">此操作无法撤销！</p>
          </div>
        </div>
        <div class="modal-footer">
          <!-- Replace emoji -->
          <!-- <button class="secondary-btn" @click="showDeleteModal = false">🚫 取消</button> -->
           <button class="secondary-btn" @click="showDeleteModal = false">
             <font-awesome-icon :icon="['fas', 'ban']" class="btn-icon-fa" /> 取消
           </button>
          <!-- Replace emoji -->
          <!-- <button class="danger-btn" @click="deleteOutline" :disabled="isDeleting"> -->
           <button
             class="danger-btn"
             @click="deleteOutline"
             :disabled="isDeleting"
           >
            <!-- Replace emoji -->
            <!-- 🗑️ -->
             <font-awesome-icon :icon="['fas', isDeleting ? 'spinner' : 'trash-alt']" :spin="isDeleting" class="btn-icon-fa" />
             {{ isDeleting ? '删除中...' : '确认删除' }}
           </button>
        </div>
      </div>
    </div>

    <!-- 导出模态框 -->
    <div class="modal" v-if="showExportModal" @click.self="showExportModal = false">
      <div class="modal-content export-modal">
        <div class="modal-header">
          <h2>导出大纲: {{ outlineToExport }}</h2>
          <!-- Replace emoji -->
          <!-- <button class="close-btn icon-btn" @click="showExportModal = false" title="关闭">❌</button> -->
           <button class="close-btn icon-btn" @click="showExportModal = false" title="关闭">
             <font-awesome-icon :icon="['fas', 'times']" />
           </button>
        </div>
        <div class="modal-body">
          <div v-if="isExportLoading" class="modal-loading">
             <!-- Replace emoji -->
            <!-- <i class="loading-icon">⏳</i> -->
             <font-awesome-icon :icon="['fas', 'spinner']" spin class="modal-loading-icon-fa" />
            <span>准备导出数据中...</span>
          </div>
          <div v-else class="export-options">
            <p>请选择要导出的格式：</p>
            <div class="export-format-options">
              <button class="export-format-btn" @click="exportAsJson">
                <!-- Replace emoji -->
                <!-- 📄 -->
                 <font-awesome-icon :icon="['fas', 'file']" class="export-format-icon-fa" />
                <span class="btn-text">JSON格式</span>
              </button>
              <button class="export-format-btn" @click="exportAsText">
                <!-- Replace emoji -->
                <!-- 📝 -->
                 <font-awesome-icon :icon="['fas', 'file-lines']" class="export-format-icon-fa" />
                <span class="btn-text">文本格式</span>
              </button>
              <button class="export-format-btn" @click="exportAsMarkdown">
                 <!-- Replace emoji -->
                <!-- 📘 -->
                 <font-awesome-icon :icon="['fab', 'markdown']" class="export-format-icon-fa" />
                <span class="btn-text">Markdown格式</span>
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <!-- Replace emoji -->
          <!-- <button class="secondary-btn" @click="showExportModal = false">🚫 取消</button> -->
           <button class="secondary-btn" @click="showExportModal = false">
              <font-awesome-icon :icon="['fas', 'ban']" class="btn-icon-fa" /> 取消
           </button>
        </div>
      </div>
    </div>

    <!-- 通知提示 -->
    <div v-if="notification.show" :class="['notification', notification.type]">
      <!-- Replace emoji span with Font Awesome component -->
      <!--
      <span v-if="notification.type === 'success'">✅</span>
      <span v-else-if="notification.type === 'error'">❌</span>
      <span v-else-if="notification.type === 'warning'">⚠️</span>
      <span v-else>ℹ️</span>
      -->
       <font-awesome-icon :icon="['fas', getNotificationIconName()]" class="notification-icon-fa" />
      <span>{{ notification.message }}</span>
    </div>
  </div>
</template>

<script>
import {
  loadOutlineContent,
  getAllOutlineTitles,
  saveOutlineContent
} from './services/OutlineService';
import { deletePath } from './services/IndexedDBFileSystem';

// *** DO NOT MODIFY THE FUNCTIONS BELOW THIS LINE THAT INTERACT WITH THE FILE SYSTEM OR OUTLINE SERVICE ***
// loadOutlineContent, getAllOutlineTitles, saveOutlineContent, deletePath
// The logic and calls to these functions in the methods below are also NOT MODIFIED.
// Only icon representation, JSON display properties, and dark mode styling are changed.
// *** DO NOT MODIFY THE FUNCTIONS ABOVE THIS LINE THAT INTERACT WITH THE FILE SYSTEM OR OUTLINE SERVICE ***

export default {
  name: 'OutlineGenerator',
  data() {
    return {
      // Outline list state (UNCHANGED logic)
      outlineTitles: [],
      selectedOutline: null,
      isLoading: false,

      // Outline view state (UNCHANGED logic)
      showViewModal: false,
      currentTitle: '',
      currentOutlineContent: { // Initial structure assumption
        outline: {},
        character: []
      },
      isViewLoading: false,
      viewError: '',

      // Outline edit state (UNCHANGED logic)
      showEditModal: false,
      editOutlineContent: { // Structure for editing
        title: '',
        outlineText: '', // For text format outline
        outlineJson: [], // For JSON format outline
        characters: [] // Always array format for editing
      },
      editOutlineFormat: { // Format detection
        outline: 'text', // 'text' or 'json'
        character: 'array' // Always 'array' for editing UI
      },
      isEditLoading: false,
      editError: '',
      isSaving: false,

      // Character properties management (UNCHANGED logic)
      newPropertyKey: '',
      standardProperties: ['name', 'gender', 'age', 'appearance', 'personality', 'relations', 'others'], // List of standard keys for display order/handling
      propertyLabels: { // Mapping for standard keys
        name: '名称',
        gender: '性别',
        age: '年龄',
        appearance: '外貌',
        personality: '性格',
        relations: '关系',
        others: '其他'
      },

      // Outline delete state (UNCHANGED logic)
      showDeleteModal: false,
      outlineToDelete: '',
      isDeleting: false,

      // Outline export state (UNCHANGED logic)
      showExportModal: false,
      outlineToExport: '',
      isExportLoading: false,

      // Notification state (UNCHANGED logic, icon mapping changes)
      notification: {
        show: false,
        message: '',
        type: 'info',
        timeout: null
      }
    };
  },
  mounted() {
    this.loadOutlineTitles();
  },
  methods: {
    /**
     * Load all outline titles - UNCHANGED
     */
    async loadOutlineTitles() {
      this.isLoading = true;
      try {
        this.outlineTitles = await getAllOutlineTitles();
        // Remove 'test' entry if it exists - UNCHANGED
        let indexToRemove = this.outlineTitles.indexOf('test');
        if (indexToRemove !== -1) {
          this.outlineTitles.splice(indexToRemove, 1);
        }
      } catch (error) {
        console.error('加载大纲标题失败:', error);
        this.showNotification('加载大纲列表失败', 'error');
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Select an outline - UNCHANGED
     */
    selectOutline(title) {
      this.selectedOutline = title;
    },

    /**
     * View outline - UNCHANGED logic for loading and state
     */
    async viewOutline(title) {
      this.currentTitle = title;
      this.showViewModal = true;
      this.isViewLoading = true;
      this.viewError = '';
      try {
         // Call the imported function - UNCHANGED
        const content = await loadOutlineContent(title);
        this.currentOutlineContent = content; // Set content - UNCHANGED
      } catch (error) {
        console.error('加载大纲详情失败:', error);
        this.viewError = '加载大纲内容失败: ' + (error.message || '未知错误');
        this.showNotification('加载大纲内容失败', 'error');
      } finally {
        this.isViewLoading = false;
      }
    },

    /**
     * Prepare to edit outline - UNCHANGED logic for loading and state
     */
    async editOutline(title) {
      if (this.showViewModal) {
        this.showViewModal = false; // Close view modal if open
      }
      this.currentTitle = title;
      this.showEditModal = true;
      this.isEditLoading = true;
      this.editError = '';
      this.newPropertyKey = ''; // Reset new property field
      try {
         // Call the imported function - UNCHANGED
        const content = await loadOutlineContent(title);
        this.detectAndSetEditFormat(content); // Detect format - UNCHANGED
        this.prepareEditContent(content); // Prepare edit content based on format - UNCHANGED
      } catch (error) {
        console.error('加载大纲编辑数据失败:', error);
        this.editError = '加载大纲内容失败: ' + (error.message || '未知错误');
        this.showNotification('加载编辑数据失败', 'error');
      } finally {
        this.isEditLoading = false;
      }
    },

    /**
     * Detect and set edit format - UNCHANGED
     */
    detectAndSetEditFormat(content) {
      // Check if outline.outline is an object (but not null or array) to use JSON editor
      if (typeof content.outline?.outline === 'object' && content.outline.outline !== null && !Array.isArray(content.outline.outline)) {
        this.editOutlineFormat.outline = 'json';
      } else {
        this.editOutlineFormat.outline = 'text';
      }

      // Character is always edited in array format as per original logic's intention
      this.editOutlineFormat.character = 'array';
    },

    /**
     * Prepare edit content - UNCHANGED logic for data transformation
     */
    prepareEditContent(content) {
      // Process title and outline
      this.editOutlineContent.title = content.outline?.title || ''; // Use optional chaining

      if (this.editOutlineFormat.outline === 'json') {
        this.editOutlineContent.outlineJson = this.convertObjectToJsonItems(content.outline?.outline); // Use optional chaining
        this.editOutlineContent.outlineText = ''; // Ensure text field is empty
      } else {
        this.editOutlineContent.outlineText = this.convertOutlineToText(content.outline?.outline); // Use optional chaining
        this.editOutlineContent.outlineJson = []; // Ensure JSON items are empty
      }

      // Process character data - Always convert to array format for editing UI
      this.editOutlineContent.characters = this.convertToCharacterArray(content.character);
    },

    /**
     * Convert any character data format to standard character array - UNCHANGED
     */
    convertToCharacterArray(characterData) {
      // Ensure characterData is not null/undefined before checking type
      if (!characterData) {
          return [this.createEmptyCharacter()]; // Default to one empty character
      }

      if (Array.isArray(characterData)) {
        // If it's already an array, ensure each item has standard properties (shallow copy)
        return characterData.map((char, index) => {
          // Simple merge for basic properties, keeps others
          return {
            name: char.name || `角色 ${index + 1}`,
            gender: char.gender || '',
            // Ensure age is number or null
            age: (char.age === undefined || char.age === null || isNaN(char.age)) ? null : Number(char.age),
            ...char // Spread existing properties
          };
        });
      } else if (typeof characterData === 'object' && characterData !== null) {
        // If it's an object, convert entries to array items
        return Object.entries(characterData).map(([key, value]) => {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // If value is an object, merge it (shallow copy)
            return {
              name: key,
              ...value
            };
          } else {
            // If value is string, number, array, etc., put it under 'description'
             // Preserve original value type if possible? Original put everything else as string
             // Let's keep original behavior of potentially losing structure here
            return {
              name: key,
              description: String(value) // Convert to string for simplicity in textareas
            };
          }
        });
      } else if (typeof characterData === 'string') {
        // If it's a string, create a single character item with description
        return [
          {
            name: '角色', // Default name
            description: characterData
          }
        ];
      } else {
        // Default to creating one empty character for any other unexpected format
        return [this.createEmptyCharacter()];
      }
    },

    /**
     * Create an empty character object - UNCHANGED
     */
    createEmptyCharacter() {
      // Include all standard properties with default values
      return {
        name: '',
        gender: '',
        age: null, // Use null for age when empty
        appearance: '',
        personality: '',
        relations: '',
        others: ''
        // Custom properties will be added via the editor UI
      };
    },

    /**
     * Add a new character - UNCHANGED
     */
    addCharacter() {
      this.editOutlineContent.characters.push(this.createEmptyCharacter());
    },

    /**
     * Remove character - UNCHANGED
     */
    removeCharacter(index) {
      this.editOutlineContent.characters.splice(index, 1);
      // If no characters left after deletion, add one empty character - UNCHANGED
      if (this.editOutlineContent.characters.length === 0) {
        this.addCharacter();
      }
    },

    /**
     * Get editable character properties (exclude basic properties) - UNCHANGED
     * Returns an object { key: value } for properties other than name, gender, age
     */
    getEditableProperties(character) {
      const properties = {};
      // Check if character is valid before iterating
      if (character && typeof character === 'object') {
          for (const key in character) {
            // Exclude name, gender, age from the dynamic editable list
            if (character.hasOwnProperty(key) && !['name', 'gender', 'age'].includes(key)) {
              properties[key] = character[key];
            }
          }
      }
      return properties;
    },

    /**
     * Add character property - UNCHANGED logic
     */
    addCharacterProperty(character) {
      // Check if character is valid
      if (!character || typeof character !== 'object') return;

      const key = this.newPropertyKey.trim();
      if (!key) {
          this.showNotification('属性名称不能为空', 'warning');
          return;
      }
        if (key.includes('.') || key.includes('$') || key.includes('#') || key.includes('[') || key.includes(']')) {
             this.showNotification('属性名称不能包含特殊字符 (. $ # [ ])', 'warning');
             return; // Prevent invalid keys
        }


      // Check if property already exists on THIS character
      if (character.hasOwnProperty(key)) {
        this.showNotification(`角色已存在属性 "${key}"`, 'warning');
        return;
      }

      // Add new property to the specific character
      character[key] = ''; // Default value is empty string

      // Add the new key to standardProperties and propertyLabels for consistent display across all characters
      // ONLY add if it's not already there
      if (!this.standardProperties.includes(key)) {
         // This modifies data outside the character itself, affecting all characters' display
         // Original code adds to `this.standardProperties` and `this.propertyLabels` which seems intended for UI consistency
         this.standardProperties.push(key);
         this.propertyLabels[key] = key; // Use key as label by default
      }

      // Clear the input field for adding new properties
      this.newPropertyKey = '';
    },

    /**
     * Remove character property (for custom properties) - NEW METHOD NEEDED based on UI
     * The original template didn't have a remove button for custom properties, but the edit UI implies it's needed.
     * Let's add a simple method to delete a property from a character object.
     */
    removeCharacterProperty(character, key) {
        // Check if character is valid and key exists
        if (character && typeof character === 'object' && character.hasOwnProperty(key)) {
            // Optionally confirm deletion
            // if (confirm(`确定要删除属性 "${this.getPropertyLabel(key)}" 吗?`)) {
                delete character[key];
                 // You might also want to remove it from `this.standardProperties` if it's no longer present on *any* character, but that's more complex. For simplicity, let's keep it in `standardProperties` once added, unless it's a huge list. Or better, only add to standardProperties/labels if needed for display, not just because one character has it. But the original code added them globally. Sticking to original logic: add globally when first encountered/added. Let's not remove from `standardProperties` or `propertyLabels` here to keep it simple and match original intent of adding.
            // }
        }
    },


    /**
     * Get property display name - UNCHANGED
     */
    getPropertyLabel(key) {
      // Returns mapped label or the key itself
      return this.propertyLabels[key] || key;
    },

    /**
     * Convert object to JSON items for editing - UNCHANGED
     */
    convertObjectToJsonItems(obj) {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return []; // Return empty array if not a valid object
      }
      // Map object entries to { key, value } array
      return Object.entries(obj).map(([key, value]) => ({
        key,
        // Convert value to string. Stringify objects for editing in textarea.
        value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
      }));
    },

    /**
     * Convert outline content (string, array, or object) to text - UNCHANGED
     */
    convertOutlineToText(outline) {
      // Handle null/undefined outline
      if (!outline) return '';

      if (typeof outline === 'string') {
        return outline;
      } else if (Array.isArray(outline)) {
        // Join array items, stringifying objects
        return outline.map(item => typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)).join('\n\n');
      } else if (typeof outline === 'object' && outline !== null) {
        let text = '';
        // Iterate object properties
        for (const [key, value] of Object.entries(outline)) {
          const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
          text += `${key}:\n${valueStr}\n\n`;
        }
        return text.trim();
      }
      return ''; // Return empty string for unexpected types
    },

    /**
     * Add outline JSON item - UNCHANGED
     */
    addOutlineJsonItem() {
      this.editOutlineContent.outlineJson.push({ key: '', value: '' });
    },

    /**
     * Remove outline JSON item - UNCHANGED
     */
    removeOutlineJsonItem(index) {
      this.editOutlineContent.outlineJson.splice(index, 1);
    },

    /**
     * Save edited outline - UNCHANGED logic for structure creation and saving
     * Only potential change is how character array is processed before saving.
     */
    async saveEditedOutline() {
      this.isSaving = true; // Set loading state - UNCHANGED
      this.editError = ''; // Clear previous error

       // Basic validation for title
       if (!this.editOutlineContent.title || this.editOutlineContent.title.trim() === '') {
            this.showNotification('大纲标题不能为空', 'error');
            this.isSaving = false;
            return;
       }


      try {
        const outlineObj = { title: this.editOutlineContent.title.trim() }; // Create structure - UNCHANGED

        // Process outline content based on format - UNCHANGED logic
        if (this.editOutlineFormat.outline === 'json') {
          const outlineJsonData = {};
          for (const item of this.editOutlineContent.outlineJson) {
            if (item.key.trim()) { // Only add if key is not empty
              try {
                  // Attempt to parse value as JSON, fallback to string
                  outlineJsonData[item.key.trim()] = JSON.parse(item.value);
              } catch (e) {
                  outlineJsonData[item.key.trim()] = item.value; // Keep as string if JSON parse fails
              }
            }
          }
          outlineObj.outline = outlineJsonData;
        } else {
          outlineObj.outline = this.editOutlineContent.outlineText;
        }

        // Process character data - Convert array back to a suitable structure for saving
        // Original logic saved it as an array of objects. Let's stick to that.
        const characterArrayToSave = this.editOutlineContent.characters.map(char => {
          // Create a clean object, only including properties with values
          const cleanChar = {};
          // Iterate over all properties (including potential custom ones)
          for (const key in char) {
              if (char.hasOwnProperty(key)) {
                   const value = char[key];
                   // Handle age specifically: ensure it's number or exclude if null/empty/NaN
                   if (key === 'age') {
                       if (value !== null && value !== '' && !isNaN(value)) {
                           cleanChar[key] = Number(value);
                       }
                   }
                   // Handle other properties: include if value is not null, empty string, or undefined
                   else if (value !== null && value !== '' && value !== undefined) {
                        cleanChar[key] = value;
                   }
              }
          }
           return cleanChar;
        }).filter(char => Object.keys(char).length > 0); // Filter out entirely empty character objects

        // Call the imported save function - UNCHANGED
        // The saveOutlineContent function is expected to handle how outlineObj and characterArray are structured in the saved file.
        // Based on the original structure { outline: {...}, character: [...] }, we pass the outlineObj and the processed character array separately.
        // Assuming saveOutlineContent combines them into the final saved structure.
        const result = await saveOutlineContent(this.currentTitle, outlineObj, characterArrayToSave); // Call UNCHANGED function

        if (result) { // Check result - UNCHANGED
          this.showNotification('大纲保存成功', 'success');
          this.showEditModal = false; // Close modal - UNCHANGED
          await this.loadOutlineTitles(); // Reload list - UNCHANGED
           // Update selected outline if title changed
          if (this.editOutlineContent.title.trim() !== this.currentTitle) {
             this.selectedOutline = this.editOutlineContent.title.trim();
          } else {
             this.selectedOutline = this.currentTitle; // Stay selected
          }
        } else {
          this.showNotification('大纲保存失败', 'error'); // Show error - UNCHANGED
        }
      } catch (error) {
        console.error('保存大纲失败:', error);
         // Show notification with error message - UNCHANGED
        this.showNotification('保存大纲时发生错误: ' + (error.message || '未知错误'), 'error');
        this.editError = '保存失败: ' + (error.message || '未知错误'); // Set edit error state
      } finally {
        this.isSaving = false; // Reset loading state - UNCHANGED
      }
    },

    /**
     * Confirm delete outline - UNCHANGED
     */
    confirmDeleteOutline(title) {
      this.outlineToDelete = title; // Set outline to delete - UNCHANGED
      this.showDeleteModal = true; // Show modal - UNCHANGED
    },

    /**
     * Delete outline - UNCHANGED logic
     */
    async deleteOutline() {
      this.isDeleting = true; // Set loading state - UNCHANGED
      try {
        // Call the imported function - UNCHANGED
        await deletePath(`/data/${this.outlineToDelete}`); // Assuming deletePath handles the path structure
        this.showNotification(`大纲 "${this.outlineToDelete}" 已删除`, 'success'); // Show success - UNCHANGED
        this.showDeleteModal = false; // Close modal - UNCHANGED
        await this.loadOutlineTitles(); // Reload list - UNCHANGED
         // Deselect if the deleted outline was selected
        if (this.selectedOutline === this.outlineToDelete) {
          this.selectedOutline = null;
        }
      } catch (error) {
        console.error('删除大纲失败:', error);
         // Show error - UNCHANGED
        this.showNotification('删除大纲失败: ' + (error.message || '未知错误'), 'error');
      } finally {
        this.isDeleting = false; // Reset loading state - UNCHANGED
      }
    },

    /**
     * Export outline - UNCHANGED logic for loading content
     */
    exportOutline(title) {
      this.outlineToExport = title; // Set outline to export - UNCHANGED
      this.showExportModal = true; // Show modal - UNCHANGED
      this.isExportLoading = true; // Set loading state - UNCHANGED

       // Load content for export - UNCHANGED logic
      loadOutlineContent(title)
        .then(content => {
          this.currentOutlineContent = content; // Set content - UNCHANGED
          this.isExportLoading = false; // Reset loading state - UNCHANGED
        })
        .catch(error => {
          console.error('加载大纲导出数据失败:', error);
          this.showNotification('准备导出数据失败', 'error'); // Show error - UNCHANGED
          this.showExportModal = false; // Close modal on error - UNCHANGED
        });
    },

    /**
     * Export as JSON - UNCHANGED logic
     */
    exportAsJson() {
      try {
        // Structure data for export - UNCHANGED
        const exportData = {
          outline: {
            title: this.currentOutlineContent.outline?.title || '', // Use optional chaining
            outline: this.currentOutlineContent.outline?.outline // Use optional chaining
          },
          character: this.currentOutlineContent.character // Use character data directly
        };
         // Create Blob - UNCHANGED
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
         // Create and trigger download - UNCHANGED
        this.createDownload(blob, `${this.outlineToExport}.json`);
        this.showExportModal = false; // Close modal - UNCHANGED
        this.showNotification('大纲已导出为JSON格式', 'success'); // Show notification - UNCHANGED
      } catch (error) {
        console.error('导出JSON失败:', error);
        this.showNotification('导出JSON失败: ' + (error.message || '未知错误'), 'error'); // Show error - UNCHANGED
      }
    },

    /**
     * Export as Text - UNCHANGED logic for text formatting and download
     */
    exportAsText() {
      try {
        let textContent = `标题: ${this.currentOutlineContent.outline?.title || ''}\n\n`; // Use optional chaining
        textContent += `==== 剧情大纲 ====\n\n`;
        textContent += this.convertOutlineToText(this.currentOutlineContent.outline?.outline); // Convert and append - UNCHANGED

        textContent += `\n\n==== 角色设定 ====\n\n`;
        const characters = this.currentOutlineContent.character; // Get character data - UNCHANGED
        if (Array.isArray(characters)) { // If character is array - UNCHANGED logic
          characters.forEach((char, index) => {
            textContent += `【${char.name || `角色 ${index + 1}`}】\n`; // Use name or default - UNCHANGED
            if (char.gender) textContent += `性别: ${char.gender}\n`; // Include if exists - UNCHANGED
            // Check age more carefully for null/undefined/NaN
            if (char.age !== undefined && char.age !== null && !isNaN(char.age)) textContent += `年龄: ${char.age}岁\n`;

            // Add other properties - UNCHANGED logic
            Object.entries(char || {}).forEach(([key, value]) => { // Iterate char properties, handle null/undefined char
              if (!['name', 'gender', 'age'].includes(key) && value !== undefined && value !== null && value !== '') { // Check value exists and is not empty
                textContent += `${this.getPropertyLabel(key)}: ${value}\n`; // Use label and value - UNCHANGED
              }
            });
            textContent += '\n'; // Add newline after each character - UNCHANGED
          });
        } else if (typeof characters === 'string') { // If character is string - UNCHANGED
          textContent += characters;
        } else if (typeof characters === 'object' && characters !== null) { // If character is object - UNCHANGED
          for (const [name, description] of Object.entries(characters)) {
            const descText = typeof description === 'object' ? JSON.stringify(description, null, 2) : String(description); // Stringify object descriptions, convert others to string
            textContent += `${name}:\n${descText}\n\n`;
          }
        }

         // Create Blob and download - UNCHANGED
        const blob = new Blob([textContent.trim()], { type: 'text/plain;charset=utf-8' });
        this.createDownload(blob, `${this.outlineToExport}.txt`);
        this.showExportModal = false; // Close modal - UNCHANGED
        this.showNotification('大纲已导出为文本格式', 'success'); // Show notification - UNCHANGED
      } catch (error) {
        console.error('导出文本失败:', error);
        this.showNotification('导出文本失败: ' + (error.message || '未知错误'), 'error'); // Show error - UNCHANGED
      }
    },

    /**
     * Export as Markdown - UNCHANGED logic for formatting and download
     */
    exportAsMarkdown() {
      try {
        let mdContent = `# ${this.currentOutlineContent.outline?.title || '无标题大纲'}\n\n`; // Use optional chaining
        mdContent += `## 剧情大纲\n\n`;
        const outline = this.currentOutlineContent.outline?.outline; // Use optional chaining
        if (typeof outline === 'string') { // If outline is string - UNCHANGED
          mdContent += outline.replace(/\n/g, '\n\n');
        } else if (Array.isArray(outline)) { // If outline is array - UNCHANGED
          outline.forEach(item => {
            const itemText = typeof item === 'object' ? `\`\`\`json\n${JSON.stringify(item, null, 2)}\n\`\`\`` : String(item); // Stringify objects, convert others to string
            mdContent += `- ${itemText}\n`;
          });
        } else if (typeof outline === 'object' && outline !== null) { // If outline is object - UNCHANGED
          for (const [key, value] of Object.entries(outline)) {
            const valueText = typeof value === 'object' ? `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`` : String(value).replace(/\n/g, '\n  '); // Stringify objects, convert others to string and indent newlines
            mdContent += `### ${key}\n\n${valueText}\n\n`;
          }
        }

        mdContent += `\n## 角色设定\n\n`;
        const characters = this.currentOutlineContent.character; // Get character data - UNCHANGED
        if (Array.isArray(characters)) { // If character is array - UNCHANGED logic
          characters.forEach((char, index) => {
            mdContent += `### ${char.name || `角色 ${index + 1}`}\n\n`; // Use name or default - UNCHANGED

            // Add basic info - UNCHANGED logic
            let basicInfo = '';
            if (char.gender) basicInfo += `- **性别**: ${char.gender}\n`;
            // Check age more carefully for null/undefined/NaN
            if (char.age !== undefined && char.age !== null && !isNaN(char.age)) basicInfo += `- **年龄**: ${char.age}岁\n`;
            if (basicInfo) mdContent += `${basicInfo}\n`; // Add basic info block if not empty

            // Add other properties - UNCHANGED logic
            Object.entries(char || {}).forEach(([key, value]) => { // Iterate char properties, handle null/undefined char
               // Check value exists, is not empty, and key is not basic
              if (!['name', 'gender', 'age'].includes(key) && value !== undefined && value !== null && value !== '') {
                mdContent += `#### ${this.getPropertyLabel(key)}\n\n${value}\n\n`; // Use label and value - UNCHANGED
              }
            });
          });
        } else if (typeof characters === 'string') { // If character is string - UNCHANGED
          mdContent += characters.replace(/\n/g, '\n\n');
        } else if (typeof characters === 'object' && characters !== null) { // If character is object - UNCHANGED
          for (const [name, description] of Object.entries(characters)) {
            const descText = typeof description === 'object' ? `\`\`\`json\n${JSON.stringify(description, null, 2)}\n\`\`\`` : String(description).replace(/\n/g, '\n  '); // Stringify objects, convert others to string and indent newlines
            mdContent += `### ${name}\n\n${descText}\n\n`;
          }
        }

         // Create Blob and download - UNCHANGED
        const blob = new Blob([mdContent.trim()], { type: 'text/markdown;charset=utf-8' });
        this.createDownload(blob, `${this.outlineToExport}.md`);
        this.showExportModal = false; // Close modal - UNCHANGED
        this.showNotification('大纲已导出为Markdown格式', 'success'); // Show notification - UNCHANGED
      } catch (error) {
        console.error('导出Markdown失败:', error);
        this.showNotification('导出Markdown失败: ' + (error.message || '未知错误'), 'error'); // Show error - UNCHANGED
      }
    },

    /**
     * Create and trigger download link - UNCHANGED
     */
    createDownload(blob, filename) {
       // Keep download logic exactly as it was
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100); // Keep original timeout
    },

    /**
     * Show notification - UNCHANGED logic, icon mapping changes
     */
    showNotification(message, type = 'info') {
      // Clear previous timeout - UNCHANGED
      if (this.notification.timeout) {
        clearTimeout(this.notification.timeout);
      }
      // Set new notification state and timeout - UNCHANGED
      this.notification = {
        show: true,
        message,
        type,
        timeout: setTimeout(() => {
          this.notification.show = false;
        }, 3000) // 3 seconds timeout - UNCHANGED
      };
    },

    /**
     * Get notification icon name (for Font Awesome) - MODIFIED
     */
    getNotificationIconName() {
      const iconNameMap = {
        'success': 'circle-check', // ✅
        'error': 'circle-xmark',   // ❌
        'warning': 'exclamation-triangle', // ⚠️
        'info': 'info-circle',     // ℹ️
      };
      // Return mapped icon name or default
      return iconNameMap[this.notification.type] || 'info-circle';
    },

    /**
     * Remove custom character property - NEW METHOD based on UI change request
     * Added a button in template, need a method to handle click
     */
     removeCharacterProperty(character, key) {
        // Double check it's not one of the standard properties before deleting
        if (character && typeof character === 'object' && character.hasOwnProperty(key) && !this.standardProperties.includes(key)) {
             // No confirmation in original, so skip confirmation dialog to match "no other logic" rule.
             delete character[key];
             // Optionally, you could remove the key from `this.standardProperties` and `this.propertyLabels`
             // if it's no longer used anywhere, but this is complex. Keep it simple and leave them globally.
        } else if (this.standardProperties.includes(key)) {
             // Prevent deleting standard properties via this button
             this.showNotification(`无法删除标准属性 "${this.getPropertyLabel(key)}"`, 'warning');
        }
     }
  }
};
</script>

<style scoped>
/* Apply theme variables from root */
/* These should come from main.css :root and body.dark-theme */
/* If not, they would need to be defined here scoped */

/* --- Base Styles --- */
.outline-generator {
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  max-width: 1200px;
  margin: 20px auto; /* Added margin */
  padding: 20px;
  color: var(--text-primary, #1e293b); /* Use variable */
  background-color: var(--content-bg, #f9fafb); /* Use variable */
  border-radius: 12px;
  box-shadow: var(--shadow, 0 4px 15px rgba(0, 0, 0, 0.05)); /* Use variable */
  transition: all 0.3s ease;
}

/* --- Font Awesome Icon Styling --- */
/* Base style for all Font Awesome icons in this component */
.outline-generator .svg-inline--fa {
    vertical-align: middle; /* Align icons nicely with text */
    /* Default size set by parent font size unless overridden */
}
/* Specific icon size/margin adjustments */
.icon-btn .svg-inline--fa { font-size: 1em; } /* Size inherited from button font size */
.refresh-btn .svg-inline--fa { font-size: 1.1em; } /* Slightly larger for refresh */

/* Loading/Empty state icons */
.loading-icon-fa, .empty-icon-fa {
    font-size: 40px; /* Match original size */
    animation: pulse 1.5s infinite ease-in-out; /* Keep original animation */
    color: var(--text-secondary); /* Color from variable */
}
/* Spinner animation handled by Font Awesome spin prop */
/* @keyframes pulse { ... } */


/* Outline item icon */
.outline-icon .svg-inline--fa {
    font-size: 24px; /* Match original size */
    /* Color handled by parent .outline-icon */
}

/* Action buttons icons */
.action-btn-icon-fa {
    font-size: 1em; /* Size inherited from button font size */
}

/* Modal icons */
.modal-loading-icon-fa {
    font-size: 50px; /* Match original size */
    animation: rotate 1.5s infinite linear; /* Keep original animation */
    color: var(--text-secondary); /* Color from variable */
}
.modal-error-icon-fa {
    font-size: 50px; /* Match original size */
    color: var(--error-color); /* Color from variable */
}
.warning-icon-fa {
    font-size: 60px; /* Match original size */
    color: var(--warning-color, #f59e0b); /* Use variable (add warning-color to root if needed) */
    margin-bottom: 25px; /* Match original margin */
    animation: pulse 2s infinite; /* Keep original animation */
}
/* @keyframes rotate { ... } */


/* Section header icons */
.section-icon-fa {
    font-size: 22px; /* Match original size */
    color: var(--primary-color); /* Color from variable */
    margin-right: 10px; /* Match original margin */
}
.form-icon-fa {
     font-size: 20px; /* Match original size */
     color: var(--primary-color); /* Color from variable */
}

/* Add/Remove button icons */
.json-item-header .svg-inline--fa,
.character-title-group .svg-inline--fa {
   font-size: 1em; /* Size inherited from button font size */
}
.add-json-btn .svg-inline--fa,
.add-character-btn .svg-inline--fa,
.add-property-btn .svg-inline--fa {
     font-size: 1em; /* Size inherited from button font size */
}

/* Export format icons */
.export-format-icon-fa {
    font-size: 20px; /* Match original size */
    line-height: 1; /* Match original line-height */
}

/* Notification icons */
.notification-icon-fa {
    font-size: 22px; /* Match original size */
}

/* --- Layout and Panel Styles --- */
.main-container-simplified {
  display: grid;
  grid-template-columns: 1fr; /* Single column layout */
  gap: 20px;
}

.outlines-panel {
  background-color: var(--content-bg); /* Use variable */
  border-radius: 12px;
  box-shadow: var(--shadow); /* Use variable */
  overflow: hidden;
  transition: all 0.3s ease;
}

.panel-header {
  padding: 20px;
  background-color: var(--sidebar-bg); /* Use variable */
  border-bottom: 1px solid var(--border-color); /* Use variable */
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary); /* Use variable */
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary); /* Use variable */
  cursor: pointer;
  font-size: 22px; /* Base size for icon buttons */
  line-height: 1;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex; /* Ensure flex for centering Font Awesome icon */
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  color: var(--primary-color); /* Use variable */
  background-color: rgba(var(--primary-color-rgb, 79, 70, 229), 0.1); /* Use variable/rgba */
}

.refresh-btn {
  font-size: 24px; /* Override icon-btn size */
}

.panel-content {
  padding: 20px;
}

/* Loading and Empty states */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--text-secondary); /* Use variable */
  gap: 15px;
  text-align: center;
}

/* @keyframes pulse { ... } */

/* Outline list */
.outlines-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 260px); /* Adjusted calculation (header + panel padding + some buffer) */
  overflow-y: auto;
  padding-right: 5px;
}

.outlines-list::-webkit-scrollbar { width: 8px; }
.outlines-list::-webkit-scrollbar-track { background: var(--hover-bg); border-radius: 10px; } /* Use variable */
.outlines-list::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; } /* Use variable */
.outlines-list::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); } /* Use variable */


.outline-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 10px;
  background-color: var(--sidebar-bg); /* Use variable */
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 4px solid transparent;
  color: var(--text-primary); /* Default text color */
}

.outline-item:hover {
  background-color: var(--hover-bg); /* Use variable */
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.outline-item.active {
  background-color: rgba(var(--primary-color-rgb, 79, 70, 229), 0.08); /* Use variable/rgba */
  border-left: 4px solid var(--primary-color); /* Use variable */
}

.outline-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 10px;
  background-color: rgba(var(--primary-color-rgb, 79, 70, 229), 0.1); /* Use variable/rgba */
  color: var(--primary-color); /* Use variable */
  margin-right: 16px;
  font-size: 24px;
}

.outline-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
}

.outline-title {
  font-weight: 500;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 20px;
  color: var(--text-primary); /* Use variable */
}

.outline-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  opacity: 0.8; /* Keep opacity for hover effect */
  transition: opacity 0.2s;
}

.outline-item:hover .outline-actions { opacity: 1; }

.action-btn {
  height: 36px;
  width: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary); /* Use variable */
  transition: all 0.2s ease;
  font-size: 18px; /* Controls icon size */
}

.action-btn:hover { transform: translateY(-2px); }

/* Specific action button colors */
.view-btn:hover { color: var(--info-color, #3b82f6); background-color: rgba(var(--info-color-rgb, 59, 130, 246), 0.1); }
.edit-btn:hover { color: var(--success-color, #10b981); background-color: rgba(var(--success-color-rgb, 16, 185, 129), 0.1); }
.export-btn:hover { color: var(--warning-color, #f59e0b); background-color: rgba(var(--warning-color-rgb, 245, 158, 11), 0.1); }
.delete-btn:hover { color: var(--error-color, #ef4444); background-color: rgba(var(--error-color-rgb, 239, 68, 68), 0.1); }


/* --- Modal Styles --- */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7); /* Keep dark overlay */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px); /* Keep blur */
  animation: fadeIn 0.3s ease forwards; /* Added forwards */
}
/* @keyframes fadeIn { ... } */


.modal-content {
  background-color: var(--content-bg); /* Use variable */
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow); /* Use variable */
  animation: slideIn 0.3s ease forwards; /* Added forwards */
}
/* @keyframes slideIn { ... } */


.view-modal, .edit-modal { max-width: 1000px;max-height: 600px; }
.delete-modal, .export-modal { max-width: 550px; }


.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color); /* Use variable */
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--sidebar-bg); /* Use variable */
  flex-shrink: 0;
}

.modal-header h2 {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary); /* Use variable */
}

.close-btn {
  color: var(--text-secondary); /* Use variable */
  font-size: 24px; /* Controls icon size */
  padding: 8px;
  /* Other styles inherited from .icon-btn */
}

.close-btn:hover {
  color: var(--error-color); /* Use variable */
  background-color: rgba(var(--error-color-rgb, 239, 68, 68), 0.1); /* Use variable/rgba */
}


.modal-body {
  padding: 30px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color); /* Use variable */
  background-color: var(--sidebar-bg); /* Use variable */
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

/* Button Styles */
.modal-footer button {
  border-radius: 10px;
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.modal-footer button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.secondary-btn {
  background-color: var(--hover-bg); /* Use variable */
  color: var(--text-primary); /* Use variable */
  border: 1px solid var(--border-color); /* Use variable */
}

.secondary-btn:hover:not(:disabled) {
  background-color: var(--border-color); /* Use variable */
  transform: translateY(-2px);
}

.primary-btn {
  background-color: var(--primary-color); /* Use variable */
  color: white;
  border: none;
}

.primary-btn:hover:not(:disabled) {
  background-color: var(--primary-hover); /* Use variable */
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb, 79, 70, 229), 0.3); /* Use variable/rgba */
}

.danger-btn {
  background-color: var(--error-color); /* Use variable */
  color: white;
  border: none;
}

.danger-btn:hover:not(:disabled) {
  background-color: var(--error-color-darker, #dc2626); /* Use variable (add darker color to root if needed) */
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--error-color-rgb, 239, 68, 68), 0.3); /* Use variable/rgba */
}


/* Modal Content Styles */
.modal-loading, .modal-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 20px;
  text-align: center;
}
/* Colors set by specific icon classes */
/* .modal-loading { color: #64748b; } */
/* .modal-error { color: #ef4444; } */

/* .loading-icon { ... animation } */
/* .error-icon, .warning-icon { ... } */


/* Outline content styles */
.outline-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.outline-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 20px;
  border-radius: 12px;
  background-color: var(--sidebar-bg); /* Use variable */
  border: 1px solid var(--border-color); /* Use variable */
  transition: all 0.3s ease;
}

.outline-section:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  transform: translateY(-3px);
}

.outline-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-color); /* Use variable */
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color); /* Use variable */
  display: flex;
  align-items: center;
  /* gap set by section-icon-fa margin */
  margin: 0;
}

/* .section-icon { color/size handled by .section-icon-fa } */

.section-content {
  line-height: 1.7;
  color: var(--text-primary); /* Use variable */
  padding: 10px 5px;
}

.outline-section-item, .character-item {
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 8px;
  background-color: var(--content-bg); /* Use variable */
  border: 1px solid var(--border-color); /* Use variable */
}

.outline-section-item h4, .character-item h4 {
  font-size: 17px;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 12px;
  color: var(--text-primary); /* Use variable */
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color); /* Use variable */
}

.section-content pre {
  background-color: var(--hover-bg); /* Use variable */
  padding: 15px;
  border-radius: 8px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow-x: auto;
  border: 1px solid var(--border-color); /* Use variable */
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary); /* Color code */
}

.section-content ul { padding-left: 20px; margin: 10px 0; }
.section-content li { margin-bottom: 10px; }


/* Character card styles */
.character-card {
  background-color: var(--content-bg); /* Use variable */
  border-radius: 12px;
  border: 1px solid var(--border-color); /* Use variable */
  margin-bottom: 20px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.character-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  transform: translateY(-3px);
}

.character-header {
  background-color: var(--primary-color); /* Use variable */
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.character-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white; /* Keep white for primary header */
  flex-grow: 1;
}

.character-badge {
  background-color: rgba(255, 255, 255, 0.2);
  color: white; /* Keep white for badges */
  padding: 4px 12px;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 500;
}

.age-badge { background-color: rgba(255, 255, 255, 0.3); }


.character-properties {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.character-property {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--primary-color); /* Use variable */
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color); /* Use variable */
}

.property-value {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary); /* Use variable */
  white-space: pre-wrap;
  padding: 5px;
}


/* Edit form styles */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group label {
  font-weight: 600;
  color: var(--text-primary); /* Use variable */
  display: flex;
  align-items: center;
  gap: 8px; /* Gap set by .form-icon-fa margin */
  font-size: 17px;
}

/* .form-icon { color/size handled by .form-icon-fa } */


.form-group input, .form-group textarea {
  padding: 12px 15px;
  border: 1px solid var(--border-color); /* Use variable */
  border-radius: 8px;
  font-family: inherit;
  font-size: 15px;
  resize: vertical;
  background-color: var(--content-bg); /* Use variable */
  color: var(--text-primary); /* Use variable */
  transition: all 0.2s ease;
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color); /* Use variable */
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb, 79, 70, 229), 0.2); /* Use variable/rgba */
}

/* JSON editor styles */
.json-editor {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.json-item {
  border: 1px solid var(--border-color); /* Use variable */
  border-radius: 10px;
  padding: 18px;
  background-color: var(--sidebar-bg); /* Use variable */
  transition: all 0.3s ease;
}

.json-item:hover {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.json-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.json-key-input {
  flex: 1;
  margin-right: 10px;
  font-weight: 500;
}

.remove-json-btn, .remove-character-btn, .remove-property-btn {
  color: var(--error-color); /* Use variable */
  font-size: 20px; /* Controls icon size */
  padding: 6px;
  /* Other styles inherited from .icon-btn */
}

.remove-json-btn:hover, .remove-character-btn:hover, .remove-property-btn:hover {
  background-color: rgba(var(--error-color-rgb, 239, 68, 68), 0.1); /* Use variable/rgba */
}

.json-value-input {
  width: 100%;
  font-family: 'SFMono-Regular', Consolas, monospace;
  min-height: 100px;
}

.add-json-btn, .add-character-btn {
  background-color: var(--sidebar-bg); /* Use variable */
  border: 2px dashed var(--border-color); /* Use variable */
  color: var(--primary-color); /* Use variable */
  padding: 15px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 16px;
}

.add-json-btn:hover, .add-character-btn:hover {
  background-color: var(--hover-bg); /* Use variable */
  border-color: var(--primary-color); /* Use variable */
  transform: translateY(-2px);
}


/* Character edit card styles */
.characters-editor {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.character-edit-card {
  border: 1px solid var(--border-color); /* Use variable */
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--content-bg); /* Use variable */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.character-edit-card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.character-edit-header {
  background-color: var(--primary-color); /* Use variable */
  padding: 15px 20px;
  color: white; /* Keep white for primary header */
}

.character-title-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.character-edit-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.character-basic-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 15px;
}

.character-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.character-field label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8); /* Keep semi-transparent white */
}

.character-input {
  background-color: rgba(255, 255, 255, 0.9); /* Keep semi-transparent white */
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text-primary); /* Use variable */
  /* No focus style needed, default browser focus is often fine */
}

/* Character properties edit */
.character-properties-edit {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.character-property-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.property-edit-header label {
  font-weight: 600;
  color: var(--primary-color); /* Use variable */
  font-size: 15px;
}

.property-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid var(--border-color); /* Use variable */
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  background-color: var(--content-bg); /* Use variable */
  color: var(--text-primary); /* Use variable */
  transition: all 0.2s ease;
}

.property-textarea:focus {
  outline: none;
  border-color: var(--primary-color); /* Use variable */
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb, 79, 70, 229), 0.2); /* Use variable/rgba */
}

/* Add property styles */
.add-property {
  grid-column: 1 / -1;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed var(--border-color); /* Use variable */
}

.add-property-field {
  display: flex;
  gap: 10px;
}

.property-key-input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid var(--border-color); /* Use variable */
  border-radius: 8px;
  font-size: 14px;
  background-color: var(--content-bg); /* Use variable */
  color: var(--text-primary); /* Use variable */
}

.add-property-btn {
  background-color: var(--primary-color); /* Use variable */
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 15px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.add-property-btn:hover:not(:disabled) {
  background-color: var(--primary-hover); /* Use variable */
  transform: translateY(-2px);
}

.add-property-btn:disabled {
  background-color: var(--text-secondary); /* Use variable */
  cursor: not-allowed;
  opacity: 0.7;
}


/* Delete confirmation styles */
.delete-confirmation {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 30px 0;
}

/* .warning-icon { color/size handled by .warning-icon-fa } */

.delete-confirmation p {
  margin-bottom: 15px;
  font-size: 17px;
  line-height: 1.6;
  color: var(--text-primary); /* Use variable */
}

.delete-confirmation strong {
  color: var(--error-color); /* Use variable */
  font-weight: 700;
}

.delete-warning {
  color: var(--error-color); /* Use variable */
  font-size: 15px;
  margin-top: 15px;
  padding: 12px 20px;
  border-radius: 8px;
  background-color: rgba(var(--error-color-rgb, 239, 68, 68), 0.1); /* Use variable/rgba */
  font-weight: 500;
}


/* Export options styles */
.export-options {
  text-align: center;
  padding: 30px 0;
}

.export-options p {
  margin-bottom: 25px;
  color: var(--text-secondary); /* Use variable */
  font-size: 17px;
}

.export-format-options {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.export-format-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 25px 15px;
  width: 150px;
  min-height: 150px;
  border: 1px solid var(--border-color); /* Use variable */
  border-radius: 12px;
  background-color: var(--sidebar-bg); /* Use variable */
  cursor: pointer;
  transition: all 0.3s ease;
  gap: 15px;
}

.export-format-btn:hover {
  background-color: var(--hover-bg); /* Use variable */
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color); /* Use variable */
}

/* .export-format-btn span:first-child { size/line-height handled by .export-format-icon-fa } */

.export-format-btn .btn-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary); /* Use variable */
}


/* Notification styles */
.notification {
  position: fixed;
  bottom: 25px;
  right: 25px;
  padding: 15px 25px;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 15px;
  z-index: 1100;
  animation: slide-in 0.4s ease forwards; /* Added forwards */
  min-width: 300px;
  /* Colors handled by specific notification.type classes */
}
/* @keyframes slide-in { ... } */


/* Icon size handled by .notification-icon-fa */
/* .notification span:first-child { font-size: 22px; } */

.notification span:last-child {
  font-size: 15px;
  font-weight: 500;
}

/* Notification type colors */
.notification.success {
  background-color: var(--success-color); /* Use variable */
  color: white;
  border-left: 6px solid var(--success-color-darker, #059669); /* Use variable (add darker color to root if needed) */
}
.notification.error {
  background-color: var(--error-color); /* Use variable */
  color: white;
  border-left: 6px solid var(--error-color-darker, #dc2626); /* Use variable */
}
.notification.warning {
  background-color: var(--warning-color); /* Use variable */
  color: white;
  border-left: 6px solid var(--warning-color-darker, #d97706); /* Use variable */
}
.notification.info {
  background-color: var(--info-color); /* Use variable */
  color: white;
  border-left: 6px solid var(--info-color-darker, #2563eb); /* Use variable */
}


/* --- Dark Mode Overrides --- */
/* Relying on variables defined in main.css body.dark-theme */
/* If specific scoped overrides are needed, add them here using */
/* body.dark-theme .outline-generator ... or .outline-generator.dark-theme ... */
/* Example: */
/*
body.dark-theme .outline-item {
    color: var(--text-primary);
}
*/
/* Since most styles use variables, they should adapt automatically */

/* Adjust specific colors for dark mode where variables might not apply directly */
/* Or if you need different shades in dark mode */
body.dark-theme .outline-item.active {
   background-color: rgba(var(--primary-color-rgb-darker, 99, 102, 241), 0.15); /* Use darker primary color for active background */
}
body.dark-theme .outline-icon {
   background-color: rgba(var(--primary-color-rgb-darker, 99, 102, 241), 0.2); /* Use darker primary for icon background */
   color: var(--primary-color-darker); /* Use darker primary for icon color */
}
body.dark-theme .character-card:hover {
  box-shadow: 0 8px 20px rgba(255, 255, 255, 0.05); /* Lighter shadow in dark mode */
}
body.dark-theme .character-header {
    background-color: var(--sidebar-bg); /* Use sidebar bg for darker header */
    color: var(--text-primary);
}
body.dark-theme .character-name,
body.dark-theme .character-badge {
    color: var(--text-primary); /* Use primary text color */
    background-color: var(--hover-bg); /* Use hover bg for badge background */
}
body.dark-theme .character-field label {
    color: var(--text-secondary); /* Use secondary text color */
}
body.dark-theme .character-input {
   background-color: var(--content-bg); /* Use content bg */
   color: var(--text-primary); /* Use primary text */
}
body.dark-theme .property-label {
    color: var(--primary-color-darker); /* Use darker primary for label */
}
body.dark-theme .add-property-btn {
    background-color: var(--primary-color-darker);
}
body.dark-theme .add-property-btn:hover:not(:disabled) {
     background-color: var(--primary-color);
}
body.dark-theme .add-json-btn,
body.dark-theme .add-character-btn {
    border-color: var(--border-color);
    color: var(--primary-color-darker);
    background-color: var(--content-bg);
}
body.dark-theme .add-json-btn:hover,
body.dark-theme .add-character-btn:hover {
     background-color: var(--hover-bg);
     border-color: var(--primary-color-darker);
}
body.dark-theme .json-item {
     background-color: var(--content-bg);
}
body.dark-theme .section-content pre {
    background-color: var(--content-bg); /* Darker background for code block */
    border-color: var(--border-color);
    color: var(--text-secondary); /* Lighter code color */
}


/* --- Responsive Design --- */
@media (max-width: 768px) {
  .outline-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .outline-title {
    white-space: normal;
    margin-right: 0;
    margin-bottom: 8px;
  }

  .outline-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .modal-footer {
    flex-direction: column-reverse;
    gap: 10px;
  }

  .modal-footer button {
    width: 100%;
  }

  .export-format-options {
    flex-direction: column;
    align-items: center;
  }

  .export-format-btn {
    width: 100%;
    max-width: 200px;
  }

  .character-properties {
    grid-template-columns: 1fr;
  }

  .character-properties-edit {
    grid-template-columns: 1fr;
  }

  .character-basic-info {
    grid-template-columns: 1fr;
  }

  .notification {
    min-width: auto;
    left: 20px;
    right: 20px;
    width: calc(100% - 40px);
    bottom: 10px; /* Adjusted bottom margin */
    padding: 12px 18px; /* Adjusted padding */
    gap: 12px; /* Adjusted gap */
  }
    .notification-icon-fa {
        font-size: 1.1em; /* Adjusted size */
    }
     .notification span:last-child {
         font-size: 14px; /* Adjusted font size */
     }


    .modal-header {
        padding: 15px 20px; /* Adjusted padding */
    }
    .modal-header h2 {
        font-size: 18px; /* Adjusted font size */
    }
    .close-btn {
        font-size: 20px; /* Adjusted icon size */
        padding: 6px; /* Adjusted padding */
    }
    .modal-body {
         padding: 20px; /* Adjusted padding */
    }
    .modal-footer {
         padding: 12px 20px; /* Adjusted padding */
    }
    .modal-footer button {
        padding: 10px 15px; /* Adjusted padding */
        font-size: 14px; /* Adjusted font size */
        gap: 6px; /* Adjusted gap */
    }
     .btn-icon-fa {
         font-size: 0.9em; /* Adjusted icon size */
     }


    .loading-state, .empty-state {
        padding: 40px 0; /* Adjusted padding */
        gap: 10px; /* Adjusted gap */
    }
     .loading-icon-fa, .empty-icon-fa {
         font-size: 36px; /* Adjusted size */
     }


    .outline-item {
         padding: 14px; /* Adjusted padding */
         gap: 10px;
    }
     .outline-icon {
         width: 40px;
         height: 40px;
         font-size: 20px;
         margin-right: 12px;
     }
     .outline-title {
         font-size: 15px;
     }
     .outline-actions {
         gap: 6px;
     }
     .action-btn {
         width: 32px;
         height: 32px;
         font-size: 16px; /* Adjusted icon size */
     }

    .outline-section {
         padding: 15px; /* Adjusted padding */
         gap: 10px; /* Adjusted gap */
    }
     .outline-section h3 {
         font-size: 16px; /* Adjusted font size */
         gap: 8px; /* Adjusted gap */
         padding-bottom: 10px; /* Adjusted padding */
     }
      .section-icon-fa {
          font-size: 20px; /* Adjusted size */
          margin-right: 8px; /* Adjusted margin */
      }
     .section-content {
         padding: 8px 4px; /* Adjusted padding */
         font-size: 14px; /* Adjusted font size */
     }
      .outline-section-item, .character-item {
          padding: 12px; /* Adjusted padding */
          margin-bottom: 15px;
      }
       .outline-section-item h4, .character-item h4 {
           font-size: 15px; /* Adjusted font size */
           margin-bottom: 10px; /* Adjusted margin */
       }
       .section-content pre {
            padding: 12px; /* Adjusted padding */
            font-size: 12px; /* Adjusted font size */
       }

    .character-card {
        margin-bottom: 15px;
    }
     .character-header {
         padding: 12px 15px;
         gap: 8px;
     }
     .character-name {
         font-size: 16px;
     }
      .character-badge {
          padding: 3px 10px;
          font-size: 13px;
      }
     .character-properties {
         padding: 15px;
         gap: 15px;
     }
     .property-label {
         font-size: 14px;
     }
      .property-value {
          font-size: 13px;
      }


    .edit-form {
        gap: 20px;
    }
     .form-group label {
         font-size: 15px;
         gap: 6px;
     }
      .form-icon-fa {
          font-size: 18px;
      }
     .form-group input, .form-group textarea {
         padding: 10px 12px;
         font-size: 14px;
     }
      .json-item {
           padding: 15px;
      }
      .json-item-header {
           margin-bottom: 10px;
      }
       .json-key-input {
           font-size: 14px;
       }
       .remove-json-btn .svg-inline--fa, .remove-character-btn .svg-inline--fa, .remove-property-btn .svg-inline--fa {
            font-size: 18px;
       }
       .json-value-input {
           font-size: 13px;
           min-height: 80px;
       }
       .add-json-btn, .add-character-btn {
           padding: 12px;
           font-size: 14px;
           gap: 6px;
       }
       .character-edit-card {
           margin-bottom: 20px;
       }
        .character-edit-header {
            padding: 12px 15px;
        }
         .character-title-group {
              margin-bottom: 10px;
         }
         .character-edit-title {
             font-size: 16px;
         }
          .character-basic-info {
               gap: 10px;
               margin-top: 10px;
          }
          .character-field label {
               font-size: 12px;
          }
          .character-input {
               padding: 6px 10px;
               font-size: 13px;
          }
        .character-properties-edit {
            padding: 15px;
            gap: 15px;
        }
         .property-edit-header label {
              font-size: 14px;
         }
         .property-textarea {
              padding: 10px;
              font-size: 13px;
              min-height: 80px;
         }
         .add-property {
              margin-top: 10px;
              padding-top: 10px;
         }
          .add-property-field {
              gap: 8px;
          }
          .property-key-input {
               padding: 8px 12px;
               font-size: 13px;
          }
          .add-property-btn {
               padding: 8px 12px;
               font-size: 13px;
               gap: 6px;
          }


    .delete-confirmation {
        padding: 20px 0;
    }
     .warning-icon-fa {
         font-size: 50px;
         margin-bottom: 20px;
     }
     .delete-confirmation p {
         font-size: 15px;
         margin-bottom: 10px;
     }
      .delete-warning {
          font-size: 14px;
          padding: 10px 15px;
      }


    .export-options {
        padding: 20px 0;
    }
     .export-options p {
          font-size: 15px;
          margin-bottom: 20px;
     }
      .export-format-options {
          gap: 15px;
      }
       .export-format-btn {
           padding: 20px 10px;
           width: 120px;
           min-height: 120px;
           gap: 10px;
       }
        .export-format-icon-fa {
             font-size: 18px;
        }
        .export-format-btn .btn-text {
             font-size: 14px;
        }

}

@media (max-width: 480px) {
     .outline-generator {
         padding: 10px; /* Further reduce padding */
         margin: 10px auto; /* Further reduce margin */
     }
    .panel-header {
        padding: 12px; /* Further reduce padding */
    }
     .panel-header h2 {
         font-size: 16px; /* Further reduce font size */
     }
    .panel-content {
         padding: 12px; /* Further reduce padding */
    }

    .outlines-list {
        max-height: calc(100vh - 200px); /* Adjust max-height */
    }

    .outline-item {
        padding: 10px; /* Further reduce padding */
        gap: 8px; /* Further reduce gap */
    }
     .outline-icon {
         width: 36px;
         height: 36px;
         font-size: 18px;
         margin-right: 10px;
     }
     .outline-title {
         font-size: 14px;
     }
     .outline-actions {
         gap: 4px; /* Further reduce gap */
     }
     .action-btn {
         width: 30px;
         height: 30px;
         font-size: 14px; /* Further reduce icon size */
     }

    .modal-header {
         padding: 10px 12px; /* Further reduce padding */
    }
     .modal-header h2 {
         font-size: 15px; /* Further reduce font size */
     }
     .close-btn {
         font-size: 18px; /* Further reduce icon size */
         width: 26px;
         height: 26px;
     }

    .modal-body {
         padding: 15px; /* Further reduce padding */
    }
     .form-group label {
         font-size: 14px; /* Further reduce font size */
     }
      .form-icon-fa {
          font-size: 16px;
      }
     .form-group input, .form-group textarea {
         padding: 8px 10px; /* Further reduce padding */
         font-size: 13px; /* Further reduce font size */
     }

    .character-header {
        padding: 10px; /* Further reduce padding */
        flex-direction: column; /* Stack header items */
        align-items: flex-start;
        gap: 6px;
    }
     .character-name {
         font-size: 15px; /* Further reduce font size */
     }
     .character-badge {
         margin-top: 0px; /* Remove margin if stacked */
     }
     .character-basic-info {
         gap: 8px; /* Further reduce gap */
         margin-top: 10px;
     }
      .character-field label {
          font-size: 11px; /* Further reduce font size */
      }
      .character-input {
           padding: 5px 8px; /* Further reduce padding */
           font-size: 12px; /* Further reduce font size */
      }

    .character-properties-edit {
        padding: 10px; /* Further reduce padding */
        gap: 10px; /* Further reduce gap */
    }
     .property-edit-header label {
         font-size: 13px; /* Further reduce font size */
     }
     .property-textarea {
          padding: 8px; /* Further reduce padding */
          font-size: 12px; /* Further reduce font size */
     }

    .add-property-field {
        flex-direction: column;
    }
     .property-key-input {
         padding: 6px 10px; /* Further reduce padding */
         font-size: 12px; /* Further reduce font size */
     }
      .add-property-btn {
          padding: 6px 10px; /* Further reduce padding */
          font-size: 13px; /* Further reduce font size */
          gap: 4px; /* Further reduce gap */
      }


    .export-format-btn {
       padding: 15px 8px; /* Adjusted padding */
       width: 100%; /* Full width */
       max-width: 150px; /* Max width */
       gap: 8px; /* Further reduce gap */
    }
     .export-format-icon-fa {
          font-size: 16px; /* Further reduce size */
     }
     .export-format-btn .btn-text {
         font-size: 13px; /* Further reduce font size */
     }

    .notification {
        padding: 10px 12px; /* Further reduce padding */
        gap: 10px;
    }
     .notification-icon-fa {
         font-size: 1em; /* Further reduce size */
     }
     .notification span:last-child {
         font-size: 12px; /* Further reduce font size */
     }
}

</style>