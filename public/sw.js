// public/sw.js

// --- IndexedDB File System Subset (Keep existing functions: getDatabaseVersion, openDatabase, openDatabaseIfStoreExists, parsePath, isFolder, readFile) ---
const DB_NAME = 'data';
let currentDbVersion = null; // Cache for database version
let maxRetries = 2; // Maximum number of retries for version errors

/**
 * 获取数据库当前版本
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @returns {Promise<number>} 当前数据库版本
 */
async function getDatabaseVersion(forceRefresh = false) {
  if (currentDbVersion !== null && !forceRefresh) {
    return currentDbVersion;
  }

  return new Promise((resolve, reject) => {
    const request = self.indexedDB.open(DB_NAME);

    request.onsuccess = (event) => {
      const db = event.target.result;
      currentDbVersion = db.version;
      db.close();
      resolve(currentDbVersion);
    };

    request.onerror = (event) => {
      console.error("[SW getDatabaseVersion] Failed to get DB version:", event.target.error);
      currentDbVersion = 1; // Fallback to 1 on error
      resolve(1); // Resolve with fallback, don't reject here
    };

    request.onblocked = (event) => {
      console.warn(`[SW getDatabaseVersion] Database open is blocked: ${event.target.error}. Close other tabs.`);
      // Resolve with potentially stale version or fallback
      const lastKnownVersion = currentDbVersion || 1;
      resolve(lastKnownVersion);
    };
  });
}


/**
 * 初始化数据库连接
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @param {string} [storeToEnsure] - Optional: Store name to ensure exists (for write operations)
 * @returns {Promise<IDBDatabase>} 数据库连接
 */
async function openDatabase(forceRefresh = false, retryCount = 0, storeToEnsure = null) {
    try {
        let version = await getDatabaseVersion(forceRefresh);
        // console.log(`[SW openDatabase] Attempting to open DB "${DB_NAME}" with version ${version}. Store to ensure: ${storeToEnsure}`);

        // If we need to ensure a store, we might need to increment the version
        if (storeToEnsure) {
            try {
                const checkDb = await new Promise((resolve, reject) => {
                   const req = self.indexedDB.open(DB_NAME, version);
                   req.onsuccess = e => resolve(e.target.result);
                   req.onerror = e => reject(e.target.error);
                   req.onblocked = e => reject(new Error('DB blocked during store check'));
                   req.onupgradeneeded = e => { /* Do nothing here, handle in main open */ };
                });

                if (!checkDb.objectStoreNames.contains(storeToEnsure)) {
                    console.log(`[SW openDatabase] Store "${storeToEnsure}" not found. Will attempt upgrade.`);
                    version++; // Increment version to trigger onupgradeneeded
                    currentDbVersion = version; // Update cached version
                }
                checkDb.close();
            } catch (checkError) {
                 // Ignore errors like DB being blocked, proceed with open attempt
                 console.warn(`[SW openDatabase] Pre-check for store "${storeToEnsure}" failed or was blocked:`, checkError);
                 // We might still need to upgrade if the store doesn't exist
                 // Let the main open attempt handle it.
            }
        }

        return new Promise((resolve, reject) => {
            const request = self.indexedDB.open(DB_NAME, version);

            request.onsuccess = (event) => {
                const db = event.target.result;
                // console.log(`[SW openDatabase] Successfully opened DB "${DB_NAME}" version ${db.version}`);
                // Optional: Verify if the store exists *after* opening, if needed for read/write safety
                 if (storeToEnsure && !db.objectStoreNames.contains(storeToEnsure)) {
                     console.error(`[SW openDatabase] Store "${storeToEnsure}" still not found after open/upgrade attempt.`);
                     db.close();
                     reject(new Error(`Store "${storeToEnsure}" could not be created or found.`));
                     return;
                 }
                resolve(db);
            };

            request.onerror = async (event) => {
                const error = event.target.error;
                console.error(`[SW openDatabase] Failed to open DB "${DB_NAME}" version ${version}:`, error);
                if (error.name === 'VersionError' && retryCount < maxRetries) {
                    console.log(`[SW openDatabase] Version error detected, refreshing version and retrying (${retryCount + 1}/${maxRetries})`);
                    currentDbVersion = null; // Force refresh
                    try {
                        const db = await openDatabase(true, retryCount + 1, storeToEnsure); // Pass storeToEnsure in retry
                        resolve(db);
                    } catch (retryError) {
                        reject(retryError);
                    }
                } else {
                    currentDbVersion = null; // Reset cache on final failure
                    reject(error);
                }
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const transaction = event.target.transaction;
                console.log(`[SW openDatabase] Upgrading DB from version ${event.oldVersion} to ${event.newVersion}.`);

                // Create store if it's specified and doesn't exist
                if (storeToEnsure && !db.objectStoreNames.contains(storeToEnsure)) {
                    console.log(`[SW openDatabase] Creating object store: "${storeToEnsure}"`);
                    db.createObjectStore(storeToEnsure); // No keyPath needed if keys are filenames/paths
                }

                 // Optional: Handle other potential store creations or index migrations here if needed

                transaction.oncomplete = () => {
                    console.log(`[SW openDatabase] DB upgrade complete for version ${event.newVersion}.`);
                };
                 transaction.onerror = (errEvent) => {
                     console.error(`[SW openDatabase] Error during DB upgrade transaction:`, errEvent.target.error);
                 };
            };

            request.onblocked = (event) => {
                console.warn(`[SW openDatabase] DB open blocked (version ${version}). Error: ${event.target.error}. Close other tabs using this DB.`);
                // Don't reject immediately, could be temporary. But might cause issues.
                // Consider rejecting after a timeout? For now, log warning.
                // Rejecting here prevents retries which might be needed.
                reject(new Error('Database open is blocked. Close other tabs.'));
            };
        });
    } catch (error) {
        console.error(`[SW openDatabase] Initialization failed:`, error);
        if (error.name !== 'VersionError' || retryCount >= maxRetries) {
            currentDbVersion = null;
        }
        throw error;
    }
}


/**
 * Opens database and checks if a specific store exists.
 * @param {string} title - The store name to check for.
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<IDBDatabase | null>} The database connection if the store exists, otherwise null.
 */
async function openDatabaseIfStoreExists(title, forceRefresh = false, retryCount = 0) {
  let db = null;
  try {
    // Use the standard openDatabase without store creation intention here
    db = await openDatabase(forceRefresh, retryCount);

    if (Array.from(db.objectStoreNames).includes(title)) {
      return db; // Store exists
    } else {
      console.warn(`[SW openDatabaseIfStoreExists] Store "${title}" does not exist.`);
      if (db) { try { db.close(); } catch (e) { /* ignore */ } }
      return null; // Store not found
    }
  } catch (error) {
    if (db) { try { db.close(); } catch (e) { /* ignore */ } } // Ensure close on error

    if (error.name === 'VersionError' && retryCount < maxRetries) {
      console.log(`[SW openDatabaseIfStoreExists] Version error detected for store check "${title}", refreshing and retrying (${retryCount + 1}/${maxRetries})`);
      return await openDatabaseIfStoreExists(title, true, retryCount + 1);
    }
    console.error(`[SW openDatabaseIfStoreExists] Error accessing database or checking store "${title}":`, error);
    throw error; // Rethrow other errors
  }
}

/**
 * 解析路径，获取存储名和键名
 * @param {string} path - 文件路径，格式为 /data/{title}/[path/to/file]
 * @returns {{title: string, key: string}} 包含 title 和 key 的对象
 */
