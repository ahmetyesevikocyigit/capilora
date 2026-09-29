#!/usr/bin/env bash
set -euo pipefail

source_archive="${1:?Usage: build-and-deploy.sh /path/to/capilora-source.tgz}"
build_root="$(mktemp -d /var/tmp/capilora-build-XXXXXXXX)"
source_dir="$build_root/source"
release_archive="$build_root/capilora-release.tgz"
package_dir="$build_root/package"

cleanup() {
  rm -rf -- "$build_root"
}
trap cleanup EXIT

mkdir -p "$source_dir" "$package_dir/app/.next"
tar -xzf "$source_archive" -C "$source_dir"

cd "$source_dir"
export CI=1
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=768}"
corepack pnpm install --frozen-lockfile
NEXT_PUBLIC_SITE_URL="https://ankaracapilora.com" nice -n 10 corepack pnpm build

cp -a .next/standalone/. "$package_dir/app/"
cp -a .next/static "$package_dir/app/.next/static"
cp -a public "$package_dir/app/public"
tar -C "$package_dir" -czf "$release_archive" app

bash "$source_dir/ops/vps/deploy-release.sh" "$release_archive"
