#!/usr/bin/env bash
# Rebuild dist/ = exactly the files Cloudflare Pages needs to deploy. No build step, just a copy.
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir dist
cp index.html manifest.webmanifest sw.js dist/
cp -r css js icons functions dist/
echo "dist/ rebuilt ($(find dist -type f | wc -l | tr -d ' ') files)"
