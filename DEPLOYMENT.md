# MedVisit Production Deployment Record

This document records the exact server configuration, installation steps, commands, and service architecture for the MedVisit production server on Contabo VPS (`62.171.156.211`).

---

## 1. Server Specification & OS

- **Provider**: Contabo Cloud VPS 4
- **Specs**: 4 vCPU, 8 GB RAM, 100 GB SSD
- **Region**: EU
- **Public IP**: `62.171.156.211`
- **Operating System**: Ubuntu 26.04.1 LTS (Resolute)
- **Hostname**: `medvisit-prod`
- **System Timezone**: UTC (`timedatectl set-timezone UTC`)

---

## 2. Server Base & Security Hardening (Step 1)

### 2.1 Hostname & Timezone
```bash
hostnamectl set-hostname medvisit-prod
timedatectl set-timezone UTC
```

### 2.2 System Updates & Core Packages
```bash
DEBIAN_FRONTEND=noninteractive apt update
DEBIAN_FRONTEND=noninteractive apt full-upgrade -y
DEBIAN_FRONTEND=noninteractive apt install -y unattended-upgrades fail2ban ufw git curl unzip htop rclone
```

### 2.3 Swap Configuration (4 GB, swappiness=10)
```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10
echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
```

### 2.4 Deploy User & Sudo
- User: `deploy`
- Group: `sudo`, `www-data`
- Shell: `/bin/bash`
- Passwordless Sudo: `/etc/sudoers.d/deploy`
```bash
useradd -m -s /bin/bash -G sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
echo 'deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/deploy
chmod 440 /etc/sudoers.d/deploy
```

### 2.5 Firewall (UFW)
- Incoming default: DENY
- Outgoing default: ALLOW
- Ports allowed:
  - 22/tcp (OpenSSH)
  - 80/tcp (HTTP)
  - 443/tcp (HTTPS)
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### 2.6 fail2ban
- Default `sshd` jail enabled and running.
```bash
systemctl enable fail2ban
systemctl restart fail2ban
```

### 2.7 SSH Hardening (`/etc/ssh/sshd_config.d/99-hardening.conf`)
- `PermitRootLogin no`
- `PasswordAuthentication no`
- `KbdInteractiveAuthentication no`
- Overrides neutralized in `/etc/cloud/cloud.cfg.d/99-ssh.cfg` (`ssh_pwauth: 0`) and `/etc/ssh/sshd_config.d/50-cloud-init.conf`.
- Verified: `ssh medvisit` (as `deploy`) succeeds; `ssh -l root medvisit` is rejected with `Permission denied (publickey)`.

---

## 3. Stack Installation (Step 2)

### 3.1 Installed Software Versions
- **PHP**: 8.5.4 (FPM & CLI)
- **Composer**: 2.10.3
- **PostgreSQL**: 18.6
- **Node.js**: v22.23.4 (LTS via NodeSource) / npm 10.9.9
- **Redis**: 8.0.5
- **Nginx**: 1.28.3
- **Google Chrome**: 156.0.8078.73 (headless support for Spatie Browsershot / ChromiumPdfService)

### 3.2 PHP 8.5 Configuration (`/etc/php/8.5/mods-available/99-medvisit.ini`)
In Debian/Ubuntu PHP, files in `/etc/php/8.5/mods-available/` activated via `phpenmod` are linked into both FPM (`/etc/php/8.5/fpm/conf.d/`) and CLI (`/etc/php/8.5/cli/conf.d/`). Because `conf.d` entries are evaluated after base `php.ini`, setting directives in `99-medvisit.ini` acts as the single source of truth and prevents conflicts or overwrites during package updates.

**Directives in `/etc/php/8.5/mods-available/99-medvisit.ini`:**
```ini
memory_limit = 512M
upload_max_filesize = 20M
post_max_size = 25M
max_execution_time = 120
date.timezone = UTC
expose_php = Off
opcache.enable = 1
curl.cainfo = /etc/ssl/certs/ca-certificates.crt
openssl.cafile = /etc/ssl/certs/ca-certificates.crt
```

