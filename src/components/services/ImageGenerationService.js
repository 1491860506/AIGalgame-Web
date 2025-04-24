
  // ImageGenerationService.js
  import * as idbFs from './IndexedDBFileSystem.js';
  import { processPrompt } from './PromptService.js';
  import { gpt, gptDestroy } from './AiModelService.js';
  import * as ImageProcessor from './ImageProcessor.js'; // Assuming methods are exported
  import {
      sleep,
      randint,
      weightedRandomChoice,
      safeGetPath,
      evaluateConditionSafe,
      safeB64Decode,
      processUserdefine,
      USERDEFINE_FUNCTION_MAP,
      parseHeaders,
      parseJsonFromGptResponse,
      AsyncLock
  } from './imagegenerate_utils.js'; // Import helpers
  
  const _EVAL_FAILED = Symbol("EvalFailed"); // Re-declare or import from utils if needed
  
  // --- Global State ---
  let currentConfig = null;
  let gameDirectory = '/data'; // Base path in IndexedDB simulation
  let storyTitle = ''; // Default, will be updated from config
  let imagesDirectory = `${gameDirectory}/${storyTitle}/images`;
  
  // --- Placeholder Functions ---
  async function func1JS(status) {
      if (status !== 'error' && status !== 'rembg_error' && status !== 'cheak_error') { // Consider non-error failures as triggers too?
          // Logic from python: trigger prompt modification unless it was specific errors
          return 1;
      }
      console.debug("DEBUG: func1JS() called. Returning 0 (no split). Status:", status);
      return 0; // Default: no split for errors
  }
  
  async function func2JS(original_prompt, image_name, model_name, attempt_number, kind) {
      console.debug(`DEBUG: func2JS called for ${image_name} (attempt ${attempt_number + 1} with ${model_name})`);
      try {
          const [prompt1, prompt2Input] = await processPrompt('重写提示词'); // Assuming processPrompt handles this key
          const modifiedPrompt2 = original_prompt; // Use original prompt as input to GPT
          const gptId = randint(1, 100000);
  
          // Simplified retry logic within func2
          for (let i = 0; i < 3; i++) { // Max 3 retries for GPT rewrite
              const gptResponse = await gpt(prompt1, modifiedPrompt2, kind, gptId); // Pass original prompt as second arg
  
              if (gptResponse === 'over_times') {
                  console.warn("GPT call for prompt rewrite exceeded retries within gpt function.");
                  continue; // Try gpt call again if possible within loop
              } else if (gptResponse && gptResponse !== 'error') {
                   // Attempt to extract "prompt" from the response JSON (assuming same structure)
                  // Regex might need adjustment based on actual GPT output format
                  const match = gptResponse.match(/"prompt":\s*"((?:[^"\\]|\\.)*)"/);
                  if (match && match[1]) {
                      await gptDestroy(gptId);
                      const newPrompt = match[1].replace(/\\"/g, '"'); // Handle escaped quotes
                      console.debug(`DEBUG: func2JS returning new prompt: ${newPrompt}`);
                      return newPrompt;
                  } else {
                      console.warn("Could not extract new prompt from func2 GPT response:", gptResponse.substring(0, 100));
                      // Continue loop if extraction fails
                  }
              } else {
                   console.warn("func2 GPT call failed or returned error.");
                   await sleep(500); // Wait before retrying gpt call
              }
          }
          // If loop finishes without success
          await gptDestroy(gptId); // Ensure cleanup even on failure
          console.error("func2JS failed to get a valid rewritten prompt after multiple retries.");
          return "error"; // Indicate failure
  
      } catch (e) {
          console.error("Error in func2JS calling GPT:", e);
          // No gptId to destroy if initial call failed
          return "error"; // Indicate failure
      }
  }
  
  // --- ModelManager Class ---
  class ModelManager {
      constructor(config, kind, total_tasks, main_manager_instance = null, is_sub_manager = false) {
          this.config = config;
          this.kind = kind;
          this.total_tasks = total_tasks; // Primarily for context
          this.is_sub_manager = is_sub_manager;
          this.main_manager_ref = main_manager_instance || (is_sub_manager ? null : this); // Main manager references itself
  
          this.all_priorities = null; // Array of priority numbers [high, ..., low]
          this.models = []; // Models for the CURRENT priority: { name: string, weigh: number, priority: number }
          this.current_priority_index = 0;
          this.terminate_flag = false; // No more models available AT ALL for this manager instance
          this.lock = new AsyncLock(); // Lock for instance-specific state (models list, priority index)
  
          // Central Concurrency State (Managed by the MAIN manager)
          this._global_model_usage = {}; // { modelName: { max: number, current: number } }
          this._global_lock = new AsyncLock(); // Separate lock for the global usage dict
  
          if (!this.is_sub_manager) {
              this._initialize_global_usage();
          }
          // Use getter for main manager's global state if this is a sub-manager
          this._global_model_usage = this.main_manager_ref._global_model_usage;
          this._global_lock = this.main_manager_ref._global_lock;
  
  
          // Load models for the highest priority - need to make async? YES
          // We'll call an async init method after construction
      }
  
      async initialize() {
         await this.load_models_by_highest_priority();
      }
  
      _initialize_global_usage() {
          // Called only by Main Manager
          console.log("Initializing Global Model Usage Tracker...");
          // Use lock immediately as this modifies shared state (_global_model_usage)
          // Although called in constructor (single thread), locking is good practice
          // No 'await' here, so sync locking is fine conceptually, but use the async lock wrapper
          this._global_lock.withLock(() => { // Wrap sync code
               this._global_model_usage = {}; // Reset
               const all_model_configs = this.config?.AI_draw?.configs || {};
  
               if (Object.keys(all_model_configs).length === 0) {
                   console.warn("Warning: No 'configs' section found in AI_draw config for global usage tracking.");
                   return;
               }
  
               for (const [model_name, model_conf] of Object.entries(all_model_configs)) {
                   let max_c = 1; // Default
                   try {
                       const raw_max_c = model_conf?.maxconcurrency;
                       if (raw_max_c !== null && raw_max_c !== undefined && String(raw_max_c).trim()) {
                           const parsed_c = parseInt(String(raw_max_c).trim(), 10);
                           if (!isNaN(parsed_c)) {
                               max_c = Math.max(0, parsed_c); // Ensure non-negative
                           } else {
                                console.warn(`Warning: Invalid maxconcurrency '${raw_max_c}' for model '${model_name}'. Using default 1.`);
                           }
                       }
                   } catch (e) {
                       console.warn(`Warning: Error parsing maxconcurrency for model '${model_name}'. Using default 1.`, e);
                       max_c = 1;
                   }
                   this._global_model_usage[model_name] = { max: max_c, current: 0 };
               }
               // console.log("Global Usage Initialized:", JSON.stringify(this._global_model_usage)); // Deep log if needed
          });
      }
  
    // --- ModelManager Class ---
    // ... (constructor, initialize, _initialize_global_usage remain the same) ...

    async load_models_by_highest_priority() {
        const managerId = this.is_sub_manager ? `SubMgr(...)` : "MainMgr"; // Simplified ID
        // <<< Log BEFORE attempting to acquire the lock >>>
        console.log(`${managerId}: --> Preparing to acquire lock for load_models_by_highest_priority. Index: ${this.current_priority_index}.`);

        try {
            return await this.lock.withLock(async () => {
                // <<< Log AFTER acquiring the lock >>>
                console.log(`${managerId}:     Acquired lock for load_models_by_highest_priority. Index: ${this.current_priority_index}. Terminated: ${this.terminate_flag}`);

                // Initialize priorities on first call
                if (this.all_priorities === null) {
                     console.log(`${managerId}:     Initializing priorities...`);
                    // ... (rest of initialization logic as before) ...
                    const models_config_key = `${this.kind}_config`;
                    const models_config_list = this.config?.AI_draw?.[models_config_key];

                    if (!Array.isArray(models_config_list) || models_config_list.length === 0) {
                        console.warn(`${managerId}: Warning: No config found for '${models_config_key}'`);
                        console.log("所有模型用尽 (配置中未找到有效优先级列表)");
                        this.terminate_flag = true;
                        return false;
                    }
                    const valid_models = models_config_list.filter(m => typeof m?.priority === 'number' && Number.isInteger(m.priority));
                    if (valid_models.length === 0) {
                        console.warn(`${managerId}: Warning: No models with valid integer priorities in '${models_config_key}'`);
                        console.log("所有模型用尽 (配置中未找到带有效优先级的模型)");
                        this.terminate_flag = true;
                        return false;
                    }
                    this.all_priorities = [...new Set(valid_models.map(m => m.priority))].sort((a, b) => b - a);
                    console.log(`${managerId}:     Priorities initialized: [${this.all_priorities.join(', ')}]. Current index remains ${this.current_priority_index}.`);
                    if (this.current_priority_index >= this.all_priorities.length) {
                        console.log(`${managerId}:     Initial index ${this.current_priority_index} is >= total priorities ${this.all_priorities.length}.`);
                        console.log("所有模型用尽 (初始索引已超出范围)");
                        this.terminate_flag = true;
                        return false;
                    }
                }

                // --- Loop through priorities starting from current_priority_index ---
                console.log(`${managerId}:     Starting priority loop. Index: ${this.current_priority_index}, Total Priorities: ${this.all_priorities.length}`);
                while (this.current_priority_index < this.all_priorities.length) {
                    const currentProcessingIndex = this.current_priority_index;
                    const target_priority = this.all_priorities[currentProcessingIndex];
                    console.log(`${managerId}:     Checking index ${currentProcessingIndex}, Priority: ${target_priority}...`);

                    const models_config_list = this.config?.AI_draw?.[`${this.kind}_config`] || [];
                    const models_to_load_configs = models_config_list.filter(mc => mc?.priority === target_priority);

                    if (models_to_load_configs.length === 0) {
                        console.log(`${managerId}:     No models configured for priority ${target_priority}. Incrementing index.`);
                        this.current_priority_index++;
                        console.log(`${managerId}:     Index is now ${this.current_priority_index}. Continuing loop.`);
                        continue;
                    }

                    console.log(`${managerId}:     Found ${models_to_load_configs.length} config(s) for priority ${target_priority}. Validating...`);
                    const loadedModels = [];
                    for (const model_config of models_to_load_configs) {
                         const model_name = model_config?.config;
                         if (!model_name) continue;
                         const globalUsageExists = this.main_manager_ref?._global_model_usage?.[model_name];
                         if (!globalUsageExists) {
                            console.warn(`${managerId}: Model '${model_name}' (prio ${target_priority}) not in global configs. Skipping.`);
                            continue;
                         }
                         const weigh = typeof model_config.weigh === 'number' ? model_config.weigh : 1;
                         loadedModels.push({ name: model_name, weigh: weigh, priority: target_priority });
                    }

                    if (loadedModels.length > 0) {
                        this.models = loadedModels;
                        console.log(`${managerId}:     Successfully loaded ${this.models.length} models for priority ${target_priority} at index ${currentProcessingIndex}.`);
                        console.log(`${managerId}:     Exiting load_models_by_highest_priority with TRUE.`);
                        // Lock is released automatically by withLock
                        return true;
                    } else {
                        console.log(`${managerId}:     No VALID models found for priority ${target_priority} after checks. Incrementing index.`);
                        this.models = [];
                        this.current_priority_index++;
                        console.log(`${managerId}:     Index is now ${this.current_priority_index}. Continuing loop.`);
                        continue;
                    }
                } // --- End of while loop ---

                console.log(`${managerId}:     Loop finished. Index (${this.current_priority_index}) is >= Total Priorities (${this.all_priorities.length}).`);
                console.log("所有模型用尽");
                this.models = [];
                this.terminate_flag = true;
                console.log(`${managerId}:     Exiting load_models_by_highest_priority with FALSE.`);
                 // Lock is released automatically by withLock
                return false;
            }); // End withLock block

        } catch (error) {
            // Catch errors that might happen *during* the withLock execution or if acquire itself fails
            console.error(`${managerId}: !!! ERROR within load_models_by_highest_priority or its lock acquisition !!!`, error);
            this.terminate_flag = true; // Ensure termination on unexpected errors
            return false;
        } finally {
             // <<< Log AFTER the withLock call completes (successfully or with error) >>>
             console.log(`${managerId}: <-- Finished attempt to run/acquire lock for load_models_by_highest_priority. Index: ${this.current_priority_index}. Terminated: ${this.terminate_flag}.`);
        }
    }

    // get_model remains the same as the previous version with added logging around the await call
    // ... (keep the get_model from the previous response) ...
  
      get_current_priority_value() {
         // This doesn't need a lock if reading primitive index and array isn't mutated outside locks
         // But locking is safer if unsure about JS atomicity guarantees vs Python GIL
         // Let's lock for safety, although likely overkill for reads here.
         // await this.lock.acquire(); try { ... } finally { this.lock.release(); } -> becomes cumbersome
         // Let's assume read is safe enough without lock for this getter.
         if (this.all_priorities && this.current_priority_index >= 0 && this.current_priority_index < this.all_priorities.length) {
              return this.all_priorities[this.current_priority_index];
         }
         return null;
      }
  
      // --- Model Acquisition and Release ---
  
      // Main manager uses this to get a model and acquire global lock
      async get_model() {
        if (this.is_sub_manager) {
            console.error("ERROR: Sub-manager called get_model.");
            return null;
        }
        const managerId = "MainMgr"; // Simple ID for logging

        while (!this.terminate_flag) {
            let selected_model_data = null;
            let acquired = false;
            let needsLoadCheck = false; // Flag to indicate if loading needs to happen *after* lock release

            // --- Step 1: Check current state under lock ---
            await this.lock.withLock(async () => {
                 if (this.terminate_flag) return; // Exit lock callback if already terminated

                 if (this.models.length === 0) {
                     // Models list for current priority is empty.
                     // Signal that loading the next priority is needed AFTER releasing the lock.
                     needsLoadCheck = true;
                     console.log(`${managerId}: Models list empty for current priority index ${this.current_priority_index}. Flagging for load check.`);
                     // DO NOT call load_models_by_highest_priority here!
                     return; // Exit lock callback
                 }

                 // --- Models exist, check global availability ---
                 const globally_available_models = [];
                 await this._global_lock.withLock(() => {
                     if (this.terminate_flag) return;
                     for (const model of this.models) {
                         const usage = this._global_model_usage[model.name];
                         if (usage && usage.current < usage.max) {
                             globally_available_models.push(model);
                         }
                     }
                 }); // Release global lock

                 if (globally_available_models.length === 0) {
                     // Models exist but are busy globally.
                     // console.debug(`${managerId}: Models available locally but busy globally. Waiting.`);
                     selected_model_data = null; // Signal wait, but don't trigger load
                     return; // Exit lock callback
                 }

                 // --- Select a model from available ones ---
                 const weights = globally_available_models.map(m => m.weigh);
                 const choice = weightedRandomChoice(globally_available_models, weights, 1);
                 if (choice && choice.length > 0) { selected_model_data = choice[0]; }
                 else if (globally_available_models.length > 0) {
                      console.warn(`${managerId}: Weighted choice failed, using random.`);
                      selected_model_data = globally_available_models[Math.floor(Math.random() * globally_available_models.length)];
                  } else { selected_model_data = null; }

                  // selected_model_data now holds the candidate, or null if none selected
                  // Exit lock callback
            }); // --- Instance Lock Released ---


            // --- Step 2: Perform actions based on state checked under lock ---

            // Check terminate flag again, it might have been set while lock was held or just after release
            if (this.terminate_flag) {
                console.log(`${managerId}: Terminate flag checked after lock release. Exiting get_model.`);
                break; // Exit the while loop
            }

            // Action 1: If load check was flagged, attempt loading the next priority
            if (needsLoadCheck) {
                console.log(`${managerId}: needsLoadCheck is true. Incrementing index and calling load_models...`);
                this.current_priority_index++; // Increment index for the *next* priority
                let loadSuccess = false;
                try {
                    // Now call load_models_by_highest_priority OUTSIDE the previous lock.
                    // It will acquire its own lock correctly.
                    console.log(`${managerId}: Calling await load_models_by_highest_priority() (Index is now ${this.current_priority_index})...`);
                    loadSuccess = await this.load_models_by_highest_priority();
                    console.log(`${managerId}: await load_models_by_highest_priority() returned: ${loadSuccess}`);
                } catch (loadError) {
                    console.error(`${managerId}: ERROR during await load_models_by_highest_priority():`, loadError);
                    this.terminate_flag = true; // Assume termination on error
                    loadSuccess = false;
                }

                // If load failed (including exhaustion), terminate_flag should be set by load_models...
                // If load succeeded, new models are in this.models.
                // In either case, continue to the next iteration of the while loop
                // to re-evaluate the state (check terminate_flag, check this.models).
                console.log(`${managerId}: Load attempt finished. Continuing get_model loop. Terminated: ${this.terminate_flag}`);
                continue; // Restart the while loop
            }

            // Action 2: If a model was selected, try to acquire global lock
            if (selected_model_data) {
                const selected_name = selected_model_data.name;
                await this._global_lock.withLock(() => { // Acquire global lock
                    if (this.terminate_flag) return;
                    const usage = this._global_model_usage[selected_name];
                    if (usage && usage.current < usage.max) {
                        usage.current++;
                        acquired = true; // Mark acquired *within* global lock
                        console.log(`${managerId}: Acquired Global Lock for: ${selected_name} (Usage: ${usage.current}/${usage.max})`);
                    } else {
                        console.warn(`${managerId}: Failed acquire global lock for ${selected_name} (race?). Retrying.`);
                        acquired = false;
                    }
                }); // Release global lock

                // Check termination status *after* releasing global lock
                if (this.terminate_flag) {
                    if (acquired) { // Must release if terminated just after acquiring
                        console.warn(`${managerId}: Releasing ${selected_name} immediately due to termination after acquire.`);
                         await this._global_lock.withLock(() => { // Re-acquire global lock briefly to release
                             const usage = this._global_model_usage[selected_name];
                             if (usage && usage.current > 0) usage.current--;
                             else console.warn(`${managerId}: Usage count was already 0 when trying to release ${selected_name} during termination.`);
                         });
                        acquired = false;
                    }
                    console.log(`${managerId}: Terminate flag checked after global lock attempt. Exiting get_model.`);
                    break; // Exit while loop
                }

                if (acquired) {
                    console.log(`${managerId}: Returning acquired model: ${selected_name}`);
                    return { ...selected_model_data }; // <<< SUCCESS: Return acquired model
                } else {
                    // Failed global acquire (race condition)
                    if (this.terminate_flag) break; // Check again before sleep
                    await sleep(100 + Math.random() * 100); // Wait briefly
                    console.log(`${managerId}: Global acquire failed for ${selected_name}. Continuing get_model loop.`);
                    continue; // Continue main while loop to retry getting a model
                }
            }

            // Action 3: If no model selected and no load needed (implies models exist but are busy)
            if (!selected_model_data && !needsLoadCheck) {
                 console.log(`${managerId}: No model selected (all busy globally?). Waiting... Terminated: ${this.terminate_flag}`);
                 if (this.terminate_flag) break; // Check again before sleep
                 await sleep(500); // Wait for a model to potentially be released
                 continue; // Continue main while loop
            }

            // Safety break if somehow loop reaches here without continuing/breaking/returning
             console.warn(`${managerId}: Reached end of get_model loop unexpectedly. Breaking.`);
             break;

        } // End while (!this.terminate_flag)

        // If loop exits, terminate_flag is true
        console.log(`${managerId}: Exiting get_model function because terminate_flag is set.`);
        return null; // Signal no model available due to termination
    }
  
      // Main manager uses this to release a model and global lock
      async release_model(model_name, status) {
           if (this.is_sub_manager) {
               console.error("ERROR: Sub-manager called release_model. Use release_split_task_model.");
               return;
           }
  
           // --- Release global concurrency ---
           let released_globally = false;
           await this._global_lock.withLock(() => {
               const usage = this._global_model_usage[model_name];
               if (usage) {
                    if (usage.current > 0) {
                        usage.current--;
                        released_globally = true;
                        console.log(`Main Manager Released: ${model_name} (Global Usage: ${usage.current}/${usage.max})`);
                    } else {
                         console.warn(`WARN: Attempted to release ${model_name} globally, but current usage was already 0.`);
                    }
               } // Else: Model not tracked? Should not happen.
           });
  
           // --- Update instance model list if permanently failed ---
           if (status === 'retry_over_times') {
                await this.lock.withLock(() => { // Lock instance state
                    const initial_length = this.models.length;
                    this.models = this.models.filter(model => {
                        if (model.name === model_name) {
                             console.log(`Main Manager: Model ${model_name} removed from priority ${model.priority} due to exceeding retry limits.`);
                             return false; // Remove from list
                        }
                        return true; // Keep others
                    });
  
                    if (initial_length === this.models.length) {
                         console.warn(`Warning: Main Manager tried to remove ${model_name} on failure, but it wasn't found in current priority list (maybe already removed or priority changed).`);
                    }
  
                    // Check if current priority is now empty (no need to explicitly load next here, get_model handles it)
                    if (this.models.length === 0 && !this.terminate_flag) { // Added terminate flag check
                        const currentPrio = this.get_current_priority_value();
                        if (currentPrio !== null) {
                           console.log(`Main Manager: All models from priority ${currentPrio} exhausted or removed. Will load next on next get_model().`);
                        }
                        // Let get_model handle loading next time
                    }
                });
           }
      }
  
      // --- Split Task Permission Handling ---
  
      // Called by split task worker to check/acquire global lock via MAIN manager
      async can_split_task_use_model(model_name_to_check, sub_manager_priority_value) {
           if (!this.main_manager_ref) {
                console.error("ERROR: Main manager reference not set in can_split_task_use_model.");
                return false;
           }
  
           // Check state using the MAIN manager's locks and data
           let main_model_info = null;
           let main_current_priority_value = null;
           let permission_granted = false;
  
           // 1. Check main manager's instance state (priority, model presence)
           await this.main_manager_ref.lock.withLock(() => {
               main_model_info = this.main_manager_ref.models.find(model => model.name === model_name_to_check);
               main_current_priority_value = this.main_manager_ref.get_current_priority_value();
               // console.debug(`Split Check: Model=${model_name_to_check}, SubPrio=${sub_manager_priority_value}, MainPrio=${main_current_priority_value}, FoundInMain=${!!main_model_info}`);
           });
  
           // 2. Perform Priority Check (Rule ①)
           let priority_check_passed = false;
           if (main_model_info) {
                // Model FOUND in main manager's current list -> Priority check implicitly passes
                priority_check_passed = true;
           } else {
                // Model NOT FOUND in main manager's current list
                if (main_current_priority_value === null || sub_manager_priority_value === null) {
                     console.log(`Split Check Denied: Cannot compare priorities (None) for ${model_name_to_check}.`);
                     priority_check_passed = false; // Cannot proceed
                } else if (sub_manager_priority_value < main_current_priority_value) {
                      console.log(`Split Check Info: Priority check passed for ${model_name_to_check} (SubPrio ${sub_manager_priority_value} < MainPrio ${main_current_priority_value}). Checking global concurrency...`);
                      priority_check_passed = true;
                } else {
                     console.log(`Split Check Denied: Priority condition unmet for ${model_name_to_check} (SubPrio ${sub_manager_priority_value} >= MainPrio ${main_current_priority_value}, not in main list).`);
                     priority_check_passed = false;
                }
           }
  
           // 3. If priority check passed, check and ACQUIRE global concurrency
           if (priority_check_passed) {
               await this.main_manager_ref._global_lock.withLock(() => {
                   const usage = this.main_manager_ref._global_model_usage[model_name_to_check];
                   if (usage && usage.current < usage.max) {
                       // Concurrency available! Acquire slot.
                       usage.current++;
                       console.log(`Split Task Acquired: ${model_name_to_check} (Global Usage: ${usage.current}/${usage.max})`);
                       permission_granted = true; // GRANTED
                   } else {
                       if (usage) {
                            console.log(`Split Check Denied: Global concurrency full for ${model_name_to_check} (${usage.current}/${usage.max}).`);
                       } else {
                            console.log(`Split Check Denied: Model ${model_name_to_check} not found in global usage tracker.`);
                       }
                       permission_granted = false; // DENIED
                   }
               });
           }
  
           return permission_granted;
      }
  
      // Called by split task worker to release global lock via MAIN manager
      async release_split_task_model(model_name_released) {
          if (!this.main_manager_ref) return;
  
          await this.main_manager_ref._global_lock.withLock(() => {
               const usage = this.main_manager_ref._global_model_usage[model_name_released];
               if (usage) {
                    if (usage.current > 0) {
                        usage.current--;
                        console.log(`Split Task Released: ${model_name_released} (Global Usage: ${usage.current}/${usage.max})`);
                    } else {
                         console.warn(`WARN: Split task attempted to release ${model_name_released} globally, but usage was already 0.`);
                    }
               } // Else: Model not tracked? Should not happen.
          });
      }
  
  
      // --- Sub-Manager State Modification ---
  
      // Called by Sub-Manager usually (e.g., when denied by Rule ①)
      async remove_current_priority_models(reason = "") {
          await this.lock.withLock(async () => { // Lock instance state
              const current_priority = this.get_current_priority_value(); // Read within lock okay
              if (current_priority !== null) {
                  const prefix = this.is_sub_manager ? "Sub-Manager" : "Main Manager";
                  console.log(`${prefix}: Removing all models for its priority ${current_priority}. Reason: ${reason}`);
                  this.models = []; // Clear the list
  
                  // Immediately try to load the next priority for this instance
                  console.log(`${prefix}: Attempting to load its next priority...`);
                  this.current_priority_index++;
                  await this.load_models_by_highest_priority(); // Will update instance terminate_flag if needed
              } else {
                   const prefix = this.is_sub_manager ? "Sub-Manager" : "Main Manager";
                   console.log(`${prefix}: Cannot remove models, no valid current priority.`);
              }
          });
      }
  
      // Creates a copy for a split-off task (must be async due to initialize)
      async copy(main_manager_instance) {
        let new_manager = null;
        await this.lock.withLock(async () => { // Ensure consistent state during copy
              console.debug(`DEBUG: Copying ModelManager state (current priority index: ${this.current_priority_index}) for sub-task`);
              // Create new instance, pass reference to main manager
              new_manager = new ModelManager(
                  this.config, // Reference same config
                  this.kind,
                  1, // total_tasks = 1 for sub-manager context
                  main_manager_instance, // Pass the main manager reference
                  true // is_sub_manager = true
              );
  
              // Copy priority list if initialized (Deep copy needed?)
              // Primitives and array of primitives -> shallow is fine, but deep is safer if objects were stored
               new_manager.all_priorities = this.all_priorities ? [...this.all_priorities] : null;
  
              // Deep copy the current list of model definitions (simple objects -> spread/map is ok)
              new_manager.models = this.models.map(m => ({ ...m }));
  
              // Copy the current priority index
              new_manager.current_priority_index = this.current_priority_index;
  
              // Sub-manager starts active unless original is already terminated
              new_manager.terminate_flag = this.terminate_flag;
  
              // Initialize the new sub-manager (loads its initial model list)
              // Crucially, this uses the copied state (priority_index)
               await new_manager.initialize(); // Must await async init
  
              console.debug(`DEBUG: Copied Sub-Manager created. Models: ${new_manager.models.map(m => m.name)}, Priority Index: ${new_manager.current_priority_index}, Terminated: ${new_manager.terminate_flag}`);
          });
          return new_manager; // Return the initialized sub-manager
      }
  
  } // End ModelManager Class
  
  
  // --- Parameter and File Handling ---
  
  function getParamsJS(config, model) {
      const model_config = config?.AI_draw?.configs?.[model];
      if (!model_config) {
          console.error(`Error: Configuration for model '${model}' not found.`);
          // Return default/empty values structure matching Python
          return ["", "GET", {}, "", "", "", "", "", "", false, "", "GET", {}, "", "", "", "", "", "", 30, 15];
      }
  
      const url1 = model_config.request_url || "";
      const method1 = model_config.request_method || "GET";
      const headers1 = parseHeaders(model_config.headers || []); // Use helper
      const body1 = model_config.request_body || ""; // Keep as string/object as defined in config
      const path1 = model_config.json_path || "";
      const success1 = model_config.success_condition || "";
      const fail1 = model_config.fail_condition || "";
      const forbid1 = model_config.forbid_condition || "";
      const userdefine1 = model_config.userdefine || "";
  
      const second_request = model_config.second_request || false;
      const url2 = model_config.second_request_url || "";
      const method2 = model_config.second_request_method || "GET";
      const headers2 = parseHeaders(model_config.second_headers || []); // Use helper
      const body2 = model_config.second_request_body || ""; // Keep as string/object
      const path2 = model_config.second_json_path || "";
      const success2 = model_config.second_success_condition || "";
      const fail2 = model_config.second_fail_condition || "";
      const forbid2 = model_config.second_forbid_condition || "";
      const userdefine2 = model_config.second_userdefine || "";
  
      // Default timeouts
      let request_timeout = 30000; // Use ms for JS
      try {
          const rt = model_config.request_timeout;
          if (rt && String(rt).trim()) {
              const parsedRt = parseInt(String(rt).trim(), 10);
              if (!isNaN(parsedRt)) request_timeout = parsedRt * 1000;
          }
      } catch { /* ignore */ }
  
      let second_request_timeout = 15000; // Use ms
      try {
          const srt = model_config.second_request_timeout;
          if (srt && String(srt).trim()) {
              const parsedSrt = parseInt(String(srt).trim(), 10);
              if (!isNaN(parsedSrt)) second_request_timeout = parsedSrt * 1000;
          }
      } catch { /* ignore */ }
  
      return [
          url1, method1, headers1, body1, path1, success1, fail1, forbid1, userdefine1,
          second_request, url2, method2, headers2, body2, path2, success2, fail2, forbid2, userdefine2,
          request_timeout, second_request_timeout
      ];
  }
  
  /**
   * Writes content (Blob, ArrayBuffer, string, object) to IndexedDB file.
   * Automatically stringifies objects.
   * @param {string} path Full path like /data/title/path/to/file.png
   * @param {any} content Data to write
   * @returns {Promise<boolean>} Success status
   */
  async function writeFileJS(path, content) {
      try {
          let dataToWrite = content;
          // IndexedDB can store Blobs, ArrayBuffers, strings, objects directly.
          // If it's an object that isn't Blob/ArrayBuffer, maybe stringify?
          // Let's keep it simple and assume the content is already in a suitable format
          // (e.g., Uint8Array from b64decode, Blob from fetch, string from user).
          // The IndexedDBFileSystem likely handles basic types. If storing complex objects,
          // stringify might be needed depending on its implementation. Let's assume it handles it.
  
          // Check if content is Uint8Array and convert to Blob for wider compatibility
          if (content instanceof Uint8Array) {
               dataToWrite = new Blob([content]); // No MIME type specified - maybe needed?
               console.debug("Converted Uint8Array to Blob for writing.");
          }
  
  
          await idbFs.writeFile(path, dataToWrite);
          return true;
      } catch (error) {
          console.error(`Error writing file ${path}:`, error);
          return false;
      }
  }
  
  /**
   * Downloads content from a URL and saves it to IndexedDB.
   * @param {string} path Full path like /data/title/path/to/file.png
   * @param {string} url URL to download from
   * @returns {Promise<boolean>} Success status
   */
  async function getFileJS(path, url) {
      try {
          const response = await fetch(url, { method: 'GET' }); // Add timeout? CORS?
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          const blob = await response.blob(); // Get content as Blob
          return await writeFileJS(path, blob); // Write Blob to IndexedDB
      } catch (error) {
          console.error(`Error downloading file from ${url} to ${path}:`, error);
          return false;
      }
  }
  
  
  // --- Core Generation Logic ---
  
