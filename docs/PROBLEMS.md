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
