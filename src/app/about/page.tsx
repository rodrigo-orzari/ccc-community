'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Footer, Sidebar } from "@/components";

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const BackToTop = () => (
  <p style={{ marginTop: '1.5rem' }}>
    <a
      href="#top"
      style={{ color: 'var(--link-color)', fontSize: '0.875rem', textDecoration: 'none' }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
    >
      ↑ Go back to the top
    </a>
  </p>
);

// Section heading with a click-to-copy deep link to that section.
const CopyHeading: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const [copied, setCopied] = React.useState(false);
  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    const done = () => {
      setCopied(true);
      window.history.replaceState(null, '', `#${id}`);
      setTimeout(() => setCopied(false), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(done);
    } else {
      done();
    }
  };
  return (
    <h2 id={id} className="docs-h2">
      {children}
      <button
        type="button"
        onClick={copyLink}
        className={`docs-h2-anchor${copied ? ' copied' : ''}`}
        aria-label={`Copy link to the ${typeof children === 'string' ? children : 'section'} section`}
        title="Copy link to this section"
      >
        {copied ? '✓ Copied' : '🔗 Copy link'}
      </button>
    </h2>
  );
};

const AboutPage: React.FC = () => {
  return (
    <>
      <style>
        {`
          :root {
            /* White, matching /docs and /terms — see note in terms/page.tsx.
               Only used for .about-wrapper below. */
            --bg-color: #ffffff;
            --text-color: #1a1a1a;
            --sidebar-bg: #eef0fc;
            --border-color: #dde0f0;
            --link-color: #2563eb;
            --muted-text: #6b7280;
            --divider-color: #dde0f0;
          }

          .dark {
              --bg-color: #06060f;
              --text-color: #f1f5f9;
              --sidebar-bg: #0c0c1e;
              --border-color: #1e1e38;
              --link-color: #818cf8;
              --muted-text: #94a3b8;
              --divider-color: #1e1e38;
            }

          .about-wrapper {
            display: flex;
            height: 100vh;
            min-height: 100dvh;
            max-height: 100vh;
            overflow: hidden;
            background-color: var(--bg-color);
          }
          @media (max-width: 1024px) {
            .about-wrapper {
              height: auto;
              max-height: none;
              overflow: visible;
            }
          }

          .about-topnav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1.5rem;
            height: 44px;
            border-bottom: 1px solid var(--border-color);
            background-color: var(--sidebar-bg);
            position: sticky;
            top: 0;
            z-index: 50;
            flex-shrink: 0;
          }

          .sidebar {
            width: 280px;
            border-right: 1px solid var(--border-color);
            padding: 2rem 1.5rem;
            height: 100%;
            overflow-y: auto;
            background-color: var(--sidebar-bg);
            flex-shrink: 0;
          }

          .sidebar a {
            color: var(--text-color);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: color 0.2s;
            display: block;
          }

          .sidebar a:hover {
            color: var(--link-color);
          }

          .main-content {
            flex: 1;
            padding: 3rem 4rem 5rem;
            max-width: 1200px;
            line-height: 1.7;
          }

          .main-content h1 {
            font-size: 2.25rem;
            font-weight: 800;
            margin: 0 0 0.5rem;
            letter-spacing: -0.02em;
          }

          .prose h2 {
            color: var(--text-color);
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0 0 0.75rem;
            letter-spacing: -0.01em;
            scroll-margin-top: 2rem;
          }

          .prose h2.docs-h2 {
            display: flex;
            align-items: center;
            gap: 0.4rem;
          }

          .docs-h2-anchor {
            opacity: 0.3;
            background: none;
            border: none;
            cursor: pointer;
            color: var(--muted-text);
            font-size: 0.7rem;
            font-weight: 600;
            line-height: 1;
            padding: 3px 6px;
            border-radius: 4px;
            transition: opacity 0.15s, background 0.15s, color 0.15s;
            white-space: nowrap;
          }
          .docs-h2:hover .docs-h2-anchor { opacity: 0.75; }
          .docs-h2-anchor:hover { opacity: 1 !important; background: var(--border-color); color: var(--text-color); }
          .docs-h2-anchor.copied { opacity: 1 !important; color: #16a34a; }

          .prose h3 {
            color: var(--text-color);
            font-size: 1rem;
            font-weight: 700;
            margin: 1.5rem 0 0.5rem;
            scroll-margin-top: 2rem;
          }

          .prose p { margin: 0 0 1rem; color: var(--text-color); }
          .prose a { color: var(--link-color); text-decoration: none; }
          .prose a:hover { text-decoration: underline; }
          .prose strong { font-weight: 700; }

          .about-section {
            margin-bottom: 0;
            padding-top: 2.5rem;
            border-top: 1px solid var(--divider-color);
          }
          .about-section:first-of-type {
            border-top: none;
            padding-top: 0;
          }

          .prose blockquote {
            border-left: 4px solid #f59e0b;
            background-color: #fffbeb;
            padding: 1rem 1.25rem;
            margin: 1.5rem 0;
            border-radius: 0 0.375rem 0.375rem 0;
            font-size: 0.875rem;
          }

          .dark .prose blockquote {
              background-color: #1c1a0f;
            }

          .about-wrapper footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 100;
          }

          @media (max-width: 768px) {
            .sidebar { display: none; }
            .main-content { margin-left: 0; padding: 2rem 1.5rem 5rem; }
          }
        `}
      </style>

      <div className="about-wrapper flex-col lg:flex-row">
        <Sidebar activeProductType={'about' as any} />
          <aside className="sidebar">
            <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1, margin: 0, marginBottom: '1rem' }}>
              Content
            </h4>
            <nav>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <li><a href="#about-compare-cloud-costs-ccc" style={{ padding: '3px 0' }}>About CCC</a></li>
                <li><a href="#why-we-built-this" style={{ padding: '3px 0' }}>Why we built this</a></li>
                <li><a href="#key-capabilities" style={{ padding: '3px 0' }}>Key Capabilities</a></li>
                <li><a href="#who-is-ccc-for" style={{ padding: '3px 0' }}>Who is CCC for?</a></li>
                <li><a href="#about-the-creator" style={{ padding: '3px 0' }}>About the Creator</a></li>
              </ul>
            </nav>
          </aside>

        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col h-full" id="top">
          <main className="main-content">
            <h1>About Compare Cloud Costs</h1>
            <div className="prose max-w-none">

              {/* About CCC */}
              <div className="about-section">
                <CopyHeading id="about-compare-cloud-costs-ccc">About Compare Cloud Costs (CCC)</CopyHeading>
                <p>
                  Compare Cloud Costs (CCC) is a cloud pricing intelligence platform that makes comparing
                  infrastructure costs effortless. It tracks six general-purpose <strong>cloud platforms</strong> (AWS,
                  Microsoft Azure, Google Cloud, Oracle Cloud, DigitalOcean, and Alibaba Cloud), plus a set of
                  <strong> specialized providers</strong> (AI model vendors like OpenAI and Anthropic, vector databases,
                  and edge/security services like Cloudflare) that each cover a single category of service. Normalizing
                  and aggregating pricing across both groups lets teams compare providers side by side and make
                  data-driven architectural decisions before deployment. Compare Cloud Costs is a Co-Sell Plus LLC product.
                </p>
                <BackToTop />
              </div>

              {/* Why we built this */}
              <div className="about-section">
                <CopyHeading id="why-we-built-this">Why we built this</CopyHeading>
                <p>
                  Every cloud provider publishes its own calculator, and none of them talk to each other. If
                  you've tried building a cloud price comparison spreadsheet, you know how fast regional variance
                  and instance-tier differences turn it into a research project.
                </p>

                <h3 id="the-cloud-pricing-maze">The Cloud Pricing Maze</h3>
                <p>
                  Finding exact pricing for one provider is easy. Comparing several means navigating separate
                  calculators, rate cards, and service models that don't map cleanly onto each other, making an
                  "apples-to-apples" comparison nearly impossible without manual normalization. CCC solves this
                  with a unified comparison table covering VMs, database instances, and storage fees in one view.
                </p>
                <p>
                  Most FinOps tools look backward, telling you what you already spent instead of helping you
                  compare options before you deploy.
                </p>
                <p>
                  More teams run multi-cloud today, across providers chosen for performance, redundancy, or
                  contract reasons. Without a shared view during planning, it's easy to overpay without knowing
                  it. CCC brings that visibility to the design phase.
                </p>
                <p>
                  CCC is a starting point, not a replacement for a full FinOps practice. It's built on publicly
                  available pricing information, which makes it well suited for early comparison and planning,
                  not for the account-level visibility, anomaly detection, or negotiated-rate tracking that
                  dedicated cost management platforms provide once you're already running workloads at scale.
                  Think of CCC as where a cost conversation starts, not where a mature FinOps program ends.
                </p>
                <p>
                  CCC is <strong>independently operated and not affiliated with, endorsed by, or sponsored by</strong>{' '}
                  AWS, Microsoft Azure, Google Cloud, Oracle Cloud, DigitalOcean, Alibaba Cloud, or any other
                  provider on this site. Every provider is shown on equal footing, using the same methodology and
                  the same public sources. Where sponsorships exist, they're labeled and never influence the
                  pricing data itself.
                </p>
                <p>
                  We built CCC for the teams enterprise FinOps tooling wasn't built for: small and mid-sized
                  software vendors, consultancies, and managed service providers who need real cost visibility
                  but can't justify an expensive FinOps platform, and who don't want a "free" tool that quietly
                  locks them into one vendor's ecosystem. If you're an MSP or systems integrator, the same
                  independence works in your favor twice over — it's a way to serve clients better and to find
                  real optimization opportunities in their spend.
                </p>
                <BackToTop />
              </div>

              {/* Key Capabilities */}
              <div className="about-section">
                <CopyHeading id="key-capabilities">Key Capabilities</CopyHeading>
                <p>
                  Here's what Compare Cloud Costs does.
                </p>

                <h3 id="comprehensive-product-coverage">Comprehensive Product Coverage</h3>
                <p>
                  We track 11 product categories: virtual machines, containers, serverless, databases, data &amp;
                  analytics, networking, storage, security, app hosting, integration, and AI. Compare how a change
                  in one category shifts total cost across providers.
                </p>

                <h3 id="multi-cloud-analysis-at-scale">Multi-Cloud Analysis at Scale</h3>
                <p>
                  Compare identical configurations across all 15 providers we track — six general-purpose clouds
                  plus nine specialized providers — in one normalized view. Adjust specs, region, and commitment
                  options to see how cost shifts.
                </p>

                <h3 id="global-infrastructure-intelligence">Global Infrastructure Intelligence</h3>
                <p>
                  The <Link href="/datacenters">Datacenters</Link> page shows each provider's physical footprint —
                  regions, edge presence, redundancy, and government cloud options — separate from pricing, so you
                  can weigh cost and geography together.
                </p>

                <h3 id="frequently-updated-pricing">Frequently Updated Pricing</h3>
                <p>
                  Pricing refreshes weekly through a mix of live provider APIs and manually verified fallback
                  data. Every record is timestamped so you know when it was last checked. Coverage and freshness
                  are visible on the <Link href="/status">Status</Link> page.
                </p>

                <h3 id="granular-cost-breakdown">Granular Cost Breakdown</h3>
                <p>
                  Break a workload down into compute, storage, networking, and licensing. See how vCPU count,
                  memory, region, and commitment level each move the price.
                </p>

                <h3 id="proactive-workload-planning">Proactive Workload Planning</h3>
                <p>
                  Model a full architecture before you deploy it. Workload templates — a high-traffic web app, a
                  RAG knowledge base, a compliance-ready database, and more — show the combined cost of every
                  component, across providers, before you buy anything.
                </p>
                <BackToTop />
              </div>

              {/* Who is CCC for? */}
              <div className="about-section">
                <CopyHeading id="who-is-ccc-for">Who is CCC for?</CopyHeading>

                <h3 id="it-managers-and-ctos">IT Managers and CTOs</h3>
                <p>
                  IT leaders use CCC during architectural planning to estimate total cost of ownership for new
                  workloads. Apples-to-apples comparisons for compute, databases, and networking help them
                  justify budget requests, avoid vendor lock-in, and pick the most cost-effective provider.
                </p>

                <h3 id="cloud-provider-sales">Cloud Provider Sales</h3>
                <p>
                  Cloud sales teams use Compare Cloud Costs as an independent benchmark. A rep can show a prospect
                  exactly how their database or compute pricing compares to competitors, no spreadsheet required.
                </p>

                <h3 id="product-owners">Product Owners</h3>
                <p>
                  Product Owners use CCC to align roadmaps with infrastructure budgets, comparing the cost of
                  new features (e.g., an AI inference endpoint or a switch to NoSQL) to balance innovation with
                  operational profitability.
                </p>

                <h3 id="managed-service-providers-msps">Managed Service Providers (MSPs)</h3>
                <p>
                  MSPs managing infrastructure for multiple clients use CCC to design cost-effective environments.
                  Whether migrating a client to the cloud or optimizing an existing footprint, CCC lets MSPs
                  rapidly compare providers and present cost-optimized proposals.
                </p>

                <h3 id="consulting-companies-cloud-deployment-specialists">Consulting Companies (Cloud Deployment Specialists)</h3>
                <p>
                  Cloud consultants and architects use CCC during discovery and design to model multi-cloud
                  scenarios, give clients accurate directional estimates, and design architectures that balance
                  performance with budget.
                </p>
                <BackToTop />
              </div>

              {/* About the Creator */}
              <div className="about-section">
                <CopyHeading id="about-the-creator">About the Creator</CopyHeading>
                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <Image src="/rodrigo-orzari.png" alt="Rodrigo Orzari" width={120} height={120} />
                </div>
                <p>
                  Hi, I'm <strong>Rodrigo Orzari</strong>{' '}
                  <a
                    href="https://www.linkedin.com/in/rodrigoorzari/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Rodrigo Orzari on LinkedIn"
                    title="Connect with me on LinkedIn"
                    style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', color: 'var(--link-color)' }}
                  >
                    <LinkedInIcon />
                  </a>.
                </p>
                <p>
                  I built Compare Cloud Costs to get hands-on with modern tech stacks and AI, moving from
                  prototyping with AI tools to shipping a production application built on them. It's a Co-Sell
                  Plus LLC product.
                </p>
                <p>
                  The problem was specific: IT leaders, sales reps, and consultants were manually hunting down
                  prices across a dozen rate cards. Compare Cloud Costs does that normalization for them, turning
                  an apples-to-apples comparison into minutes instead of hours.
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted-text)' }}>
                  For notes on data accuracy, coverage, and official provider calculators, see{' '}
                  <Link href="/docs#accuracy">Pricing Data — Accuracy &amp; freshness</Link> in the docs.
                </p>
                <BackToTop />
              </div>

            </div>
          </main>
        <Footer />
        </div>
      </div>
    </>
  );
};

export default AboutPage;
