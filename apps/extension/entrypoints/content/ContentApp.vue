<script setup lang="ts">
import type { Message, Settings, ToolItem } from '@mustard/shared'
import { browser, send } from '@mustard/platform'
import { STORAGE_KEYS, t as translate } from '@mustard/shared'
import { MIcon } from '@mustard/ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTheme } from '../../lib/useTheme'
import { BALL_ICON } from './ball'
import HoverTooltip from './HoverTooltip.vue'
import { extractMainContent } from './pageSummary'
import PageToolbar from './PageToolbar.vue'
import { pageState, setPageSettings, startPageTranslate, stopPageTranslate } from './pageTranslator'
import SelectionLayer from './SelectionLayer.vue'

const TOOL_ICON: Record<string, string> = {
  pageTranslate: 'globe',
  hoverTranslate: 'message',
  selectionTranslate: 'translate',
  pageSummary: 'summary',
  vocab: 'book',
  settings: 'settings',
}

// 网页翻译按标签页独立处理，不在此表（此表只映射全局功能开关）
const FEATURE_BY_TOOL: Record<string, keyof Settings['features']> = {
  hoverTranslate: 'hoverTranslate',
  selectionTranslate: 'selectionTranslate',
}

/** 工具环基础半径；数量变多时按间距自动放大 */
const RADIUS_BASE = 100
/** 相邻工具的目标间距（px），保证图标不重叠 */
const TOOL_GAP = 46
/** 工具环始终张开 180°→90°：只在球的内侧（不越过球心），避免顶到屏幕边缘 */
const ARC_SPAN = 90

const rootEl = ref<HTMLElement>()
const settings = ref<Settings | null>(null)
const open = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | undefined

// ---------- 悬浮球拖拽 ----------
const viewport = ref({ w: window.innerWidth, h: window.innerHeight })
const dragging = ref(false)
const dragX = ref(0)
const dragY = ref(0)
let startX = 0
let startY = 0
let moved = false
let suppressClick = false

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))
const side = computed<'left' | 'right'>(() => (settings.value?.floatingBall?.position === 'left' ? 'left' : 'right'))
const ballY = computed(() => settings.value?.floatingBall?.y ?? 0.94)
const ballBottom = computed(() => Math.round(clamp((1 - ballY.value) * viewport.value.h - 28, 8, viewport.value.h - 64)))
const wrapStyle = computed<Record<string, string>>(() => {
  if (dragging.value)
    return { left: `${dragX.value}px`, top: `${dragY.value}px`, right: 'auto', bottom: 'auto' }
  return { [side.value]: '22px', bottom: `${ballBottom.value}px` }
})

function onResize(): void {
  viewport.value = { w: window.innerWidth, h: window.innerHeight }
}

function onFabDown(event: PointerEvent): void {
  dragging.value = true
  moved = false
  suppressClick = false
  startX = event.clientX
  startY = event.clientY
  dragX.value = event.clientX - 28
  dragY.value = clamp(event.clientY - 28, -20, viewport.value.h - 36)
  open.value = false
  // 用 window 级监听，避免 pointer capture 与鼠标事件合成不一致导致收不到 up
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragUp)
  window.addEventListener('pointercancel', onDragUp)
}

function onDragMove(event: PointerEvent): void {
  if (!moved && Math.hypot(event.clientX - startX, event.clientY - startY) > 6)
    moved = true
  dragX.value = event.clientX - 28
  dragY.value = clamp(event.clientY - 28, -20, viewport.value.h - 36)
}

function onDragUp(event: PointerEvent): void {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragUp)
  window.removeEventListener('pointercancel', onDragUp)
  dragging.value = false
  suppressClick = moved
  const fb = settings.value?.floatingBall
  if (!moved || !fb)
    return
  const nextSide: 'left' | 'right' = event.clientX < viewport.value.w / 2 ? 'left' : 'right'
  const nextY = clamp(event.clientY / viewport.value.h, 0.06, 0.94)
  void send({
    type: 'UPDATE_SETTINGS',
    payload: { floatingBall: { ...fb, position: nextSide, y: nextY } },
  })
}

/** 本标签页（本 frame）是否想开着网页翻译：只存内存，不持久化，不跨标签页 */
const pageWanted = ref(false)

/** 设置本标签页的网页翻译开关：本地立即生效，并让后台广播到本标签页其余 frame */
function setPageTranslate(on: boolean, broadcast = true): void {
  pageWanted.value = on
  if (on)
    startPageTranslate(settings.value)
  else
    stopPageTranslate()
  if (broadcast)
    void send({ type: 'PAGE_TRANSLATE_SET', payload: { on } })
}

