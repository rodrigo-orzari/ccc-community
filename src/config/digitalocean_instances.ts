// DigitalOcean Droplet pricing.
//
// DigitalOcean does have a public pricing API, but it requires an authenticated
// API token. To keep this app token-free for now, the catalogue is maintained
// manually here. Source: https://www.digitalocean.com/pricing/droplets
// To update prices: edit the entries below; the next pipeline run will refresh
// the database. Hourly price = monthly / 730 hours.

export interface DigitalOceanInstanceConfig {
  slug: string;
  vcpus: number;
  memory: number;
  price: number; // hourly USD
  category: 'General purpose' | 'Compute optimized' | 'Memory optimized' | 'Storage optimized' | 'Burstable' | 'HPC' | 'GPU instance';
  gpuCount?: number;
}

export const DIGITALOCEAN_REGION = 'nyc1';
export const DIGITALOCEAN_GEOGRAPHY = 'N. America';

export const DIGITALOCEAN_INSTANCES: DigitalOceanInstanceConfig[] = [
  { slug: 's-1vcpu-1gb',  vcpus: 1, memory: 1,  price: 0.00893, category: 'General purpose' },
  { slug: 's-2vcpu-2gb',  vcpus: 2, memory: 2,  price: 0.02679, category: 'Compute optimized' },
  { slug: 's-2vcpu-4gb',  vcpus: 2, memory: 4,  price: 0.03571, category: 'General purpose' },
  { slug: 'g-2vcpu-8gb',  vcpus: 2, memory: 8,  price: 0.08929, category: 'General purpose' },
  { slug: 'm-2vcpu-16gb', vcpus: 2, memory: 16, price: 0.11905, category: 'Memory optimized' },
  { slug: 'c-2vcpu-4gb',  vcpus: 2, memory: 4,  price: 0.05952, category: 'Compute optimized' },
  // GPU Droplets (Paperspace core)
  { slug: 'gpu-a4000',    vcpus: 8, memory: 45, price: 0.76,    category: 'GPU instance', gpuCount: 1 },
  { slug: 'gpu-a100-80gb',vcpus: 8, memory: 90, price: 2.76,    category: 'GPU instance', gpuCount: 1 },
  { slug: 'gpu-h100-80gb',vcpus: 16,memory: 120,price: 4.86,    category: 'GPU instance', gpuCount: 1 },
];
