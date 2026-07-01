export type MessageMode = 'workEnd' | 'leavingNow' | 'scheduleOnly';

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

export function resolveMessageMode(hasSchedule: boolean, messageMode?: string): MessageMode {
  if (hasSchedule) return 'scheduleOnly';
  if (messageMode === 'leavingNow') return 'leavingNow';
  return 'workEnd';
}

export function buildMessageText(input: {
  messageMode: MessageMode;
  patternLabel: string;
  arrival: string;
  dinnerLine: string;
  scheduleTime: string;
  scheduleDetail: string;
}): string {
  const lines: string[] = [];

  if (input.messageMode === 'scheduleOnly') {
    lines.push('📋 予定の連絡です');
    lines.push('📌【予定】' + input.scheduleDetail);
    lines.push('🕒【到着予定（予想）】' + input.scheduleTime);
    lines.push('🍚【夕飯】' + input.dinnerLine);
  } else if (input.messageMode === 'leavingNow') {
    lines.push('🏠 今から帰ります！');
    lines.push('🕒【到着予定】' + input.arrival);
    lines.push('🍚【夕飯】' + input.dinnerLine);
  } else {
    lines.push('💼 仕事終了の連絡です');
    lines.push('🕐【終了予定】' + input.patternLabel);
    lines.push('🕒【到着予定】' + input.arrival);
    lines.push('🍚【夕飯】' + input.dinnerLine);
  }

  return lines.join('\n');
}

export function getSendButtonLabel(mode: MessageMode): string {
  if (mode === 'leavingNow') return '今から帰るとLINEに送る';
  if (mode === 'scheduleOnly') return '予定をLINEに送る';
  return '仕事終了をLINEに送る';
}

/** クライアントプレビュー用（page-html / liff-html に埋め込み） */
export function getMessageBuilderClientScript(): string {
  return `
function resolveMessageMode(hasSchedule, messageMode) {
  if (hasSchedule) return 'scheduleOnly';
  if (messageMode === 'leavingNow') return 'leavingNow';
  return 'workEnd';
}
function buildMessageText(opts) {
  var mode = opts.messageMode;
  var lines = [];
  if (mode === 'scheduleOnly') {
    lines.push('📋 予定の連絡です');
    lines.push('📌【予定】' + opts.scheduleDetail);
    lines.push('🕒【到着予定（予想）】' + opts.scheduleTime);
    lines.push('🍚【夕飯】' + opts.dinnerLine);
  } else if (mode === 'leavingNow') {
    lines.push('🏠 今から帰ります！');
    lines.push('🕒【到着予定】' + opts.arrival);
    lines.push('🍚【夕飯】' + opts.dinnerLine);
  } else {
    lines.push('💼 仕事終了の連絡です');
    lines.push('🕐【終了予定】' + opts.patternLabel);
    lines.push('🕒【到着予定】' + opts.arrival);
    lines.push('🍚【夕飯】' + opts.dinnerLine);
  }
  return lines.join('\\n');
}
function getSendButtonLabel(mode) {
  if (mode === 'leavingNow') return '今から帰るとLINEに送る';
  if (mode === 'scheduleOnly') return '予定をLINEに送る';
  return '仕事終了をLINEに送る';
}
`.trim();
}
