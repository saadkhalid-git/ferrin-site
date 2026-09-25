# Site images

Photos for the page design, not for products (product photos go in `public/photos/`).
The site works without them: until a file is added, the page shows the technical drawing
or an icon in its place.

| File | Where it appears |
|---|---|
| `hero.jpg` | Home page, large photo beside the heading (landscape, 2400 px wide or more is best) |
| `craft-1.jpg` … `craft-4.jpg` | Home page, "How Sialkot instruments are made": grinding, polishing, hand sharpening, testing |
| `nails.jpg`, `barber.jpg`, `grooming.jpg` | Home page category tiles: cuticle nippers, barber shears, pet grooming shears |
| `flatlay.jpg` | Home page, sample kit offer |
| `shears.jpg` | Home page, "Why Sialkot" (portrait works best) |

A photo named after a category id (for example `tweezers.jpg`) is used on that category's tile.

The build makes WebP and JPG copies 800 and 1600 px wide. Smaller photos are never enlarged.
After adding a hero photo, update `home.heroAlt` in the language files so it describes the picture.

## Photo credits

If a photo needs a credit, add `credits.json` here. The footer then shows a "Photo credits" line:

```json
[
  { "file": "hero.jpg", "photographer": "Name", "source": "Unsplash", "url": "https://unsplash.com/photos/...", "license": "Unsplash License" }
]
```

Only use photos you have the right to use. Don't use photos that could be mistaken for your own
workshop or staff unless they are.
