"use client";

import Link from "next/link";
import { useState } from "react";
import { Battery, Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { NAV_ITEMS, SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Battery className="h-5 w-5" />
          </span>
          <span className="text-base sm:text-lg">{SITE.productName}</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground/75 transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            href="/assessment"
            className={buttonVariants({ variant: "accent", size: "sm" })}
          >
            开始评估
          </Link>
        </div>

        <button
          type="button"
          aria-label="打开菜单"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          "border-t border-border/60 bg-background md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="container flex flex-col gap-1 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/assessment"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: "accent" }), "mt-2 w-full")}
          >
            开始评估
          </Link>
        </nav>
      </div>
    </header>
  );
}
