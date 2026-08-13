import { z } from 'zod';
import type { RequestHandler } from 'express';
import { getEnv } from '../../config/env.js';
import { ok } from '../../types/api.js';
import { AppError } from '../../middleware/error-handler.js';

const chatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string().trim().min(1).max(8000),
      }),
    )
    .max(24)
    .optional()
    .default([]),
});

const SYSTEM_INSTRUCTION = `You are "Buddy", Trip Hunter's specialized India travel advisor.

Personality:
- Warm, friendly, and upbeat — greet like a buddy ("Hi Buddy!" energy), not a corporate bot.
- Concise but useful. Prefer short paragraphs and clear bullet lists.
- Speak in plain English; use light Hindi travel phrases only when natural (optional).

Output formatting (important — the UI renders Markdown):
- Use Markdown only: ## / ### headings, **bold** labels, bullet lists (- item), numbered lists for day plans.
- Structure itineraries as: short intro → ## Travel → ## Day 1 / Day 2 / Day 3 → ## Budget (INR) → ## Tips.
- Keep each section tight (2–5 bullets). Avoid raw walls of text and avoid HTML.
- One blank line between sections. Use a single --- divider only if needed.
- Emojis are optional and limited to section headings (max one per heading).

Expertise (India-focused):
- Destinations across India: beaches (Goa, Andaman), hills (Manali, Lonavala, Ooty), cities (Mumbai, Bangalore, Delhi, Jaipur), adventure (Rishikesh, Ladakh), heritage (Rajasthan, Hampi), Kerala backwaters, Northeast, and weekend getaways from major metros.
- Best seasons / monsoon / heat considerations and typical weather by month.
- Day-by-day itinerary suggestions for office team outings, offsies, business trips, and family-friendly plans.
- Rough budget bands in INR (stay, food, local transport, activities) for groups.
- Practical tips: travel modes (flight/train/bus), packing, local food, safety, and manager-friendly planning tips for corporate teams.

Rules:
- Stay focused on India travel and trip planning for Trip Hunter users.
- If asked about unrelated topics, gently steer back to trip planning.
- Do not invent real-time weather numbers; give seasonal expectations and suggest checking a live forecast.
- Do not claim you booked anything — you advise; users create trips in Trip Hunter.
- When useful, end with 1–3 short follow-up questions the user can ask next.`;

const SUGGESTIONS = [
  '3-day Goa team outing from Pune',
  'Best time to visit Manali for an offsite',
  'Weekend near Bangalore under ₹8k/person',
  'Jaipur heritage itinerary for 4 days',
];

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string; code?: number };
}

type ChatTurn = { role: 'user' | 'model'; text: string };

function extractText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text ?? '')
    .join('')
    .trim();
}

/**
 * Gemini generateContent requires alternating user/model turns and must
 * start with a user message. Our UI greeting is a synthetic model bubble —
 * drop leading model turns and collapse any consecutive same-role messages.
 */
function normalizeContents(history: ChatTurn[], message: string) {
  const turns: ChatTurn[] = [...history, { role: 'user', text: message }];
  while (turns.length && turns[0].role === 'model') {
    turns.shift();
  }

  const merged: ChatTurn[] = [];
  for (const turn of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) {
      last.text = `${last.text}\n\n${turn.text}`;
    } else {
      merged.push({ ...turn });
    }
  }

  if (!merged.length || merged[0].role !== 'user') {
    merged.unshift({ role: 'user', text: message });
  }

  return merged.map((h) => ({
    role: h.role,
    parts: [{ text: h.text }],
  }));
}

async function callGemini(apiKey: string, model: string, contents: unknown) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2048,
      },
    }),
  });

  const data = (await response.json()) as GeminiResponse;
  return { response, data };
}

export const getAdvisorInfo: RequestHandler = (_req, res) => {
  const env = getEnv();
  res.json(
    ok({
      name: 'Buddy',
      title: 'India Trip Advisor',
      greeting:
        'Hi Buddy! I’m your Trip Hunter India specialist — destinations, weather seasons, budgets, and day-by-day itineraries.',
      suggestions: SUGGESTIONS,
      configured: Boolean(env.GEMINI_API_KEY),
    }),
  );
};

export const chatWithAdvisor: RequestHandler = async (req, res, next) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid chat payload', parsed.error.flatten());
    }

    const env = getEnv();
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AppError(
        503,
        'GEMINI_NOT_CONFIGURED',
        'Buddy is almost ready — add GEMINI_API_KEY on the server (Netlify env) to enable live India trip advice.',
      );
    }

    const preferred = env.GEMINI_MODEL || 'gemini-2.0-flash';
    const fallbacks = [preferred, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'].filter(
      (m, i, arr) => arr.indexOf(m) === i,
    );

    const { message, history } = parsed.data;
    const contents = normalizeContents(history, message);

    let lastDetail = 'Unknown Gemini error';
    let usedModel = preferred;
    let reply = '';

    for (const model of fallbacks) {
      usedModel = model;
      try {
        const { response, data } = await callGemini(apiKey, model, contents);
        if (!response.ok) {
          lastDetail = data.error?.message || `Gemini HTTP ${response.status}`;
          console.error(`[advisor] Gemini error (${model}):`, lastDetail);
          // Try next model on not-found / unsupported
          if (response.status === 404 || /not found|not supported/i.test(lastDetail)) {
            continue;
          }
          throw new AppError(502, 'GEMINI_ERROR', `Buddy couldn’t reach Gemini: ${lastDetail}`, lastDetail);
        }

        reply = extractText(data);
        if (!reply) {
          lastDetail = data.candidates?.[0]?.finishReason || 'empty candidates';
          console.error(`[advisor] Empty Gemini reply (${model}):`, lastDetail);
          continue;
        }
        break;
      } catch (err) {
        if (err instanceof AppError) throw err;
        lastDetail = err instanceof Error ? err.message : String(err);
        console.error(`[advisor] Fetch failed (${model}):`, lastDetail);
      }
    }

    if (!reply) {
      throw new AppError(
        502,
        'GEMINI_ERROR',
        `Buddy couldn’t reach Gemini right now. ${lastDetail}`,
        lastDetail,
      );
    }

    res.json(
      ok({
        reply,
        model: usedModel,
      }),
    );
  } catch (err) {
    next(err);
  }
};
