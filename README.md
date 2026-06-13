# Healthi

Healthi is a daily wellness and symptom tracker web app designed for the elderly and those managing chronic conditions. Rather than causing panic with arbitrary scores, Healthi provides a visual "Health Ledger" timeline to spot trends and provide medical professionals with instant context.

## Hackathon Features
- **Frictionless Logging:** Natural language input via the "Invisible Parser".
- **Visual Health Ledger:** Clean, chronological timeline.
- **Smart Insights:** "Predictive Analyst" background AI that correlates sleep, diet, and symptoms.
- **Doctor Export:** 1-click printable chart and table for clinical context.

## Tech Stack
- **Frontend**: Vite + Vanilla JS + Vanilla CSS
- **Backend/Database**: Firebase (Authentication & Firestore)
- **Charts**: Chart.js
- **AI**: Google Gemini API (`@google/generative-ai`)

## Setup Instructions
1. Clone the repository
2. Run `npm install`
3. Create a `.env` file (or copy `.env.example`) and add your keys:
   ```env
   # Gemini / Healthi AI key (client-exposed for demo)
   # Preferred names: VITE_HealthiApiKey or VITE_GEMINI_API_KEY
   VITE_HealthiApiKey=your_gemini_api_key

   # Firebase configuration (required for Authentication & Firestore)
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

Vite will expose any `VITE_`-prefixed variable to the client. For production avoid embedding secret keys in client-side code — use a server-side proxy or Vercel Serverless Function to keep your API key secret.

Vercel deployment notes:
- Build command: `npm run build`
- Output directory: `dist`
- Set the same environment variables in Vercel Project → Settings → Environment Variables (use the `VITE_` names above).

If you want me to implement a simple Vercel serverless proxy to keep the Gemini key secret, tell me and I will add it.
4. Run `npm run dev` to start the local server.

## Testing
Unit tests are written with Vitest. Run `npm run test` or `npx vitest run`.
