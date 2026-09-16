# Mustard 芥末 · 开发计划（Task Plan）

> 状态：**已确认**（决策见 §0 / §5；待开始编码）
> 关联文档：`DESIGN.md`（产品/交互/数据设计）、`prototype/index.html`（可交互原型）、`assets/icons/*`（图标资产）
> 目标产物：`chrome 扩展（Vue + Vite + TS）` + `Monorepo 仓库` + `Astro 宣传页（GitHub Pages）` + `中英文 README`

---

## 0. 约定与决策

| 项 | 决策 |
|---|---|
| 扩展技术栈 | **Vue 3 + Vite + TypeScript**（采用 **WXT**，Vite 内核） |
| 状态管理 | Pinia |
| 样式 | UnoCSS（`presetWind3`）+ 共享 design tokens |
| Monorepo | **pnpm workspace + Turborepo**；仓库名 **`mustard`** |
| 宣传页 | **Astro**（+ UnoCSS），静态导出，部署到 **GitHub Pages** |
| 分发 | **仅 GitHub 开源**，不提供 Chrome 官方商店下载；安装方式 = GitHub Releases 打包 zip / 源码「加载已解压的扩展程序」 |
| 离线词典（首版） | **只内置 ECDICT（MIT，裁剪常用词）**；其余词典按需下载 / 在线兜底 |
| 默认模型 | OpenCode Zen **使用占位配置**；未配置 Key 时提示用户去设置页配置，未配置期间自动降级为「词典 + 在线翻译」可用 |
| 语言 | 插件 UI 中文为主（预留 i18n）；README 中英双语；**宣传页中英双语（英文完整翻译，en 路由）**，zh 默认 |
| 许可 | **MIT**（自有代码）。内置词典数据保留原始许可并署名（ECDICT=MIT；CC-CEDICT/JMdict=CC BY-SA 需署名+相同方式共享；部分 FreeDict=GPL） |
| 链接策略 | 开发期间统一占位符 `__GITHUB_REPO__` / `__GITHUB_PAGES__`，集中在 `apps/landing/src/config/links.ts` 与 README 顶部，**开发完成后一次性替换为真实地址** |

---

## 1. 仓库结构（Monorepo，应拆尽拆）

```
mustard/
├─ apps/
│  ├─ extension/                 # Chrome 扩展（WXT + Vue3 + TS + Pinia）
│  └─ landing/                   # Astro 宣传页（GitHub Pages）
├─ packages/
│  ├─ ui/                        # Vue3 组件库（无业务）：Button/Switch/Select/Dialog/Tabs/Toast/Icon/Stars…
│  ├─ shared/                    # 类型、常量、语言表、消息协议、i18n keys、占位符
│  ├─ core/                      # 领域逻辑（无 UI、无 chrome API 依赖）
│  │   ├─ providers/             # OpenAI 兼容 Provider 抽象（OpenCode Zen 默认 + 自定义）
│  │   ├─ translation/           # 翻译编排：词典 → 在线 → AI 的分级链路
│  │   ├─ dictionary/            # 离线词典查询/索引（ECDICT 等）+ 在线兜底
│  │   ├─ vocab/                 # 生词本、掌握度（streak）、记词（听音默写）状态机
│  │   └─ session/               # 会话与历史
│  ├─ platform/                  # 浏览器平台适配：messaging、storage、IndexedDB、commands、contextMenus、captureVisibleTab、sidePanel
│  ├─ utils/                     # 通用工具：LRU 缓存、防抖、id、time、csv/json 导入导出、trie/查找
│  ├─ design-tokens/             # 颜色/圆角/阴影 token + UnoCSS preset（extension 与 landing 共用）
│  └─ config/                    # 共享配置：tsconfig / eslint / unocss / tsup（或 vite lib）
├─ design/                       # 设计资料（入库）
│  ├─ DESIGN.md
│  ├─ prototype/index.html       # 可交互原型（demo）
│  ├─ icons/                     # 图标资产（icon-*.png/svg/ico、ball-circle.svg、mascot.png）
│  └─ screenshots/               # 宣传页/README 用截图（导出图）
├─ .github/workflows/            # ci.yml（lint/typecheck/test）、release.yml（打包 zip）、pages.yml（落地页部署）
├─ README.md                     # 中文
├─ README.en.md                  # English
├─ LICENSE
├─ package.json / pnpm-workspace.yaml / turbo.json
```

