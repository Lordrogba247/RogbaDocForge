#!/usr/bin/env python3
"""Smart DOCX generator v2."""
import sys, json, re, os
sys.path.insert(0, os.path.dirname(__file__))
from smart_format import detect_headings, cleanup_paragraphs, ACADEMIC, THEMES

def add_fmt(p, text):
    parts = re.split(r'(\*\*.*?\*\*|\*.*?\*|__.*?__)', text)
    for part in parts:
        if not part:
            continue
        r = p.add_run()
        if re.match(r'^\*\*.*\*\*$', part):
            r.text = part[2:-2]; r.bold = True
        elif re.match(r'^\*.*\*$', part):
            r.text = part[1:-1]; r.italic = True
        elif re.match(r'^__.*__$', part):
            r.text = part[2:-2]; r.underline = True
        else:
            r.text = part
    return p

try:
    from docx import Document
    from docx.shared import Pt, Cm, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    if len(sys.argv) < 4:
        print("Usage: generate_smart_docx.py <in> <out> <title> [opts]", file=sys.stderr)
        sys.exit(1)
    text_file, output_path = sys.argv[1], sys.argv[2]
    title = sys.argv[3] if len(sys.argv) > 3 else "Document"
    opts = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    with open(text_file, 'r', encoding='utf-8') as f:
        raw = f.read()
    academic = ACADEMIC.get(opts.get('academic', 'none'), ACADEMIC['none'])
    theme = THEMES.get(opts.get('theme', 'modern'), THEMES['modern'])
    font_name = opts.get('font') or academic['font']
    font_size = int(opts.get('fontSize') or academic['size'])
    spacing = float(opts.get('lineSpacing') or academic['spacing'])
    align_opt = opts.get('align', 'left')
    auto_head = opts.get('autoHeadings', True)
    want_toc = opts.get('toc', False)
    want_cover = opts.get('cover', False)
    cover_name = opts.get('coverName', '')
    cover_date = opts.get('coverDate', '')
    header_txt = opts.get('header', '')
    footer_txt = opts.get('footer', '')
    page_nums = opts.get('pageNumbers', True)
    diff_first = opts.get('differentFirstPage', True)
    watermark_txt = opts.get('watermark', '')
    sig_name = opts.get('signatureName', '')
    sig_title = opts.get('signatureTitle', '')
    brand_accent = opts.get('brandAccent', '')
    images = opts.get('images', []) or []
    text = cleanup_paragraphs(raw)
    lines = text.split('\n')
    if auto_head:
        detected = detect_headings(lines)
    else:
        detected = [{'line': x, 'level': 0, 'text': x} for x in lines]
    doc = Document()
    sec = doc.sections[0]
    m = Cm(academic['margin_cm'])
    sec.top_margin = m
    sec.bottom_margin = m
    sec.left_margin = m
    sec.right_margin = m
    sec.different_first_page_header_footer = diff_first
    st = doc.styles['Normal']
    st.font.name = font_name
    st.font.size = Pt(font_size)
    st.paragraph_format.line_spacing = spacing
    st.paragraph_format.space_after = Pt(6)
    accent = RGBColor.from_string(theme['accent'])
    if brand_accent:
        try:
            accent = RGBColor.from_string(brand_accent.lstrip('#'))
        except Exception:
            pass
    if header_txt:
        hp = sec.header.paragraphs[0]
        hp.text = header_txt
        hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if page_nums or footer_txt:
        fp = sec.footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if footer_txt:
            fp.add_run(footer_txt + "  ")
        if page_nums:
            if footer_txt:
                fp.add_run(" | ")
            fp.add_run("Page ")
            run = fp.add_run()
            f1 = OxmlElement('w:fldChar')
            f1.set(qn('w:fldCharType'), 'begin')
            it = OxmlElement('w:instrText')
            it.set(qn('xml:space'), 'preserve')
            it.text = 'PAGE'
            f2 = OxmlElement('w:fldChar')
            f2.set(qn('w:fldCharType'), 'end')
            run._r.append(f1)
            r2 = fp.add_run()
            r2._r.append(it)
            r3 = fp.add_run()
            r3._r.append(f2)
    if want_cover:
        for _ in range(4):
            doc.add_paragraph()
        bar = doc.add_paragraph()
        br = bar.add_run("=" * 28)
        br.bold = True
        br.font.color.rgb = accent
        bar.alignment = WD_ALIGN_PARAGRAPH.CENTER
        h = doc.add_heading(title, level=0)
        h.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if cover_name:
            pn = doc.add_paragraph()
            pn.alignment = WD_ALIGN_PARAGRAPH.CENTER
            pn.add_run(cover_name)
        if cover_date:
            pd = doc.add_paragraph()
            pd.alignment = WD_ALIGN_PARAGRAPH.CENTER
            pd.add_run(cover_date)
        doc.add_page_break()
    else:
        h = doc.add_heading(title, level=0)
        h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if want_toc:
        doc.add_heading("Table of Contents", level=1)
        for d in detected:
            if d['level'] > 0:
                tp = doc.add_paragraph(style='List Bullet')
                ind = "    " * (d['level'] - 1)
                add_fmt(tp, ind + (d.get('text') or d['line']).strip())
        doc.add_paragraph()
    for d in detected:
        line = (d.get('text') or d.get('line') or '').strip()
        if not line:
            continue
        lvl = d['level']
        if lvl == 1:
            hh = doc.add_heading(line, level=1)
            for rr in hh.runs:
                rr.font.color.rgb = accent
            continue
        if lvl == 2:
            doc.add_heading(line, level=2)
            continue
        if lvl == 3:
            doc.add_heading(line, level=3)
            continue
        if re.match(r'^[\-\*\u2022]\s+', line):
            p = doc.add_paragraph(style='List Bullet')
            add_fmt(p, re.sub(r'^[\-\*\u2022]\s+', '', line))
            continue
        if re.match(r'^\d+[\.\)]\s+', line):
            p = doc.add_paragraph(style='List Number')
            add_fmt(p, re.sub(r'^\d+[\.\)]\s+', '', line))
            continue
        p = doc.add_paragraph()
        add_fmt(p, line)
        if align_opt == 'justify':
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        elif align_opt == 'center':
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif align_opt == 'right':
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    # figure/table counters (21, 22)
    fig_n = 0
    # embedded images (21) — NOTE: python-docx detects image type from the
    # file extension, so we must save with the right suffix (.png/.jpg/...).
    import base64
    def _img_ext(durl, raw):
        m = re.match(r'data:image/(\w+)', durl or '')
        if m:
            e = m.group(1).lower()
            if e in ('jpeg', 'jpg', 'png', 'gif', 'bmp', 'tiff', 'webp'):
                return '.jpg' if e == 'jpeg' else '.' + e
        if raw[:8].startswith(b'\x89PNG'):
            return '.png'
        if raw[:3] == b'\xff\xd8\xff':
            return '.jpg'
        if raw[:6] in (b'GIF87a', b'GIF89a'):
            return '.gif'
        if raw[:2] == b'BM':
            return '.bmp'
        return '.png'
    for im in images:
        try:
            durl = im.get('dataUrl', '')
            b64 = durl.split(',', 1)[1] if ',' in durl else durl
            raw = base64.b64decode(b64)
            if len(raw) > 4 * 1024 * 1024:
                continue
            ipath = os.path.join(os.path.dirname(output_path), 'img_%s%s' % (os.urandom(4).hex(), _img_ext(durl, raw)))
            with open(ipath, 'wb') as f:
                f.write(raw)
            fig_n += 1
            pp = doc.add_paragraph()
            al = (im.get('align') or 'center').lower()
            if al == 'left':
                pp.alignment = WD_ALIGN_PARAGRAPH.LEFT
            elif al == 'right':
                pp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            else:
                pp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            try:
                pp.add_run().add_picture(ipath, width=Cm(float(im.get('widthCm') or 12)))
            except Exception:
                try:
                    pp.add_run().add_picture(ipath)
                except Exception:
                    pass
            cap = (im.get('caption') or '').strip()
            cp = doc.add_paragraph()
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            cr = cp.add_run('Figure %d: %s' % (fig_n, cap if cap else ''))
            cr.italic = True
            cr.font.size = Pt(9)
            try:
                os.remove(ipath)
            except Exception:
                pass
        except Exception:
            continue
    if watermark_txt:
        wp = doc.add_paragraph()
        wp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        wr = wp.add_run(watermark_txt)
        wr.bold = True
        wr.font.size = Pt(9)
        try:
            wr.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
        except Exception:
            pass
    if sig_name:
        doc.add_paragraph()
        sp = doc.add_paragraph()
        sr = sp.add_run('_' * 32)
        np = doc.add_paragraph()
        nr = np.add_run(sig_name)
        nr.bold = True
        if sig_title:
            tp2 = doc.add_paragraph()
            tp2.add_run(sig_title)
    doc.save(output_path)
    print(output_path)
except ImportError as e:
    print("import error", file=sys.stderr)
    print(str(e), file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print("generate error: " + str(e), file=sys.stderr)
    sys.exit(1)
