# Ferrin Instruments website

A static shop for salon, barber and grooming instruments. No build step and no server code: open it with any static web server.

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## What to edit

| What | Where |
|---|---|
| Brand name, order email, phone, address, shipping, volume discounts | `js/config.js` |
| Products, prices, categories, finishes | `js/data.js` |
| Page text (home, private label, about, FAQ) | `js/app.js` (one function per page) |
| Colours and fonts | top of `styles.css` |
| Product drawings | `js/drawings.js` |

## How ordering works

The cart is stored in the visitor's browser. "Send order request" opens the visitor's email app with the full order, addressed to `orderEmail` in `js/config.js`. The confirmation page also shows the order text with a copy button, in case no email app is set up.

To take real payments later, replace the checkout submit handler in `js/app.js` (`bindCart`) with a Stripe Checkout link, a Shopify Buy Button, or a form service such as Formspree.

## Before going live

- Replace `orders@example.com` and the phone number in `js/config.js`
- Replace the placeholder terms and privacy pages (`legal()` in `js/app.js`)
- Check prices, delivery times, and the sample and returns policy in the FAQ
- Add real product photos next to the drawings if you want
