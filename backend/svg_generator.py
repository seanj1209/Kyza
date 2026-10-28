def build_3ss_svg(params):
    width = params["width_mm"]
    height = params["height_mm"]
    seal = params["seal_mm"]
    end_seal = params["end_seal_mm"]
    safe = params["safe_zone_mm"]

    # Bleed: 40mm margin around entire cutter
    bleed = 40  

    # Canvas size
    svg_w = width + (bleed * 2)
    svg_h = height + (bleed * 2)

    # Cutter rectangle (outermost)
    cutter_x = bleed
    cutter_y = bleed

    # Substrate rectangle (area inside cutter)
    substrate_x = cutter_x
    substrate_y = cutter_y
    substrate_w = width
    substrate_h = height

    # Safe zone inset
    safe_x = cutter_x + safe
    safe_y = cutter_y + safe
    safe_w = width - (safe * 2)
    safe_h = height - (safe * 2)

    svg = f'''
<svg xmlns="http://www.w3.org/2000/svg" 
     width="{svg_w}mm" height="{svg_h}mm" 
     viewBox="0 0 {svg_w} {svg_h}">

    <!-- White bleed area -->
    <rect x="0" y="0" width="{svg_w}" height="{svg_h}" fill="white" />

    <!-- Substrate area -->
    <rect x="{substrate_x}" y="{substrate_y}" 
          width="{substrate_w}" height="{substrate_h}" 
          fill="#d4f6f8" />

    <!-- Cutter line (green, 0.75mm stroke) -->
    <rect x="{cutter_x}" y="{cutter_y}"
          width="{width}" height="{height}"
          fill="none"
          stroke="#2eb774" 
          stroke-width="0.75" />

    <!-- Safe zone (pink dashed 2.5mm dash / 1.25mm gap) -->
    <rect x="{safe_x}" y="{safe_y}"
          width="{safe_w}" height="{safe_h}"
          fill="none"
          stroke="#fca1d0"
          stroke-width="0.75"
          stroke-dasharray="2.5 1.25" />

</svg>
'''
    return svg
