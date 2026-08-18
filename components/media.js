/**
 * PRESS / components / media
 *
 * Images and placeholders.
 *
 * An image is a DOM element positioned on solved coordinates, like text, so it
 * stays crisp and keeps its own decoding. A placeholder is drawn on the canvas
 * instead, which lets a plate be laid out and validated before the artwork
 * exists. That matters: the commonest way a slide breaks is that the picture
 * arrives a different shape from the hole left for it.
 *
 * Both take a ratio rather than a height, so the box is derived from the width
 * the layout gives it and the aspect never drifts.
 */

import { custom, image as imageNode, stack, text } from "../src/solve.js";
import { COLOR, FAMILY, STROKE, typeSize } from "../src/tokens.js";

/**
 * @param {string} src     any URL the page can load
 * @param {number} ratio   width divided by height, 16/9 by default
 * @param {string} alt     required: the plate is an article asset
 * @param {string} caption optional line under the frame
 */
export function image({ src, ratio = 16 / 9, alt, caption, fit = "cover" } = {}) {
	if (!src) throw new Error("image needs a src. Use placeholder() while the artwork is pending.");
	if (!alt) {
		throw new Error(
			"image needs alt text. Describe the information the picture conveys, " +
				"not that it is an image.",
		);
	}

	const frame = imageNode({ src, ratio, alt, fit, unit: true });

	return caption
		? stack({ gap: 2, children: [frame, text(caption, "utility", { color: COLOR.quiet })] })
		: frame;
}

/**
 * A hole of a known shape. Drawn on the canvas with its ratio printed, so a
 * reviewer can see what the artwork has to fit before it is commissioned.
 */
export function placeholder({ ratio = 16 / 9, label = "ARTWORK PENDING" } = {}) {
	return custom({
		unit: true,
		measure: (w) => ({ w, h: Math.round(w / ratio) }),
		paint: (ctx, rect, C) => {
			// `raised`, not `panel`: a hole at #050505 on a #000 page is invisible
			// until it happens to have a border showing, and a full-bleed hole has
			// its border cropped at the frame edge. A pending picture that reads as
			// nothing at all is not a review artifact.
			ctx.fillStyle = C.raised;
			ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
			ctx.strokeStyle = C.black2;
			ctx.lineWidth = STROKE.connector;
			ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);

			// Diagonals, so an empty frame never reads as a rendering failure.
			ctx.strokeStyle = C.black1;
			ctx.lineWidth = STROKE.divider;
			ctx.beginPath();
			ctx.moveTo(rect.x, rect.y);
			ctx.lineTo(rect.right, rect.bottom);
			ctx.moveTo(rect.right, rect.y);
			ctx.lineTo(rect.x, rect.bottom);
			ctx.stroke();

			ctx.fillStyle = C.quiet;
			ctx.font = `400 ${typeSize("utility")}px ${FAMILY.mono}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(`${label}  ${rect.w} x ${rect.h}`, rect.cx, rect.cy);
		},
	});
}
