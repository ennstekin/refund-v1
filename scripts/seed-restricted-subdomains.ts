import { SubdomainHelpers } from '../src/helpers/subdomain-helpers';
import { prisma } from '../src/lib/prisma';

/**
 * Seed restricted subdomains to database
 * Run once during initial setup
 */
async function main() {
  console.log('🚀 Starting subdomain seeding...\n');

  try {
    // Seed system-reserved subdomains
    await SubdomainHelpers.seedRestrictedSubdomains();

    console.log('\n✅ Subdomain seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
