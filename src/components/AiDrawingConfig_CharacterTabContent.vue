<template>
  <div class="tab-content-container character-tab-content">
    <div class="title-frame">
      <h3 class="title-label">人物绘画模型配置</h3>
      <span class="subtitle-label">配置用于生成主要人物和（可选）非主要人物图像的模型。</span>
    </div>

    <hr class="separator thin-separator">

    <!-- 基本设置区域 -->
    <div class="section-frame card">
       <h4 class="section-title">基本设置</h4>
       <div class="switch-frame">
         <div class="switch-container">
             <div class="switch">
                 <!-- Ensure ID is unique if multiple instances exist -->
                 <input type="checkbox" id="draw-non-main-char-switch-char" v-model="drawNonMainCharacter" @change="saveCharacterSwitch" />
                 <label for="draw-non-main-char-switch-char" class="switch-slider"></label>
             </div>
             <label for="draw-non-main-char-switch-char" class="switch-label">绘制非主要人物</label>
         </div>
         <p class="help-text">
           启用后，系统将为故事中的非主要人物也生成 AI 绘画。注意：这会增加 LLM 和 AI 绘图的使用量。
         </p>
       </div>
    </div>

    <!-- 模型配置列表区域 -->
    <div class="section-frame model-list-frame card">
      <h4 class="section-title">模型配置列表</h4>

      <div class="toolbar-frame">
        <div class="button-group">
          <button class="btn btn-primary btn-sm" @click="addConfigEntry">
            <font-awesome-icon :icon="['fas', 'plus']" /> 新增模型
          </button>
          <button class="btn btn-secondary btn-sm" @click="saveCharacterConfig">
            <font-awesome-icon :icon="['fas', 'save']" /> 保存配置
          </button>
        </div>
        <div class="button-group">
           <span class="help-text-small">说明:</span>
           <button class="btn btn-info btn-xs btn-help" @click="showHelp" title="点击查看帮助">
               <font-awesome-icon :icon="['fas', 'question-circle']" />
           </button>
        </div>
      </div>

      <hr class="separator thin-separator">

      <!-- 列表 -->
      <div class="config-list">
          <!-- 列表标题 (New Order) -->
          <div class="list-header">
            <div class="col model-col">模型</div>
            <div class="col weight-col header-center">权重</div>
            <div class="col priority-col header-center">优先级</div>
            <div class="col action-col header-center">操作</div>
          </div>

          <!-- 列表内容 (Iterate over SORTED computed property) -->
          <div class="list-body">
             <div v-if="sortedCharacterConfig.length === 0" class="empty-list-message">
                请点击“新增模型”添加配置。
            </div>
            <!-- Use sortedCharacterConfig -->
            <div
              v-for="(entry, index) in sortedCharacterConfig"
              :key="entry.id"
              class="list-row"
              :class="{ 'even-row': index % 2 !== 0 }"
            >
               <!-- Model Select (First Column) -->
               <div class="col model-col">
                 <select v-model="entry.config" class="select model-select">
                   <option value="" disabled>-- 选择模型 --</option>
                   <option v-for="model in availableModels" :key="model" :value="model">
                     {{ model }}
                   </option>
                 </select>
               </div>

               <!-- Weight Input (Second Column) -->
               <div class="col weight-col">
                 <input
                   type="number"
                   v-model.number="entry.weigh"
                   class="input weight-input"
                   min="1"
                   @input="validatePositiveInt($event, entry, 'weigh')"
                   title="权重 (正整数)"
                 />
               </div>

               <!-- Priority Input (Third Column) -->
               <div class="col priority-col">
                 <input
                   type="number"
                   v-model.number="entry.priority"
                   class="input priority-input"
                   min="0"
                   @input="validateNaturalNumberForEntry($event, entry, 'priority')"
                   title="优先级 (数字越大越优先)"
                 />
               </div>

               <!-- Action Buttons (Fourth Column) -->
               <div class="col action-col action-buttons">
                  <button class="btn btn-info btn-xs btn-test" @click="testConfig(entry.config)" title="测试此模型配置" :disabled="!entry.config">
                    <font-awesome-icon :icon="['fas', 'flask']" />
                  </button>
                 <button class="btn btn-danger btn-xs btn-delete" @click="deleteConfigEntry(findOriginalIndex(entry.id))" title="删除此行">
                    <!-- Pass original index or ID to delete method -->
                   <font-awesome-icon :icon="['fas', 'trash']" />
                 </button>
               </div>
            </div>
          </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="status-frame">
        <span class="status-label">{{ characterStatus }}</span>
        <span class="priority-tip">提示: 优先级数值越高越优先使用，同级按权重随机。</span>
    </div>
  </div>
