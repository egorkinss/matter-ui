import {
  TEAM_SIDEBAR_EXPANDED_CLASS,
  TEAM_SIDEBAR_EXPANDED_MAX_WIDTH,
  TEAM_SIDEBAR_EXPANDED_MIN_WIDTH,
  TEAM_SIDEBAR_EXPANDED_THRESHOLD,
  TEAM_SIDEBAR_RESIZER_ID
} from '../../shared/constants'
import {isFeatureEnabled} from '../../shared/utils'
import {SETTING_RESIZER_KEY} from '../extension-settings/constants'

const STORAGE_KEY_WIDTH = 'mm-team-sidebar-width'
const ANIMATION_DURATION_MS = 300
const ANIMATING_CLASS = 'mm-team-sidebar-animating'



const updateExpandedClass = (container: HTMLElement, overrideWidth?: number) => {
  const width = overrideWidth ?? container.getBoundingClientRect().width
  const expanded = width > TEAM_SIDEBAR_EXPANDED_THRESHOLD
  container.classList.toggle(TEAM_SIDEBAR_EXPANDED_CLASS, expanded)
}

export const setupTeamSidebarResizer = (container: HTMLElement) => {
  // Subscribe to settings changes
  window.addEventListener('mm-extension-setting-changed', (event: any) => {
    if (event.detail?.key === SETTING_RESIZER_KEY) {
      updateFeatureState(container)
    }
  })
  
  updateFeatureState(container)
}

const updateFeatureState = (container: HTMLElement) => {
  const enabled = isFeatureEnabled(SETTING_RESIZER_KEY, true)
  
  if (!enabled) {
    teardownTeamSidebarResizer(container)
    return
  }
  
  initTeamSidebarResizer(container)
}

const teardownTeamSidebarResizer = (container: HTMLElement) => {
  const handle = container.querySelector(`#${TEAM_SIDEBAR_RESIZER_ID}`)
  if (handle) handle.remove()
  
  // Remove classes and styles
  container.classList.remove(TEAM_SIDEBAR_EXPANDED_CLASS)
  container.classList.remove(ANIMATING_CLASS)
  
  // Reset width to default (min-width usually defines it in CSS, but we set inline styles)
  // We should remove inline width/maxWidth to let CSS take over
  container.style.width = ''
  container.style.maxWidth = ''
  container.style.flex = '' // We set flex: 0 0 auto
  container.style.minWidth = '' // We set minWidth based on initial
  container.style.position = '' // We might have set relative
}

const initTeamSidebarResizer = (container: HTMLElement) => {
  if (container.querySelector(`#${TEAM_SIDEBAR_RESIZER_ID}`)) return
  
  const style = getComputedStyle(container)
  if (style.position !== 'relative') {
    container.style.position = 'relative'
  }
  const initialWidth = container.getBoundingClientRect().width
  container.style.flex = '0 0 auto'
  container.style.minWidth = `${Math.max(TEAM_SIDEBAR_EXPANDED_MIN_WIDTH, Math.round(initialWidth))}px`
  
  // Restore state from localStorage
  const savedWidth = localStorage.getItem(STORAGE_KEY_WIDTH)
  if (savedWidth) {
    const width = parseFloat(savedWidth)
    if (!isNaN(width)) {
      container.style.width = `${width}px`
      container.style.maxWidth = `${width}px`
    }
  }
  
  updateExpandedClass(container)

  const handle = document.createElement('div')
  handle.id = TEAM_SIDEBAR_RESIZER_ID
  handle.style.position = 'absolute'
  handle.style.top = '0'
  handle.style.right = '0'
  handle.style.width = '6px'
  handle.style.height = '100%'
  handle.style.cursor = 'col-resize'
  handle.style.zIndex = '9999'
  container.appendChild(handle)

  let isDragging = false
  let startX = 0
  let startWidth = 0

  const saveState = () => {
    const width = container.getBoundingClientRect().width
    localStorage.setItem(STORAGE_KEY_WIDTH, width.toString())
  }

  const onMouseMove = (event: MouseEvent) => {
    if (!isDragging) return
    const minWidth = parseFloat(container.style.minWidth) || TEAM_SIDEBAR_EXPANDED_MIN_WIDTH
    const next = Math.min(
      TEAM_SIDEBAR_EXPANDED_MAX_WIDTH,
      Math.max(minWidth, startWidth + (event.clientX - startX))
    )
    container.style.width = `${next}px`
    container.style.maxWidth = `${next}px`
    updateExpandedClass(container)
  }

  const onMouseUp = () => {
    if (!isDragging) return
    isDragging = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    updateExpandedClass(container)
    saveState()
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  handle.addEventListener('mousedown', (event) => {
    event.preventDefault()
    isDragging = true
    startX = event.clientX
    startWidth = container.getBoundingClientRect().width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  })

  handle.addEventListener('dblclick', (event) => {
    event.preventDefault()
    const currentWidth = container.getBoundingClientRect().width
    const isExpanded = currentWidth > TEAM_SIDEBAR_EXPANDED_THRESHOLD
    
    let nextWidth: number
    if (isExpanded) {
      // Collapse
      nextWidth = parseFloat(container.style.minWidth) || TEAM_SIDEBAR_EXPANDED_MIN_WIDTH
    } else {
      // Expand to max
      nextWidth = TEAM_SIDEBAR_EXPANDED_MAX_WIDTH
    }
    
    container.classList.add(ANIMATING_CLASS)
    container.style.width = `${nextWidth}px`
    container.style.maxWidth = `${nextWidth}px`
    
    // If expanding: apply class immediately so content is visible during animation
    if (!isExpanded) {
      updateExpandedClass(container, nextWidth)
    }
    
    saveState()
    
    setTimeout(() => {
      container.classList.remove(ANIMATING_CLASS)
      // If collapsing: apply class after animation so content stays visible until the end
      if (isExpanded) {
        updateExpandedClass(container, nextWidth)
      }
    }, ANIMATION_DURATION_MS)
  })
}
