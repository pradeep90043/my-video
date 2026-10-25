#!/usr/bin/env python3
"""Builds public/content/study-one-minute/video.json: "1 MINUTE A DAY", an animated short film without narration.

A person buys books and promises himself 3 hours of study every day. A morning alarm, an excuse, a red X on the calendar,
again and again, until the books are returned unread. The bookseller gives him one sentence ("One minute.") and the
promise shrinks to something he cannot refuse. Told with silhouettes, hands, a phone and a calendar; captions are the only words.

Usage: python3 scripts/stories/study-one-minute.py
"""
import json
import os

FPS = 30
OUT = "public/content/study-one-minute"
shots = []


def shot(secs, layers, cam=None, fade_in=0, fade_out=0, foley=None, ambient=None):
    shots.append(dict(secs=secs, layers=layers, cam=cam or {}, fade_in=fade_in, fade_out=fade_out, foley=foley or [], ambient=ambient))


# ───────────── layer helpers ─────────────
def env(kind, grade="day", blur=0, depth=0.5): return {"t": "env", "kind": kind, "grade": grade, "blur": blur, "depth": depth}
def person(who, pose="stand", x=960, y=960, s=1.0, **k): return {"t": "person", "who": who, "pose": pose, "x": x, "y": y, "s": s, **k}
def seller(pose="stand", **k): return person("seller", pose, **{"x": 1250, "y": 960, "s": 1.05, **k})
def cust_fg(pose="stand", **k): return person("customer", pose, **{"x": 520, "y": 1040, "s": 1.0, "fg": True, **k})
def cap(text, at=8, until=None, style="speech", x=960, y=170, line2=None):
    d = {"t": "caption", "style": style, "text": text, "at": at, "x": x, "y": y}
    if until: d["until"] = until
    if line2: d["line2"] = line2
    return d
def fx(kind, **k): return {"t": "fx", "kind": kind, **k}
def look(*extra): return [*extra, fx("vignette", amount=0.8), fx("grain")]
SIGN = {"t": "sign", "text": "14-DAY RETURNS", "x": 1580, "y": 668, "s": 0.9}


def zoom(z, cx, cy, z0=None): return {"zoom": {"from": z0 if z0 else z * 0.94, "to": z, "dur": 140, "ease": "out"}, "x": cx, "y": cy}


def cell(c, r, s=1.0, cx=660, cy=440):
    """World centre of calendar cell (c, r) for a calendar layer at (cx, cy) with scale s."""
    lx = -(7 * 50 + 6 * 6) / 2 + c * 56 + 25
    ly = -300 + 120 + r * 90 + 41
    return cx + lx * s, cy + ly * s


# ───────────── the shop: buying the books ─────────────
shot(6.0, look(env("shop-counter"), SIGN, seller("lean", mood="happy"),
               person("customer", "walk", x={"from": -120, "to": 520, "dur": 70}, y=1040, fg=True, to="stand", poseAt=64)),
     cam=zoom(1.12, 900, 540, 1.0), fade_in=20, foley=[{"name": "shop-bell", "at": 0.2, "volume": 0.45}])
shot(3.2, look(env("shop-counter", blur=5), SIGN, seller("point", mood="happy", poseAt=0), cust_fg(blur=14, eyes=False, x=420, y=1090, s=1.5),
               cap("Great. Maybe start with…", at=10)), cam=zoom(1.5, 1250, 560))
shot(3.0, look(env("shop-window", blur=7), person("customer", "shrug", x=1000, y=900, s=1.2, mood="happy"),
               person("seller", "stand", x=1700, y=1130, s=1.5, fg=True, blur=16, eyes=False, flip=True), cap("3 hours. Every day.", at=10)))
shot(3.0, look(env("shop-counter", blur=5), SIGN, seller("stand", mood="happy"), cust_fg(blur=14, eyes=False, x=420, y=1090, s=1.5),
               cap("Good luck.", at=14)), cam=zoom(1.5, 1250, 560))
