/**
 * Deterministic PlatePlan from agent outline lines.
 * Prefer this over a second freeform LLM fill — outlines already carry the teaching units.
 */
import type { ArtifactModuleId } from "./artifactModules.js";
import type { PlatePlan } from "./platePlan.js";

const clean = (s: string) => s.replace(/^[-*•\d.)\]]+\s*/, "").trim();

const splitDash = (line: string): { left: string; right: string } => {
	const raw = clean(line);
	const m =
		raw.match(/^(.+?)\s+\u2014\s+(.+)$/) ||
		raw.match(/^(.+?)\s+\u2013\s+(.+)$/) ||
		raw.match(/^(.+?)\s+-\s+(.+)$/) ||
		raw.match(/^(.+?):\s+(.+)$/) ||
		raw.match(/^(.+?)\|\s*(.+)$/);
	if (m) return { left: m[1]?.trim() ?? raw, right: m[2]?.trim() ?? raw };
	return { left: raw.slice(0, 40), right: raw };
};

/** "AT | Title | detail" → three parts; the third is optional. */
const splitStop = (line: string): { at: string; title: string; detail?: string } => {
	const raw = clean(line);
	const parts = raw
		.split("|")
		.map((p) => p.trim())
		.filter(Boolean);
	if (parts.length >= 3) {
		return { at: parts[0] ?? raw, title: parts[1] ?? raw, detail: parts.slice(2).join(" | ") };
	}
	if (parts.length === 2) return { at: parts[0] ?? raw, title: parts[1] ?? raw };
	const { left, right } = splitDash(raw);
	return { at: left.slice(0, 16), title: right };
};

const slug = (s: string): string =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 24);

