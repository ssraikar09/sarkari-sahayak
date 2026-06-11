import type { AssistantIntent } from "./types";

const INTENT_KEYWORDS: Record<AssistantIntent, string[]> = {
  eligibility: ["eligible", "eligibility", "qualify", "qualifies", "qualified", "can i get", "am i"],
  documents: ["document", "documents", "papers", "id proof", "aadhaar", "required to apply", "what do i need"],
  benefits: ["benefit", "benefits", "amount", "how much", "payout", "subsidy", "explain"],
  comparison: ["vs", "versus", "compare", "difference between", "better"],
  discovery: ["suggest", "recommend", "schemes for", "what schemes", "list schemes"],
  general: [],
};

export function detectIntent(query: string): AssistantIntent {
  const q = query.toLowerCase();
  let best: AssistantIntent = "general";
  let bestScore = 0;
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [
    AssistantIntent,
    string[],
  ][]) {
    const score = keywords.reduce((acc, k) => (q.includes(k) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return best;
}

const STOPWORDS = new Set([
  "the","a","an","is","are","am","i","my","me","you","your","we","our","what","which",
  "who","whom","whose","when","where","why","how","to","for","of","in","on","at","by",
  "and","or","but","so","do","does","did","have","has","had","be","been","being","this",
  "that","these","those","it","its","as","with","from","about","into","over","under",
  "scheme","schemes","government","govt","india","please","tell","explain","list","show",
]);

export function extractKeywords(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  return Array.from(new Set(tokens));
}
