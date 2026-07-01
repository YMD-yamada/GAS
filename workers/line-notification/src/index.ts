import { getBearerToken, verifyLineIdToken } from './auth';
import { createStripeCheckoutSession, verifyStripeWebhook } from './billing';
import { buildLiffHtml } from './liff-html';
import {
  DINNER_LABELS,
  FREE_MONTHLY_SEND_LIMIT,
  PATTERNS,
  SITUATION_LABELS,
  buildMessageText,
  resolveMessageMode,
  resolveSituationLine,
  type MessageMode
} from './message-builder';
import { ABOUT_HTML } from './about-html';
import { PAGE_HTML } from './page-html';
import {
  applyPatternPreset,
  ensureDefaultPatterns,
  getDestinations,
  getMonthlySendCount,
  getPrimaryDestination,
  getTimePatterns,
  getUser,
  incrementMonthlySendCount,
  setUserPlan,
  upsertPrimaryGroupDestination,
  upsertUser
} from './tenant';

export interface Env {
  DB: D1Database;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_TO_ID: string;
  LINE_CHANNEL_SECRET?: string;
  LIFF_ID?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_ID?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

type LogRow = {
  created_at: string;
  status: string;
  to_id: string;
  pattern_id: string | null;
  pattern_label: string | null;
  arrival: string | null;
  dinner_key: string | null;
  dinner_label: string | null;
  has_schedule: number;
  schedule_time: string | null;
  schedule_detail: string | null;
  sent_text: string | null;
  error_message: string | null;
  message_mode: string | null;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return htmlResponse(PAGE_HTML);
    }
    if (request.method === 'GET' && url.pathname === '/about') {
      return htmlResponse(ABOUT_HTML);
    }
    if (request.method === 'GET' && url.pathname === '/liff') {
      return htmlResponse(buildLiffHtml(env.LIFF_ID ?? ''));
    }
    if (request.method === 'GET' && url.pathname === '/manifest.json') {
      return jsonResponse({
        name: 'おかえり連絡',
        short_name: 'おかえり連絡',
        start_url: '/',
        display: 'standalone',
        background_color: '#f8f9fa',
        theme_color: '#198754',
        lang: 'ja'
      });
    }

