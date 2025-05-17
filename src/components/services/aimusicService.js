// Note: Assume these are correctly imported from their respective files
import { gpt, gptDestroy } from './AiModelService.js';
import { writeFile, getMetadata, createFolder } from './IndexedDBFileSystem.js'; // Assuming createFolder is also exported
import { processPrompt } from './PromptService.js';
import pLimit from 'p-limit';

// String prototype extension (keeping as requested, though utility function is generally preferred)
Object.defineProperty(String.prototype, 'isDigit', {
  get: function () {
    return /^\d+$/.test(this);
  },
  configurable: true
});


// --- Configuration & Utility Class (④) ---

class ConfigService {
    constructor() {
        this.config = {};

        // Define platform services configuration with 'kind' FIRST
        this.platform_services = [
            {"name": "verify", "kind": "verify", "service_id": "018c653e-4f1b-433f-82f9-732ef2767040", "Valid_threshold": 0.016},
            {"name": "suno", "kind": "music", "service_id": "f2b646d8-3cfd-46ef-969a-1ea9eebde329", "Valid_threshold": 0.042},
            {"name": "udio", "kind": "music", "service_id": "9a41f04e-8e55-445f-8c95-f9e4c41191aa", "Valid_threshold": 0.042},
            {"name": "riffusion", "kind": "music", "service_id": "88231e63-48c8-44f3-ab81-4d06696eaa85", "Valid_threshold": 0.042},
            {"name": "Kling", "kind": "video", "service_id": "3369e077-2500-4263-86c7-cae0f0e7e843", "Valid_threshold": 0.042},
            {"name": "luma", "kind": "video", "service_id": "dff45a0d-2858-4936-8e2b-3d49c52aff11", "Valid_threshold": 0.042},
            {"name": "pixverse", "kind": "video", "service_id": "74e74695-ceff-49d1-ac84-cfa876225ae8", "Valid_threshold": 0.042},
            {"name": "pika", "kind": "video", "service_id": "c7d407fa-0f87-4031-abbb-4f0716ff51ad", "Valid_threshold": 0.042},
            {"name": "hailuo", "kind": "video", "service_id": "5eaa73b7-b9a7-4a17-afb3-f658fd5495b0", "Valid_threshold": 0.042},
            // Add other services here, e.g.:
            // {"name": "another_music_model", "kind": "music", "service_id": "...", "Valid_threshold": 0.05},
            // {"name": "some_image_model", "kind": "image", "service_id": "...", "Valid_threshold": 0.01},
        ];

        // Ensure verify service is present, as it's critical for generation
        if (!this.platform_services.some(service => service.name === 'verify')) {
            console.error("CRITICAL: 'verify' service configuration is missing in platform_services. Token generation will likely fail.");
             // Add a placeholder if critical config is missing - generation might still fail if service_id is wrong
            this.platform_services.push({"name": "verify", "kind": "verify", "service_id": "VERIFY_SERVICE_ID_MISSING", "Valid_threshold": 0.016});
        }

        // Now call load(), which can safely access this.platform_services
        this.load();

        console.log("ConfigService initialized.");
    }

    /**
     * Load configuration from localStorage
     */
    load() {
        const configString = localStorage.getItem('aiGalgameConfig');
        if (configString) {
            try {
                this.config = JSON.parse(configString);
                // Ensure essential structure exists
                this.config["剧情"] = this.config["剧情"] || {};
                this.config["AI音乐"] = this.config["AI音乐"] || {};
                this.config["AI音乐"]["tokenpool"] = this.config["AI音乐"]["tokenpool"] || {};
                // Initialize token lists for all defined services if they don't exist
                 // THIS FOR LOOP NOW WORKS because this.platform_services is defined
                this.platform_services.forEach(service => {
                     const listKey = `${service.name}_token_list`;
                     this.config["AI音乐"]["tokenpool"][listKey] = this.config["AI音乐"]["tokenpool"][listKey] || [];
                 });

                console.log("Config loaded from localStorage.");
            } catch (e) {
                console.error("Failed to parse config from localStorage:", e);
                this._setDefaultConfig(); // This call also now works
            }
        } else {
            console.log("No config found in localStorage, using default.");
            this._setDefaultConfig(); // This call now works
        }
        return this.config;
    }

     /**
     * Set default configuration structure
     */
    _setDefaultConfig() {
        this.config = {
            "剧情": {},
            "AI音乐": {
                "tokenpool": {}
             }
        };
        // Initialize token lists for all defined services
         // THIS FOR LOOP NOW WORKS because this.platform_services is defined
        this.platform_services.forEach(service => {
             const listKey = `${service.name}_token_list`;
             this.config["AI音乐"]["tokenpool"][listKey] = [];
         });
         console.log("Default config set.");
    }

    /**
     * Save configuration to localStorage
     */
    save() {
        try {
            localStorage.setItem('aiGalgameConfig', JSON.stringify(this.config));
            // console.log("Config saved to localStorage."); // Potentially noisy
        } catch (e) {
            console.error("Failed to save config to localStorage:", e);
        }
    }

    /**
     * Get a configuration value using a dot-separated path
     * @param {string} keyPath - e.g., "AI音乐.base_url"
     * @param {*} defaultValue - Value to return if path doesn't exist
     * @returns {*} - The configuration value or default
     */
    get(keyPath, defaultValue = null) {
        try {
            const keys = keyPath.split('.');
            let current = this.config;
            for (const key of keys) {
                if (current === null || typeof current !== 'object' || !(key in current)) {
                    return defaultValue;
                }
                current = current[key];
            }
            return current;
        } catch (e) {
            console.error(`Error getting config value for ${keyPath}:`, e);
            return defaultValue;
        }
    }

    /**
     * Set a configuration value using a dot-separated path
     * @param {string} keyPath - e.g., "AI音乐.tokenpool.suno_token_list"
     * @param {*} value - The value to set
     */
    set(keyPath, value) {
        try {
            const keys = keyPath.split('.');
            let current = this.config;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (current[key] === undefined || typeof current[key] !== 'object' || current[key] === null) {
                    current[key] = {}; // Create intermediate objects if they don't exist
                }
                current = current[key];
            }
            current[keys[keys.length - 1]] = value;
            this.save(); // Auto-save on set
        } catch (e) {
            console.error(`Error setting config value for ${keyPath}:`, e);
        }
    }

    /**
     * Get the list of tokens for a specific service name.
     * @param {string} name - Service name (e.g., 'suno', 'verify')
     * @returns {Array} - The token list
     */
    getTokenList(name) {
         const list = this.get(`AI音乐.tokenpool.${name}_token_list`, []);
         // Ensure it's always an array
         return Array.isArray(list) ? list : [];
    }

    /**
     * Set the list of tokens for a specific service name.
     * @param {string} name - Service name (e.g., 'suno', 'verify')
     * @param {Array} list - The new token list
     */
    setTokenList(name, list) {
        if (!Array.isArray(list)) {
             console.error(`Attempted to set non-array value for ${name}_token_list`);
             return; // Prevent saving invalid data
        }
        this.set(`AI音乐.tokenpool.${name}_token_list`, list);
    }

     /**
      * Gets the configured AI music model name.
      * @returns {string} Model name or 'suno' as default.
      */
     getMusicApiModel() {
        // Return the 'name' of the preferred music service or 'suno'
        const preferredModel = this.get('AI音乐.model', 'suno') || 'suno';
        const musicServices = this.getServicesByKind('music');
        const found = musicServices.find(service => service.name === preferredModel);
        // Return the preferred model name if it exists in music services, otherwise default to 'suno' (if suno is a music service)
        if (found) return found.name;
        const sunoService = musicServices.find(service => service.name === 'suno');
        if (sunoService) return 'suno';
        // Fallback to the first available music service if suno isn't configured as music
        if (musicServices.length > 0) return musicServices[0].name;
        console.warn("No music models configured in platform_services. Music generation will likely fail.");
        return null; // Or throw error?
     }

     /**
      * Gets the base URL for the music API.
      * @returns {string|null} Base URL or null if not configured.
      */
     getMusicApiBaseUrl() {
        return this.get('AI音乐.base_url', null);
     }

     /**
      * Gets the story title from config.
      * @returns {string} Story title or empty string.
      */
     getStoryTitle() {
         return this.get('剧情.story_title', '');
     }

      /**
      * Gets the language from config.
      * @returns {string|null} Language code or null.
      */
     getLanguage() {
         return this.get('剧情.language', null);
     }

     /**
      * Returns the platform services configuration list.
      * @returns {Array} List of service configurations.
      */
     getPlatformServices() {
         return this.platform_services;
     }

     /**
      * Finds a service configuration by name.
      * @param {string} name - Service name.
      * @returns {object|null} Service config object or null if not found.
      */
     getServiceConfigByName(name) {
         return this.platform_services.find(service => service.name === name) || null;
     }

     /**
      * Filters service configurations by kind.
      * @param {string} kind - Service kind (e.g., 'music', 'verify').
      * @returns {Array} List of service configurations matching the kind.
      */
     getServicesByKind(kind) {
         return this.platform_services.filter(service => service.kind === kind);
     }


    /**
     * Extract JSON object from text.
     * @param {string} text - Input text
     * @returns {object|string} - Extracted JSON object or "error"
     */
    extractJson(text) {
        if (typeof text !== 'string') {
             console.warn("extractJson failed: Input is not a string.");
             return "error";
        }
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');

        if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
            console.warn("JSON extraction failed: No valid JSON structure found in text:", text.substring(0, Math.min(text.length, 100)) + (text.length > 100 ? "..." : ""));
            return "error";
        }

        const jsonString = text.substring(startIndex, endIndex + 1);

        try {
            const jsonObject = JSON.parse(jsonString);
            // console.log("JSON extracted successfully:", jsonObject); // Debug log
            return jsonObject;
        } catch (e) {
            console.error("JSON parsing failed:", e, "Original string segment:", jsonString.substring(0, Math.min(jsonString.length, 200)) + (jsonString.length > 200 ? "..." : ""));
            return "error";
        }
    }
}

