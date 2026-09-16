# Mustard

> An open-source Chrome translation extension: select / hover / full-page translation, side-panel AI chat, vocabulary with dictation, and offline dictionaries.
> Distributed on GitHub only — **no Chrome Web Store listing**.

[中文](./README.md) · [Landing page](https://daosrc.github.io/mustard/en/) · [Releases](https://github.com/daosrc/mustard/releases)

## Features

| Feature | Description |
| --- | --- |
| **Select-to-translate** | Select text, click the floating icon and read phonetics, part of speech, definitions and examples — pronounce it or save it to your vocabulary |
| **Hover translation** | Hover to see the translation; delay and scope (word / sentence) are configurable |
| **Full-page translation** | Bilingual side-by-side: a translated node is appended after each original block (placeholder → result), restorable at any time |
| **Screenshot translation** | Paste a screenshot into the composer and let a multimodal model translate it |
| **Side-panel chat** | Pick a model grouped by provider; attach files (image / PDF / TXT / Word / Markdown) or screenshots |
| **Vocabulary** | Auto-saved words, pronunciation, delete, import/export (JSON / CSV) |
| **Dictation practice** | See the word → spell it → verify; **3 correct answers in a row marks it "mastered"**; unmastered words come first |
| **Offline dictionaries** | Local → online → AI fallback; dictionary data is **not bundled** but **downloaded on first use** (ECDICT MIT sample, Wordset English per-letter), then works offline |
| **Model providers** | OpenCode Zen by default (OpenAI-compatible), custom providers supported; models added one by one with declared input capabilities |
| **Chat history** | Create / switch / delete sessions and reload past conversations |
| **Target language** | Simplified Chinese by default, 14 languages supported |
| **Theme** | Wasabi-green design system with a dark mode |

## Install

> No store release yet — install from GitHub.

**Option 1: Download the packaged extension (recommended)**

1. Open [Releases](https://github.com/daosrc/mustard/releases), download `mustard-<version>-chrome.zip` and unzip it.
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder.

**Option 2: Build from source**

```bash
git clone https://github.com/daosrc/mustard.git
cd mustard
pnpm install
pnpm build:ext          # output: apps/extension/.output/chrome-mv3
```

Then load `apps/extension/.output/chrome-mv3` via **Load unpacked**.

## Usage

1. **Configure a model (AI features)**: open the extension settings and fill in your OpenCode Zen API key, or add a custom provider.
   Without a key, AI features prompt you to configure one; selection/dictionary features keep working.
2. **Select-to-translate**: select text on a page, then click the floating icon.
3. **Full-page translation**: open the floating ball, expand the tools and enable "Page translation".
4. **Vocabulary / dictation**: open the side panel, go to "Vocabulary" and click "Dictation".
5. **Offline dictionaries**: Settings → Offline dictionaries to manage dictionaries and the online fallback.

## Development

```bash
pnpm install
pnpm dev:ext        # extension dev (WXT + HMR)
pnpm dev:landing    # landing page dev (Astro)
pnpm lint           # ESLint
pnpm typecheck      # TypeScript
pnpm build          # build everything
```

Monorepo layout:

```
apps/extension   Extension (WXT + Vue 3 + TS)
apps/landing     Landing page (Astro)
packages/ui            Component library
packages/core          providers / translation / dictionary / vocab / session
packages/platform      Browser APIs (messaging / storage / sidePanel …)
packages/shared        Types, constants, languages, message protocol
packages/utils         LRU / hash / time / vocabulary import-export
packages/design-tokens Color, radius and shadow tokens + UnoCSS preset
packages/config        Shared tsconfig
design/                Design assets (prototype, design doc, icons, screenshots)
```

## Data & privacy

- The extension **collects nothing** and phones home to no server.
- Translation content is sent to **the model service you configure**; offline dictionary lookups stay local.
- API keys are stored locally (`chrome.storage.local`) and never injected into pages or logs.

## Third-party data

Bundled/downloadable dictionary data keeps its original license (ECDICT=MIT, CC-CEDICT/JMdict=CC BY-SA, some FreeDict=GPL).
See [THIRD-PARTY.md](./THIRD-PARTY.md).

## Known limitations

- **Offline dictionaries**: data is not bundled and is **downloaded on first use**. Current sources: ECDICT (MIT; the jsDelivr copy is a small sample) and Wordset English (CC BY-SA, lazy per first letter, good coverage). The full ECDICT (~66 MB, GitHub raw) and Chinese/Japanese sources are pending. The lookup chain (local → online → AI) and dictionary management are in place.
- **UI language**: the extension UI supports **Simplified Chinese / English** (Settings → Appearance → UI language); strings live in `shared/i18n`. Please open an issue for any hard-coded text we missed.
- **Landing screenshots**: feature sections currently use CSS mock visuals; real screenshots will replace them once exported.

## License

[MIT](./LICENSE) © Mustard contributors
