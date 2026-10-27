#!/bin/sh
set -eu
cd "$(dirname "$0")"
if [ -n "${BTB_NODE:-}" ]; then
  exec "$BTB_NODE" run.cjs "$@"
elif [ -x /Users/vikasshdalal/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ]; then
  exec /Users/vikasshdalal/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node run.cjs "$@"
else
  exec node run.cjs "$@"
fi
