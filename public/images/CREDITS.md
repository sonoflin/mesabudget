# Image & graphic asset credits

Every visual asset shipped in this project is either **original work created
for this project** or the **City of Mesa's own brand mark**. No third-party
stock, Unsplash/Getty, or scraped City marketing photography is used, so there
are no restrictive licensing obligations.

## Hero illustration

| File | Description | Source | License |
| --- | --- | --- | --- |
| `mesa-hero-1600.webp` | Stylized flat-vector desert-mesa landscape (layered red/amber/blue buttes, saguaros, dawn sun) used as the Learn-page hero backdrop. | **Original artwork generated for this project** (AI image generation, then resized/compressed to WebP with `sharp`). Not derived from, or a copy of, any specific third-party photograph or artwork. | Original work — owned by this project. No third-party rights. Free to ship. |
| `mesa-hero-800.webp` | Mobile (≤640px) variant of the hero illustration, same source. | Same as above. | Same as above. |

Both files are intentionally tiny (≈22 KB and ≈8 KB) and are served via a
responsive `srcset`; below-the-fold usage is lazy-loaded.

## Brand mark

| File | Description | Source | License |
| --- | --- | --- | --- |
| `../mesa-logo.png` | Official City of Mesa "mesa•az" logo (three-mesa mark). Pre-existing in the repo; used unmodified per the City of Mesa Brand Standards. | City of Mesa | City of Mesa trademark, used to represent the City per brand standards. |

## Generated / inline graphic system (no files)

The rest of the "Three Mesas" graphic language ships as **inline SVG and CSS
data-URIs** (no external files, so nothing to license and no base-path
concerns):

- **`MesaScape`** (`src/components/ui/MesaScape.tsx`) — original inline-SVG
  layered mesa-ridge horizon that echoes the logo's three-mesa mark.
- **`mesa-grain`**, **`mesa-contours`**, **`mesa-dawn`**, **`mesa-gradient-hero`**
  (`src/styles/global.css`) — original CSS textures/gradients (film grain,
  topographic contour lines, desert-dawn mesh) authored for this project.

All of the above are original and free of third-party licensing constraints.
