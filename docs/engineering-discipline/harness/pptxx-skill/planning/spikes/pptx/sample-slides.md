# Opening Slide

pptxx md-to-pptx spike deck. This slide exercises title, body paragraph, and nested bullets.

- First-level bullet
  - Second-level bullet (max nesting depth)
- Another first-level bullet

> notes: Opening slide speaker note — plain title/body path.

---

# Image Slide

A locally generated placeholder image with its attribution directive.

![amber placeholder square](images/placeholder.png)
> attribution: pptxx spike generator | cc0 | https://example.org/pptxx-spike/placeholder

---

# Diagram With Shot

```diagram
slide: 01
Circle glyph over dark surface — raster reuse path. The exporter must insert
shots/slide-01.png (spike reuses the Task 4 capture) as a picture shape.
```

> notes: Diagram-with-shot slide — raster available, picture inserted.

---

# Diagram Without Shot

```diagram
slide: 99
No raster exists for slide 99. The exporter must fall back: keep only the
title in the slide body and demote this description into the speaker notes.
```
