/**
 * PRESS / components / icon
 *
 * Icons drawn as geometry, never as font glyphs or emoji. The set is the
 * HackerNoon pixel icon library (vendor/pixel-icons, MIT): 248 solid icons
 * drawn on a 24x24 unit grid, the same pixel language the frames' Geist
 * Pixel type is set in.
 *
 * The constraints all come from what survives a 0.231 reduction. One grid
 * unit of a 24-grid icon at a 48px glyph is exactly 2px, the minimum
 * semantic stroke, so a glyph below 48px would let single-pixel detail fall
 * through the phone floor. The defaults sit above that line, solid fills
 * hold their shape where outlines smear, and the glyph on a red tile is
 * pure white because nothing quieter survives the tile.
 *
 * Every icon is paired with a visible text label by `iconTile`, because an
 * icon reinforces meaning rather than carrying it alone.
 */

import { custom, grid, row, stack, text } from "../src/solve.js";
import { COLOR } from "../src/tokens.js";
import { GRID, PIXEL_ICONS } from "../vendor/pixel-icons/solid.js";

/**
 * The previous hand-drawn vocabulary, kept as names so an existing plate or
 * JSON spec still builds. Each resolves to the nearest icon in the library.
 */
const ALIASES = {
	arrowRight: "arrow-right",
	arrowDown: "arrow-down",
	cross: "times",
	doc: "notebook",
	database: "archive",
	layers: "copy",
	cloud: "cloud-upload",
	target: "disc",
};

export const ICON_NAMES = Object.keys(PIXEL_ICONS);

/** Path2D is built once per icon, at first paint, in the rendering context. */
const COMPILED = new Map();

function shapesFor(name) {
	const key = ALIASES[name] || name;
	const data = PIXEL_ICONS[key];
	if (!data) {
		throw new Error(
			`icon("${name}") does not exist. The set is the vendored HackerNoon pixel ` +
				`library, ${ICON_NAMES.length} names. Run \`press components\` to list them.`,
		);
	}
	let compiled = COMPILED.get(key);
	if (!compiled) {
		compiled = data.map((d) => new Path2D(d));
		COMPILED.set(key, compiled);
	}
	return compiled;
}

/**
 * The icons are flat fills on the 24 grid; winding carries the knockouts.
 * Exported for components that paint an icon inside their own geometry, the
 * way `checklist` sets a mark inside its tile.
 */
export function drawIcon(ctx, name, x, y, size, color) {
	const shapes = shapesFor(name);
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(size / GRID, size / GRID);
	ctx.fillStyle = color;
	for (const p of shapes) ctx.fill(p);
	ctx.restore();
}

/** A bare icon. `size` is the drawn square, not a tile. */
export function icon(name, { size = 48, color = COLOR.text } = {}) {
	shapesFor(name); // an unknown name refuses at author time, not at paint
	return custom({
		baselineFrom: "list",
		measure: () => ({ w: size, h: size }),
		paint: (ctx, rect) => drawIcon(ctx, name, rect.x, rect.y, size, color),
	});
}

/**
 * A semantic tile: a white icon on a red square, with its label beside it.
 *
 * For a 1600x1000 frame a 76 to 96px tile with a 46 to 60px icon is the useful
 * range, so those are the defaults rather than something to remember.
 */
export function iconTile(name, label, { tile = 88, glyph = 52, fill = COLOR.red, detail } = {}) {
	if (!label) {
		throw new Error(
			"iconTile needs a label. An icon reinforces meaning, it does not carry it alone.",
		);
	}
	shapesFor(name);

	return row({
		gap: 3,
		align: "baseline",
		unit: true,
		children: [
			custom({
				baselineFrom: "head",
				measure: () => ({ w: tile, h: tile }),
				paint: (ctx, rect) => {
					ctx.fillStyle = fill;
					ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
					// Centred both geometrically and optically inside the tile.
					drawIcon(
						ctx,
						name,
						rect.x + (rect.w - glyph) / 2,
						rect.y + (rect.h - glyph) / 2,
						glyph,
						COLOR.knockout,
					);
				},
			}),
			stack({
				gap: 1,
				grow: true,
				children: [
					text(label, "head", { color: COLOR.text }),
					detail ? text(detail, "body", { color: COLOR.muted, commentary: true }) : null,
				],
			}),
		],
	});
}

/** A grid of semantic tiles, for a slide that names four or five capabilities. */
export function iconGrid({ items, cols = 2, gap = 4 } = {}) {
	if (!items?.length) throw new Error("iconGrid needs at least one item.");
	return grid({
		cols,
		gap,
		children: items.map((i) => iconTile(i.icon, i.label, { detail: i.detail })),
	});
}
