export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pin, language, type, singer, director, actor, mood, exclude } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  const groupPin = process.env.GROUP_PIN;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing GEMINI_API_KEY' });
  }

  if (groupPin && pin !== groupPin) {
    return res.status(401).json({ error: 'Invalid Group PIN. Check with the admin.' });
  }

  const excludeRule =
    exclude && exclude.length > 0
      ? '\n- Do NOT include any of these already listed songs: ' + exclude.join(', ')
      : '';

  const prompt =
    'Suggest 10 popular, crowd-pleasing karaoke songs matching these criteria:\n' +
    '- Language: ' + (language || 'Kannada or Hindi') + '\n' +
    '- Format: ' + (type || 'Any (Solo or Duet)') + '\n' +
    '- Singer(s): ' + (singer || 'Any') + '\n' +
    '- Music Director: ' + (director || 'Any') + '\n' +
    '- Actor/Actress: ' + (actor || 'Any') + '\n' +
    '- Era / Vibe: ' + (mood || 'Any') +
    excludeRule +
    '\n\nReturn ONLY a valid JSON array of objects with no markdown formatting.\n' +
    'Each object must use these exact keys:\n' +
    '"title", "movie_or_album", "singers", "type" ("Solo" or "Duet"), "director", "actor"';

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.8
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error((data.error && data.error.message) || 'Gemini API error');
    }

    const firstCandidate = data.candidates ? data.candidates[0] : null;
    const firstPart = firstCandidate && firstCandidate.content && firstCandidate.content.parts
      ? firstCandidate.content.parts[0]
      : null;
    const rawText = (firstPart && firstPart.text) || '[]';
    const songs = JSON.parse(rawText);

    return res.status(200).json({ songs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
