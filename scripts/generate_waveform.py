import os
import wave
import struct
import json
import subprocess

# Paths
audio_dir = 'public/content/VibeCodingNotProgramming/audio'
mp3_path = os.path.join(audio_dir, 'voiceover.mp3')
wav_path = os.path.join(audio_dir, 'voiceover.wav')
json_path = os.path.join(audio_dir, 'waveform.json')

# Find ffmpeg.exe in @remotion/compositor node modules (just like run.ts / generate-audio.ts do)
ffmpeg_path = None
compositor_dir = 'node_modules/@remotion/compositor-win32-x64-msvc'
if os.path.exists(compositor_dir):
    for f in os.listdir(compositor_dir):
        if f.endswith('ffmpeg.exe'):
            ffmpeg_path = os.path.join(compositor_dir, f)
            break

if not ffmpeg_path:
    ffmpeg_path = 'ffmpeg' # fallback to global

print(f"Using ffmpeg path: {ffmpeg_path}")

# Step 1: Convert MP3 to 8000Hz Mono WAV
cmd = [
    ffmpeg_path,
    '-y',
    '-i', mp3_path,
    '-ac', '1',
    '-ar', '8000',
    '-f', 'wav',
    wav_path
]
print("Running ffmpeg conversion...")
subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

if not os.path.exists(wav_path):
    print("Error: ffmpeg failed to generate WAV file.")
    exit(1)

# Step 2: Read WAV file and calculate frame volume envelope
print("Analyzing WAV file...")
with wave.open(wav_path, 'r') as w:
    params = w.getparams()
    sample_rate = w.getframerate()
    n_frames = w.getnframes()
    data = w.readframes(n_frames)

# Unpack 16-bit PCM mono samples
samples = struct.unpack(f"<{n_frames}h", data)

# 30 fps video, so each frame has sample_rate / 30 samples
samples_per_frame = sample_rate / 30.0
total_video_frames = int(n_frames / samples_per_frame)

waveform = []
max_rms = 0

for f in range(total_video_frames):
    start_idx = int(f * samples_per_frame)
    end_idx = int((f + 1) * samples_per_frame)
    frame_samples = samples[start_idx:end_idx]
    
    if not frame_samples:
        waveform.append(0.0)
        continue
        
    # Calculate Root Mean Square (RMS) volume
    squared_sum = sum(s ** 2 for s in frame_samples)
    rms = (squared_sum / len(frame_samples)) ** 0.5
    
    waveform.append(rms)
    if rms > max_rms:
        max_rms = rms

# Step 3: Normalize waveform values to scale between 0.0 and 1.0
if max_rms > 0:
    # Use a slight amplification multiplier so normal speaking causes clear mouth openings
    waveform = [min(1.0, (val / max_rms) * 1.5) for val in waveform]
else:
    waveform = [0.0] * total_video_frames

# Step 4: Write to JSON file
with open(json_path, 'w') as f:
    json.dump(waveform, f)

# Step 5: Clean up WAV
if os.path.exists(wav_path):
    os.remove(wav_path)

print(f"Generated waveform envelope for {len(waveform)} frames and saved to {json_path}")