// --- Email Service Class (①) ---
// No changes needed based on new requirements

class EmailService {
    /**
     * Generate a random email address
     * @param {number} length - Length of the random part
     * @returns {string} - Generated email address
     */
    generateAddress(length = 10) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `${result}@nqmo.com`;
    }

    /**
     * Get an authentication token from the email proxy service.
     * @param {string} email - Email address
     * @returns {Promise<string|null>} - Auth token or null if failed
     * @private
     */
    async _getToken(email) {
        try {
            const url = `https://mailproxy.qqframe.cn/zh/mail/${email}`;
            const response = await fetch(url, { credentials: 'include' });

            if (response.status >= 300 && response.status < 400) {
                console.log(`Email service redirect status ${response.status}, skipping.`);
                return null;
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const setCookieHeader = response.headers.get('xx-set-cookie');
            if (setCookieHeader) {
                const match = /auth_token=([^;]+)/.exec(setCookieHeader);
                if (match) return match[1];
                console.log("auth_token not found in email service cookie");
            } else {
                console.log("set-cookie header not found in email service response");
            }
            return null;
        } catch (error) {
            console.error('Email service get token request error:', error);
            return null;
        }
    }

    /**
     * Listen for new emails for a given address.
     * @param {string} email - Email address
     * @param {string} token - Auth token obtained from _getToken
     * @returns {Promise<string[]|null>} - Array of email IDs or null if token invalid/error
     * @private
     */
    async _listenForEmails(email, token) {
        if (!token) return null; // Cannot listen without a token
        try {
            const url = `https://mailproxy.qqframe.cn/api/api/v1/mailbox/${email}`;
            const headers = { 'Authorization': `bearer ${token}` };
            const response = await fetch(url, { headers });
            if (!response.ok) {
                 if (response.status === 401) return null; // Token likely expired
                 throw new Error(`HTTP error! status: ${response.status}`);
            }
            const emailData = await response.json();
            if (Array.isArray(emailData)) {
                return emailData.map(item => item.id);
            }
            console.log("Email data format incorrect:", emailData);
            return [];
        } catch (error) {
            console.error('Failed to listen for emails:', error);
            return []; // Return empty array on error, null only on auth failure
        }
    }

    /**
     * Read a specific email and extract the 6-digit code.
     * @param {string} email - Email address
     * @param {string} emailId - Email ID
     * @param {string} token - Auth token
     * @returns {Promise<string|null>} - Verification code or null if failed/not found
     * @private
     */
    async _readEmail(email, emailId, token) {
         if (!token) return null; // Cannot read without a token
         try {
             const url = `https://mailproxy.qqframe.cn/api/api/v1/mailbox/${email}/${emailId}`;
             const headers = { 'Authorization': `bearer ${token}` };
             const response = await fetch(url, { headers });
             if (!response.ok) {
                 if (response.status === 401) return null; // Token likely expired
                 throw new Error(`HTTP error! status: ${response.status}`);
             }
             const data = await response.json();
             const text = data?.body?.text;
             if (!text) {
                 console.warn("Email body text not found in response for ID:", emailId);
                 return null;
             }
             const match = /\d{6}/.exec(text);
             return match ? match[0] : null;
         } catch (error) {
             console.error('Failed to read email:', error);
             return null;
         }
     }

    /**
     * Monitor for new emails and return the first found 6-digit verification code.
     * @param {string} email - Email address
     * @returns {Promise<string|null>} - Verification code or null if timeout/error
     */
    async monitorAndRead(email) {
        let lastEmailIds = new Set();
        let attempts = 0;
        const maxAttempts = 15; // 30 seconds total wait time

        // Need to get a fresh token for each monitoring session
        const token = await this._getToken(email);
         if (!token) {
             console.log("Failed to get email token for monitoring session.");
             return null;
         }
         console.log(`Monitoring email ${email} for verification code...`);

        while (attempts < maxAttempts) {
            const newEmailIds = await this._listenForEmails(email, token);

            if (newEmailIds === null) {
                console.log("Email token expired during monitoring, stopping.");
                return null; // Token issue, stop trying
            }
            if (newEmailIds.length === 0 && attempts === 0) {
                 // On first attempt, initialize lastEmailIds with current IDs
                 const currentIds = new Set(await this._listenForEmails(email, token));
                 lastEmailIds = currentIds;
                 console.log(`Initial email check: Found ${currentIds.size} emails.`);
            }


            const currentIds = new Set(newEmailIds);
            const newEmails = [...currentIds].filter(id => !lastEmailIds.has(id));

            if (newEmails.length > 0) {
                // Check newest emails first (assuming API returns newest first or IDs are sortable)
                // Simple sort, might need adjustment based on ID format (e.g., timestamp based IDs)
                newEmails.sort().reverse();
                console.log(`Found ${newEmails.length} potentially new email(s). Checking...`);
                for (const newestEmailId of newEmails) {
                    const code = await this._readEmail(email, newestEmailId, token);
                    if (code) {
                        console.log("Verification code found:", code);
                        return code;
                    } else {
                        // If we can't read or find code in this email, add its ID to processed list
                         console.log(`Could not read code from email ID ${newestEmailId}.`);
                    }
                }
                 // Update lastEmailIds after checking available emails to avoid re-processing
                 lastEmailIds = currentIds;

            } else {
                // No new emails found, update lastEmailIds to current for the next loop iteration
                lastEmailIds = currentIds;
            }


            attempts++;
            if (attempts < maxAttempts) {
                 // console.log(`Attempt ${attempts}/${maxAttempts}: No new code found, waiting 2 seconds...`);
                 await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log("Monitor timeout - no verification code received within 30 seconds.");
        return null;
    }

    /**
     * Send request to get verification code sent to email.
     * @param {string} emailAddress - Email address
     * @returns {Promise<number>} - HTTP status code of the request
     * @throws {Error} If the fetch request fails network-wise or returns a hard error status
     */
    async sendVerificationCode(emailAddress) {
        try {
            const url = 'https://auth.acedata.cloud/api/v1/email-code/';
            const headers = {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            };
            const data = { 'template': '118462', 'receiver': emailAddress };
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });
             const responseBody = await response.text(); // Read body for error details

            if (!response.ok) {
                 const errorDetail = `Status: ${response.status} ${response.statusText}. Body: ${responseBody.substring(0, 200)}...`;
                 console.error(`Failed to send code request: ${errorDetail}`);
                 // Differentiate between rate limit (429) and other errors
                 if (response.status !== 429) {
                     throw new Error(`Failed to send verification code request: ${errorDetail}`);
                 }
                 return response.status; // Return status even for 429
            } else {
                 console.log(`Verification code request sent to ${emailAddress}, status: ${response.status}`);
            }
            return response.status;
        } catch (error) {
            console.error('Failed to send verification code request (network/other error):', error);
            throw error; // Re-throw network/fetch errors
        }
    }
}

// --- Key Management Class (②) ---

class KeyManager {
    constructor(configService, emailService) {
        if (!configService || !emailService) {
            throw new Error("KeyManager requires ConfigService and EmailService instances.");
        }
        this.configService = configService;
        this.emailService = emailService;
        // platform_services is accessed via configService
    }

