export const ALIBABA_CONTAINERS_REGION = 'ap-southeast-1';
export const ALIBABA_CONTAINERS_GEOGRAPHY = 'Asia Pacific';

export const ALIBABA_CONTAINERS = [
  {
    type: 'ACK Serverless (vCPU)',
    vcpus: 1,
    memory: 0,
    cpuVendor: 'Intel',
    price: 0.046, // Hourly per vCPU
    unit: 'Hourly',
    attributes: {
      compute_type: 'Serverless',
      architecture: 'x86',
      billing_granularity: 'Second',
    }
  },
  {
    type: 'ACK Serverless (Memory)',
    vcpus: 0,
    memory: 1,
    cpuVendor: 'Intel',
    price: 0.005, // Hourly per GB
    unit: 'Hourly',
    attributes: {
      compute_type: 'Serverless',
      architecture: 'x86',
      billing_granularity: 'Second',
    }
  }
];
