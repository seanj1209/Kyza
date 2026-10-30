---
document_name: Kyza API Architecture
file_name: 05_API_Architecture.md
version: 2.1
status: Current — Cross-Source Aligned Beta Baseline
owner: Sean Johnston / Kyza
last_reviewed: 2026-07-19
source_replaces:
  - 05_API_Architecture.md v1.0
  - duplicate or alternate 05_API_Architecture.md variants
authority: Application-service boundaries, API contracts, request/response patterns, domain integration, permissions, versioning, errors and backend-readiness
related_sources:
  - 01_Product_Architecture.md
  - 04_Engineering_Knowledge_Base.md
  - 06_Database_Schema.md
  - 07_UI_Design_System.md
  - 08_AI_Architecture.md
  - 09_Development_Roadmap.md
  - 10_Testing_QA.md
---

# Kyza API Architecture

## Document Purpose

This document defines how the Kyza App should structure its application services, API contracts, domain-service boundaries and future backend integration.

It establishes:

- The role of the API/service layer
- The separation between UI, application state, domain logic and persistence
- Project-centred service ownership
- Beta and post-beta API priorities
- Standard request and response shapes
- Authentication and permission boundaries
- Project, Pack, Cutter, Validation, Export and FlowAI contracts
- Error and validation-result handling
- Versioning and revision control
- Mock/local-service compatibility
- Security, observability and test requirements
- Codex implementation rules

This document is written so the Kyza App can operate safely during frontend-led development while remaining ready for a real backend and structured database.

This document does not define:

- Product hierarchy or release scope
- Engineering calculations or validation thresholds
- Persistent database tables
- Visual layout
- FlowAI prompt design
- Delivery sequence
- Formal QA matrices

Those responsibilities belong to their dedicated source files.

`01_Product_Architecture.md` controls product hierarchy, module responsibilities and beta scope.

`04_Engineering_Knowledge_Base.md` controls engineering rules and validation intent.

`06_Database_Schema.md` controls persistent entities and relationships.

`08_AI_Architecture.md` controls FlowAI intents, context, prompts and structured AI output.

There is no separate `00_Master_Context.md`.

---

# 1. Product and Service Context

## 1.1 Kyza

Kyza is the customer-facing master brand.

## 1.2 Kyza App

The Kyza App is the connected working environment.

Its Beta Core is centred on:

- Dashboard
- Projects and project access
- Pack Gen
- Cutter Studio
- Validation Centre
- Export Release
- Account & Specs

## 1.3 Kyza / Kyza Tech

Kyza/Kyza Tech is the underlying deterministic packaging-engineering capability.

It provides or supports:

- Pack-type logic
- Pack Specification validation
- Cutter generation
- Geometry calculations
- Cutter editing constraints
- Pack-specific validation
- Structured export data

## 1.4 FlowAI

FlowAI is the intelligence, explanation and guided-assistance layer.

FlowAI may interpret, recommend and explain.

It does not own:

- Geometry
- Numeric engineering calculations
- Validation pass/fail
- Validation severity
- Export-blocking state
- User permissions
- Saved Project truth

---

# 2. Core API Principle

Kyza must behave as one connected Project-centred system.

The API/service layer exists to ensure that:

- Dashboard reads the same Projects that Pack Gen creates.
- Pack Gen writes the same Pack Specification that Cutter Studio uses.
- Cutter Studio writes the same Cutter Specification that Validation checks.
- Validation Centre displays the same Validation Result that Export Release respects.
- FlowAI receives trusted structured context instead of recreating Project state.
- Save and reopen restore the same Project revision.
- No module creates an incompatible parallel source of truth.

A file, cutter preview, exported SVG or AI response is not the parent object.

The Project is the parent object.

---

# 3. Architecture Layers

Kyza should separate the following layers.

```text
User Interface
→ Module/Application State
→ Application Service / API Client
→ Domain Service
→ Deterministic Engineering or Validation
→ Repository / Persistence Adapter
→ Database or Local Persistence
```

FlowAI follows a controlled parallel path:

```text
User Interface
→ FlowAI Service
→ Permission and request validation
→ Trusted context assembly
→ Knowledge retrieval
→ Provider adapter
→ Structured response validation
→ User review
→ Approved domain-service action
```

## 3.1 User Interface

The UI should:

- Display state
- Capture user input
- Trigger typed service actions
- Show loading, error and result states
- Request explicit approval for critical actions

The UI should not:

- Own engineering calculations
- Recreate Project persistence
- Determine validation severity
- Construct unrestricted AI prompts
- Call provider APIs directly
- Mutate protected cutter geometry without domain-service checks

## 3.2 Module/Application State

Application state should:

- Hold current working state
- Track unsaved changes
- Coordinate selected Project and module
- Use shared domain types
- Persist only through approved service/repository boundaries

Application state should not become a second permanent database.

## 3.3 Application Services

Application services should:

- Expose typed functions to modules
- Validate request shapes
- Call local or remote adapters
- Normalise responses
- Transform safe domain errors into UI-consumable errors
- Keep transport details away from components

## 3.4 Domain Services

Domain services own business behaviour.

Examples:

- Project Service
- Pack Service
- Cutter Service
- Validation Service
- Export Service
- Permission Service

FlowAI Service is an assistance service, not the deterministic domain authority.

## 3.5 Persistence Adapters

Persistence adapters may target:

- Local browser storage during controlled development
- File-based Project storage
- Hosted API and database
- Test fixtures
- Mock repositories

All adapters should implement the same Kyza-owned interfaces where practical.

---

# 4. Current Development Mode

The current application may contain:

- Frontend state
- Local persistence
- Browser storage
- Mock authentication
- Mock Projects
- Mock FlowAI
- Partially connected service functions

These are acceptable during development only when they are clearly separated and use the same contracts as the intended production services.

Rules:

- Mock data must use real domain shapes.
- Mock services must return standard API responses.
- Local and remote adapters must not require different UI code.
- Important logic must not remain inside visual components.
- Development shortcuts must be labelled and removable.
- A visual success state must not be returned when no real action occurred.
- Local persistence limitations must be documented before external beta.

