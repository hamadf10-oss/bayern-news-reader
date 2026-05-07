Bayern Briefing - Netlify Version

Files included:
- index.html
- netlify/functions/rss.mjs
- netlify/functions/article-meta.mjs
- netlify/functions/translate.mjs
- netlify.toml

Important:
Translation will only work after you add ANTHROPIC_API_KEY in Netlify:
Site settings -> Environment variables -> Add variable -> ANTHROPIC_API_KEY
Then redeploy the site.

Recommended deployment:
Upload this folder to GitHub and connect it to Netlify, or use Netlify CLI.
Dragging only index.html will not deploy the functions.
