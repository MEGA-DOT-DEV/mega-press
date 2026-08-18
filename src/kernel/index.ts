/** Internal kernel barrel. Public contract is src/index.ts. */
export type {
	ArtifactKind,
	ArtifactPlan,
	PlatePlan,
	PlatePlanKind,
} from "./platePlan.js";
export {
	ARTIFACT_JSON_SCHEMA,
	ARTIFACT_KINDS,
	compileAndLockPlatePlan,
	compilePlatePlan,
	parsePlatePlan,
	PLATE_PLAN_JSON_SCHEMA,
	PLATE_PLAN_KINDS,
} from "./platePlan.js";
export { outlineToPlatePlan } from "./outlineToPlan.js";
export {
	ARTIFACT_MODULE_IDS,
	artifactCatalogPromptBlock,
	getArtifactModuleSchema,
	isArtifactModuleId,
	listArtifactModules,
} from "./artifactModules.js";
export { validateAuthorPlate } from "./authorPlate.js";
export { frameSize, lockPlate } from "./lock.js";
export { normalizePlateSpec } from "./normalize.js";
export { assessPlatePedagogy } from "./platePedagogy.js";
