#!/usr/bin/env python3
"""Mint a dev API JWT for curl tests (same format as Next.js /api/auth/token)."""

from __future__ import annotations

import argparse
import os
import sys
import time

import jwt


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", default="user_test")
    parser.add_argument("--expires-in", type=int, default=3600, help="seconds")
    args = parser.parse_args()

    secret = os.environ.get("AUTH_SECRET", "").strip()
    if not secret:
        print("Set AUTH_SECRET in the environment.", file=sys.stderr)
        sys.exit(1)

    issuer = os.environ.get("AUTH_ISSUER", "rag-app")
    audience = os.environ.get("AUTH_AUDIENCE", "rag-api")
    now = int(time.time())

    payload = {
        "sub": args.user_id,
        "id": args.user_id,
        "iss": issuer,
        "aud": audience,
        "iat": now,
        "exp": now + args.expires_in,
    }
    token = jwt.encode(
        payload,
        secret,
        algorithm=os.environ.get("AUTH_JWT_ALGORITHM", "HS256"),
    )
    print(token)


if __name__ == "__main__":
    main()
