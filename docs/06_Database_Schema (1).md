---
document_name: Klyro Database Schema
file_name: 06_Database_Schema.md
version: 2.1
status: Current — Cross-Source Aligned Beta Baseline
owner: Sean Johnston / Klyro
last_reviewed: 2026-07-19
source_replaces: 06_Database_Schema.md v1.0
authority: Persistent entities, relationships, ownership, revisions, storage boundaries, migrations and data-integrity rules
related_sources:
  - 01_Product_Architecture.md
  - 04_Engineering_Knowledge_Base.md
  - 05_API_Architecture.md
  - 07_UI_Design_System.md
  - 08_AI_Architecture.md
  - 09_Development_Roadmap.md
  - 10_Testing_QA.md
---

# Klyro Database Schema

## Document Purpose

This document defines the intended persistent data model for the Klyro App.

It establishes:

- Project-centred data ownership
- Beta and post-beta entity boundaries
- Persistent entity names and relationships
- Stable identifiers, timestamps and units
- Project revision and migration strategy
- Pack and Cutter persistence
- Validation persistence
- Export records and file references
- Engineering assumptions and activity history
- FlowAI persistence boundaries
- User preferences and future workspace ownership
- JSON and relational-data rules
- File-storage boundaries
- Local, mock and hosted-database compatibility
- Security, retention and integrity requirements
- Codex implementation rules

This source describes the target logical schema.

It does not claim that every table or relationship is already implemented.

The current application may use frontend state, browser storage, mock repositories or JSON fixtures. Those temporary implementations must remain compatible with this model where practical.

`01_Product_Architecture.md` controls product hierarchy and release scope.

`04_Engineering_Knowledge_Base.md` controls engineering meaning and rule status.

`05_API_Architecture.md` controls service and endpoint contracts.

`08_AI_Architecture.md` controls FlowAI requests, responses and approval behaviour.

There is no separate `00_Master_Context.md`.

---

# 1. Product and Data Context

## 1.1 Klyro

Klyro is the customer-facing master brand.

## 1.2 Klyro App

The Klyro App is the connected Project environment.

Its Beta Core includes:

- Dashboard and Project access
- Pack Gen
- Cutter Studio
- Validation Centre
- Export Release
- Account & Specs essentials

## 1.3 CutNFlow / CnF Tech

CutNFlow/CnF Tech is the deterministic packaging-engineering capability.

It creates or manages structured:

- Pack Specifications
- Cutter Specifications
- Cutter elements
- Engineering assumptions
- Validation results
- Export-ready technical data

## 1.4 FlowAI

FlowAI is the intelligence, explanation and guided-assistance layer.

FlowAI may create proposals, explanations and approved-action records.

FlowAI does not own the authoritative Project, Pack, Cutter or Validation state.

---

# 2. Core Database Principle

The Project is the parent business object.

A Project connects the user’s product requirement to:

- Product information
- Pack Specification
- Cutter Specification
- Engineering assumptions
- Validation
- Notes
- Activity and revisions
- Export records
- FlowAI recommendations and approved actions
- Future artwork and production configuration

The database must not become a loose collection of disconnected files or module-specific records.

A preview image, exported file, AI response or cutter element is always subordinate to a Project or a controlled global library.

---

# 3. Schema Status and Implementation Rule

This document defines the intended logical schema.

Before implementing database changes, Codex must identify:

- The current Project type
- Existing stores and reducers
- Existing local-storage keys
- Existing mock fixtures
- Existing Pack and Cutter types
- Existing validation objects
- Existing export records
- Existing save/reopen behaviour
- Existing schema/version fields

Do not replace working persistence blindly.

Use migrations and adapters where stored data already exists.

A schema record may be:

- Logical only
- Represented in TypeScript
- Stored inside a Project document
- Stored as an individual relational table
- Added later during hosted-backend migration

The release classification in this document controls priority.

---

# 4. Design Principles

The data model should be:

- Project-centred
- Traceable
- Revision-aware
- Pack-specific
- Validation-ready
- Export-ready
- FlowAI-compatible
- User/workspace-aware
- Secure
- Portable
- Searchable
- Migration-friendly
- Strict where engineering integrity matters
- Flexible where geometry and future features vary

Avoid:

- One unversioned global state object
- Array indexes as IDs
- Ambiguous units
- Module-specific duplicate Project types
- Validation status stored independently by several modules
- Raw AI responses treated as engineering truth
- Large binary files stored directly in relational rows
- Important searchable fields hidden only in JSON
- Silent breaking changes to saved Projects
- A full post-beta schema blocking the beta workflow

---

# 5. Release Classification

## 5.1 Beta Core Entities

Required for the connected beta workflow:

- `projects`
- `product_information`
- `pack_specifications`
- `pack_features`
- `cutter_specifications`
- `cutter_layers`
- `cutter_elements`
- `engineering_assumptions`
- `project_notes`
- `validation_runs`
- `validation_issues`
- `export_records`
- `assets`
- `project_revisions` or equivalent versioned Project snapshots
- `activity_events`
- `user_preferences` where required by Account & Specs

## 5.2 Beta Supporting Entities

May be required depending on the release model:

- `users`
- `sessions`
- `workspaces`
- `workspace_members`
- `flowai_recommendations`
- `flowai_action_approvals`
- `feature_flags`
- `schema_migrations`

## 5.3 Post-Beta Entities

Post-beta includes:

- `artwork_specifications`
- `artwork_placements`
- `templates`
- `engineering_rules`
- `knowledge_articles`
- `press_profiles`
- `production_configurations`
- `customer_rule_sets`
- `printer_rule_sets`
- `colour_profiles`
- `approval_records`
- `notifications`
- `reports`
- `billing_accounts`
- `subscriptions`
- `audit_logs` beyond the minimum security need

These may be described now for compatibility, but they must not delay Beta Core persistence.

---

# 6. Physical Storage Direction

The logical schema is provider-neutral.

A future hosted implementation should favour a relational database capable of:

- Transactions
- Foreign keys
- Row-level ownership controls
- JSON fields
- Indexing
- Full-text or structured search
- Reliable migrations

PostgreSQL or a PostgreSQL-backed platform such as Supabase is a suitable future direction, but this document does not force an immediate provider choice.

The current app may use:

- Browser local storage
- IndexedDB
- Local JSON Project files
- Mock repositories
- A hosted API/database

