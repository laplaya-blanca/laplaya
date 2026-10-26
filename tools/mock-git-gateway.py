"""Local stand-in for Netlify Git Gateway, for testing /admin without logging in.
Usage: python3 tools/mock-git-gateway.py <site-folder> <port>  then open http://localhost:<port>/admin/
Serves <site-folder> and fakes the GitHub contents + git data endpoints the dashboard uses; a save
writes the files straight into <site-folder> (point it at a scratch copy to keep the repo clean)."""
import base64, hashlib, json, os, sys, http.server, urllib.parse

ROOT = os.path.abspath(sys.argv[1]); PORT = int(sys.argv[2])
blobs, trees, commits = {}, {}, {}
head = {'sha': 'c0'}; commits['c0'] = {'tree': 't0', 'parents': []}; trees['t0'] = {}
PFX = '/.netlify/git/github/'
log = []

def bsha(data): return hashlib.sha1(b'blob %d\0' % len(data) + data).hexdigest()

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
    def j(s, code, obj):
        b = json.dumps(obj).encode(); s.send_response(code); s.send_header('Content-Type', 'application/json'); s.send_header('Content-Length', str(len(b))); s.end_headers(); s.wfile.write(b)
    def body(s): return json.loads(s.rfile.read(int(s.headers.get('Content-Length', 0))) or b'{}')
    def end_headers(s): s.send_header('Cache-Control', 'no-store'); super().end_headers()
    def gw(s, method):
        u = urllib.parse.urlparse(s.path); p = u.path[len(PFX):]
        if s.headers.get('Authorization') != 'Bearer local': return s.j(401, {'message': 'no auth'})
        if p.startswith('contents/') and method == 'GET':
            f = os.path.join(ROOT, p[9:])
            if not os.path.isfile(f): return s.j(404, {'message': 'Not Found'})
            d = open(f, 'rb').read(); return s.j(200, {'content': base64.b64encode(d).decode(), 'sha': bsha(d)})
        if p == 'git/refs/heads/main' and method == 'GET': return s.j(200, {'object': {'sha': head['sha']}})
        if p.startswith('git/commits/') and method == 'GET': return s.j(200, {'tree': {'sha': commits[p[12:]]['tree']}})
        if p == 'git/blobs' and method == 'POST':
            d = base64.b64decode(s.body()['content']); sha = bsha(d); blobs[sha] = d; return s.j(201, {'sha': sha})
        if p == 'git/trees' and method == 'POST':
            b = s.body(); sha = 't%d' % (len(trees)); trees[sha] = {e['path']: e['sha'] for e in b['tree']}; return s.j(201, {'sha': sha})
        if p == 'git/commits' and method == 'POST':
            b = s.body(); sha = 'c%d' % len(commits); commits[sha] = {'tree': b['tree'], 'parents': b['parents'], 'message': b['message']}; return s.j(201, {'sha': sha})
        if p == 'git/refs/heads/main' and method == 'PATCH':
            b = s.body(); c = commits[b['sha']]
            if c['parents'] != [head['sha']]: return s.j(422, {'message': 'Update is not a fast forward'})
            for path, bs in trees[c['tree']].items():
                f = os.path.join(ROOT, path); os.makedirs(os.path.dirname(f), exist_ok=True); open(f, 'wb').write(blobs[bs])
            head['sha'] = b['sha']; log.append({'message': c['message'], 'files': sorted(trees[c['tree']])})
            open(os.path.join(ROOT, '.mock-commits.json'), 'w').write(json.dumps(log, indent=1))
            return s.j(200, {'object': {'sha': b['sha']}})
        return s.j(404, {'message': 'mock: unsupported ' + method + ' ' + p})
    def do_GET(s):
        if s.path.startswith(PFX): return s.gw('GET')
        return super().do_GET()
    def do_POST(s): return s.gw('POST')
    def do_PATCH(s): return s.gw('PATCH')

http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
