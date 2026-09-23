## 新功能

- **网页总结**：悬浮球新增「网页总结」工具。点击后自动抽取当前页正文（忽略导航、页脚、标题与广告等无关内容），交给 AI 在侧边栏**流式**输出要点，支持复制与重新总结；未配置模型 / 页面无正文 / 调用失败均有明确提示。
- **悬浮球可拖拽**：上下位置随意拖、松手即停；左右以页面中线为界自动贴边。工具环展开方向随球的位置自适应（球在上半屏时改为向下展开）。
- **附件翻译**：侧边栏支持上传**文本 / Markdown / PDF / DOCX**。文本与 Markdown 本地读取，PDF / DOCX 本地解析为文本（PDF 尽力抽取文本层，扫描件无文字层解析不出）；当所选模型声明「附件」能力时，PDF / DOCX 直接以原文件传给模型。

## 修复

- **划词翻译**：选中一整段文字走 AI；未配置模型时不再弹出翻译图标（单个单词仍走离线词典，无需 AI）。翻译顺序为「单词：本地词典 → AI」。
- **悬浮球开关**：现在只控制悬浮球是否显示，不再连带关闭划词翻译、悬浮翻译与网页翻译。
- **重复 UI**：悬浮球与网页翻译进度条只在顶层文档显示，带 iframe 的页面不再出现多个球 / 多条进度条。
- **离线词典**：修复 Chrome IndexedDB 记录损坏（`NotReadableError`）导致单词「无法翻译」的问题；遇到损坏分片会自动重新下载修复，词典失败时也不会再吞掉 AI 兜底。
- **工具环**：新增工具后图标不再被屏幕边缘裁切，工具变多也不会重叠。
- **文案**：查不到结果时不再误导为「请配置模型 API Key」。

## 文档

- README / 落地页与实现同步：移除「仅通过 GitHub 分发、无 Chrome 商店版本」的表述，修正发布包名（`mustard-translate-<version>-chrome.zip`）、离线词典覆盖范围与附件能力说明。

---

### English

**New**

- **Page summary**: a new floating-ball tool that extracts the article body (skipping nav, footer, headings and ads) and streams an AI summary into the side panel, with copy / re-summarize and clear messages when no model, no content, or the call fails.
- **Draggable floating ball**: drag it vertically anywhere; horizontally it snaps to the nearest edge based on the page centre line. The tool fan flips direction with the ball's position.
- **Attachments**: text / Markdown / PDF / DOCX are supported. Text and Markdown are read locally, PDF / DOCX are parsed to text locally (best effort for scanned PDFs); when the model declares file support they are sent as-is.

**Fixes**

- Selection: a whole paragraph goes through AI, and no icon is shown without a model; single words still use the offline dictionary (local → AI).
- The floating-ball switch now only hides the ball and no longer disables selection / hover / page translation.
- The ball and the page-translation bar render only in the top frame, so pages with iframes no longer show duplicates.
- Offline dictionaries: fixed words failing to translate after Chrome lost IndexedDB records (`NotReadableError`); corrupt shards are re-downloaded automatically and a dictionary failure no longer swallows the AI fallback.
- Tool icons are no longer clipped by the window edge and do not overlap as more tools are added.