**Commands to set and activate:**
```bash
# 1. Write or verify /etc/php/8.5/mods-available/99-medvisit.ini:
sudo tee -a /etc/php/8.5/mods-available/99-medvisit.ini << 'EOF'
upload_max_filesize = 20M
post_max_size = 25M
EOF

# 2. Enable module across FPM and CLI (creates symlinks in conf.d/):
sudo phpenmod 99-medvisit

# 3. Restart PHP 8.5 FPM:
sudo systemctl restart php8.5-fpm
```

### 3.3 PostgreSQL 18 Tuning (`/etc/postgresql/18/main/conf.d/99-medvisit.conf`)
- `listen_addresses = 'localhost'`
- `shared_buffers = 1GB`
- `effective_cache_size = 4GB`
- `work_mem = 16MB`
- `maintenance_work_mem = 256MB`
- `min_wal_size = 1GB`
- `max_wal_size = 4GB`
- Role `medvisit` created with secure randomized password.
- Database `medvisit` created owned by `medvisit`.
- Extension `pg_trgm` installed.

### 3.4 Redis Configuration (`/etc/redis/conf.d-medvisit.conf`)
- `bind 127.0.0.1 ::1`
- `requirepass <generated-secret>`
- `maxmemory 512mb`
- `maxmemory-policy allkeys-lru`

### 3.5 Headless Chromium & Fonts
- Google Chrome installed via official Debian package.
- System fonts: `fonts-liberation`, `fonts-noto-core`, `fonts-noto-cjk`, `fonts-noto-color-emoji`, `fonts-lklug-sinhala`, `fonts-indic`.
- Headless execution tested for users `deploy` and `www-data` with `--no-sandbox`.

---

## 4. Application Codebase & Setup (Step 3)

### 4.1 Repository Clone
- Deploy key configured at `/home/deploy/.ssh/id_ed25519` (read-only).
- Application directory: `/var/www/medvisit`
- Cloned from `git@github.com:sivanujan/medvisit.git` (branch: `main`).
- Ownership: `deploy:www-data`.

### 4.2 Dependencies & Build
```bash
cd /var/www/medvisit
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

### 4.3 Environment Configuration (`/var/www/medvisit/.env`)
- Initialized from `.env.example`.
- Permissions: `chmod 640 /var/www/medvisit/.env`, owned by `deploy:www-data`.
- Core non-secret values configured:
  - `APP_NAME="MedVisit"`
  - `APP_ENV=production`
  - `APP_DEBUG=false`
  - `APP_URL=https://medvisit.lk`
  - `APP_TIMEZONE=UTC`
  - `SESSION_DRIVER=redis`
  - `CACHE_STORE=redis`
  - `QUEUE_CONNECTION=redis`
  - `DB_CONNECTION=pgsql`
  - `DB_HOST=127.0.0.1`
  - `DB_PORT=5432`
  - `DB_DATABASE=medvisit`
  - `DB_USERNAME=medvisit`
  - `REDIS_HOST=127.0.0.1`
  - `REDIS_PORT=6379`
- `APP_KEY` generated via `php artisan key:generate --force`.
- Passwords (`DB_PASSWORD`, `REDIS_PASSWORD`) populated securely from local server credentials.

---

## 5. Migrations & Database Seeding (Step 3)

### 5.1 Migrations
```bash
php artisan migrate --force
```
- Core tables, tenant schemas, indexes, and automated plan seeding executed cleanly.

### 5.2 Production Seeders
- `PharmacyPermissionsSeeder`: official system roles (`super_admin`, `clinic_admin`, `doctor`, `pharmacist`, `receptionist`) and permissions.
- `WebsiteTemplateSeeder`: 5 free presets and 5 premium templates seeded. Premium template sales gated via `PREMIUM_TEMPLATE_SALES_ENABLED=false` until owner approval.
- Excluded seeders: `DatabaseSeeder`, `DemoClinicSeeder`, `DemoPatientDirectorySeeder`, `DemoPrescriptionTemplatesSeeder`, `QaScenarioSeeder`.

