import React, { useState, useEffect, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const TM_LOGO_B64 = "data:image/png;base64,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";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDVzhS67u-p34tUbe6CmSf4M802CUvEBSk",
  authDomain: "control-despachos-6ff25.firebaseapp.com",
  projectId: "control-despachos-6ff25",
  storageBucket: "control-despachos-6ff25.firebasestorage.app",
  messagingSenderId: "737509912296",
  appId: "1:737509912296:web:748c1f21f26b93e90da35d"
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

// Storage adapter: Firestore como backend principal, localStorage como caché
const storage = {
  get: async (key) => {
    try {
      const snap = await getDoc(doc(db, "storage", key));
      if (snap.exists()) return { value: snap.data().value };
    } catch(e) { console.warn("Firestore get error:", e); }
    const v = localStorage.getItem(key);
    return v ? { value: v } : null;
  },
  set: async (key, value) => {
    try {
      await setDoc(doc(db, "storage", key), { value, updatedAt: Date.now() });
      localStorage.setItem(key, value);
    } catch(e) {
      console.warn("Firestore set error, guardando en localStorage:", e);
      localStorage.setItem(key, value);
    }
  }
};

async function loadOCs() {
  try { const r = await storage.get("ocs-v3"); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
}
async function saveOCs(ocs) {
  try { await storage.set("ocs-v3", JSON.stringify(ocs)); } catch(e) { console.error(e); }
}

// Hash de contraseña usando Web Crypto API (SHA-256)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "tm-salt-2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Escuchar cambios en tiempo real desde Firestore
function subscribeOCs(callback) {
  return onSnapshot(doc(db, "storage", "ocs-v3"), (snap) => {
    if (snap.exists()) {
      try { callback(JSON.parse(snap.data().value)); } catch(e) {}
    }
  }, (err) => console.warn("onSnapshot error:", err));
}

// Bsale API helper — llama al proxy Edge Function
async function fetchBsale(path, params = {}) {
  const qs = new URLSearchParams({ path, ...params }).toString();
  const res = await fetch(`/api/bsale?${qs}`);
  if (!res.ok) throw new Error("Error consultando Bsale");
  return res.json();
}

async function extractPDF(b64, type) {
  const prompts = {
    oc: `Extrae los datos de esta Orden de Compra. CONTEXTO IMPORTANTE: el receptor de esta OC es siempre "Total Metal" o "Industrial y Comercial Total Metal" (el proveedor). El campo "client" debe ser la empresa DIFERENTE a Total Metal que aparece como emisora o compradora. Busca el nombre del cliente en el encabezado como "Empresa:", "Razon Social:", "De:", "Cliente:", o en el bloque de datos del comprador/emisor. NUNCA uses "Total Metal", "Industrial y Comercial Total Metal" ni variantes como valor de "client". El campo "rut" debe ser el RUT de esa empresa cliente (busca "RUT:", "R.U.T.", "RUT Empresa", "NIT" o similar cerca del nombre del cliente); si no lo encuentras usa null. Para el campo "notes": extrae SOLO informacion operativa relevante como nombre de obra, OT, numero de proyecto, forma de pago, lugar de entrega o referencias internas. NO incluyas texto legal, instrucciones de facturacion electronica, terminos y condiciones ni notas de cumplimiento legal. Si no hay notas operativas relevantes, usa null. Responde SOLO JSON sin texto extra ni backticks: {"ocNumber":"string o null","client":"string","rut":"string o null","date":"YYYY-MM-DD o null","deliveryDate":"YYYY-MM-DD o null","items":[{"desc":"string","unit":"string","qty":0,"unitPrice":0}],"notes":"string o null"}`,
    nc: `Extrae los datos de esta Nota de Credito. El campo "refInvoice" es el numero de la FACTURA a la que se aplica la NC (busca "DOC. REFERENCIA", "Referencia", "Factura N°" o similar). El campo "unit" debe ser la unidad de medida (UN, KG, MT, etc), NO el precio. El precio unitario va en "unitPrice". "netTotal" es el monto NETO (sin IVA) y "total" es el monto total con IVA, ambos como numeros POSITIVOS. IMPORTANTE: todos los valores numericos sin puntos de miles. Responde SOLO JSON sin texto extra ni backticks: {"docNumber":"string o null","docType":"nc","date":"YYYY-MM-DD o null","refInvoice":"string o null","items":[{"desc":"string","unit":"string","qty":0,"unitPrice":0}],"netTotal":0,"total":0}`,
    dispatch: `Extrae los datos de este documento (factura, guia de despacho o nota de credito). El campo "unit" debe ser la unidad de medida (UN, KG, MT, etc), NO el precio. El precio unitario va en "unitPrice". Para facturas y NC, "netTotal" es el monto NETO (sin IVA) y "total" es el monto total con IVA, siempre como valores POSITIVOS. IMPORTANTE: todos los valores numericos (qty, unitPrice, netTotal, total) deben ser numeros enteros o decimales SIN puntos de miles ni separadores — por ejemplo 2463 NO 2.463, y 6090000 NO 6.090.000. Si el documento dice "NOTA DE CREDITO" o "NOTA DE CRÉDITO", el campo "docType" debe ser "nc" y el campo "refInvoice" debe contener el numero de la factura referenciada (busca "DOC. REFERENCIA", "Referencia" o similar); en ese caso "gdNumber" es null. Si es factura, extrae "gdNumber" con el numero de GD referenciada. Si es guia, "gdNumber" es null. Extrae el campo "ocNumber" con el numero de OC. Responde SOLO JSON sin texto extra ni backticks: {"docNumber":"string o null","docType":"factura o guia o nc","date":"YYYY-MM-DD o null","gdNumber":"string o null","refInvoice":"string o null","ocNumber":"string o null","items":[{"desc":"string","unit":"string","qty":0,"unitPrice":0}],"netTotal":0,"total":0}`
  };

  // Intenta primero el proxy seguro (API key server-side).
  // Si falla (ej. dev local sin /api), cae al fetch directo usando apiKey del cliente.
  const payload = {
    system: "Eres un extractor de datos de PDFs. Responde SOLO JSON valido, sin texto adicional.",
    max_tokens: 4000,
    messages: [{ role: "user", content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
      { type: "text", text: prompts[type] }
    ]}]
  };

  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Error en proxy Claude: " + res.status);

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content.map(c => c.text || "").join("");
  let parsed;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch(jsonErr) {
    // JSON truncado — intentar reparar agregando cierre
    const raw = text.replace(/```json|```/g, "").trim();
    try {
      // Intentar cerrar el JSON truncado
      const fixed = raw.replace(/,\s*$/, "") + "]}";
      parsed = JSON.parse(fixed);
    } catch(_e1) {
      try {
        const fixed2 = raw.replace(/,\s*$/, "") + "]}]}";
        parsed = JSON.parse(fixed2);
      } catch(_e2) {
        throw new Error("Respuesta JSON incompleta — OC con demasiados ítems. Intenta de nuevo.");
      }
    }
  }
  // Normalizar números chilenos: 2.463 → 2463, 1.234.567 → 1234567
  const fixNum = n => {
    if (typeof n !== "number") return n;
    const s = String(n);
    if (/^\d+\.\d{3}$/.test(s)) return Number(s.replace(".", ""));
    return n;
  };
  // Unidades válidas — cualquier otra cosa se reemplaza por "UN"
  const VALID_UNITS = new Set(["UN","KG","MT","M","M2","M3","LT","GL","CJ","PK","PAR","JGO","HR","DIA","MES","TON","GR","MM","CM","KM","PZA","SET","ROL","BLS","SAC","TB","BAR","VAR"]);
  const fixUnit = u => {
    if (!u) return "UN";
    const up = String(u).toUpperCase().trim();
    return VALID_UNITS.has(up) ? up : "UN";
  };
  if (parsed.items) parsed.items = parsed.items.map(it => { const rawUnit = String(it.unit || ""); const priceFromUnit = rawUnit.startsWith("$") ? Number(rawUnit.replace(/[$.,]/g, "")) : (!isNaN(Number(rawUnit)) && Number(rawUnit) > 0 ? Number(rawUnit) : 0); const unitPrice = fixNum(it.unitPrice) || priceFromUnit || 0; const unit = fixUnit(it.unit); return { ...it, qty: fixNum(it.qty), unitPrice, unit }; });
  if (parsed.netTotal) parsed.netTotal = fixNum(parsed.netTotal);
  if (parsed.total) parsed.total = fixNum(parsed.total);
  return parsed;
}

const toB64 = f => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = () => rej(new Error("Error leyendo"));
  r.readAsDataURL(f);
});

let _seq = 1;
const newId = () => "OC-" + String(++_seq).padStart(4, "0");
const today = () => new Date().toISOString().slice(0, 10);
const fmtCLP = n => "$" + Math.round(Number(n || 0)).toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtNum = n => Math.round(Number(n || 0)).toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const daysLeft = d => {
  if (!d) return null;
  return Math.round((new Date(d) - new Date(today())) / 86400000);
};
const ocStatus = (items, dispatches, oc) => {
  if (oc && oc._closedByMonto) return "closed";
  if (!items || !items.length) return "open";
  const tot = items.reduce((s, i) => s + Number(i.qty), 0);
  const dis = items.reduce((s, i) => s + Number(i.dispatched || 0), 0);
  if (dis === 0) return "open";
  if (dis < tot) return "partial";
  // 100% despachado — verificar monto facturado vs monto OC (monto tiene prioridad)
  const disp = dispatches || [];
  const montoOC = items.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice || 0), 0);
  if (montoOC === 0) return "closed";
  const calcNeto = d => {
    if (Number(d.netTotal || 0) > 0) return Number(d.netTotal);
    const netoItems = (d.items||[]).reduce((s,it) => {
      const rawUnit = String(it.unit || "");
      const priceFromUnit = Number(rawUnit.replace(/[$.,]/g,"")) > 0 ? Number(rawUnit.replace(/[$.,]/g,"")) : 0;
      const p = Number(it.unitPrice || 0) || priceFromUnit || 0;
      return s + (Number(it.qty)||0) * p;
    }, 0);
    if (netoItems > 0) return netoItems;
    return (d.items||[]).reduce((s,it) => {
      const ocIt = it.ocItemId ? items.find(o => o.id === it.ocItemId) : null;
      return s + (Number(it.qty)||0) * Number(ocIt?.unitPrice || 0);
    }, 0);
  };
  let montoFac = 0;
  const facNums = new Set();
  disp.forEach(d => {
    if (d.docType === "factura") { montoFac += calcNeto(d); if (d.number) facNums.add(String(d.number).trim()); }
  });
  disp.forEach(d => {
    if (d.docType === "guia" && d.invoiceNumber && d.invoiceDate && !facNums.has(String(d.invoiceNumber).trim())) montoFac += calcNeto(d);
  });
  disp.forEach(d => { if (d.docType === "nc") montoFac -= calcNeto(d); });
  // Si monto facturado >= 99% del monto OC → cerrada (independiente de GDs sin vincular)
  if ((montoFac / montoOC) >= 0.99) return "closed";
  // Monto insuficiente — hay GDs sin factura pendientes
  const normN = s => String(s).replace(/[\s.]/g, "");
  const pendingGuias = disp.filter(d => {
    if (d.docType !== "guia" || d.invoiceNumber) return false;
    return !disp.some(f => f.docType === "factura" && f.gdNumber && normN(f.gdNumber) === normN(d.number || ""));
  }).length;
  return pendingGuias > 0 ? "toinvoice" : "toinvoice";
};
const autoMatch = (desc, ocItems, unitPrice) => {
  // Normalizar: sin tildes, guiones entre alfanum pegados (A-325→A325), sin puntuación, minúsculas
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/([a-z0-9])-([a-z0-9])/g, "$1$2") // A-325 → A325, 3/4-10 → 3/410
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
  const stopwords = new Set(["de","la","el","en","y","a","x","nr","neg","nro","no","para","con"]);
  const tokens = s => norm(s).split(" ").filter(t => t.length > 1 && !stopwords.has(t));
  const numTokens = s => tokens(s).filter(t => /\d/.test(t));
  const wordTokens = s => tokens(s).filter(t => !/\d/.test(t));

  const nd = norm(desc);

  // 0. Match por precio unitario exacto (más confiable que texto)
  if (unitPrice && Number(unitPrice) > 0) {
    const priceMatch = ocItems.filter(i => Number(i.unitPrice) === Number(unitPrice));
    if (priceMatch.length === 1) return priceMatch[0].id; // único ítem con ese precio → match seguro
  }

  // 1. Exacto normalizado
  const exact = ocItems.find(i => norm(i.desc) === nd);
  if (exact) return exact.id;

  // 2. Inclusión
  const partial = ocItems.find(i => nd.includes(norm(i.desc)) || norm(i.desc).includes(nd));
  if (partial) return partial.id;

  // 3. Token matching con peso especial para números
  const descTokens = tokens(desc);
  const descNums = numTokens(desc);
  const descWords = wordTokens(desc);
  const descFirst = descTokens[0] || "";

  let bestId = null, bestScore = 0;
  for (const item of ocItems) {
    const itemTokens = tokens(item.desc);
    const itemNums = numTokens(item.desc);
    const itemWords = wordTokens(item.desc);
    const itemFirst = itemTokens[0] || "";

    // Score de palabras (sin números)
    const commonWords = descWords.filter(t => itemWords.some(it => it === t || it.startsWith(t) || t.startsWith(it))).length;
    const totalWords = new Set([...descWords, ...itemWords]).size;
    const wordScore = totalWords > 0 ? commonWords / totalWords : 0;

    // Score de números — penalización fuerte si hay números que no coinciden
    let numScore = 0;
    if (descNums.length > 0 && itemNums.length > 0) {
      const commonNums = descNums.filter(t => itemNums.some(it => it === t)).length;
      const missingNums = descNums.filter(t => !itemNums.some(it => it === t)).length;
      const extraNums = itemNums.filter(t => !descNums.some(it => it === t)).length;
      const totalNums = new Set([...descNums, ...itemNums]).size;
      numScore = totalNums > 0 ? commonNums / totalNums : 0;
      if (missingNums > 0 || extraNums > 0) numScore -= 0.4 * (missingNums + extraNums);
    } else if (descNums.length === 0 && itemNums.length === 0) {
      numScore = 0;
    }

    // Score combinado: palabras 50% + números 50% (si hay números en ambos)
    let score = descNums.length > 0 && itemNums.length > 0
      ? (wordScore * 0.5) + (numScore * 0.5)
      : wordScore;

    // Boost si la primera palabra coincide
    if (descFirst && itemFirst && (descFirst === itemFirst || descFirst.startsWith(itemFirst) || itemFirst.startsWith(descFirst))) {
      score += 0.10;
    }
    if (score > bestScore) { bestScore = score; bestId = item.id; }
  }
  // Umbral: 30% de tokens en común
  return bestScore >= 0.30 ? bestId : null;
};
const pc = p => p >= 100 ? "var(--lime)" : p > 0 ? "var(--gold)" : "var(--sky)";
const bCls = s => ({ open: "b-open", partial: "b-partial", closed: "b-closed", toinvoice: "b-toinvoice", warn: "b-warn" }[s] || "b-open");
const bLbl = s => ({ open: "Abierta", partial: "Parcial", closed: "Cerrada", toinvoice: "Por Facturar", warn: "Alerta" }[s] || s);

const G = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#0e0f12;--ink2:#171922;--ink3:#1f2230;--ink4:#272b3c;
  --line:#2a2e40;--line2:#3a3f58;--fog:#626b8a;--fog2:#8a94b4;
  --white:#eef0f8;--gold:#e8b84b;--gold2:#f5d070;
  --lime:#7fff5a;--sky:#4db8ff;--rose:#ff4d6d;--teal:#3dffc4;--violet:#a78bff;
  --fS:'Instrument Serif',serif;--fM:'Geist Mono',monospace;
}
[data-theme="dark"]{
  --ink:#0e0f12;--ink2:#171922;--ink3:#1f2230;--ink4:#272b3c;
  --line:#2a2e40;--line2:#3a3f58;--fog:#626b8a;--fog2:#8a94b4;
  --white:#eef0f8;--gold:#e8b84b;--gold2:#f5d070;
  --lime:#7fff5a;--sky:#4db8ff;--rose:#ff4d6d;--teal:#3dffc4;--violet:#a78bff;
}
[data-theme="light"]{
  --ink:#f0f2f7;--ink2:#ffffff;--ink3:#e8ecf4;--ink4:#dde2ee;
  --line:#c8cedf;--line2:#b0b8d0;--fog:#7a849e;--fog2:#4a5370;
  --white:#1a1f32;--gold:#b8860b;--gold2:#d4a017;
  --lime:#1a8c00;--sky:#0077cc;--rose:#cc1a36;--teal:#007a5a;--violet:#5b3fbf;
}
@media(prefers-color-scheme:light){:root:not([data-theme="dark"]){
  --ink:#f0f2f7;--ink2:#ffffff;--ink3:#e8ecf4;--ink4:#dde2ee;
  --line:#c8cedf;--line2:#b0b8d0;--fog:#7a849e;--fog2:#4a5370;
  --white:#1a1f32;--gold:#b8860b;--gold2:#d4a017;
  --lime:#1a8c00;--sky:#0077cc;--rose:#cc1a36;--teal:#007a5a;--violet:#5b3fbf;
}}
html,body{height:100%;background:var(--ink);color:var(--white);font-family:var(--fM);font-size:13px;transition:background .2s,color .2s}
.app{display:flex;height:100vh;overflow:hidden;width:100%}
.rail{width:210px;background:var(--ink2);border-right:1px solid var(--line);display:flex;flex-direction:column;flex-shrink:0;transition:width .2s ease;overflow:hidden}.rail.collapsed{width:0;border-right:none}
.rail-brand{padding:20px 18px 16px;border-bottom:1px solid var(--line);min-width:210px}
.rail-name{font-family:var(--fS);font-size:17px;color:var(--gold);line-height:1.15;font-style:italic}
.rail-tm{font-size:9px;letter-spacing:2px;color:var(--gold);opacity:.6;margin-top:1px}
.rail-sub{font-size:8px;letter-spacing:2.5px;color:var(--fog);margin-top:5px}
.rail-nav{padding:10px 0;flex:1;min-width:210px}
.rail-sec{font-size:8px;letter-spacing:2.5px;color:var(--fog);padding:12px 18px 4px}
.rail-item{display:flex;align-items:center;gap:9px;padding:9px 18px;font-size:11px;color:var(--fog2);cursor:pointer;border-left:2px solid transparent;transition:.12s}
.rail-item:hover{color:var(--white);background:var(--ink3)}
.rail-item.on{color:var(--gold);border-left-color:var(--gold);background:rgba(232,184,75,.06)}
.rail-foot{padding:13px 18px;border-top:1px solid var(--line);min-width:210px}
.rail-user{font-size:10px;color:var(--fog2)}
.rail-user strong{display:block;color:var(--white);margin-bottom:2px}
.rail-logout{font-size:9px;color:var(--fog);cursor:pointer;background:none;border:none;font-family:var(--fM);letter-spacing:1px;margin-top:5px;display:block;padding:0}
.rail-logout:hover{color:var(--rose)}
.rail-toggle{position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:600;width:18px;height:44px;background:var(--ink2);border:1px solid var(--line);border-left:none;border-radius:0 6px 6px 0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--fog);font-size:10px;transition:left .2s ease,color .12s,background .12s}.rail-toggle:hover{color:var(--white);background:var(--ink3)}.rail-toggle.open{left:210px}
.online-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);border-radius:20px;padding:2px 8px;font-size:8px;letter-spacing:0.8px;color:var(--lime);font-family:var(--fM);margin-bottom:6px}
.online-dot{width:5px;height:5px;border-radius:50%;background:var(--lime);box-shadow:0 0 4px var(--lime);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
.dash-copyright{text-align:center;padding:28px 0 10px;font-size:9px;color:var(--fog2);letter-spacing:1.2px;font-family:var(--fM);opacity:0.55}
.body{flex:1;min-width:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}.body::-webkit-scrollbar{width:5px}.body::-webkit-scrollbar-thumb{background:var(--line2);border-radius:99px}
*{scrollbar-width:thin;scrollbar-color:var(--line2) transparent}*::-webkit-scrollbar{width:5px;height:5px}*::-webkit-scrollbar-track{background:transparent}*::-webkit-scrollbar-thumb{background:var(--line2);border-radius:99px}*::-webkit-scrollbar-thumb:hover{background:var(--fog)}
.page{padding:26px 30px;width:100%;box-sizing:border-box}
.ph{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px}
.pt{font-family:var(--fS);font-size:32px;font-style:italic;color:var(--white);line-height:1}
.pt em{color:var(--gold)}
.pm{font-size:9px;letter-spacing:2px;color:var(--fog);margin-top:4px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:22px}
.kpi{background:var(--ink2);border:1px solid var(--line);border-radius:9px;padding:15px 17px;position:relative;overflow:hidden}
.kpi-bar{position:absolute;top:0;left:0;right:0;height:2px;border-radius:9px 9px 0 0}
.kpi-lbl{font-size:8px;letter-spacing:2.5px;color:var(--fog);margin-bottom:8px}
.kpi-n{font-family:var(--fS);font-size:38px;line-height:1.1}
.kpi-sub{font-size:9px;color:var(--fog);margin-top:4px}
.alert-bar{background:rgba(255,77,109,.06);border:1px solid rgba(255,77,109,.2);border-radius:9px;padding:12px 16px;margin-bottom:20px}
.alert-hd{font-size:8px;letter-spacing:3px;color:var(--rose);margin-bottom:7px}
.alert-row{display:flex;align-items:center;gap:8px;font-size:11px;padding:4px 0;border-top:1px solid rgba(255,77,109,.08)}
.alert-row:first-of-type{border-top:none}
.adot{width:5px;height:5px;border-radius:50%;background:var(--rose);flex-shrink:0}
.btn{padding:7px 15px;border-radius:6px;font-family:var(--fM);font-size:10px;letter-spacing:.8px;cursor:pointer;border:none;font-weight:500;transition:.12s;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.btn-gold{background:var(--gold);color:var(--ink);font-weight:600}.btn-gold:hover{background:var(--gold2)}
.btn-outline{background:transparent;color:var(--fog2);border:1px solid var(--line)}.btn-outline:hover{border-color:var(--line2);color:var(--white)}
.btn-ghost{background:var(--ink3);color:var(--fog2);border:1px solid var(--line)}.btn-ghost:hover{color:var(--white)}
.btn-sky{background:rgba(77,184,255,.1);color:var(--sky);border:1px solid rgba(77,184,255,.25)}.btn-sky:hover{background:rgba(77,184,255,.18)}
.btn-rose{background:rgba(255,77,109,.1);color:var(--rose);border:1px solid rgba(255,77,109,.22)}.btn-rose:hover{background:rgba(255,77,109,.18)}
.btn-teal{background:rgba(61,255,196,.08);color:var(--teal);border:1px solid rgba(61,255,196,.22)}.btn-teal:hover{background:rgba(61,255,196,.15)}
.btn-sm{padding:4px 10px;font-size:9px}.btn:disabled{opacity:.35;cursor:not-allowed}
.toolbar{display:flex;gap:8px;align-items:center;margin-bottom:14px}
.srch{flex:1;background:var(--ink2);border:1px solid var(--line);border-radius:6px;padding:8px 12px;font-family:var(--fM);font-size:11px;color:var(--white);outline:none}
.srch:focus{border-color:var(--gold)}.srch::placeholder{color:var(--fog)}
.fsel{background:var(--ink2);border:1px solid var(--line);border-radius:6px;padding:8px 11px;font-family:var(--fM);font-size:11px;color:var(--fog2);outline:none;cursor:pointer}
.tbl-card{background:var(--ink2);border:1px solid var(--line);border-radius:9px;overflow:hidden;overflow-x:auto;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}.tbl-card::-webkit-scrollbar{height:5px;width:5px}.tbl-card::-webkit-scrollbar-track{background:transparent}.tbl-card::-webkit-scrollbar-thumb{background:var(--line2);border-radius:99px}.tbl-card::-webkit-scrollbar-thumb:hover{background:var(--fog)}.tbl-card table{min-width:900px}.tbl-scroll{max-height:calc(100vh - 260px);overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}
table{width:100%;border-collapse:collapse}
thead{background:var(--ink3)}
th{padding:9px 14px;text-align:left;font-size:8px;letter-spacing:2.5px;color:var(--fog);font-weight:500}
td{padding:12px 14px;font-size:11px;border-top:1px solid var(--line);vertical-align:middle}
tr:hover td{background:rgba(255,255,255,.012)}
.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:9px;letter-spacing:.8px;font-weight:500}
.bdoc-guia{background:rgba(255,90,90,.15);color:var(--rose);border:1px solid rgba(255,90,90,.3)}
.bdoc-fac{background:rgba(90,200,255,.15);color:var(--sky);border:1px solid rgba(90,200,255,.3)}
.bdoc-guia-pend{background:rgba(255,200,0,.1);color:var(--gold);border:1px solid rgba(255,200,0,.2)}
.b-open{background:rgba(77,184,255,.1);color:var(--sky)}
.b-partial{background:rgba(232,184,75,.1);color:var(--gold)}
.b-closed{background:rgba(127,255,90,.1);color:var(--lime)}
.b-toinvoice{background:rgba(255,90,90,.1);color:var(--rose)}
.b-warn{background:rgba(255,77,109,.1);color:var(--rose)}
.bdoc-factura{background:rgba(61,255,196,.08);color:var(--teal);border:1px solid rgba(61,255,196,.2)}
.bdoc-guia{background:rgba(167,139,255,.1);color:var(--violet);border:1px solid rgba(167,139,255,.22)}
.bdoc-guia-pend{background:rgba(232,184,75,.08);color:var(--gold);border:1px solid rgba(232,184,75,.2)}
.bdoc-nc{background:rgba(255,140,0,.1);color:#ff8c00;border:1px solid rgba(255,140,0,.3)}
.pbar-wrap{background:var(--ink);border-radius:99px;height:4px;overflow:hidden}
.pbar{height:100%;border-radius:99px;transition:width .5s}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)}
.modal{background:var(--ink2);border:1px solid var(--line2);border-radius:13px;width:100%;max-width:680px;max-height:92vh;overflow-y:auto;padding:26px 30px;scrollbar-width:none}.modal::-webkit-scrollbar{display:none}
.modal-xl{max-width:92vw;width:92vw}
.modal-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
.modal-title{font-family:var(--fS);font-size:22px;font-style:italic;color:var(--white)}
.modal-sub{font-size:10px;color:var(--gold);margin-top:3px}
.xbtn{width:27px;height:27px;border-radius:6px;background:var(--ink3);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--fog);font-size:12px;flex-shrink:0}
.xbtn:hover{color:var(--white)}
.steps{display:flex;align-items:center;margin-bottom:20px}
.step{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--fog)}
.step-n{width:21px;height:21px;border-radius:50%;border:1px solid var(--line2);display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0}
.step.done .step-n{background:var(--lime);border-color:var(--lime);color:var(--ink)}
.step.active .step-n{background:var(--gold);border-color:var(--gold);color:var(--ink)}
.step.active{color:var(--white)}
.step-line{flex:1;height:1px;background:var(--line);margin:0 9px}
.frow{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:13px}
.fg{display:flex;flex-direction:column;gap:4px}
.fg label{font-size:8px;letter-spacing:2px;color:var(--fog)}
.fg input,.fg select{background:var(--ink3);border:1px solid var(--line);border-radius:6px;padding:8px 11px;font-family:var(--fM);font-size:11px;color:var(--white);outline:none;width:100%}
.fg input:focus,.fg select:focus{border-color:var(--gold)}.fg input::placeholder{color:var(--fog)}
.slbl{font-size:8px;letter-spacing:3px;color:var(--fog);margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--line)}
.itbl{border:1px solid var(--line);border-radius:7px;overflow:hidden;margin-bottom:12px}
.itbl th{font-size:7px;background:var(--ink3)}
.itbl td{padding:3px 7px;border-top:1px solid var(--line)}
.itbl td input{border:none;background:transparent;padding:6px 8px;font-size:11px;width:100%;font-family:var(--fM);color:var(--white);outline:none;border-radius:4px}
.itbl td input:focus{background:var(--ink4)}
.drop-zone{border:2px dashed var(--line2);border-radius:9px;padding:32px 20px;text-align:center;cursor:pointer;transition:.18s;background:var(--ink3)}
.drop-zone:hover,.drop-zone.drag{border-color:var(--sky);background:rgba(77,184,255,.04)}
.drop-ico{font-size:36px;margin-bottom:10px;opacity:.6}
.drop-lbl{font-size:11px;color:var(--fog2);line-height:1.7}
.drop-lbl strong{color:var(--sky)}
.drop-lbl small{font-size:9px;letter-spacing:1.5px;color:var(--fog);display:block;margin-top:4px}
.spin{display:inline-block;width:13px;height:13px;border:2px solid var(--line2);border-top-color:var(--gold);border-radius:50%;animation:rot .6s linear infinite}
@keyframes rot{to{transform:rotate(360deg)}}
.spin-row{display:flex;align-items:center;gap:9px;justify-content:center;padding:18px;color:var(--gold);font-size:11px}
.ex-box{background:rgba(61,255,196,.04);border:1px solid rgba(61,255,196,.15);border-radius:8px;padding:14px 17px;margin-bottom:14px}
.ex-ok{font-size:8px;letter-spacing:2.5px;color:var(--teal);margin-bottom:9px}
.ex-row{display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.ex-row:last-child{border:none}.ex-k{color:var(--fog)}.ex-v{color:var(--white)}
.map-info{background:rgba(77,184,255,.05);border:1px solid rgba(77,184,255,.16);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:11px;color:var(--fog2);line-height:1.8}
.map-info strong{color:var(--sky)}
.map-tbl{width:100%;border-collapse:collapse;margin-bottom:14px}
.map-tbl th{padding:8px 12px;font-size:8px;letter-spacing:2px;color:var(--fog);background:var(--ink3);text-align:left;font-weight:400}
.map-tbl td{padding:9px 12px;border-top:1px solid var(--line);vertical-align:middle}
.map-arrow{color:var(--fog);text-align:center;width:26px}
.map-sel{background:var(--ink3);border:1px solid var(--line);border-radius:5px;padding:6px 9px;font-family:var(--fM);font-size:11px;color:var(--white);outline:none;width:100%}
.map-sel.ok{border-color:rgba(127,255,90,.35);color:var(--lime)}
.map-sel.warn{border-color:rgba(232,184,75,.3)}
.map-note{font-size:9px;color:var(--fog);margin-top:3px}
.map-qty{width:78px;background:var(--ink3);border:1px solid var(--line);border-radius:5px;padding:6px 9px;font-family:var(--fM);font-size:11px;color:var(--white);outline:none;text-align:right}
.dg{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
.df label{font-size:8px;letter-spacing:2px;color:var(--fog);display:block;margin-bottom:3px}
.df p{font-size:12px}
.doc-tabs{display:flex;gap:3px;background:var(--ink3);border-radius:7px;padding:3px;width:fit-content;margin-bottom:14px}
.doc-tab{padding:5px 14px;border-radius:5px;font-size:10px;cursor:pointer;color:var(--fog2);transition:.12s}
.doc-tab.on{background:var(--ink2);color:var(--white)}
.disp-list{display:flex;flex-direction:column;gap:8px}
.disp-card{background:var(--ink3);border:1px solid var(--line);border-radius:8px;padding:12px 14px}
.disp-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.disp-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.disp-row{display:flex;justify-content:space-between;padding:2px 0;font-size:10px;color:var(--fog2)}
.conv-box{background:var(--ink3);border:1px solid var(--line2);border-radius:9px;padding:16px}
.conv-hint{font-size:11px;color:var(--fog2);line-height:1.7;margin-bottom:14px}
.rep-card{background:var(--ink2);border:1px solid var(--line);border-radius:9px;padding:18px}
.rep-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:13px}
.rep-id{font-family:var(--fS);font-size:19px;font-style:italic;color:var(--gold)}
.rep-client{font-size:11px;color:var(--fog2);margin-top:2px}
.rep-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:11px}.rep-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:0}
.rep-stat label{font-size:8px;letter-spacing:2px;color:var(--fog);display:block;margin-bottom:2px}
.rep-stat p{font-size:13px;font-weight:600}
.rep-items{margin-top:11px;border-top:1px solid var(--line);padding-top:9px}
.rep-irow{display:flex;align-items:center;gap:9px;padding:4px 0;font-size:10px}
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--ink);padding:20px}
.auth-card{background:var(--ink2);border:1px solid var(--line2);border-radius:15px;padding:38px;width:100%;max-width:370px}
.auth-brand{font-family:var(--fS);font-size:26px;font-style:italic;color:var(--gold);margin-bottom:2px;line-height:1.15}
.auth-tm{font-size:9px;letter-spacing:2px;color:var(--gold);opacity:.55;margin-bottom:4px}
.auth-tag{font-size:8px;letter-spacing:3px;color:var(--fog);margin-bottom:28px}
.auth-tabs{display:flex;gap:3px;background:var(--ink3);border-radius:7px;padding:3px;margin-bottom:20px}
.auth-tab{flex:1;padding:8px;text-align:center;border-radius:5px;font-size:10px;letter-spacing:1px;cursor:pointer;color:var(--fog)}
.auth-tab.on{background:var(--ink2);color:var(--white)}
.auth-err{background:rgba(255,77,109,.07);border:1px solid rgba(255,77,109,.22);border-radius:6px;padding:9px 13px;font-size:11px;color:var(--rose);margin-bottom:13px}
.key-bar{background:var(--ink2);border-bottom:1px solid var(--line);padding:7px 20px;display:flex;align-items:center;gap:9px;font-size:10px;color:var(--fog)}
.key-bar input{flex:1;max-width:300px;background:var(--ink3);border:1px solid var(--line);border-radius:6px;padding:5px 10px;font-family:var(--fM);font-size:11px;color:var(--white);outline:none}
.key-bar input:focus{border-color:var(--gold)}
.toast{position:fixed;bottom:20px;right:20px;background:var(--ink3);border:1px solid var(--line2);border-radius:8px;padding:10px 16px;font-size:11px;z-index:999;animation:tid .2s ease;display:flex;align-items:center;gap:7px}
.toast.ok::before{content:"●";color:var(--lime);font-size:8px}
.toast.err::before{content:"●";color:var(--rose);font-size:8px}
@keyframes tid{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
.empty{text-align:center;padding:48px 20px;color:var(--fog)}
.empty-ico{font-size:40px;opacity:.18;margin-bottom:10px}
.empty p{font-size:11px;line-height:1.9}
.pgload{display:flex;align-items:center;justify-content:center;height:150px;gap:10px;color:var(--fog);font-size:11px}
.th-sort{cursor:pointer;user-select:none;white-space:nowrap}
.th-sort:hover{color:var(--white)}
.th-sort.active{color:var(--gold)}
.sort-ico{margin-left:4px;opacity:.5;font-size:9px}
.th-sort.active .sort-ico{opacity:1}
.rail-item-sub{display:flex;align-items:center;gap:9px;padding:7px 18px 7px 34px;font-size:10px;color:var(--fog);cursor:pointer;border-left:2px solid transparent;transition:.12s;position:relative}
.rail-item-sub::before{content:"";position:absolute;left:22px;top:50%;width:6px;height:1px;background:var(--line2)}
.rail-item-sub:hover{color:var(--white);background:var(--ink3)}
.rail-item-sub.on{color:var(--gold);border-left-color:var(--gold);background:rgba(232,184,75,.06)}
.rail-parent{display:flex;align-items:center;gap:9px;padding:9px 18px;font-size:11px;color:var(--fog2);border-left:2px solid transparent}
.rail-parent.on{color:var(--white)}
.cli-card{background:var(--ink2);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.cli-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--line);gap:12px;flex-wrap:wrap}
.cli-name{font-family:var(--fS);font-size:18px;font-style:italic;color:var(--white)}
.cli-ocs{font-size:9px;letter-spacing:2px;color:var(--fog);margin-top:2px}
.cli-totals{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:1px solid var(--line);align-items:end}
.cli-total{background:transparent;padding:12px 16px;border-right:1px solid var(--line)}.cli-total:last-child{border-right:none}
.cli-total label{font-size:8px;letter-spacing:2px;color:var(--fog);display:block;margin-bottom:5px}
.cli-total p{font-size:15px;font-weight:600;white-space:nowrap}
.cli-oc-list{padding:10px 18px 14px}
.cli-oc-row{display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--line);font-size:11px}
.cli-oc-row:first-of-type{border-top:none}
.mon-card{background:var(--ink2);border:1px solid var(--line);border-radius:10px;overflow:hidden;margin-bottom:16px}
.mon-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--line);cursor:pointer;user-select:none}
.mon-hd:hover{background:var(--ink3)}
.mon-title{font-family:var(--fS);font-size:20px;font-style:italic;color:var(--white)}
.mon-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line)}
.mon-kpi{background:var(--ink2);padding:11px 16px}
.mon-kpi label{font-size:8px;letter-spacing:2px;color:var(--fog);display:block;margin-bottom:4px}
.mon-kpi p{font-size:14px;font-weight:600}
.mon-body{padding:12px 18px}
.mon-cli{margin-bottom:12px}
.mon-cli-name{font-size:10px;letter-spacing:2px;color:var(--fog);margin-bottom:6px}
.mon-fac-row{display:flex;align-items:center;gap:10px;padding:5px 0;border-top:1px solid var(--line);font-size:11px}
.mon-fac-row:first-of-type{border-top:none}
`;

function Dot({ c }) {
  return <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:c, marginRight:4, flexShrink:0 }} />;
}

function DocBadge({ doc }) {
  if (doc.docType === "nc") {
    return <span className="badge bdoc-nc"><Dot c="#ff8c00" />NC {doc.number}{doc.refInvoice ? <span style={{ color:"var(--fog)", marginLeft:4, fontSize:8 }}>Fac. {doc.refInvoice}</span> : null}</span>;
  }
  if (doc.docType === "factura") {
    return <span className="badge bdoc-factura"><Dot c="var(--teal)" />Factura {doc.number}</span>;
  }
  if (doc.invoiceNumber) {
    return <span className="badge bdoc-guia"><Dot c="var(--violet)" />Guia {doc.number} <span style={{ color:"var(--teal)", marginLeft:4 }}>Fac. {doc.invoiceNumber}</span></span>;
  }
  return <span className="badge bdoc-guia-pend"><Dot c="var(--gold)" />Guia {doc.number} <span style={{ color:"var(--fog)", marginLeft:4, fontSize:8 }}>sin factura</span></span>;
}

function UploadZone({ onFile, onFiles, loading, label }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const handle = files => {
    const pdfs = Array.from(files).filter(f => f.type === "application/pdf");
    if (!pdfs.length) return;
    if (onFiles && pdfs.length > 1) onFiles(pdfs);
    else if (pdfs.length === 1 && onFile) onFile(pdfs[0]);
    else if (onFiles) onFiles(pdfs);
  };
  return (
    <div
      className={"drop-zone" + (drag ? " drag" : "")}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onClick={() => !loading && ref.current.click()}
    >
      <div className="drop-ico">{loading ? "⏳" : "📄"}</div>
      {loading
        ? <div className="spin-row"><div className="spin" /> Analizando con IA...</div>
        : <div className="drop-lbl">{label || "Arrastra el PDF aqui o"} <strong>haz clic para seleccionar</strong><small>Múltiples PDFs permitidos · max 10 MB c/u</small></div>
      }
      <input ref={ref} type="file" accept=".pdf" multiple style={{ display:"none" }} onChange={e => handle(e.target.files)} />
    </div>
  );
}

function Steps({ labels, current }) {
  return (
    <div className="steps">
      {labels.map((l, i) => (
        <span key={i} style={{ display:"contents" }}>
          <div className={"step" + (i < current ? " done" : i === current ? " active" : "")}>
            <div className="step-n">{i < current ? "✓" : i + 1}</div>
            <span>{l}</span>
          </div>
          {i < labels.length - 1 && <div className="step-line" />}
        </span>
      ))}
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    setErr(null);
    setLoading(true);
    try {
      let users = [];
      try { const r = await storage.get("dc-users"); users = r ? JSON.parse(r.value) : []; } catch(e) {}
      if (tab === "register") {
        if (!name || !email || password.length < 6) throw new Error("Completa todos los campos (contrasena min. 6 caracteres)");
        const ALLOWED = [
          "gsepulveda@totalmetal.cl",
          "jvasquez@totalmetal.cl",
          "mcarrillo@totalmetal.cl",
          "eespinoza@totalmetal.cl",
          "jhaeger@totalmetal.cl",
          "npuente@totalmetal.cl"
        ];
        if (!ALLOWED.includes(email.toLowerCase().trim())) throw new Error("Este correo no está autorizado para registrarse");
        if (users.find(u => u.email === email)) throw new Error("Email ya registrado");
        const isAdmin = email.toLowerCase().trim() === "gsepulveda@totalmetal.cl";
        const hashed = await hashPassword(password);
        const nu = { id: Date.now(), name, email, password: hashed, isAdmin };
        await storage.set("dc-users", JSON.stringify([...users, nu]));
        localStorage.setItem("dc_user", JSON.stringify({ id: nu.id, name: nu.name, email: nu.email, isAdmin: nu.isAdmin }));
        onAuth({ id: nu.id, name: nu.name, email: nu.email, isAdmin: nu.isAdmin });
      } else {
        const hashed = await hashPassword(password);
        const u = users.find(u => u.email === email && u.password === hashed);
        if (!u) throw new Error("Email o contrasena incorrectos");
        localStorage.setItem("dc_user", JSON.stringify({ id: u.id, name: u.name, email: u.email, isAdmin: u.isAdmin || false }));
        onAuth({ id: u.id, name: u.name, email: u.email, isAdmin: u.isAdmin || false });
      }
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">Control Despachos</div>
        <div className="auth-tm">TM</div>
        <div className="auth-tag">SISTEMA DE ORDENES DE COMPRA</div>
        <div className="auth-tabs">
          <div className={"auth-tab" + (tab === "login" ? " on" : "")} onClick={() => { setTab("login"); setErr(null); }}>Ingresar</div>
          <div className={"auth-tab" + (tab === "register" ? " on" : "")} onClick={() => { setTab("register"); setErr(null); }}>Registrarse</div>
        </div>
        {err && <div className="auth-err">⚠ {err}</div>}
        {tab === "register" && (
          <div className="fg" style={{ marginBottom:11 }}>
            <label>NOMBRE</label>
            <input placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} />
          </div>
        )}
        <div className="fg" style={{ marginBottom:11 }}>
          <label>EMAIL</label>
          <input type="email" name="email" autoComplete="email" placeholder="correo@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="fg" style={{ marginBottom:18 }}>
          <label>CONTRASENA</label>
          <input type="password" name="password" autoComplete={tab === "login" ? "current-password" : "new-password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <button className="btn btn-gold" style={{ width:"100%", justifyContent:"center" }} onClick={submit} disabled={loading}>
          {loading ? <><div className="spin" />Procesando...</> : tab === "login" ? "Ingresar →" : "Crear cuenta →"}
        </button>
      </div>
    </div>
  );
}

function VentaDirectaModal({ onClose, onSave, existingOCs = [], apiKey }) {
  const [step, setStep] = useState(0); // 0=subir PDF, 1=formulario
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const [form, setForm] = useState({ client: "", rut: "", facNumber: "", date: today(), neto: "", total: "", desc: "" });

  const nextVD = () => {
    const vds = existingOCs.filter(o => o._ventaDirecta && /^VD-\d+$/.test(o.ocNumber || ""));
    const max = vds.reduce((m, o) => Math.max(m, parseInt(o.ocNumber.replace("VD-",""))||0), 0);
    return "VD-" + String(max + 1).padStart(3, "0");
  };

  const procesarPDF = async (file) => {
    setLoading(true); setErr(null);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Error leyendo archivo"));
        r.readAsDataURL(file);
      });
      const prompt = `Extrae los datos de esta Factura Electrónica emitida por Total Metal. El campo "client" es el nombre o razón social del CLIENTE (el que recibe la factura, no Total Metal). El campo "rut" es el RUT del cliente. "facNumber" es el número de la factura. "date" es la fecha de emisión formato YYYY-MM-DD. "neto" es el monto NETO (sin IVA) como número entero sin puntos. "total" es el monto TOTAL con IVA como número entero sin puntos. "desc" es una descripción breve de los ítems de la factura (máximo 80 caracteres, resumida si hay varios). Responde SOLO JSON sin texto extra ni backticks: {"client":"string","rut":"string","facNumber":"string","date":"YYYY-MM-DD","neto":0,"total":0,"desc":"string"}`;
      const payload = {
        model: "claude-opus-4-5",
        max_tokens: 400,
        messages: [{ role: "user", content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: prompt }
        ]}]
      };
      const _r = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!_r.ok) throw new Error("Error en proxy Claude: " + _r.status);
      let data = await _r.json();
      const txt = (data.content || []).map(b => b.text || "").join("").trim();
      const clean = txt.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setForm({
        client: parsed.client || "",
        rut: parsed.rut || "",
        facNumber: parsed.facNumber || "",
        date: parsed.date || today(),
        neto: parsed.neto ? String(parsed.neto) : "",
        total: parsed.total ? String(parsed.total) : "",
        desc: parsed.desc || "",
      });
      setStep(1);
    } catch(e) { setErr("Error extrayendo datos: " + e.message); }
    setLoading(false);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") procesarPDF(file);
    else setErr("Solo se aceptan archivos PDF");
  };

  const handleGuardar = async () => {
    if (!form.client || !form.facNumber || !form.neto) { setErr("Cliente, N° Factura y Neto son obligatorios"); return; }
    setSaving(true);
    try {
      const neto = Number(String(form.neto).replace(/\./g, "")) || 0;
      const total = Number(String(form.total).replace(/\./g, "")) || Math.round(neto * 1.19);
      const ocNumber = nextVD();
      const newOC = {
        id: "OC-VD-" + Date.now(),
        ocNumber,
        client: form.client,
        rut: form.rut,
        date: form.date,
        deliveryDate: "",
        notes: "Venta Directa",
        _ventaDirecta: true,
        _closedByMonto: true,
        items: [{ id: "it-vd-1", desc: form.desc || "Venta Directa", unit: "UN", qty: 1, unitPrice: neto }],
        dispatches: [{
          id: "disp-vd-" + form.facNumber,
          docType: "factura",
          number: form.facNumber,
          date: form.date,
          netTotal: neto,
          total,
          items: [],
          invoiceNumber: null,
          gdNumber: null,
        }]
      };
      await onSave(newOC);
      onClose();
    } catch(e) { setErr(e.message); }
    setSaving(false);
  };

  const inp = (lbl, key, placeholder = "", type = "text") => (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:9, letterSpacing:2, color:"var(--fog)" }}>{lbl}</label>
      <input type={type} value={form[key]} placeholder={placeholder}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        style={{ background:"var(--ink3)", border:"1px solid var(--line2)", borderRadius:6, padding:"7px 10px", color:"var(--white)", fontSize:13, outline:"none" }} />
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"var(--ink2)", border:"1px solid var(--line)", borderRadius:12, width:"min(500px,95vw)", display:"flex", flexDirection:"column", boxShadow:"0 24px 60px rgba(0,0,0,.5)" }}>

        {/* Header */}
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid var(--line)", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:"var(--fS)", fontSize:20, fontStyle:"italic" }}>Venta <em style={{ color:"var(--gold)" }}>Directa</em></div>
            <div style={{ fontSize:10, color:"var(--fog)", letterSpacing:1, marginTop:2 }}>{step === 0 ? "SUBIR FACTURA PDF" : "CONFIRMAR DATOS"}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--fog)", fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        <div style={{ padding:"20px" }}>
          {err && <div style={{ color:"var(--rose)", fontSize:12, marginBottom:12, padding:"8px 12px", background:"rgba(255,80,80,.08)", borderRadius:6 }}>{err}</div>}

          {step === 0 && (
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{ border:"2px dashed " + (drag ? "var(--gold)" : "var(--line2)"), borderRadius:10, padding:"40px 20px", textAlign:"center", cursor:"pointer", transition:".15s", background: drag ? "rgba(255,200,0,.04)" : "transparent" }}>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display:"none" }}
                onChange={e => { const f = e.target.files[0]; if (f) procesarPDF(f); e.target.value = ""; }} />
              {loading
                ? <div style={{ color:"var(--fog)", fontSize:13 }}>Extrayendo datos...</div>
                : <>
                    <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
                    <div style={{ color:"var(--white)", fontSize:13, marginBottom:4 }}>Arrastra el PDF de la factura aquí</div>
                    <div style={{ color:"var(--fog)", fontSize:11 }}>o haz clic para seleccionar</div>
                  </>
              }
            </div>
          )}

          {step === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {inp("CLIENTE *", "client", "Razón social")}
              {inp("RUT", "rut", "77.246.012-0")}
              {inp("ÍTEM / DESCRIPCIÓN", "desc", "Bolsa de basura, materiales...")}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {inp("N° FACTURA *", "facNumber", "1832")}
                {inp("FECHA", "date", "", "date")}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {inp("NETO *", "neto", "19064")}
                {inp("TOTAL c/IVA", "total", "22686")}
              </div>
              <div style={{ fontSize:10, color:"var(--fog)", marginTop:4 }}>
                N° OC asignado: <span style={{ color:"var(--gold)", fontFamily:"var(--fM)" }}>{nextVD()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 20px", borderTop:"1px solid var(--line)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {step === 1
            ? <button className="btn btn-outline" onClick={() => { setStep(0); setErr(null); }}>← Volver</button>
            : <span />}
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
            {step === 1 && (
              <button className="btn btn-gold" onClick={handleGuardar} disabled={saving}>
                {saving ? "Guardando..." : "⚡ Crear Venta Directa"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportOCModal({ onClose, onSave, apiKey, existingOCs = [] }) {
  // queue = [{ file, status: "pending"|"processing"|"done"|"error", data, items, err }]
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null); // index being reviewed
  const [drag, setDrag] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef();

  // derived
  const inReview = current !== null && queue[current];
  const data = inReview ? queue[current].data : null;
  const items = inReview ? queue[current].items : [];
  const setData = fn => setQueue(q => q.map((e, i) => i === current ? { ...e, data: fn(e.data) } : e));
  const setItems = fn => setQueue(q => q.map((e, i) => i === current ? { ...e, items: fn(e.items) } : e));

  const upd = (idx, k, v) => setItems(p => {
    const n = [...p]; n[idx] = { ...n[idx], [k]: (k === "qty" || k === "unitPrice") ? Number(v) : v }; return n;
  });

  const handleFiles = async files => {
    const pdfs = Array.from(files).filter(f => f.type === "application/pdf");
    if (!pdfs.length) return;
    const MAX = 2;
    if (pdfs.length > MAX) {
      setErr("Máximo " + MAX + " PDFs a la vez. Selecciona hasta " + MAX + " archivos.");
      return;
    }
    // build initial queue entries
    const entries = pdfs.map(f => ({ file: f, name: f.name, status: "pending", data: null, items: [], err: null }));
    setQueue(entries);
    setCurrent(null);
    setErr(null);
    // process all sequentially
    for (let i = 0; i < entries.length; i++) {
      setQueue(q => q.map((e, j) => j === i ? { ...e, status: "processing" } : e));
      try {
        const b64 = await toB64(entries[i].file);
        const d = await extractPDF(b64, "oc");
        const its = (d.items || []).map((it, k) => ({ ...it, id: k + 1 }));
        setQueue(q => q.map((e, j) => j === i ? { ...e, status: "done", data: { ...d, deliveryDate: "" }, items: its } : e));
      } catch(e) {
        console.error("PDF Error:", e);
        setQueue(q => q.map((e, j) => j === i ? { ...e, status: "error", err: e.message } : e));
      }
    }
    // open first successful one for review
    setCurrent(null); // show queue summary
  };

  const startReview = idx => setCurrent(idx);

  const saveOne = async () => {
    const entry = queue[current];
    if (!entry.data || !entry.data.client || !entry.items.length || entry.items.some(i => !i.desc))
      return setErr("Completa todos los campos.");
    setSaving(true);
    try {
      const remaining = queue.filter((e, i) => i !== current && (e.status === "done" || e.status === "pending" || e.status === "processing"));
      const keepOpen = remaining.length > 0;
      await onSave({
        id: newId(), ocNumber: entry.data.ocNumber || "", client: entry.data.client,
        rut: entry.data.rut || "", date: entry.data.date || today(), deliveryDate: entry.data.deliveryDate || "",
        notes: entry.data.notes || "", items: entry.items, dispatches: []
      }, keepOpen);
      setQueue(q => q.map((e, i) => i === current ? { ...e, status: "saved" } : e));
      setErr(null);
      // auto-advance to next unsaved
      const next = queue.findIndex((e, i) => i > current && (e.status === "done"));
      setCurrent(next >= 0 ? next : null);
    } catch(e) { setErr("⚠ " + e.message); }
    setSaving(false);
  };

  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const allDone = queue.length > 0 && queue.every(e => e.status === "saved" || e.status === "error");
  const savedCount = queue.filter(e => e.status === "saved").length;

  const statusIcon = s => ({ pending: "⏸", processing: "⏳", done: "✓", error: "✗", saved: "●" }[s] || "?");
  const statusColor = s => ({ pending: "var(--fog)", processing: "var(--gold)", done: "var(--sky)", error: "var(--rose)", saved: "var(--lime)" }[s] || "var(--fog)");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"var(--ink2)", border:"1px solid var(--line)", borderRadius:12, width:"min(780px,95vw)", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 60px rgba(0,0,0,.5)", scrollbarWidth:"none" }}>
        <div style={{ padding:"18px 24px 14px", borderBottom:"1px solid var(--line)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div className="modal-title">Importar OC{queue.length > 1 ? "s" : ""}</div>
              <div className="modal-sub">{queue.length > 0 ? queue.length + " archivo" + (queue.length > 1 ? "s" : "") + " seleccionado" + (queue.length > 1 ? "s" : "") : "Orden de compra del cliente"}</div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--fog)", fontSize:20, cursor:"pointer", lineHeight:1, padding:"0 2px" }}>×</button>
          </div>
        </div>
        <div style={{ padding:"20px 24px" }}>

        {/* STEP 0: file selection */}
        {queue.length === 0 && (
          <>
            <div
              className={"drop-zone" + (drag ? " drag" : "")}
              onClick={() => fileRef.current.click()}
              onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
            >
              <div className="drop-ico">📄</div>
              <div className="drop-lbl">Arrastra uno o dos PDFs aquí o <strong>haz clic para seleccionar</strong><small>Máximo 2 archivos a la vez · PDF max 10 MB c/u</small></div>
              <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display:"none" }} onChange={e => handleFiles(e.target.files)} />
            </div>
            {err && <div style={{ color:"var(--rose)", fontSize:11, marginTop:9 }}>⚠ {err}</div>}
          </>
        )}

        {/* STEP 1: queue overview */}
        {queue.length > 0 && current === null && (
          <>
            <div style={{ marginBottom:14 }}>
              {queue.map((e, i) => {
                const norm = s => String(s).replace(/[\.\s]/g, "").toLowerCase();
                const ocNum = e.data?.ocNumber ? norm(e.data.ocNumber) : null;
                const isDupe = ocNum && existingOCs.some(o => o.ocNumber && norm(o.ocNumber) === ocNum);
                const dupeOC = isDupe ? existingOCs.find(o => o.ocNumber && norm(o.ocNumber) === ocNum) : null;
                return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background: isDupe ? "rgba(255,77,109,.06)" : "var(--ink3)", borderRadius:7, marginBottom:6, border: isDupe ? "1px solid rgba(255,77,109,.3)" : "1px solid var(--line)", flexWrap:"wrap" }}>
                  <span style={{ fontSize:13, color: isDupe ? "var(--rose)" : statusColor(e.status) }}>{isDupe ? "⚠" : statusIcon(e.status)}</span>
                  <span style={{ flex:1, fontSize:11, color:"var(--fog2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.name}</span>
                  {e.status === "processing" && <span style={{ fontSize:10, color:"var(--gold)" }}>Analizando...</span>}
                  {e.status === "done" && isDupe && (
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:10, color:"var(--rose)" }}>OC {dupeOC?.ocNumber} ya existe · {dupeOC?.client}</span>
                      <button className="btn btn-rose btn-sm" onClick={() => setQueue(q => q.map((x, j) => j === i ? { ...x, status:"error", err:"Duplicada — OC " + dupeOC?.ocNumber + " ya existe" } : x))}>Cancelar</button>
                    </div>
                  )}
                  {e.status === "done" && !isDupe && <button className="btn btn-sky btn-sm" onClick={() => startReview(i)}>Revisar →</button>}
                  {e.status === "saved" && <span style={{ fontSize:10, color:"var(--lime)" }}>Guardada ✓</span>}
                  {e.status === "error" && <span style={{ fontSize:10, color:"var(--rose)", wordBreak:"break-all", whiteSpace:"normal" }}>Error: {e.err}</span>}
                </div>
                );
              })}
            </div>
            {allDone
              ? <div style={{ display:"flex", justifyContent:"flex-end" }}>
                  <button className="btn btn-gold" onClick={onClose}>{savedCount} OC{savedCount !== 1 ? "s" : ""} guardada{savedCount !== 1 ? "s" : ""} · Cerrar</button>
                </div>
              : <div style={{ fontSize:10, color:"var(--fog)", textAlign:"center", marginTop:8 }}>
                  {queue.filter(e => e.status === "processing").length > 0 ? "Procesando archivos..." : "Haz clic en «Revisar» para revisar y guardar cada OC"}
                </div>
            }
          </>
        )}

        {/* STEP 2: review one OC */}
        {queue.length > 0 && current !== null && data && (
          <>
            {/* mini breadcrumb */}
            {queue.length > 1 && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, fontSize:10, color:"var(--fog)" }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setCurrent(null); setErr(null); }}>← Lista</button>
                <span>{queue[current].name}</span>
                <span style={{ marginLeft:"auto", color:"var(--fog2)" }}>{current + 1} / {queue.length}</span>
              </div>
            )}
            <div className="ex-box">
              <div className="ex-ok">✓ DATOS EXTRAIDOS</div>
              {[["N° OC", data.ocNumber], ["Cliente", data.client], ["RUT", data.rut], ["Fecha", data.date], ["Entrega", data.deliveryDate], ["Notas", data.notes]].map(([k, v]) => (
                <div className="ex-row" key={k}><span className="ex-k">{k}</span><span className="ex-v">{v || "—"}</span></div>
              ))}
            </div>
            <div className="frow">
              <div className="fg"><label>CLIENTE *</label><input value={data.client || ""} onChange={e => setData(p => ({ ...p, client: e.target.value }))} /></div>
              <div className="fg"><label>N° OC</label><input value={data.ocNumber || ""} onChange={e => setData(p => ({ ...p, ocNumber: e.target.value }))} /></div>
              <div className="fg"><label>FECHA OC</label><input type="date" value={data.date || ""} onChange={e => setData(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="fg"><label>FECHA ENTREGA</label><input type="date" value={data.deliveryDate || ""} onChange={e => setData(p => ({ ...p, deliveryDate: e.target.value }))} /></div>
              <div className="fg" style={{ gridColumn:"1 / -1" }}><label>NOTAS</label><input value={data.notes || ""} onChange={e => setData(p => ({ ...p, notes: e.target.value }))} placeholder="Obra, OT, condiciones de pago..." /></div>
            </div>
            <div className="slbl">ITEMS</div>
            <div className="itbl">
              <table>
                <thead><tr><th>DESCRIPCION</th><th>CANT.</th><th>P.UNIT.</th><th>TOTAL</th><th /></tr></thead>
                <tbody>{items.map((it, i) => (
                  <tr key={it.id}>
                    <td><input value={it.desc} onChange={e => upd(i, "desc", e.target.value)} placeholder="Producto" /></td>
                    <td><input type="number" value={it.qty} onChange={e => upd(i, "qty", e.target.value)} style={{ width:68 }} /></td>
                    <td><input type="number" value={it.unitPrice} onChange={e => upd(i, "unitPrice", e.target.value)} style={{ width:96 }} /></td>
                    <td style={{ color:"var(--gold)", fontSize:11 }}>{fmtCLP(it.qty * it.unitPrice)}</td>
                    <td><button className="btn btn-rose btn-sm" onClick={() => setItems(p => p.filter((_, j) => j !== i))}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setItems(p => [...p, { id: Date.now(), desc: "", unit: "Unidad", qty: 1, unitPrice: 0 }])}>+ Item</button>
              <span style={{ fontWeight:600, fontSize:15 }}>Total: <span style={{ color:"var(--gold)" }}>{fmtCLP(total)}</span></span>
            </div>
            {err && <div style={{ color:"var(--rose)", fontSize:11, marginBottom:11 }}>⚠ {err}</div>}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              {queue.length > 1 && <button className="btn btn-ghost" onClick={() => { setCurrent(null); setErr(null); }}>← Lista</button>}
              <button className="btn btn-gold" onClick={saveOne} disabled={saving}>{saving ? <><div className="spin" />Guardando...</> : queue.length > 1 ? "Guardar y continuar →" : "Guardar OC →"}</button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function BsaleView({ enriched, onAssign }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sortCol, setSortCol] = useState("number");
  const [sortDir, setSortDir] = useState(-1); // -1 = desc, 1 = asc
  const LIMIT = 50;

  const loadDocs = async (offset = 0) => {
    setLoading(true); setErr(null);
    try {
      // Primero obtener totales para calcular offset desde el final
      const [gdMeta, facMeta] = await Promise.all([
        fetchBsale("/documents.json", { documentTypeId: "8", limit: 1, offset: 0 }),
        fetchBsale("/documents.json", { documentTypeId: "1", limit: 1, offset: 0 })
      ]);
      const gdTotal = gdMeta.count || 0;
      const facTotal = facMeta.count || 0;
      const gdOffset = Math.max(0, gdTotal - LIMIT - offset);
      const facOffset = Math.max(0, facTotal - LIMIT - offset);
      const [gds, facs] = await Promise.all([
        fetchBsale("/documents.json", { documentTypeId: "8", limit: LIMIT, offset: gdOffset }),
        fetchBsale("/documents.json", { documentTypeId: "1", limit: LIMIT, offset: facOffset })
      ]);
      const gdItems = (gds.items || []).map(d => ({ ...d, _tipo: "guia" }));
      const facItems = (facs.items || []).map(d => ({ ...d, _tipo: "factura" }));
      setDocs([...gdItems, ...facItems]);
      setTotalCount(gdTotal + facTotal);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  useEffect(() => { loadDocs(page * LIMIT); }, [page]);

  // Verificar si un doc ya está asignado a alguna OC
  const assignedNums = new Set();
  enriched.forEach(oc => {
    (oc.dispatches || []).forEach(d => {
      if (d.number) assignedNums.add(String(d.number).trim());
      if (d.invoiceNumber) assignedNums.add(String(d.invoiceNumber).trim());
    });
  });

  // Construir árbol: GDs con sus Facturas vinculadas
  const buildTree = (allDocs) => {
    const guias = allDocs.filter(d => d._tipo === "guia");
    const facturas = allDocs.filter(d => d._tipo === "factura");
    // Agrupar facturas por número (misma fecha y monto que GD = probablemente relacionadas)
    return guias.map(gd => {
      const gdNum = String(gd.number || "");
      const gdDate = gd.generationDate || 0;
      // Buscar factura con mismo número o misma fecha y monto similar
      const relFac = facturas.filter(f =>
        String(f.number || "") === gdNum ||
        (Math.abs((f.generationDate || 0) - gdDate) < 86400 && Math.abs((f.netAmount || 0) - (gd.netAmount || 0)) < 100)
      );
      return { ...gd, _facturas: relFac };
    });
  };

  const sortedDocs = [...docs].sort((a, b) => {
    const va = sortCol === "number" ? Number(a.number || 0) : (a.generationDate || 0);
    const vb = sortCol === "number" ? Number(b.number || 0) : (b.generationDate || 0);
    return sortDir * (vb - va);
  });

  const tree = buildTree(sortedDocs);

  const filteredTree = tree.filter(d => {
    const num = String(d.number || "");
    const addr = d.address || "";
    const matchSearch = !search || num.includes(search) || addr.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || filter === "guia";
    return matchSearch && matchFilter;
  }).concat(
    filter === "factura" ? sortedDocs.filter(d => d._tipo === "factura" && (() => {
      const num = String(d.number || "");
      const addr = d.address || "";
      return !search || num.includes(search) || addr.toLowerCase().includes(search.toLowerCase());
    })()) : []
  );

  const fmtDate = ts => ts ? new Date(ts * 1000).toISOString().slice(0, 10) : "—";
  const fmtMonto = n => n ? "$" + Number(n).toLocaleString("es-CL") : "—";
  const SortBtn = ({ col, label }) => (
    <th style={{ padding:"8px 12px", textAlign:"left", cursor:"pointer", userSelect:"none", color: sortCol === col ? "var(--gold)" : "var(--fog)", fontSize:10, letterSpacing:1 }}
      onClick={() => { if (sortCol === col) setSortDir(d => -d); else { setSortCol(col); setSortDir(-1); } }}>
      {label} <span style={{ opacity:0.6 }}>{sortCol === col ? (sortDir === -1 ? "▼" : "▲") : "⇅"}</span>
    </th>
  );

  return (
    <>
      <div className="ph">
        <div><div className="pt">Repositorio <em>Bsale</em></div><div className="pm">{totalCount} DOCUMENTOS</div></div>
        <button className="btn btn-outline btn-sm" onClick={() => loadDocs(page * LIMIT)}>↺ Actualizar</button>
      </div>
      <div className="toolbar">
        <input className="srch" placeholder="Buscar por N° o dirección..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="fsel" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Todos (árbol)</option>
          <option value="guia">Solo GDs</option>
          <option value="factura">Solo Facturas</option>
        </select>
      </div>
      {loading && <div style={{ textAlign:"center", padding:40, color:"var(--fog)" }}>Cargando documentos Bsale...</div>}
      {err && <div style={{ color:"var(--rose)", padding:20 }}>⚠ {err}</div>}
      {!loading && !err && (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid var(--line)" }}>
                <th style={{ padding:"8px 12px", textAlign:"left", color:"var(--fog)", fontSize:10, letterSpacing:1 }}>TIPO</th>
                <SortBtn col="number" label="N°" />
                <SortBtn col="date" label="FECHA" />
                <th style={{ padding:"8px 12px", textAlign:"left", color:"var(--fog)", fontSize:10, letterSpacing:1 }}>DIRECCIÓN</th>
                <th style={{ padding:"8px 12px", textAlign:"right", color:"var(--fog)", fontSize:10, letterSpacing:1 }}>NETO</th>
                <th style={{ padding:"8px 12px", textAlign:"center", color:"var(--fog)", fontSize:10, letterSpacing:1 }}>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {filter !== "factura" ? filteredTree.map(gd => {
                const num = String(gd.number || "");
                const isAssigned = assignedNums.has(num);
                const neto = gd.netAmount || gd.totalAmount || 0;
                return (
                  <React.Fragment key={gd.id}>
                    <tr style={{ borderBottom: gd._facturas?.length ? "none" : "1px solid var(--line2)", opacity: isAssigned ? 0.5 : 1 }}>
                      <td style={{ padding:"10px 12px" }}><span className="badge bdoc-guia">GD</span></td>
                      <td style={{ padding:"10px 12px", color:"var(--gold)", fontFamily:"var(--fM)" }}>{num || "—"}</td>
                      <td style={{ padding:"10px 12px", color:"var(--fog2)" }}>{fmtDate(gd.generationDate)}</td>
                      <td style={{ padding:"10px 12px", fontSize:11, color:"var(--fog2)" }}>{gd.address || "—"}</td>
                      <td style={{ padding:"10px 12px", textAlign:"right", color:"var(--lime)" }}>{fmtMonto(neto)}</td>
                      <td style={{ padding:"10px 12px", textAlign:"center" }}>
                        {isAssigned ? <span style={{ fontSize:9, color:"var(--lime)", letterSpacing:1 }}>✓ ASIGNADO</span>
                          : <span style={{ fontSize:9, color:"var(--fog)", letterSpacing:1 }}>PENDIENTE</span>}
                      </td>
                    </tr>
                    {(gd._facturas || []).map(fac => {
                      const facNum = String(fac.number || "");
                      const facAssigned = assignedNums.has(facNum);
                      return (
                        <tr key={fac.id} style={{ borderBottom:"1px solid var(--line2)", background:"rgba(90,200,255,.04)", opacity: facAssigned ? 0.5 : 1 }}>
                          <td style={{ padding:"8px 12px 8px 28px" }}><span className="badge bdoc-fac" style={{ fontSize:8 }}>↳ FAC</span></td>
                          <td style={{ padding:"8px 12px", color:"var(--sky)", fontFamily:"var(--fM)", fontSize:11 }}>{facNum || "—"}</td>
                          <td style={{ padding:"8px 12px", color:"var(--fog2)", fontSize:11 }}>{fmtDate(fac.generationDate)}</td>
                          <td style={{ padding:"8px 12px", fontSize:10, color:"var(--fog)" }}>{fac.address || "—"}</td>
                          <td style={{ padding:"8px 12px", textAlign:"right", color:"var(--sky)", fontSize:11 }}>{fmtMonto(fac.netAmount || fac.totalAmount || 0)}</td>
                          <td style={{ padding:"8px 12px", textAlign:"center" }}>
                            {facAssigned ? <span style={{ fontSize:9, color:"var(--lime)", letterSpacing:1 }}>✓ ASIGNADO</span>
                              : <span style={{ fontSize:9, color:"var(--fog)", letterSpacing:1 }}>PENDIENTE</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              }) : sortedDocs.filter(d => d._tipo === "factura" && (!search || String(d.number||"").includes(search) || (d.address||"").toLowerCase().includes(search.toLowerCase()))).map(fac => {
                const num = String(fac.number || "");
                const isAssigned = assignedNums.has(num);
                return (
                  <tr key={fac.id} style={{ borderBottom:"1px solid var(--line2)", opacity: isAssigned ? 0.5 : 1 }}>
                    <td style={{ padding:"10px 12px" }}><span className="badge bdoc-fac">FAC</span></td>
                    <td style={{ padding:"10px 12px", color:"var(--sky)", fontFamily:"var(--fM)" }}>{num || "—"}</td>
                    <td style={{ padding:"10px 12px", color:"var(--fog2)" }}>{fmtDate(fac.generationDate)}</td>
                    <td style={{ padding:"10px 12px", fontSize:11 }}>{fac.address || "—"}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", color:"var(--sky)" }}>{fmtMonto(fac.netAmount || fac.totalAmount || 0)}</td>
                    <td style={{ padding:"10px 12px", textAlign:"center" }}>
                      {isAssigned ? <span style={{ fontSize:9, color:"var(--lime)", letterSpacing:1 }}>✓ ASIGNADO</span>
                        : <span style={{ fontSize:9, color:"var(--fog)", letterSpacing:1 }}>PENDIENTE</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTree.length === 0 && <div className="empty"><div className="empty-ico">📄</div><div>No hay documentos</div></div>}
        </div>
      )}
      {totalCount > LIMIT && (
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:16 }}>
          <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</button>
          <span style={{ fontSize:11, color:"var(--fog)", padding:"4px 8px" }}>Página {page + 1}</span>
          <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p + 1)}>Siguiente →</button>
        </div>
      )}
    </>
  );
}

function AddDispatchModal({ oc, onClose, onSave, apiKey, createdBy, isAdmin, ocs, userEmail }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [warn, setWarn] = useState(null);
  const [ext, setExt] = useState(null);
  const [items, setItems] = useState([]);
  const [map, setMap] = useState({});
  const [mapSearch, setMapSearch] = useState({});
  const [splitPrice, setSplitPrice] = useState({}); // {idx: true} = subdivisión de precio, no suma qty
  const [num, setNum] = useState("");
  const [date, setDate] = useState(today());
  const [docType, setDocType] = useState("guia");
  const [savedCount, setSavedCount] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const [ocMismatch, setOcMismatch] = useState(null); // { pdfOC, thisOC }
  const [pendingOverride, setPendingOverride] = useState(null); // datos listos para continuar si admin aprueba
  const [bsaleSearch, setBsaleSearch] = useState("");
  const [bsaleResult, setBsaleResult] = useState(null); // { doc } | null
  const [bsaleLoading, setBsaleLoading] = useState(false);
  const [bsaleErr, setBsaleErr] = useState(null);
  const [bsaleFacSearch, setBsaleFacSearch] = useState("");
  const [bsaleFacResult, setBsaleFacResult] = useState(null);
  const [bsaleFacLoading, setBsaleFacLoading] = useState(false);
  const [bsaleFacErr, setBsaleFacErr] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]); // cola de PDFs pendientes

  const searchBsale = async (num) => {
    if (!num || num.length < 2) { setBsaleResult(null); return; }
    setBsaleLoading(true); setBsaleErr(null); setBsaleResult(null);
    try {
      // Buscar en GDs y Facturas por número exacto
      const [gds, facs] = await Promise.all([
        fetchBsale("/documents.json", { documentTypeId: "8", number: num }),
        fetchBsale("/documents.json", { documentTypeId: "1", number: num })
      ]);
      const getTD = d => { const m = (d.ted || "").match(/<TD>(\d+)<\/TD>/); return m ? Number(m[1]) : null; };
      const gdMatch = (gds.items || []).find(d => String(d.number) === String(num) && (getTD(d) === 52 || getTD(d) === null));
      const facMatch = (facs.items || []).find(d => String(d.number) === String(num) && (getTD(d) === 33 || getTD(d) === 34 || getTD(d) === null));
      const match = gdMatch ? { ...gdMatch, _tipo: "guia" } : facMatch ? { ...facMatch, _tipo: "factura" } : null;
      setBsaleResult(match);
      if (!match) setBsaleErr("No se encontró ningún documento con ese número");
    } catch(e) { setBsaleErr(e.message); }
    setBsaleLoading(false);
  };

  // Buscador dedicado de FACTURAS — bsaleFacResult es array de candidatos
  const searchBsaleFac = async (num) => {
    if (!num || num.length < 2) { setBsaleFacResult(null); return; }
    setBsaleFacLoading(true); setBsaleFacErr(null); setBsaleFacResult(null);
    try {
      const facs = await fetchBsale("/documents.json", { documentTypeId: "1", number: num });
      const getTDFac = d => { const m = (d.ted || "").match(/<TD>(\d+)<\/TD>/); return m ? Number(m[1]) : null; };
      const matches = (facs.items || []).filter(d => {
        if (String(d.number) !== String(num)) return false;
        const td = getTDFac(d);
        if (td !== null) return td === 33 || td === 34; // solo facturas electrónicas
        return Number(d.document_type?.id || 0) !== 7 && Number(d.document_type?.id || 0) !== 8;
      });
      if (!matches.length) { setBsaleFacErr("No se encontró ninguna factura con ese número"); setBsaleFacLoading(false); return; }
      const normS = s => String(s).replace(/[\s.]/g, "");
      // Usar ocs fresco para capturar GDs registradas en esta sesión
      const freshOCSearch = (ocs || []).find(o => o.id === oc.id);
      const ocGDs = (freshOCSearch?.dispatches || oc.dispatches || []).filter(d => d.docType === "guia").map(d => normS(d.number || ""));
      // Enriquecer cada match con sus referencias
      const enriched = await Promise.all(matches.map(async doc => {
        try {
          const refsData = await fetchBsale("/documents/" + doc.id + "/references.json");
          const refs = refsData.items || [];
          const gdRefs = refs.filter(r => r.documentTypeId === 8 || String(r.documentTypeName || "").toLowerCase().includes("guia") || String(r.dte_code?.id || "") === "16" || String(r.dte_code?.id || "") === "52");
          const matchesGD = gdRefs.some(r => ocGDs.includes(normS(String(r.number || ""))));
          const ocMismatch = gdRefs.length > 0 && !matchesGD;
          const gdRefNumbers = gdRefs.map(r => String(r.number || "")).filter(Boolean);
          return { ...doc, _ocMismatch: ocMismatch, _gdRefNumber: gdRefNumbers[0] || null, _gdRefNumbers: gdRefNumbers };
        } catch(e) {
          return { ...doc, _ocMismatch: false, _gdRefNumber: null };
        }
      }));
      // Ordenar: coincidentes con GD de esta OC primero
      enriched.sort((a, b) => (a._ocMismatch ? 1 : 0) - (b._ocMismatch ? 1 : 0));
      setBsaleFacResult(enriched);
    } catch(e) { setBsaleFacErr(e.message); }
    setBsaleFacLoading(false);
  };

  const handleSelectBsaleFac = async (doc) => {
    setErr(null); setLoading(true);
    try {
      const num = String(doc.number || "");
      const date = doc.emissionDate ? new Date(doc.emissionDate * 1000).toISOString().slice(0, 10) : today();
      const total = doc.totalAmount || 0;
      const netTotal = doc.netAmount || (total ? Math.round(total / 1.19) : 0);

      // Verificar si ya está registrada
      const alreadyAdded = (oc.dispatches || []).some(d =>
        (d.docType === "factura" && String(d.number || "") === num) ||
        String(d.invoiceNumber || "") === num
      );
      if (alreadyAdded) { setErr("Factura N° " + num + " ya está registrada en esta OC."); setLoading(false); return; }

      // Obtener ítems desde Bsale para mostrar detalle
      let facItems = [];
      try {
        const detailsData = await fetchBsale("/documents/" + doc.id + "/details.json");
        const detailItems = detailsData.items || [];
        const variantNames = await Promise.all(detailItems.map(async (it) => {
          if (!it.variant?.id) return it.variant?.description || "";
          try {
            const v = await fetchBsale("/variants/" + it.variant.id + ".json");
            const productId = v.product?.id;
            if (productId) {
              const p = await fetchBsale("/products/" + productId + ".json");
              const prodName = p.name || "";
              const varDesc = v.description || "";
              return [prodName, varDesc].filter(Boolean).join(" ");
            }
            return v.description || it.variant?.description || "";
          } catch { return it.variant?.description || ""; }
        }));
        facItems = detailItems.map((it, i) => ({
          id: i + 1,
          desc: variantNames[i] || it.comment || "",
          unit: it.unitAbbreviation || "UN",
          qty: Number(it.quantity || 1),
          unitPrice: Number(it.netUnitValue || it.unitValue || 0)
        }));
      } catch(e) { /* continuar sin items */ }

      // Buscar GD vinculada — usar _gdRefNumber ya resuelto en searchBsaleFac
      let gdNumber = doc._gdRefNumber || null;
      if (!gdNumber) {
        try {
          const refsData = await fetchBsale("/documents/" + doc.id + "/references.json");
          const refs = refsData.items || [];
          const gdRef = refs.find(r => r.documentTypeId === 8 || String(r.documentTypeName || "").toLowerCase().includes("guia") || String(r.dte_code?.id || "") === "16" || String(r.dte_code?.id || "") === "52");
          if (gdRef) gdNumber = String(gdRef.number || "");
        } catch(e) { /* continuar sin GD ref */ }
      }

      // Si hay GD refs, intentar _gdLink — usar ocs (estado fresco) para capturar GDs de esta sesión
      const gdNumbers = doc._gdRefNumbers || (doc._gdRefNumber ? [doc._gdRefNumber] : []);
      if (gdNumbers.length > 0) {
        const normGD = s => String(s).replace(/[\s.]/g, "");
        const freshOC = (ocs || []).find(o => o.id === oc.id);
        const freshDispatches = (freshOC?.dispatches || oc.dispatches || []);
        const matchingGDs = gdNumbers.map(gn =>
          freshDispatches.find(d => d.docType === "guia" && normGD(d.number || "") === normGD(gn))
        ).filter(Boolean);
        if (matchingGDs.length > 0) {
          await onSave(oc.id, {
            _gdLinks: true,
            gdIds: matchingGDs.map(g => g.id),
            invoiceNumber: num,
            invoiceDate: date,
            netTotal,
            total,
            items: facItems
          });
          setLastSaved({ num, docType: "factura", linked: true });
          setSavedCount(c => c + 1);
          setBsaleFacSearch(""); setBsaleFacResult(null); setBsaleFacErr(null);
          setLoading(false);
          return;
        }
      }

      // Sin GD vinculada — registrar como factura directa con ítems
      await onSave(oc.id, {
        docType: "factura",
        number: num,
        date,
        netTotal,
        total,
        items: facItems,
        gdNumber: gdNumber || null
      });
      setLastSaved({ num, docType: "factura", linked: !!gdNumber });
      setSavedCount(c => c + 1);
      setBsaleFacSearch(""); setBsaleFacResult(null); setBsaleFacErr(null);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  const handleSelectBsale = async (doc) => {
    setErr(null); setLoading(true);
    try {
      const tipo = doc._tipo === "factura" ? "factura" : "guia";
      const num = String(doc.number || "");
      const date = (doc.emissionDate || doc.generationDate) ? new Date((doc.emissionDate || doc.generationDate) * 1000).toISOString().slice(0, 10) : today();
      const total = doc.totalAmount || 0;
      const netTotal = doc.netAmount || (total ? Math.round(total / 1.19) : 0);

      // Obtener detalles (items) del documento desde Bsale
      let its = [];
      try {
        const detailsData = await fetchBsale("/documents/" + doc.id + "/details.json");
        const detailItems = detailsData.items || [];
        // Obtener nombre completo desde producto (variant solo tiene nombre corto)
        const variantNames = await Promise.all(detailItems.map(async (it) => {
          if (!it.variant?.id) return it.variant?.description || "";
          try {
            const v = await fetchBsale("/variants/" + it.variant.id + ".json");
            const productId = v.product?.id;
            if (productId) {
              const p = await fetchBsale("/products/" + productId + ".json");
              // Nombre completo = nombre producto + descripción variant (si son distintos)
              const prodName = p.name || "";
              const varDesc = v.description || "";
              return [prodName, varDesc].filter(Boolean).join(" ");
            }
            return v.description || it.variant?.description || "";
          } catch { return it.variant?.description || ""; }
        }));
        its = detailItems.map((it, i) => ({
          id: i + 1,
          desc: variantNames[i] || it.comment || "",
          unit: it.unitAbbreviation || "UN",
          qty: Number(it.quantity || 1),
          unitPrice: Number(it.netUnitValue || it.unitValue || 0)
        }));
      } catch(e) { console.warn("No se pudieron cargar detalles:", e); }

      // Obtener referencias del documento (OC, GD vinculada) y validar que pertenece a la OC actual
      let gdNumber = null;
      try {
        const refsData = await fetchBsale("/documents/" + doc.id + "/references.json");
        const refs = refsData.items || [];
        // Buscar referencia a GD
        const gdRef = refs.find(r => r.documentTypeId === 8 || String(r.documentTypeName || "").toLowerCase().includes("guia") || String(r.dte_code?.id || "") === "16" || String(r.dte_code?.id || "") === "52");
        if (gdRef) gdNumber = String(gdRef.number || "");
        // Validar que el documento referencia la OC actual
        const norm = s => String(s).replace(/[\s.]/g, "");
        const thisOC = norm(oc.ocNumber || "");
        if (thisOC) {
          const ocRef = refs.find(r => {
            const refNum = norm(String(r.number || ""));
            return refNum === thisOC || refNum.includes(thisOC) || thisOC.includes(refNum);
          });
          if (!ocRef) {
            const ocRefs = refs.map(r => r.number).filter(Boolean).join(", ");
            throw new Error("MISMATCH:" + (ocRefs || "OC PENDIENTE") + ":" + oc.ocNumber);
          }
        }
      } catch(e) {
        if (e.message.startsWith("MISMATCH:")) {
          const parts = e.message.split(":");
          const docOC = parts[1] || "OC PENDIENTE";
          const d2 = { docNumber: num, docType: tipo, date, items: its, netTotal, total, gdNumber };
          const its2b = its.map((it, i) => ({ ...it, id: i + 1 }));
          const am2 = {};
          its2b.forEach((it, i) => { am2[i] = autoMatch(it.desc, oc.items, it.unitPrice) || "NONE"; });
          setOcMismatch({ pdfOC: docOC, thisOC: oc.ocNumber, source: "Bsale" });
          setPendingOverride({ ext: d2, num, date, docType: tipo, items: its2b, map: am2 });
          setLoading(false);
          return;
        }
        // Si falla la consulta de referencias, continuar igual
      }

      const d = { docNumber: num, docType: tipo, date, items: its, netTotal, total, gdNumber };

      setExt(d); setNum(d.docNumber); setDate(d.date);
      setDocType(tipo);
      const its2 = its.map((it, i) => ({ ...it, id: i + 1 }));
      setItems(its2);
      const am = {};
      its2.forEach((it, i) => { am[i] = autoMatch(it.desc, oc.items, it.unitPrice) || "NONE"; });
      setMap(am);

      // Si es factura con GD referenciada, vincular automáticamente
      if (tipo === "factura" && d.gdNumber) {
        const normGD = s => String(s).replace(/[\s.]/g, "");
        const gdRef = normGD(d.gdNumber);
        const matchingGD = (oc.dispatches || []).find(disp =>
          disp.docType === "guia" && normGD(disp.number || "") === gdRef
        );
        if (matchingGD) {
          await onSave(oc.id, {
            _gdLink: true,
            gdId: matchingGD.id,
            invoiceNumber: d.docNumber || "",
            invoiceDate: d.date || today(),
            netTotal: d.netTotal || 0,
            total: d.total || 0
          });
          setLastSaved({ num: d.docNumber, docType: "factura", linked: true });
          setSavedCount(c => c + 1);
          setStep(0); setNum(""); setDate(today()); setDocType("guia"); setItems([]); setMap({}); setSplitPrice({}); setExt(null); setErr(null);
          setLoading(false);
          return;
        }
      }
      setOcMismatch(null);
      setStep(1);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  const handleFile = async f => {
    setErr(null); setLoading(true);
    try {
      const b64 = await toB64(f);
      // Intentar detectar NC primero (si el PDF la menciona) extrayendo con prompt NC
      // Usamos dispatch por defecto; si el resultado tiene docType "nc", usamos ese
      const d = await extractPDF(b64, "dispatch");
      // Si la IA detectó NC en el campo docType o es una NC (no factura ni guia)
      const isNC = d.docType === "nc";
      if (isNC) {
        setExt(d); setNum(d.docNumber || ""); setDate(d.date || today());
        setDocType("nc");
        const its = (d.items || []).map((it, i) => ({ ...it, id: i + 1 }));
        setItems(its);
        const am = {};
        its.forEach((it, i) => { am[i] = autoMatch(it.desc, oc.items, it.unitPrice) || "NONE"; });
        setMap(am);
        setOcMismatch(null);
        setStep(1);
        setLoading(false);
        return;
      }
      setExt(d); setNum(d.docNumber || ""); setDate(d.date || today());
      setDocType(d.docType === "factura" ? "factura" : "guia");
      const its = (d.items || []).map((it, i) => ({ ...it, id: i + 1 }));
      setItems(its);
      const am = {};
      its.forEach((it, i) => { am[i] = autoMatch(it.desc, oc.items, it.unitPrice) || "NONE"; });
      setMap(am);
      // Validar OC del PDF vs OC actual (normalizar: sin puntos ni espacios)
      if (d.ocNumber) {
        const norm = s => String(s).replace(/[\s.]/g, "");
        const pdfOC = norm(d.ocNumber);
        const thisOC = norm(oc.ocNumber || "");
        if (thisOC && pdfOC && !pdfOC.includes(thisOC) && !thisOC.includes(pdfOC)) {
          setOcMismatch({ pdfOC: d.ocNumber, thisOC: oc.ocNumber, source: "PDF" });
          // Guardar datos para que admin pueda continuar igual
          setPendingOverride({ ext: d, num: d.docNumber || "", date: d.date || today(), docType: d.docType === "factura" ? "factura" : "guia", items: its, map: am });
          setLoading(false);
          return;
        }
      }
      // Si es factura con GD referenciada, buscar GD existente y vincular automáticamente
      if (d.docType === "factura" && d.gdNumber) {
        const normGD = s => String(s).replace(/[\s.]/g, "");
        const gdRef = normGD(d.gdNumber);
        const matchingGD = (oc.dispatches || []).find(disp =>
          disp.docType === "guia" && normGD(disp.number || "") === gdRef
        );
        if (matchingGD) {
          await onSave(oc.id, {
            _gdLink: true,
            gdId: matchingGD.id,
            invoiceNumber: d.docNumber || "",
            invoiceDate: d.date || today(),
            netTotal: d.netTotal || 0,
            total: d.total || 0
          });
          setLastSaved({ num: d.docNumber, docType: "factura", linked: true });
          setSavedCount(c => c + 1);
          setStep(0); setNum(""); setDate(today()); setDocType("guia"); setItems([]); setMap({}); setSplitPrice({}); setExt(null); setErr(null);
          // Procesar siguiente en cola si hay
          
          setLoading(false);
          return;
        }
      }
      setOcMismatch(null);
      setStep(1);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  // Manejar múltiples archivos — procesa el primero y encola el resto
  const handleFiles = files => {
    const pdfs = Array.from(files).filter(f => f.type === "application/pdf");
    if (!pdfs.length) return;
    if (pdfs.length > 1) setPendingFiles(pdfs.slice(1));
    handleFile(pdfs[0]);
  };

  // Procesar siguiente PDF en cola cuando el modal vuelve al paso 0 y no está cargando
  useEffect(() => {
    if (step === 0 && !loading && !saving && pendingFiles.length > 0) {
      const next = pendingFiles[0];
      setPendingFiles(q => q.slice(1));
      handleFile(next);
    }
  }, [step, loading, saving, pendingFiles.length]);

  const updItem = (i, k, v) => setItems(p => {
    const n = [...p]; n[i] = { ...n[i], [k]: k === "qty" ? Number(v) : v }; return n;
  });

  const autoOk = Object.values(map).filter(v => v !== "NONE").length;
  const notMapped = items.length - autoOk;

  const save = async () => {
    if (!num || !items.length) return setErr("Completa numero de documento e items.");
    // Validación neto para facturas
    if (docType === "factura" && ext?.netTotal) {
      const mappedNet = items.reduce((s, it, i) => {
        return s + Number(it.qty) * Number(it.unitPrice || 0);
      }, 0);
      const diff = Math.abs(mappedNet - Number(ext.netTotal));
      const tolerance = Math.round(Number(ext.netTotal) * 0.001); // 0.1% tolerancia por redondeos
      if (diff > tolerance) {
        return setErr(`El total mapeado ${fmtCLP(mappedNet)} no coincide con el neto de la factura ${fmtCLP(ext.netTotal)}. Revisa las cantidades y precios.`);
      }
    }
    setSaving(true);
    try {
      const mapped = items.map((it, i) => {
        const ocItemId = map[i] && map[i] !== "NONE" ? Number(map[i]) : null;
        const ocItem = ocItemId ? oc.items.find(o => o.id === ocItemId) : null;
        const unitPrice = Number(it.unitPrice || (ocItem ? ocItem.unitPrice : 0) || 0);
        return { desc: it.desc, unit: it.unit || "Unidad", qty: Number(it.qty), unitPrice, ocItemId, splitPrice: splitPrice[i] ? true : undefined };
      });
      const dispTotal = mapped.reduce((s, it) => s + (Number(it.qty)||0) * (Number(it.unitPrice)||0), 0);
      const saveNetTotal = Number(ext?.netTotal || 0) || dispTotal || 0;
      const saveTotal = Number(ext?.total || 0) || (saveNetTotal ? Math.round(saveNetTotal * 1.19) : 0);
      const ncRefInvoice = docType === "nc" ? (ext?.refInvoice || null) : null;
      await onSave(oc.id, { id: "DISP-" + Date.now(), number: num, date, docType, invoiceNumber: null, gdNumber: ext?.gdNumber || null, refInvoice: ncRefInvoice, total: saveTotal, netTotal: saveNetTotal, items: mapped, createdBy: createdBy });
      // resetear para agregar otro despacho sin cerrar
      setSavedCount(c => c + 1);
      setLastSaved({ num, docType });
      setStep(0); setNum(""); setDate(today()); setDocType("guia"); setItems([]); setMap({}); setSplitPrice({}); setExt(null); setErr(null);
      // Procesar siguiente PDF en cola si hay
      
    } catch(e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <div className="overlay">
      <div className="modal modal-xl">
        <div className="modal-hd">
          <div><div className="modal-title">Registrar Despacho</div><div className="modal-sub">{oc.ocNumber || oc.id} · {oc.client}</div></div>
          <div className="xbtn" onClick={onClose}>✕</div>
        </div>
        <Steps labels={["Subir Documento", "Revisar", "Mapear items"]} current={step} />
        {ocMismatch && (
          <div style={{ background:"rgba(255,90,90,.1)", border:"1px solid var(--rose)", borderRadius:8, padding:"14px 18px", marginBottom:16 }}>
            <div style={{ color:"var(--rose)", fontWeight:600, marginBottom:6 }}>⚠ Documento rechazado — OC no coincide</div>
            <div style={{ fontSize:12, color:"var(--fog2)", lineHeight:1.6 }}>
              El documento {ocMismatch.source ? "(" + ocMismatch.source + ")" : ""} referencia la OC <strong style={{ color:"var(--white)" }}>{ocMismatch.pdfOC}</strong>, no la OC <strong style={{ color:"var(--white)" }}>{ocMismatch.thisOC}</strong>.<br/>
              Verifica que estás subiendo el documento correcto.
            </div>
            <div style={{ marginTop:12, display:"flex", gap:8, alignItems:"center" }}>
              <button className="btn btn-rose btn-sm" onClick={() => { setOcMismatch(null); setPendingOverride(null); }}>Cerrar</button>
              {(isAdmin || userEmail?.toLowerCase().trim() === "jhaeger@totalmetal.cl") && pendingOverride && (
                <button className="btn btn-gold btn-sm" onClick={() => {
                  setExt(pendingOverride.ext);
                  setNum(pendingOverride.num);
                  setDate(pendingOverride.date);
                  setDocType(pendingOverride.docType);
                  setItems(pendingOverride.items);
                  setMap(pendingOverride.map);
                  setOcMismatch(null);
                  setPendingOverride(null);
                  setStep(1);
                }}>Ingresar igualmente →</button>
              )}
            </div>
          </div>
        )}
        {step === 0 && (
          <>
            {lastSaved && (
              <div style={{ background:"rgba(127,255,90,.08)", border:"1px solid rgba(127,255,90,.2)", borderRadius:7, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ color:"var(--lime)", fontSize:14 }}>✓</span>
                <span style={{ fontSize:12, color:"var(--lime)" }}>{lastSaved.linked ? "Factura N° " + lastSaved.num + " vinculada a GD existente." : (lastSaved.docType === "factura" ? "Factura" : lastSaved.docType === "nc" ? "NC" : "Guia") + " N° " + lastSaved.num + " registrada."}</span>
                <span style={{ fontSize:11, color:"var(--fog2)", marginLeft:"auto" }}>{savedCount} guardado{savedCount !== 1 ? "s" : ""} en esta sesión</span>
              </div>
            )}
            {/* Buscar en Bsale por N° */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, letterSpacing:2, color:"var(--fog)", marginBottom:6 }}>⚡ BUSCAR EN BSALE POR N° DE DOCUMENTO</div>
              <div style={{ display:"flex", gap:8 }}>
                <input
                  style={{ flex:1, background:"var(--ink3)", border:"1px solid var(--line)", borderRadius:6, padding:"6px 10px", fontFamily:"var(--fM)", fontSize:12, color:"var(--white)", outline:"none" }}
                  placeholder="Ej: 1903"
                  autoFocus
                  value={bsaleSearch}
                  onChange={e => { setBsaleSearch(e.target.value); setBsaleResult(null); setBsaleErr(null); }}
                  onKeyDown={e => e.key === "Enter" && searchBsale(bsaleSearch)}
                />
                <button className="btn btn-outline btn-sm" onClick={() => searchBsale(bsaleSearch)} disabled={bsaleLoading}>
                  {bsaleLoading ? "..." : "Buscar"}
                </button>
              </div>
              {bsaleErr && <div style={{ fontSize:11, color:"var(--rose)", marginTop:6 }}>⚠ {bsaleErr}</div>}
              {bsaleResult && (() => {
                const doc = bsaleResult;
                const num = String(doc.number || "");
                const tipo = doc._tipo;
                const fecha = doc.generationDate ? new Date(doc.generationDate * 1000).toISOString().slice(0,10) : "—";
                const monto = doc.netAmount ? "$" + Number(doc.netAmount).toLocaleString("es-CL") : "—";
                const alreadyAdded = (oc.dispatches || []).some(d => {
                  const docNum = String(d.number||"");
                  const invNum = String(d.invoiceNumber||"");
                  if (tipo === "guia") {
                    // Una GD está agregada si su número coincide con un despacho de tipo guia
                    return d.docType === "guia" && docNum === num;
                  } else {
                    // Una factura está agregada si su número coincide con factura directa o con invoiceNumber de una guia
                    return (d.docType === "factura" && docNum === num) || invNum === num;
                  }
                });
                return (
                  <button disabled={alreadyAdded || loading} onClick={() => handleSelectBsale(doc)}
                    style={{ marginTop:8, width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"var(--ink3)", border:"1px solid var(--line)", borderRadius:7, cursor: alreadyAdded ? "default" : "pointer", opacity: alreadyAdded ? 0.4 : 1, textAlign:"left" }}>
                    <span className={"badge " + (tipo === "guia" ? "bdoc-guia" : "bdoc-fac")}>{tipo === "guia" ? "GD" : "FAC"}</span>
                    <span style={{ color:"var(--gold)", fontFamily:"var(--fM)", fontSize:13 }}>{num}</span>
                    <span style={{ color:"var(--fog2)", fontSize:11 }}>{fecha}</span>
                    <span style={{ color:"var(--lime)", fontSize:12, marginLeft:"auto" }}>{monto}</span>
                    {alreadyAdded
                      ? <span style={{ fontSize:9, color:"var(--lime)", letterSpacing:1 }}>✓ YA AGREGADO</span>
                      : <span style={{ fontSize:9, color:"var(--sky)", letterSpacing:1 }}>← USAR ESTE</span>}
                  </button>
                );
              })()}
              <div style={{ fontSize:9, color:"var(--fog)", marginTop:10, letterSpacing:1 }}>O sube un documento PDF manualmente:</div>
            </div>
            {/* Buscar Factura en Bsale — aparece cuando ya hay al menos una GD en esta OC */}
            {(oc.dispatches || []).some(d => d.docType === "guia") && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:9, letterSpacing:2, color:"var(--teal)", marginBottom:6 }}>🧾 BUSCAR FACTURA EN BSALE POR N° DE DOCUMENTO</div>
                <div style={{ display:"flex", gap:8 }}>
                  <input
                    style={{ flex:1, background:"var(--ink3)", border:"1px solid var(--line)", borderRadius:6, padding:"6px 10px", fontFamily:"var(--fM)", fontSize:12, color:"var(--white)", outline:"none" }}
                    placeholder="Ej: 12345"
                    value={bsaleFacSearch}
                    onChange={e => { setBsaleFacSearch(e.target.value); setBsaleFacResult(null); setBsaleFacErr(null); }}
                    onKeyDown={e => e.key === "Enter" && searchBsaleFac(bsaleFacSearch)}
                  />
                  <button className="btn btn-outline btn-sm" style={{ borderColor:"var(--teal)", color:"var(--teal)" }} onClick={() => searchBsaleFac(bsaleFacSearch)} disabled={bsaleFacLoading}>
                    {bsaleFacLoading ? "..." : "Buscar"}
                  </button>
                </div>
                {bsaleFacErr && <div style={{ fontSize:11, color:"var(--rose)", marginTop:6 }}>⚠ {bsaleFacErr}</div>}
                {bsaleFacResult && bsaleFacResult.length > 1 && (
                  <div style={{ fontSize:10, color:"var(--gold)", marginTop:8, marginBottom:2 }}>
                    ⚠ Se encontraron {bsaleFacResult.length} facturas con ese número — elige la correcta:
                  </div>
                )}
                {bsaleFacResult && bsaleFacResult.map((doc, idx) => {
                  const num = String(doc.number || "");
                  const fecha = doc.emissionDate ? new Date(doc.emissionDate * 1000).toISOString().slice(0,10) : "—";
                  const neto = doc.netAmount || 0;
                  const total = doc.totalAmount || 0;
                  const monto = neto ? "$" + Number(neto).toLocaleString("es-CL") + " neto" : (total ? "$" + Number(total).toLocaleString("es-CL") : "—");
                  const alreadyAdded = (oc.dispatches || []).some(d =>
                    (d.docType === "factura" && String(d.number || "") === num) ||
                    String(d.invoiceNumber || "") === num
                  );
                  const mismatch = doc._ocMismatch;
                  return (
                    <button key={doc.id || idx} disabled={alreadyAdded || (mismatch && !isAdmin) || loading}
                      onClick={() => !mismatch && handleSelectBsaleFac(doc)}
                      style={{ marginTop:6, width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"var(--ink3)", border:"1px solid " + (mismatch ? "var(--rose)" : alreadyAdded ? "var(--lime)" : "var(--teal)") + "44", borderRadius:7, cursor: (alreadyAdded || (mismatch && !isAdmin)) ? "default" : "pointer", opacity: (mismatch && !isAdmin) ? 0.45 : 1, textAlign:"left" }}>
                      <span className="badge bdoc-fac">FAC</span>
                      <span style={{ color:"var(--teal)", fontFamily:"var(--fM)", fontSize:13 }}>{num}</span>
                      <span style={{ color:"var(--fog2)", fontSize:11 }}>{fecha}</span>
                      {doc.municipality && <span style={{ fontSize:10, color:"var(--fog)", fontStyle:"italic" }}>{doc.municipality}</span>}
                      <span style={{ color:"var(--lime)", fontSize:12, marginLeft:"auto" }}>{monto}</span>
                      {alreadyAdded
                        ? <span style={{ fontSize:9, color:"var(--lime)", letterSpacing:1 }}>✓ YA AGREGADO</span>
                        : mismatch
                          ? <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontSize:9, color:"var(--rose)", letterSpacing:1 }}>✗ GD NO COINCIDE</span>
                              {isAdmin && <button className="btn btn-gold btn-sm" style={{ fontSize:9, padding:"2px 8px" }}
                                onClick={e => { e.stopPropagation(); handleSelectBsaleFac(doc); }}>
                                Ingresar igualmente →
                              </button>}
                            </span>
                          : <span style={{ fontSize:9, color:"var(--teal)", letterSpacing:1 }}>← VINCULAR</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <UploadZone onFile={f => handleFiles([f])} onFiles={handleFiles} loading={loading} label={lastSaved ? "Subir otro documento o" : "Arrastra la factura o guia aqui o"} />
            {pendingFiles.length > 0 && <div style={{ fontSize:11, color:"var(--gold)", marginTop:6 }}>⏳ {pendingFiles.length} PDF{pendingFiles.length !== 1 ? "s" : ""} en cola — se procesarán automáticamente</div>}
            {err && <div style={{ color:"var(--rose)", fontSize:11, marginTop:9 }}>⚠ {err}</div>}
          </>
        )}
        {step === 1 && (
          <>
            <div className="ex-box">
              <div className="ex-ok">✓ DOCUMENTO DETECTADO</div>
              <div className="ex-row"><span className="ex-k">Tipo</span><span className="ex-v" style={{ color: docType === "factura" ? "var(--teal)" : docType === "nc" ? "#ff8c00" : "var(--rose)" }}>{docType === "factura" ? "Factura" : docType === "nc" ? "Nota de Crédito" : "Guia de Despacho"}</span></div>
              <div className="ex-row"><span className="ex-k">N° Documento</span><span className="ex-v">{ext && ext.docNumber ? ext.docNumber : "—"}</span></div>
              <div className="ex-row"><span className="ex-k">Fecha</span><span className="ex-v">{ext && ext.date ? ext.date : "—"}</span></div>
              {ext && ext.netTotal ? <div className="ex-row"><span className="ex-k">Neto</span><span className="ex-v" style={{ color:"var(--gold)" }}>{fmtCLP(ext.netTotal)}</span></div> : null}
              {ext && ext.total ? <div className="ex-row"><span className="ex-k">Total c/IVA</span><span className="ex-v">{fmtCLP(ext.total)}</span></div> : null}
            </div>
            <div className="frow">
              <div className="fg">
                <label>TIPO DE DOCUMENTO</label>
                <select value={docType} onChange={e => setDocType(e.target.value)}>
                  <option value="guia">Guia de Despacho</option>
                  <option value="factura">Factura</option>
                  <option value="nc">Nota de Crédito</option>
                </select>
              </div>
              <div className="fg"><label>N° DOCUMENTO *</label><input value={num} onChange={e => setNum(e.target.value)} placeholder={docType === "factura" ? "Ej: 12345" : docType === "nc" ? "Ej: 158" : "Ej: 8821"} /></div>
              <div className="fg"><label>FECHA</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              {docType === "nc" && <div className="fg"><label>N° FACTURA REFERENCIADA *</label><input value={ext?.refInvoice || ""} onChange={e => setExt(p => ({ ...p, refInvoice: e.target.value }))} placeholder="Ej: 1795" /></div>}
              {(docType === "factura" || docType === "nc") && <div className="fg"><label>{docType === "nc" ? "MONTO NETO NC *" : "MONTO NETO FACTURA *"}</label><input type="number" value={ext?.netTotal || 0} onChange={e => setExt(p => ({ ...p, netTotal: Number(e.target.value) }))} placeholder="Monto neto sin IVA" /></div>}
            </div>
            <div className="slbl">ITEMS DEL DOCUMENTO</div>
            <div className="itbl">
              <table>
                <thead><tr><th>DESCRIPCION</th><th>UNIDAD</th><th>CANTIDAD</th><th>P.UNIT.</th><th /></tr></thead>
                <tbody>{items.map((it, i) => (
                  <tr key={it.id}>
                    <td><input value={it.desc} onChange={e => updItem(i, "desc", e.target.value)} /></td>
                    <td><input value={it.unit || ""} onChange={e => updItem(i, "unit", e.target.value)} style={{ width:60 }} /></td>
                    <td><input type="number" value={it.qty} onChange={e => updItem(i, "qty", e.target.value)} style={{ width:76 }} /></td>
                    <td><input type="number" value={it.unitPrice || 0} onChange={e => updItem(i, "unitPrice", e.target.value)} style={{ width:86 }} /></td>
                    <td><button className="btn btn-rose btn-sm" onClick={() => {
                      setItems(p => p.filter((_, j) => j !== i));
                      setMap(p => { const n = {}; Object.keys(p).filter(k => Number(k) !== i).forEach((k, j) => n[j] = p[k]); return n; });
                    }}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
              <button className="btn btn-outline btn-sm" onClick={() => {
                const j = items.length;
                setItems(p => [...p, { id: Date.now(), desc: "", unit: "Unidad", qty: 0 }]);
                setMap(p => ({ ...p, [j]: "NONE" }));
              }}>+ Item</button>
            </div>
            {err && <div style={{ color:"var(--rose)", fontSize:11, marginBottom:11 }}>⚠ {err}</div>}
            {(() => {
              // Botón mágico: solo admin, solo si suma GDs + doc actual ≈ monto OC
              if (!isAdmin) return null;
              const montoOC = (oc.items || []).reduce((s, it) => s + Number(it.qty) * Number(it.unitPrice || 0), 0);
              if (montoOC <= 0) return null;
              const montoGDsExistentes = (oc.dispatches || []).filter(d => d.docType === "guia").reduce((s, d) => s + Number(d.netTotal || 0), 0);
              const montoDocActual = Number(ext?.netTotal || 0) || items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0), 0);
              const sumaTotal = montoGDsExistentes + montoDocActual;
              const cuadra = montoOC > 0 && Math.abs(sumaTotal - montoOC) / montoOC < 0.02;
              const ningunoMapeado = Object.values(map).every(v => !v || v === "NONE");
              if (!cuadra || !ningunoMapeado) return null;
              return (
                <div style={{ background:"linear-gradient(135deg,#1a2a1a,#1a1a2a)", border:"1px solid var(--lime)", borderRadius:8, padding:"10px 14px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:10, color:"var(--lime)", fontWeight:600, letterSpacing:1 }}>✓ MONTOS CUADRAN — MAPEO AUTOMÁTICO DISPONIBLE</div>
                    <div style={{ fontSize:9, color:"var(--fog)", marginTop:2 }}>
                      GDs existentes {fmtCLP(montoGDsExistentes)} + este doc {fmtCLP(montoDocActual)} = {fmtCLP(sumaTotal)} / OC {fmtCLP(montoOC)}
                    </div>
                  </div>
                  <button className="btn btn-sm" style={{ background:"var(--lime)", color:"#111", fontWeight:700, fontSize:10, padding:"5px 14px", borderRadius:6, border:"none", cursor:"pointer", whiteSpace:"nowrap" }}
                    onClick={() => {
                      const emptyMap = {};
                      items.forEach((_, idx) => { emptyMap[idx] = "NONE"; });
                      setMap(emptyMap);
                      setStep(2);
                    }}>⚡ Guardar sin mapear</button>
                </div>
              );
            })()}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setStep(0)}>← Volver</button>
              <button className="btn btn-gold" onClick={() => setStep(2)}>Mapear items →</button>
              {isAdmin && (
                <button className="btn btn-outline btn-sm" style={{ color:"var(--fog2)", borderColor:"var(--line2)", fontSize:10 }}
                  onClick={() => {
                    const emptyMap = {};
                    items.forEach((_, i) => { emptyMap[i] = "NONE"; });
                    setMap(emptyMap);
                    setStep(2);
                  }}>Avanzar sin mapear</button>
              )}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="map-info">
              Vincula cada item con el correspondiente en la OC.<br />
              <strong>{autoOk} coincidencia{autoOk !== 1 ? "s" : ""} automatica{autoOk !== 1 ? "s" : ""}</strong>
              {notMapped > 0 && <span> · <span style={{ color:"var(--gold)" }}>{notMapped} sin vincular</span> — asignalos manualmente.</span>}
            </div>
            <table className="map-tbl">
              <thead><tr><th>ITEM EN EL DOCUMENTO</th><th className="map-arrow" /><th>ITEM EN LA OC</th><th style={{ width:86 }}>CANTIDAD</th><th style={{ width:36 }} /></tr></thead>
              <tbody>{items.map((it, i) => {
                const val = map[i];
                const matched = val && val !== "NONE";
                // Detectar si este ocItemId ya está usado por otro item del doc
                const sharedWithOther = matched && Object.entries(map).some(([k, v]) => Number(k) !== i && String(v) === String(val) && v !== "NONE");
                const isSplit = !!splitPrice[i];
                // Detectar si este ítem es una división de otro (mismo sourceId)
                const isDiv = !!it._sourceId;
                const siblingQty = isDiv ? items.filter((x, j) => j !== i && x._sourceId === it._sourceId).reduce((s, x) => s + Number(x.qty || 0), 0) : 0;
                const sourceQty = isDiv ? it._sourceQty : Number(it.qty);
                // Calcular qty disponible considerando otras líneas mergeadas al mismo ocItem
                const ocItem = matched ? oc.items.find(o => String(o.id) === String(val)) : null;
                const pendiente = ocItem ? Number(ocItem.qty) - Number(ocItem.dispatched || 0) : 0;
                const qtyOtrasLineas = sharedWithOther ? items.reduce((s, it2, j) => {
                  if (j !== i && String(map[j]) === String(val) && !splitPrice[j]) return s + Number(it2.qty || 0);
                  return s;
                }, 0) : 0;
                const qtyDisponible = pendiente - qtyOtrasLineas;
                const excede = matched && !isSplit && sharedWithOther && Number(it.qty) > qtyDisponible;
                return (
                  <tr key={it.id || i}>
                    <td>
                      <div style={{ fontWeight:500, fontSize:12 }}>
                        {it.desc}
                        {isDiv && <span style={{ fontSize:9, color:"var(--violet)", marginLeft:6, letterSpacing:1 }}>÷ DIVISIÓN</span>}
                      </div>
                      <div style={{ fontSize:9, color:"var(--sky)", marginTop:2 }}>Cant: {fmtNum(it.qty)} {it.unit}</div>
                      {isDiv && <div style={{ fontSize:9, color:"var(--fog)", marginTop:1 }}>Total original: {fmtNum(sourceQty)} · Otras líneas: {fmtNum(siblingQty)}</div>}
                      {sharedWithOther && (
                        <div style={{ marginTop:5 }}>
                          <label style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", fontSize:9, letterSpacing:1, color: isSplit ? "var(--rose)" : "var(--lime)" }}>
                            <input type="checkbox" checked={isSplit} onChange={e => setSplitPrice(p => ({ ...p, [i]: e.target.checked }))}
                              style={{ accentColor:"var(--rose)", width:11, height:11 }} />
                            {isSplit ? "✓ SUBDIVISIÓN DE PRECIO — qty no suma" : "✓ MERGE — qty suma al mismo item OC"}
                          </label>
                          {!isSplit && <div style={{ fontSize:9, color:"var(--fog)", marginTop:2 }}>Disponible: {fmtNum(qtyDisponible)} {ocItem?.unit}</div>}
                        </div>
                      )}
                      {excede && <div style={{ fontSize:9, color:"var(--rose)", marginTop:3 }}>⚠ Excede el pendiente disponible ({fmtNum(qtyDisponible)} {ocItem?.unit})</div>}
                    </td>
                    <td className="map-arrow">→</td>
                    <td>
                      {(() => {
                        const srch = (mapSearch[i] || "").toLowerCase();
                        const ocFiltered = oc.items.filter(o => {
                          const pend = Number(o.qty) - Number(o.dispatched || 0);
                          if (docType !== "factura" && docType !== "nc" && pend <= 0) return false;
                          if (srch && !o.desc.toLowerCase().includes(srch)) return false;
                          return true;
                        });
                        return (
                          <div>
                            {(() => {
                              const _mOC = (oc.items||[]).reduce((s,it)=>s+Number(it.qty)*Number(it.unitPrice||0),0);
                              const _mGD = (oc.dispatches||[]).filter(d=>d.docType==="guia").reduce((s,d)=>s+Number(d.netTotal||0),0);
                              const _mDoc = Number(ext?.netTotal||0)||items.reduce((s,it)=>s+Number(it.qty||0)*Number(it.unitPrice||0),0);
                              const _cuadra = _mOC>0 && Math.abs((_mGD+_mDoc)-_mOC)/_mOC<0.02;
                              const _sinMapear = Object.values(map).every(v=>!v||v==="NONE");
                              if (!_cuadra||!_sinMapear) return null;
                              return (
                                <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:3 }}>
                                  <input
                                    placeholder="Buscar ítem OC..."
                                    value={mapSearch[i] || ""}
                                    onChange={e => setMapSearch(p => ({ ...p, [i]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setMapSearch(p => ({ ...p, [i]: "" })); } }}
                                    style={{ flex:1, background:"var(--ink3)", border:"1px solid var(--line2)", borderRadius:4, color:"var(--white)", fontFamily:"var(--fM)", fontSize:10, padding:"3px 7px", outline:"none" }}
                                  />
                                  {mapSearch[i] && <button onClick={() => setMapSearch(p => ({ ...p, [i]: "" }))} style={{ background:"none", border:"none", color:"var(--fog)", cursor:"pointer", fontSize:11, padding:0 }}>✕</button>}
                                </div>
                              );
                            })()}
                            <select className={"map-sel" + (matched ? (excede ? " warn" : " ok") : " warn")} value={val || "NONE"}
                              onChange={e => {
                                setMap(p => ({ ...p, [i]: e.target.value }));
                                setSplitPrice(p => ({ ...p, [i]: false }));
                                setMapSearch(p => ({ ...p, [i]: "" }));
                              }}>
                              <option value="NONE">— Sin vincular —</option>
                              {ocFiltered.map(o => {
                                const pend = Number(o.qty) - Number(o.dispatched || 0);
                                const qtyEnMapeo = items.reduce((s, it2, j) => {
                                  if (String(map[j]) === String(o.id) && !splitPrice[j]) return s + Number(it2.qty || 0);
                                  return s;
                                }, 0);
                                const disponible = pend - qtyEnMapeo;
                                const enUso = Object.entries(map).some(([k, v]) => String(v) === String(o.id) && v !== "NONE");
                                const label = enUso ? "⊕ " : "";
                                const dispLabel = disponible > 0 ? fmtNum(disponible) + " " + o.unit + " dispon." : disponible === 0 && qtyEnMapeo > 0 ? "✓ cubierto" : "✓ despachado";
                                return <option key={o.id} value={o.id}>{label}{o.desc} · {dispLabel}</option>;
                              })}
                            </select>
                          </div>
                        );
                      })()}
                      {!matched && <div className="map-note">⚠ No descontara del remanente</div>}
                    </td>
                    <td><input type="number" className="map-qty" value={it.qty} min={1} onChange={e => updItem(i, "qty", e.target.value)} style={{ opacity: isSplit ? 0.4 : 1 }} /></td>
                    <td style={{ display:"flex", gap:4 }}>
                      {/* Botón dividir: solo si qty > 1 y no es ya una división con qty=1 */}
                      {Number(it.qty) > 1 && (
                        <button className="btn btn-teal btn-sm" title="Dividir en dos líneas" onClick={() => {
                          const srcId = it._sourceId || ("SRC-" + i + "-" + Date.now());
                          const srcQty = it._sourceQty || Number(it.qty);
                          const q1 = Math.floor(srcQty / 2);
                          const q2 = srcQty - q1;
                          // Reemplazar ítem actual con dos líneas
                          setItems(p => {
                            const newItems = [...p];
                            newItems.splice(i, 1,
                              { ...it, qty: q1, _sourceId: srcId, _sourceQty: srcQty },
                              { ...it, id: it.id + "-div", qty: q2, _sourceId: srcId, _sourceQty: srcQty }
                            );
                            return newItems;
                          });
                          setMap(p => {
                            const newMap = {};
                            const keys = Object.keys(p).map(Number).sort((a,b) => a-b);
                            let offset = 0;
                            for (let k = 0; k <= Math.max(...keys, i); k++) {
                              if (k < i) newMap[k] = p[k];
                              else if (k === i) { newMap[k] = p[k]; newMap[k+1] = "NONE"; offset = 1; }
                              else if (p[k] !== undefined) newMap[k + offset] = p[k];
                            }
                            return newMap;
                          });
                        }}>÷</button>
                      )}
                      <button className="btn btn-rose btn-sm" title="Eliminar item" onClick={() => {
                        setItems(p => p.filter((_, j) => j !== i));
                        setMap(p => { const n = {}; Object.keys(p).filter(k => Number(k) !== i).forEach((k, j) => n[j] = p[Number(k) > i ? Number(k) - 1 : Number(k)]); return n; });
                      }}>✕</button>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
            {err && <div style={{ color:"var(--rose)", fontSize:11, marginBottom:11 }}>⚠ {err}</div>}
            {warn && <div style={{ color:"var(--gold)", fontSize:11, marginBottom:11, background:"rgba(232,184,75,.08)", border:"1px solid rgba(232,184,75,.2)", borderRadius:5, padding:"6px 10px" }}>⚠ {warn}</div>}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Volver</button>
              <button className="btn btn-gold" onClick={() => {
                if (docType === "factura") {
                  const sinMapear = items.filter((_, i) => !map[i] || map[i] === "NONE").length;
                  if (sinMapear > 0) { setErr("Una factura debe tener todos sus items vinculados. Faltan " + sinMapear + " por vincular."); return; }
                }
                // Validar que ningún merge exceda el pendiente — warning no bloqueante
                const ocItemQty = {};
                const warns = [];
                for (let i = 0; i < items.length; i++) {
                  const val = map[i];
                  if (!val || val === "NONE" || splitPrice[i]) continue;
                  const ocItem = oc.items.find(o => String(o.id) === String(val));
                  if (!ocItem) continue;
                  const pend = Number(ocItem.qty) - Number(ocItem.dispatched || 0);
                  if (!ocItemQty[val]) ocItemQty[val] = 0;
                  ocItemQty[val] += Number(items[i].qty || 0);
                  if (docType !== "nc" && ocItemQty[val] > pend) {
                    warns.push(`"${ocItem.desc}": ${fmtNum(pend)} pendientes, asignando ${fmtNum(ocItemQty[val])} (posible diferencia de unidad).`);
                  }
                }
                setErr(null);
                setWarn(warns.length > 0 ? warns.join(" / ") : null);
                setStep(3);
              }}>Revisar →</button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="map-info" style={{ background:"rgba(100,220,100,0.06)", borderColor:"var(--lime)" }}>
              <strong style={{ color:"var(--lime)" }}>✓ Resumen del mapeo</strong> — Revisa antes de confirmar.
            </div>
            <table className="map-tbl">
              <thead><tr><th>ITEM EN EL DOCUMENTO</th><th className="map-arrow" /><th>ITEM EN LA OC</th><th style={{ width:70, textAlign:"right" }}>CANT.</th><th style={{ width:80, textAlign:"right" }}>P.UNIT.</th><th style={{ width:90, textAlign:"right" }}>TOTAL</th></tr></thead>
              <tbody>{items.map((it, i) => {
                const ocItemId = map[i] && map[i] !== "NONE" ? Number(map[i]) : null;
                const ocItem = ocItemId ? oc.items.find(o => o.id === ocItemId) : null;
                const isSplit = !!splitPrice[i];
                const lineTotal = isSplit ? 0 : Number(it.qty) * Number(it.unitPrice || 0);
                return (
                  <tr key={it.id} style={{ opacity: isSplit ? 0.6 : 1 }}>
                    <td>
                      <div style={{ fontSize:12, fontWeight:500 }}>{it.desc}</div>
                      <div style={{ fontSize:9, color:"var(--fog)" }}>{it.unit}</div>
                      {isSplit && <div style={{ fontSize:9, color:"var(--rose)", marginTop:2, letterSpacing:1 }}>⚑ SUBDIVISIÓN — qty no suma</div>}
                    </td>
                    <td className="map-arrow">→</td>
                    <td>{ocItem
                      ? <div><div style={{ fontSize:12, color:"var(--lime)" }}>{ocItem.desc}</div><div style={{ fontSize:9, color:"var(--fog)" }}>Pend: {fmtNum(Number(ocItem.qty)-Number(ocItem.dispatched||0))} {ocItem.unit}</div></div>
                      : <span style={{ color:"var(--gold)", fontSize:11 }}>⚠ Sin vincular</span>}
                    </td>
                    <td style={{ textAlign:"right", fontWeight:600, color: isSplit ? "var(--fog)" : "var(--sky)" }}>{fmtNum(it.qty)}</td>
                    <td style={{ textAlign:"right", color:"var(--fog2)", fontSize:11 }}>{fmtCLP(it.unitPrice || 0)}</td>
                    <td style={{ textAlign:"right", fontWeight:600, color: isSplit ? "var(--rose)" : "var(--gold)", fontSize:12 }}>{fmtCLP(Number(it.qty) * Number(it.unitPrice || 0))}{isSplit && <span style={{ fontSize:8, color:"var(--fog)", marginLeft:3 }}>(÷qty)</span>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14, padding:"10px 14px", background:"var(--ink3)", borderRadius:8, border:"1px solid var(--line)" }}>
              <div style={{ fontSize:11, color:"var(--fog)" }}>
                {items.length} item{items.length !== 1 ? "s" : ""} · {items.filter((_,i) => map[i] && map[i] !== "NONE").length} vinculado{items.filter((_,i) => map[i] && map[i] !== "NONE").length !== 1 ? "s" : ""}
                {items.some((_,i) => splitPrice[i]) && <span style={{ color:"var(--rose)", marginLeft:8 }}>· {items.filter((_,i) => splitPrice[i]).length} subdivisión</span>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                <div style={{ fontSize:13, color:"var(--gold)", fontWeight:600 }}>
                  Total mapeado: {fmtCLP(items.reduce((s,it,i) => s + Number(it.qty) * Number(it.unitPrice || 0), 0))}
                </div>
                {ext?.netTotal && <div style={{ fontSize:10, color:"var(--fog2)" }}>Neto {docType === "factura" ? "factura" : "GD"}: {fmtCLP(ext.netTotal)}</div>}
              </div>
            </div>
            {err && <div style={{ color:"var(--rose)", fontSize:11, marginBottom:11, marginTop:8 }}>⚠ {err}</div>}
            {warn && <div style={{ color:"var(--gold)", fontSize:11, marginBottom:11, marginTop:8, background:"rgba(232,184,75,.08)", border:"1px solid rgba(232,184,75,.2)", borderRadius:5, padding:"6px 10px" }}>⚠ {warn}</div>}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Corregir mapeo</button>
              <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? <><div className="spin" />Guardando...</> : "Confirmar y Registrar " + (docType === "factura" ? "Factura" : docType === "nc" ? "NC" : "Guia") + " ✓"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConvertModal({ dispatch, ocId, onClose, onSave }) {
  const [num, setNum] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const save = async () => {
    if (!num.trim()) return setErr("Ingresa el numero de factura.");
    setSaving(true);
    try { await onSave(ocId, dispatch.id, num.trim()); }
    catch(e) { setErr(e.message); }
    setSaving(false);
  };
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth:440 }}>
        <div className="modal-hd">
          <div><div className="modal-title">Vincular Factura</div><div className="modal-sub">Guia {dispatch.number} · {dispatch.date}</div></div>
          <div className="xbtn" onClick={onClose}>✕</div>
        </div>
        <div className="conv-box">
          <div className="conv-hint">La guia <strong style={{ color:"var(--rose)" }}>N° {dispatch.number}</strong> ya tiene sus items registrados. Solo ingresa el N° de factura para vincularla.</div>
          <div className="slbl" style={{ marginBottom:8 }}>ITEMS QUE INCLUYE</div>
          {dispatch.items.map((it, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"3px 0", color:"var(--fog2)" }}>
              <span>{it.desc}</span><span style={{ color:"var(--gold)" }}>{fmtNum(it.qty)} {it.unit}</span>
            </div>
          ))}
        </div>
        <div className="fg" style={{ marginTop:16, marginBottom:16 }}>
          <label>NUMERO DE FACTURA *</label>
          <input value={num} onChange={e => setNum(e.target.value)} placeholder="Ej: 12345" onKeyDown={e => e.key === "Enter" && save()} autoFocus />
        </div>
        {err && <div style={{ color:"var(--rose)", fontSize:11, marginBottom:11 }}>⚠ {err}</div>}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-teal" onClick={save} disabled={saving}>{saving ? <><div className="spin" />Guardando...</> : "Vincular →"}</button>
        </div>
      </div>
    </div>
  );
}


async function generateOCPDF(oc, st, totAmt, disAmt, pctGlobal) {
  if (!window.jspdf) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210; const H = 297;
  const ml = 14; const mr = W - 14;
  let y = 14;

  const fmtN = n => Number(n || 0).toLocaleString("es-CL");
  const fmtM = n => "$" + fmtN(Math.round(n));
  const stLabel = { open:"Abierta", partial:"Parcial", closed:"Cerrada", toinvoice:"Por Facturar" }[st] || st;
  const stColor = { open:[77,184,255], partial:[232,184,75], closed:[127,255,90], toinvoice:[255,90,90] }[st] || [200,200,200];

  // Header: título OC a la izquierda, logo a la derecha
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(oc.ocNumber || oc.id, ml, y + 5);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(oc.client || "", ml, y + 12);
  if (oc.ocNumber) doc.text("Ref. " + oc.id, ml, y + 18);

  // Badge estado — debajo del texto, no sobre el logo
  doc.setFillColor(...stColor);
  doc.setDrawColor(...stColor);
  doc.roundedRect(ml, y + 22, 32, 6, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(30, 30, 30);
  doc.text(stLabel, ml + 16, y + 26.5, { align: "center" });

  // Logo esquina superior derecha
  try { doc.addImage(TM_LOGO_B64, "PNG", mr - 34, y - 2, 30, 20); } catch(e) {}

  y += 34;

  // Línea separadora
  doc.setDrawColor(220, 220, 220);
  doc.line(ml, y, mr, y);
  y += 6;

  // Datos generales — 4 columnas
  const c1 = ml, c2 = 65, c3 = 115, c4 = 160;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text("FECHA OC", c1, y);
  doc.text("MONTO OC", c2, y);
  doc.text("DESPACHADO", c3, y);
  doc.text("REMANENTE", c4, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(oc.date || "—", c1, y);
  doc.text(fmtM(totAmt), c2, y);
  doc.setTextColor(40, 160, 80);
  doc.text(fmtM(disAmt), c3, y);
  const rem0 = oc._closedByMonto ? 0 : totAmt - disAmt;
  doc.setTextColor(rem0 > 0 ? 200 : 40, rem0 > 0 ? 80 : 160, 80);
  doc.text(fmtM(rem0), c4, y);
  y += 7;

  // Notas
  if (oc.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.setFillColor(245, 245, 245);
    const lines = doc.splitTextToSize(oc.notes, mr - ml - 4);
    const notesH = lines.length * 4 + 4;
    doc.rect(ml, y, mr - ml, notesH, "F");
    doc.text(lines, ml + 2, y + 4);
    y += notesH + 4;
  }

  y += 2;
  doc.setDrawColor(220, 220, 220);
  doc.line(ml, y, mr, y);
  y += 6;

  // Tabla ítems — columnas ajustadas, sin barra de progreso
  // Posiciones: DESCRIPCIÓN(14-105) | UN(107) | P.UNIT(130 right) | OC(148 right) | DESP.(163 right) | REMANENTE(196 right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.setFillColor(235, 235, 235);
  doc.rect(ml, y - 4, mr - ml, 6, "F");
  doc.text("DESCRIPCIÓN", ml + 2, y);
  doc.text("UN", 107, y);
  doc.text("P.UNIT", 130, y, { align: "right" });
  doc.text("OC", 148, y, { align: "right" });
  doc.text("DESP.", 163, y, { align: "right" });
  doc.text("REMANENTE", mr - 2, y, { align: "right" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  (oc.items || []).forEach((it, i) => {
    if (y > H - 30) { doc.addPage(); y = 20; }
    if (i % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(ml, y - 3.5, mr - ml, 6, "F"); }
    const rem = Number(it.qty) - Number(it.dispatched || 0);
    doc.setTextColor(40, 40, 40);
    const descLines = doc.splitTextToSize(it.desc || "", 88);
    doc.text(descLines[0], ml + 2, y);
    doc.setTextColor(100, 100, 100);
    doc.text(it.unit || "UN", 107, y);
    doc.text(fmtM(it.unitPrice || 0), 130, y, { align: "right" });
    doc.setTextColor(40, 40, 40);
    doc.text(fmtN(it.qty), 148, y, { align: "right" });
    doc.setTextColor(40, 160, 80);
    doc.text(fmtN(it.dispatched || 0), 163, y, { align: "right" });
    if (rem > 0) { doc.setTextColor(200, 120, 40); doc.text(fmtN(rem) + " pend.", mr - 2, y, { align: "right" }); }
    else if (rem === 0) { doc.setTextColor(40, 160, 80); doc.text("Completo", mr - 2, y, { align: "right" }); }
    else { doc.setTextColor(200, 60, 60); doc.text(fmtN(Math.abs(rem)) + " exc.", mr - 2, y, { align: "right" }); }
    y += 6;
  });

  y += 2;
  doc.setDrawColor(220, 220, 220);
  doc.line(ml, y, mr, y);
  y += 6;

  // Documentos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text("DOCUMENTOS", ml, y);
  y += 6;

  (oc.dispatches || []).forEach(d => {
    if (y > H - 25) { doc.addPage(); y = 20; }
    const isGD = d.docType === "guia";
    const isFac = d.docType === "factura";
    const isNC = d.docType === "nc";
    const badgeColor = isGD ? (d.invoiceNumber ? [100, 80, 200] : [200, 140, 40]) : isFac ? [40, 160, 140] : [200, 100, 0];
    const label = isGD ? ("GD " + d.number + (d.invoiceNumber ? " · Fac. " + d.invoiceNumber : " (sin factura)")) : isFac ? "Factura " + d.number : "NC " + d.number;
    const bgColor = badgeColor.map(c => Math.min(255, c + 155));
    doc.setFillColor(...bgColor);
    doc.setDrawColor(...bgColor);
    doc.roundedRect(ml, y - 3.5, mr - ml, 6, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...badgeColor);
    doc.text(label, ml + 3, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(d.date || d.invoiceDate || "", mr - 3, y, { align: "right" });
    y += 7;

    const displayItems = (d.invoiceItems && d.invoiceItems.length > 0) ? d.invoiceItems : (d.items || []);
    displayItems.forEach(it => {
      if (y > H - 20) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      const desc = doc.splitTextToSize(it.desc || "", 130);
      doc.text("  " + desc[0], ml + 2, y);
      doc.setTextColor(100, 100, 100);
      doc.text(fmtN(it.qty) + " " + (it.unit || "UN"), 163, y, { align: "right" });
      if (it.unitPrice) { doc.setTextColor(80, 80, 80); doc.text(fmtM(Number(it.qty) * Number(it.unitPrice)), mr - 2, y, { align: "right" }); }
      y += 4.5;
    });

    const neto = Number(d.netTotal || 0);
    const total = Number(d.total || 0);
    if (neto || total) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...badgeColor);
      const lbl2 = isGD ? "TOTAL GD" : isNC ? "NC" : "NETO FACTURA";
      const val = isGD ? fmtM(neto || total) : fmtM(neto);
      doc.text(lbl2 + ": " + val, mr - 2, y, { align: "right" });
      y += 5;
    }
    y += 1;
  });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.line(ml, H - 12, mr, H - 12);
  doc.text("INDUSTRIAL Y COMERCIAL TOTALMETAL LIMITADA  ·  Generado " + new Date().toLocaleDateString("es-CL"), ml, H - 7);
  doc.text("Pág. 1", mr, H - 7, { align: "right" });

  const filename = "OC_" + (oc.ocNumber || oc.id) + "_" + (oc.client || "").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20) + ".pdf";
  doc.save(filename);
}


function OCDetailModal({ oc, onClose, onAddDispatch, onDelDispatch, onConvert, onUpdateDelivery, onUpdateClient, onUpdateOCNumber, canDelete, onRequestDel, currentUserId, isAdmin, userEmail, onCerrarPorMonto }) {
  const canDelGD = isAdmin || (userEmail?.toLowerCase().trim() === "jhaeger@totalmetal.cl");
  const [docFilter, setDocFilter] = useState("all");
  const [editingDate, setEditingDate] = useState(false);
  const [dateVal, setDateVal] = useState(oc.deliveryDate || "");
  const [editingClient, setEditingClient] = useState(false);
  const [clientVal, setClientVal] = useState(oc.client || "");
  const [editingOCNumber, setEditingOCNumber] = useState(false);
  const [ocNumberVal, setOCNumberVal] = useState(oc.ocNumber || "");
  const st = ocStatus(oc.items, oc.dispatches, oc);
  const totAmt = oc.items.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0);
  const disAmt = oc._closedByMonto ? totAmt : oc.items.reduce((s, i) => s + Number(i.dispatched || 0) * Number(i.unitPrice), 0);
  const days = daysLeft(oc.deliveryDate);
  const dayColor = (st === "closed" || st === "toinvoice") ? "var(--fog2)" : days !== null && days <= 0 ? "var(--rose)" : days !== null && days <= 5 ? "var(--gold)" : "var(--white)";
  const dispatches = oc.dispatches || [];
  const filteredDisp = dispatches.filter(d => {
    if (docFilter === "all") return true;
    if (docFilter === "factura") return d.docType === "factura" || (d.docType === "guia" && d.invoiceNumber);
    if (docFilter === "guia") return d.docType === "guia";
    if (docFilter === "nc") return d.docType === "nc";
    return true;
  });
  const hasNC = dispatches.some(d => d.docType === "nc");
  const pendingGuias = dispatches.filter(d => {
    if (d.docType !== "guia" || d.invoiceNumber) return false;
    const normN = s => String(s).replace(/[\s.]/g, "");
    return !dispatches.some(f => f.docType === "factura" && f.gdNumber && normN(f.gdNumber) === normN(d.number || ""));
  }).length;
  const pctGlobal = totAmt > 0 ? Math.round(disAmt / totAmt * 100) : 0;

  return (
    <div className="overlay">
      <div className="modal modal-xl">
        <div className="modal-hd">
          <div>
            <div className="modal-title" style={{ display:"flex", alignItems:"center", gap:8 }}>
              {editingOCNumber ? (
                <>
                  <input
                    value={ocNumberVal}
                    onChange={e => setOCNumberVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { onUpdateOCNumber(oc.id, ocNumberVal); setEditingOCNumber(false); } if (e.key === "Escape") setEditingOCNumber(false); }}
                    autoFocus
                    style={{ background:"var(--ink3)", border:"1px solid var(--gold)", borderRadius:6, color:"var(--gold)", fontFamily:"var(--fS)", fontSize:22, fontStyle:"italic", padding:"2px 10px", width:220, outline:"none" }}
                  />
                  <button className="btn btn-teal btn-sm" onClick={() => { onUpdateOCNumber(oc.id, ocNumberVal); setEditingOCNumber(false); }}>✓</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingOCNumber(false)}>✕</button>
                </>
              ) : (
                <>
                  <span>{oc.ocNumber || oc.id}</span>
                  {isAdmin && <span onClick={() => { setEditingOCNumber(true); setOCNumberVal(oc.ocNumber || ""); }} style={{ cursor:"pointer", color:"var(--fog)", fontSize:9, letterSpacing:1, background:"var(--ink3)", border:"1px solid var(--line2)", borderRadius:4, padding:"1px 5px", fontFamily:"var(--fM)", fontStyle:"normal" }}>✎</span>}
                </>
              )}
            </div>
            <div className="modal-sub" style={{ display:"flex", alignItems:"center", gap:6 }}>
              {editingClient ? (
                <>
                  <input value={clientVal} onChange={e => setClientVal(e.target.value)} onKeyDown={e => e.key === "Enter" && (onUpdateClient(oc.id, clientVal), setEditingClient(false))} autoFocus style={{ background:"var(--ink3)", border:"1px solid var(--line2)", borderRadius:5, color:"var(--white)", fontFamily:"var(--fM)", fontSize:11, padding:"3px 8px", width:200 }} />
                  <button className="btn btn-teal btn-sm" onClick={() => { onUpdateClient(oc.id, clientVal); setEditingClient(false); }}>✓</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingClient(false)}>✕</button>
                </>
              ) : (
                <>
                  <span>{oc.client}</span>
                  {oc.ocNumber ? <span> · Ref. {oc.id}</span> : null}
                  {isAdmin && <span onClick={() => { setEditingClient(true); setClientVal(oc.client || ""); }} style={{ cursor:"pointer", color:"var(--fog)", fontSize:9, letterSpacing:1, background:"var(--ink3)", border:"1px solid var(--line2)", borderRadius:4, padding:"1px 5px", marginLeft:4 }}>✎</span>}
                </>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:7, alignItems:"center" }}>
            {isAdmin && st !== "closed" && (
              <button className="btn btn-sm" style={{ background:"var(--lime)", color:"#111", fontWeight:700, fontSize:9, padding:"3px 10px", borderRadius:5, border:"none", cursor:"pointer" }}
                onClick={() => { if (window.confirm("¿Cerrar esta OC? El remanente quedará en $0.")) onCerrarPorMonto && onCerrarPorMonto(oc.id); }}>
                Cerrar OC
              </button>
            )}
            <span className={"badge " + bCls(st)}><Dot c={st === "open" ? "var(--sky)" : st === "partial" ? "var(--gold)" : st === "toinvoice" ? "var(--rose)" : "var(--lime)"} />{bLbl(st)}</span>
            <button className="btn btn-outline btn-sm" style={{ fontSize:9, color:"var(--fog2)", borderColor:"var(--line2)", padding:"3px 8px" }}
              onClick={() => generateOCPDF(oc, st, totAmt, disAmt, pctGlobal)}
              title="Exportar PDF">↓ PDF</button>
            <div className="xbtn" onClick={onClose}>✕</div>
          </div>
        </div>
        <div className="dg">
          <div className="df"><label>FECHA OC</label><p>{oc.date || "—"}</p></div>
          <div className="df"><label style={{ display:"flex", alignItems:"center", gap:6 }}>FECHA ENTREGA {isAdmin && <span onClick={() => { setEditingDate(true); setDateVal(oc.deliveryDate || ""); }} style={{ cursor:"pointer", color:"var(--fog)", fontSize:9, letterSpacing:1, background:"var(--ink3)", border:"1px solid var(--line2)", borderRadius:4, padding:"1px 5px" }}>✎ editar</span>}</label>
            {editingDate ? (
              <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:4 }}>
                <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} style={{ background:"var(--ink3)", border:"1px solid var(--line2)", borderRadius:5, color:"var(--white)", fontFamily:"var(--fM)", fontSize:12, padding:"4px 8px" }} />
                <button className="btn btn-teal btn-sm" onClick={() => { onUpdateDelivery(oc.id, dateVal); setEditingDate(false); }}>Guardar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingDate(false)}>✕</button>
              </div>
            ) : (
              <p style={{ color:dayColor }}>{oc.deliveryDate || "—"}{days !== null && st !== "closed" ? " (" + (days >= 0 ? days + "d restantes" : "vencida " + Math.abs(days) + "d") + ")" : ""}</p>
            )}
          </div>
          <div className="df"><label>AVANCE GLOBAL</label><p style={{ color:pc(pctGlobal) }}>{pctGlobal}%</p></div>
          <div className="df"><label>MONTO OC</label><p style={{ color: st === "closed" ? "var(--lime)" : "var(--gold)", fontWeight:600 }}>{fmtCLP(totAmt)}</p></div>
          <div className="df"><label>DESPACHADO</label><p style={{ color:"var(--lime)", fontWeight:600 }}>{fmtCLP(disAmt)}</p></div>
          <div className="df"><label>REMANENTE</label><p style={{ color: (oc._closedByMonto || totAmt === disAmt) ? "var(--fog2)" : "var(--rose)", fontWeight:600 }}>{fmtCLP(totAmt - disAmt)}</p></div>
        </div>
        {oc.notes && <div style={{ fontSize:11, color:"var(--fog2)", marginBottom:16, padding:"9px 12px", background:"var(--ink3)", borderRadius:6, borderLeft:"2px solid var(--line2)" }}>📝 {oc.notes}</div>}
        <div className="slbl">Remanente por item</div>
        <div className="tbl-card" style={{ marginBottom:18 }}>
          <table>
            <thead><tr><th>DESCRIPCION</th><th>UNIDAD</th><th style={{ textAlign:"right" }}>PRECIO UNIT</th><th>OC</th><th>DESPACHADO</th><th>REMANENTE</th><th>AVANCE</th></tr></thead>
            <tbody>{oc.items.map(it => {
              const rem = Number(it.qty) - Number(it.dispatched || 0);
              const pct = it.qty > 0 ? Math.min(100, Math.round(Number(it.dispatched || 0) / Number(it.qty) * 100)) : 0;
              return (
                <tr key={it.id}>
                  <td style={{ fontWeight:500 }}>{it.desc}</td>
                  <td style={{ color:"var(--fog)" }}>{it.unit}</td>
                  <td style={{ textAlign:"right", color:"var(--fog2)", fontFamily:"var(--fM)", fontSize:11 }}>{it.unitPrice ? fmtCLP(Number(it.unitPrice)) : <span style={{ color:"var(--fog)" }}>—</span>}</td>
                  <td>{fmtNum(it.qty)}</td>
                  <td style={{ color:"var(--lime)" }}>{fmtNum(it.dispatched || 0)}</td>
                  <td>{rem > 0 ? <span style={{ color:"var(--gold)", fontWeight:500 }}>{fmtNum(rem)} pend.</span> : rem === 0 ? <span style={{ color:"var(--lime)" }}>✓ Completo</span> : <span style={{ color:"var(--rose)", fontWeight:500 }}>{fmtNum(Math.abs(rem))} excedido</span>}</td>
                  <td style={{ minWidth:110 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div className="pbar-wrap" style={{ flex:1 }}><div className="pbar" style={{ width:pct + "%", background:pc(pct) }} /></div>
                      <span style={{ fontSize:10, color:"var(--fog)", width:30 }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div className="slbl" style={{ margin:0 }}>Documentos ({dispatches.length})</div>
            {pendingGuias > 0 && <span className="badge bdoc-guia-pend" style={{ fontSize:9 }}>{pendingGuias} guia{pendingGuias > 1 ? "s" : ""} sin factura</span>}
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {(() => {
              if (!isAdmin || st === "closed") return null;
              const dispatches2 = oc.dispatches || [];
              const facNums2 = new Set();
              let montoFac2 = 0;
              dispatches2.forEach(d => {
                const calcN = x => Number(x.netTotal||0) || (x.items||[]).reduce((s,it)=>s+Number(it.qty||0)*Number(it.unitPrice||0),0);
                if (d.docType==="factura") { montoFac2+=calcN(d); if(d.number) facNums2.add(String(d.number).trim()); }
              });
              dispatches2.forEach(d => {
                const calcN = x => Number(x.netTotal||0) || (x.items||[]).reduce((s,it)=>s+Number(it.qty||0)*Number(it.unitPrice||0),0);
                if (d.docType==="guia" && d.invoiceNumber && d.invoiceDate && !facNums2.has(String(d.invoiceNumber).trim())) montoFac2+=calcN(d);
                if (d.docType==="nc") montoFac2-=Number(d.netTotal||0);
              });
              const cuadra2 = totAmt > 0 && (montoFac2/totAmt) >= 0.99;
              const hayItemsSinMapear2 = (oc.items||[]).some(it => Number(it.dispatched||0) < Number(it.qty));
              if (!cuadra2 || !hayItemsSinMapear2) return null;
              return (
                <button className="btn btn-sm" style={{ background:"var(--lime)", color:"#111", fontWeight:700, fontSize:9, padding:"3px 10px", borderRadius:5, border:"none", cursor:"pointer" }}
                  title={"Monto facturado " + fmtCLP(montoFac2) + " ≈ OC " + fmtCLP(totAmt)}
                  onClick={() => onCerrarPorMonto && onCerrarPorMonto(oc.id)}>
                  ⚡ Cerrar por monto
                </button>
              );
            })()}
            <button className="btn btn-sky btn-sm" onClick={() => onAddDispatch(oc)}>+ Registrar despacho</button>
          </div>
        </div>
        {dispatches.length > 0 && (
          <div className="doc-tabs">
            {([["all","Todos"],["factura","Facturas"],["guia","Guias"]].concat(hasNC ? [["nc","NC"]] : [])).map(([v, l]) => (
              <div key={v} className={"doc-tab" + (docFilter === v ? " on" : "")} onClick={() => setDocFilter(v)}>{l}</div>
            ))}
          </div>
        )}
        {dispatches.length === 0
          ? <div style={{ textAlign:"center", padding:"16px", color:"var(--fog)", fontSize:11 }}>Sin documentos registrados aun</div>
          : filteredDisp.length === 0
            ? <div style={{ textAlign:"center", padding:"14px", color:"var(--fog)", fontSize:11 }}>No hay documentos de este tipo</div>
            : <div className="disp-list">{filteredDisp.map(d => {
              // NC — tarjeta especial en naranja
              if (d.docType === "nc") {
                const total = Number(d.total || 0);
                const neto = Number(d.netTotal || 0);
                return (
                  <div className="disp-card" key={d.id} style={{ borderLeft:"2px solid #ff8c00", background:"rgba(255,140,0,.04)" }}>
                    <div className="disp-hd">
                      <DocBadge doc={d} />
                      <div className="disp-meta">
                        <span style={{ fontSize:10, color:"var(--fog)" }}>{d.date}</span>
                        {(isAdmin || d.createdBy === currentUserId) ? <button className="btn btn-rose btn-sm" onClick={() => onDelDispatch(oc.id, d.id)}>Eliminar</button> : null}
                      </div>
                    </div>
                    {(d.items || []).map((it, i) => {
                      const mapped = oc.items.find(o => o.id === it.ocItemId);
                      const price = Number(it.unitPrice || (mapped ? mapped.unitPrice : 0) || 0);
                      return (
                        <div className="disp-row" key={i}>
                          <span style={{ color:"var(--fog2)" }}>↩ {it.desc}{mapped ? <span style={{ fontSize:9, color:"var(--lime)", marginLeft:6 }}>→ {mapped.desc}</span> : null}</span>
                          <span style={{ display:"flex", gap:10, alignItems:"center" }}>
                            <span style={{ color:"#ff8c00", fontSize:10 }}>-{fmtNum(it.qty)} {it.unit}</span>
                            {price > 0 && <span style={{ color:"#ff8c00", fontWeight:600 }}>-{fmtCLP(it.qty * price)}</span>}
                          </span>
                        </div>
                      );
                    })}
                    {(neto > 0 || total > 0) && (
                      <div style={{ display:"flex", justifyContent:"flex-end", gap:16, borderTop:"1px solid var(--line)", marginTop:6, paddingTop:6 }}>
                        {neto > 0 && <span style={{ fontSize:10, color:"var(--fog)" }}>Neto: <span style={{ color:"#ff8c00", fontWeight:600 }}>-{fmtCLP(neto)}</span></span>}
                        {total > 0 && <span style={{ fontSize:10, color:"var(--fog)" }}>Total c/IVA: <span style={{ color:"#ff8c00", fontWeight:600 }}>-{fmtCLP(total)}</span></span>}
                      </div>
                    )}
                  </div>
                );
              }
              // GD con factura vinculada mostrada en pestaña Facturas — vista de factura
              const isLinkedInvoice = d.docType === "guia" && d.invoiceNumber && docFilter === "factura";
              if (isLinkedInvoice) {
                const neto = Number(d.netTotal || 0);
                const displayItems = (d.invoiceItems && d.invoiceItems.length > 0) ? d.invoiceItems : (d.items || []);
                return (
                  <div className="disp-card" key={d.id}>
                    <div className="disp-hd">
                      <span className="badge bdoc-factura"><Dot c="var(--teal)" />Factura {d.invoiceNumber}</span>
                      <div className="disp-meta">
                        <span style={{ fontSize:10, color:"var(--fog)" }}>{d.invoiceDate || d.date}</span>
                        <span style={{ fontSize:9, color:"var(--fog)", letterSpacing:1 }}>· Ref. GD {d.number}</span>
                        {(() => {
                          // Mostrar selector para vincular a GD adicional (caso especial: factura cubre múltiples GDs)
                          const extraGDs = (oc.dispatches || []).filter(g =>
                            g.docType === "guia" && !g.invoiceNumber &&
                            String(g.invoiceNumber || "") !== String(d.invoiceNumber || "")
                          );
                          if (extraGDs.length === 0) return null;
                          return (
                            <select
                              style={{ background:"var(--ink3)", border:"1px solid var(--teal)", borderRadius:4, color:"var(--teal)", fontSize:9, padding:"2px 6px", fontFamily:"var(--fM)", cursor:"pointer" }}
                              defaultValue=""
                              onChange={e => {
                                if (!e.target.value) return;
                                const gd = extraGDs.find(g => g.id === e.target.value);
                                if (gd) onDelDispatch(oc.id, gd.id, "addInvoice", { invoiceNumber: d.invoiceNumber, invoiceDate: d.invoiceDate || d.date, netTotal: d.netTotal, total: d.total, items: d.invoiceItems || d.items || [] });
                              }}>
                              <option value="">↔ Vincular también a...</option>
                              {extraGDs.map(g => <option key={g.id} value={g.id}>GD {g.number} · {g.date}</option>)}
                            </select>
                          );
                        })()}
                        {isAdmin && <button className="btn btn-rose btn-sm" onClick={() => onDelDispatch(oc.id, d.id, true)}>Desvincular</button>}
                      </div>
                    </div>
                    {displayItems.map((it, i) => (
                      <div className="disp-row" key={i}>
                        <span>{it.desc}</span>
                        <span style={{ display:"flex", gap:10, alignItems:"center" }}>
                          <span style={{ color:"var(--fog)", fontSize:10 }}>{fmtNum(it.qty)} {it.unit}</span>
                          {Number(it.unitPrice) > 0 && <span style={{ color:"var(--gold)", fontWeight:600 }}>{fmtCLP(Number(it.qty) * Number(it.unitPrice))}</span>}
                        </span>
                      </div>
                    ))}
                    {neto > 0 && (
                      <div style={{ display:"flex", justifyContent:"flex-end", borderTop:"1px solid var(--line)", marginTop:6, paddingTop:6 }}>
                        <span style={{ fontSize:10, color:"var(--fog)", marginRight:8, letterSpacing:1 }}>NETO FACTURA</span>
                        <span style={{ color:"var(--gold)", fontWeight:600, fontSize:13 }}>{fmtCLP(neto)}</span>
                      </div>
                    )}
                  </div>
                );
              }
              return (
              <div className="disp-card" key={d.id}>
                <div className="disp-hd">
                  <DocBadge doc={d} />
                  <div className="disp-meta">
                    <span style={{ fontSize:10, color:"var(--fog)" }}>{d.date}</span>
                    {d.docType === "guia" && !d.invoiceNumber && (() => {
                      // GD sin factura: ofrecer copiar factura de otra GD ya vinculada
                      const linkedGDs = (oc.dispatches || []).filter(g => g.docType === "guia" && g.invoiceNumber);
                      if (linkedGDs.length === 0) return null;
                      if (!isAdmin) return null;
                      return (
                        <select
                          style={{ background:"var(--ink3)", border:"1px solid var(--violet)", borderRadius:4, color:"var(--violet)", fontSize:9, padding:"2px 6px", fontFamily:"var(--fM)", cursor:"pointer" }}
                          defaultValue=""
                          onChange={e => {
                            if (!e.target.value) return;
                            const srcGD = linkedGDs.find(g => g.id === e.target.value);
                            if (!srcGD) return;
                            onDelDispatch(oc.id, d.id, "copyInvoice", { gdId: d.id, invoiceNumber: srcGD.invoiceNumber, invoiceDate: srcGD.invoiceDate, netTotal: srcGD.netTotal, total: srcGD.total, invoiceItems: srcGD.invoiceItems || [] });
                          }}>
                          <option value="">↔ Copiar factura de GD...</option>
                          {linkedGDs.map(g => <option key={g.id} value={g.id}>GD {g.number} → Fac. {g.invoiceNumber}</option>)}
                        </select>
                      );
                    })()}
                    {d.docType === "factura" && (() => {
                      const unlinkedGDs = (oc.dispatches || []).filter(g => g.docType === "guia" && !g.invoiceNumber);
                      if (unlinkedGDs.length === 0) return null;
                      // Factura directa sin GD: relink (elimina factura directa y vincula a GD)
                      // Factura ya vinculada a una GD pero quedan GDs sin factura: vincular adicional
                      const isLinkedFac = !!d.gdNumber;
                      return (
                        <select
                          style={{ background:"var(--ink3)", border:"1px solid var(--teal)", borderRadius:4, color:"var(--teal)", fontSize:9, padding:"2px 6px", fontFamily:"var(--fM)", cursor:"pointer" }}
                          defaultValue=""
                          onChange={e => {
                            if (!e.target.value) return;
                            const gd = unlinkedGDs.find(g => g.id === e.target.value);
                            if (!gd) return;
                            if (isLinkedFac) {
                              // Solo vincular la GD adicional sin eliminar la factura directa
                              onDelDispatch(oc.id, d.id, "linkExtra", { gdId: gd.id, invoiceNumber: d.number, invoiceDate: d.date, netTotal: d.netTotal, total: d.total });
                            } else {
                              onDelDispatch(oc.id, d.id, "relink", { gdId: gd.id, invoiceNumber: d.number, invoiceDate: d.date, netTotal: d.netTotal, total: d.total, items: d.items });
                            }
                          }}>
                          <option value="">{isLinkedFac ? "↔ Vincular GD adicional..." : "↔ Vincular a GD..."}</option>
                          {unlinkedGDs.map(g => <option key={g.id} value={g.id}>GD {g.number} · {g.date}</option>)}
                        </select>
                      );
                    })()}
                    {(() => {
                      const canDelThis = isAdmin || d.createdBy === currentUserId ||
                        (userEmail === "jhaeger@totalmetal.cl" && d.docType === "guia" && !d.invoiceNumber);
                      return canDelThis
                        ? <button className="btn btn-rose btn-sm" onClick={() => onDelDispatch(oc.id, d.id)}>Eliminar</button>
                        : <button className="btn btn-outline btn-sm" style={{ color:"var(--fog)", fontSize:9 }} onClick={() => onRequestDel({ type:"request", label: (d.docType === "factura" ? "Factura" : "Guia") + " N° " + d.number })}>Eliminar</button>;
                    })()}
                  </div>
                </div>
                {(d.items || []).map((it, i) => {
                  const mapped = oc.items.find(o => o.id === it.ocItemId);
                  const price = Number(it.unitPrice || (mapped ? mapped.unitPrice : 0) || 0);
                  return (
                    <div className="disp-row" key={i}>
                      <span>{it.desc}{d.docType === "guia" ? (mapped ? <span style={{ fontSize:9, color:"var(--lime)", marginLeft:6 }}>→ {mapped.desc}</span> : <span style={{ fontSize:9, color:"var(--fog)", marginLeft:6 }}>sin vincular</span>) : null}</span>
                      <span style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span style={{ color:"var(--fog)", fontSize:10 }}>{fmtNum(it.qty)} {it.unit}</span>
                        {price > 0 && <span style={{ color:"var(--gold)", fontWeight:600 }}>{fmtCLP(it.qty * price)}</span>}
                      </span>
                    </div>
                  );
                })}
                {(() => {
                  const neto = Number(d.netTotal || 0) || (d.items || []).reduce((s, it) => {
                    const mapped = oc.items.find(o => o.id === it.ocItemId);
                    const price = Number(it.unitPrice || (mapped ? mapped.unitPrice : 0) || 0);
                    return s + (Number(it.qty)||0) * price;
                  }, 0);
                  const label = d.docType === "factura" ? "NETO FACTURA" : "TOTAL GD";
                  return neto > 0 ? (
                    <div style={{ display:"flex", justifyContent:"flex-end", borderTop:"1px solid var(--line)", marginTop:6, paddingTop:6 }}>
                      <span style={{ fontSize:10, color:"var(--fog)", marginRight:8, letterSpacing:1 }}>{label}</span>
                      <span style={{ color:"var(--gold)", fontWeight:600, fontSize:13 }}>{fmtCLP(neto)}</span>
                    </div>
                  ) : null;
                })()}
              </div>
              );
            })}</div>
        }
      </div>
    </div>
  );
}

function GestionModal({ oc, gestiones, onClose, onAdd, onDel, isAdmin, currentUserId }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await onAdd(text.trim());
    setText("");
    setSaving(false);
  };

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth:560 }}>
        <div className="modal-hd">
          <div>
            <div className="modal-title">Gestión</div>
            <div className="modal-sub">{oc.ocNumber || oc.id} · {oc.client}</div>
          </div>
          <div className="xbtn" onClick={onClose}>✕</div>
        </div>
        <div style={{ marginBottom:16 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Agregar comentario de gestión..."
            style={{ width:"100%", minHeight:80, background:"var(--ink3)", border:"1px solid var(--line2)", borderRadius:6, padding:"10px 12px", color:"var(--white)", fontSize:13, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}
          />
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:6 }}>
            <button className="btn btn-sky btn-sm" onClick={handleAdd} disabled={saving || !text.trim()}>
              {saving ? "Guardando..." : "+ Agregar"}
            </button>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {gestiones.length === 0 && <div style={{ color:"var(--fog)", fontSize:12, textAlign:"center", padding:"20px 0" }}>Sin comentarios aún</div>}
          {[...gestiones].reverse().map(g => (
            <div key={g.id} style={{ background:"var(--ink3)", border:"1px solid var(--line)", borderRadius:6, padding:"10px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ fontSize:13, color:"var(--white)", lineHeight:1.5, flex:1 }}>{g.text}</div>
                {isAdmin && (
                  <button className="btn btn-rose btn-sm" style={{ fontSize:10, padding:"2px 7px" }} onClick={() => onDel(g.id)}>✕</button>
                )}
              </div>
              <div style={{ display:"flex", gap:10, marginTop:6 }}>
                <span style={{ fontSize:10, color:"var(--fog)", letterSpacing:1 }}>{g.date}</span>
                <span style={{ fontSize:10, color:"var(--fog2)" }}>{g.author}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FactoringGestionModal({ facKey, facLabel, gestiones, onClose, onAdd, onDel, isAdmin, currentUserId }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await onAdd(text.trim());
    setText("");
    setSaving(false);
  };

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth:560 }}>
        <div className="modal-hd">
          <div>
            <div className="modal-title">Gestión Factoring</div>
            <div className="modal-sub" style={{ color:"var(--teal)" }}>{facLabel}</div>
          </div>
          <div className="xbtn" onClick={onClose}>✕</div>
        </div>
        <div style={{ marginBottom:16 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Agregar comentario de gestión..."
            style={{ width:"100%", minHeight:80, background:"var(--ink3)", border:"1px solid var(--line2)", borderRadius:6, padding:"10px 12px", color:"var(--white)", fontSize:13, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}
          />
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:6 }}>
            <button className="btn btn-sky btn-sm" onClick={handleAdd} disabled={saving || !text.trim()}>
              {saving ? "Guardando..." : "+ Agregar"}
            </button>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {gestiones.length === 0 && <div style={{ color:"var(--fog)", fontSize:12, textAlign:"center", padding:"20px 0" }}>Sin comentarios aún</div>}
          {[...gestiones].reverse().map(g => (
            <div key={g.id} style={{ background:"var(--ink3)", border:"1px solid var(--line)", borderRadius:6, padding:"10px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ fontSize:13, color:"var(--white)", lineHeight:1.5, flex:1 }}>{g.text}</div>
                {isAdmin && (
                  <button className="btn btn-rose btn-sm" style={{ fontSize:10, padding:"2px 7px" }} onClick={() => onDel(g.id)}>✕</button>
                )}
              </div>
              <div style={{ display:"flex", gap:10, marginTop:6 }}>
                <span style={{ fontSize:10, color:"var(--fog)", letterSpacing:1 }}>{g.date}</span>
                <span style={{ fontSize:10, color:"var(--fog2)" }}>{g.author}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function ClientMultiSelect({ clients, selected, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const toggle = c => {
    const next = new Set(selected);
    next.has(c) ? next.delete(c) : next.add(c);
    onChange(next);
  };
  const label = selected.size === 0 ? "Todos" : selected.size === 1 ? [...selected][0] : selected.size + " clientes";
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background:"var(--card)", border:"1px solid " + (selected.size > 0 ? "var(--sky)" : "var(--line2)"), borderRadius:4, color: selected.size > 0 ? "var(--white)" : "var(--fog2)", fontSize:11, padding:"4px 10px", fontFamily:"var(--fM)", cursor:"pointer", minWidth:160, textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }}>{label}</span>
        <span style={{ fontSize:9, color:"var(--fog)", flexShrink:0 }}>▾</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:200, background:"var(--ink2)", border:"1px solid var(--line2)", borderRadius:6, minWidth:220, maxHeight:260, overflowY:"auto", padding:"6px 0", boxShadow:"0 4px 16px rgba(0,0,0,.4)" }}>
          <div style={{ padding:"4px 12px 6px", borderBottom:"1px solid var(--line)" }}>
            <button onClick={() => onChange(new Set())} style={{ background:"none", border:"none", color:"var(--fog)", fontSize:9, letterSpacing:1, fontFamily:"var(--fM)", cursor:"pointer", padding:0 }}>✕ LIMPIAR</button>
          </div>
          {clients.map(c => (
            <div key={c} onClick={() => toggle(c)}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", cursor:"pointer", background: selected.has(c) ? "rgba(77,184,255,.08)" : "transparent" }}>
              <div style={{ width:13, height:13, borderRadius:3, border:"1px solid " + (selected.has(c) ? "var(--sky)" : "var(--line2)"), background: selected.has(c) ? "var(--sky)" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {selected.has(c) && <span style={{ color:"var(--ink)", fontSize:9, fontWeight:700 }}>✓</span>}
              </div>
              <span style={{ fontSize:11, color: selected.has(c) ? "var(--white)" : "var(--fog2)", fontFamily:"var(--fM)" }}>{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("dc_user")); } catch(e) { return null; } });
  const [ocs, setOcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [selectedYear, setSelectedYear] = useState("all");
  const [factoringData, setFactoringData] = useState({}); // { "FAC-ID": { entity: "Santander"|"Security"|"Otro" } | false }
  const [factoringGestiones, setFactoringGestiones] = useState({}); // { "FAC-KEY": [{ id, text, date, author, authorId }] }
  const [showFactoringGestion, setShowFactoringGestion] = useState(null); // { key, label }
  const [search, setSearch] = useState("");
  const [fst, setFst] = useState("all");
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_ANTHROPIC_API_KEY || localStorage.getItem("dc_apikey") || "");
  const [showImport, setShowImport] = useState(false);
  const [showVentaDirecta, setShowVentaDirecta] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showDispatch, setShowDispatch] = useState(null);
  const [showGestion, setShowGestion] = useState(null); // oc
  const [convertTarget, setConvertTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // { type:"oc"|"dispatch", ocId, dispId, label }
  const [dashSort, setDashSort] = useState({ col: null, dir: 1 });
  const [ordSort, setOrdSort] = useState({ col: null, dir: 1 });
  const [pendSort, setPendSort] = useState({ col: "date", dir: 1 });
  const [factoringSort, setFactoringSort] = useState({ col: "facNumber", dir: -1 });
  const [toinvoiceSort, setToinvoiceSort] = useState({ col: "date", dir: 1 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [facFilterFrom, setFacFilterFrom] = useState("");
  const [expandedClients, setExpandedClients] = useState(new Set());
  const [facFilterTo, setFacFilterTo] = useState("");
  const [facFilterClients, setFacFilterClients] = useState(new Set());
  const [facFilterEntity, setFacFilterEntity] = useState("");
  const [collapsedMonths, setCollapsedMonths] = useState(new Set());
  const [expandedPFMonths, setExpandedPFMonths] = useState(new Set());
  const [pfFilterFrom, setPfFilterFrom] = useState("");
  const [pfFilterTo, setPfFilterTo] = useState("");
  const [pendExpanded, setPendExpanded] = useState({});
  const [clientMonthFilter, setClientMonthFilter] = useState("all");
  const [reportsMonthFilter, setReportsMonthFilter] = useState("all");
  const [ordersMonthFilter, setOrdersMonthFilter] = useState("all");
  const [onlineCount, setOnlineCount] = useState(1);
  const [theme, setTheme] = useState(() => localStorage.getItem("dc_theme") || "auto");

  // Aplicar tema al documento
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.setAttribute("data-theme", "light");
    else if (theme === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme"); // auto = sigue sistema
    localStorage.setItem("dc_theme", theme);
  }, [theme]);

  // Presencia: registra al usuario activo y cuenta cuántos hay
  useEffect(() => {
    if (!user) return;
    const KEY = "dc_presence";
    const myId = user.id || user.email;
    const TIMEOUT = 30000; // 30s de inactividad = desconectado
    const register = () => {
      try {
        const raw = localStorage.getItem(KEY);
        const map = raw ? JSON.parse(raw) : {};
        map[myId] = Date.now();
        // Limpiar entradas viejas
        const now = Date.now();
        Object.keys(map).forEach(k => { if (now - map[k] > TIMEOUT) delete map[k]; });
        localStorage.setItem(KEY, JSON.stringify(map));
        setOnlineCount(Object.keys(map).length);
      } catch(e) {}
    };
    register();
    const interval = setInterval(register, 10000);
    return () => {
      clearInterval(interval);
      try {
        const raw = localStorage.getItem(KEY);
        const map = raw ? JSON.parse(raw) : {};
        delete map[myId];
        localStorage.setItem(KEY, JSON.stringify(map));
      } catch(e) {}
    };
  }, [user]);

  const notify = (msg, type) => { setToast({ msg, type: type || "ok" }); setTimeout(() => setToast(null), 3500); };

  // Cargar OCs desde Firestore y suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const migrateOCs = d => d.map(oc => ({ ...oc, dispatches: (oc.dispatches || (oc.invoices || []).map(inv => ({ ...inv, docType: "factura", invoiceNumber: null }))).map(disp => {
        if (disp.docType === "factura" && !disp.total && disp.items && disp.items.length) {
          const calc = disp.items.reduce((s, it) => s + (Number(it.qty)||0) * (Number(it.unitPrice)||0), 0);
          return calc > 0 ? { ...disp, total: calc } : disp;
        }
        return disp;
      })
    }));
    // Carga inicial
    loadOCs().then(d => {
      if (d.length) _seq = Math.max(_seq, ...d.map(o => parseInt(o.id.replace("OC-", "")) || 0)) + 1;
      setOcs(migrateOCs(d));
      setLoading(false);
    });
    // Cargar datos de factoring
    storage.get("factoring-v1").then(r => { if (r) { try { setFactoringData(JSON.parse(r.value)); } catch(e) {} } });
    storage.get("factoring-gestiones-v1").then(r => { if (r) { try { setFactoringGestiones(JSON.parse(r.value)); } catch(e) {} } });
    // Suscripción en tiempo real — actualiza cuando otro usuario guarda
    const unsub = subscribeOCs(d => {
      if (d && d.length) _seq = Math.max(_seq, ...d.map(o => parseInt(o.id.replace("OC-", "")) || 0)) + 1;
      if (d) setOcs(migrateOCs(d));
    });
    return () => unsub();
  }, [user]);

  if (!user) return <><style>{G}</style><AuthScreen onAuth={u => setUser(u)} /></>;

  const logout = () => { localStorage.removeItem("dc_user"); setUser(null); setOcs([]); };
  const isAdmin = user?.isAdmin === true;

  const enriched = useMemo(() => ocs.map(oc => ({
    ...oc,
    items: oc.items.map(it => ({
      ...it,
      dispatched: (oc.dispatches || []).reduce((s, d) => {
        const matched = d.items.filter(ii => (ii.ocItemId && ii.ocItemId === it.id) || (!ii.ocItemId && ii.desc.toLowerCase().trim() === it.desc.toLowerCase().trim()));
        // Si hay múltiples líneas mapeadas al mismo item, ignorar las marcadas como splitPrice
        // Si todas son splitPrice (caso raro), contar solo la primera
        const toCount = matched.filter(ii => !ii.splitPrice);
        const effective = toCount.length > 0 ? toCount : matched.slice(0, 1);
        let qty = effective.reduce((a, ii) => a + Number(ii.qty), 0);
        // Si qty excede el total OC pero los montos cuadran (diferencia de unidad), limitar al máximo OC
        if (d.docType !== "nc" && qty > Number(it.qty)) {
          const montoDespacho = effective.reduce((a, ii) => a + Number(ii.qty) * Number(ii.unitPrice || 0), 0);
          const montoOC = Number(it.qty) * Number(it.unitPrice || 0);
          if (montoOC > 0 && Math.abs(montoDespacho - montoOC) / montoOC < 0.02) {
            qty = Number(it.qty);
          }
        }
        // NC resta del despachado
        return d.docType === "nc" ? s - qty : s + qty;
      }, 0)
    }))
  })), [ocs]);

  const persist = async updated => { setOcs(updated); await saveOCs(updated); };

  const handleCerrarPorMonto = async (ocId) => {
    const updated = ocs.map(o => o.id !== ocId ? o : { ...o, _closedByMonto: true });
    setOcs(updated);
    await saveOCs(updated);
    const ocActualizada = updated.find(o => o.id === ocId);
    if (showDetail && showDetail.id === ocId && ocActualizada) {
      setShowDetail({ ...ocActualizada, _closedByMonto: true });
    }
    notify("OC cerrada por monto ✓");
  };

  // Esc global para cerrar ventanas emergentes
  useEffect(() => {
    const handler = e => {
      if (e.key !== "Escape") return;
      if (showDispatch) { setShowDispatch(null); return; }
      if (showDetail) { setShowDetail(null); return; }
      if (showImport) { setShowImport(false); return; }
      if (showVentaDirecta) { setShowVentaDirecta(false); return; }
      if (showFactoringGestion) { setShowFactoringGestion(null); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showDispatch, showDetail, showImport, showVentaDirecta, showFactoringGestion]);

  const handleAddGestion = async (ocId, comment) => {
    const updated = ocs.map(o => {
      if (o.id !== ocId) return o;
      const gestiones = o.gestiones || [];
      return { ...o, gestiones: [...gestiones, { id: "G-" + Date.now(), text: comment, date: today(), author: user.name, authorId: user.id }] };
    });
    await persist(updated);
    setShowGestion(updated.find(o => o.id === ocId));
  };

  const handleDelGestion = async (ocId, gId) => {
    const updated = ocs.map(o => {
      if (o.id !== ocId) return o;
      return { ...o, gestiones: (o.gestiones || []).filter(g => g.id !== gId) };
    });
    await persist(updated);
    setShowGestion(updated.find(o => o.id === ocId));
  };
  const handleSaveKey = v => { setApiKey(v); localStorage.setItem("dc_apikey", v); };
  const handleSaveOC = async (oc, keepOpen) => {
    // Quitar puntos del número de OC al guardar
    const cleanOcNumber = oc.ocNumber ? oc.ocNumber.replace(/\./g, "").trim() : oc.ocNumber;
    const cleanOc = { ...oc, ocNumber: cleanOcNumber };
    if (cleanOc.ocNumber && cleanOc.ocNumber.trim()) {
      const norm = s => s.replace(/[\.\s]/g, "").toLowerCase();
      const dupe = ocs.find(o => o.ocNumber && norm(o.ocNumber) === norm(cleanOc.ocNumber));
      if (dupe) throw new Error("La OC N° " + cleanOc.ocNumber + " ya existe (cliente: " + dupe.client + ").");
    }
    await persist([cleanOc, ...ocs]);
    if (!keepOpen) setShowImport(false);
    notify("OC importada ✓");
  };

  const handleSaveVentaDirecta = async (oc) => {
    await persist([oc, ...ocs]);
    notify("Venta Directa creada ✓");
  };


  const handleSaveDispatch = async (ocId, dispatch) => {
    const oc = ocs.find(o => o.id === ocId);
    const existing = (oc?.dispatches || []);

    // Caso especial: vincular factura a GD existente sin crear despacho nuevo
    if (dispatch._gdLinks) {
      // Vincular factura a múltiples GDs
      const { gdIds, invoiceNumber, invoiceDate, netTotal, total, items: facItems } = dispatch;
      const updated = ocs.map(o => o.id === ocId ? {
        ...o,
        dispatches: (o.dispatches || []).map(d => gdIds.includes(d.id)
          ? { ...d, invoiceNumber, invoiceDate, netTotal: netTotal || d.netTotal, total: total || d.total, invoiceItems: facItems || d.invoiceItems || [] }
          : d
        )
      } : o);
      await persist(updated);
      if (showDetail && showDetail.id === ocId) {
        const live = enriched.find(o => o.id === ocId);
        setShowDetail(live);
      }
      notify("Factura N° " + invoiceNumber + " vinculada a " + gdIds.length + " GD" + (gdIds.length > 1 ? "s" : "") + " ✓");
      return;
    }
    if (dispatch._gdLink) {
      const { gdId, invoiceNumber, invoiceDate, netTotal, total, items: facItems } = dispatch;
      const updated = ocs.map(o => o.id === ocId ? {
        ...o,
        dispatches: (o.dispatches || []).map(d => d.id === gdId
          ? { ...d, invoiceNumber, invoiceDate, netTotal: netTotal || d.netTotal, total: total || d.total, invoiceItems: facItems || d.invoiceItems || [] }
          : d
        )
      } : o);
      await persist(updated);
      if (showDetail && showDetail.id === ocId) {
        const live = enriched.find(o => o.id === ocId);
        setShowDetail(live);
      }
      notify("Factura N° " + invoiceNumber + " vinculada a GD ✓");
      return;
    }

    if (dispatch.number && dispatch.number.trim()) {
      const norm = dispatch.number.trim().toLowerCase();
      const dupe = existing.find(d => d.number && d.number.trim().toLowerCase() === norm && d.docType === dispatch.docType);
      if (dupe) throw new Error((dispatch.docType === "factura" ? "Factura" : dispatch.docType === "nc" ? "NC" : "Guia") + " N° " + dispatch.number + " ya está registrada en esta OC.");
    }
    const updated = ocs.map(o => o.id === ocId ? { ...o, dispatches: [...(o.dispatches || []), dispatch] } : o);
    await persist(updated);
    if (showDetail && showDetail.id === ocId) {
      const live = enriched.find(o => o.id === ocId);
      setShowDetail({ ...live, dispatches: [...(live.dispatches || []), dispatch] });
    }
    // no cerrar el modal — se resetea internamente para agregar otro
    notify((dispatch.docType === "factura" ? "Factura" : dispatch.docType === "nc" ? "NC" : "Guia") + " registrada ✓");
  };

  const handleDelDispatch = async (ocId, dispId, action, relinkData) => {
    if (action === "linkExtra" && relinkData) {
      // Vincular GD adicional sin eliminar la factura directa
      const { gdId, invoiceNumber, invoiceDate, netTotal, total } = relinkData;
      const updated = ocs.map(o => o.id === ocId ? {
        ...o,
        dispatches: (o.dispatches || []).map(d =>
          d.id === gdId ? { ...d, invoiceNumber, invoiceDate, netTotal: netTotal || d.netTotal, total: total || d.total } : d
        )
      } : o);
      await persist(updated);
      if (showDetail && showDetail.id === ocId) setShowDetail(updated.find(o => o.id === ocId));
      notify("GD vinculada a Factura N° " + invoiceNumber + " ✓");
      return;
    }
    if (action === "copyInvoice" && relinkData) {
      // Copiar factura de otra GD a esta GD sin factura
      const { gdId, invoiceNumber, invoiceDate, netTotal, total, invoiceItems } = relinkData;
      const updated = ocs.map(o => o.id === ocId ? {
        ...o,
        dispatches: (o.dispatches || []).map(d =>
          d.id === gdId ? { ...d, invoiceNumber, invoiceDate, netTotal: netTotal || d.netTotal, total: total || d.total, invoiceItems: invoiceItems || [] } : d
        )
      } : o);
      await persist(updated);
      if (showDetail && showDetail.id === ocId) setShowDetail(updated.find(o => o.id === ocId));
      notify("Factura N° " + invoiceNumber + " copiada a GD ✓");
      return;
    }
    if (action === "relink" && relinkData) {
      const { gdId, invoiceNumber, invoiceDate, netTotal, total, items } = relinkData;
      const updated = ocs.map(o => o.id === ocId ? {
        ...o,
        dispatches: (o.dispatches || [])
          .filter(d => d.id !== dispId)
          .map(d => d.id === gdId ? { ...d, invoiceNumber, invoiceDate, netTotal: netTotal || d.netTotal, total: total || d.total, invoiceItems: items || [] } : d)
      } : o);
      await persist(updated);
      if (showDetail && showDetail.id === ocId) setShowDetail(updated.find(o => o.id === ocId));
      notify("Factura N° " + invoiceNumber + " vinculada a GD ✓");
      return;
    }
    // addInvoice: vincular factura a una GD adicional sin eliminar la vinculación original
    if (action === "addInvoice" && relinkData) {
      const { invoiceNumber, invoiceDate, netTotal, total, items } = relinkData;
      const updated = ocs.map(o => o.id === ocId ? {
        ...o,
        dispatches: (o.dispatches || []).map(d => d.id === dispId
          ? { ...d, invoiceNumber, invoiceDate, netTotal: netTotal || d.netTotal, total: total || d.total, invoiceItems: items || [] }
          : d
        )
      } : o);
      await persist(updated);
      if (showDetail && showDetail.id === ocId) setShowDetail(updated.find(o => o.id === ocId));
      notify("Factura N° " + invoiceNumber + " vinculada también a GD ✓");
      return;
    }
    const oc = ocs.find(o => o.id === ocId);
    const disp = (oc?.dispatches || []).find(d => d.id === dispId);
    setConfirmDel({ type:"dispatch", ocId, dispId, label: disp ? (disp.docType === "factura" ? "Factura" : "Guia") + " N° " + disp.number : "documento" });
  };
  const doDelDispatch = async () => {
    const { ocId, dispId } = confirmDel;
    const updated = ocs.map(o => o.id === ocId ? { ...o, dispatches: (o.dispatches || []).filter(d => d.id !== dispId) } : o);
    await persist(updated);
    if (showDetail && showDetail.id === ocId) setShowDetail(enriched.find(o => o.id === ocId));
    setConfirmDel(null);
    notify("Documento eliminado");
  };

  const handleConvert = async (ocId, dispatchId, invoiceNumber) => {
    const updated = ocs.map(o => o.id === ocId ? { ...o, dispatches: (o.dispatches || []).map(d => d.id === dispatchId ? { ...d, invoiceNumber } : d) } : o);
    await persist(updated);
    if (showDetail && showDetail.id === ocId) {
      const live = enriched.find(o => o.id === ocId);
      setShowDetail({ ...live, dispatches: (live.dispatches || []).map(d => d.id === dispatchId ? { ...d, invoiceNumber } : d) });
    }
    setConvertTarget(null);
    notify("Guia vinculada a Factura N° " + invoiceNumber + " ✓");
  };

  const handleDelOC = id => {
    const oc = enriched.find(o => o.id === id);
    setConfirmDel({ type:"oc", ocId: id, label: oc ? (oc.ocNumber || oc.id) + " · " + oc.client : id });
  };
  const doDelOC = async () => {
    await persist(ocs.filter(o => o.id !== confirmDel.ocId));
    setConfirmDel(null);
    notify("OC eliminada");
  };

  const handleUpdateClient = async (ocId, newClient) => {
    const updated = ocs.map(o => o.id === ocId ? { ...o, client: newClient } : o);
    await persist(updated);
    setShowDetail(null);
    setTimeout(() => setShowDetail(updated.find(o => o.id === ocId) || null), 50);
    notify("Cliente actualizado ✓");
  };

  const handleUpdateOCNumber = async (ocId, newNumber) => {
    const clean = newNumber.replace(/\./g, "").trim();
    if (clean) {
      const norm = s => s.replace(/[\.\s]/g, "").toLowerCase();
      const dupe = ocs.find(o => o.id !== ocId && o.ocNumber && norm(o.ocNumber) === norm(clean));
      if (dupe) { notify("N° OC ya existe en " + dupe.client, "err"); return; }
    }
    const updated = ocs.map(o => o.id === ocId ? { ...o, ocNumber: clean } : o);
    await persist(updated);
    // Cerrar y reabrir con datos frescos para evitar estado interno desincronizado
    setShowDetail(null);
    setTimeout(() => setShowDetail(updated.find(o => o.id === ocId) || null), 50);
    notify("N° OC actualizado ✓");
  };

  const handleToggleFactoring = async (facKey, entity) => {
    const current = factoringData[facKey];
    // Si ya está factorizado con esa entidad → desmarcar. Si no → marcar con entidad
    const updated = { ...factoringData, [facKey]: (current && current.entity === entity) ? false : { entity } };
    setFactoringData(updated);
    await storage.set("factoring-v1", JSON.stringify(updated));
  };

  const handleAddFactoringGestion = async (facKey, text) => {
    const existing = factoringGestiones[facKey] || [];
    const newG = { id: "FG-" + Date.now(), text, date: today(), author: user.name, authorId: user.id };
    const updated = { ...factoringGestiones, [facKey]: [...existing, newG] };
    setFactoringGestiones(updated);
    await storage.set("factoring-gestiones-v1", JSON.stringify(updated));
  };

  const handleDelFactoringGestion = async (facKey, gId) => {
    const updated = { ...factoringGestiones, [facKey]: (factoringGestiones[facKey] || []).filter(g => g.id !== gId) };
    setFactoringGestiones(updated);
    await storage.set("factoring-gestiones-v1", JSON.stringify(updated));
  };

  const handleUpdateDelivery = async (ocId, newDate) => {
    const updated = ocs.map(o => o.id === ocId ? { ...o, deliveryDate: newDate } : o);
    await persist(updated);
    if (showDetail && showDetail.id === ocId) setShowDetail(d => ({ ...d, deliveryDate: newDate }));
    notify("Fecha de entrega actualizada ✓");
  };

  const enrichedNoVD = enriched.filter(o => !o._ventaDirecta);
  const total = enrichedNoVD.length;
  const open = enrichedNoVD.filter(o => ocStatus(o.items, o.dispatches, o) === "open").length;
  const closed = enrichedNoVD.filter(o => ocStatus(o.items, o.dispatches, o) === "closed").length;
  const alerts = enrichedNoVD.filter(o => { const d = daysLeft(o.deliveryDate); return d !== null && d <= 5 && ocStatus(o.items, o.dispatches, o) !== "closed"; });
  const pendingGuias = enriched.reduce((s, o) => {
    const normN = n => String(n).replace(/[\s.]/g, "");
    return s + (o.dispatches || []).filter(d => {
      if (d.docType !== "guia" || d.invoiceNumber) return false;
      return !(o.dispatches || []).some(f => f.docType === "factura" && f.gdNumber && normN(f.gdNumber) === normN(d.number || ""));
    }).length;
  }, 0);

  const filtered = enriched.filter(o => {
    if (o._ventaDirecta) return false;
    const norm = v => v.toLowerCase().replace(/\./g, "");
    const s = norm(search);
    const matchesSearch = !s || norm(o.id).includes(s) || norm(o.client).includes(s) || norm(o.ocNumber || "").includes(s);
    const matchesStatus = fst === "all" || ocStatus(o.items, o.dispatches, o) === fst;
    const matchesPeriod = ordersMonthFilter === "all" || (o.date||"").startsWith(ordersMonthFilter);
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const liveDetail = showDetail ? enriched.find(o => o.id === showDetail.id) || showDetail : null;
  const liveDispOC = showDispatch ? enriched.find(o => o.id === showDispatch.id) || showDispatch : null;

  const mkSort = (state, setState) => (col) => setState(s => ({ col, dir: s.col === col ? -s.dir : 1 }));
  const calcPct = oc => { if (oc._closedByMonto) return 100; const tot = oc.items.reduce((a,i) => a+Number(i.qty),0); const dis = oc.items.reduce((a,i) => a+Number(i.dispatched||0),0); return tot>0?Math.min(100,Math.round(dis/tot*100)):0; };
  const statusOrder = { open:0, partial:1, toinvoice:2, closed:3 };
  const applySort = (arr, { col, dir }) => {
    if (!col) return arr;
    return [...arr].sort((a, b) => {
      let av = col === "ocNumber" ? (a.ocNumber || a.id) : col === "client" ? a.client : col === "date" ? (a.date || "") : col === "deliveryDate" ? (a.deliveryDate || "") : col === "pct" ? calcPct(a) : col === "monto" ? a.items.reduce((s,i) => s+Number(i.qty)*Number(i.unitPrice),0) : col === "pendiente" ? (a._closedByMonto ? 0 : a.items.reduce((s,i) => s+(Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice),0)) : col === "status" ? (statusOrder[ocStatus(a.items, a.dispatches, a)] ?? 0) : col === "lastActivity" ? ((a.dispatches||[]).flatMap(d => [d.date, d.invoiceDate]).filter(Boolean).sort((x,y) => y.localeCompare(x))[0] || "") : 0;
      let bv = col === "ocNumber" ? (b.ocNumber || b.id) : col === "client" ? b.client : col === "date" ? (b.date || "") : col === "deliveryDate" ? (b.deliveryDate || "") : col === "pct" ? calcPct(b) : col === "monto" ? b.items.reduce((s,i) => s+Number(i.qty)*Number(i.unitPrice),0) : col === "pendiente" ? (b._closedByMonto ? 0 : b.items.reduce((s,i) => s+(Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice),0)) : col === "status" ? (statusOrder[ocStatus(b.items, b.dispatches, b)] ?? 0) : col === "lastActivity" ? ((b.dispatches||[]).flatMap(d => [d.date, d.invoiceDate]).filter(Boolean).sort((x,y) => y.localeCompare(x))[0] || "") : 0;
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  };
  const SortTh = ({ label, col, state, setState }) => {
    const active = state.col === col;
    return <th className={"th-sort" + (active ? " active" : "")} onClick={() => mkSort(state, setState)(col)}>{label}<span className="sort-ico">{active ? (state.dir === 1 ? "▲" : "▼") : "⇅"}</span></th>;
  };

  return (
    <>
      <style>{G}</style>
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", width:"100%" }}>

        <div className="app" style={{ flex:1, minHeight:0, width:"100%" }}>
          <button className={"rail-toggle" + (sidebarOpen ? " open" : "")} onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? "Cerrar menú" : "Abrir menú"}>{sidebarOpen ? "‹" : "›"}</button>
          <aside className={"rail" + (sidebarOpen ? "" : " collapsed")}>
            <div className="rail-brand">
              <div className="rail-name">Control<br />Despachos</div>
              <div className="rail-tm">TM</div>
              <div className="rail-sub">Sistema OC</div>
            </div>
            <nav className="rail-nav">
              <div className="rail-sec">Modulos</div>
              {[{ id:"dashboard", ico:"◈", lbl:"Dashboard" }, { id:"orders", ico:"◫", lbl:"Ordenes" }].map(n => (
                <div key={n.id} className={"rail-item" + (view === n.id ? " on" : "")} onClick={() => setView(n.id)}><span>{n.ico}</span>{n.lbl}</div>
              ))}
              <div className={"rail-parent" + (view === "reports" || view === "clients" || view === "monthly" || view === "pending" || view === "toinvoice" || view === "factoring" ? " on" : "")}><span>▤</span>Reportes</div>
              <div className={"rail-item-sub" + (view === "reports" ? " on" : "")} onClick={() => setView("reports")}>Por OC</div>
              <div className={"rail-item-sub" + (view === "clients" ? " on" : "")} onClick={() => setView("clients")}>Por Cliente</div>
              {isAdmin && <div className={"rail-item-sub" + (view === "monthly" ? " on" : "")} onClick={() => setView("monthly")}>Por Facturas</div>}
              {isAdmin && <div className={"rail-item-sub" + (view === "factoring" ? " on" : "")} onClick={() => setView("factoring")}>Factoring</div>}
              <div className={"rail-item-sub" + (view === "pending" ? " on" : "")} onClick={() => setView("pending")}>Pend. Despachar</div>
              <div className={"rail-item-sub" + (view === "toinvoice" ? " on" : "")} onClick={() => setView("toinvoice")}>Pend. Facturar</div>
            </nav>
            <div className="rail-foot">
              <div className="online-badge"><span className="online-dot" />Sesión activa</div>
              <div className="rail-user"><strong>{user.name}</strong>{user.email}</div>
              <button className="rail-logout" onClick={logout}>Cerrar sesion</button>
              {isAdmin && <div style={{ borderTop:"1px solid var(--line)", marginTop:10, paddingTop:10, display:"flex", flexDirection:"column", gap:5 }}>
                {(() => {
                  const bytes = new Blob([JSON.stringify(ocs)]).size;
                  const kb = (bytes / 1024).toFixed(1);
                  const pct = Math.min(100, Math.round(bytes / (1024 * 1024) * 100));
                  const col = pct > 80 ? "var(--rose)" : pct > 50 ? "var(--gold)" : "var(--lime)";
                  return (
                    <div style={{ fontSize:9, color:"var(--fog)", letterSpacing:1 }}>
                      ALMACENAMIENTO
                      <div style={{ marginTop:4, height:3, background:"var(--line2)", borderRadius:2 }}>
                        <div style={{ height:"100%", width:pct+"%", background:col, borderRadius:2, transition:".3s" }} />
                      </div>
                      <div style={{ marginTop:3, color:col }}>{kb} KB / 1024 KB ({pct}%)</div>
                    </div>
                  );
                })()}
                <button className="rail-logout" style={{ color:"var(--sky)" }} onClick={() => {
                  const data = { ocs, exportedAt: new Date().toISOString(), version: "ocs-v3" };
                  setShowExport(JSON.stringify(data, null, 2));
                }}>↓ Exportar datos</button>
                <label className="rail-logout" style={{ color:"var(--teal)", cursor:"pointer" }}>
                  ↑ Importar datos
                  <input type="file" accept=".json" style={{ display:"none" }} onChange={async e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const data = JSON.parse(text);
                      const imported = data.ocs || [];
                      if (!imported.length) { notify("No se encontraron datos en el archivo", "err"); return; }
                      await persist(imported);
                      notify(imported.length + " OCs importadas ✓");
                      e.target.value = "";
                    } catch(err) { notify("Error al leer el archivo", "err"); }
                  }} />
                </label>
                {ocs.some(o => !o.rut) && (() => {
                  const RUT_MAP = {
                    "echeverría izquierdo montajes industriales s.a.": "96.870.780-9",
                    "echeverria izquierdo montajes industriales s.a.": "96.870.780-9",
                    "echeverría izquierdo montajes industriales sa": "96.870.780-9",
                    "echeverria izquierdo montajes industriales sa": "96.870.780-9",
                    "syncore montajes spa": "76.543.046-1",
                    "syncore montajes s.p.a.": "76.543.046-1",
                    "servicios covi spa": "78.071.294-6",
                    "servicios covi s.p.a.": "78.071.294-6",
                    "servicios avo ii spa": "77.726.289-0",
                    "servicios avo ii s.p.a.": "77.726.289-0",
                    "tecnica nacional de servicios ingenieria y construccion s.a.": "96.917.120-1",
                    "técnica nacional de servicios ingeniería y construcción s.a.": "96.917.120-1",
                    "tecnica nacional de servicios ingenieria y construccion sa": "96.917.120-1",
                    "tecnasic s.a.": "96.917.120-1",
                    "tecnasic sa": "96.917.120-1",
                    "piques y túneles s.a.": "76.362.176-6",
                    "piques y tuneles s.a.": "76.362.176-6",
                    "piques y túneles sa": "76.362.176-6",
                    "piques y tuneles sa": "76.362.176-6",
                    "prefast spa": "76.622.019-3",
                    "prefast s.p.a.": "76.622.019-3",
                    "constructora excon s.a.": "76.443.280-0",
                    "constructora excon sa": "76.443.280-0",
                    "asap soluciones integrales spa": "76.173.088-6",
                    "asap soluciones integrales s.p.a.": "76.173.088-6",
                    "level ingeniería y construcción spa": "77.667.046-4",
                    "level ingenieria y construccion spa": "77.667.046-4",
                    "level ingeniería y construcción s.p.a.": "77.667.046-4",
                    "obras subterráneas s.a. agencia en chile": "76.140.162-9",
                    "obras subterraneas s.a. agencia en chile": "76.140.162-9",
                    "obras subterráneas sa agencia en chile": "76.140.162-9",
                    "obras subterraneas sa agencia en chile": "76.140.162-9",
                  };
                  return (
                    <button className="rail-logout" style={{ color:"var(--gold)", fontSize:10 }} onClick={async () => {
                      const norm = s => (s||"").toLowerCase().trim().replace(/\s+/g," ");
                      let updated = 0;
                      const newOcs = ocs.map(o => {
                        if (o.rut) return o;
                        const rut = RUT_MAP[norm(o.client)];
                        if (rut) { updated++; return { ...o, rut }; }
                        return o;
                      });
                      if (!updated) { notify("No se encontraron coincidencias", "err"); return; }
                      await persist(newOcs);
                      notify(updated + " OCs actualizadas con RUT ✓");
                    }}>⚡ Migrar RUTs ({ocs.filter(o=>!o.rut).length} sin RUT)</button>
                  );
                })()}
              </div>}
            </div>
          </aside>
          <main className="body">
            <div className="page">

              {view === "dashboard" && (
                <>
                  <div className="ph">
                    <div style={{display:"flex",alignItems:"center",gap:16}}>
                      <div><div className="pt">Panel <em>General</em></div><div className="pm">RESUMEN · {today()}</div></div>
                      <div style={{display:"flex",gap:4,background:"var(--ink3)",border:"1px solid var(--line)",borderRadius:8,padding:"3px 4px"}}>
                        {[["dark","◑"],["auto","◈"],["light","○"]].map(([t,ico]) => (
                          <button key={t} onClick={() => setTheme(t)} title={t === "dark" ? "Oscuro" : t === "light" ? "Claro" : "Auto (sistema)"}
                            style={{background: theme===t ? "var(--line2)" : "transparent",border:"none",borderRadius:5,padding:"4px 8px",cursor:"pointer",color: theme===t ? "var(--white)" : "var(--fog)",fontSize:12,fontFamily:"var(--fM)",transition:".12s",lineHeight:1}}>{ico}</button>
                        ))}
                      </div>
                    </div>
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASgAAAEQCAYAAAADLunZAACW2UlEQVR4nO39ebwsyVXfi34jcqiqPZ6hJw1IQgMCSWhEWIAAGQwIMwgJgRAgA77YwuZhHhjsZz5+fv5c+9rXXAPGZh7MjBBCIAlaY0vdmlpCA0hqqdVoaNQttXo8wx5ryMxY74+IyMrKyqzKmvbZ55y9zqdO7cqMKSMjVqz1WytWKBHhhKaT7yel1Mg1pRTGGAC01iPXPb3//e/n2c9+9sj1LMsIguComn8sKcOQkpBhEEIUEBIQASrTYIAM0EAAEkAvFQgVChBSAjICUoKsBYTQA9qwE8AAuOPOe+Qpj32ESlJDJ9QkQARsGiABYkBVte7KJz/zTcU9PzIzA0q5j0+dJaBSUBojHVINKfZ+R1IwO3BwP/QzuPZLGBASZz2bx6RAgISbpEDI5O7Xy3nUK5+UUiNMx18bDAZorfO/i9f39/e5+eab5aMf/aj0+32yLBvJe7WTBhSagJAIRYhyE0PnTInIJTagBNqhsgwMCNAEQP8gAR2ChsE6PBTAOeCVH3i//MZf/AkPidAJNREQYIiLDbiKyY9AXfHxzEtry5xE7MIrxtibEgIRSkOWCqGBDglkF6B7P8kd75eb/+z3BElsNwcxqAh0BMp1fAPZKFzi816RZIzJJaMqiuM4l4aiKMqlpAceeIB3v/vdcs8999Dv9wEIQ9vdIjK13KuBFJrIcQkl2AGr7CdVYJTjU4G7nxoUgpGMJIB2EBKkIWvtU4iCHSxj+izIz73pldzxmU+zbg7pusWgLaATQxxpyAQGAwhbl+TZjwspDIgZMg10zjeK/EMrm1pUiOgwl7oyA51QINuHwQU49wnZf++buetjH2CzdRYOz6HWH0mKRqkWgQowWeYWmOnC6wmDmkJlJiIiI+qeUoogCEjTNGdA73nPe+T9738/aZqSZRlRFNFqtcbKLauCVyPljMmPeCtWASAYDtIenbBNpMColCAIiQmJFSAaFGQKLgAXgbecv0f+x+v+lM8HfcJ1zWb7DGBVEEkgdu8IraB9dTOnERIv3WcoFSBoq2ELBGpU2DQ4IUogli5kh5DuwMdvlbtu+VOCnbt5zFrE/SaEnfuhfT1Z4EXhEBD7mhsM/RMGNQOVGVPxehiGXLhwgVtuuUU+/elPA1b6iqJopAwvbV3tjAmwo9zPC1X4CIQYQmXQYYjBcIjFnhzSBAMF/QGyEXNBwd3AL7z9DfKGT32U7lbMYdBmrZswOBgQ4CZYbBlVkiW0AK3zO1ctCdoyCpNYDg6gI5RqkeEkWWyfGwOBZHbRVgplumDOw/69HL7/Jvnc397MtYPPsaUPMLtdNjoB9PckIFMpUUEi04yuSPV0wqAaUhVI7kkpxe2338673/1uOX/+fM6AWq0WWZZhjMnxp2L+q17NUwzHpwJRTqICwGIdoVL0yLDokaaHIRpAS4ewEXO/glt3d+Tn/vyVfFYP2N9co68y6HZBd8iSgxxXAcegdIYmQJuUKIi5WskLrgHaqXjKiUYGlCFAk7k0KRBoCFBgepahpRfgcx+Se9/xl1z87Ce5Lu6yrQ7R/R0CpUgHhyApaEXI0N4hSpw6P32RPmFQDcirdWVmkqYpg8GAt7/97fLxj38cYwxhGGKMQSlFmqY5Q/JAerHMq12KyoDUdWkIBDn4YZw0JSgUpBlR2EKARDQSW2PdPcDvfOzD8kfvvoV+O2JPFFkWQCq0Tz+c8OIOnjVlmbNIRRCqmBTQgeRY/NVIfn0QABWhVGQZCgKSEBAQq5CUoZUOySDbhfvvED5/G59726s4HfXpqEOyvX1MlKHDDoPEoNrrdtWRlIAAJaC0oJRgRKNUcIJBrYr6/T79fp9XvOIVkiQJWZaRpilxHBOGIVmWkWVZrg6eMKdqGgFkFfnqbS8qUJpYWayoD+wry9j+7sKe/MabXsc7D85zYaNFkgrx2jppr4tur9E77GF6gxwXDAMInbrST7u0whbGygVH+bjHkjympACtQgecA4gFsh0OFUoCyYNw7+1y8Ldv5YHbbuZU/16U6dJub6DbAf3BgMNMCKMOmY4hTa1uSB8tWElNhRhl38s0oPyEQZXIGJOrXlrrHPz2ElEYhqRpyoc//GFuvvlm8b5MSqnciuclqDAMKfuZnTCnIWkAkxJqjQIyMWjvbyPWzmO6hqAVMDDQ1XAAvPYTn5BXvuNtfJYB59di+kEIWpOlgg7bSGZAQxy3Mb0+CQ7xUHZCbIZtQsQ6Vl3Fr8JDgEbsuhA6Xp2hMWi06y+d7qNVF5JzcPt75K73vYXu5z/FdeEhW6pPEGQMTEKqQMI2KtIkaAYSQBSCysjBRdEgYPSQKU5aIq56BtXr9Wi32/lvz5jAAtqeIRljiOOYixcv8ra3vU0+9rGPjVnmTmg2UhhaGg66u6x3NkBBt9cFo1hrbwCgW5p7dvrEp1vcB/ziTW+Vm/7uI/RPb3EOTRKEblVWzlcHQINotGiUDPEnccwo8OCL0MzWfQWTcX0WOy6RJIKKFKJg0BvQiTOQHbh4p6TvezOfu+1dsPcA17QCNiIgs+pa6jBCIO9zhQH/USaXiL2F0IPvk+iqZ1CeORljSNMUrXWuFmit6Xa7dDodAD760Y/y9re/XS5evMjGxgZJklSWOQlQP6FRUggbnQ6CwRhhrbVuV1kDu/sZyWZAerrFm+5/SH7lja/hrmzA4dktDnt96Kw5UNcv9ToHeZWBKINWRu7Y6XkSMESIC24NVxspsO4aCsSkAERRmPdT3BInNb1DLnzgrzj87Ic5nR7SaVnpaO9gQDtcw6DJVIjGEJESmASjIJR+wX0hcAuJ9f33V6f5al71DArIAfA4thadNLUvKwxDOp0O+/v73HrrrfKRj3wk92s6ODig3W6PqHBlhnSyjWg69fo92q0YhSJQIYjGiN2mkp0KOA/80i3vlDd88iOcX4853woRLXBmG1IDA49XFbyTRewqLgYtQ6f0QKzPlCiNUmKX+quUOVkyZL1DglbLjl1j5ZrADKC/A/qA/Xe8Ri7ccSvp52/jmmjA5hpkvQNUKnTiNQYqRgqdGGQJIRkCRN5tAYc7EaCtcp3nOAHJp1DRwdJT8fd9993HG97wBrnrrrs4deoUQRDQ7XaJoogsy0Yseyf40mwkgG61GWCIJYBMc3CYoLYizgPv2z+U3337TXz4oXu5PzAMlEGMWAdLDfQOIW45LcLgeY4f9UkAiS6oEikEofVQl0Ajzop39VJGEAH7F2DtlO2cwR6wD+c+Jhdv+XP2P/Mh1qRL0AnJUsOFbkpLAtaCPmIOSQlIgxgtGYGkBCRok2IKnumoCFSEiM6ZUzi8O5GuegblmVERZwI4f/48n/rUp3jjG98oW1tbrK2tsb+/T6fTIY5j0jRlfX2dXq83Ut4Jk5qNAgIMioEoJITBVsRDwF99+u/lFbfezMcunKO70UZvrBNEIWkygMND65TTCt2qr1EiBKIIDBhtyLSxILA21p0Bi7OIKvjjMPQNvTpJWbR6fR3SPvTPQ3AIt79L7rzpFbQPPstWekgUGAYSkKSGKNS0Wuuo/oB+d5+w07b+G4AmQ4n9W5QmlQBUACq0uJPTxEPJEBX4Fkykq55BeQfKotT0uc99jg984APysY99jDiOOTw8JI5jWq0WvV6PKIqIoojz58+ztrY2VuYJBtWMlGiCxKBEcdBSXATuQOR3b3kTN932Yfpr68iZbdrtFt3eAHo9WmvrmEiR9Lq0dUTfTQ7lWI5RAAYtBoXBKOeeAPlyrVFEJxgUGSGDKCTdP2Sz3QPzeXZf+zty321v50yUEkkXk6UkAnGkWesESJrQPzgg1AHt9VOkWZdYIMttcZpMBQxUm4FuIbqFUpHtagFIQDIUqXMOnezNf9UzqCAI8nApWZbx0Y9+lFtvvVXuv/9+1tfX83RJkhCGIa1Wi8FgQJZlnDp1Kt8IXMWMLgdpyqNkqnyhSOVHqElTDN+Rz3upTqOwG1RTremGdpPv6+++U37nHW/lE3vn4ZrTdAWMDlCZzxWSJQlKCYHWpEmfwA1+8JuLzVh7vTndA7MasaKUb+glpPruNuMJFPgGj723PE/5gZy9TBxHdkwhc+k6kkL7AD7+Tvn7W16Fvv82HhH1CSUhSwfoVssuuOmAZJDme0/RISlCIH3AIMq6fQoKUe4bZbfSuFaZ3L/NWMmqCEbV0BXPoDyTKDML/9vvjbtw4QK33nqrfPSjHyVJEtbW1nLG5R0t/W+/laXf79cyIH/dS1N19V9KshPXPZMbSCM3J2XMyeSMJ3PmY2+9Dxj6XGaDPkG7RapSNJoAQw/N/SHcCXLTxz7G6/763Xxi50HCa86gWi2Sbg8ElBELoAeGTEAQcJtPncN53qRM6cJE1igjhEDLfeyccM5WQYMZskLK/ZDcb8/UNcY5SzoHJbBGAO2YgBoyW5MIceRtlC6PUnh0TWEg7QE9u7VERaA79NGsSR8OPwrveo3c/YF3ovYf4lScocUgmSEOQrJBD1FW+pE83pnCZEKGwUgMymDyuDgDZ7lL0SZFi93jp1Tk8EHXBqJGXX/FM6gyc0qShCAI0FrnzOn222/ngx/8oNx99925lQ6sm4FnSnVUx2guawvetKarYprixk9TmBhu/ClgkBG0Wgz6CbodkQAHKC4Atx505Y/fcQvv+ehH4NQ6px79GM719sn2u0RbmyTdQaFiX5cueJvbCeuFonITtTjcA+tukLhS8vyXmErbEfMYWaNh5LxUGPhf+d0oKix6BjKTgQ5Qyi88jpmnGQy60AogO2Ct14e9u3joz35W9AO3E3UPWIsjIhRZ0kdlGQSCVkIgblOxEUQX3SotriRo63OuMgJxbVfGqnFFXyiXxw+eJsvDFc+gDg8Pc5woTdOc+SRJQhRFvPnNb5ZPf/rT3HvvvURRxObmJlmW0ev1EJE8fZ0LgWeAVWkuBwoKDGVEbyggyOVoKFDY5+m3L2BX68Ct/oG7l6QpUatNmmTErYgUOATuQfG6T90mr3zLzewFAcGZTfqRYq9/SBZYh77kYB+0NVr4TcQa6yrQJNjZcSclhf2H+UX/R+iYqGIYq0kQUrcIaMfMUhDBiAWj3Q4SgpwpBKRZiIlaBNE2Qf8iZA/AHW+Te29+Neb8PayplO31NaIgIE26GJOhJXOMctisiUK1SKPwKbPSFc+gvKrmHTD93w899BC33HKL3HnnnYB12NRa51a5MAwJgiAH0ZuoZMdBbZuFJqp0JeaUq1CFfNql86b9ofewxzsgigMEg8QB5zMYBPB54L/c+OfyoXs/x4HKMHFIEoccZAlp2ocosIHkVGhFniuZfIRKr5oK+SogeZQBz2wEa5tM0F4lF8EYgSAcRsHM/9d2g3RgeV1AF7qfZ+fmP5IL730Vm9kOcWvTbhNKEtJ+FyUJURASRdpBIKMvQBlniKgY5iICxjIqvaQF5IpnUN4JsxiH6b3vfa+85z3vYX9/nzAM8z1zSZLkEQk8PlUuCyZLSpcbk5oEeJs8iVWrjPvW7o5xq7iowng1YmeDGspch0lCFrW4GMDb9s7Jf/2932MfTdIKiU5vsDPo0h90oRVBHIPJbMN0gHUQYGRCKKdy2La5BxhRqcX+O/Zqdln1IX9Oj+GLu+exKR8AxapP1sdIBWGhBINJhUQFGGcgiw1E2YNw53vkgZv+gMM73881cUonjuimPUQiyFKUZIRaEWuFAINedxg3v4S9D+dChQ1lif1+xTMoGAaJ29nZ4eabb5bbbrsNpRSdTocsy3JLXBRFudSUpmkeiK5MRSZUxZAmeZcfK5LCd8G1d8icRnEQXbg29lS5ejhEVVLsptH9KOIi8Kvvebv87nveAWeuYX3zLPv7B1y4cB59ap1ws0OaJZY5BZFldN2ujWFdrqrohnzcedAk8l0lOIZupahR5uTJq9GjttLMeWaHAJKACDrQdgsLQDaA3n303vtauetdf872wd/zqE4KZoCkili30HGAkgCTJvaTJYiML84e4x55hIJEVZSa8sizC76fK55BebPoJz/5Sd70pjfJgw8+yPb2NsYYdnZ22Niwm1L9XrwiY+p0OhweHublFOlKwaDKTKqKOQWFv1Uuufg0Jeuf8jGtIwbAeeAjcij/4Q9+hzt2d+g87OFkYYfP33s/wdlt1s48jMO9i5iLO9ZDPGpBktoK4hhSGRn4pukeicuCtN92SJW/gxpJ6fpetLPs2b1tiRouB2SJPZwAgawL+5+Hi5+WB9/6Z5z/+Ls4G/TZ7kRIZpBU6Pd7SGjQ6QCNQowd+0rbxTqO4/wgkGmkZLZtQ9Iw7RXPoABe//rXywc+8AG01mxsbLC3t4dSirNnz+ZqXhAEOdf3IVN2d3crJagrktwqOIk5FVdDz4s9KqKcNSfD7qNLsYcY/OYH3yN/8aH3cacM6J/eJgEGe7voa8+QmYzD3T0bbGhjw3qHFyAsyAjMkAGOLMaVFy8vcsb4EY/2IGdXFQ5a4j4+RqgMccA8gTm0zOni3fDZ2+Tv/vJ3uVbt8MhWHz3oknZBKyFUAeubm9Ztw415FURoDCJiI8Emid2A7UjhFmalCpFPi+2THI9sss3RsdmJdOxnX9VeuSoVS0RGrHT9fp/d3V3+9E//VLrdbu7HlKZprtrt7e3ljpo+hpMnH89pFqpS7er08WMnbanxuR74wGXGWNNZ4ECNLLM+OYHGSB90QIq2jnsoDoEP7h3IH7z7Fm66+5PsxiGJ3iATTSYG2hEm7ZPjTKIgEUicWqEc5mI86A65STsHaF3kghE19PIjh7Y5vzGLMakRV9eQJAXtDpATydkTRiDSMEgGpDoi1EDyEDz0CeFdr+azH3wb14eClhQRjdGhjSkugihIk8wxHDf2ZbQ3tdZjvauUGhknStmjwgzKr1KjNAGParK2HHsG5S1vZTWq+F089gksU/voRz/Ku971Lun1ernaVnS2BCpPbDl2jGOVVHjUsrUul5zEmZUESL1TkV33+oOEoBXYON9oeljJ6ea77pFffONf8mkzYGd9nTTUQ5neL70e4yjL+mIFKhuNwF4y5XF/hb0iD0XZ0FTGqXB2i3O/f0jcXiMDDvvDg2j6CbQjkEGXVog9WcXswt+9Rz77xt8jfOBjfMG6JukdYggxRPkGXrsnzo/95lZqn04XWaiMv8Jl0rFnUJ5EpPI0FO/P5OncuXPceuut8qEPfSiPCe6D0Pm8RQ/xWeqf5JA5CaO6HGgclHUkgYOahmbwXi9BxRG0IvZI7UEGWJXuF29+i7zmwx8iu/46zh1qUC27IVV7T+dsOAEFtFipLHddyBthxhDZVU6ES0EaOwE1EHpp0IU8sTqfodVu001SdBQSt6CXWGNnFEH3cJ+1dgDJBUjuxdz8F/KpW9/IttqnHYbs7R3QDoQQG5/JSIhRgXWqFO/3Dz5UjdXe3BwZM80NrYwignZWWnFqp0JACUqs0j9iRW3ikVlDlw2DKqpbxYMvi8zpQx/6EDfffLNcvHgx93/yDMqbS4vSGMzGWKbdu1yY0SQa2c0l2JjSQTwUsSIIIwuAn3OLwwD4yM55+blX/DEf6u4iD7uBh/b2YfOUVd1E2QGuTI6jeNVNRKNcGI5AyQi2IUguPRkKFiHjG3d5kwIij9Xk+JL/doqcskHkEgGUsB4JmAEBA8JWAnsPws7n5P7X/yEHd32Ya4Meur9Hpx0jxIgZYMSgTQba75FzlkLxSNdQqxARRKuR33ljCyQObyqrfJ70yLPMT8eeQZVPUynGDPcM4eDgID8sczCwgfK73S7tdjuXloqqncesFmFUszKw406a4f4uGFrrCAK7qisNIfSUBcF7AFHEAfCHf32r/M67b6Z/dovk9HVcvHAB1k9DrwuhO9bJ+HKH5YvDkvxxU5koggKH8piTgaEZHqxE5svxuNRlSmPMyTtnqgC0ZmAUWttzAnXaJwj7QBeSfTAH8DdvlE/cfCNB1mUtyMgGh6xHIb29HdqRO5zAMXklGYFkoBSpiuy6YRRqDOpwbVNqxM9MFcFxNdx+08jbYzYjX07HnkEVJ7sPEFeUpj71qU/xzne+U+666y7a7TZRFOWRB5IkyffTFaUpv/m3yKBmVdWuCGnKTwwPDwFjsKhS9jgU7BFRA+zBBReA8yC/9Mo/48Pn7mX39GkuZH0Y9Aivv570oIfqxEhipabQBZTD7XY3GhC7ohetUBkFA0jOnHwbDRjnlOjnzWXQzRMpb7+b8KKd92No41Zp6A8y1mMFKnOMaQfu+3t56J2v5+KHb+ExWy0e2H0IrRVbay16BxeJtSJNEnTUGenHQIwbn2KlKWuac22pHuPl3zn+Kz5KwegjaXGRJZYg5B57BlWc7EWp6YEHHuCzn/0sb3rTm/KTVXxAOc+cigB73YGb87SjfL2qrMtKmpLRselXRKUg7fcI220yDQcCfQVd4D2fvEP+6B238P6dXcIbbmC3dwjhOroVkx7sQxAgaQ8litBAaDRaIFOKDIUQ5BIUyoxqN7keqCh6pHvSAsrtEFbi9uZdhmRVV+t170+zEeVtefZ+JtCOA0gH0N0FtQ+f+KB87l1v5ODuj/LIVsrBvZ/lYVtbKKXo7p+nFWrEQKu95gxEGtF2Q69RAQpBSVbw1Mj31tiFu6I/fSA6/660DK3U+Ttzp1aIWp4n/2XFoPz3hQsXeP/73y+33nprHlAuDEPW1tZyL3APqHsVsWj2L7oUVDGWOqZyrCWj8lgoWL5GTMcU1AqXDmXyCTHMbi13YafN/kBIW4oDBXdmRl5985t5520f4XNi4IaHcbF/CDpA6wAzyGzoWOeko4w33BlnRSohplJgRjn24lRKcd952urgTSOWpFLxmdIjquuI381SXqUpfQPeobJUV9X7EEzuHV60pPrH6ChQvUNQB5A9RPaO18sn3vsGooMHeeSmgv0LnF7vkCWHZMbQCkIyEQId5bH1R8n2rx55J6N9WOnjVPf0yj+HZ7ANMhVfP5NfwyVnUEU/JmPMcO+PI+/b5F0EPvKRj3DLLbfkAeWKYXqLhx0AI4yojDdNi+M06706Ksct97QsZmcHOAz9goZk1Gi8IUXhBF+3Ud7ohASHh5OiBNZUK8+Uaei3FDvA+/cO5ddu/As+eNffE509TT+KOUwSCEMQh/Np5UQahQ+/kmrrszNsV+FHzliKjS88S3HEy9BM7v3V8Su4sv8FYtNlWpMpTU+RP58yEDjvQONUnJxhz0XeJUBA+dAiGiR0XKawv86pWX4h8BPTuhdkKP9LDEpp+54MFmfiItz5Qbnwztdx8RMf4Hp1yHo7Y7CzQxxpksw+lNIhRmGNDjI8ykAr4yRO8EijcotBoBRGSUFVm8Kd8mey5RnnUyXKybhV2ctcyAsHk2sCjgGDKh6IGQRBfvSTPzTTMx9/ssp73/te+v0+rVaLKIryfXTLostRgsrffwmt9MD3EJgukTIMJEUpTT/psxa1iVTIYJCSZgrdibgA7AF/9KEPy2+98a8YnDnF2uMfx/07uxYgKe+3MsU+cuZrVa2G2VV70oTQ1C3Jw9C+42V6EgVBHA235BYmSuYaXS2TzUDO0XHoPumOVxI92uFiebdfG8AvGCEKSLOUMAjQSpMOeuhBF1oG+ufpvfN1ctd7X0+8cw9nwx6dtIcWQ6sVkmRDKcgC0RVQhgytpuPNlzzgX9WrKFr0JneDOFyxfGP0T19aU/faS86ggPxwTA+Aewubv/7Zz36WG2+8Ue677748LIpSiv39/RE3A09N9sktG+S+FMyrONhRdjOvUkPpQwnDTaNAvsIrk/s1hUSYNGFbb8BAQz8hXosZxPAgcDuZ/Lc/+X1uf+B+Wl/4MB46dwE+/zna195Ab1C9OFwSRi4lIK1Ag+LcWGqzDOgBVp7rjEbH1CXHSwlR4iacApQNY3LYGxC318mCkIGASg2dQCDagwc+JQ/85e+T3vsJNnfvZTvKiFVG0uujTEYraFc1qpLmfSfT5s+0a4vSJWdQPqCcB7a9+pVlGcYY3vOe98jb3/52kiQhjmOyLGNtbY2Dg4Oxo8Un4UnLArnn9ZNaJfke8NJSfnw4huHmUnK8KbcYASEaaMFBCq0YOhHdAO4DXnXHR+QP3nULF1qaixstkv0dwu0NlI7p9Q8tgutV8uNgJBAZ41NJktgDE2Bk85camgYXJCs5eSmtiEg5tzGH+RVlhgyUZWyd9jqZY58tgUD3IX0QbnubfO6WV2Pu/TindJdIDaCfkClFpx2ijGLQ66JaLYpy4KrGZxMGp8Wnc0PtSrDira2tMRgMiOOYKIpyde/cuXO88Y1vlDvuuINrr72W++67D2MMGxsb7Ozs0Gq1CMNwJGbTtE5cpm/T8XEz8IOzCqwdWl5y8rK8OOaVars/pRNzkMKgBZ8BfvWWt8kbbv9bzrWgmzp1JQhJM2NDeGjslhePw9ZIMFNX1RX0U7HOLMs46B9gWut5rH6wDGrR+WORmyiPi6WdRbF4QEOGJlQOfSouFMR2111qiAJNmA5A9uDwXnZu+hO5612v4Vq9y8OijKy3RzKwWKYOAtKkT2QSiz+ZDKnAVJuOzzITKWvUI9uNKsqUivduLXvLkaYuOYMSEeI4zqWnMAy57bbbeOMb3ygHBwesr6/z+c9/nlOnTtHr9Th//jxnz55lMBjQ7XZzjKpY3ryRL+dZfWYRgVdFxZoLLq3upinhAh4zKmBHLdhVsBfBu85dlF94zSv5+P5FBltrpH7zl2gYJHYTWKeNikKk2x16mcMQ6F4m05nYjzK8Xa6yBBPoVqFZzhS+uASlydw2HV9SKFZIS1Sx20MgGS4UKiRzhwxEKoG9hyDuwec+Jp967f8muedjPH7TYHZ26fcHREHA2sYmSmvSfo+03yNQKToaGjOWNT7LVxstwMb5p+sCw1PLmQOXnEEppdjb22Nzc5MkSfizP/sz+du//VvCMERrzcHBAadOnaLb7dJqteh0Oly4cIEoilhbW6s0pV4tGJS3Avm/q0gKN62qoYY3lKabQBLbMLz/+8MfkN9/982cizXmmm0b2HKgoden1Vkn7nTYy/ZtvCaPrFZaberxoJVRTZ0+miqwZPxpWORwu0iC3dcfEpvhqSWiQAVB3gDxQeaMgcE5UA/B214rt7/tzzmrLnCmnXJ47ryVmDqnyLSmN8hIBod0AuhsbAApppc0Rvmbjs98L7dvu3hjggMNSteLdpkrEoPKsozNzU0+85nPcOONN8pnP/tZOp0OWmsGgwGdTodut5tHusyyjPX19TwSpjfhH5WqddysfNNqs/d1zkvsALMqWx/YX4cP7hzIr731Rm75zN+xf3Yb0wqhbyDsQKII44h0YOj39kAJOgogNY0tPEdGMi4V+TA89sfw+jJUPEXh0IM8zHFGHmfcRDkDGSiLVQUYAlJCAyQ78MDHZffNr+D8He/lkXqPTnKRdHePdtwmaK9zmCkyowgUFtYgy0/BFkJrFCk976Uan8vAnMq0MIMqRxMod0I5TpP3TfJ+TUEQ8Na3vlXe85730O12WVtbI0kSsizLjxgvRzHwK2LRAbNMk0TaRV7SrH5Sq1b10kFCGEWgdL6Fwd5wEo62K7eIIQsCEmXX+X2EHoo/+NAH5a8+/DfcceEBBqe2MDqERNtDCwaClsDOe60IdIwo4/Z0gVE2MnYll2yo7tUN6ir/tSYk3vFThsEH4zi2zCjA9Ulx3V+ABBtlV4NyvnfKO3cYd9hAGkJk+ykDNjCQ7cPuA3DnB+VTf/arnE4f5FqzR5x1CUyKarVJaXE4sBu1AzFELg65CGREpEEAAYRG0AUAXuUOr7UdNExHRdQCd2/oDjBaWNX2laoyyvUV67TS7oQ8BVqYQRWZU3HPW9FTuxhErtVq5X/v7Ozw6le/Wh588EF2d3fze0WpyA/QSbjRUVrUjpsEFfq+TQaoICBQzvkwiKzW4WLra8ecHjAGozUPouSX3/wX/PWDD3Dn4Q7pRodobQ0GmRtxfpOwezYo/K2Xtr1k2vs71qSwZ1CK7Sqt3XQSwGR2dinFoJ/Ragc2xtbe/dC9j+R9b5I73/16rhk8wHq2TygJSpwdVjRKGUI0KksRLWhjUBoMGvF+VsDoFu9qAWFi/y5xvCocA1Pk+/QWpaWoeH6l8iB3mbxlrtVq5afxfvrTn+Ytb3mLPPDAAwRBwObmJkDuXiAi+SGbxXqWwYwuBUa1KjJJgopCwih2IWQhSweEqSI2gQ2jKzYIZldDqjVvvvcz8suv+RPuDRUXxEAcQrtjQ6PsJxCEtDqaRBl7XLUateaMgF91ONQMdFntWyyQ4A4C1RYcl4HzL9Ma4haZsRErW7GC7g6wD3d9QD73llcw+OyH2eifoxVFdqwTgrIRL5VKaUmC9eDSJCgMMamEiA7QYghJrHNDxfafKiYF1f1blojK1rock6J6zOcbhiEHxpu+xibDZmEG5beo1KlbPtqlp263y9vf/vY8NErxUE2vugVBkIfirapvFgnmOPlJrYRcvwuQkpFkKe2wZbfDGcj6YGJy36ZfuekmufGjf8Pg+lNc2D0Pp7Zt+JJUkfZSlIF2GKLE0M+SPHpmHk3A/yh4L0+kGdwMjhPjb0IG61YgOGEJ7PO6fR9KCYEawO6DwCG85w3yd299JdvJA2yzw1rLkKRCpqL8zBwUxJICqZXCUAQSY5TGEOZblGJjt9akBAjjc6/OkXLW+VH1u87NwG7idvVMeO+zrGcLMyil1Nj+uSJG5LevhGHInXfeyetf/3q58847WVtbo91u53iTNwn7M+k8c5rUqbNKN5fCT2rVpN1hD4FSxASowA70BNgRCDo2PMrtez35jde9lnfd/UnM9Wd5sJfCqeusRS7NIFPEOiBsx6AVvbQHaR9C563sLeTKLdoCLMVUP0qXG5NSQGogThJUoEAy644RuDjigx3YvVPue93v0f/k+3lEdp5wcJH2RossSRBpkaFAWdheY2zkAIFhAHb/saSNQRtrSbWLk27cb9PmR9lalz9nwbo3yc2gXN6itFQrnm9QmWElScK73vUueec738mFCxdot9s58O2ZmP82xpAkSc6wvPoI8/l4TJKaJj3HsvykjoKS/oC41bIbTJWia1zspgDOATd+9Db545vewkMI6XXX8mCvD2trsNu3kQckQItC6QAjGVmSkSlBtSNE2cXGBDjO5J4vYzn4RY2jn6fjzKzczjsiDSqKrLiqDEQGpA87D8Cn/1Y+/Jd/wOa5O3lYcEjH7ENLk+7toyNrlVNqACpw0UOFTFnfPq0MGLFB5VRK7LmEMhgCp11P9iJfRKuoK7N43RpLxstdFi3MoLx65/8uMqfDw0N2d3d5wxveILfffjtRFLG+vo6IPdZmMBiMMKrcfCpCFEU2nGzhXK4TDKqCFIRaDw/gTQytNc0h8DngF17/arnp727nfKiRzS2yVKC1RtAP6LTOkJgeQahITEo/TcGpDoHSRGFAL0sKMVoAo9GpopVqRBuS0EY8WIhWANgeBSkMweEhutMGHZJkECFAHz7zEel+5O3c9a7X8oVxDzEPEkiChCFZH8LWKbJejyjsEikBFZGqmIGOGKgI0R2UGFr0CaVPbA5ADOiITLfoBesYNIEMCEpAOeXxOcf8EKoZXdlPqirvMmmpElTxgXZ3d7nvvvv40z/9U+n1eiMxwb2Vz3uBF+95B00RodfrVYYqmYWOmtHMWmbuRlN8rw7XKIZqU8XEMGQYAjqwToFGIFnT7AI3/f1n5Fdu/HPu6B9weGqTNAqsyUkHYEIC0Rzs7qEDg+7Erk5BRyGhDpAssYtDoAqtGFLgLFcNOmTy/WX2v4z+PQR4fV2lNBXZbLLhrjovoaji8/sMotFxBIMDUBCFAmYfbn+ffP5dN7Jz+7v5gvgQffFBe7gBit4gJQg6ZEa5I8v7Vi1Eo1QKzsPc2vAMmcoIJSH3/s9PLnTRSBekJlpB8XcxXa3fk6k24anSdxOayqC8hOTjGvkGevBbaz2yTQXsySq33HKLvPe97x1jQlX+LR6z8hJN+XddvuL1pv5QdddX5SfljQhjL9cB25mL5xQMj5gFbaUSv6crBGKMxYryeNVgMocZKBsS5SCwHuF/8I53ymvf9x4OOm3210/TN9r6NinwpQ4UsGYHes848UsHGBFSI6B8aF1lGVHOEC0APIgEoxRGzOTYGbP0ZRWwO1ZcqX8LjBpxMZSUrXfETQV33bXVW55MIbtN4s+ms32SoNEEYDJMKsSh3dqTpjYMlhU1+sAh7N0vvP8mPv6216Ef+DSPO9VC9fYIQ41JbX8FumVVIklRgQAxSowNg4wiMCmBMgiJa09m3Tp0yx6q6SJuRmI1CyU1bEpV91e5X/O7JSm2yt9JqWHQlklOmfmcnLY2Tb4NNGBQfoJ5BlOO3VQMGAfw8Y9/nBtvvFHuv/9+Njc3x+I1rcqP6HLwkyqTwUayDGBEIrJxfYaDKMMxuCBwi6iNASShZR49DbvAe8+dk19/41/xkQcewJw5xblBinHS1XBkZeQRDbRGhidh+gSjK7OUB5oV/xOPOxyxVjbWvwUMa6QpZohd1jsS6rGJOtRmbWgaTUDfCJHCjnOXIQxBugNUqwtmD+6+Xe67+c+5cMd7uYYDTm8rzN5Dw+CJBGSEzivA2FC/gEg4Kg3nETazvO22/aGD/TwDKal1S6Jp83NhidfZVXLXhCk0lUEVMSUvKXnyapoxhizLeOtb3yrveMc7rDVAa3Z2dmi3x2PWzMOIVgVu15Xj0x8FRmWKopO9YN2XFG79tFKlygxBGENoT9m9aKyHwB7wyg+8T17x1ps4Fwck62ucP9iDVsdxOk1gnHQgAUYpUM7ZUo3HoD7ufkmVTGosbGNzUrhFQnzsJgXEoALSRGi17DRJsgHZoEe7E4FkqNYBHD6IvOvNcvt7b0Yu3M1Z1aclfdJ0QBTECMqFHQ6HWJ1K0WIPkTCALvkyzTK2atP6EKY125HqespCCYsxIothLQeLaqziwajXuFfxkiThoYce4jWveY3ceeedtFot0jSl3W4zGAyW6kfUZOIcNz+pSaTd3qw8p4/MqOzf9jhsbOyiILbO3cCBEUyg6Gr4NMj/+OM/4kN3/T3xdWe5eLhP93AfffYajGgYWOansBNBiSEQC3DbdbrQzjksniunGgBdPFNS5WuztTffwjsSDNxFx1QQtaCXgjIJa7EQtQ0MHoTuBUj35fyrX0Hv7k/ROX8Pm3rAFikkCUqEIIpJjD0kIlPasVAHX7j3rmTyIlgGq4fPWQ1il6kpaD3v/PRttI6c89U9iRqD5F5KKkew/MAHPiBvectb2N/fRylFv99nbW2NXq9HFEUT/Zn8dZhfQjnuflKTSIk/UdZFuQxAnNqHU7QCUVZMcuEakzb0A8VdCH9z7+fkl/7sNVzUmr2tDfa6XdJ2G+IYkxno96wfk/iQtNhtEhTF62KsqCWI8GVaFkjesG32PTQrUuPWBIEckVLWEzxVw/jhqWRsxYGND757L8RdeODv5KO/+2usX7iPs9pwTWigv4/O+oShBh2RDAwmjPPoBTZEcebeu9j4USPA/vgzarHXjZq+CC4i+Y5hpDVlDg/krMALL4Wbgdaa/f19NjY20FrT6/Vot9vs7u5y0003ya233sq1116bS1rr6+t5KN4sy5qJoxPuNbl+OfhJ1ZI/hNIxpwFiz0NzdhxEyI+mblmny0+nIq963zv5i/feynkVsyeaLFSo9XVohZAMLKAehvgYRP5sNEG7AzH1UGKbwKSmDrqjFLCqpKmKSe1956a1XeWHHOCew8bpTbGRHgwWdN+ODGRdSHdBdiV7/Z9zxztfz/W6z6m4j9nfIUv6dKLQbhsyGSYRa2kLFF6w01gzfYAQiOQnqZiRx1kco51X8l2Gn98sC0QTmsqgLly4wOnTpxGRPNrAHXfcwate9SrxTpf33Xcfp0+fzuM3+fPovLpX/RAnGBSQb12wwc/88U8G4+BSdIgYG7ljX8Hb77pP/uAdb+PWz/89h2sdJNokjlsYrej3D+BwBzod1Po6Mkism7OyOFeOh2vIt6pUYa01alUVLRJiY26AvcyU5sSgrPpkcmRclLXauV1wxMCaPoC9B0BncNfH5d4bX8HBnR/iMWGXoHuRXn+fza012FqDwy5Jd58obKHjFqEEZE561WIdFUKjbfxNE4AyeYRPTx4DKqt2+V7I0p44ZUbH4Xi8Jqdp1HRNlV9TcfzmktT07hzJf2QY1OnTp+l2u3Q6HZRSvO51r5O//uu/zsP0KqXY3t7m8PAQ72DpH67b7VYeajCJVmXlm1QfLE9tm5kK+KhCE5Ll+7IMmj0RJFQ8JPDqm98nr/ub93Fnekh3c5NuGJOmgk4FM+haAWD7LNngEDl/Eb2xhsEMmYjSoIcT0s6CzDHJiudchcpXILtvi6OVwsYaYRl45qJjeteDAGgDdB8ALsB7b5U7brqRzu7neHg0oNW9SKAHtDc7JIk9UTkKtI0IkWVk2QClCxiX2LDA/rgn/xGjED27BXrWxbaOXVSdAjOtvLJWJLag2roXoUYYVKvV4u677+aP//iPZXd3d6RyH2LFW/uKjSofagCj4Frxd/l+FTWRjo6bn5R30/BHsBe/ReFP8iYQ6wsVuAMNBE0XTVfBp/qp/Owf/SG33X8/h2sduutb7A5cXPAgsr5IUQTKkPW6AOg4hsEgD6gmCqs8irZqZb5tQk/kQWImD7LhMWlzchmRyctzXbkiuPOURq7Z1zRU8fz4HMuOO/objz4ND32PcOcHDg7gwbuk/5e/x90f+1tO6ZQNdUiY7KMjoZckiAmQoE0gKQOMDYui3LSXBKXsceOImx/Krg4KF6dFm8pHrOvNOgwonwdi30XdXrp8npREI12qsfxKisnLc0GpivSq/uzJWagRg7rzzjt53eteJ/fddx9RFOV75rwUtUy60v2kiuTDNYE7iUWwHpoKVGBPxP2bz39efu31r+e9991H99Q2u4PERrrsbFvuMChEixQvHJk8Ls/Q89gObjPEy8nxl8uZFpTAvMYrDAXLAGzEy7THp37jvxN97kOc1oZT6xFJb4fM9NFrMUG4wSBTINoenCDujfrDPBEUKaJ0fsy7yXEvjwFCM4+g1dJCuFXN/DkyCUopxSc/+Um2trbyyuM4zgPSVzXO56u6Ny+WtGieS4FRNaGqWgXLvGR9kw9/5rP0rz1LdvoU7O3Zo56SxObUCvC73+3w91JTER8qSlLGmBw0RytkCd6Wx8IlYUYKwFkONGEwhOOGWncX2buHs+EuG+0O6BRDnyyARNltKy21jhJFIBpN6uIOpAXzoCAqc6FZQozzBM+UJhCITTYMG0xFFAH3PetUH4nfVSD/nioP6SxiTxXYVLE9eR6GmNMqXv9UBpVlGe12m3a7TavV4uDgwGZ0zGmaRWza9SvdT2oS+d3wigIz0dbUneCsSSYgWN9E4jYHu/uwvmZXrO4BxG3ywwsAf4KLtdQZ6wCoRhmVh6DAeSlTfervPHQUUufSqbDTOShuilYAKZtt6PQS0m7PqowIYaeFKCsxBVhLnxJt1eW8NMuk8sMHlEGU3QGQKTPEGRUjDGrZtEw3nCZ1LZsabXXpdruEYYjf9Ou3uZT9oubxdVrUEfJy8ZOqIoVTJfwPlYKyjMkzqG5vQBS0GHT7NizmxoaL0xQOd+yWllmjFFoCx3gCy6SQfFVVGLtnTS+uXFQ+aVNzeJMKJg76BUF8wWFy7rd7BwIYFRIEcH7vIuv9HnHYIQxsGGQZGAKTsRVGqMHAAXFDhmNxJhsxUMQiXIJy/SJoMhfGd3zPW53kUydJVUk0Y+XJZD+qWebHNDpyNwN/4m/xUE0PPHY6nTEVb5WOkFX3Lic/qfGEhb9VCs44W2QaGxub1p8sjInOniLJMjjsErfbDA4PIXR77fKl2q7keRlK5VhUZrCniojOI0EuakJbZJBbIHlcjTgyUnoIOmncO8hcj4SAZq3VYc2so1QHHcQE6YB00CXNBrTCzDbe9bmIyh3SjbJ7lQLnZxY4XhqIsRESjE05zYpWlkqqwOimNI8QMG0RsRa8qnxHiEEVw+/2er082kBdA04wqIZl5upEPqxRQOz21CugnybsHh6QxIFdDg/2ITVsJCmDXkbaDkh9PC6027mnh4ypGC5FQSaGTAyBe58Zc1rRKvpkXtVgXl+qRRlbChD5bcFWygzcKRMBQBYQpBEMQvoJoDLakSLUkdus6z4uwoQhJNOBU7EtY7LxLjXaGMICVmgfHEwwvhdyEi2MSZX8qMonB49Z1WuwqCKtEoOaGmzJGJPvq1PKBpbb2NjIjyyfhNbPer0JTcq7Ch14nuebiWpeaogDcTVsbK3TacUk3R6kGXG7TdpNCJxnsh9EWmqLG61PYTewLhporkSr6P/JFZYfwDoOeF8jPRapAfJIDo5c9O98W0uhKBDIkowgatNpOxWvOB7y5/XbZEyhlMIGcFHklrt8Q7L9rOIsuWm0qvfkvT7K3h+jiWYrs9FWlyRJCMMwjwnlD8wsBpObRQopO3pV3btS/KSKm60r2yDYFThfxy35jcKpSUjIUJk9ZNu01xmkVuVTSmzcKAVeQhJvuvZVeA3ct8kfha5g1NRdTZPepoCdfIVE5bFfNRVG378Zu9aUrKOnd8UuKcficCAXDM5mgPwcLgIU0BrJFSDEQ7VLCSoOkMM+kBJpQDlWpkIyRcF7yjKgwHnsjwDfAqLEvuHCQZuWnclos4dVV/aLx6aGwreMXIfqsZjbYCRP5BOMXC+fgzdt/ItYbFOUQsuwHH+AwjBDYYTPwB+XfrLwqs3NV66flEZyBEM7hzswzvqTh0oRAaVJnfexKViKPCk/zEqTZEwGv1TYz9LI4T8CaHvsuHb/aw+Ae8klzzKcOd6zOwDnduH2POK6RoFIRkZG4PAYZez7yPJYUqNTyBY//k7E9b93ZSgzosudPDjuz9EoM6eRtPW3xmgmIX8MsJtT9VlUbZpHRF2k3FmdzpblpNaknhkz5KrLpaSq/jly9XDFVFS9PY1INhX3J12fRkXpZZnk31W5XUf1DhtJUFUV+2uzOCpejX5Si1JxICxlAIg0Br6nkaIBryu2eUr/XJZ+VDPSqjWMWamplbBpu5XIUq2yS1PxVmFFu9L8pBYhkQLy6Fc1x8CnMolym7wklbsgTKl3WtlN+WZVX1fUP1M/jgDW4h5teWbu6dVP0RaYz8JbPNG36vrwwmgZs/pRlakuP7h2ixMc1PCaUiNHSqCMIEsS5xozqOIqvggus8gEn0c6WqWUVndvpSvkPJOuBIiOXD/ixXysf2radlykKT/e8/aIDBkgNIoG0GQBXhU1lZBmLtMbl/I6ZAwvGlo7q8tpgi+dYFAN0hx3DMrjA1Oxi2OC81T2zzFp2zykC58yFd9LJewx5b0tG5NSpc+0/LVjuXAoxVCwb9ZQRfNnWrInzDjNw4wWmdyT8q6CaSzKbJvWUUerAEaXSiK1zOdKYFIrn0DHmKYxGWtJdT/mZLRLdzOoo1lE9ivJT6qKgc0iVis1PN8tL0epfDJ7DCpvp1+t66oot6XmTKZp/QzFQC4TH2Dy/TF7fDn/hLZZ/WJy8U6NKhejUCvRcPON2OX68onq3pvHcPKGlgsq9X9dZMxSvK7yfb99ufborRJcMdYMj0kxmm6Y3Y/J4m8ZSlgVC5R9JzXtKdffLNk4zSsdrFr1WZUENY8UeBQS1FFRVRuOhfQw5k1+ZdJxAPyb0LL9umZ+u+WJVzcRF1F9rnSMal4ago7V/V2kptjFLO9vnmcsYx5NMZBJdDlgWHWYlCf/fiZhPGPSkcgI3jiLH1VTP6m69+Lza3FWunKbC21dJpOaScWbJp3MY10r0pXoJ7UoFa2nY9vKZFSkX8Ty1bTtR2F5KtfnaeoYEhfy94iaZ0NxTZmNDfvquPT/CIxAg/4vXPKMa2LzZmRejR01Z5EwZvUfmpamiZl2XgZ5lH5SSyE3A61+DygXyrfEqBpjUiNFjz/XrM9fV2YtzdBXs0zio3SfGPGwHsOALDWJu7XM/m/qR5Xv7atyQalon09XHnNV7ZvYtqPAoFaByyyCIU1r0yyqaPH6vHmPAoOaR8Wetb5JdRw1Vap2S37+qnLqPqugS9H/swoh4FTGKnWvWF7h1jxrRqOImlUVT7PyLCJlrEoSWzTPrFLasil/F1XqsfGbh2csdLiElurKSx65NvKMUyIhrIrKaoi7eOROp7NQvXXPLYJ188f/VkevXtdRebw3UnUrqIkkdclNIPNKYovUN8+9VZOvuQxS+rAVQ+Y0oYxL0f5VW9FqJCRgDET2v11wm/zyrC3Mc8p8+S8nKgPn1bhe/TzMw0hLzfgrriHl/A147VQJqsoPZ9YNhE1oFinkcvKTEpE8LLLvL631WN/5QCEB4MPgClYyCs3wZVogUtmBA1CIL1Tlx5I3t3ijUK/Kj0Zvxtyk6kfVSGvoNyZSdbTx9HIqGyY4iVBykEQyY8dusb0j5TcrHoYBAf0xVcCwbCaPn7rqypJTHZX9qPL8NdyzjEGWr9u67XfpcOP84YxiJOZbTTL3ipT11aobRn48+3pVMZJpPTVaHI5yZV51XauSoObOO2VZ0eKDfLlX5eIf5QHNigDtJZQAm9JK2lgo0q7o4+f9LVsxqju26bhTsY2NPMEnkO/T4WEcDV1baH5Yx1zS6yyA3Twg7qJg+DSaZyCtqtxlUyN/lwq1ad49X7Uq2ATV7Dj005VCq5hfVeXMYiRY5mKwND+o4v1ZwO1pIHuRLnc/qaOgMQC52I8VpuRl+fE4BL36ekU5w3Y2K/5yoVkNJtPm1CzlzDW/jgHoPonmCrdS/K5LO+sEX4UVrWxtPA5+Ussmj4GMYW0OMB7RGOuYyEiBvoC5GuPy1jCqefpj2mq/4i4emsudE2gh2IpQULVr/IgmLmZLbvtc86tqnBRo6l6+GmqCLTVR8xbCoCaJevNa55pKabPea9KmWZ6jeH1SmlXStBCslXQU6lVdHRPUvsudGvd/gZSsxkK4yPyapy4RsXGyJqmANRDCNL43VzSDOqlhFRJKXf3z5m2a5qjKXQaVt7yU70GFJAWTJZqmklRdWauQpq5Qmrhnb8I9w/Lm11j8dDVMW7w/FqmzwnI8WtD4pVne/EIB62a9Pw/NK4ktUt88944Llds4cdW8DJ5nIh3DSAZHOUb8qTSXmorWvGW3p/HJwlmWEQQBaZoSRVF+Rl6ZVoW/zFLucfKTKquCs5LWmizL7KqnA1uGMdavpCCJjGAhBYkqb3OVJMUQq/Jpx7AGf794vehHNcFPBiY8c1nCWpFElasgFfdWJcQ1ec9Nx9m0sib5KQFI2ZnVX8+9UFVle+r2cI45dla5wC2RSS0csG4eQHwV9R1F+ZdKhRsbpBNUpEXaKBPKbdy2eekKVfumzY9Fn3lZ/X8pxnYT+XeuY6fqLHrzmN+vJozqqMhKDE6iK0tMU8Zz7akeRUxqSZNrjC5TJtXI74zx8TgtGsBRjKeipDQJm5rV4qhkcr9Mwk2LNLcENQtQXrwPV7ef1CJky5fR3zVm7nlX6LF8xX6uAsKvcCY1zc0gmGHmlse4FjBGxtXxQvqjppUstEWUYMZHuiRHn8+jFq6i3GL6o5TwZqGm+NVUVaI+JzCDH9VY1LwpxU+jqnY3ZPQmT2sZCI6ZeHzlOBo1JlrQZhw3y/Cj8u0pS1Iw2v91klTex77f3fuYZJyZJR5U43Arlb4N1EtSY41awgRfRJWcdq9Jm6ruzcPAZqUqDKrq3S9SZ+O8ZQlnGhNo0JZZpOTqOpoluxQ0dX7MqIWUSYlMdHhsUtYs/T92ZcXS7gkGNUNbl51nGVS1shXbMi+GMJGWiUEVXAUs75uhzGPMmIo068JxlBhUud7a02NqaHjqy2roSB1JViFyTxIlZ73etL557tWSh3ry35PK0AWJZTWvrtJiWPdcBQzskpGfSFI+pkCPJJBi2hkod1NwhxiI2G9VcajBPDTP+PV0HHygPJV9oCb5RM2yWDaOBzVWSUliuNSrwyzlHqWfFIAxdn0JgmBCWlM515Wy8aPy9F4yUgoRTS7gj/GVUSmn7ohuUVW+bMX6fZiXqryAmOG9quef8l6UKmNdNZO18qq2pjDlPnVMu8ah0zCMhVQpAQgEKLT7KAVKFKLsx4K+Us4yQmOaga7G25osbnV9WH66YrpsGpMLRnNPa8WYx7nLERSuG2UZVOCMCtbyi33WQOFXiiONqDmPFLMqiWqVtHQJiumDYqTcKqC6SR0r6JexFXKOOorYZtWnWSF6tO6c21UsrO57qkpSkgaK1xX22edZYlclvS9S5qL976NpaoauEyN9ljMoV+cMHTeVQc3SKYswo1nzLiIaL5K3aZplUx0OuEgZR0lN1JWFVZYmUsiCVTQpf1odR7GIHocxugyaOZpB3d+TrjW55+8vSxJrsho0ub5I3qbUeNL4chcYBysfuBMwq5VPHGn+fEcFvi5znFTlmza+j5qWXedcAety4NA5Oi7bR6guzVGXW0w/T966ts5DldKFNNAzRCpN2U3bNn3AjWJdI/VWXWfyuypbHSfX7/SGMb+ieiY5K+WT3/eZ+zuPB1X3HIUW+nKUUmPe1dPiLE0dX6MX8711nqadyzdVap0kcChcnPHxti2LUc0UsG6SfxHM7iNUpCvVT2oqTYGURl62Bx3FnqZh/LxpwqRs48bbvCxjRR1DmlR3E2rSPnGdMVb1pVNpq2iRRatp3iYLdVW5dTStrPzIqYrFchn9P/O5eNPSLptxzCOhLMpoVuEn1YQmlTgRg2r6ikrtXopvVMlCVmcttILO+D1Td7aef6aJnVK6X+TWMsS16opYhpo3zc+sLEnB6sZP3h6x22dGttW471WeZChNJPoZ6Vid6rKKeubFtRapbx5aNXhbWecygOkSLYJBLoOOk2/QKqhqoVrFOD4uNFWC0lqPxZwp+wrVXStev1r9pIwxEwfQmMThYRWsdqNRw0MRjQEdjOSf5Uw6d7PUBkOVBDbtOfP8la5P4+OifM9fn4rJeGfIsv9QDYnkO/EQEYwxw/ErgPvbmPzP6eUVMS0PSjsMKm9+rsm6fis1twqTgukMtbLfiyB5HVbnm1t4RqXUmESybInKtmNGN5EJtLRjp+bNM+n6qiSqVdIs5Q83ic5SwUzNWRrN229H+n4vf4FhpbTs/j4KaXVpx06tyjo3b94rCaMSsUHp3Y8mGex3k/bPAGLP+1yzSK+18aiMsxqXr1cYCSZ6KDcxKixAvo/qsKmq5i9C0yTQaRjZNAllUletEs/ytFC4lfKAvdRWtHkYWJHmiVSwajeDukVBuY8UrVczWtDGGFVDt4N5n2lRxi11jHdWprNELLfqmVYFUyyDZm3bRKHEFrSEVtXTzNEM/N9NGc2sL3BVktgqyp32nLNSA7d+fETLXEVSqghsTMQsxvCx8kytYgAVjKvYH2rWgwtGrHmmllNMjOxZ7PcJVflTlqdGvFyQJo2PqVUveYKX+y1vWylKwXFmokWayw+qimEtU8pYRLopt7Vpnml5p91rWn4dLcuzeeb2V0kfZaY0QRKb9qiTFijy0x0aKAuVZYyLQk1DyQ4LYmni1CrcB6bhRjNLQjP6o11qBra0Y6eaAHCLAKaz5l3E/LpI3qZpmpIGlCk6azarv3H7RarLrLq+AFC+cJ8smH+VW1uKElr5Oae5cqgFP7PSKlxLVklLfW/HyUI2S5nzWBiXTXUyhK2r8Jr8/oKhrF47eY+y/UdCS2l3aWq7P8vRpPx17+ipsIzId7uPd1SlPh7n/l324pn/LcNv//dcVuoSNVLxJvkF1aUrp79a/aQmSg9a5SqG4OMTjdavXMSi8qqnAUTlfi51b2Uo2jMi3tvtCa4k8QkqaIrZSciqs+XvdTT1aP8qjEzWsYp+YqqIt+FwlqJkKYKIGinOKEhMNlwAnAOU0sNFYeQATP9KHFcKBMLCI2batkOLIhDbj1X76crjqVZqqet2l89MU8FqrtdieL5tucY3VUcfa1N+S4F2fmr2WzBaCu9igsblF4DJtS/Xk3wR7jyPFLMqieqoaWyhKQSRG7ZHMeRGw/szAcDHYGVf5hjRRUlyLPH0oS21P4Y/lyEFXClUpb4Wv6FiPC7Yb3OreLMyiBOMarU0LyaR07ztrlExL2UfyQS1t0jz9lfT8htRTehg338Lv9fLnObyg2oClh83K9o8LgRlmsdPaqnkrWsiji/MYTWqseZMvde0bWOXp/TvzM0vlSdWtVhVNIOcGVU9n4zXWdfeOlrUTWXqM15CKGQZNJObQfG7fH1eN4BJZugryU9qVSTSwNcGGKK+eUb3cxxXGJmMBQ2zQWNc2vn6t7rI5gsIU/CsRWmVkl9dFIL8vm9Dw+ueJmFR0PyZ6heY1Y7vpWFQs6pSxevz5i1+muad9DyLqJLT7s1LY894VKrYImrMCnDDiXllNN0q6ShU+ONoBVwV5juNFjr6HGazvp3s1VsFjVq2qm6PUOVmtmG7a/du1UlSHj+pUn+oeWdSs69uWWQkFx1W4Umeq32uvxbx1fFn+ZStfUJ1/02TpKi5P02SOq609GgGRy1hrLr8eSWxlVCp3Lkc7i7h+ynTPE6DY23Mw4pamuQ0OVL3LPXVSm6XXtKp0iYmaRbLqO8oaWE/qCppopimeP1q9ZPy5+JVlVkbgbK+IfgIq8YYlNLOxcn5zYyl943KGzel+HwJd+kL70NVSWujB2RWNXfidS2VEmBdPxd9oTxeMymaZZZlNqYZMHRwsu5QMy3PDuuz/TNkWu7XxDZPouHJvKVOKElSdfGw6urUNX5U5QVhTEJrjPV5PzQYHlYhrsUyHivdDtLKtk6iY7HVZZG6F8GTltmOS02N27VI+4/Bs48sfsXmXPqmHduxMQvN/Aw1pysva/4dm60uizC4RcDtZYLss7RnFSQi41s28psMJ3Fxkpc+E/NNrnyGlpbyLbn/m9JRHT3VhKZiZUaq1eEV+FHN2r+rHO+NrXhNG7DI5F21FW2Zlr2mlsSjprE66zCUSdjK5Aom622LMKrKy9MXkCqP5ktFq5ysq2Da8yzQk8paNs3tqOmtPlVWqyJes6gVbVr5k/JOav9R+kmtksSoiv4hx6XMEMyowJDMEOOYSs38qPy9Jv0wHuvJc5rm/V/EhATrwGojahYkiLIquMRXJA4THA9j0wyzLONn06xt3l+qjEnN60c1bO5yxq74wbckmjnkb5FL+r8nMaEy+D2PN/a8eYt0HOJJrYom9oMauYBLWLimmokeNcxjngVoNCEVNnKZySu9SB63nUbLkrY01jAxy1gcbUgzo0Vt/1Zwg3nH4KwGJi2QjW0A90z7BIMauX6CQc3Q/4u0rQaTmvt551BBrwQwehqVManyM3sXjfJYq7teR2UMUtnKZopFdUkxqGVXvAiGtMq6Fylz1WDuqB5gX5kPtXvkfnf+mSoY1dEzDj3SCJX3kw0hMwY6lwTHhYP+L5NRN6luCWWrwveRjJ0FK5mq4k1SdZpQldg4wvGvcD+pLBuPlzSLCK6UjQdljBmRKKwYrUCZks+J+8ohowb+SR6fatSeEo7ldCV/qe59jfBYVWK4Yls6C9lijS1LGWx4FYMWjUGjxH2MgPh3YPIledIIzlsiDP2ncC5bXiWdUMBMjKSQtGpMlOODlestxx4fS1fKrpQCp9VP8uTP31t9Eluew8Jm8eczrllN1Lcjs7QuosItUv4iauEy27F4wYUIa/mobNaeSotjWYVq2O7y8x11/1ZXhlVLBBBdESfKdZw/Zr159x0pHVV/HbnVU5W+HTWRYGdmUGVgvO7+rPea1jtPmuOGUc1Dw1W9WdlzxZ5ehEmJNF9Dq/ClJfTZ1YBNLUp1WFYdHZkqWEMzh1upun6UG3Hr7jUpf9G6F40nNS/VMchG9cyqyoqUrHx+ua15PlW6Nqkfakzx0+qahS6FFXWZtGwIYtb5OS/5w1IrR6NXi+eghVS84iSZRcooXl9UQlmFdDOPJLbK1bsKY3KVLl54VRmLSDh1kpRQ6fHsV/CRlXxE9WSyLjbj+z9uNM/4X3YdIpJ7pI9BAY5mkaS0w+70tHfXgKZKUFUPN4s0VUx/4ifVkNyKoyGf1DlupHB4i2r27ptIWHWSSxMJZx6pqcJgUufo2EiakuqZsIwJnvc71ZuFF5H2xuph+X5U5bJWYRyyxgPfR/5dVDDF0s8m0tHMnuRFyWdWFW6RDmqSdxHGMa8Kd+QxoWRUXi7jB43jONWU3ajdhXTGH4MF1ZNljPEM26SUyj3ZfZ/NHI9qpFmXh9S0TJo51lXpHZc91mv739/3xcxYbZE0zYajT9uYmg6AVYHhqx6Al2qAVxo5Jqo1q2vL0qlKXcxvNZPMr2QaW2COoA9WCkcsuejGflDGGLTWjVbYWaSHKklkRPe9Qvykats05YV6FTvX54t+L0aQwhFVjSQQvOTi/15sROXM1Y+TsfuqXP1I+tp37Z+jKk5S8d1oh44oVemLMxaLq0IlXYSkDnNzNDaOiuPc5y93Tk2fVNZP87SjVdh82rW+TpLybcn96vzY5WjWybkjai6bCy8CXi9S/jyA+FLJqzvLKGqO9pZB0TqQdN66Z+nfufrbS2jldh/R+1vElWPZS+BRS6CKURVzYl/M2bSZDk2YRcWbx9q1KtVwWpomk3HWvMtkcPPE1J7k3+IncDNYqvnziVTHo/LSXlV7VOkzdr/qOSaojZcFHcO2T4tHVdzjN42UT7+Eds3kBzXNwjCPBa5JPbPkrbvXpPxF616aWuhUuUmmXbuTvEEbi+9oWrSDSU1q+HzT+nfW3fuzWASPI021Uh5VfVPS578r0kybv54hTR1Lczzy3Fa8unvLsIQVry/K5CYx1nkZzSLWwmWTMqN11u7Ncu4J5Qk9k4pS8XxGpsSjKneFKeYfxqMqDvbK9osruCY293GneRewqRKLhwhqGODUsVy6XRWPqjiuixhnkwWnikakqynZFwpYV3dvVgllEhO6kvykasmtPsWNqU3SV7Vn6oApDappE6DJ803tx9r+9aKiTOzPSe23E9F9iuPyKDCoJlJDMfkKF7CjWBybjOtlg+cnGBTHH4Oqo9mkH4YjZwYMZ1YMqqaQ5ak0wthRU5eayt7w0z62/Ze61ZOpDpPKGeERtX/haAbzMKNVMaJVM4RVl2+gdkVWBUHBUs2rG1ONJkxmkfpyLhGNq3ZT2i+A+GcY/a4E2FXlnzPRMifnsnv/KCx5RSaVu5lU9fUSqJGKF4YhWZYRRREwPGus2BmziJhXk5+U98OZKB6rAt9RAtoe2iauHskMkmagQ/c7s2FmlaaMQXhGNiyvJgCSUqCM20oz7IM6D+Jam58q+RlN6pdiG3w6lf+XXx9pal15/rmNw1GUAqXIlEaJxUoCo9FG8qP3MkArg0LZ5EwP+eEXYOWAtfwk4ZKWOjOJ5O93FiqnV248Fp+jUuKtHXrzsel8Hpj8gn0mJcNFpe5IqhkWiZlUvGWnnYUWUeEWKX8RtXAWMhQGmRq+xHwgUHiZMv7aJqpXdddLCPZRrL5TaYY2KAEtOo8DNcot7GGdfpWX0meYajZapsQzj8RxLN5RiYqq4ESXmMJwGxnvE2gukNzTJNB7Feb6RUz5q7bOLdXNYE6qbUMRrPYDaNamurLHBDF3ochQR9pQB97LhIYsoS9XpXLY51tumXMEZRvrT1/GwmGMjxnNfKpL3bVlWsIWsZBNy1t3r0n5i9S9DJLcYjU5TW39FQO7Mg1UpquyyjV246ire4qlb1JfVm06FYdLVWWbTxOrHvOqSV/OWX4VHZUf1axkNQmvajpP/rJFdQFaSIIq0ioklFW4EJTb0XiCTXmGWdPMQhMtZhUTZaR/xgsblaQoMYi661VlFOuTcQyrEvBuWGZtGcV7Lt8wJsJovhGssraU6SQeU6lhEhO1miWNg6ZjqixJDceJ+1Ll9KWxU77v8tWd07dqasSgii97ksvBqiSUSUzocvSTmoUqJ6g4FKXIpGxl1Xknrb6qdK0ubYMVXJpKFTNKU43IM5EZaNrBAeNVyGKcbkFahYQ+tvCV7l9q2GKhY6fmdSOYxzWhSbnT6pw3TRNA/JKBl0Xkt8ZqMs/kHYtk2TR/ec9dXd2T2rTEvqzy51HMj08dB5C6SRuq9kQC4z5ZNffHyqvox6OglTvBzMOMVsWIVj24Vj54j2JyTKqjYf2XlllPrnsZ8sAyn8/Pj7rP1U6N4kH5zyKdNot4eiX5SVXF0ZoFo9JaY4whCAKfGbSGLIUgGJuQEyMijqh2aiR9nqS8183fr1EF/QGiI74tIxjXeNWjVONHVc7QdEwohZZRDGYlE72hOlo3nup+N6/ejbOxg+9Gf06z7tX2jR9HBRFGub4t0lRsqqjOO2hCoaaGmvfUWIKqBWlnpFWtCouocIuUv4hauDCtcuJNq2MetXERqqlrTB2pU3M5bj7zlx9dColuYSvepXAVuBz9pBal3JLU0M1gLCJlLfg9elk5NWlEkhJhLJJlVT4Y7nKnJL36oia23tY1yU2i6l5V2Fxdun5cmFN5DC3sqzXmZ1F9vU6SKvfLWETUSRL5EdDSHDXndSEo0pXuJzUP1Upi/lqFRazyOWosZ7XPXFfnhPfY5B1XFDqTD1Sxj30AtXEngyOSYH09U9KsysLrCqu+XFP34tWtfjEu0tL8oGAxxjEpzVG6EJTbUdWmRZ9zYSrjGkaG+9FKbRkmKuRr0O762OZS8qMqleFjkM/SBTXtmvruRk8NrUTAay12wpG5DMyySJdp3rGUP3ONJFVHdX5U5fda68KyZGq8F28WC8OqzPWzllu8NinNtOvz5j0KDGrMpN8wX/XlqrPMaiSpGgxqoWde4P2OtGsCXUqvnsvZKtdkrK/CCrmycCuTGtiESc2TdxUgeJM0R8GMcgyqpp7cf6XppJ1Q1jwTfyx/TQzyBpknl9u0/mNKx7ltTWhVexzr6JJjh/Mwo1UxoiMfPA2qs5O9qMr4b12f/yifYxZGV5mo9O3LXCIVj+bKS67H+0ejwshkx8a52rPE51u1BFNVXx35fqx06Cx0spmUrkQzY1BFndj7+MBksLQJzQK+XU5+Uo3iQYmNU1TFcUKlnVVOW6bkdk+JsQFFTOHohKL1zk/yHAuaxsx8uprnrI0F7h1lhqjs6P2qkx1cW30wIcEB3sV7ZSGujH24jHUjwSibx4giEyEDDBqFRqEwYh+pijnZaFzkxyrlXVNgUotCWMsCm6fmn+B2IcrmL1ru8vHs09Sp1kKOexoFobGZtLFDQg8T4wvM36GLLtbk0eeI9HAEqswlKnfVKuJ8BSu0ZwJGuUniIEsZDSO30nczL741VS3W+aRfhepQ5Ug4qZrKZUKqM13eylp1fy+GIdaUrcg5Xi49NSxyLkfNWTCkE4xqOVQue0QKnJCvFpsaq8B/JqRbhEnNiGGNSao1KlbtWJDCicwnNJF06aPcwqcq7o2mW6zeJvnnjgdVZEB5hVOiDVztflJHQRPbmIvbU/yjqtLVpa9LWwfMj+TVSEFmmdUML0UVb+THKK0KaFUsLkVNe8ZVj6Xa8XJMwPyl+0GtwkN8WppZGVXx+qJMrqpNy8IXyuUN66uvS2quj/g1TWIyORDU8HqhjEbPW0pnRX6PY47724znn1y2f7ajtDYtUs80f7GjYmDzLqx5+yQXwd2fxSPAhuk1tbBkJc0ck3yaqrdqc/08KtwkNbNJmmnXm5Q/L42CwqNS6yLtr1S76tpbp6JVqJ2TVNFyuqX3WT5XlseZxD+7+9h2F65fQbQsy59Xq6cdpd6orKaVnmBQ8zPeZdBY2fnqpEc+yn3KiIGIRRRG71dW5L4Zl1ZEhter7te0ddaBLyKN/ajysgtp8y0wNXVeSmfNy4FWamyZkWZSz5fNaJrWOWv5q2JEx+nF1dFs7a9hVEf5nBMkkanqjcweRO2EOR0NLcs40QiD8vGg6u41uT4JTG9Cs+A6x8lPyuv2qwLPq9ycihJF3q6SH9FoHKGCI2PZQcX70Xg/qLGBV7owxV9srP1D0Mx+lf2tfP0THGeKPlRl8n5o5ZzKN/0Sc6ypUuI0baK0vqwC96xNA2gpjQut3EOVeIZMfk91tHA8qEXwpHloVVLMpVbhVkVH/X5mbUdFwvnu1ZBnABOU2hNaJjV4R7O8h8aHJhT/XtRqtUwr2rTyZ8m7iJSzKgmpKVVJUp68RKVU/cnBeTmCBYOrJClV43o9WtkEj/mKsaNGh2t+MvKY2dvdL0qEArnrn8hI247qTahpE3KaZXqJbYHZx+EiFkitaiJ1TgLHJ98er2O2Jrn6Z8AMmlps5rHAlT+z5m36DLPkXbnUuGR8bVL/jdVVhRct2L8zWRmnlI0ZzeMH91Fubj1qmnV8r6L+cQMOw/e3YDMWOrizTpqaV0JZRGqalGZWKW3VEt4sNMacVPnaaD2q+vKQTFGSqn+f9fGgfDumO2vO0nflPlOltGOSiHGB4oqiYwFnu4TC7JHTtH6eREuT+r0Eu2RcbyUYVFOpqWld5XLnyTtPuWUJb1lS2jw0vkpN2cVe/FSVla9uevxeqZ5Kqa2hNOXLbDIWJvZZXTvM0fT/5UCX/HmL72hJTZkqQZVf9AkGVV/npcSgxsi/slrP78L9MSblkxcQA2FcigHGUIiydDVyq1kfzdWXfgWHmQ/kXISmMYWjHhNHPQ5ro5UuiY7luXirLn+ReueR0BalaoxmiaJ5035q+nyrXMnHMCY9Eu0hB9OlmGZamcM/fZiVOpqp3EtEl16SWl5Rjc/FG6l/Ctbj8xW/q8qdlncWmkWKO2o/qfKAqa5fM7RIueGvSunzchxTMQofU6lQePWDFKWhkQbmDR2pqyqOVDFOkxSklWIbZFJdFVeVlOob3in8X7g/ItVpdwaeBnFtMIISba2DohdT9aZlkwZjaVrdK5J2ms6HZmNzMo0wa49BLUnFXtiTfN48R2LxOuJyj2TlEmGu9bth2y6FhDgTjbTBgHGHSTqm7qUpJTISrG3WaTeWXhhKZzOWdSXTqiXJIzkX7wSjWoxyZj40bU1KXL8qT7pXqm9aVIHRwxqGw9QbB6tOmamuy3t6j9Y3ccyUniMH/U84x8J03LDUmRmUfwA/aSaFHanLW77maZIqOU2tbGJincfNoMkzNM27CNm9TRWTsIrpVIHidelr0taZ98vPN1E1n0HimgobVJQ9VvxxkPCOGc3jarCqMTwPzexJ7n/Pwiya5J12b1r58zLISeUuIh0uSx0aKWdEu7G+PpZvFdqjRjLjbpQLHb9eJ11NY2Cla438qIo00gTJcZ2xfEaqr09ow9VAizqh1p0EDdPHsFTkWTZNVSF9I2fBjMpuCVX3m/rGTCu/qtx58s5Tbvk5V4HRKMrqVH3f1tbvVaCq603STbvXpA0z0ETra4NnnjS+jhsV21r1Oeq2HDc6knPxZu3sJnknldmESc2T91K9QBEH+Ep+AaiBXCbFUWra/rLUNiGbqmhHsX+nRrasY3xGqk8kEfJnzKW0hszzONKkmN/e5WHSZ9l03JjUQqe6LGu1nJfRrKr8Repd5guuHYBTqljpIKuQYFb5/ibTcfZGunyp6Xs7ij2OjfygYDkqTBWgeqX7SQGkaTpyfqBSiizLCHRQ34bC35V+Jvnv8bYqpYYuVcMwAMP8RZo2x/NnKeNV1eny8ZJf9mJONbakvFuAK3DsmCjvYjXiB+Wqk1JnFCU3d9nHgypT01ecS2cFid5/Wx+wFeNd0+bcgvVPk7YnYsJF/EqcqL3k7rjkS9AieNIy6zuu5VZFJvTqjV7+eKinOfDHWe6d0AlV0dx+UIta9ppYwqbVfTX5SWkYl54cjQhUlNovhTszWOlqQfUxSWx8jRMpSFJjElO1iOT7zjPkMUmq5jlEZCgljrTh8gDJF6VFR9vSe6hmjM5LCzlqlifkKtwAJql2xfTzMsgiHYWf1Kw00s6CalVUNTxNfcY6ZpSX3aDd5XQ1ZcqU643fVVW7mqqdJ7QwTZSI3Wfc/43KRWMemotBNZFATvykVuMjooygtY/NJpT9iMoY0PCmL4CRSV92YRjzAJ/EIJbgR1WdRdAekyqXUWivqsCgGjPaJdE0KW36Xr0FG3AMmLKXVseHyeJMqvG5eHW+GYu6AUzKW3evSXvrrjdxQVhWuctSMcrlF/8uY1SVUlOdulbXvlnKmKXMGcZJ5fWm/XkVqHY5+X6t+xx1W5ZMJxjUlPJnybtKDErNoNtXqldesihpR7XPWseQZlUDK7SxUSqcKtyobBphUDRYjE5oBbRkDGohK14Vk1o2NZXEjrL8pT5nlS42EkLFHbQpARiNoDGAaAskGx96pbqhk38DRxbZbVIb8luzS0gjrfeblotnMdUcUirFzFVqZs2PcpzzKzneeRPKvUBEbF+Lu+hPv1DGXpDMfUweULDJ0GskQQWB9dcxxuSrnDEm9+0p0iL4SxXge7n7SRX7rJhXFSUMAZTGkCEYFCo/7SRULUwSIkGEilqIMfataYAMf5rwME5TfduUUiPGMDAu+oAa4RuVPl115+LVLHG+hNH68kIr6xq55+sz1WkFyXFxD6sNo4PqnAMZA2KK+Vxun5HFF/yFmNSq14dpTH9RiV8Z8tDRBlAhkGKB8i7DvVpde193UMSkyv6MmNwFjffizXp/WWbeK8VPahoZKwu57wzwL06hxUaNHDmyvG5WzCShXHI3uJneb1VaLX6xLklP+VHvNRWXb3h+OLGxwzqLv69eMqW/lZX0CZ2fngYJ3TUsM1MGUYaMobA1ieY+NKF4bRHwuQlIOiszapJ3EdVxqWpnHmPWisLaSzXDEjHKYJRBnIhMJpBR+XbtgjX7zCkIFLMB1DOC39VFVEQdlcmSydj9E7zpklAgftwY90cIEkEWEqbrkHbAdEB1IIzIlKavrKbQhGYKt+JB4EmT86jdACapdiNm9zlB/CIt3c3Aa00KB/SaMVjEkFnVTzm1xLjJmSmcooOoimerAsorrk/rv0Zl+nsLqgtNx4BtQk0bltCOE2pGigJcarECnB4HBBgiy6xQoCMGgKARhICMgAxNwCQ5aSEr3lH5GzUt/1IwyEnlNpIg1Ph2szw/YJQhc2KxF6MDA4E7Fy4NdL4nagTrKrehbFXLr1c/XxV2n6cvMIFpflRjWNQUGuvjGqYoIiBYz/SxjssBqVpSMuZWtRpaNQZ0CUmJBr/XUYEog9EmZ1Gpxql1kKFJCfIoDbEYMHrqKRWNjp2a9nuZ0ke5zEWkpjq6VAyyMo/7tohJ4aIrJtOGTAupEtAGMo3ylr1Z2j9J+pn0DFMlscpCKiW0Wpo0foactjatMgJBgSmKlS2VA9gvXxawepr2fqaPZ8dCVGoZlEoQpUkUiMpA9UEyNMqOWzQRAlmWw1YLMajig9QxikUm9tXkJzWZ7AvEuxRAbooVZci00+00pCJoQuwblrFz4IptmFWC8fmhbPWrFjm8D1Jen4xeb+w3Va5vWIErp0EZU3ArX4xitv64kmkRM4mgQQVWuncdq/1YBdBdkH2QQ5S0iQlsmkxB1oz1NPYkXwad+EmNk5ecNNrq4+KZVKE8P6vcR5Qm1ZpMVfv4TKQqXKnpcxwHIHpSG4qSden7hFZDqYbMqWkKa+EMjPPRUwZkAKYPWUpgDIF/RQ2H7tQk3tdJKXs+njEm9+2pUvemWW8WcQ+oKt+3q0zl603a1qTuKsqyjMFggFKKIAhI05Qss64CURTR6/VG0htjSNPU/XB4SO6/MwQNFdCK2iRJYhOazKoycUymFCqKMbh2uQiU3rpVfF4RGZWkPVOSYXplhipRLVWqjlbME0P+QRTK2A8eOvOfoVg4IvYVJb5KpiL2o1ATpaTyeyr+VqxmkVyIjEz+uOeu/ayaiguYUsMPVrJPVB8dGXQAKiN3e+onELc27IA43IfM2PdtIAtgEEESQQVSMUJHcrJw3fVlSTirLH9afWEYMhgMOHXqFEEQsLe3x+bmJltbWyRJwj333MOjHvWoIUPCMv0wDCsGmgalC5MR9i6cZyOOicIQssTeS1PoHpD0RxnfLO2ekHC+ewvSLC4JTfKNLWTzN+2EakhhiDWoLCM9AO9m0A/WyE49nM/sZ7B1BlotN64F0dZDJgEG4Dz+6mnmU13KAHbe2AUxpMsVo+r3+2xtbfHAAw+wsbHB2bNn2d3dJYoiAL7yK7+S5z3veSoMbVenaYr/u0wGKMbYDIDrNrfZ0IqL+/t2uQkjdCfGbG1ZicoklW2rOlWlCT5mnR4F0c36ssryWOy7sXYUAPQyNcXOrESocpUic/jTLFxolr2NVzPl76TK8JVBaIAEdKxAQrrhKe6VFvtrD+drvu9lcM0jFZ11UKFz7veuyBkBClblZlD7IAukWYUbQFOL37wMUkTIsoyzZ89y4cIF0jQlCAJEhOc973k8//nPV2fPnh1rgzEGHeiRiWVfIDmKGwKDixeIe31aKMK1LQaSYQZdUKG1hFSEWZ2lH2vTTrXezbZINSq7on2TrHd5vbkkKvlvUdMBczjhUU1oEpNCgI110sOMbmubB/QWG0/6Mh773S+DRz5B0T4DuuU8nxSKjABDwICQCEV92GuYkUFNE8MXNdNPS7NqN4B5GGQcxwRBwP7+PmfOnKHX67G2tsYLX/hCvuzLvky12+1836KI5PsawzC0GIMr07v+B17FNxAbeNYXP0I963GPE/nsZ+kFATuDjJ3eHsQxxC2n27vG1E3iBoyj/HxTrXEVY2GE4ZfrEyexqpEbqFK9RtW8hwmS1zANI31aRZed5DRN9V3Uj2pa8SOrZ/lmCO1Nun04F7Y4WLueJ77g++Drv0XBGqxdQ0qLlABQhEOk1YLpDZo+l5tBEyC8qR9T/qyXqZ/U4eEhcRzTbrc5d+4cz3rWs3jZy16mzpw5g4hgjOHw8JCNjY3cuOAND/bghNBa5nKfcU2owG++3NDwCz/zL9Vf/e2d8nO//fvsH3S5/tRZHuoNMCZ148bvP6uZnA2kkLrnm1ZGVR9NWiDqpKaqemutiGUJsEqClGH+qrjuJ7QgKUWmIu7bTehtXMvm45/KI1/wPfAlz1ZEm9A+w74JiHR+qL1TDqzWEGQRBMHUxeIEg1oQg9ra2qLb7WKM4bu/+7v55m/+ZuUteWEYopRiY2NjpD4vUdlDXewGSitBCSbf0wSIZl3BQR+++RmPVU/6hf8o/+M3X81bP/hB1jrrdLMBRsXWE70O48mlq4p7E/pnPl+uYX73wOM3J5wQXMfAKhKOM6nLTTK6XMj3c3GxcJa8bhRzfuMGvvibv5Poef8YNq9VdM5CsMVOT7PehjAFlLEGasms1CUaCIe7Yia8t6VhUMugRSdGXZkwP641jfb393niE5/Id3zHd6gv+qIvyt0wwjAkyzK01iil6PV6tNttwOJPWZYRBBprl7dQYeZEYNtg18YBnG7BLvCYCPV//8vv5FXvfKL81itewUMDQzcKGGid8yHjw18U1TVwGI3dWiBeQstHSBVViPbKgAzD8YKTphXVjGWSxLSk92wULjSNARm6Z3h+5aUn/xgjO2OuIKbmt0vlh2sIIyCcKbxmLfhBkB9OYfPp0vt2N8T6D2QEpLRIgph+2OZc+yxf+s9/Gp7wVMX2tRBskKo2GZp222bzYX0w2m5iDwrlNqDG8aA8GOzVk3KcoyY0SeIqp5mHcVSVX1dOUQqMoog0TTHGEMcxWmvSNM1VWa+WKaXo9/sopeh0OmRZxrd/+7fzvOc9T21vbzumYzGmfr9Pq9XK6/PMCRiNo+WaF1II8wQQ2L90ADqDrcAOwj7w8q9+inreo3+MX3nla+V1H7uH9qlt9g73QFtFUcURIgkqCNAoTJoSEaIV9PoDO2g6HYjbkPSHA1o0KIUSPZRw/G5Q7XAkLJPyPt9K2SB6fmDn+wp9/5biOeXlGvufqNH37X2xaoOZFVZ08R1YYMiBgBKFoG2Ti9J/Mf8VQiJimbT7rYxGiRnlWAEjbmc6wy0eQCek208JUmgrDUHH7q9LU9AJtBT9AaQJ6PUWu/o098kmN3z51/NF3/1PFWcfAdE6qAB0SOhsc2DHrh3QhbOSy92/DBVvlbQIIL6M8ouOp2AZiz9os9PpICKEYUiv16Pf73Pq1CkGgwGdTocXv/jFPOlJT1Kbm5sYY+j1eqyvrwMWBG8moVlGNGbLKGppJiEOrNsCThJ79qNu4Gd/4uXq8TfdJj//x6+iJRl6Yx1px+wfHhJvbTPo9cj6AwhCRGkyhLi1BnHIIEtgfxfiqNAOg3LbbPLtM6JzyWnIPoehMqRqsy6jjGHk2hjYrpqZ22pI0FZqNIrinp88HIuTqoTh1q8rhUQNJSAff0kJTlwyQ0lFDdNqcd+ugN5hSrsTEEQx5rBPerBLqEG3I4gCersDaCta11zDXYdwLjrLl3/X/wHP+1aFdCA6A35sOhoZy7m0XqKGL2LlbgbLwpBWVb6IkCQJSimiKCKKIgaDQS4tJklCt9tFKcX29ja9Xo9nPOMZfP/3f7/a3t4eKavT6Yz8Xpa6Wjwdt91uMxgMiKKI7VDxQ//oS9VXPv2J8p9/49e57d772E1jVKfN4MIuau0Muq2J4zaDtE/W71qJiT5KxEbCkAw7go1TiRyzFj10/M75h1h1yutQeCY27N9xFtaMGqvbk9TDaRavK5C8lhp4dcqLSYFGtCELhgwpMJ5pK4zWaFGsiSAXMwh66E5MtGnopwl6kBAl0O60QW3x8XMtNp/+XL78h/45PPwxioMEtjor5/iNQfI6K14jnxqaDcBL4SflgWyPC4G1riVJgjGGIAhYW1vLVb7v/d7v5eu+7utUv98HyD3Ei86XxaPOl0GtVossy3JVM45j+1sU14Sa9g2x+t3/8GP82hveLr/x6r/ighnQ2b6O/X5Glhm62cAyoiCAMITkEEkHRK2IRDLQQY7XKDK3LGdoFdiIu0rbue+YkajQzQNjVb4J/TtGIwC6x8GG+e0tNZq+1sWhOqLDsnHM40rKQzpeRTeuTzVkChKtEG3QCCqz6i+iMEqTqoAACJRGBYAWxPTpDyAx0AlAtVvsHMbsd87yJd/2Uvjm71Scuhailo3Vm7FylXlmCWqaL5RPswo/plWUn6Yp7XYbpVTOlJRSxHFMFEVkWcb+/j6PfvSj+eEf/mH1BV/wBRwcHOT4UhiGGGPycr2j5rImSZIkRFGU7/EDi2EFQYDGMOCQNUJiYn7qm79WfdUXfan851//XW574BxEHdg8ZVfVVKwFzSjCsIVoTZalNva3yYb4jNiNywBG0qEfTM6k9HCVVtqt4ONMKpekyha9HK12f2jGACfLk9QweQ6wlPtUJrgZXB3SlPI7qIyTbLUm09APnfZsQBuxEpbTcZWGNLQxLYNeAnEA8YBkAO0BtEOANe4zGwy+5Bk86gXfC8/4GkV4CtIIshaE2ulyq90tN1M8qEk+R6vyY/K0qvI9IO4llFarhYgwGAzo9Xq0Wi1e+MIX8u3f/u3KGEO3281xpmIZMDQc+PqKoPki5J+huF0mSRLCWBEEKQFCG01GyLMfeUa94md/kp9/5dvlT295J/ft3A9tB4ingvQOMXGLOGrT73cp6muZQICymI59MgcPZbYNOigYedSQe1QxiPGHcNlqpKG6d6RKaUvp/MZo6hjVlUw22s5Qz3ORBdJC2PpAvNXOu69oFELkjRShIUsy0BC3NaavODQd1DVPYO2xT+GGf/ov4ewjFPEmQgcVtBCBbmpfRTtcrZZ31WNQcRyPqHODwYAkSeh0Olx//fW85CUvUU9+8pMBa8301jsgl5zCMLR+TY5ReRV4GWpeFEU5TuYlpzAMHbOyS+IgGRBHdjCeaUEb+P+85GvVV3zp4+X/+d+/x8cffIBe3CLevoa+BGRGkaYhZhBCO8AHswfIxKDciTK6MOc1YIw40NW7JziXBudqUNW//spUVuHe71i6XHoapjvBoApU0HYt3mTfY2QsnhhIlt+3ZN9ZlGDfY8sxAYmQtMN9wRqDRz6RR3z9C4n+0XdYp0tjY4yrQNMnAR2hKwxyq6ClWvFWrf+vovzDw0OCIMjVvMPDQ1qtFl/91V/NC17wgtxC5xmdUip3uyhKR0XVTilFlmW1m4JnIV+nZ1TFzcb97oBWFFsLn4CQkQwGdOIOMfCNT3qEesZ//Rn+79/4XbnxfX9DehgidBikBhO2obUGpIxgQcogLgbM0EvKSlJaGQwK8Za9+R6olsHM66h51ZKH8QC0yf3BAoHQCN7HrmjJU96cmRoIbFgUOjG9XsSO3mb72V/Hw1/w/fD4pymiDTCxdSEQe5RUqDQDIBGI1fgG92XT1BlUJ5lUMYtluARMK2tW9wPPUAaDQS6BFEFs7w6QZRn9fp9rr72WF73oRTz3uc/NKyjGxKprX5kZLYM5VdVZLLfValugMgUiZ2mPIzL6BGi2UGxEIf/zR39Q/aNnPkt+5VV/yR3ndkk2TrOXdZ30E9h9fWnfgejaWfoEQZGJuJNmXGQCk426Bdj4unkUhJz0UMUuPofVCov5Sw9cqwqW0hfGYbG8fAzJYvG/Lgfyp5B5PyglhtDHCfc+FS3AQM/YVxLjrgcRJAmt9Q53DxTd6x7P477uxYT/6CWK7YdhdIRRLVRgjz8gtbpjoByArma31M5Dx16CWtRPKggCLl68yObmZg6Ex3GcA87ebN/tdnn2s5/Ny172MnX27Nnag0mPHflR4nGI3OPHhqgPM4M2MS/+ii9VT3zME/j5V/yZvPkjHyVe32QQxoSqRbq/j95Yx2QJ7HdhvWM3IWeJWz0BpdBirD+N+EMcyP2mplHt2KiThuoY1UiaRlVf0ZTqoX+T8lgT5Ix8cAHiLWhvBaR7GSkQBjGmm6C3r+HuFNpPeiaP+vZ/Ak/5KkV8LYTrGGDnoMv2eqdQnpOpBSJlz3HUlxok91TnVjDL/rdLgVEdHBxw9uzZPOLl+vo6+/v7iAjb29vs7u7SarV46Utfyrd+67cqgMFgQBzHx99krbDytQNKA8dIMkIyDAZNFATW8S6Bpz6szS/+5Per33nr38hv3Pha7j88RKmMNG7TPTyAVgQbG1aCUhraazBIMKIJTGotQE7Vc3Y/RDJAj/eT9yAf8RioMlgUtldU9XWdJFWmCpD8aiAXpt4C4YphhEr3ruKz2MhwD2aEW+sM+hkPJNB+2KP4xO6Ap33nDxF99TfBDY9R6E3QsVvfMs6udYDU7hF161Dgtq0EKUMVc4X9vnRP8mnWtUn3VuEn5b3AvUS0v7/P2toam5ub3HXXXTz1qU/l5S9/uXrEIx6R75eL43hsq8qxJVX4MFzRxG85EMWgnxFHgbXopPBPvv6Z6hlPe5z8t1/7bd73kbs4dc0jUaZPf5CQmQEkGXTWXMhZ7x6gEYb4lBKPebjbDZn5xHSLYkslf70rnbwfVL7NSDmJyr2WwNgJnhxAFIdkvYBu+wwX2wHZ6ev5sn/5z+CpX68It63KpwPS/oAwhDCK3PvQQOa3saPRKGXA+NNcuLQMqqzHl3X6Rd0MmuaZlrcuTavVYnd3l+3tbbrdLu12GxFhb2+P7/u+7+O7vuu7VJZlZFk2sl/usmBOMIy0osgHkA+S4AduGAX03F6+OLJZnn12W73i3/8kv/vG98tv/ulf2H2IQZuDLCU6fYrDC/sQtkGHbnuEdqu0tVyKt+YVVLymjpbFdGNWvlL6qsig00hErg5hSkBlzmDh3NMy56TpvUCyLrRObZP0Ag7Cbe4Ntjj77Gdz3cu+H05/gSJ4GEkSE6kUMIRtsMBmQJpZUFwpCB1sYPfThUPJfcUdvbSDO2dlVEflJ5WmKdvb25w7d46HPexhHBwcsLa2xr/4F/9ixH0A7D48GDKnY49DOVzAok6FdnoYyg0gbZ2LSUTQSrGOtcCkwPd/07PVV3z5s+T/+99/jo/dcw/XX/cwPnf/PbB5xnE9QUSXxqEaYh0VNPbOpvg6jY2B4oI4pQukDM4Xyr6SAfIREr+PsiRVicYEAYeEHG6e4ULrNF/yj78TvvnbFOubpGqNvomJYoWRiN7hDmvrawD00owojIbl5ycIOZ3uuDGoyxWDSpKENE25/vrrefDBB3nuc5/LD/zAD6hOp4NSasS6V5SavAf3caYSHyoMTJyHtk2XHCZEcURsI+GRpAl9Y0hVyHYc8NgzWv3Of/lpfu6VfyW/+eev4/TDH82AgIO9Q1RkY1lJLu5rh8sPrWWI5Fa7vG1l5qCoVeFG3vXcnXEVYlAFDEiUxSCDlHwMiA440G0eUjEbX/xEnvCifwKPe7qCDujrgYi1ANIkQUURnfVtDvuGVksThnDQO2S93UYrUBJh97fY+jK3GVlTXryWSyvBoCa5CBy1n9T6+joXL15EKcW/+lf/iq/6qq/KE6RpShzHI9EMPA7lNw3Hcbyy9i6DCn5646Z4BRiI1iLrn9dLUO2IKIzITEYYBBiEMyh2gX/7km9VX/0VXyU/++v/mw/f+TlOXftI9pM+mQoxSrud885BVDRIihbBYhQe+9LFFo03NHdRMNXp5nn4/Ht4kIKpLLv4+3hzM6/SlnvJdt/QsCC6JMkaQAJEt9gL1nmwfYrHfesL4ZteCBvXKoJNJNwmsef7ok1KFClrtBVotWxNmQhr7TVw2FOgGBFnpbJ1y6dGflD+48XmaapdnT/TPMypvH3Eb5j1YVKyLKPT6dDv93Ov7rW1NXZ2dlBK8dBDD/E1X/M1fMd3fId69KMfPbK516tvRTWuiEMdd+ZkpaZhkLZilIERF3CAAFRnKBFatdagyYhQRCYk1fDNjzqtvuinf5I/euNN8gdvfAuDzgaHKFjbAEI4TNFBhzWJ2N87R7CWkJoBOmwRRDGDJLUorQ7sx2AbpRy3NA7L8IxKDRtZNW6Gfk35jZE+CMRJks6CGRhbnhfojDGYTIax11y+4+7rabDdKN5B2O5GIVQuyFJqFwjVgkECYQAqAhJFj5ju+vVc3Hokj/uxfwc3PE5x6gYI1hhg43fZgwtAubEf6FE2E6vyAGKEpw/H3TFzMyj/Xby2qBWuijxD8vk9U/Ll+K0qcRznYVE+//nP8/CHP5zBYMBLX/pSnvvc56pTp07lkS5hvoB7x5HGnqB8YcojitvaEmAIMk1LwxefUvyzb/8G9WXPfrr821/4RXajFhf2LtgZs3YGM0g4HGRcc8119NJzhGh6qSE77EEQouM2SIhJEsukZMhAZVH3vgJnGZkaPh4UwchR8FWPf+wg9BKWkweWMyDKbZkKDGRgsswy30hbHzWVEcdW+klUzF7YYSc6xSP/wTdw+jt/ENauV2zdwCBYI8H2WYSb+FkKwTBM4iy9UvEGVkIzxySflm7eSV+XdxI25RnXYDBgMBhw5swZdnd32dzcpNPp8NM//dPqMY95zIikVMSc/P67q5UEjaiIDNs3WZpCGhJG8Ig1OPW4a9Vf/dJ/5j/98h/KzX9zG3rzNBf7XRIVEm1v8tDFByEUZxrU9hgaFWKyzB6JpRRaEl8ZSknBc8G7L6iJGNaIB/rw5vEWf2YhbwV1GFqqTb7JlwzoAS0DcQgmRQQSnTEIM4yBzRikB4emwwVOYR7zJL7wW14MX/H1injLRsjUAQGp25ZiT1chwZr7lD4KPjM3zRTNoHx9Hn+mefykfMA2z1h8HX7v3OnTp+l2u9x///1ce+21fNVXfRXf8z3fo3ysp4ODgzx8ipeg/BaYq50ytMPUBRUG+b6qFnbctoH/9aPfr15x89/Kb77qNSTdhGRji72Dc7DWyS19GEHFMXEY0e/uQ5KgOy0wphAdwZOzgY9YHicD6OMOm+IEjwrGJq6Oy4LsU4gKyBTOfy2zqrCXrAw2BK8zfujIWvrJYP8Q0mibi63TnH7qV7P9oh+Ex3yJorVJn4BQW7VekRIZQ6A1iAsw7YMPHmOa+Vy8KolmHgtcUzcDv/HW/+0lHx9JYHNzk93dXYIg4LrrruMHfuAHeM5znqO8ClcMw1sEvZMksTGVjrMbwRFQgFMPEAK3kzTAuBjpmo5EcJjyw//wGeornvKl/Nff+X15++13sHn6DHuDQ9TmdUgvhW4X6aVIBC0VkoWCZClZIENnPnGMSVQeudpH7fRREWzailkj1dEORARhnLldFm4GgmVESjMIQoSA0EBgMqBr+2ID20kuYmY/ALQmNkKiYh4K15FrH89jvvFF8LxvU6zdAKyT6RYCHAIRGW2/KCTYcv2hKlcKgypuEq67Nol5Leon5X97DMqHM/HRBx73uMfx4z/+42pra2vkAISiq4APLlc+n+5qJYWLF+TMxQZDSkpqEkJjCI0C3WarFZH04MnXhvzSv/mn6tff9NfyW3/5WrpZQPrQ/RCuo9stVJIyODgkbkUWE0x7BabjPUrdd36cSAUTmVWa8nkux815GmwEgtRt+HUyrMOXcj+SEHv4gdEcdkFo0WufYetpX8P2P/4u+JKnKcItiDZJg4jEqdIBEBK4/tG5IWWgbNERq41GsCgdewzKq3f+XpZlOdjtfZle/OIX843f+I2q2+0Co5EEgiDg8PCQTqdjcRYnjS0r2sBlTQJ0DSrUhLF13BRCO46d+drs7aPbm0RhTNaz4/vl3/QP1LOf/iT5b7/5u/z9QwMe2OvS0nZBuNjPGCQZtNYQ5W1nuN31w99+s3E+tPy7z4faFGZ0BWBQ4oxx2kCYJUCC6IBUa5RY8FqyBKXduQQhhL2AIDxN9Igns/H4Z9B+yQ8r1k5BaxN0RCqSuwX0uglbrch1ZZg7y/Wx7/py6MEjn6Wz+kl5huKPffLMstVqsbm5yb/+1/9aXX/99YA9tKDoYOmlrbU16x1b3F/npbCrnlFFjoGkkKoECRTabTbWgN7YctKOoR1rrtPQBZ59/ab6w3//Y/zyX7xb/uLNb+ezD9xN+9rraMdCVyDxRx8FYSnigpOEVzQ77DaXy2HqDUlyFRgUGV6R1YBqBWQmoyfQzyIOgjO0bngSp77+xfC136rYuB7ilutbGyM+M4coQrY6btVxMeskgIF2ocTzvQfHW4to7AcF4ypbFcZUJ23V+Ul5VQyGzMjjB555eGaSZRmtVgtjDN/4jd/IS17ykrGRWFTpilEuYXR/3QlA7qjg7tLWreJ4tjuy1FA7Aztg1rAgegL82xd+lXruFz9B/tcf/hEfuPPTsLlN0F5HApA+1lG0vQ5JQpolhHFIIokN5dJq2cBpUpokSg0lqfJwKkha3lmwjEHZ8TN0SxkZe87JQKlLL4gpsevD4BCyDgSRxuwZAjHWcjcAgpB+L6DX2uZi6xrOPPcfcuoF3wvXPEYRbEHUog+EykYa0CS0tQetEoeo2/p82PIACMgK8e6OL5Oa69CEedS4unxra2tcvHgREcmjWvrDM7vdbs5IfGC5IAj4qZ/6KfWUpzxl5jacUAV5T2RlvZMDNervaQC/9cpfCcQQKCFGERHyDx5/nXra//UT/NKr3yi/+5dvJApDdnspQWsdrWKSg0NIM9qb6ySmTxRFJFrApCwqxA/P75PLQ2cpkgD7Nl7gIIFkYGjHDIMQtjXn9lLaD38Ce8G1PPYF3w/P+2ZFex10iyRVud3BLe02HEqRCprzkA0ZNKm7rbisGdQy8aeqNN1ul83NTWAoQfX7/fzAAWNMHrfpK77iK/ihH/qhPAwvcNUD3YuQFGKRKwDRKOPjSvk0Vh2zUZ+8w6WA2PhQEcLpKGLHCP/mO5+vnvOlz5D/8xd/lXv6XQ77hrSV0t7YJjWGnklgf4+sFaMDRRxHDIw9GXfEA34aGF43zo671a5M1mgKBMRhbI/vTVKIrFC5byL6Nzycgxu+mEe//Gfg+icosgjiDXa7u6x1OoTOvylFSDFoQuvdnQW5G0Ee6tf7V+mMzG0y9yeRH1eaa/ma5BsF1a4DxTTF+2ma5ue+DQaD/Jw6D4L3ej2SJOEnfuIn1NOf/vRcHfSHap4wqMXIuVES4ZlU4VMRIKGsGA/SQ4yOOKXX2BvAN3zR9eopP/8f+e+//Wp550c+zn2DLrs7fXseXxzRvuYMWb+H9BOSpA/FDdl1UQ2aXucyw6CUhs012N2HtAtrAUQhFwz0gg26Zx7GY7/uBfCt36doXw+tLTIidvsJnc4pElICEuyOSg2EKALL3fw7VIVuUmBFs2G0+eMsPcGCVrwmTpzT/KS2tra499572dra4uzZs+zs7GCModPpsLOzw3Oe8xxe+tKXqkc84hForen1egRBkJ8CfEKLkK75e0jlqT50jowAIQito2faO+Bsax0MtFvwH//Zd6qbPnSn/Off+E3iKCZbX+PC7h4qikgODtlobWAQekWVRAqiW7HiSc6aNduuLgdhSpQi6wrh6etg9wGyNCPYvoaDJKb7uGfxhJf8MDz5WSpLFUGrg5AySAdstmxI3syEZDpzfmsaG/bSvUcbgaWwn9dKy5mCjMD9Y+V76Ralxq3zwHXZ96nOIa6cti7N7u4uj3zkI9Fac/78eTqdTh6e97u+67v4qZ/6qZw5+ZNSoiji8PDw+DviXQYUoImKITMUuNMe3UkhdpSrfLTblRoJQSLrXEjAWtvGrpaBEKZwTQTf/uzHqlf9yn9VX3rdKXjgHk5pSPd3YNCjtbnJ4cHhuOfSpHdad88i4hWXj/v4EIIW7O0+RHpqm961N/AZ2eSR/+glPOEn/4viyc9VJjhLtnYDhpAsTeiEISZN6O0aYgV2oYjt0VAj4ZOx4q7GxmDRxjnwazQhgYTWleGYd9Elx6DW19e577772NjYIIoizp8/z5d92ZfxPd/zPeoJT3gCMDxK3HuSd7td1tbWlnYw5tVK+Z6vguCCSkHbY2izXHXQbqUNhmqgOzVEJxodaXe6SIa0FQbD+Z2LnNo+y2Mj+JP/+BPqD9/yN/Jbr34t9wuk113Hud1zsNmxvlLl4Hd+u4pSFSLclYNBKWXIBgesXxPzia6he/rRPOO7fwS+/BsU4SZkIVqHxBmQKXSwASnEWhNvwqBniNt6aAUdwfJsLPEkMNjDwkIUyi5GGd7X4NiDUEvHoGa18O3t7XH27FkODw/RWvOiF72IF7zgBerUqVM5A/Ie4F6K6nQ6I+fDndACVGRQ/kN5YfXBhAvkJkMQWyDWy1eDrEccRFy3vc0g7bEetgmAH/yGZ6qvfc4z+amf/WX54F13E3bWId4g7btDFxCGZ+0Zt6HYMkXbIJ3f85uLlWdsoocSgiriK+OkCvwtZ7b+u/Ds1tnRWbiKx73jTlHBlePy25DLuRmBQMQyXnHPoVRucBAlKAyJhv52hzsP4RHP/Vau+64fgWufqNBbELjdkIOBi4XSKjQayDLiVjBU4Yo4k7Lu58b987wodOcbHnepqUhTZ3j5tNxybKgi1XmCh2E4sv0Ehgddrq+vc+7cOR75yEfygz/4gzznOc9RPl8RAPd/F90OTmhBqrQwe4nJlG55KaqQT+VbxNzlgE7QduqgJgxj+oOUdhxiBB67CX/4n35U/f6N75Df+uM/5qC/xf16G9a2UFmKNglBAKINg0GPcPM06SC16qTSKFGWlUmGyVJEGTRBab4JoizT875zWhX4j7j/FEMpwquu7nmMU3kDFZIRWQ9H0aBTjLL+RPlRT13QbVBhizQTu4sxM8QmsSiPyZyzakgWaAaSMpAerRAejNvcufU0nvySl3Htc79e0T4FtO3ZhIAYg2rVxCQL1QhTzd+LZ4iAJiBy+yoV2i4xRdXvGEtOnlZ+Lp5SKg8m1263cxVNRFhfX2dvb4/nP//5/OAP/qDa2NjIpaZer5d7gJ/QCmlskA6tOxPH74j/zUi0aooRH1tRSK+f0G5FpMDAwD/7lq9RX/mkJ8j/+sM/4x1377A76JIkfVqbbQZpn+Swh97YJD04gCB2EkEw3BgMaGVPOFZ+F2F5srr6tbhP4dr4s4/v6vfMbKjS2ifUOhtqkgJ6DRhAd9DHBKBCRagVgXL4jihIElCQpAa2t0jCDXYQWk/6cp730n8Hj3ySImhZkcw4vwBtXVDLm3ntT++7ViEtFp7J8qIKaVJxWTAnOKKtLn4fXK/X4/DwkLW1NdrtNkmS8KM/+qN8+Zd/udrYGMa+9szpRI07/uQRwJEFuYRrmSwjJLJwR2IIW5qnfuHD1P/50z/G7//lLfJ7r7mRwVqbw0RIjIbWBlG8ST85RGVYiUjZo3Gtz5QNGRI4DE3UcM9mfuYSNsabPUigcHqM9wtyxSjvI4Rtr3aSY4AGkxJnqQt9YiCzDDHMnVsBFdPLBoQKogDI+pgMu2ElE2traClIBnTOdDjX73EP1/LEb/thOt/wQsXpG6w6ZxyzCSK8634QlKXDApUZ8hVKS8Wgive8JOVVOR914MyZM1y4cIHHPvaxvPzlL1ePfvSj8zzer6ndblvR/MTH6ViTwoHsI+Tt25bSJGFtrW2lLQPbLevDnAg8og3/6ruep575pCfI//Vbv8VDKdw3yDCqRX9nH4IYLTYOkgmM80IYskRRHrYyucu7NlaKN2jHwMa9oozb7uKPDNdqyGit9moc08oIcIiyP9lElDXnC6A0iRGU1kSRa0ziorJHdtOu7oT0eimt9Zh79zLaX/wPePoL/xk88esUm9eAJJY55YzJ1iOei5YpZ0wF/O0KZlQzW/HKe/A81fk6+UMwNzY2ODg4IEkSXvayl/HiF79YgT2kIIqi3LfJ0wlzukyoOAxGrEh2AgUOK1HKAsciipaCSMF+N+VUJ+QbnvwI9dRf+P/xX371T+T1f/0hkqBNP4zpJwkmsEqKzuyeukwEUVb3Mgokg1zNEYMSbfFypVFiQWEtQ4DfY90Waxo6TnhYLcgfyp8DlzpOXNgShM4Zg1JCFGowCQzEZmsBoQ0yerCf0nnUdXxsP+aar/1Gzrz0xxWnHmVB794A1mJXqW2FCBgj6IJuNxn2v7KpsaNm1YEJ5TQwzqj6/T6nT5/mvvvu43GPexw/+ZM/qR772Meyu7vL1tZWvu/On1fnj4Iqn7ZyQseQyhawog+O+1ZKk2UJWoeEgSJJMrIM4nbA6U5IKob+YMDDW23+27/4HvX1X/218l9+5bc5JxmpydBBGwvIWIlJC2RaQWDRL4NGFffhOV8gQZwxa3xqS+nbU9VISwJxZ8C53W65BXBoVdSBRlJBjDO2KZAu7ALdM2vcJds85V/+G3jm8xX6DNC2DLwT2U3TSoMYJ42FBKFjkzJiPLwqaeUAT6vV4uLFi7zoRS/iJS95idra2gJga2srP+Kp2+3mUS+zLCOKInZ2dtje3l51805oURrzo2Jkpvf6h7RbbUQMSWLsYZAhyMDQSwboUHGq1WbvsM/ptRbf9pSHqWf90r/np/7br8ttd9/LnhmQqhZCZKUn46QbbTe7ZjoaNkR5cz+AHoZ0qWBSvqleagpGmKuyTCOwESz7PqSSY1JKMmKvBmaZc1hVdjbFEaY34CKQPvwLOXzUM3nSD/6/4fonKaQNUdu2J3GdFrZy/TLysbJcUwaZEIVXN4da+bl47XY7P4/Oh7/w/kwea/J+TT7mOMD29vYJSH45UO380QiGVsviTyhFFAVIZpAsQwchnbANCrp7+2xtWMfbtSDgCzT85r97ufqjW/5WfvkP/pyusiGJBypwVjxjzfeAqMBxGhdgTxu00XkgSlEl5iQq9//0eJM9Kt5vEQlzC6XSIWlgg8rl+9pwzMzVHzgul4ohMYoWbe7XHczDHsPDv+Yfc913/B+K1mkkOkWCdpEgsOdEJRm0g2FQRq+pOsmpzJws7yw6tV7Z+BM0jAcVBAFBENDv9/OAcGEY5tKOiDAYDGi326RpSpIktFotnvKUp/AzP/MzymNWxdhSnhFN8ms6YU6XCanhx6M3loaAuT+PWAUapYPhLDTQ6WyAGIJAgBRld5bxw897hvqHz3yG/Nxv/ylv/sCHCNe3yBRoUcRBm16/B5FxMYuN3ZA8ANPvQxCRaXukaMbwsCutFN5ZwZ4QVwir69wjvBQWEGBEk5/6lFohShcsf6kCnSTEbc3ArPEZOc3ms/4h13/bD8ATn66IIwg1ij4RYFSEoC3WHwS5Glykolrn74zxoTLjvUKpEQfodrukacr6+jpZluXhULx6lqbpyNYTpRQve9nL+KZv+iZVZEondIVRyUlwyJx0kSWAO512GK7F3RIzZoXSCCEpISEx8CVbqJ//ie/mf7/lCfLbf/E6zvVSsrBN7+IhrY1N+tnATnSTwUEPVAu9tQFosv1djDIjE145SUjjGqucC0HRa9XrWCZEJ5q2gWxgJ4veAHogu6BaELRhELV4qB+w17qOxz//n8A3fK9i/REQrSEhGFIC+igETTg8rKDCGG7GL13V1IhBbW9vk2UZFy5c4OzZs4RhyM7OTu4K4FU0EeFRj3oUP/7jP64e/ehHA8MDMk+Y1BVKqjCf3bdzpSxcqXEW1DDch2etY8VfMUOM6Ee+4Rnq6U94jPzaq17Dez/6CaLWFhlCiCI9PICzmzZxIvZcvr1dglaISYcwWV71CEpeYAllySWDdgLKhIRZamMdD4AIVAwEmq4ID5kW6aO/jMe/6J/D075OYdZgbQ0CL5xp11KDIiVAkRJi1NCpe6TeUjeN0tUhOXlqLEFFUZQfMX5wcIDWms3NTQ4ODmyExCTh+c9/Pj/yIz+igJEDMmc5A++ELi8qMycoTqrC/jnHsMRto8kT6oIUZbfYFbaXGRj0WIvbiFF89WNOq6f+9A/xa6+7VX77L26kLxGdKICNdfbuvRfOnkVHMebCefQ115Lt7draVVkyKXDVfPuObYNop945H4T1IIB9x+ViDYEiyzQZIV1adLfPsPWEp3H6u/8VXP8ldh9d3MJkgo5UzqbVGCuqZjVesDqZFZYaMaiDgwPx8b13d3fZ2NjIoxBsbW3R6XT4qZ/6KfXMZz4TIA+LcuLLdPXQ5JXfW6dGv8EMoZQizyowlCiOgIwNAgYJBJHix779K9VTn/rF8j9/6w/49F330DsM2Dp1hn5iyMwAtb5OdrBH3I7hoJuHxR22pbjDNnAi1XAv3rDtCVm/ZzNHLdARe0bTX9tAWqc4H23y+Oe/iOAbv10RrVmAPbbWPwkVB/2U9ZYFxm11Qf7sRcfQIVlmrZRn2iVA/CqkqQzKGMOpU6fUYDCQ/f191tbWEBHOnz/P+vo6T3va0/ixH/sx5V0Ciu4Bk6xwJ5LTlUcKJjoZlU+WcufGWGxKD28U0CBAsX9xh432BnGrhca6Tz7vMWfUk/7Tj/M7f/xWeet7P8Dn93fp93u0OxuEa232d3YJrzkz0gR/QOjIyCucrjsShUQBpAQh0AnoPdSnu6YIHvV47trtsfnwx/HEl/9ruP6LFRLZo8m1ZU4Zhr3+gI1Wu6Bf6txh1TqJp64B5b10ZvT7KqdGDMofcrm5uUmr1eLee+/l0Y9+ND/wAz/A137t16rBYADA/v4+29vbiEges+mErmxSRdSoyJzKjEqVPgXyG46VcttMcEKNaJJuwsbWWVDQyzLQwoaGLYRNFfFvvu/r1TOf9uXyn/7XL0BmUDri/EMPcvYLv5Bz995Dp4R7w3Avnq1U5+C+Z1BB7j2ekOkB9DLaj72BnZ7m9gs7fMVLfoD2P/4uRXAawrMYCdERCIbDwQFJlrLZ2cRkqY1k4PXG3MnTFLi5GWfmIx1cLTmVfWKvVJrKoMIw5PDwMP/e29vLj3x6zGMeg4jkIVQ2NjZyL/AyczrBnK5wqptkniHJ6KWq5FKMUeucKyN3VFgioHRAqO3RSirtsRlukqL5xqdsqqf/6n/gf/7ma+VNt7yLh61vcOG+z7EeagJ3EIdnPpoA7c5f8ozJYz5W7TK4IMagNXutM1zYFD5/vsfWk5/FP/zeH4IvepoFwttnSLMQ42ZRYoRW3KGNYLKUMIjHOYmYgnSkhl9epRv5ntrrVzw1wqA2NjZy1e27v/u7+c7v/E4VBEHOjIpU/u3phDFdqeRBZvfTz/by61aj36Nq3LCsomQD5BEfw5E0kXV0BLaAlsC2hp9/+QvUG5/2ZPnlP/ojPv7gOTbOnOLw0LoaGKArsOFrd7CTPzSi7bjVcFtcBlGLz4RfyO7Wo/iCr3smN3zLt8LDvkCh1hgMYiI6BMEQT4p0gGew1r9PVzDoOsaja76r6WqZTVMZVJZlnDt3Tr7ma76Gb/mWb8mB8CrmdEInNMvMqU6qK2+Og+4ebDaE/YQ4bpEJfOtzHq+e/CX/gV/4/d+Xv3zrWzh16hQtB1Ib7M6U0GZ08SYdCubFKbcvzopULdIbvohnf/3XwXOermjFiAoxwTZBp0O3b+i0qg0Ckx+2xu0iZ14n0pMnNS3muDGGJEnodrucOnWKJEkIguDEQndCx4AMB9191jsb9LspcStmoKEH3DuAd7zvQ/LqV7+a/9cP/zBf+eRHqw2stAWAMvTNAKVjNJrQa5dO1xvQJ6YLD5y3ZsX1COIIdItMddBY1fOEj6yWpjIoGLXGFUPx+m0vJ3RCl4J81G1BCAmQTNM3QGSZVArc/unPyxc+/OHqTAva2u6jS5IeOrbjWeNCGRc2PacK+hja9AkGfSt2+agGxBhaKNWyVskTDrVSasSgvKOm35cHk10ITuiEjoIkP3nG2EgAqRN/AuiLDS8c272/hG4PHQpS04MgQKEIROeAvCjIlGVsAyDEEO5dIF5rOVxKQRbamCoCaQbhyfq8Upqqpw0GAzqdTn7wgd+Hd0IndBxokA1QaLq9br7BLTns0lKwGUJ22INeYi1zAoghDOwxAmkysNEsnWqXqVEXTkETbJ7GENIbCEgEKsrTByfr88ppqgSVZRkiQpqmtNvt/LoxJj+x5YRO6FKQxbUN3f4BG60Ow8MNoHuwQ2dzc5jYaDCGLOsTtFvO3wkrLilNFthQxN7glsfUTDPaYYB2p6OQ2PQSOJ8pdaLlrZIaqXhAHqmg2+0Sx7EN6D7HOXgndELLJGtNDskP+zSp/TsMyW37aQo6sJ7ezkKWpoYw0DYKgoJUB6TOq91HXXDeUGRAKEJLqdyrNHUbgSNOGNQqqTGDOqETOnY0FqYA5wRZtU3Eu5SXXcv7oGCgAgwhIYxY9FInKYW4QHXW25OBHjKok7OtV0cn+tkJXd7keZFz6MxGYNXycQPa7rGTcr5hlIXAW/TcpjxnE7JMSGxa6+dp8r2EJ7Q6OmFQJ3T5Ukn499tZPNPw/5flqSGzwe3FM05Nc99+75xmeFR6HnUT/NHio9GrTmgVdMKgTuiKoeIx7Fbw0fmWmqyQJoDibmGMCzFsyRS2p9R5fPsvOWFNK6YTBnVCly8VoiNkaghJ+SicPmCAjzHu5Z1MQZCHd9F5URrjDkswOVIuLtpBztCcBhhh5a0TgHy1dMKgTujyphwTgqLEpAoqmVLWgDeMAGMK6t1oALkMk5/UgjIkTpELYbhPDhxedUKrphMGdUKXL3mLnRpCRBrtjpFiJCR6oP0lt0U4F33cqcNWdHJqovHBEkjdLVEWj8phr6K4dkIro5PuPaHLmxT5MVKeI+Wx4AofVbhvLxUQ9pK7gvGFqNEj0il8Y/z+vZMptEr6/wN4GXLMvj3gqwAAAABJRU5ErkJggg==" style={{ height:48, opacity:0.85 }} />
                  </div>
                  {alerts.length > 0 && (
                    <div className="alert-bar">
                      <div className="alert-hd">⚠ ALERTAS DE ENTREGA</div>
                      {alerts.map(a => {
                        const d = daysLeft(a.deliveryDate);
                        return (
                          <div className="alert-row" key={a.id}>
                            <div className="adot" />
                            <span><strong>{a.ocNumber || a.id}</strong> · {a.client} · {d === 0 ? "vence HOY" : d < 0 ? "vencida hace " + Math.abs(d) + "d" : "vence en " + d + " dias"}</span>
                            <button className="btn btn-rose btn-sm" style={{ marginLeft:"auto" }} onClick={() => setShowDetail(a)}>Ver →</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="kpis" style={{ marginBottom:18, gridTemplateColumns:"repeat(5,1fr)" }}>
                    {[
                      { n:enrichedNoVD.length, lbl:"Total OCs", c:"var(--white)" },
                      { n:enrichedNoVD.filter(o => ocStatus(o.items,o.dispatches,o)==="open").length, lbl:"Abiertas", c:"var(--sky)" },
                      { n:enrichedNoVD.filter(o => ocStatus(o.items,o.dispatches,o)==="partial").length, lbl:"Parciales", c:"var(--gold)" },
                      { n:enrichedNoVD.filter(o => ocStatus(o.items,o.dispatches,o)==="toinvoice").length, lbl:"Por Facturar", c:"var(--rose)" },
                      { n:enrichedNoVD.filter(o => ocStatus(o.items,o.dispatches,o)==="closed").length, lbl:"Cerradas", c:"var(--lime)" },
                    ].map(({n,lbl,c}) => (
                      <div key={lbl} className="kpi"><div className="kpi-bar" style={{ background:c }} /><div className="kpi-n" style={{ color:c }}>{n}</div><div className="kpi-l">{lbl}</div></div>
                    ))}
                  </div>
                  <div className="slbl">Todas las Ordenes</div>
                  {loading ? <div className="pgload"><div className="spin" /> Cargando...</div> :
                    enrichedNoVD.length === 0 ? <div className="empty"><div className="empty-ico">◈</div><p>Sin ordenes aun.<br />Ingresa tu API Key e importa una OC desde PDF.</p></div> :
                    <div className="tbl-card" style={{ maxHeight:520, overflowY:"auto", scrollbarWidth:"thin", scrollbarColor:"var(--line2) transparent" }}>
                      <table>
                        <thead style={{ position:"sticky", top:0, zIndex:1, background:"var(--ink3)" }}><tr><SortTh label="OC ID" col="ocNumber" state={dashSort} setState={setDashSort} /><SortTh label="CLIENTE" col="client" state={dashSort} setState={setDashSort} /><SortTh label="ENTREGA" col="deliveryDate" state={dashSort} setState={setDashSort} /><SortTh label="AVANCE" col="pct" state={dashSort} setState={setDashSort} /><SortTh label="ESTADO" col="status" state={dashSort} setState={setDashSort} /><th /></tr></thead>
                        <tbody>{applySort(enrichedNoVD, dashSort).map(oc => {
                          const s = ocStatus(oc.items, oc.dispatches, oc);
                          const tot = oc.items.reduce((a, i) => a + Number(i.qty), 0);
                          const dis = oc.items.reduce((a, i) => a + Number(i.dispatched || 0), 0);
                          const pct = tot > 0 ? Math.min(100, Math.round(dis / tot * 100)) : 0;
                          const d = daysLeft(oc.deliveryDate);
                          const lastFacDate = (s === "closed" || s === "toinvoice") ? (() => { const facs = (oc.dispatches || []).filter(x => (x.docType === "factura" && x.date) || (x.docType === "guia" && x.invoiceDate)).map(x => x.docType === "factura" ? x.date : x.invoiceDate).sort((a,b) => b.localeCompare(a)); return facs.length ? facs[0] : null; })() : null;
                          const entregaDisplay = lastFacDate || oc.deliveryDate || "—";
                          return (
                            <tr key={oc.id}>
                              <td style={{ color:"var(--gold)", fontWeight:600 }}>{oc.ocNumber || oc.id}</td>
                              <td style={{ fontWeight:500 }}>{oc.client}</td>
                              <td style={{ color: s === "closed" ? "var(--fog2)" : d !== null && d <= 0 ? "var(--rose)" : d !== null && d <= 5 ? "var(--gold)" : "var(--fog2)" }}>{entregaDisplay}</td>
                              <td style={{ minWidth:120 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                  <div className="pbar-wrap" style={{ flex:1 }}><div className="pbar" style={{ width:pct + "%", background:pc(pct) }} /></div>
                                  <span style={{ fontSize:10, color:"var(--fog)", width:28 }}>{pct}%</span>
                                </div>
                              </td>
                              <td><span className={"badge " + bCls(s)}><Dot c={s === "open" ? "var(--sky)" : s === "partial" ? "var(--gold)" : s === "toinvoice" ? "var(--rose)" : "var(--lime)"} />{bLbl(s)}</span></td>
                              <td><button className="btn btn-outline btn-sm" onClick={() => setShowDetail(oc)}>Ver</button></td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  }
                  <div className="dash-copyright">© {new Date().getFullYear()} TOTAL METAL LTDA. · TODOS LOS DERECHOS RESERVADOS</div>
                </>
              )}

              {view === "orders" && (
                <>
                  <div className="ph">
                    <div><div className="pt">Ordenes <em>de Compra</em></div><div className="pm">{filtered.length} ORDENES</div></div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn btn-gold" onClick={() => setShowImport(true)}>+ Importar OC</button>
                      <button className="btn btn-outline" onClick={() => setShowVentaDirecta(true)}>+ Venta Directa</button>
                      <button className="btn btn-outline" onClick={() => {
                        const rows = [];
                        enriched.forEach(oc => {
                          const ocTotal = oc.items ? oc.items.reduce((s, it) => s + (Number(it.qty)||0) * (Number(it.unitPrice)||0), 0) : 0;
                          const dispatched = (oc.dispatches || []);
                          if (dispatched.length === 0) {
                            rows.push({
                              "Cliente": oc.client || "",
                              "RUT": oc.rut || "",
                              "N° OC": oc.ocNumber || oc.id,
                              "Fecha OC": oc.date || "",
                              "N° GD": "",
                              "N° Factura": "",
                              "Total OC": ocTotal,
                              "Total Despachado": 0,
                              "Remanente": ocTotal,
                              "Estado": ocStatus(oc.items, oc.dispatches, oc)
                            });
                          } else {
                            dispatched.forEach(d => {
                              const isGD = d.docType === "guia";
                              const isFac = d.docType === "factura";
                              const dispTotal = d.netTotal || d.total || d.items?.reduce((s,it) => s+(Number(it.qty)||0)*(Number(it.unitPrice)||0),0) || 0;
                              const totalDespachado = dispatched.reduce((s, x) => s + (x.netTotal || x.total || 0), 0);
                              rows.push({
                                "Cliente": oc.client || "",
                                "RUT": oc.rut || "",
                                "N° OC": oc.ocNumber || oc.id,
                                "Fecha OC": oc.date || "",
                                "N° GD": isGD ? (d.number || "") : (d.invoiceNumber ? "" : ""),
                                "N° Factura": isFac ? (d.number || "") : (d.invoiceNumber || ""),
                                "Total OC": ocTotal,
                                "Total Despachado": dispTotal,
                                "Remanente": ocTotal - totalDespachado,
                                "Estado": ocStatus(oc.items, oc.dispatches, oc)
                              });
                            });
                          }
                        });
                        const ws = XLSX.utils.json_to_sheet(rows);
                        ws["!cols"] = [
                          {wch:30},{wch:14},{wch:15},{wch:12},{wch:12},{wch:12},{wch:15},{wch:15},{wch:15},{wch:12}
                        ];
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Despachos");
                        XLSX.writeFile(wb, "Despachos_OC_" + today() + ".xlsx");
                      }}>↓ Excel</button>
                    </div>
                  </div>
                  <div className="toolbar">
                    <input className="srch" placeholder="Buscar por ID, cliente, N° OC..." value={search} onChange={e => setSearch(e.target.value)} />
                    <select className="fsel" value={fst} onChange={e => setFst(e.target.value)}>
                      <option value="all">Todos</option>
                      <option value="open">Abiertos</option>
                      <option value="partial">Parciales</option>
                      <option value="toinvoice">Por Facturar</option>
                      <option value="closed">Cerrados</option>
                    </select>
                    {(() => {
                      const months = [...new Set(enriched.map(o => (o.date||"").slice(0,7)).filter(Boolean))].sort((a,b) => b.localeCompare(a));
                      const years = [...new Set(months.map(m => m.slice(0,4)))];
                      const monthName = m => { const [y,mo] = m.split("-"); return ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][parseInt(mo)] + " " + y; };
                      return (
                        <select value={ordersMonthFilter} onChange={e => setOrdersMonthFilter(e.target.value)} className="fsel" style={{ fontSize:11 }}>
                          <option value="all">Todos los períodos</option>
                          {years.map(y => (
                            <optgroup key={y} label={"── " + y + " ──"}>
                              {months.filter(m => m.startsWith(y)).map(m => <option key={m} value={m}>{monthName(m)}</option>)}
                              <option value={y}>{y} (año completo)</option>
                            </optgroup>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                  {loading ? <div className="pgload"><div className="spin" /> Cargando...</div> :
                    filtered.length === 0 ? <div className="empty"><div className="empty-ico">◫</div><p>No hay ordenes.<br />Importa una OC desde PDF para comenzar.</p></div> :
                    <div className="tbl-card tbl-scroll">
                      <table>
                        <thead><tr><SortTh label="N° OC" col="ocNumber" state={ordSort} setState={setOrdSort} /><SortTh label="CLIENTE" col="client" state={ordSort} setState={setOrdSort} /><SortTh label="FECHA OC" col="date" state={ordSort} setState={setOrdSort} /><th>ENTREGA</th><SortTh label="ÚLT. ACTIVIDAD" col="lastActivity" state={ordSort} setState={setOrdSort} /><th>DOCS</th><SortTh label="TOTAL" col="monto" state={ordSort} setState={setOrdSort} /><SortTh label="PENDIENTE" col="pendiente" state={ordSort} setState={setOrdSort} /><SortTh label="AVANCE" col="pct" state={ordSort} setState={setOrdSort} /><th>ESTADO</th><th /></tr></thead>
                        <tbody>{applySort(filtered, ordSort).map(oc => {
                          const s = ocStatus(oc.items, oc.dispatches, oc);
                          const tot = oc.items.reduce((a, i) => a + Number(i.qty), 0);
                          const dis = oc.items.reduce((a, i) => a + Number(i.dispatched || 0), 0);
                          const pct = tot > 0 ? Math.min(100, Math.round(dis / tot * 100)) : 0;
                          const d = daysLeft(oc.deliveryDate);
                          const disp = oc.dispatches || [];
                          const pending = disp.filter(x => x.docType === "guia" && !x.invoiceNumber).length;
                          const nFac = disp.filter(x => x.docType === "factura").length + disp.filter(x => x.docType === "guia" && x.invoiceNumber).length;
                          const nGuia = disp.filter(x => x.docType === "guia").length;
                          const lastFacDate = (s === "closed" || s === "toinvoice") ? (() => { const facs = disp.filter(x => (x.docType === "factura" && x.date) || (x.docType === "guia" && x.invoiceDate)).map(x => x.docType === "factura" ? x.date : x.invoiceDate).sort((a,b) => b.localeCompare(a)); return facs.length ? facs[0] : null; })() : null;
                          const entregaDisplay = lastFacDate || oc.deliveryDate || "—";
                          return (
                            <tr key={oc.id}>
                              <td style={{ color:"var(--gold)", fontWeight:600 }}>{oc.ocNumber || oc.id}</td>
                              <td style={{ fontWeight:500 }}>{oc.client}</td>
                              <td style={{ color:"var(--fog)" }}>{oc.date}</td>
                              <td style={{ color: s === "closed" ? "var(--fog2)" : d !== null && d <= 0 ? "var(--rose)" : d !== null && d <= 5 ? "var(--gold)" : "var(--fog2)" }}>{entregaDisplay}</td>
                              <td style={{ color:"var(--teal)", fontSize:10 }}>
                                {(() => {
                                  const dates = disp.flatMap(x => [x.date, x.invoiceDate]).filter(Boolean).sort((a,b) => b.localeCompare(a));
                                  return dates[0] || "—";
                                })()}
                              </td>
                              <td>
                                {nFac > 0 && <span style={{ color:"var(--teal)", fontSize:10, fontWeight:600 }}>{nFac}F</span>}
                                {nFac > 0 && nGuia > 0 && <span style={{ color:"var(--fog)" }}> · </span>}
                                {nGuia > 0 && <span style={{ color: pending > 0 && s !== "closed" ? "var(--rose)" : "var(--fog2)", fontSize:10, fontWeight:600 }}>{nGuia}GD{pending > 0 && s !== "closed" ? <span style={{ color:"var(--gold)", fontWeight:400 }}> ({pending}✗)</span> : null}</span>}
                                {nFac === 0 && nGuia === 0 && <span style={{ color:"var(--fog)", fontSize:10 }}>—</span>}
                              </td>
                              <td style={{ color:"var(--gold)", fontWeight:600, fontSize:12, whiteSpace:"nowrap" }}>{fmtCLP(oc.items.reduce((a,i) => a + Number(i.qty)*Number(i.unitPrice), 0))}</td>
                              <td style={{ color:"var(--rose)", fontWeight:600, fontSize:12, whiteSpace:"nowrap" }}>{fmtCLP(oc._closedByMonto ? 0 : oc.items.reduce((a,i) => a + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice), 0))}</td>
                              <td style={{ minWidth:100 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                  <div className="pbar-wrap" style={{ flex:1 }}><div className="pbar" style={{ width:pct + "%", background:pc(pct) }} /></div>
                                  <span style={{ fontSize:10, color:"var(--fog)", width:28 }}>{pct}%</span>
                                </div>
                              </td>
                              <td><span className={"badge " + bCls(s)}><Dot c={s === "open" ? "var(--sky)" : s === "partial" ? "var(--gold)" : s === "toinvoice" ? "var(--rose)" : "var(--lime)"} />{bLbl(s)}</span></td>
                              <td>
                                <div style={{ display:"flex", gap:5 }}>
                                  <button className="btn btn-outline btn-sm" onClick={() => setShowDetail(oc)}>Ver</button>
                                  <button className="btn btn-sky btn-sm" onClick={() => setShowDispatch(oc)} >+Doc.</button>
                                  {s !== "closed" && <button className="btn btn-outline btn-sm" style={{ color:"var(--gold)" }} onClick={() => setShowGestion(oc)}>Gestión</button>}
                                  {isAdmin ? <button className="btn btn-rose btn-sm" onClick={() => handleDelOC(oc.id)}>✕</button> : <button className="btn btn-outline btn-sm" style={{ color:"var(--fog)", fontSize:9 }} onClick={() => setConfirmDel({ type:"request", label: oc.ocNumber || oc.id })}>✕</button>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  }
                </>
              )}
              {view === "clients" && (
                <>
                  <div className="ph">
                    <div><div className="pt">Reporte <em>por Cliente</em></div><div className="pm">MONTOS PENDIENTES DE DESPACHO</div></div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {(() => {
                        const months = [...new Set(enriched.map(o => (o.date||"").slice(0,7)).filter(Boolean))].sort((a,b) => b.localeCompare(a));
                        const years = [...new Set(months.map(m => m.slice(0,4)))];
                        const monthName = m => { const [y,mo] = m.split("-"); return ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][parseInt(mo)] + " " + y; };
                        return (
                          <select value={clientMonthFilter} onChange={e => setClientMonthFilter(e.target.value)} className="fsel" style={{ fontSize:11 }}>
                            <option value="all">Todos los períodos</option>
                            {years.map(y => (
                              <optgroup key={y} label={"── " + y + " ──"}>
                                {months.filter(m => m.startsWith(y)).map(m => <option key={m} value={m}>{monthName(m)}</option>)}
                                <option value={y}>{y} (año completo)</option>
                              </optgroup>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                  </div>
                  {enriched.length === 0 && <div className="empty"><div className="empty-ico">◉</div><p>No hay ordenes aun.</p></div>}
                  {enriched.length > 0 && (() => {
                    const filtered = clientMonthFilter === "all" ? enriched : enriched.filter(o => (o.date||"").startsWith(clientMonthFilter));
                    // Agrupar por cliente
                    const byClient = filtered.reduce((acc, oc) => {
                      const key = oc.client;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(oc);
                      return acc;
                    }, {});
                    // Ordenar por monto pendiente desc
                    const rows = Object.entries(byClient).filter(([client, ocs]) => ocs.some(o => !o._ventaDirecta)).map(([client, ocs]) => {
                      const totalOC   = ocs.reduce((s, o) => s + o.items.reduce((a, i) => a + Number(i.qty) * Number(i.unitPrice), 0), 0);
                      const totalDis  = ocs.reduce((s, o) => { const tot = o.items.reduce((a, i) => a + Number(i.qty) * Number(i.unitPrice), 0); const dis = o._closedByMonto ? tot : o.items.reduce((a, i) => a + Number(i.dispatched || 0) * Number(i.unitPrice), 0); return s + dis; }, 0);
                      const pending   = totalOC - totalDis;
                      const openOcs   = ocs.filter(o => ocStatus(o.items, o.dispatches, o) !== "closed").length;
                      return { client, ocs, totalOC, totalDis, pending, openOcs };
                    }).sort((a, b) => b.pending - a.pending);

                    const grandTotal   = rows.reduce((s, r) => s + r.totalOC, 0);
                    const grandDis     = rows.reduce((s, r) => s + r.totalDis, 0);
                    const grandPending = rows.reduce((s, r) => s + r.pending, 0);

                    return (
                      <>
                        <div className="kpis" style={{ marginBottom:22 }}>
                          {[
                            { n: fmtCLP(grandTotal),   lbl: "Total OCs",    c: "var(--gold)" },
                            { n: fmtCLP(grandDis),     lbl: "Despachado",   c: "var(--lime)" },
                            { n: fmtCLP(grandPending), lbl: "Pendiente",    c: "var(--rose)" },
                            { n: rows.length,           lbl: "Clientes",     c: "var(--sky)"  },
                          ].map(({ n, lbl, c }) => (
                            <div key={lbl} className="kpi"><div className="kpi-bar" style={{ background:c }} /><div className="kpi-lbl">{lbl.toUpperCase()}</div><div className="kpi-n" style={{ color:c }}>{n}</div></div>
                          ))}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, marginBottom:0 }}>
                        {rows.map(({ client, ocs, totalOC, totalDis, pending, openOcs }) => {
                          const pct = totalOC > 0 ? Math.min(100, Math.round(totalDis / totalOC * 100)) : 0;
                          return (
                            <div className="cli-card" key={client}>
                              <div className="cli-hd">
                                <div>
                                  <div className="cli-name">{client}</div>
                                  <div className="cli-ocs">{ocs.length} OC{ocs.length !== 1 ? "s" : ""} · {openOcs} abierta{openOcs !== 1 ? "s" : ""}</div>
                                </div>
                                <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, maxWidth:260 }}>
                                  <div className="pbar-wrap" style={{ flex:1, height:5 }}><div className="pbar" style={{ width:pct + "%", background:pc(pct) }} /></div>
                                  <span style={{ fontSize:11, color:pc(pct), width:32 }}>{pct}%</span>
                                </div>
                              </div>
                              <div className="cli-totals">
                                <div className="cli-total"><label>MONTO TOTAL OCs</label><p style={{ color:"var(--gold)", fontWeight:600 }}>{fmtCLP(totalOC)}</p></div>
                                <div className="cli-total"><label>DESPACHADO</label><p style={{ color:"var(--lime)", fontWeight:600 }}>{fmtCLP(totalDis)}</p></div>
                                <div className="cli-total"><label>PENDIENTE DESPACHO</label><p style={{ color: pending > 0 ? "var(--rose)" : "var(--fog2)", fontWeight:600 }}>{fmtCLP(pending)}</p></div>
                                <div className="cli-total"><label>AVANCE</label><p style={{ color:pc(pct) }}>{pct}%</p></div>
                              </div>
                              <div className="cli-oc-list">
                                {(() => {
                                  const MAX = 5;
                                  const isExpanded = expandedClients.has(client);
                                  const sorted = [...ocs].sort((a, b) => {
                                    const remA = a._closedByMonto ? 0 : a.items.reduce((s,i) => s + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice), 0);
                                    const remB = b._closedByMonto ? 0 : b.items.reduce((s,i) => s + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice), 0);
                                    return remB - remA;
                                  });
                                  const visible = isExpanded ? sorted : sorted.slice(0, MAX);
                                  const hidden = sorted.length - MAX;
                                  return (<>
                                    {visible.map(oc => {
                                      const tot = oc.items.reduce((a, i) => a + Number(i.qty) * Number(i.unitPrice), 0);
                                      const dis = oc._closedByMonto ? tot : oc.items.reduce((a, i) => a + Number(i.dispatched || 0) * Number(i.unitPrice), 0);
                                      const rem = tot - dis;
                                      const s   = ocStatus(oc.items, oc.dispatches, oc);
                                      return (
                                        <div className="cli-oc-row" key={oc.id}>
                                          <span style={{ color:"var(--gold)", fontWeight:600, width:120 }}>{oc.ocNumber || oc.id}</span>
                                          <span style={{ color:"var(--fog)", width:100, textAlign:"right" }}>{fmtCLP(tot)}</span>
                                          <span style={{ color:"var(--lime)", width:100, textAlign:"right" }}>{fmtCLP(dis)}</span>
                                          <span style={{ color: rem > 0 ? "var(--rose)" : "var(--fog2)", width:100, textAlign:"right", fontWeight: rem > 0 ? 600 : 400 }}>{fmtCLP(rem)}</span>
                                          <span className={"badge " + bCls(s)} style={{ marginLeft:"auto" }}><Dot c={s === "open" ? "var(--sky)" : s === "partial" ? "var(--gold)" : s === "toinvoice" ? "var(--rose)" : "var(--lime)"} />{bLbl(s)}</span>
                                          <button className="btn btn-outline btn-sm" style={{ marginLeft:8 }} onClick={() => setShowDetail(oc)}>Ver</button>
                                        </div>
                                      );
                                    })}
                                    {sorted.length > MAX && (
                                      <div style={{ display:"flex", justifyContent:"center", padding:"8px 0", borderTop:"1px solid var(--line)" }}>
                                        <button onClick={() => setExpandedClients(prev => { const n = new Set(prev); isExpanded ? n.delete(client) : n.add(client); return n; })}
                                          style={{ background:"none", border:"none", color:"var(--fog2)", fontSize:10, fontFamily:"var(--fM)", letterSpacing:1, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                                          {isExpanded ? <>▲ Mostrar menos</> : <>{hidden} OC{hidden !== 1 ? "s" : ""} más ▼</>}
                                        </button>
                                      </div>
                                    )}
                                  </>);
                                })()}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </>
                    );
                  })()}
                </>
              )}

              {view === "monthly" && (() => {
                // Recolectar todas las facturas de todos los despachos
                const allFacs = [];

                // Índice de GDs por invoiceNumber
                const gdByInvoicePF = {};
                enriched.forEach(oc => {
                  (oc.dispatches || []).forEach(d => {
                    if (d.docType === "guia" && d.invoiceNumber) {
                      const key = String(d.invoiceNumber).trim();
                      if (!gdByInvoicePF[key]) gdByInvoicePF[key] = [];
                      gdByInvoicePF[key].push(d);
                    }
                  });
                });

                const directFacNumsPF = new Set();

                enriched.forEach(oc => {
                  (oc.dispatches || []).forEach(d => {
                    if (d.docType === "factura" && d.date && d.number) {
                      let total = Number(d.total || 0);
                      let neto = Number(d.netTotal || 0);
                      if (!total && neto) total = Math.round(neto * 1.19);
                      // Fallback 1: calcular neto desde items del dispatch (también rescata precio del campo unit)
                      if (!neto && d.items && d.items.length) {
                        neto = (d.items || []).reduce((s, it) => {
                          const rawUnit = String(it.unit || "");
                          const p = Number(it.unitPrice || 0) || (Number(rawUnit.replace(/[$.,]/g,"")) > 0 ? Number(rawUnit.replace(/[$.,]/g,"")) : 0);
                          return s + (Number(it.qty)||0) * p;
                        }, 0);
                        if (neto && !total) total = Math.round(neto * 1.19);
                      }
                      // Fallback 2: buscar GD vinculada por número de factura
                      if (!total) {
                        const linkedGDs = gdByInvoicePF[String(d.number).trim()] || [];
                        const gdNeto = linkedGDs.reduce((s, g) => s + Number(g.netTotal || 0), 0);
                        const gdTotal = linkedGDs.reduce((s, g) => s + Number(g.total || 0), 0);
                        neto = gdNeto || neto;
                        total = gdTotal || Math.round(gdNeto * 1.19);
                      }
                      // Fallback 3: buscar GD vinculada por gdNumber (campo de la factura)
                      if (!total && d.gdNumber) {
                        const normGDpf = s => String(s).replace(/[\s.]/g, "");
                        const gdRef = normGDpf(d.gdNumber);
                        const linkedGD = enriched.flatMap(o => o.dispatches || []).find(g => g.docType === "guia" && normGDpf(g.number || "") === gdRef);
                        if (linkedGD) {
                          neto = Number(linkedGD.netTotal || 0);
                          total = Number(linkedGD.total || 0) || Math.round(neto * 1.19);
                        }
                      }
                      // Incluir siempre aunque total sea $0 (factura válida sin monto cargado aún)
                      directFacNumsPF.add(String(d.number).trim());
                      allFacs.push({ ...d, total, neto, client: oc.client, ocNumber: oc.ocNumber || oc.id, ocId: oc.id });
                    }
                  });
                });

                // GD con factura vinculada — agrupar por invoiceNumber para evitar duplicados
                // cuando múltiples GDs comparten la misma factura
                const gdFacMap = {}; // invoiceNumber -> { entry, gdNumbers[] }
                enriched.forEach(oc => {
                  (oc.dispatches || []).forEach(d => {
                    if (d.docType === "guia" && d.invoiceNumber && d.invoiceDate) {
                      if (directFacNumsPF.has(String(d.invoiceNumber).trim())) return;
                      const key = String(d.invoiceNumber).trim();
                      const calcNetoGD = (disp) => {
                        let n = Number(disp.netTotal || 0);
                        let c = Number(disp.total || 0) || Math.round(n * 1.19);
                        // Fallback 1: invoiceItems (ítems de la factura Bsale vinculada)
                        if (!n && disp.invoiceItems && disp.invoiceItems.length) {
                          n = disp.invoiceItems.reduce((s, it) => s + (Number(it.qty)||0) * (Number(it.unitPrice)||0), 0);
                          if (n && !c) c = Math.round(n * 1.19);
                        }
                        // Fallback 2: items de la GD
                        if (!n && disp.items && disp.items.length) {
                          n = disp.items.reduce((s, it) => {
                            const rawUnit = String(it.unit || "");
                            const p = Number(it.unitPrice || 0) || (Number(rawUnit.replace(/[$.,]/g,"")) > 0 ? Number(rawUnit.replace(/[$.,]/g,"")) : 0);
                            return s + (Number(it.qty)||0) * p;
                          }, 0);
                          if (n && !c) c = Math.round(n * 1.19);
                        }
                        return { neto: n, total: c };
                      };
                      if (!gdFacMap[key]) {
                        const { neto, total } = calcNetoGD(d);
                        gdFacMap[key] = { ...d, number: d.invoiceNumber, date: d.invoiceDate, total, neto, client: oc.client, ocNumber: oc.ocNumber || oc.id, ocId: oc.id, _fromGDs: [d.number] };
                      } else {
                        // Acumular GDs adicionales — sumar montos si la primera GD no tenía monto
                        gdFacMap[key]._fromGDs.push(d.number);
                        if (!gdFacMap[key].total) {
                          const { neto, total } = calcNetoGD(d);
                          gdFacMap[key].total = total;
                          gdFacMap[key].neto = neto;
                        }
                      }
                    }
                  });
                });
                Object.values(gdFacMap).forEach(entry => {
                  allFacs.push({ ...entry, _fromGD: entry._fromGDs.join(", ") });
                });
                // Aplicar NCs: restar de la factura referenciada si existe
                const ncMap = {}; // facNumber -> monto NC acumulado
                enriched.forEach(oc => {
                  (oc.dispatches || []).forEach(d => {
                    if (d.docType === "nc" && d.refInvoice && d.date) {
                      const key = String(d.refInvoice).trim();
                      const ncNeto = Number(d.netTotal || 0) || (d.items||[]).reduce((s,it) => s+(Number(it.qty)||0)*(Number(it.unitPrice)||0),0);
                      const ncTotal = Number(d.total || 0) || Math.round(ncNeto * 1.19);
                      if (!ncMap[key]) ncMap[key] = { neto: 0, total: 0 };
                      ncMap[key].neto += ncNeto;
                      ncMap[key].total += ncTotal;
                    }
                  });
                });
                // Descontar NCs de las facturas
                const allFacsAdj = allFacs.map(f => {
                  const nc = ncMap[String(f.number || "").trim()];
                  if (!nc) return f;
                  return { ...f, total: Math.max(0, f.total - nc.total), neto: Math.max(0, (f.neto||0) - nc.neto), _ncDesc: nc.total };
                });
                // Años disponibles
                // Filtrar por período
                const filteredFacs = allFacsAdj.filter(f => {
                  if (pfFilterFrom && f.date < pfFilterFrom) return false;
                  if (pfFilterTo && f.date > pfFilterTo) return false;
                  return true;
                });
                // Agrupar por año-mes
                const byMonth = filteredFacs.reduce((acc, fac) => {
                  const key = fac.date.slice(0, 7); // "YYYY-MM"
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(fac);
                  return acc;
                }, {});
                const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
                const fmtMonth = k => { const [y, m] = k.split("-"); const names = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]; return names[parseInt(m)-1] + " " + y; };
                const grandTotal = filteredFacs.reduce((s, f) => s + Number(f.total || f.amount || 0), 0);
                const totalClientes = new Set(filteredFacs.map(f => f.client).filter(Boolean)).size;

                return (
                  <>
                    <div className="ph">
                      <div><div className="pt">Reporte <em>Por Facturas</em></div><div className="pm">FACTURACIÓN POR PERÍODO</div></div>
                      <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                        <span style={{ fontSize:9, letterSpacing:1.5, color:"var(--fog)", fontFamily:"var(--fM)" }}>DESDE</span>
                        <input type="date" value={pfFilterFrom} onChange={e => setPfFilterFrom(e.target.value)}
                          style={{ background:"var(--card)", border:"1px solid var(--line2)", borderRadius:4, color:"var(--white)", fontSize:11, padding:"3px 7px", fontFamily:"var(--fM)" }} />
                        <span style={{ fontSize:9, letterSpacing:1.5, color:"var(--fog)", fontFamily:"var(--fM)" }}>HASTA</span>
                        <input type="date" value={pfFilterTo} onChange={e => setPfFilterTo(e.target.value)}
                          style={{ background:"var(--card)", border:"1px solid var(--line2)", borderRadius:4, color:"var(--white)", fontSize:11, padding:"3px 7px", fontFamily:"var(--fM)" }} />
                        {(pfFilterFrom || pfFilterTo) && (
                          <button className="btn btn-outline btn-sm" style={{ fontSize:10, padding:"2px 8px" }}
                            onClick={() => { setPfFilterFrom(""); setPfFilterTo(""); }}>✕ Limpiar</button>
                        )}
                      </div>
                    </div>
                    {allFacs.length === 0 && <div className="empty"><div className="empty-ico">▤</div><p>No hay facturas registradas aun.</p></div>}
                    {allFacs.length > 0 && (
                      <>
                        <div className="kpis" style={{ marginBottom:22 }}>
                          {[
                            { n: months.length,         lbl: "Meses",           c: "var(--sky)"    },
                            { n: filteredFacs.length,   lbl: "Facturas",        c: "var(--teal)"   },
                            { n: fmtCLP(grandTotal),    lbl: "Total Facturas",  c: "var(--gold)"   },
                            { n: totalClientes,         lbl: "Clientes",        c: "var(--violet)" },
                          ].map(({ n, lbl, c }) => (
                            <div key={lbl} className="kpi"><div className="kpi-bar" style={{ background:c }} /><div className="kpi-lbl">{lbl.toUpperCase()}</div><div className="kpi-n" style={{ color:c, fontSize: 38 }}>{n}</div></div>
                          ))}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
                        {months.map(mk => {
                          const facs = byMonth[mk];
                          const monTotal = facs.reduce((s, f) => s + Number(f.total || f.amount || 0), 0);
                          // Agrupar por cliente dentro del mes
                          const byClient = facs.reduce((acc, f) => { if (!acc[f.client]) acc[f.client] = []; acc[f.client].push(f); return acc; }, {});
                          return (
                            <div className="mon-card" key={mk}>
                              <div className="mon-hd">
                                <div className="mon-title">{fmtMonth(mk)}</div>
                                <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                                  <div style={{ textAlign:"right" }}>
                                    <div style={{ fontSize:8, letterSpacing:2, color:"var(--fog)" }}>FACTURAS</div>
                                    <div style={{ fontSize:13, color:"var(--teal)" }}>{facs.length}</div>
                                  </div>
                                  <div style={{ textAlign:"right" }}>
                                    <div style={{ fontSize:8, letterSpacing:2, color:"var(--fog)" }}>TOTAL MES</div>
                                    <div style={{ fontSize:13, color:"var(--gold)", fontWeight:600 }}>{fmtCLP(monTotal)}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="mon-kpis">
                                <div className="mon-kpi"><label>MONTO FACTURADO</label><p style={{ color:"var(--gold)", fontWeight:600 }}>{fmtCLP(monTotal)}</p></div>
                                <div className="mon-kpi"><label>N° FACTURAS</label><p style={{ color:"var(--teal)" }}>{facs.length}</p></div>
                                <div className="mon-kpi"><label>CLIENTES</label><p style={{ color:"var(--sky)" }}>{Object.keys(byClient).length}</p></div>
                              </div>
                              <div className="mon-body">
                                {(() => {
                                  const MAX = 15;
                                  const sorted = [...facs].sort((a,b) => Number(b.number||0) - Number(a.number||0));
                                  const isExp = expandedPFMonths.has(mk);
                                  const visible = isExp ? sorted : sorted.slice(0, MAX);
                                  const hidden = sorted.length - MAX;
                                  return (<>
                                    {visible.map((f, i) => (
                                      <div className="mon-fac-row" key={i}>
                                        <span className="badge bdoc-factura"><Dot c="var(--teal)" />Factura {f.number}</span>
                                        <span style={{ color:"var(--fog2)", fontSize:10, minWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.client}</span>
                                        <span style={{ color:"var(--gold)", flex:1, fontSize:10, fontWeight:600 }}>OC {f.ocNumber}{f._fromGD ? <span style={{ color:"var(--violet)", marginLeft:6 }}>· GD {f._fromGD}</span> : null}</span>
                                        <span style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:1 }}>
                                          <span style={{ color:"var(--gold)", fontWeight:600 }}>{fmtCLP(f.total || f.amount || 0)}</span>
                                          {f._ncDesc > 0 && <span style={{ fontSize:9, color:"#ff8c00" }}>NC -{fmtCLP(f._ncDesc)}</span>}
                                        </span>
                                      </div>
                                    ))}
                                    {sorted.length > MAX && (
                                      <div style={{ display:"flex", justifyContent:"center", padding:"8px 0", borderTop:"1px solid var(--line)" }}>
                                        <button onClick={() => setExpandedPFMonths(prev => { const n = new Set(prev); isExp ? n.delete(mk) : n.add(mk); return n; })}
                                          style={{ background:"none", border:"none", color:"var(--fog2)", fontSize:10, fontFamily:"var(--fM)", letterSpacing:1, cursor:"pointer" }}>
                                          {isExp ? "▲ Mostrar menos" : hidden + " facturas más ▼"}
                                        </button>
                                      </div>
                                    )}
                                  </>);
                                })()}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}

              {view === "factoring" && isAdmin && (() => {
                const ENTITIES = ["Santander", "Security", "Otro", "No", "Cobrada"];
                const ENTITY_COLORS = { Santander: "var(--sky)", Security: "var(--gold)", Otro: "var(--violet)", No: "var(--rose)" };

                // Recolectar todas las facturas (directas + vinculadas a GDs)
                const allFacs = [];
                // Índice de GDs por invoiceNumber para búsqueda rápida
                const gdByInvoice = {};
                enriched.forEach(oc => {
                  (oc.dispatches || []).forEach(d => {
                    if (d.docType === "guia" && d.invoiceNumber) {
                      const key = String(d.invoiceNumber).trim();
                      if (!gdByInvoice[key]) gdByInvoice[key] = [];
                      gdByInvoice[key].push({ ...d, ocClient: oc.client, ocNumber: oc.ocNumber || oc.id });
                    }
                  });
                });

                // Set de números de facturas directas (para evitar duplicados con GDs vinculadas)
                const directFacNums = new Set();

                enriched.forEach(oc => {
                  (oc.dispatches || []).forEach(d => {
                    if (d.docType === "factura" && d.date && d.number) {
                      let neto = Number(d.netTotal || 0);
                      let conIVA = Number(d.total || 0) || Math.round(neto * 1.19);
                      // Calcular neto desde items mapeados (más confiable que netTotal de Bsale)
                      if (d.items && d.items.length) {
                        const netoItems = (d.items || []).reduce((s, it) => {
                          const rawUnit = String(it.unit || "");
                          // unitPrice directo, o precio en campo unit (ej: "202.581" o "$202.581")
                          const unitAsNum = Number(rawUnit.replace(/[$.,]/g,""));
                          const p = Number(it.unitPrice || 0) || (unitAsNum > 0 ? unitAsNum : 0);
                          return s + (Number(it.qty)||0) * p;
                        }, 0);
                        // Usar items si no había neto, o si items es >5% mayor (netTotal Bsale desactualizado)
                        if (netoItems > 0 && (!neto || netoItems > neto * 1.05)) {
                          neto = netoItems;
                          conIVA = Math.round(neto * 1.19);
                        }
                      }
                      // Fallback 2: buscar GD vinculada por número de factura
                      if (!conIVA) {
                        const linkedGDs = gdByInvoice[String(d.number).trim()] || [];
                        const gdNeto = linkedGDs.reduce((s, g) => s + Number(g.netTotal || 0), 0);
                        const gdTotal = linkedGDs.reduce((s, g) => s + Number(g.total || 0), 0);
                        neto = gdNeto || neto;
                        conIVA = gdTotal || Math.round(gdNeto * 1.19);
                      }
                      // Fallback 3: buscar GD vinculada por gdNumber (campo de la factura)
                      if (!conIVA && d.gdNumber) {
                        const normGDf = s => String(s).replace(/[\s.]/g, "");
                        const gdRef = normGDf(d.gdNumber);
                        const linkedGD = enriched.flatMap(o => o.dispatches || []).find(g => g.docType === "guia" && normGDf(g.number || "") === gdRef);
                        if (linkedGD) {
                          neto = Number(linkedGD.netTotal || 0);
                          conIVA = Number(linkedGD.total || 0) || Math.round(neto * 1.19);
                        }
                      }
                      // Incluir siempre aunque conIVA sea $0 (factura válida sin monto cargado aún)
                      directFacNums.add(String(d.number).trim());
                      const desc = (d.items||[]).map(it => it.desc).filter(Boolean).join(", ") || "—";
                      allFacs.push({ key: d.id, facNumber: d.number, date: d.date, client: oc.client, rut: oc.rut || "", desc, ocNumber: oc.ocNumber || oc.id, ocId: oc.id, gdNumber: null, neto, conIVA, _ventaDirecta: oc._ventaDirecta || false });
                    }
                  });
                });

                // GDs con factura vinculada — agrupar por invoiceNumber para evitar duplicados
                const gdFacMapF = {};
                enriched.forEach(oc => {
                  (oc.dispatches || []).forEach(d => {
                    if (d.docType === "guia" && d.invoiceNumber && d.invoiceDate) {
                      if (directFacNums.has(String(d.invoiceNumber).trim())) return;
                      const key = String(d.invoiceNumber).trim();
                      let neto = Number(d.netTotal || 0);
                      let conIVA = Number(d.total || 0) || Math.round(neto * 1.19);
                      // Fallback 1: calcular desde invoiceItems (ítems de la factura Bsale vinculada)
                      if (!neto && d.invoiceItems && d.invoiceItems.length) {
                        neto = d.invoiceItems.reduce((s, it) => s + (Number(it.qty)||0) * (Number(it.unitPrice)||0), 0);
                        if (neto && !conIVA) conIVA = Math.round(neto * 1.19);
                      }
                      // Fallback 2: calcular desde items de la GD
                      if (!neto && d.items && d.items.length) {
                        neto = (d.items || []).reduce((s, it) => {
                          const rawUnit = String(it.unit || "");
                          const p = Number(it.unitPrice || 0) || (Number(rawUnit.replace(/[$.,]/g,"")) > 0 ? Number(rawUnit.replace(/[$.,]/g,"")) : 0);
                          return s + (Number(it.qty)||0) * p;
                        }, 0);
                        if (neto && !conIVA) conIVA = Math.round(neto * 1.19);
                      }
                      const desc = (d.invoiceItems||d.items||[]).map(it => it.desc).filter(Boolean).join(", ") || "—";
                      if (!gdFacMapF[key]) {
                        gdFacMapF[key] = { key: d.id + "-inv", facNumber: d.invoiceNumber, date: d.invoiceDate, client: oc.client, rut: oc.rut || "", desc, ocNumber: oc.ocNumber || oc.id, ocId: oc.id, gdNumber: d.number, neto, conIVA };
                      } else {
                        // Misma factura en múltiples GDs — acumular GD numbers en gdNumber
                        gdFacMapF[key].gdNumber = gdFacMapF[key].gdNumber + ", " + d.number;
                        if (!gdFacMapF[key].neto && neto) { gdFacMapF[key].neto = neto; gdFacMapF[key].conIVA = conIVA; }
                      }
                    }
                  });
                });
                Object.values(gdFacMapF).forEach(entry => allFacs.push(entry));

                // Aplicar NCs al reporte Factoring
                const ncMapFact = {};
                enriched.forEach(oc => {
                  (oc.dispatches || []).forEach(d => {
                    if (d.docType === "nc" && d.refInvoice && d.date) {
                      const key = String(d.refInvoice).trim();
                      const ncNeto = Number(d.netTotal || 0) || (d.items||[]).reduce((s,it) => s+(Number(it.qty)||0)*(Number(it.unitPrice)||0),0);
                      const ncTotal = Number(d.total || 0) || Math.round(ncNeto * 1.19);
                      if (!ncMapFact[key]) ncMapFact[key] = { neto: 0, conIVA: 0 };
                      ncMapFact[key].neto += ncNeto;
                      ncMapFact[key].conIVA += ncTotal;
                    }
                  });
                });
                const allFacsAdj = allFacs.map(f => {
                  const nc = ncMapFact[String(f.facNumber || "").trim()];
                  if (!nc) return f;
                  return { ...f, conIVA: Math.max(0, f.conIVA - nc.conIVA), neto: Math.max(0, f.neto - nc.neto), _ncDesc: nc.conIVA };
                });

                // Listas para selectores
                const facClients = [...new Set(allFacsAdj.map(f => f.client).filter(Boolean))].sort();
                // Filtrar por rango de fechas, cliente y condición factoring
                const allFacsFiltered = allFacsAdj.filter(f => {
                  if (facFilterFrom && f.date < facFilterFrom) return false;
                  if (facFilterTo && f.date > facFilterTo) return false;
                  if (facFilterClients.size > 0 && !facFilterClients.has(f.client)) return false;
                  if (facFilterEntity) {
                    const ent = factoringData[f.key]?.entity || null;
                    if (facFilterEntity === "sin" && ent) return false;
                    if (facFilterEntity !== "sin" && ent !== facFilterEntity) return false;
                  }
                  return true;
                });

                // Función descarga Excel
                const handleDownloadFactoringXlsx = () => {
                  const safeNum = v => { const n = Number(v); return isNaN(n) ? 0 : n; };
                  const safeStr = v => (v == null ? "" : String(v));

                  // Hoja 1: Detalle facturas
                  const rows = allFacsFiltered.map(f => ({
                    "Fecha": safeStr(f.date),
                    "Empresa": safeStr(f.client),
                    "RUT": safeStr(f.rut),
                    "OC": safeStr(f.ocNumber),
                    "GD": safeStr(f.gdNumber),
                    "Factura": safeStr(f.facNumber),
                    "Neto": safeNum(f.neto),
                    "Monto c/IVA": safeNum(f.conIVA),
                    "NC Descuento": safeNum(f._ncDesc),
                    "Factoring": safeStr(getEntity(f.key) || "Pendiente"),
                  }));
                  const ws = XLSX.utils.json_to_sheet(rows);
                  ws["!cols"] = [
                    { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 16 },
                    { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }
                  ];

                  // Hoja 2: Resumen por mes y condición
                  const ENTITIES_ORDER = ["Security","Santander","Otro","Cobrada","No","Pendiente"];
                  const byMonthMap = {};
                  allFacsFiltered.forEach(f => {
                    const mes = safeStr(f.date).slice(0,7);
                    const ent = getEntity(f.key) || "Pendiente";
                    if (!byMonthMap[mes]) byMonthMap[mes] = {};
                    if (!byMonthMap[mes][ent]) byMonthMap[mes][ent] = { count:0, neto:0, monto:0 };
                    byMonthMap[mes][ent].count++;
                    byMonthMap[mes][ent].neto += safeNum(f.neto);
                    byMonthMap[mes][ent].monto += safeNum(f.conIVA);
                  });
                  const fmtMes = k => { const [y,m] = k.split("-"); return ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][parseInt(m)] + " " + y; };
                  const rowsMes = [];
                  Object.keys(byMonthMap).sort((a,b) => b.localeCompare(a)).forEach(mes => {
                    const mesNombre = fmtMes(mes);
                    const mesData = byMonthMap[mes];
                    const mesTotal = Object.values(mesData).reduce((s,v) => s + v.monto, 0);
                    const mesNeto = Object.values(mesData).reduce((s,v) => s + v.neto, 0);
                    const mesCount = Object.values(mesData).reduce((s,v) => s + v.count, 0);
                    rowsMes.push({ "Mes": mesNombre, "Condición": "TOTAL MES", "Facturas": mesCount, "Neto": mesNeto, "Monto c/IVA": mesTotal });
                    ENTITIES_ORDER.forEach(ent => {
                      const v = mesData[ent];
                      if (v && v.count > 0) rowsMes.push({ "Mes": "", "Condición": ent, "Facturas": v.count, "Neto": v.neto, "Monto c/IVA": v.monto });
                    });
                    rowsMes.push({ "Mes": "", "Condición": "", "Facturas": "", "Neto": "", "Monto c/IVA": "" });
                  });

                  // Hoja 3: Totales globales por condición
                  const totalsMap = {};
                  allFacsFiltered.forEach(f => {
                    const ent = getEntity(f.key) || "Pendiente";
                    if (!totalsMap[ent]) totalsMap[ent] = { count:0, neto:0, monto:0 };
                    totalsMap[ent].count++;
                    totalsMap[ent].neto += safeNum(f.neto);
                    totalsMap[ent].monto += safeNum(f.conIVA);
                  });
                  const rowsTotals = [];
                  ENTITIES_ORDER.forEach(ent => {
                    const v = totalsMap[ent];
                    if (v && v.count > 0) rowsTotals.push({ "Condición": ent, "Facturas": v.count, "Neto": v.neto, "Monto c/IVA": v.monto });
                  });
                  const grandCount = Object.values(totalsMap).reduce((s,v) => s + v.count, 0);
                  const grandNeto = Object.values(totalsMap).reduce((s,v) => s + v.neto, 0);
                  const grandMonto = Object.values(totalsMap).reduce((s,v) => s + v.monto, 0);
                  rowsTotals.push({ "Condición": "", "Facturas": "", "Neto": "", "Monto c/IVA": "" });
                  rowsTotals.push({ "Condición": "TOTAL", "Facturas": grandCount, "Neto": grandNeto, "Monto c/IVA": grandMonto });
                  const factApp = ENTITIES_ORDER.filter(e => ["Santander","Security","Otro","Cobrada"].includes(e)).reduce((s,e) => s + (totalsMap[e]?.monto||0), 0);
                  rowsTotals.push({ "Condición": "", "Facturas": "", "Neto": "", "Monto c/IVA": "" });
                  rowsTotals.push({ "Condición": "→ App Factorizado", "Facturas": "", "Neto": "", "Monto c/IVA": factApp });
                  rowsTotals.push({ "Condición": "→ App No Factorizado", "Facturas": "", "Neto": "", "Monto c/IVA": totalsMap["No"]?.monto||0 });
                  rowsTotals.push({ "Condición": "→ App Pendiente", "Facturas": "", "Neto": "", "Monto c/IVA": totalsMap["Pendiente"]?.monto||0 });

                  const wsMes = XLSX.utils.json_to_sheet(rowsMes);
                  wsMes["!cols"] = [{ wch:18 },{ wch:16 },{ wch:10 },{ wch:16 },{ wch:16 }];
                  const wsTotals = XLSX.utils.json_to_sheet(rowsTotals);
                  wsTotals["!cols"] = [{ wch:22 },{ wch:10 },{ wch:16 },{ wch:16 }];

                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Detalle");
                  XLSX.utils.book_append_sheet(wb, wsMes, "Por Mes");
                  XLSX.utils.book_append_sheet(wb, wsTotals, "Totales");
                  const suffix = (facFilterFrom || facFilterTo)
                    ? "_" + (facFilterFrom || "") + (facFilterTo ? "_al_" + facFilterTo : "")
                    : "_" + today();
                  XLSX.writeFile(wb, "Reporte_Factoring" + suffix + ".xlsx");
                };

                // Agrupar por mes (sobre datos filtrados)
                const byMonth = allFacsFiltered.reduce((acc, f) => {
                  const key = f.date.slice(0,7);
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(f);
                  return acc;
                }, {});
                const months = Object.keys(byMonth).sort((a,b) => b.localeCompare(a));
                const fmtMonth = k => { const [y,m] = k.split("-"); return ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][parseInt(m)-1] + " " + y; };

                const isFactorizado = key => !!(factoringData[key] && factoringData[key].entity && factoringData[key].entity !== "No");
                const isNo = key => !!(factoringData[key] && factoringData[key].entity === "No");
                const getEntity = key => factoringData[key]?.entity || null;

                const totalConIVA = allFacsFiltered.reduce((s,f) => s + f.conIVA, 0);
                const totalNeto = allFacsFiltered.reduce((s,f) => s + f.neto, 0);
                const totalFactorizado = allFacsFiltered.filter(f => isFactorizado(f.key)).reduce((s,f) => s + f.conIVA, 0);
                const totalNo = allFacsFiltered.filter(f => isNo(f.key)).reduce((s,f) => s + f.conIVA, 0);
                const isCobrada = key => !!(factoringData[key] && factoringData[key].entity === "Cobrada");
                const totalCobrada = allFacsFiltered.filter(f => isCobrada(f.key)).reduce((s,f) => s + f.conIVA, 0);
                const totalPendiente = allFacsFiltered.filter(f => !isFactorizado(f.key) && !isCobrada(f.key)).reduce((s,f) => s + Math.max(0, f.conIVA), 0);

                // Column widths fixed
                const colW = { check:40, fecha:100, empresa:160, item:200, oc:130, gd:70, factura:80, monto:120, entity:370 };

                return (
                  <>
                    <div className="ph" style={{ flexDirection:"column", alignItems:"stretch", gap:10 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                        <div><div className="pt">Reporte <em>Factoring</em></div><div className="pm">CONTROL DE FACTURAS POR FACTORIZAR</div></div>
                        <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:9, letterSpacing:2, color:"var(--fog)" }}>TOTAL NETO</div>
                            <div style={{ fontSize:13, color:"var(--white)", fontWeight:600 }}>{fmtCLP(totalNeto)}</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:9, letterSpacing:2, color:"var(--fog)" }}>TOTAL c/IVA</div>
                            <div style={{ fontSize:13, color:"var(--white)", fontWeight:600 }}>{fmtCLP(totalConIVA)}</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:9, letterSpacing:2, color:"var(--fog)" }}>FACTORIZADO</div>
                            <div style={{ fontSize:13, color:"var(--lime)", fontWeight:600 }}>{fmtCLP(totalFactorizado)}</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:9, letterSpacing:2, color:"var(--fog)" }}>NO FACTORIZADO</div>
                            <div style={{ fontSize:13, color:"var(--rose)", fontWeight:600 }}>{fmtCLP(totalNo)}</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:9, letterSpacing:2, color:"var(--fog)" }}>PENDIENTE</div>
                            <div style={{ fontSize:13, color:"var(--gold)", fontWeight:600 }}>{fmtCLP(totalPendiente)}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", paddingTop:6, borderTop:"1px solid var(--line)" }}>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <span style={{ fontSize:9, letterSpacing:1.5, color:"var(--fog)", fontFamily:"var(--fM)" }}>DESDE</span>
                          <input type="date" value={facFilterFrom} onChange={e => setFacFilterFrom(e.target.value)}
                            style={{ background:"var(--card)", border:"1px solid var(--line2)", borderRadius:4, color:"var(--white)", fontSize:11, padding:"3px 7px", fontFamily:"var(--fM)" }} />
                          <span style={{ fontSize:9, letterSpacing:1.5, color:"var(--fog)", fontFamily:"var(--fM)" }}>HASTA</span>
                          <input type="date" value={facFilterTo} onChange={e => setFacFilterTo(e.target.value)}
                            style={{ background:"var(--card)", border:"1px solid var(--line2)", borderRadius:4, color:"var(--white)", fontSize:11, padding:"3px 7px", fontFamily:"var(--fM)" }} />
                          {(facFilterFrom || facFilterTo) && (
                            <button className="btn btn-outline btn-sm" style={{ fontSize:10, padding:"2px 8px" }}
                              onClick={() => { setFacFilterFrom(""); setFacFilterTo(""); }}>✕</button>
                          )}
                        </div>
                        <div style={{ width:1, height:22, background:"var(--line)" }} />
                        <button className="btn btn-outline btn-sm" style={{ color:"var(--fog2)", borderColor:"var(--line2)", fontSize:10, padding:"4px 12px" }}
                          onClick={handleDownloadFactoringXlsx}>
                          ↓ Excel
                        </button>
                        <div style={{ width:1, height:22, background:"var(--line)" }} />
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <span style={{ fontSize:9, letterSpacing:1.5, color:"var(--fog)", fontFamily:"var(--fM)" }}>CLIENTE</span>
                          <ClientMultiSelect clients={facClients} selected={facFilterClients} onChange={setFacFilterClients} />
                          {facFilterClients.size > 0 && <button className="btn btn-outline btn-sm" style={{ fontSize:10, padding:"2px 6px" }} onClick={() => setFacFilterClients(new Set())}>✕</button>}
                        </div>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <span style={{ fontSize:9, letterSpacing:1.5, color:"var(--fog)", fontFamily:"var(--fM)" }}>CONDICIÓN</span>
                          <select value={facFilterEntity} onChange={e => setFacFilterEntity(e.target.value)}
                            style={{ background:"var(--card)", border:"1px solid var(--line2)", borderRadius:4, color: facFilterEntity ? "var(--white)" : "var(--fog2)", fontSize:11, padding:"3px 7px", fontFamily:"var(--fM)", minWidth:130 }}>
                            <option value="">Todas</option>
                            <option value="Santander">Santander</option>
                            <option value="Security">Security</option>
                            <option value="Otro">Otro</option>
                            <option value="No">No</option>
                            <option value="Cobrada">Cobrada</option>
                            <option value="sin">Sin clasificar</option>
                          </select>
                          {facFilterEntity && <button className="btn btn-outline btn-sm" style={{ fontSize:10, padding:"2px 6px" }} onClick={() => setFacFilterEntity("")}>✕</button>}
                        </div>
                      </div>
                    </div>
                    {allFacsFiltered.length === 0 && <div className="empty"><div className="empty-ico">▤</div><p>{allFacsAdj.length > 0 ? "Sin resultados para el período seleccionado." : "No hay facturas registradas aún."}</p></div>}
                    {months.map(month => {
                      const facs = byMonth[month];
                      const mesTotal = facs.reduce((s,f) => s + f.conIVA, 0);
                      const mesNeto = facs.reduce((s,f) => s + f.neto, 0);
                      const mesFactorizado = facs.filter(f => isFactorizado(f.key)).reduce((s,f) => s + f.conIVA, 0);
                      const mesNo = facs.filter(f => isNo(f.key)).reduce((s,f) => s + f.conIVA, 0);
                      const isCollapsed = collapsedMonths.has(month);
                      const toggleCollapse = () => setCollapsedMonths(prev => {
                        const n = new Set(prev);
                        n.has(month) ? n.delete(month) : n.add(month);
                        return n;
                      });
                      return (
                        <div key={month} style={{ marginBottom:28 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, cursor:"pointer" }} onClick={toggleCollapse}>
                            <div style={{ fontFamily:"var(--fS)", fontSize:18, fontStyle:"italic", color:"var(--white)" }}>{fmtMonth(month)}</div>
                            <div style={{ flex:1, height:1, background:"var(--line)" }} />
                            <div style={{ fontSize:10, color:"var(--fog2)" }}>{facs.length} factura{facs.length !== 1 ? "s" : ""}</div>
                            {mesFactorizado > 0 && <div style={{ fontSize:10, color:"var(--lime)" }}>{fmtCLP(mesFactorizado)} factorizado</div>}
                            {mesNo > 0 && <div style={{ fontSize:10, color:"var(--rose)" }}>{fmtCLP(mesNo)} no factorizado</div>}
                            {(() => { const mesCobrada = facs.filter(f => isCobrada(f.key)).reduce((s,f) => s + f.conIVA, 0); const mesPendFacs = facs.filter(f => !isFactorizado(f.key) && !isCobrada(f.key)); const mesPend = mesPendFacs.reduce((s,f) => s + Math.max(0, f.conIVA), 0); return mesPend > 0 ? <div style={{ fontSize:10, color:"var(--gold)" }}>{fmtCLP(mesPend)} pendiente</div> : null; })()}
                            <div style={{ fontSize:10, color:"var(--fog2)" }}>/ {fmtCLP(mesTotal)} total</div>
                            <div style={{ fontSize:10, color:"var(--fog)" }}>{fmtCLP(mesNeto)} neto</div>
                            <div style={{ marginLeft:"auto", fontSize:11, color:"var(--fog)", userSelect:"none" }}>{isCollapsed ? "▶ expandir" : "▼ recoger"}</div>
                          </div>
                          {!isCollapsed && <div className="tbl-card tbl-scroll">
                            <table style={{ tableLayout:"fixed", width:"100%", minWidth:1180 }}>
                              <colgroup>
                                <col style={{ width:colW.check }} />
                                <col style={{ width:colW.fecha }} />
                                <col style={{ width:colW.empresa }} />
                                <col style={{ width:colW.item }} />
                                <col style={{ width:colW.oc }} />
                                <col style={{ width:colW.gd }} />
                                <col style={{ width:colW.factura }} />
                                <col style={{ width:colW.monto }} />
                                <col style={{ width:colW.entity }} />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th></th>
                                  {[
                                    { label:"FECHA",     col:"date",      align:"left"  },
                                    { label:"EMPRESA",   col:"client",    align:"left"  },
                                    { label:"ÍTEM",      col:"desc",      align:"left"  },
                                    { label:"OC",        col:"ocNumber",  align:"left"  },
                                    { label:"GD",        col:"gdNumber",  align:"left"  },
                                    { label:"FACTURA",   col:"facNumber", align:"left"  },
                                    { label:"MONTO c/IVA", col:"conIVA", align:"right" },
                                  ].map(({ label, col, align }) => {
                                    const active = factoringSort.col === col;
                                    return (
                                      <th key={col} className={"th-sort" + (active ? " active" : "")}
                                        style={{ textAlign: align, cursor:"pointer", userSelect:"none" }}
                                        onClick={() => setFactoringSort(s => ({ col, dir: s.col === col ? -s.dir : 1 }))}>
                                        {label}<span className="sort-ico">{active ? (factoringSort.dir === 1 ? "▲" : "▼") : "⇅"}</span>
                                      </th>
                                    );
                                  })}
                                  <th>FACTORING</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...facs].sort((a,b) => {
                                  const { col, dir } = factoringSort;
                                  let av = col === "facNumber" ? Number(a.facNumber||0) : col === "gdNumber" ? Number(a.gdNumber||0) : col === "conIVA" ? a.conIVA : String(a[col]||"");
                                  let bv = col === "facNumber" ? Number(b.facNumber||0) : col === "gdNumber" ? Number(b.gdNumber||0) : col === "conIVA" ? b.conIVA : String(b[col]||"");
                                  return av < bv ? -dir : av > bv ? dir : 0;
                                }).map(f => {
                                  const fact = isFactorizado(f.key);
                                  const entity = getEntity(f.key);
                                  return (
                                    <tr key={f.key} style={{ opacity: fact ? 0.6 : 1 }}>
                                      <td>
                                        <div style={{ width:16, height:16, borderRadius:4, border: fact ? "none" : "1px solid var(--line2)", background: fact ? "var(--lime)" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"var(--ink)", fontWeight:700 }}>
                                          {fact ? "✓" : ""}
                                        </div>
                                      </td>
                                      <td style={{ color:"var(--fog2)" }}>{f.date}</td>
                                      <td style={{ color:"var(--white)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.client}</td>
                                      <td style={{ color:"var(--fog2)", fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.desc}</td>
                                      <td style={{ fontSize:10, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                        {(() => {
                                          const oc = enriched.find(o => (o.ocNumber || o.id) === f.ocNumber);
                                          return oc
                                            ? <span style={{ color:"var(--gold)", cursor:"pointer", textDecoration:"underline", textDecorationStyle:"dotted", textUnderlineOffset:2 }} onClick={() => { setView("orders"); setTimeout(() => setShowDetail(oc), 80); }}>{f.ocNumber}</span>
                                            : <span style={{ color:"var(--gold)" }}>{f.ocNumber}</span>;
                                        })()}
                                      </td>
                                      <td style={{ color:"var(--violet)", fontSize:10 }}>{f.gdNumber || "—"}</td>
                                      <td style={{ color:"var(--teal)", fontWeight:600 }}>{f.facNumber || "—"}</td>
                                      <td style={{ textAlign:"right" }}>
                                        <div style={{ fontWeight:600, color: fact ? "var(--lime)" : "var(--white)" }}>{fmtCLP(f.conIVA)}</div>
                                        {f._ncDesc > 0 && <div style={{ fontSize:9, color:"#ff8c00" }}>NC -{fmtCLP(f._ncDesc)}</div>}
                                      </td>
                                      <td>
                                        <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
                                          {(() => {
                                            const S = (active, col) => ({ padding:"3px 9px", borderRadius:4, fontSize:9, letterSpacing:.5, cursor:"pointer", fontFamily:"var(--fM)", fontWeight:700, border:"1px solid "+col, background:active?col:"transparent", color:active?"var(--ink)":col, opacity:(entity&&!active)?0.35:1, transition:".12s", boxShadow:active?"0 0 6px "+col+"66":"none" });
                                            // Estado No: mostrar No activo + Cobrada (ocultar Santander/Security/Otro)
                                            // Estado Cobrada: mostrar solo Cobrada activa
                                            // Estado Factoring (Santander/Security/Otro): mostrar los 4 botones normales
                                            // Sin estado: mostrar Santander/Security/Otro/No
                                            const isNoActive = entity === "No";
                                            const isCobradaActive = entity === "Cobrada";
                                            const isFactActive = ["Santander","Security","Otro"].includes(entity);
                                            const showSSOtro = !isNoActive && !isCobradaActive && !f._ventaDirecta;
                                            const showNo = !isCobradaActive && !isFactActive && !f._ventaDirecta;
                                            const showCobrada = isNoActive || isCobradaActive || f._ventaDirecta;
                                            return (<>
                                              {showSSOtro && ["Santander","Security","Otro"].map(e => (
                                                <button key={e} onClick={() => handleToggleFactoring(f.key, e)} style={S(entity===e, ENTITY_COLORS[e])}>{e}</button>
                                              ))}
                                              {showNo && <button onClick={() => handleToggleFactoring(f.key, "No")} style={S(isNoActive, ENTITY_COLORS["No"])}>No</button>}
                                              {showCobrada && <button onClick={() => handleToggleFactoring(f.key, "Cobrada")} style={S(isCobradaActive, "#7fff5a")}>Cobrada</button>}
                                            </>);
                                          })()}
                                          {(() => {
                                            const cnt = (factoringGestiones[f.key] || []).length;
                                            return (
                                              <button className="btn btn-outline btn-sm"
                                                style={{ color:"var(--teal)", borderColor: cnt > 0 ? "var(--teal)" : undefined, marginLeft:4 }}
                                                onClick={() => setShowFactoringGestion({ key: f.key, label: "Fac. " + (f.facNumber || "—") + " · " + f.client })}>
                                                Gestión{cnt > 0 ? " (" + cnt + ")" : ""}
                                              </button>
                                            );
                                          })()}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>}
                        </div>
                      );
                    })}
                  </>
                );
              })()}

              {view === "pending" && (() => {
                const pendingOCs = enriched.filter(o => { const s = ocStatus(o.items, o.dispatches, o); return s === "open" || s === "partial"; });
                const totalPend = pendingOCs.reduce((s, o) => s + o.items.reduce((a, i) => a + (Number(i.qty) - Number(i.dispatched||0)) * Number(i.unitPrice), 0), 0);

                // Sort helper para esta tabla
                const PSortTh = ({ label, col, align }) => {
                  const active = pendSort.col === col;
                  return (
                    <th className={"th-sort" + (active ? " active" : "")}
                      style={align ? { textAlign: align } : {}}
                      onClick={() => setPendSort(s => ({ col, dir: s.col === col ? -s.dir : 1 }))}>
                      {label}<span className="sort-ico">{active ? (pendSort.dir === 1 ? "▲" : "▼") : "⇅"}</span>
                    </th>
                  );
                };

                const sorted = [...pendingOCs].sort((a, b) => {
                  const { col, dir } = pendSort;
                  const totA = a.items.reduce((s,i) => s+Number(i.qty)*Number(i.unitPrice),0);
                  const totB = b.items.reduce((s,i) => s+Number(i.qty)*Number(i.unitPrice),0);
                  const disA = a.items.reduce((s,i) => s+Number(i.dispatched||0)*Number(i.unitPrice),0);
                  const disB = b.items.reduce((s,i) => s+Number(i.dispatched||0)*Number(i.unitPrice),0);
                  const remA = totA - disA;
                  const remB = totB - disB;
                  const pctA = totA > 0 ? Math.round(disA/totA*100) : 0;
                  const pctB = totB > 0 ? Math.round(disB/totB*100) : 0;
                  const sA = ocStatus(a.items, a.dispatches, a);
                  const sB = ocStatus(b.items, b.dispatches, b);
                  let av, bv;
                  if (col === "ocNumber")     { av = a.ocNumber||a.id; bv = b.ocNumber||b.id; }
                  else if (col === "date")    { av = a.date||""; bv = b.date||""; }
                  else if (col === "client")  { av = a.client||""; bv = b.client||""; }
                  else if (col === "delivery"){ av = a.deliveryDate||""; bv = b.deliveryDate||""; }
                  else if (col === "status")  { av = statusOrder[sA]??0; bv = statusOrder[sB]??0; }
                  else if (col === "monto")   { av = totA; bv = totB; }
                  else if (col === "despachado") { av = disA; bv = disB; }
                  else if (col === "remanente")  { av = remA; bv = remB; }
                  else if (col === "pct")     { av = pctA; bv = pctB; }
                  else                        { av = 0; bv = 0; }
                  return av < bv ? -dir : av > bv ? dir : 0;
                });

                return (
                  <>
                    <div className="ph">
                      <div><div className="pt">Reporte <em>Pend. Despachar</em></div><div className="pm">OCS SIN COMPLETAR</div></div>
                      {pendingOCs.length > 0 && <button className="btn btn-outline" onClick={() => {
                        const rows = [];
                        sorted.forEach(oc => {
                          const tot = oc.items.reduce((a, i) => a + Number(i.qty) * Number(i.unitPrice), 0);
                          const dis = oc.items.reduce((a, i) => a + Number(i.dispatched||0) * Number(i.unitPrice), 0);
                          const pct = tot > 0 ? Math.round(dis/tot*100) : 0;
                          const s = ocStatus(oc.items, oc.dispatches, oc);
                          rows.push({
                            "Estado": bLbl(s),
                            "N° OC": oc.ocNumber || oc.id,
                            "Fecha OC": oc.date || "",
                            "Cliente": oc.client,
                            "Fecha Entrega": oc.deliveryDate || "",
                            "Monto OC": tot,
                            "Despachado": dis,
                            "Remanente": tot - dis,
                            "Avance %": pct + "%",
                            "Guias": (oc.dispatches||[]).filter(x=>x.docType==="guia").length,
                            "Facturas": (oc.dispatches||[]).filter(x=>x.docType==="factura").length,
                          });
                        });
                        const ws = XLSX.utils.json_to_sheet(rows);
                        ws["!cols"] = [12,14,12,28,14,14,14,14,10,8,10].map(w => ({ wch: w }));
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Pend Despachar");
                        XLSX.writeFile(wb, "Reporte_Pend_Despachar_" + today() + ".xlsx");
                      }}>↓ Exportar Excel</button>}
                    </div>
                    <div className="kpis" style={{ marginBottom:22 }}>
                      {[
                        { n: pendingOCs.length, lbl: "OCs Pendientes", c: "var(--rose)" },
                        { n: pendingOCs.filter(o => ocStatus(o.items, o.dispatches, o) === "open").length, lbl: "Abiertas", c: "var(--sky)" },
                        { n: pendingOCs.filter(o => ocStatus(o.items, o.dispatches, o) === "partial").length, lbl: "Parciales", c: "var(--gold)" },
                        { n: fmtCLP(totalPend), lbl: "Monto Pendiente", c: "var(--rose)" },
                      ].map(({ n, lbl, c }) => (
                        <div key={lbl} className="kpi"><div className="kpi-bar" style={{ background:c }} /><div className="kpi-lbl">{lbl.toUpperCase()}</div><div className="kpi-n" style={{ color:c, fontSize:38 }}>{n}</div></div>
                      ))}
                    </div>
                    {pendingOCs.length === 0 && <div className="empty"><div className="empty-ico">✓</div><p>No hay ordenes pendientes.</p></div>}
                    {pendingOCs.length > 0 && (
                      <div className="tbl-card tbl-scroll">
                        <table>
                          <thead>
                            <tr>
                              <PSortTh label="ESTADO"    col="status" />
                              <PSortTh label="N° OC"     col="ocNumber" />
                              <PSortTh label="FECHA OC"  col="date" />
                              <PSortTh label="CLIENTE"   col="client" />
                              <PSortTh label="ENTREGA"   col="delivery" />
                              <PSortTh label="AVANCE"    col="pct" />
                              <PSortTh label="MONTO OC"   col="monto"      align="right" />
                              <PSortTh label="DESPACHADO" col="despachado"  align="right" />
                              <PSortTh label="REMANENTE"  col="remanente"   align="right" />
                              <th style={{ textAlign:"center" }}>GDS</th>
                              <th style={{ textAlign:"center" }}>FACTS.</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.map(oc => {
                              const s = ocStatus(oc.items, oc.dispatches, oc);
                              const tot = oc.items.reduce((a,i) => a+Number(i.qty)*Number(i.unitPrice),0);
                              const dis = oc.items.reduce((a,i) => a+Number(i.dispatched||0)*Number(i.unitPrice),0);
                              const pct = tot > 0 ? Math.min(100, Math.round(dis/tot*100)) : 0;
                              const d = daysLeft(oc.deliveryDate);
                              const disp = oc.dispatches || [];
                              const pendG = disp.filter(x => x.docType==="guia" && !x.invoiceNumber).length;
                              const nFacts = disp.filter(x => x.docType==="factura").length;
                              const nGuias = disp.filter(x => x.docType==="guia").length;
                              const pendItems = oc.items.filter(it => Number(it.qty) - Number(it.dispatched||0) > 0);
                              const isExpanded = !!pendExpanded[oc.id];
                              const COLS = 12;
                              return (
                                <React.Fragment key={oc.id}>
                                  <tr style={{ cursor: pendItems.length ? "pointer" : "default" }}
                                      onClick={() => pendItems.length && setPendExpanded(e => ({ ...e, [oc.id]: !e[oc.id] }))}>
                                    <td>
                                      <span className={"badge " + bCls(s)}>
                                        <Dot c={s==="open"?"var(--sky)":s==="partial"?"var(--gold)":"var(--lime)"} />
                                        {bLbl(s)}
                                      </span>
                                    </td>
                                    <td style={{ color:"var(--gold)", fontFamily:"var(--fM)", fontWeight:600 }}><span style={{ cursor:"pointer", textDecoration:"underline", textDecorationStyle:"dotted", textUnderlineOffset:2 }} onClick={() => { setView("orders"); setTimeout(() => setShowDetail(oc), 80); }}>{oc.ocNumber || oc.id}</span></td>
                                    <td style={{ color:"var(--fog2)" }}>{oc.date || "—"}</td>
                                    <td style={{ color:"var(--white)" }}>{oc.client}</td>
                                    <td style={{ color: d !== null && d <= 0 ? "var(--rose)" : d !== null && d <= 5 ? "var(--gold)" : "var(--fog2)" }}>
                                      {oc.deliveryDate || "—"}
                                      {d !== null && d <= 5 && s !== "closed" && (
                                        <span style={{ fontSize:9, color: d < 0 ? "var(--rose)" : "var(--gold)", marginLeft:5 }}>
                                          {d < 0 ? "Vencida" : d + "d"}
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:100 }}>
                                        <div className="pbar-wrap" style={{ flex:1, height:4 }}>
                                          <div className="pbar" style={{ width:pct+"%", background:pc(pct) }} />
                                        </div>
                                        <span style={{ fontSize:10, color:pc(pct), width:28, textAlign:"right" }}>{pct}%</span>
                                      </div>
                                    </td>
                                    <td style={{ textAlign:"right", color:"var(--fog2)" }}>{fmtCLP(tot)}</td>
                                    <td style={{ textAlign:"right", color:"var(--lime)" }}>{fmtCLP(dis)}</td>
                                    <td style={{ textAlign:"right", color:"var(--rose)", fontWeight:600 }}>{fmtCLP(tot-dis)}</td>
                                    <td style={{ textAlign:"center", color:"var(--violet)" }}>
                                      {nGuias}
                                      {pendG > 0 && <span style={{ color:"var(--gold)", fontSize:9, marginLeft:3 }}>({pendG})</span>}
                                    </td>
                                    <td style={{ textAlign:"center", color:"var(--teal)" }}>{nFacts}</td>
                                    <td onClick={e => e.stopPropagation()}>
                                      <div style={{ display:"flex", gap:6, alignItems:"center", justifyContent:"flex-end" }}>
                                        {pendItems.length > 0 && (
                                          <button className="btn btn-ghost btn-sm"
                                            style={{ fontSize:11, padding:"3px 8px", color: isExpanded ? "var(--gold)" : "var(--fog2)" }}
                                            onClick={() => setPendExpanded(e => ({ ...e, [oc.id]: !e[oc.id] }))}>
                                            {isExpanded ? "▲" : "▼"} {pendItems.length} ítem{pendItems.length !== 1 ? "s" : ""}
                                          </button>
                                        )}
                                        <button className="btn btn-outline btn-sm" style={{ color:"var(--gold)" }} onClick={() => setShowGestion(oc)}>Gestión</button>
                                        <button className="btn btn-outline btn-sm" onClick={() => setShowDetail(oc)}>Detalle →</button>
                                      </div>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr style={{ background:"var(--ink3)" }}>
                                      <td colSpan={COLS} style={{ padding:"0 0 0 0", borderBottom:"1px solid var(--line2)" }}>
                                        <div style={{ padding:"10px 18px 12px 18px" }}>
                                          <div style={{ fontSize:9, letterSpacing:2, color:"var(--fog)", marginBottom:8 }}>ÍTEMS PENDIENTES DE DESPACHO</div>
                                          <table style={{ width:"100%", borderCollapse:"collapse" }}>
                                            <thead>
                                              <tr>
                                                <th style={{ fontSize:9, color:"var(--fog)", letterSpacing:1.5, textAlign:"left", paddingBottom:6, fontWeight:400, borderBottom:"1px solid var(--line)" }}>DESCRIPCIÓN</th>
                                                <th style={{ fontSize:9, color:"var(--fog)", letterSpacing:1.5, textAlign:"right", paddingBottom:6, fontWeight:400, borderBottom:"1px solid var(--line)", width:80 }}>QTY OC</th>
                                                <th style={{ fontSize:9, color:"var(--fog)", letterSpacing:1.5, textAlign:"right", paddingBottom:6, fontWeight:400, borderBottom:"1px solid var(--line)", width:90 }}>DESPACHADO</th>
                                                <th style={{ fontSize:9, color:"var(--fog)", letterSpacing:1.5, textAlign:"right", paddingBottom:6, fontWeight:400, borderBottom:"1px solid var(--line)", width:90 }}>PENDIENTE</th>
                                                <th style={{ fontSize:9, color:"var(--fog)", letterSpacing:1.5, textAlign:"center", paddingBottom:6, fontWeight:400, borderBottom:"1px solid var(--line)", width:130 }}>AVANCE</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {pendItems.map(it => {
                                                const rem = Number(it.qty) - Number(it.dispatched||0);
                                                const p = it.qty > 0 ? Math.min(100, Math.round(Number(it.dispatched||0)/Number(it.qty)*100)) : 0;
                                                return (
                                                  <tr key={it.id}>
                                                    <td style={{ fontSize:11, color:"var(--fog2)", padding:"6px 0" }}>{it.desc}</td>
                                                    <td style={{ textAlign:"right", fontSize:11, color:"var(--fog)", padding:"6px 0" }}>{fmtNum(it.qty)} {it.unit}</td>
                                                    <td style={{ textAlign:"right", fontSize:11, color:"var(--lime)", padding:"6px 0" }}>{fmtNum(Number(it.dispatched||0))} {it.unit}</td>
                                                    <td style={{ textAlign:"right", fontSize:11, color:"var(--gold)", fontWeight:600, padding:"6px 0" }}>{fmtNum(rem)} {it.unit}</td>
                                                    <td style={{ padding:"6px 0" }}>
                                                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                                        <div className="pbar-wrap" style={{ flex:1, height:4 }}>
                                                          <div className="pbar" style={{ width:p+"%", background:pc(p) }} />
                                                        </div>
                                                        <span style={{ fontSize:10, color:pc(p), width:28, textAlign:"right" }}>{p}%</span>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}

              {view === "toinvoice" && (() => {
                // Clientes con tolerancia extendida (5 días)
                const TOLERANCIA_EXTENDIDA = new Set([
                  "syncore montajes spa",
                  "echeverría izquierdo montajes industriales s.a.",
                  "echeverria izquierdo montajes industriales s.a.",
                  "76.543.046-1",
                  "96.870.780-9"
                ]);
                const tolerancia = (client, rut) => {
                  const c = (client || "").toLowerCase().trim();
                  const r = (rut || "").toLowerCase().trim();
                  return TOLERANCIA_EXTENDIDA.has(c) || TOLERANCIA_EXTENDIDA.has(r) ? 5 : 1;
                };
                const diffDays = dateStr => {
                  if (!dateStr) return null;
                  return Math.floor((new Date(today()) - new Date(dateStr)) / 86400000);
                };
                // Recolectar todas las GDs sin factura
                const pendFacs = [];
                enriched.forEach(oc => {
                  const ocStatusVal = ocStatus(oc.items, oc.dispatches, oc);
                  // Solo OCs que realmente están pendientes de facturar
                  if (ocStatusVal === "closed") return;
                  const normN = s => String(s).replace(/[\s.]/g, "");
                  (oc.dispatches || []).forEach(d => {
                    if (d.docType === "guia" && !d.invoiceNumber) {
                      // Verificar que no esté cubierta por factura directa con gdNumber
                      const coveredByDirectFac = (oc.dispatches || []).some(f =>
                        f.docType === "factura" && f.gdNumber && normN(f.gdNumber) === normN(d.number || "")
                      );
                      if (coveredByDirectFac) return;
                      const dias = diffDays(d.date);
                      const tol = tolerancia(oc.client, oc.rut);
                      const atrasada = dias !== null && dias > tol;
                      const neto = Number(d.netTotal || 0) || (d.items || []).reduce((s, it) => {
                        const ocItem = it.ocItemId ? oc.items.find(o => o.id === it.ocItemId) : null;
                        const price = Number(it.unitPrice || (ocItem ? ocItem.unitPrice : 0) || 0);
                        return s + (Number(it.qty) || 0) * price;
                      }, 0);
                      pendFacs.push({ ...d, neto, client: oc.client, ocNumber: oc.ocNumber || oc.id, ocId: oc.id, dias, tol, atrasada, ocStatusVal });
                    }
                  });
                });
                // Ordenar dinámico
                const { col: tiCol, dir: tiDir } = toinvoiceSort;
                const ocStatusOrder = { open:0, partial:1, toinvoice:2, closed:3 };
                pendFacs.sort((a, b) => {
                  let av = tiCol === "neto" ? a.neto : tiCol === "ocNumber" ? String(a.ocNumber || "") : tiCol === "number" ? Number(a.number || 0) : tiCol === "dias" ? (a.dias ?? 999) : tiCol === "ocStatus" ? (ocStatusOrder[a.ocStatusVal] ?? 0) : String(a[tiCol] || "");
                  let bv = tiCol === "neto" ? b.neto : tiCol === "ocNumber" ? String(b.ocNumber || "") : tiCol === "number" ? Number(b.number || 0) : tiCol === "dias" ? (b.dias ?? 999) : tiCol === "ocStatus" ? (ocStatusOrder[b.ocStatusVal] ?? 0) : String(b[tiCol] || "");
                  return av < bv ? -tiDir : av > bv ? tiDir : 0;
                });
                const totalNeto = pendFacs.reduce((s, g) => s + g.neto, 0);
                const atrasadas = pendFacs.filter(g => g.atrasada).length;
                return (
                  <>
                    <div className="ph">
                      <div><div className="pt">Reporte <em>Pend. Facturar</em></div><div className="pm">GUÍAS SIN FACTURA VINCULADA</div></div>
                      {pendFacs.length > 0 && (
                        <button className="btn btn-outline btn-sm" style={{ color:"var(--fog2)", borderColor:"var(--line2)", fontSize:10, padding:"4px 12px" }}
                          onClick={() => {
                            const rows = pendFacs.map(g => ({
                              "Estado": g.atrasada ? "Atrasada" : "Ok",
                              "N° GD": g.number || "",
                              "Fecha GD": g.date || "",
                              "Días": g.dias !== null ? g.dias : "",
                              "Tolerancia": g.tol + "d",
                              "Cliente": g.client || "",
                              "OC": g.ocNumber || "",
                              "Estado OC": { open:"Abierta", partial:"Parcial", toinvoice:"Por Facturar", closed:"Cerrada" }[g.ocStatusVal] || "",
                              "Monto Neto": g.neto || 0,
                            }));
                            const ws = XLSX.utils.json_to_sheet(rows);
                            ws["!cols"] = [{ wch:10 },{ wch:10 },{ wch:12 },{ wch:8 },{ wch:12 },{ wch:32 },{ wch:18 },{ wch:14 },{ wch:16 }];
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Pend. Facturar");
                            XLSX.writeFile(wb, "Pend_Facturar_" + today() + ".xlsx");
                          }}>
                          ↓ Excel
                        </button>
                      )}
                    </div>
                    {pendFacs.length === 0 && <div className="empty"><div className="empty-ico">✓</div><p>No hay guías pendientes de facturar.</p></div>}
                    {pendFacs.length > 0 && (
                      <>
                        <div className="kpis" style={{ marginBottom:22, gridTemplateColumns:"repeat(4,1fr)" }}>
                          {[
                            { n: pendFacs.length, lbl: "GDs Pendientes", c: "var(--gold)" },
                            { n: atrasadas,        lbl: "Atrasadas",      c: atrasadas > 0 ? "var(--rose)" : "var(--lime)" },
                            { n: fmtCLP(totalNeto), lbl: "Monto Neto",   c: "var(--white)" },
                            { n: fmtCLP(Math.round(totalNeto * 1.19)), lbl: "Total c/IVA", c: "var(--sky)" },
                          ].map(({ n, lbl, c }) => (
                            <div key={lbl} className="kpi"><div className="kpi-bar" style={{ background:c }} /><div className="kpi-lbl">{lbl.toUpperCase()}</div><div className="kpi-n" style={{ color:c }}>{n}</div></div>
                          ))}
                        </div>
                        <div className="tbl-card tbl-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>ESTADO</th>
                                {[
                                  { label:"N° GD",      col:"number",   align:"left"  },
                                  { label:"FECHA GD",   col:"date",     align:"left"  },
                                  { label:"DÍAS",       col:"dias",     align:"left"  },
                                  { label:"CLIENTE",    col:"client",   align:"left"  },
                                  { label:"OC",         col:"ocNumber", align:"left"  },
                                  { label:"ESTADO OC",  col:"ocStatus", align:"left"  },
                                  { label:"MONTO NETO", col:"neto",     align:"right" },
                                ].map(({ label, col, align }) => {
                                  const active = toinvoiceSort.col === col;
                                  return (
                                    <th key={col} className={"th-sort" + (active ? " active" : "")}
                                      style={{ textAlign:align, cursor:"pointer", userSelect:"none" }}
                                      onClick={() => setToinvoiceSort(s => ({ col, dir: s.col === col ? -s.dir : (col === "neto" || col === "dias" ? -1 : 1) }))}>
                                      {label}<span className="sort-ico">{active ? (toinvoiceSort.dir === 1 ? "▲" : "▼") : "⇅"}</span>
                                    </th>
                                  );
                                })}
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {pendFacs.map((g, i) => (
                                <tr key={i}>
                                  <td>
                                    {g.atrasada
                                      ? <span className="badge b-toinvoice"><Dot c="var(--rose)" />Atrasada</span>
                                      : <span className="badge b-closed"><Dot c="var(--lime)" />Ok</span>}
                                  </td>
                                  <td style={{ color:"var(--violet)", fontFamily:"var(--fM)", fontWeight:600 }}>{g.number || "—"}</td>
                                  <td style={{ color:"var(--fog2)" }}>{g.date || "—"}</td>
                                  <td style={{ color: g.atrasada ? "var(--rose)" : "var(--fog2)" }}>
                                    {g.dias !== null ? g.dias + "d" : "—"}
                                    <span style={{ fontSize:9, color:"var(--fog)", marginLeft:4 }}>(tol. {g.tol}d)</span>
                                  </td>
                                  <td style={{ color:"var(--white)" }}>{g.client}</td>
                                  <td style={{ color:"var(--gold)", fontSize:10, fontWeight:600 }}>
                                    {(() => {
                                      const oc = enriched.find(o => o.id === g.ocId);
                                      return oc
                                        ? <span style={{ cursor:"pointer", textDecoration:"underline", textDecorationStyle:"dotted", textUnderlineOffset:2 }}
                                            onClick={() => { setView("orders"); setTimeout(() => setShowDetail(oc), 80); }}>{g.ocNumber}</span>
                                        : g.ocNumber;
                                    })()}
                                  </td>
                                  <td>{(() => {
                                    const oc = enriched.find(o => o.id === g.ocId);
                                    if (!oc) return null;
                                    const s = ocStatus(oc.items, oc.dispatches, oc);
                                    return <span className={"badge " + bCls(s)}><Dot c={s === "open" ? "var(--sky)" : s === "partial" ? "var(--gold)" : s === "toinvoice" ? "var(--rose)" : "var(--lime)"} />{bLbl(s)}</span>;
                                  })()}</td>
                                  <td style={{ textAlign:"right", color:"var(--gold)", fontWeight:600 }}>{fmtCLP(g.neto)}</td>
                                  <td>
                                    <button className="btn btn-outline btn-sm" style={{ color:"var(--gold)" }} onClick={() => { const oc = enriched.find(o => o.id === g.ocId); if (oc) setShowGestion(oc); }}>Gestión</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}

              {view === "reports" && (
                <>
                  <div className="ph">
                    <div><div className="pt">Reporte <em>Por OC</em></div><div className="pm">ESTADO DE DESPACHO POR ORDEN</div></div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {(() => {
                        const months = [...new Set(enriched.map(o => (o.date||"").slice(0,7)).filter(Boolean))].sort((a,b) => b.localeCompare(a));
                        const years = [...new Set(months.map(m => m.slice(0,4)))];
                        const monthName = m => { const [y,mo] = m.split("-"); return ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][parseInt(mo)] + " " + y; };
                        return (
                          <select value={reportsMonthFilter} onChange={e => setReportsMonthFilter(e.target.value)} className="fsel" style={{ fontSize:11 }}>
                            <option value="all">Todos los períodos</option>
                            {years.map(y => (
                              <optgroup key={y} label={"── " + y + " ──"}>
                                {months.filter(m => m.startsWith(y)).map(m => <option key={m} value={m}>{monthName(m)}</option>)}
                                <option value={y}>{y} (año completo)</option>
                              </optgroup>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="kpis" style={{ marginBottom:22, gridTemplateColumns:"repeat(5,1fr)" }}>
                    {(() => {
                      const rFiltered = (reportsMonthFilter === "all" ? enriched : enriched.filter(o => (o.date||"").startsWith(reportsMonthFilter))).filter(o => !o._ventaDirecta);
                      return [
                        { n: rFiltered.length, lbl: "Total", c: "var(--white)" },
                        { n: rFiltered.filter(o => ocStatus(o.items, o.dispatches, o) === "open").length, lbl: "Abiertas", c: "var(--sky)" },
                        { n: rFiltered.filter(o => ocStatus(o.items, o.dispatches, o) === "partial").length, lbl: "Parciales", c: "var(--gold)" },
                        { n: rFiltered.filter(o => ocStatus(o.items, o.dispatches, o) === "toinvoice").length, lbl: "Por Facturar", c: "var(--rose)" },
                        { n: rFiltered.filter(o => ocStatus(o.items, o.dispatches, o) === "closed").length, lbl: "Completadas", c: "var(--lime)" }
                      ].map(({ n, lbl, c }) => (
                        <div key={lbl} className="kpi"><div className="kpi-bar" style={{ background:c }} /><div className="kpi-lbl">{lbl.toUpperCase()}</div><div className="kpi-n" style={{ color:c }}>{n}</div></div>
                      ));
                    })()}
                  </div>
                  {enriched.length === 0 && <div className="empty"><div className="empty-ico">▤</div><p>No hay ordenes aun.</p></div>}
                  {enriched.length > 0 && (() => {
                    const rFiltered = (reportsMonthFilter === "all" ? enriched : enriched.filter(o => (o.date||"").startsWith(reportsMonthFilter))).filter(o => !o._ventaDirecta);
                    const byClient = rFiltered.reduce((acc, oc) => { const k = oc.client; if (!acc[k]) acc[k] = []; acc[k].push(oc); return acc; }, {});
                    const calcPending = oc => oc._closedByMonto ? 0 : oc.items.reduce((s,i) => s + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice), 0);
                    const clientsSorted = Object.entries(byClient).map(([client, ocs]) => {
                      const pending = ocs.reduce((s, o) => s + calcPending(o), 0);
                      return { client, ocs, pending };
                    }).sort((a, b) => b.pending - a.pending);
                    return clientsSorted.map(({ client, ocs }) => {
                      const isExpanded = expandedClients.has("rep-" + client);
                      const MAX_OCS = 4;
                      const sorted = [...ocs].sort((a, b) => calcPending(b) - calcPending(a));
                      const visible = isExpanded ? sorted : sorted.slice(0, MAX_OCS);
                      const hidden = sorted.length - MAX_OCS;
                      return (
                      <div key={client} style={{ marginBottom:28 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                          <div style={{ fontWeight:500, fontSize:16, color:"var(--fog2)" }}>{client}</div>
                          <div style={{ flex:1, height:1, background:"var(--line)" }} />
                          <div style={{ fontSize:9, letterSpacing:2, color:"var(--fog)" }}>{ocs.length} OC{ocs.length !== 1 ? "s" : ""}</div>
                        </div>
                        <div className="rep-grid">
                        {visible.map(oc => {
                    const s = ocStatus(oc.items, oc.dispatches, oc);
                    const tot = oc.items.reduce((a, i) => a + Number(i.qty) * Number(i.unitPrice), 0);
                    const dis = oc.items.reduce((a, i) => a + Number(i.dispatched || 0) * Number(i.unitPrice), 0);
                    const pct = tot > 0 ? Math.min(100, Math.round(dis / tot * 100)) : 0;
                    const d = daysLeft(oc.deliveryDate);
                    const disp = oc.dispatches || [];
                    const pendG = disp.filter(x => x.docType === "guia" && !x.invoiceNumber).length;
                    return (
                      <div className="rep-card" key={oc.id}>
                        <div className="rep-hd">
                          <div>
                            <div className="rep-id">{oc.ocNumber || oc.id}</div>
                          </div>
                          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
                            <span className={"badge " + bCls(s)}><Dot c={s === "open" ? "var(--sky)" : s === "partial" ? "var(--gold)" : s === "toinvoice" ? "var(--rose)" : "var(--lime)"} />{bLbl(s)}</span>
                            {d !== null && d <= 5 && s !== "closed" && s !== "toinvoice" && <span className="badge b-warn"><Dot c="var(--rose)" />{d < 0 ? "Vencida" : d + "d"}</span>}
                            {pendG > 0 && <span className="badge bdoc-guia-pend"><Dot c="var(--gold)" />{pendG} guia{pendG > 1 ? "s" : ""} sin fac.</span>}
                            <button className="btn btn-outline btn-sm" style={{ color:"var(--gold)" }} onClick={() => setShowGestion(oc)}>Gestión</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setShowDetail(oc)}>Detalle →</button>
                          </div>
                        </div>
                        <div>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"var(--fog)", marginBottom:4, letterSpacing:1 }}>
                            <span>AVANCE ECONOMICO</span><span style={{ color:pc(pct) }}>{pct}%</span>
                          </div>
                          <div className="pbar-wrap" style={{ height:5 }}><div className="pbar" style={{ width:pct + "%", background:pc(pct) }} /></div>
                        </div>
                        <div className="rep-stats">
                          <div className="rep-stat"><label>MONTO OC</label><p style={{ color: s === "closed" ? "var(--lime)" : "var(--gold)" }}>{fmtCLP(tot)}</p></div>
                          <div className="rep-stat"><label>DESPACHADO</label><p style={{ color:"var(--lime)" }}>{fmtCLP(dis)}</p></div>
                          <div className="rep-stat"><label>REMANENTE</label><p style={{ color: s === "closed" ? "var(--lime)" : s === "toinvoice" ? "var(--rose)" : "var(--rose)" }}>{fmtCLP(tot - dis)}</p></div>
                          <div className="rep-stat"><label>ENTREGA</label><p style={{ color: s === "closed" ? "var(--fog2)" : d !== null && d <= 0 ? "var(--rose)" : d !== null && d <= 5 ? "var(--gold)" : "var(--fog2)" }}>{oc.deliveryDate || "—"}</p></div>
                          <div className="rep-stat"><label>FACTURAS</label><p style={{ color:"var(--teal)" }}>{disp.filter(x => x.docType === "factura").length}</p></div>
                          <div className="rep-stat"><label>GUIAS</label><p style={{ color:"var(--rose)" }}>{disp.filter(x => x.docType === "guia").length}{pendG > 0 ? <span style={{ color:"var(--gold)", fontSize:10, marginLeft:4 }}>({pendG} pend.)</span> : null}</p></div>
                        </div>
                        <div className="rep-items">
                          {oc.items.filter(it => Number(it.qty) - Number(it.dispatched || 0) > 0).map(it => {
                            const rem = Number(it.qty) - Number(it.dispatched || 0);
                            const p = it.qty > 0 ? Math.min(100, Math.round(Number(it.dispatched || 0) / Number(it.qty) * 100)) : 0;
                            return (
                              <div key={it.id} className="rep-irow">
                                <span style={{ flex:1, color:"var(--fog2)" }}>{it.desc}</span>
                                <span style={{ color:"var(--gold)", width:130, textAlign:"right" }}>{fmtNum(rem)} {it.unit} pendiente</span>
                                <div className="pbar-wrap" style={{ width:66 }}><div className="pbar" style={{ width:p + "%", background:pc(p) }} /></div>
                                <span style={{ width:26, color:"var(--fog)", fontSize:10 }}>{p}%</span>
                              </div>
                            );
                          })}
                          {oc.items.every(it => Number(it.qty) - Number(it.dispatched || 0) <= 0) && (
                            <div style={{ fontSize:10, color:"var(--lime)" }}>✓ Todos los items completamente despachados</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                        </div>
                        {sorted.length > MAX_OCS && (
                          <div style={{ display:"flex", justifyContent:"center", marginTop:10 }}>
                            <button onClick={() => setExpandedClients(prev => { const n = new Set(prev); isExpanded ? n.delete("rep-" + client) : n.add("rep-" + client); return n; })}
                              style={{ background:"none", border:"1px solid var(--line)", borderRadius:6, color:"var(--fog2)", fontSize:10, fontFamily:"var(--fM)", letterSpacing:1, cursor:"pointer", padding:"6px 18px", display:"flex", alignItems:"center", gap:6 }}>
                              {isExpanded ? "▲ Mostrar menos" : hidden + " OC" + (hidden !== 1 ? "s" : "") + " más ▼"}
                            </button>
                          </div>
                        )}
                      </div>
                      );
                    })
                  })()}
                </>
              )}



            </div>
          </main>
        </div>
      </div>

      {showImport && <ImportOCModal onClose={() => setShowImport(false)} onSave={handleSaveOC} apiKey={apiKey} existingOCs={ocs} />}
      {showVentaDirecta && <VentaDirectaModal onClose={() => setShowVentaDirecta(false)} onSave={handleSaveVentaDirecta} existingOCs={ocs} apiKey={apiKey} />}
      {showGestion && (() => { const gc = enriched.find(o => o.id === showGestion.id) || showGestion; return (<GestionModal oc={gc} gestiones={gc.gestiones || []} onClose={() => setShowGestion(null)} onAdd={(text) => handleAddGestion(gc.id, text)} onDel={(gId) => handleDelGestion(gc.id, gId)} isAdmin={isAdmin} currentUserId={user.id} />); })()}
      {showFactoringGestion && (
        <FactoringGestionModal
          facKey={showFactoringGestion.key}
          facLabel={showFactoringGestion.label}
          gestiones={factoringGestiones[showFactoringGestion.key] || []}
          onClose={() => setShowFactoringGestion(null)}
          onAdd={text => handleAddFactoringGestion(showFactoringGestion.key, text)}
          onDel={gId => handleDelFactoringGestion(showFactoringGestion.key, gId)}
          isAdmin={isAdmin}
          currentUserId={user.id}
        />
      )}
        {liveDetail && <OCDetailModal oc={liveDetail} onClose={() => setShowDetail(null)} onAddDispatch={oc => setShowDispatch(oc)} onDelDispatch={handleDelDispatch} onConvert={(ocId, d) => setConvertTarget({ ocId, dispatch: d })} onUpdateDelivery={handleUpdateDelivery} onUpdateClient={handleUpdateClient} onUpdateOCNumber={handleUpdateOCNumber} canDelete={isAdmin} onRequestDel={d => setConfirmDel(d)} currentUserId={user.id} isAdmin={isAdmin} userEmail={user.email} onCerrarPorMonto={handleCerrarPorMonto} />}
      {liveDispOC && <AddDispatchModal oc={liveDispOC} onClose={() => setShowDispatch(null)} onSave={handleSaveDispatch} apiKey={apiKey} isAdmin={isAdmin} ocs={ocs} userEmail={user?.email} />}

      {confirmDel && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setConfirmDel(null)}>
          <div className="modal" style={{ maxWidth:420 }}>
            <div className="modal-hd">
              <div><div className="modal-title" style={{ fontSize:18 }}>{confirmDel.type === "request" ? "Sin permisos" : "Confirmar eliminación"}</div><div className="modal-sub">{confirmDel.label}</div></div>
              <div className="xbtn" onClick={() => setConfirmDel(null)}>✕</div>
            </div>
            {confirmDel.type === "request" ? (
              <>
                <p style={{ fontSize:12, color:"var(--fog2)", margin:"16px 0" }}>No tienes permisos para eliminar. Contacta al administrador para solicitar la eliminación de <strong style={{ color:"var(--white)" }}>{confirmDel.label}</strong>.</p>
                <div style={{ display:"flex", justifyContent:"flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Entendido</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize:12, color:"var(--fog2)", margin:"16px 0" }}>Esta acción no se puede deshacer. ¿Estás seguro?</p>
                <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                  <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
                  <button className="btn btn-rose" onClick={() => confirmDel.type === "oc" ? doDelOC() : doDelDispatch()}>Eliminar →</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {showExport && (
        <div className="overlay">
          <div className="modal modal-xl">
            <div className="modal-hd">
              <div><div className="modal-title">Exportar Datos</div><div className="modal-sub">Copia este JSON y guárdalo como archivo .json</div></div>
              <div className="xbtn" onClick={() => setShowExport(false)}>✕</div>
            </div>
            <div style={{ background:"var(--ink3)", border:"1px solid var(--line)", borderRadius:7, padding:14, marginBottom:14 }}>
              <div style={{ fontSize:9, letterSpacing:2, color:"var(--fog)", marginBottom:8 }}>INSTRUCCIONES</div>
              <div style={{ fontSize:11, color:"var(--fog2)", lineHeight:1.8 }}>
                1. Selecciona todo el texto de abajo (<strong style={{color:"var(--white)"}}>Cmd+A</strong> dentro del área)<br/>
                2. Cópialo (<strong style={{color:"var(--white)"}}>Cmd+C</strong>)<br/>
                3. Abre un editor de texto (TextEdit o similar)<br/>
                4. Pega y guarda como <strong style={{color:"var(--gold)"}}>backup.json</strong>
              </div>
            </div>
            <textarea
              readOnly
              value={showExport}
              onClick={e => e.target.select()}
              style={{ width:"100%", height:320, background:"var(--ink)", border:"1px solid var(--line2)", borderRadius:7, padding:12, fontFamily:"var(--fM)", fontSize:10, color:"var(--fog2)", resize:"none", outline:"none" }}
            />
            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:14 }}>
              <button className="btn btn-gold" onClick={() => { navigator.clipboard.writeText(showExport).then(() => notify("JSON copiado al portapapeles ✓")); }}>Copiar al portapapeles</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={"toast " + toast.type}>{toast.msg}</div>}
    </>
  );
}
