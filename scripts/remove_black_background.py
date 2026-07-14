import sys
import os
from PIL import Image

def remove_black_background(image_path, output_path, threshold=70):
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size
    data = img.load()
    
    # Start BFS flood fill from all borders
    queue = []
    visited = set()
    
    # Seed top and bottom borders
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
        visited.add((x, 0))
        visited.add((x, height - 1))
        
    # Seed left and right borders
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
        visited.add((0, y))
        visited.add((width - 1, y))
        
    # Check if a color is part of the dark background
    def is_dark_color(color):
        r, g, b, a = color
        # Dark color checks if r, g, b are all below the threshold
        return r < threshold and g < threshold and b < threshold
    
    to_clear = []
    
    while queue:
        x, y = queue.pop(0)
        color = data[x, y]
        
        if is_dark_color(color):
            to_clear.append((x, y))
            
            # Check 4-way neighbors
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) not in visited:
                        visited.add((nx, ny))
                        # Only propagate if neighbor is also dark background
                        if is_dark_color(data[nx, ny]):
                            queue.append((nx, ny))
                        
    # Make the identified background pixels completely transparent
    for x, y in to_clear:
        data[x, y] = (0, 0, 0, 0)
        
    # Soften the edges (feathering) to avoid harsh dark halos
    # If a pixel is not transparent but has transparent neighbors, we can soften it
    # We do a simple pass to find boundary pixels and semi-transparise them
    boundary_pixels = []
    for x, y in visited:
        if (x, y) not in to_clear:
            # This is a non-background visited pixel (should be part of the white border edge)
            # Let's see if it's right next to a transparent pixel
            is_edge = False
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) in to_clear:
                        is_edge = True
                        break
            if is_edge:
                boundary_pixels.append((x, y))
                
    for x, y in boundary_pixels:
        r, g, b, a = data[x, y]
        # Calculate distance to pure black to decide how much to fade
        darkness = max(r, g, b)
        if darkness < 120:  # If it is a transition pixel containing significant black
            # Blend it towards transparency
            alpha = int(255 * (darkness / 120))
            data[x, y] = (r, g, b, alpha)

    # Save as PNG
    img.save(output_path, "PNG")
    print(f"Cleared black background: {os.path.basename(image_path)} -> {os.path.basename(output_path)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_black_background.py <input_path> <output_path> [threshold]")
        sys.exit(1)
    
    thresh = 70
    if len(sys.argv) > 3:
        thresh = int(sys.argv[3])
        
    remove_black_background(sys.argv[1], sys.argv[2], thresh)
