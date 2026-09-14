# Manual test plan — Mutual NDA Creator

The automated suite (`npm test`) covers document-building logic, PDF block
routing, and component behavior. It cannot see whether the app actually
*looks* right, whether a downloaded PDF is legible, or how it behaves in a
real mobile browser. This checklist covers that gap. Run it before shipping
any change that touches layout, styling, or the PDF export.

Start the app with `npm run dev` and open `http://localhost:3000`.

## 1. Desktop layout (~1440px wide)

- [ ] Header shows the mark, "PreLegal" wordmark, and the "Mutual NDA" label
- [ ] Form (left) and preview (right) sit side by side, roughly 40/60 split
- [ ] Progress bar and "X of 16 fields" start at 2/16 (the two default term
      values) with no fields filled in
- [ ] Typing in any field updates the preview immediately, with no visible lag
- [ ] Scrolling the document preview scrolls *only* the paper panel — the
      form and the "Download PDF" button stay in place
- [ ] Tabbing through the form visits every field in a sane order and each
      focused control shows a visible focus ring

## 2. Mobile layout (~390px wide, e.g. an iPhone-sized viewport)

- [ ] Form and preview stack vertically (no side-by-side columns, no
      horizontal scrollbar on the page)
- [ ] Party A and Party B fields stack full-width, not squeezed into columns
- [ ] The document preview reads comfortably at this width — headings wrap
      without breaking words oddly, numbered clauses keep their hanging
      indent (the number doesn't overlap the clause text)
- [ ] The page scrolls as one normal page (no broken/invisible content from
      the desktop-only sticky and internal-scroll behavior)

**Last run:** 2026-09-14, via a same-origin iframe pinned to 390×844 (the
browser automation's own window-resize didn't take effect in this sandbox).
Confirmed: clean single-column stacking, no overflow, clause numbers hang
correctly. See conversation for screenshots.

## 3. PDF export

- [ ] Fill in every field with realistic data (both parties, all terms)
- [ ] Click "Download PDF" — button shows "Preparing PDF…" then returns to
      "Download PDF"
- [ ] Open the downloaded file and check:
  - [ ] Filename is `Mutual-NDA-<Party A>-<Party B>.pdf` with spaces turned
        into hyphens
  - [ ] Cover page shows both parties, all terms, and the signature block
  - [ ] Standard Terms are paginated with no cut-off lines or overlapping text
  - [ ] Fonts are consistent (Times, matching the on-screen serif preview)
  - [ ] Bold text and section numbers are legible and correctly bolded
- [ ] Click "Download PDF" again with **all fields blank** — confirm it still
      produces a valid PDF using `[Bracketed Placeholder]` text, filename
      falls back to `Mutual-NDA-Party-A-Party-B.pdf`

**Last run:** 2026-09-14, filled with a full realistic example (Acme
Robotics, Inc. / Nimbus Data Systems LLC). Produced a valid 3-page PDF;
content, fonts, and pagination all correct.

**Known issue (pre-existing, not introduced by the redesign):** the PDF
pagination fits whole blocks per page rather than balancing content, so the
cover page can end with a large blank gap before "Standard Terms" jumps to
page 2. Cosmetic only — no content is lost or cut off. Worth a follow-up if
PDF polish becomes a priority.

## 4. Cross-browser / theme spot check

- [ ] Loads correctly in at least one Chromium browser and one non-Chromium
      browser (Firefox or Safari) if available
- [ ] Switching the OS between light and dark mode does not change the
      document preview (it's intentionally always a light "paper" surface —
      see design notes) and doesn't break the form's contrast/legibility

## 5. Accessibility spot check

- [ ] Every input has a visible, associated label (not just placeholder text)
- [ ] Zooming the browser to 200% doesn't clip or overlap any content
- [ ] `prefers-reduced-motion` doesn't need special handling here — the only
      motion is the progress bar width transition and button hover, both
      minor and non-essential

## Regenerating this checklist's "Last run" notes

When you re-run this checklist, replace the "Last run" line under the
relevant section with the date and a one-line result summary, so the next
person can see how current the manual coverage is without re-running
everything themselves.