shot(3.0, look(env("shop-counter", blur=16), SIGN, {"t": "books", "kind": "box", "x": 960, "y": 640, "s": 1.5, "lid": {"from": 1, "to": 0, "at": 4, "dur": 16}},
               {"t": "hand", "kind": "flat", "from": "left", "x": {"keys": [[0, 380], [40, 640]]}, "y": 640},
               {"t": "hand", "kind": "open", "from": "right", "x": {"keys": [[0, 1560], [40, 1330]]}, "y": 650}),
     foley=[{"name": "rustle", "at": 0.4, "volume": 0.4}])

# ───────────── home: the promise ─────────────
shot(4.0, look(env("home-wall", "night", depth=0.4), {"t": "calendar", "x": 660, "y": 440, "title": "3 HRS EVERY DAY"},
               person("customer", "stand", x=1000, y=1240, s=1.5, flip=True, look=-0.8, mood="happy"), fx("glow", x=660, y=440, amount=0.9, color="cool", z=5)),
     cam=zoom(1.15, 800, 520, 1.0), fade_out=20)


def alarm(date, label_hint, excuse, press, n, ring=True):
    """One morning: the alarm, a finger on SNOOZE, the excuse, then the calendar gets one more X."""
    sx, sy = 985, 749
    ph = {"t": "phone", "x": 960, "y": 560, "r": -8, "s": 0.95, "date": date, "label": "STUDY 3 HRS", "ring": ring, "pressAt": press}
    hand = {"t": "hand", "kind": "point", "from": "bottom", "x": {"keys": [[0, 1010], [press - 12, 1000], [press, 990]]},
            "y": {"keys": [[0, 1100], [press - 14, 940], [press, 872], [press + 12, 1010]]}}
    excuse_cap = cap(excuse[0], at=6, x=520, y=200, style="excuse", line2=excuse[1] if len(excuse) > 1 else None)
    return look(env("dark-table"), ph, hand, excuse_cap)


def x_shot(filled, c, r, secs=1.6):
    tx, ty = cell(c, r, 1.0)
    return look(env("home-wall", "night", blur=3), {"t": "calendar", "x": 660, "y": 440, "filled": filled, "marks": [{"c": c, "r": r, "at": 22}]},
                {"t": "hand", "kind": "point", "from": "right", "x": {"keys": [[0, tx + 520], [16, tx + 169]]}, "y": {"keys": [[0, ty - 60], [16, ty + 18]]}})


excuses = [("Tue, Sep 23", ("Exams are far.",)), ("Wed, Sep 24", ("Eyes hurt.",)), ("Thu, Sep 25", ("Slept late.",)),
           ("Mon, Oct 6", ("Too tired.", "Five more.")), ("Fri, Oct 10", ("Long week.",)), ("Tue, Oct 14", ("Too cold.",)), ("Sun, Oct 19", ("It's Sunday.",))]
filled_before = [0, 1, 2, 8, 13, 20, 24]
for i, (date, ex) in enumerate(excuses):
    shot(3.0 if i == 0 else 2.2, alarm(date, "", ex, 46 if i == 0 else 34, i), cam=zoom(1.06, 960, 540, 1.0))
    c, r = filled_before[i] % 7, filled_before[i] // 7
    if i == 3:   # a busy weekend: he marks the X himself, standing at the wall
        tx, ty = cell(c, r)
        shot(3.0, look(env("home-wall", "night"), {"t": "calendar", "x": 660, "y": 440, "filled": filled_before[i], "marks": [{"c": c, "r": r, "at": 40}]},
                       person("customer", "reach", x=330, y=1160, s=1.4, mood="tired", look=0.7), cap("Busy weekend.", at=6, x=1300, y=200, style="excuse")),
             foley=[{"name": "marker-write", "at": 1.3, "volume": 0.4}])
    else:
        shot(1.6, x_shot(filled_before[i], c, r))
    if i in (1, 4):   # the books by the door, untouched
        shot(1.6, look(env("home-door"), {"t": "books", "kind": "pair", "x": 960, "y": 905, "s": 1.2}, fx("leaves")), cam=zoom(1.08, 960, 800, 1.0))

