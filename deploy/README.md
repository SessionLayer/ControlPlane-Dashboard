# Deploying the Control Plane Dashboard

The dashboard is a **static bundle** (`npm run build` → `dist/`). It talks only to
the Control Plane REST API, an OIDC IdP, and an object store; it holds no secrets.
Two things are the deployment's responsibility, because a client-only bundle
cannot do them itself:

1. **Security response headers** — served by whatever fronts the static files.
   Pick one reference:
   - **`nginx.conf` + `security-headers.conf`** — reverse proxy (TLS-terminating).
   - **`Dockerfile`** — build `dist/` and serve it behind nginx; fills the
     `connect-src` allow-list from `SL_CSP_CONNECT_SRC` at container start.
   - **`_headers`** — the same header set for a static host (Netlify / Cloudflare
     Pages); the deploy pipeline substitutes the `REPLACE-*` origins.

   The header _set_ is the contract; any server that emits it is fine.

2. **A production build that points at `https://` endpoints** — enforced at build
   time (see below), not just at runtime.

## 1. Security headers

The header set: a strict CSP plus HSTS (2yr + preload), `X-Content-Type-Options:
nosniff`, `frame-ancestors 'none'` (+ legacy `X-Frame-Options: DENY`),
`Referrer-Policy: no-referrer`, a locked-down `Permissions-Policy`, and
`Cross-Origin-Opener-Policy: same-origin`. `deploy/headers.test.ts` asserts the
strict directives are present and well-formed in every reference file.

### connect-src: fill in three origins

The SPA fetches from three origins besides itself. `connect-src` must list every
one, or the corresponding flow breaks:

| Placeholder               | What                                             | Breaks if omitted                       |
| ------------------------- | ------------------------------------------------ | --------------------------------------- |
| `__CP_ORIGIN__`           | Control Plane REST API (`VITE_CP_BASE_URL`)      | all data loads                          |
| `__OIDC_ORIGIN__`         | OIDC IdP token endpoint                          | login (auth-code + PKCE token exchange) |
| `__OBJECT_STORE_ORIGIN__` | object store / CDN serving signed recording URLs | recording replay + export               |

Recording replay/export downloads the still-encrypted object **directly** from the
signed URL (never through the API client, so no bearer leaks to the object store);
that cross-origin `fetch` is why the object-store origin must be allowed. If you
front the UI, the CP, and the object store on a **single origin** through this
proxy, you can collapse `connect-src` to just `'self'`. (`_headers` uses
`REPLACE-*` tokens for the same three origins; the Dockerfile fills them from
`SL_CSP_CONNECT_SRC` — an unset value fail-closes to `'self'` only.)

### Deliberate choices

- **`script-src 'self'`** (strict): the built `index.html` contains only external,
  fingerprinted `<script>`/`<link>` — no inline JS.
- **`style-src 'self'` — NO `'unsafe-inline'`**: the app's only inline styles are
  React `style={{}}` props, which are **CSSOM property writes** (`node.style.x =
v`). CSP `style-src`/`style-src-attr` governs `<style>` blocks and `style="…"`
  _attributes_ / `setAttribute('style', …)`, **not** CSSOM writes — so the strict
  policy holds with zero violations. The app has no inline `<style>`, no `style=`
  in markup, and no CSS-in-JS. Proven, not assumed: `e2e/csp.spec.ts` loads the
  authenticated app (rendering those inline styles) under this exact CSP and
  asserts zero `securitypolicyviolation` events.
- **No `Cross-Origin-Embedder-Policy`**: `require-corp` would block the
  cross-origin fetch of signed recording objects. COOP is still set.

## 2. https-in-production (build-time assertion)

`vite.config.ts` registers `deploy/httpsGuard.ts`, which **fails `vite build`**
when any credential-bearing endpoint — `VITE_CP_BASE_URL` (carries the OIDC
bearer) or the `VITE_OIDC_*` endpoints (carry the PKCE code exchange) — is a
non-localhost value that is not `https://`:

```bash
# fails the build:
VITE_CP_BASE_URL=http://cp.example npm run build
VITE_OIDC_ISSUER=http://idp.example npm run build
# ok:
VITE_CP_BASE_URL=https://cp.example npm run build
```

`localhost` / `127.0.0.1` / `[::1]` are exempt (single-instance local dev), and an
unset value falls back to that default. `src/api/prodBaseUrl.ts` holds the matching
runtime backstop in `src/api/client.ts` for a bundle handed a bad base at serve
time.

## Run the reference image

```bash
docker build -f deploy/Dockerfile \
  --build-arg VITE_CP_BASE_URL=https://cp.example.com \
  --build-arg VITE_OIDC_ISSUER=https://idp.example.com \
  -t sessionlayer-dashboard .

docker run --rm -p 8080:8080 \
  -e SL_CSP_CONNECT_SRC="https://cp.example.com https://idp.example.com https://objects.example.com" \
  sessionlayer-dashboard
```
