# 问题与解决记录（PROBLEMS）

> 记录开发过程中遇到的每个问题：**现象 → 原因 → 解决**。新增条目追加到文件末尾（最新在下），保持每条 3~6 行。

## 模板

```
### YYYY-MM-DD · <一句话标题>
- 现象：
- 原因：
- 解决：
- 影响/备注：
```

---

### 2026-09-15 · 依赖版本过新导致潜在不兼容
- 现象：`npm view` 显示 TypeScript 最新为 `7.0.2`（Go 版编译器）、ESLint `10.x`、Vite `8.x`、Astro `7.x`，生态插件跟进程度不一。
- 原因：环境时间点较新，`latest` 未必与 `@antfu/eslint-config`、`vue-tsc`、WXT 全部对齐。
- 解决：统一用 **pnpm catalog 锁版本**（`pnpm-workspace.yaml`）；TypeScript 固定 **`^5.9.3`**（`vue-tsc` 要求 `>=5.0`）；WXT 0.21 允许 `vite ^6/^7/^8`，不额外直装 Vite。
- 影响/备注：所有子包/应用通过 `catalog:` 引用，避免版本漂移。

### 2026-09-16 · Astro 构建报 `@unocss/reset/tailwind.css` 无法解析
- 现象：`astro build` 失败：`Rolldown failed to resolve import "@unocss/reset/tailwind.css" from "uno-astro"`。
- 原因：`@unocss/astro` 开启了 `injectReset: true`，需要 `@unocss/reset`，但它只是 unocss 的传递依赖，pnpm 隔离模式下 app 拿不到。
- 解决：在 `apps/landing` 显式声明 `"@unocss/reset": "catalog:"` 并重装。
- 影响/备注：凡是使用 `injectReset` 的 app 都需显式声明该依赖。

### 2026-09-16 · Astro 构建报 `cookie` 是 CommonJS、`parseCookie` 命名导出缺失
- 现象：`astro build` 在静态路由生成阶段报 `Named export 'parseCookie' not found. The requested module 'cookie' is a CommonJS module`（Astro 7.3.2 依赖 cookie@2.0.1，而 2.x 实为 ESM）。
- 原因：`import.meta.resolve('cookie')` 解析到了 **家目录残留包** `~/node_modules/cookie@0.7.2`（CJS）。Node 解析从 app 目录向上查找时，先命中了 `~/node_modules`，把工作区内的 cookie@2.0.1 遮蔽了。
- 解决：在**根** `package.json` 显式声明 `"cookie": "catalog:"`，使 `mustard/node_modules/cookie` 先于 `~/node_modules` 被解析到。
- 影响/备注：家目录若存在 `~/node_modules`（历史全局安装残留）会污染所有子项目的依赖解析；排查同类问题时先用 `import.meta.resolve()` 确认实际解析路径。

### 2026-09-16 · 会话期间频繁触发 `tpm rate limit reached`（工作流问题，非代码缺陷）
- 现象：编码过程中模型侧频繁返回 `tpm rate limit reached`（tokens per minute 限流），长会话容易被中断。
- 原因：单次会话累计上下文与生成量较大（仓库里有 40KB+ 的原型 HTML、700KB 图标、以及大量工具输出），单位时间 token 吞吐超过服务商 TPM 配额。
- 解决（已采取）：
  1. 新增根目录 `AGENTS.md`，明确**上下文与 Token 纪律**：不整读 `design/prototype/index.html`、不读二进制/位图内嵌 SVG；先 `grep` 定位再按行范围读；命令输出用 `tail` 精简。
  2. 采用**里程碑小步提交**（每完成一个里程碑就 commit），即使被限流打断也不丢进度。
  3. 长任务拆成多个会话按里程碑推进（M3 起）。
- 影响/备注：**限流不影响代码正确性**，只影响单次会话能推进的量与连续操作能力。若被中断，以 `pnpm lint && pnpm typecheck && pnpm build` 复核当前状态即可；必要时也可提升服务商 TPM 档位。

### 2026-09-16 · 运行时 import `@mustard/design-tokens` 把 `unocss`/`oxc-parser` 拖进扩展产物，`wxt build` 失败
- 现象：M3 让 `apps/extension` 在运行时代码里 `import { applyTheme } from '@mustard/design-tokens'`（用于深色模式）后，`pnpm build:ext` 报 `Rolldown failed to resolve import "@oxc-parser/binding-wasm32-wasi" from oxc-parser/src-js/wasm.js`，构建失败。
- 原因：`packages/design-tokens/src/index.ts` 通过 `export *` 同时导出了 `preset.ts`，而 `preset.ts` 顶层 `import { presetWind3 } from 'unocss'`。`unocss` 入口会**立即** `import '@unocss/transformer-attributify-jsx'`，后者依赖 `oxc-parser`；包未声明 `sideEffects`，tree-shaking 不会移除，于是构建器试图把 oxc-parser 打进产物，触发 wasm 兜底解析失败。（此前仅 `uno.config.ts` 在 Node 侧引 `presetMustard`，不进产物，所以没暴露。）
- 解决：给 `@mustard/design-tokens` 增加子路径导出 `./theme`、`./tokens`、`./preset`；运行时代码改为从 `@mustard/design-tokens/theme` 导入（只含纯函数），不再经过 barrel。
- 影响/备注：**运行时代码不要从带 UnoCSS 的 barrel 导入**；需要 token/主题纯函数时走 `@mustard/design-tokens/theme`、`/tokens`，`presetMustard` 仅限构建配置（`uno.config.ts`）使用。

