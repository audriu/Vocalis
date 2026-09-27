import { FILLER_WORDS } from "@/data/fillers";
import type { Metric } from "@/types";

const STOPWORDS = new Set(
  "a an the and or but if so to of in on for at by with from as is are was were be been being it this that these those i you we they he she them their my your our not no do does did have has had can could would should will just also more most than then there here what which who how why when where about into over after before because while than".split(
    " ",
  ),
);

const COMMON_ENGLISH_WORDS = new Set(
  ("time year people way day man thing world life hand part child eye woman place work week case point government company number group problem fact " +
  "good new first last long great little own other old right big high different small large next early young important few public bad same able " +
  "to of in for on with at by from up about into over after beneath under through between " +
  "say get make go know take see come think look want give use find tell ask seem feel try leave call " +
  "should need feel become leave put mean keep let begin seem help show hear play run move like live believe " +
  "hold bring happen must write provide sit stand lose pay meet include continue set learn change lead understand " +
  "watch follow stop create speak read allow add spend grow open walk win offer remember love consider appear buy " +
  "wait serve send expect build stay fall cut reach remain suggest raise pass sell require report decide pull " +
  "explain hope develop carry break receive agree support hit produce eat cover catch draw choose cause point " +
  "listen talk speak speech presentation voice story question idea example reason problem solution impact result " +
  "person someone anyone everybody everyone something anything nothing always never often usually sometimes " +
  "true false clear simple hard easy early late together alone almost already really actually basically perhaps " +
  "maybe sure certain strong weak confident confidence structure clarity relevance fluency vocabulary answer " +
  "mountain mountains beach beaches work office failure success successful fail failed").split(" "),
);

