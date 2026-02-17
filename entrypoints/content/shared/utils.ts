export const isFeatureEnabled = (key: string, defaultVal: boolean = false) => {
  const val = localStorage.getItem(key)
  if (val === null) return defaultVal
  return val === '1' || val === 'true'
}

export const setFeatureEnabled = (key: string, val: boolean) => {
  localStorage.setItem(key, val ? '1' : '0')
}

export const isMattermost = () => {
  const root = document.getElementById('root')
  if (root) {
    if (document.getElementById('mattermost-view-container')) return true
    if (root.querySelector('.channel-view')) return true
  }

  if (document.querySelector('meta[name="application-name"][content="Mattermost"]')) return true
  if (document.querySelector('meta[name="apple-mobile-web-app-title"][content="Mattermost"]')) return true
  
  const noscript = document.querySelector('noscript')
  if (noscript?.textContent?.includes('Mattermost')) return true
  
  return false
}