### 2026-09-16 · `pnpm install` 报 `chokidar@4.0.3` 信任降级，无法更新 lockfile
- 现象：M4 给 `apps/extension` 增加 `@mustard/core` 依赖后，`pnpm install` 失败：`ERR_PNPM_TRUST_DOWNGRADE ... chokidar@4.0.3 High-risk trust downgrade`。此前 lockfile 未变时 install 能通过（无需校验），一旦要改写 lockfile 就会重新校验并命中该条目。
- 原因：根 `pnpm-workspace.yaml` 设了 `trustPolicy: no-downgrade`；`chokidar@4.0.3`（来自 landing 的 devDependency `@astrojs/check`）在 registry 的信任等级较 lockfile 记录下降，被策略拒绝。
- 解决：在 `pnpm-workspace.yaml` 增加 `trustPolicyExclude: ['chokidar@4.0.3']`（仅精确排除该版本），随后 `pnpm install` 正常；lockfile 仅新增 `@mustard/core` 的 importer 条目。
- 影响/备注：该依赖只用于 `astro check`（dev 工具），不影响扩展产物；若后续 `@astrojs/check` 升级到 chokidar@5，可移除该豁免。信任策略的其余部分保持不变。

### 2026-09-16 · CI `pnpm install` 报 `ERR_PNPM_IGNORED_BUILDS`（esbuild 构建脚本被拦截）
- 现象：GitHub Actions 的 `pnpm install --frozen-lockfile` 在 CI 环境（`CI=true`）以 `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.2` 失败退出 1；本地 `pnpm install` 只告警、退出 0。
- 原因：pnpm 10.3+ 的 `strictDepBuilds` 默认 `true`，CI 下未被批准的依赖构建脚本会变成硬错误。**pnpm 11 已移除 `onlyBuiltDependencies`，改用 `allowBuilds` 映射**，所以先前写的 `onlyBuiltDependencies: [esbuild]` 完全不生效。
- 解决：在 `pnpm-workspace.yaml` 用 `allowBuilds: { esbuild: true }` 显式批准（保留 `strictDepBuilds` 默认的严格策略）。用临时 worktree + `CI=true pnpm install --frozen-lockfile` 复现并验证修复（install/lint/typecheck/build 全绿）。
- 影响/备注：esbuild 的平台二进制其实由 optionalDependencies 提供，构建脚本被拦截也能构建；但显式 `allowBuilds` 更干净、可复现，且避免 CI 因严格策略中断。

### 2026-09-16 · GitHub Actions `actions/*@v4` 触发 Node 20 弃用告警
- 现象：CI 输出 `Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4, pnpm/action-setup@v4`。
- 原因：这些 action 的 v4 运行时仍是 Node 20；GitHub 已开始强制其在 Node 24 上运行并给出弃用告警。
- 解决：三个 workflow 统一升级到 Node 24 运行时版本 —— `actions/checkout@v5`、`actions/setup-node@v5`、`pnpm/action-setup@v6`（`node-version` 仍用 22）。
- 影响/备注：仅运行时升级，`with` 参数（`version`/`cache: pnpm`）不变；不再出现 Node 20 弃用告警。

### 2026-09-16 · `Deploy landing page` 报 `Get Pages site failed`（仓库未启用 Pages）
- 现象：pages.yml 的 build 阶段 `actions/configure-pages@v5` 失败：`HttpError: Not Found … get-a-apiname-pages-site`，提示仓库未启用 Pages 或未配置为 GitHub Actions；同一步还带 `actions/configure-pages@v5` 的 Node 20 弃用告警。
- 原因：`GET /repos/{owner}/{repo}/pages` 返回 404，说明该仓库**尚未开启 GitHub Pages**（不是 source 选错，source 错误会返回 200）。configure-pages 的 `enablement` 参数虽然能自动开启，但其 action.yml 明确要求**必须用非 `GITHUB_TOKEN` 的 token**（PAT 的 `repo`/Pages write，或 GitHub App 的 `administration:write`+`pages:write`），默认 `github.token` 无法开启。
- 解决（代码侧）：三个 Pages 相关 action 升到 Node 24 运行时版本 —— `actions/configure-pages@v6`、`actions/upload-pages-artifact@v5`、`actions/deploy-pages@v5`；release.yml 的 `actions/upload-artifact@v7`、`softprops/action-gh-release@v3` 一并升级。
- 解决（一次性手动，必须由仓库管理员执行）：**Settings → Pages → Build and deployment → Source 选 `GitHub Actions`**。完成后再重跑 pages.yml 即可部署。若想免手动，需新建 PAT secret 并把 `enablement: true` + `token: ${{ secrets.PAGES_TOKEN }}` 传给 configure-pages。
- 影响/备注：`astro.config.mjs` 已设 `site: https://daosrc.github.io` + `base: /mustard`，与仓库名一致，无需改动。

