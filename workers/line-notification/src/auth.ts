export type LineVerifyResult = {
  sub: string;
  name: string;
};

export async function verifyLineIdToken(
  idToken: string,
  clientId: string
): Promise<LineVerifyResult | null> {
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: clientId })
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { sub?: string; name?: string };
  if (!data.sub) return null;
  return { sub: data.sub, name: data.name ?? '' };
}

export function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}
