/**
 * Shared disclaimer footer appended to every file a user exports.
 *
 * Exported files outlive the page that produced them. A CSV gets emailed to a
 * CFO, pasted into a deck, or attached to a vendor negotiation weeks later —
 * stripped of the confidence badges, caveats and context the site shows on
 * screen. Whoever opens it downstream never saw any of that. The footer
 * travels with the file so the numbers keep their qualifications.
 *
 * Links are plain-text URLs on purpose: CSV has no hyperlink concept, and
 * spreadsheet apps render a bare URL as clickable anyway.
 */

export const SITE_URL = 'https://comparecloudcosts.com';
export const TERMS_URL = `${SITE_URL}/terms`;
export const FEEDBACK_EMAIL = 'hello@comparecloudcosts.com';

/**
 * Disclaimer lines as plain strings (no CSV quoting applied).
 *
 * @param context - Optional description of what was exported, e.g.
 *                  "cross-cloud comparison" or "workload architecture".
 */
export function getExportDisclaimerLines(context = 'comparison'): string[] {
  const generated = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  return [
    '',
    'IMPORTANT — PLEASE READ',
    `This ${context} is a directional estimate based on publicly published list pricing. It is not a quote.`,
    'Figures exclude negotiated discounts (e.g. AWS EDP, Azure EA), reserved and committed-use pricing, private',
    'agreements, taxes, data egress, and support plan costs. Equivalent specifications do not guarantee equivalent',
    'performance, availability, or operational behavior across providers.',
    'Verify all figures against each provider\'s official pricing calculator and your account team before making',
    'migration or purchasing decisions.',
    '',
    `Terms of use: ${TERMS_URL}`,
    `Questions, corrections or feedback: ${FEEDBACK_EMAIL}`,
    `Generated ${generated} by Compare Cloud Costs — ${SITE_URL}`,
  ];
}

/** Escapes a value for CSV: wraps in quotes and doubles any inner quotes. */
function csvCell(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Disclaimer lines pre-quoted as single-column CSV rows, ready to concatenate
 * onto an existing CSV body.
 */
export function getExportDisclaimerCsvRows(context = 'comparison'): string[] {
  return getExportDisclaimerLines(context).map(csvCell);
}
