<template>
  <div class="voice-synth-container">
    <h1>语音合成配置</h1>
    <p>本页面包含语音合成系统的所有配置选项和使用说明。</p>
    
    <div class="section">
      <h2>语音引擎</h2>
      <p>选择最适合您需求的语音合成引擎：</p>
      <ul>
        <li><strong>Neural TTS</strong> - 基于神经网络的高质量语音合成。</li>
        <li><strong>Standard TTS</strong> - 稳定且资源占用较低的传统语音合成。</li>
        <li><strong>Custom Voice</strong> - 使用自定义语音模型。</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>语音设置</h2>
      <p>调整以下参数以获得理想的语音输出：</p>
      <ul>
        <li><strong>语音速度</strong> - 控制语音的快慢。</li>
        <li><strong>音高</strong> - 调整语音的音高。</li>
        <li><strong>音量</strong> - 设置语音的音量级别。</li>
        <li><strong>音色选择</strong> - 从多种预设音色中选择。</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>格式输出</h2>
      <p>支持多种音频输出格式：</p>
      <ul>
        <li><strong>WAV</strong> - 无损音频格式，音质最佳。</li>
        <li><strong>MP3</strong> - 压缩音频格式，平衡大小与质量。</li>
        <li><strong>OGG</strong> - 开放格式，适用于网络流媒体。</li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VoiceSynthConfig'
}
</script>

<style scoped>
.voice-synth-container {
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