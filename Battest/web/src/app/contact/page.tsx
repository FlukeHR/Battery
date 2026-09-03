import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, QrCode } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "联系合作",
  description: `联系 ${SITE.productName} 团队：B 端合作申请、C 端体验、媒体合作与比赛交流。`,
};

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-border/60 bg-secondary/30">
        <div className="container py-16 sm:py-24">
          <Badge className="mb-4">联系合作</Badge>
          <h1 className="max-w-3xl text-balance text-3xl font-bold sm:text-5xl">
            想了解更多？我们随时欢迎沟通
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            无论是商家试用、个人用户体验，还是比赛交流与媒体合作，都欢迎通过下方渠道联系我们。
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="p-7">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">邮件</h3>
              <p className="mt-2 text-sm text-muted-foreground">商务、媒体、比赛交流</p>
              <a
                href={`mailto:${SITE.contactEmail}`}
                className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
              >
                {SITE.contactEmail}
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-7">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">微信</h3>
              <p className="mt-2 text-sm text-muted-foreground">添加项目负责人微信</p>
              <div className="mt-3 text-sm font-medium text-foreground">微信号：待填写</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-7">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">地址</h3>
              <p className="mt-2 text-sm text-muted-foreground">XX 大学 · XX 学院</p>
              <div className="mt-3 text-sm text-muted-foreground">具体地址待填写</div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section className="bg-secondary/30" eyebrow="按需求选择渠道" title="不同身份不同入口">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-7">
              <Badge className="mb-3">B 端商家</Badge>
              <h3 className="text-xl font-semibold">申请内测试用</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                填写门店信息，我们在 1-2 个工作日内回拨开通账号。
              </p>
              <Link
                href="/for-business#apply"
                className={cn(buttonVariants({ variant: "accent" }), "mt-5")}
              >
                前往申请页
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-7">
              <Badge variant="accent" className="mb-3">C 端用户</Badge>
              <h3 className="text-xl font-semibold">扫码体验小程序</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                正式上线后小程序码会同步更新，欢迎关注本网站获取最新进展。
              </p>
              <Link
                href="/for-users"
                className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
              >
                <QrCode className="h-4 w-4" /> 查看小程序信息
              </Link>
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}
