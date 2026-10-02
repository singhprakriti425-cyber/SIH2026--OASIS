"""Reliable local launcher for Passive Shelter Designer on Windows.

Run `python serve_shelter.py` and keep the terminal open, then visit
http://localhost:8080.  It intentionally avoids console logging so it can
also be run through pythonw.exe without broken HTTP responses.
"""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        """Do not write request logs; pythonw has no stderr stream."""


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    handler = lambda *args, **kwargs: SilentHandler(*args, directory=root, **kwargs)
    server = ThreadingHTTPServer(("", 8080), handler)
    print("Passive Shelter Designer is available at http://localhost:8080")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
