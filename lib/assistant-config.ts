/**
 * Per-guesthouse AI assistant ("Maya as a service") configuration.
 *
 * Every stay tenant gets an embeddable booking assistant they can drop onto
 * their OWN website with one <script> line, branded with their chosen name and
 * photo. Config lives in Tenant.settings.assistant (JSON, no migration):
 *   { name, avatarUrl, greeting, accentColor, enabled }
 * Defaults to "Maya" + the platform teal so it works out of the box.
 */

export interface AssistantConfig {
  name: string;
  avatarUrl: string | null;
  greeting: string;
  accentColor: string;
  enabled: boolean;
}

export function defaultGreeting(name: string, propertyName: string): string {
  return `Hi! 👋 I'm ${name}, your assistant at ${propertyName}. Ask me about rooms, rates, transfers, or anything about your stay — I can help you book too.`;
}

export function readAssistantConfig(
  tenantSettings: unknown,
  propertyName: string,
): AssistantConfig {
  const a = ((tenantSettings as any)?.assistant ?? {}) as Record<string, unknown>;
  const name = (typeof a.name === 'string' && a.name.trim()) ? a.name.trim() : 'Maya';
  const greeting = (typeof a.greeting === 'string' && a.greeting.trim())
    ? a.greeting.trim()
    : defaultGreeting(name, propertyName);
  return {
    name,
    avatarUrl: typeof a.avatarUrl === 'string' && a.avatarUrl ? a.avatarUrl : null,
    greeting,
    accentColor: (typeof a.accentColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(a.accentColor)) ? a.accentColor : '#0d9488',
    enabled: a.enabled !== false,
  };
}
