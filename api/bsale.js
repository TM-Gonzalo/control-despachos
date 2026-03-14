// api/bsale.js — Vercel Edge Function proxy para Bsale API

export const config = { runtime: "edge" };

const BSALE_TOKEN = process.env.BSALE_API_TOKEN;
const BSALE_BASE  = "https://api.bsale.cl/v1";

export default async function handler(req) {
  const origin = req.headers.get("origin") || "";

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (!BSALE_TOKEN) {
    return new Response(JSON.stringify({ error: "Token Bsale no configurado" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
    });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/documents.json";

  const params = new URLSearchParams();
  for (const [k, v] of url.searchParams.entries()) {
    if (k !== "path") params.append(k, v);
  }

  const bsaleUrl = `${BSALE_BASE}${path}${params.toString() ? "?" + params.toString() : ""}`;

  try {
    const upstream = await fetch(bsaleUrl, {
      method: "GET",
      headers: {
        "access_token": BSALE_TOKEN,
        "Content-Type": "application/json"
      }
    });

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
    });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
    });
  }
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
