#!/bin/bash

# GIOAT Platform Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-production}
DOMAIN=${2:-yourdomain.com}
SSL_EMAIL=${3:-admin@yourdomain.com}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        error "Environment file .env not found. Please create it from env.production.example"
    fi
    
    success "Prerequisites check passed"
}

# Generate SSL certificates
generate_ssl_certificates() {
    log "Generating SSL certificates..."
    
    # Create SSL directory
    mkdir -p nginx/ssl
    
    # Generate self-signed certificate for development
    if [ "$ENVIRONMENT" = "development" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
        success "Self-signed SSL certificate generated"
    else
        # For production, you should use Let's Encrypt or a proper CA
        warning "Please obtain proper SSL certificates for production"
        warning "Place them in nginx/ssl/cert.pem and nginx/ssl/key.pem"
    fi
}

# Build and deploy application
deploy_application() {
    log "Deploying GIOAT application..."
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose -f docker-compose.prod.yml pull
    
    # Build and start services
    log "Building and starting services..."
    docker-compose -f docker-compose.prod.yml up -d --build
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    # Check API health
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        success "API service is healthy"
    else
        error "API service is not responding"
    fi
    
    # Check database connection
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U gioat_prod_user > /dev/null 2>&1; then
        success "Database is healthy"
    else
        error "Database is not responding"
    fi
    
    # Check Redis connection
    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
        success "Redis is healthy"
    else
        error "Redis is not responding"
    fi
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    sleep 10
    
    # Run Prisma migrations
    docker-compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy
    
    success "Database migrations completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Wait for monitoring services to be ready
    sleep 20
    
    # Check Prometheus
    if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
        success "Prometheus is running"
    else
        warning "Prometheus is not responding"
    fi
    
    # Check Grafana
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        success "Grafana is running"
        log "Grafana is available at http://localhost:3001"
        log "Default credentials: admin / (check your .env file for password)"
    else
        warning "Grafana is not responding"
    fi
}

# Perform security checks
security_checks() {
    log "Performing security checks..."
    
    # Check if services are running as non-root
    if docker-compose -f docker-compose.prod.yml exec -T api whoami | grep -q "nestjs"; then
        success "API service is running as non-root user"
    else
        warning "API service is not running as non-root user"
    fi
    
    # Check SSL configuration
    if [ -f "nginx/ssl/cert.pem" ] && [ -f "nginx/ssl/key.pem" ]; then
        success "SSL certificates are present"
    else
        warning "SSL certificates are missing"
    fi
    
    # Check environment variables
    if grep -q "your_secure" .env; then
        warning "Please update default passwords in .env file"
    else
        success "Environment variables appear to be configured"
    fi
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U gioat_prod_user gioat_prod > "$BACKUP_DIR/database.sql"
    
    # Backup configuration files
    cp .env "$BACKUP_DIR/"
    cp docker-compose.prod.yml "$BACKUP_DIR/"
    
    success "Backup created in $BACKUP_DIR"
}

# Main deployment function
main() {
    log "Starting GIOAT platform deployment..."
    log "Environment: $ENVIRONMENT"
    log "Domain: $DOMAIN"
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup if this is an update
    if [ "$ENVIRONMENT" = "production" ]; then
        create_backup
    fi
    
    # Generate SSL certificates
    generate_ssl_certificates
    
    # Deploy application
    deploy_application
    
    # Run migrations
    run_migrations
    
    # Setup monitoring
    setup_monitoring
    
    # Perform security checks
    security_checks
    
    success "GIOAT platform deployment completed successfully!"
    log "Application is available at:"
    log "  - Web Interface: https://$DOMAIN"
    log "  - API: https://$DOMAIN/api"
    log "  - Grafana: http://localhost:3001"
    log "  - Prometheus: http://localhost:9090"
}

# Handle script arguments
case "$1" in
    "production"|"staging"|"development")
        main
        ;;
    "rollback")
        log "Rolling back to previous version..."
        # Add rollback logic here
        ;;
    "status")
        log "Checking deployment status..."
        docker-compose -f docker-compose.prod.yml ps
        ;;
    "logs")
        log "Showing application logs..."
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
    "stop")
        log "Stopping GIOAT platform..."
        docker-compose -f docker-compose.prod.yml down
        ;;
    *)
        echo "Usage: $0 {production|staging|development} [domain] [email]"
        echo "       $0 {rollback|status|logs|stop}"
        exit 1
        ;;
esac 