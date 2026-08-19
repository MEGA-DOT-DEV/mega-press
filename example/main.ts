import { buildArtifact, mountArtifact, parseArtifact } from "../src/index.ts";
import bars from "./fixtures/bars.json";
import invalid from "./fixtures/invalid.json";
import rail from "./fixtures/rail.json";
import table from "./fixtures/table.json";

const showError = (el: HTMLElement, errors: readonly { code: string; message: string }[]) => {
	el.className = "error";
	el.textContent = errors.map((e) => `${e.code}: ${e.message}`).join("\n");
};

const render = (hostId: string, json: unknown) => {
	const el = document.getElementById(hostId);
	if (!el) return;
	const parsed = parseArtifact(json);
	if (!parsed.ok) {
		showError(el, parsed.errors);
		return;
	}
	const built = buildArtifact(parsed.plan);
	if (!built.ok) {
		showError(el, built.errors);
		return;
	}
	mountArtifact(el, built.spec);
};

render("rail", rail);
render("table", table);
render("bars", bars);
render("invalid", invalid);
render("resize-rail", rail);
render("narrow-rail", rail);