### 2026-09-16 · M8 离线词典缺少真实数据源
- 现象：M8 要求内置 ECDICT（裁剪常用 3–6 万词）并支持下载 WordNet/CC-CEDICT/JMdict/FreeDict；但真实词典数据（ECDICT 完整 76 万条 CSV、Wiktionary 预解析包等）体积达数十–数百 MB，需按词频裁剪、压缩、打包，无法在开发会话内产出并直接内置进仓库。
- 原因：属**数据资产获取/预处理**问题，非代码问题；仓库不宜直接提交大体积词典二进制。
- 解决（当前）：把机制做完整，数据留接口 —— `core/dictionary/local`（`LocalEntry`、`lemmaCandidates` 规则词形还原、`createLocalLookup` 查询）；`translateWord` 链路改为**本地→在线→AI**；`lib/dictionaryStore` 用 IndexedDB 存取可下载词典；设置页新增「词典」管理（启用/删除/在线兜底/许可署名）。内置 `ECDICT_SAMPLE`（约 45 个常用词）保证离线查词链可用；可下载词典 `DICT_SOURCES` 暂为空，下载按钮禁用并提示「下载源待补充」。
- 影响/备注：离线查词当前只覆盖内置样例，未达全量 ECDICT；补齐时只需：① 用裁剪后的数据集替换/扩充 `ECDICT_SAMPLE`（或作为资源懒加载）；② 填 `DICT_SOURCES` 的 URL（指向预处理的 JSON/gzip），链路与 UI 无需改动。词形还原为规则版，M10 可换 ECDICT `exchange/lemma`。

### 2026-09-16 · 离线词典改为「首次使用时下载」（不再打包）
- 需求：词典数据不打包进扩展，改为首次使用时下载。
- 调研：ECDICT 完整 `ecdict.csv` 约 66 MB（MIT），**jsDelivr 拒绝 >20MB**（403 `File size exceeded the configured limit of 20 MB`），`raw.githubusercontent.com` 在开发环境不可达；`ecdict.mini.csv`（4KB，MIT）可直取；Wordset 词典按字母分文件（`data/<letter>.json`，a=3.8MB、s=6.9MB，均 <20MB）可经 jsDelivr 直取（CC BY-SA 4.0 + WordNet）。
- 解决：重写 `apps/extension/lib/dictionaryStore`：单一文件包（ecdict）首次查词自动下载并按首字母分片存入 IndexedDB；按字母包（wordset）**首次用到某字母时下载该字母**；新增 `GET_DICT_STATUS`/`DICT_INSTALL`/`DICT_REMOVE` 消息，设置页显示进度/删除；下载完成后回写 `settings.dictionaries[id].installed`。移除内置 `ECDICT_SAMPLE`（不再打包），`lemmaCandidates` 修复了双写辅音（running→run）。
- 影响/备注：离线覆盖 = Wordset 英英（较全）+ ECDICT 小样例（英汉/MIT）；完整 ECDICT 与中日等多语数据源待补，补时只需在 `DICTIONARIES` 填 `format`/`url`（或在 store 加 per-letter 源），链路与 UI 无需改。已用 Node + esbuild 对真实源跑通解析/查询测试。

### 2026-09-16 · Chrome 152 无法用 `--load-extension` 加载未打包扩展（改用「手动加载 + CDP」做 E2E）
- 现象：以 `--load-extension=apps/extension/.output/chrome-mv3` 启动 Chrome 152（`--headless=new` 或 headed，附加 `--enable-unsafe-extension-debugging`、`--disable-features=DisableLoadExtensionCommandLineSwitch`），CDP `http://localhost:9222/json` 目标列表始终没有本扩展的 service worker，扩展未加载。
- 原因：新版 Chrome 收紧了命令行加载未打包扩展的能力（`--load-extension` 受限），正常途径是在 `chrome://extensions` 手动开启开发者模式再「加载已解压的扩展程序」。
- 解决：**手动加载 + CDP 自动化**。用 `--remote-debugging-port=9222 --user-data-dir=<临时profile>` 启动 Chrome，人工在 `chrome://extensions` 加载 `chrome-mv3`；随后用 Node（`global WebSocket`）连 CDP，`Target.createTarget/attachToTarget` 打开 `options.html`/`sidepanel.html`/本地测试页，`Runtime.evaluate` 注入断言。扩展 id 从临时 profile 的 `Preferences`（`extensions.commands` 含 `open-sidebar`/`toggle-page-translate`）读出；注意**普通网页主世界没有 `chrome.runtime`**，改设置的调用需在扩展页上下文执行。
- 结果：见 HANDOFF「E2E 测试（真实扩展）」——23 条断言全部 PASS（含词典首次下载→离线查询、网页翻译浮条、悬浮 tooltip、划词图标、主题、i18n、生词本/会话 CRUD、content shadow host）。
- 备注：**手动验证清单**（仍在）：侧边栏流式对话（需配置 Key）、截图粘贴翻译、记词完整流程、词典弹窗下载进度条视觉、Provider 增删改与测试连接对话。

