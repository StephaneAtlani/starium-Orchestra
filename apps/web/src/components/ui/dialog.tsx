"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useFullscreenPortalContainer } from "@/hooks/use-fullscreen-portal-container"
import { XIcon } from "lucide-react"

type DialogOnOpenChange = NonNullable<DialogPrimitive.Root.Props["onOpenChange"]>

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

const dialogContentModalClass =
  "fixed top-1/2 left-1/2 z-[81] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border/60 bg-background/95 p-4 text-sm shadow-lg ring-1 ring-black/[0.04] backdrop-blur-2xl duration-200 outline-none dark:ring-white/[0.06] sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-top-2 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:slide-out-to-top-2"

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
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  overlayClassName?: string
  sidePanel?: boolean
  chatWidget?: boolean
}) {
  const layout = chatWidget ? "chat" : sidePanel ? "side" : "modal"
  const closeBtnClass =
    layout === "chat"
      ? "absolute right-3 top-3 z-20 h-9 w-9 rounded-full text-white hover:bg-white/15 hover:text-white"
      : sidePanel
        ? "absolute right-3 top-3 z-10 rounded-full bg-background/80 hover:bg-muted"
        : "absolute top-2 right-2"

  const baseClass =
    layout === "chat"
      ? dialogContentChatWidgetClass
      : sidePanel
        ? dialogContentSidePanelClass
        : dialogContentModalClass

  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-side-panel={sidePanel ? "true" : undefined}
        data-chat-widget={chatWidget ? "true" : undefined}
        className={cn(baseClass, className)}
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
      className={cn("flex flex-col gap-2", className)}
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
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t border-border/60 bg-muted/50 p-4 sm:flex-row sm:justify-end",
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
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
