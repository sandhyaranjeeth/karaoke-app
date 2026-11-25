import { GoogleGenAI, Type } from '@google/genai';

const isSet = (v) => v && String(v).trim() && !/^any\b/i.test(String(v).trim());

const SYSTEM_INSTRUCTION = `You are an expert on Indian film music (Kannada, Hindi, and other industries) helping people pick karaoke songs. Accuracy matters more than quantity: a wrong movie, singer, or composer credit is worse than a missing field.`;

const SONG_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      movie_or_album: { type: Type.STRING },
      singers: { type: Type.STRING },
      type: { type: Type.STRING, enum: ['Solo', 'Duet'] },
      director: { type: Type.STRING, nullable: true },
      actor: { type: Type.STRING, nullable: true },
      confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
    },
    required: ['title', 'movie_or_album', 'singers', 'type', 'confidence'],
  },
};

function buildPrompt({ language, type, singer, director, actor, mood, exclude }) {
  const filters = [
    `Language: ${isSet(language) ? language : 'Kannada or Hindi'}`,
    isSet(type) && `Format: ${type} only`,
    isSet(singer) && `Singer(s): ${singer}`,
    isSet(director) && `Music Director: ${director}`,
    isSet(actor) && `Actor/Actress on screen: ${actor}`,
    isSet(mood) && `Era / Vibe: ${mood}`,
  ]
    .filter(Boolean)
    .join('\n- ');

  const excludeRule =
    Array.isArray(exclude) && exclude.length > 0
      ? `7. Do NOT include any of these already listed songs: ${exclude.join(', ')}`
      : '';

  return `Suggest 12 karaoke songs.

HARD constraints (every song must satisfy these):
- ${filters}

RULES:
1. Pick only songs you are highly confident exist and that you know the correct credits for. Prefer famous, widely-loved hits that crowds sing along to, with a hook that's easy to sing in a group.
2. Do NOT invent or guess. If you're unsure of a field (e.g. actor), use null. If you're unsure the song itself exists, leave it out.
3. If a singer/director/actor filter is given, the song must genuinely match it. If fewer than 12 real matches exist, return fewer rather than padding with loose matches.
4. "type" is "Duet" only if two singers perform it together; otherwise "Solo".
5. Use the official film title and the commonly used English transliteration of the song title.
6. No duplicate songs.
${excludeRule}

Give each song a "confidence" of "high", "medium", or "low" reflecting how sure you are about the credits.`;
}

// Optional second pass: check credits with Google Search and fix or drop wrong entries.
async function verifySongs(ai, model, songs) {
  const response = await ai.models.generateContent({
    model,
    contents: `Verify this list of Indian film songs using web search. For each song, confirm the movie, singers, music director and lead actor. Fix any wrong credits. Remove any song you cannot confirm exists. Return ONLY a JSON array with the same keys as the input, no markdown.\n\n${JSON.stringify(songs)}`,
    config: {
      temperature: 0.1,
      tools: [{ googleSearch: {} }],
    },
  });
  const clean = response.text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const verified = JSON.parse(clean);
  return Array.isArray(verified) ? verified : songs;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing GEMINI_API_KEY' });
  }

  const model = process.env.GEMINI_MODEL;
  if (!model) {
    return res.status(500).json({ error: 'Server missing GEMINI_MODEL' });
  }

  const body = req.body || {};
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: buildPrompt(body),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: SONG_SCHEMA,
      },
    });

    let songs = JSON.parse(response.text);

    // Optional: set VERIFY_WITH_SEARCH=true in env to enable (slower, uses more quota)
    if (process.env.VERIFY_WITH_SEARCH === 'true') {
      try {
        songs = await verifySongs(ai, model, songs);
      } catch (e) {
        console.warn('Verification failed, using unverified list:', e.message);
      }
    }

    // Drop low-confidence entries and anything already shown to the user
    const excluded = new Set(
      (body.exclude || []).map((s) => String(s).toLowerCase().trim())
    );

    const seen = new Set();
    songs = songs
      .filter((s) => s.confidence !== 'low')
      .filter((s) => {
        const key = s.title.toLowerCase().trim();
        if (excluded.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);

    return res.status(200).json({ songs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
