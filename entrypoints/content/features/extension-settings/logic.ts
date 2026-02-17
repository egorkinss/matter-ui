import matterUiIcon from '../../icons/matter_ui.svg?raw'
import {MM_SELECTORS} from '../../shared/selectors'
import {isFeatureEnabled, setFeatureEnabled} from '../../shared/utils'
import {t} from '../multilanguage/logic'
import {
  EXTENSION_SETTINGS_BUTTON_ID,
  EXTENSION_SETTINGS_TAB_ID,
  SETTING_CALLS_KEY,
  SETTING_DM_KEY,
  SETTING_RESIZER_KEY,
} from './constants'

export const setupExtensionSettings = () => {
  const observer = new MutationObserver(() => {
    const modal = document.querySelector<HTMLElement>(MM_SELECTORS.USER_SETTINGS_MODAL)
    if (modal) {
      injectMenuItem(modal)
      injectSettingsPanel(modal)
    }
  })
  observer.observe(document.body, {childList: true, subtree: true})
}

const injectMenuItem = (modal: HTMLElement) => {
  const tabList = modal.querySelector<HTMLElement>(MM_SELECTORS.TAB_LIST)
  if (!tabList) return

  // Find Plugin Settings group
  // It is usually a div with role="group" that contains 'НАСТРОЙКИ ПЛАГИНА' header or other plugin buttons
  // The user provided HTML shows: <div role="group" aria-labelledby="userSettingsModal.pluginPreferences.header">
  // <div role="heading" ...>НАСТРОЙКИ ПЛАГИНА</div> ... </div>
  
  let pluginGroup = tabList.querySelector<HTMLElement>(MM_SELECTORS.PLUGIN_PREFERENCES_HEADER)
  
  // If no plugin group exists, we might need to create it or append to the main list if that's how it works when no plugins are present.
  // But usually there is a General group. Let's try to find where to insert.
  // If pluginGroup exists, we append there.
  
  if (!pluginGroup) {
    // Check if we already created it?
    // Or maybe we should append to the end of tabList if no plugin group found.
    // For now, let's assume we can append to the last group or create a new one.
    // But let's look for existing buttons to clone structure.
    const lastGroup = tabList.lastElementChild as HTMLElement
    if (lastGroup) {
      pluginGroup = lastGroup
    }
  }

  if (!pluginGroup) return

  if (pluginGroup.querySelector(`#${EXTENSION_SETTINGS_BUTTON_ID}`)) return

  const button = document.createElement('button')
  button.id = EXTENSION_SETTINGS_BUTTON_ID
  button.className = 'cursor--pointer style--none nav-pills__tab'
  button.setAttribute('aria-label', t('settings_title'))
  button.setAttribute('role', 'tab')
  button.setAttribute('aria-selected', 'false')
  button.tabIndex = -1
  button.setAttribute('aria-controls', EXTENSION_SETTINGS_TAB_ID)
  
  // Icon
  const icon = document.createElement('span')
  icon.className = 'icon'
  icon.innerHTML = matterUiIcon
  icon.style.width = '16px'
  icon.style.height = '16px'
  icon.style.display = 'inline-flex'
  icon.style.alignItems = 'center'
  icon.style.justifyContent = 'center'
  icon.style.verticalAlign = 'middle'
  icon.style.marginRight = '8px'
  
  const svg = icon.querySelector('svg')
  if (svg) {
    svg.style.width = '100%'
    svg.style.height = '100%'
    svg.style.fill = 'currentColor'
  }
  
  button.appendChild(icon)
  button.appendChild(document.createTextNode(t('settings_title')))
  
  // Add click listener
  button.addEventListener('click', (e) => {
    e.preventDefault()
    activateSettingsTab(modal)
  })

  // Handle switching away from our tab
  tabList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const clickedTab = target.closest(MM_SELECTORS.NAV_PILLS_TAB)
    
    if (clickedTab && clickedTab.id !== EXTENSION_SETTINGS_BUTTON_ID) {
       // Deactivate my tab
       const myTab = modal.querySelector<HTMLElement>(`#${EXTENSION_SETTINGS_BUTTON_ID}`)
       if (myTab) {
         myTab.classList.remove('active')
         myTab.setAttribute('aria-selected', 'false')
       }
       
       // Hide my panel
       const myPanel = modal.querySelector<HTMLElement>(`#${EXTENSION_SETTINGS_TAB_ID}`)
       if (myPanel) {
         myPanel.style.display = 'none'
         myPanel.classList.add('hidden')
       }
    }
  })

  pluginGroup.appendChild(button)
}

