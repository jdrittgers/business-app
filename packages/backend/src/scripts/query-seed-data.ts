import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  // Find jonathan user and their business
  const user = await p.user.findFirst({ where: { email: 'jonathan@rittgersfarms.com' } });
  if (!user) { console.log('User not found'); return; }
  const membership = await p.businessMember.findFirst({ where: { userId: user.id } });
  if (!membership) { console.log('No membership'); return; }
  const businessId = membership.businessId;
  console.log('Business ID:', businessId);

  // Get fertilizers
  const ferts = await p.fertilizer.findMany({ where: { businessId, isActive: true }, select: { name: true, pricePerUnit: true, unit: true, nitrogenPct: true, phosphorusPct: true, potassiumPct: true, sulfurPct: true, isLiquid: true, lbsPerGallon: true, isManure: true, purchaseUnit: true, pricePerPurchaseUnit: true } });
  console.log('\n=== FERTILIZERS ===');
  ferts.forEach(f => console.log(JSON.stringify(f)));

  // Get chemicals
  const chems = await p.chemical.findMany({ where: { businessId, isActive: true }, select: { name: true, pricePerUnit: true, unit: true, category: true } });
  console.log('\n=== CHEMICALS ===');
  chems.forEach(c => console.log(JSON.stringify(c)));

  // Get demo user/business
  const demoUser = await p.user.findFirst({ where: { email: 'demo@demo.com' } });
  if (demoUser) {
    const demoMembership = await p.businessMember.findFirst({ where: { userId: demoUser.id } });
    console.log('\n=== DEMO ===');
    console.log('Demo user:', demoUser.id);
    console.log('Demo business:', demoMembership?.businessId);

    if (demoMembership) {
      const entities = await p.grainEntity.findMany({ where: { businessId: demoMembership.businessId } });
      console.log('Entities:', entities.map(e => e.name + ' (' + e.id + ')'));
      const farms = await p.farm.findMany({ where: { grainEntity: { businessId: demoMembership.businessId } }, include: { grainEntity: true } });
      console.log('Farms:', farms.map(f => f.name + ' (' + f.commodityType + ', ' + f.acres + ' ac)'));

      const existingFerts = await p.fertilizer.findMany({ where: { businessId: demoMembership.businessId } });
      console.log('Existing ferts:', existingFerts.length);
      const existingChems = await p.chemical.findMany({ where: { businessId: demoMembership.businessId } });
      console.log('Existing chems:', existingChems.length);
    }
  }
  await p.$disconnect();
}
main();
