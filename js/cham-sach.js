/* cham-sach.js — POP-UP CHẤM BÀI SÁCH trên dashboard (web v1.387.0, 21/10/2026; mẫu thầy duyệt `myLesson - thiet ke nop sach\mau-v4-dashboard.html`).
   Trái: danh sách em + trạng thái · Giữa: ảnh trang em nộp (tự xoay theo AI) + thanh vẽ (bút · khoanh · mũi tên · ✓ ✕ · chữ · hoàn tác ·
   xoá, 3 màu) + dải "lần nộp trước" (ảnh MÁY CHẶN — em không biết thầy thấy) · Phải: CHẤM THAM KHẢO (AI đọc đáp án em khoanh, so đáp án
   `sachGoc/<sách>_p<trang>.dapAn`) + lời nhắn soạn sẵn. 📋 CHỤP GỬI ZALO = ảnh đã vẽ + dải tên vào clipboard. ĐẠT / TRẢ LẠI ⇒ hàm máy chủ
   `duyetSach` (chỉ thầy). Dữ liệu: `lessonSach/<LỚP>__<bài>__<bước>__<mã>` (chỉ máy chủ ghi). Mở: ChamSach.mo({...}). */
(function () {
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';   // ⛔ trùng SP_SDK dashboard.html
  var MAU = ['#DC2626', '#16A34A', '#2F6FED'];
  var S = null, _duyet = null;
  function $(s, g) { return (g || document).querySelector(s); }
  function chu(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(t) { var n = $('#csToast'); if (!n) return; n.textContent = t; n.classList.add('hien'); clearTimeout(n._h); n._h = setTimeout(function () { n.classList.remove('hien'); }, 2400); }
  function hamDuyet() {
    if (!_duyet) {
      _duyet = window.AWChat.kho().then(function () {
        return Promise.all([import(SDK + '/firebase-app.js'), import(SDK + '/firebase-functions.js')]).then(function (m) {
          return m[1].httpsCallable(m[1].getFunctions(m[0].getApp(), 'asia-southeast1'), 'duyetSach', { timeout: 30000 });
        });
      });
      _duyet['catch'](function () { _duyet = null; });
    }
    return _duyet;
  }
  function docDapAn(sach, trangs) {
    var db = (window.AWC && window.AWC.CFG && window.AWC.CFG.AWORD_DB) || {};
    return Promise.all(trangs.map(function (p) {
      var u = 'https://firestore.googleapis.com/v1/projects/' + db.projectId + '/databases/(default)/documents/sachGoc/' + sach + '_p' + String(p).padStart(3, '0') + '?key=' + encodeURIComponent(db.apiKey || '');
      return fetch(u, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        var m = (j && j.fields && j.fields.dapAn && j.fields.dapAn.mapValue && j.fields.dapAn.mapValue.fields) || {}, o = {};
        Object.keys(m).forEach(function (k) { o[k] = m[k].stringValue; });
        return o;
      })['catch'](function () { return {}; });
    })).then(function (ds) { var o = {}; trangs.forEach(function (p, i) { o[p] = ds[i]; }); return o; });
  }
  // trạng thái một em: chua | cho | xong | tra | chan (có ảnh máy chặn đang là bản hiện)
  function ttEm(e) {
    var d = e.doc || {}, tr = d.trang || {}, ks = Object.keys(tr);
    if (!ks.length) return { lop: 'chua', chu: 'CHƯA NỘP' };
    var sai = 0, chan = 0, tra = 0, choDuyet = 0;
    ks.forEach(function (p) {
      var t = tr[p], da = (S.dapAn[p] || {});
      if (t.duyet && t.duyet.tt === 'tra') tra++;
      else if (!t.duyet) choDuyet++;
      if (!t.dat) chan++;
      ((t.may && t.may.cau) || []).forEach(function (c) { var dung = da[String(c.so)]; if (dung && c.chon && c.chon !== '?' && c.chon !== dung) sai++; });
    });
    if (tra) return { lop: 'tra', chu: 'ĐÃ TRẢ LẠI' };
    if (!choDuyet && d.xong) return { lop: 'xong', chu: 'ĐÃ CHẤM' };
    return { lop: 'cho', chu: 'CHỜ CHẤM' + (chan ? ' · ⚠ ' + chan + ' chưa đạt' : (sai ? ' · AI: sai ' + sai : ' · AI: đúng hết')) };
  }
  var CSS =
    '#csNen{position:fixed;inset:0;z-index:9000;background:rgba(14,24,28,.62);display:grid;place-items:center;padding:14px;font-family:Montserrat,"Segoe UI",system-ui,sans-serif;color:#16232A}' +
    '#csNen[hidden]{display:none}html.cs-mo{overflow:hidden}' +
    '#csNen button{font-family:inherit;cursor:pointer}' +
    '.cs-hop{width:min(1500px,100%);height:min(920px,100%);background:#EEF3F2;border-radius:20px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45)}' +
    '.cs-dau{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#0E7C6E;color:#fff}.cs-dau b{font-size:14px;font-weight:900;letter-spacing:.04em}' +
    '.cs-dau span{font-size:11.5px;font-weight:700;opacity:.85}.cs-dong{margin-left:auto;border:0;background:rgba(255,255,255,.18);color:#fff;width:34px;height:34px;border-radius:10px;font-size:15px;font-weight:900}' +
    '.cs-khung{flex:1;min-height:0;display:grid;grid-template-columns:260px minmax(0,1fr) 350px;gap:12px;padding:12px}' +
    '.cs-cot{background:#fff;border:1px solid #E0EAE7;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;min-height:0}' +
    '.cs-cot h3{margin:0;padding:13px 15px 9px;font-size:12px;font-weight:900;letter-spacing:.06em}.cs-cot h3 small{display:block;font-size:10.5px;font-weight:600;color:#5F7370;letter-spacing:0;margin-top:3px}' +
    '.cs-ds{overflow:auto;padding-bottom:10px}.cs-em{display:flex;align-items:center;gap:9px;margin:0 8px;padding:8px 9px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer}' +
    '.cs-em:hover{background:#F4F8F7}.cs-em.chon{background:#E3F1EE;outline:1.5px solid #0E7C6E}' +
    '.cs-av{width:30px;height:30px;border-radius:50%;background:#94A3B8;display:grid;place-items:center;font-size:10.5px;font-weight:900;color:#fff;flex:none}' +
    '.cs-tt{margin-left:auto;font-size:9px;font-weight:800;padding:3px 7px;border-radius:999px;white-space:nowrap}' +
    '.cs-tt.cho{background:#FEF3C7;color:#B45309}.cs-tt.xong{background:#DCFCE7;color:#15803D}.cs-tt.chua{background:#F1F5F9;color:#94A3B8}.cs-tt.tra{background:#FEE2E2;color:#B91C1C}' +
    '.cs-giua{background:#1E2B30;border-color:#1E2B30}.cs-thanh{display:flex;align-items:center;gap:6px;padding:9px 11px;background:#26363C;flex-wrap:wrap}' +
    '.cs-tab{display:flex;gap:4px;margin-right:auto}.cs-tab button{border:0;border-radius:9px;padding:7px 11px;font-size:11px;font-weight:800;background:#34474D;color:#CFE3DF}' +
    '.cs-tab button.on{background:#fff;color:#16232A}.cs-tab i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-left:6px;vertical-align:middle}' +
    '.cs-cc{border:0;width:34px;height:32px;border-radius:9px;background:#34474D;color:#fff;font-size:14px;font-weight:900}.cs-cc.on{background:#fff;color:#DC2626}' +
    '.cs-mau{width:21px;height:21px;border-radius:50%;border:2px solid #fff;cursor:pointer}.cs-mau.on{outline:3px solid #9FE3D6}' +
    '.cs-vung{flex:1;min-height:0;display:grid;place-items:center;padding:10px;overflow:auto;position:relative}' +
    '.cs-vung canvas{max-width:100%;max-height:100%;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.4);cursor:crosshair;background:#fff;touch-action:none}' +
    '.cs-canh{position:absolute;left:16px;top:16px;background:#DC2626;color:#fff;border-radius:999px;padding:6px 12px;font-size:11px;font-weight:900;max-width:80%}' +
    '.cs-trong{color:#A9BDB9;font-weight:800;font-size:14px}' +
    '.cs-cu{display:flex;gap:6px;align-items:center;padding:0 11px;background:#26363C;flex-wrap:wrap}.cs-cu:not(:empty){padding:7px 11px}.cs-cu span{color:#A9BDB9;font-size:10px;font-weight:800}' +
    '.cs-cu button{position:relative;border:2px solid transparent;border-radius:7px;padding:0;background:#34474D;height:44px;overflow:hidden}.cs-cu button.on{border-color:#fff}' +
    '.cs-cu img{height:40px;display:block}.cs-cu b{position:absolute;right:2px;top:1px;color:#FCA5A5;font-size:12px}.cs-cu .ve{color:#fff;font-size:10px;font-weight:800;padding:0 9px}' +
    '.cs-day{display:flex;gap:8px;padding:9px 11px;background:#26363C;align-items:center;flex-wrap:wrap}.cs-lich{color:#A9BDB9;font-size:10.5px;font-weight:600;margin-right:auto}' +
    '.cs-nut{border:0;border-radius:11px;padding:10px 14px;font-size:11.5px;font-weight:900;letter-spacing:.04em}.cs-nut:disabled{opacity:.4;cursor:default}' +
    '.cs-nut.dat{background:#16A34A;color:#fff}.cs-nut.tra{background:#fff;color:#DC2626}.cs-nut.chup{background:#F2A93B;color:#3B2A07}.cs-nut.on{outline:3px solid #9FE3D6}' +
    '.cs-ai-dau{display:flex;align-items:center;gap:8px;padding:0 15px 9px;font-size:11px;color:#5F7370;font-weight:700}.cs-ai-dau b{margin-left:auto;font-size:20px;font-weight:900;color:#16232A}' +
    '.cs-bang{overflow:auto;padding:0 10px 10px;flex:1;min-height:0}.cs-rong{padding:20px;text-align:center;color:#94A3B8;font-weight:700;font-size:12px}' +
    '.cs-cau{display:grid;grid-template-columns:34px 1fr 1fr 28px;gap:6px;align-items:center;padding:6px 8px;border-radius:10px;font-size:11.5px;font-weight:700}' +
    '.cs-cau:nth-child(odd){background:#F7FAF9}.cs-cau .so{font-weight:900;color:#5F7370}' +
    '.cs-cau .em-k,.cs-cau .dung-k{text-align:center;font-weight:900;border-radius:7px;padding:3px 0}.cs-cau .em-k{background:#EAF1FF;color:#2F6FED}.cs-cau .dung-k{background:#F1F5F4}' +
    '.cs-cau.sai{outline:1.5px solid #FCA5A5}.cs-cau.sai .em-k{background:#FEE2E2;color:#DC2626}.cs-cau.dung .kq{color:#16A34A}.cs-cau.sai .kq{color:#DC2626}.cs-cau .kq{text-align:center;font-weight:900}' +
    '.cs-cau.hoi .em-k{background:#FEF3C7;color:#B45309}.cs-cau .hoi-chu{font-size:9px;color:#B45309;grid-column:2/-1;font-weight:700}' +
    '.cs-chu-thich{font-size:9.5px;color:#94A3B8;font-weight:600;padding:6px 8px}' +
    '.cs-nhan{padding:11px 13px;border-top:1px solid #E0EAE7}.cs-nhan label{font-size:10.5px;font-weight:900;letter-spacing:.06em;color:#5F7370}' +
    '.cs-nhan textarea{width:100%;box-sizing:border-box;margin-top:6px;border:1.5px solid #E0EAE7;border-radius:10px;padding:9px 10px;font:600 12px/1.5 Montserrat,sans-serif;resize:vertical;min-height:74px}' +
    '.cs-hang{display:flex;gap:8px;margin-top:8px}.cs-hang button{flex:1;border:1.5px solid #E0EAE7;background:#fff;border-radius:10px;padding:9px;font-size:11px;font-weight:900}' +
    '.cs-hang .chinh{background:#0E7C6E;color:#fff;border-color:#0E7C6E}' +
    '#csToast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#16232A;color:#fff;padding:12px 18px;border-radius:12px;font-size:12.5px;font-weight:800;opacity:0;transition:.25s;pointer-events:none;z-index:9100}' +
    '#csToast.hien{opacity:1}' +
    '@media (max-width:1000px){.cs-khung{grid-template-columns:1fr;overflow:auto}.cs-cot{min-height:420px}.cs-ds{max-height:240px;min-height:0}}';
  function dungKhung() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var n = document.createElement('div');
    n.id = 'csNen';
    n.innerHTML =
      '<div class="cs-hop"><div class="cs-dau"><b id="csTieu"></b><span id="csPhu"></span><button type="button" class="cs-dong" title="Đóng">✕</button></div>' +
      '<div class="cs-khung"><div class="cs-cot cs-ds" id="csDs"></div>' +
      '<div class="cs-cot cs-giua"><div class="cs-thanh"><div class="cs-tab" id="csTab"></div>' +
        '<button class="cs-cc on" data-cu="but" title="Bút">✎</button><button class="cs-cc" data-cu="tron" title="Khoanh tròn">◯</button>' +
        '<button class="cs-cc" data-cu="ten" title="Mũi tên">↗</button><button class="cs-cc" data-cu="dung" title="Dấu đúng">✓</button>' +
        '<button class="cs-cc" data-cu="sai" title="Dấu sai">✕</button><button class="cs-cc" data-cu="chu" title="Gõ chữ">T</button>' +
        MAU.map(function (m, i) { return '<span class="cs-mau' + (i ? '' : ' on') + '" data-mau="' + m + '" style="background:' + m + '"></span>'; }).join('') +
        '<button class="cs-cc" id="csDauLai" title="Hiện lại dấu ✓/✕ của máy (bấm vào một dấu trên ảnh để đổi ✓↔✕ hoặc ẩn)">↺✓</button>' +
        '<button class="cs-cc" id="csLui" title="Hoàn tác (Ctrl+Z)">↶</button><button class="cs-cc" id="csXoa" title="Xoá hết nét vẽ">🗑</button></div>' +
        '<div class="cs-vung"><canvas id="csCv"></canvas><span class="cs-canh" id="csCanh" hidden></span><div class="cs-trong" id="csTrong" hidden>Em chưa nộp trang này.</div></div>' +
        '<div class="cs-cu" id="csCu"></div>' +
        '<div class="cs-day"><span class="cs-lich" id="csLich"></span><button class="cs-nut chup" id="csChup">📋 CHỤP GỬI ZALO</button>' +
        '<button class="cs-nut tra" id="csTra">↺ TRẢ LẠI</button><button class="cs-nut dat" id="csDat">✓ ĐẠT</button></div></div>' +
      '<div class="cs-cot cs-ai"><h3>CHẤM THAM KHẢO (AI)<small>Chỉ thầy thấy — không gửi cho em. Thầy chấm lại rồi tự báo qua Zalo.</small></h3>' +
        '<div class="cs-ai-dau"><span id="csAiTrang"></span><b id="csTong"></b></div><div class="cs-bang" id="csBang"></div>' +
        '<div class="cs-nhan"><label>LỜI NHẮN GỬI EM (SOẠN SẴN — SỬA ĐƯỢC)</label><textarea id="csNhan"></textarea>' +
        '<div class="cs-hang"><button id="csChepNhan">📋 Chép lời nhắn</button><button class="chinh" id="csChepCa">📋 Chép ảnh + lời nhắn</button></div></div></div>' +
      '</div></div><div id="csToast"></div>';
    document.body.appendChild(n);
    n.addEventListener('click', function (e) { if (e.target === n || e.target.closest('.cs-dong')) dong(); });
    document.addEventListener('keydown', function (e) {
      if (!S || !$('#csNen') || $('#csNen').hidden) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/TEXTAREA|INPUT/.test(document.activeElement && document.activeElement.tagName)) { e.preventDefault(); S.net.pop(); veCv(); }
      if (e.key === 'Escape') dong();
    });
    n.querySelectorAll('[data-cu]').forEach(function (b) { b.onclick = function () { S.cu = b.dataset.cu; n.querySelectorAll('[data-cu]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    n.querySelectorAll('[data-mau]').forEach(function (b) { b.onclick = function () { S.mau = b.dataset.mau; n.querySelectorAll('[data-mau]').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    $('#csLui').onclick = function () { S.net.pop(); veCv(); };
    $('#csXoa').onclick = function () { S.net = []; veCv(); };
    $('#csDauLai').onclick = function () { delete S.dauSua[khoaDau()]; veCv(); };
    $('#csChup').onclick = function () { chep(true, false); };
    $('#csChepNhan').onclick = function () { chep(false, true); };
    $('#csChepCa').onclick = function () { chep(true, true); };
    $('#csDat').onclick = function () { duyet('dat'); };
    $('#csTra').onclick = function () { duyet('tra'); };
    ganVe($('#csCv'));
  }
  function dong() { var n = $('#csNen'); if (n) n.hidden = true; document.documentElement.classList.remove('cs-mo'); if (S && S.onDong) S.onDong(); }
  // ───────── vẽ ─────────
  function toaDo(cv, e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
  function ganVe(cv) {
    var tam = null;
    cv.onpointerdown = function (e) {
      if (!S || !S.anh) return;
      var p = toaDo(cv, e), co = Math.max(cv.width, cv.height) / 1000;
      if (bamDau(p)) return;   // bấm trúng dấu ✓/✕ của máy ⇒ ✓ → ✕ → ẩn
      if (S.cu === 'dung' || S.cu === 'sai') { S.net.push({ cu: S.cu, mau: S.mau, d: [p], co: co }); veCv(); return; }
      if (S.cu === 'chu') { var t = prompt('Gõ chữ ghi lên ảnh:', 'Sửa lại câu này'); if (t) { S.net.push({ cu: 'chu', mau: S.mau, d: [p], chu: t, co: co }); veCv(); } return; }
      tam = { cu: S.cu, mau: S.mau, d: [p, p], co: co }; S.tam = tam; cv.setPointerCapture(e.pointerId);
    };
    cv.onpointermove = function (e) { if (!tam) return; var p = toaDo(cv, e); if (tam.cu === 'but') tam.d.push(p); else tam.d[1] = p; veCv(); };
    cv.onpointerup = function () { if (tam) { S.net.push(tam); tam = null; S.tam = null; veCv(); } };
  }
  function veNet(g, n) {
    var co = n.co || 1;
    g.strokeStyle = g.fillStyle = n.mau; g.lineWidth = 4 * co; g.lineCap = g.lineJoin = 'round';
    var a = n.d[0], b = n.d[1];
    if (n.cu === 'but') { g.beginPath(); n.d.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke(); }
    if (n.cu === 'tron') { g.beginPath(); g.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2 + 1, Math.abs(b[1] - a[1]) / 2 + 1, 0, 0, Math.PI * 2); g.stroke(); }
    if (n.cu === 'ten') { var t = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 18 * co; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(b[0] - L * Math.cos(t - 0.45), b[1] - L * Math.sin(t - 0.45)); g.moveTo(b[0], b[1]); g.lineTo(b[0] - L * Math.cos(t + 0.45), b[1] - L * Math.sin(t + 0.45)); g.stroke(); }
    if (n.cu === 'dung' || n.cu === 'sai' || n.cu === 'chu') { g.font = '900 ' + Math.round((n.cu === 'chu' ? 26 : 40) * co) + 'px Montserrat, sans-serif'; g.fillText(n.cu === 'dung' ? '✓' : n.cu === 'sai' ? '✕' : n.chu, a[0] - (n.cu === 'chu' ? 0 : 14 * co), a[1] + (n.cu === 'chu' ? 0 : 14 * co)); }
  }
  function veCv() {
    var cv = $('#csCv'), g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    if (!S.anh) return;
    var xoay = S.xoay || 0, w = S.anh.naturalWidth, h = S.anh.naturalHeight;
    g.save(); g.translate(cv.width / 2, cv.height / 2); g.rotate(xoay * Math.PI / 180); g.drawImage(S.anh, -w / 2, -h / 2); g.restore();
    veDauMay(g);
    S.net.concat(S.tam ? [S.tam] : []).forEach(function (n) { veNet(g, n); });
  }
  /* ⭐ 21/10/2026 (thầy "ok build") — DẤU ✓/✕ CỦA MÁY: Claude đọc em khoanh gì, Google Vision định vị chữ (máy chủ dau-sach.js ⇒
     `may.cau[i].dau` = {x,y,ux,uy,h} tỉ lệ theo ảnh GỐC chưa xoay). Dấu nhỏ ngay bên trái chữ cái em khoanh: ✓ xanh đúng đáp án, ✕ đỏ sai.
     Thầy bấm vào dấu ⇒ đổi ✓ → ✕ → ẩn (nút ↺✓ hiện lại). Sửa chỉ giữ khi pop-up đang mở (đủ để CHỤP GỬI ZALO). */
  function khoaDau() { return S.i + '|' + S.p + '|' + S.cuChon; }
  function dsDau() {
    var h = S.hien, da = S.dapAn[S.p] || {}, sua = S.dauSua[khoaDau()] || {};
    if (!h || !S.anh || !h.may || !h.may.cau) return [];
    var w = S.anh.naturalWidth, hh = S.anh.naturalHeight;
    return h.may.cau.filter(function (c) { return c.dau && /^[ABCD]$/.test(c.chon || ''); }).map(function (c) {
      var d = c.dau, dung = da[String(c.so)], loai = sua[c.so] || (dung ? (c.chon === dung ? 'dung' : 'sai') : '');
      var hp = Math.max(8, d.h * hh), s = hp * 0.55, ux = d.ux == null ? 1 : d.ux, uy = d.uy == null ? 0 : d.uy;
      var mx = d.x * w - ux * hp * 1.9, my = d.y * hh - uy * hp * 1.9;
      mx = Math.min(w - s * 1.3, Math.max(s * 1.3, mx)); my = Math.min(hh - s * 1.3, Math.max(s * 1.3, my));   // sát mép ảnh ⇒ kéo vào trong
      return { so: c.so, loai: loai, x: mx, y: my, s: s, ux: ux, uy: uy, w: Math.max(3, w / 300) };
    }).filter(function (m) { return m.loai && m.loai !== 'an'; });
  }
  function veDauMay(g) {
    var ds = dsDau(); if (!ds.length) return;
    var cv = $('#csCv'), w = S.anh.naturalWidth, h = S.anh.naturalHeight;
    g.save(); g.translate(cv.width / 2, cv.height / 2); g.rotate((S.xoay || 0) * Math.PI / 180); g.translate(-w / 2, -h / 2);
    g.lineCap = g.lineJoin = 'round';
    ds.forEach(function (m) {
      var nx = -m.uy, ny = m.ux, P = function (a, b) { return [m.x + m.ux * a * m.s + nx * b * m.s, m.y + m.uy * a * m.s + ny * b * m.s]; };
      g.lineWidth = m.w; g.beginPath();
      if (m.loai === 'sai') { g.strokeStyle = '#DC2626'; var a = P(-1, -1), b = P(1, 1), c = P(-1, 1), d = P(1, -1); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.moveTo(c[0], c[1]); g.lineTo(d[0], d[1]); }
      else { g.strokeStyle = '#16A34A'; var e = P(-1, 0), f = P(-0.3, 0.8), k = P(1.1, -1); g.moveTo(e[0], e[1]); g.lineTo(f[0], f[1]); g.lineTo(k[0], k[1]); }
      g.stroke();
    });
    g.restore();
  }
  function bamDau(p) {
    var ds = dsDau(); if (!ds.length) return false;
    var cv = $('#csCv'), w = S.anh.naturalWidth, h = S.anh.naturalHeight, r = -(S.xoay || 0) * Math.PI / 180;
    var dx = p[0] - cv.width / 2, dy = p[1] - cv.height / 2;
    var ix = dx * Math.cos(r) - dy * Math.sin(r) + w / 2, iy = dx * Math.sin(r) + dy * Math.cos(r) + h / 2;   // điểm bấm ⇒ toạ độ ảnh gốc
    var m = ds.filter(function (q) { return Math.hypot(q.x - ix, q.y - iy) < q.s * 1.8; })
      .sort(function (a, b) { return Math.hypot(a.x - ix, a.y - iy) - Math.hypot(b.x - ix, b.y - iy); })[0];
    if (!m) return false;
    var k = khoaDau(); S.dauSua[k] = S.dauSua[k] || {};
    S.dauSua[k][m.so] = m.loai === 'dung' ? 'sai' : (m.loai === 'sai' ? 'an' : 'dung');
    veCv(); return true;
  }
  function napAnh(url, xoay) {
    S.anh = null; S.net = []; S.xoay = xoay || 0; S.ban = false;
    var cv = $('#csCv');
    if (!url) { cv.hidden = true; $('#csTrong').hidden = false; return; }
    cv.hidden = false; $('#csTrong').hidden = true;
    var thu = function (cors) {
      var im = new Image(); if (cors) im.crossOrigin = 'anonymous';
      im.onload = function () {
        if (!S) return;
        S.anh = im; S.ban = !cors;
        var w = im.naturalWidth, h = im.naturalHeight, ngang = S.xoay === 90 || S.xoay === 270;
        cv.width = ngang ? h : w; cv.height = ngang ? w : h; veCv();
      };
      im.onerror = function () { if (cors) thu(false); };
      im.src = url;
    };
    thu(true);
  }
  // ───────── vẽ khung ─────────
  function veDs() {
    $('#csDs').innerHTML = '<h3>' + chu(S.tieuDe) + '<small>' + S.em.length + ' em · ' + S.em.filter(function (e) { return Object.keys((e.doc || {}).trang || {}).length; }).length + ' đã nộp</small></h3>' +
      S.em.map(function (e, i) { var t = ttEm(e); return '<div class="cs-em' + (i === S.i ? ' chon' : '') + '" data-i="' + i + '"><span class="cs-av">' + chu(String(e.ten).trim().slice(0, 2).toUpperCase()) + '</span>' + chu(e.ten) + '<span class="cs-tt ' + t.lop + '">' + chu(t.chu) + '</span></div>'; }).join('');
    $('#csDs').querySelectorAll('.cs-em').forEach(function (r) { r.onclick = function () { S.i = +r.dataset.i; S.p = S.trangs[0]; S.cuChon = -1; veTat(); }; });
  }
  function trangHien() { var e = S.em[S.i]; return (((e && e.doc) || {}).trang || {})[String(S.p)] || null; }
  function veGiua() {
    var e = S.em[S.i], tr = ((e && e.doc) || {}).trang || {};
    $('#csTab').innerHTML = S.trangs.map(function (p) {
      var t = tr[String(p)], dot = !t ? '' : (t.duyet && t.duyet.tt === 'tra') || !t.dat ? '#DC2626' : (t.duyet ? '#16A34A' : '#F2A93B');
      return '<button class="' + (p === S.p ? 'on' : '') + '" data-p="' + p + '">TRANG ' + p + (dot ? '<i style="background:' + dot + '"></i>' : '') + '</button>';
    }).join('');
    $('#csTab').querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { S.p = +b.dataset.p; S.cuChon = -1; veGiua(); veAi(); }; });
    var t = trangHien(), hien = t, laCu = false;
    if (t && S.cuChon >= 0 && t.cu && t.cu[S.cuChon]) { hien = t.cu[S.cuChon]; laCu = true; }
    S.hien = hien;
    napAnh(hien && hien.url, hien && hien.may && hien.may.xoay);
    var canh = $('#csCanh');
    canh.hidden = !(hien && !hien.dat);
    canh.textContent = laCu ? '⚠ ẢNH CŨ' + (hien && !hien.dat ? ' — MÁY CHẶN: ' + ((hien.may && hien.may.lyDo) || '') : '') : '⚠ MÁY CHẶN — ' + ((hien && (hien.lyDo || (hien.may && hien.may.lyDo))) || '');
    var cu = (t && t.cu) || [];
    $('#csCu').innerHTML = cu.length ? '<span>LẦN NỘP TRƯỚC:</span>' + cu.map(function (c, i) {
      return '<button class="' + (i === S.cuChon ? 'on' : '') + (c.dat ? '' : ' chan') + '" data-c="' + i + '"><img alt="" src="' + chu(c.nho || c.url) + '">' + (c.dat ? '' : '<b>⚠</b>') + '</button>';
    }).join('') + (S.cuChon >= 0 ? '<button class="ve" data-c="-1">↩ ẢNH ĐANG DÙNG</button>' : '') : '';
    $('#csCu').querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { S.cuChon = +b.dataset.c; veGiua(); }; });
    var lich = '';
    if (t) {
      var d = new Date(t.luc || 0), gio = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
      lich = 'Nộp ' + gio + ' · ' + (t.quaLuot ? 'quá lượt máy kiểm — thầy xem tay' : t.dat ? 'máy kiểm ✓ đúng trang ' + S.p + ' · đọc rõ · đủ nội dung' : 'máy CHẶN') +
        (t.duyet ? ' · thầy ' + (t.duyet.tt === 'dat' ? 'ĐẠT' : 'TRẢ LẠI') : '');
    }
    $('#csLich').textContent = lich || 'Em chưa nộp trang ' + S.p + '.';
    $('#csDat').disabled = $('#csTra').disabled = !t || laCu;
    $('#csDat').classList.toggle('on', !!(t && t.duyet && t.duyet.tt === 'dat'));
    $('#csTra').classList.toggle('on', !!(t && t.duyet && t.duyet.tt === 'tra'));
  }
  function veAi() {
    var t = trangHien(), da = S.dapAn[S.p] || {}, cau = (t && t.may && t.may.cau) || [];
    var so = Object.keys(da).map(Number).sort(function (a, b) { return a - b; });
    if (!so.length) so = cau.map(function (c) { return c.so; });
    var emChon = {}; cau.forEach(function (c) { emChon[c.so] = c; });
    var dung = 0;
    $('#csAiTrang').textContent = 'TRANG ' + S.p + (so.length ? ' · CÂU ' + so[0] + '–' + so[so.length - 1] : '');
    $('#csBang').innerHTML = !t ? '<div class="cs-rong">Em chưa nộp trang này.</div>' : so.map(function (n) {
      var c = emChon[n] || { chon: '' }, dd = da[String(n)] || '', khongChac = c.chac === false || c.chon === '?';
      var kq = !dd ? '' : (c.chon === dd ? 'dung' : (c.chon && c.chon !== '?' ? 'sai' : 'trong'));
      if (kq === 'dung') dung++;
      return '<div class="cs-cau ' + kq + (khongChac ? ' hoi' : '') + '"><span class="so">' + n + '</span><span class="em-k">' + chu(c.chon || '—') + '</span>' +
        '<span class="dung-k">' + chu(dd || '?') + '</span><span class="kq">' + (khongChac ? '?' : kq === 'dung' ? '✓' : kq === 'sai' ? '✕' : kq === 'trong' ? '–' : '') + '</span>' +
        (khongChac ? '<span class="hoi-chu">AI không chắc em khoanh gì — thầy xem tay</span>' :
          (/^[ABCD]$/.test(c.chon || '') && emChon[n] && !c.dau ? '<span class="hoi-chu">máy chưa đặt được dấu trên ảnh — thầy đánh tay</span>' : '')) + '</div>';
    }).join('') + '<div class="cs-chu-thich">Cột 2 = em khoanh · cột 3 = đáp án đúng.</div>';
    $('#csTong').textContent = t && so.length ? dung + '/' + so.length : '';
    $('#csNhan').value = loiNhan();
  }
  function loiNhan() {
    var e = S.em[S.i], tr = ((e && e.doc) || {}).trang || {}, sai = [];
    S.trangs.forEach(function (p) {
      var t = tr[String(p)], da = S.dapAn[p] || {};
      ((t && t.may && t.may.cau) || []).forEach(function (c) { var d = da[String(c.so)]; if (d && c.chon && c.chon !== '?' && c.chon !== d) sai.push(c.so); });
    });
    var ten = String((e && e.ten) || '').trim();
    var thieu = S.trangs.filter(function (p) { var t = tr[String(p)]; return !t || !t.dat || (t.duyet && t.duyet.tt === 'tra'); });
    if (thieu.length) return 'Chào ' + ten + ', thầy chưa nhận đủ bài sách ' + S.tieuDe + ': trang ' + thieu.join(', ') + ' con chụp lại rõ, đủ cả trang rồi nộp trên web giúp thầy nhé.' +
      (sai.length ? ' Con xem lại luôn câu ' + sai.join(', ') + ' (thầy đã đánh dấu trong ảnh).' : '');
    return sai.length
      ? 'Chào ' + ten + ', bài sách ' + S.tieuDe + ' con làm tốt! Con xem lại câu ' + sai.join(', ') + ' (thầy đã đánh dấu trong ảnh), sửa lại rồi chụp gửi thầy nhé.'
      : 'Chào ' + ten + ', bài sách ' + S.tieuDe + ' con làm đúng hết, giỏi lắm! Thầy khen con nhé.';
  }
  function veTat() { veDs(); veGiua(); veAi(); }
  // ───────── clipboard ─────────
  function anhChup() {
    var cv = $('#csCv'), dai = Math.round(cv.width * 0.06) + 16, c = document.createElement('canvas');
    c.width = cv.width; c.height = cv.height + dai;
    var g = c.getContext('2d'); g.fillStyle = '#0E7C6E'; g.fillRect(0, 0, c.width, dai);
    g.fillStyle = '#fff'; g.font = '900 ' + Math.round(dai * 0.42) + 'px Montserrat, sans-serif'; g.textBaseline = 'middle';
    g.fillText((String(S.em[S.i].ten).toUpperCase() + ' · ' + S.tieuDe + ' · TRANG ' + S.p).slice(0, 90), Math.round(dai * 0.35), dai / 2);
    g.drawImage(cv, 0, dai);
    return new Promise(function (ok, no) { try { c.toBlob(function (b) { if (b) ok(b); else no(new Error('rỗng')); }, 'image/png'); } catch (e) { no(e); } });
  }
  function chep(anhCo, chuCo) {
    if (anhCo && (!S.anh || S.ban)) { toast(S.ban ? 'Ảnh này chưa chép được (kho ảnh chưa mở CORS cho trang này) — thầy chụp màn hình tạm nhé.' : 'Chưa có ảnh để chụp.'); return; }
    var muc = {};
    var lam = anhCo ? anhChup().then(function (b) { muc['image/png'] = b; }) : Promise.resolve();
    lam.then(function () {
      if (chuCo) muc['text/plain'] = new Blob([$('#csNhan').value], { type: 'text/plain' });
      return navigator.clipboard.write([new ClipboardItem(muc)]);
    }).then(function () { toast(anhCo ? '✓ Đã chụp vào clipboard — mở Zalo, bấm Ctrl+V để dán' : '✓ Đã chép lời nhắn'); },
      function (e) { toast('Trình duyệt chặn clipboard: ' + ((e && e.message) || e)); });
  }
  // ───────── duyệt ─────────
  function duyet(tt) {
    var e = S.em[S.i], t = trangHien();
    if (!t) return;
    var nhan = '';
    if (tt === 'tra') {
      nhan = prompt('Nhắn em biết vì sao chụp lại (em thấy câu này trên ô trang ' + S.p + '):', 'Ảnh chưa rõ, con chụp lại giúp thầy nhé.');
      if (nhan === null) return;
    }
    var nut = tt === 'dat' ? $('#csDat') : $('#csTra');
    nut.disabled = true;
    hamDuyet().then(function (f) { return f({ id: [S.lop, S.bai, S.bt, e.ma].join('__'), trang: S.p, tt: tt, nhan: nhan }); })
      .then(function () { return S.docLai(e); })
      .then(function (d) { if (d) e.doc = d; toast(tt === 'dat' ? '✓ Đã ĐẠT trang ' + S.p : '↺ Đã TRẢ LẠI trang ' + S.p); veTat(); if (S.onDoi) S.onDoi(); })
      ['catch'](function (er) { nut.disabled = false; toast('Chưa duyệt được: ' + ((er && er.message) || er)); });
  }
  /* cfg = { tieuDe, lop, bai, bt, trangs:[32,33,34], sach:'NTTA', em:[{ten, ma, doc}], docLai(em) ⇒ Promise<doc>, onDoi(), onDong() } */
  function mo(cfg) {
    if (!$('#csNen')) dungKhung();
    S = Object.assign({ i: 0, p: cfg.trangs[0], cu: 'but', mau: MAU[0], net: [], dapAn: {}, cuChon: -1, dauSua: {}, hien: null }, cfg);
    var dau = S.em.findIndex(function (e) { var t = ttEm(e); return t.lop === 'cho'; });
    S.i = dau >= 0 ? dau : 0;
    $('#csTieu').textContent = 'CHẤM BÀI SÁCH · ' + S.tieuDe;
    $('#csPhu').textContent = 'Trang ' + S.trangs.join(', ');
    $('#csNen').hidden = false;
    document.documentElement.classList.add('cs-mo');
    veTat();
    docDapAn(S.sach || 'NTTA', S.trangs).then(function (d) { if (!S) return; S.dapAn = d; veDs(); veAi(); if (S.anh) veCv(); });
  }
  window.ChamSach = { mo: mo, dong: dong };
})();
