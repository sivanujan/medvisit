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


