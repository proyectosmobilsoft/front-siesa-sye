import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = React.forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
    <div className="relative">
        <select
            className={cn(
                "flex h-10 w-full appearance-none items-center justify-between rounded-xl border border-transparent bg-[var(--nu-fill)] px-3.5 py-2 pr-9 text-sm text-foreground transition-all placeholder:text-muted-foreground hover:bg-[var(--nu-fill-2)] focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-[var(--nu-tint)] disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-card [&>option]:text-foreground",
                className
            )}
            ref={ref}
            {...props}
        >
            {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-55" />
    </div>
))
Select.displayName = "Select"

export { Select }
