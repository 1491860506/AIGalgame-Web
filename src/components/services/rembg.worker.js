// rembg.worker.js

// 导入 modern-rembg 库。
// 注意：你的构建工具（如 Vite, Webpack）需要正确配置以处理 Worker 内的模块导入。
// 对于 Vite，它通常能自动处理。
import { removeBackground } from 'modern-rembg';

// 监听来自主线程的消息
self.onmessage = async (event) => {
  const { id, imageReadUrl, options, timeout } = event.data;

  try {
    console.log(`[Worker ${id}] Received job for: ${imageReadUrl}`);
    console.log(`[Worker ${id}] Options:`, options);

    // 准备 removeBackground 调用
    const rembgPromise = removeBackground(imageReadUrl, options);

    // 实现超时 (在 Worker 内部也可以加一层，但主要靠主线程控制)
    // 注意：这里的超时只是针对 removeBackground 的异步操作，
    // 如果 removeBackground 本身是同步阻塞的（不太可能），这个超时没用。
    // 主线程的 Promise.race 仍然是必要的。
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[Worker ${id}] Rembg operation internal timeout after ${timeout / 1000}s`)), timeout)
    );

    // 等待背景移除或超时
    const processedBlob = await Promise.race([rembgPromise, timeoutPromise]);

    if (!(processedBlob instanceof Blob)) {
      throw new Error(`[Worker ${id}] modern-rembg did not return a valid Blob.`);
    }

    console.log(`[Worker ${id}] Rembg successful for: ${imageReadUrl}`);
    // 将结果发送回主线程
    // 注意：Blob 可以直接通过 postMessage 传递（使用结构化克隆）
    self.postMessage({ id, status: 'success', blob: processedBlob });

  } catch (error) {
    console.error(`[Worker ${id}] Error processing ${imageReadUrl}:`, error);
    // 发送错误信息回主线程
    // Error 对象本身不能直接克隆，发送关键信息
    self.postMessage({
        id,
        status: 'error',
        error: {
            message: error.message,
            name: error.name,
            // stack: error.stack // 堆栈可能过长，酌情发送
        }
    });
  }
};

// 可以添加一个初始消息，表示 worker 已准备好
self.postMessage({ status: 'ready' });
console.log("[Rembg Worker] Initialized and ready.");