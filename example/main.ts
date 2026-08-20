import {
	ARTIFACT_KINDS,
	buildArtifact,
	listArtifactModules,
	mountArtifact,
	parseArtifact,
} from "../src/index.ts";
import invalid from "./fixtures/invalid.json";
import rail from "./fixtures/rail.json";

const EXEMPLARS = import.meta.glob("./exemplars/*.json", { eager: true, import: "default" }) as Record<
	string,
	unknown
>;

const showError = (el: HTMLElement, errors: readonly { code: string; message: string }[]) => {
	el.className = "error";
	el.textContent = errors.map((e) => `${e.code}: ${e.message}`).join("\n");
};

const mount = (el: HTMLElement, spec: Record<string, unknown>) => {
	void mountArtifact(el, spec).ready.catch((error: unknown) => {
		const report = error as { errors?: readonly { code: string; message: string }[] };
		showError(el, report.errors ?? [{ code: "MOUNT_FAILED", message: String(error) }]);
	});
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
	mount(el, built.spec);
};

type GalleryEntry = {
	readonly kind: string;
	readonly use: string;
	readonly json: unknown;
	readonly spec?: boolean;
};

const catalogUse = new Map(listArtifactModules().map((module) => [module.id, module.use]));
const heroUse = "One focal number with a caption saying what it counts.";
const composedCalloutsUse = "Note and quote compose inside one plate; neither stands alone.";

const exemplar = (kind: string): unknown => EXEMPLARS[`./exemplars/${kind}.json`];

const galleryEntries: GalleryEntry[] = ARTIFACT_KINDS.flatMap((kind) => {
	if (kind === "note") return [];
	if (kind === "quote") {
		return [
			{
				kind: "note + quote",
				use: composedCalloutsUse,
				json: EXEMPLARS["./exemplars/_composed-callouts.json"],
				spec: true,
			},
		];
	}
	return [
		{
			kind,
			use: catalogUse.get(kind) ?? (kind === "hero" ? heroUse : "Canonical exemplar."),
			json: exemplar(kind),
		},
	];
});

const renderGallery = () => {
	const root = document.getElementById("gallery");
	if (!root) return;

	const heading = document.createElement("h2");
	heading.textContent = `all canonical exemplars (${galleryEntries.length})`;
	root.appendChild(heading);

	for (const entry of galleryEntries) {
		const section = document.createElement("section");
		const title = document.createElement("h3");
		title.textContent = entry.kind;
		const use = document.createElement("p");
		use.textContent = entry.use;
		const plate = document.createElement("div");
		plate.className = "plate";
		section.append(title, use, plate);
		root.appendChild(section);

		if (entry.spec) {
			if (entry.json && typeof entry.json === "object" && !Array.isArray(entry.json)) {
				mount(plate, entry.json as Record<string, unknown>);
			} else {
				showError(plate, [{ code: "EXEMPLAR_MISSING", message: `missing ${entry.kind} exemplar` }]);
			}
			continue;
		}
		renderInto(plate, entry.json);
	}
};

function renderInto(el: HTMLElement, json: unknown) {
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
	mount(el, built.spec);
}

renderGallery();
render("invalid", invalid);
render("resize-rail", rail);
render("narrow-rail", rail);