### 2026-09-16 · OpenCode Zen：预设模型名过期；免费模型不可用于扩展，付费模型需绑定付款
- 现象：用 API Key 调 `POST https://opencode.ai/zen/v1/chat/completions`：预设里的 `claude-sonnet-4.5` 报 `Model ... is not supported`（模型名过期）；改成真实 ID 后付费模型报 `No payment method. Add a payment method .../billing`；免费模型 `*-free` 报 `OpenCode's free tier can only be used in OpenCode`，`muse-spark-*-contributor-free` 报 `not available in your country`。
- 原因：① `OPENCODE_ZEN_PRESET` 的模型 ID 是占位/过期，真实列表应以 `GET /models` 为准（当前含 `deepseek-v4-flash`、`gemini-3.1-pro`、`claude-sonnet-5`、`gpt-5.x` 等）；② OpenCode Zen 免费额度仅限其自家客户端，第三方（含本扩展）需用付费模型并先绑定付款方式。
- 解决：把预设改为**真实模型 ID**（`deepseek-v4-flash` 文本、`gemini-3.1-pro` 多模态）；`getSettings` 对内置提供商**补齐预设模型**、并在 `activeModel` 失效时回退默认，避免旧存储里的占位名导致 `MODEL_NOT_FOUND`。AI 端到端测试必须用账号可用的模型（绑定付款 / 换其他 OpenAI 兼容服务）。
- 影响/备注：扩展本地功能（划词/词典/生词本等）不受影响；AI 相关（对话流式、句子/网页翻译、截图翻译）需可用模型。测试用 Key 请勿写入仓库，测完建议轮换。

### 2026-09-16 · 全新 profile 下 `getSettings` 抛错，background 无法响应 `GET_SETTINGS`
- 现象：CDP E2E 在全新 profile 上：`GET_SETTINGS` 无响应（返回 undefined），content 悬浮球渲染但工具数为 0，options/sidepanel 读设置失败。
- 原因：`getSettings` 里 `activeModel: activeModelValid ? stored!.activeModel! : DEFAULT` —— 无存储时 `stored` 为 `undefined`，而 `activeModelValid` 因回退默认值被判定为 `true`，于是访问 `stored!.activeModel` 抛 `TypeError`，整个消息处理器失败。
- 解决：改用回退后的局部变量 `activeModelName = stored?.activeModel ?? DEFAULT_SETTINGS.activeModel` 参与比较与返回，不再解引用 `stored!`。
- 备注：由真实扩展的 CDP E2E 发现（单元测试不易覆盖）；修复后全新 profile 正常。

### 2026-09-16 · 持久翻译缓存命中旧结果，划词未按目标语言（英译中）
- 现象：把「目标非英文时优先 AI」改好后，划词 `will` 仍返回离线英英（`source=local:wordset`），没走 AI。
- 原因：`lib/translationCache`（IndexedDB）缓存 key 未随翻译链路/词典策略变化，旧版本写入的 `will→wordset` 被命中并直接返回（且 key 不含模型与回退信息）。
- 解决：缓存 key 加版本号（`translate-cache-v2`），策略变更即整体失效；同时 AI 单词查询失败时按**同提供商其他文本模型**依次回退（`aiFallbacks`），并捕获 AI 异常不阻断。
- 备注：今后调整翻译链路/词典策略时需递增该版本号；验证：`will`(中)→AI 中文、`will`(英)→本地英英、`defenestration`/生僻词→AI。

### 2026-09-16 · 网页翻译段落重复/遗漏 + 译文样式 + AI 角色
- 现象：网页翻译提示段数虚高（如 869），实际大段落少；译文重复追加；译文与原文样式无区别；AI 对话暴露模型/公司（"developed by NVIDIA research team"）。
- 原因：① `pageTranslator` 未去重、`total` 跨 MutationObserver 累加、未纳入 `div` 叶子块；② 译文节点样式写在 `content.css`（Shadow DOM 专用），页面上不生效；③ 对话未加系统提示，模型自由发挥。
- 解决：① `WeakSet` + 即时 `MARK` 去重、`total` 改为唯一计数、纳入 `div` 叶子块、跳过已翻译节点；② 由 content script 向页面 `head` 注入 `.mustard-translation` 样式（带明显左边框/底色）；③ 新增 `CHAT_SYSTEM_PROMPT`（限定翻译/语言助手、简洁、不透露模型/供应商/实现），对话与流式均前置；翻译 prompt 强调「只输出译文，不要多余内容」。
- 备注：另为句子/网页翻译与 CHAT 增加**同提供商多模型回退**，缓解免费模型偶发 429 导致整段漏译。**当前 OpenRouter 免费模型集体 429**（共享池限流），页面 AI 验证需重试或为账号充值/换付费模型。

### 2026-09-18 · 词典安装/删除/启停后仍命中旧翻译缓存
- 现象：新增英汉词典并安装成功后，查 `will` 仍返回旧的英英结果（`local:wordset`）。
- 原因：持久翻译缓存（IndexedDB）key 未随词典配置变化，旧结果（`dictionaryOnly` 路径）被直接命中，绕过了新词典。
- 解决：词典**安装/删除**及 `UPDATE_SETTINGS.dictionaries` 变化时调用 `clearCached()` 清空缓存。
- 备注：凡是影响翻译来源/结果的配置变更，都应清理翻译缓存。

### 2026-09-18 · 默认英汉词典数据源与许可
- 现象：默认离线词典为英英（Wordset），英译中需 AI，用户要求内置英译中。
- 调研：ECDICT 完整 `ecdict.csv`（MIT）约 66 MB，jsDelivr 拒绝 >20MB；`raw.githubusercontent.com` 在本环境不可达。`mahavivo/open-ecdict` 的 `现代英汉词典.txt`（2.8 MB，jsDelivr 可达，38257 行，含常见词，格式 `word ⇒ /音标/ 词性 释义`）可作为默认英汉源。
- 解决：新增 `ecdict-zh` 词典包（format `open-ecdict`，解析并合并同词多行），置于词典列表首位、默认启用，优先英译中；AI 未命中时回退到它。
- 备注：**该数据源自《现代英汉词典》，许可未明确**（见 THIRD-PARTY.md）；对外正式分发前应核实许可或替换为 MIT 的 ECDICT 全量数据（自建 CDN/Release 资产）。

