import { getMessageBuilderClientScript } from './message-builder';
import { UI_STYLES } from './ui-styles';

const CLIENT_SCRIPT = getMessageBuilderClientScript();

export const PAGE_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#198754" />
  <link rel="manifest" href="/manifest.json" />
  <title>おかえり連絡</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <style>${UI_STYLES}</style>
</head>
<body>
  <div class="container py-3 px-3">
    <h1 class="h5 text-center mb-1 fw-bold">おかえり連絡</h1>
    <p class="text-center text-muted small mb-3">仕事終了予定・帰宅時間を家族にLINEで送る</p>

    <p class="small fw-semibold text-secondary mb-2">何ごろ帰る？</p>
    <div class="d-grid gap-2 mb-4" id="patternGroup"></div>

    <p class="small fw-semibold text-secondary mb-2">夕飯</p>
    <div class="segment-wrap mb-3" role="group" aria-label="夕飯">
      <input type="radio" name="dinner" id="d-home" value="home" checked />
      <label for="d-home">家で食べる</label>
      <input type="radio" name="dinner" id="d-eat" value="eatOut" />
      <label for="d-eat">食べて帰る</label>
      <input type="radio" name="dinner" id="d-none" value="none" />
      <label for="d-none">いらない</label>
    </div>

    <div id="situationWrap">
      <p class="small fw-semibold text-secondary mb-2">あったら選ぶ（任意）</p>
      <select id="situationKey" class="form-select mb-3" aria-label="仕事帰りの備考">
        <option value="none">特になし</option>
        <option value="overtime">残業しそう</option>
        <option value="drinking">飲み会</option>
        <option value="late">遅れそう</option>
        <option value="errand">寄り道</option>
      </select>
    </div>

    <p class="small fw-semibold text-secondary mb-2">予定</p>
    <div class="segment-wrap mb-3" role="group" aria-label="予定ありなし">
      <input type="radio" name="scheduleMode" id="s-none" value="none" checked />
      <label for="s-none">予定なし</label>
      <input type="radio" name="scheduleMode" id="s-has" value="has" />
      <label for="s-has">予定あり</label>
    </div>

    <div id="scheduleFields" class="border rounded-3 p-3 mb-3 d-none bg-white">
      <label for="scheduleTime" class="form-label small fw-semibold mb-1">予想帰宅時間</label>
      <select id="scheduleTime" class="form-select mb-2">
        <option value="">選択してください</option>
        <option value="19:00">19:00</option>
        <option value="19:30">19:30</option>
        <option value="20:00">20:00</option>
        <option value="20:30">20:30</option>
        <option value="21:00">21:00</option>
        <option value="21:30">21:30</option>
        <option value="22:00">22:00</option>
        <option value="22:30">22:30</option>
        <option value="23:00">23:00</option>
        <option value="23:30">23:30</option>
        <option value="翌日 00:00">翌日 00:00</option>
        <option value="翌日 00:30">翌日 00:30</option>
        <option value="翌日 01:00">翌日 01:00</option>
      </select>
      <label for="scheduleDetail" class="form-label small fw-semibold mb-1">予定の内容</label>
      <input id="scheduleDetail" type="text" maxlength="60" class="form-control" placeholder="例：買い物、病院" />
    </div>

    <p class="small fw-semibold text-secondary mb-2">プレビュー</p>
    <div class="preview-card rounded-3 p-3 mb-2" id="preview"></div>
  </div>

  <div class="send-bar">
    <div class="container px-3">
      <button type="button" class="btn btn-send w-100 rounded-3 shadow-sm" id="btnSend">LINEに送る</button>
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

    var STORAGE_KEY = 'okaeri_prefs_v2';
    var DINNER_TEXT = { home: '家で食べます', eatOut: '食べて帰ります', none: 'いりません' };
    var patterns = [];
    var selectedIndex = 0;
    var patternGroup = document.getElementById('patternGroup');
    var btnSend = document.getElementById('btnSend');
    var preview = document.getElementById('preview');
    var scheduleFields = document.getElementById('scheduleFields');
    var situationWrap = document.getElementById('situationWrap');
    var situationKey = document.getElementById('situationKey');
    var scheduleTime = document.getElementById('scheduleTime');
    var scheduleDetail = document.getElementById('scheduleDetail');
    var toastEl = document.getElementById('toast');
    var toastBody = document.getElementById('toastBody');
    var toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 2500 }) : null;

    function showToast(msg, ok) {
      if (!toast) { alert(msg); return; }
      toastBody.textContent = msg;
      toastEl.classList.toggle('text-bg-success', ok !== false);
      toastEl.classList.toggle('text-bg-danger', ok === false);
      toast.show();
    }

    function defaultPatternIndex() {
      var h = new Date().getHours();
      if (h < 17) return 0;
      if (h < 18) return 1;
      if (h < 19) return 2;
      if (h < 20) return 3;
      return Math.min(4, patterns.length - 1);
    }

    function renderPatterns() {
      patternGroup.innerHTML = '';
      patterns.forEach(function (p, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn pattern-btn';
        btn.setAttribute('data-index', String(i));
        btn.innerHTML = '到着 ' + p.arrival;
        btn.addEventListener('click', function () { setPattern(i); });
        patternGroup.appendChild(btn);
      });
    }

    function setPattern(index) {
      selectedIndex = index;
      patternGroup.querySelectorAll('.pattern-btn').forEach(function (btn, i) {
        var on = i === index;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      savePrefs();
      updatePreview();
    }

    function getSituationKey() {
      return situationKey ? situationKey.value : 'none';
    }

    function getDinnerKey() {
      var r = document.querySelector('input[name="dinner"]:checked');
      return r ? r.value : 'home';
    }

    function hasSchedule() {
      var r = document.querySelector('input[name="scheduleMode"]:checked');
      return !!r && r.value === 'has';
    }

    function effectiveMessageMode() {
      return resolveMessageMode(hasSchedule());
    }

    function updateScheduleFields() {
      var show = hasSchedule();
      scheduleFields.classList.toggle('d-none', !show);
      situationWrap.classList.toggle('d-none', show);
      if (show && situationKey) situationKey.value = 'none';
      savePrefs();
      updatePreview();
    }

    function updatePreview() {
      var mode = effectiveMessageMode();
      var p = patterns[selectedIndex] || { label: '', arrival: '' };
      var text = buildMessageText({
        messageMode: mode,
        patternLabel: p.label,
        arrival: p.arrival,
        dinnerLine: DINNER_TEXT[getDinnerKey()],
        scheduleTime: scheduleTime.value || '（未選択）',
        scheduleDetail: (scheduleDetail.value || '').trim() || '（内容未入力）',
        situationLine: resolveSituationLine(getSituationKey())
      });
      preview.textContent = text;
      btnSend.textContent = getSendButtonLabel();
    }

    function savePrefs() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          patternIndex: selectedIndex,
          dinnerKey: getDinnerKey(),
          situationKey: getSituationKey(),
          scheduleMode: hasSchedule() ? 'has' : 'none',
          scheduleTime: scheduleTime.value,
          scheduleDetail: scheduleDetail.value
        }));
      } catch (e) {}
    }

    function loadPrefs() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        var p = JSON.parse(raw);
        if (p.dinnerKey) {
          var d = document.querySelector('input[name="dinner"][value="' + p.dinnerKey + '"]');
          if (d) d.checked = true;
        }
        if (p.situationKey && situationKey) {
          situationKey.value = p.situationKey;
        }
        if (p.scheduleMode === 'has') {
          document.getElementById('s-has').checked = true;
        }
        if (p.scheduleTime) scheduleTime.value = p.scheduleTime;
        if (p.scheduleDetail) scheduleDetail.value = p.scheduleDetail;
        if (typeof p.patternIndex === 'number' && p.patternIndex < patterns.length) {
          selectedIndex = p.patternIndex;
        }
      } catch (e) {}
    }

    document.querySelectorAll('input[name="dinner"]').forEach(function (el) {
      el.addEventListener('change', function () { savePrefs(); updatePreview(); });
    });
    if (situationKey) {
      situationKey.addEventListener('change', function () { savePrefs(); updatePreview(); });
    }
    document.querySelectorAll('input[name="scheduleMode"]').forEach(function (el) {
      el.addEventListener('change', updateScheduleFields);
    });
    scheduleTime.addEventListener('change', function () { savePrefs(); updatePreview(); });
    scheduleDetail.addEventListener('input', function () { savePrefs(); updatePreview(); });

    fetch('/api/patterns')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        patterns = (data && data.patterns) || [];
        if (!patterns.length) {
          patterns = [
            { label: '17時半終了', arrival: '19:00前' },
            { label: '18時前終了', arrival: '19:00すぎ' },
            { label: '18時半終了', arrival: '20:00前' },
            { label: '19時半終了', arrival: '21:00前' },
            { label: '20時半終了', arrival: '22:00前' }
          ];
        }
        renderPatterns();
        loadPrefs();
        if (!localStorage.getItem(STORAGE_KEY)) setPattern(defaultPatternIndex());
        else setPattern(selectedIndex);
        updateScheduleFields();
      })
      .catch(function () {
        patterns = [
          { label: '17時半終了', arrival: '19:00前' },
          { label: '18時前終了', arrival: '19:00すぎ' },
          { label: '18時半終了', arrival: '20:00前' },
          { label: '19時半終了', arrival: '21:00前' },
          { label: '20時半終了', arrival: '22:00前' }
        ];
        renderPatterns();
        setPattern(defaultPatternIndex());
        updateScheduleFields();
      });

    btnSend.addEventListener('click', function () {
      if (btnSend.disabled) return;
      if (hasSchedule()) {
        if (!scheduleTime.value) { showToast('予想帰宅時間を選択してください', false); return; }
        if (!scheduleDetail.value.trim()) { showToast('予定の内容を入力してください', false); return; }
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
          scheduleTime: scheduleTime.value,
          scheduleDetail: scheduleDetail.value.trim(),
          situationKey: getSituationKey()
        })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (out) {
          btnSend.disabled = false;
          btnSend.textContent = prevLabel;
          if (out.ok && out.data && out.data.ok) {
            showToast('送信しました', true);
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