const VAGUE = /\b(things|stuff|something|someone|good|nice|very|really|whatever|basically|actually)\b/gi;
const HEDGES =
  /\b(maybe|perhaps|i guess|i don't know|i dont know|kind of|sort of|sorry|i mean)\b/gi;
const EXAMPLE =
  /\b(for example|for instance|in my experience|such as|one time|last year|last week|last month|recently|when i|i remember when|a great example|take for example|consider|to illustrate|in one case)\b/i;
const CONCLUSION =
  /\b(finally|in conclusion|ultimately|that's why|that is why|to sum up|in the end|in summary|overall|as a result|the takeaway is|in short)\b/i;
const STRUCTURE =
  /\b(first|firstly|second|secondly|third|thirdly|because|however|therefore|although|on the other hand|next|then|furthermore|moreover|in addition|additionally|meanwhile|consequently|alternatively)\b/gi;
const CLAIM =
  /\b(i believe|i think|in my opinion|my point is|we should|i would|the answer is|my view is|i argue that|from my perspective|the key is)\b/i;
const META =
  /\b(transcription|transcript|microphone|mic|recording|record|audio|speaker|vocalis|this app|this test|testing|tested|gibberish|asdf|qwerty|test the system|testing testing|check check|one two three|1 2 3|testing 1 2 3)\b/i;
const RESTART = /\b(wait|hold on|let me start|what i meant|uh|um)\b/gi;

export type SpeechSignals = {
  words: string[];
  wordCount: number;
  lower: string;
  first: string;
  sentences: string[];
  fillers: { word: string; count: number }[];
  fillerCount: number;
  fillerRate: number;
  structureMarkers: number;
  hasExample: boolean;
  hasConclusion: boolean;
  hasClaim: boolean;
  metaTalk: boolean;
  hedgeCount: number;
  vagueCount: number;
  avgLength: number;
  rate: number;
  topicKeywords: string[];
  topicHits: string[];
  overlapRatio: number;
  functionWordRatio: number;
  englishRatio: number;
  latinRatio: number;
  looksGibberish: boolean;
  hasKeyboardMash: boolean;
  contentUniqueRatio: number;
  contentCount: number;
  repeatedTrigrams: number;
  tooShort: boolean;
};

function quote(value: string, max = 140) {
  const t = value.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return `“${t.slice(0, max)}${t.length > max ? "…" : ""}”`;
}

function tokens(text: string) {
  return text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function isGibberishToken(w: string): boolean {
  const clean = w.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length < 3) return false;
  // No vowels at all (e.g. zxcvbnm, asdfgh, lkjh, qwrty, bcdfgh)
  if (!/[aeiouy]/.test(clean)) return true;
  // 5 or more consecutive consonants (e.g. bcdfgh, jklmnp)
  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(clean)) return true;
  // 3+ identical consecutive letters (e.g. aaa, xxxx, ffff)
  if (/(.)\1{2,}/.test(clean)) return true;
  // Obvious keyboard mash sequences
  if (/^(?:asdf|qwerty|zxcv|ghjkl|poiuy|lkjhg|mnbvc)/.test(clean)) return true;
  // Homerow-only typing without valid vowel structure
  if (/^[asdfghjkl]{5,}$/.test(clean) && !COMMON_ENGLISH_WORDS.has(clean)) return true;
  return false;
}

function topicKeywords(topic: string) {
  return [
    ...new Set(
      topic
        .toLowerCase()
        .replace(/^argue (for|against):\s*/i, "")
        .split(/\W+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
    ),
  ];
}

function trigramRepeats(words: string[]) {
  if (words.length < 9) return 0;
  const seen = new Map<string, number>();
  for (let i = 0; i < words.length - 2; i++) {
    const key = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  return [...seen.values()].filter((n) => n > 1).length;
}

export function collectSignals(
  transcript: string,
  topic: string,
  duration: number,
): SpeechSignals {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const lower = transcript.toLowerCase();
  const wordCount = words.length;
  const sentences =
    transcript.match(/[^.!?]+[.!?]*/g)?.filter((x) => x.trim()) ||
    (transcript.trim() ? [transcript] : []);
  const fillers = FILLER_WORDS.map((word) => ({
    word,
    count: (lower.match(new RegExp("\\b" + word.replace(" ", "\\s+") + "\\b", "g")) || [])
      .length,
  })).filter((x) => x.count > 0);
  const fillerCount = fillers.reduce((n, f) => n + f.count, 0);
  const letters = transcript.replace(/[^a-zA-Z\u00C0-\u024F]/g, "");
  const latin = transcript.replace(/[^a-zA-Z]/g, "");
  const latinRatio = letters.length ? latin.length / letters.length : 1;
  const lowered = tokens(transcript);
  const functionHits = lowered.filter((w) => STOPWORDS.has(w.replace(/[^a-z']/g, ""))).length;
  const functionWordRatio = functionHits / Math.max(1, wordCount);
  const keywords = topicKeywords(topic);
  const topicHits = keywords.filter((k) => lower.includes(k));
  const overlapRatio = topicHits.length / Math.max(1, keywords.length);

  const gibberishTokens = lowered.filter(isGibberishToken);
  const gibberishCount = gibberishTokens.length;
  const hasKeyboardMash =
    gibberishCount >= 2 ||
    (wordCount <= 6 && gibberishCount >= 1) ||
    gibberishCount / Math.max(1, wordCount) >= 0.15;

  const englishHits = lowered.filter(
    (w) =>
      STOPWORDS.has(w.replace(/[^a-z']/g, "")) ||
      COMMON_ENGLISH_WORDS.has(w.replace(/[^a-z']/g, "")) ||
      keywords.some((k) => w.includes(k)),
  ).length;
  const englishRatio = englishHits / Math.max(1, wordCount);

  const englishish = lowered.filter((w) => /^[a-z']{2,}$/.test(w) && !isGibberishToken(w));
  const content = englishish.filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  const contentCount = content.length;
  const contentUniqueRatio =
    contentCount > 0 ? new Set(content).size / contentCount : 0;

  const metaTalk = META.test(transcript);
  const isRepetitiveLoop =
    wordCount >= 6 && new Set(lowered).size / wordCount < 0.35;

  const looksGibberish =
    hasKeyboardMash ||
    (wordCount >= 4 && englishRatio < 0.28) ||
    (wordCount >= 6 && functionWordRatio < 0.12 && overlapRatio < 0.1) ||
    isRepetitiveLoop ||
    (metaTalk && overlapRatio === 0 && wordCount < 40 && englishRatio < 0.55) ||
    latinRatio < 0.5;

  const avgLength = wordCount / Math.max(1, sentences.length);
  const rate = (wordCount / Math.max(duration, 1)) * 60;
  const hedgeCount = (lower.match(HEDGES) || []).length;
  const vagueCount = (lower.match(VAGUE) || []).length;

  return {
    words,
    wordCount,
    lower,
    first: sentences[0]?.trim() || words.slice(0, 18).join(" "),
    sentences,
    fillers,
    fillerCount,
    fillerRate: fillerCount / Math.max(1, wordCount),
    structureMarkers: (lower.match(STRUCTURE) || []).length,
    hasExample: EXAMPLE.test(transcript),
    hasConclusion: CONCLUSION.test(transcript),
    hasClaim: CLAIM.test(transcript),
    metaTalk,
    hedgeCount,
    vagueCount,
    avgLength,
    rate,
    topicKeywords: keywords,
    topicHits,
    overlapRatio,
    functionWordRatio,
    englishRatio,
    latinRatio,
    looksGibberish,
    hasKeyboardMash,
    contentUniqueRatio,
    contentCount,
    repeatedTrigrams: trigramRepeats(lowered),
    tooShort: wordCount < 28,
  };
}

export function clampScore(n: number) {
  return Math.max(8, Math.min(94, Math.round(n)));
}

export function scoreMetrics(s: SpeechSignals): Record<Metric, number> {
  if (s.looksGibberish) {
    return {
      Clarity: clampScore(10 + Math.min(6, s.wordCount / 6)),
      Structure: clampScore(8 + Math.min(6, s.sentences.length * 2)),
      Fluency: clampScore(12 + Math.min(6, s.rate > 0 ? 4 : 0)),
      Vocabulary: clampScore(8 + Math.min(8, Math.round(s.englishRatio * 25))),
      Relevance: clampScore(5 + Math.min(6, Math.round(s.overlapRatio * 30))),
      Spontaneity: clampScore(10 + Math.min(6, s.wordCount / 6)),
      Confidence: clampScore(10 + Math.min(6, s.wordCount / 6)),
      Conciseness: clampScore(10 + Math.min(8, s.wordCount < 10 ? 0 : 6)),
    };
  }

  const isMetaOnly = s.metaTalk && s.overlapRatio === 0;

  const clarity = clampScore(
    36 +
      s.englishRatio * 42 +
      s.functionWordRatio * 32 +
      (s.latinRatio - 0.7) * 20 +
      (s.sentences.length >= 3 ? 8 : 0) -
      (s.tooShort ? 24 : 0) -
      (s.wordCount < 12 ? 20 : 0) -
      (isMetaOnly ? 30 : 0) -
      (s.avgLength > 28 ? 12 : 0) -
      (s.vagueCount > 2 ? 8 : 0),
  );
  const structure = clampScore(
    25 +
      Math.min(s.structureMarkers, 5) * 8 +
      (s.hasExample ? 12 : 0) +
      (s.hasConclusion ? 10 : 0) +
      (s.sentences.length >= 3 ? 10 : 0) +
      (s.hasClaim ? 8 : 0) -
      (isMetaOnly ? 25 : 0) -
      (s.tooShort ? 18 : 0),
  );
  const fluency = clampScore(
    78 -
      s.fillerRate * 220 -
      (s.rate < 90 ? 12 : s.rate > 185 ? 12 : 0) -
      (isMetaOnly ? 20 : 0) -
      Math.min(14, (s.lower.match(RESTART) || []).length * 4),
  );
  const vocabulary = clampScore(
    s.englishRatio < 0.4 || s.contentCount < 5
      ? 14 + Math.round(s.englishRatio * 20)
      : 22 +
          s.englishRatio * 32 +
          s.contentUniqueRatio * 30 +
          Math.min(10, s.contentCount / 7) -
          s.vagueCount * 3 -
          (isMetaOnly ? 22 : 0),
  );
  const relevance = clampScore(
    14 +
      s.overlapRatio * 76 +
      (s.topicHits.some((k) => s.first.toLowerCase().includes(k)) ? 10 : 0) -
      (s.metaTalk ? 40 : 0) -
      (s.overlapRatio === 0 && s.wordCount > 12 ? 15 : 0),
  );
  const spontaneity = clampScore(
    50 +
      (s.hasClaim ? 10 : 0) +
      (s.sentences.length >= 3 ? 8 : 0) -
      (s.hedgeCount > 2 ? 14 : 0) -
      (s.tooShort ? 16 : 0) -
      (s.metaTalk ? 15 : 0),
  );
  const confidence = clampScore(
    62 +
      (s.hasClaim ? 10 : 0) -
      s.hedgeCount * 8 -
      (/^\s*(um|uh|sorry|i guess|maybe)/i.test(s.first) ? 12 : 0) -
      (s.tooShort ? 10 : 0) -
      (isMetaOnly ? 15 : 0),
  );
  const conciseness = clampScore(
    s.tooShort
      ? 30
      : 74 -
          Math.max(0, s.avgLength - 18) * 1.8 -
          s.fillerCount -
          s.repeatedTrigrams * 5 -
          (s.wordCount > 160 ? 12 : 0) -
          (isMetaOnly ? 15 : 0),
  );

  return {
    Clarity: clarity,
    Structure: structure,
    Fluency: fluency,
    Vocabulary: vocabulary,
    Relevance: relevance,
    Spontaneity: spontaneity,
    Confidence: confidence,
    Conciseness: conciseness,
  };
}

export function buildStrengths(s: SpeechSignals) {
  if (
    s.looksGibberish ||
    (s.metaTalk && s.overlapRatio === 0) ||
    (s.overlapRatio === 0 && s.wordCount < 30) ||
    s.englishRatio < 0.45 ||
    s.tooShort
  ) {
    return [];
  }
  const out: { title: string; detail: string }[] = [];
  if (s.hasExample)
    out.push({
      title: "You made it concrete",
      detail: `You anchored your point with concrete evidence (${quote(s.first, 85)}). That gives the listener something tangible to hold onto.`,
    });
  if (s.structureMarkers >= 2)
    out.push({
      title: "Logical signposts",
      detail: `You used ${s.structureMarkers} connecting phrases to guide the listener through your line of reasoning.`,
    });
  if (s.overlapRatio >= 0.35 && s.topicHits.length >= 2)
    out.push({
      title: "Stayed with the prompt",
      detail: `Key concepts from the question showed up in your answer: ${s.topicHits.slice(0, 4).join(", ")}.`,
    });
  if (
    s.englishRatio >= 0.65 &&
    s.contentCount >= 18 &&
    s.contentUniqueRatio >= 0.62 &&
    s.contentUniqueRatio <= 0.92
  )
    out.push({
      title: "Varied vocabulary",
      detail: "Your content words are varied and expressive without looping on the same phrase.",
    });
  if (s.hasConclusion)
    out.push({
      title: "Decisive conclusion",
      detail: "You brought your thoughts to a deliberate close rather than trailing off.",
    });
  if (s.hasClaim && s.overlapRatio >= 0.25)
    out.push({
      title: "Clear opening position",
      detail: `You committed to a clear stance early: ${quote(s.first, 95)}`,
    });
  if (s.rate >= 115 && s.rate <= 165 && s.fillerCount <= 1 && s.wordCount >= 30)
    out.push({
      title: "Controlled pacing",
      detail: `Your speaking rate of ~${Math.round(s.rate)} wpm was steady and easy to follow.`,
    });
  if (s.hedgeCount === 0 && s.wordCount >= 25 && s.vagueCount <= 1)
    out.push({
      title: "Direct delivery",
      detail: "You delivered your ideas without hedging or self-qualifying.",
    });
  return out.slice(0, 3);
}

export function buildMistakes(s: SpeechSignals, topic: string) {
  const out: { title: string; detail: string }[] = [];

  if (s.looksGibberish) {
    out.push({
      title: "Unintelligible or non-English speech",
      detail: `This take could not be understood as clear English answering the prompt (${quote(s.first, 80)}). Vocalis requires spoken or written English.`,
    });
    out.push({
      title: "No response to prompt",
      detail: `The take did not answer the prompt: “${topic}”. Start over by speaking directly to the question.`,
    });
    if (s.metaTalk) {
      out.push({
        title: "Commentary on the tool",
        detail: "You discussed the recording tool or testing rather than delivering a speech on the topic.",
      });
    }
    return out;
  }

  if (s.metaTalk && s.overlapRatio === 0) {
    out.push({
      title: "You talked about the tool, not the prompt",
      detail: `The recording discusses the tool or session (${quote(s.first, 80)}) instead of addressing: “${topic}”.`,
    });
    out.push({
      title: "Off the prompt",
      detail: `None of the question’s key concepts appeared (${s.topicKeywords.slice(0, 5).join(", ") || "the prompt"}). Focus on the question.`,
    });
    return out;
  }

  if (s.metaTalk)
    out.push({
      title: "You talked about the tool, not the prompt",
      detail: `The recording comments on the session itself (${quote(s.first, 80)}). Answer the question: “${topic}”.`,
    });
  if (s.tooShort)
    out.push({
      title: "The answer is too brief",
      detail: `Only ${s.wordCount} words were captured. A complete take needs a point, a reason, and one example.`,
    });
  if (s.overlapRatio < 0.2 && s.wordCount >= 20)
    out.push({
      title: "Off the prompt",
      detail: `Almost none of the question’s key words appeared (${s.topicKeywords.slice(0, 5).join(", ") || "the prompt"}). Name the subject in your first sentence.`,
    });
  if (!s.hasExample && s.wordCount >= 32 && s.overlapRatio >= 0.2)
    out.push({
      title: "Ideas need evidence",
      detail: "There is no concrete example. Add one real situation, case, or moment that proves the claim.",
    });
  if (s.structureMarkers < 2 && s.wordCount >= 32 && s.overlapRatio >= 0.2)
    out.push({
      title: "Loose structure",
      detail: "Few signposts showed up. Use “because,” “for example,” or “in conclusion” so the logic is audible.",
    });
  if (s.fillerCount >= 2)
    out.push({
      title: "Filler words",
      detail: `Found ${s.fillerCount} possible fillers: ${s.fillers.map((f) => `“${f.word}” (${f.count})`).join(", ")}. Pause instead of filling the gap.`,
    });
  if (s.hedgeCount >= 2)
    out.push({
      title: "Hedging the point",
      detail: `Hedges showed up ${s.hedgeCount} times. Drop “maybe” and “I guess” from the opening line.`,
    });
  if (s.vagueCount >= 3)
    out.push({
      title: "Vague wording",
      detail: "Words like “things,” “stuff,” or “good” weaken your precision. Swap them for specific nouns.",
    });
  if (s.rate > 175 && s.wordCount >= 30)
    out.push({
      title: "Pacing too fast",
      detail: `Your speaking rate of ~${Math.round(s.rate)} wpm was rushed. Slow down so listeners can absorb your point.`,
    });
  if (s.rate < 90 && s.wordCount >= 15)
    out.push({
      title: "Hesitant pacing",
      detail: `Speaking rate was ~${Math.round(s.rate)} wpm. Practice continuous flow without long pauses.`,
    });
  if (s.avgLength > 28)
    out.push({
      title: "Run-on sentences",
      detail: `Sentences averaged ${Math.round(s.avgLength)} words. Split the longest thought in two.`,
    });
  if (!s.hasConclusion && s.wordCount >= 45)
    out.push({
      title: "Missing conclusion",
      detail: "The answer trailed off without a clear wrap-up. Add a decisive closing sentence.",
    });
  if (s.contentCount >= 15 && s.contentUniqueRatio < 0.45)
    out.push({
      title: "Repeated vocabulary",
      detail: "The same content words keep returning. Expand your vocabulary or develop a second supporting point.",
    });

  return out.slice(0, 4);
}

export function weaknessDetail(metric: Metric, s: SpeechSignals): string {
  switch (metric) {
    case "Relevance":
      return s.topicHits.length
        ? `Only ${s.topicHits.length} prompt word(s) appeared. Tie every example back to the question.`
        : "The transcript barely touches the prompt. Open with the subject of the question.";
    case "Clarity":
      return s.looksGibberish
        ? "The wording is unintelligible as an English answer. Re-record three clear sentences."
        : "Tighten the opening so a listener can repeat your point after one sentence.";
    case "Structure":
      return s.looksGibberish
        ? "No clear narrative or logical progression was detected."
        : "The path from claim to reason to example is not obvious yet.";
    case "Fluency":
      return s.fillerCount
        ? `Fillers showed up ${s.fillerCount} time(s). Trade them for a breath.`
        : "Pacing and restarts are getting in the way of a clean line.";
    case "Vocabulary":
      return s.looksGibberish || s.englishRatio < 0.4
        ? "There is not enough recognizable English vocabulary to score as a developed answer."
        : "Swap vague words for specific nouns and verbs.";
    case "Spontaneity":
      return "The take either stalls or never commits to a first sentence worth keeping.";
    case "Confidence":
      return "Hedges and soft openers are hiding the position you want to take.";
    case "Conciseness":
      return s.tooShort
        ? "Short is not the same as concise — there is not a full point to cut down yet."
        : "The same idea is running long. Give each sentence one job.";
  }
}

export function coachCopy(
  overall: number,
  weakest: Metric,
  techniqueAction: string,
  s: SpeechSignals,
  topic: string,
) {
  if (s.looksGibberish)
    return `This recording scored ${overall} because it was unintelligible, non-English, or random text rather than an answer to “${topic}”. To get constructive coaching, speak clearly in English addressing the question with a point, a reason, and an example.`;
  if (s.metaTalk && s.overlapRatio === 0)
    return `This recording scored ${overall} because it discussed the recording tool rather than answering “${topic}”. Re-record with your actual perspective on the topic. ${techniqueAction}`;
  if (s.overlapRatio < 0.2)
    return `Overall ${overall}. The weakest skill is ${weakest.toLowerCase()} — the words barely connect to the prompt. ${techniqueAction}`;
  return `Overall ${overall}. Your next opportunity is ${weakest.toLowerCase()}. ${techniqueAction} Keep anything that already serves the prompt, and rebuild the rest around that.`;
}
