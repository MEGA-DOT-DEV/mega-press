import { marked, Renderer } from "../../vendor/marked/marked.esm.mjs";

const WORDS_PER_MINUTE = 180;
const META_KEYS = new Map([
	["title", "title"],
	["description", "description"],
	["kicker", "kicker"],
	["ogimage", "ogImage"],
	["og-image", "ogImage"],
	["og_image", "ogImage"],
	["layout", "layout"],
]);

/* The default layout is continuous prose. SYLLABUS is the one named
   alternative: an agenda where every H3 is a lesson the reader opens on
   demand, so a long curriculum stays scannable instead of unrolling. */
const LAYOUTS = new Set(["article", "syllabus"]);

const own = (object, key) => Object.hasOwn(object || {}, key);

export function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function parseScalar(raw) {
	const value = raw.trim();
	if (!value) return "";
	if (value.startsWith('"') && value.endsWith('"')) {
		try {
			return JSON.parse(value);
		} catch {
			return value.slice(1, -1);
		}
	}
	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1).replace(/''/g, "'");
	}
	return value;
}

export function parseFrontMatter(markdown) {
	const source = String(markdown ?? "").replace(/\r\n?/g, "\n");
	const errors = [];
	if (!source.startsWith("---\n")) {
		return { source, body: source, data: {}, raw: "", bodyLineOffset: 0, errors };
	}

	const lines = source.split("\n");
	const close = lines.slice(1).findIndex((line) => line.trim() === "---");
	if (close < 0) {
		errors.push({
			code: "FRONT_MATTER_INVALID",
			message: "Front matter opens with --- but has no closing --- fence.",
			line: 1,
		});
		return { source, body: source, data: {}, raw: "", bodyLineOffset: 0, errors };
	}

	const closeIndex = close + 1;
	const data = {};
	for (let i = 1; i < closeIndex; i++) {
		const line = lines[i];
		if (!line.trim() || line.trimStart().startsWith("#")) continue;
		const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
		if (!match || ["|", ">"].includes(match?.[2]?.trim())) {
			errors.push({
				code: "FRONT_MATTER_INVALID",
				message: "Article front matter supports one-line key: value fields only.",
				line: i + 1,
			});
			continue;
		}
		const canonical = META_KEYS.get(match[1].toLowerCase()) || match[1];
		data[canonical] = parseScalar(match[2]);
	}

	return {
		source,
		body: lines.slice(closeIndex + 1).join("\n"),
		data,
		raw: `${lines.slice(0, closeIndex + 1).join("\n")}\n`,
		bodyLineOffset: closeIndex + 1,
		errors,
	};
}

function childTokens(token) {
	const children = [];
	if (Array.isArray(token?.items)) {
		for (const item of token.items) children.push(item);
	}
	if (Array.isArray(token?.tokens)) children.push(...token.tokens);
	if (token?.type === "table") {
		for (const cell of token.header || []) children.push(...(cell.tokens || []));
		for (const row of token.rows || []) {
			for (const cell of row) children.push(...(cell.tokens || []));
		}
	}
	return children;
}

function walk(tokens, visit) {
	for (const token of tokens || []) {
		visit(token);
		walk(childTokens(token), visit);
	}
}

function decodeEntities(value) {
	return String(value)
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(parseInt(decimal, 10)))
		.replace(/&quot;/g, '"')
		.replace(/&apos;|&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");
}

function plainInline(tokens) {
	let output = "";
	for (const token of tokens || []) {
		if (token.type === "image" || token.type === "html") continue;
		const children = childTokens(token);
		if (children.length) output += plainInline(children);
		else if (typeof token.text === "string") output += token.text;
	}
	return decodeEntities(output).replace(/\s+/g, " ").trim();
}

function readableText(tokens) {
	const parts = [];
	walk(tokens, (token) => {
		if (["image", "html", "code", "codespan"].includes(token.type)) return;
		const children = childTokens(token);
		if (!children.length && typeof token.text === "string") parts.push(token.text);
	});
	return decodeEntities(parts.join(" ")).replace(/\s+/g, " ").trim();
}

function wordCount(text) {
	return (String(text).match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).length;
}

function sourceLine(source, index, offset = 0) {
	return offset + source.slice(0, Math.max(0, index)).split("\n").length;
}

function locateInOrder(source, tokens, offset) {
	let cursor = 0;
	return tokens.map((token) => {
		const raw = String(token.raw || "");
		let index = raw ? source.indexOf(raw, cursor) : cursor;
		if (index < 0) index = source.indexOf(raw);
		if (index < 0) index = cursor;
		cursor = Math.max(cursor, index + raw.length);
		return { token, index, line: sourceLine(source, index, offset) };
	});
}