All persistence adapters should use Klyro-owned domain shapes.

---

# 7. Naming Conventions

## 7.1 Database Names

Use `snake_case` for physical relational names.

Examples:

- `pack_specifications`
- `validation_issues`
- `project_id`
- `created_at`

## 7.2 TypeScript and API Names

Use `camelCase`.

Examples:

- `packSpecifications`
- `validationIssues`
- `projectId`
- `createdAt`

## 7.3 IDs

Use stable opaque IDs.

Recommended hosted-database type:

- UUID

Recommended TypeScript type:

```ts
type EntityId = string;
```

Do not use display names or array positions as permanent IDs.

## 7.4 Timestamps

Store timestamps in UTC.

Recommended fields:

- `created_at`
- `updated_at`
- `archived_at`
- `deleted_at`
- `completed_at`
- `validated_at`
- `exported_at`

API representation uses ISO 8601 strings.

## 7.5 Units

Store engineering dimensions in millimetres.

Prefer explicit names:

- `finished_width_mm`
- `finished_height_mm`
- `gusset_mm`
- `repeat_mm`
- `web_width_mm`
- `opacity_percent`

Do not store unqualified `width` or `size` where the unit is ambiguous.

---

# 8. Schema Versioning

Every persisted Project document or database migration must be versioned.

## 8.1 Project Document Version

Use:

```ts
type ProjectDocumentEnvelope = {
  schemaVersion: string;
  exportedAt?: string;
  project: ProjectDocument;
};
```

Example:

```text
schemaVersion: "2.1"
```

The schema version describes data shape.

It is separate from:

- API version
- Product version
- Project revision
- Cutter revision
- Pack revision
- Document-source version

## 8.2 Database Migrations

A hosted database should maintain a `schema_migrations` record or framework-managed migration history.

Every breaking migration should define:

- From version
- To version
- Data transformation
- Rollback or backup approach
- Validation checks
- Impact on local/imported Project files
- Required revalidation

---

# 9. Ownership Model

## 9.1 Controlled Beta

The first beta may operate with:

- One authenticated user
- A limited invited user set
- User-owned Projects
- Optional workspace ownership

The database must not require a full company hierarchy merely to save a Project.

## 9.2 Future Workspaces

Future Klyro workspaces may support:

- Companies
- Teams
- Multiple user roles
- Shared Projects
- Customer/printer profiles
- Shared templates
- Press profiles
- Approval workflows

Use `workspace` as the general ownership term.

A company may be represented by a workspace without forcing every future workspace to be a legal company.

---

# 10. Users

## Table: `users`

Purpose:

- Store application user identity and account state

Recommended fields:

```text
id                  uuid primary key
email               text unique
display_name        text
avatar_url          text nullable
account_status      text
created_at          timestamptz
updated_at          timestamptz
last_login_at       timestamptz nullable
disabled_at         timestamptz nullable
```

Recommended account status:

```text
invited
active
disabled
```

Authentication secrets should be handled by the selected authentication provider.

Do not store plain-text passwords.

---

# 11. Workspaces

## Table: `workspaces`

Release classification:

- Beta Supporting or Post-Beta depending on access model

Recommended fields:

```text
id                  uuid primary key
name                text
workspace_type      text
country_code        text nullable
created_by          uuid references users(id)
created_at          timestamptz
updated_at          timestamptz
archived_at         timestamptz nullable
```

Possible workspace types:

```text
personal
company
test
```

## Table: `workspace_members`

Recommended fields:

```text
id                  uuid primary key
workspace_id        uuid references workspaces(id)
user_id             uuid references users(id)
role                text
permissions_json    jsonb nullable
created_at          timestamptz
updated_at          timestamptz
```

Possible future roles:

- owner
- admin
- manager
- engineer
- artwork_operator
- repro_operator
- viewer

Trusted services must enforce ownership and permission rules.

---

# 12. Projects

## Table: `projects`

The `projects` table is the central persistent record.

Recommended fields:

```text
id                          uuid primary key
workspace_id                uuid nullable references workspaces(id)
owner_id                    uuid nullable references users(id)
name                        text
reference                   text nullable
customer_name               text nullable
brand_name                  text nullable
description                 text nullable
status                      text
current_stage               text
schema_version              text
revision                    bigint
active_pack_specification_id uuid nullable
active_cutter_specification_id uuid nullable
latest_validation_run_id    uuid nullable
created_at                  timestamptz
updated_at                  timestamptz
archived_at                 timestamptz nullable
deleted_at                  timestamptz nullable
```

Circular active-record foreign keys may be added after related tables exist or represented through a separate active-record mapping.

The implementation should choose one consistent strategy.

## 12.1 Beta Project Status

Use:

```text
draft
in_progress
needs_attention
ready_for_export
exported
archived
```

Do not treat `approved` as a validation-generated beta status.

Approval is a separate future user-controlled concept.

`ready_for_export` should be derived or service-controlled rather than freely user-editable. It is valid only when required validation matches the current Project revision, no open export-blocking Critical issue remains and export prerequisites are satisfied. An engineering-affecting Project change must invalidate it.

## 12.2 Beta Project Stage

Use:

```text
project_setup
pack_generation
cutter_engineering
validation
export_release
```

Future stages may include:

```text
artwork_preparation
production_configuration
approval
```

## 12.3 Project Revision

`revision` is a monotonically increasing integer or equivalent immutable token.

In a relational database it may be stored as `bigint`. API and FlowAI contracts serialise the revision as an opaque string so clients do not calculate or invent revision values.

It changes after a successful persisted domain update.

It supports:

- Safe save
- Conflict detection
- Export traceability
- Validation traceability
- FlowAI action traceability

Do not silently overwrite a newer Project revision.

---

# 13. Product Information

## Table: `product_information`

Relationship:

- One current Product Information record per Project
- Historical changes may be captured through Project revisions/activity

Recommended fields:

```text
id                   uuid primary key
project_id           uuid unique references projects(id)
product_name         text nullable
product_category     text nullable
fill_weight_value    numeric nullable
fill_weight_unit     text nullable
storage_condition    text nullable
filling_method       text nullable
notes                text nullable
created_at           timestamptz
updated_at           timestamptz
```

Allowed fill units:

```text
g
kg
ml
l
```

Possible storage conditions:

```text
ambient
chilled
frozen
ovenable
unknown
```

Customer and brand are retained on the Project for search and may be copied into Product Information only if a defined use requires it.

