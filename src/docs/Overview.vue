<template>
  <div class="overview-container">
    <h1>概述</h1>
    <p>欢迎使用我们的文档系统。这里您可以找到所有关于系统功能的详细信息。</p>
    
    <div class="section">
      <h2>文档结构</h2>
      <p>本文档分为几个主要部分：</p>
      <ul>
        <li><strong>概述</strong> - 系统的总体介绍和导航指南。</li>
        <li><strong>LLM配置</strong> - 大语言模型相关的所有配置选项和指南。</li>
        <li><strong>语音合成配置</strong> - 语音合成系统的设置和使用方法。</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>使用指南</h2>
      <p>您可以使用左侧的导航栏浏览不同的文档部分，或使用搜索框查找特定内容。</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Overview'
}
</script>

<style scoped>
.overview-container {
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