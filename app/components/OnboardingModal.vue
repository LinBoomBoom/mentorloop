<template>
  <a-modal
    :open="showOnboarding"
    :closable="false"
    :mask-closable="false"
    :footer="null"
    width="560px"
    centered
  >
    <div class="ob-wrap">
      <div class="ob-logo">MentorLoop</div>
      <h2 class="ob-title">欢迎使用 MentorLoop 桌面端</h2>
      <p class="ob-sub">学面一体 · 智能导师，离线也能稳定学习</p>

      <ul class="ob-list">
        <li>
          <span class="ob-ico">🖥️</span>
          <div>
            <b>离线单机</b>：数据存于本机，账号本地注册，隐私不出本机。
          </div>
        </li>
        <li>
          <span class="ob-ico">🔊</span>
          <div>
            <b>智能语音</b>：AI 讲解答疑走云端语音合成，联网时启用，离线自动降级。
          </div>
        </li>
        <li>
          <span class="ob-ico">📁</span>
          <div class="ob-dir">
            <b>数据位置</b>：<code>{{ dataDir }}</code>
          </div>
        </li>
      </ul>

      <a-button type="primary" size="large" block class="ob-btn" @click="finish">
        开始使用
      </a-button>
      <p class="ob-tip">首次启动后此引导不再出现</p>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useOnboarding } from '~/composables/useOnboarding'

const { showOnboarding, init, finish } = useOnboarding()
const dataDir = ref('本机用户数据目录')

onMounted(async () => {
  await init()
  const bridge = (window as any).mentorLoop
  if (bridge?.getPath) {
    try {
      const p = await bridge.getPath('userData')
      dataDir.value = p ? `${p}/mentorloop-data` : dataDir.value
    } catch {
      /* 取不到路径就显示默认值 */
    }
  }
})
</script>

<style>
.ob-wrap {
  padding: 8px 6px 4px;
  text-align: center;
}
.ob-logo {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, #ff6b9d, #ffb05c);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.ob-title {
  margin: 10px 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #e11d48;
}
.ob-sub {
  margin: 0 0 18px;
  color: #6b7280;
  font-size: 14px;
}
.ob-list {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  text-align: left;
}
.ob-list li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 12px;
  margin-bottom: 10px;
  background: #fafafa;
  border-radius: 10px;
  font-size: 13.5px;
  line-height: 1.5;
  color: #374151;
}
.ob-ico {
  font-size: 18px;
  line-height: 1.4;
}
.ob-dir code {
  display: inline-block;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 1px 6px;
  border-radius: 4px;
}
.ob-btn {
  font-weight: 600;
}
.ob-tip {
  margin: 10px 0 0;
  font-size: 12px;
  color: #9ca3af;
}
</style>
