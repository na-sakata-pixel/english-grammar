// ============================================================
// progress.js — 全ページ共通の進捗送信ライブラリ
// 各HTMLの </body> 直前で読み込む：
//   <script src="../progress.js"></script>
// ============================================================

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxmg_1WeVvyxYhYTacduPAKPYgBB4aS70Zej-gQWjuvLXe0kgLr_GPSBoKELKwtPnOsfA/exec';

// ── 学生名の取得 ──
function getStudentName() {
  let name = sessionStorage.getItem('student_name');
  if (name) return name;
  name = localStorage.getItem('student_name');
  if (name) { sessionStorage.setItem('student_name', name); return name; }
  return null;
}

// ── 名前入力モーダルを表示 ──
function showNameModal(callback) {
  const existing = getStudentName();
  if (existing) { if (callback) callback(existing); return; }

  const modal = document.createElement('div');
  modal.id = 'name-modal';
  modal.innerHTML = `
    <div style="
      position:fixed;inset:0;z-index:9999;
      background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;padding:20px;
    ">
      <div style="
        background:#16181f;border:1px solid #2a2d38;border-radius:16px;
        padding:40px 36px;max-width:420px;width:100%;text-align:center;
        box-shadow:0 24px 64px rgba(0,0,0,0.6);
      ">
        <div style="font-family:monospace;font-size:.65rem;color:#a87ec9;letter-spacing:.2em;margin-bottom:10px">
          ENGLISH GRAMMAR
        </div>
        <h2 style="font-size:1.4rem;color:#e8e6e0;margin-bottom:8px">
          はじめに名前を入力してください
        </h2>
        <p style="font-size:.82rem;color:#6b6f7e;margin-bottom:28px;line-height:1.7">
          進捗の記録に使います。<br>漢字でもローマ字でも構いません。
        </p>
        <input
          id="pg-name-input"
          type="text"
          placeholder="例：山田太郎 / Yamada Taro"
          style="
            width:100%;padding:13px 16px;
            background:#1c1f29;border:1.5px solid #2a2d38;border-radius:8px;
            color:#e8e6e0;font-size:.95rem;
            outline:none;margin-bottom:16px;box-sizing:border-box;
          "
        />
        <button
          id="pg-name-submit"
          style="
            width:100%;padding:13px;
            background:#a87ec9;color:#0e0f13;
            border:none;border-radius:8px;
            font-size:.95rem;font-weight:500;cursor:pointer;
          "
        >開始する</button>
        <p id="pg-name-error" style="color:#c97e7e;font-size:.78rem;margin-top:10px;display:none">
          名前を入力してください
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const doSubmit = function() {
    const val = document.getElementById('pg-name-input').value.trim();
    if (!val) {
      document.getElementById('pg-name-error').style.display = 'block';
      return;
    }
    sessionStorage.setItem('student_name', val);
    localStorage.setItem('student_name', val);
    document.getElementById('name-modal').remove();
    if (callback) callback(val);
  };

  document.getElementById('pg-name-submit').addEventListener('click', doSubmit);
  document.getElementById('pg-name-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doSubmit();
  });

  setTimeout(function() {
    const inp = document.getElementById('pg-name-input');
    if (inp) inp.focus();
  }, 100);
}

// ── 進捗をApps Scriptに送信 ──
function sendProgress(opts) {
  const name = getStudentName();
  if (!name) return;

  const payload = {
    name:     name,
    unit:     String(opts.unit).padStart(2, '0'),
    step:     String(opts.step),
    stepName: opts.stepName || '',
    score:    opts.score    !== undefined ? opts.score : '',
    total:    opts.total    !== undefined ? opts.total : '',
    elapsed:  opts.elapsed  || '',
    ua:       navigator.userAgent.substring(0, 80),
  };

  fetch(APPS_SCRIPT_URL, {
    method:  'POST',
    mode:    'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  }).catch(function(err) { console.warn('[progress.js] 送信失敗:', err); });

  // localStorageにバックアップ
  try {
    localStorage.setItem(
      'progress_u' + payload.unit + '_s' + payload.step,
      JSON.stringify(Object.assign({}, payload, { savedAt: new Date().toISOString() }))
    );
  } catch(e) {}
}

// ── 所要時間計算 ──
const _pageStart = Date.now();
function getElapsed() { return Math.round((Date.now() - _pageStart) / 1000); }

// ── 自動表示（DOM確実に準備済みのタイミングで実行）──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { showNameModal(); });
} else {
  showNameModal();
}
