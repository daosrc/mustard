# Mustard · 划词翻译 Chrome 插件 — 开发设计文档

> 版本 v1.0 · 状态：待评审
> 配套可交互原型：`prototype/index.html`（浏览器直接打开即可体验全部界面）

---

## 1. 产品概述

一款以「阅读即学词」为核心的 Chrome 浏览器扩展。核心能力：

| # | 能力 | 说明 |
|---|------|------|
| 1 | 划词翻译 | 选中单词/句子，选区上方浮出图标，点击弹出翻译气泡 |
| 2 | 悬浮翻译 | 鼠标悬停在外语文本上，延迟后浮出译文 tooltip |
| 3 | 网页翻译 | 整页双语对照翻译 |
| 4 | 侧边栏对话 | AI 聊天助手，支持模型切换、附件上传、截图提问 |
| 5 | 生词本 | 所有翻译过的词自动入库，可导入/导出/管理 |
| 6 | 悬浮球 | 页面右下角入口，hover 展开自定义工具，点击打开侧边栏 |

**目标语言**：默认简体中文，可切换主流语种。
**默认模型服务**：OpenCode Zen（OpenAI 兼容接口），可自定义添加任意兼容提供商。

---

## 2. 技术选型（推荐）

| 层 | 方案 | 理由 |
|----|------|------|
| 扩展框架 | **WXT** | MV3 开发体验最佳，自动生成 manifest、HMR、多入口 |
| UI 框架 | **Vue 3 + `<script setup>` + TypeScript** | 与团队现有技术栈一致 |
| 状态 | **Pinia** | 多视图共享 settings / 会话 / 生词本 |
| 样式 | **UnoCSS**（presetWind3）+ CSS 变量做主题 | 原子化 + 主题 token |
| 工具 | **VueUse**（useHover / useStorage / useDebounceFn） | 悬浮、防抖、持久化开箱即用 |
| 打包 | Vite（WXT 内置） | — |
| 存储 | `chrome.storage.local` + **IndexedDB(idb)** | 配置/生词本用 storage；会话历史、附件二进制用 IndexedDB |
| 通信 | 自封装 `messaging.ts`（基于 `chrome.runtime.sendMessage`） | 类型安全 |

> 备选：若不用 WXT，可用 `Vite + @crxjs/vite-plugin`，目录结构基本一致。

---

## 3. 运行架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        Chrome (MV3)                               │
│                                                                   │
│  ┌───────────── Content Script（每个 tab 注入） ─────────────┐    │
│  │  FloatingBall   ToolMenu   SelectionIcon  TranslatePopover │    │
│  │  HoverTooltip   PageTranslator   (Shadow DOM 隔离)         │    │
│  └───────────────┬───────────────────────────────────────────┘    │
│                  │ chrome.runtime.sendMessage (typed)              │
│  ┌───────────────▼───────────────────────────────────────────┐    │
│  │              Background Service Worker                     │    │
│  │  MessageRouter · TranslationService · ProviderRegistry     │    │
│  │  StorageService · VocabService · ScreenshotService         │    │
│  │  ContextMenus · Commands · (网络请求统一出口，规避 CORS)    │    │
│  └───────┬───────────────────────┬───────────────────────────┘    │
│          │                       │                                │
│  ┌───────▼────────┐     ┌────────▼────────┐     ┌──────────────┐  │
│  │  Side Panel    │     │  Options Page   │     │ chrome.storage│  │
│  │ (聊天/设置/生词本)│    │ (完整设置)       │     │ + IndexedDB  │  │
│  └────────────────┘     └─────────────────┘     └──────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**设计要点**
- **网络请求全部走 background**：content script 受页面 CSP 与 CORS 限制，统一由 SW 发请求，API Key 不进入页面上下文。
- **Content UI 全部挂载在 Shadow DOM**：避免被宿主页面样式污染，也避免污染页面。
- **Side Panel 用 Chrome 原生 `chrome.sidePanel` API**：除非用户截图里是自绘抽屉，否则优先原生（可常驻、可跨标签跟随）。
- **模型调用统一封装 OpenAI 兼容协议**：`POST {baseUrl}/chat/completions`，便于接入 OpenCode Zen / OpenAI / DeepSeek / 自建网关。

---

## 4. 信息架构 / 界面总览

```
Mustard
├── ① 悬浮球 Floating Ball（页面右下角）
│   ├── hover → 工具展开环 ToolMenu（可在控制面板自定义）
│   ├── click → 打开侧边栏
│   └── 工具默认项：网页翻译 / 划词翻译 / 悬浮翻译 / 生词本 / 设置
│
├── ② 侧边栏 Side Panel
│   ├── Chat 聊天视图
│   │   ├── Header：Logo · 模型选择器 · 新建会话＋ · 历史会话 · 生词本 · 设置 · 关闭
│   │   ├── MessageList：多角色气泡 / 流式输出 / 引用翻译卡片
│   │   └── Composer：多行输入 · 附件上传 · 目标语言选择 · 截图粘贴 · 发送
│   ├── History 历史会话视图
│   ├── Settings 设置视图
│   └── Vocab 生词本视图
│
├── ③ 划词 Selection
│   ├── 选区上方图标 SelectionIcon
│   └── 翻译气泡 TranslatePopover
│
├── ④ 悬浮翻译 Hover Tooltip
│
└── ⑤ 整页翻译 Page Translator（双语对照条 + 悬浮工具）
```

