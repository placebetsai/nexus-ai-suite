# Joffe admin

A small, dependency-free Node server for editing the federation sites on this
machine. It edits the source that gets deployed; it does not use GitHub.

```bash
cd nexus-ai-suite/joffe-admin
node server.js                 # http://127.0.0.1:8788
node --test                    # 45 tests
```

The password lives in `../.secrets/joffe-admin.password`. The first run creates
it if it is missing. Do not put that file in git. `JOFFE_ADMIN_PASSWORD_FILE`
can point at a different file for a test instance.

## What it covers

Thirteen properties: `israeljoffe.com`, `israeljoffe.org`, `wuwonline.com`,
`religiousjews.com`, `fashionistas.ai`, `createstuff.ai`, `hiddencameras.tv`,
`spanishtvshows.com`, `scooter.exchange`, `diamonds.forsale`,
`ihatecollege.com`, `placebets.ai`, `marketpicks.ai`.

`ketiservice.com` and `ldm-realestate` are deliberately excluded.

The source paths are in `SITES` in `server.js`. `fashionistas.ai` previously
pointed at a stale copy in the home directory; it now points at the live
project source.

## Editing governance

Every content write goes through `lib/governance.js`:

- The file's **before** and **after** contents are stored as SHA-256-addressed
  blobs under `.state/blobs/`. Identical content is stored once.
- `.state/audit.jsonl` is an append-only record of page saves, menu/footer
  changes, sitemap changes, uploads, creates, deletes, restores and publishes.
- The **History** tab shows the last 100 changes for the selected site and can
  restore any page revision in one click. A restore is itself recorded.
- Saves are **optimistic**: the editor reads a revision hash with the page and
  sends it back. If the file changed on disk, the save is rejected with a 409
  instead of silently overwriting someone else's edit.
- History is local. It is not a replacement for git and it is not backed up to
  Cloudflare.

The History tab is the answer to "who changed this?" on a single-operator
machine. It does not implement multiple user accounts or roles.

## Publishing

The **Publish this site** button runs the same local deploy path the site
already uses. For `israeljoffe.com` and `createstuff.ai` it calls
`scripts/deploy-safe-static.sh`, which goes preview → smoke → production. The
other sites use their existing `./deploy.sh pages` path.

Publishing requires an explicit confirmation in the UI and the API requires
`{"confirm": true}` as well.

For the two static sites with a safe gate, status and the command are written
to history. A failed publish is recorded as a failure, not hidden.

## SEO and image health

**Site check** is read-only. It scans every HTML file in the site source and
reports:

- missing/duplicate/overlong titles and descriptions
- missing or mismatched canonicals, and `noindex` pages
- missing or multiple H1s
- missing/generic alt text and images without `width`/`height`
- missing social cards and `og:image:alt`
- indexable pages missing from the sitemap, and stale sitemap URLs
- pages with images missing from `sitemap-images.xml`
- broken internal links on static sites
- missing sitemap or a `robots.txt` that does not point to one

It groups duplicate titles into one finding instead of flooding the report.
Worker-rendered sites (`placebets.ai`, `marketpicks.ai`) skip link and
sitemap-local checks because not every route exists on disk.

Saving or creating a page updates the sitemap and, when the site has
`sitemap-images.xml`, adds missing image entries for that page. It only fills
gaps; hand-written captions are never deleted by a generic save.

## Images

- The photo library walks nested `img/` folders, so it sees the gallery images
  under `img/g/`, not just files at the top of `img/`.
- Uploads store real `width`/`height` on the inserted `<img>`, plus
  `loading="lazy"` and `decoding="async"`. That reserves layout space and
  prevents the gallery jump.
- Large JPEG/PNG uploads are resized to at most 1800 px and encoded as WebP in
  the browser before upload. The checkbox can be turned off. GIF and SVG are
  left alone.
- The server has no image dependency (no sharp, ImageMagick or cwebp). It reads
  PNG, JPEG, GIF, WebP and AVIF headers directly.
- The library shows dimensions and file size so oversized images are obvious.

## Security

The default bind is `127.0.0.1`, which is the right default for a file editor.

If you need remote access, **do not port-forward this server.** Run it on a
private network and put a named Cloudflare Tunnel with a Cloudflare Access
policy (or Tailscale) in front of it:

```bash
HOST=127.0.0.1 PORT=8788 node server.js
# after you have created a named tunnel + Access application:
cloudflared tunnel run <tunnel-name>
```

Do not use `cloudflared tunnel --url` for this: a quick tunnel is public and has
no Access policy.

The server sets a strict CSP, `X-Frame-Options: DENY`, `Referrer-Policy:
no-referrer`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy`. State
changes require a CSRF token in addition to the `HttpOnly`, `SameSite=Strict`
session cookie. Login is rate-limited to five failures per ten minutes per IP.
Cookies gain `Secure` when the request arrives over HTTPS (including through a
tunnel that sets `X-Forwarded-Proto`).

It is still a single-password, single-operator tool. Cloudflare Access should
be the thing that authenticates a remote user; the password is the second
lock.

## Limits worth knowing

- Build-output sites (`hiddencameras.tv`, `spanishtvshows.com`, etc.) are
  editing the generated files. The next framework build overwrites them.
  Edit source when the change is meant to last.
- `placebets.ai` and `marketpicks.ai` have Worker-rendered home pages, so the
  admin cannot edit the home page or the generated sitemap.
- `.state/` is intentionally gitignored. It is history for this machine.
