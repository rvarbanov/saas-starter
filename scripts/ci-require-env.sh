#!/bin/sh
# Fail if a required CI env value is empty. Labels are for humans; values are not logged.
# Usage (source from a workflow step):
#   . scripts/ci-require-env.sh
#   require_env "CONVEX_DEPLOY_KEY" "${CONVEX_DEPLOY_KEY}"
require_env() {
  label=$1
  value=$2
  if [ -z "${value}" ]; then
    echo "${label} unset — refusing." >&2
    exit 1
  fi
}
