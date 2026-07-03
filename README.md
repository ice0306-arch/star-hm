# star-hm

Official roster site for THE HM, built with Next.js App Router, TypeScript, and Tailwind CSS.

## Local Development

```bash
pnpm install
pnpm dev
```

## Environment Flags

- `NEXT_PUBLIC_ENABLE_ENTRY_OVERLAY=false` disables the intro overlay.
- `NEXT_PUBLIC_FORCE_ENTRY_OVERLAY=true` always shows the intro overlay, even after localStorage has completed it.

Production defaults are overlay enabled and force disabled.
