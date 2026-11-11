// Match the existing full-width pages; other screens retain their sidebars.
const wideScreens = new Set(['driver', 'archive', 'race', 'club', 'team', 'cars', 'fun',
  'article', 'document', 'notfound', 'servers', 'account', 'settings', 'moderation', 'ops']);

export const pageHasSidebarWidgets = screen => !wideScreens.has(screen);
