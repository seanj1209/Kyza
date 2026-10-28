// Presentation artwork adapted from the supplied Studio Pack Carousel.html.
// Illustrations are not cutter geometry; engine modules remain authoritative.
export const PACK_GRADIENTS = `<svg class="studio-pack-gradients" width="0" height="0" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="klyro-pack-gFilm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFBF6"/><stop offset=".55" stop-color="#EFE4D8"/><stop offset="1" stop-color="#D6C2AE"/>
    </linearGradient>
    <linearGradient id="klyro-pack-gFilmDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4A4744"/><stop offset=".6" stop-color="#2A2826"/><stop offset="1" stop-color="#161514"/>
    </linearGradient>
    <linearGradient id="klyro-pack-gSeal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F7F0E8"/><stop offset="1" stop-color="#CDBBA8"/>
    </linearGradient>
    <linearGradient id="klyro-pack-gRed" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#B9181C"/><stop offset="1" stop-color="#7E0F12"/>
    </linearGradient>
    <linearGradient id="klyro-pack-gSideShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/>
    </linearGradient>
    <linearGradient id="klyro-pack-gSheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="klyro-pack-gShadow">
      <stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
</svg>`

const SHADOW = '<ellipse cx="100" cy="142" rx="64" ry="6" fill="url(#klyro-pack-gShadow)"/>';
  const SHEEN = function (d: string) { return '<path d="' + d + '" fill="url(#klyro-pack-gSheen)" opacity=".75"/>'; };
  const FONT = "font-family=\"'Segoe UI Variable','Trebuchet MS',Verdana,sans-serif\"";

  export const PACK_ILLUSTRATIONS: Record<string, string> = {
    plainFilm: '<svg viewBox="0 0 200 150" aria-hidden="true"><rect x="34" y="28" width="132" height="94" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><text x="100" y="80" text-anchor="middle" font-size="16" fill="currentColor" opacity=".4" ' + FONT + '>Clear</text></svg>',
    // Stand-up pouch printed with K. Top seal, red band, K-seal base.
    kseal: '<svg viewBox="0 0 200 150" aria-hidden="true">' + SHADOW +
      '<path d="M56 18 H144 Q148 18 148 22 L160 118 Q161 130 148 130 H52 Q39 130 40 118 L52 22 Q52 18 56 18 Z" fill="url(#klyro-pack-gFilm)" stroke="#CDBBA8"/>' +
      '<path d="M124 22 H144 Q148 22 148 26 L160 118 Q161 130 148 130 H132 Z" fill="url(#klyro-pack-gSideShade)"/>' +
      '<rect x="54" y="18" width="92" height="20" rx="5" fill="url(#klyro-pack-gSeal)"/>' +
      '<path class="sl" pathLength="1" d="M56 38 H144" style="--d:.1s"/>' +
      '<text x="100" y="74" text-anchor="middle" font-size="32" font-weight="800" fill="#1D1D1D" ' + FONT + '>K</text>' +
      '<rect x="46" y="86" width="108" height="9" rx="2" fill="url(#klyro-pack-gRed)"/>' +
      '<path class="sl" pathLength="1" d="M52 130 L100 106 L148 130" style="--d:.45s"/>' +
      '<path class="sl" pathLength="1" d="M100 106 V130" style="--d:.9s"/>' +
      SHEEN("M66 42 L80 30 L86 116 L72 124 Z") + '</svg>',

    // Stand-up DOY pouch printed with DOY, folded gusset base.
    // AMENDS 6.2: light film like the other pack types (was dark film).
    doy: '<svg viewBox="0 0 200 150" aria-hidden="true">' + SHADOW +
      '<path d="M54 22 H146 Q150 22 150 27 L156 112 Q157 124 146 124 H54 Q43 124 44 112 L50 27 Q50 22 54 22 Z" fill="url(#klyro-pack-gFilm)" stroke="#CDBBA8"/>' +
      '<path d="M128 26 H146 Q150 26 150 31 L156 112 Q157 124 146 124 H134 Z" fill="url(#klyro-pack-gSideShade)"/>' +
      '<path d="M50 22 H150 L151 30 H49 Z" fill="url(#klyro-pack-gSeal)"/>' +
      '<path class="sl" pathLength="1" d="M50 32 H150" style="--d:.1s"/>' +
      '<text x="100" y="82" text-anchor="middle" font-size="26" font-weight="800" letter-spacing="2" fill="#1D1D1D" ' + FONT + '>DOY</text>' +
      '<rect x="60" y="92" width="80" height="6" rx="2" fill="url(#klyro-pack-gRed)"/>' +
      '<path d="M44 112 Q100 142 156 112 L154 126 Q100 150 46 126 Z" fill="url(#klyro-pack-gSeal)" stroke="#CDBBA8"/>' +
      '<path class="sl" pathLength="1" d="M48 124 Q100 150 152 124" style="--d:.5s"/>' +
      '<path class="sl" pathLength="1" d="M49 40 L44 112" style="--d:.9s"/>' +
      '<path class="sl" pathLength="1" d="M151 40 L156 112" style="--d:1.2s"/>' +
      SHEEN("M62 36 L76 30 L80 116 L68 122 Z") + '</svg>',

    // Horizontal flowwrap: end crimps, then the fin seal along the bottom.
    flowwrap: '<svg viewBox="0 0 200 150" aria-hidden="true">' + SHADOW +
      '<path d="M32 52 Q32 44 42 44 H158 Q168 44 168 52 V108 Q168 116 158 116 H42 Q32 116 32 108 Z" fill="url(#klyro-pack-gFilm)" stroke="#CDBBA8"/>' +
      '<rect x="60" y="58" width="80" height="44" rx="6" fill="url(#klyro-pack-gRed)"/>' +
      '<rect x="60" y="58" width="80" height="8" rx="3" fill="#fff" opacity=".18"/>' +
      '<path class="sl" pathLength="1" d="M38 50 V110" style="--d:.15s"/>' +
      '<path class="sl" pathLength="1" d="M162 50 V110" style="--d:.5s"/>' +
      '<path class="sl" pathLength="1" d="M40 114 H160" style="--d:.95s"/>' +
      SHEEN("M44 52 L70 46 L72 112 L50 112 Z") + '</svg>',

    // Lane laminate: stacked sheets, lanes and a paper strip.
    paperstrip: '<svg viewBox="0 0 200 150" aria-hidden="true">' + SHADOW +
      '<rect x="60" y="20" width="96" height="100" rx="6" fill="url(#klyro-pack-gFilmDark)" opacity=".55"/>' +
      '<rect x="54" y="26" width="96" height="100" rx="6" fill="url(#klyro-pack-gFilmDark)"/>' +
      '<rect x="48" y="20" width="96" height="100" rx="6" fill="url(#klyro-pack-gFilm)" stroke="#CDBBA8"/>' +
      '<path class="sl" pathLength="1" d="M80 30 V110" style="--d:.1s;--seal-width:18"/>' +
      '<path class="sl" pathLength="1" d="M112 30 V110" style="--d:.5s;--seal-width:18"/>' +
      SHEEN("M54 26 L80 22 L84 112 L60 116 Z") + '</svg>',

    // Pillow pack: rounded body with end crimps and top/bottom fins.
    pillow: '<svg viewBox="0 0 200 150" aria-hidden="true">' + SHADOW +
      '<path d="M28 80 Q34 42 100 42 Q166 42 172 80 Q166 118 100 118 Q34 118 28 80 Z" fill="url(#klyro-pack-gFilm)" stroke="#CDBBA8"/>' +
      '<path d="M100 42 Q166 42 172 80 Q166 118 100 118 Q150 100 150 80 Q150 60 100 42 Z" fill="url(#klyro-pack-gSideShade)" opacity=".7"/>' +
      '<path class="sl" pathLength="1" d="M36 60 Q26 80 36 100" style="--d:.15s"/>' +
      '<path class="sl" pathLength="1" d="M164 60 Q174 80 164 100" style="--d:.5s"/>' +
      '<path class="sl" pathLength="1" d="M52 54 Q100 44 148 54" style="--d:.9s;stroke-width:3.5"/>' +
      '<path class="sl" pathLength="1" d="M52 106 Q100 116 148 106" style="--d:1.15s;stroke-width:3.5"/>' +
      '<ellipse cx="78" cy="66" rx="28" ry="10" transform="rotate(-14 78 66)" fill="#fff" opacity=".4"/></svg>',

    // Flexible film sheet, not a carton: each of the four edges seals in turn.
    side4: '<svg viewBox="0 0 200 150" aria-hidden="true">' + SHADOW +
      '<path class="film-sheet" d="M56 24 Q100 21 144 24 L142 126 Q100 129 56 126 Z" fill="url(#klyro-pack-gFilm)" stroke="#CDBBA8"/>' +
      '<path class="sl" pathLength="1" d="M62 30 V120" style="--d:.65s"/>' +
      '<path class="sl" pathLength="1" d="M62 30 H136" style="--d:1.25s"/>' +
      '<path class="sl" pathLength="1" d="M136 30 V120" style="--d:1.85s"/>' +
      '<path class="sl" pathLength="1" d="M62 120 H136" style="--d:2.45s"/>' +
      SHEEN("M62 30 L82 27 L86 118 L64 121 Z") + '</svg>',

    // Flat 3-side sachet. Left, bottom and right seal. The top stays open.
    side3: '<svg viewBox="0 0 200 150" aria-hidden="true">' + SHADOW +
      '<path class="film-sheet" d="M56 24 Q100 21 144 24 L142 126 Q100 129 56 126 Z" fill="url(#klyro-pack-gFilm)" stroke="#CDBBA8"/>' +
      '<path class="sl" pathLength="1" d="M62 30 V120" style="--d:.65s"/>' +
      '<path class="sl" pathLength="1" d="M62 120 H136" style="--d:1.25s"/>' +
      '<path class="sl" pathLength="1" d="M136 30 V120" style="--d:1.85s"/>' +
      SHEEN("M62 30 L82 27 L86 118 L64 121 Z") + '</svg>',

    // Top-down lidding cutter: outer cut, pull tab and fine inner seal contours.
    lidding: '<svg viewBox="0 0 200 150" aria-hidden="true">' + SHADOW +
      '<path d="M45 75 C45 43 69 25 100 25 C131 25 155 43 155 75 C155 107 131 125 100 125 C69 125 45 107 45 75 Z" fill="url(#klyro-pack-gFilm)" stroke="#B9181C" stroke-width="2"/>' +
      '<path d="M151 56 Q169 50 174 62 Q169 72 153 73" fill="url(#klyro-pack-gFilm)" stroke="#B9181C" stroke-width="2"/>' +
      '<path class="sl" pathLength="1" d="M53 75 C53 49 73 34 100 34 C127 34 147 49 147 75 C147 101 127 116 100 116 C73 116 53 101 53 75 Z" style="--seal-width:1;--d:.7s"/>' +
      '<path class="sl" pathLength="1" d="M61 75 C61 54 78 42 100 42 C122 42 139 54 139 75 C139 96 122 108 100 108 C78 108 61 96 61 75 Z" style="--seal-width:1;--d:1.05s"/>' +
      '<path class="sl" pathLength="1" d="M45 75 C45 43 69 25 100 25 C131 25 155 43 155 75 C155 107 131 125 100 125 C69 125 45 107 45 75 Z" style="--seal-width:2;--d:.25s"/>' +
      SHEEN("M67 42 Q88 26 109 29 Q79 47 66 82 Z") + '</svg>',

    // Three-side pouch with a gusset base. Left, right, then the base seal.
    pouch3: '<svg viewBox="0 0 200 150" aria-hidden="true">' + SHADOW +
      '<path d="M58 34 H142 V118 Q100 132 58 118 Z" fill="url(#klyro-pack-gFilmDark)"/>' +
      '<path class="sl" pathLength="1" d="M64 40 V116" style="--d:.2s"/>' +
      '<path class="sl" pathLength="1" d="M136 40 V116" style="--d:.8s"/>' +
      '<path class="sl" pathLength="1" d="M60 118 Q100 132 140 118" style="--d:1.4s"/></svg>'
  };