---

# 5. Release Boundary

## 5.1 Beta Core API Scope

Beta Core service support includes:

- Project create
- Project read
- Project update
- Project search
- Recent Projects
- Project save
- Project reopen
- Pack Specification create/update
- Manual Build Pack submission
- Pack-to-Cutter generation
- Cutter read/update
- Cutter state persistence
- Minimum validation run/results
- Minimum export preparation/generation
- User preferences required by Account & Specs
- FlowAI Pack Gen and validation explanation
- Consistent errors and loading states

## 5.2 Beta Supporting Scope

May include:

- Project duplication
- Project archive
- Export records
- Activity records for meaningful changes
- Mock/real adapter switching
- Basic authentication
- File/import metadata
- Feature flags
- Request tracing

## 5.3 Post-Beta Scope

Post-beta services include:

- Artwork Service
- Full Asset Service
- Template Service
- Press and Production Service
- Customer and printer profiles
- Reports
- Administration
- Company workspaces
- Advanced approvals
- Customer/printer portals
- External integrations
- Webhooks
- Advanced notifications
- Billing and subscriptions

Post-beta contracts may be documented as future boundaries, but they must not delay the Beta Core API.

---

# 6. Primary Service Domains

## Beta Core Services

- Authentication / Session Service
- Permission Service
- User / Preference Service
- Project Service
- Pack Service
- Cutter Service
- Validation Service
- Export Service
- FlowAI Service

## Beta Supporting Services

- Asset / Import Service
- Activity / History Service
- Feature Flag Service
- Search Service where not part of Project Service

## Post-Beta Services

- Artwork Service
- Template Service
- Knowledge Service
- Press & Production Service
- Customer Rule Service
- Printer Rule Service
- Report Service
- Notification Service
- Administration Service
- Integration Service
- Billing Service

Airtable is not a Kyza runtime service.

Airtable is the programme and task-tracking layer.

---

# 7. Service Responsibility Map

## 7.1 Authentication / Session Service

Responsible for:

- Current session
- Login/logout when enabled
- Session restoration
- Protected-route state
- Authentication expiry
- Development/mock authentication mode

It does not own user permissions by itself.

## 7.2 Permission Service

Responsible for:

- Checking user capability
- Project read/update permissions
- Cutter edit permissions
- Validation permissions
- Export permissions
- Critical FlowAI action permissions
- Future company/workspace rules

Permission checks must occur in the trusted service/domain layer, not only through hidden UI controls.

## 7.3 User / Preference Service

Responsible for:

- Current user
- Unit preference
- Theme preference where stored server-side
- Saved Pack defaults
- Saved Cutter defaults
- Export defaults
- Account & Specs data

Preferences must not silently overwrite explicit Project values.

## 7.4 Project Service

Responsible for:

- Creating Projects
- Reading Projects
- Updating Project identity
- Searching Projects
- Listing recent Projects
- Saving Project state
- Loading/reopening Project state
- Duplicating Projects where supported
- Archiving Projects where supported
- Project revision control
- Project history references

## 7.5 Pack Service

Responsible for:

- Validating Pack Specification inputs
- Applying active pack-type rules
- Applying explicit approved defaults
- Creating Pack Specifications
- Updating Pack Specifications
- Validating supported pack type
- Producing Cutter-generation input
- Rejecting impossible Pack values

Pack Recommendation belongs to FlowAI.

Pack Specification acceptance belongs to Pack Service.

## 7.6 Cutter Service

Responsible for:

- Generating Cutter Specification from Pack Specification
- Returning structured cutter elements
- Applying permitted cutter changes
- Enforcing lock/protected-element rules
- Recalculating dependent geometry
- Maintaining element and layer identity
- Preparing structured export input
- Preserving pack-specific engineering behaviour

## 7.7 Validation Service

Responsible for:

- Running deterministic rules
- Producing Validation Runs
- Producing Validation Issues
- Setting severity
- Setting affected object/element
- Setting export-blocking state
- Returning validation summary
- Re-running after Project changes

Validation Service does not depend on FlowAI to decide outcomes.

## 7.8 Export Service

Responsible for:

- Checking current Project revision
- Checking current validation state
- Checking supported format
- Preparing export
- Generating supported files
- Returning export status
- Recording export metadata
- Reporting generation failures
- Enforcing export blocks

## 7.9 FlowAI Service

Responsible for:

- Intent routing
- Trusted context assembly
- Knowledge retrieval
- Provider abstraction
- Structured AI response validation
- Pack interpretation/recommendation
- Validation explanation
- Cutter guidance
- Project/readiness summaries
- Safe action proposals

FlowAI Service does not mutate engineering data directly.

## 7.10 Asset / Import Service

Beta scope may include:

- File metadata
- Supported import validation
- Import status
- Attachment link to Project
- Preview reference

Future scope includes complete artwork and production asset management.

## 7.11 Activity / History Service

Responsible for meaningful events such as:

- Project created
- Pack Specification updated
- Cutter changed
- Validation run
- Export generated
- User approved FlowAI action
- Project archived

It should record meaningful domain events, not every UI click.

---

# 8. API Style

Use resource-oriented endpoints for entity access and command-style endpoints for complex domain operations.

Examples:

```text
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId

PUT    /api/v1/projects/:projectId/pack-specification
POST   /api/v1/projects/:projectId/cutter/generate
POST   /api/v1/projects/:projectId/cutter/actions
POST   /api/v1/projects/:projectId/validation-runs
POST   /api/v1/projects/:projectId/exports
POST   /api/v1/flowai/requests
```

Avoid forcing engineering operations into unrestricted generic patches.

For example, a controlled cutter move should be a typed domain action rather than a raw arbitrary object mutation.

---

# 9. API Versioning

Use a versioned route prefix for remote APIs:

```text
/api/v1
```

Rules:

