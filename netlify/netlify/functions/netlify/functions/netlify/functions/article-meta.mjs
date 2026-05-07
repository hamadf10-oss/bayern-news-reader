export const config = { path: "/api/article-meta" };

function pickMeta(html, finalUrl) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/i
  ];
  for (const p of patterns) {
    const match = html.match(p);
    if (match?.[1]) {
      try { return new URL(match[1].replace(/&amp;/g, "&"), finalUrl).href; } catch {}
    }
  }
  return "";
}

export default async (req) => {
  const url = new URL(req.url);
  const articleUrl = url.searchParams.get("url") || "";
  if (!/^https?:\/\//i.test(articleUrl)) {
    return Response.json({ image: "" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const res = await fetch(articleUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 BayernBriefing/1.0",
        "accept": "text/html,application/xhtml+xml"
      }
    });
    const html = await res.text();
    const image = pickMeta(html, res.url);
    return Response.json({ image }, { headers: { "Cache-Control": "public, max-age=21600" } });
  } catch (error) {
    return Response.json({ image: "", error: String(error.message || error) }, { status: 200, headers: { "Cache-Control": "public, max-age=600" } });
  }
};