---

## 5. 界面详细设计

> 视觉语言（芥末绿 · 对应参考图）：薄荷绿背景 `#CFEFDA→#A9DEBC` + 奶油纸面 `#F3FAEC` + 墨绿正文 `#25331C` + **芥末绿主色 `#7ABE3E`** / 浅绿 `#E8F6D9` / 深绿 `#274D18`，并以**腮红粉 `#F3A3B8`** 作点缀；圆角 12–16px；轻阴影；支持深色模式。完整效果见原型。
>
> **图标一致性**：同一功能在各入口使用同一图标——「生词本」在悬浮球工具、设置·工具列表、侧边栏顶部统一使用 book 图标；「网页翻译/划词翻译/悬浮翻译」同样统一。

### 5.1 悬浮球 Floating Ball

- 尺寸：收起态 `48×48` 圆形；位于 `right: 20px; bottom: 20px`；可拖拽记忆位置。
- 层级：`z-index: 2147483646`（Shadow DOM 内）。
- 交互：
  - **hover**：球轻微放大，工具环以扇形/径向展开（见下）。
  - **mouseleave 宽限期 380ms** 后自动收起：指针从球移向工具时即使经过空隙也不会闪退（`pointerenter` 取消关闭定时器，`pointerleave` 才启动）。
  - **click**：打开/聚焦侧边栏（`chrome.sidePanel.open`）。
  - **拖拽**：拖动超过 5px 视为拖拽，不触发 click。
- 状态徽标：当「划词翻译」关闭时球体显示一个斜杠小角标；生词本有新增时显示红点。

**ToolMenu 布局**（默认径向展开，可配置为纵向栈；半径约 134px，工具直径 46px，夹角 22.5°，保证互不叠压）：

```
                 ┌──────────┐
                 │ 网页翻译  │  ← 开关型：点击切换 on/off，高亮表示已开
                 └────┬─────┘
        ┌──────────┐ │ ┌──────────┐
        │ 悬浮翻译  │─┼─│ 划词翻译  │
        └──────────┘ │ └──────────┘
                 ┌───┴────┐
                 │ 生词本  │
                 └────────┘
              ┌──────┐
              │ (球) │
              └──────┘
```

- 工具项 = `{ id, label, icon, type: 'toggle' | 'action', enabled }`，存在 `settings.floatingBall.tools[]`，用户在设置页可增删/排序。
- 开关型工具（网页翻译/划词翻译/悬浮翻译）复用全局 feature flag；action 型（生词本/设置）打开侧边栏并切到对应视图。

### 5.2 侧边栏 Side Panel

参照红框布局：**顶部工具栏 + 中部对话区 + 底部输入区**。

```
┌──────────────────────────────────────────────┐
│ ◈ Mustard           ＋  ⏱  ☆  ⚙  ✕        │  Header（标题只留 Mustard）
├──────────────────────────────────────────────┤
│                                              │
│   ┌────────────────────────────┐             │
│   │ 用户消息                    │             │  MessageList
│   └────────────────────────────┘             │
│   ◈  助手消息（流式打字）                       │
│   ┌────────────────────────────┐             │
│   │ 📄 翻译卡片 / 图片缩略 / 引用  │             │
│   └────────────────────────────┘             │
│                                              │
├──────────────────────────────────────────────┤
│ [附件缩略 x] [截图缩略 x]                       │  Attachment strip
│ ┌──────────────────────────────────────────┐ │
│ │ 输入消息，Enter 发送 / Shift+Enter 换行    │ │  Composer
│ │  📎  [中▾]  [ 模型 ▾ ]                  ➤   │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Header 元素**
| 元素 | 行为 |
|------|------|
| `＋` | 新建会话：保存当前会话到历史，聊天区恢复为初始（仅欢迎语）状态 |
| `历史` | 打开历史会话列表，点击任一条即可载入该会话的完整对话 |
| `☆` | 进入生词本视图 |
| `⚙` | 进入设置视图 |
| `✕` | 关闭侧边栏 |

**Composer 元素**
| 元素 | 行为 |
|------|------|
| 文本域 | 自增高，最多 6 行；`Enter` 发送，`Shift+Enter` 换行 |
| 📎 附件上传 | **仅支持** 图片 / PDF / TXT / Word(.doc/.docx) / Markdown；图片转 base64，文档抽取文本后注入上下文 |
| 目标语言 · 中 | 输入框左侧的**语种简写按钮**，点击弹出语种列表，选中后以简写回显（中 / 繁 / EN / 日 / 한 / FR / DE / ES / RU） |
| 截图贴入 | **无独立截图按钮**：直接 `⌘V` / `Ctrl+V` 把截图粘贴到输入框即生成图片附件（多张自动编号） |
| `模型 ▾` | 下拉按**提供商分组**列出模型；每项标注支持的输入类型（文本/图片/附件）。选中后据此**门控附件入口**：不支持图片/附件的模型禁用 📎 与截图粘贴并给出提示 |
| ➤ 发送 | 无输入且无附件时禁用；发送后转 loading |

> 附件入口可用性由**当前所选模型声明的输入类型**决定：仅当 `inputs.image || inputs.file` 为真时才允许上传附件与粘贴截图，否则 📎 置灰并提示切换模型。

**消息气泡类型**：`text` / `translation-card`（词条、音标、释义、例句、加入生词本）/ `image` / `error`。

### 5.3 划词翻译 Selection

**触发链**：
```
mousedown → mouseup → 校验选区（非输入框、非空、长度≤阈值）
        → 计算 range.getBoundingClientRect()
        → 在选区上方 8px 居中渲染 SelectionIcon（24px 圆）
