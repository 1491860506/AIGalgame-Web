// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import LLMConfig from '../components/LLMConfig.vue';
import VoiceConfig from '../components/VoiceConfig.vue';
import AiDrawingConfig from '../components/AiDrawingConfig.vue';
import AiMusicConfig from '../components/AiMusicConfig.vue';
import Snapshot from '../components/Snapshot.vue';
import Logs from '../components/Logs.vue';
import Manage from '../components/Manage.vue';
import About from '../components/About.vue';
import Start from '../Start.vue';  // 引入 Start.vue
import App from '../App.vue'; //引入App.vue 作为 layout
import Continue from '../Continue.vue'; //引入App.vue 作为 layout

const routes = [
  {
    path: '/',  // 将App.vue作为layout，所有标签页的路由都作为它的子路由
    component: App, //App 组件作为 layout
    children: [
        { path: '/', name: 'Home', component: Home },
        { path: '/llm-config', name: 'LLMConfig', component: LLMConfig },
        { path: '/voice-config', name: 'VoiceConfig', component: VoiceConfig },
        { path: '/ai-drawing-config', name: 'AiDrawingConfig', component: AiDrawingConfig },
        { path: '/ai-music-config', name: 'AiMusicConfig', component: AiMusicConfig },
        { path: '/snapshot', name: 'Snapshot', component: Snapshot },
        { path: '/logs', name: 'Logs', component: Logs },
        { path: '/manage', name: 'Manage', component: Manage },
        { path: '/about', name: 'About', component: About },
    ]
  },
  { path: '/start', name: 'Start', component: Start },  // /start 路径映射到 Start.vue
  { path: '/continue', name: 'Continue', component: Continue },  // /start 路径映射到 Start.vue


];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;