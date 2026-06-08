#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  ECS_HOST=1.2.3.4 ECS_USER=root ./scripts/deploy_ecs.sh

Optional env vars:
  ECS_PORT=22
  ECS_KEY=~/.ssh/id_rsa
  APP_DIR=/opt/pmp-trainer
  DOMAIN=https://example.com
  POSTGRES_DB=pmp_practice
  POSTGRES_USER=pmp
  POSTGRES_PASSWORD=...
  SESSION_SECRET=...
  FIRST_ADMIN_USERNAME=remy
  FIRST_ADMIN_PASSWORD=...
  FIRST_ADMIN_DISPLAY_NAME=Remy
  COOKIE_SECURE=0
  WEB_HOST=127.0.0.1
  WEB_PORT=18000
  POSTGRES_HOST=127.0.0.1
  NPM_REGISTRY=https://registry.npmmirror.com
  PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple
  PIP_TRUSTED_HOST=mirrors.aliyun.com
  SKIP_MIGRATION=0
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: ${name}" >&2
    usage >&2
    exit 1
  fi
}

require ECS_HOST

ECS_USER="${ECS_USER:-root}"
ECS_PORT="${ECS_PORT:-22}"
APP_DIR="${APP_DIR:-/opt/pmp-trainer}"
DOMAIN="${DOMAIN:-http://127.0.0.1:18000}"
SSH_DEST="${ECS_USER}@${ECS_HOST}"
SSH_ARGS=(-p "${ECS_PORT}")
RSYNC_SSH="ssh -p ${ECS_PORT}"

if [[ -n "${ECS_KEY:-}" ]]; then
  SSH_ARGS=(-i "${ECS_KEY}" "${SSH_ARGS[@]}")
  RSYNC_SSH="ssh -i ${ECS_KEY} -p ${ECS_PORT}"
fi

echo "Deploying to ${SSH_DEST}:${APP_DIR}"
ssh "${SSH_ARGS[@]}" "${SSH_DEST}" "mkdir -p '${APP_DIR}'"

existing_env="$(
  ssh "${SSH_ARGS[@]}" "${SSH_DEST}" "if [ -f '${APP_DIR}/.env' ]; then cat '${APP_DIR}/.env'; fi"
)"

env_value() {
  local name="$1"
  printf '%s\n' "${existing_env}" | awk -F= -v key="${name}" '$1 == key { sub(/^[^=]*=/, ""); print; exit }'
}

POSTGRES_DB="${POSTGRES_DB:-$(env_value POSTGRES_DB)}"
POSTGRES_USER="${POSTGRES_USER:-$(env_value POSTGRES_USER)}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(env_value POSTGRES_PASSWORD)}"
SESSION_SECRET="${SESSION_SECRET:-$(env_value SESSION_SECRET)}"
FIRST_ADMIN_USERNAME="${FIRST_ADMIN_USERNAME:-$(env_value FIRST_ADMIN_USERNAME)}"
FIRST_ADMIN_PASSWORD="${FIRST_ADMIN_PASSWORD:-$(env_value FIRST_ADMIN_PASSWORD)}"
FIRST_ADMIN_DISPLAY_NAME="${FIRST_ADMIN_DISPLAY_NAME:-$(env_value FIRST_ADMIN_DISPLAY_NAME)}"
COOKIE_SECURE="${COOKIE_SECURE:-$(env_value COOKIE_SECURE)}"
WEB_HOST="${WEB_HOST:-$(env_value WEB_HOST)}"
WEB_PORT="${WEB_PORT:-$(env_value WEB_PORT)}"
POSTGRES_HOST="${POSTGRES_HOST:-$(env_value POSTGRES_HOST)}"
NPM_REGISTRY="${NPM_REGISTRY:-$(env_value NPM_REGISTRY)}"
PIP_INDEX_URL="${PIP_INDEX_URL:-$(env_value PIP_INDEX_URL)}"
PIP_TRUSTED_HOST="${PIP_TRUSTED_HOST:-$(env_value PIP_TRUSTED_HOST)}"

POSTGRES_DB="${POSTGRES_DB:-pmp_practice}"
POSTGRES_USER="${POSTGRES_USER:-pmp}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -base64 24 | tr -d '\n')}"
SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -base64 48 | tr -d '\n')}"
FIRST_ADMIN_USERNAME="${FIRST_ADMIN_USERNAME:-remy}"
FIRST_ADMIN_PASSWORD="${FIRST_ADMIN_PASSWORD:-$(openssl rand -base64 18 | tr -d '\n')}"
FIRST_ADMIN_DISPLAY_NAME="${FIRST_ADMIN_DISPLAY_NAME:-Remy}"
COOKIE_SECURE="${COOKIE_SECURE:-0}"
WEB_HOST="${WEB_HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-18000}"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmmirror.com}"
PIP_INDEX_URL="${PIP_INDEX_URL:-https://mirrors.aliyun.com/pypi/simple}"
PIP_TRUSTED_HOST="${PIP_TRUSTED_HOST:-mirrors.aliyun.com}"
SKIP_MIGRATION="${SKIP_MIGRATION:-0}"

rsync -az --delete \
  --exclude '.git/' \
  --exclude '.venv/' \
  --exclude 'node_modules/' \
  --exclude '.env' \
  --exclude '.DS_Store' \
  -e "${RSYNC_SSH}" \
  ./ "${SSH_DEST}:${APP_DIR}/"

remote_env=$(cat <<EOF
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
SESSION_SECRET=${SESSION_SECRET}
FIRST_ADMIN_USERNAME=${FIRST_ADMIN_USERNAME}
FIRST_ADMIN_PASSWORD=${FIRST_ADMIN_PASSWORD}
FIRST_ADMIN_DISPLAY_NAME=${FIRST_ADMIN_DISPLAY_NAME}
COOKIE_SECURE=${COOKIE_SECURE}
WEB_HOST=${WEB_HOST}
WEB_PORT=${WEB_PORT}
POSTGRES_HOST=${POSTGRES_HOST}
NPM_REGISTRY=${NPM_REGISTRY}
PIP_INDEX_URL=${PIP_INDEX_URL}
PIP_TRUSTED_HOST=${PIP_TRUSTED_HOST}
EOF
)

printf '%s\n' "${remote_env}" | ssh "${SSH_ARGS[@]}" "${SSH_DEST}" "cat > '${APP_DIR}/.env' && chmod 600 '${APP_DIR}/.env'"

ssh "${SSH_ARGS[@]}" "${SSH_DEST}" "cd '${APP_DIR}' && docker compose up -d --build"

if [[ "${SKIP_MIGRATION}" != "1" ]]; then
  ssh "${SSH_ARGS[@]}" "${SSH_DEST}" "cd '${APP_DIR}' && test -f data/pmp.sqlite && docker compose exec -T web python scripts/migrate_sqlite_to_postgres.py"
fi

ssh "${SSH_ARGS[@]}" "${SSH_DEST}" "curl -fsS 'http://127.0.0.1:${WEB_PORT}/api/health'"
echo
echo "Deployment complete: ${DOMAIN}"
echo "Admin username: ${FIRST_ADMIN_USERNAME}"
echo "Admin password: ${FIRST_ADMIN_PASSWORD}"