```

**SelectionIcon**：小放大镜/译字图标，`z-index` 最高；`mousedown` 阻止默认以保留选区。

**点击图标 → TranslatePopover**：

```
        ┌──────────────────────────────┐
        │ serendipity        🔊  ⧉  ✕   │
        │ /ˌserənˈdipədē/   n.          │
        │ ───────────────────────────  │
        │ 意外发现美好事物的能力/运气      │
        │ ───────────────────────────  │
        │ 例：a serendipitous discovery │
        │ ───────────────────────────  │
        │ [加入生词本 ✓]   [复制]         │
        └──────────────────────────────┘
```

- 短文/整句：显示段落对照翻译，不显示音标词性。
- 加载态：骨架屏；错误态：重试按钮。
- 关闭：`✕` / `Esc` / 点击空白 / 滚动。
- 自动入生词本：默认开启，仅对**单词**且目标语言≠源语言时入库（可在设置关闭）。

### 5.4 悬浮翻译 Hover Tooltip

- 触发：`mousemove` 命中文本节点，停留 `settings.hover.delay`（默认 450ms）后触发。
- 取词：以光标所在词为锚，向上/下取整句（可配置「仅单词 / 整句」）。
- 展示：贴光标下方 12px 的轻量 tooltip，仅显示译文 + 「加入生词本」小按钮。
- 关闭：移出文本 / 移动超过阈值 / 滚动。
- 性能：`requestIdleCallback` + 防抖 + LRU 翻译缓存（`key = hash(text+srcLang+tgtLang)`）。

### 5.5 网页翻译 Page Translator

- 入口：悬浮球工具开关 / 设置页开关 / 快捷键（`Alt+T` 默认）。
- 策略：扫描块级文本元素（跳过 `script/style/code/pre` 与已翻译节点），按段落批量请求；**在原 DOM 元素之后追加译文节点**（双语对照），不删除、不修改原文。
- 加载态：追加的译文节点**先渲染骨架屏 loading**（shimmer 占位），每段结果到达后**原位替换**为译文；元素级异步、允许乱序返回。
- 顶部浮条：显示「翻译中 / 完成 + 进度 n/N」，提供「还原原文」——移除全部追加节点并还原原文。
- 动态内容：`MutationObserver` 监听新增节点，增量翻译。
- 状态持久化到该 tab 的 session，刷新可恢复（可选）。

### 5.6 设置 Settings

设置以**侧边栏内视图**为主（轻量），同时提供独立 **Options 页**（大屏管理）。分组：

**A. 模型提供商**
| 字段 | 说明 |
|------|------|
| 默认提供商 | **OpenCode Zen**（预置，不可删除） |
| baseUrl | `https://opencode.ai/zen/v1`（占位，以官方为准） |
| apiKey | 密文输入，仅存本地，`chrome.storage.local` |
| 模型列表 | 预置 `deepseek/deepseek-v4.1-flash` 等，可增删 |
| 自定义提供商 | `+ 添加`：名称 / baseUrl / apiKey，**模型逐条添加**（模型 ID + 勾选支持输入类型：文本 / 图片 / 附件）；点击卡片右侧箭头可**编辑**并保存。卡片展示各模型及其能力标签 |
| 连接状态 | 提供商**添加后默认即为「已连接」**，无需手动测试/连接；卡片显示绿色状态点 |
| 编辑入口 | 点击卡片右侧**箭头按钮**弹出编辑弹框；点击卡片主体**不触发**编辑 |

**B. 功能开关**
- 网页翻译 `[switch]`
- 划词翻译 `[switch]`
- 悬浮翻译 `[switch]` + 触发延迟滑块（200–1000ms）+ 取词范围（单词/整句）

**C. 翻译**
- 源语言：自动检测 / 指定
- **目标语言**：默认 **简体中文**；下拉含 English / 繁體中文 / 日本語 / 한국어 / Français / Deutsch / Español / Русский / Português / Italiano / العربية / ไทย / Tiếng Việt
- 翻译风格：直译 / 意译 / 词典风

**D. 悬浮球**
- 启用开关、位置（左/右）、展开方式（径向/纵向）
- 工具管理：拖拽排序、显隐开关

**E. 生词本**
- 自动收录开关、仅收录单词开关
- 导入 / 导出（JSON / CSV）、清空

**F. 离线词典**（弹窗管理，见附录 A）
- 设置页只展示摘要（已安装 n/N、已启用词典），点击「管理离线词典」打开**弹窗**。
- 弹窗内：词典列表（名称、语言对、许可、体积、状态：已内置 / 已下载 / 未下载）
  - 每个词典：启用开关（点击即时生效）、下载 / 删除、拖拽调整优先级
  - 在线词典兜底开关 + 说明
  - 查询顺序提示：本地词典 → 在线词典 → AI
  - 数据来源与许可署名

