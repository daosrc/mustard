import type { ModelDef, Provider, Settings } from '@mustard/shared'
import { send } from '@mustard/platform'
import { canAttach } from '@mustard/shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings | null>(null)
  const loading = ref(false)

  async function load(): Promise<void> {
    loading.value = true
    try {
      settings.value = await send({ type: 'GET_SETTINGS' })
    }
    catch {
      settings.value = null
    }
    finally {
      loading.value = false
    }
  }

  async function patch(patchSettings: Partial<Settings>): Promise<void> {
    settings.value = await send({ type: 'UPDATE_SETTINGS', payload: patchSettings })
  }

  async function saveProviders(providers: Provider[]): Promise<void> {
    await patch({ providers })
  }

  const activeProvider = computed<Provider | null>(() => {
    const s = settings.value
    return s?.providers.find(p => p.id === s.activeProviderId) ?? null
  })

  const activeModel = computed<ModelDef | null>(() => {
    const s = settings.value
    if (!s)
      return null
    return s.providers.find(p => p.id === s.activeProviderId)?.models.find(m => m.name === s.activeModel) ?? null
  })

  const aiConfigured = computed(() => !!activeProvider.value?.apiKey)
  const canAttachActive = computed(() => canAttach(activeModel.value))

  return {
    settings,
    loading,
    load,
    patch,
    saveProviders,
    activeProvider,
    activeModel,
    aiConfigured,
    canAttachActive,
  }
})
