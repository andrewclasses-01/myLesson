/* ============================================================
   js/xh-tran.js — TRẬN XẾP HẠNG + NGƯỜI XEM (nw/xhtran.html?id=…) · 25/10/2026 Đợt 1. Mẫu v5 thầy duyệt.
   ĐIỆN THOẠI: cả trận vừa đúng một màn, không cuộn · chat = thanh nhỏ dưới cùng ⇒ chạm ⇒ tấm trượt lên có BÀN PHÍM RIÊNG (Telex) ⇒
   gửi xong tự hạ. Máy tính (khung ≥ 760px): chat là cột phải, gõ phím thật.

   Dữ liệu (máy chủ myLesson/app/may-chu/functions/tran-dau.js + xep-hang.js · luật tools/dang-luat-xep-hang.js):
     tranDau/{id}            cho → nhan → choi (chu · goi[{m,n}] · tim{i:uid|'-'} · hien{i:TỪ} · van · doiLuc · diem) → xong (kq · xhKq · lo)
     tranDau/{id}/tu/{từ_van} người chơi gửi từ (tạo một lần — ai trước được) · máy chủ chấm ok/d/i · `zhet_<van>` = xin đổi bàn khi hết 20 giây (gợi ý tiếng Anh 30 giây)
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
  // ⭐ 31/10 THẦY ANDREW HỖ TRỢ (mẫu XEP HANG MUA - thiet ke/thay-ho-tro-v2): thầy đang xem bấm ảnh một em ⇒ chơi hộ em đó.
  //   G.ho = bên thầy đang chơi hộ (chỉ máy thầy). Thầy gửi từ `{từ}_{bàn}_{G.ho}` uid = thầy — máy chủ chấm theo đuôi (benGui).
  var laThayXem = function () { return G.xem && !!(G.toi && G.toi.laThay); };
  var choiDuoc = function () { return !G.xem || !!G.ho; }, benGui = function () { return G.xem ? G.ho : G.ben; };

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
        (coCN && !G.thu ? '<a class="xh-xemcn" href="canhan.html?uid=' + encodeURIComponent(G.T[k]) + '" target="_blank" rel="noopener">' + XH.bt('nguoi', 14) + ' Trang cá nhân</a>' : '') + '</div>' +
        '<div class="xh-hang">' + XH.hhTag(h.ma, h.bac, 40) + esc(h.ten) + '</div></div>';
    };
    app.innerHTML = '<div class="xh-vs">' + ben(trai(), 'l') + '<div class="xh-xx">VS<small id="xhBd">ĐANG XẾP BÀN…</small></div>' + ben(phai(), 'r') + '</div>';
    XH.veHH(app); capVS();
  }
  function capVS() {
    var b = $('#xhBd'); if (!b) return;
    var t = G.T; b.textContent = t.trangThai === 'choi' && t.batDau ? 'BẮT ĐẦU SAU ' + Math.max(1, Math.ceil((t.batDau - bay()) / 1000)) : t.trangThai === 'cho' ? 'CHỜ HAI BẠN SẴN SÀNG' : 'ĐANG XẾP BÀN…';
  }
  // ⭐ 27/10 MẪU v7 (thầy chốt giao diện) — D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\mau-v7-tinh-chinh\mau-v7.html
  //   Bố cục theo khung: DỌC (điện thoại) · NGANG (laptop/PC/iPad ngang: cụm game trái + chat cao hết màn bên phải khi rộng ≥ 1200)
  //   · NGANG THẤP (điện thoại xoay ngang). Ô chữ chỉ nhận chuột/chạm (pointerdown) — KHÔNG nhận bàn phím (công bằng).
  var IC_CHAT = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.4L3.5 20.5l1.4-4.4A8.4 8.4 0 1 1 20.5 11.6Z"/><path d="M8.5 10.5h7M8.5 13.8h4.5"/></svg>';
  function cheDo() {
    var w = app.clientWidth, h = app.clientHeight, ngang = w > h;
    var C = { ngang: ngang, thap: ngang && h < 450, coChat: ngang && h >= 450 && w >= 1200, dai: !ngang && h >= 800 };
    C.ma = [C.ngang, C.thap, C.coChat, C.dai].join();
    return C;
  }
  function dungChoi() {
    G.dungChoi = true; G.dungVS = false; G.veLai = false;
    app.classList.add('v7');   // bỏ trần 1100px của khung cũ TRƯỚC khi đo hướng màn
    var L = trai(), R = phai(), C = cheDo(); G.cd = C;
    var tenNho = function (k) { return G.xem ? ten(k) : (k === G.ben ? 'Em' : ten(k)); };
    var r20 = '<div class="xh-dem20" id="xh20"><svg viewBox="0 0 46 46"><circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="5"/>' +
      '<circle id="xhC20" cx="23" cy="23" r="19" fill="none" stroke="#37D7FF" stroke-width="5" stroke-linecap="round" stroke-dasharray="119.4" stroke-dashoffset="0"/></svg><b class="xh-so" id="xhS20">20</b></div>';
    var dongHo = '<div class="xh-dongho xh-so" id="xhGio">2:00</div>';
    var ben = function (k, lop, id) {
      return '<div class="xh-db ' + lop + '" id="' + id + '">' + XH.av(ten(k), anh(k)) + '<b class="xh-so" id="' + (lop === 'l' ? 'xhDL' : 'xhDR') + '">0</b>' +
        '<span class="xh-dbt"><small class="xh-dbten">' + esc(tenNho(k)) + '</small><small class="xh-tm xh-so">' + XH.bt('tim', 0, 'em') + ' <span id="' + (lop === 'l' ? 'xhTL' : 'xhTR') + '">0</span></small></span></div>';
    };
    var giua = C.ngang ? '<div class="xh-dhgiua">' + dongHo + r20 + '</div>' : dongHo;
    // 31/10 thầy: nhãn TRỰC TIẾP của người xem nằm GIỮA màn, ngay dưới cụm thời gian
    //   màn ngang: trong cột giữa · màn dọc (điện thoại): hàng riêng canh giữa ngay dưới hàng đồng hồ (cột giữa hẹp, nhãn có dãy ảnh)
    var truc = G.xem ? '<span class="xh-truc">TRỰC TIẾP · ' + XH.bt('mat', 0, 'em') + ' <b id="xhSoXem">0</b><span class="xh-trucav" id="xhTrucAv"></span></span>' : '';
    if (truc && C.ngang) giua = '<div class="xh-dhxem">' + giua + truc + '</div>';
    var top = '<div class="xh-dh">' + ben(L, 'l', 'xhDbL') + giua + ben(R, 'r', 'xhDbR') + '</div>' + (truc && !C.ngang ? '<div class="xh-dhxem doc">' + truc + '</div>' : '');
    var nutChat = '<button class="xh-nutchat" id="xhChatThanh" aria-label="Chat trận">' + IC_CHAT + '<i id="xhChuaDoc" hidden>1</i></button>';
    var bd = '<div class="xh-bandau"><button class="xh-thoat" id="xhThoat" aria-label="' + (G.xem ? 'Thôi xem' : 'Rời trận') + '"' + (buoc() ? ' style="visibility:hidden" tabindex="-1"' : '') + '>' + XH.bt('sai', 18) + '</button><div class="xh-soban">BÀN <b id="xhBan">1</b></div>' +
      // ô đang gõ: điện thoại (dọc + ngang) nằm cùng hàng số bàn để dồn chỗ cho bàn chữ; màn ngang lớn nằm dưới bàn chữ
      (G.xem ? (G.ho && !(C.ngang && !C.thap) ? '<div class="xh-danggo" id="xhGo"></div>' : '') : (C.ngang && !C.thap ? '<span class="xh-mat xh-so">' + XH.bt('mat', 0, 'em') + ' <span id="xhSoXem">0</span></span>' : '<div class="xh-danggo" id="xhGo"></div>')) +
      (!C.ngang && !C.dai ? nutChat : '') + (C.ngang ? '' : r20) + '</div>';
    var goi = '<div class="xh-goi" id="xhGoi"></div>';
    var oan = '<div class="xh-oan-o" id="xhOanO"><div class="xh-oan' + (choiDuoc() ? '' : ' xem') + '" id="xhOan"></div></div>';
    var phim = !choiDuoc() ? '<div class="xh-tim2"><button class="l" id="xhTimL"><i>' + XH.bt('tim', 0, 'em') + '</i><span>' + esc(ten(L)) + '</span></button><button class="r" id="xhTimR"><i>' + XH.bt('tim', 0, 'em') + '</i><span>' + esc(ten(R)) + '</span></button></div>'
      : '<div class="xh-phim' + (G.ho ? ' thay' : '') + '" id="xhPhim"><button id="xhXoa" aria-label="Xoá chữ cuối">⌫</button><button class="ok" id="xhGui">SUBMIT</button></div>';
    var go = !choiDuoc() || !C.ngang || C.thap ? '' : '<div class="xh-danggo" id="xhGo"></div>';
    var chatNho = '<button class="xh-chatnho" id="xhChatNho" aria-label="Mở chat trận"><ol id="xhChatNhoDs"></ol><span class="xh-chatnho-o">' + (G.xem ? 'Cổ vũ hai bạn…' : 'Nhắn cho đối thủ…') + '</span><i id="xhChuaDoc2" hidden>1</i></button>';
    var chatManh = '<button class="xh-chatmanh" id="xhChatManh" aria-label="Mở chat trận">' + IC_CHAT + '<span id="xhChatMoi"><b>Chat trận</b></span><i id="xhChuaDoc3" hidden>1</i></button>';
    var bangTu = '<div class="xh-timbang" id="xhTimBang"><h4><span>' + esc(G.xem ? ten(L) : 'EM') + '</span><span>' + esc(ten(R)) + '</span></h4>' +
      '<div class="xh-hai" id="xhHai"><div class="xh-cot" id="xhCotL"></div><div class="xh-cot" id="xhCotR"></div></div><button class="xh-muiten" id="xhMuiTen" hidden aria-label="Xem thêm">▾</button></div>';
    var daiTu = '<div class="xh-dai" id="xhDai"></div>';
    var chat = '<div class="xh-chat' + (C.coChat ? ' cot' : '') + '" id="xhChat"><header>CHAT TRẬN <button id="xhDongChat" aria-label="Đóng chat">⌄</button></header><ol id="xhChatDs"></ol>' +
      '<div class="xh-nhanh" id="xhNhanh">' + (G.xem ? ['Hay quá! 🔥', 'Cố lên 💪', 'Kèo căng 😆', 'Đỉnh 👏', 'GG 👍'] : ['GG 👍', 'Hay quá! 🔥', 'Cố lên 💪', 'Khó ghê 😅', 'Chơi đẹp nha 🤝']).map(function (t) { return '<button type="button" data-chu="' + esc(t) + '">' + XH.doiEmoji(esc(t), 16) + '</button>'; }).join('') + '</div>' +
      '<form class="xh-onhap" id="xhChatGo"><div class="xh-ogia" id="xhOGia"></div><input class="xh-ochat" id="xhOChat" autocomplete="off" maxlength="120" placeholder="' + (G.xem ? 'Cổ vũ hai bạn…' : 'Nhắn cho đối thủ…') + '" aria-label="Nhắn tin trong trận">' +
      '<button class="xh-guichat" aria-label="Gửi">➤</button></form><div class="xh-bp" id="xhBp"></div></div>';
    var lop = 'xh7 ' + (C.ngang ? 'ngang' : 'doc') + (C.thap ? ' thap' : C.ngang ? ' rong' : '') + (C.coChat ? ' cochat' : '') + (G.xem ? ' xem' : '') + (G.ho ? ' thayho' : '') + (G.T && G.T.goiEn ? ' en' : '');
    if (!C.ngang) {
      app.innerHTML = '<div class="' + lop + '" id="xh7"><div class="xh-khu">' + top + bd + goi + daiTu + oan + phim + (C.dai ? chatNho : '') + '</div>' + chat + '</div><div class="xh-che" id="xhChe"></div>';
    } else {
      app.innerHTML = '<div class="' + lop + '" id="xh7"><div class="xh-khu">' + top + '<div class="xh-than"><div class="xh-cott">' + bd + goi + bangTu + '</div>' +
        '<div class="xh-cotg" id="xhCotG">' + oan + go + phim + (C.coChat ? '' : C.thap ? chatManh : chatNho) + '</div></div></div>' +
        (C.coChat ? '<div class="xh-cotc">' + chat + '</div>' : chat) + '</div><div class="xh-che" id="xhChe"></div>';
    }
    $('#xh7').classList.toggle('phimthat', laRong());   // khung rộng: chat gõ bàn phím thật · điện thoại: bàn phím riêng (Telex)
    bp = XH.BanPhim({ goc: $('#xhBp'), o: $('#xhOGia'), goiY: function () { return G.xem ? 'Cổ vũ hai bạn…' : 'Nhắn cho đối thủ…'; }, gui: guiChat });
    var hai = $('#xhHai');
    if (hai) { hai.addEventListener('scroll', muiTen); $('#xhMuiTen').addEventListener('click', function () { hai.scrollTop += hai.clientHeight * 0.7; }); }
    G.van = -1; veChat(); veNguoiXem(); capChoi(); xep();
  }
  // kích thước: ô chữ vuông theo chỗ còn lại; màn ngang to theo chiều cao (--k), khối gợi ý cao theo chỗ trống, bàn chữ thẳng hàng ô gợi ý thứ nhất
  function xep() {
    var x7 = $('#xh7'); if (!x7) return;
    var C = G.cd, oanO = $('#xhOanO'), oan = $('#xhOan'), c;
    oan.style.width = oan.style.height = '0px';
    if (C.ngang) {
      var th = x7.querySelector('.xh-than'), cot = $('#xhCotG'), H = app.clientHeight;
      var K = C.thap ? 1 : Math.max(1, Math.min(2.2, H / 593)), Kt = Math.min(K, 1.6);
      x7.style.setProperty('--k', K.toFixed(3)); x7.style.setProperty('--kt', Kt.toFixed(3));
      var cc = x7.querySelector('.xh-cotc'); if (cc) cc.style.width = Math.round(270 * Math.min(K, 1.4)) + 'px';
      if (!C.thap) {
        var en = !!(G.T && G.T.goiEn), colW0 = x7.querySelector('.xh-cott').clientWidth, thH0 = th.clientHeight;
        var hg = Math.round(Math.max((en ? 80 : 50) * Kt, Math.min(thH0 * (en ? 0.22 : 0.16), en ? 165 : 105)));
        var ow = Math.round(Math.min(hg * (en ? 0.34 : 0.5), colW0 * 0.5 / 8, 52));
        x7.style.setProperty('--hg', hg + 'px'); x7.style.setProperty('--fy', Math.round(en ? Math.min(hg * 0.2, 15 * Kt * 1.25, 24) : Math.min(hg * 0.34, 32)) + 'px');
        x7.style.setProperty('--ow', ow + 'px'); x7.style.setProperty('--oh', Math.round(ow * 1.15) + 'px');
      }
      var thH = th.clientHeight, go = $('#xhGo'), ph = $('#xhPhim') || x7.querySelector('.xh-tim2'), chD = $('#xhChatNho') || $('#xhChatManh');
      var phu = (go ? go.offsetHeight + 8 : 0) + (ph ? ph.offsetHeight + 8 : 0) + (chD ? chD.offsetHeight + 8 : 0);
      var oT = Math.round(64 + (K - 1) * 45);
      c = Math.floor(Math.max(120, Math.min(oT * 4 + Math.round(oT * 0.1) * 3, (thH - phu) * 0.92, th.clientWidth * 0.44)));
      th.style.gridTemplateColumns = 'minmax(0,1fr) ' + c + 'px'; cot.style.width = c + 'px'; oanO.style.height = c + 'px';
      // màn ngang (không phải điện thoại): mép trên bàn chữ = mép trên ô gợi ý thứ nhất
      cot.style.marginTop = C.thap ? '' : Math.round(x7.querySelector('.xh-cott .xh-bandau').offsetHeight + (parseFloat(getComputedStyle(x7.querySelector('.xh-cott')).rowGap) || 8)) + 'px';
    } else c = Math.floor(Math.min(oanO.clientWidth, oanO.clientHeight));
    var gap = Math.max(6, Math.round(c * 0.03)); oan.style.gap = gap + 'px';
    oan.style.width = oan.style.height = c + 'px';
    oan.style.setProperty('--fs', Math.round((c - 3 * gap) / 4 * 0.46) + 'px');
    muiTen();
  }
  function muiTen() { var h = $('#xhHai'), m = $('#xhMuiTen'); if (h && m) m.hidden = h.scrollHeight - h.scrollTop - h.clientHeight < 4; }
  var _xepHen = 0;
  addEventListener('resize', function () {
    clearTimeout(_xepHen);
    _xepHen = setTimeout(function () {
      if (!G.dungChoi) return;
      var C = cheDo();
      if (G.cd && C.ma !== G.cd.ma) { var sel = G.sel; dungChoi(); G.sel = sel; veGo(); } else xep();
    }, 120);
  });
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
        return '<button type="button" tabindex="-1" data-k="' + k + '" style="animation-delay:' + (n * 20) + 'ms">' + esc(G.chu[k] || '?') + '</button>';
      }).join('');
      o.classList.remove('doi'); void o.offsetWidth; if (doiVan || G.chu.length) o.classList.add('doi');
      $('#xhBan').textContent = G.van + 1;
      veGo();
    }
    var L = trai(), R = phai(), d = t.diem || {};
    $('#xhDL').textContent = d[L] || 0; $('#xhDR').textContent = d[R] || 0;
    veGoi(); veTimTu(); capGio(); veHoTro();
  }
  // ---------- THẦY HỖ TRỢ: vòng vàng + ảnh thầy ở góc ảnh em (mọi máy thấy) · thầy bấm ảnh em để bật / thôi / đổi bên ----------
  function capHo(t) {
    var h = t.hoTro || {}, ho = laThayXem() && h.gv === G.toi.uid && (h.ben === 'a' || h.ben === 'b') ? h.ben : '';
    if (ho !== G.ho) { G.ho = ho; G.sel = []; G.veLai = true; }
  }
  function veHoTro() {
    var t = G.T; if (!t) return;
    var h = t.hoTro || {}, ben = h.ben === 'a' || h.ben === 'b' ? h.ben : '', khoa = ben + ':' + (h.luc || 0);
    [['#xhDbL', trai()], ['#xhDbR', phai()]].forEach(function (p) {
      var db = $(p[0]), av = db && db.querySelector('.xh-av'); if (!av) return;
      av.classList.toggle('xh-bamho', laThayXem() && t.trangThai === 'choi');
      if (laThayXem()) av.title = ben === p[1] ? 'Bấm để thôi hỗ trợ' : 'Bấm để hỗ trợ ' + ten(p[1]);
      var bat = ben === p[1], hh = av.querySelector('.xh-thayho');
      av.classList.toggle('xh-hotro', bat);
      if (bat && !hh) av.insertAdjacentHTML('beforeend', '<span class="xh-hosao"><i>✦</i><i>✦</i><i>✦</i><i>✦</i><i>✦</i></span><span class="xh-thayho" title="Thầy Andrew đang hỗ trợ"><b></b><i>✦</i><i>✦</i><i>✦</i><i>✦</i></span>');
      if (!bat && hh) { hh.remove(); var hs = av.querySelector('.xh-hosao'); if (hs) hs.remove(); }
      if (bat && G.hoKhoa != null && G.hoKhoa !== khoa) bungSao(av);
    });
    G.hoKhoa = khoa;
  }
  function bungSao(av) {
    for (var i = 0; i < 18; i++) {
      var s = document.createElement('i'), g = Math.random() * Math.PI * 2, d = 50 + Math.random() * 60;
      s.className = 'xh-hobay'; s.textContent = Math.random() < .5 ? '✦' : '★'; s.style.fontSize = (10 + Math.random() * 12) + 'px';
      s.style.setProperty('--x', Math.cos(g) * d + 'px'); s.style.setProperty('--y', Math.sin(g) * d + 'px'); s.style.setProperty('--r', (Math.random() * 180 - 90) + 'deg');
      av.appendChild(s); setTimeout(function (e) { return function () { e.remove(); }; }(s), 1200);
    }
  }
  function batHo(k) {
    var t = G.T; if (!t || t.trangThai !== 'choi' || !laThayXem()) return;
    var ben = (t.hoTro || {}).ben === k ? '' : k, h = { ben: ben, gv: G.toi.uid, luc: Date.now() };
    if (G.thu) { t.hoTro = h; t.daHoTro = Object.assign({}, t.daHoTro); if (ben) t.daHoTro[ben] = true; capHo(t); return capPha(); }
    var o = { hoTro: h }; if (ben) o['daHoTro.' + ben] = true;
    f.fs.updateDoc(tRef, o).catch(function (e) { console.warn('[xh] hỗ trợ', e); });
  }
  function veGoi() {
    var t = G.T, goi = t.goi || [], tim = t.tim || {}, hien = t.hien || {};
    // chữ của từ đã tìm: đọc từ tài liệu từ (máy chủ chấm ok + i của bàn này)
    var chuTim = {};
    G.tu.forEach(function (x) { if (x.ok === true && x.v === (t.van || 0) && x.i >= 0) chuTim[x.i] = x.w.toUpperCase(); });
    // gợi ý TIẾNG ANH (bậc từ 1100 điểm, t.goiEn): câu dài nhiều dòng, ô chữ xuống dòng dưới
    $('#xhGoi').classList.toggle('en', !!t.goiEn);
    var x7 = $('#xh7'); if (x7 && x7.classList.contains('en') !== !!t.goiEn) { x7.classList.toggle('en', !!t.goiEn); xep(); }
    var tim2 = t.tim2 || {};
    $('#xhGoi').innerHTML = goi.map(function (g, i) {
      var ai = tim[i], lop = !ai ? '' : ai === '-' ? 'lo' : tim2[i] ? 'ca' : ai === uidBen(trai()) ? 'ta' : 'ban';   // ca = hai bạn cùng lúc (≤ 400 ms)
      var w = ai === '-' ? (hien[i] || '') : (chuTim[i] || '');
      var o = ''; for (var k = 0; k < (g.n || 0); k++) o += '<i>' + esc(w[k] || '') + '</i>';
      if (t.goiEn) return '<div class="xh-g ' + lop + '"><span class="xh-o">' + o + '</span><span class="xh-y">' + esc(g.m || '') + '</span></div>';   // ô chữ góc phải trên, câu chạy vòng
      return '<div class="xh-g ' + lop + '"><span class="xh-y">' + esc(g.m || '') + '</span><span class="xh-o">' + o + '</span></div>';
    }).join('');
  }
  // ⭐ 27/10 bảng TỪ ĐÃ TÌM của hai bạn (máy tính: 2 cột · điện thoại: 1 dải ngang ngay dưới gợi ý) — từ bỏ lỡ (t.boLo) gạch ngang
  function veTimTu() {
    var t = G.T; if (!t || !G.dungChoi) return;
    var nhom = {}, ds = [];
    G.tu.forEach(function (x) {
      if (x.ok !== true || x.v < 0 || x.i < 0) return;
      var k = x.w + '_' + x.v;
      if (!nhom[k]) { nhom[k] = { w: x.w.toUpperCase(), m: x.m || '', d: x.d || 0, v: x.v, ai: {}, luc: x.luc || 0 }; ds.push(nhom[k]); }
      nhom[k].ai[x.b ? uidBen(x.b) : x.uid] = true; if (x.uid && t.a && x.uid !== t.a && x.uid !== t.b) nhom[k].thay = true;   // 31/10 từ thầy gửi hộ ⇒ cột của em + ✦
      if (x.luc && (!nhom[k].luc || x.luc < nhom[k].luc)) nhom[k].luc = x.luc;
    });
    ds.sort(function (a, b) { return (b.v - a.v) || ((b.luc || 0) - (a.luc || 0)); });
    var uL = uidBen(trai()), uR = uidBen(phai()), hienM = !t.goiEn;
    var chip = function (x, ben) {
      var ca = x.ai && x.ai[uL] && x.ai[uR];
      return '<span class="xh-chip ' + (ben === 'lo' ? 'lo' : (ca ? 'ca ' : '') + ben) + '">' + esc(x.w) + (hienM && x.m ? '<small>' + esc(x.m) + '</small>' : '') +
        (ca ? '<u>CÙNG LÚC</u>' : '') + (x.thay && ben !== 'lo' ? '<b class="xh-chipthay" title="Thầy Andrew tìm">✦</b>' : '') + (ben === 'lo' ? '' : '<i>+' + x.d + '</i>') + '</span>';
    };
    var lo = (t.boLo || []).slice().reverse().map(function (x) { return { w: String(x.w || '').toUpperCase(), m: x.m || '', v: x.v }; });
    var cL = $('#xhCotL'), cR = $('#xhCotR'), dai = $('#xhDai');
    if (cL) {
      cL.innerHTML = ds.filter(function (x) { return x.ai[uL]; }).map(function (x) { return chip(x, 'ta'); }).join('') + lo.map(function (x) { return chip(x, 'lo'); }).join('');
      cR.innerHTML = ds.filter(function (x) { return x.ai[uR]; }).map(function (x) { return chip(x, 'ban'); }).join('');
      muiTen();
    }
    if (dai) dai.innerHTML = ds.map(function (x) { return chip(x, x.ai[uL] ? 'ta' : 'ban'); }).join('');
  }
  function veGo() {
    if (!choiDuoc()) return;
    [].forEach.call($('#xhOan').children, function (e) { e.classList.toggle('chon', G.sel.indexOf(+e.dataset.k) >= 0); });
    var g = $('#xhGo'); if (g && !g.classList.contains('khoa')) g.innerHTML = G.sel.map(function (k) { return '<span>' + esc(G.chu[k]) + '</span>'; }).join('');
  }
  function banMs(t) { return t && t.goiEn ? 30000 : 20000; }
  function capGio() {
    var t = G.T; if (!t || !G.dungChoi) return;
    var con = (t.ketThuc || 0) - bay(), g = $('#xhGio');
    g.textContent = XH.dongHo(con); g.classList.toggle('gap', con < 15000);
    // ⭐ 31/10 thầy: bàn gợi ý TIẾNG ANH (câu dài) 30 giây, bàn thường 20 giây — khớp máy chủ XH.banMs
    var BAN = banMs(t), tuLuc = t.doiLuc || t.batDau || 0, c20 = Math.max(0, Math.ceil((BAN - (bay() - tuLuc)) / 1000));
    $('#xhS20').textContent = c20; $('#xhC20').style.strokeDashoffset = 119.4 * (1 - Math.min(BAN / 1000, c20) / (BAN / 1000)); $('#xh20').classList.toggle('gap', c20 <= 5);
    // hết 20 giây mà bàn chưa xong ⇒ người chơi xin máy chủ đổi bàn (hai máy cùng xin thì máy sau bị từ chối — không sao)
    if (!G.xem && !G.thu && c20 <= 0 && bay() - tuLuc > BAN + 300 && t.trangThai === 'choi' && !G.xinDoi[t.van] && bay() < t.ketThuc) {
      G.xinDoi[t.van] = 1;
      f.fs.setDoc(f.fs.doc(tRef, 'tu', 'zhet_' + t.van), { uid: G.toi.uid, luc: f.fs.serverTimestamp() })
        .catch(function () { /* bạn đã xin trước */ })
        .finally(function () { setTimeout(function () { if (G.T && G.T.van === t.van) delete G.xinDoi[t.van]; }, 3000); });
    }
    if (!G.xem && con <= 0 && !G.daXong) { G.daXong = true; G.xongGui = bay(); nhip({ xong: true }); }
    // ⭐ 27/10 — hết giờ mà máy chủ chưa chốt: báo đang chốt, 5 giây gửi lại "hết giờ" một lần (máy chủ đợi đủ hạn rồi chốt);
    //   quá 25 giây ⇒ hiện nút về sảnh (thoát lúc này KHÔNG bị xử thua — máy chủ chốt theo điểm)
    if (!G.thu && con <= 0 && t.trangThai === 'choi') {
      g.textContent = 'CHỐT…';
      if (!G.xem && bay() - (G.xongGui || 0) > 5000) { G.xongGui = bay(); nhip({ xong: true }); }
      if (!G.xem && con < -25000 && !$('#xhCho')) {   // người xem không cần hộp này (chữ dành cho người chơi)
        var c = document.createElement('div'); c.id = 'xhCho'; c.className = 'xh-hop';
        c.innerHTML = '<div><h4>Đang chốt kết quả…</h4><p>Điểm trận này vẫn được tính. Em có thể về sảnh, kết quả sẽ hiện trong phong độ.</p><div class="xh-hainut"><button class="xh-nut" style="font-size:17px" data-di="xephang.html">VỀ SẢNH</button></div></div>';
        app.appendChild(c);
      }
    }
  }
  // ---------- gửi từ ----------
  function guiTu() {
    if (!choiDuoc() || !G.T || G.T.trangThai !== 'choi' || bay() < G.T.batDau || !G.chu.length) return;
    var w = G.sel.map(function (k) { return G.chu[k]; }).join('').toLowerCase();
    if (w.length < 2) return;
    // 27/10 tài liệu RIÊNG của mỗi bên (đuôi _a|_b) ⇒ hai em gửi cùng đáp án gần như cùng lúc vẫn tới máy chủ (≤ 400 ms = cả hai được điểm)
    var id = w + '_' + (G.T.van || 0) + '_' + benGui();
    G.sel = []; veGo();
    if (G.tu.has(id) || G.cho.has(id) || G.tu.has(w + '_' + (G.T.van || 0))) return rung('ĐÃ CÓ');
    if (G.thu) return THU.gui(w);
    G.cho.set(id, Date.now());
    f.fs.setDoc(f.fs.doc(tRef, 'tu', id), { uid: G.toi.uid, luc: f.fs.serverTimestamp() })
      .catch(function () { G.cho.delete(id); rung('TAKEN'); });
  }
  function rung(chu) {
    var g = $('#xhGo'); if (!g) return;
    g.classList.add('khoa', 'sai'); g.innerHTML = '<span>' + (chu && chu !== '✗' ? esc(chu) : XH.bt('sai', 22)) + '</span>';
    setTimeout(function () { g.classList.remove('khoa', 'sai'); veGo(); }, 450);
  }
  function cong(d, cung) {
    var g = $('#xhGo'); if (!g) return;
    g.classList.add('khoa'); g.innerHTML = '<span class="xh-cong">+' + d + (cung ? ' · CÙNG LÚC' : '') + '</span>';
    setTimeout(function () { g.classList.remove('khoa'); veGo(); }, cung ? 900 : 500);
  }
  // ⭐ 27/10 CHỈ CHUỘT / CHẠM (thầy chốt — công bằng): ô chữ, ⌫, SUBMIT nhận lúc ngón tay/chuột CHẠM XUỐNG; bàn phím không chọn chữ, không gửi
  app.addEventListener('pointerdown', function (e) {
    if (!choiDuoc() || !e.isTrusted) return;
    G.bong = '';  // bấm chuột ⇒ bộ gõ cũng quên chữ đang gõ
    var b = e.target.closest('#xhOan button');
    if (b) { e.preventDefault(); var k = +b.dataset.k, i = G.sel.indexOf(k); if (!G.chu.length) return; if (i >= 0) G.sel.splice(i, 1); else G.sel.push(k); return veGo(); }
    if (e.target.closest('#xhXoa')) { e.preventDefault(); G.sel.pop(); return veGo(); }
    if (e.target.closest('#xhGui')) { e.preventDefault(); return guiTu(); }
  });
  app.addEventListener('click', function (e) {
    var avh = e.target.closest('.xh-av.xh-bamho'); if (avh) return batHo(avh.closest('#xhDbL') ? trai() : phai());
    if (e.target.closest('#xhThoat')) return thoat();
    if (e.target.closest('#xhChatThanh') || e.target.closest('#xhChatNho') || e.target.closest('#xhChatManh')) return moChat();
    if (e.target.closest('#xhDongChat') || e.target.closest('#xhChe')) return dongChat();
    var n = e.target.closest('#xhNhanh button'); if (n) return guiChat(n.dataset.chu || n.textContent);
    if (e.target.closest('#xhTimL')) return thaTim(trai());
    if (e.target.closest('#xhTimR')) return thaTim(phai());
    if (e.target.closest('[data-di]')) { location.href = e.target.closest('[data-di]').dataset.di; }
  });
  app.addEventListener('submit', function (e) {
    if (e.target.id !== 'xhChatGo') return; e.preventDefault();
    if (laRong()) { var o = $('#xhOChat'); guiChat(o.value); o.value = ''; }
  });
  // ⭐ 31/10 BÀN PHÍM THẦY luôn kiểu TIẾNG ANH: đọc phím theo VỊ TRÍ (e.code KeyA..KeyZ) ⇒ bộ gõ Windows Telex (key 'Process') không làm mất phím.
  //   Unikey/EVKey móc bàn phím: NUỐT phím dấu (s f r x j w, nguyên âm đôi, dd) rồi gửi ⌫ + chữ có dấu (code rỗng) ⇒ trả lại ô vừa bị ⌫ đó xoá,
  //   suy ra phím bị nuốt = phần chữ có dấu thêm so với chữ cũ (ỏ−o = r, â−a = a, đ−d = d, ư = w; không thêm gì = phím vừa gõ lại để bỏ dấu).
  //   G.bong = chữ bộ gõ TƯỞNG đang hiện (để biết nó thay chữ nào); xoá khi gửi / Esc / bấm chuột.
  var DAU = { '́': 's', '̀': 'f', '̉': 'r', '̃': 'x', '̣': 'j', '̆': 'w', '̛': 'w' };
  function phimGoc(s) {
    var r = [];
    Array.from(String(s).toLowerCase()).forEach(function (ch) {
      if (ch === 'đ') return r.push('d', 'd');
      var n = ch.normalize('NFD'), b = n[0]; if (!/[a-z]/.test(b)) return; r.push(b);
      Array.from(n.slice(1)).forEach(function (m) { if (m === '̂') r.push(b); else if (DAU[m]) r.push(DAU[m]); });
    });
    return r;
  }
  function chonChu(L) {
    if (!G.chu.length) return;
    for (var n = 0; n < G.order.length; n++) { var i = G.order[n]; if (G.chu[i] === L && G.sel.indexOf(i) < 0) { G.sel.push(i); return veGo(); } }
  }
  G.bong = ''; G.xoaGan = []; G.dot = null;
  function chotDot() {
    var d = G.dot; G.dot = null; if (!d) return;
    var cu = phimGoc(d.cu), moi = phimGoc(d.S);
    cu.forEach(function (c) { var i = moi.indexOf(c); if (i >= 0) moi.splice(i, 1); });
    var t = moi.length ? moi[moi.length - 1] : (d.S.match(/[a-z]/gi) || []).pop();
    G.bong += d.S;
    if (t) chonChu(t.toUpperCase());
  }
  function phimThay(e) {
    if (e.key === 'Enter') { e.preventDefault(); G.bong = ''; return guiTu(); }
    if (e.key === 'Escape') { G.bong = ''; G.sel = []; return veGo(); }
    if (e.key === 'Backspace') {
      e.preventDefault(); var b = G.bong.slice(-1); G.bong = G.bong.slice(0, -1);
      G.xoaGan.push({ k: G.sel.pop(), c: b, luc: performance.now() }); return veGo();
    }
    var m = /^Key([A-Z])$/.exec(e.code);
    if (m) { e.preventDefault(); if (e.repeat) return; G.bong += m[1].toLowerCase(); return chonChu(m[1]); }
    // chữ bộ gõ gửi thay (không có vị trí phím): gom một đợt, trả lại các ô ⌫ vừa xoá trong 120 ms
    if (e.key && Array.from(e.key).length === 1 && /\p{L}/u.test(e.key)) {
      e.preventDefault();
      if (!G.dot) {
        var bay2 = performance.now(), cu = '';
        while (G.xoaGan.length && bay2 - G.xoaGan[G.xoaGan.length - 1].luc < 120) {
          var x = G.xoaGan.pop(); cu += x.c; if (x.k != null && G.sel.indexOf(x.k) < 0) G.sel.push(x.k);
        }
        G.xoaGan = []; G.dot = { cu: cu, S: '' }; veGo(); setTimeout(chotDot, 25);
      }
      G.dot.S += e.key;
    }
  }
  addEventListener('keydown', function (e) {
    if (!G.dungChoi || document.activeElement === $('#xhOChat')) return;
    var c = $('#xhChat');
    if (c && c.classList.contains('mo') && !laRong()) { if (e.key === 'Escape') return dongChat(); return bp.phimMay(e); }
    if (c && c.classList.contains('mo') && e.key === 'Escape') return dongChat();
    // ⭐ 31/10 THẦY HỖ TRỢ: RIÊNG thầy được dùng bàn phím — chữ cái chọn ô (theo thứ tự trên bàn), ⌫ xoá, Enter gửi, Esc bỏ chọn
    if (G.xem && G.ho && !e.ctrlKey && !e.metaKey && !e.altKey) return phimThay(e);
    // 27/10 bàn phím KHÔNG chơi được (chỉ chat): chặn cả Space/Enter bấm hộ nút đang được chọn
    if (e.key === ' ' || e.key === 'Enter') { var a = document.activeElement; if (a && a.closest && a.closest('#xhOan, #xhPhim')) e.preventDefault(); }
  });
  // ⭐ v1.444.0 (28/10, thầy chốt) — BẮT BUỘC HOÀN THÀNH TRẬN: trận mang `buoc` (máy chủ ghi theo công tắc dashboard) ⇒ chưa chốt thì
  //   ✕ giấu (giữ chỗ), Back bị giữ lại, máy tính hỏi khi đóng tab. Mở web lại ở trang khác ⇒ js/giu-tran.js đưa về đây. Bàn thử: &buoc=1.
  // 31/10 hết giờ quá 10 giây mà máy chủ chưa chốt ⇒ thôi giữ (trước: chốt lỗi ⇒ em kẹt, VỀ SẢNH bật hộp "Rời trang?", nút Back bị nuốt)
  function buoc() { var t = G.T; return !G.xem && !!t && t.trangThai === 'choi' && !(t.ketThuc && bay() > t.ketThuc + 10000) && !!(t.buoc || (G.thu && /[?&]buoc=1/.test(location.search))); }
  var giuBack = false;
  function giuTran() { if (!buoc() || giuBack) return; giuBack = true; try { history.pushState({ giuTran: 1 }, '', location.href); } catch (e) { } }
  addEventListener('popstate', function () {
    if (!giuBack) return;
    if (buoc()) { try { history.pushState({ giuTran: 1 }, '', location.href); } catch (e) { } return; }
    giuBack = false; history.back();
  });
  addEventListener('beforeunload', function (e) { if (buoc()) { e.preventDefault(); e.returnValue = ''; } });
  function thoat() {
    if (buoc()) return;
    // hết giờ rồi (đang chờ chốt) ⇒ về sảnh, không ghi "rời trận" (không bị xử thua)
    if (G.xem || !G.T || G.T.trangThai !== 'choi' || bay() >= (G.T.ketThuc || 0)) { location.href = G.xem ? 'xephang.html?tab=live' : 'xephang.html'; return; }
    var h = document.createElement('div'); h.className = 'xh-hop';
    // 31/10 trận phân hạng (hA/hB = 'xl:k') máy chủ không trừ điểm ⇒ không ghi "trừ 25 điểm hạng"
    var xlNay = String(G.T['h' + G.ben.toUpperCase()] || '').indexOf('xl:') === 0;
    h.innerHTML = '<div><h4>Rời trận?</h4><p>Rời giữa trận là <b>THUA</b>, ' + (xlNay ? 'tính 1 trận phân hạng thua' : 'trừ 25 điểm hạng') + ' và khoá tìm trận 2 phút.</p>' +
      '<div class="xh-hainut"><button class="xh-nut phu" data-k="o">Ở lại</button><button class="xh-nut" style="font-size:17px;background:var(--xh-do);box-shadow:none" data-k="r">RỜI TRẬN</button></div></div>';
    document.body.appendChild(h);
    h.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b && e.target !== h) return;
      h.remove(); if (b && b.dataset.k === 'r') { nhip({ roi: true }).then(function () { location.href = 'xephang.html'; }); }
    });
  }
  // ---------- chat ----------
  function moChat() {
    if ($('#xhChat').classList.contains('cot')) return;   // máy rộng: chat là cột cố định
    $('#xhChat').classList.add('mo'); $('#xhChe').classList.add('mo'); G.chuaDoc = 0;
    ['#xhChuaDoc', '#xhChuaDoc2', '#xhChuaDoc3'].forEach(function (s) { var c = $(s); if (c) c.hidden = true; });
    var ds = $('#xhChatDs'); if (ds) ds.scrollTop = 1e6;
    if (laRong()) { var o = $('#xhOChat'); if (o) setTimeout(function () { o.focus(); }, 280); }
  }
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
      if (m.he) return '<li class="he">' + XH.doiEmoji(esc(m.chu)) + '</li>';
      var l = lopTin(m), ai = l === 'toi' ? '' : (m.vai === 'xem' ? XH.bt('mat', 13) + ' ' : '') + esc(TEN_VAI(m));
      return '<li class="' + l + '">' + (ai ? '<span class="xh-ai">' + ai + '</span>' : '') + XH.doiEmoji(esc(m.chu)) + '</li>';
    }).join('');
    ds.scrollTop = 1e6;
    var tenTin = function (m) { return (m.vai === 'xem' ? XH.bt('mat', 13) + ' ' : '') + esc(G.toi && m.uid === G.toi.uid ? 'Em' : TEN_VAI(m)); };   // trả HTML
    var cuoi = G.chat[G.chat.length - 1], s = $('#xhChatMoi');
    if (cuoi && s) { s.innerHTML = '<b>' + tenTin(cuoi) + '</b> ' + XH.doiEmoji(esc(cuoi.chu)); }
    // khung chat nhỏ (iPad ngang / điện thoại dài): 2 tin gần nhất
    var nho = $('#xhChatNhoDs');
    if (nho) nho.innerHTML = G.chat.slice(-2).map(function (m) { return '<li><b>' + tenTin(m) + '</b>' + XH.doiEmoji(esc(m.chu)) + '</li>'; }).join('') || '<li class="he">Chat trận · cổ vũ, chào nhau nhé</li>';
  }
  function tinMoi(m) {
    var s = $('#xhChatMoi'); if (s) { s.classList.remove('moi'); void s.offsetWidth; s.classList.add('moi'); }
    var ch = $('#xhChat');
    if (ch && !ch.classList.contains('cot') && !ch.classList.contains('mo') && !(G.toi && m.uid === G.toi.uid)) {
      G.chuaDoc++;
      ['#xhChuaDoc', '#xhChuaDoc2', '#xhChuaDoc3'].forEach(function (q) { var c = $(q); if (c) { c.hidden = false; c.textContent = G.chuaDoc; } });
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
    h.className = 'xh-bay'; h.innerHTML = XH.bt('tim', 0, 'em');
    h.style.left = (r.left - g.left + r.width / 2 - 10 + (Math.random() * 30 - 15)) + 'px'; h.style.top = (r.top - g.top + r.height) + 'px';
    h.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
    app.appendChild(h); setTimeout(function () { h.remove(); }, 1700);
  }
  setInterval(function () {   // gộp tim gửi 0,4 giây/lần (27/10 thầy: người xem thời gian thực — trước 1,5 giây)
    if (!G.xem || G.thu || !tRef) return;
    ['a', 'b'].forEach(function (k) {
      var n = G.timCho[k]; if (!n) return; G.timCho[k] = 0;
      f.fs.setDoc(f.fs.doc(tRef, 'tim', k), { n: f.fs.increment(n) }, { merge: true }).catch(function (e) { console.warn('[xh] tim', e); });
    });
  }, 400);
  // ---------- nhịp ----------
  // r = tài liệu của chính mình: em ⇒ nhip/{uid} · thầy (31/10, luôn ưu tiên như em dù chưa hỗ trợ) ⇒ xem/{uid}
  async function doLech(r) {
    if (G.thu || !r) return;
    var tot = null;
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
  // ⭐ 31/10 thầy chốt KIỂU B (mẫu D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\ket-qua-dong-v2): từng dòng điểm bay vào → tổng đếm lên → thanh chạy từ điểm cũ tới điểm mới
  //   (qua mốc thì thanh về đầu chạy tiếp) · lên bậc = băng vàng rơi xuống · lên hạng / giành suất = phủ màn (tia sáng, huy hiệu cũ vỡ, huy hiệu mới, pháo giấy).
  var CT_TEN = { thang: 'Thắng', chuoi: 'Chuỗi thắng', gioVang: 'Giờ vàng', hoa: 'Hòa', thua: 'Thua', thuaCao: 'Thua bạn hạng cao hơn · không trừ', thuaSat: 'Thua sát bạn hạng cao', boTran: 'Bỏ trận', xepLop: 'Xong 5 trận phân hạng' };
  var CT_BT = { chuoi: 'lua', gioVang: 'set', thuaSat: 'tay', boTran: 'cua', xepLop: 'huy' };
  var nhanCt = function (k) { return (CT_BT[k] ? XH.bt(CT_BT[k], 16) : '') + esc(CT_TEN[k] || k); };
  // 31/10 máy chủ giữ điểm (khiên / sàn 0 / mốc an toàn 800) mà không ghi dòng chi tiết ⇒ "Thua −22" mà Điểm hạng −2: thêm dòng giải thích phần chênh
  function giuDiem(x, tong) {
    if (x.diem == null || (x.ct || []).some(function (c) { return c[0] === 'xepLop'; })) return null;
    var chenh = Math.round((x.doi - tong) * 10) / 10; if (Math.abs(chenh) < 0.05) return null;
    var bt = chenh < 0 ? '' : x.diem === 0 ? 'gach' : x.diem === 800 ? 'moc' : 'khien';
    var ten = chenh < 0 ? 'Làm tròn' : x.diem === 0 ? 'Không trừ dưới 0' : x.diem === 800 ? 'Mốc an toàn 800' : 'Khiên giữ mốc ' + XH.mocKhien(x.diem);
    return { bt: bt, html: '<span>' + (bt ? XH.bt(bt, 16) : '') + ten + '</span><b>' + (chenh > 0 ? '+' : '') + String(chenh).replace('.', ',') + '</b>' };
  }
  // bậc để chạy thanh: như XH.hangTu, riêng Vàng I chạy tới 1100 (sàn suất Bạch kim)
  function bacKq(d) {
    var h = XH.hangTu(d);
    if (h.len == null && h.ma === 'vang') return { ma: 'vang', bac: 'I', ten: h.ten, san: 1000, len: d < 1100 ? 1100 : null, tenLen: 'sàn Bạch kim' };
    return { ma: h.ma, bac: h.bac, ten: h.ten, san: h.len ? h.len - h.rong : d, len: h.len, tenLen: h.len ? XH.hangTu(h.len).ten : '' };
  }
  var phanTram = function (b, d) { return b.len ? Math.max(0, Math.min(100, 100 * (d - b.san) / (b.len - b.san))) : 100; };
  var thuTu = function (s) { var h = XH.hien(s); return ['dong', 'bac', 'vang', 'bk', 'kc', 'ct', 'ht'].indexOf(h.ma) * 3 + ({ III: 0, II: 1, I: 2 }[h.bac] || 0); };
  function dongCon(b, d, sau, x) {
    var s = XH.hien(sau), kh = x.baoVe ? ' · ' + XH.bt('khien', 13) + ' ' + x.baoVe + ' trận thua tới không tụt dưới ' + XH.mocKhien(d) : '';
    if (XH.laSuat(s.ma)) return d + ' điểm · giữ suất ' + esc(s.ten) + ' tới hết mùa' + kh;
    if (!b.len) return d + ' điểm · lọt top toàn giải để giành suất' + kh;
    return 'Còn <b>' + (Math.round((b.len - d) * 10) / 10) + '</b> điểm lên <b>' + esc(b.tenLen) + '</b>' + kh;
  }
  function veKetQua() {
    if (G.ketQua) return; G.ketQua = true; G.dungChoi = false; G.dungVS = false;
    var t = G.T, d = t.diem || {}, L = trai(), R = phai();
    var lo = (t.lo || []).length ? '<p class="xh-ghi">Từ bỏ lỡ ở bàn cuối</p><div class="xh-lo">' + t.lo.map(function (x) { return '<span>' + esc(x.w) + (t.goiEn ? '' : '<small>' + esc(x.m || '') + '</small>') + '</span>'; }).join('') + '</div>' : '';
    var tiso = '<div class="xh-tiso xh-so"><span style="color:var(--xh-neon2);font-size:36px">' + (d[L] || 0) + '</span><span>–</span><span style="color:var(--xh-cyan2);font-size:36px">' + (d[R] || 0) + '</span></div>';
    if (G.xem) {
      var kqA = (t.kq || {}).a, thang = kqA === 'thang' ? t.tenA : kqA === 'thua' ? t.tenB : '';
      app.innerHTML = '<div class="xh-giua"><div class="xh-kqchu' + (thang ? '' : ' hoa') + '" style="font-size:clamp(30px,10cqw,56px)">' + (thang ? esc(thang) + '<br>CHIẾN THẮNG' : 'HÒA') + '</div>' + tiso + lo + '</div>' +
        '<div class="xh-day"><button class="xh-nut" data-di="xephang.html?tab=live">XEM TRẬN KHÁC</button></div>';
      return;
    }
    var kq = (t.kq || {})[G.ben] || 'hoa', x = (t.xhKq || {})[G.ben] || null, ly = t.ly || '';
    // 31/10 trận chốt lúc máy chủ lỗi (xhKq chỉ {} / { thay }) ⇒ ẩn ô hạng, không in "undefined"; điểm thật vẫn ghi ở xhMua/em
    var kqThieu = !!x && x.sau == null; if (kqThieu) x = null;
    var tieu = kq === 'thang' ? 'CHIẾN<br>THẮNG!' : kq === 'thua' ? 'THUA<br>RỒI' : 'HÒA';
    var phu = (kq === 'thang' && /^(roi|mat)/.test(ly)) ? '<p class="xh-ghi">Đối thủ đã rời trận</p>' : (kq === 'thua' && /^(roi|mat)/.test(ly)) ? '<p class="xh-ghi">Em đã rời trận / mất kết nối</p>' : '';
    var ct = '', hang = kqThieu ? '<p class="xh-ghi">Điểm hạng đã được tính — xem ở sảnh</p>' : '', chay = null;
    if (x) {
      var tong = 0;
      // 27/10 máy chủ lưu chi tiết dạng [{k, d}] (Firestore không nhận mảng lồng mảng) — trận cũ còn [['thang', 25]]
      x.ct = (x.ct || []).map(function (c) { return Array.isArray(c) ? c : [c.k, c.d]; });
      var xl = x.ct.some(function (c) { return c[0] === 'xepLop'; }), giu;
      ct = '<div class="xh-ct xh-so xh-ctan">' + x.ct.map(function (c) { tong += c[1]; return '<span>' + nhanCt(c[0]) + '</span><b class="' + (c[1] > 0 ? 'cong' : c[1] < 0 ? 'tru' : '') + '">' + (c[0] === 'xepLop' ? '' : (c[1] > 0 ? '+' : '') + String(c[1]).replace('.', ',')) + '</b>'; }).join('');   // từ 2000 điểm máy chủ ghi lẻ (+0,8)
      giu = giuDiem(x, tong);
      ct += (giu ? giu.html : '') + (x.diem != null && !xl ? '<span class="xh-tong">Điểm hạng</span><b id="xhTongKq" style="color:' + (x.doi >= 0 ? 'var(--xh-neon)' : 'var(--xh-do)') + '">0</b>' : '') + '</div>';
      if (x.thay) ct = '<div class="xh-dauthay"><i></i><div><b>Thầy Andrew đã hỗ trợ em</b><small>Thầy tìm ' + (x.thay.so || 0) + ' từ · +' + (x.thay.d || 0) + ' điểm trận</small></div></div>' + ct;   // 31/10 chỉ trận THẮNG còn dấu thầy
      var s = XH.hien(x.sau), tr = XH.hien(x.truoc);
      if (String(x.sau).indexOf('xl:') === 0) {
        var n = (x.xl || 0);
        hang = '<div class="xh-lenhang">' + XH.hhTag('an', '', 56) + '<div class="xh-tt"><b>PHÂN HẠNG ' + n + '/5</b><small>Thắng ' + (x.xlThang || 0) + ' trận · còn ' + (5 - n) + ' trận nữa là có hạng</small></div></div>';
      } else if (xl) {
        hang = '<div class="xh-lenhang">' + XH.hhTag(s.ma, s.bac, 72, 'no') + '<div class="xh-tt"><b>EM VÀO HẠNG ' + esc(s.ten.toUpperCase()) + '</b><small>Thắng ' + (x.xlThang || 0) + '/5 trận phân hạng · từ giờ mỗi trận đều tính điểm hạng</small></div></div>';
      } else {
        // thẻ hạng vẽ TRẠNG THÁI CŨ (huy hiệu x.truoc, thanh ở điểm cũ) rồi chạy tới trạng thái mới
        var d0 = Math.round((x.diem - x.doi) * 10) / 10, b0 = bacKq(d0);
        hang = '<div class="xh-lenhang xh-kqh" id="xhKqH"><span class="xh-kqhh">' + XH.hhTag(tr.ma, tr.bac, 62) + '</span><div class="xh-tt"><div class="xh-kqten"><b id="xhKqTen">' + esc(tr.ten.toUpperCase()) + '</b><em class="xh-so" id="xhKqSo">' + d0 + '</em></div>' +
          '<div class="xh-thanh xh-kqthanh"><s id="xhKqMoi"></s><u id="xhThanhKq" style="width:' + (XH.laSuat(tr.ma) ? 100 : phanTram(b0, d0)) + '%"></u><i id="xhKqGiu"></i></div>' +
          '<small class="xh-so" id="xhKqCon">' + dongCon(b0, d0, x.truoc, { baoVe: 0 }) + '</small></div></div>';
        chay = { x: x, d0: d0, giu: giu, tr: tr, s: s };
      }
    }
    var tok = G.kqTok = {};
    app.innerHTML = '<div class="xh-giua"><div class="xh-kqchu ' + (kq === 'thang' ? '' : kq) + '">' + tieu + '</div>' + tiso + phu + ct + hang + lo + '</div>' +
      '<div class="xh-day xh-hainut"><button class="xh-nut phu" data-di="xephang.html">Về sảnh</button><button class="xh-nut" style="font-size:19px" data-di="xephang.html?tim=1">ĐẤU TIẾP</button></div>' +
      '<div class="xh-bangnho" id="xhBangNho"></div>';
    XH.veHH(app);
    chayKetQua(chay, tok);
  }
  // ----- hoạt ảnh kết quả -----
  var cho = function (ms, tok) { return new Promise(function (ok, huy) { setTimeout(function () { G.kqTok === tok ? ok() : huy('dung'); }, ms); }); };
  // khung hình: rAF + setTimeout dự phòng (tab nền / máy không vẽ khung thì rAF đứng ⇒ hoạt ảnh treo)
  function khung(fn) { var xong = false, chay = function () { if (!xong) { xong = true; fn(performance.now()); } }; requestAnimationFrame(chay); setTimeout(chay, 60); }
  function chayDen(tu, den, ms, tok, ve) {
    return new Promise(function (ok) {
      var t0 = performance.now();
      (function buoc(t) {
        if (G.kqTok !== tok) return ok();
        var p = Math.min(1, (t - t0) / ms), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        ve(tu + (den - tu) * e); p < 1 ? khung(buoc) : ok();
      })(t0);
    });
  }
  // chia d0 → d1 thành đoạn trong từng bậc (lên: dừng ở đỉnh bậc; xuống: dừng ở sàn bậc)
  function chiaDoan(d0, d1) {
    var ds = [], a = d0, n = 0;
    while (a !== d1 && n++ < 12) {
      var b = bacKq(a), moc = d1 > a ? (b.len ? Math.min(d1, b.len) : d1) : Math.max(d1, b.san < a ? b.san : d1);
      if (moc === a) moc = d1;
      ds.push({ a: a, b: moc, bac: b, qua: d1 > a && b.len != null && moc === b.len }); a = moc;
    }
    return ds;
  }
  async function chayKetQua(c, tok) {
    var tinh = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dong = [].slice.call(app.querySelectorAll('.xh-ctan > *')), tongEl = $('#xhTongKq');
    try {
      if (!tinh) await cho(500, tok);
      for (var i = 0; i < dong.length; i += 2) {
        if (dong[i].classList.contains('xh-tong')) break;
        dong[i].classList.add('hien'); if (dong[i + 1]) dong[i + 1].classList.add('hien');
        if (!tinh) await cho(330, tok);
      }
      dong.forEach(function (e) { e.classList.add('hien'); });
      if (!c) return;
      var x = c.x, doi = x.doi, d1 = x.diem, le = Math.abs(doi) % 1 || d1 % 1;
      if (tongEl) {
        if (!tinh) await chayDen(0, doi, 450, tok, function (v) { tongEl.textContent = (v > 0 ? '+' : '') + String(le ? Math.round(v * 10) / 10 : Math.round(v)).replace('.', ','); });
        tongEl.textContent = (doi > 0 ? '+' : '') + String(doi).replace('.', ',');
      }
      var u = $('#xhThanhKq'), moi = $('#xhKqMoi'), so = $('#xhKqSo'), con = $('#xhKqCon'), the = $('#xhKqH');
      if (!u) return;
      if (!tinh) await cho(200, tok);
      so.className = 'xh-so ' + (doi > 0 ? 'len' : doi < 0 ? 'xuong' : '');
      if (doi !== 0 && !tinh) { var bay = document.createElement('span'); bay.className = 'xh-kqbay' + (doi < 0 ? ' tru' : ''); bay.textContent = (doi > 0 ? '+' : '') + String(doi).replace('.', ','); the.appendChild(bay); }
      var suatTr = XH.laSuat(c.tr.ma), suatS = XH.laSuat(c.s.ma);
      if (!suatTr && !tinh) {
        var ds = chiaDoan(c.d0, d1);
        for (var k = 0; k < ds.length; k++) {
          var dd = ds[k], b = dd.bac, goc = phanTram(b, dd.a);
          moi.className = doi < 0 ? 'tru' : ''; moi.style.left = goc + '%'; moi.style.width = 0;
          await chayDen(dd.a, dd.b, Math.max(450, Math.min(1400, 9 * Math.abs(dd.b - dd.a))), tok, function (v) {
            var p = phanTram(b, v); u.style.width = p + '%'; moi.style.left = Math.min(p, goc) + '%'; moi.style.width = Math.abs(p - goc) + '%';
            so.textContent = String(le ? Math.round(v * 10) / 10 : Math.round(v)).replace('.', ',');
          });
          if (dd.qua) {   // vượt đỉnh bậc
            var nb = bacKq(dd.b);
            if (nb.ma === b.ma && nb.bac === b.bac) break;   // Vàng I chạm 1100: giữ nguyên tới khi biết suất
            the.classList.add('loe');
            if (nb.ma !== b.ma) await phuLen(XH.hien(b.ma + ':' + b.bac), { ma: nb.ma, bac: nb.bac, ten: nb.ten }, 'Mở bộ từ mới của hạng ' + XH.HANG[nb.ma].ten, tok);
            else await bangNho('LÊN BẬC · ' + nb.ten.toUpperCase(), tok);
            $('#xhKqTen').textContent = (nb.ma !== b.ma ? 'THĂNG HẠNG · ' : 'LÊN BẬC · ') + nb.ten.toUpperCase();
            doiHH(nb.ma, nb.bac, 'no');
            await cho(350, tok); the.classList.remove('loe');
            u.style.width = '0%'; moi.style.width = 0;
          } else if (doi < 0 && k < ds.length - 1) {   // tụt qua sàn bậc ⇒ thanh đầy của bậc dưới rồi rút tiếp
            var nb2 = bacKq(dd.b - 0.1); doiHH(nb2.ma, nb2.bac, 'rung'); u.style.width = '100%'; moi.style.width = 0;
          }
        }
      }
      // trạng thái cuối theo máy chủ (x.sau — kể cả suất)
      var bc = bacKq(d1), len = thuTu(x.sau) > thuTu(x.truoc), xuong = thuTu(x.sau) < thuTu(x.truoc);
      if (suatS && x.sau !== x.truoc && len && !tinh) await phuLen(c.tr, c.s, 'Em lọt top toàn giải!', tok);
      if (x.sau !== x.truoc) {
        doiHH(c.s.ma, c.s.bac, xuong ? 'rung' : 'no');
        $('#xhKqTen').textContent = (len ? 'THĂNG HẠNG · ' : 'XUỐNG HẠNG · ') + c.s.ten.toUpperCase();
      }
      u.style.width = (suatS ? 100 : phanTram(bc, d1)) + '%'; moi.style.width = 0; so.textContent = String(d1).replace('.', ',');
      if (c.giu && c.giu.bt) { var g = $('#xhKqGiu'); g.innerHTML = XH.bt(c.giu.bt, 24); g.classList.add('hien'); }
      con.innerHTML = dongCon(bc, d1, x.sau, x);
    } catch (e) { if (e !== 'dung') console.warn('[xh] kết quả', e); }
  }
  function doiHH(ma, bac, lop) { var o = app.querySelector('.xh-kqhh'); if (!o) return; o.innerHTML = XH.hhTag(ma, bac, 62, lop); XH.veHH(o); }
  async function bangNho(chu, tok) {
    var b = $('#xhBangNho'); if (!b) return;
    b.innerHTML = XH.bt('len', 18) + ' ' + esc(chu); b.classList.add('hien');
    await cho(1100, tok); b.classList.remove('hien');
  }
  // phủ màn thăng hạng: cu/moi = { ma, bac, ten }
  async function phuLen(cu, moi, chu, tok) {
    var p = document.createElement('div'); p.className = 'xh-phulen';
    p.innerHTML = '<div class="xh-pltia"></div><div class="xh-plgiay"></div><div class="xh-plnoi"><small>THĂNG HẠNG</small><span class="xh-plcu">' + XH.hhTag(cu.ma, cu.bac, 92) + '</span></div>';
    app.appendChild(p); XH.veHH(p);
    try {
      setTimeout(function () { p.classList.add('hien'); }, 30);
      await cho(650, tok);
      p.querySelector('.xh-plcu').classList.add('vo'); await cho(380, tok);
      var n = p.querySelector('.xh-plnoi');
      n.innerHTML = '<small>THĂNG HẠNG</small>' + XH.hhTag(moi.ma, moi.bac, 120, 'no') + '<b>' + esc(String(moi.ten).toUpperCase()) + '</b><p>' + esc(chu) + '</p><button type="button">Tiếp tục</button>';
      XH.veHH(n);
      var mau = ['#FFC94A', '#3DF58A', '#37D7FF', '#FF8FA0', '#B98CFF'], gi = '';
      for (var i = 0; i < 48; i++) gi += '<i style="left:' + (Math.random() * 100) + '%;background:' + mau[i % 5] + ';animation-delay:' + (Math.random() * .8).toFixed(2) + 's;animation-duration:' + (1.8 + Math.random() * 1.4).toFixed(2) + 's"></i>';
      p.querySelector('.xh-plgiay').innerHTML = gi;
      await new Promise(function (ok) { var h = setTimeout(ok, 2600); n.querySelector('button').onclick = function () { clearTimeout(h); ok(); }; });
    } finally { p.classList.remove('hien'); setTimeout(function () { p.remove(); }, 320); }
  }
  // ---------- pha ----------
  function capPha() {
    var t = G.T; if (!t) return;
    giuTran();
    if (t.trangThai === 'xong') return veKetQua();
    if (t.trangThai === 'het' || t.trangThai === 'huy') return veTai('Trận không bắt đầu (có bạn chưa sẵn sàng).', true);
    if (t.trangThai === 'han') return veTai('Đã tới giờ nghỉ đêm — trận không bắt đầu.', true);
    if (t.trangThai === 'choi' && t.batDau && bay() >= t.batDau - 200) { if (!G.dungChoi || G.veLai) dungChoi(); else capChoi(); return; }
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
      capHo(t);
      if (!batNghe) { batNghe = true; nghePhu(); }
      capPha();
    }, function () { veTai('Không đọc được trận.', true); });
  }
  function nghePhu() {
    f.fs.onSnapshot(f.fs.collection(tRef, 'tu'), function (snap) {
      var moi = new Map();
      snap.forEach(function (d) {
        var m = /^([a-z]+)(?:_(\d+))?(?:_([ab]))?$/.exec(d.id) || [], x = d.data() || {};
        if (/^z/.test(m[1] || '')) return;
        moi.set(d.id, { w: m[1] || d.id, v: m[2] != null ? +m[2] : -1, b: m[3] || '', uid: x.uid, ok: x.ok, d: x.d, i: x.i, ly: x.ly, m: x.m || '', cung: !!x.cung,
          luc: x.luc && x.luc.toMillis ? x.luc.toMillis() : 0 });
      });
      G.cho.forEach(function (luc, id) {
        var x = moi.get(id); if (!x || x.ok == null) return; G.cho.delete(id);
        if (x.ok === true) cong(x.d || 1, x.cung); else rung(x.ly === 'nhanh' ? 'CHẬM LẠI' : x.ly === 'da' ? 'TAKEN' : '✗');
      });
      G.tu = moi; if (G.dungChoi) { veGoi(); veTimTu(); }
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
      var ds = []; snap.forEach(function (d) { var x = d.data(); if ((x.luc || 0) > Date.now() - 25000) ds.push(x); });   // 27/10 người xem: nhịp 10 giây, quá 25 giây coi như đã rời
      G.nguoiXem = ds; veNguoiXem();
    }, function () { });
    if (G.xem) { batXem(); if (G.toi.laThay) setTimeout(function () { doLech(f.fs.doc(tRef, 'xem', G.toi.uid)); }, 1500); }
    else { doLech(f.fs.doc(tRef, 'nhip', G.toi.uid)); setInterval(function () { nhip(); }, 10000); dangDau(); }
  }
  function veNguoiXem() {
    var n = $('#xhSoXem'); if (n) n.textContent = G.nguoiXem.length;
    var c = $('#xhChong'); if (c) c.innerHTML = G.nguoiXem.slice(0, 5).map(function (x) { return XH.av(x.ten, x.anh); }).join('');
    // 31/10 thầy: ảnh người đang xem ngay trong nhãn TRỰC TIẾP (tối đa 5 + "+N", rê chuột ra tên)
    var a = $('#xhTrucAv'), ds = G.nguoiXem;
    if (a) {
      a.innerHTML = ds.slice(0, 5).map(function (x) { return XH.av(x.ten, x.anh); }).join('') + (ds.length > 5 ? '<i>+' + (ds.length - 5) + '</i>' : '');
      a.parentNode.title = ds.map(function (x) { return x.ten; }).join(', ');
    }
  }
  function batXem() {
    var r = f.fs.doc(tRef, 'xem', G.toi.uid);
    var ghi = function () {
      var o = { ten: G.toi.laThay ? 'Thầy Andrew' : (G.toi.ten || ''), anh: G.toi.anh || '', luc: Date.now() }; if (G.toi.laThay) o.gv = true;
      f.fs.setDoc(r, o).catch(function () { o.anh = ''; f.fs.setDoc(r, o).catch(function () { }); });
    };
    ghi(); setInterval(ghi, 10000);
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
    // ?thu=1&en=1 — MẪU gợi ý tiếng Anh bậc cao (thầy duyệt 26/10)
    if (q.get('en')) BAN = [
      { l: 'UPHOLDVIVIENERST', w: ['UPHOLD', 'VIVID', 'VENUE'], m: ['Judges do this to the law, and fair players do it to the rules: they support it and keep it strong.', 'Describes colours, dreams or memories so bright and clear that they feel almost real.', 'The place where an event happens: a stadium for a final, or a hall for a concert.'] },
      { l: 'FRAGILENITQUZSOM', w: ['FRAGILE', 'FINITE', 'QUARTZ'], m: ['Written on boxes of glasses and plates, so delivery workers carry them with great care.', 'The opposite of endless. Oil, time and even patience are all this, because one day they run out.', 'A hard, often clear mineral found in sand; tiny pieces of it help many watches keep time.'] },
      { l: 'CANYONPTTERISLDB', w: ['CANYON', 'POTTERY', 'INSPECT'], m: ['Over millions of years a river cut down through the rock and left this deep valley with steep walls.', 'Shape wet clay on a spinning wheel, bake it in a very hot oven, and you have made this.', 'What an officer does to your bag at the airport: look closely at every detail for problems.'] }];
    var hen = 0, chatHen = 0, timHen = 0, soChat = 0;
    function ban(i) { var b = BAN[i % BAN.length]; return { chu: b.l, goi: b.w.map(function (w, k) { return { m: b.m[k], n: w.length }; }) }; }
    function bat() {
      var t0 = Date.now();
      G.xem = q.get('xem') === '1'; G.ben = 'a'; G.toi = G.toi || { uid: 'hs_100046', ten: 'Bảo Nam' };
      if (G.xem && q.get('thay')) G.toi = Object.assign({}, G.toi, { uid: 'gv_thu', ten: 'Thầy Andrew', laThay: true });
      G.T = Object.assign({ a: G.xem ? 'u1' : G.toi.uid, b: 'u2', tenA: G.xem ? 'Thiên Phúc' : 'Bảo Nam', tenB: G.xem ? 'Khôi Nguyên' : 'Khánh Linh', lopA: 'A2-B', lopB: 'B1-A', hA: /[?&]xl=1/.test(location.search) ? 'xl:2' : 'vang:II', hB: 'vang:I',
        xh: 'thu', goiEn: !!q.get('en'), trangThai: 'choi', batDau: t0 + 3500, ketThuc: t0 + 3500 + (q.get('kb') ? 3000 : q.get('ngan') ? 15000 : q.get('en') ? 180000 : 120000), doiLuc: t0 + 3500, van: 0, tim: {}, hien: {}, diem: { a: 0, b: 0 } }, ban(0));
      if (q.get('thayho')) { G.T.hoTro = { ben: 'a', gv: 'gv_thu', luc: t0 }; G.T.daHoTro = { a: true }; }
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
    function lay(i, uid, nguoiGui) {
      var t = G.T, b = BAN[t.van % BAN.length]; if (t.tim[i]) return false;
      t.tim[i] = uid; var w = b.w[i], dd = Math.min(5, Math.max(1, w.length - 2)) * 2, k = uid === t.a ? 'a' : 'b';
      G.tu.set(w.toLowerCase() + '_' + t.van + '_' + k, { w: w.toLowerCase(), v: t.van, b: k, uid: nguoiGui || uid, ok: true, d: dd, i: i, m: b.m[i], luc: Date.now() });
      t.diem[k] += dd;
      // bàn thử: lần tìm đầu tiên của đối thủ = "CÙNG LÚC" (hai bạn cùng được điểm)
      if (!THU.daCa && uid === t.b) { THU.daCa = true; t.tim2 = {}; t.tim2[i] = t.a; t.diem.a += dd; G.tu.set(w.toLowerCase() + '_' + t.van + '_a', { w: w.toLowerCase(), v: t.van, uid: t.a, ok: true, d: dd, i: i, m: b.m[i], luc: Date.now() }); }
      if (Object.keys(t.tim).length === 3) setTimeout(sang, 700);
      capChoi(); return true;
    }
    function sang() {
      var t = G.T, b = BAN[t.van % BAN.length];
      if (t.doiDang) return; t.doiDang = true;
      b.w.forEach(function (w, i) { if (!t.tim[i]) { t.tim[i] = '-'; t.hien[i] = w; t.boLo = (t.boLo || []).concat([{ w: w, m: b.m[i], v: t.van }]); } });
      capChoi();
      setTimeout(function () { t.van++; Object.assign(t, ban(t.van), { tim: {}, tim2: {}, hien: {}, doiLuc: Date.now(), doiDang: false }); capChoi(); }, 500);
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
      var d = Math.min(5, Math.max(1, w.length - 2)) * 2, k = benGui(); lay(i, t[k], G.xem ? G.toi.uid : ''); cong(d);
    }
    function chat(chu) {
      var b = BAN[G.T.van % BAN.length], gon = chu.toUpperCase().replace(/[^A-Z]/g, '');
      if (G.T.trangThai === 'choi' && b.w.some(function (w) { return gon.indexOf(w) >= 0; })) { G.ghiChu.push({ he: 1, chu: LY_CHAN.dapAn, luc: Date.now() }); return veChat(); }
      nhanChat({ uid: G.toi.uid, ten: G.toi.ten, vai: G.xem ? 'xem' : 'a', chu: chu, luc: Date.now() });
    }
    function nhip() {
      var t = G.T; if (t.trangThai !== 'choi') return;
      if (Date.now() - t.doiLuc >= banMs(t) && Date.now() < t.ketThuc) sang();
      if (Date.now() >= t.ketThuc) {
        clearTimeout(hen); clearInterval(timHen);
        var a = t.diem.a, b = t.diem.b, kq = a > b ? 'thang' : a < b ? 'thua' : 'hoa';
        // ?thu=1&kb=… — 31/10 tình huống màn kết quả động: thuong · lenbac · lenhang · suat · khien · thuasat · tut · rong (xhKq rỗng)
        var KB = { thuong: ['thang', 18, [['thang', 12], ['gioVang', 6]], 'vang:II', 'vang:II', 870, 0], lenbac: ['thang', 24, [['thang', 24]], 'bac:II', 'bac:I', 512, 3],
          lenhang: ['thang', 27, [['thang', 24], ['chuoi', 3]], 'bac:I', 'vang:III', 817, 3], suat: ['thang', 18, [['thang', 18]], 'vang:I', 'bk:', 1110, 0],
          khien: ['thua', -5, [['thua', -12]], 'vang:II', 'vang:II', 900, 2], thuasat: ['thua', 6, [['thuaCao', 0], ['thuaSat', 6]], 'bac:II', 'bac:II', 461, 0],
          tut: ['thua', -12, [['thua', -12]], 'vang:II', 'vang:III', 893, 0] }[q.get('kb')];
        if (KB) { kq = KB[0]; t.diem = KB[0] === 'thang' ? { a: 52, b: 40 } : { a: 41, b: 48 }; }
        t.kq = { a: kq, b: kq === 'thang' ? 'thua' : kq === 'thua' ? 'thang' : 'hoa' };
        t.xhKq = { a: q.get('kb') === 'rong' ? {} : KB ? { doi: KB[1], ct: KB[2], truoc: KB[3], sau: KB[4], diem: KB[5], baoVe: KB[6] }
          : kq === 'thang' ? Object.assign({ doi: 41, ct: [['thang', 24], ['chuoi', 5], ['gioVang', 12]], truoc: 'vang:II', sau: 'vang:I', diem: 1005, baoVe: 3 }, q.get('thayho') ? { thay: { so: 3, d: 24 } } : {})
          : kq === 'thua' ? { doi: -12, ct: [['thua', -12]], truoc: 'vang:II', sau: 'vang:II', diem: 952 } : { doi: 5, ct: [['hoa', 5]], truoc: 'vang:II', sau: 'vang:II', diem: 969 } };
        t.lo = [{ w: 'WINDOW', m: 'cửa sổ' }]; t.trangThai = 'xong'; capPha();
      }
    }
    return { bat: bat, gui: gui, chat: chat, nhip: nhip };
  })();

  NW.dungThanh({ tab: 'khamPha', hop: true }).then(batDau);
})();
