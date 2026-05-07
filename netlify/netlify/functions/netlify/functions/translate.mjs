xport const config = { path: "/api/translate" };

const buckets = new Map();

function cors(origin = "") {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
}

function json(body, status = 200, origin = "") {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}

function limited(ip, max = 18, windowMs = 60_000) {
  const now = Date.now();
  const hits = (buckets.get(ip) || []).filter(t => now - t < windowMs);
  if (hits.length >= max) return true;
  hits.push(now);
  buckets.set(ip, hits);
  return false;
}

export default async (req) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "unknown";
  if (limited(ip)) return json({ error: "Too many requests. Try again shortly." }, 429, origin);

  const body = await req.json().catch(() => ({}));
  const texts = Array.isArray(body.texts) ? body.texts : [];
  const valid = texts.length > 0 && texts.length <= 8 && texts.every(t => typeof t === "string" && t.trim() && t.length <= 260);
  if (!valid) return json({ error: "Invalid texts payload" }, 400, origin);

  const apiKey = globalThis.Netlify?.env?.get("ANTHROPIC_API_KEY") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "Missing ANTHROPIC_API_KEY in Netlify environment variables" }, 500, origin);

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{
          role: "user",
          content:
            'Translate these Bayern Munich / football news headlines into natural Arabic suitable for a news app. Return strict JSON only in this exact shape: {"translations":["..."]}. Keep names recognizable.\n' +
            JSON.stringify(texts)
        }]
      })
    });

    const requestId = upstream.headers.get("request-id") || null;
    const raw = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return json({ error: raw.error?.message || "Claude request failed", type: raw.error?.type || "upstream_error", requestId }, upstream.status, origin);
    }

    const text = raw.content?.find(p => p.type === "text")?.text || "{}";
    let parsed = {};
    try { parsed = JSON.parse(text); } catch { parsed = { translations: [] }; }
    const translations = Array.isArray(parsed.translations) ? parsed.translations.slice(0, texts.length) : [];
    return json({ translations, requestId }, 200, origin);
  } catch (error) {
    return json({ error: String(error.message || error) }, 500, origin);
  }
};
