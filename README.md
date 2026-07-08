# SoleTrade Welding — Website

A responsive, bilingual (EN/ES) one-page website for a welding & fabrication
company, built with plain HTML, CSS and JavaScript (no build step, no
frameworks).

## How to use it

Unzip everything and open `index.html` in a browser, or upload the whole
folder to any static host (Netlify, Vercel, GitHub Pages, cPanel, etc.).
Nothing needs to be compiled.

```
soletrade/
├── index.html
├── css/style.css
├── js/
│   ├── translations.js     ← all EN/ES text lives here
│   ├── projects-data.js    ← the 6 portfolio projects + WhatsApp number
│   └── main.js             ← language switch, lightbox, form, carousel...
├── images/
│   ├── logo.svg             ← SoleTrade Welding logo (editable SVG)
│   ├── hero-bg.svg           ← home page background illustration
│   ├── about-welding.svg     ← "About us" illustration
│   └── projects/              ← 6 covers + 5 gallery photos each (30 total)
└── README.md
```

## Replacing the placeholder artwork with real photos

Every image in `images/` is an original illustration created for this
build (not stock photography), so there is zero risk of broken links or
copyright issues out of the box. When you have real jobsite photos, just
replace the files **keeping the same filenames**, e.g.:

- `images/hero-bg.jpg` → update the reference in `css/style.css` (`.hero`)
- `images/about-welding.jpg` → update the `src` in `index.html`
- `images/projects/project-1-cover.jpg`, `project-1-photo-1.jpg` … `-5.jpg`,
  and so on for projects 2–6 → update the paths in `js/projects-data.js`

The 5 gallery photos per project are captioned automatically as **Site
Survey → Frame & Fit-Up → Welding in Progress → Finishing & Grinding →
Completed Project**, so shoot (or pick) five images per job that follow
that before/after progression.

## Editing text (English / Spanish)

All copy lives in `js/translations.js` as a simple `{ "key": "text" }`
dictionary for `en` and `es`. Edit the text there — you do not need to
touch `index.html` for wording changes. The site loads in **English by
default**; visitors can switch with the EN/ES pill in the header, and
their choice is remembered on their device.

## Contact form and email sending

Because this is a static site with no server, real email delivery needs a
small (free) third-party service called **EmailJS**:

1. Create a free account at https://www.emailjs.com
2. Add an Email Service (e.g. your Gmail) and an Email Template with the
   variables `name`, `email`, `phone`, `request_type`, `message`.
3. Open `js/main.js` and fill in the three placeholders near the top:

   ```js
   var EMAILJS_CONFIG = {
     serviceId: "YOUR_EMAILJS_SERVICE_ID",
     templateId: "YOUR_EMAILJS_TEMPLATE_ID",
     publicKey: "YOUR_EMAILJS_PUBLIC_KEY"
   };
   ```

Until you do that, the form still works: it validates every field, then
opens the visitor's own email app with a message pre-filled and addressed
to `gdiazverdi@gmail.com`, so no enquiry is ever lost — it's just one
extra click for the visitor to hit "send" in their own mail client.

## WhatsApp links

The number used everywhere (`js/projects-data.js` → `whatsappNumber`) is
`61435496047` (Australian format, no spaces or `+`, as required by
`wa.me` links). If the number changes, update it in that one place only.

## Notes on standards followed

- Semantic HTML5 landmarks (`header`, `nav`, `main`, `section`, `footer`)
- Mobile-first responsive layout with CSS Grid/Flexbox and `clamp()` type
- Visible keyboard focus states and `prefers-reduced-motion` support
- ARIA labelling on icon-only buttons, the lightbox dialog and form errors
- Client-side form validation with per-field, bilingual error messages
- Defensive `<img>` error handling so a missing photo never shows a
  broken-image icon silently
