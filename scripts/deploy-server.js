#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Deploying VelocityRush3D server...\n');

// Check if Docker is available
try {
  execSync('docker --version', { stdio: 'pipe' });
  execSync('docker-compose --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Docker or Docker Compose not found');
  process.exit(1);
}

console.log('✅ Docker found');

// Check environment variables
const requiredEnvVars = ['JWT_SECRET', 'POSTGRES_PASSWORD', 'CORS_ORIGIN'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('⚠️  Missing environment variables. Creating .env file...');

  const envContent = `# VelocityRush3D Server Environment Variables
JWT_SECRET=${process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'}
POSTGRES_PASSWORD=${process.env.POSTGRES_PASSWORD || 'your-postgres-password'}
CORS_ORIGIN=${process.env.CORS_ORIGIN || 'https://your-domain.com'}
GRAFANA_PASSWORD=${process.env.GRAFANA_PASSWORD || 'admin'}

# Database
DATABASE_URL=postgresql://postgres:\${POSTGRES_PASSWORD}@postgres:5432/velocityrush

# Redis
REDIS_URL=redis://redis:6379

# Server
NODE_ENV=production
PORT=3001
`;

  fs.writeFileSync('.env', envContent);
  console.log('📝 Created .env file with default values');
  console.log('⚠️  Please update the values in .env before deploying to production!');
}

// Build Docker images
console.log('🏗️  Building Docker images...');
try {
  execSync('docker-compose build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to build Docker images');
  process.exit(1);
}

console.log('✅ Docker images built');

// Start services
console.log('🚀 Starting services...');
try {
  execSync('docker-compose up -d', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start services');
  process.exit(1);
}

console.log('✅ Services started');

// Wait for services to be healthy
console.log('⏳ Waiting for services to be healthy...');
let attempts = 0;
const maxAttempts = 30;

while (attempts < maxAttempts) {
  try {
    const result = execSync('docker-compose ps', { encoding: 'utf8' });
    const healthyServices = (result.match(/\(healthy\)/g) || []).length;

    if (healthyServices >= 4) { // server, redis, postgres, nginx
      console.log('✅ All services are healthy!');
      break;
    }

    console.log(`⏳ ${healthyServices}/4 services healthy, waiting...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  } catch (error) {
    console.log('⏳ Checking service health...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }
}

if (attempts >= maxAttempts) {
  console.warn('⚠️  Services may not be fully healthy yet');
}

// Show status
console.log('\n📊 Service Status:');
try {
  execSync('docker-compose ps', { stdio: 'inherit' });
} catch (error) {
  console.log('Could not get service status');
}

console.log('\n🌐 Access URLs:');
console.log('- Game Server API: http://localhost:3001');
console.log('- WebSocket: ws://localhost:3001');
console.log('- Monitoring: http://localhost:9090');
console.log('- Grafana: http://localhost:3002 (admin/admin)');
console.log('- Nginx: http://localhost');

console.log('\n📋 Management Commands:');
console.log('- View logs: docker-compose logs -f');
console.log('- Stop services: docker-compose down');
console.log('- Restart service: docker-compose restart velocityrush-server');
console.log('- Scale server: docker-compose up -d --scale velocityrush-server=3');

console.log('\n🎉 Server deployment complete!');
console.log('📝 Check the logs with: docker-compose logs -f velocityrush-server');

// Create deployment summary
const summary = {
  deploymentTime: new Date().toISOString(),
  version: JSON.parse(fs.readFileSync('package.json', 'utf8')).version,
  services: ['velocityrush-server', 'redis', 'postgres', 'nginx', 'monitoring', 'grafana'],
  ports: {
    server: 3001,
    monitoring: 9090,
    grafana: 3002,
    nginx: 80
  }
};

fs.writeFileSync('server-deployment-summary.json', JSON.stringify(summary, null, 2));
console.log('📊 Deployment summary saved to server-deployment-summary.json');