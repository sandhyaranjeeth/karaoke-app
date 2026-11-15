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

  // if (groupPin && pin !== groupPin) {
  //   return res.status(401).json({ error: 'Invalid Group PIN. Check with the admin.' });
  // }

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
    excludeRule;

  try {
    const response = await fetch(
      'https://googleapis.com',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
          'Api-Revision': '2026-05-20'
        },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          input: prompt,
          generation_config: {
            temperature: 0.8
          },
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  movie_or_album: { type: 'string' },
                  singers: { type: 'string' },
                  type: { type: 'string', enum: ['Solo', 'Duet'] },
                  director: { type: 'string' },
                  actor: { type: 'string' }
                },
                required: ['title', 'movie_or_album', 'singers', 'type', 'director', 'actor']
              }
            }
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error((data.error && data.error.message) || 'Gemini API error');
    }

    const modelStep = data.steps ? data.steps.find((step) => step.type === 'model_output') : null;
    const textBlock = modelStep && modelStep.content
      ? modelStep.content.find((block) => block.type === 'text')
      : null;
    const rawText = (textBlock && textBlock.text) || '[]';
    const songs = JSON.parse(rawText);

    return res.status(200).json({ songs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
