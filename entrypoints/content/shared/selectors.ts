// Mattermost specific selectors
export const MM_SELECTORS = {
  // Team Sidebar
  TEAM_SIDEBAR: '.team-sidebar',
  DROPPABLE_TEAMS: '[data-rbd-droppable-id="my_teams"]',
  DRAGGABLE_TEAM_ITEM: 'a.draggable-team-container',
  TEAM_CONTAINER: '.team-container',
  TEAM_ICON: '.TeamIcon',
  
  // Sidebar Channels
  SIDEBAR_CHANNEL_GROUP: '.SidebarChannelGroup',
  SIDEBAR_CHANNEL_GROUP_HEADER_TEXT: '.SidebarChannelGroupHeader_text',
  CHANNEL_LIST_ITEM: 'li, .SidebarChannel, .SidebarChannelGroup',
  SIDEBAR_CHANNEL_BADGE: '.badge, .SidebarChannelBadge, .SidebarChannelBadge__icon',
  
  // Headers
  TEAM_HEADER: [
    '.team__name',
    '.sidebar-header__title',
    '[data-testid="teamSidebarHeader"] .team__name',
    '.SidebarHeader .team__name',
    '.SidebarHeader h1',
    '[data-testid="teamSidebarHeader"] h1',
    '.sidebarHeaderContainer h1'
  ],
  ICON_CHEVRON_DOWN: '.icon-chevron-down',
  
  // Settings Modal
  USER_SETTINGS_MODAL: '.UserSettingsModal',
  TAB_LIST: '#tabList',
  PLUGIN_PREFERENCES_HEADER: '[aria-labelledby="userSettingsModal.pluginPreferences.header"]',
  SETTINGS_CONTENT: '.settings-content div',
  NAV_PILLS_TAB: '.nav-pills__tab',
  
  // Calls
  CALLS_JOIN_BUTTON: '#calls-join-button',
  
  // Detection
  ROOT: '#root',
  VIEW_CONTAINER: '#mattermost-view-container',
  CHANNEL_VIEW: '.channel-view'
}
