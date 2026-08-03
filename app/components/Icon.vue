<template>
  <svg
    :width="size" :height="size" viewBox="0 0 24 24" fill="none"
    :stroke="color" :stroke-width="stroke" stroke-linecap="round" stroke-linejoin="round"
    v-html="inner"
  />
</template>

<script setup lang="ts">
const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  color: { type: String, default: 'currentColor' },
  stroke: { type: [Number, String], default: 1.8 }
})

// 描边式 SVG 图标集（Phosphor 风格）
const ICONS: Record<string, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M19 3v16"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 11h6M9 15h4"/>',
  crown: '<path d="M3 7l4 4 5-6 5 6 4-4v11H3z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5M15 12H3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  check: '<path d="M5 12.5 10 17l9-10"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5 11 15l5-6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  alertTriangle: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 14h6M10 14v4M14 14v4M8 21h8"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  google: '<path d="M21 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7.1z"/><path d="M12 21c2.4 0 4.5-.8 6-2.2l-3.1-2.4c-.9.6-2 1-2.9 1a5 5 0 0 1-4.7-3.4H4.1v2.5A9 9 0 0 0 12 21z"/><path d="M7.3 13a5.4 5.4 0 0 1 0-3.4V7.1H4.1a9 9 0 0 0 0 9.8z"/><path d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.5-2.5A9 9 0 0 0 4.1 7.1l3.2 2.5A5 5 0 0 1 12 6.6z"/>',
  wechat: '<path d="M9 3C4.6 3 1 6 1 9.6c0 2 1.1 3.8 2.9 5L3 17l2.6-1.3c.9.2 1.8.4 2.4.4"/><circle cx="6" cy="9" r="1"/><circle cx="11" cy="9" r="1"/><path d="M23 14.4C23 11 19.9 8.3 16.2 8.3c-3.7 0-6.8 2.7-6.8 6.1 0 3.4 3 6.1 6.8 6.1.7 0 1.5-.1 2.2-.3L20.5 21l-.6-2c1.9-1.2 3.1-3.1 3.1-4.6z"/><circle cx="14" cy="14" r="1"/><circle cx="19" cy="14" r="1"/>',
  qq: '<path d="M12 3c3.5 0 6 3 6 7 0 2-.6 4-1.4 5.6.8.5 1.4 1.3 1.4 2.4 0 1.4-1.5 2-3.4 2-.6 0-1.2-.1-1.8-.3-.7.6-2.2 1.3-4.2 1.3-3 0-5.6-1.6-5.6-3.7 0-1 .6-1.8 1.4-2.3C6.6 14 6 12 6 10c0-4 2.5-7 6-7z"/>',
  sparkles: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>',
  flame: '<path d="M12 3c1 3-1 4-2 6-1 1.6-2 3-2 5a6 6 0 0 0 12 0c0-3-2-5-3-7-.8 1.5-1.5 2-2.5 2 .5-2-.5-4-2.5-6z"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16l3-4 3 3 4-6"/>',
  layers: '<path d="M12 3 3 8l9 5 9-5z"/><path d="M3 13l9 5 9-5M3 16l9 5 9-5" opacity=".6"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6L12 17l-5.3 2.6 1.1-6L3.4 9.4l6-.8z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.2 6.3A17 17 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 3.3-.5"/><path d="M9.5 9.6a3 3 0 0 0 4.2 4.2"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v4h-4"/>',
  fire: '<path d="M12 3c1 3-1 4-2 6-1 1.6-2 3-2 5a6 6 0 0 0 12 0c0-3-2-5-3-7"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  graduation: '<path d="M3 9l9-4 9 4-9 4z"/><path d="M7 11v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4"/><path d="M21 9v4"/>',
  shield: '<path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  code: '<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  heart: '<path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20z"/>',
  zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trophy2: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/>',
  spinner: '<path d="M12 3a9 9 0 1 0 9 9" opacity=".9"/>',
  bookOpen: '<path d="M12 5c-2-1.5-5-1.5-7 0v13c2-1.5 5-1.5 7 0M12 5c2-1.5 5-1.5 7 0v13c-2-1.5-5-1.5-7 0"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14h2"/>',
  tree: '<path d="M12 21V11"/><circle cx="12" cy="7" r="4"/><path d="M12 11a3 3 0 0 0-3 3M12 11a3 3 0 0 1 3 3"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  box: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16"/><path d="M9 9v11M15 9v11"/>'
}

const inner = computed(() => ICONS[props.name] || ICONS.box || '')
</script>
