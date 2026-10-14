import os, cairosvg
from PIL import Image

NAVY, NAVY2, INK = "#0d1b3e", "#1a2d5c", "#e9eef8"
WAYS = {"gold": "#c8a82c", "cyan": "#22d3ee"}

HAT = """
  <path d="M74 250 Q256 222 438 250 Q450 274 404 282 Q256 302 108 282 Q62 274 74 250 Z" fill="{a}"/>
  <path d="M172 252 L190 132 Q195 104 224 108 Q256 124 288 108 Q317 104 322 132 L340 252 Z" fill="{a}"/>
  <path d="M178 212 L334 212 L340 252 L172 252 Z" fill="{band}"/>
"""
PROMPT = """
  <polyline points="180,338 236,374 180,410" fill="none" stroke="{ink}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="268" y1="410" x2="338" y2="410" stroke="{a}" stroke-width="30" stroke-linecap="round"/>
"""

def app_svg(a):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{NAVY2}"/><stop offset="1" stop-color="{NAVY}"/></linearGradient></defs>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#g)"/>
  <rect x="16.5" y="16.5" width="479" height="479" rx="107.5" fill="none" stroke="{a}" stroke-opacity=".35"/>
  <g transform="rotate(-8 256 200)">{HAT.format(a=a, band=NAVY)}</g>{PROMPT.format(a=a, ink=INK)}
</svg>"""

# Simplified for 16-32px: hat only, larger, no prompt detail
def small_svg(a):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect x="0" y="0" width="512" height="512" rx="110" fill="{NAVY}"/>
  <g transform="translate(-50 -40) scale(1.2) rotate(-8 256 200)">{HAT.format(a=a, band=NAVY)}</g>
  <line x1="196" y1="420" x2="316" y2="420" stroke="{INK}" stroke-width="44" stroke-linecap="round"/>
</svg>"""

# Monochrome tray / symbolic icon (Linux panels recolour these)
def tray_svg(colour):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <g transform="translate(-50 -60) scale(1.2) rotate(-8 256 200)">{HAT.format(a=colour, band='none')}</g>
  <path d="M192 236 L364 236" stroke="none"/>
  <line x1="196" y1="420" x2="316" y2="420" stroke="{colour}" stroke-width="48" stroke-linecap="round"/>
</svg>"""

def wordmark_svg(a, ink):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300">
  <g transform="translate(20 22) scale(0.5)">{app_svg(a).split('>',1)[1].rsplit('</svg>',1)[0]}</g>
  <text x="310" y="190" font-family="Inter, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="150" font-weight="700" fill="{ink}" letter-spacing="-3">hat<tspan fill="{a}">term</tspan></text>
</svg>"""

def png(svg, path, size):
    cairosvg.svg2png(bytestring=svg.encode(), write_to=path, output_width=size, output_height=size)

for name, a in WAYS.items():
    d = f"out/{name}"
    for sub in ("png", "linux", "tray", "svg"):
        os.makedirs(f"{d}/{sub}", exist_ok=True)
    big, small = app_svg(a), small_svg(a)
    open(f"{d}/svg/appicon.svg", "w").write(big)
    open(f"{d}/svg/appicon-small.svg", "w").write(small)
    open(f"{d}/svg/tray-light.svg", "w").write(tray_svg("#ffffff"))
    open(f"{d}/svg/tray-dark.svg", "w").write(tray_svg(NAVY))
    open(f"{d}/svg/wordmark-on-dark.svg", "w").write(wordmark_svg(a, "#ffffff"))
    open(f"{d}/svg/wordmark-on-light.svg", "w").write(wordmark_svg(a, NAVY))

    sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
    for s in sizes:
        src = small if s <= 32 else big
        png(src, f"{d}/png/icon-{s}.png", s)
        png(src, f"{d}/linux/{s}x{s}.png", s)
    png(big, f"{d}/appicon.png", 1024)
    for t in ("light", "dark"):
        png(tray_svg("#ffffff" if t == "light" else NAVY), f"{d}/tray/tray-{t}.png", 32)
        png(tray_svg("#ffffff" if t == "light" else NAVY), f"{d}/tray/tray-{t}@2x.png", 64)
    cairosvg.svg2png(bytestring=wordmark_svg(a, "#ffffff").encode(), write_to=f"{d}/wordmark-on-dark.png", output_width=1200)
    cairosvg.svg2png(bytestring=wordmark_svg(a, NAVY).encode(), write_to=f"{d}/wordmark-on-light.png", output_width=1200)

    imgs = {s: Image.open(f"{d}/png/icon-{s}.png").convert("RGBA") for s in sizes}
    imgs[256].save(f"{d}/appicon.ico", sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)],
                   append_images=[imgs[s] for s in (16, 24, 32, 48, 64, 128)])
    imgs[1024].save(f"{d}/appicon.icns")
print("done")
