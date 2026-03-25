#!/bin/bash
# ============================================================
# Docker MySQL Init Script
# Runs all SQL migration scripts in order against the database
# created by the 001_CreateDatabase.sql script.
# ============================================================
# This script is mounted at /docker-entrypoint-initdb.d/init.sh
# MySQL Docker will execute it after creating MYSQL_DATABASE.
# ============================================================

set -e

echo "🗄️  Running VinhKhanh database migrations..."

# The scripts reference their own USE statements,
# so we just execute them in order.
for f in /sql-scripts/*.sql; do
    echo "▶ Running $f..."
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" < "$f"
    echo "✅ $f completed."
done

echo "🎉 All database migrations completed successfully!"