const injectSettingsPanel = (modal: HTMLElement) => {
  const contentContainer = modal.querySelector<HTMLElement>(MM_SELECTORS.SETTINGS_CONTENT)
  if (!contentContainer) return

  if (contentContainer.querySelector(`#${EXTENSION_SETTINGS_TAB_ID}`)) return

  const panel = document.createElement('div')
  panel.id = EXTENSION_SETTINGS_TAB_ID
  panel.setAttribute('role', 'tabpanel')
  panel.className = 'hidden' // Start hidden
  panel.style.display = 'none'

  // Header
  const headerDiv = document.createElement('div')
  headerDiv.className = 'modal-header'
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'close'
  closeBtn.dataset.dismiss = 'modal'
  closeBtn.innerHTML = '<span aria-hidden="true">×</span>'
  // We can just rely on bubbling or attach listener if needed, but 'data-dismiss' might be handled by MM.
  // Actually we should replicate the header structure:
  // <div class="modal-header"><button ... class="close" ...>...</button><h4 class="modal-title">...</h4></div>
  
  const titleH4 = document.createElement('h4')
  titleH4.className = 'modal-title'
  const backDiv = document.createElement('div')
  backDiv.className = 'modal-back'
  backDiv.innerHTML = '<i class="fa fa-angle-left" aria-label="Значок сворачивания"></i>' // This is for mobile usually
  const titleSpan = document.createElement('span')
  titleSpan.textContent = t('settings_header')
  
  titleH4.appendChild(backDiv)
  titleH4.appendChild(titleSpan)
  headerDiv.appendChild(closeBtn)
  headerDiv.appendChild(titleH4)
  
  panel.appendChild(headerDiv)

  // Settings Body
  const userSettingsDiv = document.createElement('div')
  userSettingsDiv.className = 'user-settings'
  
  const desktopHeader = document.createElement('div')
  desktopHeader.className = 'userSettingDesktopHeader'
  const headerH3 = document.createElement('h3')
  headerH3.className = 'tab-header'
  headerH3.textContent = t('settings_header')
  desktopHeader.appendChild(headerH3)
  userSettingsDiv.appendChild(desktopHeader)

  const divider = document.createElement('div')
  divider.className = 'divider-dark first'
  userSettingsDiv.appendChild(divider)

  // Settings Rows
  userSettingsDiv.appendChild(createSettingRow(SETTING_RESIZER_KEY, t('setting_resizer_title'), t('setting_resizer_desc'), true))
  userSettingsDiv.appendChild(createDivider())
  userSettingsDiv.appendChild(createSettingRow(SETTING_DM_KEY, t('setting_dm_title'), t('setting_dm_desc'), false))
  userSettingsDiv.appendChild(createDivider())
  userSettingsDiv.appendChild(createSettingRow(SETTING_CALLS_KEY, t('setting_calls_title'), t('setting_calls_desc'), false))

  panel.appendChild(userSettingsDiv)
  contentContainer.appendChild(panel)
}

const createDivider = () => {
  const div = document.createElement('div')
  div.className = 'divider-light'
  return div
}

const activateSettingsTab = (modal: HTMLElement) => {
  // Deactivate all tabs
  const tabs = modal.querySelectorAll<HTMLElement>(MM_SELECTORS.NAV_PILLS_TAB)
  tabs.forEach(tab => {
    tab.classList.remove('active')
    tab.setAttribute('aria-selected', 'false')
  })

  // Activate our tab
  const ourTab = modal.querySelector<HTMLElement>(`#${EXTENSION_SETTINGS_BUTTON_ID}`)
  if (ourTab) {
    ourTab.classList.add('active')
    ourTab.setAttribute('aria-selected', 'true')
  }

  // Hide all panels
  const panels = modal.querySelectorAll<HTMLElement>('.settings-content div > div[role="tabpanel"]')
  panels.forEach(p => {
    p.style.display = 'none'
  })

  // Show our panel
  const ourPanel = modal.querySelector<HTMLElement>(`#${EXTENSION_SETTINGS_TAB_ID}`)
  if (ourPanel) {
    ourPanel.style.display = 'block'
    ourPanel.classList.remove('hidden')
  }
}

const isEnabled = (key: string, defaultVal: boolean = false) => {
  return isFeatureEnabled(key, defaultVal)
}

const setEnabled = (key: string, val: boolean) => {
  setFeatureEnabled(key, val)
}