Avoid duplicate unsynchronised ownership.

---

# 14. Pack Specifications

## Table: `pack_specifications`

Pack Specifications should be versionable.

A Project may have several historical Pack Specifications but only one active specification.

Recommended fields:

```text
id                       uuid primary key
project_id               uuid references projects(id)
revision                 bigint
pack_type                text
source                   text
status                   text
finished_width_mm        numeric nullable
finished_height_mm       numeric nullable
depth_mm                 numeric nullable
gusset_mm                numeric nullable
repeat_mm                numeric nullable
web_width_mm             numeric nullable
seal_configuration_json  jsonb nullable
eyemark_configuration_json jsonb nullable
material_json            jsonb nullable
pack_parameters_json     jsonb nullable
generated_by_flowai_record_id uuid nullable
created_by               uuid nullable references users(id)
created_at               timestamptz
updated_at               timestamptz
superseded_at            timestamptz nullable
```

## 14.1 Pack Type

Current domain values may include:

```text
flow_wrap
pillow_pack
three_side_seal_sachet
four_side_seal_sachet
doy_pouch
k_seal_pouch
lidded_film
custom
```

A value existing in the schema does not mean it is active in the beta.

Product support status belongs in code/configuration and the Product Architecture.

## 14.2 Source

Use:

```text
manual
flowai_proposal
template
import
```

A FlowAI proposal must be reviewed and accepted through Pack Service before becoming authoritative.

## 14.3 Status

Suggested values:

```text
draft
active
superseded
invalid
```

## 14.4 Pack-Specific Parameters

Pack-specific dimensions or settings may use `pack_parameters_json` initially.

Core searchable dimensions should remain normal columns.

Do not hide:

- Pack type
- Finished width
- Finished height
- Repeat
- Web width
- Project relationship
- Revision

only inside JSON.

---

# 15. Pack Features

## Table: `pack_features`

Purpose:

- Store structured optional and functional pack features

Recommended fields:

```text
id                       uuid primary key
project_id               uuid references projects(id)
pack_specification_id    uuid references pack_specifications(id)
feature_type             text
feature_role             text nullable
position_json            jsonb nullable
dimensions_json          jsonb nullable
parameters_json          jsonb nullable
source_rule_id           text nullable
created_at               timestamptz
updated_at               timestamptz
deleted_at               timestamptz nullable
```

Possible feature types:

- eyemark
- tear_notch
- grip_seal_zip
- grip_seal_default
- perforation
- hanger_hole
- half_moon
- window
- barcode_box
- bbe_box
- valve
- tac_hole
- custom

Features used directly by Cutter Studio may also exist as Cutter Elements.

The Pack Feature is the specification intent.

The Cutter Element is the generated geometric representation.

---

# 16. Materials

Material data may initially remain in `material_json` inside a Pack Specification.

A future normalised table may be introduced when:

- Materials require search
- Press compatibility is active
- Customer profiles reference materials
- Validation requires stable material IDs

Future table: `materials`

Possible fields:

```text
id
name
structure
print_surface
base_colour
laminate
recyclable
ovenable
status
notes
created_at
updated_at
```

Do not create a material table before the application has a clear ownership and reuse need.

---

# 17. Cutter Specifications

## Table: `cutter_specifications`

A Project may have several Cutter Specification revisions but one active cutter.

Recommended fields:

```text
id                           uuid primary key
project_id                   uuid references projects(id)
pack_specification_id        uuid references pack_specifications(id)
revision                     bigint
pack_type                    text
units                        text
flat_width_mm                numeric
flat_height_mm               numeric
repeat_mm                    numeric nullable
web_width_mm                 numeric nullable
generated_from_pack_revision bigint
status                       text
view_box_json                jsonb nullable
generator_version            text nullable
created_by                   uuid nullable references users(id)
created_at                   timestamptz
updated_at                   timestamptz
superseded_at                timestamptz nullable
```

Units should be:

```text
mm
```

Status may include:

```text
draft
active
superseded
invalid
```

A preview image is not the Cutter Specification.

---

# 18. Cutter Layers

## Table: `cutter_layers`

Purpose:

- Store logical Cutter Studio groups and export layers

Recommended fields:

```text
id                       uuid primary key
cutter_specification_id  uuid references cutter_specifications(id)
name                     text
group_key                text
layer_order              integer
visible                  boolean
locked                   boolean
exportable               boolean
protected                boolean
created_at               timestamptz
updated_at               timestamptz
```

Possible group keys:

- base
- cutter_edges
- seals
- fold_lines
- gusset_folds
- safe_zones
- eyemarks
- attributes
- imported_items
- annotations
- validation

Layer groups must derive from actual cutter data.

Do not create empty persistent layers solely for UI decoration.

---

# 19. Cutter Elements

## Table: `cutter_elements`

Purpose:

- Store individual structured cutter objects

Recommended fields:

```text
id                       uuid primary key
project_id               uuid references projects(id)
cutter_specification_id  uuid references cutter_specifications(id)
layer_id                 uuid references cutter_layers(id)
element_type             text
element_role             text nullable
geometry_json            jsonb
engineering_parameters_json jsonb nullable
appearance_json          jsonb nullable
metadata_json            jsonb nullable
visible                  boolean
locked                   boolean
editable                 boolean
deletable                boolean
protected                boolean
source_rule_id           text nullable
created_at               timestamptz
updated_at               timestamptz
deleted_at               timestamptz nullable
```

## 19.1 Element Types

Possible values:

- cut_line
- fold_line
- seal_area
- safe_zone
- eyemark
- tear_notch
- grip_seal
- perforation
- hanger_hole
- half_moon
- window
- barcode_box
- bbe_box
- gusset
- support_arm
- tac_hole
- measurement
- annotation
- imported_item

## 19.2 Geometry

Geometry must use a discriminated structured format.

Example:

```ts
type Geometry =
  | RectGeometry
  | LineGeometry
  | CircleGeometry
  | PathGeometry
  | PolygonGeometry
  | TextAnchorGeometry;
```

All engineering coordinates use millimetres.

Screen coordinates, zoom and pan must not replace engineering geometry.

## 19.3 Engineering Versus Appearance

Keep separate:

- `geometry_json`
- `engineering_parameters_json`
- `appearance_json`

Appearance may include:

- Display colour
- Opacity
- Line style
- Stroke presentation

Appearance must not silently change dimensions or engineering rules.

