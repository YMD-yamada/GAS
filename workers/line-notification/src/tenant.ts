import { PATTERN_PRESETS, PATTERNS } from './message-builder';

export type UserRow = {
  line_user_id: string;
  display_name: string | null;
  plan: string;
  created_at: string;
};

export type DestinationRow = {
  id: number;
  user_line_id: string;
  type: string;
  line_id: string;
  label: string | null;
  is_primary: number;
  created_at: string;
};

export type TimePatternRow = {
  id: number;
  user_line_id: string;
  sort_order: number;
  label: string;
  arrival_text: string;
};

export async function upsertUser(
  db: D1Database,
  lineUserId: string,
  displayName: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO users (line_user_id, display_name, plan, created_at)
       VALUES (?, ?, 'free', ?)
       ON CONFLICT(line_user_id) DO UPDATE SET display_name = excluded.display_name`
    )
    .bind(lineUserId, displayName, now)
    .run();
}

export async function getUser(db: D1Database, lineUserId: string): Promise<UserRow | null> {
  const row = await db
    .prepare('SELECT line_user_id, display_name, plan, created_at FROM users WHERE line_user_id = ?')
    .bind(lineUserId)
    .first<UserRow>();
  return row ?? null;
}

export async function getDestinations(db: D1Database, lineUserId: string): Promise<DestinationRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, user_line_id, type, line_id, label, is_primary, created_at
       FROM destinations WHERE user_line_id = ? ORDER BY is_primary DESC, id ASC`
    )
    .bind(lineUserId)
    .all<DestinationRow>();
  return results ?? [];
}

export async function getPrimaryDestination(
  db: D1Database,
  lineUserId: string
): Promise<DestinationRow | null> {
  const dests = await getDestinations(db, lineUserId);
  return dests[0] ?? null;
}

export async function upsertPrimaryGroupDestination(
  db: D1Database,
  lineUserId: string,
  groupId: string,
  label = '家族グループ'
): Promise<void> {
  const existing = await db
    .prepare(
      `SELECT id FROM destinations WHERE user_line_id = ? AND type = 'group' AND line_id = ?`
    )
    .bind(lineUserId, groupId)
    .first<{ id: number }>();

  const now = new Date().toISOString();
  if (existing) return;

  await db
    .prepare(`UPDATE destinations SET is_primary = 0 WHERE user_line_id = ?`)
    .bind(lineUserId)
    .run();

  await db
    .prepare(
      `INSERT INTO destinations (user_line_id, type, line_id, label, is_primary, created_at)
       VALUES (?, 'group', ?, ?, 1, ?)`
    )
    .bind(lineUserId, groupId, label, now)
    .run();
}

export async function getTimePatterns(db: D1Database, lineUserId: string): Promise<TimePatternRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, user_line_id, sort_order, label, arrival_text
       FROM time_patterns WHERE user_line_id = ? ORDER BY sort_order ASC, id ASC`
    )
    .bind(lineUserId)
    .all<TimePatternRow>();
  return results ?? [];
}

export async function applyPatternPreset(
  db: D1Database,
  lineUserId: string,
  presetKey: string
): Promise<void> {
  const preset = PATTERN_PRESETS[presetKey];
  if (!preset) return;

  await db.prepare('DELETE FROM time_patterns WHERE user_line_id = ?').bind(lineUserId).run();

  for (let i = 0; i < preset.patterns.length; i++) {
    const p = preset.patterns[i];
    await db
      .prepare(
        `INSERT INTO time_patterns (user_line_id, sort_order, label, arrival_text)
         VALUES (?, ?, ?, ?)`
      )
      .bind(lineUserId, i, p.label, p.arrival)
      .run();
  }
}

export async function ensureDefaultPatterns(db: D1Database, lineUserId: string): Promise<TimePatternRow[]> {
  let patterns = await getTimePatterns(db, lineUserId);
  if (patterns.length > 0) return patterns;

  for (let i = 0; i < PATTERNS.length; i++) {
    const p = PATTERNS[i];
    await db
      .prepare(
        `INSERT INTO time_patterns (user_line_id, sort_order, label, arrival_text)
         VALUES (?, ?, ?, ?)`
      )
      .bind(lineUserId, i, p.label, p.arrival)
      .run();
  }
  return getTimePatterns(db, lineUserId);
}

export async function getMonthlySendCount(db: D1Database, lineUserId: string): Promise<number> {
  const yearMonth = currentYearMonth();
  const row = await db
    .prepare(
      `SELECT send_count FROM usage_monthly WHERE user_line_id = ? AND year_month = ?`
    )
    .bind(lineUserId, yearMonth)
    .first<{ send_count: number }>();
  return row?.send_count ?? 0;
}

export async function incrementMonthlySendCount(db: D1Database, lineUserId: string): Promise<void> {
  const yearMonth = currentYearMonth();
  await db
    .prepare(
      `INSERT INTO usage_monthly (user_line_id, year_month, send_count)
       VALUES (?, ?, 1)
       ON CONFLICT(user_line_id, year_month) DO UPDATE SET send_count = send_count + 1`
    )
    .bind(lineUserId, yearMonth)
    .run();
}

export async function setUserPlan(db: D1Database, lineUserId: string, plan: string): Promise<void> {
  await db.prepare('UPDATE users SET plan = ? WHERE line_user_id = ?').bind(plan, lineUserId).run();
}

function currentYearMonth(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
