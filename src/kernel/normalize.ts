/**
 * Coerce model/catalog plate JSON toward lab press shapes before lock/build.
 */
import { ALLOWED_COMPONENTS } from "./vocabulary.js";

const TYPE_ALIASES: Record<string, string> = {
	callout: "note",
	"call-out": "note",
	aside: "note",
	calloutbox: "note",
	info: "note",
	infobox: "note",
	alert: "note",
	banner: "note",
	tip: "note",
	warning: "note",
	steps: "railSteps",
	stepper: "railSteps",
	process: "railSteps",
	rail: "railSteps",
	comparison: "compare",
	vs: "compare",
	metric: "metrics",
	stat: "metrics",
	stats: "metrics",
	kpi: "metrics",
	kpis: "metrics",
	card: "cards",
	todo: "checklist",
	bar: "bars",
	barchart: "bars",
	pie: "segments",
	layer: "layers",
	quoteblock: "quote",
	blockquote: "quote",
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v);

const aliasType = (type: string): string => {
	const key = type.trim();
	const lower = key.toLowerCase().replace(/\s+/g, "");
	if (TYPE_ALIASES[lower]) return TYPE_ALIASES[lower];
	if ((ALLOWED_COMPONENTS as readonly string[]).includes(key)) return key;
	const hit = (ALLOWED_COMPONENTS as readonly string[]).find((a) => a.toLowerCase() === lower);
	return hit ?? key;
};

const sideToCompareColumn = (
	side: unknown,
	fallbackLabel: string,
): Record<string, unknown> | null => {
	if (!isRecord(side)) return null;
	const title = String(side.title ?? side.label ?? fallbackLabel);
	const label = String(side.label ?? fallbackLabel).toUpperCase();
	let items: string[] = [];
	if (Array.isArray(side.items)) {
		items = side.items.map((i) =>
			typeof i === "string" ? i : String((i as { text?: string }).text ?? i),
		);
	} else {
		const blob = side.body ?? side.text ?? side.detail ?? side.description;
		if (blob != null && String(blob).trim()) {
			items = String(blob)
				.split(/(?<=\.)\s+/)
				.map((s) => s.trim())
				.filter(Boolean);
			if (items.length === 0) items = [String(blob)];
		}
	}
	if (items.length === 0) items = [title];
	return { label, title, items };
};

function normalizeNode(node: unknown): unknown {
	if (!isRecord(node)) return node;
	const out: Record<string, unknown> = { ...node };
	if (typeof out.type === "string") out.type = aliasType(out.type);
	const type = String(out.type ?? "");

	if (type === "note") {
		if (out.content == null) {
			const c = out.body ?? out.text ?? out.md ?? out.message;
			if (c != null) out.content = c;
		}
		delete out.body;
		delete out.text;
		delete out.md;
		delete out.message;
	}

	if (type === "hero") {
		if (out.caption == null) {
			const c = out.label ?? out.unit ?? out.title;
			if (c != null) out.caption = String(c);
		}
	}

	if (type === "quote") {
		if (out.text == null && out.body != null) out.text = out.body;
		if (out.attribution == null && out.author != null) out.attribution = out.author;
		if (out.attribution == null) out.attribution = "MEGA";
	}

	if (type === "compare") {
		if (out.before == null && out.left != null) {
			out.before = sideToCompareColumn(out.left, "BEFORE");
		} else if (out.before != null) {
			out.before = sideToCompareColumn(out.before, "BEFORE");
		}
		if (out.after == null && out.right != null) {
			out.after = sideToCompareColumn(out.right, "AFTER");
		} else if (out.after != null) {
			out.after = sideToCompareColumn(out.after, "AFTER");
		}
		delete out.left;
		delete out.right;
	}

	if (type === "railSteps" && Array.isArray(out.items)) {
		out.items = out.items.map((item, i) => {
			if (!isRecord(item)) return { name: String(item), detail: "" };
			const row = { ...item };
			if (row.name == null) row.name = row.title ?? row.label ?? `Step ${i + 1}`;
			if (row.detail == null) row.detail = row.body ?? row.description ?? row.text ?? "";
			delete row.title;
			delete row.label;
			delete row.body;
			return row;
		});
	}

	if (type === "cards" && Array.isArray(out.items)) {
		out.items = out.items.map((item) => {
			if (!isRecord(item)) return { title: String(item) };
			const row = { ...item };
			if (row.title == null) row.title = row.label ?? "Card";
			if (row.body == null && row.detail != null) row.body = row.detail;
			return row;
		});
	}

	if (type === "checklist" && Array.isArray(out.items)) {
		out.items = out.items.map((item) => {
			if (!isRecord(item)) return { text: String(item), ok: true };
			const row = { ...item };
			if (row.text == null) row.text = row.label ?? row.title ?? row.body ?? "";
			if (row.ok == null) row.ok = true;
			return row;
		});
	}

	if (type === "layers" && Array.isArray(out.items)) {
		out.items = out.items.map((item) => {
			if (!isRecord(item)) return { title: String(item) };
			const row = { ...item };
			if (row.title == null) row.title = row.label ?? "Layer";
			if (row.detail == null && row.body != null) row.detail = row.body;
			return row;
		});
	}

	if (type === "metrics" && Array.isArray(out.items)) {
		out.items = out.items.map((item) => {
			if (!isRecord(item)) return item;
			const row = { ...item };
			if ((row.unit == null || row.unit === "") && row.value != null) row.unit = "count";
			return row;
		});
	}

	if ((type === "stack" || type === "row") && Array.isArray(out.children)) {
		const kids = out.children
			.map((c) => coerceChild(c))
			.filter((c): c is Record<string, unknown> => c != null);
		if (kids.length === 0) {
			return {
				type: "note",
				content: "Supporting detail for the claim in the title.",
			};
		}
		if (kids.length === 1 && type === "stack") return kids[0];
		out.children = kids;
	}

	return out;
}

