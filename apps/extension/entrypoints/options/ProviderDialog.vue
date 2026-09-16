<script setup lang="ts">
import type { Provider } from '@mustard/shared'
import { errorCode, testConnection } from '@mustard/core'
import { MButton, MDialog, MField, MIcon, useToast } from '@mustard/ui'
import { reactive, ref, watch } from 'vue'

const props = defineProps<{ provider: Provider | null }>()
const emit = defineEmits<{ save: [Provider] }>()
const open = defineModel<boolean>({ default: false })
const { success, error } = useToast()

const draft = reactive<Provider>({ id: '', name: '', baseUrl: '', apiKey: '', models: [], builtin: false })
const testing = ref(false)

watch(open, (isOpen) => {
  if (isOpen && props.provider)
    Object.assign(draft, structuredClone(props.provider))
})

function addModel(): void {
  draft.models.push({
    id: `model-${Date.now()}`,
    name: '',
    inputs: { text: true, image: false, file: false },
  })
}

function removeModel(index: number): void {
  draft.models.splice(index, 1)
}

function save(): void {
  if (!draft.name.trim() || !draft.baseUrl.trim()) {
    error('请填写名称与 baseUrl')
    return
  }
  const models = draft.models
    .filter(m => m.name.trim())
    .map(m => ({ ...m, id: m.name.trim(), name: m.name.trim() }))
  emit('save', { ...structuredClone(draft), models })
  open.value = false
}

async function test(): Promise<void> {
  if (!draft.baseUrl.trim()) {
    error('请先填写 baseUrl')
    return
  }
  const model = draft.models.find(m => m.name.trim())
  if (!model) {
    error('请先添加至少一个模型')
    return
  }
  testing.value = true
  try {
    await testConnection({ ...structuredClone(draft), models: draft.models }, model)
    success('连接成功')
  }
  catch (err) {
    error(`连接失败：${errorCode(err)}`)
  }
  finally {
    testing.value = false
  }
}
</script>

<template>
  <MDialog v-model="open" :title="provider?.builtin ? '编辑提供商（内置）' : '编辑提供商'" width="520px">
    <div class="form">
      <MField label="名称">
        <input v-model="draft.name" class="m-input" placeholder="例如 OpenCode Zen">
      </MField>
      <MField label="Base URL" hint="OpenAI 兼容：请求 {baseUrl}/chat/completions">
        <input v-model="draft.baseUrl" class="m-input" placeholder="https://opencode.ai/zen/v1">
      </MField>
      <MField label="API Key" hint="仅保存在本地">
        <input v-model="draft.apiKey" class="m-input" type="password" placeholder="sk-...">
      </MField>

      <div class="models">
        <div class="models-head">
          <span class="label">模型</span>
          <MButton variant="ghost" @click="addModel">
            <MIcon name="plus" :size="14" />
            添加模型
          </MButton>
        </div>

        <div v-for="(model, index) in draft.models" :key="index" class="model-row">
          <input v-model="model.name" class="m-input name" placeholder="模型 ID，如 claude-sonnet-4.5">
          <label class="cap"><input v-model="model.inputs.text" type="checkbox">文本</label>
          <label class="cap"><input v-model="model.inputs.image" type="checkbox">图片</label>
          <label class="cap"><input v-model="model.inputs.file" type="checkbox">附件</label>
          <button class="del" type="button" title="移除" @click="removeModel(index)">
            <MIcon name="close" :size="14" />
          </button>
        </div>
        <p v-if="!draft.models.length" class="m-muted">
          暂无模型，请添加至少一个。
        </p>
      </div>
    </div>

    <template #footer>
      <MButton variant="ghost" :disabled="testing" @click="test">
        {{ testing ? '测试中…' : '测试连接' }}
      </MButton>
      <MButton variant="ghost" @click="open = false">
        取消
      </MButton>
      <MButton @click="save">
        保存
      </MButton>
    </template>
  </MDialog>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 14px; }
.models { display: flex; flex-direction: column; gap: 8px; }
.models-head { display: flex; align-items: center; justify-content: space-between; }
.label { font-size: 13px; font-weight: 600; color: var(--m-ink); }
.model-row { display: flex; align-items: center; gap: 8px; }
.name { flex: 1; min-width: 0; }
.cap { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--m-muted); white-space: nowrap; }
.del {
  border: 0;
  padding: 5px;
  border-radius: 7px;
  background: transparent;
  color: var(--m-muted);
  display: inline-flex;
  cursor: pointer;
}
.del:hover { background: var(--m-surface-2); color: var(--m-blush); }
</style>