    if (request.method === 'GET' && url.pathname === '/api/patterns') {
      return handleGetPatterns(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/liff') {
      return handleLiffAuth(request, env);
    }
    if (request.method === 'GET' && url.pathname === '/api/settings') {
      return handleGetSettings(request, env);
    }
    if (request.method === 'PUT' && url.pathname === '/api/settings') {
      return handlePutSettings(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/api/send') {
      return handleSend(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/api/billing/checkout') {
      return handleBillingCheckout(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/webhook/stripe') {
      return handleStripeWebhook(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/webhook') {
      return handleWebhook(request, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};

async function handleGetPatterns(request: Request, env: Env): Promise<Response> {
  const user = await resolveUser(request, env);
  if (user) {
    const rows = await ensureDefaultPatterns(env.DB, user.lineUserId);
    return jsonResponse({
      patterns: rows.map((r) => ({ label: r.label, arrival: r.arrival_text, id: r.id }))
    });
  }
  return jsonResponse({
    patterns: PATTERNS.map((p) => ({ label: p.label, arrival: p.arrival, id: p.id }))
  });
}

async function handleLiffAuth(request: Request, env: Env): Promise<Response> {
  const idToken = getBearerToken(request);
  if (!idToken || !env.LIFF_ID) {
    return jsonResponse({ ok: false, error: 'LIFF 認証に必要な設定がありません。' }, 401);
  }

  const verified = await verifyLineIdToken(idToken, env.LIFF_ID);
  if (!verified) {
    return jsonResponse({ ok: false, error: 'IDトークンが無効です。' }, 401);
  }

  await upsertUser(env.DB, verified.sub, verified.name);
  const destinations = await getDestinations(env.DB, verified.sub);
  const patterns = await getTimePatterns(env.DB, verified.sub);
  const user = await getUser(env.DB, verified.sub);
  const needsOnboarding = patterns.length === 0;

  return jsonResponse({
    ok: true,
    user: user ?? { line_user_id: verified.sub, display_name: verified.name, plan: 'free' },
    destinations,
    patterns: patterns.map((p) => ({ id: p.id, label: p.label, arrival: p.arrival_text })),
    needsOnboarding,
    monthlySends: await getMonthlySendCount(env.DB, verified.sub),
    sendLimit: user?.plan === 'premium' ? null : FREE_MONTHLY_SEND_LIMIT
  });
}

async function handleGetSettings(request: Request, env: Env): Promise<Response> {
  const user = await resolveUser(request, env);
  if (!user) return jsonResponse({ ok: false, error: '認証が必要です。' }, 401);

  const u = await getUser(env.DB, user.lineUserId);
  const destinations = await getDestinations(env.DB, user.lineUserId);
  const patterns = await ensureDefaultPatterns(env.DB, user.lineUserId);

  return jsonResponse({
    ok: true,
    user: u,
    destinations,
    patterns: patterns.map((p) => ({ id: p.id, label: p.label, arrival: p.arrival_text })),
    monthlySends: await getMonthlySendCount(env.DB, user.lineUserId),
    sendLimit: u?.plan === 'premium' ? null : FREE_MONTHLY_SEND_LIMIT
  });
}

async function handlePutSettings(request: Request, env: Env): Promise<Response> {
  const user = await resolveUser(request, env);
  if (!user) return jsonResponse({ ok: false, error: '認証が必要です。' }, 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, error: 'JSON が不正です。' }, 400);
  }

  const preset = String(body.preset ?? '');
  if (preset) {
    await applyPatternPreset(env.DB, user.lineUserId, preset);
  } else if (body.completeOnboarding) {
    const patterns = await getTimePatterns(env.DB, user.lineUserId);
    if (patterns.length === 0) {
      await applyPatternPreset(env.DB, user.lineUserId, 'regular');
    }
  }

  return handleGetSettings(request, env);
}

async function handleSend(request: Request, env: Env): Promise<Response> {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return jsonResponse(
      { ok: false, error: 'シークレットに LINE_CHANNEL_ACCESS_TOKEN を設定してください。' },
      500
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, error: 'JSON が不正です。' }, 400);
  }

  const authUser = await resolveUser(request, env);
  let toId = env.LINE_TO_ID;
  let patterns: { id: string; label: string; arrival: string; index: number }[] = PATTERNS.map((p, i) => ({
    id: p.id,
    label: p.label,
    arrival: p.arrival,
    index: i
  }));
  let lineUserId: string | null = null;
  let userPlan = 'free';

  if (authUser) {
    lineUserId = authUser.lineUserId;
    const u = await getUser(env.DB, lineUserId);
    userPlan = u?.plan ?? 'free';

    const dest = await getPrimaryDestination(env.DB, lineUserId);
    if (dest) {
      toId = dest.line_id;
    }

    const userPatterns = await ensureDefaultPatterns(env.DB, lineUserId);
    patterns = userPatterns.map((p, i) => ({
      id: String(p.id),
      label: p.label,
      arrival: p.arrival_text,
      index: i
    }));

    if (userPlan !== 'premium') {
      const count = await getMonthlySendCount(env.DB, lineUserId);
      if (count >= FREE_MONTHLY_SEND_LIMIT) {
        return jsonResponse(
          {
            ok: false,
            error: `無料プランの月間送信上限（${FREE_MONTHLY_SEND_LIMIT}通）に達しました。プレミアムをご検討ください。`
          },
          402
        );
      }
    }
  }

  if (!toId) {
    return jsonResponse(
      { ok: false, error: '送信先が設定されていません。LINE_TO_ID または家族グループの連携を行ってください。' },
      500
    );
  }

  const patternIndex = Number(body.patternIndex);
  const dinnerKey = String(body.dinnerKey ?? '');
  const hasSchedule = coerceBool(body.hasSchedule);
  const scheduleTime = String(body.scheduleTime ?? '').trim();
  const scheduleDetail = String(body.scheduleDetail ?? '').trim();
  const situationKey = String(body.situationKey ?? 'none');
  const messageMode = resolveMessageMode(hasSchedule);

  if (!Number.isInteger(patternIndex) || patternIndex < 0 || patternIndex >= patterns.length) {
    return jsonResponse({ ok: false, error: '到着パターンが不正です。' }, 400);
  }
  if (!Object.prototype.hasOwnProperty.call(DINNER_LABELS, dinnerKey)) {
    return jsonResponse({ ok: false, error: '夕飯オプションが不正です。' }, 400);
  }
  if (!Object.prototype.hasOwnProperty.call(SITUATION_LABELS, situationKey)) {
    return jsonResponse({ ok: false, error: '備考の選択が不正です。' }, 400);
  }
  if (hasSchedule && situationKey !== 'none') {
    return jsonResponse({ ok: false, error: '予定ありのときは備考を選べません。予定の内容に書いてください。' }, 400);
  }

  const pattern = patterns[patternIndex];
  const dinnerLine = DINNER_LABELS[dinnerKey];

  if (hasSchedule) {
    if (!scheduleTime) {
      return jsonResponse({ ok: false, error: '予想帰宅時間を選択してください。' }, 400);
    }
    if (!scheduleDetail) {
      return jsonResponse({ ok: false, error: '予定の内容を入力してください。' }, 400);
    }
  }

  const text = buildMessageText({
    messageMode,
    patternLabel: pattern.label,
    arrival: pattern.arrival,
    dinnerLine,
    scheduleTime,
    scheduleDetail,
    situationLine: resolveSituationLine(situationKey)
  });

  const lineRes = await linePush(toId, [{ type: 'text', text }], token);
  const logBase = {
    toId,
    patternId: pattern.id,
    patternLabel: pattern.label,
    arrival: pattern.arrival,
    dinnerKey,
    dinnerLabel: dinnerLine,
    hasSchedule,
    scheduleTime,
    scheduleDetail,
    sentText: text,
    messageMode
  };

  if (lineRes.ok) {
    if (lineUserId) {
      await incrementMonthlySendCount(env.DB, lineUserId);
    }
    await appendLog(env, { status: 'SUCCESS', ...logBase, errorMessage: '' });
    return jsonResponse({ ok: true });
  }

  const errMsg = `LINE API エラー (${lineRes.status}): ${lineRes.body}`;
  await appendLog(env, { status: 'FAILED', ...logBase, errorMessage: errMsg });
  return jsonResponse({ ok: false, error: errMsg }, 502);
}

async function handleBillingCheckout(request: Request, env: Env): Promise<Response> {
  const user = await resolveUser(request, env);
  if (!user) return jsonResponse({ ok: false, error: 'LINEでログインしてください。' }, 401);
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return jsonResponse({ ok: false, error: '決済が未設定です。' }, 503);
  }

  const origin = new URL(request.url).origin;
  const result = await createStripeCheckoutSession(
    env.STRIPE_SECRET_KEY,
    env.STRIPE_PRICE_ID,
    user.lineUserId,
    origin + '/liff?billing=success',
    origin + '/about?billing=cancel'
  );

  if ('error' in result) {
    return jsonResponse({ ok: false, error: result.error }, 502);
  }
  return jsonResponse({ ok: true, url: result.url });
}

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Not configured', { status: 503 });
  }
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature') ?? '';
  const event = await verifyStripeWebhook(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!event) return new Response('Invalid signature', { status: 400 });