> **「在线词典兜底」是什么**：仅当**所有已启用本地词典都未命中**时，才联网查询免费词典（Free Dictionary API / Wiktionary，无需 Key）。它与「离线词典下载」是**互补而非冲突**：
> - 下载词典 = 离线、快速、零成本查词；
> - 在线兜底 = 本地查不到时的联网补漏（生僻词、未下载语种）；
> - 关闭后即进入**纯离线模式**，查不到的词将提示或改用 AI。

**G. 通用**
- 主题（跟随系统/浅色/深色）、语言（界面语言）、快捷键自定义

### 5.7 生词本 Vocab Book

```
┌──────────────────────────────────────────────┐
│ ← 生词本       [搜索…]    [全部语言▾]  ⬇ ⬆ 🗑  │
├──────────────────────────────────────────────┤
│ serendipity   n.  意外发现的能力       ★★☆    │
│ /ˌserənˈdipədē/   源: example.com     🔊 ⋮    │
│ ephemeral     adj. 短暂的              ★☆☆    │
│ ...                                          │
├──────────────────────────────────────────────┤
│ 共 128 词 · 已掌握 32          分页/虚拟滚动    │
└──────────────────────────────────────────────┘
```

- 字段：单词、音标、词性、释义、例句、来源 URL、源/目标语言、创建时间、**熟悉度/掌握度（0–3 星）**、笔记、标签。

**掌握判定（自动 · 连续答对 3 次）**
| 连续答对 `streak` | 状态 | 底部统计归类 |
|------|------|--------------|
| 0 | 新词 / 未掌握 | 练习中 |
| 1 | 练习中 | 练习中 |
| 2 | 练习中 | 练习中 |
| **3** | **已掌握** | 已掌握 |

- **「已掌握」= `streak ≥ 3`**；`streak` 仅在**连续答对**时累加，**答错立即清零**重新累计（不记录历史对错）。
- **记词词序（优先未掌握）**：记词队列**只包含未掌握的词**（`streak < 3`）；已掌握的词不进入记词。**仅当全部词都已掌握**时，记词才从头展示全部词（按钮文案变为「复习」），且此时**不再计算熟练度**（`streak` 不变）。
- **记词流程（先看后默写，弹框形式）**：生词本页右上角「**记词 N**」按钮（N=待记词数）→ 打开**记词弹框**。底部固定三个控件：**「◀ 上一个」·「默写」·「▶ 下一个」**（`上一个/下一个` 为箭头图标按钮）。
  | 状态 | ◀ 上一个 | 默写/验证 | ▶ 下一个 |
  |------|---------|-----------|---------|
  | 队首（第 1 张） | 禁用 | 默写 | 可跳 |
  | 队中 | 可跳 | 默写 | 可跳 |
  | 队尾（最后一张） | 可跳 | 默写 | 可点（未全对则停留并提示「已是最后一个」，全对/复习模式则进入完成） |
  1. **看词阶段**：显示单词 + 中文释义 + 🔊 图标（进入自动朗读一次），按钮为「**默写**」；
  2. 点「默写」→ **隐藏单词、显示默写输入框**，按钮变为「**验证**」；
  3. 点「验证」（或按 `Enter`）→ 校验并**关闭默写框**（重新显示单词），按钮改回「**默写**」：拼写正确 → `streak+1`（封顶 3，达到即「已掌握」并出队）并**自动跳下一个**（若为最后一个单词，提示「✓ 正确，已是最后一个单词」而非「进入下一个」）；错误/空 → `streak=0`、显示正确拼写；
  4. **再次点「默写」打开默写框时，会清空上一次的校验提示**；
  5. 「◀ 上一个」仅在队首禁用；「▶ 下一个」**自由跳转**（不依赖是否默写）；
  6. **「全部完成」只在本轮全部答对时出现**（复习模式除外，见上）：若存在未答对的词，跳到最后一个后**停留在最后一个单词**，并提示「已经是最后一个单词」；补答正确后可继续收尾进入完成页；
  7. 关闭后刷新列表与统计。
  - 播放读音为**纯图标按钮**（无文字）。
- 触发入口位置：**生词本视图头部右侧**（与「返回」并列），随待记词数量实时显示。
- 列表每行显示连续进度圆点 `N/3`，达到 3 显示绿色「已掌握」徽标；顶部按钮显示待记词数量。
- **单词发音**：生词本每行、记词弹框的释义与输入区、以及对话/历史对话中的词条卡片均带**喇叭图标发音按钮**（线性描边、`currentColor`，与其它图标风格一致），点击调用 **Web Speech API（`speechSynthesis`）** 朗读（英文 `en-US`，中文自动 `zh-CN`）。正式实现可换成词典音频（如 Free Dictionary API 的 `phonetics[].audio`）。
- 底部实时统计：`共 N 词 · 已掌握 M · 练习中 K`。
- 数据字段：`WordEntry.streak: 0|1|2|3`（替换先前的 `familiarity` 手动词条；如需保留手动调整可另存 `familiarity` 字段）。
- 进阶（可选）：结合艾宾浩斯/SM-2 安排复习到期时间；答对也可改为「隔日再测」而非立即出队。

