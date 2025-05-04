import { gpt, gptDestroy } from './AiModelService.js';
import { writeFile, getMetadata, createFolder } from './IndexedDBFileSystem.js';
import { processPrompt } from './PromptService';


Object.defineProperty(String.prototype, 'isDigit', {
  get: function () {
    return /^\d+$/.test(this);
  }
});

/**
 * Music-related functions
 */

/**
 * Generate a random email address
 * @param {number} length - Length of the random part
 * @returns {string} - Generated email address
 */
function generateEmailAddress(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${result}@nqmo.com`;
}

/**
 * Get a token from email service
 * @param {string} email - Email address
 * @returns {Promise<string|null>} - Auth token or null if failed
 */
async function getTokenFromEmail(email) {
  try {
    const url = `https://mailproxy.qqframe.cn/zh/mail/${email}`;
    const response = await fetch(url, {
      credentials: 'include', //  告诉浏览器在请求中包含 credential (cookies, HTTP authentication entries)
    });

    if (response.status >= 300 && response.status < 400) {
      console.log(`Redirect status code ${response.status}, skipping.`);
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const setCookieHeader = response.headers.get('xx-set-cookie');
    if (setCookieHeader) {
      const match = /auth_token=([^;]+)/.exec(setCookieHeader);
      if (match) {
        return match[1];
      } else {
        console.log("auth_token not found in cookie");
        return null;
      }
    } else {
      console.log("set-cookie header not found in response");
      return null;
    }
  } catch (error) {
    console.error('Request error:', error);
    return null;
  }
}

/**
 * Listen for new emails
 * @param {string} email - Email address
 * @returns {Promise<string[]|null>} - Array of email IDs or null if failed
 */
async function listenForNewEmails(email) {
  const token = await getTokenFromEmail(email);
  if (!token) {
    console.log("Failed to get token");
    return null;
  }

  try {
    const url = `https://mailproxy.qqframe.cn/api/api/v1/mailbox/${email}`;
    const headers = { 'Authorization': `bearer ${token}` };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const emailData = await response.json();

    if (Array.isArray(emailData)) {
      return emailData.map(item => item.id);
    } else {
      console.log("Email data format incorrect:", emailData);
      return [];
    }
  } catch (error) {
    console.error('Failed to listen for emails:', error);
    return [];
  }
}

/**
 * Read a specific email
 * @param {string} email - Email address
 * @param {string} emailId - Email ID
 * @returns {Promise<string|null>} - Verification code or null if failed
 */
async function readNewEmail(email, emailId) {
  const token = await getTokenFromEmail(email);
  if (!token) {
    return null;
  }

  try {
    const url = `https://mailproxy.qqframe.cn/api/api/v1/mailbox/${email}/${emailId}`;
    const headers = { 'Authorization': `bearer ${token}` };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.body.text;

    // Find 6-digit code in the email body
    const match = /\d{6}/.exec(text);
    return match ? match[0] : null;
  } catch (error) {
    console.error('Failed to read email:', error);
    return null;
  }
}

/**
 * Monitor for new emails and return verification code
 * @param {string} email - Email address
 * @returns {Promise<string|null>} - Verification code or null if failed
 */
