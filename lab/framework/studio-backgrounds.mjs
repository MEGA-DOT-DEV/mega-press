// Background recipes for the studio, using the canonical Press ground layer.
// There is no blueprint renderer: Lattice is an ordered dot field. Colors are
// deliberately absent so each prepared plate supplies its own theme inks.
export const STUDIO_BACKGROUNDS = Object.freeze([
  Object.freeze({
    id: 'quiet',
    label: 'Quiet',
    description: 'An open ground. Give the relationships the whole frame.',
  }),
  Object.freeze({
    id: 'lattice',
    label: 'Lattice',
    description: 'A regular dot field, cleared around the content.',
    background: Object.freeze({
      type: 'field',
      baseDensity: 0.48,
      gradient: 0,
      waveStrength: 0,
      contrast: 1,
      spacing: 3,
      halo: 96,
    }),
  }),
  Object.freeze({
    id: 'signal',
    label: 'Signal',
    description: 'A directional dither field that gathers in the open space.',
    background: Object.freeze({
      type: 'field',
      baseDensity: 0.28,
      gradient: 0.7,
      gradientAngle: 0.85,
      waveStrength: 1.3,
      contrast: 1.1,
      spacing: 2,
      halo: 96,
    }),
  }),
  Object.freeze({
    id: 'band',
    label: 'Band',
    description: 'A quiet surface spanning the measured body of the frame.',
    background: Object.freeze({ type: 'band', fill: 'raised', pad: 3 }),
  }),
]);
