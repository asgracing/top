// Strip the website prefix and command/advertising suffix from ACC names.
export function trimServerNameAffixes(value) {
  return String(value || '').trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?asgracing\.ru\s*\|\s*/i, '')
    .replace(/\s*(?:\|\s*)?!rank\b.*$/i, '')
    .trim();
}
