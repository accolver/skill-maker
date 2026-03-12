# Rollback Procedures

## Decision Tree

```
Deployment failed or issues detected
│
├── Is the app returning errors (5xx)?
│   ├── Yes → Immediate rollback (Option A or B)
│   └── No, but behavior is wrong → Investigate first, then rollback if needed
│
├── Is it a Lambda/code issue?
│   └── Yes → Option A: Redeploy previous version
│
├── Is it an infrastructure issue?
│   └── Yes → Option B: CloudFormation rollback
│
├── Is it a CDN/caching issue?
│   └── Yes → Option C: CloudFront invalidation
│
├── Is it a config/env var issue?
│   └── Yes → Option D: Fix config and redeploy
│
└── Is it a database migration issue?
    └── Yes → Option E: Database restore (manual)
```

## Option A: Redeploy Previous Version

**When to use:** Lambda function code is broken, but infrastructure is fine.

**Time to recover:** 3-5 minutes

```bash
# Automatic: finds the last successful deployment and redeploys it
bun run scripts/rollback.ts <stage>

# Manual: specify a specific version
bun run scripts/rollback.ts <stage> --to-version deploy-production-1700000000000

# View available versions
bun run scripts/history.ts <stage>
```

**What happens:**

1. Script finds the previous successful deployment record
2. Checks out the git commit from that deployment
3. Rebuilds the Next.js app from that commit
4. Runs `cdk deploy` to push the old code
5. Runs smoke tests to verify
6. Returns to the original git branch

**Risks:**

- If the CDK stack definition changed between versions, infrastructure may also
  change
- Build-time env vars will use the old commit's config

## Option B: CloudFormation Rollback

**When to use:** Infrastructure changes broke something (security groups, IAM,
resource config).

**Time to recover:** 5-15 minutes (depends on resources)

```bash
bun run scripts/rollback.ts <stage> --cfn-rollback
```

**What happens:**

1. Triggers CloudFormation stack rollback
2. CloudFormation reverts all resources to their previous state
3. Waits for rollback to complete
4. Runs smoke tests

**Risks:**

- Some resources cannot be rolled back (e.g., deleted S3 objects)
- Rollback may fail if resources were manually modified outside CDK
- Can take 10-15 minutes for complex stacks

**Manual fallback:**

```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name nextjs-app-production \
  --query 'Stacks[0].StackStatus'

# If stuck in UPDATE_ROLLBACK_FAILED
aws cloudformation continue-update-rollback \
  --stack-name nextjs-app-production

# Nuclear option: skip problematic resources
aws cloudformation continue-update-rollback \
  --stack-name nextjs-app-production \
  --resources-to-skip LogicalResourceId1 LogicalResourceId2
```

## Option C: CloudFront Cache Invalidation

**When to use:** Old/stale content being served, or CDN routing is wrong.

**Time to recover:** 5-10 minutes (global propagation)

```bash
bun run scripts/rollback.ts <stage> --cdn-only
```

**What happens:**

1. Creates a CloudFront invalidation for all paths (`/*`)
2. CloudFront fetches fresh content from origins

**Manual:**

```bash
# Get distribution ID
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name nextjs-app-production \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

# Invalidate all paths
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths '/*'

# Check invalidation status
aws cloudfront list-invalidations \
  --distribution-id $DIST_ID
```

## Option D: Fix Config and Redeploy

**When to use:** Wrong environment variables or configuration.

**Time to recover:** 5-10 minutes

```bash
# 1. Fix the config file
vim config/production.env

# 2. For NEXT_PUBLIC_ vars: rebuild and redeploy
bun run scripts/deploy.ts production

# 3. For server-side vars only: update Lambda env directly (faster)
aws lambda update-function-configuration \
  --function-name nextjs-app-production-ServerFunction \
  --environment "Variables={DATABASE_URL=postgresql://correct-url,LOG_LEVEL=warn}"
```

## Option E: Database Restore

**When to use:** A database migration corrupted data or broke schema
compatibility.

**Time to recover:** 15-60 minutes (depends on database size)

**This is manual and high-risk. Follow these steps carefully:**

1. **Stop traffic** to prevent further data corruption:
   ```bash
   # Set Lambda concurrency to 0
   aws lambda put-function-concurrency \
     --function-name nextjs-app-production-ServerFunction \
     --reserved-concurrent-executions 0
   ```

2. **Identify the restore point:**
   ```bash
   # List RDS snapshots
   aws rds describe-db-snapshots \
     --db-instance-identifier myapp-production \
     --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' \
     --output table
   ```

3. **Restore from snapshot:**
   ```bash
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier myapp-production-restored \
     --db-snapshot-identifier rds:myapp-production-2024-01-15-00-00
   ```

4. **Update connection string** to point to restored instance

5. **Rollback the app code** to match the database schema:
   ```bash
   bun run scripts/rollback.ts production --to-version <pre-migration-version>
   ```

6. **Re-enable traffic:**
   ```bash
   aws lambda delete-function-concurrency \
     --function-name nextjs-app-production-ServerFunction
   ```

7. **Verify** everything works, then clean up the old database instance.

## Post-Rollback Checklist

After any rollback, complete these steps:

- [ ] Verify smoke tests pass
- [ ] Check CloudWatch for error rates returning to normal
- [ ] Notify the team about the rollback (Slack/email)
- [ ] Create an incident report documenting:
  - What was deployed
  - What went wrong
  - How it was detected
  - How it was rolled back
  - Time to detection and time to recovery
- [ ] Identify root cause and create a fix
- [ ] Test the fix in staging before attempting production again
- [ ] Update monitoring/alerts if the issue wasn't caught automatically
