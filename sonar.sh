#!/usr/bin/env sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "Docker Compose is not available. Install Docker Desktop or Docker Engine with Compose."
  exit 1
fi

run_compose() {
  # shellcheck disable=SC2086
  sh -c "cd \"$ROOT_DIR\" && $COMPOSE_CMD $*"
}

ensure_env_file() {
  if [ ! -f "$ROOT_DIR/.env" ]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    echo "Created .env from .env.example"
  fi
}

print_help() {
  cat <<'EOF'
Usage: ./sonar.sh [command]

Commands:
  start    Build and start the app in the background
  update   Pull the latest changes, then rebuild and restart
  logs     Follow container logs
  stop     Stop the app without removing data
  down     Remove the container without deleting data
  status   Show container status
  help     Show this help
EOF
}

COMMAND=${1:-start}

case "$COMMAND" in
  start)
    ensure_env_file
    run_compose up -d --build
    ;;
  update)
    ensure_env_file
    git -C "$ROOT_DIR" pull --ff-only
    run_compose up -d --build
    ;;
  logs)
    run_compose logs -f
    ;;
  stop)
    run_compose stop
    ;;
  down)
    run_compose down
    ;;
  status)
    run_compose ps
    ;;
  help|-h|--help)
    print_help
    ;;
  *)
    echo "Unknown command: $COMMAND"
    print_help
    exit 1
    ;;
esac