onMounted(() => {
  browser.storage.onChanged.addListener(onStorage)
  browser.runtime.onMessage.addListener(onRuntimeMessage)
  window.addEventListener('resize', onResize)
  void (async () => {
    await refresh()
    // 同标签内跳转 / 刷新后，向后台询问本标签页是否仍开着网页翻译并恢复
    try {
      const { on } = await send({ type: 'PAGE_TRANSLATE_GET' })
      if (on)
        setPageTranslate(true, false)
    }
    catch {}
  })()
})
onBeforeUnmount(() => {
  browser.storage.onChanged.removeListener(onStorage)
  browser.runtime.onMessage.removeListener(onRuntimeMessage)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onWindowPointerMove)
  clearTimeout(closeTimer)
})

/** 后台就本标签页的网页翻译下发指令：设置 / 快捷键切换。只影响本标签页各 frame */
function onRuntimeMessage(raw: unknown): void {
  const message = raw as Message
  if (message.type === 'PAGE_TRANSLATE')
    setPageTranslate(message.payload.on, false)
  else if (message.type === 'PAGE_TRANSLATE_TOGGLE')
    setPageTranslate(!pageWanted.value)
}

function onStorage(changes: Record<string, unknown>): void {
  if (changes[STORAGE_KEYS.settings] || changes[STORAGE_KEYS.vocab])
    void refresh()
}

async function refresh(): Promise<void> {
  try {
    settings.value = await send({ type: 'GET_SETTINGS' })
  }
  catch {
    settings.value = null
  }
}

function onAdded(): void {
  void refresh()
}

function tr(key: string): string {
  return translate(settings.value?.uiLang ?? 'zh', key)
}

function toolLabel(tool: ToolItem): string {
  const key = `content.tool.${tool.id}`
  const value = translate(settings.value?.uiLang ?? 'zh', key)
  return value === key ? tool.label : value
}

const ball = computed(() => settings.value?.floatingBall ?? null)
/** 悬浮球只在顶层文档显示：content script 注入所有 frame，否则每个 iframe 都会长出一个球 */
const isTopFrame = window.self === window.top
const showBall = computed(() => isTopFrame && ball.value?.enabled !== false)
const isStack = computed(() => ball.value?.expand === 'stack')
const tools = computed(() =>
  [...(ball.value?.tools ?? [])]
    .filter(tool => tool.visible)
    .sort((a, b) => a.order - b.order),
)

useTheme(() => rootEl.value)

watch(settings, (value) => {
  setPageSettings(value)
  // 之前因未接入 AI 模型没开始翻译：配置好后自动开始（仅当本页仍想开着）
  if (pageWanted.value && !pageState.active)
    startPageTranslate(value)
})

function restorePage(): void {
  setPageTranslate(false)
}

/** 相邻工具的角度间隔（工具数为 1 时不展开） */
const arcStep = computed(() => (tools.value.length > 1 ? ARC_SPAN / (tools.value.length - 1) : 0))
/** 按目标间距放大半径，工具变多也不会挤在一起 */
const arcRadius = computed(() => {
  const step = arcStep.value
  if (!step)
    return RADIUS_BASE
  return Math.max(RADIUS_BASE, Math.round((TOOL_GAP / 2) / Math.sin((step / 2) * Math.PI / 180)))
})
/** 球在上半屏时工具朝下张开，否则朝上——避免超出视口 */
const fanDown = computed(() => (settings.value?.floatingBall?.y ?? 0.94) < 0.5)

function toolStyle(index: number): Record<string, string | number> {
  const t = (index * arcStep.value) * Math.PI / 180
  const mirror = side.value === 'left' ? -1 : 1
  const dy = fanDown.value ? 1 : -1
  return {
    '--x': `${Math.round(-arcRadius.value * Math.cos(t) * mirror)}px`,
    '--y': `${Math.round(dy * arcRadius.value * Math.sin(t))}px`,
    '--i': index,
  }
}

/**
 * 悬浮球展开工具的命中范围：以球心为圆心、半径覆盖整个工具环的圆。
 * 只监听球本身的 pointerleave 是不够的——球到工具之间有空隙，
 * 指针穿过空隙时会立刻 leave，工具还没点到就收起来了。
 * 因此：进入球时缓存球心并挂一个 window 级 pointermove，
 * 只要指针还在这个圆内（含间隙与工具上）就保持展开，出圆才收起。
 */
