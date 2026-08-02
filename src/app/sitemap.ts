import { MetadataRoute } from 'next';

const baseUrl = 'https://comparecloudcosts.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${baseUrl}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/methodology`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/status`, lastModified, changeFrequency: 'daily', priority: 0.4 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
