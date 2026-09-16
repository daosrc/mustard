<script setup lang="ts">
import type { Provider } from '@mustard/shared'
import { errorCode, testConnection } from '@mustard/core'
import { MButton, MDialog, MField, MIcon, useToast } from '@mustard/ui'
import { reactive, ref, watch } from 'vue'
import { useI18n } from '../../lib/i18n'

const props = defineProps<{ provider: Provider | null }>()
const emit = defineEmits<{ save: [Provider] }>()
const open = defineModel<boolean>({ default: false })
const { success, error } = useToast()
const { t } = useI18n()

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
    error(t('options.needNameUrl'))
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
    error(t('options.needBaseUrl'))
    return
  }
  const model = draft.models.find(m => m.name.trim())
  if (!model) {
    error(t('options.needModel'))
    return
  }
  testing.value = true
  try {
    await testConnection({ ...structuredClone(draft), models: draft.models }, model)
    success(t('options.connected'))
  }
  catch (err) {
    error(t('options.connectFailed', { error: errorCode(err) }))
  }
  finally {
    testing.value = false
  }
}
</script>

<template>
  <MDialog v-model="open" :title="provider?.builtin ? t('options.providerEditBuiltin') : t('options.providerEdit')" width="520px">
    <div class="form">
      <MField :label="t('options.providerName')">
        <input v-model="draft.name" class="m-input" placeholder="OpenCode Zen">
      </MField>
      <MField :label="t('options.providerBaseUrl')">
        <input v-model="draft.baseUrl" class="m-input" placeholder="https://opencode.ai/zen/v1">
      </MField>
      <MField :label="t('options.providerKey')" :hint="t('options.providerKeyHint')">
        <input v-model="draft.apiKey" class="m-input" type="password" placeholder="sk-...">
      </MField>

      <div class="models">
        <div class="models-head">
          <span class="label">{{ t('options.providerModels') }}</span>
          <MButton variant="ghost" @click="addModel">
            <MIcon name="plus" :size="14" />
            {{ t('options.addModel') }}
          </MButton>
        </div>

        <div v-for="(model, index) in draft.models" :key="index" class="model-row">
          <input v-model="model.name" class="m-input name" :placeholder="t('options.modelId')">
          <label class="cap"><input v-model="model.inputs.text" type="checkbox">{{ t('options.capText') }}</label>
          <label class="cap"><input v-model="model.inputs.image" type="checkbox">{{ t('options.capImage') }}</label>
          <label class="cap"><input v-model="model.inputs.file" type="checkbox">{{ t('options.capFile') }}</label>
          <button class="del" type="button" :title="t('options.delete')" @click="removeModel(index)">
            <MIcon name="close" :size="14" />
          </button>
        </div>
        <p v-if="!draft.models.length" class="m-muted">
          {{ t('options.noModels') }}
        </p>
      </div>
    </div>

    <template #footer>
      <MButton variant="ghost" :disabled="testing" @click="test">
        {{ testing ? t('options.testing') : t('options.testConnection') }}
      </MButton>
      <MButton variant="ghost" @click="open = false">
        {{ t('options.cancel') }}
      </MButton>
      <MButton @click="save">
        {{ t('options.save') }}
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
