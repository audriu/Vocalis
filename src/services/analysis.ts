import { Analysis, AnalysisInput, Metric } from "@/types";
import { pickTechniques } from "@/data/techniques";
import {
  buildMistakes,
  buildStrengths,
  coachCopy,
  collectSignals,
  scoreMetrics,
  weaknessDetail,
} from "@/services/speech-signals";
export interface AnalysisProvider {
  analyze(input: AnalysisInput): Promise<Analysis>;
}
export function analyzeLocally(input: AnalysisInput): Analysis {
  const { transcript, duration, category, topic } = input;
  const s = collectSignals(transcript, topic, duration);
  const metrics = scoreMetrics(s);
  const ranked = Object.entries(metrics).sort((a, b) => a[1] - b[1]);
  const strengths = buildStrengths(s);
  const mistakes = buildMistakes(s, topic);
  const weakMetrics = ranked.slice(0, 3).map(([name]) => name as Metric);
  const selected = pickTechniques(
    weakMetrics,
    `${topic}|${category}|${Math.round(metrics[weakMetrics[0]])}|${s.wordCount}|${s.topicHits.join(",")}`,
  );
  const weak_areas = weakMetrics.map((name) => ({
    name,
    detail: weaknessDetail(name, s),
  }));
  const overall = Math.round(
    Object.values(metrics).reduce((a, b) => a + b, 0) / 8,
  );
  let mode_metrics: Record<string, number> | undefined;
  if (category === "debate")
    mode_metrics = {
      "Argument quality": metrics.Structure,
      Evidence: s.hasExample && !s.looksGibberish ? Math.max(metrics.Relevance, 70) : Math.min(metrics.Relevance, 48),
      Persuasion: metrics.Clarity,
      Logic: metrics.Structure,
      Rebuttal: /however|although|some argue|on the other hand/i.test(transcript)
        ? 78
        : Math.min(52, metrics.Structure),
    };
  if (category === "storytelling")
    mode_metrics = {
      Hook: metrics.Clarity,
      "Narrative structure": metrics.Structure,
      Specificity: s.hasExample && !s.looksGibberish ? 82 : Math.min(58, metrics.Relevance),
      Emotion: /felt|afraid|happy|worried|excited|sad/i.test(transcript)
        ? 80
        : 55,
      Ending: s.hasConclusion ? 84 : 52,
    };
  if (category === "interview")
    mode_metrics = {
      Professionalism: metrics.Conciseness,
      Relevance: metrics.Relevance,
      Structure: metrics.Structure,
      Evidence: s.hasExample && !s.looksGibberish ? 82 : Math.min(50, metrics.Clarity),
    };
  return {
    overall_score: overall,
    metrics,
    strengths,
    mistakes,
    filler_words: s.fillers,
    weak_areas,
    improvement_techniques: selected,
    coach_feedback: coachCopy(
      overall,
      weakMetrics[0],
      selected[0].action,
      s,
      topic,
    ),
    recommended_next_prompt: topic,
    words: s.wordCount,
    provider: input.demo ? "demo" : "local",
    mode_metrics,
  };
}
export class LocalAnalysisProvider implements AnalysisProvider {
  async analyze(input: AnalysisInput) {
    return analyzeLocally(input);
  }
}
function validAnalysis(value: unknown): value is Analysis {
  if (!value || typeof value !== "object") return false;
  const a = value as Analysis;
  return (
    Number.isFinite(a.overall_score) &&
    a.overall_score >= 0 &&
    a.overall_score <= 100 &&
    !!a.metrics &&
    [
      "Clarity",
      "Structure",
      "Fluency",
      "Vocabulary",
      "Relevance",
      "Spontaneity",
      "Confidence",
      "Conciseness",
    ].every((k) => Number.isFinite(a.metrics[k as Metric])) &&
    Array.isArray(a.strengths) &&
    a.strengths.every(
      (x) => typeof x.title === "string" && typeof x.detail === "string",
    ) &&
    Array.isArray(a.mistakes) &&
    a.mistakes.every(
      (x) => typeof x.title === "string" && typeof x.detail === "string",
    ) &&
    Array.isArray(a.filler_words) &&
    a.filler_words.every(
      (x) => typeof x.word === "string" && Number.isFinite(x.count),
    ) &&
    Array.isArray(a.weak_areas) &&
    a.weak_areas.length > 0 &&
    a.weak_areas.every(
      (x) => typeof x.name === "string" && typeof x.detail === "string",
    ) &&
    Array.isArray(a.improvement_techniques) &&
    a.improvement_techniques.length > 0 &&
    a.improvement_techniques.every((x) =>
      ["name", "weakness", "why", "action", "practice"].every(
        (k) => typeof x[k as keyof typeof x] === "string",
      ),
    ) &&
    typeof a.coach_feedback === "string" &&
    typeof a.recommended_next_prompt === "string" &&
    Number.isFinite(a.words)
  );
}
const LLM_GATEWAY_URL = "https://llm-gateway.assemblyai.com/v1/chat/completions";
const METRIC_NAMES: Metric[] = [
  "Clarity",
  "Structure",
  "Fluency",
  "Vocabulary",
  "Relevance",
  "Spontaneity",
  "Confidence",
  "Conciseness",
];
const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
const items = <T>(value: unknown, map: (x: Record<string, unknown>) => T | null, max: number) =>
  (Array.isArray(value) ? value : [])
    .map((x) => (x && typeof x === "object" ? map(x as Record<string, unknown>) : null))
    .filter((x): x is T => x !== null)
    .slice(0, max);
