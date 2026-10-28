/* ============================================================
   js/dang-dau.js — ĐANG ĐẤU NHANH · Xếp hạng A Show Speed (web v1.430.0, 26/10/2026)
   Mẫu thầy chốt: D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\dang-dau-nhanh\index.html (v2: sáng, gọn).
   Thầy chốt: KHÔNG có trận ⇒ không hiện gì · không câu hướng dẫn · danh sách chỉ tên + lớp + tỉ số, bấm cả dòng là vào xem.

   A · THANH dưới thanh menu trang bài tập (lop.html · khoa.html):  DangDau.thanh(<div id="dangDau">)
       máy tính: các cặp chạy ngang (bấm = xem) · ⚡ ĐẤU NGAY · ﹀ xổ danh sách · điện thoại: avatar + "N trận" (chạm ⇒ tấm trượt) · ⚡ ĐẤU
       đặt `--cao-ddn` trên <html> = chiều cao thanh (lop/khoa trừ đi khi tính chiều cao lưới bài + chat, như `--cao-dai` của thanh giải).
   B · HÀNG BONG BÓNG đầu danh sách Tin nhắn (nw/js/chat.js · js/tn-pop.js):  DangDau.hang(el)
       ⚡ Đấu ngay + mỗi cặp một bong bóng (2 avatar · LIVE · tỉ số), bấm = xem.
   C · DẢI GHIM ĐẦU KHUNG CHAT NHÓM LỚP (v1.438.0, mẫu dang-dau-chat-v1):  DangDau.chat(el, { dau })  — js/chat-ui.js tự gắn khi trang khai o.dangDau
       khung hẹp: avatar + "N trận" (bấm = xổ / tấm trượt) · khung ≥ 560px: các cặp chạy ngang + ﹀ · KHÔNG có trận vẫn hiện A SHOW SPEED + ĐẤU NGAY · thầy: không nút Đấu.

   Dữ liệu: CÙNG truy vấn với tab Đang đấu của sảnh (nw/js/xephang.js — luật đã cho học sinh đọc):
     caiDat/xepHang { mua } ⇒ tranDau where xh == mua · trangThai == 'choi' · limit 30.
   ⛔ KHÔNG onSnapshot: tài liệu trận đổi theo TỪNG TỪ tìm được ⇒ mỗi máy đang mở trang sẽ đọc lại liên tục. Thay vào đó HỎI LẠI 30 giây/lần,
     CHỈ khi tab đang hiện và có chỗ vẽ còn gắn trên trang; tab ẩn thì nghỉ, hiện lại thì hỏi ngay. Giờ nghỉ đêm (GioiHan) không hỏi.
   Vào xem: nw/xhtran.html?id=… (máy là người chơi thì tự thành người chơi) · Đấu ngay: nw/xephang.html?tim=1 (sảnh tự bấm Tìm trận).
   Bàn thử (localhost + ?thu=…): 5 trận mẫu, không đọc kho · thêm &ddn=0 ⇒ không có trận.
   Lớp CSS tiền tố `ddn-` (tự chèn).
   ============================================================ */