// ImageGenerationService.js

/**
 * Generates an image using the specified model and prompt.
 * @param {object} config The application config.
 * @param {string} imagesDir Path to the image directory in IndexedDB.
 * @param {string} prompt The generation prompt.
 * @param {string} imageName Base name for the output image.
 * @param {string} model Model name from config.
 * @returns {Promise<'success' | 'error' | 'forbid'>} Status of the generation.
 */
export async function generateJS(config, imagesDir, prompt, imageName, model) {
    const randomseed = String(randint(1, 100000000));
    const params = getParamsJS(config, model);
    if (!params[0]) return "error"; // URL1 check

    const [
        url1_tpl, method1, headers1, body1_tpl, path1, success1, fail1, forbid1, userdefine1,
        second_request, url2_tpl, method2, headers2, body2_tpl, path2, success2, fail2, forbid2, userdefine2,
        request_timeout, second_request_timeout
    ] = params;

    const filePath = `${imagesDir}/${imageName}.png`;

    // Prepare request 1 payload (same as before)
    const prompt_placeholder = "{prompt}";
    const random_placeholder = "{random}";
    const result_placeholder ="{result}";
    const url1 = url1_tpl.replace(prompt_placeholder, encodeURIComponent(prompt)).replace(random_placeholder, randomseed);
    let body1_processed;
    let finalHeaders1 = { ...headers1 };
    // ... (body processing logic remains the same as before) ...
    if (typeof body1_tpl === 'string') {
        body1_processed = body1_tpl.replace(prompt_placeholder, prompt).replace(random_placeholder, randomseed);
    } else if (typeof body1_tpl === 'object' && body1_tpl !== null) {
        const replaceInObject = (obj) => { /* ... recursive replace ... */
            const newObj = {};
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                     newObj[key] = obj[key].replace(prompt_placeholder, prompt).replace(random_placeholder, randomseed);
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                     newObj[key] = replaceInObject(obj[key]); // Recurse
                } else {
                     newObj[key] = obj[key]; // Copy other types
                }
            }
            return newObj;
        };
        body1_processed = replaceInObject(body1_tpl);
        if (headers1['Content-Type']?.toLowerCase().includes('application/json')) {
             body1_processed = JSON.stringify(body1_processed);
        } else {
             console.warn("Handling non-JSON object body - ensure config format is correct.");
             body1_processed = JSON.stringify(body1_processed) // Fallback to string replace if needed
                 .replace(prompt_placeholder, prompt)
                 .replace(random_placeholder, randomseed);
        }
    } else {
         body1_processed = "";
    }


    // --- First request ---
    let response = null;
    let responseStatus = null;
    let responseText = '';
    let responseBlob = null; // To store blob if read
    let result1 = null; // Parsed JSON
    const abortController1 = new AbortController();
    const timeoutId1 = setTimeout(() => abortController1.abort(), request_timeout);

    try {
        console.debug(`DEBUG: Request 1 for ${imageName} (${model}) - ${method1} ${url1}`);
        response = await fetch(url1, {
            method: method1,
            headers: finalHeaders1,
            body: (method1 === 'POST' || method1 === 'PUT' || method1 === 'PATCH') ? body1_processed : undefined,
            signal: abortController1.signal,
        });
        clearTimeout(timeoutId1);
        responseStatus = response.status; // Store status code

        // --- Read Body Content ONCE ---
        // Prioritize reading as text, then try parsing JSON from text.
        // Read blob only if explicitly needed later.
        try {
            // Use clone to read text, preserving original response for potential blob read
            responseText = await response.clone().text();
        } catch (textErr) {
            console.warn("Could not read response 1 body as text:", textErr);
            // responseText remains ''
            // If text fails, JSON/Blob likely will too, but try JSON parsing anyway if response seems ok
        }

        // Try parsing JSON *from the text*
        if (responseText) {
             try {
                 result1 = JSON.parse(responseText);
             } catch (jsonErr) {
                 console.debug("Response 1 text is not valid JSON.");
                 result1 = null;
             }
        }

        // --- Check Response Status and Conditions ---
        if (!response.ok) {
             console.error(`Req1 HTTP Error: ${responseStatus} ${response.statusText}`);
             // Evaluate conditions using potentially available parsed data (result1)
             const fail1_met = evaluateConditionSafe(fail1, { status: responseStatus }, result1); // Pass status obj
             if (fail1_met === true) { console.log(`Req1 FailCond met after HTTP error: ${fail1}`); return "error"; }
             const forbid1_met = evaluateConditionSafe(forbid1, { status: responseStatus }, result1);
             if (forbid1 && forbid1_met === true) { console.log("Req1 ForbidCond met after HTTP error."); return "forbid"; }
             return "error"; // Generic error if not OK and no specific condition met
        }

        // --- Process Successful Response ---
        const fail1_met = evaluateConditionSafe(fail1, { status: responseStatus }, result1);
        if (fail1_met === true) { console.log(`Req1 FailCond met: ${fail1}`); return "error"; }
        const forbid1_met = evaluateConditionSafe(forbid1, { status: responseStatus }, result1);
        if (forbid1 && forbid1_met === true) { console.log("Req1 ForbidCond met."); return "forbid"; }

        // Extract intermediate result using path1
        let intermediate_result = null;
        let needBlob = false; // Flag if blob needs to be read from original response
        if (path1) {
             if(path1.toLowerCase() === 'response.text' || path1.toLowerCase() === 'text') {
                 intermediate_result = responseText;
             } else if (path1.toLowerCase() === 'response.content' || path1.toLowerCase() === 'content') {
                 needBlob = true; // Mark that we need the blob
                 // We will read the blob below, just before calling userdefine if needed
             } else {
                 intermediate_result = safeGetPath(result1, path1);
             }
        }

        // Determine if userdefine needs the blob
        const userdefineNeedsBlob = userdefine1 && userdefine1.includes('(content)'); // Simple check

        // Read blob IF needed by path1 OR userdefine1, and hasn't been read yet
        if ((needBlob || userdefineNeedsBlob) && response && response.bodyUsed === false) {
             try {
                  console.debug("Reading response 1 body as blob...");
                  responseBlob = await response.blob(); // Consume the ORIGINAL response stream
                  if (needBlob) { // If path1 specifically requested content
                       intermediate_result = responseBlob;
                  }
             } catch (blobError) {
                  console.error("Could not read response 1 as blob:", blobError);
                  // If blob read fails, cannot satisfy 'content' requirement
                  if (needBlob || userdefineNeedsBlob) return "error";
                  responseBlob = null; // Ensure it's null
             }
        } else if ((needBlob || userdefineNeedsBlob) && response && response.bodyUsed === true) {
             console.warn("Cannot read response 1 as blob: body already used (likely by prior .text() or failed clone?)");
              if (needBlob || userdefineNeedsBlob) return "error"; // Cannot satisfy if body used
        }


        // --- Process First Userdefine ---
        let userdefine_processed_output = null;
        if (userdefine1 && userdefine1.trim()) {
            console.debug(`Processing userdefine1: ${userdefine1}`);
            // Pass pre-read data instead of the raw response object
             userdefine_processed_output = await processUserdefine(
                userdefine1,
                responseStatus, // Pass status
                responseText,   // Pass text
                responseBlob,   // Pass blob (might be null)
                result1,
                intermediate_result
            );

            if (userdefine_processed_output === "error") {
                console.error(`Error processing userdefine1 '${userdefine1}'. Task failed.`);
                return "error";
            }

            if (!second_request) {
                // Save output directly (logic mostly same as before)
                console.debug("Saving output from userdefine1 (no second request).");
                 if (userdefine_processed_output instanceof Uint8Array || userdefine_processed_output instanceof Blob) {
                     if (await writeFileJS(filePath, userdefine_processed_output)) return "success";
                     else { console.error("Write userdefine1 blob output error"); return "error"; }
                 } else if (typeof userdefine_processed_output === 'string' || typeof userdefine_processed_output === 'object'){
                     if (await writeFileJS(filePath, userdefine_processed_output)) return "success";
                     else { console.error("Write userdefine1 string/object output error"); return "error"; }
                 } else {
                    console.error("Error: userdefine1 output was not Blob/Uint8Array/String/Object."); return "error";
                 }
            } else {
                console.debug("Using userdefine1 output as intermediate result for request 2.");
                intermediate_result = userdefine_processed_output;
            }
        }

        // --- Handle case with NO second request (and userdefine didn't handle output) ---
        else if (!second_request) {
             // Evaluate success condition 1 only if it exists
            if (success1) {
                 const success1_met = evaluateConditionSafe(success1, { status: responseStatus }, result1);
                 if (success1_met !== true) {
                     console.log(`Req1 SuccCond Fail or non-true: ${success1}. Evaluation: ${success1_met}`); return "error";
                 }
            }
            // If success condition doesn't exist or passed, check intermediate_result

            if (intermediate_result === null || intermediate_result === undefined) {
                console.error(`Error: Path1 '${path1}' failed or result is null/undefined. Cannot get image data/URL.`); return "error";
            }
            // Check if intermediate result is a downloadable URL or binary data
            if (typeof intermediate_result === 'string' && (intermediate_result.startsWith('http://') || intermediate_result.startsWith('https://'))) {
                if (await getFileJS(filePath, intermediate_result)) return "success";
                else { console.error("Download fail (Req1)"); return "error"; }
            }
            else if (intermediate_result instanceof Blob || intermediate_result instanceof ArrayBuffer || intermediate_result instanceof Uint8Array) {
                 if (await writeFileJS(filePath, intermediate_result)) return "success";
                 else { console.error("Write intermediate data error (Req1)"); return "error"; }
            }
             else {
                console.error(`Error: Path1 '${path1}' result is not a valid URL or binary data. Result:`, intermediate_result); return "error";
            }
        }

        // --- Prepare for second request (if second_request is True) ---
        if (second_request && (intermediate_result === null || intermediate_result === undefined)) {
            console.error(`Error evaluating intermediate path '${path1}' or userdefine1 result for Request 2.`); return "error";
        }

        const intermediate_result_str = String(intermediate_result ?? "");
        const url2 = url2_tpl.replace(result_placeholder, encodeURIComponent(intermediate_result_str));
        let body2_processed;
        let finalHeaders2 = { ...headers2 };
        // ... (body2 processing logic remains the same) ...
        if (typeof body2_tpl === 'string') {
            body2_processed = body2_tpl.replace(result_placeholder, intermediate_result_str);
        } else if (typeof body2_tpl === 'object' && body2_tpl !== null) {
            const replaceInObject = (obj) => { /* ... recursive replace ... */
                const newObj = {};
                for (const key in obj) {
                    if (typeof obj[key] === 'string') {
                         newObj[key] = obj[key].replace(result_placeholder, intermediate_result_str);
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                         newObj[key] = replaceInObject(obj[key]);
                    } else {
                         newObj[key] = obj[key];
                    }
                }
                return newObj;
            };
            body2_processed = replaceInObject(body2_tpl);
            if (headers2['Content-Type']?.toLowerCase().includes('application/json')) {
                body2_processed = JSON.stringify(body2_processed);
            } else {
                console.warn("Handling non-JSON object body for Req2 - ensure config format.");
                body2_processed = JSON.stringify(body2_processed); // Fallback
            }
        } else {
             body2_processed = "";
        }


        // --- Second request loop ---
        const max_poll_attempts = 60;
        const poll_interval = 1000;

        for (let attempt = 0; attempt < max_poll_attempts; attempt++) {
            let response2 = null;
            let responseStatus2 = null;
            let responseText2 = '';
            let responseBlob2 = null; // For second response
            let result2 = null;
            const abortController2 = new AbortController();
            const timeoutId2 = setTimeout(() => abortController2.abort(), second_request_timeout);

            try {
                // console.debug(`DEBUG: Request 2 for ${imageName}, attempt ${attempt + 1} - ${method2} ${url2}`);
                response2 = await fetch(url2, { /* ... fetch options ... */
                    method: method2,
                    headers: finalHeaders2,
                    body: (method2 === 'POST' || method2 === 'PUT' || method2 === 'PATCH') ? body2_processed : undefined,
                    signal: abortController2.signal,
                });
                 clearTimeout(timeoutId2);
                 responseStatus2 = response2.status;

                 // --- Read Body Content ONCE for Request 2 ---
                 try {
                      responseText2 = await response2.clone().text();
                 } catch (textErr) {
                      console.warn("Could not read response 2 body as text:", textErr);
                 }
                 if (responseText2) {
                      try {
                          result2 = JSON.parse(responseText2);
                      } catch (jsonErr) {
                          result2 = null;
                      }
                 }
                 // --- End Body Read ---


                if (!response2.ok) {
                     console.error(`Req2 HTTP Error: ${responseStatus2} ${response2.statusText}`);
                     const fail2_met = evaluateConditionSafe(fail2, { status: responseStatus2 }, result2);
                     if (fail2_met === true) { console.log(`Req2 FailCond met after HTTP error: ${fail2}`); return "error"; }
                     const forbid2_met = evaluateConditionSafe(forbid2, { status: responseStatus2 }, result2);
                     if (forbid2 && forbid2_met === true) { console.log("Req2 ForbidCond met after HTTP error."); return "forbid"; }
                     if (attempt === max_poll_attempts - 1) return "error";
                     await sleep(poll_interval);
                     continue;
                }

                // --- Process successful response 2 ---
                const fail2_met = evaluateConditionSafe(fail2, { status: responseStatus2 }, result2);
                if (fail2_met === true) { console.log(`Req2 FailCond met: ${fail2}`); return "error"; }
                const forbid2_met = evaluateConditionSafe(forbid2, { status: responseStatus2 }, result2);
                if (forbid2 && forbid2_met === true) { console.log("Req2 ForbidCond met."); return "forbid"; }

                // Extract final result using path2
                let final_extracted_result = null;
                let needBlob2 = false;
                if (path2) {
                     if(path2.toLowerCase() === 'response.text' || path2.toLowerCase() === 'text') {
                         final_extracted_result = responseText2;
                     } else if (path2.toLowerCase() === 'response.content' || path2.toLowerCase() === 'content') {
                         needBlob2 = true;
                     } else {
                         final_extracted_result = safeGetPath(result2, path2);
                     }
                }

                const userdefineNeedsBlob2 = userdefine2 && userdefine2.includes('(content)');

                // Read blob for request 2 if needed and not already used
                 if ((needBlob2 || userdefineNeedsBlob2) && response2 && !response2.bodyUsed) {
                      try {
                           console.debug("Reading response 2 body as blob...");
                           responseBlob2 = await response2.blob(); // Consume original req2 stream
                           if (needBlob2) final_extracted_result = responseBlob2;
                      } catch (blobError) {
                           console.error("Could not read response 2 as blob:", blobError);
                           if (needBlob2 || userdefineNeedsBlob2) return "error";
                           responseBlob2 = null;
                      }
                 } else if ((needBlob2 || userdefineNeedsBlob2) && response2 && response2.bodyUsed) {
                     console.warn("Cannot read response 2 as blob: body already used.");
                     if (needBlob2 || userdefineNeedsBlob2) return "error";
                 }

                // --- Process Second Userdefine ---
                if (userdefine2 && userdefine2.trim()) {
                    console.debug(`Processing second_userdefine: ${userdefine2}`);
                    const second_userdefine_processed_output = await processUserdefine(
                        userdefine2,
                        responseStatus2,
                        responseText2,
                        responseBlob2, // Pass potentially read blob
                        result2,
                        final_extracted_result // Pass path2 result
                    );

                    if (second_userdefine_processed_output === "error") {
                        console.error(`Error processing second_userdefine '${userdefine2}'. Task failed.`); return "error";
                    }
                    // Save output directly
                    console.debug("Saving output from second_userdefine.");
                    if (second_userdefine_processed_output instanceof Uint8Array || second_userdefine_processed_output instanceof Blob) {
                        if (await writeFileJS(filePath, second_userdefine_processed_output)) return "success";
                        else { console.error("Write second_userdefine blob output err"); return "error"; }
                    } else if (typeof second_userdefine_processed_output === 'string' || typeof second_userdefine_processed_output === 'object'){
                        if (await writeFileJS(filePath, second_userdefine_processed_output)) return "success";
                        else { console.error("Write second_userdefine string/object output err"); return "error"; }
                    } else {
                        console.error("Error: second_userdefine output was not Blob/Uint8Array/String/Object."); return "error";
                    }
                }

                // Check success condition 2 (if no second userdefine ran)
                else if (success2) {
                     const success2_met = evaluateConditionSafe(success2, { status: responseStatus2 }, result2);
                     if (success2_met === true) {
                         if (final_extracted_result === null || final_extracted_result === undefined) {
                             console.error(`Error: Path2 '${path2}' failed or result is null/undefined after success condition met.`); return "error";
                         }
                         // Save/download final_extracted_result
                         if (typeof final_extracted_result === 'string' && (final_extracted_result.startsWith('http://') || final_extracted_result.startsWith('https://'))) {
                             if (await getFileJS(filePath, final_extracted_result)) return "success";
                             else { console.error("Download fail (Req2)"); return "error"; }
                         }
                         else if (final_extracted_result instanceof Blob || final_extracted_result instanceof ArrayBuffer || final_extracted_result instanceof Uint8Array) {
                              if (await writeFileJS(filePath, final_extracted_result)) return "success";
                              else { console.error("Write intermediate data error (Req2)"); return "error"; }
                         }
                         else {
                             console.error(`Error: Path2 '${path2}' result is not a valid URL or binary data after success condition. Result:`, final_extracted_result); return "error";
                         }
                     } else {
                          console.debug(`Req2 SuccessCond not met or false (${success2_met}), continuing poll attempt ${attempt + 1}...`);
                     }
                } else {
                     console.debug(`Req2 No success condition, continuing poll attempt ${attempt + 1}...`);
                }

                // If not returned success/error yet, wait and continue polling
                await sleep(poll_interval);

            } catch (error) {
                 clearTimeout(timeoutId2);
                if (error.name === 'AbortError') {
                    console.warn(`Req2 timed out on attempt ${attempt + 1}.`);
                    if (attempt === max_poll_attempts - 1) { console.error("Req2 timed out on final attempt."); return "error"; }
                } else {
                    console.error(`Req2 Error on attempt ${attempt + 1}:`, error); return "error";
                }
                 await sleep(poll_interval);
                 continue;
            }
        } // End poll loop

        console.error(`Error: Req2 polling failed after ${max_poll_attempts} attempts.`); return "error";

    } catch (error) {
        // Catch errors from the first request block
        clearTimeout(timeoutId1);
        if (error.name === 'AbortError') { console.error("Req1 timed out."); }
        else { console.error("Req1 Unexpected Error:", error); }
        return "error";
    }
}
  
  
  // --- Post-Processing --- (Rembg replacement - assume handled by API or skip)
  
  // NOTE: Rembg cannot be run locally from the browser via an external tool.
  // This functionality needs to be provided by an API endpoint accessible via fetch,
  // or potentially a WASM build of rembg if available and feasible.
  // For this translation, we'll simulate the 'pass'/'error' logic based on config,
  // but the actual image processing part is omitted or assumed to be done server-side if needed.
  
  async function rembgJS(config, imagesDir, imageName, kind, modelName) {
    // 1. 前置检查 (Kind, Config, File Exists) - 与之前相同
    if (kind !== 'character') {
        return "pass";
    }

    const storyTitle = config?.剧情?.story_title;
    const imageReadUrl = `/read/${encodeURIComponent(storyTitle)}/images/${encodeURIComponent(imageName)}.png`;
    const finalFilePath = `${imagesDir}/${imageName}.png`;

    try {
        const metadata = await idbFs.getMetadata(finalFilePath);
        if (!metadata.exists || metadata.isFolder) {
            console.error(`Error: Cannot rembg ${imageName}, source file not found or is directory at ${finalFilePath}.`);
            return "error";
        }
    } catch (e) {
        console.error(`Error checking metadata for rembg target ${finalFilePath}:`, e);
        return "error";
    }

    const processing_config = config?.AI_draw?.processing_config || {};
    const generation_model_config = config?.AI_draw?.configs?.[modelName] || {};
    let rembg_enabled = generation_model_config.use_rembg ?? processing_config.use_rembg ?? false;

    if (!rembg_enabled) {
        return "pass";
    }

    const rembg_model_name = processing_config.rembg_model || "isnet-anime";
    const rembg_model_path = `/rembg-model/${rembg_model_name}.onnx`;
    const rembg_resolution = processing_config.rembg_resolution || 1024;
    const rembg_debug = processing_config.rembg_debug || false;
    const rembg_timeout = (processing_config.rembg_timeout || 60) * 1000; // 60s timeout

    // 2. 创建和管理 Web Worker
    return new Promise((resolve, reject) => {
        // 重要：这里的路径相对于 HTML 文件或基于你的打包器配置
        // 对于 Vite，可以使用 `new Worker(new URL('./rembg.worker.js', import.meta.url), { type: 'module' })`
        const worker = new Worker(new URL('./rembg.worker.js', import.meta.url), { type: 'module' });
        let timeoutId = null;
        const uniqueJobId = Date.now() + Math.random(); // Simple unique ID for logging

        console.debug(`[Main] Creating worker for rembg job ${uniqueJobId} (${imageName})`);

        // 设置超时处理
        timeoutId = setTimeout(() => {
            console.error(`[Main] Rembg job ${uniqueJobId} (${imageName}) timed out after ${rembg_timeout / 1000}s. Terminating worker.`);
            worker.terminate(); // 强制终止 Worker
            reject(new Error('Rembg operation timed out')); // 或者 resolve('error') 根据你的错误处理策略
        }, rembg_timeout);

        // 监听来自 Worker 的消息
        worker.onmessage = async (event) => {
            const data = event.data;

             // 只处理与此任务相关的消息（如果 worker 被复用，则需要）
             if (data.id !== uniqueJobId) return;

            // Worker 可能先发送 'ready' 消息，可以忽略
            if (data.status === 'ready') {
                console.debug(`[Main] Worker for job ${uniqueJobId} reported ready.`);
                return;
            }

            // 清除超时计时器，因为收到了响应
            clearTimeout(timeoutId);

            if (data.status === 'success' && data.blob) {
                console.log(`[Main] Rembg job ${uniqueJobId} (${imageName}) successful. Writing result.`);
                try {
                    // 在主线程中写回 IndexedDB
                    if (await writeFileJS(finalFilePath, data.blob)) {
                        console.log(`[Main] Successfully wrote rembg result for ${imageName}.`);
                        resolve('success');
                    } else {
                        console.error(`[Main] Failed to write rembg result for ${imageName} back to IndexedDB.`);
                        resolve('error'); // 写入失败
                    }
                } catch (writeError) {
                    console.error(`[Main] Error writing rembg result for ${imageName}:`, writeError);
                    resolve('error');
                } finally {
                     worker.terminate(); // 任务完成，终止 worker
                }
            } else if (data.status === 'error') {
                console.error(`[Main] Rembg job ${uniqueJobId} (${imageName}) failed in worker:`, data.error?.message || 'Unknown worker error');
                resolve('error');
                 worker.terminate(); // 任务失败，终止 worker
            } else {
                 console.warn(`[Main] Received unknown message status from worker for job ${uniqueJobId}:`, data);
                 resolve('error'); // 未知状态视为错误
                 worker.terminate();
            }
        };

        // 监听 Worker 的错误事件 (捕获 Worker 内部未处理的异常)
        worker.onerror = (error) => {
            clearTimeout(timeoutId);
            console.error(`[Main] Error in rembg worker for job ${uniqueJobId} (${imageName}):`, error.message, error);
            // 防止 resolve/reject 被调用两次
            // 如果 onmessage 还没处理就发生了 error，则 reject
            reject(new Error(`Worker error: ${error.message}`)); // 或者 resolve('error')
             worker.terminate(); // 发生错误，终止 worker
        };

        // 3. 向 Worker 发送任务数据
        const options = {
            debug: rembg_debug,
            model: rembg_model_path,
            resolution: rembg_resolution,
            // 其他 modern-rembg 选项...
        };
        console.debug(`[Main] Sending job ${uniqueJobId} to worker for ${imageName}`);
        worker.postMessage({
            id: uniqueJobId,
            imageReadUrl: imageReadUrl,
            options: options,
            timeout: rembg_timeout // 让 worker 也知道超时时间（可选）
        });
    });
}
  
  
  // --- Image Quality/Resizing --- (Using ImageProcessor.js)
  
  async function checkImageSizeJS(config, imagesDir, imageName, kind) {
      const filePath = `${imagesDir}/${imageName}.png`;
      let imageFile = null;
      try {
           imageFile = await idbFs.readFile(filePath); // Reads Blob/File
           if (!imageFile || !(imageFile instanceof Blob)) {
               console.warn(`Quality check skipped: Could not read valid image data for ${imageName} from ${filePath}`);
               return false; // Cannot check non-existent/invalid file
           }
      } catch (e) {
          console.warn(`Quality check skipped: Error reading ${filePath}:`, e);
          return false;
      }
  
      const judgingConfig = config?.AI_draw?.judging_config || {};
      if (!judgingConfig[`${kind}_quality_judgment`]) {
          // console.debug(`Quality check skipped for ${imageName} (${kind}) - disabled in config.`);
          return true; // Skip check if disabled for kind
      }
  
      console.debug(`Performing quality judgment for ${imageName} (${kind})...`);
      const method = judgingConfig.selected_method || "a"; // default 'a'
      const methodsConfig = judgingConfig.methods || {};
      const methodParams = methodsConfig[method] || {};
      const thresholdStr = methodParams[`${kind}_quality_threshold`] || "10"; // Default threshold
      const judgmentTimeout = (judgingConfig.judgment_timeout || 60) * 1000; // Timeout in ms
  
      let threshold = 10.0;
      try {
          const parsedThreshold = parseFloat(thresholdStr);
          if (!isNaN(parsedThreshold)) {
              threshold = parsedThreshold;
          } else {
              console.warn(`Invalid quality threshold '${thresholdStr}' for ${kind}, using default 10.`);
          }
      } catch { /* ignore */ }
  
      // Determine the check function from ImageProcessor based on 'method'
      let checkFunction;
      switch (method) {
          case 'a': checkFunction = ImageProcessor.method_a; break;
          case 'b': checkFunction = ImageProcessor.method_b; break;
          case 'c': checkFunction = ImageProcessor.method_c; break;
          default:
              console.error(`Error: Unknown quality judgment method '${method}'. Skipping check.`);
              return true; // Skip if method unknown
      }
  
      try {
          // Implement timeout for the async ImageProcessor call
          const resultPromise = checkFunction(imageFile, 'a', 'a', 'a'); // Pass data and dummy args as per spec
          const timeoutPromise = new Promise((_, reject) =>
               setTimeout(() => reject(new Error(`Quality judgment timed out after ${judgmentTimeout / 1000}s`)), judgmentTimeout)
          );
  
          // Race the processor against the timeout
          const score = await Promise.race([resultPromise, timeoutPromise]);
  
          if (typeof score !== 'number' || isNaN(score)) {
              console.error(`Error: Quality judgment for ${imageName} returned non-numeric score: ${score}`);
              return false; // Treat invalid score as failure
          }
  
          console.debug(`Quality score for ${imageName} (${kind}, method ${method}): ${score}`);
  
          if (score < threshold) {
              console.log(`Quality Check Failed: ${imageName} (${kind}) score ${score} is below threshold ${threshold}.`);
              // Optionally delete low-quality file (be careful with async operations)
              // await idbFs.deletePath(filePath).catch(e => console.warn(`Failed to delete low-quality file ${filePath}`, e));
              return false;
          } else {
              console.debug(`Quality check passed for ${imageName}.`);
              return true;
          }
      } catch (error) {
           console.error(`Error during quality judgment for ${imageName}:`, error);
           return false; // Treat errors/timeouts as failure
      }
  }
  
  async function resizeImageStrategyJS(config, imagesDir, imageName, kind) {
      const processingConf = config?.AI_draw?.processing_config || {};
      const resizeStrategy = processingConf[`${kind}_resize`]; // e.g., "裁剪", "填充", "拉伸"
      const targetResolution = processingConf[`${kind}_resolution`]; // e.g., true/false or specific dims? Assume true means use defaults.
  
      if (!targetResolution || !resizeStrategy) {
          // console.debug(`Resize skipped for ${imageName} (${kind}): Not enabled or strategy missing.`);
          return true; // Not configured, skip.
      }
  
      const filePath = `${imagesDir}/${imageName}.png`;
      let imageFile = null;
      try {
           imageFile = await idbFs.readFile(filePath); // Reads Blob/File
           if (!imageFile || !(imageFile instanceof Blob)) {
               console.warn(`Resize skipped: Could not read valid image data for ${imageName} from ${filePath}`);
               return false; // Indicate failure if file missing/invalid
           }
      } catch (e) {
          console.warn(`Resize skipped: Error reading ${filePath}:`, e);
          return false;
      }
  
      // Determine target dimensions based on kind and potentially config
      let targetWidth, targetHeight;
       const defaultCharWidth = parseInt(config?.AI_draw?.processing_config?.character_width || '768', 10); // Example defaults
       const defaultCharHeight = parseInt(config?.AI_draw?.processing_config?.character_height || '1024', 10);
       const defaultBgWidth = 1920;
       const defaultBgHeight = 1080;
  
  
      if (kind === "background") {
          targetWidth = defaultBgWidth;
          targetHeight = defaultBgHeight;
      } else { // character
          // Use configured ratio if possible
          if (!isNaN(defaultCharWidth) && !isNaN(defaultCharHeight) && defaultCharHeight > 0) {
               targetHeight = defaultCharHeight; // Fixed height reference? Or read from config? Let's assume 1024 ref.
               targetWidth = defaultCharWidth;
          } else {
               targetWidth = 1024; // Fallback default width
               targetHeight = 1024; // Fallback default height
          }
      }
  
      // Map strategy names from Chinese to English if needed by ImageProcessor.js
      const strategyMap = { "裁剪": "crop", "填充": "pad", "拉伸": "stretch" };
      const strategyEn = strategyMap[resizeStrategy] || resizeStrategy; // Use English if mapped
  
      console.debug(`Resizing ${imageName} (${kind}) to ${targetWidth}x${targetHeight} using strategy: ${strategyEn}`);
  
      try {
          // Call the ImageProcessor function (ensure it returns the processed image data Blob/File)
          const resizedImageBlob = await ImageProcessor.resize_image_strategy(
              imageFile,
              targetWidth,
              targetHeight,
              strategyEn
          );
  
          if (!resizedImageBlob || !(resizedImageBlob instanceof Blob)) {
               console.error(`Resizing function did not return a valid Blob for ${imageName}.`);
               return false; // Resize technically failed
          }
  
          // Overwrite the original file with the resized result
          if (await writeFileJS(filePath, resizedImageBlob)) {
              console.debug(`Resize successful for ${imageName}.`);
              return true;
          } else {
              console.error(`Failed to write resized image back to ${filePath}.`);
              return false; // Write failed
          }
  
      } catch (error) {
          console.error(`Error during resize step for ${imageName}:`, error);
          return false; // Indicate resize failure
      }
  }
  
  
  // --- Task Execution Logic ---
  
  /**
   * Generates a single image, handling retries, post-processing, and splitting trigger.
   * Corresponds to Python's generate_image_thread.
   * @returns {Promise<'success' | 'failed_model' | ['split', string]>} Result status or split signal.
   */
  async function generateImageTask(config, imagesDir, prompt, imageName, modelName, kind, allowSplit = true) {
      const modelConfig = config?.AI_draw?.configs?.[modelName] || {};
      const retryCount = parseInt(String(modelConfig.max_attempts || 1), 10) || 1;
      const delayTime = (parseInt(String(modelConfig.delay_time || 1), 10) || 1) * 1000; // ms
      let checkImageTimes = 0;
      let currentPrompt = prompt;
  
      for (let i = 0; i < retryCount; i++) {
          console.log(`Attempt ${i + 1}/${retryCount} for ${imageName} using model ${modelName}...`);
          let status = await generateJS(config, imagesDir, currentPrompt, imageName, modelName);
  
          if (status === 'success') {
              // --- Post-generation processing ---
              let postProcessingOk = true;
  
              // 1. Rembg (characters only, if enabled)
              if (postProcessingOk && kind === 'character') {
                  const rembgStatus = await rembgJS(config, imagesDir, imageName, kind, modelName);
                  if (rembgStatus === 'error') {
                      console.log(`rembg failed for ${imageName} on attempt ${i + 1}. Treating as generation failure.`);
                      status = "rembg_error"; // Mark as failed if rembg errored
                      postProcessingOk = false;
                  }
                   // 'pass' is okay
              }
  
              // 2. Quality Check (if post-processing still ok)
              if (postProcessingOk) {
                  const qualityOk = await checkImageSizeJS(config, imagesDir, imageName, kind);
                  if (!qualityOk) {
                       checkImageTimes++;
                       if (checkImageTimes >= 2) { // Failed quality check twice
                           status = 'cheak_error';
                           console.log(`${imageName} failed quality check twice. Final status: cheak_error`);
                       } else {
                            status = 'error'; // Mark as error for retry
                            console.log(`${imageName} failed quality check on attempt ${i + 1}. Retrying if possible.`);
                       }
                       postProcessingOk = false;
                  }
              }
  
              // 3. Resize (if post-processing still ok)
               if (postProcessingOk) {
                   const resizeOk = await resizeImageStrategyJS(config, imagesDir, imageName, kind);
                   if (!resizeOk) {
                       // Decide if resize failure should fail the whole attempt.
                       // Python code treated it as a warning. Let's do the same.
                       console.warn(`Resizing failed or skipped for ${imageName}, but generation considered successful.`);
                       // Keep postProcessingOk = true
                   }
               }
  
               // Final Check: If all steps passed (or were skipped/non-fatal)
               if (postProcessingOk) {
                    console.log(`${imageName} successfully generated and processed with model ${modelName}.`);
                    return 'success'; // FINAL SUCCESS
               }
               // If postProcessingOk became false, status is already 'error' or 'rembg_error' or 'cheak_error'
               // Flow continues to failure handling below.
  
          } // End if status == 'success' initial check
  
  
          // --- Handle Failure or Post-processing Failure ---
          if (status !== 'success') {
              console.log(`Failed attempt ${i + 1}/${retryCount} for ${imageName} with model ${modelName}. Status: ${status}`);
  
              // --- Check for Split Condition ---
              if (allowSplit) {
                  const split_trigger = await func1JS(status); // Pass the failure status
                  if (split_trigger === 1) {
                      console.debug(`DEBUG: func1JS returned 1 for ${imageName}. Calling func2JS...`);
                      const new_prompt_or_error = await func2JS(prompt, imageName, modelName, i, kind); // Pass original prompt
  
                      if (new_prompt_or_error !== "error") {
                          console.debug(`DEBUG: func2JS provided new prompt for ${imageName}. Triggering split.`);
                          return ['split', new_prompt_or_error]; // Return split signal with NEW prompt
                      } else {
                          console.warn(`DEBUG: func2JS returned 'error' for ${imageName}. Triggering split with ORIGINAL prompt.`);
                          return ['split', prompt]; // Return split signal with ORIGINAL prompt on func2 failure
                      }
                  }
                   // else: func1 returned 0, continue retry logic
              }
  
              // If not splitting, wait before next retry (if any)
              if (i < retryCount - 1) {
                  console.log(`Waiting ${delayTime / 1000}s before next attempt...`);
                  await sleep(delayTime);
              }
              // Update prompt if func2 modified it (though current logic splits immediately)
              // This part might not be reached if split happens.
              // currentPrompt = ??? (if func2 modified but didn't split, which isn't the current logic)
          }
           // Continue to the next iteration of the retry loop if status was error/rembg_error/cheak_error
  
      } // End retry loop
  
      // If loop completes without success or splitting
      console.log(`All ${retryCount} attempts failed for ${imageName} with model ${modelName}.`);
      return 'failed_model'; // Signal that this model failed all its attempts
  }
  
  /**
   * Worker for a split-off task. Uses sub-manager, checks permissions.
   * Corresponds to Python's split_task_worker.
   */
