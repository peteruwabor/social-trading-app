# GIOAT Platform - Production Deployment Guide

## 🚀 Overview

This guide provides step-by-step instructions for deploying the GIOAT Social Trading Platform to production environments.

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended) or macOS
- **RAM**: Minimum 8GB, Recommended 16GB+
- **Storage**: Minimum 50GB available space
- **CPU**: 4+ cores recommended

### Software Requirements
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Git**: Latest version
- **OpenSSL**: For SSL certificate generation

### Network Requirements
- **Domain**: Registered domain name
- **SSL Certificate**: Valid SSL certificate (Let's Encrypt recommended)
- **Firewall**: Ports 80, 443, 3000, 3001, 9090 open

## 🔧 Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/gioat-platform.git
cd gioat-platform
```

### 2. Environment Configuration
```bash
# Copy the production environment template
cp env.production.example .env

# Edit the environment file with your production values
nano .env
```

**Required Environment Variables:**
```bash
# Database
POSTGRES_PASSWORD=your_secure_postgres_password
DATABASE_URL=postgresql://gioat_prod_user:${POSTGRES_PASSWORD}@postgres:5432/gioat_prod

# Redis
REDIS_PASSWORD=your_secure_redis_password
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# JWT
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters

# External Services
SNAPTRADE_CLIENT_ID=your_snaptrade_client_id
SNAPTRADE_CONSUMER_KEY=your_snaptrade_consumer_key
EXPO_ACCESS_TOKEN=your_expo_access_token
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Monitoring
GRAFANA_PASSWORD=your_grafana_admin_password
```

### 3. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to nginx directory
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl/
```

#### Option B: Self-Signed (Development Only)
```bash
# Generate self-signed certificate
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### 4. Deploy the Application

#### Using the Deployment Script (Recommended)
```bash
# Make the script executable
chmod +x scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh production yourdomain.com admin@yourdomain.com
```

#### Manual Deployment
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Run database migrations
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Check service health
docker-compose -f docker-compose.prod.yml ps
```

### 5. Verify Deployment

#### Health Checks
```bash
# API Health
curl -f https://yourdomain.com/health

# Database Health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U gioat_prod_user

# Redis Health
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

#### Access Points
- **Web Interface**: https://yourdomain.com
- **API Documentation**: https://yourdomain.com/api/docs
- **Grafana Dashboard**: http://yourdomain.com:3001
- **Prometheus**: http://yourdomain.com:9090

## 🔒 Security Configuration

### 1. Firewall Setup
```bash
# Allow necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 2. SSL/TLS Hardening
Update `nginx/nginx.conf` with:
- Strong cipher suites
- HSTS headers
- Security headers
- Rate limiting

### 3. Database Security
- Use strong passwords
- Enable SSL connections
- Restrict network access
- Regular backups

### 4. Application Security
- Enable MFA for admin accounts
- Implement rate limiting
- Audit logging
- Input validation

## 📊 Monitoring Setup

### 1. Grafana Configuration
1. Access Grafana at http://yourdomain.com:3001
2. Login with admin / (password from .env)
3. Import the GIOAT dashboard from `monitoring/grafana/dashboards/`

### 2. Alert Configuration
Set up alerts for:
- High error rates
- Service downtime
- Database connection issues
- Disk space usage

### 3. Log Aggregation
Configure log shipping to:
- ELK Stack
- Splunk
- CloudWatch (AWS)
- Azure Monitor

## 🔄 Maintenance Procedures

### 1. Regular Backups
```bash
# Create backup script
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Database backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U gioat_prod_user gioat_prod > "$BACKUP_DIR/database.sql"

# Configuration backup
cp .env "$BACKUP_DIR/"
cp docker-compose.prod.yml "$BACKUP_DIR/"

echo "Backup created in $BACKUP_DIR"
EOF

chmod +x scripts/backup.sh

# Schedule daily backups
echo "0 2 * * * /path/to/gioat-platform/scripts/backup.sh" | crontab -
```

### 2. Updates and Upgrades
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### 3. SSL Certificate Renewal
```bash
# Let's Encrypt renewal
sudo certbot renew

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl/

# Reload nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.prod.yml logs postgres

# Reset database (WARNING: This will delete all data)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d postgres
```

#### 2. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

#### 3. High Memory Usage
```bash
# Check container resource usage
docker stats

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

#### 4. API Not Responding
```bash
# Check API logs
docker-compose -f docker-compose.prod.yml logs api

# Check API health
curl -v http://localhost:3000/health
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Analyze table statistics
ANALYZE;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### 2. Redis Optimization
```bash
# Check Redis memory usage
docker-compose -f docker-compose.prod.yml exec redis redis-cli info memory

# Clear cache if needed
docker-compose -f docker-compose.prod.yml exec redis redis-cli flushall
```

#### 3. Nginx Optimization
- Enable gzip compression
- Configure caching headers
- Optimize worker processes

## 📞 Support

### Emergency Contacts
- **System Administrator**: admin@yourdomain.com
- **Database Administrator**: dba@yourdomain.com
- **Security Team**: security@yourdomain.com

### Documentation
- [API Documentation](https://yourdomain.com/api/docs)
- [User Guide](https://yourdomain.com/docs)
- [Developer Guide](DEVELOPER_GUIDE.md)

### Monitoring Dashboards
- [Grafana Dashboard](http://yourdomain.com:3001)
- [Prometheus Metrics](http://yourdomain.com:9090)

## 🔄 Rollback Procedures

### 1. Application Rollback
```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Checkout previous version
git checkout HEAD~1

# Restore from backup
./scripts/backup.sh restore

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Database Rollback
```bash
# Restore database from backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
    psql -U gioat_prod_user gioat_prod < backups/latest/database.sql
```

---

**⚠️ Important Notes:**
- Always test deployments in staging first
- Keep backups before major updates
- Monitor system resources regularly
- Document any custom configurations
- Train team members on deployment procedures 