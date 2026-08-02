// Known REAL product gaps — (provider, productType, category) combinations the
// provider genuinely does not sell, per the 2026-07-15 workload N/A audit.
//
// Purpose: the workload engine renders one "N/A" for two very different truths:
//   • "this provider has no such product"        → honest, keep saying so
//   • "we simply haven't ingested a matching row" → OUR gap, misrepresents them
// Entries here let the UI say "Not offered" for the first case, so a bare
// "N/A" now signals a data gap on our side worth fixing.
//
// Rules for adding: only list a combination after checking the provider's own
// product catalog — when in doubt, leave it out (a false "Not offered" is worse
// than a vague N/A). Remove the entry if the provider launches the product.

export interface NotOfferedEntry {
  productType: string;
  category?: string; // omit = the whole productType is not offered
}

export const NOT_OFFERED: Record<string, NotOfferedEntry[]> = {
  digitalocean: [
    // No workflow-orchestration product (no Step Functions / Logic Apps equivalent).
    { productType: 'integration', category: 'Workflow' },
    // No managed event-bus product (no EventBridge / Event Grid equivalent).
    { productType: 'integration', category: 'Eventing' },
    // No customer-facing key-management service.
    { productType: 'security', category: 'Identity & Encryption' },
  ],
  oracle: [
    // No direct Step Functions-style serverless workflow. (Oracle Integration
    // Cloud exists but is an iPaaS suite, not a comparable per-transition
    // orchestration primitive — revisit if OCI ships one.)
    { productType: 'integration', category: 'Workflow' },
  ],
};

export function isNotOffered(provider: string, productType: string, category?: string): boolean {
  return (NOT_OFFERED[provider] ?? []).some(
    (e) => e.productType === productType && (e.category === undefined || e.category === category),
  );
}
