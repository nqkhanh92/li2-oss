import json, math

def build_rel(src, objname, width, bbox, simplify=1.0, minarea=0.0):
    """Xuất path SVG dùng lệnh TƯƠNG ĐỐI (m/l): delta giữa hai điểm liền kề thường là 1-2 chữ số,
    nên ngắn hơn toạ độ tuyệt đối khoảng một nửa mà vẫn là path chuẩn, không cần giải mã."""
    topo = json.load(open(src)); obj = topo['objects'][objname]; tr = topo.get('transform')
    def decode(arc):
        if not tr: return [(x, y) for x, y in arc]
        out, x, y = [], 0, 0
        for dx, dy in arc:
            x += dx; y += dy
            out.append((x*tr['scale'][0]+tr['translate'][0], y*tr['scale'][1]+tr['translate'][1]))
        return out
    ARCS = [decode(a) for a in topo['arcs']]
    ap = lambda i: ARCS[i] if i >= 0 else ARCS[~i][::-1]
    def ring_points(ring):
        pts = []
        for i in ring:
            p = ap(i); pts.extend(p if not pts else p[1:])
        return pts
    minx, miny, maxx, maxy = bbox
    clamp = lambda la: max(-83, min(83, la))
    merc = lambda la: math.degrees(math.log(math.tan(math.pi/4 + math.radians(clamp(la))/2)))
    py_max, py_min = merc(maxy), merc(miny)
    s = width / (maxx - minx)
    height = round((py_max - py_min) * s)
    to_xy = lambda lo, la: ((lo-minx)*s, (py_max-merc(la))*s)

    def num(v):
        return str(v)

    out, total = {}, 0
    for geom in obj['geometries']:
        key = geom.get('id') or geom['properties'].get('ISO3166_2_CODE')
        if not key: continue
        polys = geom['arcs'] if geom['type'] == 'MultiPolygon' else [geom['arcs']]
        d = []
        for poly in polys:
            for ring in poly:
                pts = ring_points(ring)
                if len(pts) < 3: continue
                xy = [to_xy(lo, la) for lo, la in pts]
                kept = [xy[0]]
                for p in xy[1:]:
                    if abs(p[0]-kept[-1][0]) + abs(p[1]-kept[-1][1]) >= simplify: kept.append(p)
                if len(kept) < 4: continue
                xs=[p[0] for p in kept]; ys=[p[1] for p in kept]
                if (max(xs)-min(xs))*(max(ys)-min(ys)) < minarea: continue
                ints, prev = [], None
                for x, y in kept:
                    p = (round(x), round(y))
                    if p != prev: ints.append(p); prev = p
                if len(ints) < 4: continue
                total += len(ints)
                seg = [f'M{ints[0][0]} {ints[0][1]}']
                px, py = ints[0]
                for x, y in ints[1:]:
                    dx, dy = x-px, y-py
                    seg.append('l' + num(dx) + (' ' if dy >= 0 else '') + num(dy))
                    px, py = x, y
                d.append(''.join(seg) + 'Z')
        if d: out.setdefault(key, []).extend(d)
    return {k: ''.join(v) for k, v in out.items()}, width, height, total
