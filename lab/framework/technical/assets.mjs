// Owned, checked-in vector content. This is NOT an arbitrary SVG importer.
// The waveform is intentionally schematic; its amplitudes are not audio data.
export const WAVE_REGIONS = Object.freeze([
  Object.freeze({ id: "speech", label: "Schematic speech region" }),
  Object.freeze({ id: "silence", label: "Schematic silence region" }),
]);
const strokes = (start, end, quiet = false) => Array.from({ length: end - start }, (_, n) => {
  const i = start + n, x = 12 + i * 6;
  const amplitude = quiet ? 2 + (i % 3) : 10 + Math.abs(Math.sin(i * 1.93) * Math.cos(i * .21)) * 34;
  return `M${x} ${70 - amplitude}V${70 + amplitude}`;
}).join(" ");
export const WAVEFORM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 140" aria-labelledby="wave-title wave-description">
<title id="wave-title">Speech followed by silence</title>
<desc id="wave-description">An illustrative signal, not measured audio. Both regions can be selected.</desc>
<g id="speech"><rect x="4" y="12" width="572" height="116" fill="transparent"/><path d="${strokes(0, 94)}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></g>
<g id="silence"><rect x="578" y="12" width="318" height="116" fill="transparent"/><path d="${strokes(96, 147, true)}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></g>
</svg>`;