const parseDoAvoid = (line: string): { text: string; ok: boolean } => {
	const raw = clean(line);
	if (/^\[?\s*avoid/i.test(raw)) {
		return { text: raw.replace(/^\[?\s*avoid\]?\s*/i, ""), ok: false };
	}
	if (/^\[?\s*do\b/i.test(raw)) {
		return { text: raw.replace(/^\[?\s*do\]?\s*/i, ""), ok: true };
	}
	return { text: raw, ok: true };
};

const parseMetric = (line: string): { label: string; value: string; unit: string } | null => {
	const raw = clean(line);
	const m = raw.match(/^(.+?)\s*=\s*([^\s]+)\s+(.+)$/);
	if (m) {
		return {
			label: m[1]?.trim() ?? raw,
			value: m[2]?.trim() ?? raw,
			unit: m[3]?.trim() ?? "count",
		};
	}
	const m2 =
		raw.match(/^(.+?)\s+\u2014\s*([^\s]+)\s*(.*)$/) ||
		raw.match(/^(.+?)\s+\u2013\s*([^\s]+)\s*(.*)$/) ||
		raw.match(/^(.+?)\s*-\s*([^\s]+)\s*(.*)$/) ||
		raw.match(/^(.+?):\s*([^\s]+)\s*(.*)$/);
	if (m2) {
		return {
			label: m2[1]?.trim() ?? raw,
			value: m2[2]?.trim() ?? raw,
			unit: m2[3]?.trim() || "count",
		};
	}
	return null;
};

const parseBar = (line: string): { label: string; value: number } | null => {
	if (/^unit:/i.test(line) || /^total:/i.test(line)) return null;
	const raw = clean(line);
	const m = raw.match(/^(.+?)\s*=\s*(-?\d+(?:\.\d+)?)\s*$/);
	if (m) return { label: m[1]?.trim() ?? raw, value: Number(m[2] ?? Number.NaN) };
	return null;
};

export const outlineToPlatePlan = (input: {
	readonly kind: ArtifactModuleId;
	readonly title: string;
	readonly outline: readonly string[];
	readonly kicker?: string;
	readonly id?: string;
}): PlatePlan | null => {
	const lines = input.outline.map((l) => l.trim()).filter(Boolean);
	if (lines.length < 2) return null;
	const id =
		input.id ??
		`${input.kind}-${input.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 40)}`;

	const base = {
		kind: input.kind,
		id,
		title: input.title,
		...(input.kicker ? { kicker: input.kicker } : {}),
	};

	switch (input.kind) {
		case "railSteps": {
			const steps = lines.slice(0, 4).map((l) => {
				const { left, right } = splitDash(l);
				return {
					name: left.slice(0, 40),
					detail:
						right.length >= 12 ? right : `${right} Complete this step with a checkable result.`,
				};
			});
			if (steps.length < 4) return null; // max 4 — landscape safe area
			return { ...base, kind: "railSteps", steps };
		}
		case "compare": {
			const beforeItems: string[] = [];
			const afterItems: string[] = [];
			for (const l of lines) {
				const u = l.toUpperCase();
				const body = clean(l.replace(/^(before|after|chat|agent)[^:]*:\s*/i, ""));
				if (u.includes("BEFORE") || u.includes("CHAT") || u.startsWith("A)"))
					beforeItems.push(body);
				else if (u.includes("AFTER") || u.includes("AGENT") || u.startsWith("B)"))
					afterItems.push(body);
				else if (beforeItems.length <= afterItems.length) beforeItems.push(clean(l));
				else afterItems.push(clean(l));
			}
			if (beforeItems.length < 2 || afterItems.length < 2) return null;
			return {
				...base,
				kind: "compare",
				before: { label: "BEFORE", title: "Without the check", items: beforeItems.slice(0, 5) },
				after: { label: "AFTER", title: "With the check", items: afterItems.slice(0, 5) },
			};
		}
		case "metrics": {
			const metrics = lines.map(parseMetric).filter(Boolean) as {
				label: string;
				value: string;
				unit: string;
			}[];
			if (metrics.length < 3) return null;
			return { ...base, kind: "metrics", metrics: metrics.slice(0, 5) };
		}
		case "cards": {
			const cards = lines.slice(0, 4).map((l) => {
				const { left, right } = splitDash(l);
				return {
					title: left.slice(0, 48),
					body:
						right.length >= 40 ? right : `${right} Spell out the checkable part for the reader.`,
				};
			});
			if (cards.length < 3) return null;
			return { ...base, kind: "cards", cards };
		}
		case "checklist": {
			const checks = lines
				.slice(0, 6)
				.map(parseDoAvoid)
				.filter((c) => c.text.length >= 16);
			if (checks.length < 4) return null;
			return { ...base, kind: "checklist", checks };
		}
		case "table": {
			let colKeys = ["c0", "c1", "c2"];
			let colLabels = ["COL A", "COL B", "COL C"];
			const dataLines: string[] = [];
			for (const l of lines) {
				if (/^columns?:/i.test(l)) {
					const parts = l
						.replace(/^columns?:/i, "")
						.split("|")
						.map((s) => s.trim())
						.filter(Boolean);
					if (parts.length >= 2) {
						colLabels = parts.map((p) => p.toUpperCase());
						colKeys = parts.map((_, i) => `c${i}`);
					}
					continue;
				}
				dataLines.push(l);
			}
			const columns = colKeys.map((key, i) => ({
				key,
				label: colLabels[i] ?? `COL ${i + 1}`,
			}));
			const rows = dataLines.slice(0, 5).map((l) => {
				const cells = l.split("|").map((s) => clean(s));
				if (cells.length >= 2) {
					const row: Record<string, string> = {};
					colKeys.forEach((k, i) => {
						row[k] = cells[i] ?? "";
					});
					return row;
				}
				const { left, right } = splitDash(l);
				return { [colKeys[0] ?? "column-1"]: left, [colKeys[1] ?? "column-2"]: right };
			});
			if (rows.length < 3) return null;
			return { ...base, kind: "table", columns, rows };
		}
		case "layers": {
			const layers = lines.slice(0, 4).map((l) => {
				const { left, right } = splitDash(l);
				return {
					title: left.slice(0, 40),
					detail: right.length >= 24 ? right : `${right} State the dependency clearly.`,
				};
			});
			if (layers.length < 3) return null;
			return { ...base, kind: "layers", layers };
		}
		case "bars": {
			let unit = "share";
			const bars: { label: string; value: number }[] = [];
			for (const l of lines) {
				if (/^unit:/i.test(l)) {
					unit = clean(l.replace(/^unit:/i, ""));
					continue;
				}
				const b = parseBar(l);
				if (b) bars.push(b);
			}
			if (bars.length < 3) return null;
			return { ...base, kind: "bars", barUnit: unit, bars: bars.slice(0, 5) };
		}
		case "segments": {
			let unit = "share";
			let total: number | undefined;
			const segments: { label: string; value: number }[] = [];
			for (const l of lines) {
				if (/^unit:/i.test(l)) {
					unit = clean(l.replace(/^unit:/i, "").replace(/total:.*/i, ""));
					const tm = l.match(/total:\s*(\d+)/i);
					if (tm) total = Number(tm[1]);
					continue;
				}
				if (/^total:/i.test(l)) {
					total = Number(clean(l.replace(/^total:/i, ""))) || total;
					continue;
				}
				const b = parseBar(l);
				if (b) segments.push(b);
			}
			if (segments.length < 3) return null;
			const sum = segments.reduce((a, s) => a + s.value, 0);
			return {
				...base,
				kind: "segments",
				segmentUnit: unit,
				segmentTotal: total ?? sum,
				segments: segments.slice(0, 5),
			};
		}
		case "quadrant": {
			let xLabel = "LOW TO HIGH X";
			let yLabel = "LOW TO HIGH Y";
			const cells: { title: string; detail: string }[] = [];
			for (const l of lines) {
				if (/^axes?:/i.test(l)) {
					const m = l.match(/x\s*=\s*([^y]+)\s*y\s*=\s*(.+)/i);
					if (m) {
						xLabel = m[1]?.trim() ?? xLabel;
						yLabel = m[2]?.trim() ?? yLabel;
					}
					continue;
				}
				const { left, right } = splitDash(l);
				cells.push({
					title: left.replace(/^(TL|TR|BL|BR)\s*/i, "").slice(0, 40),
					detail: right.length >= 16 ? right : `${right} Place the option here.`,
				});
			}
			if (cells.length < 4) return null;
			return {
				...base,
				kind: "quadrant",
				xLabel,
				yLabel,
				quadrants: cells.slice(0, 4),
			};
		}
		case "timeline": {
			const stops = lines.slice(0, 5).map((l) => {
				const { at, title, detail } = splitStop(l);
				return { at: at.slice(0, 16), title, ...(detail ? { detail } : {}) };
			});
			if (stops.length < 3) return null;
			return { ...base, kind: "timeline", stops };
		}
		case "timelineVertical": {
			const events = lines.slice(0, 6).map((l) => {
				const { at, title, detail } = splitStop(l);
				return { at: at.slice(0, 16), title, ...(detail ? { detail } : {}) };
			});
			if (events.length < 3) return null;
			return { ...base, kind: "timelineVertical", events };
		}
		case "railFlow": {
			const steps = lines.slice(0, 5).map((l) => {
				const { left, right } = splitDash(l);
				return {
					name: left.slice(0, 24),
					detail: right.length >= 12 ? right : `${right} Complete this step with a checkable result.`,
				};
			});
			if (steps.length < 3) return null;
			return { ...base, kind: "railFlow", steps };
		}
		case "graph": {
			const nodes: { key: string; title: string; detail?: string }[] = [];
			const edges: { from: string; to: string }[] = [];
			for (const l of lines) {
				const raw = clean(l);
				const edge = raw.match(/^(.+?)\s*->\s*(.+)$/);
				if (edge) {
					edges.push({ from: slug(edge[1] ?? ""), to: slug(edge[2] ?? "") });
					continue;
				}
				const parts = raw
					.split("|")
					.map((p) => p.trim())
					.filter(Boolean);
				const title = parts[0] ?? raw;
				const detail = parts.slice(1).join(" | ");
				nodes.push({ key: slug(title), title, ...(detail ? { detail } : {}) });
			}
			if (nodes.length < 3 || edges.length < 2) return null;
			const keys = new Set(nodes.map((n) => n.key));
			if (edges.some((e) => !keys.has(e.from) || !keys.has(e.to))) return null;
			return { ...base, kind: "graph", nodes: nodes.slice(0, 7), edges: edges.slice(0, 10) };
		}
		case "derivation": {
			const exprs = lines.slice(0, 5).map((l) => {
				const raw = clean(l);
				const at = raw.indexOf("//");
				if (at === -1) return { expr: raw.trim() };
				const expr = raw.slice(0, at).trim();
				const note = raw.slice(at + 2).trim();
				return { expr, ...(note ? { note } : {}) };
			});
			if (exprs.length < 2) return null;
			if (exprs.some((s, i) => i > 0 && !s.note)) return null;
			return { ...base, kind: "derivation", exprs };
		}
		case "code": {
			// Code lines are verbatim: no bullet stripping, indentation is content.
			const source = input.outline.map((l) => l.replace(/\s+$/, ""));
			let codeLabel: string | undefined;
			const first = source[0] ?? "";
			const labelled = first.match(/^LABEL:\s*(.+)$/);
			if (labelled) {
				codeLabel = labelled[1]?.trim();
				source.shift();
			}
			while (source.length && !(source[0] ?? "").trim()) source.shift();
			while (source.length && !(source[source.length - 1] ?? "").trim()) source.pop();
			if (source.filter((l) => l.trim()).length < 2 || source.length > 14) return null;
			return {
				...base,
				kind: "code",
				code: source.join("\n"),
				...(codeLabel ? { codeLabel } : {}),
			};
		}
		default:
			return null;
	}
};
