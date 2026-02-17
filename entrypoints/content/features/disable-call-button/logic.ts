import {isFeatureEnabled} from '../../shared/utils'
import {SETTING_CALLS_KEY} from '../extension-settings/constants'

const HIDE_CALLS_ENABLED_CLASS = 'mm-hide-calls-enabled'

export const setupDisableCallButton = () => {
  // Subscribe to settings changes
  window.addEventListener('mm-extension-setting-changed', (event: any) => {
    if (event.detail?.key === SETTING_CALLS_KEY) {
      updateFeatureState()
    }
  })

  // Initial check
  updateFeatureState()
}

const updateFeatureState = () => {
  const enabled = isFeatureEnabled(SETTING_CALLS_KEY)
  
  if (enabled) {
    document.documentElement.classList.add(HIDE_CALLS_ENABLED_CLASS)
  } else {
    document.documentElement.classList.remove(HIDE_CALLS_ENABLED_CLASS)
  }
}
