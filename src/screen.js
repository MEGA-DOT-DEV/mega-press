/**
 * PRESS / screen
 *
 * The halftone screen, taken from the live mega.dev shaders rather than from
 * memory. One 4x4 ordered matrix resolves every continuous field in the system
 * into binary ink.
 *
 * The rule the whole visual language rests on: softness lives in the field,
 * hardness lives in the output. Nothing is ever anti-aliased into existence.
 */

export const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Dark biased, so near-black regions never brighten by accident. */
export const BAYER_DARK = BAYER_4.map((v) => 1 - v / 16);

/** Cells are non-negative integers, so the wrap is a bitwise AND. */
export const threshold = (cx, cy) => BAYER_DARK[(cy & 3) * 4 + (cx & 3)];

export const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export const luminance = (r, g, b) =>
	0.2126 * srgbToLinear(r / 255) + 0.7152 * srgbToLinear(g / 255) + 0.0722 * srgbToLinear(b / 255);

/* ImageData viewed as Uint32 is little-endian ABGR. */
export const pack = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;

export const hexToRgb = (hex) => {
	const h = hex.replace("#", "");
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

export const packHex = (hex, a = 255) => {
	const [r, g, b] = hexToRgb(hex);
	return pack(r, g, b, a);
};

/** Deterministic, so a still renders identically every time. */
export function hash2(x, y) {
	let h = x * 374761393 + y * 668265263;
	h = (h ^ (h >> 13)) * 1274126177;
	return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

/**
 * Resolve a density function into binary ink on a cell grid.
 *
 * The canvas is sized in cells, not pixels, and CSS enlarges it with
 * image-rendering: pixelated. A 1600px plate at pixel size 4 is a 400 wide
 * canvas, so a full-plate field costs a fraction of a millisecond.
 *
 * `density(uvx, uvy, x, y)` returns 0..1, or an object { d, accent } when a
 * region should print in the accent colour. Accent is gated on the completed
 * mask, not on its density input, so it resolves into crisp pixels rather than
 * alpha blur.
 */
export function resolve(ctx, { cols, rows, spacing = 2, ink, accent, density }) {
	const image = ctx.createImageData(cols, rows);
	const buf = new Uint32Array(image.data.buffer);
	const inkColor = packHex(ink);
	const accentColor = accent ? packHex(accent) : inkColor;
	const step = Math.max(1, Math.round(spacing));

	for (let y = 0; y < rows; y += step) {
		const uvy = (y + 0.5) / rows;
		const off = y * cols;
		const ty = (y / step) | 0;
		for (let x = 0; x < cols; x += step) {
			const uvx = (x + 0.5) / cols;
			const sample = density(uvx, uvy, x, y);
			const d = typeof sample === "number" ? sample : sample.d;
			const a = typeof sample === "number" ? 0 : sample.accent || 0;
			const thr = threshold((x / step) | 0, ty);
			if (a >= thr) buf[off + x] = accentColor;
			else if (d >= thr) buf[off + x] = inkColor;
		}
	}
	ctx.putImageData(image, 0, 0);
	return image;
}

/**
 * Size a canvas in cells and return the grid. The backing store is small on
 * purpose; the CSS box is the full size.
 */
export function cellCanvas(canvas, width, height, pixelSize = 4) {
	const cols = Math.max(2, Math.ceil(width / pixelSize));
	const rows = Math.max(2, Math.ceil(height / pixelSize));
	canvas.width = cols;
	canvas.height = rows;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;
	canvas.style.imageRendering = "pixelated";
	return { cols, rows, ctx: canvas.getContext("2d") };
}
