import fs from 'node:fs';

const FILE = 'data/seed-content.json';
const seed = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// 27 节缺失源 URL 的章节（fe-c16/c17/c18），逐节匹配真实官方源。
// 说明：本批次内容已存在，仅补真实可回溯源 URL，不臆造抓取/HTTP 状态。
const SRC = {
  // ===== fe-c16 Node 运行时 =====
  'fe-c16-s1': [
    ['Node.js 事件循环官方指南（timers / nextTick 阶段）', 'https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick'],
    ['Node.js 官方 API：process.nextTick 与事件循环', 'https://nodejs.org/api/process.html#processprocessnexttickcallback-args'],
  ],
  'fe-c16-s2': [
    ['Node.js CommonJS 模块官方参考', 'https://nodejs.org/api/modules.html'],
    ['Node.js ES Modules 官方参考', 'https://nodejs.org/api/esm.html'],
  ],
  'fe-c16-s3': [
    ['Node.js Stream 官方文档（Readable/Writable/Transform 与背压）', 'https://nodejs.org/api/stream.html'],
  ],
  'fe-c16-s4': [
    ['Node.js fs 模块官方参考', 'https://nodejs.org/api/fs.html'],
    ['Node.js fs/promises API（Promise 形态）', 'https://nodejs.org/api/fs.html#fs-promises-api'],
  ],
  'fe-c16-s5': [
    ['Node.js http 模块官方参考（createServer / IncomingMessage）', 'https://nodejs.org/api/http.html'],
    ['Node.js url 模块官方参考（解析请求 URL）', 'https://nodejs.org/api/url.html'],
  ],
  'fe-c16-s6': [
    ['Node.js cluster 模块（多进程共享端口）', 'https://nodejs.org/api/cluster.html'],
    ['Node.js child_process 模块（spawn/exec/fork）', 'https://nodejs.org/api/child_process.html'],
    ['Node.js worker_threads 模块（同进程多线程）', 'https://nodejs.org/api/worker_threads.html'],
  ],
  'fe-c16-s7': [
    ['Node.js 错误处理官方参考（uncaughtException / unhandledRejection）', 'https://nodejs.org/api/errors.html'],
    ['Node.js process 事件兜底文档', 'https://nodejs.org/api/process.html#process_event_uncaughtexception'],
    ['Node.js AsyncLocalStorage（请求级上下文 / traceId）', 'https://nodejs.org/api/async_context.html'],
  ],
  'fe-c16-s8': [
    ['Nuxt 渲染模式官方文档（SSR / CSR / SSG / 流式）', 'https://nuxt.com/docs/guide/concepts/rendering'],
    ['React renderToPipeableStream（流式 SSR）官方参考', 'https://react.dev/reference/react-dom/server/renderToPipeableStream'],
    ['Node.js 官方学习指南（服务端 / BFF 用法）', 'https://nodejs.org/en/learn'],
  ],
  'fe-c16-s9': [
    ['npm 官方文档（package.json / lockfile / npm ci）', 'https://docs.npmjs.com/'],
    ['语义化版本 SemVer 官方规范', 'https://semver.org/'],
    ['Node.js packages 配置官方参考', 'https://nodejs.org/api/packages.html'],
  ],
  // ===== fe-c17 设计模式 =====
  'fe-c17-s1': [
    ['patterns.dev（现代前端设计模式权威合集）', 'https://www.patterns.dev/'],
    ['Addy Osmani《JavaScript Design Patterns》', 'https://www.patterns.dev/posts'],
  ],
  'fe-c17-s2': [
    ['MDN EventTarget.addEventListener（原生观察者）', 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener'],
    ['Node.js events / EventEmitter 模块', 'https://nodejs.org/api/events.html'],
  ],
  'fe-c17-s3': [
    ['MDN 闭包（Closures，模块模式基础）', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures'],
    ['MDN JavaScript Modules 指南（ESM 替代 IIFE 模块）', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules'],
  ],
  'fe-c17-s4': [
    ['React 组合与复用（children / 组合模式）', 'https://react.dev/learn/passing-props-to-a-component'],
    ['Vue 插槽 slots 官方文档（布局组合）', 'https://vuejs.org/guide/components/slots.html'],
  ],
  'fe-c17-s5': [
    ['Vue provide / inject（依赖注入，替代服务定位）', 'https://vuejs.org/guide/components/provide-inject'],
    ['Angular 依赖注入官方指南', 'https://angular.dev/guide/di'],
  ],
  'fe-c17-s6': [
    ['Flux 官方概览（单向数据流）', 'https://facebook.github.io/flux/docs/in-depth-overview'],
    ['Redux 官方文档（纯函数 reducer）', 'https://redux.js.org/'],
    ['Pinia 官方文档（Vue 官方推荐状态库）', 'https://pinia.vuejs.org/'],
  ],
  'fe-c17-s7': [
    ['Martin Fowler《Micro-Frontends》权威论述', 'https://martinfowler.com/articles/micro-frontends.html'],
    ['micro-frontends.org（微前端概念站）', 'https://micro-frontends.org/'],
  ],
  'fe-c17-s8': [
    ['Webpack Module Federation 插件官方文档', 'https://webpack.js.org/plugins/module-federation-plugin/'],
    ['Module Federation 官方站点（跨构建工具增强）', 'https://module-federation.io/'],
  ],
  'fe-c17-s9': [
    ['pnpm Workspace 官方文档', 'https://pnpm.io/workspaces'],
    ['Turborepo 官方文档（增量构建 / 远程缓存）', 'https://turbo.build/repo/docs'],
    ['Nx Monorepo 官方文档', 'https://nx.dev/'],
  ],
  // ===== fe-c18 动效 =====
  'fe-c18-s1': [
    ['MDN CSS transition 属性', 'https://developer.mozilla.org/en-US/docs/Web/CSS/transition'],
  ],
  'fe-c18-s2': [
    ['MDN CSS animation 属性', 'https://developer.mozilla.org/en-US/docs/Web/CSS/animation'],
    ['MDN @keyframes 规则', 'https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes'],
  ],
  'fe-c18-s3': [
    ['MDN 渲染性能指南（布局 / 绘制 / 合成）', 'https://developer.mozilla.org/en-US/docs/Web/Performance'],
    ['web.dev 动画性能指南（合成层 / 60fps）', 'https://web.dev/articles/animations-guide'],
  ],
  'fe-c18-s4': [
    ['MDN Web Animations API（element.animate）', 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API'],
  ],
  'fe-c18-s5': [
    ['MDN CSS easing-function（缓动函数）', 'https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function'],
    ['MDN cubic-bezier 与 CSS 缓动函数', 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_easing_functions'],
  ],
  'fe-c18-s6': [
    ['MDN Intersection Observer API（视口触发）', 'https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API'],
    ['MDN CSS scroll-driven animations（滚动驱动动画）', 'https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations'],
  ],
  'fe-c18-s7': [
    ['MDN Pointer Events（指针 / 手势统一事件）', 'https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events'],
  ],
  'fe-c18-s8': [
    ['MDN prefers-reduced-motion 媒体查询（动效无障碍）', 'https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion'],
    ['W3C WCAG 2.3.3 动画无障碍（理解）', 'https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html'],
  ],
  'fe-c18-s9': [
    ['Material Design 3 Motion 原则', 'https://m3.material.io/styles/motion/understanding-motion'],
    ['Apple HIG Motion 人机界面指南', 'https://developer.apple.com/design/human-interface-guidelines/motion'],
  ],
};

let ok = 0, skip = 0, missing = [];
for (const mod of seed.modules) {
  if (mod.id !== 'frontend') continue;
  for (const ch of mod.chapters) {
    for (const s of ch.sections) {
      const list = SRC[s.id];
      if (!list) continue;
      if (/来源=官方\(可溯源\)/.test(s.content) && /来源（可溯源锚点）/.test(s.content)) {
        skip++; continue; // 已处理，幂等保护
      }
      // 1) meta 头：来源=官方 -> 来源=官方(可溯源)
      s.content = s.content.replace(/(\| 来源=官方)(\n)/, '$1(可溯源)$2');
      // 2) 末尾追加 可溯源锚点 块
      const anchor = '\n\n> 来源（可溯源锚点）：\n' +
        list.map(([d, u]) => `> - ${d}：${u}（官方源，可点击回溯）`).join('\n');
      s.content = s.content + anchor;
      ok++;
    }
  }
}

// 校验：所有 27 条都在 map 中
const allIds = new Set();
for (const mod of seed.modules) if (mod.id === 'frontend') for (const ch of mod.chapters) for (const s of ch.sections) allIds.add(s.id);
for (const id of Object.keys(SRC)) if (!allIds.has(id)) missing.push(id);

fs.writeFileSync(FILE, JSON.stringify(seed, null, 2));
console.log(`injected=${ok}  skipped(已存在)=${skip}  map定义=${Object.keys(SRC).length}  seed中找不到的id=${missing.length ? missing.join(',') : '无'}`);
