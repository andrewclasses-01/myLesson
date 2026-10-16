// ============================================================
// js/xem.js — NGƯỜI XEM TRẬN: ai đang xem (avatar tròn) · bình luận · thả tim cho từng bên (web v1.361.0, 16/10/2026)
// Mẫu thầy duyệt: D:\OTHERS\CLAUDE\DAU GAME ONLINE - thiet ke\mau-xem-v1 · luật: tools/dang-luat-xem-tran.js
//
// Một LỚP PHỦ riêng nằm trên khung trận (cùng toạ độ 1280×508 / 420×820, cùng tỉ lệ thu phóng) — không bị trận vẽ lại xoá mất,
// nên ô gõ bình luận giữ nguyên chữ + bàn phím (bàn phím thật của máy, KHÔNG dùng bàn chữ AWord).
//   · Người chơi: dải "ĐANG XEM" + avatar (góc dưới phải) · bình luận nổi lên rồi mờ dần · số tim mỗi bên cạnh ô điểm · tim bay.
//   · Người xem: thêm KHUNG BÌNH LUẬN (máy tính: cột phải · điện thoại: nửa dưới) có ô gõ + nút gửi; bấm TIM của bên nào là thả cho bên đó.
// Dữ liệu (noiKho — bàn thử / mẫu chuyền tin qua khung mẹ bằng nhan()):
//   tranDau/{id}/xem/{uid}  { ten, anh, gv, luc }  — người xem ghi nhịp 20 giây, rời trang thì xoá; > 45 giây không nhịp = đã rời
//   tranDau/{id}/bl/{tự}    { uid, ten, anh, gv, chu ≤ 120, luc (giờ máy chủ) } — chỉ NGƯỜI XEM (không phải 2 người chơi), 3 giây / lần, không link
//   tranDau/{id}/tim/{a|b}  { n }  — luật chỉ cho cộng đúng 1 mỗi lần ghi (increment)
// ============================================================
const MAX_AV = 5;
const NOI_MS = 5200;         // bình luận nổi trên màn người chơi bao lâu
const CHO_BL = 3000;         // 3 giây mới gửi được bình luận tiếp

