<template>
  <div class="llm-config-container">
    <h1>LLM配置</h1>
    <p>本页面包含大语言模型(LLM)的所有配置选项和使用说明。</p>
    
    <div class="section">
      <h2>模型选择</h2>
      <p>我们支持多种LLM模型，您可以根据需要选择最适合您应用场景的模型：</p>
      <ul>
        <li><strong>GPT-4</strong> - 最新的大语言模型，具有最强的理解和生成能力。</li>
        <li><strong>GPT-3.5</strong> - 平衡性能与效率的选择。</li>
        <li><strong>自定义模型</strong> - 支持导入和使用自定义训练的模型。</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>参数设置</h2>
      <p>调整以下参数可以控制模型的输出：</p>
      <ul>
        <li><strong>温度(Temperature)</strong> - 控制输出的随机性，值越高输出越多样化。</li>
        <li><strong>最大长度(Max Length)</strong> - 限制生成文本的最大长度。</li>
        <li><strong>Top-P</strong> - 控制词汇选择的多样性。</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>API设置</h2>
      <p>配置API密钥和访问设置以使用云端LLM服务。</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LLMConfig'
}
</script>

<style scoped>
.llm-config-container {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.section {
  margin-bottom: 30px;
}

ul {
  padding-left: 20px;
}

li {
  margin-bottom: 8px;
}
</style>