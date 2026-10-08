/* ⛔ FILE SINH TỰ ĐỘNG từ kho myPay v0.16.0 (d866402) bằng tools/dong-goi-web.js — ĐỪNG SỬA TAY (sửa ở kho myPay rồi đóng gói lại) */
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
      if (!d) return '';
      const chu = (d.kieu === 'sau' ? 'Đóng sau' : 'Nợ phí') + (coTien ? ' •' : '');
      return `<i class="no-nhan ${d.kieu === 'sau' ? 'sau' : 'no'}">${chu}</i> `;
    };
    const theoLop = {};
    function vaoLop(lop, row) { (theoLop[lop] = theoLop[lop] || []).push(row); }
    for (const u of kq.units) {
      if (u.kind === 'fam') {
        for (const m of u.members || []) vaoLop(m.lop, { u, giadinh: true, ten: m.ten, buoi: m.buoi });
      } else {
        vaoLop(u.classes[0], { u, giadinh: false, ten: u.label, buoi: u.buoi });
      }
    }
    const luoi = $('#luoiLop');
    luoi.innerHTML = '';
    const tenLops = Object.keys(theoLop).sort();
    const bac = { chuadong: 0, lech: 1, du: 2, khongbuoi: 3 };
    for (const lop of tenLops) {
      const dsRow = theoLop[lop];
      const coThuUnitIds = new Set(dsRow.filter((r) => r.buoi > 0).map((r) => r.u.id));
      const daDongUnitIds = new Set(dsRow.filter((r) => r.buoi > 0 && r.u.id in kq.done).map((r) => r.u.id));
      const card = document.createElement('div');
      card.className = 'lop-card glass';
      const pct = coThuUnitIds.size ? Math.round(daDongUnitIds.size / coThuUnitIds.size * 100) : 0;
      const veHang = (r) => {
        const { u, giadinh, ten, buoi } = r;
        const pl = phanLoai(u);
        const gc = ghiChuCua(pl, u);
        const daNhan = (u.id in kq.done) && kq.done[u.id] >= 0 ? kq.txns[kq.done[u.id]].amount : null;
        const th = laTieuHoc(lop, ten);
        return `<div class="hsrow ${pl.loai}${giadinh ? ' giadinh khoa' : ''}${th ? ' tieuhoc' : ''}" data-uid="${esc(u.id)}"${giadinh ? ' data-khoa="1" title="Em này thuộc gia đình nhiều con — thao tác ở thẻ GIA ĐÌNH bên dưới"' : ''}>
            <span class="cham"></span>
            <span class="ten">${esc(ten)}${th ? ' <span class="th-nhan">(Tiểu học)</span>' : ''}${giadinh ? ' <small>(gia đình)</small>' : ''} <small>· ${buoi} buổi</small></span>
            ${gc ? `<span class="ghichu">${esc(gc)}</span>` : ''}
            ${!giadinh && trungTien(u) ? '<span class="ghichu canhbao-trung" title="Vừa có ghi tay đóng một phần, vừa khớp được giao dịch ngân hàng — kiểm tra lại kẻo tính trùng một lần tiền">⚠ trùng?</span>' : ''}
            ${!giadinh && pl.loai !== 'du' ? conDuBadge(u) : ''}
            <span class="tien">${giadinh ? nhanNo(u, false) : nhanNo(u, true) + (pl.loai === 'chuadong' || pl.loai === 'motphan' ? vnd(u.expected) : vnd(daNhan ?? u.expected))}</span>
          </div>`;
      };
      const thuong = dsRow.filter((r) => !r.giadinh)
        .sort((a, b) => (bac[phanLoai(a.u).loai] - bac[phanLoai(b.u).loai]) || a.ten.localeCompare(b.ten, 'vi'));
      const giadinh = dsRow.filter((r) => r.giadinh).sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));
      card.innerHTML = `<h3>${esc(lop)} <span class="dem">${daDongUnitIds.size}/${coThuUnitIds.size} đã đóng</span></h3>
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
        .sort((a, b) => (bac[a.pl.loai] - bac[b.pl.loai]) || a.u.label.localeCompare(b.u.label, 'vi'));
      card.innerHTML = `<h3>GIA ĐÌNH <span class="dem">${daDong}/${coThu.length} đã đóng</span></h3>
        <div class="tienbar"><i style="width:${pct}%"></i></div>` +
        sx.map(({ u, pl }) => {
          const gc = ghiChuCua(pl, u);
          const daNhan = (u.id in kq.done) && kq.done[u.id] >= 0 ? kq.txns[kq.done[u.id]].amount : null;
          return `<div class="hsrow ${pl.loai}" data-uid="${esc(u.id)}">
            <span class="cham"></span>
            <span class="ten">${esc(u.label)} <small>· ${u.buoi} buổi</small></span>
            ${gc ? `<span class="ghichu">${esc(gc)}</span>` : ''}
            ${trungTien(u) ? '<span class="ghichu canhbao-trung" title="Vừa có ghi tay đóng một phần, vừa khớp được giao dịch ngân hàng — kiểm tra lại kẻo tính trùng một lần tiền">⚠ trùng?</span>' : ''}
            <span class="tien">${nhanNo(u, true)}${pl.loai === 'chuadong' || pl.loai === 'motphan' ? vnd(u.expected) : vnd(daNhan ?? u.expected)}</span>
          </div>`;
        }).join('');
      luoi.appendChild(card);
    }

    $$('#luoiLop .hsrow').forEach((el) => {
      if (el.dataset.khoa) {
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          baoToast('Em này thuộc gia đình nhiều con — thao tác ở thẻ GIA ĐÌNH bên dưới.');
        });
        return;
      }
      el.ondblclick = () => { moHopHd(el.dataset.uid); };
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

  const PHAI_DUP_MS = 320;
  let ctxPhaiHen = 0; let ctxPhaiTruoc = null; let dangDoiDong = false;
  async function doiDaDongNhanh(uid) {
    if (dangDoiDong) return;
    const kq = S.du.ketQua;
    const u = kq.units.find((z) => z.id === uid);
    if (!u) return;
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
        const canXem = laMau && !m.daDuyet;
        const via = m.via === 'TAY' ? 'thầy gán' : (laMau ? 'mẫu đã học' : 'tự khớp');
        xdHtml = canXem
          ? `<span class="nhan amber">⚠ ${esc(m.u.label)}</span>`
          : `<span class="nhan xanh">✓ ${esc(m.u.label)}</span>`;
        kqHtml = canXem
          ? '<small style="color:var(--amber)">mẫu đã học — cần xác nhận</small>'
          : `<small style="color:var(--text-dim)">${via}${laMau ? ' · đã xác nhận' : ''}</small>`;
        if (m.via === 'TAY') nut = `<button class="btn nho" data-huy="${ti}">Hủy gán</button>`;
        else if (canXem) nut = `<button class="btn nho primary" data-duyet="${ti}">Đúng rồi</button>
          <button class="btn nho" data-gan="${ti}">Gán tay</button>`;
        else if (laMau) nut = `<button class="btn nho" data-boduyet="${ti}">Bỏ xác nhận</button>`;
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
      hang.push(`<tr><td>${ti + 1}</td><td>${esc((tx.ngay || '').split(' ')[0])}</td>
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
        await napThang(); baoToast('Đã xác nhận giao dịch này là đúng.');
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
    baoToast('Đã nạp sao kê + đối soát xong.');
    kiemLechThang(paths); // v0.11.0 — cảnh báo khi file khả năng thuộc tháng khác
  }

  function kiemLechThang(paths) {
    const tenMoi = new Set(paths.map((p) => String(p).split(/[\\/]/).pop()));
    const txnsMoi = ((S.du.thang || {}).txns || []).filter((t) => tenMoi.has(t.nguon) && t.ngay);
    if (txnsMoi.length < 3) return; // quá ít giao dịch có ngày — không đủ để đoán
    const dem = {};
    for (const t of txnsMoi) {
      const p = String(t.ngay).split('/');
      const m = parseInt(p[1], 10); const y = parseInt(p[2], 10);
      if (!m || !y) continue;
      const k = y + '-' + m;
      dem[k] = (dem[k] || 0) + 1;
    }
    const tong = Object.values(dem).reduce((a, b) => a + b, 0);
    if (!tong) return;
    let modeK = null; let modeN = 0;
    for (const [k, n] of Object.entries(dem)) if (n > modeN) { modeN = n; modeK = k; }
    if (!modeK || modeN / tong < 0.5) return; // không có tháng nào áp đảo — khỏi đoán bừa
    const [modeY, modeM] = modeK.split('-').map(Number);
    let ySuggest = modeY; let mSuggest = modeM - 1;
    if (mSuggest < 1) { mSuggest = 12; ySuggest--; }
    if (mSuggest === S.m && ySuggest === S.y) return; // đúng tháng rồi — im lặng, đúng luật cũ
    moHopLechThang(mSuggest, ySuggest, modeM, modeY, [...tenMoi], paths);
  }
  function moHopLechThang(mSuggest, ySuggest, modeM, modeY, tenFiles, paths) {
    xacNhan('⚠ File có thể thuộc tháng khác',
      `Phần lớn giao dịch trong ${tenFiles.length === 1 ? `file "${tenFiles[0]}"` : `${tenFiles.length} file vừa nạp`} ` +
      `có ngày thuộc Tháng ${modeM}/${modeY}. Theo thói quen thu tiền (học phí một tháng thường đóng vào khoảng ` +
      `ngày 16 tháng SAU), file này khả năng cao là học phí Tháng ${mSuggest}/${ySuggest} — nhưng đang được nạp ` +
      `vào Tháng ${S.m}/${S.y}.`,
      `Chuyển sang Tháng ${mSuggest}/${ySuggest}`, async () => {
        baoToast('Đang chuyển sang Tháng ' + mSuggest + '/' + ySuggest + '…');
        const mCu = S.m; const yCu = S.y;
        for (const ten of tenFiles) await goi('xoaSaoKe', mCu, yCu, ten);
        S.m = mSuggest; S.y = ySuggest;
        await goi('napSaoKe', S.m, S.y, paths);
        await napThang();
        luuThangCuoiXem();
        baoToast(`Đã chuyển sang Tháng ${mSuggest}/${ySuggest} và nạp lại sao kê ở đó.`);
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
  function moXacNhan() {
    const { dem, tong } = demUngVienXacNhan();
    if (!dem) {
      baoToast('Không có giao dịch mới nào để xác nhận — hoặc đã vào Tháng hết rồi, hoặc còn "chưa rõ"/"mơ hồ" cần xử trước.');
      return;
    }
    xacNhan('Xác nhận đưa vào Tháng ' + S.m + '/' + S.y,
      `Sẽ ghi cứng ${dem} giao dịch (tổng ${vnd(tong)}đ) vào Tháng ${S.m}/${S.y}. Từ giờ dù xoá file hay dòng ở ` +
      'Giao dịch, dữ liệu này vẫn còn nguyên bên Tháng. Giao dịch còn "chưa rõ"/"mơ hồ" hoặc mẫu đã học chưa ' +
      'bấm "Đúng rồi" sẽ KHÔNG bị đưa vào — vẫn nằm ở Giao dịch để thầy xử tiếp.',
      'Xác nhận', async () => {
        const kq = await goi('xacNhanGiaoDich', S.m, S.y);
        await napThang();
        baoToast(`Đã xác nhận ${kq.them} giao dịch vào Tháng ${S.m}/${S.y}.`);
      });
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
      let ds = [];
      try {
        const du = await goi('docThang', d.m, d.y);
        const u = o.loai === 'nha'
          ? du.ketQua.units.find((z) => z.kind === 'fam' && String(z.idNha) === String(o.idNha))
          : du.ketQua.units.find((z) => String(z.hsId) === String(o.hsId));
        if (u) {
          ds = u.kind === 'fam'
            ? (u.members || []).map((mm) => ({ ten: mm.ten, lop: mm.lop, lich: mm.lich, buoi: mm.buoi, vang: mm.vang }))
            : [{ ten: u.label, lop: (u.classes || [])[0] || '', lich: u.lich, buoi: u.buoi, vang: u.vang }];
        }
      } catch (_) { ds = []; }  // tháng quá cũ / không đọc được sổ ngày → in phần tiền, bỏ lịch
      khoi.push({ m: d.m, y: d.y, soTien: d.soTien, ds });
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

  function veHoaDonTong(o, khoi) {
    const W = 760;
    const headH = 88; const titleH = 90; const thangDauH = 40; const sumH = 150;
    const caoKhoi = (k) => thangDauH + Math.max(1, k.ds.length) * caoLichThang(k.m, k.y);
    const H = headH + titleH + khoi.reduce((s, k) => s + caoKhoi(k), 0) + sumH;
    const cv = $('#hdTongCanvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#b91c1c'; g.fillRect(0, 0, W, headH);
    g.fillStyle = '#ffffff'; g.font = '800 30px Segoe UI'; g.textAlign = 'left';
    g.fillText('ANDREW CLASSES', 30, 50);
    g.font = '700 17px Segoe UI'; g.textAlign = 'right';
    g.fillText('HỌC PHÍ CÒN NỢ', W - 30, 48);
    g.textAlign = 'left';
    g.fillStyle = '#0f172a'; g.font = '800 26px Segoe UI';
    g.fillText(o.ten + (o.loai === 'nha' ? ' (đóng gộp gia đình)' : ''), 30, headH + 40);
    g.fillStyle = '#526074'; g.font = '600 16px Segoe UI';
    g.fillText((o.lop ? 'Lớp: ' + o.lop + ' · ' : '') + khoi.length + ' tháng còn nợ', 30, headH + 68);
    let yy = headH + titleH;
    for (const k of khoi) {
      g.fillStyle = '#b91c1c'; g.font = '800 19px Segoe UI'; g.textAlign = 'left';
      g.fillText(`THÁNG ${k.m}/${k.y}`, 30, yy + 20);
      g.textAlign = 'right'; g.fillText(vnd(k.soTien) + ' đ', W - 30, yy + 20); g.textAlign = 'left';
      yy += thangDauH;
      const caoLich = caoLichThang(k.m, k.y);
      if (!k.ds.length) {
        g.fillStyle = '#8592a6'; g.font = '600 15px Segoe UI';
        g.fillText('(không đọc được lịch học của tháng này)', 30, yy + 20);
        yy += caoLich;
      } else {
        for (const b of k.ds) {
          const tieuDe = `${b.ten} — ${b.lop} (${b.buoi} buổi có mặt` + (b.vang ? `, ${b.vang} vắng` : '') + ')';
          veLichThang(g, 30, yy, W - 60, tieuDe, b.lich, k.m, k.y);
          yy += caoLich;
        }
      }
    }
    yy += 8;
    g.strokeStyle = 'rgba(15,23,42,.15)'; g.beginPath(); g.moveTo(30, yy); g.lineTo(W - 30, yy); g.stroke();
    yy += 40;
    g.fillStyle = '#0f172a'; g.font = '800 22px Segoe UI'; g.fillText('TỔNG CỘNG CÒN NỢ', 30, yy);
    g.fillStyle = '#b91c1c'; g.font = '800 34px Segoe UI'; g.textAlign = 'right';
    g.fillText(vnd(o.tong) + ' đ', W - 30, yy + 2); g.textAlign = 'left';
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
      </tr>`;
    }).join('');
    $$('#thanCdLop tr').forEach((tr) => {
      tr.querySelectorAll('input').forEach((inp) => {
        inp.onchange = async () => {
          const L = tr.dataset.lop;
          const patch = { lop: {} };
          patch.lop[L] = {
            thu: tr.querySelector('.cdThu').checked,
            donGia: parseInt(tr.querySelector('.cdGia').value, 10) || 150000,
            tran: parseInt(tr.querySelector('.cdTran').value, 10) || 0,
            giamPct: parseInt(tr.querySelector('.cdGiam').value, 10) || 0,
            heSoBuoi: parseInt(tr.querySelector('.cdHeSo').value, 10) || 1,
          };
          await goi('ghiCaiDat', patch);
          await napThang(); baoToast('Đã lưu mức phí lớp ' + L + '.');
        };
      });
    });
    veThangBatDau(cd);
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
          : `<p class="mota"><a href="#" id="hdDoiNguoi">← Chọn người khác</a></p>`}
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
      veHoaDon(dang);
      veHangNut();
    }
    function veHangNut() {
      const u = dang && kq.units.find((x) => x.id === dang);
      const daDong = u && (u.id in kq.done);
      $('#hdHangNut').innerHTML = !u ? '<button class="btn" data-dong>Đóng</button>' : `
        <button class="btn" id="hdSaoChep">Sao chép ảnh</button>
        <button class="btn" id="hdTaiAnh">Tải ảnh</button>
        <button class="btn" id="hdDayWebEm" disabled title="Chưa mở — sẽ làm ở đợt sau">Đẩy web (em này)…</button>
        <span class="keo"></span>
        <button class="btn ${daDong ? '' : 'primary'}" id="hdDanhDauDong">${daDong ? '✓ Đã đóng — bỏ đánh dấu' : 'Đánh dấu ĐÃ ĐÓNG'}</button>
        <button class="btn" data-dong>Đóng</button>`;
      if (!u) return;
      $('#hdSaoChep').onclick = async () => {
        await goi('saoChepAnh', $('#hdCanvas').toDataURL('image/png'));
        baoToast('Đã sao chép ảnh hóa đơn.');
      };
      $('#hdTaiAnh').onclick = async () => {
        const ten = `${S.y}-${String(S.m).padStart(2, '0')}/${u.classes[0]} - ${u.label}.png`;
        const p = await goi('ghiHoaDon', ten, $('#hdCanvas').toDataURL('image/png'));
        baoToast('Đã lưu: ' + p);
      };
      $('#hdDanhDauDong').onclick = () => {
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
  const CAO_O = 52;
  function soHangLich(m, y) {
    const dow = new Date(y, m - 1, 1).getDay();
    return Math.ceil(((dow === 0 ? 6 : dow - 1) + soNgayThang(m, y)) / 7);
  }
  function caoLichThang(m, y) { return 32 + 22 + soHangLich(m, y) * CAO_O + 16; }
  function veLichThang(g, x0, y0, w, tieuDe, lich, mm, yy2) {
    const m = mm || S.m; const y = yy2 || S.y;
    const lichMap = new Map((lich || []).map((d) => [d.ngay, d]));
    g.fillStyle = '#0f172a'; g.font = '700 18px Segoe UI'; g.textAlign = 'left';
    g.fillText(tieuDe, x0, y0 + 18);
    const top = y0 + 32;
    const cols = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const cellW = w / 7;
    g.font = '600 13px Segoe UI'; g.fillStyle = '#8592a6';
    cols.forEach((c, i) => { g.textAlign = 'center'; g.fillText(c, x0 + i * cellW + cellW / 2, top + 14); });
    const soNgay = soNgayThang(m, y);
    const dowNgay1 = new Date(y, m - 1, 1).getDay(); // 0=CN..6=T7
    const colNgay1 = dowNgay1 === 0 ? 6 : dowNgay1 - 1;
    const cellH = CAO_O;
    const gridTop = top + 22;
    let soHang = 1;
    for (let d = 1; d <= soNgay; d++) {
      const idx = colNgay1 + (d - 1);
      const col = idx % 7; const row = Math.floor(idx / 7);
      soHang = Math.max(soHang, row + 1);
      const cx = x0 + col * cellW; const cy = gridTop + row * cellH;
      const info = lichMap.get(d);
      g.fillStyle = !info ? '#f1f5f9' : (info.coMat ? '#dcfce7' : '#fee2e2');
      g.fillRect(cx + 2, cy + 2, cellW - 4, cellH - 4);
      g.fillStyle = !info ? '#94a3b8' : (info.coMat ? '#166534' : '#991b1b');
      g.font = '700 13px Segoe UI'; g.textAlign = 'left';
      g.fillText(String(d), cx + 6, cy + 15);
      if (info) {
        g.textAlign = 'center';
        if (info.coMat) {
          g.font = '600 12px Segoe UI';
          g.fillText('✓', cx + cellW / 2, cy + CAO_O - 12);
        } else {
          veChuVuaO(g, (info.lyDo || 'Vắng').trim(), cx + cellW / 2, cy + 20, cellW - 6, CAO_O - 22);
        }
      }
    }
    return (gridTop + soHang * cellH) - y0 + 16; // chiều cao khối đã dùng
  }

  function veChuVuaO(g, chu, xGiua, yTren, wMax, hMax) {
    for (const co of [11, 10, 9, 8]) {
      g.font = '600 ' + co + 'px Segoe UI';
      const cao = co + 2;
      const dong = ngatDong(g, chu, wMax);
      const quaRong = dong.some((d) => g.measureText(d).width > wMax);
      if (!quaRong && dong.length * cao <= hMax) {
        dong.forEach((d, i) => g.fillText(d, xGiua, yTren + (i + 1) * cao));
        return;
      }
    }
    g.font = '600 8px Segoe UI';
    const dong = ngatDongCung(g, chu, wMax);
    dong.forEach((d, i) => g.fillText(d, xGiua, yTren + (i + 1) * 10));
  }
  function ngatDong(g, chu, wMax) {
    const tu = chu.split(/\s+/).filter(Boolean);
    const ds = []; let cur = '';
    for (const t of tu) {
      const thu = cur ? cur + ' ' + t : t;
      if (cur && g.measureText(thu).width > wMax) { ds.push(cur); cur = t; } else cur = thu;
    }
    if (cur) ds.push(cur);
    return ds.length ? ds : [chu];
  }
  function ngatDongCung(g, chu, wMax) {
    const ds = []; let cur = '';
    for (const c of chu) {
      if (cur && g.measureText(cur + c).width > wMax) { ds.push(cur); cur = c; } else cur += c;
    }
    if (cur) ds.push(cur);
    return ds;
  }

  function veHoaDon(uid) {
    const kq = S.du.ketQua;
    const u = kq.units.find((x) => x.id === uid);
    if (!u) return;
    const blocks = u.kind === 'fam'
      ? (u.members || []).map((m) => ({ ten: m.ten, lop: m.lop, lich: m.lich, buoi: m.buoi, vang: m.vang, choDuyet: m.choDuyet }))
      : [{ ten: u.label, lop: u.classes[0], lich: u.lich, buoi: u.buoi, vang: u.vang, choDuyet: u.choDuyet }];
    const W = 760;
    const headH = 88; const titleH = 90; const sumH = 190;
    const calH = caoLichThang(S.m, S.y);          // v0.7.0 — chiều cao THẬT, không hằng số cứng
    const H = headH + titleH + blocks.length * calH + sumH;
    const cv = $('#hdCanvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2563eb'; g.fillRect(0, 0, W, headH);
    g.fillStyle = '#ffffff'; g.font = '800 30px Segoe UI'; g.textAlign = 'left';
    g.fillText('ANDREW CLASSES', 30, 50);
    g.font = '700 17px Segoe UI'; g.textAlign = 'right';
    g.fillText(`HỌC PHÍ THÁNG ${S.m}/${S.y}`, W - 30, 48);
    g.textAlign = 'left';
    g.fillStyle = '#0f172a'; g.font = '800 26px Segoe UI';
    g.fillText(u.label + (u.kind === 'fam' ? ' (đóng gộp gia đình)' : ''), 30, headH + 40);
    g.fillStyle = '#526074'; g.font = '600 16px Segoe UI';
    g.fillText('Lớp: ' + u.classes.join(', '), 30, headH + 68);
    let yy = headH + titleH;
    for (const b of blocks) {
      const tieuDe = `${b.ten} — ${b.lop} (${b.buoi} buổi có mặt` +
        (b.vang ? `, ${b.vang} vắng` : '') + (b.choDuyet ? `, ${b.choDuyet} chưa chốt` : '') + ')';
      veLichThang(g, 30, yy, W - 60, tieuDe, b.lich);
      yy += calH;
    }
    yy += 16;
    g.strokeStyle = 'rgba(15,23,42,.15)'; g.beginPath(); g.moveTo(30, yy); g.lineTo(W - 30, yy); g.stroke();
    yy += 34;
    const dong = [['Tổng số buổi', String(u.buoi)]];
    if (u.kind === 'fam') dong.push(['Hệ số gia đình', String(u.heSo || '')]);
    else {
      if (u.cat && u.cat.tieuHoc) dong.push(['Học sinh tiểu học', 'trần 1.000.000đ']);
      else if (u.cat && u.cat.tran > 0) dong.push(['Trần tháng', vnd(u.cat.tran) + ' đ']);
      if (u.cat && u.cat.giamPct > 0) dong.push(['Ưu đãi', '−' + u.cat.giamPct + '%']);
      const tu = tamUngCuaHs(u.hsId);
      if (tu) {
        const daTruThangNay = (tu.lichSu || []).some((h) => h.loai === 'tru' && h.m === S.m && h.y === S.y);
        const soSauThang = (() => {
          const bg = (tu.lichSu || []).filter((h) => h.loai === 'tru' && h.m === S.m && h.y === S.y).pop();
          return bg ? bg.sauDu : tu.soDu;
        })();
        dong.push(['Số dư HP trước còn lại' + (daTruThangNay ? '' : ' (chưa trừ tháng này)'), vnd(soSauThang) + 'đ']);
      }
    }
    g.font = '600 18px Segoe UI';
    for (const [a, b2] of dong) {
      g.fillStyle = '#526074'; g.fillText(a, 30, yy);
      g.fillStyle = '#0f172a'; g.textAlign = 'right'; g.fillText(b2, W - 30, yy); g.textAlign = 'left';
      yy += 32;
    }
    yy += 14;
    g.fillStyle = '#0f172a'; g.font = '800 22px Segoe UI'; g.fillText('CẦN ĐÓNG', 30, yy);
    g.fillStyle = '#2563eb'; g.font = '800 34px Segoe UI'; g.textAlign = 'right';
    g.fillText(vnd(u.expected) + ' đ', W - 30, yy + 2); g.textAlign = 'left';
    yy += 44;
    const daDong = u.id in kq.done;
    g.fillStyle = daDong ? '#15803d' : '#b45309'; g.font = '700 18px Segoe UI';
    g.fillText(daDong ? '✓ ĐÃ NHẬN — Cảm ơn phụ huynh!' : 'Hạn nộp: 16/' + String(S.m === 12 ? 1 : S.m + 1).padStart(2, '0') + '/' + (S.m === 12 ? S.y + 1 : S.y), 30, yy);
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
      ${tu && tu.soDu ? '<div class="muc" id="ctxTamUng">Đóng từ HP còn dư…</div>' : ''}`;
    datViTriCtx(el, x, y);
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

  function dongCtx() { $('#ctxThang').classList.remove('on'); $('#ctxHs').classList.remove('on'); $('#ctxXacNhan').classList.remove('on'); }
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