### 2026-09-20 · 网页翻译「一闪而过」+ 顶部段数不对（多数英文站点）
- 现象：在多数英文站点开启网页翻译后，译文/样式短暂出现随即消失；顶部提示段数明显偏小（如 84 段只显示「翻译完成 · 7 段」）。
- 原因：每个段落单独发一次 AI 请求（长文可达数百次），触发供应商限流（429）后 `translateBlock` 失败即 `node.remove()`，于是「骨架出现→移除」造成闪一下就没；`total` 计的是排队段数、`ok` 计成功数，失败段既不重试也不提示，二者差异让段数看着不对。
- 解决：① 新增 `TRANSLATE_BLOCKS` 批量接口 + core `translateBlocks`：一次请求翻译多段（JSON 数组进出），数量不匹配时二分拆小重试，最终才逐条回退，请求数降一个量级；② `pageTranslator` 改为**拿到译文才插入节点**（去掉骨架，杜绝闪烁），批次间加 300ms 间隔、失败重试 1 次；③ 顶部条增加失败统计，完成时显示「翻译完成 · ok/total（部分失败）」。
- 备注：实测 skyandtelescope 长文 84/84 全部成功且不再消失，Wikipedia 241 段逐步翻译、还原原文可用。若供应商仍限流，仅影响速度与「部分失败」比例，不会再出现内容消失。

### 2026-09-20 · 网页翻译请求数规则（整页优先、失败才拆）
- 目标：整页尽量 1~2 次请求翻完，只有失败的位置才单独重试，避免逐段请求。
- 规则：content 侧每次从队列取出**最多 80 段 / 10000 字符**组成一个批次（正常文章即整页），交给 core `translateBlocks`；core 先整批发一次（JSON 数组进出），若返回数组长度不匹配或请求失败，则**二分拆小**重试，最终只有长度 1 时回退单条。429 会设置 4s 全局冷却再重试；`MISSING_API_KEY`/401/403/404 视为致命错误，直接放弃该分支不再拆。
- 另：`isCandidate` 跳过 `nav/aside/footer/header/[role=navigation]` 等区域，避免把整站 UI 也翻译（Wikipedia 段落数从 1388 降到 ~170）。
- 备注：一次请求受「模型上下文 + 最大输出」双重限制，超长页面必然需要拆分——这是硬约束，不是实现缺陷。实测：演示页 1 次、skyandtelescope（84 段）2 次、Wikipedia 长条目 2~4 次。

### 2026-09-20 · 网页翻译：窄容器译文竖排 / 混入 CSS / 落地页图标与标语
- 现象：表格等窄容器里，短译文被塞到原文右侧压成一列竖排；Wikipedia 的 `navbox-styles`/参考文献 `<li>` 把内联 `<style>` 的 CSS 当成原文翻译，译文里出现大段 CSS；宣传页 hero 图标被 `w-20 h-20` 压扁、且用了 32px 的 `favicon.png` 放大发虚。
- 原因：① 短文本一律行内追加并 `nowrap`，没有判断同行是否放得下；② 叶子块判定只看 `BLOCK_SELECTOR` 子元素，`<style>` 不在其中，于是含 `<style>` 的块被当作正文；③ hero 用的 `mascot.png` 是 400×739 竖图，塞进正方形被拉伸；导航图标用 32px 位图。
- 解决：① `insertTranslation` 追加后实测 `getBoundingClientRect`，**换行或右侧溢出就改为在原文下方整行显示**（表格单元格内追加到单元格内，避免被移出表格）；② `isCandidate` 跳过含 `style/script/template/link` 子节点的块；③ hero 与导航改用 `design/icons/icon.svg`（256×256，矢量包装、高清），并删掉无用的 `mascot.png`/`ball-256.png`/`icon-128.png`；④ hero 标题后加主题色标语「流畅阅读 / Read fluently」，带 `margin-left`。
- 备注：实测 Wikipedia 信息框「Main ingredients」译文正确落到原文下方；整页 123 段、0 处 CSS 泄漏。

### 2026-09-20 · 对话框单词翻译出两条消息 / 网页翻译偶发卡住 / 导航侧栏未翻译
- 现象：侧边栏发单词（如 `condiment`）时先出现词典卡片、再出现一条 AI 消息（共两条）；网页翻译偶尔长时间停在某段不再前进；导航/侧边栏/标题等区域没有被翻译。
- 原因：① `sendMessage` 对单词先 push 一条词典消息、再 push 一条流式 AI 消息；② `chatOnce` 未设超时，供应商挂起时页面翻译的批次请求永不返回，`busy` 一直为 true，队列卡死；③ 上一版为降低段落数加了 `nav/aside/footer/header` 跳过规则，把导航/侧栏也排除了。
- 解决：① 单词只 push 一条助手消息，先放词典卡片文本，AI 流式内容用 `\n\n` 追加到同一条（`compose()`），失败时错误也追加在同一条；② `chatOnce` 默认加 `AbortSignal.timeout(60s)`，批量请求 `requestBatch` 另加 45s 超时，超时按普通失败走重试/二分拆分；③ 移除 `nav/aside/footer/header` 跳过规则，导航/侧栏/标题恢复翻译（保留含 `style/script` 块的跳过）。
- 备注：Wikipedia 长条目含导航后约 1300 段，会分多次请求、耗时较长但持续前进（实测 380→700 稳步增长）；若希望更快可重新加回区域跳过规则。

