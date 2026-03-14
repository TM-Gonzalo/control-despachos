import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

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

async function extractPDF(b64, type, apiKey) {
  const prompts = {
    oc: `Extrae los datos de esta Orden de Compra. CONTEXTO IMPORTANTE: el receptor de esta OC es siempre "Total Metal" o "Industrial y Comercial Total Metal" (el proveedor). El campo "client" debe ser la empresa DIFERENTE a Total Metal que aparece como emisora o compradora. Busca el nombre del cliente en el encabezado como "Empresa:", "Razon Social:", "De:", "Cliente:", o en el bloque de datos del comprador/emisor. NUNCA uses "Total Metal", "Industrial y Comercial Total Metal" ni variantes como valor de "client". Para el campo "notes": extrae SOLO informacion operativa relevante como nombre de obra, OT, numero de proyecto, forma de pago, lugar de entrega o referencias internas. NO incluyas texto legal, instrucciones de facturacion electronica, terminos y condiciones ni notas de cumplimiento legal. Si no hay notas operativas relevantes, usa null. Responde SOLO JSON sin texto extra ni backticks: {"ocNumber":"string o null","client":"string","date":"YYYY-MM-DD o null","deliveryDate":"YYYY-MM-DD o null","items":[{"desc":"string","unit":"string","qty":0,"unitPrice":0}],"notes":"string o null"}`,
    dispatch: `Extrae los datos de este documento (factura o guia de despacho). El campo "unit" debe ser la unidad de medida (UN, KG, MT, etc), NO el precio. El precio unitario va en "unitPrice". Para facturas, "netTotal" es el monto NETO (sin IVA) y "total" es el monto total con IVA. Extrae el campo "ocNumber" con el numero de OC (busca "OC", "Orden de Compra", "N° OC", "PO", "Purchase Order"). Si el documento es una FACTURA, extrae tambien el campo "gdNumber" con el numero de Guia de Despacho referenciada (busca en la seccion "Referencias a otros Documentos" o "Referencias" el folio de tipo "Guia de Despacho Electronica", "Guia de Despacho" o "GD"). Si no hay GD referenciada, "gdNumber" debe ser null. Responde SOLO JSON sin texto extra ni backticks: {"docNumber":"string o null","docType":"factura o guia","date":"YYYY-MM-DD o null","gdNumber":"string o null","items":[{"desc":"string","unit":"string","qty":0,"unitPrice":0}],"netTotal":0,"total":0}`
  };

  // Intenta primero el proxy seguro (API key server-side).
  // Si falla (ej. dev local sin /api), cae al fetch directo usando apiKey del cliente.
  const payload = {
    system: "Eres un extractor de datos de PDFs. Responde SOLO JSON valido, sin texto adicional.",
    messages: [{ role: "user", content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
      { type: "text", text: prompts[type] }
    ]}]
  };

  let res;
  try {
    res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    // Si el proxy devuelve 404 (dev local sin Edge Function), usar fallback
    if (res.status === 404) throw new Error("proxy_not_found");
  } catch {
    // Fallback: llamada directa con la key del cliente (solo dev local)
    if (!apiKey) throw new Error("No hay API Key configurada");
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({ ...payload, model: "claude-sonnet-4-20250514", max_tokens: 1000 })
    });
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content.map(c => c.text || "").join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
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
const fmtCLP = n => "$" + Number(n || 0).toLocaleString("es-CL");
const fmtNum = n => Number(n || 0).toLocaleString("es-CL");
const daysLeft = d => {
  if (!d) return null;
  return Math.round((new Date(d) - new Date(today())) / 86400000);
};
const ocStatus = (items, dispatches) => {
  if (!items || !items.length) return "open";
  const tot = items.reduce((s, i) => s + Number(i.qty), 0);
  const dis = items.reduce((s, i) => s + Number(i.dispatched || 0), 0);
  if (dis === 0) return "open";
  if (dis < tot) return "partial";
  // 100% despachado — revisar si hay guías sin factura
  const disp = dispatches || [];
  const pendingGuias = disp.filter(d => d.docType === "guia" && !d.invoiceNumber).length;
  return pendingGuias > 0 ? "toinvoice" : "closed";
};
const autoMatch = (desc, ocItems) => {
  const n = s => s.toLowerCase().trim();
  const exact = ocItems.find(i => n(i.desc) === n(desc));
  if (exact) return exact.id;
  const partial = ocItems.find(i => n(desc).includes(n(i.desc)) || n(i.desc).includes(n(desc)));
  return partial ? partial.id : null;
};
const pc = p => p >= 100 ? "var(--lime)" : p >= 50 ? "var(--gold)" : "var(--sky)";
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
html,body{height:100%;background:var(--ink);color:var(--white);font-family:var(--fM);font-size:13px}
.app{display:flex;height:100vh;overflow:hidden;width:100%}
.rail{width:210px;background:var(--ink2);border-right:1px solid var(--line);display:flex;flex-direction:column;flex-shrink:0}
.rail-brand{padding:20px 18px 16px;border-bottom:1px solid var(--line)}
.rail-name{font-family:var(--fS);font-size:17px;color:var(--gold);line-height:1.15;font-style:italic}
.rail-tm{font-size:9px;letter-spacing:2px;color:var(--gold);opacity:.6;margin-top:1px}
.rail-sub{font-size:8px;letter-spacing:2.5px;color:var(--fog);margin-top:5px}
.rail-nav{padding:10px 0;flex:1}
.rail-sec{font-size:8px;letter-spacing:2.5px;color:var(--fog);padding:12px 18px 4px}
.rail-item{display:flex;align-items:center;gap:9px;padding:9px 18px;font-size:11px;color:var(--fog2);cursor:pointer;border-left:2px solid transparent;transition:.12s}
.rail-item:hover{color:var(--white);background:var(--ink3)}
.rail-item.on{color:var(--gold);border-left-color:var(--gold);background:rgba(232,184,75,.06)}
.rail-foot{padding:13px 18px;border-top:1px solid var(--line)}
.rail-user{font-size:10px;color:var(--fog2)}
.rail-user strong{display:block;color:var(--white);margin-bottom:2px}
.rail-logout{font-size:9px;color:var(--fog);cursor:pointer;background:none;border:none;font-family:var(--fM);letter-spacing:1px;margin-top:5px;display:block;padding:0}
.rail-logout:hover{color:var(--rose)}
.online-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);border-radius:20px;padding:2px 8px;font-size:8px;letter-spacing:0.8px;color:var(--lime);font-family:var(--fM);margin-bottom:6px}
.online-dot{width:5px;height:5px;border-radius:50%;background:var(--lime);box-shadow:0 0 4px var(--lime);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
.dash-copyright{text-align:center;padding:28px 0 10px;font-size:9px;color:var(--fog2);letter-spacing:1.2px;font-family:var(--fM);opacity:0.55}
.body{flex:1;min-width:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}.body::-webkit-scrollbar{width:5px}.body::-webkit-scrollbar-thumb{background:var(--line2);border-radius:99px}
.page{padding:26px 30px;width:100%;box-sizing:border-box}
.ph{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px}
.pt{font-family:var(--fS);font-size:32px;font-style:italic;color:var(--white);line-height:1}
.pt em{color:var(--gold)}
.pm{font-size:9px;letter-spacing:2px;color:var(--fog);margin-top:4px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:22px}
.kpi{background:var(--ink2);border:1px solid var(--line);border-radius:9px;padding:15px 17px;position:relative;overflow:hidden}
.kpi-bar{position:absolute;top:0;left:0;right:0;height:2px;border-radius:9px 9px 0 0}
.kpi-lbl{font-size:8px;letter-spacing:2.5px;color:var(--fog);margin-bottom:8px}
.kpi-n{font-family:var(--fS);font-size:38px;line-height:1}
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
.tbl-card{background:var(--ink2);border:1px solid var(--line);border-radius:9px;overflow:hidden;overflow-x:auto;scrollbar-width:none}.tbl-card::-webkit-scrollbar{display:none}.tbl-card table{min-width:900px}
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
.cli-totals{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);align-items:end}
.cli-total{background:var(--ink2);padding:12px 16px}
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
  if (doc.docType === "factura") {
    return <span className="badge bdoc-factura"><Dot c="var(--teal)" />Factura {doc.number}</span>;
  }
  if (doc.invoiceNumber) {
    return <span className="badge bdoc-guia"><Dot c="var(--rose)" />Guia {doc.number} <span style={{ color:"var(--teal)", marginLeft:4 }}>Fac. {doc.invoiceNumber}</span></span>;
  }
  return <span className="badge bdoc-guia-pend"><Dot c="var(--gold)" />Guia {doc.number} <span style={{ color:"var(--fog)", marginLeft:4, fontSize:8 }}>sin factura</span></span>;
}

