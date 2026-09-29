#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
output_path="${1:-$project_dir/.artifacts/capilora-source.tgz}"

mkdir -p "$(dirname "$output_path")"
tar -C "$project_dir" -czf "$output_path" \
  --exclude=.git \
  --exclude=node_modules \
  --exclude='.next*' \
  --exclude=.data \
  --exclude=.vercel \
  --exclude=.artifacts \
  --exclude='backups/*.enc' \
  .
printf 'Source package: %s\n' "$output_path"
