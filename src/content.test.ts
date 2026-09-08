import { describe, expect, it } from "vitest";
import { panel, schema } from "../components/content.js";
import { metrics } from "../components/data.js";
import { table } from "../components/table.js";
import { Rect } from "./geometry.js";
import { flatten, measureNode, solve, stack, text } from "./solve.js";
import { COLOR, CONTRAST, PressError, STROKE, contrast, space } from "./tokens.js";

type Node = ReturnType<typeof stack>;
const copy = (value: unknown) => structuredClone(value);
const texts = (node: Node): string[] => flatten(node)
	.filter((item: Node) => item.kind === "text")
	.map((item: Node) => item.text);
const place = (node: Node, width = 1000, x = 100, y = 80) =>
	solve(node, Rect.of(x, y, width, measureNode(node, width).h));
const refuse = (run: () => unknown, code: string) => {
	expect(run).toThrow(PressError);
	expect(run).toThrow(expect.objectContaining({ name: "PressError", code }));
};
const field = { id: "id", name: "id", type: "uuid" };

describe("panel", () => {
	it("uses canonical surfaces, roles and semantic metadata without recolouring a category", () => {
		const body = text("Keep this exact body.", "body", { color: COLOR.text });
		const node = panel({
			title: " Accounts ", label: "model.v2", body,
			category: "#ff00ff", id: "auth.accounts",
		});
		expect(node).toMatchObject({
			kind: "box", semanticId: "auth.accounts", category: "#ff00ff",
			fill: COLOR.raised, border: true, borderColor: COLOR.black2, pad: 4, unit: true,
		});
		expect(node.id).not.toBe(node.semanticId);
		expect(texts(node)).toEqual(["model.v2", " Accounts ", "Keep this exact body."]);
		expect(node.children.map((child: Node) => child.role)).toEqual(["utility", "head", "body"]);
		expect(node.children[2]).toBe(body);
		const { nodes } = place(node);
		expect(node.rect.contains(body.rect)).toBe(true);
		expect(body.rect.x).toBe(node.rect.x + space(4) + STROKE.divider);
		for (const child of nodes) {
			expect(child.kind).not.toBe("custom");
			expect(child.paint).toBeUndefined();
		}
	});

	it.each(["body", "children"])("accepts %s arrays without mutating even frozen compiled inputs", (slot) => {
		const first = Object.freeze(text("First", "body"));
		const second = Object.freeze(text("Second", "body"));
		const content = Object.freeze([first, second]);
		const options = Object.freeze({ [slot]: content });
		const before = copy(options);
		const node = panel(options);
		expect(options).toEqual(before);
		expect(node.children).not.toBe(content);
		expect(node.children).toEqual(content);
		expect(node.children[0]).toBe(first);
	});

	it.each(["table", "metrics"])("nests an existing %s tree and keeps its row/connector identities", (kind) => {
		const content = kind === "table" ? table({
			columns: [
				{ key: "label", label: "Name", type: "text", grow: true },
				{ key: "count", label: "Count", type: "number" },
			],
			rows: [{ label: "Accounts", count: 12 }, { label: "Sessions", count: 24 }],
		}) : metrics({ items: [
			{ label: "Accounts", value: 12, unit: "records" },
			{ label: "Sessions", value: 24, unit: "records" },
		] });
		const previousUnits = flatten(content).filter((node: Node) => node.unit).length;
		const nestedRows = content.bodyRows ?? content.rows;
		const hooks = content.press;
		const before = JSON.stringify(content);
		const node = panel({ title: "Storage", body: content });
		expect(JSON.stringify(content)).toBe(before);
		expect(node.children[1]).toBe(content);
		expect(content.press).toBe(hooks);
		const { nodes } = place(node);
		expect(nodes.filter((child: Node) => child.unit)).toHaveLength(previousUnits);
		for (const child of nestedRows) {
			expect(nodes).toContain(child);
			expect(child.rect).toBeInstanceOf(Rect);
			expect(content.rect.contains(child.rect)).toBe(true);
		}
		expect(hooks.connect().rules.length).toBeGreaterThan(0);
	});

	it("does not add wrapper units around a schema or another panel", () => {
		const inner = schema({ title: "Accounts", fields: [field] });
		const node = panel({ body: panel({ children: [inner] }) });
		const { nodes } = place(node);
		expect(nodes.filter((child: Node) => child.unit)).toEqual([inner]);
		expect(inner.ports.id).toBe(inner.bodyRows[0]);
		expect(inner.rect.contains(inner.ports.id.rect)).toBe(true);
	});

	it.each([
		[null, "PANEL_INVALID"],
		[[], "PANEL_INVALID"],
		[{}, "PANEL_CONTENT_REQUIRED"],
		[{ body: text("Body", "body"), children: [] }, "PANEL_CONTENT_REQUIRED"],
		[{ children: [] }, "PANEL_CONTENT_INVALID"],
		[{ children: "not compiled" }, "PANEL_CONTENT_INVALID"],
		[{ body: "not compiled" }, "PANEL_CONTENT_INVALID"],
		[{ body: null }, "PANEL_CONTENT_INVALID"],
		[{ body: { kind: "text", text: "raw spec", role: "body" } }, "PANEL_CONTENT_INVALID"],
		[{ body: { kind: "unknown", id: "n1" } }, "PANEL_CONTENT_INVALID"],
		[{ body: { kind: "stack", id: "n1", children: [null] } }, "PANEL_CONTENT_INVALID"],
		[{ body: { kind: "stack", id: "n1", children: "wrong" } }, "PANEL_CONTENT_INVALID"],
		[{ children: Array(1) }, "PANEL_CONTENT_INVALID"],
		[{ title: " ", body: text("Body", "body") }, "PANEL_TITLE_INVALID"],
		[{ label: 2, body: text("Body", "body") }, "PANEL_LABEL_INVALID"],
		[{ id: "", body: text("Body", "body") }, "PANEL_ID_INVALID"],
		[{ category: false, body: text("Body", "body") }, "PANEL_CATEGORY_INVALID"],
		[{ padding: 123, body: text("Body", "body") }, "PANEL_UNKNOWN_FIELD"],
	])("refuses malformed content/options %#", (options, code) => {
		refuse(() => panel(options), code as string);
	});

	it("refuses reused nodes and cycles rather than assigning a port two rectangles", () => {
		const repeated = text("Repeated", "body");
		refuse(() => panel({ children: [repeated, repeated] }), "PANEL_CONTENT_REUSED");
		const cyclic = stack({ children: [] });
		cyclic.children.push(cyclic);
		refuse(() => panel({ body: cyclic }), "PANEL_CONTENT_REUSED");
	});
});

