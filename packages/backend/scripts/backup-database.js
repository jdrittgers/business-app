#!/usr/bin/env node

/**
 * Database Backup Script
 *
 * Creates timestamped backups of the production PostgreSQL database.
 * Backups are stored in packages/backend/backups/ directory.
 *
 * Usage:
 *   npm run backup
 *   OR
 *   node scripts/backup-database.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = 30; // Keep last 30 backups

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not set');
  console.error('Set DATABASE_URL environment variable or run with:');
  console.error('DATABASE_URL="your-connection-string" npm run backup');
  process.exit(1);
}

// Find pg_dump binary
function findPgDump() {
  try {
    // Try standard PATH first
    execSync('which pg_dump', { stdio: 'pipe' });
    return 'pg_dump';
  } catch {
    // Try Postgres.app location
    const postgresAppPath = '/Users/90tenhobby/Desktop/Business-App/Postgres.app/Contents/Versions/18/bin/pg_dump';
    if (fs.existsSync(postgresAppPath)) {
      return postgresAppPath;
    }

    // Try common Postgres.app locations
    const commonPaths = [
      '/Applications/Postgres.app/Contents/Versions/18/bin/pg_dump',
      '/Applications/Postgres.app/Contents/Versions/17/bin/pg_dump',
      '/Applications/Postgres.app/Contents/Versions/16/bin/pg_dump',
      '/Applications/Postgres.app/Contents/Versions/15/bin/pg_dump'
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    console.error('❌ ERROR: pg_dump not found');
    console.error('Install PostgreSQL client tools:');
    console.error('  Mac: brew install postgresql');
    console.error('  Or add Postgres.app to PATH');
    process.exit(1);
  }
}

const PG_DUMP = findPgDump();

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✅ Created backup directory: ${BACKUP_DIR}`);
}

// Generate timestamp for backup filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

console.log('🚀 Starting database backup...');
console.log(`📁 Backup location: ${backupFile}`);

try {
  // Run pg_dump
  execSync(`"${PG_DUMP}" "${DATABASE_URL}" > "${backupFile}"`, {
    stdio: 'inherit',
    shell: '/bin/bash'
  });

  // Verify backup was created
  const stats = fs.statSync(backupFile);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`✅ Backup completed successfully!`);
  console.log(`📦 Backup size: ${fileSizeMB} MB`);
  console.log(`📍 Location: ${backupFile}`);

  // Clean up old backups
  cleanupOldBackups();

} catch (error) {
  console.error('❌ Backup failed:', error.message);

  // Remove incomplete backup file
  if (fs.existsSync(backupFile)) {
    fs.unlinkSync(backupFile);
  }

  process.exit(1);
}

function cleanupOldBackups() {
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
    .map(file => ({
      name: file,
      path: path.join(BACKUP_DIR, file),
      time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Sort by newest first

  if (backups.length > MAX_BACKUPS) {
    console.log(`🧹 Cleaning up old backups (keeping ${MAX_BACKUPS} most recent)...`);

    const toDelete = backups.slice(MAX_BACKUPS);
    toDelete.forEach(backup => {
      fs.unlinkSync(backup.path);
      console.log(`   Deleted: ${backup.name}`);
    });

    console.log(`✅ Cleanup complete. ${backups.length - toDelete.length} backups remaining.`);
  }
}
