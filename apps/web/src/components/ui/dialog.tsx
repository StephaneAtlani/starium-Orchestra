"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useFullscreenPortalContainer } from "@/hooks/use-fullscreen-portal-container"
import { XIcon } from "lucide-react"

type DialogOnOpenChange = NonNullable<DialogPrimitive.Root.Props["onOpenChange"]>

type DialogSize = "sm" | "md" | "lg" | "xl" | "full"

const dialogModalSizeClasses: Record<DialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-4xl",
  full: "sm:max-w-[calc(100%_-_2rem)]",
}

const DialogDismissFromOverlayContext = React.createContext<(() => void) | null>(null)

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

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  onPointerDown,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  const dismissFromOverlay = React.useContext(DialogDismissFromOverlayContext)

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Base UI enrichit l’event ; on ne forward que si un handler custom est fourni
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
        // Voile : scrim + léger flou ; forceRender = backdrop même en dialogue imbriqué (refs Base UI)
        "fixed inset-0 z-[80] bg-black/40 duration-200 dark:bg-black/55 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      onPointerDown={handlePointerDown}
      {...props}
    />
  )
}

/** Modal centré (desktop) / bottom-sheet (mobile) — scroll délégué à DialogBody. */
const dialogContentModalClass =
  "fixed z-[81] flex w-full flex-col gap-4 overflow-x-hidden overflow-y-hidden border border-border/60 bg-background/95 p-4 text-sm shadow-lg ring-1 ring-black/[0.04] backdrop-blur-2xl duration-200 outline-none dark:ring-white/[0.06] inset-x-0 bottom-0 max-h-[min(92dvh,calc(100dvh_-_1rem))] translate-y-0 rounded-t-2xl border-b-0 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100%_-_2rem)] sm:max-h-[calc(100dvh_-_2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-4 sm:pb-4 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-top-2 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:slide-out-to-top-2"

/** Panneau latéral droit pleine hauteur (chat, etc.) — évite le conflit de classes avec le modal centré. */
const dialogContentSidePanelClass =
  "fixed inset-y-0 right-0 left-auto top-0 z-[81] flex h-[100dvh] max-h-[100dvh] w-full max-w-[min(100vw,28rem)] flex-col gap-0 overflow-hidden rounded-none border-l border-border/80 bg-background p-0 text-sm shadow-2xl outline-none ring-0 duration-300 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-right data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-right sm:rounded-l-2xl"

/** Widget chat flottant bas-droite (type support / Dougs). */
const dialogContentChatWidgetClass =
  "fixed bottom-3 right-3 top-auto left-auto z-[81] flex h-[min(85dvh,640px)] max-h-[min(85dvh,640px)] w-[min(calc(100vw-1.5rem),400px)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.75rem] border border-border/50 bg-background p-0 text-sm shadow-[0_24px_64px_-12px_rgba(0,0,0,0.28)] outline-none ring-0 duration-300 sm:bottom-5 sm:right-5 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-4"

function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlayClassName,
  /** true = tiroir droit pleine hauteur (remplace le positionnement modal centré). */
  sidePanel = false,
  /** true = carte flottante bas-droite (widget chat). Mutuellement exclusif avec sidePanel. */
  chatWidget = false,
  /** Largeur normalisée du modal (desktop). Ignoré pour sidePanel / chatWidget. */
  size = "sm",
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  overlayClassName?: string
  sidePanel?: boolean
  chatWidget?: boolean
  size?: DialogSize
}) {
  const layout = chatWidget ? "chat" : sidePanel ? "side" : "modal"
  const closeBtnClass =
    layout === "chat"
      ? "absolute right-3 top-3 z-20 h-9 w-9 rounded-full text-white hover:bg-white/15 hover:text-white"
      : sidePanel
        ? "absolute right-3 top-3 z-10 rounded-full bg-background/80 hover:bg-muted"
        : "absolute top-2 right-2"

  const popupClassName =
    layout === "chat"
      ? cn(dialogContentChatWidgetClass, className)
      : sidePanel
        ? cn(dialogContentSidePanelClass, className)
        : cn(dialogContentModalClass, dialogModalSizeClasses[size], className)

  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-side-panel={sidePanel ? "true" : undefined}
        data-chat-widget={chatWidget ? "true" : undefined}
        className={popupClassName}
        {...props}
      >
        {children}
        {showCloseButton && (
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
            <XIcon
            />
            <span className="sr-only">Fermer</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex shrink-0 flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "flex-1 min-h-0 overflow-y-auto overscroll-contain",
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
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex shrink-0 flex-col-reverse gap-2 rounded-b-xl border-t border-border/60 bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Fermer
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-foreground",
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
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
export type { DialogSize }
