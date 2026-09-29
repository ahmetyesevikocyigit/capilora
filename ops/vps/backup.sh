#!/usr/bin/env bash
set -euo pipefail

backup_dir="/var/backups/capilora"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
tar -C /var/lib -czf "$backup_dir/data-$stamp.tgz" capilora
find "$backup_dir" -type f -name 'data-*.tgz' -mtime +14 -delete
