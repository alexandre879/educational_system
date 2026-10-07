#!/usr/bin/env bash
# Point local development at this computer's current network IP.
# Run it after switching Wi-Fi or hotspot, then restart Django and the frontend.
#
#   ./set-dev-ip.sh                # detect the IP automatically
#   ./set-dev-ip.sh 172.20.10.4    # or set it explicitly
#
# The mobile app needs no change: it finds the backend through `npx expo start`.
set -euo pipefail
cd "$(dirname "$0")"

IP="${1:-}"
if [ -z "$IP" ]; then
  iface=$(route -n get default 2>/dev/null | awk '/interface:/ {print $2}')
  IP=$(ipconfig getifaddr "${iface:-en0}" 2>/dev/null || true)
fi
if [ -z "$IP" ]; then
  echo "Couldn't detect the network IP. Pass it explicitly: ./set-dev-ip.sh 172.20.10.4" >&2
  exit 1
fi

# Replace KEY=... in an env file, or append it if missing.
set_var() {
  local file=$1 key=$2 value=$3
  touch "$file"
  if grep -qE "^[[:space:]]*${key}[[:space:]]*=" "$file"; then
    sed -i '' -E "s|^[[:space:]]*${key}[[:space:]]*=.*|${key}=${value}|" "$file"
  else
    [ -s "$file" ] && [ -n "$(tail -c1 "$file")" ] && echo >> "$file"
    echo "${key}=${value}" >> "$file"
  fi
}

set_var backend/.env NET_IP "$IP"
set_var frontend/.env NEXT_PUBLIC_API_BASE_URL "http://${IP}:8000/api"

cat <<EOF
Dev IP set to ${IP}
  backend/.env   NET_IP=${IP}
  frontend/.env  NEXT_PUBLIC_API_BASE_URL=http://${IP}:8000/api

Now restart:
  Django    cd backend && python manage.py runserver 0.0.0.0:8000
  Frontend  cd frontend && npm run dev
  Mobile    cd mobile && npx expo start   (scan the new QR code)
EOF
