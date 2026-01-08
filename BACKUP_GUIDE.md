# Database Backup & Restore Guide

## 🚨 CRITICAL: Always Backup Before Making Changes

**RULE #1**: Create a backup before any database changes (migrations, seed scripts, bulk updates)

## Quick Commands

```bash
# Go to backend directory
cd packages/backend

# Create a backup
DATABASE_URL="postgresql://..." npm run backup

# List all backups
npm run list-backups

# Restore a backup
DATABASE_URL="postgresql://..." npm run restore backup-2026-01-08T12-30-00.sql
```

## Automatic Backup Schedule

### Option 1: Manual Daily Backup (Recommended for now)

Create a daily reminder to run:
```bash
cd /Users/90tenhobby/Desktop/Business-App/packages/backend
DATABASE_URL="postgresql://postgres:IFEGBjBrfpLQlpQadSsiyLOjyukaYkOu@trolley.proxy.rlwy.net:24210/railway" npm run backup
```

### Option 2: Cron Job (Mac/Linux)

Add to your crontab (`crontab -e`):
```bash
# Daily backup at 2 AM
0 2 * * * cd /Users/90tenhobby/Desktop/Business-App/packages/backend && DATABASE_URL="postgresql://postgres:IFEGBjBrfpLQlpQadSsiyLOjyukaYkOu@trolley.proxy.rlwy.net:24210/railway" npm run backup >> /Users/90tenhobby/Desktop/Business-App/backup.log 2>&1
```

### Option 3: Railway Cron Service (Cloud-based)

Deploy a separate Railway service that runs backups and stores them in S3/Google Cloud Storage.
See: https://github.com/railwayapp-templates/postgres-s3-backups

## Backup Storage

- **Local**: `packages/backend/backups/` (keeps last 30 backups automatically)
- **Off-site**: Copy important backups to external storage:
  - iCloud Drive
  - Google Drive
  - Dropbox
  - External hard drive

Example:
```bash
# Copy today's backup to iCloud
cp packages/backend/backups/backup-2026-01-08T*.sql ~/Library/Mobile\ Documents/com~apple~CloudDocs/
```

## Before Production Deployments

**ALWAYS** run this checklist:

```bash
# 1. Create backup
DATABASE_URL="postgresql://..." npm run backup

# 2. Verify backup was created
npm run list-backups

# 3. Make your changes (migrations, seed, etc.)

# 4. Test in production

# 5. If something breaks, restore:
DATABASE_URL="postgresql://..." npm run restore backup-2026-01-08T12-30-00.sql
```

## Restore Process

1. **List available backups**:
   ```bash
   npm run list-backups
   ```

2. **Choose a backup** and restore:
   ```bash
   DATABASE_URL="postgresql://..." npm run restore backup-2026-01-08T12-30-00.sql
   ```

3. **Confirm** by typing `YES` (all caps)

4. **Restart backend server** to pick up changes

## Safety Features

✅ Seed script requires `ALLOW_SEED=true` to run (prevents accidental execution)
✅ Seed script will ONLY affect Demo Farm data (never touches other businesses)
✅ Backups are timestamped and kept for 30 days
✅ Restore requires explicit `YES` confirmation
✅ Backups directory is in `.gitignore` (not committed to git)

## Running Seed Script Safely

The seed script now requires explicit confirmation:

```bash
# This will FAIL (safety check):
npm run prisma:seed

# This will work:
ALLOW_SEED=true npm run prisma:seed
```

**ALWAYS backup before seeding:**
```bash
npm run backup
ALLOW_SEED=true npm run prisma:seed
```

## Recovery Scenarios

### Scenario 1: Seed script accidentally ran
```bash
# Restore from most recent backup
npm run list-backups  # Find the latest backup
npm run restore backup-YYYY-MM-DDTHH-MM-SS.sql
```

### Scenario 2: Bad migration
```bash
# Restore from backup before the migration
npm run restore backup-before-migration.sql

# Then fix the migration and re-run
npx prisma migrate dev
```

### Scenario 3: Accidental data deletion
```bash
# Restore from most recent backup
npm run restore <latest-backup>
```

## Best Practices

1. **Backup before every seed run**
2. **Backup before every migration**
3. **Backup before bulk data operations**
4. **Keep weekly backups off-site** (iCloud, external drive)
5. **Test restore process monthly** to ensure it works
6. **Document what changed** in each backup (add notes to filename if needed)

## Backup Retention

- Automatic: Last 30 backups (approximately 1 month)
- Manual: Copy important backups to permanent storage
- Weekly: Archive one backup per week to external storage
- Monthly: Keep one backup per month permanently

## File Locations

- Backup scripts: `packages/backend/scripts/`
- Backups stored: `packages/backend/backups/`
- This guide: `/BACKUP_GUIDE.md`

## Troubleshooting

### "pg_dump: command not found"

Install PostgreSQL client tools:
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql-client`
- **Windows**: Install from https://www.postgresql.org/download/windows/

### "DATABASE_URL not set"

Always provide the DATABASE_URL:
```bash
DATABASE_URL="postgresql://..." npm run backup
```

Or set it in your shell:
```bash
export DATABASE_URL="postgresql://..."
npm run backup
```

### Backup file is 0 bytes

Check database connection:
```bash
psql "postgresql://..." -c "SELECT 1;"
```

## Support

If you have issues:
1. Check backup.log file
2. Verify DATABASE_URL is correct
3. Ensure pg_dump is installed
4. Check disk space in backups directory