### 2026-09-20 · 侧边栏发送图片时模型收不到图片（附带的附件被丢弃）
- 现象：侧边栏附带截图后提问，模型答非所问/礼貌拒绝，像是没看到图片。
- 原因：`sendMessage` 组装 `history` 时只映射了 `{id, role, content, createdAt}`，把 `attachments`（图片 dataUrl）丢掉了，`buildChatBody → toContentParts` 自然拿不到图片。
- 解决：`history` 映射时带上 `attachments`。验证：附带芥末信息框截图 + 「翻译图片中的文字」，模型正确输出「菜肴 / 调味品 / 地区或州 / 全球分布 / 主要成分 / 芥末籽、水、醋、盐」。
- 备注：附件 dataUrl 会随多轮历史重复发送，长会话下请求体会变大；后续可考虑只在最近若干轮携带图片。

### 2026-09-21 · 离线词典开关点不动 / 下载按钮状态不一致 / 非中文目标语言仍出中文
- 现象：设置页「管理离线词典」里开关无论开或关都点不动；下载按钮有的能点有的点了没反应（CC-CEDICT/JMdict/FreeDict 永远灰着）；把目标语言切成「日」后，划词结果仍然是中文释义。
- 原因：① 开关的 `model-value` 读的是 `GET_DICT_STATUS` 的一次性快照 `dictStatuses`，而不是实时的 `store.settings.dictionaries`，点完只写了 settings、快照没刷新，所以开关永远弹回原位；② CC-CEDICT/JMdict/FreeDict 在 `DICTIONARIES` 里根本没有 `format/url`（占位条目），`hasSource()` 为 false → 按钮 disabled，却仍渲染成可点的样子；③ `translateWord` 的 `localFallback` **不按目标语言筛选**，目标为「日」时本地词典（英→中）虽然被 `local` 跳过，却又从 `localFallback` 里命中并返回中文；在线词典（dictionaryapi.dev）本身是英英，也在非英文目标时被当成兜底。
- 解决：① `dictStatusOf()` 的 `enabled` 改读实时 settings，`installed/progress/error` 仍取后台状态；`toggleDict` 后刷新一次状态；② 新增 `@mustard/shared` 的 `isDictAvailable()`/`AVAILABLE_DICTS`/`hasOfflineDictFor()`：无数据源的条目只显示「暂不支持」标签，不渲染开关与下载按钮，统计也只在可用词典里算（已安装 x/3）；③ 删除 `localFallback` 选项，在线词典仅在目标为英文时使用，结果语言不再可能与目标语言不符；④ 首次使用（一个词典都没装）后台自动下载并启用英汉词典；⑤ 目标语言没有离线词典时，设置页与划词/悬浮的空结果处给出「请配置模型（AI）」提示。
- 备注：实测 `hello` 目标 ja → 空结果（不再出中文）；目标 en → Wordset 英英；目标 zh-CN → 现代英汉。离线词典目前只覆盖 英→中、英→英，日/韩/法/德等语种只能走 AI——若要补离线数据，需要选定数据源（CC-CEDICT / JMdict / FreeDict）并新增解析器，且注意其 CC BY-SA / EDRDG / GPL 许可。

### 2026-09-21 · 未下载的词典也显示开关 / 下载后开关写回 installed=false
- 现象：管理离线词典里，未下载的词典（ECDICT/Wordset）也带一个开关，看着像「已启用却无效」；下载完成后点开关，会把该词典的 `installed` 覆盖回 false（下次打开又变回「下载」按钮）。
- 原因：① 开关与下载按钮同时渲染，未区分「已安装」状态；② `toggleDict` 用 `{ ...dictState(id), enabled }` 整对象覆盖，而设置页的 `store.settings` 是下载前的快照（`installed:false`），把后台刚写好的 `installed:true` 覆盖掉了。
- 解决：① 未下载只渲染「下载」按钮，下载完成后才出现开关 + 删除；② `toggleDict`/`downloadDict` 先 `await store.load()` 拉最新 settings 再 patch，避免陈旧快照覆盖；③ 开关改动会触发 `UPDATE_SETTINGS` 里的 `clearCached()`，翻译缓存同步失效，开关即时生效。
- 备注：实测新装状态只有英汉词典有开关；点 ECDICT「下载」后开关出现且为开；关掉后 `{enabled:false, installed:true}`，installed 不再被覆盖。

