# HANDOFF — 里程碑交接记录

> **用法（每个会话必读）**
> 1. 开工前先读：`AGENTS.md` → `design/PLAN.md`（进度表）→ 本文件（最近一条交接 + 冻结接口）。
> 2. 收尾时在本文件追加一条该里程碑的交接记录（模板见下），并 commit + push。
> 3. 全程**串行开发**：一次只推进一个里程碑，不并行开会话。

## 交接模板

```
## M<编号> · <名称> — <状态：完成 / 部分>
- 做了什么：
- 对外暴露（接口/组件/Store/消息）：
- 验证：
- 未完成 / TODO：
- 下一步依赖：
```

---

## 冻结接口（先读这里，避免跨里程碑冲突）

**`@mustard/shared`**（类型与常量，只增不改名）
- 类型：`Settings` / `Provider` / `ModelDef` / `ModelInputs` / `ToolItem` / `WordEntry` / `Streak` / `Session` / `ChatMessage` / `Attachment` / `TranslationCard` / `DictResult` / `TranslateMode` / `LangCode` / `SourceLang`
- 常量：`DEFAULT_SETTINGS`、`OPENCODE_ZEN_PRESET`（apiKey 空占位）、`DEFAULT_TOOLS`、`DICTIONARIES`、`STORAGE_KEYS`、`LANGS` / `langShort()` / `langBcp47()`、`MASTERED_STREAK`
- 消息协议：`Message` 联合类型 + `ResponseMap`（`PING/GET_SETTINGS/UPDATE_SETTINGS/TRANSLATE_TEXT/CHAT/TRANSLATE_IMAGE/LOOKUP_WORD/ADD_VOCAB/GET_VOCAB/REMOVE_VOCAB/EXPORT_VOCAB/IMPORT_VOCAB/OPEN_SIDEBAR/CAPTURE_TAB`）
- 流式协议：`CHAT_PORT_NAME`、`ChatStartPayload`、`ChatPortClientMessage`、`ChatPortServerMessage`、`ERR_MISSING_API_KEY`
- 会话消息：`GET_SESSIONS`（→`Session[]`）、`SAVE_SESSION`（`{ session }`→`Session`）、`DELETE_SESSION`（`{ id }`→`{ id }`）
- 生词本消息：`UPDATE_VOCAB`（按 id 覆盖，记词改 `streak` 用；不走 `ADD_VOCAB` 的取大逻辑）

**`@mustard/platform`**
- `send<T>(msg)` / `onMessage(handler)` / `openSidePanel(tabId?)` / `getSettings()` / `updateSettings(patch)` / `getStored` / `setStored` / `browser`
- `startChat(payload, handlers)`：打开流式对话长连接，返回 `{ abort() }`（`handlers: onDelta/onDone/onError`）
- IndexedDB：`idbGet(key)` / `idbSet(key, value)`（`mustard` 库、`kv` store；会话持久化用）

**`@mustard/design-tokens`**
- CSS 变量：`--m-paper / surface / surface-2 / ink / muted / faint / line / primary / primary-ink / primary-soft / accent / accent-soft / blush / warn / shadow-sm / shadow-md / shadow-lg`
- 子路径导出：`.`（barrel，**含 unocss，勿在运行时代码导入**）、`./theme`（纯函数：`applyTheme/resolveTheme/prefersDark/watchSystemTheme` + `ThemeMode/ResolvedTheme`）、`./tokens`、`./preset`、`./theme.css`
- UnoCSS：`presetMustard()`（颜色/圆角/阴影映射到上述变量 + `m-*` shortcuts）；`theme.css`（`:root`/`[data-theme="light"]`/`[data-theme="dark"]`/系统深色兜底）

