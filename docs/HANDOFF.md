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

**`@mustard/platform`**
- `send<T>(msg)` / `onMessage(handler)` / `openSidePanel(tabId?)` / `getSettings()` / `updateSettings(patch)` / `getStored` / `setStored` / `browser`

**`@mustard/design-tokens`**
- CSS 变量：`--m-paper / surface / surface-2 / ink / muted / faint / line / primary / primary-ink / primary-soft / accent / accent-soft / blush / warn / shadow-sm / shadow-md / shadow-lg`
- 子路径导出：`.`（barrel，**含 unocss，勿在运行时代码导入**）、`./theme`（纯函数：`applyTheme/resolveTheme/prefersDark/watchSystemTheme` + `ThemeMode/ResolvedTheme`）、`./tokens`、`./preset`、`./theme.css`
- UnoCSS：`presetMustard()`（颜色/圆角/阴影映射到上述变量 + `m-*` shortcuts）；`theme.css`（`:root`/`[data-theme="light"]`/`[data-theme="dark"]`/系统深色兜底）

**`@mustard/ui`**（当前导出，后续只增不改名）
- `MButton`（`variant: 'primary' | 'ghost'`）、`MSwitch`（`v-model`）
- `MIcon`（`name` + `size` + `strokeWidth`；图标见 `ICONS`）、`MChip`（`variant/removable`）、`MBadge`（`count/dot/max/variant`）、`MField`（`label/hint/inline`）、`MSelect`（`v-model` + `options: SelectOption[]`）、`MDialog`（`v-model` + `title/width`）、`MTabs`（`v-model` + `tabs: TabItem[]`）、`MStars`（`v-model` + `max/readonly`）、`MToastHost` + `useToast()`（`info/success/error`）

**`@mustard/core`**
- `chatStream(provider, model, messages, signal?)`：OpenAI 兼容**流式**，未配 Key 抛 `MISSING_API_KEY`
- `parseSseDelta(line)`、`buildChatBody(model, messages, stream?)`

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

---

## 跨会话注意事项（踩过的坑）
- 依赖版本用 `catalog:` 统一，**TypeScript 固定 `^5.9.3`**（TS 7 生态未跟上）。
- Astro 需要显式声明 `@unocss/reset`（`injectReset`）。
- 家目录 `~/node_modules/cookie@0.7.2` 会遮蔽工作区版本 → 根 `package.json` 已显式声明 `cookie: catalog:`，**不要删**。
- 细节与解决过程见 `docs/PROBLEMS.md`；Token 纪律见 `AGENTS.md`。
- **运行时代码不要从 `@mustard/design-tokens` barrel 导入**（会拖入 `unocss`/`oxc-parser` 导致 `wxt build` 失败）；用 `@mustard/design-tokens/theme` 或 `/tokens`。

## 下一个会话的启动清单
```bash
cd ~/self/mustard && git pull
pnpm install
pnpm lint && pnpm typecheck && pnpm build   # 开工前自检
```
然后阅读：`AGENTS.md` → `design/PLAN.md` → `docs/HANDOFF.md`（本节）。下一个里程碑：**M4 · 模型提供商与设置**。
