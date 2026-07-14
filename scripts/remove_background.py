import sys
import os
from PIL import Image

def remove_background(image_path, output_path):
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size
    data = img.load()
    
    # Start BFS flood fill from all four corners
    queue = []
    # Seed corners
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
        
    visited = set(queue)
    
    # Check if a color is part of the white/grey/checkerboard background
    def is_background_color(color):
        r, g, b, a = color
        # Is it close to white/grey?
        # Checkerboard colors are usually (255,255,255) and (235..245, 235..245, 235..245)
        # So we can check if it's very bright (r > 200 and g > 200 and b > 200)
        # and has low saturation (abs(r-g) < 20 and abs(g-b) < 20 and abs(b-r) < 20)
        is_bright_grey = (r > 200 and g > 200 and b > 200) and (abs(r - g) < 20 and abs(g - b) < 20 and abs(b - r) < 20)
        return is_bright_grey
    
    to_clear = []
    
    while queue:
        x, y = queue.pop(0)
        color = data[x, y]
        
        if is_background_color(color):
            to_clear.append((x, y))
            
            # Check 4-way neighbors
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) not in visited:
                        visited.add((nx, ny))
                        # Only propagate if neighbor is also a background color
                        if is_background_color(data[nx, ny]):
                            queue.append((nx, ny))
                        
    # Make the identified background pixels completely transparent
    for x, y in to_clear:
        data[x, y] = (0, 0, 0, 0)
        
    img.save(output_path, "PNG")
    print(f"Cleared background: {os.path.basename(image_path)} -> {os.path.basename(output_path)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_background.py <input_path> <output_path>")
        sys.exit(1)
    remove_background(sys.argv[1], sys.argv[2])