- 操作：搜索、按语言/掌握度筛选、排序、编辑笔记、发音、**复习自测**、删除、批量选择。
- **删除单条**：每行悬停显示 `✕`，点击即删除该词条，底部计数（共 N 词 · 已掌握 M）实时更新；删除当前会话/词条均即时生效。
- 导出：JSON（完整）、CSV（表格）；导入：合并去重（同词同源语言保留更新时间较新者）。
- 复习（可选二期）：基于熟悉度的间隔重复。

### 5.8 历史会话 History

```
┌──────────────────────────────────────────────┐
│ ← 历史会话                                    │
├──────────────────────────────────────────────┤
│ 这句话怎么翻译：Time flies…    刚刚 · 当前会话   │
│ serendipity 这个词怎么用？     8 分钟前 · 点击查看│
│ 帮我翻译这段关于光合作用的英文   3 小时前 · 点击查看│
│ 芥末和山葵有什么区别？        1 天前 · 点击查看   │
└──────────────────────────────────────────────┘
```

- 入口：侧边栏顶部**历史会话**图标（时钟）。
- 列表项：标题（首条用户消息）+ 相对时间 + 状态；当前会话高亮标注「当前会话」，其余显示「点击查看」。
- **点击任一条** → 在对话区**完整载入**该会话的历史消息（含翻译卡片），并切回对话视图。
- 悬停出现删除按钮 `✕`；删除当前会话后自动落到相邻会话。
- **新建会话（＋）**：先把当前会话存回历史，再新建一条仅含欢迎语的会话并切换到对话视图；首条消息发送后自动以该消息生成标题。

> 数据持久化：会话消息建议存 IndexedDB（`sessions` 表，按 `updatedAt` 倒序），列表分页/虚拟滚动；原型内以内存数组演示。

---

## 6. 数据模型

```ts
// types/index.ts

type LangCode = 'auto' | 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko'
  | 'fr' | 'de' | 'es' | 'ru' | 'pt' | 'it' | 'ar' | 'th' | 'vi'

interface ModelDef {
  id: string
  name: string                                   // 模型 ID，如 claude-sonnet-4.5
  inputs: { text: boolean; image: boolean; file: boolean }  // 支持的输入类型
}

interface Provider {
  id: string
  name: string
  baseUrl: string            // OpenAI 兼容: {baseUrl}/chat/completions
  apiKey: string
  models: ModelDef[]         // 模型逐条添加，各自声明输入能力
  isBuiltin?: boolean        // OpenCode Zen 为 true
}

interface ToolItem {
  id: 'pageTranslate' | 'selectionTranslate' | 'hoverTranslate' | 'vocab' | 'settings' | string
  label: string
  icon: string
  type: 'toggle' | 'action'
  visible: boolean
  order: number
}

interface Settings {
  providers: Provider[]
  activeProviderId: string
  activeModel: string
  sourceLang: LangCode
  targetLang: LangCode          // 默认 'zh-CN'
  features: {
    pageTranslate: boolean
    selectionTranslate: boolean
    hoverTranslate: boolean
  }
  hover: { delay: number; scope: 'word' | 'sentence' }
  floatingBall: {
    enabled: boolean
    position: 'right' | 'left'
    expand: 'radial' | 'stack'
    tools: ToolItem[]
  }
  vocab: { autoAdd: boolean; wordOnly: boolean }
  theme: 'system' | 'light' | 'dark'
  shortcuts: Record<string, string>
}

interface WordEntry {
  id: string
  word: string
  phonetic?: string
  partOfSpeech?: string
  translation: string
  examples?: string[]
  sourceLang: LangCode
  targetLang: LangCode
  sourceUrl?: string
  createdAt: number
  updatedAt: number
  streak: 0 | 1 | 2 | 3        // 连续答对次数，达到 3 即「已掌握」（答错清零）
  note?: string
  tags?: string[]
}

interface Session {
  id: string
  title: string                 // 默认取首条用户消息前若干字
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: { type: 'image' | 'file'; name: string; dataUrl?: string }[]
  refTranslation?: WordEntry
  status: 'loading' | 'streaming' | 'done' | 'error'
  createdAt: number
}
```

**存储划分**
| 数据 | 位置 | Key |
|------|------|-----|
| Settings | `chrome.storage.local` | `settings` |
| 生词本 | `chrome.storage.local`（<8MB 足够）/ IndexedDB 兜底 | `vocab` |
| 会话历史 | IndexedDB `sessions` 表，滚动保留最近 N 条 | — |
| 附件二进制 | IndexedDB `attachments` 表 | — |
| 翻译缓存 | 内存 LRU + 可选 `storage.session` | `cache:*` |

---

## 7. 消息协议（content/sidepanel ⇄ background）

