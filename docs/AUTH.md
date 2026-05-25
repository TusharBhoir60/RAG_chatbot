# API authentication (JWT)

The FastAPI API only accepts **signed JWTs** in `Authorization: Bearer <token>`.  
Raw user ids (e.g. `Bearer user_test`) are **rejected**.

## Environment variables

Set the **same** values on the Next.js app and the FastAPI process:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_SECRET` | **Yes** | — | HS256 signing secret (min 16 characters). Same as Next.js `AUTH_SECRET`. |
| `AUTH_ISSUER` | No | `rag-app` | JWT `iss` claim; must match token minting. |
| `AUTH_AUDIENCE` | No | `rag-api` | JWT `aud` claim; must match token minting. |
| `AUTH_JWT_ALGORITHM` | No | `HS256` | Algorithm used by PyJWT verification. |

### Example `.env` (backend)

```bash
AUTH_SECRET=your-long-random-secret-min-16-chars
AUTH_ISSUER=rag-app
AUTH_AUDIENCE=rag-api
```

### Example `.env.local` (frontend)

```bash
AUTH_SECRET=your-long-random-secret-min-16-chars
AUTH_ISSUER=rag-app
AUTH_AUDIENCE=rag-api
```

## How it works

1. User signs in via NextAuth (credentials).
2. Browser calls `GET /api/auth/token` (Next.js route) which mints a short-lived API JWT (`sub` / `id` = user id).
3. Frontend sends `Authorization: Bearer <accessToken>` to `http://127.0.0.1:8000/api/v1/*`.
4. FastAPI verifies signature, `exp`, `iss`, and `aud`, then uses the claim for `user_id` (Qdrant + SQLite isolation).

## Manual tests (curl)

### 1) Mint a valid dev token (Python)

```bash
cd RAG_chatbot
export AUTH_SECRET=your-long-random-secret-min-16-chars
python scripts/mint_test_token.py --user-id user_test
```

Copy the printed token.

### 2) Valid token — conversations list

```bash
curl -s -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:8000/api/v1/conversations
```

Expect `200` and JSON `conversations`.

### 3) Invalid token

```bash
curl -s -H "Authorization: Bearer not.a.real.jwt" http://127.0.0.1:8000/api/v1/conversations
```

Expect `401` and `{"detail":"Invalid authentication credentials"}` (or similar).

### 4) Spoof attempt (raw user id, no signature)

```bash
curl -s -H "Authorization: Bearer user_alice" http://127.0.0.1:8000/api/v1/conversations
```

Expect `401` — must **not** return Alice's data.

### 5) Missing auth

```bash
curl -s http://127.0.0.1:8000/api/v1/conversations
```

Expect `401` with `Authentication required`.
