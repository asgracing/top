"""Local static preview with a read-only public-data proxy. Never deployed.

Usage: python scripts/preview-v2.py --port 8840
The public data CDN does not permit localhost CORS. This development server
rewrites public GET requests in its HTML response, not in production sources.
Auth, voting, administration and analytics are never proxied.
"""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
from threading import Lock
import time
import requests

ROOT = Path(__file__).resolve().parent.parent
ROOT_LAYOUT = False
PREFIX = '/__asg_public__'
PUBLIC_PATHS = ('/top-data/', '/hourly-data/', '/public-cache-clubs-teams/', '/achievements/')
FETCH_SHIM = b'''<script data-local-public-preview>
(()=>{const originalFetch=window.fetch.bind(window);window.fetch=(input,options={})=>{
 const method=String(options.method||input?.method||'GET').toUpperCase();
 const url=new URL(input instanceof Request?input.url:String(input),location.href);
 if(window.ASG_LOCAL_READ_ONLY_TRANSPORT&&method!=='GET'&&url.origin!==location.origin)
   return Promise.resolve(new Response('{"error":"read_only_preview"}',{status:403,headers:{'Content-Type':'application/json'}}));
 if(method==='GET'&&url.origin==='https://community-likes.asgracing.workers.dev'&&url.pathname==='/likes')return originalFetch('/__asg_community_likes__/likes'+url.search,options);
 if(method==='GET'&&url.origin==='https://data.asgracing.ru'&&(url.pathname==='/donations-api/recent'||['/top-data/','/hourly-data/','/public-cache-clubs-teams/','/achievements/'].some(prefix=>url.pathname.startsWith(prefix))))
   return originalFetch('/__asg_public__'+url.pathname+url.search,options);
 return originalFetch(input,options);
};
window.ASG_V2_READ_ONLY_PREVIEW=true;
const rewriteImage=img=>{if(img.tagName!=='IMG')return;const url=new URL(img.getAttribute('src')||'',location.href);if(url.origin==='https://data.asgracing.ru'&&['/hourly-data/','/top-data/','/public-cache-clubs-teams/'].some(prefix=>url.pathname.startsWith(prefix)))img.src='/__asg_public__'+url.pathname+url.search;};
new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')rewriteImage(record.target);else for(const node of record.addedNodes)if(node.nodeType===1){rewriteImage(node);node.querySelectorAll('img').forEach(rewriteImage);}}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
})();</script>'''
cache = {}
cache_lock = Lock()


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        # The native Hourly controllers use /top on localhost.
        if ROOT_LAYOUT and path.startswith('/top/'):
            path = path[4:]
        return super().translate_path(path)

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path == '/__asg_community_likes__/likes':
            if len(parsed.query) > 4096:
                self.send_error(400)
                return
            try:
                # Fixed read-only worker endpoint. Never proxy /like or POST.
                response = requests.get('https://community-likes.asgracing.workers.dev/likes', params=parsed.query, timeout=15)
                self.respond(response.status_code, 'application/json', response.content)
            except requests.RequestException:
                self.respond(502, 'application/json', b'{"error":"Reactions unavailable"}')
            return
        if parsed.path.startswith(PREFIX + '/'):
            path = unquote(parsed.path[len(PREFIX):])
            if (not path.startswith(PUBLIC_PATHS) and path != '/donations-api/recent') or '\\' in path or any(part in ('.', '..') for part in path.split('/')):
                self.send_error(403)
                return
            url = 'https://data.asgracing.ru' + path + ('?' + parsed.query if parsed.query else '')
            try:
                with cache_lock:
                    saved = cache.get(url)
                if saved and time.monotonic() - saved[0] < 20:
                    status, content_type, payload = saved[1:]
                else:
                    response = requests.get(url, timeout=20)
                    status, content_type, payload = response.status_code, response.headers.get('Content-Type', 'application/json'), response.content
                    if status == 200:
                        with cache_lock:
                            cache[url] = (time.monotonic(), status, content_type, payload)
                self.respond(status, content_type, payload)
            except requests.RequestException:
                self.respond(502, 'application/json', b'{"error":"Public source unavailable"}')
            return
        if (parsed.path.startswith('/v2/') or ROOT_LAYOUT) and (parsed.path.endswith('/') or parsed.path.endswith('.html')):
            target = Path(self.translate_path(parsed.path))
            if target.is_dir():
                target /= 'index.html'
            if target.is_file() and target.resolve().is_relative_to(ROOT):
                shim = (b'<script>window.ASG_LOCAL_READ_ONLY_TRANSPORT=true;</script>' if ROOT_LAYOUT else b'') + FETCH_SHIM
                source = target.read_bytes().replace(b'<head>', b'<head>' + shim, 1)
                self.respond(200, 'text/html; charset=utf-8', source)
                return
        if (parsed.path.startswith('/v2/') or ROOT_LAYOUT) and not Path(self.translate_path(parsed.path)).exists():
            source = (ROOT / '404.html').read_bytes()
            self.respond(404, 'text/html; charset=utf-8', source)
            return
        super().do_GET()

    def respond(self, status, content_type, payload):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *_args):
        pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8840)
    parser.add_argument('--directory', type=Path, default=ROOT)
    args = parser.parse_args()
    selected = args.directory.resolve()
    if not selected.is_dir() or not selected.is_relative_to(ROOT.parent):
        parser.error('directory must be an existing directory inside the ASG workspace')
    ROOT = selected
    ROOT_LAYOUT = (ROOT / 'route-map.json').is_file()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), PreviewHandler)
    print(f'Local V2 preview: http://127.0.0.1:{args.port}/'+('' if ROOT_LAYOUT else 'v2/ru/'), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