- Additive non-breaking fields may remain within the same version.
- Breaking contract or semantic changes require a planned version change or migration.
- Stored Project data requires migration planning.
- Frontend service interfaces should remain Kyza-owned and should not expose provider-specific contracts.
- Mock/local adapters should identify the same contract version.

API version is separate from Project revision and document version.

Revision values in API and FlowAI contracts are opaque strings.

A hosted relational implementation may store revisions as integers or `bigint`, but the API serialises them as strings to avoid transport precision problems and to prevent clients from calculating or inventing revision values.

---

# 10. Naming Conventions

Use:

- `projects`
- `packSpecifications`
- `cutterSpecifications`
- `cutterElements`
- `validationRuns`
- `validationIssues`
- `exportRecords`
- `flowAIRequests`
- `engineeringRules`
- `userPreferences`
- `activityEvents`

Use consistent field naming, preferably camelCase in TypeScript/JSON.

Avoid:

- `data2`
- `fileStuff`
- `misc`
- `thing`
- `finalData`
- `tempPayload`
- mixed `projectID`, `projectId` and `ProjectId`

Use `id` for the current resource and explicit foreign keys such as `projectId`.

---

# 11. Identifier and Time Rules

## 11.1 Identifiers

Identifiers should be:

- Stable
- Unique
- Opaque to the UI
- Generated by a trusted service/repository
- Independent of display names

Do not use Project name as Project ID.

## 11.2 Timestamps

Use ISO 8601 UTC timestamps in API contracts.

Example:

```text
2026-07-19T10:15:30.000Z
```

The UI may localise display.

## 11.3 Engineering Units

Store engineering dimensions in millimetres unless the domain type explicitly defines another unit.

API contracts should use unit-specific names where ambiguity is possible.

Examples:

- `widthMm`
- `heightMm`
- `fillWeightG`
- `opacityPercent`

Do not send an unlabelled `width` when the unit is not unambiguous.

---

# 12. Standard Response Shape

Recommended success response:

```ts
type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: ApiMeta;
};
```

Recommended error response:

```ts
type ApiFailure = {
  success: false;
  error: ApiError;
  meta: ApiMeta;
};
```

Combined:

```ts
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
```

Metadata:

```ts
type ApiMeta = {
  requestId: string;
  timestamp: string;
  apiVersion: string;
  source: "mock" | "local" | "api";
  projectRevision?: string;
};
```

The source value describes transport/persistence origin.

AI provenance belongs in FlowAI trace metadata, not as a substitute for API source.

---

# 13. Error Model

API and domain errors must be separated from validation issues.

```ts
type ApiError = {
  code: string;
  message: string;
  details?: unknown;
  fieldErrors?: ApiFieldError[];
  recoverable: boolean;
  retryable: boolean;
  correlationId?: string;
};
```

```ts
type ApiFieldError = {
  field: string;
  code: string;
  message: string;
};
```

Example error codes:

- `PROJECT_NOT_FOUND`
- `PROJECT_REVISION_CONFLICT`
- `PROJECT_SAVE_FAILED`
- `INVALID_PACK_TYPE`
- `PACK_SPECIFICATION_INVALID`
- `CUTTER_GENERATION_FAILED`
- `CUTTER_ACTION_NOT_PERMITTED`
- `PROTECTED_ELEMENT`
- `VALIDATION_RUN_FAILED`
- `EXPORT_BLOCKED`
- `EXPORT_FORMAT_UNSUPPORTED`
- `EXPORT_GENERATION_FAILED`
- `FLOWAI_UNAVAILABLE`
- `FLOWAI_RESPONSE_INVALID`
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `FILE_TYPE_UNSUPPORTED`
- `RATE_LIMITED`
- `SERVICE_UNAVAILABLE`

A Validation Issue is a domain result and may exist within a successful API response.

Do not return a transport error merely because a Project has validation warnings.

---

# 14. Validation Result Model

Canonical validation severity is:

```ts
type ValidationSeverity =
  | "critical"
  | "warning"
  | "advisory"
  | "pass";
```

Recommended issue shape:

```ts
type ValidationIssue = {
  id: string;
  ruleId: string;
  code: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  affectedModule:
    | "project"
    | "pack_gen"
    | "cutter_studio"
    | "validation_centre"
    | "export_release"
    | "artwork_studio"
    | "configuration";
  affectedObjectType?: string;
  affectedObjectId?: string;
  suggestedAction?: string;
  exportBlocking: boolean;
  resolutionStatus: "open" | "acknowledged" | "resolved" | "superseded";
  acknowledgedAt?: string;
  resolvedByRevision?: string;
};
```

Summary:

```ts
type ValidationSummary = {
  status:
    | "not_run"
    | "running"
    | "passed"
    | "failed"
    | "stale"
    | "error";
  criticalCount: number;
  warningCount: number;
  advisoryCount: number;
  exportBlocked: boolean;
  validationRunId?: string;
  validatedProjectRevision?: string;
  currentProjectRevision?: string;
  checkedAt?: string;
};
```

Rules:

- Severity comes from Validation Service.
- `passed` means the latest completed run matches the current Project revision and has no open Critical issues; Warnings and Advisories may remain.
- `failed` means the latest completed run matches the current Project revision and has one or more open Critical issues.
- `stale` means the Project changed after the latest completed run.
- `error` means validation did not complete.
- Any engineering-affecting Project mutation invalidates the previous current-validation state.
- Export-blocking state comes from deterministic rules and Export Service policy.
- Release export must not be represented as ready when validation is `not_run`, `running`, `stale` or `error`.
- FlowAI explanation must not alter these fields.
- Unknown context is not automatically Critical.
- `Auto-fix` and `recommendation` are action types, not severities.

---

# 15. Project Contract

Recommended Project API representation:

```ts
type Project = {
  id: string;
  name: string;
  reference?: string;
  customerName?: string;
  brandName?: string;
  ownerId?: string;
  status: ProjectStatus;
  currentStage: ProjectStage;
  productInformation?: ProductInformation;
  packSpecification?: PackSpecification;
  cutterSpecification?: CutterSpecification;
  validationSummary?: ValidationSummary;
  assumptions?: EngineeringAssumption[];
  notes?: ProjectNote[];
  exportRecords?: ExportRecord[];
  createdAt: string;
  updatedAt: string;
  revision: string;
};
```

