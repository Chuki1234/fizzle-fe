# Images

Drop background art and static images here. Referenced from templates as
`/assets/images/<name>`.

Expected by the auth pages:

| File | Used by | Notes |
|---|---|---|
| `auth-bg.png` (or `.jpg` / `.webp`) | `auth-layout` | Full-bleed background behind the login/register card. Recommended ≥ 2560×1440, optimized. |

If `auth-bg.png` is absent the layout falls back to a token-based gradient, so
the pages render fine before you add the file.