function slugBase(text) {
	const slug = String(text)
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "section";
}

function assignHeadingIds(entries) {
	const seen = new Map();
	return entries.map((entry) => {
		const text = plainInline(entry.token.tokens) || String(entry.token.text || "").trim();
		const base = slugBase(text);
		const count = seen.get(base) || 0;
		seen.set(base, count + 1);
		return { ...entry, text, depth: entry.token.depth, id: count ? `${base}-${count}` : base };
	});
}

function isPrivateIpv4(hostname) {
	const parts = hostname.split(".");
	if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part) || Number(part) > 255))
		return false;
	const [a, b] = parts.map(Number);
	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 198 && (b === 18 || b === 19)) ||
		a >= 224
	);
}

function isPublicHttps(value) {
	try {
		const url = new URL(String(value));
		const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
		if (url.protocol !== "https:" || url.username || url.password || !host) return false;
		if (
			host === "localhost" ||
			host.endsWith(".localhost") ||
			host.endsWith(".local") ||
			host.endsWith(".internal") ||
			isPrivateIpv4(host)
		)
			return false;
		if (
			host.includes(":") &&
			(host === "::" || host === "::1" || /^f[cd]/i.test(host) || /^fe[89ab]/i.test(host))
		)
			return false;
		return host.includes(".") || host.includes(":");
	} catch {
		return false;
	}
}

