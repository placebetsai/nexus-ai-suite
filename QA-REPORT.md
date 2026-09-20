# QA Test Report — All Deployed Apps

**Date:** Sat Sep 19 2026  
**Environment:** Production  
**Total Tests:** 25  
**Result:** 25 PASS / 0 FAIL

---

## API Endpoints

| # | Endpoint | Method | Status | Size | Result |
|---|----------|--------|--------|------|--------|
| 1 | `createstuff-api` /api/templates | GET | 200 | 1,452 B | PASS |
| 2 | `fashionistas-ai` /api/marketplaces | GET | 200 | 1,629 B | PASS |
| 3 | `placebets-api-worker` /api/odds/nfl | GET | 200 | 3,946 B | PASS |
| 4 | `marketpicks-api` /api/stocks/AAPL | GET | 200 | 976 B | PASS |

## API Auth — Signup

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 5 | `createstuff-api` /api/auth/signup | 201 | PASS |
| 6 | `fashionistas-ai` /api/auth/signup | 201 | PASS |
| 7 | `placebets-api-worker` /api/auth/signup | 200 | PASS |
| 8 | `marketpicks-api` /api/auth/signup | 200 | PASS |

## API Auth — Login

| # | Endpoint | Status | Result |
|---|----------|--------|--------|
| 9 | `createstuff-api` /api/auth/login | 200 | PASS |

## API Auth — Authenticated Endpoints

| # | Endpoint | Auth | Status | Size | Result |
|---|----------|------|--------|------|--------|
| 10 | `createstuff-api` /api/auth/me | Bearer | 200 | 142 B | PASS |
| 11 | `fashionistas-ai` /api/auth/me | Bearer | 200 | 72 B | PASS |
| 12 | `placebets-api-worker` /api/auth/me | Bearer | 200 | 62 B | PASS |
| 13 | `marketpicks-api` /api/auth/me | Bearer | 200 | 75 B | PASS |

## Security — Unauth Rejection

| # | Endpoint | Expected | Actual | Result |
|---|----------|----------|--------|--------|
| 14 | `createstuff-api` /api/auth/me (no token) | 401 | 401 Unauthorized | PASS |

## Frontend Pages

| # | URL | Status | Size | Result |
|---|-----|--------|------|--------|
| 15 | createstuff-ai.pages.dev | 200 | 863 B | PASS |
| 16 | fashionistas-ai.pages.dev | 200 | 615 B | PASS |
| 17 | placebets-api.pages.dev | 200 | 54,910 B | PASS |
| 18 | marketpicks-api.pages.dev | 200 | 52,160 B | PASS |
| 19 | ihatecollege-com.pages.dev | 200 | 8,455 B | PASS |
| 20 | israeljoffe.com | 200 | 16,411 B | PASS |

## Additional Endpoint Tests

| # | Endpoint | Status | Size | Result |
|---|----------|--------|------|--------|
| 21 | `fashionistas-ai` /api/marketplaces?category=clothing | 200 | 1,629 B | PASS |
| 22 | `placebets-api-worker` /api/odds/nba | 200 | 3,947 B | PASS |
| 23 | `placebets-api-worker` /api/odds/mlb | 200 | 3,918 B | PASS |
| 24 | `marketpicks-api` /api/stocks/TSLA | 200 | 981 B | PASS |
| 25 | `marketpicks-api` /api/stocks (all) | 200 | 1,663 B | PASS |

---

## Summary

| Category | Passed | Failed | Total |
|----------|--------|--------|-------|
| API GET Endpoints | 4 | 0 | 4 |
| Auth Signup | 4 | 0 | 4 |
| Auth Login | 1 | 0 | 1 |
| Authenticated Endpoints | 4 | 0 | 4 |
| Security (Unauth Rejection) | 1 | 0 | 1 |
| Frontend Pages | 6 | 0 | 6 |
| Additional Endpoints | 5 | 0 | 5 |
| **TOTAL** | **25** | **0** | **25** |

All deployed apps are healthy and fully operational.
