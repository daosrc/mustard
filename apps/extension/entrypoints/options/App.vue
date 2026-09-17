<script setup lang="ts">
import { MToastHost } from '@mustard/ui'
import { useI18n } from '../../lib/i18n'
import { useTheme } from '../../lib/useTheme'
import { BALL_ICON } from '../content/ball'
import SettingsPanel from './SettingsPanel.vue'

useTheme()
const { t } = useI18n()
</script>

<template>
  <div class="page">
    <header class="head">
      <img class="mark" :src="BALL_ICON" alt="Mustard">
      <div>
        <h1>{{ t('options.title') }}</h1>
        <p class="sub">
          {{ t('options.subtitle') }}
        </p>
      </div>
    </header>

    <SettingsPanel />
    <MToastHost />
  </div>
</template>

<style scoped>
.page { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }
.head { display: flex; gap: 14px; align-items: center; margin-bottom: 20px; }
.mark { width: 44px; height: 44px; border-radius: 12px; }
h1 { font-size: 20px; margin: 0 0 4px; }
.sub { color: var(--m-muted); font-size: 13px; margin: 0; line-height: 1.6; }
</style>