# ───────────── the pile of X's, the crumpled calendar ─────────────
shot(3.0, look(env("home-wall", "night", blur=22), {"t": "calendar", "x": 960, "y": 540, "s": 2.3, "filled": 28}), cam=zoom(1.0, 960, 540, 1.06))
shot(4.0, look(env("home-wall", "night", blur=18, depth=0.3), person("customer", "slump", x=960, y=1560, s=2.3, mood="sad")),
     cam={"zoom": {"from": 1.0, "to": 1.1, "dur": 110}, "x": 960, "y": 560})
shot(3.8, look(env("home-wall", "night", blur=6),
               {"t": "calendar", "x": 960, "y": 500, "s": 1.3, "filled": 28, "crumple": {"from": 0, "to": 1, "at": 20, "dur": 40}, "o": {"keys": [[0, 1], [62, 1], [70, 0]]}},
               {"t": "books", "kind": "crumpled", "x": 960, "y": 560, "s": 1.5, "at": 66},
               {"t": "hand", "kind": "grab", "from": "left", "x": {"keys": [[0, 520], [20, 640], [60, 800], [100, 560]]}, "y": 520},
               {"t": "hand", "kind": "grab", "from": "right", "x": {"keys": [[0, 1400], [20, 1280], [60, 1120], [100, 1360]]}, "y": 520}))
shot(5.0, look(env("home-door"), {"t": "books", "kind": "pair", "x": 1180, "y": 905, "s": 0.9}, {"t": "books", "kind": "crumpled", "x": 1500, "y": 985, "s": 0.8},
               person("customer", "slump", x=640, y=1150, s=0.95, mood="sad"), fx("leaves", amount=0.7)), cam=zoom(1.1, 960, 700, 1.0))
shot(3.0, look(env("shop-counter", blur=16), {"t": "books", "kind": "box", "x": 960, "y": 650, "s": 1.7, "lid": {"from": 0, "to": 1, "at": 14, "dur": 22}}),
     foley=[{"name": "cloth", "at": 0.5, "volume": 0.4}])

# ───────────── the return: "One minute." ─────────────
shot(4.0, look(env("shop-counter"), SIGN, seller("lean", mood="neutral"),
               person("customer", "walk", x={"from": -120, "to": 560, "dur": 70}, y=1040, fg=True, to="hold", poseAt=64, holds="box", mood="sad")),
     cam=zoom(1.1, 900, 540, 1.0), foley=[{"name": "shop-bell", "at": 0.2, "volume": 0.45}])
shot(3.0, look(env("shop-counter", blur=14), SIGN, {"t": "books", "kind": "box", "x": 900, "y": 640, "s": 1.5},
               {"t": "hand", "kind": "point", "from": "top", "x": {"keys": [[0, 1240], [30, 1040], [50, 1020]]}, "y": {"keys": [[0, 360], [30, 470], [50, 480]]}}),
     foley=[{"name": "thud", "at": 1.5, "volume": 0.3}])
shot(3.6, look(env("shop-counter", blur=5), SIGN, seller("shrug", mood="sad"), cust_fg(blur=14, eyes=False, x=420, y=1090, s=1.5),
               cap("Sorry. It's been a month.", at=10, line2="I can't take them back.")), cam=zoom(1.5, 1250, 560))
shot(2.8, look(env("shop-counter", blur=5), SIGN, seller("lean", mood="neutral"), cust_fg(blur=14, eyes=False, x=420, y=1090, s=1.5),
               cap("What happened to 3 hours a day?", at=8)), cam=zoom(1.5, 1250, 560))
shot(3.0, look(env("shop-window", blur=7), person("customer", "slump", x=1000, y=900, s=1.2, mood="sad"),
               person("seller", "stand", x=1700, y=1130, s=1.5, fg=True, blur=16, eyes=False, flip=True), cap("I couldn't even start.", at=10)))
