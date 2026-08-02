/**
 * Pure, closure-free DOM parser shared by the generic (non-DigitalOcean) AI model catalog
 * scrapers. Must stay closure-free — Playwright's page.evaluate() serializes this function's
 * source and runs it inside the browser context, so it can only touch the DOM and its own args.
 *
 * Verified against two live pages (2026-07-24):
 * - AWS Bedrock (aws.amazon.com/bedrock/pricing/): ~100 <table> elements, no <thead> at all —
 *   the header row is just the first <tr> inside the (browser-inserted) <tbody>, all-<td>. Most
 *   tables use SEPARATE columns per price type ("Price per 1M Input tokens", "Price per 1M
 *   Output tokens") rather than one combined price cell.
 * - Azure AI Foundry (azure.microsoft.com/en-us/pricing/details/ai-foundry-models/microsoft/):
 *   5 real <table> elements with proper <thead>, columns "Models" / "Input (Per 1M tokens)" /
 *   "Output (Per 1M tokens)" — same separate-column shape as Bedrock.
 *
 * GCP Vertex AI, Oracle GenAI, and Alibaba Model Studio have NOT been checked against their
 * live DOM yet — this parser's column-detection-by-header-text approach should degrade
 * gracefully (skip tables it can't make sense of) rather than throw, but treat their output as
 * unverified until someone confirms it against those three pages.
 */
