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
  faExclamationCircle, faDotCircle, faAngleDoubleLeft, faAngleLeft, faAngleRight, faAngleDoubleRight,
  // Icons from About.vue
  faBook,faGamepad,faUsers,faImage,faGlobe,faEnvelope,faSync,
  // Icons from FileManager.vue (Solid)
  faFile, faFolder, faLevelUpAlt, faFileLines, faFileCode, faFilm, faPen, faEye, faTimes, faCircleXmark, faCircleCheck,faPenToSquare,
  // Icons from OutlineGenerator.vue (Solid) - Added based on identification
  faBookOpen, faFileExport, faThumbtack, faScroll, faPlus, faMinus, faFloppyDisk, faBan,
  // Icons from ManageStory.vue (Solid) - Added based on identification
  faBoxesStacked,
  // Icons from Manage.vue (Solid) - Added based on identification
  faFolderOpen, faChevronRight,
  faFlask
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
  faClipboardList, faMagic, faInfoCircle, faSun, faMoon, faDownload, faUpload,
  // Logs.vue Icons
  faSyncAlt, faTrashAlt, faSearch, faSpinner, faInfo, faExclamationTriangle,
  faExclamationCircle, faDotCircle, faAngleDoubleLeft, faAngleLeft, faAngleRight, faAngleDoubleRight,
  // About.vue Icons (Brands included)
  faBook,faGamepad,faUsers,faImage,faGlobe,faEnvelope,faGithub,faSync,faFlask, // Brands icon from About.vue
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