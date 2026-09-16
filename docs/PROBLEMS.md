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
