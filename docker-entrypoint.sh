#!/bin/sh
set -e

# Fix permissions on the data directory so any mounted volume is writable
# by the nextjs user (uid 1001), regardless of host ownership.
if [ -d /app/data ]; then
  chown -R 1001:1001 /app/data 2>/dev/null || true
fi

# Drop privileges and exec the main process
exec su-exec nextjs "$@"
