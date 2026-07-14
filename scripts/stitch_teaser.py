import os
import shutil
import glob
import subprocess
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def draw_text_overlay(pil_img, text, font):
    draw = ImageDraw.Draw(pil_img)
    lines = text.split('\n')
    
    # Calculate dimensions
    line_heights = []
    line_widths = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        line_widths.append(w)
        line_heights.append(h)
        
    total_height = sum(line_heights) + 12 * (len(lines) - 1)
    
    # Place text overlay centered at the bottom third (y around 950)
    y_start = 980 - total_height // 2
    
    max_w = max(line_widths)
    box_padding_x = 24
    box_padding_y = 16
    box_x0 = 360 - max_w // 2 - box_padding_x
    box_y0 = y_start - box_padding_y
    box_x1 = 360 + max_w // 2 + box_padding_x
    box_y1 = y_start + total_height + box_padding_y
    
    # Draw dark semi-transparent rounded rectangle for premium readability
    overlay = Image.new('RGBA', pil_img.size, (0, 0, 0, 0))
    ol_draw = ImageDraw.Draw(overlay)
    ol_draw.rounded_rectangle([box_x0, box_y0, box_x1, box_y1], radius=12, fill=(15, 15, 15, 205))
    pil_img.alpha_composite(overlay)
    
    # Draw text lines
    current_y = y_start
    for idx, line in enumerate(lines):
        w = line_widths[idx]
        h = line_heights[idx]
        x = 360 - w // 2
        draw.text((x, current_y), line, fill=(255, 255, 255, 255), font=font)
        current_y += h + 12

