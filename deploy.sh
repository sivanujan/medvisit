#!/usr/bin/env bash
set -eo pipefail

echo "🚀 Starting MedVisit Production Deployment..."
DEPLOY_START=$(date +%s)

APP_DIR="/var/www/medvisit"
cd "$APP_DIR"

# 1. Maintenance mode (optional bypass for admin)
echo "📦 Pulling latest changes from main..."
git fetch origin main
git reset --hard origin/main

# 2. PHP dependencies
echo "🐘 Installing Composer dependencies..."
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction

# 3. Database migrations
echo "🗄️ Running database migrations..."
php artisan migrate --force

# 4. Frontend build
echo "🎨 Building frontend assets..."
npm ci --prefer-offline --no-audit
npm run build

# 5. Warm Laravel caches
echo "⚡ Warming caches..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 6. Ensure correct permissions
echo "🔒 Verifying file permissions..."
chown -R deploy:www-data "$APP_DIR"
chmod 640 "$APP_DIR/.env"
chmod -R 775 "$APP_DIR/storage" "$APP_DIR/bootstrap/cache"

# 7. Restart workers and WebSocket server
echo "🔄 Restarting queue workers and Reverb..."
php artisan queue:restart
sudo supervisorctl restart medvisit-worker-default:* medvisit-worker-pdfs:* medvisit-reverb

DEPLOY_END=$(date +%s)
DURATION=$((DEPLOY_END - DEPLOY_START))
echo "✅ MedVisit deployed successfully in ${DURATION}s!"
