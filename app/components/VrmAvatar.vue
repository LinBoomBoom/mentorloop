<!--
  本地 3D 数字人（three-vrm 加载 VRM 半身像）
  - 纯前端、离线、免密钥；嘴型接现有 RMS 口型引擎（mouthOpen prop），加定时眨眼/待机微动。
  - three / @pixiv/three-vrm 在 onMounted 内动态 import（仅在 3D 模式才加载，不拖累 2D 默认路径）。
  - 加载/WebGL 失败 → 触发 error 事件，外层 DigitalHuman 回退 DiceBear 2D。
  - 必须 ClientOnly 包裹（WebGL 仅客户端可用，避免 SSR 报错）。
-->
<template>
  <div ref="host" class="relative" :style="{ width: `${sizePx}px`, height: `${sizePx}px` }">
    <canvas v-show="ready" ref="canvasEl" class="block w-full h-full" />
    <div v-if="!ready && !failed" class="absolute inset-0 flex items-center justify-center text-xs text-brand-coral/60 animate-pulse">
      3D 数字人加载中…
    </div>
    <div v-if="failed" class="absolute inset-0 flex items-center justify-center text-xs text-muted">
      3D 资源不可用
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRuntimeConfig } from '#imports'

const props = withDefaults(defineProps<{
  /** 嘴部张开程度 0..1（由 RMS 驱动） */
  mouthOpen?: number
  /** 是否正在说话 */
  speaking?: boolean
  /** 画布尺寸 px 或简写 sm/md/lg/xl */
  size?: number | string
  /** VRM 模型 URL（不传则用运行时配置 avatarVrmUrl） */
  vrmUrl?: string
}>(), { mouthOpen: 0, speaking: false, size: 192, vrmUrl: '' })

const emit = defineEmits<{ (e: 'error'): void }>()

const host = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const failed = ref(false)

const sizePx = computed(() => {
  const s = props.size
  if (typeof s === 'number') return s
  const table: Record<string, number> = { sm: 80, md: 128, lg: 192, xl: 240 }
  return table[String(s)] || 192
})

// 嘴型值（prop 驱动，供渲染循环读取）
const mouth = ref(props.mouthOpen)
watch(() => props.mouthOpen, (v) => { mouth.value = v })

// three / vrm 运行时句柄
let renderer: any = null
let scene: any = null
let camera: any = null
let vrm: any = null
let raf = 0
let blinkT = 0

onMounted(async () => {
  try {
    const THREE = await import('three')
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    const { VRMLoaderPlugin, VRMUtils } = await import('@pixiv/three-vrm')
    const url = props.vrmUrl || String(useRuntimeConfig().public.avatarVrmUrl || '/avatars/default.vrm')
    if (!url) throw new Error('未配置 VRM 模型 URL')

    const canvas = canvasEl.value
    if (!canvas) throw new Error('canvas 不存在')
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(sizePx.value, sizePx.value)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20)
    camera.position.set(0, 1.15, 1.9)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.3))
    const dir = new THREE.DirectionalLight(0xffffff, 1.1)
    dir.position.set(1, 2, 2)
    scene.add(dir)

    const loader = new GLTFLoader()
    const gltf: any = await loader.loadAsync(url)
    const loaded: any = gltf.userData?.vrm
    if (!loaded) throw new Error('该文件不是合法 VRM')
    VRMUtils.removeUnnecessaryVertices(gltf.scene)
    VRMUtils.combineSkeletons(gltf.scene)
    vrm = loaded
    vrm.scene.rotation.y = Math.PI // 正面朝向相机
    scene.add(vrm.scene)
    ready.value = true
    loop()
  } catch (e) {
    failed.value = true
    emit('error')
  }
})

function loop() {
  raf = requestAnimationFrame(loop)
  if (vrm && renderer && scene && camera) {
    const m = Math.max(0, Math.min(1, mouth.value))
    // 张嘴映射：aa（啊）/ oh（哦）混合；说话时幅度更大
    vrm.expressionManager?.setValue('aa', m)
    vrm.expressionManager?.setValue('oh', m * 0.5)
    vrm.expressionManager?.setValue('ih', m * 0.2)
    // 眨眼：每 ~3.8s 闭眼约 120ms
    blinkT += 1 / 60
    const blink = blinkT % 3.8 < 0.12 ? 1 : 0
    vrm.expressionManager?.setValue('blink', blink)
    // 说话时头部轻微点头
    if (vrm.scene) vrm.scene.position.y = props.speaking ? Math.sin(blinkT * 2) * 0.01 : 0
    vrm.update(1 / 60)
    renderer.render(scene, camera)
  }
}

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  try { vrm?.dispose?.() } catch {}
  try { renderer?.dispose?.() } catch {}
})
</script>
