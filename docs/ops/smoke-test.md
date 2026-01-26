# ReadyLayer Production Smoke Tests

> **Post-Deployment Verification** • **CLI Validation** • **Health Checks**

Run these smoke tests after every deployment to verify ReadyLayer is functioning correctly.

## 🚀 Quick Test (5 minutes)

### 1. Health Check Suite
```bash
# Test API availability
curl -f https://your-domain.com/api/v1/health

# Test WebSocket connection
wscat -c wss://your-domain.com/api/v1/ws

# Check application readiness
curl -f https://your-domain.com/api/v1/ready

# Verify version
curl -f https://your-domain.com/api/v1/version
```

### Expected Responses
```json
// Health Check
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "uptime": "2h 34m",
    "database": "connected",
    "redis": "connected"
  }
}

// Readiness Check
{
  "success": true,
  "data": {
    "ready": true,
    "checks": {
      "database": "pass",
      "cache": "pass",
      "migrations": "pass"
    }
  }
}
```

## 🛠️ CLI Validation Commands

### Install CLI Tool
```bash
# Install globally
npm install -g @readylayer/cli

# Or use npx
npx readylayer --help
```

### Connection Test
```bash
# Test API connection
readylayer api-test --url=https://your-domain.com --token=your-jwt-token

# Verify database schema
readylayer db-check --url=your-database-url

# Test policy engine
readylayer policy-test --rules=./sample-rules.json --input=./sample-code.js
```

### Repository Sync Test
```bash
# Test Git integration
readylayer repo-sync --name=test-repo --url=https://github.com/user/test-repo

# Verify webhook
readylayer webhook-test --repo=test-repo --event=push
```

## 🔒 Security Verification

### Authentication Test
```bash
# Test login flow
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test-password"}'

# Verify JWT functionality
readylayer jwt-test --token=returned-jwt-token

# Test scope validation
readylayer scope-test --token=jwt-token --required-scopes="read:repos,write:policies"
```

### Permission Test
```bash
# Test role-based access
curl -X GET https://your-domain.com/api/v1/repos \
  -H "Authorization: Bearer USER_TOKEN" # Should work

curl -X POST https://your-domain.com/api/v1/policies \
  -H "Authorization: Bearer READONLY_TOKEN" # Should be denied
```

### Rate Limiting Test
```bash
# Test rate limiting (send 100 requests)
for i in {1..100}; do
  curl -s https://your-domain.com/api/v1/health > /dev/null
done

# Check rate limit headers
curl -I https://your-domain.com/api/v1/health
```

## 📊 Performance Validation

### Load Test
```bash
# Install artillery (if not present)
npm install -g artillery

# Run load test
artillery run load-test-config.yml

# Basic curl load test
ab -n 1000 -c 10 https://your-domain.com/api/v1/health
```

### Database Performance
```bash
# Check query performance
readylayer db-benchmark --duration=30 --concurrent=5

# Verify indexes
readylayer db-analyze --check-indexes=true

# Test connection pool
readylayer db-pool-test --max-connections=20
```

## 🔄 Integration Tests

### GitHub Integration
```bash
# Test OAuth flow
readylayer oauth-test --provider=github --client-id=your-client-id

# Test webhook processing
readylayer webhook-test --provider=github --repo=test-repo --payload-file=./test-push.json

# Verify PR processing
readylayer pr-test --repo=test-repo --pr-number=1
```

### Policy Engine Test
```bash
# Test rule evaluation
readylayer policy-evaluate \
  --rules-file=./security-rules.json \
  --code-file=./sample-vulnerable-code.js \
  --expected-result=failed

# Test policy versioning
readylayer policy-version-test --policy-id=test-policy --check-determinism=true
```

## 📱 Mobile & Browser Tests

### Responsive Design
```bash
# Use ReadyLayer CLI for browser testing
readylayer browser-test --url=https://your-domain.com --devices=mobile,tablet,desktop

# Test touch interactions
readylayer touch-test --url=https://your-domain.com --device=mobile

# Verify accessibility
readylayer a11y-test --url=https://your-domain.com --standards=wcag2aa
```

