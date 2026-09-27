import { FILLER_WORDS } from "@/data/fillers";
import type { Metric } from "@/types";

const STOPWORDS = new Set(
  "a an the and or but if so to of in on for at by with from as is are was were be been being it this that these those i you we they he she them their my your our not no do does did have has had can could would should will just also more most than then there here what which who how why when where about into over after before because while than".split(
    " ",
  ),
);

const VAGUE = /\b(things|stuff|something|someone|good|nice|very|really|whatever|basically|actually)\b/gi;
const HEDGES =
  /\b(maybe|perhaps|i guess|i don't know|i dont know|kind of|sort of|sorry|i mean)\b/gi;
const EXAMPLE =
  /\b(for example|for instance|last year|last week|last month|one time|when i|in \d{4}|for instance)\b/i;
const CONCLUSION =
  /\b(finally|in conclusion|ultimately|that's why|that is why|to sum up|in the end)\b/i;
const STRUCTURE =
  /\b(first|second|third|because|however|therefore|although|on the other hand|next|then|so)\b/gi;
const CLAIM =
  /\b(i believe|i think|in my opinion|my point is|we should|i would|the answer is)\b/i;
const META =
  /\b(transcription|transcript|microphone|recording|this app|this test|vocalis|gibberish|asdf|testing testing)\b/i;
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
  latinRatio: number;
  looksGibberish: boolean;
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
  const englishish = lowered.filter((w) => /^[a-z']{2,}$/.test(w));
  const content = englishish.filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  const contentCount = content.length;
  const contentUniqueRatio =
    contentCount > 0 ? new Set(content).size / contentCount : 0;
  const keywords = topicKeywords(topic);
  const topicHits = keywords.filter((k) => lower.includes(k));
  const overlapRatio = topicHits.length / Math.max(1, keywords.length);
  const looksGibberish =
    wordCount >= 8 &&
    (functionWordRatio < 0.12 ||
      (contentCount < 5 && overlapRatio < 0.15) ||
      (contentUniqueRatio > 0.92 && functionWordRatio < 0.2 && overlapRatio < 0.2));
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
    metaTalk: META.test(transcript),
    hedgeCount,
    vagueCount,
    avgLength,
    rate,
    topicKeywords: keywords,
    topicHits,
    overlapRatio,
    functionWordRatio,
    latinRatio,
    looksGibberish,
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
  const clarity = clampScore(
    38 +
      s.functionWordRatio * 70 +
      (s.latinRatio - 0.7) * 25 +
      (s.sentences.length >= 3 ? 8 : 0) -
      (s.tooShort ? 22 : 0) -
      (s.wordCount < 12 ? 18 : 0) -
      (s.looksGibberish ? 32 : 0) -
      (s.avgLength > 28 ? 12 : 0) -
      (s.sentences.length === 1 && s.wordCount > 40 ? 8 : 0),
  );
  const structure = clampScore(
    24 +
      Math.min(s.structureMarkers, 5) * 8 +
      (s.hasExample ? 12 : 0) +
      (s.hasConclusion ? 10 : 0) +
      (s.sentences.length >= 3 ? 12 : 0) +
      (s.hasClaim ? 6 : 0) -
      (s.looksGibberish ? 22 : 0) -
      (s.tooShort ? 16 : 0),
  );
  const fluency = clampScore(
    74 -
      s.fillerRate * 220 -
      (s.rate < 70 ? 10 : s.rate > 190 ? 14 : 0) -
      (s.looksGibberish ? 26 : 0) -
      Math.min(12, (s.lower.match(RESTART) || []).length * 3),
  );
  const vocabulary = clampScore(
    s.looksGibberish || s.contentCount < 6
      ? 18 + s.contentCount * 2
      : 28 +
          s.contentUniqueRatio * 55 +
          Math.min(12, s.contentCount / 8) -
          s.vagueCount * 4,
  );
  const relevance = clampScore(
    16 +
      s.overlapRatio * 72 +
      (s.topicHits.some((k) => s.first.toLowerCase().includes(k)) ? 10 : 0) -
      (s.metaTalk ? 36 : 0) -
      (s.looksGibberish ? 22 : 0) -
      (s.overlapRatio === 0 && s.wordCount > 12 ? 8 : 0),
  );
  const spontaneity = clampScore(
    48 +
      (s.hasClaim ? 10 : 0) +
      (s.sentences.length >= 3 && !s.looksGibberish ? 8 : 0) -
      (s.hedgeCount > 2 ? 12 : 0) -
      (s.looksGibberish ? 28 : 0) -
      (s.tooShort ? 14 : 0) -
      (s.metaTalk ? 10 : 0),
  );
  const confidence = clampScore(
    60 +
      (s.hasClaim ? 12 : 0) -
      s.hedgeCount * 7 -
      (/^\s*(um|uh|sorry|i guess)/i.test(s.first) ? 10 : 0) -
      (s.looksGibberish ? 24 : 0) -
      (s.tooShort ? 8 : 0),
  );
  const conciseness = clampScore(
    s.tooShort
      ? 34
      : 72 -
          Math.max(0, s.avgLength - 18) * 1.6 -
          s.fillerCount -
          s.repeatedTrigrams * 4 -
          (s.wordCount > 160 ? 10 : 0),
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
  const out: { title: string; detail: string }[] = [];
  if (s.hasExample && !s.looksGibberish)
    out.push({
      title: "You made it concrete",
      detail: `You pointed to a real situation (${quote(s.first, 90)}). That gives the listener something to hold onto.`,
    });
  if (s.structureMarkers >= 2 && !s.looksGibberish)
    out.push({
      title: "Signposts guide the listener",
      detail: `You used ${s.structureMarkers} connecting phrases. Keep those turns intentional so the path stays obvious.`,
    });
  if (s.overlapRatio >= 0.35 && s.topicHits.length >= 2)
    out.push({
      title: "You stayed with the prompt",
      detail: `Key words from the question showed up in your answer: ${s.topicHits.slice(0, 5).join(", ")}.`,
    });
  if (
    !s.looksGibberish &&
    s.contentCount >= 18 &&
    s.contentUniqueRatio >= 0.62 &&
    s.contentUniqueRatio <= 0.9
  )
    out.push({
      title: "Varied word choices",
      detail:
        "Your content words are varied enough that the answer does not loop on the same phrase.",
    });
  if (s.hasConclusion && !s.looksGibberish)
    out.push({
      title: "You closed the thought",
      detail: "You signaled an ending instead of trailing off. Listeners can tell when the point is complete.",
    });
  if (s.hasClaim && s.overlapRatio >= 0.25 && !s.looksGibberish)
    out.push({
      title: "A clear position",
      detail: `You stated a stance early: ${quote(s.first, 110)}`,
    });
  return out.slice(0, 3);
}

export function buildMistakes(s: SpeechSignals, topic: string) {
  const out: { title: string; detail: string }[] = [];
  if (s.metaTalk)
    out.push({
      title: "You talked about the tool, not the prompt",
      detail: `The recording comments on the session itself (${quote(s.first)}). Answer the question: ${topic}`,
    });
  if (s.looksGibberish || s.functionWordRatio < 0.12)
    out.push({
      title: "The answer is hard to follow",
      detail: `This take does not read as a clear English response to the prompt. Opening: ${quote(s.first)}. Restate one sentence that actually answers the question.`,
    });
  if (s.overlapRatio < 0.2 && !s.looksGibberish)
    out.push({
      title: "Off the prompt",
      detail: `Almost none of the question’s key words appeared (${s.topicKeywords.slice(0, 6).join(", ") || "the prompt"}). Name the subject in your first sentence.`,
    });
  if (s.tooShort)
    out.push({
      title: "The answer is too thin",
      detail: `Only ${s.wordCount} words were captured. A complete take needs a point, a reason, and one example.`,
    });
  if (!s.hasExample && !s.looksGibberish && s.wordCount >= 28)
    out.push({
      title: "Ideas need evidence",
      detail:
        "There is no concrete example. Add one person, place, or moment that proves the claim.",
    });
  if (s.structureMarkers < 2 && !s.looksGibberish && s.wordCount >= 28)
    out.push({
      title: "Loose structure",
      detail:
        "Few signposts showed up. Use “because,” “for example,” and a closing sentence so the logic is audible.",
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
  if (s.avgLength > 26 && !s.looksGibberish)
    out.push({
      title: "Long sentences",
      detail: `Sentences average ${Math.round(s.avgLength)} words. Split the longest thought in two.`,
    });
  if (
    !s.looksGibberish &&
    s.contentCount >= 12 &&
    s.contentUniqueRatio < 0.48
  )
    out.push({
      title: "Repeated vocabulary",
      detail:
        "The same content words keep returning. Check whether you are developing the idea or restating it.",
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
        ? "The wording is difficult to parse as a complete answer. Rebuild it as three short English sentences."
        : "Tighten the opening so a listener can repeat your point after one sentence.";
    case "Structure":
      return "The path from claim to reason to example is not obvious yet.";
    case "Fluency":
      return s.fillerCount
        ? `Fillers showed up ${s.fillerCount} time(s). Trade them for a breath.`
        : "Pacing and restarts are getting in the way of a clean line.";
    case "Vocabulary":
      return s.looksGibberish
        ? "There is not enough precise English vocabulary to score as a developed answer."
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
  if (s.looksGibberish || s.metaTalk)
    return `This recording scored ${overall} because it does not answer “${topic}”. Start over with one English sentence that states your point, then add a reason and one example. ${techniqueAction}`;
  if (s.overlapRatio < 0.2)
    return `Overall ${overall}. The weakest skill is ${weakest.toLowerCase()} — the words barely connect to the prompt. ${techniqueAction}`;
  return `Overall ${overall}. Your next opportunity is ${weakest.toLowerCase()}. ${techniqueAction} Keep anything that already serves the prompt, and rebuild the rest around that.`;
}