Beta Project status:

```ts
type ProjectStatus =
  | "draft"
  | "in_progress"
  | "needs_attention"
  | "ready_for_export"
  | "exported"
  | "archived";
```

Beta Project stage:

```ts
type ProjectStage =
  | "project_setup"
  | "pack_generation"
  | "cutter_engineering"
  | "validation"
  | "export_release";
```

Future stages may include Artwork and Production.

Do not mark a Project `approved` merely because validation passed.

Approval is a separate future/user-controlled state.

`ready_for_export` is a derived or service-controlled status. It is valid only when the latest required validation matches the current Project revision, no open export-blocking Critical issue remains and the selected export prerequisites are satisfied. An engineering-affecting change must invalidate this state.

---

# 16. Project Endpoints

## 16.1 List and Search

```text
GET /api/v1/projects
```

Query parameters may include:

- `search`
- `status`
- `packType`
- `updatedAfter`
- `cursor`
- `limit`
- `sort`

Default Dashboard behaviour:

- Most recently updated first
- Maximum 24 returned for initial Recent Projects
- Search must query the full authorised Project set, not only the displayed 24

Response:

```ts
type ProjectListResponse = {
  items: ProjectSummary[];
  nextCursor?: string;
  total?: number;
};
```

## 16.2 Create

```text
POST /api/v1/projects
```

Request:

```ts
type CreateProjectRequest = {
  name: string;
  reference?: string;
  customerName?: string;
  brandName?: string;
  productInformation?: Partial<ProductInformation>;
};
```

## 16.3 Read

```text
GET /api/v1/projects/:projectId
```

## 16.4 Update

```text
PATCH /api/v1/projects/:projectId
```

Use for Project-level metadata and allowed state updates.

Do not use a generic Project patch to bypass Pack or Cutter domain services.

## 16.5 Save Working State

If the implementation requires an explicit save operation:

```text
POST /api/v1/projects/:projectId/save
```

The request should include the expected Project revision.

## 16.6 Duplicate and Archive

Supporting beta/future:

```text
POST /api/v1/projects/:projectId/duplicate
POST /api/v1/projects/:projectId/archive
```

Archive is not permanent deletion.

Permanent deletion requires a separate, strongly controlled future contract.

---

# 17. Revision and Concurrency Control

Every persisted Project should have a revision or version token.

Mutation requests should include the expected revision.

Example:

```ts
type RevisionRequest = {
  expectedRevision: string;
};
```

If the Project changed since the user loaded it:

- Reject unsafe overwrite.
- Return `PROJECT_REVISION_CONFLICT`.
- Return current revision metadata where safe.
- Let the UI reload, compare or merge through an intentional workflow.

Do not use last-write-wins silently for engineering-critical Project data.

---

# 18. Product Information Contract

```ts
type ProductInformation = {
  productName?: string;
  productCategory?: string;
  fillWeightValue?: number;
  fillWeightUnit?: "g" | "kg" | "ml" | "l";
  storageCondition?: "ambient" | "chilled" | "frozen" | "ovenable" | "unknown";
  fillingMethod?: string;
  notes?: string;
};
```

Do not duplicate customer/brand information across multiple uncoordinated models.

---

# 19. Pack Specification Contract

```ts
type PackSpecification = {
  id: string;
  packType: PackType;
  finishedWidthMm?: number;
  finishedHeightMm?: number;
  depthMm?: number;
  gussetMm?: number;
  repeatMm?: number;
  webWidthMm?: number;
  sealConfiguration?: SealConfiguration;
  eyemarkConfiguration?: EyemarkConfiguration;
  features: PackFeature[];
  material?: MaterialSpecification;
  source:
    | "manual"
    | "flowai_proposal"
    | "template"
    | "import";
  assumptions: EngineeringAssumption[];
  createdAt: string;
  updatedAt: string;
  revision: string;
};
```

Pack types should reflect implemented domain support.

```ts
type PackType =
  | "flow_wrap"
  | "pillow_pack"
  | "three_side_seal_sachet"
  | "four_side_seal_sachet"
  | "doy_pouch"
  | "k_seal_pouch"
  | "lidded_film"
  | "custom";
```

An unavailable pack type may exist in the domain enum for future compatibility, but the API must report whether it is currently supported.

---

# 20. Pack Service API

## 20.1 Get Current Pack Specification

```text
GET /api/v1/projects/:projectId/pack-specification
```

## 20.2 Create or Replace Reviewed Pack Specification

```text
PUT /api/v1/projects/:projectId/pack-specification
```

This endpoint accepts a user-reviewed or manual specification.

It must:

- Validate the request
- Apply rule precedence
- Preserve explicit values
- Return assumptions
- Return normalised structured data
- Update Project revision

## 20.3 Update Pack Specification

```text
PATCH /api/v1/projects/:projectId/pack-specification
```

Use only for allowed Pack fields.

Pack-type changes may require a dedicated replace/convert operation because they can invalidate cutter geometry.

## 20.4 Validate Draft Pack Specification

```text
POST /api/v1/pack-specifications/validate
```

This may validate an unsaved draft before it is applied to a Project.

## 20.5 Build Pack

The existing manual Build Pack UI should submit through the same Pack Service contract.

It must not use a separate incompatible data model.

---

# 21. FlowAI Pack Gen Handoff

FlowAI returns a proposal.

Pack Service creates the accepted Pack Specification.

Recommended flow:

```text
POST /api/v1/flowai/requests
→ FlowAI proposal
→ user reviews assumptions
→ PUT /api/v1/projects/:projectId/pack-specification
→ Pack Service validates
→ accepted Pack Specification
```

Do not persist the model response directly as authoritative Project data.

---

# 22. Cutter Specification Contract

