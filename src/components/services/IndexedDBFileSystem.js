/**
 * IndexedDB 文件系统模拟
 * 用于替代传统文件系统，支持文件和文件夹的操作
 * 
 * Current Date and Time (UTC): 2025-04-20 14:20:34
 * Current User's Login: djfaaa
 */

// 数据库常量
const DB_NAME = 'data';
let currentDbVersion = null;
let maxRetries = 2; // 设置最大重试次数

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
    const request = indexedDB.open(DB_NAME);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      currentDbVersion = db.version;
      db.close();
      resolve(currentDbVersion);
    };
    
    request.onerror = (event) => {
      console.log("获取数据库版本失败，使用版本1", event.target.error);
      currentDbVersion = 1;
      resolve(1);
    };
  });
}

/**
 * 初始化数据库连接
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<IDBDatabase>} 数据库连接
 */
async function openDatabase(forceRefresh = false, retryCount = 0) {
  try {
    const version = await getDatabaseVersion(forceRefresh);
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, version);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        resolve(db);
      };
      
      request.onerror = async (event) => {
        const error = event.target.error;
        console.error("打开数据库失败:", error);
        
        // 检查是否为版本错误，可能是因为其他页面更新了版本
        if (error.name === 'VersionError' && retryCount < maxRetries) {
          console.log(`检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
          
          // 强制刷新版本号并重试打开数据库
          try {
            const db = await openDatabase(true, retryCount + 1);
            resolve(db);
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          reject(error);
        }
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log(`数据库版本从 ${event.oldVersion} 升级到 ${event.newVersion}`);
      };
      
      request.onblocked = (event) => {
        console.warn("数据库打开被阻塞，可能是因为有其他连接未关闭");
      };
    });
  } catch (error) {
    console.error("初始化数据库连接失败:", error);
    throw error;
  }
}

/**
 * 确保存储对象存在
 * @param {string} title - 标题/存储名
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<IDBDatabase>} 更新后的数据库连接
 */
async function ensureStoreExists(title, forceRefresh = false, retryCount = 0) {
  let db = null;
  try {
    db = await openDatabase(forceRefresh, retryCount);
    
    if (Array.from(db.objectStoreNames).includes(title)) {
      return db;
    }
    
    // 需要升级数据库版本
    const currentVersion = db.version;
    db.close();
    db = null;
    
    // 更新缓存的版本号
    currentDbVersion = currentVersion + 1;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, currentDbVersion);
      
      request.onupgradeneeded = (event) => {
        const upgradeDb = event.target.result;
        if (!Array.from(upgradeDb.objectStoreNames).includes(title)) {
          upgradeDb.createObjectStore(title);
          console.log(`创建存储 ${title} 成功`);
        }
      };
      
      request.onsuccess = (event) => {
        console.log(`确保存储 ${title} 存在成功`);
        resolve(event.target.result);
      };
      
      request.onerror = async (event) => {
        const error = event.target.error;
        console.error(`确保存储 ${title} 存在失败:`, error);
        
        // 检查是否为版本错误，可能是因为其他页面更新了版本
        if (error.name === 'VersionError' && retryCount < maxRetries) {
          console.log(`检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
          
          // 强制刷新版本号并重试
          try {
            const db = await ensureStoreExists(title, true, retryCount + 1);
            resolve(db);
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          reject(error);
        }
      };
      
      request.onblocked = (event) => {
        console.warn("数据库升级被阻塞，可能是因为有其他连接未关闭");
      };
    });
  } catch (error) {
    console.error(`确保存储 ${title} 存在失败:`, error);
    if (db) db.close();
    throw error;
  }
}

/**
 * 解析路径，获取存储名和键名
 * @param {string} path - 文件路径，格式为 /data/{title}/[path/to/file]
 * @returns {Object} 包含 title 和 key 的对象
 * @throws {Error} 如果路径格式无效
 */
function parsePath(path) {
  // 标准化路径
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 解析路径
  const match = normalizedPath.match(/^\/data\/([^\/]+)(?:\/(.*))?$/);
  if (!match) {
    throw new Error(`无效的路径格式: ${path}，应为 /data/{title}/[path/to/file]`);
  }
  
  const title = match[1];
  const key = match[2] || '';
  
  return { title, key };
}

/**
 * 判断是否是文件夹
 * @param {string} key - 键名
 * @returns {boolean} 是否是文件夹
 */
function isFolder(key) {
  // 文件夹键以冒号开头
  return key.startsWith(':');
}

/**
 * 获取文件名或文件夹名
 * @param {string} path - 路径
 * @returns {string} 文件名或文件夹名
 */
function getBaseName(path) {
  if (!path) return '';
  const parts = path.split('/');
  return parts[parts.length - 1];
}

/**
 * 获取父文件夹路径
 * @param {string} path - 文件或文件夹路径
 * @returns {string} 父文件夹路径
 */
function getParentPath(path) {
  if (!path) return '';
  const lastSlashIndex = path.lastIndexOf('/');
  return lastSlashIndex > 0 ? path.substring(0, lastSlashIndex) : '';
}

