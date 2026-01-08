# Quick Start: Database Backups

## ✅ What Was Fixed

1. **Your Rittgers Farm Business Restored**:
   - Business: Rittgers Farm
   - User: rittgers@rittgersfarms.com ✅ (has access)
   - 5 Grain Entities Created:
     - Rittgers Farm
     - Rittgers Grain
     - JDR AG
     - JVR AG
     - JKC AG

2. **Backup System Installed**:
   - Automatic backup scripts
   - Easy restore from any backup
   - Keeps 30 days of backups automatically

3. **Safety Features**:
   - Seed script can't run accidentally
   - Only affects Demo Farm (never Rittgers Farm)
   - Backups not committed to git

## 🚀 Daily Workflow (IMPORTANT!)

### Before ANY Database Changes:

```bash
cd packages/backend

# 1. Create a backup
DATABASE_URL="postgresql://postgres:IFEGBjBrfpLQlpQadSsiyLOjyukaYkOu@trolley.proxy.rlwy.net:24210/railway" npm run backup

# 2. Make your changes (add data, run migrations, etc.)

# 3. If something breaks, restore:
npm run list-backups  # Find the backup you want
DATABASE_URL="..." npm run restore backup-YYYY-MM-DDTHH-MM-SS.sql
```

## 📋 Common Commands

```bash
# Go to backend directory
cd /Users/90tenhobby/Desktop/Business-App/packages/backend

# Create backup (DO THIS DAILY!)
DATABASE_URL="postgresql://postgres:IFEGBjBrfpLQlpQadSsiyLOjyukaYkOu@trolley.proxy.rlwy.net:24210/railway" npm run backup

# List all backups
npm run list-backups

# Restore a backup
DATABASE_URL="postgresql://postgres:IFEGBjBrfpLQlpQadSsiyLOjyukaYkOu@trolley.proxy.rlwy.net:24210/railway" npm run restore backup-2026-01-08T23-03-08.sql
```

## 💾 Where Are Backups Stored?

**Local**: `/Users/90tenhobby/Desktop/Business-App/packages/backend/backups/`

**Recommendation**: Copy important backups to iCloud or external drive:

```bash
# Copy today's backup to iCloud
cp packages/backend/backups/backup-2026-01-08*.sql ~/Library/Mobile\ Documents/com~apple~CloudDocs/
```

## 🔒 Seed Script Safety

The seed script now has safety checks to prevent data loss:

```bash
# This will FAIL (safe!):
npm run prisma:seed

# To run seed (only for Demo Farm data):
ALLOW_SEED=true npm run prisma:seed
```

**The seed script will:**
- ✅ Only affect Demo Farm data
- ✅ Never touch Rittgers Farm
- ✅ Warn if production data exists
- ✅ Require ALLOW_SEED=true flag

## 📅 Recommended Backup Schedule

1. **Daily**: Run backup before starting work
2. **Before migrations**: Always backup
3. **Before seed scripts**: Always backup
4. **Before bulk operations**: Always backup
5. **Weekly**: Copy one backup to external storage

## 🆘 Emergency Recovery

If something goes wrong:

```bash
cd packages/backend

# 1. List backups
npm run list-backups

# 2. Find the most recent good backup

# 3. Restore it
DATABASE_URL="postgresql://postgres:IFEGBjBrfpLQlpQadSsiyLOjyukaYkOu@trolley.proxy.rlwy.net:24210/railway" npm run restore backup-YYYY-MM-DDTHH-MM-SS.sql

# 4. Type YES to confirm

# 5. Restart backend if needed
```

## 📖 Full Documentation

See `BACKUP_GUIDE.md` for complete documentation.

## ⚡ Pro Tips

1. **Make a backup right now**:
   ```bash
   cd packages/backend
   DATABASE_URL="postgresql://postgres:IFEGBjBrfpLQlpQadSsiyLOjyukaYkOu@trolley.proxy.rlwy.net:24210/railway" npm run backup
   ```

2. **Add to your daily routine**: First thing in the morning, run a backup

3. **Before deploying**: Create a backup labeled with what you're deploying

4. **Test restore monthly**: Make sure the restore process works

## 🎯 Next Steps

1. Log in as rittgers@rittgersfarms.com
2. Navigate to Grain Dashboard
3. Select one of your 5 entities
4. Add production data, contracts, and break-even farms
5. **Run daily backups!**

Your data is now safe! 🎉
