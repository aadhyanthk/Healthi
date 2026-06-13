import { describe, expect, it } from 'vitest';
import { getPredictiveInsights, parseWellnessLog } from '../src/services/gemini.js';

describe('Gemini service fallbacks', () => {
  it('parses wellness logs without requiring a Gemini key', async () => {
    const result = await parseWellnessLog('I slept 5 hours and had a mild headache after skipping breakfast.');

    expect(result.symptoms).toContain('headache');
    expect(result.sleep).toContain('5');
    expect(result.severity).toBe('low');
    expect(result.summary).toContain('mild headache');
  });

  it('returns usable insights without requiring a Gemini key', async () => {
    const insight = await getPredictiveInsights([
      { parsed_data: { symptoms: ['headache'], sleep: '5 hours, restless' } },
      { parsed_data: { symptoms: ['fatigue'], sleep: '4 hours, poor' } }
    ]);

    expect(insight).toMatch(/sleep|symptom/i);
    expect(insight).not.toMatch(/api key/i);
  });
});