### 5.3 Database Row Count Audit
- `roles`: 5
- `permissions`: 12
- `plans`: 5 (3 active tiers: Basic, Pro, Advanced)
- `website_templates`: 10 (5 free presets + 5 premium)
- `tenants`: 0 (clean production DB)
- `patients`: 0 (zero demo/test patients)

---

## 6. Web Server & Background Services (Step 4 & 5)

### 6.1 Nginx & Cloudflare SSL (`/etc/nginx/sites-available/medvisit.conf`)
- Certificate: `/etc/ssl/cloudflare/medvisit.lk.pem`
- Private key: `/etc/ssl/cloudflare/medvisit.lk.key`
- Domains: `medvisit.lk`, `*.medvisit.lk`
- HTTP → HTTPS 301 redirection.
- HTTP/2 enabled on port 443.
- FastCGI backend: `unix:/run/php/php8.5-fpm.sock`.
- Cloudflare Real IP restoration: `/etc/nginx/conf.d/cloudflare-realip.conf`.
- Reverb WebSocket proxy: `/app` and `/apps` locations proxied to `http://127.0.0.1:8080`.
- Client upload limit: `client_max_body_size 20M;` added inside server block(s) to allow photo uploads up to 20MB payload envelope without 413 entity errors.
- SVG Security Headers (Defense-in-depth against stored XSS / script execution):
  ```nginx
  location ~* \.svg$ {
      add_header Content-Type "image/svg+xml" always;
      add_header X-Content-Type-Options "nosniff" always;
      add_header Content-Security-Policy "default-src 'none'; style-src 'unsafe-inline'" always;
  }
  ```

**Reload & Apply Web Server / PHP Changes:**
```bash
# Test Nginx syntax and reload, then restart PHP-FPM:
sudo nginx -t && sudo systemctl reload nginx && sudo systemctl restart php8.5-fpm
```

### 6.2 Supervisor Daemons (`/etc/supervisor/conf.d/medvisit.conf`)
- `medvisit-worker-default`: 2 worker processes running `queue:work redis --queue=default`.
- `medvisit-worker-pdfs`: 1 dedicated worker process running `queue:work redis --queue=pdfs` (concurrency 1 for PDF rendering stability).
- `medvisit-reverb`: 1 WebSocket server process running `reverb:start --host=127.0.0.1 --port=8080`.
- All processes running as `www-data` under automated restart supervision.

### 6.3 Cron Scheduler (`/etc/cron.d/medvisit`)
- System cron entry configured for `www-data`:
  ```cron
  * * * * * www-data cd /var/www/medvisit && php artisan schedule:run >> /dev/null 2>&1
  ```

### 6.4 Prelaunch Homepage Redirect & Owner Bypass
- **Snippet File**: `/etc/nginx/snippets/medvisit-prelaunch.conf`
- **Static Page**: `/var/www/prelaunch/index.html` (self-contained, Poppins font, responsive light/dark design, contact WhatsApp/Email, legal links, `noindex`).
- **Behavior**:
  - `location = /` on `medvisit.lk` / `www.medvisit.lk` temporarily redirects (`302`) to `/coming`.
  - `/coming` serves the static HTML directly from Nginx.
  - All other routes (`/register`, `/pricing`, `/terms`, `/privacy-policy`, `/login`, etc.) and clinic subdomains (`*.medvisit.lk`) remain fully operational without redirection.
  - **Owner Bypass**:
    - Visit `https://medvisit.lk/__home-on` to set cookie `mv_home=1` (30 days) and view the real homepage.
    - Visit `https://medvisit.lk/__home-off` to clear the cookie and restore the prelaunch redirect.
- **To Launch**:
  In `/etc/nginx/sites-available/medvisit.conf`, comment out the include:
  ```nginx
  # include /etc/nginx/snippets/medvisit-prelaunch.conf;
  ```
  Then reload Nginx:
  ```bash
  sudo nginx -t && sudo systemctl reload nginx
  ```

---

## 7. Verification & Smoke Testing

- **HTTPS Endpoint**: `https://medvisit.lk` returns HTTP 200 with Cloudflare Origin SSL.
- **WebSocket Gateway**: Reverb active and listening on port 8080 with Nginx proxy.
- **Chromium PDF Service**: Spatie Browsershot verified generating PDFs in headless Google Chrome 156 under user `www-data` with `--no-sandbox`.

