/** Primary documentation and open textbooks checked on 2026-09-06.
 * Sources support concepts; our simplified models and parameters are authored here.
 */
export interface CourseReference {
  title: string;
  url: string;
}
export const featuredReferences: Record<string, CourseReference[]> = {
  "interactive-portfolio": [
    {
      title: "MDN — Learn web development",
      url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
    },
  ],
  "python-data-website": [
    {
      title: "Python — HTML escaping",
      url: "https://docs.python.org/3/library/html.html",
    },
  ],
  "python-text-adventure": [
    {
      title: "Python — Control flow and functions",
      url: "https://docs.python.org/3/tutorial/controlflow.html",
    },
  ],
  "csv-story": [
    {
      title: "IETF RFC 4180 — CSV format",
      url: "https://www.rfc-editor.org/rfc/rfc4180",
    },
  ],
  "maze-pathfinder": [
    {
      title:
        "Princeton Algorithms — Undirected graphs and breadth-first search",
      url: "https://algs4.cs.princeton.edu/41graph/",
    },
  ],
  "equation-explorer": [
    {
      title: "OpenStax — Vectors in three dimensions",
      url: "https://openstax.org/books/calculus-volume-3/pages/2-2-vectors-in-three-dimensions",
    },
  ],
  "smooth-coaster": [
    {
      title: "OpenStax — Defining the derivative",
      url: "https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative",
    },
  ],
  "fair-game": [
    {
      title: "OpenStax — Expected value and standard deviation",
      url: "https://openstax.org/books/introductory-statistics-2e/pages/4-2-mean-or-expected-value-and-standard-deviation",
    },
  ],
  "collision-level": [
    {
      title: "OpenStax — Types of collisions",
      url: "https://openstax.org/books/university-physics-volume-1/pages/9-4-types-of-collisions",
    },
  ],
  "satellite-mission": [
    {
      title: "OpenStax — Satellite orbits and energy",
      url: "https://openstax.org/books/university-physics-volume-1/pages/13-4-satellite-orbits-and-energy",
    },
  ],
  "adjustable-lamp": [
    {
      title: "OpenStax — Ohm's law",
      url: "https://openstax.org/books/university-physics-volume-2/pages/9-4-ohms-law",
    },
  ],
  "mini-synthesizer": [
    {
      title: "MDN — Web Audio API",
      url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API",
    },
  ],
  "color-tool": [
    {
      title: "W3C WCAG 2.2 — Contrast minimum",
      url: "https://www.w3.org/TR/WCAG22/#contrast-minimum",
    },
  ],
  "hierarchy-poster": [
    {
      title: "GOV.UK Design System — Headings",
      url: "https://design-system.service.gov.uk/styles/headings/",
    },
  ],
  "bouncing-character": [
    {
      title: "MDN — Easing functions",
      url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing",
    },
  ],
  "small-ecosystem": [
    {
      title: "OpenStax — Environmental limits to population growth",
      url: "https://openstax.org/books/biology-2e/pages/45-3-environmental-limits-to-population-growth",
    },
  ],
  "particle-separation": [
    {
      title: "OpenStax — Phases and classification of matter",
      url: "https://openstax.org/books/chemistry-2e/pages/1-2-phases-and-classification-of-matter",
    },
  ],
  "rain-ready-neighborhood": [
    {
      title: "US EPA — About green infrastructure",
      url: "https://www.epa.gov/green-infrastructure/about-green-infrastructure",
    },
  ],
  "coffee-shop": [
    {
      title: "OpenStax — Production in the short run",
      url: "https://openstax.org/books/principles-economics-3e/pages/7-2-production-in-the-short-run",
    },
  ],
  "logic-door": [
    {
      title: "MDN — Logical AND",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_AND",
    },
  ],
};
