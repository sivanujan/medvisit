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
            shift
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
# Step 2: Optional GitHub Actions CI Gate Check
# ------------------------------------------------------------------------------
echo "🔍 [Step 2/10] Checking CI workflow status for $SHORT_TARGET..."
CI_TOKEN=$(get_env_val "GITHUB_CI_CHECK_TOKEN" "")

if [ -n "$CI_TOKEN" ]; then
    CI_URL="https://api.github.com/repos/sivanujan/medvisit/actions/runs?head_sha=${TARGET_COMMIT}"
    CI_RESPONSE=$(curl -sSL -H "Authorization: Bearer $CI_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        -H "User-Agent: MedVisit-Deploy" \
        "$CI_URL" 2>/dev/null || echo "")

    # Look for workflow with name "CI" and check conclusion
    CI_CONCLUSION=$(echo "$CI_RESPONSE" | grep -A 10 '"name": "CI"' | grep '"conclusion":' | head -n 1 | cut -d '"' -f4 || echo "")

    if [ "$CI_CONCLUSION" = "success" ]; then
        echo "   ✅ GitHub CI check passed for $SHORT_TARGET."
    else
        echo "   ⚠️ GitHub CI conclusion for $SHORT_TARGET is: '${CI_CONCLUSION:-unknown}'"
        if [ "$FORCE_DEPLOY" = "true" ]; then
            echo "   ⚠️ WARNING: --force specified. Overriding CI gate failure!"
        else
            echo "   ❌ DEPLOYMENT REFUSED: Target commit $SHORT_TARGET has not passed CI."
            echo "   Run deployment with --force to override if this is an urgent hotfix."
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
        
        # Keep only the 5 most recent backups
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
# Trap Handlers for Safe Rollback if anything fails past this point
# ------------------------------------------------------------------------------
cleanup_on_error() {
    local exit_code=$?
    echo ""
    echo "================================================================="
    echo "❌ DEPLOYMENT FAILED AT STEP (Exit Code: $exit_code)!"
    echo "================================================================="
    
    # Ensure application is brought out of maintenance mode
    php artisan up 2>/dev/null || true
    
    echo "🚨 ROLLBACK INSTRUCTIONS:"
    echo "Code was updated toward $SHORT_TARGET ($TARGET_COMMIT)."
    echo "To restore application code and dependencies to previous commit $SHORT_PREV:"
    echo ""
    echo "  cd $APP_DIR"
    echo "  git reset --hard $PREV_COMMIT"
    echo "  composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction"
    echo "  npm ci --prefer-offline --no-audit && npm run build"
    echo "  php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan event:cache"
    echo "  sudo supervisorctl restart medvisit-worker-default:* medvisit-worker-pdfs:* medvisit-reverb"
    echo ""
    if [ -f "$BACKUP_FILE" ]; then
        echo "Pre-deploy database backup is available at:"
        echo "  $BACKUP_FILE"
        echo "To restore the database if migrations were executed:"
        echo "  gunzip -c $BACKUP_FILE | psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE"
        echo "  (NOTE: Do NOT restore if real patient/tenant data was committed during migration)"
    fi
    echo "================================================================="
    exit "$exit_code"
}
trap cleanup_on_error ERR

# ------------------------------------------------------------------------------
# Step 4: Code Update (git reset to origin/main)
# ------------------------------------------------------------------------------
echo "📦 [Step 4/10] Updating codebase to origin/main ($SHORT_TARGET)..."
git reset --hard origin/main

# ------------------------------------------------------------------------------
# Step 5: Backend & Frontend Dependencies & Build
# ------------------------------------------------------------------------------
echo "🐘 [Step 5/10] Installing Composer & npm dependencies and building assets..."
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
npm ci --prefer-offline --no-audit
npm run build

# ------------------------------------------------------------------------------
# Step 6: Database Migrations with Optional Maintenance Mode
# ------------------------------------------------------------------------------
echo "🗄️ [Step 6/10] Checking for pending database migrations..."
HAS_PENDING_MIGRATIONS=false
if ! php artisan migrate:status --pending 2>/dev/null | grep -q "No pending migrations"; then
    HAS_PENDING_MIGRATIONS=true
fi

MAINTENANCE_ACTIVE=false
if [ "$HAS_PENDING_MIGRATIONS" = "true" ]; then
    echo "   Pending migrations detected. Activating maintenance mode..."
    MAINT_SECRET=$(get_env_val "DEPLOY_MAINTENANCE_SECRET" "")
    
    if [ -n "$MAINT_SECRET" ]; then
        php artisan down --secret="$MAINT_SECRET" --render="errors::503"
    else
        echo "   ⚠️ WARNING: DEPLOY_MAINTENANCE_SECRET is not set in .env."
        php artisan down --render="errors::503"
    fi
    MAINTENANCE_ACTIVE=true

    echo "   Running database migrations..."
    php artisan migrate --force

    echo "   Deactivating maintenance mode..."
    php artisan up
    MAINTENANCE_ACTIVE=false
else
    echo "   No pending migrations. Skipping maintenance mode."
    php artisan migrate --force
fi

# ------------------------------------------------------------------------------
# Step 7: Warm Framework Caches
# ------------------------------------------------------------------------------
echo "⚡ [Step 7/10] Warming framework caches..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# ------------------------------------------------------------------------------
# Step 8: Permissions & Static Prelaunch Page
# ------------------------------------------------------------------------------
echo "🔒 [Step 8/10] Verifying file permissions and static pages..."
chown -R deploy:www-data "$APP_DIR"
chmod 640 "$APP_DIR/.env"
chmod -R 775 "$APP_DIR/storage" "$APP_DIR/bootstrap/cache"

if [ -f "$APP_DIR/resources/prelaunch/index.html" ]; then
    echo "   Syncing prelaunch coming-soon page (/var/www/prelaunch/index.html)..."
    if ( mkdir -p /var/www/prelaunch 2>/dev/null && cp "$APP_DIR/resources/prelaunch/index.html" /var/www/prelaunch/index.html 2>/dev/null ); then
        chmod 644 /var/www/prelaunch/index.html 2>/dev/null || true
        chown deploy:www-data /var/www/prelaunch/index.html 2>/dev/null || true
        echo "   ✅ Prelaunch page updated."
    else
        echo "   ⚠️ WARNING: Could not copy to /var/www/prelaunch/index.html (check permissions: sudo chown -R deploy:www-data /var/www/prelaunch)."
    fi
fi

# ------------------------------------------------------------------------------
# Step 9: Restart Daemons (Queues & WebSockets)
# ------------------------------------------------------------------------------
echo "🔄 [Step 9/10] Restarting queue workers and Reverb WebSocket server..."
php artisan queue:restart
sudo supervisorctl restart medvisit-worker-default:* medvisit-worker-pdfs:* medvisit-reverb

# ------------------------------------------------------------------------------
# Step 10: Post-Deploy Smoke Checks
# ------------------------------------------------------------------------------
echo "🌐 [Step 10/10] Performing post-deploy smoke checks..."
UP_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" https://medvisit.lk/up || echo "000")
echo "   Central health endpoint (https://medvisit.lk/up): HTTP $UP_STATUS"

if [ "$UP_STATUS" != "200" ]; then
    echo "   ⚠️ WARNING: Healthcheck returned HTTP $UP_STATUS instead of 200."
fi

# Check clinic subdomain if configured or available
CLINIC_DOMAIN=$(get_env_val "SMOKE_TEST_SUBDOMAIN" "")
if [ -z "$CLINIC_DOMAIN" ]; then
    CLINIC_DOMAIN=$(php artisan tinker --execute 'echo \App\Models\Tenant::first()?->domains()->first()?->domain ?? "";' 2>/dev/null || true)
fi

if [ -n "$CLINIC_DOMAIN" ]; then
    SUB_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" "https://${CLINIC_DOMAIN}/" || echo "000")
    echo "   Clinic subdomain health (https://${CLINIC_DOMAIN}/): HTTP $SUB_STATUS"
fi

DEPLOY_END=$(date +%s)
DURATION=$((DEPLOY_END - DEPLOY_START))
echo "================================================================="
echo "✅ MedVisit successfully deployed from $SHORT_PREV to $SHORT_TARGET in ${DURATION}s!"
echo "================================================================="
