"use client"

import type { ElementType } from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"

import { cn } from "@/lib/utils"
import { buttonVariants, type ButtonVariantProps } from "@/components/ui/button-variants"

type ButtonProps = ButtonPrimitive.Props &
  ButtonVariantProps & {
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
