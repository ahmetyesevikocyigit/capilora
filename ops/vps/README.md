# Capilora VPS deployment

Production runs as a Next.js standalone server on `127.0.0.1:3142`, behind
Nginx. Persistent SQLite and uploaded media live in `/var/lib/capilora` and are
not replaced by application releases.

## Release

1. Run `ops/vps/install.sh` once on the VPS as root.
2. Run `ops/vps/package-source.sh` locally.
3. Upload `.artifacts/capilora-source.tgz` to the VPS.
4. Run `ops/vps/build-and-deploy.sh` on the Linux VPS as root. This installs
   locked dependencies, builds a Linux-compatible standalone release, and then
   invokes `deploy-release.sh`.
5. Verify `/api/health`, `/tr`, `/en`, `robots.txt`, and `sitemap.xml`.

The deploy script tests the candidate on port `3143` before switching the
`/var/www/capilora-current` symlink. Five application releases are retained.
Persistent data is backed up before every release and nightly for 14 days.

## Rollback

Run `ops/vps/rollback.sh` as root. With no argument it selects the newest release
other than the current one; an explicit path below `/var/www/capilora-releases`
may also be supplied. The script restarts the service and verifies the health
endpoint.
