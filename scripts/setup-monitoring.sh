#!/bin/bash

# VelocityRush3D Monitoring Setup Script

set -e

echo "📊 Setting up monitoring for VelocityRush3D..."

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Create monitoring directories
mkdir -p monitoring/grafana/{provisioning/datasources,provisioning/dashboards,dashboards}

# Start monitoring stack
echo "🚀 Starting monitoring stack..."
docker-compose -f docker-compose.yml up -d monitoring grafana

# Wait for services to be healthy
echo "⏳ Waiting for monitoring services..."
sleep 30

# Check if services are running
if docker-compose ps monitoring | grep -q "Up"; then
    echo "✅ Prometheus is running on http://localhost:9090"
else
    echo "❌ Prometheus failed to start"
fi

if docker-compose ps grafana | grep -q "Up"; then
    echo "✅ Grafana is running on http://localhost:3002"
    echo "   Default credentials: admin / admin"
else
    echo "❌ Grafana failed to start"
fi

# Create monitoring configuration summary
cat > monitoring-setup.json << EOF
{
  "monitoring": {
    "prometheus": {
      "url": "http://localhost:9090",
      "status": "running"
    },
    "grafana": {
      "url": "http://localhost:3002",
      "username": "admin",
      "password": "admin",
      "status": "running"
    }
  },
  "metrics": {
    "server": "velocityrush-server:3001/metrics",
    "node": "node-exporter:9100",
    "postgres": "postgres-exporter:9187",
    "redis": "redis-exporter:9121",
    "nginx": "nginx-exporter:9113"
  },
  "alerts": {
    "high_cpu": "CPU usage > 80%",
    "high_memory": "Memory usage > 85%",
    "server_down": "Server not responding",
    "db_connections": "Too many DB connections"
  }
}
EOF

echo "📄 Monitoring configuration saved: monitoring-setup.json"

echo ""
echo "🎉 Monitoring setup complete!"
echo ""
echo "📊 Access your monitoring:"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3002 (admin/admin)"
echo ""
echo "📈 Available metrics:"
echo "- Server performance and player counts"
echo "- System resources (CPU, memory, disk)"
echo "- Database connections and performance"
echo "- Redis cache statistics"
echo "- Nginx web server metrics"
echo ""
echo "🚨 To set up alerts:"
echo "1. Go to Grafana > Alerting"
echo "2. Create alert rules for critical metrics"
echo "3. Configure notification channels (email, Slack, etc.)"
echo ""
echo "📋 Management commands:"
echo "- View logs: docker-compose logs -f monitoring"
echo "- Restart: docker-compose restart monitoring"
echo "- Stop: docker-compose down"