export function taoXem(o) {
  // o = { vp, tenBen(k), ben() (bên của màn này: ô điểm TRÁI), toi(), gui(m), esc, laXem() }
  const esc = o.esc;
  const lop = document.createElement("div");
  lop.className = "xm";
  o.vp.appendChild(lop);
  const S = { nguoi: new Map(), bl: [], tim: { a: 0, b: 0 }, L: null, port: false, guiLuc: 0, kho: null, timKho: { a: null, b: null }, cho: { a: 0, b: 0 }, timLuc: 0 };
  let dungKhung = false;   // đã dựng phần tử cố định (pill tim, dải xem, khung bình luận) cho bố cục hiện tại chưa

  const tat = (ten) => String(ten || "?").trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(-2);
  const MAU = ["#0E7C6E", "#E0575B", "#3E7BFA", "#F0821E", "#8B5CF6", "#18A957", "#D9468F", "#2B9BB5"];
  const mau = (ten) => { let s = 0; for (const c of String(ten || "")) s += c.charCodeAt(0); return MAU[s % MAU.length]; };
  const av = (n, cls) => `<i class="xm-av ${cls || ""}" style="background:${n.anh ? `#0B2A1C url('${esc(n.anh)}') center/cover` : mau(n.ten)}" title="${esc(n.ten)}">${n.anh ? "" : esc(tat(n.ten))}</i>`;
  const TIM = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.3 8.3 2.2 4 6.3 4c2.3 0 3.9 1.4 5.7 3.5C13.8 5.4 15.4 4 17.7 4 21.8 4 23.7 8.3 22 11.7 19.5 16.4 12 21 12 21z"/></svg>';
  const MAT = '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const GUI = '<svg viewBox="0 0 24 24"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>';

  // ---------- bố cục (toạ độ trong khung trận) ----------
  // vị trí: ô tim mỗi bên · dải ĐANG XEM · vùng bình luận nổi (người chơi) · khung bình luận (người xem)
  function viTri() {
    const L = S.L, p = S.port, xem = o.laXem();
    if (!p) return {
      timA: { x: 44, y: 12 }, timB: { x: L.W - 44, y: 12 },
      dai: { r: 12, y: 470 },
      noi: { x: 900, y: 120, w: 356, h: 336 },                       // người chơi: góc dưới phải ô giữa
      khung: xem ? { x: 948, y: 56, w: 320, h: 408 } : null
    };
    return {
      timA: { x: 182, y: 55 }, timB: { x: L.W - 182, y: 55 },     // giữa hai chip tên (chip dài nhất ~115px mỗi bên)
      dai: { r: 10, y: 782 },
      noi: { x: 190, y: 250, w: 220, h: 100 },                       // người chơi: góc dưới phải ô chung (không đè bàn chữ)
      khung: xem ? { x: 10, y: 482, w: 400, h: 292 } : null
    };
  }
  // khung ô giữa của NGƯỜI XEM (trận vẽ bảng trực tiếp vào đây) — chừa chỗ cho khung bình luận
  function caKhung(L, port) {
    if (!port) return { x: 12, y: 56, w: 924, h: 408 };
    return { x: 10, y: 92, w: 400, h: 382 };
  }

  function dat(L, s, port) {
    const doi = !S.L || S.L !== L || S.port !== port;
    S.L = L; S.port = port;
    lop.style.width = L.W + "px"; lop.style.height = L.H + "px"; lop.style.transform = `scale(${s})`;
    if (doi) { dungKhung = false; ve(); }
  }

  // ---------- vẽ phần cố định (một lần mỗi bố cục) + cập nhật số ----------
  function ve() {
    if (!S.L) return;
    const v = viTri(), xem = o.laXem();
    if (S.benVe !== o.ben() + xem) { S.benVe = o.ben() + xem; dungKhung = false; }   // bên của màn / vai người xem đổi ⇒ dựng lại
    if (!dungKhung) {
      dungKhung = true;
      const giu = lop.querySelector(".xm-o"), chu = giu ? giu.value : "";
      lop.innerHTML =
        ["a", "b"].map((k) => { const trai = k === o.ben(), p = trai ? v.timA : v.timB;   // ô bên TRÁI = bên của màn này (như ô điểm)
          return `<button type="button" class="xm-tim s${trai ? 0 : 1}${xem ? " bam" : ""}${S.port ? " nho" : ""}" data-tim="${k}" style="left:${p.x}px;top:${p.y}px" ${xem ? "" : 'tabindex="-1"'} aria-label="Thả tim cho ${esc(o.tenBen(k))}">${TIM}<b>0</b></button>`; }).join("") +
        `<div class="xm-dai" style="right:${v.dai.r}px;top:${v.dai.y}px" hidden><span class="xm-mat">${MAT}<b>0</b></span><span class="xm-ds"></span></div>` +
        `<div class="xm-noi" style="left:${v.noi.x}px;top:${v.noi.y}px;width:${v.noi.w}px;height:${v.noi.h}px"></div>` +
        (v.khung ? `<div class="xm-khung${S.port ? " port" : ""}" style="left:${v.khung.x}px;top:${v.khung.y}px;width:${v.khung.w}px;height:${v.khung.h}px">` +
          `<div class="xm-dau"><span>BÌNH LUẬN</span><small>Thả tim: bấm tim cạnh điểm của bạn em muốn cổ vũ</small></div>` +
          `<ol class="xm-ds-bl"></ol>` +
          `<form class="xm-go"><input class="xm-o" type="text" maxlength="120" enterkeyhint="send" autocomplete="off" placeholder="Viết bình luận…" aria-label="Viết bình luận"><button type="submit" class="xm-gui" aria-label="Gửi bình luận">${GUI}</button></form></div>` : "") +
        `<div class="xm-bay-lop"></div>`;
      const ip = lop.querySelector(".xm-o"); if (ip) ip.value = chu;
      const f = lop.querySelector(".xm-go"); if (f) f.onsubmit = (e) => { e.preventDefault(); guiBl(); };
      lop.querySelectorAll("[data-tim].bam").forEach((b) => { b.onclick = () => thaTim(b.getAttribute("data-tim")); });
      veDsBl();
    }
    ["a", "b"].forEach((k) => { const b = lop.querySelector(`[data-tim="${k}"] b`); if (b) b.textContent = S.tim[k]; });
    // dải ĐANG XEM: số người + tối đa 5 avatar (mới vào đứng đầu) + "+n"
    const dai = lop.querySelector(".xm-dai"), ds = [...S.nguoi.values()].sort((p, q) => q.vao - p.vao);
    dai.hidden = !ds.length;
    dai.querySelector(".xm-mat b").textContent = ds.length;
    dai.querySelector(".xm-ds").innerHTML = ds.slice(0, MAX_AV).map((n) => av(n, n.moi ? "moi" : "")).join("") + (ds.length > MAX_AV ? `<i class="xm-av them">+${ds.length - MAX_AV}</i>` : "");
    ds.forEach((n) => { n.moi = false; });
  }
  function veDsBl() {
    const ol = lop.querySelector(".xm-ds-bl"); if (!ol) return;
    ol.innerHTML = S.bl.length ? S.bl.map(dongBl).join("") : '<li class="trong">Chưa có bình luận — em viết lời cổ vũ đầu tiên nhé!</li>';
    ol.scrollTop = ol.scrollHeight;
  }
  const dongBl = (x) => `<li>${av(x)}<div><b>${esc(x.ten)}${x.gv ? ' <em>THẦY</em>' : ""}</b><span>${esc(x.chu)}</span></div></li>`;

  // ---------- việc của người xem ----------
  function guiBl() {
    const ip = lop.querySelector(".xm-o"), chu = String(ip.value || "").trim().replace(/\s+/g, " ").slice(0, 120);
    if (!chu) return;
    if (/(https?:|:\/\/|www\.|\.(com|vn|net|org|io|me|gg)\b)/i.test(chu)) return baoNho("Bình luận không được chứa đường link.");
    if (Date.now() - S.guiLuc < CHO_BL) return baoNho("Chờ 3 giây rồi gửi tiếp nhé.");
    S.guiLuc = Date.now(); ip.value = "";
    const me = o.toi(), m = { k: "bl", uid: me.uid, ten: me.ten, anh: me.anh || "", gv: !!me.gv, chu };
    if (!S.kho) { nhan(m); o.gui(m); return; }
    // thật: ghi kho — bình luận hiện lại qua kênh nghe (kể cả của chính mình)
    (async () => {
      try {
        if (window.NW && NW.kiemTuCam) { const tu = await NW.kiemTuCam(chu); if (tu) { ip.value = chu; return baoNho('Bình luận có từ không phù hợp ("' + tu + '").'); } }
        const fs = S.kho.f.fs;
        await fs.addDoc(fs.collection(S.kho.ref, "bl"), { uid: m.uid, ten: m.ten, anh: m.anh, gv: m.gv, chu, luc: fs.serverTimestamp() });
      } catch (e) { ip.value = chu; baoNho("Chưa gửi được — em thử lại nhé."); console.warn("[xem] bình luận", e); }
    })();
  }
  function thaTim(k) {
    if (Date.now() - S.timLuc < 150) return;   // bấm dồn quá nhanh
    S.timLuc = Date.now();
    const me = o.toi(), m = { k: "tim", ben: k, uid: me.uid };
    if (S.kho) {   // thật: hiện ngay (đếm "chờ"), ghi kho +1; kênh nghe trừ phần của mình để không bay hai lần
      S.cho[k]++; S.tim[k]++; ve(); bayTim(k, 1);
      const fs = S.kho.f.fs;
      fs.setDoc(fs.doc(S.kho.ref, "tim", k), { n: fs.increment(1) }, { merge: true }).catch((e) => { S.cho[k] = Math.max(0, S.cho[k] - 1); S.tim[k] = Math.max(0, S.tim[k] - 1); ve(); console.warn("[xem] tim", e); });
    } else { nhan(m); o.gui(m); }
    const b = lop.querySelector(`[data-tim="${k}"]`); if (b) { b.classList.remove("nay"); void b.offsetWidth; b.classList.add("nay"); }
  }
  function baoNho(chu) {
    const f = lop.querySelector(".xm-go"); if (!f) return;
    let n = f.querySelector(".xm-nho"); if (!n) { n = document.createElement("div"); n.className = "xm-nho"; f.appendChild(n); }
    n.textContent = chu; n.classList.add("hien"); clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove("hien"), 1800);
  }

  // ---------- hiệu ứng ----------
  // tim bay "lung tung" quanh vùng bình luận: xuất phát từ đáy vùng, lượn trái phải, bay lên rồi mờ
  function bayTim(k, so) {
    const v = viTri(), vung = v.khung || v.noi, host = lop.querySelector(".xm-bay-lop"); if (!host) return;
    for (let i = 0; i < (so || 1); i++) {
      const h = document.createElement("i");
      h.className = "xm-bay s" + (k === o.ben() ? 0 : 1);
      h.innerHTML = TIM;
      const x = vung.x + 20 + Math.random() * (vung.w - 40), y = vung.y + vung.h - 30 - Math.random() * 40;
      h.style.left = x + "px"; h.style.top = y + "px";
      h.style.setProperty("--dx", (Math.random() * 120 - 60).toFixed(0) + "px");
      h.style.setProperty("--dy", (-(vung.h * (0.55 + Math.random() * 0.4))).toFixed(0) + "px");
      h.style.setProperty("--r", (Math.random() * 50 - 25).toFixed(0) + "deg");
      h.style.setProperty("--t", (1.8 + Math.random() * 1.2).toFixed(2) + "s");
      h.style.setProperty("--to", (0.8 + Math.random() * 0.6).toFixed(2));
      setTimeout(() => host.appendChild(h), i * 90);
      setTimeout(() => h.remove(), 3400 + i * 90);
    }
  }
  // người chơi: bình luận nổi lên ở góc, tối đa 3, mờ dần sau 5 giây
  function noiBl(x) {
    if (o.laXem()) return;
    const host = lop.querySelector(".xm-noi"); if (!host) return;
    const el = document.createElement("div"); el.className = "xm-bong"; el.innerHTML = dongBl(x).replace(/^<li>|<\/li>$/g, "");
    host.appendChild(el);
    while (host.children.length > (S.port ? 2 : 3)) host.firstChild.remove();
    setTimeout(() => { el.classList.add("di"); setTimeout(() => el.remove(), 600); }, NOI_MS);
  }

  // ---------- nhận tin (của mình hoặc người khác) ----------
  function nhan(m) {
    if (m.k === "vao") { if (!S.nguoi.has(m.uid)) S.nguoi.set(m.uid, { ten: m.ten, anh: m.anh || "", gv: !!m.gv, vao: Date.now(), moi: true }); ve(); }
    else if (m.k === "ra") { S.nguoi.delete(m.uid); ve(); }
    else if (m.k === "bl") { S.bl.push(m); if (S.bl.length > 60) S.bl.shift(); veDsBl(); noiBl(m); }
    else if (m.k === "tim" && (m.ben === "a" || m.ben === "b")) { S.tim[m.ben]++; ve(); bayTim(m.ben, m.so || 1); }
  }

  // ---------- KHO THẬT: nghe người xem / bình luận / tim; người xem ghi nhịp ----------
  // k = { f (NW.fb()), ref (tranDau/{id}), toi { uid, ten, anh, gv }, laXem }
  function noiKho(k) {
    if (S.kho) return;
    S.kho = k; const fs = k.f.fs;
    const docXem = (snap) => {
      const bay = Date.now(), moi = new Map();
      snap.forEach((d) => { const x = d.data() || {}; if ((x.luc || 0) > bay - 45000) { const cu = S.nguoi.get(d.id); moi.set(d.id, { ten: x.ten || "?", anh: x.anh || "", gv: !!x.gv, luc: x.luc, vao: cu ? cu.vao : bay, moi: !cu }); } });
      S.nguoi = moi; ve();
    };
    let xemSnap = null;
    fs.onSnapshot(fs.collection(k.ref, "xem"), (s) => { xemSnap = s; docXem(s); }, (e) => console.warn("[xem] người xem", e));
    setInterval(() => { if (xemSnap) docXem(xemSnap); }, 15000);   // ai quá 45 giây không nhịp thì rơi khỏi dải
    let dau = true;
    fs.onSnapshot(fs.query(fs.collection(k.ref, "bl"), fs.orderBy("luc"), fs.limitToLast(40)), (s) => {
      s.docChanges().forEach((c) => {
        if (c.type !== "added" || S.bl.some((x) => x.id === c.doc.id)) return;
        const x = c.doc.data({ serverTimestamps: "estimate" }) || {};
        const m = { k: "bl", id: c.doc.id, uid: x.uid, ten: x.ten || "?", anh: x.anh || "", gv: !!x.gv, chu: String(x.chu || "") };
        S.bl.push(m); if (!dau) noiBl(m);
      });
      if (S.bl.length > 60) S.bl.splice(0, S.bl.length - 60);
      dau = false; veDsBl();
    }, (e) => console.warn("[xem] bình luận", e));
    ["a", "b"].forEach((b) => fs.onSnapshot(fs.doc(k.ref, "tim", b), (s) => {
      const n = s.exists() ? (s.data().n || 0) : 0;
      if (S.timKho[b] == null) { S.timKho[b] = n; S.tim[b] = n + S.cho[b]; return ve(); }
      const d = n - S.timKho[b]; S.timKho[b] = n;
      const khac = Math.max(0, d - S.cho[b]); S.cho[b] = Math.max(0, S.cho[b] - Math.max(0, d));
      S.tim[b] = n + S.cho[b]; ve();
      if (khac > 0) bayTim(b, Math.min(5, khac));
    }, () => { }));
    if (k.laXem && k.toi && k.toi.uid) {
      const ref = fs.doc(k.ref, "xem", k.toi.uid);
      const ghi = () => fs.setDoc(ref, { ten: k.toi.ten || "?", anh: k.toi.anh || "", gv: !!k.toi.gv, luc: Date.now() }).catch((e) => console.warn("[xem] nhịp xem", e));
      ghi(); setInterval(ghi, 20000);
      addEventListener("pagehide", () => { fs.deleteDoc(ref).catch(() => { }); });
    }
  }

  return { dat, ve, nhan, caKhung, noiKho, lam: () => { dungKhung = false; ve(); } };
}
