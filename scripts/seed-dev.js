const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  const merchantId = 'f5c91d2e-18cd-44e9-90bd-689be8f7ebd2';
  const authorizedAppId = '246cd78c-9f5b-43e8-8e29-e9d95eb57284';
  
  // Create merchant record first
  const merchant = await prisma.merchant.upsert({
    where: {
      id: merchantId,
    },
    update: {
      storeName: 'dev-enes0',
      authorizedAppId: authorizedAppId,
      portalEnabled: true,
    },
    create: {
      id: merchantId,
      authorizedAppId: authorizedAppId,
      storeName: 'dev-enes0',
      portalEnabled: true,
    },
  });

  console.log('✅ Merchant record created:', merchant);

  // Mock OAuth token for development
  const authToken = await prisma.authToken.upsert({
    where: {
      authorizedAppId: authorizedAppId,
    },
    update: {
      accessToken: 'mock_access_token_for_development',
      refreshToken: 'mock_refresh_token_for_development',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    create: {
      id: crypto.randomUUID(),
      authorizedAppId: authorizedAppId,
      merchantId: merchantId,
      accessToken: 'mock_access_token_for_development',
      refreshToken: 'mock_refresh_token_for_development',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Development auth token created:', authToken);
  console.log('\n🎉 Development seed completed! You can now test the app at http://localhost:3001');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
