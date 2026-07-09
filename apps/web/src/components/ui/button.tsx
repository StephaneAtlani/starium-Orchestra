"use client"

import type { ElementType } from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const goldOutlineButton =
  "border-[1.5px] border-[color:var(--brand-gold-100)] bg-[color:var(--neutral-0,var(--card))] text-[color:var(--brand-gold-700)] font-bold text-[13px] hover:bg-[color:var(--brand-gold-050)] hover:text-[color:var(--brand-gold-700)] aria-expanded:bg-[color:var(--brand-gold-050)] aria-expanded:text-[color:var(--brand-gold-700)]"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-md,10px)] bg-clip-padding whitespace-nowrap transition-[background,color,border-color] duration-150 ease-out outline-none select-none focus-visible:border-[color:var(--brand-gold-100)] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: goldOutlineButton,
        outline: goldOutlineButton,
        secondary: goldOutlineButton,
        ghost: goldOutlineButton,
        destructive:
          "border-[1.5px] border-destructive/35 bg-[color:var(--neutral-0,var(--card))] text-destructive font-bold text-[13px] hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "border-0 bg-transparent p-0 font-medium text-primary underline-offset-4 hover:bg-transparent hover:underline",
      },
      size: {
        default: "min-h-[43px] px-2.5 py-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "min-h-8 gap-1 px-2 py-1.5 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-9 gap-1.5 px-2.5 py-2 text-[12px] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-11 gap-1.5 px-3 py-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-11 p-0 md:size-[43px]",
        "icon-xs":
          "size-11 rounded-[min(var(--radius-md),10px)] p-0 in-data-[slot=button-group]:rounded-lg md:size-8 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-11 rounded-[min(var(--radius-md),12px)] p-0 in-data-[slot=button-group]:rounded-lg md:size-9 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11 p-0 md:size-[43px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /**
     * Quand `true`, on rend un `span` avec les styles bouton (évite les `<button>` imbriqués).
     * Compat shadcn : ne pas transmettre d’autres props invalides au DOM.
     */
    asChild?: boolean
  }

function Button({
  className,
  variant = "default",
  size = "default",
  asChild,
  ...props
}: ButtonProps) {
  const Comp: ElementType = asChild ? "span" : ButtonPrimitive

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants }
