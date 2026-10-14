#!/usr/bin/env python3
"""Cloudflare Pages uploader that mirrors wrangler's exact API contract.

Recovered from wrangler-dist/cli.js (v3.114.17), because the older direct-upload
API this replaced is gone: POST /pages/projects/{p}/uploads returns
405 method_not_allowed, and GET on that path returns the *project* object --
which is how a naive urllib call (data=None sends GET) silently "succeeds"
without ever uploading a file.

Flow:
  1. GET  /pages/projects/{p}/upload-token          -> jwt
  2. POST /pages/assets/check-missing {hashes}      -> hashes CF does not have
  3. POST /pages/assets/upload    [{key,value,metadata,base64:true}]
  4. POST /pages/assets/upsert-hashes {hashes}
  5. POST /pages/projects/{p}/deployments           multipart, manifest={path: md5}

Files are addressed by MD5 and manifest keys carry a leading slash, matching
what a healthy deployment's `files` field actually looks like.
"""
import base64
import hashlib
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://api.cloudflare.com/client/v4"
BUCKET_BYTES = 8 * 1024 * 1024   # base64 payload cap per POST
MAX_ATTEMPTS = 4


def md5_bytes(b):
    return hashlib.md5(b).hexdigest()


def walk(source_dir):
    """-> (manifest {"/rel/path": md5}, files [(rel, md5, data, ctype)])"""
    manifest, files = {}, []
    for root, _dirs, names in os.walk(source_dir):
        for name in names:
            full = os.path.join(root, name)
            rel = os.path.relpath(full, source_dir).replace(os.sep, "/")
            with open(full, "rb") as fh:
                data = fh.read()
            h = md5_bytes(data)
            manifest["/" + rel] = h
            ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
            files.append((rel, h, data, ctype))
    files.sort(key=lambda f: f[0])
    return manifest, files


def call(method, path, token, body=None, jwt=None, timeout=90, multipart=False):
    """Resolve the URL the way wrangler's fetchResult does.

    /pages/projects/* is account-scoped and MUST carry the account prefix.
    /pages/assets/* is NOT -- prefixing it yields 400 code 9106
    "Authentication failed (status: 400)" even with a valid JWT, and 404 with
    the API token. Verified by probing all three combinations.
    """
    if path.startswith("/pages/projects"):
        url = f"{API}/accounts/{os.environ['CLOUDFLARE_ACCOUNT_ID']}{path}"
    else:
        url = f"{API}{path}"
    headers = {"Authorization": f"Bearer {jwt or token}"}
    data = None
    if body is not None:
        if multipart:
            data = body
        else:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace") if e.fp else ""
            # 8000013 UNAUTHORIZED / expired jwt -> refresh once
            if e.code in (401, 403) and jwt is None:
                raise
            if attempt == MAX_ATTEMPTS:
                raise RuntimeError(f"{method} {path} -> {e.code} {detail[:400]}")
            time.sleep(2 ** (attempt - 1))
        except urllib.error.URLError as e:
            if attempt == MAX_ATTEMPTS:
                raise RuntimeError(f"{method} {path} network: {e}")
            time.sleep(2 ** (attempt - 1))
    raise RuntimeError(f"{method} {path} exhausted")


def multipart_body(fields):
    """Inline fields only: a part with filename= is read as a file, not a field
    (that mistake makes the API reply 'a manifest field was expected')."""
    boundary = "----CFPagesBoundary9f3c2b71"
    chunks = []
    for key, value in fields.items():
        chunks.append(
            (f"--{boundary}\r\n"
             f'Content-Disposition: form-data; name="{key}"\r\n\r\n'
             f"{value}\r\n").encode("utf-8")
        )
    chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def get_jwt(token):
    res = call("GET", "/pages/projects/%s/upload-token" % os.environ["CF_PROJECT"], token)
    jwt = (res.get("result") or {}).get("jwt")
    if not jwt:
        raise RuntimeError(f"no jwt in upload-token response: {str(res)[:300]}")
    return jwt