/**
 * Worker for a split-off task. Uses sub-manager, checks permissions.
 * Corresponds to Python's split_task_worker.
 */
async function splitTaskWorker(
    config, imagesDir, subModelManager, mainModelManager,
    initialPrompt, imageName, kind,
    splitTaskResults, // Shared object to store results { imageName: 'success'/'failed' }
    splitManagementLock, // AsyncLock for shared results/manager list
    cancellationSignal // Shared cancellation signal argument
) {
    const workerName = `SplitWorker-${imageName}`; // Consistent name for logging
    console.log(`--- ${workerName}: Started ---`);

    const taskPrompt = initialPrompt;
    let taskSuccessful = false;
    let globalConcurrencyAcquired = false; // Track if global lock is held for this worker
    let currentModelName = null; // Track model name if global lock is held

    try {
        // Check cancellation signal before starting loop
        if (cancellationSignal.cancelled) {
            console.log(`${workerName}: Cancelled before starting.`);
            throw new Error("Cancelled"); // Trigger finally block for reporting failure
        }

        // Loop while sub-manager has models AND task not successful AND not cancelled
        while (!subModelManager.terminate_flag && !taskSuccessful && !cancellationSignal.cancelled) {
            globalConcurrencyAcquired = false; // Reset for each model attempt
            currentModelName = null;

            // <<< Check cancellation before getting candidate >>>
            if (cancellationSignal.cancelled) {
                 console.log(`${workerName}: Cancellation active during model acquisition loop. Breaking inner loop.`); // Log break reason
                break;
            }

            // 1. Get candidate model from SUB-manager (internal selection)
            let candidateModelData = null;
             console.log(`${workerName}: Attempting to get candidate model from sub-manager (Index: ${subModelManager.current_priority_index}, Terminated: ${subModelManager.terminate_flag})...`);
            await subModelManager.lock.withLock(async () => {
                 if (cancellationSignal.cancelled) return; // Check cancellation inside lock
                if (subModelManager.models.length === 0) {
                    // If list empty, try loading next priority
                    if (!cancellationSignal.cancelled) { // Don't try loading if cancelled
                         console.log(`${workerName}: Sub-Manager models list empty. Attempting to load next priority...`);
                        subModelManager.current_priority_index++;
                        if (!await subModelManager.load_models_by_highest_priority()) {
                            console.log(`${workerName}: Sub-Manager load_models indicated termination.`);
                        } else {
                             console.log(`${workerName}: Sub-Manager loaded next priority.`);
                        }
                    }
                    return; // Exit lock
                }
                // Select candidate (rest of selection logic is fine)
                const currentSubModels = subModelManager.models;
                const weights = currentSubModels.map(m => m.weigh);
                const choice = weightedRandomChoice(currentSubModels, weights, 1);
                if (choice && choice.length > 0) { candidateModelData = choice[0]; }
                else if (currentSubModels.length > 0) {
                    console.warn(`${workerName}: Sub-Manager weighted choice failed, using random.`);
                    candidateModelData = currentSubModels[Math.floor(Math.random() * currentSubModels.length)];
                } else {
                     // Should not happen if models.length > 0, but safety
                     candidateModelData = null;
                }
                 console.log(`${workerName}: Sub-Manager selected candidate: ${candidateModelData ? candidateModelData.name : 'null'}`);
            }, `${workerName}-subMgrLock-getCandidate`); // Add caller name

            // If no candidate (e.g., load_models failed or list became empty between checks)
            if (!candidateModelData) {
                if (subModelManager.terminate_flag) {
                     console.log(`${workerName}: Sub-manager terminated. Exiting loop.`); // Log break reason
                    break;
                }
                if (cancellationSignal.cancelled) {
                     console.log(`${workerName}: Cancellation active after candidate selection. Exiting loop.`); // Log break reason
                    break;
                }
                // No candidate, but not terminated/cancelled, wait and retry model acquisition
                console.log(`${workerName}: Could not select candidate model. Waiting and retrying.`);
                await sleep(100);
                continue; // Try again in the next iteration
            }

            // --- Candidate selected ---
            const candidateModelName = candidateModelData.name;
            currentModelName = candidateModelName; // Track for release
            const subPrioVal = subModelManager.get_current_priority_value();

            // <<< Check cancellation before checking permission >>>
            if (cancellationSignal.cancelled) {
                 console.log(`${workerName}: Cancellation active before permission check for ${candidateModelName}. Exiting loop.`); // Log break reason
                break;
            }

            // 2. Check permission and acquire GLOBAL concurrency via MAIN manager
             console.log(`${workerName}: Checking permission to use ${candidateModelName} (SubPrio: ${subPrioVal})...`);
            const canUse = await mainModelManager.can_split_task_use_model(
                candidateModelName,
                subPrioVal
            );
            globalConcurrencyAcquired = canUse; // can_split_task_use_model acquires global lock if successful
            console.log(`${workerName}: Permission check result for ${candidateModelName}: ${canUse}`);


             // <<< Check cancellation immediately after permission check >>>
             if (cancellationSignal.cancelled) {
                  console.log(`${workerName}: Cancellation active after permission check for ${candidateModelName}. Exiting loop.`); // Log break reason
                  // If somehow acquired despite cancellation, release
                  if (globalConcurrencyAcquired) {
                      console.warn(`${workerName}: Releasing global concurrency for ${candidateModelName} acquired just before cancellation.`);
                       await mainModelManager.release_split_task_model(candidateModelName).catch(e=>console.error(`${workerName}: Error releasing on cancel:`, e));
                       globalConcurrencyAcquired = false;
                  }
                break;
            }

            // 3. Handle Permission Result
            if (canUse) {
                console.log(`${workerName}: Granted use of ${candidateModelName}. Processing.`);
                try {
                    // <<< Check cancellation before calling generateImageTask >>>
                    if (cancellationSignal.cancelled) {
                         console.log(`${workerName}: Cancellation active before generateImageTask with ${candidateModelName}. Exiting loop.`); // Log break reason
                        throw new Error("Cancelled"); // Trigger catch/finally to ensure release
                    }

                     console.log(`${workerName}: Calling generateImageTask for ${imageName} with model ${candidateModelName}...`);
                    const status = await generateImageTask(config, imagesDir, taskPrompt, imageName, candidateModelName, kind, false); // allowSplit = false
                     console.log(`${workerName}: generateImageTask for ${imageName} returned status: ${status}`);

                    // <<< Check cancellation after generateImageTask >>>
                     if (cancellationSignal.cancelled) {
                          console.log(`${workerName}: Cancellation active after generateImageTask for ${imageName}. Exiting loop.`); // Log break reason
                         // Model should have been released by generateImageTask's error handling or handled below, but double-check
                         // Model release handled below regardless of cancellation if globalConcurrencyAcquired is true.
                         break;
                    }

                    // Release GLOBAL concurrency *after* generateImageTask completes
                    if (globalConcurrencyAcquired) {
                        console.log(`${workerName}: Releasing global concurrency for ${candidateModelName} after task completion.`);
                        await mainModelManager.release_split_task_model(candidateModelName);
                        globalConcurrencyAcquired = false; // Mark as released
                    } else {
                        console.warn(`${workerName}: Did not acquire global concurrency but finished task? State mismatch.`);
                    }


                    // Update SUB-manager's state based on status
                    const subReleaseStatus = (status === 'success') ? 'success' : 'retry_over_times';
                     if (subReleaseStatus === 'retry_over_times') {
                          console.log(`${workerName}: Model ${candidateModelName} failed. Removing from sub-manager list.`);
                          await subModelManager.lock.withLock(async () => {
                              subModelManager.models = subModelManager.models.filter(model => model.name !== candidateModelName);
                              // console.debug(`${workerName}: ${candidateModelName} removed from sub-manager models list.`);
                          }, `${workerName}-subMgrLock-removeFailed`);
                      } else {
                           console.log(`${workerName}: Model ${candidateModelName} successful for task. Not removing from sub-manager list.`);
                      }


                    // Finalize task status
                    if (status === 'success') {
                         await splitManagementLock.withLock(async () => {
                             // Only set success if it's not already 'failed' (e.g., due to cancellation)
                             if(splitTaskResults[imageName] !== 'failed') {
                                 splitTaskResults[imageName] = 'success';
                                 console.log(`${workerName}: Task ${imageName} status set to 'success' in split results.`);
                             } else {
                                  console.warn(`${workerName}: Task ${imageName} was already marked 'failed' when successful status received.`);
                             }
                         }, `${workerName}-splitLock-setSuccess`);
                         taskSuccessful = true;
                         console.log(`--- ${workerName} SUCCESS ---`);
                         // Loop condition will cause exit
                    } else { // status == 'failed_model'
                        console.log(`${workerName}: Model ${candidateModelName} failed generation for ${imageName}. Trying next candidate.`);
                        // Loop continues if not terminated/cancelled
                    }

                } catch (genError) {
                    if (genError.message !== "Cancelled") { // Don't log "Cancelled" error here
                         console.error(`!!! Error during generateImageTask in ${workerName} for ${imageName} (${candidateModelName}):`, genError);
                    } else {
                         console.log(`${workerName}: generateImageTask was cancelled for ${imageName}.`);
                    }

                    // Ensure release even if generateImageTask throws unexpectedly
                    if (globalConcurrencyAcquired) {
                        console.warn(`${workerName}: Releasing global concurrency for ${candidateModelName} due to error.`);
                         await mainModelManager.release_split_task_model(candidateModelName);
                         globalConcurrencyAcquired = false;
                    }

                    // Check cancellation during error handling. If cancelled, break. Otherwise, continue inner loop to try next model.
                     if (cancellationSignal.cancelled) {
                          console.log(`${workerName}: Cancellation active during error handling. Breaking inner loop.`); // Log break reason
                         break;
                     }
                     console.log(`${workerName}: Error during task, not cancelled. Trying next model for ${imageName}.`);
                     continue; // Continue trying other models for original task

                } // End try/catch for generateImageTask

            } else {
                // --- Permission Denied ---
                console.log(`${workerName}: Denied use of ${candidateModelName}.`);

                 // Avoid complex checks/updates if cancelled
                 if (cancellationSignal.cancelled) {
                      console.log(`${workerName}: Cancellation active during permission denial handling. Exiting loop.`); // Log break reason
                     break;
                 }

                // --- Apply removal logic to SUB-manager based on denial reason ---
                 let modelExistsInMainList = false;
                 let mainPrioVal = null;
                 await mainModelManager.lock.withLock(async () => {
                     mainPrioVal = mainModelManager.get_current_priority_value();
                     modelExistsInMainList = mainModelManager.models.some(m => m.name === candidateModelName);
                 }, `${workerName}-mainMgrLock-checkDenial`);

                 let shouldWait = true; // Default to waiting
                 const subPrioVal = subModelManager.get_current_priority_value(); // Get current value

                 if (!modelExistsInMainList && subPrioVal !== null && mainPrioVal !== null) {
                    if (subPrioVal > mainPrioVal) {
                        console.log(`${workerName}: Instructing sub-manager to remove its prio ${subPrioVal} (> main ${mainPrioVal}).`);
                        shouldWait = false; // Remove priority, don't wait
                        subModelManager.remove_current_priority_models(`Priority ${subPrioVal} > Main Priority ${mainPrioVal}`)
                           .catch(e => console.error(`${workerName}: Error removing prio models:`, e));
                    } else if (subPrioVal === mainPrioVal) {
                         console.log(`${workerName}: Instructing sub-manager to remove model ${candidateModelName} (== main prio, not in main list).`);
                         shouldWait = false; // Remove model, don't wait
                         subModelManager.lock.withLock(async () => {
                              subModelManager.models = subModelManager.models.filter(m => m.name !== candidateModelName);
                         }, `${workerName}-subMgrLock-removeDeniedModel`).catch(e => console.error(`${workerName}: Error removing single model:`, e));
                    }
                    // else subPrio < mainPrio, so denial must be concurrency -> shouldWait = true
                 }
                 // else if modelExistsInMainList, denial must be concurrency -> shouldWait = true

                 if (shouldWait) {
                      if (cancellationSignal.cancelled) {
                           console.log(`${workerName}: Cancellation active during wait after denial. Exiting loop.`); // Log break reason
                           break;
                      }
                      console.log(`${workerName}: Permission denied, waiting before retry.`);
                      await sleep(500 + Math.random() * 200); // Wait before sub-manager retries
                 }
                 // Loop continues (if not cancelled/terminated)
            } // End permission denied block

        } // End while loop (!subModelManager.terminate_flag && !taskSuccessful && !cancellationSignal.cancelled)

         // <<< Log AFTER the main while loop finishes >>>
         console.log(`${workerName}: Main while loop finished. Task successful: ${taskSuccessful}. SubMgr terminated: ${subModelManager.terminate_flag}. Cancelled: ${cancellationSignal.cancelled}.`);


    } catch (workerError) {
        if (workerError.message !== "Cancelled") { // Don't log "Cancelled" as an error
             console.error(`!!! Uncaught error in ${workerName} for ${imageName}:`, workerError);
        } else {
             console.log(`${workerName}: Caught Cancellation Error.`); // Log caught cancellation
        }
        taskSuccessful = false; // Ensure marked as failed in finally
        // Ensure release if an error occurred while holding lock
        if (globalConcurrencyAcquired && currentModelName) {
            console.warn(`${workerName}: Releasing global concurrency for ${currentModelName} due to error.`);
            await mainModelManager.release_split_task_model(currentModelName).catch(e => console.error(`${workerName}: Error releasing on worker error:`, e));
            globalConcurrencyAcquired = false;
        }
         // The finally block will update the status
    } finally {
        // --- After the loop or on error/cancellation ---
        // Update splitTaskResults only if the task was NOT successful
        if (!taskSuccessful) {
            await splitManagementLock.withLock(async () => {
                // Report as failed only if not already reported as success
                if (splitTaskResults[imageName] !== 'success') {
                    splitTaskResults[imageName] = 'failed'; // Generic failure status covers cancellation too
                    console.log(`${workerName}: Task ${imageName} status set to 'failed' in split results.`);
                } else {
                     console.warn(`${workerName}: Task ${imageName} was already marked 'success' when finally block ran for non-successful exit.`);
                }
            }, `${workerName}-splitLock-setFinalStatus`);

             // Log specific reason for failure if known
             if (cancellationSignal.cancelled && splitTaskResults[imageName] !== 'success') { // Check success flag again
                 console.log(`--- ${workerName} CANCELLED ---`);
             } else if (subModelManager.terminate_flag && splitTaskResults[imageName] !== 'success') {
                 console.log(`--- ${workerName} FAILED (Sub-manager exhausted) ---`);
             } else if (splitTaskResults[imageName] !== 'success') {
                  console.log(`--- ${workerName} FAILED (Error/Unknown) ---`);
             }
        }
        // else: taskSuccessful was true, status is already set to 'success' by the loop.

        // Final safety release check
        if (globalConcurrencyAcquired && currentModelName) {
            console.warn(`${workerName}: Releasing potentially held global concurrency for ${currentModelName} in finally block.`);
            await mainModelManager.release_split_task_model(currentModelName).catch(e => console.error(`${workerName}: Error releasing on finally:`, e));
        }

        // <<< Log at the very end of the async function execution >>>
        console.log(`--- ${workerName}: Async function execution finished. ---`);
    }
}
  
  
  /**
   * Main worker function simulating Python's worker thread. Uses async/await.
   * Pulls from taskQueue array, interacts with mainModelManager.
   */
