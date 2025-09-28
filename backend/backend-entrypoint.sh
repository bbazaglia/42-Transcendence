#!/bin/sh
set -e

# Helper function to generate a secret if the environment variable is not set.
generate_secret_if_needed() {
  local var_name="$1"

  local current_value=$(eval echo "\$$var_name")

  if [ -z "$current_value" ]; then
    echo "$var_name is not set. Generating a new random secret."

    # 'export' makes the variable available to the main application process.
    export "$var_name"=$(openssl rand -hex 32)
  else
    echo "$var_name is already set. Using the provided value."
  fi
}

generate_secret_if_needed "JWT_SECRET"
generate_secret_if_needed "COOKIE_SECRET"

echo "Running Prisma migrations for SQLite database..."

npx prisma migrate deploy --schema=./src/schemas/schema.prisma

echo "Prisma migrations applied successfully."

# The 'exec "$@"' replaces the script process with
# the command passed from the Dockerfile's CMD.
exec "$@"