---

# 20. Cutter Measurements

Measurements may be generated dynamically from geometry.

Persist measurements only where they represent:

- User-created annotation
- Required technical dimension
- Exported dimension definition
- Named pack-specific reference

Future or optional table: `cutter_measurements`

Recommended fields:

```text
id
cutter_specification_id
measurement_type
start_reference_json
end_reference_json
value_mm
label
visible
exportable
created_at
updated_at
```

Do not store redundant calculated values unless traceability or performance requires them.

---

# 21. Engineering Assumptions

## Table: `engineering_assumptions`

Purpose:

- Store visible assumptions used to create or validate the Project

Recommended fields:

```text
id                       uuid primary key
project_id               uuid references projects(id)
pack_specification_id    uuid nullable references pack_specifications(id)
cutter_specification_id  uuid nullable references cutter_specifications(id)
field_key                text
value_json               jsonb
display_value            text
message                  text
source                   text
source_reference         text nullable
certainty                text
editable                 boolean
accepted                 boolean nullable
accepted_by              uuid nullable references users(id)
accepted_at              timestamptz nullable
affects_validation       boolean
created_at               timestamptz
updated_at               timestamptz
```

Source values:

```text
global_default
pack_rule
customer_rule
press_rule
user_preference
flowai_inference
manual
template
```

Certainty values:

```text
confirmed
assumed
inferred
unknown
```

Current examples include:

- Assumed generic 15 mm seal fallback
- Assumed 3 mm bleed
- Assumed one eyemark
- Assumed standard flexible film
- Assumed no Grip Seal (Zip)

Do not retain the superseded generic 10 mm seal assumption as the current default.

---

# 22. Project Notes

## Table: `project_notes`

Recommended fields:

```text
id               uuid primary key
project_id       uuid references projects(id)
author_id        uuid nullable references users(id)
note_type        text
content          text
created_at       timestamptz
updated_at       timestamptz
deleted_at       timestamptz nullable
```

Possible note types:

- general
- engineering
- validation
- export
- customer
- production

Notes are not Validation Issues.

---

# 23. Validation Runs

## Table: `validation_runs`

Each deterministic validation execution creates a Validation Run.

Recommended fields:

```text
id                    uuid primary key
project_id            uuid references projects(id)
project_revision      bigint
pack_specification_id uuid nullable references pack_specifications(id)
cutter_specification_id uuid nullable references cutter_specifications(id)
scope                 text
status                text
critical_count        integer
warning_count         integer
advisory_count        integer
export_blocked        boolean
validator_version     text nullable
created_by            uuid nullable references users(id)
started_at            timestamptz
completed_at          timestamptz nullable
failure_code          text nullable
```

Scope values:

```text
project
pack
cutter
export
artwork
production
```

Beta uses:

```text
project
pack
cutter
export
```

Status values stored on an individual run:

```text
running
passed
failed
error
```

Run outcome rules:

- `passed` — the completed run has no open Critical issues. Warnings and Advisories may remain.
- `failed` — the completed run has one or more open Critical issues.
- `error` — the validation process did not complete.

`not_run` and `stale` are derived Project Validation Summary states rather than stored completed-run outcomes.

- `not_run` — no completed Validation Run exists.
- `stale` — the latest completed run references an earlier Project revision.


---

# 24. Validation Issues

## Table: `validation_issues`

Recommended fields:

```text
id                    uuid primary key
validation_run_id     uuid references validation_runs(id)
project_id            uuid references projects(id)
rule_id               text
code                  text
severity              text
title                 text
message               text
affected_module       text
affected_object_type  text nullable
affected_object_id    uuid nullable
affected_layer_id     uuid nullable
suggested_action      text nullable
export_blocking       boolean
resolution_status     text
acknowledged_by       uuid nullable references users(id)
acknowledged_at       timestamptz nullable
resolved_by_revision  bigint nullable
created_at            timestamptz
updated_at            timestamptz
```

Severity values:

```text
critical
warning
advisory
pass
```

In most implementations, passed checks may be stored as summary/check records rather than individual issues. Use one consistent approach.

Resolution status:

```text
open
acknowledged
resolved
superseded
```

Acknowledging a Warning does not convert the rule result to Pass.

FlowAI does not update severity or export blocking.

---

# 25. Project Validation Summary

The latest validation summary may be:

- Derived from the latest completed Validation Run
- Cached on the Project for fast Dashboard access
- Returned by a materialised/query view

Do not allow different modules to maintain independent counts.

Recommended derived fields:

```text
status
critical_count
warning_count
advisory_count
export_blocked
latest_validation_run_id
validated_project_revision
current_project_revision
validated_at
```

Derived status values are:

```text
not_run
running
passed
failed
stale
error
```

Rules:

- Passed requires `validated_project_revision = current_project_revision` and zero open Critical issues.
- Failed requires matching revisions and one or more open Critical issues.
- Stale applies when the latest completed run references an earlier revision.
- Warnings and Advisories may remain when status is Passed.
- Release readiness must be false when status is Not Run, Running, Stale or Error.
- `export_blocked` is controlled by deterministic validation and Export Service policy.

If cached, update transactionally with the Validation Run and invalidate it after an engineering-affecting Project mutation.

---

# 26. Assets and Files

## Table: `assets`

Purpose:

- Store metadata and storage references for uploaded or generated files

Recommended fields:

```text
id                   uuid primary key
project_id           uuid nullable references projects(id)
workspace_id         uuid nullable references workspaces(id)
asset_type           text
file_name            text
mime_type            text
file_extension       text nullable
file_size_bytes      bigint nullable
storage_provider     text
storage_path         text
checksum             text nullable
status               text
uploaded_by          uuid nullable references users(id)
created_at           timestamptz
updated_at           timestamptz
deleted_at           timestamptz nullable
```

Possible asset types:

- import
- cutter_preview
- export
- artwork
- logo
- reference
- validation_report

The database stores metadata and references.

Binary content should normally live in object/file storage.

---

# 27. Export Records

## Table: `export_records`

Each export attempt or generated release creates one Export Record.

Recommended fields:

```text
id                         uuid primary key
project_id                 uuid references projects(id)
project_revision           bigint
cutter_specification_id    uuid nullable references cutter_specifications(id)
validation_run_id          uuid nullable references validation_runs(id)
format                     text
file_name                  text
status                     text
options_json               jsonb
warning_ids_json           jsonb nullable
validation_status_at_export text nullable
validated_project_revision bigint nullable
asset_id                   uuid nullable references assets(id)
created_by                 uuid nullable references users(id)
created_at                 timestamptz
completed_at               timestamptz nullable
failure_code               text nullable
```