```ts
type CutterSpecification = {
  id: string;
  projectId: string;
  packSpecificationId: string;
  packType: PackType;
  units: "mm";
  dimensions: CutterDimensions;
  layers: CutterLayer[];
  elements: CutterElement[];
  measurements?: CutterMeasurement[];
  generatedFromPackRevision: string;
  createdAt: string;
  updatedAt: string;
  revision: string;
};
```

```ts
type CutterDimensions = {
  flatWidthMm: number;
  flatHeightMm: number;
  repeatMm?: number;
  webWidthMm?: number;
};
```

Detailed geometry belongs to domain types and the Database Schema.

---

# 23. Cutter Generation API

```text
POST /api/v1/projects/:projectId/cutter/generate
```

Request:

```ts
type GenerateCutterRequest = {
  expectedProjectRevision: string;
  packSpecificationRevision: string;
  options?: {
    includeSafeZones?: boolean;
    includeEyemarks?: boolean;
    includeMeasurements?: boolean;
  };
};
```

Response:

```ts
type GenerateCutterResponse = {
  cutterSpecification: CutterSpecification;
  assumptions: EngineeringAssumption[];
  validationSummary?: ValidationSummary;
  projectRevision: string;
};
```

Cutter generation must use Kyza Tech deterministic services.

FlowAI must not calculate authoritative cutter geometry.

---

# 24. Cutter Read API

```text
GET /api/v1/projects/:projectId/cutter
```

The response must return the structured Cutter Specification required to restore Cutter Studio.

A preview image alone is insufficient.

---

# 25. Cutter Action API

Use typed actions for engineering changes.

```text
POST /api/v1/projects/:projectId/cutter/actions
```

Recommended request:

```ts
type CutterActionRequest =
  | MoveCutterElementAction
  | ResizeCutterElementAction
  | RotateCutterElementAction
  | SetElementVisibilityAction
  | SetElementLockAction
  | DeleteCutterElementAction
  | UpdateElementAppearanceAction
  | UpdateCutterParameterAction;
```

Every action should include:

- Action type
- Target element or parameter
- Expected cutter revision
- Required values
- User approval reference where applicable
- FlowAI recommendation ID where applicable

The Cutter Service must:

- Check permission
- Check lock/protection
- Check pack-specific rule
- Apply dependent calculations
- Update revision
- Return changed Cutter Specification or patch result
- Indicate whether revalidation is required

Avoid unrestricted `Partial<CutterElement>` mutations for protected engineering values.

---

# 26. Appearance Versus Geometry

Visual appearance updates may include:

- Display colour
- Opacity
- Line style
- Stroke presentation
- Preset

Appearance actions must not change:

- Position
- Dimensions
- Pack rule
- Seal width
- Fold geometry
- Gusset geometry
- Eyemark engineering parameters

The API/domain contract should keep appearance and engineering parameters distinct.

---

# 27. Validation API

## 27.1 Run Validation

```text
POST /api/v1/projects/:projectId/validation-runs
```

Request:

```ts
type RunValidationRequest = {
  projectRevision: string;
  scope?: "project" | "pack" | "cutter" | "export";
  exportFormat?: ExportFormat;
};
```

## 27.2 Read Latest Summary

```text
GET /api/v1/projects/:projectId/validation-summary
```

## 27.3 Read Validation Run

```text
GET /api/v1/projects/:projectId/validation-runs/:validationRunId
```

## 27.4 Read Issue

```text
GET /api/v1/projects/:projectId/validation-issues/:issueId
```

## 27.5 Acknowledge Warning

Where allowed:

```text
POST /api/v1/projects/:projectId/validation-issues/:issueId/acknowledge
```

Acknowledgement must not convert a failed deterministic rule into Pass.

Critical issue overrides, if ever supported, require a separate permission-controlled contract and audit record.

---

# 28. Validation Consistency

The following must use the same Validation Service result:

- Cutter Studio status strip
- Validation Centre
- Dashboard Project status where shown
- Export Release
- FlowAI validation explanation
- Project summary

Do not compute separate error counts in each module.

All consumers must compare `validatedProjectRevision` with `currentProjectRevision`. A prior Passed or Failed run becomes Stale after a relevant Project change.

---

# 29. FlowAI API

Recommended endpoint:

```text
POST /api/v1/flowai/requests
```

The request should contain:

- Intent
- Module
- Project reference
- Selected element reference
- Validation issue references
- User prompt where relevant
- Response depth

It should not contain:

- Provider system prompt
- API key
- Untrusted rule overrides
- Full unrelated Project data
- Arbitrary executable action names

The trusted service should:

- Authorise the request
- Build context
- Retrieve rules
- Call the provider adapter
- Validate the response schema
- Filter/validate action proposals
- Return FlowAI trace metadata

Detailed contracts belong in `08_AI_Architecture.md`.

---

# 30. FlowAI Action Execution

FlowAI action proposals are not executed through the FlowAI response endpoint.

Correct flow:

```text
FlowAI proposes typed action
→ UI displays exact change
→ user confirms
→ domain endpoint receives approved command
→ Permission Service validates
→ Pack/Cutter/Project Service applies
→ Validation Service re-runs if required
```

This preserves deterministic authority.

---

# 31. Export Contract

```ts
type ExportFormat =
  | "svg"
  | "pdf"
  | "json"
  | "dxf"
  | "ai";
```

Availability must be reported separately.

```ts
type ExportCapability = {
  format: ExportFormat;
  supported: boolean;
  betaSupported: boolean;
  reasonUnavailable?: string;
};
```

Do not expose a format as active because it exists in an enum.

---

# 32. Export API

## 32.1 Capabilities

```text
GET /api/v1/export-capabilities
```

## 32.2 Prepare Export

```text
POST /api/v1/projects/:projectId/exports/prepare
```

Returns:

- Current Project revision
- Validation status
- Blocking issues
- Warnings
- Supported format settings
- Proposed file name
- Assumptions/limitations

## 32.3 Generate Export

```text
POST /api/v1/projects/:projectId/exports
```

Request:

