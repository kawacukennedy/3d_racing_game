#!/bin/bash

# VelocityRush3D Domain Setup Script

set -e

echo "🌐 Setting up domain configuration for VelocityRush3D..."

# Domain configuration
read -p "Enter your domain name (e.g., velocityrush3d.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain name is required"
    exit 1
fi

echo "📝 Configuring domain: $DOMAIN"

# Create DNS records file
cat > dns-records.txt << EOF
# VelocityRush3D DNS Records for $DOMAIN

# A Records (for root domain)
$DOMAIN. 300 IN A <YOUR_SERVER_IP>

# CNAME Records (for www subdomain)
www.$DOMAIN. 300 IN CNAME $DOMAIN.

# API Subdomain (if using separate API server)
api.$DOMAIN. 300 IN CNAME api.velocityrush3d.com.

# Additional records for email, etc.
# MX Records (example for Gmail)
# $DOMAIN. 300 IN MX 1 ASPMX.L.GOOGLE.COM.
# $DOMAIN. 300 IN MX 5 ALT1.ASPMX.L.GOOGLE.COM.

# TXT Records for SPF
# $DOMAIN. 300 IN TXT "v=spf1 include:_spf.google.com ~all"

# CNAME for CDN (if using Cloudflare)
# cdn.$DOMAIN. 300 IN CNAME cdn.cloudflare.net.
EOF

echo "📋 DNS records template created: dns-records.txt"

# Create domain configuration summary
cat > domain-config.json << EOF
{
  "domain": "$DOMAIN",
  "www": "www.$DOMAIN",
  "api": "api.$DOMAIN",
  "cdn": "cdn.$DOMAIN",
  "ssl": {
    "provider": "letsencrypt",
    "autoRenew": true,
    "certPath": "/etc/letsencrypt/live/$DOMAIN"
  },
  "hosting": {
    "frontend": {
      "provider": "netlify",
      "url": "https://$DOMAIN"
    },
    "backend": {
      "provider": "docker",
      "url": "https://api.$DOMAIN"
    }
  },
  "cdn": {
    "provider": "cloudflare",
    "enabled": false
  }
}
EOF

echo "📄 Domain configuration created: domain-config.json"

# Instructions
cat << EOF

🎉 Domain configuration complete!

📋 Next steps:

1. **DNS Configuration:**
   - Go to your domain registrar (Namecheap, GoDaddy, etc.)
   - Add the DNS records from dns-records.txt
   - Wait for DNS propagation (can take 24-48 hours)

2. **SSL Certificate:**
   - Run: ./scripts/setup-ssl.sh
   - Or use Let's Encrypt: certbot certonly --webroot -w /var/www/html -d $DOMAIN

3. **Hosting Setup:**
   - **Netlify:** Upload deploy/ directory to Netlify
   - **Vercel:** Upload deploy/ directory to Vercel
   - **Custom:** Use nginx.conf for your server

4. **API Server:**
   - Deploy server using: node scripts/deploy-server.js
   - Update CORS_ORIGIN in .env to https://$DOMAIN

5. **CDN (Optional):**
   - Set up Cloudflare for global distribution
   - Update CDN URLs in domain-config.json

📞 Need help? Check the deployment documentation in deploy/DEPLOYMENT_README.md

EOF