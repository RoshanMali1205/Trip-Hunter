import { z } from 'zod';
import type { RequestHandler } from 'express';
import { getEnv } from '../../config/env.js';
import { ok } from '../../types/api.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  BUDDY_GREETING,
  BUDDY_NAME,
  BUDDY_SUGGESTIONS,
  BUDDY_TITLE,
  SYSTEM_INSTRUCTION,
} from './buddy-persona.js';

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
      name: BUDDY_NAME,
      title: BUDDY_TITLE,
      greeting: BUDDY_GREETING,
      suggestions: BUDDY_SUGGESTIONS,
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
