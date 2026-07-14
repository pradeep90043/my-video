import os
from PIL import Image, ImageFilter, ImageDraw

# Source files (black backgrounds)
closed_src = 'C:/Users/PradeepYadav/.gemini/antigravity-cli/brain/9e0546f3-8705-4d79-8290-be66bd901af0/avatar_closed_black_bg_1783198134016.jpg'
open_src = 'C:/Users/PradeepYadav/.gemini/antigravity-cli/brain/9e0546f3-8705-4d79-8290-be66bd901af0/avatar_open_black_bg_1783198154603.jpg'
blink_src = 'C:/Users/PradeepYadav/.gemini/antigravity-cli/brain/9e0546f3-8705-4d79-8290-be66bd901af0/avatar_eyes_closed_black_bg_1783198187828.jpg'

out_dir = 'public/content/VibeCodingNotProgramming/images/'
os.makedirs(out_dir, exist_ok=True)

# BFS Flood Fill to isolate background without affecting dark parts of the character (hair, hoodie, beard)
def get_background_mask(img_pil):
    w, h = img_pil.size
    gray = img_pil.convert('L')
    pixels = gray.load()
    
    # Initialize mask as 255 (character / opaque)
    mask = Image.new('L', (w, h), 255)
    mask_pixels = mask.load()
    
    # Queue for BFS, start with all border pixels
    queue = []
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))
        
    visited = set(queue)
    
    # BFS traversal
    while queue:
        cx, cy = queue.pop(0)
        # Background is solid pure black (exactly 0). We set threshold to < 3 to prevent leaking into hoodie shadows.
        if pixels[cx, cy] < 3:
            mask_pixels[cx, cy] = 0  # make background transparent
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < w and 0 <= ny < h:
                    if (nx, ny) not in visited:
                        visited.add((nx, ny))
                        queue.append((nx, ny))
                        
    return mask

def remove_black_background_bfs(img_pil):
    img_rgba = img_pil.convert('RGBA')
    # Generate background mask using BFS floodfill
    mask = get_background_mask(img_pil)
    # Apply a small Gaussian blur to the mask to feather the silhouette edges smoothly
    mask_feathered = mask.filter(ImageFilter.GaussianBlur(radius=1.5))
    img_rgba.putalpha(mask_feathered)
    return img_rgba

# Load source PIL images
img_closed_raw = Image.open(closed_src)
img_open_raw = Image.open(open_src)
img_blink_raw = Image.open(blink_src)

# Define crops for eyebrows/eyes and wide open mouth
bbox_eyes = [360, 290, 640, 395]
w_eyes = bbox_eyes[2] - bbox_eyes[0]
h_eyes = bbox_eyes[3] - bbox_eyes[1]

bbox_mouth = [430, 445, 570, 550]
w_mouth = bbox_mouth[2] - bbox_mouth[0]
h_mouth = bbox_mouth[3] - bbox_mouth[1]

# Extract crops from raw source images
eyes_closed = img_closed_raw.crop(bbox_eyes)
eyes_open = img_open_raw.crop(bbox_eyes)

mouth_closed = img_closed_raw.crop(bbox_mouth)
mouth_open = img_open_raw.crop(bbox_mouth)

# Feathered eye mask
mask_eyes = Image.new('L', (w_eyes, h_eyes), 0)
draw_eyes = ImageDraw.Draw(mask_eyes)
draw_eyes.rectangle([10, 10, w_eyes - 10, h_eyes - 10], fill=255)
mask_eyes = mask_eyes.filter(ImageFilter.GaussianBlur(radius=6))

# Feathered mouth mask
mask_mouth = Image.new('L', (w_mouth, h_mouth), 0)
draw_mouth = ImageDraw.Draw(mask_mouth)
draw_mouth.ellipse([5, 5, w_mouth - 5, h_mouth - 5], fill=255)
mask_mouth = mask_mouth.filter(ImageFilter.GaussianBlur(radius=4))

# Step 1: Blend face frames on the raw closed image (remains identical)
num_frames = 15
for i in range(num_frames):
    alpha = i / float(num_frames - 1)
    blend_eyes = Image.blend(eyes_closed, eyes_open, alpha)
    blend_mouth = Image.blend(mouth_closed, mouth_open, alpha)
    
    # Composite onto a clean copy of the raw closed image
    temp_img = img_closed_raw.copy()
    temp_img.paste(blend_eyes, (bbox_eyes[0], bbox_eyes[1]), mask_eyes)
    temp_img.paste(blend_mouth, (bbox_mouth[0], bbox_mouth[1]), mask_mouth)
    
    # Step 2: Remove the black background of the composited frame using BFS
    frame_transparent = remove_black_background_bfs(temp_img)
    
    # Save the frame
    frame_transparent.save(os.path.join(out_dir, f'avatar_frame_{i}.png'), 'PNG')
    print(f"Generated transparent avatar_frame_{i}.png")

# Step 3: Overwrite base closed and open paths
img_closed_final = Image.open(os.path.join(out_dir, 'avatar_frame_0.png'))
img_open_final = Image.open(os.path.join(out_dir, f'avatar_frame_{num_frames - 1}.png'))
img_closed_final.save(os.path.join(out_dir, 'avatar_closed.png'), 'PNG')
img_open_final.save(os.path.join(out_dir, 'avatar_open.png'), 'PNG')

# Step 4: Extract and generate the transparent eyes closed crop for blinking
eyes_closed_blink = img_blink_raw.crop(bbox_eyes)
# Crop the corresponding eyes mask
mask_blink = Image.new('L', (w_eyes, h_eyes), 0)
draw_blink = ImageDraw.Draw(mask_blink)
draw_blink.ellipse([5, 2, w_eyes - 5, h_eyes - 2], fill=255)
mask_blink = mask_blink.filter(ImageFilter.GaussianBlur(radius=4))

# Save the eye overlay as transparent RGBA PNG
eyes_closed_blink = eyes_closed_blink.convert('RGBA')
eyes_closed_blink.putalpha(mask_blink)
eyes_closed_blink.save(os.path.join(out_dir, 'avatar_eyes_closed_crop.png'), 'PNG')

print("All transparent avatar assets successfully processed!")
