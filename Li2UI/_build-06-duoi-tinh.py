"""Sinh Li2UI/06-duoi-cap-tinh.html từ 06-duoi-cap-tinh.tpl.html.

Khác _build-map-paths.py ở chỗ chỉ lấy ba geometry hợp thành TP.HCM hiện hành (VN-79 + VN-74 +
VN-77) và xuất kèm hằng số của phép chiếu, để JS đặt được chốt theo lat/lon thật của GeoIP lên
đúng vị trí trong hình tỉnh.
"""

import json, math, pathlib

SRC = pathlib.Path(__file__).resolve().parent.parent / 'src/public/json/vietnam.json'
HERE = pathlib.Path(__file__).resolve().parent
HCM_LEGACY = ['VN-79', 'VN-74', 'VN-77']
WIDTH = 560
PAD = 0.04  # đệm quanh bbox, theo tỷ lệ bề rộng


def decode_arcs(topo):
    tr = topo.get('transform')
    out = []
    for arc in topo['arcs']:
        if not tr:
            out.append([(x, y) for x, y in arc])
            continue
        pts, x, y = [], 0, 0
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * tr['scale'][0] + tr['translate'][0], y * tr['scale'][1] + tr['translate'][1]))
        out.append(pts)
    return out


def main():
    topo = json.load(open(SRC))
    objname = next(iter(topo['objects']))
    arcs = decode_arcs(topo)
    ap = lambda i: arcs[i] if i >= 0 else arcs[~i][::-1]

    def ring_points(ring):
        pts = []
        for i in ring:
            seg = ap(i)
            pts.extend(seg if not pts else seg[1:])
        return pts

    geoms = {}
    for geom in topo['objects'][objname]['geometries']:
        code = geom['properties'].get('ISO3166_2_CODE')
        if code not in HCM_LEGACY:
            continue
        polys = geom['arcs'] if geom['type'] == 'MultiPolygon' else [geom['arcs']]
        geoms.setdefault(code, []).extend(ring_points(r) for p in polys for r in p)

    missing = [c for c in HCM_LEGACY if c not in geoms]
    if missing:
        raise SystemExit(f'thiếu geometry: {missing}')

    # Sau sáp nhập, TP.HCM nhận cả Côn Đảo (~8,7°N) trong khi cực bắc ở ~11,5°N. Giữ hòn đảo đó thì
    # khung hình cao gấp ba lần bề rộng và phần đất liền teo lại không đọc được. Bỏ các vòng bé hơn
    # 5% vòng lớn nhất — mockup cần hình đọc được, không cần đủ lãnh thổ.
    area = lambda r: (max(p[0] for p in r) - min(p[0] for p in r)) * (
        max(p[1] for p in r) - min(p[1] for p in r)
    )
    biggest = max(area(r) for rings in geoms.values() for r in rings)
    geoms = {c: [r for r in rings if area(r) >= biggest * 0.05] for c, rings in geoms.items()}

    flat = [pt for rings in geoms.values() for ring in rings for pt in ring]
    minx = min(p[0] for p in flat)
    maxx = max(p[0] for p in flat)
    miny = min(p[1] for p in flat)
    maxy = max(p[1] for p in flat)
    dx = (maxx - minx) * PAD
    dy = (maxy - miny) * PAD
    minx, maxx, miny, maxy = minx - dx, maxx + dx, miny - dy, maxy + dy

    merc = lambda la: math.degrees(math.log(math.tan(math.pi / 4 + math.radians(la) / 2)))
    py_max, py_min = merc(maxy), merc(miny)
    scale = WIDTH / (maxx - minx)
    height = round((py_max - py_min) * scale)
    to_xy = lambda lo, la: (round((lo - minx) * scale, 1), round((py_max - merc(la)) * scale, 1))

    paths = {}
    for code, rings in geoms.items():
        d = []
        for ring in rings:
            xy = [to_xy(lo, la) for lo, la in ring]
            kept = [xy[0]]
            for p in xy[1:]:
                if abs(p[0] - kept[-1][0]) + abs(p[1] - kept[-1][1]) >= 0.8:
                    kept.append(p)
            if len(kept) < 4:
                continue
            d.append('M' + ' '.join(f'{x} {y}' for x, y in kept) + 'Z')
        paths[code] = ''.join(d)

    tpl = (HERE / '06-duoi-cap-tinh.tpl.html').read_text()
    out = (
        tpl.replace('__HCM__', json.dumps(paths, ensure_ascii=False))
        .replace('__HW__', str(WIDTH))
        .replace('__HH__', str(height))
        .replace('__PROJ__', json.dumps({'minx': minx, 'pymax': py_max, 'k': scale}))
    )
    dest = HERE / '06-duoi-cap-tinh.html'
    dest.write_text(out)
    print(f'{dest.name}: {len(out)//1024} KB, viewBox 0 0 {WIDTH} {height}')


if __name__ == '__main__':
    main()
