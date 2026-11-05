"""Sinh Li2UI/07-cap-tinh-sau-hon.html từ 07-cap-tinh-sau-hon.tpl.html.

Không tự giải lại topojson: lấy luôn `VN`, `PROV`, `VNVB` đã sinh trong
05-zoom-vietnam-tinh.html để hai bản thử dùng đúng một bộ đường bản đồ.
"""

import json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / '05-zoom-vietnam-tinh.html'


def grab(name, text):
    m = re.search(rf'^const {name}\s*=\s*(.+);$', text, re.M)
    if not m:
        raise SystemExit(f'không thấy const {name} trong {SRC.name}')
    return json.loads(m.group(1))


def points(d):
    """Giải path do _build-map-paths.py sinh ra về toạ độ tuyệt đối.

    Nó dùng lệnh TƯƠNG ĐỐI (`M x y` rồi một chuỗi `l dx dy`), nên không thể lấy trung bình thô các
    con số trong chuỗi — delta không phải toạ độ. `VNVB` trong 05 cũng vô dụng ở đây: nó là khung
    trong hệ toạ độ bản đồ THẾ GIỚI, còn các đường này nằm trong hệ riêng rồi mới được
    `translate(...) scale(...)` vào. Bản thử này vẽ chúng một mình nên tự tính khung.
    """
    out, x, y = [], 0.0, 0.0
    for cmd, body in re.findall(r'([MlZ])([^MlZ]*)', d):
        if cmd == 'Z':
            continue
        nums = [float(v) for v in re.findall(r'-?\d+\.?\d*', body)]
        for i in range(0, len(nums) - 1, 2):
            if cmd == 'M':
                x, y = nums[i], nums[i + 1]
            else:
                x, y = x + nums[i], y + nums[i + 1]
            out.append((x, y))
    return out


def main():
    src = SRC.read_text()
    vn, prov = grab('VN', src), grab('PROV', src)

    legacy_seen = {c for p in prov for c in p['legacy']}
    missing = sorted(legacy_seen - vn.keys())
    if missing:
        raise SystemExit(f'thiếu đường bản đồ cho mã cũ: {missing}')

    pts = {code: points(d) for code, d in vn.items()}
    used = [p for code in legacy_seen for p in pts[code]]
    minx, maxx = min(p[0] for p in used), max(p[0] for p in used)
    miny, maxy = min(p[1] for p in used), max(p[1] for p in used)
    pad = (maxx - minx) * 0.02
    vb = [round(minx - pad, 1), round(miny - pad, 1),
          round(maxx - minx + 2 * pad, 1), round(maxy - miny + 2 * pad, 1)]

    # Trọng tâm để đặt nhãn: trung bình các đỉnh của tỉnh dẫn đầu sau sáp nhập. Không phải tâm hình
    # học thật, nhưng 34 tỉnh đều lồi vừa đủ để nhãn không rơi ra ngoài.
    cent = {}
    for p in prov:
        q = [pt for c in p['legacy'] for pt in pts[c]]
        cent[p['code']] = [round(sum(v[0] for v in q) / len(q), 1),
                           round(sum(v[1] for v in q) / len(q), 1)]

    tpl = (HERE / '07-cap-tinh-sau-hon.tpl.html').read_text()
    out = (
        tpl.replace('__VN__', json.dumps(vn, ensure_ascii=False))
        .replace('__PROV__', json.dumps(prov, ensure_ascii=False))
        .replace('__CENT__', json.dumps(cent))
        .replace('__VNVBS__', ' '.join(str(v) for v in vb))
        .replace('__VNVB__', json.dumps(vb))
    )
    dest = HERE / '07-cap-tinh-sau-hon.html'
    dest.write_text(out)
    print(f'{dest.name}: {len(out)//1024} KB, {len(prov)} tỉnh, {len(vn)} đường')


if __name__ == '__main__':
    main()
