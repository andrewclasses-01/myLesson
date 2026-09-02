# =============================================================
# web v1.54.1 — DẬP `js/som.js` (khởi động sớm) THẲNG VÀO <head> CỦA 5 TRANG
#
# Vì sao không nạp bằng <script src="js/som.js">: mọi <script src> ở <head> chặn
# việc đọc trang cho tới khi file về — cache đã quá 10 phút (GitHub Pages) thì
# config.js + som.js mỗi cái tốn một lượt hỏi-lại ~300ms TRƯỚC KHI vẽ được bất
# cứ gì (đo live 03/09: data chỉ bắt đầu ở 765ms, tệ hơn bản cũ 418ms). Dập
# thẳng mã vào HTML thì không tốn lượt nào: bốn lượt xin dữ liệu bắn ra ngay
# khi trình duyệt đọc tới <head>.
#
# NGUỒN DUY NHẤT: `js/som.js` (giữ nguyên file, không trang nào nạp nó) + hai
# giá trị `projectId`/`apiKey` đọc từ `config.js` (AWORD_DB). Khối dập nằm giữa
# hai mốc `<!-- SOM:BEGIN -->` … `<!-- SOM:END -->` — ⛔ ĐỪNG SỬA TAY khối đó.
#
# Cách dùng (chạy trong web/):
#   python tools/sinh-som.py            # in trạng thái
#   python tools/sinh-som.py --check    # mã thoát 1 nếu trang nào lệch so với nguồn
#   python tools/sinh-som.py --write    # dập lại 5 trang
# KHI NÀO CHẠY LẠI: sửa js/som.js, hoặc đổi AWORD_DB trong config.js.
# =============================================================
import os, re, sys, io
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # .../web
PAGES = ["lop.html", "bai.html", "bai-sp.html", "sp-chitiet.html", "dashboard.html"]
BEGIN, END = "<!-- SOM:BEGIN -->", "<!-- SOM:END -->"

def read(rel): return io.open(os.path.join(ROOT, rel), encoding="utf-8", newline="").read()

def config_db():
    cfg = read("config.js")
    m = re.search(r"AWORD_DB\s*:\s*\{(.*?)\}", cfg, re.S)
    if not m: raise SystemExit("không thấy AWORD_DB trong config.js")
    body = m.group(1)
    pid = re.search(r"projectId\s*:\s*['\"]([^'\"]+)['\"]", body)
    key = re.search(r"apiKey\s*:\s*['\"]([^'\"]+)['\"]", body)
    if not pid or not key: raise SystemExit("AWORD_DB thiếu projectId/apiKey")
    return pid.group(1), key.group(1)

def block():
    src = read("js/som.js")
    pid, key = config_db()
    # bỏ khối chú thích đầu file (đã có ở js/som.js), giữ phần mã
    code = src[src.index("(function () {"):]
    stamp = ("var C = { AWORD_DB: { projectId: '%s', apiKey: '%s' } }; "
             "/* dập từ config.js */" % (pid, key))
    old = "var C = window.MYLESSON_CONFIG || {};"
    if old not in code: raise SystemExit("js/som.js không còn dòng `var C = window.MYLESSON_CONFIG || {};`")
    code = code.replace(old, stamp)
    return (BEGIN + "\n<!-- ⚡ SINH TỰ ĐỘNG từ js/som.js bằng `python tools/sinh-som.py --write` — ĐỪNG SỬA TAY.\n"
            "     Khởi động sớm: xin lop.json · bai.json · lessonHan · lessonNghi ngay tại đây,\n"
            "     chung.js nhận lại qua window.__napSom (xem js/som.js + BAN GIAO mục 0⚡). -->\n"
            "<script>\n" + code.rstrip("\r\n") + "\n</script>\n" + END)

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    want = block(); bad = 0
    for page in PAGES:
        path = os.path.join(ROOT, page)
        html = read(page)
        a, b = html.find(BEGIN), html.find(END)
        if a < 0 or b < 0: raise SystemExit(f"{page}: thiếu mốc SOM:BEGIN/END")
        have = html[a:b + len(END)]
        ok = have == want
        print(f"{page}: {'KHỚP' if ok else 'LỆCH'}")
        if not ok:
            bad += 1
            if mode == "--write":
                new = html[:a] + want + html[b + len(END):]
                tmp = path + ".tmp"
                io.open(tmp, "w", encoding="utf-8", newline="").write(new)
                os.replace(tmp, path)
                print(f"    -> đã dập lại {page}")
    if mode == "--check" and bad: sys.exit(1)

if __name__ == "__main__":
    main()
