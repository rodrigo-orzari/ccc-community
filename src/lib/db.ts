import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Connection via Postgres.js
const sql = postgres(process.env.DATABASE_URL || '', {
  ssl: process.env.DATABASE_CA_CERT ? {
    // A CA cert is provided (production / DigitalOcean managed Postgres), so we can
    // and must verify the server certificate against it. Verifying prevents
    // man-in-the-middle attacks on the DB connection.
    rejectUnauthorized: true,
    ca: Buffer.from(process.env.DATABASE_CA_CERT, 'base64')
  } : process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true }
  : {
    // No CA available and not production (local/dev over a trusted network):
    // fall back to an encrypted-but-unverified connection.
    rejectUnauthorized: false
  },
  max: 10,
  idle_timeout: 20
});

export default sql;
