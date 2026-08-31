#!/bin/bash
set -euo pipefail
pnpm install --frozen-lockfile
CI=1 pnpm --filter @workspace/db run migrate
