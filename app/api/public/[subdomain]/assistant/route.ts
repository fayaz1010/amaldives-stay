import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateJSON } from '@/lib/ai';
import { buildPropertyKnowledgeBySubdomain } from '@/lib/property-knowledge';
import { readAssistantConfig } from '@/lib/assistant-config';

export const dynamic = 'force-dynamic';

/**
 * Property-local assistant for stay subdomains.
 * Uses util-ai Gemini keys + tenant facts from the database (local knowledge).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;
    const body = await request.json();
    const { message, history = [] } = body as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [{ subdomain }, { amaldivesSlug: subdomain }],
      },
      select: { id: true, name: true, subdomain: true, settings: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const assistant = readAssistantConfig(tenant.settings, tenant.name);
    const aiName = assistant.name; // owner-chosen name (default "Maya")
    const knowledge = await buildPropertyKnowledgeBySubdomain(subdomain);
    const bookUrl = `https://${tenant.subdomain}.stay.amaldives.com/book`;

    const systemPrompt =
      `You are ${aiName}, the friendly booking assistant for ${tenant.name}, a guesthouse in the Maldives. ` +
      `Answer ONLY using the property facts below. Be warm, concise, and practical. ` +
      `If asked to book, direct guests to: ${bookUrl}\n\n` +
      `PROPERTY FACTS:\n${knowledge || '(Limited info — suggest contacting the property directly.)'}`;

    const transcript = (history as Array<{ role: string; content: string }>)
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Guest' : aiName}: ${m.content}`)
      .join('\n');

    const reply = await generateJSON<{ reply: string }>(
      [
        {
          text:
            `${systemPrompt}\n\n` +
            (transcript ? `Recent conversation:\n${transcript}\n\n` : '') +
            `Guest: ${message.trim()}\n\n` +
            `Reply as ${aiName} in 2-4 sentences. Return JSON: {"reply":"..."}`,
        },
      ],
      { temperature: 0.4, maxTokens: 512 }
    );

    return NextResponse.json({
      reply: reply.reply || 'Happy to help — what dates are you looking at?',
      bookUrl,
    });
  } catch (error) {
    console.error('Property assistant error:', error);
    return NextResponse.json(
      { error: 'Assistant temporarily unavailable' },
      { status: 503 }
    );
  }
}
