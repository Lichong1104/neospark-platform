import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const brutalCardVariants = cva(
  "border-brutal border-foreground bg-card text-card-foreground font-mono",
  {
    variants: {
      shadow: {
        default: "brutal-shadow",
        heavy: "brutal-shadow-heavy",
        yellow: "brutal-shadow-yellow",
        cyan: "brutal-shadow-cyan",
        green: "brutal-shadow-green",
        red: "brutal-shadow-red",
        none: "",
      },
    },
    defaultVariants: {
      shadow: "default",
    },
  }
);

export interface BrutalCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof brutalCardVariants> {}

const BrutalCard = React.forwardRef<HTMLDivElement, BrutalCardProps>(
  ({ className, shadow, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(brutalCardVariants({ shadow, className }))}
      {...props}
    />
  )
);
BrutalCard.displayName = "BrutalCard";

const BrutalCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 border-b-brutal border-foreground", className)}
    {...props}
  />
));
BrutalCardHeader.displayName = "BrutalCardHeader";

const BrutalCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-bold uppercase tracking-wider", className)}
    {...props}
  />
));
BrutalCardTitle.displayName = "BrutalCardTitle";

const BrutalCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4", className)} {...props} />
));
BrutalCardContent.displayName = "BrutalCardContent";

export { BrutalCard, BrutalCardHeader, BrutalCardTitle, BrutalCardContent };
