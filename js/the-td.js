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
  // ⭐ v1.361.0 (16/10/2026 chiều, thầy) — AVATAR THẬT: ảnh nwUsers/{uid}.anh (đọc một lần mỗi uid, có ảnh thì vẽ lại thẻ); chưa có ⇒ chữ tắt trên nền màu
  var ANH = {};
  function anhUid(uid) {
    if (!uid) return '';
    if (uid in ANH) return ANH[uid] || '';
    ANH[uid] = '';
    if (banThu()) return '';
    kho().then(function (f) { return f.fs.getDoc(f.fs.doc(f.db, 'nwUsers', uid)); })
      .then(function (s) { var a = s.exists() ? (s.data().anh || '') : ''; if (a) { ANH[uid] = a; veHet(); } })['catch'](function () { });
    return '';
  }
  function avI(uid, ten, cls) {
    var a = anhUid(uid);
    return '<i' + (cls ? ' class="' + cls + '"' : '') + ' style="background:' + (a ? "#DCE6E3 url('" + an(a) + "') center/cover no-repeat" : mau(ten)) + '">' + (a ? '' : an(tat(ten))) + '</i>';
  }
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
        (function cho() { if (NW.toi) return res({ uid: NW.toi.uid, ten: NW.toi.ten, laThay: !!NW.toi.laThay, lop: NW.toi.lop || '' }); if (++n > 100) { _toi = null; return res({ uid: '', ten: '', laThay: false }); } setTimeout(cho, 200); })();
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
  // ⭐ thầy giao hữu — THẦY vào trận / theo dõi ở TAB MỚI (thầy chốt 16/10: dashboard giữ nguyên chỗ đang làm)
  function urlTran(id, xem) { var h = (laNw ? '' : 'nw/') + 'tran.html?id=' + encodeURIComponent(id) + (xem ? '&xem=1' : ''); return new URL(window.NW && NW.duong ? NW.duong(h) : h, location.href).href; }
  function moTabTrong() { try { return window.open('about:blank', '_blank'); } catch (e) { return null; } }
  function moTab(u) { var w = null; try { w = window.open(u, '_blank'); } catch (e) { } if (!w) diToi(u); }
  function moTran(id) { if (TOI.laThay) return moTab(urlTran(id)); diToi((laNw ? '' : 'nw/') + 'tran.html?id=' + encodeURIComponent(id)); }
  // ⭐ v1.351.0 — XEM trực tiếp (bạn cùng lớp / thầy): trang trận ở chế độ xem, không bàn chữ, không ghi gì
  function moXem(id) { if (TOI.laThay && !banThu()) return moTab(urlTran(id, true)); diToi((laNw ? '' : 'nw/') + 'tran.html?id=' + encodeURIComponent(id) + '&xem=1' + (banThu() ? '&thu=1&che=free' : '')); }

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
      '.cu-td.mo{opacity:.6}.cu-td[hidden]{display:none!important}' +
      // ⭐ v1.402.0 — THẺ CHỜ của người mời (góc màn, không nằm trong chat)
      '.td-cho-moi{position:fixed;z-index:9000;top:calc(var(--cao-thanh,62px) + 12px);right:16px;width:min(320px,calc(100% - 32px));background:#fff;border-radius:16px;border:1px solid #E0EAE7;' +
      'box-shadow:0 14px 40px rgba(22,35,42,.22);padding:12px;display:flex;flex-direction:column;gap:9px;color:#16232A;font-family:inherit;animation:tdcho .35s cubic-bezier(.22,.9,.3,1)}@keyframes tdcho{from{transform:translateX(30px);opacity:0}}' +
      '.td-cho-moi .tr{display:flex;align-items:center;gap:10px}.td-cho-moi .ic{width:36px;height:36px;border-radius:50%;background:#0F4029;color:#9BFFC4;display:grid;place-items:center;flex:none}.td-cho-moi .ic svg{width:18px;height:18px}' +
      '.td-cho-moi b{display:block;font-size:14px;line-height:1.25}.td-cho-moi small{display:block;color:#5F7370;font-size:12px;font-weight:600;margin-top:2px}' +
      '.td-cho-moi .va{height:3px;border-radius:2px;background:#E0EAE7;overflow:hidden}.td-cho-moi .va i{display:block;height:100%;background:#0E7C6E;transition:width 1s linear}' +
      '.td-cho-moi button{height:34px;border:0;border-radius:12px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;background:#E3F1EE;color:#0E7C6E}' +
      '.td-cho-moi .kq{font-size:13.5px;font-weight:600;color:#3B4F4B;text-align:center;padding:2px 0}' +
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
      '.td-ghim.sap .dong{cursor:default}.td-ghim.sap .cup{background:#F3E8C8}' +
      // ⭐ thầy giao hữu (16/10/2026) — thẻ trận CỦA THẦY: đầu xanh dương, ảnh thầy, dòng cách đấu
      '.cu-td.thay{width:min(400px,calc(100% - 16px));border:1.5px solid #A9C0F5;box-shadow:0 6px 20px rgba(62,107,224,.16)}' +
      '.cu-td.thay .d{background:linear-gradient(100deg,#1D3C99,#3E6BE0 60%,#6F93F2);color:#fff;font-size:12.5px;padding:9px 12px}' +
      '.cu-td.thay .d span{color:#DCE6FF}' +
      '@media (max-width:420px){.cu-td.thay .d{letter-spacing:.04em;font-size:11.5px;white-space:nowrap}}' +
      '.cu-td.thay .gt{padding:8px 12px 0;text-align:center;font-weight:700;font-size:13px;line-height:1.3;color:#2B4AA8}' +
      '.cu-td.thay .ng i{width:48px;height:48px;font-size:15px}.cu-td.thay .ng b{font-size:26px}' +
      '.cu-td .ng i.gv{background:#DCE6FF center/cover no-repeat;box-shadow:0 0 0 2px #3E6BE0}' +
      '.cu-td.thay .n{background:#3E6BE0}.cu-td.thay .k{background:#E6EDFD;color:#2B4AA8}.cu-td.thay .va i{background:#3E6BE0}' +
      '.cu-td.thay .moi{text-align:center;font-weight:700;font-size:13.5px;color:#16232A}' +
      '.cu-td.thay .ret{text-align:center;font-weight:800;font-size:14px;color:#16232A}.cu-td.thay .ret.hs{color:#B7791F}' +
      '.cu-td.thay .dang{color:#3E6BE0}.cu-td.thay .dang::before{background:#3E6BE0}' +
      // hộp chọn của thầy: phần CÁCH ĐẤU (nhớ lần chọn trước) + danh sách em
      '.td-chon.rong{width:min(360px,calc(100vw - 24px));max-height:min(560px,80vh)}' +
      '.td-cai{display:flex;flex-direction:column;gap:7px;padding:8px 6px 10px;margin:0 0 6px;border-bottom:1px solid #E0EAE7}' +
      '.td-cai .h{display:flex;align-items:center;gap:8px}.td-cai .h>em{font-style:normal;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#7C8C89;width:74px;flex:none}' +
      '.td-cai .chips{display:flex;flex-wrap:wrap;gap:4px;flex:1;min-width:0}' +
      '.td-chon .td-cai button{width:auto;display:inline-flex;padding:6px 10px;border-radius:999px;border:1px solid #D5E1DE;background:#fff;font-size:12.5px;font-weight:600;color:#3B4F4B;gap:0}' +
      '.td-chon .td-cai button:hover{background:#F3F7F6}.td-chon .td-cai button.on{background:#3E6BE0;border-color:#3E6BE0;color:#fff}' +
      '.td-cai select{flex:1;min-width:0;height:32px;border:1px solid #D5E1DE;border-radius:10px;padding:0 8px;font:inherit;font-size:13px;color:#16232A;background:#fff}' +
      '.td-chon .gvb{font-style:normal;font-size:10px;font-weight:800;letter-spacing:.04em;padding:2px 6px;border-radius:999px;background:#E6EDFD;color:#2B4AA8;margin-left:6px;vertical-align:1px}' +
      '.td-chon i.anh{background:#DCE6FF center/cover no-repeat}' +
      '.td-chon .tt2{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#5F7370;padding:2px 6px 8px}.td-chon .tt2 .c{width:8px;height:8px;border-radius:50%;background:#1DA45C;flex:none}.td-chon .tt2 .c.tat{background:#B9C6C3}' +
      '.td-chon button.moi-nut{height:40px;justify-content:center;border-radius:12px;background:#3E6BE0;color:#fff;font-weight:700;font-size:14px;margin-top:4px}' +
      '.td-chon button.moi-nut:hover{background:#3560CF}' +
      // ⭐ v1.361.0 — đang đấu: mờ, không bấm được, chữ cam
      '.td-chon button.ban,.td-chon button[disabled]{opacity:.6;cursor:not-allowed}.td-chon button.ban:hover{background:none}.td-chon button.ban small{color:#C2410C;font-weight:700}' +
      '.td-chon .tt2.dd{color:#C2410C;font-weight:700}.td-chon .tt2 .c.dd{background:#F0821E}.td-chon button.moi-nut[disabled]:hover{background:#3E6BE0}' +
      /* ⭐ v1.372.0 — HỘP ⚔ menu 2 bước (mẫu mau-v9-chat-dau, phương án A). Mọi lớp tiền tố td- ; .td-chon button (0,1,1) + :hover (0,2,1) ⇒ viết (0,3,1) để thắng */
      '.td-chon.td-hop{width:min(360px,calc(100vw - 24px));padding:12px;display:flex;flex-direction:column;gap:10px;max-height:min(80vh,620px)}' +
      '.td-hop svg.i{width:1em;height:1em;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vertical-align:-.14em;flex:none}' +
      '.td-hop .td-ph{display:flex;align-items:center;gap:8px;padding:0}' +
      '.td-hop .td-ph b{font-weight:800;font-size:14px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.td-hop .td-ph small{color:#5F7370;font-weight:600;font-size:11.5px;white-space:nowrap}' +
      '.td-chon.td-hop button.td-lui{width:30px;height:30px;padding:0;border-radius:9px;border:1px solid #E0EAE7;background:#fff;color:#16232A;display:grid;place-items:center;flex:none}' +
      '.td-chon.td-hop button.td-lui:hover{background:#F3F7F6}' +
      '.td-chon.td-hop button.td-cd{display:block;width:100%;border:0;text-align:left;cursor:pointer;border-radius:14px;color:inherit;padding:0;font:inherit;gap:0}' +
      '.td-chon.td-hop button.td-cd:focus-visible,.td-chon.td-hop button.td-moi:focus-visible,.td-chon.td-hop button.td-chip2:focus-visible,.td-chon.td-hop button.td-bd:focus-visible,.td-chon.td-hop button.td-lui:focus-visible{outline:2px solid #2F6FEB;outline-offset:2px}' +
      '.td-chon.td-hop button.td-cd[aria-disabled="true"]{cursor:not-allowed}' +
      '.td-chon.td-hop button.td-hero{overflow:hidden;color:#E6FFF1;padding:13px 14px;min-height:88px;display:flex;flex-direction:column;gap:6px;' +
        'background:linear-gradient(rgba(61,245,138,.06) 1px,transparent 1px) 0 0/24px 24px,linear-gradient(90deg,rgba(61,245,138,.06) 1px,transparent 1px) 0 0/24px 24px,linear-gradient(110deg,#0B3A24,#05170F 70%);' +
        'box-shadow:0 8px 22px rgba(5,23,15,.32),inset 0 0 0 1.5px rgba(155,255,196,.35)}' +
      '.td-hero .td-r1{display:flex;align-items:center;gap:10px;width:100%}' +
      '.td-hero .td-ic{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#1DE07A,#8CFFBF);color:#04200F;flex:none;font-size:20px}' +
      '.td-hero .td-nd{flex:1;min-width:0}' +
      '.td-hero .td-nm{font:italic 900 22px/1 \'Barlow Condensed\',\'Arial Narrow\',\'Roboto Condensed\',Arial,sans-serif;text-transform:uppercase;color:#9BFFC4;text-shadow:0 0 14px rgba(61,245,138,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.td-hero .td-sub{font-size:11.5px;font-weight:600;color:#A9D8BF;line-height:1.3;margin-top:3px}' +
      '.td-hero .td-dem{margin-left:auto;font:italic 800 21px/1 \'Barlow Condensed\',\'Arial Narrow\',\'Roboto Condensed\',Arial,sans-serif;letter-spacing:.05em;color:#fff;font-variant-numeric:tabular-nums;white-space:nowrap;flex:none}' +
      '.td-hero .td-chip{font-weight:800;font-size:9.5px;line-height:1;letter-spacing:.06em;padding:4px 8px;border-radius:999px;background:rgba(155,255,196,.16);color:#9BFFC4;align-self:flex-start}' +
      '.td-chon.td-hop button.td-hero[aria-disabled="true"]{filter:grayscale(.85);opacity:.5;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.2)}' +
      '.td-hero .td-khoa{margin-left:auto;font-size:18px;opacity:.9;flex:none}' +
      '.td-chon.td-hop button.td-hero.sapm{filter:none;opacity:1;background:linear-gradient(rgba(200,215,240,.06) 1px,transparent 1px) 0 0/24px 24px,linear-gradient(90deg,rgba(200,215,240,.06) 1px,transparent 1px) 0 0/24px 24px,linear-gradient(110deg,#33445F,#141C2A 70%);box-shadow:inset 0 0 0 1.5px rgba(200,215,240,.3)}' +
      '.td-hero.sapm .td-nm{color:#DCE8FA;text-shadow:none}' +
      // ⭐ 26/10/2026 — thẻ XẾP HẠNG THẾ GIỚI (mẫu thong-bao-mua2-v3): dòng đầu tên game + nhãn mùa (không đè tiêu đề) · hạng em · nút
      '.td-chon.td-hop button.td-xh{position:relative;overflow:hidden;color:#E6FFF1;padding:12px 12px 12px;display:flex;flex-direction:column;align-items:stretch;text-align:left;gap:0;' +
        'background:radial-gradient(120% 120% at 100% 0%,rgba(55,215,255,.22),transparent 55%),linear-gradient(135deg,#0E3A25,#04140B 70%);' +
        'box-shadow:inset 0 0 0 1.5px rgba(61,245,138,.65),0 6px 18px rgba(4,32,15,.35)}' +
      '.td-xh .td-x0{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}' +
      '.td-xh .td-game{font:800 10.5px/1 \'Barlow Condensed\',Arial,sans-serif;letter-spacing:.22em;color:#3DF58A}' +
      '.td-xh .td-mua{font-weight:800;font-size:9.5px;line-height:1;letter-spacing:.1em;color:#03150C;background:#FFC94A;border-radius:5px;padding:4px 6px;white-space:nowrap}' +
      '.td-xh .td-x1{display:flex;gap:10px;align-items:flex-start;min-width:0}.td-xh .td-nd{flex:1;min-width:0}.td-xh .td-toi>div{min-width:0}' +
      '.td-xh .td-ic{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#1DE07A,#8CFFBF);color:#04200F;flex:none}' +
      '.td-xh .td-nm{font:italic 900 22px/1 \'Barlow Condensed\',\'Arial Narrow\',Arial,sans-serif;text-transform:uppercase;color:#9BFFC4;text-shadow:0 0 14px rgba(61,245,138,.45)}' +
      '.td-xh .td-sub{font-size:11.5px;font-weight:600;color:#A9D8BF;line-height:1.35;margin-top:4px}' +
      '.td-xh .td-x2{display:flex;align-items:center;gap:8px;margin-top:11px}' +
      '.td-xh .td-toi{display:flex;align-items:center;gap:8px;flex:1;min-width:0;padding:6px 8px;border-radius:10px;background:rgba(0,0,0,.28)}' +
      '.td-xh .td-toi b{display:block;font:italic 800 15px/1.1 \'Barlow Condensed\',Arial,sans-serif;letter-spacing:.02em}' +
      '.td-xh .td-toi small{display:block;font-size:10.5px;color:#8DB9A2;line-height:1.3}' +
      '.td-xh .td-hh{width:28px;height:31px;flex:none;display:block}' +
      '.td-xh .td-vao{flex:none;border-radius:10px;padding:10px 12px;background:linear-gradient(180deg,#5BFFA0,#22C46C);color:#03150C;font:italic 900 15px/1 \'Barlow Condensed\',Arial,sans-serif;letter-spacing:.06em}' +
      '.td-xh.mo-sap .td-vao{background:rgba(230,255,241,.12);color:#E6FFF1}' +
      '.td-hop .td-gio{font-size:12px;color:#5F7370;padding:0 2px}' +
      '.td-hop .td-note{font-size:11.5px;font-weight:600;color:#5F7370;background:#F3F7F6;border-radius:10px;padding:7px 10px;display:none}.td-hop .td-note:not(:empty){display:block}' +
      '.td-hop .td-phu{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '.td-chon.td-hop button.td-s{border:1.5px solid #E0EAE7;background:#fff;padding:10px 11px;display:flex;flex-direction:column;align-items:stretch;gap:3px;min-height:68px;border-radius:14px}' +
      '.td-chon.td-hop button.td-s:hover{background:#F3F7F6}' +
      '.td-s .td-t{display:flex;align-items:center;gap:7px;font-weight:800;font-size:13px}' +
      '.td-s .td-ic{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font-size:15px;flex:none}' +
      '.td-s small{font-size:11px;color:#5F7370;font-weight:600;line-height:1.3}' +
      '.td-gh .td-ic{background:#FBF0DC;color:#B9771A}.td-lt .td-ic{background:#E6EEFD;color:#2F6FEB}' +
      '.td-hop .td-tip{font-size:11.5px;color:#5F7370;font-weight:600;background:#F3F7F6;border-radius:10px;padding:8px 10px;display:flex;gap:7px;align-items:center;line-height:1.35}' +
      '.td-hop .td-tip.g{background:#0B2A1B;color:#BFF5D6}.td-hop .td-tip.b{background:#E6EEFD;color:#2F6FEB}' +
      '.td-hop .td-ds{display:flex;flex-direction:column;gap:2px;overflow:auto;min-height:0}' +
      '.td-hop .td-ban{display:flex;align-items:center;gap:10px;padding:7px 4px;border-radius:12px}' +
      '.td-hop .td-ban i{width:36px;height:36px;font-size:11px}' +
      '.td-hop .td-ban .td-nd{flex:1;min-width:0}' +
      '.td-hop .td-ban .td-nd b{display:flex;align-items:center;gap:6px;font-size:13.5px}' +
      '.td-hop .td-ban .td-nd small{display:block;color:#5F7370;font-size:11.5px;font-weight:600}' +
      '.td-hop .td-ban.dd{opacity:.9}.td-hop .td-ban.dd small{color:#C2410C;font-weight:700}.td-hop .td-ban.dd i::after{background:#F59E0B}' +
      '.td-chon.td-hop button.td-moi{width:auto;height:34px;padding:0 14px;border-radius:10px;border:0;font-weight:800;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex:none;font-family:inherit}' +
      '.td-chon.td-hop button.td-moi.dau{background:linear-gradient(110deg,#0B3A24,#05170F);color:#9BFFC4;box-shadow:inset 0 0 0 1.5px rgba(155,255,196,.4)}' +
      '.td-chon.td-hop button.td-moi.gh{background:#FBF0DC;color:#B9771A}' +
      '.td-chon.td-hop button.td-moi[disabled]{opacity:.4;cursor:not-allowed}' +
      '.td-hop .td-rongtt{padding:14px;text-align:center;color:#5F7370;font-size:12.5px;font-weight:600}' +
      '.td-hop .td-lts{display:flex;flex-direction:column;gap:9px}' +
      '.td-hop .td-lts label{display:block;font-weight:800;font-size:9.5px;line-height:1;letter-spacing:.1em;text-transform:uppercase;color:#5F7370;margin-bottom:5px}' +
      '.td-hop .td-row{display:flex;gap:6px;flex-wrap:wrap}' +
      '.td-chon.td-hop button.td-chip2{width:auto;height:32px;padding:0 12px;border-radius:9px;border:1px solid #E0EAE7;background:#F3F7F6;color:#5F7370;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit}' +
      '.td-chon.td-hop button.td-chip2.on{background:#2F6FEB;border-color:#2F6FEB;color:#fff}' +
      '.td-chon.td-hop button.td-chip2[disabled]{opacity:.4;cursor:not-allowed}' +
      '.td-chon.td-hop button.td-bd{height:42px;border-radius:12px;border:0;background:#2F6FEB;color:#fff;font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit}' +
      '@media (prefers-reduced-motion:reduce){.td-hop *{transition:none!important;animation:none!important}}';
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
  var TRAN = {}, NGHE = {}, MOI_TAO = {};   // id → dữ liệu trận · id → đã nghe · (bàn thử) — v1.402.0: "em vừa mời ⇒ tự vào trận" nay ở CHO
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
    if (t.gv) return thayHtml(id);
    var xong = t.trangThai === 'xong', d = t.diem || {}, kqA = t.kq ? t.kq.a : '';
    var ng = function (ten, diem, thang, uid) { return '<div class="ng' + (thang ? ' th' : '') + '">' + avI(uid, ten) + an(ten) + (xong || t.trangThai === 'choi' ? '<b>' + (diem || 0) + '</b>' : '') + '</div>'; };
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
      // ⭐ v1.375.0 — bên đã đủ trận tính điểm hôm nay: trận vẫn ghi, không cộng bảng
      var kt = t.khongTinh || {}, ktChu = kt.a && kt.b ? ' · không tính điểm (cả hai đã đủ trận hôm nay)' : kt.a || kt.b ? ' · không tính điểm cho ' + (kt.a ? t.tenA : t.tenB) + ' (đã đủ trận hôm nay)' : '';
      duoi = '<div class="tt">' + (kqA === 'hoa' ? '<b>Hòa</b>' + (t.giai && !ktChu ? ' · +1 mỗi bạn' : '') : '<b>' + an(kqA === 'thang' ? t.tenA : t.tenB) + '</b> thắng' + (t.giai && !ktChu ? ' · +2 điểm' : '')) + an(ly) + an(ktChu) + '</div>';
    } else if (t.trangThai === 'han') {
      duoi = '<div class="tt">' + an(GH.chuHan(t)) + '</div>';
    } else {
      duoi = '<div class="tt">' + ({ tuchoi: an(t.tenB) + ' chưa muốn đấu lúc này', huy: 'Lời mời đã huỷ' }[t.trangThai] || 'Lời mời đã hết hạn') + '</div>';
    }
    var g = GIAI[t.giai] || {}, bo = t.boTen || (g.bo && g.bo.ten) || '', che = t.che || (g.bo && g.bo.che) || '';
    return '<div class="d">' + IC_CUP + 'Giải đấu<span>A Show Speed · ' + (t.phut || 2) + ' phút' + (che ? ' · ' + an(CHE_TEN[che] || '') : '') + '</span></div>' +
      (g.ten ? '<div class="gt">' + an(g.ten) + (bo ? '<small>Bộ từ: ' + an(bo) + '</small>' : '') + '</div>' : '') +
      '<div class="g">' + ng(t.tenA, d.a, kqA === 'thang', t.a) + '<span class="vs">VS</span>' + ng(t.tenB, d.b, kqA === 'thua', t.b) + '</div><div class="c">' + duoi + '</div>';
  }
  // ⭐ thầy giao hữu (16/10/2026) — thẻ trận có THẦY (t.gv = uid thầy; thầy mời em HOẶC em mời thầy). Thẻ to, đầu xanh dương.
  var AV_THAY = 'assets/avatar-tron.jpg';   // trang chính + nw/ đều có tệp này cùng đường tương đối
  var LV_TEN = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  function cachDau(t) {   // "Free words · FRUITS / WORDS" | "Easy · 16 chữ ngẫu nhiên"
    var c = t.cai || {}, che = t.che || c.che || '', bo = t.boTen || c.boTen || '';
    return che ? (CHE_TEN[che] || '') + (bo ? ' · ' + bo : '') : (LV_TEN[t.lv] || 'Easy') + ' · 16 chữ ngẫu nhiên';
  }
  function thayHtml(id) {
    var t = TRAN[id], gvA = t.gv === t.a, hsK = gvA ? 'b' : 'a', hsTen = gvA ? t.tenB : t.tenA;
    var xong = t.trangThai === 'xong', d = t.diem || {}, kq = t.kq || {};
    var ng = function (k) {
      var laGv = (k === 'a') === gvA, ten = laGv ? 'Thầy Andrew' : (k === 'a' ? t.tenA : t.tenB);
      var av = laGv ? '<i class="gv" style="background-image:url(' + an(anhUid(t.gv) || AV_THAY) + ')"></i>' : avI(k === 'a' ? t.a : t.b, ten);
      return '<div class="ng' + (xong && kq[k] === 'thang' ? ' th' : '') + '">' + av + an(ten) + (xong || t.trangThai === 'choi' ? '<b>' + (d[k] || 0) + '</b>' : '') + '</div>';
    };
    var con = Math.max(0, Math.ceil(((t.het || 0) - Date.now()) / 1000)), duoi;
    if (t.trangThai === 'moi' && con > 0) {
      var va = '<div class="va"><i style="width:' + (con / 60 * 100) + '%"></i></div>';
      if (TOI.uid && TOI.uid === t.b) duoi = '<div class="moi">' + (gvA ? 'Thầy mời em giao hữu' : an(hsTen) + ' mời thầy giao hữu') + '</div>' + va +
        '<div class="h2"><button type="button" class="k" data-tdx="khong">Từ chối</button><button type="button" class="n" data-tdx="nhan">Nhận · <span class="td-con">' + con + '</span>s</button></div>';
      else if (TOI.uid && TOI.uid === t.a) duoi = va + '<div class="tt">Đang chờ <b>' + (gvA ? an(hsTen) : 'thầy') + '</b> nhận · <span class="td-con">' + con + '</span>s</div>' +
        '<button type="button" class="k" data-tdx="huy" style="height:34px">Huỷ lời mời</button>';
      else duoi = va + '<div class="tt">' + (gvA ? 'Thầy mời <b>' + an(hsTen) + '</b> giao hữu' : '<b>' + an(hsTen) + '</b> mời thầy giao hữu') + '</div>';
    } else if (dangDau(t)) {
      duoi = '<div class="dang">Đang đấu…</div>' + (trongTran(t) ? '<button type="button" class="n" data-tdx="vao">Vào trận</button>'
        : '<button type="button" class="x" data-tdx="xem">' + IC_MAT + 'Theo dõi trực tiếp</button>');
    } else if (xong) {
      var r = kq[hsK];
      duoi = r === 'thang' ? '<div class="ret hs">🎉 ' + an(hsTen) + ' thắng thầy!</div>' : r === 'thua' ? '<div class="ret">Thầy Andrew thắng</div>' : '<div class="ret">Hòa với thầy</div>';
      if (/^(roi|mat)[AB]$/.test(t.ly || '')) duoi += '<div class="tt">' + (/^roi/.test(t.ly) ? 'Có người rời trận' : 'Có người mất kết nối') + '</div>';
    } else {
      duoi = '<div class="tt">' + ({ tuchoi: (gvA ? an(hsTen) : 'Thầy') + ' chưa muốn đấu lúc này', huy: 'Lời mời đã huỷ' }[t.trangThai] || 'Lời mời đã hết hạn') + '</div>';
    }
    return '<div class="d">' + IC + (TOI.laThay ? 'Thầy giao hữu' : 'Giao hữu với thầy') + '<span>A Show Speed · ' + (t.phut || 2) + ' phút</span></div>' +
      '<div class="gt">' + an(cachDau(t)) + '</div>' +
      '<div class="g">' + ng('a') + '<span class="vs">VS</span>' + ng('b') + '</div><div class="c">' + duoi + '</div>';
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
    } else nd = A + ' – ' + B + ' · ' + ({ tuchoi: 'chưa đấu', huy: 'đã huỷ', han: t.ly === 'dem' ? 'giờ nghỉ đêm' : 'đã đủ trận hôm nay' }[t.trangThai] || 'lời mời hết hạn');
    return '<span class="ic">' + IC + '</span><span class="nh">Giao hữu</span>' + dg + '<span class="nd">' + nd + '</span>' + nut;
  }
  function moMo(t) { return t && !t._khongDoc && (t.trangThai === 'tuchoi' || t.trangThai === 'huy' || t.trangThai === 'het' || t.trangThai === 'han' || (t.trangThai === 'moi' && (t.het || 0) < Date.now())); }
  function laGon(t) { return !!(t && !t._khongDoc && !t.giai && !t.gv); }
  /* ⭐ v1.402.0 (22/10/2026, thầy) — CHAT CHỈ GIỮ TRẬN CÓ ĐẤU: lời mời không thành (từ chối · huỷ · hết hạn · bị giới hạn) không hiện cho ai;
     đang chờ nhận thì chỉ HAI người trong trận thấy (tin cũ trong lịch sử chat). Lời mời mới không vào chat nữa — xem THẺ CHỜ (moCho) dưới. */
  function anThe(t) {
    if (!t) return true;   // chưa tải xong: chưa hiện (khỏi nháy thẻ rồi mới ẩn)
    if (t._khongDoc) return false;
    if (moMo(t)) return true;
    return t.trangThai === 'moi' && !trongTran(t);
  }
  function veId(id) {
    var t = TRAN[id], gon = laGon(t);
    document.querySelectorAll('.cu-td[data-td="' + id + '"]').forEach(function (el) {
      el.hidden = anThe(t);
      el.innerHTML = gon ? gonHtml(id) : cardHtml(id);
      el.classList.toggle('mo', !!moMo(t)); el.classList.toggle('gon', gon); el.classList.toggle('giai', !!(t && t.giai)); el.classList.toggle('thay', !!(t && t.gv));
    });
  }
  function veHet() { Object.keys(TRAN).forEach(veId); }
  function nghe(id) {
    if (NGHE[id]) return; NGHE[id] = 1;
    if (banThu()) { TRAN[id] = mauTran(id); docGiai(TRAN[id].giai); return veId(id); }
    kho().then(function (f) {
      f.fs.onSnapshot(f.fs.doc(f.db, 'tranDau', id), function (s) {
        var t = s.exists() ? s.data() : { _khongDoc: true };
        TRAN[id] = t; if (t.giai) docGiai(t.giai); veId(id);
        // ⭐ v1.402.0 — người mời đang chờ: trận rời trạng thái 'moi' ⇒ nhận thì gửi thẻ vào chat + vào trận; không thành thì chỉ báo ở thẻ chờ
        if (CHO[id] && t.trangThai && t.trangThai !== 'moi') xongCho(id, t);
      }, function () { TRAN[id] = { _khongDoc: true }; veId(id); });
    });
  }
  async function bam(id, viec, nut) {
    if (viec === 'vao') return moTran(id);
    if (viec === 'xem') return moXem(id);
    if (banThu()) { if (THU_SIM[id]) return THU_SIM[id](viec); if (viec === 'nhan') moTran('mau'); return; }
    nut.disabled = true;
    // ⭐ v1.375.0 — giới hạn chơi: trận em–em lúc nghỉ đêm / em đã đủ trận ⇒ báo, không bấm Nhận (trận có thầy tự do)
    // ⭐ v1.415.0 — Quản lý thách đấu: em Nhận lời mời của BẠN khi thầy đã đóng chế độ đó / em bị chặn ⇒ báo (thầy mời em thì luôn Nhận được)
    if (viec === 'nhan' && TRAN[id] && !TRAN[id].gv && !TOI.laThay) {
      var cheN = TRAN[id].giai ? 'giai' : 'gh', camN = await TQ.kiem(cheN, { uid: TOI.uid, lop: TRAN[id].lop });
      if (camN) { nut.disabled = false; return TQ.hop(camN, cheN); }
    }
    if (viec === 'nhan' && TRAN[id] && !TRAN[id].gv && !TOI.laThay) {
      var ch = await GH.chanNhan(TOI.uid);
      if (ch) { nut.disabled = false; if (ch === 'dem') GH.hopNgu(); else alert(ch); return; }
    }
    try {
      var f = await kho();
      await f.fs.updateDoc(f.fs.doc(f.db, 'tranDau', id), { trangThai: viec === 'nhan' ? 'nhan' : viec === 'huy' ? 'huy' : 'tuchoi' });
      if (viec === 'nhan') moTran(id);
    } catch (e) { nut.disabled = false; alert(viec === 'nhan' ? 'Lời mời đã hết hạn hoặc bạn đã huỷ.' : 'Chưa làm được — em thử lại nhé.'); }
  }
  // ---------- ⭐ v1.402.0 (22/10/2026, thầy) — THẺ CHỜ của người mời: góc màn, KHÔNG gửi gì vào chat ----------
  // Bạn được mời đã có thẻ góc Nhận/Từ chối (nw/js/thachdau.js · js/tn-khung.js) ⇒ lúc chờ chỉ hai người biết.
  // Bạn NHẬN ⇒ lúc đó mới gửi thẻ trận vào chat (đang đấu → kết quả) rồi vào trận. Từ chối / huỷ / hết hạn ⇒ chỉ báo ở thẻ chờ rồi tắt.
  var CHO = {};   // id trận → { gui, chu, ten, vao, el, xong }
  function moCho(id, o, chu, vao) {
    napCss();
    var ten = o.ban.laThay ? 'thầy' : o.ban.ten;
    var el = document.createElement('div'); el.className = 'td-cho-moi'; el.setAttribute('role', 'status');
    el.innerHTML = '<div class="tr"><span class="ic">' + IC + '</span><div><b>Đang chờ ' + an(ten) + ' nhận</b><small>Chỉ hai người thấy lời mời · <span class="td-con">60</span>s</small></div></div>' +
      '<div class="va"><i style="width:100%"></i></div><button type="button" data-cho-huy>Huỷ lời mời</button>';
    document.body.appendChild(el);
    CHO[id] = { gui: o.gui, chu: chu, ten: ten, vao: vao, el: el };
    el.querySelector('[data-cho-huy]').onclick = async function () {
      this.disabled = true;
      if (banThu()) return THU_SIM[id] && THU_SIM[id]('huy');
      try { var f = await kho(); await f.fs.updateDoc(f.fs.doc(f.db, 'tranDau', id), { trangThai: 'huy' }); }
      catch (e) { this.disabled = false; }
    };
  }
  function xongCho(id, t) {
    var c = CHO[id]; if (!c || c.xong) return; c.xong = 1;
    var tt = t.trangThai, nhan = tt === 'nhan' || tt === 'choi' || tt === 'xong', ten = '<b>' + an(c.ten) + '</b>';
    var kq = nhan ? ten + ' đã nhận! Vào trận…' : tt === 'tuchoi' ? ten + ' chưa muốn đấu lúc này.' : tt === 'huy' ? 'Đã huỷ lời mời.'
      : tt === 'han' ? an(GH.chuHan(t)) : ten + ' chưa nhận lời mời. Em thử mời bạn khác nhé.';
    c.el.innerHTML = '<div class="kq">' + kq + '</div>';
    setTimeout(function () { if (c.el.parentNode) c.el.parentNode.removeChild(c.el); delete CHO[id]; }, nhan ? 1500 : 3000);
    if (!nhan) return;
    // gửi thẻ trận vào chat TRƯỚC khi rời trang (chờ tối đa 4 giây — mạng chậm thì vẫn vào trận)
    var guiXong = Promise.resolve().then(function () { return c.gui({ loai: 'td', id: id }, c.chu); })['catch'](function (e) { console.warn('[thách đấu] chưa gửi được thẻ vào chat', e); });
    Promise.race([guiXong, new Promise(function (r) { setTimeout(r, 4000); })]).then(function () { if (c.vao) moTran(id); });
  }

  // một nhịp mỗi giây: số giây còn lại + vạch của thẻ đang chờ (sửa tại chỗ — vẽ lại giữa cú bấm sẽ nuốt cú bấm)
  setInterval(function () {
    Object.keys(TRAN).forEach(function (id) {
      var t = TRAN[id]; if (!t || t.trangThai !== 'moi') return;
      var con = Math.max(0, Math.ceil(((t.het || 0) - Date.now()) / 1000));
      var c = CHO[id];
      if (c && !c.xong) {
        c.el.querySelectorAll('.td-con').forEach(function (s) { s.textContent = con; });
        var vc = c.el.querySelector('.va i'); if (vc) vc.style.width = (con / 60 * 100) + '%';
        if (Date.now() - (t.het || 0) > 3000) xongCho(id, { trangThai: 'het' });   // hết hạn (chờ thêm 3 giây phòng bạn bấm Nhận đúng giây cuối)
      }
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

  // ============================================================
  // ⭐ v1.375.0 (19/10/2026, thầy) — GIỚI HẠN CHƠI: window.GioiHan (dùng chung: hộp ⚔, nw/js/thachdau.js, nw/js/giaidau.js, nw/js/tran.js)
  //   Thầy chốt: nghỉ đêm 23:00→6:00 giờ VN (nhắc 22:45) · 20 trận/ngày (giải + giao hữu em–em) · giải chỉ TÍNH ĐIỂM 10 trận đầu/ngày
  //   + 3 trận/cặp/ngày · trận có thầy tự do · Luyện tập với máy không đếm, chỉ nghỉ đêm. Cài đặt `caiDat/choiGame` (thầy sửa ở trang Giải đấu).
  //   Chặn THẬT ở luật Firestore + hàm tdDoi (trangThai 'han'); ở đây chỉ BÁO TRƯỚC cho em (đồng hồ máy em lệch thì máy chủ vẫn chặn).
  // ============================================================
  var GH = window.GioiHan = {};
  GH.MAC = { bat: true, nghiTu: 23, nghiDen: 6, tranNgay: 20, giaiNgay: 10, capNgay: 3 };
  GH.cai = Object.assign({}, GH.MAC);
  var _ghCai = null;
  GH.napCai = function (moi) {
    if (_ghCai && !moi) return _ghCai;
    if (banThu()) return (_ghCai = Promise.resolve(GH.cai));
    _ghCai = kho().then(function (f) { return f.fs.getDoc(f.fs.doc(f.db, 'caiDat', 'choiGame')); })
      .then(function (s) { GH.cai = Object.assign({}, GH.MAC, s.exists() ? s.data() : {}); return GH.cai; })['catch'](function () { return GH.cai; });
    return _ghCai;
  };
  var VN_MS = 7 * 36e5;
  GH.ngay = function (ms) { return Math.floor(((ms || Date.now()) + VN_MS) / 864e5); };
  GH.dem = function (ms) {
    var c = GH.cai; if (!c.bat) return false;
    var d = new Date((ms || Date.now()) + VN_MS), h = d.getUTCHours() + d.getUTCMinutes() / 60;   // 27/10: giờ nghỉ có phút (22.5 = 22:30)
    return c.nghiTu > c.nghiDen ? (h >= c.nghiTu || h < c.nghiDen) : (h >= c.nghiTu && h < c.nghiDen);
  };
  // mốc h:00 giờ VN SẮP TỚI (ms)
  function mocGio(h) { var bay = Date.now(), d = Math.floor((bay + VN_MS) / 864e5) * 864e5 - VN_MS + h * 36e5; while (d <= bay) d += 864e5; return d; }
  GH.moLuc = function () { return mocGio(GH.cai.nghiDen); };   // lúc mở lại (6:00 sắp tới)
  // còn bao nhiêu PHÚT tới giờ nghỉ (chỉ khi ≤ 15 phút và chưa nghỉ) — 0 = không nhắc
  GH.sapNghi = function () {
    if (!GH.cai.bat || GH.dem()) return 0;
    var con = mocGio(GH.cai.nghiTu) - Date.now();
    return con > 0 && con <= 15 * 6e4 ? Math.ceil(con / 6e4) : 0;
  };
  GH.gioChu = function (h) { var p = Math.round((+h || 0) * 60); return hai(Math.floor(p / 60) % 24) + ':' + hai(p % 60); };
  // phiếu đếm HÔM NAY của một em (tdHan/{uid}, máy chủ ghi) ⇒ { so, giai{id:n}, cap{uid:n} }
  GH.phieu = function (uid) {
    var rong = { so: 0, giai: {}, cap: {} };
    if (!uid || banThu()) return Promise.resolve(rong);
    return kho().then(function (f) { return f.fs.getDoc(f.fs.doc(f.db, 'tdHan', uid)); })
      .then(function (s) { var x = s.exists() ? s.data() : {}; return x.ngay === GH.ngay() ? { so: x.so || 0, giai: x.giai || {}, cap: x.cap || {} } : rong; })['catch'](function () { return rong; });
  };
  GH.conTran = function (p) { return Math.max(0, GH.cai.tranNgay - ((p && p.so) || 0)); };
  GH.conGiai = function (p, giai) { return Math.max(0, GH.cai.giaiNgay - (((p && p.giai) || {})[giai] || 0)); };
  GH.capDu = function (p, uid) { return (((p && p.cap) || {})[uid] || 0) >= GH.cai.capNgay; };
  // vì sao không mời được: '' = mời được · 'dem' = giờ nghỉ đêm (gọi GH.hopNgu) · còn lại = câu báo. ban = { uid, ten }
  GH.chanMoi = async function (meUid, ban) {
    await GH.napCai();
    if (GH.dem()) return 'dem';
    var r = await Promise.all([GH.phieu(meUid), GH.phieu(ban && ban.uid)]);
    if (!GH.conTran(r[0])) return 'Hôm nay em đã chơi đủ ' + GH.cai.tranNgay + ' trận rồi. Nghỉ ngơi, mai đấu tiếp nhé!';
    if (!GH.conTran(r[1])) return ((ban && ban.ten) || 'Bạn') + ' hôm nay đã chơi đủ ' + GH.cai.tranNgay + ' trận rồi — em mời bạn khác nhé.';
    return '';
  };
  // em bấm Nhận trận em–em: '' = được · 'dem' · câu báo
  GH.chanNhan = async function (meUid) {
    await GH.napCai();
    if (GH.dem()) return 'dem';
    return GH.conTran(await GH.phieu(meUid)) ? '' : 'Hôm nay em đã chơi đủ ' + GH.cai.tranNgay + ' trận rồi. Nghỉ ngơi, mai đấu tiếp nhé!';
  };
  GH.chanNhanToi = async function () { var me = await toi(); return !me.uid || me.laThay ? '' : GH.chanNhan(me.uid); };
  // ============================================================
  // ⭐ v1.415.0 (24/10/2026, thầy) — QUẢN LÝ THÁCH ĐẤU: window.TdQuan (thay công tắc cứng GH.ghDong của v1.414.0)
  //   Thầy chỉnh ở dashboard, mục "Quản lý thách đấu" (js/td-ql.js) ⇒ tài liệu nwCauHinh/thachDau (luật có sẵn: em đăng nhập đọc, thầy ghi):
  //   { tro: { <mã trò>: { <chế độ>: { che:'bat'|'tat'|'hen', tu, den (ms, 0 = không giới hạn), lops:[mã lớp] ([] = mọi lớp), nhan } } },
  //     chan: { <uid>: { ten, lop, tro: { <mã trò>: [chế độ…] }, den (0 = tới khi thầy mở), ly, luc } }, capNhat }
  //   Chỉ chặn ở MÁY EM (thầy chốt: không đổi luật — "chỉ cần học sinh không tự mở tự chơi được"). Thầy luôn tự do; THẦY mời em ⇒ em Nhận được.
  //   Thêm trò chơi mới ⇒ thêm vào TdQuan.TRO + gọi TdQuan.kiem('<mã trò>:<chế độ>', …) ở chỗ em bắt đầu chơi.
  // ============================================================
  var TQ = window.TdQuan = {};
  TQ.TRO = [
    { ma: 'ass', ten: 'A Show Speed', che: [
      { ma: 'gh', ten: 'Giao hữu', mo: 'Em mời bạn / mời thầy đấu, không tính điểm' },
      { ma: 'giai', ten: 'Đấu giải', mo: 'Trận tính điểm trong giải đang mở của lớp' },
      { ma: 'luyen', ten: 'Luyện tập', mo: 'Chơi với máy, không tính điểm' },
      // ⭐ 25/10/2026 — XẾP HẠNG THEO MÙA (nw/xephang.html): giờ mở/đóng chính là ngày mùa thầy đặt; ở đây chỉ để TẠM ĐÓNG cho lớp / chặn từng em
      { ma: 'xh', ten: 'Xếp hạng', mo: 'Đấu xếp hạng theo mùa với các bạn mọi lớp' }] }
  ];
  TQ.CHU_DONG = {
    gh: 'Thời gian mở giao hữu đã hết, em hãy đợi thầy Andrew mở trong mùa sau nhé!',
    giai: 'Đấu giải đang tạm đóng, em hãy đợi thầy Andrew mở nhé!',
    luyen: 'Luyện tập đang tạm đóng, em hãy đợi thầy Andrew mở nhé!',
    xh: 'Xếp hạng đang tạm đóng, em hãy đợi thầy Andrew mở nhé!'
  };
  // mặc định khi thầy chưa lưu lần nào = đúng trạng thái v1.414.0 (giao hữu đóng, giải + luyện tập mở) + xếp hạng mở (ngày mùa tự quyết)
  TQ.MAC = function () { return { tro: { ass: { gh: { che: 'tat' }, giai: { che: 'bat' }, luyen: { che: 'bat' }, xh: { che: 'bat' } } }, chan: {} }; };
  TQ.KHOA_THU = 'tdQuanThu';   // bàn thử: cài đặt nằm ở localStorage (dashboard bàn thử + trang ?thu=1 cùng đọc)
  var _tq = null, _tqLuc = 0;
  TQ.nap = function (moi) {
    if (_tq && !moi && Date.now() - _tqLuc < 60000) return _tq;
    _tqLuc = Date.now();
    var gop = function (x) { var c = TQ.MAC(); x = x || {}; Object.keys(x.tro || {}).forEach(function (k) { c.tro[k] = Object.assign({}, c.tro[k] || {}, x.tro[k]); }); c.chan = x.chan || {}; c.capNhat = x.capNhat || 0; return c; };
    if (banThu() || TQ.thuLocal) { var x = null; try { x = JSON.parse(localStorage.getItem(TQ.KHOA_THU) || 'null'); } catch (e) { } return (_tq = Promise.resolve(gop(x))); }
    _tq = kho().then(function (f) { return f.fs.getDoc(f.fs.doc(f.db, 'nwCauHinh', 'thachDau')); })
      .then(function (s) { return gop(s.exists() ? s.data() : null); })['catch'](function () { _tq = null; return gop(null); });
    return _tq;
  };
  TQ.cheTen = function (tro, che) {
    var t = TQ.TRO.filter(function (x) { return x.ma === tro; })[0], c = t && t.che.filter(function (x) { return x.ma === che; })[0];
    return c ? c.ten : che;
  };
  var ngayGio = function (ms) { var d = new Date(ms); return hai(d.getHours()) + ':' + hai(d.getMinutes()) + ' ngày ' + d.getDate() + '/' + (d.getMonth() + 1); };
  TQ.ngayGio = ngayGio;
  // một chế độ ĐANG mở không (bỏ qua lớp) ⇒ { mo, sap (ms mở lúc nào nếu hẹn chưa tới), het (ms tự đóng nếu hẹn) }
  TQ.trangThai = function (m, bay) {
    bay = bay || Date.now(); m = m || {};
    if (m.che === 'tat') return { mo: false };
    if (m.che === 'hen') {
      var tu = +m.tu || 0, den = +m.den || 0;
      if (tu && bay < tu) return { mo: false, sap: tu };
      if (den && bay >= den) return { mo: false, qua: den };
      return { mo: true, het: den };
    }
    return { mo: true };
  };
  // em có đang bị thầy chặn chế độ này không ⇒ mục chặn | null (hết hạn ⇒ coi như không)
  TQ.biChan = function (c, uid, tro, che) {
    var x = uid && c.chan && c.chan[uid]; if (!x) return null;
    if (x.den && Date.now() >= x.den) return null;
    var ds = (x.tro || {})[tro]; return ds && ds.indexOf(che) >= 0 ? x : null;
  };
  async function lopCuaEm(f, uid) {
    if (!f || !uid) return [];
    try { var s = await f.fs.getDoc(f.fs.doc(f.db, 'nwUsers', uid)), x = s.exists() ? s.data() : {}; return (x.cacLop || []).concat(x.lop ? [x.lop] : []); } catch (e) { return []; }
  }
  // ⭐ CHỖ KIỂM DUY NHẤT: em (o.uid, o.lop) được chơi '<trò>:<chế độ>' không ⇒ '' = được · còn lại = câu báo. Thầy luôn ''.
  //   o = { uid, lop, laThay, ban: { uid, ten } (bạn được mời — bị thầy chặn thì cũng không mời được) }
  TQ.kiem = async function (ma, o) {
    o = o || {};
    if (o.laThay) return '';
    var p = String(ma).split(':'), tro = p[1] ? p[0] : 'ass', che = p[1] || p[0];
    var c = await TQ.nap(), m = (c.tro[tro] || {})[che] || {}, ten = TQ.cheTen(tro, che);
    var ch = TQ.biChan(c, o.uid, tro, che);
    if (ch) return 'Thầy Andrew đang tạm khoá ' + ten + ' của em' + (ch.den ? ' đến ' + ngayGio(ch.den) : '') + '.' + (ch.ly ? ' Lý do: ' + ch.ly : '');
    var tt = TQ.trangThai(m);
    if (!tt.mo) return (m.nhan || TQ.CHU_DONG[che] || ten + ' đang tạm đóng.') + (tt.sap ? ' (' + ten + ' mở lúc ' + ngayGio(tt.sap) + '.)' : '');
    if (m.lops && m.lops.length) {
      var lops = o.lop ? [o.lop] : (banThu() ? [] : await lopCuaEm(await kho().catch(function () { return null; }), o.uid));
      if (!lops.some(function (l) { return m.lops.indexOf(l) >= 0; })) return ten + ' chưa mở cho lớp của em' + (m.nhan ? '. ' + m.nhan : ', em hãy đợi thầy Andrew mở nhé!');
    }
    if (o.ban && o.ban.uid && TQ.biChan(c, o.ban.uid, tro, che)) return (o.ban.ten || 'Bạn') + ' đang bị tạm khoá ' + ten + ' — em mời bạn khác nhé.';
    return '';
  };
  // hộp báo đóng / bị khoá (khuôn hộp đi ngủ). che = mã chế độ (tiêu đề)
  var _tqHop = null;
  TQ.hop = function (chu, che) {
    ghCss();
    if (_tqHop) return;
    var ten = TQ.cheTen('ass', che || 'gh'), khoa = /tạm khoá/.test(chu);
    var nen = document.createElement('div'); nen.className = 'gh-nen'; nen.setAttribute('role', 'dialog'); nen.setAttribute('aria-label', ten + ' tạm đóng');
    nen.innerHTML = '<div class="gh-hop"><div class="gh-trang">🔒</div><h3>' + an(khoa ? 'Em đang bị tạm khoá' : ten + ' đã đóng') + '</h3><p>' + an(chu) + '</p>' +
      '<button type="button" style="margin-top:14px">Em hiểu rồi</button></div>';
    document.body.appendChild(nen); _tqHop = nen;
    var dong = function () { if (nen.parentNode) nen.parentNode.removeChild(nen); _tqHop = null; };
    nen.querySelector('button').onclick = dong;
    nen.addEventListener('click', function (e) { if (e.target === nen) dong(); });
    try { nen.querySelector('button').focus(); } catch (e) { }
  };
  // kiểm + báo trong một lệnh: true = được chơi
  TQ.cho = async function (ma, o) { var chu = await TQ.kiem(ma, o); if (chu) { TQ.hop(chu, String(ma).split(':').pop()); return false; } return true; };
  // trận bị máy chủ chặn (trangThai 'han')
  GH.chuHan = function (t) {
    var ly = (t && t.ly) || '';
    if (ly === 'dem') return 'Đã tới giờ nghỉ đêm (' + GH.gioChu(GH.cai.nghiTu) + ' – ' + GH.gioChu(GH.cai.nghiDen) + ') — trận không bắt đầu. Đi ngủ thôi!';
    if (ly === 'hetA' || ly === 'hetB') return (ly === 'hetA' ? t.tenA : t.tenB) + ' hôm nay đã chơi đủ ' + GH.cai.tranNgay + ' trận — trận không bắt đầu.';
    return 'Trận không bắt đầu được (giới hạn chơi).';
  };
  function ghCss() {
    if (document.getElementById('ghCss')) return;
    var s = document.createElement('style'); s.id = 'ghCss';
    s.textContent =
      '.gh-nen{position:fixed;inset:0;z-index:10050;background:rgba(8,14,30,.62);display:grid;place-items:center;padding:16px;animation:gh-mo .25s ease}' +
      '@keyframes gh-mo{from{opacity:0}}' +
      '.gh-hop{width:min(380px,100%);border-radius:22px;padding:26px 22px 20px;text-align:center;color:#E8EEFF;font-family:var(--sans,"Segoe UI",system-ui,sans-serif);' +
      'background:radial-gradient(120% 90% at 50% 0%,#2B3A78 0%,#151C3D 55%,#0C1128 100%);box-shadow:0 24px 60px rgba(0,0,0,.45);border:1px solid rgba(160,180,255,.18)}' +
      '.gh-trang{font-size:52px;line-height:1;margin-bottom:10px;filter:drop-shadow(0 0 18px rgba(255,236,160,.45))}' +
      '.gh-hop h3{margin:0 0 8px;font-size:21px;font-weight:800;color:#fff}.gh-hop p{margin:0 0 6px;font-size:14px;line-height:1.5;color:#C3CCF0}.gh-hop p b{color:#fff}' +
      '.gh-dem{margin:14px 0 18px;font:800 30px/1 var(--sans,"Segoe UI",system-ui,sans-serif);letter-spacing:1px;color:#FFE7A0;font-variant-numeric:tabular-nums}' +
      '.gh-dem small{display:block;font-size:12px;font-weight:600;letter-spacing:0;color:#9AA6D6;margin-bottom:6px}' +
      '.gh-hop button{width:100%;height:44px;border:0;border-radius:14px;background:#FFE7A0;color:#1B2350;font-weight:800;font-size:15px;cursor:pointer}' +
      '.gh-nhac{display:flex;gap:8px;align-items:center;padding:9px 12px;border-radius:12px;background:#FFF4D6;color:#7A4B00;font-size:13px;font-weight:600;line-height:1.35;text-align:left}' +
      '.gh-nhac b{color:#5A3500}.gh-nhac.xam{background:#EEF2F1;color:#3F5150}.gh-nhac.xam b{color:#16232A}' +
      // trong hộp ⚔ (.td-hop b/span có kiểu riêng) ⇒ giữ chữ đậm trên cùng dòng
      '.gh-nhac>span{display:block!important;flex:1;min-width:0;margin:0!important}.gh-nhac>span b{display:inline!important;font-size:inherit!important;margin:0!important;font-weight:800}' +
      '.td-hop .gh-nhac{margin:8px 0 0;font-size:12.5px;padding:8px 11px}';
    document.head.appendChild(s);
  }
  GH.css = ghCss;
  // HỘP ĐI NGỦ: đếm ngược tới giờ mở lại
  var _ghHop = null;
  GH.hopNgu = function () {
    ghCss();
    if (_ghHop) return;
    var h = new Date(Date.now() + VN_MS).getUTCHours();
    var nen = document.createElement('div'); nen.className = 'gh-nen'; nen.setAttribute('role', 'dialog'); nen.setAttribute('aria-label', 'Giờ nghỉ đêm');
    nen.innerHTML = '<div class="gh-hop"><div class="gh-trang">🌙</div><h3>' + (h >= 12 ? 'Đã ' + h + ' giờ rồi — đi ngủ thôi!' : 'Còn sớm quá — ngủ thêm đi em!') + '</h3>' +
      '<p>Giải đấu, giao hữu và luyện tập nghỉ từ <b>' + GH.gioChu(GH.cai.nghiTu) + '</b> đến <b>' + GH.gioChu(GH.cai.nghiDen) + '</b> sáng để các em ngủ đủ giấc.</p>' +
      '<div class="gh-dem"><small>Mở lại sau</small><span data-gh-dem>' + tongGio(GH.moLuc() - Date.now()) + '</span></div><button type="button">Em đi ngủ đây 😴</button></div>';
    document.body.appendChild(nen); _ghHop = nen;
    var dong = function () { clearInterval(iv); if (nen.parentNode) nen.parentNode.removeChild(nen); _ghHop = null; };
    var iv = setInterval(function () { var e = nen.querySelector('[data-gh-dem]'); if (e) e.textContent = tongGio(GH.moLuc() - Date.now()); if (!GH.dem()) dong(); }, 1000);
    nen.querySelector('button').onclick = dong;
    nen.addEventListener('click', function (e) { if (e.target === nen) dong(); });
    try { nen.querySelector('button').focus(); } catch (e) { }
  };
  // dòng nhắc vàng "còn N phút nữa nghỉ đêm" ('' khi chưa tới 22:45)
  GH.nhacHtml = function () {
    var p = GH.sapNghi();
    return p ? '<div class="gh-nhac">⏰ <span>Còn <b>' + p + ' phút</b> nữa là ' + GH.gioChu(GH.cai.nghiTu) + ' — giải đấu nghỉ đêm. Đấu nốt rồi đi ngủ nhé!</span></div>' : '';
  };
  // một lời nhắc nổi mỗi ngày lúc 22:45 cho em ĐÃ ĐẤU hôm nay (mọi trang có tệp này; khung nhúng ?nhung=1 / ?hop=1 không hiện)
  (function nhacNoi() {
    if (window.parent !== window) return;
    var KHOA = 'ghNhac', da = function () { try { return localStorage.getItem(KHOA) === String(GH.ngay()); } catch (e) { return false; } };
    setInterval(async function () {
      if (document.hidden || banThu() || !GH.sapNghi() || da()) return;
      var me = await toi(); if (!me.uid || me.laThay) return;
      await GH.napCai(); var p = await GH.phieu(me.uid); if (!p.so || !GH.sapNghi() || da()) return;
      try { localStorage.setItem(KHOA, String(GH.ngay())); } catch (e) { }
      ghCss();
      var el = document.createElement('div'); el.className = 'gh-nhac'; el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;z-index:10040;left:50%;top:16px;transform:translateX(-50%);width:max-content;max-width:calc(100% - 32px);box-shadow:0 10px 30px rgba(0,0,0,.18)';
      el.innerHTML = GH.nhacHtml().replace(/^<div class="gh-nhac">|<\/div>$/g, '');
      document.body.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 12000);
    }, 30000);
  })();

  // ---------- hộp chọn bạn đang online ----------
  var hop = null;
  function dongHop() {
    if (hop && hop._iv) clearInterval(hop._iv);
    if (hop && hop._phim) document.removeEventListener('keydown', hop._phim, true);
    if (hop && hop.parentNode) hop.parentNode.removeChild(hop); hop = null;
  }
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
    s.forEach(function (d) { var x = d.data(); if (d.id !== uid && x.vaiTro !== 'gv' && x.vaiTro !== 'doi' && !x.nghiHoc && x.hoatDongLuc && bay - x.hoatDongLuc < ONLINE_MS) ds.push({ uid: d.id, ten: x.ten || '?', anh: x.anh || '' }); });
    return ds.sort(function (a, b) { return String(a.ten).localeCompare(String(b.ten), 'vi'); });
  }
  function mauBan() { return [{ uid: 'hs_1', ten: 'Gia Bảo' }, { uid: 'hs_2', ten: 'Bảo Nam' }, { uid: 'hs_3', ten: 'Thảo Vy' }]; }
  // ⭐ thầy giao hữu (16/10/2026) — học sinh thấy THẦY trong danh sách khi thầy đang online (đấu hai chiều)
  async function thayOnline(f) {
    if (banThu()) return [{ uid: 'gv', ten: 'Thầy Andrew', laThay: true }];
    try {
      var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'nwUsers'), f.fs.where('vaiTro', '==', 'gv'), f.fs.limit(3))), ds = [], bay = Date.now();
      s.forEach(function (d) { var x = d.data(); if (x.hoatDongLuc && bay - x.hoatDongLuc < ONLINE_MS) ds.push({ uid: d.id, ten: 'Thầy Andrew', laThay: true }); });
      return ds.slice(0, 1);
    } catch (e) { return []; }
  }
  async function dangOnline(f, uid) {
    if (banThu()) return uid !== 'hs_3';
    try { var s = await f.fs.getDoc(f.fs.doc(f.db, 'nwUsers', uid)); var x = s.exists() ? s.data() : {}; return !!(x.hoatDongLuc && Date.now() - x.hoatDongLuc < ONLINE_MS); } catch (e) { return false; }
  }

  // ⭐ v1.361.0 — ĐANG ĐẤU: người còn mở tab trận ghi tdDangDau/{uid} mỗi 30 giây (nw/js/tran.js) ⇒ { uid: 1 }
  async function dsDangDau(f) {
    if (banThu()) return { hs_2: 1 };
    try {
      var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'tdDangDau'), f.fs.where('luc', '>', Date.now() - 75000), f.fs.limit(200))), r = {};
      s.forEach(function (d) { r[d.id] = 1; });
      return r;
    } catch (e) { return {}; }
  }
  // ---------- CÁCH ĐẤU của thầy (nhớ lần chọn trước trên máy này) ----------
  var CAI_KHOA = 'tdThayCai';
  function caiDoc() {
    var c = { che: '', lv: 'easy', phut: 2, bo: null };
    try { Object.assign(c, JSON.parse(localStorage.getItem(CAI_KHOA) || '{}')); } catch (e) { }
    return c;
  }
  function caiLuu(c) { try { localStorage.setItem(CAI_KHOA, JSON.stringify(c)); } catch (e) { } }
  // bộ từ = act WORDS trong thư viện AWord của thầy (như hộp tạo giải). Bàn thử: bộ mẫu.
  var _boDs = null;
  async function dsBo(f) {
    if (_boDs) return _boDs;
    if (banThu()) return (_boDs = [{ id: 'a1', ten: 'FRUITS / WORDS', so: 12 }, { id: 'a2', ten: '7 JOB / WORDS', so: 12 }, { id: 'a3', ten: '1 BODY PARTS / WORDS', so: 10 }]);
    try {
      var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'users', AW_UID, 'items'), f.fs.where('kind', '==', 'act'))), ds = [];
      s.forEach(function (d) { var a = d.data(), it = a.content && a.content.items; if (Array.isArray(it) && it.length && it.every(function (x) { return x && x.word; })) ds.push({ id: d.id, ten: a.title || '(không tên)', so: it.length }); });
      return (_boDs = ds.sort(function (a, b) { return String(a.ten).localeCompare(String(b.ten), 'vi', { numeric: true }); }));
    } catch (e) { return []; }
  }
  var AW_UID = 'tpD5VivTD6g4NVceix4Zf3Ibefp1';
  function caiHtml(c, bo) {
    var chip = function (k, v, chu) { return '<button type="button" data-cai="' + k + '" data-v="' + v + '"' + (String(c[k]) === String(v) ? ' class="on"' : '') + '>' + chu + '</button>'; };
    var dong2 = !c.che
      ? '<div class="h"><em>Độ khó</em><span class="chips">' + chip('lv', 'easy', 'Easy') + chip('lv', 'medium', 'Medium') + chip('lv', 'hard', 'Hard') + '</span></div>'
      : '<div class="h"><em>Bộ từ</em><select data-cai-bo aria-label="Bộ từ">' + (bo.length ? bo.map(function (b) { return '<option value="' + an(b.id) + '"' + (c.bo && c.bo.id === b.id ? ' selected' : '') + '>' + an(b.ten) + ' (' + b.so + ' từ)</option>'; }).join('') : '<option value="">Chưa tải được bộ từ</option>') + '</select></div>';
    return '<div class="td-cai"><div class="h"><em>Cách đấu</em><span class="chips">' + chip('che', '', '16 chữ') + chip('che', 'one', 'One word') + chip('che', 'list', 'Word list') + chip('che', 'free', 'Free words') + '</span></div>' +
      dong2 + '<div class="h"><em>Thời gian</em><span class="chips">' + chip('phut', 2, '2 phút') + chip('phut', 3, '3 phút') + chip('phut', 5, '5 phút') + '</span></div></div>';
  }
  // gắn sự kiện phần cách đấu: đổi ⇒ lưu + vẽ lại đúng phần đó
  function lapCai(el, c, bo) {
    var ve = function () { var cu = el.querySelector('.td-cai'); cu.outerHTML = caiHtml(c, bo); lap(); };
    var lap = function () {
      el.querySelectorAll('[data-cai]').forEach(function (b) {
        b.onclick = function () { var k = b.getAttribute('data-cai'), v = b.getAttribute('data-v'); c[k] = k === 'phut' ? +v : v; if (k === 'che' && v && !c.bo && bo[0]) c.bo = { id: bo[0].id, ten: bo[0].ten }; caiLuu(c); ve(); };
      });
      var s = el.querySelector('[data-cai-bo]');
      if (s) { if (!c.bo && bo[0]) { c.bo = { id: bo[0].id, ten: bo[0].ten }; caiLuu(c); } s.onchange = function () { var b = bo.filter(function (x) { return x.id === s.value; })[0]; c.bo = b ? { id: b.id, ten: b.ten } : null; caiLuu(c); }; }
    };
    lap();
  }
  function moTa(c) { return c.che ? (CHE_TEN[c.che] || '') + (c.bo ? ' · ' + c.bo.ten : '') : (LV_TEN[c.lv] || 'Easy'); }

  // ---------- TẠO TRẬN (mọi đường mời: nhóm lớp, phòng riêng, thầy ↔ em) ----------
  // o = { me, ban, lop, giai, phut, lv, cai (thầy mời), gv (uid thầy nếu trận có thầy), gui, baoLoi }
  var THU_SIM = {};   // bàn thử: id trận giả → hàm bấm (Nhận / Từ chối / Huỷ)
  async function taoTran(o) {
    var me = o.me, ban = o.ban, cai = o.cai || null;
    // ⭐ v1.415.0 — Quản lý thách đấu (TdQuan): lưới cuối cho mọi đường mời của em (chế độ đóng / hẹn giờ / lớp / em hoặc bạn bị chặn)
    if (!me.laThay) { var cheM = o.giai ? 'giai' : 'gh', cam = await TQ.kiem(cheM, { uid: me.uid, lop: o.lop || me.lop, ban: ban.laThay ? null : ban }); if (cam) return TQ.hop(cam, cheM); }
    var chu ='⚔ ' + (me.laThay ? 'Thầy Andrew' : me.ten) + (o.gv ? ' mời ' + (ban.laThay ? 'thầy' : ban.ten) + ' giao hữu' : ' thách đấu ' + ban.ten);
    var data = { a: me.uid, b: ban.uid, nguoi: [me.uid, ban.uid], tenA: me.laThay ? 'Thầy Andrew' : me.ten, tenB: ban.laThay ? 'Thầy Andrew' : ban.ten,
      lop: o.lop, giai: o.giai || '', phut: o.phut, lv: o.lv, trangThai: 'moi', taoLuc: Date.now(), het: Date.now() + 60000 };
    if (o.gv) { data.gv = o.gv; if (cai) data.cai = { che: cai.che || '', boId: cai.bo ? cai.bo.id : '', boTen: cai.bo ? cai.bo.ten : '' }; }
    if (banThu()) {
      // bàn thử: trận giả chạy hết vòng trong vài giây (chờ nhận → đang đấu → kết quả) để xem thẻ đổi trạng thái
      var id = 'thu' + Date.now();
      TRAN[id] = data; NGHE[id] = 1;
      var buoc = function (doi) { Object.assign(TRAN[id], doi); veId(id); if (TRAN[id].trangThai !== 'moi') xongCho(id, TRAN[id]); };
      THU_SIM[id] = function (viec) {
        if (viec === 'huy') return buoc({ trangThai: 'huy' });
        if (viec === 'khong') return buoc({ trangThai: 'tuchoi' });
        if (viec === 'nhan') { buoc({ trangThai: 'choi', diem: { a: 0, b: 0 } }); setTimeout(function () { buoc({ diem: { a: 4, b: 6 } }); }, 3000); setTimeout(function () { buoc({ trangThai: 'xong', diem: { a: 9, b: 12 }, kq: { a: 'thua', b: 'thang' } }); }, 7000); }
      };
      moCho(id, o, chu, false);
      if (o.baoLoi) o.baoLoi('Bàn thử: 5 giây nữa ' + (ban.laThay ? 'thầy' : ban.ten) + ' bấm Nhận' + (me.laThay ? ' · trận thật mở ở TAB MỚI' : ''));
      setTimeout(function () { if (TRAN[id].trangThai === 'moi') THU_SIM[id]('nhan'); }, 5000);
      return;
    }
    // ⭐ v1.375.0 — giới hạn chơi (trận em–em): nghỉ đêm ⇒ hộp đi ngủ · em / bạn đã đủ trận hôm nay ⇒ báo
    if (!o.gv && !me.laThay) {
      var ch = await GH.chanMoi(me.uid, ban);
      if (ch === 'dem') return GH.hopNgu();
      if (ch) { if (o.baoLoi) o.baoLoi(ch); return; }
    }
    // thầy: mở TAB MỚI ngay trong cú bấm, TRƯỚC mọi lượt chờ (trình duyệt chặn tab mở muộn) — trang trận tự chờ em nhận rồi vào trận
    var tab = me.laThay ? moTabTrong() : null;
    try {
      var f = await kho();
      // phòng riêng: chưa biết lớp của em ⇒ lấy lớp chính trong hồ sơ em (luật: em phải học lớp của trận)
      if (!data.lop) {
        var sHs = await f.fs.getDoc(f.fs.doc(f.db, 'nwUsers', me.laThay ? ban.uid : me.uid)), x = sHs.exists() ? sHs.data() : {};
        data.lop = x.lop || (x.cacLop || [])[0] || '';
        if (!data.lop) throw new Error('Chưa biết lớp của ' + (me.laThay ? ban.ten : 'em') + ' — thầy mời từ nhóm chat lớp nhé.');
      }
      var ref = f.fs.doc(f.fs.collection(f.db, 'tranDau'));
      await f.fs.setDoc(ref, data);
      if (tab) tab.location.href = urlTran(ref.id);
      // ⭐ v1.402.0 — KHÔNG gửi thẻ vào chat lúc mời: thẻ chờ ở góc màn, bạn nhận mới gửi (xongCho). Thầy đã có tab trận ⇒ không tự vào.
      moCho(ref.id, o, chu, !tab); nghe(ref.id);
    } catch (e) {
      if (tab) tab.close();
      var ma = String((e && (e.code || e.message)) || '');
      if (o.baoLoi) o.baoLoi(ma.indexOf('permission') >= 0 ? 'Chưa mời được: giải đã đóng, bạn không cùng lớp, đã hết lượt chơi hôm nay, hoặc đồng hồ máy em bị lệch.' : e);
    }
  }

  // ---------- ⭐ v1.372.0 — HỘP ⚔ ở NHÓM LỚP: menu 2 bước (mẫu thầy chốt: D:\OTHERS\CLAUDE\GIAI DAU THE - thiet ke\mau-v9-chat-dau, phương án A) ----------
  // Bước 1 (menu): thẻ neon "Đấu giải" + hai thẻ nhỏ "Giao hữu" (amber) · "Luyện tập" (xanh dương).
  //   HỌC SINH + lớp có giải ĐANG MỞ ⇒ Đấu giải sáng ⇒ bước 2 danh sách bạn (trận tính giải) · giải sắp mở / chưa có ⇒ thẻ MỜ + lý do · THẦY ⇒ MỜ "Thầy không tham gia giải đấu".
  //   Giao hữu: học sinh ⇒ danh sách bạn + hàng Thầy (2 phút Easy, không điểm) · THẦY ⇒ cách đấu (caiHtml) + em đang online, mở trận ở TAB MỚI như cũ.
  //   Luyện tập: chơi với MÁY, không điểm, không ghi gì ⇒ nw/tran.html?luyen=1&may=&phut=&bo=&giai=&lop= (chế độ LUYEN của nw/js/tran.js).
  var LT_KHOA = 'tdLuyenCai';
  function ltDoc() { var c = { may: 2, phut: 2, bo: 'n' }; try { Object.assign(c, JSON.parse(localStorage.getItem(LT_KHOA) || '{}')); } catch (e) { } return c; }
  function ltLuu(c) { try { localStorage.setItem(LT_KHOA, JSON.stringify(c)); } catch (e) { } }
  function tongGio(ms) { ms = Math.max(0, ms); return hai(Math.floor(ms / 36e5)) + ':' + hai(Math.floor(ms % 36e5 / 6e4)) + ':' + hai(Math.floor(ms % 6e4 / 1e3)); }
  var HI = function (d) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; };
  var HIC = {
    cup: HI('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/>'),
    kiem: HI('<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>'),
    ban: HI('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
    muc: HI('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
    khoa: HI('<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
    lui: HI('<path d="m15 18-6-6 6-6"/>'),
    play: HI('<path d="M6 3l14 9-14 9z"/>')
  };
  function napFontHop() {
    if (document.getElementById('tdFont') || document.getElementById('tgFont')) return;
    var l = document.createElement('link'); l.id = 'tdFont'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800;1,900&display=swap';
    document.head.appendChild(l);
  }
  // giải của lớp: đang mở + giải SẮP mở gần nhất (thầy/em cùng một nguồn với dải ghim)
  async function giaiHop(f, lop) {
    var bay = Date.now();
    if (banThu()) {
      var tt = (new URLSearchParams(location.search).get('tt')) || 'dang';
      if (tt === 'none') return { g: null, sap: null };
      var G0 = { id: 'm3', ten: 'Speed Cup Mùa 1', lops: [lop], phut: 2, lv: 'easy', sao: [30, 20, 10], bo: { ten: '7 JOB / WORDS', che: 'free' } };
      return tt === 'sap' ? { g: null, sap: Object.assign(G0, { tu: bay + 27 * 36e5, den: bay + 5 * 864e5 }) } : { g: Object.assign(G0, { tu: bay - 4 * 36e5, den: bay + 2 * 864e5 + 5 * 36e5 + 12 * 6e4 + 9e3 }), sap: null };
    }
    try {
      var ds = await giaiCuaLop(f, lop).then(function (x) { return x.filter(function (y) { return !y.dong; }); });
      return { g: ds.filter(function (x) { return x.tu <= bay && bay < x.den; })[0] || null,
        sap: ds.filter(function (x) { return x.tu > bay; }).sort(function (a, b) { return a.tu - b.tu; })[0] || null };
    } catch (e) { return { g: null, sap: null }; }
  }
  // ⭐ 26/10/2026 — XẾP HẠNG THẾ GIỚI: mùa hiện tại + điểm hạng của em (caiDat/xepHang · xhMua/{mua} · xhMua/{mua}/em/{uid}; luật tools/dang-luat-xep-hang.js)
  async function xhCuaEm(f, uid) {
    var bay = Date.now();
    if (banThu()) {
      var k = new URLSearchParams(location.search).get('xh') || 'xl';
      var M0 = { ten: 'Mùa 2', tu: k === 'sap' ? bay + 9 * 36e5 : bay - 864e5, den: bay + 28 * 864e5, tt: 'mo', gioVang: { tu: 1170, den: 1260, nhan: 1.5 } };
      return { mua: 'thu', M: M0, em: k === 'hang' ? { xl: 5, diem: 764, hang: 47 } : { xl: 2 } };
    }
    try {
      var c = await f.fs.getDoc(f.fs.doc(f.db, 'caiDat', 'xepHang')), mua = c.exists() ? String(c.data().mua || '') : '';
      if (!mua) return null;
      var m = await f.fs.getDoc(f.fs.doc(f.db, 'xhMua', mua)); if (!m.exists()) return null;
      var em = null;
      if (uid) { try { var e = await f.fs.getDoc(f.fs.doc(f.db, 'xhMua', mua, 'em', uid)); em = e.exists() ? e.data() : null; } catch (x) { em = null; } }
      return { mua: mua, M: m.data(), em: em };
    } catch (e) { return null; }
  }
  // huy hiệu hạng nhỏ (khiên) — cùng hình với nw/js/xh-chung.js
  var XH_MAU = { an: ['#5E8574', '#2B4A3C', '#13261D'], dong: ['#E7A16B', '#8A4B22', '#5B2E12'], bac: ['#EEF3F7', '#9AA7B4', '#56616E'], vang: ['#FFE08A', '#F0A91E', '#8F5A00'],
    bk: ['#B7FFF0', '#2CC9B0', '#0B6B63'], kc: ['#C8E6FF', '#4DA3FF', '#1E3FA8'], ct: ['#E5C9FF', '#A35CFF', '#4B1C8F'], ht: ['#FFD3D8', '#FF4D6A', '#7A0C22'] };
  var XH_TEN = { dong: 'Đồng', bac: 'Bạc', vang: 'Vàng', bk: 'Bạch kim', kc: 'Kim cương', ct: 'Cao thủ', ht: 'Huyền thoại' };
  var _xhId = 0;
  function xhHh(ma) {
    var h = XH_MAU[ma] || XH_MAU.an, id = 'tdxh' + (++_xhId);
    return '<svg class="td-hh" viewBox="0 0 100 110" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + h[0] + '"/><stop offset=".55" stop-color="' + h[1] + '"/><stop offset="1" stop-color="' + h[2] + '"/></linearGradient></defs>' +
      '<path d="M50 8 88 24v34c0 24-17 40-38 46C29 98 12 82 12 58V24Z" fill="url(#' + id + ')" stroke="' + h[2] + '" stroke-width="3"/>' +
      '<path d="M50 20 76 31v26c0 17-12 29-26 34-14-5-26-17-26-34V31Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>' +
      (ma === 'an' ? '<text x="50" y="68" text-anchor="middle" font-family="Arial" font-weight="800" font-size="40" fill="rgba(255,255,255,.85)">?</text>' : '<path d="M50 36l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" fill="rgba(255,255,255,.9)"/>') + '</svg>';
  }
  // 26/10 SUẤT: Đồng/Bạc/Vàng theo điểm (Vàng từ 800) · Bạch kim → Huyền thoại = suất s do máy chủ ghi (cùng luật nw/js/xh-chung.js)
  function xhHang(d, s) {
    if (s === true) s = 'ht';
    if (s === 'ht' || s === 'ct' || s === 'kc' || s === 'bk') return { ma: s, ten: XH_TEN[s], trong: null };
    var ds = [['dong', 0], ['bac', 300], ['vang', 800]], ma = 'dong', goc = 0;
    ds.forEach(function (x) { if (d >= x[1]) { ma = x[0]; goc = x[1]; } });
    var bac = ['III', 'II', 'I'][Math.min(2, Math.floor((d - goc) / 100))];
    return { ma: ma, ten: XH_TEN[ma] + ' ' + bac, trong: ma === 'vang' && d >= 1000 ? null : d - Math.floor(d / 100) * 100 };
  }
  // hạng + điểm của em trong giải (cùng luật xếp hạng với dải ghim)
  async function hangEm(f, g, lop, uid) {
    if (banThu()) return { hang: 2, diem: 7 };
    try {
      var s = await f.fs.getDoc(f.fs.doc(f.db, 'giaiDau', g.id, 'bang', lop)), em = s.exists() ? (s.data().em || {}) : {};
      var ds = Object.keys(em).map(function (u) { var r = em[u] || {}; return { uid: u, ten: r.ten || '', t: r.t || 0, h: r.h || 0, b: r.b || 0, d: (r.t || 0) * 2 + (r.h || 0) }; })
        .filter(function (x) { return x.t + x.h + x.b > 0; })
        .sort(function (a, b) { return b.d - a.d || b.t - a.t || (a.t + a.h + a.b) - (b.t + b.h + b.b) || String(a.ten).localeCompare(String(b.ten), 'vi'); });
      var vt = -1; ds.forEach(function (x, i) { if (x.uid === uid) vt = i; });
      return vt >= 0 ? { hang: vt + 1, diem: ds[vt].d } : { hang: 0, diem: 0 };
    } catch (e) { return { hang: 0, diem: 0 }; }
  }
  async function TheTD_moChon(nut, lop, gui, baoLoi) {
    if (hop) return dongHop();
    napCss(); napFontHop();
    hop = document.createElement('div'); hop.className = 'td-chon td-hop'; hop.setAttribute('role', 'dialog'); hop.setAttribute('aria-label', 'Đấu A Show Speed');
    hop.innerHTML = '<div class="td-ph"><b>Đấu A Show Speed</b></div><div class="td-rongtt">Đang tải…</div>';
    document.body.appendChild(hop); datViTri(hop, nut);
    var el = hop, me = await toi(), f = null;
    // ⭐ v1.375.0 — giờ nghỉ đêm: học sinh mở ⚔ ⇒ hộp đi ngủ (thầy tự do)
    if (!me.laThay) { await GH.napCai(); if (GH.dem()) { if (hop === el) dongHop(); return GH.hopNgu(); } }
    var S = { me: me, lop: lop, step: 'menu', g: null, sap: null, ds: [], bo: [], c: me.laThay ? caiDoc() : null, lt: ltDoc(), hang: 0, diem: 0, ghi: '', ph: null, kq: {} };
    el._phim = function (e) {
      if (e.key === 'Escape') { dongHop(); try { nut.focus(); } catch (x) { } }
    };
    document.addEventListener('keydown', el._phim, true);
    try {
      if (!banThu()) f = await kho();
      var r = await Promise.all([giaiHop(f, lop), me.laThay ? (banThu() ? mauBan() : banOnline(f, lop, me.uid)) : (banThu() ? Promise.resolve(mauBan()) : banOnline(f, lop, me.uid)),
        me.laThay ? dsBo(f) : [], dsDangDau(f), me.laThay ? [] : thayOnline(f)]);
      S.g = r[0].g; S.sap = r[0].sap; S.bo = r[2];
      var dd = r[3];
      S.ds = r[1]; S.thay = r[4];
      S.ds.concat(S.thay).forEach(function (x) { x.dangDau = !!dd[x.uid]; if (x.anh) ANH[x.uid] = x.anh; });
      if (S.g && !me.laThay) { var h = await hangEm(f, S.g, lop, me.uid); S.hang = h.hang; S.diem = h.diem; }
      S.xh = await xhCuaEm(f, me.laThay ? '' : me.uid);   // ⭐ 26/10 xếp hạng thế giới
      // ⭐ v1.375.0 — phiếu đếm hôm nay của em + từng bạn đang online (bạn đủ trận ⇒ nút Mời tắt)
      if (!me.laThay) {
        var phs = await Promise.all([GH.phieu(me.uid)].concat(S.ds.map(function (x) { return GH.phieu(x.uid); })));
        S.ph = phs[0]; S.ds.forEach(function (x, i) { x.ph = phs[i + 1]; });
        // ⭐ v1.415.0 — Quản lý thách đấu (TdQuan): chế độ nào thầy đóng / hẹn giờ / không mở cho lớp / em bị chặn ⇒ thẻ khoá + câu báo
        var kq = await Promise.all(['gh', 'giai', 'luyen', 'xh'].map(function (c) { return TQ.kiem(c, { uid: me.uid, lop: lop }); }));
        S.kq = { gh: kq[0], giai: kq[1], luyen: kq[2], xh: kq[3] };
      }
    } catch (e) { S.ds = []; S.thay = []; }
    if (hop !== el) return;
    el._iv = setInterval(function () { el.querySelectorAll('.td-dem[data-t]').forEach(function (e) { e.textContent = tongGio(+e.getAttribute('data-t') - Date.now()); }); }, 1000);
    var cd = function (cls, ic, t, sm, act, tat) { return '<button type="button" class="td-cd td-s ' + cls + '" ' + (tat ? 'aria-disabled="true"' : 'data-hop="' + act + '"') + '><span class="td-t"><span class="td-ic">' + ic + '</span>' + t + '</span><small>' + sm + '</small></button>'; };
    var hd = function (t, sm, lui) { return '<div class="td-ph">' + (lui ? '<button type="button" class="td-lui" data-hop="menu" aria-label="Quay lại">' + HIC.lui + '</button>' : '') + '<b>' + t + '</b>' + (sm ? '<small>' + sm + '</small>' : '') + '</div>'; };
    var soBan = function () { return S.ds.filter(function (x) { return !x.laThay; }).length; };
    var lyDo = function () { return me.laThay ? 'Thầy không tham gia giải đấu' : S.g ? (S.kq.giai ? (/tạm khoá/.test(S.kq.giai) ? '🔒 Em đang bị thầy tạm khoá đấu giải' : '🔒 Đấu giải đang tạm đóng') : '') : S.sap ? 'Giải chưa tới giờ mở' : 'Lớp chưa có giải nào đang mở'; };
    var dauOk = function () { return !me.laThay && !!S.g && !S.kq.giai; };
    function hero() {
      var ok = dauOk(), sapm = !me.laThay && !S.g && !!S.sap;
      var ten = S.g ? S.g.ten : (me.laThay && S.g ? S.g.ten : 'Đấu giải');
      var sub = ok ? (S.hang ? 'Hạng của em #' + S.hang + ' · ' + S.diem + ' điểm' : 'Em chưa đấu trận nào') + ' · ' + soBan() + ' bạn đang online' : lyDo();
      var vp = ok ? '<span class="td-dem" data-t="' + S.g.den + '">' + tongGio(S.g.den - Date.now()) + '</span>' : sapm ? '<span class="td-dem" data-t="' + S.sap.tu + '">' + tongGio(S.sap.tu - Date.now()) + '</span>' : '<span class="td-khoa">' + HIC.khoa + '</span>';
      return '<button type="button" class="td-cd td-hero' + (sapm ? ' sapm' : '') + '" ' + (ok ? 'data-hop="ban-dau"' : S.g && S.kq.giai ? 'data-hop="dong-giai"' : 'aria-disabled="true"') + '><div class="td-r1"><span class="td-ic">' + HIC.cup + '</span><div class="td-nd"><div class="td-nm">' + an(ok || !sapm ? ten : S.sap.ten) + '</div><div class="td-sub">' + an(sub) + '</div></div>' + vp + '</div>' + (ok ? '<span class="td-chip">ĐANG DIỄN RA</span>' : '') + '</button>';
    }
    // ⭐ 26/10/2026 — thẻ đầu hộp: XẾP HẠNG THẾ GIỚI (thay ô Đấu giải của lớp — giải riêng của lớp TẠM ẨN, thầy chốt)
    var IC_DIA = HI('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>');
    function xhThe() {
      var X = S.xh, M = X && X.M, bay = Date.now(), em = (X && X.em) || {};
      var tt = !M ? 'khong' : M.tt === 'chot' || bay >= M.den ? 'het' : bay < M.tu ? 'sap' : 'mo';
      var ngay = M ? Math.max(0, Math.ceil((M.den - bay) / 864e5)) : 0;
      var chip = tt === 'sap' ? 'SẮP MỞ' : tt === 'mo' ? an(String(M.ten || 'MÙA').toUpperCase()) + ' · ' + ngay + ' NGÀY' : tt === 'het' ? 'ĐÃ KẾT THÚC' : 'CHƯA MỞ';
      var toi, nut;
      if (tt === 'khong') { toi = xhHh('an') + '<div><b>Chưa có mùa giải</b><small>Thầy Andrew sắp mở</small></div>'; nut = 'XEM'; }
      else if (tt === 'sap') { toi = xhHh('an') + '<div><b>' + an(M.ten || 'Mùa mới') + ' mở sau</b><small class="td-dem" data-t="' + M.tu + '">' + tongGio(M.tu - bay) + '</small></div>'; nut = 'XEM'; }
      else if (me.laThay) { toi = xhHh('kc') + '<div><b>Xem các trận đang đấu</b><small>Bảng xếp hạng toàn trường</small></div>'; nut = 'XEM'; }
      else if ((em.xl || 0) < 5) { var k = Math.min(5, (em.xl || 0) + 1); toi = xhHh('an') + '<div><b>Phân hạng ' + k + '/5</b><small>Còn ' + (5 - (em.xl || 0)) + ' trận nữa là có hạng</small></div>'; nut = tt === 'mo' ? 'PHÂN HẠNG' : 'XEM'; }
      else { var h = xhHang(em.diem || 0, em.s || em.ht); toi = xhHh(h.ma) + '<div><b>' + an(h.ten) + (h.trong != null ? ' · ' + h.trong + '/100' : ' · ' + (em.diem || 0) + 'đ') + '</b><small>' + (em.hang ? 'Hạng #' + em.hang + ' toàn trường' : 'Điểm hạng ' + (em.diem || 0)) + '</small></div>'; nut = tt === 'mo' ? 'VÀO ĐẤU' : 'XEM'; }
      return '<button type="button" class="td-cd td-xh' + (tt === 'mo' ? '' : ' mo-sap') + '" data-hop="xh"><div class="td-x0"><span class="td-game">A SHOW SPEED</span><span class="td-mua">' + chip + '</span></div>' +
        '<div class="td-x1"><span class="td-ic">' + IC_DIA + '</span><div class="td-nd"><div class="td-nm">Xếp hạng thế giới</div><div class="td-sub">Thi đấu xếp hạng với các đối thủ từ nhiều lớp khác</div></div></div>' +
        '<div class="td-x2"><div class="td-toi">' + toi + '</div><span class="td-vao">' + nut + '</span></div></button>';
    }
    function dongGio() {
      var g = S.xh && S.xh.M && S.xh.M.gioVang, p = function (m) { return hai(Math.floor(m / 60)) + ':' + hai(m % 60); };
      return '<div class="td-gio">' + (g && g.nhan > 1 ? '⚡ Giờ vàng ' + p(g.tu) + '–' + p(g.den) + ' · ' : '') + '🌙 nghỉ ' + GH.gioChu(GH.cai.nghiTu) + '–' + GH.gioChu(GH.cai.nghiDen) + '</div>';
    }
    function hang(b, mode) {
      var av = b.laThay ? '<i class="anh" style="background-image:url(' + an(anhUid(b.uid) || AV_THAY) + ')"></i>' : avI(b.uid, b.ten);
      // ⭐ v1.375.0 — giới hạn chơi: em/bạn đủ trận hôm nay ⇒ tắt nút (trừ hàng Thầy) · đủ trận tính điểm với bạn này ⇒ nhắc
      var het = !me.laThay && !b.laThay && (!GH.conTran(S.ph) || !GH.conTran(b.ph));
      var sm = b.dangDau ? '⚔ Đang đấu, chờ ' + (b.laThay ? 'thầy' : 'bạn') + ' thoát trận' : b.laThay ? 'Đang online · giao hữu 2 phút Easy'
        : !GH.conTran(b.ph) && !me.laThay ? 'Hôm nay bạn đã chơi đủ ' + GH.cai.tranNgay + ' trận'
        : mode === 'dau' && S.g && !me.laThay && (GH.capDu(S.ph, b.uid) || !GH.conGiai(S.ph, S.g.id)) ? 'Đang online · trận này KHÔNG tính điểm (đã đủ hôm nay)' : 'Đang online';
      return '<div class="td-ban' + (b.dangDau ? ' dd' : '') + '">' + av + '<div class="td-nd"><b>' + an(b.ten) + (b.laThay ? '<em class="gvb">THẦY</em>' : '') + '</b><small>' + sm + '</small></div>' +
        '<button type="button" class="td-moi ' + (mode === 'dau' ? 'dau' : 'gh') + '" data-uid="' + an(b.uid) + '" data-mode="' + mode + '"' + (b.dangDau || het ? ' disabled' : '') + '>' + (mode === 'dau' ? HIC.cup + 'Đấu giải' : HIC.kiem + 'Mời') + '</button></div>';
    }
    // dòng "hôm nay còn N trận" (học sinh) + nhắc 22:45
    function luotHtml(giai) {
      if (me.laThay) return GH.nhacHtml();
      var con = GH.conTran(S.ph), cg = giai && S.g ? GH.conGiai(S.ph, S.g.id) : -1;
      return GH.nhacHtml() + '<div class="gh-nhac xam">🎮 <span>' + (con ? 'Hôm nay em còn <b>' + con + '/' + GH.cai.tranNgay + '</b> trận' : 'Hôm nay em đã chơi đủ <b>' + GH.cai.tranNgay + '</b> trận — mai đấu tiếp nhé!') +
        (cg >= 0 && con ? (cg ? ' · giải còn <b>' + cg + '/' + GH.cai.giaiNgay + '</b> trận tính điểm' : ' · đã đủ <b>' + GH.cai.giaiNgay + '</b> trận tính điểm, đấu thêm không cộng bảng') : '') + '</span></div>';
    }
    function luyen() {
      var c = S.lt, chip = function (k, v, t, off) { return '<button type="button" class="td-chip2' + (String(c[k]) === String(v) ? ' on' : '') + '" data-lt="' + k + '" data-v="' + v + '"' + (off ? ' disabled' : '') + '>' + t + '</button>'; };
      if (c.bo === 'g' && !S.g) c.bo = 'n';
      return '<div class="td-lts"><div class="td-tip b">' + HIC.muc + 'Chơi với máy, không tính điểm, không ai thấy kết quả.</div>' +
        '<div><label>Máy chơi</label><div class="td-row">' + chip('may', 1, 'Chậm') + chip('may', 2, 'Vừa') + chip('may', 3, 'Nhanh') + '</div></div>' +
        '<div><label>Mỗi trận</label><div class="td-row">' + chip('phut', 2, '2 phút') + chip('phut', 3, '3 phút') + chip('phut', 5, '5 phút') + '</div></div>' +
        '<div><label>Bộ chữ</label><div class="td-row">' + chip('bo', 'n', '16 chữ ngẫu nhiên') + chip('bo', 'g', 'Bộ của giải', !S.g) + '</div></div>' +
        '<button type="button" class="td-bd" data-hop="batdau">' + HIC.play + 'Bắt đầu luyện tập</button></div>';
    }
    function ve() {
      var h;
      ghCss();
      if (S.step === 'menu') h = hd('Đấu A Show Speed', '') + xhThe() + dongGio() + '<div class="td-note" role="status"></div><div class="td-phu">' +
        cd('td-gh', HIC.ban, 'Giao hữu', me.laThay ? 'Chọn cách đấu, mời em đang online' : S.kq.gh ? (/tạm khoá/.test(S.kq.gh) ? '🔒 Em đang bị tạm khoá' : '🔒 Tạm đóng') : 'Với bạn đang online, không tính điểm', S.kq.gh ? 'dong-gh' : 'ban-gh') +
        cd('td-lt', HIC.muc, 'Luyện tập', S.kq.luyen ? (/tạm khoá/.test(S.kq.luyen) ? '🔒 Em đang bị tạm khoá' : '🔒 Tạm đóng') : 'Chơi với máy để làm quen', S.kq.luyen ? 'dong-luyen' : 'luyen') + '</div>';
      else if (S.step === 'ban-dau') h = hd('Đấu giải · ' + an(S.g ? S.g.ten : ''), soBan() + ' bạn online', true) + '<div class="td-tip g">' + HIC.cup + 'Thắng +2 · hòa +1 · thua 0. Tính vào bảng xếp hạng lớp.</div>' + luotHtml(true) +
        '<div class="td-ds">' + (S.ds.filter(function (x) { return !x.laThay; }).map(function (b) { return hang(b, 'dau'); }).join('') || '<div class="td-rongtt">Chưa có bạn nào cùng lớp đang online.</div>') + '</div>';
      else if (S.step === 'ban-gh') {
        var dsG = me.laThay ? S.ds : S.thay.concat(S.ds);
        h = hd('Giao hữu', me.laThay ? 'mở trận ở tab mới' : 'không tính điểm', true) + (me.laThay ? caiHtml(S.c, S.bo) : luotHtml(false)) +
          '<div class="td-ds">' + (dsG.map(function (b) { return hang(b, 'gh'); }).join('') || '<div class="td-rongtt">' + (me.laThay ? 'Chưa có em nào của lớp đang online.' : 'Chưa có bạn nào cùng lớp đang online.') + '</div>') + '</div>';
      } else h = hd('Luyện tập', 'A Show Speed', true) + luyen();
      el.className = 'td-chon td-hop' + (S.step === 'ban-gh' && me.laThay ? ' rong' : '');
      el.innerHTML = h; datViTri(el, nut);
      if (S.step === 'ban-gh' && me.laThay) lapCai(el, S.c, S.bo);
      var f1 = el.querySelector('.td-lui, [data-hop], .td-moi:not([disabled])'); if (f1) { try { f1.focus({ preventScroll: true }); } catch (x) { } }
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-hop]'), o = e.target.closest('.td-cd[aria-disabled="true"]'), cp = e.target.closest('[data-lt]'), m = e.target.closest('.td-moi');
      if (cp && !cp.disabled) { S.lt[cp.getAttribute('data-lt')] = cp.getAttribute('data-lt') === 'bo' ? cp.getAttribute('data-v') : +cp.getAttribute('data-v'); ltLuu(S.lt); ve(); return; }
      if (o) { var n = el.querySelector('.td-note'); if (n) n.textContent = lyDo() + '.'; return; }
      if (m && !m.disabled) return moi(m.getAttribute('data-uid'), m.getAttribute('data-mode'));
      if (!b) return;
      var k = b.getAttribute('data-hop');
      if (k === 'batdau') return batDauLuyen();
      if (k === 'xh') {   // ⭐ 26/10 — mở sảnh Xếp hạng (thầy: tab mới, dashboard giữ chỗ)
        if (!me.laThay && S.kq.xh) { dongHop(); return TQ.hop(S.kq.xh, 'xh'); }
        var ux = (laNw ? '' : 'nw/') + 'xephang.html';
        dongHop();
        if (me.laThay && !banThu()) return moTab(new URL(window.NW && NW.duong ? NW.duong(ux) : ux, location.href).href);
        return diToi(ux);
      }
      if (/^dong-/.test(k)) { var cheD = k.slice(5); dongHop(); return TQ.hop(S.kq[cheD], cheD); }   // v1.415.0 chế độ thầy đóng (TdQuan)
      S.step = k; ve();
    });
    function batDauLuyen() {
      if (!me.laThay && GH.dem()) { dongHop(); return GH.hopNgu(); }   /* v1.375.0 luyện tập: không đếm ván, chỉ nghỉ đêm */
      if (S.kq.luyen) { dongHop(); return TQ.hop(S.kq.luyen, 'luyen'); }   /* v1.415.0 TdQuan */
      var c = S.lt, bo = c.bo === 'g' && S.g ? 'g' : 'n';
      var u = (laNw ? '' : 'nw/') + 'tran.html?luyen=1&may=' + c.may + '&phut=' + c.phut + '&bo=' + bo + '&lop=' + encodeURIComponent(lop) + (bo === 'g' ? '&giai=' + encodeURIComponent(S.g.id) : '');
      dongHop();
      if (me.laThay && !banThu()) return moTab(new URL(window.NW && NW.duong ? NW.duong(u) : u, location.href).href);   // thầy: tab mới, dashboard giữ chỗ
      diToi(u);
    }
    function moi(uid, mode) {
      var all = S.ds.concat(S.thay || []), ban = all.filter(function (x) { return x.uid === uid; })[0]; if (!ban) return;
      dongHop();
      if (!me.ten && !me.laThay) { if (baoLoi) baoLoi('Chưa nhận ra tài khoản của em — em tải lại trang nhé.'); return; }
      var c = S.c;
      if (me.laThay) return taoTran({ me: me, ban: ban, lop: lop, phut: c.phut, lv: c.che ? 'easy' : c.lv, cai: c, gv: me.uid, gui: gui, baoLoi: baoLoi });
      if (ban.laThay) return taoTran({ me: me, ban: ban, lop: lop, phut: 2, lv: 'easy', gv: ban.uid, gui: gui, baoLoi: baoLoi });
      if (banThu()) { MOI_TAO.mau = 1; if (baoLoi) baoLoi('Bàn thử: đã mời ' + ban.ten + ' — 3 giây nữa vào trận với máy.'); setTimeout(function () { location.href = (laNw ? '' : 'nw/') + 'tran.html?thu=1&ban=' + encodeURIComponent(ban.ten); }, 3000); return; }
      // đấu giải: trận tính vào giải đang mở · giao hữu: 2 phút Easy, KHÔNG tính điểm (luật cho phép giai '' bất cứ lúc nào)
      if (mode === 'dau' && S.g) return taoTran({ me: me, ban: ban, lop: lop, giai: S.g.id, phut: S.g.phut, lv: S.g.lv, gui: gui, baoLoi: baoLoi });
      taoTran({ me: me, ban: ban, lop: lop, giai: '', phut: 2, lv: 'easy', gui: gui, baoLoi: baoLoi });
    }
    ve();
  }

  // ---------- nút ⚔ ở PHÒNG CHAT RIÊNG thầy ↔ một em: mời thẳng người kia ----------
  // ban = { uid, ten, laThay, lop }
  async function TheTD_moMoi(nut, ban, gui, baoLoi) {
    if (hop) return dongHop();
    napCss();
    hop = document.createElement('div'); hop.className = 'td-chon rong';
    hop.innerHTML = '<div class="t">Giao hữu</div><div class="p">Đang xem ' + (ban.laThay ? 'thầy' : an(ban.ten)) + ' có online không…</div>';
    document.body.appendChild(hop); datViTri(hop, nut);
    var el = hop, me = await toi();
    if (!me.laThay) { var cam = await TQ.kiem('gh', { uid: me.uid, lop: ban.lop || me.lop }); if (cam) { if (hop === el) dongHop(); return TQ.hop(cam, 'gh'); } }   // v1.415.0 TdQuan: em mời thầy = giao hữu
    var f = banThu() ? null : await kho().catch(function () { return null; });
    var r = await Promise.all([dangOnline(f, ban.uid), me.laThay ? dsBo(f) : [], dsDangDau(f)]), on = r[0], bo = r[1], ban2 = !!r[2][ban.uid];
    if (hop !== el) return;
    var c = me.laThay ? caiDoc() : null, ten = ban.laThay ? 'thầy' : ban.ten;
    var trangThai = ban2 ? '<div class="tt2 dd"><i class="c dd"></i>' + (ban.laThay ? 'Thầy' : an(ban.ten)) + ' đang đấu — chờ ' + (ban.laThay ? 'thầy' : 'bạn') + ' thoát trận rồi mời nhé</div>'
      : '<div class="tt2"><i class="c' + (on ? '' : ' tat') + '"></i>' + (on ? (ban.laThay ? 'Thầy' : an(ban.ten)) + ' đang online'
      : (ban.laThay ? 'Thầy' : an(ban.ten)) + ' không online — vẫn nhận được thông báo, lời mời chờ 60 giây') + '</div>';
    el.innerHTML = '<div class="t">' + (me.laThay ? 'Giao hữu với ' + an(ban.ten) : 'Mời thầy giao hữu') + '</div>' +
      (me.laThay ? '' : '<div class="p">A Show Speed · 2 phút · Easy · không tính điểm</div>') + trangThai +
      (me.laThay ? caiHtml(c, bo) : '') +
      '<button type="button" class="moi-nut" data-moi' + (ban2 ? ' disabled' : '') + '>' + IC + '&nbsp;Mời ' + an(ten) + '</button>';
    if (me.laThay) lapCai(el, c, bo);
    datViTri(el, nut);
    el.querySelector('[data-moi]').onclick = function () {
      dongHop();
      var lop = ban.lop || '';
      if (me.laThay) taoTran({ me: me, ban: ban, lop: lop, phut: c.phut, lv: c.che ? 'easy' : c.lv, cai: c, gv: me.uid, gui: gui, baoLoi: baoLoi });
      else taoTran({ me: me, ban: ban, lop: lop || (me.lop || ''), phut: 2, lv: 'easy', gv: ban.uid, gui: gui, baoLoi: baoLoi });
    };
  }
  function mauTran(id) {
    var b = Date.now();
    // ⭐ 16/10 — trận với THẦY: thầy đang mời em (chờ nhận) · thầy đấu Minh Anh (đã xong, em thắng)
    if (id === 'mau-thay-moi') return { a: 'gv', b: 'hs_0', gv: 'gv', tenA: 'Thầy Andrew', tenB: 'BẠN THỬ', giai: '', phut: 3, lv: 'easy', cai: { che: 'free', boTen: 'FRUITS / WORDS' }, trangThai: 'moi', het: b + 55000 };
    if (id === 'mau-thay-xong') return { a: 'gv', b: 'hs_1', gv: 'gv', tenA: 'Thầy Andrew', tenB: 'MINH ANH', giai: '', phut: 2, lv: 'easy', trangThai: 'xong', diem: { a: 9, b: 12 }, kq: { a: 'thua', b: 'thang' } };
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

  /* ⭐ v1.381.0 — MỜI THẲNG MỘT BẠN đấu giải (nút "Thách đấu" cạnh tên bạn trong pop-up thanh giải, js/thanh-giai.js).
     Cùng đường với bước 2 của hộp ⚔ (taoTran, trận tính giải): nghỉ đêm ⇒ hộp đi ngủ; giới hạn chơi do taoTran/GH.chanMoi lo. */
  async function TheTD_moiGiai(ban, lop, g, gui, baoLoi) {
    var me = await toi();
    if (!me.laThay) { await GH.napCai(); if (GH.dem()) return GH.hopNgu(); }
    if (!me.ten && !me.laThay) { if (baoLoi) baoLoi('Chưa nhận ra tài khoản của em — em tải lại trang nhé.'); return; }
    var bay = Date.now();
    if (!g || g.dong || bay < g.tu || bay >= g.den) { if (baoLoi) baoLoi('Giải chưa mở hoặc đã đóng — chưa thách đấu được.'); return; }
    return taoTran({ me: me, ban: ban, lop: lop, giai: g.id, phut: g.phut, lv: g.lv, gui: gui, baoLoi: baoLoi });
  }

  window.TheTD = {
    IC: IC,
    moiGiai: TheTD_moiGiai,
    html: function (id) {
      napCss(); id = String(id || ''); var t = TRAN[id];
      return '<div class="cu-td' + (moMo(t) ? ' mo' : '') + (laGon(t) ? ' gon' : '') + (t && t.giai ? ' giai' : '') + (t && t.gv ? ' thay' : '') + '" data-td="' + an(id) + '"' + (anThe(t) ? ' hidden' : '') + '>' + (laGon(t) ? gonHtml(id) : cardHtml(id)) + '</div>';
    },
    lap: function (khung) { docToi(); (khung || document).querySelectorAll('.cu-td[data-td]').forEach(function (el) { nghe(el.getAttribute('data-td')); }); },
    moChon: TheTD_moChon,
    moMoi: TheTD_moMoi,
    ghim: TheTD_ghim,
    moXem: moXem,
    /* ⭐ v1.371.0 — nguồn nghe giải dùng chung cho THẺ GIẢI (js/the-giai.js): chỉ XUẤT HIỆN CÓ SẴN, dải ghim ở trên KHÔNG đổi hành vi */
    kho: kho,
    toi: toi,
    giaiCuaLop: giaiCuaLop
  };
})();
