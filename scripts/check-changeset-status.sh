#!/usr/bin/env bash

set -euo pipefail

if [ -z "$(find .changeset -maxdepth 1 -type f -name '*.md' ! -name README.md -print -quit)" ]; then
  echo "No Changeset: no package release requested."
  exit 0
fi

bun x changeset status --since=origin/main
