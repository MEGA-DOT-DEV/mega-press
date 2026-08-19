/// <reference lib="dom" />
import { buildPlate } from "./plate.js";
import { mount } from "./render.js";
import { compileSpec } from "./spec.js";
import { resetMetrics } from "./text.js";
import type { PressChrome, PressChromePreset, PressColorTheme, PressFontTheme } from "./theme.js";
import { withPressTheme } from "./theme.js";

const FONT_STYLE_ID = "mega-press-fonts";

/** Faces the solver measures. Wrong widths until these have loaded. */
const MEASURE_FACES = [
	'400 72px "Argent Pixel"',
	'400 40px "Argent Pixel"',
	'400 32px "Geist Pixel"',
	'400 26px "Geist Pixel"',
	'400 26px "Geist Sans"',
] as const;

const injectFontsOnce = (doc: Document): void => {
	if (doc.getElementById(FONT_STYLE_ID)) return;
	const href = new URL("./fonts.css", import.meta.url).href;
	const link = doc.createElement("link");
	link.id = FONT_STYLE_ID;
	link.rel = "stylesheet";
	link.href = href;
	doc.head.appendChild(link);
};

/** Inject faces and wait until canvas measureText will see them. */
export async function ensurePressFonts(doc: Document = document): Promise<void> {
	injectFontsOnce(doc);
	const fonts = doc.fonts;
	if (!fonts) return;
	await Promise.all(MEASURE_FACES.map((face) => fonts.load(face).catch(() => undefined)));
	await fonts.ready;
	resetMetrics();
}

export type MountArtifactOpts = {
	readonly dpr?: number;
	readonly pixelSize?: number;
	/** Hide chase chrome. "embed" is the article preset (title kept, not painted). */
	readonly chrome?: PressChrome | PressChromePreset;
	readonly color?: PressColorTheme;
	readonly fonts?: PressFontTheme;
};

export type MountedArtifact = {
	unmount(): void;
	readonly ready: Promise<void>;
};

const paintPlate = (
	el: HTMLElement,
	spec: Record<string, unknown>,
	opts: MountArtifactOpts | undefined,
): { unmount(): void } =>
	withPressTheme(
		opts?.chrome !== undefined || opts?.color !== undefined || opts?.fonts !== undefined
			? {
					...(opts.chrome !== undefined ? { chrome: opts.chrome } : {}),
					...(opts.color !== undefined ? { color: opts.color } : {}),
					...(opts.fonts !== undefined ? { fonts: opts.fonts } : {}),
				}
			: null,
		() => {
			const doc = el.ownerDocument;
			const plate = buildPlate(compileSpec(spec), { validateNow: true });
			const hostW = Math.max(1, el.clientWidth || el.getBoundingClientRect().width || 780);
			const hostH = Math.max(
				1,
				el.clientHeight || Math.min(520, Math.round((doc.defaultView?.innerHeight ?? 900) * 0.55)),
			);
			const artW = Math.max(1, plate.frame.w);
			const artH = Math.max(1, plate.frame.h);
			const scale = Math.min(hostW / artW, hostH / artH);

			el.replaceChildren();
			el.style.position = el.style.position || "relative";
			el.style.overflow = "hidden";

			const stage = doc.createElement("div");
			stage.style.width = `${artW}px`;
			stage.style.height = `${artH}px`;
			stage.style.transformOrigin = "0 0";
			stage.style.transform = `scale(${scale})`;
			el.appendChild(stage);

			mount(plate, stage, {
				dpr: opts?.dpr ?? Math.min(2, doc.defaultView?.devicePixelRatio ?? 1),
				pixelSize: opts?.pixelSize ?? 4,
			});

			el.style.width = `${Math.round(artW * scale)}px`;
			el.style.height = `${Math.round(artH * scale)}px`;

			return {
				unmount() {
					el.replaceChildren();
				},
			};
		},
	);

/**
 * Build + mount a locked press spec into `el`.
 * Waits for press faces before measuring — otherwise display titles overflow.
 */
export function mountArtifact(
	el: HTMLElement,
	spec: Record<string, unknown>,
	opts?: MountArtifactOpts,
): MountedArtifact {
	const doc = el.ownerDocument;
	let cancelled = false;
	let inner: { unmount(): void } | null = null;

	const ready = ensurePressFonts(doc).then(() => {
		if (cancelled) return;
		inner = paintPlate(el, spec, opts);
	});

	return {
		ready,
		unmount() {
			cancelled = true;
			inner?.unmount();
		},
	};
}
