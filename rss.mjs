export const config = { path: "/api/rss" };

const FEED_URL = "https://news.google.com/rss/search?q=Bayern+Munich&hl=en-US&gl=US&ceid=US:en";

export default async () => {
  try {
    const res = await fetch(FEED_URL, {
      headers: {
        "user-agent": "Mozilla/5.0 BayernBriefing/1.0",
        "accept": "application/rss+xml, application/xml, text/xml"
      }
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=900"
      }
    });
  } catch (error) {
    return new Response(`<error>${String(error.message || error)}</error>`, {
      status: 500,
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
};
