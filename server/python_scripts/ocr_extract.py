#!/usr/bin/env python3
"""OCR text extraction using Tesseract. Usage: python3 ocr_extract.py <image_path>"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import pytesseract
    from PIL import Image, ImageEnhance

    if len(sys.argv) < 2:
        print("Usage: python3 ocr_extract.py <image_path>", file=sys.stderr)
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}", file=sys.stderr)
        sys.exit(1)

    img = Image.open(image_path)
    if img.mode != 'L':
        img = img.convert('L')
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)
    if img.width < 300:
        img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)

    text = pytesseract.image_to_string(img, lang='eng')
    print(text.strip())

except ImportError as e:
    print(f"Error importing dependencies: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error during OCR: {e}", file=sys.stderr)
    sys.exit(1)