```ts
type GenerateExportRequest = {
  projectRevision: string;
  validationRunId?: string;
  format: ExportFormat;
  options: ExportOptions;
  acknowledgedWarningIds?: string[];
};
```

## 32.4 Read Export Status

For asynchronous generation:

```text
GET /api/v1/projects/:projectId/exports/:exportId
```

## 32.5 Download

```text
GET /api/v1/projects/:projectId/exports/:exportId/download
```

Downloads should use short-lived authorised access where a remote backend is used.

---

# 33. Export Record

```ts
type ExportRecord = {
  id: string;
  projectId: string;
  projectRevision: string;
  format: ExportFormat;
  fileName: string;
  status: "queued" | "processing" | "ready" | "failed";
  validationRunId?: string;
  validationStatusAtExport?: ValidationSummary["status"];
  warningIds?: string[];
  assetId?: string;
  createdBy?: string;
  createdAt: string;
  completedAt?: string;
  failureCode?: string;
};
```

Export history must identify the Project revision used.

---

# 34. Dashboard and Project Search API

Dashboard should not maintain a separate mock-only Project list after real Project service integration.

Recommended service functions:

```ts
listRecentProjects(input): Promise<ApiResponse<ProjectListResponse>>;

searchProjects(input): Promise<ApiResponse<ProjectListResponse>>;

getProjectSummary(projectId): Promise<ApiResponse<ProjectSummary>>;
```

Quick Links should open existing routes or service-backed workflows.

They should not create empty API calls solely to appear functional.

---

# 35. User and Preference API

Beta endpoints may include:

```text
GET   /api/v1/me
GET   /api/v1/me/preferences
PATCH /api/v1/me/preferences
```

Preferences may include:

```ts
type UserPreferences = {
  units: "mm";
  theme?: "light" | "dark" | "system";
  packDefaults?: Partial<PackDefaults>;
  cutterDefaults?: Partial<CutterDefaults>;
  exportDefaults?: Partial<ExportDefaults>;
};
```

Rules:

- Explicit Project values override preferences.
- Pack-specific rules override generic preferences where required.
- Preferences must be validated.
- Theme may remain locally stored if that is the deliberate product choice.

---

# 36. Asset and Import API

Beta scope should remain controlled.

Potential endpoints:

```text
POST /api/v1/projects/:projectId/assets
GET  /api/v1/projects/:projectId/assets
GET  /api/v1/projects/:projectId/assets/:assetId
```

The service must validate:

- File type
- File size
- Intended module
- Permission
- Project access
- Upload status

Do not treat an uploaded image as structured cutter geometry.

Import conversion must be explicit.

Future artwork assets may require separate processing states and storage rules.

---

# 37. Authentication Architecture

The controlled development app may use mock authentication.

External beta requires a deliberate access model.

Potential session endpoints:

```text
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/session
```

Security requirements:

- Secure session handling
- No access token in insecure long-term browser storage where avoidable
- Protected routes
- Expiry handling
- CSRF protection where cookie sessions are used
- Safe logout
- No hardcoded production users

Authentication choice must match the beta audience and hosting architecture.

---

# 38. Permission Model

Example permissions:

```ts
type Permission =
  | "project:create"
  | "project:read"
  | "project:update"
  | "project:archive"
  | "pack:update"
  | "cutter:read"
  | "cutter:edit"
  | "validation:run"
  | "validation:acknowledge"
  | "export:prepare"
  | "export:generate"
  | "flowai:use"
  | "preferences:update";
```

Post-beta permissions may include:

- Artwork
- Company administration
- Approval
- Customer review
- Printer review
- Rule management
- Press-profile management

The frontend may use permissions to present controls.

The trusted service must enforce them.

---

# 39. Idempotency

Use idempotency for operations where duplicate requests could create duplicate results.

Candidates:

- Project creation
- Cutter generation
- Validation run
- Export generation
- FlowAI accepted action
- File upload finalisation

A request may include:

```text
Idempotency-Key: <unique value>
```

The service should return the original result for safe duplicate requests.

This is especially important when a user double-clicks or a network retry occurs.

---

# 40. Pagination and Filtering

Use cursor pagination for scalable lists.

Example:

```ts
type CursorPage<T> = {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
};
```

Support filters only where the UI or product needs them.

Do not overbuild complex reporting filters before Beta Core.

---

# 41. Mock and Local Adapter Parity

Recommended interfaces:

```ts
interface ProjectRepository {
  list(input: ListProjectsInput): Promise<ApiResponse<ProjectListResponse>>;
  get(projectId: string): Promise<ApiResponse<Project>>;
  create(input: CreateProjectRequest): Promise<ApiResponse<Project>>;
  update(projectId: string, input: UpdateProjectRequest): Promise<ApiResponse<Project>>;
}
```

Implementations may include:

- `MockProjectRepository`
- `LocalProjectRepository`
- `ApiProjectRepository`

The module should depend on the interface/service, not the chosen adapter.

The same principle applies to:

- Pack
- Cutter
- Validation
- Export
- FlowAI

---

# 42. Schema Validation

Use runtime schema validation at untrusted boundaries.

Validate:

- API requests
- API responses
- Local-storage restoration
- Imported Project files
- FlowAI responses
- Provider responses
- File metadata
- Migration results

TypeScript types alone do not validate runtime data.

Malformed saved data should produce a recoverable error rather than crash the app.

---

# 43. Project Import and Migration

If Projects can be imported or restored from earlier versions:

- Include schema version.
- Validate before use.
- Migrate through explicit version steps.
- Preserve a backup where practical.
- Report unsupported versions clearly.
- Do not silently drop unknown engineering fields.
- Re-run validation after migration where required.

Recommended Project envelope:

```ts
type ProjectDocument = {
  schemaVersion: string;
  exportedAt?: string;
  project: Project;
};
```

---

# 44. Activity and Audit

Beta activity may remain lightweight.

Record events with engineering or release significance.

