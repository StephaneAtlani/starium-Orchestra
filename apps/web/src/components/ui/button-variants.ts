import { cva, type VariantProps } from "class-variance-authority"

/**
 * Charte « pilule » des contrôles (tokens --control-* dans styles/tokens.css) :
 * - primaire (default) : pilule pleine encre, texte blanc ;
 * - secondaires (outline / secondary) : pilule blanche bordée, texte encre ;
 * - ghost : pilule transparente, fond neutre au survol.
 */
const inkFilledButton =
  "border-[1.5px] border-transparent bg-[color:var(--control-active-bg)] text-[color:var(--control-active-fg)] font-bold text-[13px] hover:bg-[color:var(--control-active-hover-bg)] hover:text-[color:var(--control-active-fg)] aria-expanded:bg-[color:var(--control-active-hover-bg)] aria-expanded:text-[color:var(--control-active-fg)]"

const outlinePillButton =
  "border-[1.5px] border-[color:var(--control-border)] bg-[color:var(--control-bg)] text-[color:var(--control-fg)] font-bold text-[13px] hover:bg-[color:var(--control-hover-bg)] hover:text-[color:var(--control-fg)] aria-expanded:bg-[color:var(--control-hover-bg)] aria-expanded:text-[color:var(--control-fg)]"

const ghostPillButton =
  "border-[1.5px] border-transparent bg-transparent text-[color:var(--control-fg)] font-bold text-[13px] hover:bg-[color:var(--control-hover-bg)] hover:text-[color:var(--control-fg)] aria-expanded:bg-[color:var(--control-hover-bg)] aria-expanded:text-[color:var(--control-fg)]"

/**
 * Variantes CVA du bouton — module sans `"use client"`.
 * Safe à appeler depuis Server Components (ex. `className` sur un `<Link>`).
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--control-radius,999px)] bg-clip-padding whitespace-nowrap transition-[background,color,border-color] duration-150 ease-out outline-none select-none focus-visible:border-[color:var(--control-border)] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: inkFilledButton,
        outline: outlinePillButton,
        secondary: outlinePillButton,
        ghost: ghostPillButton,
        destructive:
          "border-[1.5px] border-destructive/35 bg-[color:var(--control-bg)] text-destructive font-bold text-[13px] hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "border-0 bg-transparent p-0 font-medium text-primary underline-offset-4 hover:bg-transparent hover:underline",
      },
      size: {
        default: "min-h-[43px] px-4 py-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "min-h-8 gap-1 px-2.5 py-1.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-9 gap-1.5 px-3 py-2 text-[12px] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-11 gap-1.5 px-4 py-2.5 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        icon: "size-11 p-0 md:size-[43px]",
        "icon-xs": "size-11 p-0 md:size-8 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-11 p-0 md:size-9 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11 p-0 md:size-[43px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type ButtonVariantProps = VariantProps<typeof buttonVariants>

export { buttonVariants, type ButtonVariantProps }