**`@mustard/ui`**（当前导出，后续只增不改名）
- `MButton`（`variant: 'primary' | 'ghost'`）、`MSwitch`（`v-model`）
- `MIcon`（`name` + `size` + `strokeWidth`；图标见 `ICONS`）、`MChip`（`variant/removable`）、`MBadge`（`count/dot/max/variant`）、`MField`（`label/hint/inline`）、`MSelect`（`v-model` + `options: SelectOption[]`）、`MDialog`（`v-model` + `title/width`）、`MTabs`（`v-model` + `tabs: TabItem[]`）、`MStars`（`v-model` + `max/readonly`）、`MToastHost` + `useToast()`（`info/success/error`）

**`@mustard/core`**
- 子路径导出：`@mustard/core/dictionary`、`/providers`、`/session`、`/translation`、`/vocab`（**content 侧只导入 `/vocab`，避免把 AI 客户端打进每个页面**）
- `session`：`createSession`、`sessionTitle(messages)`、`upsertSession`、`removeSession`、`sortSessions`
- `chatStream(provider, model, messages, signal?)`：OpenAI 兼容**流式**，未配 Key 抛 `ProviderError('MISSING_API_KEY')`
- `chatOnce(provider, model, messages, signal?)`：非流式单次调用；`testConnection(provider, model, signal?)`
- `parseSseDelta(line)`、`buildChatBody(model, messages, stream?)`、`toContentParts(message)`（**多模态：图片附件转 `image_url` content 数组**）、`ProviderError`、`errorCode(error)`
- `translation`：`translateWord(word, srcLang, tgtLang, { online, ai? })`（本地→在线→AI，LRU 缓存）、`translateSentence(text, srcLang, tgtLang, ai?)`、`lookupWord(word, targetLang)`、`parseWordCard(raw, fallback)`、`translateImage(dataUrl, targetLang, ai)`（多模态截图翻译）
- `dictionary`：`lookupOnline(word, targetLang?)`（Free Dictionary API，≤900ms 超时，无需 Key）；`LocalEntry`、`ECDICT_SAMPLE`（内置样例）、`lemmaCandidates(word)`（规则词形还原）、`createLocalLookup(entries)`
- `translateWord` 选项新增 `local?: (word) => DictResult | null`（链路：本地→在线→AI）
- `vocab`：`normalizeWord`、`wordKey`、`upsertWord`、`removeWord`、`mergeVocab`、`vocabStats`、`cardToEntry`

**`@mustard/utils`**
- `uid()` / `timeAgo()` / `sleep()` / `LRU` / `hashString()` / `cacheKey()` / `vocabToCsv()` / `vocabToJson()` / `parseVocabCsv()` / `parseVocabJson()`

---

## M0 · 工程基建 — 完成
- **做了什么**：pnpm workspace + Turborepo（`build/dev/lint/typecheck/clean`）；`@mustard/config` 提供 `tsconfig.base.json`/`tsconfig.vue.json`；根 ESLint（`@antfu/eslint-config`）；CI（`.github/workflows/ci.yml`：install → lint → typecheck → build）；`LICENSE(MIT)`、`THIRD-PARTY.md`、`.editorconfig`、`.npmrc`、`.gitignore`；**pnpm catalog 锁版本**。
- **对外暴露**：`pnpm lint / typecheck / build / dev:ext / dev:landing`；`catalog:` 版本引用方式。
- **验证**：`pnpm lint`、`pnpm typecheck`（8 packages）、`pnpm build` 全绿。
- **未完成 / TODO**：`clean` 脚本各包未实现；无测试框架（计划 M10 决定是否引入 vitest）。
- **下一步依赖**：无。