  if (event.type === 'checkout.session.completed' && event.lineUserId) {
    await setUserPlan(env.DB, event.lineUserId, 'premium');
  }
  return new Response('OK');
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN;
  const toId = env.LINE_TO_ID;
  const rawBody = await request.text();

  if (env.LINE_CHANNEL_SECRET) {
    const sig = request.headers.get('x-line-signature');
    const ok = await verifyLineSignature(rawBody, sig, env.LINE_CHANNEL_SECRET);
    if (!ok) return new Response('Unauthorized', { status: 401 });
  }

  let data: { events?: unknown[] };
  try {
    data = JSON.parse(rawBody) as { events?: unknown[] };
  } catch {
    return new Response('OK');
  }

  const events = Array.isArray(data.events) ? data.events : [];
  const seen: Record<string, boolean> = {};
  const groupIds: string[] = [];

  for (const ev of events) {
    if (token) {
      await handleDirectLogRequest(ev, token, env);
      await handleGroupLinkEvent(ev, env);
    }
    const src = (ev as { source?: { type?: string; groupId?: string; userId?: string } }).source;
    if (src && src.type === 'group' && src.groupId && !seen[src.groupId]) {
      seen[src.groupId] = true;
      groupIds.push(src.groupId);
    }
  }

  if (groupIds.length > 0 && token && toId && !env.LIFF_ID) {
    const text = '取得した groupId:\n' + groupIds.join('\n');
    await linePush(toId, [{ type: 'text', text }], token);
  }

