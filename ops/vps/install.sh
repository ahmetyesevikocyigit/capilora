#!/usr/bin/env bash
set -euo pipefail

ops_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install -d -m 750 -o root -g www-data /etc/capilora
install -d -m 750 -o www-data -g www-data /var/lib/capilora
install -d -m 750 -o root -g root /var/backups/capilora
install -d -m 755 -o root -g root /var/www/capilora-releases

if [[ ! -f /etc/capilora/capilora.env ]]; then
  install -m 640 -o root -g www-data \
    "$ops_dir/capilora.env.example" /etc/capilora/capilora.env
fi

install -m 644 "$ops_dir/capilora.service" /etc/systemd/system/capilora.service
install -m 755 "$ops_dir/backup.sh" /usr/local/sbin/capilora-backup
install -m 644 "$ops_dir/capilora-backup.service" /etc/systemd/system/capilora-backup.service
install -m 644 "$ops_dir/capilora-backup.timer" /etc/systemd/system/capilora-backup.timer
install -m 644 "$ops_dir/nginx-http.conf" /etc/nginx/sites-available/ankaracapilora.com
ln -sfn /etc/nginx/sites-available/ankaracapilora.com \
  /etc/nginx/sites-enabled/ankaracapilora.com

systemctl daemon-reload
systemctl enable capilora.service capilora-backup.timer
nginx -t
systemctl reload nginx
