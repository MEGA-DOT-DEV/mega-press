/**
 * Content blocks are ordinary solve trees. Their semantic identities never
 * replace solver ids, and named schema ports point at rows, not coordinates.
 */
import { box, row, rule, stack, text } from "../src/solve.js";
import { COLOR, PressError, STROKE, space } from "../src/tokens.js";
import { categoryColor } from "../src/theme.js";
import { measure } from "../src/text.js";

function record(value, allowed, code, where) {
	if (
		value === null || typeof value !== "object" || Array.isArray(value) ||
		![Object.prototype, null].includes(Object.getPrototypeOf(value))
	) {
		throw new PressError(`${code}_INVALID`, `${where} must be an object.`);
	}
	for (const key of Reflect.ownKeys(value)) {
		if (!allowed.includes(key)) {
			throw new PressError(`${code}_UNKNOWN_FIELD`, `${where} does not accept "${String(key)}".`);
		}
	}
}

function string(value, code, where, optional = false) {
	if (optional && value === undefined) return;
	if (typeof value !== "string" || !value.trim()) {
		throw new PressError(code, `${where} must be a nonempty string.`);
	}
}

// Validate the compiled tree without measuring it: measurement writes caches.
// Keep the original nodes and hooks so tables/metrics still connect their rows.
function compiledNode(node, seen) {
	if (
		!node || typeof node !== "object" || Array.isArray(node) ||
		typeof node.id !== "string" || !node.id.trim() ||
		!["stack", "grid", "box", "text", "rule", "spacer", "marker", "image", "custom"].includes(node.kind)
	) {
		throw new PressError("PANEL_CONTENT_INVALID", "panel content must contain compiled solve nodes.");
	}
	if (seen.has(node)) {
		throw new PressError("PANEL_CONTENT_REUSED", "A panel cannot place the same solve node twice or contain a cycle.");
	}
	seen.add(node);
	let hasUnit = Boolean(node.unit);
	if (["stack", "grid", "box"].includes(node.kind) || node.children !== undefined) {
		if (!Array.isArray(node.children)) {
			throw new PressError("PANEL_CONTENT_INVALID", "A compiled container needs a children array.");
		}
		for (const child of node.children) {
			const childHasUnit = compiledNode(child, seen);
			hasUnit = hasUnit || childHasUnit;
		}
	}
	return hasUnit;
}

const surface = (props) => box({
	pad: 4,
	gap: 1,
	fill: COLOR.raised,
	border: true,
	borderColor: COLOR.black2,
	...props,
});

/**
 * body accepts one compiled node or a nonempty array; children accepts the
 * array form. Supply exactly one. A wrapper adds a unit only when its content
 * has none, avoiding double-counting without mutating nested components.
 */
export function panel(options = {}, context = {}) {
	record(options, ["title", "label", "body", "children", "category", "id"], "PANEL", "panel");
	const { title, label, body, children, category, id } = options;
	for (const [key, value] of Object.entries({ title, label, category, id })) {
		string(value, `PANEL_${key.toUpperCase()}_INVALID`, `panel.${key}`, true);
	}
	if ((body !== undefined) === (children !== undefined)) {
		throw new PressError("PANEL_CONTENT_REQUIRED", "panel needs exactly one of body or children.");
	}
	const content = body !== undefined ? (Array.isArray(body) ? body : [body]) : children;
	if (!Array.isArray(content) || !content.length) {
		throw new PressError("PANEL_CONTENT_INVALID", "panel content must be a nonempty array of compiled nodes.");
	}
	const seen = new Set();
	let hasUnits = false;
	for (const child of content) {
		const childHasUnit = compiledNode(child, seen);
		hasUnits = hasUnits || childHasUnit;
	}
	const paletteEntry = context.categories?.get(category);
	return surface({
		semanticId: id,
		category,
		unit: !hasUnits,
		children: [
			label === undefined ? null : text(label, "utility", { color: COLOR.muted }),
			title === undefined ? null : text(title, "head", { color: paletteEntry ? categoryColor(paletteEntry.tone) : COLOR.text }),
			...content,
		],
	});
}

/**
 * fields: { id, name, type, key?: 'primary' | 'foreign', nullable?: boolean }[]
 * IDs are local to this schema, including names such as "__proto__". Missing
 * nullability stays unspecified: only an authored boolean prints a marker.
 */
