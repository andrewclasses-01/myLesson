// ============================================================
// xuat-ban.mjs — XUẤT BẢN THU GỌN myLesson Web lên GitHub Pages (v1.305.0, 11/10/2026 — đợt tốc độ sau audit).
// Chép đường của AWord Đợt 482 (AWord/web/tools/xuat-ban.mjs), thêm phần thu gọn <script>/<style> NHÚNG trong HTML
// (bai.html 30 %, lop.html 43 %, chung.js 47 % là chú thích).
//
// Chạy tay:  node tools/xuat-ban.mjs [thư_mục_ra=_site]   (cần `npm i esbuild` ở đâu đó trong đường tìm module)
// CI:        .github/workflows/xuat-ban.yml chạy mỗi lần push main ⇒ upload _site ⇒ deploy Pages.
//
// Luật:
//   - .js/.css: esbuild `transform` TỪNG FILE (không gộp, không đổi tên file, không đổi đường dẫn ?v=). Script THƯỜNG
//     (không import/export) ⇒ esbuild GIỮ NGUYÊN tên cấp cao nhất (biến/hàm toàn cục dùng chung giữa các file và
//     onclick="..." trong HTML) — chỉ đổi tên biến bên trong hàm. Đo thử 11/10 trước khi bật.
//   - .html: thu gọn TỪNG khối <script> (không src, type rỗng/text/javascript/module) và <style>; bỏ chú thích HTML
//     <!-- --> NGOÀI các khối đó. Phần HTML còn lại giữ nguyên từng byte. Khối nào thu gọn lỗi ⇒ giữ nguyên khối đó.
//   - Bỏ qua (không thu gọn, chép nguyên): *.min.*, vendor/, data/ (bai.json/lop.json — app myLesson kiểm `capNhat`
//     trên live bằng nội dung file), ảnh/phông/manifest.
//   - KHÔNG xuất bản: .git .github node_modules _site tools/ và mọi *.md (công cụ đăng luật, ghi chú nội bộ — audit S7).
//   - build.json ở gốc: { sha, luc, thuGon, giuNguyen, boQua, loi[], nguon{ "đường/dẫn": sha256-16 của file NGUỒN (LF) } }
//     ⇒ KIỂM BẢN LIVE bằng `python tools/kiem-live.py` (so build.json với HEAD), KHÔNG so băm .js/.css/.html trực tiếp nữa.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { transform } from 'esbuild';
import { xuatAnhKho } from './anh-kho-tinh.mjs';   // v1.308.0 — điền ảnh đại diện em mới từ kho lessonAvatar

const GOC = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const RA = path.resolve(GOC, process.argv[2] || '_site');
const BO_QUA_THU_MUC = new Set(['.git', '.github', 'node_modules', '_site', 'tools']);
const KHONG_XUAT_BAN = /\.md$/i;
const KHONG_THU_GON = /(^|\/)(vendor|data)\/|\.min\.(js|css)$/i;

let sha = process.env.GITHUB_SHA || '';
if (!sha) { try { sha = execSync('git rev-parse HEAD', { cwd: GOC }).toString().trim(); } catch { sha = '?'; } }

const nguon = {}, loi = [];
let thuGon = 0, giuNguyen = 0, boQua = 0, truoc = 0, sau = 0;
const bam = (s) => crypto.createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);

function* duyet(thuMuc, tuongDoi = '') {
  for (const e of fs.readdirSync(thuMuc, { withFileTypes: true })) {
    if (!tuongDoi && BO_QUA_THU_MUC.has(e.name)) { boQua++; continue; }
    if (e.name === '.git') continue;
    const td = tuongDoi ? tuongDoi + '/' + e.name : e.name;
    const p = path.join(thuMuc, e.name);
    if (e.isDirectory()) yield* duyet(p, td);
    else if (e.isFile()) yield [p, td];
  }
}

const gon = async (src, loader) => (await transform(src, { loader, minify: true, legalComments: 'none', charset: 'utf8' })).code;

// Thu gọn MỘT trang HTML: từng khối script/style riêng, chú thích HTML ngoài khối thì bỏ.
async function gonHtml(html, td) {
  const re = /<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let ra = '', i = 0, m;
  const ngoai = (s) => s.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
  while ((m = re.exec(html))) {
    ra += ngoai(html.slice(i, m.index));
    const [toan, the, attr, than] = m;
    let moi = toan;
    const laScript = the.toLowerCase() === 'script';
    const coSrc = /\bsrc\s*=/i.test(attr);
    const kieu = (attr.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || '';
    const thuGonDuoc = laScript ? (!coSrc && (!kieu || /^(text\/javascript|module)$/i.test(kieu))) : true;
    if (thuGonDuoc && than.trim()) {
      try {
        let code = await gon(than, laScript ? 'js' : 'css');
        // khối script không được chứa "</script" thô sau thu gọn (esbuild giữ nguyên chuỗi đã escape, phòng hờ)
        if (laScript && /<\/script/i.test(code)) throw new Error('chuỗi </script trong khối');
        code = code.replace(/\n$/, '');
        if (code.length < than.length) moi = `<${the}${attr}>${code}</${the}>`;
      } catch (e) { loi.push(`${td}: khối <${the}> — ${String(e.message || e).split('\n')[0]}`); }
    }
    ra += moi;
    i = m.index + toan.length;
  }
  return ra + ngoai(html.slice(i));
}

if (fs.existsSync(RA)) fs.rmSync(RA, { recursive: true, force: true });
for (const [p, td] of duyet(GOC)) {
  if (KHONG_XUAT_BAN.test(td)) { boQua++; continue; }
  const dich = path.join(RA, td);
  fs.mkdirSync(path.dirname(dich), { recursive: true });
  const buf = fs.readFileSync(p);
  const loai = /\.(m?js)$/i.test(td) ? 'js' : /\.css$/i.test(td) ? 'css' : /\.html?$/i.test(td) ? 'html' : '';
  if (!loai || KHONG_THU_GON.test(td)) { fs.writeFileSync(dich, buf); continue; }
  const src = buf.toString('utf8');
  nguon[td] = bam(src);
  try {
    const out = loai === 'html' ? await gonHtml(src, td) : await gon(src, loai);
    if (Buffer.byteLength(out) >= buf.length) { fs.writeFileSync(dich, buf); giuNguyen++; continue; }
    fs.writeFileSync(dich, out); thuGon++; truoc += buf.length; sau += Buffer.byteLength(out);
  } catch (e) {
    fs.writeFileSync(dich, buf); giuNguyen++;
    loi.push(`${td}: ${String(e.message || e).split('\n')[0]}`);
  }
}
// v1.308.0 — ảnh đại diện em CHƯA có file tĩnh: lấy từ kho `lessonAvatar` ghi thẳng vào bản xuất bản (không commit). Lỗi ⇒ chỉ báo.
const ak = await xuatAnhKho(RA);
const anhKho = { ghi: ak.ghi, go: ak.go, loi: ak.loi.length };
fs.writeFileSync(path.join(RA, 'build.json'), JSON.stringify({ sha, luc: new Date().toISOString(), thuGon, giuNguyen, boQua, loi, anhKho, nguon }, null, 0));
console.log(`xuat-ban: ${thuGon} file thu gọn (${Math.round(truoc / 1024)} KB → ${Math.round(sau / 1024)} KB), ${giuNguyen} giữ nguyên, ${boQua} bỏ qua, ${loi.length} lỗi → ${RA}`);
if (loi.length) console.log(' - ' + loi.join('\n - '));