  return new Response('OK');
}

async function handleGroupLinkEvent(event: unknown, env: Env): Promise<void> {
  const ev = event as {
    type?: string;
    source?: { type?: string; groupId?: string; userId?: string };
  };
  if (!ev.source || ev.source.type !== 'group' || !ev.source.groupId || !ev.source.userId) return;
  if (ev.type !== 'message' && ev.type !== 'join' && ev.type !== 'memberJoined') return;

  try {
    await upsertPrimaryGroupDestination(env.DB, ev.source.userId, ev.source.groupId);
  } catch {
    // マルチテナント未マイグレーション時は無視
  }
}

async function resolveUser(
  request: Request,
  env: Env
): Promise<{ lineUserId: string } | null> {
  const idToken = getBearerToken(request);
  if (!idToken || !env.LIFF_ID) return null;
  const verified = await verifyLineIdToken(idToken, env.LIFF_ID);
  if (!verified) return null;
  return { lineUserId: verified.sub };
}

async function linePush(
  to: string,
  messages: unknown[],
  token: string
): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, messages })
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

async function lineReply(replyToken: string, text: string, token: string): Promise<void> {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }]
    })
  });
}

async function appendLog(
  env: Env,
  entry: {
    status: string;
    toId: string;
    patternId: string;
    patternLabel: string;
    arrival: string;
    dinnerKey: string;
    dinnerLabel: string;
    hasSchedule: boolean;
    scheduleTime: string;
    scheduleDetail: string;
    sentText: string;
    errorMessage: string;
    messageMode: MessageMode;
  }
): Promise<void> {
  try {
    const created = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO notification_log (
        created_at, status, to_id, pattern_id, pattern_label, arrival,
        dinner_key, dinner_label, has_schedule, schedule_time, schedule_detail,
        sent_text, error_message, message_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        created,
        entry.status,
        entry.toId,
        entry.patternId,
        entry.patternLabel,
        entry.arrival,
        entry.dinnerKey,
        entry.dinnerLabel,
        entry.hasSchedule ? 1 : 0,
        entry.scheduleTime,
        entry.scheduleDetail,
        entry.sentText,
        entry.errorMessage,
        entry.messageMode
      )
      .run();
  } catch {
    try {
      const created = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO notification_log (
          created_at, status, to_id, pattern_id, pattern_label, arrival,
          dinner_key, dinner_label, has_schedule, schedule_time, schedule_detail, sent_text, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          created,
          entry.status,
          entry.toId,
          entry.patternId,
          entry.patternLabel,
          entry.arrival,
          entry.dinnerKey,
          entry.dinnerLabel,
          entry.hasSchedule ? 1 : 0,
          entry.scheduleTime,
          entry.scheduleDetail,
          entry.sentText,
          entry.errorMessage
        )
        .run();
    } catch {
      // ログ失敗は送信応答を壊さない
    }
  }
}

