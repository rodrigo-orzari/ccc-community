import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Status',
  description:
    'Live status and data freshness for Compare Cloud Costs — pricing pipeline health, last refresh times, and provider coverage.',
  alternates: { canonical: '/status' },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
