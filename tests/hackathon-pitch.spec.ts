import { test, expect } from '@playwright/test';
import { categories, getCategory } from '../src/data/topics';
import { analyzeLocally } from '../src/services/analysis';
import { cleanCustomWords } from '../src/data/custom-words';

test.describe('Hackathon Pitch Training Mode', () => {
  test('registers hackathon-pitch category with required structure', () => {
    const category = getCategory('hackathon-pitch');
    expect(category).toBeDefined();
    expect(category.id).toBe('hackathon-pitch');
    expect(category.name).toBe('Hackathon Pitch');
    expect(category.prompts.length).toBeGreaterThanOrEqual(4);
    expect(categories.some((c) => c.id === 'hackathon-pitch')).toBe(true);
  });

  test('analyzes a hackathon pitch and calculates pitch-specific metrics', () => {
    const pitch =
      'Good afternoon judges. Millions of builders struggle to practice public speaking in a realistic setting. That is why we built Vocalis, an AI voice agent that listens to your speech, analyzes your delivery with AssemblyAI, and coaches you in real time. For example, our live demo lets you rehearse your pitch and hear instant critiques. Ultimately, Vocalis transforms stage fright into confidence. We are excited to bring this solution to millions of creators.';

    const result = analyzeLocally({
      topic:
        'Deliver a 1-minute elevator pitch for your hackathon project: Hook, problem, solution, and impact.',
      category: 'hackathon-pitch',
      transcript: pitch,
      duration: 30,
    });

    expect(result.mode_metrics).toBeDefined();
    const mm = result.mode_metrics!;
    expect(mm['Problem & Solution']).toBeGreaterThanOrEqual(70);
    expect(mm['Pitch Structure']).toBeGreaterThanOrEqual(70);
    expect(mm['Demo & Evidence']).toBeGreaterThanOrEqual(70);
    expect(mm['Value & Impact']).toBeGreaterThanOrEqual(70);
    expect(mm['Pacing against clock']).toBeGreaterThanOrEqual(60);
  });

  test('supports custom keyterm injection for project names and technical terms', () => {
    const customProjectTerms = ['Vocalis', 'AssemblyAI', 'LeMUR', 'Voice Agent'];
    const cleaned = cleanCustomWords(customProjectTerms);
    expect(cleaned).toContain('Vocalis');
    expect(cleaned).toContain('AssemblyAI');
    expect(cleaned).toContain('Voice Agent');
  });
});
