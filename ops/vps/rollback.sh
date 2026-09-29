#!/usr/bin/env bash
set -euo pipefail

release_root="/var/www/capilora-releases"
current_link="/var/www/capilora-current"
target="${1:-}"

if [[ -z "$target" ]]; then
  current="$(readlink -f "$current_link")"
  target="$(find "$release_root" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -nr | cut -d' ' -f2- | grep -Fvx "$current" | head -n 1)"
fi

[[ -n "$target" && "$target" == "$release_root/"* && -f "$target/server.js" ]]
ln -sfn "$target" "$current_link"
systemctl restart capilora.service
curl --retry 12 --retry-delay 2 --retry-connrefused -fsS \
  http://127.0.0.1:3142/api/health >/dev/null
printf 'Rolled back to %s\n' "$target"