```ts
type Msg =
  | { type: 'TRANSLATE_TEXT';   payload: { text: string; sourceLang: LangCode; targetLang: LangCode; mode: 'word'|'sentence'|'page' } }
  | { type: 'TRANSLATE_IMAGE';  payload: { dataUrl: string; targetLang: LangCode; prompt?: string } }
  | { type: 'CHAT';             payload: { messages: ChatMessage[]; providerId: string; model: string; attachments?: Attachment[] } }
  | { type: 'ADD_VOCAB';        payload: WordEntry }
  | { type: 'GET_VOCAB' }
  | { type: 'EXPORT_VOCAB';     payload: { format: 'json'|'csv' } }
  | { type: 'IMPORT_VOCAB';     payload: { format: 'json'|'csv'; data: string } }
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS';  payload: Partial<Settings> }
  | { type: 'CAPTURE_TAB' }
  | { type: 'OPEN_SIDEBAR';     payload?: { view?: 'chat'|'settings'|'vocab' } }
  | { type: 'PING_PROVIDER';    payload: { providerId: string } }
```

`TranslationService` 内部对 `TRANSLATE_TEXT(mode=word)` 采用**结构化词典 prompt**，要求模型返回 JSON：
```json
{ "word": "", "phonetic": "", "partOfSpeech": "", "translation": "", "examples": [""] }
```
对 `mode=sentence/page` 返回纯文本。返回后由 background 组装 `WordEntry` 并（按设置）写入生词本。

---

## 8. 关键流程

### 8.1 划词翻译
```
用户选中 → content 判定有效 → 渲染 SelectionIcon
点击图标 → 渲染 Popover(loading) → sendMessage(TRANSLATE_TEXT)
        → background 查缓存 → 命中直接返回
        → 未命中：
            单词 → 本地词典(ECDICT/WordNet) → 在线词典兜底 → 才用 AI（见附录 A）
            句子 → 直接调用 Provider
        → 返回结果 → Popover 渲染词典卡片
        → 若 vocab.autoAdd 且为单词 → sendMessage(ADD_VOCAB) → 角标红点
```

### 8.2 截图翻译
```
截图 → ⌘V 粘贴进输入框（Composer 监听 paste 中的 image/*）
     → 生成图片附件缩略图
     → 发送 → TRANSLATE_IMAGE → vision 模型 → 渲染译文
```
> 页面内截图也可由悬浮球工具或快捷键 `Ctrl/⌘+Shift+S` 调用 `captureVisibleTab`，把可见区写入剪贴板后由用户粘入。

### 8.3 网页翻译
```
开启工具 → content 扫描块级元素 → 逐段在原元素 after() 追加译文节点(先 loading 骨架)
        → 分批(≤N段) TRANSLATE_TEXT(mode=page)
        → 每段结果到达 → 原位替换骨架为译文（元素级异步，可乱序）
        → 顶部浮条显示进度 n/N；「还原原文」移除全部追加节点
        → MutationObserver 监新增节点增量处理
```

---

## 9. 权限与 Manifest（MV3）

```jsonc
{
  "manifest_version": 3,
  "name": "Mustard 划词翻译",
  "version": "1.0.0",
  "permissions": [
    "storage",          // 配置 & 生词本
    "sidePanel",        // 侧边栏
    "scripting",        // 动态注入 content script
    "contextMenus",     // 右键翻译/加入生词本
    "activeTab",        // 截图、按需注入
    "tabs"              // captureVisibleTab 需要宿主 tab 权限
  ],
  "host_permissions": ["<all_urls>"],   // 网页翻译 + 自定义 provider 请求
  "background": { "service_worker": "background.js", "type": "module" },
  "action": { "default_title": "Mustard" },
  "side_panel": { "default_path": "sidepanel.html" },
  "options_page": "options.html",
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle",
    "all_frames": true
  }],
  "commands": {
    "toggle-page-translate": { "suggested_key": { "default": "Alt+T" }, "description": "切换网页翻译" },
    "open-sidebar":          { "suggested_key": { "default": "Alt+L" }, "description": "打开 Mustard 侧边栏" }
  },
  "web_accessible_resources": [{ "resources": ["assets/*"], "matches": ["<all_urls>"] }]
}
```

**安全**
- API Key 仅存 `storage.local`，仅 background 读取，绝不注入页面 DOM，不入日志。
- 所有网络请求由 background 发起；content 永不直接持有 Key。
- 导入生词本前做 schema 校验，防注入。

---

## 10. 工程目录结构

