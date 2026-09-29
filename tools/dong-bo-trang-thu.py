# -*- coding: utf-8 -*-
"""dong-bo-trang-thu.py — CHÉP TRANG THẬT SANG TRANG THỬ (29/09/2026, web v1.178.0).

Thầy chốt 29/09: trang thử (andrewclasses-01.github.io/andrewclasses-thu) và trang thật (andrewclasses.com) GIỐNG HỆT NHAU —
sửa bên này là bên kia y hệt. Chỉ khác ở chỗ trang thật bấm tab myNetwork thì hiện hộp "sắp ra mắt", trang thử mở luôn.
Chỗ khác đó nằm TRONG CODE (config.js `AC_THU` theo tên miền) ⇒ file hai bên giống hệt từng chữ, trang thử = bản chép.

⛔ Từ nay KHÔNG sửa tay trong kho thử — sửa ở kho `web` thật (nw/ đã có cổng: trang thật tự về trang chủ), push, rồi chạy:

    python tools/dong-bo-trang-thu.py            (xem trước: chép vào kho thử, in thay đổi, KHÔNG commit)
    python tools/dong-bo-trang-thu.py --day      (chép + commit + push kho thử)

Nguồn = `origin/main` của kho web (bản ĐÃ push — không lấy file đang sửa dở). Bỏ: data/ · assets/avatar/ · tools/ · CNAME
(dữ liệu học sinh + khoá — kho thử công khai, KHÔNG được chứa) · README.md · .gitignore (của riêng kho thử).
"""
import io, os, shutil, subprocess, sys, tarfile, tempfile

WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THU = r'E:\LAP TRINH APP\andrewclasses-thu'
BO = ('data/', 'assets/avatar/', 'tools/')
BO_FILE = ('CNAME', 'README.md', '.gitignore')
GIU_THU = ('README.md', '.gitignore')


def git(cwd, *a, **k):
    return subprocess.run(['git', *a], cwd=cwd, check=True, capture_output=True, **k).stdout


def bo_qua(p):
    return p in BO_FILE or any(p.startswith(b) for b in BO)


def main():
    day = '--day' in sys.argv
    git(WEB, 'fetch', '-q', 'origin')
    sha = git(WEB, 'rev-parse', '--short', 'origin/main').decode().strip()
    ban = git(WEB, 'show', 'origin/main:config.js').decode('utf-8')
    ban = ban.split("PHIEN_BAN: '", 1)[1].split("'", 1)[0]

    if git(THU, 'status', '--porcelain').strip():
        sys.exit('CHỐT DỪNG: kho thử đang có thay đổi chưa commit — xem lại trước (git -C "%s" status).' % THU)
    git(THU, 'pull', '-q', '--ff-only')

    # ① gỡ mọi file ĐANG THEO DÕI của kho thử (trừ README/.gitignore riêng) — file đã bỏ ở trang thật cũng mất theo
    for p in git(THU, 'ls-files', '-z').decode('utf-8').split('\0'):
        if p and p not in GIU_THU:
            f = os.path.join(THU, p)
            if os.path.isfile(f):
                os.remove(f)
    # ② chép bản origin/main (git archive) trừ vùng cấm
    so = 0
    with tarfile.open(fileobj=io.BytesIO(git(WEB, 'archive', '--format=tar', 'origin/main'))) as tar:
        for m in tar.getmembers():
            if not m.isfile() or bo_qua(m.name):
                continue
            dich = os.path.join(THU, m.name.replace('/', os.sep))
            os.makedirs(os.path.dirname(dich), exist_ok=True)
            with tar.extractfile(m) as nguon, open(dich + '.tmp', 'wb') as ra:
                shutil.copyfileobj(nguon, ra)
            os.replace(dich + '.tmp', dich)
            so += 1
    # thư mục rỗng còn sót
    for goc, dirs, files in os.walk(THU, topdown=False):
        if '.git' in goc.split(os.sep):
            continue
        if goc != THU and not os.listdir(goc):
            os.rmdir(goc)

    git(THU, 'add', '-A')
    # ③ lưới an toàn: kho thử KHÔNG được theo dõi dữ liệu học sinh
    theo = git(THU, 'ls-files').decode('utf-8').splitlines()
    lo = [p for p in theo if bo_qua(p) and p not in GIU_THU]
    if lo:
        git(THU, 'reset', '-q')
        tra_lai()
        sys.exit('CHỐT DỪNG: kho thử sắp chứa file cấm: ' + ', '.join(lo[:10]))
    doi = git(THU, 'diff', '--cached', '--stat').decode('utf-8').strip()
    print('Chép %d file từ web %s (v%s) sang kho thử.' % (so, sha, ban))
    if not doi:
        print('Kho thử ĐÃ giống hệt — không có gì đổi.')
        return
    print(doi)
    if not day:   # trả kho thử về như cũ (file bị .gitignore — data/ tools/ trên máy — không đụng)
        git(THU, 'reset', '-q')
        git(THU, 'checkout', '-q', '--', '.')
        git(THU, 'clean', '-fdq')
        print('\n(xem trước — chưa commit; chạy lại với --day để đẩy lên trang thử)')
        return
    git(THU, 'commit', '-q', '-m', 'Dong bo = trang that web v%s %s (tools/dong-bo-trang-thu.py)' % (ban, sha))
    git(THU, 'push', '-q')
    print('\nĐã đẩy lên trang thử: ' + git(THU, 'log', '--oneline', '-1').decode('utf-8').strip())


def tra_lai():
    # hỏng giữa chừng ⇒ trả kho thử về đúng bản đã commit (file .gitignore trên máy không đụng)
    try:
        git(THU, 'reset', '-q'); git(THU, 'checkout', '-q', '--', '.'); git(THU, 'clean', '-fdq')
    except Exception:
        pass


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    try:
        main()
    except SystemExit:
        raise
    except BaseException:
        tra_lai()
        print('LỖI — đã trả kho thử về như cũ.')
        raise
