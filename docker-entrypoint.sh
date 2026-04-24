#!/bin/sh
set -e

PUID=${PUID:-1001}
PGID=${PGID:-1001}

# Create group matching PGID if it doesn't exist
if ! getent group "$PGID" > /dev/null 2>&1; then
  addgroup -g "$PGID" appgroup
fi
GROUP=$(getent group "$PGID" | cut -d: -f1)

# Create user matching PUID if it doesn't exist
if ! getent passwd "$PUID" > /dev/null 2>&1; then
  adduser -D -u "$PUID" -G "$GROUP" appuser
fi
RUN_AS=$(getent passwd "$PUID" | cut -d: -f1)

# Fix data dir ownership so the resolved user can write
chown -R "$PUID:$PGID" /app/data

exec su-exec "$RUN_AS" "$@"
