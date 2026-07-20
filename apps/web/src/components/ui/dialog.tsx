"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useFullscreenPortalContainer } from "@/hooks/use-fullscreen-portal-container"
import { XIcon } from "lucide-react"
import type { StariumModalAccent } from "@/components/layout/starium-modal-accent"

type DialogOnOpenChange = NonNullable<DialogPrimitive.Root.Props["onOpenChange"]>

type DialogSize = "sm" | "md" | "lg" | "xl" | "full"

/** Largeurs modale Starium — ref. DS Modal.jsx (Modal - Starium.html) */
const dialogModalSizeClasses: Record<DialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-[520px]",
  lg: "sm:max-w-[560px]",
  xl: "sm:max-w-4xl",
  full: "sm:max-w-[calc(100%_-_2rem)]",
}

const DialogDismissFromOverlayContext = React.createContext<(() => void) | null>(null)

type DialogChromeContextValue = {
  showCloseButton: boolean
  layout: "starium" | "legacy"
}

const DialogChromeContext = React.createContext<DialogChromeContextValue>({
  showCloseButton: true,
  layout: "starium",
})

function Dialog({ onOpenChange, children, ...props }: DialogPrimitive.Root.Props) {
  const dismissFromOverlay = React.useMemo(() => {
    if (!onOpenChange) return null
    return () => {
      onOpenChange(false, { reason: "outside-press" } as Parameters<DialogOnOpenChange>[1])
    }
  }, [onOpenChange])

  return (
    <DialogPrimitive.Root data-slot="dialog" onOpenChange={onOpenChange} {...props}>
      <DialogDismissFromOverlayContext.Provider value={dismissFromOverlay}>
        {children as React.ReactNode}
      </DialogDismissFromOverlayContext.Provider>
    </DialogPrimitive.Root>
  )
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ container, ...props }: DialogPrimitive.Portal.Props) {
  const fullscreenContainer = useFullscreenPortalContainer()
  return (
    <DialogPrimitive.Portal
      data-slot="dialog-portal"
      container={container ?? fullscreenContainer}
      {...props}
    />
  )
}

function DialogClose({ className, ...props }: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      className={cn("starium-modal__close", className)}
      {...props}
    />
  )
}

function DialogOverlay({
  className,
  onPointerDown,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  const dismissFromOverlay = React.useContext(DialogDismissFromOverlayContext)

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      ;(onPointerDown as ((e: React.PointerEvent<HTMLDivElement>) => void) | undefined)?.(event)
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.target !== event.currentTarget) return
      dismissFromOverlay?.()
    },
    [dismissFromOverlay, onPointerDown],
  )

  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      forceRender
      className={cn(
        "fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px] duration-300 ease-out dark:bg-black/55 motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0",
        className,
      )}
      onPointerDown={handlePointerDown}
      {...props}
    />
  )
}

/** Modale Starium centrée (défaut) — ref. DS Modal.jsx */
const dialogContentStariumModalClass =
  "fixed z-[81] inset-x-4 bottom-auto top-1/2 left-1/2 flex min-h-0 w-full max-w-[calc(100%-2rem)] max-h-[min(92dvh,calc(100dvh-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-x-hidden overflow-y-hidden rounded-xl border border-border/80 bg-card p-0 text-sm shadow-[var(--ds-modal-shadow)] outline-none duration-300 ease-out motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-open:zoom-in-95 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 motion-safe:data-closed:zoom-out-95"

/** Legacy bottom-sheet mobile — opt-in via layout="legacy" */
const dialogContentLegacyModalClass =
  "fixed z-[81] flex min-h-0 w-full flex-col gap-4 overflow-x-hidden overflow-y-hidden border border-border/60 bg-background/95 p-4 text-sm shadow-lg ring-1 ring-black/[0.04] backdrop-blur-2xl duration-300 ease-out outline-none dark:ring-white/[0.06] inset-x-0 bottom-0 max-h-[min(92dvh,calc(100dvh_-_1rem))] translate-y-0 rounded-t-2xl border-b-0 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100%_-_2rem)] sm:max-h-[calc(100dvh_-_2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-4 sm:pb-4 motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 max-sm:motion-safe:data-open:slide-in-from-bottom-full sm:motion-safe:data-open:zoom-in-95 sm:motion-safe:data-open:slide-in-from-top-2 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 max-sm:motion-safe:data-closed:slide-out-to-bottom-full sm:motion-safe:data-closed:zoom-out-95 sm:motion-safe:data-closed:slide-out-to-top-2"

const dialogContentSidePanelClass =
  "fixed inset-y-0 right-0 left-auto top-0 z-[81] flex min-h-0 h-[100dvh] max-h-[100dvh] w-full max-w-[min(100vw,28rem)] flex-col gap-0 overflow-hidden rounded-none border-l border-border/80 bg-background p-0 text-sm shadow-2xl outline-none ring-0 duration-300 ease-out motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-open:slide-in-from-right motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 motion-safe:data-closed:slide-out-to-right sm:rounded-l-2xl"