## M1 · 设计资产入库 — 部分完成
- **做了什么**：`design/DESIGN.md`（产品/交互/数据设计）、`design/PLAN.md`（计划 + 进度表）、`design/prototype/index.html`（可交互原型）、`design/icons/*`（应用图标全尺寸 + `ball-circle*` + `mascot.png`）、`design/screenshots/`（空目录）。
- **对外暴露**：图标已复制到 `apps/extension/public/icon/{16,32,48,128}.png`（WXT 自动生成 manifest icons）与 `apps/landing/public/favicon.png`；悬浮球图标以 **base64 内联**在 `apps/extension/entrypoints/content/ball.ts`（避免资源 URL 配置问题）。
- **验证**：扩展构建产物含 `icon/*.png` 与 `icon.svg`。
- **未完成 / TODO**：**宣传页/README 截图待导出**（划词气泡、侧边栏、网页双语、生词本+记词、设置/词典）→ 归入 M11 前完成。
- **下一步依赖**：M11（宣传页）需要截图。

## M2 · 扩展骨架（MV3）— 完成
- **做了什么**：WXT 0.21 + Vue3 + TS + Pinia + UnoCSS；四个入口 `entrypoints/background.ts`、`entrypoints/content/index.ts`（`createShadowRootUi` 挂 Vue，`cssInjectionMode: 'ui'`）、`entrypoints/sidepanel/*`、`entrypoints/options/*`；`uno.config.ts` 使用 `presetMustard()`。
- **对外暴露**：content 悬浮球 `ContentApp.vue`（5 个工具、径向/纵向、hover 展开、点击 `OPEN_SIDEBAR`）；sidepanel/options 已能 `send({type:'GET_SETTINGS'})` 并展示；background 已实现 `PING / GET_SETTINGS / UPDATE_SETTINGS / OPEN_SIDEBAR`，并 `setPanelBehavior({openPanelOnActionClick:true})`。
- **验证**：`pnpm build:ext` 通过；生成的 manifest 含 `storage/sidePanel/scripting/contextMenus/activeTab/tabs` + `<all_urls>` + `commands(Alt+T/Alt+L)` + `side_panel` + `content_scripts(all_frames, document_idle)`；内容脚本 CSS 已在 `web_accessible_resources`。
- **未完成 / TODO**：悬浮球工具环的工具开关尚未落到 `settings.floatingBall.tools`（当前是组件内本地状态）；工具图标为内联 path（后续可抽成 `ui` 的图标组件）；`sidepanel` 仅为骨架（无对话/附件/历史）。
- **下一步依赖**：M3 需把悬浮球、面板的通用样式与组件沉淀到 `packages/ui`；M4 需要 sidepanel 设置视图；M7 需要 sidepanel 对话与历史。

## M3 · UI 组件库 + 主题 — 完成
- **做了什么**：
  1. `@mustard/design-tokens`：新增 `theme.ts`（`resolveTheme/applyTheme/watchSystemTheme/prefersDark`）；`presetMustard()` 增加 `boxShadow` 与 `m-*` shortcuts（`m-card/m-panel/m-row/m-col/m-chip/m-input/m-icon-btn/m-muted`）；`theme.css` 增加阴影 CSS 变量与系统深色兜底（`[data-theme]` 选择器不带 `:root`，以适配 Shadow DOM 宿主）；新增子路径导出 `./theme`、`./tokens`、`./preset`。
  2. `@mustard/ui`：新增 `MIcon`（内联线性图标库 `ICONS`，与原型图标一致）+ `MChip` / `MBadge` / `MField` / `MSelect` / `MDialog` / `MTabs` / `MStars` / `MToastHost` + `useToast()`；`MButton`/`MSwitch` 未改动。
  3. `apps/extension`：新增 `lib/useTheme.ts`（读 `settings.theme` + 跟随系统 + 监听 storage 变更）；sidepanel 用 `MChip/MIcon/MButton/MToastHost` 重构、options 用 `MSwitch/MSelect/MField` + shortcuts 重构、悬浮球工具环改用 `MIcon`（几何/交互不变）；options 新增「主题」下拉（跟随系统/浅色/深色）。
