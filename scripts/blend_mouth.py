import os
from PIL import Image, ImageFilter, ImageDraw

# Paths
closed_path = 'public/content/VibeCodingNotProgramming/images/avatar_closed.png'
open_path = 'public/content/VibeCodingNotProgramming/images/avatar_open.png'
out_dir = 'public/content/VibeCodingNotProgramming/images/'

# Load images
img_closed = Image.open(closed_path).convert('RGBA')
img_open = Image.open(open_path).convert('RGBA')

# Define bounding boxes
# Eyebrows and Eyes: [left, top, right, bottom]
bbox_eyes = [360, 290, 640, 395]
w_eyes = bbox_eyes[2] - bbox_eyes[0]
h_eyes = bbox_eyes[3] - bbox_eyes[1]

# Mouth: [left, top, right, bottom] (wider and deeper box to allow wide opening and jaw lowering)
bbox_mouth = [430, 445, 570, 550]
w_mouth = bbox_mouth[2] - bbox_mouth[0]
h_mouth = bbox_mouth[3] - bbox_mouth[1]

# Extract crops
eyes_closed = img_closed.crop(bbox_eyes)
eyes_open = img_open.crop(bbox_eyes)

mouth_closed = img_closed.crop(bbox_mouth)
mouth_open = img_open.crop(bbox_mouth)

# Create feathered mask for the eyes
mask_eyes = Image.new('L', (w_eyes, h_eyes), 0)
draw_eyes = ImageDraw.Draw(mask_eyes)
# Draw rectangle with margins for soft blending
draw_eyes.rectangle([10, 10, w_eyes - 10, h_eyes - 10], fill=255)
mask_eyes = mask_eyes.filter(ImageFilter.GaussianBlur(radius=6))

# Create feathered mask for the mouth (ellipse mask)
mask_mouth = Image.new('L', (w_mouth, h_mouth), 0)
draw_mouth = ImageDraw.Draw(mask_mouth)
draw_mouth.ellipse([5, 5, w_mouth - 5, h_mouth - 5], fill=255)
mask_mouth = mask_mouth.filter(ImageFilter.GaussianBlur(radius=4))

# Generate 5 intermediate animation frames
for i in range(5):
    alpha = i / 4.0 # 0.0 (closed) to 1.0 (fully open + expressive eyes)
    
    # Interpolate eyes and mouth crops
    blend_eyes = Image.blend(eyes_closed, eyes_open, alpha)
    blend_mouth = Image.blend(mouth_closed, mouth_open, alpha)
    
    # Composite onto a clean copy of the closed image
    frame_img = img_closed.copy()
    
    # Paste eyes
    frame_img.paste(blend_eyes, (bbox_eyes[0], bbox_eyes[1]), mask_eyes)
    
    # Paste mouth
    frame_img.paste(blend_mouth, (bbox_mouth[0], bbox_mouth[1]), mask_mouth)
    
    # Save the frame
    frame_img.save(os.path.join(out_dir, f'avatar_frame_{i}.png'), 'PNG')
    print(f"Generated avatar_frame_{i}.png with alpha={alpha:.2f}")

# Overwrite avatar_closed and avatar_open with frame 0 and frame 4
img_closed_final = Image.open(os.path.join(out_dir, 'avatar_frame_0.png'))
img_open_final = Image.open(os.path.join(out_dir, 'avatar_frame_4.png'))

img_closed_final.save(os.path.join(out_dir, 'avatar_closed.png'), 'PNG')
img_open_final.save(os.path.join(out_dir, 'avatar_open.png'), 'PNG')
print("Successfully generated identical face frames with seamlessly blended open mouth and facial expression!")