/** Every stack/row child must become a real component node or be dropped. */
function coerceChild(child: unknown): Record<string, unknown> | null {
	if (child == null || child === false) return null;
	if (typeof child === "string") {
		const s = child.trim();
		return s ? { type: "note", content: s } : null;
	}
	if (typeof child === "number" || typeof child === "boolean") {
		return { type: "note", content: String(child) };
	}
	if (Array.isArray(child)) {
		const parts = child
			.map((c) => coerceChild(c))
			.filter((c): c is Record<string, unknown> => c != null);
		if (parts.length === 0) return null;
		if (parts.length === 1) return parts[0] ?? null;
		return { type: "stack", gap: 2, children: parts };
	}
	if (!isRecord(child)) return null;

	const node = normalizeNode(child);
	if (!isRecord(node)) return null;

	if (typeof node.type !== "string" || !String(node.type).trim()) {
		if (
			typeof node.content === "string" ||
			typeof node.body === "string" ||
			typeof node.text === "string"
		) {
			return {
				type: "note",
				content: String(node.content ?? node.body ?? node.text),
			};
		}
		if (typeof node.title === "string") {
			return {
				type: "note",
				content: String(node.body ?? node.detail ?? node.title),
			};
		}
		if (Array.isArray(node.items)) {
			const n = normalizeNode({ type: "cards", items: node.items });
			return isRecord(n) ? n : null;
		}
		return null;
	}
	return node;
}

const stripDashes = (value: unknown): unknown => {
	if (typeof value === "string") return value.replace(/[\u2013\u2014]/g, ",");
	if (Array.isArray(value)) return value.map(stripDashes);
	if (isRecord(value)) {
		const o: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) o[k] = stripDashes(v);
		return o;
	}
	return value;
};

export function normalizePlateSpec(raw: unknown): Record<string, unknown> {
	if (!isRecord(raw)) return {};
	const spec: Record<string, unknown> = { ...raw };

	if (typeof spec.frame === "string") {
		const f = spec.frame.toLowerCase();
		if (f === "wide" || f === "landscape") spec.frame = "landscape";
		else if (f === "tall" || f === "portrait") spec.frame = "portrait";
		else if (f === "box" || f === "square") spec.frame = "square";
	}

	if (spec.title == null || String(spec.title).trim() === "") {
		if (typeof spec.claim === "string") spec.title = spec.claim;
		else if (typeof spec.heading === "string") spec.title = spec.heading;
	}

	if (spec.id == null || String(spec.id).trim() === "") {
		spec.id = `plate-${Date.now().toString(36)}`;
	}

	// Footer brand needs room
	if (typeof spec.footnote === "string") {
		const f = spec.footnote.trim();
		spec.footnote = f.length > 36 ? "SPECIMEN" : f || "SPECIMEN";
	} else {
		spec.footnote = "SPECIMEN";
	}

	if (spec.body == null) {
		if (typeof spec.type === "string" && spec.type !== "plate") {
			const {
				id: _id,
				frame: _frame,
				kicker: _k,
				title: _t,
				lead: _l,
				footnote: _f,
				number: _n,
				layout: _layout,
				gap: _gap,
				...rest
			} = spec;
			spec.body = rest;
		}
	}
	if (typeof spec.body === "string") {
		spec.body = { type: "note", content: spec.body };
	} else if (Array.isArray(spec.body)) {
		spec.body = {
			type: "stack",
			gap: 3,
			children: spec.body,
		};
	} else if (isRecord(spec.body)) {
		const b = spec.body;
		if (b.type == null && Array.isArray(b.children)) {
			b.type = "stack";
			spec.body = b;
		}
		if (b.type == null && Array.isArray(b.items)) {
			const first = b.items[0];
			b.type =
				first && typeof first === "object" && first !== null && "value" in first
					? "metrics"
					: "cards";
			spec.body = b;
		}
	}

	if (spec.body != null) spec.body = normalizeNode(spec.body);

	// Drop empty optional chrome — press text() refuses "" (TEXT_MISSING).
	for (const key of ["kicker", "lead", "number"] as const) {
		const v = spec[key];
		if (v === undefined || v === null) continue;
		if (typeof v === "string" && v.trim() === "") delete spec[key];
	}
	if (typeof spec.footnote === "string" && spec.footnote.trim() === "") {
		spec.footnote = "SPECIMEN";
	}

	return stripDashes(spec) as Record<string, unknown>;
}
