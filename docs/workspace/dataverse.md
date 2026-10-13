# Dataverse

## Schema as code

Every table is a `defineTable()` definition: `packages/platform/src/schema/platform-tables.ts` and
each module's `src/schema.ts`. A definition has:

- **names without prefix** (`request`, `status`);
- **a field map:** app field name → column definition (type, label, length, required, choices,
  lookup target);
- **`seed` rows**, which every environment needs (roles, settings), and **`samples`**, which are demo
  data. Both use fixed GUIDs.

From that one definition:

| Consumer | Uses it for |
|---|---|
| TypeScript | Record types (`RequestRecord`) |
| Mock provider | In-browser tables seeded with `seed` + `samples` |
| Dataverse provider | Field ↔ column mapping, choice values, lookup `@odata.bind`, OData `$select/$filter/$orderby` |
| `pnpm dataverse:provision` | Tables, columns, choices, lookups, seed rows |
| Admin → Data & setup | Status and the `pa app add data-source` commands |

### Naming

With prefix `spg` (setting: `--prefix` / `VITE_DATAVERSE_PREFIX`):

| Thing | Example |
|---|---|
| Table (logical = schema name, lower case) | `spg_request` |
| Entity set | `spg_requests` |
| Primary key | `spg_requestid` |
| Column | `spg_status` |
| Lookup (read) / (write) | `_spg_request_value` / `spg_request@odata.bind: /spg_requests(<id>)` |
| Choice value | `<publisher option prefix> × 10000 + index` |

The app works out choice values for any publisher. It reads the option prefix from setting
`dataverse.optionValuePrefix`, which the provisioning script writes. When reading, it uses
`value % 10000`. **Only ever append choice options**: reordering them changes stored meanings.

### Column types

`text`, `email`, `url` (string), `multiline` (memo), `boolean`, `integer`, `dateonly`, `datetime`,
`choice`, `lookup` (to another table in the schema). Ownership is `user` (owner, row-level security)
or `organization`.

## Provisioning

`pnpm dataverse:provision` (see the [app README](../../apps/workspace/README.md#step-1-create-the-tables-and-seed-data))
works in this order:

1. **Validate** the schema (also `pnpm dataverse:plan`, which runs in CI): names, primary fields,
   lookup targets, seed rows.
2. **Sign in** (token, service principal, or device code). Plain `fetch`, no native modules.
3. **Publisher and solution:** reuse or create them, and check the prefix matches.
4. **Create what's missing:** tables (with their primary name column), then columns, then lookups
   (one-to-many relationships). Delete cascades for required lookups; other lookups remove the link.
5. **Publish** the changed tables.
6. **Verify** that entity-set names and lookup navigation properties match what the app expects.
7. **Seed** with `PATCH <set>(<id>)` + `If-None-Match: *`, which is create-only. The only value
   always corrected is `dataverse.optionValuePrefix`.
8. **Add the admin:** an Administrator assignment for `--admin`.

It never deletes or alters existing columns. To change a column type or length, do it in the maker
portal (or delete and re-provision in a dev environment), then update the definition.

**Moving to test/prod:** export the `WorkspaceApp` solution (managed) and import it, or run the
provisioning script against each environment, then run it with `--admin` to seed. Code apps also
support Power Platform pipelines; see the
[ALM docs](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/how-to/alm).

## Data layer

```ts
const requests = useTable(requestTable)
const open = await requests.list({ where: { status: 'new', assigneeUpn: user.upn }, orderBy: { field: 'modifiedOn', direction: 'desc' }, top: 50 })
const created = await requests.create({ title, status: 'new', priority: 'normal', requesterUpn: user.upn })
await requests.update(created.id, { status: 'in_progress' })
```

- **Mock mode:** data lives in `localStorage` (`ws-mock-data:workspace`), with simulated latency.
- **Power Apps mode:** calls go through `getClient(dataSourcesInfo)` from `@microsoft/power-apps/data`.
  - Data-source names come from `power.config.json`, written by `pa app add data-source`.
  - IDs for new rows are generated client-side, so the row can be read back.
  - A table that isn't connected yet raises `TableNotConnectedError`, which `<DataError>` shows with
    the exact command.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Workspace setup required" page | Platform tables not connected: run the listed `pa app add data-source` commands in `apps/workspace`, restart `dev:powerapps`. |
| "<Table> isn't connected yet" in a module | Same, for that module's table. |
| Provisioning: `prefix … not "spg"` | The solution belongs to another publisher. Use `--prefix <theirs>` (and `VITE_DATAVERSE_PREFIX`), or another `--solution`. |
| Provisioning: entity set / navigation property mismatch warning | Dataverse named something differently from the app's convention, e.g. a table created by hand. Recreate it with the script in a dev environment, or adjust `createNaming` in `packages/platform/src/schema/naming.ts`. |
| Device code sign-in blocked (`AADSTS50199`, `AADSTS53003`, …) | Use the **Provision Dataverse** GitHub workflow or `DATAVERSE_CLIENT_ID/SECRET/TENANT_ID`. |
| 403 / privilege errors at runtime | The user lacks a Dataverse security role for the `spg_*` tables. See [access control](access-control.md#dataverse-security-roles). |
| Choices show the wrong label | Options were reordered. Restore the order and append new ones at the end. |
