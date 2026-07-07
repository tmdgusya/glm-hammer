"""pptxx spike readback + M5 two-run acceptance fixture.

Two harnesses in one runtime-only driver (NOT wired into tests/gates.test.js —
the Node suite stays zero-dependency and never invokes python):

1. Original M1 spike readback (if `sample.pptx` is present): reopen it and assert
   every slide's first textbox title matches `sample-slides.md`, the image and
   diagram-with-shot slides carry a picture, and the fallback slide has none.

2. M5 two-run acceptance for `skills/pptxx/scripts/md2pptx.py` (plan Task 2):
   stage an M4-era deck in a tempfile.mkdtemp() directory — never under
   docs/glm-hammer/decks/ (that would arm this repo's own deck-gate) — then
     run (a): shots/slide-01.png present -> diagram slide has exactly 1 picture.
     run (b): shots/ removed             -> diagram slide has 0 pictures + non-empty notes.
   Both runs assert all titles match slides.md and md2pptx.py exits 0. Every
   generated binary (image, shot PNG, pptx) lives in the tempdir and is removed.

Run: `python readback.py`
"""
import os
import shutil
import subprocess
import sys
import tempfile

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MD_PATH = os.path.join(HERE, "sample-slides.md")
PPTX_PATH = os.path.join(HERE, "sample.pptx")


def find_md2pptx():
    d = HERE
    while True:
        cand = os.path.join(d, "skills", "pptxx", "scripts", "md2pptx.py")
        if os.path.isfile(cand):
            return cand
        parent = os.path.dirname(d)
        if parent == d:
            raise SystemExit("could not locate skills/pptxx/scripts/md2pptx.py above " + HERE)
        d = parent


def md_titles(md_path):
    titles, in_fence = [], False
    with open(md_path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if line.strip().startswith("```"):
                in_fence = not in_fence
            if not in_fence and line.startswith("# "):
                titles.append(line[2:].strip())
    return titles


def slide_title(slide):
    for shape in slide.shapes:
        if shape.has_text_frame and shape.text_frame.text.strip():
            return shape.text_frame.text.strip()
    return None


def picture_count(slide):
    return sum(1 for sh in slide.shapes if sh.shape_type == MSO_SHAPE_TYPE.PICTURE)


# --------------------------------------------------------------------------- #
# 1. Original M1 spike readback (sample.pptx)                                  #
# --------------------------------------------------------------------------- #
def readback_sample():
    if not os.path.exists(PPTX_PATH):
        print("sample.pptx absent — skipping M1 spike readback")
        return
    expected = md_titles(MD_PATH)
    prs = Presentation(PPTX_PATH)
    actual = [slide_title(s) for s in prs.slides]

    assert len(actual) == len(expected), \
        f"slide count mismatch: pptx={len(actual)} md={len(expected)}"
    for i, (a, e) in enumerate(zip(actual, expected), 1):
        assert a == e, f"slide {i} title mismatch: pptx={a!r} md={e!r}"
        print(f"slide {i}: title OK ({a!r})")

    img_idx = expected.index("Image Slide")
    n_pics = picture_count(prs.slides[img_idx])
    assert n_pics > 0, "image slide has no picture shapes"
    print(f"image slide: {n_pics} picture shape(s) OK")

    shot_idx = expected.index("Diagram With Shot")
    assert picture_count(prs.slides[shot_idx]) > 0, "diagram-with-shot slide has no picture"
    print("diagram-with-shot slide: picture OK")

    fb_idx = expected.index("Diagram Without Shot")
    assert picture_count(prs.slides[fb_idx]) == 0, "fallback slide should have no picture"
    fb_notes = prs.slides[fb_idx].notes_slide.notes_text_frame.text
    assert "diagram fallback" in fb_notes, "fallback slide notes missing demoted description"
    print("diagram-without-shot slide: fallback (no picture, notes demotion) OK")
    print("READBACK PASS")


# --------------------------------------------------------------------------- #
# 2. M5 two-run acceptance fixture (md2pptx.py)                                #
# --------------------------------------------------------------------------- #
MD2PPTX = find_md2pptx()
DIAGRAM_TITLE = "Diagram Slide"

SLIDES_MD = """# Opening Slide

M5 md-to-pptx fixture deck. Title, body paragraph, and nested bullets.

- First-level bullet
  - Second-level bullet (max nesting depth)
- Another first-level bullet

> notes: Opening slide speaker note — plain title/body path.

---

# Image Slide

A locally generated placeholder image with its attribution directive.

![amber placeholder square](images/placeholder.png)
> attribution: m5 fixture generator | cc0 | https://example.org/pptxx/m5-placeholder

---

# Diagram Slide

```diagram
slide: 01
Circle glyph over dark surface — raster reuse path. The exporter must insert
shots/slide-01.png as a picture shape, or fall back to notes if it is absent.
```

> notes: Diagram slide speaker note.
"""


def stage_deck(deck):
    os.makedirs(os.path.join(deck, "images"), exist_ok=True)
    with open(os.path.join(deck, "slides.md"), "w", encoding="utf-8") as f:
        f.write(SLIDES_MD)
    Image.new("RGB", (320, 320), "#d97b30").save(os.path.join(deck, "images", "placeholder.png"))


def make_shot(deck):
    shots = os.path.join(deck, "shots")
    os.makedirs(shots, exist_ok=True)
    Image.new("RGB", (640, 480), "#1a1410").save(os.path.join(shots, "slide-01.png"))


def run_converter(deck):
    r = subprocess.run([sys.executable, MD2PPTX, deck], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("md2pptx exited {}: {}".format(r.returncode, r.stderr))
    print("  md2pptx: " + r.stdout.strip())
    return os.path.join(deck, os.path.basename(os.path.normpath(deck)) + ".pptx")


def assert_titles(prs, expected, label):
    actual = [slide_title(s) for s in prs.slides]
    assert len(actual) == len(expected), \
        "{}: slide count {} != md {}".format(label, len(actual), len(expected))
    for i, (a, e) in enumerate(zip(actual, expected), 1):
        assert a == e, "{}: slide {} title {!r} != {!r}".format(label, i, a, e)


def two_run_fixture():
    deck = tempfile.mkdtemp(prefix="m5-deck-")
    try:
        stage_deck(deck)
        expected = md_titles(os.path.join(deck, "slides.md"))

        print("run (a): shots present")
        make_shot(deck)
        prs = Presentation(run_converter(deck))
        assert_titles(prs, expected, "run(a)")
        di = expected.index(DIAGRAM_TITLE)
        n = picture_count(prs.slides[di])
        assert n == 1, "run(a): diagram slide picture count {} != 1".format(n)
        print("  OK: all titles match, diagram slide pictures == 1")

        print("run (b): shots absent")
        shutil.rmtree(os.path.join(deck, "shots"), ignore_errors=True)
        prs = Presentation(run_converter(deck))
        assert_titles(prs, expected, "run(b)")
        n = picture_count(prs.slides[di])
        assert n == 0, "run(b): diagram slide picture count {} != 0".format(n)
        notes = prs.slides[di].notes_slide.notes_text_frame.text.strip()
        assert notes, "run(b): diagram slide has empty speaker notes"
        print("  OK: all titles match, diagram slide pictures == 0, notes non-empty")

        print("M5 FIXTURE PASS")
    finally:
        shutil.rmtree(deck, ignore_errors=True)


def main():
    readback_sample()
    two_run_fixture()


if __name__ == "__main__":
    main()
    sys.exit(0)
