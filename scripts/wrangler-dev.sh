#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <app-dir> <port>" >&2
  echo "  e.g. $0 apps/api 8080" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/$1"
PORT="$2"

if [ ! -d "$APP_DIR" ]; then
  echo "[dev] error: $APP_DIR does not exist" >&2
  exit 1
fi

ENV_FILE="$REPO_ROOT/.env"
ENV_EXAMPLE="$REPO_ROOT/.env.example"
DEV_VARS="$APP_DIR/.dev.vars.development"
DEV_VARS_TARGET="../../.env"

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    echo "[dev] .env not found at repo root — copying from .env.example"
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "[dev] created $ENV_FILE — fill in the missing values before continuing"
  else
    echo "[dev] error: $ENV_FILE not found and no .env.example to bootstrap from" >&2
    exit 1
  fi
fi

if [ ! -L "$DEV_VARS" ] || [ "$(readlink "$DEV_VARS")" != "$DEV_VARS_TARGET" ]; then
  if [ -e "$DEV_VARS" ] && [ ! -L "$DEV_VARS" ]; then
    echo "[dev] error: $DEV_VARS exists and is not a symlink — refusing to overwrite" >&2
    exit 1
  fi
  rm -f "$DEV_VARS"
  ln -s "$DEV_VARS_TARGET" "$DEV_VARS"
  echo "[dev] linked $DEV_VARS -> $DEV_VARS_TARGET"
fi

cd "$APP_DIR"
exec npx dotenv -e "$ENV_FILE" -- wrangler dev --env development --port "$PORT"
