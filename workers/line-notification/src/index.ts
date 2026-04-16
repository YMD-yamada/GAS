import { PAGE_HTML } from './page-html';

const PATTERNS = [
  { id: 'p1', label: '17時半終了', arrival: '19:00前' },
  { id: 'p2', label: '18時前終了', arrival: '19:00すぎ' },
  { id: 'p3', label: '18時半終了', arrival: '20:00前' },
  { id: 'p4', label: '19時半終了', arrival: '21:00前' },
  { id: 'p5', label: '20時半終了', arrival: '22:00前' }
] as const;

const DINNER_LABELS: Record<string, string> = {
  home: '家で食べます',
  eatOut: '食べて帰ります',
  none: 'いりません'
};

export interface Env {
  DB: D1Database;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_TO_ID: string;
  LINE_CHANNEL_SECRET?: string;
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
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(PAGE_HTML, {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/send') {
      return handleSend(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/webhook') {
      return handleWebhook(request, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};

async function handleSend(request: Request, env: Env): Promise<Response> {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN;
  const toId = env.LINE_TO_ID;
  if (!token || !toId) {
    return jsonResponse(
      { ok: false, error: 'シークレットに LINE_CHANNEL_ACCESS_TOKEN と LINE_TO_ID を設定してください。' },
      500
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, error: 'JSON が不正です。' }, 400);
  }

  const patternIndex = Number(body.patternIndex);
  const dinnerKey = String(body.dinnerKey ?? '');
  const hasSchedule = coerceBool(body.hasSchedule);
  const scheduleTime = String(body.scheduleTime ?? '').trim();
  const scheduleDetail = String(body.scheduleDetail ?? '').trim();

  if (!Number.isInteger(patternIndex) || patternIndex < 0 || patternIndex >= PATTERNS.length) {
    return jsonResponse({ ok: false, error: '到着パターンが不正です。' }, 400);
  }
  if (!Object.prototype.hasOwnProperty.call(DINNER_LABELS, dinnerKey)) {
    return jsonResponse({ ok: false, error: '夕飯オプションが不正です。' }, 400);
  }

  const pattern = PATTERNS[patternIndex];
  const arrival = pattern.arrival;
  const dinnerLine = DINNER_LABELS[dinnerKey];

  if (hasSchedule) {
    if (!scheduleTime) {
      return jsonResponse({ ok: false, error: '予想帰宅時間を選択してください。' }, 400);
    }
    if (!scheduleDetail) {
      return jsonResponse({ ok: false, error: '予定の内容を入力してください。' }, 400);
    }
  }

  const { text } = buildMessageText({
    arrival,
    dinnerLine,
    hasSchedule,
    scheduleTime,
    scheduleDetail
  });

  const lineRes = await linePush(toId, [{ type: 'text', text }], token);
  if (lineRes.ok) {
    await appendLog(env, {
      status: 'SUCCESS',
      toId,
      patternId: pattern.id,
      patternLabel: pattern.label,
      arrival,
      dinnerKey,
      dinnerLabel: dinnerLine,
      hasSchedule,
      scheduleTime,
      scheduleDetail,
      sentText: text,
      errorMessage: ''
    });
    return jsonResponse({ ok: true });
  }

  const errMsg = `LINE API エラー (${lineRes.status}): ${lineRes.body}`;
  await appendLog(env, {
    status: 'FAILED',
    toId,
    patternId: pattern.id,
    patternLabel: pattern.label,
    arrival,
    dinnerKey,
    dinnerLabel: dinnerLine,
    hasSchedule,
    scheduleTime,
    scheduleDetail,
    sentText: text,
    errorMessage: errMsg
  });
  return jsonResponse({ ok: false, error: errMsg }, 502);
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN;
  const toId = env.LINE_TO_ID;
  const rawBody = await request.text();

  if (env.LINE_CHANNEL_SECRET) {
    const sig = request.headers.get('x-line-signature');
    const ok = await verifyLineSignature(rawBody, sig, env.LINE_CHANNEL_SECRET);
    if (!ok) {
      return new Response('Unauthorized', { status: 401 });
    }
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
    }
    const src = (ev as { source?: { type?: string; groupId?: string } }).source;
    if (src && src.type === 'group' && src.groupId && !seen[src.groupId]) {
      seen[src.groupId] = true;
      groupIds.push(src.groupId);
    }
  }

  if (groupIds.length > 0 && token && toId) {
    const text = '取得した groupId:\n' + groupIds.join('\n');
    await linePush(toId, [{ type: 'text', text }], token);
  }

  return new Response('OK');
}

function buildMessageText(input: {
  arrival: string;
  dinnerLine: string;
  hasSchedule: boolean;
  scheduleTime: string;
  scheduleDetail: string;
}): { text: string } {
  let text = '🏠 今から帰ります！\n';
  if (input.hasSchedule) {
    text +=
      '📌【予定】' + input.scheduleDetail + '\n' +
      '🕒【到着予定（予想）】' + input.scheduleTime + '\n' +
      '🍚【夕飯】' + input.dinnerLine;
  } else {
    text +=
      '🕒【到着予定】' + input.arrival + '\n' +
      '🍚【夕飯】' + input.dinnerLine;
  }
  return { text };
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
  }
): Promise<void> {
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

async function getRecentLogs(env: Env, limit: number): Promise<LogRow[]> {
  try {
    const { results } = await env.DB.prepare(
      `SELECT created_at, status, to_id, pattern_id, pattern_label, arrival,
              dinner_key, dinner_label, has_schedule, schedule_time, schedule_detail, sent_text, error_message
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
  if (fieldName === '夕飯') {
    return '🍚 最新の夕飯: ' + (row.dinner_label || '未設定');
  }
  if (fieldName === '到着') {
    return '🕒 最新の到着予定: ' + (row.arrival || '未設定');
  }
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
      ' / ' +
      '到着:' +
      (r.arrival ?? '') +
      ' / ' +
      '夕飯:' +
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
