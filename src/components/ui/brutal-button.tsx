import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const brutalButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-mono font-bold uppercase tracking-wider transition-none disabled:pointer-events-none disabled:opacity-50 border-brutal border-foreground",
  {
    variants: {
      variant: {
        default:
          "bg-card text-foreground brutal-shadow brutal-press hover:bg-secondary",
        primary:
          "bg-foreground text-card brutal-shadow brutal-press hover:bg-foreground/90",
        yellow:
          "bg-accent-yellow text-foreground brutal-shadow-yellow brutal-press hover:brightness-110",
        cyan: "bg-accent-cyan text-foreground brutal-shadow-cyan brutal-press hover:brightness-110",
        green:
          "bg-accent-green text-foreground brutal-shadow-green brutal-press hover:brightness-110",
        red: "bg-accent-red text-card brutal-shadow-red brutal-press hover:brightness-110",
        purple:
          "bg-accent-purple text-card brutal-shadow-purple brutal-press hover:brightness-110",
        orange:
          "bg-accent-orange text-foreground brutal-shadow-orange brutal-press hover:brightness-110",
        ghost:
          "border-transparent shadow-none hover:bg-secondary hover:border-foreground",
        outline:
          "bg-card text-foreground brutal-shadow brutal-press hover:bg-accent-yellow",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BrutalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof brutalButtonVariants> {}

const BrutalButton = React.forwardRef<HTMLButtonElement, BrutalButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(brutalButtonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
BrutalButton.displayName = "BrutalButton";

export { BrutalButton, brutalButtonVariants };
