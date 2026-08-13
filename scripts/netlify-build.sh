#!/usr/bin/env bash
# Netlify production / deploy-preview build.
set -euo pipefail

echo "[netlify-build] node $(node -v) npm $(npm -v)"

echo "[netlify-build] writing public/env.js"
node scripts/write-browser-env.js

echo "[netlify-build] building Angular app"
npm run build

echo "[netlify-build] installing + building API (server/)"
npm --prefix server ci
npm --prefix server run build

test -f server/dist/index.js
test -d node_modules/serverless-http

echo "[netlify-build] done"