(function () {
  'use strict';
  if (window.DangDau) return;
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var GOC = SRC.replace(/js\/dang-dau\.js.*$/, '');   // thư mục gốc web (chứa nw/)
  var NHIP = 10000, MUA_HAN = 10 * 60000;   // 27/10 thầy: người xem gần thời gian thực (trước 30 giây)
  var an = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var MAU = ['#E0A11B', '#E5587A', '#12A58F', '#1C7FD6', '#8B5CF6', '#E07B2C', '#2BAE66', '#3B82F6', '#C2410C', '#0891B2'];
  var laThu = function () { return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]thu=/.test(location.search); };
  var S = { ds: [], mua: '', muaLuc: 0, hen: 0, dang: false, cho: [], toi: '' };

  // ---------- giao diện ----------
  function napCss() {
    if (document.getElementById('ddnCss')) return;
    if (!document.querySelector('link[href*="family=Saira"]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Saira:ital,wght@1,800&display=swap'; document.head.appendChild(l);
    }
    var s = document.createElement('style'); s.id = 'ddnCss';
    s.textContent =
      '#dangDau{position:sticky;top:calc(62px + var(--cao-dai,0px));z-index:28}#dangDau:empty,#dangDau[hidden]{display:none}' +
      '@media (max-width:640px){#dangDau{top:calc(54px + var(--cao-dai,0px))}}.go-chat #dangDau{display:none}' +
      '.ddn-a{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font:800 11px/1 "Saira",system-ui,sans-serif;color:#fff;flex:none;position:relative;overflow:hidden}' +
      '.ddn-a img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
      '.ddn-cham{width:8px;height:8px;border-radius:50%;background:#E5384F;flex:none;display:inline-block;animation:ddn-nhay 1.2s steps(1) infinite}@keyframes ddn-nhay{50%{opacity:.25}}' +
      '.ddn-so{font:italic 800 19px/1 "Saira",system-ui,sans-serif;white-space:nowrap;letter-spacing:0}.ddn-so i{font-style:inherit;color:#0E9F5B}.ddn-so u{text-decoration:none;color:#1C7FD6}.ddn-so s{text-decoration:none;color:#9FB1AD;margin:0 3px}' +
      '.ddn-dau{flex:none;height:38px;border:0;border-radius:10px;padding:0 16px;background:linear-gradient(180deg,#16B79E,#0F7A6C);color:#fff;font:italic 800 16px/1 "Saira",system-ui,sans-serif;letter-spacing:.05em;box-shadow:0 4px 12px rgba(15,122,108,.3);white-space:nowrap;cursor:pointer}' +
      /* A · thanh */
      '.ddn-t{height:56px;display:flex;align-items:center;gap:12px;padding:0 max(12px,calc((100% - 1160px)/2));box-sizing:border-box;background:linear-gradient(90deg,#E6F7F2,#F4FBF9 45%,#EAF4FB);border-bottom:1px solid #CFE5DF;box-shadow:0 2px 10px rgba(15,122,108,.08);position:relative;font-family:inherit;color:#16232A}' +
      '.ddn-ten{flex:none;display:flex;align-items:center;gap:8px;font:italic 800 17px/1 "Saira",system-ui,sans-serif;color:#16232A;white-space:nowrap}.ddn-ten em{font-style:inherit;color:#12A58F}' +
      '.ddn-ds{flex:1;min-width:0;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 94%,transparent);mask-image:linear-gradient(90deg,#000 94%,transparent)}.ddn-ds::-webkit-scrollbar{display:none}' +
      '.ddn-chip{flex:none;display:flex;align-items:center;gap:8px;height:40px;padding:0 10px 0 6px;border-radius:12px;background:#fff;border:1px solid #D6E8E3;box-shadow:0 1px 3px rgba(15,122,108,.08);color:#16232A;cursor:pointer;font:inherit}' +
      '.ddn-chip:hover{border-color:#12A58F;box-shadow:0 2px 8px rgba(15,122,108,.18)}' +
      '.ddn-chip .ddn-n{font-weight:700;font-size:14px;line-height:1;max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.ddn-mo{flex:none;width:36px;height:36px;border-radius:10px;border:1px solid #CFE5DF;background:#fff;color:#0F7A6C;display:grid;place-items:center;cursor:pointer;padding:0}' +
      '.ddn-mo svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}.ddn-mo.on svg{transform:rotate(180deg)}' +
      '.ddn-dem{flex:1;min-width:0;display:none;align-items:center;gap:9px;font-weight:800;font-size:15px;line-height:1;color:#16232A;background:none;border:0;padding:0;text-align:left;white-space:nowrap;cursor:pointer;font-family:inherit}' +
      '.ddn-chong{display:flex;padding-left:9px}.ddn-chong .ddn-a{margin-left:-9px;border:2px solid #fff;width:28px;height:28px;font-size:10px}' +
      '@media (max-width:640px){.ddn-t{height:54px;gap:10px;padding:0 10px 0 12px}.ddn-ten{font-size:15px}.ddn-ds,.ddn-mo{display:none}.ddn-dem{display:flex}.ddn-ngay{display:none}.ddn-t .ddn-dau{height:36px;padding:0 14px;font-size:15px}}' +
      /* danh sách: máy tính xổ dưới thanh · điện thoại tấm trượt */
      '.ddn-xo{position:absolute;z-index:30;right:max(12px,calc((100% - 1160px)/2));top:calc(100% + 6px);width:min(520px,calc(100vw - 24px));max-height:min(70vh,560px);overflow:auto;background:#fff;border:1px solid #CFE5DF;border-radius:16px;padding:8px;box-shadow:0 18px 44px rgba(22,35,42,.18)}' +
      '.ddn-che{position:fixed;inset:0;z-index:1000;background:rgba(22,35,42,.35)}' +
      '.ddn-xo.truot{position:fixed;left:0;right:0;bottom:0;top:auto;width:auto;z-index:1001;border-radius:22px 22px 0 0;border-bottom:0;padding:6px 8px calc(18px + env(safe-area-inset-bottom,0px));max-height:80vh;animation:ddn-len .25s cubic-bezier(.22,.9,.3,1)}' +
      '.ddn-xo.truot::before{content:"";display:block;width:44px;height:5px;border-radius:3px;background:#D4DFDB;margin:4px auto 6px}@keyframes ddn-len{from{transform:translateY(40px);opacity:0}}' +
      '.ddn-dong{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:center;width:100%;border:0;background:none;padding:10px;border-radius:12px;text-align:left;cursor:pointer;color:#16232A;font:inherit}' +
      '.ddn-dong+.ddn-dong{border-top:1px solid #EEF3F1}.ddn-dong:hover{background:#E8F6F2}' +
      '.ddn-b{display:flex;align-items:center;gap:9px;min-width:0}.ddn-b.r{flex-direction:row-reverse;text-align:right}' +
      '.ddn-nm{min-width:0}.ddn-nm b{display:block;font-weight:700;font-size:15px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ddn-nm small{display:block;font-weight:600;font-size:12.5px;line-height:1.2;color:#5F7370}' +
      '.ddn-dong .ddn-so{font-size:24px}' +
      '@media (max-width:640px){.ddn-dong{padding:11px 6px;gap:8px}.ddn-nm b{font-size:14px}.ddn-dong .ddn-a{width:28px;height:28px}.ddn-dong .ddn-so{font-size:21px}}' +
      /* B · hàng bong bóng */
      '.ddn-h{display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;padding:2px 2px 12px;margin:0 0 6px;border-bottom:1px solid #EEF3F1}.ddn-h::-webkit-scrollbar{display:none}' +
      '.ddn-bong{flex:none;width:64px;display:flex;flex-direction:column;align-items:center;gap:5px;background:none;border:0;padding:0;cursor:pointer;color:#16232A;font:inherit}' +
      '.ddn-vong{width:60px;height:60px;border-radius:50%;padding:3px;background:conic-gradient(#12A58F,#37A8FF,#12A58F);position:relative}' +
      '.ddn-vong>span{display:block;width:100%;height:100%;border-radius:50%;background:#fff;position:relative}' +
      '.ddn-vong .ddn-a{position:absolute;width:31px;height:31px;font-size:10.5px;border:2px solid #fff}.ddn-vong .ddn-a.l{left:1px;top:3px}.ddn-vong .ddn-a.r{right:1px;bottom:5px}' +
      '.ddn-live{position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);background:#E5384F;color:#fff;font:800 9px/1 "Saira",system-ui,sans-serif;letter-spacing:.08em;border-radius:4px;padding:3px 5px;border:2px solid #fff}' +
      '.ddn-bong .ddn-so{font-size:14px;margin-top:2px}' +
      '.ddn-bong.dn .ddn-vong{background:none;border:2px dashed #7CCFC0}' +
      '.ddn-bong.dn .ddn-vong>span{display:grid;place-items:center;background:linear-gradient(180deg,#16B79E,#0F7A6C);color:#fff}.ddn-bong.dn svg{width:24px;height:24px;fill:currentColor}' +
      '.ddn-bong .ddn-chu{font-weight:800;font-size:12px;line-height:1;color:#0F7A6C;margin-top:2px;white-space:nowrap}' +
      '.tp-ddn .ddn-h{padding:2px 12px 10px;margin:0 0 4px}.tn-ddn .ddn-h{padding:4px 8px 12px}' +
      /* C · dải ghim đầu khung chat nhóm lớp — 3 cỡ theo bề ngang KHUNG CHAT (container query), không theo màn */
      '.ddn-cg{flex:none;position:relative;z-index:6;container-type:inline-size}.ddn-cg[hidden]{display:none}' +
      '.ddn-g{height:50px;display:flex;align-items:center;gap:10px;padding:0 10px 0 14px;box-sizing:border-box;background:linear-gradient(90deg,#E6F7F2,#F4FBF9 50%,#EAF4FB);border-bottom:1px solid #CFE5DF;color:#16232A;font-family:inherit}' +
      '.ddn-g .ddn-ten{font-size:15px}.ddn-g .ddn-giua{flex:1;min-width:0;display:flex;align-items:center}' +
      '.ddn-g .ddn-dem{display:flex;flex:1;gap:8px;font-size:14px}.ddn-g .ddn-dem svg{width:16px;height:16px;stroke:#0F7A6C;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}' +
      '.ddn-mo-ra .ddn-dem svg{transform:rotate(180deg)}.ddn-g .ddn-chong .ddn-a{width:26px;height:26px;font-size:9.5px}' +
      '.ddn-g .ddn-ds,.ddn-g .ddn-mo{display:none}.ddn-g .ddn-dau{height:34px;padding:0 12px;font-size:14px}.ddn-g .ddn-ngay{display:none}' +
      '.ddn-g .ddn-chip{height:36px;gap:6px;padding:0 8px 0 4px;border-radius:11px}.ddn-g .ddn-chip .ddn-a{width:26px;height:26px;font-size:9.5px}.ddn-g .ddn-chip .ddn-so{font-size:16px}.ddn-g .ddn-chip .ddn-n{font-size:13px;max-width:96px}' +
      '.ddn-g.trong .ddn-ngay{display:inline}.ddn-g.trong .ddn-cham{background:#B9C7C3;animation:none}' +
      '@container (min-width:560px){.ddn-g{height:54px;gap:12px}.ddn-g .ddn-ten{font-size:16px}.ddn-g .ddn-dem{display:none}.ddn-g .ddn-ds{display:flex}.ddn-g .ddn-mo{display:grid;width:32px;height:32px}.ddn-g .ddn-dau{height:36px;padding:0 14px;font-size:15px}.ddn-g .ddn-ngay{display:inline}}' +
      '.ddn-xo.cg{left:8px;right:8px;width:auto;top:calc(100% + 4px);max-height:min(60vh,380px)}';
    document.head.appendChild(s);
  }
  var SET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';
  function tat(t) { var w = String(t || '?').trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase(); }
  function av(ten, anh, lop) {
    var mau = MAU[(String(ten || '').length + String(ten || '?').charCodeAt(0)) % MAU.length];
    return '<span class="ddn-a' + (lop ? ' ' + lop : '') + '" style="background:' + mau + '">' + an(tat(ten)) + (anh ? '<img src="' + an(anh) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span>';
  }
  function so(t) { var d = t.diem || {}; return '<span class="ddn-so"><i>' + (d.a || 0) + '</i><s>–</s><u>' + (d.b || 0) + '</u></span>'; }
  var tenA = function (t) { return t.tenA || '?'; }, tenB = function (t) { return t.tenB || '?'; };
  function dong(t) {
    return '<button type="button" class="ddn-dong" data-ddn="' + an(t.id) + '" title="Xem trận">' +
      '<span class="ddn-b">' + av(tenA(t), t.anhA) + '<span class="ddn-nm"><b>' + an(tenA(t)) + '</b><small>' + an(t.lopA || '') + '</small></span></span>' + so(t) +
      '<span class="ddn-b r">' + av(tenB(t), t.anhB) + '<span class="ddn-nm"><b>' + an(tenB(t)) + '</b><small>' + an(t.lopB || '') + '</small></span></span></button>';
  }
  function diXem(id) {
    var u = GOC + 'nw/xhtran.html?id=' + encodeURIComponent(id) + (laThu() ? '&thu=1&xem=1' : '');
    if (/dashboard\.html$/.test(location.pathname)) window.open(u, '_blank');   // v1.438.0 — thầy xem từ dải chat dashboard: tab mới, không rời trang quản lý
    else location.href = u;
  }
  function diDau() { location.href = GOC + 'nw/xephang.html?' + (laThu() ? 'thu=1&' : '') + 'tim=1'; }

  // ---------- A · thanh ----------
  var VUA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  function veThanh(c) {
    var ds = S.ds, el = c.el;
    if (!ds.length) { dongXo(c); if (el.innerHTML) el.innerHTML = ''; el.hidden = true; caoThanh(); return; }   // không có trận ⇒ không hiện gì
    el.hidden = false;
    el.innerHTML = '<div class="ddn-t"><span class="ddn-ten"><i class="ddn-cham"></i>A SHOW <em>SPEED</em></span>' +
      '<div class="ddn-ds">' + ds.map(function (t) {
        return '<button type="button" class="ddn-chip" data-ddn="' + an(t.id) + '" title="Xem trận">' + av(tenA(t), t.anhA) + '<span class="ddn-n">' + an(tenA(t)) + '</span>' + so(t) +
          '<span class="ddn-n">' + an(tenB(t)) + '</span>' + av(tenB(t), t.anhB) + '</button>';
      }).join('') + '</div>' +
      '<button type="button" class="ddn-dem" data-ddn-mo><span class="ddn-chong">' + ds.slice(0, 3).map(function (t) { return av(tenA(t), t.anhA); }).join('') + '</span>' + ds.length + ' trận</button>' +
      '<button type="button" class="ddn-dau" data-ddn-dau>⚡ ĐẤU<span class="ddn-ngay"> NGAY</span></button>' +
      '<button type="button" class="ddn-mo' + (c.xo ? ' on' : '') + '" data-ddn-mo aria-label="Danh sách trận">' + VUA + '</button></div>';
    if (c.xo) { if (c.che && c.xoEl && c.xoEl.isConnected) c.xoEl.innerHTML = ds.map(dong).join(''); else veXo(c); }   // tấm trượt đang mở: chỉ thay chữ, không nảy lại
    caoThanh();
  }
  function laDt() { return window.matchMedia && matchMedia('(max-width:640px)').matches; }
  function veXo(c) {
    dongXo(c, true);
    var xo = document.createElement('div'); xo.className = 'ddn-xo' + (laDt() ? ' truot' : c.loai === 'chat' ? ' cg' : ''); xo.innerHTML = S.ds.map(dong).join('');
    if (laDt()) { var che = document.createElement('div'); che.className = 'ddn-che'; che.onclick = function () { dongXo(c); }; document.body.appendChild(che); document.body.appendChild(xo); c.che = che; }
    else (c.loai === 'chat' ? c.el : c.el.firstChild).appendChild(xo);   // dải chat: xổ dưới dải, phủ lên tin nhắn
    xo.addEventListener('click', bam);
    c.xoEl = xo; c.xo = true; c.el.classList.add('ddn-mo-ra');
  }
  function dongXo(c, giu) {
    if (c.xoEl) { c.xoEl.remove(); c.xoEl = null; } if (c.che) { c.che.remove(); c.che = null; }
    if (!giu) { c.xo = false; c.el.classList.remove('ddn-mo-ra'); var m = c.el.querySelector('.ddn-mo'); if (m) m.classList.remove('on'); }
  }
  // ---------- C · dải ghim đầu khung chat nhóm lớp (28/10 thầy chốt mẫu dang-dau-chat-v1) ----------
  // Khác thanh A: KHÔNG có trận vẫn hiện (A SHOW SPEED + ⚡ ĐẤU NGAY) · thầy (c.dau = false) không có nút Đấu · ẩn/hiện do ChatUI (phòng riêng thì ẩn).
  function veChat(c) {
    var ds = S.ds, el = c.el, trong = !ds.length;
    if (trong) dongXo(c);
    el.innerHTML = '<div class="ddn-g' + (trong ? ' trong' : '') + '"><span class="ddn-ten"><i class="ddn-cham"></i>A SHOW <em>SPEED</em></span>' +
      (trong ? '<span class="ddn-giua"></span>' :
        '<div class="ddn-giua"><button type="button" class="ddn-dem" data-ddn-mo><span class="ddn-chong">' + ds.slice(0, 3).map(function (t) { return av(tenA(t), t.anhA); }).join('') + '</span>' + ds.length + ' trận ' + VUA + '</button>' +
        '<div class="ddn-ds">' + ds.map(function (t) {
          return '<button type="button" class="ddn-chip" data-ddn="' + an(t.id) + '" title="Xem trận">' + av(tenA(t), t.anhA) + '<span class="ddn-n">' + an(tenA(t)) + '</span>' + so(t) +
            '<span class="ddn-n">' + an(tenB(t)) + '</span>' + av(tenB(t), t.anhB) + '</button>';
        }).join('') + '</div></div>' +
        '<button type="button" class="ddn-mo' + (c.xo ? ' on' : '') + '" data-ddn-mo aria-label="Danh sách trận">' + VUA + '</button>') +
      (c.dau ? '<button type="button" class="ddn-dau" data-ddn-dau>⚡ ĐẤU<span class="ddn-ngay"> NGAY</span></button>' : '') + '</div>';
    if (c.xo) { if (c.che && c.xoEl && c.xoEl.isConnected) c.xoEl.innerHTML = ds.map(dong).join(''); else veXo(c); }
  }
  function caoThanh() {
    var el = document.getElementById('dangDau');
    document.documentElement.style.setProperty('--cao-ddn', (el && !el.hidden && el.firstChild ? el.offsetHeight : 0) + 'px');
  }
  // ---------- B · hàng bong bóng ----------
  function veHang(c) {
    var ds = S.ds, el = c.el;
    if (!ds.length) { if (el.innerHTML) el.innerHTML = ''; el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = '<div class="ddn-h"><button type="button" class="ddn-bong dn" data-ddn-dau title="Đấu ngay"><span class="ddn-vong"><span>' + SET + '</span></span><span class="ddn-chu">Đấu ngay</span></button>' +
      ds.map(function (t) {
        return '<button type="button" class="ddn-bong" data-ddn="' + an(t.id) + '" title="' + an(tenA(t) + ' – ' + tenB(t)) + '"><span class="ddn-vong"><span>' + av(tenA(t), t.anhA, 'l') + av(tenB(t), t.anhB, 'r') +
          '<i class="ddn-live">LIVE</i></span></span>' + so(t) + '</button>';
      }).join('') + '</div>';
  }

  // ---------- bấm ----------
  function bam(e) {
    var x = e.target.closest('[data-ddn]'); if (x) { e.preventDefault(); e.stopPropagation(); return diXem(x.getAttribute('data-ddn')); }
    if (e.target.closest('[data-ddn-dau]')) { e.preventDefault(); e.stopPropagation(); return diDau(); }
    var m = e.target.closest('[data-ddn-mo]');
    if (m) { e.preventDefault(); var c = S.cho.filter(function (y) { return y.el.contains(m); })[0]; if (!c) return; if (c.xo) dongXo(c); else { veXo(c); var nm = c.el.querySelector('.ddn-mo'); if (nm) nm.classList.add('on'); } }
  }
  document.addEventListener('click', function (e) {   // bấm ra ngoài ⇒ đóng danh sách xổ (máy tính)
    S.cho.forEach(function (c) { if (c.xo && c.xoEl && !c.xoEl.contains(e.target) && !c.el.contains(e.target)) dongXo(c); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') S.cho.forEach(function (c) { if (c.xo) dongXo(c); }); });

  // ---------- dữ liệu ----------
  function veHet() {
    S.cho = S.cho.filter(function (c) { return c.el.isConnected; });
    S.cho.forEach(ve1);
  }
  function ve1(c) { if (c.loai === 'thanh') veThanh(c); else if (c.loai === 'chat') veChat(c); else veHang(c); }
  function mauThu() {
    if (/[?&]ddn=0/.test(location.search)) return [];
    var b = Date.now();
    return [['Thiên Phúc', 'B2-A', 'Khôi Nguyên', 'B1-B', 41, 38], ['Hải Đăng', 'A2-B', 'Minh Châu', 'B1-B', 22, 30], ['Gia Huy', 'A1-C', 'Ngọc Hà', 'B2-B', 15, 9],
      ['Thảo My', 'NT K9', 'Đức Minh', 'A1-A', 8, 12], ['Bảo Châu', 'A2-B', 'Nhật Huy', 'NT 4', 0, 0]]
      .map(function (x, i) { return { id: 'thu' + i, tenA: x[0], lopA: x[1], tenB: x[2], lopB: x[3], diem: { a: x[4], b: x[5] }, ketThuc: b + 90000 }; });
  }
  function kho() { return window.TheTD && TheTD.kho ? TheTD.kho() : (window.NW && NW.fb) ? NW.fb() : Promise.reject(new Error('chưa có kho')); }
  async function nap() {
    if (laThu()) { S.ds = mauThu(); return; }
    if (window.GioiHan && GioiHan.cai && GioiHan.dem && GioiHan.dem()) { S.ds = []; return; }   // giờ nghỉ đêm: không ai đấu được
    var f = await kho();
    if (!S.muaLuc || Date.now() - S.muaLuc > MUA_HAN) {
      var c = await f.fs.getDoc(f.fs.doc(f.db, 'caiDat', 'xepHang'));
      S.mua = c.exists() ? String(c.data().mua || '') : ''; S.muaLuc = Date.now();
    }
    if (!S.mua) { S.ds = []; return; }
    var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'tranDau'), f.fs.where('xh', '==', S.mua), f.fs.where('trangThai', '==', 'choi'), f.fs.limit(30)));
    var bay = Date.now(), ds = [];
    s.forEach(function (d) { var t = d.data(); if ((t.ketThuc || 0) > bay - 5000) { t.id = d.id; ds.push(t); } });
    // v1.439.0 (28/10 thầy: mọi nơi xem trận đang đấu — trận bắt đầu TRƯỚC ở trên, trận mới xuống dưới)
    ds.sort(function (x, y) { return ((x.batDau || x.ketThuc || 0) - (y.batDau || y.ketThuc || 0)) || (x.id < y.id ? -1 : 1); });
    S.ds = ds;
  }
  // chỗ vẽ "đang hiện" = còn gắn trên trang và KHUNG CHỨA nó có hình (khung Tin nhắn giữ sống nw/tinnhan.html?nhung=1 nằm trong iframe ẩn ⇒ không có)
  function coChoHien() { return S.cho.some(function (c) { var p = c.loai === 'chat' ? c.el : c.el.parentElement; return c.el.isConnected && !!p && p.getClientRects().length > 0; }); }   // dải chat: chính nó (phòng riêng thì ChatUI ẩn dải)
  async function vong() {
    clearTimeout(S.hen); S.hen = 0;
    if (document.hidden || S.dang) return;
    if (!coChoHien()) { if (S.cho.some(function (c) { return c.el.isConnected; })) S.hen = setTimeout(vong, 5000); return; }   // đang ẩn: chỉ ngó lại, không đọc kho
    S.dang = true;
    try { await nap(); } catch (e) { console.warn('[dang-dau]', e && e.message || e); }
    S.dang = false;
    veHet();
    if (S.cho.length && !document.hidden) S.hen = setTimeout(vong, NHIP);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) vong(); else { clearTimeout(S.hen); S.hen = 0; } });
  window.addEventListener('resize', function () { caoThanh(); });

  function gan(el, loai, dau) {
    if (!el) return;
    napCss();
    if (S.cho.some(function (c) { return c.el === el; })) return;
    var c = { el: el, loai: loai, xo: false, dau: dau !== false };
    S.cho.push(c);
    el.addEventListener('click', bam);
    if (window.TheTD && TheTD.toi && !S.toi) TheTD.toi().then(function (x) { S.toi = (x && x.uid) || ''; }).catch(function () { });
    if (S.ds.length || S.daNap || loai === 'chat') ve1(c);   // dải chat hiện ngay (chưa có số liệu = như không có trận)
    if (!S.hen && !S.dang) vong().then(function () { S.daNap = true; });
  }
  window.DangDau = {
    thanh: function (el) { gan(el, 'thanh'); },
    hang: function (el) { gan(el, 'hang'); },
    chat: function (el, o) { gan(el, 'chat', !(o && o.dau === false)); },   // C · dải đầu khung chat nhóm lớp (js/chat-ui.js o.dangDau)
    lamMoi: vong
  };
})();
