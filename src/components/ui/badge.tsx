import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em]",
  {
    variants: {
      variant: {
        default: "border-white/12 bg-white/[0.06] text-white/80",
        success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
        warning: "border-amber-400/25 bg-amber-400/10 text-amber-100",
        danger: "border-rose-400/25 bg-rose-400/10 text-rose-100",
        accent: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
