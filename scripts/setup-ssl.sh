#!/bin/bash

# VelocityRush3D SSL Certificate Setup Script
# This script helps set up SSL certificates for production deployment

set -e

echo "🔒 Setting up SSL certificates for VelocityRush3D..."

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot is not installed. Installing..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        sudo yum install -y certbot python3-certbot-nginx
    else
        echo "❌ Unsupported package manager. Please install certbot manually."
        exit 1
    fi
fi

# Domain configuration
read -p "Enter your domain name (e.g., velocityrush3d.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain name is required"
    exit 1
fi

echo "📝 Setting up SSL for domain: $DOMAIN"

# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate for development/testing
echo "🔐 Generating self-signed certificate for development..."
openssl req -x509 -newkey rsa:4096 -keyout ssl/privkey.pem -out ssl/fullchain.pem -days 365 -nodes -subj "/CN=$DOMAIN"

# Set proper permissions
chmod 600 ssl/privkey.pem
chmod 644 ssl/fullchain.pem

echo "✅ Self-signed certificate created in ssl/ directory"

# Instructions for Let's Encrypt
echo ""
echo "📋 For production SSL certificates, run:"
echo "sudo certbot certonly --webroot -w /var/www/html -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "Then update nginx.conf to use the Let's Encrypt certificates:"
echo "ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;"
echo "ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;"
echo ""
echo "🔄 Don't forget to renew certificates automatically:"
echo "sudo crontab -e"
echo "Add: 0 12 * * * /usr/bin/certbot renew --quiet"

echo ""
echo "🎉 SSL setup complete!"