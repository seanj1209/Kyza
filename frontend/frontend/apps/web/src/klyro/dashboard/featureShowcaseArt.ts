// Dashboard featurettes (Amends v12). Illustrations only, not live geometry or validation outcomes.
// Workflow and Sandbox depict features available today; Legends, Artwork and Upcoming are planned.
export const FEATURE_ART = {
  workflow: `<svg viewBox="0 0 360 250" role="img" aria-label="How Klyro works today: define the pack, engineer the cutter, validate it, then release an export">
    <rect x="12" y="16" width="336" height="218" rx="12" fill="var(--raised)" stroke="var(--line)"/>
    <text class="txt" x="28" y="40">One path, four stages</text>
    <path class="draw ink" pathLength="1" d="M52 132H292" style="--d:.1s"/>
    <g class="row" style="--d:.3s"><circle class="node" cx="52" cy="132" r="16"/><path class="red" d="M45 126h14M45 132h14M45 138h9"/><text class="txt" x="52" y="174" text-anchor="middle">Define</text><text class="txt-m" x="52" y="190" text-anchor="middle">Pack + spec</text></g>
    <g class="row" style="--d:.7s"><circle class="node" cx="132" cy="132" r="16"/><rect class="red" x="124" y="125" width="16" height="14" rx="2"/><text class="txt" x="132" y="174" text-anchor="middle">Engineer</text><text class="txt-m" x="132" y="190" text-anchor="middle">Cutter Studio</text></g>
    <g class="row" style="--d:1.1s"><circle class="node" cx="212" cy="132" r="16"/><path class="red" d="m205 132 5 5 9-10"/><text class="txt" x="212" y="174" text-anchor="middle">Validate</text><text class="txt-m" x="212" y="190" text-anchor="middle">Validation Centre</text></g>
    <g class="row" style="--d:1.5s"><circle class="node" cx="292" cy="132" r="16"/><path class="red" d="M292 124v14m-6-6 6 6 6-6"/><text class="txt" x="292" y="174" text-anchor="middle">Release</text><text class="txt-m" x="292" y="190" text-anchor="middle">PDF · SVG · JSON</text></g>
    <circle class="travel" cx="52" cy="132" r="5"/>
    <g class="pop" style="--d:2s"><rect x="28" y="62" width="150" height="34" rx="9" fill="var(--soft)"/><text class="txt-m" x="40" y="83">Exact mm geometry, end to end</text></g>
  </svg>`,
  sandbox: `<svg viewBox="0 0 360 250" role="img" aria-label="Sandbox Mode: set your own dimensions and construction, then save and re-import the custom cutter">
    <rect x="12" y="16" width="190" height="218" rx="12" fill="var(--soft)" stroke="var(--line)"/>
    <text class="txt" x="28" y="40">Sandbox Mode</text>
    <rect class="sandbox-frame" x="32" y="58" width="150" height="118" rx="8"/>
    <rect class="draw ink" pathLength="1" x="52" y="74" width="110" height="86" rx="5" style="--d:.3s"/>
    <path class="draw red" pathLength="1" d="M84 74v86M130 74v86" style="--d:.8s"/>
    <g class="pop" style="--d:1.3s"><rect x="62" y="132" width="20" height="14" rx="3" fill="var(--raised)" stroke="var(--brand)"/></g>
    <text class="txt-m" x="32" y="200">Trials · bespoke project work</text>
    <rect x="216" y="16" width="132" height="218" rx="12" fill="var(--raised)" stroke="var(--line)"/>
    <text class="txt" x="230" y="40">Your rules</text>
    <g class="row" style="--d:.4s"><text class="txt-m" x="230" y="66">Width</text><path class="ink" d="M230 76h100"/><circle class="knob" cx="290" cy="76" r="5"/></g>
    <g class="row" style="--d:.7s"><text class="txt-m" x="230" y="100">Height</text><path class="ink" d="M230 110h100"/><circle class="knob" cx="262" cy="110" r="5"/></g>
    <g class="row" style="--d:1s"><text class="txt-m" x="230" y="134">Construction</text><path class="ink" d="M230 144h100"/><circle class="knob" cx="310" cy="144" r="5"/></g>
    <g class="pop" style="--d:1.6s"><rect x="230" y="168" width="104" height="24" rx="12" fill="var(--brand)"/><text class="txt-on" x="282" y="184" text-anchor="middle">Save custom</text></g>
    <g class="row" style="--d:2s"><path class="ink" d="M240 214v-10m-4 6 4 4 4-4"/><text class="txt-m" x="252" y="214">Import cutter JSON</text></g>
  </svg>`,
  legends: `<svg viewBox="0 0 360 250" role="img" aria-label="Planned legend builder with date, customer, sizing, eyemark key, disclaimer and logo placement">
    <rect x="12" y="16" width="162" height="218" rx="12" fill="var(--raised)" stroke="var(--line)"/>
    <text class="txt" x="26" y="40">Legend builder</text>
    <g class="row" style="--d:.2s"><path class="ink" d="M26 62h12m-12-4v8m12-8v8"/><text class="txt-m" x="48" y="66">Date · Created by</text></g>
    <g class="row" style="--d:.6s"><path class="ink" d="M26 90h12"/><text class="txt-m" x="48" y="94">Customer · Sizing</text></g>
    <g class="row" style="--d:1s"><rect x="26" y="114" width="12" height="8" fill="var(--muted)"/><text class="txt-m" x="48" y="122">Eyemarks · Key</text></g>
    <g class="row" style="--d:1.4s"><path class="red" d="M26 148h12"/><text class="txt-m" x="48" y="150">Disclaimer · Logo</text></g>
    <rect x="26" y="172" width="134" height="42" rx="8" fill="var(--soft)"/><text class="txt-m" x="38" y="188">Logo position</text><text class="txt" x="38" y="203">Top / Bottom</text>
    <rect x="196" y="16" width="152" height="218" rx="12" fill="var(--soft)" stroke="var(--line)"/>
    <path class="draw ink" pathLength="1" d="M214 58h116v100H214Z" style="--d:.3s"/><path class="draw red" pathLength="1" d="M214 148h116" style="--d:.8s"/>
    <g class="pop" style="--d:1.4s"><rect x="214" y="176" width="116" height="40" rx="6" fill="var(--raised)" stroke="var(--line)"/><text class="txt" x="225" y="192">Logo · Job details</text><text class="txt-m" x="225" y="207">Cutter + Export</text></g>
  </svg>`,
  artwork: `<svg viewBox="0 0 360 250" role="img" aria-label="Planned automated artwork workflow: place assets, check and print proof with the brand colour system">
    <rect x="12" y="16" width="336" height="218" rx="12" fill="var(--raised)" stroke="var(--line)"/><text class="txt" x="28" y="40">Brand-led artwork workflow</text>
    <g class="row" style="--d:.2s"><rect x="28" y="62" width="86" height="116" rx="8" fill="var(--soft)"/><path class="ink" d="M44 84h54v68H44Z"/><path class="red" d="M52 96h38m-38 44h38"/><text class="txt-m" x="43" y="169">Place assets</text></g>
    <path class="draw red" pathLength="1" d="M124 120h24m-6-6 6 6-6 6" style="--d:.7s"/>
    <g class="row" style="--d:1s"><rect x="158" y="62" width="68" height="116" rx="8" fill="var(--soft)"/><path class="ink" d="m176 96 8 8 24-24m-32 54h32m-32 12h32"/><text class="txt-m" x="174" y="169">Check</text></g>
    <path class="draw red" pathLength="1" d="M236 120h18m-6-6 6 6-6 6" style="--d:1.4s"/>
    <g class="pop" style="--d:1.8s"><path class="ink" d="M268 68h36l16 16v72h-52Zm36 0v16h16"/><path class="red" d="M280 104h28m-28 16h28m-28 16h18"/><text class="txt-m" x="270" y="174">Print proof</text></g>
    <text class="txt-m" x="28" y="211">Your colour system</text><circle class="swatch" cx="190" cy="207" r="6"/><circle cx="211" cy="207" r="6" fill="var(--muted)"/><circle cx="232" cy="207" r="6" fill="var(--soft)" stroke="var(--line)"/>
  </svg>`,
  upcoming: `<svg viewBox="0 0 360 250" role="img" aria-label="Roadmap: planned pack types, presets and asset library, and further export formats. None of these are available yet">
    <rect x="12" y="16" width="336" height="218" rx="12" fill="var(--raised)" stroke="var(--line)"/>
    <text class="txt" x="28" y="40">On the roadmap</text><text class="txt-m" x="248" y="40">All planned</text>
    <path class="draw ink" pathLength="1" d="M44 64V214" style="--d:.1s;stroke-dasharray:1"/>
    <g class="row" style="--d:.3s"><circle class="plan-dot" cx="44" cy="72" r="6"/><text class="txt" x="62" y="76">New pack types</text><text class="txt-m" x="62" y="92">Lidding · 3 Side Pouch</text></g>
    <g class="row" style="--d:.7s"><circle class="plan-dot" cx="44" cy="118" r="6"/><text class="txt" x="62" y="122">Preferences + presets</text><text class="txt-m" x="62" y="138">Cutter, seal and perf styles · starting sizes</text></g>
    <g class="row" style="--d:1.1s"><circle class="plan-dot" cx="44" cy="164" r="6"/><text class="txt" x="62" y="168">Brand asset library</text><text class="txt-m" x="62" y="184">Upload, organise, place</text></g>
    <g class="row" style="--d:1.5s"><circle class="plan-dot" cx="44" cy="206" r="6"/><text class="txt" x="62" y="210">More exports</text><text class="txt-m" x="170" y="210">Vector PDF · DXF · AI · Repro</text></g>
  </svg>`,
} as const
