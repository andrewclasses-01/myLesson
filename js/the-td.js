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
   ============================================================ */
(function () {
  'use strict';
  if (window.TheTD) return;
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var ONLINE_MS = 150 * 1000;
  var IC = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/></svg>';
  var an = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var tat = function (ten) { return String(ten || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).join('').toUpperCase().slice(-2); };
  var MAU = ['#0E7C6E', '#E0575B', '#3E7BFA', '#F0821E', '#8B5CF6', '#18A957', '#D9468F', '#2B9BB5'];
  var mau = function (ten) { var s = 0; ten = String(ten || ''); for (var i = 0; i < ten.length; i++) s += ten.charCodeAt(i); return MAU[s % MAU.length]; };
  var laNw = /\/nw\//.test(location.pathname);
  var banThu = function () { return !!(window.NW && NW.laBanThu && NW.laBanThu()); };

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
  function moTran(id) {
    var href = (laNw ? '' : 'nw/') + 'tran.html?id=' + encodeURIComponent(id);
    if (window.NW && NW.di) NW.di(href); else location.href = href;
  }

  // ---------- CSS (tự chèn — trang nw/ và trang chính khác bộ màu) ----------
  function napCss() {
    if (document.getElementById('theTdCss')) return;
    var s = document.createElement('style'); s.id = 'theTdCss';
    s.textContent =
      '.cu-td{align-self:center;width:min(360px,calc(100% - 16px));margin:8px auto;border-radius:16px;overflow:hidden;background:#fff;border:1px solid #E0EAE7;box-shadow:0 4px 14px rgba(22,35,42,.06);color:#16232A;font-family:inherit}' +
      '.cu-td .d{background:radial-gradient(ellipse 90% 120% at 50% 0%,#0F4029,#05170F);color:#9BFFC4;padding:7px 12px;display:flex;align-items:center;gap:6px;font-style:italic;font-weight:800;font-size:12px;line-height:1;letter-spacing:.12em;text-transform:uppercase}' +
      '.cu-td .d svg{width:14px;height:14px}.cu-td .d span{margin-left:auto;font-weight:600;font-size:11px;line-height:1;letter-spacing:0;text-transform:none;color:#9FC9B2;font-style:normal}' +
      '.cu-td .g{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:12px 12px 8px}' +
      '.cu-td .ng{display:flex;flex-direction:column;align-items:center;gap:4px;font-weight:700;font-size:13px;text-align:center;min-width:0}' +
      '.cu-td .ng i{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:13px;line-height:1;font-style:normal}' +
      '.cu-td .ng b{font-weight:900;font-size:22px;line-height:1;font-variant-numeric:tabular-nums}.cu-td .ng.th b{color:#1DA45C}' +
      '.cu-td .vs{font-style:italic;font-weight:900;font-size:16px;line-height:1;color:#5F7370}' +
      '.cu-td .c{padding:0 12px 12px;display:flex;flex-direction:column;gap:8px}' +
      '.cu-td .tt{text-align:center;font-size:13px;color:#5F7370;font-weight:600}.cu-td .tt b{color:#16232A}' +
      '.cu-td .va{height:3px;border-radius:2px;background:#E0EAE7;overflow:hidden}.cu-td .va i{display:block;height:100%;background:#0E7C6E;transition:width 1s linear}' +
      '.cu-td .h2{display:grid;grid-template-columns:1fr 1.4fr;gap:8px}' +
      '.cu-td button{height:38px;border:0;border-radius:12px;font-weight:700;font-size:14px;line-height:1;cursor:pointer}' +
      '.cu-td .k{background:#E3F1EE;color:#0E7C6E}.cu-td .n{background:#0E7C6E;color:#fff}' +
      '.cu-td .dang{display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:13px;color:#0E7C6E}' +
      '.cu-td .dang::before{content:"";width:8px;height:8px;border-radius:50%;background:#1DA45C;animation:cutd 1s infinite}@keyframes cutd{50%{opacity:.25}}' +
      '.cu-td.mo{opacity:.6}' +
      '.cu-kiem{color:#fff!important;background:linear-gradient(160deg,#1C8F55,#0E7C6E)!important;border-radius:50%}' +
      '.td-chon{position:fixed;z-index:9500;width:min(300px,calc(100vw - 24px));max-height:min(420px,70vh);overflow:auto;background:#fff;border:1px solid #E0EAE7;border-radius:16px;' +
      'box-shadow:0 14px 40px rgba(22,35,42,.2);padding:10px;color:#16232A;font-family:inherit}' +
      '.td-chon .t{font-weight:800;font-size:13.5px;padding:4px 6px 2px}.td-chon .p{font-size:12px;color:#5F7370;padding:0 6px 6px}' +
      '.td-chon button{width:100%;display:flex;align-items:center;gap:10px;padding:7px 6px;border:0;background:none;border-radius:10px;cursor:pointer;text-align:left;font:inherit;color:inherit}' +
      '.td-chon button:hover{background:#F3F7F6}.td-chon i{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:11px;line-height:1;font-style:normal;flex:none;position:relative}' +
      '.td-chon i::after{content:"";position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;background:#1DA45C;border:2px solid #fff}' +
      '.td-chon b{display:block;font-size:13.5px}.td-chon small{color:#5F7370;font-size:12px}.td-chon .trong{padding:14px 6px;color:#5F7370;font-size:13px;text-align:center}';
    document.head.appendChild(s);
  }

  // ---------- thẻ ----------
  var TRAN = {}, NGHE = {}, MOI_TAO = {};   // id → dữ liệu trận · id → đã nghe · id trận em vừa mời (tự vào trận khi bạn nhận)
  var TOI = { uid: '' };
  // đọc tài khoản LƯỜI: tệp này có thể nạp trước loi.js (trang nw/) — lần đầu cần vẽ thẻ / mở hộp chọn mới đọc
  var _daDocToi = false;
  function docToi() { if (_daDocToi) return; _daDocToi = true; setTimeout(function () { toi().then(function (x) { TOI = x; veHet(); }); }, 0); }
  function cardHtml(id) {
    var t = TRAN[id];
    if (!t) return '<div class="d">' + IC + 'Thách đấu<span>A Show Speed</span></div><div class="c"><div class="tt">Đang tải…</div></div>';
    if (t._khongDoc) return '<div class="d">' + IC + 'Thách đấu<span>A Show Speed</span></div><div class="c"><div class="tt">' + an(t._chu || 'Trận đấu của lớp') + '</div></div>';
    var xong = t.trangThai === 'xong', d = t.diem || {}, kqA = t.kq ? t.kq.a : '';
    var ng = function (ten, diem, thang) { return '<div class="ng' + (thang ? ' th' : '') + '"><i style="background:' + mau(ten) + '">' + an(tat(ten)) + '</i>' + an(ten) + (xong ? '<b>' + (diem || 0) + '</b>' : '') + '</div>'; };
    var con = Math.max(0, Math.ceil(((t.het || 0) - Date.now()) / 1000));
    var het = t.trangThai === 'moi' && con <= 0;
    var duoi;
    if (t.trangThai === 'moi' && !het) {
      var va = '<div class="va"><i style="width:' + (con / 60 * 100) + '%"></i></div>';
      if (TOI.uid && TOI.uid === t.b) duoi = va + '<div class="h2"><button type="button" class="k" data-tdx="khong">Từ chối</button><button type="button" class="n" data-tdx="nhan">Nhận · <span class="td-con">' + con + '</span>s</button></div>';
      else duoi = va + '<div class="tt">Đang chờ <b>' + an(t.tenB) + '</b> nhận · <span class="td-con">' + con + '</span>s</div>' +
        (TOI.uid && TOI.uid === t.a ? '<button type="button" class="k" data-tdx="huy" style="height:34px">Huỷ lời mời</button>' : '');
    } else if (t.trangThai === 'nhan' || t.trangThai === 'choi') {
      duoi = '<div class="dang">Đang đấu…</div>' + (TOI.uid === t.a || TOI.uid === t.b ? '<button type="button" class="n" data-tdx="vao">Vào trận</button>' : '');
    } else if (xong) {
      var ly = t.ly ? (/^roi/.test(t.ly) ? ' · có bạn rời trận' : ' · có bạn mất kết nối') : '';
      duoi = '<div class="tt">' + (kqA === 'hoa' ? '<b>Hòa</b>' + (t.giai ? ' · +1 mỗi bạn' : '') : '<b>' + an(kqA === 'thang' ? t.tenA : t.tenB) + '</b> thắng' + (t.giai ? ' · +2 điểm' : '')) + an(ly) + '</div>';
    } else {
      duoi = '<div class="tt">' + ({ tuchoi: an(t.tenB) + ' chưa muốn đấu lúc này', huy: 'Lời mời đã huỷ' }[t.trangThai] || 'Lời mời đã hết hạn') + '</div>';
    }
    return '<div class="d">' + IC + (t.giai ? 'Giải đấu' : 'Giao hữu') + '<span>A Show Speed · ' + (t.phut || 2) + ' phút</span></div>' +
      '<div class="g">' + ng(t.tenA, d.a, kqA === 'thang') + '<span class="vs">VS</span>' + ng(t.tenB, d.b, kqA === 'thua') + '</div><div class="c">' + duoi + '</div>';
  }
  function moMo(t) { return t && !t._khongDoc && (t.trangThai === 'tuchoi' || t.trangThai === 'huy' || t.trangThai === 'het' || (t.trangThai === 'moi' && (t.het || 0) < Date.now())); }
  function veId(id) {
    document.querySelectorAll('.cu-td[data-td="' + id + '"]').forEach(function (el) { el.innerHTML = cardHtml(id); el.classList.toggle('mo', !!moMo(TRAN[id])); });
  }
  function veHet() { Object.keys(TRAN).forEach(veId); }
  function nghe(id) {
    if (NGHE[id]) return; NGHE[id] = 1;
    if (banThu()) { TRAN[id] = mauTran(id); return veId(id); }
    kho().then(function (f) {
      f.fs.onSnapshot(f.fs.doc(f.db, 'tranDau', id), function (s) {
        var t = s.exists() ? s.data() : { _khongDoc: true };
        var cu = TRAN[id]; TRAN[id] = t; veId(id);
        // em vừa mời từ chat: bạn nhận ⇒ vào trận luôn
        if (MOI_TAO[id] && (t.trangThai === 'nhan' || t.trangThai === 'choi') && (!cu || cu.trangThai === 'moi')) { delete MOI_TAO[id]; setTimeout(function () { moTran(id); }, 500); }
      }, function () { TRAN[id] = { _khongDoc: true }; veId(id); });
    });
  }
  async function bam(id, viec, nut) {
    if (viec === 'vao') return moTran(id);
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
    var el = b.closest('.cu-td'); if (el) bam(el.getAttribute('data-td'), b.getAttribute('data-tdx'), b);
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
  async function giaiDangMo(f, lop) {
    try {
      var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'giaiDau'), f.fs.where('lops', 'array-contains', lop), f.fs.limit(20)));
      var bay = Date.now(), g = null;
      s.forEach(function (d) { var x = d.data(); if (!g && !x.dong && x.tu <= bay && bay < x.den) g = Object.assign({ id: d.id }, x); });
      return g;
    } catch (e) { return null; }
  }
  async function banOnline(f, lop, uid) {
    var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'nwUsers'), f.fs.where('cacLop', 'array-contains', lop), f.fs.limit(60)));
    var ds = [], bay = Date.now();
    s.forEach(function (d) { var x = d.data(); if (d.id !== uid && x.vaiTro !== 'gv' && x.hoatDongLuc && bay - x.hoatDongLuc < ONLINE_MS) ds.push({ uid: d.id, ten: x.ten || '?' }); });
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
    el.innerHTML = '<div class="t">' + (g ? 'Thách đấu · ' + an(g.ten) : 'Giao hữu (không tính điểm)') + '</div><div class="p">A Show Speed · ' + (g ? g.phut : 2) + ' phút · bạn đang online</div>' +
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
    return { a: 'hs_1', b: 'hs_0', tenA: 'Gia Bảo', tenB: 'BẠN THỬ', giai: 'x', phut: 2, trangThai: id === 'mau-xong' ? 'xong' : 'moi', het: b + 45000, diem: { a: 12, b: 9 }, kq: { a: 'thang', b: 'thua' } };
  }

  window.TheTD = {
    IC: IC,
    html: function (id) { napCss(); id = String(id || ''); return '<div class="cu-td' + (moMo(TRAN[id]) ? ' mo' : '') + '" data-td="' + an(id) + '">' + cardHtml(id) + '</div>'; },
    lap: function (khung) { docToi(); (khung || document).querySelectorAll('.cu-td[data-td]').forEach(function (el) { nghe(el.getAttribute('data-td')); }); },
    moChon: TheTD_moChon
  };
})();