- **对外暴露（新增，未改名）**：`@mustard/design-tokens/theme` 的 `applyTheme/resolveTheme/prefersDark/watchSystemTheme` + `ThemeMode/ResolvedTheme`；`@mustard/ui` 的全部组件与 `useToast`；`apps/extension/lib/useTheme`（`useTheme(getTarget?)`，content 传 Shadow DOM 根元素以隔离）。
- **验证**：`pnpm lint && pnpm typecheck && pnpm build` 全绿（扩展 410.76 kB + 落地页 2 页）；`wxt build` 产物含 shortcuts CSS（如 `.m-card`）。
- **未完成 / TODO**：Storybook/组件预览页未做（M3 验收的替代 = 扩展内实际呈现）；sidepanel 仍是骨架（对话/附件/历史在 M4/M7）；悬浮球工具开关仍未落 `settings.floatingBall.tools`；`MToastHost` 目前仅在 options/sidepanel 挂载。
- **下一步依赖**：M4 设置页可直接复用 `MField/MSelect/MSwitch/MDialog/MTabs`；M5 可复用 `MIcon/MStars/MChip`（生词本掌握度）；后续运行时代码**不要**从 `@mustard/design-tokens` barrel 导入（见 PROBLEMS）。

## M4 · 模型提供商与设置 — 完成
- **做了什么**：
  1. `@mustard/shared`：新增流式协议 `stream.ts`（`CHAT_PORT_NAME` / `ChatStartPayload` / `ChatPortClientMessage` / `ChatPortServerMessage` / `ERR_MISSING_API_KEY`）。
  2. `@mustard/core`：新增 `ProviderError`、`errorCode()`、`chatOnce()`（非流式）、`testConnection()`；`chatStream` 未配 Key 改抛 `ProviderError('MISSING_API_KEY')`。
  3. `@mustard/platform`：新增 `startChat(payload, handlers)` 长连接客户端（`onDelta/onDone/onError` + `abort()`）。
  4. `apps/extension/background.ts`：`onConnect` 处理 `CHAT_PORT_NAME`，逐块转发 SSE delta / done / error，支持 abort；`CHAT` 消息用 `chatOnce` 兜底。
  5. `apps/extension/stores/settings.ts`：Pinia 设置 store（`load/patch/saveProviders` + `activeProvider/activeModel/aiConfigured/canAttachActive`）。
  6. options 页重写为 MTabs（模型 / 翻译 / 悬浮球 / 生词本 / 外观）：提供商卡片（内置不可删、状态点、模型能力标签）+ `ProviderDialog`（名称/baseUrl/apiKey、模型逐条增删 + 文本/图片/附件能力、测试连接）；当前模型选择；源/目标语言；功能开关；悬浮延迟滑块与取词范围；悬浮球启用/位置/展开/工具排序显隐；生词本自动收录；主题。
  7. sidepanel：流式对话（Enter 发送 / Shift+Enter 换行、逐字输出、停止）、模型下拉、目标语言、附件条与 📎（按 `canAttachActive` 门控）、粘贴截图门控。
  8. content 悬浮球改为由 `settings.floatingBall` 驱动（enabled/position/expand/tools 排序显隐），toggle 工具读写 `settings.features`。
- **对外暴露（新增，未改名）**：见上方「冻结接口」新增条目；extension 内 `stores/settings.ts`、options `ProviderDialog.vue`。
- **验证**：`pnpm lint && pnpm typecheck && pnpm build` 全绿（扩展 446.87 kB + 落地页 2 页）。
- **未完成 / TODO**：**附件/图片尚未真正发给模型**（`buildChatBody` 仍为纯文本，多模态在 M6）；会话历史/持久化在 M7；provider「测试连接」直接从 options 页 fetch（后续可统一走 background）；`aiConfigured` 仅看 apiKey 非空。
- **下一步依赖**：M5 划词/悬浮/生词本复用 `core` 调用与 sidepanel 消息；M6 在 `buildChatBody` 中加入图片/附件内容块（门控已就绪）；M7 把 sidepanel 的本地 `messages` 迁到 `core/session` + IndexedDB。

