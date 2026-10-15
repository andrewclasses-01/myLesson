/* ============================================================
   js/the-td.js — THẺ THÁCH ĐẤU TRONG CHAT NHÓM LỚP (đấu game online Đợt 3 · web v1.348.0, 15/10/2026)
   Mẫu thầy duyệt: D:\OTHERS\CLAUDE\DAU GAME ONLINE - thiet ke\mau-v2 (chat nhóm lớp: nút ⚔ cạnh ô gõ + thẻ trong nhóm).

   Dùng ở MỌI chỗ có chat lớp (js/chat-ui.js gọi): trang Tin nhắn (nw/), lop.html, khoa.html, dashboard (thầy chỉ xem).
     TheTD.html(id)            — chỗ trống của thẻ trong danh sách tin (chat-ui veTin, tin he.loai 'td')
     TheTD.lap(khung)          — sau mỗi lần vẽ: nghe trận tranDau/{id} của từng thẻ (một lần mỗi id), vẽ thẻ theo trạng thái
     TheTD.moChon(nut, lop, gui, loi) — nút ⚔: hộp chọn BẠN ĐANG ONLINE cùng lớp ⇒ tạo trận (luật như trang Giải đấu)
                                 ⇒ gửi tin thẻ {he:{loai:'td', id}} bằng gui(he, chu) của trang ⇒ bạn nhận ⇒ cả hai vào tran.html
   Lớp có giải ĐANG MỞ ⇒ trận tính điểm giải (phút/độ khó của giải); không có ⇒ GIAO HỮU 2 phút Easy (thầy chốt).
   Bạn cùng lớp xem thẻ được nhờ luật tranDau cho em ĐÚNG LỚP đọc (tools/dang-luat-the-td.js).

   ⭐ v1.351.0 (15/10/2026 tối, thầy) — ba việc:
     · nút THEO DÕI trên thẻ trận đang đấu (người KHÔNG ở trong trận: bạn cùng lớp, thầy) ⇒ tran.html?id=…&xem=1 xem trực tiếp
     · thẻ GIẢI ĐẤU to rõ (đầu thẻ vàng + tên giải); thẻ GIAO HỮU thu gọn MỘT DÒNG nhỏ (vẫn đủ nút Nhận / Vào trận / Theo dõi)
     · TheTD.ghim(khung, lop) — DẢI GHIM giải đấu đầu khung chat lớp (dính trên cùng khi cuộn): giải đang mở · còn bao lâu ·
       hạng em · số trận đang đấu; bấm mở ra: top 5, các trận đang đấu (nút Theo dõi), luật trận, link bảng đầy đủ.
       Không có giải mở ⇒ giải SẮP mở trong 7 ngày hiện một dòng nhỏ; không có gì ⇒ ẩn. chat-ui gọi khi trang khai o.lopGiai.
   ============================================================ */
