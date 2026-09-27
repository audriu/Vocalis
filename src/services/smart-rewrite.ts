import { FILLER_WORDS, FILLER_PATTERN } from "@/data/fillers";
import { collectSignals } from "@/services/speech-signals";

export interface PacingInsight {
  wpm: number;
  status: "optimal" | "slow" | "fast";
  label: string;
  advice: string;
}

export interface SmartRewriteResult {
  headline: string;
  polishedTranscript: string;
  keyChanges: string[];
  pacing: PacingInsight;
  cleanlinessScore: number;
  lexicalDiversity: number;
  signposts: string[];
  fillersFound: string[];
  challengeSteps: { title: string; instruction: string }[];
  coachVerdict: {
    tier: string;
    headline: string;
    summary: string;
  };
}

const SIGNPOST_REGEX =
  /\b(for example|for instance|in my experience|such as|first|firstly|second|secondly|third|thirdly|because|however|therefore|although|furthermore|moreover|in addition|additionally|meanwhile|consequently|ultimately|in conclusion|that is why|to sum up|in the end|as a result)\b/gi;

export function extractSignposts(text: string): string[] {
  const matches = text.match(SIGNPOST_REGEX) || [];
  return [...new Set(matches.map((m) => m.toLowerCase()))];
}

export function calculatePacing(words: number, duration: number): PacingInsight {
  const validDuration = Math.max(1, duration);
  const wpm = Math.round((words / validDuration) * 60);

  if (wpm < 110) {
    return {
      wpm,
      status: "slow",
      label: "Deliberate Pace",
      advice: "Consider picking up the cadence slightly to keep listener engagement high.",
    };
  }
  if (wpm <= 165) {
    return {
      wpm,
      status: "optimal",
      label: "Optimal Conversational Pace ✨",
      advice: "Cadence is in the sweet spot for natural comprehension and executive presence.",
    };
  }
  return {
    wpm,
    status: "fast",
    label: "Brisk Pace",
    advice: "Fast delivery. Add intentional 1-second pauses after key points to let ideas land.",
  };
}

