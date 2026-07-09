#!/bin/sh
# Pre-deploy gate (ENGINEERING_CLEANUP.md Phase 12 / DEPLOYMENT_DAY step 6):
# syntax check + backend tests + both frontend builds. Any failure aborts.
# Run from the repo root: deploy/scripts/preflight.sh
set -eu

cd "$(dirname "$0")/../.."

echo "==> API syntax check"
(cd fablab-api && npm run check)

echo "==> API tests (needs fablab-test-db container — 'npm run test:db' once per machine)"
(cd fablab-api && npm test)

echo "==> User app build"
(cd fabweb0-master && npm run build)

echo "==> Admin app build"
(cd admin-main && npm run build)

echo ""
echo "PREFLIGHT PASSED — safe to run: firebase deploy --project fablab-bmk --only hosting:user,hosting:admin"
