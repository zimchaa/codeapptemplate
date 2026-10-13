# Routing and deep links

## Why hash routing

A code app runs inside the Power Apps player's `<iframe>`. The iframe's own URL can't be bookmarked,
shared or reloaded at a sub-path. The workspace therefore uses a **hash router**
(`#/requests/123`):

- in-app navigation and the browser back/forward buttons work;
- refreshing keeps the page;
- external links come in through the **app URL's query string**, which Power Apps passes to the app.

## Incoming links

Power Apps passes the query string of the play URL to the code app as `getContext().app.queryParams`.
The workspace understands:

| Query | Opens |
|---|---|
| `?route=/requests/<id>` | any in-app path (preferred; works for every module) |
| `?page=requests&id=<id>` | module id or basePath + module-specific params (`deepLink()` in the manifest) |
| `?page=request&id=<id>` | singular aliases work too (`page` + `s`) |

Full URL:

```
https://apps.powerapps.com/play/e/<environmentId>/app/<appId>?route=/requests/<id>
```

Only in-app paths are accepted (`/…`; no `//` or `https:`), so a link can't send users to another
site. The link is applied once, on first load.

Offline (`pnpm dev`) the same parameters work on the local URL:
`http://localhost:5173/?route=/admin/users`.

## Outgoing links

- **`<ShareMenu path title>`:** copy link, email (`mailto:`) and **Share to Teams**. Used in the top
  bar (current page) and on detail pages.
- **`deepLink(path)`** from `useWorkspace()` builds the URL, choosing the first that applies:
  1. setting `app.playUrl`, if set (recommended once published);
  2. `environmentId` + `appId` from the host (not available in Local Play, where `appId` is `local`);
  3. the local page URL (offline development).
- **`teamsChatLink(upns, message)`** starts a Teams chat, e.g. "Chat in Teams" with a requester.
- **Admin → Deep links** builds links for any module, path or record.

## Links from flows, emails and Teams

Anything that can produce text can link into the app. For example, a Power Automate flow on
*"When a row is added"* to `spg_request` can post to a Teams channel:

```
New request: @{triggerOutputs()?['body/spg_name']}
<a href="https://apps.powerapps.com/play/e/<env>/app/<appId>?route=/requests/@{triggerOutputs()?['body/spg_requestid']}">Open</a>
```

Teams opens Power Apps links in the browser. Code apps in Teams use the same URL.

## Adding routes in a module

Routes are react-router route objects relative to the module's `basePath`. Use `lazy` so every page
is its own chunk:

```ts
routes: [
  { index: true, lazy: async () => ({ Component: (await import('./pages/List.tsx')).List }) },
  { path: ':id', lazy: async () => ({ Component: (await import('./pages/Detail.tsx')).Detail }) },
  { path: 'reports/:year', lazy: … },
]
```

List filters belong in the URL (`useSearchParams`) so filtered views are shareable too; see the
requests list (`#/requests?view=all&status=new`).
