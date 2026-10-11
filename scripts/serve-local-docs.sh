#!/bin/sh
# Build the support site and the developer site, then serve both on port 8000.
# Developer pages land under /developer/ so one host can carry both trees.
set -eu
cd /docs
pip install --disable-pip-version-check -q -r requirements.txt
rm -rf /tmp/docs-site
mkdocs build -d /tmp/docs-site
mkdocs build -f mkdocs-dev.local.yml -d /tmp/docs-site/developer
exec python -m http.server 8000 --directory /tmp/docs-site
