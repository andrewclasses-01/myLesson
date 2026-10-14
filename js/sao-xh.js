/* ============================================================
   sao-xh.js — THƯỞNG / PHẠT SAO NGAY TRONG TAB "XẾP HẠNG" của pop-up thẻ bài (dashboard, web v1.337.0, 14/10/2026).
   Thầy chốt mẫu v4 + "ok build": D:\OTHERS\CLAUDE\MAU THUONG SAO XEP HANG v4\index.html.

   · GIỮ (≈0,45 giây) tên một em ở BẤT KỲ bảng nào (các act + TỔNG THỜI GIAN LUYỆN TẬP) ⇒ pop-up nhỏ cạnh tên:
     AWARD / PUNISHMENT · 0–3 sao (bấm ngôi thứ k = k sao; bấm lại ngôi cuối = bớt 1) · lý do gợi ý theo chỗ giữ ·
     câu ghi lịch sử sửa tay được. Mặc định AWARD = số bảng em đứng TOP 1 (tối đa 3); PUNISHMENT mặc định 0.
     Thả sớm / bấm đúp = như cũ (đúp mở chi tiết em `data-hq-em`).
   · Nút ⭐ CẢ LỚP (dải tab, ngay trước ⚙) ⇒ pop-up dưới nút: cả lớp đủ bài ⇒ mặc định AWARD, có em thiếu ⇒ PUNISHMENT
     (phạt: Cả lớp / Chỉ em thiếu bài). Mặc định 1 sao.
   · Chốt ⇒ tạo PHIẾU `saoDot` (nguon 'dashboard', bai = id thẻ) — hàm máy chủ `apDotSao` cộng/trừ ví + báo em (chỉ khi cộng).
     Sao chói giữa màn rồi bay vào avatar cột TỔNG THỜI GIAN. Huy hiệu VÀNG (+) / ĐỎ (−) cạnh tên = đã thưởng/phạt ở bài này
     (đọc lại các phiếu `bai == id thẻ`), hiện RIÊNG không bù trừ.

   Dashboard đưa ngữ cảnh qua `window.__hqXh` (hqTabXepHang) và gọi `SaoXh.sauVe()` mỗi lần vẽ tab; số liệu bảng
   (thứ hạng, ai đủ bài) đọc thẳng từ DOM vừa vẽ ⇒ luôn khớp đúng cái thầy đang nhìn.
   ⛔ Dùng CHUNG cửa Firebase `AWChat.kho()`. ⛔ Viết ES5.
   ============================================================ */