## M5 · 划词翻译 + 悬浮翻译 + 生词本 — 完成
- **做了什么**：
  1. `@mustard/core`：新增 `dictionary/online`（Free Dictionary API 兜底，900ms 超时）、`translation`（单词链路 本地→在线→AI + 句子 AI + LRU 缓存 + 词条 JSON 解析）、`vocab`（归一化/去重 upsert/合并导入/删除/统计/`cardToEntry`）；新增子路径导出 `./providers` `./translation` `./vocab`。
  2. `@mustard/shared`：`STORAGE_KEYS` 增加 `pendingView`。
  3. `apps/extension`：`lib/vocabStore`（storage 持久化）、`lib/speech`（Web Speech 发音）。
  4. background：实现 `TRANSLATE_TEXT`（单词自动入库）、`LOOKUP_WORD`、`GET_VOCAB`/`ADD_VOCAB`/`REMOVE_VOCAB`/`EXPORT_VOCAB`/`IMPORT_VOCAB`；`OPEN_SIDEBAR` 写入 `pendingView` 供侧边栏定位视图。
  5. content：`SelectionLayer`（划词图标 + 翻译气泡卡片：音标/词性/释义/例句/发音/复制/加入生词本）、`HoverTooltip`（延迟取词/取句 + tooltip + 加入生词本）、悬浮球按生词本数量显示红点；均按 `settings.features` 门控。
  6. sidepanel：新增生词本视图 `VocabView`（搜索、掌握度筛选、发音、删除、JSON/CSV 导入导出、底部统计），头部加入对话/生词本/设置导航，并按 `pendingView` 初始化视图。
- **对外暴露（新增，未改名）**：见上方核心/冻结接口新增条目；extension 内 `lib/vocabStore`、`lib/speech`、content `SelectionLayer/HoverTooltip/actions`、sidepanel `VocabView`。
- **验证**：`pnpm lint && pnpm typecheck && pnpm build` 全绿（扩展 472.43 kB + 落地页 2 页）。
- **未完成 / TODO**：离线词典（ECDICT）与词形还原在 M8，目前单词链路实际是「在线→AI」；记词（听音默写）在 M9，`streak` 仅展示不增长；红点按「生词本非空」显示，未做已读/增量；`MStars` 交互评分未接 streak 更新。
- **下一步依赖**：M6 网页/截图翻译复用 `TRANSLATE_TEXT(mode=page)` 与 `TRANSLATE_IMAGE`（待实现）并在 `buildChatBody` 加入图片内容块；M8 在 `translateWord` 的本地分支接入 ECDICT 并补词形归一。

## M6 · 网页翻译 + 截图翻译 — 完成
- **做了什么**：
  1. `@mustard/core`：`buildChatBody` 支持多模态（新增 `toContentParts(message)`：图片附件 → `image_url` content 数组，文件附件文本并入）；新增 `translateImage(dataUrl, targetLang, ai)`。
  2. background：新增 `TRANSLATE_IMAGE`（多模态翻译，未配 Key 抛 `MISSING_API_KEY`）与 `CAPTURE_TAB`（`tabs.captureVisibleTab`）。
  3. content：新增 `pageTranslator`（块级扫描「叶子块」→ 原元素后追加 `.mustard-translation` 节点、先 shimmer 骨架、逐段 `TRANSLATE_TEXT(mode=page)` 替换、并发 3、`MutationObserver` 增量、`stopPageTranslate` 全部移除并还原）+ `PageToolbar` 顶部浮条（`翻译中 n/N` / `完成 · n 段` / 未翻译提示 + 还原原文）；悬浮球「网页翻译」开关经 `watch(features.pageTranslate)` 驱动启停。
  4. sidepanel：粘贴 `image/*` 直接走 `TRANSLATE_IMAGE`，把图片作为用户消息、译文作为助手消息渲染（无 Key 给引导文案）。
