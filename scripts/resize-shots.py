#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""统一截图尺寸为 800x600，等比缩放 + 白底居中，不裁切不变形"""
from PIL import Image
import os, glob

TARGET = (800, 600)

def resize_to_800x600(src, dst):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    # 等比缩放适配 800x600
    scale = min(TARGET[0] / w, TARGET[1] / h)
    nw, nh = int(w * scale), int(h * scale)
    im2 = im.resize((nw, nh), Image.LANCZOS)
    # 白底画布居中
    canvas = Image.new('RGB', TARGET, (255, 255, 255))
    x = (TARGET[0] - nw) // 2
    y = (TARGET[1] - nh) // 2
    canvas.paste(im2, (x, y))
    canvas.save(dst, quality=90)
    return (w, h), (nw, nh)

def main():
    out_dir = 'docs/output/images800'
    os.makedirs(out_dir, exist_ok=True)

    # 1) 新截图 shots/
    src_dirs = ['docs/output/shots', 'docs/output/stage2/images']
    count = 0
    for d in src_dirs:
        if not os.path.isdir(d):
            continue
        for f in sorted(glob.glob(d + '/*')):
            ext = os.path.splitext(f)[1].lower()
            if ext not in ('.png', '.jpg', '.jpeg'):
                continue
            base = os.path.splitext(os.path.basename(f))[0]
            # 跳过 verify- 前缀的临时验证图
            if base.startswith('verify-'):
                continue
            dst = os.path.join(out_dir, base + '.jpg')
            orig, new = resize_to_800x600(f, dst)
            print(f'{base}: {orig} -> 800x600 (内容 {new})')
            count += 1
    print(f'\n共处理 {count} 张截图 -> {out_dir}')

if __name__ == '__main__':
    main()
