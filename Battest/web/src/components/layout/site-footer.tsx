import Link from "next/link";
import { Battery } from "lucide-react";
import { SITE, NAV_ITEMS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-secondary/30">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Battery className="h-5 w-5" />
              </span>
              <span>{SITE.productName}</span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              {SITE.description}
            </p>
            <p className="mt-4 text-xs text-muted-foreground/80">
              本工具为评估辅助，结果用于参考与筛查，不替代专业物理检测。
            </p>
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">产品</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold text-foreground">联系我们</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>邮箱：{SITE.contactEmail}</li>
              <li>微信：待填写</li>
              <li>地址：待填写</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <div>
            © {new Date().getFullYear()} {SITE.productName} · 大学生创新创业大赛项目
          </div>
          <div>本网站内容为示例与项目展示，最终以正式发布版本为准。</div>
        </div>
      </div>
    </footer>
  );
}