const dialogContentChatWidgetClass =
  "fixed bottom-3 right-3 top-auto left-auto z-[81] flex min-h-0 h-[min(85dvh,640px)] max-h-[min(85dvh,640px)] w-[min(calc(100vw-1.5rem),400px)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.75rem] border border-border/50 bg-background p-0 text-sm shadow-[0_24px_64px_-12px_rgba(0,0,0,0.28)] outline-none ring-0 duration-300 ease-out sm:bottom-5 sm:right-5 motion-safe:data-open:animate-in motion-safe:data-open:fade-in-0 motion-safe:data-open:zoom-in-95 motion-safe:data-open:slide-in-from-bottom-4 motion-safe:data-closed:animate-out motion-safe:data-closed:fade-out-0 motion-safe:data-closed:zoom-out-95 motion-safe:data-closed:slide-out-to-bottom-4"

function hasDialogHeaderChild(children: React.ReactNode): boolean {
  return containsDialogComponent(children, DialogHeader)
}

function containsDialogComponent(
  children: React.ReactNode,
  component: React.ElementType,
): boolean {
  let found = false
  React.Children.forEach(children, (child) => {
    if (found || !React.isValidElement(child)) return
    if (isSameComponent(child.type, component)) {
      found = true
      return
    }
    const nested = (child.props as { children?: React.ReactNode }).children
    if (nested != null) {
      found = containsDialogComponent(nested, component)
    }
  })
  return found
}

function isSameComponent(a: unknown, b: React.ElementType): boolean {
  if (a === b) return true
  if (typeof a === 'string' || typeof b === 'string') return false
  const left = a as { displayName?: string; name?: string }
  const right = b as { displayName?: string; name?: string }
  const leftName = left.displayName ?? left.name
  return leftName != null && leftName === (right.displayName ?? right.name)
}

function partitionStariumDialogChildren(children: React.ReactNode): {
  headers: React.ReactNode[]
  statuses: React.ReactNode[]
  bodies: React.ReactNode[]
  footers: React.ReactNode[]
  orphans: React.ReactNode[]
} {
  const headers: React.ReactNode[] = []
  const statuses: React.ReactNode[] = []
  const bodies: React.ReactNode[] = []
  const footers: React.ReactNode[] = []
  const orphans: React.ReactNode[] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      if (child != null && child !== false) orphans.push(child)
      return
    }
    if (isSameComponent(child.type, DialogHeader)) headers.push(child)
    else if (isSameComponent(child.type, DialogFooter)) footers.push(child)
    else if (isSameComponent(child.type, DialogBody)) bodies.push(child)
    else if ((child.props as { "data-slot"?: string })["data-slot"] === "dialog-status")
      statuses.push(child)
    else orphans.push(child)
  })

  return { headers, statuses, bodies, footers, orphans }
}

/** Enveloppe automatiquement le contenu orphelin dans DialogBody (layout starium). */
function normalizeStariumDialogChildren(children: React.ReactNode): React.ReactNode {
  const items = React.Children.toArray(children)

  if (
    items.length === 1 &&
    React.isValidElement(items[0]) &&
    items[0].type === "form"
  ) {
    const form = items[0]
    return React.cloneElement(
      form,
      form.props as React.Attributes,
      normalizeStariumDialogChildren(
        (form.props as { children?: React.ReactNode }).children,
      ),
    )
  }

  const { headers, statuses, bodies, footers, orphans } = partitionStariumDialogChildren(children)

  const bodyNodes =
    bodies.length > 0
      ? bodies
      : orphans.length > 0
        ? [
            <DialogBody key="starium-dialog-auto-body">
              {orphans}
            </DialogBody>,
          ]
        : []

  return [...headers, ...statuses, ...bodyNodes, ...footers]
}

function DialogHeaderClose({ className, ...props }: DialogPrimitive.Close.Props) {
  return (
    <DialogClose className={cn(className)} aria-label="Fermer" {...props}>
      <XIcon className="size-[18px] stroke-[2]" aria-hidden />
    </DialogClose>
  )
}

function DialogHeaderIcon({
  icon: Icon,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <div className={cn("starium-modal__icon", className)} aria-hidden>
      <Icon className="size-5 stroke-[2]" />
    </div>
  )
}