拆分原则：**UI 在 `ui`，领域逻辑在 `core`，浏览器能力在 `platform`，纯工具在 `utils`，类型与文案键在 `shared`，主题在 `design-tokens`；`apps/*` 只做组装。**

---

## 2. 功能清单（宣传页/README 只写这些「已实现/将实现」的栏目）

1. **悬浮球**：右下角入口，hover 展开工具环（径向/纵向可切换），工具可配置，点击开侧边栏。
2. **侧边栏对话**：模型选择（按提供商分组）、附件上传（图片/PDF/TXT/Word/MD）、截图粘贴翻译、目标语言切换、流式输出。
3. **划词翻译**：选中文本浮出图标 → 翻译气泡（音标/词性/释义/例句）+ 发音 + 加入生词本。
4. **悬浮翻译**：悬停取词/取句，延迟显示译文。
5. **网页翻译**：整页双语对照（原文后追加译文节点，先 loading 后结果），可还原。
6. **截图翻译**：`⌘V` 粘贴截图 → 多模态模型翻译。
7. **生词本**：自动收录、发音、删除；**掌握度 = 连续答对 3 次**；**记词（听音默写）**：看词→默写→验证，写对自动下一词；导入/导出（JSON/CSV）。
8. **离线词典**：弹窗管理（ECDICT/WordNet/CC-CEDICT/JMdict/FreeDict 下载/启停/删除）+ 在线词典兜底（免 Key），查词顺序 本地→在线→AI。
9. **模型提供商**：默认 OpenCode Zen，支持自定义（baseUrl/apiKey/逐条添加模型+输入能力），**按模型能力门控附件**。
10. **会话历史**：新建（+）、切换、删除；标题取首条消息。
11. **目标语言**：默认简体中文，支持主流语种。
12. **主题**：芥末绿视觉体系（`design-tokens` 统一）。

---

## 3. 里程碑与任务拆分

> 每个任务给出「交付物 / 验收」。勾选即在编码阶段逐条推进。

### M0 · 仓库与工程基建
- [ ] `pnpm-workspace.yaml` + `turbo.json` + 根 `package.json`（scripts: dev/build/lint/typecheck/test/format）
- [ ] `packages/config`：共享 `tsconfig`、`eslint`（antfu 风格）、`unocss`、库构建配置
- [ ] CI：`.github/workflows/ci.yml`（lint + typecheck + test + 构建）
- [ ] `LICENSE`、`.gitignore`、`.editorconfig`、commit 规范（可选 commitlint）
- 验收：`pnpm i && pnpm lint && pnpm typecheck` 全绿；空包可 build。

### M1 · 设计资产入库
- [ ] 将 `DESIGN.md`、`prototype/index.html`、`icons/*` 迁入 `design/`
- [ ] 从原型导出宣传页/README 截图（悬浮球工具环、侧边栏、划词气泡、网页双语、生词本+记词、设置/词典）到 `design/screenshots/`
- 验收：`design/` 自洽可预览，截图齐全。

### M2 · 扩展骨架（MV3）
- [ ] `apps/extension` 初始化（WXT + Vue3 + TS + Pinia + UnoCSS + VueUse）
- [ ] entrypoints：`background`(SW)、`content`(Shadow DOM)、`sidepanel`、`options`
- [ ] manifest：permissions（storage/sidePanel/scripting/contextMenus/activeTab/tabs）、host_permissions、commands（Alt+T / Alt+L）
- [ ] `packages/platform`：类型安全 messaging、storage 封装、sidePanel.open、captureVisibleTab
- 验收：加载已解压扩展后，悬浮球出现、点击可打开侧边栏、消息收发通。

