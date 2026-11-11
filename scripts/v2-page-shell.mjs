import {nodes, edit, setAttribute} from './seo/html-source.mjs';
import {pageHasSidebarWidgets} from '../v2/page-layout.js';

export function pageShell(html, screen) {
  if (pageHasSidebarWidgets(screen)) return html;
  const all = nodes(html), changes = [];
  for (const node of all) {
    const classes = (node.attrs.class || '').split(/\s+/);
    let tag = html.slice(node.start, node.openEnd);
    if (classes.includes('dashboard')) {
      tag = setAttribute(tag, 'class', node.attrs.class + ' page-wide');
    } else if (node.name === 'aside' && classes.some(c => ['left-column', 'right-column'].includes(c))) {
      tag = setAttribute(setAttribute(setAttribute(tag, 'hidden', 'hidden'), 'inert', ''), 'aria-hidden', 'true');
      for (const image of all.filter(n => n.name === 'img' && n.start > node.start && n.end < node.end)) {
        changes.push({start: image.start, end: image.openEnd,
          value: html.slice(image.start, image.openEnd).replace(/\b(src|srcset)=/gi, 'data-sidebar-$1=')});
      }
    } else continue;
    changes.push({start: node.start, end: node.openEnd, value: tag});
  }
  return edit(html, changes);
}
