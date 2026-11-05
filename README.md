This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Pixel generator

Open `/create-pixel` or choose **Create pixel** in the header. Enter a recipient,
subject, and message, optionally using one of the imported Alex or Daniel templates.
Generate and copy the script, open a single Gmail compose window, and run the script
in the browser console. It appends the message and a unique tracking image; review
the recipient and subject and send the draft yourself.

Generation saves a **draft** record in the metadata database using
`MONGODB_META_URI`. It stores `created_at`; `sent_at` stays empty. Drafts appear in
Overview but are excluded from sent totals, subject performance, and all open counts.

After Gmail confirms the message was sent, return to the generator or Overview and
choose **Mark as sent**. Confirm the current time or enter the actual send time.
Overview also offers **Edit send time** for older records, including an option to
restore a record to draft. Older records retain their original send-time assumption
until you correct them; creation-time timestamps cannot prove delivery.

The dashboard excludes image requests at or before the confirmed send time, invalid
timestamps, and future timestamps. Raw tracker history is preserved. Tracker
ISO timestamps without an offset are interpreted as UTC; explicit offsets are
preserved, and displayed times use America/Indiana/Indianapolis.

This is a manual send confirmation, not a Gmail delivery integration. The hosted
tracker still receives compose-time image requests; this app excludes them from
reported opens. Image caching, privacy features, and opening your own sent message
can still affect measurements. Browser fingerprints cannot reliably identify a
recipient behind Gmail's image proxy.

`PIXEL_TRACKER_ORIGIN` optionally sets the HTTPS tracking-service origin. It defaults
to the original project's hosted service:
`https://emailpixel-265072791364.us-central1.run.app`. Generated images use its
`/pixel/<id>` endpoint. That service must remain available and write compatible events
to the tracker database configured by `MONGODB_TRACKER_URI`. The unused local
`/api/track` route from the source project is not used by generated scripts.

Run the generator and merge regression checks with:

```bash
node --test tests/pixel.test.mjs
```

These tests stub database writes and do not send email or load tracking images.
