import postgres from 'postgres';
import { ContainersPricingPipeline } from './containers_pipeline';

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  // ✅ FIXED: Enable TLS certificate validation with CA support
  const ssl = process.env.DATABASE_CA_CERT
    ? {
        rejectUnauthorized: true,
        ca: Buffer.from(process.env.DATABASE_CA_CERT, 'base64'),
      }
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true } // Production: enforce validation, use built-in CAs
      : false; // Development: skip TLS validation only for local connections

  const sql = postgres(process.env.DATABASE_URL!, { ssl });

  try {
    console.log('🚀 Starting standalone containers pricing data ingestion...\n');

    // Run containers pricing pipeline
    const containersPipeline = new ContainersPricingPipeline(sql as any);
    const containersResults = await containersPipeline.run();
    
    containersResults.forEach((result: any) => {
      if (result.status === 'success') {
        console.log(`  ✅ ${result.provider.toUpperCase()}: ${result.count} Containers configurations`);
      } else {
        console.log(`  ❌ ${result.provider.toUpperCase()}: ${result.message}`);
      }
    });

    console.log('\n✨ Standalone containers ingestion complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the script
main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