(function () {
  'use strict';
  var A = window.AWC || {};
  var GIU_MS = 450;
  var SAO = '<svg viewBox="0 0 24 24"><path d="M12 2.3l2.95 6.3 6.9.85-5.08 4.75 1.3 6.85L12 17.7l-6.07 3.35 1.3-6.85L2.15 9.45l6.9-.85z"/></svg>';
  var MAU_AV = ['#0E7C6E', '#B3541E', '#5B8DEF', '#8CC63F', '#E36B5C', '#9C6ADE', '#F2A93B'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var chuanMa = function (s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); };
  var ngayVN = function () { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); };
  var ddmm = function () { var d = ngayVN(); return d.slice(8, 10) + '/' + d.slice(5, 7); };
  function kho() { return window.AWChat && AWChat.kho ? AWChat.kho() : Promise.reject(new Error('khong-co-kho')); }

  (function gaCss() {
    if (document.getElementById('sx-css')) return;
    var l = document.createElement('link'); l.id = 'sx-css'; l.rel = 'stylesheet'; l.href = 'css/sao-xh.css?v=1';
    document.head.appendChild(l);
    var d = document.createElement('div');
    d.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<radialGradient id="sxVang" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#FFF6C2"/><stop offset=".45" stop-color="#FFD43B"/><stop offset="1" stop-color="#F09A00"/></radialGradient>' +
      '<radialGradient id="sxDo" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#FFD9D9"/><stop offset=".45" stop-color="#F87171"/><stop offset="1" stop-color="#B91C1C"/></radialGradient></defs></svg>';
    (document.body || document.documentElement).appendChild(d.firstChild);
  })();

  // ── kho: số HS (hsSo) · ví (saoTong) · lý do nhanh (saoCaiDat) · phiếu của bài đang mở ───────────────────────────
  var K = { maSo: null, vi: {}, ly: null, napLuc: 0, hua: null, dot: {}, dotHua: {} };
  function napChung(ep) {
    if (K.hua && !ep && Date.now() - K.napLuc < 5 * 60e3) return K.hua;
    K.napLuc = Date.now();
    K.hua = kho().then(function (f) {
      return Promise.all([
        f.fs.getDoc(f.fs.doc(f.db, 'hsSo', 'soCai')),
        f.fs.getDoc(f.fs.doc(f.db, 'saoTong', 'chung'))['catch'](function () { return null; }),
        f.fs.getDoc(f.fs.doc(f.db, 'saoCaiDat', 'chung'))['catch'](function () { return null; })
      ]);
    }).then(function (r) {
      var so = (r[0] && r[0].exists() && r[0].data().nguoi) || {}, m = {};
      Object.keys(so).forEach(function (n) {
        var P = so[n] || {};
        if (P.ma) m[chuanMa(P.ma)] = n;
        (P.maCu || []).forEach(function (x) { if (!m[chuanMa(x)]) m[chuanMa(x)] = n; });
      });
      K.maSo = m;
      K.vi = (r[1] && r[1].exists() && r[1].data().em) || {};
      var c = (r[2] && r[2].exists()) ? r[2].data() : {};
      K.ly = (c.lyDo && Array.isArray(c.lyDo.cong)) ? c.lyDo : null;
    })['catch'](function (e) { K.hua = null; throw e; });
    return K.hua;
  }
  // Phiếu đã ghi ở bài này: { số: [{n, ly}] }
  function napDot(baiId, ep) {
    if (!baiId) return Promise.resolve({});
    if (K.dotHua[baiId] && !ep) return K.dotHua[baiId];
    K.dotHua[baiId] = kho().then(function (f) {
      return f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'saoDot'), f.fs.where('bai', '==', baiId)));
    }).then(function (q) {
      var m = {};
      q.forEach(function (d) {
        var p = d.data() || {};
        (p.dong || []).forEach(function (l) { if (l.so && Number(l.n)) (m[l.so] = m[l.so] || []).push({ n: Number(l.n), ly: l.viec || '', tao: p.tao || 0 }); });
      });
      K.dot[baiId] = m;
      return m;
    })['catch'](function () { K.dotHua[baiId] = null; return K.dot[baiId] || {}; });
    return K.dotHua[baiId];
  }

  function ctx() { return window.__hqXh || null; }
  function soCua(ten) {
    var c = ctx(); if (!c || !K.maSo) return null;
    for (var i = 0; i < c.hs.length; i++) if (c.hs[i].ten === ten) return K.maSo[chuanMa(c.hs[i].ma)] || null;
    return null;
  }

  // ── đọc bảng xếp hạng ĐANG HIỆN (DOM) ─────────────────────────────────────────────────────────────────────────────
  function docBang() {
    var xh = document.getElementById('hqXh'); if (!xh) return null;
    var bang = [].map.call(xh.querySelectorAll('.hq-xh-trai .bxh'), function (b) {
      var tay = b.classList.contains('hep'), dau = b.querySelector('.bxh-dau b');
      var ds = [].map.call(b.querySelectorAll('.bxh-dong'), function (r) {
        var h = r.querySelector('.hang');   // hqBxhAct: em chưa có lượt nộp ⇒ hạng "–"
        return { ten: r.getAttribute('data-hq-em'), du: r.classList.contains('du'), diem: !!h && h.textContent.trim() !== '–' };
      });
      return { ten: dau ? dau.textContent.trim() : '', tay: tay, ds: ds };
    });
    var tong = [].map.call(xh.querySelectorAll('.hq-xh-phai .bd-dong'), function (r) {
      return { ten: r.getAttribute('data-hq-em'), du: r.classList.contains('du'), co: !r.classList.contains('chua') };
    });
    return { bang: bang, tong: tong };
  }
  function soTop1(B, ten) {
    var k = B.bang.filter(function (b) { return !b.tay && b.ds[0] && b.ds[0].diem && b.ds[0].ten === ten; }).length;
    if (B.tong[0] && B.tong[0].co && B.tong[0].ten === ten) k++;
    return Math.min(3, k);
  }
  function actThieu(B, ten) {
    return B.bang.filter(function (b) { var r = b.ds.filter(function (x) { return x.ten === ten; })[0]; return r && !r.du; }).map(function (b) { return b.ten; });
  }
  function emThieu(B) { return B.tong.filter(function (r) { return !r.du; }).map(function (r) { return r.ten; }); }
  function cat120(s) { s = String(s || '').trim(); return s.length > 120 ? s.slice(0, 119) + '…' : s; }
  function lopGon(c) { return String(c.lopGoc || c.maLop || '').replace(/-/g, ''); }
  function duoi(c) { return ' / ' + (c.maBai || '') + ' · NGÀY ' + ddmm(); }
  function lyNhanh(k) {
    var ds = (K.ly && K.ly[k]) || (k === 'cong' ? [{ t: 'Phát biểu tốt' }, { t: 'Giúp bạn' }] : [{ t: 'Vi phạm nội quy' }]);
    return ds.slice(0, 4).map(function (x) { return { t: String(x.t).toUpperCase() + ' · NGÀY ' + ddmm(), nhan: x.t }; });
  }

  // ── lý do gợi ý cho MỘT em theo chỗ giữ ──
  function goiYEm(c, B, row) {
    var ten = row.getAttribute('data-hq-em'), thuong = [], phat = [], d = duoi(c), lop = lopGon(c);
    var bxh = row.closest('.bxh');
    if (bxh) {
      var b = B.bang[[].indexOf.call(bxh.parentNode.querySelectorAll('.bxh'), bxh)];
      var rows = [].slice.call(bxh.querySelectorAll('.bxh-dong')), hang = rows.indexOf(row) + 1;
      if (b && !b.tay && b.ds[hang - 1] && b.ds[hang - 1].diem && hang <= 3) thuong.push({ t: 'TOP ' + hang + ' - ' + b.ten + d, nhan: 'Top ' + hang + ' · ' + b.ten });
      if (b && row.classList.contains('du')) thuong.push({ t: (b.tay ? 'HOÀN THÀNH - ' : 'ĐIỂM TUYỆT ĐỐI - ') + b.ten + d, nhan: (b.tay ? 'Hoàn thành · ' : 'Điểm tuyệt đối · ') + b.ten });
    } else {
      var hangT = [].indexOf.call(row.parentNode.children, row) + 1;
      if (hangT === 1 && !row.classList.contains('chua')) thuong.push({ t: 'HỌC SINH CHĂM CHỈ NHẤT ' + lop + ' - ' + (c.maBai || '') + ' · NGÀY ' + ddmm(), nhan: 'Chăm chỉ nhất lớp' });
      else if (hangT <= 3 && !row.classList.contains('chua')) thuong.push({ t: 'TOP ' + hangT + ' CHĂM CHỈ ' + lop + d, nhan: 'Top ' + hangT + ' chăm chỉ' });
    }
    var tg = B.tong.filter(function (x) { return x.ten === ten; })[0];
    if (tg && tg.du) thuong.push({ t: 'HOÀN THÀNH ĐỦ BÀI' + d, nhan: 'Hoàn thành đủ bài' });
    actThieu(B, ten).forEach(function (a) { phat.push({ t: 'THIẾU BÀI - ' + a + d, nhan: 'Thiếu bài · ' + a }); });
    phat.push({ t: 'NỘP MUỘN' + d, nhan: 'Nộp muộn' });
    return { ten: ten, thuong: thuong.concat(lyNhanh('cong')), phat: phat.concat(lyNhanh('tru').filter(function (x) { return !/đổi quà|bấm nhầm/i.test(x.nhan); })) };
  }
  function goiYLop(c, B) {
    var thieu = emThieu(B), d = duoi(c), lop = lopGon(c);
    var ten3 = thieu.slice(0, 3).join(', ') + (thieu.length > 3 ? '…' : '');
    return {
      thieu: thieu,
      thuong: [{ t: 'CẢ LỚP ' + lop + ' HOÀN THÀNH ĐỦ BÀI' + d, nhan: 'Cả lớp hoàn thành đủ bài' },
        { t: 'CẢ LỚP ' + lop + ' NỘP ĐÚNG HẠN' + d, nhan: 'Cả lớp nộp đúng hạn' },
        { t: 'LỚP ' + lop + ' LUYỆN TẬP CHĂM CHỈ' + d, nhan: 'Cả lớp chăm chỉ' }],
      phat: [{ t: 'LỚP ' + lop + ' CÒN BẠN THIẾU BÀI (' + ten3 + ')' + d, nhan: 'Lớp còn bạn thiếu bài' },
        { t: 'LỚP ' + lop + ' NỘP BÀI CHẬM' + d, nhan: 'Lớp nộp chậm' }]
    };
  }

  // ── huy hiệu cạnh tên (cột TỔNG THỜI GIAN) ──
  function hhHtml(ds) {
    if (!ds || !ds.length) return '';
    var t = ds.filter(function (x) { return x.n > 0; }), p = ds.filter(function (x) { return x.n < 0; });
    var sum = function (a) { return a.reduce(function (s, x) { return s + x.n; }, 0); };
    var tit = function (a) { return esc(a.map(function (x) { return (x.n > 0 ? '+' : '') + x.n + ' · ' + x.ly; }).join('\n')); };
    return (t.length ? '<i class="sx-hh" title="' + tit(t) + '">+' + sum(t) + SAO + '</i>' : '') +
      (p.length ? '<i class="sx-hh phat" title="' + tit(p) + '">' + sum(p) + SAO + '</i>' : '');
  }
  function veHuyHieu(moi) {
    var c = ctx(), m = c && K.dot[c.baiId]; if (!m) return false;
    var doi = false;
    [].forEach.call(document.querySelectorAll('#hqXh .bd-dong'), function (r) {
      var t = r.querySelector('.ten'); if (!t) return;
      var cu = t.querySelectorAll('.sx-hh'); [].forEach.call(cu, function (x) { x.remove(); });
      var so = soCua(r.getAttribute('data-hq-em')), h = so ? hhHtml(m[so]) : '';
      if (h) { t.insertAdjacentHTML('beforeend', h); doi = true; if (moi && moi[so]) [].forEach.call(t.querySelectorAll('.sx-hh'), function (x) { x.classList.add('moi'); }); }
      else if (cu.length) doi = true;
    });
    return doi;
  }
  // Dashboard gọi sau mỗi lần vẽ tab (trước khi đo khung). Huy hiệu về sau ⇒ đo lại khung (`__hqVuaKhung`).
  function sauVe() {
    var c = ctx(); if (!c || !document.getElementById('hqXh')) return;
    veHuyHieu();
    if (!K.dot[c.baiId] || !K.maSo) {
      Promise.all([napChung(), napDot(c.baiId)]).then(function () {
        if (ctx() !== c) return;
        if (veHuyHieu() && window.__hqVuaKhung) window.__hqVuaKhung();
      })['catch'](function () { /* chưa có phiên thầy: không huy hiệu */ });
    }
  }

  // ── ảnh em (y `veEmAvDb` dashboard) ──
  function avHtml(ten) {
    var r = document.querySelector('#hqXh .bd-dong[data-hq-em="' + (window.CSS && CSS.escape ? CSS.escape(ten) : ten) + '"] .bm-em-av');
    if (r) { var x = r.cloneNode(true); x.removeAttribute('style'); x.style.background = r.style.background; return x.outerHTML; }
    var i = 0; for (var j = 0; j < ten.length; j++) i += ten.charCodeAt(j);
    return '<span class="bm-em-av" style="background:' + MAU_AV[i % MAU_AV.length] + '">' + esc(String(ten).trim().split(/\s+/).slice(-2).map(function (t) { return t.charAt(0); }).join('').toUpperCase()) + '</span>';
  }
  function hangTong(ten) { return document.querySelector('#hqXh .bd-dong[data-hq-em="' + (window.CSS && CSS.escape ? CSS.escape(ten) : ten) + '"]'); }

  // ── khung pop-up dùng chung (em / cả lớp) ──
  var MO = null;   // pop-up đang mở { el, dong }
  function taoPop(cls) {
    if (MO) MO.dong();
    var tp = document.createElement('div'); tp.className = 'sx-tp ' + cls; document.body.appendChild(tp);
    var o = { el: tp, khiDong: null };
    function ngoai(e) { if (!tp.contains(e.target) && !(e.target.closest && e.target.closest('#hqSaoLop'))) o.dong(); }
    function phim(e) { if (e.key === 'Escape') { e.stopPropagation(); o.dong(); } }
    o.dong = function () {
      tp.remove(); document.removeEventListener('pointerdown', ngoai, true); document.removeEventListener('keydown', phim, true);
      if (o.khiDong) o.khiDong(); if (MO === o) MO = null;
    };
    setTimeout(function () { document.addEventListener('pointerdown', ngoai, true); document.addEventListener('keydown', phim, true); }, 0);
    MO = o; return o;
  }
  function phanChung(st) {
    var ds = st.kieu === 'thuong' ? st.gy.thuong : st.gy.phat, l = ds[st.chon] || ds[0] || { t: '' };
    st.lyHien = st.lyTu || l.t;
    return '<div class="sx-sao">' + [1, 2, 3].map(function (k) { return '<button type="button" data-s="' + k + '" class="' + (k <= st.n ? 'bat' : '') + '">' + SAO + '</button>'; }).join('') + '</div>' +
      '<div class="sx-ly"><h5>LÝ DO</h5><div class="sx-chip">' + ds.map(function (x, j) { return '<button type="button" data-j="' + j + '" class="' + (j === st.chon && !st.lyTu ? 'on' : '') + '">' + esc(x.nhan) + '</button>'; }).join('') + '</div></div>' +
      '<div class="sx-xem"><small>GHI VÀO LỊCH SỬ SAO CỦA ' + (st.lop ? 'TỪNG EM' : 'EM') + '</small><div contenteditable="true" spellcheck="false">' + esc(st.lyHien) + '</div></div>';
  }
  function ganChung(st, ve) {
    var tp = st.o.el;
    [].forEach.call(tp.querySelectorAll('.sx-tab [data-k]'), function (b) {
      b.onclick = function () { var k = b.getAttribute('data-k'); if (st.kieu === k) return; st.kieu = k; st.chon = 0; st.lyTu = ''; st.n = st.macDinh(k); ve(); };
    });
    [].forEach.call(tp.querySelectorAll('[data-s]'), function (b) {
      b.onclick = function () { var k = +b.getAttribute('data-s'); st.n = (k === st.n) ? k - 1 : k; ve(); var x = st.n && tp.querySelector('[data-s="' + st.n + '"]'); if (x) x.classList.add('nay'); };
    });
    [].forEach.call(tp.querySelectorAll('[data-j]'), function (b) { b.onclick = function () { st.chon = +b.getAttribute('data-j'); st.lyTu = ''; ve(); }; });
    var ed = tp.querySelector('[contenteditable]');
    ed.oninput = function () { st.lyTu = ed.textContent; };
    ed.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); ed.blur(); } };
    tp.querySelector('.sx-x').onclick = st.o.dong;
  }
  function nutOk(st, soEm) {
    return '<div class="sx-loi" hidden></div><button type="button" class="sx-ok"' + (st.n ? '' : ' disabled') + '>' + SAO +
      (st.n ? (st.kieu === 'phat' ? 'PHẠT ' : 'THƯỞNG ') + st.n + ' SAO' + (soEm != null ? ' · ' + soEm + ' EM' : '') : 'BẤM VÀO SAO ĐỂ CHỌN') + '</button>';
  }
  function datMui(tp, x, y, goc) {
    var m = tp.querySelector('.sx-mui') || tp.appendChild(document.createElement('i'));
    m.className = 'sx-mui'; m.style.cssText = goc;
  }

  // ── POP-UP MỘT EM ──
  function moEm(row) {
    var c = ctx(), B = docBang(); if (!c || !B) return;
    var gy = goiYEm(c, B, row), ten = gy.ten, top = soTop1(B, ten);
    var macDinh = function (k) { return k === 'thuong' ? top : 0; };
    var kieu = (row.classList.contains('chua') || row.classList.contains('gan-han')) && !top ? 'phat' : 'thuong';
    var o = taoPop('em'), st = { o: o, gy: gy, kieu: kieu, n: macDinh(kieu), chon: 0, lyTu: '', macDinh: macDinh };
    row.classList.add('sx-chon');
    o.khiDong = function () { var r = hangHien(row, ten); if (r) r.classList.remove('sx-chon'); row.classList.remove('sx-chon'); };
    function ve() {
      var so = soCua(ten), vi = so ? (Number((K.vi[so] || {}).s) || 0) : null, da = (so && K.dot[c.baiId] && K.dot[c.baiId][so]) || [];
      o.el.className = 'sx-tp em' + (st.kieu === 'phat' ? ' phat' : '');
      o.el.innerHTML =
        '<div class="sx-dau">' + avHtml(ten) + '<div class="t"><b>' + esc(ten) + '</b><small>' + (so ? 'Ví đang có <i>⭐ ' + vi + '</i> · ' : (K.maSo ? '<span style="color:#DC2626">chưa có số HS</span> · ' : '')) + esc(c.lopGoc || '') + '</small></div><button class="sx-x" type="button" title="Đóng">✕</button></div>' +
        '<div class="sx-tab"><span class="nen"></span><button type="button" data-k="thuong">AWARD</button><button type="button" data-k="phat">PUNISHMENT</button></div>' +
        phanChung(st) +
        (da.length ? '<div class="sx-da' + (da.some(function (x) { return x.ly === st.lyHien; }) ? ' do' : '') + '">Ở bài này đã ' + da.map(function (x) { return (x.n > 0 ? 'thưởng +' : 'phạt ') + x.n + ' (' + esc(String(x.ly).split(' / ')[0]) + ')'; }).join(', ') + '</div>' : '') +
        nutOk(st, null);
      ganChung(st, ve);
      o.el.querySelector('.sx-ok').onclick = function () {
        if (!st.n) return;
        if (!so) return baoLoi(o.el, K.maSo ? 'Em chưa có số học sinh — không có ví để ghi.' : 'Đang đọc sổ học sinh, thử lại sau giây lát.');
        var ly = cat120(st.lyTu || st.lyHien), n = st.kieu === 'phat' ? -st.n : st.n;
        o.dong(); ghiVaBay([{ ten: ten, so: so }], n, ly, false);
      };
      // đặt cạnh tên (phải, thiếu chỗ thì trái), mũi nhọn chỉ vào hàng
      var r = (hangHien(row, ten) || row).getBoundingClientRect(), w = o.el.offsetWidth, h = o.el.offsetHeight;
      var phai = r.right + 14 + w < innerWidth - 8, x = phai ? r.right + 14 : Math.max(8, r.left - 14 - w);
      var y = Math.max(10, Math.min(innerHeight - h - 10, r.top + r.height / 2 - 34)), my = Math.max(14, Math.min(h - 28, r.top + r.height / 2 - y - 7));
      o.el.style.left = x + 'px'; o.el.style.top = y + 'px';
      o.el.style.setProperty('--ox', phai ? '0' : '100%'); o.el.style.setProperty('--oy', (r.top + r.height / 2 - y) + 'px');
      datMui(o.el, x, y, 'top:' + my + 'px;' + (phai ? 'left:-6px' : 'right:-6px'));
    }
    ve();
    // ví + số HS + phiếu bài này có thể chưa nạp ⇒ nạp rồi vẽ lại (giữ lựa chọn)
    if (!K.maSo || !K.dot[c.baiId]) Promise.all([napChung(), napDot(c.baiId)]).then(function () { if (MO === o) ve(); })['catch'](function () { if (MO === o) baoLoi(o.el, 'Chưa đọc được kho sao — cần phiên thầy (🔐).'); });
  }
  // dữ liệu về ⇒ dashboard vẽ lại bảng ⇒ hàng cũ rời DOM: tìm hàng mới cùng tên, cùng bảng
  function hangHien(row, ten) {
    if (row.isConnected) return row;
    return hangTong(ten);
  }
  function baoLoi(tp, chu) { var l = tp.querySelector('.sx-loi'); if (l) { l.hidden = false; l.textContent = chu; } }

  // ── POP-UP CẢ LỚP ──
  function moLop(nut) {
    var c = ctx(), B = docBang(); if (!c || !B || !B.tong.length) return;
    var gy = goiYLop(c, B), du = !gy.thieu.length;
    var o = taoPop('lop'), st = { o: o, gy: gy, kieu: du ? 'thuong' : 'phat', n: 1, chon: 0, lyTu: '', lop: true, ap: 'ca', macDinh: function () { return 1; } };
    nut.classList.add('sx-mo');
    o.khiDong = function () { var n2 = document.getElementById('hqSaoLop'); if (n2) n2.classList.remove('sx-mo'); nut.classList.remove('sx-mo'); };
    function nguoi() { return (st.kieu === 'phat' && st.ap === 'thieu') ? gy.thieu.slice() : B.tong.map(function (r) { return r.ten; }); }
    function ve() {
      var ng = nguoi();
      o.el.className = 'sx-tp lop' + (st.kieu === 'phat' ? ' phat' : '');
      o.el.innerHTML =
        '<div class="sx-dau"><span class="sx-ic">' + SAO + '</span><div class="t"><b>Cả lớp ' + esc(c.lopGoc || '') + '</b><small>' + B.tong.length + ' em · ' + esc(c.maBai || '') + '</small></div><button class="sx-x" type="button" title="Đóng">✕</button></div>' +
        '<div class="sx-tt ' + (du ? 'du' : 'thieu') + '">' + (du ? '✓ Cả lớp đã làm <b>đủ bài</b>.' :
          'Còn <b>' + gy.thieu.length + ' em thiếu bài</b>: ' + gy.thieu.slice(0, 6).map(function (t) { var a = actThieu(B, t); return esc(t) + (a.length ? ' (' + esc(a.join(', ')) + ')' : ''); }).join(' · ') +
          (gy.thieu.length > 6 ? ' · và ' + (gy.thieu.length - 6) + ' em nữa' : '')) + '</div>' +
        '<div class="sx-tab"><span class="nen"></span><button type="button" data-k="thuong">AWARD</button><button type="button" data-k="phat">PUNISHMENT</button></div>' +
        (st.kieu === 'phat' && gy.thieu.length ? '<div class="sx-ap"><button type="button" data-ap="ca" class="' + (st.ap === 'ca' ? 'on' : '') + '">Cả lớp (' + B.tong.length + ')</button><button type="button" data-ap="thieu" class="' + (st.ap === 'thieu' ? 'on' : '') + '">Chỉ em thiếu bài (' + gy.thieu.length + ')</button></div>' : '') +
        phanChung(st) + nutOk(st, ng.length);
      ganChung(st, ve);
      [].forEach.call(o.el.querySelectorAll('[data-ap]'), function (b) { b.onclick = function () { st.ap = b.getAttribute('data-ap'); ve(); }; });
      o.el.querySelector('.sx-ok').onclick = function () {
        if (!st.n) return;
        if (!K.maSo) return baoLoi(o.el, 'Đang đọc sổ học sinh, thử lại sau giây lát.');
        var ds = ng.map(function (t) { return { ten: t, so: soCua(t) }; }), co = ds.filter(function (x) { return x.so; });
        if (!co.length) return baoLoi(o.el, 'Không em nào có số học sinh.');
        var ly = cat120(st.lyTu || st.lyHien), n = st.kieu === 'phat' ? -st.n : st.n;
        o.dong(); ghiVaBay(co, n, ly, true, ds.length - co.length);
      };
      var nb = document.getElementById('hqSaoLop') || nut, r = nb.getBoundingClientRect(), w = o.el.offsetWidth;
      var x = Math.max(10, Math.min(innerWidth - w - 10, r.right - w + 6));
      o.el.style.left = x + 'px'; o.el.style.top = (r.bottom + 12) + 'px';
      o.el.style.setProperty('--ox', (r.left + r.width / 2 - x) + 'px'); o.el.style.setProperty('--oy', '0px');
      datMui(o.el, 0, 0, 'top:-6px;right:' + Math.max(10, x + w - (r.left + r.width / 2) - 7) + 'px');
    }
    ve();
    if (!K.maSo) napChung().then(function () { if (MO === o) ve(); })['catch'](function () { if (MO === o) baoLoi(o.el, 'Chưa đọc được kho sao — cần phiên thầy (🔐).'); });
  }

  // ── GHI PHIẾU + màn sao ──
  function ghiVaBay(ds, n, ly, laLop, soThieuSo) {
    var c = ctx();
    var phieu = { nguon: 'dashboard', lop: c.maLop || '', ngay: ngayVN(), bai: c.baiId || '', maBai: c.maBai || '',
      nhom: n > 0 ? 'Thầy Andrew thưởng' : 'Thầy Andrew phạt', ai: 'Thầy Andrew',
      dong: ds.map(function (x) { return { so: x.so, n: n, viec: ly, app: 'dashboard' }; }), tao: Date.now() };
    var ghi = kho().then(function (f) { return f.fs.addDoc(f.fs.collection(f.db, 'saoDot'), phieu); });
    // ghi ngay vào bộ nhớ để huy hiệu hiện liền khi sao bay tới (máy chủ áp ví sau vài giây)
    var m = K.dot[c.baiId] = K.dot[c.baiId] || {}, moi = {};
    ds.forEach(function (x) { (m[x.so] = m[x.so] || []).push({ n: n, ly: ly, tao: phieu.tao }); moi[x.so] = 1; var v = K.vi[x.so] = K.vi[x.so] || { s: 0 }; v.s = Math.max(0, (Number(v.s) || 0) + n); });
    bayMan(ds.map(function (x) { return x.ten; }), n, ly, laLop, function () {
      if (veHuyHieu(moi) && window.__hqVuaKhung) window.__hqVuaKhung();
    });
    ghi.then(function () {
      if (soThieuSo) toast(soThieuSo + ' em chưa có số học sinh nên chưa ghi được sao.');
      setTimeout(function () { napDot(c.baiId, true).then(function () { if (ctx() && ctx().baiId === c.baiId) veHuyHieu(); }); napChung(true)['catch'](function () {}); }, 6000);
    })['catch'](function (e) {
      ds.forEach(function (x) { var a = m[x.so] || []; for (var i = a.length - 1; i >= 0; i--) if (a[i].tao === phieu.tao) a.splice(i, 1); });
      veHuyHieu();
      var s = String((e && (e.code || e.message)) || e);
      toast(s.indexOf('permission') >= 0 ? 'CHƯA GHI được sao — cần phiên thầy (🔐) / kiểm luật kho sao.' : 'CHƯA GHI được sao: ' + s.slice(0, 80));
    });
  }
  function toast(chu) {
    var t = document.createElement('div'); t.className = 'sx-toast'; t.textContent = chu;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4200);
  }
  function hoatAnh(el, kf, o) { try { return el.animate(kf, o); } catch (e) { return { onfinish: null, finished: Promise.resolve() }; } }
  function bayMan(dsTen, n, ly, laLop, xong) {
    var phat = n < 0, k = Math.abs(n), c = ctx();
    var man = document.createElement('div'); man.className = 'sx-man' + (phat ? ' phat' : '');
    var loi = laLop ? (phat ? 'Trừ sao · ' : 'Chúc mừng ') + (dsTen.length === docBang().tong.length ? 'cả lớp ' + esc(c.lopGoc || '') : esc(dsTen.slice(0, 4).join(', ') + (dsTen.length > 4 ? '…' : ''))) + (phat ? '' : '!')
      : (phat ? 'Trừ sao · ' : 'Chúc mừng ') + esc(dsTen[0]) + (phat ? '' : '!');
    man.innerHTML = '<div class="sx-man-nen"></div><div class="sx-tia"></div><div class="sx-chu">' + (laLop ? '' : '<b>' + (phat ? '−' : '+') + k + ' ' + SAO + '</b>') +
      '<span>' + loi + '</span><small>' + esc(ly) + '</small></div>';
    document.body.appendChild(man);
    var cx = innerWidth / 2, cy = innerHeight * (laLop ? 0.42 : 0.46), to = k === 1 ? (laLop ? 170 : 190) : 150, kc = to * 0.93, lon = [];
    for (var i = 0; i < k; i++) {
      var s = document.createElement('div'); s.className = 'sx-bay'; s.innerHTML = SAO; s.style.opacity = '0';
      s.style.width = s.style.height = to + 'px'; s.style.margin = (-to / 2) + 'px 0 0 ' + (-to / 2) + 'px';
      var x = cx + (i - (k - 1) / 2) * kc, y = cy + (!laLop && k > 1 ? Math.abs(i - (k - 1) / 2) * 14 : 0);
      man.appendChild(s); lon.push({ el: s, x: x, y: y, ten: dsTen[0] });
      hoatAnh(s, [{ transform: 'translate(' + x + 'px,' + y + 'px) scale(0) rotate(-140deg)', opacity: 0 }, { transform: 'translate(' + x + 'px,' + y + 'px) scale(1.25) rotate(8deg)', opacity: 1, offset: .7 }, { transform: 'translate(' + x + 'px,' + y + 'px) scale(1)', opacity: 1 }],
        { duration: 620, delay: 120 + i * 110, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'forwards' });
    }
    // cả lớp: mỗi em một sao nhỏ lấp lánh quanh sao to, rồi bay về đúng avatar em đó
    var bay = laLop ? dsTen.map(function (ten, j) {
      var g = Math.PI * 2 * j / dsTen.length + Math.random() * .3, R = to * 0.95 + Math.random() * 90;
      var e = document.createElement('div'); e.className = 'sx-bay nho'; e.innerHTML = SAO; e.style.cssText = 'width:34px;height:34px;margin:-17px 0 0 -17px;opacity:0'; man.appendChild(e);
      var o = { el: e, ten: ten, x: cx + Math.cos(g) * R * 1.35, y: cy + Math.sin(g) * R * .8, co: 1.2 };
      hoatAnh(e, [{ transform: 'translate(' + cx + 'px,' + cy + 'px) scale(0)', opacity: 0 }, { transform: 'translate(' + o.x + 'px,' + o.y + 'px) scale(1.2) rotate(90deg)', opacity: 1 }],
        { duration: 700, delay: 500 + j * 25, easing: 'cubic-bezier(.2,1.2,.4,1)', fill: 'forwards' });
      hoatAnh(e, [{ filter: 'brightness(1)' }, { filter: 'brightness(1.8)' }, { filter: 'brightness(1)' }], { duration: 600, delay: 1200 + (j % 5) * 120, iterations: 2 });
      return o;
    }) : lon.map(function (o) { o.co = 1; return o; });
    requestAnimationFrame(function () { man.classList.add('mo'); });
    var daXong = false, ketThuc = function () { if (daXong) return; daXong = true; setTimeout(function () { man.remove(); }, 300); if (xong) xong(); };
    setTimeout(ketThuc, (laLop ? 2300 : 1700 + k * 110) + 2600 + dsTen.length * 50);
    setTimeout(function () {
      man.classList.remove('mo');
      if (laLop) lon.forEach(function (o) { hoatAnh(o.el, [{ opacity: 1, transform: 'translate(' + o.x + 'px,' + o.y + 'px) scale(1)' }, { opacity: 0, transform: 'translate(' + o.x + 'px,' + o.y + 'px) scale(1.6)' }], { duration: 380, fill: 'forwards' }); });
      var con = bay.length, xongMot = function () { if (--con === 0) ketThuc(); };
      bay.forEach(function (o, j) {
        var r = hangTong(o.ten), a = r && r.querySelector('.bm-em-av');
        if (!a) { o.el.remove(); return xongMot(); }
        var b = a.getBoundingClientRect(), tx = b.left + b.width / 2, ty = b.top + b.height / 2;
        var mx = (o.x + tx) / 2 + (phat ? -60 : 80), my = Math.min(o.y, ty) - (laLop ? 120 : 180);
        var sc = laLop ? .75 : (b.width / to * 0.9);
        var an = hoatAnh(o.el, [{ transform: 'translate(' + o.x + 'px,' + o.y + 'px) scale(' + o.co + ') rotate(' + (laLop ? 90 : 0) + 'deg)', opacity: 1 },
          { transform: 'translate(' + mx + 'px,' + my + 'px) scale(' + (laLop ? .9 : .6) + ') rotate(220deg)', opacity: 1, offset: .55 },
          { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ') rotate(420deg)', opacity: .95 }],
          { duration: laLop ? 760 : 820, delay: j * (laLop ? 45 : 120), easing: 'cubic-bezier(.55,0,.35,1)', fill: 'forwards' });
        var het = function () {
          o.el.remove(); toeTia(tx, ty, phat);
          var r2 = hangTong(o.ten), a2 = (r2 && r2.querySelector('.bm-em-av')) || a;
          a2.classList.remove('sx-av-nhan', 'sx-av-phat'); void a2.offsetWidth; a2.classList.add(phat ? 'sx-av-phat' : 'sx-av-nhan');
          xongMot();
        };
        if (an.finished) an.finished.then(het, het); else setTimeout(het, 900);
      });
      if (!bay.length) ketThuc();
    }, laLop ? 2300 : 1700 + k * 110);
  }
  function toeTia(x, y, phat) {
    for (var i = 0; i < 9; i++) {
      var t = document.createElement('i'); t.className = 'sx-tia-nho' + (phat ? ' phat' : '');
      t.style.left = x + 'px'; t.style.top = y + 'px'; document.body.appendChild(t);
      var g = Math.PI * 2 * i / 9, d = 26 + Math.random() * 18;
      (function (t) {
        var a = hoatAnh(t, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(g) * d + 'px,' + Math.sin(g) * d + 'px) scale(.2)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)' });
        (a.finished || Promise.resolve()).then(function () { t.remove(); }, function () { t.remove(); });
      })(t);
    }
  }

  // ── GIỮ tên trong bảng xếp hạng ──
  var hen = null, giuRow = null, x0 = 0, y0 = 0, vuaMo = 0;
  function huyGiu() {
    if (hen) { clearTimeout(hen); hen = null; }
    if (giuRow) { var g = giuRow.querySelector('.sx-giu'); if (g) g.remove(); giuRow = null; }
  }
  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || MO) return;
    var row = e.target.closest && e.target.closest('#bmHop #hqXh .bxh-dong, #bmHop #hqXh .bd-dong');
    if (!row || !ctx() || e.target.closest('.zalo-tich, button')) return;
    huyGiu();
    giuRow = row; x0 = e.clientX; y0 = e.clientY;
    row.insertAdjacentHTML('afterbegin', '<i class="sx-giu"></i>');
    hen = setTimeout(function () {
      hen = null; var r = giuRow; huyGiu();
      if (r && r.isConnected) { vuaMo = Date.now(); moEm(r); }
    }, GIU_MS);
  });
  document.addEventListener('pointerup', huyGiu);
  document.addEventListener('pointercancel', huyGiu);
  document.addEventListener('pointermove', function (e) { if (hen && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) huyGiu(); });
  document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('#bmHop #hqXh .bxh-dong, #bmHop #hqXh .bd-dong')) e.preventDefault(); });
  // cú bấm ngay sau khi GIỮ mở pop-up: không cho rơi xuống hàng (tránh cú đúp giả mở chi tiết em)
  document.addEventListener('dblclick', function (e) { if (Date.now() - vuaMo < 700) { e.stopPropagation(); e.preventDefault(); } }, true);
  // nút ⭐ cả lớp (dashboard vẽ lại dải tab thường xuyên ⇒ bắt bằng ủy quyền)
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('#hqSaoLop'); if (!n) return;
    e.stopPropagation();
    if (MO && MO.el.classList.contains('lop')) return MO.dong();
    moLop(n);
  }, true);

  window.SaoXh = {
    // nút ⭐ cho dải tab (dashboard chèn ngay TRƯỚC nút ⚙)
    nut: function () {
      return '<button type="button" class="hq-sao-lop" id="hqSaoLop" title="Thưởng / phạt sao CẢ LỚP ở bài này">' + SAO + '</button>';
    },
    sauVe: sauVe
  };
})();