### 2026-09-21 · ECDICT 是假词典 / 三个占位词典无法离线 / 新增 gzip+XML 解析
- 现象：ECDICT 英汉（MIT）开启后查不到任何词；CC-CEDICT / JMdict / FreeDict 永远是「暂不支持」，无法离线使用。
- 原因：① ECDICT 指向的是 `ecdict.mini.csv`，实测只有 **53 行**、内容是 `no fonts installed`、`Why do you dislike the medicine so much` 这类脏数据，根本不是词典；② 后三条在清单里只有名字、没有 `format/url`，是占位条目。
- 解决：① 删除 ECDICT 占位条目；② 为三条接上真实数据源并新增解析器：
  - CC-CEDICT（MDBG 分发，gzip 文本 4MB）→ `parseCedictTxt`，繁简都建索引；
  - JMdict（EDRDG，gzip XML 10MB）→ `parseJmdictXml`，按行扫描 `<entry>/<keb>/<reb>/<gloss>`，不构建 DOM；
  - FreeDict（jsDelivr 上的 TEI，无需 xz）→ `parseFreedictTei`，只取 `<cit type="trans">` 内的 `<quote>`；「多语种」拆成英→法/葡/阿三条具体词对。
  ③ 下载统一走 `fetchText(url, gzip)`，用浏览器原生 `DecompressionStream('gzip')` 解压；④ 非拉丁词条按码点分 64 桶存储（原来全挤在 `_` 分片，中文/日文词典会变成单个上万条的巨片）；⑤ 新增 `sourceLang` + 脚本粗筛，避免用中文词典查英文单词、也避免误触发下载；⑥ `getSettings` 只保留当前清单里的词典 id，清掉历史遗留键。
- 备注：实测 `芥末→en` 命中 CC-CEDICT（mustard；wasabi）、`日本語→en` 命中 JMdict（Japanese (language)）、`abandon→fr` 命中 FreeDict；三条安装耗时 3.3s / 3.9s / 1.8s。注意旧用户存储里这三条是 `enabled:false`（占位时期写入），需手动开启开关。

### 2026-09-21 · 弹窗不居中 / 记词弹框顶到顶部 / 测试连接无反馈 等五项
- 现象：① 生词本的「记词」弹框贴侧边栏顶部、没有遮罩，压在词表上；② 生词本默认自动收录；③ 没配 AI 也能开网页翻译，然后什么都不翻；④ 新增服务商时名称被预填成 `New provider`；⑤ 点「测试连接」看不到成功/失败。
- 原因：① `MDialog` 的**非 contained 分支只有 `position:fixed; inset:0`**——居中、遮罩、`z-index` 全写在 `.is-contained` 里，所以侧边栏里未传 `contained` 的弹框（QuizDialog）直接贴在左上角；② `DEFAULT_SETTINGS.vocab.autoAdd` 是 true；③ `startPageTranslate` 不看 AI 是否可用；④ `addProvider` 里硬编码了 `name: 'New provider'`；⑤ 结果只走 toast，位置在页面底部居中，弹窗打开时容易被忽略。
- 解决：① 把居中/遮罩/`z-index` 提到 `.overlay` 基类，`.is-contained` 只保留 `position:absolute`；② `autoAdd` 默认改 false，并同步 README / 落地页 / `vocab.empty` 文案；③ `pageState` 增加 `notice`，`startPageTranslate` 先检查 `provider.apiKey + model`，没有就只显示顶部提示条（「网页翻译需要 AI 模型…」）且**不发起任何翻译**；AI 配好后 settings 变更会自动补开始；④ 名称留空只留 placeholder；⑤ 测试结果同时内联显示在按钮左侧（成功绿 / 失败红），toast 保留。
- 备注：实测选项页弹框 `display:flex` + 遮罩 + 垂直居中；侧边栏记词弹框 420×760 内居中（20/380/20）；无 AI 时开启网页翻译 → 提示条出现且 `.mustard-translation` 数量为 0；autoAdd=false 时翻译单词词表数量不变（7→7）。

### 2026-09-21 · 网页翻译太慢：批次切分与重试放大
- 现象：维基条目（1300+ 段）整页翻译要等很久，侧边栏/锚点/小标题多的时候尤其明显。
- 实测（`Target.attachToTarget` 挂到 service worker 上抓 `chat/completions` 请求）：
  - 该页 **1341 个可译块，总字符仅 30223，中位块长只有 10 个字符**，85% 的块 ≤20 字符；原规则「80 段/10000 字符」下**段数先到顶**，每批只用到约一成字符预算 → **17 批**（按 400 段切只要 5 批）。
  - 更严重的是**重试放大**：core `translateItems` 对「返回数组长度不匹配」也会重试同一份 payload（2 次），content 侧 `translateBatch` 又重试 1 次，一次失败最坏发 3~4 个**完全相同**的请求。同一进度点请求数 21 → 修掉后 7。
  - 顺带发现测试用的 Agnes 端点频繁返回 **429**（`The rate exceeds the limit`），这也是「卡住不动」的一部分原因：`done` 只在整批回包后跳一次，429 重试期间进度条看着像卡死。
- 解决：① 段数上限 80 → 150、字符预算仍是 10000（字符才是真正的主约束）；② **极短块合并**：连续 ≤24 字符的块每 8 条拼成一项（换行分隔），回包按行拆回，行数对不上则整组计失败；实测侧边栏标签逐条对得上（`Main page => 主頁`、`Contents => 目錄`）；③ core 遇长度不匹配**不再重试同一请求**，直接二分拆分（瞬时错误才重试一次）；④ 提示词改用可读语言名（`简体中文` 而非 `zh-CN`），避免模型输出繁体。
- 备注：整页翻译的耗时下限由模型每请求延迟决定（该页约 4 批），批次越大单次等待越久但总往返更少；进度条按批跳动，不是卡死。

