# Incident Response Runbook

## Health Check Failures

### Database Unavailable

**Symptoms:**
- `/api/health` returns 503
- Database check shows "unhealthy"

**Actions:**
1. Check database connection string
2. Verify database is running
3. Check network connectivity
4. Review database logs

**Rollback:**
- Restore from backup if data corruption suspected
- Switch to read replica if available

### Redis Unavailable

**Symptoms:**
- Queue processing falls back to database
- Logs show "Failed to connect to Redis"

**Actions:**
1. Check Redis connection string
2. Verify Redis is running
3. Queue system will continue with database fallback

**Impact:**
- No immediate impact (graceful degradation)
- Performance may be slower

## API Errors

### Rate Limit Exceeded

**Symptoms:**
- API returns 429 Too Many Requests
- `X-RateLimit-Remaining: 0`

**Actions:**
1. Check if legitimate traffic spike
2. Review rate limit configuration
3. Consider increasing limits if needed
4. Check for abuse/attacks

### Authentication Failures

**Symptoms:**
- API returns 401 Unauthorized
- Users cannot access resources

**Actions:**
1. Check Supabase configuration
2. Verify API keys are valid
3. Check token expiration
4. Review authentication logs

## Service Failures

### Review Guard Failing

**Symptoms:**
- PRs not being reviewed
- Status checks showing errors

**Actions:**
1. Check LLM API availability
2. Verify API keys are valid
3. Check budget limits
4. Review service logs

**Rollback:**
- Disable Review Guard temporarily
- Process reviews manually

### Test Engine Failing

**Symptoms:**
- Tests not being generated
- Coverage checks failing

**Actions:**
1. Check LLM API availability
2. Verify test framework detection
3. Review generation logs

### Doc Sync Failing

**Symptoms:**
- Documentation not updating
- Drift detection not working

**Actions:**
1. Check code parser service
2. Verify LLM API availability
3. Review generation logs

## Queue Issues

### Jobs Stuck in Queue

**Symptoms:**
- Jobs remain in "pending" status
- Workers not processing

**Actions:**
1. Check worker processes are running
2. Review worker logs
3. Check Redis/database connectivity
4. Restart workers if needed

### Dead Letter Queue Growing

**Symptoms:**
- Many jobs in DLQ
- Repeated failures

**Actions:**
1. Review DLQ job errors
2. Identify root cause
3. Fix underlying issue
4. Retry failed jobs

## Cost Overruns

### LLM Budget Exceeded

**Symptoms:**
- LLM calls failing
- Budget limit errors

**Actions:**
1. Review cost tracking
2. Identify high-spend areas
3. Optimize prompts/caching
4. Increase budget if needed
5. Implement stricter limits

## Rollback Procedures

### Code Rollback

1. Identify last known good deployment
2. Revert code changes
3. Run database migrations if needed
4. Restart services

### Database Rollback

1. Stop all services
2. Restore database from backup
3. Verify data integrity
4. Restart services

### Configuration Rollback

1. Revert config changes
2. Restart affected services
3. Verify functionality

## Escalation

### Critical Issues

- **P0**: System down, data loss, security breach
- **P1**: Major feature broken, significant user impact
- **P2**: Minor feature broken, limited user impact

### Contact

- **On-Call**: [Contact Info]
- **Slack**: #readylayer-incidents
- **Email**: incidents@readylayer.com
