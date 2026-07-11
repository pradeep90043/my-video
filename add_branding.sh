#!/bin/bash

# Usage: ./add_branding.sh <input_video> <output_video> <type: short|long>

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <input_video> <output_video> <type: short|long>"
    exit 1
fi

INPUT_VIDEO=$1
OUTPUT_VIDEO=$2
TYPE=$3
LOGO="logo.png"

if [ ! -f "$LOGO" ]; then
    echo "Error: logo.png not found in the current directory."
    exit 1
fi

if [ "$TYPE" == "long" ]; then
    # Full video 16:9
    # Location: 138 from bottom and 138 from right
    # Size: 105x100
    ffmpeg -i "$INPUT_VIDEO" -i "$LOGO" -filter_complex "[1:v]scale=105:100[logo];[0:v][logo]overlay=W-w-138:H-h-138" -codec:a copy "$OUTPUT_VIDEO"
elif [ "$TYPE" == "short" ]; then
    # Shorts video 9:16
    # Location: 91 from top and 91 from right
    # Size: 50x50
    ffmpeg -i "$INPUT_VIDEO" -i "$LOGO" -filter_complex "[1:v]scale=50:50[logo];[0:v][logo]overlay=W-w-91:91" -codec:a copy "$OUTPUT_VIDEO"
else
    echo "Invalid type. Must be 'short' or 'long'."
    exit 1
fi

echo "Branding added successfully!"
