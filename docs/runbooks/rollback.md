# Rollback Procedures

## Code Rollback

### Vercel Deployment

1. Go to Vercel dashboard
2. Select project
3. Navigate to Deployments
4. Find last known good deployment
5. Click "..." → "Promote to Production"

### Manual Rollback

```bash
# Revert to previous commit
git revert HEAD
git push

# Or checkout specific commit
git checkout <commit-hash>
git push --force
```

## Database Rollback

### Migration Rollback

```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Or reset database (DANGER: Data loss)
npx prisma migrate reset
```

### Data Restore

1. Stop all services
2. Restore database from backup
3. Verify data integrity
4. Restart services

## Configuration Rollback

### Repository Config

```bash
# Revert config via API
curl -X PUT /api/v1/config/repos/{repoId} \
  -H "Authorization: Bearer {api-key}" \
  -d '{"config": {...previous-config...}}'
```

### Environment Variables

1. Update environment variables in deployment platform
2. Restart services
3. Verify functionality

## Service Rollback

### Disable Feature

```bash
# Disable Review Guard for repo
curl -X PUT /api/v1/config/repos/{repoId} \
  -H "Authorization: Bearer {api-key}" \
  -d '{"config": {"review": {"enabled": false}}}'
```

### Stop Workers

```bash
# Stop webhook processor
pkill -f "worker:webhook"

# Stop job processor
pkill -f "worker:job"
```

## Verification

After rollback:

1. Check health endpoints
2. Verify core functionality
3. Review logs for errors
4. Monitor metrics

## Prevention

- Always test migrations on staging
- Keep database backups
- Use feature flags for risky changes
- Monitor deployments closely
