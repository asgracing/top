import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

const dist = resolve(import.meta.dirname, "../../dist");
const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".mp4": "video/mp4" };
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relativePath = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const path = resolve(dist, `.${relativePath}`);
  if (path !== dist && !path.startsWith(`${dist}\\`) && !path.startsWith(`${dist}/`)) { response.writeHead(403).end(); return; }
  try {
    const info = await stat(path);
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    response.setHeader("content-type", types[extname(path)] || "application/octet-stream");
    if (range) {
      const start = Number(range[1]);
      const end = Math.min(range[2] ? Number(range[2]) : info.size - 1, info.size - 1);
      response.writeHead(206, { "accept-ranges": "bytes", "content-range": `bytes ${start}-${end}/${info.size}`, "content-length": end - start + 1 });
      createReadStream(path, { start, end }).pipe(response);
    } else { response.writeHead(200, { "content-length": info.size }); createReadStream(path).pipe(response); }
  } catch { response.writeHead(404).end(); }
});

await new Promise(resolveListen => server.listen(0, "127.0.0.1", resolveListen));
const { port } = server.address();
const checks = ["/", "/races/", "/driver/", "/cars/", "/fun-stats/", "/community/", "/news/", "/bans/", "/app.js", "/src/entrypoints/home.js", "/asset-manifest.json", "/build-meta.json"];
const failures = [];
try {
  for (const path of checks) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    if (response.status !== 200 || !(await response.arrayBuffer()).byteLength) failures.push(`${path}: HTTP ${response.status}`);
  }
  const range = await fetch(`http://127.0.0.1:${port}/media/background.mp4`, { headers: { Range: "bytes=0-1023" } });
  if (range.status !== 206 || (await range.arrayBuffer()).byteLength !== 1024) failures.push(`video range: HTTP ${range.status}`);
} finally { await new Promise(resolveClose => server.close(resolveClose)); }
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log(`Deployment smoke passed: ${checks.length} routes/assets and video byte-range`);
