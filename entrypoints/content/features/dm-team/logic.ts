import dmIconSvg from '../../icons/direct_message.svg?raw'
import {findTeamSidebar} from '../../shared/dom'
import {MM_SELECTORS} from '../../shared/selectors'
import {isFeatureEnabled, setFeatureEnabled} from '../../shared/utils'
import {SETTING_DM_KEY} from '../extension-settings/constants'
import {t} from '../multilanguage/logic'

const DM_VIEW_CLASS = 'mm-dm-view-active'
const DM_VIEW_HAS_UNREAD_CLASS = 'mm-dm-view-has-unread'
const DM_VIEW_STORAGE_KEY = 'mm-dm-view-state'
const DM_GROUP_PREFIX = 'direct_messages_'
const UNREAD_GROUP_PREFIX = 'unreads_'
const DM_GROUP_HIDDEN_CLASS = 'mm-dm-group-hidden'
const DM_GROUP_SHOW_CLASS = 'mm-dm-group-show'
const DM_UNREAD_HIDDEN_CLASS = 'mm-dm-unread-hidden'
const DM_GROUP_NO_HEADER_CLASS = 'mm-dm-group-no-header'
const DM_GROUP_HIDE_ADD_CLASS = 'mm-dm-group-hide-add'
const UNREAD_DM_HIDDEN_CLASS = 'mm-unread-dm-hidden'
const UNREAD_EMPTY_CLASS = 'mm-unread-empty'
const DM_BADGE_STALE_MS = 1500
const DM_ICON_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(dmIconSvg)}`
const DM_FEATURE_ENABLED_CLASS = 'mm-dm-feature-enabled'
let dmSyncScheduled = false
let dmSyncInProgress = false
let dmIgnoreMutationsUntil = 0
let unreadFilterScheduled = false
let dmUnreadLastCount = 0
let dmUnreadLastUpdateAt = 0

// Listener references for cleanup
let dmClickHandler: ((event: Event) => void) | null = null
let dmKeydownHandler: ((event: KeyboardEvent) => void) | null = null
let dmObserver: MutationObserver | null = null

export const setupDmPseudoTeam = (sidebar: HTMLElement) => {
  // Subscribe to settings changes
  window.addEventListener('mm-extension-setting-changed', (event: any) => {
    if (event.detail?.key === SETTING_DM_KEY) {
      updateFeatureState(sidebar)
    }
  })

  // Initial check
  updateFeatureState(sidebar)
}

const updateFeatureState = (sidebar: HTMLElement) => {
  const enabled = isFeatureEnabled(SETTING_DM_KEY)
  
  if (!enabled) {
    teardownDmPseudoTeam(sidebar)
    return
  }

  initDmPseudoTeam(sidebar)
}

const teardownDmPseudoTeam = (sidebar: HTMLElement) => {
  // Remove DM item and divider
  const droppable = sidebar.querySelector(MM_SELECTORS.DROPPABLE_TEAMS) as HTMLElement | null
  if (droppable) {
    const item = droppable.querySelector('.mm-dm-team-item')
    if (item) item.remove()
    
    const divider = droppable.querySelector('.mm-dm-team-divider')
    if (divider) divider.remove()
    
    // Cleanup listeners
    if (dmClickHandler) {
      droppable.removeEventListener('click', dmClickHandler)
      dmClickHandler = null
    }
    if (dmKeydownHandler) {
      droppable.removeEventListener('keydown', dmKeydownHandler as EventListener)
      dmKeydownHandler = null
    }
    delete droppable.dataset.mmDmHandlersAttached
  }
  
  // Disconnect observer
  if (dmObserver) {
    dmObserver.disconnect()
    dmObserver = null
    delete document.documentElement.dataset.mmDmObserverAttached
  }
  
  // Remove feature enabled class
  document.documentElement.classList.remove(DM_FEATURE_ENABLED_CLASS)

  // Reset view state
  setDmViewEnabled(false) // This will reset classes and restore original view
  
  // Cleanup any residual classes that might hide DMs or Unreads
  const hiddenGroups = document.querySelectorAll(`.${DM_GROUP_HIDDEN_CLASS}`)
  hiddenGroups.forEach(el => el.classList.remove(DM_GROUP_HIDDEN_CLASS))

  const shownGroups = document.querySelectorAll(`.${DM_GROUP_SHOW_CLASS}`)
  shownGroups.forEach(el => el.classList.remove(DM_GROUP_SHOW_CLASS))

  const noHeaderGroups = document.querySelectorAll(`.${DM_GROUP_NO_HEADER_CLASS}`)
  noHeaderGroups.forEach(el => el.classList.remove(DM_GROUP_NO_HEADER_CLASS))

  const hideAddGroups = document.querySelectorAll(`.${DM_GROUP_HIDE_ADD_CLASS}`)
  hideAddGroups.forEach(el => el.classList.remove(DM_GROUP_HIDE_ADD_CLASS))

  const hiddenUnreadDms = document.querySelectorAll(`.${DM_UNREAD_HIDDEN_CLASS}`)
  hiddenUnreadDms.forEach(el => el.classList.remove(DM_UNREAD_HIDDEN_CLASS))

  const hiddenUnreadItems = document.querySelectorAll(`.${UNREAD_DM_HIDDEN_CLASS}`)
  hiddenUnreadItems.forEach(el => el.classList.remove(UNREAD_DM_HIDDEN_CLASS))
  
  const emptyUnreadGroups = document.querySelectorAll(`.${UNREAD_EMPTY_CLASS}`)
  emptyUnreadGroups.forEach(el => el.classList.remove(UNREAD_EMPTY_CLASS))

  // Restore headers if they were modified
  restoreGroupHeaders()
  
  // Restore DM header in team view if modified
  const header = findTeamHeader()
  if (header) {
      if (header.dataset.mmOriginalTeamName) {
          header.textContent = header.dataset.mmOriginalTeamName
          delete header.dataset.mmOriginalTeamName
      }
      header.classList.remove('mm-dm-team-header-hidden')
      const toggleButton = findTeamHeaderButton(header)
      if (toggleButton && toggleButton.dataset.mmOriginalDisplay) {
          toggleButton.style.display = toggleButton.dataset.mmOriginalDisplay
          delete toggleButton.dataset.mmOriginalDisplay
      }
  }

  // If feature is disabled, we should definitely exit the DM view if we are in it.
  if (isDmViewEnabled()) {
    setDmViewEnabled(false)
  }
}

const initDmPseudoTeam = (sidebar: HTMLElement) => {
  // Add feature enabled class
  document.documentElement.classList.add(DM_FEATURE_ENABLED_CLASS)
  
  const droppable = sidebar.querySelector(MM_SELECTORS.DROPPABLE_TEAMS) as HTMLElement | null
  if (!droppable) return
  let item = droppable.querySelector<HTMLAnchorElement>('.mm-dm-team-item')
  if (!item) {
    item = buildDmTeamItem()
    droppable.insertBefore(item, droppable.firstChild)
  }
  let divider = droppable.querySelector<HTMLElement>('.mm-dm-team-divider')
  if (!divider) {
    divider = document.createElement('div')
    divider.className = 'mm-dm-team-divider'
    item.insertAdjacentElement('afterend', divider)
  }
  
  if (droppable.dataset.mmDmHandlersAttached !== 'true') {
    droppable.dataset.mmDmHandlersAttached = 'true'
    
    dmClickHandler = (event: Event) => {
      const target = (event.target as HTMLElement | null)?.closest(MM_SELECTORS.DRAGGABLE_TEAM_ITEM) as HTMLAnchorElement | null
      if (!target) return
      if (target.classList.contains('mm-dm-team-item')) {
        event.preventDefault()
        setDmViewEnabled(true)
        return
      }
      if (isDmViewEnabled()) {
        setDmViewEnabled(false)
      }
    }
    
    dmKeydownHandler = (event: any) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      const target = (event.target as HTMLElement | null)?.closest(MM_SELECTORS.DRAGGABLE_TEAM_ITEM) as HTMLAnchorElement | null
      if (!target || !target.classList.contains('mm-dm-team-item')) return
      event.preventDefault()
      setDmViewEnabled(true)
    }
    
    droppable.addEventListener('click', dmClickHandler)
    droppable.addEventListener('keydown', dmKeydownHandler)
  }
  
  if (document.documentElement.dataset.mmDmObserverAttached !== 'true') {
    document.documentElement.dataset.mmDmObserverAttached = 'true'
    dmObserver = new MutationObserver(() => {
      if (dmSyncInProgress) return
      if (Date.now() < dmIgnoreMutationsUntil) return
      if (isDmViewEnabled()) {
        scheduleDmSync()
        return
      }
      scheduleUnreadFilter()
    })
    dmObserver.observe(document.documentElement, {childList: true, subtree: true})
  }
  syncDmViewState()
}

const buildDmTeamItem = () => {
  const item = document.createElement('a')
  item.className = 'draggable-team-container mm-dm-team-item'
  item.href = '#'
  item.setAttribute('role', 'button')
  item.setAttribute('aria-label', t('dm_item_aria_label'))
  item.tabIndex = 0

  const teamContainer = document.createElement('div')
  teamContainer.className = 'team-container'

  const teamBtn = document.createElement('div')
  teamBtn.className = 'team-btn'

  const icon = document.createElement('div')
  icon.className = 'TeamIcon TeamIcon__sm withImage'

  const iconContent = document.createElement('div')
  iconContent.className = 'TeamIcon__content'

  const iconImage = document.createElement('div')
  iconImage.className = 'TeamIcon__image TeamIcon__sm mm-dm-team-icon'
  iconImage.setAttribute('role', 'img')
  iconImage.setAttribute('aria-label', t('dm_item_aria_label'))
  iconImage.style.backgroundImage = `url("${DM_ICON_DATA_URL}")`

  iconContent.appendChild(iconImage)
  icon.appendChild(iconContent)
  teamBtn.appendChild(icon)
  teamContainer.appendChild(teamBtn)
  const badge = document.createElement('span')
  badge.className = 'badge badge-max-number pull-right small mm-dm-unread-badge'
  teamContainer.appendChild(badge)

  const label = document.createElement('span')
  label.className = 'mm-team-label'
  label.textContent = t('dm_item_label')

  item.appendChild(teamContainer)
  item.appendChild(label)
  return item
}

const isDmViewEnabled = () => {
  return isFeatureEnabled(DM_VIEW_STORAGE_KEY)
}

const setDmViewEnabled = (enabled: boolean) => {
  setFeatureEnabled(DM_VIEW_STORAGE_KEY, enabled)
  syncDmViewState()
}

const syncDmViewState = () => {
  if (dmSyncInProgress) return
  dmSyncInProgress = true
  try {
    dmIgnoreMutationsUntil = Date.now() + 150
    const enabled = isDmViewEnabled()
    document.documentElement.classList.toggle(DM_VIEW_CLASS, enabled)
    const item = document.querySelector<HTMLAnchorElement>('.mm-dm-team-item')
    if (item) {
      item.classList.toggle('mm-dm-team-active', enabled)
    }
    syncActiveTeamsForDm(enabled)
    if (!enabled) {
      resetDmViewState()
      syncUnreadFilterForTeams()
      updateDmHeader(false)
      return
    }
    const unreadGroup = findSidebarGroupByPrefix(UNREAD_GROUP_PREFIX) ?? findSidebarGroupByHeaderText('unreads')
    const dmGroup = findSidebarGroupByPrefix(DM_GROUP_PREFIX)
    const badgeCount = countUnreadDmFromDmGroup(dmGroup)
    updateDmUnreadBadge(badgeCount, isDmGroupDataReady(dmGroup))
    const unreadDmCount = unreadGroup ? filterUnreadGroup(unreadGroup) : 0
    const hasUnread = unreadDmCount > 0
    document.documentElement.classList.toggle(DM_VIEW_HAS_UNREAD_CLASS, hasUnread)
    if (unreadGroup) {
      unreadGroup.classList.remove(UNREAD_EMPTY_CLASS)
      unreadGroup.classList.toggle(DM_GROUP_HIDDEN_CLASS, !hasUnread)
      unreadGroup.classList.toggle(DM_GROUP_SHOW_CLASS, hasUnread)
      setGroupHeaderText(unreadGroup, hasUnread ? t('unread_header') : null)
    }
    if (dmGroup) {
      dmGroup.classList.add(DM_GROUP_SHOW_CLASS)
      dmGroup.classList.toggle(DM_GROUP_NO_HEADER_CLASS, !hasUnread)
      dmGroup.classList.add(DM_GROUP_HIDE_ADD_CLASS)
      setGroupHeaderText(dmGroup, hasUnread ? t('dm_header') : null)
    }
    updateDmHeader(true)
  } finally {
    dmSyncInProgress = false
  }
}

const scheduleDmSync = () => {
  if (dmSyncScheduled) return
  dmSyncScheduled = true
  window.requestAnimationFrame(() => {
    dmSyncScheduled = false
    syncDmViewState()
  })
}

const scheduleUnreadFilter = () => {
  if (unreadFilterScheduled) return
  unreadFilterScheduled = true
  window.requestAnimationFrame(() => {
    unreadFilterScheduled = false
    syncUnreadFilterForTeams()
  })
}

const updateDmHeader = (enabled: boolean) => {
  const header = findTeamHeader()
  if (!header) return
  if (!header.dataset.mmOriginalTeamName && header.textContent) {
    header.dataset.mmOriginalTeamName = header.textContent
  }
  const toggleButton = findTeamHeaderButton(header)
  if (toggleButton && !toggleButton.dataset.mmOriginalDisplay) {
    toggleButton.dataset.mmOriginalDisplay = toggleButton.style.display
  }
  if (enabled) {
    header.classList.remove('mm-dm-team-header-hidden')
    header.textContent = t('dm_header')
    if (toggleButton) {
      if (toggleButton.style.display !== 'none') {
        toggleButton.style.display = 'none'
      }
    }
    return
  }
  const original = header.dataset.mmOriginalTeamName
  if (original) {
    if (header.textContent !== original) {
      header.textContent = original
    }
  }
  if (toggleButton) {
    const nextDisplay = toggleButton.dataset.mmOriginalDisplay ?? ''
    if (toggleButton.style.display !== nextDisplay) {
      toggleButton.style.display = nextDisplay
    }
  }
}

const syncActiveTeamsForDm = (enabled: boolean) => {
  const sidebar = findTeamSidebar()
  if (!sidebar) return
  const items = Array.from(sidebar.querySelectorAll<HTMLAnchorElement>(MM_SELECTORS.DRAGGABLE_TEAM_ITEM))

  items.forEach((item) => {
    const container = item.querySelector<HTMLElement>(MM_SELECTORS.TEAM_CONTAINER)
      const icon = item.querySelector<HTMLElement>('.TeamIcon')
      if (item.classList.contains('mm-dm-team-item')) {
        const dmIcon = item.querySelector<HTMLElement>('.TeamIcon')
      if (enabled) {
        container?.classList.add('active')
        dmIcon?.classList.add('active')
      } else {
        container?.classList.remove('active')
        dmIcon?.classList.remove('active')
      }
      return
    }
    if (enabled) {
      item.classList.remove('active')
      container?.classList.remove('active')
      icon?.classList.remove('active')
      return
    }
  })
}

const resetDmViewState = () => {
  document.documentElement.classList.remove(DM_VIEW_HAS_UNREAD_CLASS)
  restoreGroupHeaders()
  const hiddenGroups = document.querySelectorAll<HTMLElement>(`.${DM_GROUP_HIDDEN_CLASS}`)
  hiddenGroups.forEach((group) => group.classList.remove(DM_GROUP_HIDDEN_CLASS))
  const shownGroups = document.querySelectorAll<HTMLElement>(`.${DM_GROUP_SHOW_CLASS}`)
  shownGroups.forEach((group) => group.classList.remove(DM_GROUP_SHOW_CLASS))
  const hiddenItems = document.querySelectorAll<HTMLElement>(`.${DM_UNREAD_HIDDEN_CLASS}`)
  hiddenItems.forEach((item) => item.classList.remove(DM_UNREAD_HIDDEN_CLASS))
  const noHeaderGroups = document.querySelectorAll<HTMLElement>(`.${DM_GROUP_NO_HEADER_CLASS}`)
  noHeaderGroups.forEach((group) => group.classList.remove(DM_GROUP_NO_HEADER_CLASS))
  const hideAddGroups = document.querySelectorAll<HTMLElement>(`.${DM_GROUP_HIDE_ADD_CLASS}`)
  hideAddGroups.forEach((group) => group.classList.remove(DM_GROUP_HIDE_ADD_CLASS))
}

const syncUnreadFilterForTeams = () => {
  dmIgnoreMutationsUntil = Date.now() + 150
  if (isDmViewEnabled()) return
  const unreadGroup = findSidebarGroupByPrefix(UNREAD_GROUP_PREFIX) ?? findSidebarGroupByHeaderText('unreads')
  const dmGroup = findSidebarGroupByPrefix(DM_GROUP_PREFIX)
  const dmDataReady = isDmGroupDataReady(dmGroup)
  if (!unreadGroup) {
    updateDmUnreadBadge(countUnreadDmFromDmGroup(dmGroup), dmDataReady)
    return
  }
  let visibleCount = 0
  const items = Array.from(unreadGroup.querySelectorAll<HTMLAnchorElement>('a'))
  items.forEach((item) => {
    const shouldHide = isDirectMessageLink(item)
    const container = findChannelListItem(item)
    if (shouldHide) {
      item.classList.add(UNREAD_DM_HIDDEN_CLASS)
      if (container) {
        container.classList.add(UNREAD_DM_HIDDEN_CLASS)
      }
    } else {
      item.classList.remove(UNREAD_DM_HIDDEN_CLASS)
      if (container) {
        container.classList.remove(UNREAD_DM_HIDDEN_CLASS)
      }
      visibleCount += 1
    }
  })
  updateDmUnreadBadge(countUnreadDmFromDmGroup(dmGroup), dmDataReady)
  if (visibleCount === 0) {
    unreadGroup.classList.add(UNREAD_EMPTY_CLASS)
  } else {
    unreadGroup.classList.remove(UNREAD_EMPTY_CLASS)
  }
}

const findSidebarGroupByPrefix = (prefix: string) => {
  const direct = document.querySelector(`[data-rbd-draggable-id^="${prefix}"]`) as HTMLElement | null
  if (direct) {
    return direct.classList.contains('SidebarChannelGroup') ? direct : direct.closest<HTMLElement>(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP)
  }
  const droppable = document.querySelector(`[data-rbd-droppable-id^="${prefix}"]`) as HTMLElement | null
  return droppable?.closest<HTMLElement>(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP) ?? null
}

const findSidebarGroupByHeaderText = (text: string) => {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP_HEADER_TEXT))
  const header = nodes.find((node) => node.textContent?.trim().toLowerCase() === text)
  return header?.closest<HTMLElement>(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP) ?? null
}

const setGroupHeaderText = (group: HTMLElement, title: string | null) => {
  const headerText = group.querySelector<HTMLElement>(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP_HEADER_TEXT)
  if (!headerText) return
  if (headerText.dataset.mmOriginalHeaderText === undefined) {
    headerText.dataset.mmOriginalHeaderText = headerText.textContent ?? ''
  }
  if (title === null) {
    const original = headerText.dataset.mmOriginalHeaderText ?? ''
    if (headerText.textContent !== original) {
      headerText.textContent = original
    }
    return
  }
  if (headerText.textContent !== title) {
    headerText.textContent = title
  }
}

const restoreGroupHeaders = () => {
  const headers = document.querySelectorAll<HTMLElement>(MM_SELECTORS.SIDEBAR_CHANNEL_GROUP_HEADER_TEXT)
  headers.forEach((header) => {
    if (header.dataset.mmOriginalHeaderText !== undefined) {
      header.textContent = header.dataset.mmOriginalHeaderText
      delete header.dataset.mmOriginalHeaderText
    }
  })
}

const filterUnreadGroup = (group: HTMLElement) => {
  const items = Array.from(group.querySelectorAll<HTMLAnchorElement>('a'))
  let dmCount = 0
  items.forEach((item) => {
    const container = findChannelListItem(item)
    if (isDirectMessageLink(item)) {
      item.classList.remove(DM_UNREAD_HIDDEN_CLASS)
      item.classList.remove(UNREAD_DM_HIDDEN_CLASS)
      if (container) {
        container.classList.remove(DM_UNREAD_HIDDEN_CLASS)
        container.classList.remove(UNREAD_DM_HIDDEN_CLASS)
      }
      dmCount += 1
      return
    }
    item.classList.add(DM_UNREAD_HIDDEN_CLASS)
    if (container) {
      container.classList.add(DM_UNREAD_HIDDEN_CLASS)
    }
  })
  return dmCount
}

const isDirectMessageLink = (link: HTMLAnchorElement) => {
  const href = link.getAttribute('href') ?? ''
  return /\/messages\//.test(href)
}

const countUnreadDmFromDmGroup = (dmGroup: HTMLElement | null) => {
  if (!dmGroup) return 0
  const links = Array.from(dmGroup.querySelectorAll<HTMLAnchorElement>('a[href*="/messages/"]'))
  let count = 0
  links.forEach((link) => {
    if (isUnreadDmLink(link)) {
      count += 1
    }
  })
  return count
}

const isUnreadDmLink = (link: HTMLAnchorElement) => {
  const container = findChannelListItem(link)
  const className = `${link.className} ${container?.className ?? ''}`
  if (/unread/i.test(className)) return true
  const ariaLabel = link.getAttribute('aria-label')?.toLowerCase() ?? ''
  if (ariaLabel.includes('непрочитан')) return true
  const badge = container?.querySelector<HTMLElement>(MM_SELECTORS.SIDEBAR_CHANNEL_BADGE)
  if (badge && !badge.classList.contains('mm-dm-unread-badge')) return true
  return false
}

const isDmGroupDataReady = (dmGroup: HTMLElement | null) => {
  if (!dmGroup) return false
  return dmGroup.querySelector('a[href*="/messages/"]') !== null
}

const updateDmUnreadBadge = (count: number, isDataReady: boolean) => {
  const item = document.querySelector<HTMLElement>('.mm-dm-team-item')
  if (!item) return
  const container = item.querySelector<HTMLElement>(MM_SELECTORS.TEAM_CONTAINER)
  if (!container) return
  let badge = container.querySelector<HTMLElement>('.mm-dm-unread-badge')
  if (!badge) {
    badge = document.createElement('span')
    badge.className = 'badge badge-max-number pull-right small mm-dm-unread-badge'
    container.appendChild(badge)
  }
  if (count <= 0) {
    const now = Date.now()
    if (!isDataReady && dmUnreadLastCount > 0 && now - dmUnreadLastUpdateAt < DM_BADGE_STALE_MS) {
      return
    }
    if (badge.textContent) {
      badge.textContent = ''
    }
    badge.classList.remove('mm-dm-unread-badge-visible')
    dmUnreadLastCount = 0
    dmUnreadLastUpdateAt = now
    return
  }
  const nextText = count > 99 ? '99+' : `${count}`
  if (badge.textContent !== nextText) {
    badge.textContent = nextText
  }
  badge.classList.add('mm-dm-unread-badge-visible')
  dmUnreadLastCount = count
  dmUnreadLastUpdateAt = Date.now()
}

const findChannelListItem = (link: HTMLAnchorElement) => {
  return link.closest<HTMLElement>(MM_SELECTORS.CHANNEL_LIST_ITEM)
}

const findTeamHeader = () => {
  for (const selector of MM_SELECTORS.TEAM_HEADER) {
    const node = document.querySelector(selector) as HTMLElement | null
    if (node) return node
  }
  return null
}

const findTeamHeaderButton = (header: HTMLElement) => {
  const closestButton = header.closest('button')
  if (closestButton && closestButton.querySelector(MM_SELECTORS.ICON_CHEVRON_DOWN)) {
    return closestButton as HTMLButtonElement
  }
  const wrapper = header.closest('.SidebarHeader') ?? header.parentElement
  if (!wrapper) return null
  const buttons = Array.from(wrapper.querySelectorAll<HTMLButtonElement>('button'))
  return buttons.find((button) => button.querySelector(MM_SELECTORS.ICON_CHEVRON_DOWN)) ?? null
}