function parsePath(path) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    // Updated regex to better handle optional trailing slash and empty key
    const match = normalizedPath.match(/^\/data\/([^\/]+)\/?(.*)$/);
    if (!match) {
        const error = new Error(`Invalid path format: ${path}, should be /data/{title}/[path/to/file]`);
        error.name = 'InvalidPathFormatError';
        throw error;
    }

    const rawTitle = match[1];
    // Key is everything after the first slash following the title, or empty string if nothing follows
    const rawKey = match[2] || '';

    try {
        // Decode only if necessary (avoid double decoding)
        const decodedTitle = rawTitle.includes('%') ? decodeURIComponent(rawTitle) : rawTitle;
        const decodedKey = rawKey.includes('%') ? decodeURIComponent(rawKey) : rawKey;
        return { title: decodedTitle, key: decodedKey };
    } catch (e) {
        console.error(`[SW parsePath] Failed to decode path component(s) in "${path}":`, e);
        const error = new Error(`Failed to decode path components: "${path}". Details: ${e.message}`);
        error.name = 'UriDecodeError';
        throw error;
    }
}


/**
 * 判断是否是文件夹 (based on key format)
 * @param {string} key - 键名
 * @returns {boolean} 是否是文件夹
 */
function isFolder(key) {
  // This function might not be directly used by readFile/writeFile but could be useful elsewhere.
  // A key representing a directory might conventionally end with '/' or be checked differently.
  // For now, assuming keys directly map to files.
  return key.endsWith('/'); // Simple convention
}

/**
 * 读取文件内容
 * @param {string} path - 文件路径，格式为 /data/{title}/path/to/file
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<any>} 文件内容
 */
async function readFile(path, forceRefresh = false, retryCount = 0) {
  let parsed;
  try {
      parsed = parsePath(path);
  } catch (e) {
       console.error(`[SW readFile] Invalid path: ${path}`, e);
      throw e; // Re-throw path format errors immediately
  }
  const { title, key } = parsed;

  // Allow reading from base directory if key is empty, but might represent listing later?
  // For now, assume empty key is invalid for *reading* a specific file.
  if (!key && key !== '') { // Allow key to be explicitly empty string if needed for some logic? No, reading requires a key.
    const error = new Error(`Cannot read file: Path missing key component: ${path}`);
    error.name = 'InvalidReadPathError';
    throw error;
  }
  // Check if reading a directory (if using '/' convention)
  // if (isFolder(key)) { ... }

  let db = null;
  try {
    // Use openDatabaseIfStoreExists to handle non-existent stores gracefully
    db = await openDatabaseIfStoreExists(title, forceRefresh, retryCount);

    if (db === null) {
       // Store itself doesn't exist
      const error = new Error(`File not found: ${path} (Store "${title}" does not exist)`);
      error.name = 'FileNotFoundError'; // Consistent error name
      throw error;
    }

    return new Promise((resolve, reject) => {
      let transaction;
       try {
            transaction = db.transaction([title], 'readonly');
       } catch (txError) {
            console.error(`[SW readFile] Failed to create readonly transaction for "${title}":`, txError);
            if (db && db.close) { try { db.close(); } catch(e) {/* ignore */} }
            reject(new Error(`Failed to start read transaction: ${txError.message}`));
            return;
       }
      const store = transaction.objectStore(title);
      const request = store.get(key); // Use the parsed key

      request.onsuccess = (event) => {
        const data = event.target.result;
        if (data === undefined) {
          // console.warn(`[SW readFile] Key "${key}" not found in store "${title}" for path "${path}".`);
          const error = new Error(`File not found: ${path} (Key "${key}" in store "${title}")`);
          error.name = 'FileNotFoundError';
          reject(error);
        } else {
          // console.log(`[SW readFile] Successfully read file at path: ${path}`); // Reduced verbosity
          resolve(data);
        }
      };

      request.onerror = (event) => {
        const error = event.target.error;
        console.error(`[SW readFile] Failed to read key "${key}" in store "${title}" (Path: ${path})`, error);
        if (error.name === 'VersionError' && retryCount < maxRetries) {
          reject(error); // Let outer catch handle retry
        } else {
          const formattedError = new Error(`IndexedDB read failed: ${path}, ${error.message || error}`);
          formattedError.name = 'IDBReadError';
          formattedError.originalError = error;
          reject(formattedError);
        }
      };

        transaction.oncomplete = () => {
             // console.log(`[SW readFile] Read transaction completed for path: ${path}`);
            if (db && db.close) { try { db.close(); } catch(e) {/* ignore */} } // Close DB on success
        };

        transaction.onerror = transaction.onabort = (event) => {
            const error = event.target.error || new Error("Transaction aborted/failed") ;
            console.error(`[SW readFile] Read transaction error/abort for path: ${path} (Store: ${title}, Key: ${key})`, error);

            if (db && db.close) { try { db.close(); } catch(e) {/* ignore */} } // Ensure close on failure

            if (error.name === 'VersionError' && retryCount < maxRetries) {
                reject(error); // Let outer catch handle retry
            } else {
                const formattedError = new Error(`IndexedDB read transaction failed: ${path}, ${error.message || error}`);
                formattedError.name = error.name === 'AbortError' ? 'IDBTransactionAborted' : 'IDBTransactionError';
                formattedError.originalError = error;
                reject(formattedError);
            }
      };
    });
  } catch (error) {
    // Ensure DB is closed if an error occurred before or during the promise execution
    if (db && db.close) { try { db.close(); } catch(e) {/* ignore */} }

    if (error.name === 'VersionError' && retryCount < maxRetries) {
      console.log(`[SW readFile] Caught version error, retrying with forced refresh (${retryCount + 1}/${maxRetries}) for path: ${path}`);
      return await readFile(path, true, retryCount + 1); // Retry
    }
    // Don't need to convert StoreNotFoundError anymore, it's already FileNotFoundError
    // else if (error.name === 'StoreNotFoundError') { ... }

    console.error(`[SW readFile] Failed to read file after potential retries: ${path}`, error);
    // Rethrow the original error (could be FileNotFoundError, IDBReadError, InvalidReadPathError, etc.)
    throw error;
  }
}

/**
 * 写入文件内容到 IndexedDB
 * @param {string} path - 文件路径，格式为 /data/{title}/path/to/file
 * @param {any} content - 要写入的内容
 * @param {boolean} forceRefresh - 是否强制刷新版本号 (for opening DB)
 * @param {number} retryCount - 当前重试次数 (for opening DB)
 * @returns {Promise<void>} 操作完成的 Promise
 */
