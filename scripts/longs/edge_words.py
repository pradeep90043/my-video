#!/usr/bin/env python3
"""edge-tts with word-level timing.

The edge-tts CLI only writes sentence-level subtitles; the Python API can request WordBoundary events.
Usage: edge_words.py --voice V --rate R --pitch P --volume U --text T --media out.mp3 --words out.json
words.json = [{"text": "...", "start": seconds, "end": seconds}, ...]
"""
import argparse
import asyncio
import json

import edge_tts


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", required=True)
    ap.add_argument("--rate", default="+0%")
    ap.add_argument("--pitch", default="+0Hz")
    ap.add_argument("--volume", default="+0%")
    ap.add_argument("--text", required=True)
    ap.add_argument("--media", required=True)
    ap.add_argument("--words", required=True)
    a = ap.parse_args()

    comm = edge_tts.Communicate(a.text, a.voice, rate=a.rate, pitch=a.pitch, volume=a.volume, boundary="WordBoundary")
    words = []
    with open(a.media, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # offset / duration are in 100-nanosecond ticks
                start = chunk["offset"] / 1e7
                words.append({"text": chunk["text"], "start": round(start, 3), "end": round(start + chunk["duration"] / 1e7, 3)})
    with open(a.words, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False)


asyncio.run(main())
