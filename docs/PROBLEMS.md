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