</template>

<script>
import { generateJS, loadConfigJS } from './services/ImageGenerationService.js';
// Assume icons are registered globally or import them here
// Icons Used: plus, save, question-circle, flask, trash

export default {
  name: 'CharacterTabContent',
  data() {
    return {
      drawNonMainCharacter: false,
      // Ensure each entry has a unique ID for reliable operations after sorting
      characterConfig: [], // Example: [{ id: Date.now(), config: "", weigh: 1, priority: 0 }]
      availableModels: [],
      characterStatus: "准备就绪"
    }
  },
  // *** ADDED COMPUTED PROPERTY FOR SORTING ***
  computed: {
    sortedCharacterConfig() {
      // Create a shallow copy before sorting to avoid mutating original data directly if needed elsewhere
      return [...this.characterConfig].sort((a, b) => {
        // Sort by priority descending (higher number first)
        // Ensure priority is treated as a number
        const priorityA = parseInt(a.priority || '0', 10);
        const priorityB = parseInt(b.priority || '0', 10);
        return priorityB - priorityA;
        // Optional: Add secondary sort key, e.g., by weight or name if priorities are equal
        // if (priorityB !== priorityA) {
        //   return priorityB - priorityA;
        // } else {
        //   // Example: Sort by weight descending as secondary
        //   const weightA = parseInt(a.weigh || '1', 10);
        //   const weightB = parseInt(b.weigh || '1', 10);
        //   return weightB - weightA;
        // }
      });
    }
  },
  methods: {
    // Helper to find original index based on unique ID
    findOriginalIndex(id) {
        return this.characterConfig.findIndex(entry => entry.id === id);
    },
    getConfigKeys() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        if (!configStr) return [];
        const config = JSON.parse(configStr);
        if (!config.AI_draw || !config.AI_draw.configs) return [];
        return Object.keys(config.AI_draw.configs).sort();
      } catch (error) {
        console.error("获取配置键名时出错:", error);
        return [];
      }
    },
    loadCharacterConfig() {
      try {
        this.availableModels = this.getConfigKeys();

        const configStr = localStorage.getItem('aiGalgameConfig');
        if (!configStr) {
          this.initializeDefaultConfig();
          return;
        }
        const config = JSON.parse(configStr);
        if (!config.AI_draw) {
          this.initializeDefaultConfig();
          return;
        }
        this.drawNonMainCharacter = config.AI_draw.draw_non_main_character === true;

        // Load config, ensure array, convert numbers, and add unique ID
        let idCounter = Date.now(); // Simple ID generator
        this.characterConfig = (config.AI_draw.character_config || []).map((entry, index) => ({
            ...entry,
            id: entry.id || (idCounter + index), // Assign new ID if missing
            weigh: parseInt(entry.weigh || '1', 10) || 1,
            priority: parseInt(entry.priority || '0', 10) || 0
        }));

      } catch (error) {
        console.error("加载人物配置时出错:", error);
        this.$emit('show-message', { title: "error", message: `加载配置失败: ${error.message}`});
        this.initializeDefaultConfig();
      }
    },
    initializeDefaultConfig() {
      const configStr = localStorage.getItem('aiGalgameConfig');
      let config = {};
       try { config = configStr ? JSON.parse(configStr) : {}; } catch(e) { console.error("Error parsing LS on init default:", e); }

      let updated = false;
      if (!config.AI_draw) { config.AI_draw = {}; updated = true; }
      if (config.AI_draw.draw_non_main_character === undefined) { config.AI_draw.draw_non_main_character = false; updated = true; }
      if (!Array.isArray(config.AI_draw.character_config)) {
            const firstModel = this.availableModels.length > 0 ? this.availableModels[0] : "";
            // Add ID here too
            config.AI_draw.character_config = firstModel ? [{ id: Date.now(), config: firstModel, weigh: 1, priority: 0 }] : [];
            updated = true;
      } else {
         // Ensure existing entries have IDs
         config.AI_draw.character_config.forEach((entry, index) => {
             if (!entry.id) {
                 entry.id = Date.now() + index;
                 updated = true;
             }
         });
      }


       if (updated) {
           try { localStorage.setItem('aiGalgameConfig', JSON.stringify(config)); } catch(e) { console.error("Error saving initialized default:", e); }
       }

       this.drawNonMainCharacter = config.AI_draw.draw_non_main_character === true;
       let idCounter = Date.now();
       this.characterConfig = (config.AI_draw.character_config || []).map((entry, index) => ({
            ...entry,
            id: entry.id || (idCounter + index), // Ensure ID again
            weigh: parseInt(entry.weigh || '1', 10) || 1,
            priority: parseInt(entry.priority || '0', 10) || 0
       }));
    },
    saveCharacterSwitch() {
      try {
        const configStr = localStorage.getItem('aiGalgameConfig');
        const config = configStr ? JSON.parse(configStr) : {};
        if (!config.AI_draw) config.AI_draw = {};
        config.AI_draw.draw_non_main_character = this.drawNonMainCharacter;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
        this.$emit('show-message', { title: "success", message: `绘制非主要人物已${this.drawNonMainCharacter ? '启用' : '禁用'}` });
      } catch (error) {
        this.$emit('show-message', { title: "error", message: `保存开关状态出错: ${error.message}` });
        console.error("保存开关状态时出错:", error);
      }
    },
    saveCharacterConfig() {
      try {
        // Save the data directly from characterConfig (which holds the current state)
        // The computed property is only for display sorting
        const configToSave = this.characterConfig
          .filter(entry => entry.config)
          .map(entry => ({ // Map back to saved format, remove temporary ID
             config: entry.config,
             weigh: parseInt(entry.weigh || '1', 10) || 1,
             priority: parseInt(entry.priority || '0', 10) || 0
             // DO NOT save the temporary 'id' field
          }));


        const configStr = localStorage.getItem('aiGalgameConfig');
        const config = configStr ? JSON.parse(configStr) : {};
        if (!config.AI_draw) config.AI_draw = {};
        config.AI_draw.character_config = configToSave;
        localStorage.setItem('aiGalgameConfig', JSON.stringify(config));

        this.characterStatus = "配置已保存";
        setTimeout(() => { this.characterStatus = "准备就绪"; }, 2000);
        this.$emit('show-message', { title: "success", message: "人物绘画配置已保存！" });
      } catch (error) {
         this.$emit('show-message', { title: "error", message: `保存人物配置时出错: ${error.message}` });
         this.characterStatus = "保存失败";
         console.error("保存人物配置时出错:", error);
      }
    },
    addConfigEntry() {
      // Add entry with a unique ID
      this.characterConfig.push({ id: Date.now(), config: "", weigh: 1, priority: 0 });
      this.characterStatus = "已添加新行，请选择模型并保存";
       this.$nextTick(() => {
            const container = this.$refs.entriesContainer; // Ensure ref="entriesContainer" is on the scrollable element
            if(container) container.scrollTop = container.scrollHeight;
       });
    },
    // Use index from the original unsorted array
    deleteConfigEntry(originalIndex) {
      if (originalIndex >= 0 && originalIndex < this.characterConfig.length) {
           this.characterConfig.splice(originalIndex, 1);
           this.characterStatus = "已删除一行，请记得保存";
      } else {
          console.warn("Could not find original index for deletion:", originalIndex);
           this.$emit('show-message', { title: "error", message: "删除失败，无法找到对应条目。" });
      }
    },
    // --- testConfig, showHelp, validate methods remain the same ---
     async testConfig(modelName) {
       if (!modelName) {
           this.$emit('show-message', { title: "warning", message: "请先在此行选择一个模型再进行测试。" });
           return;
       }
      this.$emit('show-message', { title: "info", message: `开始测试人物模型: ${modelName}...` });
      this.characterStatus = `正在测试模型: ${modelName}...`;
      try {
        const config = loadConfigJS(); // Assuming this loads the *entire* config needed by generateJS
        if (!config) throw new Error("无法加载主配置");

        const testBaseDir = '/data/test';
        const testImagesDir = `${testBaseDir}/images`;
        const testPrompt = "best quality, masterpiece, ultra detailed, 1girl, solo, looking_at_viewer, short_hair, brown_hair, green_eyes, school_uniform, classroom, sunlight"; // More typical character prompt
        const sanitizedModelName = modelName.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const testImageName = `test_char_${sanitizedModelName}_${Date.now()}`;

        this.$emit('show-message', { title: "info", message: `生成测试图像: ${testImageName}.png` });
        this.characterStatus = `生成测试图像 ${testImageName}.png ...`;

        // Call generateJS - Assuming it correctly uses the specified 'modelName'
        const status = await generateJS(config, testImagesDir, testPrompt, testImageName, modelName);

        // Report result
        if (status === 'success') {
          this.$emit('show-message', { title: "success", message: `模型 ${modelName} 测试成功! 图像: ${testImagesDir}/${testImageName}.png` });
          this.characterStatus = `模型 ${modelName} 测试成功!`;
        } else if (status === 'forbid') {
          this.$emit('show-message', { title: "warning", message: `模型 ${modelName} 测试被阻止 (Forbid).` });
          this.characterStatus = `模型 ${modelName} 测试被阻止 (Forbid).`;
        } else {
          this.$emit('show-message', { title: "error", message: `模型 ${modelName} 测试失败. 状态: ${status}` });
          this.characterStatus = `模型 ${modelName} 测试失败 (${status})`;
        }
      } catch (error) {
        console.error(`测试模型 ${modelName} 时发生错误:`, error);
        this.$emit('show-message', { title: "error", message: `测试模型 ${modelName} 时发生异常: ${error.message}` });
        this.characterStatus = `测试模型 ${modelName} 时发生异常`;
      } finally {
        setTimeout(() => {
          if (this.characterStatus.includes(`模型 ${modelName} 测试`)) this.characterStatus = "准备就绪";
        }, 5000);
      }
    },
    showHelp() {
      const helpText = "配置用于生成人物的AI绘画模型。\n优先级：数字越大，越优先使用。0为最低优先级。\n权重：在同一优先级内，权重越高的模型被选中的概率越大（按权重比例分配）。\n测试：使用固定提示词测试选定模型的出图效果。";
      this.$emit('show-message', { title: "info", message: helpText }); // Use info type
    },
    validatePositiveInt(event, entry, field) {
        let value = event.target.value;
        if (value === '') { entry[field] = 1; return; }
        value = value.replace(/\D/g, '');
        let num = parseInt(value, 10);
        if (isNaN(num) || num < 1) num = 1;
        entry[field] = num; // Update the entry in the original characterConfig array
        this.$nextTick(() => { event.target.value = entry[field]; });
    },
    validateNaturalNumberForEntry(event, entry, field) {
        let value = event.target.value;
        if (value === '') { entry[field] = 0; return; }
        value = value.replace(/\D/g, '');
        let num = parseInt(value, 10);
        if (isNaN(num) || num < 0) num = 0;
        entry[field] = num; // Update the entry in the original characterConfig array
        this.$nextTick(() => { event.target.value = entry[field]; });
    }
  },
  mounted() {
    this.loadCharacterConfig();
  }
}
</script>

