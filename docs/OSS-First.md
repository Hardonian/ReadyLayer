# ReadyLayer - OSS First Installation Guide

> **Local-First by Default** • **Zero Configuration Required** • **Production Ready**

ReadyLayer is designed to work out-of-the-box with local SQLite, providing immediate value without cloud dependencies.

## 🚀 Quick Start (60 seconds)

```bash
# Clone and install
git clone https://github.com/Hardonian/ReadyLayer.git
cd ReadyLayer
npm install

# Start with local SQLite (zero config)
npm run dev
```

That's it. ReadyLayer will:
- ✅ Start with local SQLite database
- ✅ Create admin user automatically  
- ✅ Load sample governance policies
- ✅ Be ready for first repository integration

## 📋 What Works Out-of-the-Box

### Core Governance
- ✅ Policy engine with deterministic checks
- ✅ Review guard with security scanning
- ✅ Test generation and coverage
- ✅ Documentation synchronization
- ✅ Audit trail with cryptographic hashes

### Integrations
- ✅ GitHub OAuth (single click)
- ✅ GitLab self-hosted support
- ✅ Bitbucket connector
- ✅ REST API + WebSocket real-time updates
- ✅ CLI tools for local development

### Data & Storage
- ✅ Local SQLite (default)
- ✅ PostgreSQL (production)
- ✅ Redis for queues (optional)
- ✅ File storage (local or S3)

## 🔧 Configuration (Optional)

If you want to customize the defaults, create `.env.local`:

```bash
# Database (SQLite works by default)
DATABASE_URL="file:./readylayer.db"

# GitHub OAuth (create app in GitHub settings)
GITHUB_CLIENT_ID="your_client_id"
GITHUB_CLIENT_SECRET="your_client_secret"

# First admin user
ADMIN_EMAIL="admin@yourcompany.com"
```

## 🏗️ Architecture Highlights

### Security First
- JWT tokens with configurable scopes
- Local development bypass (secure by default)
- Secret redaction before LLM calls
- Row-level security (RLS) in database

### Performance Optimized
- Async LLM processing (non-blocking)
- Background job queues with Redis
- Smart caching with CDN
- Optimized for cold starts

### Developer Experience
- Type-safe throughout (TypeScript 5.3)
- Hot reload in development
- Comprehensive error boundaries
- Auto-generated API documentation

## 📱 Mobile & Desktop Ready

ReadyLayer works seamlessly across all devices:
- 📱 Mobile-first responsive design
- 🖥️ Desktop optimized workflows
- ♿ WCAG 2.1 AA accessibility
- 🌙 Dark/light theme support

## 🚀 Production Deployment

### Self-Hosted (Recommended)
```bash
# Build for production
npm run build

# Deploy with PM2
pm2 start npm --name "readylayer" -- start

# Or use Docker
docker build -t readylayer .
docker run -p 3000:3000 readylayer
```

### Cloud Options
- **Vercel**: One-click deploy from GitHub
- **Railway**: Managed PostgreSQL included
- **DigitalOcean**: One-click app platform
- **AWS**: ECS or Elastic Beanstalk

## 📚 Documentation

- 📖 **[User Guide](./docs/guide.md)** - Complete feature walkthrough
- 🔧 **[API Reference](./docs/api/endpoints.md)** - REST + WebSocket documentation
- 🛡️ **[Security](./docs/api/auth-security.md)** - JWT scopes and best practices
- ⚙️ **[Configuration](./docs/configuration.md)** - Advanced setup options

## 🤝 Community

- 🐛 **[Issues](https://github.com/Hardonian/ReadyLayer/issues)** - Bug reports and feature requests
- 💬 **[Discussions](https://github.com/Hardonian/ReadyLayer/discussions)** - Community support
- 📝 **[Contributing](./CONTRIBUTING.md)** - Development guidelines

## 📄 License

MIT License - Free for commercial and personal use.

---

**ReadyLayer provides enterprise-grade code governance with the simplicity of open source. Start governing your code in 60 seconds.**