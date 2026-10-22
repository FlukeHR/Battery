import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  eyebrow?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  containerClassName?: string;
}

export function Section({
  eyebrow,
  title,
  description,
  className,
  containerClassName,
  children,
  ...props
}: SectionProps) {
  return (
    <section className={cn("py-20 sm:py-24", className)} {...props}>
      <div className={cn("container", containerClassName)}>
        {(eyebrow || title || description) && (
          <div className="mx-auto mb-12 max-w-2xl text-center">
            {eyebrow && (
              <div className="mb-3 text-sm font-medium uppercase tracking-wider text-accent">
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
