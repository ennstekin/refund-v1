import { PrismaClient } from '@prisma/client';
import { SubdomainHelpers } from '../helpers/subdomain-helpers';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing missing subdomains...\n');

  const merchants = await prisma.merchant.findMany({
    where: {
      subdomain: null,
    },
  });

  console.log(`Found ${merchants.length} merchants without subdomain\n`);

  for (const merchant of merchants) {
    const storeName = merchant.storeName || `store-${merchant.id.substring(0, 8)}`;
    const subdomain = await SubdomainHelpers.generateSubdomain(storeName);

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        subdomain,
        subdomainStatus: 'active',
      },
    });

    console.log(`✅ ${storeName} → ${subdomain}.enestekin.com`);
  }

  console.log('\n✨ Done! All merchants now have subdomains.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