### M3 · UI 组件库 + 主题
- [ ] `packages/design-tokens` + UnoCSS preset（薄荷/奶油/墨绿/芥末绿/腮红粉；圆角/阴影）
- [ ] `packages/ui`：Button/Switch/Select/Dialog/Tabs/Toast/Icon/Stars/Badge/Chip/Field
- [ ] 深色模式钩子（跟随系统/浅/深）
- 验收：Storybook 或组件预览页可跑；扩展内按 token 呈现。

### M4 · 模型提供商与设置
- [ ] `core/providers`：OpenAI 兼容调用、流式(SSE)、错误处理、Provider/Model 类型与能力（text/image/file）
- [ ] 设置页：提供商列表（默认 OpenCode Zen 不可删）、添加/编辑（模型逐条 + 输入能力）、测试连接
- [ ] 设置项：目标语言、功能开关（网页/划词/悬浮）、悬浮延迟、悬浮球（启用/位置/展开方式/工具管理）、生词本自动收录、通用
- [ ] 附件门控（按模型能力禁用 📎/粘贴）
- 验收：配置 Key 后侧边栏可流式对话；切换纯文本模型后附件被禁用。

### M5 · 划词翻译 + 悬浮翻译 + 生词本
- [ ] 选区判定 → 浮出图标 → 翻译气泡（词典卡片：音标/词性/释义/例句/发音/加入生词本）
- [ ] 悬浮取词：延迟触发、取词/取句可配、tooltip
- [ ] `core/translation` 分级链路：**本地词典 → 在线词典 → AI**（单词）；句子直接 AI
- [ ] `core/vocab` + `utils`: WordEntry（含 `streak`）、去重、自动收录、LRU 缓存
- [ ] 生词本 UI：列表、发音、删除、搜索/筛选、导入导出
- 验收：无 AI Key 时单词查询可用；加入生词本联动悬浮球红点。

### M6 · 网页翻译 + 截图翻译
- [ ] 网页翻译：块级扫描、原元素后追加译文节点（loading→结果）、顶部进度条、还原、MutationObserver 增量
- [ ] 截图翻译：sidepanel 粘贴 `image/*` → 多模态翻译；可选快捷键截当前可见区
- 验收：整页双语可还原；粘贴截图返回译文。

### M7 · 会话历史 + 侧边栏完善
- [ ] `core/session`：会话 CRUD、标题、持久化（IndexedDB）
- [ ] 侧边栏：消息列表、Composer（自增高/附件/语言/模型/发送）、历史视图（新建+、切换、删除）
- 验收：+ 新建恢复初始态；点击历史载入；重开扩展后历史仍在。

### M8 · 离线词典
- [ ] `core/dictionary`：数据加载（懒加载/IndexedDB）、查询索引（trie/FST 或 sql.js）、词形归一
- [ ] 词典管理弹窗：ECDICT(内置)/WordNet/CC-CEDICT/JMdict/FreeDict 的下载/删除/启停 + 在线兜底开关
- [ ] 许可署名（设置/关于页）
- 验收：离线可查词；下载/删除/启停生效；关闭在线兜底进入纯离线。

### M9 · 记词（听音默写）
- [ ] 状态机：看词 → 默写 → 验证 →（正确自动下一词）；掌握度 streak，连续 3 次即「已掌握」
- [ ] 规则：优先未掌握词；全掌握则整轮复习但不计分；末尾提示、完成页仅在全部答对时出现
- [ ] 发音：Web Speech API 封装（后续可换词典音频）
- 验收：与原型一致（已用原型验证过的交互规则）。

### M10 · 打磨
- [ ] 翻译缓存（LRU + 可持久化）、性能（批量并发限流、虚拟列表）
- [ ] 快捷键、右键菜单、i18n（zh/en 文案抽取到 `shared/i18n`）
- [ ] 无障碍与暗色细节、错误态/空态
- 验收：Lighthouse/内存与交互回归通过。

