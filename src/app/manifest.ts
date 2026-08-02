import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Compare Cloud Costs',
    short_name: 'Compare Cloud Costs',
    description: 'Compare compute, database, and serverless pricing across AWS, Azure, Google Cloud, Oracle, DigitalOcean, and Alibaba Cloud.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
