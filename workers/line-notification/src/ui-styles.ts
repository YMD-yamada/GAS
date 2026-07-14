export const UI_STYLES = `
    :root {
      --accent: #0d6efd;
      --accent-soft: #e7f0ff;
      --send-green: #198754;
      --send-green-hover: #157347;
      --ink: #1f2937;
      --muted: #6b7280;
      --line: #e5e7eb;
      --card: #ffffff;
      --page: #f3f4f6;
    }
    * { box-sizing: border-box; }
    body {
      min-height: 100vh;
      margin: 0;
      color: var(--ink);
      background: var(--page);
      padding-bottom: 6.5rem;
      font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
    }
    .app-shell {
      max-width: 28rem;
      margin: 0 auto;
      padding: 1rem 1rem 0;
    }
    .app-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
      text-align: center;
      letter-spacing: 0.02em;
    }
    .app-sub {
      margin: 0.35rem 0 1rem;
      text-align: center;
      color: var(--muted);
      font-size: 0.85rem;
      line-height: 1.45;
    }
    .section {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 1rem;
      padding: 0.9rem 0.85rem 1rem;
      margin-bottom: 0.75rem;
    }
    .section-label {
      display: flex;
      align-items: baseline;
      gap: 0.45rem;
      margin: 0 0 0.65rem;
      font-size: 0.95rem;
      font-weight: 700;
    }
    .step-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.35rem;
      height: 1.35rem;
      border-radius: 999px;
      background: var(--accent);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 800;
      flex-shrink: 0;
    }
    .section-hint {
      margin: -0.25rem 0 0.65rem;
      color: var(--muted);
      font-size: 0.78rem;
    }
    .chip-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .chip-grid.three {
      grid-template-columns: 1fr 1fr 1fr;
    }
    .chip-grid.five {
      grid-template-columns: 1fr 1fr;
    }
    .chip {
      appearance: none;
      border: 2px solid var(--line);
      background: #f9fafb;
      color: var(--ink);
      border-radius: 0.85rem;
      min-height: 3rem;
      padding: 0.55rem 0.5rem;
      font-size: 0.92rem;
      font-weight: 700;
      line-height: 1.2;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.12s, background 0.12s, color 0.12s, transform 0.08s;
    }
    .chip:active { transform: scale(0.98); }
    .chip.active {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: #084298;
      box-shadow: inset 0 0 0 1px rgba(13,110,253,0.15);
    }
    .chip.wide { grid-column: 1 / -1; }
    .chip-sub {
      display: block;
      margin-top: 0.15rem;
      font-size: 0.72rem;
      font-weight: 500;
      opacity: 0.75;
    }
    .segment-wrap {
      display: flex;
      border-radius: 0.85rem;
      overflow: hidden;
      border: 2px solid var(--line);
      background: #fff;
    }
    .segment-wrap input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .segment-wrap label {
      flex: 1;
      margin: 0;
      padding: 0.85rem 0.35rem;
      text-align: center;
      font-weight: 700;
      font-size: 0.86rem;
      cursor: pointer;
      border-right: 1px solid var(--line);
      background: #f9fafb;
      color: #4b5563;
    }
    .segment-wrap label:last-child { border-right: none; }
    .segment-wrap input:checked + label {
      background: var(--accent);
      color: #fff;
    }
    .field-label {
      display: block;
      margin: 0 0 0.35rem;
      font-size: 0.82rem;
      font-weight: 700;
      color: #374151;
    }
    .form-select, .form-control {
      border-radius: 0.75rem !important;
      border: 1.5px solid var(--line) !important;
      min-height: 2.75rem;
      font-size: 1rem !important;
    }
    .preview-wrap {
      margin-bottom: 0.75rem;
    }
    .preview-caption {
      margin: 0 0 0.4rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--muted);
      text-align: center;
    }
    .preview-bubble {
      background: #06c755;
      color: #fff;
      border-radius: 1rem 1rem 1rem 0.25rem;
      padding: 0.85rem 1rem;
      white-space: pre-wrap;
      font-size: 0.95rem;
      font-weight: 600;
      line-height: 1.55;
      box-shadow: 0 0.35rem 1rem rgba(6, 199, 85, 0.25);
      min-height: 4.5rem;
    }
    .preview-bubble.empty {
      background: #d1d5db;
      box-shadow: none;
      font-weight: 500;
    }
    .send-bar {
      position: fixed;
      left: 0; right: 0; bottom: 0;
      padding: 0.7rem 1rem calc(0.7rem + env(safe-area-inset-bottom));
      background: rgba(255,255,255,0.94);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(0,0,0,0.06);
      z-index: 1000;
    }
    .btn-send {
      min-height: 3.4rem;
      font-size: 1.08rem;
      font-weight: 800;
      background: var(--send-green);
      border: none;
      color: #fff;
      border-radius: 0.9rem;
    }
    .btn-send:hover:not(:disabled),
    .btn-send:focus:not(:disabled) {
      background: var(--send-green-hover);
      color: #fff;
    }
    .btn-send:disabled {
      opacity: 0.7;
    }
    .footer-links {
      text-align: center;
      margin: 0.25rem 0 0.5rem;
      font-size: 0.78rem;
    }
    .footer-links a { color: var(--muted); text-decoration: none; }
    .toast-container { z-index: 1100; }
    .schedule-panel {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--line);
    }
`.trim();
