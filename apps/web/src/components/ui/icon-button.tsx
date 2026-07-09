"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"

type IconButtonSize = "icon" | "icon-sm" | "icon-xs" | "icon-lg"

type IconButtonProps = Omit<React.ComponentProps<typeof Button>, "size" | "children"> & {
  size?: IconButtonSize
  children: React.ReactNode
  "aria-label": string
}

function IconButton({
  size = "icon",
  variant = "default",
  children,
  "aria-label": ariaLabel,
  ...props
}: IconButtonProps) {
  return (
    <Button size={size} variant={variant} aria-label={ariaLabel} {...props}>
      {children}
    </Button>
  )
}

export { IconButton }
export type { IconButtonProps, IconButtonSize }