const hoverRadius = computed(() => arcRadius.value + 45)
let hoverCenter = { x: 0, y: 0 }

function insideHover(x: number, y: number): boolean {
  return Math.hypot(x - hoverCenter.x, y - hoverCenter.y) <= hoverRadius.value
}

function onPointerEnter(): void {
  clearTimeout(closeTimer)
  const rect = rootEl.value?.querySelector('.fab')?.getBoundingClientRect()
  if (rect)
    hoverCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  open.value = true
  window.addEventListener('pointermove', onWindowPointerMove)
}

function onWindowPointerMove(event: PointerEvent): void {
  if (open.value && !insideHover(event.clientX, event.clientY))
    closeMenu()
}

function closeMenu(): void {
  clearTimeout(closeTimer)
  open.value = false
  window.removeEventListener('pointermove', onWindowPointerMove)
}

function onPointerLeave(event: PointerEvent): void {
  // 圆内（含球到工具的间隙）不算离开；出圆才收，留一点宽限避免边界抖动
  if (insideHover(event.clientX, event.clientY))
    return
  clearTimeout(closeTimer)
  closeTimer = setTimeout(closeMenu, 120)
}

function isOn(id: string): boolean {
  // 网页翻译按标签页独立，用本地状态；其余功能仍是全局设置
  if (id === 'pageTranslate')
    return pageWanted.value || pageState.active
  const key = FEATURE_BY_TOOL[id]
  return key ? !!settings.value?.features[key] : false
}

async function onToolClick(tool: ToolItem): Promise<void> {
  if (tool.type === 'toggle') {
    // 网页翻译只针对本标签页：不写全局设置，改为按标签页开关
    if (tool.id === 'pageTranslate') {
      setPageTranslate(!isOn('pageTranslate'))
      return
    }
    const key = FEATURE_BY_TOOL[tool.id]
    if (!key || !settings.value)
      return
    settings.value = await send({
      type: 'UPDATE_SETTINGS',
      payload: { features: { ...settings.value.features, [key]: !settings.value.features[key] } },
    })
    return
  }
  // 网页总结：同步抽取正文，随 OPEN_SIDEBAR 交给后台写入，侧边栏再跑 AI
  // （不 await，保留用户手势，否则 sidePanel.open 会被 Chrome 拒绝）
  if (tool.id === 'pageSummary') {
    void send({ type: 'OPEN_SIDEBAR', payload: { view: 'summary', summary: extractMainContent() } })
    return
  }
  void send({ type: 'OPEN_SIDEBAR', payload: { view: tool.id === 'vocab' ? 'vocab' : 'settings' } })
}

function onBallClick(): void {
  if (suppressClick) {
    suppressClick = false
    return
  }
  void send({ type: 'OPEN_SIDEBAR', payload: { view: 'chat' } })
}
</script>

<template>
  <div ref="rootEl" class="mustard-wrap" :class="[side, { dragging, 'fan-down': fanDown }]" :style="wrapStyle">
    <div v-if="showBall" class="fab-root" :class="{ open, stack: isStack }" @pointerenter="onPointerEnter" @pointerleave="onPointerLeave">
      <div class="tools">
        <button
          v-for="(tool, index) in tools"
          :key="tool.id"
          class="tool"
          :class="{ on: isOn(tool.id) }"
          :style="toolStyle(index)"
          :title="toolLabel(tool)"
          @click.stop="onToolClick(tool)"
        >
          <MIcon :name="TOOL_ICON[tool.id] ?? 'sparkles'" :size="20" />
          <span class="tool-label">{{ toolLabel(tool) }}</span>
        </button>
      </div>
      <button
        class="fab"
        :title="tr('app.name')"
        @click="onBallClick"
        @pointerdown="onFabDown"
      >
        <img class="fab-logo" :src="BALL_ICON" alt="Mustard" draggable="false">
      </button>
    </div>

    <SelectionLayer :settings="settings" @added="onAdded" />
    <HoverTooltip :settings="settings" @added="onAdded" />
    <!-- 进度条只在顶层文档显示：各 frame 各有一条会重复；
         「还原原文」通过 PAGE_TRANSLATE_SET 让后台广播到本标签页所有 frame，统一停止 -->
    <PageToolbar v-if="isTopFrame" :ui-lang="settings?.uiLang ?? 'zh'" @restore="restorePage" />
  </div>
</template>
