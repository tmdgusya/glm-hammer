"""pptxx spike: parse sample-slides.md + tokens.json -> sample.pptx (Task 8).

- Applies tokens: surface color as slide background, text color, font family/sizes.
- Image directive slides insert a picture shape (placeholder PNG generated locally).
- diagram block with existing shots raster -> insert raster as picture.
- diagram block without raster -> fallback: title only, description demoted to speaker notes.
"""
import json
import os
import re

from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MD_PATH = os.path.join(HERE, "sample-slides.md")
TOKENS_PATH = os.path.join(HERE, "tokens.json")
OUT_PATH = os.path.join(HERE, "sample.pptx")
IMAGES_DIR = os.path.join(HERE, "images")
# Spike-only: reuse Task 4 capture output as the shots/ directory.
SHOTS_DIR = os.path.join(HERE, "..", "screenshot")

SLIDE_W = Emu(12192000)  # 16:9
SLIDE_H = Emu(6858000)


def load_tokens():
    with open(TOKENS_PATH, encoding="utf-8") as f:
        doc = json.load(f)
    hexv = lambda p: RGBColor.from_string(p["$value"].lstrip("#"))
    px = lambda p: Pt(float(p["$value"].rstrip("px")) * 0.75)  # 1px = 0.75pt
    return {
        "surface": hexv(doc["color"]["surface"]["default"]),
        "text": hexv(doc["color"]["text"]["default"]),
        "accent": hexv(doc["color"]["accent"]["default"]),
        "font": doc["typography"]["font"]["display"]["$value"][0],
        "size_title": px(doc["typography"]["size"]["title"]),
        "size_body": px(doc["typography"]["size"]["body"]),
    }


def ensure_placeholder():
    os.makedirs(IMAGES_DIR, exist_ok=True)
    path = os.path.join(IMAGES_DIR, "placeholder.png")
    Image.new("RGB", (320, 320), "#d97b30").save(path)
    return path


def parse_slides(md_text):
    """Split on standalone --- lines; extract title/body/image/diagram/notes."""
    chunks, cur, in_fence = [], [], False
    for line in md_text.splitlines():
        if line.strip().startswith("```"):
            in_fence = not in_fence
        if line == "---" and not in_fence:
            chunks.append(cur)
            cur = []
        else:
            cur.append(line)
    chunks.append(cur)

    slides = []
    for chunk in chunks:
        s = {"title": None, "body": [], "image": None, "attribution": None,
             "diagram": None, "notes": None}
        i = 0
        while i < len(chunk):
            line = chunk[i]
            if line.startswith("# ") and s["title"] is None:
                s["title"] = line[2:].strip()
            elif line == "```diagram":
                j = i + 1
                block = []
                while j < len(chunk) and chunk[j] != "```":
                    block.append(chunk[j])
                    j += 1
                m = re.match(r"slide:\s*(\d+)", block[0])
                s["diagram"] = {"slide": m.group(1), "text": "\n".join(block[1:]).strip()}
                i = j
            elif line.startswith("> notes:"):
                s["notes"] = line[len("> notes:"):].strip()
            elif line.startswith("> attribution:"):
                s["attribution"] = line[len("> attribution:"):].strip()
            elif line.startswith("!["):
                m = re.match(r"!\[([^\]]*)\]\(([^)]+)\)", line)
                s["image"] = m.group(2)
            elif line.strip():
                s["body"].append(line)
            i += 1
        slides.append(s)
    return slides


def add_text(slide, text, left, top, width, height, size, color, font, bold=False):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    run = p.add_run()
    run.text = text
    run.font.size = size
    run.font.color.rgb = color
    run.font.name = font
    run.font.bold = bold
    return box


def main():
    tk = load_tokens()
    placeholder = ensure_placeholder()
    with open(MD_PATH, encoding="utf-8") as f:
        slides_md = parse_slides(f.read())

    prs = Presentation()
    prs.slide_width, prs.slide_height = SLIDE_W, SLIDE_H
    blank = prs.slide_layouts[6]
    margin = Emu(838200)  # ~0.875in

    for s in slides_md:
        slide = prs.slides.add_slide(blank)
        slide.background.fill.solid()
        slide.background.fill.fore_color.rgb = tk["surface"]

        add_text(slide, s["title"], margin, Emu(600000), SLIDE_W - 2 * margin,
                 Emu(900000), tk["size_title"], tk["text"], tk["font"], bold=True)

        notes = s["notes"]
        y = Emu(1700000)

        if s["diagram"]:
            shot = os.path.join(SHOTS_DIR, f"slide-{s['diagram']['slide']}.png")
            if os.path.exists(shot):
                with Image.open(shot) as im:
                    w, h = im.size
                disp_h = Emu(4200000)
                disp_w = Emu(int(disp_h * w / h))
                slide.shapes.add_picture(shot, Emu(int((SLIDE_W - disp_w) / 2)), y,
                                         disp_w, disp_h)
            else:
                # Fallback: title only in body; demote description to speaker notes.
                demoted = f"[diagram fallback — no raster for slide {s['diagram']['slide']}] " \
                          + s["diagram"]["text"].replace("\n", " ")
                notes = (notes + " " + demoted) if notes else demoted
        elif s["image"]:
            img_path = os.path.join(HERE, s["image"].replace("/", os.sep))
            assert os.path.exists(img_path), f"image missing: {img_path}"
            pic_side = Emu(3600000)
            slide.shapes.add_picture(img_path, margin, y, pic_side, pic_side)
            if s["attribution"]:
                add_text(slide, "attribution: " + s["attribution"],
                         margin, Emu(int(y + pic_side + 200000)), SLIDE_W - 2 * margin,
                         Emu(500000), tk["size_body"], tk["accent"], tk["font"])
            for k, line in enumerate(s["body"]):
                add_text(slide, line, Emu(int(margin + pic_side + 400000)),
                         Emu(int(y + k * 500000)), Emu(5500000), Emu(500000),
                         tk["size_body"], tk["text"], tk["font"])
        else:
            for k, line in enumerate(s["body"]):
                add_text(slide, line, margin, Emu(int(y + k * 550000)),
                         SLIDE_W - 2 * margin, Emu(550000),
                         tk["size_body"], tk["text"], tk["font"])

        if notes:
            slide.notes_slide.notes_text_frame.text = notes

    prs.save(OUT_PATH)
    print(f"wrote {OUT_PATH} ({len(prs.slides.__iter__.__self__._sldIdLst)} slides)")


if __name__ == "__main__":
    main()