---

## 8. CI Pipeline, Deployment Tooling & Rollback Guide

### 8.1 Continuous Integration (GitHub Actions)

The CI pipeline runs automatically on all branches and pull requests to `main`. It runs on `ubuntu-latest` with a 30-minute safety timeout and concurrency cancellation for older commits on the same branch.

- **Workflow File**: `.github/workflows/ci.yml`
- **Services Spun Up**:
  - **PostgreSQL 18** (`postgres:18-alpine`): Creates test database `medvisit_test` with health checks (`pg_isready`).
  - **Redis 8** (`redis:8-alpine`): Health checked via `redis-cli ping`.
- **Environment**: Initialized from committed `.env.ci` containing safe dummy credentials, faked communication/payment gateways, testing Turnstile keys, and feature flags disabled.
- **Checks Enforced**:
  1. **PHP 8.5 setup** with extensions: `pdo_pgsql`, `pgsql`, `redis`, `intl`, `gd`, `imagick`, `mbstring`, `bcmath`, `zip`, `exif`, `pcntl`.
  2. **Dependency caching**: Composer (`~/.composer/cache`) and npm (`~/.npm`).
  3. **Node 22 LTS**: Installs dependencies via `npm ci`.
  4. **TypeScript & Frontend Bundle Check**: Runs `npm run build` (`tsc && vite build`). Fails on any TypeScript compile errors.
  5. **Database Migrations**: Runs `php artisan migrate --force` against the live PostgreSQL 18 test container (including `pg_trgm`).
  6. **Automated Test Suite**: Executes `php artisan test` across all feature and unit tests (815 tests, zero network dependencies, faked external services).
  7. **Chromium PDF Generation**: HarfBuzz Unicode text extraction tests (`UnicodePdfRenderQaTest`) run in CI using Google Chrome and system Indic/Sinhala/Tamil fonts (`fonts-noto-core`, `fonts-lklug-sinhala`, `fonts-indic`). The test is marked with `#[Group('chromium')]`.
  8. **Code Style Verification**: `vendor/bin/pint --test` ensures adherence to Laravel coding standards.
  9. **Security Audits**:
     - `composer audit`: Fails the build if any advisory with severity **high** or **critical** is detected.
     - `npm audit --audit-level=high`: Reports high/critical JavaScript package advisories without breaking the build.
  10. **Error Log Capture**: If any test fails, `storage/logs/*.log` is uploaded as an artifact for instant diagnosis.

### 8.2 Reading a Failed CI Run

If a pull request check fails:
1. Click **Details** next to the red cross on GitHub to view the CI run.
2. Locate the failed step:
   - **`Build frontend assets`**: Look for TypeScript compiler errors or Vite build failures.
   - **`Run test suite`**: Click on the failed test output to see the assertion difference and stack trace.
   - **`Verify code style with Laravel Pint`**: Run `vendor/bin/pint` locally to auto-fix formatting, then commit.
   - **`Security audit (Composer)`**: A high or critical CVE advisory was reported for an installed package. Run `composer update <vendor/package>` to patch the package.
3. Download the **`laravel-logs`** artifact from the run summary page if an uncaught server exception occurred.

### 8.3 Feature Branch & Release Workflow

```
[Local Feature Branch]  -->  Push to origin/feature-xxx
                                    |
                                    v
                            [Open PR to main]
                                    |
                                    v
                           [GitHub Actions CI] (Green)
                                    |
                                    v
                        [Merge PR into main]
                                    |
                                    v
                     [Production Deploy via deploy.sh]
```

1. Create a branch: `git checkout -b feature/my-feature`
2. Make changes, run `vendor/bin/pint --dirty --format agent`, and verify tests pass.
3. Push: `git push -u origin feature/my-feature`
4. Open a pull request against `main`.
5. Wait for the **CI** workflow to pass (green checkmark).
6. Merge the PR.
7. Deploy on the production server (or dispatch the deploy workflow once enabled).

### 8.4 One-Time Server Setup for Safer Deployments

Run these configuration steps once on `medvisit-prod` (`62.171.156.211`):

