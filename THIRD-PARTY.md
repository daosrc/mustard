# 第三方数据与许可（Third-party）

本项目自身代码以 [MIT](./LICENSE) 发布。内置或按需下载的**词典数据**遵循其原始许可，列表如下：

| 数据 | 用途 | 许可 | 说明 |
| --- | --- | --- | --- |
| [Wordset](https://github.com/wordset/wordset-dictionary) + [WordNet](https://wordnet.princeton.edu/) | 英 → 英（按首字母懒加载） | CC BY-SA 4.0 / WordNet License | 按需下载 |
| [CC-CEDICT](https://cc-cedict.org/)（MDBG 分发） | 中 → 英 | CC BY-SA 4.0 | gzip 文本，需署名 + 相同方式共享 |
| [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html) | 日 → 英 | EDRDG / CC BY-SA 4.0 | gzip XML，需署名 + 相同方式共享 |
| [FreeDict](https://freedict.org/) | 英 → 法 / 葡 / 阿 | GPL | TEI，注意与分发许可兼容 |
| [open-ecdict](https://github.com/mahavivo/open-ecdict)（《现代英汉词典》） | 英 → 中（**默认离线**） | 待确认 | 数据源自《现代英汉词典》，许可未明确；对外分发前请自行核实或替换为 MIT 的 ECDICT 全量数据 |
| Free Dictionary API / Wiktionary | 在线兜底（免 Key） | CC BY-SA / GFDL | 仅本地词典未命中时联网查询 |

## 署名要求

- **CC BY-SA**（CC-CEDICT、JMdict、Wiktionary）：分发时需保留署名，并以相同方式共享这些数据及其衍生数据。
- **GPL**（部分 FreeDict）：copyleft，分发包含该数据的作品时需遵循 GPL。
- **MIT / WordNet License**：宽松许可，需保留版权声明。

应用内「设置 → 关于」会展示以上来源与许可信息。
