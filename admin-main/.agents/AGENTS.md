# Project Rules

## UI/UX Design Philosophy
Before writing ANY UI code, STOP and study the existing design first. Ask yourself:
- What is the existing color palette? Match it. Don't invent new colors.
- What is the existing spacing rhythm? Match it. Don't default to `p-6` everywhere.
- What would look **premium** here — not just functional, not just "works"?
- What would a designer at Linear, Vercel, or Stripe do? Do that.
- Never take the lazy shortcut. If the lazy option is an emoji, a uniform grid, or a random color — it's wrong.

## UI/UX Design Rules

### No Equal Rectangles
NEVER make all cards, boxes, or grid cells the same size. Use asymmetric layouts that reflect content hierarchy:
- Dominant content gets a larger, taller, or wider container.
- Secondary content gets compact, utility-sized containers.
- Different content = different box dimensions. Always.

### No Lazy Grid Defaults
Do NOT default to `grid-cols-2` or `grid-cols-3` with uniform children. Instead:
- Use `col-span` and `row-span` to create varied cell sizes.
- Let content dictate the box size, not the grid.
- A bio paragraph should NOT be the same height as a two-line contact card.

### Visual Hierarchy Through Size
The user's eye should know where to look first. Achieve this by:
- Making the most important element visually largest.
- Using whitespace asymmetrically — tighter around small items, more breathing room around hero elements.
- Varying padding, not making every card `p-6`.

### Icons
- NEVER use colorful system emojis in the UI.
- Always use monochrome inline SVG icons (white, or inheriting `currentColor`).

### Color Palette Consistency
- NEVER introduce random accent colors (green, orange, red borders) that don't exist in the established UI palette.
- Stick to the dashboard's existing color language: whites at varying opacities (`white/10`, `white/20`, `white/40`) and the defined accent-blue.
- If a card needs visual separation, use opacity, border weight, or spacing — not a new color.
- Don't borrow color conventions from generic SaaS templates. Match the palette that's already there.
