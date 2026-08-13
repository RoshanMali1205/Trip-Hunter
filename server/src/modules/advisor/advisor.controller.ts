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
  }>;
  error?: { message?: string };
}

function extractText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  return text;
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

    const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
    const { message, history } = parsed.data;

    const contents = [
      ...history.map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
      { role: 'user' as const, parts: [{ text: message }] },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1024,
        },
      }),
    });

    const data = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      const detail = data.error?.message || `Gemini HTTP ${response.status}`;
      throw new AppError(502, 'GEMINI_ERROR', 'Buddy couldn’t reach Gemini right now.', detail);
    }

    const reply = extractText(data);
    if (!reply) {
      throw new AppError(502, 'GEMINI_EMPTY', 'Buddy returned an empty reply. Try again.');
    }

    res.json(
      ok({
        reply,
        model,
      }),
    );
  } catch (err) {
    next(err);
  }
};
