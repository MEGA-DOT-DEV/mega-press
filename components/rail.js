/**
 * PRESS / components / rail
 *
 * A sequence along an axis: steps, waves, a roadmap, a timeline, a
 * collaboration flow. In the webflow set this shape was rebuilt four separate
 * times as `wave-dot`, `roadmap-dot`, `collaboration-marker` and
 * `network-node`, which is why the rail drifted off the dot centres in one of
 * them and nobody noticed until the PNG was reviewed.
 *
 * There is one definition now, and the rail is not a parameter of it. The
 * component emits its own connectors, so a rail cannot be forgotten and cannot
 * be positioned by hand.
 */

import { rail as deriveRail } from "../src/connect.js";
import { marker, row, stack, text } from "../src/solve.js";
import { resolveChrome } from "../src/theme.js";
import { COLOR, STROKE, space } from "../src/tokens.js";

/**
 * @param {object[]} items      { name, detail?, index? }
 * @param {number}   activeTo   items up to this index are drawn in the accent
 * @param {number}   markerSize dot diameter, 20 by default
 */
export function railSteps({
	items,
	activeTo = -1,
	markerSize = space(2),
	gap = 4, // between steps
	markerGap = 3, // from the dot to its text
	numbered = resolveChrome().numbered,
	accent = COLOR.red,
	quiet = COLOR.black2,
} = {}) {
	if (!items || items.length < 2) {
		throw new Error("railSteps needs at least two items. One step is not a sequence.");
	}

	const markers = [];

	const rows = items.map((item, i) => {
		const dot = marker({
			size: markerSize,
			fill: i <= activeTo ? accent : quiet,
			ring: i > activeTo,
			alignTo: "list",
		});
		markers.push(dot);

		return row({
			gap: markerGap,
			align: "baseline",
			unit: true,
			children: [
				dot,
				stack({
					gap: 1,
					grow: true,
					children: [
						row({
							gap: 2,
							align: "baseline",
							children: [
								numbered
									? text(String(item.index ?? i + 1).padStart(2, "0"), "utility", {
											color: i <= activeTo ? accent : COLOR.quiet,
										})
									: null,
								text(item.name, "list", { color: COLOR.text, grow: true }),
							],
						}),
						item.detail
							? text(item.detail, "body", { color: COLOR.muted, commentary: true })
							: null,
					],
				}),
			],
		});
	});

	const node = stack({ gap, children: rows });

	/**
	 * The rail. Derived from the dots after placement, never given an x.
	 *
	 * `extend` is half a marker so the line stops at the outer edge of the first
	 * and last dot rather than at their centres.
	 */
	node.press = {
		connect: () => ({
			rails: [
				deriveRail(markers, {
					axis: "y",
					weight: STROKE.connector,
					color: quiet,
					extend: 0,
				}),
			],
		}),
	};

	node.markers = markers;
	return node;
}

/**
 * The same sequence laid horizontally, for a flow that reads left to right.
 * The rail is derived the same way, on the other axis.
 */
export function railFlow({
	items,
	activeTo = -1,
	markerSize = space(2),
	gap = 4, // between steps
	itemGap = 2, // inside one step
	accent = COLOR.red,
	quiet = COLOR.black2,
} = {}) {
	if (!items || items.length < 2) {
		throw new Error("railFlow needs at least two items.");
	}

	const markers = [];

	const cols = items.map((item, i) => {
		const dot = marker({
			size: markerSize,
			fill: i <= activeTo ? accent : quiet,
			ring: i > activeTo,
		});
		markers.push(dot);
		return stack({
			gap: itemGap,
			grow: true,
			unit: true,
			children: [
				dot,
				text(item.name, "list", { color: COLOR.text }),
				item.detail ? text(item.detail, "body", { color: COLOR.muted, commentary: true }) : null,
			],
		});
	});

	const node = row({ gap, align: "start", children: cols });

	node.press = {
		connect: () => ({
			rails: [
				deriveRail(markers, {
					axis: "x",
					weight: STROKE.connector,
					color: quiet,
				}),
			],
		}),
	};

	node.markers = markers;
	return node;
}