#### 1. Create the Database Backup Directory
```bash
sudo mkdir -p /var/backups/medvisit
sudo chown -R deploy:deploy /var/backups/medvisit
sudo chmod 750 /var/backups/medvisit
```

#### 2. Configure Sudoers Permissions for the `deploy` User
To allow the `deploy` user to restart supervisor workers and refresh storage/cache permissions without interactive password prompts, configure `/etc/sudoers.d/deploy`:

```bash
sudo visudo -f /etc/sudoers.d/deploy
```
Add the following line (preserving any existing sudo permissions):
```sudoers
deploy ALL=(ALL) NOPASSWD: /usr/bin/supervisorctl restart medvisit-worker-default\:* medvisit-worker-pdfs\:* medvisit-reverb, /bin/chown -R deploy\:www-data /var/www/medvisit/storage /var/www/medvisit/bootstrap/cache, /bin/chmod -R ug+rwX /var/www/medvisit/storage /var/www/medvisit/bootstrap/cache
```
Then verify permissions on the sudoers file:
```bash
sudo chmod 440 /etc/sudoers.d/deploy
```

#### 3. Configure Deployment Keys in `.env` (Use `nano`, never `echo`)
> [!IMPORTANT]
> Never use `echo "SECRET" >> .env` as it leaves sensitive secrets in your bash shell history (`~/.bash_history`). Always edit `.env` interactively using `nano`.

Generate a maintenance bypass secret:
```bash
openssl rand -hex 16
```
Copy the generated secret, open `.env`:
```bash
nano /var/www/medvisit/.env
```
Add the deployment variables:
```ini
# Deployment & Maintenance Configuration
DEPLOY_MAINTENANCE_SECRET=your_generated_32_character_secret_here

# Optional: GitHub Actions CI verification token
# Fine-grained PAT: Repository "sivanujan/medvisit", Permission: "Actions: Read-only"
GITHUB_CI_CHECK_TOKEN=github_pat_xxxx

# Optional: Dedicated clinic subdomain for post-deploy smoke checks
SMOKE_TEST_SUBDOMAIN=cityhealth.medvisit.lk
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`), then verify file permissions:
```bash
chmod 640 /var/www/medvisit/.env
```

### 8.5 Required GitHub Repository Settings (Branch Protection for Solo Developers)

To ensure code stability on production while keeping the workflow agile for a single developer:

1. Navigate to: **GitHub Repo $\rightarrow$ Settings $\rightarrow$ Branches** (or **Rulesets**).
2. Add a branch protection rule for pattern: `main`
3. Configure the following settings:
   - **Require a pull request before merging**: Checked.
     - **Required approvals**: **`0`** (Allows merging your own PRs once status checks pass, without requiring a second reviewer).
   - **Require status checks to pass before merging**: Checked.
     - **Status check name**: **`Test & Build`** (from `ci.yml`).
     - **Require branches to be up to date before merging**: Checked.
   - **Do not allow force pushes**: Checked (Blocks destructive history overwrites on `main`).
   - **Do not allow deletions**: Checked (Protects the `main` branch from accidental deletion).
4. Save changes.

### 8.6 Deployment Architecture & Safety Mechanisms

The deployment script (`deploy.sh`) incorporates several defense-in-depth safety layers:

1. **Pre-Update Maintenance Timing**:
   The script inspects pending changes *before* touching application code:
   `git diff --name-only "$PREV_COMMIT" "$TARGET_COMMIT" -- database/migrations`
   - If migrations exist: The application is immediately put into maintenance mode (`php artisan down --secret="..." --render="errors::503"`) *before* code, composer, or npm updates occur. It is only brought back up after migrations and caches are primed.
   - If no migrations exist: Deployment proceeds with **zero downtime** (maintenance mode is never activated).
2. **Atomic Frontend Asset Swap**:
   Assets are built into a temporary staging directory (`public/build_tmp_$$`) via `npx vite build --outDir`. Once compilation succeeds, Linux's atomic `rename()` (`mv`) swaps the directory into `public/build` instantaneously. Users never encounter broken chunks or mismatched `manifest.json` files while assets are compiling.
