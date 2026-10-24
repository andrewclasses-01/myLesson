/* ============================================================
   td-ql.js — HỘP "QUẢN LÝ THÁCH ĐẤU" TRÊN DASHBOARD (24/10/2026, web v1.415.0 — thầy yêu cầu).
   Mở từ mục "Quản lý thách đấu" ở cột trái (js/nw-thanh.js ⇒ window.TdQl.mo()).

   Thầy chỉnh MỌI trò chơi thách đấu của học sinh ở một chỗ (hôm nay: A Show Speed; sau này thêm trò ⇒ thêm vào TdQuan.TRO trong js/the-td.js):
   · Mỗi chế độ (Giao hữu · Đấu giải · Luyện tập): BẬT / TẮT / HẸN GIỜ (mở từ … đóng lúc …, bỏ trống một đầu = không giới hạn đầu đó),
     mở cho TẤT CẢ lớp hoặc chỉ vài lớp, LỜI NHẮN học sinh thấy khi bấm lúc đóng.
   · HỌC SINH BỊ CHẶN: chọn lớp ⇒ chọn em ⇒ chặn chế độ nào (mặc định tất cả) · thời hạn (tới khi thầy mở / 1–30 ngày) · lý do ⇒ Mở khoá.
   Lưu vào nwCauHinh/thachDau (luật có sẵn: em đăng nhập đọc, thầy ghi — KHÔNG đổi luật). Học sinh kiểm ở js/the-td.js TdQuan.kiem
   (hộp ⚔, phòng riêng, trang Giải đấu, Đấu lại, nút Nhận, trang trận luyện tập) — chỉ chặn ở máy em, thầy chốt không cần chặn ở máy chủ.
   Bàn thử (localhost, ?thu=1 hoặc TdQuan.thuLocal): đọc/ghi localStorage 'tdQuanThu' + lớp/học sinh mẫu.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var SV = function (d) { return '<svg class="i" viewBox="0 0 24 24">' + d + '</svg>'; };
  var I = {
    kiem: SV('<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>'),
    x: SV('<path d="M6 6l12 12M18 6L6 18"/>'),
    game: SV('<rect x="2.5" y="7" width="19" height="11" rx="4"/><path d="M7.5 10.5v4M5.5 12.5h4M15.5 11.5h.01M18 13.5h.01"/>'),
    chan: SV('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'),
    cong: SV('<path d="M12 5v14M5 12h14"/>'),
    gio: SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    khoa: SV('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    mo: SV('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>'),
    tim: SV('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>')
  };
  var MAU = ['#0E7C6E', '#3E7BFA', '#E0575B', '#F0821E', '#18A957', '#8b5cf6', '#0891b2', '#db2777'];
  var HAN = [[0, 'Tới khi thầy mở'], [1, '1 ngày'], [3, '3 ngày'], [7, '7 ngày'], [30, '30 ngày']];

  var TQ = function () { return window.TdQuan; };
  var laThu = function () { return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && (/[?&]thu=/.test(location.search) || (TQ() && TQ().thuLocal)); };
  // S.c = bản đang sửa · S.goc = JSON bản đã lưu (so để biết "chưa lưu")
  var S = { c: null, goc: '', xem: 'ass', lops: [], hs: {}, chonLop: '', tim: '', chonHs: null, f: null };

  // ── kho ──
  function kho() {
    if (S.f) return Promise.resolve(S.f);
    var p = window.TheTD && TheTD.kho ? TheTD.kho() : window.AWChat && AWChat.db ? AWChat.db() : Promise.reject(new Error('chưa có kho'));
    return p.then(function (f) { S.f = f; return f; });
  }
  function ref(f) { return f.fs.doc(f.db, 'nwCauHinh', 'thachDau'); }
  function sach(c) {   // bản ghi xuống kho: đủ khoá từng chế độ (merge không để sót khoá cũ)
    var tro = {};
    TQ().TRO.forEach(function (t) {
      tro[t.ma] = {};
      t.che.forEach(function (ch) {
        var m = (c.tro[t.ma] || {})[ch.ma] || {};
        tro[t.ma][ch.ma] = { che: m.che || 'bat', tu: +m.tu || 0, den: +m.den || 0, lops: (m.lops || []).slice(), nhan: String(m.nhan || '').trim().slice(0, 300) };
      });
    });
    return tro;
  }
  async function ghiThu(doi) {
    var x = null; try { x = JSON.parse(localStorage.getItem(TQ().KHOA_THU) || 'null'); } catch (e) { }
    x = x || { tro: {}, chan: {} };
    doi(x); x.capNhat = Date.now();
    localStorage.setItem(TQ().KHOA_THU, JSON.stringify(x));
  }
  async function luuCheDo() {
    var tro = sach(S.c), luc = Date.now();
    if (laThu()) await ghiThu(function (x) { x.tro = tro; });
    else { var f = await kho(); await f.fs.setDoc(ref(f), { tro: tro, capNhat: luc }, { merge: true }); }
    S.c.capNhat = luc; S.goc = JSON.stringify(tro);
    await TQ().nap(true);
  }
  async function luuChan(uid, muc) {   // muc = null ⇒ mở khoá
    if (laThu()) await ghiThu(function (x) { x.chan = x.chan || {}; if (muc) x.chan[uid] = muc; else delete x.chan[uid]; });
    else {
      var f = await kho(), r = ref(f), doi = { capNhat: Date.now() };
      doi['chan.' + uid] = muc || f.fs.deleteField();
      try { await f.fs.updateDoc(r, doi); }
      catch (e) {   // chưa có tài liệu ⇒ tạo (mặc định chế độ + một dòng chặn)
        if (!muc) throw e;
        var moi = { tro: sach(S.c), chan: {}, capNhat: Date.now() }; moi.chan[uid] = muc;
        await f.fs.setDoc(r, moi, { merge: true });
      }
    }
    if (muc) S.c.chan[uid] = muc; else delete S.c.chan[uid];
    await TQ().nap(true);
  }
  async function napLop() {
    if (laThu()) return [{ ma: 'A1C', ten: 'Lớp A1-C' }, { ma: 'NTK9', ten: 'Nền Tảng K9' }, { ma: 'B2B', ten: 'Lớp B2B' }];
    try { var f = await kho(), s = await f.fs.getDoc(f.fs.doc(f.db, 'nwCauHinh', 'lop')); return s.exists() ? (s.data().ds || []) : []; } catch (e) { return []; }
  }
  async function napHs(lop) {
    if (S.hs[lop]) return S.hs[lop];
    if (laThu()) return (S.hs[lop] = ['Gia Bảo', 'Bảo Nam', 'Thảo Vy', 'Khánh Linh', 'Quang Minh', 'Minh Anh'].map(function (t, i) { return { uid: 'hs_' + lop + i, ten: t, lop: lop }; }));
    var f = await kho(), s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'nwUsers'), f.fs.where('cacLop', 'array-contains', lop), f.fs.limit(120))), ds = [];
    s.forEach(function (d) { var x = d.data(); if (x.vaiTro !== 'gv' && x.vaiTro !== 'doi' && !x.nghiHoc) ds.push({ uid: d.id, ten: x.ten || '?', anh: x.anh || '', lop: lop }); });
    return (S.hs[lop] = ds.sort(function (a, b) { return String(a.ten).localeCompare(String(b.ten), 'vi'); }));
  }

  // ── tiện ích ──
  var hai = function (n) { return (n < 10 ? '0' : '') + n; };
  function chuTat(ten) { var t = String(ten || '?').trim().split(/\s+/); return (t.length > 1 ? t[t.length - 2][0] + t[t.length - 1][0] : t[0].slice(0, 2)).toUpperCase(); }
  function mauTen(ten) { var h = 0; String(ten || '').split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return MAU[h % MAU.length]; }
  function av(x) { return x.anh ? '<img class="tq-av" src="' + E(x.anh) + '" alt="">' : '<span class="tq-av" style="background:' + mauTen(x.ten) + '">' + E(chuTat(x.ten)) + '</span>'; }
  function tenLop(ma) { var l = S.lops.filter(function (x) { return x.ma === ma; })[0]; return l ? (l.ten || l.ma) : ma; }
  function chuLuc(ms) { return TQ().ngayGio(ms); }
  // giá trị ô datetime-local ⇄ ms (giờ máy thầy = giờ VN)
  function oGio(ms) { if (!ms) return ''; var d = new Date(ms); return d.getFullYear() + '-' + hai(d.getMonth() + 1) + '-' + hai(d.getDate()) + 'T' + hai(d.getHours()) + ':' + hai(d.getMinutes()); }
  function tuOGio(v) { if (!v) return 0; var t = new Date(v).getTime(); return isNaN(t) ? 0 : t; }
  var toastT;
  function toast(chu, loi) {
    var t = $('#tqToast'); if (!t) { t = document.createElement('div'); t.id = 'tqToast'; t.className = 'tq-toast'; document.body.appendChild(t); }
    t.textContent = chu; t.classList.toggle('loi', !!loi); t.classList.add('mo');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('mo'); }, 3500);
  }
  function chuLoi(e) { var m = String((e && (e.code || e.message)) || e || ''); return /permission/i.test(m) ? 'Chưa lưu được — phiên thầy hết hạn, thầy tải lại trang nhé.' : 'Chưa lưu được: ' + m.slice(0, 120); }
  function chuaLuu() { return S.c && JSON.stringify(sach(S.c)) !== S.goc; }

  // trạng thái một chế độ ⇒ { cls, chu }
  function pill(m) {
    var tt = TQ().trangThai(m), lop = m.lops && m.lops.length ? ' · ' + m.lops.length + ' lớp' : '';
    if (tt.mo) return { cls: m.che === 'hen' ? 'hen' : 'on', chu: (tt.het ? 'Đang mở · đóng lúc ' + chuLuc(tt.het) : 'Đang mở') + lop };
    if (tt.sap) return { cls: 'hen', chu: 'Hẹn mở lúc ' + chuLuc(tt.sap) };
    if (tt.qua) return { cls: 'off', chu: 'Đã đóng (hết giờ hẹn)' };
    return { cls: 'off', chu: 'Đã đóng' };
  }
  function soChan() { var bay = Date.now(); return Object.keys(S.c.chan || {}).filter(function (u) { var x = S.c.chan[u]; return !x.den || x.den > bay; }).length; }

  // ── khung hộp ──
  function dungKhung() {
    if ($('#tqNen')) return $('#tqNen');
    var n = document.createElement('div'); n.id = 'tqNen'; n.className = 'tq-nen'; n.hidden = true;
    n.innerHTML = '<div class="tq-hop" role="dialog" aria-modal="true" aria-label="Quản lý thách đấu">' +
      '<aside class="tq-ben"><div class="tq-dau"><span class="tq-ic">' + I.kiem + '</span><h3>Quản lý thách đấu<span>Trò chơi của học sinh</span></h3></div>' +
        '<nav class="tq-nav" id="tqNav"></nav></aside>' +
      '<section class="tq-chinh"><header class="tq-tren"><h2 id="tqTieuDe"></h2><button class="tq-dong" type="button" aria-label="Đóng">' + I.x + '</button></header>' +
        '<div class="tq-than" id="tqThan"></div><footer class="tq-chan-luu" id="tqLuu"></footer></section></div>';
    document.body.appendChild(n);
    $('.tq-dong', n).onclick = dong;
    n.addEventListener('mousedown', function (e) { if (e.target === n) dong(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !n.hidden) dong(); });
    return n;
  }
  function dong() {
    if (chuaLuu() && !confirm('Còn thay đổi CHƯA LƯU ở phần chế độ chơi. Đóng và bỏ các thay đổi đó?')) return;
    $('#tqNen').hidden = true;
  }
  async function mo() {
    if (!TQ()) return alert('Chưa nạp được js/the-td.js — thầy tải lại trang nhé.');
    var n = dungKhung(); n.hidden = false;
    $('#tqThan').innerHTML = '<div class="tq-rong">Đang tải…</div>'; $('#tqNav').innerHTML = ''; $('#tqLuu').innerHTML = '';
    try {
      var r = await Promise.all([TQ().nap(true), napLop()]);
      S.c = JSON.parse(JSON.stringify(r[0])); S.c.chan = S.c.chan || {};
      S.lops = r[1]; S.goc = JSON.stringify(sach(S.c)); S.chonHs = null;
      if (!S.chonLop && S.lops[0]) S.chonLop = S.lops[0].ma;
    } catch (e) { $('#tqThan').innerHTML = '<div class="tq-rong">Chưa tải được cài đặt: ' + E(chuLoi(e)) + '</div>'; return; }
    ve();
  }

  // ── vẽ ──
  function ve() { veNav(); if (S.xem === 'chan') veChan(); else veTro(); veLuu(); }
  function veNav() {
    var h = '<div class="tq-nhom">Trò chơi</div>' + TQ().TRO.map(function (t) {
      var on = t.che.filter(function (ch) { return TQ().trangThai((S.c.tro[t.ma] || {})[ch.ma]).mo; }).length;
      return '<button type="button" class="tq-muc' + (S.xem === t.ma ? ' chon' : '') + '" data-xem="' + t.ma + '">' + I.game +
        '<span class="ch">' + E(t.ten) + '<small>' + on + '/' + t.che.length + ' chế độ đang mở</small></span></button>';
    }).join('') +
      '<div class="tq-muc tat" title="Trò chơi mới sẽ tự hiện ở đây khi được thêm vào hệ thống">' + I.cong + '<span class="ch">Trò chơi khác<small>Sắp có</small></span></div>' +
      '<i class="tq-cach"></i>' +
      '<button type="button" class="tq-muc' + (S.xem === 'chan' ? ' chon' : '') + '" data-xem="chan">' + I.chan + '<span class="ch">Học sinh bị chặn<small>Khoá riêng từng em</small></span>' +
      (soChan() ? '<span class="dem">' + soChan() + '</span>' : '') + '</button>';
    var nav = $('#tqNav'); nav.innerHTML = h;
    $$('[data-xem]', nav).forEach(function (b) { b.onclick = function () { S.xem = b.getAttribute('data-xem'); ve(); }; });
  }
  function veTro() {
    var t = TQ().TRO.filter(function (x) { return x.ma === S.xem; })[0] || TQ().TRO[0]; S.xem = t.ma;
    $('#tqTieuDe').innerHTML = E(t.ten) + '<small>Bật, tắt, hẹn giờ và chọn lớp cho từng chế độ</small>';
    S.c.tro[t.ma] = S.c.tro[t.ma] || {};
    $('#tqThan').innerHTML = '<div class="tq-luoi">' + t.che.map(function (ch) {
      var m = S.c.tro[t.ma][ch.ma] = S.c.tro[t.ma][ch.ma] || { che: 'bat' }, p = pill(m), tatCa = !(m.lops && m.lops.length);
      var seg = function (v, chu) { return '<button type="button" data-che-v="' + v + '"' + ((m.che || 'bat') === v ? ' class="chon"' : '') + '>' + chu + '</button>'; };
      return '<div class="tq-the" data-che="' + ch.ma + '">' +
        '<div class="tq-the-dau"><div><b>' + E(ch.ten) + '</b><small>' + E(ch.mo) + '</small></div><span class="tq-pill ' + p.cls + '">' + E(p.chu) + '</span></div>' +
        '<div class="tq-seg">' + seg('bat', 'Bật') + seg('tat', 'Tắt') + seg('hen', I.gio + 'Hẹn giờ') + '</div>' +
        (m.che === 'hen' ? '<div class="tq-hen"><label>Mở từ<input type="datetime-local" data-gio="tu" value="' + oGio(m.tu) + '"></label>' +
          '<label>Đóng lúc<input type="datetime-local" data-gio="den" value="' + oGio(m.den) + '"></label>' +
          '<p class="tq-goi">Bỏ trống “Mở từ” = mở ngay · bỏ trống “Đóng lúc” = mở mãi. Ngoài khoảng này học sinh thấy lời nhắn bên dưới.</p></div>' : '') +
        '<div class="tq-dong2"><span class="tq-nhan">Mở cho lớp</span><div class="tq-chips"><button type="button" data-lop=""' + (tatCa ? ' class="chon"' : '') + '>Tất cả lớp</button>' +
          S.lops.map(function (l) { return '<button type="button" data-lop="' + E(l.ma) + '"' + (!tatCa && m.lops.indexOf(l.ma) >= 0 ? ' class="chon"' : '') + '>' + E(l.ten || l.ma) + '</button>'; }).join('') + '</div></div>' +
        '<div class="tq-dong2"><span class="tq-nhan">Lời nhắn khi đóng</span><textarea rows="2" maxlength="300" data-nhan placeholder="' + E(TQ().CHU_DONG[ch.ma] || '') + '">' + E(m.nhan || '') + '</textarea></div>' +
        '</div>';
    }).join('') + '</div>';
    $$('.tq-the', $('#tqThan')).forEach(function (el) {
      var m = S.c.tro[t.ma][el.getAttribute('data-che')];
      $$('[data-che-v]', el).forEach(function (b) { b.onclick = function () {
        m.che = b.getAttribute('data-che-v');
        if (m.che === 'hen' && !m.tu && !m.den) { var d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); m.tu = d.getTime(); m.den = m.tu + 7 * 864e5; }
        ve();
      }; });
      $$('[data-gio]', el).forEach(function (i) { i.onchange = function () { m[i.getAttribute('data-gio')] = tuOGio(i.value); ve(); }; });
      $$('[data-lop]', el).forEach(function (b) { b.onclick = function () {
        var l = b.getAttribute('data-lop'); m.lops = m.lops || [];
        if (!l) m.lops = []; else { var k = m.lops.indexOf(l); if (k >= 0) m.lops.splice(k, 1); else m.lops.push(l); }
        ve();
      }; });
      $('[data-nhan]', el).oninput = function () { m.nhan = this.value; veLuu(); };
    });
  }
  function veLuu() {
    var o = $('#tqLuu');
    if (S.xem === 'chan') { o.innerHTML = '<span class="tq-goi">Chặn / mở khoá được lưu ngay khi bấm.</span>'; return; }
    var doi = chuaLuu();
    o.innerHTML = '<span class="tq-goi' + (doi ? ' doi' : '') + '">' + (doi ? '● Có thay đổi chưa lưu' : S.c.capNhat ? 'Đã lưu lúc ' + chuLuc(S.c.capNhat) : 'Chưa lưu lần nào — đang dùng mặc định (Giao hữu tắt, Đấu giải + Luyện tập bật)') + '</span>' +
      (doi ? '<button type="button" class="tq-nut phu" data-huy>Huỷ thay đổi</button>' : '') +
      '<button type="button" class="tq-nut" data-luu' + (doi ? '' : ' disabled') + '>Lưu thay đổi</button>';
    var h = $('[data-huy]', o); if (h) h.onclick = function () { var g = JSON.parse(S.goc); Object.keys(g).forEach(function (k) { S.c.tro[k] = g[k]; }); ve(); };
    $('[data-luu]', o).onclick = async function () {
      var b = this; b.disabled = true; b.textContent = 'Đang lưu…';
      try { await luuCheDo(); toast('Đã lưu — học sinh thấy thay đổi trong khoảng 1 phút (hoặc khi mở lại trang).'); ve(); }
      catch (e) { toast(chuLoi(e), true); b.disabled = false; b.textContent = 'Lưu thay đổi'; }
    };
  }

  // ── học sinh bị chặn ──
  function cacCheDo() { var ds = []; TQ().TRO.forEach(function (t) { t.che.forEach(function (ch) { ds.push({ tro: t.ma, che: ch.ma, chu: (TQ().TRO.length > 1 ? t.ten + ' · ' : '') + ch.ten }); }); }); return ds; }
  function chuCheDo(x) { var ra = []; cacCheDo().forEach(function (c) { if (((x.tro || {})[c.tro] || []).indexOf(c.che) >= 0) ra.push(c.chu); }); return ra; }
  async function veChan() {
    $('#tqTieuDe').innerHTML = 'Học sinh bị chặn<small>Em bị chặn bấm vào chế độ đó sẽ thấy “Thầy Andrew đang tạm khoá…”</small>';
    var than = $('#tqThan'), bay = Date.now();
    var dsChan = Object.keys(S.c.chan).map(function (u) { return Object.assign({ uid: u }, S.c.chan[u]); })
      .sort(function (a, b) { return (b.luc || 0) - (a.luc || 0); });
    var hs = S.chonLop ? await napHs(S.chonLop).catch(function () { return []; }) : [];
    var tim = S.tim.trim().toLowerCase(), hsLoc = hs.filter(function (x) { return !tim || String(x.ten).toLowerCase().indexOf(tim) >= 0; });
    var c = S.chonHs, cu = c && S.c.chan[c.uid];
    var form = '';
    if (c) {
      var chon = cu ? chuCheDo(cu) : null, han = c.han != null ? c.han : (cu ? -1 : 0);
      form = '<div class="tq-form"><div class="tq-form-dau">' + av(c) + '<div><b>' + E(c.ten) + '</b><small>' + E(tenLop(c.lop)) + (cu ? ' · đang bị chặn' : '') + '</small></div>' +
          '<button type="button" class="tq-x" data-bo-chon aria-label="Bỏ chọn">' + I.x + '</button></div>' +
        '<span class="tq-nhan">Chặn chế độ</span><div class="tq-chips">' + cacCheDo().map(function (k) {
          return '<label class="tq-hop-chon"><input type="checkbox" data-k="' + k.tro + ':' + k.che + '"' + (!chon || chon.indexOf(k.chu) >= 0 ? ' checked' : '') + '>' + E(k.chu) + '</label>'; }).join('') + '</div>' +
        '<span class="tq-nhan">Thời hạn</span><div class="tq-chips">' + HAN.map(function (h) { return '<button type="button" data-han="' + h[0] + '"' + (han === h[0] ? ' class="chon"' : '') + '>' + h[1] + '</button>'; }).join('') +
          (cu && cu.den && han === -1 ? '<button type="button" class="chon" data-han="-1">Giữ: tới ' + E(chuLuc(cu.den)) + '</button>' : '') + '</div>' +
        '<span class="tq-nhan">Lý do (em thấy)</span><input type="text" class="tq-o" maxlength="120" data-ly placeholder="Ví dụ: chơi quá nhiều giờ học" value="' + E(cu ? cu.ly || '' : '') + '">' +
        '<div class="tq-form-nut">' + (cu ? '<button type="button" class="tq-nut phu" data-mo="' + E(c.uid) + '">' + I.mo + 'Mở khoá</button>' : '') +
          '<button type="button" class="tq-nut do" data-chan>' + I.khoa + (cu ? 'Lưu chặn' : 'Chặn em này') + '</button></div></div>';
    }
    than.innerHTML = '<div class="tq-chan">' +
      '<div class="tq-the"><div class="tq-the-dau"><div><b>Chặn một em</b><small>Chọn lớp, bấm tên em</small></div></div>' +
        '<div class="tq-hang"><select class="tq-o" data-chon-lop>' + S.lops.map(function (l) { return '<option value="' + E(l.ma) + '"' + (l.ma === S.chonLop ? ' selected' : '') + '>' + E(l.ten || l.ma) + '</option>'; }).join('') + '</select>' +
          '<label class="tq-tim">' + I.tim + '<input type="search" class="tq-o" data-tim placeholder="Tìm tên" value="' + E(S.tim) + '"></label></div>' +
        '<div class="tq-ds-hs">' + (hsLoc.length ? hsLoc.map(function (x) {
          var bi = S.c.chan[x.uid] && (!S.c.chan[x.uid].den || S.c.chan[x.uid].den > bay);
          return '<button type="button" class="tq-hs' + (c && c.uid === x.uid ? ' chon' : '') + '" data-hs="' + E(x.uid) + '">' + av(x) + '<span>' + E(x.ten) + '</span>' + (bi ? '<em>' + I.khoa + '</em>' : '') + '</button>';
        }).join('') : '<div class="tq-rong nho">' + (S.lops.length ? 'Không có em nào.' : 'Chưa có danh sách lớp (nwCauHinh/lop).') + '</div>') + '</div>' + form + '</div>' +
      '<div class="tq-the"><div class="tq-the-dau"><div><b>Đang bị chặn</b><small>' + dsChan.length + ' em</small></div></div>' +
        (dsChan.length ? '<div class="tq-ds-chan">' + dsChan.map(function (x) {
          var het = x.den && x.den <= bay;
          return '<div class="tq-dong-chan' + (het ? ' het' : '') + '">' + av(x) + '<div class="tq-noi"><b>' + E(x.ten || x.uid) + '<span class="tq-lop">' + E(tenLop(x.lop)) + '</span></b>' +
            '<small>' + E(chuCheDo(x).join(' · ') || '—') + '</small><small>' + (het ? 'Đã hết hạn ' + E(chuLuc(x.den)) : x.den ? 'Tới ' + E(chuLuc(x.den)) : 'Tới khi thầy mở') + (x.ly ? ' · ' + E(x.ly) : '') + '</small></div>' +
            '<button type="button" class="tq-nut phu nho" data-sua="' + E(x.uid) + '">Sửa</button><button type="button" class="tq-nut phu nho" data-mo="' + E(x.uid) + '">' + (het ? 'Xoá' : 'Mở khoá') + '</button></div>';
        }).join('') + '</div>' : '<div class="tq-rong nho">Chưa chặn em nào.</div>') + '</div></div>';

    $('[data-chon-lop]', than).onchange = function () { S.chonLop = this.value; S.chonHs = null; veChan(); };
    var o = $('[data-tim]', than); o.oninput = function () { S.tim = o.value; var vt = o.selectionStart; veChan().then(function () { var n = $('[data-tim]'); if (n) { n.focus(); try { n.setSelectionRange(vt, vt); } catch (e) { } } }); };
    $$('[data-hs]', than).forEach(function (b) { b.onclick = function () { var x = hs.filter(function (y) { return y.uid === b.getAttribute('data-hs'); })[0]; S.chonHs = x ? Object.assign({}, x) : null; veChan(); }; });
    $$('[data-sua]', than).forEach(function (b) { b.onclick = function () { var u = b.getAttribute('data-sua'), x = S.c.chan[u] || {}; S.chonHs = { uid: u, ten: x.ten, lop: x.lop, anh: x.anh || '' }; than.scrollTop = 0; veChan(); }; });
    $$('[data-mo]', than).forEach(function (b) { b.onclick = async function () {
      var u = b.getAttribute('data-mo'), ten = (S.c.chan[u] || {}).ten || 'em'; b.disabled = true;
      try { await luuChan(u, null); toast('Đã mở khoá cho ' + ten + '.');if (S.chonHs && S.chonHs.uid === u) S.chonHs = null; veNav(); veChan(); }
      catch (e) { toast(chuLoi(e), true); b.disabled = false; }
    }; });
    if (!c) return;
    var bc = $('[data-bo-chon]', than); if (bc) bc.onclick = function () { S.chonHs = null; veChan(); };
    $$('[data-han]', than).forEach(function (b) { b.onclick = function () { c.han = +b.getAttribute('data-han'); $$('[data-han]', than).forEach(function (x) { x.classList.toggle('chon', x === b); }); }; });
    $('[data-chan]', than).onclick = async function () {
      var tro = {};
      $$('[data-k]', than).forEach(function (i) { if (!i.checked) return; var p = i.getAttribute('data-k').split(':'); (tro[p[0]] = tro[p[0]] || []).push(p[1]); });
      if (!Object.keys(tro).length) return toast('Thầy chọn ít nhất một chế độ để chặn.', true);
      var han = c.han != null ? c.han : (cu ? -1 : 0);
      var den = han === -1 && cu ? cu.den || 0 : han > 0 ? Date.now() + han * 864e5 : 0;
      var muc = { ten: c.ten || '', lop: c.lop || '', tro: tro, den: den, ly: String($('[data-ly]', than).value || '').trim().slice(0, 120), luc: Date.now() };
      if (c.anh) muc.anh = c.anh;
      var b = this; b.disabled = true;
      try { await luuChan(c.uid, muc); toast('Đã chặn ' + c.ten + (den ? ' tới ' + chuLuc(den) : '') + '.'); S.chonHs = null; veNav(); veChan(); }
      catch (e) { toast(chuLoi(e), true); b.disabled = false; }
    };
  }

  window.TdQl = { mo: mo };
})();
