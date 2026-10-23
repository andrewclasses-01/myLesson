/* hd-chup.js — HƯỚNG DẪN CHỤP ẢNH BÀI TRONG SÁCH (web v1.406.0, 23/10/2026, thầy "ok build" mẫu
   `D:\OTHERS\CLAUDE\myLesson - thiet ke nop sach\hd-chup\mau-v3.html`).
   5 slide (mỗi slide: tên mục + câu ngắn + ảnh SAI cạnh ảnh ĐÚNG; ảnh thật học sinh gửi Zalo, `assets/hd-chup/`).
   Hai chỗ dùng:
   1. `HdChup.ganNut(sec, dau)` — nút "HƯỚNG DẪN CHỤP ẢNH" (LUÔN GẬP) trên MỌI thẻ nộp ảnh sách (bai.html veTheNopSachKhoa).
   2. `HdChup.theBuoc(x, so, opt)` — thẻ của dòng bài tập loại `hdchup` (thầy thêm ở ⚙ THIẾT LẬP LESSON, hiện chỉ Lesson 1):
      em bấm "EM ĐÃ HIỂU" từng slide (chưa hiểu thì nút › khoá), đủ 5/5 ⇒ `opt.khiXong()` (bai.html ghi BT_TAY = xong bước).
      Đã xong ⇒ mọi slide đã tích, xem lại tự do. Tiến độ từng slide nhớ localStorage (`opt.khoaNho`). */