export function schema(options = {}, context = {}) {
	record(options, ["title", "subtitle", "fields", "footer", "id"], "SCHEMA", "schema");
	const { title, subtitle, fields, footer, id } = options;
	string(title, "SCHEMA_TITLE_INVALID", "schema.title");
	for (const [key, value] of Object.entries({ subtitle, footer, id })) {
		string(value, `SCHEMA_${key.toUpperCase()}_INVALID`, `schema.${key}`, true);
	}
	if (!Array.isArray(fields) || !fields.length) {
		throw new PressError("SCHEMA_FIELDS_INVALID", "schema.fields needs at least one typed field.");
	}
	const ids = new Set();
	// Validate all fields before building, and retain copies rather than inputs.
	const authored = Array.from(fields, (field, index) => {
		const where = `schema.fields[${index}]`;
		record(field, ["id", "name", "type", "key", "nullable", "category"], "SCHEMA_FIELD", where);
		for (const key of ["id", "name", "type"]) {
			string(field[key], `SCHEMA_FIELD_${key.toUpperCase()}_INVALID`, `${where}.${key}`);
		}
		if (ids.has(field.id)) {
			throw new PressError("SCHEMA_FIELD_ID_DUPLICATE", `${where}.id repeats "${field.id}".`);
		}
		ids.add(field.id);
		if (field.key !== undefined && field.key !== "primary" && field.key !== "foreign") {
			throw new PressError("SCHEMA_FIELD_KEY_INVALID", `${where}.key must be primary or foreign.`);
		}
		if (field.nullable !== undefined && typeof field.nullable !== "boolean") {
			throw new PressError("SCHEMA_FIELD_NULLABLE_INVALID", `${where}.nullable must be a boolean.`);
		}
		if (field.category !== undefined && !context.categories?.has(field.category)) throw new PressError("SCHEMA_CATEGORY_UNKNOWN", `${where} references an unknown category.`);
		if (field.key === "primary" && field.nullable === true) throw new PressError("SCHEMA_PRIMARY_NULLABLE", "A primary key cannot be nullable.");
		return { ...field };
	});

	const typeWidth = Math.ceil(Math.max(...authored.map(field => measure(field.type, "code"))));
	const bodyRows = authored.map((field) => {
		const category = context.categories?.get(field.category);
		const ink = category ? categoryColor(category.tone) : COLOR.text;
		const markers = [
			field.key ? text(field.key === "primary" ? "PK" : "FK", "body", { color: ink, noWrap: true }) : null,
			field.nullable === undefined ? null : text(field.nullable ? "NULL" : "NOT NULL", "body", { color: COLOR.muted, noWrap: true }),
		].filter(Boolean);
		return row({
			gap: 2,
			align: "baseline",
			portId: field.id,
			category: field.category,
			field,
			children: [
				text(field.name, "code", { color: ink, grow: true, noWrap: !/\s/.test(field.name) }),
				markers.length ? row({ width: Math.ceil(markers.reduce((width, mark) => width + measure(mark.text, mark.role), 0) + space(1) * (markers.length - 1)), gap: 1, align: "baseline", children: markers }) : null,
				text(field.type, "code", { color: COLOR.muted, width: typeWidth, align: "right", noWrap: true }),
			].filter(Boolean),
		});
	});
	const node = surface({
		semanticId: id,
		unit: true,
		children: [
			text(title, "head", { color: COLOR.text }),
			subtitle === undefined ? null : text(subtitle, "body", { color: COLOR.muted }),
			rule({ color: COLOR.black2 }),
			stack({
				gap: 1,
				children: bodyRows.flatMap((fieldRow, index) => index === 0 ? [fieldRow] : [
					rule({ color: COLOR.black1, weight: STROKE.divider }), fieldRow,
				]),
			}),
			footer === undefined ? null : rule({ color: COLOR.black2 }),
			footer === undefined ? null : text(footer, "body", { color: COLOR.muted }),
		],
	});
	node.fields = authored;
	node.bodyRows = bodyRows;
	node.ports = Object.create(null);
	for (const fieldRow of bodyRows) node.ports[fieldRow.portId] = fieldRow;
	return node;
}