export function generateSmartRewrite(
  transcript: string,
  topic: string,
  category: string,
  duration: number,
  score: number,
): SmartRewriteResult {
  const signals = collectSignals(transcript, topic, duration);
  const words = signals.words;
  const wordCount = signals.wordCount;
  const pacing = calculatePacing(wordCount, duration);

  const cleanlinessScore = Math.max(
    0,
    Math.min(100, Math.round(100 - (signals.fillerCount / Math.max(1, wordCount)) * 120)),
  );

  const cleanWords = words.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")).filter(Boolean);
  const uniqueCount = new Set(cleanWords).size;
  const lexicalDiversity = Math.round((uniqueCount / Math.max(1, cleanWords.length)) * 100);

  const signposts = extractSignposts(transcript);
  const fillersFound = signals.fillers.map((f) => f.word);

  // Verdict calculation based on score and signals
  let coachVerdict = {
    tier: "Developing Communicator",
    headline: "Promising start with room to polish",
    summary: "Focus on establishing your main point in the first 10 seconds and eliminating verbal hesitations.",
  };

  if (signals.looksGibberish) {
    coachVerdict = {
      tier: "Unintelligible Take",
      headline: "Speech could not be parsed",
      summary: "Speak clearly in English directly to the prompt to receive full scoring and coaching.",
    };
  } else if (score >= 80) {
    coachVerdict = {
      tier: "Executive Ready 🌟",
      headline: "Strong conviction and clear narrative flow",
      summary: "Your delivery is confident and structured. Refine vivid verbs and downward vocal inflection.",
    };
  } else if (score >= 65) {
    coachVerdict = {
      tier: "High Potential 🚀",
      headline: "Solid core ideas with clear potential",
      summary: "Replacing filler pauses with quiet breaths and adding explicit signposts will elevate your score.",
    };
  }

  // Handle gibberish or unintelligible input
  if (signals.looksGibberish) {
    return {
      headline: "Requires Clear English Delivery",
      polishedTranscript: `We could not generate an ideal take because the recorded speech was unintelligible, non-English, or random keystrokes. To see your AI polished version, record your response in clear English answering: “${topic}”.`,
      keyChanges: [
        "Unintelligible speech or random text detected",
        "Requires English speech addressing the prompt",
      ],
      pacing,
      cleanlinessScore: 0,
      lexicalDiversity: 0,
      signposts: [],
      fillersFound: [],
      challengeSteps: [
        { title: "Speak clearly in English", instruction: "State your opening thesis sentence out loud." },
        { title: "Address the prompt", instruction: `Answer directly: “${topic}”.` },
        { title: "Add one reason", instruction: "Explain why using “Because…” followed by a concrete detail." },
      ],
      coachVerdict,
    };
  }

  // Smart Speech Polish Engine
  // 1. Strip filler words
  let cleaned = transcript
    .replace(FILLER_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();

  // 2. Remove hedges from opener
  cleaned = cleaned.replace(
    /^(um|uh|well|basically|actually|sorry|i guess|maybe|i don't know|i mean|i just want to say)\s*,?\s*/i,
    "",
  );

  // 3. Sentence segmentation
  const rawSentences =
    cleaned
      .match(/[^.!?]+[.!?]*/g)
      ?.map((s) => s.trim())
      .filter((s) => s.length > 5) || [cleaned];

  // Polish the opening sentence
  let opening = rawSentences[0] || "";
  if (!/^(i believe|i think|my view is|the key|in my opinion|when it comes to)/i.test(opening)) {
    // Strengthen opening hook
    opening = opening.charAt(0).toUpperCase() + opening.slice(1);
    if (!opening.endsWith(".")) opening += ".";
  }

  // Polish the body sentences
  const bodySentences: string[] = [];
  for (let i = 1; i < rawSentences.length; i++) {
    let s = rawSentences[i].trim();
    if (!s) continue;
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) s += ".";
    bodySentences.push(s);
  }

  // Check if signposts should be woven in if missing
  const polishedParts: string[] = [opening];
  if (bodySentences.length > 0) {
    const hasExample = SIGNPOST_REGEX.test(cleaned);
    bodySentences.forEach((sentence, idx) => {
      if (idx === 0 && !hasExample && bodySentences.length >= 2) {
        polishedParts.push(
          sentence.startsWith("For example")
            ? sentence
            : `For example, ${sentence.charAt(0).toLowerCase() + sentence.slice(1)}`,
        );
      } else {
        polishedParts.push(sentence);
      }
    });
  }

  // Check conclusion
  const hasConclusion = /finally|in conclusion|ultimately|that's why|that is why|to sum up|in the end/i.test(cleaned);
  if (!hasConclusion && polishedParts.length >= 2) {
    polishedParts.push(`Ultimately, this demonstrates why a clear approach makes all the difference.`);
  }

  const polishedTranscript = polishedParts.join(" ");

  // Compile Key Changes
  const keyChanges: string[] = [];
  if (signals.fillerCount > 0) {
    keyChanges.push(`Eliminated ${signals.fillerCount} verbal filler(s) (${fillersFound.slice(0, 3).join(", ")})`);
  } else {
    keyChanges.push("Maintained clean, hesitation-free phrasing");
  }

  if (signals.hedgeCount > 0) {
    keyChanges.push(`Removed ${signals.hedgeCount} softening hedge(s) to assert a direct point of view`);
  } else {
    keyChanges.push("Assertive opening thesis with direct conviction");
  }

  if (signposts.length > 0) {
    keyChanges.push(`Reinforced logical transitions: ${signposts.slice(0, 3).map((s) => `“${s}”`).join(", ")}`);
  } else {
    keyChanges.push("Added explicit transition markers to guide listener comprehension");
  }

  if (!hasConclusion) {
    keyChanges.push("Added a decisive conclusion sentence to prevent trailing off");
  }

  // Customized Challenge Steps
  const challengeSteps = [
    {
      title: "Direct 5-Second Hook",
      instruction: `Start immediately with: “I believe…” without any opening hesitation.`,
    },
    {
      title: "One Concrete Illustration",
      instruction: `Deliver your proof point with “For example…” to give the listener something to picture.`,
    },
    {
      title: pacing.status === "fast" ? "Deliberate Pausing" : "Cadence Momentum",
      instruction:
        pacing.status === "fast"
          ? "Pause for a full breath between sentences instead of rushing to the next idea."
          : `Keep a steady speaking cadence around 130–140 words per minute.`,
    },
  ];

  return {
    headline: "Executive Polish: Structured, Direct & Filler-Free",
    polishedTranscript,
    keyChanges,
    pacing,
    cleanlinessScore,
    lexicalDiversity,
    signposts,
    fillersFound,
    challengeSteps,
    coachVerdict,
  };
}
