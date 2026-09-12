#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HTML -> DOCX 转换器（黑体为主，支持标题/表格/图片/列表/代码块）
用法: python html2docx.py input.html output.docx
"""
import sys, re, os
from html.parser import HTMLParser
from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

FONT = "黑体"  # 主字体

def set_run_font(run, size=10.5, bold=False, color=None, mono=False):
    run.font.name = FONT
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)
    # 设置 eastAsia 字体
    r = run._element
    rPr = r.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:ascii'), 'Consolas' if mono else FONT)
    rFonts.set(qn('w:hAnsi'), 'Consolas' if mono else FONT)
    rFonts.set(qn('w:eastAsia'), FONT)
    rFonts.set(qn('w:cs'), FONT)

def set_cell_shading(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

class DocBuilder:
    def __init__(self):
        self.doc = Document()
        # 设置默认字体
        style = self.doc.styles['Normal']
        style.font.name = FONT
        style.font.size = Pt(10.5)
        style.element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
        # 页面边距
        for sec in self.doc.sections:
            sec.top_margin = Cm(2.54)
            sec.bottom_margin = Cm(2.54)
            sec.left_margin = Cm(2.8)
            sec.right_margin = Cm(2.8)

    def heading(self, text, level):
        sizes = {1: 22, 2: 16, 3: 13, 4: 11.5}
        p = self.doc.add_paragraph()
        p.space_before = Pt(12 if level <= 2 else 8)
        p.space_after = Pt(6)
        run = p.add_run(text)
        set_run_font(run, size=sizes.get(level, 11), bold=True)
        if level == 1:
            run.font.color.rgb = RGBColor(0x1a, 0x22, 0x33)
        elif level == 2:
            run.font.color.rgb = RGBColor(0x0e, 0x6e, 0xf6)
        elif level == 3:
            run.font.color.rgb = RGBColor(0x08, 0x91, 0xb2)
        return p

    def para(self, text, bold=False, size=10.5, color=None, align=None, space_after=4):
        p = self.doc.add_paragraph()
        run = p.add_run(text)
        set_run_font(run, size=size, bold=bold, color=color)
        if align == 'center':
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(space_after)
        return p

    def bullet(self, text, level=0):
        p = self.doc.add_paragraph(style='List Bullet' if level == 0 else 'List Bullet 2')
        run = p.add_run(text)
        set_run_font(run, size=10.5)
        return p

    def number(self, text):
        p = self.doc.add_paragraph(style='List Number')
        run = p.add_run(text)
        set_run_font(run, size=10.5)
        return p

    def table(self, rows, header=True, widths=None):
        if not rows:
            return
        # 展开 colspan 计算总列数
        ncol = max(sum(c[1] if isinstance(c, tuple) else 1 for c in r) for r in rows)
        if ncol == 0:
            ncol = max(len(r) for r in rows)
        t = self.doc.add_table(rows=len(rows), cols=ncol)
        t.style = 'Table Grid'
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for i, row in enumerate(rows):
            col_idx = 0
            for c in row:
                if isinstance(c, tuple):
                    txt, span = c
                else:
                    txt, span = c, 1
                is_header = header and i == 0
                if span > 1:
                    # 合并单元格：先合并，再统一写文字
                    end_idx = min(col_idx + span - 1, ncol - 1)
                    merged = t.cell(i, col_idx).merge(t.cell(i, end_idx))
                    mp = merged.paragraphs[0]
                    mr = mp.add_run(txt)
                    set_run_font(mr, size=9.5, bold=is_header)
                    if is_header:
                        set_cell_shading(merged, 'E8F0FE')
                    tcPr = merged._tc.get_or_add_tcPr()
                    vAlign = OxmlElement('w:vAlign')
                    vAlign.set(qn('w:val'), 'center')
                    tcPr.append(vAlign)
                else:
                    cell = t.cell(i, col_idx)
                    cell.text = ''
                    p = cell.paragraphs[0]
                    run = p.add_run(txt)
                    set_run_font(run, size=9.5, bold=is_header)
                    if is_header:
                        set_cell_shading(cell, 'E8F0FE')
                    tcPr = cell._tc.get_or_add_tcPr()
                    vAlign = OxmlElement('w:vAlign')
                    vAlign.set(qn('w:val'), 'center')
                    tcPr.append(vAlign)
                col_idx += span
        return t

    def image(self, path, width_inches=6.0):
        if os.path.exists(path):
            self.doc.add_picture(path, width=Inches(width_inches))
            self.doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
        else:
            self.para(f'[图片缺失: {path}]', color=(0xdc, 0x26, 0x26))

    def code(self, text):
        for line in text.split('\n'):
            p = self.doc.add_paragraph()
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(line)
            set_run_font(run, size=8.5, mono=True)

    def page_break(self):
        self.doc.add_page_break()

    def save(self, path):
        self.doc.save(path)
        return path


class HtmlToDocxParser(HTMLParser):
    def __init__(self, base_dir):
        super().__init__()
        self.builder = DocBuilder()
        self.base_dir = base_dir
        self.stack = []          # 标签栈
        self.cur_text = []       # 当前文本缓冲
        self.cur_cell = []       # 表格行缓冲
        self.in_table = False
        self.in_code = False
        self.code_buf = []
        self.table_rows = []
        self.cur_row = []
        self.in_cell = False
        self.cell_buf = []
        self.list_depth = 0

    def _flush_text(self):
        if self.cur_text:
            txt = ''.join(self.cur_text).strip()
            self.cur_text = []
            if txt:
                return txt
        return None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('h1', 'h2', 'h3', 'h4'):
            self.stack.append(tag)
        elif tag == 'p':
            self.stack.append('p')
        elif tag == 'table':
            self.in_table = True
            self.table_rows = []
        elif tag == 'tr':
            self.cur_row = []
        elif tag in ('td', 'th'):
            self.in_cell = True
            self.cell_buf = []
            self.cur_span = int(attrs.get('colspan', 1))
        elif tag == 'img':
            src = attrs.get('src', '')
            if src:
                # 相对路径解析为绝对路径
                if not os.path.isabs(src):
                    src = os.path.normpath(os.path.join(self.base_dir, src))
                # 图片宽度统一 6 英寸（适配 A4 页宽）
                self.builder.image(src, width_inches=5.8)
        elif tag == 'pre':
            self.in_code = True
            self.code_buf = []
        elif tag == 'li':
            self.stack.append('li')
        elif tag == 'br':
            self.cur_text.append('\n')

    def handle_endtag(self, tag):
        if tag in ('h1', 'h2', 'h3', 'h4'):
            txt = self._flush_text()
            if txt:
                level = int(tag[1])
                self.builder.heading(txt, level)
        elif tag == 'p':
            txt = self._flush_text()
            if txt:
                self.builder.para(txt)
        elif tag == 'li':
            txt = self._flush_text()
            if txt:
                if self.list_depth == 0:
                    self.builder.bullet(txt)
                else:
                    self.builder.bullet(txt, level=1)
        elif tag == 'td' or tag == 'th':
            self.in_cell = False
            txt = ''.join(self.cell_buf).strip()
            self.cell_buf = []
            span = getattr(self, 'cur_span', 1)
            self.cur_row.append((txt, span))  # (文本, colspan)
            self.cur_span = 1
        elif tag == 'tr':
            self.table_rows.append(self.cur_row)
        elif tag == 'table':
            self.in_table = False
            self.builder.table(self.table_rows)
        elif tag == 'pre':
            self.in_code = False
            self.builder.code(''.join(self.code_buf))

    def handle_data(self, data):
        if self.in_code:
            self.code_buf.append(data)
        elif self.in_cell:
            self.cell_buf.append(data)
        else:
            self.cur_text.append(data)


def convert(html_path, output_path, base_dir=None):
    if base_dir is None:
        base_dir = os.path.dirname(os.path.abspath(html_path))
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    # 移除 style 和 script
    html = re.sub(r'<style[\s\S]*?</style>', '', html)
    html = re.sub(r'<script[\s\S]*?</script>', '', html)
    parser = HtmlToDocxParser(base_dir)
    parser.feed(html)
    parser.builder.save(output_path)
    return output_path


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('用法: python html2docx.py input.html output.docx')
        sys.exit(1)
    out = convert(sys.argv[1], sys.argv[2])
    print(f'OK -> {out}')