### M11 · 宣传页（Astro）
- [ ] `apps/landing` 初始化（Astro + UnoCSS + `design-tokens`）
- [ ] 版式参考 `https://fluent.thinkstu.com/`，**只介绍本项目已有栏目**：
  1. Nav：Logo · 功能 · 使用 · 安装 · GitHub · 语言切换（zh 默认 / en）
  2. Hero：图标 + 「开源 Chrome 划词翻译插件」+ **Mustard 芥末** + 一句话简介 + 两个按钮（**安装（GitHub 安装指引）** / **查看源码（GitHub）**）+ 许可标签 + 大截图
  3. 功能区块（图文左右交替）：划词翻译 / 悬浮翻译 / 网页翻译 / 截图翻译 / 侧边栏 AI 对话 / 生词本与记词 / 离线词典 / 模型提供商
  4. 三步上手：01 安装 → 02 配置模型 → 03 使用
  5. 子功能卡片（小栏目）：目标语言 / 会话历史 / 单词发音 / 悬浮球工具自定义 / 主题
  6. 开源与贡献（仓库、许可、Issue/PR）
  7. 安装与使用（GitHub Releases / 源码加载指引）
  8. Footer
- [ ] 文案与 README 保持同源（先写 README 文案定稿，落地页复用）
- [ ] 截图使用 `design/screenshots/`
- 验收：`astro build` 通过，本地预览与参考站观感一致，仅含已实现栏目。

### M12 · 部署与文档
- [ ] `.github/workflows/pages.yml`：Astro build → GitHub Pages（`base` 适配 `<user>.github.io/<repo>`）
- [ ] `.github/workflows/release.yml`：`pnpm build` → 打包 `mustard-<version>.zip` 作为 Release 资产（供「安装」按钮）
- [ ] 安装指引文案：开发者模式「加载已解压的扩展程序」/ 使用 Release zip
- [ ] **README.md（中文）+ README.en.md（English）**：功能、用法、安装、配置模型、离线词典说明、许可、致谢（词典来源）
- [ ] **链接替换**：将 `__GITHUB_REPO__` / `__GITHUB_PAGES__` 全部替换为真实地址（落地页 `links.ts`、README、manifest 的 homepage 等）
- 验收：Pages 可访问；Release 有 zip；README 与落地页内容一致；无残留占位符。

---

## 4. 宣传页布局参考（FluentRead 风格 → 本项目映射）

| 参考站模块 | 本项目做法 |
|---|---|
| 顶部导航 + 语言切换 + GitHub | 同（仅 zh/en，链接指向 GitHub） |
| Hero：logo/标语/标题/简介/双按钮/许可/大截图 | 同；按钮 = 「安装（GitHub）」「查看源码（GitHub）」；许可标签 = 实际 LICENSE |
| 图文交替的功能区块（含 01/02/03 步骤） | 同，区塊用**本项目的 8 个功能** |
| 三卡片子功能网格 | 同，用**小栏目**（目标语言/会话历史/发音/工具自定义/主题） |
| 配置/服务说明 | 模型提供商 + 离线词典说明（含数据与隐私提示） |
| 开源与安装 CTA + Footer | 同（仅 GitHub，无商店） |

---

## 5. 已确认决策

| # | 决策 |
|---|------|
| 1 | 仓库名 **`mustard`**（占位符替换为实际 GitHub 地址，待仓库创建后填入） |
| 2 | 许可 **MIT**（第三方词典数据遵循其原始许可并署名） |
| 3 | 扩展用 **WXT**（Vite 内核） |
| 4 | 宣传页 **Astro + UnoCSS**；**中英双语，英文完整翻译** |
| 5 | 首版离线词典**只内置 ECDICT**（裁剪常用词），其余按需下载/在线兜底 |
| 6 | **仅 GitHub 分发**（源码加载 / Release zip），无商店 |
| 7 | OpenCode Zen 先用**占位配置**；用户首次使用 AI 相关功能时**提示配置 API Key**（未配置时降级为词典/在线翻译，不阻塞） |

