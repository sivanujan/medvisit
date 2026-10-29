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
- `memory_limit = 512M`
- `upload_max_filesize = 20M`
- `post_max_size = 25M`
- `max_execution_time = 120`
- `date.timezone = UTC`
- `expose_php = Off`
- `opcache.enable = 1`
- `curl.cainfo = /etc/ssl/certs/ca-certificates.crt`
- `openssl.cafile = /etc/ssl/certs/ca-certificates.crt`
- Activated via `phpenmod 99-medvisit` and restarted `php8.5-fpm`.

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



