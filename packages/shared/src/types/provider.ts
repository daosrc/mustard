/** 模型支持的输入类型（决定附件/截图是否可用） */
export interface ModelInputs {
  text: boolean
  image: boolean
  file: boolean
}

export interface ModelDef {
  id: string
  /** 模型 ID，如 claude-sonnet-4.5 */
  name: string
  inputs: ModelInputs
}

export interface Provider {
  id: string
  name: string
  /** OpenAI 兼容：请求 {baseUrl}/chat/completions */
  baseUrl: string
  apiKey: string
  models: ModelDef[]
  /** 内置提供商（OpenCode Zen）不可删除 */
  builtin?: boolean
}

export interface ProviderPreset {
  id: string
  name: string
  baseUrl: string
  models: ModelDef[]
}

/** 判断模型是否允许上传附件 / 粘贴截图 */
export function canAttach(model: ModelDef | undefined | null): boolean {
  return !!model && (model.inputs.image || model.inputs.file)
}