/**
 * Main worker function simulating Python's worker thread. Uses async/await.
 * Pulls from taskQueue array, interacts with mainModelManager.
 */
// ImageGenerationService.js


async function mainWorker(
    id, config, imagesDir, mainModelManager,
    taskQueue, results, kind, taskLock,
    activeManagers, splitTaskResults, pendingSplitTasks, splitManagementLock,
    cancellationSignal // Shared cancellation signal argument
) {
    console.log(`Worker-${id}: Started`);
    const workerName = `Worker-${id}`; // Consistent name for logging

    while (true) {
        // <<< Check cancellation signal at the start of the loop >>>
        if (cancellationSignal.cancelled) {
            console.log(`${workerName}: Cancellation signal received. Exiting loop.`); // Log loop exit reason
            break; // Exit worker loop immediately
        }

        let currentTask = null;
        let acquiredMainConcurrency = false;
        let currentModelName = null;
        let taskImageName = null; // Keep track of image name for error logging

        try {
            // Get a task (atomic pop from array simulation)
            await taskLock.withLock(async () => { // Lock needed for taskQueue modification
                 if (taskQueue.length > 0) {
                    currentTask = taskQueue.shift(); // Get first task
                    taskImageName = currentTask ? currentTask[1] : null;
                 }
            }, `${workerName}-taskLock-get`); // Add caller name

            if (!currentTask) {
                // Queue is empty. Check cancellation again before sleeping.
                if (cancellationSignal.cancelled) {
                     console.log(`${workerName}: Task queue empty. Cancellation active. Exiting loop.`); // Log loop exit reason
                    break;
                }
                // Wait and check queue/cancellation again in the next iteration.
                // console.debug(`${workerName}: Task queue empty, waiting...`);
                await sleep(500);
                continue;
            }

            // --- Got a task ---
            const [prompt, imageName] = currentTask;
            taskImageName = imageName; // Store for finally block
            console.log(`${workerName}: Picked up task ${imageName}`);

            // Check if file exists and skip if not covering
            let shouldSkip = false;
            if (!results.cover) { // Check cover flag
                 try {
                     const metadata = await idbFs.getMetadata(`${imagesDir}/${imageName}.png`);
                     if (metadata.exists && !metadata.isFolder) {
                         shouldSkip = true;
                     }
                 } catch (e) { console.warn(`${workerName}: Error checking metadata for ${imageName}:`, e); }
            }

            if (shouldSkip) {
              console.log(`${workerName}: Skipping ${imageName} - File exists.`);
              await taskLock.withLock(async () => {
                  if (results[imageName] !== 'success' && results[imageName] !== 'failed' && results[imageName] !== 'failed_cancelled') { // Avoid overwriting final statuses
                     results[imageName] = 'skipped';
                     // console.debug(`${workerName}: Task ${imageName} status set to 'skipped'.`);
                  } else {
                       console.warn(`${workerName}: Skipping ${imageName}, but status was already '${results[imageName]}'.`);
                  }
              }, `${workerName}-taskLock-skip`);
              continue; // Get next task
            }

            // <<< Check cancellation signal before starting generation loop >>>
            if (cancellationSignal.cancelled) {
                 console.log(`${workerName}: Cancellation signal received after picking task ${imageName}. Exiting loop.`); // Log loop exit reason
                 // The task was taken from the queue but not processed, need to mark it failed?
                 // Or rely on final summary to catch unresolved 'pending'? Let's mark failed for clarity.
                 await taskLock.withLock(async () => {
                     if (results[imageName] === 'pending') {
                          results[imageName] = 'failed_cancelled';
                          // console.debug(`${workerName}: Task ${imageName} status set to 'failed_cancelled' on early exit.`);
                     }
                 }, `${workerName}-taskLock-cancelPick`);
                break;
            }

            // --- Task requires generation ---
            let taskSuccessfulOrSplit = false;
            // Loop while task not done AND main manager has models AND not cancelled
            while (!taskSuccessfulOrSplit && !mainModelManager.terminate_flag && !cancellationSignal.cancelled) {
                acquiredMainConcurrency = false; // Reset for each model attempt
                currentModelName = null;

                // <<< Check cancellation signal before getting model >>>
                if (cancellationSignal.cancelled) {
                     console.log(`${workerName}: Cancellation active during model acquisition loop for ${imageName}. Breaking inner loop.`); // Log inner loop break reason
                    break;
                }

                // Get an available model from the main manager (acquires global lock)
                console.log(`${workerName}: Attempting to get model for ${imageName}...`);
                const modelInfo = await mainModelManager.get_model();
                console.log(`${workerName}: get_model for ${imageName} returned: ${modelInfo ? modelInfo.name : 'null'}`);

                // <<< Check cancellation signal *immediately* after potential wait in get_model >>>
                if (cancellationSignal.cancelled) {
                     console.log(`${workerName}: Cancellation active after get_model for ${imageName}. Breaking inner loop.`); // Log inner loop break reason
                     // get_model should return null if cancelled, but double check for safety
                     if (modelInfo && acquiredMainConcurrency) { // If somehow acquired a model despite cancellation
                         console.warn(`${workerName}: Releasing model ${modelInfo.name} acquired just before cancellation.`);
                         await mainModelManager.release_model(modelInfo.name, 'error');
                         acquiredMainConcurrency = false;
                     }
                    break;
                }

                if (modelInfo === null) {
                    // If get_model returns null, it means manager terminated OR temporarily busy
                    if (mainModelManager.terminate_flag) {
                        console.log(`${workerName}: Main model manager terminated while waiting for model for ${imageName}. Cannot process task.`);
                        // Mark task as failed if not already resolved
                        await taskLock.withLock(async () => {
                            if (results[imageName] === 'pending' || results[imageName] === 'split_pending') {
                                results[imageName] = 'failed_no_models';
                                // console.debug(`${workerName}: Task ${imageName} status set to 'failed_no_models'.`);
                            }
                        }, `${workerName}-taskLock-noModel`);
                        taskSuccessfulOrSplit = true; // Mark as handled to break inner loop
                        // Inner loop will break because terminate_flag is true or taskSuccessfulOrSplit is true
                    } else {
                        // Waiting for global concurrency, sleep briefly
                         console.debug(`${workerName}: No model available for ${imageName}, but manager not terminated. Waiting.`);
                         if (cancellationSignal.cancelled) { // Check before sleep
                             console.log(`${workerName}: Cancellation active before sleep waiting for model for ${imageName}. Breaking inner loop.`); // Log break reason
                            break; // Exit inner loop
                         }
                        await sleep(500 + Math.random() * 200);
                        continue; // Retry getting a model in the next inner loop iteration
                    }
                } else {
                   // --- Model acquired ---
                   currentModelName = modelInfo.name;
                   acquiredMainConcurrency = true; // get_model acquired it globally (assuming get_model acquired logic is correct)

                    // <<< Check cancellation signal *after* acquiring model, *before* generating >>>
                   if (cancellationSignal.cancelled) {
                     console.log(`${workerName}: Cancellation active after acquiring model ${currentModelName} for ${imageName}. Releasing and breaking inner loop.`); // Log break reason
                     if (acquiredMainConcurrency) {
                          await mainModelManager.release_model(currentModelName, 'error');
                          acquiredMainConcurrency = false;
                     }
                     break; // Exit inner loop
                  }

                   console.log(`${workerName}: Processing ${imageName} with acquired model ${currentModelName} (Priority ${modelInfo.priority})`);

                   // Attempt to generate the image (allow splitting only if not cancelled)
                   const allowSplit = !cancellationSignal.cancelled;
                   console.log(`${workerName}: Calling generateImageTask for ${imageName} with ${currentModelName} (allowSplit: ${allowSplit})...`);
                   const status = await generateImageTask(config, imagesDir, prompt, imageName, currentModelName, kind, allowSplit);
                   console.log(`${workerName}: generateImageTask for ${imageName} returned status: ${Array.isArray(status) ? status[0] : status}`);

                   // <<< Check cancellation signal *after* generateImageTask completes >>>
                   if (cancellationSignal.cancelled) {
                       console.log(`${workerName}: Cancellation active after generateImageTask for ${imageName}. Breaking inner loop.`); // Log break reason
                        // Model should have been released by generateImageTask or handled by finally, but double-check
                       if (acquiredMainConcurrency) {
                           console.warn(`${workerName}: Releasing model ${currentModelName} in worker after generateImageTask due to cancellation.`);
                            await mainModelManager.release_model(currentModelName, 'error').catch(e=>console.error(`${workerName}: Error releasing model on cancel:`, e));
                            acquiredMainConcurrency = false;
                       }
                       break; // Exit inner loop
                   }

                   // --- Handle Status (Split, Success, Failure) ---
                   if (Array.isArray(status) && status[0] === 'split') {
                       // --- Handle Split ---
                       const splitPrompt = status[1];
                       console.log(`${workerName}: Task ${imageName} triggered split.`);
                       let subModelManager = null;

                       try {
                           await splitManagementLock.withLock(async () => {
                               // Don't create split if already cancelled
                               if(cancellationSignal.cancelled) {
                                   console.log(`${workerName}: Cancellation active during split setup for ${imageName}. Aborting split creation.`);
                                    throw new Error("Cancelled during split setup"); // Trigger catch/finally
                               }

                               subModelManager = await mainModelManager.copy(mainModelManager);
                               if (!subModelManager) {
                                    throw new Error("Failed to copy ModelManager for split task.");
                               }
                               activeManagers.push(subModelManager); // Track the sub-manager
                               console.log(`${workerName}: Created sub-manager for split task ${imageName}.`);

                               // Prepare arguments for the split worker, include cancellation signal
                                const splitArgs = [
                                    config, imagesDir, subModelManager, mainModelManager,
                                    splitPrompt, imageName, kind,
                                    splitTaskResults, splitManagementLock,
                                    cancellationSignal // Pass signal
                                ];

                               // Add to pending list for the monitoring loop to start
                               pendingSplitTasks.push({
                                    imageName: imageName,
                                    args: splitArgs
                               });
                                console.log(`${workerName}: Added split task ${imageName} to pending list.`);

                                // Mark original task as 'split_pending'
                                await taskLock.withLock(async () => {
                                   if(results[imageName] === 'pending') { // Only update if truly pending
                                      results[imageName] = 'split_pending';
                                      console.debug(`${workerName}: Task ${imageName} status set to 'split_pending'.`);
                                   } else {
                                        console.warn(`${workerName}: Task ${imageName} status was already '${results[imageName]}' when trying to set 'split_pending'.`);
                                   }
                                }, `${workerName}-taskLock-setSplitPending`);
                           }, `${workerName}-splitLock-splitSetup`); // Add caller name for split lock
                           console.log(`${workerName}: Split setup complete for ${imageName}.`);

                           // Release concurrency used by the *original* worker's attempt that led to split
                           console.log(`${workerName}: Releasing main concurrency for ${currentModelName} after splitting off ${imageName}.`);
                           // Release model as 'success' because the responsibility is now with the split task
                           await mainModelManager.release_model(currentModelName, 'success');
                           acquiredMainConcurrency = false;

                           taskSuccessfulOrSplit = true; // Mark original task as handled by splitting

                       } catch (splitError) {
                            console.error(`${workerName}: Error initiating split for ${imageName}:`, splitError.message);
                            // If split initiation failed (e.g., due to cancellation during setup or copy error),
                            // release the original model as failed and let the worker potentially retry
                             if (acquiredMainConcurrency) {
                                console.warn(`${workerName}: Releasing model ${currentModelName} due to split initiation error.`);
                                await mainModelManager.release_model(currentModelName, 'error');
                                acquiredMainConcurrency = false;
                             }
                             // Check cancellation again. If cancelled, break. Otherwise, continue inner loop to try next model.
                             if(!cancellationSignal.cancelled) {
                                 console.log(`${workerName}: Split initiation failed, not cancelled. Trying next model for ${imageName}.`);
                                continue; // Continue trying other models for original task
                             } else {
                                 console.log(`${workerName}: Split initiation failed due to cancellation. Breaking inner loop for ${imageName}.`); // Log break reason
                                break; // Break inner loop if cancelled
                             }
                       }

                   } else if (status === 'success') {
                       // --- Handle Success ---
                       console.log(`${workerName}: Task ${imageName} completed successfully with model ${currentModelName}.`);
                       await mainModelManager.release_model(currentModelName, 'success');
                       acquiredMainConcurrency = false;
                       await taskLock.withLock(async () => {
                            // Update status only if not already finally resolved (e.g., by a concurrent split finishing first - unlikely but safe)
                            if(results[imageName] === 'pending' || results[imageName] === 'split_pending') {
                                results[imageName] = 'success';
                                console.debug(`${workerName}: Task ${imageName} status set to 'success'.`);
                            } else {
                                console.warn(`${workerName}: Task ${imageName} status was already '${results[imageName]}' when trying to set 'success'.`);
                            }
                       }, `${workerName}-taskLock-setSuccess`);
                       taskSuccessfulOrSplit = true; // Task done

                   } else if (status === 'failed_model') {
                       // --- Handle Model Failure ---
                       console.log(`${workerName}: Model ${currentModelName} failed permanently for ${imageName}. Trying next model.`);
                       await mainModelManager.release_model(currentModelName, 'retry_over_times');
                       acquiredMainConcurrency = false;
                       // Loop continues to get next model (if not cancelled/terminated).

                   } else {
                       // Handle unexpected status from generateImageTask
                       console.error(`${workerName}: Unexpected status "${status}" from generateImageTask for ${imageName}. Treating as model failure.`);
                        await mainModelManager.release_model(currentModelName, 'error');
                        acquiredMainConcurrency = false;
                        // Let loop continue to try next model if not cancelled.
                        if (cancellationSignal.cancelled) {
                             console.log(`${workerName}: Cancellation active after unexpected status for ${imageName}. Breaking inner loop.`); // Log break reason
                             break;
                        }
                   }
                } // End else (modelInfo was not null)

               // Inner loop break check (due to terminate_flag or cancellationSignal)
               if (mainModelManager.terminate_flag) {
                    console.log(`${workerName}: Inner loop breaking for ${imageName}: Main manager terminated.`); // Log break reason
               }
                if (cancellationSignal.cancelled) {
                    console.log(`${workerName}: Inner loop breaking for ${imageName}: Cancellation active.`); // Log break reason
                }


            } // End inner while loop (task finished or manager terminated or cancelled)

            // --- After Inner Loop ---
            // Check if loop exited due to cancellation
            if (cancellationSignal.cancelled) {
               console.log(`${workerName}: Outer loop breaking for ${taskImageName} due to cancellation signal.`); // Log outer loop break reason
               await taskLock.withLock(async () => {
                   // Mark as cancelled only if still pending/split_pending and not already success/skipped/failed
                   if (results[taskImageName] === 'pending' || results[taskImageName] === 'split_pending') {
                       results[taskImageName] = 'failed_cancelled';
                       console.debug(`${workerName}: Task ${taskImageName} status set to 'failed_cancelled' on outer loop exit.`);
                   } else {
                        console.warn(`${workerName}: Task ${taskImageName} had status '${results[taskImageName]}' when outer loop broke due to cancellation.`);
                   }
               }, `${workerName}-taskLock-cancelOuter`);
               // Model release should be handled inside the inner loop or finally block
               break; // Exit outer worker loop as well upon cancellation
            }

            // If loop exited for reasons other than cancellation (task done, manager terminated),
            // the task status should already be set appropriately. We just continue to the next task.
             console.log(`${workerName}: Outer loop continuing to next task.`); // Log outer loop continue

        } catch (error) {
            console.error(`!!! ${workerName} error processing task ${taskImageName || 'UNKNOWN'}:`, error);
            // Ensure concurrency release on unexpected error
            if (acquiredMainConcurrency && currentModelName) {
                 console.warn(`${workerName}: Releasing held concurrency for ${currentModelName} due to error.`);
                 try {
                     await mainModelManager.release_model(currentModelName, 'error');
                 } catch (releaseError) { console.error(`${workerName}: Error releasing model during error handling:`, releaseError); }
                 acquiredMainConcurrency = false;
            }
            // Mark task as failed if an error occurred and it wasn't resolved
             if (taskImageName) {
                 await taskLock.withLock(async () => {
                     if (results[taskImageName] === 'pending' || results[taskImageName] === 'split_pending') {
                         results[taskImageName] = 'worker_error';
                         console.debug(`${workerName}: Task ${taskImageName} status set to 'worker_error' on error.`);
                     } else {
                          console.warn(`${workerName}: Task ${taskImageName} had status '${results[taskImageName]}' when error occurred.`);
                     }
                 }, `${workerName}-taskLock-setError`);
             }
             if (cancellationSignal.cancelled) {
                  console.log(`${workerName}: Cancellation active during error handling. Exiting loop.`); // Log loop exit reason
                 break; // Exit if cancelled during error handling
             }
            // Continue to next task (if not cancelled)

        } finally {
             // Final safety check: Release concurrency if loop terminates unexpectedly while holding it
             if (acquiredMainConcurrency && currentModelName) {
                  console.warn(`${workerName}: Releasing potentially held concurrency for ${currentModelName} in finally block (Worker Exit).`);
                   try {
                       await mainModelManager.release_model(currentModelName, 'error');
                   } catch (releaseError) { console.error(`${workerName}: Error releasing model in finally:`, releaseError); }
             }
        }
    } // End outer while loop (worker lifecycle)

    // <<< Log at the very end of the async function execution >>>
    console.log(`${workerName}: Async function execution finished.`);
}
  
  
  // --- Main Orchestration ---
  
  /**
   * Loads configuration from localStorage.
   * @returns {object | null} Parsed config or null on error.
   */
  export function loadConfigJS() {
      try {
          const configStr = localStorage.getItem('aiGalgameConfig');
          if (!configStr) {
              console.error("Config not found in localStorage (key: aiGalgameConfig).");
              return null;
          }
          currentConfig = JSON.parse(configStr);
           // Update global vars from config
           storyTitle = currentConfig?.剧情?.story_title || '';
           imagesDirectory = `${gameDirectory}/${storyTitle}/images`; // Use template literal
          console.log("Config loaded successfully. Story:", storyTitle);
          return currentConfig;
      } catch (e) {
          console.error("Error loading or parsing config from localStorage:", e);
          currentConfig = null;
          return null;
      }
  }
  
  /**
   * Main function to process image generation.
   * @param {string} prompt1 First part of the prompt for GPT.
   * @param {string | object} prompt2 Second part (context/details) for GPT.
   * @param {'character' | 'background'} kind Type of generation.
   * @param {boolean | number} cover Whether to overwrite existing images (truthy).
   * @param {Function} updateStatus Callback function to update UI status (e.g., (message) => { status.value = message })
   * @returns {Promise<object>} Final summary { success: [], failed: [], skipped: [] }
   */
