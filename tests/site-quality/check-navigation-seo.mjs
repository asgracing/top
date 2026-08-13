import { readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const failures = [];

const headerTargets = {
  "index.html": ["#clubs-teams-stats", "./teams/?tab=clubs"],
  "races/index.html": ["../#clubs-teams-stats", "../teams/?tab=clubs"],
  "cars/index.html": ["../#clubs-teams-stats", "../teams/?tab=clubs"],
  "fun-stats/index.html": ["../#clubs-teams-stats", "../teams/?tab=clubs"],
  "community/index.html": ["../#clubs-teams-stats", "../teams/?tab=clubs"],
  "driver/index.html": ["../#clubs-teams-stats", "../teams/?tab=clubs"],
  "bans/index.html": ["../#clubs-teams-stats", "../teams/?tab=clubs"],
  "news/index.html": ["../#clubs-teams-stats", "../teams/?tab=clubs"],
  "account/index.html": ["/#clubs-teams-stats", "/teams/?tab=clubs"],
  "account/settings/index.html": ["/#clubs-teams-stats", "/teams/?tab=clubs"],
  "teams/index.html": ["../#clubs-teams-stats", "./?tab=clubs"],
  "clubs/index.html": ["../#clubs-teams-stats", "../teams/?tab=clubs"],
  "teams/detail/index.html": ["../../#clubs-teams-stats", "../?tab=clubs"],
  "hourly/index.html": ["/#clubs-teams-stats", "/teams/?tab=clubs"],
  "hourly/championship/index.html": ["/#clubs-teams-stats", "/teams/?tab=clubs"],
  "hourly/championship/history/index.html": ["/#clubs-teams-stats", "/teams/?tab=clubs"],
};

for (const [path, targets] of Object.entries(headerTargets)) {
  const html = await readFile(resolve(root, path), "utf8");
  for (const target of targets) {
    if (!html.includes(`href="${target}"`)) failures.push(`${path} is missing navigation target ${target}`);
  }
}

const canonicalTargets = {
  "index.html": "https://asgracing.ru/",
  "races/index.html": "https://asgracing.ru/races/",
  "cars/index.html": "https://asgracing.ru/cars/",
  "fun-stats/index.html": "https://asgracing.ru/fun-stats/",
  "driver/index.html": "https://asgracing.ru/driver/",
  "hourly/index.html": "https://asgracing.ru/hourly/",
  "privacy/index.html": "https://asgracing.ru/privacy/",
  "cookies/index.html": "https://asgracing.ru/cookies/",
};

for (const [path, canonical] of Object.entries(canonicalTargets)) {
  const html = await readFile(resolve(root, path), "utf8");
  if (!html.includes(`<link rel="canonical" href="${canonical}"`)) failures.push(`${path} has the wrong canonical URL`);
}

async function collectHtml(directory, prefix = "") {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["dist", "dist.previous", ".git", "node_modules"].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) paths.push(...await collectHtml(path, relativePath));
    else if (extname(entry.name) === ".html") paths.push(relativePath);
  }
  return paths;
}

for (const path of await collectHtml(root)) {
  const html = await readFile(resolve(root, path), "utf8");
  if (/<(?:link|meta)[^>]+(?:canonical|og:url|og:image|twitter:image)[^>]+asgracing\.github\.io/i.test(html)) {
    failures.push(`${path} exposes an obsolete GitHub Pages SEO URL`);
  }
}

const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
for (const url of [
  "https://asgracing.ru/news/",
  "https://asgracing.ru/bans/",
  "https://asgracing.ru/teams/",
  "https://asgracing.ru/hourly/championship/",
  "https://asgracing.ru/hourly/championship/history/",
]) if (!sitemap.includes(`<loc>${url}</loc>`)) failures.push(`sitemap.xml is missing ${url}`);
if (sitemap.includes("asgracing.github.io")) failures.push("sitemap.xml contains an obsolete GitHub Pages URL");

const hourlySitemap = await readFile(resolve(root, "hourly/sitemap.xml"), "utf8");
const hourlyRobots = await readFile(resolve(root, "hourly/robots.txt"), "utf8");
if (hourlySitemap.includes("asgracing.github.io") || hourlyRobots.includes("asgracing.github.io")) {
  failures.push("Hourly service files contain an obsolete GitHub Pages URL");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Navigation and SEO regression passed: ${Object.keys(headerTargets).length} headers checked`);
}
