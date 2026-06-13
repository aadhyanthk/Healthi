import { GoogleGenerativeAI } from '@google/generative-ai';

// Prefer Vite-exposed env vars (must start with VITE_). Support both the
// original `VITE_GEMINI_API_KEY` and the new `VITE_HealthiApiKey` name.
// As a last resort allow runtime injection via `window.__HEALTHI_API_KEY`.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  || import.meta.env.VITE_HealthiApiKey
  || import.meta.env.HealthiApiKey
  || (typeof window !== 'undefined' ? window.__HEALTHI_API_KEY : null);
let genAI = null;

async function generateWithFallback(prompt) {
  if (!genAI) genAI = new GoogleGenerativeAI(apiKey);

  const modelsToTry = [
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
  ];

  let lastError;
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      // Validate that result has required structure
      if (!result?.response) {
        console.warn(`[Gemini] ${modelName} returned invalid response structure`);
        continue;
      }
      return result;
    } catch (err) {
      console.warn(`[Gemini] ${modelName} failed:`, err.message);
      lastError = err;
      // Abort immediately on auth errors
      if (err.status === 401 || err.status === 403) throw err;
    }
  }
  throw lastError || new Error('All Gemini models failed');
}

/**
 * Parses a raw text log into structured JSON data.
 * @param {string} text - User's raw input.
 * @returns {Promise<Object>} - The parsed JSON data.
 */
export async function parseWellnessLog(text) {
  if (!apiKey) {
    return parseWellnessLogLocally(text);
  }

  const prompt = `
    You are a medical parser for a wellness app. 
    Analyze the following user input and return a JSON object with strictly these keys:
    - "symptoms": an array of strings (e.g., ["joint pain", "headache"]). Empty array if none.
    - "sleep": string description of sleep quality (e.g., "poor", "good", "none mentioned").
    - "diet_notes": string description of diet/food mentioned.
    - "severity": string ("low", "medium", "high") based on the language used.
    - "summary": A short 1-sentence summary of the entry.

    IMPORTANT: Return ONLY valid JSON, without markdown formatting or code blocks.
    
    User Input: "${text}"
  `;

  try {
    const result = await generateWithFallback(prompt);
    if (!result?.response) {
      throw new Error('Invalid response structure from Gemini API');
    }
    const responseText = result.response.text();
    if (!responseText) {
      throw new Error('Empty response text from Gemini API');
    }
    // Clean up potential markdown formatting if the model still includes it
    const cleanText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    if (!cleanText) {
      throw new Error('Response became empty after cleaning');
    }
    try {
      const parsed = JSON.parse(cleanText);
      // Validate that all required fields exist
      if (!Array.isArray(parsed.symptoms)) {
        parsed.symptoms = [];
      }
      if (!parsed.sleep) {
        parsed.sleep = 'none mentioned';
      }
      if (!parsed.diet_notes) {
        parsed.diet_notes = 'none mentioned';
      }
      if (!parsed.severity || !['low', 'medium', 'high'].includes(parsed.severity)) {
        parsed.severity = 'medium';
      }
      if (!parsed.summary) {
        parsed.summary = text.substring(0, 100);
      }
      return parsed;
    } catch (parseError) {
      console.error("JSON parse error - response was:", cleanText);
      throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
    }
  } catch (error) {
    console.error("Error parsing wellness log with Gemini:", error.message);
    console.log("Falling back to local parser");
    return parseWellnessLogLocally(text);
  }
}

/**
 * Generates predictive insights based on historical logs.
 * @param {Array} historyData - Array of parsed log objects.
 * @returns {Promise<string>} - A 2-sentence pattern recognition insight.
 */
export async function getPredictiveInsights(historyData) {
  if (!historyData || historyData.length === 0) {
    return "Not enough data yet to provide insights. Keep logging your daily wellness!";
  }

  if (!apiKey) {
    return getLocalPredictiveInsight(historyData);
  }

  const prompt = `
    You are a helpful, reassuring predictive analyst for a daily wellness app designed for the elderly.
    Analyze the following 14-day log history and provide a plain-english insight.
    Identify any simple correlations between their symptoms, sleep, and diet.
    Do NOT offer strict medical advice or diagnoses. Keep it to exactly two friendly, reassuring sentences.
    
    Log History (JSON):
    ${JSON.stringify(historyData)}
  `;

  try {
    const result = await generateWithFallback(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Error generating insights with Gemini:", error);
    return getLocalPredictiveInsight(historyData);
  }
}

function parseWellnessLogLocally(text) {
  const lower = text.toLowerCase();
  const knownSymptoms = [
    'headache',
    'fever',
    'dizziness',
    'nausea',
    'cough',
    'fatigue',
    'pain',
    'ache',
    'tired',
    'weakness',
    'shortness of breath'
  ];
  const symptoms = knownSymptoms.filter((symptom) => lower.includes(symptom));
  const sleepMatch = lower.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h)\b/);
  const severity = /(severe|very bad|intense|unbearable|worst|emergency)/.test(lower)
    ? 'high'
    : /(mild|little|brief|slight|minor)/.test(lower) ? 'low' : symptoms.length ? 'medium' : 'low';

  // Match the exact schema expected by Gemini API response
  return {
    symptoms,
    sleep: sleepMatch ? `${sleepMatch[1]} hours mentioned` : lower.includes('sleep') ? 'Sleep mentioned' : 'none mentioned',
    diet_notes: /(breakfast|lunch|dinner|meal|food|ate|skipped)/.test(lower) ? 'Food or meal mentioned' : 'none mentioned',
    severity,
    summary: text.length > 86 ? `${text.slice(0, 83)}...` : text
  };
}

function getLocalPredictiveInsight(historyData) {
  const logs = historyData || [];
  const poorSleepWithSymptoms = logs.filter((log) => {
    const sleep = String(log.parsed_data?.sleep || log.sleep || '').toLowerCase();
    const symptoms = log.parsed_data?.symptoms || log.symptoms || [];
    return symptoms.length && (/([1-5])\s*hours?/.test(sleep) || sleep.includes('poor') || sleep.includes('restless'));
  }).length;
  const activeDays = logs.filter((log) => {
    // Look for activity in raw_text since parsed_data no longer contains activity field
    const text = (log.raw_text || '').toLowerCase();
    return /walk|exercise|active|movement/.test(text);
  }).length;

  if (poorSleepWithSymptoms >= 2) {
    return 'Several symptom logs happened after poor or short sleep. Keep logging sleep and symptoms so this pattern stays visible for your care team.';
  }
  if (activeDays >= 2) {
    return 'Your recent logs mention movement on multiple days. Continue tracking activity alongside symptoms so Healthi can show clearer trends over time.';
  }
  return 'Healthi saved your recent logs and can still summarize patterns without the AI service. Keep logging sleep, symptoms, diet, and health readings to make future insights clearer.';
}