// --- Main Orchestration ---


/**
 * Main function to process image generation.
 * @param {string} prompt1 First part of the prompt for GPT.
 * @param {string | object} prompt2 Second part (context/details) for GPT.
 * @param {'character' | 'background'} kind Type of generation.
 * @param {boolean | number} cover Whether to overwrite existing images (truthy).
 * @param {Function} updateStatus Callback function to update UI status (e.g., (message) => { status.value = message })
 * @returns {Promise<object>} Final summary { success: [], failed: [], skipped: [] }
 */
export async function runMainProcess(prompt1, prompt2, kind, cover = 0, updateStatus = console.log) {
    updateStatus("Loading configuration...");
    const config = loadConfigJS();
    if (!config) {
        updateStatus("Error: Failed to load config.");
        return { error: "Config load failed" };
    }
    const realkind=kind;
    if (kind==='title'){
        kind='background';
    }
    // Update global variables (assuming they are defined outside this function scope)
    // let gameDirectory = '/data'; // Needs to be defined globally or passed around
    // let storyTitle;             // Needs to be defined globally or managed locally
    // let imagesDirectory;        // Needs to be defined globally or managed locally
    storyTitle = config?.剧情?.story_title || '';
    imagesDirectory = `${gameDirectory}/${storyTitle}/images`; // Use the global/scoped gameDirectory

    updateStatus(`Configuration loaded. Story: ${storyTitle}. Preparing directories...`);
    try {
         await idbFs.createFolder(imagesDirectory);
         updateStatus("Directories ensured.");
    } catch (e) {
         updateStatus(`Error creating directories: ${e.message}`);
         console.error("Error creating directories:", e);
         return { error: "Directory creation failed" };
    }

    // --- Shared State ---
    // Use named locks for clarity in debugging logs
    const results = { cover: !!cover };
    const taskLock = new AsyncLock('TaskQueue');
    const activeManagers = []; // Stores main + sub managers
    const splitTaskResults = {}; // Results from split tasks { imageName: 'success' | 'failed' }
    const pendingSplitTasks = []; // Tasks waiting to be started by splitTaskWorker [{ imageName, args }]
    const runningSplitPromises = []; // Promises for splitTaskWorkers currently running
    const splitManagementLock = new AsyncLock('SplitManagement');
    const cancellationSignal = { cancelled: false }; // Shared cancellation flag

    // --- Get Tasks from GPT ---
    updateStatus("Requesting task list from GPT...");
    let drawingTasks = null;
    const gptId = randint(1, 100000); // Assuming randint is available
    let gptSuccess = false;
    for (let i = 0; i < 3; i++) {
        if (cancellationSignal.cancelled) { updateStatus("Operation cancelled before GPT."); await gptDestroy(gptId).catch(()=>{}); return { error: "Operation cancelled" }; }
        try {
            const gpt_response = await gpt(prompt1, prompt2, kind, gptId);
             if (cancellationSignal.cancelled) { updateStatus("Operation cancelled during GPT."); await gptDestroy(gptId).catch(()=>{}); return { error: "Operation cancelled" }; }

            if (gpt_response === 'over_times') { updateStatus(`GPT attempt ${i+1} failed (internal retries).`); await sleep(1000); continue; }
            if (gpt_response && gpt_response !== 'error') {
                drawingTasks = parseJsonFromGptResponse(gpt_response); // Assuming parseJsonFromGptResponse is available
                if (drawingTasks !== null) { await gptDestroy(gptId); gptSuccess = true; updateStatus(`GPT returned ${drawingTasks.length} initial tasks.`); console.log("Initial GPT Tasks:", drawingTasks); break; }
                else { updateStatus(`GPT attempt ${i+1} parse failed.`); drawingTasks = null; await sleep(1000); }
            } else { updateStatus(`GPT attempt ${i+1} failed.`); await sleep(1000); }
        } catch (e) { updateStatus(`GPT attempt ${i+1} error: ${e.message}`); console.error(`GPT call failed on attempt ${i+1}:`, e); await sleep(1000); }
    }

    // --- Early Exit Checks (AFTER GPT attempts) ---
    if (!gptSuccess) { await gptDestroy(gptId).catch(()=>{}); updateStatus("Error: Failed GPT task list."); return { error: "GPT task list failed" }; }
    if (!drawingTasks) { updateStatus("GPT response parsing failed. No tasks to process."); return { success: [], failed: [], skipped: [] }; }
    if (cancellationSignal.cancelled) { updateStatus("Operation cancelled after GPT."); return { error: "Operation cancelled" }; }

    // --- Deduplicate tasks by name ---
    const taskMap = new Map();
    drawingTasks.forEach(task => taskMap.set(task.name, task));
    const uniqueTasks = Array.from(taskMap.values());
    const totalTasks = uniqueTasks.length;

    if (totalTasks === 0) { updateStatus("GPT returned no unique tasks."); return { success: [], failed: [], skipped: [] }; }
    updateStatus(`Processing ${totalTasks} unique tasks.`);

    // --- Initialize Main Model Manager ---
    updateStatus("Initializing main model manager...");
    const mainModelManager = new ModelManager(config, kind, totalTasks, null, false); // Assuming ModelManager is defined
    await mainModelManager.initialize();
    if (mainModelManager.terminate_flag) {
         updateStatus("Error: Main model manager could not initialize any valid models.");
         const finalSummary = { success: [], failed: uniqueTasks.map(task => task.name), skipped: [] }; // All tasks failed if manager fails init
         return finalSummary;
    }
    activeManagers.push(mainModelManager); // Track the main manager

    // --- Prepare Task Queue ---
    const taskQueue = [];
    updateStatus("Adding tasks to queue...");
    uniqueTasks.forEach(task => {
        taskQueue.push([task.prompt, task.name]);
        results[task.name] = 'pending'; // Initialize status
    });

    // --- Start Main Worker Async Functions ---
    const maxWorkers = config?.AI_draw?.max_worker_threads || 5;
    const numWorkers = Math.min(maxWorkers, totalTasks);
    updateStatus(`Starting ${numWorkers} main workers...`);
    const workerPromises = [];
    for (let i = 0; i < numWorkers; i++) {
        workerPromises.push(mainWorker( // Assuming mainWorker is defined
            i + 1, config, imagesDirectory, mainModelManager,
            taskQueue, results, kind, taskLock,
            activeManagers, splitTaskResults, pendingSplitTasks, splitManagementLock,
            cancellationSignal // Pass cancellation signal
        ));
    }

    // --- Monitoring and Split Task Management Loop ---
    updateStatus("Monitoring progress...");
    let lastStatusUpdateTime = Date.now();
    let normalCompletionReached = false; // Flag to track if normal completion condition was met

    while (true) {
        // Safely read shared state
        let mainQueueLength = 0;
        let currentResultsSnapshot = {};
        await taskLock.withLock(() => {
             mainQueueLength = taskQueue.length;
             currentResultsSnapshot = { ...results };
        });
        let activeSplitCount = 0;
        let pendingSplitCount = 0;
        await splitManagementLock.withLock(() => {
            activeSplitCount = runningSplitPromises.length;
            pendingSplitCount = pendingSplitTasks.length;
        });

        // Calculate progress (how many tasks are resolved)
        const finalAccountedCount = calculateFinalAccounted(currentResultsSnapshot, splitTaskResults, cancellationSignal, uniqueTasks);


        // *** ORDER OF CHECKS IS CRITICAL ***

        // 1. Check for NORMAL completion FIRST
        //    (All original tasks accounted for AND no splits active/pending)
        if (!cancellationSignal.cancelled && finalAccountedCount >= totalTasks && pendingSplitCount === 0 && activeSplitCount === 0) {
             updateStatus(`${realkind} All ${totalTasks} tasks completed normally. Finishing up.`);
             console.log("Normal completion condition met.");
             normalCompletionReached = true; // Record normal completion
             break; // <<< EXIT THE MONITORING LOOP NORMALLY
        }

        // 2. Check if CANCELLATION should be triggered (Main Manager Exhausted Models)
        //    (Only trigger if cancellation hasn't been set yet)
        if (!cancellationSignal.cancelled && mainModelManager.terminate_flag) {
             updateStatus(`${realkind} Main model manager exhausted. Signaling cancellation...`);
             console.log("Triggering cancellation due to main manager termination.");
             cancellationSignal.cancelled = true; // <<< SET THE GLOBAL CANCELLATION FLAG
             // Give workers/splits a moment to see the signal before the next loop iteration checks it
             await sleep(100);
             // Continue the loop; the next iteration will check cancellationSignal.cancelled
        }

        // 3. Check if loop should EXIT because CANCELLATION is now active
        //    (This will catch both explicit cancellation and manager exhaustion trigger)
        if (cancellationSignal.cancelled) {
            // Only log this specific message if it wasn't a normal completion that just finished
            if (!normalCompletionReached) {
                 updateStatus("Cancellation signalled. Stopping monitoring loop.");
                 console.log("Exiting monitoring loop due to active cancellation signal.");
            }
            break; // <<< EXIT THE MONITORING LOOP DUE TO CANCELLATION
        }

        // --- If loop continues (neither normal completion nor cancellation exit conditions met) ---

        // Log progress periodically
        if (Date.now() - lastStatusUpdateTime > 4000) {
            updateStatus(`${realkind} Progress: ${finalAccountedCount}/${totalTasks}. MainQ: ${mainQueueLength}. PendingSp: ${pendingSplitCount}. ActiveSp: ${activeSplitCount}. MainMgrTerm: ${mainModelManager.terminate_flag}. Cancelled: ${cancellationSignal.cancelled}.`);
            lastStatusUpdateTime = Date.now();
        }

        // Start Pending Split Tasks (only if not cancelled)
        if (pendingSplitCount > 0 && !cancellationSignal.cancelled) {
             await splitManagementLock.withLock(async () => { // Make the lock callback async
                 while (pendingSplitTasks.length > 0 && !cancellationSignal.cancelled) { // Re-check inside loop
                     const splitInfo = pendingSplitTasks.shift();
                     console.log(`Starting split task worker for: ${splitInfo.imageName}`);
                     if(Array.isArray(splitInfo.args)) {
                         // Ensure signal is present (should be added by mainWorker, but safety check)
                         if (!splitInfo.args.includes(cancellationSignal)) {
                            splitInfo.args.push(cancellationSignal);
                         }
                         const splitPromise = splitTaskWorker(...splitInfo.args) // Assuming splitTaskWorker is defined
                             .finally(() => { // Remove from running list when done
                                 splitManagementLock.withLock(() => {
                                    const index = runningSplitPromises.indexOf(splitPromise);
                                    if (index > -1) { runningSplitPromises.splice(index, 1); }
                                 });
                             });
                         runningSplitPromises.push(splitPromise);
                     } else {
                         console.error(`Split task args for ${splitInfo.imageName} not an array! Marking failed.`);
                         // Mark this specific task as failed in results if its setup was broken
                         await taskLock.withLock(() => {
                             if (results[splitInfo.imageName] === 'pending' || results[splitInfo.imageName] === 'split_pending') {
                                 results[splitInfo.imageName] = 'worker_error'; // Or a specific 'split_setup_failed' status
                             }
                         });
                     }
                 }
             });
         }

        // Prevent tight loop if nothing major happened, and we are still active
        await sleep(500);

    } // --- End of Monitoring while (true) loop ---


    // *** SET CANCELLATION SIGNAL *AFTER* THE LOOP BREAKS (for any reason: normal completion or cancellation trigger) ***
    // This is crucial. Any worker/split still running will now see this signal and exit their internal loops,
    // allowing their promises to settle.
    if (!cancellationSignal.cancelled) { // Avoid redundant setting if already true
        console.log("Monitoring loop finished. Setting cancellation signal true to ensure all workers/splits exit.");
        cancellationSignal.cancelled = true;
    } else {
         console.log("Monitoring loop finished, cancellation signal was already true.");
    }


     // --- Helper function to calculate accounted tasks (scoped to runMainProcess) ---
     // This function checks how many tasks have reached *any* final status (success, skipped, failed, etc.)
     // or are considered failed due to cancellation.
     function calculateFinalAccounted(resSnapshot, splitResSnapshot, cancelSignal, originalTasksList) {
        const finalSt = ['success', 'skipped', 'worker_error', 'failed_no_models', 'failed', 'failed_cancelled'];
        // Use a Set to count unique names that are resolved or accounted for
        const accountedNames = new Set();

        // Add names resolved by split tasks (success or failed)
        for (const name of Object.keys(splitResSnapshot)) {
            accountedNames.add(name);
        }

        // Add names resolved by main workers or considered resolved due to cancellation
        for (const [name, status] of Object.entries(resSnapshot)) {
            if (name === 'cover') continue; // Skip internal flag

            if (finalSt.includes(status)) {
                accountedNames.add(name);
            } else if (cancelSignal.cancelled && (status === 'pending' || status === 'split_pending')) {
                // If cancellation occurred, pending tasks are considered 'accounted for' (as failed)
                accountedNames.add(name);
            }
             // Note: Tasks still 'pending' when !cancelSignal.cancelled are NOT accounted for yet.
        }

        // In case of cancellation, ensure ALL original task names are included in the accounted set,
        // as they will all be marked failed/cancelled in the final summary.
        if(cancelSignal.cancelled) {
             originalTasksList.forEach(task => accountedNames.add(task.name));
        }


        // The size of the set represents the total number of unique task names
        // that have reached a terminal state OR are forced into a terminal state by cancellation.
        return accountedNames.size;
    }
     // --- End Helper ---


    // --- Cleanup: Wait for all workers and splits to finish exiting ---
    updateStatus(`Waiting for final operations... Cancelled: ${cancellationSignal.cancelled}`);
    console.log("Awaiting settlement of worker promises...");
    await Promise.allSettled(workerPromises);
    console.log("Awaiting settlement of running split promises...");
    await Promise.allSettled(runningSplitPromises);
    console.log("All workers and splits have settled.");

    // Give a tiny moment for any very last microtasks/macrotasks triggered by final settlements
    await sleep(100);

    updateStatus("Compiling final results...");

    // --- Compile Final Summary ---
    const finalSummary = { success: [], failed: [], skipped: [] };
    const processedNames = new Set(); // Track names added to finalSummary to avoid duplicates

    // Get final state snapshots under locks
    let finalResultsSnapshot = {};
    let finalSplitResultsSnapshot = {};
    await taskLock.withLock(() => { finalResultsSnapshot = { ...results }; });
    await splitManagementLock.withLock(() => { finalSplitResultsSnapshot = { ...splitTaskResults }; });

    // 1. Add results from split tasks first
    for (const [name, status] of Object.entries(finalSplitResultsSnapshot)) {
      if (status === 'success') {
          if (!processedNames.has(name)) { finalSummary.success.push(name); processedNames.add(name); }
      } else {
          // Non-success splits are failed (includes cancellation cases handled by split worker)
          if (!processedNames.has(name)) { finalSummary.failed.push(name); processedNames.add(name); }
      }
    }

    // 2. Add results from the main worker pool
    for (const [name, status] of Object.entries(finalResultsSnapshot)) {
      if (name === 'cover' || processedNames.has(name)) continue; // Skip cover flag and already processed splits

      if (status === 'success') {
           finalSummary.success.push(name);
      } else if (status === 'skipped') {
           finalSummary.skipped.push(name);
      } else {
          // *** Handle failure based on final status and cancellation ***
          // If cancelled, any non-success/non-skipped is failed
          if (cancellationSignal.cancelled) {
               // Any status other than success/skipped means failed if cancelled
               finalSummary.failed.push(name);
               if (status !== 'pending' && status !== 'split_pending') {
                   // console.log(`Task ${name} marked failed due to cancellation (original status: ${status}).`);
               }
          }
          // If not cancelled, any status other than success/skipped/pending/split_pending is a genuine failure
          else if (status !== 'pending' && status !== 'split_pending') {
               finalSummary.failed.push(name); // Includes worker_error, failed_no_models etc.
          }
          // Note: Tasks still 'pending' or 'split_pending' here without cancellation signal is a logic error,
          // but they will be caught by the final check below if not added here.
      }
      processedNames.add(name); // Mark as processed for the next step
    }

    // 3. Final check: Ensure all original task names are accounted for
    const allOriginalNames = new Set(uniqueTasks.map(task => task.name));
    allOriginalNames.forEach(name => {
        // If an original task name is NOT in the processedNames set, it means it was never
        // explicitly marked as success, failed, or skipped by any worker or split.
        // This should ideally not happen with robust workers, but acts as a safety net.
        if (!processedNames.has(name)) {
             console.warn(`Warning: Original task '${name}' was never resolved to a final status. Marking as failed.`);
             finalSummary.failed.push(name); // Add missing tasks to failed list
        }
    });

    // Final deduplication (safety measure)
    finalSummary.success = [...new Set(finalSummary.success)];
    finalSummary.failed = [...new Set(finalSummary.failed)];
    finalSummary.skipped = [...new Set(finalSummary.skipped)];


    updateStatus(`Processing Complete. Cancelled: ${cancellationSignal.cancelled}`);
    console.log("--- Final Summary ---");
    console.log(`Successful: ${finalSummary.success.length}`, finalSummary.success);
    console.log(`Failed: ${finalSummary.failed.length}`, finalSummary.failed);
    console.log(`Skipped: ${finalSummary.skipped.length}`, finalSummary.skipped);

    return finalSummary;
}

  
  // --- Entry Point Functions ---
  
  export async function getAllPersonsImagesJS( updateStatus = console.log ) {
      updateStatus("Starting: Get All Persons Images");
      const [prompt1, prompt2] = await processPrompt('全部人物绘画');
      // prompt2 might need specific formatting based on processPrompt output
      return await runMainProcess(prompt1, prompt2, 'character', true, updateStatus); // cover = 1 (true)
  }
  
  export async function getSinglePersonImageJS(characterNames, updateStatus = console.log) {
    updateStatus(`Starting: Get Single Person Image for ${characterNames}`); // Update log to show it's a list or single name

    const config = loadConfigJS(); // Need config to find character data path
    if (!config) return { error: "Config load failed" };

    const storyTitle = config?.剧情?.story_title || '';
    const characterJsonPath = `/data/${storyTitle}/character.json`;

    try {
        // **Handle the list of character names**
        if (!characterNames || characterNames.length === 0) {
            updateStatus("Character name list is empty, returning.");
            return; // Return early if the list is empty
        }

        // Read character.json from IndexedDB
        updateStatus("Reading character data...");
        const characterData = await idbFs.readFile(characterJsonPath);

        if (!characterData) {
            return {error: "Failed to read character data."};
        }

        if (characterNames.length === 1) {
            const characterName = characterNames[0]
            const characterInfo = characterData.find(item => item?.name === characterName);
            if (!characterInfo) {
                updateStatus(`Error: Character '${characterName}' not found in ${characterJsonPath}`);
                return { error: `Character ${characterName} not found` };
            }

             // Prepare prompts for GPT
            updateStatus("Processing prompt for single character...");
            const [prompt1, prompt2Input] = await processPrompt('单个人物绘画');
            const prompt2 = JSON.stringify(characterInfo); // Use the found character object directly as prompt2

            // Call main process
            updateStatus(`Generating image for ${characterName}...`);
            return await runMainProcess(prompt1, prompt2, 'character', true, updateStatus); // cover = 1 (true)
        }

        // **Multiple Character Names: Combine Infos**
        let combinedCharacterInfo = [];
        for (const characterName of characterNames) {
            const characterInfo = characterData.find(item => item?.name === characterName);

            if (!characterInfo) {
                updateStatus(`Error: Character '${characterName}' not found in ${characterJsonPath}`);
                return { error: `Character ${characterName} not found` };
            }
            combinedCharacterInfo.push(characterInfo);
        }

        // Prepare prompts for GPT
        updateStatus("Processing prompt for multiple characters...");
        const [prompt1, prompt2Input] = await processPrompt('单个人物绘画'); // Or consider a prompt specifically for multiple characters
        const prompt2 = JSON.stringify(combinedCharacterInfo); // Combine character infos into a single JSON string

        // Call main process
        updateStatus(`Generating image for multiple characters: ${characterNames.join(', ')}...`);
        return await runMainProcess(prompt1, prompt2, 'character', true, updateStatus); // cover = 1 (true)

    } catch (error) {
        updateStatus(`Error processing character(s) ${characterNames}: ${error.message}`); // Update error message
        console.error(`Error in getSinglePersonImageJS for ${characterNames}:`, error);
        return { error: `Failed to process ${characterNames}: ${error.message}` }; // Update return error
    }
}
  
  export async function getPlacesImagesJS(cover = 0, updateStatus = console.log) {
      updateStatus("Starting: Get Places Images");
      const config = loadConfigJS();
      if (!config) return { error: "Config load failed" };
  
      const storyTitle = config?.剧情?.story_title || '';
      const placeJsonPath = `/data/${storyTitle}/story/place.json`;
  
      try {
          updateStatus("Reading places data...");
          let placeData = []; // Default empty
          try {
              placeData = await idbFs.readFile(placeJsonPath); // Read content
               // Check if content represents an empty list
               if (JSON.stringify(placeData)=== '[]') {
                    updateStatus("No places defined in place.json. Skipping background generation.");
                    return { success: [], failed: [], skipped: ["No places defined"] };
               }
               // Assuming placeData is now a non-empty JSON string/object usable by processPrompt
  
          } catch (e) {
               // If readFile throws (e.g., file not found), assume no places.
               updateStatus("place.json not found or unreadable. Skipping background generation.");
               console.log("place.json not found, skipping places generation.");
               return { success: [], failed: [], skipped: ["place.json not found"] };
          }
  
  
          updateStatus("Processing prompt for places...");
          const [prompt1, prompt2] = await processPrompt('故事地点绘画');
  
          updateStatus("Generating place images...");
          return await runMainProcess(prompt1, prompt2, 'background', cover, updateStatus);
  
      } catch (error) {
          updateStatus(`Error processing places: ${error.message}`);
          console.error("Error in getPlacesImagesJS:", error);
          return { error: `Failed to process places: ${error.message}` };
      }
  }


  export async function getTitleImagesJS(cover = 0, updateStatus = console.log) {
    updateStatus("Starting: Get Places Images");

    try {
        updateStatus("Processing prompt for title image...");
        const [prompt1, prompt2] = await processPrompt('首页背景生成');

        updateStatus("Generating title images...");
        return await runMainProcess(prompt1, prompt2, 'title', cover, updateStatus);

    } catch (error) {
        updateStatus(`Error processing places: ${error.message}`);
        console.error("Error in getTitleImagesJS:", error);
        return { error: `Failed to process places: ${error.message}` };
    }
}