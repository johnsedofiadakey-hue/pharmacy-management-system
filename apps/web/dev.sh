#!/bin/bash
export PATH="/Users/verafafaagbenya/.nvm/versions/node/v24.18.0/bin:$PATH"
cd "$(dirname "$0")"
exec pnpm dev
