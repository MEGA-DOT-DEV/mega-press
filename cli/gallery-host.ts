import { frameSize } from "../src/kernel/lock.ts";
import { ensurePressFonts, mountArtifact } from "../src/mount.ts";
import pressFontCss from "../src/fonts.css?inline";
import { providePressFontCss } from "../src/mount.ts";

// Inline the faces so a strict-CSP host (an artifact page) still registers them.
providePressFontCss(pressFontCss);

type GalleryEntry = {
	readonly kind: string;
	readonly use: string;
	readonly frame: string;
	readonly spec: Record<string, unknown>;
};

function loadEntries(): readonly GalleryEntry[] {
	const baked = (globalThis as { __PRESS_GALLERY__?: readonly GalleryEntry[] }).__PRESS_GALLERY__;
	if (!Array.isArray(baked) || baked.length === 0) throw new Error("missing gallery entries");
	return baked;
}

const root = document.getElementById("gallery");
if (!root) throw new Error("missing #gallery");

const renderHeader = (count: number): void => {
	const header = document.createElement("header");
	const h1 = document.createElement("h1");
	h1.textContent = "press gallery";
	const p = document.createElement("p");
	p.textContent = `one canonical exemplar per template kind (${count} plates)`;
	header.append(h1, p);
	root.appendChild(header);
};

const renderEntry = (entry: GalleryEntry): Promise<void> => {
	const section = document.createElement("section");
	section.className = "entry";

	const head = document.createElement("div");
	head.className = "head";
	const kind = document.createElement("span");
	kind.className = "kind";
	kind.textContent = entry.kind;
	const use = document.createElement("span");
	use.className = "use";
	use.textContent = entry.use;
	head.append(kind, use);

	const plate = document.createElement("div");
	plate.className = "plate";
	const frame = frameSize(String(entry.frame || "landscape"));
	plate.style.aspectRatio = `${frame.w} / ${frame.h}`;

	section.append(head, plate);
	root.appendChild(section);
	return mountArtifact(plate, entry.spec).ready;
};

async function main(): Promise<void> {
	const entries = loadEntries();
	await ensurePressFonts(document);
	renderHeader(entries.length);
	// Ready only when every plate has painted; a single refusal fails the page.
	await Promise.all(entries.map(renderEntry));
	document.documentElement.dataset.pressReady = "1";
}

main().catch((err: { errors?: { code: string; message: string }[]; code?: string; message?: string }) => {
	const errors = err?.errors ?? [
		{ code: err?.code ?? "MOUNT_FAILED", message: err?.message ?? String(err) },
	];
	const report = { ok: false, errors };
	document.documentElement.dataset.pressError = "1";
	document.documentElement.dataset.pressReport = JSON.stringify(report);
	const node = document.createElement("script");
	node.id = "press-error";
	node.type = "application/json";
	node.textContent = JSON.stringify(report);
	document.body.appendChild(node);
});