### 2026-09-22 · 划词单词偶发「无法翻译」：IndexedDB 记录损坏把整条链路炸掉
- 现象：先划词翻译一整段，再划词单个单词，大概率显示「未找到结果。配置模型 API Key 后可用 AI 翻译。」——但 AI 明明配置好了，且单词本应走「本地词典 → AI」。
- 排查：直接调后台 `TRANSLATE_TEXT`（dictionaryOnly）发现**整个请求 reject**（`A runtime.onMessage listener's promise rejected without an Error`）。继续读 IndexedDB，发现部分分片（`dict:ecdict-zh:h/m/s/c/a`）读取报 **`NotReadableError: Data lost due to missing file. Affected record should be considered irrecoverable`**，而 `:w`、`:e` 正常——Chrome 的 IDB 记录真的丢了。
- 原因：① `loadShard()` 没有捕获 `idbGet` 的异常，异常一路上抛到 message handler；② `openPopover` 里 `await translate()` 抛异常后，`else if (isWord)` 的 AI 兜底**被跳过**，于是既没有词典结果也没有 AI 结果；③ `content.notFound` 文案写死了「配置模型 API Key」，AI 已配置时也这么提示，误导。
- 解决：① `loadShard` 捕获读异常并当作「分片缺失」返回 null，交给 `lookupLocal` 既有的「缺分片 → installDict 重新下载」流程自愈；② `translate()` 加 `.catch(() => null)`，词典失败不再吞掉 AI 兜底；③ 文案改回中性的「未找到结果。」（需要提示配置的场景由 `content.noDict` 承担）。
- 备注：实测四个原本必挂的词（hello/mustard/serendipity/curious）全部恢复；损坏分片 `dict:ecdict-zh:h` 重新下载后 len=1391 可读；划词弹框 `Serendipity → n. 意外发现新奇事物的本领`。这类损坏是环境/Chrome 层面的（本地 profile 反复清库后出现），但扩展现在能自愈而不是永久失效。

### 2026-09-22 · 新增第 6 个工具后图标被屏幕边缘裁掉
- 现象：加了「网页总结」工具后，工具环最后一个图标顶到窗口右边被切掉。
- 原因：工具环是**固定角度步长**（`STEP_DEG=26`，从 180° 递减），5 个工具时最后一个在 76°（x≈+24，刚好贴边）；6 个工具时最后两个落到 50°/76° 之外，`cos` 变正 → 跑到了球的右侧、越过视口右边缘。半径也固定 100，数量变多还会互相重叠。
- 解决：改为**固定张角 180°→90°**（只在球的内侧展开，永不越过球心，因此不会顶到左右边缘），角度步长按工具数自适应；半径按目标间距（46px）自动放大，数量变多也不重叠；另外球在**上半屏时工具改为朝下展开**（stack 模式同样翻转），避免向上溢出。
- 备注：实测 6 个工具在「右下 / 右上 / 左下」三种位置下 **0 个被裁切**、相邻不重叠；截图确认 6 个图标（网页翻译 / 悬浮 / 划词 / 生词本 / 设置 / 网页总结）完整可见。

### 2026-09-23 · 悬浮球展开工具后，鼠标还没点到工具就收起来了
- 现象：悬浮球弹出工具后，移动鼠标去点工具，大概率在到达前工具就消失，点不中。
- 原因：hover 监听挂在**球本身**（`.fab-root` 只有 56×56），而工具是用 `--x/--y` 平移到环上的、并不在这个盒子里。指针从球移向工具时先离开这 56×56 的区域，触发 `pointerleave`；原来的 380ms 宽限在工具变多、环半径变大（约 153px）后不够用，于是「还没到就收」。
- 解决：把命中范围**显式定义**为「以球心为圆心、半径覆盖整个工具环的圆」（`arcRadius + 45`）。进入球时缓存球心并挂 window 级 `pointermove`：指针只要还在这个圆内（含球到工具的间隙、以及工具上）就保持展开，出圆才收；`pointerleave` 也先做同样的圆内判断，仅出圆时留 120ms 宽限避免边界抖动。组件卸载时移除 window 监听。
- 备注：实测从球心**缓慢**（10 步 / 2s）上移 150px 穿过间隙，全程 `open` 保持为 true，点击「网页总结」正常触发；指针移到远处后正常收起。

### 2026-09-23 · 网页总结跨标签页串台
- 现象：在 A 标签页点了「网页总结」，切到 B 标签页（或从当前页新开标签）时，侧边栏仍显示 A 的总结。
- 原因：总结内容只存在全局键 `mustard:pending-summary` 里，没有记录来源标签页；侧边栏又是按窗口共享的，切标签不会换内容。
- 解决：`PageContent` 增加 `tabId`，后台在 `OPEN_SIDEBAR` 时用 `sender.tab.id` 打标；SummaryView 以 `tabs.query({active,currentWindow})` 取当前标签页并**只在 tabId 匹配时展示**，否则显示「当前标签页没有网页总结」提示；监听 `tabs.onActivated` 与 `pendingSummary` 存储变化实时重算。另外切标签不再中断进行中的请求（跑完写缓存），完成后若不在发起标签页也只缓存、不改界面。
- 备注：实测在发起标签页显示并流式输出、切到别的标签页显示提示、切回来仍是缓存的总结（未重新请求）；新开标签不在范围内。
