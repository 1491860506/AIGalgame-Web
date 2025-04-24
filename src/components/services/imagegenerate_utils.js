export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  

export function randint(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Selects k elements from a population with replacement, respecting weights.
   * @param {Array<any>} population The items to choose from.
   * @param {Array<number>} weights The weights corresponding to population items.
   * @param {number} k The number of items to choose.
   * @returns {Array<any>} An array of chosen items.
   */
  export function weightedRandomChoice(population, weights, k = 1) {
      if (population.length !== weights.length) {
          throw new Error("Population and weights must have the same length.");
      }
      if (k <= 0) {
          return [];
      }
  
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      if (totalWeight <= 0) {
          // Handle case with zero total weight (e.g., equal probability or error)
          console.warn("Total weight is zero or negative, falling back to uniform random choice.");
          const results = [];
          for (let i = 0; i < k; i++) {
              results.push(population[Math.floor(Math.random() * population.length)]);
          }
          return results;
      }
  
      const cumulativeWeights = [];
      let cumulativeSum = 0;
      for (const weight of weights) {
          cumulativeSum += weight;
          cumulativeWeights.push(cumulativeSum);
      }
  
      const results = [];
      for (let i = 0; i < k; i++) {
          const randomNum = Math.random() * totalWeight;
          // Find the index where randomNum falls into the cumulative weight range
          const chosenIndex = cumulativeWeights.findIndex(cw => randomNum < cw);
          results.push(population[chosenIndex === -1 ? population.length - 1 : chosenIndex]); // Handle potential floating point edge cases
      }
  
      return results;
  }
  
  
  /**
   * Safely retrieves a value from nested data using a path string (e.g., "['images'][0]['url']").
   * Handles basic JS object/array access.
   * @param {object|Array<any>|null} data The object or array to navigate.
   * @param {string} pathStr The path string.
   * @returns {any|null} The value found or null if path is invalid.
   */
  export function safeGetPath(data, pathStr) {
      if (!pathStr || data == null) {
          return null;
      }
  
      try {
          // Simpler regex for JS: matches ['key'], ["key"], or [index]
          const keys = pathStr.match(/\[\s*(?:'([^']+)'|"([^"]+)"|(\d+))\s*\]/g);
          if (!keys) {
               console.warn(`Path '${pathStr}' doesn't match expected format ['key'] or [index]`);
               return null; // Or try direct access if format is simpler?
          }
  
          let currentData = data;
          for (const keyMatch of keys) {
              // Extract the key/index itself
              const keyOrIndexStr = keyMatch.slice(1, -1).trim(); // Remove brackets and trim
              let key;
              // Remove quotes if present
              if ((keyOrIndexStr.startsWith("'") && keyOrIndexStr.endsWith("'")) ||
                  (keyOrIndexStr.startsWith('"') && keyOrIndexStr.endsWith('"'))) {
                  key = keyOrIndexStr.slice(1, -1);
              } else if (/^\d+$/.test(keyOrIndexStr)) { // Check if it's purely digits
                  key = parseInt(keyOrIndexStr, 10);
              } else {
                  key = keyOrIndexStr; // Assume it's an unquoted key name if needed
              }
  
  
              if (typeof key === 'number') { // Array index access
                  if (!Array.isArray(currentData) || key < 0 || key >= currentData.length) {
                      return null;
                  }
                  currentData = currentData[key];
              } else { // Object property access
                  if (typeof currentData !== 'object' || currentData === null || !(key in currentData)) {
                      return null;
                  }
                  currentData = currentData[key];
              }
              if (currentData === null || typeof currentData === 'undefined') {
                  // Reached null/undefined along the path
                   return null;
              }
          }
          return currentData;
      } catch (e) {
          console.error(`Error accessing path '${pathStr}':`, e);
          return null;
      }
  }
  
  const _EVAL_FAILED = Symbol("EvalFailed"); // Unique symbol for evaluation failure
  
  /**
   * Safely evaluates a condition string like "operand1 op operand2".
   * Supports response.status, result[...] paths, literals (string, number).
   * @param {string} conditionStr The condition string.
   * @param {Response|null} response The fetch Response object.
   * @param {object|Array|null} result The parsed JSON result.
   * @returns {boolean|null} True/False if evaluation successful, null otherwise.
   */
  export function evaluateConditionSafe(conditionStr, response, result) {
      if (!conditionStr) {
          return false;
      }
  
      const match = conditionStr.match(/^\s*(.+?)\s*(==|!=)\s*(.+?)\s*$/);
      if (!match) {
          console.warn(`Could not parse condition string: '${conditionStr}'`);
          return null;
      }
  
      const [, leftStr, op, rightStr] = match;
  
      const evaluateOperand = (operandStr) => {
          const stripped = operandStr.trim();
  
          if (stripped === 'response.status_code' || stripped === 'response.status') {
              return response ? response.status : _EVAL_FAILED;
          }
          if (stripped.startsWith('result[')) {
              const path = stripped.substring('result'.length);
              const value = safeGetPath(result, path);
              return value !== null ? value : _EVAL_FAILED; // Use !== null to allow falsy values like 0 or false
          }
          if ((stripped.startsWith("'") && stripped.endsWith("'")) ||
              (stripped.startsWith('"') && stripped.endsWith('"'))) {
              return stripped.slice(1, -1);
          }
          if (!isNaN(stripped) && stripped.trim() !== '') { // Check if it's a number
               // Try parsing as float first, then int if it looks like one
              const num = parseFloat(stripped);
              if (Number.isInteger(num) && stripped.indexOf('.') === -1) {
                  return parseInt(stripped, 10);
              }
              return num;
          }
          // Basic support for true/false literals
          if (stripped.toLowerCase() === 'true') return true;
          if (stripped.toLowerCase() === 'false') return false;
          if (stripped.toLowerCase() === 'none' || stripped.toLowerCase() === 'null') return null;
  
  
          console.warn(`Unrecognized operand format: '${stripped}' in condition '${conditionStr}'`);
          return _EVAL_FAILED;
      };
  
      const leftVal = evaluateOperand(leftStr);
      const rightVal = evaluateOperand(rightStr);
  
      if (leftVal === _EVAL_FAILED || rightVal === _EVAL_FAILED) {
          // console.debug(`Condition '${conditionStr}' failed evaluation due to operand issue.`);
          return null;
      }
  
      try {
          if (op === '==') {
               // console.debug(`Evaluating ${JSON.stringify(leftVal)} == ${JSON.stringify(rightVal)} -> ${leftVal == rightVal}`);
               // Use == for potential type coercion as in Python, unless strict comparison needed
               return leftVal == rightVal;
          } else if (op === '!=') {
               // console.debug(`Evaluating ${JSON.stringify(leftVal)} != ${JSON.stringify(rightVal)} -> ${leftVal != rightVal}`);
               return leftVal != rightVal;
          } else {
              return null;
          }
      } catch (e) {
          console.warn(`Type error during comparison in condition '${conditionStr}': ${e}. Operands: ${typeof leftVal}, ${typeof rightVal}`);
          return null;
      }
  }
  
  /**
   * Safely decodes base64 data (string).
   * @param {string | null | undefined} data Base64 encoded string.
   * @returns {Uint8Array | string} Decoded data as Uint8Array or "error".
   */
  export function safeB64Decode(data) {
      if (data == null || typeof data !== 'string') return "error";
      try {
          // Handle URL-safe base64 (replace - with +, _ with /)
          let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
          // Add padding if needed
          const padding = base64.length % 4;
          if (padding) {
              base64 += '='.repeat(4 - padding);
          }
          const binaryString = window.atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes; // Return raw bytes
      } catch (e) {
          console.error(`Error decoding base64: ${e}`, data.substring(0, 50)); // Log first 50 chars
          return "error";
      }
  }
  
  function direct(data) {
      return data !== "" ? data : "error";
  }
  
  export const USERDEFINE_FUNCTION_MAP = {
      "b64decode": safeB64Decode,
      "direct": direct,
  };
  
  /**
   * Processes the userdefine string using function mapping.
   * @param {string} userdefineStr - e.g., "b64decode(result['path'])".
   * @param {Response|null} response - The fetch Response.
   * @param {object|Array|null} parsedResult - Parsed JSON from response.
   * @param {any} extractedResult - Result from regular path (path1/path2).
   * @returns {Promise<any | string>} Processed data or the string "error".
   */
  export async function processUserdefine(userdefineStr, responseStatus, responseText, responseBlob, parsedResult, extractedResult) {
    if (!userdefineStr || typeof userdefineStr !== 'string') {
        return "error";
    }

    const match = userdefineStr.match(/^\s*(\w+)\s*\(\s*(.+)\s*\)\s*$/);
    if (!match) {
        console.error(`Could not parse userdefine string format: '${userdefineStr}'`);
        return "error";
    }

    const [, funcName, argStr] = match;
    const cleanedArgStr = argStr.trim();

    let argumentValue = null;

    try {
        if (cleanedArgStr === 'result') {
            argumentValue = extractedResult;
        } else if (cleanedArgStr.startsWith('result[')) {
            const pathPart = cleanedArgStr.substring('result'.length);
            argumentValue = safeGetPath(parsedResult, pathPart);
        } else if (cleanedArgStr === 'response.text' || cleanedArgStr === 'text') {
            // Use the pre-read text
            argumentValue = responseText;
        } else if (cleanedArgStr === 'response.content' || cleanedArgStr === 'content') {
            // Use the pre-read blob
            argumentValue = responseBlob; // This might be null if not read by caller
            if (argumentValue === null) {
                 console.error(`Error: Userdefine requested 'content', but it was not pre-read or available.`);
                 return "error";
            }
        } else {
            console.error(`Unrecognized argument '${cleanedArgStr}' in userdefine string.`);
            return "error";
        }

        // Allow null/undefined ONLY if it was the intended extractedResult
        // For text/content, they should generally not be null if the request succeeded.
        if (argumentValue === null || argumentValue === undefined) {
             // Re-check if 'result' was the arg, null might be valid then
             if (cleanedArgStr !== 'result') {
                 console.error(`Failed to evaluate argument '${cleanedArgStr}' (value is null or undefined).`);
                 return "error";
             }
             // else: argumentValue is null because extractedResult was null, proceed.
        }


        if (funcName in USERDEFINE_FUNCTION_MAP) {
            const targetFunction = USERDEFINE_FUNCTION_MAP[funcName];
            console.debug(`Calling userdefine function '${funcName}'...`);
            // Pass the evaluated argumentValue to the target function
            const processedData = await targetFunction(argumentValue);
            if (processedData === "error") {
                console.error(`Mapped function '${funcName}' signalled an internal error.`);
                return "error";
            }
            return processedData;
        } else {
            console.error(`Function name '${funcName}' not found in USERDEFINE_FUNCTION_MAP.`);
            return "error";
        }
    } catch (e) {
         console.error(`Error processing userdefine '${userdefineStr}':`, e);
         return "error";
    }
}
  
  /**
   * Parses headers from config array format [['key', 'value']] to JS object.
   * @param {Array<Array<string>>} headersList List of header pairs.
   * @returns {HeadersInit} Headers object or simple JS object.
   */
  export function parseHeaders(headersList) {
      const headers = {};
      if (Array.isArray(headersList)) {
          for (const header of headersList) {
              if (Array.isArray(header) && header.length === 2) {
                  headers[header[0]] = header[1];
              }
          }
      }
      return headers;
  }
  
  
  /**
   * Parses a JSON array string from a potentially larger text block.
   * @param {string | null} responseText The text possibly containing JSON.
   * @returns {Array<object> | null} The parsed array or null on error.
   */
  export function parseJsonFromGptResponse(responseText) {
      if (!responseText || responseText === 'error') {
          console.error("Error: GPT response is empty or error.");
          return null;
      }
  
      // Try to find the array structure more robustly
      const match = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/); // Non-greedy match inside braces
      if (!match) {
          console.error("Error: Could not find JSON array structure in GPT response.");
          console.log("GPT Response Snippet:", responseText.substring(0, 500));
          // Try finding just the start and end brackets if the above fails
          const startIndex = responseText.indexOf('[');
          const endIndex = responseText.lastIndexOf(']');
          if (startIndex !== -1 && endIndex > startIndex) {
               const potentialJson = responseText.substring(startIndex, endIndex + 1);
               console.warn("Attempting fallback JSON parsing using bracket matching.");
               try {
                   const data = JSON.parse(potentialJson);
                   // Further validation can go here
                   if (Array.isArray(data)) return data; // Basic check
               } catch (e) {
                  console.error("Fallback JSON parsing failed:", e);
                  console.log("Fallback Snippet:", potentialJson.substring(0, 500));
               }
          }
          return null; // Give up if no structure found
      }
  
      const jsonStr = match[0];
  
      try {
          const data = JSON.parse(jsonStr);
  
          if (!Array.isArray(data)) {
              console.error("Error: Parsed JSON is not a list.");
              return null;
          }
          if (data.length === 0) {
              console.warn("Warning: GPT returned an empty list of tasks.");
              return [];
          }
  
          const validatedData = [];
          for (const item of data) {
              if (typeof item !== 'object' || item === null) {
                  console.error("Error: Item in JSON list is not an object:", item);
                  return null;
              }
              if (!('name' in item) || !('prompt' in item)) {
                  console.error("Error: Object item missing 'name' or 'prompt':", item);
                  return null;
              }
               // Basic sanitization
              const name = String(item.name).trim();
              const prompt = String(item.prompt).trim();
              if (!name) {
                   console.warn("Warning: Item has empty name, skipping:", item);
                   continue;
              }
              validatedData.push({ name, prompt });
          }
          return validatedData;
      } catch (e) {
          console.error(`Error: Failed to decode JSON from GPT response: ${e}`);
          console.log("Extracted JSON String:", jsonStr.substring(0, 500));
          return null;
      }
  }
  
  /**
   * Simple asynchronous lock for controlling access in async/await flows.
   */
/**
 * Simple asynchronous lock for controlling access in async/await flows.
 * Added logging for debugging.
 */
export class AsyncLock {
    constructor(name = 'UnnamedLock') { // Optional name for easier log reading
      this._locked = false;
      this._queue = [];
      this.name = name; // Store the name
      this.holder = null; // Track who holds the lock for debugging
    }
  
    acquire(requester = 'anonymous') { // Optional requester ID
      const timestamp = Date.now();
      //console.log(`LOCK [${this.name}]: Request from ${requester} at ${timestamp}. Locked: ${this._locked}. Queue size: ${this._queue.length}. Holder: ${this.holder}`);
      return new Promise(resolve => {
        const task = () => {
            this._locked = true;
            this.holder = requester; // Record who holds it
            //console.log(`LOCK [${this.name}]: Acquired by ${requester} at ${Date.now()}.`);
            resolve(); // Resolve the promise indicating acquisition
        };
  
        if (!this._locked) {
          // console.log(`LOCK [${this.name}]: Acquiring immediately for ${requester}.`);
          task(); // Acquire immediately
        } else {
          //console.log(`LOCK [${this.name}]: Queuing request from ${requester}.`);
          // Add resolver function to the queue
          this._queue.push({ resolve: task, requester: requester });
        }
      });
    }
  
    release(releaser = 'anonymous') { // Optional releaser ID
      if (!this._locked) {
          console.warn(`LOCK [${this.name}]: Attempted to release by ${releaser} when already unlocked!`);
          return; // Avoid errors if released multiple times
      }
       if (this.holder !== releaser && this.holder !== null) { // Be lenient if holder wasn't tracked
           // console.warn(`LOCK [${this.name}]: Released by ${releaser} but held by ${this.holder}!`);
       } else {
            // console.log(`LOCK [${this.name}]: Released by ${releaser}.`);
       }
  
  
      this.holder = null; // Clear holder
  
      if (this._queue.length > 0) {
        const nextTaskInfo = this._queue.shift();
        //console.log(`LOCK [${this.name}]: Dequeuing next request from ${nextTaskInfo.requester}. Queue size now: ${this._queue.length}.`);
        // Using setTimeout to ensure the next task runs in a future macrotask,
        // preventing potential same-tick re-acquisition issues in complex scenarios.
        setTimeout(nextTaskInfo.resolve, 0);
      } else {
        this._locked = false;
         // console.log(`LOCK [${this.name}]: Now unlocked. Queue empty.`);
      }
    }
  
    // Helper for try...finally pattern
    async withLock(fn, callerName = 'withLockCaller') { // Add caller name for context
      const requesterId = `${callerName}-${randint(100,999)}`; // Unique ID for this attempt
      await this.acquire(requesterId);
      try {
        // console.log(`LOCK [${this.name}]: Executing function for ${requesterId}...`);
        return await fn();
      } finally {
         // console.log(`LOCK [${this.name}]: Releasing lock for ${requesterId} after function execution.`);
        this.release(requesterId);
      }
    }
  
    // Add a method to check lock status without acquiring (for debugging)
    isLocked() {
        return this._locked;
    }
    getQueueLength() {
        return this._queue.length;
    }
  }
  
  // IMPORTANT: Ensure you are creating named locks where needed, e.g.:
  // In ModelManager constructor:
  // this.lock = new AsyncLock(`ModelManager-${kind}-${randint(1,1000)}`); // Instance lock
  // this._global_lock = new AsyncLock('GlobalModelUsage'); // Global lock (if main manager)
  
  // In runMainProcess:
  // const taskLock = new AsyncLock('TaskQueueLock');
  // const splitManagementLock = new AsyncLock('SplitManagementLock');