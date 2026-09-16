# AGENTS.md — 给 AI 编码助手的工作说明

## 项目速览

Mustard 芥末：开源 Chrome 划词翻译扩展。Monorepo（pnpm workspace + Turborepo）。
`apps/extension`（WXT + Vue3）、`apps/landing`（Astro）、`packages/*`（共享包，TS 源码直出，无构建步骤）。

## 常用命令

```bash
pnpm install
pnpm dev:ext / pnpm dev:landing     # 开发
pnpm lint / pnpm typecheck / pnpm build
pnpm --filter @mustard/extension build
```

## 约定

- 代码风格由 `@antfu/eslint-config` 约束，提交前必须 `pnpm lint && pnpm typecheck` 通过。
- 共享逻辑优先放进 `packages/*`（core 领域逻辑、platform 浏览器能力、ui 组件、utils 工具），`apps/*` 只做组装。
- **不写无关注释**；只在必要处写简短说明。
- 提交信息用 Conventional Commits（`feat:` / `fix:` / `chore:` / `docs:` / `refactor:`）。
- 词典等第三方数据遵循其原始许可，见 `THIRD-PARTY.md`。

## 上下文与 Token 纪律（重要）

为降低 token 消耗、避免触发模型的 TPM 限流：

- **不要整份读取** `design/prototype/index.html`（约 39KB，含内联 base64 图标）。需要参考时用 `grep -n` 定位行号后按范围读。
- `design/icons/*.png`、`design/icons/*.ico` 是二进制，不要读；`design/icons/*.svg` 中 `icon.svg`/`ball-circle.svg` 为位图内嵌（100KB+），也不要整读。
- 优先 `grep` / `codegraph_explore` 定位，再按行范围读文件；避免重复读取同一文件。
- 一次改动尽量聚焦一个里程碑；每完成一个里程碑就提交一次，避免超长会话被限流打断后丢失进度。
- 命令输出保持精简（`tail` / `--silent`），不要打印大文件内容。

## 进度记录

- 计划与里程碑：`design/PLAN.md`（含进度表）
- 产品/交互/数据设计：`design/DESIGN.md`
- 开发中遇到的问题与解决：`docs/PROBLEMS.md`（**遇到问题后追加一条：现象 / 原因 / 解决 / 备注**）