Status values:

```text
queued
processing
ready
failed
```

Format values may include:

```text
svg
pdf
json
dxf
ai
```

A format existing in the schema does not mean it is currently supported.

Export capability belongs in Export Service configuration.

## 27.1 Multiple Files

If one release creates several files, use an optional child table:

### `export_files`

```text
id
export_record_id
asset_id
role
created_at
```

Do not require multi-file export packages for the first beta if one-file output is sufficient.

---

# 28. Project Revisions

## Table: `project_revisions`

Purpose:

- Record meaningful saved Project revisions
- Support traceability and migration
- Link validation and export to exact state

Recommended fields:

```text
id                   uuid primary key
project_id           uuid references projects(id)
revision_number      bigint
schema_version       text
change_type          text
summary              text nullable
snapshot_json        jsonb nullable
change_set_json      jsonb nullable
created_by           uuid nullable references users(id)
created_at           timestamptz
```

At least one of `snapshot_json` or `change_set_json` should be available if revision restoration is required.

The first beta may store complete snapshots for simplicity.

Do not create a revision for every pointer movement.

Create revisions for meaningful persisted state changes such as:

- Pack Specification accepted
- Cutter generated
- Cutter edit batch saved
- Validation-affecting change saved
- FlowAI-approved engineering action applied
- Import/migration completed

---

# 29. Activity Events

## Table: `activity_events`

Purpose:

- Store meaningful user/system events for Project history

Recommended fields:

```text
id                    uuid primary key
project_id            uuid references projects(id)
project_revision      bigint nullable
actor_id               uuid nullable references users(id)
source                 text
event_type             text
summary                text
affected_object_type   text nullable
affected_object_id     uuid nullable
details_json           jsonb nullable
created_at             timestamptz
```

Source values:

```text
user
system
flowai
migration
```

Example event types:

- project_created
- project_opened
- pack_specification_saved
- cutter_generated
- cutter_change_saved
- validation_run
- warning_acknowledged
- flowai_action_approved
- export_created
- project_archived
- project_migrated

Do not log every hover, selection or panel opening.

---

# 30. FlowAI Recommendations

## Table: `flowai_recommendations`

Release classification:

- Beta Supporting

Store only where a recommendation affects or may affect Project decisions.

Recommended fields:

```text
id                    uuid primary key
project_id            uuid nullable references projects(id)
project_revision      bigint nullable
user_id               uuid nullable references users(id)
intent                 text
status                 text
summary                text
structured_response_json jsonb
confidence             text nullable
prompt_template_id     text nullable
prompt_template_version text nullable
provider               text nullable
model                  text nullable
knowledge_reference_ids_json jsonb nullable
accepted               boolean nullable
accepted_at            timestamptz nullable
created_at             timestamptz
```

Status may include:

```text
success
partial
needs_input
unavailable
error
```

Do not store hidden reasoning.

Raw provider payloads should not be stored by default.

---

# 31. FlowAI Action Approvals

## Table: `flowai_action_approvals`

Purpose:

- Record approval of a FlowAI-proposed Project change

Recommended fields:

```text
id                         uuid primary key
project_id                 uuid references projects(id)
flowai_recommendation_id   uuid references flowai_recommendations(id)
action_type                text
risk                       text
target_object_type         text nullable
target_object_id           uuid nullable
proposed_change_json       jsonb
approved_by                uuid references users(id)
approved_at                timestamptz
applied                    boolean
applied_project_revision   bigint nullable
validation_run_id          uuid nullable references validation_runs(id)
failure_code               text nullable
```

Risk values:

```text
safe
review
critical
```

The record documents approval.

The responsible domain service still applies the change.

---

# 32. User Preferences

## Table: `user_preferences`

Recommended fields:

```text
id                    uuid primary key
user_id               uuid unique references users(id)
units                 text
theme                 text nullable
pack_defaults_json    jsonb nullable
cutter_defaults_json  jsonb nullable
export_defaults_json  jsonb nullable
created_at            timestamptz
updated_at            timestamptz
```

Rules:

- Explicit Project values override preferences.
- Pack-specific rules override incompatible generic defaults.
- Preferences must be validated.
- Theme may remain local-only if that is the deliberate implementation choice.

Do not store engineering rule authority as an unvalidated user preference.

---

# 33. Engineering Rules

## Table: `engineering_rules`

Release classification:

- Post-Beta structured knowledge, unless needed earlier for rule retrieval

Recommended fields:

```text
id                   uuid primary key
rule_id              text unique
name                 text
domain               text
status               text
certainty            text
scope_type           text
scope_reference      text nullable
rule_json            jsonb
reason               text nullable
validation_impact_json jsonb nullable
export_impact_json   jsonb nullable
flowai_explanation   text nullable
effective_at         timestamptz nullable
superseded_by_rule_id text nullable
created_at           timestamptz
updated_at           timestamptz
```

The human-readable authority remains `04_Engineering_Knowledge_Base.md`.

Structured rules should use stable IDs such as:

- `CNF-SEAL-GLOBAL-001`
- `CNF-KSL-GEOM-001`
- `CNF-EYE-GLOBAL-001`

Arbitrary Markdown must not be parsed as executable engineering logic.

---

# 34. Knowledge Articles

## Table: `knowledge_articles`

Release classification:

- Post-Beta

Recommended fields:

```text
id
title
topic
summary
content
status
tags_json
related_rule_ids_json
related_pack_types_json
workspace_id nullable
created_at
updated_at
```

Knowledge articles support:

- Search
- FlowAI retrieval
- Validation explanation links
- Training and help content

They are not deterministic rule records unless linked to an approved Engineering Rule.

---

# 35. Artwork Data

Artwork Studio is post-beta.

Future tables may include:

## `artwork_specifications`

```text
id
project_id
revision
cutter_specification_id
status
colour_summary_json
barcode_summary_json
white_plate_json
varnish_json
text_check_json
created_at
updated_at
```

## `artwork_placements`

```text
id
artwork_specification_id
asset_id
placement_json
transform_json
layer_role
locked
visible
created_at
updated_at
```

Artwork must reference the current Cutter Specification.

