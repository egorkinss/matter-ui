import {MM_SELECTORS} from './selectors'

export const findTeamSidebar = () => {
  return document.querySelector<HTMLElement>(MM_SELECTORS.TEAM_SIDEBAR)
}
