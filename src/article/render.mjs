import { escapeHtml } from "./model.mjs";

function meta(name, content, property = false) {
	if (!content) return "";
	const key = property ? "property" : "name";
	return `  <meta ${key}="${escapeHtml(name)}" content="${escapeHtml(content)}">\n`;
}

export function articleFilename(title) {
	const slug = String(title || "article")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return `${slug || "article"}.html`;
}

export function renderStandalone(article, options = {}) {
	const fontsCss = String(options.fontsCss || "");
	const articleCss = String(options.articleCss || "");
	const preview = options.previewMode === "print" ? ' data-article-preview="print"' : "";
	const title = article.metadata?.title || "Untitled article";
	const description = article.metadata?.description || "";
	const kicker = article.metadata?.kicker || "ARTICLE";
	const ogImage = article.metadata?.ogImage || "";
	const minutes = article.readingMinutes || 1;
	const report = escapeHtml(
		JSON.stringify(article.report || { ok: true, errors: [], warnings: [] }),
	);
	const layout = article.metadata?.layout || "";
	const layoutAttr = layout ? ` data-article-layout="${escapeHtml(layout)}"` : "";

	/* Print has no affordance for a disclosure, so a printed or print-previewed
     syllabus ships every lesson open. On screen the reader opens them. */
	const printing = options.previewMode === "print";
	let bodyHtml = article.bodyHtml || "";
	const hasLessons = /<details class="article-lesson">/.test(bodyHtml);
	if (printing && hasLessons) {
		bodyHtml = bodyHtml.replace(
			/<details class="article-lesson">/g,
			'<details class="article-lesson" open>',
		);
	}

	const lessonTools =
		hasLessons && !printing
			? `      <div class="article-lesson-tools">
        <button type="button" class="article-lesson-tool" data-lessons="open">Expand all</button>
        <button type="button" class="article-lesson-tool" data-lessons="close">Collapse all</button>
      </div>
`
			: "";
	const progressScript =
		options.interactive === false
			? ""
			: `
  <script>
    (() => {
      const progress = document.querySelector('.article-progress');
      const update = () => {
        const max = document.documentElement.scrollHeight - innerHeight;
        progress.style.width = \`${"${"}max > 0 ? (scrollY / max) * 100 : 0}%\`;
      };
      addEventListener('scroll', update, { passive: true });
      addEventListener('resize', update);
      update();
    })();
  </script>`;

	const lessonScript =
		hasLessons && options.interactive !== false
			? `
  <script>
    (() => {
      const lessons = [...document.querySelectorAll('.article-lesson')];
      const setAll = open => lessons.forEach(lesson => { lesson.open = open; });
      for (const button of document.querySelectorAll('[data-lessons]')) {
        button.addEventListener('click', () => setAll(button.dataset.lessons === 'open'));
      }
      const revealTarget = () => {
        const id = decodeURIComponent(location.hash.slice(1));
        const target = id && document.getElementById(id);
        const lesson = target && target.closest('.article-lesson');
        if (lesson) lesson.open = true;
      };
      addEventListener('hashchange', revealTarget);
      addEventListener('beforeprint', () => setAll(true));
      revealTarget();
    })();
  </script>`
			: "";

	return `<!doctype html>
<html lang="en"${preview}${layoutAttr} data-article-ready="${article.report?.ok ? "ok" : "error"}" data-article-report="${report}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#000000">
${meta("description", description)}${meta("og:type", "article", true)}${meta("og:title", title, true)}${meta("og:description", description, true)}${meta("og:image", ogImage, true)}${meta("twitter:card", "summary_large_image")}  <title>${escapeHtml(title)} — MEGA.DEV</title>
  <style>
${fontsCss}
${articleCss}
  </style>
</head>
<body>
  <div class="article-progress" aria-hidden="true"></div>
  <header class="article-site-bar">
    <a class="article-brand" href="https://mega.dev" target="_blank" rel="noopener noreferrer">MEGA<span>.DEV</span></a>
    <span class="article-preview-label">${escapeHtml(kicker)} · ${minutes} min read</span>
  </header>
  <main class="article-page">
    <article class="article-document">
      <div class="article-meta"><strong>${escapeHtml(kicker)}</strong><span>${minutes} min read · ${article.wordCount || 0} words</span></div>
${lessonTools}${bodyHtml}
    </article>
  </main>
  <footer class="article-footer"><strong>MEGA.DEV</strong><span>${escapeHtml(title)}</span></footer>${progressScript}${lessonScript}
</body>
</html>
`;
}
