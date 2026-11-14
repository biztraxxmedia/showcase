# Showcase

A small static site for streaming client commercials in the browser. Built for GitHub Pages at `/showcase/`.

## Local preview

    python3 -m http.server 8080

Then open http://127.0.0.1:8080/ and http://127.0.0.1:8080/dog-gone-classy/

## Adding a client

1. Create folders: `videos/<slug>/`, `posters/<slug>/`, and optionally `assets/<slug>/`.
2. Re-encode each video as H.264 (`yuv420p`, `-movflags +faststart`), keep each file well under 100 MB, and export a poster JPG.
3. Add a client object to `videos.json` (copy the existing one). Use `id` / `slug` in kebab-case.
4. Add `<slug>/index.html` by copying `dog-gone-classy/index.html`. Set `data-client` to the same `id`, point the logo and title at the new client, and add their fonts/colors in `styles.css` under a body class if you want a themed page.
5. The home page picks up new clients from `videos.json` automatically.

## Adding a video to an existing client

Add an entry under that client's `videos` array in `videos.json`:

    {
      "id": "short-kebab-id",
      "title": "Title",
      "description": "One line.",
      "duration": 25,
      "formats": {
        "widescreen": { "src": "videos/<slug>/name-16x9.mp4", "poster": "posters/<slug>/name-16x9.jpg" },
        "vertical":   { "src": "videos/<slug>/name-9x16.mp4", "poster": "posters/<slug>/name-9x16.jpg" }
      }
    }

Paths in `videos.json` are always relative to the site root (not the client folder).

## Encoding tip

    ffmpeg -i input.mp4 -an -c:v libx264 -preset medium -crf 21 \
      -profile:v high -level 4.1 -pix_fmt yuv420p -movflags +faststart out.mp4

    ffmpeg -ss 8 -i out.mp4 -frames:v 1 -vf scale=1280:-1 -q:v 3 poster.jpg
