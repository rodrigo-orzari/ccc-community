/**
 * Converts raw instance/SKU names from the database into clean human-readable
 * labels for display. The raw name is preserved in the DB for filtering and
 * deep-linking; this is purely a presentation transform.
 *
 * Rules applied per provider / name pattern:
 *  - Azure DB armSkuName: expand abbreviations, strip HA/redundancy suffixes
 *    already captured by filter attributes (ZR, HA, LRS, GRS).
 *  - Azure VM/AKS: strip leading "Standard_" / "AKS-Standard_" prefixes.
 *  - Oracle OCI containers/OKE: reformat hyphen-joined shape strings.
 *  - All providers: strip tier suffixes in parentheses that duplicate the
 *    tier filter chip (Free, Basic, Standard, Premium, Developer).
 */
export function formatInstanceName(name: string, provider?: string): string {
  if (!name) return name;

  let n = name.trim();
  const p = provider?.toLowerCase();

  // ── Universal: strip trailing tier qualifiers already shown in filter chips
  n = n.replace(/\s*\((Free|Basic|Standard|Premium|Developer|Shared)\)\s*$/i, '');

  // ── Azure VM / AKS: strip "Standard_" prefix (and leading "AKS-" prefix)
  if (p === 'azure' || !p) {
    n = n.replace(/^AKS-Standard_/, 'AKS ');
    n = n.replace(/^Standard_/, '');
  }

  // ── Azure DB armSkuName (contains underscores, no spaces, starts with known tier tokens)
  // Detect by: no spaces AND contains underscores AND not an AWS db. instance
  if ((p === 'azure' || !p) && !n.includes(' ') && n.includes('_') && !n.startsWith('db.')) {
    // Strip HA/redundancy suffixes captured by ha_mode / redundancy filters
    n = n.replace(/_(ZR|HA|LRS|GRS|GZRS|RA-GRS)$/i, '');

    // Expand known abbreviations
    const abbr: Record<string, string> = {
      SQLMI: 'SQL MI',
      GP:    'General Purpose',
      BC:    'Business Critical',
      HS:    'Hyperscale',
      MO:    'Memory Optimized',
    };

    // Split on underscores, expand tokens, drop pure noise tokens
    const noiseTokens = new Set(['Compute', 'vCore']);
    const tokens = n.split('_').map(t => abbr[t] ?? t).filter(t => !noiseTokens.has(t));

    // Re-join with spaces; collapse multiple spaces
    n = tokens.join(' ').replace(/\s{2,}/g, ' ').trim();
  }

  // ── Oracle Container Instances: "Container-Instance-E4-1vCPU-2GB"
  //    → "Container Instance E4 · 1 vCPU / 2 GB"
  if (p === 'oracle' || !p) {
    const ciMatch = n.match(/^Container-Instance-([A-Z0-9]+)-(\d+vCPU)-(\d+GB)$/i);
    if (ciMatch) {
      return `Container Instance ${ciMatch[1]} · ${ciMatch[2].replace('vCPU', ' vCPU')} / ${ciMatch[3]}`;
    }

    // OKE: "OKE-VM.Standard.A1.Flex-2vCPU-8GB" → "OKE A1 Flex · 2 vCPU / 8 GB"
    const okeMatch = n.match(/^OKE-VM\.Standard\.([A-Z0-9]+)\.Flex-(\d+)vCPU-(\d+)GB$/i);
    if (okeMatch) {
      return `OKE ${okeMatch[1]} Flex · ${okeMatch[2]} vCPU / ${okeMatch[3]} GB`;
    }
  }

  return n;
}
