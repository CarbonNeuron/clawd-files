"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Separator as SeparatorPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const separatorVariants = cva(
  "shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
  {
    variants: {
      variant: {
        default: "bg-border",
        gradient:
          "bg-gradient-to-r from-transparent via-border to-transparent",
        gradientLeft: "bg-gradient-to-r from-border to-transparent",
        gradientRight: "bg-gradient-to-r from-transparent to-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  variant = "default",
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> &
  VariantProps<typeof separatorVariants>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(separatorVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Separator, separatorVariants }