```ts
type ActivityEvent = {
  id: string;
  projectId: string;
  projectRevision?: string;
  actorId?: string;
  eventType: string;
  summary: string;
  affectedObjectType?: string;
  affectedObjectId?: string;
  source?: "user" | "system" | "flowai";
  createdAt: string;
};
```

Do not store hidden FlowAI reasoning.

For a FlowAI action, store:

- Recommendation/action ID
- User approval
- Applied domain change
- Resulting revision
- Revalidation result where applicable

---

# 45. Observability

Remote services should support:

- Request ID
- Correlation ID
- Structured error logs
- Latency
- Service name
- Route/action
- Result status
- Project ID where safe
- User/workspace ID where safe
- Export job status
- FlowAI trace ID
- Validation run ID

Do not log:

- Provider keys
- Passwords
- Authentication secrets
- Complete sensitive file contents
- Unnecessary personal/customer data
- Hidden model reasoning

---

# 46. Security Principles

The API architecture must support:

- Authentication
- Authorisation
- Project/workspace isolation
- Input validation
- Output encoding
- Safe file handling
- Rate limiting where needed
- Secure provider credentials
- Audit of production-critical actions
- Short-lived download access
- Secret management
- Dependency updates
- Safe error messages

The service must never trust:

- Hidden UI controls
- Client-provided permissions
- Model-generated actions
- Imported Project data
- Uploaded document instructions
- Unvalidated geometry patches

---

# 47. FlowAI Security Boundary

The UI should submit intent and references.

The trusted service should gather:

- Authorised Project data
- Validation data
- Engineering rule references
- Selected-element context

Provider credentials remain server-side.

FlowAI output must pass:

- Schema validation
- Action allowlist
- Permission mapping
- Approval classification

A raw model response must never be executed as a domain command.

---

# 48. Performance Principles

Beta performance priorities:

- Fast recent-Project load
- Responsive local editing
- No network request for every pointer movement
- Batched or debounced non-critical UI updates
- Explicit save state
- Efficient Cutter Specification transfer
- Validation run feedback
- Export progress feedback
- FlowAI timeout and cancellation handling

High-frequency cutter interactions may update local working state first and persist through controlled commands or batched save.

Engineering validity must still be checked by the domain service.

---

# 49. Offline and Failure Behaviour

Where local/offline support exists:

- Indicate unsaved local changes.
- Indicate whether the server is unavailable.
- Avoid claiming a remote save succeeded.
- Queue only actions designed for safe replay.
- Do not queue irreversible export/release operations silently.
- Resolve revision conflicts intentionally after reconnection.

If offline support is not implemented, fail clearly and preserve local working data where possible.

---

# 50. Future Artwork API Boundary

Artwork Service is post-beta unless enabled deliberately.

Future responsibilities:

- Artwork assets
- Placement state
- Layer metadata
- Cutter alignment
- Bleed and safe-zone analysis
- Barcode/QR metadata
- Colour/white/varnish metadata
- Artwork validation
- Artwork revisions
- Export handoff

Artwork should reference the current Cutter Specification.

It must not recreate a separate cutter.

---

# 51. Future Knowledge API Boundary

Knowledge Service may expose structured engineering knowledge.

Potential endpoints:

```text
GET /api/v1/engineering-rules
GET /api/v1/engineering-rules/:ruleId
POST /api/v1/engineering-rules/search
```

Results should include:

- Rule ID
- Title
- Status
- Scope
- Certainty
- Pack/process/customer applicability
- Superseded status
- Source version

The API does not treat arbitrary Markdown text as executable engineering logic.

---

# 52. Future Press and Production API Boundary

Post-beta services may include:

- Press profiles
- Machine profiles
- Substrates
- Fingerprint profiles
- Colour-unit limitations
- Plate specifications
- Web-width and repeat constraints
- Customer rules
- Printer rules

These services may influence Pack, Validation, FlowAI and Export through explicit references.

They must not become hidden global overrides.

---

# 53. Future Integration Boundary

Potential future integrations include:

- Adobe Illustrator
- Esko
- Hybrid Software
- GMG
- MIS/ERP platforms
- Microsoft 365
- Google Workspace
- Airtable
- Automation platforms
- Webhooks

Rules:

- Use stable service contracts.
- Avoid direct UI automation as core integration architecture.
- Use scoped credentials.
- Record integration failures.
- Make import/export transformations explicit.
- Do not make external platforms the Kyza source of Project truth.

---

# 54. Airtable Boundary

Airtable manages:

- Actions
- KYZA IDs
- Sprints
- Bugs
- Acceptance criteria
- Evidence
- Roadmap status

Airtable does not act as the runtime API or permanent Project database.

If Airtable is used temporarily for prototype records:

- Isolate the adapter.
- Use Kyza-owned types.
- Document the limitation.
- Avoid coupling domain logic to Airtable field names.
- Plan migration.

---

# 55. Testing Expectations

Detailed QA belongs in `10_Testing_QA.md`.

API-level testing should include:

## Unit

- Request validation
- Domain service behaviour
- Error mapping
- Permission checks
- Revision conflict
- Validation summary
- Export capability
- FlowAI action allowlist

## Contract

- Request/response schemas
- Mock/local/API parity
- Version compatibility
- FlowAI response validation
- Project import/export schema

## Integration

- Project create/save/reopen
- Pack update → Cutter generation
- Cutter action → revision update
- Validation → shared status
- Export → validation block
- FlowAI proposal → approved domain action

## End to End

- Dashboard → Project → Pack Gen → Cutter → Validation → Save → Reopen → Export

---

# 56. Current API Priorities

Current priorities are:

1. Audit the real current service and persistence code.
2. Identify the actual Project source of truth.
3. Consolidate duplicate Project types and stores.
4. Define one Project Service interface.
5. Make Dashboard search/recent Projects use Project Service.
6. Make Prompt and Build Pack use one Pack Service contract.
7. Make Cutter Studio load/save one Cutter Specification.
8. Use typed Cutter actions for protected changes.
9. Make Validation Centre, Cutter status and Export use one Validation result source.
10. Establish export capability and release contracts.
11. Align FlowAI requests with `08_AI_Architecture.md`.
12. Add revision/conflict handling.
13. Add runtime schema validation.
14. Make mock/local/remote adapters contract-compatible.
15. Keep Artwork, Press, Reports and Administration post-beta.

