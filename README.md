# Saturday Karaoke Setlist Generator

## Local Setup
1. Run `npm install` to install `@google/genai`.
2. Copy `.env.example` to `.env` and set your `GEMINI_API_KEY` and `GROUP_PIN`.
3. Run `node server.js` and open `http://localhost:3000`.

## GitHub & Vercel Deployment
1. Push this folder to a GitHub repository (`.gitignore` prevents `.env` from being uploaded).
2. Import the repository into Vercel.
3. In Vercel Project **Settings > Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Google AI Studio API key
   - `GROUP_PIN`: Your Saturday group PIN
4. Deploy and share your Vercel URL in WhatsApp.