     /**
      * Get remaining credits for a specific application ID.
      * @param {string} platformKey - The platform key for authorization.
      * @param {string} applicationId - The application ID (api_id).
      * @returns {Promise<number>} - Remaining amount as a number, or -1 on error.
      * @private
      */
     async _getRemainingCredits(platformKey, applicationId) {
         if (!platformKey || !applicationId) {
             // console.warn("_getRemainingCredits: Missing platformKey or applicationId."); // Too noisy
             return -1;
         }
         try {
             const url = `https://platform.acedata.cloud/api/v1/applications/${applicationId}`;
             const headers = { "accept": "application/json", "authorization": `Bearer ${platformKey}` };
             const response = await fetch(url, { headers });

             if (!response.ok) {
                 // Log specific errors, especially 401/403 for auth issues
                 // console.warn(`Failed to get remaining credits for app ${applicationId?.substring(0, 8)}...: Status ${response.status}`); // Also noisy
                 return -1; // Indicate error or invalid key
             }
             const data = await response.json();
             const remaining = parseFloat(data.remaining_amount);
             return isNaN(remaining) ? -1 : remaining; // Ensure it's a number
         } catch (error) {
             console.error(`_getRemainingCredits error for app ${applicationId?.substring(0, 8)}...:`, error);
             return -1; // Indicate error
         }
     }

    /**
     * Clear invalid tokens for a specified service based on its threshold and kind.
     * @param {string} name - The name of the service (e.g., 'verify', 'suno')
     * @returns {Promise<string>} - Status ('success' or 'error')
     */
    async clearInvalidTokens(name) {
      console.log(`Starting token cleanup for service: ${name}...`);
      const startTime = Date.now();

      const serviceConfig = this.configService.getServiceConfigByName(name);
      if (!serviceConfig) {
          console.error(`Cannot clear tokens: Service configuration for '${name}' not found.`);
          return "error";
      }

      const tokenListKey = `${name}_token_list`;
      const tokens = this.configService.getTokenList(name); // Get current list
      const validThreshold = serviceConfig.Valid_threshold;

      if (!Array.isArray(tokens)) {
          console.error(`Expected an array for ${tokenListKey}, but got: ${typeof tokens}. Resetting.`);
          this.configService.setTokenList(name, []); // Reset to empty array
          return "success"; // Consider it success as the invalid state is resolved
      }

      if (tokens.length === 0) {
          console.log(`No tokens found for service '${name}', cleanup skipped.`);
          return "success";
      }

      const limit = pLimit(10); // Limit to 10 concurrent validation checks

      const validationTasks = tokens.map(token =>
          limit(async () => {
              // Task for a single token validation
              // Basic structure check - if invalid structure, remove
              if (!token || typeof token !== 'object' || !token.platform_key || !token.api_id || !token.api_key) {
                  console.warn(`[${name}] Invalid token structure, removing.`);
                  return { status: 'invalid', reason: 'invalid_structure' }; // Return status only
              }

              const platformKey = token.platform_key;
              const apiId = token.api_id;

              try {
                  const remain = await this._getRemainingCredits(platformKey, apiId);

                  if (remain === -1) {
                      // API call failed or returned error status (-1 indicates failure)
                      console.warn(`[${name}] Validation check API failed for api_id ${apiId?.substring(0,8)}..., keeping token.`);
                       // Keep the token if the check fails, but flag that an error occurred during check
                      return { status: 'valid', token: token, checkError: true };
                  } else if (remain < validThreshold) {
                      // Below threshold, mark as invalid
                      console.log(`[${name}] Invalid: remain=${remain.toFixed(4)} < ${validThreshold} for api_id ${apiId?.substring(0,8)}...`);
                      return { status: 'invalid', reason: 'low_credits' };
                  } else {
                      // Valid token
                      // console.log(`[${name}] Valid: remain=${remain.toFixed(4)} >= ${validThreshold} for api_id ${apiId?.substring(0,8)}...`);
                      return { status: 'valid', token: token };
                  }
              } catch (error) {
                   // Unexpected error during _getRemainingCredits call
                   console.error(`[${name}] Unexpected error during validation for api_id ${apiId?.substring(0,8)}...:`, error);
                   // Keep the token if the check fails unexpectedly, but flag error
                   return { status: 'valid', token: token, checkError: true, error };
              }
          })
      );

      // Wait for all validation tasks to complete, regardless of success or failure
      const results = await Promise.allSettled(validationTasks);

      const validTokens = [];
      let invalidCount = 0;
      let errorOccurredDuringChecks = false; // To track if any validation check *itself* failed (remain === -1 or exception)


      results.forEach(result => {
          if (result.status === 'fulfilled') {
              const validationResult = result.value;
              if (validationResult.status === 'valid') {
                  // Add token if validation returned 'valid' status
                  validTokens.push(validationResult.token);
                  // Check if this 'valid' result came with a check error
                  if (validationResult.checkError) {
                       errorOccurredDuringChecks = true;
                  }
              } else { // status is 'invalid'
                  invalidCount++;
              }
          } else {
              // A promise was rejected unexpectedly (should ideally be caught inside the task)
              // If it happens, log and count as invalid.
              console.error(`[${name}] Token validation promise rejected unexpectedly:`, result.reason);
              invalidCount++;
              errorOccurredDuringChecks = true; // Treat unexpected rejection as an error
          }
      });


      // Update config only if changes were made
      if (invalidCount > 0 || validTokens.length !== tokens.length) {
           console.log(`Updating token list for ${name}. Removed ${invalidCount} invalid tokens.`);
           this.configService.setTokenList(name, validTokens);
      } else {
           console.log(`No invalid tokens found for ${name}. List remains unchanged.`);
      }

      const duration = (Date.now() - startTime) / 1000;
      console.log(`Finished token cleanup for ${name}. Total=${tokens.length}, Invalid=${invalidCount}, Kept=${validTokens.length}, Duration=${duration.toFixed(2)}s.`);

      // Return 'error' if any of the individual checks failed to complete successfully (e.g., network error during validation)
      // This aligns with the previous logic where `errorOccurred` led to returning "error".
      if (errorOccurredDuringChecks) {
           console.warn(`Cleanup for ${name} finished with errors during validation checks.`);
           return "error";
      }

      return "success"; // Return success if all checks completed without critical errors
  }


     /**
      * Get hCaptcha token using a verification service API key.
      * @param {string} verifyApiKey - API key for the verification service ('verify').
      * @returns {Promise<string|null>} - hCaptcha token or null on failure.
      * @private
      */
     async _getHcaptchaToken(verifyApiKey) {
         if (!verifyApiKey) {
             console.error("Cannot get hCaptcha token: verifyApiKey is missing.");
             return null;
         }
         try {
             const url = "https://api.acedata.cloud/captcha/token/hcaptcha";
             const headers = {
                 "accept": "application/json",
                 "authorization": `Bearer ${verifyApiKey}`, // Use the verify API key here
                 "content-type": "application/json"
             };
             const payload = {
                 "website_key": "663c73ac-ca1c-42b0-9cca-45de991ad32c", // Hardcoded website key
                 "website_url": "https://auth.acedata.cloud"
             };
             const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
             const data = await response.json(); // Always try to parse JSON for potential error messages

             if (!response.ok) {
                 const errorBody = data?.detail || JSON.stringify(data);
                 console.error(`_getHcaptchaToken HTTP error! Status: ${response.status}. Response: ${errorBody.substring(0, 200)}`);
                 // Consider checking data for specific error codes if needed
                 return null;
             }
             console.log("hCaptcha token obtained successfully.");
             return data.token;
         } catch (error) {
             console.error('Failed to get hCaptcha token:', error);
             return null;
         }
     }

