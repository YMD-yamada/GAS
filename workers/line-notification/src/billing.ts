export async function createStripeCheckoutSession(
  secretKey: string,
  priceId: string,
  lineUserId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string } | { error: string }> {
  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('success_url', successUrl);
  params.set('cancel_url', cancelUrl);
  params.set('client_reference_id', lineUserId);
  params.set('line_items[0][price]', priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('metadata[line_user_id]', lineUserId);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + secretKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const data = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok) {
    return { error: data.error?.message ?? 'Stripe エラー' };
  }
  if (!data.url) return { error: 'Checkout URL を取得できませんでした' };
  return { url: data.url };
}

export async function verifyStripeWebhook(
  payload: string,
  signature: string,
  webhookSecret: string
): Promise<{ type: string; lineUserId?: string } | null> {
  const parts = signature.split(',').reduce(
    (acc, part) => {
      const [k, v] = part.split('=');
      if (k === 't') acc.t = v;
      if (k === 'v1') acc.v1 = v;
      return acc;
    },
    { t: '', v1: '' }
  );
  if (!parts.t || !parts.v1) return null;

  const signed = parts.t + '.' + payload;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const expected = [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expected !== parts.v1) return null;

  const event = JSON.parse(payload) as {
    type: string;
    data?: { object?: { client_reference_id?: string; metadata?: { line_user_id?: string } } };
  };

  if (event.type === 'checkout.session.completed') {
    const obj = event.data?.object;
    const lineUserId = obj?.metadata?.line_user_id ?? obj?.client_reference_id;
    return { type: event.type, lineUserId };
  }
  return { type: event.type };
}