- **对外暴露（新增，未改名）**：`toContentParts`、`translateImage`；extension 内 `content/pageTranslator`（`startPageTranslate/stopPageTranslate/setPageSettings/pageState`）、`content/PageToolbar`。
- **验证**：`pnpm lint && pnpm typecheck && pnpm build` 全绿（扩展 478.46 kB + 落地页 2 页）。
- **未完成 / TODO**：网页翻译状态未持久化（刷新不恢复，DESIGN 标注为可选）；句子/段落按整块请求，未做缓存持久化与限流调优（M10）；截图仅支持粘贴，未加快捷键（`CAPTURE_TAB` 已就绪，M10 再接命令）；`TRANSLATE_IMAGE` 未按 `inputs.image` 二次门控（sidepanel 已用 `canAttachActive` 前置拦截）。
- **下一步依赖**：M7 会话历史/侧边栏完善（`core/session` + IndexedDB），网页翻译的进度/还原状态可迁到 session 持久化。

## M7 · 会话历史 + 侧边栏完善 — 完成
- **做了什么**：
  1. `@mustard/platform`：新增 IndexedDB 封装 `idbGet/idbSet`（`mustard` 库 / `kv` store）。
  2. `@mustard/core`：新增 `session`（`createSession/sessionTitle/upsertSession/removeSession/sortSessions`）+ 子路径导出 `./session`。
  3. `@mustard/shared`：消息协议新增 `GET_SESSIONS`/`SAVE_SESSION`/`DELETE_SESSION` + `ResponseMap`。
  4. background：会话读/存/删（`lib/sessionStore`，IndexedDB 持久化）。
  5. sidepanel：消息在流式完成后持久化为 `Session`（标题取首条用户消息）；新增 `HistoryView`（按 `updatedAt` 倒序、相对时间、当前会话高亮、悬停删除）；头部新增「新建会话 ＋」「历史会话」；`openSession` 完整载入历史（含图片附件缩略）；`pendingView` 支持 `history`。
- **对外暴露（新增，未改名）**：见上；extension 内 `lib/sessionStore`、sidepanel `HistoryView`。
- **验证**：`pnpm lint && pnpm typecheck && pnpm build` 全绿（扩展 483.70 kB + 落地页 2 页）。
- **未完成 / TODO**：历史列表未分页/虚拟滚动（M10）；删除当前会话后未自动落到相邻会话（需手动选择）；会话消息未做大小上限/清理；翻译卡片（`ChatMessage.card`）在历史中仍按文本渲染。
- **下一步依赖**：M8 离线词典与 sidepanel 词典管理弹窗；M10 对会话列表做虚拟滚动与清理策略。

## M8 · 离线词典 — 完成（数据源待补）
- **做了什么**：
  1. `@mustard/core`：新增 `dictionary/local`（`LocalEntry`、`ECDICT_SAMPLE` 内置样例、`lemmaCandidates` 规则词形还原、`createLocalLookup`）；`dictionary/index` 聚合 online+local；新增子路径 `./dictionary`；`translateWord` 链路改为**本地→在线→AI**（新增 `options.local`）。
  2. `apps/extension`：`lib/dictionaryStore`（内置数据 + IndexedDB 存取可下载词典；`getLocalLookup` 合并已启用词典；`install/uninstall`）。
  3. background：`TRANSLATE_TEXT(mode=word)` 按 `settings.dictionaries` 的 installed+enabled 构造本地查询并传入。
  4. options：新增「词典」tab（在线兜底开关、已安装/启用统计、「管理离线词典」弹窗：启用开关、删除、下载、许可署名）。
- **对外暴露（新增，未改名）**：见上；extension 内 `lib/dictionaryStore`。
- **验证**：`pnpm lint && pnpm typecheck && pnpm build` 全绿（扩展 493.51 kB + 落地页 2 页）。
- **未完成 / TODO（数据源，见 PROBLEMS）**：内置 ECDICT 仅样例、非全量；可下载词典 `DICT_SOURCES` 为空，下载按钮禁用提示「下载源待补充」；词形还原为规则版。
- **下一步依赖**：M9 记词复用 `streak` 与生词本；数据源补齐后无需改链路（填 `DICT_SOURCES` / 替换 `ECDICT_SAMPLE`）。