async function monitorAndReadEmails(email) {
  let lastEmailIds = new Set();
  let attempts = 0;
  const maxAttempts = 15; // 30 seconds with 2-second intervals

  while (attempts < maxAttempts) {
    const newEmailIds = await listenForNewEmails(email);
    if (newEmailIds === null) {
      console.log("Token expired, stopping monitoring");
      return null;
    }

    const currentIds = new Set(newEmailIds);
    const newEmails = [...currentIds].filter(id => !lastEmailIds.has(id));

    if (newEmails.length > 0) {
      const newestEmailId = newEmails[0];
      const emailContent = await readNewEmail(email, newestEmailId);

      if (emailContent) {
        return emailContent;
      } else {
        console.log("Failed to read email content");
      }
    }

    lastEmailIds = currentIds;

    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  console.log("Monitor timeout - no verification code received");
  return null;
}

/**
 * Send verification code request
 * @param {string} emailAddress - Email address
 * @returns {Promise<void>}
 */
async function sendCode(emailAddress) {
  try {
    const url = 'https://auth.acedata.cloud/api/v1/email-code/';
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    };

    const data = {
      'template': '118462',
      'receiver': emailAddress
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.status;
  } catch (error) {
    console.error('Failed to send code:', error);
    throw error;
  }
}

/**
 * Get hCaptcha token
 * @param {string} apikey - API key
 * @returns {Promise<string>} - hCaptcha token
 */
async function getHcaptchaToken(apikey) {
  try {
    const url = "https://api.acedata.cloud/captcha/token/hcaptcha";
    const headers = {
      "accept": "application/json",
      "authorization": `Bearer ${apikey}`,
      "content-type": "application/json"
    };

    const payload = {
      "website_key": "663c73ac-ca1c-42b0-9cca-45de991ad32c",
      "website_url": "https://auth.acedata.cloud"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("key获取成功");
    return data.token;
  } catch (error) {
    console.error('Failed to get hCaptcha token:', error);
    throw error;
  }
}

/**
 * Register a new user
 * @param {string} email - Email address
 * @param {string} code - Verification code
 * @param {string} key - hCaptcha token
 * @returns {Promise<void>}
 */
async function register(email, code, key) {
  try {
    const url = "https://auth.acedata.cloud/api/v1/users/";
    const payload = {
      "email": email,
      "email_code": code,
      "password": "srtgstr",
      "captcha": key
    };

    const headers = {
      'Accept': "application/json, text/plain, */*",
      'Content-Type': "application/json"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to register:', error);
    throw error;
  }
}

/**
 * Login to account
 * @param {string} email - Email address
 * @param {string} password - Password
 * @returns {Promise<[string, string]>} - [access_token, user_id]
 */
async function login(email, password) {
  try {
    const url = "https://auth.acedata.cloud/api/v1/auth/login/";
    const payload = {
      "email": email,
      "password": password
    };

    const headers = {
      'Accept': "application/json, text/plain, */*",
      'Content-Type': "application/json"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return [data.access_token, data.user_id];
  } catch (error) {
    console.error('Failed to login:', error);
    throw error;
  }
}

/**
 * Request service key
 * @param {string} access_token - Access token
 * @param {string} user_id - User ID
 * @param {string} service_id - Service ID
 * @returns {Promise<[string, string]>} - [service_key, id]
 */
async function requestserviceKey(access_token, user_id, service_id) {
  try {
    // Create application
    const appUrl = "https://platform.acedata.cloud/api/v1/applications/";
    const appPayload = { "service_id": service_id };
    const appHeaders = {
      'Accept': "application/json",
      'Content-Type': "application/json",
      'authorization': `Bearer ${access_token}`,
      'x-user-id': user_id
    };

    const appResponse = await fetch(appUrl, {
      method: 'POST',
      headers: appHeaders,
      body: JSON.stringify(appPayload)
    });

    if (!appResponse.ok) {
      throw new Error(`HTTP error! status: ${appResponse.status}`);
    }

    const appData = await appResponse.json();
    const id1 = appData.id;

    // Create credential
    const credUrl = "https://platform.acedata.cloud/api/v1/credentials/";
    const credPayload = { "application_id": id1 };

    const credResponse = await fetch(credUrl, {
      method: 'POST',
      headers: appHeaders,
      body: JSON.stringify(credPayload)
    });

    if (!credResponse.ok) {
      throw new Error(`HTTP error! status: ${credResponse.status}`);
    }

    const credData = await credResponse.json();
    const id2 = credData.id;

    // Get credentials list
    const listUrl = "https://platform.acedata.cloud/api/v1/credentials/";
    const params = new URLSearchParams({
      'ordering': "-created_at",
      'limit': "10",
      'offset': "0",
      'user_id': user_id,
      'application_id': id1
    });

    const listResponse = await fetch(`${listUrl}?${params.toString()}`, {
      headers: appHeaders
    });

    if (!listResponse.ok) {
      throw new Error(`HTTP error! status: ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    return [listData.items[0].token, id1];
  } catch (error) {
    console.error('Failed to request cap key:', error);
    throw error;
  }
}

/**
 * Get platform key
 * @param {string} access_token - Access token
 * @param {string} user_id - User ID
 * @returns {Promise<string>} - Platform token
 */
async function getPlatformKey(access_token, user_id) {
  try {
    const url = "https://platform.acedata.cloud/api/v1/platform-tokens/";
    const headers = {
      'Accept': "application/json",
      'Content-Type': "application/json",
      'authorization': `Bearer ${access_token}`,
      'x-user-id': user_id
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Failed to get platform key:', error);
    throw error;
  }
}

/**
 * Get remaining credits
 * @param {string} platformkey - Platform key
 * @param {string} application_id - Application ID
 * @returns {Promise<string>} - Remaining amount
 */
export async function getremain(platformkey, application_id) {
  try {
    const url = `https://platform.acedata.cloud/api/v1/applications/${application_id}`;
    const headers = {
      "accept": "application/json",
      "authorization": `Bearer ${platformkey}`
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      return "0";
    }

    const data = await response.json();
    return data.remaining_amount;
  } catch (error) {
    console.error('Failed to get remaining credits:', error);
    return "0";
  }
}

/**
 * Get all keys with a single verification token
 * @param {string} cap_api_key - Verification token
 * @returns {Promise<[string, string, string, string, string, string]>} - Status and keys
 */
export async function get_all_keys(cap_api_key) {
  try {
    // Get hCaptcha token
    const key = await getHcaptchaToken(cap_api_key);

    // Generate email address
    const email_address = generateEmailAddress();
    console.log(`Generated email address: ${email_address}`);

    // Send verification code
    await sendCode(email_address);

    // Monitor for verification code
    let code = '';
    for (let i = 0; i < 30; i++) {
      const new_email = await monitorAndReadEmails(email_address);

      if (new_email === null) {
        console.log("Token expired, terminating");
        break;
      }

      if (new_email) {
        code = new_email;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }


    if (!code) {
      console.log('No verification code received');
      return {"status":"error"};
      //return ['error', '', '', '', '', ''];
    }

    console.log(`Verification code: ${code}`);

    // Register with code
    await register(email_address, code, key);


    // Login
    const [access_token, user_id] = await login(email_address, "srtgstr");

    // Get platform key
    const platformkey = await getPlatformKey(access_token, user_id);

    let capkey = '';
    let capid = '';
    let sunokey = '';
    let sunoid = '';
    // Request cap key
    try {
      [capkey, capid] = await requestserviceKey(access_token, user_id, "018c653e-4f1b-433f-82f9-732ef2767040");
    } catch (error) {
      console.error("Error requesting cap key:", error);
    }
    // Request suno key
    try {
      [sunokey, sunoid] = await requestserviceKey(access_token, user_id, "f2b646d8-3cfd-46ef-969a-1ea9eebde329");
    } catch (error) {
      console.error("Error requesting suno key:", error);
    }


    if(capkey||sunokey){
    //return ['success', capkey, capid, sunokey, sunoid, platformkey];
    return {"status":"success","capkey":capkey,"capid":capid,"sunokey":sunokey,"sunoid":sunoid,"platformkey":platformkey};
    }
    else{//return ['error', '', '', '', '', ''];
      return {"status":"error"};
    }
  } catch (error) {
    console.error('Error in get_all_keys:', error);
    //return ['error', '', '', '', '', ''];
    return {"status":"error"};
  }
}

/**
 * Get token
 * @param {string} kind - Token kind ('music' or 'verify')
 * @returns {Promise<string>} - Status ('success' or 'error')
 */
export async function gettoken(kind) {
  try {
    const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');

    if (!config.AI音乐) {
      config.AI音乐 = {};
    }

    if (!config.AI音乐.tokenpool) {
      config.AI音乐.tokenpool = {
        music_token_list: [],
        verify_token_list: []
      };
    }

    const verify_token_list = config.AI音乐.tokenpool.verify_token_list || [];
    const music_token_list = config.AI音乐.tokenpool.music_token_list || [];

    let verify_token = null;

    // Try to get a valid verification token
    if (verify_token_list.length > 0) {
      const availableTokens = [...verify_token_list];

      while (availableTokens.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableTokens.length);
        const tokenObj = availableTokens[randomIndex];

        try {
          const capkey = tokenObj.capkey;
          const platformkey = tokenObj.platformkey;
          const capid = tokenObj.capid;

          const remain = parseFloat(await getremain(platformkey, capid));

          if (remain < 0.016) {
            // Remove invalid token
            availableTokens.splice(randomIndex, 1);

            // Update global verify_token_list
            const indexInOriginal = verify_token_list.findIndex(t =>
              t.capkey === tokenObj.capkey &&
              t.platformkey === tokenObj.platformkey &&
              t.capid === tokenObj.capid
            );

            if (indexInOriginal !== -1) {
              verify_token_list.splice(indexInOriginal, 1);
              config.AI音乐.tokenpool.verify_token_list = verify_token_list;
              localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
            }
          } else {
            verify_token = capkey;
            break;
          }
        } catch (error) {
          console.error('Error validating token:', error);
          availableTokens.splice(randomIndex, 1);
        }
      }
    }

    // If no valid token from the list, use initial verify token
    if (!verify_token) {
      verify_token = config.AI音乐.tokenpool.initial_verify_token;
      if (!verify_token) {
        return "error";
      }
    }

    // Get all keys with the verification token
    const result = await get_all_keys(verify_token);

    if (result["status"] === "error") {
      return "error";
    }

    // Add new music token
    if(result["sunokey"]){
    const music_token = { "platformkey":result.platformkey, "sunokey":result.sunokey, "sunoid":result.sunoid };
    music_token_list.push(music_token);
    config.AI音乐.tokenpool.music_token_list = music_token_list;
    }

    // Add new verification token
    const new_verify_token = { "platformkey":result.platformkey,"capkey":result.capkey, "capid":result.capid };
    verify_token_list.push(new_verify_token);
    config.AI音乐.tokenpool.verify_token_list = verify_token_list;

    // Save to localStorage
    localStorage.setItem('aiGalgameConfig', JSON.stringify(config));

    return "success";
  } catch (error) {
    console.error('Error in gettoken:', error);
    return "error";
  }
}

/**
 * Clear invalid tokens
 * @param {string} kind - Token kind ('music' or 'verify')
 * @returns {Promise<string>} - Status ('success' or 'error')
 */
export async function cleartoken(kind) {
  console.log(`Starting to clear invalid ${kind} tokens...`);
  const startTime = Date.now();

  try {
    const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');

    if (!config.AI音乐 || !config.AI音乐.tokenpool) {
      return "success"; // Nothing to clear
    }

    const tokenListKey = `${kind}_token_list`;
    const tokens = config.AI音乐.tokenpool[tokenListKey] || [];

    if (!Array.isArray(tokens)) {
      console.error(`Expected list for ${tokenListKey} but got: ${typeof tokens}`);
      return "success"; // Soft error
    }

    const validTokens = [];
    let invalidCount = 0;
    const totalCount = tokens.length;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (kind === "music") {
        const platformkey = token.platformkey;
        const sunoid = token.sunoid;

        if (!platformkey || !sunoid) {
          invalidCount++;
          console.log(`${i + 1}/${totalCount} Warning: music token missing platformkey or sunoid, removing.`);
          continue;
        }

        try {
          const remainStr = await getremain(platformkey, sunoid);
          const remain = parseFloat(remainStr);

          if (remain < 0.42) {
            console.log(`${i + 1}/${totalCount} Invalid: remain=${remain.toFixed(4)} < 0.42`);
            invalidCount++;
          } else {
            validTokens.push(token);
            console.log(`${i + 1}/${totalCount} Valid: remain=${remain.toFixed(4)} >= 0.42`);
          }
        } catch (error) {
          console.error(`${i + 1}/${totalCount} Error: Validation failed:`, error);
          validTokens.push(token); // Keep token on error
          break; // Stop on error
        }
      } else if (kind === "verify") {
        const platformkey = token.platformkey;
        const capid = token.capid;

        if (!platformkey || !capid) {
          invalidCount++;
          console.log(`${i + 1}/${totalCount} Warning: verify token missing platformkey or capid, removing.`);
          continue;
        }

        try {
          const remainStr = await getremain(platformkey, capid);
          const remain = parseFloat(remainStr);

          if (remain < 0.016) {
            console.log(`${i + 1}/${totalCount} Invalid: remain=${remain.toFixed(4)} < 0.016`);
            invalidCount++;
          } else {
            validTokens.push(token);
            console.log(`${i + 1}/${totalCount} Valid: remain=${remain.toFixed(4)} >= 0.016`);
          }
        } catch (error) {
          console.error(`${i + 1}/${totalCount} Error: Validation failed:`, error);
          validTokens.push(token); // Keep token on error
          break; // Stop on error
        }
      } else {
        console.error(`Invalid token type: ${kind}`);
        return "success"; // Soft error
      }

      // Rate limiting
      if (i < tokens.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update config
    config.AI音乐.tokenpool[tokenListKey] = validTokens;
    localStorage.setItem('aiGalgameConfig', JSON.stringify(config));

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Cleared invalid ${kind} tokens. Total=${totalCount}, Invalid=${invalidCount}, Duration=${duration.toFixed(2)}s`);

    return "success";
  } catch (error) {
    console.error(`Error clearing ${kind} tokens:`, error);
    return "error";
  }
}


async function getMusicKey() {
  try {
    const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');

    if (!config.AI音乐 || !config.AI音乐.tokenpool) {
      // Fallback to regular API key
      return config.AI音乐?.api_key || '';
    }

    const musicTokenList = config.AI音乐.tokenpool.music_token_list || [];

    if (musicTokenList.length > 0) {
      const availableTokens = [...musicTokenList];

      while (availableTokens.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableTokens.length);
        const token = availableTokens[randomIndex];

        try {
          const sunokey = token.sunokey;
          const platformkey = token.platformkey;
          const sunoid = token.sunoid;

          const remain = parseFloat(await getremain(platformkey, sunoid));

          if (remain < 0.42) {
            // Remove invalid token
            availableTokens.splice(randomIndex, 1);

            // Update global token list
            const indexInOriginal = musicTokenList.findIndex(t =>
              t.sunokey === token.sunokey &&
              t.platformkey === token.platformkey &&
              t.sunoid === token.sunoid
            );

            if (indexInOriginal !== -1) {
              musicTokenList.splice(indexInOriginal, 1);
              config.AI音乐.tokenpool.music_token_list = musicTokenList;
              localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
            }
          } else {
            console.log("Successfully got valid sunokey");
            return sunokey;
          }
        } catch (error) {
          console.error('Error validating music token:', error);
          availableTokens.splice(randomIndex, 1);
        }
      }
    }

    // Fallback to regular API key
    return config.AI音乐?.api_key || '';
  } catch (error) {
    console.error('Error getting music key:', error);
    return '';
  }
}






/**
 * 从文本中提取JSON对象
 * @param {string} text 输入文本
 * @returns {object|string} 提取到的JSON对象或 "error"
 */
function extractJson(text) {
  const startIndex = text.indexOf('{');
  const endIndex = text.lastIndexOf('}');

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    console.warn("JSON extraction failed: No valid JSON structure found.");
    return "error";
  }

  const jsonString = text.substring(startIndex, endIndex + 1);

  try {
    const jsonObject = JSON.parse(jsonString);
    console.log("JSON extracted successfully:", jsonObject);
    return jsonObject;
  } catch (e) {
    console.error("JSON parsing failed:", e);
    return "error";
  }
}

/**
 * 从localStorage加载配置
 * @returns {object} 配置对象，如果不存在则返回默认结构
 */
function loadConfig() {
  const configString = localStorage.getItem('aiGalgameConfig');
  if (configString) {
    try {
      const config = JSON.parse(configString);
      //console.log("Config loaded from localStorage:", config);
      // 确保结构存在，提供默认值
      config["剧情"] = config["剧情"] || {};
      config["AI音乐"] = config["AI音乐"] || {};
      return config;
    } catch (e) {
      console.error("Failed to parse config from localStorage:", e);
      return { "剧情": {}, "AI音乐": {} };
    }
  }
  console.log("No config found in localStorage, using default.");
  return { "剧情": {}, "AI音乐": {} };
}

/**
 * 将配置保存到localStorage
 * (Python函数中没有saveConfig，这里为了测试方便添加一个)
 * @param {object} config - 要保存的配置对象
 */
function saveConfig(config) {
  try {
    localStorage.setItem('aiGalgameConfig', JSON.stringify(config));
    console.log("Config saved to localStorage.");
  } catch (e) {
    console.error("Failed to save config to localStorage:", e);
  }
}

// --- 音乐生成函数 ---

/**
 * 生成背景音乐
 * @param {Function} updateStatus - 用于更新状态的回调函数
 * @returns {Promise<string|void>} 成功时返回void，失败时返回错误信息字符串
 */
async function generateBackgroundMusic(updateStatus) {
  //updateStatus("加载配置...");
  const config = loadConfig();
  const storyTitle = config["剧情"]?.["story_title"] || "";
  const musicUrl = config["AI音乐"]?.["base_url"];

  if (!musicUrl) {
    const errorMsg = "生成音乐失败：AI音乐 base_url 未配置。";
    updateStatus(errorMsg);
    console.error(errorMsg);
    return errorMsg;
  }

  const musicDir = `/data/${storyTitle}/music`;
  const musicName = "background";
  const filePathBase = `${musicDir}/${musicName}`;

  updateStatus(`生成音乐：获取音乐API Key...`);
  const key = await getMusicKey();
  if (!key || key === 'MOCK_MUSIC_API_KEY') { // 检查是否使用了模拟key
    const errorMsg = "生成音乐失败：音乐API Key 未配置或获取失败。";
    updateStatus(errorMsg);
    console.error(errorMsg);
    return errorMsg;
  }


  const headers = {
    'Authorization': `Bearer ${key}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  //updateStatus("处理生成音乐的Prompt...");
  const [prompt1, prompt2] = await processPrompt('背景音乐生成');

  const id = Math.floor(Math.random() * 100000) + 1;
  let result = "error";
  let gptAttempts = 0;
  const maxGptAttempts = 5; // 避免无限循环

  updateStatus("生成音乐：调用LLM生成音乐信息...");
  while (result === "error" && gptAttempts < maxGptAttempts) {
    gptAttempts++;
    updateStatus(`生成音乐：调用LLM (尝试 ${gptAttempts}/${maxGptAttempts})...`);
    try {
      const jsonString = await gpt(prompt1, prompt2, 'background_music', id);

      if (jsonString === "error") {
        console.warn("LLM returned 'error'. Retrying...");
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒重试
        continue;
      } else if (jsonString === "over_times") {
        const errorMsg = "生成音乐失败：LLM调用达到最大尝试次数。";
        updateStatus(errorMsg);
        console.error(errorMsg);
        return errorMsg;
      }

      const data = extractJson(jsonString);

      if (data !== "error" && typeof data === 'object' && data !== null && "title" in data && "prompt" in data) {
        result = data;
        console.log("LLM response structure valid.");
        // 确保 title 和 prompt 是字符串
        if (typeof result.title !== 'string' || typeof result.prompt !== 'string') {
          console.warn("LLM response has incorrect type for title or prompt. Retrying...");
          result = "error"; // Treat as error if types are wrong
        }
      } else {
        console.warn("LLM response has invalid structure. Retrying...");
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒重试
        result = "error";
      }

    } catch (e) {
      console.error("LLM call failed:", e);
      //updateStatus(`生成音乐：LLM调用失败: ${e.message}. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒重试
      result = "error"; // Treat as error to retry
    }
  }

  gptDestroy(id); // 销毁LLM会话

  if (result === "error") {
    const errorMsg = `生成音乐失败：无法从LLM获取有效音乐信息 (尝试 ${maxGptAttempts} 次失败)。`;
    updateStatus(errorMsg);
    console.error(errorMsg);
    return errorMsg;
  }

  const title = result["title"];
  const prompt = result["prompt"];

  const payload = {
    "action": "generate",
    "model": "chirp-v4",
    "instrumental": true,
    "custom": false,
    "prompt": prompt,
    "title": title
  };

  console.log("开始调用音乐API生成背景音乐...");
  updateStatus("生成音乐：调用音乐API生成背景音乐...");
  try {
    const response = await fetch(musicUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`音乐API响应错误: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const apiData = await response.json();
    console.log("音乐API响应:", apiData);

    if (!apiData || !apiData.data || !Array.isArray(apiData.data) || apiData.data.length < 2) {
      throw new Error("音乐API返回数据结构无效。");
    }

    const audioUrl1 = apiData.data[0]?.audio_url;
    const audioUrl2 = apiData.data[1]?.audio_url;
    const videoUrl1 = apiData.data[0]?.video_url; // Optional
    const videoUrl2 = apiData.data[1]?.video_url; // Optional

    if (!audioUrl1 || !audioUrl2) {
      throw new Error("音乐API返回数据缺少音频URL。");
    }

    // 确保音乐目录存在（writeFile也会创建父目录，但提前创建更清晰）
    await createFolder(musicDir).catch(e => console.warn("Failed to ensure music directory exists:", e));


    updateStatus("生成音乐：下载并保存音乐文件 1...");
    console.log(`下载音频 1: ${audioUrl1}`);
    try {
      const audioResponse1 = await fetch(audioUrl1);
      if (!audioResponse1.ok) throw new Error(`下载音频 1 失败: ${audioResponse1.status}`);
      const audioBlob1 = await audioResponse1.blob();
      await writeFile(`${filePathBase}.mp3`, audioBlob1);
      console.log(`文件 ${filePathBase}.mp3 已下载并保存。`);
    } catch (e) {
      console.error(`下载或保存音频 1 失败:`, e);
      updateStatus(`生成音乐：下载或保存音频 1 失败: ${e.message}`);
      // Consider if this should be a hard error or continue
    }


    updateStatus("生成音乐：下载并保存音乐文件 2...");
    console.log(`下载音频 2: ${audioUrl2}`);
    try {
      const audioResponse2 = await fetch(audioUrl2);
      if (!audioResponse2.ok) throw new Error(`下载音频 2 失败: ${audioResponse2.status}`);
      const audioBlob2 = await audioResponse2.blob();
      await writeFile(`${filePathBase}1.mp3`, audioBlob2);
      console.log(`文件 ${filePathBase}1.mp3 已下载并保存。`);
    } catch (e) {
      console.error(`下载或保存音频 2 失败:`, e);
      updateStatus(`生成音乐：下载或保存音频 2 失败: ${e.message}`);
      // Consider if this should be a hard error or continue
    }


    // 下载视频文件 (可选，因为Python代码中有try/except)
    if (videoUrl1) {
      //updateStatus("下载并保存视频文件 1...");
      console.log(`下载视频 1 (可选): ${videoUrl1}`);
      try {
        const videoResponse1 = await fetch(videoUrl1);
        if (videoResponse1.ok) {
          const videoBlob1 = await videoResponse1.blob();
          await writeFile(`${filePathBase}.mp4`, videoBlob1);
          console.log(`文件 ${filePathBase}.mp4 已下载并保存。`);
        } else {
          console.warn(`下载视频 1 失败: ${videoResponse1.status}`);
        }
      } catch (e) {
        console.warn(`下载或保存视频 1 失败:`, e);
      }
    }

    if (videoUrl2) {
      //updateStatus("下载并保存视频文件 2...");
      console.log(`下载视频 2 (可选): ${videoUrl2}`);
      try {
        const videoResponse2 = await fetch(videoUrl2);
        if (videoResponse2.ok) {
          const videoBlob2 = await videoResponse2.blob();
          await writeFile(`${filePathBase}1.mp4`, videoBlob2);
          console.log(`文件 ${filePathBase}1.mp4 已下载并保存。`);
        } else {
          console.warn(`下载视频 2 失败: ${videoResponse2.status}`);
        }
      } catch (e) {
        console.warn(`下载或保存视频 2 失败:`, e);
      }
    }


    updateStatus("生成音乐：背景音乐生成成功！");
    console.log("背景音乐生成成功！");

  } catch (e) {
    const errorMsg = `生成音乐失败: ${e.message}`;
    updateStatus(errorMsg);
    console.error(errorMsg);
    return errorMsg;
  }
}

/**
 * 生成结尾音乐
 * @param {string} storyId - 故事ID
 * @param {Function} updateStatus - 用于更新状态的回调函数
 * @returns {Promise<string|void>} 成功时返回void，失败时返回错误信息字符串
 */
async function generateEndMusic(storyId, updateStatus) {
  //updateStatus("加载配置...");
  const config = loadConfig();
  const storyTitle = config["剧情"]?.["story_title"] || "";
  const musicUrl = config["AI音乐"]?.["base_url"];
  const lang = config["剧情"]?.["language"]; // Assuming language might be used elsewhere or for prompts, though not directly in the final payload here

  if (!musicUrl) {
    const errorMsg = "生成音乐失败：AI音乐 base_url 未配置。";
    updateStatus(errorMsg);
    console.error(errorMsg);
    return errorMsg;
  }


  const musicDir = `/data/${storyTitle}/music`;
  const musicName = `end_${storyId}`;
  const filePathBase = `${musicDir}/${musicName}`;
  const jsonFilePath = `/data/${storyTitle}/${musicName}_music.json`;


  updateStatus(`获取音乐API Key...`);
  const key = await getMusicKey();
  if (!key || key === 'MOCK_MUSIC_API_KEY') { // 检查是否使用了模拟key
    const errorMsg = "生成音乐失败：音乐API Key 未配置或获取失败。";
    updateStatus(errorMsg);
    console.error(errorMsg);
    return errorMsg;
  }


  const headers = {
    'Authorization': `Bearer ${key}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  //updateStatus("处理生成音乐的Prompt...");
  const [prompt1, prompt2] = await processPrompt('结尾音乐生成');

  const id = Math.floor(Math.random() * 100000) + 1;
  let result = "error";
  let gptAttempts = 0;
  const maxGptAttempts = 5; // 避免无限循环


  updateStatus("调用LLM生成音乐信息...");
  while (result === "error" && gptAttempts < maxGptAttempts) {
    gptAttempts++;
    updateStatus(`生成音乐：调用LLM (尝试 ${gptAttempts}/${maxGptAttempts})...`);
    try {
      const jsonString = await gpt(prompt1, prompt2, '音乐', id); // Note: Python used '音乐', background used 'background_music'

      if (jsonString === "error") {
        console.warn("LLM returned 'error'. Retrying...");
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒重试
        continue;
      } else if (jsonString === "over_times") {
        const errorMsg = "生成音乐失败：LLM调用达到最大尝试次数。";
        updateStatus(errorMsg);
        console.error(errorMsg);
        return errorMsg;
      }

      const data = extractJson(jsonString);

      if (data !== "error" && typeof data === 'object' && data !== null && "title" in data && "style" in data && "lyrics" in data) {
        result = data;
        console.log("LLM response structure valid.");
        // Ensure types are correct
        if (typeof result.title !== 'string' || typeof result.style !== 'string' || typeof result.lyrics !== 'string') {
          console.warn("LLM response has incorrect type for title, style, or lyrics. Retrying...");
          result = "error"; // Treat as error if types are wrong
        }
      } else {
        console.warn("LLM response has invalid structure. Retrying...");
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒重试
        result = "error";
      }

    } catch (e) {
      console.error("LLM call failed:", e);
      //updateStatus(`LLM调用失败: ${e.message}. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒重试
      result = "error"; // Treat as error to retry
    }
  }

  gptDestroy(id); // 销毁LLM会话

  if (result === "error") {
    const errorMsg = `生成音乐失败：无法从LLM获取有效音乐信息 (尝试 ${maxGptAttempts} 次失败)。`;
    updateStatus(errorMsg);
    console.error(errorMsg);
    return errorMsg;
  }

  const title = result["title"];
  const style = result["style"];
  const lyrics = result["lyrics"];

  const payload = {
    "action": "generate",
    "model": "chirp-v4", // Assuming same model as background
    "instrumental": false,
    "custom": true,
    "lyric": lyrics,
    "style": style,
    "title": title
  };

  console.log("开始调用音乐API生成结尾音乐...");
  updateStatus("调用音乐API生成结尾音乐...");
  try {
    const response = await fetch(musicUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`音乐API响应错误: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const apiData = await response.json();
    console.log("音乐API响应:", apiData);

    if (!apiData || !apiData.data || !Array.isArray(apiData.data) || apiData.data.length < 2) {
      throw new Error("音乐API返回数据结构无效。");
    }

    const audioUrl1 = apiData.data[0]?.audio_url;
    const audioUrl2 = apiData.data[1]?.audio_url;
    const videoUrl1 = apiData.data[0]?.video_url; // Optional
    const videoUrl2 = apiData.data[1]?.video_url; // Optional

    if (!audioUrl1 || !audioUrl2) {
      throw new Error("音乐API返回数据缺少音频URL。");
    }

    // 确保音乐目录存在
    await createFolder(musicDir).catch(e => console.warn("Failed to ensure music directory exists:", e));

    updateStatus("保存LLM原始响应 JSON...");
    // Save the JSON response from LLM
    try {
      // Ensure parent directory for JSON file exists (usually the story title directory)
      const jsonParentDir = `/data/${storyTitle}`;
      await createFolder(jsonParentDir).catch(e => console.warn("Failed to ensure json directory exists:", e));

      await writeFile(jsonFilePath, result);
      console.log(`LLM响应 JSON 已保存到 ${jsonFilePath}`);
    } catch (e) {
      console.error(`保存LLM响应 JSON 失败:`, e);
      updateStatus(`保存LLM响应 JSON 失败: ${e.message}`);
      // This is not a fatal error for the music generation process itself
    }


    updateStatus("下载并保存音乐文件 1...");
    console.log(`下载音频 1: ${audioUrl1}`);
    try {
      const audioResponse1 = await fetch(audioUrl1);
      if (!audioResponse1.ok) throw new Error(`下载音频 1 失败: ${audioResponse1.status}`);
      const audioBlob1 = await audioResponse1.blob();
      await writeFile(`${filePathBase}.mp3`, audioBlob1);
      console.log(`文件 ${filePathBase}.mp3 已下载并保存。`);
    } catch (e) {
      console.error(`下载或保存音频 1 失败:`, e);
      updateStatus(`下载或保存音频 1 失败: ${e.message}`);
      // Consider if this should be a hard error or continue
    }


    updateStatus("下载并保存音乐文件 2...");
    console.log(`下载音频 2: ${audioUrl2}`);
    try {
      const audioResponse2 = await fetch(audioUrl2);
      if (!audioResponse2.ok) throw new Error(`下载音频 2 失败: ${audioResponse2.status}`);
      const audioBlob2 = await audioResponse2.blob();
      await writeFile(`${filePathBase}1.mp3`, audioBlob2);
      console.log(`文件 ${filePathBase}1.mp3 已下载并保存。`);
    } catch (e) {
      console.error(`下载或保存音频 2 失败:`, e);
      updateStatus(`下载或保存音频 2 失败: ${e.message}`);
      // Consider if this should be a hard error or continue
    }


    // 下载视频文件 (可选)
    if (videoUrl1) {
      updateStatus("下载并保存视频文件 1...");
      console.log(`下载视频 1 (可选): ${videoUrl1}`);
      try {
        const videoResponse1 = await fetch(videoUrl1);
        if (videoResponse1.ok) {
          const videoBlob1 = await videoResponse1.blob();
          await writeFile(`${filePathBase}.mp4`, videoBlob1);
          console.log(`文件 ${filePathBase}.mp4 已下载并保存。`);
        } else {
          console.warn(`下载视频 1 失败: ${videoResponse1.status}`);
        }
      } catch (e) {
        console.warn(`下载或保存视频 1失败:`, e);
      }
    }

    if (videoUrl2) {
      updateStatus("下载并保存视频文件 2...");
      console.log(`下载视频 2 (可选): ${videoUrl2}`);
      try {
        const videoResponse2 = await fetch(videoUrl2);
        if (videoResponse2.ok) {
          const videoBlob2 = await videoResponse2.blob();
          await writeFile(`${filePathBase}1.mp4`, videoBlob2);
          console.log(`文件 ${filePathBase}1.mp4 已下载并保存。`);
        } else {
          console.warn(`下载视频 2 失败: ${videoResponse2.status}`);
        }
      } catch (e) {
        console.warn(`下载或保存视频 2 失败:`, e);
      }
    }

    updateStatus("结尾音乐生成成功！");
    console.log("结尾音乐生成成功！");

  } catch (e) {
    const errorMsg = `生成音乐失败: ${e.message}`;
    updateStatus(errorMsg);
    console.error(errorMsg);
    return errorMsg;
  }
}

// 为了在Vue组件中调用，我们需要导出这些函数
export {
  generateBackgroundMusic,
  generateEndMusic,
  loadConfig, // Export loadConfig for the Vue component
  saveConfig, // Export saveConfig for the Vue component
  // Export mocks if needed for standalone testing,
  // but typically the real implementations would be imported.
  // getMusicKey,
  // processPrompt,
  // extractJson,
  // saveConfig // You might want to export saveConfig for the UI
};