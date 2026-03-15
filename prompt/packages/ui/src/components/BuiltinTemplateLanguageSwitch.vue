<template>
  <NButton
    @click="handleLanguageToggle"
    :disabled="isChanging"
    :title="t('template.switchBuiltinLanguage')"
    size="small"
    secondary
    :loading="isChanging"
  >
    <template #icon>
      <svg
        class="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
    </template>
    {{ getCurrentLanguageShort }}
  </NButton>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, inject, type Ref } from 'vue'

import { useI18n } from 'vue-i18n'
import { NButton } from 'naive-ui'
import { useToast } from '../composables/ui/useToast'
import type { BuiltinTemplateLanguage } from '@prompt-optimizer/core'
import type { AppServices } from '../types/services'

const { t } = useI18n()
const toast = useToast()

// 移除props定义，现在统一通过inject获取services
// const props = defineProps({
//   // templateManager和templateLanguageService现在通过inject获取
// })

// 统一使用inject获取services
const services = inject<Ref<AppServices | null>>('services')
if (!services) {
  throw new Error('[BuiltinTemplateLanguageSwitch] services未正确注入，请确保在App组件中正确provide了services')
}

const getTemplateManager = computed(() => {
  const servicesValue = services.value
  if (!servicesValue) {
    throw new Error('[BuiltinTemplateLanguageSwitch] services未初始化，请确保应用已正确启动')
  }

  const manager = servicesValue.templateManager
  if (!manager) {
    throw new Error('[BuiltinTemplateLanguageSwitch] templateManager未初始化，请确保服务已正确配置')
  }

  return manager
})

const getTemplateLanguageService = computed(() => {
  const servicesValue = services.value
  if (!servicesValue) {
    throw new Error('[BuiltinTemplateLanguageSwitch] services未初始化，请确保应用已正确启动')
  }

  const service = servicesValue.templateLanguageService
  if (!service) {
    throw new Error('[BuiltinTemplateLanguageSwitch] templateLanguageService未初始化，请确保服务已正确配置')
  }

  return service
})

// Reactive state
const currentLanguage = ref<BuiltinTemplateLanguage>('zh-CN')
const supportedLanguages = ref<BuiltinTemplateLanguage[]>([])
const isChanging = ref(false)

// Computed properties
const getCurrentLanguageShort = computed(() => {
  try {
    const service = getTemplateLanguageService.value
    if (!service) {
      throw new Error('Template language service not available')
    }
    return service.getLanguageDisplayName(currentLanguage.value)
  } catch (error) {
    console.error('Error getting current language short:', error)
    return '中文' // fallback to Chinese
  }
})

// Event emitters
const emit = defineEmits<{
  languageChanged: [language: BuiltinTemplateLanguage]
}>()

/**
 * Initialize component
 */
onMounted(async () => {
  try {
    const service = getTemplateLanguageService.value
    if (!service) {
      throw new Error('Template language service not available')
    }

    // Ensure template language service is initialized
    if (!service.isInitialized()) {
      await service.initialize()
    }

    // Get current language and supported languages (now async)
    currentLanguage.value = await service.getCurrentLanguage()
    supportedLanguages.value = await service.getSupportedLanguages()
  } catch (error) {
    console.error('Failed to initialize builtin template language switch:', error)
    // Set fallback values
    currentLanguage.value = 'zh-CN'
    supportedLanguages.value = ['zh-CN', 'en-US']

    // Only show toast error if toast is available
    try {
      toast.error(t('template.languageInitError'))
    } catch (toastError) {
      console.error('Failed to show toast error:', toastError)
    }
  }
})

/**
 * Handle language toggle
 */
const handleLanguageToggle = async () => {
  if (isChanging.value) return

  const oldLanguage = currentLanguage.value
  const newLanguage = oldLanguage === 'zh-CN' ? 'en-US' : 'zh-CN'

  try {
    isChanging.value = true
    
    const manager = getTemplateManager.value
    if (!manager) {
      throw new Error('Template manager not available')
    }

    // Change the built-in template language
    await manager.changeBuiltinTemplateLanguage(newLanguage)

    // Update local state
    currentLanguage.value = newLanguage

    // Emit event to notify parent components
    emit('languageChanged', newLanguage)

    // Show success message
    try {
      const service = getTemplateLanguageService.value
      if (!service) {
        throw new Error('Template language service not available')
      }
      const languageName = service.getLanguageDisplayName(newLanguage)
      toast.success(t('template.languageChanged', { language: languageName }))
    } catch (toastError) {
      console.error('Failed to show success toast:', toastError)
    }

  } catch (error) {
    console.error('Failed to toggle builtin template language:', error)

    // Revert to old language on error
    currentLanguage.value = oldLanguage

    // Show error message
    try {
      toast.error(t('template.languageChangeError'))
    } catch (toastError) {
      console.error('Failed to show error toast:', toastError)
    }
  } finally {
    isChanging.value = false
  }
}

/**
 * Refresh current language (useful for external updates)
 */
const refresh = async () => {
  const service = getTemplateLanguageService.value
  if (!service) {
    throw new Error('Template language service not available')
  }

  currentLanguage.value = await service.getCurrentLanguage()
}

// Expose methods for parent components
defineExpose({
  refresh
})
</script>

<style scoped>
/* Pure Naive UI implementation - no custom theme CSS needed */
</style>
