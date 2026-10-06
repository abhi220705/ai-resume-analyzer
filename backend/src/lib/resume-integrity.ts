type IntegrityInput = {
  extractedText: string | null;
  ocrText: string | null;
  parseStatus: string;
  ocrStatus: string;
  pageCount: number | null;
  ocrPageCount: number | null;
  ocrConfidence: number | null;
};

function tokenize(text: string): string[] {
  return (
    text
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\u00ad/g, "")
      .match(/[\p{L}\p{N}]+(?:[.+#][\p{L}\p{N}]+|[+#]+)*/gu) ?? []
  );
}

function frequencies(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return counts;
}

export function analyzeResumeIntegrity(input: IntegrityInput) {
  const warnings: string[] = [];
  const nativeText = input.extractedText ?? "";
  const visibleText = input.ocrText ?? "";

  const confidence = input.ocrConfidence;
  const validConfidence =
    confidence !== null &&
    Number.isFinite(confidence) &&
    confidence >= 0 &&
    confidence <= 100;

  if (input.parseStatus !== "COMPLETED") {
    warnings.push(
      "Native PDF text is unavailable. Scanned PDFs may have no text layer.",
    );
  }

  if (input.ocrStatus !== "COMPLETED") {
    warnings.push("Complete OCR before comparing the two text sources.");
  }

  if (
    !input.pageCount ||
    !input.ocrPageCount ||
    input.pageCount !== input.ocrPageCount
  ) {
    warnings.push("Full matching page coverage could not be confirmed.");
  }

  const withinLimit =
    nativeText.length <= 100_000 && visibleText.length <= 100_000;

  if (!withinLimit) {
    warnings.push("Text exceeds the comparison limit of 100,000 characters.");
  }

  const nativeTokens = withinLimit ? tokenize(nativeText) : [];
  const ocrTokens = withinLimit ? tokenize(visibleText) : [];

  if (nativeTokens.length < 30 || ocrTokens.length < 30) {
    warnings.push("Too little text for a useful comparison: at least 30 tokens per source are required.");
  }

  const comparable = warnings.length === 0;
  const nativeCounts = frequencies(nativeTokens);
  const ocrCounts = frequencies(ocrTokens);

  let sharedOccurrences = 0;

  for (const [term, count] of nativeCounts) {
    sharedOccurrences += Math.min(count, ocrCounts.get(term) ?? 0);
  }

  // Multiset Dice similarity: repeated words count as repeated occurrences.
  const score = comparable
    ? Math.round(
        (200 * sharedOccurrences) /
          (nativeTokens.length + ocrTokens.length),
      )
    : null;

  function differences(
    source: Map<string, number>,
    other: Map<string, number>,
  ) {
    return [...source]
      .map(([term, count]) => ({
        term,
        extraOccurrences: Math.max(0, count - (other.get(term) ?? 0)),
      }))
      .filter((item) => item.extraOccurrences > 0)
      .sort(
        (a, b) =>
          b.extraOccurrences - a.extraOccurrences ||
          a.term.localeCompare(b.term),
      );
  }

  const nativeExtra = comparable
    ? differences(nativeCounts, ocrCounts)
    : [];
  const ocrExtra = comparable
    ? differences(ocrCounts, nativeCounts)
    : [];

  if (!validConfidence || confidence! < 70) {
    warnings.push("OCR confidence is low or unavailable; differences may be recognition errors.");
  }

  if (score !== null && score < 85) {
    warnings.push("Potential discrepancy detected. Manual review recommended.");
  }

  const status =
    score === null
      ? "INSUFFICIENT_EVIDENCE"
      : !validConfidence || confidence! < 70 || score < 85
        ? "REVIEW_RECOMMENDED"
        : "CONSISTENT";

  return {
    engineVersion: "integrity-v1",
    score,
    status,
    comparisonConfidence:
      !comparable || !validConfidence || confidence! < 70
        ? "LOW"
        : "MODERATE",
    ocrConfidence: validConfidence ? confidence : null,
    counts: {
      nativeTokens: nativeTokens.length,
      ocrTokens: ocrTokens.length,
      sharedOccurrences,
    },
    nativeExtraTerms: nativeExtra.slice(0, 30),
    ocrExtraTerms: ocrExtra.slice(0, 30),
    differencesTruncated: nativeExtra.length > 30 || ocrExtra.length > 30,
    warnings,
    explanation:
      "Score = 100 × 2 × shared token occurrences ÷ total token occurrences across both sources. Text is Unicode-normalized and lowercased; word order is ignored. Repeated terms retain their counts.",
    thresholds:
      "Prototype rules: at least 30 tokens per source, matching page counts, OCR confidence at least 70, and similarity at least 85 for CONSISTENT. These thresholds are not statistically calibrated.",
    limitations: [
      "This measures text agreement, not honesty or the truth of resume claims.",
      "Extra PDF terms are review signals, not proof of invisible text.",
      "OCR errors, layout, punctuation, and language can cause differences.",
      "Font visibility and abnormal text positioning are not inspected.",
      "CONSISTENT does not mean the resume is verified or fraud-free.",
    ],
  };
}