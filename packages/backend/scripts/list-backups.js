#!/usr/bin/env node

/**
 * List Available Backups
 *
 * Shows all available database backups with details.
 *
 * Usage:
 *   npm run list-backups
 *   OR
 *   node scripts/list-backups.js
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  console.log('📦 No backups directory found.');
  console.log('Run "npm run backup" to create your first backup.');
  process.exit(0);
}

const backups = fs.readdirSync(BACKUP_DIR)
  .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
  .map(file => {
    const fullPath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(fullPath);
    return {
      name: file,
      size: (stats.size / (1024 * 1024)).toFixed(2),
      date: stats.mtime
    };
  })
  .sort((a, b) => b.date - a.date); // Sort by newest first

if (backups.length === 0) {
  console.log('📦 No backups found.');
  console.log('Run "npm run backup" to create your first backup.');
  process.exit(0);
}

console.log(`📦 Available backups (${backups.length}):\n`);
backups.forEach((backup, index) => {
  const isRecent = Date.now() - backup.date.getTime() < 24 * 60 * 60 * 1000; // Within 24 hours
  const badge = isRecent ? '🆕' : '📄';

  console.log(`${badge} ${index + 1}. ${backup.name}`);
  console.log(`   Date: ${backup.date.toLocaleString()}`);
  console.log(`   Size: ${backup.size} MB`);
  console.log('');
});

console.log(`📍 Backup directory: ${BACKUP_DIR}`);
console.log('\nTo restore a backup:');
console.log(`  npm run restore ${backups[0].name}`);
