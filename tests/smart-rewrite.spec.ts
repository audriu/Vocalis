import { test, expect } from "@playwright/test";
import {
  generateSmartRewrite,
  calculatePacing,
  extractSignposts,
} from "../src/services/smart-rewrite";

test.describe("Smart Rewrite and Cadence Intelligence", () => {
  test("generates smart polish, pacing, and challenge steps for a well-structured speech", () => {
    const topic = "Why are mountains better than beaches?";
    const transcript =
      "Um, I think mountains are far better than beaches. Basically the air is clean and peaceful. For example, last year I hiked in the Alps and felt so relaxed. In conclusion, mountains offer peace that beaches cannot.";
    const duration = 60;
    const score = 78;

    const result = generateSmartRewrite(transcript, topic, "everyday-life", duration, score);

    expect(result.polishedTranscript).toBeTruthy();
    // Removed fillers like 'Um' and 'Basically'
    expect(result.polishedTranscript).not.toMatch(/^um\b/i);
    expect(result.polishedTranscript).not.toMatch(/\bbasically\b/i);

    expect(result.keyChanges.length).toBeGreaterThan(0);
    expect(result.keyChanges.some((c) => c.includes("verbal filler"))).toBe(true);

    expect(result.pacing.wpm).toBeGreaterThan(30);
    expect(result.cleanlinessScore).toBeGreaterThanOrEqual(80);
    expect(result.lexicalDiversity).toBeGreaterThan(50);
    expect(result.challengeSteps.length).toBe(3);
    expect(result.coachVerdict.tier).toContain("High Potential");
  });

  test("diagnoses gibberish and returns clear prompt guidance without hallucinating rewrite", () => {
    const topic = "Tell me about a time you failed";
    const transcript = "asdfghjkl qwerty zxcvbnm poiuytrew lkjhgfds";
    const duration = 20;
    const score = 12;

    const result = generateSmartRewrite(transcript, topic, "storytelling", duration, score);

    expect(result.coachVerdict.tier).toBe("Unintelligible Take");
    expect(result.polishedTranscript).toContain("could not generate an ideal take");
    expect(result.signposts).toEqual([]);
    expect(result.cleanlinessScore).toBe(0);
  });

  test("calculates pacing brackets accurately", () => {
    // 50 words in 60s -> 50 WPM (slow)
    const slow = calculatePacing(50, 60);
    expect(slow.status).toBe("slow");

    // 135 words in 60s -> 135 WPM (optimal)
    const optimal = calculatePacing(135, 60);
    expect(optimal.status).toBe("optimal");
    expect(optimal.label).toContain("Optimal");

    // 200 words in 60s -> 200 WPM (fast)
    const fast = calculatePacing(200, 60);
    expect(fast.status).toBe("fast");
  });

  test("extracts signposts from speech text", () => {
    const text =
      "First, let us examine the problem. Furthermore, because people need clarity, for example in healthcare. Ultimately, we must act.";
    const signposts = extractSignposts(text);

    expect(signposts).toContain("first");
    expect(signposts).toContain("furthermore");
    expect(signposts).toContain("for example");
    expect(signposts).toContain("ultimately");
  });
});
