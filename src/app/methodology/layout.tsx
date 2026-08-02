import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Methodology',
  description: 'How Compare Cloud Costs collects, normalizes, and analyzes cloud pricing data.',
  alternates: { canonical: '/methodology' },
};

export default function MethodologyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
