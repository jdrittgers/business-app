/**
 * Run Data Audit
 *
 * Run with: DATABASE_URL="postgresql://postgres:IFEGBjBrfpLQlpQadSsiyLOjyukaYkOu@trolley.proxy.rlwy.net:24210/railway" npx tsx src/scripts/run-data-audit.ts
 *
 * This script validates fundamental data accuracy:
 * - Mathematical balance checks
 * - Historical range validation
 * - Cross-commodity consistency
 * - Data freshness monitoring
 */

import { prisma } from '../prisma/client';
import { DataAuditService } from '../services/data-audit.service';
import { CommodityType } from '@business-app/shared';

async function runAudit() {
  console.log('🔍 Data Audit System v1.0\n');
  console.log('Date:', new Date().toISOString());

  const auditService = new DataAuditService();

  try {
    // Run full audit
    const report = await auditService.runFullAudit();

    // Run verification against known January 2026 values
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION AGAINST JANUARY 2026 WASDE');
    console.log('='.repeat(70));

    for (const commodity of [CommodityType.CORN, CommodityType.SOYBEANS, CommodityType.WHEAT]) {
      const verifyResults = await auditService.verifyAgainstSource(commodity);
      for (const result of verifyResults) {
        const icon = result.passed ? '✅' : '❌';
        console.log(`${icon} ${result.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(70));

    if (report.overallStatus === 'PASS') {
      console.log('✅ All data checks PASSED');
      console.log('   The Marketing AI is using accurate, up-to-date fundamental data.');
    } else if (report.overallStatus === 'WARNING') {
      console.log('⚠️  Audit completed with WARNINGS');
      console.log('   Review warnings above and consider updates.');
    } else {
      console.log('❌ Audit FAILED');
      console.log('   Critical issues found. Data correction required.');
    }

    process.exit(report.overallStatus === 'FAIL' ? 1 : 0);

  } catch (error) {
    console.error('Audit failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
