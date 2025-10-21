// Deployment configuration for VelocityRush3D
export const deployConfig = {
  // Build settings
  build: {
    command: 'npm run build:prod',
    outputDir: 'dist',
    assetsDir: 'assets',
  },

  // Deployment targets
  targets: {
    // Static hosting (Netlify, Vercel, GitHub Pages, etc.)
    static: {
      type: 'static',
      buildCommand: 'npm run build:prod',
      publishDir: 'dist',
      redirects: [
        {
          source: '/api/*',
          destination: 'https://your-api-domain.com/api/:splat',
          statusCode: 200
        }
      ]
    },

    // CDN deployment
    cdn: {
      type: 'cdn',
      provider: 'cloudflare', // or 'aws', 'azure', etc.
      bucket: 'velocityrush3d-assets',
      region: 'us-east-1',
      cloudfront: {
        distributionId: 'your-distribution-id'
      }
    },

    // Server deployment
    server: {
      type: 'server',
      host: 'your-server.com',
      user: 'deploy',
      path: '/var/www/velocityrush3d',
      preDeploy: [
        'npm ci --production=false',
        'npm run lint',
        'npm run build:prod'
      ],
      postDeploy: [
        'pm2 restart velocityrush3d',
        'nginx -s reload'
      ]
    }
  },

  // Environment configurations
  environments: {
    development: {
      apiUrl: 'http://localhost:3001',
      websocketUrl: 'ws://localhost:3001',
      analytics: false,
      debug: true
    },

    staging: {
      apiUrl: 'https://api-staging.velocityrush3d.com',
      websocketUrl: 'wss://api-staging.velocityrush3d.com',
      analytics: true,
      debug: false
    },

    production: {
      apiUrl: 'https://api.velocityrush3d.com',
      websocketUrl: 'wss://api.velocityrush3d.com',
      analytics: true,
      debug: false
    }
  },

  // Performance monitoring
  monitoring: {
    enabled: true,
    sentry: {
      dsn: 'your-sentry-dsn',
      environment: 'production'
    },
    analytics: {
      googleAnalyticsId: 'your-ga-id',
      mixpanelToken: 'your-mixpanel-token'
    }
  },

  // CDN configuration
  cdn: {
    enabled: true,
    providers: [
      {
        name: 'cloudflare',
        zones: ['velocityrush3d.com'],
        rules: [
          {
            pattern: '/*.js',
            cacheTtl: 31536000, // 1 year
            browserCacheTtl: 86400 // 1 day
          },
          {
            pattern: '/*.css',
            cacheTtl: 31536000,
            browserCacheTtl: 86400
          },
          {
            pattern: '/*.png',
            cacheTtl: 31536000,
            browserCacheTtl: 604800 // 1 week
          },
          {
            pattern: '/*.gltf',
            cacheTtl: 31536000,
            browserCacheTtl: 604800
          }
        ]
      }
    ]
  },

  // SSL/TLS configuration
  ssl: {
    enabled: true,
    certificate: 'letsencrypt',
    autoRenew: true,
    hsts: {
      enabled: true,
      maxAge: 31536000,
      includeSubdomains: true,
      preload: true
    }
  },

  // Backup configuration
  backup: {
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    retention: {
      daily: 7,
      weekly: 4,
      monthly: 12
    },
    destinations: [
      's3://velocityrush3d-backups',
      'local:/var/backups/velocityrush3d'
    ]
  }
};

export default deployConfig;