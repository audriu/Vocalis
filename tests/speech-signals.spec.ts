import { test, expect } from '@playwright/test';
import {
  collectSignals,
  scoreMetrics,
  buildStrengths,
  buildMistakes,
  weaknessDetail,
  coachCopy,
  clampScore,
} from '../src/services/speech-signals';
import { analyzeLocally } from '../src/services/analysis';
import { cleanCustomWords } from '../src/data/custom-words';
import { getRewards } from '../src/data/rewards';
import { Session } from '../src/types';

test.describe('Speech Signals Scoring Engine', () => {
  test('evaluates a well-structured response', () => {
    const topic = 'Why are mountains better than beaches?';
    const transcript =
      'I believe mountains are far superior to beaches. First, the air is crisp and invigorating. For example, last year I hiked in the Alps and felt completely at peace. Furthermore, beaches are crowded, whereas mountains offer solitary reflection. In conclusion, the mountains offer tranquility that beaches simply cannot match.';
    const signals = collectSignals(transcript, topic, 60);

    expect(signals.wordCount).toBeGreaterThan(40);
    expect(signals.hasExample).toBe(true);
    expect(signals.hasConclusion).toBe(true);
    expect(signals.hasClaim).toBe(true);
    expect(signals.looksGibberish).toBe(false);

    const metrics = scoreMetrics(signals);
    expect(metrics.Clarity).toBeGreaterThanOrEqual(60);
    expect(metrics.Structure).toBeGreaterThanOrEqual(60);
    expect(metrics.Relevance).toBeGreaterThanOrEqual(50);

    const strengths = buildStrengths(signals);
    expect(strengths.length).toBeGreaterThan(0);
    expect(strengths.some((s) => s.title.includes('concrete'))).toBe(true);
  });

  test('detects off-topic and thin responses', () => {
    const topic = 'Explain quantum computing to a beginner';
    const transcript = 'Um, uh, hello vocalis testing the microphone recording app stuff.';
    const signals = collectSignals(transcript, topic, 10);

    expect(signals.tooShort).toBe(true);
    expect(signals.metaTalk).toBe(true);
    expect(signals.fillerCount).toBeGreaterThanOrEqual(2);

    const mistakes = buildMistakes(signals, topic);
    expect(mistakes.some((m) => m.title.includes('tool') || m.title.includes('thin'))).toBe(true);
  });

  test('detects gibberish or non-English input', () => {
    const topic = 'What makes someone successful?';
    const transcript = 'asdf qwer zxcv poiuy lkjh mnbv rtyu ghjk vbnm';
    const signals = collectSignals(transcript, topic, 20);

    expect(signals.looksGibberish).toBe(true);
    const metrics = scoreMetrics(signals);
    expect(metrics.Clarity).toBeLessThan(50);
    expect(metrics.Relevance).toBeLessThan(40);

    const copy = coachCopy(
      30,
      'Relevance',
      'Start with a clear statement.',
      signals,
      topic,
    );
    expect(copy).toContain('Start over with one English sentence');
  });

  test('calculates correct filler words count and hedges', () => {
    const topic = 'Tell me about yourself';
    const transcript =
      'Um, well, like, basically I guess maybe I am an engineer, you know, kind of working on AI.';
    const signals = collectSignals(transcript, topic, 30);

    expect(signals.fillerCount).toBeGreaterThanOrEqual(3);
    expect(signals.hedgeCount).toBeGreaterThanOrEqual(2);
    expect(signals.vagueCount).toBeGreaterThanOrEqual(1);

    const detail = weaknessDetail('Fluency', signals);
    expect(detail).toContain('Fillers');
  });

  test('clampScore keeps scores within bounds [8, 94]', () => {
    expect(clampScore(-50)).toBe(8);
    expect(clampScore(120)).toBe(94);
    expect(clampScore(75.4)).toBe(75);
  });
});

test.describe('Analysis Engine Modes', () => {
  test('generates debate mode metrics when category is debate', () => {
    const result = analyzeLocally({
      topic: 'Social media does more harm than good',
      category: 'debate',
      transcript:
        'I believe social media does more harm than good. First, mental health studies show severe increases in anxiety. For example, last year teen screen time peaked. However, proponents argue it connects people. In conclusion, project based regulation is essential.',
      duration: 60,
    });

    expect(result.mode_metrics).toBeDefined();
    expect(result.mode_metrics!['Argument quality']).toBeDefined();
    expect(result.mode_metrics!['Rebuttal']).toBeGreaterThanOrEqual(70);
  });

  test('generates storytelling mode metrics when category is storytelling', () => {
    const result = analyzeLocally({
      topic: 'Tell me about a time you failed',
      category: 'storytelling',
      transcript:
        'It was 3 AM when the production database dropped. I felt completely terrified and worried. First, I alerted my team. For example, my manager helped restore the backup. Ultimately, we recovered with zero data loss.',
      duration: 75,
    });

    expect(result.mode_metrics).toBeDefined();
    expect(result.mode_metrics!['Hook']).toBeDefined();
    expect(result.mode_metrics!['Emotion']).toBe(80);
    expect(result.mode_metrics!['Ending']).toBe(84);
  });
});

test.describe('Custom Words & Rewards', () => {
  test('cleans and normalizes custom words for AssemblyAI', () => {
    const raw = ['  Vocalis ', 'AssemblyAI', 'Vocalis', '', 'AI agent'];
    const cleaned = cleanCustomWords(raw);

    expect(cleaned).toEqual(['Vocalis', 'AssemblyAI', 'AI agent']);
  });

  test('computes rewards, streak, and bonus points correctly', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        date: new Date().toISOString(),
        category: 'everyday-life',
        topic: 'Morning routine',
        duration: 45,
        transcript: 'Sample text with enough words for practice session.',
        analysis: {
          overall_score: 80,
          metrics: {
            Clarity: 80,
            Structure: 80,
            Fluency: 80,
            Vocabulary: 80,
            Relevance: 80,
            Spontaneity: 80,
            Confidence: 80,
            Conciseness: 80,
          },
          strengths: [],
          mistakes: [],
          filler_words: [],
          weak_areas: [],
          improvement_techniques: [],
          coach_feedback: 'Good job',
          recommended_next_prompt: 'Next',
          words: 45,
          provider: 'local',
        },
        demo: false,
      },
    ];

    const rewards = getRewards(sessions, 0);
    expect(rewards.earned).toBe(10); // Beginner category session earns 10 pts
    expect(rewards.balance).toBe(10);
  });
});
