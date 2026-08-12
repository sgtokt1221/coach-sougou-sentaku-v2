"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

type DialogTriggerProps = DialogPrimitive.Trigger.Props & {
  /**
   * shadcn 互換の asChild。children に渡された単一要素を Base UI の render prop に
   * 変換して、Button 等をトリガとして描画する。render と asChild は両立しないが、
   * 既存の <DialogTrigger render={...} /> パターンも引き続き動くよう asChild は
   * オプショナル。
   */
  asChild?: boolean
}

function DialogTrigger({ asChild = false, children, render, ...props }: DialogTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return (
      <DialogPrimitive.Trigger
        data-slot="dialog-trigger"
        render={children}
        {...props}
      />
    )
  }
  return (
    <DialogPrimitive.Trigger data-slot="dialog-trigger" render={render} {...props}>
      {children}
    </DialogPrimitive.Trigger>
  )
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * ダイアログ本体。可視領域(--vvh、なければ 100dvh)から上下の余白(2rem)と
 * safe area を差し引いた最大高を持ち、内部は縦フレックス(header/body/footer)に
 * 積める構造。
 *
 * 互換方針: 既定は `overflow-y-auto`。`DialogBody` を使わない従来のダイアログ
 * (children をベタ置き)でも、本文が可視領域を超えたら DialogContent 全体が
 * スクロールするため内容がクリップされない。`DialogBody` を併用した場合は
 * header/footer が `shrink-0`、body が `flex-1 min-h-0` となり、children が
 * ちょうど最大高に収まるので DialogContent 自体はスクロールせず、本文だけが
 * スクロールする(close ボタンも固定されたまま残る)。個別ページが
 * `max-h-*`/`overflow-*` を className で指定している場合は tailwind-merge により
 * そちらが優先される。
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlay = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  /**
   * 背景の暗転・ぼかしを出すか。false にすると後ろがそのまま読める。
   * 後ろの本文を読みながら書く用途（FB・レビュー）で使う。
   * 併せて Dialog 側に modal={false} を渡さないと後ろを操作できない。
   */
  overlay?: boolean
}) {
  return (
    <DialogPortal>
      {overlay && <DialogOverlay />}
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(var(--vvh,100dvh)-2rem-var(--app-safe-top)-var(--app-safe-bottom))] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-xl bg-background p-4 text-sm ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
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

/**
 * ダイアログ本文のスクロール所有者。DialogHeader と DialogFooter の間に置き、
 * 長い本文をここに入れると本文だけがスクロールする(header/footer は固定)。
 * `flex-1 min-h-0` で DialogContent の残り高さを占有し、`overflow-y-auto`
 * `overscroll-contain` で内側スクロールを閉じ込める。
 *
 * padding は DialogContent 側の `p-4` に委ねているため、ここでは付与しない
 * (二重の余白を避ける)。DialogHeader/DialogFooter と併用する前提。
 */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}
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
        "-mx-4 -mb-4 flex shrink-0 flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
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
        "text-base leading-none font-medium",
        className
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
  DialogBody,
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