async function writeFile(path, content, forceRefresh = false, retryCount = 0) {
    let parsed;
    try {
        parsed = parsePath(path);
    } catch (e) {
        console.error(`[SW writeFile] Invalid path: ${path}`, e);
        throw e; // Re-throw path format errors immediately
    }
    const { title, key } = parsed;

    if (!key && key !== '') { // Writing requires a non-empty key
      const error = new Error(`Cannot write file: Path missing key component: ${path}`);
      error.name = 'InvalidWritePathError';
      throw error;
    }
     // Cannot write to a directory path using this function
    // if (isFolder(key)) { ... }

    let db = null;
    try {
        // Use openDatabase and specify the store to ensure it exists, triggering upgrade if needed
        db = await openDatabase(forceRefresh, retryCount, title);

        return new Promise((resolve, reject) => {
             let transaction;
             try {
                transaction = db.transaction([title], 'readwrite');
             } catch (txError) {
                 console.error(`[SW writeFile] Failed to create readwrite transaction for "${title}":`, txError);
                 if (db && db.close) { try { db.close(); } catch(e) {/* ignore */} }
                 reject(new Error(`Failed to start write transaction: ${txError.message}`));
                 return;
             }
            const store = transaction.objectStore(title);
            const request = store.put(content, key); // Use PUT to add or update

            request.onsuccess = (event) => {
                // console.log(`[SW writeFile] Successfully wrote file at path: ${path}`);
                resolve(); // Resolve promise on successful write
            };

            request.onerror = (event) => {
                const error = event.target.error;
                console.error(`[SW writeFile] Failed to write key "${key}" in store "${title}" (Path: ${path})`, error);
                // Note: VersionError during write is less likely here if openDatabase succeeded,
                // but handle other potential errors.
                const formattedError = new Error(`IndexedDB write failed: ${path}, ${error.message || error}`);
                formattedError.name = 'IDBWriteError';
                formattedError.originalError = error;
                reject(formattedError);
            };

            transaction.oncomplete = () => {
                // console.log(`[SW writeFile] Write transaction completed for path: ${path}`);
                 if (db && db.close) { try { db.close(); } catch(e) {/* ignore */} } // Close DB on success
            };

            transaction.onerror = transaction.onabort = (event) => {
                const error = event.target.error || new Error("Transaction aborted/failed");
                console.error(`[SW writeFile] Write transaction error/abort for path: ${path} (Store: ${title}, Key: ${key})`, error);

                if (db && db.close) { try { db.close(); } catch(e) {/* ignore */} } // Ensure close on failure

                // Retrying transaction errors is complex, usually indicates a bigger issue.
                // Reject with specific error.
                const formattedError = new Error(`IndexedDB write transaction failed: ${path}, ${error.message || error}`);
                formattedError.name = error.name === 'AbortError' ? 'IDBTransactionAborted' : 'IDBTransactionError';
                formattedError.originalError = error;
                reject(formattedError);
            };
        });

    } catch (error) {
         if (db && db.close) { try { db.close(); } catch(e) {/* ignore */} } // Ensure DB is closed on error

        // Handle potential VersionError from openDatabase retries
        if (error.name === 'VersionError' && retryCount < maxRetries) {
            console.log(`[SW writeFile] Caught version error during DB open, retrying with forced refresh (${retryCount + 1}/${maxRetries}) for path: ${path}`);
            // Retry the entire writeFile operation
            return await writeFile(path, content, true, retryCount + 1);
        }

        console.error(`[SW writeFile] Failed to write file after potential retries: ${path}`, error);
        // Rethrow error (could be from openDatabase, parsePath, or the transaction promise)
        throw error;
    }
}


// --- Helper Functions for Content Type and Decoding (Keep existing: getMimeTypeFromExtension, parseDataUri, determineContentTypeAndBody) ---
// (Functions are assumed to be here and unchanged)
/**
 * Guesses the MIME type based on the file extension.
 * @param {string} filePath - The full file path (e.g., /data/title/image.png).
 * @returns {string} The guessed MIME type, defaults to 'application/octet-stream'.
 */
function getMimeTypeFromExtension(filePath) {
  const extMatch = filePath.match(/\.([^.]+)$/);
  if (!extMatch) {
    return 'application/octet-stream'; // Default if no extension
  }
  const ext = extMatch[1].toLowerCase();
  // Basic mapping for common types
  switch (ext) {
    case 'json': return 'application/json; charset=utf-8'; // Add charset
    case 'txt': return 'text/plain; charset=utf-8';
    case 'html': return 'text/html; charset=utf-8';
    case 'css': return 'text/css; charset=utf-8';
    case 'js': return 'text/javascript; charset=utf-8';
    case 'jpg': return 'image/jpg';
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'pdf': return 'application/pdf';
    case 'zip': return 'application/zip';
    case 'tar': return 'application/x-tar';
    case 'gz': return 'application/gzip';
    case 'xml': return 'application/xml; charset=utf-8'; // Add charset
    default: return 'application/octet-stream';
  }
}

/**
 * Parses a data URI and decodes base64 data.
 * @param {string} uri - The data URI string.
 * @returns {{contentType: string, body: any} | null} An object with contentType and decoded body (ArrayBuffer for base64), or null if not a data URI.
 */
function parseDataUri(uri) {
  if (typeof uri !== 'string' || !uri.startsWith('data:')) return null;
  const commaIndex = uri.indexOf(',');
  if (commaIndex === -1) throw new Error('Invalid data URI format: missing comma');
  const meta = uri.substring(5, commaIndex);
  const data = uri.substring(commaIndex + 1);
  const parts = meta.split(';');
  const mimeType = parts[0] || 'text/plain';
  const isBase64 = parts.some(part => part === 'base64');
  if (isBase64) {
    try {
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      return { contentType: mimeType, body: byteArray.buffer };
    } catch (e) {
      console.error('[SW parseDataUri] Failed to decode base64:', e);
      throw new Error('Failed to decode base64 data URI');
    }
  } else {
    try {
      const decodedText = decodeURIComponent(data);
      return { contentType: mimeType, body: decodedText };
    } catch (e) {
      console.error('[SW parseDataUri] Failed to decode data URI (non-base64):', e);
      throw new Error('Failed to decode data URI (non-base64)');
    }
  }
}

/**
 * Determines the appropriate Content-Type and body for the Response.
 * @param {any} fileContent - The raw data read from IndexedDB.
 * @param {string} filePath - The full path used to read the file.
 * @returns {{contentType: string, body: any}} Determined Content-Type and body.
 */
function determineContentTypeAndBody(fileContent, filePath) {
    if (typeof fileContent === 'string' && fileContent.startsWith('data:')) {
        try {
            const dataUriInfo = parseDataUri(fileContent);
            if (dataUriInfo) return dataUriInfo;
        } catch (e) {
            console.warn(`[SW] Error parsing data URI from ${filePath}. Falling back.`, e);
        }
    }
    if (fileContent instanceof Blob) {
        // console.log(`[SW] Content is Blob. Type: ${fileContent.type}`);
        return { contentType: fileContent.type || getMimeTypeFromExtension(filePath) || 'application/octet-stream', body: fileContent };
    }
    if (fileContent instanceof ArrayBuffer || ArrayBuffer.isView(fileContent)) {
         // console.log(`[SW] Content is ArrayBuffer/TypedArray.`);
        return { contentType: getMimeTypeFromExtension(filePath), body: fileContent };
    }
    // Handle null explicitly - perhaps return empty body with appropriate type?
    if (fileContent === null) {
        console.warn(`[SW determineContentTypeAndBody] File content is null for path: ${filePath}. Returning empty text.`);
        return { contentType: 'text/plain; charset=utf-8', body: '' };
    }
    if (typeof fileContent === 'object') { // Includes arrays
        // console.log(`[SW] Content is object/array. Assuming JSON.`);
        try {
            return { contentType: 'application/json; charset=utf-8', body: JSON.stringify(fileContent) };
        } catch (e) {
            console.error(`[SW] Failed to stringify object for JSON response for ${filePath}.`, e);
            // Fallback to string representation
            return { contentType: 'text/plain; charset=utf-8', body: String(fileContent) };
        }
    }
    // Default for strings, numbers, booleans
    const inferredType = getMimeTypeFromExtension(filePath);
    // If it's a generic stream type but content looks like text, use text/plain
    const contentType = inferredType === 'application/octet-stream' ? 'text/plain; charset=utf-8' : inferredType;
    // console.log(`[SW] Content is primitive/string. Type: ${contentType}`);
    return { contentType: contentType, body: String(fileContent) };
}


// Variable to cache the title within the SW lifespan (optional optimization)
let cachedTitle = null;
let titleFetchInProgress = null;

/**
 * Fetches the title from '/data/source/title.txt', using a simple cache.
 * @returns {Promise<string>} The title content.
 * @throws {Error} If the title file cannot be read.
 */
