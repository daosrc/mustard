# Mustard 芥末

> 开源 Chrome 划词翻译扩展：划词 / 悬浮 / 网页 / 截图翻译，侧边栏 AI 对话，生词本与记词，离线词典。

[English](./README.en.md) · [主页](https://daosrc.github.io/mustard/) · [Releases](https://github.com/daosrc/mustard/releases)

## 功能

| 功能 | 说明 |
| --- | --- |
| **划词翻译** | 选中文本浮出图标，点击弹出翻译气泡（音标 / 词性 / 释义 / 例句），可发音、一键加入生词本 |
| **悬浮翻译** | 鼠标悬停即显示译文，延迟与取词范围可配置 |
| **网页翻译** | 整页双语对照，逐段追加译文并支持增量翻译，随时一键还原原文（**需先配置模型**） |
| **截图翻译** | 直接把截图粘贴到输入框，交给多模态模型翻译 |
| **侧边栏对话** | 按提供商选择模型，流式输出；支持粘贴截图提问（附件入口按所选模型的输入能力门控） |
| **生词本** | 单词发音、删除、导入导出（JSON / CSV）；「翻译单词后自动收录」默认关闭，可在设置里开启 |
| **记词** | 听音默写：看词 → 默写 → 验证；**连续答对 3 次自动判定「已掌握」**，优先练习未掌握的词 |
| **离线词典** | 本地 → 在线 → AI 分级查询；词典数据**不打包**，**首次使用时按需下载**。首次使用自动装好英汉词典（英→中），其余按需下载：Wordset 英英、CC-CEDICT（中→英）、JMdict（日→英）、FreeDict（英→法 / 葡 / 阿） |
| **模型提供商** | OpenAI 兼容，自行添加提供商与模型，模型逐条添加并标注输入能力 |
| **会话历史** | 新建 / 切换 / 删除会话，随时载入历史对话 |
| **目标语言** | 默认简体中文，支持 14 种主流语种 |
| **主题** | 芥末绿视觉体系，含深色模式 |

## 安装

**方式一：下载打包好的扩展（推荐）**

1. 打开 [Releases](https://github.com/daosrc/mustard/releases) 下载最新的 `mustard-translate-<version>-chrome.zip` 并解压。
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

1. **配置模型（AI 功能）**：打开扩展设置，添加模型提供商并填入 API Key。
   未配置 Key 时，AI 相关功能会提示去配置，划词/词典等基础功能仍可使用。
2. **划词翻译**：在网页中选中文字 → 点击浮出的图标查看译文。
3. **网页翻译**：点击右下角悬浮球，展开工具后开启「网页翻译」。
4. **生词本 / 记词**：侧边栏顶部进入「生词本」，点「记词」（全部掌握后为「复习」）开始听音默写。
5. **离线词典**：设置 → 离线词典，下载 / 启用 / 删除词典，或关闭在线兜底进入纯离线模式。

## 开发

```bash
pnpm install
pnpm dev:ext        # 扩展开发（WXT HMR）
pnpm dev:landing    # 主页开发（Astro）
pnpm lint           # ESLint
pnpm typecheck      # 类型检查
pnpm build          # 构建全部
```

仓库结构（Monorepo）：

```
apps/extension   扩展（WXT + Vue 3 + TS）
apps/landing     主页（Astro）
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

按需下载的词典数据遵循其原始许可（open-ecdict《现代英汉》、Wordset=CC BY-SA 4.0、CC-CEDICT=CC BY-SA 4.0、JMdict=EDRDG、FreeDict=GPL）。
详见 [THIRD-PARTY.md](./THIRD-PARTY.md)。

## 已知限制

- **离线词典**：数据不随扩展打包，**首次使用时下载**。首次使用会自动下载并启用**英汉词典《现代英汉》**（英→中，约 2.8 MB）；其余按需下载：Wordset 英英、CC-CEDICT（中→英）、JMdict（日→英）、FreeDict（英→法 / 葡 / 阿）。**目标语言没有对应离线词典时（日 / 韩 / 德 / 西等）只走 AI**。《现代英汉》源自 open-ecdict，许可待确认（见 THIRD-PARTY.md）。
- **网页翻译依赖模型**：网页翻译只能走 AI，未配置模型时开启只会提示去配置，不会发起翻译。
- **附件**：目前只有图片 / 截图会真正送给模型；PDF / Word 等文本附件仅记录文件名，尚未做内容抽取。
- **界面语言**：扩展界面支持**简体中文 / English**（设置 → 外观 → 界面语言），文案集中在 `shared/i18n`；若发现遗漏的硬编码文案，欢迎提 Issue。
- **主页截图**：功能区使用扩展实拍截图（`apps/landing/public/shots/`），随扩展 UI 变更需同步重拍。

## 许可

[MIT](./LICENSE) © Mustard contributors
