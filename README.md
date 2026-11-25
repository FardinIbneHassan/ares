# ARES website · Team Solaris Tech

The website for **ARES (Autonomous Rover Energy System)**. It is plain HTML, CSS and JavaScript, so there is no build step and nothing to install. GitHub Pages serves the files exactly as they are.

## Files

| Path | What it is |
|---|---|
| `index.html` | Home: animated hero, Mars facts, problem, features, story |
| `project.html` | About, real-mission problems, solution, power-flow diagram |
| `features.html` | The 6 subsystems, each with a live animation |
| `roadmap.html` | Project timeline |
| `gallery.html` | Photo grid with filters and a lightbox |
| `team.html` | Team members and sponsors |
| `resources.html` | Demo, results, downloads, FAQ |
| `contact.html` | Contact channels |
| `404.html` | "Page not found" page (self-contained, see below) |
| `css/style.css` | All styling. Colors and fonts are at the top under "Design tokens" |
| `js/main.js` | Menu, scroll animations, counters, gallery, lightbox |
| `js/hero-canvas.js` | The Mars/starfield animation on the home page |
| `js/feature-anims.js` | The six animations on the features page |
| `assets/img/` | Images (`team/` holds member photos) |
| `assets/docs/` | PDFs to download (report, poster, slides) |

## Editing text

Open any `.html` file and change the text between the tags. You can do this right on GitHub: open the file, click the pencil icon, then **Commit changes**. The live site updates about a minute later.

Search the files for `TODO` to find everything that is still a placeholder:

- **Team:** names, roles, bios and photos (`team.html`)
- **Contact:** email, GitHub and social links (`contact.html` and the footer of **every** page)
- **Gallery:** real photos (`gallery.html` explains how inside a comment)
- **Downloads:** PDFs (`resources.html`)
- **Analytics:** a script tag in the `<head>` of every page

> The header (menu) and footer are copied into every page. If you change them, change all 9 HTML files. Searching across the project in VS Code (Ctrl+Shift+F) makes this quick.

### Adding a demo video later

Upload the video to YouTube, then replace the "Prototype demo" card in `resources.html` with:

```html
<div class="panel reveal" style="aspect-ratio:16/9">
  <iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="ARES demo"
    style="width:100%;height:100%;border:0" allowfullscreen loading="lazy"></iframe>
</div>
```

## Preview on your computer

From this folder, run either of these and open the address it prints:

```bash
npx serve .                  # needs Node.js
python -m http.server 8000   # needs Python
```

Opening the files by double-clicking mostly works too, but the page transitions only run when the site is served.

## Publishing on GitHub Pages (free)

1. Create a GitHub repository and upload these files.
   - For **`solaris-tech.github.io`**, create a free GitHub *organization* called `solaris-tech`, then a repo named exactly `solaris-tech.github.io`.
   - Or use a repo named `solaris-tech` on your own account. The site will be at `<username>.github.io/solaris-tech/`.
2. In the repo, go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, set it to `main` / `/ (root)`, then click **Save**.
3. Wait a minute, then open the URL GitHub shows.

All links are relative, so the site works at either address. The one exception is `404.html`: if you use the `<username>.github.io/solaris-tech/` option, open it and change `window.SITE_ROOT = "/"` to `"/solaris-tech/"`.

`.nojekyll` tells GitHub to serve the files as they are. Keep it.

**Before you push:** `prompt.txt` and `editor.txt` are planning notes. Anything in the repo is public on GitHub Pages, so remove them or move them out of the folder if you don't want them visible.

## Visitor analytics (free, no cookie banner)

1. Sign up at [goatcounter.com](https://www.goatcounter.com) and choose a code, e.g. `solaris-tech`.
2. Replace the `<!-- TODO (analytics) ... -->` line in every HTML file's `<head>` with:

```html
<script data-goatcounter="https://YOUR-CODE.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
```

## Design notes

- **Colors:** charcoal background, muted Mars rust `#b4674d`, dusty sand `#c9b89a`, muted teal `#5f9ea0` for data.
- **Fonts:** Space Grotesk (headings), Inter (body text), JetBrains Mono (labels and data), all from Google Fonts.
- **Animations:** respect the visitor's *reduce motion* setting. Page-to-page transitions use the browser's View Transitions API (Chrome, Edge, Safari 18.2+). Other browsers simply load the page normally.
- The feature animations and the home-page "SIM FEED" panel are **illustrative simulations**, not real rover data. Swap in real measurements once testing starts.
