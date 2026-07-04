#!/bin/bash

# Activate the demucs python environment
source /Users/apple/Desktop/pradeep/my-video/demucs_env/bin/activate

cd /Users/apple/Desktop/pradeep/my-video/public/content/AivsSWE/video

# Create an output directory for the final videos
mkdir -p no_music_videos

for file in *.mp4; do
  echo "Processing $file with Demucs..."
  # Run Demucs on the video file. By default it outputs to 'separated/htdemucs/FILENAME/'
  python3 -m demucs "$file"
  
  # The video filename without the .mp4 extension
  filename=$(basename -- "$file")
  filename="${filename%.*}"
  
  # Demucs produces 4 stems: vocals.wav, drums.wav, bass.wav, other.wav
  # We only want vocals.wav
  vocals_path="separated/htdemucs/$filename/vocals.wav"
  
  if [ -f "$vocals_path" ]; then
    echo "Replacing audio in $file with isolated speech..."
    ffmpeg -y -i "$file" -i "$vocals_path" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 128k "no_music_videos/$file" < /dev/null
    
    # Overwrite original video with the clean one
    mv "no_music_videos/$file" "$file"
  else
    echo "WARNING: Failed to find vocals stem for $file"
  fi
done

# Cleanup the heavy temporary wav files from demucs
rm -rf separated
rm -rf no_music_videos
echo "All videos processed and music removed!"