<style scoped>
/* --- Styles are largely the same, just update column flex values --- */
.tab-content-container { }
.title-frame { margin-bottom: 15px; }
.title-label { font-size: 1.4rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.subtitle-label { font-size: 0.95rem; color: var(--text-secondary); }
.separator { border: none; border-top: 1px solid var(--border-color); margin: 15px 0; }
.thin-separator { margin: 10px 0; border-color: var(--hover-overlay); }
.section-frame { margin-bottom: 25px; padding: 20px; }
.section-title { font-size: 1.1rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px dashed var(--border-color); }
.switch-frame { display: flex; align-items: center; flex-wrap: wrap; gap: 15px; }
.switch-container { display: flex; align-items: center; gap: 10px; }
.switch { position: relative; display: inline-block; width: 50px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border-color); transition: .4s; border-radius: 24px; }
.switch-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.switch input:checked + .switch-slider { background-color: var(--primary-color); }
.switch input:focus + .switch-slider { box-shadow: 0 0 1px var(--primary-color); }
.switch input:checked + .switch-slider:before { transform: translateX(26px); }
.switch-label { font-size: 1rem; color: var(--text-primary); cursor: pointer; }
.help-text { font-size: 0.85rem; color: var(--text-tertiary); margin-top: 5px; flex-basis: 100%; line-height: 1.4; }
.toolbar-frame { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
.button-group { display: flex; gap: 10px; align-items: center; }
.help-text-small { font-size: 0.9rem; color: var(--text-secondary); }
.btn-help { padding: 2px 6px; }
.config-list { border: 1px solid var(--border-color); border-radius: var(--border-radius-md); overflow: hidden; }
.list-header, .list-row { display: flex; align-items: center; padding: 8px 10px; gap: 10px; }
.list-header { background-color: var(--hover-overlay); color: var(--text-secondary); font-weight: 600; font-size: 0.9rem; border-bottom: 1px solid var(--border-color); }
.list-body { max-height: 400px; overflow-y: auto; } /* Added scroll */
.list-row { min-height: 54px; border-bottom: 1px solid var(--hover-overlay); }
.list-row:last-child { border-bottom: none; }
.even-row { background-color: rgba(0,0,0,0.02); }
.dark-theme .even-row { background-color: rgba(255,255,255,0.03); }
.empty-list-message { text-align: center; padding: 20px; color: var(--text-tertiary); }
.col { display: flex; align-items: center; }

/* --- UPDATED COLUMN FLEX/ORDER --- */
.model-col { flex: 2 1 200px; order: 1; } /* Order 1 */
.weight-col { flex: 0 0 100px; justify-content: center; order: 2; } /* Order 2 */
.priority-col { flex: 0 0 100px; justify-content: center; order: 3; } /* Order 3 */
.action-col { flex: 0 0 100px; justify-content: center; order: 4; } /* Order 4 */

.header-center { justify-content: center; text-align: center; }
.priority-input, .weight-input { text-align: center; max-width: 70px; padding: 6px 8px; font-size: 0.9rem; }
.model-select { width: 100%; font-size: 0.9rem; padding: 6px 10px; }
.action-buttons { display: flex; gap: 8px; }
.btn-test, .btn-delete { padding: 4px 8px; }
.status-frame { margin-top: 20px; padding: 8px 12px; background-color: var(--hover-overlay); border-radius: var(--border-radius-sm); display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; }
.status-label { color: var(--text-secondary); font-style: italic; }
.priority-tip { color: var(--text-tertiary); font-size: 0.85rem; }
</style>