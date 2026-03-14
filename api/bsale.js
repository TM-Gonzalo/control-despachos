// api/bsale.js — Vercel Edge Function proxy para Bsale API
// El token de Bsale vive server-side y nunca llega al cliente

export const config = { runtime: "edge" };

const BSALE_TOKEN = process.env.BSALE_API_TOKEN;
const BSALE_BASE  = "https://api.bsale.cl/v1";
const ALLOWED_ORIGIN = "https://control-despachos-eight.vercel.app";

export default async function handler(req) {
  const origin = req.headers.get("origin") || "";
  const isAllowed = origin === ALLOWED_ORIGIN || origin.endsWith(".vercel.app") || origin.includes("localhost");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (!isAllowed) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  if (!BSALE_TOKEN) {
    return new Response(JSON.stringify({ error: "Token Bsale no configurado" }), { status: 500 });
  }

  // Obtener el path a consultar desde query param: /api/bsale?path=/documents.json&...
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/documents.json";
  
  // Reenviar todos los query params excepto "path"
  const params = new URLSearchParams();
  for (const [k, v] of url.searchParams.entries()) {
    if (k !== "path") params.append(k, v);
  }

  const bsaleUrl = `${BSALE_BASE}${path}${params.toString() ? "?" + params.toString() : ""}`;

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
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