async function getRecentLogs(env: Env, limit: number): Promise<LogRow[]> {
  try {
    const { results } = await env.DB.prepare(
      `SELECT created_at, status, to_id, pattern_id, pattern_label, arrival,
              dinner_key, dinner_label, has_schedule, schedule_time, schedule_detail,
              sent_text, error_message, message_mode
       FROM notification_log
       ORDER BY id DESC
       LIMIT ?`
    )
      .bind(limit)
      .all<LogRow>();
    return results ?? [];
  } catch {
    return [];
  }
}

async function handleDirectLogRequest(event: unknown, token: string, env: Env): Promise<void> {
  const ev = event as {
    type?: string;
    source?: { type?: string };
    message?: { type?: string; text?: string };
    replyToken?: string;
  };
  if (ev.type !== 'message' || !ev.source || ev.source.type !== 'user') return;
  if (!ev.message || ev.message.type !== 'text' || !ev.replyToken) return;

  const text = String(ev.message.text ?? '').trim();
  const responseText = await buildLogResponseText(text, env);
  if (!responseText) return;

  await lineReply(ev.replyToken, responseText, token);
}

async function buildLogResponseText(commandText: string, env: Env): Promise<string> {
  if (!commandText) return '';

  if (commandText === 'ログ ヘルプ' || commandText === 'help' || commandText === 'ヘルプ') {
    return [
      '📒 ログ参照コマンド',
      '・最新',
      '・ログ 3  （直近3件）',
      '・夕飯 / 到着 / 予定',
      '・ログ ヘルプ'
    ].join('\n');
  }

  if (commandText === '最新') {
    const rows = await getRecentLogs(env, 1);
    return formatLatestLog(rows[0]);
  }

  if (commandText === '夕飯' || commandText === '到着' || commandText === '予定') {
    const rows = await getRecentLogs(env, 1);
    return formatLatestField(rows[0], commandText);
  }

  const match = commandText.match(/^ログ\s+(\d{1,2})$/);
  if (match) {
    const n = Math.min(20, Math.max(1, parseInt(match[1], 10)));
    const rows = await getRecentLogs(env, n);
    return formatRecentLogs(rows);
  }

  return '';
}

function formatLatestLog(row: LogRow | undefined): string {
  if (!row) return '📭 ログがまだありません。';
  return [
    '📌 最新ログ',
    '🕒 ' + formatDate(row.created_at),
    '🚦 状態: ' + row.status,
    '🧭 到着: ' + (row.arrival ?? ''),
    '🍚 夕飯: ' + (row.dinner_label ?? ''),
    '📝 予定: ' + (row.schedule_detail || 'なし'),
    '⏰ 予定時刻: ' + (row.schedule_time || 'なし')
  ].join('\n');
}

function formatLatestField(row: LogRow | undefined, fieldName: string): string {
  if (!row) return '📭 ログがまだありません。';
  if (fieldName === '夕飯') return '🍚 最新の夕飯: ' + (row.dinner_label || '未設定');
  if (fieldName === '到着') return '🕒 最新の到着予定: ' + (row.arrival || '未設定');
  return [
    '📌 最新の予定',
    '📝 内容: ' + (row.schedule_detail || 'なし'),
    '⏰ 時刻: ' + (row.schedule_time || 'なし')
  ].join('\n');
}

function formatRecentLogs(rows: LogRow[]): string {
  if (!rows.length) return '📭 ログがまだありません。';
  const lines = ['📚 直近' + rows.length + '件のログ'];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    lines.push(
      String(i + 1) +
        '. ' +
        formatDate(r.created_at) +
        ' / ' +
        r.status +
        ' / 到着:' +
        (r.arrival ?? '') +
        ' / 夕飯:' +
        (r.dinner_label ?? '')
    );
  }
  return lines.join('\n');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || '-';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
}

function coerceBool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function htmlResponse(html: string): Response {
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

async function verifyLineSignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const expected = new Uint8Array(sigBuf);
  const actual = base64ToBytes(signature);
  if (!actual || actual.length !== expected.length) return false;
  let out = 0;
  for (let i = 0; i < actual.length; i++) {
    out |= actual[i] ^ expected[i];
  }
  return out === 0;
}

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i) & 0xff;
    }
    return out;
  } catch {
    return null;
  }
}
