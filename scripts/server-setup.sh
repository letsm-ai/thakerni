#!/usr/bin/env bash
# ============================================================
# Letsm AI - One-shot VPS hardening & setup script
# Target: Ubuntu 24.04 LTS, Hostinger KVM
# Run as root (or via sudo) on a fresh VPS.
# ============================================================
#   curl -fsSL https://raw.githubusercontent.com/<your-repo>/main/scripts/server-setup.sh | sudo bash
#   OR  sudo bash server-setup.sh
# ============================================================
set -euo pipefail

# ---- Config (edit these) ----
NEW_USER="${NEW_USER:-letsm}"
SSH_PORT="${SSH_PORT:-22}"
DOMAIN="${DOMAIN:-letsm.ai}"
ADMIN_EMAIL="${ADMIN_EMAIL:-mazin298@gmail.com}"

log() { echo -e "\n\033[1;32m▶ $*\033[0m"; }
warn(){ echo -e "\n\033[1;33m⚠ $*\033[0m"; }

[ "$(id -u)" -eq 0 ] || { echo "Run as root"; exit 1; }

# ─────────────── 1. System update ───────────────
log "Updating system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get -y -qq upgrade
apt-get -y -qq install \
  curl wget git vim htop unattended-upgrades \
  ufw fail2ban ca-certificates gnupg \
  software-properties-common jq

# ─────────────── 2. Automatic security updates ───────────────
log "Enabling unattended security upgrades"
dpkg-reconfigure -f noninteractive unattended-upgrades

# ─────────────── 3. Create non-root sudo user ───────────────
if ! id "$NEW_USER" >/dev/null 2>&1; then
  log "Creating user: $NEW_USER"
  adduser --disabled-password --gecos "" "$NEW_USER"
  usermod -aG sudo "$NEW_USER"
  mkdir -p "/home/$NEW_USER/.ssh"
  if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys "/home/$NEW_USER/.ssh/"
    chown -R "$NEW_USER:$NEW_USER" "/home/$NEW_USER/.ssh"
    chmod 700 "/home/$NEW_USER/.ssh"
    chmod 600 "/home/$NEW_USER/.ssh/authorized_keys"
  else
    warn "No /root/.ssh/authorized_keys found. Add your public key BEFORE disabling password login!"
  fi
  echo "$NEW_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /usr/local/bin/docker-compose" \
    > "/etc/sudoers.d/$NEW_USER"
fi

# ─────────────── 4. SSH hardening ───────────────
log "Hardening SSH"
SSHD_CONF=/etc/ssh/sshd_config
cp "$SSHD_CONF" "${SSHD_CONF}.bak.$(date +%s)"
sed -i "s/^#\?Port .*/Port ${SSH_PORT}/"                       "$SSHD_CONF"
sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin prohibit-password/' "$SSHD_CONF"
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/'  "$SSHD_CONF"
sed -i 's/^#\?ChallengeResponseAuthentication .*/ChallengeResponseAuthentication no/' "$SSHD_CONF"
sed -i 's/^#\?KbdInteractiveAuthentication .*/KbdInteractiveAuthentication no/'       "$SSHD_CONF"
sed -i 's/^#\?X11Forwarding .*/X11Forwarding no/'              "$SSHD_CONF"
sed -i 's/^#\?MaxAuthTries .*/MaxAuthTries 3/'                 "$SSHD_CONF"
sed -i 's/^#\?ClientAliveInterval .*/ClientAliveInterval 300/' "$SSHD_CONF"

systemctl restart ssh || systemctl restart sshd

# ─────────────── 5. UFW firewall ───────────────
log "Configuring UFW firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow "$SSH_PORT/tcp" comment 'SSH'
ufw allow 80/tcp           comment 'HTTP'
ufw allow 443/tcp          comment 'HTTPS'
ufw --force enable
ufw status verbose

# ─────────────── 6. Fail2ban ───────────────
log "Configuring Fail2ban"
cat >/etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled = true
port    = ${SSH_PORT}

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter  = nginx-limit-req
logpath = /var/lib/docker/volumes/*/log/nginx/error.log
maxretry = 10
findtime = 1m
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

# ─────────────── 7. Docker + Compose v2 ───────────────
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get -y -qq install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  usermod -aG docker "$NEW_USER"
  systemctl enable --now docker
fi

# ─────────────── 8. Swap (safety net for OOM) ───────────────
if ! swapon --show | grep -q .; then
  log "Adding 4G swap file"
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
fi

# ─────────────── 9. App directory ───────────────
log "Creating /opt/letsm"
mkdir -p /opt/letsm/{nginx,scripts,uptime_data}
chown -R "$NEW_USER:$NEW_USER" /opt/letsm

# ─────────────── 10. Backup cron ───────────────
log "Installing backup cron"
cat >/etc/cron.d/letsm-backup <<EOF
# Letsm AI - daily mongo backup at 03:00 UTC
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
0 3 * * * root /opt/letsm/scripts/backup.sh >> /var/log/letsm-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/letsm-backup
touch /var/log/letsm-backup.log

# ─────────────── 11. Logrotate ───────────────
cat >/etc/logrotate.d/letsm <<EOF
/var/log/letsm-backup.log {
  weekly
  rotate 8
  compress
  missingok
  notifempty
}
EOF

# ─────────────── 12. Summary ───────────────
echo -e "\n\033[1;32m================================================\033[0m"
echo -e "\033[1;32m✅ VPS setup complete!\033[0m"
echo -e "\033[1;32m================================================\033[0m"
echo "User       : $NEW_USER (sudoer, docker group)"
echo "SSH port   : $SSH_PORT  (root login: keys only)"
echo "Firewall   : UFW (22, 80, 443)"
echo "Fail2ban   : Active (sshd, nginx)"
echo "Docker     : $(docker --version)"
echo "Swap       : $(swapon --show | tail -n1)"
echo ""
echo "Next steps:"
echo "  1. ssh -p ${SSH_PORT} ${NEW_USER}@<vps-ip>   # test login WITHOUT password"
echo "  2. Upload /opt/letsm/.env.production"
echo "  3. Run docker compose -f /opt/letsm/docker-compose.prod.yml up -d"
echo "  4. Issue SSL: ./scripts/init-letsencrypt.sh"
echo "  5. Point ${DOMAIN} A record → <vps-ip>"