```
lingolens/
├─ wxt.config.ts
├─ package.json
├─ entrypoints/
│  ├─ background/
│  │  ├─ index.ts            # 消息路由注册
│  │  ├─ translation.ts      # TranslationService
│  │  ├─ provider.ts         # ProviderRegistry / OpenAI 兼容调用
│  │  ├─ vocab.ts            # VocabService
│  │  ├─ screenshot.ts       # captureVisibleTab
│  │  └─ menus.ts            # 右键菜单 & 快捷键
│  ├─ content/
│  │  ├─ index.tsx           # 挂载 Shadow Root + 各 UI
│  │  ├─ floating-ball.tsx
│  │  ├─ selection.tsx
│  │  ├─ hover.tsx
│  │  └─ page-translate.tsx
│  ├─ sidepanel/
│  │  ├─ index.html
│  │  └─ main.ts
│  └─ options/
│     ├─ index.html
│     └─ main.ts
├─ src/
│  ├─ components/
│  │  ├─ FloatingBall.vue   ToolMenu.vue
│  │  ├─ SelectionIcon.vue  TranslatePopover.vue  HoverTooltip.vue
│  │  ├─ ChatPanel.vue      MessageList.vue       ChatInput.vue
│  │  ├─ ModelSelect.vue    AttachmentStrip.vue   ScreenshotView.vue
│  │  ├─ SettingsView.vue   ProviderEditor.vue
│  │  ├─ VocabBook.vue      VocabItem.vue
│  │  └─ ui/ (Button, Switch, Select, Dialog, Tabs…)
│  ├─ stores/
│  │  ├─ settings.ts   chat.ts   vocab.ts   ui.ts
│  ├─ lib/
│  │  ├─ messaging.ts   storage.ts   cache.ts   idb.ts
│  │  ├─ langs.ts       constants.ts
│  │  └─ exporters/ (json.ts, csv.ts)
│  ├─ styles/ tokens.css  shadow.css
│  └─ types/index.ts
└─ assets/ icons/ provider-logos/
```

---

## 11. 状态与边界情况

| 场景 | 处理 |
|------|------|
| 选择在 `<input>`/`<textarea>` 内 | 忽略划词（避免干扰输入） |
| iframe / 跨域 | `all_frames: true`，hover/selection 各 frame 独立 |
| 页面自身 z-index 极高 | Shadow DOM + 固定最大 z-index；必要时 `position: fixed` 到 `<html>` |
| 动态渲染页面（SPA/无限滚动） | MutationObserver 增量处理 |
| API 报错/额度 | Popover 内联错误 + 重试；服务不可用时禁用开关并提示 |
| 流式输出 | SSE 解析，支持中断（AbortController） |
| 无 API Key | 首次引导到设置页；开关置灰 |
| 深色网页 | tooltip/popover 读取 `prefers-color-scheme`，同时继承设置主题 |
| 长文本翻译 | 分段 + 并发限流（并发≤3）+ 进度浮条 |
| 生词本重复 | 同 word+sourceLang 去重，更新 updatedAt 与释义 |

---

## 12. 里程碑规划

| 阶段 | 内容 | 产出 |
|------|------|------|
| M1 | 工程骨架、设置存储、Provider 抽象、侧边栏聊天跑通 | 可对话 |
| M2 | 划词翻译 + 翻译气泡 + 自动入生词本 | 核心闭环 |
| M3 | 悬浮球 + ToolMenu + 悬浮翻译 | 交互完整 |
| M4 | 网页翻译 + 截图翻译 + 生词本管理/导入导出 | 功能齐备 |
| M5 | 打磨：主题、缓存、快捷键、i18n、性能 | 可发布 |
| M6（可选） | 生词本间隔重复复习 | 增强 |

---

## 13. 开放问题（待确认）

1. **侧边栏实现**：用 Chrome 原生 `sidePanel` 还是页面内自绘抽屉？原生更省事且跨标签常驻；自绘更贴合设计稿自由布局。（原型按原生侧边栏呈现）
2. **OpenCode Zen 的准确 baseUrl / 鉴权头 / 模型 ID 列表** 需以官方文档为准填写。
3. 截图翻译是否需要「框选区域」能力（二期）。
4. 生词本是否需要云端同步（当前仅本地）。
5. 界面语言是否需要完整 i18n。
6. 离线词典的取舍：默认内置「英→中 ECDICT 常用词子集」是否可接受？其余语种按需下载还是走在线 API？（见附录 A）

---

## 附录 A · 开源免费词典与「无 AI」查询方案

> 目标：**未接入 AI（无 API Key / 无网络）时，划词查单词仍可用**，且尽量轻量。

### A.1 查询能力分级（核心思路）

```
查单词  → ① 本地离线词典（0 成本 / 秒回 / 免网）
        → ② 在线免费词典 API（无 Key，兜底）
        → ③ 仍未命中才用 AI / 提示

整句 / 段落 / 网页 / 截图  → 直接走 AI（词典无法胜任）
```

- `mode = word` 的划词、悬浮取词只走词典链路；`mode = sentence | page | image` 走 AI。
- 词典结果可缓存进翻译缓存与生词本，避免重复请求。
- 无 AI 时，插件降级为「纯词典工具」，核心体验依然完整。

### A.2 推荐词典（按优先级）

| 词典 | 语言/用途 | 数据量 | 许可 | 备注 |
|------|-----------|--------|------|------|
| **ECDICT** | 英→中 双解（**首选**） | 76 万条 CSV / SQLite | **MIT** | 含音标、词性、中英释义、BNC+当代词频、四六级/雅思/牛津标签、动词变形(exchange)、lemma。MIT 最省心 |
| **WordNet** | 英英释义/同反义 | ~15.5 万词 | WordNet License（宽松） | 补英文释义、上下位、同反义；npm `wordnet-db` |
| **CC-CEDICT** | 中→英 | ~12 万条 | CC BY-SA 4.0 | 汉英查询 |
| **JMdict** | 日→英 | ~21 万条 | EDRDG / CC BY-SA 4.0 | 日英；`jmdict-simplified` 等 JSON 版可用 |
| **FreeDict** | 140+ 双语，45 语言 | 视词典 | GPL / 部分 CC | 德法西俄等；离线，TEI/StarDict/dict 格式 |
| **Wiktionary** | 多语种 | 极大 | CC BY-SA / GFDL | 可经 kaikki.org 取预解析 JSON，按需裁剪 |
| **Apertium / dictd 库** | 多语种 | 视包 | GPL 等 | 补充来源 |

