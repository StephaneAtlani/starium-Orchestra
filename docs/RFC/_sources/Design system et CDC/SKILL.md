---
name: starium-design
description: Use this skill to generate well-branded interfaces and assets for Starium (SaaS de pilotage des directions, projets, budgets et ressources — « Révélez vos talents »), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files. The system is grounded in:

- `colors_and_type.css` — all design tokens (colors, type, spacing, radius, shadow, motion). Import this first.
- `assets/` — official logos (black + white versions), icon and product reference mock.
- `preview/` — single-purpose specimen cards covering tokens and components.
- `ui_kits/app/` — high-fidelity React recreation of the Starium app (sidebar, topbar, KPI cards, vision card, axis cards, objectives table, alerts, alignment chart, documents list).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

Key brand rules to honor:
- **Tone : Apple-like sobriety.** Calm, premium, decision-maker oriented. French is the primary language; sentence case for titles and buttons; UPPERCASE tracked only for overlines and section headers.
- **Color : warm paper neutrals + single gold accent (#E8A317).** Never bluish gray. No vivid gradients. Gold is parsimonious — primary CTA, KPI ring icons, active nav, primary chart line.
- **Typography : Manrope (substitute — flag this; official font not yet provided).** Display 700–800, tracking -0.02em. Tabular numerals on KPIs.
- **Iconography : Lucide outlined, stroke 1.75.** Signature pattern is a 40–44px circle of `--brand-gold-100` with the icon in `--brand-gold`. No emoji.
- **Logo on dark surfaces : use the `*-white.png` variant.** The gold star center stays gold in both versions.
- **Cards : 14px radius, 1px warm border, soft ink shadow.** No colored left borders, no gradient fills.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
