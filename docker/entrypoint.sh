#!/bin/sh
set -eu

echo "[deploydock] running prisma migrate deploy"
node node_modules/prisma/build/index.js migrate deploy

echo "[deploydock] seeding admin user (idempotent)"
node prisma/seed-runtime.js

echo "[deploydock] starting next server"
exec node node_modules/next/dist/bin/next start

