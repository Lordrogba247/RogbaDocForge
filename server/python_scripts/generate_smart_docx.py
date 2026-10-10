#!/usr/bin/env python3
"""Smart DOCX generator: templates + headings + TOC + header/footer + cover."""
import sys, json, re, os
sys.path.insert(0, os.path.dirname(__file__))
from smart_format import detect_headings, cleanup_paragraphs, ACADEMIC, THEMES

def add_fmt(p, text):
    parts = re.split(r'(\*\*.*?\*\*|\*.*?\*|__.*?__)', text)
    for part in parts:
        if not part: continue
        r = p.add_run()
        if re.match(r'^\*\*.*\*\*$', part): r.text = part[2:-2]; r.bold = True
        elif re.match(r'^\*.*\*$', part): r.text = part[1:-1]; r.italic = True
        elif re.match(r'^__.*__$', part): r.text = part[2:-2]; r.underline = True
        else: r.text = part
    return p

try:
    from docx import Document
    from docx.shared import Pt, Cm, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    if len(sys.argv) < 4:
        print("Usage: generate_smart_docx.py <input> <output> <title> [options_json]", file=sys.stderr); sys.exit(1)
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
    cover_style = opts.get('coverStyle', 'modern')
    header_txt = opts.get('header', '')
    footer_txt = opts.get('footer', '')
    page_nums = opts.get('pageNumbers', True)
    diff_first = opts.get('differentFirstPage', True)

    text = cleanup_paragraphs(raw)
    lines = text.split('\n')
    detected = detect_headings(lines) if auto_head else [{'line': l, 'level': 0, 'text': l} for l in lines]

    doc = Document()
    sec = doc.sections[0]
    m = Cm(academic['margin_cm'])
    sec.top_margin = m; sec.bottom_margin = m; sec.left_margin = m; sec.right_margin = m
    sec.different_first_page_header_footer = diff_first
    st = doc.styles['Normal']
    st.font.name = font_name; st.font.size = Pt(font_size)
    st.paragraph_format.line_spacing = spacing
    st.paragraph_format.space_after = Pt(6)

    def set_align(p):
        if align_opt == 'justify': p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        elif align_opt == 'center': p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        elif align_opt == 'right': p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

    def add_page_number(par):
        run = par.add_run()
        f1 = OxmlElement('w:fldChar'); f1.set(qn('w:fldCharType'), 'begin')
        it = OxmlElement('w:instrText'); it.set(qn('xml:space'), 'preserve'); it.text = 'PAGE'
        f2 = OxmlElement('w:fldChar'); f2.set(qn('w:fldCharType'), 'end')
        run._r.append(f1); run2 = par.add_run(); run2._r.append(it); run3 = par.add_run(); run3._r.append(f2)

    if want_cover:
        cover_end = True
    else:
        h = doc.add_heading(title, level=0); h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if want_toc:
        doc.add_heading("Table of Contents", level=1)
        for d in detected:
            if d['level'] > 0:
                tp = doc.add_paragraph(style='List Bullet')
                indent = "    " * (d['level'] - 1)
                add_fmt(tp, indent + (d.get('text') or d['line']).strip())
        doc.add_paragraph()
    for d in detected:
        line = (d.get('text') or d.get('line') or '').strip()
        if not line: continue
        lvl = d['level']
        if lvl == 1:
            hh = doc.add_heading(line, level=1)
            for r in hh.runs: r.font.color.rgb = accent
            continue
        if lvl == 2:
            doc.add_heading(line, level=2); continue
        if lvl == 3:
            doc.add_heading(line, level=3); continue
        if re.match(r'^[\-\*\u2022]\s+', line):
            p = doc.add_paragraph(style='List Bullet')
            add_fmt(p, re.sub(r'^[\-\*\u2022]\s+', '', line)); set_align(p); continue
        if re.match(r'^\d+[\.\)]\s+', line):
            p = doc.add_paragraph(style='List Number')
            add_fmt(p, re.sub(r'^\d+[\.\)]\s+', '', line)); set_align(p); continue
        if '|' in line and len(line.split('|')) >= 3:
            cells = [c.strip() for c in line.split('|')]
            tbl = doc.add_table(rows=1, cols=len(cells)); tbl.style = 'Light Grid Accent 1'
            for j, c in enumerate(cells): tbl.rows[0].cells[j].text = c
            doc.add_paragraph(); continue
        p = doc.add_paragraph(); add_fmt(p, line); set_align(p)
    doc.save(output_path)
    print(output_path)
except ImportError as e:
    print(f"Error importing dependencies: {e}", file=sys.stderr); sys.exit(1)
except Exception as e:
    print(f"Error generating Word document: {e}", file=sys.stderr); sys.exit(1)

    if header_txt:
        hp = sec.header.paragraphs[0]; hp.text = header_txt
        hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if page_nums or footer_txt:
        fp = sec.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if footer_txt: fp.add_run(footer_txt + "  ")
        if page_nums:
            if footer_txt: fp.add_run(" | ")
            fp.add_run("Page "); add_page_number(fp)

    accent = RGBColor.from_string(theme['accent'])
    if want_cover:
        for _ in range(4): doc.add_paragraph()
        bar = doc.add_paragraph(); br = bar.add_run("━" * 28); br.bold = True; br.font.color.rgb = accent; br.font.size = Pt(14)
        bar.alignment = WD_ALIGN_PARAGRAPH.CENTER
        h = doc.add_heading(title, level=0); h.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if cover_name:
            pn = doc.add_paragraph(); pn.alignment = WD_ALIGN_PARAGRAPH.CENTER
            rn = pn.add_run(cover_name); rn.font.size = Pt(14)
        if cover_date:
            pd = doc.add_paragraph(); pd.alignment = WD_ALIGN_PARAGRAPH.CENTER
            rd = pd.add_run(cover_date); rd.font.size = Pt(11); rd.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
        doc.add_page_break()
