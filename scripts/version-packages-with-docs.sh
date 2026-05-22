#!/usr/bin/env bash
set -euo pipefail

bun run version-packages
bun run docs
bun run format