### 由决策衍生的补充任务
- [ ] **首次引导**：未配置模型 Provider/Key 时，AI 功能入口显示引导（跳转设置页），并在设置页提供「OpenCode Zen 占位配置 + 填写 Key」流程。
- [ ] **许可与署名页**：设置/关于页列出内置词典来源与许可；仓库 `LICENSE`(MIT) + `NOTICE`/`THIRD-PARTY.md` 汇总第三方数据许可。
- [ ] 落地页 `en` 路由提供完整英文文案（与 zh 一一对应）。

## 6. 完成定义（DoD）

- 扩展：Chrome 加载可跑，M2–M10 功能与原型一致，lint/typecheck 通过。
- 仓库：Monorepo 结构清晰，共享包有 README 说明，CI 绿。
- 宣传页：GitHub Pages 可访问，仅含已实现栏目，中英双语。
- 文档：中英 README 与落地页一致，安装/用法/许可齐全，链接均为真实地址。
---

## 进度（Progress）

> 仓库位置：`~/self/mustard` · remote `git@github.com:daosrc/mustard.git`
> 环境：Node 24.5.0 / pnpm 11.5.2

| 里程碑 | 状态 | 备注 |
|---|---|---|
| M0 工程基建 | ✅ 完成 | pnpm workspace + Turborepo + `@mustard/config` + CI + LICENSE + `.editorconfig`/`.npmrc` |
| M1 设计资产入库 | 🟡 部分 | `design/` 已入库 DESIGN.md / PLAN.md / 原型 / 图标 / mascot；**截图待导出** |
| M2 扩展骨架 | ✅ 完成 | WXT 0.21 + Vue3 + TS + Pinia + UnoCSS；background / content(shadow) / sidepanel / options 四入口；manifest 权限、commands、side_panel 均生效；`pnpm build:ext` 通过 |
| M3 UI 组件库 + 主题 | ✅ 完成 | `design-tokens`（token + preset + shortcuts + 深浅色 + `applyTheme`）；`ui` 新增 Icon/Chip/Badge/Field/Select/Dialog/Tabs/Stars/Toast；extension 用 ui 重构 + 主题设置生效 |
| M4 模型提供商与设置 | ✅ 完成 | `core/providers`（流式 + 非流式 + 测试连接）；设置页（提供商 CRUD + 模型能力、翻译/悬浮球/生词本/外观）；sidepanel 流式对话 + 附件门控 |
| M5 划词/悬浮 + 生词本 | ⏳ 待开始 | `shared` 已定义 WordEntry/streak/DictResult；`utils` 已有 LRU/hash/vocab 导入导出 |
| M6 网页翻译 + 截图翻译 | ⏳ 待开始 | — |
| M7 会话历史 + 侧边栏 | ⏳ 待开始 | `platform` 已有 messaging/storage；Session 类型已定义 |
| M8 离线词典 | ⏳ 待开始 | `shared` 已定义词典清单与状态结构 |
| M9 记词（听音默写） | ⏳ 待开始 | 交互规则见 DESIGN 5.7（已在原型验证） |
| M10 打磨 | ⏳ 待开始 | — |
| M11 宣传页 | 🟡 部分 | Astro + UnoCSS 骨架，zh/en 双页面可构建；完整版式与文案待做 |
| M12 部署与文档 | 🟡 部分 | `pages.yml` / `release.yml` 已配置；中英 README 已写初版；链接已用真实地址 |

### 验证命令（当前全部通过）

```bash
pnpm install
pnpm lint        # 8 packages 全绿
pnpm typecheck   # 8 packages 全绿
pnpm build       # 扩展 446.87 kB + 落地页 2 页
```

### 开发期问题记录

见 `docs/PROBLEMS.md`（已记录：依赖版本锁定、`@unocss/reset` 缺失、家目录 `~/node_modules/cookie` 遮蔽解析）。