describe("schema", () => {
	it("preserves authored strings, fields, order and explicit PK/FK/nullability as text", () => {
		const fields = [
			{ id: " account ", name: " account_id ", type: " UUID ", key: "primary", nullable: false },
			{ id: "owner", name: "Owner_ID", type: "varchar(255)", key: "foreign", nullable: true },
			{ id: "balance", name: "balance", type: "numeric(12, 4)" },
		];
		const node = schema({
			title: " Accounts ", subtitle: "billing.v2", fields,
			footer: "Keep exact authored identifiers.", id: "billing.accounts",
		});
		expect(node.semanticId).toBe("billing.accounts");
		expect(node.id).not.toBe(node.semanticId);
		expect(node.fields).toEqual(fields);
		expect(node.fields).not.toBe(fields);
		expect(node.bodyRows.map((child: Node) => child.portId)).toEqual(fields.map((item) => item.id));
		expect(texts(node)).toEqual([
			" Accounts ", "billing.v2", " account_id ", "PK", "NOT NULL", " UUID ",
			"Owner_ID", "FK", "NULL", "varchar(255)", "balance", "numeric(12, 4)",
			"Keep exact authored identifiers.",
		]);
		expect(texts(node.ports.balance)).toEqual(["balance", "numeric(12, 4)"]);
		const { nodes } = place(node);
		expect(nodes.filter((child: Node) => child.unit)).toEqual([node]);
		for (const child of nodes) {
			expect(["box", "stack", "text", "rule"]).toContain(child.kind);
			expect(child.paint).toBeUndefined();
			if (child.kind === "text") {
				expect(["body", "head", "utility", "code"]).toContain(child.role);
				expect(contrast(child.color, COLOR.raised)).toBeGreaterThanOrEqual(CONTRAST.text);
			}
		}
	});

	it("maps local named ports to actual solver rows and derives centres after reflow", () => {
		const fields = [
			{ id: "__proto__", name: "A descriptive field name that must wrap at a narrow measure", type: "text" },
			{ id: "constructor", name: "owner", type: "uuid", key: "foreign", nullable: false },
			{ id: "toString", name: "count", type: "integer", nullable: true },
		];
		const node = schema({ title: "Accounts", fields });
		expect(Object.getPrototypeOf(node.ports)).toBeNull();
		expect(Object.keys(node.ports)).toEqual(fields.map((item) => item.id));
		for (const field of fields) expect(node.ports[field.id].rect).toBeUndefined();
		const first = place(node, 1200);
		const wide = node.ports.__proto__.rect;
		for (const [index, field] of fields.entries()) {
			const port = node.ports[field.id];
			expect(port).toBe(node.bodyRows[index]);
			expect(first.nodes).toContain(port);
			expect(port).toMatchObject({ kind: "stack", dir: "x", portId: field.id, field });
			expect(port.rect).toBeInstanceOf(Rect);
			expect(port.rect.w).toBeGreaterThan(0);
			expect(port.rect.h).toBeGreaterThan(0);
			expect(node.rect.contains(port.rect)).toBe(true);
			expect(port.rect.cx).toBe(node.rect.cx);
			expect(port.rect.cy).toBe(port.rect.y + port.rect.h / 2);
			if (index > 0) expect(port.rect.top).toBeGreaterThan(node.bodyRows[index - 1].rect.bottom);
		}
		place(node, 600, 300, 200);
		expect(node.ports.__proto__.rect).not.toBe(wide);
		expect(node.ports.__proto__.rect.h).toBeGreaterThan(wide.h);
		expect(node.ports.__proto__.rect.x).toBe(300 + space(4) + STROKE.divider);
		expect(node.ports.__proto__.rect.cy).not.toBe(wide.cy);
		const sibling = schema({ title: "Other", fields: [fields[0]] });
		expect(sibling.ports.__proto__).not.toBe(node.ports.__proto__);
	});

	it("does not mutate frozen authored input during construction or solving", () => {
		const fields = Object.freeze([
			Object.freeze({ ...field, key: "primary", nullable: false }),
			Object.freeze({ id: "parent", name: "parent_id", type: "uuid", key: "foreign", nullable: true }),
		]);
		const options = Object.freeze({ title: "Accounts", fields, subtitle: "v2", footer: "Stable" });
		const before = copy(options);
		const node = schema(options);
		place(node);
		expect(options).toEqual(before);
		for (const [index, original] of fields.entries()) {
			expect(node.fields[index]).not.toBe(original);
			expect(node.ports[original.id].field).toEqual(original);
		}
	});

	it.each([
		[null, "SCHEMA_INVALID"],
		[[], "SCHEMA_INVALID"],
		[{}, "SCHEMA_TITLE_INVALID"],
		[{ title: "Accounts" }, "SCHEMA_FIELDS_INVALID"],
		[{ title: "Accounts", fields: [] }, "SCHEMA_FIELDS_INVALID"],
		[{ title: "Accounts", fields: {} }, "SCHEMA_FIELDS_INVALID"],
		[{ title: "Accounts", fields: Array(1) }, "SCHEMA_FIELD_INVALID"],
		[{ title: "Accounts", fields: [field], subtitle: null }, "SCHEMA_SUBTITLE_INVALID"],
		[{ title: "Accounts", fields: [field], footer: " " }, "SCHEMA_FOOTER_INVALID"],
		[{ title: "Accounts", fields: [field], id: 1 }, "SCHEMA_ID_INVALID"],
		[{ title: "Accounts", fields: [field], columns: [] }, "SCHEMA_UNKNOWN_FIELD"],
	])("refuses malformed schema options %#", (options, code) => {
		refuse(() => schema(options), code as string);
	});

	it.each([
		[null, "SCHEMA_FIELD_INVALID"],
		["field", "SCHEMA_FIELD_INVALID"],
		[[], "SCHEMA_FIELD_INVALID"],
		[{}, "SCHEMA_FIELD_ID_INVALID"],
		[{ ...field, id: " \t" }, "SCHEMA_FIELD_ID_INVALID"],
		[{ ...field, id: 42 }, "SCHEMA_FIELD_ID_INVALID"],
		[{ ...field, name: null }, "SCHEMA_FIELD_NAME_INVALID"],
		[{ ...field, name: " " }, "SCHEMA_FIELD_NAME_INVALID"],
		[{ ...field, type: "" }, "SCHEMA_FIELD_TYPE_INVALID"],
		[{ ...field, type: {} }, "SCHEMA_FIELD_TYPE_INVALID"],
		[{ ...field, key: "PK" }, "SCHEMA_FIELD_KEY_INVALID"],
		[{ ...field, key: null }, "SCHEMA_FIELD_KEY_INVALID"],
		[{ ...field, nullable: "false" }, "SCHEMA_FIELD_NULLABLE_INVALID"],
		[{ ...field, nullable: 0 }, "SCHEMA_FIELD_NULLABLE_INVALID"],
		[{ ...field, nullable: null }, "SCHEMA_FIELD_NULLABLE_INVALID"],
		[{ ...field, label: "unknown" }, "SCHEMA_FIELD_UNKNOWN_FIELD"],
		[{ ...field, x: 40 }, "SCHEMA_FIELD_UNKNOWN_FIELD"],
	])("refuses malformed or unknown field properties %#", (invalid, code) => {
		refuse(() => schema({ title: "Accounts", fields: [invalid] }), code as string);
	});

	it("refuses duplicate local IDs without mutating the failed input", () => {
		const options = { title: "Accounts", fields: [field, { ...field, name: "second" }] };
		const before = copy(options);
		refuse(() => schema(options), "SCHEMA_FIELD_ID_DUPLICATE");
		expect(options).toEqual(before);
	});
});