### A.3 在线免费词典 API（无需 Key）

| API | 说明 | 端点 |
|-----|------|------|
| **Free Dictionary API** | 英英，基于 Wiktionary，免费无限 | `https://api.dictionaryapi.dev/api/v2/entries/en/<word>` |
| **Wiktionary REST** | 多语种，免费 | `https://<lang>.wiktionary.org/api/rest_v1/page/definition/<word>` |
| **Datamuse** | 找词/联想/同义（英） | `https://api.datamuse.com/words?sp=...` |

> 在线 API 仅作兜底；命中失败或超时（≤800ms）自动回落到 AI 或提示。
> 设置中的「在线词典兜底」开关控制是否允许该联网查询：关闭即纯离线模式。它与离线词典下载不冲突（详见 5.6 F）。

### A.4 轻量落地（Chrome 扩展内）

1. **数据不进 bundle**：词典数据作为扩展内资源（或首次运行按需下载到 IndexedDB），按目标语言懒加载。
2. **裁剪**：把 ECDICT 按词频裁剪为常用 **3–6 万词** 子集，体积可压到几 MB 级；再 gzip/br。
3. **查询存储**：
   - 简单：`SQLite` + `sql.js`（WASM，约 1MB）或 `wa-sqlite`；
   - 更轻：为词头建 **前缀索引/trie（DAWG/FST）**，词条值用紧凑二进制，内存映射查询，避免整库常驻。
4. **词形归一化**（running→run、gave→give）：优先用 ECDICT 的 `exchange`/lemma 字段；不够时用轻量 `wink-lemmatizer`。
5. **缓存**：LRU 内存缓存 + 生词本复用，避免重复查询。
6. **多语种策略**：默认只内置「英→中（ECDICT）」，其余语种按需下载/走在线 API，保持安装包精简。

### A.5 许可提醒

- **MIT（ECDICT）**：可自由内置、修改、商用，最省心 —— 建议作为默认离线词典。
- **CC BY-SA（CC-CEDICT / Wiktionary / JMdict）**：需署名并「相同方式共享」，注意与扩展整体分发的许可兼容。
- **GPL（多数 FreeDict）**：copyleft，若与你的扩展许可不兼容需谨慎；可挑选有 CC 授权的子集或仅在线引用。
- 所有内置词典需在「关于/设置」页做**数据来源与许可署名**。

### A.6 推荐依赖

- `sql.js` 或 `wa-sqlite`（WASM SQLite 查询）
- `wordnet-db`（WordNet 数据），`wink-lemmatizer`（词形还原）
- 可选：`compromise`（轻量 NLP，用于断句/取词，注意体积）


---

## 附录 B · 图标资产（assets/icons）

由设计稿中**红框区域内**的圆角图标本体裁切生成：裁切到圆角方块边界并向内收 12px 以剔除原稿的柔边/描边，圆角遮罩半径 ≈210px（与方块自身圆角对齐，避免角部出现杂线或薄荷色月牙），红框（`#F05B56`）与外部薄荷背景全部**透明**。

| 文件 | 尺寸 | 用途 |
|------|------|------|
| `icon.svg` | 256（可缩放） | 图标/SVG 场景；**位图嵌入**，非矢量描摹 |
| `icon.ico` | 16/32/48/128 多尺寸 | favicon / Windows |
| `icon-1024.png` | 1024×1024 | 主图/商店素材 |
| `icon-512.png` | 512×512 | 通用 |
| `icon-256.png` | 256×256 | 通用 |
| `icon-128.png` | 128×128 | **Chrome MV3 `icons.128`** |
| `icon-48.png` | 48×48 | Chrome `icons.48` / 扩展页 |
| `icon-32.png` | 32×32 | Chrome `icons.32` |
| `icon-16.png` | 16×16 | Chrome `icons.16` / favicon |

### 悬浮球圆形图标

`ball-circle.svg` + `ball-circle-256/128/64.png`：**直接从设计稿抠出卡通形象**（保留顶部茎冠、根茎躯干、四肢、手持砧板/山葵泥，含深色描边），置于圆形浅绿渐变底上，导出为圆形卡通图标。

- 抠图流程：按 `min(R,G,B)` 阈值分离主体 → 保留最大连通域（自动剔除周围的小芥末枝叶）→ 填充内部镂空 → 羽化边缘 → 以原图套用 alpha 得到透明底人物 → 自适应缩放居中到圆形底。
- 动效：鼠标移入 → `scale(1.12) rotate(-6deg)` + 一次回弹（55% 处过冲至 1.2 / -10°）；移出 → transition 平滑回落。
- 原型中以 base64 PNG 内联，保持单文件可移植。

> 若需要**纯矢量（真 SVG 路径）**版本，可用 `vtracer`（彩色矢量描摹）或 `potrace`（单色剪影）对 `icon-1024.png` 描摹后替换 `icon.svg`。
