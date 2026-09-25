# Ferrin Instruments website

A static B2B shop for salon, barber and grooming instruments, in English, German, French, Polish and Italian.

A small Node script (`build.mjs`) turns the product data, translations and page templates into plain HTML files, one per page and language. Every push to `main` builds the site and publishes it to GitHub Pages automatically (see `.github/workflows/deploy.yml`).

Live site: https://saadkhalid-git.github.io/ferrin-site/

## Build and preview locally

```bash
npm install
npm run build
```

The site is written to `dist/`. To preview it at the same path as GitHub Pages:

```bash
mkdir -p .serve && ln -sfn ../dist .serve/ferrin-site && python3 -m http.server 8766 --directory .serve
```

Then open http://localhost:8766/ferrin-site/.

Useful options:

- `LANGS=en npm run build` builds only English, which is faster while editing.
- `BASE_PATH="" npm run build` builds for a custom domain (site at `/`).
- `npm run check` checks translations, links, images, page titles and structured data.

## What to edit

| What | Where |
|---|---|
| Brand, order email, phone, WhatsApp, address | `src/data/config.json` |
| Web3Forms key (so orders reach your inbox) | `web3formsKey` in `src/data/config.json` |
| Volume discounts, finish surcharges, shipping zones | `src/data/config.json` |
| Products: part number, price, length, steel, finishes | `src/data/products.json` |
| Product names, descriptions, all page text | `src/i18n/en.json`, `de.json`, `fr.json`, `pl.json`, `it.json` |
| Product photos | `public/photos/` (see the README there) |
| Hero, craft and category photos, photo credits | `public/images/` (see the README there) |
| Terms, privacy policy, legal notice | `src/templates/legal.js` |
| Colours and fonts | `src/styles.css` (tokens at the top) |
| Icons | `src/templates/icons.js` |

When you add a product, add it to `products.json` and add its text to **every** language file. `npm run check` lists anything missing.

## Which language a visitor sees

The start page (`/`) sends each visitor to a language:

1. If the browser has a saved choice (`ferrin-lang` in local storage), that language is used.
2. Otherwise the country is taken from the device's time zone (for example `Europe/Rome` is Italy) and the language is saved for next time: Italy → Italian, France → French, Germany and Austria → German, Poland → Polish. In Switzerland, Belgium and Luxembourg the browser's own language decides. Everyone else gets English.
3. Choosing a language in the menu saves it, so the next visit to the start page opens in that language.

No location permission is asked and nothing is sent to a third party. Links to a specific page (for example `/de/product/...`) always open in the language of that link. The rules are in `src/shared/language.js`; `npm run check` tests them.

## How ordering works

Only businesses can order. The checkout asks for company, address and VAT number (required and format-checked for EU countries).

When a customer sends an order, quote request or message:

1. If `web3formsKey` is set, the form is sent to [Web3Forms](https://web3forms.com), which emails it to you. The customer sees a confirmation page.
2. If the key is empty or Web3Forms can't be reached, the customer's email app opens with the order filled in, addressed to `orderEmail`. The confirmation page shows the order text with a copy button.

No payment is taken on the site. You reply with an invoice.

## Before relying on the site

- Create a free Web3Forms account with your business email, and paste the access key into `web3formsKey`.
- Check the email address and address in `config.json`, and replace the phone and WhatsApp number: `+44 20 7946 0321` is a fictional number that can't be reached.
- Fill in every `[bracketed]` part of the legal pages in `src/templates/legal.js`, and have them checked.
- Have a native speaker review the German, French, Polish and Italian text.
- Check prices, delivery times, and the sample, returns and payment policies in the FAQ.

## Custom domain

1. Buy the domain and point it at GitHub Pages (Settings → Pages → Custom domain).
2. Set `"basePath": ""` and `"siteOrigin": "https://your-domain.com"` in `config.json`.
3. Push. Then add the site to Google Search Console and submit `https://your-domain.com/sitemap.xml`.
