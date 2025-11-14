import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const merchants = await prisma.merchant.findMany({
    select: {
      id: true,
      subdomain: true,
      subdomainStatus: true,
      portalEnabled: true,
      storeName: true,
    },
    take: 5,
  });

  console.log('📊 Merchants in database:');
  console.table(merchants);

  if (merchants.length === 0) {
    console.log('\n❌ No merchants found! You need to complete OAuth onboarding first.');
  } else {
    const activePortals = merchants.filter(m => m.portalEnabled && m.subdomainStatus === 'active');
    console.log(`\n✅ ${activePortals.length} active portals found:`);
    activePortals.forEach(m => {
      console.log(`   - https://${m.subdomain}.enestekin.com (${m.storeName})`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