It must not recreate an independent cutter.

---

# 36. Templates

## Table: `templates`

Release classification:

- Post-Beta or Limited Beta when functional

Recommended fields:

```text
id
workspace_id nullable
name
description nullable
template_type
pack_type
pack_specification_json
cutter_defaults_json nullable
status
created_by nullable
created_at
updated_at
archived_at nullable
```

Template types may include:

- pack
- cutter_start
- customer
- printer
- Project starter

Templates must remain editable after application.

---

# 37. Press and Production Data

Post-beta entities may include:

## `press_profiles`

```text
id
workspace_id nullable
name
printer_name nullable
site_name nullable
print_method nullable
max_print_units nullable
web_width_min_mm nullable
web_width_max_mm nullable
repeat_min_mm nullable
repeat_max_mm nullable
default_lpi nullable
default_plate_thickness nullable
supported_substrates_json nullable
status
created_at
updated_at
```

## `production_configurations`

```text
id
project_id
press_profile_id nullable
print_method nullable
print_surface nullable
lpi nullable
plate_thickness nullable
minimum_dot nullable
maximum_dot nullable
settings_json nullable
created_at
updated_at
```

## `customer_rule_sets`

```text
id
workspace_id nullable
customer_name
status
rule_references_json
settings_json
created_at
updated_at
```

Press/customer rules may override global defaults only through explicit scope and authority.

---

# 38. Relationship Summary

High-level relationships:

```text
user
  ├── owns Projects
  ├── has user_preferences
  └── belongs to workspaces through workspace_members

workspace
  ├── has members
  ├── owns shared Projects
  ├── owns templates
  ├── owns press profiles
  └── owns customer rule sets

project
  ├── has one product_information record
  ├── has many pack_specifications, one active
  ├── has many cutter_specifications, one active
  ├── has many engineering_assumptions
  ├── has many project_notes
  ├── has many validation_runs
  ├── has many validation_issues through runs
  ├── has many export_records
  ├── has many assets
  ├── has many project_revisions
  ├── has many activity_events
  ├── may have FlowAI recommendations
  └── later has artwork and production records

pack_specification
  └── has many pack_features

cutter_specification
  ├── has many cutter_layers
  └── has many cutter_elements

validation_run
  └── has many validation_issues

export_record
  └── references one or more generated assets
```

---

# 39. Indexing

Recommended indexes for hosted storage:

## Projects

- `workspace_id`
- `owner_id`
- `updated_at desc`
- `status`
- `current_stage`
- Search index across name, reference, customer and brand

## Pack Specifications

- `project_id`
- `pack_type`
- `project_id + revision`
- Active/superseded status

## Cutter Specifications

- `project_id`
- `pack_specification_id`
- `project_id + revision`

## Cutter Elements

- `cutter_specification_id`
- `layer_id`
- `element_type`

## Validation

- `project_id`
- `validation_run_id`
- `severity`
- `code`
- `export_blocking`

## Exports

- `project_id`
- `created_at desc`
- `status`
- `format`

## Activity

- `project_id + created_at desc`

Do not add indexes merely because a field exists.

Use actual query and scale evidence.

---

# 40. Constraints and Integrity

Recommended integrity rules:

- Project revision cannot be negative.
- Pack and Cutter revisions must be unique within their Project.
- Engineering dimensions must be positive where required.
- `units` must be `mm` for current Cutter Specifications.
- A Cutter Specification must reference a Pack Specification from the same Project.
- A Cutter Element must reference a Layer from its Cutter Specification.
- A Validation Issue must reference its Validation Run.
- An Export Record must reference the exact Project revision used and, for a release export, the Validation Run or validated Project revision used to authorise release.
- A FlowAI approval must reference the approving user.
- Protected Cutter Elements cannot be deleted through ordinary actions.
- Archived records remain traceable.
- Active record references must belong to the same Project.

Domain rules such as pack geometry remain in CnF Tech and Validation Service.

Database constraints support integrity but do not replace pack-specific engineering.

---

# 41. Transactions

Use transactions for multi-record operations such as:

- Accept Pack Specification and update active Project reference
- Generate Cutter and activate new Cutter revision
- Apply approved FlowAI engineering change
- Save Cutter edit batch and increment Project revision
- Complete Validation Run and update summary cache
- Complete Export Record and attach generated asset
- Archive Project and related active states where required

Avoid leaving a Project pointing to half-created records.

---

# 42. JSON Field Strategy

JSON is suitable for:

- Geometry
- Pack-specific parameters
- Appearance
- Metadata
- Export options
- FlowAI structured responses
- Material details during early implementation
- Future colour/barcode summaries

Normal relational fields should be used for:

- IDs
- Ownership
- Pack type
- Status
- Stage
- Revision
- Core dimensions
- Severity
- Rule ID
- Export blocking
- Timestamps
- Searchable names/references

Rules:

- Define runtime schemas for JSON payloads.
- Version JSON shapes when they become persistent.
- Do not store unbounded arbitrary component state.
- Do not store screen coordinates as engineering geometry.
- Do not duplicate normal fields inside JSON without a clear reason.

---

# 43. File Storage

Files should normally live outside the relational database.

Examples:

- Uploaded artwork
- Reference images
- Imported files
- Generated SVG/PDF/JSON
- Future AI/CAD files
- Validation reports

The database stores:

- Asset ID
- Project/workspace relationship
- File metadata
- Storage path
- Checksum where useful
- Status
- Access ownership
- Creation time

Use short-lived authorised download access for remote storage.

Do not expose permanent unrestricted storage URLs for private Project files.

---

# 44. Search

Beta Project search should support available authorised data such as:

- Project name
- Reference
- Customer name
- Brand name
- Pack type
- File name where assets are included

Search must query the full authorised Project collection, not only the 24 Dashboard cards.

Important searchable values should not exist only inside JSON.

---

# 45. Soft Delete and Archive

Use archive before permanent deletion for engineering records.

Recommended behaviour:

- Projects use `archived_at`.
- Important revisions, validation and exports remain traceable.
- Assets may use `deleted_at` while retention rules decide physical deletion.
- Cutter elements may use controlled soft delete where history is needed.
- Permanent deletion requires a separate explicit policy.

Do not cascade-delete Project history casually.

---

# 46. Security and Data Isolation

A hosted database must support:

