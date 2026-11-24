// Maskob orders — WhatsApp notification to the warehouse for every new order.
//
// Sends an approved Meta WhatsApp template message through the WhatsApp Cloud API.
// Settings live in Firestore at config/notify (edited by management in the app):
//   { enabled: true, warehouse: ["9665XXXXXXXX", ...], template: "maskob_new_order", lang: "ar" }
// Secrets (set once with `firebase functions:secrets:set ...`, never stored in code):
//   WHATSAPP_TOKEN            — permanent access token of the Meta system user
//   WHATSAPP_PHONE_NUMBER_ID  — ID of the sending number in WhatsApp Manager
//
// Template body expected (4 variables, Arabic, category Utility):
//   طلب جديد من {{1}}
//   النوع: {{2}}
//   عدد الأصناف: {{3}}
//   رقم الطلب: {{4}}

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();

const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = defineSecret('WHATSAPP_PHONE_NUMBER_ID');
const GRAPH_VERSION = 'v21.0';

const KIND_AR = { supply: 'توريد للفرع', return: 'إرجاع للمستودع' };

/** Keep digits only; accept 05XXXXXXXX (Saudi local) and turn it into 9665XXXXXXXX. */
function normaliseNumber(raw) {
  let n = String(raw || '').replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (/^05\d{8}$/.test(n)) n = '966' + n.slice(1);
  return n.length >= 10 && n.length <= 15 ? n : null;
}

/** Template parameters must be non-empty single-line text. */
function param(text) {
  const t = String(text ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim();
  return { type: 'text', text: t || '-' };
}

function buildMessage(to, order, orderId, cfg) {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: cfg.template || 'maskob_new_order',
      language: { code: cfg.lang || 'ar' },
      components: [{
        type: 'body',
        parameters: [
          param(order.branch),
          param(KIND_AR[order.kind] || order.kind),
          param((order.lines || []).length),
          param(order.num || orderId),
        ],
      }],
    },
  };
}

async function sendOne(body, token, phoneId) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json.error || {};
    return { ok: false, to: body.to, code: e.code || res.status, message: String(e.message || res.statusText).slice(0, 200) };
  }
  return { ok: true, to: body.to, id: json.messages?.[0]?.id || null };
}

exports.notifyWarehouseOnNewOrder = onDocumentCreated(
  {
    document: 'orders/{orderId}',
    region: 'us-central1',              // same region family as the Firestore database (nam5)
    secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID],
    retry: false,                       // never send the same order twice on a retry
    maxInstances: 5,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const order = snap.data();
    const orderId = event.params.orderId;

    const cfgSnap = await getFirestore().doc('config/notify').get();
    const cfg = cfgSnap.exists ? cfgSnap.data() : {};
    if (cfg.enabled === false) {
      logger.info('WhatsApp notifications are switched off', { orderId });
      return;
    }
    const numbers = [...new Set((cfg.warehouse || []).map(normaliseNumber).filter(Boolean))];
    if (!numbers.length) {
      logger.warn('No warehouse WhatsApp numbers configured in config/notify', { orderId });
      await snap.ref.update({ waNotify: { at: FieldValue.serverTimestamp(), sent: 0, error: 'no-numbers' } });
      return;
    }

    const token = WHATSAPP_TOKEN.value();
    const phoneId = WHATSAPP_PHONE_NUMBER_ID.value();
    const results = await Promise.all(numbers.map((to) => sendOne(buildMessage(to, order, orderId, cfg), token, phoneId)));
    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    if (failed.length) logger.error('Some WhatsApp messages failed', { orderId, failed });
    else logger.info('WhatsApp sent', { orderId, sent });

    // record the outcome on the order (numbers are not stored here)
    await snap.ref.update({
      waNotify: {
        at: FieldValue.serverTimestamp(),
        sent,
        failed: failed.length,
        error: failed.length ? `${failed[0].code}: ${failed[0].message}` : null,
      },
    });
  },
);

// exported for local tests
exports._test = { normaliseNumber, buildMessage, param };
