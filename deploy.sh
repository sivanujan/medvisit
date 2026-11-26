#!/usr/bin/env bash
# ==============================================================================
# MedVisit Production Deployment Script
# Target: /var/www/medvisit
# User: deploy
# ==============================================================================
set -euo pipefail

# Parse command line flags
FORCE_DEPLOY=false
for arg in "$@"; do
    case "$arg" in
        --force|-f)
            FORCE_DEPLOY=true
            ;;
    esac
done

echo "================================================================="
echo "🚀 MedVisit Production Deployment Starting..."
echo "================================================================="
DEPLOY_START=$(date +%s)
APP_DIR="/var/www/medvisit"

if [ ! -d "$APP_DIR" ]; then
    echo "❌ Error: Application directory $APP_DIR does not exist."
    exit 1
fi

cd "$APP_DIR"

# ------------------------------------------------------------------------------
# Helper: Read value from .env without sourcing or printing secrets
# ------------------------------------------------------------------------------
get_env_val() {
    local key="$1"
    local default="${2:-}"
    if [ -f "$APP_DIR/.env" ]; then
        local val
        val=$(grep -E "^${key}=" "$APP_DIR/.env" 2>/dev/null | head -n 1 | cut -d '=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true)
        echo "${val:-$default}"
    else
        echo "$default"
    fi
}

# ------------------------------------------------------------------------------
# Step 1: Record commits (Before & Target)
# ------------------------------------------------------------------------------
echo "📋 [Step 1/10] Recording deployment commits..."
PREV_COMMIT=$(git rev-parse HEAD)
SHORT_PREV=$(git rev-parse --short HEAD)

git fetch origin main --quiet
TARGET_COMMIT=$(git rev-parse origin/main)
SHORT_TARGET=$(git rev-parse --short origin/main)

echo "   Current Commit: $SHORT_PREV ($PREV_COMMIT)"
echo "   Target Commit:  $SHORT_TARGET ($TARGET_COMMIT)"

if [ "$PREV_COMMIT" = "$TARGET_COMMIT" ] && [ "$FORCE_DEPLOY" = "false" ]; then
    echo "ℹ️ Already at latest origin/main ($SHORT_PREV). Use --force to redeploy."
    exit 0
fi

# ------------------------------------------------------------------------------
# Step 2: Optional GitHub Actions CI Gate Check (Validated JSON Parsing)
# ------------------------------------------------------------------------------
echo "🔍 [Step 2/10] Checking CI workflow status for $SHORT_TARGET..."
CI_TOKEN=$(get_env_val "GITHUB_CI_CHECK_TOKEN" "")

if [ -n "$CI_TOKEN" ]; then
    CI_URL="https://api.github.com/repos/sivanujan/medvisit/actions/runs?head_sha=${TARGET_COMMIT}"
    CI_RESPONSE_FILE=$(mktemp)

    if curl -sSL -f -H "Authorization: Bearer $CI_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        -H "User-Agent: MedVisit-Deploy" \
        "$CI_URL" > "$CI_RESPONSE_FILE" 2>/dev/null; then

        CI_RESULT=$(php -r '
            $raw = file_get_contents($argv[1]);
            $targetSha = $argv[2];
            $data = json_decode($raw, true);
            $runs = $data["workflow_runs"] ?? [];
            foreach ($runs as $run) {
                if (($run["head_sha"] ?? "") === $targetSha && ($run["name"] ?? "") === "CI") {
                    $status = $run["status"] ?? "";
                    $conclusion = $run["conclusion"] ?? "";
                    if ($status === "completed" && $conclusion === "success") {
                        echo "SUCCESS";
                        exit(0);
                    }
                    echo "RUN_FOUND:" . ($conclusion ?: $status);
                    exit(0);
                }
            }
            echo "NOT_FOUND";
            exit(0);
        ' "$CI_RESPONSE_FILE" "$TARGET_COMMIT" 2>/dev/null || echo "PARSE_ERROR")

        rm -f "$CI_RESPONSE_FILE"

        if [ "$CI_RESULT" = "SUCCESS" ]; then
            echo "   ✅ Verified: Commit $SHORT_TARGET completed CI workflow with status=completed, conclusion=success."
        else
            echo "   ⚠️ GitHub CI check returned: $CI_RESULT"
            if [ "$FORCE_DEPLOY" = "true" ]; then
                echo "   ⚠️ WARNING: --force specified. Overriding CI gate failure!"
            else
                echo "   ❌ DEPLOYMENT REFUSED: Target commit $SHORT_TARGET has not passed CI (status: $CI_RESULT)."
                echo "   Run deployment with --force to override if this is an urgent hotfix."
                exit 1
            fi
        fi
    else
        rm -f "$CI_RESPONSE_FILE"
        echo "   ⚠️ WARNING: Failed to query GitHub API with GITHUB_CI_CHECK_TOKEN."
        if [ "$FORCE_DEPLOY" != "true" ]; then
            echo "   Use --force to bypass API query failures."
            exit 1
        fi
    fi
else
    echo "   ⚠️ WARNING: GITHUB_CI_CHECK_TOKEN is not configured in .env. Skipping CI verification."
fi

# ------------------------------------------------------------------------------
# Step 3: Database Pre-Migration Backup (Compressed pg_dump)
# ------------------------------------------------------------------------------
echo "💾 [Step 3/10] Creating pre-migration database backup..."
BACKUP_DIR="/var/backups/medvisit"
BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/pre-deploy-${BACKUP_TIMESTAMP}-${SHORT_TARGET}.sql.gz"

DB_HOST=$(get_env_val "DB_HOST" "127.0.0.1")
DB_PORT=$(get_env_val "DB_PORT" "5432")
DB_DATABASE=$(get_env_val "DB_DATABASE" "medvisit")
DB_USERNAME=$(get_env_val "DB_USERNAME" "medvisit")
DB_PASSWORD=$(get_env_val "DB_PASSWORD" "")

if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR" 2>/dev/null || true
fi

if [ -w "$BACKUP_DIR" ]; then
    echo "   Dumping $DB_DATABASE to $BACKUP_FILE..."
    if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" --no-owner --no-privileges | gzip -9 > "$BACKUP_FILE"; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "   ✅ Backup created ($BACKUP_SIZE)."

        # Keep only the 5 most recent snapshots
        ls -1t "${BACKUP_DIR}"/pre-deploy-*.sql.gz 2>/dev/null | tail -n +6 | xargs -r rm -f || true
    else
        echo "   ❌ FATAL: Database backup failed! Aborting deployment before updating code."
        rm -f "$BACKUP_FILE"
        exit 1
    fi
else
    echo "   ❌ FATAL: Backup directory $BACKUP_DIR is not writable. Aborting deployment."
    echo "   Fix ownership: sudo mkdir -p $BACKUP_DIR && sudo chown deploy:deploy $BACKUP_DIR"
    exit 1
fi

# ------------------------------------------------------------------------------
# Check for Migrations BEFORE updating code & Determine Maintenance Timing
# ------------------------------------------------------------------------------
HAS_MIGRATIONS=false
if [ -n "$(git diff --name-only "$PREV_COMMIT" "$TARGET_COMMIT" -- database/migrations)" ]; then
    HAS_MIGRATIONS=true
fi

MAINTENANCE_ACTIVE=false

# ------------------------------------------------------------------------------
# Trap Handlers for Safe Rollback if anything fails past this point
# ------------------------------------------------------------------------------
cleanup_on_error() {
    local exit_code=$?
    echo ""
    echo "================================================================="
    echo "❌ DEPLOYMENT FAILED (Exit Code: $exit_code)!"
    echo "================================================================="

    # Ensure application is brought out of maintenance mode if it was enabled
    if [ "${MAINTENANCE_ACTIVE:-false}" = "true" ]; then
        echo "🔓 Bringing application out of maintenance mode..."
        php artisan up 2>/dev/null || true
    fi

    # Clean up any leftover temporary frontend build staging directory
    if [ -n "${BUILD_TEMP_DIR:-}" ] && [ -d "$BUILD_TEMP_DIR" ]; then
        rm -rf "$BUILD_TEMP_DIR"
    fi

    echo ""
    echo "🚨 ROLLBACK INSTRUCTIONS (Code & Dependencies):"
    echo "To restore application code and dependencies to previous commit $SHORT_PREV:"
    echo ""
    echo "  cd $APP_DIR"
    echo "  git reset --hard $PREV_COMMIT"
    echo "  composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction"
    echo "  npm ci --prefer-offline --no-audit"
    echo "  npm run build"
    echo "  php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan event:cache"
    echo "  sudo supervisorctl restart medvisit-worker-default:* medvisit-worker-pdfs:* medvisit-reverb"
    echo ""
    if [ -f "$BACKUP_FILE" ]; then
        echo "================================================================="
        echo "⚠️ DATABASE RESTORE (ONLY IF MIGRATIONS CORRUPTED DATA):"
        echo "Pre-deploy snapshot available at: $BACKUP_FILE"
        echo "Do NOT execute blindly if new patient or billing data was created during deployment!"
        echo "Safe explicit restore sequence:"
        echo "  1. Stop background workers:"
        echo "     sudo supervisorctl stop medvisit-worker-default:* medvisit-worker-pdfs:* medvisit-reverb"
        echo "  2. Place app in maintenance mode:"
        echo "     php artisan down --render=\"errors::503\""
        echo "  3. Terminate active database connections, drop and recreate database:"
        echo "     sudo -u postgres psql -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_DATABASE' AND pid <> pg_backend_pid();\""
        echo "     sudo -u postgres dropdb $DB_DATABASE"
        echo "     sudo -u postgres createdb -O $DB_USERNAME $DB_DATABASE"
        echo "     sudo -u postgres psql -d $DB_DATABASE -c \"CREATE EXTENSION IF NOT EXISTS pg_trgm;\""
        echo "  4. Restore the pre-deploy snapshot (enter password when prompted):"
        echo "     gunzip -c $BACKUP_FILE | psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE -W"
        echo "  5. Bring app back up and restart background workers:"
        echo "     php artisan up"
        echo "     sudo supervisorctl start medvisit-worker-default:* medvisit-worker-pdfs:* medvisit-reverb"
        echo "================================================================="
    fi
    exit "$exit_code"
}
trap cleanup_on_error ERR

# ------------------------------------------------------------------------------
# Maintenance Mode: Activated BEFORE code update if migrations exist
# ------------------------------------------------------------------------------
if [ "$HAS_MIGRATIONS" = "true" ]; then
    echo "🛑 [Step 4/10] Database migration changes detected between $SHORT_PREV and $SHORT_TARGET."
    echo "   Activating maintenance mode BEFORE updating code and dependencies..."
    MAINT_SECRET=$(get_env_val "DEPLOY_MAINTENANCE_SECRET" "")

    if [ -n "$MAINT_SECRET" ]; then
        php artisan down --secret="$MAINT_SECRET" --render="errors::503"
    else
        echo "   ⚠️ WARNING: DEPLOY_MAINTENANCE_SECRET is not set in .env."
        php artisan down --render="errors::503"
    fi
    MAINTENANCE_ACTIVE=true
else
    echo "ℹ️ [Step 4/10] No migration changes between $SHORT_PREV and $SHORT_TARGET. Zero-downtime deployment."
fi

# ------------------------------------------------------------------------------
# Step 5: Code Update (git reset to origin/main)
# ------------------------------------------------------------------------------
echo "📦 [Step 5/10] Updating codebase to origin/main ($SHORT_TARGET)..."
git reset --hard origin/main

# ------------------------------------------------------------------------------
# Step 6: Backend & Frontend Dependencies + Atomic Frontend Build
# ------------------------------------------------------------------------------
echo "🐘 [Step 6/10] Installing Composer & npm dependencies and building assets..."
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
npm ci --prefer-offline --no-audit

# Safe atomic frontend build: build into temporary directory, then swap
echo "   Compiling frontend assets with atomic directory swap..."
npx tsc --noEmit
BUILD_TEMP_DIR="$APP_DIR/public/build_tmp_$$"
BUILD_OLD_DIR="$APP_DIR/public/build_old_$$"
rm -rf "$BUILD_TEMP_DIR" "$BUILD_OLD_DIR"

npx vite build --outDir "$BUILD_TEMP_DIR"

# Atomically swap: move existing to old, move new to build, remove old
if [ -d "$APP_DIR/public/build" ]; then
    mv "$APP_DIR/public/build" "$BUILD_OLD_DIR"
fi
mv "$BUILD_TEMP_DIR" "$APP_DIR/public/build"
rm -rf "$BUILD_OLD_DIR"
echo "   ✅ Frontend build swapped atomically into public/build."

# ------------------------------------------------------------------------------
# Step 7: Database Migrations (if changes detected) & Cache Warming
# ------------------------------------------------------------------------------
echo "🗄️ [Step 7/10] Executing database migrations and warming caches..."
if [ "$HAS_MIGRATIONS" = "true" ]; then
    echo "   Running database migrations..."
    php artisan migrate --force
fi

echo "   Warming framework caches..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Deactivate maintenance mode once migrations and caches are primed
if [ "$MAINTENANCE_ACTIVE" = "true" ]; then
    echo "🔓 Deactivating maintenance mode..."
    php artisan up
    MAINTENANCE_ACTIVE=false
fi

# ------------------------------------------------------------------------------
# Step 8: Permissions & Static Prelaunch Page
# ------------------------------------------------------------------------------
echo "🔒 [Step 8/10] Verifying storage permissions and static pages..."

# Targeted permissions on storage and bootstrap/cache (non-fatal, never chown whole app dir)
if sudo -n chown -R deploy:www-data "$APP_DIR/storage" "$APP_DIR/bootstrap/cache" 2>/dev/null && \
   sudo -n chmod -R ug+rwX "$APP_DIR/storage" "$APP_DIR/bootstrap/cache" 2>/dev/null; then
    echo "   ✅ Storage and cache permissions refreshed via sudo."
elif chown -R deploy:www-data "$APP_DIR/storage" "$APP_DIR/bootstrap/cache" 2>/dev/null && \
     chmod -R ug+rwX "$APP_DIR/storage" "$APP_DIR/bootstrap/cache" 2>/dev/null; then
    echo "   ✅ Storage and cache permissions refreshed directly."
else
    echo "   ⚠️ NOTICE: Sudo permission refresh skipped (non-fatal). Ensure storage is writable by www-data."
fi

chmod 640 "$APP_DIR/.env" 2>/dev/null || true

if [ -f "$APP_DIR/resources/prelaunch/index.html" ]; then
    echo "   Syncing prelaunch coming-soon page (/var/www/prelaunch/index.html)..."
    if ( mkdir -p /var/www/prelaunch 2>/dev/null && cp "$APP_DIR/resources/prelaunch/index.html" /var/www/prelaunch/index.html 2>/dev/null ); then
        chmod 644 /var/www/prelaunch/index.html 2>/dev/null || true
        chown deploy:www-data /var/www/prelaunch/index.html 2>/dev/null || true
        echo "   ✅ Prelaunch page updated."
    else
        echo "   ⚠️ NOTICE: Could not copy to /var/www/prelaunch/index.html (non-fatal)."
    fi
fi

# ------------------------------------------------------------------------------
# Step 9: Restart Daemons (Queues & WebSockets)
# ------------------------------------------------------------------------------
echo "🔄 [Step 9/10] Restarting queue workers and Reverb WebSocket server..."
php artisan queue:restart
sudo supervisorctl restart medvisit-worker-default:* medvisit-worker-pdfs:* medvisit-reverb

# ------------------------------------------------------------------------------
# Step 10: Post-Deploy Smoke Checks (Valid SSL, No -k)
# ------------------------------------------------------------------------------
echo "🌐 [Step 10/10] Performing post-deploy smoke checks..."
UP_STATUS=$(curl -sSL -o /dev/null -w "%{http_code}" https://medvisit.lk/up || echo "000")
echo "   Central health endpoint (https://medvisit.lk/up): HTTP $UP_STATUS"

if [ "$UP_STATUS" != "200" ]; then
    echo "   ⚠️ WARNING: Healthcheck returned HTTP $UP_STATUS instead of 200."
fi

# Check clinic subdomain only if explicitly configured in .env
CLINIC_DOMAIN=$(get_env_val "SMOKE_TEST_SUBDOMAIN" "")
if [ -n "$CLINIC_DOMAIN" ]; then
    SUB_STATUS=$(curl -sSL -o /dev/null -w "%{http_code}" "https://${CLINIC_DOMAIN}/" || echo "000")
    echo "   Configured clinic subdomain health (https://${CLINIC_DOMAIN}/): HTTP $SUB_STATUS"
    if [ "$SUB_STATUS" != "200" ] && [ "$SUB_STATUS" != "302" ]; then
        echo "   ⚠️ WARNING: Clinic subdomain returned HTTP $SUB_STATUS."
    fi
else
    echo "   ℹ️ SMOKE_TEST_SUBDOMAIN not set in .env. Skipping subdomain smoke test."
fi

DEPLOY_END=$(date +%s)
DURATION=$((DEPLOY_END - DEPLOY_START))
echo "================================================================="
echo "✅ MedVisit successfully deployed from $SHORT_PREV to $SHORT_TARGET in ${DURATION}s!"
echo "================================================================="
