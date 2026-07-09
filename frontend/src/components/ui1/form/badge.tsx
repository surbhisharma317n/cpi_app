import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../../lib/utils"
import { X } from "lucide-react"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border border-gray-300",
        success: "border-transparent bg-green-100 text-green-800 hover:bg-green-200",
        warning: "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        info: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200",
        purple: "border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200",
        pink: "border-transparent bg-pink-100 text-pink-800 hover:bg-pink-200",
        gray: "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-sm",
        lg: "px-3 py-1 text-base",
      },
      shape: {
        rounded: "rounded-full",
        square: "rounded-lg",
        pill: "rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      shape: "rounded",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  closable?: boolean
  onClose?: () => void
  showCloseIcon?: boolean
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, shape, closable, onClose, showCloseIcon = true, children, ...props }, ref) => {
    const handleClose = (e: React.MouseEvent) => {
      e.stopPropagation()
      onClose?.()
    }

    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, shape, className }))}
        {...props}
      >
        {children}
        {closable && (
          <button
            type="button"
            onClick={handleClose}
            className="ml-1 -mr-1 h-4 w-4 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current"
            aria-label="Remove badge"
          >
            {showCloseIcon && <X className="h-3 w-3" />}
          </button>
        )}
      </div>
    )
  }
)
Badge.displayName = "Badge"

// Badge Group Component
interface BadgeGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number
  overflowMessage?: string
}

const BadgeGroup = React.forwardRef<HTMLDivElement, BadgeGroupProps>(
  ({ className, children, max, overflowMessage = "+{count} more", ...props }, ref) => {
    const badges = React.Children.toArray(children)
    const shouldCollapse = max && badges.length > max
    
    const visibleBadges = shouldCollapse ? badges.slice(0, max - 1) : badges
    const hiddenCount = shouldCollapse ? badges.length - (max - 1) : 0

    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap gap-1", className)}
        {...props}
      >
        {visibleBadges}
        {shouldCollapse && (
          <Badge variant="outline">
            {overflowMessage.replace("{count}", hiddenCount.toString())}
          </Badge>
        )}
      </div>
    )
  }
)
BadgeGroup.displayName = "BadgeGroup"

export { Badge, BadgeGroup, badgeVariants }