const createSettingRow = (key: string, title: string, desc: string, defaultVal: boolean) => {
  const container = document.createElement('div')
  
  // Render Min View
  const renderMin = () => {
    container.innerHTML = ''
    container.className = 'section-min'
    
    const header = document.createElement('div')
    header.className = 'secion-min__header'
    
    const h4 = document.createElement('h4')
    h4.className = 'section-min__title'
    h4.textContent = title
    
    const editBtn = document.createElement('button')
    editBtn.className = 'color--link style--none section-min__edit'
    editBtn.innerHTML = '<i class="icon-pencil-outline" aria-hidden="true" title="Значок редактирования"></i><span>' + t('label_edit') + '</span>'
    editBtn.onclick = () => renderMax()

    header.appendChild(h4)
    header.appendChild(editBtn)
    
    const descDiv = document.createElement('div')
    descDiv.className = 'section-min__describe'
    const enabled = isEnabled(key, defaultVal)
    descDiv.textContent = enabled ? t('label_on') : t('label_off')

    container.appendChild(header)
    container.appendChild(descDiv)
  }

  // Render Max View (Edit Mode)
  const renderMax = () => {
    container.innerHTML = ''
    container.className = 'section-max form-horizontal'
    
    const h4 = document.createElement('h4')
    h4.className = 'col-sm-12 section-title'
    h4.textContent = title
    
    const contentDiv = document.createElement('div')
    contentDiv.className = 'sectionContent col-sm-10 col-sm-offset-2'
    
    const listDiv = document.createElement('div')
    listDiv.className = 'setting-list'
    
    const itemDiv = document.createElement('div')
    itemDiv.className = 'setting-list-item'
    
    const fieldset = document.createElement('fieldset')
    const legend = document.createElement('legend')
    legend.className = 'form-legend hidden-label'
    legend.textContent = title
    fieldset.appendChild(legend)

    const currentVal = isEnabled(key, defaultVal)
    let tempVal = currentVal

    const createRadio = (val: boolean, labelText: string) => {
      const radioDiv = document.createElement('div')
      radioDiv.className = 'radio'
      const label = document.createElement('label')
      const input = document.createElement('input')
      input.type = 'radio'
      input.name = key
      input.checked = val === currentVal
      input.onchange = () => { tempVal = val }
      
      const span = document.createElement('span')
      span.textContent = labelText
      
      label.appendChild(input)
      label.appendChild(span)
      radioDiv.appendChild(label)
      radioDiv.appendChild(document.createElement('br'))
      return radioDiv
    }

    fieldset.appendChild(createRadio(true, t('label_on')))
    fieldset.appendChild(createRadio(false, t('label_off')))
    
    const descDiv = document.createElement('div')
    descDiv.className = 'mt-5'
    descDiv.innerHTML = `<span>${desc}</span>`
    fieldset.appendChild(descDiv)
    
    itemDiv.appendChild(fieldset)
    
    const actionsDiv = document.createElement('div')
    actionsDiv.className = 'setting-list-item'
    actionsDiv.appendChild(document.createElement('hr'))
    
    const saveBtn = document.createElement('button')
    saveBtn.className = 'btn btn-primary'
    saveBtn.textContent = t('label_save')
    saveBtn.onclick = () => {
      setEnabled(key, tempVal)
      // Reload page to apply changes? Or trigger events?
      // For now, we just save. Features should listen or check on load.
      // Ideally we reload page or dispatch event.
      // Let's dispatch a custom event.
      window.dispatchEvent(new CustomEvent('mm-extension-setting-changed', { detail: { key, value: tempVal } }))
      
      // Also reload page if requested by user? "Пока не сделали, сделаем сам функционал позже"
      // But resizer and DM are already working. Resizer checks logic on load. DM too.
      // So reload might be needed for full effect, or we can just leave it as is.
      // A simple reload prompt or auto-reload is good.
      // But user didn't ask for reload.
      
      renderMin()
    }
    
    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'btn btn-tertiary'
    cancelBtn.textContent = t('label_cancel')
    cancelBtn.onclick = () => renderMin()
    
    actionsDiv.appendChild(saveBtn)
    actionsDiv.appendChild(cancelBtn)
    
    listDiv.appendChild(itemDiv)
    listDiv.appendChild(actionsDiv)
    contentDiv.appendChild(listDiv)
    
    container.appendChild(h4)
    container.appendChild(contentDiv)
  }

  renderMin()
  return container
}
