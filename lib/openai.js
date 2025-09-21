import OpenAI from 'openai';

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

export async function transcribeWithWhisper(filePath) {
  const client = getOpenAI();
  const fs = await import('fs');
  
  console.log('transcribeWithWhisper called with filePath:', filePath);
  console.log('File exists:', fs.existsSync(filePath));
  
  const fileStream = fs.createReadStream(filePath);
  console.log('Created ReadStream:', fileStream.constructor.name);
  console.log('ReadStream readable:', fileStream.readable);
  console.log('ReadStream path:', fileStream.path);
  
  try {
    // Use createReadStream as shown in OpenAI docs
    const transcription = await client.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });
    return transcription;
  } catch (error) {
    console.error('OpenAI transcription error:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    throw error;
  }
}

export async function extractLocationsWithTimestamps(transcriptText, generalLocations) {
  const client = getOpenAI();
  const locationContext = generalLocations.join(', ');
  const system = `You are an assistant that extracts travel and location information from video captions. You have expert knowledge of ${locationContext} and can correct common misspellings of local landmarks, businesses, and attractions.`;
  const user = `Given the following video captions from a trip to ${locationContext}, identify all the places the speaker goes to or mentions visiting.

IMPORTANT: Use your knowledge of ${locationContext} to correct any misspellings or variations of well-known local places. For example:
- "Redding Terminal Market" should be "Reading Terminal Market" (Philadelphia)
- "Elthris Alley" should be "Elfreth's Alley" (Philadelphia)
- "Times Square" should be "Times Square" (New York)
- Use proper capitalization and spelling for all landmarks

For each place, return the following in JSON format:
- name: Correct name of the place (properly spelled)
- address: Address (if stated, otherwise null)
- coordinates: Coordinates (if available, otherwise null) 
- timeStartSec: Start timestamp in seconds (parse from [start->end] format)
- timeEndSec: End timestamp in seconds (parse from [start->end] format)
- mention: The exact text mentioning the location
- context: Surrounding context

Return as JSON object with "locations" array.

Captions with timestamps (format: [start->end] text):
${transcriptText}`;

  console.log('=== OpenAI NER Request ===');
  console.log('System:', system);
  console.log('User prompt length:', user.length);
  
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    response_format: { type: 'json_object' }
  });
  
  console.log('OpenAI response:', res.choices[0].message.content);
  
  try {
    const content = res.choices[0].message.content || '{}';
    const data = JSON.parse(content);
    const locations = data.locations || data.items || data.results || [];
    console.log('Parsed locations:', locations);
    return locations;
  } catch (e) {
    console.error('JSON parse error:', e);
    return [];
  }
}