export function parseGenericAIModelTable(): any[] {
  const parsed: any[] = [];
  const tables = Array.from(document.querySelectorAll('table'));

  tables.forEach(table => {
    const allRows = Array.from(table.querySelectorAll('tr'));
    if (allRows.length < 2) return;

    // Header row is whatever's inside <thead>, or — when a vendor (e.g. AWS Bedrock) skips
    // <thead> entirely — just the first <tr> in the table, wherever the browser placed it.
    const headerRow = table.querySelector('thead tr') || allRows[0];
    const headerCells = Array.from(headerRow.querySelectorAll('th, td')).map(el => (el.textContent || '').trim().toLowerCase());

    const nameIdx = headerCells.findIndex(h => h.includes('name') || h.includes('model'));
    if (nameIdx === -1) return; // not a model-catalog table, skip

    const typeIdx = headerCells.findIndex(h => h.includes('type') || h.includes('category'));
    const availIdx = headerCells.findIndex(h => h.includes('availab') || h.includes('deployment'));

    // Separate input/output price columns (AWS Bedrock, Azure AI Foundry shape) take priority
    // over a single combined price cell (DigitalOcean shape) when both would match.
    const inputIdx = headerCells.findIndex(h => h.includes('input') && (h.includes('token') || h.includes('price')) && !h.includes('cache') && !h.includes('batch'));
    const outputIdx = headerCells.findIndex(h => h.includes('output') && (h.includes('token') || h.includes('price')) && !h.includes('cache') && !h.includes('batch'));
    const imageColIdx = headerCells.findIndex(h => h.includes('image'));
    const combinedPriceIdx = headerCells.findIndex(h => h.includes('price') || h.includes('pricing') || h.includes('cost'));

    const dataRows = allRows.filter(r => r !== headerRow);

    dataRows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length <= nameIdx) return;

      const nameCell = cells[nameIdx];
      const modelName = nameCell.querySelector('a')?.textContent?.trim() || nameCell.textContent?.trim().split('\n')[0] || '';
      // Guard against footnote/disclaimer rows (e.g. "**You are charged for...") that live in
      // the same <table> but aren't real data rows — real model names are short.
      if (!modelName || modelName.length > 90 || cells.length < 2) return;

      // Reject rows where the "name" is actually a price or a bare number.
      //
      // Bedrock's pricing page is ~100 separate tables with inconsistent column
      // orders. On some of them the detected name column lands on a price cell,
      // producing records literally named "$0.03" / "$0.60" — six of these were
      // live on the AI page (confirmed in the database 2026-07-26) before this
      // guard existed. A model name always contains letters; a price never does.
      // Cheap to check, and the failure it prevents is the kind a visitor spots
      // immediately.
      const looksLikePrice = /^[$€£¥]?\s*[\d.,]+\s*(?:\/|per\b|[a-z]{0,3}\b)?\s*$/i.test(modelName);
      const hasLetters = /[a-z]/i.test(modelName);
      if (looksLikePrice || !hasLetters) return;

      const slugMatch = nameCell.textContent?.match(/[a-z0-9][a-z0-9.\-]{2,}/i);
      const modelSlug = slugMatch ? slugMatch[0].toLowerCase() : modelName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Raw text from the vendor's "Type"/"Category" column, if any. This is a
      // modality/use-case value (Chat, Coding, Embedding, ...), NOT a capability
      // tier — the caller (a Node-side wrapper scraper, not this closure-free
      // function) normalizes it into the canonical modality vocabulary and
      // separately infers a real Frontier/Standard/Efficient tier. See
      // tier_inference.ts, which can't be imported here because Playwright
      // serializes this function's source into the browser context.
      const modalityRaw = typeIdx >= 0 ? (cells[typeIdx]?.textContent?.trim() || 'Chat') : 'Chat';
      const availText = availIdx >= 0 ? (cells[availIdx]?.textContent || '').toLowerCase() : '';

      let inputPricePer1M: number | null = null;
      let outputPricePer1M: number | null = null;
      let pricePerImage: number | null = null;
      let pricePerUnit: number | null = null;
      let priceUnitLabel: string | null = null;
      let gpuConfigPricing = false;

      // Inlined rather than factored into a named helper: tsx/esbuild wraps named
      // function expressions declared inside this function with a __name(fn, "id")
      // call for stack-trace support, and that call ends up baked into the source
      // text Playwright's page.evaluate() captures via fn.toString() — but the
      // browser's isolated evaluation context has no __name global, so it throws
      // "ReferenceError: __name is not defined" the moment the helper is declared
      // (confirmed 2026-07-25: crashed Bedrock/Azure/GCP Vertex, which reach this
      // line; silently spared Oracle/DigitalOcean/Alibaba, whose real pages never
      // matched the header-detection logic above so execution never got this far).
      // A bare `const m = ...` here is a variable, not a function, so nothing to wrap.
      if (inputIdx >= 0 && cells[inputIdx]) {
        const m = (cells[inputIdx].textContent || '').match(/\$\s*([\d,.]+)/);
        inputPricePer1M = m ? parseFloat(m[1].replace(/,/g, '')) : null;
      }
      if (outputIdx >= 0 && cells[outputIdx]) {
        const m = (cells[outputIdx].textContent || '').match(/\$\s*([\d,.]+)/);
        outputPricePer1M = m ? parseFloat(m[1].replace(/,/g, '')) : null;
      }
      if (imageColIdx >= 0 && cells[imageColIdx]) {
        const m = (cells[imageColIdx].textContent || '').match(/\$\s*([\d,.]+)/);
        pricePerImage = m ? parseFloat(m[1].replace(/,/g, '')) : null;
      }

      // Fall back to a single combined price cell (e.g. "$0.03/image", "$0.60/video") only
      // when the separate-column shape above didn't find anything.
      if (inputPricePer1M === null && outputPricePer1M === null && pricePerImage === null && combinedPriceIdx >= 0 && cells[combinedPriceIdx]) {
        const priceText = (cells[combinedPriceIdx].textContent || '').replace(/\s+/g, ' ').trim();
        const inputMatch = priceText.match(/\$([\d.]+)\s*\/?\s*(?:M|1M)\s*input/i);
        const outputMatch = priceText.match(/\$([\d.]+)\s*\/?\s*(?:M|1M)\s*output/i);
        const imageMatch = priceText.match(/\$([\d.]+)\s*\/\s*image/i);
        const videoMatch = priceText.match(/\$([\d.]+)\s*\/\s*video/i);
        const charsMatch = priceText.match(/\$([\d.]+)\s*\/\s*1K\s*chars/i);
        const flatMatch = !inputMatch && !imageMatch && !videoMatch && !charsMatch ? priceText.match(/\$([\d.]+)/) : null;

        if (inputMatch) inputPricePer1M = parseFloat(inputMatch[1]);
        if (outputMatch) outputPricePer1M = parseFloat(outputMatch[1]);
        if (imageMatch) pricePerImage = parseFloat(imageMatch[1]);
        if (videoMatch) { pricePerUnit = parseFloat(videoMatch[1]); priceUnitLabel = 'video'; }
        if (charsMatch) { pricePerUnit = parseFloat(charsMatch[1]); priceUnitLabel = '1K chars'; }
        if (flatMatch) inputPricePer1M = parseFloat(flatMatch[1]);
        if (/based on gpu configuration|contact (us|sales)|custom pricing/i.test(priceText)) gpuConfigPricing = true;
      }

      if (inputPricePer1M === null && outputPricePer1M === null && pricePerImage === null && pricePerUnit === null) {
        gpuConfigPricing = true; // no parseable price anywhere on the row — treat as "contact sales" style
      }

      const availability: string[] = [];
      if (availText.includes('serverless') || availText.includes('on-demand') || availText.includes('pay-as-you-go') || availIdx === -1) availability.push('serverless');
      if (availText.includes('dedicated') || availText.includes('provisioned') || availText.includes('reserved') || availText.includes('managed')) availability.push('dedicated');
      if (availability.length === 0) availability.push('serverless');

      parsed.push({
        modelName,
        modelSlug,
        modalityRaw,
        capabilities: [],
        inputPricePer1M,
        outputPricePer1M,
        pricePerImage,
        pricePerUnit,
        priceUnitLabel,
        availability,
        multimodal: /vision|multimodal|image/i.test(modalityRaw),
        gpuConfigPricing,
      });
    });
  });

  return parsed;
}