      /**
      * Finds a valid 'verify' token from the pool or uses the initial one.
      * The balance check for verify tokens is skipped per requirement for generation.
      * @returns {Promise<string|null>} A usable verify API key string or null if none found.
      * @private
      */
     async _getVerifyApiKeyForGeneration() {
         console.log("Searching for a 'verify' API key for generation...");
         const verifyService = this.configService.getServiceConfigByName('verify');
         if (!verifyService) {
             console.error("Verify service config missing! Cannot get verify key.");
             return null;
         }

         const verifyTokens = this.configService.getTokenList('verify');
         const availableTokens = [...verifyTokens]; // Create a mutable copy

         // Prioritize tokens from the pool (even if not checked for balance here, they have platform_key/api_id)
         while (availableTokens.length > 0) {
              // Pick a random token from the remaining pool
              const randomIndex = Math.floor(Math.random() * availableTokens.length);
              const tokenObj = availableTokens.splice(randomIndex, 1)[0]; // Pick and remove

              // Ensure the token object has the necessary key structure
              if (tokenObj?.api_key) { // Only need the api_key for the next step (_getSingleSetOfKeys calls _getHcaptchaToken)
                 console.log(`Using verify token from pool (api_id: ${tokenObj.api_id?.substring(0,8)}...).`);
                 return tokenObj.api_key;
             } else {
                 console.warn("Found verify token in pool with invalid structure, skipping.");
                 // Optionally remove malformed tokens from the pool here
                 // const updatedList = this.configService.getTokenList('verify').filter(t => t !== tokenObj);
                 // this.configService.setTokenList('verify', updatedList);
             }
         }

         // If pool is empty or all tokens in pool were malformed, use the initial verify token
          const initialVerifyKey = this.configService.get('AI音乐.tokenpool.initial_verify_token');
          if (initialVerifyKey) {
              console.log("No usable verify token in pool, attempting to use initial_verify_token.");
              // Per requirement, do NOT check balance for initial_verify_token
              return initialVerifyKey;
          }

         console.error("No valid 'verify' token found in pool and no initial_verify_token configured. Cannot generate new tokens.");
         return null;
     }


     /**
      * Register a new user account.
      * @param {string} email - Email address.
      * @param {string} code - Verification code from email.
      * @param {string} hcaptchaKey - hCaptcha token.
      * @returns {Promise<object|null>} - Registration response object or null on failure.
      * @private
      */
     async _register(email, code, hcaptchaKey) {
         if (!email || !code || !hcaptchaKey) {
              console.error("Cannot register: Missing email, code, or hcaptchaKey.");
              return null;
         }
         try {
             const url = "https://auth.acedata.cloud/api/v1/users/";
             const payload = { email, "email_code": code, "password": "srtgstr", "captcha": hcaptchaKey }; // Hardcoded password
             const headers = { 'Accept': "application/json", 'Content-Type': "application/json" };
             const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
             const data = await response.json(); // Always try to parse JSON

             if (!response.ok) {
                 const errorDetail = data?.detail || JSON.stringify(data);
                 console.error(`_register HTTP error! Status: ${response.status}. Response: ${errorDetail.substring(0, 200)}`);
                 // Check for specific errors like email already exists, invalid code, invalid captcha
                 return null;
             }
             console.log(`User registered successfully for ${email}`);
             return data;
         } catch (error) {
             console.error('Failed to register:', error);
             return null;
         }
     }

     /**
      * Login to an existing account.
      * @param {string} email - Email address.
      * @param {string} password - Password (hardcoded "srtgstr").
      * @returns {Promise<{access_token: string, user_id: string}|null>} - Object with tokens or null on failure.
      * @private
      */
     async _login(email, password = "srtgstr") {
         if (!email || !password) {
             console.error("Cannot login: Missing email or password.");
             return null;
         }
         try {
             const url = "https://auth.acedata.cloud/api/v1/auth/login/";
             const payload = { email, password };
             const headers = { 'Accept': "application/json", 'Content-Type': "application/json" };
             const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
             const data = await response.json(); // Always try to parse JSON

             if (!response.ok) {
                 const errorDetail = data?.detail || JSON.stringify(data);
                 console.error(`_login HTTP error! Status: ${response.status}. Response: ${errorDetail.substring(0, 200)}`);
                 // Check for specific errors like invalid credentials
                 return null;
             }
             console.log(`Login successful for ${email}`);
             return { access_token: data.access_token, user_id: data.user_id };
         } catch (error) {
             console.error('Failed to login:', error);
             return null;
         }
     }

     /**
      * Request a service-specific API key (application credential).
      * @param {string} accessToken - User's access token from login.
      * @param {string} userId - User's ID from login.
      * @param {string} serviceId - The ID of the target service (e.g., for 'suno' or 'verify').
      * @returns {Promise<{apiKey: string, apiId: string}|null>} - Object with key and app ID or null on failure.
      * @private
      */
    async _requestServiceKey(accessToken, userId, serviceId) {
        if (!accessToken || !userId || !serviceId) {
            console.error("Cannot request service key: Missing access_token, user_id, or serviceId.");
            return null;
        }
        const commonHeaders = {
            'Accept': "application/json",
            'Content-Type': "application/json",
            'authorization': `Bearer ${accessToken}`,
            'x-user-id': userId
        };

        try {
            // 1. Create Application
            const appUrl = "https://platform.acedata.cloud/api/v1/applications/";
            const appPayload = { "service_id": serviceId };
            const appResponse = await fetch(appUrl, { method: 'POST', headers: commonHeaders, body: JSON.stringify(appPayload) });
             const appData = await appResponse.json(); // Always try to parse JSON

            if (!appResponse.ok) {
                 const errorDetail = appData?.detail || JSON.stringify(appData);
                 // Check for 409 Conflict - Application already exists for this service/user
                 if (appResponse.status === 409) {
                     console.warn(`Application for service ${serviceId?.substring(0,8)}... already exists.`);
                     // We might need to fetch the existing application ID here.
                     // For now, let's simplify: if creation fails with 409, assume we can't proceed this way.
                      throw new Error(`Create Application HTTP error! Status: ${appResponse.status}. Response: ${errorDetail.substring(0, 200)}`);
                 }
                throw new Error(`Create Application HTTP error! Status: ${appResponse.status}. Response: ${errorDetail.substring(0, 200)}`);
            }
            const applicationId = appData.id; // This is the api_id
            console.log(`Application created with ID: ${applicationId?.substring(0,8)}... for service ${serviceId?.substring(0,8)}...`);

            // 2. Create Credential (API Key) for the Application
            const credUrl = "https://platform.acedata.cloud/api/v1/credentials/";
            const credPayload = { "application_id": applicationId };
            const credResponse = await fetch(credUrl, { method: 'POST', headers: commonHeaders, body: JSON.stringify(credPayload) });
            const credData = await credResponse.json(); // Always try to parse JSON

            if (!credResponse.ok) {
                 const errorDetail = credData?.detail || JSON.stringify(credData);
                throw new Error(`Create Credential HTTP error! Status: ${credResponse.status}. Response: ${errorDetail.substring(0, 200)}`);
            }
            const apiKey = credData.token; // This is the api_key
            console.log(`Credential (API Key) created successfully for app ${applicationId?.substring(0,8)}...`);

            // The original Python code listed credentials to get the key, which seems redundant
            // if the POST /credentials endpoint directly returns the token. Let's trust the POST response.

            return { apiKey: apiKey, apiId: applicationId };

        } catch (error) {
            console.error(`Failed to request service key for service ID ${serviceId?.substring(0,8)}...:`, error);
            return null;
        }
    }


     /**
      * Get a platform token (seems distinct from service keys).
      * @param {string} accessToken - User's access token.
      * @param {string} userId - User's ID.
      * @returns {Promise<string|null>} - Platform token or null on failure.
      * @private
      */
     async _getPlatformKey(accessToken, userId) {
         if (!accessToken || !userId) {
             console.error("Cannot get platform key: Missing access_token or user_id.");
             return null;
         }
         try {
             const url = "https://platform.acedata.cloud/api/v1/platform-tokens/";
             const headers = {
                 'Accept': "application/json",
                 'Content-Type': "application/json",
                 'authorization': `Bearer ${accessToken}`,
                 'x-user-id': userId
             };
             const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({}) });
             const data = await response.json(); // Always try to parse JSON