## M9 · 记词（听音默写）— 完成
- **做了什么**：
  1. `@mustard/shared`：新增 `UPDATE_VOCAB`（按 id 覆盖）消息 + `ResponseMap`。
  2. `apps/extension`：`lib/vocabStore` 新增 `updateVocab`；background 新增 `UPDATE_VOCAB`。
  3. sidepanel：新增 `QuizDialog`（看词→默写→验证状态机）：队列优先未掌握词（`streak` 升序），全部掌握则整轮复习（不计分）；看词阶段显示单词+释义并自动朗读，默写阶段隐藏单词+输入框，验证正确 `streak+1`（封顶 3）并自动下一词、错误清零并显示正确拼写；◀/▶ 自由跳转（队首/队尾禁用）；完成页仅在本轮全对或复习模式出现；关闭后刷新词表与统计。
  4. `VocabView`：新增「记词 N」按钮（N=待记词数）、已掌握徽标（`streak ≥ 3` 显示「已掌握」，否则星级）。
- **对外暴露（新增，未改名）**：`UPDATE_VOCAB`；`updateVocab`；sidepanel `QuizDialog`。
- **验证**：`pnpm lint && pnpm typecheck && pnpm build` 全绿（扩展 499.18 kB + 落地页 2 页）。
- **未完成 / TODO**：发音用 Web Speech（未接词典音频，M10 可换 Free Dictionary 音标音频）；未做艾宾浩斯/间隔复习（DESIGN 标为可选二期）；默写未做大小写以外的容错（如忽略连字符）。
- **下一步依赖**：M10 打磨（缓存/性能/快捷键/i18n/无障碍/错误空态）与数据源补齐。

## M10 · 打磨 — 部分完成
- **做了什么**：
  1. **翻译缓存可持久化**：`lib/translationCache`（IndexedDB `translate-cache`，上限 300 条、按插入顺序淘汰）；background 的 `TRANSLATE_TEXT` 先查持久缓存（key = `cacheKey(mode,text,src,tgt)`），命中直接返回，未命中计算后写入（与 `core/translation` 的内存 LRU 双层）。
  2. **快捷键**：background 监听 `browser.commands.onCommand` —— `Alt+T` 切换「网页翻译」feature（content 经 storage 变更自动启停）、`Alt+L` 打开侧边栏。
  3. **右键菜单**：`contextMenus`（选中文本）→「用 Mustard 翻译」打开侧边栏并把选中文本预填进输入框（`STORAGE_KEYS.pendingCompose`）；「加入生词本」走 `translateWord`（本地→在线→AI）后入库。
  4. **并发限流**：网页翻译已按并发 3 批量请求（M6）。
- **对外暴露（新增，未改名）**：`STORAGE_KEYS.pendingCompose`；extension 内 `lib/translationCache`。
- **验证**：`pnpm lint && pnpm typecheck && pnpm build` 全绿（扩展 500.85 kB + 落地页 2 页）。
- **未完成 / TODO（明确留待后续）**：
  - **i18n（zh/en 文案抽取到 `shared/i18n`）未做**：当前 UI 文案仍是中文硬编码；设置项「界面语言」未加。
  - **虚拟列表未做**：生词本/历史会话在超大列表下未做窗口化；历史未做分页。
  - 翻译缓存未做 TTL/容量按设置可调；无右键菜单图标（Chrome 限制）。
  - 无障碍（aria/键盘可达）仅局部，未系统审查。
- **下一步依赖**：M11 宣传页只介绍已实现栏目（i18n 未完成则不宣称双语 UI）；M12 文档按实际实现撰写。