/**
 * 获取仓库中的所有键
 * @param {IDBDatabase} db - 数据库连接
 * @param {string} title - 标题/存储名
 * @returns {Promise<string[]>} 键列表
 */
async function getAllKeys(db, title) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([title], 'readonly');
    const store = transaction.objectStore(title);
    const request = store.getAllKeys();
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onerror = (event) => {
      reject(new Error(`获取所有键失败: ${title}, ${event.target.error}`));
    };
  });
}

/**
 * 读取文件内容
 * @param {string} path - 文件路径，格式为 /data/{title}/path/to/file
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<any>} 文件内容
 * @throws {Error} 如果路径是文件夹或文件不存在
 */
async function readFile(path, forceRefresh = false, retryCount = 0) {
  const { title, key } = parsePath(path);
  if (!key) {
    throw new Error(`无法读取：${path} 是根目录`);
  }
  
  if (isFolder(key)) {
    throw new Error(`${path} 是文件夹，请使用 listDirectory 函数`);
  }
  
  let db = null;
  try {
    db = await ensureStoreExists(title, forceRefresh, retryCount);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([title], 'readonly');
      const store = transaction.objectStore(title);
      const request = store.get(key);
      
      request.onsuccess = (event) => {
        const data = event.target.result;
        if (data === undefined) {
          reject(new Error(`文件不存在: ${path}`));
        } else {
          resolve(data);
        }
      };
      
      request.onerror = async (event) => {
        const error = event.target.error;
        console.error(`读取文件失败: ${path}`, error);
        
        // 检查是否为版本错误，并尝试重试
        if (error.name === 'VersionError' && retryCount < maxRetries) {
          console.log(`读取文件时检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
          db.close();
          db = null;
          
          try {
            const data = await readFile(path, true, retryCount + 1);
            resolve(data);
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          reject(new Error(`读取文件失败: ${path}, ${error}`));
        }
      };
    });
  } catch (error) {
    console.error(`读取文件失败: ${path}`, error);
    throw error;
  } finally {
    if (db) db.close();
  }
}

/**
 * 写入文件内容
 * @param {string} path - 文件路径，格式为 /data/{title}/path/to/file
 * @param {any} data - 文件内容
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<void>}
 * @throws {Error} 如果路径是文件夹
 */
async function writeFile(path, data, forceRefresh = false, retryCount = 0) {
  const { title, key } = parsePath(path);
  if (!key) {
    throw new Error(`无法写入：${path} 是根目录`);
  }
  
  if (isFolder(key)) {
    throw new Error(`${path} 是文件夹，不能写入数据`);
  }
  
  let db = null;
  try {
    db = await ensureStoreExists(title, forceRefresh, retryCount);
    
    // 确保父文件夹存在
    await ensureParentFoldersExist(db, title, key, forceRefresh, retryCount);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([title], 'readwrite');
      const store = transaction.objectStore(title);
      const request = store.put(data, key);
      
      request.onsuccess = () => {
        console.log(`文件写入成功: ${path}`);
        resolve();
      };
      
      request.onerror = async (event) => {
        const error = event.target.error;
        console.error(`文件写入失败: ${path}`, error);
        
        // 检查是否为版本错误，并尝试重试
        if (error.name === 'VersionError' && retryCount < maxRetries) {
          console.log(`写入文件时检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
          db.close();
          db = null;
          
          try {
            await writeFile(path, data, true, retryCount + 1);
            resolve();
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          reject(new Error(`文件写入失败: ${path}, ${error}`));
        }
      };
    });
  } catch (error) {
    console.error(`文件写入失败: ${path}`, error);
    throw error;
  } finally {
    if (db) db.close();
  }
}

/**
 * 确保父文件夹存在
 * @param {IDBDatabase} db - 数据库连接
 * @param {string} title - 标题/存储名
 * @param {string} key - 键名
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<void>}
 */
async function ensureParentFoldersExist(db, title, key, forceRefresh = false, retryCount = 0) {
  const pathParts = key.split('/');
  
  // 如果是根目录下的文件，不需要创建父文件夹
  if (pathParts.length <= 1) return;
  
  let currentPath = '';
  
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (!part) continue;
    
    if (currentPath) {
      currentPath += '/';
    }
    
    currentPath += part;
    const folderKey = `:${currentPath}`;
    
    // 检查文件夹是否已存在
    const folderExists = await checkKeyExists(db, title, folderKey);
    if (!folderExists) {
      // 创建文件夹
      try {
        await new Promise((resolve, reject) => {
          const transaction = db.transaction([title], 'readwrite');
          const store = transaction.objectStore(title);
          const request = store.put({}, folderKey);
          
          request.onsuccess = () => {
            console.log(`创建文件夹成功: ${folderKey}`);
            resolve();
          };
          
          request.onerror = async (event) => {
            const error = event.target.error;
            console.error(`创建文件夹失败: ${folderKey}`, error);
            
            // 检查是否为版本错误，并尝试重试
            if (error.name === 'VersionError' && retryCount < maxRetries) {
              console.log(`创建文件夹时检测到版本错误，将在外部函数中处理重试`);
              reject(error); // 让外部函数处理重试
            } else {
              reject(new Error(`创建文件夹失败: ${folderKey}, ${error}`));
            }
          };
        });
      } catch (error) {
        if (error.name === 'VersionError') {
          throw error; // 传递版本错误给外部函数处理
        }
        console.error(`创建文件夹失败: ${folderKey}`, error);
        throw error;
      }
    }
  }
}

