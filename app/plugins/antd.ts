import Antd from 'ant-design-vue'

// 全局注册 antd-vue 组件（a-button / a-card / a-pagination / a-calendar 等）。
// 基础样式已在 app/assets/css/main.css 顶部通过 @import 引入。
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Antd)
})