## M11 · 宣传页（Astro）— 完成
- **做了什么**：`apps/landing` 落地页完整版 —— 新增 `src/config/content.ts`（zh/en 同源文案，含 8 个功能区块、三步上手、子功能卡片、开源、安装）与 `src/components/Landing.astro`（Hero + Nav + 8 个图文交替功能区块 + 三步 + 更多细节 + 开源贡献 + 安装指引 + Footer）；`pages/index.astro`（zh）与 `pages/en/index.astro`（en）改为传入 locale。
- **视觉**：因 `design/screenshots/` 仍为空（M1 TODO），功能配图用**纯 CSS mock 界面**（浏览器窗、划词气泡、双语段落、侧边栏、生词本/记词、词典链路、提供商卡片）占位，全部走 design-tokens，深浅色自适应；未引入二进制截图。
- **对外暴露**：landing `CONTENT`（zh/en）、`Landing.astro`。
- **验证**：`pnpm lint && pnpm typecheck && pnpm build` 全绿（落地页 2 页，`astro check` 0 error）；构建产物 `dist/index.html` 与 `dist/en/index.html` 均含全部区块。
- **未完成 / TODO**：**真实截图仍缺**（`design/screenshots/` 空）→ 用 mock 顶替，后续导出后替换即可；UI 为中文/英文两份静态文案，未接入 `shared/i18n`（与 M10 一致）。
- **下一步依赖**：M12 部署（Pages/release workflow 已在 M0/M4 配好）与 README 中英初稿；链接已在 `links.ts` 用真实地址。

---

## 跨会话注意事项（踩过的坑）
- 依赖版本用 `catalog:` 统一，**TypeScript 固定 `^5.9.3`**（TS 7 生态未跟上）。
- Astro 需要显式声明 `@unocss/reset`（`injectReset`）。
- 家目录 `~/node_modules/cookie@0.7.2` 会遮蔽工作区版本 → 根 `package.json` 已显式声明 `cookie: catalog:`，**不要删**。
- 细节与解决过程见 `docs/PROBLEMS.md`；Token 纪律见 `AGENTS.md`。
- **运行时代码不要从 `@mustard/design-tokens` barrel 导入**（会拖入 `unocss`/`oxc-parser` 导致 `wxt build` 失败）；用 `@mustard/design-tokens/theme` 或 `/tokens`。
- `pnpm-workspace.yaml` 的 `trustPolicyExclude` 精确豁免了 `chokidar@4.0.3`（`astro check` 的传递依赖），否则改动 lockfile 时 `pnpm install` 会被 `trustPolicy: no-downgrade` 拒绝。
- CI 依赖脚本用 `allowBuilds`（**pnpm 11 已移除 `onlyBuiltDependencies`**）：当前 `allowBuilds: { esbuild: true }`；`strictDepBuilds` 默认 true，未批准的构建会让 CI 以 `ERR_PNPM_IGNORED_BUILDS` 失败（本地不报错，只有 `CI=true` 才失败）。
- GitHub Actions 统一用 Node 24 运行时版本：`actions/checkout@v5`、`actions/setup-node@v5`、`pnpm/action-setup@v6`、`actions/configure-pages@v6`、`actions/upload-pages-artifact@v5`、`actions/deploy-pages@v5`、`actions/upload-artifact@v7`、`softprops/action-gh-release@v3`。
- **GitHub Pages 需在仓库 Settings → Pages 手动把 Source 设为 `GitHub Actions`**（一次性）；否则 `actions/configure-pages` 会 404。`enablement: true` 需要非 `GITHUB_TOKEN` 的 PAT，默认 token 无法自动开启。

## 下一个会话的启动清单
```bash
cd ~/self/mustard && git pull
pnpm install
pnpm lint && pnpm typecheck && pnpm build   # 开工前自检
```
然后阅读：`AGENTS.md` → `design/PLAN.md` → `docs/HANDOFF.md`（本节）。下一个里程碑：**M12 · 部署与文档**。