(function () {
  'use strict';
  if (window.TheTD) return;
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var ONLINE_MS = 150 * 1000;
  var IC = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/></svg>';
  var IC_CUP = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/></svg>';
  var IC_MAT = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var CHE_TEN = { one: 'One word', list: 'Word list', free: 'Free words' };
  var an = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var tat = function (ten) { return String(ten || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).join('').toUpperCase().slice(-2); };
  var MAU = ['#0E7C6E', '#E0575B', '#3E7BFA', '#F0821E', '#8B5CF6', '#18A957', '#D9468F', '#2B9BB5'];
  var mau = function (ten) { var s = 0; ten = String(ten || ''); for (var i = 0; i < ten.length; i++) s += ten.charCodeAt(i); return MAU[s % MAU.length]; };
  var laNw = /\/nw\//.test(location.pathname);
  var banThu = function () { return !!(window.NW && NW.laBanThu && NW.laBanThu()); };
  var hai = function (n) { return (n < 10 ? '0' : '') + n; };

  // ---------- kho + danh tính (dùng chung app Firebase của trang) ----------
  function kho() { return (window.NW && NW.fb) ? NW.fb() : window.AWChat ? window.AWChat.db() : Promise.reject(new Error('chưa có kho')); }
  var _toi = null;
  function toi() {
    if (_toi) return _toi;
    // trang nw/: tệp này nạp TRƯỚC khi NW.dungThanh đăng nhập xong ⇒ chờ NW.toi (tối đa 20 giây) chứ không đọc Auth sớm (ra rỗng)
    if (window.NW && NW.dungThanh) {
      _toi = new Promise(function (res) {
        var n = 0;
        (function cho() { if (NW.toi) return res({ uid: NW.toi.uid, ten: NW.toi.ten, laThay: !!NW.toi.laThay }); if (++n > 100) { _toi = null; return res({ uid: '', ten: '', laThay: false }); } setTimeout(cho, 200); })();
      });
      return _toi;
    }
    _toi = kho().then(async function (f) {
      var au = await import(SDK + '/firebase-auth.js'), auth = au.getAuth(f.db.app);
      var u = auth.currentUser || await new Promise(function (res) { var s = au.onAuthStateChanged(auth, function (x) { s(); res(x); }); });
      if (!u) return { uid: '', ten: '', laThay: false };
      var tk = await u.getIdTokenResult().catch(function () { return { claims: {} }; });
      var hs = tk.claims && tk.claims.hs === true, ten = '';
      if (hs) { try { var s = await f.fs.getDoc(f.fs.doc(f.db, 'nwUsers', u.uid)); ten = s.exists() ? (s.data().ten || '') : ''; } catch (e) { } }
      return { uid: u.uid, ten: ten, laThay: !hs };
    })['catch'](function () { return { uid: '', ten: '', laThay: false }; });
    return _toi;
  }
  function diToi(href) {
    // ⭐ v1.350.0 — đang ở HỘP CHAT NHỎ (khung tinnhan.html?hop=1 trong trang khác) ⇒ trận mở ở CẢ CỬA SỔ, không trong hộp
    try {
      if (window.top !== window && window.top.location.origin === location.origin) {
        var u = new URL(window.NW && NW.duong ? NW.duong(href) : href, location.href).href;
        window.top.location.href = u; return;
      }
    } catch (e) { }
    if (window.NW && NW.di) NW.di(href); else location.href = href;
  }
  function moTran(id) { diToi((laNw ? '' : 'nw/') + 'tran.html?id=' + encodeURIComponent(id)); }
  // ⭐ v1.351.0 — XEM trực tiếp (bạn cùng lớp / thầy): trang trận ở chế độ xem, không bàn chữ, không ghi gì
  function moXem(id) { diToi((laNw ? '' : 'nw/') + 'tran.html?id=' + encodeURIComponent(id) + '&xem=1' + (banThu() ? '&thu=1&che=free' : '')); }

  // ---------- CSS (tự chèn — trang nw/ và trang chính khác bộ màu) ----------
  function napCss() {
    if (document.getElementById('theTdCss')) return;
    var s = document.createElement('style'); s.id = 'theTdCss';
    s.textContent =
      '.cu-td{align-self:center;width:min(360px,calc(100% - 16px));margin:8px auto;border-radius:16px;overflow:hidden;background:#fff;border:1px solid #E0EAE7;box-shadow:0 4px 14px rgba(22,35,42,.06);color:#16232A;font-family:inherit}' +
      '.cu-td .d{background:radial-gradient(ellipse 90% 120% at 50% 0%,#0F4029,#05170F);color:#9BFFC4;padding:7px 12px;display:flex;align-items:center;gap:6px;font-style:italic;font-weight:800;font-size:12px;line-height:1;letter-spacing:.12em;text-transform:uppercase}' +
      '.cu-td .d svg{width:14px;height:14px;flex:none}.cu-td .d span{margin-left:auto;font-weight:600;font-size:11px;line-height:1;letter-spacing:0;text-transform:none;color:#9FC9B2;font-style:normal;white-space:nowrap}' +
      '.cu-td .g{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:12px 12px 8px}' +
      '.cu-td .ng{display:flex;flex-direction:column;align-items:center;gap:4px;font-weight:700;font-size:13px;text-align:center;min-width:0}' +
      '.cu-td .ng i{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:13px;line-height:1;font-style:normal}' +
      '.cu-td .ng b{font-weight:900;font-size:22px;line-height:1;font-variant-numeric:tabular-nums}.cu-td .ng.th b{color:#1DA45C}' +
      '.cu-td .vs{font-style:italic;font-weight:900;font-size:16px;line-height:1;color:#5F7370}' +
      '.cu-td .c{padding:0 12px 12px;display:flex;flex-direction:column;gap:8px}' +
      '.cu-td .tt{text-align:center;font-size:13px;color:#5F7370;font-weight:600}.cu-td .tt b{color:#16232A}' +
      '.cu-td .va{height:3px;border-radius:2px;background:#E0EAE7;overflow:hidden}.cu-td .va i{display:block;height:100%;background:#0E7C6E;transition:width 1s linear}' +
      '.cu-td .h2{display:grid;grid-template-columns:1fr 1.4fr;gap:8px}' +
      '.cu-td button{height:38px;border:0;border-radius:12px;font-weight:700;font-size:14px;line-height:1;cursor:pointer;font-family:inherit}' +
      '.cu-td .k{background:#E3F1EE;color:#0E7C6E}.cu-td .n{background:#0E7C6E;color:#fff}' +
      '.cu-td .x{background:#FFF1E6;color:#C2410C;display:flex;align-items:center;justify-content:center;gap:6px}' +
      '.cu-td .dang{display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:13px;color:#0E7C6E}' +
      '.cu-td .dang::before{content:"";width:8px;height:8px;border-radius:50%;background:#1DA45C;animation:cutd 1s infinite}@keyframes cutd{50%{opacity:.25}}' +
      '.cu-td.mo{opacity:.6}' +
      // ⭐ v1.351.0 — thẻ GIẢI: to, đầu vàng có tên giải
      '.cu-td.giai{width:min(400px,calc(100% - 16px));border:1.5px solid #F2C14E;box-shadow:0 6px 20px rgba(242,166,30,.18)}' +
      '.cu-td.giai .d{background:linear-gradient(100deg,#B7791F,#F2A61E 55%,#F7C948);color:#2B1700;font-size:12.5px;padding:9px 12px}' +
      '.cu-td.giai .d span{color:#4A2D00;font-weight:700}' +
      '.cu-td.giai .gt{padding:8px 12px 0;text-align:center;font-weight:800;font-size:15px;line-height:1.25;color:#7A4B00}' +
      '.cu-td.giai .gt small{display:block;font-weight:600;font-size:11.5px;color:#9A6B1F;margin-top:2px}' +
      '.cu-td.giai .ng i{width:48px;height:48px;font-size:15px}.cu-td.giai .ng{font-size:14px}.cu-td.giai .ng b{font-size:26px}' +
      // ⭐ v1.351.0 — thẻ GIAO HỮU gọn một dòng
      '.cu-td.gon{width:min(440px,calc(100% - 16px));margin:4px auto;border-radius:999px;box-shadow:none;background:#F3F7F6;display:flex;align-items:center;gap:8px;padding:5px 6px 5px 12px;font-size:12.5px;color:#4B5F5B;min-height:34px}' +
      '.cu-td.gon .ic{flex:none;color:#0E7C6E;display:flex}.cu-td.gon .ic svg{width:14px;height:14px}' +
      '.cu-td.gon .nd{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cu-td.gon .nd b{color:#16232A;font-weight:700}' +
      '.cu-td.gon .nd em{font-style:normal;font-weight:700;color:#0E7C6E}' +
      '.cu-td.gon .nh{font-style:normal;font-weight:700;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#7C8C89;margin-right:2px}' +
      '.cu-td.gon button{height:26px;padding:0 10px;border-radius:999px;font-size:12px;flex:none}' +
      '.cu-td.gon .dg{width:7px;height:7px;border-radius:50%;background:#1DA45C;flex:none;animation:cutd 1s infinite}' +
      '.cu-kiem{color:#fff!important;background:linear-gradient(160deg,#1C8F55,#0E7C6E)!important;border-radius:50%}' +
      '.td-chon{position:fixed;z-index:9500;width:min(300px,calc(100vw - 24px));max-height:min(420px,70vh);overflow:auto;background:#fff;border:1px solid #E0EAE7;border-radius:16px;' +
      'box-shadow:0 14px 40px rgba(22,35,42,.2);padding:10px;color:#16232A;font-family:inherit}' +
      '.td-chon .t{font-weight:800;font-size:13.5px;padding:4px 6px 2px}.td-chon .p{font-size:12px;color:#5F7370;padding:0 6px 6px}' +
      '.td-chon button{width:100%;display:flex;align-items:center;gap:10px;padding:7px 6px;border:0;background:none;border-radius:10px;cursor:pointer;text-align:left;font:inherit;color:inherit}' +
      '.td-chon button:hover{background:#F3F7F6}.td-chon i{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:11px;line-height:1;font-style:normal;flex:none;position:relative}' +
      '.td-chon i::after{content:"";position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;background:#1DA45C;border:2px solid #fff}' +
      '.td-chon b{display:block;font-size:13.5px}.td-chon small{color:#5F7370;font-size:12px}.td-chon .trong{padding:14px 6px;color:#5F7370;font-size:13px;text-align:center}' +
      // ⭐ v1.351.0 — DẢI GHIM giải đấu (đầu khung chat, dính trên cùng)
      '.td-ghim{position:sticky;top:0;z-index:4;flex:none;margin:0 0 8px;border-radius:14px;background:#FFFBEF;border:1px solid #F2D58A;box-shadow:0 4px 14px rgba(183,121,31,.14);color:#3D2A00;font-family:inherit;overflow:hidden}' +
      '.td-ghim[hidden]{display:none}' +
      '.td-ghim .dong{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;user-select:none;min-height:40px}' +
      '.td-ghim .cup{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(140deg,#F7C948,#E89A10);color:#3D2A00}' +
      '.td-ghim .nd{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}' +
      '.td-ghim .nd b{font-size:13.5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.td-ghim .nd small{font-size:11.5px;line-height:1.2;color:#8A6A2A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.td-ghim .hang{flex:none;font-weight:800;font-size:12px;padding:4px 8px;border-radius:999px;background:#fff;border:1px solid #F2D58A;color:#7A4B00;white-space:nowrap}' +
      '.td-ghim .live{flex:none;display:flex;align-items:center;gap:5px;font-weight:800;font-size:11.5px;padding:4px 8px;border-radius:999px;background:#E8F7EF;color:#0E7C6E;white-space:nowrap}' +
      '.td-ghim .live::before{content:"";width:7px;height:7px;border-radius:50%;background:#1DA45C;animation:cutd 1s infinite}' +
      '.td-ghim .mui{flex:none;width:18px;height:18px;color:#A07A2A;transition:transform .2s}.td-ghim.mo .mui{transform:rotate(180deg)}' +
      '.td-ghim .ruot{display:none;padding:0 10px 10px;border-top:1px dashed #F2D58A;max-height:min(52vh,340px);overflow:auto;overscroll-behavior:contain}.td-ghim.mo .ruot{display:block}' +
      '.td-ghim h5{margin:9px 0 5px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#A07A2A}' +
      '.td-ghim .bxh{display:flex;flex-direction:column;gap:3px}' +
      '.td-ghim .bxh div{display:flex;align-items:center;gap:8px;font-size:13px;padding:3px 6px;border-radius:8px}.td-ghim .bxh div.em{background:#FFF0C2}' +
      '.td-ghim .bxh i{width:22px;font-style:normal;font-weight:800;text-align:center;flex:none}.td-ghim .bxh span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.td-ghim .bxh em{font-style:normal;font-weight:800;color:#7A4B00;flex:none}.td-ghim .bxh small{color:#9A7B3A;font-size:11px;flex:none}' +
      '.td-ghim .tran{display:flex;align-items:center;gap:8px;font-size:13px;padding:4px 6px;border-radius:8px;background:#fff;border:1px solid #F4E3B5;margin-bottom:4px}' +
      '.td-ghim .tran span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.td-ghim .tran b{font-variant-numeric:tabular-nums}' +
      '.td-ghim .tran small{color:#8A6A2A;font-size:11px;flex:none}' +
      '.td-ghim button.xem{height:26px;padding:0 10px;border:0;border-radius:999px;background:#FFF1E6;color:#C2410C;font-weight:700;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px;flex:none;font-family:inherit}' +
      '.td-ghim .trong{font-size:12.5px;color:#9A7B3A;padding:2px 6px}' +
      '.td-ghim .luat{font-size:12px;color:#8A6A2A;margin-top:8px;line-height:1.4}' +
      '.td-ghim a.du{display:inline-block;margin-top:8px;font-weight:700;font-size:12.5px;color:#B7791F;text-decoration:none}' +
      '.td-ghim.sap .dong{cursor:default}.td-ghim.sap .cup{background:#F3E8C8}';
    document.head.appendChild(s);
  }

  // ---------- tên giải (thẻ giải hiện tên) ----------
  var GIAI = {};   // id → { ten, bo } (đọc một lần)
  function docGiai(id) {
    if (!id || GIAI[id]) return;
    GIAI[id] = { ten: '' };
    if (banThu()) { GIAI[id] = { ten: 'Speed Cup tuần 3', bo: { ten: '7 JOB / WORDS', che: 'free' } }; return; }
    kho().then(function (f) { return f.fs.getDoc(f.fs.doc(f.db, 'giaiDau', id)); })
      .then(function (s) { if (s.exists()) { var d = s.data(); GIAI[id] = { ten: d.ten || '', bo: d.bo ? { ten: d.bo.ten || '', che: d.bo.che } : null }; veHetCua(id); } })['catch'](function () { });
  }
  function veHetCua(gid) { Object.keys(TRAN).forEach(function (id) { if (TRAN[id] && TRAN[id].giai === gid) veId(id); }); }

  // ---------- thẻ ----------
  var TRAN = {}, NGHE = {}, MOI_TAO = {};   // id → dữ liệu trận · id → đã nghe · id trận em vừa mời (tự vào trận khi bạn nhận)
  var TOI = { uid: '' };
  // đọc tài khoản LƯỜI: tệp này có thể nạp trước loi.js (trang nw/) — lần đầu cần vẽ thẻ / mở hộp chọn mới đọc
  var _daDocToi = false;
  function docToi() { if (_daDocToi) return; _daDocToi = true; setTimeout(function () { toi().then(function (x) { TOI = x; veHet(); veGhimHet(); }); }, 0); }
  var trongTran = function (t) { return !!(TOI.uid && t && (TOI.uid === t.a || TOI.uid === t.b)); };
  var dangDau = function (t) { return t && (t.trangThai === 'nhan' || t.trangThai === 'choi'); };
  function cardHtml(id) {
    var t = TRAN[id];
    if (!t) return '<div class="d">' + IC + 'Thách đấu<span>A Show Speed</span></div><div class="c"><div class="tt">Đang tải…</div></div>';
    if (t._khongDoc) return '<div class="d">' + IC + 'Thách đấu<span>A Show Speed</span></div><div class="c"><div class="tt">' + an(t._chu || 'Trận đấu của lớp') + '</div></div>';
    var xong = t.trangThai === 'xong', d = t.diem || {}, kqA = t.kq ? t.kq.a : '';
    var ng = function (ten, diem, thang) { return '<div class="ng' + (thang ? ' th' : '') + '"><i style="background:' + mau(ten) + '">' + an(tat(ten)) + '</i>' + an(ten) + (xong || t.trangThai === 'choi' ? '<b>' + (diem || 0) + '</b>' : '') + '</div>'; };
    var con = Math.max(0, Math.ceil(((t.het || 0) - Date.now()) / 1000));
    var het = t.trangThai === 'moi' && con <= 0;
    var duoi;
    if (t.trangThai === 'moi' && !het) {
      var va = '<div class="va"><i style="width:' + (con / 60 * 100) + '%"></i></div>';
      if (TOI.uid && TOI.uid === t.b) duoi = va + '<div class="h2"><button type="button" class="k" data-tdx="khong">Từ chối</button><button type="button" class="n" data-tdx="nhan">Nhận · <span class="td-con">' + con + '</span>s</button></div>';
      else duoi = va + '<div class="tt">Đang chờ <b>' + an(t.tenB) + '</b> nhận · <span class="td-con">' + con + '</span>s</div>' +
        (TOI.uid && TOI.uid === t.a ? '<button type="button" class="k" data-tdx="huy" style="height:34px">Huỷ lời mời</button>' : '');
    } else if (dangDau(t)) {
      duoi = '<div class="dang">Đang đấu…</div>' + (trongTran(t) ? '<button type="button" class="n" data-tdx="vao">Vào trận</button>'
        : '<button type="button" class="x" data-tdx="xem">' + IC_MAT + 'Theo dõi trực tiếp</button>');
    } else if (xong) {
      var ly = /^(roi|mat)[AB]$/.test(t.ly || '') ? (/^roi/.test(t.ly) ? ' · có bạn rời trận' : ' · có bạn mất kết nối') : '';
      duoi = '<div class="tt">' + (kqA === 'hoa' ? '<b>Hòa</b>' + (t.giai ? ' · +1 mỗi bạn' : '') : '<b>' + an(kqA === 'thang' ? t.tenA : t.tenB) + '</b> thắng' + (t.giai ? ' · +2 điểm' : '')) + an(ly) + '</div>';
    } else {
      duoi = '<div class="tt">' + ({ tuchoi: an(t.tenB) + ' chưa muốn đấu lúc này', huy: 'Lời mời đã huỷ' }[t.trangThai] || 'Lời mời đã hết hạn') + '</div>';
    }
    var g = GIAI[t.giai] || {}, bo = t.boTen || (g.bo && g.bo.ten) || '', che = t.che || (g.bo && g.bo.che) || '';
    return '<div class="d">' + IC_CUP + 'Giải đấu<span>A Show Speed · ' + (t.phut || 2) + ' phút' + (che ? ' · ' + an(CHE_TEN[che] || '') : '') + '</span></div>' +
      (g.ten ? '<div class="gt">' + an(g.ten) + (bo ? '<small>Bộ từ: ' + an(bo) + '</small>' : '') + '</div>' : '') +
      '<div class="g">' + ng(t.tenA, d.a, kqA === 'thang') + '<span class="vs">VS</span>' + ng(t.tenB, d.b, kqA === 'thua') + '</div><div class="c">' + duoi + '</div>';
  }
  // ⭐ v1.351.0 — thẻ GIAO HỮU: một dòng nhỏ
  function gonHtml(id) {
    var t = TRAN[id], A = an(t.tenA), B = an(t.tenB), nd, nut = '', dg = '';
    var con = Math.max(0, Math.ceil(((t.het || 0) - Date.now()) / 1000));
    if (t.trangThai === 'moi' && con > 0) {
      if (TOI.uid && TOI.uid === t.b) { nd = '<b>' + A + '</b> mời em giao hữu · <span class="td-con">' + con + '</span>s'; nut = '<button type="button" class="k" data-tdx="khong">Thôi</button><button type="button" class="n" data-tdx="nhan">Nhận</button>'; }
      else if (TOI.uid && TOI.uid === t.a) { nd = 'Chờ <b>' + B + '</b> nhận · <span class="td-con">' + con + '</span>s'; nut = '<button type="button" class="k" data-tdx="huy">Huỷ</button>'; }
      else nd = '<b>' + A + '</b> mời <b>' + B + '</b> giao hữu';
    } else if (dangDau(t)) {
      dg = '<i class="dg"></i>';
      nd = '<b>' + A + '</b> vs <b>' + B + '</b> · đang đấu';
      nut = trongTran(t) ? '<button type="button" class="n" data-tdx="vao">Vào trận</button>' : '<button type="button" class="x" data-tdx="xem">' + IC_MAT + 'Theo dõi</button>';
    } else if (t.trangThai === 'xong') {
      var d = t.diem || {}, kq = t.kq ? t.kq.a : '';
      nd = '<b>' + A + '</b> <em>' + (d.a || 0) + '–' + (d.b || 0) + '</em> <b>' + B + '</b>' + (kq === 'hoa' ? ' · hòa' : ' · ' + (kq === 'thang' ? A : B) + ' thắng');
    } else nd = A + ' – ' + B + ' · ' + ({ tuchoi: 'chưa đấu', huy: 'đã huỷ' }[t.trangThai] || 'lời mời hết hạn');
    return '<span class="ic">' + IC + '</span><span class="nh">Giao hữu</span>' + dg + '<span class="nd">' + nd + '</span>' + nut;
  }
  function moMo(t) { return t && !t._khongDoc && (t.trangThai === 'tuchoi' || t.trangThai === 'huy' || t.trangThai === 'het' || (t.trangThai === 'moi' && (t.het || 0) < Date.now())); }
  function laGon(t) { return !!(t && !t._khongDoc && !t.giai); }
  function veId(id) {
    var t = TRAN[id], gon = laGon(t);
    document.querySelectorAll('.cu-td[data-td="' + id + '"]').forEach(function (el) {
      el.innerHTML = gon ? gonHtml(id) : cardHtml(id);
      el.classList.toggle('mo', !!moMo(t)); el.classList.toggle('gon', gon); el.classList.toggle('giai', !!(t && t.giai));
    });
  }
  function veHet() { Object.keys(TRAN).forEach(veId); }
  function nghe(id) {
    if (NGHE[id]) return; NGHE[id] = 1;
    if (banThu()) { TRAN[id] = mauTran(id); docGiai(TRAN[id].giai); return veId(id); }
    kho().then(function (f) {
      f.fs.onSnapshot(f.fs.doc(f.db, 'tranDau', id), function (s) {
        var t = s.exists() ? s.data() : { _khongDoc: true };
        var cu = TRAN[id]; TRAN[id] = t; if (t.giai) docGiai(t.giai); veId(id);
        // em vừa mời từ chat: bạn nhận ⇒ vào trận luôn
        if (MOI_TAO[id] && (t.trangThai === 'nhan' || t.trangThai === 'choi') && (!cu || cu.trangThai === 'moi')) { delete MOI_TAO[id]; setTimeout(function () { moTran(id); }, 500); }
      }, function () { TRAN[id] = { _khongDoc: true }; veId(id); });
    });
  }
  async function bam(id, viec, nut) {
    if (viec === 'vao') return moTran(id);
    if (viec === 'xem') return moXem(id);
    if (banThu()) { if (viec === 'nhan') moTran('mau'); return; }
    nut.disabled = true;
    try {
      var f = await kho();
      await f.fs.updateDoc(f.fs.doc(f.db, 'tranDau', id), { trangThai: viec === 'nhan' ? 'nhan' : viec === 'huy' ? 'huy' : 'tuchoi' });
      if (viec === 'nhan') moTran(id);
    } catch (e) { nut.disabled = false; alert(viec === 'nhan' ? 'Lời mời đã hết hạn hoặc bạn đã huỷ.' : 'Chưa làm được — em thử lại nhé.'); }
  }
  // một nhịp mỗi giây: số giây còn lại + vạch của thẻ đang chờ (sửa tại chỗ — vẽ lại giữa cú bấm sẽ nuốt cú bấm)
  setInterval(function () {
    Object.keys(TRAN).forEach(function (id) {
      var t = TRAN[id]; if (!t || t.trangThai !== 'moi') return;
      var con = Math.max(0, Math.ceil(((t.het || 0) - Date.now()) / 1000));
      if (con <= 0) { if (!t._daVeHet) { t._daVeHet = 1; veId(id); } return; }
      document.querySelectorAll('.cu-td[data-td="' + id + '"]').forEach(function (el) {
        el.querySelectorAll('.td-con').forEach(function (s) { s.textContent = con; });
        var v = el.querySelector('.va i'); if (v) v.style.width = (con / 60 * 100) + '%';
      });
    });
  }, 1000);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-tdx]'); if (!b) return;
    var el = b.closest('.cu-td'); if (el) return bam(el.getAttribute('data-td'), b.getAttribute('data-tdx'), b);
    var x = b.getAttribute('data-tdx') === 'xem' && b.getAttribute('data-id'); if (x) moXem(x);   // nút Theo dõi trên dải ghim
  });

  // ---------- hộp chọn bạn đang online ----------
  var hop = null;
  function dongHop() { if (hop && hop.parentNode) hop.parentNode.removeChild(hop); hop = null; }
  document.addEventListener('pointerdown', function (e) { if (hop && !hop.contains(e.target) && !(e.target.closest && e.target.closest('[data-cu-td]'))) dongHop(); }, true);
  function datViTri(el, nut) {
    var r = nut.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left)) + 'px';
    el.style.top = Math.max(12, r.top - h - 8) + 'px';
  }
  async function giaiCuaLop(f, lop) {
    var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'giaiDau'), f.fs.where('lops', 'array-contains', lop), f.fs.limit(20)));
    var ds = []; s.forEach(function (d) { ds.push(Object.assign({ id: d.id }, d.data())); });
    return ds;
  }
  async function giaiDangMo(f, lop) {
    try {
      var bay = Date.now();
      return (await giaiCuaLop(f, lop)).filter(function (x) { return !x.dong && x.tu <= bay && bay < x.den; })[0] || null;
    } catch (e) { return null; }
  }
  async function banOnline(f, lop, uid) {
    var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'nwUsers'), f.fs.where('cacLop', 'array-contains', lop), f.fs.limit(60)));
    var ds = [], bay = Date.now();
    s.forEach(function (d) { var x = d.data(); if (d.id !== uid && x.vaiTro !== 'gv' && !x.nghiHoc && x.hoatDongLuc && bay - x.hoatDongLuc < ONLINE_MS) ds.push({ uid: d.id, ten: x.ten || '?' }); });
    return ds.sort(function (a, b) { return String(a.ten).localeCompare(String(b.ten), 'vi'); });
  }
  function mauBan() { return [{ uid: 'hs_1', ten: 'Gia Bảo' }, { uid: 'hs_2', ten: 'Bảo Nam' }, { uid: 'hs_3', ten: 'Thảo Vy' }]; }
  async function TheTD_moChon(nut, lop, gui, baoLoi) {
    if (hop) return dongHop();
    napCss();
    hop = document.createElement('div'); hop.className = 'td-chon';
    hop.innerHTML = '<div class="t">Thách đấu</div><div class="p">Đang tìm bạn đang online…</div>';
    document.body.appendChild(hop); datViTri(hop, nut);
    var el = hop, g = null, ds = [], me = await toi();
    try {
      if (banThu()) ds = mauBan();
      else { var f = await kho(); var r = await Promise.all([giaiDangMo(f, lop), banOnline(f, lop, me.uid)]); g = r[0]; ds = r[1]; }
    } catch (e) { ds = []; }
    if (hop !== el) return;
    el.innerHTML = '<div class="t">' + (g ? 'Thách đấu · ' + an(g.ten) : 'Giao hữu (không tính điểm)') + '</div><div class="p">A Show Speed · ' + (g ? g.phut : 2) + ' phút' +
      (g && g.bo ? ' · ' + an(CHE_TEN[g.bo.che] || '') + ' · ' + an(g.bo.ten || '') : '') + ' · bạn đang online</div>' +
      (ds.length ? ds.map(function (b) { return '<button type="button" data-uid="' + an(b.uid) + '"><i style="background:' + mau(b.ten) + '">' + an(tat(b.ten)) + '</i><div><b>' + an(b.ten) + '</b><small>Đang online</small></div></button>'; }).join('')
        : '<div class="trong">Chưa có bạn nào cùng lớp đang online.</div>');
    datViTri(el, nut);
    el.querySelectorAll('[data-uid]').forEach(function (b) {
      b.onclick = async function () {
        var ban = ds.filter(function (x) { return x.uid === b.getAttribute('data-uid'); })[0]; dongHop();
        if (banThu()) { MOI_TAO.mau = 1; if (baoLoi) baoLoi('Bàn thử: đã mời ' + ban.ten + ' — 3 giây nữa vào trận với máy.'); setTimeout(function () { location.href = (laNw ? '' : 'nw/') + 'tran.html?thu=1&ban=' + encodeURIComponent(ban.ten); }, 3000); return; }
        try {
          var f = await kho(), bay = Date.now();
          if (!me.ten) throw new Error('Chưa nhận ra tài khoản của em — em tải lại trang nhé.');
          var giai = g ? g.id : '', phut = g ? g.phut : 2, lv = g ? g.lv : 'easy';
          var ref = await f.fs.addDoc(f.fs.collection(f.db, 'tranDau'), { a: me.uid, b: ban.uid, nguoi: [me.uid, ban.uid], tenA: me.ten, tenB: ban.ten,
            lop: lop, giai: giai, phut: phut, lv: lv, trangThai: 'moi', taoLuc: bay, het: bay + 60000 });
          MOI_TAO[ref.id] = 1;
          try { await gui({ loai: 'td', id: ref.id }, '⚔ ' + me.ten + ' thách đấu ' + ban.ten); }
          catch (e2) { await f.fs.updateDoc(ref, { trangThai: 'huy' }).catch(function () { }); throw e2; }
        } catch (e) {
          var ma = String((e && (e.code || e.message)) || '');
          if (baoLoi) baoLoi(ma.indexOf('permission') >= 0 ? 'Chưa mời được: giải đã đóng, bạn không cùng lớp, hoặc đồng hồ máy em bị lệch.' : e);
        }
      };
    });
  }
  function mauTran(id) {
    var b = Date.now();
    if (id === 'mau-gh') return { a: 'hs_1', b: 'hs_2', tenA: 'Gia Bảo', tenB: 'Bảo Nam', giai: '', phut: 2, trangThai: 'choi', het: b, diem: { a: 4, b: 6 } };
    if (id === 'mau-dang') return { a: 'hs_2', b: 'hs_3', tenA: 'Bảo Nam', tenB: 'Thảo Vy', giai: 'm3', phut: 2, che: 'free', boTen: '7 JOB / WORDS', trangThai: 'choi', het: b, diem: { a: 8, b: 6 } };
    return { a: 'hs_1', b: 'hs_0', tenA: 'Gia Bảo', tenB: 'BẠN THỬ', giai: 'x', phut: 2, trangThai: id === 'mau-xong' ? 'xong' : 'moi', het: b + 45000, diem: { a: 12, b: 9 }, kq: { a: 'thang', b: 'thua' } };
  }

  // ============================================================
  // ⭐ v1.351.0 — DẢI GHIM GIẢI ĐẤU đầu khung chat lớp
  // Mỗi khung một dải (phần tử sống, chat-ui vẽ lại khung thì chèn lại đúng phần tử đó lên đầu — giữ trạng thái mở/đóng).
  // Nguồn: giaiDau (lớp có trong lops) · bảng giaiDau/{id}/bang/{lop} (nghe sống) · tranDau lop==lớp, trangThai 'choi' (nghe sống).
  // ============================================================
  var GHIM = [];   // { khung, el, lop, huy[], g, bang, dang[], sap }
  var MO_KEY = 'tdGhimMo';
  function moMac() { try { return localStorage.getItem(MO_KEY) === '1'; } catch (e) { return false; } }
  function luuMo(v) { try { localStorage.setItem(MO_KEY, v ? '1' : '0'); } catch (e) { } }
  function conLai(ms) {
    var p = Math.max(0, Math.round(ms / 60000)), ngay = Math.floor(p / 1440), gio = Math.floor(p % 1440 / 60), phut = p % 60;
    return ngay ? ngay + ' ngày ' + gio + ' giờ' : gio ? gio + ' giờ ' + phut + ' phút' : phut + ' phút';
  }
  function ngayGio(ms) { var d = new Date(ms); return hai(d.getHours()) + ':' + hai(d.getMinutes()) + ' ngày ' + d.getDate() + '/' + (d.getMonth() + 1); }
  function ghimHtml(G) {
    var g = G.g;
    if (!g) {
      if (!G.sap) return '';
      return '<div class="dong"><span class="cup">' + IC_CUP + '</span><span class="nd"><b>Sắp mở: ' + an(G.sap.ten) + '</b><small>Mở lúc ' + ngayGio(G.sap.tu) + ' · A Show Speed ' + G.sap.phut + ' phút</small></span></div>';
    }
    var em = (G.bang && G.bang.em) || {}, ds = Object.keys(em).map(function (u) { var r = em[u] || {}; return { uid: u, ten: r.ten || '?', t: r.t || 0, h: r.h || 0, b: r.b || 0, d: (r.t || 0) * 2 + (r.h || 0) }; })
      .filter(function (x) { return x.t + x.h + x.b > 0; })
      .sort(function (a, b) { return b.d - a.d || b.t - a.t || (a.t + a.h + a.b) - (b.t + b.h + b.b) || String(a.ten).localeCompare(String(b.ten), 'vi'); });
    var vt = -1; ds.forEach(function (x, i) { if (x.uid === TOI.uid) vt = i; });
    var hang = TOI.laThay ? '' : vt >= 0 ? '<span class="hang">Em #' + (vt + 1) + ' · ' + ds[vt].d + 'đ</span>' : '<span class="hang">Em chưa đấu</span>';
    var dang = G.dang || [];
    var tom = 'Còn ' + conLai(g.den - Date.now()) + (g.bo ? ' · ' + (CHE_TEN[g.bo.che] || '') + ' · ' + (g.bo.ten || '') : ' · A Show Speed ' + g.phut + ' phút');
    var HC = ['🥇', '🥈', '🥉'];
    var top = ds.slice(0, 5), bxh = top.map(function (x, i) {
      return '<div class="' + (x.uid === TOI.uid ? 'em' : '') + '"><i>' + (HC[i] || (i + 1)) + '</i><span>' + an(x.ten) + '</span><small>' + x.t + 'T ' + x.h + 'H ' + x.b + 'B</small><em>' + x.d + 'đ</em></div>';
    }).join('') + (vt >= 5 ? '<div class="em"><i>' + (vt + 1) + '</i><span>' + an(ds[vt].ten) + ' (em)</span><small>' + ds[vt].t + 'T ' + ds[vt].h + 'H ' + ds[vt].b + 'B</small><em>' + ds[vt].d + 'đ</em></div>' : '');
    var tran = dang.map(function (t) {
      var d = t.diem || {}, minh = TOI.uid && (TOI.uid === t.a || TOI.uid === t.b);
      return '<div class="tran"><span>' + an(t.tenA) + ' <b>' + (d.a || 0) + '–' + (d.b || 0) + '</b> ' + an(t.tenB) + '</span><small>' + (t.giai === g.id ? 'Giải' : 'Giao hữu') + '</small>' +
        (minh ? '' : '<button type="button" class="xem" data-tdx="xem" data-id="' + an(t._id) + '">' + IC_MAT + 'Theo dõi</button>') + '</div>';
    }).join('');
    var luat = 'Mỗi trận A Show Speed ' + g.phut + ' phút' + (g.bo ? ' · bộ từ ' + an(g.bo.ten || '') + ' (' + an(CHE_TEN[g.bo.che] || '') + ')' : ' · ' + an({ easy: 'Easy', medium: 'Medium', hard: 'Hard' }[g.lv] || g.lv)) +
      ' · thắng +2, hòa +1, thua 0' + (g.sao && g.sao.some(Boolean) ? ' · thưởng top 3: ' + g.sao.join(' · ') + ' ⭐' : '') + '. Bấm ⚔ cạnh ô gõ để thách đấu bạn đang online.';
    return '<div class="dong" data-ghim="mo"><span class="cup">' + IC_CUP + '</span><span class="nd"><b>' + an(g.ten) + '</b><small>' + an(tom) + '</small></span>' + hang +
      (dang.length ? '<span class="live">' + dang.length + ' đang đấu</span>' : '') +
      '<svg class="mui" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></div>' +
      '<div class="ruot"><h5>Bảng xếp hạng</h5><div class="bxh">' + (bxh || '<div class="trong">Chưa có trận nào — trận đầu tiên là của em!</div>') + '</div>' +
      '<h5>Đang đấu</h5>' + (tran || '<div class="trong">Không có trận nào đang đấu.</div>') +
      '<div class="luat">' + luat + '</div><a class="du" href="' + (laNw ? '' : 'nw/') + 'giaidau.html">Xem bảng đầy đủ →</a></div>';
  }
  function veGhim(G) {
    var h = ghimHtml(G);
    G.el.hidden = !h;
    G.el.classList.toggle('sap', !G.g);
    G.el.classList.toggle('mo', !!G.g && moMac());
    if (G.el._h !== h) { G.el._h = h; G.el.innerHTML = h; }
  }
  function veGhimHet() { GHIM.forEach(veGhim); }
  function boNghe(G) { (G.huy || []).forEach(function (f) { try { f(); } catch (e) { } }); G.huy = []; }
  async function napGhim(G) {
    var lop = G.lop;
    G._nap = Date.now(); boNghe(G); G.g = null; G.sap = null; G.bang = null; G.dang = []; veGhim(G);
    if (!lop) return;
    if (banThu()) {
      var bay0 = Date.now();
      G.g = { id: 'm3', ten: 'Speed Cup tuần 3', lops: [lop], phut: 2, lv: 'easy', tu: bay0 - 2 * 864e5, den: bay0 + 2 * 864e5 + 5 * 36e5, sao: [30, 20, 10], bo: { ten: '7 JOB / WORDS', che: 'free' } };
      G.bang = { em: { hs_1: { ten: 'Gia Bảo', t: 4, h: 0, b: 2 }, hs_0: { ten: 'BẠN THỬ', t: 3, h: 1, b: 1 }, hs_2: { ten: 'Bảo Nam', t: 3, h: 2, b: 0 }, hs_3: { ten: 'Thảo Vy', t: 2, h: 1, b: 2 } } };
      G.dang = [Object.assign({ _id: 'mau-dang' }, mauTran('mau-dang')), Object.assign({ _id: 'mau-gh' }, mauTran('mau-gh'))];
      return veGhim(G);
    }
    try {
      var f = await kho(), bay = Date.now(), ds = await giaiCuaLop(f, lop);
      if (G.lop !== lop) return;
      G.g = ds.filter(function (x) { return !x.dong && x.tu <= bay && bay < x.den; })[0] || null;
      if (!G.g) G.sap = ds.filter(function (x) { return !x.dong && x.tu > bay && x.tu - bay < 7 * 864e5; }).sort(function (a, b) { return a.tu - b.tu; })[0] || null;
      veGhim(G);
      if (!G.g) return;
      G.huy.push(f.fs.onSnapshot(f.fs.doc(f.db, 'giaiDau', G.g.id, 'bang', lop), function (s) { G.bang = s.exists() ? s.data() : null; veGhim(G); }, function () { }));
      G.huy.push(f.fs.onSnapshot(f.fs.query(f.fs.collection(f.db, 'tranDau'), f.fs.where('lop', '==', lop), f.fs.where('trangThai', '==', 'choi'), f.fs.limit(20)), function (s) {
        var ds2 = [], b2 = Date.now();
        s.forEach(function (d) { var t = d.data(); if ((t.ketThuc || 0) > b2 - 15000) ds2.push(Object.assign({ _id: d.id }, t)); });
        G.dang = ds2.sort(function (a, b) { return (b.giai === G.g.id) - (a.giai === G.g.id) || (b.batDau || 0) - (a.batDau || 0); }); veGhim(G);
      }, function (e) { console.warn('[ghim giải] trận đang đấu', e); }));
    } catch (e) { console.warn('[ghim giải]', e); }
  }
  function TheTD_ghim(khung, lop) {
    if (!khung) return;
    napCss(); docToi();
    var G = GHIM.filter(function (x) { return x.khung === khung; })[0];
    if (!G) {
      var el = document.createElement('div'); el.className = 'td-ghim'; el.hidden = true;
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-tdx],a')) return;
        if (!e.target.closest('[data-ghim="mo"]')) return;
        var mo = !el.classList.contains('mo'); el.classList.toggle('mo', mo); luuMo(mo);
      });
      G = { khung: khung, el: el, lop: null, huy: [] };
      GHIM.push(G);
    }
    // chat-ui vẽ lại khung bằng innerHTML ⇒ dải rơi ra ngoài: chèn lại đúng phần tử sống lên đầu
    if (G.el.parentNode !== khung || khung.firstChild !== G.el) khung.insertBefore(G.el, khung.firstChild);
    lop = lop || '';
    if (lop !== G.lop) { G.lop = lop; napGhim(G); }
  }
  // giải mở/đóng theo giờ ⇒ tải lại mỗi 5 phút; "còn … " nhích mỗi phút
  setInterval(function () { GHIM.forEach(function (G) { if (!G.khung.isConnected) return; if (Date.now() - (G._nap || 0) > 5 * 60e3) { G._nap = Date.now(); napGhim(G); } else veGhim(G); }); }, 60 * 1000);

  window.TheTD = {
    IC: IC,
    html: function (id) {
      napCss(); id = String(id || ''); var t = TRAN[id];
      return '<div class="cu-td' + (moMo(t) ? ' mo' : '') + (laGon(t) ? ' gon' : '') + (t && t.giai ? ' giai' : '') + '" data-td="' + an(id) + '">' + (laGon(t) ? gonHtml(id) : cardHtml(id)) + '</div>';
    },
    lap: function (khung) { docToi(); (khung || document).querySelectorAll('.cu-td[data-td]').forEach(function (el) { nghe(el.getAttribute('data-td')); }); },
    moChon: TheTD_moChon,
    ghim: TheTD_ghim,
    moXem: moXem
  };
})();
