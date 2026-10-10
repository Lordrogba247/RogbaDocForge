#!/usr/bin/env python3
"""Smart PDF generator with cover, TOC, headings, header/footer, themes."""
import sys, json, re, os, html
sys.path.insert(0, os.path.dirname(__file__))
from smart_format import detect_headings, cleanup_paragraphs, ACADEMIC, THEMES

def inline(t):
    t = html.escape(t)
    t = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'\*(.*?)\*', r'<em>\1</em>', t)
    t = re.sub(r'__(.*?)__', r'<u>\1</u>', t)
    return t

try:
    from weasyprint import HTML
    if len(sys.argv) < 4:
        print("Usage: generate_smart_pdf.py <input> <output> <title> [options_json]", file=sys.stderr); sys.exit(1)
    text_file, output_path = sys.argv[1], sys.argv[2]
    title = sys.argv[3] if len(sys.argv) > 3 else "Document"
    opts = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    with open(text_file, 'r', encoding='utf-8') as f:
        raw = f.read()
    academic = ACADEMIC.get(opts.get('academic', 'none'), ACADEMIC['none'])
    theme = THEMES.get(opts.get('theme', 'modern'), THEMES['modern'])
    font = opts.get('font') or academic['font']
    size = int(opts.get('fontSize') or academic['size'])
    spacing = float(opts.get('lineSpacing') or academic['spacing'])
    margin = academic['margin_cm']
    align = opts.get('align', 'left')
    align_css = {'left': 'left', 'center': 'center', 'right': 'right', 'justify': 'justify'}.get(align, 'left')
    auto_head = opts.get('autoHeadings', True)
    want_toc = opts.get('toc', False)
    want_cover = opts.get('cover', False)
    cover_name = html.escape(opts.get('coverName', ''))
    cover_date = html.escape(opts.get('coverDate', ''))
    header_txt = html.escape(opts.get('header', ''))
    footer_txt = html.escape(opts.get('footer', ''))
    page_nums = opts.get('pageNumbers', True)
    brand_accent = (opts.get('brandAccent', '') or '').lstrip('#')
    watermark_txt = html.escape(opts.get('watermark', '') or '')
    sig_name = html.escape(opts.get('signatureName', '') or '')
    sig_title = html.escape(opts.get('signatureTitle', '') or '')
    images = opts.get('images', []) or []
    accent = '#' + (brand_accent if re.match(r'^[0-9a-fA-F]{6}$', brand_accent) else theme['accent'])
    heading = '#' + theme['heading']

    text = cleanup_paragraphs(raw)
    lines = text.split('\n')
    detected = detect_headings(lines) if auto_head else [{'line': l, 'level': 0, 'text': l} for l in lines]

    parts = []
    if want_cover:
        parts.append(f'''<div class="cover"><div class="cover-bar"></div>
<h1 class="cover-title">{html.escape(title)}</h1>
{"<p class='cover-name'>"+cover_name+"</p>" if cover_name else ""}
{"<p class='cover-date'>"+cover_date+"</p>" if cover_date else ""}
</div>''')
    else:
        parts.append(f'<h1 class="doctitle">{html.escape(title)}</h1>')
    if want_toc:
        parts.append('<h2>Table of Contents</h2><ul class="toc">')
        for d in detected:
            if d['level'] > 0:
                t = inline((d.get('text') or d['line']).strip())
                parts.append(f"<li class='toc-{d['level']}'>{t}</li>")
        parts.append('</ul>')
    for d in detected:
        line = (d.get('text') or d.get('line') or '').strip()
        if not line: continue
        lvl = d['level']
        if lvl == 1: parts.append(f'<h2>{inline(line)}</h2>'); continue
        if lvl == 2: parts.append(f'<h3>{inline(line)}</h3>'); continue
        if lvl == 3: parts.append(f'<h4>{inline(line)}</h4>'); continue
        if re.match(r'^[\-\*\u2022]\s+', line):
            parts.append(f"<p class='bullet'>&#8226; {inline(re.sub(r'^[\-\*\u2022]\s+', '', line))}</p>"); continue
        if re.match(r'^\d+[\.\)]\s+', line):
            parts.append(f"<p class='numbered'>{inline(re.sub(r'^\d+[\.\)]\s+', '', line))}</p>"); continue
        if '|' in line and len(line.split('|')) >= 3:
            cells = [inline(c.strip()) for c in line.split('|')]
            tds = ''.join(f'<td>{c}</td>' for c in cells)
            parts.append(f'<table class="tbl"><tr>{tds}</tr></table>'); continue
        parts.append(f'<p>{inline(line)}</p>')

    fig_n = 0
    for im in images:
        try:
            durl = im.get('dataUrl', '')
            if not durl.startswith('data:'):
                continue
            fig_n += 1
            cap = html.escape((im.get('caption') or '').strip())
            al = (im.get('align') or 'center')
            parts.append(f"<div style='text-align:{al}'><img src='{durl}' style='max-width:100%'/><p class='cap'>Figure {fig_n}: {cap}</p></div>")
        except Exception:
            continue
    if watermark_txt:
        parts.append(f"<p class='watermark'>{watermark_txt}</p>")
    if sig_name:
        parts.append(f"<div class='sig'>________________________________<br/><strong>{sig_name}</strong><br/>{sig_title}</div>")

    header_html = f"<div class='runhead'>{header_txt}</div>" if header_txt else ""
    foot_mid = footer_txt + (" &nbsp;|&nbsp; " if (footer_txt and page_nums) else "")
    footer_html = f"<div class='runfoot'>{foot_mid}" + ("Page <span class='pg'></span>" if page_nums else "") + "</div>"
    page_css = "@page { size: A4; margin: %.2fcm; @bottom-center { content: element(runfoot); } @top-center { content: element(runhead); } }" % margin
    css = f"""{page_css}
body {{ font-family: '{font}', Helvetica, Arial, sans-serif; font-size: {size}pt; line-height: {spacing}; color: #222; }}
p {{ text-align: {align_css}; margin: 6px 0; }}
.doctitle {{ font-size: 24pt; text-align: center; color: {heading}; border-bottom: 3px solid {accent}; padding-bottom: 10px; }}
h2 {{ color: {heading}; font-size: 17pt; margin-top: 18px; border-left: 4px solid {accent}; padding-left: 8px; }}
h3 {{ color: {heading}; font-size: 13pt; }}
h4 {{ color: {heading}; font-size: 11pt; }}
.bullet, .numbered {{ padding-left: 18px; }}
.cover {{ page-break-after: always; text-align: center; padding-top: 180px; }}
.cover-bar {{ width: 60%; margin: 0 auto 18px; height: 6px; background: {accent}; border-radius: 3px; }}
.cover-title {{ font-size: 30pt; color: {heading}; border: none; }}
.cover-name {{ font-size: 15pt; }} .cover-date {{ color: #666; }}
.toc {{ list-style: none; padding: 0; }} .toc-2 {{ padding-left: 16px; }} .toc-3 {{ padding-left: 32px; color: #444; }}
.tbl {{ border-collapse: collapse; width: 100%; margin: 8px 0; }} .tbl td {{ border: 1px solid #999; padding: 5px 8px; }}
.runhead {{ position: running(runhead); text-align: center; font-size: 8pt; color: #666; }}
.runfoot {{ position: running(runfoot); text-align: center; font-size: 8pt; color: #666; }}
.cap {{ font-style: italic; font-size: 9pt; color: #555; text-align: center; }}
.watermark {{ text-align: center; color: #999; font-weight: bold; font-size: 9pt; }}
.sig {{ margin-top: 24px; }}
.pg::after {{ content: counter(page); }}
"""
    doc_html = f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{css}</style></head><body>{header_html}{footer_html}{''.join(parts)}</body></html>"
    HTML(string=doc_html).write_pdf(output_path)
    print(output_path)
except ImportError as e:
    print(f"Error importing dependencies: {e}", file=sys.stderr); sys.exit(1)
except Exception as e:
    print(f"Error generating PDF: {e}", file=sys.stderr); sys.exit(1)
