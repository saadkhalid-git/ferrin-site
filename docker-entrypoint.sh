#!/bin/sh
# Apply any new database migrations, then start the server.
set -e
npx prisma migrate deploy
exec node server/index.js
