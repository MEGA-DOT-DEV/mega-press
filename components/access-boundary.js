
/**
 * PRESS / components / access boundary
 *
 * Ordered trust regions containing aligned boxes. Authors name regions, boxes,
 * and semantic relationships; this component owns every enclosure, track,
 * route, port, and terminal.
 */

import { routedLink } from "../src/connect.js";
import { Rect } from "../src/geometry.js";
import { box, custom, measureNode, placeNode, row, stack, text } from "../src/solve.js";
import { COLOR, DASH, STROKE, space, UNIT } from "../src/tokens.js";

const EDGE_STYLE = {
	flow: { color: COLOR.zinc, terminal: "arrow" },
	controlled: { color: COLOR.blueText, terminal: "arrow" },
	review: { color: COLOR.blueText, terminal: "review", dash: DASH.technical },
	denied: { color: COLOR.red, terminal: "denied" },
	reference: { color: COLOR.zinc, terminal: "none", dash: DASH.technical },
};

const VERTICAL_FACE = new Set(["left", "right"]);
const ROUTE_STUB = space(3);
const ROUTE_CLEARANCE = space(2);

/**
 * Turn a solved connector's interior runs into derived obstacles for the
 * connectors that follow it. The first and last runs are omitted so several
 * relationships can still share a source or target face through distinct
 * ports; every route between those stubs gets its own corridor.
 */
const occupiedRuns = (link, routeIndex) => {
	const runs = [];
	for (let i = 2; i < link.points.length - 1; i++) {
		const from = link.points[i - 1];
		const to = link.points[i];
		const thickness = STROKE.connector;
		const horizontal = Math.abs(from.y - to.y) < 0.01;
		const rect = horizontal
			? Rect.of(
					Math.min(from.x, to.x),
					from.y - thickness / 2,
					Math.abs(to.x - from.x),
					thickness,
				)
			: Rect.of(
					from.x - thickness / 2,
					Math.min(from.y, to.y),
					thickness,
					Math.abs(to.y - from.y),
				);
		if (rect.w > 0 && rect.h > 0) runs.push({ key: `route-${routeIndex}-${i}`, rect });
	}
	return runs;
};

/** Equal cells in one region, flowing across or stacking down. */
const equalFlow = (children, dir, sharedHeight) => {
	const gapStep = 1;
	let layout = null;
	return custom({
		children,
		measure: (availW) => {
			const gap = space(gapStep);
			const childW = dir === "x" ? (availW - gap * (children.length - 1)) / children.length : availW;
			const measured = Math.max(...children.map((child) => measureNode(child, childW).h));
			sharedHeight.value = Math.max(sharedHeight.value, measured);
			const height = sharedHeight.value;
			layout = { childW, height, gap };
			return {
				w: availW,
				h: dir === "x" ? height : height * children.length + gap * (children.length - 1),
			};
		},
		place: (rect, ctx) => {
			if (!layout) throw new Error("accessBoundary equal flow was placed before it measured");
			children.forEach((child, index) => {
				const x = dir === "x" ? rect.x + index * (layout.childW + layout.gap) : rect.x;
				const y = dir === "y" ? rect.y + index * (layout.height + layout.gap) : rect.y;
				placeNode(child, Rect.of(x, y, layout.childW, layout.height), ctx);
			});
		},
	});
};

const gateInk = (kind) =>
	kind === "controlled" || kind === "review" ? COLOR.blueText : kind === "denied" ? COLOR.red : COLOR.muted;

/**
 * @param {object[]} regions ordered {key, label, boxes:[{key,title,detail?}]}
 * @param {object[]} edges {from,to,kind,gate?}
 * @param {string} dir x = region columns; y = region rows
 */
