import { Dialog as SheetPrimitive } from '@base-ui/react/dialog'
import { cn } from 'cn'

// shadcn Sheet, scoped to the right-side drawers used by this application.
function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root {...props} />
}

function SheetContent({
  className,
  children,
  ...props
}: SheetPrimitive.Popup.Props) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop className="sheet-overlay" />
      <SheetPrimitive.Popup
        className={cn('sheet-content', className)}
        {...props}
      >
        {children}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  )
}

function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close {...props} />
}

function SheetTitle(props: SheetPrimitive.Title.Props) {
  return <SheetPrimitive.Title {...props} />
}

function SheetDescription(props: SheetPrimitive.Description.Props) {
  return <SheetPrimitive.Description {...props} />
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle }
