import { GoogleGenerativeAI } from '@google/generative-ai';
import env from '../config/env.js';
import Ticket from '../models/Ticket.js';

/**
 * AI triage service (Phase 3).
 *
 * HARD RULES:
 * - The Gemini key lives ONLY here (read from process.env via config/env.js).
 * - A triage result is ADVISORY: this service writes ONLY the ticket's
 *   `aiSuggestion` field — never the real `category`/`priority` fields.
 * - Any failure (network, timeout, bad JSON, unusable priority) leaves
 *   `aiSuggestion` null and never throws into the request path.
 */

const MODEL_NAME = 'gemini-2.5-flash'; // gemini-1.5/2.0-flash are retired server-side (verified via models list)
const TIMEOUT_MS = 8000; // spec: ~8s explicit timeout on the whole call incl. parse

const PRIORITIES = ['Low', 'Medium', 'High'];

// Safe coercion map for near-miss AI priorities (case variants + synonyms).
// Anything unmappable falls back to "Medium".
const PRIORITY_ALIASES = {
  low: 'Low',
  minor: 'Low',
  trivial: 'Low',
  smallest: 'Low',
  medium: 'Medium',
  moderate: 'Medium',
  normal: 'Medium',
  mid: 'Medium',
  default: 'Medium',
  high: 'High',
  urgent: 'High',
  critical: 'High',
  severe: 'High',
  major: 'High',
  asap: 'High',
  highest: 'High',
};

/** Business rule: "AI output must be validated before being stored". */
function sanitizePriority(raw) {
  if (typeof raw !== 'string') return 'Medium';
  const value = raw.trim();
  if (PRIORITIES.includes(value)) return value; // exact match
  const coerced = PRIORITY_ALIASES[value.toLowerCase()];
  return coerced ?? 'Medium'; // safe mapping, else fallback
}

function stripFences(text) {
  const trimmed = String(text ?? '').trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced ? fenced[1] : trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  return start !== -1 && end > start ? body.slice(start, end + 1) : body;
}

/** Parse + validate a raw Gemini response. Throws on unusable output. */
export function parseTriageResponse(text) {
  const json = JSON.parse(stripFences(text));
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('AI response was not a JSON object');
  }
  const category =
    typeof json.category === 'string' && json.category.trim()
      ? json.category.trim().slice(0, 60)
      : 'General';
  const summary =
    typeof json.summary === 'string' && json.summary.trim()
      ? json.summary.trim().replace(/\s+/g, ' ').slice(0, 200)
      : 'No summary provided.';
  return { category, priority: sanitizePriority(json.priority), summary };
}

/**
 * Ask Gemini to classify a ticket. Resolves with a sanitized
 * { category, priority, summary } or throws on ANY failure.
 * The whole call (network + parse + validation) is capped at ~8s.
 */
export async function requestTriage(subject, description) {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  });

  const prompt = [
    'You are a support-ticket triage assistant for a SaaS helpdesk.',
    'Classify the ticket below.',
    '',
    'Return STRICT JSON only - no markdown fences, no prose before or after - exactly this shape:',
    '{"category": string, "priority": "Low" | "Medium" | "High", "summary": string}',
    '',
    'Rules:',
    '- category: one or two words naming the issue area (e.g. "Hardware", "Billing", "Network", "Account", "Software").',
    '- priority: exactly one of "Low", "Medium", "High".',
    '- summary: one short sentence, under 20 words, describing the core problem.',
    '',
    `Ticket subject: ${subject}`,
    `Ticket description: ${description}`,
  ].join('\n');

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Gemini request timed out after ${TIMEOUT_MS}ms`)),
      TIMEOUT_MS
    );
  });
  if (typeof timeoutId.unref === 'function') timeoutId.unref();

  try {
    const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
    const text = result.response.text();
    return parseTriageResponse(text);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fire-and-forget background triage for a freshly created ticket.
 * On success stores ONLY ticket.aiSuggestion.
 * On ANY failure logs loudly and leaves aiSuggestion null — the ticket
 * remains fully manually-triageable. Never throws to the request path.
 */
export function triageTicketInBackground(ticketId, subject, description) {
  requestTriage(subject, description)
    .then(async (suggestion) => {
      await Ticket.updateOne({ _id: ticketId }, { $set: { aiSuggestion: suggestion } });
      console.log(`[triage] ✅ AI suggestion stored for ticket ${ticketId}`);
    })
    .catch((err) => {
      console.error(
        `[triage] ⚠️ AI triage unavailable for ticket ${ticketId} — leaving aiSuggestion null (${err && err.message})`
      );
    });
}