/** 网页总结：content 从页面正文抽取出的内容（经 background 传给侧边栏） */
export interface PageContent {
  title: string
  text: string
  url: string
  /** 抽取时间戳，用于判断是否为同一次总结 */
  ts: number
  /** AI 总结结果缓存，避免重复请求 */
  summary?: string
}
