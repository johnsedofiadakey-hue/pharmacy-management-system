#!/bin/bash
# Machine-agnostic dev launcher — uses whatever node is on PATH and runs
# pnpm through corepack so no global pnpm install is required.
cd "$(dirname "$0")"
exec corepack pnpm dev
