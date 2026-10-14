/* ============================================================================
   ⭐⭐ v1.333.0 (14/10/2026, thầy chốt mẫu `MAU NUT REMIND THE STAGE v1 14-10-2026.html`) — NÚT REMIND TRÊN THẺ STAGE
   Dùng chung cho lop.html (thẻ bài của em) và dashboard.html (thẻ bài của thầy): viên "🔔 REMIND" nằm TRONG ô hạn, cạnh
   đồng hồ; bấm ⇒ pop-up soạn tin (câu viết sẵn + @tên các bạn/em chưa xong STAGE đang chạy) ⇒ gửi vào nhóm chat lớp.
   · 1 LẦN / GIỜ cho mỗi STAGE, nhớ trên máy. Khoá `awc_nhac_<bài>_c_<số chặng>_<mã HS>` — TRÙNG KHOÁ nút REMIND FRIENDS của
     bai.html (v1.332.0) ⇒ nhắc ở thẻ rồi thì trong bài cũng xám, và ngược lại. Thầy dùng mã 'GV'.
   · Trang chỉ việc: `NhacBan.nutHtml(khoa, data)` khi vẽ ô hạn + `NhacBan.mo({...})` khi bấm (xem lop.html / dashboard.html).
   ⛔ Pop-up bai.html (`moNhacBan`) là bản riêng có thêm loại act — câu viết sẵn STAGE ở đây CHÉP Y `MAU_NHAC_CHANG` bên đó.
   ========================================================================== */