shot(2.5, look(env("shop-counter", blur=5), SIGN, seller("stand", mood="neutral"), cust_fg(blur=14, eyes=False, x=420, y=1090, s=1.5)), cam=zoom(1.4, 1200, 560))
shot(2.0, look(env("shop-window", blur=7), person("customer", "slump", x=1000, y=900, s=1.2, mood="sad"),
               person("seller", "stand", x=1700, y=1130, s=1.5, fg=True, blur=16, eyes=False, flip=True), cap("That's right.", at=6, x=1500, y=300)))
shot(3.2, look(env("shop-counter", blur=5), SIGN, seller("point", mood="happy"), cust_fg(blur=14, eyes=False, x=420, y=1090, s=1.5),
               cap("One minute.", at=12)), cam=zoom(1.55, 1250, 540))
shot(3.0, look(env("shop-window", blur=7), person("customer", "hold", x=1000, y=900, s=1.2, mood="neutral", holds="box"),
               person("seller", "stand", x=1700, y=1130, s=1.5, fg=True, blur=16, eyes=False, flip=True), cap("Thanks. I'll try.", at=10)))

# ───────────── the promise shrinks ─────────────
shot(3.2, look(env("home-door", blur=2), {"t": "books", "kind": "crumpled", "x": {"keys": [[0, 830], [50, 830], [80, 960]]}, "y": {"keys": [[0, 950], [50, 950], [80, 590]]}, "s": 1.2},
               {"t": "hand", "kind": "pinch", "from": "top", "x": {"keys": [[0, 830], [50, 830], [80, 960]]}, "y": {"keys": [[0, 420], [30, 800], [50, 800], [80, 440]]}}),
     foley=[{"name": "paper-crumple", "at": 1.6, "volume": 0.35}])
shot(5.0, look(env("home-wall", "night", blur=2), {"t": "poster", "x": 960, "y": 470, "s": 1.6, "text": "1 MIN", "writeAt": 20, "writeDur": 70},
               {"t": "hand", "kind": "write", "from": "right", "x": {"keys": [[0, 1700], [20, 890], [90, 1510], [112, 1700]]}, "y": {"keys": [[0, 420], [20, 500], [90, 500], [112, 420]]}}))
shot(3.5, look(env("dark-table"), {"t": "phone", "x": 960, "y": 560, "r": -8, "s": 0.95, "date": "Tue, Oct 21", "label": "STUDY 1 MIN", "ring": True},
               {"t": "hand", "kind": "point", "from": "bottom", "x": {"keys": [[0, 1010], [40, 1000], [70, 1004], [104, 996]]}, "y": {"keys": [[0, 1100], [30, 900], [60, 890], [80, 900], [104, 890]]}},
               cap("Maybe tomorrow?", at=6, x=520, y=200, style="excuse")))
shot(4.0, look(env("desk-night", "night"), person("customer", "sit-read", x=900, y=1010, s=1.3, mood="tired"), {"t": "books", "kind": "open", "x": 900, "y": 775, "s": 0.95}, fx("dust")),
     foley=[{"name": "book-flip", "at": 1.5, "volume": 0.5}, {"name": "book-flip", "at": 3.0, "volume": 0.5}], cam=zoom(1.08, 960, 560, 1.0))
shot(2.0, look(env("home-wall", "night"), {"t": "poster", "x": 660, "y": 440, "s": 1.3, "text": "1 MIN"},
               person("customer", "stand", x=1450, y=1200, s=1.4, flip=True, look=-0.6, mood="neutral")), cam=zoom(1.08, 900, 520, 1.0))
shot(3.0, look(env("dark-table"), {"t": "phone", "x": 960, "y": 540, "s": 0.95, "mode": "keyboard", "time": "5:30", "typeStart": "STUDY ", "text": "1 MIN", "typeFrom": 20, "typeEvery": 7},
               {"t": "hand", "kind": "point", "from": "bottom", "x": {"keys": [[0, 900], [40, 840], [70, 1000], [90, 1060]]}, "y": {"keys": [[0, 1100], [30, 900], [60, 880], [90, 900]]}}))
