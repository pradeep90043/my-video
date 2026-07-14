import os
from PIL import Image, ImageFilter, ImageDraw

# Paths
eyes_closed_src = 'C:/Users/PradeepYadav/.gemini/antigravity-cli/brain/9e0546f3-8705-4d79-8290-be66bd901af0/avatar_eyes_closed_1783197324398.jpg'
out_path = 'public/content/VibeCodingNotProgramming/images/avatar_eyes_closed_crop.png'

# Load source image
img = Image.open(eyes_closed_src).convert('RGBA')

# Define eyes bounding box
# [left, top, right, bottom]
bbox = [360, 345, 640, 395]
w = bbox[2] - bbox[0]
h = bbox[3] - bbox[1]

# Crop the eye region
crop = img.crop(bbox)

# Create an alpha mask with soft feathered margins
mask = Image.new('L', (w, h), 0)
draw = ImageDraw.Draw(mask)
# Draw an ellipse over the eye region to blend the skin seamlessly
draw.ellipse([5, 2, w - 5, h - 2], fill=255)
# Gaussian blur to make the skin transitions completely invisible
mask = mask.filter(ImageFilter.GaussianBlur(radius=8))

# Set mask as the alpha channel of the crop
crop.putalpha(mask)

# Save the transparent PNG crop
crop.save(out_path, 'PNG')
print(f"Successfully generated transparent eye-blink overlay at {out_path}")
