/**
 * Production text measurement: per-glyph advances from the baked table.
 * No canvas, no DOM, identical in Node and every browser.
 */
import { METRICS_TABLE } from "./advances.js";

let graphemeSegmenter = null;
const graphemesOf = (text) => {
	if (!graphemeSegmenter) {
		graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
	}
	const out = [];
	for (const { segment } of graphemeSegmenter.segment(text)) out.push(segment);
	return out;
};

const missingNotes = [];

export const metricWarnings = () => missingNotes.slice();
export const clearMetricWarnings = () => {
	missingNotes.length = 0;
};

const noteMissing = (family, grapheme) => {
	if (missingNotes.length >= 16) return;
	missingNotes.push({
		code: "GLYPH_MISSING",
		message: `"${family}" has no advance for ${JSON.stringify(grapheme)}; using the default`,
	});
};

const FACE_NAMES = Object.keys(METRICS_TABLE.faces);

export const parseFont = (font) => {
	const m = String(font).match(/^(?:italic\s+)?(?:(\d+)\s+)?(\d+(?:\.\d+)?)px\s+(.+)$/i);
	const size = m ? Number(m[2]) : 16;
	const list = m ? m[3] : "";
	const names = [];
	const re = /"([^"]+)"|([^,]+)/g;
	let hit;
	while ((hit = re.exec(list))) names.push((hit[1] || hit[2]).trim());
	return { size, names };
};

export const resolveFace = (names) => {
	for (const name of names) {
		if (METRICS_TABLE.faces[name]) return { name, face: METRICS_TABLE.faces[name] };
	}
	for (const name of FACE_NAMES) {
		return { name, face: METRICS_TABLE.faces[name] };
	}
	throw new Error("metrics table has no faces");
};

const codepoints = (s) => {
	const out = [];
	for (let i = 0; i < s.length; ) {
		const cp = s.codePointAt(i);
		out.push(cp);
		i += cp > 0xffff ? 2 : 1;
	}
	return out;
};

const graphemeAdvance = (face, name, grapheme) => {
	let w = 0;
	for (const cp of codepoints(grapheme)) {
		const key = String(cp);
		if (Object.hasOwn(face.advances, key)) w += face.advances[key];
		else {
			noteMissing(name, grapheme);
			w += face.missing;
		}
	}
	return w;
};

/** Raw advance of `text` at `size` px, no letter-spacing. */
export const tableWidth = (font, text) => {
	const s = String(text);
	if (s === "") return 0;
	const { size, names } = typeof font === "string" ? parseFont(font) : font;
	const { name, face } = resolveFace(names);
	const scale = size / METRICS_TABLE.refSize;
	let w = 0;
	for (const g of graphemesOf(s)) w += graphemeAdvance(face, name, g);
	return w * scale;
};

export const tableFontMetrics = (font) => {
	const { size, names } = typeof font === "string" ? parseFont(font) : font;
	const { face } = resolveFace(names);
	const scale = size / METRICS_TABLE.refSize;
	return {
		ascent: face.ascent * scale,
		descent: face.descent * scale,
		cap: face.cap * scale,
	};
};

/** Canvas-shaped context pretext and fontMetrics can call. */
export const createTableMeasureContext = () => ({
	font: '400 16px "Geist Pixel"',
	measureText(text) {
		const m = tableFontMetrics(this.font);
		return {
			width: tableWidth(this.font, text),
			fontBoundingBoxAscent: m.ascent,
			fontBoundingBoxDescent: m.descent,
			actualBoundingBoxAscent: m.cap,
			actualBoundingBoxDescent: 0,
		};
	},
});

export { METRICS_TABLE };
