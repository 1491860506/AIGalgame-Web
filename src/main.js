// src/main.js
import './assets/main.css'

import { createApp } from 'vue'
import Root from './Root.vue'  // 引入 Root.vue
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css'; // 引入样式
import router from './router'

// --- Font Awesome Start ---
/* 导入核心库 */
import { library } from '@fortawesome/fontawesome-svg-core'

/* 导入 Font Awesome Icon 组件 */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

/* 导入 Solid 图标 */
import {
  // Icons from Root.vue
  faHome, faBrain, faMicrophone, faPaintBrush, faMusic, faCamera,
  faClipboardList, faMagic, faInfoCircle, faSun, faMoon, faDownload, faUpload,
  // Icons from Logs.vue
  faSyncAlt, faTrashAlt, faSearch, faSpinner, faInfo, faExclamationTriangle,
  faExclamationCircle, faDotCircle, faAngleDoubleLeft, faAngleLeft, faAngleRight, faAngleDoubleRight,faChevronDown,faChevronUp,
  // Icons from About.vue
  faBook,faGamepad,faUsers,faImage,faGlobe,faEnvelope,faSync,faCogs,
  // Icons from FileManager.vue (Solid)
  faFile, faFolder, faLevelUpAlt, faFileLines, faFileCode, faFilm, faPen, faEye, faTimes, faCircleXmark, faCircleCheck,faPenToSquare,
  // Icons from OutlineGenerator.vue (Solid) - Added based on identification
  faBookOpen, faFileExport, faThumbtack, faScroll, faPlus, faMinus, faFloppyDisk, faBan,
  // Icons from ManageStory.vue (Solid) - Added based on identification
  faBoxesStacked,
  // Icons from Manage.vue (Solid) - Added based on identification
  faFolderOpen, faChevronRight,
  faFlask,faAnglesDown
} from '@fortawesome/free-solid-svg-icons'

/* 导入 Brands 图标 */
import {
    faGithub, // Icon from About.vue
    faMarkdown // Icon from OutlineGenerator.vue
} from '@fortawesome/free-brands-svg-icons'

/* 将所有需要使用的图标添加到库中 */
library.add(
  // Root.vue Icons
  faHome, faBrain, faMicrophone, faPaintBrush, faMusic, faCamera,
  faClipboardList, faMagic, faInfoCircle, faSun, faMoon, faDownload, faUpload,faAnglesDown,
  // Logs.vue Icons
  faSyncAlt, faTrashAlt, faSearch, faSpinner, faInfo, faExclamationTriangle,
  faExclamationCircle, faDotCircle, faAngleDoubleLeft, faAngleLeft, faAngleRight, faAngleDoubleRight,faChevronDown,faChevronUp,
  // About.vue Icons (Brands included)
  faBook,faGamepad,faUsers,faImage,faGlobe,faEnvelope,faGithub,faSync,faFlask,faCogs, // Brands icon from About.vue
  // FileManager.vue Icons (Solid)
  faFile, faFolder, faLevelUpAlt, faFileLines, faFileCode, faFilm, faPen, faEye, faTimes, faCircleXmark, faCircleCheck,faPenToSquare,
  // OutlineGenerator.vue Icons
  faBookOpen, faFileExport, faThumbtack, faScroll, faPlus, faMinus, faFloppyDisk, faBan, // Solid icons
  faMarkdown, // Brands icon
  // ManageStory.vue Icons (Solid) - Added based on identification
  faBoxesStacked,
  // Manage.vue Icons (Solid) - Added based on identification
  faFolderOpen, faChevronRight
)

// --- Font Awesome End ---


const app = createApp(Root);  // 使用 Root.vue 作为根组件

// --- Font Awesome ---
/* 全局注册 FontAwesomeIcon 组件 */
app.component('font-awesome-icon', FontAwesomeIcon)
// --- Font Awesome ---

const options = {
    timeout: 3000,
};

app.use(Toast, options);
app.use(router)