(function () {
  'use strict';
  var CACH_MS = 60 * 60 * 1000;
  var IC = '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  var MAU_HS = [
    'Các bạn ơi, cùng hoàn thành STAGE {S} sớm nhé {T}! Có chỗ nào chưa hiểu cứ nhắn lên nhóm, mọi người giúp liền nha 💪',
    '{T} ơi, cả lớp đang chờ các bạn xong STAGE {S} để mở STAGE {N} đó! Cố lên nha, bí chỗ nào hỏi nhóm nhé 😊',
    'Nhắc nhẹ {T}: chỉ còn STAGE {S} nữa thôi là cả lớp sang STAGE {N} rồi! Cần giúp gì cứ nhắn nhóm nha 🙌',
    'Hello {T}! Mình xong STAGE {S} rồi nè, các bạn làm nốt nhé. Câu nào khó cứ hỏi, cả lớp hỗ trợ ngay 👍',
    '{T} ơi, mình cùng về đích STAGE {S} nào! Bạn nào kẹt câu nào nhắn lên nhóm để mọi người cùng gỡ nha ✨',
    'Cả lớp chỉ còn chờ {T} thôi! Làm nhanh STAGE {S} để mình cùng mở STAGE {N} nhé, cần gì cứ hỏi nha 🚀',
    'Team ơi {T}, STAGE {N} đang đợi chúng mình đó! Hoàn thành STAGE {S} sớm nha, chưa hiểu thì nhắn nhóm mọi người chỉ cho 💡',
    'Cố lên {T}! Xong STAGE {S} là cả lớp mở STAGE {N} luôn. Có gì khó cứ nhắn lên đây, mình giúp nha 🤝'
  ];
  var MAU_GV = [
    'Thầy nhắc {T}: các em hoàn thành STAGE {S} sớm nhé, cả lớp đang chờ để mở STAGE {N}. Chỗ nào chưa hiểu cứ nhắn lên nhóm nha!',
    '{T} ơi, STAGE {S} còn thiếu bài của các em đó. Làm nốt trước hạn nhé, cần giúp gì nhắn thầy hoặc hỏi các bạn trong nhóm.',
    'Cả lớp chỉ còn chờ {T} thôi! Các em làm xong STAGE {S} để lớp mình mở STAGE {N} nha 💪'
  ];
  // Chặng CUỐI (không còn STAGE sau) ⇒ bỏ câu có {N}, còn lại mọi câu đều đúng.
  var MAU_GV_CUOI = [
    'Thầy nhắc {T}: các em hoàn thành STAGE {S} trước hạn nhé. Chỗ nào chưa hiểu cứ nhắn lên nhóm nha!',
    '{T} ơi, STAGE {S} còn thiếu bài của các em đó. Làm nốt trước hạn nhé, cần giúp gì nhắn thầy hoặc hỏi các bạn trong nhóm.'
  ];

  function anToan(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function conCho(khoa) {
    var t = 0; try { t = +localStorage.getItem(khoa) || 0; } catch (e) {}
    return Math.max(0, t + CACH_MS - Date.now());
  }
  function chuCho(ms) { return 'Nhắc lại sau ' + Math.max(1, Math.ceil(ms / 60000)) + ' phút'; }
  // Viên REMIND (SPAN, không phải BUTTON: thẻ lop.html là <button>, nút lồng nút không hợp lệ).
  function nutHtml(khoa, data, tieuDe) {
    var con = conCho(khoa);
    return '<span class="nut-remind' + (con > 0 ? ' da' : ' rung') + '" role="button" tabindex="0" data-nhackhoa="' + anToan(khoa) + '"' + (data || '') +
      ' title="' + anToan(con > 0 ? chuCho(con) : (tieuDe || 'Nhắc các bạn chưa xong')) + '">' + IC + 'REMIND</span>';
  }
  // Nhịp 30 giây: viên xám hết giờ chờ ⇒ sáng lại; còn chờ ⇒ cập nhật chữ rê chuột.
  setInterval(function () {
    var ds = document.querySelectorAll('.nut-remind.da[data-nhackhoa]');
    for (var i = 0; i < ds.length; i++) {
      var con = conCho(ds[i].getAttribute('data-nhackhoa'));
      if (con > 0) { ds[i].title = chuCho(con); continue; }
      ds[i].classList.remove('da'); ds[i].classList.add('rung'); ds[i].title = 'Nhắc các bạn chưa xong';
    }
  }, 30000);

  // Tin dài hơn trần chat ⇒ chia, chỉ cắt NGAY TRƯỚC một dấu "@" (không cắt đôi tên) — chép y `chiaTinNhac` bai.html.
  function chia(chu, tran) {
    var ra = [];
    while (chu.length > tran) {
      var cat = chu.lastIndexOf(' @', tran);
      if (cat <= 0) cat = chu.lastIndexOf(' ', tran);
      if (cat <= 0) cat = tran;
      ra.push(chu.slice(0, cat).trim());
      chu = chu.slice(cat).trim();
    }
    if (chu) ra.push(chu);
    return ra;
  }

  var CSS =
    '.han-duoi{display:flex; align-items:center; justify-content:center; gap:9px}' +
    '.nut-remind{flex:none; display:inline-flex; align-items:center; gap:4px; height:23px; padding:0 9px 0 7px; border-radius:999px; background:#fff; border:1.5px solid #F2B866; color:#C8640C; cursor:pointer;' +
      ' font:800 10.5px/1 var(--sans,inherit); letter-spacing:.08em; box-shadow:0 1px 2px rgba(200,100,12,.15); transition:background .15s, color .15s, transform .1s; white-space:nowrap; user-select:none}' +
    '.nut-remind svg{width:12px; height:12px; fill:none; stroke:currentColor; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round}' +
    '.nut-remind:hover{background:#DE7A12; border-color:#DE7A12; color:#fff}' +
    '.nut-remind:active{transform:scale(.95)}' +
    '.nut-remind.rung svg{animation:nr-rung 2.4s ease-in-out infinite; transform-origin:50% 10%}' +
    '@keyframes nr-rung{0%,72%,100%{transform:rotate(0)} 76%{transform:rotate(16deg)} 82%{transform:rotate(-14deg)} 88%{transform:rotate(9deg)} 94%{transform:rotate(-5deg)}}' +
    '.t-han.gap-gio .nut-remind{border-color:#EFA5A8; color:#C2373C}' +
    '.t-han.gap-gio .nut-remind:hover{background:#D93B40; border-color:#D93B40; color:#fff}' +
    '.nut-remind.da,.nut-remind.da:hover{background:#F1F3F4; border-color:#DCE1E3; color:#97A3A6; box-shadow:none; cursor:default}' +
    '.nut-remind.da svg{animation:none}' +
    '@media (prefers-reduced-motion:reduce){.nut-remind.rung svg{animation:none}}' +
    '@media (max-width:620px){.han-duoi{gap:5px} .nut-remind{height:17px; padding:0 6px 0 5px; gap:3px; font-size:8px; letter-spacing:.06em; border-width:1.2px} .nut-remind svg{width:9px; height:9px}}' +
    // pop-up — cùng khuôn bai.html (.nhb-*), thêm reset nút cho dashboard (nút mặc định của trình duyệt)
    ':where(.nhb-nen) button{font:inherit; color:inherit; background:none; border:0; padding:0; cursor:pointer}' +
    '.nhb-nen{position:fixed; inset:0; z-index:9000; background:rgba(15,23,42,.45); backdrop-filter:blur(2px); display:none; align-items:center; justify-content:center; padding:16px; font-family:var(--sans,inherit); color:#16232A; text-align:left}' +
    '.nhb-nen.mo{display:flex}' +
    '.nhb-pop{width:min(560px,100%); max-height:92vh; overflow:auto; background:#fff; border-radius:20px; box-shadow:0 30px 70px rgba(0,0,0,.3); animation:nhb-len .22s cubic-bezier(.22,.9,.3,1)}' +
    '@keyframes nhb-len{from{opacity:0; transform:translateY(10px) scale(.98)} to{opacity:1; transform:none}}' +
    '.nhb-dau{display:flex; align-items:center; gap:12px; padding:16px 18px 10px}' +
    '.nhb-dau .bieu{width:40px; height:40px; border-radius:12px; background:#FEF3C7; color:#D97706; display:grid; place-items:center; flex:none}' +
    '.nhb-dau .bieu.gv{background:#EEF4FF; color:#2B5FD0}' +
    '.nhb-dau .bieu svg{width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round}' +
    '.nhb-dau h3{margin:0; font-weight:900; font-size:16px; letter-spacing:.06em}' +
    '.nhb-dau small{display:block; color:#5F7370; font-size:12px; font-weight:600}' +
    '.nhb-dau .x{margin-left:auto; width:34px; height:34px; border-radius:10px; display:grid; place-items:center; color:#5F7370; font-size:16px}' +
    '.nhb-than{padding:4px 18px 16px}' +
    '.nhb-nhan{font-weight:800; font-size:11px; letter-spacing:.1em; color:#5F7370; margin:8px 0 6px; display:flex; justify-content:space-between}' +
    '.nhb-ds{display:flex; flex-wrap:wrap; gap:6px}' +
    '.nhb-ban{display:inline-flex; align-items:center; gap:6px; padding:3px 6px 3px 10px; border-radius:999px; background:#EEF4FF; border:1px solid #C7D7FE; font-weight:700; font-size:12.5px; color:#1E3A8A}' +
    '.nhb-ban button{width:18px; height:18px; border-radius:50%; color:#64748B; font-size:12px; line-height:1}' +
    '.nhb-ban.bo{opacity:.4; text-decoration:line-through}' +
    '.nhb-tin{margin-top:6px; border:1.5px solid #CFE5E0; border-radius:14px; background:#F8FCFB; padding:12px 14px; min-height:110px; font-size:14.5px; line-height:1.6; outline:none; white-space:pre-wrap; word-break:break-word}' +
    '.nhb-tin:focus{border-color:#0E7C6E; background:#fff}' +
    '.nhb-tin .tag{color:#2B5FD0; font-weight:800}' +
    '.nhb-phu{display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:8px; flex-wrap:wrap}' +
    '.nhb-doi{display:inline-flex; align-items:center; gap:6px; font-weight:800; font-size:12px; color:#0E7C6E; padding:6px 10px; border-radius:10px; background:#E3F1EE}' +
    '.nhb-doi svg{width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:2.3; stroke-linecap:round; stroke-linejoin:round}' +
    '.nhb-ghi{font-size:11.5px; color:#5F7370; font-weight:600}' +
    '.nhb-cuoi{display:flex; gap:10px; padding:12px 18px 16px; border-top:1px solid #E0EAE7}' +
    '.nhb-cuoi button{flex:1; padding:12px; border-radius:12px; font-weight:900; font-size:13px; letter-spacing:.06em}' +
    '.nhb-huy{background:#EEF2F6; color:#334155}' +
    '.nhb-cuoi .nhb-gui{background:#0E7C6E; color:#fff; display:inline-flex; align-items:center; justify-content:center; gap:8px}' +
    '.nhb-gui[disabled]{opacity:.6}' +
    '.nhb-gui svg{width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2.3; stroke-linecap:round; stroke-linejoin:round}';
  (function () { var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); })();

  /* NhacBan.mo(o) — o = {
       gv: true nếu thầy gửi (đổi tiêu đề + câu viết sẵn), so: số STAGE, sau: số STAGE kế (0 = chặng cuối),
       ban: [tên chưa xong], khoa: khoá giờ chờ, lop: chữ lớp hiện ở dòng ghi chú,
       gui: function(chu) → Promise (gửi MỘT tin), chan: function() → chuỗi lý do KHÔNG gửi (vd thầy xem như em) | '',
       bao: function(chu) (toast của trang), chuLoi: function(e) → chữ lỗi } */
  var DANG = null;
  function $(id) { return document.getElementById(id); }
  function dsMau() { return DANG.gv ? (DANG.sau ? MAU_GV : MAU_GV_CUOI) : MAU_HS.filter(function (m) { return DANG.sau || m.indexOf('{N}') < 0; }); }
  function mo(o) {
    if (!o.ban || !o.ban.length) { o.bao && o.bao(o.gv ? 'Các em đã xong hết rồi!' : 'Các bạn đã xong hết rồi!'); return; }
    var con = conCho(o.khoa);
    if (con > 0) { o.bao && o.bao((o.gv ? 'Thầy' : 'Em') + ' vừa nhắc rồi — ' + chuCho(con).toLowerCase() + '.'); return; }
    DANG = o;
    DANG.ds = o.ban.map(function (t) { return { ten: t, bat: true }; });
    DANG.mau = Math.floor(Math.random() * dsMau().length);   // mỗi người một câu khác
    var nen = $('nhbNen');
    if (!nen) {
      nen = document.createElement('div');
      nen.id = 'nhbNen'; nen.className = 'nhb-nen';
      nen.innerHTML = '<div class="nhb-pop" role="dialog" aria-modal="true">' +
        '<div class="nhb-dau"><span class="bieu" id="nhbBieu">' + IC + '</span><div><h3 id="nhbTen"></h3><small id="nhbPhu"></small></div><button type="button" class="x" id="nhbDong" aria-label="Đóng">✕</button></div>' +
        '<div class="nhb-than"><div class="nhb-nhan"><span id="nhbNhan"></span><span id="nhbSo"></span></div><div class="nhb-ds" id="nhbDs"></div>' +
          '<div class="nhb-nhan" style="margin-top:14px"><span>TIN NHẮN</span></div><div class="nhb-tin" id="nhbTin" contenteditable="true"></div>' +
          '<div class="nhb-phu"><button type="button" class="nhb-doi" id="nhbDoi"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>Đổi câu khác</button>' +
          '<span class="nhb-ghi" id="nhbGhi"></span></div></div>' +
        '<div class="nhb-cuoi"><button type="button" class="nhb-huy" id="nhbHuy">HỦY</button><button type="button" class="nhb-gui" id="nhbGui"><svg viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>GỬI VÀO NHÓM LỚP</button></div></div>';
      document.body.appendChild(nen);
      var dong = function () { nen.classList.remove('mo'); DANG = null; };
      $('nhbDong').onclick = dong; $('nhbHuy').onclick = dong;
      nen.addEventListener('click', function (e) { if (e.target === nen) dong(); });
      $('nhbDoi').onclick = function () { if (!DANG) return; DANG.mau = (DANG.mau + 1) % dsMau().length; veTin(); };
      $('nhbGui').onclick = gui;
    }
    $('nhbBieu').classList.toggle('gv', !!o.gv);
    $('nhbTen').textContent = o.gv ? 'NHẮC CẢ LỚP' : 'REMIND YOUR FRIENDS';
    $('nhbPhu').textContent = o.gv ? 'Nhắc các em chưa xong STAGE ' + o.so + ' · gửi dưới tên Thầy' : 'Nhắc các bạn chưa xong STAGE ' + o.so;
    $('nhbNhan').textContent = o.gv ? 'GẮN TÊN CÁC EM CHƯA XONG' : 'GẮN TÊN CÁC BẠN CHƯA XONG';
    $('nhbGhi').textContent = 'Gửi vào nhóm chat lớp ' + (o.lop || '') + ' · ' + (o.gv ? 'các em' : 'các bạn') + ' được @ sẽ nhận thông báo';
    $('nhbGui').disabled = false;
    veBan(); veTin();
    nen.classList.add('mo');
  }
  function veBan() {
    var ds = $('nhbDs');
    ds.innerHTML = DANG.ds.map(function (b, i) {
      return '<span class="nhb-ban' + (b.bat ? '' : ' bo') + '">' + anToan(b.ten) + '<button type="button" data-i="' + i + '" aria-label="' + (b.bat ? 'Bỏ' : 'Thêm') + '">' + (b.bat ? '✕' : '+') + '</button></span>';
    }).join('');
    $('nhbSo').textContent = DANG.ds.filter(function (b) { return b.bat; }).length + (DANG.gv ? ' em' : ' bạn');
    Array.prototype.forEach.call(ds.querySelectorAll('button'), function (n) {
      n.onclick = function () { var b = DANG.ds[+n.getAttribute('data-i')]; b.bat = !b.bat; veBan(); veTin(); };
    });
  }
  function veTin() {
    var tag = DANG.ds.filter(function (b) { return b.bat; }).map(function (b) { return '<span class="tag">@' + anToan(b.ten) + '</span>'; }).join(' ');
    $('nhbTin').innerHTML = anToan(dsMau()[DANG.mau]).replace(/\{T\}/g, tag || (DANG.gv ? 'các em' : 'các bạn'))
      .replace(/\{S\}/g, DANG.so).replace(/\{N\}/g, DANG.sau);
  }
  function gui() {
    if (!DANG) return;
    var o = DANG, bao = o.bao || function () {};
    var chu = String($('nhbTin').innerText || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();
    if (!chu) { bao('Tin nhắn đang trống.'); return; }
    var chan = o.chan ? o.chan() : '';
    if (chan) { bao(chan); return; }
    var nut = $('nhbGui'), tran = (window.AWChat && AWChat.TOI_DA_CHU) || 300;
    nut.disabled = true;
    var tin = chia(chu, tran), i = 0;
    var guiMot = function () { return i >= tin.length ? Promise.resolve() : Promise.resolve(o.gui(tin[i++])).then(guiMot); };
    guiMot().then(function () {
      try { localStorage.setItem(o.khoa, String(Date.now())); } catch (e) {}
      $('nhbNen').classList.remove('mo'); DANG = null;
      Array.prototype.forEach.call(document.querySelectorAll('.nut-remind[data-nhackhoa]'), function (n) {
        if (n.getAttribute('data-nhackhoa') !== o.khoa) return;
        n.classList.add('da'); n.classList.remove('rung'); n.title = chuCho(CACH_MS);
      });
      bao('Đã gửi vào nhóm lớp — ' + (o.gv ? 'các em' : 'các bạn') + ' được @ sẽ nhận thông báo');
    })['catch'](function (e) {
      nut.disabled = false;
      if (e === '__im') return;
      bao(o.chuLoi ? o.chuLoi(e) : 'Chưa gửi được, thử lại nhé.');
    });
  }

  window.NhacBan = { CACH_MS: CACH_MS, nutHtml: nutHtml, conCho: conCho, mo: mo, chia: chia };
})();
