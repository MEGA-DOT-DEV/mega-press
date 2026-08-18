import { compileArticle } from "./model.mjs";
import { articleFilename, renderStandalone } from "./render.mjs";

const SAMPLE = `# A new article

Paste Markdown here. The first paragraph becomes the lead and the article description when no metadata override is provided.

## A section

Use normal paragraphs, lists and standalone images with public HTTPS URLs.
`;

const META_KEYS = ["title", "description", "kicker", "ogImage"];
const VIEWPORTS = ["desktop", "mobile", "print"];

function field(root, key) {
	return root.querySelector(`[data-meta="${key}"]`);
}

function fetchText(url) {
	return fetch(url).then((response) => {
		if (!response.ok) throw new Error(`${url} returned ${response.status}`);
		return response.text();
	});
}

export function mountArticleMode(host, options = {}) {
	let destroyed = false;
	let timer = null;
	let fontsCss = "";
	let articleCss = "";
	let currentArticle = null;
	let previewSizer = null;
	let markdownDirty = false;
	let viewport = options.initialState?.viewport || "desktop";
	const metadataDirty = new Set(options.initialState?.metadataDirty || []);

	const root = document.createElement("section");
	root.className = "article-mode";
	root.innerHTML = `
    <div class="article-mode__workbench">
      <p class="article-mode__eyebrow">Continuous document / ARTICLE</p>
      <h1 class="article-mode__heading">Markdown to publication.</h1>
      <p class="article-mode__intro">Paste a text-and-images article. PRESS derives the document structure, checks publishing constraints and produces one standalone HTML file.</p>

      <section class="article-mode__section">
        <h2 class="article-mode__section-title"><span>Metadata</span><button class="article-mode__button" type="button" data-reset-meta>Use derived</button></h2>
        <div class="article-mode__meta">
          <label class="article-mode__field">
            <span class="article-mode__label">Title</span>
            <input name="article-title" data-meta="title" autocomplete="off">
          </label>
          <label class="article-mode__field">
            <span class="article-mode__label">Kicker</span>
            <input name="article-kicker" data-meta="kicker" autocomplete="off">
          </label>
          <label class="article-mode__field article-mode__field--wide">
            <span class="article-mode__label">Description</span>
            <textarea name="article-description" class="article-mode__description" data-meta="description"></textarea>
          </label>
          <label class="article-mode__field article-mode__field--wide">
            <span class="article-mode__label">Open Graph image</span>
            <input name="article-og-image" data-meta="ogImage" inputmode="url" autocomplete="off">
          </label>
        </div>
      </section>

      <section class="article-mode__section">
        <h2 class="article-mode__section-title"><span>Markdown</span><span class="article-mode__stats" data-stats>loading…</span></h2>
        <label class="article-mode__field">
          <span class="article-mode__label">Article source</span>
          <textarea name="article-markdown" class="article-mode__markdown" data-markdown spellcheck="false" aria-label="Article Markdown"></textarea>
        </label>
      </section>

      <section class="article-mode__section">
        <h2 class="article-mode__section-title"><span>Validation</span><span data-result-label>waiting</span></h2>
        <div data-issues></div>
        <div class="article-mode__actions">
          <button class="article-mode__button article-mode__button--primary" type="button" data-download disabled>Download HTML</button>
        </div>
      </section>
    </div>

    <div class="article-mode__preview">
      <div class="article-mode__preview-bar">
        <span class="article-mode__preview-title">Responsive output</span>
        <div class="article-mode__viewports" role="group" aria-label="Preview viewport">
          ${VIEWPORTS.map((name) => `<button class="article-mode__button" type="button" data-viewport="${name}">${name}</button>`).join("")}
        </div>
      </div>
      <div class="article-mode__canvas">
        <iframe class="article-mode__frame" title="Article preview" data-preview scrolling="no" sandbox="allow-same-origin allow-popups"></iframe>
      </div>
    </div>
  `;
	host.appendChild(root);

	const markdownInput = root.querySelector("[data-markdown]");
	const stats = root.querySelector("[data-stats]");
	const issues = root.querySelector("[data-issues]");
	const resultLabel = root.querySelector("[data-result-label]");
	const download = root.querySelector("[data-download]");
	const preview = root.querySelector("[data-preview]");

	function metadataValues() {
		return Object.fromEntries(META_KEYS.map((key) => [key, field(root, key).value]));
	}

	/* Both columns participate in the page's one scroll. Expanding editors and
     measuring the srcdoc removes the nested textarea and iframe scrollbars
     that made writing and reviewing feel like two separate windows. */
	function fitTextarea(textarea) {
		textarea.style.height = "0px";
		textarea.style.height = `${textarea.scrollHeight + 2}px`;
	}

	function fitPreview() {
		previewSizer?.disconnect();
		const doc = preview.contentDocument;
		if (!doc) return;
		const measure = () => {
			const height = Math.max(760, doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0);
			preview.style.height = `${height}px`;
		};
		measure();
		previewSizer = new ResizeObserver(measure);
		previewSizer.observe(doc.documentElement);
		if (doc.body) previewSizer.observe(doc.body);
		for (const image of doc.images) image.addEventListener("load", measure, { once: true });
		requestAnimationFrame(measure);
	}

	function setViewport(next, rerender = true) {
		viewport = next;
		preview.dataset.viewport = next;
		for (const button of root.querySelectorAll("[data-viewport]")) {
			button.setAttribute("aria-pressed", String(button.dataset.viewport === next));
		}
		if (rerender && currentArticle) updatePreview();
	}

	function effectiveReport(article, extraErrors = []) {
		const errors = [...article.report.errors, ...extraErrors];
		return { ok: errors.length === 0, errors, warnings: article.report.warnings || [] };
	}

	function renderIssues(report) {
		issues.replaceChildren();
		if (report.ok) {
			const clean = document.createElement("div");
			clean.className = "article-mode__empty";
			clean.textContent = "Ready to publish. No article errors.";
			issues.appendChild(clean);
			return;
		}
		const list = document.createElement("ul");
		list.className = "article-mode__issues";
		for (const error of report.errors) {
			const item = document.createElement("li");
			item.className = "article-mode__issue";
			const code = document.createElement("strong");
			code.textContent = `${error.code}${error.line ? ` · line ${error.line}` : ""}`;
			const message = document.createElement("span");
			message.textContent = error.message;
			item.append(code, message);
			list.appendChild(item);
		}
		issues.appendChild(list);
	}

	function updatePreview() {
		const html = renderStandalone(currentArticle, {
			fontsCss,
			articleCss,
			previewMode: viewport === "print" ? "print" : undefined,
			interactive: false,
		});
		preview.srcdoc = html;
	}

	function refresh(extraErrors = []) {
		if (destroyed) return;
		const base = compileArticle(markdownInput.value);
		for (const key of META_KEYS) {
			if (!metadataDirty.has(key)) field(root, key).value = base.metadata[key] || "";
		}
		fitTextarea(field(root, "description"));
		fitTextarea(markdownInput);
		const article = compileArticle(markdownInput.value, { metadata: metadataValues() });
		const report = effectiveReport(article, extraErrors);
		currentArticle = { ...article, report };

		stats.textContent = `${article.wordCount} words · ${article.readingMinutes} min · ${article.images.length} image${article.images.length === 1 ? "" : "s"}`;
		resultLabel.textContent = report.ok
			? "locked"
			: `${report.errors.length} error${report.errors.length === 1 ? "" : "s"}`;
		resultLabel.style.color = report.ok ? "#6ee787" : "var(--red)";
		renderIssues(report);
		download.disabled = !report.ok || !fontsCss || !articleCss;
		updatePreview();
		options.onReport?.(report, currentArticle);
	}

	function scheduleRefresh() {
		clearTimeout(timer);
		timer = setTimeout(() => refresh(), 180);
	}

	preview.addEventListener("load", fitPreview);
	markdownInput.addEventListener("input", () => {
		markdownDirty = true;
		fitTextarea(markdownInput);
		scheduleRefresh();
	});
	for (const key of META_KEYS) {
		field(root, key).addEventListener("input", () => {
			metadataDirty.add(key);
			if (field(root, key).tagName === "TEXTAREA") fitTextarea(field(root, key));
			scheduleRefresh();
		});
	}

	root.querySelector("[data-reset-meta]").addEventListener("click", () => {
		metadataDirty.clear();
		refresh();
	});

	for (const button of root.querySelectorAll("[data-viewport]")) {
		button.addEventListener("click", () => setViewport(button.dataset.viewport));
	}

	download.addEventListener("click", () => {
		if (!currentArticle?.report.ok) return;
		const html = renderStandalone(currentArticle, { fontsCss, articleCss });
		const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = articleFilename(currentArticle.metadata.title);
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	});

	setViewport(viewport, false);

	const sourcePromise =
		options.initialState?.markdown != null
			? Promise.resolve(options.initialState.markdown)
			: fetchText(options.sourceUrl || "../content/webflow.md").catch(() => SAMPLE);

	Promise.all([
		fetchText(new URL("../fonts.css", import.meta.url)),
		fetchText(new URL("./article.css", import.meta.url)),
		sourcePromise,
	])
		.then(([fonts, styles, markdown]) => {
			if (destroyed) return;
			fontsCss = fonts;
			articleCss = styles;
			if (!markdownDirty) markdownInput.value = markdown;
			fitTextarea(markdownInput);
			if (options.initialState?.metadata) {
				for (const key of META_KEYS) {
					if (own(options.initialState.metadata, key))
						field(root, key).value = options.initialState.metadata[key] || "";
				}
			}
			refresh();
		})
		.catch((error) => {
			if (destroyed) return;
			if (!markdownDirty) markdownInput.value = options.initialState?.markdown || SAMPLE;
			refresh([
				{
					code: "ARTICLE_ASSETS",
					message: `The article template could not load: ${error.message}`,
				},
			]);
		});

	return {
		root,
		getState: () => ({
			markdown: markdownInput.value,
			metadata: metadataValues(),
			metadataDirty: [...metadataDirty],
			viewport,
		}),
		get article() {
			return currentArticle;
		},
		destroy() {
			destroyed = true;
			clearTimeout(timer);
			previewSizer?.disconnect();
			root.remove();
		},
	};
}

function own(object, key) {
	return Object.hasOwn(object || {}, key);
}
