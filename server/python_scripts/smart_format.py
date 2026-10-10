#!/usr/bin/env python3
"""Shared smart-formatting helpers mirrored from shared/smartFormat.js."""
import re

def is_all_caps_heading(line):
    letters = re.sub(r'[^A-Za-z]', '', line)
    if len(letters) < 3 or len(line) > 90:
        return False
    if letters != letters.upper():
        return False
    return len(line.split()) <= 12

def numbered_level(line):
    m = re.match(r'^(\d+(?:\.\d+){0,3})[\.\)\:\-]\s+\S', line)
    if not m:
        return 0
    return len(m.group(1).split('.'))

def detect_headings(lines):
    out = []
    for idx, raw in enumerate(lines):
        line = (raw or '').strip()
        if not line:
            out.append({'line': raw, 'level': 0, 'reason': 'blank', 'text': ''})
            continue
        if re.match(r'^#{1,3}\s+\S', line):
            lvl = 3 if line.startswith('### ') else (2 if line.startswith('## ') else 1)
            out.append({'line': line, 'level': lvl, 'reason': 'markdown',
                        'text': re.sub(r'^#{1,3}\s+', '', line)})
            continue
        nl = numbered_level(line)
        if nl == 1 and len(line) < 100:
            out.append({'line': line, 'level': 1, 'reason': 'numbered', 'text': line}); continue
        if nl == 2:
            out.append({'line': line, 'level': 2, 'reason': 'numbered', 'text': line}); continue
        if nl >= 3:
            out.append({'line': line, 'level': 3, 'reason': 'numbered', 'text': line}); continue
        if is_all_caps_heading(line):
            out.append({'line': line, 'level': 1 if len(line) < 40 else 2, 'reason': 'all-caps', 'text': line}); continue
        if re.search(r':\s*$', line) and len(line) < 80:
            out.append({'line': line, 'level': 2, 'reason': 'colon', 'text': re.sub(r':\s*$', '', line)}); continue
        prev_blank = idx == 0 or not (lines[idx-1] or '').strip()
        next_blank = idx == len(lines)-1 or not (lines[idx+1] or '').strip()
        if prev_blank and next_blank and len(line) < 60 and not re.search(r'[.!?]$', line):
            out.append({'line': line, 'level': 2, 'reason': 'standalone', 'text': line}); continue
        if idx < 3 and prev_blank and len(line) < 90 and not re.search(r'[.!?]$', line):
            out.append({'line': line, 'level': 1, 'reason': 'title', 'text': line}); continue
        out.append({'line': raw, 'level': 0, 'reason': 'body', 'text': line})
    return out

def cleanup_paragraphs(text):
    if not text:
        return ''
    t = text.replace('\r\n', '\n').replace('\r', '\n')
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r' +\n', '\n', t)
    t = re.sub(r'\n{3,}', '\n\n', t)
    t = re.sub(r'-\n(?=[a-z])', '', t)
    t = re.sub(r'\s+([,.!?;:])', r'\1', t)
    return t.strip()

ACADEMIC = {
    'none': {'font': 'Calibri', 'size': 11, 'spacing': 1.15, 'margin_cm': 2.0},
    'apa': {'font': 'Times New Roman', 'size': 12, 'spacing': 2.0, 'margin_cm': 2.54},
    'mla': {'font': 'Times New Roman', 'size': 12, 'spacing': 2.0, 'margin_cm': 2.54},
    'harvard': {'font': 'Arial', 'size': 11, 'spacing': 1.5, 'margin_cm': 2.54},
}
THEMES = {
    'modern': {'accent': '6D28D9', 'heading': '1E1B4B'},
    'classic': {'accent': '7C2D12', 'heading': '111827'},
    'minimal': {'accent': '111827', 'heading': '111827'},
    'corporate': {'accent': '0F3460', 'heading': '0F3460'},
}
