# Mustard 芥末

> 开源 Chrome 划词翻译扩展：划词 / 悬浮 / 网页翻译，侧边栏 AI 对话，生词本与记词，离线词典。
> 仅通过 GitHub 开源分发，**不提供 Chrome 应用商店下载**。

[English](./README.en.md) · [宣传页](https://daosrc.github.io/mustard/) · [Releases](https://github.com/daosrc/mustard/releases)

## 功能

| 功能 | 说明 |
| --- | --- |
| **划词翻译** | 选中文本浮出图标，点击弹出翻译气泡（音标 / 词性 / 释义 / 例句），可发音、一键加入生词本 |
| **悬浮翻译** | 鼠标悬停即显示译文，延迟与取词范围可配置 |
| **网页翻译** | 整页双语对照：原文后追加译文节点，先占位后出译文，可随时还原原文 |
| **截图翻译** | 直接把截图粘贴到输入框，交给多模态模型翻译 |
| **侧边栏对话** | 按提供商分组选择模型，支持附件（图片 / PDF / TXT / Word / Markdown）与截图提问 |
| **生词本** | 自动收录、单词发音、删除、导入导出（JSON / CSV） |
| **记词** | 听音默写：看词 → 默写 → 验证；**连续答对 3 次自动判定「已掌握」**，优先练习未掌握的词 |
| **离线词典** | 本地 → 在线 → AI 分级查询；词典数据**不打包**，**首次使用时按需下载**（ECDICT MIT 示例、Wordset 英英按字母下载），下载后可离线查词 |
| **模型提供商** | 默认 OpenCode Zen（OpenAI 兼容），可自定义提供商，模型逐条添加并标注输入能力 |
| **会话历史** | 新建 / 切换 / 删除会话，随时载入历史对话 |
| **目标语言** | 默认简体中文，支持 14 种主流语种 |
| **主题** | 芥末绿视觉体系，含深色模式 |

## 安装

> 尚未发布商店版本，请从 GitHub 安装。

**方式一：下载打包好的扩展（推荐）**

1. 打开 [Releases](https://github.com/daosrc/mustard/releases) 下载最新的 `mustard-<version>-chrome.zip` 并解压。
2. 浏览器打开 `chrome://extensions/`，右上角开启「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择解压出的目录。

**方式二：从源码构建**

```bash
git clone https://github.com/daosrc/mustard.git
cd mustard
pnpm install
pnpm build:ext          # 产物在 apps/extension/.output/chrome-mv3
```

然后在 `chrome://extensions/` 用「加载已解压的扩展程序」选择 `apps/extension/.output/chrome-mv3`。

## 使用

1. **配置模型（AI 功能）**：打开扩展设置，填入 OpenCode Zen 的 API Key，或添加自定义提供商。
   未配置 Key 时，AI 相关功能会提示去配置，划词/词典等基础功能仍可使用。
2. **划词翻译**：在网页中选中文字 → 点击浮出的图标查看译文。
3. **网页翻译**：点击右下角悬浮球，展开工具后开启「网页翻译」。
4. **生词本 / 记词**：侧边栏顶部进入「生词本」，点「记词」开始听音默写。
5. **离线词典**：设置 → 离线词典，管理内置/可下载词典与在线兜底。

## 开发

```bash
pnpm install
pnpm dev:ext        # 扩展开发（WXT HMR）
pnpm dev:landing    # 宣传页开发（Astro）
pnpm lint           # ESLint
pnpm typecheck      # 类型检查
pnpm build          # 构建全部
```

仓库结构（Monorepo）：

```
apps/extension   扩展（WXT + Vue 3 + TS）
apps/landing     宣传页（Astro）
packages/ui            组件库
packages/core          providers / translation / dictionary / vocab / session
packages/platform      浏览器能力（messaging / storage / sidePanel …）
packages/shared        类型、常量、语言表、消息协议
packages/utils         LRU / hash / 时间 / 生词本导入导出
packages/design-tokens 颜色/圆角/阴影 token + UnoCSS preset
packages/config        共享 tsconfig
design/                设计资料（原型、设计文档、图标、截图）
```

## 数据与隐私

- 扩展**不收集、不上报**任何数据。
- 翻译内容会发送到**你自己配置的模型服务**；离线词典查询在本机完成。
- API Key 仅保存在浏览器本地（`chrome.storage.local`），不会写入页面上下文或日志。

## 第三方数据

内置/可下载词典数据遵循其原始许可（ECDICT=MIT、CC-CEDICT/JMdict=CC BY-SA、部分 FreeDict=GPL）。
详见 [THIRD-PARTY.md](./THIRD-PARTY.md)。

## 已知限制

- **离线词典**：词典数据不随扩展打包，**首次使用时下载**。当前数据源：ECDICT（MIT，jsDelivr 上为小体量样例）与 Wordset 英英（CC BY-SA，按首字母懒加载，覆盖较全）。完整 ECDICT（约 66 MB，GitHub raw）与中/日等多语词典数据源待补充；分级查询链路（本地 → 在线 → AI）与词典管理已完成。
- **界面语言**：扩展界面文案暂为中文，宣传页为中英双语；`shared/i18n` 文案抽取与「界面语言」设置仍在规划中。
- **宣传页截图**：功能区当前使用 CSS 示意图，正式截图待导出后替换。

## 许可

[MIT](./LICENSE) © Mustard contributors
