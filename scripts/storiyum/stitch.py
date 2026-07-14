import os
import subprocess
import argparse

def run_cmd(cmd):
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        raise Exception(f"Command failed with exit status: {result.returncode}")
    print("Command completed successfully.")

def main():
    cwd = r"C:\Users\PradeepYadav\Documents\Github\my-video"
    out_dir = os.path.join(cwd, "out")
    os.makedirs(out_dir, exist_ok=True)

    # Parse optional video arguments, default to out/MaaKiDiary.mp4
    parser = argparse.ArgumentParser(description="Stitch Storiyum intro + video + outro.")
    parser.add_argument("--video", default=os.path.join(out_dir, "MaaKiDiary.mp4"), help="Path to the main video file")
    parser.add_argument("--out", help="Path to the final output video file")
    args = parser.parse_args()

    main_path = os.path.abspath(args.video)
    if not os.path.exists(main_path):
        print(f"Error: Main video not found at {main_path}")
        return

    # Use assets from the workspace folder
    intro_path = os.path.join(cwd, "src", "storiyum", "assets", "intro.mp4")
    outro_path = os.path.join(cwd, "src", "storiyum", "assets", "outro.mp4")
    logo_path = os.path.join(cwd, "src", "storiyum", "assets", "storiyum-brand-logo.png")

    if not os.path.exists(intro_path) or not os.path.exists(outro_path) or not os.path.exists(logo_path):
        print("Error: Storiyum intro, outro, or brand logo assets not found in workspace src/storiyum/assets/")
        return

    basename = os.path.splitext(os.path.basename(main_path))[0]
    final_output = os.path.abspath(args.out) if args.out else os.path.join(out_dir, f"{basename}_final.mp4")

    temp_intro = os.path.join(out_dir, "temp_intro.mp4")
    temp_outro = os.path.join(out_dir, "temp_outro.mp4")
    temp_main = os.path.join(out_dir, "temp_main.mp4")
    list_path = os.path.join(out_dir, "list.txt")

    ffmpeg_path = "ffmpeg"

    # 1. Process intro: scale to 1920x1080, fps=30, overlay logo, output clean format
    print("--- Processing intro ---")
    intro_cmd = [
        ffmpeg_path, "-y",
        "-i", intro_path,
        "-i", logo_path,
        "-filter_complex", "[1:v]scale=120:120[logo];[0:v][logo]overlay=W-w-21:H-h-24[v1];[v1]scale=1920:1080,fps=30[v2]",
        "-map", "[v2]", "-map", "0:a",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000", "-ac", "2",
        temp_intro
    ]
    run_cmd(intro_cmd)

    # 2. Process outro: scale to 1920x1080, fps=30, overlay logo, output clean format
    print("--- Processing outro ---")
    outro_cmd = [
        ffmpeg_path, "-y",
        "-i", outro_path,
        "-i", logo_path,
        "-filter_complex", "[1:v]scale=120:120[logo];[0:v][logo]overlay=W-w-21:H-h-24[v1];[v1]scale=1920:1080,fps=30[v2]",
        "-map", "[v2]", "-map", "0:a",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000", "-ac", "2",
        temp_outro
    ]
    run_cmd(outro_cmd)

    # 3. Process main video: overlay logo at x=W-w-138, y=H-h-138
    print("--- Processing main video ---")
    main_cmd = [
        ffmpeg_path, "-y",
        "-i", main_path,
        "-i", logo_path,
        "-filter_complex", "[1:v]scale=105:100[logo];[0:v][logo]overlay=W-w-138:H-h-138[v1]",
        "-map", "[v1]", "-map", "0:a",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000", "-ac", "2",
        temp_main
    ]
    run_cmd(main_cmd)

    # 4. Concatenate videos
    print("--- Stitching videos together ---")
    with open(list_path, "w", encoding="utf-8") as f:
        f.write(f"file '{temp_intro.replace(chr(92), '/')}'\n")
        f.write(f"file '{temp_main.replace(chr(92), '/')}'\n")
        f.write(f"file '{temp_outro.replace(chr(92), '/')}'\n")

    concat_cmd = [
        ffmpeg_path, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", list_path,
        "-c", "copy",
        final_output
    ]
    run_cmd(concat_cmd)

    # Cleanup temp files
    print("--- Cleaning up temporary files ---")
    for p in [temp_intro, temp_outro, temp_main, list_path]:
        if os.path.exists(p):
            os.remove(p)
            print(f"Removed temp file: {os.path.basename(p)}")

    print(f"\nSuccess! Stitched & branded video saved to: {final_output}")

if __name__ == "__main__":
    main()
