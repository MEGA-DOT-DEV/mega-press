/**
 * @mega/press public contract.
 * parseArtifact → buildArtifact → mountArtifact.
 */
export type { ArtifactKind, ArtifactPlan, PlatePlan, PlatePlanKind } from "./kernel/platePlan.js";
export {
	ARTIFACT_JSON_SCHEMA,
	ARTIFACT_KINDS,
	compileAndLockPlatePlan,
	compilePlatePlan,
	parsePlatePlan,
	PLATE_PLAN_JSON_SCHEMA,
	PLATE_PLAN_KINDS,
} from "./kernel/platePlan.js";

export type { ParseResult } from "./parse.js";
export { parseArtifact } from "./parse.js";

export type { BuildResult } from "./build.js";
export { buildArtifact } from "./build.js";

export type { EvaluateResult } from "./evaluate.js";
export { evaluateSpec, proveArtifact } from "./evaluate.js";

export type { MountArtifactOpts, MountedArtifact } from "./mount.js";
export { ensurePressFonts, LEGIBILITY_MIN_WIDTH, MountRefusal, mountArtifact } from "./mount.js";

export { outlineToPlatePlan as outlineToArtifact, outlineToPlatePlan } from "./kernel/outlineToPlan.js";

export type {
	ArtifactModuleId,
	ArtifactModuleSchema,
	ArtifactModuleSummary,
} from "./kernel/artifactModules.js";
export {
	ARTIFACT_MODULE_IDS,
	artifactCatalogPromptBlock,
	getArtifactModuleSchema,
	isArtifactModuleId,
	listArtifactModules,
} from "./kernel/artifactModules.js";

export type { AuthorPlateBody, AuthorPlateValidation } from "./kernel/authorPlate.js";
export { validateAuthorPlate } from "./kernel/authorPlate.js";

export type { LockResult, PressError } from "./kernel/lock.js";
export { frameSize, lockPlate } from "./kernel/lock.js";

export { normalizePlateSpec } from "./kernel/normalize.js";

export type { PedagogyError } from "./kernel/platePedagogy.js";
export { assessPlatePedagogy } from "./kernel/platePedagogy.js";

export type { AllowedComponent, PlateFrame } from "./kernel/vocabulary.js";
export {
	ALLOWED_COMPONENTS,
	COMPONENT_GUIDE,
	PLATE_FRAMES,
	platesPromptSection,
	WITHHELD_COMPONENTS,
} from "./kernel/vocabulary.js";

export { getKindModule, KIND_MODULES } from "./kinds.js";

export type {
	PressChrome,
	PressChromePreset,
	PressColorTheme,
	PressFontTheme,
	PressTheme,
	ResolvedChrome,
} from "./theme.js";
export {
	CHROME_PRESETS,
	configurePress,
	getPressTheme,
	resetPressTheme,
	resolveChrome,
	withPressTheme,
} from "./theme.js";
