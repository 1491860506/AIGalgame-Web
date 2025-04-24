const { app, BrowserWindow, screen } = require('electron'); // 引入 screen 模块
const path = require('path');
const express = require('express');
const http = require('http');

// ... (setupDevToolsToggle 和 startServer 函数保持不变) ...
function setupDevToolsToggle(windowInstance) {
  if (!windowInstance || windowInstance.isDestroyed() || !windowInstance.webContents) {
    return; // 安全检查
  }
  windowInstance.webContents.on('before-input-event', (event, input) => {
    // 检查窗口是否仍然有效
    if (windowInstance && !windowInstance.isDestroyed() && windowInstance.webContents) {
       if (input.type === 'keyDown' && input.key === 'F12') {
         windowInstance.webContents.toggleDevTools(); // 使用 toggleDevTools 更简洁
       }
    }
  });
}

const startServer = () => {
  return new Promise((resolve, reject) => {
    const expressApp = express();
    const port = 5436;

    expressApp.use(express.static(path.join(__dirname, 'dist')));

    expressApp.use((req, res, next) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          next(err);
        }
      });
    });

    const server = http.createServer(expressApp);

    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      resolve(`http://localhost:${port}`);
    }).on('error', (err) => {
      console.error('Server failed to start:', err);
      reject(err);
    });
  });
};
// ... (其他函数保持不变) ...

const createWindow = (serverURL) => {
  // --- 创建 BrowserWindow ---
  const mainWindow = new BrowserWindow({
    // --- 设置窗口大小 ---
    width: 1380,
    height: 810,

    // --- 设置窗口居中 ---
    center: true, // 使用此选项自动居中窗口

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, 
      // 允许 window.open (可选，如果需要弹出窗口)
      // nodeIntegrationInSubFrames: true,
      // sandbox: false,
    }
    // 注意：暂时不要在这里设置 frame: false 或 titleBarStyle: 'hidden'
    // 因为我们需要先创建带菜单的窗口，然后移除菜单
  });

  // --- (关键) 移除菜单栏 ---
  mainWindow.setMenu(null);

  // --- (推荐) 控制 window.open 行为 ---
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log(`Intercepting window.open for URL: ${url}`);
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 1380, // 可以为新窗口设置默认大小
        height: 810,
        center: true, // 新窗口也居中
        // 确保新窗口也有正确的 webPreferences
        webPreferences: {
         nodeIntegration: true,
         contextIsolation: false,
         webSecurity: false,
         // ... 其他必要的 prefs
        },
        // 如果希望新窗口也没有菜单栏:
        // parent: mainWindow, // 可选，将新窗口作为主窗口的子窗口
        // autoHideMenuBar: true, // 或者隐藏菜单栏
      }
    };
  });
  // --- 确保新窗口创建时 DevTools 和 F12 监听器会被添加 (通过下面的全局监听器)

  mainWindow.loadURL(serverURL);

  // DevTools 和 F12 监听器由下面的全局监听器处理
  // mainWindow.webContents.openDevTools();
  // setupDevToolsToggle(mainWindow);

  mainWindow.on('closed', () => {
      // 如果 mainWindow 是全局变量且需要清空引用
      // mainWindow = null;
  });

  return mainWindow; // 返回创建的窗口实例
};

// -------- 主应用逻辑 --------
app.whenReady().then(async () => {
  // 监听所有新窗口的创建
  app.on('browser-window-created', (event, window) => {
    console.log(`New window created (ID: ${window.id})`);
    //window.webContents.openDevTools();
    setupDevToolsToggle(window);
    // 如果希望所有新窗口（包括弹出的）都没有菜单栏
    window.setMenu(null); // 对所有新创建的窗口也移除菜单
  });

  try {
    const serverURL = await startServer();
    createWindow(serverURL); // 创建主窗口
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        console.log('Recreating window on activate');
        const serverURL = await startServer();
        createWindow(serverURL);
      } catch (error) {
        console.error('Failed to reactivate application window:', error);
        app.quit();
      }
    }
  });

}).catch((error) => {
  console.error('Error during app ready:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});