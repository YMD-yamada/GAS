import { getMessageBuilderClientScript } from './message-builder';
import { UI_STYLES } from './ui-styles';

const CLIENT_SCRIPT = getMessageBuilderClientScript();

const SCHEDULE_TIMES = [
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30', '翌日 00:00', '翌日 00:30', '翌日 01:00'
];

export const PAGE_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#198754" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <link rel="manifest" href="/manifest.json" />
  <title>おかえり連絡</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <style>${UI_STYLES}
    .inline-panel {
      margin-top: 0.75rem;
      padding: 0.85rem 0.75rem;
      border-radius: 0.85rem;
      background: #f0f7ff;
      border: 1.5px solid #bfdbfe;
    }
    .inline-panel .field-label { margin-top: 0.55rem; }
    .inline-panel .field-label:first-child { margin-top: 0; }
  </style>
</head>
<body>
  <div class="app-shell">
    <h1 class="app-title">おかえり連絡</h1>
    <p class="app-sub">家族に伝えるのは3つだけ<br />状態・到着・夕飯</p>

    <div class="preview-wrap">
      <p class="preview-caption">家族に届くメッセージ</p>
      <div class="preview-bubble" id="preview" aria-live="polite"></div>
    </div>

    <section class="section" id="situationSection" aria-labelledby="sitLabel">
      <p class="section-label" id="sitLabel"><span class="step-num">1</span>いまの状態</p>
      <p class="section-hint">メッセージの1行目（題名）になります</p>
      <div class="chip-grid five" role="group" aria-label="いまの状態">
        <button type="button" class="chip wide active" data-mode="none">そのまま帰る</button>
        <button type="button" class="chip" data-mode="overtime">残業しそう</button>
        <button type="button" class="chip" data-mode="late">遅れそう</button>
        <button type="button" class="chip" data-mode="drinking">飲み会</button>
        <button type="button" class="chip" data-mode="errand">寄り道</button>
        <button type="button" class="chip wide" data-mode="schedule">予定あり（買い物など）</button>
      </div>

      <div id="scheduleFields" class="inline-panel d-none">
        <label for="scheduleDetail" class="field-label">何の予定？</label>
        <input
          id="scheduleDetail"
          type="text"
          maxlength="60"
          class="form-control"
          placeholder="例：買い物、病院、美容院"
          autocomplete="off"
        />
        <p class="field-label">何時ごろ着く？</p>
        <p class="section-hint" style="margin:0 0 0.5rem">予定のあとの到着時間です</p>
        <div class="chip-grid" id="scheduleTimeGroup" role="group" aria-label="予定後の到着時間"></div>
        <input type="hidden" id="scheduleTime" value="" />
      </div>
    </section>

    <section class="section" id="arrivalSection" aria-labelledby="arrLabel">
      <p class="section-label" id="arrLabel"><span class="step-num" id="arrStep">2</span>家に着く時間</p>
      <p class="section-hint">メッセージの2行目になります</p>
      <div class="chip-grid" id="patternGroup" role="group" aria-label="到着時間"></div>
    </section>

    <section class="section" aria-labelledby="dinLabel">
      <p class="section-label" id="dinLabel"><span class="step-num" id="dinStep">3</span>夕飯どうする？</p>
      <p class="section-hint">メッセージの最後の行になります</p>
      <div class="segment-wrap" role="group" aria-label="夕飯">
        <input type="radio" name="dinner" id="d-home" value="home" checked />
        <label for="d-home">家で食べる</label>
        <input type="radio" name="dinner" id="d-eat" value="eatOut" />
        <label for="d-eat">食べて帰る</label>
        <input type="radio" name="dinner" id="d-none" value="none" />
        <label for="d-none">いらない</label>
      </div>
    </section>

    <p class="footer-links"><a href="/about">このアプリについて</a> · <a href="/privacy">プライバシー</a></p>
  </div>

  <div class="send-bar">
    <div class="app-shell" style="padding-top:0;padding-bottom:0">
      <button type="button" class="btn btn-send w-100" id="btnSend">LINEに送る</button>
    </div>
  </div>

  <div class="toast-container position-fixed bottom-0 start-50 translate-middle-x p-3" style="bottom:5.5rem!important">
    <div id="toast" class="toast align-items-center text-bg-success border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body" id="toastBody">送信しました</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    ${CLIENT_SCRIPT}

    var STORAGE_KEY = 'okaeri_prefs_v4';
    var SCHEDULE_TIMES = ${JSON.stringify(SCHEDULE_TIMES)};
    var DINNER_TEXT = { home: '家で食べます', eatOut: '食べて帰ります', none: 'いりません' };
    var patterns = [];
    var selectedIndex = 0;
    var selectedMode = 'none';
    var selectedScheduleTime = '';
    var patternGroup = document.getElementById('patternGroup');
    var scheduleTimeGroup = document.getElementById('scheduleTimeGroup');
    var arrivalSection = document.getElementById('arrivalSection');
    var arrStep = document.getElementById('arrStep');
    var dinStep = document.getElementById('dinStep');
    var btnSend = document.getElementById('btnSend');
    var preview = document.getElementById('preview');
    var scheduleFields = document.getElementById('scheduleFields');
    var scheduleTime = document.getElementById('scheduleTime');
    var scheduleDetail = document.getElementById('scheduleDetail');
    var modeChips = document.querySelectorAll('[data-mode]');
    var toastEl = document.getElementById('toast');
    var toastBody = document.getElementById('toastBody');
    var toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 2200 }) : null;

    function showToast(msg, ok) {
      if (!toast) { alert(msg); return; }
      toastBody.textContent = msg;
      toastEl.classList.toggle('text-bg-success', ok !== false);
      toastEl.classList.toggle('text-bg-danger', ok === false);
      toast.show();
    }

    function hasSchedule() {
      return selectedMode === 'schedule';
    }

    function situationKeyForApi() {
      return hasSchedule() ? 'none' : selectedMode;
    }

    function defaultPatternIndex() {
      var h = new Date().getHours();
      if (h < 17) return 0;
      if (h < 18) return 1;
      if (h < 19) return 2;
      if (h < 20) return 3;
      return Math.min(4, Math.max(0, patterns.length - 1));
    }

    function defaultScheduleTime() {
      var h = new Date().getHours();
      if (h < 19) return '20:00';
      if (h < 20) return '21:00';
      if (h < 21) return '22:00';
      if (h < 22) return '23:00';
      return '翌日 00:00';
    }

    function renderPatterns() {
      patternGroup.innerHTML = '';
      patterns.forEach(function (p, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.setAttribute('data-index', String(i));
        btn.textContent = p.arrival;
        btn.addEventListener('click', function () { setPattern(i); });
        patternGroup.appendChild(btn);
      });
    }

    function renderScheduleTimes() {
      scheduleTimeGroup.innerHTML = '';
      SCHEDULE_TIMES.forEach(function (t) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.setAttribute('data-time', t);
        btn.textContent = t;
        btn.addEventListener('click', function () { setScheduleTime(t); });
        scheduleTimeGroup.appendChild(btn);
      });
    }

    function setPattern(index) {
      selectedIndex = index;
      patternGroup.querySelectorAll('.chip').forEach(function (btn, i) {
        btn.classList.toggle('active', i === index);
        btn.setAttribute('aria-pressed', i === index ? 'true' : 'false');
      });
      savePrefs();
      updatePreview();
    }

    function setScheduleTime(t) {
      selectedScheduleTime = t || '';
      scheduleTime.value = selectedScheduleTime;
      scheduleTimeGroup.querySelectorAll('.chip').forEach(function (btn) {
        var on = btn.getAttribute('data-time') === selectedScheduleTime;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      savePrefs();
      updatePreview();
    }

    function setMode(mode) {
      selectedMode = mode || 'none';
      modeChips.forEach(function (btn) {
        var on = btn.getAttribute('data-mode') === selectedMode;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      syncLayout();
      if (hasSchedule() && !selectedScheduleTime) {
        setScheduleTime(defaultScheduleTime());
        if (scheduleDetail) setTimeout(function () { scheduleDetail.focus(); }, 50);
      } else {
        savePrefs();
        updatePreview();
      }
    }

    function syncLayout() {
      var show = hasSchedule();
      scheduleFields.classList.toggle('d-none', !show);
      arrivalSection.classList.toggle('d-none', show);
      arrStep.textContent = '2';
      dinStep.textContent = show ? '2' : '3';
    }

    function getDinnerKey() {
      var r = document.querySelector('input[name="dinner"]:checked');
      return r ? r.value : 'home';
    }

    function updatePreview() {
      var mode = resolveMessageMode(hasSchedule());
      var p = patterns[selectedIndex] || { label: '', arrival: '' };
      var text = buildMessageText({
        messageMode: mode,
        arrival: p.arrival,
        dinnerLine: DINNER_TEXT[getDinnerKey()],
        scheduleTime: selectedScheduleTime || '（未選択）',
        scheduleDetail: (scheduleDetail.value || '').trim() || '（内容未入力）',
        situationKey: situationKeyForApi()
      });
      preview.textContent = text;
      preview.classList.toggle('empty', !text);
      btnSend.textContent = getSendButtonLabel();
    }

    function savePrefs() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          patternIndex: selectedIndex,
          dinnerKey: getDinnerKey(),
          mode: selectedMode,
          scheduleTime: selectedScheduleTime,
          scheduleDetail: scheduleDetail.value
        }));
      } catch (e) {}
    }

    function loadPrefs() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          // migrate v3
          raw = localStorage.getItem('okaeri_prefs_v3');
        }
        if (!raw) return;
        var p = JSON.parse(raw);
        if (p.dinnerKey) {
          var d = document.querySelector('input[name="dinner"][value="' + p.dinnerKey + '"]');
          if (d) d.checked = true;
        }
        if (p.mode) {
          selectedMode = p.mode;
        } else if (p.scheduleMode === 'has') {
          selectedMode = 'schedule';
        } else if (p.situationKey) {
          selectedMode = p.situationKey;
        }
        if (p.scheduleTime) selectedScheduleTime = p.scheduleTime;
        if (p.scheduleDetail) scheduleDetail.value = p.scheduleDetail;
        if (typeof p.patternIndex === 'number' && p.patternIndex < patterns.length) {
          selectedIndex = p.patternIndex;
        }
      } catch (e) {}
    }

    modeChips.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.getAttribute('data-mode'));
      });
    });

    document.querySelectorAll('input[name="dinner"]').forEach(function (el) {
      el.addEventListener('change', function () { savePrefs(); updatePreview(); });
    });
    scheduleDetail.addEventListener('input', function () { savePrefs(); updatePreview(); });

    var fallbackPatterns = [
      { label: '17時半終了', arrival: '19:00前' },
      { label: '18時前終了', arrival: '19:00すぎ' },
      { label: '18時半終了', arrival: '20:00前' },
      { label: '19時半終了', arrival: '21:00前' },
      { label: '20時半終了', arrival: '22:00前' }
    ];

    function boot(list) {
      patterns = list && list.length ? list : fallbackPatterns;
      renderPatterns();
      renderScheduleTimes();
      loadPrefs();
      modeChips.forEach(function (btn) {
        var on = btn.getAttribute('data-mode') === selectedMode;
        btn.classList.toggle('active', on);
      });
      syncLayout();
      if (!localStorage.getItem(STORAGE_KEY) && !localStorage.getItem('okaeri_prefs_v3')) {
        setPattern(defaultPatternIndex());
      } else {
        setPattern(selectedIndex);
      }
      if (selectedScheduleTime) setScheduleTime(selectedScheduleTime);
      updatePreview();
    }

    fetch('/api/patterns')
      .then(function (r) { return r.json(); })
      .then(function (data) { boot((data && data.patterns) || []); })
      .catch(function () { boot(fallbackPatterns); });

    btnSend.addEventListener('click', function () {
      if (btnSend.disabled) return;
      if (hasSchedule()) {
        if (!(scheduleDetail.value || '').trim()) {
          showToast('予定の内容を入力してください', false);
          scheduleDetail.focus();
          return;
        }
        if (!selectedScheduleTime) {
          showToast('到着時間を選んでください', false);
          return;
        }
      }
      btnSend.disabled = true;
      var prevLabel = btnSend.textContent;
      btnSend.textContent = '送信中...';

      fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          patternIndex: selectedIndex,
          dinnerKey: getDinnerKey(),
          hasSchedule: hasSchedule(),
          scheduleTime: selectedScheduleTime,
          scheduleDetail: scheduleDetail.value.trim(),
          situationKey: situationKeyForApi()
        })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (out) {
          btnSend.disabled = false;
          btnSend.textContent = prevLabel;
          if (out.ok && out.data && out.data.ok) {
            showToast('送りました', true);
            savePrefs();
          } else {
            showToast((out.data && out.data.error) || '送信に失敗しました', false);
          }
        })
        .catch(function (err) {
          btnSend.disabled = false;
          btnSend.textContent = prevLabel;
          showToast(err && err.message ? err.message : String(err), false);
        });
    });
  </script>
</body>
</html>`;
