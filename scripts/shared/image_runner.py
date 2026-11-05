"""Kaggle GPU kernel: batch text-to-image. PROMPTS is injected by KaggleImageRunner.ts."""
import json, os, subprocess, sys, time

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "diffusers", "transformers", "accelerate"], check=True)

import torch
from diffusers import AutoPipelineForText2Image

PROMPTS = None  # PROMPTS_MARKER
MODEL = "stabilityai/sdxl-turbo"
OUT = "/kaggle/working/out"
os.makedirs(OUT, exist_ok=True)

t0 = time.time()
pipe = AutoPipelineForText2Image.from_pretrained(MODEL, torch_dtype=torch.float16, variant="fp16").to("cuda")
print(f"model loaded in {time.time()-t0:.1f}s", flush=True)

manifest = []
for i, p in enumerate(PROMPTS):
    t = time.time()
    img = pipe(
        prompt=p["prompt"],
        negative_prompt=p.get("negative", "blurry, bad quality, low resolution, distorted, watermark, deformed, ugly, noisy"),
        width=p.get("width", 1024),
        height=p.get("height", 576),
        num_inference_steps=p.get("steps", 4),
        guidance_scale=p.get("guidance", 0.0),
        generator=torch.Generator("cuda").manual_seed(p.get("seed", 1000 + i)),
    ).images[0]
    path = f"{OUT}/{p['id']}.png"
    img.save(path)
    manifest.append({"id": p["id"], "file": f"{p['id']}.png", "seconds": round(time.time() - t, 2)})
    print(f"[{i+1}/{len(PROMPTS)}] {p['id']} {time.time()-t:.1f}s", flush=True)

json.dump(manifest, open(f"{OUT}/manifest.json", "w"), indent=2)
print("done", flush=True)
