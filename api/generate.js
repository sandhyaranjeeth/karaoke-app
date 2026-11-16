import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pin, language, type, singer, director, actor, mood, exclude } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  // const groupPin = process.env.GROUP_PIN;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing GEMINI_API_KEY' });
  }

  // if (groupPin && pin !== groupPin) {
  //   return res.status(401).json({ error: 'Invalid Group PIN. Check with the admin.' });
  // }

  const ai = new GoogleGenAI({ apiKey });

  const excludeRule =
    exclude && exclude.length > 0
      ? `\n- Do NOT include any of these already listed songs: ${exclude.join(', ')}`
      : '';

  const prompt = `Suggest 10 popular, crowd-pleasing karaoke songs matching these criteria:
- Language: ${language || 'Kannada or Hindi'}
- Format: ${type || 'Any (Solo or Duet)'}
- Singer(s): ${singer || 'Any'}
- Music Director: ${director || 'Any'}
- Actor/Actress: ${actor || 'Any'}
- Era / Vibe: ${mood || 'Any'}${excludeRule}

Return ONLY a valid JSON array of objects with no markdown formatting or backticks.
Each object must use these exact keys:
"title", "movie_or_album", "singers", "type" ("Solo" or "Duet"), "director", "actor"`;

  try {
    const interaction = await ai.interactions.create({
      model: process.env.GEMINI_MODEL,
      input: prompt
    });

    const cleanJson = interaction.output_text
      .replace(/```json\s*/gi, '')
      .replace(/```/g, '')
      .trim();

    const songs = JSON.parse(cleanJson);
    return res.status(200).json({ songs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