/**
 * 检查键是否存在
 * @param {IDBDatabase} db - 数据库连接
 * @param {string} title - 标题/存储名
 * @param {string} key - 键名
 * @returns {Promise<boolean>} 键是否存在
 */
async function checkKeyExists(db, title, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([title], 'readonly');
    const store = transaction.objectStore(title);
    const request = store.get(key);
    
    request.onsuccess = (event) => {
      resolve(event.target.result !== undefined);
    };
    
    request.onerror = (event) => {
      reject(new Error(`检查键失败: ${key}, ${event.target.error}`));
    };
  });
}

/**
 * 删除文件或文件夹
 * @param {string} path - 文件或文件夹路径，格式为 /data/{title}/path/to/file_or_folder
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<void>}
 * @throws {Error} 如果路径是根目录
 */
async function deletePath(path, forceRefresh = false, retryCount = 0) {
  if (path === '/data') {
    throw new Error('不允许删除数据库根目录');
  }
  const { title, key } = parsePath(path);
  
  let db = null;
  try {
    db = await openDatabase(forceRefresh, retryCount);
    
    // 检查title是否存在
    if (!Array.from(db.objectStoreNames).includes(title)) {
      throw new Error(`标题 ${title} 不存在`);
    }
    
    // 如果key为空，则删除整个标题存储
    if (!key) {
      db.close();
      db = null;
      
      // 删除整个对象存储需要升级数据库版本
      const currentVersion = await getDatabaseVersion(forceRefresh);
      currentDbVersion = currentVersion + 1;
      
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, currentDbVersion);
        
        request.onupgradeneeded = (event) => {
          const upgradeDb = event.target.result;
          if (upgradeDb.objectStoreNames.contains(title)) {
            upgradeDb.deleteObjectStore(title);
            console.log(`删除标题存储 ${title} 成功`);
          }
        };
        
        request.onsuccess = (event) => {
          event.target.result.close();
          resolve();
        };
        
        request.onerror = async (event) => {
          const error = event.target.error;
          console.error(`删除标题存储 ${title} 失败:`, error);
          
          // 检查是否为版本错误，并尝试重试
          if (error.name === 'VersionError' && retryCount < maxRetries) {
            console.log(`删除标题存储时检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
            
            try {
              await deletePath(path, true, retryCount + 1);
              resolve();
            } catch (retryError) {
              reject(retryError);
            }
          } else {
            reject(new Error(`删除标题存储 ${title} 失败: ${error}`));
          }
        };
        
        request.onblocked = (event) => {
          console.warn("删除对象存储被阻塞，可能是因为有其他连接未关闭");
        };
      });
    }
    
    // 获取所有键
    const allKeys = await getAllKeys(db, title);
    
    // 判断是文件还是文件夹
    const isDir = allKeys.includes(':'+key);
    
    if (isDir) {
      // 文件夹的路径（去掉冒号）
      const folderPath = key;
      const folderPathWithSlash = folderPath ? `${folderPath}/` : '';
      // 找到所有以此文件夹路径开头的键（包括子文件夹和文件）
      const keysToDelete = allKeys.filter(k => {
        // 匹配文件夹本身
        if (k === ':'+key) return true;
        
        // 匹配子文件夹和文件（去掉冒号后匹配）
        if (isFolder(k)) {
          const kPath = k.substring(1);
          return kPath.startsWith(folderPathWithSlash);
        } else {
          return k.startsWith(folderPathWithSlash);
        }
      });
      console.log(`将删除以下键: ${keysToDelete.join(', ')}`);
      
      // 删除所有相关键
      for (const k of keysToDelete) {
        await new Promise((resolve, reject) => {
          const transaction = db.transaction([title], 'readwrite');
          const store = transaction.objectStore(title);
          const request = store.delete(k);
          
          request.onsuccess = () => {
            console.log(`删除键成功: ${k}`);
            resolve();
          };
          
          request.onerror = async (event) => {
            const error = event.target.error;
            console.error(`删除键失败: ${k}`, error);
            
            // 检查是否为版本错误，此处我们让外部重试机制处理
            if (error.name === 'VersionError') {
              db.close();
              db = null;
              reject(error); // 将版本错误抛给外部处理
            } else {
              reject(new Error(`删除键失败: ${k}, ${error}`));
            }
          };
        }).catch(async (error) => {
          if (error.name === 'VersionError' && retryCount < maxRetries) {
            console.log(`删除键时检测到版本错误，正在尝试从头开始重试删除操作`);
            db.close();
            db = null;
            // 发生版本错误时，直接从头开始重试整个删除操作
            return await deletePath(path, true, retryCount + 1);
          }
          throw error;
        });
      }
    } else {
      // 删除单个文件
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([title], 'readwrite');
        const store = transaction.objectStore(title);
        const request = store.delete(key);
        
        request.onsuccess = () => {
          console.log(`删除文件成功: ${path}`);
          resolve();
        };
        
        request.onerror = async (event) => {
          const error = event.target.error;
          console.error(`删除文件失败: ${path}`, error);
          
          // 检查是否为版本错误，并尝试重试
          if (error.name === 'VersionError' && retryCount < maxRetries) {
            console.log(`删除文件时检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
            db.close();
            db = null;
            
            try {
              await deletePath(path, true, retryCount + 1);
              resolve();
            } catch (retryError) {
              reject(retryError);
            }
          } else {
            reject(new Error(`删除文件失败: ${path}, ${error}`));
          }
        };
      });
    }
    
    console.log(`删除成功: ${path}`);
  } catch (error) {
    if (error.name === 'VersionError' && retryCount < maxRetries) {
      console.log(`删除过程中检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
      if (db) db.close();
      return await deletePath(path, true, retryCount + 1);
    }
    console.error(`删除失败: ${path}`, error);
    throw error;
  } finally {
    if (db) db.close();
  }
}

/**
 * 重命名文件或文件夹
 * @param {string} oldPath - 旧路径，格式为 /data/{title}/path/to/file_or_folder
 * @param {string} newName - 新名称（不是完整路径，只是名称）
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<void>}
 * @throws {Error} 如果路径是根目录或新名称格式无效
 */
async function renamePath(oldPath, newName, forceRefresh = false, retryCount = 0) {
  if (oldPath === '/data') {
    throw new Error('不允许重命名数据库根目录');
  }
  const { title, key } = parsePath(oldPath);
  
  // 验证新名称
  if (!newName || newName.includes('/')) {
    throw new Error(`新名称无效，不能包含斜杠: ${newName}`);
  }
  
  if (!key) {
    let db = null;
    try {
      db = await openDatabase(forceRefresh, retryCount);
      
      // 检查title是否存在
      if (!Array.from(db.objectStoreNames).includes(title)) {
        throw new Error(`标题 ${title} 不存在`);
      }
      
      // 检查新标题是否已存在
      if (Array.from(db.objectStoreNames).includes(newName)) {
        throw new Error(`标题 ${newName} 已存在`);
      }
      
      // 先获取所有数据
      const allData = await getAllData(title, forceRefresh, retryCount);
      
      // 关闭当前数据库连接
      db.close();
      db = null;
      
      // 重命名对象存储需要创建新的存储并复制数据
      const currentVersion = await getDatabaseVersion(forceRefresh);
      currentDbVersion = currentVersion + 1;
      
      console.log(`开始重命名标题 ${title} 到 ${newName}，数据库版本从 ${currentVersion} 升级到 ${currentDbVersion}`);
      
      // 第1步：创建新存储并删除旧存储 (通过升级过程)
      await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, currentDbVersion);
        
        request.onupgradeneeded = (event) => {
          const upgradeDb = event.target.result;
          
          try {
            // 创建新的对象存储
            if (!upgradeDb.objectStoreNames.contains(newName)) {
              upgradeDb.createObjectStore(newName);
              console.log(`创建新标题存储 ${newName} 成功`);
            }
            
            // 删除旧的对象存储
            if (upgradeDb.objectStoreNames.contains(title)) {
              upgradeDb.deleteObjectStore(title);
              console.log(`删除旧标题存储 ${title} 成功`);
            }
          } catch (error) {
            console.error('在升级过程中创建/删除存储出错:', error);
            reject(error);
          }
        };
        
        request.onsuccess = (event) => {
          event.target.result.close();
          resolve();
        };
        
        request.onerror = async (event) => {
          const error = event.target.error;
          console.error(`升级数据库以重命名标题失败:`, error);
          
          // 检查是否为版本错误，并尝试重试
          if (error.name === 'VersionError' && retryCount < maxRetries) {
            console.log(`重命名标题时检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
            
            try {
              await renamePath(oldPath, newName, true, retryCount + 1);
              resolve();
            } catch (retryError) {
              reject(retryError);
            }
          } else {
            reject(new Error(`升级数据库以重命名标题失败: ${error}`));
          }
        };
        
        request.onblocked = (event) => {
          console.warn("升级数据库被阻塞，可能是因为有其他连接未关闭");
        };
      });
      
      // 第2步：重新打开数据库并复制数据到新存储
      console.log(`开始将数据从 ${title} 复制到 ${newName}，共 ${Object.keys(allData).length} 项`);
      
      // 重新打开数据库
      db = await openDatabase(true); // 强制刷新版本号
      
      // 确保新存储存在
      if (!Array.from(db.objectStoreNames).includes(newName)) {
        throw new Error(`创建新标题存储 ${newName} 失败，存储不存在`);
      }
      
      // 复制所有数据到新存储
      const transaction = db.transaction([newName], 'readwrite');
      const store = transaction.objectStore(newName);
      
      for (const [dataKey, value] of Object.entries(allData)) {
        await new Promise((resolveItem, rejectItem) => {
          const request = store.put(value, dataKey);
          
          request.onsuccess = () => {
            resolveItem();
          };
          
          request.onerror = (event) => {
            console.error(`复制数据项 ${dataKey} 失败:`, event.target.error);
            rejectItem(event.target.error);
          };
        });
      }
      
      console.log(`重命名标题 ${title} 到 ${newName} 成功，已复制 ${Object.keys(allData).length} 项数据`);
      return;
    } catch (error) {
      if (error.name === 'VersionError' && retryCount < maxRetries) {
        console.log(`重命名标题过程中检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
        if (db) db.close();
        return await renamePath(oldPath, newName, true, retryCount + 1);
      }
      console.error(`重命名标题失败: ${title} -> ${newName}`, error);
      throw error;
    } finally {
      if (db) db.close();
    }
  }


  let db = null;
  try {
    db = await ensureStoreExists(title, forceRefresh, retryCount);
    
    // 获取所有键
    const allKeys = await getAllKeys(db, title);
    
    // 检查原始键是否存在
    if (!allKeys.includes(key) && !isFolder(':'+key)) {
      throw new Error(`文件不存在: ${oldPath}`);
    }
    
    // 判断是文件还是文件夹
    const isDir = allKeys.includes(':'+key);
    
    // 构建新路径
    const parentPath = getParentPath(isDir ? key.substring(1) : key);
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;
    const newKey = isDir ? `:${newPath}` : newPath;
    
    if (isDir) {
      // 文件夹的旧路径（去掉冒号）
      const oldFolderPath = key;
      const oldFolderPathWithSlash = oldFolderPath ? `${oldFolderPath}/` : '';
      
      // 新文件夹路径
      const newFolderPath = newPath;
      const newFolderPathWithSlash = newFolderPath ? `${newFolderPath}/` : '';
      
      // 找到所有以此文件夹路径开头的键（包括子文件夹和文件）
      const keysToRename = allKeys.filter(k => {
        // 匹配文件夹本身
        if (k === ':'+key) return true;
        
        // 匹配子文件夹和文件
        if (isFolder(k)) {
          const kPath = k.substring(1);
          return kPath.startsWith(oldFolderPathWithSlash);
        } else {
          return k.startsWith(oldFolderPathWithSlash);
        }
      });
      
      console.log(`将重命名以下键: ${keysToRename.join(', ')}`);
      
      // 重命名所有相关键
      for (const k of keysToRename) {
        try {
          let newK;
          
          if (k ===':'+ key) {
            // 文件夹本身
            newK = newKey;
          } else if (isFolder(k)) {
            // 子文件夹，先去掉冒号，替换前缀，再加回冒号
            const kPath = k.substring(1);
            newK = `:${kPath.replace(oldFolderPathWithSlash, newFolderPathWithSlash)}`;
          } else {
            // 文件
            newK = k.replace(oldFolderPathWithSlash, newFolderPathWithSlash);
          }
          
          console.log(`重命名: ${k} -> ${newK}`);
          
          // 读取内容
          const content = await new Promise((resolve, reject) => {
            const transaction = db.transaction([title], 'readonly');
            const store = transaction.objectStore(title);
            const request = store.get(k);
            
            request.onsuccess = (event) => {
              resolve(event.target.result);
            };
            
            request.onerror = (event) => {
              const error = event.target.error;
              if (error.name === 'VersionError') {
                reject(error); // 让外部处理版本错误和重试
              } else {
                reject(new Error(`读取内容失败: ${k}, ${error}`));
              }
            };
          });
          
          // 写入新位置
          await new Promise((resolve, reject) => {
            const transaction = db.transaction([title], 'readwrite');
            const store = transaction.objectStore(title);
            const request = store.put(content, newK);
            
            request.onsuccess = () => {
              resolve();
            };
            
            request.onerror = (event) => {
              const error = event.target.error;
              if (error.name === 'VersionError') {
                reject(error); // 让外部处理版本错误和重试
              } else {
                reject(new Error(`写入新位置失败: ${newK}, ${error}`));
              }
            };
          });
          
          // 删除旧位置
          await new Promise((resolve, reject) => {
            const transaction = db.transaction([title], 'readwrite');
            const store = transaction.objectStore(title);
            const request = store.delete(k);
            
            request.onsuccess = () => {
              resolve();
            };
            
            request.onerror = (event) => {
              const error = event.target.error;
              if (error.name === 'VersionError') {
                reject(error); // 让外部处理版本错误和重试
              } else {
                reject(new Error(`删除旧位置失败: ${k}, ${error}`));
              }
            };
          });
        } catch (error) {
          if (error.name === 'VersionError') {
            db.close();
            db = null;
            // 检测到版本错误，从头开始重试整个重命名操作
            if (retryCount < maxRetries) {
              console.log(`重命名操作中检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
              return await renamePath(oldPath, newName, true, retryCount + 1);
            }
            throw error;
          }
          throw error;
        }
      }
    } else {
      // 文件重命名
      try {
        // 检查文件是否存在
        const fileExists = await checkKeyExists(db, title, key);
        if (!fileExists) {
          throw new Error(`文件不存在: ${oldPath}`);
        }
        
        // 读取文件内容
        const content = await new Promise((resolve, reject) => {
          const transaction = db.transaction([title], 'readonly');
          const store = transaction.objectStore(title);
          const request = store.get(key);
          
          request.onsuccess = (event) => {
            resolve(event.target.result);
          };
          
          request.onerror = (event) => {
            const error = event.target.error;
            if (error.name === 'VersionError') {
              reject(error); // 让外部处理版本错误和重试
            } else {
              reject(new Error(`读取文件内容失败: ${key}, ${error}`));
            }
          };
        });
        
        // 写入新位置
        await new Promise((resolve, reject) => {
          const transaction = db.transaction([title], 'readwrite');
          const store = transaction.objectStore(title);
          const request = store.put(content, newKey);
          
          request.onsuccess = () => {
            resolve();
          };
          
          request.onerror = (event) => {
            const error = event.target.error;
            if (error.name === 'VersionError') {
              reject(error); // 让外部处理版本错误和重试
            } else {
              reject(new Error(`写入新位置失败: ${newKey}, ${error}`));
            }
          };
        });
        
        // 删除旧位置
        await new Promise((resolve, reject) => {
          const transaction = db.transaction([title], 'readwrite');
          const store = transaction.objectStore(title);
          const request = store.delete(key);
          
          request.onsuccess = () => {
            resolve();
          };
          
          request.onerror = (event) => {
            const error = event.target.error;
            if (error.name === 'VersionError') {
              reject(error); // 让外部处理版本错误和重试
            } else {
              reject(new Error(`删除旧位置失败: ${key}, ${error}`));
            }
          };
        });
      } catch (error) {
        if (error.name === 'VersionError') {
          db.close();
          db = null;
          // 检测到版本错误，从头开始重试整个重命名操作
          if (retryCount < maxRetries) {
            console.log(`重命名文件时检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
            return await renamePath(oldPath, newName, true, retryCount + 1);
          }
          throw error;
        }
        throw error;
      }
    }
    
    console.log(`重命名成功: ${oldPath} -> ${newName}`);
  } catch (error) {
    if (error.name === 'VersionError' && retryCount < maxRetries) {
      console.log(`重命名过程中检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
      if (db) db.close();
      return await renamePath(oldPath, newName, true, retryCount + 1);
    }
    console.error(`重命名失败: ${oldPath} -> ${newName}`, error);
    throw error;
  } finally {
    if (db) db.close();
  }
}

/**
 * 列出目录下的所有文件和文件夹
 * @param {string} path - 目录路径，格式为 /data/{title}/path/to/folder
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<Array<{name: string, isFolder: boolean, path: string}>>} 文件和文件夹信息列表
 */
async function listDirectory(path, forceRefresh = false, retryCount = 0) {
  const { title, key } = parsePath(path);
  
  let db = null;
  try {
    db = await ensureStoreExists(title, forceRefresh, retryCount);
    
    // 获取所有键
    const allKeys = await getAllKeys(db, title);
    
    // 处理目录路径
    const dirPath = key || '';
    const dirPathWithSlash = dirPath ? `${dirPath}/` : '';
    const dirPathWithColon = dirPath ? `:${dirPath}` : '';
    
    // 如果是文件夹，确保它存在（除非是根目录）
    if (dirPath && !allKeys.includes(dirPathWithColon) && !allKeys.some(k => k.startsWith(dirPathWithSlash))) {
      throw new Error(`目录不存在: ${path}`);
    }
    
    // 收集直接子项，避免显示深层嵌套的内容
    const directChildren = new Set();
    const result = [];
    
    // 处理文件
    for (const itemKey of allKeys) {
      // 跳过文件夹标记键
      if (isFolder(itemKey)) continue;
      
      // 检查是否在当前目录下
      if (itemKey.startsWith(dirPathWithSlash)) {
        const relativePath = itemKey.substring(dirPathWithSlash.length);
        const parts = relativePath.split('/');
        
        if (parts.length === 1) {
          // 直接子文件
          result.push({
            name: parts[0],
            isFolder: false,
            path: `/data/${title}/${itemKey}`,
            size: 0  // 初始大小为0，稍后填充
          });
        } else if (parts.length > 1 && parts[0]) {
          // 子文件夹中的文件
          directChildren.add(parts[0]);
        }
      }
    }
    
    // 处理文件夹
    for (const itemKey of allKeys) {
      // 只处理文件夹标记键
      if (!isFolder(itemKey)) continue;
      
      const folderPath = itemKey.substring(1); // 去掉冒号
      
      // 检查是否是当前目录的子文件夹
      if (dirPath === '' && !folderPath.includes('/')) {
        // 根目录的直接子文件夹
        result.push({
          name: folderPath,
          isFolder: true,
          path: `/data/${title}/${folderPath}`,
          size: 0
        });
      } else if (folderPath.startsWith(dirPathWithSlash) && folderPath !== dirPath) {
        const relativePath = folderPath.substring(dirPathWithSlash.length);
        const parts = relativePath.split('/');
        
        if (parts.length === 1) {
          // 直接子文件夹
          result.push({
            name: parts[0],
            isFolder: true,
            path: `/data/${title}/${folderPath}`,
            size: 0
          });
        } else if (parts.length > 1 && parts[0]) {
          // 嵌套子文件夹
          directChildren.add(parts[0]);
        }
      }
    }
    
    // 添加从directChildren集合中检测到的子文件夹（这些可能没有显式的文件夹标记）
    for (const childName of directChildren) {
      // 检查结果中是否已存在此文件夹
      const exists = result.some(item => item.name === childName && item.isFolder);
      
      if (!exists) {
        const childPath = dirPath ? `${dirPath}/${childName}` : childName;
        result.push({
          name: childName,
          isFolder: true,
          path: `/data/${title}/${childPath}`,
          size: 0
        });
      }
    }
    
    // 确保不重复
    const uniqueResults = [];
    const seen = new Set();
    
    for (const item of result) {
      const key = `${item.name}:${item.isFolder}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(item);
      }
    }
    
    return uniqueResults;
  } catch (error) {
    if (error.name === 'VersionError' && retryCount < maxRetries) {
      console.log(`列出目录时检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
      if (db) db.close();
      return await listDirectory(path, true, retryCount + 1);
    }
    console.error(`列出目录失败: ${path}`, error);
    throw error;
  } finally {
    if (db) db.close();
  }
}

/**
 * 获取文件或文件夹的元信息
 * @param {string} path - 文件或文件夹路径，格式为 /data/{title}/path/to/file_or_folder
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<{exists: boolean, isFolder: boolean, size?: number, lastModified?: number}>} 元信息
 */
async function getMetadata(path, forceRefresh = false, retryCount = 0) {
  const { title, key } = parsePath(path);
  
  // 默认元信息
  const metadata = {
    exists: false,
    isFolder: false,
    size: 0,
    lastModified: null
  };
  
  // 处理根目录
  if (!key) {
    return {
      exists: true,
      isFolder: true,
      size: 0,
      lastModified: null
    };
  }
  
  let db = null;
  try {
    db = await openDatabase(forceRefresh, retryCount);
    
    // 检查存储是否存在
    if (!Array.from(db.objectStoreNames).includes(title)) {
      return metadata;
    }
    
    // 判断是否是文件夹键
    const isDir = isFolder(key);
    
    if (isDir) {
      // 检查文件夹是否存在
      const transaction = db.transaction([title], 'readonly');
      const store = transaction.objectStore(title);
      const request = store.get(key);
      
      const exists = await new Promise((resolve, reject) => {
        request.onsuccess = event => {
          resolve(event.target.result !== undefined);
        };
        request.onerror = event => {
          const error = event.target.error;
          if (error.name === 'VersionError') {
            reject(error); // 让外部处理版本错误和重试
          } else {
            resolve(false);
          }
        };
      }).catch(error => {
        if (error.name === 'VersionError') {
          throw error; // 传递版本错误给外层处理
        }
        return false;
      });
      
      if (exists) {
        metadata.exists = true;
        metadata.isFolder = true;
        return metadata;
      }
      
      // 如果没有直接的文件夹键，检查是否有该文件夹下的文件或子文件夹
      const allKeys = await getAllKeys(db, title);
      const folderPath = key.substring(1); // 去掉冒号
      const folderPathWithSlash = folderPath ? `${folderPath}/` : '';
      
      const hasChildren = allKeys.some(k => {
        if (isFolder(k)) {
          return k.substring(1).startsWith(folderPathWithSlash);
        } else {
          return k.startsWith(folderPathWithSlash);
        }
      });
      
      if (hasChildren) {
        metadata.exists = true;
        metadata.isFolder = true;
      }
      
      return metadata;
    } else {
      // 检查文件是否存在
      const transaction = db.transaction([title], 'readonly');
      const store = transaction.objectStore(title);
      const request = store.get(key);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = event => {
          const data = event.target.result;
          if (data !== undefined) {
            metadata.exists = true;
            
            // 计算数据大小
            if (typeof data === 'string') {
              metadata.size = data.length;
            } else if (data instanceof Blob) {
              metadata.size = data.size;
            } else if (data instanceof ArrayBuffer) {
              metadata.size = data.byteLength;
            } else {
              try {
                metadata.size = JSON.stringify(data).length;
              } catch (e) {
                metadata.size = 0;
              }
            }
            
            // 使用当前时间作为模拟的最后修改时间
            metadata.lastModified = Date.now();
          }
          resolve(metadata);
        };
        
        request.onerror = event => {
          const error = event.target.error;
          if (error.name === 'VersionError') {
            reject(error); // 让外部处理版本错误和重试
          } else {
            resolve(metadata);
          }
        };
      }).catch(async error => {
        if (error.name === 'VersionError' && retryCount < maxRetries) {
          console.log(`获取元信息时检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
          db.close();
          db = null;
          return await getMetadata(path, true, retryCount + 1);
        }
        throw error;
      });
    }
  } catch (error) {
    if (error.name === 'VersionError' && retryCount < maxRetries) {
      console.log(`获取元信息过程中检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
      if (db) db.close();
      return await getMetadata(path, true, retryCount + 1);
    }
    console.error(`获取元信息失败: ${path}`, error);
    throw error;
  } finally {
    if (db) db.close();
  }
}

/**
 * 获取所有可用的标题（存储名）
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<string[]>} 标题列表
 */
async function getAllTitles(forceRefresh = false, retryCount = 0) {
  let db = null;
  try {
    db = await openDatabase(forceRefresh, retryCount);
    return Array.from(db.objectStoreNames);
  } catch (error) {
    if (error.name === 'VersionError' && retryCount < maxRetries) {
      console.log(`获取所有标题时检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
      if (db) db.close();
      return await getAllTitles(true, retryCount + 1);
    }
    console.error("获取所有标题失败:", error);
    return [];
  } finally {
    if (db) db.close();
  }
}

/**
 * 创建文件夹
 * @param {string} path - 文件夹路径，格式为 /data/{title}/path/to/folder
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<void>}
 */
async function createFolder(path, forceRefresh = false, retryCount = 0) {
  const { title, key } = parsePath(path);
  
  if (!key) {
    throw new Error(`无法创建根目录: ${path}`);
  }
  
  let db = null;
  try {
    db = await ensureStoreExists(title, forceRefresh, retryCount);
    
    // 构建文件夹键，添加冒号前缀
    const folderKey = `:${key}`;
    
    // 确保父文件夹存在
    await ensureParentFoldersExist(db, title, key, forceRefresh, retryCount);
    
    // 创建文件夹
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([title], 'readwrite');
      const store = transaction.objectStore(title);
      const request = store.put({}, folderKey);
      
      request.onsuccess = () => {
        console.log(`创建文件夹成功: ${folderKey}`);
        resolve();
      };
      
      request.onerror = async (event) => {
        const error = event.target.error;
        console.error(`创建文件夹失败: ${folderKey}`, error);
        
        // 检查是否为版本错误，并尝试重试
        if (error.name === 'VersionError' && retryCount < maxRetries) {
          console.log(`创建文件夹时检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
          db.close();
          db = null;
          
          try {
            await createFolder(path, true, retryCount + 1);
            resolve();
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          reject(new Error(`创建文件夹失败: ${folderKey}, ${error}`));
        }
      };
    });
  } catch (error) {
    if (error.name === 'VersionError' && retryCount < maxRetries) {
      console.log(`创建文件夹过程中检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
      if (db) db.close();
      return await createFolder(path, true, retryCount + 1);
    }
    console.error(`创建文件夹失败: ${path}`, error);
    throw error;
  } finally {
    if (db) db.close();
  }
}

/**
 * 获取某个标题下的所有数据
 * @param {string} title - 标题/存储名
 * @param {boolean} forceRefresh - 是否强制刷新版本号
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<Object>} 包含所有键值对的对象
 */
async function getAllData(title, forceRefresh = false, retryCount = 0) {
  let db = null;
  try {
    db = await openDatabase(forceRefresh, retryCount);
    
    if (!Array.from(db.objectStoreNames).includes(title)) {
      return {};
    }
    
    const allData = {};
    
    // 获取所有键
    try {
      const allKeys = await new Promise((resolve, reject) => {
        const transaction = db.transaction([title], 'readonly');
        const store = transaction.objectStore(title);
        const request = store.getAllKeys();
        
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
        
        request.onerror = (event) => {
          const error = event.target.error;
          if (error.name === 'VersionError') {
            reject(error); // 让外部处理版本错误和重试
          } else {
            reject(new Error(`获取所有键失败: ${title}, ${error}`));
          }
        };
      });
      
      // 获取每个键对应的值
      for (const key of allKeys) {
        const value = await new Promise((resolve, reject) => {
          const transaction = db.transaction([title], 'readonly');
          const store = transaction.objectStore(title);
          const request = store.get(key);
          
          request.onsuccess = (event) => {
            resolve(event.target.result);
          };
          
          request.onerror = (event) => {
            const error = event.target.error;
            if (error.name === 'VersionError') {
              reject(error); // 让外部处理版本错误和重试
            } else {
              reject(new Error(`获取值失败: ${title}/${key}, ${error}`));
            }
          };
        });
        
        allData[key] = value;
      }
    } catch (error) {
      if (error.name === 'VersionError') {
        throw error; // 让外层处理版本错误和重试
      }
      throw error;
    }
    
    return allData;
  } catch (error) {
    if (error.name === 'VersionError' && retryCount < maxRetries) {
      console.log(`获取所有数据时检测到版本错误，正在尝试刷新版本号并重试（${retryCount + 1}/${maxRetries}）`);
      if (db) db.close();
      return await getAllData(title, true, retryCount + 1);
    }
    console.error(`获取所有数据失败: ${title}`, error);
    throw error;
  } finally {
    if (db) db.close();
  }
}

// 导出所有文件系统操作功能
export {
  readFile,
  writeFile,
  deletePath,
  renamePath,
  listDirectory,
  getMetadata,
  getAllTitles,
  createFolder,
  getAllData
};