// Parses the model's JSON reply, dropping any reasoning text or code fences around it.
function parseReply(content: string): Record<string, unknown> | null {
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}
// AssemblyAI LLM Gateway writes the coaching text. Scores, filler counts and word counts stay
// rule-based so they are consistent between sessions; any failure falls back to local coaching.
export class LlmGatewayAnalysisProvider implements AnalysisProvider {
  constructor(
    private apiKey: string,
    private model = process.env.LLM_GATEWAY_MODEL || "qwen3.5-4b-32k-fast",
  ) {}
  async analyze(input: AnalysisInput): Promise<Analysis> {
    const local = analyzeLocally(input);
    if (input.demo) return local;
    try {
      const weakest = Object.entries(local.metrics)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([name, score]) => `${name} ${score}`)
        .join(", ");
      const response = await fetch(LLM_GATEWAY_URL, {
        method: "POST",
        headers: { authorization: this.apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1500,
          temperature: 0.4,
          post_processing_steps: [{ type: "json-repair" }],
          messages: [
            {
              role: "system",
              content: `You are Vocalis, a direct public speaking coach. Review the transcript against the prompt. Quote what they actually said. Never invent examples, structure, or a point they did not make. If they spoke off-topic, in fragments, or not in clear English, do not praise them for committing to an answer or for varied vocabulary. Reply with only one JSON object:
{"strengths":[{"title":"","detail":""}],"mistakes":[{"title":"","detail":""}],"weak_areas":[{"name":"","detail":""}],"improvement_techniques":[{"name":"","weakness":"","why":"","action":"","practice":""}],"coach_feedback":"","recommended_next_prompt":""}
Rules: 0 to 3 strengths (0 is correct when the take does not answer the prompt); 1 to 3 mistakes; 2 to 3 weak_areas; exactly 3 improvement_techniques. Every weak_areas.name and every improvement_techniques.weakness must be one of: ${METRIC_NAMES.join(", ")}. Each technique's weakness must match one of the weak_areas names. Keep each detail to one or two sentences and quote the transcript. coach_feedback is 2 to 3 honest sentences. recommended_next_prompt is one new speaking prompt that practices their weakest skill.`,
            },
            {
              role: "user",
              content: `Prompt: ${input.topic}
Category: ${input.category}
Speaking time: ${input.duration} seconds, ${local.words} words
Filler words found: ${local.filler_words.map((f) => `${f.word} x${f.count}`).join(", ") || "none"}
Lowest rule-based scores: ${weakest}
Local flags: overall ${local.overall_score}; strengths ${local.strengths.map((x) => x.title).join(" | ") || "none"}; mistakes ${local.mistakes.map((x) => x.title).join(" | ") || "none"}
Transcript:
"""${input.transcript.slice(0, 12000)}"""`,
            },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) return local;
      const body = await response.json();
      const reply = parseReply(body?.choices?.[0]?.message?.content || "");
      if (!reply) return local;
      const isMetric = (v: string): v is Metric => METRIC_NAMES.includes(v as Metric);
      const pair = (x: Record<string, unknown>) => {
        const title = text(x.title, 80);
        const detail = text(x.detail, 400);
        return title && detail ? { title, detail } : null;
      };
      const strengths = items(reply.strengths, pair, 3);
      const mistakes = items(reply.mistakes, pair, 3);
      const weak_areas = items<{ name: string; detail: string }>(reply.weak_areas, (x) => {
        const name = text(x.name, 40);
        const detail = text(x.detail, 400);
        return isMetric(name) && detail ? { name, detail } : null;
      }, 3);
      const improvement_techniques = items(reply.improvement_techniques, (x) => {
        const t = {
          name: text(x.name, 80),
          weakness: text(x.weakness, 40),
          why: text(x.why, 400),
          action: text(x.action, 400),
          practice: text(x.practice, 400),
        };
        return isMetric(t.weakness) && t.name && t.why && t.action && t.practice ? t : null;
      }, 3);
      const coach_feedback = text(reply.coach_feedback, 800);
      if (!weak_areas.length || !improvement_techniques.length || !coach_feedback)
        return local;
      // Every technique needs a matching weak area so the results page can explain it.
      for (const t of improvement_techniques)
        if (!weak_areas.some((w) => w.name === t.weakness))
          weak_areas.push(
            local.weak_areas.find((w) => w.name === t.weakness) || {
              name: t.weakness,
              detail: t.why,
            },
          );
      return {
        ...local,
        strengths,
        mistakes,
        weak_areas,
        improvement_techniques,
        coach_feedback,
        recommended_next_prompt: text(reply.recommended_next_prompt, 300) || local.recommended_next_prompt,
        provider: "remote",
      };
    } catch {
      return local;
    }
  }
}
export function getAnalysisProvider(): AnalysisProvider {
  const endpoint = process.env.ANALYSIS_PROVIDER_URL;
  if (!endpoint) {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    return apiKey && process.env.LLM_GATEWAY_DISABLED !== "true"
      ? new LlmGatewayAnalysisProvider(apiKey)
      : new LocalAnalysisProvider();
  }
  return {
    async analyze(input) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.ANALYSIS_API_KEY
            ? { Authorization: `Bearer ${process.env.ANALYSIS_API_KEY}` }
            : {}),
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(45000),
      });
      if (!response.ok)
        throw new Error(
          "The analysis provider is unavailable. Please try again.",
        );
      const result: unknown = await response.json();
      if (!validAnalysis(result))
        throw new Error(
          "The analysis provider returned an incomplete response. Please try again.",
        );
      return { ...result, provider: "remote" };
    },
  };
}
