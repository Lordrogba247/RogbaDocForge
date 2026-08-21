#!/usr/bin/env python3
"""Generate a PDF document from text input using WeasyPrint."""
import sys, os, re, html

def format_inline_formatting(text):
    text = html.escape(text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
    text = re.sub(r'__(.*?)__', r'<u>\1</u>', text)
    return text

def text_to_html(text, title):
    lines = text.split('\n')
    html_parts = [f'<h1>{html.escape(title)}</h1>']
    for line in lines:
        stripped = line.strip()
        if not stripped: continue
        if stripped.startswith('# '):
            html_parts.append(f'<h2>{format_inline_formatting(stripped[2:])}</h2>')
        elif stripped.startswith('## '):
            html_parts.append(f'<h3>{format_inline_formatting(stripped[3:])}</h3>')
        elif stripped.startswith('### '):
            html_parts.append(f'<h4>{format_inline_formatting(stripped[4:])}</h4>')
        elif re.match(r'^[\-\*\u2022]\s+', stripped):
            bullet_text = re.sub(r'^[\-\*\u2022]\s+', '', stripped)
            html_parts.append(f'<p class="bullet">&#8226; {format_inline_formatting(bullet_text)}</p>')
        elif re.match(r'^\d+[\.\)]\s+', stripped):
            num_text = re.sub(r'^\d+[\.\)]\s+', '', stripped)
            html_parts.append(f'<p class="numbered">{format_inline_formatting(num_text)}</p>')
        else:
            html_parts.append(f'<p>{format_inline_formatting(stripped)}</p>')
    return f'''<!DOCTYPE html>
<html><head><style>
@page {{ size: A4; margin: 2cm; }}
body {{ font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11pt; line-height: 1.6; color: #333; }}
h1 {{ font-size: 24pt; text-align: center; margin-bottom: 30px; color: #1a1a2e; border-bottom: 2px solid #e94560; padding-bottom: 10px; }}
h2 {{ font-size: 18pt; color: #16213e; margin-top: 20px; }}
h3 {{ font-size: 14pt; color: #0f3460; }}
h4 {{ font-size: 12pt; color: #533483; }}
p {{ margin: 8px 0; }}
.bullet {{ padding-left: 20px; }}
.numbered {{ padding-left: 20px; }}
</style></head><body>{''.join(html_parts)}</body></html>'''

try:
    from weasyprint import HTML

    if len(sys.argv) < 3:
        print("Usage: python3 generate_pdf.py <input_text_file> <output_path> [title]", file=sys.stderr)
        sys.exit(1)

    text_file, output_path = sys.argv[1], sys.argv[2]
    title = sys.argv[3] if len(sys.argv) > 3 else "Document"

    with open(text_file, 'r', encoding='utf-8') as f:
        text = f.read()

    HTML(string=text_to_html(text, title)).write_pdf(output_path)
    print(output_path)
except ImportError as e:
    print(f"Error importing dependencies: {e}", file=sys.stderr); sys.exit(1)
except Exception as e:
    print(f"Error generating PDF: {e}", file=sys.stderr); sys.exit(1)