def main():
    src_dir = r"C:\Users\PradeepYadav\Downloads\download (1)"
    original_patterns = [
        "*hand_pulling_diary*",
        "*sitting_on_bed_diary*",
        "*tracing*",
        "*reflection*",
        "*grief*"
    ]
    
    # Resolve files dynamically using glob to bypass unicode characters in filenames
    original_clips = []
    for pattern in original_patterns:
        matches = glob.glob(os.path.join(src_dir, pattern))
        if matches:
            original_clips.append(matches[0])
        else:
            print(f"[ERROR] Could not find file matching pattern: {pattern}")
            return
            
    logo_path = r"C:\Users\PradeepYadav\Documents\Github\my-video\src\storiyum\assets\storiyum-brand-logo.png"
    out_dir = r"C:\Users\PradeepYadav\Documents\Github\my-video\out"
    temp_clips_dir = os.path.join(out_dir, "temp_clips")
    
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(temp_clips_dir, exist_ok=True)
    
    # Copy clips to temporary folder with clean names to bypass OpenCV filename bug
    clips = []
    print("[INFO] Copying clips to temp folder with clean names...")
    for idx, orig_clip in enumerate(original_clips):
        temp_clip_path = os.path.join(temp_clips_dir, f"clip_{idx+1}.mp4")
        shutil.copy2(orig_clip, temp_clip_path)
        clips.append(temp_clip_path)
        print(f"   Copied to: {temp_clip_path}")
    
    silent_output = os.path.join(out_dir, "silent_stitched.mp4")
    final_output = os.path.join(out_dir, "MaaKiDiaryTeaser.mp4")
    
    # Use system ffmpeg
    ffmpeg_path = "ffmpeg"
    
    # 1. Overlay logo, text, and stitch video frames (limit each clip to exactly 5.0 seconds)
    logo = Image.open(logo_path).convert("RGBA")
    # Resize logo to 60x60
    logo_scaled = logo.resize((60, 60), Image.Resampling.LANCZOS)
    
    # Load premium system font (Arial Bold or Segoe UI)
    try:
        font = ImageFont.truetype("C:\\Windows\\Fonts\\arialbd.ttf", 32)
    except IOError:
        try:
            font = ImageFont.truetype("arial.ttf", 32)
        except IOError:
            font = ImageFont.load_default()
            
    # Open the first video to get specs
    cap_test = cv2.VideoCapture(clips[0])
    fps = cap_test.get(cv2.CAP_PROP_FPS)
    if fps == 0 or fps is None:
        fps = 24.0
    cap_test.release()
    
    # Set up VideoWriter
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out_video = cv2.VideoWriter(silent_output, fourcc, fps, (720, 1280))
    
    # Screenplay Text Overlays
    text_overlays = {
        0: "Maa ke jaane ke 3 mahine baad...\nbeta ne ek diary dhoondh li.",
        3: "'Doctor ne kaha hai zyada waqt nahi bacha...'",
        4: "Maa ne yeh baat kabhi batayi kyu nahi?\nFull video -- link in bio"
    }
    
    print("[INFO] Processing video frames, overlaying logo and screen text...")
    max_clip_frames = int(5.0 * fps)
    for idx, clip in enumerate(clips):
        print(f"   Processing clip {idx+1}/{len(clips)}: {os.path.basename(clip)}")
        cap = cv2.VideoCapture(clip)
        
        if not cap.isOpened():
            print(f"[ERROR] Failed to open clip: {clip}")
            continue
            
        frames_written = 0
        while cap.isOpened() and frames_written < max_clip_frames:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Convert BGR to RGBA for Pillow
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
            pil_img = Image.fromarray(frame_rgb)
            
            # Draw black circle to cover the star
            draw = ImageDraw.Draw(pil_img)
            # Center of star: (599, 1159), radius: 32 (diameter 64)
            draw.ellipse((599 - 32, 1159 - 32, 599 + 32, 1159 + 32), fill=(11, 11, 11, 255))
            
            # Overlay scaled logo centered at (599, 1159)
            pil_img.paste(logo_scaled, (569, 1129), logo_scaled)
            
            # Draw screenplay text overlay if defined for this clip
            if idx in text_overlays:
                draw_text_overlay(pil_img, text_overlays[idx], font)
                
            # Convert back to BGR and write
            frame_out = cv2.cvtColor(np.array(pil_img), cv2.COLOR_BGRA2BGR)
            out_video.write(frame_out)
            frames_written += 1
            
        cap.release()
        
    out_video.release()
    print("[INFO] Stitched video written to:", silent_output)
    
    # 2. Extract 5.0s audio segments from original video clips
    print("\n[INFO] Extracting original audio tracks from clips (5.0s each)...")
    audio_segments = []
    for idx, clip in enumerate(clips):
        segment_wav = os.path.join(out_dir, f"audio_seg_{idx}.wav")
        print(f"   Extracting from clip {idx+1}...")
        subprocess.run([
            ffmpeg_path, "-y", "-i", clip, "-ss", "0", "-t", "5.0", "-vn", segment_wav
        ], check=True)
        audio_segments.append(segment_wav)
        
    # Generate Voiceovers using edge-tts if not exist
    print("\n[INFO] Checking / generating voiceover tracks...")
    vo_texts = {
        "out/vo_clip2.mp3": "Pehla panna kholte hi... usse laga jaise maa uske saamne baithi ho.",
        "out/vo_clip3.mp3": "Par jaise jaise usne panne palte... usse ek aisa raaz mila, jisne uski poori zindagi badal di.",
        "out/vo_clip5.mp3": "Maa ne yeh baat kabhi batayi kyu nahi? Full video, link in bio."
    }
    
    for path_file, text in vo_texts.items():
        if not os.path.exists(path_file):
            print(f"   Generating VO: {os.path.basename(path_file)}...")
            try:
                subprocess.run([
                    "edge-tts", "--voice", "hi-IN-MadhurNeural",
                    "--text", text, "--write-media", path_file
                ], check=True)
            except Exception as e:
                print(f"[ERROR] Failed to generate VO {path_file}: {e}")
                return
                
    # 3. Mix original background audio and voiceovers using ffmpeg filter_complex
    print("\n[INFO] Mixing original audio tracks with voiceovers...")
    mixed_audio = os.path.join(out_dir, "mixed_teaser_audio.mp3")
    
    # Concatenate the 5 audio tracks and mix with the three delayed voiceovers
    filter_complex = (
        "[0:a][1:a][2:a][3:a][4:a]concat=n=5:v=0:a=1[bg];"
        "[5:a]volume=1.0,adelay=6000|6000[vo2_del];"
        "[6:a]volume=1.0,adelay=10500|10500[vo3_del];"
        "[7:a]volume=1.0,adelay=20000|20000[vo5_del];"
        "[bg][vo2_del][vo3_del][vo5_del]amix=inputs=4:duration=first:dropout_transition=0[mix]"
    )
    
    subprocess.run([
        ffmpeg_path, "-y",
        "-i", audio_segments[0],
        "-i", audio_segments[1],
        "-i", audio_segments[2],
        "-i", audio_segments[3],
        "-i", audio_segments[4],
        "-i", "out/vo_clip2.mp3",
        "-i", "out/vo_clip3.mp3",
        "-i", "out/vo_clip5.mp3",
        "-filter_complex", filter_complex,
        "-map", "[mix]",
        "-t", "25",
        mixed_audio
    ])
    
    # 4. Merge mixed audio and video
    print("\n[INFO] Merging video and mixed audio...")
    subprocess.run([
        ffmpeg_path, "-y",
        "-i", silent_output,
        "-i", mixed_audio,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-shortest",
        final_output
    ])
    
    # Cleanup temp files
    print("[INFO] Cleaning up temp files...")
    if os.path.exists(silent_output):
        os.remove(silent_output)
    if os.path.exists(mixed_audio):
        os.remove(mixed_audio)
    for seg in audio_segments:
        if os.path.exists(seg):
            os.remove(seg)
            
    # Remove temp clips folder
    try:
        shutil.rmtree(temp_clips_dir)
    except Exception as e:
        print(f"[WARN] Failed to delete temp clips directory: {e}")
        
    print(f"\n[SUCCESS] Final teaser video saved to: {final_output}")

if __name__ == "__main__":
    main()