def upload_missing(token, jwt, files):
    hashes = [f[1] for f in files]
    res = call("POST", "/pages/assets/check-missing", token,
               {"hashes": hashes}, jwt=jwt)
    # response shape is {"success": true, "result": ["<md5>", ...]}
    result = res.get("result")
    if isinstance(result, dict):
        result = result.get("hashes") or []
    if not isinstance(result, list):
        raise RuntimeError(f"unexpected check-missing response: {str(res)[:300]}")
    missing = set(result)
    todo = [f for f in files if f[1] in missing]
    print(f"  {len(files)} files total, {len(todo)} missing from CF, "
          f"{len(files) - len(todo)} already stored", flush=True)
    if not todo:
        return 0

    buckets, cur, size = [], [], 0
    for f in todo:
        est = len(base64.b64encode(f[2]))
        if cur and size + est > BUCKET_BYTES:
            buckets.append(cur)
            cur, size = [], 0
        cur.append(f)
        size += est
    if cur:
        buckets.append(cur)
    print(f"  uploading in {len(buckets)} batch(es)", flush=True)

    done = 0
    for idx, bucket in enumerate(buckets, 1):
        payload = [
            {"key": h,
             "value": base64.b64encode(data).decode("ascii"),
             "metadata": {"contentType": ctype},
             "base64": True}
            for _rel, h, data, ctype in bucket
        ]
        call("POST", "/pages/assets/upload", token, payload, jwt=jwt, timeout=180)
        done += len(bucket)
        print(f"  batch {idx}/{len(buckets)}  ({done}/{len(todo)} files)", flush=True)

    call("POST", "/pages/assets/upsert-hashes", token, {"hashes": hashes}, jwt=jwt)
    print("  upsert-hashes ok", flush=True)
    return len(todo)


def deploy(token, manifest, branch="main", name=None):
    body, ctype = multipart_body({
        "manifest": json.dumps(manifest),
        "env": "production",
        "branch": branch,
        "name": name or os.environ["CF_PROJECT"],
    })
    req = urllib.request.Request(
        f"{API}/accounts/{os.environ['CLOUDFLARE_ACCOUNT_ID']}"
        f"/pages/projects/{os.environ['CF_PROJECT']}/deployments",
        data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": ctype},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        res = json.loads(resp.read().decode("utf-8"))
    if res.get("errors"):
        raise RuntimeError(f"deploy failed: {json.dumps(res['errors'])[:400]}")
    return res.get("result") or {}


def main():
    if len(sys.argv) < 3:
        print("usage: cfpages.py <project> <source_dir> [--dry-run] [--branch B]",
              file=sys.stderr)
        sys.exit(2)
    project, source_dir = sys.argv[1], sys.argv[2]
    dry = "--dry-run" in sys.argv
    branch = "main"
    if "--branch" in sys.argv:
        branch = sys.argv[sys.argv.index("--branch") + 1]

    os.environ["CF_PROJECT"] = project
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not token or not os.environ.get("CLOUDFLARE_ACCOUNT_ID"):
        print("ERROR: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID required",
              file=sys.stderr)
        sys.exit(1)

    manifest, files = walk(source_dir)
    total = sum(len(f[2]) for f in files)
    print(f"manifest: {len(files)} files, {total/1024/1024:.2f} MB  "
          f"(md5, path-keyed, leading slash)", flush=True)
    sample = list(manifest.items())[0]
    print(f"  e.g. {sample[0]} -> {sample[1]}", flush=True)

    if dry:
        print("--dry-run: no network calls made")
        return

    jwt = get_jwt(token)
    print("  upload-token -> jwt ok", flush=True)
    upload_missing(token, jwt, files)

    print("creating deployment...", flush=True)
    res = deploy(token, manifest, branch=branch)
    print(f"DEPLOYED {res.get('id')}  stage="
          f"{((res.get('latest_stage') or {}).get('name'))}:"
          f"{((res.get('latest_stage') or {}).get('status'))}", flush=True)
    print(f"  files registered: {len(res.get('files') or {})}", flush=True)


if __name__ == "__main__":
    main()
