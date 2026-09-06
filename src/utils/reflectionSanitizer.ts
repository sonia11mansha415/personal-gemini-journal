import { ReflectionLens, ReflectionMessage } from '../types';

export interface ParsedReflectionResult {
  reflection: string;
  suggestedLens: ReflectionLens | null;
  suggestedLensReason: string | null;
  candidateCareerWin: { title: string; summary: string } | null;
  citedSourceEntryIds: string[];
}

/**
 * Strict prose sanitizer for user-facing reflection text.
 * Guarantees that raw JSON, model metadata field names (e.g. suggestedLens, candidateCareerWin),
 * curly braces, quotes, or parser fragments are NEVER rendered to the journalist.
 */
export function cleanReflectionProse(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'Thank you for sharing this moment. Taking time to pause and reflect on your experiences is a meaningful part of your journey.';
  }

  let text = input.trim();

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Strip JSON keys and values if model hallucinated or concatenated them
  text = text.replace(/"suggestedLens"\s*:\s*(?:"[^"]*"|null),?/gi, '');
  text = text.replace(/"suggestedLensReason"\s*:\s*(?:"[^"]*"|null),?/gi, '');
  text = text.replace(/"candidateCareerWin"\s*:\s*(?:\{[^}]*\}|null),?/gi, '');
  text = text.replace(/"citedSourceEntryIds"\s*:\s*\[[^\]]*\],?/gi, '');
  text = text.replace(/"reflection"\s*:\s*"?/gi, '');

  // Strip JSON formatting characters at edges
  text = text.replace(/^[\s",:{}\[\]]+/, '');
  text = text.replace(/[\s",:{}\[\]]+$/, '');

  // Unescape quotes
  text = text.replace(/\\"/g, '"');

  // Strip any remaining curly braces
  text = text.replace(/[{}]/g, '').trim();

  // If text is empty or contains raw JSON key words, fall back safely
  if (
    !text ||
    text.length < 5 ||
    /\b(suggestedLens|suggestedLensReason|candidateCareerWin|citedSourceEntryIds)\b/i.test(text)
  ) {
    return 'Thank you for sharing this moment. Taking time to pause and reflect on your experiences is a meaningful part of your journey.';
  }

  // Prevent trailing incomplete sentences / mid-sentence cutoffs:
  // If the text does not end in terminal punctuation (. ! ?), check if there is an earlier complete sentence.
  const hasTerminalPunctuation = /[.!?]["'”’]?\s*$/.test(text);
  if (!hasTerminalPunctuation) {
    const lastPunctIndex = Math.max(text.lastIndexOf('.'), text.lastIndexOf('!'), text.lastIndexOf('?'));
    if (lastPunctIndex >= 40) {
      // Trim back to the last complete sentence boundary so no trailing cut-off fragment remains
      text = text.slice(0, lastPunctIndex + 1).trim();
    } else {
      // If it's a single thought without ending punctuation, close it with a period
      text = text.replace(/[,;:\-\s]+$/, '') + '.';
    }
  }

  return text.trim();
}

/**
 * Robust defensive parser for structured Gemini output.
 * Adheres strictly to the contract:
 * {
 *   reflection: string (prose only),
 *   suggestedLens: ReflectionLens | null,
 *   suggestedLensReason: string | null,
 *   candidateCareerWin: { title, summary } | null,
 *   citedSourceEntryIds: string[]
 * }
 */
export function parseGeminiReflectionOutput(rawResultText: string, currentLens: string = 'PERSONAL'): ParsedReflectionResult {
  const fallbackResult: ParsedReflectionResult = {
    reflection: cleanReflectionProse(rawResultText),
    suggestedLens: null,
    suggestedLensReason: null,
    candidateCareerWin: null,
    citedSourceEntryIds: [],
  };

  if (!rawResultText || typeof rawResultText !== 'string' || !rawResultText.trim()) {
    return fallbackResult;
  }

  const cleaned = rawResultText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed: any = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Attempt extracting substring between first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const sub = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        parsed = JSON.parse(sub);
      } catch {
        try {
          const withoutTrailing = sub.replace(/,\s*([\}\]])/g, '$1');
          parsed = JSON.parse(withoutTrailing);
        } catch {
          // JSON parse failed
        }
      }
    }
  }

  const validLenses: ReflectionLens[] = ['PERSONAL', 'PROFESSIONAL', 'WOMEN_AND_LIFE', 'IDENTITY_AND_GROWTH'];

  if (parsed && typeof parsed === 'object') {
    let reflection = '';
    if (typeof parsed.reflection === 'string') {
      reflection = cleanReflectionProse(parsed.reflection);
    } else {
      reflection = cleanReflectionProse(cleaned);
    }

    let suggestedLens: ReflectionLens | null = null;
    if (
      typeof parsed.suggestedLens === 'string' &&
      validLenses.includes(parsed.suggestedLens as ReflectionLens) &&
      parsed.suggestedLens !== currentLens
    ) {
      suggestedLens = parsed.suggestedLens as ReflectionLens;
    }

    let suggestedLensReason: string | null = null;
    if (suggestedLens && typeof parsed.suggestedLensReason === 'string' && parsed.suggestedLensReason.trim()) {
      suggestedLensReason = cleanReflectionProse(parsed.suggestedLensReason);
      if (suggestedLensReason.length > 200) {
        suggestedLensReason = suggestedLensReason.slice(0, 200);
      }
    }

    let candidateCareerWin: { title: string; summary: string } | null = null;
    if (
      parsed.candidateCareerWin &&
      typeof parsed.candidateCareerWin === 'object' &&
      typeof parsed.candidateCareerWin.title === 'string' &&
      typeof parsed.candidateCareerWin.summary === 'string' &&
      parsed.candidateCareerWin.title.trim() &&
      parsed.candidateCareerWin.summary.trim()
    ) {
      const title = parsed.candidateCareerWin.title.trim().replace(/^["'{}]|["'{}]/g, '').trim();
      const summary = cleanReflectionProse(parsed.candidateCareerWin.summary);
      if (title && summary) {
        candidateCareerWin = { title, summary };
      }
    }

    const citedSourceEntryIds = Array.isArray(parsed.citedSourceEntryIds)
      ? parsed.citedSourceEntryIds.filter((id: any) => typeof id === 'string' && id.trim())
      : [];

    return {
      reflection,
      suggestedLens,
      suggestedLensReason,
      candidateCareerWin,
      citedSourceEntryIds,
    };
  }

  // Defensive regex extraction if structured parse failed
  let reflectionMatch = cleaned.match(/"reflection"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!reflectionMatch) {
    // Fallback: unclosed string match if truncated before closing quote
    reflectionMatch = cleaned.match(/"reflection"\s*:\s*"((?:[^"\\]|\\.)*)/);
  }
  let extractedReflection = '';
  if (reflectionMatch && reflectionMatch[1]) {
    try {
      extractedReflection = JSON.parse(`"${reflectionMatch[1]}"`);
    } catch {
      extractedReflection = reflectionMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }
  }

  const lensMatch = cleaned.match(/"suggestedLens"\s*:\s*"([A-Z_]+)"/);
  let suggestedLens: ReflectionLens | null = null;
  if (lensMatch && validLenses.includes(lensMatch[1] as ReflectionLens) && lensMatch[1] !== currentLens) {
    suggestedLens = lensMatch[1] as ReflectionLens;
  }

  const reasonMatch = cleaned.match(/"suggestedLensReason"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  let suggestedLensReason: string | null = null;
  if (suggestedLens && reasonMatch && reasonMatch[1]) {
    try {
      suggestedLensReason = JSON.parse(`"${reasonMatch[1]}"`);
    } catch {
      suggestedLensReason = reasonMatch[1].replace(/\\"/g, '"');
    }
  }

  return {
    reflection: cleanReflectionProse(extractedReflection || cleaned),
    suggestedLens,
    suggestedLensReason: suggestedLensReason ? cleanReflectionProse(suggestedLensReason) : null,
    candidateCareerWin: null,
    citedSourceEntryIds: [],
  };
}

/**
 * Deduplicate conversational messages by ID and role/text fingerprint.
 * Prevents optimistic chat and server retries from producing duplicated messages.
 */
export function deduplicateMessages(messages: ReflectionMessage[]): ReflectionMessage[] {
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  const deduped: ReflectionMessage[] = [];

  for (const m of messages) {
    if (!m || !m.text) continue;
    const cleanText = m.role === 'assistant' ? cleanReflectionProse(m.text) : m.text;
    const id = m.id || `${m.role}_${m.createdAt}_${cleanText.slice(0, 20)}`;
    const fingerprint = `${m.role}:${m.text.trim()}`;

    // For user messages, prevent exact duplicate text if repeated consecutively
    if (!seenIds.has(id)) {
      seenIds.add(id);
      deduped.push({
        ...m,
        id,
        text: cleanText,
      });
      seenFingerprints.add(fingerprint);
    }
  }

  return deduped;
}
