/* ============================================================
   td-ql.js — HỘP "QUẢN LÝ GIẢI ĐẤU" TRÊN DASHBOARD (24/10/2026, web v1.415.0 — thầy yêu cầu; tên cũ "Quản lý thách đấu").
   Mở từ mục "Quản lý giải đấu" ở cột trái (js/nw-thanh.js ⇒ window.TdQl.mo()) hoặc nút 📊 ở dải A SHOW SPEED khung chat (TdQl.mo({ the: 'xh' })).
   ⭐ v1.446.0 (29/10/2026, mẫu thầy duyệt `D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\quan-tri-ass-v2`): bỏ cột trái —
     4 THẺ NGANG (Giao hữu · Đấu giải · Luyện tập · Xếp hạng, mỗi thẻ trạng thái + 3 số) ⇒ bấm thẻ: DẢI thông số + nút ⚙ Cài đặt ở cuối
     (mọi thiết đặt của chế độ gập trong nút này: bật/tắt/hẹn giờ/lớp/bắt buộc/lời nhắn; Xếp hạng thêm mùa — js/xh-ql.js) ⇒ các TAB xem
     (js/td-xem.js: tất cả trận · chi tiết trận · hồ sơ em · bảng xếp hạng mùa + mọi thời đại · giải đang chạy · các mùa).
     "Học sinh bị chặn" = nút trên đầu hộp (mở trong cùng bảng gập).

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
    tim: SV('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
    cup: SV('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/>')
  };
  var MAU = ['#0E7C6E', '#3E7BFA', '#E0575B', '#F0821E', '#18A957', '#8b5cf6', '#0891b2', '#db2777'];
  var HAN = [[0, 'Tới khi thầy mở'], [1, '1 ngày'], [3, '3 ngày'], [7, '7 ngày'], [30, '30 ngày']];

  var TQ = function () { return window.TdQuan; };
  var laThu = function () { return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && (/[?&]thu=/.test(location.search) || (TQ() && TQ().thuLocal)); };
  // S.c = bản đang sửa · S.goc = JSON bản đã lưu (so để biết "chưa lưu")
  var S = { c: null, goc: '', xem: 'ass', the: 'xh', tab: 'tran', bang: '', lops: [], hs: {}, chonLop: '', tim: '', chonHs: null, f: null, tk: null };

  // ── kho ──
  function kho() {
    if (S.f) return Promise.resolve(S.f);
    var p = window.TheTD && TheTD.kho ? TheTD.kho() : window.AWChat && AWChat.db ? AWChat.db() : Promise.reject(new Error('chưa có kho'));
    return p.then(function (f) { S.f = f; return f; });
  }
  function ref(f) { return f.fs.doc(f.db, 'nwCauHinh', 'thachDau'); }
  // ⭐ v1.444.0 (28/10, thầy chốt) — BẮT BUỘC HOÀN THÀNH TRẬN: chế độ có trận 1–1 thật mang `buoc` (thiếu = BẬT). Máy chủ (tran-dau.js docBuoc)
  //   đọc lúc trận bắt đầu ⇒ khoá trận trên hồ sơ em + giấu nút Rời trận (js/giu-tran.js · nw/js/tran.js · nw/js/xh-tran.js). Luyện tập không có.
  var BUOC = ['gh', 'giai', 'xh'];
  function sach(c) {   // bản ghi xuống kho: đủ khoá từng chế độ (merge không để sót khoá cũ)
    var tro = {};
    TQ().TRO.forEach(function (t) {
      tro[t.ma] = {};
      t.che.forEach(function (ch) {
        var m = (c.tro[t.ma] || {})[ch.ma] || {};
        tro[t.ma][ch.ma] = { che: m.che || 'bat', tu: +m.tu || 0, den: +m.den || 0, lops: (m.lops || []).slice(), nhan: String(m.nhan || '').trim().slice(0, 300) };
        if (t.ma === 'ass' && BUOC.indexOf(ch.ma) >= 0) tro[t.ma][ch.ma].buoc = m.buoc !== false;
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
  function av(x) { return x.anh ? '<img class="tdq-av" src="' + E(x.anh) + '" alt="">' : '<span class="tdq-av" style="background:' + mauTen(x.ten) + '">' + E(chuTat(x.ten)) + '</span>'; }
  function tenLop(ma) { var l = S.lops.filter(function (x) { return x.ma === ma; })[0]; return l ? (l.ten || l.ma) : ma; }
  function chuLuc(ms) { return TQ().ngayGio(ms); }
  // giá trị ô datetime-local ⇄ ms (giờ máy thầy = giờ VN)
  function oGio(ms) { if (!ms) return ''; var d = new Date(ms); return d.getFullYear() + '-' + hai(d.getMonth() + 1) + '-' + hai(d.getDate()) + 'T' + hai(d.getHours()) + ':' + hai(d.getMinutes()); }
  function tuOGio(v) { if (!v) return 0; var t = new Date(v).getTime(); return isNaN(t) ? 0 : t; }
  var toastT;
  function toast(chu, loi) {
    var t = $('#tdqToast'); if (!t) { t = document.createElement('div'); t.id = 'tdqToast'; t.className = 'tdq-toast'; document.body.appendChild(t); }
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
    if ($('#tdqNen')) return $('#tdqNen');
    var n = document.createElement('div'); n.id = 'tdqNen'; n.className = 'tdq-nen'; n.hidden = true;
    n.innerHTML = '<div class="tdq-hop tdq2" role="dialog" aria-modal="true" aria-label="Quản lý giải đấu">' +
      '<header class="tdq2-tren"><span class="tdq-ic">' + I.cup + '</span><h3>Quản lý giải đấu<span>A Show Speed · trò chơi của học sinh</span></h3>' +
        '<button type="button" class="tdq-nut phu nho" data-bang="chan">' + I.chan + 'Học sinh bị chặn<em class="tdq2-dem" id="tdqDemChan" hidden></em></button>' +
        '<button class="tdq-dong" type="button" aria-label="Đóng">' + I.x + '</button></header>' +
      '<div class="tdq2-cuon" id="tdqCuon"><div class="tdq2-the4" id="tdqThe4"></div><div class="tdq2-dai" id="tdqDai"></div>' +
        '<section class="tdq2-bang" id="tdqBang" hidden><header class="tdq-tren"><h2 id="tdqTieuDe"></h2><button type="button" class="tdq-x" data-bang-dong aria-label="Đóng cài đặt">' + I.x + '</button></header>' +
          '<div class="tdq-than" id="tdqThan"></div><footer class="tdq-chan-luu" id="tdqLuu"></footer>' +
          '<div class="tdq2-xh" id="tdqXh" hidden><header class="tdq-tren"><h2 id="tdqXhTd"></h2></header><div class="tdq-than" id="tdqXhThan"></div><footer class="tdq-chan-luu" id="tdqXhLuu"></footer></div></section>' +
        '<nav class="tdq2-tabs" id="tdqTabs"></nav><div class="tdq2-noi" id="tdqNoi"></div></div></div>';
    document.body.appendChild(n);
    $('.tdq-dong', n).onclick = dong;
    $('[data-bang="chan"]', n).onclick = function () { moBang(S.bang === 'chan' ? '' : 'chan'); };
    $('[data-bang-dong]', n).onclick = function () { moBang(''); };
    n.addEventListener('mousedown', function (e) { if (e.target === n) dong(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !n.hidden) dong(); });
    return n;
  }
  function dong() {
    if (chuaLuu() && !confirm('Còn thay đổi CHƯA LƯU ở phần chế độ chơi. Đóng và bỏ các thay đổi đó?')) return;
    $('#tdqNen').hidden = true;
  }
  async function mo(o) {
    if (o && o.the && THE[o.the]) { S.the = o.the; S.tab = TAB(o.the)[0][0]; }   // v1.445.0 — nút 📊 ở dải A SHOW SPEED khung chat dashboard (js/dang-dau.js)
    if (!TQ()) return alert('Chưa nạp được js/the-td.js — thầy tải lại trang nhé.');
    var n = dungKhung(); n.hidden = false; S.bang = ''; $('#tdqBang').hidden = true;
    $('#tdqThe4').innerHTML = ''; $('#tdqDai').innerHTML = ''; $('#tdqTabs').innerHTML = ''; $('#tdqNoi').innerHTML = '<div class="tdq-rong">Đang tải…</div>';
    try {
      var r = await Promise.all([TQ().nap(true), napLop()]);
      S.c = JSON.parse(JSON.stringify(r[0])); S.c.chan = S.c.chan || {};
      S.lops = r[1]; S.goc = JSON.stringify(sach(S.c)); S.chonHs = null;
      if (!S.chonLop && S.lops[0]) S.chonLop = S.lops[0].ma;
    } catch (e) { $('#tdqNoi').innerHTML = '<div class="tdq-rong">Chưa tải được cài đặt: ' + E(chuLoi(e)) + '</div>'; return; }
    if (window.TdXem) TdXem.xoaNho();
    S.tk = null; ve(); napThongKe();
  }
  function napThongKe() {
    if (!window.TdXem) return;
    TdXem.thongKe({ kho: kho, laThu: laThu() }).then(function (tk) { S.tk = tk; veThe4(); veDai(); }).catch(function (e) { console.warn('[td-ql] thống kê', e); });
  }

  // ── vẽ ──
  // ⭐ v1.446.0 — 4 THẺ (chế độ của A Show Speed) · dải · bảng gập (⚙ Cài đặt / Học sinh bị chặn) · tab (js/td-xem.js)
  var THE = {
    gh: { ten: 'Giao hữu', ic: '🤝', m: '#12A58F' }, giai: { ten: 'Đấu giải', ic: '🏆', m: '#E0A11B' },
    luyen: { ten: 'Luyện tập', ic: '🎯', m: '#1C7FD6' }, xh: { ten: 'Xếp hạng', ic: '⚡', m: '#8B5CF6' }
  };
  var THU_TU = ['gh', 'giai', 'luyen', 'xh'];
  function TAB(the) { return (window.TdXem && TdXem.TAB[the]) || [['luyen', 'Thông tin']]; }
  function cheDo(the) { var t = TQ().TRO[0]; S.c.tro[t.ma] = S.c.tro[t.ma] || {}; return S.c.tro[t.ma][the] = S.c.tro[t.ma][the] || { che: 'bat' }; }
  var soN = function (n) { return n == null ? '—' : Number(n).toLocaleString('vi-VN'); };
  function ve() { veThe4(); veDai(); veBang(); veTab(); }
  function veThe4() {
    var tk = S.tk || {};
    $('#tdqThe4').innerHTML = THU_TU.map(function (k) {
      var x = THE[k], p = pill(cheDo(k)), t = tk[k] || {}, o3;
      if (k === 'luyen') o3 = [['—', 'Không ghi số liệu']];
      else if (k === 'xh') o3 = [[soN(t.homNay), 'Hôm nay'], [soN(t.dang), 'Đang đấu'], [soN(tk.mua && tk.mua.em), 'Em mùa này']];
      else o3 = [[soN(t.homNay), 'Hôm nay'], [soN(t.dang), 'Đang đấu'], [t.coTong ? soN(t.tong) : '—', 'Tổng trận']];
      if (!S.tk && k !== 'luyen') o3 = o3.map(function (y) { return ['…', y[1]]; });
      var chu = k === 'xh' && tk.mua && p.cls !== 'off' ? tk.mua.ten + ' · ' + (tk.mua.tt === 'dung' ? 'tạm dừng' : 'đang chạy') : k === 'giai' && tk.dsGiai && p.cls !== 'off' ? 'Đang mở · ' + tk.dsGiai.dang + ' giải' : p.chu;
      return '<button type="button" class="tdq2-the' + (S.the === k ? ' chon' : '') + '" style="--m:' + x.m + '" data-the="' + k + '"><span class="tdq2-the-dau"><span class="tdq2-bieu">' + x.ic + '</span>' +
        '<span><b>' + E(x.ten) + '</b><span class="tdq-pill ' + p.cls + '">' + E(chu) + '</span></span></span>' +
        '<span class="tdq2-so">' + o3.map(function (y) { return '<span><i>' + y[0] + '</i><small>' + E(y[1]) + '</small></span>'; }).join('') + '</span></button>';
    }).join('');
    $$('[data-the]', $('#tdqThe4')).forEach(function (b) { b.onclick = function () {
      var k = b.getAttribute('data-the'); if (k === S.the) return;
      if (S.bang === 'cai' && chuaLuu() && !confirm('Còn thay đổi CHƯA LƯU ở cài đặt ' + THE[S.the].ten + '. Chuyển thẻ và bỏ các thay đổi đó?')) return;
      if (S.bang === 'cai') { var g = JSON.parse(S.goc); Object.keys(g).forEach(function (q) { S.c.tro[q] = g[q]; }); S.bang = ''; }
      S.the = k; S.tab = TAB(k)[0][0]; ve();
    }; });
    var d = $('#tdqDemChan'), n = soChan(); d.hidden = !n; d.textContent = n;
  }
  function veDai() {
    var k = S.the, m = cheDo(k), tk = S.tk || {}, t = tk[k] || {}, o = [];
    var tt = TQ().trangThai(m);
    o.push([tt.mo ? 'Đang mở' : tt.sap ? 'Hẹn mở' : 'Đang tắt', tt.het ? 'đóng lúc ' + chuLuc(tt.het) : tt.sap ? 'lúc ' + chuLuc(tt.sap) : 'Trạng thái', 1]);
    if (k === 'xh' && tk.mua) {
      o.push([tk.mua.ten, chuNgay(tk.mua.tu) + ' → ' + chuNgay(tk.mua.den), 1], [tk.mua.conLai + ' ngày', 'Còn lại', 1]);
      o.push([soN(t.dang), 'Đang đấu'], [soN(t.homNay), 'Trận hôm nay'], [soN(t.em), 'Em đấu hôm nay'], [soN(t.bo), 'Bỏ dở hôm nay']);
      if (tk.mua.so1) o.push([soN(tk.mua.so1.diem), 'Số 1 · ' + tk.mua.so1.ten]);
    } else if (k === 'luyen') {
      o.push([m.lops && m.lops.length ? m.lops.length + ' lớp' : 'Tất cả lớp', 'Mở cho', 1], ['Không ghi', 'Số liệu', 1]);
    } else {
      o.push([m.lops && m.lops.length ? m.lops.length + ' lớp' : 'Tất cả lớp', 'Mở cho', 1]);
      if (k === 'giai' && tk.dsGiai) o.push([tk.dsGiai.dang ? tk.dsGiai.ten : 'Không có', 'Giải đang chạy', 1]);
      o.push([m.buoc !== false ? 'Bật' : 'Tắt', 'Bắt buộc xong trận', 1], [soN(t.homNay), 'Trận hôm nay'], [soN(t.em), 'Em đấu hôm nay'], [soN(t.bo), 'Bỏ dở hôm nay']);
      if (t.coTong) o.push([soN(t.tong), k === 'gh' ? 'Tổng · ' + soN(t.thay) + ' với thầy' : 'Tổng trận']);
    }
    if (!S.tk && k !== 'luyen') o = o.map(function (x) { return x[2] ? x : ['…', x[1]]; });
    $('#tdqDai').innerHTML = o.map(function (x) { return '<div class="tdq2-o' + (x[2] ? ' chu' : '') + '"><b>' + E(x[0]) + '</b><small>' + E(x[1]) + '</small></div>'; }).join('') +
      '<span class="tdq2-gian"></span><button type="button" class="tdq2-cai' + (S.bang === 'cai' ? ' on' : '') + '" data-cai><svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>Cài đặt</button>';
    $('.tdq2').style.setProperty('--m', THE[k].m);
    $('[data-cai]', $('#tdqDai')).onclick = function () { moBang(S.bang === 'cai' ? '' : 'cai'); };
  }
  function chuNgay(ms) { var d = new Date(ms); return d.getDate() + '/' + (d.getMonth() + 1); }
  function moBang(b) {
    if (S.bang === 'cai' && b !== 'cai' && chuaLuu() && !confirm('Còn thay đổi CHƯA LƯU ở cài đặt. Đóng và bỏ các thay đổi đó?')) return;
    if (S.bang === 'cai' && b !== 'cai') { var g = JSON.parse(S.goc); Object.keys(g).forEach(function (q) { S.c.tro[q] = g[q]; }); }
    S.bang = b; veDai(); veBang();
    if (b) { var el = $('#tdqBang'); if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  function veBang() {
    var el = $('#tdqBang'), xh = $('#tdqXh');
    el.hidden = !S.bang;
    if (!S.bang || S.bang === 'chan' || S.the !== 'xh') { xh.hidden = true; S.xhVe = false; }
    if (!S.bang) return;
    if (S.bang === 'chan') { S.xem = 'chan'; veChan(); veLuu(); return; }
    S.xem = TQ().TRO[0].ma; veTro(); veLuu();
    if (S.the === 'xh') {
      xh.hidden = false;
      if (S.xhVe) return;   // mùa đã vẽ: bấm Bật/Tắt ở trên không nạp lại mùa
      S.xhVe = true;
      if (window.XhQl) XhQl.ve({ than: $('#tdqXhThan'), tieuDe: $('#tdqXhTd'), luu: $('#tdqXhLuu'), kho: kho, toast: toast, laThu: laThu() });
      else $('#tdqXhThan').innerHTML = '<div class="tdq-rong">Chưa nạp js/xh-ql.js — thầy tải lại trang nhé.</div>';
    }
  }
  function veTab() {
    var ds = TAB(S.the);
    if (!ds.some(function (x) { return x[0] === S.tab; }) && S.tab !== 'ct') S.tab = ds[0][0];
    $('#tdqTabs').innerHTML = ds.map(function (x) { return '<button type="button" data-tab="' + x[0] + '"' + (x[0] === S.tab || (S.tab === 'ct' && x[0] === 'tran') ? ' class="chon"' : '') + '>' + E(x[1]) + '</button>'; }).join('');
    $$('[data-tab]', $('#tdqTabs')).forEach(function (b) { b.onclick = function () { doiTab(b.getAttribute('data-tab')); }; });
    if (window.TdXem) TdXem.ve($('#tdqNoi'), { the: S.the, tab: S.tab, kho: kho, laThu: laThu(), doi: doiTab });
    else $('#tdqNoi').innerHTML = '<div class="tdq-rong">Chưa nạp js/td-xem.js — thầy tải lại trang nhé.</div>';
  }
  function doiTab(tab) { S.tab = tab; veTab(); var c = $('#tdqCuon'), t = $('#tdqTabs'); if (c && t && c.scrollTop > t.offsetTop) c.scrollTop = t.offsetTop - 8; }
  function veTro() {
    var t = TQ().TRO.filter(function (x) { return x.ma === S.xem; })[0] || TQ().TRO[0]; S.xem = t.ma;
    $('#tdqTieuDe').innerHTML = 'Cài đặt · ' + E((THE[S.the] || {}).ten || t.ten) + '<small>Bật, tắt, hẹn giờ, chọn lớp' + (S.the === 'xh' ? ' · mùa xếp hạng ở dưới' : S.the === 'giai' ? ' · tạo giải, giới hạn chơi ở trang Giải đấu' : '') + '</small>';
    S.c.tro[t.ma] = S.c.tro[t.ma] || {};
    $('#tdqThan').innerHTML = '<div class="tdq-luoi">' + t.che.filter(function (ch) { return ch.ma === S.the; }).map(function (ch) {
      var m = S.c.tro[t.ma][ch.ma] = S.c.tro[t.ma][ch.ma] || { che: 'bat' }, p = pill(m), tatCa = !(m.lops && m.lops.length);
      var seg = function (v, chu) { return '<button type="button" data-che-v="' + v + '"' + ((m.che || 'bat') === v ? ' class="chon"' : '') + '>' + chu + '</button>'; };
      return '<div class="tdq-the" data-che="' + ch.ma + '">' +
        '<div class="tdq-the-dau"><div><b>' + E(ch.ten) + '</b><small>' + E(ch.mo) + '</small></div><span class="tdq-pill ' + p.cls + '">' + E(p.chu) + '</span></div>' +
        '<div class="tdq-seg">' + seg('bat', 'Bật') + seg('tat', 'Tắt') + seg('hen', I.gio + 'Hẹn giờ') + '</div>' +
        (m.che === 'hen' ? '<div class="tdq-hen"><label>Mở từ<input type="datetime-local" data-gio="tu" value="' + oGio(m.tu) + '"></label>' +
          '<label>Đóng lúc<input type="datetime-local" data-gio="den" value="' + oGio(m.den) + '"></label>' +
          '<p class="tdq-goi">Bỏ trống “Mở từ” = mở ngay · bỏ trống “Đóng lúc” = mở mãi. Ngoài khoảng này học sinh thấy lời nhắn bên dưới.</p></div>' : '') +
        '<div class="tdq-dong2"><span class="tdq-nhan">Mở cho lớp</span><div class="tdq-chips"><button type="button" data-lop=""' + (tatCa ? ' class="chon"' : '') + '>Tất cả lớp</button>' +
          S.lops.map(function (l) { return '<button type="button" data-lop="' + E(l.ma) + '"' + (!tatCa && m.lops.indexOf(l.ma) >= 0 ? ' class="chon"' : '') + '>' + E(l.ten || l.ma) + '</button>'; }).join('') + '</div></div>' +
        (t.ma === 'ass' && BUOC.indexOf(ch.ma) >= 0 ? '<div class="tdq-dong2"><span class="tdq-nhan">Bắt buộc hoàn thành trận</span><div class="tdq-chips">' +
          '<button type="button" data-buoc="1"' + (m.buoc !== false ? ' class="chon"' : '') + '>Bật</button><button type="button" data-buoc="0"' + (m.buoc === false ? ' class="chon"' : '') + '>Tắt</button></div>' +
          '<p class="tdq-goi">Bật: đang đấu không có nút Rời trận; em mở trang khác / tải lại / đóng rồi mở lại web đều bị đưa về trận cho tới khi xong.</p></div>' : '') +
        '<div class="tdq-dong2"><span class="tdq-nhan">Lời nhắn khi đóng</span><textarea rows="2" maxlength="300" data-nhan placeholder="' + E(TQ().CHU_DONG[ch.ma] || '') + '">' + E(m.nhan || '') + '</textarea></div>' +
        '</div>';
    }).join('') + '</div>';
    $$('.tdq-the', $('#tdqThan')).forEach(function (el) {
      var m = S.c.tro[t.ma][el.getAttribute('data-che')];
      $$('[data-che-v]', el).forEach(function (b) { b.onclick = function () {
        m.che = b.getAttribute('data-che-v');
        if (m.che === 'hen' && !m.tu && !m.den) { var d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); m.tu = d.getTime(); m.den = m.tu + 7 * 864e5; }
        veBang();
      }; });
      $$('[data-gio]', el).forEach(function (i) { i.onchange = function () { m[i.getAttribute('data-gio')] = tuOGio(i.value); veBang(); }; });
      $$('[data-lop]', el).forEach(function (b) { b.onclick = function () {
        var l = b.getAttribute('data-lop'); m.lops = m.lops || [];
        if (!l) m.lops = []; else { var k = m.lops.indexOf(l); if (k >= 0) m.lops.splice(k, 1); else m.lops.push(l); }
        veBang();
      }; });
      $$('[data-buoc]', el).forEach(function (b) { b.onclick = function () { m.buoc = b.getAttribute('data-buoc') === '1'; veBang(); }; });
      $('[data-nhan]', el).oninput = function () { m.nhan = this.value; veLuu(); };
    });
  }
  function veLuu() {
    var o = $('#tdqLuu');
    if (S.xem === 'chan') { o.innerHTML = '<span class="tdq-goi">Chặn / mở khoá được lưu ngay khi bấm.</span>'; return; }
    var doi = chuaLuu();
    o.innerHTML = '<span class="tdq-goi' + (doi ? ' doi' : '') + '">' + (doi ? '● Có thay đổi chưa lưu' : S.c.capNhat ? 'Đã lưu lúc ' + chuLuc(S.c.capNhat) : 'Chưa lưu lần nào — đang dùng mặc định (Giao hữu tắt, Đấu giải + Luyện tập bật)') + '</span>' +
      (doi ? '<button type="button" class="tdq-nut phu" data-huy>Huỷ thay đổi</button>' : '') +
      '<button type="button" class="tdq-nut" data-luu' + (doi ? '' : ' disabled') + '>Lưu thay đổi</button>';
    var h = $('[data-huy]', o); if (h) h.onclick = function () { var g = JSON.parse(S.goc); Object.keys(g).forEach(function (k) { S.c.tro[k] = g[k]; }); veBang(); veDai(); veThe4(); };
    $('[data-luu]', o).onclick = async function () {
      var b = this; b.disabled = true; b.textContent = 'Đang lưu…';
      try { await luuCheDo(); toast('Đã lưu — học sinh thấy thay đổi trong khoảng 1 phút (hoặc khi mở lại trang).'); veThe4(); veDai(); veBang(); }
      catch (e) { toast(chuLoi(e), true); b.disabled = false; b.textContent = 'Lưu thay đổi'; }
    };
  }

  // ── học sinh bị chặn ──
  function cacCheDo() { var ds = []; TQ().TRO.forEach(function (t) { t.che.forEach(function (ch) { ds.push({ tro: t.ma, che: ch.ma, chu: (TQ().TRO.length > 1 ? t.ten + ' · ' : '') + ch.ten }); }); }); return ds; }
  function chuCheDo(x) { var ra = []; cacCheDo().forEach(function (c) { if (((x.tro || {})[c.tro] || []).indexOf(c.che) >= 0) ra.push(c.chu); }); return ra; }
  async function veChan() {
    $('#tdqTieuDe').innerHTML = 'Học sinh bị chặn<small>Em bị chặn bấm vào chế độ đó sẽ thấy “Thầy Andrew đang tạm khoá…”</small>';
    var than = $('#tdqThan'), bay = Date.now();
    var dsChan = Object.keys(S.c.chan).map(function (u) { return Object.assign({ uid: u }, S.c.chan[u]); })
      .sort(function (a, b) { return (b.luc || 0) - (a.luc || 0); });
    var hs = S.chonLop ? await napHs(S.chonLop).catch(function () { return []; }) : [];
    var tim = S.tim.trim().toLowerCase(), hsLoc = hs.filter(function (x) { return !tim || String(x.ten).toLowerCase().indexOf(tim) >= 0; });
    var c = S.chonHs, cu = c && S.c.chan[c.uid];
    var form = '';
    if (c) {
      var chon = cu ? chuCheDo(cu) : null, han = c.han != null ? c.han : (cu ? -1 : 0);
      form = '<div class="tdq-form"><div class="tdq-form-dau">' + av(c) + '<div><b>' + E(c.ten) + '</b><small>' + E(tenLop(c.lop)) + (cu ? ' · đang bị chặn' : '') + '</small></div>' +
          '<button type="button" class="tdq-x" data-bo-chon aria-label="Bỏ chọn">' + I.x + '</button></div>' +
        '<span class="tdq-nhan">Chặn chế độ</span><div class="tdq-chips">' + cacCheDo().map(function (k) {
          return '<label class="tdq-hop-chon"><input type="checkbox" data-k="' + k.tro + ':' + k.che + '"' + (!chon || chon.indexOf(k.chu) >= 0 ? ' checked' : '') + '>' + E(k.chu) + '</label>'; }).join('') + '</div>' +
        '<span class="tdq-nhan">Thời hạn</span><div class="tdq-chips">' + HAN.map(function (h) { return '<button type="button" data-han="' + h[0] + '"' + (han === h[0] ? ' class="chon"' : '') + '>' + h[1] + '</button>'; }).join('') +
          (cu && cu.den && han === -1 ? '<button type="button" class="chon" data-han="-1">Giữ: tới ' + E(chuLuc(cu.den)) + '</button>' : '') + '</div>' +
        '<span class="tdq-nhan">Lý do (em thấy)</span><input type="text" class="tdq-o" maxlength="120" data-ly placeholder="Ví dụ: chơi quá nhiều giờ học" value="' + E(cu ? cu.ly || '' : '') + '">' +
        '<div class="tdq-form-nut">' + (cu ? '<button type="button" class="tdq-nut phu" data-mo="' + E(c.uid) + '">' + I.mo + 'Mở khoá</button>' : '') +
          '<button type="button" class="tdq-nut do" data-chan>' + I.khoa + (cu ? 'Lưu chặn' : 'Chặn em này') + '</button></div></div>';
    }
    than.innerHTML = '<div class="tdq-chan">' +
      '<div class="tdq-the"><div class="tdq-the-dau"><div><b>Chặn một em</b><small>Chọn lớp, bấm tên em</small></div></div>' +
        '<div class="tdq-hang"><select class="tdq-o" data-chon-lop>' + S.lops.map(function (l) { return '<option value="' + E(l.ma) + '"' + (l.ma === S.chonLop ? ' selected' : '') + '>' + E(l.ten || l.ma) + '</option>'; }).join('') + '</select>' +
          '<label class="tdq-tim">' + I.tim + '<input type="search" class="tdq-o" data-tim placeholder="Tìm tên" value="' + E(S.tim) + '"></label></div>' +
        '<div class="tdq-ds-hs">' + (hsLoc.length ? hsLoc.map(function (x) {
          var bi = S.c.chan[x.uid] && (!S.c.chan[x.uid].den || S.c.chan[x.uid].den > bay);
          return '<button type="button" class="tdq-hs' + (c && c.uid === x.uid ? ' chon' : '') + '" data-hs="' + E(x.uid) + '">' + av(x) + '<span>' + E(x.ten) + '</span>' + (bi ? '<em>' + I.khoa + '</em>' : '') + '</button>';
        }).join('') : '<div class="tdq-rong nho">' + (S.lops.length ? 'Không có em nào.' : 'Chưa có danh sách lớp (nwCauHinh/lop).') + '</div>') + '</div>' + form + '</div>' +
      '<div class="tdq-the"><div class="tdq-the-dau"><div><b>Đang bị chặn</b><small>' + dsChan.length + ' em</small></div></div>' +
        (dsChan.length ? '<div class="tdq-ds-chan">' + dsChan.map(function (x) {
          var het = x.den && x.den <= bay;
          return '<div class="tdq-dong-chan' + (het ? ' het' : '') + '">' + av(x) + '<div class="tdq-noi"><b>' + E(x.ten || x.uid) + '<span class="tdq-lop">' + E(tenLop(x.lop)) + '</span></b>' +
            '<small>' + E(chuCheDo(x).join(' · ') || '—') + '</small><small>' + (het ? 'Đã hết hạn ' + E(chuLuc(x.den)) : x.den ? 'Tới ' + E(chuLuc(x.den)) : 'Tới khi thầy mở') + (x.ly ? ' · ' + E(x.ly) : '') + '</small></div>' +
            '<button type="button" class="tdq-nut phu nho" data-sua="' + E(x.uid) + '">Sửa</button><button type="button" class="tdq-nut phu nho" data-mo="' + E(x.uid) + '">' + (het ? 'Xoá' : 'Mở khoá') + '</button></div>';
        }).join('') + '</div>' : '<div class="tdq-rong nho">Chưa chặn em nào.</div>') + '</div></div>';

    $('[data-chon-lop]', than).onchange = function () { S.chonLop = this.value; S.chonHs = null; veChan(); };
    var o = $('[data-tim]', than); o.oninput = function () { S.tim = o.value; var vt = o.selectionStart; veChan().then(function () { var n = $('[data-tim]'); if (n) { n.focus(); try { n.setSelectionRange(vt, vt); } catch (e) { } } }); };
    $$('[data-hs]', than).forEach(function (b) { b.onclick = function () { var x = hs.filter(function (y) { return y.uid === b.getAttribute('data-hs'); })[0]; S.chonHs = x ? Object.assign({}, x) : null; veChan(); }; });
    $$('[data-sua]', than).forEach(function (b) { b.onclick = function () { var u = b.getAttribute('data-sua'), x = S.c.chan[u] || {}; S.chonHs = { uid: u, ten: x.ten, lop: x.lop, anh: x.anh || '' }; than.scrollTop = 0; veChan(); }; });
    $$('[data-mo]', than).forEach(function (b) { b.onclick = async function () {
      var u = b.getAttribute('data-mo'), ten = (S.c.chan[u] || {}).ten || 'em'; b.disabled = true;
      try { await luuChan(u, null); toast('Đã mở khoá cho ' + ten + '.');if (S.chonHs && S.chonHs.uid === u) S.chonHs = null; veThe4(); veChan(); }
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
      try { await luuChan(c.uid, muc); toast('Đã chặn ' + c.ten + (den ? ' tới ' + chuLuc(den) : '') + '.'); S.chonHs = null; veThe4(); veChan(); }
      catch (e) { toast(chuLoi(e), true); b.disabled = false; }
    };
  }

  window.TdQl = { mo: mo };
})();
