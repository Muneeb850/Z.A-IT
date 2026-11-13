# AI Enterprises website

Multi-page, animated website for AI Enterprises (networking, ISP/OSP, CCTV, PA systems, power & security, general supplier).
Sage and off-white design, built with plain HTML/CSS/JS, GSAP, ScrollTrigger and Lenis (loaded from CDNs).

## Pages
`index.html` · `about.html` · `services.html` · `projects.html` · `team.html` · `contact.html`

## Run locally
Open `index.html` in a browser, or serve the folder:

```
python -m http.server 8765
```

then visit http://localhost:8765/index.html

## Structure
- `css/style.css` is the readable source; `css/style.min.css` is what the pages load.
- `js/main.js` is the readable source; `js/main.min.js` is what the pages load.
- `assets/img` holds images from the company profile PDF (WebP); `assets/photos` holds stock photos (Unsplash licence).

## Contact details used on the site
Taken from the company profile PDF.
