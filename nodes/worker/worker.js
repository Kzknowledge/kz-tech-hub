const ALLOWED_ORIGIN = 'https://kz-tech-hub.vercel.app';
const CACHE_TTL = 86400; // 24 hours
const MAX_TOKENS = 1000;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS')
      return new Response(null, { headers: corsHeaders });

    try {
      const body = await req.json();

      // Check KV cache first
      const cacheKey = btoa(JSON.stringify(body.messages)).slice(0, 128);
      const cached = await env.KZ_CACHE.get(cacheKey);
      if (cached) {
        return new Response(cached, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json',
                     'X-KZ-Cache': 'HIT' }
        });
      }

      // Forward to Claude API
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.CLAUDE_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: MAX_TOKENS,
          ...body
        })
      });

      const data = await res.text();

      // Store in KV cache for 24h
      await env.KZ_CACHE.put(cacheKey, data, { expirationTtl: CACHE_TTL });

      return new Response(data, {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json',
                   'X-KZ-Cache': 'MISS' }
      });

    } catch (e) {
      return new Response(
        JSON.stringify({ error: e.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  }
};
