export const ALIBABA_DB_REGION = 'ap-southeast-1';
export const ALIBABA_DB_GEOGRAPHY = 'Asia Pacific';

export const ALIBABA_DB_INSTANCES = [
  // ApsaraDB RDS for MySQL (High Availability Edition)
  { type: 'mysql.n2.small.2c', engine: 'MySQL', vcpus: 2, memory: 4, price: 0.12 },
  { type: 'mysql.n4.large.2c', engine: 'MySQL', vcpus: 4, memory: 8, price: 0.24 },
  { type: 'mysql.n8.xlarge.2c', engine: 'MySQL', vcpus: 8, memory: 16, price: 0.48 },

  // ApsaraDB RDS for PostgreSQL (High Availability Edition)
  { type: 'pg.n2.small.2c', engine: 'PostgreSQL', vcpus: 2, memory: 4, price: 0.13 },
  { type: 'pg.n4.large.2c', engine: 'PostgreSQL', vcpus: 4, memory: 8, price: 0.26 },
  { type: 'pg.n8.xlarge.2c', engine: 'PostgreSQL', vcpus: 8, memory: 16, price: 0.52 },

  // ApsaraDB for MongoDB (replica set) — Alibaba's managed NoSQL document DB.
  // Alibaba publishes no static international price list for MongoDB (console
  // quote only); prices below are ESTIMATES anchored to the same-spec RDS
  // classes above plus the typical replica-set premium. Verify against the
  // console quote on the next data refresh. Added because its absence made
  // Alibaba show "N/A" for every NoSQL workload component — misrepresenting a
  // product Alibaba genuinely offers.
  { type: 'dds.mongo.mid (2c4g replica)', engine: 'MongoDB', vcpus: 2, memory: 4, price: 0.15 },
  { type: 'dds.mongo.standard (4c8g replica)', engine: 'MongoDB', vcpus: 4, memory: 8, price: 0.30 },
];
