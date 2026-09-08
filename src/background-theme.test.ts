import { createCanvas } from '@napi-rs/canvas';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { plateGround } from './field.js';
import { Rect } from './geometry.js';
import { mount } from './render.js';
import { hexToRgb, resolve } from './screen.js';
import { configurePress, PRESS_THEMES, resetPressTheme, resolvePressTheme } from './theme.js';

afterEach(() => { resetPressTheme(); vi.unstubAllGlobals(); });

const emptyPlate = (theme: any) => ({
  frame: { w: 32, h: 32 }, nodes: [], links: [], rails: [], rules: [],
  theme: resolvePressTheme(theme, { composition: true }),
});

describe('backgrounds keep the prepared project skin', () => {
  it('captures field inks before later project switches or factory evaluation', () => {
    const plate = emptyPlate(PRESS_THEMES.paper);
    const factory = plateGround(plate, { baseDensity: 1, gradient: 0, waveStrength: 0, contrast: 1, spacing: 1 });
    configurePress(PRESS_THEMES.mega);
    const field = factory(8, 8, plate.frame);
    expect(field.ink).toBe(plate.theme.color.black2);
    expect(field.accent).not.toBe('#3a0000');
    const canvas = createCanvas(8, 8);
    const pixels = resolve(canvas.getContext('2d'), { cols: 8, rows: 8, ...field }).data;
    expect([...pixels.slice(0, 4)]).toEqual([...hexToRgb(plate.theme.color.black2), 255]);
  });

  it('keeps solved content completely clear even under a saturated density ramp', () => {
    const plate = { ...emptyPlate(PRESS_THEMES.mega), nodes: [{ kind: 'text', rect: Rect.of(0, 0, 32, 32) }] };
    const field = plateGround(plate, { baseDensity: 10, gradient: 10, massStrength: 0, halo: 0, spacing: 1 })(8, 8, plate.frame);
    const canvas = createCanvas(8, 8);
    const pixels = resolve(canvas.getContext('2d'), { cols: 8, rows: 8, ...field }).data;
    expect([...pixels].every(channel => channel === 0)).toBe(true);
  });

  it('resolves the same #rgb inks accepted by project themes', () => {
    expect(hexToRgb('#abc')).toEqual([170, 187, 204]);
    expect(hexToRgb(' #AABBCC ')).toEqual([170, 187, 204]);
    expect(() => hexToRgb('#not-a-color')).toThrow('Screen ink');
  });

  it('captures the picture ink before asynchronous image decoding', () => {
    let pendingImage: any;
    vi.stubGlobal('Image', class {
      constructor() {
        const bitmap = createCanvas(4, 4) as any;
        bitmap.getContext('2d').fillStyle = '#ffffff';
        bitmap.getContext('2d').fillRect(0, 0, 4, 4);
        bitmap.naturalWidth = 4; bitmap.naturalHeight = 4;
        bitmap.complete = false;
        pendingImage = bitmap;
        return bitmap;
      }
    });
    const canvases: any[] = [];
    const makeNode = () => ({ style: {}, dataset: {}, children: [] as any[], setAttribute() {}, appendChild(child: any) { this.children.push(child); } });
    const doc = {
      head: makeNode(),
      createElement(tag: string) {
        if (tag !== 'canvas') return makeNode();
        const canvas = Object.assign(createCanvas(1, 1), { style: {}, dataset: {}, setAttribute() {} });
        canvases.push(canvas);
        return canvas;
      },
    };
    const host = Object.assign(makeNode(), { ownerDocument: doc });
    const plate = { ...emptyPlate(PRESS_THEMES.paper), background: { type: 'image', src: 'local-test.png', alt: 'A generated white test image' } };
    mount(plate as any, host as any, { dpr: 1, pixelSize: 4 });
    configurePress(PRESS_THEMES.mega);
    pendingImage.onload();
    const pixels = canvases[0].getContext('2d').getImageData(0, 0, 8, 8).data;
    const inks = [];
    for (let offset = 0; offset < pixels.length; offset += 4) if (pixels[offset + 3]) inks.push([...pixels.slice(offset, offset + 3)]);
    expect(inks.length).toBeGreaterThan(0);
    expect(inks.every(ink => JSON.stringify(ink) === JSON.stringify(hexToRgb(plate.theme.color.ink)))).toBe(true);
  });
});
