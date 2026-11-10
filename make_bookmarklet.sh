#!/usr/bin/bash

set -eo pipefail

SELF=$(readlink -f "$0")
DIR=$(dirname "$SELF")

cd "$DIR"

echo "javascript:void(fetch('data:;base64,$(minify save-table.js|gzip -9 --no-name|base64 -w0)').then(r=>new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text().then(eval)))"
