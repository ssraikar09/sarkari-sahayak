/* Convert regional / transliterated scheme references into canonical
 * English scheme names so the existing RAG pipeline can match them.
 * Conservative: only replaces well-known phrases, leaves the rest intact. */

type Mapping = { patterns: string[]; canonical: string };

const SCHEME_MAPPINGS: Mapping[] = [
  {
    canonical: "PM Kisan",
    patterns: [
      // Hindi
      "प्रधान मंत्री किसान सम्मान निधि",
      "प्रधानमंत्री किसान सम्मान निधि",
      "प्रधान मंत्री किसान",
      "प्रधानमंत्री किसान",
      "पीएम किसान",
      // Kannada
      "ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್",
      "ಪಿಎಂ ಕಿಸಾನ್",
      "ಪಿಎಂ ಕಿಸಾನ",
      // Tamil
      "பிரதமர் கிசான்",
      "பிஎம் கிசான்",
      // Telugu
      "ప్రధాన మంత్రి కిసాన్",
      "పీఎం కిసాన్",
      "పిఎం కిసాన్",
    ],
  },
  {
    canonical: "Mudra Yojana",
    patterns: [
      "प्रधान मंत्री मुद्रा योजना",
      "मुद्रा योजना",
      "ಮುದ್ರಾ ಯೋಜನೆ",
      "முத்ரா திட்டம்",
      "முத்ரா யோஜனா",
      "ముద్రా యోజన",
    ],
  },
  {
    canonical: "Atal Pension Yojana",
    patterns: [
      "अटल पेंशन योजना",
      "ಅಟಲ್ ಪಿಂಚಣಿ ಯೋಜನೆ",
      "அடல் ஓய்வூதியத் திட்டம்",
      "అటల్ పెన్షన్ యోజన",
    ],
  },
  {
    canonical: "Ayushman Bharat",
    patterns: [
      "आयुष्मान भारत",
      "ಆಯುಷ್ಮಾನ್ ಭಾರತ್",
      "ஆயுஷ்மான் பாரத்",
      "ఆయుష్మాన్ భారత్",
    ],
  },
  {
    canonical: "PM Awas Yojana",
    patterns: [
      "प्रधान मंत्री आवास योजना",
      "पीएम आवास योजना",
      "ಪಿಎಂ ಆವಾಸ್ ಯೋಜನೆ",
      "பிஎம் ஆவாஸ் யோஜனா",
      "పీఎం ఆవాస్ యోజన",
    ],
  },
  {
    canonical: "Sukanya Samriddhi Yojana",
    patterns: [
      "सुकन्या समृद्धि योजना",
      "ಸುಕನ್ಯಾ ಸಮೃದ್ಧಿ ಯೋಜನೆ",
      "சுகன்யா சம்ருத்தி திட்டம்",
      "సుకన్యా సమృద్ధి యోజన",
    ],
  },
];

/**
 * Normalize a voice query: replace regional scheme references with their
 * canonical English names. Original wording around the scheme name is kept,
 * which preserves user intent (e.g. "documents for PM Kisan").
 */
export function normalizeVoiceQuery(input: string): string {
  if (!input) return input;
  let out = input;
  for (const m of SCHEME_MAPPINGS) {
    for (const p of m.patterns) {
      if (!p) continue;
      if (out.toLowerCase().includes(p.toLowerCase())) {
        // Replace all occurrences (case-insensitive).
        const re = new RegExp(escapeRegExp(p), "gi");
        out = out.replace(re, m.canonical);
      }
    }
  }
  return out.trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