---

# 57. Suggested Code Structure

Exact repository structure may differ.

A suitable direction is:

```text
src/
  api/
    api.types.ts
    api.errors.ts
    api.client.ts
    api.schemas.ts
  domain/
    project/
    pack/
    cutter/
    validation/
    export/
    permissions/
  services/
    projectService.ts
    packService.ts
    cutterService.ts
    validationService.ts
    exportService.ts
    flowAIService.ts
    preferenceService.ts
  repositories/
    mock/
    local/
    remote/
  state/
  modules/
```

Server-side code may use:

```text
server/
  routes/
  services/
  domain/
  repositories/
  middleware/
  providers/
  jobs/
```

Do not force this structure if the current repository has a coherent equivalent.

---

# 58. Codex Implementation Rules

Codex must:

- Read `01_Product_Architecture.md` before changing service boundaries.
- Read `04_Engineering_Knowledge_Base.md` before changing engineering contracts.
- Read `08_AI_Architecture.md` before changing FlowAI endpoints.
- Keep Project as the parent object.
- Reuse shared types.
- Avoid duplicate stores.
- Keep UI components free from domain logic where practical.
- Keep deterministic validation separate from FlowAI.
- Use typed domain actions for protected Cutter changes.
- Preserve Project revision and saved-data compatibility.
- Add migrations for breaking stored-data changes.
- Use standard errors.
- Keep validation issues separate from API errors.
- Enforce permissions in trusted code.
- Validate untrusted runtime data.
- Keep provider keys and secrets out of browser code.
- Add tests for changed contracts.
- Report files changed, tests run and limitations.

Codex must not:

- Create a new Project model for one module.
- Persist raw FlowAI responses as engineering truth.
- Let a generic patch bypass Cutter rules.
- Use `any` as the default API type.
- Expose unsupported export formats as active.
- Couple core logic to Airtable.
- Add post-beta APIs during a focused beta task without approval.
- Break saved Projects without migration.
- Return fake successful responses for unfinished functionality.

---

# 59. API Completion Criteria

An API/service capability is complete only when:

- Service ownership is clear.
- Request type is defined.
- Runtime validation exists at untrusted boundaries.
- Response type is defined.
- Permission behaviour is defined.
- Project revision behaviour is defined where relevant.
- Domain rules are applied by the correct service.
- Errors are recoverable and useful.
- Validation issues are not confused with transport errors.
- Mock/local/remote behaviour is compatible where applicable.
- Loading and failure states are supported.
- Relevant tests pass.
- Saved Project compatibility is preserved.
- Documentation and Airtable are updated.

---

# 60. Source Ownership

This document controls:

- API/service boundaries
- Endpoint direction
- Request and response envelopes
- Domain handoff contracts
- Permission enforcement expectations
- Revision and concurrency behaviour
- Error model
- Mock/local/remote adapter expectations
- Integration boundaries
- API implementation guidance

Other sources control:

- `01_Product_Architecture.md` — product hierarchy and release scope
- `04_Engineering_Knowledge_Base.md` — engineering rules
- `06_Database_Schema.md` — persistent entities, fields and relationships
- `07_UI_Design_System.md` — visual and interaction behaviour
- `08_AI_Architecture.md` — FlowAI prompts, context and response semantics
- `09_Development_Roadmap.md` — implementation sequence
- `10_Testing_QA.md` — formal testing and release gates

Where an API contract conflicts with the Product Architecture, the Product Architecture controls product responsibility.

Where it conflicts with a validated engineering rule, the Engineering Knowledge Base controls engineering meaning.

---

# 61. Final API Rule

The Kyza API and service layer must make the application behave as one connected, controlled packaging-engineering product.

It must:

- Keep Project data central
- Preserve engineering authority
- Keep UI and domain responsibilities separate
- Make validation reusable
- Keep FlowAI assistive rather than authoritative
- Protect saved Project state
- Support a controlled beta now
- Remain ready for a secure backend later

The architecture should expand only when the Beta Core workflow is reliable.

---

# Change Log

## Cross-Source Consistency Pass — 19 July 2026

- Defined API revision values as opaque strings mapped from database revision values.
- Aligned Validation Issue resolution fields with the Database Schema.
- Added Stale and Error to the shared Validation Summary.
- Defined Passed, Failed and Stale against the current Project revision.
- Defined `ready_for_export` as a derived/service-controlled state.
- Required all modules to compare validated and current Project revisions.

## Version 2.1 — 19 July 2026

- Consolidated duplicate API Architecture variants into one authoritative source.
- Reframed the source from Kyza platform API to Kyza App API and Kyza Tech service architecture.
- Removed references to the nonexistent `00_Master_Context.md`.
- Removed active dependencies on unconfirmed Development Standards and Decision Log files.
- Replaced the old full-platform-first API scope with Beta Core and post-beta boundaries.
- Repositioned Artwork, Press, Reports, Administration and integrations as post-beta.
- Removed Airtable from the runtime API domain.
- Defined clear UI, state, application-service, domain and persistence layers.
- Defined Project, Pack, Cutter, Validation, Export, FlowAI and Preference service ownership.
- Strengthened the deterministic authority boundary.
- Added standard response, metadata and error contracts.
- Separated API errors from Validation Issues.
- Preserved canonical Critical, Warning, Advisory and Pass severities.
- Added Project revision and concurrency handling.
- Added controlled typed Cutter action contracts.
- Separated visual appearance from engineering geometry updates.
- Defined FlowAI proposal-to-domain-action handoff.
- Added export capability, preparation and generation contracts.
- Added mock/local/remote adapter parity.
- Added runtime schema validation and Project migration requirements.
- Added idempotency, observability, security and performance guidance.
- Added current beta API priorities, completion criteria and source ownership.