(function () {
  'use strict';
  var GOC = 'assets/hd-chup/';
  var MUC = [
    ['ĐỦ SÁNG, KHÔNG CÓ BÓNG ĐẬM', 'Có chút bóng mờ thì không sao, nhưng đừng để bóng tay, bóng điện thoại đè <b>đậm</b> lên trang. Ngồi chỗ sáng, đèn ở phía trước mặt.',
      [['sai', 'sai-bong.jpg', 'Bóng đè lên trang quá đậm'], ['sai', 'sai-toi.jpg', 'Quá tối, quá ám màu'], ['dung', 'dung-165.jpg', 'Sáng đều, rõ chữ']]],
    ['CHỤP THẲNG, TRANG ĐỂ DỌC', 'Cầm điện thoại song song với mặt sách, chụp từ trên xuống. Không chụp nghiêng, không xoay ngang.',
      [['sai', 'sai-nghieng.jpg', 'Chụp nghiêng, dính trang bên'], ['sai vua', 'sai-xoay.jpg', 'Xoay ngang'], ['dung', 'dung-171.jpg', 'Thẳng, trang dọc']]],
    ['TRỌN MỘT TRANG TRONG MỘT ẢNH', 'Thấy đủ đầu trang, cuối trang và số trang. Mỗi ảnh chỉ <b>một</b> trang.',
      [['sai vua', 'sai-thieu.jpg', 'Thiếu nửa dưới trang'], ['sai vua', 'sai-hai-trang.jpg', 'Hai trang trong một ảnh'], ['dung', 'dung-165.jpg', 'Trọn một trang']]],
    ['ĐƯA MÁY LẠI GẦN, KHÔNG ĐÈ TAY LÊN CHỮ', 'Trang sách chiếm gần hết khung ảnh. Tay chỉ giữ nhẹ ở mép ngoài, không đè lên chữ.',
      [['sai', 'sai-tay.jpg', 'Ngón tay đè nhiều vào sách, che mất chữ'], ['sai', 'sai-xa.jpg', 'Quá xa, lẫn nhiều nền'], ['dung', 'dung-171.jpg', 'Trang chiếm gần hết ảnh']]],
    ['ẢNH PHẢI THẬT NÉT', 'Ảnh <b>hơi mờ</b> dù vẫn đọc lờ mờ được cũng <b>KHÔNG ĐẠT</b>. Chạm vào màn hình chỗ trang sách để lấy nét, giữ yên tay 1 giây rồi mới chụp.',
      [['sai', 'sai-mo.jpg', 'Rung tay, nét mờ nhìn không rõ'], ['dung', 'dung-165.jpg', 'Nét, đọc rõ từng chữ']]]
  ];
  var IC_CAM = '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg>';

  var CSS = '' +
    '.hdc-nut{display:inline-flex;align-items:center;gap:6px;border:1.5px solid #F5C77E;background:#FFF7E8;color:#B45309;border-radius:999px;padding:6px 12px;font:800 11px var(--sans,Montserrat,sans-serif);letter-spacing:.04em;cursor:pointer;white-space:nowrap;flex:none}' +
    '.hdc-nut svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
    '.hdc-nut .mui{transition:transform .25s}.hdc-nut[aria-expanded=true] .mui{transform:rotate(180deg)}' +
    '.hdc-nut[aria-expanded=true]{background:#B45309;color:#fff;border-color:#B45309}' +
    '.hdc-gap{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s ease}.hdc-gap.mo{grid-template-rows:1fr}.hdc-gap>div{overflow:hidden;min-height:0}' +
    '.hdc-gap .sl{margin:0 16px 14px}' +
    '.sl{border:1.5px solid #F5DEB5;background:#FFFCF5;border-radius:14px;padding:12px 14px 10px}' +
    '.sl-dau{display:flex;align-items:center;gap:10px;margin-bottom:8px}' +
    '.sl-dau .so{flex:none;width:30px;height:30px;border-radius:50%;background:var(--accent,#0E7C6E);color:#fff;display:grid;place-items:center;font-weight:900}' +
    '.sl-trang.da .sl-dau .so{background:#16A34A}' +
    '.sl-dau>div>b{font-size:15px;font-weight:900;display:block}' +
    '.sl-dau p{margin:1px 0 0;font-size:13px;line-height:1.45;color:#33454E}.sl-dau p b{color:#DC2626}' +
    '.sl-dau .dem{margin-left:auto;flex:none;font:800 11px var(--sans,Montserrat,sans-serif);color:#9A5B00;background:#FFF1D6;border-radius:999px;padding:4px 10px}' +
    '.sl-khung{overflow:hidden}.sl-ray{display:flex;transition:transform .35s cubic-bezier(.22,.9,.3,1)}.sl-trang{flex:0 0 100%;min-width:0}' +
    '.sl-anh{display:flex;gap:10px;justify-content:center}' +
    '.hdc-mau{flex:1 1 0;max-width:230px;margin:0;position:relative;border-radius:12px;overflow:hidden;background:#E9EEEC;cursor:zoom-in;border:3px solid transparent}' +
    '.hdc-mau img{display:block;width:100%;aspect-ratio:3/4;object-fit:cover;object-position:top}' +
    '.hdc-mau.vua img,.hdc-mau.dung img{object-fit:contain}' +
    '.hdc-mau .the{position:absolute;left:8px;top:8px;border-radius:999px;padding:4px 10px;font:900 11px var(--sans,Montserrat,sans-serif);color:#fff}' +
    '.hdc-mau.dung{border-color:#16A34A}.hdc-mau.dung .the{background:#16A34A}' +
    '.hdc-mau.sai{border-color:#DC2626}.hdc-mau.sai .the{background:#DC2626}' +
    '.hdc-mau figcaption{position:absolute;left:0;right:0;bottom:0;padding:18px 10px 8px;background:linear-gradient(transparent,rgba(0,0,0,.72));color:#fff;font:700 12px/1.35 var(--sans,Montserrat,sans-serif)}' +
    '.sl-chan{display:flex;align-items:center;gap:10px;margin-top:10px}' +
    '.sl-mui{flex:none;width:38px;height:38px;border-radius:50%;border:1.5px solid #D5DEDB;background:#fff;color:#16232A;font:900 18px/1 var(--sans,Montserrat,sans-serif);cursor:pointer}' +
    '.sl-mui[disabled]{opacity:.35;cursor:default}' +
    '.sl-cham{flex:1;display:flex;justify-content:center;gap:7px}' +
    '.sl-cham i{width:9px;height:9px;border-radius:50%;background:#D5DEDB;cursor:pointer;transition:all .2s}' +
    '.sl-cham i.on{width:24px;border-radius:5px;background:var(--accent,#0E7C6E)}.sl-cham i.da{background:#16A34A}' +
    '.sl-giua{display:flex;justify-content:center;margin-top:10px}' +
    '.sl-meo{margin-top:8px;font-size:12px;color:#55666F;text-align:center}.sl-meo b{color:var(--accent,#0E7C6E)}' +
    '.hdc-the .sl{margin:4px 16px 16px}' +
    '.hdc-tien{margin-left:auto;text-align:right;flex:none}.hdc-tien b{display:block;font-size:18px;font-weight:900;color:var(--accent,#0E7C6E)}' +
    '.hdc-tien span{font-size:9.5px;font-weight:800;letter-spacing:.06em;color:#5F7370}' +
    '.hdc-phong{position:fixed;inset:0;background:rgba(10,20,25,.85);display:grid;place-items:center;z-index:2147483000;padding:16px}' +
    '.hdc-phong img{max-width:100%;max-height:86vh;border-radius:10px;display:block;margin:0 auto}.hdc-phong p{color:#fff;font:800 14px var(--sans,Montserrat,sans-serif);text-align:center;margin:10px 0 0}' +
    '@media (max-width:640px){.sl-anh{gap:6px}.hdc-mau img{max-height:220px}.sl-dau>div>b{font-size:14px}.hdc-mau figcaption{font-size:10.5px;padding:14px 6px 6px}}';
  var daCss = false;
  function napCss() {
    if (daCss) return; daCss = true;
    var st = document.createElement('style'); st.id = 'hdChupCss'; st.textContent = CSS; document.head.appendChild(st);
  }
  function anh(k) {
    var d = k[0].indexOf('dung') >= 0;
    return '<figure class="hdc-mau ' + k[0] + '"><img loading="lazy" src="' + GOC + k[1] + '" alt=""><span class="the">' + (d ? '✓ ĐÚNG' : '✕ SAI') + '</span><figcaption>' + k[2] + '</figcaption></figure>';
  }
  function phong(f) {
    var nen = document.createElement('div');
    nen.className = 'hdc-phong';
    nen.innerHTML = '<div><img alt="" src="' + f.querySelector('img').getAttribute('src') + '"><p></p></div>';
    nen.querySelector('p').textContent = f.querySelector('.the').textContent + ' · ' + f.querySelector('figcaption').textContent;
    nen.onclick = function () { nen.remove(); };
    document.body.appendChild(nen);
  }
  // Dựng bộ slide trong `hop`. opt.batBuoc = bấm EM ĐÃ HIỂU từng slide · opt.da = mảng 5 boolean ban đầu · opt.khiDoi(da)
  function dungSlide(hop, opt) {
    napCss();
    opt = opt || {};
    var i = 0, da = MUC.map(function (m, k) { return !!(opt.da && opt.da[k]); });
    hop.innerHTML = '<div class="sl"><div class="sl-khung"><div class="sl-ray">' + MUC.map(function (m, k) {
      return '<div class="sl-trang" data-k="' + k + '"><div class="sl-dau"><span class="so">' + (k + 1) + '</span><div><b>' + m[0] + '</b><p>' + m[1] + '</p></div>' +
        '<span class="dem">' + (k + 1) + ' / ' + MUC.length + '</span></div><div class="sl-anh">' + m[2].map(anh).join('') + '</div>' +
        (opt.batBuoc ? '<div class="sl-giua"><button type="button" class="nut-tich">EM ĐÃ HIỂU<span class="v">✓</span></button></div>' : '') + '</div>';
    }).join('') + '</div></div><div class="sl-chan"><button type="button" class="sl-mui truoc" aria-label="Mục trước">‹</button><div class="sl-cham">' +
      MUC.map(function () { return '<i></i>'; }).join('') + '</div><button type="button" class="sl-mui sau" aria-label="Mục sau">›</button></div>' +
      (opt.batBuoc ? '' : '<div class="sl-meo">💡 <b>Mẹo:</b> chụp xong <b>xem lại ảnh</b> có đọc rõ từng chữ chưa rồi mới bấm NỘP BÀI.</div>') + '</div>';
    var ray = hop.querySelector('.sl-ray'), cham = hop.querySelectorAll('.sl-cham i');
    var truoc = hop.querySelector('.truoc'), sau = hop.querySelector('.sau');
    function moDuoc(k) { if (!opt.batBuoc) return true; for (var j = 0; j < k; j++) if (!da[j]) return false; return true; }
    function ve() {
      ray.style.transform = 'translateX(' + (-100 * i) + '%)';
      Array.prototype.forEach.call(cham, function (c, k) { c.classList.toggle('on', k === i); c.classList.toggle('da', da[k]); });
      truoc.disabled = i === 0; sau.disabled = i === MUC.length - 1 || !moDuoc(i + 1);
      Array.prototype.forEach.call(hop.querySelectorAll('.sl-trang'), function (t, k) {
        t.classList.toggle('da', da[k]); var n = t.querySelector('.nut-tich'); if (n) n.classList.toggle('da', da[k]);
      });
    }
    function den(k) { if (k < 0 || k >= MUC.length || !moDuoc(k)) return; i = k; ve(); }
    truoc.onclick = function (e) { e.stopPropagation(); den(i - 1); };
    sau.onclick = function (e) { e.stopPropagation(); den(i + 1); };
    Array.prototype.forEach.call(cham, function (c, k) { c.onclick = function (e) { e.stopPropagation(); den(k); }; });
    Array.prototype.forEach.call(hop.querySelectorAll('.nut-tich'), function (n, k) {
      n.onclick = function (e) {
        e.stopPropagation();
        if (opt.khoa && opt.khoa()) { da[k] = true; ve(); if (k < MUC.length - 1) setTimeout(function () { den(k + 1); }, 450); return; }   // đã xong bước: chỉ xem lại
        da[k] = !da[k]; ve();
        if (opt.khiDoi) opt.khiDoi(da.slice());
        if (da[k] && k < MUC.length - 1) setTimeout(function () { den(k + 1); }, 450);
      };
    });
    hop.addEventListener('click', function (e) { var f = e.target.closest('.hdc-mau'); if (f) { e.stopPropagation(); phong(f); } });
    var x0 = null, khung = hop.querySelector('.sl-khung');
    khung.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    khung.addEventListener('touchend', function (e) {
      if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) den(i + (dx < 0 ? 1 : -1)); x0 = null;
    });
    // mở vào slide chưa hiểu đầu tiên (bước bắt buộc)
    if (opt.batBuoc) { var k0 = da.indexOf(false); i = k0 < 0 ? 0 : k0; }
    ve();
  }

  // 1. Nút LUÔN GẬP trên thẻ nộp ảnh sách: `dau` = hàng đầu thẻ (nút chèn trước ô đếm), slide chèn ngay sau hàng đầu.
  function ganNut(sec, dau) {
    if (!sec || !dau || sec.querySelector('.hdc-nut')) return;
    napCss();
    var nut = document.createElement('button');
    nut.type = 'button'; nut.className = 'hdc-nut'; nut.setAttribute('aria-expanded', 'false');
    nut.innerHTML = IC_CAM + 'HƯỚNG DẪN CHỤP ẢNH<svg class="mui" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
    var dem = dau.querySelector('.ns-dem');
    if (dem) dau.insertBefore(nut, dem); else dau.appendChild(nut);
    var gap = document.createElement('div');
    gap.className = 'hdc-gap';
    gap.innerHTML = '<div><div class="hdc-hop"></div></div>';
    dau.insertAdjacentElement('afterend', gap);
    var dung = false;
    nut.onclick = function (e) {
      e.stopPropagation();
      if (!dung) { dungSlide(gap.querySelector('.hdc-hop'), {}); dung = true; }   // dựng lúc mở lần đầu (ảnh chưa tải khi còn gập)
      var mo = gap.classList.toggle('mo');
      nut.setAttribute('aria-expanded', mo ? 'true' : 'false');
    };
  }

  // 2. Thẻ của dòng `hdchup`. opt: { daXong: bool, khoaNho: 'khoá localStorage', khiXong: fn, nhan: 'tiêu đề' }
  function theBuoc(x, so, opt) {
    napCss();
    opt = opt || {};
    var nho = [];
    try { nho = JSON.parse(localStorage.getItem(opt.khoaNho) || '[]') || []; } catch (e) { nho = []; }
    var da = MUC.map(function (m, k) { return !!opt.daXong || !!nho[k]; });
    var sec = document.createElement('section');
    sec.className = 'card hdc-the';
    sec.setAttribute('data-btid', x.id);
    sec.innerHTML = '<div class="card-head"><span class="step sach">' + IC_CAM + '</span>' +
      '<div class="ch-chu"><h2></h2><div class="ch-ma">XEM TỪNG MỤC · BẤM <b style="color:#E8590C">"EM ĐÃ HIỂU"</b> ĐỦ 5 MỤC ĐỂ MỞ BÀI SÁCH</div></div>' +
      '<div class="hdc-tien"><b>0/5</b><span>MỤC ĐÃ HIỂU</span></div></div><div class="hdc-sl"></div>';
    sec.querySelector('h2').textContent = opt.nhan || x.tieuDe || 'HƯỚNG DẪN CHỤP ẢNH BÀI TRONG SÁCH';
    var dem = sec.querySelector('.hdc-tien b');
    var veDem = function (d) { dem.textContent = d.filter(Boolean).length + '/' + MUC.length; };
    veDem(da);
    dungSlide(sec.querySelector('.hdc-sl'), {
      batBuoc: true, da: da,
      khoa: function () { return !!opt.daXong; },
      khiDoi: function (d) {
        veDem(d);
        try { localStorage.setItem(opt.khoaNho, JSON.stringify(d)); } catch (e) { /* không nhớ được thì thôi */ }
        if (d.every(Boolean) && opt.khiXong) setTimeout(opt.khiXong, 600);
      }
    });
    return sec;
  }

  window.HdChup = { ganNut: ganNut, theBuoc: theBuoc, soMuc: MUC.length };
})();