             if (!response.ok) {
                 const errorDetail = data?.detail || JSON.stringify(data);
                 console.error(`_getPlatformKey HTTP error! Status: ${response.status}. Response: ${errorDetail.substring(0, 200)}`);
                 return null;
             }
             console.log("Platform key obtained successfully.");
             return data.token;
         } catch (error) {
             console.error('Failed to get platform key:', error);
             return null;
         }
     }

    /**
     * Attempts to get a set of API keys for all configured services using a single valid verification API key.
     * @param {string} verifyApiKey - A valid API key for the 'verify' service (obtained from pool or initial).
     * @returns {Promise<object|null>} - An object mapping service names to their key details ({ platform_key, api_id, api_key }), or null if generation fails at any critical step. Returns an empty object if no services were successfully generated.
     * @private
     */
    async _getSingleSetOfKeys(verifyApiKey) {
        if (!verifyApiKey) {
             console.error("Cannot generate key set: No verify API key provided.");
             return null;
        }
        console.log("Attempting to generate a new set of API keys...");
        let emailAddress = '';
        try {
            // 1. Get hCaptcha Token using the provided verifyApiKey
            const hcaptchaKey = await this._getHcaptchaToken(verifyApiKey);
            if (!hcaptchaKey) {
                 console.error("Key generation failed: Could not obtain hCaptcha token.");
                 return null;
            }

            // 2. Generate Temporary Email & Send Code
            emailAddress = this.emailService.generateAddress();
            console.log(`Generated temporary email: ${emailAddress}`);
            const sendStatus = await this.emailService.sendVerificationCode(emailAddress);
            // Check for specific fatal errors, allow transient ones like 429 (though sendCode throws on others)
            if (sendStatus >= 400 && sendStatus !== 429) {
                 console.error(`Failed to send verification code request (Status: ${sendStatus}), aborting key generation.`);
                 return null; // Fatal error, stop
            }


            // 3. Monitor for Verification Code
            const code = await this.emailService.monitorAndRead(emailAddress);
            if (!code) {
                console.error('Failed to receive verification code via email. Aborting key generation.');
                return null;
            }
            console.log(`Received verification code: ${code}`);

            // 4. Register Account
            const registerResult = await this._register(emailAddress, code, hcaptchaKey);
            if (!registerResult) {
                 console.error(`Registration failed for ${emailAddress}. Aborting key generation.`);
                 return null;
            }

            // 5. Login
            const loginResult = await this._login(emailAddress); // Uses default password
            if (!loginResult) {
                 console.error(`Login failed for ${emailAddress}. Aborting key generation.`);
                 return null;
            }
            const { access_token, user_id } = loginResult;

            // 6. Get Platform Key (Seems common for all services under this account)
            const platformKey = await this._getPlatformKey(access_token, user_id);
            if (!platformKey) {
                 console.error(`Failed to get platform key for user ${user_id}. Aborting key generation.`);
                 return null;
            }

            // 7. Request Keys for Each Service Defined in ConfigService
            const generatedKeys = {};
            let anyServiceKeyGenerated = false;

            const servicesToGenerate = this.configService.getPlatformServices();
            if (servicesToGenerate.length === 0) {
                console.warn("No services defined in configService.platform_services to generate keys for.");
            }

            for (const service of servicesToGenerate) {
                console.log(`Requesting key for service: ${service.name}...`);
                 // Skip if service_id is missing (e.g., placeholder verify)
                 if (!service.service_id || service.service_id.includes("MISSING")) {
                      console.warn(`Skipping key generation for service '${service.name}': service_id is missing or invalid.`);
                      continue;
                 }
                 try {
                     const keyResult = await this._requestServiceKey(access_token, user_id, service.service_id);
                     if (keyResult) {
                         // Store the generated key info using the service name
                         generatedKeys[service.name] = {
                             platform_key: platformKey, // Common platform key
                             api_id: keyResult.apiId,
                             api_key: keyResult.apiKey
                         };
                         console.log(`Successfully obtained key for ${service.name}.`);
                         anyServiceKeyGenerated = true;
                     } else {
                         console.warn(`Failed to obtain key for service: ${service.name}.`);
                         // Do not add null entries, just skip if failed
                     }
                 } catch (serviceError) {
                     console.error(`Error requesting key for service ${service.name}:`, serviceError);
                      // Do not add failed keys
                 }
             }

            if (!anyServiceKeyGenerated) {
                console.error("Key generation process finished, but failed to obtain keys for any configured service.");
                 // Decide if this is a fatal error or just means no *new* keys were added.
                 // Returning an empty object might be better than null here, indicating the process ran but yielded no *new* keys.
                 // However, if critical services like 'verify' or 'music' failed, it's effectively an error.
                 // Let's return an object containing results for each service, even if null, to show status.
                 // Let's revise: The _getSingleSetOfKeys is meant to produce a *set*. If *any* service defined fails, the set is incomplete.
                 // But the requirement is to generate *all* items in the list. We should return the object with results for each.
                 // Reverting to object return. If the necessary keys (like 'verify' or 'suno') are null in the result, the caller should handle it.
            }

            console.log("Finished attempting to generate key set. Results:", generatedKeys);
            return generatedKeys; // Return the map of generated keys (may contain nulls for failed services)

        } catch (error) {
            console.error('Critical error during key generation process:', error);
            if (emailAddress) console.error(`Process failed for email: ${emailAddress}`);
            return null; // Indicate a fatal error in the process itself
        }
    }

    /**
     * Generates a new set of tokens for all configured services and adds them to the pool.
     * Requires a usable 'verify' API key (either from pool or initial_verify_token).
     * @returns {Promise<string>} - Status ('success' or 'error')
     */
    async generateTokens() {
        console.log("Starting token generation process...");
        // Get a verify key (from pool or initial) WITHOUT checking its balance first
        const verifyApiKey = await this._getVerifyApiKeyForGeneration();

        if (!verifyApiKey) {
            console.error("Token generation failed: No usable 'verify' API key available to initiate the process.");
            return "error";
        }
        console.log("Using verify API key to generate new tokens..."); // Log that we are proceeding

        // Use the obtained verify API key to generate a new set of keys for all services
        const newKeySet = await this._getSingleSetOfKeys(verifyApiKey);

        // _getSingleSetOfKeys returns null on fatal process error (hCaptcha, email, registration, login, platform key)
        // It returns an object (potentially with null service entries) if the process itself worked
        if (newKeySet === null) {
             console.error("Token generation failed: Critical error during the key generation process.");
             return "error";
        }

        let addedCount = 0;
        let generationFailedForCriticalServices = false;

        // Add the newly generated keys to their respective pools
        const allConfiguredServices = this.configService.getPlatformServices();

        for (const service of allConfiguredServices) {
            const serviceName = service.name;
            const generatedKeyInfo = newKeySet[serviceName]; // Get the result for this specific service

             if (generatedKeyInfo && generatedKeyInfo.platform_key && generatedKeyInfo.api_id && generatedKeyInfo.api_key) {
                 // Valid structure for adding to pool
                 const tokenList = this.configService.getTokenList(serviceName);
                 // Check if this specific token already exists to avoid duplicates (optional but good)
                 const exists = tokenList.some(token => token.api_key === generatedKeyInfo.api_key && token.api_id === generatedKeyInfo.api_id);
                 if (!exists) {
                     tokenList.push(generatedKeyInfo); // Add the new token object
                     this.configService.setTokenList(serviceName, tokenList);
                     console.log(`Added new token to pool for service: ${serviceName}`);
                     addedCount++;
                 } else {
                     console.log(`Token for service '${serviceName}' already exists in pool, skipping addition.`);
                 }
             } else {
                 console.warn(`Generated key information for service '${serviceName}' is invalid or missing.`);
                 // If critical services like 'verify' or 'suno' failed generation, flag it as an error state for the whole process
                 if (service.kind === 'verify' || service.kind === 'music') {
                     console.error(`Key generation failed for critical service: ${serviceName}`);
                     generationFailedForCriticalServices = true;
                 }
             }
         }

        if (addedCount > 0) {
            console.log(`Token generation process completed. Added ${addedCount} new token(s) to pools.`);
            return "success";
        } else if (generationFailedForCriticalServices) {
            console.error("Token generation process finished, but failed to obtain keys for critical services (verify/music).");
             return "error"; // Treat failure for critical services as overall error
        }
         else {
            console.warn("Token generation process finished, but no new tokens were added (either none generated or all were duplicates).");
             return "success"; // Process completed without critical failure, even if nothing was added
        }
    }

     /**
      * Get a valid API key for a specific service by name, validating its remaining credits if it's a pool token.
      * Returns the api_key string.
      * @param {string} name - The service name (e.g., 'suno').
      * @returns {Promise<string|null>} The api_key string or null if none found/valid.
      */
    async getValidKey(name) {
         console.log(`Searching for a valid '${name}' API key...`);
         const serviceConfig = this.configService.getServiceConfigByName(name);
         if (!serviceConfig) {
             console.error(`Cannot get key: Service configuration for '${name}' not found.`);
             return null;
         }

         const tokens = this.configService.getTokenList(name);
         const availableTokens = [...tokens]; // Create a mutable copy

         while (availableTokens.length > 0) {
             // Pick a random token from the remaining available pool tokens
             const randomIndex = Math.floor(Math.random() * availableTokens.length);
             const tokenObj = availableTokens.splice(randomIndex, 1)[0]; // Pick and remove

             // Pool tokens must have this structure for validation
             if (!tokenObj?.platform_key || !tokenObj?.api_id || !tokenObj?.api_key) {
                  console.warn(`Found '${name}' token in pool with invalid structure, skipping.`);
                  // Optionally remove malformed tokens from the pool here
                  // const updatedList = this.configService.getTokenList(name).filter(t => t !== tokenObj);
                  // this.configService.setTokenList(name, updatedList);
                  continue;
             }

             try {
                 // Check balance ONLY for tokens retrieved from the pool list
                 const remain = await this._getRemainingCredits(tokenObj.platform_key, tokenObj.api_id);

                 if (remain !== -1 && remain >= serviceConfig.Valid_threshold) {
                     console.log(`Found valid '${name}' token from pool (api_id: ${tokenObj.api_id?.substring(0,8)}..., remain: ${remain.toFixed(4)})`);
                     return tokenObj.api_key; // Return the API key string
                 } else {
                     console.log(`'${name}' token from pool (api_id: ${tokenObj.api_id?.substring(0,8)}...) is invalid or low credits (remain=${remain}), removing.`);
                     // Remove invalid token from the actual stored list
                      const updatedList = this.configService.getTokenList(name).filter(t => t.api_key !== tokenObj.api_key || t.api_id !== tokenObj.api_id);
                      this.configService.setTokenList(name, updatedList);
                 }
             } catch (error) {
                 console.error(`Error validating '${name}' token from pool (api_id: ${tokenObj.api_id?.substring(0,8)}...):`, error);
                 // If validation itself errors, remove the token from the pool as it's likely problematic
                 const updatedList = this.configService.getTokenList(name).filter(t => t.api_key !== tokenObj.api_key || t.api_id !== tokenObj.api_id);
                 this.configService.setTokenList(name, updatedList);
             }
         }

         // Fallback: If no valid token is found in the pool for this specific service name,
         // check the general AI音乐.api_key if configured. This assumes the fallback key might work for this service.
          const fallbackKey = this.configService.get(`AI音乐.api_key`);
          if (fallbackKey) {
             console.warn(`No valid token found in pool for '${name}'. Falling back to general AI音乐.api_key.`);
             return fallbackKey; // Return the fallback key string
          }

         console.error(`No valid '${name}' token could be found in the pool or as a fallback.`);
         return null;
    }
}