- User authentication
- Workspace or owner isolation
- Project access checks
- Row-level access controls where supported
- Protected service operations
- File-storage access controls
- Permission checks for exports and critical edits
- No cross-workspace retrieval
- Safe service-role usage
- Audit of permission changes

The frontend must not be trusted to enforce ownership.

FlowAI receives only authorised Project context.

---

# 47. Data Retention and Privacy

The product should define retention for:

- User account data
- Projects
- Archived Projects
- Uploaded files
- Generated exports
- FlowAI records
- Security logs
- Deleted assets

FlowAI persistence should avoid:

- Hidden reasoning
- Unnecessary raw provider payloads
- Unnecessary full Project copies
- Provider secrets
- Casual prompts that do not affect Project decisions

Retention requirements should be finalised before broad commercial release.

---

# 48. Local and Mock Persistence

Mock and local storage must use the same logical shapes.

Recommended repository interfaces:

- Project Repository
- Pack Repository
- Cutter Repository
- Validation Repository
- Export Repository
- FlowAI Record Repository
- Preference Repository

Local Project documents should include:

- Stable IDs
- Schema version
- Project revision
- ISO timestamps
- Pack and Cutter revisions
- Validation state
- Assumptions
- Export records or references where applicable

Do not build a mock-only field that cannot map to the target schema.

---

# 49. Local Project Document

A controlled local implementation may store a Project aggregate:

```ts
type LocalProjectDocument = {
  schemaVersion: string;
  project: ProjectRecord;
  productInformation?: ProductInformationRecord;
  packSpecifications: PackSpecificationRecord[];
  cutterSpecifications: CutterSpecificationRecord[];
  cutterLayers: CutterLayerRecord[];
  cutterElements: CutterElementRecord[];
  assumptions: EngineeringAssumptionRecord[];
  notes: ProjectNoteRecord[];
  validationRuns: ValidationRunRecord[];
  validationIssues: ValidationIssueRecord[];
  exportRecords: ExportRecordRecord[];
  activityEvents: ActivityEventRecord[];
};
```

This is a transport/persistence envelope.

Modules should still consume domain services rather than mutate the document independently.

---

# 50. Migration Strategy

## 50.1 Stage 1 — Current-State Inventory

Identify:

- Local storage keys
- Project JSON shape
- Current type versions
- Mock fixture shapes
- Existing duplicates
- Unsupported legacy fields

## 50.2 Stage 2 — Canonical Domain Types

Create shared types aligned with:

- Project
- Pack Specification
- Cutter Specification
- Validation
- Export
- Assumptions

## 50.3 Stage 3 — Runtime Validation

Add runtime schemas for:

- Local Project restoration
- Project import
- API response
- FlowAI response
- Geometry JSON

## 50.4 Stage 4 — Local Migration Functions

Create explicit migrations:

```text
v1 → v2
v2 → v2.1
```

Migrations should:

- Preserve original backup where practical
- Report failures
- Avoid dropping unknown engineering values silently
- Re-run validation where required

## 50.5 Stage 5 — Repository Adapters

Move persistence behind interfaces.

Use:

- Mock adapter
- Local adapter
- Hosted API adapter

## 50.6 Stage 6 — Hosted Core Tables

Recommended order:

1. Users/session integration
2. Projects
3. Product Information
4. Pack Specifications and features
5. Cutter Specifications, layers and elements
6. Assumptions and notes
7. Validation Runs and Issues
8. Project revisions and activity
9. Export Records and assets
10. Preferences
11. FlowAI records where required

## 50.7 Stage 7 — Post-Beta Expansion

Add:

- Workspaces
- Artwork
- Templates
- Engineering rules
- Knowledge
- Press/customer profiles
- Approvals
- Reporting
- Commercial records

---

# 51. Supabase/PostgreSQL Direction

A future Supabase/PostgreSQL implementation should consider:

- UUID primary keys
- `timestamptz`
- `jsonb`
- Foreign keys
- Transactions
- Row-level security
- Storage buckets
- Signed URLs
- Database migrations
- Server/edge functions for trusted operations

Do not couple the frontend directly to unrestricted tables.

Use services or controlled query modules.

Provider-specific implementation belongs in a focused migration plan and code task.

---

# 52. Backup and Recovery

Before external beta, define:

- Local Project export/backup if local persistence is used
- Hosted backup policy if a database is used
- Recovery from corrupt local data
- Recovery from failed migration
- Revision-conflict behaviour
- Export-file retention
- User-facing save status

A known data-loss defect blocks beta release.

---

# 53. Mock and Seed Data

Mock/seed data should include:

- Stable IDs
- Realistic timestamps
- Several Project statuses
- Supported beta pack types
- Pack Specifications
- Cutter layers and elements
- Assumptions
- Validation passes and failures
- Critical and Warning issues
- Export-ready and blocked Projects
- Revision conflicts
- Corrupt/old schema fixture
- FlowAI recommendation/approval example

Do not use fake success values that hide unimplemented behaviour.

---

# 54. Testing Requirements

Detailed QA belongs in `10_Testing_QA.md`.

Database/persistence testing should include:

## Schema and Runtime Validation

- Required fields
- Enum values
- Geometry schemas
- JSON shape versioning
- Positive dimension constraints
- Same-Project foreign-key consistency

## Persistence

- Create
- Save
- Update
- Reopen
- Archive
- Search
- Recent ordering
- Missing data
- Corrupt data

## Revisions

- Revision increment
- Conflict rejection
- Snapshot restoration
- Validation tied to revision
- Export tied to revision

## Migration

- Old Project migration
- Unknown field preservation
- Failed migration recovery
- Revalidation after migration

## Security

- User isolation
- Workspace isolation
- Unauthorised read/write rejection
- Signed file access
- FlowAI context access

## End to End

- Project → Pack → Cutter → Validation → Save → Reopen → Export

---

# 55. Current Data Priorities

Current priorities are:

1. Audit the real current Project and persistence code.
2. Identify the canonical Project source of truth.
3. Consolidate duplicate Project, Pack and Cutter types.
4. Add schema version and Project revision.
5. Define runtime validation for saved Projects.
6. Ensure Dashboard search/recent Projects use the same repository.
7. Ensure Prompt and Build Pack create compatible Pack Specifications.
8. Ensure Cutter Studio restores structured layers/elements.
9. Persist assumptions.
10. Persist deterministic validation consistently.
11. Link validation and export to exact Project revisions.
12. Separate appearance from engineering geometry.
13. Add migration fixtures.
14. Add repository adapters.
15. Choose the external beta persistence/authentication model.
16. Keep Artwork, Press and Administration tables post-beta.

