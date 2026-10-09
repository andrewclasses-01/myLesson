/* ⛔ FILE SINH TỰ ĐỘNG từ kho myPay v0.27.0 (e99c6db) bằng tools/dong-goi-web.js — ĐỪNG SỬA TAY (sửa ở kho myPay rồi đóng gói lại) */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  function vnd(x) { return (x || 0).toLocaleString('vi-VN'); }
  function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function khoaTen(ten) { return String(ten ?? '').trim().toUpperCase(); }
  function gioCuaTx(ngay) { const p = (ngay || '').split(' ')[1]; return p ? p.slice(0, 5) : ''; }
  let toastHen = 0;
  function baoToast(chu) {
    const t = $('#toast');
    t.textContent = chu; t.classList.add('on');
    clearTimeout(toastHen);
    toastHen = setTimeout(() => t.classList.remove('on'), 2600);
  }
  async function goi(ham, ...args) {
    const r = await window.mypay[ham](...args);
    if (!r.ok) { baoToast('Lỗi: ' + r.loi); throw new Error(r.loi); }
    return r.data;
  }

  const homNay = new Date();
  const S = {
    m: homNay.getMonth() + 1,
    y: homNay.getFullYear(),
    du: null,          // dữ liệu docThang
    no: null,          // danh sách nợ phí (v0.6.0) — không phụ thuộc tháng đang xem
    chuaGan: null,     // v0.8.0 — tháng trước còn nợ mà chưa gắn nhãn
    tamUng: null,      // v0.10.0 — số dư "Đóng phí trước" của từng em (không phụ thuộc tháng)
    trang: 'thang',
  };

  const daBaoLechChot = new Set(); // "m-y" đã hiện popup lệch chốt trong phiên này — khỏi hiện lặp mỗi lần refresh nhỏ
  async function napThang() {
    S.du = await goi('docThang', S.m, S.y);
    try { S.phiCu = await goi('docPhiCu', S.m, S.y); } catch (_) { S.phiCu = {}; }
    veTatCa();
    const key = S.m + '-' + S.y;
    if ((S.du.lechChot || []).length && S.du.thang.chot && !daBaoLechChot.has(key)) {
      daBaoLechChot.add(key);
      moHopLechChot();
    }
  }
  function veTatCa() {
    $('#thangNhan').textContent = `Tháng ${S.m}/${S.y}`;
    $('#thangNhan2').textContent = `Tháng ${S.m}/${S.y}`;
    const conLui = conLuiDuocThang(S.m, S.y, S.du.caiDat);
    $('#thangTruoc').disabled = !conLui; $('#thangTruoc2').disabled = !conLui;
    const conToi = conToiDuocThang(S.m, S.y);
    $('#thangSau').disabled = !conToi; $('#thangSau2').disabled = !conToi;
    veChips(); veCanhBao(); veLuoiLop(); veGiaoDich(); veCaiDat();
  }

  function motPhanCua(u) {
    const g = ((S.du.thang || {}).ghiDe || {})[u.id];
    return Math.max(0, Math.round((g && g.dongMotPhan) || 0));
  }
  function conThieuCua(u) { return Math.max(0, (u.expected || 0) - motPhanCua(u)); }

  function phanLoai(u) {
    const kq = S.du.ketQua;
    if (kq.chotTay && kq.chotTay[u.id]) return { loai: 'du', m: null, chot: kq.chotTay[u.id] };
    if (u.id in kq.done) {
      const m = kq.matched.find((x) => x.u.id === u.id
        || (x.u.kind === 'grp' && (x.u.members || []).some((mm) => mm.id === u.id)));
      if (m && (m.status === 'THIẾU' || m.status === 'THỪA' || (m.status === 'ĐỦ' && m.diff < 0))) return { loai: 'lech', m };
      return { loai: 'du', m };
    }
    if (!u.buoi) return { loai: 'khongbuoi', m: null };
    if (motPhanCua(u) > 0) return { loai: 'motphan', m: null };
    return { loai: 'chuadong', m: null };
  }
  function ghiChuCua(pl, u) {
    if (pl.loai === 'motphan') {
      return 'Đã ' + vnd(motPhanCua(u)) + ' · thiếu ' + vnd(conThieuCua(u));
    }
    if (!pl.m) return '';
    const { status, diff } = pl.m;
    if (status === 'THIẾU') return 'Thiếu ' + vnd(-diff);
    if (status === 'THỪA') return 'Thừa ' + vnd(diff);
    if (status === 'ĐỦ' && diff < 0) return 'Thiếu nhẹ ' + vnd(-diff);
    return '';
  }
  function trungTien(u) { return motPhanCua(u) > 0 && (u.id in S.du.ketQua.done); }

  function veChips() {
    const kq = S.du.ketQua;
    const coThu = kq.units.filter((u) => u.buoi > 0);
    const tongCan = coThu.reduce((s, u) => s + (u.expected || 0), 0);
    S.tongCan = tongCan; // menu chuột phải trên số tháng đọc lại giá trị này
    let tongEm = 0; let daDongEm = 0;
    for (const u of kq.units) {
      const soEm = u.kind === 'fam' ? (u.members || []).filter((x) => x.buoi > 0).length : (u.buoi > 0 ? 1 : 0);
      if (!soEm) continue;
      tongEm += soEm;
      if (u.id in kq.done) daDongEm += soEm;   // đóng một phần KHÔNG tính là đã đóng
    }
    const kqTam = S.du.ketQuaGiaoDich;
    const chuaRo = kqTam.unident.filter((ti) => !kqTam.txns[ti].daXacNhanRoi).length
      + kqTam.review.filter((r) => !kqTam.txns[r.ti].daXacNhanRoi).length;
    $('#chipTong').innerHTML = `
      <div class="omdem">
        <span class="o xanh">Đã đóng <b>${daDongEm}/${tongEm}</b> học sinh</span>
        <span class="o do">Chưa đóng <b>${tongEm - daDongEm}</b> học sinh</span>
        <span class="o tim">GD chưa rõ <b>${chuaRo}</b></span>
      </div>`;
  }
  function veCanhBao() {
    const ds = S.du.bang.canhBao || [];
    $('#khuCanhBao').innerHTML = ds.length
      ? `<div class="canhbao">⚠ ${ds.map(esc).join(' · ')}</div>` : '';
  }

  function laTieuHoc(lop, ten) {
    const cat = (S.du.caiDat.hocSinh || {})[lop + '|' + khoaTen(ten)];
    return !!(cat && cat.tieuHoc);
  }

  function veLuoiLop() {
    const kq = S.du.ketQua;
    const mapNo = banDoNoThangNay();   // v0.7.0 — nhãn "Nợ phí •" / "Đóng sau •"
    const nhanNo = (u, coTien) => {
      const d = mapNo.get(khoaNoCua(u));
      const cu = phiCuCua(u);
      const nhanCu = cu.length ? `<i class="no-nhan cu" title="${esc(cu.map((x) => `Tháng ${x.m}/${x.y}: ${vnd(x.soTien)}`).join('\n') + '\nTổng phí cũ: ' + vnd(cu.reduce((s, x) => s + x.soTien, 0)))}">Có phí cũ</i> ` : '';
      if (!d) return nhanCu;
      const chu = (d.kieu === 'sau' ? 'Đóng sau' : 'Nợ phí') + (coTien ? ' •' : '');
      return nhanCu + `<i class="no-nhan ${d.kieu === 'sau' ? 'sau' : 'no'}">${chu}</i> `;
    };
    const doanTh = (S.du.bang && S.du.bang.doan) || { moc: 0, lop: {} };
    const khoaThe = (lop, doan) => (doan ? lop + '\u0001' + doan : lop);
    function cacThe(lopMacDinh, lich) {
      const ra = new Map();
      for (const b of lich || []) {
        const lop = b.lop || lopMacDinh; const doan = b.doan || ''; const k = khoaThe(lop, doan);
        if (!ra.has(k)) ra.set(k, { lop, doan, buoi: 0, hocThu: 0 });
        const t = ra.get(k);
        if (b.coMat && b.hocThu) t.hocThu++;
        else if (b.coMat) t.buoi += b.s || 1;
      }
      if (!ra.size) {   // chưa có buổi nào (em mới / cả tháng chưa học) ⇒ thẻ lớp hiện tại (lớp tách đôi ⇒ đoạn MỚI)
        const d = doanTh.lop[lopMacDinh]; const doan = d ? (d.tach ? 'MOI' : d.nhan) : '';
        ra.set(khoaThe(lopMacDinh, doan), { lop: lopMacDinh, doan, buoi: 0, hocThu: 0 });
      }
      return [...ra.values()];
    }
    const theoLop = {}; const theTt = {};
    function vaoLop(t, row) { const k = khoaThe(t.lop, t.doan); theTt[k] = t; (theoLop[k] = theoLop[k] || []).push(row); }
    for (const u of kq.units) {
      if (u.kind === 'fam') {
        for (const m of u.members || []) {
          for (const t of cacThe(m.lop, m.lich)) vaoLop(t, { u, giadinh: true, ten: m.ten, buoi: t.buoi, hs: m.id, hocThu: t.hocThu, lop: t.lop });
        }
      } else {
        const ds = cacThe(u.classes[0], u.lich);
        const tongLop = ds.length > 1 ? `Em học ${ds.length} lớp trong tháng — tổng ${u.buoi} buổi, MỘT hóa đơn gộp (nháy đúp ở thẻ nào cũng được)` : '';
        for (const t of ds) vaoLop(t, { u, giadinh: false, ten: u.label, buoi: t.buoi, hs: u.hsId, hocThu: t.hocThu, lop: t.lop, tongLop, soLop: ds.length });
      }
    }
    const luoi = $('#luoiLop');
    luoi.innerHTML = '';
    const thuDoan = { '': 0, CU: 1, MOI: 2 };
    const tenLops = Object.keys(theoLop).sort((a, b) => theTt[a].lop.localeCompare(theTt[b].lop) || thuDoan[theTt[a].doan] - thuDoan[theTt[b].doan]);
    const bac = { chuadong: 0, motphan: 0, lech: 1, du: 2, khongbuoi: 3 };
    const coGui = (u, pl) => pl.loai !== 'du' && pl.loai !== 'khongbuoi' && !!daGuiCua(u);
    const nhomXep = (u, pl) => (pl.loai === 'khongbuoi' ? 3 : pl.loai === 'du' ? 2 : coGui(u, pl) ? 1 : 0);
    const soXep = (ua, pa, ub, pb) => (nhomXep(ua, pa) - nhomXep(ub, pb)) || (bac[pa.loai] - bac[pb.loai]);
    for (const khoa of tenLops) {
      const { lop, doan } = theTt[khoa];
      const dsRow = theoLop[khoa];
      const coThuUnitIds = new Set(dsRow.filter((r) => r.buoi > 0).map((r) => r.u.id));
      const daDongUnitIds = new Set(dsRow.filter((r) => r.buoi > 0 && r.u.id in kq.done).map((r) => r.u.id));
      const card = document.createElement('div');
      card.className = 'lop-card glass';
      const pct = coThuUnitIds.size ? Math.round(daDongUnitIds.size / coThuUnitIds.size * 100) : 0;
      const veHang = (r) => {
        const { u, giadinh, ten, buoi, hs, hocThu } = r;
        const pl = phanLoai(u);
        const gc = ghiChuCua(pl, u);
        const daNhan = (u.id in kq.done) && kq.done[u.id] >= 0 ? kq.txns[kq.done[u.id]].amount : null;
        const th = laTieuHoc(lop, ten);
        return `<div class="hsrow ${pl.loai}${coGui(u, pl) ? ' dagui' : ''}${giadinh ? ' giadinh khoa' : ''}${th ? ' tieuhoc' : ''}" data-uid="${esc(u.id)}" data-hs="${esc(String(hs ?? ''))}"${giadinh ? ' data-khoa="1" title="Em này thuộc gia đình nhiều con — thao tác ở thẻ GIA ĐÌNH bên dưới"' : ''}>
            <span class="cham"></span>
            <span class="ten">${esc(ten)}${th ? ' <span class="th-nhan">(Tiểu học)</span>' : ''}${giadinh ? ' <small>(gia đình)</small>' : ''} <small>· ${buoi} buổi${hocThuChu(hocThu)}</small>${r.tongLop ? ` <span class="nhieu-lop" title="${esc(r.tongLop)}">${r.soLop} lớp</span>` : ''}</span>
            ${gc ? `<span class="ghichu">${esc(gc)}</span>` : ''}
            ${!giadinh && trungTien(u) ? '<span class="ghichu canhbao-trung" title="Vừa có ghi tay đóng một phần, vừa khớp được giao dịch ngân hàng — kiểm tra lại kẻo tính trùng một lần tiền">⚠ trùng?</span>' : ''}
            ${!giadinh && pl.loai !== 'du' ? conDuBadge(u) : ''}
            ${giuaHangHtml(pl, u)}
            <span class="tien">${giadinh ? nhanNo(u, false) : nhanNo(u, true) + (pl.loai === 'chuadong' || pl.loai === 'motphan' ? vnd(u.expected) : vnd(daNhan ?? u.expected))}</span>
          </div>`;
      };
      const thuong = dsRow.filter((r) => !r.giadinh)
        .sort((a, b) => soXep(a.u, phanLoai(a.u), b.u, phanLoai(b.u)) || a.ten.localeCompare(b.ten, 'vi'));
      const giadinh = dsRow.filter((r) => r.giadinh)
        .sort((a, b) => soXep(a.u, phanLoai(a.u), b.u, phanLoai(b.u)) || a.ten.localeCompare(b.ten, 'vi'));
      const mocTh = doanTh.moc || 0;
      const nhanDoan = doan === 'CU' ? `<span class="the-doan cu">CŨ${mocTh ? ' · đến ' + (mocTh - 1) + '/' + S.m : ''}</span>`
        : doan === 'MOI' ? `<span class="the-doan moi">MỚI${mocTh ? ' · từ ' + mocTh + '/' + S.m : ''}</span>` : '';
      card.innerHTML = `<h3>${esc(lop)} ${nhanDoan}<span class="dem">${daDongUnitIds.size}/${coThuUnitIds.size} đã đóng</span></h3>
        <div class="tienbar"><i style="width:${pct}%"></i></div>` +
        thuong.map(veHang).join('') +
        (giadinh.length ? '<div class="hs-vach"></div>' + giadinh.map(veHang).join('') : '');
      luoi.appendChild(card);
    }

    const fams = kq.units.filter((u) => u.kind === 'fam');
    if (fams.length) {
      const coThu = fams.filter((u) => u.buoi > 0);
      const daDong = coThu.filter((u) => u.id in kq.done).length;
      const pct = coThu.length ? Math.round(daDong / coThu.length * 100) : 0;
      const card = document.createElement('div');
      card.className = 'lop-card glass';
      const sx = fams.map((u) => ({ u, pl: phanLoai(u) }))
        .sort((a, b) => soXep(a.u, a.pl, b.u, b.pl) || a.u.label.localeCompare(b.u.label, 'vi'));
      card.innerHTML = `<h3>GIA ĐÌNH <span class="dem">${daDong}/${coThu.length} đã đóng</span></h3>
        <div class="tienbar"><i style="width:${pct}%"></i></div>` +
        sx.map(({ u, pl }) => {
          const gc = ghiChuCua(pl, u);
          const daNhan = (u.id in kq.done) && kq.done[u.id] >= 0 ? kq.txns[kq.done[u.id]].amount : null;
          const mems = (u.members || []).length ? u.members : [{ ten: u.label, lop: '', buoi: u.buoi }];
          return `<div class="hsrow fam-row ${pl.loai}${coGui(u, pl) ? ' dagui' : ''}" data-uid="${esc(u.id)}" title="${esc(u.label)} — tổng ${u.buoi} buổi">
            <span class="cham"></span>
            <span class="ten fam-ten">${mems.map((mm) => `<span class="fam-em">${esc(mm.ten)} <small>· ${mm.lop ? esc(mm.lop) + ' · ' : ''}${mm.buoi} buổi${hocThuChu(mm.hocThu)}</small></span>`).join('')}</span>
            ${gc ? `<span class="ghichu">${esc(gc)}</span>` : ''}
            ${trungTien(u) ? '<span class="ghichu canhbao-trung" title="Vừa có ghi tay đóng một phần, vừa khớp được giao dịch ngân hàng — kiểm tra lại kẻo tính trùng một lần tiền">⚠ trùng?</span>' : ''}
            ${giuaHangHtml(pl, u)}
            <span class="tien">${nhanNo(u, true)}${pl.loai === 'chuadong' || pl.loai === 'motphan' ? vnd(u.expected) : vnd(daNhan ?? u.expected)}</span>
          </div>`;
        }).join('');
      luoi.appendChild(card);
    }

    $$('#luoiLop .hsrow').forEach((el) => {
      const sao = el.querySelector('.sao-chot');
      if (sao) sao.addEventListener('dblclick', (e) => { e.stopPropagation(); moCanhSaoChot(sao, el.dataset.uid); });
      const gcI = el.querySelector('.gc-icon');
      if (gcI) gcI.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const u = S.du.ketQua.units.find((z) => z.id === el.dataset.uid);
        if (u) moCanhGhiChu(gcI, u);
      });
      if (el.dataset.khoa) {
        el.ondblclick = (e) => { if (e.ctrlKey || e.metaKey) moCanhNgayBd(el); };   // v0.22.0 — ngày bắt đầu tính phí vẫn đặt được
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          baoToast('Em này thuộc gia đình nhiều con — thao tác ở thẻ GIA ĐÌNH bên dưới.');
        });
        return;
      }
      el.ondblclick = (e) => { if (e.ctrlKey || e.metaKey) { moCanhNgayBd(el); return; } moHopHd(el.dataset.uid); };
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        chonHang(el);
        const uid = el.dataset.uid;
        const bay = Date.now();
        clearTimeout(ctxPhaiHen);
        if (ctxPhaiTruoc && ctxPhaiTruoc.uid === uid && bay - ctxPhaiTruoc.luc < PHAI_DUP_MS) {
          ctxPhaiTruoc = null;
          doiDaDongNhanh(uid);
          return;
        }
        ctxPhaiTruoc = { uid, luc: bay };
        const x = e.clientX; const y = e.clientY;
        ctxPhaiHen = setTimeout(() => { ctxPhaiTruoc = null; moCtxHs(x, y, uid); }, PHAI_DUP_MS);
      });
    });
    if (chonUid) {
      const r = $$('#luoiLop .hsrow').find((x) => x.dataset.uid === chonUid && !x.dataset.khoa);
      if (r) r.classList.add('dongchon');
    }
  }

  const TEN_CHOT = { chot: 'Chốt xong phí', tang: 'Tặng học phí' };
  function khoaNguoiU(u) { return u.kind === 'fam' ? 'N|' + u.idNha : 'H|' + u.hsId; }
  function ghiChuCuaU(u) { return u ? ((S.du && S.du.ghiChu) || {})[khoaNguoiU(u)] || null : null; }
  function giuaHangHtml(pl, u) {
    const c = pl && pl.chot;
    const gc = ghiChuCuaU(u);
    const ctay = u && u.chinhTay;   // v0.23.0 — có chỉnh tay hóa đơn tháng này
    const gui = u && daGuiCua(u);    // v0.25.0 — đã gửi hóa đơn tháng này cho phụ huynh
    if (!c && !gc && !ctay && !gui) return '';
    const tieuDe = c ? (c.loai === 'tang' ? 'Được tặng học phí' : 'Đã chốt xong phí') + (c.theo ? ` (theo tháng ${c.m}/${c.y})` : '') + ' — nháy đúp xem chi tiết' : '';
    return '<span class="giua-hang">' +
      (c ? `<span class="sao-chot ${c.loai}${c.theo ? ' theo' : ''}" title="${esc(tieuDe)}">★</span>` : '') +
      (gc ? `<span class="gc-icon" title="${esc(gc.chu)}\n— nháy đúp để sửa">📝</span>` : '') +
      (ctay ? `<span class="ct-icon" title="Có chỉnh tay hóa đơn tháng này (gốc ${vnd(ctay.goc)}đ) — mở hóa đơn ⇒ ✎ Chỉnh tay">✎</span>` : '') +
      (gui ? `<span class="gui-icon" title="Đã gửi hóa đơn tháng này cho phụ huynh (${esc(gioGuiChu(gui))})">✈</span>` : '') + '</span>';
  }
  function phiCuCua(u) { return (u && (S.phiCu || {})[khoaNoCua(u)]) || []; }
  function daGuiCua(u) { const g = ((S.du && S.du.thang && S.du.thang.ghiDe) || {})[u.id]; return (g && g.daGui) || ''; }
  function gioGuiChu(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    const h = (n) => String(n).padStart(2, '0');
    return `${h(d.getDate())}/${h(d.getMonth() + 1)} ${h(d.getHours())}:${h(d.getMinutes())}`;
  }
  function sdtCua(u) { const o = ((S.du && S.du.lienHe) || {})[khoaNguoiU(u)]; return (o && o.sdt) || ''; }

  function moCanh(neo, html) {
    let el = $('#ctxMo');
    if (!el) { el = document.createElement('div'); el.id = 'ctxMo'; el.className = 'ctxmenu glass ctx-mo'; document.body.appendChild(el); }
    el.innerHTML = html;
    el.classList.add('on');
    const khung = (neo.closest && neo.closest('.ctxmenu:not(#ctxMo)')) || neo;
    const rk = khung.getBoundingClientRect(); const rn = neo.getBoundingClientRect(); const r = el.getBoundingClientRect();
    let x = rk.right + 6;
    if (x + r.width > window.innerWidth - 8) x = rk.left - r.width - 6;
    if (x < 8) x = Math.max(8, window.innerWidth - r.width - 8);
    const y = Math.max(8, Math.min(rn.top - 6, window.innerHeight - r.height - 8));
    el.style.left = x + 'px'; el.style.top = y + 'px';
    return el;
  }
  function dongCanh() { const el = $('#ctxMo'); if (el) el.classList.remove('on'); }

  function trangThaiTruocChot(u) {
    const pl = phanLoai(u);
    if (pl.chot) return (pl.chot.loai === 'tang' ? 'Đang được tặng' : 'Đang chốt xong') + ` (tháng ${pl.chot.m}/${pl.chot.y})`;
    if (pl.loai === 'chuadong') return 'Chưa đóng ' + vnd(u.expected) + 'đ';
    if (pl.loai === 'motphan' || pl.loai === 'lech') return ghiChuCua(pl, u);
    if (pl.loai === 'khongbuoi') return 'Không có buổi';
    return 'Đã đóng đủ';
  }
  function moCanhChotTay(neo, u, loai) {
    const truoc = trangThaiTruocChot(u);
    moCanh(neo, `
      <div class="muc tt"><b>${TEN_CHOT[loai]}</b> — tháng ${S.m}/${S.y} + mọi tháng trước</div>
      <div class="muc tt">Hiện tại: <b>${esc(truoc)}</b></div>
      <div class="cm-than">
        <textarea id="ctGhiChu" rows="3" maxlength="500" placeholder="Ghi chú (không bắt buộc)"></textarea>
        <div class="cm-nut"><button class="btn primary" id="ctLuu">Xác nhận</button><button class="btn" id="ctHuy">Hủy</button></div>
        <div class="cm-phu">Dòng nợ phí các tháng đó (nếu có) tự xoá.</div>
      </div>`);
    setTimeout(() => { const o = $('#ctGhiChu'); if (o) o.focus(); }, 30);
    $('#ctHuy').onclick = () => dongCanh();
    $('#ctLuu').onclick = async () => {
      $('#ctLuu').disabled = true;
      try {
        const r = await goi('themChotTay', {
          loai, doiTuong: u.kind === 'fam' ? 'nha' : 'hs', hsId: u.hsId, idNha: u.idNha, m: S.m, y: S.y,
          ghiChu: $('#ctGhiChu').value.trim(), truoc, tenLuc: u.label, lopLuc: (u.classes || []).join(', '),
        });
        dongCtx(); chonUid = u.id; await napThang();
        if (r.daXoaNo) await napNoPhi();
        baoToast(`${u.label}: ${loai === 'tang' ? 'đã ghi TẶNG học phí' : 'đã CHỐT XONG phí'} tới tháng ${S.m}/${S.y}` +
          (r.daXoaNo ? ` · xoá ${r.daXoaNo} dòng nợ phí` : '') + '.');
      } catch (e) { const n = $('#ctLuu'); if (n) n.disabled = false; }
    };
  }
  function moCanhSaoChot(neo, uid) {
    const kq = S.du.ketQua;
    const u = kq.units.find((z) => z.id === uid);
    const c = u && kq.chotTay && kq.chotTay[uid];
    if (!c) return;
    const luc = c.luc ? new Date(c.luc).toLocaleString('vi-VN') : '';
    const ten = c.loai === 'tang' ? 'Tặng học phí' : 'Chốt xong phí';
    moCanh(neo, `
      <div class="muc tt"><span class="sao-chot ${c.loai}">★</span> <b>${ten}</b> — ${esc(u.label)}</div>
      <div class="cm-than cm-chu">
        ${c.theo ? `Tháng ${S.m}/${S.y} xong phí <b>theo ${ten.toLowerCase()} ở tháng ${c.m}/${c.y}</b>.<br>` : ''}
        Áp dụng: <b>tháng ${c.m}/${c.y} và mọi tháng trước</b><br>
        Lúc thao tác: <b>${esc(luc)}</b><br>
        Trạng thái lúc đó: <b>${esc(c.truoc || '—')}</b><br>
        Ghi chú: <b>${c.ghiChu ? esc(c.ghiChu) : '(không có)'}</b>
        <div class="cm-nut" id="ctHang"><button class="btn" id="ctBo">Bỏ ${ten.toLowerCase()}</button><button class="btn primary" id="ctDong">Đóng</button></div>
      </div>`);
    $('#ctDong').onclick = () => dongCanh();
    $('#ctBo').onclick = () => {
      $('#ctHang').innerHTML = `<span class="cm-phu">Bỏ ${ten.toLowerCase()} tháng ${c.m}/${c.y}? Các tháng đó tính lại như thường (nợ phí đã xoá KHÔNG tự hiện lại).</span>
        <button class="btn primary" id="ctBoOk">Bỏ</button><button class="btn" id="ctBoHuy">Hủy</button>`;
      $('#ctBoHuy').onclick = () => dongCanh();
      $('#ctBoOk').onclick = async () => {
        await goi('xoaChotTay', c.id);
        dongCanh(); chonUid = u.id; await napThang();
        baoToast(`${u.label}: đã bỏ ${ten.toLowerCase()}.`);
      };
    };
  }
  function moCanhGhiChu(neo, u) {
    const gc = ghiChuCuaU(u);
    const luc = gc && gc.luc ? new Date(gc.luc).toLocaleString('vi-VN') : '';
    moCanh(neo, `
      <div class="muc tt">📝 <b>Ghi chú</b> — ${esc(u.label)}${luc ? ` <small>(sửa ${esc(luc)})</small>` : ''}</div>
      <div class="cm-than">
        <textarea id="gcChu" rows="4" maxlength="2000" placeholder="Ghi chú cho ${u.kind === 'fam' ? 'nhà' : 'em'} này (mọi tháng đều thấy)">${gc ? esc(gc.chu) : ''}</textarea>
        <div class="cm-nut"><button class="btn primary" id="gcLuu">Lưu</button><button class="btn" id="gcHuy">Hủy</button>
          ${gc ? '<button class="btn" id="gcXoa" style="margin-left:auto">Xoá</button>' : ''}</div>
      </div>`);
    setTimeout(() => { const o = $('#gcChu'); if (o) { o.focus(); o.setSelectionRange(o.value.length, o.value.length); } }, 30);
    const luu = async (chu) => {
      await goi('ghiGhiChu', khoaNguoiU(u), chu);
      dongCtx(); chonUid = u.id; await napThang();
      baoToast(chu ? `${u.label}: đã lưu ghi chú.` : `${u.label}: đã xoá ghi chú.`);
    };
    $('#gcHuy').onclick = () => dongCanh();
    $('#gcLuu').onclick = () => luu($('#gcChu').value.trim());
    if ($('#gcXoa')) $('#gcXoa').onclick = () => luu('');
  }

  function hocThuChu(n) { return n ? ` <span class="hoc-thu">(+${n} học thử)</span>` : ''; }
  function ngayBdCua(so) { const o = ((S.du && S.du.ngayBatDau) || {})[String(so)]; return o ? o.ngay : ''; }
  function moCanhNgayBd(el) {
    const kq = S.du.ketQua;
    const u = kq.units.find((z) => z.id === el.dataset.uid);
    if (!u) return;
    let ds;
    if (u.kind === 'fam') {
      const mems = u.members || [];
      ds = el.dataset.hs ? mems.filter((m) => String(m.id) === el.dataset.hs) : mems;
      ds = ds.map((m) => ({ so: m.id, ten: m.ten, lop: m.lop, lich: m.lich || [] }));
    } else ds = [{ so: u.hsId, ten: u.label, lop: (u.classes || [])[0] || '', lich: u.lich || [] }];
    ds = ds.filter((p) => /^\d+$/.test(String(p.so)));
    if (!ds.length) { baoToast('Em này chưa có mã số — không đặt được ngày bắt đầu.'); return; }
    const pad = (n) => String(n).padStart(2, '0');
    const xemTruoc = (p, v) => {
      let tinh = 0; let thu = 0;
      for (const b of p.lich) {
        if (!b.coMat) continue;
        if (v && `${S.y}-${pad(S.m)}-${pad(b.ngay)}` < v) thu++; else tinh++;
      }
      return { tinh, thu };
    };
    moCanh(el, `
      <div class="muc tt">📅 <b>Ngày bắt đầu tính phí</b>${u.kind === 'fam' && ds.length > 1 ? ' — ' + esc(u.label) : ''}</div>
      <div class="cm-than">
        ${ds.map((p, i) => `<div class="nbd-em"><div><b>${esc(p.ten)}</b> <small style="color:var(--text-dim)">${esc(p.lop)}</small></div>
          <input type="date" class="nbd-o" data-i="${i}" value="${esc(ngayBdCua(p.so))}">
          <div class="cm-phu nbd-xem" data-i="${i}"></div></div>`).join('')}
        <div class="cm-nut"><button class="btn primary" id="nbdLuu">Lưu</button><button class="btn" id="nbdHuy">Hủy</button></div>
        <div class="cm-phu">Buổi TRƯỚC ngày này = học thử: không tính phí ở mọi tháng, hóa đơn ghi "Học thử". Để trống = tính mọi buổi.</div>
      </div>`);
    const veXem = (i) => {
      const p = ds[i]; const v = $(`.nbd-o[data-i="${i}"]`).value;
      const x = xemTruoc(p, v);
      let chu = `Tháng ${S.m}/${S.y}: <b>${x.tinh}</b> buổi tính phí` + (x.thu ? ` · <b>${x.thu}</b> học thử` : '');
      if (u.kind !== 'fam' && !x.tinh && (u.id in kq.done) && !(kq.chotTay && kq.chotTay[u.id])) {
        chu += '<br><span style="color:var(--danger)">⚠ Tháng này đã ghi nhận đóng tiền — đổi xong em không còn buổi tính phí, khoản tiền đó sẽ không gắn với ai.</span>';
      }
      $(`.nbd-xem[data-i="${i}"]`).innerHTML = chu;
    };
    ds.forEach((p, i) => { veXem(i); $(`.nbd-o[data-i="${i}"]`).addEventListener('input', () => veXem(i)); });
    setTimeout(() => { const o = $('.nbd-o'); if (o) o.focus(); }, 30);
    $('#nbdHuy').onclick = () => dongCanh();
    $('#nbdLuu').onclick = async () => {
      $('#nbdLuu').disabled = true;
      try {
        let doi = 0;
        for (let i = 0; i < ds.length; i++) {
          const v = $(`.nbd-o[data-i="${i}"]`).value || '';
          if (v === ngayBdCua(ds[i].so)) continue;
          await goi('ghiNgayBatDau', ds[i].so, v); doi++;
        }
        dongCanh(); chonUid = u.id; await napThang();
        baoToast(doi ? `Đã lưu ngày bắt đầu tính phí (${doi} em) — mọi tháng đã tính lại.` : 'Không có gì thay đổi.');
      } catch (e) { const n = $('#nbdLuu'); if (n) n.disabled = false; }
    };
  }

  const PHAI_DUP_MS = 320;
  let ctxPhaiHen = 0; let ctxPhaiTruoc = null; let dangDoiDong = false;
  async function doiDaDongNhanh(uid) {
    if (dangDoiDong) return;
    const kq = S.du.ketQua;
    const u = kq.units.find((z) => z.id === uid);
    if (!u) return;
    if (kq.chotTay && kq.chotTay[u.id]) {
      baoToast(`${u.label} đang ${kq.chotTay[u.id].loai === 'tang' ? 'được tặng học phí' : 'chốt xong phí'} — muốn bỏ thì nháy đúp ngôi sao ★.`);
      return;
    }
    const daDong = u.id in kq.done;
    if (daDong) {
      const m = kq.matched.find((x) => x.u.id === u.id);
      const gd = (S.du.thang && S.du.thang.ghiDe && S.du.thang.ghiDe[u.id]) || {};
      if (!(gd.daDong && m && m.ti === -1)) {
        baoToast(`${u.label} đã đóng qua giao dịch ngân hàng — muốn bỏ thì gỡ ở tab Giao dịch.`);
        return;
      }
    } else if (!u.buoi) {
      baoToast(`${u.label} không có buổi học nào tháng này — không cần đánh dấu.`);
      return;
    }
    dangDoiDong = true;
    try {
      await goi('ghiDeUnit', S.m, S.y, u.id, { daDong: !daDong });
      chonUid = u.id;
      await napThang();
      baoToast(daDong ? `${u.label}: đã đổi lại CHƯA ĐÓNG.` : `${u.label}: đã đánh dấu ĐÃ ĐÓNG.`);
    } catch (e) { /* goi() đã tự báo lỗi */ } finally { dangDoiDong = false; }
  }

  let chonUid = null;
  function chonHang(el) {
    if (!el || el.classList.contains('khoa')) return;
    const laHs = el.classList.contains('hsrow');
    const vung = (laHs && el.closest('#luoiLop')) || el.closest('tbody') || el.parentElement;
    if (vung) vung.querySelectorAll('.dongchon').forEach((x) => { if (x !== el) x.classList.remove('dongchon'); });
    el.classList.add('dongchon');
    if (laHs && el.closest('#luoiLop')) chonUid = el.dataset.uid;
  }
  document.addEventListener('click', (e) => {
    const h = e.target.closest && e.target.closest('.hsrow, .bang tbody tr, .no-dong');
    if (h) chonHang(h);
  });


  function veGiaoDich() {
    const t = S.du.thang;
    const kq = S.du.ketQuaGiaoDich;
    $('#dsFile').innerHTML = (t.saoKe || []).map((f) =>
      `<span class="filetag" data-mo="${esc(f.ten)}" title="Click đúp để mở file này">📄 ${esc(f.ten)} <small>(${f.soDong} GD)</small>
        <button title="Gỡ file này" data-goFile="${esc(f.ten)}">✕</button></span>`).join('');
    $$('#dsFile [data-goFile]').forEach((b) => {
      b.onclick = async (e) => {
        e.stopPropagation();
        await goi('xoaSaoKe', S.m, S.y, b.dataset.gofile || b.getAttribute('data-goFile'));
        await napThang(); baoToast('Đã gỡ file.');
      };
    });
    $$('#dsFile .filetag').forEach((el) => {
      el.ondblclick = () => { goi('moFileSaoKe', S.m, S.y, el.dataset.mo).catch(() => {}); };
    });
    veHangGiaoDich(t, kq);
    veSuaTay();
  }

  const TEN_SUA = { gan: 'Gán tay', huyGan: 'Hủy gán', duyet: 'Đúng rồi', boDuyet: 'Bỏ xác nhận' };
  function chacChuaVao() {
    const kq = S.du.ketQuaGiaoDich;
    return kq.matched.filter((mm) => mm.ti >= 0 && mm.chac && kq.txns[mm.ti] && !kq.txns[mm.ti].daXacNhanRoi);
  }
  function soChoXacNhan() { return (((S.du.thang || {}).suaTay) || []).length + (chacChuaVao().length ? 1 : 0); }
  function veSuaTay() {
    const hop = $('#stDs'); if (!hop) return;
    const kq = S.du.ketQuaGiaoDich;
    const ds = ((S.du.thang || {}).suaTay) || [];
    const khoaTx = (tx) => (String(tx.content) + '|' + tx.amount).toUpperCase();
    const tenCua = (ids) => ids.map((id) => { const u = kq.units.find((z) => z.id === id); return u ? u.label : id; }).join(' + ');
    const dong = ds.slice().sort((a, b) => String(b.luc).localeCompare(String(a.luc))).map((d) => {
      const ti = kq.txns.findIndex((tx) => khoaTx(tx) === d.khoa);
      const mm = ti >= 0 ? kq.matched.find((x) => x.ti === ti) : null;
      const ai = d.unitIds && d.unitIds.length ? tenCua(d.unitIds) : (mm ? mm.u.label : '');
      const kq2 = d.loai === 'huyGan' ? (mm ? `trả về máy khớp: <b>${esc(mm.u.label)}</b>` : 'bỏ người nhận')
        : d.loai === 'boDuyet' ? 'chưa chắc — chờ xem lại' : `→ <b>${esc(ai || '?')}</b>`;
      const gio = d.luc ? new Date(d.luc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
      return `<div class="st-dong" data-ti="${ti}"><button class="x" data-bo-st="${esc(d.khoa)}" title="Bỏ sửa này (trả về như trước)">✕</button>
        <div><span class="st-loai ${d.loai}">${TEN_SUA[d.loai] || d.loai}</span><b>${vnd(d.amount)}</b> · ${esc(String(d.ngay || '').split(' ')[0])} <small style="color:var(--text-dim)">${esc(gio)}</small></div>
        <div class="st-nd">${esc(d.content)}</div><div class="st-kq">${kq2}</div></div>`;
    });
    const chac = chacChuaVao();
    if (chac.length) {
      const tong = chac.reduce((a, mm) => a + (kq.txns[mm.ti].amount || 0), 0);
      dong.push(`<div class="st-dong" data-ti="${chac[0].ti}"><div><span class="st-loai tuKhop">Tự khớp chắc</span><b>${chac.length}</b> giao dịch · ${vnd(tong)}đ</div>
        <div class="st-nd">Máy khớp chắc chắn nhưng CHƯA vào Tháng (file có vẻ thuộc tháng khác nên không tự đưa vào). XÁC NHẬN để đưa vào tháng ${S.m}/${S.y}.</div></div>`);
    }
    hop.innerHTML = dong.join('') || '<div class="st-rong">Chưa có sửa tay nào đang chờ.</div>';
    const n = soChoXacNhan();
    $('#stDem').textContent = n; $('#stDem').classList.toggle('co', n > 0);
    $('#nutXacNhan').classList.toggle('tat', n === 0);
    $$('#stDs [data-bo-st]').forEach((b) => {
      b.onclick = async (e) => {
        e.stopPropagation();
        await goi('boSuaTay', S.m, S.y, b.getAttribute('data-bo-st'));
        await napThang(); baoToast('Đã bỏ sửa tay đó — giao dịch trở về như trước.');
      };
    });
    $$('#stDs .st-dong').forEach((el) => {
      el.onclick = () => {
        const tr = $(`#thanGd tr[data-ti="${el.dataset.ti}"]`);
        if (tr) { tr.scrollIntoView({ block: 'center', behavior: 'smooth' }); chonHang(tr); }
      };
    });
  }

  function veHangGiaoDich(t, kq) {
    const than = $('#thanGd');
    const dsReview = new Set(kq.review.map((r) => r.ti));
    const dsUnident = new Set(kq.unident);
    const qND = ($('#gdTimNoiDung') ? $('#gdTimNoiDung').value : '').trim().toUpperCase();
    const qST = ($('#gdTimSoTien') ? $('#gdTimSoTien').value : '').replace(/[^\d]/g, '');
    const dangLoc = !!(qND || qST);
    const hang = [];
    (t.txns || []).forEach((tx, ti) => {
      if (qND && !((tx.note || tx.content || '').toUpperCase().includes(qND))) return;
      if (qST && !String(tx.amount).includes(qST)) return;
      let xdHtml; let kqHtml = ''; let nut = '';
      if (tx.daXacNhanRoi) {
        xdHtml = '<span class="nhan xanh">✓ đã vào Tháng</span>';
        kqHtml = '<small style="color:var(--text-dim)">trùng — không cần xử lại</small>';
        hang.push(`<tr class="da-xac-nhan"><td>${ti + 1}</td><td>${esc((tx.ngay || '').split(' ')[0])}</td>
          <td style="color:var(--text-dim)">${esc(gioCuaTx(tx.ngay))}</td>
          <td class="sotien">${vnd(tx.amount)}</td><td>${esc(tx.note || tx.content)}</td>
          <td>${xdHtml}</td><td>${kqHtml}</td><td></td></tr>`);
        return;
      }
      const m = kq.matched.find((x) => x.ti === ti);
      if (m) {
        const laMau = (m.via === 'L0' || m.via === 'L2');
        const canXem = m.via !== 'TAY' && !m.chac && !m.daDuyet;
        const lyDo = laMau ? (m.via === 'L2' ? 'mẫu đã học (khớp lỏng)' : 'mẫu đã học') : m.u.kind === 'grp' ? 'gộp nhiều em'
          : (m.status !== 'ĐỦ' || Number(m.diff)) ? 'lệch tiền' : 'tên 1 âm tiết';
        const via = m.via === 'TAY' ? 'thầy gán' : m.chac ? 'tự khớp chắc' : lyDo;
        xdHtml = canXem
          ? `<span class="nhan amber">⚠ ${esc(m.u.label)}</span>`
          : `<span class="nhan xanh">✓ ${esc(m.u.label)}</span>`;
        kqHtml = canXem
          ? `<small style="color:var(--amber)">${lyDo} — cần xác nhận</small>`
          : `<small style="color:var(--text-dim)">${via}${m.daDuyet && !m.chac && m.via !== 'TAY' ? ' · đã bấm Đúng rồi' : ''}</small>`;
        if (m.via === 'TAY') nut = `<button class="btn nho" data-huy="${ti}">Hủy gán</button>`;
        else if (canXem) nut = `<button class="btn nho primary" data-duyet="${ti}">Đúng rồi</button>
          <button class="btn nho" data-gan="${ti}">Gán tay</button>`;
        else if (m.daDuyet && !m.chac) nut = `<button class="btn nho" data-boduyet="${ti}">Bỏ xác nhận</button>`;
      } else if (dsReview.has(ti)) {
        const r = kq.review.find((x) => x.ti === ti);
        xdHtml = '<span class="nhan tim">chưa rõ</span>';
        kqHtml = `<small>${esc((r.cands || []).slice(0, 3).join(', '))}</small>`;
        nut = `<button class="btn nho" data-gan="${ti}">Gán</button>`;
      } else if (dsUnident.has(ti)) {
        xdHtml = '<span class="nhan tim">chưa rõ</span>';
        nut = `<button class="btn nho" data-gan="${ti}">Gán</button>`;
      } else {
        xdHtml = '<span class="nhan xam">ngoài diện</span>';
        nut = `<button class="btn nho" data-gan="${ti}">Gán</button>`;
      }
      hang.push(`<tr data-ti="${ti}"><td>${ti + 1}</td><td>${esc((tx.ngay || '').split(' ')[0])}</td>
        <td style="color:var(--text-dim)">${esc(gioCuaTx(tx.ngay))}</td>
        <td class="sotien">${vnd(tx.amount)}</td><td>${esc(tx.note || tx.content)}</td>
        <td>${xdHtml}</td><td>${kqHtml}</td><td>${nut}</td></tr>`);
    });
    than.innerHTML = hang.join('') || (dangLoc
      ? '<tr><td colspan="8" style="color:var(--text-dim);padding:22px;text-align:center">Không tìm thấy giao dịch nào khớp.</td></tr>'
      : '<tr><td colspan="8" style="color:var(--text-dim);padding:22px;text-align:center">Chưa có sao kê — kéo file vào vùng phía trên.</td></tr>');
    $$('#thanGd [data-gan]').forEach((b) => { b.onclick = () => moHopGan(parseInt(b.dataset.gan, 10)); });
    $$('#thanGd [data-huy]').forEach((b) => {
      b.onclick = async () => { await goi('huyGan', S.m, S.y, parseInt(b.dataset.huy, 10)); await napThang(); baoToast('Đã hủy gán.'); };
    });
    $$('#thanGd [data-duyet]').forEach((b) => {
      b.onclick = async () => {
        await goi('duyetMau', S.m, S.y, parseInt(b.dataset.duyet, 10), true);
        await napThang(); baoToast('Đã thêm vào bảng Sửa tay — bấm XÁC NHẬN để đưa vào Tháng.');
      };
    });
    $$('#thanGd [data-boduyet]').forEach((b) => {
      b.onclick = async () => {
        await goi('duyetMau', S.m, S.y, parseInt(b.dataset.boduyet, 10), false);
        await napThang(); baoToast('Đã bỏ xác nhận — dòng này lại hiện cảnh báo.');
      };
    });
  }

  async function moHopGan(ti) {
    const kq = S.du.ketQuaGiaoDich; // v0.9.0 — ti trỏ vào dữ liệu TẠM, không phải chính thức
    const tx = kq.txns[ti];
    const chon = new Set();
    $('#hopGan').innerHTML = `
      <h3>Gán giao dịch cho học sinh</h3>
      <p class="mota"><b>${vnd(tx.amount)}</b> · ${esc(tx.note || tx.content)}</p>
      <input class="timkiem" id="ganTim" placeholder="Gõ tên để lọc… (bấm đúp 1 tên = gán luôn)">
      <div class="chon-ds" id="ganDs"><div class="mota" style="padding:10px">Đang xếp hạng gợi ý…</div></div>
      <label class="dong"><input type="checkbox" id="ganHoc" checked>
        Ghi nhớ mẫu này (tháng sau nội dung tương tự sẽ tự khớp)</label>
      <div class="hangnut">
        <button class="btn primary" id="ganLuu" disabled>Gán</button>
        <button class="btn" data-dong>Đóng</button>
      </div>`;
    $('#manGan').classList.add('on');
    let xepHang = kq.units.filter((u) => !(u.id in kq.done))
      .map((u) => ({ id: u.id, label: u.label, classes: u.classes, kind: u.kind, expected: u.expected, diem: 0, lyDo: '' }));
    try { xepHang = await goi('goiYGanTay', S.m, S.y, ti); } catch (_) { /* rớt mạng — vẫn hiện danh sách chưa xếp hạng, còn hơn trống trơn */ }
    function veDs(loc) {
      const q = (loc || '').toUpperCase();
      const ds = xepHang.filter((u) => !q || u.label.toUpperCase().includes(q) || u.classes.join(',').toUpperCase().includes(q));
      $('#ganDs').innerHTML = ds.map((u, i) => `
        <div class="chon-hs goiy ${chon.has(u.id) ? 'dachon' : ''} ${u.diem > 0 && i === 0 ? 'top' : ''}" data-id="${esc(u.id)}">
          <span class="goiy-ten">${i === 0 && u.diem > 0 ? '★ ' : ''}${esc(u.label)}${u.kind === 'fam' ? ' (M)' : ''}</span>
          <small>${esc(u.classes.join(', '))} · cần ${vnd(u.expected)}${u.lyDo ? ` <i class="goiy-lydo">${esc(u.lyDo)}</i>` : ''}</small>
        </div>`).join('') || '<div class="mota" style="padding:10px">Không tìm thấy ai khớp từ khoá.</div>';
      $$('#ganDs .chon-hs').forEach((el) => {
        el.onclick = () => {
          const id = el.dataset.id;
          if (chon.has(id)) chon.delete(id); else chon.add(id);
          veDs($('#ganTim').value);
          $('#ganLuu').disabled = !chon.size;
        };
        el.ondblclick = () => thucHienGan([el.dataset.id]);
      });
    }
    veDs('');
    $('#ganTim').oninput = () => veDs($('#ganTim').value);
    async function guiGanThat(ids) {
      let hoc = null;
      if ($('#ganHoc').checked) {
        const target = ids.map((id) => {
          const u = kq.units.find((x) => x.id === id);
          return u.names.map((n, i) => n + ' - ' + (u.classes[i] || u.classes[0])).join(', ');
        }).join(', ');
        hoc = { noidung: tx.note || tx.content, chutk: tx.sender || '', target };
      }
      await goi('ganTay', S.m, S.y, ti, ids, hoc);
      dongMan(); await napThang();
      baoToast(hoc ? 'Đã gán + ghi nhớ mẫu.' : 'Đã gán.');
    }
    async function thucHienGan(ids) {
      if (!ids.length) return;
      const khongRo = ids.map((id) => xepHang.find((u) => u.id === id)).filter((u) => u && u.diem === 0);
      if (khongRo.length) {
        const ten = khongRo.map((u) => u.label).join(', ');
        $('#hopMotPhan').innerHTML = `
          <h3>⚠ Gán này có vẻ chưa chắc chắn</h3>
          <p class="mota"><b>${esc(ten)}</b> không có dấu hiệu nào khớp giao dịch này (không
            trùng tên, không đúng lớp, không đúng/gần đúng số tiền). Thầy có chắc muốn gán
            không?</p>
          <div class="hangnut">
            <button class="btn primary" id="ganCanhBaoOk">Vẫn gán</button>
            <button class="btn" id="ganCanhBaoHuy">Xem lại</button>
          </div>`;
        $('#manMotPhan').classList.add('on');
        $('#ganCanhBaoHuy').onclick = () => $('#manMotPhan').classList.remove('on');
        $('#ganCanhBaoOk').onclick = async () => { $('#manMotPhan').classList.remove('on'); await guiGanThat(ids); };
        return;
      }
      await guiGanThat(ids);
    }
    $('#ganLuu').onclick = () => thucHienGan([...chon]);
  }

  function gaiDropzone() {
    const dz = $('#vungTha');
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('keo'); }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('keo'); }));
    dz.addEventListener('drop', async (e) => {
      const paths = [...(e.dataTransfer.files || [])].map((f) => window.mypay.duongDanFile(f)).filter(Boolean);
      if (!paths.length) { baoToast('Không đọc được đường dẫn file.'); return; }
      await napSaoKeTu(paths);
    });
    $('#nutChonSaoKe').onclick = async () => {
      const paths = await goi('chonSaoKe');
      if (paths.length) await napSaoKeTu(paths);
    };
  }
  async function napSaoKeTu(paths) {
    baoToast('Đang đọc ' + paths.length + ' file…');
    await goi('napSaoKe', S.m, S.y, paths);
    await napThang();
    if (kiemLechThang(paths)) { baoToast('Đã nạp sao kê — file có vẻ thuộc tháng khác, CHƯA tự đưa vào Tháng.'); return; }
    await tuVaoThangChac('Đã nạp sao kê + đối soát xong');
  }
  async function tuVaoThangChac(dau) {
    const r = await goi('tuVaoThang', S.m, S.y);
    if (r.them) await napThang();
    baoToast(`${dau} · ${r.them} giao dịch khớp chắc chắn đã tự vào Tháng ${S.m}/${S.y}.`);
  }

  function kiemLechThang(paths) {
    const tenMoi = new Set(paths.map((p) => String(p).split(/[\\/]/).pop()));
    const txnsMoi = ((S.du.thang || {}).txns || []).filter((t) => tenMoi.has(t.nguon) && t.ngay);
    if (txnsMoi.length < 3) return false; // quá ít giao dịch có ngày — không đủ để đoán
    const dem = {};
    for (const t of txnsMoi) {
      const p = String(t.ngay).split('/');
      const m = parseInt(p[1], 10); const y = parseInt(p[2], 10);
      if (!m || !y) continue;
      const k = y + '-' + m;
      dem[k] = (dem[k] || 0) + 1;
    }
    const tong = Object.values(dem).reduce((a, b) => a + b, 0);
    if (!tong) return false;
    let modeK = null; let modeN = 0;
    for (const [k, n] of Object.entries(dem)) if (n > modeN) { modeN = n; modeK = k; }
    if (!modeK || modeN / tong < 0.5) return false; // không có tháng nào áp đảo — khỏi đoán bừa
    const [modeY, modeM] = modeK.split('-').map(Number);
    let ySuggest = modeY; let mSuggest = modeM - 1;
    if (mSuggest < 1) { mSuggest = 12; ySuggest--; }
    if (mSuggest === S.m && ySuggest === S.y) return false; // đúng tháng rồi — im lặng, đúng luật cũ
    moHopLechThang(mSuggest, ySuggest, modeM, modeY, [...tenMoi], paths);
    return true;
  }
  function moHopLechThang(mSuggest, ySuggest, modeM, modeY, tenFiles, paths) {
    xacNhan('⚠ File có thể thuộc tháng khác',
      `Phần lớn giao dịch trong ${tenFiles.length === 1 ? `file "${tenFiles[0]}"` : `${tenFiles.length} file vừa nạp`} ` +
      `có ngày thuộc Tháng ${modeM}/${modeY}. Theo thói quen thu tiền (học phí một tháng thường đóng vào khoảng ` +
      `ngày 16 tháng SAU), file này khả năng cao là học phí Tháng ${mSuggest}/${ySuggest} — nhưng đang được nạp ` +
      `vào Tháng ${S.m}/${S.y}. (Bấm Hủy = để nguyên tháng này; giao dịch khớp chắc sẽ CHỜ trong bảng Sửa tay, không tự vào Tháng.)`,
      `Chuyển sang Tháng ${mSuggest}/${ySuggest}`, async () => {
        baoToast('Đang chuyển sang Tháng ' + mSuggest + '/' + ySuggest + '…');
        const mCu = S.m; const yCu = S.y;
        for (const ten of tenFiles) await goi('xoaSaoKe', mCu, yCu, ten);
        S.m = mSuggest; S.y = ySuggest;
        await goi('napSaoKe', S.m, S.y, paths);
        await napThang();
        luuThangCuoiXem();
        await tuVaoThangChac(`Đã chuyển sang Tháng ${mSuggest}/${ySuggest} và nạp lại sao kê ở đó`);
      });
  }

  function demUngVienXacNhan() {
    const kq = S.du.ketQuaGiaoDich;
    let dem = 0; let tong = 0;
    for (const mm of kq.matched) {
      if (mm.ti < 0) continue;
      const tx = kq.txns[mm.ti];
      if (!tx || tx.daXacNhanRoi) continue;
      if ((mm.via === 'L0' || mm.via === 'L2') && !mm.daDuyet) continue;
      dem++; tong += tx.amount;
    }
    return { dem, tong };
  }
  let dangXacNhan = false;
  async function moXacNhan() {
    if (dangXacNhan) return;
    if (!soChoXacNhan()) { baoToast('Chưa có sửa tay nào đang chờ — gán / bấm "Đúng rồi" ở bảng giao dịch trước.'); return; }
    dangXacNhan = true;
    try {
      const n = ((S.du.thang || {}).suaTay || []).length;
      const kq = await goi('xacNhanGiaoDich', S.m, S.y);
      await napThang();
      baoToast(`Đã áp dụng ${n} sửa tay · ${kq.them} giao dịch vào Tháng ${S.m}/${S.y}.`);
    } catch (e) { /* goi() đã báo */ } finally { dangXacNhan = false; }
  }
  function moCtxXacNhan(x, y) {
    const soDaXacNhan = ((S.du.thang || {}).xacNhan || []).length;
    const el = $('#ctxXacNhan');
    el.innerHTML = `
      <div class="muc tt">Đã xác nhận <b>${soDaXacNhan}</b> giao dịch tháng ${S.m}/${S.y}</div>
      <hr>
      <div class="muc" id="ctxXemXacNhan">Xem / hủy giao dịch đã xác nhận…</div>
      <div class="muc" id="ctxLamSach">Làm sạch màn hình Giao dịch…</div>`;
    datViTriCtx(el, x, y);
    $('#ctxXemXacNhan').onclick = () => { dongCtx(); moHopDsXacNhan(); };
    $('#ctxLamSach').onclick = () => {
      dongCtx();
      xacNhan('Làm sạch màn hình Giao dịch',
        `Xoá file/giao dịch/gán tay/duyệt mẫu đang TẠM ở Giao dịch tháng ${S.m}/${S.y}. ` +
        `${soDaXacNhan} giao dịch ĐÃ XÁC NHẬN ở Tháng KHÔNG bị đụng.`,
        'Làm sạch', async () => {
          await goi('lamSachGiaoDich', S.m, S.y);
          await napThang();
          baoToast('Đã làm sạch màn hình Giao dịch.');
        });
    };
  }
  function moHopDsXacNhan() {
    const ds = ((S.du.thang || {}).xacNhan || []).slice().sort((a, b) => (b.luc || '').localeCompare(a.luc || ''));
    $('#hopDsXacNhan').innerHTML = `
      <h3>Giao dịch đã xác nhận — Tháng ${S.m}/${S.y} <span style="color:var(--text-dim);font-weight:600">(${ds.length})</span></h3>
      <p class="mota">Đây là dữ liệu CHÍNH THỨC đang nuôi trang Tháng. Hủy 1 dòng ở đây thì em/nhà đó
        trở lại CHƯA ĐÓNG ở trang Tháng — không đụng gì tới file/giao dịch tạm ở Giao dịch.</p>
      <div class="cuon" style="max-height:48vh">
        <table class="bang"><thead><tr><th>Nội dung</th><th style="text-align:right">Số tiền</th><th>Ngày</th><th style="width:70px"></th></tr></thead>
          <tbody>${ds.length ? ds.map((x) => `<tr data-khoa="${esc(x.khoa)}">
              <td>${esc(x.content)}</td><td class="sotien">${vnd(x.amount)}</td>
              <td style="color:var(--text-dim);font-size:12px">${esc((x.ngay || '').split(' ')[0])}</td>
              <td><button class="btn nho" data-huyXn="${esc(x.khoa)}">Hủy</button></td>
            </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:20px">Chưa xác nhận giao dịch nào.</td></tr>'}
          </tbody></table>
      </div>
      <div class="hangnut"><span class="keo"></span><button class="btn" data-dong>Đóng</button></div>`;
    $('#manDsXacNhan').classList.add('on');
    $$('#hopDsXacNhan [data-huyXn]').forEach((b) => {
      b.onclick = () => {
        const khoa = b.getAttribute('data-huyXn');
        const tr = b.closest('tr');
        const noiDung = tr.children[0].textContent;
        $('#hopMotPhan').innerHTML = `
          <h3>Hủy giao dịch đã xác nhận</h3>
          <p class="mota">Hủy "<b>${esc(noiDung)}</b>"? Em/nhà liên quan sẽ trở lại CHƯA ĐÓNG ở trang Tháng.</p>
          <div class="hangnut">
            <button class="btn primary" id="xnOk">Hủy giao dịch này</button>
            <button class="btn" id="xnHuy2">Không</button>
          </div>`;
        $('#manMotPhan').classList.add('on');
        $('#xnHuy2').onclick = () => $('#manMotPhan').classList.remove('on');
        $('#xnOk').onclick = async () => {
          $('#manMotPhan').classList.remove('on');
          await goi('huyXacNhan', S.m, S.y, khoa);
          await napThang();
          moHopDsXacNhan(); // vẽ lại danh sách (đã bớt 1 dòng) mà không đóng modal cha
          baoToast('Đã hủy giao dịch đã xác nhận.');
        };
      };
    });
  }

  async function napNoPhi() {
    try { S.no = await goi('docNoPhi'); } catch (_) { S.no = { o: [], soDong: 0 }; }
    veNoPhi();
    if (S.du) veLuoiLop();
    napChuaGanNhan();
    napTamUng();
  }
  async function napTamUng() {
    try { S.tamUng = await goi('docTamUng'); } catch (_) { S.tamUng = []; }
    if (S.du) veLuoiLop();
  }
  function tamUngCuaHs(hsId) { return (S.tamUng || []).find((x) => String(x.hsId) === String(hsId)) || null; }
  function conDuBadge(u) {
    if (u.kind === 'fam' || !u.hsId) return '';
    const t = tamUngCuaHs(u.hsId);
    if (!t || !t.soDu) return '';
    return `<span class="ghichu con-du">còn dư: ${vnd(t.soDu)}</span>`;
  }
  async function napChuaGanNhan() {
    try { S.chuaGan = await goi('chuaGanNhan'); } catch (_) { S.chuaGan = []; }
    veChuaGanNhan();
  }
  function veChuaGanNhan() {
    const ds = S.chuaGan || [];
    const khu = $('#khuChuaGanNhan');
    if (!ds.length) { khu.innerHTML = ''; return; }
    const soThang = new Set(ds.map((d) => d.y + '-' + d.m)).size;
    let thangTruoc = null;
    const hang = ds.map((d, i) => {
      const khoaThang = d.y + '-' + d.m;
      const vach = (soThang >= 2 && thangTruoc !== null && khoaThang !== thangTruoc) ? '<div class="hs-vach"></div>' : '';
      thangTruoc = khoaThang;
      return vach + `
          <div class="no-dong" data-i="${i}">
            <span class="kythang">${esc(d.ten)}</span>
            <small style="color:var(--text-dim)">${esc(d.lop)} · Tháng ${d.m}/${d.y}</small>
            <span class="tien">${vnd(d.soTien)}đ</span>
            <span class="nutnho">
              <button class="btn nho" data-ganNo="${i}">Nợ phí</button>
              <button class="btn nho" data-ganSau="${i}">Đóng sau</button>
            </span>
          </div>`;
    }).join('');
    khu.innerHTML = `
      <div class="lop-card glass" style="margin-top:14px">
        <h3>⚠ Chưa gắn nhãn <span class="dem">${ds.length} lượt · tháng trước</span></h3>
        <p class="mota">Còn chưa đóng ở tháng trước nhưng chưa được đánh dấu Nợ phí hay Đóng sau.
          Gắn nhãn ngay bên dưới, xong dòng này sẽ tự biến mất và chuyển vào đúng ô của em/nhà đó.</p>
        <div class="co-mo-day"><div class="cuon-noibo" id="cuonChuaGanNhan">${hang}</div></div>
      </div>`;
    const cn = $('#cuonChuaGanNhan');
    const capNhatMoDay = () => {
      const con = cn.scrollHeight - cn.scrollTop - cn.clientHeight > 2;
      cn.parentElement.classList.toggle('co-an', con);
    };
    cn.onscroll = capNhatMoDay;
    capNhatMoDay();
    const ganNhan = (i, kieu) => async () => {
      const d = ds[i];
      await goi('themNoPhi', {
        loai: d.loai, kieu, hsId: d.hsId, idNha: d.idNha, m: d.m, y: d.y,
        soTien: d.soTien, tenLuc: d.ten, lopLuc: d.lop,
      });
      await napNoPhi();
      baoToast(`Đã gắn ${kieu === 'sau' ? 'Đóng sau' : 'Nợ phí'} cho ${d.ten} — tháng ${d.m}/${d.y}.`);
    };
    $$('#khuChuaGanNhan [data-ganNo]').forEach((b) => { b.onclick = ganNhan(parseInt(b.getAttribute('data-ganNo'), 10), 'no'); });
    $$('#khuChuaGanNhan [data-ganSau]').forEach((b) => { b.onclick = ganNhan(parseInt(b.getAttribute('data-ganSau'), 10), 'sau'); });
  }
  function veNoPhi() {
    const dl = S.no || { o: [], soDong: 0 };
    const tongTien = dl.o.reduce((s, o) => s + (o.tong || 0), 0);
    const dem = $('#demNoPhi');
    dem.textContent = dl.o.length;
    dem.hidden = !dl.o.length;
    const soSau = dl.o.reduce((s, o) => s + o.dong.filter((d) => d.kieu === 'sau').length, 0);
    $('#chipNoPhi').innerHTML = dl.o.length
      ? `<div class="omdem">
           <span class="o do">Tổng <b>${vnd(tongTien)}đ</b></span>
           <span class="o">${dl.o.length} người · ${dl.soDong} khoản</span>
           ${soSau ? `<span class="o amber">Đóng sau <b>${soSau}</b></span>` : ''}
         </div>`
      : '';
    const luoi = $('#luoiNoPhi');
    if (!dl.o.length) {
      luoi.innerHTML = `<div class="lop-card glass"><h3>Chưa có khoản nợ nào</h3>
        <p class="mota">Sang trang <b>Tháng</b>, chuột phải vào tên một em (hoặc một nhà) rồi chọn
        <b>Thêm vào nợ phí</b>. Khoản nợ sẽ hiện ở đây cho tới khi thầy bấm "Đã nộp bù".</p></div>`;
      return;
    }
    luoi.innerHTML = dl.o.map((o) => `
      <div class="lop-card glass">
        <h3>${esc(o.ten)} <span class="dem">${esc(o.lop || '')}</span></h3>
        ${o.mat ? '<div class="no-mat">⚠ Mã số này không còn trong danh sách myStudent (em đã nghỉ hẳn?) — tên hiển thị là tên lúc thêm nợ.</div>' : ''}
        ${o.dong.map((d) => `
          <div class="no-dong ${d.kieu === 'sau' ? 'sau' : 'no'}">
            <span class="kythang">Tháng ${d.m}/${d.y}</span>
            <i class="no-nhan ${d.kieu === 'sau' ? 'sau' : 'no'}">${d.kieu === 'sau' ? 'Đóng sau' : 'Nợ phí'}</i>
            <span class="tien">${vnd(d.soTien)}đ</span>
            <span class="nutnho">
              <button class="btn nho primary" data-nopbu="${esc(d.id)}">Đã nộp bù</button>
              <button class="btn nho" data-bodong="${esc(d.id)}" title="Thầy thêm nhầm dòng này — bỏ đi, KHÔNG đụng gì tới tháng cũ">Thêm nhầm</button>
            </span>
          </div>`).join('')}
        <div class="no-tong"><span>Tổng${o.tongSau && o.tongNo ? ` <small style="font-weight:600;color:var(--text-dim)">(nợ ${vnd(o.tongNo)} + đóng sau ${vnd(o.tongSau)})</small>` : ''}</span><span class="tien">${vnd(o.tong)}đ</span></div>
        <div class="hangnut" style="margin-top:8px">
          <button class="btn" data-hdtong="${esc(o.khoa)}">Hóa đơn tổng ${o.dong.length} tháng…</button>
        </div>
      </div>`).join('');

    $$('#luoiNoPhi [data-nopbu]').forEach((b) => {
      const id = b.getAttribute('data-nopbu');
      b.onclick = () => xacNhan('Xác nhận đã nộp bù',
        'Xoá khoản nợ này VÀ đánh dấu người đó ĐÃ ĐÓNG ở chính tháng cũ đó (mở lại tháng ấy sẽ thấy xanh).',
        'Đã nhận đủ tiền', async () => {
          const kq = await goi('nopBuNoPhi', id);
          await napNoPhi();
          if (S.trang === 'thang') await napThang();
          baoToast(kq.daDanhDauThangCu
            ? `Đã xoá nợ và đánh dấu đã đóng ở tháng ${kq.thang}.`
            : `Đã xoá nợ. ⚠ Không tìm thấy em/nhà này ở tháng ${kq.thang} nên KHÔNG đánh dấu được bên đó.`);
        });
    });
    $$('#luoiNoPhi [data-bodong]').forEach((b) => {
      const id = b.getAttribute('data-bodong');
      b.onclick = () => xacNhan('Bỏ dòng nợ này',
        'Chỉ xoá dòng khỏi danh sách nợ (thầy thêm nhầm). KHÔNG đánh dấu gì ở tháng cũ, không đụng tới tiền.',
        'Bỏ dòng này', async () => {
          await goi('xoaNoPhi', id);
          await napNoPhi(); baoToast('Đã bỏ dòng nợ.');
        });
    });
    $$('#luoiNoPhi [data-hdtong]').forEach((b) => {
      b.onclick = () => moHopHdTong(b.getAttribute('data-hdtong'));
    });
  }

  function xacNhan(tieuDe, mota, chuNut, hanhDong) {
    $('#hopMotPhan').innerHTML = `
      <h3>${esc(tieuDe)}</h3>
      <p class="mota">${esc(mota)}</p>
      <div class="hangnut">
        <button class="btn primary" id="xnOk">${esc(chuNut)}</button>
        <button class="btn" data-dong>Hủy</button>
      </div>`;
    $('#manMotPhan').classList.add('on');
    $('#xnOk').onclick = async () => { dongMan(); await hanhDong(); };
  }

  async function moHopHdTong(khoa) {
    const o = (S.no.o || []).find((x) => x.khoa === khoa);
    if (!o) return;
    $('#hopHdTong').innerHTML = `<h3>Hóa đơn tổng — ${esc(o.ten)}</h3><p class="mota">Đang dựng lịch từng tháng…</p>`;
    $('#manHdTong').classList.add('on');
    const khoi = [];
    for (const d of o.dong) {
      let u = null; let motPhan = 0;
      try {
        const du = await goi('docThang', d.m, d.y);
        u = o.loai === 'nha'
          ? du.ketQua.units.find((z) => z.kind === 'fam' && String(z.idNha) === String(o.idNha))
          : du.ketQua.units.find((z) => String(z.hsId) === String(o.hsId));
        const gd = u && ((du.thang || {}).ghiDe || {})[u.id];
        motPhan = Math.max(0, Math.round((gd && gd.dongMotPhan) || 0));
      } catch (_) { u = null; }  // tháng quá cũ / không đọc được sổ ngày → in phần tiền, bỏ lịch
      khoi.push({ m: d.m, y: d.y, soTien: Number(d.soTien) || 0, u: u || null, motPhan });
    }
    $('#hopHdTong').innerHTML = `
      <h3>Hóa đơn tổng — ${esc(o.ten)}</h3>
      <p class="mota">${o.dong.length} tháng còn nợ · tổng <b>${vnd(o.tong)}đ</b>. Số tiền là bản chụp lúc thầy thêm nợ.</p>
      <div class="hd-khung"><canvas id="hdTongCanvas" class="hd-anh"></canvas></div>
      <div class="hangnut">
        <button class="btn" id="hdtSaoChep">Sao chép ảnh</button>
        <button class="btn" id="hdtTaiAnh">Tải ảnh</button>
        <span class="keo"></span>
        <button class="btn" data-dong>Đóng</button>
      </div>`;
    veHoaDonTong(o, khoi);
    $('#hdtSaoChep').onclick = async () => {
      await goi('saoChepAnh', $('#hdTongCanvas').toDataURL('image/png'));
      baoToast('Đã sao chép ảnh hóa đơn tổng.');
    };
    $('#hdtTaiAnh').onclick = async () => {
      const p = await goi('ghiHoaDon', `NO PHI/${o.ten} - ${o.dong.length} thang.png`, $('#hdTongCanvas').toDataURL('image/png'));
      baoToast('Đã lưu: ' + p);
    };
  }


  function veCaiDat() {
    const cd = S.du.caiDat;
    const lops = Object.keys(cd.lop || {}).sort();
    $('#thanCdLop').innerHTML = lops.map((L) => {
      const c = cd.lop[L];
      return `<tr data-lop="${esc(L)}">
        <td style="font-weight:800">${esc(L)}</td>
        <td><input type="checkbox" class="cdThu" ${c.thu ? 'checked' : ''}></td>
        <td><input type="number" class="cdGia" value="${c.donGia}" step="10000"></td>
        <td><input type="number" class="cdTran" value="${c.tran}" step="100000"></td>
        <td><input type="number" class="cdGiam" value="${c.giamPct}" min="0" max="100"></td>
        <td><input type="number" class="cdHeSo" value="${c.heSoBuoi}" min="1" max="2"></td>
        <td style="white-space:nowrap" title="v0.23.0 — từ ngày này 1 buổi tính theo hệ số mới (vd lớp chuyển cuối tuần → trong tuần). Trống = không đổi.">
          <input type="date" class="cdDoiNgay" value="${esc(((c.doiHeSo || [])[0] || {}).tuNgay || '')}" style="width:130px">
          → <input type="number" class="cdDoiHeSo" value="${((c.doiHeSo || [])[0] || {}).heSoBuoi || ''}" min="1" max="2" style="width:52px"></td>
      </tr>`;
    }).join('');
    $$('#thanCdLop tr').forEach((tr) => {
      tr.querySelectorAll('input').forEach((inp) => {
        inp.onchange = async () => {
          const L = tr.dataset.lop;
          const nDoi0 = tr.querySelector('.cdDoiNgay').value; const hDoi0 = tr.querySelector('.cdDoiHeSo').value.trim();
          const laODoi = inp.classList.contains('cdDoiNgay') || inp.classList.contains('cdDoiHeSo');
          if (laODoi && !!nDoi0 !== !!hDoi0) { baoToast(`Lớp ${L}: điền nốt ${nDoi0 ? 'hệ số mới' : 'ngày bắt đầu'} để lưu đổi hệ số.`); return; }
          const patch = { lop: {} };
          patch.lop[L] = {
            thu: tr.querySelector('.cdThu').checked,
            donGia: parseInt(tr.querySelector('.cdGia').value, 10) || 150000,
            tran: parseInt(tr.querySelector('.cdTran').value, 10) || 0,
            giamPct: parseInt(tr.querySelector('.cdGiam').value, 10) || 0,
            heSoBuoi: parseInt(tr.querySelector('.cdHeSo').value, 10) || 1,
          };
          const nDoi = tr.querySelector('.cdDoiNgay').value; const hDoi = parseInt(tr.querySelector('.cdDoiHeSo').value, 10) || 0;
          patch.lop[L].doiHeSo = nDoi && hDoi ? [{ tuNgay: nDoi, heSoBuoi: hDoi }] : (!nDoi0 && !hDoi0 ? [] : ((cd.lop[L] || {}).doiHeSo || []));
          await goi('ghiCaiDat', patch);
          await napThang();
          const dh = patch.lop[L].doiHeSo[0];
          baoToast('Đã lưu mức phí lớp ' + L + (dh ? ` — từ ${dh.tuNgay.split('-').reverse().join('/')} tính hệ số ${dh.heSoBuoi}` : '') + '.');
        };
      });
    });
    veThangBatDau(cd);
    veMocDoiLop(cd);
  }

  function veMocDoiLop(cd) {
    const o = $('#cdMocDoiLop'); if (!o) return;
    const ds = Array.isArray(cd.mocDoiLop) ? cd.mocDoiLop : ['2026-09-21'];
    if (document.activeElement !== o) o.value = ds.map((s) => String(s).split('-').reverse().join('/')).join(', ');
    $('#nutLuuMocDoiLop').onclick = async () => {
      const raw = o.value.split(',').map((s) => s.trim()).filter(Boolean);
      const iso = [];
      for (const s of raw) {
        const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
        if (!m) { baoToast('Ngày chưa đúng dạng dd/mm/yyyy: ' + s); return; }
        iso.push(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
      }
      await goi('ghiCaiDat', { mocDoiLop: iso });
      await napThang(); baoToast(iso.length ? 'Đã lưu mốc đổi lớp.' : 'Đã bỏ mốc đổi lớp.');
    };
  }

  const TEN_THANG = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  function veThangBatDau(cd) {
    const sel = $('#cdThangBd');
    sel.innerHTML = TEN_THANG.slice(1).map((t, i) => `<option value="${i + 1}">${t}</option>`).join('');
    const tbd = cd.thangBatDau;
    sel.value = tbd ? tbd.m : (new Date().getMonth() + 1);
    $('#cdNamBd').value = tbd ? tbd.y : new Date().getFullYear();
    $('#tomTatThangBd').textContent = tbd
      ? `Đang giới hạn từ ${TEN_THANG[tbd.m]}/${tbd.y} trở về sau. Tháng cũ hơn sẽ không hiện.`
      : 'Hiện KHÔNG giới hạn — mọi tháng có dữ liệu đều xem được.';
    $('#nutLuuThangBd').onclick = async () => {
      const m = parseInt(sel.value, 10);
      const y = parseInt($('#cdNamBd').value, 10);
      if (!y || y < 2020 || y > 2100) { baoToast('Năm không hợp lệ.'); return; }
      const moi = await goi('ghiCaiDat', { thangBatDau: { m, y } });
      S.du.caiDat = moi;
      veThangBatDau(moi);
      baoToast(`Đã lưu mốc: từ ${TEN_THANG[m]}/${y} trở về sau.`);
    };
    $('#nutBoThangBd').onclick = async () => {
      const moi = await goi('ghiCaiDat', { thangBatDau: null });
      S.du.caiDat = moi;
      veThangBatDau(moi);
      baoToast('Đã bỏ giới hạn tháng.');
    };
  }
  function conLuiDuocThang(m, y, cd) {
    const tbd = (cd || {}).thangBatDau;
    if (!tbd) return true;
    let mm = m - 1; let yy = y; if (mm < 1) { mm = 12; yy--; }
    return yy > tbd.y || (yy === tbd.y && mm >= tbd.m);
  }
  function conToiDuocThang(m, y) {
    const hn = new Date();
    const mHt = hn.getMonth() + 1; const yHt = hn.getFullYear();
    return y < yHt || (y === yHt && m < mHt);
  }
  function luuThangCuoiXem() {
    goi('ghiCaiDat', { thangCuoiXem: { m: S.m, y: S.y } }).catch(() => {});
  }

  const HM = { ds: [], loc: '', dangSua: null };
  async function moHopHocMay() {
    HM.ds = await goi('dsHocMay');
    HM.loc = ''; HM.dangSua = null;
    veHopHocMay();
    $('#manHocMay').classList.add('on');
  }
  function veHopHocMay() {
    const q = HM.loc.toUpperCase();
    const ds = HM.ds.filter((m) => !q
      || m.noidung.toUpperCase().includes(q) || m.chutk.toUpperCase().includes(q) || m.target.toUpperCase().includes(q))
      .sort((a, b) => (b.hocLuc || '').localeCompare(a.hocLuc || ''));
    $('#hopHocMay').innerHTML = `
      <h3>Dữ liệu đã học <span style="color:var(--text-dim);font-weight:600">(${HM.ds.length} mẫu)</span></h3>
      <p class="mota">Mỗi mẫu là 1 lần thầy Gán tay có tick "Ghi nhớ mẫu này" — tháng sau nội dung
        chuyển khoản tương tự sẽ tự khớp đúng em/nhà đó. Sửa/xoá tự do, mỗi lần sửa tự sao lưu bản cũ.</p>
      <input class="timkiem" id="hmTim" placeholder="Gõ nội dung / chủ TK / tên em để lọc…" value="${esc(HM.loc)}">
      <div class="cuon" style="max-height:48vh">
        <table class="bang"><thead><tr>
          <th>Nội dung CK</th><th>Chủ TK</th><th>Gán cho</th><th style="width:130px">Học lúc</th><th style="width:110px"></th>
        </tr></thead><tbody id="hmThan">
          ${ds.length ? ds.map((m) => veHangHocMay(m)).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:20px">Không có mẫu nào khớp.</td></tr>'}
        </tbody></table>
      </div>
      <div class="hangnut"><span class="keo"></span><button class="btn" data-dong>Đóng</button></div>`;
    $('#hmTim').oninput = () => { HM.loc = $('#hmTim').value; veHopHocMay(); $('#hmTim').focus(); };
    gaiHangHocMay();
  }
  function veHangHocMay(m) {
    if (HM.dangSua === m.id) {
      return `<tr data-id="${esc(m.id)}" class="dangSua">
        <td><input class="hmNoiDung" value="${esc(m.noidung)}"></td>
        <td><input class="hmChuTk" value="${esc(m.chutk)}"></td>
        <td><input class="hmTarget" value="${esc(m.target)}"></td>
        <td style="color:var(--text-dim);font-size:11px">${esc((m.hocLuc || '').slice(0, 10))}</td>
        <td><button class="btn nho primary" data-luuHm="${esc(m.id)}">Lưu</button>
            <button class="btn nho" data-huyHm="1">Hủy</button></td>
      </tr>`;
    }
    return `<tr data-id="${esc(m.id)}">
      <td>${esc(m.noidung)}</td>
      <td>${esc(m.chutk) || '<span style="color:var(--text-dim)">—</span>'}</td>
      <td style="font-weight:700">${esc(m.target)}</td>
      <td style="color:var(--text-dim);font-size:11px">${esc((m.hocLuc || '').slice(0, 10))}</td>
      <td><button class="btn nho" data-suaHm="${esc(m.id)}">Sửa</button>
          <button class="btn nho" data-xoaHm="${esc(m.id)}">Xoá</button></td>
    </tr>`;
  }
  function gaiHangHocMay() {
    $$('#hmThan [data-suaHm]').forEach((b) => {
      b.onclick = () => { HM.dangSua = b.getAttribute('data-suaHm'); veHopHocMay(); };
    });
    $$('#hmThan [data-huyHm]').forEach((b) => { b.onclick = () => { HM.dangSua = null; veHopHocMay(); }; });
    $$('#hmThan [data-luuHm]').forEach((b) => {
      b.onclick = async () => {
        const id = b.getAttribute('data-luuHm');
        const tr = b.closest('tr');
        const patch = {
          noidung: tr.querySelector('.hmNoiDung').value.trim(),
          chutk: tr.querySelector('.hmChuTk').value.trim(),
          target: tr.querySelector('.hmTarget').value.trim(),
        };
        if (!patch.target) { baoToast('"Gán cho" không được để trống.'); return; }
        const moi = await goi('suaHocMay', id, patch);
        const i = HM.ds.findIndex((x) => x.id === id);
        if (i >= 0) HM.ds[i] = moi;
        HM.dangSua = null; veHopHocMay();
        baoToast('Đã lưu mẫu.');
      };
    });
    $$('#hmThan [data-xoaHm]').forEach((b) => {
      b.onclick = () => {
        const id = b.getAttribute('data-xoaHm');
        const m = HM.ds.find((x) => x.id === id);
        $('#hopMotPhan').innerHTML = `
          <h3>Xoá mẫu đã học</h3>
          <p class="mota">Xoá mẫu "<b>${esc(m ? m.noidung : '')}</b>" → <b>${esc(m ? m.target : '')}</b>?
            Vẫn sao lưu bản cũ trước khi xoá.</p>
          <div class="hangnut">
            <button class="btn primary" id="xnOk">Xoá mẫu này</button>
            <button class="btn" id="xnHuy">Hủy</button>
          </div>`;
        $('#manMotPhan').classList.add('on');
        $('#xnHuy').onclick = () => $('#manMotPhan').classList.remove('on');
        $('#xnOk').onclick = async () => {
          $('#manMotPhan').classList.remove('on');
          await goi('xoaHocMay', id);
          HM.ds = HM.ds.filter((x) => x.id !== id);
          veHopHocMay();
          baoToast('Đã xoá mẫu.');
        };
      };
    });
  }

  const QL = { tab: 'hs', nhap: null, hs: [] };

  async function moHopQlHs() {
    QL.hs = await goi('dsHocSinh');
    QL.nhap = (S.du.giaDinh.families || []).map((f) => ({
      id: f.id, ten: f.ten, giamPct: f.giamPct || 0, ids: (f.members || []).map((m) => m.id),
    }));
    QL.tab = 'hs';
    veQlHs();
    $('#manQlHs').classList.add('on');
  }

  function tenCuaId(id) {
    const h = QL.hs.find((x) => String(x.id) === String(id));
    return h ? h : { id, ten: '(mã ' + id + ' không còn)', lop: '', mat: true };
  }

  function veQlHs() {
    $('#hopQlHs').innerHTML = `
      <h3>Quản lý học sinh</h3>
      <div class="qlhs-tab">
        <button class="${QL.tab === 'hs' ? 'on' : ''}" data-tab="hs">Học sinh</button>
        <button class="${QL.tab === 'gd' ? 'on' : ''}" data-tab="gd">Gia đình nhiều con</button>
      </div>
      <div class="cuon" style="max-height:60vh" id="qlThan"></div>
      <div class="hangnut">
        ${QL.tab === 'gd' ? '<button class="btn" id="qlThemNha">+ Thêm gia đình</button><span class="keo"></span>' : ''}
        <button class="btn primary" id="qlLuu">Lưu</button>
        <button class="btn" data-dong>Đóng</button>
      </div>`;
    $$('#hopQlHs .qlhs-tab button').forEach((b) => {
      b.onclick = () => { QL.tab = b.dataset.tab; veQlHs(); };
    });
    if (QL.tab === 'hs') veQlTabHs(); else veQlTabGd();
    $('#qlLuu').onclick = luuQlHs;
    const themNha = $('#qlThemNha');
    if (themNha) {
      themNha.onclick = () => {
        QL.nhap.push({ id: 'n' + Date.now().toString(36), ten: '', giamPct: 15, ids: [] });
        veQlHs();
      };
    }
  }

  function veQlTabHs() {
    const cd = S.du.caiDat;
    const trongNha = new Set(QL.nhap.flatMap((f) => f.ids.map(String)));
    const theoLop = {};
    for (const h of QL.hs) (theoLop[h.lop] = theoLop[h.lop] || []).push(h);
    const lops = Object.keys(theoLop).sort();
    $('#qlThan').innerHTML = `
      <p class="mota">Tiểu học = trần cứng 1.000.000đ (thắng mọi trần riêng). Trần 0 = không trần.
        Muốn bỏ mức riêng của em nào thì gõ về 0 + bỏ tick rồi bấm Lưu — em đó quay về mức
        mặc định của lớp. Em thuộc gia đình nhiều con vẫn cài mức riêng ở đây bình thường —
        phần giảm của CẢ NHÀ nằm ở tab bên cạnh.</p>` +
      lops.map((lop) => `
        <div class="qlhs-lop">
          <h4>${esc(lop)}</h4>
          <table class="bang"><thead><tr><th>Em</th><th style="width:80px">Tiểu học</th><th style="width:90px">Giảm %</th><th style="width:120px">Trần riêng</th></tr></thead>
            <tbody>${theoLop[lop].sort((a, b) => a.ten.localeCompare(b.ten, 'vi')).map((h) => {
              const cat = (cd.hocSinh || {})[lop + '|' + khoaTen(h.ten)] || {};
              return `<tr data-lop="${esc(lop)}" data-ten="${esc(h.ten)}">
                <td style="font-weight:700" class="${cat.tieuHoc ? 'la' : ''}">${esc(h.ten)}${cat.tieuHoc ? ' <span class="th-nhan">(Tiểu học)</span>' : ''}${trongNha.has(String(h.id)) ? ' <small style="color:var(--text-dim)">· gia đình</small>' : ''}</td>
                <td><input type="checkbox" class="qlTieuHoc" ${cat.tieuHoc ? 'checked' : ''}></td>
                <td><input type="number" class="qlGiam" value="${cat.giamPct || 0}" min="0" max="100" style="width:64px"></td>
                <td><input type="number" class="qlTran" value="${cat.tran || 0}" step="100000" style="width:110px"></td>
              </tr>`;
            }).join('')}</tbody></table>
        </div>`).join('');
    $$('#qlThan .qlTieuHoc').forEach((cb) => {
      cb.onchange = () => {
        const td = cb.closest('tr').querySelector('td');
        const nhan = td.querySelector('.th-nhan');
        if (cb.checked && !nhan) td.insertAdjacentHTML('beforeend', ' <span class="th-nhan">(Tiểu học)</span>');
        if (!cb.checked && nhan) nhan.remove();
        td.classList.toggle('la', cb.checked);
      };
    });
  }

  function veQlTabGd() {
    $('#qlThan').innerHTML = `
      <p class="mota">Cần đóng cả nhà = tổng phí từng con (đã tính trần riêng, chưa giảm lẻ) trừ
        % giảm của nhà, làm tròn xuống 50.000đ. Nhóm khoá theo MÃ SỐ học sinh nên đổi tên bên
        myStudent không ảnh hưởng gì.</p>` +
      (QL.nhap.length ? QL.nhap.map((f, i) => `
        <div class="nha-khoi" data-i="${i}">
          <div class="nha-dau">
            <input type="text" class="nhaTen" value="${esc(f.ten)}" placeholder="Tên nhà (để trống = ghép tên các em)">
            <label>Giảm % <input type="number" class="nhaGiam" value="${f.giamPct}" min="0" max="100"></label>
            <button class="btn nho" data-xoaNha="${i}">Xóa nhà</button>
          </div>
          <div class="nha-mems">
            ${f.ids.map((id) => {
              const h = tenCuaId(id);
              return `<span class="nha-chip ${h.mat ? 'mat' : ''}">${esc(h.ten)}${h.lop ? ` <small>${esc(h.lop)}</small>` : ''}
                <button data-botMem="${i}|${id}" title="Bớt em này">✕</button></span>`;
            }).join('')}
            <button class="btn nho" data-themMem="${i}">+ Thêm em</button>
          </div>
        </div>`).join('') : '<p class="mota">Chưa có gia đình nào — bấm "+ Thêm gia đình" bên dưới.</p>');

    $$('#qlThan [data-xoaNha]').forEach((b) => {
      b.onclick = () => {
        const i = parseInt(b.getAttribute('data-xoaNha'), 10);
        docNhapTuMan();
        QL.nhap.splice(i, 1);
        veQlHs();
      };
    });
    $$('#qlThan [data-botMem]').forEach((b) => {
      b.onclick = () => {
        const [i, id] = b.getAttribute('data-botMem').split('|');
        docNhapTuMan();
        const f = QL.nhap[parseInt(i, 10)];
        f.ids = f.ids.filter((x) => String(x) !== String(id));
        veQlHs();
      };
    });
    $$('#qlThan [data-themMem]').forEach((b) => {
      b.onclick = () => { docNhapTuMan(); moChonHs(parseInt(b.getAttribute('data-themMem'), 10)); };
    });
  }

  function docNhapTuMan() {
    $$('#qlThan .nha-khoi').forEach((khoi) => {
      const f = QL.nhap[parseInt(khoi.dataset.i, 10)];
      if (!f) return;
      f.ten = khoi.querySelector('.nhaTen').value.trim();
      f.giamPct = parseInt(khoi.querySelector('.nhaGiam').value, 10) || 0;
    });
  }

  function moChonHs(iNha) {
    const daCo = new Set(QL.nhap.flatMap((f) => f.ids.map(String)));
    $('#hopChonHs').innerHTML = `
      <h3>Thêm em vào gia đình</h3>
      <p class="mota">Chỉ hiện các em CHƯA thuộc nhà nào.</p>
      <input class="timkiem" id="chonTim" placeholder="Gõ tên hoặc lớp để lọc…">
      <div class="chon-ds" id="chonDs"></div>
      <div class="hangnut"><button class="btn" id="chonDong">Đóng</button></div>`;
    $('#manChonHs').classList.add('on');
    function ve(loc) {
      const q = (loc || '').toUpperCase();
      const ds = QL.hs
        .filter((h) => !daCo.has(String(h.id)))
        .filter((h) => !q || h.ten.toUpperCase().includes(q) || h.lop.toUpperCase().includes(q))
        .sort((a, b) => (a.lop + a.ten).localeCompare(b.lop + b.ten, 'vi'));
      $('#chonDs').innerHTML = ds.map((h) =>
        `<div class="chon-hs" data-id="${h.id}"><span>${esc(h.ten)}</span><small>${esc(h.lop)}</small></div>`
      ).join('') || '<div class="chon-hs" style="color:var(--text-dim)">Không còn em nào.</div>';
      $$('#chonDs .chon-hs[data-id]').forEach((el) => {
        el.onclick = () => {
          QL.nhap[iNha].ids.push(parseInt(el.dataset.id, 10));
          $('#manChonHs').classList.remove('on');
          veQlHs();
        };
      });
    }
    ve('');
    $('#chonTim').oninput = () => ve($('#chonTim').value);
    $('#chonDong').onclick = () => $('#manChonHs').classList.remove('on');
  }

  async function luuQlHs() {
    if (QL.tab === 'hs') {
      const patch = { hocSinh: {} };
      $$('#qlThan tbody tr').forEach((tr) => {
        const k = tr.dataset.lop + '|' + khoaTen(tr.dataset.ten);   // v0.14.0 — khoá luôn TÊN IN HOA
        const cat = (S.du.caiDat.hocSinh || {})[k] || {};
        const tieuHoc = tr.querySelector('.qlTieuHoc').checked;
        const giamPct = parseInt(tr.querySelector('.qlGiam').value, 10) || 0;
        const tran = parseInt(tr.querySelector('.qlTran').value, 10) || 0;
        if (!tieuHoc && !giamPct && !tran) {
          if (Object.keys(cat).length) patch.hocSinh[k] = null;
          return;
        }
        patch.hocSinh[k] = Object.assign({ donGia: 150000 }, cat, { tieuHoc, giamPct, tran });
      });
      await goi('ghiCaiDat', patch);
    } else {
      docNhapTuMan();
      await goi('ghiGiaDinh', { families: QL.nhap });
    }
    dongMan(); await napThang(); baoToast('Đã lưu.');
  }

  function moCanhChinhTay(neo, u) {
    const g = ((S.du.thang || {}).ghiDe || {})[u.id] || {};
    const gt = g.giamThem || {};
    const mien = g.mienGiamPct === undefined || g.mienGiamPct === null ? '' : g.mienGiamPct;
    const pctCu = u.kind === 'fam' ? (u.giamPct || 0) : ((u.cat || {}).giamPct || 0);
    const el = moCanh(neo, `
      <div class="muc tt">✎ <b>Chỉnh tay tháng ${S.m}/${S.y}</b> — ${esc(u.label)}</div>
      <div class="cm-than">
        <label class="ct-nhan">Miễn giảm (%) <small>— trống = theo mức có sẵn (${pctCu}%)</small></label>
        <input type="number" id="ctMien" class="ct-o" min="0" max="100" step="1" value="${esc(String(mien))}" placeholder="${pctCu}">
        <label class="ct-nhan">Lý do giảm thêm</label>
        <input type="text" id="ctLyDo" class="ct-o" maxlength="120" value="${esc(gt.lyDo || '')}" placeholder="vd: nghỉ ốm dài ngày">
        <label class="ct-nhan">Giảm thêm</label>
        <div style="display:flex;gap:6px"><input type="number" id="ctGiam" class="ct-o" min="0" step="1" value="${gt.giaTri || ''}" style="flex:1">
          <select id="ctKieu" class="ct-o" style="width:78px"><option value="tien"${gt.kieu !== 'pct' ? ' selected' : ''}>đồng</option><option value="pct"${gt.kieu === 'pct' ? ' selected' : ''}>%</option></select></div>
        <div class="cm-phu" id="ctXem"></div>
        <div class="cm-nut"><button class="btn primary" id="ctLuuCT">Lưu</button><button class="btn" id="ctHuyCT">Hủy</button>
          ${(g.mienGiamPct !== undefined && g.mienGiamPct !== null) || g.giamThem ? '<button class="btn" id="ctBoCT" style="margin-left:auto">Bỏ chỉnh tay</button>' : ''}</div>
      </div>`);
    el.querySelector('#ctXem').textContent = `Hiện cần đóng: ${vnd(u.expected)}đ` + (u.chinhTay ? ` (gốc ${vnd(u.chinhTay.goc)}đ)` : '');
    setTimeout(() => { const o = $('#ctMien'); if (o) o.focus(); }, 30);
    const luu = async (patch, chu) => {
      await goi('ghiDeUnit', S.m, S.y, u.id, patch);
      dongCanh(); await napThang();
      moHopHd(u.id);
      baoToast(chu);
    };
    $('#ctHuyCT').onclick = () => dongCanh();
    $('#ctLuuCT').onclick = () => {
      const m = $('#ctMien').value.trim(); const v = Number($('#ctGiam').value) || 0;
      luu({
        mienGiamPct: m === '' ? null : Math.max(0, Math.min(100, Number(m) || 0)),
        giamThem: v > 0 ? { lyDo: $('#ctLyDo').value.trim(), kieu: $('#ctKieu').value === 'pct' ? 'pct' : 'tien', giaTri: v } : null,
      }, 'Đã lưu chỉnh tay tháng ' + S.m + '/' + S.y + '.');
    };
    if ($('#ctBoCT')) $('#ctBoCT').onclick = () => luu({ mienGiamPct: null, giamThem: null }, 'Đã bỏ chỉnh tay tháng này.');
  }

  function chuTat(ten) { const p = String(ten || '').trim().split(/\s+/); return ((p.length > 1 ? p[p.length - 2][0] : '') + (p[p.length - 1] || '?')[0]).toUpperCase(); }
  function ngayVN(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; }
  function veTtinHs(uid) {
    const kq = S.du.ketQua;
    const u = kq.units.find((x) => x.id === uid);
    const hop = $('#hdTtin');
    if (!u || !hop) return;
    const ds = u.kind === 'fam'
      ? (u.members || []).map((m) => ({ so: m.id, ten: m.ten, lop: m.lop, buoi: m.buoi, hocThu: m.hocThu }))
      : [{ so: u.hsId, ten: u.label, lop: (u.classes || [])[0] || '', buoi: u.buoi, hocThu: u.hocThu }];
    const gc = ghiChuCuaU(u);
    hop.innerHTML = ds.map((e, i) => `<div class="hd-em" data-i="${i}">
        <div class="av">${esc(chuTat(e.ten))}</div>
        <div class="tt"><div class="ten">${esc(e.ten)}</div>
          <div>Số học sinh <b>${esc(String(e.so || '—'))}</b> · Lớp tháng này <b>${esc(e.lop)}</b> · <b>${e.buoi}</b> buổi${e.hocThu ? ` (+${e.hocThu} học thử)` : ''}${ngayBdCua(e.so) ? ` · Tính phí từ <b>${esc(ngayBdCua(e.so).split('-').reverse().join('/'))}</b>` : ''}</div>
          <div class="them"></div></div></div>`).join('') +
      (gc ? `<div class="hd-gc">📝 ${esc(gc.chu)}</div>` : '');
    if (!(window.PayWeb && window.PayWeb.thongTinHs)) return;
    ds.forEach((e, i) => {
      window.PayWeb.thongTinHs(e.so).then((t) => {
        const o = hop.querySelector(`.hd-em[data-i="${i}"]`);
        if (!t || !o || !document.body.contains(o)) return;
        if (t.anh) o.querySelector('.av').innerHTML = `<img src="${t.anh}" alt="">`;
        if (t.ten) o.querySelector('.ten').textContent = t.ten;
        const phan = [];
        if (t.ma) phan.push(`ID <b>${esc(t.ma)}</b>`);
        if (t.ns) phan.push(`Sinh <b>${esc(ngayVN(t.ns) || t.ns)}</b>`);
        if (t.vao) phan.push(`Vào học <b>${esc(ngayVN(t.vao) || t.vao)}</b>`);
        phan.push(t.luuTru ? `<span class="nhan-lt">Lưu trữ / đã nghỉ</span>${t.lopCu && t.lopCu.length ? ` (lớp cũ ${esc(t.lopCu.join(', '))})` : ''}`
          : `Đang học <b>${esc((t.lopHoc || []).join(', ') || '—')}</b>`);
        o.querySelector('.them').innerHTML = phan.join(' · ');
      }).catch(() => {});
    });
  }

  function moHopHd(presetUid) {
    const kq = S.du.ketQua;
    const coThu = kq.units.filter((u) => u.buoi > 0);
    let dang = presetUid && kq.units.some((u) => u.id === presetUid) ? presetUid : null;
    let choDs = !dang;
    function ve() {
      $('#hopHd').innerHTML = `
        <h3>Hóa đơn tháng ${S.m}/${S.y}</h3>
        ${choDs ? `<input class="timkiem" id="hdTim" placeholder="Gõ tên để lọc…">
          <div class="chon-ds" id="hdDs" style="max-height:220px"></div>`
          : `<p class="mota"><a href="#" id="hdDoiNguoi">← Chọn người khác</a></p><div class="hd-ttin" id="hdTtin"></div>${phiCuChu(dang)}`}
        <div class="hd-khung"><canvas id="hdCanvas" class="hd-anh"></canvas></div>
        <div class="hangnut" id="hdHangNut" style="flex-wrap:wrap"></div>`;
      $('#manHd').classList.add('on');
      if (choDs) {
        function veDs(loc) {
          const q = (loc || '').toUpperCase();
          $('#hdDs').innerHTML = coThu
            .filter((u) => !q || u.label.toUpperCase().includes(q))
            .map((u) => `<div class="chon-hs ${dang === u.id ? 'dachon' : ''}" data-id="${esc(u.id)}">
              <span>${esc(u.label)}</span><small>${esc(u.classes.join(', '))}</small></div>`).join('');
          $$('#hdDs .chon-hs').forEach((el) => {
            el.onclick = () => { dang = el.dataset.id; choDs = false; ve(); };
          });
        }
        veDs('');
        $('#hdTim').oninput = () => veDs($('#hdTim').value);
        veHangNut();
        return;
      }
      $('#hdDoiNguoi').onclick = (e) => { e.preventDefault(); dang = null; choDs = true; ve(); };
      veHoaDonHop(dang);
      veTtinHs(dang);
      veHangNut();
    }
    function veHangNut() {
      veHangNutLai = veHangNut;
      const u = dang && kq.units.find((x) => x.id === dang);
      const daDong = u && (u.id in kq.done);
      $('#hdHangNut').innerHTML = !u ? '<button class="btn" data-dong>Đóng</button>' : `
        <button class="btn" id="hdSaoChep">Sao chép ảnh</button>
        <button class="btn" id="hdTaiAnh">Tải ảnh</button>
        <button class="btn hd-zalo" id="hdZalo" title="Chép ảnh hóa đơn + mở khung chat Zalo của phụ huynh (Ctrl+V để dán ảnh)">Gửi Zalo PH</button>
        <button class="btn hd-sdt" id="hdSdt" title="${sdtCua(u) ? 'Sửa số Zalo phụ huynh' : 'Thêm số Zalo phụ huynh'}">${sdtCua(u) ? '✎ ' + esc(sdtCua(u)) : '+ Số Zalo PH'}</button>
        <label class="btn hd-gui${daGuiCua(u) ? ' on' : ''}" title="Đánh dấu đã gửi hóa đơn tháng ${S.m}/${S.y} cho phụ huynh"><input type="checkbox" id="hdDaGui"${daGuiCua(u) ? ' checked' : ''}> Đã gửi${daGuiCua(u) ? ' <small>' + esc(gioGuiChu(daGuiCua(u))) + '</small>' : ''}</label>
        <button class="btn" id="hdChinhTay" title="Miễn giảm / giảm thêm RIÊNG tháng này">✎ Chỉnh tay${u.chinhTay ? ' •' : ''}</button>
        <button class="btn" id="hdDayWebEm" disabled title="Chưa mở — sẽ làm ở đợt sau">Đẩy web (em này)…</button>
        <span class="keo"></span>
        ${kq.chotTay && kq.chotTay[u.id]
          ? `<button class="btn" disabled title="Nháy đúp ngôi sao ★ ở trang Tháng để xem / bỏ">★ ${kq.chotTay[u.id].loai === 'tang' ? 'Được tặng học phí' : 'Đã chốt xong phí'}</button>`
          : `<button class="btn ${daDong ? '' : 'primary'}" id="hdDanhDauDong">${daDong ? '✓ Đã đóng — bỏ đánh dấu' : 'Đánh dấu ĐÃ ĐÓNG'}</button>`}
        <button class="btn" data-dong>Đóng</button>`;
      if (!u) return;
      $('#hdSaoChep').onclick = async () => {
        await goi('saoChepAnh', $('#hdCanvas').toDataURL('image/png'));
        baoToast('Đã sao chép ảnh hóa đơn.');
        moHopDaGui(u, veHangNut);
      };
      $('#hdDaGui').onchange = async (e) => { await ghiDaGui(u, e.target.checked); veHangNut(); };
      $('#hdSdt').onclick = (e) => { e.stopPropagation(); moCanhSdt($('#hdSdt'), u, null); };
      $('#hdZalo').onclick = async (e) => {
        e.stopPropagation();
        const guiDi = async () => {
          const sdt = sdtCua(u);
          await goi('saoChepAnh', $('#hdCanvas').toDataURL('image/png'));
          await goi('moLienKet', 'https://zalo.me/' + sdt);
          baoToast('Đã chép ảnh + mở Zalo ' + sdt + ' — bấm Ctrl+V rồi Enter để gửi.');
          moHopDaGui(u, veHangNut);
        };
        if (await chiaSeAnhDt(u)) return;
        if (sdtCua(u)) await guiDi();
        else moCanhSdt($('#hdZalo'), u, guiDi);
      };
      $('#hdChinhTay').onclick = (e) => { e.stopPropagation(); moCanhChinhTay($('#hdChinhTay'), u); };
      $('#hdTaiAnh').onclick = async () => {
        const ten = `${S.y}-${String(S.m).padStart(2, '0')}/${u.classes[0]} - ${u.label}.png`;
        const p = await goi('ghiHoaDon', ten, $('#hdCanvas').toDataURL('image/png'));
        baoToast('Đã lưu: ' + p);
      };
      if ($('#hdDanhDauDong')) $('#hdDanhDauDong').onclick = () => {
        $('#hdHangNut').innerHTML = `
          <span class="tt">${daDong ? 'Bỏ đánh dấu đã đóng của' : 'Xác nhận ĐÃ NHẬN tiền của'} <b>${esc(u.label)}</b>?</span>
          <span class="keo"></span>
          <button class="btn primary" id="hdXacNhanDong">Xác nhận</button>
          <button class="btn" id="hdHuyDanhDau">Hủy</button>`;
        $('#hdXacNhanDong').onclick = async () => {
          await goi('ghiDeUnit', S.m, S.y, u.id, daDong ? { daDong: false } : { daDong: true });
          await napThang();
          dang = u.id; choDs = false; ve();
          baoToast(daDong ? 'Đã bỏ đánh dấu.' : 'Đã đánh dấu đã đóng.');
        };
        $('#hdHuyDanhDau').onclick = () => veHangNut();
      };
    }
    ve();
  }

  function soNgayThang(m, y) { return new Date(y, m, 0).getDate(); }
  function cotNgay1(m, y) { const d = new Date(y, m - 1, 1).getDay(); return d === 0 ? 6 : d - 1; }
  const HD_TL = 2;
  const HD_F = { than: '"Be Vietnam Pro", "Segoe UI", sans-serif', mong: 'Montserrat, "Segoe UI", sans-serif', ld: 'Lexend, "Be Vietnam Pro", "Segoe UI", sans-serif' };
  const fHd = (w, px, ho, nghieng) => (nghieng ? 'italic ' : '') + w + ' ' + px + 'px ' + HD_F[ho || 'than'];
  const HD_TK = { stk: '102886342975', chu: 'HKD PHAM XUAN NINH' };
  const HD_QR = 'data:image/png;base64,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';
  const HD_LOGO = 'data:image/png;base64,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';   // VietinBank 186×48
  let hdSan = null;
  function hdChuanBi() {
    if (hdSan) return hdSan;
    const mo = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });
    let phong = Promise.resolve();
    if (document.fonts && document.fonts.load) {
      const ds = ['400', '500', '600', '700', '800'].map((w) => fHd(w, 16))
        .concat([fHd(400, 16, 'than', true), fHd(300, 16, 'mong'), fHd(600, 16, 'mong'), fHd(500, 16, 'ld')]);
      phong = Promise.race([Promise.all(ds.map((f) => document.fonts.load(f, 'Điểm đ').catch(() => null))), new Promise((ok) => setTimeout(ok, 3000))]);
    }
    hdSan = Promise.all([mo(HD_QR), mo(HD_LOGO), phong]).then(([qr, logo]) => ({ qr, logo }));
    return hdSan;
  }
  let hdNhap = null;   // canvas nháp để đo
  function hdDoG() { if (!hdNhap) hdNhap = document.createElement('canvas').getContext('2d'); return hdNhap; }
  function hdLs(g, ls) { if ('letterSpacing' in g) g.letterSpacing = (ls || 0) + 'px'; }
  function hdDo(g, s, f, ls) { g.font = f; hdLs(g, ls); const w = g.measureText(String(s)).width; hdLs(g, 0); return w; }
  function hdChu(g, s, x, y, f, mau, canh, ls) {
    g.font = f; g.fillStyle = mau; g.textAlign = canh || 'left'; g.textBaseline = 'alphabetic'; hdLs(g, ls);
    g.fillText(String(s), x + (ls ? (canh === 'right' ? ls : canh === 'center' ? ls / 2 : 0) : 0), y);
    hdLs(g, 0); g.textAlign = 'left';
  }
  function hdKhung(g, x, y, w, h, r, nen, vien, day) {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
    if (nen) { g.fillStyle = nen; g.fill(); }
    if (vien) { g.strokeStyle = vien; g.lineWidth = day || 1; g.stroke(); }
  }
  function hdVach(g, x1, y, x2, mau, net, day) {
    g.save(); g.strokeStyle = mau; g.lineWidth = day || 1; if (net) g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke(); g.restore();
  }
  function hdNgat(g, s, f, wMax) {
    g.font = f; hdLs(g, 0);
    const ra = []; let cur = '';
    for (const t of String(s || '').split(/\s+/).filter(Boolean)) {
      const thu = cur ? cur + ' ' + t : t;
      if (g.measureText(thu).width <= wMax) { cur = thu; continue; }
      if (cur) ra.push(cur);
      cur = t;
      while (cur.length > 1 && g.measureText(cur).width > wMax) {
        let i = cur.length - 1;
        while (i > 1 && g.measureText(cur.slice(0, i)).width > wMax) i--;
        ra.push(cur.slice(0, i)); cur = cur.slice(i);
      }
    }
    if (cur) ra.push(cur);
    return ra.length ? ra : [''];
  }
  function hdTich(g, x, y, co, doi) {
    const k = co / 24;
    g.save(); g.translate(x, y); g.scale(k, k);
    g.strokeStyle = '#12b04f'; g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    if (doi) { g.moveTo(3, 12.6); g.lineTo(7.4, 16.9); g.lineTo(17, 7.4); g.moveTo(14.4, 15.3); g.lineTo(16, 16.9); g.lineTo(25.6, 7.4); }
    else { g.moveTo(5, 12.6); g.lineTo(9.4, 16.9); g.lineTo(19, 7.4); }
    g.stroke(); g.restore();
  }
  function hdIcon(g, cx, cy, nha, r) {
    r = r || 30; const k = r / 30;
    g.save();
    g.fillStyle = '#e6f6f3'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.translate(cx - 15 * k, cy - 15 * k); g.scale(1.25 * k, 1.25 * k);
    g.strokeStyle = '#0f766e'; g.lineWidth = 1.8; g.lineCap = 'round'; g.lineJoin = 'round';
    const ds = nha ? ['M3 19.5c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6', 'M15.6 14.3c.5-.1 1-.2 1.6-.2 2.6 0 4.3 1.9 4.3 4.6']
      : ['M21.4 10.2 12 5 2.6 10.2 12 15.4l9.4-5.2z', 'M6.5 12.4v4.2c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-4.2', 'M21.4 10.2v5'];
    for (const p of ds) g.stroke(new Path2D(p));
    if (nha) { g.beginPath(); g.arc(9, 8, 3.2, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(17.2, 9.4, 2.5, 0, Math.PI * 2); g.stroke(); }
    g.restore();
  }
  function hoaDauHd(s) { s = String(s || '').trim(); return s ? s[0].toLocaleUpperCase('vi') + s.slice(1) : ''; }
  function khongDauHd(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D'); }
  const tienHd = (n) => vnd(Math.round(n || 0)) + ' đ';
  function hanNopHd(m, y) { return '16/' + String(m === 12 ? 1 : m + 1).padStart(2, '0') + '/' + (m === 12 ? y + 1 : y); }
  function gomConHd(mems) {
    const map = new Map();
    for (const x of mems || []) {
      const k = String(x.id);
      const o = map.get(k) || { so: x.id, ten: x.ten, lop: [], buoi: 0 };
      if (x.lop && !o.lop.includes(x.lop)) o.lop.push(x.lop);
      o.buoi += x.buoi || 0;
      map.set(k, o);
    }
    return [...map.values()].map((o) => Object.assign(o, { lop: o.lop.join(', ') }));
  }

  function hdVe(cv, W, veTat) {
    const H = Math.ceil(veTat(hdDoG()));
    cv.width = Math.ceil(W * HD_TL); cv.height = Math.ceil(H * HD_TL);
    const g = cv.getContext('2d');
    g.setTransform(HD_TL, 0, 0, HD_TL, 0, 0);
    g.imageSmoothingQuality = 'high';
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    veTat(g);
  }

  function hdDau(g, W, y0, d) {
    const top = y0 + 30; const R = W - 32;
    const coT = d.coThang || 30;
    const fT1 = fHd(300, coT, 'mong'); const fT2 = fHd(600, coT, 'mong');
    const wT2 = hdDo(g, d.thang, fT2);
    const rw = Math.max(hdDo(g, d.nhan, fHd(700, 12.5), 2.25), hdDo(g, 'Tháng ', fT1) + wT2);
    const xVach = R - rw - 18;
    let hKhoi; let ri; let chuTren; let chuDuoi;
    if (!d.nha) {
      hKhoi = 64; ri = 30;
      const xChu = 32 + ri * 2 + 16; const wChu = xVach - 16 - xChu;
      let co = 28; while (co > 18 && hdDo(g, d.ten, fHd(800, co)) > wChu) co--;
      hdChu(g, d.ten, xChu, top + 30, fHd(800, co), '#152036');
      hdChu(g, `Lớp ${d.lop} · Mã số học sinh ${d.so}`, xChu, top + 56, fHd(400, 15), '#5d6a82');
      chuTren = top + 30 - co * 0.74; chuDuoi = top + 56 + 4;
    } else {
      const con = d.con || [];
      hKhoi = 52 + con.length * 22;
      chuTren = top + 12 - 10; chuDuoi = top + 68 + (con.length - 1) * 22 + 4;
      ri = Math.max(30, Math.min(46, Math.round((chuDuoi - chuTren) * 0.42)));
      const xChu = 32 + ri * 2 + 18; const wChu = xVach - 16 - xChu;
      const tenNha = con.map((c) => c.ten).join(' + ');
      let co = 26; while (co > 16 && hdDo(g, tenNha, fHd(800, co)) > wChu) co--;
      hdChu(g, 'GIA ĐÌNH', xChu, top + 12, fHd(700, 13), '#8b96a9', 'left', 1.8);
      hdChu(g, tenNha, xChu, top + 42, fHd(800, co), '#152036');
      con.forEach((c, i) => {
        const yb = top + 68 + i * 22;
        hdChu(g, c.ten, xChu, yb, fHd(700, 14.5), '#152036');
        hdChu(g, ` · Lớp ${c.lop} · Mã số ${c.so}`, xChu + hdDo(g, c.ten, fHd(700, 14.5)), yb, fHd(400, 14.5), '#5d6a82');
      });
    }
    hdIcon(g, 32 + ri, (chuTren + chuDuoi) / 2, !!d.nha, ri);
    const giua = top + hKhoi / 2;
    g.fillStyle = '#e2e8f0'; g.fillRect(xVach, top + 2, 2, hKhoi - 4);
    hdChu(g, d.nhan, R, giua - 8, fHd(700, 12.5), d.mauNhan || '#0f766e', 'right', 2.25);
    hdChu(g, d.thang, R, giua + 22, fT2, '#152036', 'right');
    hdChu(g, 'Tháng ', R - wT2, giua + 22, fT1, '#152036', 'right');
    return 30 + hKhoi + 6;
  }

  function hdHangThu(g, x, y, cw, gap, co, cao) {
    ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].forEach((t, i) => {
      const cx = x + i * (cw + gap); const cuoi = i >= 5;
      hdChu(g, t, cx + cw / 2, y + cao - (co > 13 ? 11 : 7), fHd(800, co), cuoi ? '#0f766e' : '#334155', 'center', co * 0.06);
      g.fillStyle = cuoi ? '#99d6cf' : '#e2e8f0'; g.fillRect(cx, y + cao - 2, cw, 2);
    });
    return cao;
  }

  function hdLich(g, x, y, w, m, yr, ds, nha) {
    const gap = 8; const cw = (w - 6 * gap) / 7;
    let h = hdHangThu(g, x, y, cw, gap, 15, 36) + gap;
    const lech = cotNgay1(m, yr); const soNgay = soNgayThang(m, yr);
    const fLd = fHd(500, nha ? 11.5 : 12.5, 'ld');
    const ngay = [];
    for (let d = 1; d <= soNgay; d++) {
      const hom = [];
      for (const c of ds) { const b = (c.lich || []).find((z) => z.ngay === d); if (b) hom.push({ ten: c.ten, nhan: c.nhan || '', b }); }
      ngay.push(hom);
    }
    const fNhan = fHd(600, 10.5);
    const dongNha = (hom) => {
      const coMat = hom.some((z) => z.b.coMat);
      return hom.map((z) => {
        const them = z.nhan ? 13 : 0;
        if (z.b.coMat) return { z, kieu: z.b.hocThu ? 'thu' : 'co', h: 15 + them };
        const ld = hdNgat(g, hoaDauHd(z.b.lyDo) || 'Vắng', fLd, cw - 16 - (coMat ? 8 : 0));
        return { z, kieu: 'vang', nen: coMat, ld, h: (coMat ? 8 : 0) + 15 + them + 2 + ld.length * 14 };
      });
    };
    const veTen = (s, x0, yb, wMax, mau) => {
      let co = 12.5; while (co > 9.5 && hdDo(g, s, fHd(600, co)) > wMax) co -= 0.5;
      hdChu(g, s, x0, yb, fHd(600, co), mau);
    };
    const soHang = Math.ceil((lech + soNgay) / 7);
    for (let r = 0; r < soHang; r++) {
      let ch = nha ? 104 : 78;
      const noiDung = {};
      for (let c = 0; c < 7; c++) {
        const d = r * 7 + c - lech + 1; if (d < 1 || d > soNgay) continue;
        const hom = ngay[d - 1]; if (!hom.length) continue;
        if (nha) {
          const dd = dongNha(hom); noiDung[d] = dd;
          ch = Math.max(ch, 33 + dd.reduce((s, z) => s + z.h, 0) + 5 * (dd.length - 1) + 9);
        } else if (!hom[0].b.coMat) {
          const ld = hdNgat(g, hoaDauHd(hom[0].b.lyDo) || 'Vắng', fLd, cw - 16); noiDung[d] = ld;
          ch = Math.max(ch, 33 + ld.length * 15.6 + 8);
        }
      }
      const cy = y + h;
      for (let c = 0; c < 7; c++) {
        const d = r * 7 + c - lech + 1; if (d < 1 || d > soNgay) continue;
        const cx = x + c * (cw + gap); const hom = ngay[d - 1];
        if (!hom.length) {
          hdKhung(g, cx + 0.75, cy + 0.75, cw - 1.5, ch - 1.5, 15.25, '#ffffff', '#eef1f5', 1.5);
          hdChu(g, String(d), cx + 10, cy + 26, fHd(700, 20), '#b3bccb');
          continue;
        }
        const coMat = hom.some((z) => z.b.coMat);
        const thuHet = hom.every((z) => z.b.coMat && z.b.hocThu);
        hdKhung(g, cx, cy, cw, ch, 16, thuHet ? '#ede9fe' : coMat ? '#e7f6ee' : '#fdeceb');
        hdChu(g, String(d), cx + 10, cy + 26, fHd(700, 20), thuHet ? '#5b21b6' : coMat ? '#14532d' : '#9f1d1d');
        if (!nha) {
          const b = hom[0].b;
          if (b.coMat && b.hocThu) hdChu(g, 'Học thử', cx + cw / 2, cy + ch - 11, fHd(500, 12.5, 'ld'), '#5b21b6', 'center');
          else if (b.coMat) {
            const s = Math.max(1, Math.round(b.s || 1));
            let tx = cx + cw - 9 - (s * 24 + (s - 1) * 4);
            for (let i = 0; i < s; i++) { hdTich(g, tx, cy + ch - 9 - 24, 24); tx += 28; }
          } else {
            const ld = noiDung[d];
            ld.forEach((l, i) => hdChu(g, l, cx + cw / 2, cy + ch - 11 - (ld.length - 1 - i) * 15.6, fLd, '#9f1d1d', 'center'));
          }
          continue;
        }
        const dd = noiDung[d];
        const tong = dd.reduce((s, z) => s + z.h, 0) + 5 * (dd.length - 1);
        let yy = cy + 33 + ((ch - 33 - 9) - tong) / 2;
        for (const z of dd) {
          if (z.kieu === 'vang') {
            let x0 = cx + 8; let ty = yy; let wT = cw - 16;
            if (z.nen) { hdKhung(g, cx + 5, yy, cw - 10, z.h, 10, '#fbd5d1'); x0 = cx + 11; ty = yy + 4; wT = cw - 22; }
            veTen(z.z.ten, x0, ty + 12, wT, '#9f1d1d');
            const tn = z.z.nhan ? 13 : 0;
            if (tn) hdChu(g, z.z.nhan, x0, ty + 12 + 13, fNhan, '#b45353');
            z.ld.forEach((l, i) => hdChu(g, l, x0, ty + tn + 15 + 2 + (i + 1) * 14 - 3, fLd, '#9f1d1d'));
          } else {
            const doi = (z.z.b.s || 1) > 1; const tw = z.kieu === 'thu' ? hdDo(g, 'học thử', fHd(600, 10.5)) : doi ? 15 * 1.45 : 15;
            if (z.z.nhan) hdChu(g, z.z.nhan, cx + 8, yy + 12 + 13, fNhan, z.kieu === 'thu' ? '#7c5cc4' : '#3f7a57');
            veTen(z.z.ten, cx + 8, yy + 12, cw - 16 - tw - 3, z.kieu === 'thu' ? '#5b21b6' : '#14532d');
            if (z.kieu === 'thu') hdChu(g, 'học thử', cx + cw - 8, yy + 12, fHd(600, 10.5), '#5b21b6', 'right');
            else hdTich(g, cx + cw - 8 - tw, yy, 15, doi);
          }
          yy += z.h + 5;
        }
      }
      h += ch + (r < soHang - 1 ? gap : 0);
    }
    return h;
  }

  function lopNganHd(lop) { return String(lop || '').replace(/[\s-]/g, ''); }
  function nhanLopHd(b) { return lopNganHd(b.lop) + (b.tach ? (b.doan === 'CU' ? ' cũ' : ' mới') : ''); }
  function nhomLichHd(ds) {
    const nhanNguoi = {};
    const nhom = ds.map((c) => {
      const g = new Map();
      for (const b of c.lich || []) { const k = b.lop ? nhanLopHd(b) : ''; if (!g.has(k)) g.set(k, []); g.get(k).push(b); }
      const kn = String(c.id ?? c.ten);
      (nhanNguoi[kn] = nhanNguoi[kn] || new Set());
      for (const k of g.keys()) nhanNguoi[kn].add(k);
      return { c, g, kn };
    });
    const ra = [];
    for (const { c, g, kn } of nhom) {
      if (nhanNguoi[kn].size < 2) { ra.push(c); continue; }
      for (const [k, lich] of g) ra.push(c.laNha ? { id: c.id, ten: c.ten, nhan: k, lich } : { id: c.id, ten: k, lich });
    }
    return { ds: ra, coNhieu: Object.values(nhanNguoi).some((s) => s.size > 1) };
  }

  function hdLichNho(g, x, y, w, m, yr, lich) {
    const gap = 4; const cw = (w - 6 * gap) / 7; const ch = 40;
    let h = hdHangThu(g, x, y, cw, gap, 11.5, 22) + gap;
    const lech = cotNgay1(m, yr); const soNgay = soNgayThang(m, yr); const vang = [];
    for (let d = 1; d <= soNgay; d++) {
      const i = lech + d - 1;
      const cx = x + (i % 7) * (cw + gap); const cy = y + h + Math.floor(i / 7) * (ch + gap);
      const b = (lich || []).find((z) => z.ngay === d);
      if (!b) {
        hdKhung(g, cx + 0.5, cy + 0.5, cw - 1, ch - 1, 9.5, '#ffffff', '#eef1f5', 1);
        hdChu(g, String(d), cx + 6, cy + 15, fHd(700, 13), '#b3bccb');
      } else if (b.coMat && b.hocThu) {
        hdKhung(g, cx, cy, cw, ch, 10, '#ede9fe');
        hdChu(g, String(d), cx + 6, cy + 15, fHd(700, 13), '#5b21b6');
        hdChu(g, 'Thử', cx + cw - 5, cy + ch - 6, fHd(700, 10.5), '#5b21b6', 'right');
      } else if (b.coMat) {
        hdKhung(g, cx, cy, cw, ch, 10, '#e7f6ee');
        hdChu(g, String(d), cx + 6, cy + 15, fHd(700, 13), '#14532d');
        const doi = (b.s || 1) > 1;
        hdTich(g, cx + cw - 4 - (doi ? 23.2 : 16), cy + ch - 3 - 16, 16, doi);
      } else {
        vang.push(`${d}/${m}: ${hoaDauHd(b.lyDo) || 'Vắng'}`);
        hdKhung(g, cx, cy, cw, ch, 10, '#fdeceb');
        hdChu(g, String(d), cx + 6, cy + 15, fHd(700, 13), '#9f1d1d');
        hdChu(g, 'Vắng', cx + cw - 5, cy + ch - 6, fHd(700, 11), '#b42318', 'right');
      }
    }
    const soHang = Math.ceil((lech + soNgay) / 7);
    h += soHang * ch + (soHang - 1) * gap;
    if (vang.length) {
      h += 8;
      for (const v of vang) for (const l of hdNgat(g, v, fHd(500, 12.5, 'ld'), w)) { h += 18; hdChu(g, l, x, y + h - 5, fHd(500, 12.5, 'ld'), '#9f1d1d'); }
    }
    return h;
  }

  function khoanGiamHd(u) {
    const ct = u.chinhTay; const ra = [];
    const them = (ten, mot, tru, phu) => { if (tru > 0) ra.push({ ten, mot, tru, phu: phu || '' }); };
    let goc; let tho; let pct; let tenPct; let motPct; let phuPct = ''; let gocCon = null;
    if (u.kind === 'fam') {
      const mems = u.members || [];
      goc = mems.reduce((s, x) => s + (x.goc || 0), 0);
      tho = u.tho !== undefined ? Number(u.tho) : goc;
      const theoSo = new Map();
      for (const x of mems) {
        const o = theoSo.get(String(x.id)) || { ten: x.ten, buoi: 0, goc: 0 };
        o.buoi += x.buoi || 0; o.goc += x.goc || 0; theoSo.set(String(x.id), o);
      }
      gocCon = [...theoSo.values()];
      for (const x of mems) {
        if ((x.tho || 0) < (x.goc || 0)) {
          if (x.tieuHoc) them(`Học sinh Tiểu học (${x.ten})`, `Học sinh Tiểu học (${x.ten})`, x.goc - x.tho);
          else them(`Học phí tối đa (${x.ten})`, `Học phí tối đa (${x.ten})`, x.goc - x.tho);
        }
      }
      pct = ct && ct.coMien ? ct.pct : (u.giamPct || 0);
      tenPct = 'Gia đình'; phuPct = pct + '%'; motPct = pct + '% gia đình';
    } else {
      const cat = u.cat || {};
      goc = u.goc !== undefined ? u.goc : (u.buoi || 0) * (cat.donGia || 150000);
      tho = u.tho !== undefined ? u.tho : goc;
      if (tho < goc) them(cat.tieuHoc ? 'Học sinh Tiểu học' : 'Học phí tối đa', cat.tieuHoc ? 'Học sinh Tiểu học' : 'Học phí tối đa', goc - tho);
      pct = ct && ct.coMien ? ct.pct : (cat.giamPct || 0);
      tenPct = 'Ưu tiên'; phuPct = pct + '%'; motPct = pct + '%';
      const pcts = u.phan && !(ct && ct.coMien) ? [...new Set(u.phan.map((p) => p.giamPct || 0))] : null;
      if (pcts && pcts.length > 1) { pct = Math.max(...pcts); phuPct = 'theo từng lớp: ' + u.phan.map((p) => lopNganHd(p.lop) + ' ' + (p.giamPct || 0) + '%').join(', '); motPct = 'theo từng lớp'; }
    }
    const sauMien = ct ? ct.sauMien : u.expected;
    const lechTron = tho - sauMien;
    if (lechTron > 0) {
      if (pct > 0) them(tenPct, motPct, lechTron, phuPct);
      else if (ra.length) ra[ra.length - 1].tru += lechTron;
      else them('Làm tròn học phí', 'Làm tròn học phí', lechTron);
    }
    const gt = ct && ct.giamThem;
    if (gt && gt.tru > 0) {
      const ly = hoaDauHd(gt.lyDo);
      them('Giảm thêm', gt.kieu === 'pct' ? gt.giaTri + '%' + (ly ? ' · ' + ly : '') : (ly || 'Giảm thêm'), gt.tru,
        [gt.kieu === 'pct' ? gt.giaTri + '%' : '', ly].filter(Boolean).join(' · '));
    }
    return { goc, khoan: ra, gocCon };
  }

  function hdTongKet(g, x, y, w, tk) {
    const L = x + 22; const R = x + w - 22; let yy = y + 6; let dau = true;
    const NH = fHd(600, 17);
    const dong = (nhan, veGt, cao, mauNhan) => {
      if (!dau) hdVach(g, L, yy, R, '#e3e8f1', true, 1);
      const yb = yy + cao / 2 + 6;
      hdChu(g, nhan, L, yb, NH, mauNhan || '#56627a'); veGt(yb); yy += cao; dau = false;
    };
    const phai = (s, f, mau) => (yb) => hdChu(g, s, R, yb, f, mau, 'right');
    if (tk.dongBuoi.length === 1 && !tk.dongBuoi[0].ten) dong('Tổng số buổi học', phai(tk.dongBuoi[0].buoi + ' buổi', fHd(800, 18), '#152036'), 46);
    else {
      dong('Tổng số buổi học', (yb) => {
        let co = 16; let ph;
        const dung = () => {
          ph = [];
          tk.dongBuoi.forEach((c, i) => {
            if (i) ph.push([' · ', fHd(400, co), '#c3cad6']);
            ph.push([c.ten, fHd(600, co), '#56627a'], [' ' + c.buoi + ' buổi', fHd(400, co), '#152036']);
          });
          return ph.reduce((s, p) => s + hdDo(g, p[0], p[1]), 0);
        };
        let tw = dung();
        while (co > 12 && tw > R - L - 170) { co -= 0.5; tw = dung(); }
        let xx = R - tw;
        for (const p of ph) { hdChu(g, p[0], xx, yb, p[1], p[2]); xx += hdDo(g, p[0], p[1]); }
      }, 46);
    }
    const oChiTiet = (td, dongs, tongNhan, tongGt, mau) => {
      if (!dau) { hdVach(g, L, yy, R, '#e3e8f1', true, 1); }
      yy += 8;
      const hb = 14 + 18 + 8 + dongs.length * 25 + 8 + 1 + 44;
      hdKhung(g, L, yy, R - L, hb, 16, mau.nen);
      const iL = L + 16; const iR = R - 16;
      hdChu(g, td, iL, yy + 14 + 14, fHd(700, 14), mau.td, 'left', 1.4);
      const top = yy + 14 + 18 + 8;
      g.fillStyle = mau.vach; g.fillRect(iL + 4, top, 2, dongs.length * 25);
      dongs.forEach((d, i) => {
        const yb = top + i * 25 + 17;
        let xx = iL + 20;
        hdChu(g, d.ten, xx, yb, fHd(400, 15, 'than', true), mau.ct);
        if (d.phu) { xx += hdDo(g, d.ten, fHd(400, 15, 'than', true)); hdChu(g, '  ' + d.phu, xx, yb, fHd(400, 13.5, 'than', true), mau.ctNhat); }
        hdChu(g, d.gt, iR, yb, fHd(400, 15, 'than', true), mau.ctSo, 'right');
      });
      const yv = top + dongs.length * 25 + 8;
      g.fillStyle = mau.vach; g.fillRect(iL, yv, iR - iL, 1);
      hdChu(g, tongNhan, iL, yv + 29, fHd(700, 16), mau.tongChu);
      hdChu(g, tongGt, iR, yv + 30, fHd(800, 19), mau.tongSo, 'right');
      yy += hb + 8; dau = false;
    };
    const XAM = { nen: '#f3f5fa', td: '#6b778d', vach: '#dde3ee', ct: '#46526a', ctNhat: '#8b96a9', ctSo: '#46526a', tongChu: '#152036', tongSo: '#152036' };
    const XANH = { nen: '#eef9f2', td: '#2f7a52', vach: '#c6e8d3', ct: '#3f6b54', ctNhat: '#6f9a82', ctSo: '#2f7a52', tongChu: '#1f5c3c', tongSo: '#0f8a4a' };
    const coGocCon = tk.gocCon && tk.gocCon.length > 1;
    if (coGocCon) {
      oChiTiet('HỌC PHÍ GỐC', tk.gocCon.map((c) => ({ ten: c.ten, phu: c.buoi + ' buổi', gt: tienHd(c.goc) })), 'Tổng học phí gốc', tienHd(tk.goc), XAM);
    } else if (tk.khoan.length) dong('Học phí gốc', phai(tienHd(tk.goc), fHd(700, 18), '#152036'), 46);
    if (tk.khoan.length === 1) {
      const k = tk.khoan[0];
      yy += 2;
      hdKhung(g, L, yy, R - L, 46, 16, '#eef9f2');
      const iL = L + 16; const iR = R - 16; const yb = yy + 29; const fNhan = fHd(700, 14);
      hdChu(g, 'MIỄN GIẢM:', iL, yb, fNhan, '#2f7a52', 'left', 1.4);
      hdChu(g, k.mot, iL + hdDo(g, 'MIỄN GIẢM:', fNhan, 1.4) + 10, yb, fHd(600, 16), '#245c3f');
      hdChu(g, tienHd(k.tru), iR, yb, fHd(700, 17), '#0f8a4a', 'right');
      yy += 46 + 6; dau = false;
    } else if (tk.khoan.length > 1) {
      oChiTiet('MIỄN GIẢM', tk.khoan.map((k) => ({ ten: k.ten, phu: k.phu, gt: tienHd(k.tru) })), 'Tổng miễn giảm', tienHd(tk.khoan.reduce((s, k) => s + k.tru, 0)), XANH);
    }
    dong(coGocCon || tk.khoan.length ? 'Học phí cuối' : 'Học phí', phai(tienHd(tk.cuoi), fHd(800, 24), '#2557d6'), 54);
    for (const [a, b, k] of tk.phu || []) {
      if (k && k.to) dong(a, phai(b, fHd(800, 24), k.mau), 54, k.mauNhan || k.mau);
      else dong(a, phai(b, fHd(700, k ? 18 : 17), (k && k.mau) || '#152036'), 46, k && (k.mauNhan || k.mau));
    }
    dong(tk.cuoiDong.nhan, phai(tk.cuoiDong.gt, fHd(800, 18), tk.cuoiDong.mau), 46);
    yy += 6;
    hdKhung(g, x + 0.75, y + 0.75, w - 1.5, yy - y - 1.5, 22, null, '#e3e8f1', 1.5);
    return yy - y;
  }

  function hdTongKetNo(g, x, y, w, th, tong, han) {
    const L = x + 22; const R = x + w - 22; let yy = y + 6;
    hdChu(g, 'CÁC THÁNG CHƯA ĐÓNG', L, yy + 22, fHd(700, 13), '#8b96a9', 'left', 1.56); yy += 32;
    for (const t of th) {
      hdVach(g, L, yy, R, '#e3e8f1', true, 1);
      const yb = yy + 26; const nh = `Học phí tháng ${t.m}/${t.y}`;
      hdChu(g, nh, L, yb, fHd(600, 17), '#56627a');
      if (t.motPhan > 0) hdChu(g, ` (còn lại sau khi đã đóng ${tienHd(t.motPhan)})`, L + hdDo(g, nh, fHd(600, 17)), yb, fHd(400, 14, 'than', true), '#8b96a9');
      hdChu(g, tienHd(t.soTien), R, yb, fHd(700, 18), '#152036', 'right');
      yy += 40;
    }
    hdVach(g, L, yy, R, '#e3e8f1', false, 1.5);
    hdChu(g, 'Tổng cộng cần đóng', L, yy + 35, fHd(800, 18), '#152036');
    hdChu(g, tienHd(tong), R, yy + 36, fHd(800, 26), '#2557d6', 'right');
    yy += 54;
    hdVach(g, L, yy, R, '#e3e8f1', true, 1);
    hdChu(g, 'Hạn nộp', L, yy + 29, fHd(600, 17), '#56627a');
    hdChu(g, han, R, yy + 29, fHd(800, 18), '#d97706', 'right');
    yy += 46 + 6;
    hdKhung(g, x + 0.75, y + 0.75, w - 1.5, yy - y - 1.5, 22, null, '#e3e8f1', 1.5);
    return yy - y;
  }

  function hdNganHang(g, x, y, w, noiDung, anh) {
    const h = 200;
    hdKhung(g, x, y, w, h, 24, '#f6f8fc');
    const fV = [fHd(600, 18), fHd(500, 14.5), fHd(600, 14.5)]; const ls = [0.9, 0.44, 0.73];
    const gt = [HD_TK.stk.replace(/(\d{4})(?=\d)/g, '$1 '), HD_TK.chu, noiDung];
    const wv = Math.max(...gt.map((s, i) => hdDo(g, s, fV[i], ls[i])));
    const tw = 104 + 10 + wv; const gx = x + (w - (160 + 22 + tw)) / 2;
    const qy = y + 20;
    g.save(); g.shadowColor = 'rgba(20,30,60,.10)'; g.shadowBlur = 6; g.shadowOffsetY = 1;
    hdKhung(g, gx, qy, 160, 160, 18, '#ffffff'); g.restore();
    if (anh && anh.qr) g.drawImage(anh.qr, gx + 10, qy + 10, 140, 140);
    const tx = gx + 182; const ty = y + 25;
    if (anh && anh.logo) g.drawImage(anh.logo, tx, ty, 20 * anh.logo.width / anh.logo.height, 20);
    ['Số tài khoản', 'Chủ tài khoản', 'Nội dung'].forEach((nh, i) => {
      const ry = ty + 30 + i * 40;
      g.fillStyle = '#e6eaf2'; g.fillRect(tx, ry, tw, 1);
      hdChu(g, nh, tx, ry + 26, fHd(500, 13), '#8b96a9');
      hdChu(g, gt[i], tx + 114, ry + 26, fV[i], i === 0 ? '#1b2742' : i === 1 ? '#2c3850' : '#2557d6', 'left', ls[i]);
    });
    return h;
  }
  function hdSlogan(g, W, y) {
    hdChu(g, 'ANDREW CLASSES', W / 2, y + 37, fHd(300, 15, 'mong'), '#8f9bb0', 'center', 6.3);
    return 63;
  }
  function noiDungCkHd(ten, lop, conNha) {
    if (conNha) return conNha.map((c) => khongDauHd(c.ten).toUpperCase()).join(' ');
    return (khongDauHd(ten).toUpperCase() + ' ' + String(lop || '').replace(/-/g, '')).trim();
  }

  function veHoaDonMot(cv, u, kq, m, y, anh) {
    const nha = u.kind === 'fam'; const W = nha ? 880 : 760;
    const conNha = nha ? gomConHd(u.members) : null;
    const dau = nha
      ? { nha: true, con: conNha, nhan: 'ĐIỂM DANH', thang: `${m}/${y}` }
      : { ten: u.label, lop: u.phan ? u.phan.map((p) => p.lop).join(' → ') : (u.classes || [])[0] || '', so: u.hsId, nhan: 'ĐIỂM DANH', thang: `${m}/${y}` };
    const nl = nhomLichHd(nha ? (u.members || []).map((x) => ({ id: x.id, ten: x.ten, lich: x.lich, laNha: true })) : [{ id: u.hsId, ten: u.label, lich: u.lich }]);
    const { goc, khoan, gocCon } = khoanGiamHd(u);
    const ct = kq.chotTay && kq.chotTay[u.id];
    const xong = !!ct || (u.id in kq.done);
    const phu = [];
    if (!nha) {
      const tu = tamUngCuaHs(u.hsId);
      if (tu) {
        const bg = (tu.lichSu || []).filter((h) => h.loai === 'tru' && h.m === m && h.y === y).pop();
        const du = bg ? bg.truocDu : tu.soDu;
        phu.push(['Số dư học phí đóng trước', tienHd(du)]);
        const thieu = (u.expected || 0) - du;
        if (thieu > 0) { if (!xong) phu.push(['Số tiền còn thiếu', tienHd(thieu), { to: true, mau: '#c2410c', mauNhan: '#9a3412' }]); }
        else phu.push(['Số dư còn lại', tienHd(-thieu), { mau: '#0f8a4a', mauNhan: '#2f7a52' }]);
      }
    }
    const cuoiDong = ct ? { nhan: 'Trạng thái', gt: ct.loai === 'tang' ? '★ Được tặng học phí' : '★ Đã chốt xong phí', mau: ct.loai === 'tang' ? '#db2777' : '#15803d' }
      : (u.id in kq.done) ? { nhan: 'Trạng thái', gt: '✓ Đã nhận — cảm ơn phụ huynh', mau: '#15803d' }
        : { nhan: 'Hạn nộp', gt: hanNopHd(m, y), mau: '#d97706' };
    const tk = { dongBuoi: nha ? conNha.map((c) => ({ ten: c.ten, buoi: c.buoi }))
      : u.phan ? u.phan.map((p) => ({ ten: lopNganHd(p.lop), buoi: p.buoi })) : [{ buoi: u.buoi }], goc, khoan, gocCon, cuoi: u.expected, phu, cuoiDong };
    const nd = noiDungCkHd(u.label, (u.classes || [])[0], conNha);
    hdVe(cv, W, (g) => {
      let yy = hdDau(g, W, 0, dau);
      yy += 18; yy += hdLich(g, 32, yy, W - 64, m, y, nl.ds, nha || nl.coNhieu);
      yy += 22; yy += hdTongKet(g, 32, yy, W - 64, tk);
      yy += 22; yy += hdNganHang(g, 32, yy, W - 64, nd, anh);
      return yy + hdSlogan(g, W, yy);
    });
  }

  function moXemLonHd(cv) {
    let xem = document.getElementById('hdXemLon');
    if (!xem) {
      xem = document.createElement('div'); xem.id = 'hdXemLon';
      xem.innerHTML = '<div class="goi">Cuộn chuột: phóng to / thu nhỏ · Kéo: di chuyển · Esc hoặc nháy đúp: đóng</div><img alt="">'
        + '<button class="dong" title="Đóng (Esc)">✕</button>'
        + '<div class="thanh"><button data-l="-">−</button><span class="pt">100%</span><button data-l="+">+</button><button data-l="vua">Vừa màn</button><button data-l="1">100%</button></div>';
      document.body.appendChild(xem);
      const anh = xem.querySelector('img'); const pt = xem.querySelector('.pt');
      const z = { k: 1, tx: 0, ty: 0, keo: null };
      const ap = () => { anh.style.transform = `translate(${z.tx}px,${z.ty}px) scale(${z.k})`; pt.textContent = Math.round(z.k * 100) + '%'; };
      const zoomTai = (cx, cy, k) => { k = Math.min(6, Math.max(0.3, k)); z.tx = cx - (cx - z.tx) * k / z.k; z.ty = cy - (cy - z.ty) * k / z.k; z.k = k; ap(); };
      z.vua = () => {
        const w = anh.naturalWidth / HD_TL; const h = anh.naturalHeight / HD_TL;
        anh.style.width = w + 'px';
        z.k = Math.min((innerWidth - 40) / w, (innerHeight - 110) / h, 3);
        z.tx = (innerWidth - w * z.k) / 2; z.ty = Math.max(20, (innerHeight - 70 - h * z.k) / 2); ap();
      };
      const dong = () => { xem.classList.remove('mo'); document.removeEventListener('keydown', z.phim, true); };
      z.phim = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); dong(); } };
      z.dong = dong;
      xem.addEventListener('wheel', (e) => { e.preventDefault(); zoomTai(e.clientX, e.clientY, z.k * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
      xem.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.thanh, .dong')) return;
        z.keo = { x: e.clientX - z.tx, y: e.clientY - z.ty }; xem.classList.add('keo'); xem.setPointerCapture(e.pointerId);
      });
      xem.addEventListener('pointermove', (e) => { if (!z.keo) return; z.tx = e.clientX - z.keo.x; z.ty = e.clientY - z.keo.y; ap(); });
      const tha = () => { z.keo = null; xem.classList.remove('keo'); };
      xem.addEventListener('pointerup', tha); xem.addEventListener('pointercancel', tha);
      xem.addEventListener('dblclick', (e) => { if (!e.target.closest('.thanh')) dong(); });
      xem.querySelector('.dong').onclick = dong;
      xem.querySelector('.thanh').addEventListener('click', (e) => {
        const l = e.target.dataset && e.target.dataset.l; if (!l) return;
        const cx = innerWidth / 2; const cy = innerHeight / 2;
        if (l === '+') zoomTai(cx, cy, z.k * 1.25); else if (l === '-') zoomTai(cx, cy, z.k / 1.25); else if (l === 'vua') z.vua(); else zoomTai(cx, cy, 1);
      });
      xem._z = z;
    }
    const z = xem._z; const anh = xem.querySelector('img');
    anh.onload = z.vua; anh.src = cv.toDataURL('image/png');
    xem.classList.add('mo');
    document.addEventListener('keydown', z.phim, true);
  }
  document.addEventListener('dblclick', (e) => {
    const cv = e.target.closest && e.target.closest('canvas.hd-anh');
    if (cv && cv.width > 0) { e.preventDefault(); moXemLonHd(cv); }
  });

  function veHoaDonTong(o, khoi) {
    const cv = $('#hdTongCanvas');
    hdChuanBi().then((anh) => { if (document.body.contains(cv)) veHoaDonNo(cv, o, khoi, anh); });
  }
  function veHoaDonNo(cv, o, khoi, anh) {
    const nha = o.loai === 'nha'; const W = nha ? 880 : 760;
    const coU = khoi.filter((k) => k.u); const uMoi = coU.length ? coU[coU.length - 1].u : null;
    const namCuoi = khoi.length ? khoi[khoi.length - 1].y : S.y;
    const thang = khoi.every((k) => k.y === namCuoi) ? khoi.map((k) => k.m).join(' + ') + '/' + namCuoi : khoi.map((k) => k.m + '/' + k.y).join(' + ');
    const coThang = khoi.length > 3 ? 22 : 28;
    const conNha = nha ? (uMoi ? gomConHd(uMoi.members) : [{ ten: o.ten, lop: o.lop || '', so: '' }]) : null;
    const lop = (uMoi && (uMoi.classes || [])[0]) || o.lop || '';
    const dau = nha ? { nha: true, con: conNha, nhan: 'HỌC PHÍ CHƯA ĐÓNG', mauNhan: '#c2410c', thang, coThang }
      : { ten: o.ten, lop, so: o.hsId, nhan: 'HỌC PHÍ CHƯA ĐÓNG', mauNhan: '#c2410c', thang, coThang };
    const th = khoi.map((k) => {
      const ph = [];
      if (k.u) {
        const { goc, khoan } = khoanGiamHd(k.u);
        ph.push(nha ? gomConHd(k.u.members).map((c) => `${c.ten} ${c.buoi} buổi`).join(' · ') : `${k.u.buoi} buổi`);
        ph.push('Học phí gốc ' + tienHd(goc));
        const tongGiam = khoan.reduce((s, x) => s + x.tru, 0);
        const p = khoan.length === 1 ? /^(\d+)%/.exec(khoan[0].mot) : null;
        if (tongGiam > 0) ph.push('Miễn giảm ' + (p ? p[1] + '% ' : '') + '−' + tienHd(tongGiam));
        if (k.motPhan > 0) ph.push('Đã đóng ' + tienHd(k.motPhan));
      }
      return { m: k.m, y: k.y, u: k.u, soTien: k.soTien, motPhan: k.motPhan, chiTiet: ph.join(' · ') };
    });
    const tong = th.reduce((s, t) => s + t.soTien, 0);
    const nd = noiDungCkHd(o.ten, lop, conNha);
    const cuoi = khoi.length ? khoi[khoi.length - 1] : { m: S.m, y: S.y };
    const moc = (cuoi.y * 12 + cuoi.m) > (S.y * 12 + S.m) ? cuoi : { m: S.m, y: S.y };
    const theThang = (g, x, y, w, t, hCo) => {
      let yy = y + 14;
      hdChu(g, 'Tháng ', x + 14, yy + 20, fHd(300, 22, 'mong'), '#152036');
      hdChu(g, `${t.m}/${t.y}`, x + 14 + hdDo(g, 'Tháng ', fHd(300, 22, 'mong')), yy + 20, fHd(600, 22, 'mong'), '#152036');
      yy += 28;
      const dongCt = t.chiTiet ? hdNgat(g, t.chiTiet, fHd(400, 12.5), w - 28) : [];
      dongCt.forEach((l, i) => hdChu(g, l, x + 14, yy + 13 + i * 17, fHd(400, 12.5), '#6b778d'));
      yy += dongCt.length * 17 + 8;
      if (t.u) yy += hdLichNho(g, x + 14, yy, w - 28, t.m, t.y, t.u.lich);
      else { hdChu(g, '(không đọc được lịch học tháng này)', x + 14, yy + 16, fHd(500, 13), '#8592a6'); yy += 24; }
      yy += 14;
      const h = Math.max(yy - y, hCo || 0);
      hdKhung(g, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 20, null, '#e3e8f1', 1.5);
      return h;
    };
    hdVe(cv, W, (g) => {
      let yy = hdDau(g, W, 0, dau);
      yy += 22; yy += hdTongKetNo(g, 32, yy, W - 64, th, tong, hanNopHd(moc.m, moc.y));
      if (!nha) {
        yy += 18;
        const cw = (W - 64 - 16) / 2;
        for (let i = 0; i < th.length; i += 2) {
          const cap = th.slice(i, i + 2);
          const hRow = Math.max(...cap.map((t) => theThang(hdDoG(), 0, 0, cw, t, 0)));
          const x0 = cap.length === 1 ? 32 + (W - 64 - cw) / 2 : 32;   // tháng lẻ cuối nằm giữa
          cap.forEach((t, j) => theThang(g, x0 + j * (cw + 16), yy, cw, t, hRow));
          yy += hRow + (i + 2 < th.length ? 16 : 0);
        }
      } else {
        for (const t of th) {
          yy += 20;
          hdChu(g, 'Tháng ', 32, yy + 20, fHd(300, 22, 'mong'), '#152036');
          hdChu(g, `${t.m}/${t.y}`, 32 + hdDo(g, 'Tháng ', fHd(300, 22, 'mong')), yy + 20, fHd(600, 22, 'mong'), '#152036');
          yy += 28;
          const dongCt = t.chiTiet ? hdNgat(g, t.chiTiet, fHd(400, 14), W - 64) : [];
          dongCt.forEach((l, i) => hdChu(g, l, 32, yy + 14 + i * 19, fHd(400, 14), '#6b778d'));
          yy += dongCt.length * 19 + 10;
          if (t.u) yy += hdLich(g, 32, yy, W - 64, t.m, t.y, nhomLichHd((t.u.members || []).map((x) => ({ id: x.id, ten: x.ten, lich: x.lich, laNha: true }))).ds, true);
          else { hdChu(g, '(không đọc được lịch học tháng này)', 32, yy + 16, fHd(500, 14), '#8592a6'); yy += 24; }
        }
      }
      yy += 22; yy += hdNganHang(g, 32, yy, W - 64, nd, anh);
      return yy + hdSlogan(g, W, yy);
    });
  }

  let hdLuot = 0;
  function phiCuChu(uid) {
    const u = S.du.ketQua.units.find((x) => x.id === uid);
    const cu = phiCuCua(u);
    if (!cu.length) return '';
    const tong = cu.reduce((s, x) => s + x.soTien, 0);
    return `<p class="mota hd-phicu">⚠ Còn phí cũ chưa đóng: ${cu.map((x) => `tháng ${x.m}/${x.y} <b>${vnd(x.soTien)}</b>`).join(' · ')}` +
      `${cu.length > 1 ? ` (tổng <b>${vnd(tong)}</b>)` : ''} ⇒ hóa đơn GỘP các tháng${u && (u.id in S.du.ketQua.done) ? ' (tháng này đã đóng)' : ''}.</p>`;
  }
  async function veHoaDonHop(uid) {
    const kq = S.du.ketQua;
    const u = kq.units.find((x) => x.id === uid);
    if (!u) return;
    const cu = phiCuCua(u);
    const luot = ++hdLuot;
    if (!cu.length) { veHoaDon(uid); return; }
    const cv = $('#hdCanvas'); const m = S.m; const y = S.y;
    const boNho = {};
    const khoi = [];
    for (const d of cu) {
      let uu = null; let motPhan = 0;
      try {
        const key = d.y + '-' + d.m;
        const du = boNho[key] || (boNho[key] = await goi('docThang', d.m, d.y));
        uu = u.kind === 'fam'
          ? du.ketQua.units.find((z) => z.kind === 'fam' && String(z.idNha) === String(u.idNha))
          : du.ketQua.units.find((z) => z.kind !== 'fam' && String(z.hsId) === String(u.hsId));
        const gd = uu && ((du.thang || {}).ghiDe || {})[uu.id];
        motPhan = Math.max(0, Math.round((gd && gd.dongMotPhan) || 0));
      } catch (_) { uu = null; }   // tháng quá cũ / không đọc được ⇒ in phần tiền, bỏ lịch
      if (uu && !(uu.buoi > 0)) uu = null;   // tháng không có điểm danh (nợ thêm tay) ⇒ đừng vẽ lịch trống "0 buổi · học phí gốc 0 đ"
      khoi.push({ m: d.m, y: d.y, soTien: d.soTien, u: uu || null, motPhan });
    }
    const thieu = (u.id in kq.done) ? 0 : thieuThucTe(u);
    if (thieu > 0) khoi.push({ m, y, soTien: thieu, u, motPhan: motPhanCua(u) });
    const o = { loai: u.kind === 'fam' ? 'nha' : 'hs', ten: u.label, hsId: u.hsId, idNha: u.idNha, lop: (u.classes || [])[0] || '' };
    const anh = await hdChuanBi();
    if (luot !== hdLuot || !document.body.contains(cv)) return;   // thầy đã đổi người / đóng hộp trong lúc chờ
    veHoaDonNo(cv, o, khoi, anh);
  }
  async function ghiDaGui(u, bat) {
    await goi('ghiDeUnit', S.m, S.y, u.id, { daGui: bat ? new Date().toISOString() : null });
    chonUid = u.id; await napThang();
  }
  function moHopDaGui(u, sau) {
    let man = $('#manDaGui');
    if (!man) {
      man = document.createElement('div'); man.className = 'man'; man.id = 'manDaGui'; man.style.zIndex = '80';
      man.innerHTML = '<div class="hop glass hop-dagui" id="hopDaGui"></div>';
      man.addEventListener('click', (e) => { if (e.target === man) man.classList.remove('on'); });
      document.body.appendChild(man);
    }
    $('#hopDaGui').innerHTML = `
      <h3>Đã gửi hóa đơn cho phụ huynh chưa?</h3>
      <p class="mota">${esc(u.label)} — hóa đơn tháng ${S.m}/${S.y}</p>
      <div class="dagui-nut">
        <button class="btn primary" id="dgCo">✓ ĐÃ GỬI</button>
        <button class="btn" id="dgChua">Chưa gửi</button>
      </div>`;
    man.classList.add('on');
    const dong = () => man.classList.remove('on');
    $('#dgCo').onclick = async () => { dong(); await ghiDaGui(u, true); if (sau) sau(); baoToast(`${u.label}: đã đánh dấu đã gửi.`); };
    $('#dgChua').onclick = dong;
    setTimeout(() => { const b = $('#dgCo'); if (b) b.focus(); }, 30);
  }
  function moCanhSdt(neo, u, sauKhiLuu) {
    const cu = sdtCua(u);
    moCanh(neo, `
      <div class="muc tt">Số Zalo phụ huynh — ${esc(u.label)}</div>
      <div class="cm-than">
        <input id="sdtSo" class="ct-o" type="tel" inputmode="tel" maxlength="16" placeholder="vd 0912345678" value="${esc(cu)}">
        <div class="cm-nut"><button class="btn primary" id="sdtLuu">${sauKhiLuu ? 'Lưu + gửi' : 'Lưu'}</button><button class="btn" id="sdtHuy">Hủy</button>
          ${cu ? '<button class="btn" id="sdtXoa" style="margin-left:auto">Xoá</button>' : ''}</div>
      </div>`);
    setTimeout(() => { const o = $('#sdtSo'); if (o) { o.focus(); o.select(); } }, 30);
    const luu = async (so, xoa) => {
      if (!so && !xoa) { if (cu) baoToast('Muốn xoá số Zalo thì bấm nút Xoá.'); else dongCanh(); return; }
      const ds = await goi('ghiLienHe', khoaNguoiU(u), so);
      if (S.du) S.du.lienHe = ds;
      dongCanh();
      if ($('#manHd').classList.contains('on')) veHangNutLai();   // nút số Zalo trên hộp hóa đơn hiện số mới
      baoToast(so ? `${u.label}: đã lưu số Zalo ${sdtCua(u)}.` : `${u.label}: đã xoá số Zalo.`);
      if (so && sauKhiLuu) await sauKhiLuu();
    };
    $('#sdtHuy').onclick = () => dongCanh();
    $('#sdtLuu').onclick = () => luu($('#sdtSo').value.trim());
    $('#sdtSo').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); luu($('#sdtSo').value.trim()); } };
    if ($('#sdtXoa')) $('#sdtXoa').onclick = () => luu('', true);
  }
  async function chiaSeAnhDt(u) {
    const camUng = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!camUng || !navigator.canShare || !navigator.share) return false;
    const blob = await new Promise((ok) => $('#hdCanvas').toBlob(ok, 'image/png'));
    if (!blob) return false;
    const file = new File([blob], `Hoa don ${S.m}-${S.y} - ${khongDauHd(u.label)}.png`, { type: 'image/png' });
    if (!navigator.canShare({ files: [file] })) return false;
    try { await navigator.share({ files: [file] }); } catch (e) { if (e && e.name === 'AbortError') return true; return false; }
    moHopDaGui(u, () => veHangNutLai());
    return true;
  }
  let veHangNutLai = () => {};   // moHopHd gắn = veHangNut của hộp đang mở

  function veHoaDon(uid) {
    const kq = S.du.ketQua;
    const u = kq.units.find((x) => x.id === uid);
    if (!u) return;
    const cv = $('#hdCanvas'); const m = S.m; const y = S.y;
    hdChuanBi().then((anh) => { if (document.body.contains(cv)) veHoaDonMot(cv, u, kq, m, y, anh); });
  }
  function moCtxHs(x, y, uid) {
    const kq = S.du.ketQua;
    const u = kq.units.find((z) => z.id === uid);
    if (!u) return;
    const mp = motPhanCua(u);
    const thieu = thieuThucTe(u);
    const tu = u.kind !== 'fam' ? tamUngCuaHs(u.hsId) : null;
    const el = $('#ctxHs');
    el.innerHTML = `
      <div class="muc tt">${esc(u.label)} — cần đóng <b>${vnd(u.expected)}</b></div>
      ${mp ? `<div class="muc tt">Đã ghi tay <b>${vnd(mp)}</b> · còn thiếu <b>${vnd(thieu)}</b></div>` : ''}
      ${tu && tu.soDu ? `<div class="muc tt">Còn dư HP trước: <b style="color:var(--green)">${vnd(tu.soDu)}</b></div>` : ''}
      <hr>
      <div class="muc" id="ctxThemNo">Thêm vào nợ phí…</div>
      <div class="muc" id="ctxDongSau">Đóng sau…</div>
      <div class="muc" id="ctxMotPhan">${mp ? 'Sửa số đã đóng một phần…' : 'Đóng một phần…'}</div>
      ${tu && tu.soDu ? '<div class="muc" id="ctxTamUng">Đóng từ HP còn dư…</div>' : ''}
      <hr>
      <div class="muc" id="ctxChotTay"><span class="sao-chot chot">★</span> Chốt xong phí…</div>
      <div class="muc" id="ctxTangHp"><span class="sao-chot tang">★</span> Tặng học phí…</div>
      <hr>
      <div class="muc" id="ctxGhiChu">📝 ${ghiChuCuaU(u) ? 'Sửa ghi chú…' : 'Ghi chú…'}</div>`;
    datViTriCtx(el, x, y);
    $('#ctxChotTay').onclick = () => moCanhChotTay($('#ctxChotTay'), u, 'chot');
    $('#ctxTangHp').onclick = () => moCanhChotTay($('#ctxTangHp'), u, 'tang');
    $('#ctxGhiChu').onclick = () => moCanhGhiChu($('#ctxGhiChu'), u);
    $('#ctxThemNo').onclick = () => { dongCtx(); moHopThemNo(u, 'no'); };
    $('#ctxDongSau').onclick = () => { dongCtx(); moHopThemNo(u, 'sau'); };
    $('#ctxMotPhan').onclick = () => { dongCtx(); moHopMotPhan(u); };
    if (tu && tu.soDu) $('#ctxTamUng').onclick = () => { dongCtx(); moHopTruTamUng(u, tu, thieu); };
  }

  function khoaNoCua(u) { return u.kind === 'fam' ? 'N|' + u.idNha : 'H|' + u.hsId; }
  function banDoNoThangNay() {
    const map = new Map();
    for (const o of ((S.no || {}).o) || []) {
      for (const d of o.dong) if (d.m === S.m && d.y === S.y) map.set(o.khoa, d);
    }
    return map;
  }

  function thieuThucTe(u) {
    const pl = phanLoai(u);
    if (pl.loai === 'du') return 0;
    if (pl.loai === 'lech' && pl.m) return pl.m.diff < 0 ? -pl.m.diff : 0; // đóng thiếu bao nhiêu
    return conThieuCua(u);                                                // chưa đóng / mới đóng một phần
  }

  function moHopThemNo(u, kieu) {
    const laSau = kieu === 'sau';
    const ten = laSau ? 'Đóng sau' : 'Nợ phí';
    const soTien = thieuThucTe(u);
    if (!soTien) { baoToast(esc(u.label) + ' không còn thiếu đồng nào của tháng này.'); return; }
    if (u.kind !== 'fam' && !u.hsId) { baoToast('Không tìm được mã số của em này — chưa ghi được.'); return; }
    const cu = banDoNoThangNay().get(khoaNoCua(u));
    $('#hopMotPhan').innerHTML = `
      <h3>${laSau ? 'Đánh dấu ĐÓNG SAU' : 'Thêm vào nợ phí'}</h3>
      <p class="mota">Ghi <b>${esc(u.label)}</b> ${laSau ? 'sẽ đóng sau' : 'còn nợ'}
        <b>${vnd(soTien)}đ</b> của tháng ${S.m}/${S.y}.
        Số tiền được CHỤP CỨNG tại đây — sau này mức phí có đổi thì khoản cũ vẫn đứng yên.
        ${u.kind === 'fam' ? 'Đây là khoản của CẢ NHÀ (đóng gộp). ' : ''}
        ${cu ? `<b style="color:var(--amber)">Em/nhà này đã có dòng tháng ${cu.m}/${cu.y} dạng
          "${cu.kieu === 'sau' ? 'Đóng sau' : 'Nợ phí'}" — bấm tiếp sẽ ĐỔI thành "${ten}", không đẻ thêm dòng.</b>` : ''}</p>
      <div class="hangnut">
        <button class="btn primary" id="noXacNhan">${laSau ? 'Đánh dấu đóng sau' : 'Thêm vào nợ phí'}</button>
        <button class="btn" data-dong>Hủy</button>
      </div>`;
    $('#manMotPhan').classList.add('on');
    $('#noXacNhan').onclick = async () => {
      await goi('themNoPhi', {
        loai: u.kind === 'fam' ? 'nha' : 'hs',
        kieu: laSau ? 'sau' : 'no',
        hsId: u.hsId || null, idNha: u.idNha || null,
        m: S.m, y: S.y, soTien,
        tenLuc: u.label, lopLuc: (u.classes || []).join(', '),
      });
      dongMan(); await napNoPhi();
      baoToast('Đã ghi ' + ten + ': ' + u.label + ' — ' + vnd(soTien) + 'đ.');
    };
  }

  function moHopMotPhan(u) {
    const mp = motPhanCua(u);
    $('#hopMotPhan').innerHTML = `
      <h3>Đóng một phần — ${esc(u.label)}</h3>
      <p class="mota">Cần đóng tháng ${S.m}/${S.y}: <b>${vnd(u.expected)}đ</b>.
        Gõ số tiền ĐÃ NHẬN của em/nhà này. Gõ <b>0</b> để bỏ ghi tay.
        Em vẫn tính là CHƯA ĐÓNG cho tới khi đủ tiền.</p>
      <input type="number" id="mpSo" value="${mp}" min="0" step="50000" style="width:100%">
      <p class="mota" id="mpConLai"></p>
      <div class="hangnut">
        <button class="btn primary" id="mpLuu">Lưu</button>
        <button class="btn" data-dong>Hủy</button>
      </div>`;
    $('#manMotPhan').classList.add('on');
    const veConLai = () => {
      const n = Math.max(0, parseInt($('#mpSo').value, 10) || 0);
      $('#mpConLai').innerHTML = n >= (u.expected || 0)
        ? '<b style="color:var(--green)">Đủ tiền rồi</b> — nhưng myPay chỉ đánh dấu ĐÃ ĐÓNG khi thầy bấm trong hóa đơn hoặc khi khớp được giao dịch.'
        : 'Còn thiếu: <b>' + vnd((u.expected || 0) - n) + 'đ</b>';
    };
    veConLai();
    $('#mpSo').oninput = veConLai;
    $('#mpLuu').onclick = async () => {
      const n = Math.max(0, parseInt($('#mpSo').value, 10) || 0);
      const g = ((S.du.thang || {}).ghiDe || {})[u.id] || {};
      if (!n && !g.daDong) await goi('ghiDeUnit', S.m, S.y, u.id, null);
      else await goi('ghiDeUnit', S.m, S.y, u.id, { dongMotPhan: n });
      dongMan(); await napThang();
      baoToast(n ? 'Đã ghi nhận đóng một phần ' + vnd(n) + 'đ.' : 'Đã bỏ ghi tay đóng một phần.');
    };
  }

  function moHopTruTamUng(u, tu, thieu) {
    const seTru = Math.min(tu.soDu, thieu);
    const conThieuSau = Math.max(0, thieu - seTru);
    xacNhan(`Đóng từ HP còn dư — ${u.label}`,
      `Trừ ${vnd(seTru)}đ từ số dư tạm ứng (đang có ${vnd(tu.soDu)}đ) cho tháng ${S.m}/${S.y}.` +
      (conThieuSau ? ` ⚠ Không đủ — sau khi trừ HẾT số dư vẫn còn THIẾU ${vnd(conThieuSau)}đ, tháng này vẫn hiện CHƯA ĐÓNG.`
        : ' Đủ tiền — tháng này sẽ chuyển thành ĐÃ ĐÓNG.'),
      'Trừ tạm ứng', async () => {
        try {
          const kq = await goi('truTamUng', S.m, S.y, u.hsId, thieu);
          await napThang(); await napTamUng();
          baoToast(kq.conThieuSauTru
            ? `Đã trừ ${vnd(kq.soTru)}đ — vẫn còn thiếu ${vnd(kq.conThieuSauTru)}đ.`
            : `Đã trừ ${vnd(kq.soTru)}đ — ${u.label} đã đóng đủ tháng ${S.m}/${S.y}.`);
        } catch (_) { /* goi() đã tự báo lỗi */ }
      });
  }

  const DPT = { hs: [], lop: '', hsChon: null };
  const TNP = { hs: [], lop: '', hsChon: null };
  async function moHopDongPhiTruoc() {
    DPT.hs = await goi('dsHocSinh');
    DPT.lop = ''; DPT.hsChon = null;
    veHopDongPhiTruoc();
    $('#manDongPhiTruoc').classList.add('on');
  }
  function veHopDongPhiTruoc() {
    const dsLop = [...new Set(DPT.hs.map((h) => h.lop))].sort();
    const trongLop = DPT.lop ? DPT.hs.filter((h) => h.lop === DPT.lop) : [];
    $('#hopDongPhiTruoc').innerHTML = `
      <h3>Đóng phí trước</h3>
      <p class="mota">Ghi nhận phụ huynh đã đóng trước cho MỘT học sinh LẺ (không áp dụng gia
        đình — gia đình đã có cách gộp tiền riêng). Đóng trước thêm lần nữa thì CỘNG DỒN vào
        số dư đang có. Trừ dần bằng cách chuột phải học sinh đó ở trang Tháng → "Đóng từ HP còn dư".</p>
      <label class="dong" style="display:block;margin-bottom:8px">Lớp
        <select id="dptLop" style="width:100%;margin-top:4px;padding:7px 9px;border-radius:8px;border:1px solid var(--glass-border);font-weight:700">
          <option value="">— Chọn lớp —</option>
          ${dsLop.map((l) => `<option value="${esc(l)}" ${DPT.lop === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
        </select>
      </label>
      ${DPT.lop ? `<div class="chon-ds" id="dptDs" style="max-height:160px;border:1px solid var(--glass-border);border-radius:10px;margin-bottom:10px">
        ${trongLop.map((h) => `<div class="chon-hs ${DPT.hsChon === h.id ? 'dachon' : ''}" data-id="${h.id}">
          <span>${esc(h.ten)}</span></div>`).join('') || '<div class="mota" style="padding:10px">Lớp này chưa có học sinh.</div>'}
      </div>` : ''}
      ${DPT.hsChon ? `
        <p class="mota">Đang ghi cho: <b>${esc((DPT.hs.find((h) => h.id === DPT.hsChon) || {}).ten)}</b></p>
        <input type="number" id="dptSoTien" placeholder="Số tiền đã đóng trước" min="0" step="50000" style="width:100%">
        <div class="hangnut"><button class="btn primary" id="dptGhi">Ghi nhận</button></div>
      ` : ''}
      <h4 style="margin:18px 0 8px">Đang có số dư</h4>
      <div id="dptDsHienCo"></div>
      <div class="hangnut" style="margin-top:14px"><span class="keo"></span><button class="btn" data-dong>Đóng</button></div>`;
    $('#dptLop').onchange = () => { DPT.lop = $('#dptLop').value; DPT.hsChon = null; veHopDongPhiTruoc(); };
    $$('#dptDs .chon-hs').forEach((el) => {
      el.onclick = () => { DPT.hsChon = parseInt(el.getAttribute('data-id'), 10); veHopDongPhiTruoc(); };
    });
    if ($('#dptGhi')) {
      $('#dptGhi').onclick = async () => {
        const soTien = parseInt($('#dptSoTien').value, 10) || 0;
        if (!soTien) { baoToast('Gõ số tiền đã đóng trước.'); return; }
        const hs = DPT.hs.find((h) => h.id === DPT.hsChon);
        await goi('themTamUng', { hsId: hs.id, soTien, tenLuc: hs.ten, lopLuc: hs.lop });
        DPT.hsChon = null;
        await napTamUng();
        veHopDongPhiTruoc();
        baoToast(`Đã ghi ${vnd(soTien)}đ đóng trước cho ${hs.ten}.`);
      };
    }
    veDsTamUngHienCo();
  }
  function veDsTamUngHienCo() {
    const ds = S.tamUng || [];
    $('#dptDsHienCo').innerHTML = ds.length ? ds.map((t) => `
      <div class="no-dong">
        <span class="kythang">${esc(t.ten)}</span>
        <small style="color:var(--text-dim)">${esc(t.lop)}${t.mat ? ' · không còn trong myStudent' : ''}</small>
        <span class="tien" style="color:var(--green)">${vnd(t.soDu)}đ</span>
        <span class="nutnho"><button class="btn nho" data-xoaTu="${t.hsId}">Xoá</button></span>
      </div>`).join('') : '<p class="mota">Chưa có em nào đóng trước.</p>';
    $$('#dptDsHienCo [data-xoaTu]').forEach((b) => {
      b.onclick = () => {
        const hsId = b.getAttribute('data-xoaTu');
        const t = ds.find((x) => String(x.hsId) === String(hsId));
        $('#hopMotPhan').innerHTML = `
          <h3>Xoá số dư tạm ứng</h3>
          <p class="mota">Xoá HẲN số dư <b>${vnd(t ? t.soDu : 0)}đ</b> đang ghi cho <b>${esc(t ? t.ten : '')}</b>?
            Dùng khi ghi nhầm hoàn toàn — không sửa được từng số, chỉ xoá sạch rồi ghi lại từ đầu.</p>
          <div class="hangnut">
            <button class="btn primary" id="xnOk">Xoá số dư này</button>
            <button class="btn" id="xnHuy3">Không</button>
          </div>`;
        $('#manMotPhan').classList.add('on');
        $('#xnHuy3').onclick = () => $('#manMotPhan').classList.remove('on');
        $('#xnOk').onclick = async () => {
          $('#manMotPhan').classList.remove('on');
          await goi('xoaTamUng', hsId);
          await napTamUng();
          veDsTamUngHienCo();
          baoToast('Đã xoá số dư tạm ứng.');
        };
      };
    });
  }

  async function moHopThemNoPhi() {
    TNP.hs = await goi('dsHocSinh');
    TNP.lop = ''; TNP.hsChon = null;
    veHopThemNoPhi();
    $('#manThemNoPhi').classList.add('on');
  }
  function veHopThemNoPhi() {
    const dsLop = [...new Set(TNP.hs.map((h) => h.lop))].sort();
    const trongLop = TNP.lop ? TNP.hs.filter((h) => h.lop === TNP.lop) : [];
    $('#hopThemNoPhi').innerHTML = `
      <h3>Thêm nợ phí</h3>
      <p class="mota">Ghi một khoản NỢ PHÍ bằng tay cho MỘT học sinh LẺ (không áp dụng gia đình —
        gia đình đã có cách gộp tiền riêng). Mỗi lần bấm "Thêm" sẽ ĐẺ THÊM MỘT DÒNG MỚI — kể cả
        trùng đúng em + đúng tháng với dòng đã có, KHÔNG gộp/đè dòng cũ. Xoá dòng thêm nhầm ngay ở
        ô của em đó trong Nợ phí (nút "Thêm nhầm").</p>
      <label class="dong" style="display:block;margin-bottom:8px">Lớp
        <select id="tnpLop" style="width:100%;margin-top:4px;padding:7px 9px;border-radius:8px;border:1px solid var(--glass-border);font-weight:700">
          <option value="">— Chọn lớp —</option>
          ${dsLop.map((l) => `<option value="${esc(l)}" ${TNP.lop === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
        </select>
      </label>
      ${TNP.lop ? `<div class="chon-ds" id="tnpDs" style="max-height:160px;border:1px solid var(--glass-border);border-radius:10px;margin-bottom:10px">
        ${trongLop.map((h) => `<div class="chon-hs ${TNP.hsChon === h.id ? 'dachon' : ''}" data-id="${h.id}">
          <span>${esc(h.ten)}</span></div>`).join('') || '<div class="mota" style="padding:10px">Lớp này chưa có học sinh.</div>'}
      </div>` : ''}
      ${TNP.hsChon ? `
        <p class="mota">Đang ghi nợ cho: <b>${esc((TNP.hs.find((h) => h.id === TNP.hsChon) || {}).ten)}</b></p>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <select id="tnpThang" style="flex:1;padding:7px 9px;border-radius:8px;border:1px solid var(--glass-border);font-weight:700">
            ${TEN_THANG.slice(1).map((t, i) => `<option value="${i + 1}" ${S.m === i + 1 ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <input type="number" id="tnpNam" value="${S.y}" min="2020" max="2100" style="width:100px">
        </div>
        <input type="number" id="tnpSoTien" placeholder="Số tiền nợ" min="0" step="50000" style="width:100%">
        <div class="hangnut"><button class="btn primary" id="tnpGhi">Thêm</button></div>
      ` : ''}
      <div class="hangnut" style="margin-top:14px"><span class="keo"></span><button class="btn" data-dong>Đóng</button></div>`;
    $('#tnpLop').onchange = () => { TNP.lop = $('#tnpLop').value; TNP.hsChon = null; veHopThemNoPhi(); };
    $$('#tnpDs .chon-hs').forEach((el) => {
      el.onclick = () => { TNP.hsChon = parseInt(el.getAttribute('data-id'), 10); veHopThemNoPhi(); };
    });
    if ($('#tnpGhi')) {
      $('#tnpGhi').onclick = async () => {
        const m = parseInt($('#tnpThang').value, 10);
        const y = parseInt($('#tnpNam').value, 10);
        const soTien = parseInt($('#tnpSoTien').value, 10) || 0;
        if (!y || y < 2020 || y > 2100) { baoToast('Năm không hợp lệ.'); return; }
        if (!soTien) { baoToast('Gõ số tiền nợ.'); return; }
        const hs = TNP.hs.find((h) => h.id === TNP.hsChon);
        await goi('themNoPhiRieng', { loai: 'hs', kieu: 'no', hsId: hs.id, m, y, soTien, tenLuc: hs.ten, lopLuc: hs.lop });
        await napNoPhi();
        baoToast(`Đã thêm nợ ${vnd(soTien)}đ cho ${hs.ten} — tháng ${m}/${y}.`);
        TNP.hsChon = null;
        veHopThemNoPhi();
      };
    }
  }

  function dongCtx() { $('#ctxThang').classList.remove('on'); $('#ctxHs').classList.remove('on'); $('#ctxXacNhan').classList.remove('on'); dongCanh(); }
  function datViTriCtx(el, x, y) {
    el.classList.add('on');
    const r = el.getBoundingClientRect();
    const px = Math.min(x, window.innerWidth - r.width - 8);
    const py = Math.min(y, window.innerHeight - r.height - 8);
    el.style.left = Math.max(8, px) + 'px';
    el.style.top = Math.max(8, py) + 'px';
  }
  function moCtxThang(x, y) {
    const daChot = !!(S.du.thang && S.du.thang.chot);
    $('#ctxThang').innerHTML = `
      <div class="muc tt">Cần thu tháng ${S.m}/${S.y}: <b>${vnd(S.tongCan || 0)}</b></div>
      <hr>
      <div class="muc" id="ctxChotThang">${daChot ? 'Chốt lại tháng này (cập nhật mốc)…' : 'Chốt tháng này…'}</div>
      <div class="muc" id="ctxDayWeb">Đẩy web…</div>`;
    datViTriCtx($('#ctxThang'), x, y);
    $('#ctxDayWeb').onclick = () => { dongCtx(); moHopDayWeb(); };
    $('#ctxChotThang').onclick = () => { dongCtx(); chayNutChotThang(); };
  }

  async function chayNutChotThang() {
    await goi('chotThang', S.m, S.y);
    await napThang();
    baoToast('Đã chốt tháng ' + S.m + '/' + S.y + '.');
  }

  function moHopLechChot() {
    const ds = S.du.lechChot || [];
    if (!ds.length) return;
    $('#hopLechChot').innerHTML = `
      <h3>⚠ myStudent đã đổi so với lần "Chốt tháng" trước</h3>
      <p class="mota">myPay đã TỰ CẬP NHẬT số mới nhất bên dưới — thầy xem qua các thay đổi này rồi
        bấm "Đã xem" (hoặc chốt lại mốc mới nếu đã ổn).</p>
      <div class="cuon" style="max-height:40vh"><ul class="lech-ds">${ds.map((d) => `<li>${esc(d.chu)}</li>`).join('')}</ul></div>
      <div class="hangnut">
        <button class="btn primary" id="lcDaXem">Đã xem</button>
        <button class="btn" id="lcChotLai">Chốt lại mốc mới</button>
      </div>`;
    $('#manLechChot').classList.add('on');
    $('#lcDaXem').onclick = () => dongMan();
    $('#lcChotLai').onclick = async () => { dongMan(); await chayNutChotThang(); };
  }

  async function moHopDayWeb() {
    $('#hopDayWeb').innerHTML = `<h3>Đẩy web — Tháng ${S.m}/${S.y}</h3><p class="mota">Đang tải…</p>`;
    $('#manDayWeb').classList.add('on');
    const xt = await goi('xemTruocFirestore', S.m, S.y);
    const ds = xt.ds || [];
    const seDay = ds.filter((d) => !d.boQua);
    const boQua = ds.filter((d) => d.boQua);
    const tongCan = seDay.reduce((s, d) => s + (d.canDong || 0), 0);
    const tongNhan = seDay.reduce((s, d) => s + (d.daNhan || 0), 0);
    const nhanTrangThai = (t) => (t === 'da_dong' ? 'Đã đóng' : t === 'thieu' ? 'Thiếu' : 'Chưa đóng');
    $('#hopDayWeb').innerHTML = `
      <h3>Đẩy web — Tháng ${S.m}/${S.y}</h3>
      <p class="mota">Xem lại danh sách sẽ ghi lên Firestore (web đọc được) rồi mới đẩy — không đẩy thẳng.</p>
      <div class="dayweb-tk">
        <span class="chip">Sẽ đẩy <b>${seDay.length}</b> em/nhà</span>
        <span class="chip xanh">Cần thu <b>${vnd(tongCan)}</b></span>
        <span class="chip">Đã nhận <b>${vnd(tongNhan)}</b></span>
      </div>
      ${boQua.length ? `<div class="dayweb-boqua">⚠ ${boQua.length} em KHÔNG đẩy được vì thiếu mã đăng nhập web: ${boQua.map((d) => esc(d.ten)).join(', ')}</div>` : ''}
      <div class="dayweb-ds">
        <table class="bang">
          <thead><tr><th>Tên</th><th>Lớp</th><th style="text-align:right">Cần đóng</th><th style="text-align:right">Đã nhận</th><th>Trạng thái</th></tr></thead>
          <tbody>${ds.map((d) => `<tr class="${d.boQua ? 'boqua' : ''}">
            <td>${esc(d.ten)}${d.giaDinh ? ' <small>(M)</small>' : ''}</td>
            <td>${esc(d.lop)}</td>
            <td class="sotien">${vnd(d.canDong)}</td>
            <td class="sotien">${vnd(d.daNhan)}</td>
            <td>${d.boQua ? 'Thiếu mã web' : esc(nhanTrangThai(d.trangThai))}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="hangnut">
        <button class="btn primary" id="dwXacNhan" ${seDay.length ? '' : 'disabled'}>Xác nhận đẩy ${seDay.length} em/nhà</button>
        <button class="btn" data-dong>Hủy</button>
      </div>`;
    $('#dwXacNhan').onclick = async () => {
      baoToast('Đang đẩy lên Firestore…');
      const kq = await goi('dayFirestore', S.m, S.y);
      dongMan();
      baoToast('Đã đẩy ' + kq.soDoc + ' tài liệu lên web.');
    };
  }

  async function chayDongBoTenNgam() {
    try {
      const kq = await goi('dongBoTen');
      if (kq.daSua.length) {
        await napThang();
        baoToast(`Đã tự nối lại ${kq.daSua.length} tên đổi (mức phí riêng theo kịp myStudent).`);
      }
      if (kq.khongKhop.length) {
        baoToast(`⚠ ${kq.khongKhop.length} tên lệch KHÔNG tự nối được (mơ hồ) — vào QUẢN LÝ HỌC SINH kiểm tra tay.`);
      }
    } catch (_) { /* đồng bộ ngầm — lỗi không được cản khởi động app */ }
  }

  function dongMan() { $$('.man').forEach((m) => m.classList.remove('on')); }
  function gaiChung() {
    $$('.rail .tab').forEach((b) => {
      b.onclick = () => {
        $$('.rail .tab').forEach((x) => x.classList.toggle('on', x === b));
        S.trang = b.dataset.trang;
        $('#trangThang').classList.toggle('on', S.trang === 'thang');
        $('#trangGiaodich').classList.toggle('on', S.trang === 'giaodich');
        $('#trangNoPhi').classList.toggle('on', S.trang === 'nophi');
        $('#trangCaidat').classList.toggle('on', S.trang === 'caidat');
        if (S.trang === 'nophi') napNoPhi();
      };
    });
    const doiThang = (d) => {
      if (d < 0 && S.du && !conLuiDuocThang(S.m, S.y, S.du.caiDat)) {
        baoToast('Đã tới tháng cũ nhất được xem (đặt ở Cài đặt → Các tháng).'); return;
      }
      if (d > 0 && !conToiDuocThang(S.m, S.y)) {
        baoToast('Không xem được tháng tương lai.'); return;
      }
      let m = S.m + d; let y = S.y;
      if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
      S.m = m; S.y = y; napThang();
      luuThangCuoiXem();
    };
    $('#thangTruoc').onclick = () => doiThang(-1);
    $('#thangSau').onclick = () => doiThang(1);
    $('#thangTruoc2').onclick = () => doiThang(-1);
    $('#thangSau2').onclick = () => doiThang(1);
    $$('.man').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) dongMan(); }));
    document.addEventListener('click', (e) => { if (e.target.closest('[data-dong]')) dongMan(); if (!e.target.closest('.ctxmenu')) dongCtx(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { dongMan(); dongCtx(); } });
    $('#nutQlHs').onclick = moHopQlHs;
    $('#nutHocMay').onclick = moHopHocMay;
    $('#nutHoaDon').onclick = () => moHopHd();
    $('#thangNhan').addEventListener('contextmenu', (e) => { e.preventDefault(); moCtxThang(e.clientX, e.clientY); });
    $('#nutXacNhan').onclick = moXacNhan;
    $('#nutDongPhiTruoc').onclick = moHopDongPhiTruoc;
    $('#nutThemNoPhi').onclick = moHopThemNoPhi;
    $('#nutXacNhan').addEventListener('contextmenu', (e) => { e.preventDefault(); moCtxXacNhan(e.clientX, e.clientY); });
    const locGiaoDich = () => { if (S.du && S.du.thang) veHangGiaoDich(S.du.thang, S.du.ketQuaGiaoDich); };
    $('#gdTimNoiDung').oninput = locGiaoDich;
    $('#gdTimSoTien').oninput = locGiaoDich;
    gaiDropzone();
  }

  (async function khoiDong() {
    gaiChung();
    try {
      const tt = await goi('thongTin');
      $('#brandVer').textContent = 'v' + tt.version;
    } catch (_) { /* shim */ }
    try {
      const fsT = await goi('fsTrangThai');
      $('#chipKhoa').textContent = fsT.coKhoa ? 'Firebase: có khóa ✓' : 'Firebase: chưa có khóa';
    } catch (_) { /* thôi */ }
    try {
      const cd = await goi('docCaiDat');
      if (cd && cd.thangCuoiXem && cd.thangCuoiXem.m && cd.thangCuoiXem.y) {
        const hn = new Date(); const mHt = hn.getMonth() + 1; const yHt = hn.getFullYear();
        const { m, y } = cd.thangCuoiXem;
        if (y < yHt || (y === yHt && m <= mHt)) { S.m = m; S.y = y; }
      }
    } catch (_) { /* shim hoặc lỗi đọc — giữ mặc định tháng hiện tại */ }
    await napThang();
    await napNoPhi();
    chayDongBoTenNgam(); // v0.8.0 — không chờ (không chặn khởi động), chạy nền
    console.log('[myPay] san sang — thang ' + S.m + '/' + S.y
      + ' | units=' + (S.du ? S.du.ketQua.units.length : -1)
      + ' | txns=' + (S.du ? S.du.ketQua.txns.length : -1)
      + ' | khop=' + (S.du ? Object.keys(S.du.ketQua.done).length : -1)
      + ' | nophi=' + (S.no ? S.no.soDong : -1));
  })();
  window.addEventListener('error', (e) => console.log('[myPay][LOI]', e.message, e.filename, e.lineno));
  window.addEventListener('unhandledrejection', (e) => console.log('[myPay][LOI-P]', String(e.reason)));

  window.__mypay = {
    S, QL, napThang, moHopGan, moHopHd, moHopQlHs, veQlHs, phanLoai, moCtxThang, moHopDayWeb,
    napNoPhi, veNoPhi, moCtxHs, moHopMotPhan, moHopThemNo, moHopHdTong, thieuThucTe, motPhanCua, trungTien,
    moHopHocMay, veHopHocMay, napChuaGanNhan, veChuaGanNhan, HM,
    moXacNhan, moCtxXacNhan, moHopDsXacNhan, demUngVienXacNhan,
    napTamUng, tamUngCuaHs, moHopDongPhiTruoc, moHopTruTamUng, conLuiDuocThang, conToiDuocThang,
    kiemLechThang, moHopLechThang,
  };
})();