function UploadZone({ onFile, loading, label }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const handle = f => { if (f && f.type === "application/pdf") onFile(f); };
  return (
    <div
      className={"drop-zone" + (drag ? " drag" : "")}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onClick={() => !loading && ref.current.click()}
    >
      <div className="drop-ico">{loading ? "⏳" : "📄"}</div>
      {loading
        ? <div className="spin-row"><div className="spin" /> Analizando con IA...</div>
        : <div className="drop-lbl">{label || "Arrastra el PDF aqui o"} <strong>haz clic para seleccionar</strong><small>PDF max 10 MB</small></div>
      }
      <input ref={ref} type="file" accept=".pdf" style={{ display:"none" }} onChange={e => handle(e.target.files[0])} />
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
          <input type="email" placeholder="correo@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="fg" style={{ marginBottom:18 }}>
          <label>CONTRASENA</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <button className="btn btn-gold" style={{ width:"100%", justifyContent:"center" }} onClick={submit} disabled={loading}>
          {loading ? <><div className="spin" />Procesando...</> : tab === "login" ? "Ingresar →" : "Crear cuenta →"}
        </button>
      </div>
    </div>
  );
}

function ImportOCModal({ onClose, onSave, apiKey }) {
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
        const d = await extractPDF(b64, "oc", apiKey);
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
        date: entry.data.date || today(), deliveryDate: entry.data.deliveryDate || "",
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
    <div className="overlay">
      <div className="modal modal-xl">
        <div className="modal-hd">
          <div>
            <div className="modal-title">Importar OC{queue.length > 1 ? "s" : ""}</div>
            <div className="modal-sub">{queue.length > 0 ? queue.length + " archivo" + (queue.length > 1 ? "s" : "") + " seleccionado" + (queue.length > 1 ? "s" : "") : "Orden de compra del cliente"}</div>
          </div>
          <div className="xbtn" onClick={onClose}>✕</div>
        </div>

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
              <div className="drop-lbl">Arrastra uno o varios PDFs aquí o <strong>haz clic para seleccionar</strong><small>Múltiples archivos con Ctrl/Cmd · PDF max 10 MB c/u</small></div>
              <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display:"none" }} onChange={e => handleFiles(e.target.files)} />
            </div>
            {err && <div style={{ color:"var(--rose)", fontSize:11, marginTop:9 }}>⚠ {err}</div>}
          </>
        )}

        {/* STEP 1: queue overview */}
        {queue.length > 0 && current === null && (
          <>
            <div style={{ marginBottom:14 }}>
              {queue.map((e, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"var(--ink3)", borderRadius:7, marginBottom:6, border:"1px solid var(--line)" }}>
                  <span style={{ fontSize:13, color:statusColor(e.status) }}>{statusIcon(e.status)}</span>
                  <span style={{ flex:1, fontSize:11, color:"var(--fog2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.name}</span>
                  {e.status === "processing" && <span style={{ fontSize:10, color:"var(--gold)" }}>Analizando...</span>}
                  {e.status === "done" && <button className="btn btn-sky btn-sm" onClick={() => startReview(i)}>Revisar →</button>}
                  {e.status === "saved" && <span style={{ fontSize:10, color:"var(--lime)" }}>Guardada ✓</span>}
                  {e.status === "error" && <span style={{ fontSize:10, color:"var(--rose)", wordBreak:"break-all", whiteSpace:"normal" }}>Error: {e.err}</span>}
                </div>
              ))}
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
              {[["N° OC", data.ocNumber], ["Cliente", data.client], ["Fecha", data.date], ["Entrega", data.deliveryDate], ["Notas", data.notes]].map(([k, v]) => (
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

function AddDispatchModal({ oc, onClose, onSave, apiKey, createdBy }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [ext, setExt] = useState(null);
  const [items, setItems] = useState([]);
  const [map, setMap] = useState({});
  const [splitPrice, setSplitPrice] = useState({}); // {idx: true} = subdivisión de precio, no suma qty
  const [num, setNum] = useState("");
  const [date, setDate] = useState(today());
  const [docType, setDocType] = useState("guia");
  const [savedCount, setSavedCount] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const [ocMismatch, setOcMismatch] = useState(null); // { pdfOC, thisOC }
  const [bsaleSearch, setBsaleSearch] = useState("");
  const [bsaleResult, setBsaleResult] = useState(null); // { doc } | null
  const [bsaleLoading, setBsaleLoading] = useState(false);
  const [bsaleErr, setBsaleErr] = useState(null);

  const searchBsale = async (num) => {
    if (!num || num.length < 2) { setBsaleResult(null); return; }
    setBsaleLoading(true); setBsaleErr(null); setBsaleResult(null);
    try {
      // Buscar en GDs y Facturas por número exacto
      const [gds, facs] = await Promise.all([
        fetchBsale("/documents.json", { documentTypeId: "8", number: num }),
        fetchBsale("/documents.json", { documentTypeId: "1", number: num })
      ]);
      const gdMatch = (gds.items || []).find(d => String(d.number) === String(num));
      const facMatch = (facs.items || []).find(d => String(d.number) === String(num));
      const match = gdMatch ? { ...gdMatch, _tipo: "guia" } : facMatch ? { ...facMatch, _tipo: "factura" } : null;
      setBsaleResult(match);
      if (!match) setBsaleErr("No se encontró ningún documento con ese número");
    } catch(e) { setBsaleErr(e.message); }
    setBsaleLoading(false);
  };

  const handleSelectBsale = async (doc) => {
    setErr(null); setLoading(true);
    try {
      const tipo = doc._tipo === "factura" ? "factura" : "guia";
      const num = String(doc.number || "");
      const date = doc.generationDate ? new Date(doc.generationDate * 1000).toISOString().slice(0, 10) : today();
      const netTotal = doc.netAmount || 0;
      const total = doc.totalAmount || 0;

      // Obtener detalles (items) del documento desde Bsale
      let its = [];
      try {
        const detailsData = await fetchBsale("/documents/" + doc.id + "/details.json");
        const detailItems = detailsData.items || [];
        its = detailItems.map((it, i) => ({
          id: i + 1,
          desc: it.comment || it.variantDescription || it.description || "",
          unit: it.unitAbbreviation || "UN",
          qty: Number(it.quantity || 1),
          unitPrice: Number(it.netUnitValue || it.unitValue || 0)
        }));
      } catch(e) { console.warn("No se pudieron cargar detalles:", e); }

      // Obtener referencias del documento (OC, GD vinculada)
      let gdNumber = null;
      try {
        const refsData = await fetchBsale("/documents/" + doc.id + "/references.json");
        const refs = refsData.items || [];
        const gdRef = refs.find(r => r.documentTypeId === 8 || String(r.documentTypeName || "").toLowerCase().includes("guia"));
        if (gdRef) gdNumber = String(gdRef.number || "");
      } catch(e) {}

      const d = { docNumber: num, docType: tipo, date, items: its, netTotal, total, gdNumber };

      setExt(d); setNum(d.docNumber); setDate(d.date);
      setDocType(tipo);
      const its2 = its.map((it, i) => ({ ...it, id: i + 1 }));
      setItems(its2);
      const am = {};
      its2.forEach((it, i) => { am[i] = autoMatch(it.desc, oc.items) || "NONE"; });
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
      const d = await extractPDF(b64, "dispatch", apiKey);
      setExt(d); setNum(d.docNumber || ""); setDate(d.date || today());
      setDocType(d.docType === "factura" ? "factura" : "guia");
      const its = (d.items || []).map((it, i) => ({ ...it, id: i + 1 }));
      setItems(its);
      const am = {};
      its.forEach((it, i) => { am[i] = autoMatch(it.desc, oc.items) || "NONE"; });
      setMap(am);
      // Validar OC del PDF vs OC actual (normalizar: sin puntos ni espacios)
      if (d.ocNumber) {
        const norm = s => String(s).replace(/[\s.]/g, "");
        const pdfOC = norm(d.ocNumber);
        const thisOC = norm(oc.ocNumber || "");
        if (thisOC && pdfOC && !pdfOC.includes(thisOC) && !thisOC.includes(pdfOC)) {
          setOcMismatch({ pdfOC: d.ocNumber, thisOC: oc.ocNumber });
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
          // Vincular factura a GD existente sin crear despacho nuevo
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
      await onSave(oc.id, { id: "DISP-" + Date.now(), number: num, date, docType, invoiceNumber: null, total: ext?.total || dispTotal || 0, netTotal: ext?.netTotal || dispTotal || 0, items: mapped, createdBy: createdBy });
      // resetear para agregar otro despacho sin cerrar
      setSavedCount(c => c + 1);
      setLastSaved({ num, docType });
      setStep(0); setNum(""); setDate(today()); setDocType("guia"); setItems([]); setMap({}); setSplitPrice({}); setExt(null); setErr(null);
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
        <Steps labels={["Subir PDF", "Revisar", "Mapear items"]} current={step} />
        {ocMismatch && (
          <div style={{ background:"rgba(255,90,90,.1)", border:"1px solid var(--rose)", borderRadius:8, padding:"14px 18px", marginBottom:16 }}>
            <div style={{ color:"var(--rose)", fontWeight:600, marginBottom:6 }}>⚠ {docType === "factura" ? "Factura" : "Guía"} rechazada — OC no coincide</div>
            <div style={{ fontSize:12, color:"var(--fog2)", lineHeight:1.6 }}>
              El PDF corresponde a la OC <strong style={{ color:"var(--white)" }}>{ocMismatch.pdfOC}</strong>, no a la OC <strong style={{ color:"var(--white)" }}>{ocMismatch.thisOC}</strong>.<br/>
              El ingreso fue anulado. Verifica que estás subiendo el documento correcto.
            </div>
            <div style={{ marginTop:12 }}>
              <button className="btn btn-rose btn-sm" onClick={() => { setOcMismatch(null); }}>Cerrar</button>
            </div>
          </div>
        )}
        {step === 0 && (
          <>
            {lastSaved && (
              <div style={{ background:"rgba(127,255,90,.08)", border:"1px solid rgba(127,255,90,.2)", borderRadius:7, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ color:"var(--lime)", fontSize:14 }}>✓</span>
                <span style={{ fontSize:12, color:"var(--lime)" }}>{lastSaved.linked ? "Factura N° " + lastSaved.num + " vinculada a GD existente." : (lastSaved.docType === "factura" ? "Factura" : "Guia") + " N° " + lastSaved.num + " registrada."}</span>
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
                const alreadyAdded = (oc.dispatches || []).some(d => String(d.number||"") === num || String(d.invoiceNumber||"") === num);
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
              <div style={{ fontSize:9, color:"var(--fog)", marginTop:10, letterSpacing:1 }}>O sube un PDF manualmente:</div>
            </div>
            <UploadZone onFile={handleFile} loading={loading} label={lastSaved ? "Subir otro documento o" : "Arrastra la factura o guia aqui o"} />
            {err && <div style={{ color:"var(--rose)", fontSize:11, marginTop:9 }}>⚠ {err}</div>}
          </>
        )}
        {step === 1 && (
          <>
            <div className="ex-box">
              <div className="ex-ok">✓ DOCUMENTO DETECTADO</div>
              <div className="ex-row"><span className="ex-k">Tipo</span><span className="ex-v" style={{ color: docType === "factura" ? "var(--teal)" : "var(--rose)" }}>{docType === "factura" ? "Factura" : "Guia de Despacho"}</span></div>
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
                </select>
              </div>
              <div className="fg"><label>N° DOCUMENTO *</label><input value={num} onChange={e => setNum(e.target.value)} placeholder={docType === "factura" ? "Ej: 12345" : "Ej: 8821"} /></div>
              <div className="fg"><label>FECHA</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              {docType === "factura" && <div className="fg"><label>MONTO NETO FACTURA *</label><input type="number" value={ext?.netTotal || 0} onChange={e => setExt(p => ({ ...p, netTotal: Number(e.target.value) }))} placeholder="Monto neto sin IVA" /></div>}
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
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setStep(0)}>← Volver</button>
              <button className="btn btn-gold" onClick={() => setStep(2)}>Mapear items →</button>
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
                const sharedWithOther = matched && Object.entries(map).some(([k, v]) => Number(k) !== i && v === val);
                const isSplit = !!splitPrice[i];
                return (
                  <tr key={it.id}>
                    <td>
                      <div style={{ fontWeight:500, fontSize:12 }}>{it.desc}</div>
                      <div style={{ fontSize:9, color:"var(--sky)", marginTop:2 }}>Cant: {fmtNum(it.qty)} {it.unit}</div>
                      {sharedWithOther && (
                        <label style={{ display:"flex", alignItems:"center", gap:5, marginTop:5, cursor:"pointer", fontSize:9, letterSpacing:1, color: isSplit ? "var(--rose)" : "var(--gold)" }}>
                          <input type="checkbox" checked={isSplit} onChange={e => setSplitPrice(p => ({ ...p, [i]: e.target.checked }))}
                            style={{ accentColor:"var(--rose)", width:11, height:11 }} />
                          {isSplit ? "✓ SUBDIVISIÓN DE PRECIO — qty no suma" : "⚠ Mismo item que otra línea — ¿subdivisión de precio?"}
                        </label>
                      )}
                    </td>
                    <td className="map-arrow">→</td>
                    <td>
                      <select className={"map-sel" + (matched ? " ok" : " warn")} value={val || "NONE"} onChange={e => {
                        const newVal = e.target.value;
                        setMap(p => ({ ...p, [i]: newVal }));
                        if (newVal === "NONE") {
                          setSplitPrice(p => ({ ...p, [i]: false }));
                        } else {
                          // Si este item ya está mapeado en otra línea, auto-marcar como split
                          const alreadyUsed = Object.entries(map).some(([k, v]) => Number(k) !== i && v === newVal);
                          if (alreadyUsed) setSplitPrice(p => ({ ...p, [i]: true }));
                        }
                      }}>
                        <option value="NONE">— Sin vincular —</option>
                        {oc.items
                          .filter(o => {
                            const pend = Number(o.qty) - Number(o.dispatched || 0);
                            if (docType !== "factura" && pend <= 0) return false;
                            // Siempre mostrar todos — el usuario puede elegir el mismo item para split
                            return true;
                          })
                          .map(o => {
                            const pend = Number(o.qty) - Number(o.dispatched || 0);
                            const alreadyMapped = Object.entries(map).some(([k, v]) => Number(k) !== i && v !== "NONE" && String(v) === String(o.id));
                            const label = alreadyMapped ? "⚑ SPLIT — " : "";
                            return <option key={o.id} value={o.id}>{label}{o.desc} · {pend > 0 ? fmtNum(pend) + " " + o.unit + " pend." : "✓ despachado"}</option>;
                          })}
                      </select>
                      {!matched && <div className="map-note">⚠ No descontara del remanente</div>}
                    </td>
                    <td><input type="number" className="map-qty" value={it.qty} onChange={e => updItem(i, "qty", e.target.value)} style={{ opacity: isSplit ? 0.4 : 1 }} /></td>
                    <td><button className="btn btn-rose btn-sm" title="Eliminar item" onClick={() => {
                      setItems(p => p.filter((_, j) => j !== i));
                      setMap(p => { const n = {}; Object.keys(p).filter(k => Number(k) !== i).forEach((k, j) => n[j] = p[Number(k) > i ? Number(k) - 1 : Number(k)]); return n; });
                    }}>✕</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
            {err && <div style={{ color:"var(--rose)", fontSize:11, marginBottom:11 }}>⚠ {err}</div>}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Volver</button>
              <button className="btn btn-gold" onClick={() => {
                if (docType === "factura") {
                  const sinMapear = items.filter((_, i) => !map[i] || map[i] === "NONE").length;
                  if (sinMapear > 0) { setErr("Una factura debe tener todos sus items vinculados. Faltan " + sinMapear + " por vincular."); return; }
                }
                setErr(null); setStep(3);
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
                {ext?.netTotal && <div style={{ fontSize:10, color:"var(--fog2)" }}>Neto factura: {fmtCLP(ext.netTotal)}</div>}
              </div>
            </div>
            {err && <div style={{ color:"var(--rose)", fontSize:11, marginBottom:11, marginTop:8 }}>⚠ {err}</div>}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Corregir mapeo</button>
              <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? <><div className="spin" />Guardando...</> : "Confirmar y Registrar " + (docType === "factura" ? "Factura" : "Guia") + " ✓"}</button>
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

function OCDetailModal({ oc, onClose, onAddDispatch, onDelDispatch, onConvert, onUpdateDelivery, onUpdateClient, canDelete, onRequestDel, currentUserId, isAdmin }) {
  const [docFilter, setDocFilter] = useState("all");
  const [editingDate, setEditingDate] = useState(false);
  const [dateVal, setDateVal] = useState(oc.deliveryDate || "");
  const [editingClient, setEditingClient] = useState(false);
  const [clientVal, setClientVal] = useState(oc.client || "");
  const st = ocStatus(oc.items, oc.dispatches);
  const totAmt = oc.items.reduce((s, i) => s + Number(i.qty) * Number(i.unitPrice), 0);
  const disAmt = oc.items.reduce((s, i) => s + Number(i.dispatched || 0) * Number(i.unitPrice), 0);
  const days = daysLeft(oc.deliveryDate);
  const dayColor = (st === "closed" || st === "toinvoice") ? "var(--fog2)" : days !== null && days <= 0 ? "var(--rose)" : days !== null && days <= 5 ? "var(--gold)" : "var(--white)";
  const dispatches = oc.dispatches || [];
  const filteredDisp = dispatches.filter(d => docFilter === "all" ? true : d.docType === docFilter);
  const pendingGuias = dispatches.filter(d => d.docType === "guia" && !d.invoiceNumber).length;
  const pctGlobal = totAmt > 0 ? Math.round(disAmt / totAmt * 100) : 0;

  return (
    <div className="overlay">
      <div className="modal modal-xl">
        <div className="modal-hd">
          <div>
            <div className="modal-title">{oc.ocNumber || oc.id}</div>
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
                  <span onClick={() => { setEditingClient(true); setClientVal(oc.client || ""); }} style={{ cursor:"pointer", color:"var(--fog)", fontSize:9, letterSpacing:1, background:"var(--ink3)", border:"1px solid var(--line2)", borderRadius:4, padding:"1px 5px", marginLeft:4 }}>✎</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display:"flex", gap:7, alignItems:"center" }}>
            <span className={"badge " + bCls(st)}><Dot c={st === "open" ? "var(--sky)" : st === "partial" ? "var(--gold)" : "var(--lime)"} />{bLbl(st)}</span>
            <div className="xbtn" onClick={onClose}>✕</div>
          </div>
        </div>
        <div className="dg">
          <div className="df"><label>FECHA OC</label><p>{oc.date || "—"}</p></div>
          <div className="df"><label style={{ display:"flex", alignItems:"center", gap:6 }}>FECHA ENTREGA <span onClick={() => { setEditingDate(true); setDateVal(oc.deliveryDate || ""); }} style={{ cursor:"pointer", color:"var(--fog)", fontSize:9, letterSpacing:1, background:"var(--ink3)", border:"1px solid var(--line2)", borderRadius:4, padding:"1px 5px" }}>✎ editar</span></label>
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
          <div className="df"><label>MONTO OC</label><p style={{ color:"var(--gold)", fontWeight:600 }}>{fmtCLP(totAmt)}</p></div>
          <div className="df"><label>DESPACHADO</label><p style={{ color:"var(--lime)", fontWeight:600 }}>{fmtCLP(disAmt)}</p></div>
          <div className="df"><label>REMANENTE</label><p style={{ color:"var(--rose)", fontWeight:600 }}>{fmtCLP(totAmt - disAmt)}</p></div>
        </div>
        {oc.notes && <div style={{ fontSize:11, color:"var(--fog2)", marginBottom:16, padding:"9px 12px", background:"var(--ink3)", borderRadius:6, borderLeft:"2px solid var(--line2)" }}>📝 {oc.notes}</div>}
        <div className="slbl">Remanente por item</div>
        <div className="tbl-card" style={{ marginBottom:18 }}>
          <table>
            <thead><tr><th>DESCRIPCION</th><th>UNIDAD</th><th>OC</th><th>DESPACHADO</th><th>REMANENTE</th><th>AVANCE</th></tr></thead>
            <tbody>{oc.items.map(it => {
              const rem = Number(it.qty) - Number(it.dispatched || 0);
              const pct = it.qty > 0 ? Math.min(100, Math.round(Number(it.dispatched || 0) / Number(it.qty) * 100)) : 0;
              return (
                <tr key={it.id}>
                  <td style={{ fontWeight:500 }}>{it.desc}</td>
                  <td style={{ color:"var(--fog)" }}>{it.unit}</td>
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
          <button className="btn btn-sky btn-sm" onClick={() => onAddDispatch(oc)}>+ Registrar despacho</button>
        </div>
        {dispatches.length > 0 && (
          <div className="doc-tabs">
            {[["all","Todos"],["factura","Facturas"],["guia","Guias"]].map(([v, l]) => (
              <div key={v} className={"doc-tab" + (docFilter === v ? " on" : "")} onClick={() => setDocFilter(v)}>{l}</div>
            ))}
          </div>
        )}
        {dispatches.length === 0
          ? <div style={{ textAlign:"center", padding:"16px", color:"var(--fog)", fontSize:11 }}>Sin documentos registrados aun</div>
          : filteredDisp.length === 0
            ? <div style={{ textAlign:"center", padding:"14px", color:"var(--fog)", fontSize:11 }}>No hay documentos de este tipo</div>
            : <div className="disp-list">{filteredDisp.map(d => (
              <div className="disp-card" key={d.id}>
                <div className="disp-hd">
                  <DocBadge doc={d} />
                  <div className="disp-meta">
                    <span style={{ fontSize:10, color:"var(--fog)" }}>{d.date}</span>
                    {d.docType === "guia" && !d.invoiceNumber && <button className="btn btn-teal btn-sm" onClick={() => onConvert(oc.id, d)}>→ Vincular factura</button>}
                    {(isAdmin || d.createdBy === currentUserId) ? <button className="btn btn-rose btn-sm" onClick={() => onDelDispatch(oc.id, d.id)}>Eliminar</button> : <button className="btn btn-outline btn-sm" style={{ color:"var(--fog)", fontSize:9 }} onClick={() => onRequestDel({ type:"request", label: (d.docType === "factura" ? "Factura" : "Guia") + " N° " + d.number })}>Eliminar</button>}
                  </div>
                </div>
                {(d.items || []).map((it, i) => {
                  const mapped = oc.items.find(o => o.id === it.ocItemId);
                  return (
                    <div className="disp-row" key={i}>
                      <span>{it.desc}{mapped ? <span style={{ fontSize:9, color:"var(--lime)", marginLeft:6 }}>→ {mapped.desc}</span> : <span style={{ fontSize:9, color:"var(--fog)", marginLeft:6 }}>sin vincular</span>}</span>
                      <span style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span style={{ color:"var(--fog)", fontSize:10 }}>{fmtNum(it.qty)} {it.unit}</span>
                        {d.docType === "factura" && (() => {
                          const price = Number(it.unitPrice || (mapped ? mapped.unitPrice : 0) || 0);
                          return price > 0 ? <span style={{ color:"var(--gold)", fontWeight:600 }}>{fmtCLP(it.qty * price)}</span> : null;
                        })()}
                      </span>
                    </div>
                  );
                })}
                {d.docType === "factura" && (() => {
                  const neto = Number(d.netTotal || 0) || (d.items || []).reduce((s, it) => {
                    return s + (Number(it.qty)||0) * Number(it.unitPrice || 0);
                  }, 0);
                  return neto > 0 ? (
                    <div style={{ display:"flex", justifyContent:"flex-end", borderTop:"1px solid var(--line)", marginTop:6, paddingTop:6 }}>
                      <span style={{ fontSize:10, color:"var(--fog)", marginRight:8, letterSpacing:1 }}>NETO FACTURA</span>
                      <span style={{ color:"var(--gold)", fontWeight:600, fontSize:13 }}>{fmtCLP(neto)}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            ))}</div>
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
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
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

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("dc_user")); } catch(e) { return null; } });
  const [ocs, setOcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [fst, setFst] = useState("all");
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_ANTHROPIC_API_KEY || localStorage.getItem("dc_apikey") || "");
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showDispatch, setShowDispatch] = useState(null);
  const [showGestion, setShowGestion] = useState(null); // oc
  const [convertTarget, setConvertTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // { type:"oc"|"dispatch", ocId, dispId, label }
  const [dashSort, setDashSort] = useState({ col: null, dir: 1 });
  const [ordSort, setOrdSort] = useState({ col: null, dir: 1 });
  const [onlineCount, setOnlineCount] = useState(1);

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

  const enriched = ocs.map(oc => ({
    ...oc,
    items: oc.items.map(it => ({
      ...it,
      dispatched: (oc.dispatches || []).reduce((s, d) => {
        const matched = d.items.filter(ii => (ii.ocItemId && ii.ocItemId === it.id) || (!ii.ocItemId && ii.desc.toLowerCase().trim() === it.desc.toLowerCase().trim()));
        // Si hay múltiples líneas mapeadas al mismo item, ignorar las marcadas como splitPrice
        // Si todas son splitPrice (caso raro), contar solo la primera
        const toCount = matched.filter(ii => !ii.splitPrice);
        const effective = toCount.length > 0 ? toCount : matched.slice(0, 1);
        return s + effective.reduce((a, ii) => a + Number(ii.qty), 0);
      }, 0)
    }))
  }));

  const persist = async updated => { setOcs(updated); await saveOCs(updated); };

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
    if (oc.ocNumber && oc.ocNumber.trim()) {
      const norm = s => s.replace(/[\.\s]/g, "").toLowerCase();
      const dupe = ocs.find(o => o.ocNumber && norm(o.ocNumber) === norm(oc.ocNumber));
      if (dupe) throw new Error("La OC N° " + oc.ocNumber + " ya existe (cliente: " + dupe.client + ").");
    }
    await persist([oc, ...ocs]);
    if (!keepOpen) setShowImport(false);
    notify("OC importada ✓");
  };


  const handleSaveDispatch = async (ocId, dispatch) => {
    const oc = ocs.find(o => o.id === ocId);
    const existing = (oc?.dispatches || []);

    // Caso especial: vincular factura a GD existente sin crear despacho nuevo
    if (dispatch._gdLink) {
      const { gdId, invoiceNumber, invoiceDate, netTotal, total } = dispatch;
      const updated = ocs.map(o => o.id === ocId ? {
        ...o,
        dispatches: (o.dispatches || []).map(d => d.id === gdId
          ? { ...d, invoiceNumber, invoiceDate, netTotal: netTotal || d.netTotal, total: total || d.total }
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
      if (dupe) throw new Error((dispatch.docType === "factura" ? "Factura" : "Guia") + " N° " + dispatch.number + " ya está registrada en esta OC.");
    }
    const updated = ocs.map(o => o.id === ocId ? { ...o, dispatches: [...(o.dispatches || []), dispatch] } : o);
    await persist(updated);
    if (showDetail && showDetail.id === ocId) {
      const live = enriched.find(o => o.id === ocId);
      setShowDetail({ ...live, dispatches: [...(live.dispatches || []), dispatch] });
    }
    // no cerrar el modal — se resetea internamente para agregar otro
    notify((dispatch.docType === "factura" ? "Factura" : "Guia") + " registrada ✓");
  };

  const handleDelDispatch = (ocId, dispId) => {
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
    if (showDetail && showDetail.id === ocId) setShowDetail(d => ({ ...d, client: newClient }));
    notify("Cliente actualizado ✓");
  };

  const handleUpdateDelivery = async (ocId, newDate) => {
    const updated = ocs.map(o => o.id === ocId ? { ...o, deliveryDate: newDate } : o);
    await persist(updated);
    if (showDetail && showDetail.id === ocId) setShowDetail(d => ({ ...d, deliveryDate: newDate }));
    notify("Fecha de entrega actualizada ✓");
  };

  const total = enriched.length;
  const open = enriched.filter(o => ocStatus(o.items, o.dispatches) === "open").length;
  const closed = enriched.filter(o => ocStatus(o.items, o.dispatches) === "closed").length;
  const alerts = enriched.filter(o => { const d = daysLeft(o.deliveryDate); return d !== null && d <= 5 && ocStatus(o.items, o.dispatches) !== "closed"; });
  const pendingGuias = enriched.reduce((s, o) => s + (o.dispatches || []).filter(d => d.docType === "guia" && !d.invoiceNumber).length, 0);

  const filtered = enriched.filter(o => {
    const s = search.toLowerCase();
    return (!s || o.id.toLowerCase().includes(s) || o.client.toLowerCase().includes(s) || (o.ocNumber || "").toLowerCase().includes(s))
      && (fst === "all" || ocStatus(o.items, o.dispatches) === fst);
  });

  const liveDetail = showDetail ? enriched.find(o => o.id === showDetail.id) || showDetail : null;
  const liveDispOC = showDispatch ? enriched.find(o => o.id === showDispatch.id) || showDispatch : null;

  const mkSort = (state, setState) => (col) => setState(s => ({ col, dir: s.col === col ? -s.dir : 1 }));
  const calcPct = oc => { const tot = oc.items.reduce((a,i) => a+Number(i.qty),0); const dis = oc.items.reduce((a,i) => a+Number(i.dispatched||0),0); return tot>0?Math.min(100,Math.round(dis/tot*100)):0; };
  const statusOrder = { open:0, partial:1, toinvoice:2, closed:3 };
  const applySort = (arr, { col, dir }) => {
    if (!col) return arr;
    return [...arr].sort((a, b) => {
      let av = col === "ocNumber" ? (a.ocNumber || a.id) : col === "client" ? a.client : col === "date" ? (a.date || "") : col === "deliveryDate" ? (a.deliveryDate || "") : col === "pct" ? calcPct(a) : col === "monto" ? a.items.reduce((s,i) => s+Number(i.qty)*Number(i.unitPrice),0) : col === "pendiente" ? a.items.reduce((s,i) => s+(Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice),0) : col === "status" ? (statusOrder[ocStatus(a.items, a.dispatches)] ?? 0) : 0;
      let bv = col === "ocNumber" ? (b.ocNumber || b.id) : col === "client" ? b.client : col === "date" ? (b.date || "") : col === "deliveryDate" ? (b.deliveryDate || "") : col === "pct" ? calcPct(b) : col === "monto" ? b.items.reduce((s,i) => s+Number(i.qty)*Number(i.unitPrice),0) : col === "pendiente" ? b.items.reduce((s,i) => s+(Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice),0) : col === "status" ? (statusOrder[ocStatus(b.items, b.dispatches)] ?? 0) : 0;
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
          <aside className="rail">
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
              <div className={"rail-parent" + (view === "reports" || view === "clients" || view === "monthly" || view === "pending" ? " on" : "")}><span>▤</span>Reportes</div>
              <div className={"rail-item-sub" + (view === "reports" ? " on" : "")} onClick={() => setView("reports")}>Por OC</div>
              <div className={"rail-item-sub" + (view === "clients" ? " on" : "")} onClick={() => setView("clients")}>Por Cliente</div>
              <div className={"rail-item-sub" + (view === "monthly" ? " on" : "")} onClick={() => setView("monthly")}>Por Facturas</div>
              <div className={"rail-item-sub" + (view === "pending" ? " on" : "")} onClick={() => setView("pending")}>Pendientes</div>
            </nav>
            <div className="rail-foot">
              <div className="online-badge"><span className="online-dot" />Sesión activa</div>
              <div className="rail-user"><strong>{user.name}</strong>{user.email}</div>
              <button className="rail-logout" onClick={logout}>Cerrar sesion</button>
              {isAdmin && <div style={{ borderTop:"1px solid var(--line)", marginTop:10, paddingTop:10, display:"flex", flexDirection:"column", gap:5 }}>
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
              </div>}
            </div>
          </aside>
          <main className="body">
            <div className="page">

              {view === "dashboard" && (
                <>
                  <div className="ph">
                    <div><div className="pt">Panel <em>General</em></div><div className="pm">RESUMEN · {today()}</div></div>
                    <img src="data:image/png;base64,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" style={{ height:48, opacity:0.85 }} />
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
                  <div className="kpis" style={{ marginBottom:18 }}>
                    {[
                      { n:enriched.length, lbl:"Total OCs", c:"var(--white)" },
                      { n:enriched.filter(o => ocStatus(o.items,o.dispatches)==="open").length, lbl:"Abiertas", c:"var(--sky)" },
                      { n:enriched.filter(o => ocStatus(o.items,o.dispatches)==="partial").length, lbl:"Parciales", c:"var(--gold)" },
                      { n:enriched.filter(o => ocStatus(o.items,o.dispatches)==="closed").length, lbl:"Cerradas", c:"var(--lime)" },
                    ].map(({n,lbl,c}) => (
                      <div key={lbl} className="kpi"><div className="kpi-bar" style={{ background:c }} /><div className="kpi-n" style={{ color:c }}>{n}</div><div className="kpi-l">{lbl}</div></div>
                    ))}
                  </div>
                  <div className="slbl">Ordenes recientes</div>
                  {loading ? <div className="pgload"><div className="spin" /> Cargando...</div> :
                    enriched.length === 0 ? <div className="empty"><div className="empty-ico">◈</div><p>Sin ordenes aun.<br />Ingresa tu API Key e importa una OC desde PDF.</p></div> :
                    <div className="tbl-card">
                      <table>
                        <thead><tr><SortTh label="OC ID" col="ocNumber" state={dashSort} setState={setDashSort} /><SortTh label="CLIENTE" col="client" state={dashSort} setState={setDashSort} /><SortTh label="ENTREGA" col="deliveryDate" state={dashSort} setState={setDashSort} /><SortTh label="AVANCE" col="pct" state={dashSort} setState={setDashSort} /><th>ESTADO</th><th /></tr></thead>
                        <tbody>{applySort(enriched, dashSort).slice(0, 10).map(oc => {
                          const s = ocStatus(oc.items, oc.dispatches);
                          const tot = oc.items.reduce((a, i) => a + Number(i.qty), 0);
                          const dis = oc.items.reduce((a, i) => a + Number(i.dispatched || 0), 0);
                          const pct = tot > 0 ? Math.min(100, Math.round(dis / tot * 100)) : 0;
                          const d = daysLeft(oc.deliveryDate);
                          return (
                            <tr key={oc.id}>
                              <td style={{ color:"var(--gold)", fontWeight:600 }}>{oc.ocNumber || oc.id}</td>
                              <td style={{ fontWeight:500 }}>{oc.client}</td>
                              <td style={{ color: s === "closed" ? "var(--fog2)" : d !== null && d <= 0 ? "var(--rose)" : d !== null && d <= 5 ? "var(--gold)" : "var(--fog2)" }}>{oc.deliveryDate || "—"}</td>
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
                      <button className="btn btn-outline" onClick={() => {
                        const rows = [];
                        enriched.forEach(oc => {
                          const ocTotal = oc.items ? oc.items.reduce((s, it) => s + (Number(it.qty)||0) * (Number(it.unitPrice)||0), 0) : 0;
                          const dispatched = (oc.dispatches || []);
                          if (dispatched.length === 0) {
                            rows.push({
                              "Cliente": oc.client || "",
                              "N° OC": oc.ocNumber || oc.id,
                              "Fecha OC": oc.date || "",
                              "N° GD": "",
                              "N° Factura": "",
                              "Total OC": ocTotal,
                              "Total Despachado": 0,
                              "Remanente": ocTotal,
                              "Estado": ocStatus(oc.items, oc.dispatches)
                            });
                          } else {
                            dispatched.forEach(d => {
                              const isGD = d.docType === "guia";
                              const isFac = d.docType === "factura";
                              const dispTotal = d.netTotal || d.total || d.items?.reduce((s,it) => s+(Number(it.qty)||0)*(Number(it.unitPrice)||0),0) || 0;
                              const totalDespachado = dispatched.reduce((s, x) => s + (x.netTotal || x.total || 0), 0);
                              rows.push({
                                "Cliente": oc.client || "",
                                "N° OC": oc.ocNumber || oc.id,
                                "Fecha OC": oc.date || "",
                                "N° GD": isGD ? (d.number || "") : (d.invoiceNumber ? "" : ""),
                                "N° Factura": isFac ? (d.number || "") : (d.invoiceNumber || ""),
                                "Total OC": ocTotal,
                                "Total Despachado": dispTotal,
                                "Remanente": ocTotal - totalDespachado,
                                "Estado": ocStatus(oc.items, oc.dispatches)
                              });
                            });
                          }
                        });
                        const ws = XLSX.utils.json_to_sheet(rows);
                        ws["!cols"] = [
                          {wch:30},{wch:15},{wch:12},{wch:12},{wch:12},{wch:15},{wch:15},{wch:15},{wch:12}
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
                  </div>
                  {loading ? <div className="pgload"><div className="spin" /> Cargando...</div> :
                    filtered.length === 0 ? <div className="empty"><div className="empty-ico">◫</div><p>No hay ordenes.<br />Importa una OC desde PDF para comenzar.</p></div> :
                    <div className="tbl-card">
                      <table>
                        <thead><tr><SortTh label="N° OC" col="ocNumber" state={ordSort} setState={setOrdSort} /><SortTh label="CLIENTE" col="client" state={ordSort} setState={setOrdSort} /><SortTh label="FECHA OC" col="date" state={ordSort} setState={setOrdSort} /><th>ENTREGA</th><th>DOCS</th><SortTh label="TOTAL" col="monto" state={ordSort} setState={setOrdSort} /><SortTh label="PENDIENTE" col="pendiente" state={ordSort} setState={setOrdSort} /><SortTh label="AVANCE" col="pct" state={ordSort} setState={setOrdSort} /><th>ESTADO</th><th /></tr></thead>
                        <tbody>{applySort(filtered, ordSort).map(oc => {
                          const s = ocStatus(oc.items, oc.dispatches);
                          const tot = oc.items.reduce((a, i) => a + Number(i.qty), 0);
                          const dis = oc.items.reduce((a, i) => a + Number(i.dispatched || 0), 0);
                          const pct = tot > 0 ? Math.min(100, Math.round(dis / tot * 100)) : 0;
                          const d = daysLeft(oc.deliveryDate);
                          const disp = oc.dispatches || [];
                          const pending = disp.filter(x => x.docType === "guia" && !x.invoiceNumber).length;
                          const nFac = disp.filter(x => x.docType === "factura").length;
                          const nGuia = disp.filter(x => x.docType === "guia").length;
                          return (
                            <tr key={oc.id}>
                              <td style={{ color:"var(--gold)", fontWeight:600 }}>{oc.ocNumber || oc.id}</td>
                              <td style={{ fontWeight:500 }}>{oc.client}</td>
                              <td style={{ color:"var(--fog)" }}>{oc.date}</td>
                              <td style={{ color: s === "closed" ? "var(--fog2)" : d !== null && d <= 0 ? "var(--rose)" : d !== null && d <= 5 ? "var(--gold)" : "var(--fog2)" }}>{oc.deliveryDate || "—"}</td>
                              <td>
                                <span style={{ color:"var(--teal)", fontSize:10 }}>{nFac} fac.</span>
                                <span style={{ color:"var(--fog)" }}> · </span>
                                <span style={{ color: pending > 0 ? "var(--rose)" : "var(--fog2)", fontSize:10 }}>{nGuia} guia{nGuia !== 1 ? "s" : ""}{pending > 0 ? " (" + pending + "✗)" : ""}</span>
                              </td>
                              <td style={{ color:"var(--gold)", fontWeight:600, fontSize:12, whiteSpace:"nowrap" }}>{fmtCLP(oc.items.reduce((a,i) => a + Number(i.qty)*Number(i.unitPrice), 0))}</td>
                              <td style={{ color:"var(--rose)", fontWeight:600, fontSize:12, whiteSpace:"nowrap" }}>{fmtCLP(oc.items.reduce((a,i) => a + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice), 0))}</td>
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
                  <div className="ph"><div><div className="pt">Reporte <em>por Cliente</em></div><div className="pm">MONTOS PENDIENTES DE DESPACHO</div></div></div>
                  {enriched.length === 0 && <div className="empty"><div className="empty-ico">◉</div><p>No hay ordenes aun.</p></div>}
                  {enriched.length > 0 && (() => {
                    // Agrupar por cliente
                    const byClient = enriched.reduce((acc, oc) => {
                      const key = oc.client;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(oc);
                      return acc;
                    }, {});
                    // Ordenar por monto pendiente desc
                    const rows = Object.entries(byClient).map(([client, ocs]) => {
                      const totalOC   = ocs.reduce((s, o) => s + o.items.reduce((a, i) => a + Number(i.qty) * Number(i.unitPrice), 0), 0);
                      const totalDis  = ocs.reduce((s, o) => s + o.items.reduce((a, i) => a + Number(i.dispatched || 0) * Number(i.unitPrice), 0), 0);
                      const pending   = totalOC - totalDis;
                      const openOcs   = ocs.filter(o => ocStatus(o.items, o.dispatches) !== "closed").length;
                      return { client, ocs, totalOC, totalDis, pending, openOcs };
                    }).sort((a, b) => b.pending - a.pending);

                    const grandTotal   = rows.reduce((s, r) => s + r.totalOC, 0);
                    const grandDis     = rows.reduce((s, r) => s + r.totalDis, 0);
                    const grandPending = rows.reduce((s, r) => s + r.pending, 0);

                    return (
                      <>
                        <div className="kpis" style={{ marginBottom:22 }}>
                          {[
                            { n: fmtCLP(grandTotal),   lbl: "Total OCs",    c: "var(--white)" },
                            { n: fmtCLP(grandDis),     lbl: "Despachado",   c: "var(--lime)" },
                            { n: fmtCLP(grandPending), lbl: "Pendiente",    c: "var(--rose)" },
                            { n: rows.length,           lbl: "Clientes",     c: "var(--sky)"  },
                          ].map(({ n, lbl, c }) => (
                            <div key={lbl} className="kpi"><div className="kpi-bar" style={{ background:c }} /><div className="kpi-lbl">{lbl.toUpperCase()}</div><div className="kpi-n" style={{ color:c, fontSize: typeof n === "string" ? 22 : 38 }}>{n}</div></div>
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
                                {[...ocs].sort((a, b) => {
                                  const remA = a.items.reduce((s,i) => s + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice), 0);
                                  const remB = b.items.reduce((s,i) => s + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice), 0);
                                  return remB - remA;
                                }).map(oc => {
                                  const tot = oc.items.reduce((a, i) => a + Number(i.qty) * Number(i.unitPrice), 0);
                                  const dis = oc.items.reduce((a, i) => a + Number(i.dispatched || 0) * Number(i.unitPrice), 0);
                                  const rem = tot - dis;
                                  const s   = ocStatus(oc.items, oc.dispatches);
                                  return (
                                    <div className="cli-oc-row" key={oc.id}>
                                      <span style={{ color:"var(--gold)", fontWeight:600, width:120 }}>{oc.ocNumber || oc.id}</span>
                                      <span className={"badge " + bCls(s)}><Dot c={s === "open" ? "var(--sky)" : s === "partial" ? "var(--gold)" : s === "toinvoice" ? "var(--rose)" : "var(--lime)"} />{bLbl(s)}</span>
                                      <span style={{ color:"var(--fog)", width:100, textAlign:"right" }}>{fmtCLP(tot)}</span>
                                      <span style={{ color:"var(--lime)", width:100, textAlign:"right" }}>{fmtCLP(dis)}</span>
                                      <span style={{ color: rem > 0 ? "var(--rose)" : "var(--fog2)", width:100, textAlign:"right", fontWeight: rem > 0 ? 600 : 400 }}>{fmtCLP(rem)}</span>
                                      <button className="btn btn-outline btn-sm" style={{ marginLeft:8 }} onClick={() => setShowDetail(oc)}>Ver</button>
                                    </div>
                                  );
                                })}
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
                enriched.forEach(oc => {
                  (oc.dispatches || []).forEach(d => {
                    if (d.docType === "factura" && d.date) {
                      // calcular total desde items del despacho x precio de la OC
                      let total = Number(d.total || d.amount || 0);
                      if (!total && d.items && d.items.length) {
                        total = d.items.reduce((s, it) => {
                          const ocItem = it.ocItemId ? oc.items.find(o => o.id === it.ocItemId) : null;
                          const price = Number(it.unitPrice || (ocItem ? ocItem.unitPrice : 0) || 0);
                          return s + (Number(it.qty) || 0) * price;
                        }, 0);
                      }
                      allFacs.push({ ...d, total, client: oc.client, ocNumber: oc.ocNumber || oc.id, ocId: oc.id });
                    }
                  });
                });
                // Agrupar por año-mes
                const byMonth = allFacs.reduce((acc, fac) => {
                  const key = fac.date.slice(0, 7); // "YYYY-MM"
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(fac);
                  return acc;
                }, {});
                const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
                const fmtMonth = k => { const [y, m] = k.split("-"); const names = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]; return names[parseInt(m)-1] + " " + y; };
                const grandTotal = allFacs.reduce((s, f) => s + Number(f.total || f.amount || 0), 0);

                return (
                  <>
                    <div className="ph"><div><div className="pt">Reporte <em>Por Facturas</em></div><div className="pm">FACTURACIÓN POR PERÍODO</div></div></div>
                    {allFacs.length === 0 && <div className="empty"><div className="empty-ico">▤</div><p>No hay facturas registradas aun.</p></div>}
                    {allFacs.length > 0 && (
                      <>
                        <div className="kpis" style={{ marginBottom:22 }}>
                          {[
                            { n: months.length,         lbl: "Meses",      c: "var(--sky)"    },
                            { n: allFacs.length,        lbl: "Facturas",   c: "var(--teal)"   },
                            { n: fmtCLP(grandTotal),    lbl: "Total",      c: "var(--gold)"   },
                            { n: new Set(allFacs.map(f => f.client)).size, lbl: "Clientes", c: "var(--rose)" },
                          ].map(({ n, lbl, c }) => (
                            <div key={lbl} className="kpi"><div className="kpi-bar" style={{ background:c }} /><div className="kpi-lbl">{lbl.toUpperCase()}</div><div className="kpi-n" style={{ color:c, fontSize: typeof n === "string" ? 20 : 38 }}>{n}</div></div>
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
                                <div className="mon-kpi"><label>CLIENTES</label><p style={{ color:"var(--rose)" }}>{Object.keys(byClient).length}</p></div>
                              </div>
                              <div className="mon-body">
                                {Object.entries(byClient).map(([client, cfacs]) => (
                                  <div className="mon-cli" key={client}>
                                    <div className="mon-cli-name">{client.toUpperCase()} · {cfacs.length} FACTURA{cfacs.length !== 1 ? "S" : ""} · {fmtCLP(cfacs.reduce((s,f) => s+Number(f.total||0),0))}</div>
                                    {cfacs.map((f, i) => (
                                      <div className="mon-fac-row" key={i}>
                                        <span className="badge bdoc-factura"><Dot c="var(--teal)" />Factura {f.number}</span>
                                        <span style={{ color:"var(--fog)", fontSize:10 }}>{f.date}</span>
                                        <span style={{ color:"var(--fog2)", flex:1, fontSize:10 }}>OC {f.ocNumber}</span>
                                        <span style={{ color:"var(--gold)", fontWeight:600 }}>{fmtCLP(f.total || f.amount || 0)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ))}
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

              {view === "pending" && (() => {
                const pendingOCs = enriched.filter(o => ocStatus(o.items, o.dispatches) !== "closed");
                const byClient = pendingOCs.reduce((acc, oc) => { const k = oc.client; if (!acc[k]) acc[k] = []; acc[k].push(oc); return acc; }, {});
                const totalPend = pendingOCs.reduce((s, o) => s + o.items.reduce((a, i) => a + (Number(i.qty) - Number(i.dispatched||0)) * Number(i.unitPrice), 0), 0);
                return (
                  <>
                    <div className="ph">
                      <div><div className="pt">Reporte <em>Pendientes</em></div><div className="pm">OCS SIN COMPLETAR</div></div>
                      {pendingOCs.length > 0 && <button className="btn btn-outline" onClick={() => {
                        const rows = [];
                        pendingOCs.forEach(oc => {
                          const tot = oc.items.reduce((a, i) => a + Number(i.qty) * Number(i.unitPrice), 0);
                          const dis = oc.items.reduce((a, i) => a + Number(i.dispatched||0) * Number(i.unitPrice), 0);
                          const pct = tot > 0 ? Math.round(dis/tot*100) : 0;
                          const s = ocStatus(oc.items, oc.dispatches);
                          // Fila resumen OC
                          rows.push({
                            "Cliente": oc.client,
                            "N° OC": oc.ocNumber || oc.id,
                            "Fecha OC": oc.date || "",
                            "Fecha Entrega": oc.deliveryDate || "",
                            "Estado": bLbl(s),
                            "Item": "",
                            "Unidad": "",
                            "Qty OC": "",
                            "Despachado": "",
                            "Pendiente Qty": "",
                            "Precio Unit.": "",
                            "Monto OC": tot,
                            "Monto Despachado": dis,
                            "Monto Pendiente": tot - dis,
                            "Avance %": pct + "%",
                            "Notas": oc.notes || ""
                          });
                          // Filas por item pendiente
                          oc.items.filter(it => Number(it.qty) - Number(it.dispatched||0) > 0).forEach(it => {
                            const rem = Number(it.qty) - Number(it.dispatched||0);
                            rows.push({
                              "Cliente": "",
                              "N° OC": "",
                              "Fecha OC": "",
                              "Fecha Entrega": "",
                              "Estado": "",
                              "Item": it.desc,
                              "Unidad": it.unit || "",
                              "Qty OC": Number(it.qty),
                              "Despachado": Number(it.dispatched||0),
                              "Pendiente Qty": rem,
                              "Precio Unit.": Number(it.unitPrice||0),
                              "Monto OC": Number(it.qty) * Number(it.unitPrice||0),
                              "Monto Despachado": Number(it.dispatched||0) * Number(it.unitPrice||0),
                              "Monto Pendiente": rem * Number(it.unitPrice||0),
                              "Avance %": it.qty > 0 ? Math.round(Number(it.dispatched||0)/Number(it.qty)*100) + "%" : "0%",
                              "Notas": ""
                            });
                          });
                        });
                        const ws = XLSX.utils.json_to_sheet(rows);
                        // Ancho de columnas
                        ws["!cols"] = [22,14,12,14,12,36,8,10,12,12,12,14,16,14,10,30].map(w => ({ wch: w }));
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Pendientes");
                        XLSX.writeFile(wb, "Reporte_Pendientes_" + today() + ".xlsx");
                      }}>↓ Exportar Excel</button>}
                    </div>
                    <div className="kpis" style={{ marginBottom:22 }}>
                      {[
                        { n: pendingOCs.length, lbl: "OCs Pendientes", c: "var(--white)" },
                        { n: pendingOCs.filter(o => ocStatus(o.items, o.dispatches) === "open").length, lbl: "Abiertas", c: "var(--rose)" },
                        { n: pendingOCs.filter(o => ocStatus(o.items, o.dispatches) === "partial").length, lbl: "Parciales", c: "var(--gold)" },
                        { n: fmtCLP(totalPend), lbl: "Monto Pendiente", c: "var(--rose)" },
                      ].map(({ n, lbl, c }) => (
                        <div key={lbl} className="kpi"><div className="kpi-bar" style={{ background:c }} /><div className="kpi-lbl">{lbl.toUpperCase()}</div><div className="kpi-n" style={{ color:c, fontSize: typeof n === "string" ? 20 : 38 }}>{n}</div></div>
                      ))}
                    </div>
                    {pendingOCs.length === 0 && <div className="empty"><div className="empty-ico">✓</div><p>No hay ordenes pendientes.</p></div>}
                    {pendingOCs.length > 0 && Object.entries(byClient).map(([client, ocs]) => (
                      <div key={client} style={{ marginBottom:28 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                          <div style={{ fontWeight:500, fontSize:16, color:"var(--fog2)" }}>{client}</div>
                          <div style={{ flex:1, height:1, background:"var(--line)" }} />
                          <div style={{ fontSize:9, letterSpacing:2, color:"var(--fog)" }}>{ocs.length} OC{ocs.length !== 1 ? "s" : ""}</div>
                        </div>
                        <div className="rep-grid">
                          {[...ocs].sort((a, b) => { const remA = a.items.reduce((s,i) => s + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice||0), 0); const remB = b.items.reduce((s,i) => s + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice||0), 0); return remB - remA; }).map(oc => {
                            const s = ocStatus(oc.items, oc.dispatches);
                            const tot = oc.items.reduce((a, i) => a + Number(i.qty) * Number(i.unitPrice), 0);
                            const dis = oc.items.reduce((a, i) => a + Number(i.dispatched || 0) * Number(i.unitPrice), 0);
                            const pct = tot > 0 ? Math.min(100, Math.round(dis / tot * 100)) : 0;
                            const d = daysLeft(oc.deliveryDate);
                            const disp = oc.dispatches || [];
                            const pendG = disp.filter(x => x.docType === "guia" && !x.invoiceNumber).length;
                            return (
                              <div className="rep-card" key={oc.id}>
                                <div className="rep-hd">
                                  <div style={{ display:"flex", alignItems:"baseline", gap:8 }}><div className="rep-id">{oc.ocNumber || oc.id}</div>{oc.date && <span style={{ fontSize:10, color:"var(--fog)", fontFamily:"var(--fM)" }}>{oc.date}</span>}</div>
                                  <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
                                    <span className={"badge " + bCls(s)}><Dot c={s === "open" ? "var(--sky)" : "var(--gold)"} />{bLbl(s)}</span>
                                    {d !== null && d <= 5 && <span className="badge b-warn"><Dot c="var(--rose)" />{d < 0 ? "Vencida" : d + "d"}</span>}
                                    {pendG > 0 && <span className="badge bdoc-guia-pend"><Dot c="var(--gold)" />{pendG} guia{pendG > 1 ? "s" : ""} sin fac.</span>}
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
                                  <div className="rep-stat"><label>MONTO OC</label><p style={{ color:"var(--gold)" }}>{fmtCLP(tot)}</p></div>
                                  <div className="rep-stat"><label>DESPACHADO</label><p style={{ color:"var(--lime)" }}>{fmtCLP(dis)}</p></div>
                                  <div className="rep-stat"><label>REMANENTE</label><p style={{ color:"var(--rose)" }}>{fmtCLP(tot - dis)}</p></div>
                                  <div className="rep-stat"><label>ENTREGA</label><p style={{ color: d !== null && d <= 0 ? "var(--rose)" : d !== null && d <= 5 ? "var(--gold)" : "var(--fog2)" }}>{oc.deliveryDate || "—"}</p></div>
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
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}

              {view === "reports" && (
                <>
                  <div className="ph"><div><div className="pt">Reporte <em>Por OC</em></div><div className="pm">ESTADO DE DESPACHO POR ORDEN</div></div></div>
                  <div className="kpis" style={{ marginBottom:22 }}>
                    {[
                      { n: total, lbl: "Total", c: "var(--white)" },
                      { n: open + enriched.filter(o => ocStatus(o.items, o.dispatches) === "partial").length, lbl: "Pendientes", c: "var(--rose)" },
                      { n: enriched.filter(o => ocStatus(o.items, o.dispatches) === "partial").length, lbl: "Parciales", c: "var(--gold)" },
                      { n: closed, lbl: "Completadas", c: "var(--lime)" }
                    ].map(({ n, lbl, c }) => (
                      <div key={lbl} className="kpi"><div className="kpi-bar" style={{ background:c }} /><div className="kpi-lbl">{lbl.toUpperCase()}</div><div className="kpi-n" style={{ color:c }}>{n}</div></div>
                    ))}
                  </div>
                  {enriched.length === 0 && <div className="empty"><div className="empty-ico">▤</div><p>No hay ordenes aun.</p></div>}
                  {enriched.length > 0 && (() => {
                    const byClient = enriched.reduce((acc, oc) => { const k = oc.client; if (!acc[k]) acc[k] = []; acc[k].push(oc); return acc; }, {});
                    return Object.entries(byClient).map(([client, ocs]) => (
                      <div key={client} style={{ marginBottom:28 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                          <div style={{ fontWeight:500, fontSize:16, color:"var(--fog2)" }}>{client}</div>
                          <div style={{ flex:1, height:1, background:"var(--line)" }} />
                          <div style={{ fontSize:9, letterSpacing:2, color:"var(--fog)" }}>{ocs.length} OC{ocs.length !== 1 ? "s" : ""}</div>
                        </div>
                        <div className="rep-grid">
                        {[...ocs].sort((a, b) => {
                          const remA = a.items.reduce((s,i) => s + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice), 0);
                          const remB = b.items.reduce((s,i) => s + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice), 0);
                          return remB - remA;
                        }).map(oc => {
                    const s = ocStatus(oc.items, oc.dispatches);
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
                          <div className="rep-stat"><label>MONTO OC</label><p style={{ color: s === "closed" ? "var(--lime)" : s === "toinvoice" ? "var(--gold)" : "var(--gold)" }}>{fmtCLP(tot)}</p></div>
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
                      </div>
                    ));
                  })()}
                </>
              )}



            </div>
          </main>
        </div>
      </div>

      {showImport && <ImportOCModal onClose={() => setShowImport(false)} onSave={handleSaveOC} apiKey={apiKey} />}
      {showGestion && (() => { const gc = enriched.find(o => o.id === showGestion.id) || showGestion; return (<GestionModal oc={gc} gestiones={gc.gestiones || []} onClose={() => setShowGestion(null)} onAdd={(text) => handleAddGestion(gc.id, text)} onDel={(gId) => handleDelGestion(gc.id, gId)} isAdmin={isAdmin} currentUserId={user.id} />); })()}
        {liveDetail && <OCDetailModal oc={liveDetail} onClose={() => setShowDetail(null)} onAddDispatch={oc => setShowDispatch(oc)} onDelDispatch={handleDelDispatch} onConvert={(ocId, d) => setConvertTarget({ ocId, dispatch: d })} onUpdateDelivery={handleUpdateDelivery} onUpdateClient={handleUpdateClient} canDelete={isAdmin} onRequestDel={d => setConfirmDel(d)} currentUserId={user.id} isAdmin={isAdmin} />}
      {liveDispOC && <AddDispatchModal oc={liveDispOC} onClose={() => setShowDispatch(null)} onSave={handleSaveDispatch} apiKey={apiKey} />}
      {convertTarget && <ConvertModal dispatch={convertTarget.dispatch} ocId={convertTarget.ocId} onClose={() => setConvertTarget(null)} onSave={handleConvert} />}
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
