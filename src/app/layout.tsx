import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Providers from './providers';

import { DigitalOceanReferralModal } from '@/components';

export const metadata: Metadata = {
  metadataBase: new URL('https://comparecloudcosts.com'),
  title: {
    // Naming the six IaaS providers implied the list was complete; the catalogue
    // covers 14 (six hyperscalers plus OpenAI, Anthropic, Cloudflare and five
    // vector-database vendors). "& 11 More" keeps the high-volume keywords
    // (AWS/Azure/GCP pricing) without overstating coverage. Length matters here:
    // the previous title ran 69 chars and Google truncates SERP titles near 60.
    default: 'Compare Cloud Costs - AWS, Azure, GCP & 11 More Providers',
    template: '%s | Compare Cloud Costs',
  },
  description: 'Compare pricing across AWS, Azure, Google Cloud, Oracle, DigitalOcean, Alibaba Cloud, and Cloudflare. AI models, vector databases, compute, storage, and networking—all normalized side-by-side.',
  keywords: [
    'Cloud Computing',
    'AWS Pricing',
    'Azure Pricing',
    'Google Cloud Pricing',
    'AWS vs Azure vs GCP',
    'Cloud Pricing Calculator',
    'Oracle Cloud Pricing',
    'DigitalOcean Pricing',
    'Alibaba Cloud Pricing',
    'Cloud Cost Comparison',
    'FinOps',
    'Cloud Databases',
    'Serverless Pricing',
    'Multi-Cloud TCO',
    'AI Model Pricing',
    'Vector Database Pricing',
  ],
  alternates: {
    canonical: '/',
  },
  authors: [{ name: 'Compare Cloud Costs' }],
  creator: 'Compare Cloud Costs',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://comparecloudcosts.com',
    title: 'Compare Cloud Costs - AWS, Azure, GCP & 11 More Providers',
    description: 'Side-by-side cloud pricing comparison: AWS vs Azure vs GCP vs Oracle vs DigitalOcean vs Alibaba. Compute, databases, serverless, storage, networking, AI, and more.',
    siteName: 'Compare Cloud Costs',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Compare Cloud Costs Dashboard Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compare Cloud Costs Across 14 Providers',
    description: 'AWS vs Azure vs Google Cloud vs Oracle vs DigitalOcean—instantly compare pricing for compute, databases, serverless, storage, and more.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://comparecloudcosts.com/#organization',
        name: 'Compare Cloud Costs',
        url: 'https://comparecloudcosts.com',
        logo: 'https://comparecloudcosts.com/logo.png',
        description:
          'Compare compute, database, and serverless pricing across AWS, Azure, Google Cloud, Oracle, DigitalOcean, and Alibaba Cloud.',
        email: 'hello@comparecloudcosts.com',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://comparecloudcosts.com/#website',
        url: 'https://comparecloudcosts.com',
        name: 'Compare Cloud Costs',
        publisher: { '@id': 'https://comparecloudcosts.com/#organization' },
        description:
          'Instantly compare compute, database, and serverless pricing across major cloud providers.',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://comparecloudcosts.com/#application',
        name: 'Compare Cloud Costs Calculator',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
        url: 'https://comparecloudcosts.com',
        description:
          'Multi-cloud cost comparison engine and pricing calculator for AWS, Azure, Google Cloud, Oracle, DigitalOcean, Alibaba Cloud, and Cloudflare.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script id="clarity-script" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "x5qbwzlke6");
          `}
        </Script>
      </head>
      <body className="bg-white dark:bg-[#000000] text-[#171717] dark:text-[#e5e7eb] min-h-screen">
        <Providers>
          {children}
          <DigitalOceanReferralModal />
        </Providers>
      </body>
    </html>
  );
}
