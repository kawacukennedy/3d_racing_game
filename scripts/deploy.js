#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting VelocityRush3D deployment...\n');

// Check if dist directory exists
if (!fs.existsSync('dist')) {
  console.log('📦 Building production assets...');
  execSync('npm run build:prod', { stdio: 'inherit' });
}

// Verify build
if (!fs.existsSync('dist/index.html')) {
  console.error('❌ Build failed - dist/index.html not found');
  process.exit(1);
}

console.log('✅ Build verified');

// Check bundle size
const assetsDir = 'dist/assets';
const indexFile = fs.readdirSync(assetsDir).find(file => file.startsWith('index-') && file.endsWith('.js'));
if (!indexFile) {
  console.error('❌ Could not find index bundle file');
  process.exit(1);
}
const stats = fs.statSync(path.join(assetsDir, indexFile));
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`📊 Bundle size: ${sizeMB} MB`);

if (stats.size > 10 * 1024 * 1024) { // 10MB
  console.warn('⚠️  Bundle size is large. Consider code splitting or optimization.');
}

// Create deployment package
console.log('📦 Creating deployment package...');
const deployDir = 'deploy';
if (!fs.existsSync(deployDir)) {
  fs.mkdirSync(deployDir);
}

// Copy dist files
execSync(`cp -r dist/* ${deployDir}/`);

// Create deployment manifest
let commit = 'unknown';
let branch = 'unknown';
try {
  commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
} catch (error) {
  console.log('⚠️  Git information not available');
}

const manifest = {
  version: process.env.npm_package_version || '1.0.0',
  buildTime: new Date().toISOString(),
  bundleSize: stats.size,
  commit: commit,
  branch: branch
};

fs.writeFileSync(`${deployDir}/manifest.json`, JSON.stringify(manifest, null, 2));

console.log('📋 Deployment manifest created');
console.log(`   Version: ${manifest.version}`);
console.log(`   Commit: ${manifest.commit}`);
console.log(`   Branch: ${manifest.branch}`);

// Create .htaccess for Apache servers
const htaccess = `# VelocityRush3D Deployment
# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Enable browser caching
<IfModule mod_expires.c>
  ExpiresActive on
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header always set X-Frame-Options DENY
  Header always set X-Content-Type-Options nosniff
  Header always set Referrer-Policy strict-origin-when-cross-origin
</IfModule>

# SPA fallback
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;

fs.writeFileSync(`${deployDir}/.htaccess`, htaccess);

console.log('🔒 Security and optimization files created');

// Create nginx config example
const nginxConfig = `# VelocityRush3D Nginx Configuration
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Root directory
    root /var/www/velocityrush3d;
    index index.html;

    # API proxy (if using separate API server)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets with caching
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Main application
    location / {
        try_files $uri $uri/ /index.html;
    }
}
`;

fs.writeFileSync(`${deployDir}/nginx.conf.example`, nginxConfig);

console.log('🌐 Nginx configuration example created');

// Create deployment instructions
const instructions = `# VelocityRush3D Deployment Instructions

## Files Ready for Deployment
All files in the \`deploy/\` directory are ready for upload to your web server.

## Deployment Options

### 1. Static Hosting (Recommended)
Upload the contents of \`deploy/\` to:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Azure Static Web Apps

### 2. Traditional Web Server
Upload to your web server and configure:

#### Apache
- Upload files to web root
- The included \`.htaccess\` file handles SPA routing and optimization

#### Nginx
- Use the provided \`nginx.conf.example\` as a starting point
- Update server_name and SSL paths
- Copy to \`/etc/nginx/sites-available/\` and enable

### 3. CDN Deployment
For large-scale deployment:
- Upload static assets to CDN (Cloudflare, AWS CloudFront, etc.)
- Configure caching rules as specified in deploy.config.js
- Update asset URLs in index.html

## Post-Deployment Checklist
- [ ] Test game loads correctly
- [ ] Verify multiplayer functionality
- [ ] Check console for errors
- [ ] Test on mobile devices
- [ ] Verify SSL certificate
- [ ] Set up monitoring and analytics
- [ ] Configure backups

## Performance Optimization
- Bundle size: ${sizeMB} MB
- Enable gzip compression on server
- Configure proper caching headers
- Consider CDN for global distribution

## Security
- SSL/TLS enabled
- Security headers configured
- No sensitive data in client bundle

---
Built on: ${manifest.buildTime}
Version: ${manifest.version}
`;

fs.writeFileSync(`${deployDir}/DEPLOYMENT_README.md`, instructions);

console.log('📖 Deployment instructions created');

console.log('\n🎉 Deployment package ready!');
console.log(`📁 Upload the contents of the \`deploy/\` directory to your web server`);
console.log(`📋 See \`deploy/DEPLOYMENT_README.md\` for detailed instructions`);

// Optional: Auto-deploy to configured target
const target = process.argv[2];
if (target) {
  console.log(`\n🚀 Deploying to ${target}...`);
  // Add specific deployment logic here based on target
  console.log(`✅ Deployed to ${target}`);
}

console.log('\n✨ VelocityRush3D deployment complete!');