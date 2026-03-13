// api/claude.js — Vercel Serverless Function
// La API Key de Anthropic vive aquí (server-side) y NUNCA llega al cliente.
// Configurar en Vercel: Project Settings → Environment Variables → ANTHROPIC_API_KEY

export const config = { runtime: "edge" };

const ALLOWED_ORIGIN = "https://control-despachos-eight.vercel.app";
const ANTHROPIC_URL  = "https://api.anthropic.com/v1/messages";

export default async function handler(req) {
  // CORS — solo acepta peticiones del propio dominio
  const origin = req.headers.get("origin") || "";
  const isAllowed = origin === ALLOWED_ORIGIN || origin.endsWith(".vercel.app");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(isAllowed ? origin : ALLOWED_ORIGIN),
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isAllowed) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key no configurada en el servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validación mínima: solo permite el modelo y parámetros esperados
  if (!body.messages || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ error: "Payload inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Forzar modelo y límites — el cliente no puede cambiarlos
  const payload = {
    model:      "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system:     body.system || "Eres un extractor de datos de PDFs. Responde SOLO JSON valido, sin texto adicional.",
    messages:   body.messages,
  };

  const upstream = await fetch(ANTHROPIC_URL, {
    method:  "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  const data = await upstream.json();

  return new Response(JSON.stringify(data), {
    status: upstream.status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin":  origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