// --- Music Generator Class (③) ---

class MusicGenerator {
    constructor(configService, keyManager) {
         if (!configService || !keyManager) {
            throw new Error("MusicGenerator requires ConfigService and KeyManager instances.");
        }
        this.configService = configService;
        this.keyManager = keyManager;
    }

    /**
     * Calls the appropriate music generation API based on the model name and other parameters.
     * Handles API key retrieval, payload formatting based on model/params,
     * fetch request, response handling, and file downloads.
     * This is the single function responsible for all music API interactions.
     *
     * @param {object} params - An object containing all parameters:
     * @param {string} params.modelName - Name of the music model (e.g., 'suno').
     * @param {string} params.musicDir - Directory to save music files.
     * @param {string} params.musicNameBase - Base filename for music (e.g., 'background', 'end_123').
     * @param {string} params.filePathBase - Full path base (musicDir/musicNameBase).
     * @param {string|null} params.jsonFilePath - Full path to save LLM JSON (for end music), or null.
     * @param {object|null} params.llmResultData - The raw JSON object received from the LLM.
     * @param {boolean} params.instrumental - True if instrumental music is requested.
     * @param {boolean} params.custom - True if custom lyrics/style are provided.
     * @param {string} [params.prompt] - Text prompt for instrumental music.
     * @param {string} [params.title] - Title for the music.
     * @param {string} [params.lyrics] - Lyrics for custom music.
     * @param {string} [params.style] - Style for custom music.
     * @param {Function} updateStatus - Callback to update status messages.
     *
     * @returns {Promise<boolean>} - True on success, False on failure.
     * @private
     */
    async _executeMusicApiCall(params) {
        const {
            modelName, musicDir, musicNameBase, filePathBase, jsonFilePath,
            llmResultData, instrumental, custom, prompt, title, lyrics, style, // include style
            updateStatus
        } = params;

        updateStatus(`生成音乐：获取 ${modelName} API Key...`);
        const apiKey = await this.keyManager.getValidKey(modelName);

        if (!apiKey) {
            const errorMsg = `生成音乐失败：无法获取有效的 ${modelName} API Key。`;
            updateStatus(errorMsg);
            console.error(errorMsg);
            return false;
        }
        let baseUrl = `https://api.acedata.cloud/${modelName}/audios`;

        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        let apiPayload;

        // --- Model-Specific Payload Formatting (using if/else) ---
        if (modelName === 'suno') {
             // Assume 'suno' corresponds to 'chirp-v4' model as per original code
             // Payload structure differs for instrumental vs custom in the original code
             baseUrl ="https://api.acedata.cloud/suno/audios";
             if (instrumental) {
                 apiPayload = {
                     "action": "generate",
                     "model": "chirp-v4-5",
                     "instrumental": true,
                     "custom": false, // Explicitly false for instrumental
                     "prompt": prompt,
                     "title": title
                     // lyric and style are omitted for instrumental
                 };
             } else if (custom) { // Assuming custom implies non-instrumental with lyrics/style
                  apiPayload = {
                     "action": "generate",
                     "model": "chirp-v4", // Assuming custom also uses chirp-v4
                     "instrumental": false, // Explicitly false for custom lyric
                     "custom": true, // Explicitly true for custom lyric
                     "lyric": lyrics, // Note: Suno API uses 'lyric' singular
                     "style": style,
                     "title": title
                     // prompt is omitted for custom
                  };
             } else {
                 // This case shouldn't happen if called correctly (either instrumental or custom)
                 const errorMsg = `生成音乐失败：Suno模型需要指定 instrumental 或 custom 模式。`;
                 updateStatus(errorMsg);
                 console.error(errorMsg);
                 return false;
             }
        }

        else if(modelName === 'udio'){
            if (instrumental) {
                apiPayload = {
                    "action": "generate",
                    "model": "udio130-v1.5",
                    "lyrics_type": "instrumental",
                    "prompt": prompt
                };
            } else if (custom) { // Assuming custom implies non-instrumental with lyrics/style
                 apiPayload = {
                    "action": "generate",
                    "model": "udio130-v1.5", 
                    "lyrics_type": "user",
                    "lyric": lyrics, // Note: Suno API uses 'lyric' singular
                    "prompt": prompt
                 };
            } else {
                // This case shouldn't happen if called correctly (either instrumental or custom)
                const errorMsg = `生成音乐失败：udio模型需要指定 instrumental 或 custom 模式。`;
                updateStatus(errorMsg);
                console.error(errorMsg);
                return false;
            }
       }
        // --- Add else if blocks for other modelNames here ---
        // else if (modelName === 'another_music_model') {
        //     // Format payload specific to 'another_music_model'
        //     // Access params like prompt, title, lyrics, style, instrumental, custom
        //     apiPayload = { /* specific payload structure */ };
        // }
        else {
            // Handle unsupported model
            const errorMsg = `生成音乐失败：不支持或未实现的音乐模型： ${modelName}`;
            updateStatus(errorMsg);
            console.error(errorMsg);
            return false;
        }
        // --- End Model-Specific Payload Formatting ---


        console.log(`开始调用 ${modelName} API生成音乐...`);
        updateStatus(`生成音乐：调用 ${modelName} API...`);


        const timeoutDuration = 600000; 
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
        try {
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(apiPayload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            let apiResponseData;
            try {
                 // Always try to parse JSON, even on error, for better error messages
                 apiResponseData = await response.json();
            } catch (e) {
                 clearTimeout(timeoutId);
                 // Handle case where response is not JSON (e.g., plain text error)
                 const errorText = await response.text();
                 throw new Error(`API响应解析失败或非JSON格式. Status: ${response.status}. Body: ${errorText.substring(0, 200)}`);
            }


            if (!response.ok) {
                 clearTimeout(timeoutId);
                 const errorDetail = apiResponseData?.detail || JSON.stringify(apiResponseData);
                 throw new Error(`音乐API响应错误: ${response.status} ${response.statusText} - ${errorDetail.substring(0, 200)}`);
            }

            console.log("音乐API响应:", apiResponseData);

            // --- Model-Specific Response Handling & URL Extraction ---
            let audioUrl1, audioUrl2, videoUrl1, videoUrl2;

            if (modelName === 'suno'||modelName === 'udio') {
                 // Validate Suno response structure (based on original code's expectation)
                 if (!apiResponseData || !apiResponseData.data || !Array.isArray(apiResponseData.data) || apiResponseData.data.length < 1) {
                   console.error("Suno API返回数据结构无效:", apiResponseData);
                   throw new Error("Suno API返回数据结构无效。");
                 }
                 // Extract URLs - handle cases where only one result is returned
                 audioUrl1 = apiResponseData.data[0]?.audio_url;
                 audioUrl2 = apiResponseData.data.length > 1 ? apiResponseData.data[1]?.audio_url : null;
                 videoUrl1 = apiResponseData.data[0]?.video_url;
                 videoUrl2 = apiResponseData.data.length > 1 ? apiResponseData.data[1]?.video_url : null;

                 if (!audioUrl1) { // Must have at least one audio URL
                     console.error("Suno API返回数据缺少audio_url:", apiResponseData.data[0]);
                     throw new Error("Suno API返回数据缺少必需的 audio_url。");
                 }
                  // If 2nd result was expected but missing audio
                  if (custom && apiResponseData.data.length < 2 || (apiResponseData.data.length > 1 && !audioUrl2)) {
                      console.warn("Suno API expected 2 results for custom music but got less or missing 2nd audio URL.");
                  }

            }
            // --- Add else if blocks for other modelNames here ---
            // else if (modelName === 'another_music_model') {
            //     // Extract URLs based on 'another_music_model's response structure
            //      // Example: audioUrl1 = apiResponseData?.results?.[0]?.audio_file;
            // }
            else {
                 // Should be caught by the payload formatting step, but double check
                 console.error(`生成音乐失败：不支持的音乐模型响应处理： ${modelName}`);
                 return false; // Should not happen
            }
            // --- End Model-Specific Response Handling & URL Extraction ---


            // --- Download and Save Files ---
            // Ensure directories exist
            await createFolder(musicDir).catch(e => console.warn("Failed to ensure music directory exists:", e));
            if (jsonFilePath) {
                const jsonParentDir = `/data/${this.configService.getStoryTitle()}`; // Get story title again
                await createFolder(jsonParentDir).catch(e => console.warn("Failed to ensure json directory exists:", e));
            }

            // Save LLM response JSON (only if jsonFilePath is provided)
            let jsonSaveSuccess = true;
            if (jsonFilePath && llmResultData) {
                 updateStatus("生成音乐：保存LLM原始响应 JSON...");
                 try {
                     // Save the raw LLM JSON object
                     await writeFile(jsonFilePath, JSON.stringify(llmResultData, null, 2)); // Pretty print
                     console.log(`LLM响应 JSON 已保存到 ${jsonFilePath}`);
                 } catch (e) {
                     console.error(`保存LLM响应 JSON 失败:`, e);
                     updateStatus(`生成音乐：保存LLM响应 JSON 失败: ${e.message}`);
                     jsonSaveSuccess = false; // This is not a fatal error for music generation
                 }
            }


            // Download Audio Files (mandatory)
            let audioDownloadSuccess = true;
            audioDownloadSuccess = await this._downloadFile(audioUrl1, `${filePathBase}.mp3`, "音频 1", updateStatus);

            // Download second audio if available (optional for success, but logged if fails)
            if (audioUrl2) {
                 await this._downloadFile(audioUrl2, `${filePathBase}1.mp3`, "音频 2", updateStatus);
                 // Note: We don't AND this to audioDownloadSuccess because the request might provide only one.
                 // The critical check is audioUrl1 being downloaded.
            } else if (custom) { // If custom music, typically expects 2 results, warn if only 1
                 console.warn("Only one audio result URL provided by the API for custom music.");
            }


            // Download Video Files (optional)
            if (videoUrl1) {
               await this._downloadFile(videoUrl1, `${filePathBase}.mp4`, "视频 1 (可选)", updateStatus);
            }
            if (videoUrl2) {
               await this._downloadFile(videoUrl2, `${filePathBase}1.mp4`, "视频 2 (可选)", updateStatus);
            }

            // --- Final Result ---
            if (audioDownloadSuccess) {
                updateStatus("生成音乐：音乐文件下载完成！");
                console.log("音乐文件下载完成！");
                return true; // Success if mandatory audio downloaded
            } else {
                 const errorMsg = `生成音乐失败：关键音频文件下载失败。`;
                 updateStatus(errorMsg);
                 console.error(errorMsg);
                 return false; // Failure if mandatory audio download failed
            }

        } catch (e) {
            const errorMsg = `生成音乐失败 (API调用或文件处理): ${e.message}`;
            updateStatus(errorMsg);
            console.error(errorMsg);
            return false; // Catch any exceptions during fetch or file ops
        }
    }

     /**
      * Helper function to download and save a single file.
      * @param {string} url - URL to download from.
      * @param {string} filePath - Path to save the file in IndexedDB.
      * @param {string} fileType - Description for logging (e.g., "音频 1").
      * @param {Function} updateStatus - Status update callback.
      * @returns {Promise<boolean>} - True on success, false on failure.
      * @private
      */
     async _downloadFile(url, filePath, fileType, updateStatus) {
         if (!url) {
             console.warn(`Skipping download for ${fileType}: URL is missing.`);
             return true; // Not a failure if URL wasn't provided (e.g., optional video or 2nd audio missing)
         }
         // updateStatus(`生成音乐：下载并保存 ${fileType}...`); // Can be noisy, let console log handle it
         console.log(`下载 ${fileType}: ${url}`);
         try {
             const response = await fetch(url);
             if (!response.ok) {
                 throw new Error(`下载 ${fileType} 失败: ${response.status} ${response.statusText}`);
             }
             const blob = await response.blob();
             await writeFile(filePath, blob);
             console.log(`文件 ${filePath} 已下载并保存。`);
             return true;
         } catch (e) {
             console.error(`下载或保存 ${fileType} 失败 (${filePath}):`, e);
             // Don't necessarily updateStatus here for optional files, but maybe for critical ones
             // updateStatus(`生成音乐：下载或保存 ${fileType} 失败: ${e.message}`);
             return false;
         }
     }


    /**
     * Generate background music.
     * @param {Function} updateStatus - Function to update status messages.
     * @returns {Promise<boolean>} True on success, False on failure.
     */
    async generateBackgroundMusic(updateStatus) {
        console.log("Starting background music generation...");
        const config = this.configService.load(); // Ensure latest config is loaded (optional, ConfigService loads on init)
        const storyTitle = this.configService.getStoryTitle();
        const modelName = this.configService.getMusicApiModel(); // Get preferred music model name

         if (!storyTitle) {
            const errorMsg = "生成背景音乐失败：故事标题未在配置中找到。";
            updateStatus(errorMsg);
            console.error(errorMsg);
            return false;
         }
         if (!modelName) {
             const errorMsg = "生成背景音乐失败：未找到可用的音乐模型配置。";
             updateStatus(errorMsg);
             console.error(errorMsg);
             return false;
         }


        const musicDir = `/data/${storyTitle}/music`;
        const musicNameBase = "background";
        const filePathBase = `${musicDir}/${musicNameBase}`;
        const jsonFilePath = null; // No JSON file saved for background music


        updateStatus("生成背景音乐：处理Prompt...");
        let prompt1, prompt2;
        try {
             [prompt1, prompt2] = await processPrompt('背景音乐生成'); // Assumes processPrompt exists and works
             if (!prompt1 || !prompt2) {
                  throw new Error("ProcessPrompt returned insufficient prompts.");
             }
        } catch (e) {
            const errorMsg = `生成背景音乐失败：处理Prompt失败: ${e.message}`;
            updateStatus(errorMsg);
            console.error(errorMsg);
            return false;
        }


        const llmId = Math.floor(Math.random() * 100000) + 1;
        let llmResultData = null;
        let gptAttempts = 0;
        const maxGptAttempts = 5;

        updateStatus("生成背景音乐：调用LLM生成音乐信息...");
        while (llmResultData === null && gptAttempts < maxGptAttempts) {
            gptAttempts++;
            updateStatus(`生成背景音乐：调用LLM (尝试 ${gptAttempts}/${maxGptAttempts})...`);
            try {
                const llmContext = 'background_music'; // Context for LLM
                const jsonString = await gpt(prompt1, prompt2, llmContext, llmId);

                if (jsonString === "error" || jsonString === "over_times") {
                     console.warn(`LLM returned '${jsonString}'. ${jsonString === 'over_times' ? 'Max attempts reached.' : 'Retrying...'}`);
                     if (jsonString === "over_times") break;
                     await new Promise(resolve => setTimeout(resolve, 1000));
                     continue;
                 }

                 const data = this.configService.extractJson(jsonString);

                 // Validate structure for background music: needs title, prompt
                 if (data !== "error" && typeof data === 'object' && data !== null && typeof data.title === 'string' && typeof data.prompt === 'string') {
                    llmResultData = data; // Store the raw object
                    console.log("LLM response structure valid for background music.");
                 } else {
                    console.warn("LLM response has invalid structure or type for background music. Retrying... Data:", data);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                 }

            } catch (e) {
                console.error("LLM call failed:", e);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        gptDestroy(llmId); // Clean up LLM session

        if (llmResultData === null) {
            const errorMsg = `生成背景音乐失败：无法从LLM获取有效音乐信息 (尝试 ${maxGptAttempts} 次失败)。`;
            updateStatus(errorMsg);
            console.error(errorMsg);
            return false;
        }

        // Extract needed data for API call
        const { title, prompt } = llmResultData;

        // --- Execute the single API call function ---
        const apiCallParams = {
            modelName,
            musicDir,
            musicNameBase,
            filePathBase,
            jsonFilePath, // null for background
            llmResultData, // Pass the LLM result object
            instrumental: true, // Background music is instrumental
            custom: false, // Background music is not custom lyric
            prompt: prompt,
            title: title,
            lyrics: null, // N/A for instrumental
            style: null,  // N/A for instrumental
            updateStatus
        };

        const success = await this._executeMusicApiCall(apiCallParams);

        if (success) {
            updateStatus("生成背景音乐：完成");
        } else {
            updateStatus("生成背景音乐：失败");
            return "error"
        }

        return success; // Return boolean result
    }

    /**
     * Generate ending music for a specific story ending.
     * @param {string} storyId - Identifier for the story ending (used in file names).
     * @param {Function} updateStatus - Function to update status messages.
     * @returns {Promise<boolean>} True on success, False on failure.
     */
    async generateEndMusic(storyId, updateStatus=console.log) {
        console.log(`Starting ending music generation for storyId: ${storyId}...`);
        if (!storyId) {
            const errorMsg = "生成结尾音乐失败：必须提供 storyId。";
            updateStatus(errorMsg);
            console.error(errorMsg);
            return false;
        }
        const config = this.configService.load(); // Ensure latest config is loaded
        const storyTitle = this.configService.getStoryTitle();
        const modelName = this.configService.getMusicApiModel(); // Get preferred music model name


         if (!storyTitle) {
            const errorMsg = "生成结尾音乐失败：故事标题未在配置中找到。";
            updateStatus(errorMsg);
            console.error(errorMsg);
            return false;
         }
          if (!modelName) {
             const errorMsg = "生成结尾音乐失败：未找到可用的音乐模型配置。";
             updateStatus(errorMsg);
             console.error(errorMsg);
             return false;
         }

        const storyIdStr = String(storyId); // Ensure storyId is string
        const musicDir = `/data/${storyTitle}/music`;
        const musicNameBase = `end_${storyIdStr}`;
        const filePathBase = `${musicDir}/${musicNameBase}`;
        const jsonFilePath = `/data/${storyTitle}/end_${storyIdStr}_music.json`; // Save JSON for end music


        updateStatus("生成结尾音乐：处理Prompt...");
        let prompt1, prompt2;
        try {
             [prompt1, prompt2] = await processPrompt('结尾音乐生成'); // Assumes processPrompt exists and works
              if (!prompt1 || !prompt2) {
                  throw new Error("ProcessPrompt returned insufficient prompts.");
              }
        } catch (e) {
            const errorMsg = `生成结尾音乐失败：处理Prompt失败: ${e.message}`;
            updateStatus(errorMsg);
            console.error(errorMsg);
            return false;
        }


        const llmId = Math.floor(Math.random() * 100000) + 1;
        let llmResultData = null;
        let gptAttempts = 0;
        const maxGptAttempts = 5;


        updateStatus("生成结尾音乐：调用LLM生成音乐信息...");
        while (llmResultData === null && gptAttempts < maxGptAttempts) {
            gptAttempts++;
            updateStatus(`生成结尾音乐：调用LLM (尝试 ${gptAttempts}/${maxGptAttempts})...`);
            try {
                 const llmContext = '音乐'; // Context used in original code
                 const jsonString = await gpt(prompt1, prompt2, llmContext, llmId); // Note: original used '音乐' context

                 if (jsonString === "error" || jsonString === "over_times") {
                     console.warn(`LLM returned '${jsonString}'. ${jsonString === 'over_times' ? 'Max attempts reached.' : 'Retrying...'}`);
                     if (jsonString === "over_times") break;
                     await new Promise(resolve => setTimeout(resolve, 1000));
                     continue;
                 }

                 const data = this.configService.extractJson(jsonString);

                // Validate structure for end music: needs title, style, lyrics
                 if (data !== "error" && typeof data === 'object' && data !== null && typeof data.title === 'string' && typeof data.style === 'string' && typeof data.lyrics === 'string') {
                    llmResultData = data; // Store the raw object
                    console.log("LLM response structure valid for end music.");
                 } else {
                    console.warn("LLM response has invalid structure or type for end music. Retrying... Data:", data);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                 }

            } catch (e) {
                console.error("LLM call failed:", e);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        gptDestroy(llmId); // Clean up LLM session

        if (llmResultData === null) {
            const errorMsg = `生成结尾音乐失败：无法从LLM获取有效音乐信息 (尝试 ${maxGptAttempts} 次失败)。`;
            updateStatus(errorMsg);
            console.error(errorMsg);
            return false;
        }

        // Extract needed data for API call
        const { title, style, lyrics } = llmResultData;


        // --- Execute the single API call function ---
        const apiCallParams = {
            modelName,
            musicDir,
            musicNameBase,
            filePathBase,
            jsonFilePath, // provided for end music
            llmResultData, // Pass the LLM result object
            instrumental: false, // End music is not instrumental
            custom: true, // End music uses custom lyric/style
            prompt: null, // N/A for custom
            title: title,
            lyrics: lyrics,
            style: style,
            updateStatus
        };


        const success = await this._executeMusicApiCall(apiCallParams);

         if (success) {
            updateStatus("生成结尾音乐：完成");
        } else {
            updateStatus("生成结尾音乐：失败");
        }

        return success; // Return boolean result
    }
}


// --- Service Instantiation and Export ---

// Create singleton instances of the services
const configService = new ConfigService();
const emailService = new EmailService();
const keyManager = new KeyManager(configService, emailService);
const musicGenerator = new MusicGenerator(configService, keyManager);

// Export the required functionalities bound to the instances

/**
 * Clears invalid tokens for the specified service name.
 * @param {string} name - Service name (e.g., 'verify', 'suno').
 * @returns {Promise<string>} 'success' or 'error'.
 */
export const clearInvalidTokens = keyManager.clearInvalidTokens.bind(keyManager);

/**
 * Generates a new set of API keys for all configured services.
 * Requires a usable 'verify' token (from pool or initial_verify_token).
 * @returns {Promise<string>} 'success' or 'error'.
 */
export const generateTokens = keyManager.generateTokens.bind(keyManager);

/**
 * Generates background music for the current story.
 * @param {Function} updateStatus - Callback function to report progress/status.
 * @returns {Promise<boolean>} True on success, False on failure.
 */
export const generateBackgroundMusic = musicGenerator.generateBackgroundMusic.bind(musicGenerator);

/**
 * Generates ending music for a specific story ending.
 * @param {string} storyId - Identifier for the story ending.
 * @param {Function} updateStatus - Callback function to report progress/status.
 * @returns {Promise<boolean>} True on success, False on failure.
 */
export const generateEndMusic = musicGenerator.generateEndMusic.bind(musicGenerator);


// Exporting the ConfigService instance itself might be useful for the UI to
// access service list or get config directly, but the prompt only asked for specific functions.
// Let's add a helper export for getting counts in the UI component.

/**
 * Gets token counts for all configured services.
 * @returns {object} An object mapping service names to their token counts.
 */
export const getTokenCounts = () => {
    const counts = {};
    const services = configService.getPlatformServices();
    services.forEach(service => {
        const list = configService.getTokenList(service.name);
        counts[service.name] = Array.isArray(list) ? list.length : 0;
    });
    return counts;
};


/**
 * Gets the list of all configured platform services.
 * This function is exported from the aimusicService.js module.
 * @returns {Array} List of service configurations (objects with name, kind, service_id, Valid_threshold).
 */
export const getPlatformServicesList = () => {
  // Access the singleton instance of ConfigService created within the module
  // We assume configService is available in the scope where this function is defined
  return configService.getPlatformServices();
};

// Export the ConfigService itself if the UI needs direct access (e.g., to load/save or get specific configs)
// export const configServiceInstance = configService;

console.log("Music Service module initialized.");