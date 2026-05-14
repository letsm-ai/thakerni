#!/usr/bin/env bash
# ============================================================
# Letsm AI - Initial Let's Encrypt SSL setup
# Run AFTER docker compose is up but BEFORE nginx serves HTTPS
# ============================================================
set -euo pipefail

DOMAIN="${DOMAIN:-letsm.ai}"
EMAIL="${EMAIL:-mazin298@gmail.com}"
STAGING="${STAGING:-0}"   # set to 1 for dry-run with staging certs

cd /opt/letsm

# 1. Create dummy cert so nginx can start
DUMMY_DIR="/var/lib/docker/volumes/letsm_certbot_conf/_data/live/${DOMAIN}"
mkdir -p "$DUMMY_DIR"
docker run --rm -v letsm_certbot_conf:/etc/letsencrypt alpine sh -c "
  apk add --no-cache openssl >/dev/null 2>&1 || true
  mkdir -p /etc/letsencrypt/live/${DOMAIN}
  openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
    -keyout /etc/letsencrypt/live/${DOMAIN}/privkey.pem \
    -out    /etc/letsencrypt/live/${DOMAIN}/fullchain.pem \
    -subj   '/CN=localhost'
"

# 2. Start nginx with dummy cert
docker compose -f docker-compose.prod.yml up -d nginx
sleep 5

# 3. Delete dummy & request real cert
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/${DOMAIN} \
         /etc/letsencrypt/archive/${DOMAIN} \
         /etc/letsencrypt/renewal/${DOMAIN}.conf" certbot

STAGING_ARG=""
[ "$STAGING" = "1" ] && STAGING_ARG="--staging"

docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    ${STAGING_ARG} \
    --email ${EMAIL} \
    -d ${DOMAIN} -d www.${DOMAIN} \
    --agree-tos --no-eff-email --force-renewal" certbot

# 4. Reload nginx with real cert
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "✅ SSL provisioned for ${DOMAIN}"
