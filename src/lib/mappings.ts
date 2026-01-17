import type { CardMapping, Env } from "../types";

// Key format for KV storage
function getKey(projectId: string, cardId: string): string {
  return `card:${projectId}:${cardId}`;
}

export async function getMapping(
  env: Env,
  projectId: string,
  cardId: string
): Promise<CardMapping | null> {
  const key = getKey(projectId, cardId);
  const value = await env.MAPPINGS.get(key);
  if (!value) return null;
  return JSON.parse(value);
}

export async function saveMapping(
  env: Env,
  projectId: string,
  cardId: string,
  mapping: CardMapping
): Promise<void> {
  const key = getKey(projectId, cardId);
  await env.MAPPINGS.put(key, JSON.stringify(mapping));
}

export async function deleteMapping(
  env: Env,
  projectId: string,
  cardId: string
): Promise<void> {
  const key = getKey(projectId, cardId);
  await env.MAPPINGS.delete(key);
}