function safeLink(value) {
	const href = String(value || "").trim();
	if (/^(https?:|mailto:)/i.test(href)) return href;
	if (/^(#|\/(?!\/)|\.\.?\/)/.test(href)) return href;
	return null;
}

function truncateDescription(text, limit = 180) {
	const clean = String(text || "")
		.replace(/\s+/g, " ")
		.trim();
	if (clean.length <= limit) return clean;
	const clipped = clean.slice(0, limit + 1);
	const boundary = clipped.lastIndexOf(" ");
	return `${clipped.slice(0, boundary > limit * 0.65 ? boundary : limit).trim()}…`;
}

function firstProseParagraph(tokens) {
	for (const token of tokens) {
		if (token.type !== "paragraph") continue;
		const hasImage = (token.tokens || []).some((child) => child.type === "image");
		if (!hasImage) {
			const text = plainInline(token.tokens);
			if (text) return text;
		}
	}
	return "";
}

/* A slice of top-level tokens keeps the lexer's link table, so reference
   style links still resolve when a chunk is parsed on its own. */
function chunkOf(tokens, slice) {
	const chunk = slice;
	chunk.links = tokens.links || {};
	return chunk;
}

/* Fenced blocks. `::: ladder` marks a sequence whose indentation is the
   point: each item is one rung below the last. The fence is the only
   authored signal, and an unknown or unclosed one fails the check rather
   than printing a stray ::: into the page. */
const BLOCK_OPEN = /^:::[ \t]*([a-z][a-z0-9-]*)[ \t]*$/i;
const BLOCK_CLOSE = /^:::[ \t]*$/;
const BLOCK_NAMES = new Set(["ladder"]);

function markerText(token) {
	return token?.type === "paragraph" ? String(token.text || "").trim() : "";
}

function findBlocks(tokens) {
	const blocks = new Map();
	const markers = new Set();
	const errors = [];
	let index = 0;

	while (index < tokens.length) {
		const text = markerText(tokens[index]);

		if (BLOCK_CLOSE.test(text)) {
			markers.add(tokens[index]);
			errors.push({
				token: tokens[index],
				code: "ARTICLE_BLOCK_UNMATCHED",
				message: "A ::: fence closes a block that was never opened.",
			});
			index++;
			continue;
		}

		const open = text.match(BLOCK_OPEN);
		if (!open) {
			index++;
			continue;
		}

		markers.add(tokens[index]);
		const name = open[1].toLowerCase();
		let close = -1;
		for (let ahead = index + 1; ahead < tokens.length; ahead++) {
			const aheadText = markerText(tokens[ahead]);
			if (BLOCK_CLOSE.test(aheadText)) {
				close = ahead;
				break;
			}
			if (BLOCK_OPEN.test(aheadText)) break;
		}

		if (close < 0) {
			errors.push({
				token: tokens[index],
				code: "ARTICLE_BLOCK_UNCLOSED",
				message: `The ::: ${name} block has no closing ::: fence.`,
			});
			index++;
			continue;
		}

		markers.add(tokens[close]);
		const content = tokens.slice(index + 1, close).filter((token) => token.type !== "space");
		if (!BLOCK_NAMES.has(name)) {
			errors.push({
				token: tokens[index],
				code: "ARTICLE_BLOCK_UNKNOWN",
				message: `Unknown block: ${name}. The named blocks are ${[...BLOCK_NAMES].join(", ")}.`,
			});
		} else if (content.length !== 1 || content[0].type !== "list" || !content[0].ordered) {
			errors.push({
				token: tokens[index],
				code: "LADDER_NOT_A_SEQUENCE",
				message: "A ladder holds exactly one ordered list, one rung per item.",
			});
		} else {
			blocks.set(index, { name, list: content[0], close });
		}

		index = close + 1;
	}

	return { blocks, markers, errors };
}

/* One rung per item, each indented one step further than the last, so the
   sequence reads as a climb rather than a list of nine equal things. */
function renderLadder(list, parse, tokens) {
	const rungs = (list.items || []).map((item, position) => {
		const inner = parse(chunkOf(tokens, [...(item.tokens || [])]))
			.trim()
			.replace(/^<p>([\s\S]*)<\/p>$/, "$1");
		const step = String(position + 1).padStart(2, "0");
		return (
			`<li class="article-ladder__rung" style="--rung:${position}">` +
			`<span class="article-ladder__step">${step}</span>` +
			`<span class="article-ladder__text">${inner}</span></li>\n`
		);
	});
	return `<ol class="article-ladder">\n${rungs.join("")}</ol>\n`;
}

/* `**Goal:** ...` paragraph runs become one definition grid. The label is
   already escaped by the inline renderer, and anything with block content or
   an image inside is left as an ordinary paragraph. */
function briefRow(html) {
	const paragraph = html.trim().match(/^<p>([\s\S]*)<\/p>$/);
	if (!paragraph) return null;
	const row = paragraph[1].trim().match(/^<strong>([^<>]{1,48}?):<\/strong>\s*([\s\S]+)$/);
	if (!row) return null;
	const value = row[2].trim();
	if (!value || /<(?:p|ul|ol|img|div|dl|table|pre|blockquote)\b/i.test(value)) return null;
	return `<div class="article-brief__row"><dt>${row[1]}</dt><dd>${value}</dd></div>\n`;
}

/* A lesson bullet leads with the thing it covers. That lead reads as a key,
   so it takes the accent and the rest stays quiet. */
function keyLessonItems(html) {
	return html.replace(
		/(<li>(?:<p>)?)([^:<>]{2,40}:)(\s)/g,
		(_all, open, key, space) => `${open}<span class="article-lesson__key">${key}</span>${space}`,
	);
}

function lessonBlock(headingHtml, bodyHtml) {
	const labelled = headingHtml
		.trim()
		.replace(/^(<h3[^>]*>)([\s\S]*?)(<\/h3>)$/, (_all, open, inner, close) => {
			const split = inner.match(/^([^:<>]{2,32}):\s+([\s\S]+)$/);
			const title = split ? split[2] : inner;
			const code = split ? `<span class="article-lesson__code">${split[1]}</span>` : "";
			return `${open}${code}<span class="article-lesson__title">${title}</span>${close}`;
		});
	return (
		`<details class="article-lesson">\n` +
		`<summary class="article-lesson__summary">${labelled}</summary>\n` +
		`<div class="article-lesson__body">\n${keyLessonItems(bodyHtml)}</div>\n` +
		`</details>\n`
	);
}

/* Group top-level tokens into fenced blocks, lesson disclosures and brief
   grids. Chunks are parsed in document order through one renderer, so
   heading ids and image loading priorities stay identical to a single pass. */
function renderFlow(tokens, parse, { layout, blocks }) {
	const syllabus = layout === "syllabus";
	const isLesson = (token) => syllabus && token.type === "heading" && token.depth === 3;
	const output = [];
	let index = 0;

	while (index < tokens.length) {
		const block = blocks.get(index);
		if (block) {
			output.push(renderLadder(block.list, parse, tokens));
			index = block.close + 1;
			continue;
		}

		if (isLesson(tokens[index])) {
			const lessons = [];
			while (index < tokens.length && isLesson(tokens[index])) {
				const heading = tokens[index++];
				const start = index;
				while (
					index < tokens.length &&
					!(tokens[index].type === "heading" && tokens[index].depth <= 3)
				)
					index++;
				lessons.push(
					lessonBlock(
						parse(chunkOf(tokens, [heading])),
						parse(chunkOf(tokens, tokens.slice(start, index))),
					),
				);
			}
			output.push(`<div class="article-lessons">\n${lessons.join("")}</div>\n`);
			continue;
		}

		if (syllabus && tokens[index].type === "paragraph") {
			const rows = [];
			let ahead = index;
			/* The lexer puts a space token between blocks. It renders to nothing,
         so it never interrupts a run of brief paragraphs. */
			while (ahead < tokens.length) {
				if (tokens[ahead].type === "space") {
					ahead++;
					continue;
				}
				if (tokens[ahead].type !== "paragraph") break;
				const row = briefRow(parse(chunkOf(tokens, [tokens[ahead]])));
				if (!row) break;
				rows.push(row);
				ahead++;
			}
			if (rows.length >= 2) {
				output.push(`<dl class="article-brief">\n${rows.join("")}</dl>\n`);
				index = ahead;
				continue;
			}
		}

		output.push(parse(chunkOf(tokens, [tokens[index]])));
		index++;
	}

	return output.join("");
}

function renderMarkdown(tokens, headings, images, layout = "", blocks = new Map()) {
	const renderer = new Renderer();
	let headingIndex = 0;
	let imageIndex = 0;

	renderer.heading = (text, level) => {
		const heading = headings[headingIndex++] || { id: `section-${headingIndex}` };
		return `<h${level} id="${escapeHtml(heading.id)}">${text}</h${level}>\n`;
	};

	renderer.image = (href, title, text) => {
		const _image = images[imageIndex++];
		const alt = escapeHtml(text || "");
		if (!isPublicHttps(href)) {
			return `<span class="article-image-invalid" role="img" aria-label="${alt}">Image blocked: ${alt || "missing description"}</span>`;
		}
		const priority = imageIndex === 1 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
		const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
		return `<img data-article-image="true" class="article-image__media" ${priority} decoding="async" src="${escapeHtml(href)}" alt="${alt}"${titleAttr}>`;
	};

	renderer.paragraph = (text) => {
		const standalone = /^<img\b[^>]*data-article-image="true"[^>]*>$/.test(text.trim());
		return standalone ? `<p class="article-image">${text}</p>\n` : `<p>${text}</p>\n`;
	};

	renderer.link = (href, title, text) => {
		const safe = safeLink(href);
		if (!safe) return `<span>${text}</span>`;
		const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
		const external = /^https?:/i.test(safe) ? ' target="_blank" rel="noopener noreferrer"' : "";
		return `<a href="${escapeHtml(safe)}"${titleAttr}${external}>${text}</a>`;
	};

	renderer.html = (html, block) =>
		block
			? `<pre class="article-raw-html"><code>${escapeHtml(html)}</code></pre>\n`
			: escapeHtml(html);

	const parse = (chunk) => marked.parser(chunk, { renderer, gfm: true, breaks: false });
	return layout !== "syllabus" && !blocks.size
		? parse(tokens)
		: renderFlow(tokens, parse, { layout, blocks });
}

export function compileArticle(markdown, options = {}) {
	const front = parseFrontMatter(markdown);
	const errors = [...front.errors];
	let tokens = [];

	try {
		tokens = marked.lexer(front.body, { gfm: true });
	} catch (error) {
		errors.push({
			code: "MARKDOWN_PARSE",
			message: error.message,
			line: front.bodyLineOffset + 1,
		});
	}

	const all = [];
	walk(tokens, (token) => all.push(token));
	const rawHeadings = all.filter((token) => token.type === "heading");
	const rawImages = all.filter((token) => token.type === "image");
	const headings = assignHeadingIds(locateInOrder(front.body, rawHeadings, front.bodyLineOffset));
	const imageEntries = locateInOrder(front.body, rawImages, front.bodyLineOffset);

	const standaloneImages = new Set();
	for (const token of tokens) {
		if (token.type !== "paragraph") continue;
		const meaningful = (token.tokens || []).filter(
			(child) => child.type !== "text" || String(child.text || "").trim(),
		);
		if (
			meaningful.length === 1 &&
			meaningful[0].type === "image" &&
			token.raw.trim() === meaningful[0].raw.trim()
		) {
			standaloneImages.add(meaningful[0]);
		}
	}

	const images = imageEntries.map((entry) => ({
		...entry,
		src: entry.token.href,
		alt: entry.token.text,
		standalone: standaloneImages.has(entry.token),
	}));

	const { blocks, markers, errors: blockErrors } = findBlocks(tokens);
	if (blockErrors.length) {
		const lines = new Map(
			locateInOrder(front.body, tokens, front.bodyLineOffset).map((entry) => [
				entry.token,
				entry.line,
			]),
		);
		for (const error of blockErrors) {
			const { token, ...rest } = error;
			errors.push({ ...rest, line: lines.get(token) || front.bodyLineOffset + 1 });
		}
	}

	const topHeadingTokens = new Set(tokens.filter((token) => token.type === "heading"));
	const structuralHeadings = headings.filter((heading) => topHeadingTokens.has(heading.token));
	const h1s = structuralHeadings.filter((heading) => heading.depth === 1);
	if (h1s.length !== 1) {
		errors.push({
			code: "ARTICLE_H1_COUNT",
			message: `An article needs exactly one H1. Found ${h1s.length}.`,
			line: h1s[1]?.line || h1s[0]?.line || front.bodyLineOffset + 1,
		});
	}

	if (structuralHeadings.length && structuralHeadings[0].depth !== 1) {
		errors.push({
			code: "HEADING_HIERARCHY",
			message: `The first structural heading must be H1. Found H${structuralHeadings[0].depth}.`,
			line: structuralHeadings[0].line,
		});
	}
	for (let i = 1; i < structuralHeadings.length; i++) {
		if (structuralHeadings[i].depth > structuralHeadings[i - 1].depth + 1) {
			errors.push({
				code: "HEADING_HIERARCHY",
				message: `Heading level jumps from H${structuralHeadings[i - 1].depth} to H${structuralHeadings[i].depth}.`,
				line: structuralHeadings[i].line,
			});
		}
	}

	for (const image of images) {
		if (!String(image.alt || "").trim()) {
			errors.push({
				code: "IMAGE_ALT_MISSING",
				message: "Every article image needs descriptive alternative text.",
				line: image.line,
			});
		}
		if (!isPublicHttps(image.src)) {
			errors.push({
				code: "IMAGE_SRC_NOT_HTTPS",
				message: `Article images must use a public HTTPS URL. Found: ${image.src || "(empty)"}.`,
				line: image.line,
			});
		}
		if (!image.standalone) {
			errors.push({
				code: "IMAGE_NOT_STANDALONE",
				message: "Put each image in its own top-level Markdown paragraph.",
				line: image.line,
			});
		}
	}

	const derivedTitle = h1s[0]?.text || headings[0]?.text || "Untitled article";
	const frontMeta = {
		title: front.data.title || derivedTitle,
		description: front.data.description || truncateDescription(firstProseParagraph(tokens)),
		kicker: front.data.kicker || "ARTICLE",
		ogImage: front.data.ogImage || images[0]?.src || "",
	};
	const overrides = options.metadata || {};
	const metadata = { ...frontMeta };
	for (const key of ["title", "description", "kicker", "ogImage"]) {
		if (own(overrides, key)) metadata[key] = String(overrides[key] ?? "");
	}

	const requested = String(
		own(overrides, "layout") ? (overrides.layout ?? "") : (front.data.layout ?? ""),
	)
		.trim()
		.toLowerCase();
	if (requested && !LAYOUTS.has(requested)) {
		errors.push({
			code: "ARTICLE_LAYOUT_UNKNOWN",
			message: `Unknown article layout: ${requested}. Use ${[...LAYOUTS].join(" or ")}.`,
			line: 1,
		});
	}
	const layout = LAYOUTS.has(requested) && requested !== "article" ? requested : "";
	if (layout) metadata.layout = layout;

	if (metadata.ogImage && !isPublicHttps(metadata.ogImage)) {
		errors.push({
			code: "OG_IMAGE_NOT_HTTPS",
			message: `The Open Graph image must use a public HTTPS URL. Found: ${metadata.ogImage}.`,
			line: 1,
		});
	}

	/* A fence is structure, not prose, so it never counts toward reading time. */
	const count = wordCount(readableText(tokens.filter((token) => !markers.has(token))));
	const readingMinutes = Math.max(1, Math.ceil(count / WORDS_PER_MINUTE));
	const bodyHtml = renderMarkdown(tokens, headings, images, layout, blocks);
	const warnings = [];
	const report = { ok: errors.length === 0, errors, warnings };

	return {
		source: front.source,
		markdown: front.body,
		frontMatter: front.data,
		metadata,
		tokens,
		headings: headings.map(({ token, index, ...heading }) => heading),
		images: images.map(({ token, index, ...image }) => image),
		bodyHtml,
		wordCount: count,
		readingMinutes,
		report,
	};
}

export const ARTICLE_WORDS_PER_MINUTE = WORDS_PER_MINUTE;
