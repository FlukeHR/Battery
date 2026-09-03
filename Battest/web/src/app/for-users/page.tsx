import type { Metadata } from "next";
import Link from "next/link";
import {
  BatteryCharging,
  HeartPulse,
  QrCode,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Timer,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "C 端方案 · 个人车主电池健康评估小程序",
  description:
    "面向个人电动车车主的微信小程序：输入使用数据，快速获得电池健康评分、剩余寿命估算与日常保养建议。",
};

export default function ForUsersPage() {
  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-accent/10 to-background">
        <div className="container py-16 sm:py-24">
          <Badge variant="accent" className="mb-4">
            <Sparkles className="mr-1 h-3.5 w-3.5" /> 面向个人车主
          </Badge>
          <h1 className="max-w-3xl text-balance text-3xl font-bold sm:text-5xl">
            你的电池还能用多久？
            <br />
            <span className="text-accent">几步就能心里有数</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            微信小程序里填写几项使用数据，即可获得电池健康评分、剩余寿命估算与保养建议。
            买二手车前查一查，日常使用心里有底。
          </p>
          <Link
            href="/assessment"
            className={cn(buttonVariants({ variant: "accent", size: "lg" }), "mt-8")}
          >
            先体验网页版评估
          </Link>
        </div>
      </section>

      <Section eyebrow="用户痛点" title="电动车用了几年，电池到底什么状态？">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: "不知道什么时候该换电池", desc: "续航突然变短，是骑法问题还是电池真的衰减了？" },
            { title: "维修店说什么就是什么", desc: "话语权不对等，被忽悠换电池的故事太多。" },
            { title: "二手买卖被信息差坑", desc: "卖车卖低、买车买贵，缺一个客观参考。" },
          ].map((p) => (
            <Card key={p.title} className="bg-secondary/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        className="bg-secondary/30"
        eyebrow="小程序功能"
        title="一份属于你的电池健康报告"
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BatteryCharging, title: "健康度评分", desc: "0-100 直观打分，等级一眼看懂" },
            { icon: Timer, title: "剩余寿命估算", desc: "结合使用强度估算继续使用时长" },
            { icon: HeartPulse, title: "保养建议", desc: "充电习惯、骑行方式针对性建议" },
            { icon: ThumbsUp, title: "买卖参考", desc: "二手车买卖时给出合理的价格区间参考" },
          ].map((f) => (
            <Card key={f.title}>
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="使用流程" title="3 步生成你的电池报告">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { step: "01", title: "选择车型 / 电池类型", desc: "从主流车型库中选择，或手动填写型号" },
            { step: "02", title: "填写使用数据", desc: "购入时间、累计里程、充电与骑行习惯" },
            { step: "03", title: "获得评估报告", desc: "健康度评分、剩余寿命、保养建议" },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-border bg-background p-6">
              <div className="text-2xl font-bold text-accent">{s.step}</div>
              <div className="mt-2 font-semibold">{s.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="bg-secondary/30" eyebrow="小程序截图" title="界面预览">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {["首页录入", "结果评分", "保养建议", "历史记录"].map((label) => (
            <div
              key={label}
              className="flex aspect-[9/16] items-center justify-center rounded-xl border border-dashed border-border bg-background text-xs text-muted-foreground"
            >
              小程序截图 · {label}（待替换）
            </div>
          ))}
        </div>
      </Section>

      <section className="border-t border-border/60 bg-gradient-to-br from-accent/10 via-background to-primary/5">
        <div className="container grid gap-10 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge variant="accent" className="mb-3">扫码体验</Badge>
            <h2 className="text-3xl font-semibold sm:text-4xl">微信扫一扫，立刻评估你的电池</h2>
            <p className="mt-4 text-muted-foreground">
              小程序当前处于开发阶段，正式上线后此处将放出可用的小程序码。
              如希望参与早期内测，可在下方留下联系方式。
            </p>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> 完全免费 · 不收取费用
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> 仅采集必要使用数据
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> 评估辅助 · 不替代专业检测
              </li>
            </ul>
          </div>
          <div className="flex justify-center">
            <Card className="w-full max-w-xs">
              <CardContent className="flex flex-col items-center p-8">
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 text-xs text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <QrCode className="h-10 w-10" />
                    小程序码占位 · 待替换
                  </div>
                </div>
                <div className="mt-4 text-sm font-medium">微信扫码体验</div>
                <div className="mt-1 text-xs text-muted-foreground">上线后可用</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
