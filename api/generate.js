// Vercel serverless function — server-side proxy for the Anthropic Messages API.
//
// Doel: de browser (index.html) roept ALLEEN dit endpoint aan, nooit rechtstreeks
// api.anthropic.com. De Anthropic API key leeft uitsluitend hier, als Vercel
// environment variable (ANTHROPIC_API_KEY) — hij komt nooit in client-side JS
// of in de GitHub repo terecht.
//
// Hardening: model, max_tokens en system prompt worden hier server-side vastgezet
// (niet overgenomen van de client) zodat een publiek, ongeauthenticeerd endpoint
// niet misbruikt kan worden voor willekeurige/dure Claude-calls. Alleen de
// category-specifieke user message uit de client wordt doorgestuurd.

const MODEL = "claude-sonnet-5"; // zelfde model als CONFIG.MODEL in index.html — hier aanpassen indien gewijzigd
const MAX_TOKENS = 1024;
const MAX_USER_MESSAGE_LENGTH = 4000;

const SYSTEM_PROMPT = `Je bent een expert social media strateeg gespecialiseerd in viral quiz content voor mobiliteitsmerken. Je schrijft vragen voor Umob — een Nederlandse mobiliteitsapp die alle deelvervoer-aanbieders in één app samenbrengt (20+ landen, 260+ steden, deelscooters/deelfietsen/deelauto's/OV/taxi).

Deze vragen worden gebruikt in TikTok/Reels-video's waar random voorbijgangers een draairad draaien en 3 vragen krijgen. Doel: 2/3 goed = giftcard.

REGELS voor virale vragen:
- Antwoord moet verrassend zijn ("wait, echt?") of controversieel genoeg om comments te triggeren
- Geen droge feitjes zonder karakter
- Multiple choice met 3 opties (A/B/C) waar minstens 2 opties plausibel klinken
- Geen inside jokes, geen technisch jargon
- Passen in ~10 seconden voorlezen (vraag + opties)
- Weetjes-zin na antwoord moet een "oh nice" moment geven voor de host om te zeggen

FORMAT (return exact JSON, geen extra tekst):
{
  "question": "de vraagtekst",
  "options": {"A": "...", "B": "...", "C": "..."},
  "correct": "A" | "B" | "C",
  "fact": "korte weetjes-zin die de host na het antwoord kan zeggen (max 20 woorden)",
  "type": "umob" | "adjacent",
  "difficulty": "makkelijk" | "middel" | "moeilijk"
}`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: {
        message: "Server niet geconfigureerd: ANTHROPIC_API_KEY ontbreekt in de Vercel environment variables."
      }
    });
    return;
  }

  const body = req.body || {};
  const userMessage =
    body.messages && body.messages[0] && typeof body.messages[0].content === "string"
      ? body.messages[0].content
      : null;

  if (!userMessage || !userMessage.trim()) {
    res.status(400).json({ error: { message: "Ontbrekende of ongeldige user message." } });
    return;
  }
  if (userMessage.length > MAX_USER_MESSAGE_LENGTH) {
    res.status(400).json({ error: { message: "User message te lang." } });
    return;
  }

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }]
      })
    });
  } catch (networkErr) {
    res.status(502).json({ error: { message: "Kon de Anthropic API niet bereiken." } });
    return;
  }

  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) {
    res.setHeader("retry-after", retryAfter);
  }

  let data;
  try {
    data = await upstream.json();
  } catch (parseErr) {
    data = { error: { message: "Ongeldig antwoord van de Anthropic API." } };
  }

  res.status(upstream.status).json(data);
};