shot(2.2, [env("black"), {"t": "screen", "x": 960, "y": 540, "title": "3 HRS EVERY DAY", "button": "Print", "cursorAt": 24}, fx("glow", x=960, y=540, amount=1.6, color="cool", z=5), fx("vignette"), fx("grain")])
shot(2.4, [env("black"), {"t": "screen", "x": 960, "y": 540, "title": "1 MIN EVERY DAY", "typeFrom": "", "typeAt": 8, "typeEvery": 4, "button": "Print", "cursorAt": 40},
           fx("glow", x=960, y=540, amount=1.6, color="cool", z=5), fx("vignette"), fx("grain")])
shot(2.8, [env("black"), fx("glow", x=960, y=700, amount=1.4, color="cool", z=5), person("customer", "stand", x=960, y=1560, s=2.4, mood="neutral", look=0.2),
           cap("Just start.", at=10, x=620, y=260, style="whisper"), fx("vignette")], cam={"zoom": {"from": 1.0, "to": 1.06, "dur": 80}, "x": 960, "y": 560})
shot(2.4, look(env("home-wall", "night"), {"t": "poster", "x": 1200, "y": 440, "s": 1.2, "text": "1 MIN"},
               {"t": "calendar", "x": 640, "y": 430, "palette": "warm", "title": "1 MIN EVERY DAY"},
               {"t": "hand", "kind": "flat", "from": "left", "x": {"keys": [[0, 360], [20, 420]]}, "y": 440},
               {"t": "hand", "kind": "flat", "from": "right", "x": {"keys": [[0, 1000], [20, 900]]}, "y": 450}), foley=[{"name": "cloth", "at": 0.6, "volume": 0.4}])
shot(4.0, look(env("dark-table"), {"t": "phone", "x": 960, "y": 560, "r": -8, "s": 0.95, "date": "Wed, Oct 22", "label": "STUDY 1 MIN", "ring": True, "pressAt": 70, "pressTarget": "stop"},
               {"t": "hand", "kind": "point", "from": "bottom", "x": {"keys": [[0, 1030], [55, 996], [70, 992], [88, 1040]]}, "y": {"keys": [[0, 1120], [55, 940], [70, 934], [92, 1060]]}}))
tx, ty = cell(0, 0, 1.0)
shot(2.0, look(env("home-wall", "night", blur=3), {"t": "calendar", "x": 660, "y": 440, "palette": "warm", "title": "1 MIN EVERY DAY", "marks": [{"c": 0, "r": 0, "kind": "check", "at": 24}]},
               {"t": "hand", "kind": "write", "from": "right", "cuff": "#c9a227", "x": {"keys": [[0, tx + 520], [18, tx + 250]]}, "y": {"keys": [[0, ty - 40], [18, ty + 28]]}}), cam=zoom(1.4, 660, 440, 1.3))

# ───────────── the montage: every day, one minute ─────────────
shot(4.0, look(env("desk-night", "rain"), person("customer", "sit-read", x=900, y=1010, s=1.3, mood="neutral"), {"t": "books", "kind": "open", "x": 900, "y": 775, "s": 0.95}, fx("rain", amount=0.5), fx("dust")),
     foley=[{"name": "book-flip", "at": 2.0, "volume": 0.5}], cam=zoom(1.06, 960, 560, 1.0))
shot(3.0, look(env("home-wall", "night", blur=14), {"t": "calendar", "x": 960, "y": 540, "s": 1.6, "palette": "warm", "title": "1 MIN EVERY DAY", "filled": 3, "filledKind": "check",
                                                  "marks": [{"c": 3, "r": 0, "kind": "check", "at": 10}, {"c": 4, "r": 0, "kind": "check", "at": 30}, {"c": 5, "r": 0, "kind": "check", "at": 50}, {"c": 6, "r": 0, "kind": "check", "at": 70}]}))
shot(3.5, look(env("desk-dawn", "day"), person("customer", "sit-read", x=900, y=1010, s=1.3, mood="happy"), {"t": "books", "kind": "open", "x": 900, "y": 775, "s": 0.95}, fx("dust"), fx("sunrays", amount=0.6)),
     foley=[{"name": "book-flip", "at": 1.6, "volume": 0.5}], cam=zoom(1.06, 960, 560, 1.0))
