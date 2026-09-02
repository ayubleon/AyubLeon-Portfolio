import http.server
import json
import os
import sys
from urllib.parse import unquote, urlparse


def load_rewrites():
    """The same source/destination pairs Vercel applies in production.

    Read from vercel.json rather than duplicated here, so the clean URLs the
    site links to (/about, /work/buzziq) resolve identically in local dev and
    on the deployed site instead of only working once shipped.
    """
    config = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'vercel.json')
    try:
        with open(config, encoding='utf-8') as handle:
            return {r['source']: unquote(r['destination']) for r in json.load(handle).get('rewrites', [])}
    except (OSError, ValueError, KeyError) as error:
        print('no rewrites loaded from vercel.json: %s' % error, file=sys.stderr)
        return {}


REWRITES = load_rewrites()


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def _apply_rewrite(self):
        parsed = urlparse(self.path)
        destination = REWRITES.get(unquote(parsed.path))
        if destination is None:
            return
        # the query string has to survive: the cache-busting params used
        # while testing hang off these same clean paths
        self.path = destination + (('?' + parsed.query) if parsed.query else '')

    def do_GET(self):
        self._apply_rewrite()
        return super().do_GET()

    def do_HEAD(self):
        self._apply_rewrite()
        return super().do_HEAD()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    http.server.test(HandlerClass=NoCacheHandler, port=port)
