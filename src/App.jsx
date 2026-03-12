import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

// Storage adapter: usa window.storage si está disponible (artifact Claude), sino localStorage
const storage = {
  get: async (key) => {
    if (window.storage) return window.storage.get(key);
    const v = localStorage.getItem(key);
    return v ? { value: v } : null;
  },
  set: async (key, value) => {
    if (window.storage) return window.storage.set(key, value);
    localStorage.setItem(key, value);
  }
};

async function loadOCs() {
  try { const r = await storage.get("ocs-v3"); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
}
async function saveOCs(ocs) {
  try { await storage.set("ocs-v3", JSON.stringify(ocs)); } catch(e) { console.error(e); }
}

async function extractPDF(b64, type, apiKey) {
  const prompts = {
    oc: `Extrae los datos de esta Orden de Compra. El campo "client" debe ser el nombre de la empresa o persona que EMITE la orden de compra (el comprador, quien solicita los productos), NO el proveedor que recibe la orden. Busca este nombre en el encabezado de la OC, en el campo "De:", "Empresa compradora", "Razon social del cliente" o datos de facturacion del emisor. Para el campo "notes": extrae SOLO informacion operativa relevante como nombre de obra, OT, numero de proyecto, forma de pago, lugar de entrega o referencias internas (ejemplo: "Obra: EIMI00406 CONSTRUCCION DEFENSAS FLUVIALES. Forma de Pago: Contra Recepcion de Factura, a 30 dias"). NO incluyas texto legal, instrucciones de facturacion electronica, terminos y condiciones ni notas de cumplimiento legal. Si no hay notas operativas relevantes, usa null. Responde SOLO JSON sin texto extra ni backticks: {"ocNumber":"string o null","client":"string","date":"YYYY-MM-DD o null","deliveryDate":"YYYY-MM-DD o null","items":[{"desc":"string","unit":"string","qty":0,"unitPrice":0}],"notes":"string o null"}`,
    dispatch: `Extrae los datos de este documento (factura o guia de despacho). El campo "unit" debe ser la unidad de medida (UN, KG, MT, etc), NO el precio. El precio unitario va en "unitPrice". Para facturas, "netTotal" es el monto NETO (sin IVA) y "total" es el monto total con IVA. Responde SOLO JSON sin texto extra ni backticks: {"docNumber":"string o null","docType":"factura o guia","date":"YYYY-MM-DD o null","items":[{"desc":"string","unit":"string","qty":0,"unitPrice":0}],"netTotal":0,"total":0}`
  };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "Eres un extractor de datos de PDFs. Responde SOLO JSON valido, sin texto adicional.",
      messages: [{ role: "user", content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
        { type: "text", text: prompts[type] }
      ]}]
    })
  });
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
.app{display:flex;height:100vh;overflow:hidden}
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
.body{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--line2) transparent}.body::-webkit-scrollbar{width:5px}.body::-webkit-scrollbar-thumb{background:var(--line2);border-radius:99px}
.page{padding:26px 30px;width:100%}
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
.b-open{background:rgba(77,184,255,.1);color:var(--sky)}
.b-partial{background:rgba(232,184,75,.1);color:var(--gold)}
.b-closed{background:rgba(127,255,90,.1);color:var(--lime)}
.b-toinvoice{background:rgba(167,139,255,.1);color:var(--violet)}
.b-warn{background:rgba(255,77,109,.1);color:var(--rose)}
.bdoc-factura{background:rgba(61,255,196,.08);color:var(--teal);border:1px solid rgba(61,255,196,.2)}
.bdoc-guia{background:rgba(167,139,255,.1);color:var(--violet);border:1px solid rgba(167,139,255,.22)}
.bdoc-guia-pend{background:rgba(232,184,75,.08);color:var(--gold);border:1px solid rgba(232,184,75,.2)}
.pbar-wrap{background:var(--ink);border-radius:99px;height:4px;overflow:hidden}
.pbar{height:100%;border-radius:99px;transition:width .5s}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:400;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(3px)}
.modal{background:var(--ink2);border:1px solid var(--line2);border-radius:13px;width:100%;max-width:680px;max-height:92vh;overflow-y:auto;padding:26px 30px;scrollbar-width:none}.modal::-webkit-scrollbar{display:none}
.modal-xl{max-width:840px}
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
    return <span className="badge bdoc-guia"><Dot c="var(--violet)" />Guia {doc.number} <span style={{ color:"var(--teal)", marginLeft:4 }}>Fac. {doc.invoiceNumber}</span></span>;
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
        if (users.find(u => u.email === email)) throw new Error("Email ya registrado");
        const isAdmin = users.length === 0; // primer usuario = admin
        const nu = { id: Date.now(), name, email, password, isAdmin };
        await storage.set("dc-users", JSON.stringify([...users, nu]));
        localStorage.setItem("dc_user", JSON.stringify({ id: nu.id, name: nu.name, email: nu.email, isAdmin: nu.isAdmin }));
        onAuth({ id: nu.id, name: nu.name, email: nu.email, isAdmin: nu.isAdmin });
      } else {
        const u = users.find(u => u.email === email && u.password === password);
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
                  {e.status === "error" && <span style={{ fontSize:10, color:"var(--rose)" }}>Error: {e.err}</span>}
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

function AddDispatchModal({ oc, onClose, onSave, apiKey }) {
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
      await onSave(oc.id, { id: "DISP-" + Date.now(), number: num, date, docType, invoiceNumber: null, total: ext?.total || dispTotal || 0, netTotal: ext?.netTotal || dispTotal || 0, items: mapped });
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
        {step === 0 && (
          <>
            {lastSaved && (
              <div style={{ background:"rgba(127,255,90,.08)", border:"1px solid rgba(127,255,90,.2)", borderRadius:7, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ color:"var(--lime)", fontSize:14 }}>✓</span>
                <span style={{ fontSize:12, color:"var(--lime)" }}>{lastSaved.docType === "factura" ? "Factura" : "Guia"} N° {lastSaved.num} registrada.</span>
                <span style={{ fontSize:11, color:"var(--fog2)", marginLeft:"auto" }}>{savedCount} guardado{savedCount !== 1 ? "s" : ""} en esta sesión</span>
              </div>
            )}
            <UploadZone onFile={handleFile} loading={loading} label={lastSaved ? "Subir otro documento o" : "Arrastra la factura o guia aqui o"} />
            {err && <div style={{ color:"var(--rose)", fontSize:11, marginTop:9 }}>⚠ {err}</div>}
          </>
        )}
        {step === 1 && (
          <>
            <div className="ex-box">
              <div className="ex-ok">✓ DOCUMENTO DETECTADO</div>
              <div className="ex-row"><span className="ex-k">Tipo</span><span className="ex-v" style={{ color: docType === "factura" ? "var(--teal)" : "var(--violet)" }}>{docType === "factura" ? "Factura" : "Guia de Despacho"}</span></div>
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
                        <label style={{ display:"flex", alignItems:"center", gap:5, marginTop:5, cursor:"pointer", fontSize:9, letterSpacing:1, color: isSplit ? "var(--violet)" : "var(--gold)" }}>
                          <input type="checkbox" checked={isSplit} onChange={e => setSplitPrice(p => ({ ...p, [i]: e.target.checked }))}
                            style={{ accentColor:"var(--violet)", width:11, height:11 }} />
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
                      {isSplit && <div style={{ fontSize:9, color:"var(--violet)", marginTop:2, letterSpacing:1 }}>⚑ SUBDIVISIÓN — qty no suma</div>}
                    </td>
                    <td className="map-arrow">→</td>
                    <td>{ocItem
                      ? <div><div style={{ fontSize:12, color:"var(--lime)" }}>{ocItem.desc}</div><div style={{ fontSize:9, color:"var(--fog)" }}>Pend: {fmtNum(Number(ocItem.qty)-Number(ocItem.dispatched||0))} {ocItem.unit}</div></div>
                      : <span style={{ color:"var(--gold)", fontSize:11 }}>⚠ Sin vincular</span>}
                    </td>
                    <td style={{ textAlign:"right", fontWeight:600, color: isSplit ? "var(--fog)" : "var(--sky)" }}>{fmtNum(it.qty)}</td>
                    <td style={{ textAlign:"right", color:"var(--fog2)", fontSize:11 }}>{fmtCLP(it.unitPrice || 0)}</td>
                    <td style={{ textAlign:"right", fontWeight:600, color: isSplit ? "var(--violet)" : "var(--gold)", fontSize:12 }}>{fmtCLP(Number(it.qty) * Number(it.unitPrice || 0))}{isSplit && <span style={{ fontSize:8, color:"var(--fog)", marginLeft:3 }}>(÷qty)</span>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14, padding:"10px 14px", background:"var(--ink3)", borderRadius:8, border:"1px solid var(--line)" }}>
              <div style={{ fontSize:11, color:"var(--fog)" }}>
                {items.length} item{items.length !== 1 ? "s" : ""} · {items.filter((_,i) => map[i] && map[i] !== "NONE").length} vinculado{items.filter((_,i) => map[i] && map[i] !== "NONE").length !== 1 ? "s" : ""}
                {items.some((_,i) => splitPrice[i]) && <span style={{ color:"var(--violet)", marginLeft:8 }}>· {items.filter((_,i) => splitPrice[i]).length} subdivisión</span>}
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
          <div className="conv-hint">La guia <strong style={{ color:"var(--violet)" }}>N° {dispatch.number}</strong> ya tiene sus items registrados. Solo ingresa el N° de factura para vincularla.</div>
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

function OCDetailModal({ oc, onClose, onAddDispatch, onDelDispatch, onConvert, onUpdateDelivery, onUpdateClient, canDelete, onRequestDel }) {
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
                    {canDelete ? <button className="btn btn-rose btn-sm" onClick={() => onDelDispatch(oc.id, d.id)}>Eliminar</button> : <button className="btn btn-outline btn-sm" style={{ color:"var(--fog)", fontSize:9 }} onClick={() => onRequestDel({ type:"request", label: (d.docType === "factura" ? "Factura" : "Guia") + " N° " + d.number })}>Eliminar</button>}
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
  const [convertTarget, setConvertTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // { type:"oc"|"dispatch", ocId, dispId, label }
  const [dashSort, setDashSort] = useState({ col: null, dir: 1 });
  const [ordSort, setOrdSort] = useState({ col: null, dir: 1 });

  const notify = (msg, type) => { setToast({ msg, type: type || "ok" }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadOCs().then(d => {
      if (d.length) _seq = Math.max(_seq, ...d.map(o => parseInt(o.id.replace("OC-", "")) || 0)) + 1;
      const migrated = d.map(oc => ({ ...oc, dispatches: (oc.dispatches || (oc.invoices || []).map(inv => ({ ...inv, docType: "factura", invoiceNumber: null }))).map(disp => {
          if (disp.docType === "factura" && !disp.total && disp.items && disp.items.length) {
            const calc = disp.items.reduce((s, it) => s + (Number(it.qty)||0) * (Number(it.unitPrice)||0), 0);
            return calc > 0 ? { ...disp, total: calc } : disp;
          }
          return disp;
        })
      }));
      setOcs(migrated);
      setLoading(false);
    });
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
      <div style={{ display:"flex", flexDirection:"column", height:"100vh" }}>
        {!import.meta.env.VITE_ANTHROPIC_API_KEY && <div className="key-bar">
          <span>🔑 API Key:</span>
          <input type="password" value={apiKey} onChange={e => handleSaveKey(e.target.value)} placeholder="sk-ant-... (necesaria para importar PDFs)" />
          {apiKey ? <span style={{ fontSize:9, letterSpacing:1, color:"var(--lime)" }}>✓ Configurada</span> : <span style={{ fontSize:9, color:"var(--rose)" }}>Requerida para importar PDFs</span>}
        </div>}
        <div className="app" style={{ flex:1, minHeight:0 }}>
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
                  <div className="slbl">Ordenes recientes</div>
                  {loading ? <div className="pgload"><div className="spin" /> Cargando...</div> :
                    enriched.length === 0 ? <div className="empty"><div className="empty-ico">◈</div><p>Sin ordenes aun.<br />Ingresa tu API Key e importa una OC desde PDF.</p></div> :
                    <div className="tbl-card">
                      <table>
                        <thead><tr><SortTh label="OC ID" col="ocNumber" state={dashSort} setState={setDashSort} /><SortTh label="CLIENTE" col="client" state={dashSort} setState={setDashSort} /><SortTh label="ENTREGA" col="deliveryDate" state={dashSort} setState={setDashSort} /><SortTh label="AVANCE" col="pct" state={dashSort} setState={setDashSort} /><th>ESTADO</th><th /></tr></thead>
                        <tbody>{applySort(enriched, dashSort).slice(0, 6).map(oc => {
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
                              <td><span className={"badge " + bCls(s)}><Dot c={s === "open" ? "var(--sky)" : s === "partial" ? "var(--gold)" : s === "toinvoice" ? "var(--violet)" : "var(--lime)"} />{bLbl(s)}</span></td>
                              <td><button className="btn btn-outline btn-sm" onClick={() => setShowDetail(oc)}>Ver</button></td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  }
                </>
              )}

              {view === "orders" && (
                <>
                  <div className="ph">
                    <div><div className="pt">Ordenes <em>de Compra</em></div><div className="pm">{filtered.length} ORDENES</div></div>
                    <button className="btn btn-gold" onClick={() => setShowImport(true)} >+ Importar OC</button>
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
                                <span style={{ color: pending > 0 ? "var(--violet)" : "var(--fog2)", fontSize:10 }}>{nGuia} guia{nGuia !== 1 ? "s" : ""}{pending > 0 ? " (" + pending + "✗)" : ""}</span>
                              </td>
                              <td style={{ color:"var(--gold)", fontWeight:600, fontSize:12, whiteSpace:"nowrap" }}>{fmtCLP(oc.items.reduce((a,i) => a + Number(i.qty)*Number(i.unitPrice), 0))}</td>
                              <td style={{ color:"var(--rose)", fontWeight:600, fontSize:12, whiteSpace:"nowrap" }}>{fmtCLP(oc.items.reduce((a,i) => a + (Number(i.qty)-Number(i.dispatched||0))*Number(i.unitPrice), 0))}</td>
                              <td style={{ minWidth:100 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                  <div className="pbar-wrap" style={{ flex:1 }}><div className="pbar" style={{ width:pct + "%", background:pc(pct) }} /></div>
                                  <span style={{ fontSize:10, color:"var(--fog)", width:28 }}>{pct}%</span>
                                </div>
                              </td>
                              <td><span className={"badge " + bCls(s)}><Dot c={s === "open" ? "var(--sky)" : s === "partial" ? "var(--gold)" : s === "toinvoice" ? "var(--violet)" : "var(--lime)"} />{bLbl(s)}</span></td>
                              <td>
                                <div style={{ display:"flex", gap:5 }}>
                                  <button className="btn btn-outline btn-sm" onClick={() => setShowDetail(oc)}>Ver</button>
                                  <button className="btn btn-sky btn-sm" onClick={() => setShowDispatch(oc)} >+Doc.</button>
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
                            { n: fmtCLP(grandTotal),   lbl: "Total OCs",    c: "var(--gold)" },
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
                                      <span className={"badge " + bCls(s)}><Dot c={s === "open" ? "var(--sky)" : s === "partial" ? "var(--gold)" : s === "toinvoice" ? "var(--violet)" : "var(--lime)"} />{bLbl(s)}</span>
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
                            { n: new Set(allFacs.map(f => f.client)).size, lbl: "Clientes", c: "var(--violet)" },
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
                                <div className="mon-kpi"><label>CLIENTES</label><p style={{ color:"var(--violet)" }}>{Object.keys(byClient).length}</p></div>
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
                        { n: pendingOCs.length, lbl: "OCs Pendientes", c: "var(--sky)" },
                        { n: pendingOCs.filter(o => ocStatus(o.items, o.dispatches) === "open").length, lbl: "Abiertas", c: "var(--rose)" },
                        { n: pendingOCs.filter(o => ocStatus(o.items, o.dispatches) === "partial").length, lbl: "Parciales", c: "var(--gold)" },
                        { n: fmtCLP(totalPend), lbl: "Monto Pendiente", c: "var(--violet)" },
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
                          {[...ocs].sort((a, b) => (a.date || "").localeCompare(b.date || "")).map(oc => {
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
                                  <div className="rep-stat"><label>GUIAS</label><p style={{ color:"var(--violet)" }}>{disp.filter(x => x.docType === "guia").length}{pendG > 0 ? <span style={{ color:"var(--gold)", fontSize:10, marginLeft:4 }}>({pendG} pend.)</span> : null}</p></div>
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
                      { n: total, lbl: "Total", c: "var(--gold)" },
                      { n: open + enriched.filter(o => ocStatus(o.items, o.dispatches) === "partial").length, lbl: "Pendientes", c: "var(--sky)" },
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
                            <span className={"badge " + bCls(s)}><Dot c={s === "open" ? "var(--sky)" : s === "partial" ? "var(--gold)" : s === "toinvoice" ? "var(--violet)" : "var(--lime)"} />{bLbl(s)}</span>
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
                          <div className="rep-stat"><label>REMANENTE</label><p style={{ color: s === "closed" ? "var(--lime)" : s === "toinvoice" ? "var(--violet)" : "var(--rose)" }}>{fmtCLP(tot - dis)}</p></div>
                          <div className="rep-stat"><label>ENTREGA</label><p style={{ color: s === "closed" ? "var(--fog2)" : d !== null && d <= 0 ? "var(--rose)" : d !== null && d <= 5 ? "var(--gold)" : "var(--fog2)" }}>{oc.deliveryDate || "—"}</p></div>
                          <div className="rep-stat"><label>FACTURAS</label><p style={{ color:"var(--teal)" }}>{disp.filter(x => x.docType === "factura").length}</p></div>
                          <div className="rep-stat"><label>GUIAS</label><p style={{ color:"var(--violet)" }}>{disp.filter(x => x.docType === "guia").length}{pendG > 0 ? <span style={{ color:"var(--gold)", fontSize:10, marginLeft:4 }}>({pendG} pend.)</span> : null}</p></div>
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
      {liveDetail && <OCDetailModal oc={liveDetail} onClose={() => setShowDetail(null)} onAddDispatch={oc => setShowDispatch(oc)} onDelDispatch={handleDelDispatch} onConvert={(ocId, d) => setConvertTarget({ ocId, dispatch: d })} onUpdateDelivery={handleUpdateDelivery} onUpdateClient={handleUpdateClient} canDelete={isAdmin} onRequestDel={d => setConfirmDel(d)} />}
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
