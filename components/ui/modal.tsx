'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, type HTMLMotionProps } from 'framer-motion'

/**
 * Modal Dialog Primitive
 * 
 * ARCHITECTURE:
 * - Uses Radix Dialog for accessible focus management and keyboard handling
 * - Provides automatic focus trap and dismissal on Escape key
 * - Implements proper ARIA roles and attributes
 * - Supports animated overlays with Framer Motion
 * - Fully composable: Dialog, Content, Header, Footer, Trigger
 */

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

/**
 * Modal Overlay with animated backdrop
 * Positioned behind modal content; dismisses modal on click
 */
const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity',
      className
    )}
    {...props}
  />
))
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * Modal Content wrapper
 * Manages layout, sizing, and animation of modal box
 */
const ModalContent = React.forwardRef<
  HTMLDivElement,
  Omit<
    HTMLMotionProps<'div'>,
    'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
  > & {
    children?: React.ReactNode
    onOverlayClick?: () => void
    size?: 'sm' | 'md' | 'lg' | 'xl'
  }
>(({ className, size = 'md', children, ...props }, ref) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <DialogPortal>
      <ModalOverlay />
      <DialogPrimitive.Content asChild>
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%]',
            'bg-surface-raised border border-border-subtle rounded-lg shadow-lg',
            'p-6 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            sizeClasses[size],
            className
          )}
          role="dialog"
          aria-modal="true"
          {...props}
        >
          {children}
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
ModalContent.displayName = 'ModalContent'

/**
 * Modal Header section
 */
const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => (
  <div
    className={cn('flex flex-col space-y-2', className)}
    {...props}
  />
)
ModalHeader.displayName = 'ModalHeader'

/**
 * Modal Title
 * Automatically linked to dialog for accessibility
 */
const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none', className)}
    {...props}
  />
))
ModalTitle.displayName = DialogPrimitive.Title.displayName

/**
 * Modal Description
 * Provides accessible description of modal purpose
 */
const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-text-muted', className)}
    {...props}
  />
))
ModalDescription.displayName = DialogPrimitive.Description.displayName

/**
 * Modal Footer section
 */
const ModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => (
  <div
    className={cn('flex flex-col-reverse gap-3 sm:flex-row sm:justify-end', className)}
    {...props}
  />
)
ModalFooter.displayName = 'ModalFooter'

/**
 * Modal Close button
 * Can be placed anywhere in the modal (typically header corner)
 */
const ModalCloseButton = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Close
    ref={ref}
    className={cn(
      'absolute right-4 top-4 rounded-md opacity-70 ring-offset-background',
      'transition-opacity hover:opacity-100 focus:outline-none focus:ring-2',
      'focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none',
      className
    )}
    {...props}
  >
    <X className="h-4 w-4" />
    <span className="sr-only">Close</span>
  </DialogPrimitive.Close>
))
ModalCloseButton.displayName = DialogPrimitive.Close.displayName

/**
 * Composite Modal component for easy use
 * 
 * EXAMPLE:
 * ```tsx
 * <Modal open={isOpen} onOpenChange={setIsOpen}>
 *   <ModalContent>
 *     <ModalHeader>
 *       <ModalTitle>Delete account?</ModalTitle>
 *       <ModalDescription>
 *         This action cannot be undone.
 *       </ModalDescription>
 *       <ModalCloseButton />
 *     </ModalHeader>
 *     <ModalFooter>
 *       <DialogClose asChild>
 *         <Button variant="outline">Cancel</Button>
 *       </DialogClose>
 *       <Button variant="destructive">Delete</Button>
 *     </ModalFooter>
 *   </ModalContent>
 * </Modal>
 * ```
 */
interface ModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onOpenChange, children }, _ref) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  )
)
Modal.displayName = 'Modal'

export {
  Dialog,
  Modal,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalCloseButton,
}