app.mount('#app');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  } else {
    console.warn('Service workers are not supported in this browser.');
  }

  (function() {
    // Save original console methods
    let originalConsoleLog = console.log;
    let originalConsoleWarn = console.warn;
    let originalConsoleError = console.error;
    let originalConsoleInfo = console.info;
  
    // Database configuration
    const DB_NAME = 'LogsDatabase';
    let DB_VERSION = 1;  // Initial version, may be dynamically adjusted
    const STORE_NAME = 'consoleLogs';
  
    // Initialize the IndexedDB
    let db;
  
    function initializeDB(version = DB_VERSION) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, version);
        
        request.onerror = (event) => {
          originalConsoleError.call(console, "IndexedDB error:", event.target.error);
          
          // Check if it's a version error
          const error = event.target.error;
          if (error.name === 'VersionError') {
            // Try to get the latest version
            const getVersionRequest = indexedDB.open(DB_NAME);
            getVersionRequest.onsuccess = (e) => {
              const latestVersion = e.target.result.version;
              e.target.result.close();
              // Reinitialize with newer version
              DB_VERSION = Math.max(latestVersion + 1, DB_VERSION + 1);
              originalConsoleLog.call(console, `Attempting with new version: ${DB_VERSION}`);
              initializeDB(DB_VERSION).then(resolve).catch(reject);
            };
            getVersionRequest.onerror = () => reject(error);
          } else {
            reject(error);
          }
        };
        
        request.onsuccess = (event) => {
          db = event.target.result;
          resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          // Create object store if it doesn't exist
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('type', 'type', { unique: false });
          }
        };
      });
    }
  
    // Initialize DB immediately
    initializeDB().catch(error => {
      originalConsoleError.call(console, "Failed to initialize IndexedDB:", error);
    });
  
    // Store log to IndexedDB
    function storeLog(type, message, stack = null) {
      const timestamp = new Date().toISOString();
      
      // Create log entry with message and optional stack
      const logEntry = { 
        type, 
        message,
        stack,
        timestamp
      };
      
      if (db) {
        // IndexedDB is ready, store the log
        try {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.add(logEntry);
          
          request.onerror = (e) => {
            originalConsoleError.call(console, "Error storing log in IndexedDB:", e.target.error);
          };
        } catch (e) {
          originalConsoleError.call(console, "Failed to store log to IndexedDB:", e);
        }
      } else {
        // IndexedDB not ready yet, try to initialize it and retry
        initializeDB()
          .then(() => storeLog(type, message, stack))
          .catch(error => {
            originalConsoleError.call(console, "Failed to initialize IndexedDB for log storage:", error);
          });
      }
    }
  
    // Override console.log
    console.log = function(...args) {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      storeLog('log', message);
      originalConsoleLog.apply(console, args);
    };
  
    // Override console.warn
    console.warn = function(...args) {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      storeLog('warn', message);
      originalConsoleWarn.apply(console, args);
    };
  
    // Override console.error with enhanced stack capture
    console.error = function(...args) {
      let message = args[0];
      let stack = null;
  
      // Check if the first argument is an Error object
      if (message instanceof Error) {
        stack = message.stack;
        message = message.message; // Use the error message as the primary message
        // Include other arguments if present
        if (args.length > 1) {
            const additionalArgs = args.slice(1).map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
            message = `${message} ${additionalArgs}`;
        }
      } else {
        // Handle multiple arguments like console.log
        message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        // Attempt to find an Error object in other arguments for stack (optional enhancement)
        const errorArg = args.find(arg => arg instanceof Error);
         if(errorArg) {
             stack = errorArg.stack;
         }
      }
  
      storeLog('error', message, stack); // Pass stack to storeLog
      originalConsoleError.apply(console, args);
    };
  
    // Override console.info
    console.info = function(...args) {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      storeLog('info', message);
      originalConsoleInfo.apply(console, args);
    };
  
    // Helper functions for retrieving logs
    window.getStoredLogs = function() {
      return new Promise((resolve, reject) => {
        if (!db) {
          // If IndexedDB isn't ready, try to initialize it
          initializeDB()
            .then(() => window.getStoredLogs())
            .then(resolve)
            .catch(reject);
          return;
        }
        
        try {
          const transaction = db.transaction([STORE_NAME], 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const index = store.index('timestamp');
          const request = index.openCursor(null, 'prev'); // Get logs in reverse chronological order
          
          const logs = [];
          
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              logs.push(cursor.value);
              cursor.continue();
            } else {
              resolve(logs);
            }
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        } catch (e) {
          reject(e);
        }
      });
    };
  
    // Function to clear logs
    window.clearStoredLogs = function() {
      return new Promise((resolve, reject) => {
        if (!db) {
          // If IndexedDB isn't ready, try to initialize it
          initializeDB()
            .then(() => window.clearStoredLogs())
            .then(resolve)
            .catch(reject);
          return;
        }
        
        try {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.clear();
          
          request.onsuccess = () => {
            resolve();
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        } catch (e) {
          reject(e);
        }
      });
    };
  
    // Function to export logs as JSON
    window.exportLogs = function() {
      return window.getStoredLogs();
    };
  })();