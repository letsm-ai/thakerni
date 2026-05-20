#!/usr/bin/env bash
# ============================================================
# Letsm AI - Open SSH tunnels to all admin panels at once
# Run this from your LOCAL machine (not the VPS)
# ============================================================
# Usage:
#   ./scripts/admin-tunnel.sh                       # uses defaults
#   VPS=76.13.220.229 USER=letsm ./scripts/admin-tunnel.sh
# ============================================================
set -euo pipefail

VPS="${VPS:-76.13.220.229}"
USER="${USER_VPS:-letsm}"
PORT="${PORT:-22}"

echo "🔌 Opening SSH tunnel to ${USER}@${VPS}..."
echo ""
echo "After connection, open these URLs in your browser:"
echo ""
echo "  📊 Portainer       → http://localhost:9000"
echo "  📜 Dozzle (logs)   → http://localhost:8080"
echo "  💚 Uptime Kuma     → http://localhost:3001"
echo "  📈 Netdata         → http://localhost:19999"
echo "  🗄️  Mongo Express   → http://localhost:8081"
echo ""
echo "Press Ctrl+C to close all tunnels."
echo ""

ssh -N -p "$PORT" \
  -L 9000:127.0.0.1:9000 \
  -L 8080:127.0.0.1:8080 \
  -L 3001:127.0.0.1:3001 \
  -L 19999:127.0.0.1:19999 \
  -L 8081:127.0.0.1:8081 \
  "${USER}@${VPS}"