shot(3.0, look(env("home-wall", "day", blur=14), {"t": "calendar", "x": 960, "y": 540, "s": 1.6, "palette": "warm", "title": "1 MIN EVERY DAY", "filled": 24, "filledKind": "check",
                                                 "marks": [{"c": 3, "r": 3, "kind": "check", "at": 12}, {"c": 4, "r": 3, "kind": "check", "at": 34}, {"c": 5, "r": 3, "kind": "check", "at": 56}]}))
shot(6.0, [env("hill-day", depth=1), person("customer", "sit-bench", x=1000, y=1115, s=0.8, mood="happy"), {"t": "books", "kind": "open", "x": 1020, "y": 900, "s": 0.28},
           fx("sunrays"), fx("dust", amount=0.5), fx("vignette", amount=0.5)], cam={"zoom": {"from": 1.0, "to": 1.12, "dur": 170}, "x": 1000, "y": 800})

# ───────────── the shop again ─────────────
shot(4.0, look(env("shop-counter"), SIGN, seller("stand", mood="happy"),
               person("customer", "walk", x={"from": -120, "to": 520, "dur": 70}, y=1040, fg=True, to="stand", poseAt=64, mood="happy"), cap("Hi. It's been a while.", at=70, y=150)),
     cam=zoom(1.1, 900, 540, 1.0), foley=[{"name": "shop-bell", "at": 0.2, "volume": 0.45}])
shot(3.6, look(env("shop-counter", blur=5), SIGN, seller("laugh", mood="happy"), cust_fg(blur=14, eyes=False, x=420, y=1090, s=1.5), cap("So you finished the book?", at=10)), cam=zoom(1.5, 1250, 560))
shot(5.0, look(env("shop-window", blur=7), person("customer", "shrug", x=1000, y=900, s=1.2, mood="happy"),
               person("seller", "stand", x=1700, y=1130, s=1.5, fg=True, blur=16, eyes=False, flip=True), cap("Just one minute a day.", at=14)))
shot(3.5, look(env("shop-counter", blur=5), SIGN, seller("stand", mood="happy"), cust_fg(blur=14, eyes=False, x=420, y=1090, s=1.5)), cam=zoom(1.4, 1200, 560), fade_out=30,
     foley=[{"name": "bell", "at": 1.2, "volume": 0.25}])
shot(4.0, [env("black"), cap("1 MINUTE A DAY", at=14, y=540, style="title")], fade_in=0, fade_out=20)
shot(2.0, [env("black")])


# ───────────── assemble ─────────────
scenes, t = [], 0
for i, s in enumerate(shots):
    d = round(s["secs"] * FPS)
    visual = {"transition": "cut", "film": {"layers": s["layers"], "cam": s["cam"], "fadeIn": s["fade_in"], "fadeOut": s["fade_out"]}}
    if s["foley"]: visual["foley"] = s["foley"]
    if s["ambient"]: visual["ambient"] = s["ambient"]
    scenes.append({"id": f"s{i:02d}", "text": "", "startFrame": t, "durationFrames": d, "duration": d / FPS, "visual": visual})
    t += d
data = {"format": "shorts", "template": "stickman", "theme": "dark", "composition": "StickmanVideo", "fps": FPS, "orientation": "horizontal", "language": "en",
        "title": "1 MINUTE A DAY | An Animated Short Film", "description": "A study-habit story told without narration.", "tags": [], "scenes": scenes, "totalFrames": t}
os.makedirs(f"{OUT}/audio", exist_ok=True)
json.dump(data, open(f"{OUT}/video.json", "w"), ensure_ascii=False, indent=1)
json.dump({"fps": FPS, "levels": [0] * t}, open(f"{OUT}/audio/voiceover.env.json", "w"))
print(f"{len(shots)} shots, {t} frames, {t / FPS:.0f}s")
