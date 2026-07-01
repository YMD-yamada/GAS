export type MessageMode = 'standard' | 'withSchedule';

export const PATTERNS = [
  { id: 'p1', label: '17時半終了', arrival: '19:00前' },
  { id: 'p2', label: '18時前終了', arrival: '19:00すぎ' },
  { id: 'p3', label: '18時半終了', arrival: '20:00前' },
  { id: 'p4', label: '19時半終了', arrival: '21:00前' },
  { id: 'p5', label: '20時半終了', arrival: '22:00前' }
] as const;

export const DINNER_LABELS: Record<string, string> = {
  home: '家で食べます',
  eatOut: '食べて帰ります',
  none: 'いりません'
};

/** 仕事帰りにありがちなこと（任意） */
export const SITUATION_LABELS: Record<string, string> = {
  none: '',
  overtime: '残業になりそうです',
  drinking: '飲み会があります',
  late: '少し遅れる見込みです',
  errand: '帰り道で寄り道があります'
};

export const PATTERN_PRESETS: Record<string, { label: string; patterns: { label: string; arrival: string }[] }> = {
  regular: {
    label: '定時（9〜18時）',
    patterns: [
      { label: '17時半終了', arrival: '19:00前' },
      { label: '18時前終了', arrival: '19:00すぎ' },
      { label: '18時半終了', arrival: '20:00前' }
    ]
  },
  overtime: {
    label: '残業多め',
    patterns: [
      { label: '19時半終了', arrival: '21:00前' },
      { label: '20時半終了', arrival: '22:00前' },
      { label: '21時半終了', arrival: '23:00前' }
    ]
  },
  shift: {
    label: 'シフト制',
    patterns: [
      { label: '15時終了', arrival: '16:30前' },
      { label: '22時終了', arrival: '23:00前' },
      { label: '翌1時終了', arrival: '翌2:00前' }
    ]
  }
};

export const FREE_MONTHLY_SEND_LIMIT = 30;
export const MAX_MESSAGE_LINES = 3;

export function resolveMessageMode(hasSchedule: boolean): MessageMode {
  return hasSchedule ? 'withSchedule' : 'standard';
}

export function resolveSituationLine(situationKey: string): string {
  if (!situationKey || situationKey === 'none') return '';
  return SITUATION_LABELS[situationKey] ?? '';
}

export function buildMessageText(input: {
  messageMode: MessageMode;
  patternLabel: string;
  arrival: string;
  dinnerLine: string;
  scheduleTime: string;
  scheduleDetail: string;
  situationLine: string;
}): string {
  const lines: string[] = [];

  if (input.messageMode === 'withSchedule') {
    lines.push('📌【予定】' + input.scheduleDetail);
    lines.push('🕒【到着予定（予想）】' + input.scheduleTime);
    lines.push('🍚【夕飯】' + input.dinnerLine);
  } else if (input.situationLine) {
    lines.push('📌【備考】' + input.situationLine);
    lines.push('🕒【到着予定】' + input.arrival);
    lines.push('🍚【夕飯】' + input.dinnerLine);
  } else {
    lines.push('🕒【到着予定】' + input.arrival);
    lines.push('🍚【夕飯】' + input.dinnerLine);
  }

  return lines.slice(0, MAX_MESSAGE_LINES).join('\n');
}

export function getSendButtonLabel(): string {
  return 'LINEに送る';
}

/** クライアントプレビュー用（page-html / liff-html に埋め込み） */
export function getMessageBuilderClientScript(): string {
  return `
var SITUATION_TEXT = {
  none: '',
  overtime: '残業になりそうです',
  drinking: '飲み会があります',
  late: '少し遅れる見込みです',
  errand: '帰り道で寄り道があります'
};
var MAX_MESSAGE_LINES = 3;
function resolveMessageMode(hasSchedule) {
  return hasSchedule ? 'withSchedule' : 'standard';
}
function resolveSituationLine(key) {
  if (!key || key === 'none') return '';
  return SITUATION_TEXT[key] || '';
}
function buildMessageText(opts) {
  var lines = [];
  if (opts.messageMode === 'withSchedule') {
    lines.push('📌【予定】' + opts.scheduleDetail);
    lines.push('🕒【到着予定（予想）】' + opts.scheduleTime);
    lines.push('🍚【夕飯】' + opts.dinnerLine);
  } else if (opts.situationLine) {
    lines.push('📌【備考】' + opts.situationLine);
    lines.push('🕒【到着予定】' + opts.arrival);
    lines.push('🍚【夕飯】' + opts.dinnerLine);
  } else {
    lines.push('🕒【到着予定】' + opts.arrival);
    lines.push('🍚【夕飯】' + opts.dinnerLine);
  }
  return lines.slice(0, MAX_MESSAGE_LINES).join('\\n');
}
function getSendButtonLabel() {
  return 'LINEに送る';
}
`.trim();
}
