// Source-preserving edits for our static HTML templates. Script/style contents are opaque.
const voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
export function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1], m[2] ?? m[3]]));
}
export function nodes(html) {
  const result = [], stack = [];
  const tokens = /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/?[a-z][^>]*>/gi;
  for (const m of html.matchAll(tokens)) {
    const raw = m[0];
    if (raw.startsWith("<!--")) continue;
    const name = /^<\/?([\w-]+)/.exec(raw)?.[1].toLowerCase();
    if (raw.startsWith("</")) {
      const index = stack.findLastIndex(n => n.name === name);
      if (index < 0) continue;
      const node = stack[index];
      node.close = m.index; node.end = m.index + raw.length;
      stack.splice(index);
    } else {
      const openEnd = m.index + raw.indexOf(">") + 1;
      const node = { name, start: m.index, openEnd, close: openEnd, end: m.index + raw.length, attrs: attributes(raw.slice(0, raw.indexOf(">") + 1)) };
      result.push(node);
      if (!voidTags.has(name) && !m[1]) stack.push(node);
    }
  }
  return result;
}
export function escape(value) { return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
export function setAttribute(tag, name, value) {
  const pattern = new RegExp(`\\s${name}=(?:"[^"]*"|'[^']*')`);
  const attribute = ` ${name}="${escape(value)}"`;
  return pattern.test(tag) ? tag.replace(pattern, attribute) : tag.replace(/\s*\/?>(?=$)/, match => attribute + match);
}
export function edit(html, changes) {
  let boundary = html.length;
  for (const { start, end, value } of changes.sort((a, b) => b.start - a.start)) {
    if (end > boundary) throw new Error("Overlapping HTML edits");
    html = html.slice(0, start) + value + html.slice(end); boundary = start;
  }
  return html;
}
