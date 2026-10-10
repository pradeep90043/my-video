#!/usr/bin/env python3
"""edge-tts synth that also records word boundaries.

usage: tts_words.py <voice> <rate> <pitch> <volume> <text> <out.mp3> <out.words.json>
words.json = [{"w": "word", "s": startSeconds, "d": durationSeconds}, ...]
"""
import asyncio, json, sys
import edge_tts


async def main(voice, rate, pitch, volume, text, out_mp3, out_words):
    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume, boundary="WordBoundary")
    words = []
    with open(out_mp3, "wb") as f:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"w": ch["text"], "s": round(ch["offset"] / 1e7, 3), "d": round(ch["duration"] / 1e7, 3)})
    with open(out_words, "w") as f:
        json.dump(words, f, ensure_ascii=False)


if __name__ == "__main__":
    asyncio.run(main(*sys.argv[1:8]))
