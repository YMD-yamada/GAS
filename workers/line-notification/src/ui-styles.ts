export const UI_STYLES = `
    :root {
      --pattern-active-bg: #0d6efd;
      --pattern-active-color: #fff;
      --pattern-muted: #e9ecef;
      --send-green: #198754;
      --send-green-hover: #157347;
    }
    body {
      min-height: 100vh;
      background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
      padding-bottom: 6rem;
    }
    .pattern-btn {
      min-height: 4.25rem;
      font-size: 1.05rem;
      font-weight: 600;
      border-width: 2px;
      transition: transform 0.08s ease, box-shadow 0.15s ease;
    }
    .pattern-btn:not(.active) {
      background: var(--pattern-muted);
      border-color: #ced4da;
      color: #495057;
    }
    .pattern-btn.active {
      background: var(--pattern-active-bg);
      border-color: var(--pattern-active-bg);
      color: var(--pattern-active-color);
      box-shadow: 0 0.35rem 0.85rem rgba(13, 110, 253, 0.45);
      transform: scale(1.02);
    }
    .segment-wrap {
      display: flex;
      border-radius: 0.5rem;
      overflow: hidden;
      border: 2px solid #dee2e6;
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
      padding: 0.9rem 0.5rem;
      text-align: center;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      border-right: 1px solid #dee2e6;
      background: #f8f9fa;
      color: #495057;
    }
    .segment-wrap label:last-child { border-right: none; }
    .segment-wrap input:checked + label {
      background: var(--pattern-active-bg);
      color: #fff;
    }
    .send-bar {
      position: fixed;
      left: 0; right: 0; bottom: 0;
      padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(8px);
      border-top: 1px solid rgba(0,0,0,0.08);
      z-index: 1000;
    }
    .btn-send {
      min-height: 3.5rem;
      font-size: 1.05rem;
      font-weight: 700;
      background: var(--send-green);
      border: none;
      color: #fff;
    }
    .btn-send:hover:not(:disabled) { background: var(--send-green-hover); color: #fff; }
    .preview-card {
      font-size: 0.9rem;
      white-space: pre-wrap;
      background: #fff;
      border: 1px dashed #adb5bd;
    }
    .toast-container { z-index: 1100; }
`.trim();
