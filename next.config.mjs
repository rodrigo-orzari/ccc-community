/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // 2026-07-30: renamed to /compliance to free up /certifications for a
      // future dedicated certifications page (tiered/categorized, distinct
      // from this provider-holds-what-standard matrix). permanent: true sends
      // a 308 so search engines transfer this page's existing ranking instead
      // of treating it as a new/removed URL. Remove this entry once a real
      // page is built at /certifications.
      {
        source: '/certifications',
        destination: '/compliance',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
