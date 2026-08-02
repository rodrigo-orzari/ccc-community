export const VECTOR_DATABASES = [
  // Pinecone
  { provider: 'pinecone', type: 'Serverless (Storage)', vcpus: 0, memory_gb: 0, price: 0.33, unit: 'GB-Month', attributes: { engine: 'Pinecone', deployment_type: 'Serverless', tier: 'Standard' } },
  { provider: 'pinecone', type: 'Dedicated p1.x1', vcpus: 2, memory_gb: 8, price: 0.096, unit: 'Hour', attributes: { engine: 'Pinecone', deployment_type: 'Provisioned', tier: 'Standard' } },
  { provider: 'pinecone', type: 'Dedicated s1.x1', vcpus: 2, memory_gb: 8, price: 0.134, unit: 'Hour', attributes: { engine: 'Pinecone', deployment_type: 'Provisioned', tier: 'Storage Optimized' } },
  
  // Qdrant
  { provider: 'qdrant', type: 'Cloud Standard (4GB)', vcpus: 2, memory_gb: 4, price: 0.188, unit: 'Hour', attributes: { engine: 'Qdrant', deployment_type: 'Provisioned', tier: 'Standard' } },
  { provider: 'qdrant', type: 'Cloud Standard (8GB)', vcpus: 4, memory_gb: 8, price: 0.375, unit: 'Hour', attributes: { engine: 'Qdrant', deployment_type: 'Provisioned', tier: 'Standard' } },

  // Zilliz (Milvus)
  { provider: 'milvus', type: 'Zilliz Serverless', vcpus: 0, memory_gb: 0, price: 0.002, unit: '1M Vectors', attributes: { engine: 'Milvus', deployment_type: 'Serverless', tier: 'Standard' } },
  { provider: 'milvus', type: 'Zilliz Dedicated (1 CU)', vcpus: 2, memory_gb: 8, price: 0.10, unit: 'Hour', attributes: { engine: 'Milvus', deployment_type: 'Provisioned', tier: 'Standard' } },

  // Weaviate
  { provider: 'weaviate', type: 'Serverless', vcpus: 0, memory_gb: 0, price: 0.05, unit: '1M Dimensions', attributes: { engine: 'Weaviate', deployment_type: 'Serverless', tier: 'Standard' } },
  { provider: 'weaviate', type: 'Enterprise Cloud (Small)', vcpus: 4, memory_gb: 16, price: 1.20, unit: 'Hour', attributes: { engine: 'Weaviate', deployment_type: 'Provisioned', tier: 'Enterprise' } },

  // Chroma
  { provider: 'chroma', type: 'Chroma Cloud Serverless', vcpus: 0, memory_gb: 0, price: 0.05, unit: 'GB-Month', attributes: { engine: 'Chroma', deployment_type: 'Serverless', tier: 'Standard' } },

  // DigitalOcean — no vector-specific surcharge; billed at standard Managed
  // Database rates (Postgres/pgvector or OpenSearch/k-NN). Confirmed 2026-07-29.
  { provider: 'digitalocean', type: 'Managed PostgreSQL (pgvector, 1vCPU/1GB)', vcpus: 1, memory_gb: 1, price: 0.02254, unit: 'Hour', attributes: { engine: 'PostgreSQL (pgvector)', deployment_type: 'Provisioned', tier: 'Standard' } },
  { provider: 'digitalocean', type: 'Managed PostgreSQL (pgvector, 1vCPU/2GB)', vcpus: 1, memory_gb: 2, price: 0.04531, unit: 'Hour', attributes: { engine: 'PostgreSQL (pgvector)', deployment_type: 'Provisioned', tier: 'Standard' } },

  // AWS — OpenSearch Serverless, vector engine. Classic Serverless requires a
  // 2 OCU minimum running continuously (~$350/mo floor); NextGen scales to
  // zero. Confirmed 2026-07-29.
  { provider: 'aws', type: 'OpenSearch Serverless (per OCU)', vcpus: 0, memory_gb: 0, price: 0.24, unit: 'OCU-Hour', attributes: { engine: 'OpenSearch Serverless', deployment_type: 'Serverless', tier: 'Standard' } },

  // Azure — AI Search, Basic tier (lowest tier with full vector search support).
  // Confirmed 2026-07-29.
  { provider: 'azure', type: 'AI Search (Basic)', vcpus: 0, memory_gb: 0, price: 0.10, unit: 'Hour', attributes: { engine: 'Azure AI Search', deployment_type: 'Provisioned', tier: 'Basic' } },
  { provider: 'azure', type: 'AI Search (Standard S1)', vcpus: 0, memory_gb: 0, price: 0.25, unit: 'Hour', attributes: { engine: 'Azure AI Search', deployment_type: 'Provisioned', tier: 'Standard' } },

  // GCP — Vertex AI Vector Search, billed per serving node-hour. Confirmed 2026-07-29.
  { provider: 'gcp', type: 'Vertex AI Vector Search (Ingestion)', vcpus: 0, memory_gb: 0, price: 0.10, unit: 'Node-Hour', attributes: { engine: 'Vertex AI Vector Search', deployment_type: 'Provisioned', tier: 'Standard' } },
  { provider: 'gcp', type: 'Vertex AI Vector Search (Optimized Serving)', vcpus: 0, memory_gb: 0, price: 0.38, unit: 'Node-Hour', attributes: { engine: 'Vertex AI Vector Search', deployment_type: 'Provisioned', tier: 'Optimized' } },

  // Oracle — AI Vector Search is a built-in feature of Database 23ai, included
  // free with Autonomous Database and other Oracle DB cloud services (no
  // separate charge). Represented as $0 to make the "included" status visible
  // rather than showing as missing. Confirmed 2026-07-29.
  { provider: 'oracle', type: 'AI Vector Search (Autonomous Database 23ai)', vcpus: 0, memory_gb: 0, price: 0, unit: 'Included', attributes: { engine: 'Oracle AI Vector Search', deployment_type: 'Included', tier: 'Standard' } },
];

// Alibaba Cloud intentionally NOT included yet — AnalyticDB for PostgreSQL has
// a vector engine (FastANN) but no confirmed line-item price was found as of
// 2026-07-29. Add once verified against Alibaba's own pricing page rather than
// guessing a number.