---

# 56. Airtable Alignment

Existing database actions should be retained and reworded rather than duplicated.

Suggested mapping:

- `CNF-1601` — Finalise Klyro Database Schema v2.1
- `CNF-1602` — Define and implement canonical Project model
- `CNF-1603` — Define and implement Cutter persistence model
- `CNF-1604` — Define Pack Specification and pack-support model
- `CNF-1605` — Define deterministic Validation Run and Issue persistence
- `CNF-1606` — Define Export Record and asset persistence
- `CNF-1607` — Define structured Engineering Rule storage route
- `CNF-1608` — Define beta user ownership and future workspace model
- `CNF-1609` — Implement Project revision and migration strategy
- `CNF-1610` — Plan hosted PostgreSQL/Supabase migration

Planning completion of this document does not mean physical database tables are built.

Track separately:

- Documentation
- Implementation
- Migration
- QA
- Beta readiness

---

# 57. Codex Implementation Rules

Codex must:

- Read `01_Product_Architecture.md` before changing entity ownership.
- Read `05_API_Architecture.md` before changing service-facing contracts.
- Read `04_Engineering_Knowledge_Base.md` before changing engineering fields.
- Preserve Project as the parent object.
- Use stable IDs.
- Use UTC timestamps.
- Use millimetres for engineering values.
- Keep Pack and Cutter revisions traceable.
- Keep validation tied to exact Project state.
- Keep export tied to exact Project state.
- Keep FlowAI records subordinate to deterministic data.
- Separate geometry from appearance.
- Add runtime validation at untrusted boundaries.
- Add migrations for breaking saved-data changes.
- Preserve backups or recovery during migration.
- Keep mock/local/remote adapters compatible.
- Add tests for changed persistence.
- Report files changed, migration impact and limitations.

Codex must not:

- Create a second Project model for one module.
- Use array indexes as IDs.
- Store raw model output as Pack or Cutter truth.
- Change validation severity through stored AI explanation.
- Hide key searchable values only inside JSON.
- Store large binary files directly in ordinary database rows.
- Break existing saved Projects without migration.
- implement the entire post-beta schema during a focused beta task.
- Couple the domain directly to Airtable field names.
- Claim database implementation is complete because this document exists.

---

# 58. Database Completion Criteria

The beta persistence model is complete only when:

- One canonical Project model exists.
- Pack and Cutter state are structured.
- Save and reopen preserve required state.
- Schema versioning exists.
- Project revision/conflict behaviour exists.
- Runtime validation protects restored/imported data.
- Assumptions persist.
- Validation persists from one source.
- Export records identify Project revision.
- Search and recency use canonical Project data.
- Local/mock/hosted adapters use compatible contracts.
- Required ownership/security controls exist for the beta audience.
- Migration and recovery tests pass.
- No known data-loss defect remains.
- Documentation and Airtable are updated.

---

# 59. Source Ownership

This document controls:

- Persistent entities
- Table/entity relationships
- Ownership fields
- Revision and schema-version data
- Storage boundaries
- JSON versus relational guidance
- File metadata/storage references
- Migration direction
- Data-integrity requirements
- Persistence implementation guidance

Other sources control:

- `01_Product_Architecture.md` — product hierarchy and release scope
- `04_Engineering_Knowledge_Base.md` — engineering rules and defaults
- `05_API_Architecture.md` — endpoints and service contracts
- `07_UI_Design_System.md` — presentation and interaction
- `08_AI_Architecture.md` — FlowAI semantics and actions
- `09_Development_Roadmap.md` — delivery order
- `10_Testing_QA.md` — formal release tests

Where API and database names differ, a clear mapping must exist.

Where this schema conflicts with a validated engineering rule, the Engineering Knowledge Base controls engineering meaning.

---

# 60. Final Database Rule

The Klyro data model must preserve one connected engineering Project from first requirement to validated export.

It must remain:

- Project-centred
- Structured
- Traceable
- Revision-aware
- Pack-specific
- Validation-ready
- Export-ready
- FlowAI-compatible
- Secure
- Migration-safe
- Suitable for controlled beta
- Expandable after the core workflow is proven

The database should support the product.

The product should not be distorted merely to fit an early temporary persistence shortcut.

---

# Change Log

## Cross-Source Consistency Pass — 19 July 2026

- Defined the mapping between database `bigint` revisions and opaque API/FlowAI revision strings.
- Defined `ready_for_export` as a derived/service-controlled state.
- Added the shared Not Run, Running, Passed, Failed, Stale and Error Validation Summary lifecycle.
- Clarified that Warnings and Advisories may remain on a Passed current revision.
- Added current-versus-validated Project revision fields.
- Required validation and release records to identify the exact Project revision.

## Version 2.1 — 19 July 2026

- Reframed the schema from CutNFlow platform storage to Klyro App persistence with CnF Tech engineering data.
- Removed references to the nonexistent `00_Master_Context.md`.
- Aligned the schema with Product Architecture, API Architecture, Engineering Knowledge Base and FlowAI Architecture v2.1.
- Separated Beta Core, Beta Supporting and Post-Beta entities.
- Replaced the old full-platform-first table list with a beta-first Project model.
- Replaced company-first ownership with optional beta user ownership and future workspaces.
- Updated Project statuses and stages to the current beta workflow.
- Added schema version and Project revision as separate concepts.
- Added optimistic concurrency and revision-conflict requirements.
- Made Pack and Cutter Specifications versionable with one active revision.
- Added Pack Feature intent separate from generated Cutter Element geometry.
- Separated Cutter engineering parameters from visual appearance.
- Added current Engineering Assumption source and certainty models.
- Updated the seal assumption example from 10 mm to the current 15 mm generic fallback.
- Added Validation Run and Validation Issue models aligned with deterministic authority.
- Removed AI as a validation category/authority.
- Added Export Records tied to exact Project and Validation revisions.
- Consolidated file metadata into a general Assets boundary.
- Added Project revisions, activity events and FlowAI approval records.
- Added structured Engineering Rule storage as a later implementation route.
- Added JSON, indexing, transaction, storage, migration, security and recovery rules.
- Added a staged local-to-Supabase/PostgreSQL migration direction.
- Added current data priorities, Airtable mapping and completion criteria.
