#!/usr/bin/env bash
set -euo pipefail

artifact="${1:?Usage: deploy-release.sh /path/to/capilora-release.tgz}"
release_root="/var/www/capilora-releases"
shared_dir="/var/lib/capilora"
current_link="/var/www/capilora-current"
service_name="capilora.service"
live_port="3142"
candidate_port="3143"
release_id="$(date -u +%Y%m%dT%H%M%SZ)"
release_dir="$release_root/$release_id"
previous_release="$(readlink -f "$current_link" 2>/dev/null || true)"
candidate_pid=""

cleanup() {
  if [[ -n "$candidate_pid" ]]; then
    kill "$candidate_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT

test -f "$artifact"
mkdir -p "$release_root" "$shared_dir" /var/backups/capilora
exec 9>"$shared_dir/deploy.lock"
flock -n 9 || { echo "Another Capilora deployment is already running." >&2; exit 1; }

if [[ -f "$shared_dir/content.db" || -d "$shared_dir/uploads" ]]; then
  tar -C /var/lib -czf "/var/backups/capilora/data-before-$release_id.tgz" capilora
fi

mkdir -p "$release_dir"
tar -xzf "$artifact" -C "$release_dir" --strip-components=1
test -f "$release_dir/server.js"
test -d "$release_dir/public"
test -d "$release_dir/.next/static"

chown -R root:www-data "$release_dir"
chmod -R g=rX,o= "$release_dir"
chown -R www-data:www-data "$shared_dir"
chmod 750 "$shared_dir"

cd "$release_dir"
set -a
source /etc/capilora/capilora.env
set +a
PORT="$candidate_port" HOSTNAME="127.0.0.1" node server.js \
  >"/var/log/capilora-candidate.log" 2>&1 &
candidate_pid="$!"

for _ in {1..45}; do
  if curl -fsS --max-time 3 "http://127.0.0.1:$candidate_port/api/health" >/dev/null; then
    break
  fi
  sleep 1
done
curl -fsS --max-time 5 "http://127.0.0.1:$candidate_port/api/health" >/dev/null
curl -fsS --max-time 10 "http://127.0.0.1:$candidate_port/tr" >/dev/null
kill "$candidate_pid"
wait "$candidate_pid" 2>/dev/null || true
candidate_pid=""

ln -sfn "$release_dir" "$current_link"
systemctl restart "$service_name"

for _ in {1..45}; do
  if curl -fsS --max-time 3 "http://127.0.0.1:$live_port/api/health" >/dev/null; then
    break
  fi
  sleep 1
done

if ! curl -fsS --max-time 5 "http://127.0.0.1:$live_port/api/health" >/dev/null; then
  if [[ -n "$previous_release" && -d "$previous_release" ]]; then
    ln -sfn "$previous_release" "$current_link"
    systemctl restart "$service_name"
  fi
  echo "Deployment failed; previous release restored." >&2
  exit 1
fi

find "$release_root" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
  | sort -nr | tail -n +6 | cut -d' ' -f2- \
  | while IFS= read -r old_release; do
      [[ -n "$old_release" && "$old_release" == "$release_root/"* ]] && rm -rf -- "$old_release"
    done

printf 'Deployed %s\nPrevious %s\n' "$release_dir" "${previous_release:-none}"
