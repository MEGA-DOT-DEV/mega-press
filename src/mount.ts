/// <reference lib="dom" />
import { buildPlate } from "./plate.js";
import { mount } from "./render.js";
import { compileSpec } from "./spec.js";
import type { PressChrome, PressChromePreset, PressColorTheme, PressFontTheme } from "./theme.js";
import { withPressTheme } from "./theme.js";

const FONT_STYLE_ID = "mega-press-fonts";

const injectFontsOnce = (doc: Document): void => {
	if (doc.getElementById(FONT_STYLE_ID)) return;
	const href = new URL("./fonts.css", import.meta.url).href;
	const link = doc.createElement("link");
	link.id = FONT_STYLE_ID;
	link.rel = "stylesheet";
	link.href = href;
	doc.head.appendChild(link);
};

export type MountArtifactOpts = {
	readonly dpr?: number;
	readonly pixelSize?: number;
	/** Hide chase chrome. "embed" is the article preset (title kept, not painted). */
	readonly chrome?: PressChrome | PressChromePreset;
	readonly color?: PressColorTheme;
	readonly fonts?: PressFontTheme;
};

/**
 * Build + mount a locked press spec into `el`. Injects fonts/CSS once.
 * Scales the artboard to the host element's content box.
 */
export function mountArtifact(
	el: HTMLElement,
	spec: Record<string, unknown>,
	opts?: MountArtifactOpts,
): { unmount(): void } {
	return withPressTheme(
		opts?.chrome !== undefined || opts?.color !== undefined || opts?.fonts !== undefined
			? {
					...(opts.chrome !== undefined ? { chrome: opts.chrome } : {}),
					...(opts.color !== undefined ? { color: opts.color } : {}),
					...(opts.fonts !== undefined ? { fonts: opts.fonts } : {}),
				}
			: null,
		() => {
			const doc = el.ownerDocument;
			injectFontsOnce(doc);

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
}