async function getDynamicTitle() {
    if (titleFetchInProgress) {
        // console.log("[SW getDynamicTitle] Waiting for existing title fetch...");
        return titleFetchInProgress;
    }

    titleFetchInProgress = (async () => {
        try {
            console.log("[SW] Fetching dynamic title from /data/source/title.txt");
            const titleContent = await readFile('/data/source/title.txt'); // Use readFile
            if (typeof titleContent !== 'string' || !titleContent.trim()) {
                throw new Error("Title content read from /data/source/title.txt is empty or not a string.");
            }
            cachedTitle = titleContent.trim(); // Store the valid title
            console.log(`[SW] Dynamic title resolved to: "${cachedTitle}"`);
            return cachedTitle;
        } catch (error) {
            console.error("[SW] Failed to read dynamic title from /data/source/title.txt:", error);
            cachedTitle = null; // Reset cache on error
            titleFetchInProgress = null; // Clear the promise lock on error BEFORE throwing

            const titleError = new Error(`Failed to retrieve dynamic title configuration: ${error.message}`);
            titleError.name = 'TitleConfigurationError';
            titleError.originalError = error; // Keep original error info
            throw titleError; // Rethrow a specific error
        } finally {
             // Ensure the lock is released regardless of success or specific error handled above
            if (titleFetchInProgress) { // Check if it wasn't already cleared by the catch block
                 titleFetchInProgress = null;
            }
        }
    })();

    return titleFetchInProgress;
}

// --- Helper Function to Generate Scene TXT (modified) ---
/**
 * Generates the scene TXT content, assuming the required JSON data exists.
 * @param {string} sceneIdOrKey - The scene ID ('0', numeric like '123', or combined like '123-abc').
 * @param {string} title - The dynamic title fetched from title.txt.
 * @returns {Promise<string>} The generated TXT content.
 * @throws {Error} If required JSON files (story or choice, depending on needs) are missing or invalid.
 */
async function generateSceneTxt(sceneIdOrKey, title) {
    // This function now assumes the prerequisite story JSON exists
    // because the check happens *before* calling it.
    // The sceneIdOrKey might be simple ('0', '123') or compound ('123-abc')
    // We need the base ID for the story file, and the full key for choice lookup.
    const baseSceneId = sceneIdOrKey.includes('-') ? sceneIdOrKey.split('-')[0] : sceneIdOrKey;

    const storyJsonPath = `/data/${title}/story/${baseSceneId}.json`;
    const choiceJsonPath = `/data/${title}/choice.json`;
    let outputLines = [];

    // console.log(`[SW generateSceneTxt] Generating for sceneIdOrKey: ${sceneIdOrKey}, baseSceneId: ${baseSceneId}, title: ${title}`);

    try {
        // Fetch story and choice data concurrently
        const [storyResult, choiceResult] = await Promise.allSettled([
            readFile(storyJsonPath), // Use base ID for story
            readFile(choiceJsonPath)
        ]);

        // --- Process Story Data ---
        let storyData = null;
        if (storyResult.status === 'fulfilled' && typeof storyResult.value === 'object' && storyResult.value !== null && Array.isArray(storyResult.value.conversations)) {
            storyData = storyResult.value;
        } else {
            // This case should theoretically not be reached if the pre-check works,
            // but handle defensively.
            const reason = storyResult.status === 'rejected' ? storyResult.reason : 'Invalid format or null';
            console.error(`[SW generateSceneTxt] Failed to read or parse story JSON from ${storyJsonPath}:`, reason);
            // Throw a specific error indicating data inconsistency
            const error = new Error(`Required story file missing or invalid despite pre-check: ${storyJsonPath}`);
            error.name = 'StoryDataInconsistencyError';
             error.originalError = storyResult.status === 'rejected' ? storyResult.reason : null;
            throw error;
        }

        // --- Process Conversation Data ---
        let previousPlace = null;
        let previousCharacter = null;

        if (baseSceneId === '0') { // Special handling for start scene (use base ID)
            outputLines.push('bgm:background1.mp3;');
        }

        for (const conv of storyData.conversations) {
            const currentPlace = conv.place || "";
            const currentCharacter = conv.character || "";
            const text = conv.text || "";
            const convId = conv.id; // Assume ID exists

            if (convId === undefined || convId === null) {
                console.warn(`[SW generateSceneTxt] Missing 'id' in conversation for base scene ${baseSceneId}. Skipping audio ref. Line:`, conv);
            }

            // Place -> changeBg
            const placeFilename = currentPlace ? `${encodeURIComponent(currentPlace)}.png` : 'none';
            if (currentPlace !== previousPlace && currentPlace!=='') { // Check if place actually changed or is set initially
                outputLines.push(`changeBg:${placeFilename} -next;`);
            }

            // Character -> changeFigure
            const figureFilename = currentCharacter ? `${encodeURIComponent(currentCharacter)}.png` : 'none';
            if (currentCharacter !== previousCharacter) { // Check if character changed or is set initially
                outputLines.push(`changeFigure:${figureFilename} -next;`);
            }

            // Dialogue Text and Audio
            let dialogueLine = '';
            if (currentCharacter) {
                dialogueLine = `${currentCharacter}:${text}`;
            } else {
                dialogueLine = `:${text}`;
            }
            // Add audio ref only if convId is valid and character exists
            if (convId !== undefined && convId !== null && currentCharacter) {
                const audioFileNameSuffix = `${baseSceneId}.${convId}.wav`; // Format: {baseSceneId}.{conversationId}.wav
                dialogueLine += ` -${audioFileNameSuffix};`;
            }
            outputLines.push(dialogueLine);

            // Update previous state
            previousPlace = currentPlace;
            previousCharacter = currentCharacter;
        }

        // --- Process Choice Data ---
        let choiceData = null;
        if (choiceResult.status === 'fulfilled' && typeof choiceResult.value === 'object' && choiceResult.value !== null) {
            choiceData = choiceResult.value;
        } else if (choiceResult.status === 'rejected') {
            // Choice file might be optional, log warning unless it's a critical error
            if (choiceResult.reason?.name !== 'FileNotFoundError') {
                 console.warn(`[SW generateSceneTxt] Failed to read choice JSON from ${choiceJsonPath}. Scene may lack choices. Error:`, choiceResult.reason);
            } else {
                 // console.log(`[SW generateSceneTxt] Optional choice file not found: ${choiceJsonPath}`);
            }
        } else { // Fulfilled but not a valid object
            console.warn(`[SW generateSceneTxt] Invalid choice JSON format from ${choiceJsonPath}. Expected object, got:`, typeof choiceResult.value);
        }

        // Check if choices exist for the *original* sceneIdOrKey (e.g., '123' or '123-abc')
        if (choiceData && Array.isArray(choiceData[sceneIdOrKey]) && choiceData[sceneIdOrKey].length > 0) {
            const choicesForScene = choiceData[sceneIdOrKey];
            let chooseLineParts = [];

            choicesForScene.forEach(choiceOption => {
                if (typeof choiceOption !== 'object' || choiceOption === null) {
                     console.warn(`[SW generateSceneTxt] Skipping invalid choice entry in scene ${sceneIdOrKey}:`, choiceOption);
                     return;
                }

                let text = "";
                let id = choiceOption.id; // Get the target scene/choice ID suffix

                // Find the choice text key (e.g., "choice1", "choice2") safely
                const choiceKey = Object.keys(choiceOption).find(key => key.startsWith('choice'));
                if (choiceKey) {
                    text = String(choiceOption[choiceKey] || ""); // Ensure text is string
                }
                id = String(id || ""); // Ensure id is string and handle missing id

                if (text && id) {
                    // Construct the target scene name: baseSceneId + '-' + choiceId + '.txt'
                    // Example: if current scene is 123, choice id is 'optionA', target is 123-optionA.txt
                    const targetSceneFile = `${baseSceneId}-${id}.txt`;
                    chooseLineParts.push(`${text}:choice-${targetSceneFile}`); // Use choice- prefix for immediate changeScene
                } else {
                    console.warn(`[SW generateSceneTxt] Invalid choice option found in scene ${sceneIdOrKey} (missing text or id):`, choiceOption);
                }
            });

            // Always add manual input option *if* other choices exist
             if (chooseLineParts.length > 0) {
                chooseLineParts.push('手动输入:label_input;');
                outputLines.push('choose:' + chooseLineParts.join('|') + ';');
                outputLines.push('label:label_input;'); // Add the label target
                outputLines.push('getUserInput:choice -title=输入选择内容 -buttonText=确认;');
                 // The target scene uses the base ID and the user input variable {choice}
                outputLines.push(`changeScene:${baseSceneId}-{choice}.txt;`);
             }

        } else {
             // console.log(`[SW generateSceneTxt] No choices found for scene key "${sceneIdOrKey}" in ${choiceJsonPath}`);
             // If no choices, maybe add a default next scene command?
             // Example: outputLines.push(`changeScene:${parseInt(baseSceneId, 10) + 1}.txt;`); // Needs careful handling of last scene
        }

        return outputLines.join('\n');

    } catch (error) {
        console.error(`[SW generateSceneTxt] Error generating scene TXT for sceneIdOrKey "${sceneIdOrKey}" (base ${baseSceneId}), title "${title}":`, error);
        // Rethrow the error to be caught by the fetch handler
        throw error;
    }
}