### Cross-Browser Test
```bash
# Test browser compatibility
readylayer browser-test --browsers=chrome,firefox,safari,edge --url=https://your-domain.com

# Test JavaScript errors
readylayer js-error-test --url=https://your-domain.com --duration=300
```

## 🔧 Configuration Validation

### Environment Variables
```bash
# Verify all required environment variables
readylayer config-check --env=production --verify-secrets=true

# Test database connection
readylayer db-connect-test --connection-string=$DATABASE_URL

# Validate configuration
readylayer config-validate --file=./.env.production
```

### SSL/TLS Verification
```bash
# Check SSL certificate
curl -I https://your-domain.com/api/v1/health

# Test TLS configuration
readylayer tls-test --domain=your-domain.com --check=protocols,ciphers,certificates

# Verify HTTPS redirect
curl -I http://your-domain.com # Should redirect to HTTPS
```

## 📋 Automated Test Suite

### Run All Tests
```bash
# Execute complete smoke test suite
readylayer smoke-test --env=production --domain=your-domain.com

# Run with report generation
readylayer smoke-test --env=production --domain=your-domain.com --report-format=json --output=./smoke-report.json

# Generate performance report
readylayer performance-report --duration=300 --output=./performance-report.json
```

### Test Results
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "production",
  "domain": "your-domain.com",
  "version": "1.0.0",
  "tests": {
    "health": {
      "status": "pass",
      "responseTime": "45ms",
      "database": "connected",
      "redis": "connected"
    },
    "authentication": {
      "status": "pass",
      "loginTime": "230ms",
      "jwtValidation": "pass",
      "scopeChecking": "pass"
    },
    "api": {
      "status": "pass",
      "endpointAvailability": "100%",
      "rateLimiting": "working",
      "cors": "configured"
    },
    "performance": {
      "status": "pass",
      "avgResponseTime": "67ms",
      "p95ResponseTime": "120ms",
      "throughput": "1000 req/sec"
    },
    "security": {
      "status": "pass",
      "tlsVersion": "TLSv1.3",
      "cipherSuite": "ECDHE-RSA-AES256-GCM-SHA384",
      "certExpiry": "2024-06-15T23:59:59Z"
    },
    "integration": {
      "status": "pass",
      "githubOAuth": "working",
      "webhookProcessing": "working",
      "policyEngine": "deterministic"
    }
  },
  "summary": {
    "overall": "pass",
    "warnings": [],
    "errors": [],
    "recommendations": [
      "All systems operational",
      "Ready for production traffic"
    ]
  }
}
```

## 🚨 Troubleshooting

### Common Issues
```bash
# Check if service is running
readylayer status --service=web --service=database --service=cache

# View recent logs
readylayer logs --tail=100 --service=web --level=error

# Test specific endpoint
readylayer endpoint-test --url=/api/v1/health --method=get --expected-status=200

# Check system resources
readylayer system-check --memory --disk --cpu --network
```

### Health Indicators
- ✅ **Green**: All systems operational
- 🟡 **Yellow**: Some degraded performance or warnings
- 🔴 **Red**: Critical issues or service unavailable

### Automated Monitoring
```bash
# Set up monitoring
readylayer monitor-setup \
  --prometheus-endpoint=http://prometheus:9090 \
  --grafana-url=http://grafana:3000 \
  --alert-webhook=https://your-slack-webhook.com
```

## 📄 Reporting

### Generate Deployment Report
```bash
# Create comprehensive deployment report
readylayer deployment-report \
  --env=production \
  --domain=your-domain.com \
  --output=./deployment-report.html \
  --format=html
```

### Email Notifications
```bash
# Configure email alerts
readylayer alerts-setup \
  --smtp-server=smtp.your-provider.com \
  --from=deployments@your-domain.com \
  --to=devops@your-domain.com \
  --on-failure=true \
  --on-success=true
```

---

Run these smoke tests after every deployment to ensure ReadyLayer is production-ready and performing optimally.