#!/usr/bin/env node

/**
 * Database Restore Script
 *
 * Restores a PostgreSQL database from a backup file.
 *
 * DANGER: This will OVERWRITE the current database!
 *
 * Usage:
 *   npm run restore
 *   OR
 *   node scripts/restore-database.js [backup-filename]
 *
 * If no filename is provided, shows list of available backups.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not set');
  console.error('Set DATABASE_URL environment variable or run with:');
  console.error('DATABASE_URL="your-connection-string" npm run restore');
  process.exit(1);
}

// Find psql binary
function findPsql() {
  try {
    // Try standard PATH first
    execSync('which psql', { stdio: 'pipe' });
    return 'psql';
  } catch {
    // Try Postgres.app location
    const postgresAppPath = '/Users/90tenhobby/Desktop/Business-App/Postgres.app/Contents/Versions/18/bin/psql';
    if (fs.existsSync(postgresAppPath)) {
      return postgresAppPath;
    }

    // Try common Postgres.app locations
    const commonPaths = [
      '/Applications/Postgres.app/Contents/Versions/18/bin/psql',
      '/Applications/Postgres.app/Contents/Versions/17/bin/psql',
      '/Applications/Postgres.app/Contents/Versions/16/bin/psql',
      '/Applications/Postgres.app/Contents/Versions/15/bin/psql'
    ];

    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    console.error('❌ ERROR: psql not found');
    console.error('Install PostgreSQL client tools:');
    console.error('  Mac: brew install postgresql');
    console.error('  Or add Postgres.app to PATH');
    process.exit(1);
  }
}

const PSQL = findPsql();

// Get backup filename from command line argument
const backupFilename = process.argv[2];

if (!fs.existsSync(BACKUP_DIR)) {
  console.error('❌ ERROR: No backups directory found');
  console.error(`Expected directory: ${BACKUP_DIR}`);
  process.exit(1);
}

// List available backups
const backups = fs.readdirSync(BACKUP_DIR)
  .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
  .map(file => {
    const fullPath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(fullPath);
    return {
      name: file,
      path: fullPath,
      size: (stats.size / (1024 * 1024)).toFixed(2),
      date: stats.mtime
    };
  })
  .sort((a, b) => b.date - a.date); // Sort by newest first

if (backups.length === 0) {
  console.error('❌ ERROR: No backup files found');
  console.error(`Directory: ${BACKUP_DIR}`);
  console.error('Run "npm run backup" to create a backup first.');
  process.exit(1);
}

if (!backupFilename) {
  console.log('📦 Available backups:\n');
  backups.forEach((backup, index) => {
    console.log(`${index + 1}. ${backup.name}`);
    console.log(`   Date: ${backup.date.toLocaleString()}`);
    console.log(`   Size: ${backup.size} MB\n`);
  });
  console.log('Usage: npm run restore <backup-filename>');
  console.log(`Example: npm run restore ${backups[0].name}`);
  process.exit(0);
}

// Find the backup file
const backupFile = path.join(BACKUP_DIR, backupFilename);

if (!fs.existsSync(backupFile)) {
  console.error(`❌ ERROR: Backup file not found: ${backupFilename}`);
  console.error('Run "npm run restore" without arguments to see available backups.');
  process.exit(1);
}

// Confirm before restoring
console.log('⚠️  WARNING: DATABASE RESTORE OPERATION ⚠️');
console.log('');
console.log('This will COMPLETELY OVERWRITE the current database!');
console.log(`Backup file: ${backupFilename}`);
console.log('');
console.log('Are you ABSOLUTELY SURE you want to continue?');
console.log('Type "YES" (all caps) to confirm, or anything else to cancel:');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('> ', (answer) => {
  rl.close();

  if (answer !== 'YES') {
    console.log('❌ Restore cancelled.');
    process.exit(0);
  }

  performRestore();
});

function performRestore() {
  console.log('\n🚀 Starting database restore...');
  console.log(`📁 Restoring from: ${backupFile}`);

  try {
    // Drop all existing tables (clean slate)
    console.log('🗑️  Dropping existing tables...');
    execSync(`"${PSQL}" "${DATABASE_URL}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`, {
      stdio: 'inherit',
      shell: '/bin/bash'
    });

    // Restore from backup
    console.log('📥 Restoring database from backup...');
    execSync(`"${PSQL}" "${DATABASE_URL}" < "${backupFile}"`, {
      stdio: 'inherit',
      shell: '/bin/bash'
    });

    console.log('✅ Database restored successfully!');
    console.log('');
    console.log('⚠️  IMPORTANT: Restart your backend server to pick up the changes.');

  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    console.error('');
    console.error('The database may be in an inconsistent state.');
    console.error('You may need to restore from another backup or rebuild the schema.');
    process.exit(1);
  }
}