// --- Service Worker Event Listeners ---

console.log('Service Worker script loaded.');

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(self.skipWaiting()); // Ensure immediate activation
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  cachedTitle = null; // Clear cached title on activation
  titleFetchInProgress = null;
  event.waitUntil(clients.claim()); // Take control immediately
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const requestedPath = requestUrl.pathname;
  const method = event.request.method;

  // --- Helper function to create error responses ---
  const createErrorResponse = (status, message, details = '') => {
    console.error(`[SW Error ${status}] ${message}`, details);
    // Ensure details is serializable
    let errorDetails = '';
    if (details instanceof Error) {
        errorDetails = `${details.name}: ${details.message}`;
    } else if (typeof details === 'object') {
        try { errorDetails = JSON.stringify(details); } catch (e) { errorDetails = String(details); }
    } else {
        errorDetails = String(details);
    }
    return new Response(JSON.stringify({ error: message, details: errorDetails }), {
      status: status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent caching of errors
        'Pragma': 'no-cache',
        'Expires': '0',
       }
    });
  };

   // --- Helper function for standard text/plain responses ---
   const createTextResponse = (body, status = 200, cache = true) => {
       const headers = {
           'Content-Type': 'text/plain; charset=utf-8',
       };
       if (!cache) {
           headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
           headers['Pragma'] = 'no-cache';
           headers['Expires'] = '0';
       }
       return new Response(body, { status, headers });
   };

