# Mustard

> An open-source Chrome translation extension: select / hover / page / screenshot translation, side-panel AI chat, vocabulary with dictation, and offline dictionaries.

[中文](./README.md) · [Homepage](https://daosrc.github.io/mustard/en/) · [Releases](https://github.com/daosrc/mustard/releases)

## Features

| Feature | Description |
| --- | --- |
| **Select-to-translate** | Select text, click the floating icon and read phonetics, part of speech, definitions and examples — pronounce it or save it to your vocabulary |
| **Hover translation** | Hover to see the translation; delay and scope (word / sentence) are configurable |
| **Full-page translation** | Bilingual side-by-side: each block gets its translation appended in place, incrementally, restorable at any time (**requires a configured model**) |
| **Screenshot translation** | Paste a screenshot into the composer and let a multimodal model translate it |
| **Side-panel chat** | Pick a model, stream the answer, and attach text / Markdown, PDF or DOCX files (PDF / DOCX are parsed to text locally; if the model declares file support, they are sent as-is) |
| **Vocabulary** | Pronunciation, delete, import/export (JSON / CSV); "auto-save translated words" is off by default and can be enabled in settings |
| **Dictation practice** | See the word → spell it → verify; **3 correct answers in a row marks it "mastered"**; unmastered words come first |
| **Offline dictionaries** | Local → online → AI fallback; data is **not bundled** but **downloaded on first use**. The English→Chinese dictionary is installed automatically on first use; Wordset (EN→EN), CC-CEDICT (ZH→EN), JMdict (JA→EN) and FreeDict (EN→FR/PT/AR) are opt-in |
| **Model providers** | OpenAI-compatible; add your own provider and models, each with declared input capabilities |
| **Chat history** | Create / switch / delete sessions and reload past conversations |
| **Target language** | Simplified Chinese by default, 14 languages supported |
| **Theme** | Wasabi-green design system with a dark mode |

## Install

**Option 1: Download the packaged extension (recommended)**

1. Open [Releases](https://github.com/daosrc/mustard/releases), download `mustard-translate-<version>-chrome.zip` and unzip it.
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

1. **Configure a model (AI features)**: open the extension settings, add a model provider and fill in its API key.
   Without a key, AI features prompt you to configure one; selection/dictionary features keep working.
2. **Select-to-translate**: select text on a page, then click the floating icon.
3. **Full-page translation**: open the floating ball, expand the tools and enable "Page translation".
4. **Vocabulary / dictation**: open the side panel, go to "Vocabulary" and click "Practice" (shown as "Review" once everything is mastered).
5. **Offline dictionaries**: Settings → Offline dictionaries to download / enable / delete dictionaries, or turn off the online fallback for fully offline mode.

## Development

```bash
pnpm install
pnpm dev:ext        # extension dev (WXT + HMR)
pnpm dev:landing    # homepage dev (Astro)
pnpm lint           # ESLint
pnpm typecheck      # TypeScript
pnpm build          # build everything
```

Monorepo layout:

```
apps/extension   Extension (WXT + Vue 3 + TS)
apps/landing     Homepage (Astro)
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

Downloadable dictionary data keeps its original license (open-ecdict, Wordset=CC BY-SA 4.0, CC-CEDICT=CC BY-SA 4.0, JMdict=EDRDG, FreeDict=GPL).
See [THIRD-PARTY.md](./THIRD-PARTY.md).

## Known limitations

- **Offline dictionaries**: data is not bundled and is **downloaded on first use**. The English→Chinese dictionary (现代英汉, ~2.8 MB) is downloaded and enabled automatically on first use; Wordset (EN→EN), CC-CEDICT (ZH→EN), JMdict (JA→EN) and FreeDict (EN→FR/PT/AR) are opt-in. **Target languages without an offline dictionary (JA/KO/DE/ES…) fall back to AI only.** The 现代英汉 data comes from open-ecdict and its license is unconfirmed (see THIRD-PARTY.md).
- **Page translation needs a model**: it is AI-only; without one, enabling it just shows a notice and translates nothing.
- **Attachments**: images / screenshots are sent to the model directly; text / Markdown is read locally and PDF / DOCX are parsed to text locally (best-effort text layer — **scanned PDFs with no text layer cannot be extracted**). When the selected model declares file support, PDF / DOCX are sent as-is instead of being parsed.
- **UI language**: the extension UI supports **Simplified Chinese / English** (Settings → Appearance → UI language); strings live in `shared/i18n`. Please open an issue for any hard-coded text we missed.
- **Homepage screenshots**: feature sections use real extension screenshots (`apps/landing/public/shots/`); re-shoot when the UI changes.

## License

[MIT](./LICENSE) © Mustard contributors
