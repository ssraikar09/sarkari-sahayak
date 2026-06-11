import type { GoalCategory, GoalClassification } from "./types";

const CATEGORY_KEYWORDS: Record<GoalCategory, string[]> = {
  Education: [
    "college", "school", "study", "studies", "education", "scholarship",
    "student", "engineering", "tuition", "degree", "exam", "university",
    "admission", "fees", "books",
  ],
  Entrepreneurship: [
    "business", "startup", "shop", "tailoring", "self-employed", "msme",
    "mudra", "loan", "entrepreneur", "enterprise", "udyam", "venture",
    "manufacturing", "trade",
  ],
  Agriculture: [
    "farm", "farmer", "farming", "crop", "kisan", "agriculture",
    "irrigation", "land", "tractor", "seeds", "fertilizer", "harvest",
    "dairy", "livestock", "cattle",
  ],
  Retirement: [
    "retire", "retiring", "retirement", "pension", "senior", "old age",
    "elderly", "vridha", "post retirement",
  ],
  Healthcare: [
    "health", "healthcare", "medical", "hospital", "insurance", "ayushman",
    "treatment", "surgery", "illness", "disease", "ayush", "disability",
  ],
  "Women's Empowerment": [
    "woman", "women", "girl", "daughter", "mother", "maternity",
    "widow", "ladli", "mahila", "beti", "pregnant",
  ],
  "Skill Development": [
    "skill", "training", "vocational", "course", "certification",
    "apprentice", "kaushal", "upskill", "iti", "diploma course",
  ],
  "General Welfare": [],
};

export function classifyGoal(text: string): GoalClassification {
  const q = text.toLowerCase();
  let best: GoalCategory = "General Welfare";
  let bestHits: string[] = [];
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    GoalCategory,
    string[],
  ][]) {
    const hits = keywords.filter((k) => q.includes(k));
    if (hits.length > bestScore) {
      bestScore = hits.length;
      best = cat;
      bestHits = hits;
    }
  }

  const confidence = bestScore === 0
    ? 0
    : Math.min(1, bestScore / 3);

  return { category: best, confidence, matchedKeywords: bestHits };
}
