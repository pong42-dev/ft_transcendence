#!/bin/sh

# Path to your SQLite database file inside the container volume
# Assuming your database.sqlite is directly in the /app/database volume mount
DB_PATH="/app/database/database.sqlite"

# Check if the database file exists
if [ ! -f "$DB_PATH" ]; then
  echo "Database file not found at $DB_PATH. Running db:reset..."
  # Run the full database reset (drop, create, migrate, seed)
  npm run db:reset
else
  echo "Database file found at $DB_PATH. Skipping db:reset."
fi

# Execute the main application command
exec "$@" 