// --- New Rule: Redirect /webgal/game/vocal/{x}.{y}.wav to IndexedDB ---
// (Keep existing vocal handler - seems unchanged by the request)
if (method === 'GET' && requestedPath.startsWith('/webgal/game/vocal/')) {
  const vocalFileName = requestedPath.substring('/webgal/game/vocal/'.length);

  // Validate the filename and extract x and y components
  const vocalMatch = vocalFileName.match(/^(\d+)\.(\d+)\.wav$/); // Match digits.digits.wav
  if (!vocalMatch) {
    return event.respondWith(createErrorResponse(400, 'Invalid Vocal Path', `Path ${requestedPath} is an invalid vocal audio path.`));
  }

  const [_, x, y] = vocalMatch;
  // console.log(`[SW] Intercepting ${method} ${requestedPath}. Handling voice path ${x}/${y} .wav`);

  event.respondWith(
    (async () => {
       let dynamicTitle;
          try {
            dynamicTitle = await getDynamicTitle(); // Fetch title first
          } catch (titleError) {
             if (titleError.name === 'TitleConfigurationError') {
               return createErrorResponse(500, 'Configuration Error', titleError.message);
             }
             // Handle other potential errors from getDynamicTitle if necessary
             return createErrorResponse(500, 'Internal Server Error', `Unexpected error getting title: ${titleError.message}`);
          }
       //Create the idb path
        const targetPathForReadFile = `/data/${dynamicTitle}/audio/${x}/${y}.wav`;

        // console.log(`[SW] Attempting to load audio vocal from IndexedDB: ${targetPathForReadFile}`);
         try  {
            const fileContent = await readFile(targetPathForReadFile);
            const { body, contentType } = determineContentTypeAndBody(fileContent, targetPathForReadFile);
            // console.log(`[SW] Character vocal loaded from IndexedDB: ${targetPathForReadFile}`);
            return new Response(body, { status: 200, headers: { 'Content-Type': contentType } });
           } catch (idbError) {
              if (idbError.name === 'FileNotFoundError') {
               console.warn(`[SW] Audio ${requestedPath} (path: ${targetPathForReadFile}) not found in IndexedDB. Falling back to network.`);
                   // File not found, fallback to network
                     try{
                      const networkResponse = await fetch(event.request);
                      // console.log(`[SW] Network fallback for ${requestedPath} status: ${networkResponse.status}`);
                      return networkResponse;
                      } catch (networkError) {
                       console.error(`[SW] Network fallback failed for ${requestedPath}:`, networkError);
                      return createErrorResponse(503, 'Network Error', `Failed to fetch resource: ${networkError.message}`);
                     }
                } else { // Handle other IndexedDB errors
                   if (idbError.message && idbError.message.includes('Database open is blocked')) {
                      return createErrorResponse(503, 'Database Access Blocked','Please close other tabs using this app.');
                   } else if (idbError.name && idbError.name.startsWith('IDB')) {
                        return createErrorResponse(500, 'IndexedDB Error', `DB error reading ${targetPathForReadFile}: ${idbError.message}`);
                   } else {
                        // Other errors (e.g., parsing path, etc.)
                        return createErrorResponse(500, 'Internal Server Error', `Failed to process vocal request for ${targetPathForReadFile}: ${idbError.message}`);
                   }
                 }
            }
            })()
          );
           return; // Stop processing rules for this request
      }


  // --- Rule: Handle /webgal/game/figure/{character}.png (dynamic title, network fallback) ---
  // (Keep existing figure handler - seems unchanged by the request)
  if (method === 'GET' && requestedPath.startsWith('/webgal/game/figure/')) {
    const charFileName = requestedPath.substring('/webgal/game/figure/'.length);

    // Basic validation
    if (!charFileName || !charFileName.endsWith('.png') || charFileName.includes('/')) {
      return event.respondWith(createErrorResponse(400, 'Invalid Character Path', `Path ${requestedPath} is invalid.`));
    }
    // console.log(`[SW] Intercepting ${method} ${requestedPath}. Handling character image.`);
    event.respondWith(
      (async () => {
        let dynamicTitle;
        try {
            dynamicTitle = await getDynamicTitle(); // Fetch title first
        } catch (titleError) {
             if (titleError.name === 'TitleConfigurationError') {
               return createErrorResponse(500, 'Configuration Error', titleError.message);
             }
             return createErrorResponse(500, 'Internal Server Error', `Unexpected error getting title: ${titleError.message}`);
        }
        // Construct path
          const targetPathForReadFile = `/data/${dynamicTitle}/images/${charFileName}`;
          // console.log(`[SW] Attempting to load character image from IndexedDB: ${targetPathForReadFile}`);

        try {
          const fileContent = await readFile(targetPathForReadFile);
          const { body, contentType } = determineContentTypeAndBody(fileContent, targetPathForReadFile);
          // console.log(`[SW] Character loaded from IndexedDB: ${targetPathForReadFile}`);
          return new Response(body, { status: 200, headers: { 'Content-Type': contentType } });
        } catch (idbError) {
          if (idbError.name === 'FileNotFoundError') {
            console.warn(`[SW] Character ${requestedPath} (path: ${targetPathForReadFile}) not found in IndexedDB. Falling back to network.`);
               try {
                    const networkResponse = await fetch(event.request);
                    // console.log(`[SW] Network fallback for ${requestedPath} status: ${networkResponse.status}`);
                     return networkResponse;
                } catch (networkError) {
                 console.error(`[SW] Network fallback failed for ${requestedPath}:`, networkError);
                  return createErrorResponse(503, 'Network Error', `Failed to fetch resource: ${networkError.message}`);
                }
          } else { // Handle other IndexedDB errors
              if (idbError.message && idbError.message.includes('Database open is blocked')) {
                return createErrorResponse(503, 'Database Access Blocked','Please close other tabs using this app.');
              } else if (idbError.name && idbError.name.startsWith('IDB')) {
                  return createErrorResponse(500, 'IndexedDB Error',`DB error reading ${targetPathForReadFile}: ${idbError.message}`);
              } else {
                  return createErrorResponse(500, 'Internal Server Error', `Failed to process figure request for ${targetPathForReadFile}: ${idbError.message}`);
              }
          }
        }
      })()
    );
    return; // Stop processing rules
  }

  // --- MODIFIED Rule: Handle /webgal/game/scene/{id}.txt, {a}-{b}.txt, start.txt ---
  if (method === 'GET' && requestedPath.startsWith('/webgal/game/scene/')) {
      const fileName = requestedPath.substring('/webgal/game/scene/'.length);
      let sceneIdOrKey = null; // Will hold '0', '123', '123-abc', etc.
      let isChoiceShortcut = false;
      let isReadStatusRequest = false;
      let statusId = null; // For read-status requests

      // 1. Check for 'read-status-' requests first
      const statusMatch = fileName.match(/^read-status-(.+)\.txt$/);
      if (statusMatch) {
          isReadStatusRequest = true;
          statusId = statusMatch[1]; // Can be '0', '123', '123-abc' etc.
          console.log(`[SW] Intercepting ${method} ${requestedPath}. Handling read-status request for ID: "${statusId}".`);
      } else if (fileName === 'start.txt') {
          sceneIdOrKey = '0';
          console.log(`[SW] Intercepting ${method} ${requestedPath}. Handling scene ID "0".`);
      } else if (fileName.startsWith('choice-')) {
          // Handle the choice shortcut directly
          isChoiceShortcut = true;
          const targetSceneFile = fileName.substring('choice-'.length);
           console.log(`[SW] Intercepting ${method} ${requestedPath}. Handling choice shortcut, redirecting to: ${targetSceneFile}`);
          event.respondWith(
              createTextResponse(`changeScene:${targetSceneFile};`, 200, false) // No cache for redirects
          );
          return; // Stop processing
      } else {
          // Match numeric ID or compound ID (a-b)
          // Allows digits, letters, hyphens, underscores in 'a' and 'b' parts
          const sceneMatch = fileName.match(/^([\w\-]+)\.txt$/);
          const compoundMatch = fileName.match(/^([\w\-]+)-([\w\-%\{\}]+)\.txt$/); // Allow urlencoded {choice} in b

          if (compoundMatch) {
              const a = compoundMatch[1];
              const b = compoundMatch[2];
              if (b === '%7Bchoice%7D') { // Check for URL-encoded {choice}
                  console.log(`[SW] Intercepting ${method} ${requestedPath}. Matched ${a}-{choice}.txt, returning empty response.`);
                   event.respondWith(createTextResponse('', 200, false)); // Return empty 200 OK, no cache
                   return; // Stop processing
              } else {
                  // Treat as a standard compound scene ID
                  sceneIdOrKey = `${a}-${decodeURIComponent(b)}`; // Use the full 'a-b' as the key
                  console.log(`[SW] Intercepting ${method} ${requestedPath}. Handling compound scene key "${sceneIdOrKey}".`);
              }
          } else if (sceneMatch) {
             // Simple scene ID (numeric or potentially alphanumeric)
             sceneIdOrKey = sceneMatch[1];
             console.log(`[SW] Intercepting ${method} ${requestedPath}. Handling scene ID "${sceneIdOrKey}".`);
          }
      }

      // --- Handle read-status requests (Process ②) ---
      if (isReadStatusRequest) {
          event.respondWith(
              (async () => {
                  let dynamicTitle;
                  try {
                      dynamicTitle = await getDynamicTitle();
                  } catch (titleError) {
                       if (titleError.name === 'TitleConfigurationError') {
                           return createErrorResponse(500, 'Configuration Error', titleError.message);
                       }
                       return createErrorResponse(500, 'Internal Server Error', `Unexpected error getting title for status check: ${titleError.message}`);
                  }

                  const statusFilePath = `/data/${dynamicTitle}/status.txt`;
                  // console.log(`[SW read-status] Delaying 3s then reading: ${statusFilePath}`);

                  // ① Delay 3 seconds
                  await new Promise(resolve => setTimeout(resolve, 3000));

                  try {
                      // ② Read status.txt
                      const statusContent = await readFile(statusFilePath);
                      const statusString = String(statusContent).trim(); // Ensure it's a string

                      console.log(`[SW read-status] Read status for ID ${statusId}: "${statusString}"`);

                      // ③ Determine response based on status
                      if (statusString.startsWith('start')) {
                          return createTextResponse(
                              `:正在生成故事内容 -next;\nchangeScene:read-status-${statusId}.txt;`,
                              200, false // No cache for polling responses
                          );
                      } else if (statusString.startsWith('text_fail')) {
                           return createTextResponse(
                               `changeScene:fail.txt;`, // Assumes fail.txt exists or is handled elsewhere
                               200, false
                           );
                      } else if (statusString.startsWith('text_success:')) {
                           // Keep polling the same status file
                           return createTextResponse(
                               `:正在生成图片等资源 -next;\nchangeScene:read-status-${statusId}.txt;`,
                               200, false
                           );
                      } else if (statusString.startsWith('end:')) {
                           const finalId = statusString.substring('end:'.length).trim();
                           if (!finalId) {
                               console.error(`[SW read-status] Invalid 'end:' status format: "${statusString}"`);
                               return createErrorResponse(500, 'Invalid Status', 'End status missing final ID.');
                           }
                           // Redirect to the final generated scene file
                           return createTextResponse(
                               `changeScene:${finalId}.txt;`,
                               200, false
                           );
                      } else {
                          // Unknown status, treat as 'start' to keep polling? Or error?
                          console.warn(`[SW read-status] Unknown status found: "${statusString}". Treating as 'start'.`);
                           return createTextResponse(
                               `:状态未知，继续尝试... -next;\nchangeScene:read-status-${statusId}.txt;`,
                               200, false
                           );
                      }

                  } catch (error) {
                      if (error.name === 'FileNotFoundError') {
                          // status.txt doesn't exist yet, assume process hasn't started or completed externally
                          console.warn(`[SW read-status] Status file not found: ${statusFilePath}. Assuming 'start'.`);
                           return createTextResponse(
                               `:正在准备生成 -next;\nchangeScene:read-status-${statusId}.txt;`,
                               200, false
                           );
                      } else if (error.message && error.message.includes('Database open is blocked')) {
                         return createErrorResponse(503, 'Database Access Blocked', 'Please close other tabs using this app.');
                      } else if (error.name && error.name.startsWith('IDB')) {
                           return createErrorResponse(500, 'IndexedDB Error', `DB error reading status file ${statusFilePath}: ${error.message}`);
                      } else {
                          console.error(`[SW read-status] Error processing status for ID ${statusId}:`, error);
                           return createErrorResponse(500, 'Status Check Error', `Failed to process status check: ${error.message}`);
                      }
                  }
              })()
          );
          return; // Stop processing
      }


      // --- Handle actual scene requests ({id}.txt, {a}-{b}.txt, start.txt) ---
      if (sceneIdOrKey !== null) {
          event.respondWith(
              (async () => {
                  let dynamicTitle;
                  try {
                      dynamicTitle = await getDynamicTitle();
                  } catch (titleError) {
                       if (titleError.name === 'TitleConfigurationError') {
                           return createErrorResponse(500, 'Configuration Error', titleError.message);
                       }
                       return createErrorResponse(500, 'Internal Server Error', `Unexpected error getting title for scene ${sceneIdOrKey}: ${titleError.message}`);
                  }

                  // Determine the base scene ID for checking the story JSON file
                  const baseSceneIdToCheck = sceneIdOrKey;
                  const storyJsonPath = `/data/${dynamicTitle}/story/${baseSceneIdToCheck}.json`;

                  try {
                      // Check if the corresponding story JSON exists
                      // console.log(`[SW scene] Checking existence of: ${storyJsonPath}`);
                      await readFile(storyJsonPath); // If this succeeds, the file exists
                      // console.log(`[SW scene] Story JSON found: ${storyJsonPath}. Proceeding with generation.`);

                      // If JSON exists, generate the TXT content
                      const sceneContent = await generateSceneTxt(sceneIdOrKey, dynamicTitle); // Pass the *original* key and title
                      return createTextResponse(sceneContent, 200, false); // No cache for dynamic scenes

                  } catch (error) {
                      if (error.name === 'FileNotFoundError') {
                          if (sceneIdOrKey==='fail'){
                            const responseBody = `:生成失败;\nend;`;
                            return createTextResponse(responseBody, 200, false); // No cache
                          }
                          // *** STORY JSON NOT FOUND - Trigger Process ① ***
                          console.log(`[SW scene] Story JSON not found: ${storyJsonPath}. Initiating generation process for scene key: ${sceneIdOrKey}.`);
                          const continueFilePath = `/data/${dynamicTitle}/continue.txt`;

                          try {
                              // Write the requested sceneIdOrKey to continue.txt
                              await writeFile(continueFilePath, sceneIdOrKey);
                              console.log(`[SW scene] Wrote "${sceneIdOrKey}" to ${continueFilePath}`);

                              // Return the placeholder response
                              const responseBody = `:正在生成 -next;\nchangeScene:read-status-${sceneIdOrKey}.txt;`;
                              return createTextResponse(responseBody, 200, false); // No cache

                          } catch (writeError) {
                              console.error(`[SW scene] Failed to write to ${continueFilePath}:`, writeError);
                               if (writeError.message && writeError.message.includes('Database open is blocked')) {
                                  return createErrorResponse(503, 'Database Access Blocked', 'Please close other tabs using this app.');
                               } else if (writeError.name && writeError.name.startsWith('IDB')) {
                                   return createErrorResponse(500, 'IndexedDB Write Error', `Failed to write continue file: ${writeError.message}`);
                               } else {
                                   return createErrorResponse(500, 'Generation Init Error', `Failed to initiate generation process: ${writeError.message}`);
                               }
                          }
                      } else if (error.name === 'StoryDataInconsistencyError' || error.name === 'Scene Generation Error') {
                           // Error during generateSceneTxt (e.g., choice file issue, internal logic)
                           console.error(`[SW scene] Error during generateSceneTxt for ${sceneIdOrKey}:`, error);
                           return createErrorResponse(500, 'Scene Generation Error', error.message);
                      } else if (error.message && error.message.includes('Database open is blocked')) {
                           return createErrorResponse(503, 'Database Access Blocked', 'Please close other tabs using this app.');
                      } else if (error.name && error.name.startsWith('IDB')) {
                            return createErrorResponse(500, 'IndexedDB Error', `DB error checking/reading ${storyJsonPath}: ${error.message}`);
                      } else {
                           // Other unexpected errors during the check or generation
                           console.error(`[SW scene] Unexpected error processing scene ${sceneIdOrKey}:`, error);
                           return createErrorResponse(500, 'Internal Server Error', `Failed to process scene request: ${error.message}`);
                      }
                  }
              })()
          );
          return; // Stop processing
      }

      // If the request reached here, it's an invalid format within /webgal/game/scene/
      // (e.g., /webgal/game/scene/invalid-format or /webgal/game/scene/folder/1.txt)
       console.log(`[SW] Invalid scene path format: ${requestedPath}`);
      event.respondWith(createErrorResponse(400, 'Invalid Scene Path Format', `Path ${requestedPath} is not a valid scene file (start.txt, {id}.txt, {a}-{b}.txt, read-status-....txt, choice-....txt).`));
      return; // Explicit return
  }


  // --- Rule: Handle /webgal/game/background/{image}.png (dynamic title, network fallback) ---
  // (Keep existing background handler - seems unchanged by the request)
  if (method === 'GET' && requestedPath.startsWith('/webgal/game/background/')) {
    const imageFileName = requestedPath.substring('/webgal/game/background/'.length);

    if (!imageFileName || imageFileName.includes('/') /* Add more robust validation if needed */) {
         return event.respondWith(createErrorResponse(400, 'Invalid Image Path', `Invalid image filename in ${requestedPath}`));
    }
     // console.log(`[SW] Intercepting ${method} ${requestedPath}. Handling background image.`);
    event.respondWith(
      (async () => {
          let dynamicTitle;
           try {
               dynamicTitle = await getDynamicTitle(); // Fetch title first
           } catch (titleError) {
                if (titleError.name === 'TitleConfigurationError') {
                    return createErrorResponse(500, 'Configuration Error', titleError.message);
                }
                return createErrorResponse(500, 'Internal Server Error', `Unexpected error getting title for background: ${titleError.message}`);
           }

          // Construct dynamic path
          const targetPathForReadFile = `/data/${dynamicTitle}/images/${imageFileName}`;
          // console.log(`[SW] Attempting to load image from IndexedDB: ${targetPathForReadFile}`);

        try {
            // Attempt to read from IndexedDB using the dynamic title
          const fileContent = await readFile(targetPathForReadFile);
          const { body, contentType } = determineContentTypeAndBody(fileContent, targetPathForReadFile);
          // console.log(`[SW] Image loaded from IndexedDB: ${targetPathForReadFile}`);
          return new Response(body, { status: 200, headers: { 'Content-Type': contentType } });

        } catch (idbError) {
            // Check if it was specifically a "file not found" error (either store or key)
          if (idbError.name === 'FileNotFoundError') {
            console.warn(`[SW] Background ${requestedPath} (path: ${targetPathForReadFile}) not found in IndexedDB. Falling back to network.`);
            try {
                // Fallback: Fetch from the network using the original request
                const networkResponse = await fetch(event.request);
                 // console.log(`[SW] Network fallback for ${requestedPath} status: ${networkResponse.status}`);
                 // Return the network response directly (successful or error)
                   return networkResponse;
            } catch (networkError) {
                  console.error(`[SW] Network fallback failed for ${requestedPath}:`, networkError);
                   return createErrorResponse(503, 'Network Error', `Failed to fetch resource: ${networkError.message}`);
            }
          } else { // Handle other IndexedDB errors
             if (idbError.message && idbError.message.includes('Database open is blocked')) {
                  return createErrorResponse(503, 'Database Access Blocked','Please close other tabs using this app.');
             } else if (idbError.name && idbError.name.startsWith('IDB')) {
                   return createErrorResponse(500, 'IndexedDB Error', `DB error reading image ${targetPathForReadFile}: ${idbError.message}`);
             } else {
                   return createErrorResponse(500, 'Internal Server Error', `Failed to process background request for ${targetPathForReadFile}: ${idbError.message}`);
             }
          }
        }
      })()
    );
    return; // Stop processing
  }

  // --- Rule: Handle /webgal/game/bgm/{music}.mp3 (dynamic title, network fallback) ---
  // (Keep existing bgm handler - seems unchanged by the request)
  if (method === 'GET' && requestedPath.startsWith('/webgal/game/bgm/')) {
    const musicFileName = requestedPath.substring('/webgal/game/bgm/'.length);

       if (!musicFileName || musicFileName.includes('/')) {
          return event.respondWith(createErrorResponse(400, 'Invalid Music Path',`Invalid music filename in ${requestedPath}`));
       }
       // console.log(`[SW] Intercepting ${method} ${requestedPath}. Handling background music.`);
       event.respondWith(
        (async () => {
            let dynamicTitle;
             try {
                 dynamicTitle = await getDynamicTitle(); // Fetch title first
             } catch (titleError) {
                  if (titleError.name === 'TitleConfigurationError') {
                      return createErrorResponse(500, 'Configuration Error', titleError.message);
                  }
                  return createErrorResponse(500, 'Internal Server Error', `Unexpected error getting title for BGM: ${titleError.message}`);
             }

           // Construct dynamic path
          const targetPathForReadFile = `/data/${dynamicTitle}/music/${musicFileName}`;
           // console.log(`[SW] Attempting to load music from IndexedDB: ${targetPathForReadFile}`);

          try {
              // Attempt to read from IndexedDB
            const fileContent = await readFile(targetPathForReadFile);
            const { body, contentType } = determineContentTypeAndBody(fileContent, targetPathForReadFile);
            // console.log(`[SW] Music loaded from IndexedDB: ${targetPathForReadFile}`);
            return new Response(body, { status: 206, headers: { 'Content-Type': contentType } });

          } catch (idbError) {
            if (idbError.name === 'FileNotFoundError') {
               console.warn(`[SW] Music ${requestedPath} (path: ${targetPathForReadFile}) not found in IndexedDB. Falling back to network.`);
               try {
                 // Fallback: Fetch from the network
                 const networkResponse = await fetch(event.request);
                   // console.log(`[SW] Network fallback for ${requestedPath} status: ${networkResponse.status}`);
                 return networkResponse; // Return network response (success or error)
               } catch (networkError) {
                  console.error(`[SW] Network fallback failed for ${requestedPath}:`, networkError);
                    return createErrorResponse(503, 'Network Error',`Failed to fetch resource: ${networkError.message}`);
               }
            } else { // Handle other IndexedDB errors
                 if (idbError.message && idbError.message.includes('Database open is blocked')) {
                     return createErrorResponse(503, 'Database Access Blocked','Please close other tabs using this app.');
                 } else if (idbError.name && idbError.name.startsWith('IDB')) {
                      return createErrorResponse(500, 'IndexedDB Error', `DB error reading music ${targetPathForReadFile}: ${idbError.message}`);
                 } else {
                      return createErrorResponse(500, 'Internal Server Error', `Failed to process BGM request for ${targetPathForReadFile}: ${idbError.message}`);
                 }
            }
          }
        })()
      );
      return; // Stop processing
  }

  // --- Rule: Handle /game/config.txt (Uses dynamic title for Game_name) ---
  // (Keep existing config handler - seems unchanged by the request)
  if (method === 'GET' && requestedPath.endsWith('/game/config.txt')) { // EndsWith allows flexibility in base path
    console.log(`[SW] Intercepting ${method} ${requestedPath}. Generating config.txt.`);
    event.respondWith(
      (async () => {
        try {
          // Note: Uses readFile directly on /data/source/title.txt, NOT getDynamicTitle() cache
          // This might be intentional or could be changed to use getDynamicTitle() for consistency
          const titleContent = await readFile('/data/source/title.txt');
           if (typeof titleContent !== 'string') {
               throw new Error("Title content from /data/source/title.txt is not a string.");
           }
          let game_key = (x => {let h = 0; for (let i = 0; i < titleContent.trim().length; i++) {let c = titleContent.trim().charCodeAt(i); h = (h << 5) - h + c; h = h & h;} return Math.abs(h).toString(16).padStart(8, '0').slice(0, 8);})(titleContent.trim());
          const configContent = `Game_name:${titleContent.trim()};\nGame_key:${game_key};\nTitle_img:title.png;\nTitle_bgm:background.mp3;\nTextbox_theme:imss;`;
          return createTextResponse(configContent, 200, false); // Config should likely not be cached

        } catch (error) {
           if (error.name === 'FileNotFoundError') {
               return createErrorResponse(404, 'Configuration Error', 'Title file (/data/source/title.txt) not found for config generation.');
           } else if (error.name === 'TitleConfigurationError') { // If using getDynamicTitle()
               return createErrorResponse(500, 'Configuration Error', error.message);
           } else if (error.message && error.message.includes('Database open is blocked')) {
                return createErrorResponse(503, 'Database Access Blocked','Please close other tabs using this app.');
           } else if (error.name && error.name.startsWith('IDB')) {
                return createErrorResponse(500, 'IndexedDB Error', `DB error reading title for config: ${error.message}`);
           } else {
               console.error(`[SW config.txt] Error generating config:`, error);
               return createErrorResponse(500, 'Configuration Generation Error', `Failed to generate config.txt: ${error.message}`);
           }
        }
      })()
    );
    return;
  }

  // --- Rule: Handle generic /read/*** requests ---
  // (Keep existing /read/ handler - seems unchanged by the request)
  if (method === 'GET' && requestedPath.startsWith('/read/')) {
    const pathAfterRead = requestedPath.slice('/read/'.length);

    if (!pathAfterRead) {
          return event.respondWith(createErrorResponse(400, 'Invalid Read Path','Path cannot be empty after /read/'));
    }

    // Construct the full /data/... path
    const parts = pathAfterRead.split('/');
    if (parts.length < 2 || !parts[0] || !parts[1]) { // Need at least title and one key part
        return event.respondWith(createErrorResponse(400, 'Invalid Read Path Format', `Expected /read/{title}/{key...}, got /read/${pathAfterRead}`));
    }
    // Reconstruct path for parsePath
    const targetPathForReadFile = `/data/${pathAfterRead}`;

    // console.log(`[SW] Intercepting ${method} ${requestedPath}. Reading from IndexedDB via /read/: ${targetPathForReadFile}`);

    event.respondWith(
      (async () => {
        try {
          const fileContent = await readFile(targetPathForReadFile);
          const { body, contentType } = determineContentTypeAndBody(fileContent, targetPathForReadFile);
          return new Response(body, { status: 200, headers: { 'Content-Type': contentType } });
        } catch (error) {
           if (error.name === 'FileNotFoundError') {
               return createErrorResponse(404, 'File Not Found', `Resource not found at ${targetPathForReadFile}.`);
           } else if (error.message && error.message.includes('Database open is blocked')) {
                return createErrorResponse(503, 'Database Access Blocked','Please close other tabs using this app.');
           } else if (error.name && error.name.startsWith('IDB')) {
                return createErrorResponse(500, 'IndexedDB Read Error', `Failed to read ${targetPathForReadFile}: ${error.message}`);
           } else if (error.name === 'InvalidPathFormatError') {
                return createErrorResponse(400, 'Invalid Read Path', error.message);
           } else {
                console.error(`[SW /read/] Error reading ${targetPathForReadFile}:`, error);
                 return createErrorResponse(500, 'Read Error', `Failed to read ${targetPathForReadFile}: ${error.message}`);
           }
        }
      })()
    );
    return; // Stop processing
  }

  // --- Fallback ---
  // console.log(`[SW] Request not handled by custom rules, allowing browser default: ${method} ${requestedPath}`);
  // Let the browser handle the request (network, standard cache, etc.)
  // Returning nothing or undefined explicitly allows default behavior.
  return;

});