export function accessBoundary({ regions = [], edges = [], dir = "x" } = {}) {
	if (dir !== "x" && dir !== "y") {
		throw new Error("accessBoundary dir must resolve to x or y before rendering");
	}
	if (regions.length < 2) throw new Error("accessBoundary needs at least two ordered regions");

	const regionOf = new Map();
	regions.forEach((region, regionIndex) => {
		for (const spec of region.boxes) regionOf.set(spec.key, regionIndex);
	});

	const outgoingGates = new Map();
	for (const edge of edges) {
		if (!edge.gate) continue;
		const entries = outgoingGates.get(edge.from) || [];
		entries.push({ text: edge.gate, kind: edge.kind });
		outgoingGates.set(edge.from, entries);
	}

	const byKey = {};
	const labelNodes = [];
	const sharedCellHeight = { value: 0 };
	const regionNodes = regions.map((region) => {
		const cells = region.boxes.map((spec) => {
			const gates = outgoingGates.get(spec.key) || [];
			const cell = box({
				pad: 2,
				border: true,
				borderColor: COLOR.black2,
				fill: COLOR.raised,
				gap: 1,
				children: [
					text(spec.title, "head", { color: COLOR.text }),
					spec.detail ? text(spec.detail, "body", { color: COLOR.muted, commentary: true }) : null,
					...gates.map((gate) =>
						text(gate.text.toUpperCase(), "utility", {
							color: gateInk(gate.kind),
							maxLines: 1,
						}),
					),
				],
			});
			cell.key = spec.key;
			cell.accessBoxKey = spec.key;
			byKey[spec.key] = cell;
			return cell;
		});
		const label = text(region.label.toUpperCase(), "utility", {
			color: COLOR.quiet,
			maxLines: dir === "y" ? 2 : 1,
			width: dir === "y" ? space(5) * 4 : undefined,
		});
		label.accessRegionLabel = region.key;
		labelNodes.push(label);

		const cellsFlow = equalFlow(cells, dir === "x" ? "y" : "x", sharedCellHeight);
		if (dir === "y") cellsFlow.grow = true;
		const content =
			dir === "y"
				? row({ gap: 2, align: "start", children: [label, cellsFlow] })
				: stack({ gap: 2, align: "stretch", children: [label, cellsFlow] });

		const enclosure = box({
			pad: 2,
			border: true,
			borderColor: COLOR.black2,
			fill: COLOR.panel,
			gap: 1,
			unit: true,
			children: [content],
		});
		enclosure.accessRegionKey = region.key;
		if (dir === "x") enclosure.grow = true;
		return enclosure;
	});

	const node =
		dir === "x"
			? row({ gap: 4, align: "stretch", children: regionNodes })
			: stack({ gap: 4, align: "stretch", children: regionNodes });

	const resolved = edges.map((edge, index) => {
		const from = byKey[edge.from];
		const to = byKey[edge.to];
		if (!from || !to) throw new Error(`accessBoundary edge ${edge.from} to ${edge.to} has an unknown endpoint`);
		const fromRegion = regionOf.get(edge.from);
		const toRegion = regionOf.get(edge.to);
		const forward = fromRegion < toRegion;
		const anchors =
			dir === "x"
				? forward
					? { fromAnchor: "right", toAnchor: "left" }
					: { fromAnchor: "left", toAnchor: "right" }
				: forward
					? { fromAnchor: "bottom", toAnchor: "top" }
					: { fromAnchor: "top", toAnchor: "bottom" };
		return { edge, index, from, to, ...anchors };
	});

	const assignPorts = () => {
		const faces = new Map();
		const add = (key, face, entry) => {
			const id = `${key}|${face}`;
			if (!faces.has(id)) faces.set(id, { face, entries: [] });
			faces.get(id).entries.push(entry);
		};
		for (const item of resolved) {
			add(item.edge.from, item.fromAnchor, { item, end: "from", other: item.to });
			add(item.edge.to, item.toAnchor, { item, end: "to", other: item.from });
		}
		const fromPorts = [];
		const toPorts = [];
		for (const { face, entries } of faces.values()) {
			const vertical = VERTICAL_FACE.has(face);
			entries.sort(
				(a, b) =>
					(vertical ? a.other.rect.cy - b.other.rect.cy : a.other.rect.cx - b.other.rect.cx) ||
					a.item.index - b.item.index,
			);
			entries.forEach((entry, index) => {
				(entry.end === "from" ? fromPorts : toPorts)[entry.item.index] = {
					index,
					count: entries.length,
				};
			});
		}
		return { fromPorts, toPorts };
	};

	node.press = {
		connect: () => {
			const { fromPorts, toPorts } = assignPorts();
			const links = [];
			const occupied = [];
			for (const item of resolved) {
				const style = EDGE_STYLE[item.edge.kind];
				const link = routedLink(item.from, item.to, {
					fromAnchor: item.fromAnchor,
					toAnchor: item.toAnchor,
					fromPort: fromPorts[item.index],
					toPort: toPorts[item.index],
					stub: ROUTE_STUB,
					clearance: ROUTE_CLEARANCE,
					avoid: [
						...Object.values(byKey).filter((cell) => cell !== item.from && cell !== item.to),
						...labelNodes,
						...occupied,
					],
					color: style.color,
					weight: STROKE.connector,
					arrow: style.terminal === "arrow" || style.terminal === "review",
					names: { from: item.edge.from, to: item.edge.to },
				});
				links.push({
					...link,
					terminal: style.terminal,
					// Allowed heads land in the target region's padding, just above the
					// inner box. Denied stops before that enclosure: pad + border + a
					// unit of clearance, so the T-cap sits in the inter-region channel
					// and the destination stroke never cuts it.
					terminalInset:
						style.terminal === "denied"
							? space(2) + STROKE.divider + UNIT
							: style.terminal === "arrow" || style.terminal === "review"
								? UNIT
								: 0,
					arrowheadStyle:
						style.terminal === "arrow" || style.terminal === "review" ? "chevron" : null,
					dash: style.dash || null,
					semanticKind: item.edge.kind,
				});
				occupied.push(...occupiedRuns(link, item.index));
			}
			return { links };
		},
	};

	node.accessDir = dir;
	node.byKey = byKey;
	node.regionNodes = regionNodes;
	return node;
}
