'use client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Footer, Sidebar, CopyHeading } from '@/components';

const headingToId = (children: React.ReactNode): string => {
  const collect = (node: any): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(collect).join('');
    if (node?.props?.children) return collect(node.props.children);
    return '';
  };
  return collect(children).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
};

const TermsOfUsePage: React.FC = () => {
  const content = `
## Agreement to Terms

By accessing and using comparecloudcosts.com, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.

[↑ Go back to the top](#terms-of-use)

## Use License

Permission is granted to temporarily download one copy of the materials (information or software) on comparecloudcosts.com for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:

- Modify or copy the materials
- Use the materials for any commercial purpose or for any public display
- Attempt to reverse engineer, disassemble, or decompile any software contained on the site
- Remove any copyright or other proprietary notations from the materials
- Transfer the materials to another person or "mirror" the materials on any other server

[↑ Go back to the top](#terms-of-use)

## No Endorsement or Affiliation

comparecloudcosts.com is independently operated and is **not affiliated with, endorsed by, or sponsored by** AWS, Microsoft Azure, Google Cloud, Oracle Cloud, DigitalOcean, Alibaba Cloud, or any other provider referenced on this site. All product names, logos, and brands are property of their respective owners and are used solely for identification purposes, in accordance with nominative fair use. We do not favor, promote, or receive preferential treatment from any cloud provider in exchange for how their pricing is presented; paid sponsorships, where present, are clearly labeled and never influence pricing data or rankings.

[↑ Go back to the top](#terms-of-use)

## Disclaimer

The materials on comparecloudcosts.com are provided on an 'as is' basis. comparecloudcosts.com makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.

[↑ Go back to the top](#terms-of-use)

## Limitations

In no event shall comparecloudcosts.com or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on comparecloudcosts.com, even if comparecloudcosts.com or an authorized representative has been notified orally or in writing of the possibility of such damage.

[↑ Go back to the top](#terms-of-use)

## Accuracy of Materials

The materials appearing on comparecloudcosts.com could include technical, typographical, or photographic errors. comparecloudcosts.com does not warrant that any of the materials on its website are accurate, complete, or current. comparecloudcosts.com may make changes to the materials contained on its website at any time without notice.

[↑ Go back to the top](#terms-of-use)

## Links

comparecloudcosts.com has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by comparecloudcosts.com of the site. Use of any such linked website is at the user's own risk.

[↑ Go back to the top](#terms-of-use)

## Modifications

comparecloudcosts.com may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.

[↑ Go back to the top](#terms-of-use)

## Governing Law

These terms and conditions are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.

[↑ Go back to the top](#terms-of-use)

## Pricing Disclaimer

### Directional and Sample Data Only

CCC functions as an aggregator of publicly available information, designed to provide a **directional indicator** of cloud costs rather than official pricing quotes. For providers with flexible pricing models (such as custom CPU/RAM configurations), our data represents a curated **sample** of popular instances to enable apples-to-apples comparisons. CCC is a planning and comparison tool, not a FinOps or cloud cost management platform, and is not intended to replace tools that connect to your actual cloud accounts and billing data.

We refresh pricing data automatically on a weekly basis, with manual updates when a live fetch fails. Even so, cloud providers update their pricing, introduce new instances, and offer private negotiated discounts that are not reflected here.

### Comprehensive Coverage & Missing Services

This application is not meant to be a comprehensive catalog of all offerings across all cloud providers. We consolidate data in good faith based on publicly available pricing pages and APIs, but we may inadvertently omit certain services, instance types, or product categories that cloud providers currently offer. If you represent a cloud provider or are a user who detects that a specific service or offering is missing or misrepresented, we welcome your feedback. Please reach out to us so we can continuously improve the accuracy and completeness of our platform.

### Visualizations and Charts

The application provides graphical tools, including in-table micro-visualizations and analytical charts (e.g., bar charts and scatter plots), to assist with visual trend analysis. These visualizations are strictly relative indicators calculated dynamically based on your active filters. They do not represent exact financial projections or guaranteed performance ratios. Because the scales (such as maximum price width) constantly shift depending on the selected dataset, you should not rely on visual lengths or chart placements as absolute indicators of value.

### Data Normalization

To provide a seamless comparison experience across entirely different cloud architectures, CCC normalizes proprietary billing metrics into standard equivalents. For example, in the Data & Analytics category, we map 100 Azure Synapse DWUs (Data Warehouse Units) or 100 Google BigQuery Slots to equal 1 standard "Compute Unit" (equivalent to 1 Databricks DBU or 1 Snowflake Credit). We also normalize AI Context Windows, Serverless executions, Networking throughputs (Port Capacities), and Database deployments. Similar approximations are applied across all categories.

This abstraction means the data you see is an approximation designed to match "like for like" compute power. Actual performance and cost ratios will vary significantly depending on your specific workload.

### Workloads Catalog and Architecture Calculator

The Workloads section provides conceptual architectures and multi-cloud deployment benchmarks to illustrate common industry patterns (e.g., Microservices, AI RAG Pipelines, Serverless Web Apps). These pre-configured workloads and architectural blueprints represent general industry best practices across cloud providers and **do not constitute architectural guarantees, formal SLAs, engineering advice, or binding technical specifications**. Real-world deployment costs and performance will vary significantly based on your specific traffic patterns, unlisted service dependencies, storage I/O, security configurations, regional availability, and custom architectural variations. Users are responsible for evaluating and validating their own deployment architectures.

### Bring Your Estimate & Match Confidence Ratings

The Bring Your Estimate feature allows users to upload cost estimates exported from provider pricing calculators (Excel or CSV) or vendor-supplied quotes for automated cross-cloud comparison. **All resource extraction, specification parsing, and cross-cloud matching serve strictly as directional indicators drawn from public pricing APIs and provider pricing pages.** comparecloudcosts.com makes **no guarantees, warranties, or representations regarding match accuracy, line-item completeness, or achievable savings.**

Each matched line item carries a confidence rating — **Exact**, **Close**, **Approximate**, or **Low confidence** — and these ratings are material to interpreting any figure shown:

- **Low confidence** results are produced by relaxing a parameter you specified, most commonly by pricing the workload in a different geographic region than the one on your estimate, or by substituting the nearest comparable service where no direct equivalent exists. Regional price variation between hubs is real and unbounded by us. These figures are indicative only and must not be treated as quotes.
- **Approximate** results reflect meaningful architectural differences between the compared services. Equivalent specifications do not imply equivalent performance, availability characteristics, or operational behavior.

Line items with no cross-cloud equivalent — including support plans, provider-specific licensing, and proprietary managed services — are excluded from comparison totals and reported separately. **Comparison totals therefore reflect only the subset of your estimate that could be matched, and will not equal your full estimate total.** Where a provider matches only part of your estimate, any savings figure shown is calculated solely against the line items that provider matched.

Results do not account for custom enterprise discount agreements (e.g., AWS EDP, Azure EA), private negotiated pricing, reserved or committed-use discounts, unlisted egress or tax surcharges, or contractual minimum commitments. Uploaded estimate files are processed ephemerally in memory without long-term raw data persistence. You must independently verify all cost comparisons with official provider pricing calculators and account representatives before making any migration or purchasing decisions.

The feature is provided during a preview period, without charge and without any service-level commitment. Matching logic, confidence thresholds, and regional coverage are actively being calibrated and may change without notice.

### Bring Your Bill & Invoice Cross-Matching

The Bring Your Bill feature allows users to upload cloud invoices (PDF, CSV, JSON) from providers such as AWS, Azure, Google Cloud, DigitalOcean, and Oracle Cloud for automated cross-cloud comparison. **All bill analysis, SKU extraction, resource normalization, and cross-cloud pricing matches serve strictly as directional indicators and approximations drawn from public pricing APIs and provider pricing pages.** comparecloudcosts.com makes **no guarantees, warranties, or representations regarding price matching accuracy, line-item completeness, or financial savings.** Results do not account for custom enterprise discount agreements (e.g., AWS EDP, Azure EA), private negotiated pricing, unlisted egress/tax surcharges, or contractual minimum commitments. Uploaded billing documents are processed ephemerally in memory without long-term raw data persistence. You must independently verify all cost comparisons with official provider pricing calculators and account representatives before making any migration or purchasing decisions.

### Exported Data & Reports

The site allows users to export comparison data (for example, pricing tables and workload comparisons) as CSV files. **Exported files are point-in-time snapshots.** They reflect the data available at the moment of export and are not updated afterwards; cloud providers change pricing frequently, so an exported file becomes outdated without notice and without any indication within the file itself beyond its generation timestamp.

Every export includes a disclaimer footer restating that the figures are directional estimates drawn from public list pricing, that they exclude negotiated discounts, reserved and committed-use pricing, taxes and egress, and that they are not quotes. **This footer must not be removed, altered, or separated from the data when an exported file is shared, forwarded, or incorporated into another document.** Exported figures presented without it lack the context required to interpret them correctly.

Exported data remains subject to the same limitations as the site itself, including the Pricing Disclaimer above. comparecloudcosts.com makes **no guarantees regarding the accuracy, completeness, or continued validity of exported data**, and accepts no liability for decisions made on the basis of exported files — particularly where those files are stale, partial, or have been separated from their accompanying disclaimers. Verify all figures against each provider's official pricing calculator before relying on them.

### Infrastructure & Datacenter Data

The Datacenters page provides reference information about cloud provider infrastructure — including region counts, Availability Zone counts, edge locations, countries served, and government cloud regions — sourced from each provider's publicly available documentation.

This data is **static, manually curated, and periodically verified**. It is not fetched in real time and may lag behind provider announcements. Specifically:

- **Announced / Planned regions** are regions the provider has publicly committed to but that are not yet generally available. They are presented for informational purposes and do not represent current service availability.
- **Edge location counts** are approximate. Providers use inconsistent terminology and update these numbers frequently.
- **Region coordinates** shown on the world map are approximate geographic indicators, not precise geolocation data.
- **Government cloud regions** may have restricted access that is not reflected in the counts shown.

comparecloudcosts.com makes no representation that the infrastructure data shown is current, complete, or suitable for compliance, architecture, or procurement decisions. Always verify current infrastructure availability directly with the cloud provider before making any architectural, regulatory, or business decisions.

[↑ Go back to the top](#terms-of-use)

### Voluntary Donations

This project accepts voluntary donations to help cover infrastructure and API costs. All donations are processed by third-party payment providers (e.g., Intuit). Donations are non-refundable, strictly voluntary, and do not constitute a purchase of services, nor do they guarantee future uptime, feature development, or service availability of the comparecloudcosts.com platform.

### Official Pricing Calculators

Because CCC is not the primary source of truth for final billing, you must **always** rely on official provider pricing calculators and your own specific purchase agreements for final financial decisions. 

Please refer directly to the official tools for exact quotes:
- **AWS:** [AWS Pricing Calculator](https://calculator.aws/)
- **Microsoft Azure:** [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
- **Google Cloud:** [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)
- **Oracle Cloud:** [Oracle Cloud Cost Estimator](https://www.oracle.com/cloud/costestimator.html)
- **DigitalOcean:** [DigitalOcean Pricing](https://www.digitalocean.com/pricing)
- **Alibaba Cloud:** [Alibaba Cloud Pricing Calculator](https://www.alibabacloud.com/pricing-calculator)
- **OpenAI:** [OpenAI API Pricing](https://openai.com/api/pricing/)
- **Anthropic:** [Anthropic Pricing](https://www.anthropic.com/pricing)
- **Pinecone:** [Pinecone Pricing](https://www.pinecone.io/pricing/)
- **Milvus (Zilliz):** [Zilliz Cloud Pricing](https://zilliz.com/pricing)
- **Qdrant:** [Qdrant Pricing](https://qdrant.tech/pricing/)
- **Weaviate:** [Weaviate Pricing](https://weaviate.io/pricing)
- **Chroma:** [Chroma Pricing](https://www.trychroma.com/pricing)
- **Cloudflare:** [Cloudflare Pricing](https://www.cloudflare.com/plans/)

### No warranties or liability

The pricing data on this platform is provided "as-is" for informational and comparative purposes only. comparecloudcosts.com, along with any of our featured sponsors or advertisers, makes no warranties or guarantees regarding the accuracy, completeness, or fitness for any particular purpose of the data presented. Neither comparecloudcosts.com nor any of its sponsors shall be held responsible or liable for any discrepancies, pricing changes, or financial consequences resulting from the use of this information. Users should independently verify all pricing directly with the official cloud providers before making any purchasing decisions.

[↑ Go back to the top](#terms-of-use)

## Contact

For questions about these Terms of Use, please email us at [hello@comparecloudcosts.com](mailto:hello@comparecloudcosts.com).

[↑ Go back to the top](#terms-of-use)
`;

  return (
    <>
      <style>
        {`
          :root {
            /* White, matching /docs — the long-form content pages should share
               one page background. #f7f8ff reads as a faint blue tint next to
               the white Docs page. Only used for .terms-wrapper below. */
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

          .terms-wrapper {
            display: flex;
            height: 100vh;
            min-height: 100dvh;
            max-height: 100vh;
            overflow: hidden;
            background-color: var(--bg-color);
          }
          @media (max-width: 1024px) {
            .terms-wrapper {
              height: auto;
              max-height: none;
              overflow: visible;
            }
          }

          .terms-topnav {
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
            color: var(--text-color);
          }

          .prose h2, .prose h3 {
            color: var(--text-color);
            margin-top: 1.5rem;
            margin-bottom: 1rem;
          }

          .prose hr {
            border: 0;
            border-top: 1px solid var(--divider-color);
            margin: 3rem 0;
          }

          .prose a {
            color: var(--link-color);
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 500;
          }

          .prose blockquote {
            border-left: 4px solid #f59e0b;
            background-color: #fffbeb;
            padding: 1rem 1.25rem;
            margin: 1.5rem 0;
            border-radius: 0 0.375rem 0.375rem 0;
          }

          .dark .prose blockquote {
              background-color: #1c1a0f;
            }

          .terms-wrapper footer {
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

      <div className="terms-wrapper flex flex-col lg:flex-row h-screen min-h-[100dvh] lg:h-screen lg:overflow-hidden">
        <Sidebar activeProductType={"" as any} />
        <aside className="sidebar">

          <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1, margin: 0, marginBottom: '1rem' }}>
            Content
          </h4>
          <nav>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <li><a href="#agreement-to-terms" style={{ padding: '3px 0' }}>Agreement to Terms</a></li>
              <li><a href="#no-endorsement-or-affiliation" style={{ padding: '3px 0' }}>No Endorsement or Affiliation</a></li>
              <li><a href="#use-license" style={{ padding: '3px 0' }}>Use License</a></li>
              <li><a href="#disclaimer" style={{ padding: '3px 0' }}>Disclaimer</a></li>
              <li><a href="#limitations" style={{ padding: '3px 0' }}>Limitations</a></li>
              <li><a href="#accuracy-of-materials" style={{ padding: '3px 0' }}>Accuracy of Materials</a></li>
              <li><a href="#modifications" style={{ padding: '3px 0' }}>Modifications</a></li>
              <li><a href="#governing-law" style={{ padding: '3px 0' }}>Governing Law</a></li>
              <li>
                <a href="#pricing-disclaimer" style={{ padding: '3px 0' }}>Pricing Disclaimer</a>
                <ul style={{ listStyle: 'none', paddingLeft: '0.875rem', margin: '2px 0', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <li><a href="#directional-and-sample-data-only" style={{ fontSize: '0.8125rem', padding: '2px 0' }}>Directional data only</a></li>
                  <li><a href="#visualizations-and-charts" style={{ fontSize: '0.8125rem', padding: '2px 0' }}>Visualizations and charts</a></li>
                  <li><a href="#data-normalization" style={{ fontSize: '0.8125rem', padding: '2px 0' }}>Data normalization</a></li>
                  <li><a href="#workloads-catalog-and-architecture-calculator" style={{ fontSize: '0.8125rem', padding: '2px 0' }}>Workloads catalog</a></li>
                  <li><a href="#infrastructure--datacenter-data" style={{ fontSize: '0.8125rem', padding: '2px 0' }}>Datacenter data</a></li>
                  <li><a href="#voluntary-donations" style={{ fontSize: '0.8125rem', padding: '2px 0' }}>Voluntary donations</a></li>
                  <li><a href="#official-pricing-calculators" style={{ fontSize: '0.8125rem', padding: '2px 0' }}>Official calculators</a></li>
                  <li><a href="#no-warranties-or-liability" style={{ fontSize: '0.8125rem', padding: '2px 0' }}>No liability</a></li>
                </ul>
              </li>
              <li><a href="#contact" style={{ padding: '3px 0' }}>Contact</a></li>
            </ul>
          </nav>
        </aside>

        <div className="flex-1 min-w-0 overflow-y-auto flex flex-col h-full" id="terms-of-use">
        <main className="main-content">
          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
            Terms of Use
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', marginBottom: '2.5rem' }}>Last updated: 17 June 2026.</p>
          <div className="prose prose-slate dark:prose-invert max-w-none text-black dark:text-white">
            <ReactMarkdown
              components={{
                h2: ({ children }) => <CopyHeading id={headingToId(children)} as="h2">{children}</CopyHeading>,
                h3: ({ children }) => <CopyHeading id={headingToId(children)} as="h3">{children}</CopyHeading>,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </main>
      <Footer />
      </div>
      </div>
    </>
  );
};

export default TermsOfUsePage;
