# Retro Pixel Art Generator
# A simple script to create ASCII pixel art with a retro vibe

import random

def generate_pixel_art(width, height, style='random'):
    """
    Generate ASCII pixel art based on width, height, and style.
    Styles: 'random', 'checker', 'border'
    """
    art = []
    pixel_chars = ['█', '▓', '▒', '░', '■', '□']
    
    for y in range(height):
        row = ''
        for x in range(width):
            if style == 'random':
                row += random.choice(pixel_chars)
            elif style == 'checker':
                row += pixel_chars[0] if (x + y) % 2 == 0 else pixel_chars[1]
            elif style == 'border':
                if x == 0 or x == width - 1 or y == 0 or y == height - 1:
                    row += pixel_chars[0]
                else:
                    row += pixel_chars[3]
        art.append(row)
    return art

def main():
    print("Welcome to Retro Pixel Art Generator!")
    try:
        width = int(input("Enter width (5-50): "))
        height = int(input("Enter height (5-30): "))
        style = input("Enter style (random/checker/border): ").lower()
        
        if not 5 <= width <= 50 or not 5 <= height <= 30:
            print("Dimensions out of range! Using default 10x10.")
            width, height = 10, 10
        
        if style not in ['random', 'checker', 'border']:
            print("Invalid style! Using 'random'.")
            style = 'random'
            
        print("\nYour Retro Pixel Art:\n")
        art = generate_pixel_art(width, height, style)
        for row in art:
            print(row)
    except ValueError:
        print("Invalid input! Please enter numbers for width and height.")

if __name__ == "__main__":
    main()
