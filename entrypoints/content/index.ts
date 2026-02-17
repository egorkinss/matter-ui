import './style.css'
import './features/team-sidebar-resizer/style.css'
import './features/dm-team/style.css'
import './features/disable-call-button/style.css'
import {setupTeamSidebarResizer} from './features/team-sidebar-resizer/logic'
import {setupDmPseudoTeam} from './features/dm-team/logic'
import {setupExtensionSettings} from './features/extension-settings/logic'
import {setupDisableCallButton} from './features/disable-call-button/logic'
import {findTeamSidebar} from './shared/dom'
import {MM_SELECTORS} from './shared/selectors'
import {isMattermost} from './shared/utils'
import {initLanguage} from './features/multilanguage/logic'

// Cache for team names: id -> display_name
const teamNamesCache = new Map<string, string>()
let teamNamesFetched = false

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  async main() {
    if (!isMattermost()) return

    await initLanguage()
    setupExtensionSettings()
    setupDisableCallButton()
    
    // Fetch team names immediately
    fetchTeamNames()
    
    const tryInit = () => {
      const sidebar = findTeamSidebar()
      if (!sidebar) return false
      setupTeamLabels(sidebar)
      setupTeamSidebarResizer(sidebar)
      setupDmPseudoTeam(sidebar)
      return true
    }

    if (tryInit()) return
    const observer = new MutationObserver(() => {
      if (tryInit()) observer.disconnect()
    })
    observer.observe(document.documentElement, {childList: true, subtree: true})
    window.setTimeout(() => observer.disconnect(), 10000)
  }
})

const fetchTeamNames = async () => {
  if (teamNamesFetched) return
  try {
    const response = await fetch('/api/v4/users/me/teams')
    if (response.ok) {
      const teams = await response.json()
      if (Array.isArray(teams)) {
        teams.forEach((team: any) => {
          if (team.id && team.display_name) {
            teamNamesCache.set(team.id, team.display_name)
          }
        })
        teamNamesFetched = true
        // If sidebar is already rendered, update labels
        const sidebar = findTeamSidebar()
        if (sidebar) {
          const droppable = sidebar.querySelector(MM_SELECTORS.DROPPABLE_TEAMS) as HTMLElement | null
          if (droppable) {
            // Force re-apply labels
            const labels = droppable.querySelectorAll('.mm-team-label')
            labels.forEach(l => l.remove())
            applyLabels(droppable)
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to fetch teams', e)
  }
}

const setupTeamLabels = (sidebar: HTMLElement) => {
  const droppable = sidebar.querySelector(MM_SELECTORS.DROPPABLE_TEAMS) as HTMLElement | null
  if (!droppable) return
  applyLabels(droppable)
  if (droppable.dataset.mmObserverAttached === 'true') return
  droppable.dataset.mmObserverAttached = 'true'
  const observer = new MutationObserver(() => applyLabels(droppable))
  observer.observe(droppable, {childList: true, subtree: true})
}

const applyLabels = (droppable: HTMLElement) => {
  const items = Array.from(droppable.querySelectorAll<HTMLAnchorElement>(MM_SELECTORS.DRAGGABLE_TEAM_ITEM))
  items.forEach((item) => {
    if (item.id === 'select_teamTeamButton') return
    if (item.querySelector('.mm-team-label')) return
    
    const labelText = getTeamName(item)
    if (!labelText) return
    
    const label = document.createElement('span')
    label.className = 'mm-team-label'
    label.textContent = labelText
    const teamContainer = item.querySelector('.team-container')
    if (teamContainer) {
      item.insertBefore(label, teamContainer.nextSibling)
    } else {
      item.appendChild(label)
    }
  })
}

const getTeamName = (item: HTMLAnchorElement) => {
  if (item.id === 'select_teamTeamButton') return null
  
  // 1. Try to get from API cache by ID
  const id = item.dataset.rbdDraggableId
  if (id && teamNamesCache.has(id)) {
    return teamNamesCache.get(id)
  }
  
  // 2. Fallback to old heuristic methods (better than nothing while loading)
  const iconLabel = getTeamIconLabel(item)
  if (iconLabel) return iconLabel
  
  const ariaLabel = item.getAttribute('aria-label')
  if (!ariaLabel) return null
  
  // Try to clean up common prefixes/suffixes if possible, but don't be too aggressive
  let text = ariaLabel.trim()
  // Only remove very specific Russian prefix if we are sure
  text = text.replace(/^команда\s+/i, '')
  // Remove unread suffix which is common
  text = text.replace(/\s+непрочитан\w*$/i, '')
  
  return text.trim() || null
}

const getTeamIconLabel = (item: HTMLElement) => {
  const icon = item.querySelector('[data-testid="teamIconImage"], [data-testid="teamIconInitial"]') as HTMLElement | null
  const ariaLabel = icon?.getAttribute('aria-label')?.trim()
  if (!ariaLabel) return null
  
  // Try to extract name if it matches "Team Name Team Image" pattern
  // This is a guess, but better than full string
  // If API works, this won't be used often
  
  // Russian: "команды [NAME]"
  let match = ariaLabel.match(/команды\s+(.+)$/i)
  if (match?.[1]) return match[1].trim()
  
  // English: "[NAME] Team Image" or "Team Image"
  // If it ends with "Team Image", remove it
  if (ariaLabel.endsWith(' Team Image')) {
      return ariaLabel.replace(/\s+Team Image$/, '').trim()
  }
  
  // English: "[NAME] Team Initials"
  if (ariaLabel.endsWith(' Team Initials')) {
      return ariaLabel.replace(/\s+Team Initials$/, '').trim()
  }

  return ariaLabel
}
