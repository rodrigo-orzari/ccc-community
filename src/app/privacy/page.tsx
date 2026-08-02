'use client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Footer, Sidebar, CopyHeading } from '@/components';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <>
      <style>{`
        :root {
          /* White, matching /docs and /terms — see note in terms/page.tsx.
             Only used for .privacy-wrapper below. */
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
        .privacy-wrapper {
          display: flex;
          height: 100vh;
          min-height: 100dvh;
          max-height: 100vh;
          overflow: hidden;
          background-color: var(--bg-color);
        }
        @media (max-width: 1024px) {
          .privacy-wrapper {
            height: auto;
            max-height: none;
            overflow: visible;
          }
        }
        .privacy-topnav {
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
        .privacy-sidebar {
          width: 280px;
          border-right: 1px solid var(--border-color);
          padding: 2rem 1.5rem;
          height: 100%;
          overflow-y: auto;
          background-color: var(--sidebar-bg);
          flex-shrink: 0;
        }
        .privacy-sidebar a {
          color: var(--text-color);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color 0.15s;
          display: block;
        }
        .privacy-sidebar a:hover { color: var(--link-color); }
        .privacy-main {
          flex: 1;
          padding: 3rem 4rem 5rem;
          max-width: 1200px;
          line-height: 1.7;
          font-size: 0.9375rem;
          color: var(--text-color);
        }
        .privacy-main h1 {
          font-size: 2.25rem;
          font-weight: 800;
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }
        .privacy-main h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 2.5rem 0 0.75rem;
          letter-spacing: -0.01em;
          scroll-margin-top: 2rem;
        }
        .privacy-main h3 {
          font-size: 1rem;
          font-weight: 700;
          margin: 1.5rem 0 0.5rem;
          scroll-margin-top: 2rem;
        }
        .privacy-main p { margin: 0 0 1rem; }
        .privacy-main ul { margin: 0 0 1rem; padding-left: 1.5rem; }
        .privacy-main li { margin-bottom: 0.25rem; }
        .privacy-main a { color: var(--link-color); text-decoration: none; }
        .privacy-main a:hover { text-decoration: underline; }
        .privacy-main strong { font-weight: 700; }
        .privacy-main hr {
          border: 0;
          border-top: 1px solid var(--divider-color);
          margin: 2.5rem 0;
        }
        .privacy-meta {
          font-size: 0.8125rem;
          color: var(--muted-text);
          margin-bottom: 2.5rem;
        }
        .privacy-wrapper footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
        }
        @media (max-width: 768px) {
          .privacy-sidebar { display: none; }
          .privacy-main { margin-left: 0; padding: 2rem 1.25rem 5rem; }
        }
      `}</style>

      <div className="privacy-wrapper flex flex-col lg:flex-row h-screen min-h-[100dvh] lg:h-screen lg:overflow-hidden">
        <Sidebar activeProductType={"" as any} />
        {/* Sidebar */}
        <aside className="privacy-sidebar">

            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1, margin: 0, marginBottom: '1rem' }}>
              Content
            </div>
            <nav>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <li><a href="#overview" style={{ padding: '3px 0' }}>Overview</a></li>
                <li><a href="#data-retention" style={{ padding: '3px 0' }}>Data Retention &amp; Ephemeral Processing</a></li>
                <li><a href="#information-we-collect" style={{ padding: '3px 0' }}>Information We Collect</a></li>
                <li><a href="#authentication-security" style={{ padding: '3px 0' }}>Authentication &amp; User Accounts</a></li>
                <li><a href="#how-we-use-your-information" style={{ padding: '3px 0' }}>How We Use It</a></li>
                <li><a href="#data-sharing-and-disclosure" style={{ padding: '3px 0' }}>Data Sharing</a></li>
                <li><a href="#data-security" style={{ padding: '3px 0' }}>Data Security</a></li>
                <li><a href="#third-party-services" style={{ padding: '3px 0' }}>Third-Party Services</a></li>
                <li><a href="#advertising" style={{ padding: '3px 0' }}>Advertising</a></li>
                <li><a href="#contact-us" style={{ padding: '3px 0' }}>Contact Us</a></li>
              </ul>
            </nav>
          </aside>

        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col h-full" id="privacy-policy">
          {/* Main content */}
          <main className="privacy-main">
            <h1>Privacy Policy</h1>
            <p className="privacy-meta">Last updated: July 22, 2026.</p>

            <CopyHeading id="overview">Overview</CopyHeading>
            <p>
              comparecloudcosts.com ("we," "us," "our," or "Company") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and otherwise handle your information
              when you use our website and services.
            </p>
            <p>
              We are an independent service, not affiliated with, endorsed by, or sponsored by any cloud provider
              covered on this site. See our <a href="/terms#no-endorsement-or-affiliation">Terms of Use</a> for
              the full statement.
            </p>

            <CopyHeading id="data-retention">Data Retention &amp; Ephemeral Processing Policy</CopyHeading>
            <p>
              comparecloudcosts.com is strictly engineered around the <strong>Data Minimization Principle</strong>. Our systems are built to process and retain only the absolute minimum amount of information required to perform your requested comparative actions.
            </p>
            <p>
              For features involving document parsing, estimate analysis, or bill analysis (such as the <em>Bring Your Estimate</em> and <em>Bring Your Bill</em> tools), uploaded files (including Excel and CSV calculator exports, PDF invoices and quotes, and JSON cost exports) are parsed ephemerally in volatile memory. <strong>We do not retain raw estimate or invoice documents, nor persistent financial records. All temporary processing files, session buffers, and cached document states are automatically purged and permanently deleted in less than 4 hours of usage.</strong>
            </p>
            <p>
              Uploaded estimate and invoice files are held in server memory only for the duration of the request that processes them. They are never written to disk, never committed to a database, and are discarded when the response is returned. The comparison results you see are generated in that same request; we do not store the results either. Closing or refreshing the page discards them.
            </p>

            <CopyHeading id="information-we-collect">Information We Collect</CopyHeading>
            <h3>Usage Data</h3>
            <p>When you use comparecloudcosts.com, we automatically collect certain information about your interactions:</p>
            <ul>
              <li>Pages visited and time spent on each page</li>
              <li>Filters and search parameters you use when comparing cloud pricing</li>
              <li>Device information (browser type, operating system)</li>
              <li>IP address (anonymized for analytics purposes)</li>
              <li>Referral source</li>
            </ul>
            <h3>Information You Provide</h3>
            <p>
              Basic browsing of our public pricing tables does not require creating an account or submitting personal information. Any information you voluntarily provide (such as through contact forms, feedback emails, or document uploads) is handled according to our strict data minimization standards.
            </p>

            <CopyHeading id="authentication-security">Authentication &amp; User Account Security</CopyHeading>
            <p>
              To enhance information security, protect user data privacy, and maintain operational integrity across advanced tools (such as bill analysis exports or multi-user workspace features), we may require users to authenticate or log in.
            </p>
            <p>
              Requiring user authentication serves specifically to <strong>safeguard your information against unauthorized access</strong>, protect uploaded session data, isolate report outputs to authorized account holders, prevent automated platform abuse, and ensure strict end-to-end security control over your environment.
            </p>

            <CopyHeading id="how-we-use-your-information">How We Use Your Information</CopyHeading>
            <p>We use collected information to:</p>
            <ul>
              <li>Improve and optimize our pricing data and user experience</li>
              <li>Understand how users interact with our platform</li>
              <li>Debug and troubleshoot technical issues</li>
              <li>Generate aggregated analytics (never identifying individuals)</li>
            </ul>

            <CopyHeading id="data-sharing-and-disclosure">Data Sharing and Disclosure</CopyHeading>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share
              aggregated, anonymized data with partners to improve our services, but this data cannot identify you.
            </p>
            <p>We may disclose information when required by law, regulation, or legitimate legal process.</p>

            <CopyHeading id="data-security">Data Security</CopyHeading>
            <p>
              We enforce strict technical and organizational safeguards to protect information from unauthorized access, alteration, disclosure, or destruction. All temporary files are automatically destroyed within 4 hours, and all transmitted data is encrypted using standard TLS protocols.
            </p>

            <CopyHeading id="third-party-services">Third-Party Services</CopyHeading>
            <p>Our platform uses the following services:</p>
            <ul>
              <li><strong>Cloud Providers</strong>: AWS, Azure, Google Cloud, Oracle Cloud APIs (for pricing data only)</li>
              <li><strong>Payment Processing</strong>: We use third-party payment processors (e.g., Intuit) for voluntary donations. We do not store or process your credit card information directly.</li>
              <li><strong>Analytics</strong>: Basic analytics to understand usage patterns</li>
            </ul>
            <p>These services have their own privacy policies, and we encourage you to review them.</p>

            <CopyHeading id="advertising">Advertising</CopyHeading>
            <p>
              We partner with Microsoft Clarity and Microsoft Advertising to capture how you use and interact with our website through behavioral metrics, heatmaps, and session replay to improve and market our products/services. Website usage data is captured using first and third-party cookies and other tracking technologies to determine the popularity of products/services and online activity. Additionally, we use this information for site optimization, fraud/security purposes, and advertising. For more information about how Microsoft collects and uses your data, visit the <a href="https://www.microsoft.com/privacy/privacystatement" target="_blank" rel="noopener noreferrer">Microsoft Privacy Statement</a>.
            </p>
            <p>
              We also encourage and allow companies to sponsor our website to help maintain and pay for our infrastructure costs.
              Please be aware that these sponsors may provide their own links which contain tracking capabilities (such as Bitly or custom UTM parameters)
              to measure their click-through rates. We do not track these metrics on their behalf, and we have no relation to or responsibility for
              the tracking mechanisms used by third-party sponsors when you click on their advertisements.
            </p>

            <CopyHeading id="changes">Changes to This Policy</CopyHeading>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes
              by updating the "Last updated" date above.
            </p>

            <CopyHeading id="contact-us">Contact Us</CopyHeading>
            <p>
              For questions about this Privacy Policy or our privacy practices, please email us at{' '}
              <a href="mailto:hello@comparecloudcosts.com">hello@comparecloudcosts.com</a>.
            </p>

            <hr />
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)' }}>
              <a href="/terms">Terms of Use</a>
              {' · '}
              <a href="/about">About Us</a>
              {' · '}
              <a href="mailto:hello@comparecloudcosts.com">Contact Us</a>
              {' · '}
              Compare Cloud Costs is operated by Co-Sell Plus LLC. © 2026 Co-Sell Plus LLC. All rights reserved.
            </p>
          </main>

        <Footer />
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;
