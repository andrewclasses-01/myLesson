/* ============================================================
   sao-xh.js — THƯỞNG / PHẠT SAO NGAY TRONG TAB "XẾP HẠNG" của pop-up thẻ bài (dashboard, web v1.337.0, 14/10/2026).
   Thầy chốt mẫu v4 + "ok build": D:\OTHERS\CLAUDE\MAU THUONG SAO XEP HANG v4\index.html.

   · GIỮ (≈0,45 giây) tên một em ở BẤT KỲ bảng nào (các act + TỔNG THỜI GIAN LUYỆN TẬP) ⇒ pop-up nhỏ cạnh tên:
     AWARD / PUNISHMENT · 0–3 sao (bấm ngôi thứ k = k sao; bấm lại ngôi cuối = bớt 1) · lý do gợi ý theo chỗ giữ ·
     câu ghi lịch sử sửa tay được. Mặc định AWARD = số bảng em đứng TOP 1 (tối đa 3); PUNISHMENT mặc định 0.
     Thả sớm / bấm đúp = như cũ (đúp mở chi tiết em `data-hq-em`).
   · Nút ⭐ CẢ LỚP (dải tab, ngay trước ⚙) ⇒ pop-up dưới nút: cả lớp đủ bài ⇒ mặc định AWARD, có em thiếu ⇒ PUNISHMENT
     (phạt: Cả lớp / Chỉ em thiếu bài). Mặc định 1 sao.
     v1.447.0 — AWARD khi lớp còn em thiếu cũng có hàng chọn: Chỉ em đủ bài / Cả lớp (MẶC ĐỊNH = cả lớp trừ em thiếu; v1.447.1 nút "Chỉ em đủ bài" đứng trước).
   · v1.338.0 (thầy chốt mẫu v5): chốt trong pop-up = SAO TẠM (chỉ trong máy, huy hiệu VIỀN ĐỨT) — sao chói giữa màn rồi bay vào
     avatar cột TỔNG THỜI GIAN. Nút VÍ (cạnh ⭐, trước ⚙) ⇒ hỏi lại ⇒ ghi PHIẾU `saoDot` thật (nguon dashboard, bai = id thẻ;
     1 phiếu thưởng + 1 phiếu phạt) ⇒ hàm `apDotSao` cộng/trừ ví ⇒ ảnh em NUỐT sao tạm, huy hiệu thành ĐẶC (= đã vào ví).
     Đóng pop-up chi tiết khi còn sao tạm ⇒ `chanDong` hỏi ĐƯA VÀO VÍ / HỦY BỎ. Vàng (+) / đỏ (−) riêng, không bù trừ.


    · v1.394.0 (21/10/2026, thầy) — SAO TẠM ĐẬU CẠNH TÊN Ở ĐÚNG BẢNG ĐƯỢC THƯỞNG: giữ tên + thưởng ⇒ mỗi ngôi sao bay vào cạnh phải
     tên em ở bảng em đứng TOP 1 (VD Top 1 WORDS 1 + QUIZ ⇒ 2 sao, mỗi bảng 1; Top 1 TỔNG THỜI GIAN ⇒ cạnh tên cột tổng); dư sao / không
     top / phạt ⇒ đậu ở hàng đang giữ (phạt "Thiếu bài · X" ⇒ bảng X); cả lớp ⇒ cột tổng. Mỗi sao tạm nhớ `cho: [{k, n}]` (k = khoá bảng
     `b:<tên act>` hoặc 'tong'). Giữa AVATAR (cột tổng) = SỐ TO tổng sao tạm (vàng +, đỏ −). Nút VÍ chốt ⇒ mọi sao + con số BAY VÀO NÚT
     VÍ (vệt lấp lánh, ví nảy + toé tia) rồi huy hiệu ĐẶC "đã vào ví" hiện ở cột tổng.

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
    var l = document.createElement('link'); l.id = 'sx-css'; l.rel = 'stylesheet'; l.href = 'css/sao-xh.css?v=3';
    document.head.appendChild(l);
    var d = document.createElement('div');
    d.innerHTML = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<radialGradient id="sxVang" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#FFF6C2"/><stop offset=".45" stop-color="#FFD43B"/><stop offset="1" stop-color="#F09A00"/></radialGradient>' +
      '<radialGradient id="sxDo" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#FFD9D9"/><stop offset=".45" stop-color="#F87171"/><stop offset="1" stop-color="#B91C1C"/></radialGradient></defs></svg>';
    (document.body || document.documentElement).appendChild(d.firstChild);
  })();

  // ── kho: số HS (hsSo) · ví (saoTong) · lý do nhanh (saoCaiDat) · phiếu của bài đang mở ───────────────────────────
  var K = { maSo: null, vi: {}, ly: null, napLuc: 0, hua: null, dot: {}, dotHua: {}, tam: {} };   // v1.338.0 tam = SAO TẠM { baiId: { số: [{n, ly, ten}] } }
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
      return { ten: dau ? dau.textContent.trim() : '', k: khoaBang(b), tay: tay, ds: ds };
    });
    var tong = [].map.call(xh.querySelectorAll('.hq-xh-phai .bd-dong'), function (r) {
      return { ten: r.getAttribute('data-hq-em'), du: r.classList.contains('du'), co: !r.classList.contains('chua') };
    });
    return { bang: bang, tong: tong };
  }
  // v1.394.0 — khoá MỘT bảng act (tên đầy đủ trong title, không đổi khi vẽ lại) · 'tong' = cột TỔNG THỜI GIAN
  function khoaBang(bxh) { var b = bxh && bxh.querySelector('.bxh-dau b'); return 'b:' + (b ? (b.getAttribute('title') || b.textContent).trim() : ''); }
  function khoaRow(row) { var b = row && row.closest && row.closest('.bxh'); return b ? khoaBang(b) : 'tong'; }
  function chonTen(ten) { return '[data-hq-em="' + (window.CSS && CSS.escape ? CSS.escape(ten) : ten) + '"]'; }
  // hàng của em `ten` trong bảng khoá `k`
  function hangCua(k, ten) {
    if (k === 'tong') return hangTong(ten);
    var bs = document.querySelectorAll('#hqXh .hq-xh-trai .bxh');
    for (var i = 0; i < bs.length; i++) if (khoaBang(bs[i]) === k) return bs[i].querySelector('.bxh-dong' + chonTen(ten));
    return null;
  }
  // Chia |n| ngôi sao vào các bảng: thưởng ⇒ lần lượt các bảng em TOP 1 (hàng đang giữ lên trước), dư ⇒ hàng đang giữ;
  // phạt / không top ⇒ hết vào `uuTien` (bảng của lý do phạt) hoặc hàng đang giữ. Trả { cho: [{k, n}], sao: [k của từng ngôi] }.
  function chiaCho(B, row, ten, n, uuTien) {
    var giu = uuTien || khoaRow(row), k = Math.abs(n), dau = n < 0 ? -1 : 1, ds = [], m = {}, sao = [];
    if (n > 0) {
      B.bang.forEach(function (b) { if (!b.tay && b.ds[0] && b.ds[0].diem && b.ds[0].ten === ten) ds.push(b.k); });
      if (B.tong[0] && B.tong[0].co && B.tong[0].ten === ten) ds.push('tong');
      var i0 = ds.indexOf(giu); if (i0 > 0) { ds.splice(i0, 1); ds.unshift(giu); }
    }
    for (var i = 0; i < k; i++) { var kk = i < ds.length ? ds[i] : giu; m[kk] = (m[kk] || 0) + dau; sao.push(kk); }
    return { cho: Object.keys(m).map(function (kk) { return { k: kk, n: m[kk] }; }), sao: sao };
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
      // v1.447.0 — AWARD "Chỉ em đủ bài" (lớp còn em thiếu): lý do không được nói "cả lớp"
      thuongDu: [{ t: 'HOÀN THÀNH ĐỦ BÀI' + d, nhan: 'Hoàn thành đủ bài' },
        { t: 'NỘP BÀI ĐÚNG HẠN' + d, nhan: 'Nộp đúng hạn' },
        { t: 'LUYỆN TẬP CHĂM CHỈ' + d, nhan: 'Luyện tập chăm chỉ' }],
      phat: [{ t: 'LỚP ' + lop + ' CÒN BẠN THIẾU BÀI (' + ten3 + ')' + d, nhan: 'Lớp còn bạn thiếu bài' },
        { t: 'LỚP ' + lop + ' NỘP BÀI CHẬM' + d, nhan: 'Lớp nộp chậm' }]
    };
  }

  // ── huy hiệu cạnh tên ──
  // ĐÃ VÀO VÍ = huy hiệu ĐẶC ở cột TỔNG (`vi`, từ phiếu saoDot). v1.394.0 — SAO TẠM = ngôi sao lấp lánh cạnh tên ở ĐÚNG bảng
  // được thưởng (`.sx-ts`) + SỐ TO giữa avatar cột tổng (`.sx-av-so`, tổng tạm: vàng +, đỏ −). Vàng / đỏ riêng, không bù trừ.
  function hhHtml(daVi) {
    var sum = function (a) { return a.reduce(function (s, x) { return s + x.n; }, 0); };
    var tit = function (a, chu) { return esc(chu + '\n' + a.map(function (x) { return (x.n > 0 ? '+' : '') + x.n + ' · ' + x.ly; }).join('\n')); };
    var chip = function (a, cls, chu) { return a.length ? '<i class="sx-hh ' + cls + '" title="' + tit(a, chu) + '">' + (sum(a) > 0 ? '+' : '') + sum(a) + SAO + '</i>' : ''; };
    var duong = function (a) { return (a || []).filter(function (x) { return x.n > 0; }); }, am = function (a) { return (a || []).filter(function (x) { return x.n < 0; }); };
    return chip(duong(daVi), 'vi', 'ĐÃ VÀO VÍ') + chip(am(daVi), 'vi phat', 'ĐÃ TRỪ KHỎI VÍ');
  }
  function tsHtml(n, so, k, lop) {
    if (!n) return '';
    var a = Math.abs(n);
    return '<i class="sx-ts' + (n < 0 ? ' phat' : '') + lop + '" data-so="' + so + '" data-k="' + esc(k) + '" title="' + (n < 0 ? 'PHẠT TẠM ' + n : 'SAO TẠM +' + n) + ' — chưa vào ví">' +
      (a <= 3 ? new Array(a + 1).join(SAO) : SAO + '<b>×' + a + '</b>') + '</i>';
  }
  function tamCua(baiId) { return K.tam[baiId] || (K.tam[baiId] = {}); }
  // `moi` = { số: 'vi'|'tam' } em vừa đổi (hiệu ứng nảy) · `an` = sao tạm MỚI vẽ ẩn (`.cho`) chờ ngôi sao bay tới
  function veHuyHieu(moi, an) {
    var c = ctx(), xh = document.getElementById('hqXh'); if (!c || !xh) { capNhatVi(); return false; }
    var m = K.dot[c.baiId] || {}, tm = K.tam[c.baiId] || {}, doi = false;
    [].forEach.call(xh.querySelectorAll('.sx-hh, .sx-ts, .sx-av-so'), function (x) { x.remove(); doi = true; });
    [].forEach.call(xh.querySelectorAll('.bd-dong'), function (r) {
      var t = r.querySelector('.ten'), so = soCua(r.getAttribute('data-hq-em')), h = (t && so) ? hhHtml(m[so]) : '';
      if (!h) return;
      t.insertAdjacentHTML('beforeend', h); doi = true;
      if (moi && moi[so] === 'vi') [].forEach.call(t.querySelectorAll('.sx-hh'), function (x) { x.classList.add('moi'); });
    });
    Object.keys(tm).forEach(function (so) {
      var a = tm[so]; if (!a || !a.length) return;
      var ten = a[0].ten, theo = {}, rong = 0, lop = (moi && moi[so] === 'tam') ? (an ? ' cho' : ' moi') : '';
      a.forEach(function (x) {
        rong += x.n;
        (x.cho || [{ k: 'tong', n: x.n }]).forEach(function (q) { var o = theo[q.k] = theo[q.k] || { c: 0, t: 0 }; if (q.n > 0) o.c += q.n; else o.t += q.n; });
      });
      Object.keys(theo).forEach(function (k) {
        var r = hangCua(k, ten) || hangTong(ten), t = r && r.querySelector('.ten'); if (!t) return;   // bảng không còn hiện ⇒ đậu cột tổng
        t.insertAdjacentHTML('beforeend', tsHtml(theo[k].c, so, k, lop) + tsHtml(theo[k].t, so, k, lop)); doi = true;
      });
      var rt = hangTong(ten), av = rt && rt.querySelector('.bm-em-av');
      if (av && rong) { av.insertAdjacentHTML('beforeend', '<i class="sx-av-so' + (rong < 0 ? ' phat' : '') + lop + '" data-so="' + so + '">' + (rong < 0 ? '−' : '') + Math.abs(rong) + '</i>'); doi = true; }
    });
    capNhatVi();
    return doi;
  }
  // ── SAO TẠM của bài đang mở: [{ so, ten, cong, tru, ds:[{n, ly}] }] ──
  function dsTam(baiId) {
    var tm = K.tam[baiId] || {};
    return Object.keys(tm).filter(function (so) { return tm[so].length; }).map(function (so) {
      var a = tm[so];
      return { so: so, ten: a[0].ten, ds: a, cong: a.filter(function (x) { return x.n > 0; }).reduce(function (s, x) { return s + x.n; }, 0),
        tru: a.filter(function (x) { return x.n < 0; }).reduce(function (s, x) { return s + x.n; }, 0) };
    });
  }
  function capNhatVi() {
    var n = document.getElementById('hqViSao'), c = ctx(); if (!n) return;
    var so = c ? dsTam(c.baiId).length : 0, d = n.querySelector('.sx-vi-dem');
    n.disabled = !so; d.hidden = !so; d.textContent = so;
  }
  // Dashboard gọi sau mỗi lần vẽ tab (trước khi đo khung). Huy hiệu về sau ⇒ đo lại khung (`__hqVuaKhung`).
  function sauVe() {
    capNhatVi();
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
      var so = soCua(ten), vi = so ? (Number((K.vi[so] || {}).s) || 0) : null, da = ((so && K.dot[c.baiId] && K.dot[c.baiId][so]) || []).concat(((so && K.tam[c.baiId] && K.tam[c.baiId][so]) || []).map(function (x) { return { n: x.n, ly: x.ly, tam: 1 }; }));
      o.el.className = 'sx-tp em' + (st.kieu === 'phat' ? ' phat' : '');
      o.el.innerHTML =
        '<div class="sx-dau">' + avHtml(ten) + '<div class="t"><b>' + esc(ten) + '</b><small>' + (so ? 'Ví đang có <i>⭐ ' + (vi < 0 ? '<span style="color:#DC2626">−' + (-vi) + '</span>' : vi) + '</i> · ' : (K.maSo ? '<span style="color:#DC2626">chưa có số HS</span> · ' : '')) + esc(c.lopGoc || '') + '</small></div><button class="sx-x" type="button" title="Đóng">✕</button></div>' +
        '<div class="sx-tab"><span class="nen"></span><button type="button" data-k="thuong">AWARD</button><button type="button" data-k="phat">PUNISHMENT</button></div>' +
        phanChung(st) +
        (da.length ? '<div class="sx-da' + (da.some(function (x) { return x.ly === st.lyHien; }) ? ' do' : '') + '">Ở bài này đã ' + da.map(function (x) { return (x.n > 0 ? 'thưởng +' : 'phạt ') + x.n + ' (' + esc(String(x.ly).split(' / ')[0]) + ')' + (x.tam ? ' — tạm' : ''); }).join(', ') + '</div>' : '') +
        nutOk(st, null);
      ganChung(st, ve);
      o.el.querySelector('.sx-ok').onclick = function () {
        if (!st.n) return;
        if (!so) return baoLoi(o.el, K.maSo ? 'Em chưa có số học sinh — không có ví để ghi.' : 'Đang đọc sổ học sinh, thử lại sau giây lát.');
        var ly = cat120(st.lyTu || st.lyHien), n = st.kieu === 'phat' ? -st.n : st.n;
        // v1.394.0 — phạt theo lý do "Thiếu bài · X" ⇒ sao đậu ở bảng X
        var lyChon = !st.lyTu && (st.kieu === 'phat' ? gy.phat : gy.thuong)[st.chon], uu = null;
        if (n < 0 && lyChon && /^Thiếu bài · /.test(lyChon.nhan)) {
          var bx = docBang().bang.filter(function (b) { return 'Thiếu bài · ' + b.ten === lyChon.nhan; })[0]; if (bx) uu = bx.k;
        }
        var ch = chiaCho(docBang(), hangHien(row, ten) || row, ten, n, uu);
        o.dong(); ghiVaBay([{ ten: ten, so: so, cho: ch.cho }], n, ly, false, 0, ch.sao.map(function (k) { return { ten: ten, k: k }; }));
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
    // v1.447.0 — `ap` = đối tượng PUNISHMENT (mặc định cả lớp) · `apT` = đối tượng AWARD (mặc định CHỈ EM ĐỦ BÀI = cả lớp trừ em thiếu)
    var o = taoPop('lop'), st = { o: o, gy: gy, kieu: du ? 'thuong' : 'phat', n: 1, chon: 0, lyTu: '', lop: true, ap: 'ca', apT: 'du', macDinh: function () { return 1; } };
    var thuongCa = gy.thuong;
    nut.classList.add('sx-mo');
    o.khiDong = function () { var n2 = document.getElementById('hqSaoLop'); if (n2) n2.classList.remove('sx-mo'); nut.classList.remove('sx-mo'); };
    function chiDu() { return st.kieu === 'thuong' && st.apT === 'du' && gy.thieu.length; }
    function nguoi() {
      if (st.kieu === 'phat' && st.ap === 'thieu') return gy.thieu.slice();
      var ds = B.tong.map(function (r) { return r.ten; });
      return chiDu() ? ds.filter(function (t) { return gy.thieu.indexOf(t) < 0; }) : ds;
    }
    function ve() {
      gy.thuong = chiDu() ? gy.thuongDu : thuongCa;
      var ng = nguoi();
      o.el.className = 'sx-tp lop' + (st.kieu === 'phat' ? ' phat' : '');
      o.el.innerHTML =
        '<div class="sx-dau"><span class="sx-ic">' + SAO + '</span><div class="t"><b>Cả lớp ' + esc(c.lopGoc || '') + '</b><small>' + B.tong.length + ' em · ' + esc(c.maBai || '') + '</small></div><button class="sx-x" type="button" title="Đóng">✕</button></div>' +
        '<div class="sx-tt ' + (du ? 'du' : 'thieu') + '">' + (du ? '✓ Cả lớp đã làm <b>đủ bài</b>.' :
          'Còn <b>' + gy.thieu.length + ' em thiếu bài</b>: ' + gy.thieu.slice(0, 6).map(function (t) { var a = actThieu(B, t); return esc(t) + (a.length ? ' (' + esc(a.join(', ')) + ')' : ''); }).join(' · ') +
          (gy.thieu.length > 6 ? ' · và ' + (gy.thieu.length - 6) + ' em nữa' : '')) + '</div>' +
        '<div class="sx-tab"><span class="nen"></span><button type="button" data-k="thuong">AWARD</button><button type="button" data-k="phat">PUNISHMENT</button></div>' +
        (st.kieu === 'phat' && gy.thieu.length ? '<div class="sx-ap"><button type="button" data-ap="ca" class="' + (st.ap === 'ca' ? 'on' : '') + '">Cả lớp (' + B.tong.length + ')</button><button type="button" data-ap="thieu" class="' + (st.ap === 'thieu' ? 'on' : '') + '">Chỉ em thiếu bài (' + gy.thieu.length + ')</button></div>' : '') +
        (st.kieu === 'thuong' && gy.thieu.length ? '<div class="sx-ap"><button type="button" data-apt="du" class="' + (st.apT === 'du' ? 'on' : '') + '">Chỉ em đủ bài (' + (B.tong.length - gy.thieu.length) + ')</button><button type="button" data-apt="ca" class="' + (st.apT === 'ca' ? 'on' : '') + '">Cả lớp (' + B.tong.length + ')</button></div>' : '') +
        phanChung(st) + nutOk(st, ng.length);
      ganChung(st, ve);
      [].forEach.call(o.el.querySelectorAll('[data-ap]'), function (b) { b.onclick = function () { st.ap = b.getAttribute('data-ap'); ve(); }; });
      [].forEach.call(o.el.querySelectorAll('[data-apt]'), function (b) { b.onclick = function () { var k = b.getAttribute('data-apt'); if (st.apT === k) return; st.apT = k; st.chon = 0; st.lyTu = ''; ve(); }; });
      o.el.querySelector('.sx-ok').onclick = function () {
        if (!st.n || !ng.length) return;
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

  // ── v1.338.0 (thầy chốt mẫu v5): thưởng/phạt = SAO TẠM (chỉ trong máy), CHƯA ghi kho. Nút VÍ mới ghi phiếu thật. ──
  // v1.394.0 — mỗi sao tạm nhớ CHỖ ĐẬU `cho` ([{k, n}]); `dich` = đích của TỪNG ngôi sao bay ([{ten, k}]).
  function ghiVaBay(ds, n, ly, laLop, soThieuSo, dich) {
    var c = ctx(), tm = tamCua(c.baiId), moi = {}, luc = Date.now();
    ds.forEach(function (x) { (tm[x.so] = tm[x.so] || []).push({ n: n, ly: ly, ten: x.ten, tao: luc, cho: x.cho || [{ k: 'tong', n: n }] }); moi[x.so] = 'tam'; });
    capNhatVi();
    if (soThieuSo) toast(soThieuSo + ' em chưa có số học sinh nên không có ví để thưởng.');
    bayMan(dich || ds.map(function (x) { return { ten: x.ten, k: 'tong' }; }), ds.map(function (x) { return x.ten; }), n, ly, laLop, moi);
  }

  // ── NÚT VÍ: hỏi lại ⇒ ghi phiếu `saoDot` thật (thưởng 1 phiếu, phạt 1 phiếu) ⇒ ảnh em NUỐT các sao tạm ──
  var VI_IC = '<svg viewBox="0 0 24 24"><path d="M4 8.5V7a2.5 2.5 0 0 1 2.5-2.5H17a1.5 1.5 0 0 1 1.5 1.5v2.5"/><rect x="3" y="8.5" width="18" height="11.5" rx="2.6"/><path d="M21 12.5h-4.2a1.8 1.8 0 0 0 0 3.6H21"/><circle cx="16.9" cy="14.3" r=".6"/></svg>';
  function hopHoi(html, cls) {
    var nen = document.createElement('div'); nen.className = 'sx-xn-nen';
    nen.innerHTML = '<div class="sx-xn ' + (cls || '') + '">' + html + '</div>'; document.body.appendChild(nen);
    var phim = function (e) { if (e.key === 'Escape') { e.stopPropagation(); dong(); } };
    var dong = function () { nen.remove(); document.removeEventListener('keydown', phim, true); };
    document.addEventListener('keydown', phim, true);
    nen.addEventListener('click', function (e) { if (e.target === nen) dong(); });
    nen.querySelector('.sx-xn-x').onclick = dong;
    return { el: nen, dong: dong };
  }
  function bangTam(ds) {
    var cong = ds.reduce(function (s, x) { return s + x.cong; }, 0), tru = ds.reduce(function (s, x) { return s + x.tru; }, 0);
    var chip = function (n, cls) { return n ? '<i class="sx-hh ' + cls + '">' + (n > 0 ? '+' : '') + n + SAO + '</i>' : ''; };
    return '<div class="sx-xn-tong"><span class="em">' + ds.length + '<small>HỌC SINH</small></span><span class="la">' + (cong ? '+' + cong : '0') + '<small>SAO THƯỞNG</small></span><span class="do">' + (tru || '0') + '<small>SAO PHẠT</small></span></div>' +
      '<div class="sx-xn-ds">' + ds.map(function (x) {
        return '<div class="sx-xn-dong">' + avHtml(x.ten) + '<span>' + esc(x.ten) + '<span class="ly">' + esc(x.ds.map(function (d) { return String(d.ly).split(' / ')[0]; }).join(' · ')) + '</span></span><span class="so">' + chip(x.cong, 'tam') + chip(x.tru, 'tam phat') + '</span></div>';
      }).join('') + '</div>';
  }
  // Ghi phiếu thật cho mọi sao tạm của bài `baiId`. Trả Promise (lỗi ⇒ sao tạm GIỮ NGUYÊN).
  function dayVaoVi(c, ds) {
    var dong = function (laCong) {
      var ra = [];
      ds.forEach(function (x) { x.ds.forEach(function (d) { if ((d.n > 0) === laCong) ra.push({ so: x.so, n: d.n, viec: d.ly, app: 'dashboard' }); }); });
      return ra;
    };
    var luc = Date.now(), phieu = function (laCong, dg) {
      return { nguon: 'dashboard', lop: c.maLop || '', ngay: ngayVN(), bai: c.baiId || '', maBai: c.maBai || '',
        nhom: laCong ? 'Thầy Andrew thưởng' : 'Thầy Andrew phạt', ai: 'Thầy Andrew', dong: dg, tao: luc };
    };
    var cg = dong(true), tr = dong(false);
    return kho().then(function (f) {
      var viec = [];
      for (var i = 0; i < cg.length; i += 300) viec.push(f.fs.addDoc(f.fs.collection(f.db, 'saoDot'), phieu(true, cg.slice(i, i + 300))));
      for (var j = 0; j < tr.length; j += 300) viec.push(f.fs.addDoc(f.fs.collection(f.db, 'saoDot'), phieu(false, tr.slice(j, j + 300))));
      return Promise.all(viec);
    });
  }
  // chốt xong: sao tạm ⇒ "đã vào ví" (bộ nhớ). v1.394.0 — mọi ngôi sao tạm cạnh tên + số trên avatar BAY VÀO NÚT VÍ (vệt lấp lánh,
  // ví nảy + toé tia mỗi lần nhận), xong hết mới hiện huy hiệu ĐẶC ở cột tổng. `sauDo` chạy khi hiệu ứng xong.
  function nuotSao(c, ds, sauDo) {
    var vi = document.getElementById('hqViSao'), xh = document.getElementById('hqXh'), bay = [];
    ds.forEach(function (x) {
      var el = xh ? [].slice.call(xh.querySelectorAll('.sx-ts[data-so="' + x.so + '"]')) : [];
      var so = xh && xh.querySelector('.sx-av-so[data-so="' + x.so + '"]');
      bay.push(so ? el.concat([so]) : el);
    });
    var tm = tamCua(c.baiId), m = K.dot[c.baiId] = K.dot[c.baiId] || {}, moi = {};
    ds.forEach(function (x) {
      x.ds.forEach(function (d) { (m[x.so] = m[x.so] || []).push({ n: d.n, ly: d.ly, tao: Date.now() }); var v = K.vi[x.so] = K.vi[x.so] || { s: 0 }; v.s = (Number(v.s) || 0) + d.n; });
      delete tm[x.so]; moi[x.so] = 'vi';
    });
    var vb = vi && vi.getBoundingClientRect(), co = vb && vb.width, cho = 0, dem = 0;
    if (vi) vi.classList.add('sx-vi-nhan');   // nút VÍ giữ sáng (không mờ) tới khi bay xong
    capNhatVi();
    if (co) {
      var tx = vb.left + vb.width / 2, ty = vb.top + vb.height / 2;
      bay.forEach(function (els, j) {
        els.forEach(function (el, k) {
          var tre = j * 110 + k * 90 + (el.classList.contains('sx-av-so') ? 140 : 0);
          cho = Math.max(cho, tre + 900); dem++;
          setTimeout(function () { bayVaoVi(el, tx, ty, vi); }, tre);
        });
      });
    }
    setTimeout(function () {
      if (vi) { vi.classList.remove('sx-vi-nhan'); if (dem) { vi.classList.remove('sx-vi-xong'); void vi.offsetWidth; vi.classList.add('sx-vi-xong'); } }
      if (veHuyHieu(moi) && window.__hqVuaKhung) window.__hqVuaKhung();
      var tb = document.createElement('div'); tb.className = 'sx-toast la'; tb.textContent = '✓ Đã đưa sao vào ví ' + ds.length + ' học sinh';
      document.body.appendChild(tb); setTimeout(function () { tb.remove(); }, 2800);
      setTimeout(function () { napDot(c.baiId, true).then(function () { if (ctx() && ctx().baiId === c.baiId) veHuyHieu(); }); napChung(true)['catch'](function () {}); }, 6000);
      if (sauDo) sauDo();
    }, cho + 250);
  }
  // MỘT dấu sao tạm (hoặc số trên avatar) bay theo đường cong vào nút VÍ, để lại vệt lấp lánh.
  function bayVaoVi(el, tx, ty, vi) {
    var r = el.isConnected && el.getBoundingClientRect();
    if (!r || !r.width) { if (el.isConnected) el.remove(); return; }
    var laSo = el.classList.contains('sx-av-so'), phat = el.classList.contains('phat');
    var cl = document.createElement('div');
    cl.className = 'sx-bayvi' + (laSo ? ' so' : '') + (phat ? ' phat' : '');
    cl.innerHTML = el.innerHTML;
    cl.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;font-size:' + getComputedStyle(el).fontSize;
    document.body.appendChild(cl);
    el.style.visibility = 'hidden';
    var dx = tx - (r.left + r.width / 2), dy = ty - (r.top + r.height / 2), cong = Math.min(160, 60 + Math.hypot(dx, dy) * 0.18);
    var xoay = laSo ? 0 : 1, an = hoatAnh(cl, [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + dx * 0.04 + 'px,' + (-14) + 'px) scale(' + (laSo ? 1.5 : 1.7) + ') rotate(' + (-25 * xoay) + 'deg)', opacity: 1, offset: 0.16 },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - cong) + 'px) scale(' + (laSo ? 1.15 : 1.25) + ') rotate(' + (200 * xoay) + 'deg)', opacity: 1, offset: 0.58 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.3) rotate(' + (420 * xoay) + 'deg)', opacity: 0.85 }
    ], { duration: 860, easing: 'cubic-bezier(.45,0,.35,1)', fill: 'forwards' });
    var dung = false, vet = function () {
      if (dung) return;
      var q = cl.getBoundingClientRect();
      var v = document.createElement('i'); v.className = 'sx-vet' + (phat ? ' phat' : '');
      v.style.left = (q.left + q.width / 2 + (Math.random() - 0.5) * 10) + 'px'; v.style.top = (q.top + q.height / 2 + (Math.random() - 0.5) * 10) + 'px';
      document.body.appendChild(v);
      var a = hoatAnh(v, [{ transform: 'scale(1)', opacity: 0.95 }, { transform: 'translate(0,' + (6 + Math.random() * 10) + 'px) scale(.1)', opacity: 0 }], { duration: 520 + Math.random() * 200, easing: 'ease-out' });
      (a.finished || Promise.resolve()).then(function () { v.remove(); }, function () { v.remove(); });
      setTimeout(vet, 38);
    };
    setTimeout(vet, 120);
    var het = function () {
      dung = true; cl.remove(); el.remove();
      toeTia(tx, ty, phat);
      if (vi) { vi.classList.remove('sx-vi-an'); void vi.offsetWidth; vi.classList.add('sx-vi-an'); }
    };
    if (an.finished) an.finished.then(het, het); else setTimeout(het, 900);
  }
  // Hộp "Đưa sao vào ví?" (nút VÍ) hoặc "Còn sao chưa đưa vào ví" (đóng pop-up). `khiXong(daDua)` sau khi xử lý.
  var DANG_DUA = false;
  function hoiVi(kieuDong, khiXong) {
    var c = ctx(), ds = c ? dsTam(c.baiId) : []; if (!ds.length || DANG_DUA) return false;
    var dau = kieuDong
      ? '<div class="sx-xn-dau"><span class="sx-xn-ic canh">' + SAO + '</span><div><b>Còn sao chưa đưa vào ví</b><small>' + ds.length + ' học sinh còn sao TẠM ở bài này. Thầy muốn làm gì?</small></div></div>'
      : '<div class="sx-xn-dau"><span class="sx-xn-ic">' + VI_IC + '</span><div><b>Đưa sao vào ví?</b><small>' + esc(c.lopGoc || '') + ' · ' + esc(c.maBai || '') + ' — sao tạm sẽ thành sao THẬT trong ví từng em.</small></div></div>';
    var h = hopHoi('<button class="sx-xn-x" type="button" title="' + (kieuDong ? 'Quay lại' : 'Đóng') + '">✕</button>' + dau + bangTam(ds) +
      (kieuDong ? '' : '<div class="sx-xn-chu">Em được thưởng sẽ nhận thông báo "+N⭐". Sau khi vào ví, muốn sửa thì cộng/trừ lại ở hộp <b>Sao học sinh</b>.</div>') +
      '<div class="sx-loi" hidden></div><div class="sx-xn-nut">' + (kieuDong ? '<button type="button" class="bo" data-bo>HỦY BỎ</button>' : '<button type="button" class="phu" data-x>HUỶ</button>') +
      '<button type="button" class="chinh" data-ok>' + VI_IC + 'ĐƯA VÀO VÍ</button></div>', kieuDong ? 'canh' : '');
    var x = h.el.querySelector('[data-x]'); if (x) x.onclick = h.dong;
    var bo = h.el.querySelector('[data-bo]');
    if (bo) bo.onclick = function () {
      h.dong(); K.tam[c.baiId] = {}; veHuyHieu(); if (window.__hqVuaKhung) window.__hqVuaKhung();
      if (khiXong) khiXong(false);
    };
    var ok = h.el.querySelector('[data-ok]');
    ok.onclick = function () {
      ok.disabled = true; DANG_DUA = true; ok.lastChild.textContent = 'ĐANG GHI…';
      dayVaoVi(c, ds).then(function () {
        DANG_DUA = false; h.dong();
        nuotSao(c, ds, khiXong ? function () { khiXong(true); } : null);
      })['catch'](function (e) {
        DANG_DUA = false; ok.disabled = false; ok.lastChild.textContent = 'ĐƯA VÀO VÍ';
        var s = String((e && (e.code || e.message)) || e);
        baoLoi(h.el, s.indexOf('permission') >= 0 ? 'CHƯA GHI được — cần phiên thầy (🔐) / kiểm luật kho sao. Sao tạm vẫn giữ nguyên.' : 'CHƯA GHI được: ' + s.slice(0, 80) + ' — sao tạm vẫn giữ nguyên.');
      });
    };
    return true;
  }
  // Dashboard gọi trong dongBaiModal: còn sao tạm ⇒ hỏi, trả true (chặn đóng); `dongThat` = đóng thật sau khi xử lý.
  function chanDong(dongThat) {
    if (MO) MO.dong();
    return hoiVi(true, function () { dongThat(); });
  }
  // còn sao tạm mà tải lại / đóng trang ⇒ trình duyệt hỏi lại
  window.addEventListener('beforeunload', function (e) {
    var coTam = Object.keys(K.tam).some(function (id) { return dsTam(id).length; });
    if (coTam) { e.preventDefault(); e.returnValue = ''; }
  });
  function toast(chu) {
    var t = document.createElement('div'); t.className = 'sx-toast'; t.textContent = chu;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4200);
  }
  function hoatAnh(el, kf, o) { try { return el.animate(kf, o); } catch (e) { return { onfinish: null, finished: Promise.resolve() }; } }
  // v1.394.0 — `dich` = [{ten, k}] đích từng ngôi sao (bảng được thưởng); `moi` = em vừa có sao tạm.
  // Lúc sao rời giữa màn: vẽ sẵn dấu sao tạm cạnh tên (ẩn) ⇒ đo đúng chỗ ⇒ bay tới ⇒ chạm thì dấu nảy ra; bay xong hết ⇒ số trên avatar hiện.
  function bayMan(dich, dsTen, n, ly, laLop, moi) {
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
      man.appendChild(s); lon.push({ el: s, x: x, y: y, dich: dich[i] || dich[0] });
      hoatAnh(s, [{ transform: 'translate(' + x + 'px,' + y + 'px) scale(0) rotate(-140deg)', opacity: 0 }, { transform: 'translate(' + x + 'px,' + y + 'px) scale(1.25) rotate(8deg)', opacity: 1, offset: .7 }, { transform: 'translate(' + x + 'px,' + y + 'px) scale(1)', opacity: 1 }],
        { duration: 620, delay: 120 + i * 110, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'forwards' });
    }
    // cả lớp: mỗi em một sao nhỏ lấp lánh quanh sao to, rồi bay về đúng avatar em đó
    var bay = laLop ? dsTen.map(function (ten, j) {
      var g = Math.PI * 2 * j / dsTen.length + Math.random() * .3, R = to * 0.95 + Math.random() * 90;
      var e = document.createElement('div'); e.className = 'sx-bay nho'; e.innerHTML = SAO; e.style.cssText = 'width:34px;height:34px;margin:-17px 0 0 -17px;opacity:0'; man.appendChild(e);
      var o = { el: e, dich: dich[j] || { ten: ten, k: 'tong' }, x: cx + Math.cos(g) * R * 1.35, y: cy + Math.sin(g) * R * .8, co: 1.2 };
      hoatAnh(e, [{ transform: 'translate(' + cx + 'px,' + cy + 'px) scale(0)', opacity: 0 }, { transform: 'translate(' + o.x + 'px,' + o.y + 'px) scale(1.2) rotate(90deg)', opacity: 1 }],
        { duration: 700, delay: 500 + j * 25, easing: 'cubic-bezier(.2,1.2,.4,1)', fill: 'forwards' });
      hoatAnh(e, [{ filter: 'brightness(1)' }, { filter: 'brightness(1.8)' }, { filter: 'brightness(1)' }], { duration: 600, delay: 1200 + (j % 5) * 120, iterations: 2 });
      return o;
    }) : lon.map(function (o) { o.co = 1; return o; });
    requestAnimationFrame(function () { man.classList.add('mo'); });
    var hienHet = function () {   // dấu còn ẩn (sao rơi giữa đường / dashboard vẽ lại) ⇒ hiện hết
      [].forEach.call(document.querySelectorAll('#hqXh .sx-ts.cho, #hqXh .sx-av-so.cho'), function (x) { x.classList.remove('cho'); x.classList.add('moi'); });
    };
    var daXong = false, ketThuc = function () { if (daXong) return; daXong = true; setTimeout(function () { man.remove(); }, 300); hienHet(); };
    setTimeout(ketThuc, (laLop ? 2300 : 1700 + k * 110) + 2600 + dsTen.length * 50);
    setTimeout(function () {
      man.classList.remove('mo');
      if (veHuyHieu(moi, true) && window.__hqVuaKhung) window.__hqVuaKhung();
      if (laLop) lon.forEach(function (o) { hoatAnh(o.el, [{ opacity: 1, transform: 'translate(' + o.x + 'px,' + o.y + 'px) scale(1)' }, { opacity: 0, transform: 'translate(' + o.x + 'px,' + o.y + 'px) scale(1.6)' }], { duration: 380, fill: 'forwards' }); });
      var con = bay.length, xongMot = function () { if (--con === 0) ketThuc(); };
      bay.forEach(function (o, j) {
        var ten = o.dich.ten, dau = timDau(o.dich, phat), a = dau || ((hangTong(ten) || {}).querySelector ? hangTong(ten).querySelector('.bm-em-av') : null);
        var b = a && a.getBoundingClientRect();
        if (!b || !b.width) { o.el.remove(); return xongMot(); }
        var tx = b.left + b.width / 2, ty = b.top + b.height / 2;
        var mx = (o.x + tx) / 2 + (phat ? -60 : 80), my = Math.min(o.y, ty) - (laLop ? 120 : 180);
        var sc = laLop ? Math.max(.35, b.height / 34 * 1.1) : Math.max(.12, b.height / to * 1.25);
        var an = hoatAnh(o.el, [{ transform: 'translate(' + o.x + 'px,' + o.y + 'px) scale(' + o.co + ') rotate(' + (laLop ? 90 : 0) + 'deg)', opacity: 1 },
          { transform: 'translate(' + mx + 'px,' + my + 'px) scale(' + (laLop ? .9 : .6) + ') rotate(220deg)', opacity: 1, offset: .55 },
          { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ') rotate(420deg)', opacity: .95 }],
          { duration: laLop ? 760 : 820, delay: j * (laLop ? 45 : 120), easing: 'cubic-bezier(.55,0,.35,1)', fill: 'forwards' });
        var het = function () {
          o.el.remove(); toeTia(tx, ty, phat);
          var d2 = timDau(o.dich, phat) || dau;   // dashboard có thể vừa vẽ lại hàng
          if (d2) { d2.classList.remove('cho', 'moi'); void d2.offsetWidth; d2.classList.add('moi'); }
          // ngôi cuối của em này chạm ⇒ số trên avatar hiện + avatar nảy
          var conEm = bay.some(function (p) { return p !== o && !p.toi && p.dich.ten === ten; });
          o.toi = true;
          if (!conEm) {
            var rt = hangTong(ten), av = rt && rt.querySelector('.bm-em-av'), sv = av && av.querySelector('.sx-av-so');
            if (sv) { sv.classList.remove('cho', 'moi'); void sv.offsetWidth; sv.classList.add('moi'); }
            if (av) { av.classList.remove('sx-av-nhan', 'sx-av-phat'); void av.offsetWidth; av.classList.add(phat ? 'sx-av-phat' : 'sx-av-nhan'); }
          }
          xongMot();
        };
        if (an.finished) an.finished.then(het, het); else setTimeout(het, 900);
      });
      if (!bay.length) ketThuc();
    }, laLop ? 2300 : 1700 + k * 110);
  }
  // dấu sao tạm đúng dấu (+/−) trong hàng đích
  function timDau(d, phat) {
    var r = hangCua(d.k, d.ten) || hangTong(d.ten);
    return r ? r.querySelector('.sx-ts' + (phat ? '.phat' : ':not(.phat)')) : null;
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
    var v = e.target.closest && e.target.closest('#hqViSao');
    if (v) { e.stopPropagation(); if (!v.disabled) { if (MO) MO.dong(); hoiVi(false, null); } return; }
    var n = e.target.closest && e.target.closest('#hqSaoLop'); if (!n) return;
    e.stopPropagation();
    if (MO && MO.el.classList.contains('lop')) return MO.dong();
    moLop(n);
  }, true);

  window.SaoXh = {
    // nút ⭐ cho dải tab (dashboard chèn ngay TRƯỚC nút ⚙)
    nut: function () {
      return '<button type="button" class="hq-sao-lop" id="hqSaoLop" title="Thưởng / phạt sao CẢ LỚP ở bài này">' + SAO + '</button>' +
        // v1.338.0 — nút VÍ: đưa SAO TẠM vào ví thật (sauVe() cập nhật số + bật/tắt)
        '<button type="button" class="hq-vi-sao" id="hqViSao" title="THƯỞNG VÀO VÍ — đưa sao tạm vào ví thật" disabled>' + VI_IC + '<span class="sx-vi-dem" hidden></span></button>';
    },
    sauVe: sauVe,
    chanDong: chanDong
  };
})();
