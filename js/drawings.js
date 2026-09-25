// Technical line drawings for each instrument type. All drawn on a 400×240 sheet.
// Classes: .o outline shape, .b/.bi two-stroke band (steel bar), .a tempered accent, .dim dimension line.
(function () {
  const band = (d, w) => `<path class="b" d="${d}" ${w ? `style="stroke-width:${w}px"` : ""}/><path class="bi" d="${d}" ${w ? `style="stroke-width:${w - 5}px"` : ""}/>`;
  const ring = (cx, cy, r) => `<circle class="b" cx="${cx}" cy="${cy}" r="${r}"/><circle class="bi" cx="${cx}" cy="${cy}" r="${r}"/>`;

  function dim(x1, x2, y, label) {
    const mid = (x1 + x2) / 2;
    return `<g class="dim">
      <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>
      <line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}"/>
      <line x1="${x2}" y1="${y - 6}" x2="${x2}" y2="${y + 6}"/>
      <path d="M${x1} ${y} l8 -3 v6 z M${x2} ${y} l-8 -3 v6 z"/>
      <rect class="dim-bg" x="${mid - 30}" y="${y - 9}" width="60" height="18"/>
      <text x="${mid}" y="${y + 4}">${label}</text>
    </g>`;
  }

  function nipper(o) {
    const j = o.jaw || 5;
    const tip = 110 - Math.min(60, 12 + j * 4);
    const t = o.heavy ? 3 : 0;
    const half = `
      <path class="o" d="M124 ${103 - t} C${tip + 36} ${99 - t} ${tip + 10} 108 ${tip} 119 L124 120 Z"/>
      <path class="o" d="M136 ${107 - t} C210 ${97 - t} 300 ${86 - t} 370 ${79 - t} Q384 ${79 - t} 380 ${89} C300 ${96} 210 108 136 117 Z"/>`;
    let spring;
    if (o.single) spring = `<path class="a" d="M196 105 C230 112 230 128 196 135"/>`;
    else if (o.barrel) spring = `<path class="a" d="M160 112 C190 108 214 110 222 116"/><path class="a" d="M160 128 C190 132 214 130 222 124"/><circle class="a" cx="232" cy="120" r="10"/><circle class="a" cx="232" cy="120" r="4"/>`;
    else spring = `<path class="a" d="M150 113 C196 108 236 112 262 120"/><path class="a" d="M150 127 C196 132 236 128 262 120"/>`;
    return `
      ${half}
      <g transform="translate(0 240) scale(1 -1)">${half}</g>
      ${spring}
      <rect class="o" x="112" y="102" width="26" height="36" rx="5"/>
      <circle class="o" cx="125" cy="120" r="5"/>
      <line class="a edge" x1="${tip}" y1="120" x2="${tip + j * 4}" y2="120"/>
      ${o.nodim ? "" : dim(tip, 382, 214, (o.len || 105) + " mm")}`;
  }

  function scissors(o) {
    let tip = o.small ? 74 : o.long ? 14 : 34;
    const up = o.curved ? 12 : 0;
    const blades = `
      <path class="o" d="M206 112 C150 110 ${tip + 40} ${114 - up / 2} ${tip} ${119 - up} C${tip + 40} ${121 - up / 2} 150 122 206 124 Z"/>
      <path class="o" d="M206 117 C150 124 ${tip + 40} ${126 - up / 2} ${tip + 2} ${123 - up} C${tip + 40} ${130 - up / 2} 150 132 206 131 Z"/>`;
    let teeth = "";
    if (o.teeth) {
      const n = Math.min(o.teeth, 42);
      const x0 = tip + 24, x1 = 188, step = (x1 - x0) / n;
      let d = `M${x0} 132`;
      for (let i = 0; i < n; i++) d += ` l${(step / 2).toFixed(2)} 5 l${(step / 2).toFixed(2)} -5`;
      teeth = `<path class="teeth" d="${d}"/>`;
    }
    const s = o.small ? 1.18 : 1;
    const handles = `
      <g transform="translate(206 120) scale(${s}) translate(-206 -120)">
        ${band("M206 112 C230 104 246 92 262 86")}
        ${ring(292, 76, 26)}
        ${band("M206 129 C226 138 238 148 252 156")}
        ${ring(278, 168, 22)}
        ${o.small ? "" : band("M292 188 C306 204 330 208 348 198", 9)}
      </g>`;
    const body = `${blades}${teeth}${handles}
      <circle class="o" cx="203" cy="120" r="7"/><line class="a" x1="199" y1="116" x2="207" y2="124"/>`;
    return `${o.flip ? `<g transform="translate(0 240) scale(1 -1)">${body}</g>` : body}
      ${o.nodim ? "" : dim(tip, o.small ? 330 : 352, 222, (o.len || 152) + " mm")}`;
  }

  function tweezers(o) {
    const tips = {
      slant: ["34 116", "46 124", `<line class="a edge" x1="34" y1="116" x2="46" y2="124"/>`],
      point: ["24 118", "24 122", ""],
      curve: ["36 96", "40 102", `<line class="a edge" x1="36" y1="96" x2="40" y2="102"/>`],
      flat: ["40 115", "40 125", `<line class="a edge" x1="40" y1="115" x2="40" y2="125"/>`]
    }[o.tip || "slant"];
    const cu = o.tip === "curve";
    const upper = cu ? "M384 113 C300 104 170 106 92 108 S46 104 36 96" : `M384 113 C300 104 170 106 ${tips[0]}`;
    const lower = cu ? "M384 127 C300 136 170 132 92 126 S52 112 40 102" : `M384 127 C300 136 170 134 ${tips[1]}`;
    const grip = [150, 162, 174, 186, 198, 210].map(x =>
      `<line class="hatch" x1="${x}" y1="${107}" x2="${x + 6}" y2="${104}"/><line class="hatch" x1="${x}" y1="${133}" x2="${x + 6}" y2="${136}"/>`).join("");
    return `${band(upper, 9)}${band(lower, 9)}${grip}
      <rect class="o" x="374" y="108" width="18" height="24" rx="4"/>${tips[2]}
      ${o.nodim ? "" : dim(24, 392, 206, (o.len || 95) + " mm")}`;
  }

  function pusher(o) {
    const knurl = Array.from({ length: 13 }, (_, i) => `<line class="hatch" x1="${150 + i * 8}" y1="113" x2="${158 + i * 8}" y2="127"/>`).join("");
    const left = o.pointed
      ? `<path class="o" d="M66 114 L26 120 L66 126 Z"/><line class="a edge" x1="26" y1="120" x2="44" y2="117"/>`
      : `<ellipse class="o" cx="46" cy="120" rx="18" ry="11"/><path class="a edge" d="M30 114 Q24 120 30 126"/>`;
    return `${band("M112 120 L62 120", 9)}${band("M288 120 L340 120", 9)}${left}
      <path class="o" d="M340 111 L374 106 L374 134 L340 129 Z"/><line class="a edge" x1="374" y1="106" x2="374" y2="134"/>
      <rect class="o" x="110" y="109" width="180" height="22" rx="11"/>${knurl}
      ${o.nodim ? "" : dim(28, 374, 206, (o.len || 125) + " mm")}`;
  }

  function file(o) {
    const cut = Array.from({ length: 28 }, (_, i) => `<line class="hatch" x1="${56 + i * 8}" y1="112" x2="${50 + i * 8}" y2="128"/>`).join("");
    return `<path class="o" d="M40 120 C40 112 48 110 56 110 L282 110 L282 130 L56 130 C48 130 40 128 40 120 Z"/>${cut}
      <line class="a edge" x1="44" y1="120" x2="64" y2="120"/>
      <rect class="o" x="282" y="105" width="92" height="30" rx="15"/>
      ${o.nodim ? "" : dim(40, 374, 206, (o.len || 150) + " mm")}`;
  }

  function razor(o) {
    return `<path class="o" d="M36 104 L198 110 L198 128 L36 126 Q30 115 36 104 Z"/>
      <line class="hatch" x1="50" y1="115" x2="186" y2="119"/>
      <line class="a edge" x1="36" y1="126" x2="198" y2="128"/>
      <rect class="o" x="190" y="108" width="190" height="24" rx="12"/>
      <circle class="o" cx="200" cy="120" r="5"/>
      ${o.nodim ? "" : dim(32, 380, 206, (o.len || 250) + " mm")}`;
  }

  function mini(fn, opts, x, y, w, h) {
    return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 60 400 130">${fn(Object.assign({ nodim: true }, opts))}</svg>`;
  }

  function set(o) {
    return `<rect class="o" x="24" y="30" width="352" height="176" rx="18"/>
      <rect class="stitch" x="36" y="42" width="328" height="152" rx="10"/>
      ${o.zip ? `<path class="a" d="M40 30 H360" stroke-dasharray="3 4"/>` : `<circle class="o" cx="200" cy="206" r="7"/>`}
      ${mini(nipper, { jaw: 5 }, 46, 52, 150, 60)}
      ${mini(scissors, { small: true, curved: true }, 206, 52, 150, 60)}
      ${mini(tweezers, { tip: "slant" }, 46, 122, 150, 60)}
      ${mini(pusher, {}, 206, 122, 150, 60)}`;
  }

  const kinds = { nipper, scissors, tweezers, pusher, file, razor, set };

  window.drawTool = function (draw, len, label) {
    const fn = kinds[draw.type] || nipper;
    return `<svg class="drawing" viewBox="0 0 400 240" role="img" aria-label="${label ? label.replace(/"/g, "&quot;") : "Instrument drawing"}">
      ${fn(Object.assign({ len }, draw))}</svg>`;
  };
})();
