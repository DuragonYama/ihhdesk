# OFA HR System - Production Deployment Guide

This guide covers deploying the OFA HR backend to a ThinkCentre server with Cloudflare Tunnel.

## 📋 Table of Contents

- [Production Domains](#production-domains)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [ThinkCentre Server Setup](#thinkcentre-server-setup)
- [Cloudflare Tunnel Configuration](#cloudflare-tunnel-configuration)
- [Security Best Practices](#security-best-practices)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🌐 Production Domains

The system uses these domains:

- **Employee Frontend:** `https://ihh-hr.codeofa.com`
- **Admin Frontend:** `https://ihh-desk.codeofa.com`
- **Backend API:** `https://ihh-api.codeofa.com`

---

## 💻 Development Setup

For local development with test users:

### 1. Clone Repository

```bash
git clone <repository-url>
cd ihhdesk/backend
```

### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:
- `JWT_SECRET` - Generate with `openssl rand -hex 32`
- `SENDGRID_API_KEY` - Your SendGrid API key
- `SENDGRID_FROM_EMAIL` - Your verified sender email

### 5. Initialize Development Database

```bash
python init_db_dev.py
```

This creates test users:
- **Admin:** username: `admin` | password: `admin123`
- **Developer:** username: `developer` | password: `dev123`
- **Employee:** username: `employee` | password: `emp123`

⚠️ **WARNING:** Only use `init_db_dev.py` for development. Never use test credentials in production!

### 6. Run Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at `http://localhost:8000`

---

## 🚀 Production Setup

For production deployment on ThinkCentre server:

### 1. Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11+
sudo apt install python3.11 python3.11-venv python3-pip -y

# Install Git
sudo apt install git -y
```

### 2. Create Application User

```bash
sudo useradd -r -m -s /bin/bash ofa-hr
sudo su - ofa-hr
```

### 3. Clone Repository

```bash
cd /home/ofa-hr
git clone <repository-url> app
cd app/backend
```

### 4. Create Virtual Environment

```bash
python3.11 -m venv venv
source venv/bin/activate
```

### 5. Install Dependencies

```bash
pip install -r requirements.txt
```

### 6. Configure Production Environment

```bash
cp .env.example .env
nano .env
```

**Critical settings:**

```env
# Database
DATABASE_URL=sqlite:///./data/employees.db

# JWT (generate with: openssl rand -hex 32)
JWT_SECRET=your-secure-random-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

# Email
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@codeofa.com
SENDGRID_FROM_NAME=OFA HR System

# Production Frontend URLs
EMPLOYEE_FRONTEND_URL=https://ihh-hr.codeofa.com
ADMIN_FRONTEND_URL=https://ihh-desk.codeofa.com
```

### 7. Initialize Production Database

```bash
python init_db_prod.py
```

This will:
- Prompt for admin username
- Prompt for admin email
- Prompt for secure password (min 8 chars, uppercase, lowercase, number)
- Create production database with single admin account

**No test users are created in production!**

### 8. Test API Manually

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Test in another terminal:
```bash
curl http://localhost:8000/api/health
```

Should return: `{"status":"healthy"}`

---

## ⚙️ ThinkCentre Server Setup

### 1. Create Systemd Service

Exit to root/sudo user:
```bash
exit  # Exit from ofa-hr user
sudo nano /etc/systemd/system/ofa-hr-api.service
```

**Service file content:**

```ini
[Unit]
Description=OFA HR Backend API
After=network.target

[Service]
Type=simple
User=ofa-hr
Group=ofa-hr
WorkingDirectory=/home/ofa-hr/app/backend
Environment="PATH=/home/ofa-hr/app/backend/venv/bin"
ExecStart=/home/ofa-hr/app/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4

# Restart policy
Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/ofa-hr/app/backend/data

# Resource limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### 2. Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable ofa-hr-api

# Start service
sudo systemctl start ofa-hr-api

# Check status
sudo systemctl status ofa-hr-api
```

### 3. View Logs

```bash
# Follow logs
sudo journalctl -u ofa-hr-api -f

# View recent logs
sudo journalctl -u ofa-hr-api -n 100

# View logs from today
sudo journalctl -u ofa-hr-api --since today
```

### 4. Service Management Commands

```bash
# Start
sudo systemctl start ofa-hr-api

# Stop
sudo systemctl stop ofa-hr-api

# Restart
sudo systemctl restart ofa-hr-api

# Status
sudo systemctl status ofa-hr-api

# Disable (prevent auto-start on boot)
sudo systemctl disable ofa-hr-api
```

---

## 🌐 Cloudflare Tunnel Configuration

### 1. Install Cloudflared

```bash
# Download and install
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Verify installation
cloudflared --version
```

### 2. Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser. Select your domain (`codeofa.com`) and authorize.

### 3. Create Tunnel

```bash
cloudflared tunnel create ofa-hr-api
```

This creates a tunnel and saves credentials to `~/.cloudflared/`

**Note the Tunnel ID** from the output (e.g., `abc123-def456-ghi789`)

### 4. Configure Tunnel

Create configuration file:
```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

**Config content:**

```yaml
tunnel: ofa-hr-api
credentials-file: /home/ofa-hr/.cloudflared/abc123-def456-ghi789.json

ingress:
  - hostname: ihh-api.codeofa.com
    service: http://localhost:8000
  - service: http_status:404
```

**Replace `abc123-def456-ghi789` with your actual tunnel ID!**

### 5. Create DNS Record

```bash
cloudflared tunnel route dns ofa-hr-api ihh-api.codeofa.com
```

This creates a CNAME record pointing `ihh-api.codeofa.com` to your tunnel.

### 6. Install Tunnel as Service

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### 7. Verify Tunnel

```bash
# Check tunnel status
sudo systemctl status cloudflared

# View tunnel logs
sudo journalctl -u cloudflared -f

# Test API through tunnel
curl https://ihh-api.codeofa.com/api/health
```

Should return: `{"status":"healthy"}`

### 8. Tunnel Management

```bash
# List tunnels
cloudflared tunnel list

# Check tunnel info
cloudflared tunnel info ofa-hr-api

# Delete tunnel (if needed)
cloudflared tunnel delete ofa-hr-api

# Restart tunnel service
sudo systemctl restart cloudflared
```

---

## 🔒 Security Best Practices

### 1. Strong Secrets

```bash
# Generate strong JWT secret
openssl rand -hex 32

# Generate strong admin password (use password manager)
# Minimum requirements:
# - 8+ characters
# - Uppercase letter
# - Lowercase letter
# - Number
# - Special character recommended
```

### 2. File Permissions

```bash
# Secure .env file
chmod 600 /home/ofa-hr/app/backend/.env
chown ofa-hr:ofa-hr /home/ofa-hr/app/backend/.env

# Secure database
chmod 640 /home/ofa-hr/app/backend/data/employees.db
chown ofa-hr:ofa-hr /home/ofa-hr/app/backend/data/employees.db

# Secure Cloudflare credentials
chmod 600 /home/ofa-hr/.cloudflared/*.json
chown ofa-hr:ofa-hr /home/ofa-hr/.cloudflared/*.json
```

### 3. Firewall Configuration

```bash
# Install UFW
sudo apt install ufw -y

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if custom)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**Note:** Backend only needs outbound connections. Cloudflare Tunnel handles inbound HTTPS.

### 4. SSL/TLS

Cloudflare Tunnel provides automatic SSL/TLS:
- ✅ Free SSL certificates
- ✅ Automatic renewal
- ✅ Modern TLS protocols
- ✅ DDoS protection

**No manual SSL setup needed!**

### 5. CORS Configuration

Backend CORS is configured in `app/main.py` via environment variables:

```python
allow_origins=[
    settings.EMPLOYEE_FRONTEND_URL,  # https://ihh-hr.codeofa.com
    settings.ADMIN_FRONTEND_URL,     # https://ihh-desk.codeofa.com
]
```

Only these domains can make API requests.

### 6. Database Backups

Create backup script:

```bash
sudo nano /home/ofa-hr/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ofa-hr/backups"
DB_FILE="/home/ofa-hr/app/backend/data/employees.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_FILE $BACKUP_DIR/employees_$DATE.db
find $BACKUP_DIR -name "employees_*.db" -mtime +30 -delete
```

```bash
chmod +x /home/ofa-hr/backup-db.sh
```

Add to crontab:
```bash
sudo crontab -e
```

Add line:
```
0 2 * * * /home/ofa-hr/backup-db.sh
```

This backs up the database daily at 2 AM and keeps 30 days of backups.

### 7. Monitoring

Install monitoring tools:

```bash
# System monitoring
sudo apt install htop iotop nethogs -y

# Log monitoring
sudo apt install logwatch -y
```

Check system resources:
```bash
# CPU/Memory
htop

# Disk usage
df -h

# Disk I/O
sudo iotop

# Network
sudo nethogs
```

---

## 📊 Monitoring & Maintenance

### Application Health Checks

```bash
# API health endpoint
curl https://ihh-api.codeofa.com/api/health

# Check running processes
ps aux | grep uvicorn

# Check port binding
sudo netstat -tlnp | grep 8000
```

### Service Status

```bash
# Backend API
sudo systemctl status ofa-hr-api

# Cloudflare Tunnel
sudo systemctl status cloudflared
```

### Log Monitoring

```bash
# Backend logs (last 50 lines)
sudo journalctl -u ofa-hr-api -n 50

# Cloudflare tunnel logs
sudo journalctl -u cloudflared -n 50

# Follow logs in real-time
sudo journalctl -u ofa-hr-api -f
```

### Database Maintenance

```bash
# Check database size
ls -lh /home/ofa-hr/app/backend/data/employees.db

# SQLite integrity check
sqlite3 /home/ofa-hr/app/backend/data/employees.db "PRAGMA integrity_check;"

# Vacuum database (optimize)
sqlite3 /home/ofa-hr/app/backend/data/employees.db "VACUUM;"
```

### Update Procedure

```bash
# Stop services
sudo systemctl stop ofa-hr-api

# Switch to app user
sudo su - ofa-hr
cd /home/ofa-hr/app

# Pull updates
git pull

# Update dependencies
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Exit app user
exit

# Start services
sudo systemctl start ofa-hr-api

# Check status
sudo systemctl status ofa-hr-api
```

### Troubleshooting

**API not responding:**
```bash
# Check if service is running
sudo systemctl status ofa-hr-api

# Check if port is in use
sudo netstat -tlnp | grep 8000

# Restart service
sudo systemctl restart ofa-hr-api

# View error logs
sudo journalctl -u ofa-hr-api -n 100
```

**Cloudflare Tunnel issues:**
```bash
# Check tunnel status
sudo systemctl status cloudflared

# Test local API
curl http://localhost:8000/api/health

# Restart tunnel
sudo systemctl restart cloudflared

# View tunnel logs
sudo journalctl -u cloudflared -n 100
```

**Database locked errors:**
```bash
# Check for processes using database
sudo lsof /home/ofa-hr/app/backend/data/employees.db

# Kill stuck processes (use with caution)
sudo systemctl restart ofa-hr-api
```

---

## 🎯 Quick Reference

### Production URLs
- Employee: `https://ihh-hr.codeofa.com`
- Admin: `https://ihh-desk.codeofa.com`
- API: `https://ihh-api.codeofa.com`

### Common Commands

```bash
# Restart everything
sudo systemctl restart ofa-hr-api cloudflared

# View all logs
sudo journalctl -u ofa-hr-api -u cloudflared -f

# Check system resources
htop

# Backup database
sudo -u ofa-hr /home/ofa-hr/backup-db.sh

# Update application
sudo systemctl stop ofa-hr-api
sudo su - ofa-hr -c "cd /home/ofa-hr/app && git pull"
sudo systemctl start ofa-hr-api
```

### Support

For issues:
1. Check service status: `sudo systemctl status ofa-hr-api cloudflared`
2. Review logs: `sudo journalctl -u ofa-hr-api -n 100`
3. Test API health: `curl https://ihh-api.codeofa.com/api/health`
4. Verify DNS: `nslookup ihh-api.codeofa.com`

---

## 📝 Notes

- All services run as unprivileged user `ofa-hr`
- Database and logs stored in `/home/ofa-hr/app/backend/data`
- Automatic daily backups to `/home/ofa-hr/backups`
- SSL/TLS managed automatically by Cloudflare
- Services auto-restart on failure
- Services auto-start on system boot

**Last updated:** 2026-02-14
