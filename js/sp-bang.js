/* ═══════════════════════════════════════════════════════════════════════════════════════
   sp-bang.js — KHUNG "AI CÒN VIỆC" + BẢNG CHỐT TOÀN MÀN HÌNH của trang chi tiết SP CHECK
   (myLesson web v1.66.0, 05/09/2026 — thầy chốt qua bản mẫu `mau-web/mau-ai-con-viec-05-09-2026.html`)

   VIỆC CỦA FILE NÀY
   ① Khung AI CÒN VIỆC (giữa "Tổng quan đội" và "Chọn đội"): mọi đội của buổi, mỗi em hai số chính
      CHƯA PHẢN BIỆN / CHƯA PHẢN HỒI + hai số phụ đã bắt / bị bắt; đội có thêm CỤM HOÀ PHIẾU.
      ⭐ MỘT HÀM ĐẾM DUY NHẤT (`dem()`) nuôi cả khung này lẫn dải đen trên bảng chốt.
   ② Nút XỬ LÝ → pop-up tích đội → BẢNG CHỐT toàn màn hình: mỗi đội một cột, học sinh lên bảng
      tự bấm Agree/Disagree · Keep/Accept · bỏ phiếu cụm · gộp cụm (KIỂM TRA TRÙNG). Bảng GHI KHO
      THAY MẶT EM, đúng khuôn tài liệu web học sinh mySpeaking đang ghi (xem `ghi*` bên dưới).
   ③ Nghe kho sống (onSnapshot 4 ngăn của buổi) — CHỈ khi bảng đang mở, đóng bảng là huỷ.
      ⛔ LUẬT 8️⃣ (BAN GIAO): trang này chỉ THẦY mở, vài lượt/ngày, nên mới được phép đọc thêm
      `cum`/`cumPhieu` lúc mở trang và nghe 4 ngăn khi mở bảng. ĐỪNG đem hai phép đó sang
      dashboard.html / lop.html (156 em × 2-3 lượt/ngày là cạn hạn mức).
   ④ Bàn phím ảo trong từng cột (chép khuôn myActivity `keyboard.js`: 4 hàng, caps hoa MỘT chữ,
      numbers, ENG|VI telex) — ô lý do đặt `inputmode="none"` nên bàn phím Windows không bật.

   LUẬT NGHIỆP VỤ — KHÔNG CHÉP THÊM BẢN NÀO: bộ ba `tenBang` / `chinhChuDaNhan` / `tranhChap` +
   `choNguoiChamTraLoi` do sp-chitiet.html truyền vào qua `ctx.luat` (bản chép thứ 4 đã là quá
   nhiều — xem BAN GIAO mục 0👤 B.1). Đếm "chưa phản biện" theo cách của `lop.html spDemViec`:
   bỏ câu 'an' và 'go', chính chủ chưa có phiếu nào.

   KHUÔN TÀI LIỆU GHI LÊN KHO (phải khớp luật Firestore đã dán — thiếu/thừa trường là 403):
     phanHoi/{errId__slugHs(em)}   {errId, chuLoi, voter, voterTeam, y:'dongY'|'phanDoi', lyDo, luc}
     tongLoi/{slug em chấm}        chỉ PATCH `errors` + `capNhatLuc` (updateMask) — LUẬT 9️⃣
     cum/{id}                      {doiBiCham, ids[], ten, ai[], daGui:true, luc}  (đủ 6 trường)
     cumPhieu/{cumId__slugHs(em)}  {cumId, voter, voterTeam, y:'gop'|'khong'|'', luc}
   ⛔ `slugHs` phải Y HỆT `mySpeaking/web/js/app.js slugAvatar` — khác một ký tự là phiếu của em
      thành HAI tài liệu (một do em ghi, một do bảng ghi) và đếm gấp đôi.
   ⛔ Kết luận Keep/Accept ghi `suaLuc = Date.now()` lên lỗi: `gopLoi` bên web học sinh lấy bản
      có `suaLuc` mới hơn, không ghi mốc là máy em ghi đè lại quyết định trên bảng.
   ═══════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ctx = null, A = null;
  var ST = { mo: false, cot: [], nghe: [], yt: {}, ytSan: false, ytCho: [], nhip: null,
    luu: { dang: 0, luc: 0, loi: '' }, henVe: null };

  var IC_TICK = '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';
  var IC_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  var IC_PAUSE = '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
  var IC_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var IC_GUI = '<svg viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>';
  var IC_XN = '<svg class="sic" viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>';
  var IC_KT = '<svg class="sic" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/><path d="M11 7h4a2 2 0 0 1 2 2v4"/></svg>';
  var NHAN_LOAI = { Grammar: 'g', Pronunciation: 'p', Information: 'i' };
  var CHU_LOAI = { Grammar: 'GRAMMAR', Pronunciation: 'PRONUNCIATION', Information: 'INFORMATION' };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return A.chuAnToan(s); }
  function L() { return ctx.lay(); }
  function song(er) { return !er.trangThai || er.trangThai === 'song'; }
  function tSec(er) { return (parseInt(er.min, 10) || 0) * 60 + (parseInt(er.sec, 10) || 0); }
  function fmtGio(er) { return String(er.min || 0).padStart(2, '0') + ':' + String(er.sec || 0).padStart(2, '0'); }
  function fmtClock(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function soCls(n) { return n ? 'nx' : 'n0'; }
  function nhan(t) { return '<span class="nhan ' + (NHAN_LOAI[t] || '') + '">' + esc(CHU_LOAI[t] || t || '?') + '</span>'; }
  function vietTat(ten) {
    var w = String(ten || '').trim().split(/\s+/).filter(Boolean);
    if (w.length <= 1) return ten;
    return w.slice(0, -1).map(function (x) { return x.charAt(0); }).join('.') + '.' + w[w.length - 1];
  }
  // ⛔ Y HỆT `mySpeaking/web/js/app.js` khongDauTen + slugAvatar (mã tài liệu phiếu bám theo đây)
  function slugHs(s) {
    var t = String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    return t.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'hs';
  }
  function tenBang(a, b) { return ctx.luat.tenBang(a, b); }
  function luc() { return Date.now(); }
  function gioHienTai() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  /* Avatar — cùng dấu `data-av-em`/`data-av-lop` với thanh đội để `A.batAvatarKho()` đè ảnh mới
     nhất từ kho `lessonAvatar` (MutationObserver của nó bắt được cả ô vẽ sau). */
  function avHtml(ten, cls) {
    var tenDay = A.avTenDayDu(ten, ctx.dsEm || []);
    return '<span class="' + cls + '" data-av-em="' + esc(tenDay) + '" data-av-lop="' + esc(ctx.lopGoc) + '" title="' + esc(ten) + '">' +
      '<img class="av-anh" src="' + esc(A.avUrl(ctx.lopGoc, tenDay)) + '" alt="" onerror="this.remove()">' + esc(ctx.avtChu(ten)) + '</span>';
  }

  /* ═══ FIRESTORE REST (cùng khuôn `fsPatch`/`fsGet` bên web học sinh) ═══ */
  function fsGoc() { return 'https://firestore.googleapis.com/v1/projects/' + ctx.db.projectId + '/databases/(default)/documents'; }
  function fsKey() { return '?key=' + encodeURIComponent(ctx.db.apiKey); }
  function fsMa(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(fsMa) } };
    var f = {}; Object.keys(v).forEach(function (k) { f[k] = fsMa(v[k]); });
    return { mapValue: { fields: f } };
  }
  function fsGiai(f) {
    if (!f || typeof f !== 'object') return null;
    if ('stringValue' in f) return f.stringValue;
    if ('integerValue' in f) return parseInt(f.integerValue, 10);
    if ('doubleValue' in f) return f.doubleValue;
    if ('booleanValue' in f) return f.booleanValue;
    if ('arrayValue' in f) return ((f.arrayValue && f.arrayValue.values) || []).map(fsGiai);
    if ('mapValue' in f) { var o = {}, fs = (f.mapValue && f.mapValue.fields) || {}; for (var k in fs) o[k] = fsGiai(fs[k]); return o; }
    return null;
  }
  function fsGiaiDoc(doc) {
    var o = {}, fs = (doc && doc.fields) || {};
    for (var k in fs) o[k] = fsGiai(fs[k]);
    if (doc && doc.name) o._id = String(doc.name).split('/').pop();
    return o;
  }
  function duongBuoi(ngan, id) { return '/spBuoi/' + encodeURIComponent(ctx.buoiId) + '/' + ngan + '/' + encodeURIComponent(id); }
  function fsGet(duong) {
    return fetch(fsGoc() + duong + fsKey(), { cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('FS_' + r.status);
      return r.json().then(fsGiaiDoc);
    });
  }
  function fsPatch(duong, data, mask) {
    var fields = {}; Object.keys(data).forEach(function (k) { fields[k] = fsMa(data[k]); });
    var q = fsKey(); (mask || []).forEach(function (f) { q += '&updateMask.fieldPaths=' + encodeURIComponent(f); });
    return fetch(fsGoc() + duong + q, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fields }) })
      .then(function (r) {
        if (r.ok) return true;
        return r.json().then(function (j) { throw new Error((j.error && j.error.message) || ('FS_' + r.status)); },
          function () { throw new Error('FS_' + r.status); });
      });
  }

  /* ═══ DỮ LIỆU SUY TỪ KHO ═══ */
  function doiCua() {
    return (ctx.teams || []).map(function (t) {
      return { n: t.team, ten: 'TEAM ' + t.team, tv: (t.members || []).slice(), video: String(t.video || '') };
    }).sort(function (a, b) { return a.n - b.n; });
  }
  function doiTheoTen(ten) { return doiCua().filter(function (d) { return d.ten === ten; })[0] || null; }
  // Mọi câu chấm của buổi (bỏ 'an' = em chấm tự xoá) — kèm `slug` = mã tài liệu tongLoi để còn ghi ngược
  function gomCham() {
    var ds = [];
    (L().tongLoi || []).forEach(function (d) {
      (d.errors || []).forEach(function (er) {
        if (er.trangThai === 'an') return;
        ds.push({ chuLoi: d.student || '?', doiCham: d.myTeam || '', doiBiCham: d.checkedTeam || '', err: er, slug: d._id || slugHs(d.student) });
      });
    });
    return ds;
  }
  function phTheoErr() {
    var m = {};
    (L().phanHoi || []).forEach(function (p) { (m[p.errId] = m[p.errId] || []).push(p); });
    return m;
  }
  // Đội này đi CHẤM đội nào — đọc từ chính bản chấm (`myTeam` → `checkedTeam`), không đoán vòng tròn
  function chamDoi(tenDoi) {
    var dem = {};
    (L().tongLoi || []).forEach(function (d) { if (d.myTeam === tenDoi && d.checkedTeam) dem[d.checkedTeam] = (dem[d.checkedTeam] || 0) + 1; });
    var best = '', max = 0;
    Object.keys(dem).forEach(function (k) { if (dem[k] > max) { max = dem[k]; best = k; } });
    return best;
  }
  function phieuCum() {
    var m = {};
    (L().cumPhieu || []).forEach(function (p) {
      if (!p.y || !p.cumId) return;
      var d = m[p.cumId] || (m[p.cumId] = { gop: [], khong: [] });
      if (p.y === 'gop') d.gop.push(p.voter); else if (p.y === 'khong') d.khong.push(p.voter);
    });
    return m;
  }
  // ⛔ BẢN CHÉP LIÊN KHO của `mySpeaking app.js trKetQuaCum` + `lop.html spDemTrung`: hoà (kể cả 0–0) = CẦN BỎ PHIẾU
  function ketQuaCum(c, pc) {
    var d = (pc || phieuCum())[c._id] || { gop: [], khong: [] };
    return d.gop.length > d.khong.length ? 'gop' : d.khong.length > d.gop.length ? 'khong' : 'hoa';
  }
  function cumSong(c) { return !!c.daGui && (c.ids || []).length > 1; }
  function cumCua(tenDoiBiCham) {
    return (L().cum || []).filter(function (c) { return c.doiBiCham === tenDoiBiCham && cumSong(c); })
      .sort(function (a, b) { return (a.luc || 0) - (b.luc || 0); });
  }
  function pbCua(em, CH, PH) {
    return CH.filter(function (x) {
      if (!song(x.err) || !tenBang(x.err.who, em)) return false;
      return !(PH[x.err.id] || []).some(function (p) { return tenBang(p.voter, em); });
    });
  }
  function phCua(em, CH) {
    return CH.filter(function (x) { return tenBang(x.chuLoi, em) && ctx.luat.choNguoiChamTraLoi(x); });
  }

  /* ⭐ HÀM ĐẾM DUY NHẤT — nuôi khung ngoài trang, dải đen trên bảng, pop-up chọn đội, dải thành viên. */
  function dem() {
    var CH = gomCham(), PH = phTheoErr(), pc = phieuCum();
    var tong = { pb: 0, ph: 0, cum: 0 };
    var doi = doiCua().map(function (t) {
      var hs = t.tv.map(function (em) {
        var pb = pbCua(em, CH, PH).length, ph = phCua(em, CH).length;
        var bat = 0, bi = 0;
        // ⭐ v1.67.0 — đã bắt / bị bắt CHỈ đếm lỗi còn hiệu lực (cùng thước với thanh tổng quan + thẻ đội)
        CH.forEach(function (x) { if (!song(x.err)) return; if (tenBang(x.chuLoi, em)) bat++; if (tenBang(x.err.who, em)) bi++; });
        return { ten: em, pb: pb, ph: ph, bat: bat, bi: bi, xong: !pb && !ph };
      });
      var cham = chamDoi(t.ten);
      var cumHoa = cham ? cumCua(cham).filter(function (c) { return ketQuaCum(c, pc) === 'hoa'; }).length : 0;
      var d = { n: t.n, ten: t.ten, tv: t.tv, video: t.video, cham: cham, hs: hs,
        pb: hs.reduce(function (s, h) { return s + h.pb; }, 0),
        ph: hs.reduce(function (s, h) { return s + h.ph; }, 0), cum: cumHoa };
      d.xong = !d.pb && !d.ph && !d.cum;
      tong.pb += d.pb; tong.ph += d.ph; tong.cum += d.cum;
      return d;
    });
    return { doi: doi, tong: tong, sanSang: doi.filter(function (d) { return d.xong; }).length };
  }

  /* ═══ ① KHUNG AI CÒN VIỆC (ngoài trang) ═══ */
  function veAcv() {
    var tong = $('acvTong'), luoi = $('acvLuoi');
    if (!tong || !luoi) return;
    if (!ctx || !ctx.buoiId) { tong.innerHTML = ''; luoi.innerHTML = ''; return; }
    var D = dem();
    tong.innerHTML =
      '<span class="chip ' + (D.tong.pb ? 'do' : 'la') + '">PHẢN BIỆN <b>' + D.tong.pb + '</b></span>' +
      '<span class="chip ' + (D.tong.ph ? 'do' : 'la') + '">PHẢN HỒI <b>' + D.tong.ph + '</b></span>' +
      '<span class="chip ' + (D.tong.cum ? 'cam' : 'la') + '">CỤM HOÀ <b>' + D.tong.cum + '</b></span>' +
      '<span class="chip ' + (D.sanSang === D.doi.length && D.doi.length ? 'la' : '') + '">SẴN SÀNG <b>' + D.sanSang + '/' + D.doi.length + '</b></span>';
    luoi.innerHTML = D.doi.map(function (d) {
      return '<div class="acv-doi' + (d.xong ? ' xong' : '') + '">' +
        '<div class="acv-dau"><span class="acv-cham"></span><span class="acv-ten">' + esc(d.ten) + '</span><div class="day"></div><span class="acv-sn">' + IC_TICK + ' Sẵn sàng</span></div>' +
        '<div class="acv-3so"><div><div class="nh">Chưa phản biện</div><div class="so ' + soCls(d.pb) + '">' + d.pb + '</div></div>' +
          '<div><div class="nh">Chưa phản hồi</div><div class="so ' + soCls(d.ph) + '">' + d.ph + '</div></div>' +
          '<div><div class="nh">Cụm hoà phiếu</div><div class="so ' + soCls(d.cum) + '">' + d.cum + '</div></div></div>' +
        '<div>' + d.hs.map(function (h) {
          return '<div class="hs-dong' + (h.xong ? ' xong' : '') + '">' + avHtml(h.ten, 'hs-av') +
            '<span class="hs-ten"><b>' + esc(h.ten) + '</b><small>đã bắt ' + h.bat + ' · bị bắt ' + h.bi + '</small></span>' +
            '<span class="hs-so"><span class="hs-o"><div class="nh">Phản biện</div><div class="so ' + soCls(h.pb) + '">' + h.pb + '</div></span>' +
            '<span class="hs-o"><div class="nh">Phản hồi</div><div class="so ' + soCls(h.ph) + '">' + h.ph + '</div></span></span>' +
            '<span class="hs-tick">' + IC_TICK + '</span></div>';
        }).join('') + '</div></div>';
    }).join('') || '<div class="trong">Buổi chưa chia đội nào.</div>';
  }

  /* ═══ POP-UP CHỌN ĐỘI ═══ */
  function moPop() {
    var D = dem();
    $('popDs').innerHTML = D.doi.map(function (d) {
      var n = d.pb + d.ph + d.cum;
      return '<label class="chon-doi"><input type="checkbox" value="' + d.n + '"' + (n ? ' checked' : '') + '>' +
        '<span><b>' + esc(d.ten) + '</b><small>' + esc(d.tv.join(' • ')) + '</small></span>' +
        '<span class="viec ' + soCls(n) + '">' + (n ? n + ' việc' : 'đã xong') + '</span></label>';
    }).join('');
    capNhatNutMo();
    $('popNen').hidden = false;
  }
  function capNhatNutMo() {
    var n = $('popNen').querySelectorAll('input:checked').length;
    var b = $('popMo'); b.textContent = 'MỞ BẢNG · ' + n + ' đội'; b.disabled = !n;
  }

  /* ═══ ② BẢNG CHỐT ═══ */
  function cotCua(n) { return ST.cot.filter(function (c) { return c.n === n; })[0]; }
  function moBang(ds) {
    var D = dem();
    ST.cot = ds.map(function (n) {
      var d = D.doi.filter(function (x) { return x.n === n; })[0];
      var em = d.hs.filter(function (h) { return !h.xong; })[0];
      return { n: n, ten: d.ten, tv: d.tv, video: d.video, cham: d.cham,
        tab: em ? em.ten : (d.cum ? 'xn' : 'kt'), phu: '', emCuoi: em ? em.ten : d.tv[0] || '',
        kb: { caps: false, num: false, vi: false, tho: '', wStart: 0, cardId: '' },
        nhap: {}, tich: {}, chonPhieu: null, chonCum: false, goiY: {}, nhom: {}, goiYKhoa: '', vid: '', ytSan: false };
    });
    ST.mo = true;
    $('bang').hidden = false; document.body.style.overflow = 'hidden';
    $('bdTieuPhu').textContent = ctx.tenLop + ' · ' + (ctx.tenBai || 'Speaking check');
    $('bangCot').innerHTML = ST.cot.map(veCot).join('');
    ST.cot.forEach(function (c) { veCotRuot(c); veKbd(c); });
    veDai();
    veLuu();
    napYT();
    ST.nhip = setInterval(nhipPlayer, 400);
    batLive();
  }
  function dongBang() {
    ST.mo = false;
    $('bang').hidden = true; document.body.style.overflow = '';
    clearInterval(ST.nhip); ST.nhip = null;
    tatLive();
    Object.keys(ST.yt).forEach(function (n) { try { ST.yt[n].destroy(); } catch (e) {} });
    ST.yt = {}; ST.ytCho = [];
    $('bangCot').innerHTML = '';
    ctx.veTrang();
    veAcv();
  }

  function veDai(nhayN) {
    var D = dem();
    $('bdChips').innerHTML = D.doi.map(function (d) {
      return '<div class="bd-doi' + (d.xong ? ' xong' : '') + (d.n === nhayN ? ' nhay' : '') + '"><span class="ten">' + esc(d.ten) + '</span>' +
        '<span class="bd-avs">' + d.hs.map(function (h) {
          return avHtml(h.ten, 'bd-av' + (h.xong ? ' xong' : '')).replace('</span>', '<i>' + (h.pb + h.ph) + '</i></span>');
        }).join('') + '</span>' +
        '<span class="bd-3"><span>PB <b class="' + soCls(d.pb) + '">' + d.pb + '</b></span><span>PH <b class="' + soCls(d.ph) + '">' + d.ph + '</b></span><span>HOÀ <b class="' + soCls(d.cum) + '">' + d.cum + '</b></span></span></div>';
    }).join('');
    $('bdGio').textContent = gioHienTai();
  }
  function veLuu() {
    var el = $('bdLuu'); if (!el) return;
    if (ST.luu.loi) { el.className = 'bd-luu loi'; el.textContent = 'Chưa lưu được — ' + ST.luu.loi; return; }
    if (ST.luu.dang) { el.className = 'bd-luu dang'; el.textContent = 'Đang lưu…'; return; }
    el.className = 'bd-luu'; el.textContent = ST.luu.luc ? 'Đã lưu ' + gioHienTai() : '';
  }

  function veCot(c) {
    return '<div class="cot" id="cot' + c.n + '">' +
      '<div class="cot-dau"><span class="cot-ten">' + esc(c.ten) + '</span><span class="cot-tv">' + esc(c.tv.join(' • ')) + '</span><div class="day"></div><span class="cot-sn">' + IC_TICK + ' SẴN SÀNG</span></div>' +
      '<div class="player" id="pl' + c.n + '">' +
        '<button class="pl-b" data-nhich="-5" title="Lùi 5 giây"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></button>' +
        '<button class="pl-b pl-play" data-play title="Phát / Dừng">' + IC_PLAY + '</button>' +
        '<button class="pl-b" data-nhich="5" title="Tiến 5 giây"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg></button>' +
        '<span class="pl-gio" data-cur>0:00</span><input class="pl-seek" type="range" min="0" max="1000" value="0" data-seek><span class="pl-gio mo" data-dur>0:00</span>' +
        '<span class="pl-doi" data-pldoi></span><div class="pl-yt"><div id="yt' + c.n + '"></div></div></div>' +
      '<div class="dai-hang" id="dai' + c.n + '"></div><div class="phu-tab" id="phu' + c.n + '"></div>' +
      '<div class="ruot" id="ruot' + c.n + '"></div><div class="kbd" id="kbd' + c.n + '"></div></div>';
  }

  function veCotRuot(c) {
    var D = dem(), d = D.doi.filter(function (x) { return x.n === c.n; })[0];
    if (!d) return;
    c.cham = d.cham;
    var laEm = c.tv.indexOf(c.tab) >= 0;
    if (laEm) c.emCuoi = c.tab;
    // dải thành viên + dải việc chung
    $('dai' + c.n).innerHTML =
      '<div class="dai tv">' + d.hs.map(function (h) {
        return '<button class="seg' + (c.tab === h.ten ? ' chon' : '') + (h.xong ? ' xong' : '') + '" data-tab="' + esc(h.ten) + '" title="' + esc(h.ten) + '">' +
          avHtml(h.ten, 'sav') + esc(vietTat(h.ten)) + '<span class="dem">' + (h.pb + h.ph) + '</span>' + IC_TICK.replace('<svg', '<svg class="tick"') + '</button>';
      }).join('') + '</div>' +
      '<div class="dai doi">' +
        '<button class="seg' + (c.tab === 'xn' ? ' chon' : '') + (d.cum ? '' : ' xong') + '" data-tab="xn">' + IC_XN + 'XÁC NHẬN TRÙNG<span class="dem">' + d.cum + '</span>' + IC_TICK.replace('<svg', '<svg class="tick"') + '</button>' +
        '<button class="seg' + (c.tab === 'kt' ? ' chon' : '') + '" data-tab="kt">' + IC_KT + 'KIỂM TRA TRÙNG</button>' +
      '</div>';
    $('cot' + c.n).classList.toggle('xong', d.xong);
    // nút phụ + ruột
    var CH = gomCham(), PH = phTheoErr();
    var p = $('phu' + c.n), r = $('ruot' + c.n);
    var cuon = r.scrollTop;
    if (c.tab === 'xn') {
      p.hidden = true; p.innerHTML = '';
      r.innerHTML = veXn(c, CH);
    } else if (c.tab === 'kt') {
      if (c.phu !== 'all' && c.phu !== 'gr') c.phu = 'all';
      var rows = ktRows(c, CH), conLai = ktConLai(c, rows), cum = cumCua(c.ten);
      p.hidden = false;
      p.innerHTML = '<button class="pt' + (c.phu === 'all' ? ' chon' : '') + '" data-phu="all">ALL MISTAKES <b>' + conLai.length + '</b></button>' +
        '<button class="pt' + (c.phu === 'gr' ? ' chon' : '') + '" data-phu="gr">GROUPS <b>' + cum.length + '</b></button>';
      r.innerHTML = c.phu === 'all' ? veKtAll(c, rows, conLai, cum) : veKtGr(c, rows, cum);
      chayGoiY(c, conLai);
    } else {
      var pb = pbCua(c.tab, CH, PH), ph = phCua(c.tab, CH);
      if (c.phu !== 'pb' && c.phu !== 'ph') c.phu = pb.length || !ph.length ? 'pb' : 'ph';
      p.hidden = false;
      p.innerHTML = '<button class="pt' + (c.phu === 'pb' ? ' chon' : '') + (pb.length ? '' : ' n0') + '" data-phu="pb">PHẢN BIỆN <b>' + pb.length + '</b></button>' +
        '<button class="pt' + (c.phu === 'ph' ? ' chon' : '') + (ph.length ? '' : ' n0') + '" data-phu="ph">PHẢN HỒI <b>' + ph.length + '</b></button>';
      if (c.phu === 'pb') r.innerHTML = pb.length ? pb.map(function (x) { return cauPb(c, x); }).join('') : '<div class="trong la">' + esc(c.tab) + ' đã phản biện hết ✓</div>';
      else r.innerHTML = ph.length ? ph.map(function (x) { return cauPh(c, x); }).join('') : '<div class="trong la">' + esc(c.tab) + ' đã phản hồi hết ✓</div>';
    }
    r.scrollTop = cuon;
    // bàn phím bám lại ô đang gõ (vẽ lại là mất tham chiếu cũ)
    if (c.kb.cardId) {
      var ta = r.querySelector('[data-id="' + CSS.escape(c.kb.cardId) + '"] textarea');
      if (ta) { c.kb.el = ta; } else { c.kb.el = null; c.kb.cardId = ''; c.kb.tho = ''; }
    }
    datVideoCot(c);
  }

  /* ── thẻ câu: PHẢN BIỆN (em bị ghi tên) · PHẢN HỒI (em đi chấm) ── */
  function gioBtn(er) { return '<button class="gio" data-gio="' + tSec(er) + '">' + IC_PLAY + fmtGio(er) + '</button>'; }
  function cauPb(c, x) {
    var e = x.err, nhapCu = c.nhap[e.id];
    return '<div class="cau pb" data-id="' + esc(e.id) + '"><div class="cau-dau">' + gioBtn(e) + nhan(e.type) +
      '<span class="ai">chấm bởi <b>' + esc(x.chuLoi) + '</b> · ' + esc(x.doiCham) + '</span></div>' +
      (e.sentence ? '<div class="cau-goc">“' + esc(e.sentence) + '”</div>' : '') +
      '<div class="cau-loi">' + esc(e.detail || '') + '</div>' + (e.explain ? '<div class="cau-giai">' + esc(e.explain) + '</div>' : '') +
      '<div class="hanh"><button class="nut ok" data-act="agree">' + IC_TICK + ' AGREE</button><button class="nut no" data-act="disagree">' + IC_X + ' DISAGREE</button></div>' +
      '<div class="lydo' + (nhapCu != null ? ' mo' : '') + '"><textarea inputmode="none" maxlength="300" placeholder="Vì sao em không đồng ý?">' + esc(nhapCu || '') + '</textarea>' +
      '<button class="gui" data-act="gui" title="Gửi lý do">' + IC_GUI + '</button></div></div>';
  }
  function cauPh(c, x) {
    var e = x.err, PH = phTheoErr();
    var pd = (PH[e.id] || []).filter(function (p) { return p.y === 'phanDoi'; });
    return '<div class="cau ph" data-id="' + esc(e.id) + '"><div class="cau-dau">' + gioBtn(e) + nhan(e.type) +
      '<span class="ai">em bắt lỗi <b>' + esc(e.who || '?') + '</b> · ' + esc(x.doiBiCham) + '</span></div>' +
      (e.sentence ? '<div class="cau-goc">“' + esc(e.sentence) + '”</div>' : '') +
      '<div class="cau-loi">' + esc(e.detail || '') + '</div>' + (e.explain ? '<div class="cau-giai">' + esc(e.explain) + '</div>' : '') +
      pd.map(function (p) { return '<div class="pd"><b>' + esc(p.voter) + '</b>' + (tenBang(p.voter, e.who) ? '' : ' (đồng đội)') + ' phản đối: ' + esc(p.lyDo || '(không ghi lý do)') + '</div>'; }).join('') +
      '<div class="hanh"><button class="nut no" data-act="keep"><svg viewBox="0 0 24 24"><path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7z"/></svg> KEEP ISSUE</button>' +
      '<button class="nut ok" data-act="accept">' + IC_TICK + ' ACCEPT APPEAL</button></div></div>';
  }
  function chiHtml(cau, loi, gt) {
    return '<div class="chi">' + (cau ? '<i>“' + esc(cau) + '”</i>' : '') + '<b>' + esc(loi || '') + '</b>' + (gt ? '<u>' + esc(gt) + '</u>' : '') + '</div>';
  }

  /* ── XÁC NHẬN TRÙNG: cụm của đội em CHẤM còn hoà phiếu ── */
  function veXn(c, CH) {
    if (!c.cham) return '<div class="trong mo">Chưa thấy bản chấm nào của ' + esc(c.ten) + ' nên chưa biết đội này chấm đội nào.</div>';
    var pc = phieuCum();
    var ds = cumCua(c.cham).filter(function (x) { return ketQuaCum(x, pc) === 'hoa'; });
    if (!ds.length) return '<div class="trong la">' + esc(c.ten) + ' đã bỏ phiếu xong ✓</div>';
    var theoId = {}; CH.forEach(function (x) { theoId[x.err.id] = x; });
    return ds.map(function (cu) {
      var ph = pc[cu._id] || { gop: [], khong: [] };
      var dong = (cu.ids || []).map(function (id) { return theoId[id]; }).filter(Boolean)
        .sort(function (a, b) { return tSec(a.err) - tSec(b.err); });
      var chon = c.chonPhieu && c.chonPhieu.cumId === cu._id ? c.chonPhieu : null;
      return '<div class="cum" data-id="' + esc(cu._id) + '"><div class="cum-dau"><span>Hoà phiếu · ' + esc(cu.doiBiCham) + ' xin gộp ' + (cu.ids || []).length + ' dòng</span>' +
        '<span class="giua">' + (cu.ai || []).map(function (t) { return avHtml(t, 'av20'); }).join('') + '</span><span class="phai">' + esc(cu.ten || '') + '</span></div>' +
        dong.map(function (x) { return '<div class="cum-o">' + gioBtn(x.err) + chiHtml(x.err.sentence, x.err.detail, '') + '<span class="ai">' + esc(x.chuLoi) + '</span></div>'; }).join('') +
        '<div class="phieu"><button class="ok" data-act="gop"><span class="so">' + ph.gop.length + '</span><span><div class="nh">ĐỒNG Ý GỘP</div><div class="avs">' + ph.gop.map(function (t) { return avHtml(t, 'av20'); }).join('') + '</div></span></button>' +
        '<button class="no" data-act="khong"><span class="so">' + ph.khong.length + '</span><span><div class="nh">KHÔNG GỘP</div><div class="avs">' + ph.khong.map(function (t) { return avHtml(t, 'av20'); }).join('') + '</div></span></button>' +
        (chon ? '<div class="chon-em">' + (chon.y === 'gop' ? 'ĐỒNG Ý GỘP' : 'KHÔNG GỘP') + ' · EM NÀO?' + c.tv.map(function (em) {
          var da = (chon.y === 'gop' ? ph.gop : ph.khong).some(function (t) { return tenBang(t, em); });
          return '<button' + (da ? ' class="da"' : '') + ' data-act="phieu-em" data-em="' + esc(em) + '">' + avHtml(em, 'sav') + esc(vietTat(em)) + (da ? ' ✓' : '') + '</button>';
        }).join('') + '</div>' : '') +
        '</div></div>';
    }).join('');
  }

  /* ── KIỂM TRA TRÙNG: lỗi đội em BỊ bắt — ALL MISTAKES (tích → gộp) · GROUPS ── */
  function ktRows(c, CH) {
    var rows = CH.filter(function (x) { return x.doiBiCham === c.ten && song(x.err); }).map(function (x) {
      return { id: x.err.id, cham: x.chuLoi, who: x.err.who, type: x.err.type, t: tSec(x.err), cau: x.err.sentence, loi: x.err.detail, gt: x.err.explain, x: x };
    });
    rows.sort(function (a, b) { return a.t - b.t || String(a.id).localeCompare(String(b.id)); });
    rows.forEach(function (r, i) { r.stt = i + 1; });   // SỐ ĐỊNH DANH theo thời gian — cùng luật màn học sinh
    return rows;
  }
  function ktConLai(c, rows) {
    var da = {};
    cumCua(c.ten).forEach(function (cu) { (cu.ids || []).forEach(function (i) { da[i] = 1; }); });
    return rows.filter(function (r) { return !da[r.id]; });
  }
  function chayGoiY(c, conLai) {
    if (!window.SPTrung) return;
    var khoa = conLai.map(function (r) { return r.id; }).join('|');
    if (khoa === c.goiYKhoa) return;
    c.goiYKhoa = khoa;
    if (conLai.length < 2) { c.goiY = {}; c.nhom = {}; return; }
    window.SPTrung.goiY(conLai.map(function (r) { return { id: r.id, cham: r.cham, who: r.who, type: r.type, t: r.t, cau: r.cau, loi: r.loi, gt: r.gt }; }))
      .then(function (kq) { c.goiY = kq.danhDau || {}; c.nhom = kq.nhom || {}; if (ST.mo && c.tab === 'kt') veCotRuot(c); })
      .catch(function () { c.goiY = {}; c.nhom = {}; });
  }
  function veKtAll(c, rows, conLai, cum) {
    var nhomTruoc = null, nTich = Object.keys(c.tich).filter(function (id) { return conLai.some(function (r) { return r.id === id; }); }).length;
    return (conLai.map(function (r) {
      var goiy = !!c.goiY[r.id], nh = goiy ? (c.nhom[r.id] || null) : null;
      var canNgan = nh != null && nhomTruoc != null && nh !== nhomTruoc;
      if (nh != null) nhomTruoc = nh;
      return (canNgan ? '<div class="ngan"><span>nhóm khác</span></div>' : '') +
        '<div class="tro ' + (goiy ? 'goiy' : 'mo') + (c.tich[r.id] ? ' tich' : '') + '" data-tich="' + esc(r.id) + '"><span class="tk">' + IC_TICK + '</span><div class="than">' +
        '<div class="hang"><span class="stt">' + r.stt + '</span>' + gioBtn(r.x.err) + nhan(r.type) + (goiy ? '<span class="nhan goiy">THẦY ANDREW GỢI Ý</span>' : '') + '<span class="ai">' + esc(r.cham) + '</span></div>' +
        chiHtml(r.cau, r.loi, r.gt) + '</div></div>';
    }).join('') || '<div class="trong mo">Mọi lỗi đều đã được xếp vào cụm.</div>') +
    (nTich ? '<div class="kt-viec">' +
      (nTich >= 2 ? '<button class="nut xdg" data-act="newgroup">+ NEW GROUP <span class="bong">' + nTich + '</span></button>' : '') +
      (cum.length ? '<button class="nut den" data-act="addgroup">ADD TO A GROUP</button>' : '') +
      (c.chonCum && cum.length ? '<div class="kt-chon">' + cum.map(function (cu) {
        return '<button data-act="addto" data-cum="' + esc(cu._id) + '">' + esc(cu.ten || 'Cụm') + ' · ' + (cu.ids || []).length + ' dòng</button>';
      }).join('') + '</div>' : '') + '</div>' : '');
  }
  function veKtGr(c, rows, cum) {
    if (!cum.length) return '<div class="trong mo">Chưa có cụm lỗi gộp nào.</div>';
    var theoId = {}; rows.forEach(function (r) { theoId[r.id] = r; });
    return cum.map(function (cu) {
      return '<div class="gr" data-id="' + esc(cu._id) + '"><div class="cum-dau"><span>' + (cu.ids || []).length + ' dòng = 1 lỗi</span>' +
        '<span class="giua">' + (cu.ai || []).map(function (t) { return avHtml(t, 'av20'); }).join('') + '</span><span class="phai">' + esc(cu.ten || '') + '</span></div>' +
        (cu.ids || []).slice().sort(function (a, b) { return ((theoId[a] || {}).stt || 0) - ((theoId[b] || {}).stt || 0); }).map(function (id) {
          var r = theoId[id];
          if (!r) return '<div class="cum-o"><span class="ai">(câu đã bị gỡ khỏi bản chấm)</span><button class="bo" data-bo="' + esc(cu._id) + '|' + esc(id) + '" title="Bỏ khỏi cụm">' + IC_X + '</button></div>';
          return '<div class="cum-o"><span class="stt">' + r.stt + '</span>' + gioBtn(r.x.err) +
            '<div class="chi"><span class="ai">' + nhan(r.type) + ' <b>' + esc(r.cham) + '</b> chấm</span>' + chiHtml(r.cau, r.loi, '') + '</div>' +
            '<button class="bo" data-bo="' + esc(cu._id) + '|' + esc(id) + '" title="Bỏ khỏi cụm">' + IC_X + '</button></div>';
        }).join('') + '</div>';
    }).join('');
  }
  function datTenCum(ids, rows) {
    var theoId = {}; rows.forEach(function (r) { theoId[r.id] = r; });
    var chu = ids.map(function (i) { return (theoId[i] || {}).loi || ''; }).filter(Boolean).sort(function (a, b) { return a.length - b.length; })[0] || '';
    return chu.length > 60 ? chu.slice(0, 57) + '…' : chu;
  }
  function taoCumId() { return 'c' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1296).toString(36); }

  /* ═══ GHI KHO — mọi lượt đều qua `ghi()` để có dòng Đang lưu / Đã lưu / Chưa lưu được ═══ */
  function ghi(viec, roi) {
    ST.luu.dang++; ST.luu.loi = ''; veLuu();
    return viec().then(function () {
      ST.luu.dang--; ST.luu.luc = luc(); veLuu();
      if (roi) roi();
    }, function (e) {
      ST.luu.dang--; ST.luu.loi = String((e && e.message) || e); veLuu();
      ctx.toast('Chưa lưu được — ' + ST.luu.loi);
      henVe();
      throw e;
    });
  }
  function themPhieu(p) {   // đè phiếu cục bộ (chờ onSnapshot xác nhận)
    var ds = L().phanHoi;
    for (var i = ds.length - 1; i >= 0; i--) if (ds[i].errId === p.errId && tenBang(ds[i].voter, p.voter)) ds.splice(i, 1);
    ds.push(p);
  }
  function ghiPhieu(c, x, em, y, lyDo) {
    var p = { errId: x.err.id, chuLoi: x.chuLoi, voter: em, voterTeam: c.ten, y: y, lyDo: String(lyDo || '').trim(), luc: luc() };
    themPhieu(Object.assign({ _id: x.err.id + '__' + slugHs(em) }, p));
    return ghi(function () { return fsPatch(duongBuoi('phanHoi', x.err.id + '__' + slugHs(em)), p); });
  }
  /* Kết luận của người chấm — đọc bản kho MỚI NHẤT rồi chỉ sửa đúng một lỗi, PATCH kèm updateMask
     (LUẬT 9️⃣: ghi đè cả tài liệu là xoá `timers`/`daNop`… do nơi khác đặt). */
  function ghiKetLuan(c, x, hanhDong) {
    var e = x.err;
    e.ketLuan = hanhDong; e.trangThai = hanhDong === 'agree' ? 'go' : 'song'; e.suaLuc = luc();
    return ghi(function () {
      return fsGet(duongBuoi('tongLoi', x.slug)).then(function (doc) {
        if (!doc) throw new Error('không thấy bản chấm của ' + x.chuLoi);
        var errors = (doc.errors || []).map(function (er) {
          if (er.id !== e.id) return er;
          return Object.assign({}, er, { ketLuan: e.ketLuan, trangThai: e.trangThai, suaLuc: e.suaLuc });
        });
        return fsPatch(duongBuoi('tongLoi', x.slug), { errors: errors, capNhatLuc: luc() }, ['errors', 'capNhatLuc']);
      });
    });
  }
  function ghiCum(c, cu) {
    var d = { doiBiCham: cu.doiBiCham, ids: (cu.ids || []).slice(), ten: cu.ten || '', ai: (cu.ai || []).slice(), daGui: true, luc: cu.luc || luc() };
    var ds = L().cum, co = false;
    for (var i = 0; i < ds.length; i++) if (ds[i]._id === cu._id) { Object.assign(ds[i], d); co = true; }
    if (!co) ds.push(Object.assign({ _id: cu._id }, d));
    return ghi(function () { return fsPatch(duongBuoi('cum', cu._id), d); });
  }
  function ghiCumPhieu(c, cumId, em, y) {
    var d = { cumId: cumId, voter: em, voterTeam: c.ten, y: y, luc: luc() };
    var ds = L().cumPhieu, id = cumId + '__' + slugHs(em);
    for (var i = ds.length - 1; i >= 0; i--) if (ds[i].cumId === cumId && tenBang(ds[i].voter, em)) ds.splice(i, 1);
    ds.push(Object.assign({ _id: id }, d));
    return ghi(function () { return fsPatch(duongBuoi('cumPhieu', id), d); });
  }
  function emThaoTac(c) { return c.emCuoi || c.tv[0] || ''; }

  /* ═══ HÀNH ĐỘNG TRÊN BẢNG ═══ */
  function veLai(c, nhayN) {
    veCotRuot(c);
    if (nhayN) { var k = cotCua(nhayN); if (k) veCotRuot(k); }
    veDai(nhayN);
    veAcv();
  }
  function bamBang(e) {
    if (e.target.closest('.kbd')) return;
    var cot = e.target.closest('.cot'); if (!cot) return;
    var n = +cot.id.slice(3), c = cotCua(n); if (!c) return;
    var t;
    if ((t = e.target.closest('[data-tab]'))) { c.tab = t.dataset.tab; c.phu = ''; c.chonPhieu = null; c.chonCum = false; veCotRuot(c); return; }
    if ((t = e.target.closest('[data-phu]'))) { c.phu = t.dataset.phu; c.chonCum = false; veCotRuot(c); return; }
    if ((t = e.target.closest('[data-gio]'))) { toiGiay(c, +t.dataset.gio); return; }
    if (e.target.closest('[data-play]')) { playPause(c); return; }
    if ((t = e.target.closest('[data-nhich]'))) { nhich(c, +t.dataset.nhich); return; }
    if ((t = e.target.closest('[data-bo]'))) {
      var ph = t.dataset.bo.split('|'), cu = (L().cum || []).filter(function (x) { return x._id === ph[0]; })[0];
      if (!cu) return;
      cu.ids = (cu.ids || []).filter(function (i) { return i !== ph[1]; });
      if (cu.ids.length < 2) cu.ids = [];       // giải tán = ids RỖNG, không xoá tài liệu (luật kho cấm xoá)
      if ((cu.ai || []).indexOf(emThaoTac(c)) < 0) cu.ai = (cu.ai || []).concat([emThaoTac(c)]);
      ghiCum(c, cu).then(null, function () {});
      veLai(c); return;
    }
    if ((t = e.target.closest('[data-tich]'))) { var id = t.dataset.tich; if (c.tich[id]) delete c.tich[id]; else c.tich[id] = 1; veCotRuot(c); return; }
    var a = e.target.closest('[data-act]'); if (!a) return;
    var act = a.dataset.act, CH = gomCham();
    if (act === 'newgroup' || act === 'addgroup' || act === 'addto') {
      var rows = ktRows(c, CH), conLai = ktConLai(c, rows);
      var ids = Object.keys(c.tich).filter(function (i) { return conLai.some(function (r) { return r.id === i; }); });
      if (act === 'addgroup') {
        var cumDs = cumCua(c.ten);
        if (cumDs.length === 1) { act = 'addto'; a = { dataset: { cum: cumDs[0]._id } }; }
        else { c.chonCum = !c.chonCum; veCotRuot(c); return; }
      }
      if (act === 'newgroup') {
        if (ids.length < 2) return;
        var moi = { _id: taoCumId(), doiBiCham: c.ten, ids: ids, ten: datTenCum(ids, rows), ai: [emThaoTac(c)], daGui: true, luc: luc() };
        c.tich = {}; c.chonCum = false;
        ghiCum(c, moi).then(null, function () {});
        ctx.toast('Đã gộp ' + ids.length + ' lỗi thành 1 cụm · ' + (c.cham ? 'đội chấm sẽ bỏ phiếu' : ''));
      } else {
        var cu2 = (L().cum || []).filter(function (x) { return x._id === a.dataset.cum; })[0];
        if (!cu2 || !ids.length) return;
        ids.forEach(function (i) { if ((cu2.ids || []).indexOf(i) < 0) cu2.ids.push(i); });
        if ((cu2.ai || []).indexOf(emThaoTac(c)) < 0) cu2.ai = (cu2.ai || []).concat([emThaoTac(c)]);
        cu2.ten = cu2.ten || datTenCum(cu2.ids, rows);
        c.tich = {}; c.chonCum = false;
        ghiCum(c, cu2).then(null, function () {});
        ctx.toast('Đã thêm ' + ids.length + ' dòng vào ' + (cu2.ten || 'cụm'));
      }
      veLai(c); return;
    }
    var the = a.closest('.cau,.cum'); if (!the) return;
    var id2 = the.dataset.id;
    if (act === 'gop' || act === 'khong') { c.chonPhieu = { cumId: id2, y: act }; veCotRuot(c); return; }
    if (act === 'phieu-em') {
      if (!c.chonPhieu) return;
      var em = a.dataset.em, pc = phieuCum()[c.chonPhieu.cumId] || { gop: [], khong: [] };
      var daBo = (c.chonPhieu.y === 'gop' ? pc.gop : pc.khong).some(function (x) { return tenBang(x, em); });
      ghiCumPhieu(c, c.chonPhieu.cumId, em, daBo ? '' : c.chonPhieu.y).then(null, function () {});
      ctx.toast(daBo ? em + ' đã rút phiếu' : em + ' đã bỏ phiếu ' + (c.chonPhieu.y === 'gop' ? 'ĐỒNG Ý GỘP' : 'KHÔNG GỘP'));
      c.chonPhieu = null; c.emCuoi = em;
      veLai(c); return;
    }
    var x = CH.filter(function (k) { return k.err.id === id2; })[0]; if (!x) return;
    if (act === 'disagree') {
      c.nhap[id2] = c.nhap[id2] || '';
      the.querySelector('.lydo').classList.add('mo');
      var ta = the.querySelector('textarea'); ta.focus(); c.kb.el = ta; c.kb.cardId = id2; c.kb.tho = ''; c.kb.wStart = ta.value.length;
      return;
    }
    if (act === 'gui') {
      var lyDo = the.querySelector('textarea').value.trim();
      if (!lyDo) { the.querySelector('textarea').focus(); ctx.toast('Em ghi lý do trước đã'); return; }
      delete c.nhap[id2]; c.kb.el = null; c.kb.cardId = '';
      ghiPhieu(c, x, c.tab, 'phanDoi', lyDo).then(null, function () {});
      var kia = doiTheoTen(x.doiCham);
      ctx.toast('Đã gửi phản đối · ' + x.chuLoi + ' (' + x.doiCham + ') có thêm 1 việc phản hồi');
      the.classList.add('di'); setTimeout(function () { veLai(c, kia ? kia.n : 0); }, 280); return;
    }
    if (act === 'agree') {
      ghiPhieu(c, x, c.tab, 'dongY', '').then(null, function () {});
      ctx.toast(c.tab + ' đã nhận lỗi ✓');
      the.classList.add('di'); setTimeout(function () { veLai(c); }, 280); return;
    }
    if (act === 'keep' || act === 'accept') {
      ghiKetLuan(c, x, act === 'keep' ? 'keep' : 'agree').then(null, function () {});
      ctx.toast(act === 'keep' ? 'Giữ lỗi · chờ thầy quyết' : 'Đã nhường lỗi ✓');
      var kia2 = doiTheoTen(x.doiBiCham);
      the.classList.add('di'); setTimeout(function () { veLai(c, kia2 ? kia2.n : 0); }, 280); return;
    }
  }

  /* ═══ PLAYER GỌN — YouTube ẩn 1px, mỗi cột một máy; tiếng của đội nào tuỳ tab đang mở ═══ */
  function parseYt(url) {
    var m = String(url || '').trim().match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
    return m ? m[1] : '';
  }
  function napYT() {
    if (window.YT && window.YT.Player) { ST.ytSan = true; ST.cot.forEach(dungPlayer); return; }
    if (!document.getElementById('ytApi')) {
      var tag = document.createElement('script'); tag.id = 'ytApi'; tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    var cu = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (cu) try { cu(); } catch (e) {} ST.ytSan = true; if (ST.mo) ST.cot.forEach(dungPlayer); };
  }
  function videoCua(c) {
    // pb / kt: lỗi ghi tên em ĐỘI NÀY ⇒ video đội này · ph / xn: việc trên bài đội em CHẤM ⇒ video đội kia
    var laEm = c.tv.indexOf(c.tab) >= 0;
    var cuaMinh = c.tab === 'kt' || (laEm && c.phu === 'pb');
    var doi = cuaMinh ? doiTheoTen(c.ten) : (c.cham ? doiTheoTen(c.cham) : null);
    return { id: doi ? parseYt(doi.video) : '', ten: doi ? doi.ten : '' };
  }
  function datVideoCot(c) {
    var v = videoCua(c), pl = $('pl' + c.n);
    if (!pl) return;
    pl.querySelector('[data-pldoi]').textContent = v.ten ? 'TIẾNG ' + v.ten : '';
    if (!v.id) { pl.hidden = true; return; }
    pl.hidden = false;
    if (c.vid === v.id) return;
    c.vid = v.id;
    var p = ST.yt[c.n];
    if (p && c.ytSan) { try { p.cueVideoById(v.id); } catch (e) {} }
    else if (ST.ytSan && !p) dungPlayer(c);
  }
  function dungPlayer(c) {
    if (ST.yt[c.n] || !ST.ytSan) return;
    var v = videoCua(c); if (!v.id) return;
    c.vid = v.id;
    try {
      ST.yt[c.n] = new YT.Player('yt' + c.n, { videoId: v.id, playerVars: { rel: 0, playsinline: 1 },
        events: { onReady: function () { c.ytSan = true; } } });
    } catch (e) {}
  }
  function nhipPlayer() {
    ST.cot.forEach(function (c) {
      var p = ST.yt[c.n], pl = $('pl' + c.n);
      if (!p || !c.ytSan || !pl) return;
      try {
        var cur = p.getCurrentTime() || 0, dur = p.getDuration() || 0, phat = p.getPlayerState() === 1;
        if (c.phat !== phat) { c.phat = phat; pl.querySelector('[data-play]').innerHTML = phat ? IC_PAUSE : IC_PLAY; }
        if (!c.keo && dur) pl.querySelector('[data-seek]').value = Math.round(cur / dur * 1000);
        pl.querySelector('[data-cur]').textContent = fmtClock(cur);
        pl.querySelector('[data-dur]').textContent = fmtClock(dur);
      } catch (e) {}
    });
  }
  function toiGiay(c, s) { var p = ST.yt[c.n]; if (!p || !c.ytSan) return; try { p.seekTo(Math.max(0, s - 1), true); p.playVideo(); } catch (e) {} }
  function playPause(c) { var p = ST.yt[c.n]; if (!p || !c.ytSan) return; try { if (p.getPlayerState() === 1) p.pauseVideo(); else p.playVideo(); } catch (e) {} }
  function nhich(c, giay) { var p = ST.yt[c.n]; if (!p || !c.ytSan) return; try { var cur = p.getCurrentTime() || 0, dur = p.getDuration() || 0; p.seekTo(Math.max(0, Math.min(dur || 1e9, cur + giay)), true); } catch (e) {} }
  function keoSeek(c, el, xong) { var p = ST.yt[c.n]; if (!p || !c.ytSan) return; c.keo = !xong; if (xong) { try { var dur = p.getDuration() || 0; p.seekTo(dur * (+el.value / 1000), true); } catch (e) {} } }

  /* ═══ ③ NGHE KHO SỐNG — chỉ khi bảng mở ═══ */
  function batLive() {
    var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
    Promise.all([import(SDK + '/firebase-app.js'), import(SDK + '/firebase-firestore.js')]).then(function (m) {
      if (!ST.mo) return;
      var appMod = m[0], fsMod = m[1], app;
      try { app = appMod.getApp(); } catch (e) { app = appMod.initializeApp({ apiKey: ctx.db.apiKey, projectId: ctx.db.projectId }); }
      var db = fsMod.getFirestore(app);
      ['tongLoi', 'phanHoi', 'cum', 'cumPhieu'].forEach(function (ngan) {
        ST.nghe.push(fsMod.onSnapshot(fsMod.collection(db, 'spBuoi', ctx.buoiId, ngan), function (snap) {
          if (snap.metadata && snap.metadata.fromCache) return;   // chỉ tin bản từ MÁY CHỦ
          var ds = []; snap.forEach(function (d) { var o = d.data() || {}; o._id = d.id; ds.push(o); });
          var part = {}; part[ngan] = ds;
          ctx.nhan(part);
          henVe();
        }, function (e) { ST.luu.loi = 'mất kết nối kho (' + ((e && e.code) || '?') + ')'; veLuu(); }));
      });
    }).catch(function (e) { ctx.toast('Không nghe được kho: ' + ((e && e.message) || e)); });
  }
  function tatLive() { ST.nghe.forEach(function (h) { try { h(); } catch (e) {} }); ST.nghe = []; }
  function henVe() {
    clearTimeout(ST.henVe);
    ST.henVe = setTimeout(function () {
      if (ST.mo) { ST.cot.forEach(veCotRuot); veDai(); }
      ctx.veTrang(); veAcv();
    }, 150);
  }

  /* ═══ ④ BÀN PHÍM TRONG CỘT — khuôn myActivity ═══ */
  var L1 = ['q','w','e','r','t','y','u','i','o','p'], L2 = ['a','s','d','f','g','h','j','k','l'], L3 = ['z','x','c','v','b','n','m'];
  var N1 = ['1','2','3','4','5','6','7','8','9','0'], N2 = ['-','/',':',';','(',')','$','&','@'], N3 = ['!','+','=','*','%','#','_'];
  function veKbd(c) {
    var k = c.kb, r1 = k.num ? N1 : L1, r2 = k.num ? N2 : L2, r3 = k.num ? N3 : L3;
    var ph = function (ch) { var v = k.caps && !k.num ? ch.toUpperCase() : ch; return '<button class="k l" data-k="' + esc(v) + '">' + esc(v) + '</button>'; };
    $('kbd' + c.n).innerHTML =
      '<div class="kr">' + ph("'") + r1.map(ph).join('') + '<button class="k back" data-k="⌫">⌫</button></div>' +
      '<div class="kr"><button class="k fn caps' + (k.caps && !k.num ? ' on' : '') + '" data-k="caps"' + (k.num ? ' disabled' : '') + '>caps<i></i></button>' + r2.map(ph).join('') + ph('?') + '</div>' +
      '<div class="kr"><button class="k fn num' + (k.num ? ' on' : '') + '" data-k="num">numbers<i></i></button>' + r3.map(ph).join('') + ph('.') + ph(',') + '</div>' +
      '<div class="kr"><button class="k fn lang' + (k.vi ? ' vi' : '') + '" data-k="lang">' + (k.vi ? 'VI' : 'ENG') + '<i></i></button><button class="k space" data-k=" ">Space</button><button class="k enter" data-k="⏎">⏎</button></div>';
  }
  function bamPhim(e) {
    var kb = e.target.closest('.kbd'), b = e.target.closest('[data-k]'); if (!kb || !b) return;
    var c = cotCua(+kb.id.slice(3)); if (!c) return;
    var k = c.kb, ch = b.dataset.k;
    if (ch === 'caps') { k.caps = !k.caps; veKbd(c); return; }
    if (ch === 'num') { k.num = !k.num; k.caps = false; veKbd(c); return; }
    if (ch === 'lang') { k.vi = !k.vi; k.tho = ''; veKbd(c); return; }
    var el = k.el && document.contains(k.el) ? k.el : null;
    if (!el) { ctx.toast('Bấm DISAGREE rồi chạm vào ô lý do trước đã'); return; }
    if (ch === '⏎') { var g = el.closest('.lydo') && el.closest('.lydo').querySelector('.gui'); if (g) g.click(); return; }
    if (ch === '⌫') {
      if (k.vi && k.tho) { k.tho = k.tho.slice(0, -1); el.value = el.value.slice(0, k.wStart) + telex(k.tho); }
      else { el.value = el.value.slice(0, -1); k.tho = ''; k.wStart = el.value.length; }
    } else {
      var laChu = /^[a-z]$/i.test(ch);
      if (k.vi && laChu) { if (!k.tho) k.wStart = el.value.length; k.tho += ch; el.value = el.value.slice(0, k.wStart) + telex(k.tho); }
      else { el.value += ch; k.tho = ''; k.wStart = el.value.length; }
      if (k.caps && laChu) { k.caps = false; veKbd(c); }
    }
    c.nhap[k.cardId] = el.value;
  }
  // ---- TELEX (chép từ myActivity keyboard.js — cùng luật đặt dấu) ----
  var DAU = { a:'àáảãạ', 'ă':'ằắẳẵặ', 'â':'ầấẩẫậ', e:'èéẻẽẹ', 'ê':'ềếểễệ', i:'ìíỉĩị', o:'òóỏõọ', 'ô':'ồốổỗộ', 'ơ':'ờớởỡợ', u:'ùúủũụ', 'ư':'ừứửữự', y:'ỳýỷỹỵ' };
  var PHIM_DAU = { f:0, s:1, r:2, x:3, j:4 }, NGUYEN_AM = 'aăâeêioôơuưy', MU = { a:'â', e:'ê', o:'ô' }, MOC = { a:'ă', o:'ơ', u:'ư' };
  var GOC = { 'â':'a', 'ê':'e', 'ô':'o', 'ă':'a', 'ơ':'o', 'ư':'u', 'đ':'d' };
  function hoa(c) { return c !== c.toLowerCase(); }
  function theoHoa(mau, c) { return hoa(mau) ? c.toUpperCase() : c; }
  function boDau(c) { if (!c) return ''; var t = c.toLowerCase(); for (var k in DAU) if (DAU[k].indexOf(t) >= 0) return theoHoa(c, k); return c; }
  function chuGoc(c) { var t = boDau(c).toLowerCase(); return GOC[t] || t; }
  function laNguyenAm(c) { return NGUYEN_AM.indexOf(boDau(c).toLowerCase()) >= 0; }
  function datDau(chu, dau) {
    if (dau < 0) return chu.join('');
    var vt = [], cuoiVt = -1, i;
    for (i = chu.length - 1; i >= 0; i--) if (laNguyenAm(chu[i])) { cuoiVt = i; break; }
    if (cuoiVt < 0) return chu.join('');
    for (i = cuoiVt; i >= 0 && laNguyenAm(chu[i]); i--) vt.unshift(i);
    if (vt.length > 1) {
      var d0 = boDau(chu[vt[0]]).toLowerCase(), truoc = vt[0] > 0 ? chuGoc(chu[vt[0] - 1]) : '';
      if (d0 === 'u' && truoc === 'q') vt.shift(); else if (d0 === 'i' && truoc === 'g' && vt.length > 1) vt.shift();
    }
    var chon = -1;
    for (var j = vt.length - 1; j >= 0; j--) if ('ăâêôơư'.indexOf(boDau(chu[vt[j]]).toLowerCase()) >= 0) { chon = vt[j]; break; }
    if (chon < 0) chon = vt.length === 1 ? vt[0] : vt.length >= 3 ? vt[1] : (vt[vt.length - 1] < chu.length - 1) ? vt[1] : vt[0];
    var c = chu[chon], goc = boDau(c).toLowerCase();
    if (DAU[goc]) chu[chon] = theoHoa(c, DAU[goc][dau]);
    return chu.join('');
  }
  function telex(tho) {
    var chu = [], dau = -1;
    function cuoi() { return chu.length ? chu[chu.length - 1] : ''; }
    function coNguyenAm() { return chu.some(laNguyenAm); }
    for (var i = 0; i < tho.length; i++) {
      var c = tho[i], t = c.toLowerCase(), sau = cuoi(), sauT = boDau(sau).toLowerCase();
      if (PHIM_DAU[t] !== undefined && coNguyenAm()) { var d = PHIM_DAU[t]; if (dau === d) { dau = -1; chu.push(c); } else dau = d; continue; }
      if (t === 'z' && dau >= 0) { dau = -1; continue; }
      if (t === 'w') {
        if (chu.length && (sauT === 'ă' || sauT === 'ơ' || sauT === 'ư')) { chu[chu.length - 1] = theoHoa(sau, GOC[sauT]); chu.push(c); continue; }
        if (chu.length >= 2) { var a1 = boDau(chu[chu.length - 2]).toLowerCase(); if (a1 === 'u' && sauT === 'o') { chu[chu.length - 2] = theoHoa(chu[chu.length - 2], 'ư'); chu[chu.length - 1] = theoHoa(sau, 'ơ'); continue; } }
        if (chu.length && MOC[sauT]) { chu[chu.length - 1] = theoHoa(sau, MOC[sauT]); continue; }
        chu.push(theoHoa(c, 'ư')); continue;
      }
      if (chu.length && (sauT === 'â' || sauT === 'ê' || sauT === 'ô' || sauT === 'đ') && GOC[sauT] === t) { chu[chu.length - 1] = theoHoa(sau, GOC[sauT]); chu.push(c); continue; }
      if (chu.length && MU[t] && sauT === t) { chu[chu.length - 1] = theoHoa(sau, MU[t]); continue; }
      if (chu.length && t === 'd' && sauT === 'd') { chu[chu.length - 1] = theoHoa(sau, 'đ'); continue; }
      chu.push(c);
    }
    return datDau(chu, dau);
  }

  /* ═══ NỐI DÂY ═══ */
  function gan() {
    var bx = $('btnXuLy'); if (bx) bx.addEventListener('click', moPop);
    var pop = $('popNen');
    pop.addEventListener('change', capNhatNutMo);
    pop.addEventListener('click', function (e) { if (e.target === pop) pop.hidden = true; });
    $('popHuy').addEventListener('click', function () { pop.hidden = true; });
    $('popMo').addEventListener('click', function () {
      var ds = Array.prototype.map.call(pop.querySelectorAll('input:checked'), function (i) { return +i.value; });
      pop.hidden = true; if (ds.length) moBang(ds);
    });
    $('btnDong').addEventListener('click', dongBang);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (ST.mo) dongBang(); pop.hidden = true; } });
    var bc = $('bangCot');
    bc.addEventListener('click', bamBang);
    bc.addEventListener('click', bamPhim);
    // ⛔ Chặn ở tầng KHUNG, pha capture: phím dựng lại cả hàng thì nút biến mất trước mousedown,
    //    con trỏ ô gõ không rơi về body (bẫy đã ghi: ban-phim-ao-mat-con-tro).
    ['mousedown', 'pointerdown', 'touchstart'].forEach(function (ev) {
      bc.addEventListener(ev, function (e) { if (e.target.closest('.kbd')) e.preventDefault(); }, true);
    });
    bc.addEventListener('focusin', function (e) {
      var ta = e.target.closest('textarea'); if (!ta) return;
      var c = cotCua(+ta.closest('.cot').id.slice(3)); if (!c) return;
      var the = ta.closest('[data-id]');
      c.kb.el = ta; c.kb.cardId = the ? the.dataset.id : ''; c.kb.tho = ''; c.kb.wStart = ta.value.length;
    });
    bc.addEventListener('input', function (e) {
      var cot = e.target.closest('.cot'); if (!cot) return;
      var c = cotCua(+cot.id.slice(3)); if (!c) return;
      var ta = e.target.closest('textarea'), the = ta && ta.closest('[data-id]');
      if (ta && the) c.nhap[the.dataset.id] = ta.value;
      var sk = e.target.closest('[data-seek]');
      if (sk) keoSeek(c, sk, false);
    });
    bc.addEventListener('change', function (e) {
      var sk = e.target.closest('[data-seek]'); if (!sk) return;
      var c = cotCua(+sk.closest('.cot').id.slice(3)); if (c) keoSeek(c, sk, true);
    });
    setInterval(function () { if (ST.mo) $('bdGio').textContent = gioHienTai(); }, 15000);
  }

  window.SPBang = { init: function (c) { ctx = c; A = c.A; gan(); }, veAcv: veAcv, dem: dem, dangMo: function () { return ST.mo; },
    _soi: function () { return { L: L(), ST: ST }; } };   // chỉ để bàn thử soi trạng thái, không dùng trong trang
})();