function DialogHeader({
  className,
  showCloseButton,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** Surcharge le `showCloseButton` du `DialogContent` parent. */
  showCloseButton?: boolean
}) {
  const chrome = React.useContext(DialogChromeContext)
  const shouldShowClose = showCloseButton ?? chrome.showCloseButton
  const isStarium = chrome.layout === "starium"

  return (
    <div
      data-slot="dialog-header"
      className={cn(
        isStarium ? "starium-modal__header" : "flex shrink-0 flex-col gap-2",
        className,
      )}
      {...props}
    >
      {children}
      {shouldShowClose && isStarium ? <DialogHeaderClose /> : null}
    </div>
  )
}
DialogHeader.displayName = "DialogHeader"
DialogBody.displayName = "DialogBody"
DialogFooter.displayName = "DialogFooter"

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  const chrome = React.useContext(DialogChromeContext)

  return (
    <div
      data-slot="dialog-body"
      className={cn(
        chrome.layout === "starium"
          ? "starium-modal__body"
          : "starium-modal__scroll min-h-0 flex-1 overflow-y-auto overscroll-contain",
        className,
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  const chrome = React.useContext(DialogChromeContext)
  const isStarium = chrome.layout === "starium"

  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        isStarium
          ? "starium-modal__footer"
          : "-mx-4 -mb-4 flex shrink-0 flex-col-reverse gap-2 rounded-b-xl border-t border-border/60 bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton ? (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Fermer
        </DialogPrimitive.Close>
      ) : null}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  const chrome = React.useContext(DialogChromeContext)

  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        chrome.layout === "starium"
          ? "starium-modal__title"
          : "text-lg font-semibold leading-none tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  const chrome = React.useContext(DialogChromeContext)

  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        chrome.layout === "starium"
          ? "starium-modal__subtitle"
          : "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlayClassName,
  sidePanel = false,
  chatWidget = false,
  size = "md",
  layout = "starium",
  hasStariumHeader,
  modalAccent = "gold",
  ref,
  onPointerDown,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  overlayClassName?: string
  sidePanel?: boolean
  chatWidget?: boolean
  size?: DialogSize
  /** `starium` (défaut) : modale centrée DS. `legacy` : bottom-sheet mobile historique. */
  layout?: "starium" | "legacy"
  /** Header Starium standard présent — évite la croix orpheline en double. */
  hasStariumHeader?: boolean
  /** Teinte colorée (header, icône, barre haute, sections). */
  modalAccent?: StariumModalAccent
}) {
  const panelLayout = chatWidget ? "chat" : sidePanel ? "side" : layout
  const withHeader =
    hasStariumHeader === true ||
    (hasStariumHeader !== false && hasDialogHeaderChild(children))
  const normalizedChildren =
    panelLayout === "starium" ? normalizeStariumDialogChildren(children) : children

  const closeBtnClass =
    panelLayout === "chat"
      ? "absolute right-5 top-5 z-20 inline-flex size-11 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-white shadow-none transition-colors hover:bg-transparent hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-0 md:size-9"
      : sidePanel
        ? "absolute right-3 top-3 z-10 rounded-full bg-background/80 hover:bg-muted"
        : panelLayout === "legacy"
          ? "absolute top-2 right-2"
          : "starium-modal__close absolute right-[14px] top-[14px] z-10"

  const popupClassName =
    panelLayout === "chat"
      ? cn(dialogContentChatWidgetClass, className)
      : sidePanel
        ? cn(dialogContentSidePanelClass, className)
        : panelLayout === "legacy"
          ? cn(dialogContentLegacyModalClass, dialogModalSizeClasses[size], className)
          : cn(dialogContentStariumModalClass, dialogModalSizeClasses[size], className)

  const chromeValue = React.useMemo(
    () => ({
      showCloseButton: showCloseButton && panelLayout === "starium",
      layout: panelLayout === "legacy" ? "legacy" as const : "starium" as const,
    }),
    [panelLayout, showCloseButton],
  )

  const mergedPopupRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    },
    [ref],
  )

  return (
    <DialogChromeContext.Provider value={chromeValue}>
      <DialogPortal>
        <DialogOverlay className={overlayClassName} />
        <DialogPrimitive.Popup
          ref={mergedPopupRef}
          data-slot="dialog-content"
          data-side-panel={sidePanel ? "true" : undefined}
          data-chat-widget={chatWidget ? "true" : undefined}
          data-layout={panelLayout === "starium" ? "starium" : undefined}
          data-modal-accent={
            panelLayout === "starium" ? modalAccent : undefined
          }
          className={cn(popupClassName, className)}
          onPointerDown={onPointerDown}
          {...props}
        >
          {normalizedChildren}
          {showCloseButton &&
          ((panelLayout === "starium" && !withHeader) || panelLayout === "chat") ? (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={
                <button
                  type="button"
                  className={closeBtnClass}
                  aria-label="Fermer"
                />
              }
            >
              <XIcon className="size-[18px]" aria-hidden />
            </DialogPrimitive.Close>
          ) : null}
          {showCloseButton && (panelLayout === "legacy" || sidePanel) ? (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={
                <Button
                  variant="ghost"
                  className={closeBtnClass}
                  size="icon-sm"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Fermer</span>
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </DialogChromeContext.Provider>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogHeaderClose,
  DialogHeaderIcon,
  DialogBody,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
export type { DialogSize }
export type { StariumModalAccent } from "@/components/layout/starium-modal-accent"