3. **Automated Pre-Deploy Snapshots**:
   Before updating code, a full compressed snapshot (`pg_dump | gzip -9`) is saved to `/var/backups/medvisit/pre-deploy-YYYYmmdd-HHMMSS-<sha>.sql.gz`. The script automatically rotates snapshots to retain the 5 most recent backups.
4. **Non-Fatal Permission Refreshes**:
   Only `storage` and `bootstrap/cache` permissions are updated via `sudo -n`. If sudo privileges are absent, the script issues a warning and proceeds without breaking deployments.

### 8.7 Manual Deploy Button (`.github/workflows/deploy.yml`)

A workflow dispatch button is included in `.github/workflows/deploy.yml` to trigger deployments from GitHub.

**By default, it is hard-disabled (`if: false`)** to prevent accidental runs until credentials are added.

#### To Enable the Deploy Button:

1. **Create a dedicated restricted SSH key on the server**:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "github-actions-deploy"
   ```
2. **Restrict the key in `/home/deploy/.ssh/authorized_keys`**:
   Prepend forced command options so this key can ONLY execute `deploy.sh`:
   ```
   command="/var/www/medvisit/deploy.sh",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 AAAA... github-actions-deploy
   ```
3. **Add Secrets in GitHub** (**Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions**):
   - `DEPLOY_HOST`: `62.171.156.211`
   - `DEPLOY_USER`: `deploy`
   - `DEPLOY_SSH_KEY`: The private key contents (`~/.ssh/github_deploy`)
   - `DEPLOY_KNOWN_HOSTS`: Output of `ssh-keyscan -H 62.171.156.211`
4. **Enable the job**:
   In `.github/workflows/deploy.yml`, change `if: false` to `if: true`.
5. Now you can click **Actions $\rightarrow$ Deploy $\rightarrow$ Run workflow** to deploy the current `main` branch. It will verify that the commit passed CI before logging into the server.

### 8.8 Rollback Procedures

If an issue occurs after a deployment:

#### Scenario A: The deployment script `deploy.sh` failed mid-run
The script automatically traps any error, deactivates maintenance mode (`php artisan up`), cleans up temporary build folders, prints the exact git rollback command with the previous commit SHA, and leaves the pre-deploy database snapshot untouched.

#### Scenario B: Manual code rollback
To roll back code to the previous working commit:
```bash
cd /var/www/medvisit

# 1. Reset code to previous commit
git reset --hard <PREVIOUS_COMMIT_SHA>

# 2. Re-install matching production dependencies & rebuild frontend
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
npm ci --prefer-offline --no-audit
npm run build

# 3. Refresh and warm framework caches
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 4. Restart supervisor workers
sudo supervisorctl restart medvisit-worker-default:* medvisit-worker-pdfs:* medvisit-reverb
```

#### Scenario C: Restoring the pre-deploy database backup (Only if migrations corrupted data)
> [!CAUTION]
> Restoring a database backup replaces all data in the database with the pre-deploy state. Only execute this if migrations introduced data corruption or broke schema compatibility. Do NOT restore blindly if real patients, tokens, or payments were recorded during the deployment window.

```bash
# 1. Stop background workers to prevent database writes
sudo supervisorctl stop medvisit-worker-default:* medvisit-worker-pdfs:* medvisit-reverb

# 2. Put the application into maintenance mode
php artisan down --render="errors::503"

# 3. Terminate active PostgreSQL connections, drop and recreate the database
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'medvisit' AND pid <> pg_backend_pid();"
sudo -u postgres dropdb medvisit
sudo -u postgres createdb -O medvisit medvisit
sudo -u postgres psql -d medvisit -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# 4. Restore the pre-deploy snapshot (enter DB password when prompted)
gunzip -c /var/backups/medvisit/pre-deploy-YYYYmmdd-HHMMSS-<target_sha>.sql.gz | psql -h 127.0.0.1 -p 5432 -U medvisit -d medvisit -W

# 5. Bring application back online and restart background workers
php artisan up
sudo supervisorctl start medvisit-worker-default:* medvisit-worker-pdfs:* medvisit-reverb
```




