/* ============================================================
   js/xh-tran.js — TRẬN XẾP HẠNG + NGƯỜI XEM (nw/xhtran.html?id=…) · 25/10/2026 Đợt 1. Mẫu v5 thầy duyệt.
   ĐIỆN THOẠI: cả trận vừa đúng một màn, không cuộn · chat = thanh nhỏ dưới cùng ⇒ chạm ⇒ tấm trượt lên có BÀN PHÍM RIÊNG (Telex) ⇒
   gửi xong tự hạ. Máy tính (khung ≥ 760px): chat là cột phải, gõ phím thật.

   Dữ liệu (máy chủ myLesson/app/may-chu/functions/tran-dau.js + xep-hang.js · luật tools/dang-luat-xep-hang.js):
     tranDau/{id}            cho → nhan → choi (chu · goi[{m,n}] · tim{i:uid|'-'} · hien{i:TỪ} · van · doiLuc · diem) → xong (kq · xhKq · lo)
     tranDau/{id}/tu/{từ_van} người chơi gửi từ (tạo một lần — ai trước được) · máy chủ chấm ok/d/i · `zhet_<van>` = xin đổi bàn khi hết 20 giây
     tranDau/{id}/chatGui ⇒ chat   tin chờ máy chủ lọc (đáp án / link / 2 giây) ⇒ chat chung người chơi + người xem
     tranDau/{id}/tim/{a|b} {n}   người xem thả tim (máy gộp ≤ 30 mỗi lần ghi) · xem/{uid} người đang xem (nhịp 20 giây)
     tranDau/{id}/nhip/{uid}     người chơi: nhịp 10 giây · xong (hết giờ ở máy em) · roi (rời trận = thua)
   Bàn thử ?thu=1 (người chơi, đấu với máy) · ?thu=1&xem=1 (người xem) — không ghi gì.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = XH.esc, q = new URLSearchParams(location.search), ID = q.get('id') || '';
  var app = document.getElementById('xhTran');
  var G = { T: null, ben: 'a', xem: false, pha: 'tai', van: -1, chu: [], order: [], sel: [], tu: new Map(), cho: new Map(), xinDoi: {},
    tim: { a: 0, b: 0 }, timCho: { a: 0, b: 0 }, nguoiXem: [], chat: [], chuaDoc: 0, ghiChu: [], lech: 0, thu: false, toi: null, dungVS: false, dungChoi: false, ketQua: false };
  var f = null, tRef = null, bp = null;
  var bay = function () { return Date.now() + G.lech; };
  var khac = function () { return G.ben === 'a' ? 'b' : 'a'; };
  var ten = function (k) { return G.T ? (k === 'a' ? G.T.tenA : G.T.tenB) || '?' : '?'; };
  var anh = function (k) { return G.T ? (k === 'a' ? G.T.anhA : G.T.anhB) || '' : ''; };
  var uidBen = function (k) { return G.T ? G.T[k] : ''; };
  var laRong = function () { return app.clientWidth >= 760; };
  // người xem thấy bên A trái · B phải; người chơi thấy MÌNH trái
  var trai = function () { return G.xem ? 'a' : G.ben; }, phai = function () { return G.xem ? 'b' : khac(); };

  // ---------- màn ----------
  function veTai(chu, nut) {
    app.innerHTML = '<div class="xh-giua"><p class="xh-ghi" style="font-size:15px">' + esc(chu) + '</p>' + (nut ? '<a class="xh-nut phu" style="width:auto;text-decoration:none" href="xephang.html">Về sảnh xếp hạng</a>' : '') + '</div>';
  }
  function hangBen(k) { return XH.hien(k === 'a' ? G.T.hA : G.T.hB); }
  function veVS() {
    if (G.dungVS) return capVS();
    G.dungVS = true; G.dungChoi = false;
    var ben = function (k, lop) {
      var h = hangBen(k), coCN = (G.T[k] || '').indexOf('hs_') === 0;
      return '<div class="xh-ben ' + lop + '">' + XH.av(ten(k), anh(k)) +
        '<div style="min-width:0"><h3>' + esc(ten(k)) + '</h3><div class="xh-dong"><span>Lớp <b>' + esc(k === 'a' ? G.T.lopA : G.T.lopB) + '</b></span></div>' +
        (coCN && !G.thu ? '<a class="xh-xemcn" href="canhan.html?uid=' + encodeURIComponent(G.T[k]) + '" target="_blank" rel="noopener">👤 Trang cá nhân</a>' : '') + '</div>' +
        '<div class="xh-hang">' + XH.hhTag(h.ma, h.bac, 40) + esc(h.ten) + '</div></div>';
    };
    app.innerHTML = '<div class="xh-vs">' + ben(trai(), 'l') + '<div class="xh-xx">VS<small id="xhBd">ĐANG XẾP BÀN…</small></div>' + ben(phai(), 'r') + '</div>';
    XH.veHH(app); capVS();
  }
  function capVS() {
    var b = $('#xhBd'); if (!b) return;
    var t = G.T; b.textContent = t.trangThai === 'choi' && t.batDau ? 'BẮT ĐẦU SAU ' + Math.max(1, Math.ceil((t.batDau - bay()) / 1000)) : t.trangThai === 'cho' ? 'CHỜ HAI BẠN SẴN SÀNG' : 'ĐANG XẾP BÀN…';
  }
  function dungChoi() {
    G.dungChoi = true; G.dungVS = false;
    var L = trai(), R = phai();
    app.innerHTML = '<div class="xh-tran-wrap"><div class="xh-tran">' +
      '<div class="xh-dh"><div class="xh-db l" id="xhDbL">' + XH.av(ten(L), anh(L)) + '<b class="xh-so" id="xhDL">0</b><small class="xh-tm xh-so">♥ <span id="xhTL">0</span></small></div>' +
      '<div class="xh-dongho xh-so" id="xhGio">2:00</div>' +
      '<div class="xh-db r" id="xhDbR">' + XH.av(ten(R), anh(R)) + '<b class="xh-so" id="xhDR">0</b><small class="xh-tm xh-so">♥ <span id="xhTR">0</span></small></div></div>' +
      '<div class="xh-bandau"><button class="xh-thoat" id="xhThoat" aria-label="' + (G.xem ? 'Thôi xem' : 'Rời trận') + '">✕</button><div class="xh-soban">BÀN <b id="xhBan">1</b></div>' +
      (G.xem ? '<span class="xh-truc">TRỰC TIẾP</span>' : '<span class="xh-mat xh-so">👁 <span id="xhSoXem">0</span></span>') +
      '<div class="xh-dem20" id="xh20"><svg viewBox="0 0 46 46" width="46" height="46"><circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="5"/>' +
      '<circle id="xhC20" cx="23" cy="23" r="19" fill="none" stroke="#37D7FF" stroke-width="5" stroke-linecap="round" stroke-dasharray="119.4" stroke-dashoffset="0"/></svg><b class="xh-so" id="xhS20">20</b></div></div>' +
      '<div class="xh-goi" id="xhGoi"></div>' +
      (G.xem ? '' : '<div class="xh-danggo" id="xhGo"></div>') +
      '<div class="xh-oan-o"><div class="xh-oan' + (G.xem ? ' xem' : '') + '" id="xhOan"></div></div>' +
      (G.xem ? '<div class="xh-tim2"><button class="l" id="xhTimL"><i>♥</i><span>' + esc(ten(L)) + '</span></button><button class="r" id="xhTimR"><i>♥</i><span>' + esc(ten(R)) + '</span></button></div>' +
        '<div class="xh-nguoixem"><span class="xh-chong" id="xhChong"></span><span class="xh-so"><b id="xhSoXem">0</b> người đang xem</span></div>'
        : '<div class="xh-phim"><button id="xhXoa" aria-label="Xoá chữ cuối">⌫</button><button class="ok" id="xhGui">SUBMIT</button></div>') +
      '<button class="xh-chat-thanh" id="xhChatThanh"><span id="xhChatMoi"><b>Chat trận</b> · cổ vũ, chào nhau nhé</span><i id="xhChuaDoc" hidden>1</i>💬</button>' +
      '</div>' +
      '<div class="xh-chat" id="xhChat"><header>CHAT TRẬN <button id="xhDongChat" aria-label="Đóng chat">⌄</button></header><ol id="xhChatDs"></ol>' +
      '<div class="xh-nhanh" id="xhNhanh">' + (G.xem ? ['Hay quá! 🔥', 'Cố lên 💪', 'Kèo căng 😆', 'Đỉnh 👏', 'GG 👍'] : ['GG 👍', 'Hay quá! 🔥', 'Cố lên 💪', 'Khó ghê 😅', 'Chơi đẹp nha 🤝']).map(function (t) { return '<button type="button">' + t + '</button>'; }).join('') + '</div>' +
      '<form class="xh-onhap" id="xhChatGo"><div class="xh-ogia" id="xhOGia"></div><input class="xh-ochat" id="xhOChat" autocomplete="off" maxlength="120" placeholder="' + (G.xem ? 'Cổ vũ hai bạn…' : 'Nhắn cho đối thủ…') + '" aria-label="Nhắn tin trong trận">' +
      '<button class="xh-guichat" aria-label="Gửi">➤</button></form><div class="xh-bp" id="xhBp"></div></div>' +
      '</div><div class="xh-che" id="xhChe"></div>';
    bp = XH.BanPhim({ goc: $('#xhBp'), o: $('#xhOGia'), goiY: function () { return G.xem ? 'Cổ vũ hai bạn…' : 'Nhắn cho đối thủ…'; }, gui: guiChat });
    G.van = -1; veChat(); capChoi();
  }
  // ---------- vẽ khi chơi ----------
  function capChoi() {
    var t = G.T; if (!t || !G.dungChoi) return;
    if (t.van !== G.van || (t.chu || '') !== G.chu.join('')) {
      var doiVan = G.van >= 0 && t.van !== G.van;
      G.van = t.van || 0; G.chu = String(t.chu || '').split(''); G.sel = [];
      G.order = G.chu.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; });
      var o = $('#xhOan');
      o.classList.toggle('cho', !G.chu.length);
      o.innerHTML = (G.chu.length ? G.order : Array.from({ length: 16 }, function (_, i) { return i; })).map(function (k, n) {
        return '<button type="button" data-k="' + k + '"' + (G.xem ? ' tabindex="-1"' : '') + ' style="animation-delay:' + (n * 20) + 'ms">' + esc(G.chu[k] || '?') + '</button>';
      }).join('');
      o.classList.remove('doi'); void o.offsetWidth; if (doiVan || G.chu.length) o.classList.add('doi');
      $('#xhBan').textContent = G.van + 1;
      veGo();
    }
    var L = trai(), R = phai(), d = t.diem || {};
    $('#xhDL').textContent = d[L] || 0; $('#xhDR').textContent = d[R] || 0;
    veGoi(); capGio();
  }
  function veGoi() {
    var t = G.T, goi = t.goi || [], tim = t.tim || {}, hien = t.hien || {};
    // chữ của từ đã tìm: đọc từ tài liệu từ (máy chủ chấm ok + i của bàn này)
    var chuTim = {};
    G.tu.forEach(function (x) { if (x.ok === true && x.v === (t.van || 0) && x.i >= 0) chuTim[x.i] = x.w.toUpperCase(); });
    $('#xhGoi').innerHTML = goi.map(function (g, i) {
      var ai = tim[i], lop = !ai ? '' : ai === '-' ? 'lo' : ai === uidBen(trai()) ? 'ta' : 'ban';
      var w = ai === '-' ? (hien[i] || '') : (chuTim[i] || '');
      var o = ''; for (var k = 0; k < (g.n || 0); k++) o += '<i>' + esc(w[k] || '') + '</i>';
      return '<div class="xh-g ' + lop + '"><span class="xh-y">' + esc(g.m || '') + '</span><span class="xh-o">' + o + '</span></div>';
    }).join('');
  }
  function veGo() {
    if (G.xem) return;
    [].forEach.call($('#xhOan').children, function (e) { e.classList.toggle('chon', G.sel.indexOf(+e.dataset.k) >= 0); });
    var g = $('#xhGo'); if (g && !g.classList.contains('khoa')) g.innerHTML = G.sel.map(function (k) { return '<span>' + esc(G.chu[k]) + '</span>'; }).join('');
  }
  function capGio() {
    var t = G.T; if (!t || !G.dungChoi) return;
    var con = (t.ketThuc || 0) - bay(), g = $('#xhGio');
    g.textContent = XH.dongHo(con); g.classList.toggle('gap', con < 15000);
    var tuLuc = t.doiLuc || t.batDau || 0, c20 = Math.max(0, Math.ceil((20000 - (bay() - tuLuc)) / 1000));
    $('#xhS20').textContent = c20; $('#xhC20').style.strokeDashoffset = 119.4 * (1 - Math.min(20, c20) / 20); $('#xh20').classList.toggle('gap', c20 <= 5);
    // hết 20 giây mà bàn chưa xong ⇒ người chơi xin máy chủ đổi bàn (hai máy cùng xin thì máy sau bị từ chối — không sao)
    if (!G.xem && !G.thu && c20 <= 0 && bay() - tuLuc > 20300 && t.trangThai === 'choi' && !G.xinDoi[t.van] && bay() < t.ketThuc) {
      G.xinDoi[t.van] = 1;
      f.fs.setDoc(f.fs.doc(tRef, 'tu', 'zhet_' + t.van), { uid: G.toi.uid, luc: f.fs.serverTimestamp() })
        .catch(function () { /* bạn đã xin trước */ })
        .finally(function () { setTimeout(function () { if (G.T && G.T.van === t.van) delete G.xinDoi[t.van]; }, 3000); });
    }
    if (!G.xem && con <= 0 && !G.daXong) { G.daXong = true; nhip({ xong: true }); }
  }
  // ---------- gửi từ ----------
  function guiTu() {
    if (G.xem || !G.T || G.T.trangThai !== 'choi' || bay() < G.T.batDau || !G.chu.length) return;
    var w = G.sel.map(function (k) { return G.chu[k]; }).join('').toLowerCase();
    if (w.length < 2) return;
    var id = w + '_' + (G.T.van || 0);
    G.sel = []; veGo();
    if (G.tu.has(id) || G.cho.has(id)) return rung('ĐÃ CÓ');
    if (G.thu) return THU.gui(w);
    G.cho.set(id, Date.now());
    f.fs.setDoc(f.fs.doc(tRef, 'tu', id), { uid: G.toi.uid, luc: f.fs.serverTimestamp() })
      .catch(function () { G.cho.delete(id); rung('TAKEN'); });
  }
  function rung(chu) {
    var g = $('#xhGo'); if (!g) return;
    g.classList.add('khoa', 'sai'); g.innerHTML = '<span>' + esc(chu || '✗') + '</span>';
    setTimeout(function () { g.classList.remove('khoa', 'sai'); veGo(); }, 450);
  }
  function cong(d) {
    var g = $('#xhGo'); if (!g) return;
    g.classList.add('khoa'); g.innerHTML = '<span class="xh-cong">+' + d + '</span>';
    setTimeout(function () { g.classList.remove('khoa'); veGo(); }, 500);
  }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('#xhOan button');
    if (b && !G.xem) { var k = +b.dataset.k, i = G.sel.indexOf(k); if (!G.chu.length) return; if (i >= 0) G.sel.splice(i, 1); else G.sel.push(k); return veGo(); }
    if (e.target.closest('#xhXoa')) { G.sel.pop(); return veGo(); }
    if (e.target.closest('#xhGui')) return guiTu();
    if (e.target.closest('#xhThoat')) return thoat();
    if (e.target.closest('#xhChatThanh')) return moChat();
    if (e.target.closest('#xhDongChat') || e.target.closest('#xhChe')) return dongChat();
    var n = e.target.closest('#xhNhanh button'); if (n) return guiChat(n.textContent);
    if (e.target.closest('#xhTimL')) return thaTim(trai());
    if (e.target.closest('#xhTimR')) return thaTim(phai());
    if (e.target.closest('[data-di]')) { location.href = e.target.closest('[data-di]').dataset.di; }
  });
  app.addEventListener('submit', function (e) {
    if (e.target.id !== 'xhChatGo') return; e.preventDefault();
    if (laRong()) { var o = $('#xhOChat'); guiChat(o.value); o.value = ''; }
  });
  addEventListener('keydown', function (e) {
    if (!G.dungChoi || document.activeElement === $('#xhOChat')) return;
    var c = $('#xhChat');
    if (c && c.classList.contains('mo') && !laRong()) { if (e.key === 'Escape') return dongChat(); return bp.phimMay(e); }
    if (G.xem) return;
    if (e.key === 'Enter') { e.preventDefault(); return guiTu(); }
    if (e.key === 'Backspace') { G.sel.pop(); return veGo(); }
    var ch = e.key.length === 1 ? e.key.toUpperCase() : ''; if (!/^[A-Z]$/.test(ch)) return;
    var k = G.chu.findIndex(function (x, i) { return x === ch && G.sel.indexOf(i) < 0; }); if (k >= 0) { G.sel.push(k); veGo(); }
  });
  function thoat() {
    if (G.xem || !G.T || G.T.trangThai !== 'choi') { location.href = G.xem ? 'xephang.html?tab=live' : 'xephang.html'; return; }
    var h = document.createElement('div'); h.className = 'xh-hop';
    h.innerHTML = '<div><h4>Rời trận?</h4><p>Rời giữa trận là <b>THUA</b>, trừ 25 điểm hạng và khoá tìm trận 2 phút.</p>' +
      '<div class="xh-hainut"><button class="xh-nut phu" data-k="o">Ở lại</button><button class="xh-nut" style="font-size:17px;background:var(--xh-do);box-shadow:none" data-k="r">RỜI TRẬN</button></div></div>';
    document.body.appendChild(h);
    h.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b && e.target !== h) return;
      h.remove(); if (b && b.dataset.k === 'r') { nhip({ roi: true }).then(function () { location.href = 'xephang.html'; }); }
    });
  }
  // ---------- chat ----------
  function moChat() { $('#xhChat').classList.add('mo'); $('#xhChe').classList.add('mo'); G.chuaDoc = 0; var c = $('#xhChuaDoc'); if (c) c.hidden = true; var ds = $('#xhChatDs'); if (ds) ds.scrollTop = 1e6; }
  function dongChat() { var c = $('#xhChat'); if (c) { c.classList.remove('mo'); $('#xhChe').classList.remove('mo'); } }
  var TEN_VAI = function (m) { return m.vai === 'gv' ? 'Thầy Andrew' : m.ten || '?'; };
  function lopTin(m) {
    if (G.toi && m.uid === G.toi.uid) return 'toi';
    if (m.vai === 'gv') return 'gv';
    if (m.vai === 'xem') return 'xem';
    return m.vai === trai() ? 'p1' : '';
  }
  function veChat() {
    var ds = $('#xhChatDs'); if (!ds) return;
    var all = G.chat.concat(G.ghiChu).sort(function (a, b) { return a.luc - b.luc; });
    ds.innerHTML = '<li class="he">Chat được thầy lưu lại · nói lời hay nhé</li>' + all.map(function (m) {
      if (m.he) return '<li class="he">' + esc(m.chu) + '</li>';
      var l = lopTin(m), ai = l === 'toi' ? '' : (m.vai === 'xem' ? '👁 ' : '') + TEN_VAI(m);
      return '<li class="' + l + '">' + (ai ? '<span class="xh-ai">' + esc(ai) + '</span>' : '') + esc(m.chu) + '</li>';
    }).join('');
    ds.scrollTop = 1e6;
    var cuoi = G.chat[G.chat.length - 1], s = $('#xhChatMoi');
    if (cuoi && s) { s.innerHTML = '<b>' + esc((cuoi.vai === 'xem' ? '👁 ' : '') + (G.toi && cuoi.uid === G.toi.uid ? 'Em' : TEN_VAI(cuoi))) + ':</b> ' + esc(cuoi.chu); }
  }
  function tinMoi(m) {
    var s = $('#xhChatMoi'); if (s) { s.classList.remove('moi'); void s.offsetWidth; s.classList.add('moi'); }
    if ($('#xhChat') && !$('#xhChat').classList.contains('mo') && !laRong() && !(G.toi && m.uid === G.toi.uid)) {
      G.chuaDoc++; var c = $('#xhChuaDoc'); if (c) { c.hidden = false; c.textContent = G.chuaDoc; }
    }
  }
  var LY_CHAN = { dapAn: '🚫 Tin có từ đáp án của bàn này nên không gửi được', nhanh: 'Gửi chậm lại một chút nhé', link: 'Không gửi link trong chat trận', rong: '', tran: 'Trận này không có chat' };
  function guiChat(chu) {
    chu = String(chu || '').replace(/\s+/g, ' ').trim().slice(0, 120); if (!chu) return;
    if (bp) bp.xoa();
    if (!laRong()) setTimeout(dongChat, 250);
    if (G.thu) return THU.chat(chu);
    f.fs.addDoc(f.fs.collection(tRef, 'chatGui'), { uid: G.toi.uid, chu: chu, luc: f.fs.serverTimestamp() }).then(function (r) {
      var huy = f.fs.onSnapshot(r, function (s) {
        var x = s.exists() ? s.data() : null; if (!x || (!x.ok && !x.chan)) return;
        huy();
        if (x.chan && LY_CHAN[x.ly]) { G.ghiChu.push({ he: 1, chu: LY_CHAN[x.ly], luc: Date.now() }); veChat(); }
      });
    }).catch(function (e) { console.warn('[xh] chat', e); });
  }
  // ---------- tim ----------
  function thaTim(k) {
    G.timCho[k] = Math.min(30, G.timCho[k] + 1); G.tim[k]++;
    var sp = $(k === trai() ? '#xhTL' : '#xhTR'); if (sp) sp.textContent = G.tim[k];
    bayTim(k);
  }
  function bayTim(k) {
    var db = $(k === trai() ? '#xhDbL' : '#xhDbR'); if (!db) return;
    var r = db.getBoundingClientRect(), g = app.getBoundingClientRect(), h = document.createElement('span');
    h.className = 'xh-bay'; h.textContent = '♥';
    h.style.left = (r.left - g.left + r.width / 2 - 10 + (Math.random() * 30 - 15)) + 'px'; h.style.top = (r.top - g.top + r.height) + 'px';
    h.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
    app.appendChild(h); setTimeout(function () { h.remove(); }, 1700);
  }
  setInterval(function () {   // gộp tim gửi 1,5 giây/lần
    if (!G.xem || G.thu || !tRef) return;
    ['a', 'b'].forEach(function (k) {
      var n = G.timCho[k]; if (!n) return; G.timCho[k] = 0;
      f.fs.setDoc(f.fs.doc(tRef, 'tim', k), { n: f.fs.increment(n) }, { merge: true }).catch(function (e) { console.warn('[xh] tim', e); });
    });
  }, 1500);
  // ---------- nhịp ----------
  async function doLech() {
    if (G.thu || G.xem) return;
    var r = f.fs.doc(tRef, 'nhip', G.toi.uid), tot = null;
    for (var k = 0; k < 3; k++) {
      try {
        var t0 = Date.now();
        await f.fs.setDoc(r, { luc: Date.now(), sv: f.fs.serverTimestamp() }, { merge: true });
        var t1 = Date.now(), s = await f.fs.getDocFromServer(r), sv = s.data().sv;
        if (sv && sv.toMillis && (!tot || t1 - t0 < tot.rtt)) tot = { rtt: t1 - t0, lech: sv.toMillis() - (t0 + t1) / 2 };
      } catch (e) { console.warn('[xh] đo giờ', e); }
    }
    if (tot) G.lech = tot.lech;
  }
  function nhip(them) {
    if (G.thu || G.xem || !tRef) return Promise.resolve();
    return f.fs.setDoc(f.fs.doc(tRef, 'nhip', G.toi.uid), Object.assign({ luc: Date.now(), sv: f.fs.serverTimestamp() }, them || {}), { merge: true }).catch(function (e) { console.warn('[xh] nhịp', e); });
  }
  // ---------- KẾT QUẢ ----------
  var CT_TEN = { thang: 'Thắng', chuoi: '🔥 Chuỗi thắng', gioVang: '⚡ Giờ vàng', hoa: 'Hòa', thua: 'Thua', boTran: 'Bỏ trận', xepLop: 'Xong 5 trận phân hạng' };
  function veKetQua() {
    if (G.ketQua) return; G.ketQua = true; G.dungChoi = false; G.dungVS = false;
    var t = G.T, d = t.diem || {}, L = trai(), R = phai();
    var lo = (t.lo || []).length ? '<p class="xh-ghi">Từ bỏ lỡ ở bàn cuối</p><div class="xh-lo">' + t.lo.map(function (x) { return '<span>' + esc(x.w) + '<small>' + esc(x.m || '') + '</small></span>'; }).join('') + '</div>' : '';
    var tiso = '<div class="xh-tiso xh-so"><span style="color:var(--xh-neon2);font-size:36px">' + (d[L] || 0) + '</span><span>–</span><span style="color:var(--xh-cyan2);font-size:36px">' + (d[R] || 0) + '</span></div>';
    if (G.xem) {
      var kqA = (t.kq || {}).a, thang = kqA === 'thang' ? t.tenA : kqA === 'thua' ? t.tenB : '';
      app.innerHTML = '<div class="xh-giua"><div class="xh-kqchu' + (thang ? '' : ' hoa') + '" style="font-size:clamp(30px,10cqw,56px)">' + (thang ? esc(thang) + '<br>CHIẾN THẮNG' : 'HÒA') + '</div>' + tiso + lo + '</div>' +
        '<div class="xh-day"><button class="xh-nut" data-di="xephang.html?tab=live">XEM TRẬN KHÁC</button></div>';
      return;
    }
    var kq = (t.kq || {})[G.ben] || 'hoa', x = (t.xhKq || {})[G.ben] || null, ly = t.ly || '';
    var tieu = kq === 'thang' ? 'CHIẾN<br>THẮNG!' : kq === 'thua' ? 'THUA<br>RỒI' : 'HÒA';
    var phu = (kq === 'thang' && /^(roi|mat)/.test(ly)) ? '<p class="xh-ghi">Đối thủ đã rời trận</p>' : (kq === 'thua' && /^(roi|mat)/.test(ly)) ? '<p class="xh-ghi">Em đã rời trận / mất kết nối</p>' : '';
    var ct = '', hang = '';
    if (x) {
      var tong = 0;
      ct = '<div class="xh-ct xh-so">' + (x.ct || []).map(function (c) { tong += c[1]; return '<span>' + esc(CT_TEN[c[0]] || c[0]) + '</span><b>' + (c[0] === 'xepLop' ? '' : (c[1] > 0 ? '+' : '') + c[1]) + '</b>'; }).join('') +
        (x.diem != null && !(x.ct || []).some(function (c) { return c[0] === 'xepLop'; }) ? '<span class="xh-tong">Điểm hạng</span><b style="color:' + (x.doi >= 0 ? 'var(--xh-neon)' : 'var(--xh-do)') + '">' + (x.doi > 0 ? '+' : '') + x.doi + '</b>' : '') + '</div>';
      var s = XH.hien(x.sau), tr = XH.hien(x.truoc);
      if (String(x.sau).indexOf('xl:') === 0) {
        var n = (x.xl || 0);
        hang = '<div class="xh-lenhang">' + XH.hhTag('an', '', 56) + '<div class="xh-tt"><b>PHÂN HẠNG ' + n + '/5</b><small>Thắng ' + (x.xlThang || 0) + ' trận · còn ' + (5 - n) + ' trận nữa là có hạng</small></div></div>';
      } else if ((x.ct || []).some(function (c) { return c[0] === 'xepLop'; })) {
        hang = '<div class="xh-lenhang">' + XH.hhTag(s.ma, s.bac, 72, 'no') + '<div class="xh-tt"><b>EM VÀO HẠNG ' + esc(s.ten.toUpperCase()) + '</b><small>Thắng ' + (x.xlThang || 0) + '/5 trận phân hạng · từ giờ mỗi trận đều tính điểm hạng</small></div></div>';
      } else {
        var h = XH.hangTu(x.diem), trong = h.trongBac == null ? 100 : h.trongBac;
        var len = x.sau !== x.truoc && XH.THU_TU.indexOf(s.ma) * 3 + ({ III: 0, II: 1, I: 2 }[s.bac] || 0) > XH.THU_TU.indexOf(tr.ma) * 3 + ({ III: 0, II: 1, I: 2 }[tr.bac] || 0);
        hang = '<div class="xh-lenhang">' + XH.hhTag(s.ma, s.bac, 62, x.sau !== x.truoc ? 'no' : '') + '<div class="xh-tt"><b>' +
          (x.sau === x.truoc ? esc(s.ten.toUpperCase()) : (len ? 'THĂNG HẠNG · ' : 'XUỐNG HẠNG · ') + esc(s.ten.toUpperCase())) + '</b>' +
          '<div class="xh-thanh"><u id="xhThanhKq" style="width:0" data-w="' + trong + '"></u></div>' +
          '<small class="xh-so">' + (h.trongBac == null ? x.diem + ' điểm' : trong + '/100') + (x.baoVe ? ' · 🛡 ' + x.baoVe + ' trận tới thua không rớt hạng' : '') + '</small></div></div>';
      }
    }
    app.innerHTML = '<div class="xh-giua"><div class="xh-kqchu ' + (kq === 'thang' ? '' : kq) + '">' + tieu + '</div>' + tiso + phu + ct + hang + lo + '</div>' +
      '<div class="xh-day xh-hainut"><button class="xh-nut phu" data-di="xephang.html">Về sảnh</button><button class="xh-nut" style="font-size:19px" data-di="xephang.html?tim=1">ĐẤU TIẾP</button></div>';
    XH.veHH(app);
    var u = $('#xhThanhKq'); if (u) requestAnimationFrame(function () { requestAnimationFrame(function () { u.style.width = u.dataset.w + '%'; }); });
  }
  // ---------- pha ----------
  function capPha() {
    var t = G.T; if (!t) return;
    if (t.trangThai === 'xong') return veKetQua();
    if (t.trangThai === 'het' || t.trangThai === 'huy') return veTai('Trận không bắt đầu (có bạn chưa sẵn sàng).', true);
    if (t.trangThai === 'han') return veTai('Đã tới giờ nghỉ đêm — trận không bắt đầu.', true);
    if (t.trangThai === 'choi' && t.batDau && bay() >= t.batDau - 200) { if (!G.dungChoi) dungChoi(); else capChoi(); return; }
    veVS();
  }
  setInterval(function () {
    if (!G.T) return;
    if (G.dungVS && G.T.trangThai === 'choi' && bay() >= G.T.batDau - 200) return capPha();
    if (G.dungVS) capVS();
    if (G.dungChoi) capGio();
    if (G.thu) THU.nhip();
  }, 250);

  // ---------- nghe kho ----------
  async function batDau() {
    G.thu = NW.laBanThu(); G.toi = NW.toi;
    if (G.thu) return THU.bat();
    if (!ID) return veTai('Không tìm thấy trận.', true);
    f = await NW.fb(); tRef = f.fs.doc(f.db, 'tranDau', ID);
    var batNghe = false;
    f.fs.onSnapshot(tRef, function (s) {
      if (!s.exists()) return veTai('Không tìm thấy trận.', true);
      var t = s.data(); G.T = t;
      if (!t.xh) { location.replace('tran.html?id=' + encodeURIComponent(ID)); return; }
      var choi = G.toi.uid === t.a || G.toi.uid === t.b;
      G.xem = !choi; G.ben = choi ? (t.a === G.toi.uid ? 'a' : 'b') : 'a';
      if (!batNghe) { batNghe = true; nghePhu(); }
      capPha();
    }, function () { veTai('Không đọc được trận.', true); });
  }
  function nghePhu() {
    f.fs.onSnapshot(f.fs.collection(tRef, 'tu'), function (snap) {
      var moi = new Map();
      snap.forEach(function (d) {
        var m = /^([a-z]+)(?:_(\d+))?$/.exec(d.id) || [], x = d.data() || {};
        if (/^z/.test(m[1] || '')) return;
        moi.set(d.id, { w: m[1] || d.id, v: m[2] != null ? +m[2] : -1, uid: x.uid, ok: x.ok, d: x.d, i: x.i, ly: x.ly });
      });
      G.cho.forEach(function (luc, id) {
        var x = moi.get(id); if (!x || x.ok == null) return; G.cho.delete(id);
        if (x.ok === true) cong(x.d || 1); else rung(x.ly === 'nhanh' ? 'CHẬM LẠI' : '✗');
      });
      G.tu = moi; if (G.dungChoi) veGoi();
    }, function () { });
    f.fs.onSnapshot(f.fs.collection(tRef, 'chat'), function (snap) {
      var cu = G.chat.length, dau = !G.coChat, ds = []; G.coChat = true;
      snap.forEach(function (d) { ds.push(d.data()); });
      ds.sort(function (a, b) { return a.luc - b.luc; });
      G.chat = ds; veChat();
      if (!dau && ds.length > cu) tinMoi(ds[ds.length - 1]);
    }, function () { });
    ['a', 'b'].forEach(function (k) {
      f.fs.onSnapshot(f.fs.doc(tRef, 'tim', k), function (s) {
        var n = s.exists() ? s.data().n || 0 : 0, cu = G.tim[k];
        if (G.xem) { if (n > G.tim[k]) G.tim[k] = n; }
        else { G.tim[k] = n; if (n > cu && G.dungChoi) for (var i = 0; i < Math.min(5, n - cu); i++) setTimeout(function () { bayTim(k); }, i * 160); }
        var sp = $(k === trai() ? '#xhTL' : '#xhTR'); if (sp) sp.textContent = G.tim[k];
      }, function () { });
    });
    f.fs.onSnapshot(f.fs.collection(tRef, 'xem'), function (snap) {
      var ds = []; snap.forEach(function (d) { var x = d.data(); if ((x.luc || 0) > Date.now() - 45000) ds.push(x); });
      G.nguoiXem = ds; veNguoiXem();
    }, function () { });
    if (G.xem) batXem();
    else { doLech(); setInterval(function () { nhip(); }, 10000); dangDau(); }
  }
  function veNguoiXem() {
    var n = $('#xhSoXem'); if (n) n.textContent = G.nguoiXem.length;
    var c = $('#xhChong'); if (c) c.innerHTML = G.nguoiXem.slice(0, 5).map(function (x) { return XH.av(x.ten, x.anh); }).join('');
  }
  function batXem() {
    var r = f.fs.doc(tRef, 'xem', G.toi.uid);
    var ghi = function () {
      var o = { ten: G.toi.laThay ? 'Thầy Andrew' : (G.toi.ten || ''), anh: G.toi.anh || '', luc: Date.now() }; if (G.toi.laThay) o.gv = true;
      f.fs.setDoc(r, o).catch(function () { o.anh = ''; f.fs.setDoc(r, o).catch(function () { }); });
    };
    ghi(); setInterval(ghi, 20000);
    addEventListener('pagehide', function () { f.fs.deleteDoc(r).catch(function () { }); });
  }
  function dangDau() {
    var r = f.fs.doc(f.db, 'tdDangDau', G.toi.uid), ghi = function () { f.fs.setDoc(r, { id: ID, luc: Date.now() }).catch(function () { }); };
    ghi(); setInterval(ghi, 30000);
    addEventListener('pagehide', function () { f.fs.deleteDoc(r).catch(function () { }); });
  }

  // ---------- BÀN THỬ (?thu=1 · ?thu=1&xem=1) ----------
  var THU = (function () {
    var BAN = [
      { l: 'MUSEUMTRAVLCHPON', w: ['TRAVEL', 'CHEAP', 'MUSEUM'], m: ['đi du lịch', 'rẻ', 'bảo tàng'] },
      { l: 'SPORTWINEFDBAKGL', w: ['SPORT', 'WINTER', 'FRIEND'], m: ['thể thao', 'mùa đông', 'bạn bè'] },
      { l: 'KITCHENBRAWLODWY', w: ['KITCHEN', 'BREAD', 'WINDOW'], m: ['nhà bếp', 'bánh mì', 'cửa sổ'] }];
    var hen = 0, chatHen = 0, timHen = 0, soChat = 0;
    function ban(i) { var b = BAN[i % BAN.length]; return { chu: b.l, goi: b.w.map(function (w, k) { return { m: b.m[k], n: w.length }; }) }; }
    function bat() {
      var t0 = Date.now();
      G.xem = q.get('xem') === '1'; G.ben = 'a'; G.toi = G.toi || { uid: 'hs_100046', ten: 'Bảo Nam' };
      G.T = Object.assign({ a: G.xem ? 'u1' : G.toi.uid, b: 'u2', tenA: G.xem ? 'Thiên Phúc' : 'Bảo Nam', tenB: G.xem ? 'Khôi Nguyên' : 'Khánh Linh', lopA: 'A2-B', lopB: 'B1-A', hA: 'vang:II', hB: 'vang:I',
        xh: 'thu', trangThai: 'choi', batDau: t0 + 3500, ketThuc: t0 + 3500 + (q.get('ngan') ? 15000 : 120000), doiLuc: t0 + 3500, van: 0, tim: {}, hien: {}, diem: { a: 0, b: 0 } }, ban(0));
      G.chat = [{ uid: 'u2', ten: G.T.tenB, vai: 'b', chu: 'Hi! Chơi đẹp nha 😄', luc: t0 - 3000 }];
      capPha();
      hen = setTimeout(may, 9000);
      chatHen = setInterval(function () {
        var ds = [['Cố lên 💪', 'Gia Huy', 'xem'], ['Bàn này khó ghê 😅', G.T.tenB, 'b'], ['Kèo căng quá 😆', 'Minh Châu', 'xem'], ['GG 👍', G.T.tenB, 'b']];
        var x = ds[(soChat = soChat + 1) % ds.length]; nhanChat({ uid: 'x' + Math.random(), ten: x[1], vai: x[2], chu: x[0], luc: Date.now() });
      }, 9000);
      timHen = setInterval(function () { var k = Math.random() < .6 ? 'a' : 'b'; G.tim[k]++; var sp = $(k === trai() ? '#xhTL' : '#xhTR'); if (sp) sp.textContent = G.tim[k]; if (G.dungChoi) bayTim(k); }, 2300);
      G.nguoiXem = [{ ten: 'Gia Huy' }, { ten: 'Minh Châu' }, { ten: 'Tuấn Kiệt' }, { ten: 'An Nhiên' }];
      setTimeout(veNguoiXem, 4000);
    }
    function nhanChat(m) { G.chat.push(m); veChat(); tinMoi(m); }
    function lay(i, uid) {
      var t = G.T, b = BAN[t.van % BAN.length]; if (t.tim[i]) return false;
      t.tim[i] = uid; var w = b.w[i];
      G.tu.set(w.toLowerCase() + '_' + t.van, { w: w.toLowerCase(), v: t.van, uid: uid, ok: true, d: Math.min(5, Math.max(1, w.length - 2)) * 2, i: i });
      var k = uid === t.a ? 'a' : 'b'; t.diem[k] += Math.min(5, Math.max(1, w.length - 2)) * 2;
      if (Object.keys(t.tim).length === 3) setTimeout(sang, 700);
      capChoi(); return true;
    }
    function sang() {
      var t = G.T, b = BAN[t.van % BAN.length];
      if (t.doiDang) return; t.doiDang = true;
      b.w.forEach(function (w, i) { if (!t.tim[i]) { t.tim[i] = '-'; t.hien[i] = w; } });
      capChoi();
      setTimeout(function () { t.van++; Object.assign(t, ban(t.van), { tim: {}, hien: {}, doiLuc: Date.now(), doiDang: false }); capChoi(); }, 500);
    }
    function may() {
      var t = G.T; if (t.trangThai !== 'choi') return;
      var b = BAN[t.van % BAN.length], con = b.w.map(function (_, i) { return i; }).filter(function (i) { return !t.tim[i]; });
      if (con.length && Date.now() >= t.batDau) lay(con[Math.floor(Math.random() * con.length)], G.xem ? (Math.random() < .5 ? t.a : t.b) : t.b);
      hen = setTimeout(may, (G.xem ? 3500 : 6000) + Math.random() * 4000);
    }
    function gui(w) {
      var t = G.T, b = BAN[t.van % BAN.length], i = b.w.indexOf(w.toUpperCase());
      if (i < 0 || t.tim[i]) return rung(i < 0 ? '✗' : 'TAKEN');
      var d = Math.min(5, Math.max(1, w.length - 2)) * 2; lay(i, t.a); cong(d);
    }
    function chat(chu) {
      var b = BAN[G.T.van % BAN.length], gon = chu.toUpperCase().replace(/[^A-Z]/g, '');
      if (G.T.trangThai === 'choi' && b.w.some(function (w) { return gon.indexOf(w) >= 0; })) { G.ghiChu.push({ he: 1, chu: LY_CHAN.dapAn, luc: Date.now() }); return veChat(); }
      nhanChat({ uid: G.toi.uid, ten: G.toi.ten, vai: G.xem ? 'xem' : 'a', chu: chu, luc: Date.now() });
    }
    function nhip() {
      var t = G.T; if (t.trangThai !== 'choi') return;
      if (Date.now() - t.doiLuc >= 20000 && Date.now() < t.ketThuc) sang();
      if (Date.now() >= t.ketThuc) {
        clearTimeout(hen); clearInterval(timHen);
        var a = t.diem.a, b = t.diem.b, kq = a > b ? 'thang' : a < b ? 'thua' : 'hoa';
        t.kq = { a: kq, b: kq === 'thang' ? 'thua' : kq === 'thua' ? 'thang' : 'hoa' };
        t.xhKq = { a: kq === 'thang' ? { doi: 41, ct: [['thang', 24], ['chuoi', 5], ['gioVang', 12]], truoc: 'vang:II', sau: 'vang:I', diem: 705, baoVe: 3 }
          : kq === 'thua' ? { doi: -12, ct: [['thua', -12]], truoc: 'vang:II', sau: 'vang:II', diem: 752 } : { doi: 5, ct: [['hoa', 5]], truoc: 'vang:II', sau: 'vang:II', diem: 769 } };
        t.lo = [{ w: 'WINDOW', m: 'cửa sổ' }]; t.trangThai = 'xong'; capPha();
      }
    }
    return { bat: bat, gui: gui, chat: chat, nhip: nhip };
  })();

  NW.dungThanh({ tab: 'khamPha', hop: true }).then(batDau);
})();
