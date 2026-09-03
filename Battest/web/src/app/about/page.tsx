import type { Metadata } from "next";
import { Award, GraduationCap, Target, Users } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "关于我们 · 团队与项目",
  description: `${SITE.productName} 团队介绍、项目愿景、指导老师与里程碑。`,
};

const TEAM = [
  { name: "成员一", role: "项目负责人 / 算法", major: "信息与计算科学" },
  { name: "成员二", role: "产品设计 / B 端调研", major: "工商管理" },
  { name: "成员三", role: "前端开发", major: "软件工程" },
  { name: "成员四", role: "数据分析", major: "统计学" },
];

const MILESTONES = [
  { date: "2024 · Q4", title: "项目立项与方向调研", desc: "完成二手电动车市场与电池衰减研究的初步调研" },
  { date: "2025 · Q1", title: "技术路径选型", desc: "确定以纯软件估算为核心路径，搭建衰减基线模型" },
  { date: "2025 · Q2", title: "B 端原型开发", desc: "完成 B 端 Web 工具 MVP 原型，开始首批商家访谈" },
  { date: "2025 · Q3", title: "C 端小程序开发", desc: "微信小程序开发与早期用户测试" },
  { date: "2025 · Q4", title: "大创比赛答辩", desc: "代表学校参加大学生创新创业大赛" },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border/60 bg-secondary/30">
        <div className="container py-16 sm:py-24">
          <Badge className="mb-4">关于我们</Badge>
          <h1 className="max-w-3xl text-balance text-3xl font-bold sm:text-5xl">
            让二手电动车市场更透明、让每位车主更有底
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            我们是一支来自高校的学生团队，关注电动车电池这门「贵又难判断」的生意。
            我们希望用数据与软件，给商家与车主一份可信的判断依据。
          </p>
        </div>
      </section>

      <Section eyebrow="使命" title="把信息差变成可被理解的报告">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Target,
              title: "项目愿景",
              desc: "成为二手电动车交易中默认随车附带的电池健康背书。",
            },
            {
              icon: Users,
              title: "服务对象",
              desc: "二手电动车商家与个人车主，让两端在同一份报告上达成共识。",
            },
            {
              icon: GraduationCap,
              title: "项目属性",
              desc: "源自大学生创新创业大赛项目，长期目标是走向真实市场。",
            },
          ].map((v) => (
            <Card key={v.title}>
              <CardContent className="p-7">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="bg-secondary/30" eyebrow="团队成员" title="一支跨专业的学生团队">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m) => (
            <Card key={m.name}>
              <CardContent className="p-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                  {m.name.slice(-1)}
                </div>
                <div className="mt-4 font-semibold">{m.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{m.major}</div>
                <Badge variant="outline" className="mt-3">
                  {m.role}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          以上为团队信息占位，正式成员照片、姓名与分工将在比赛前替换。
        </p>
      </Section>

      <Section eyebrow="学校与指导" title="来自高校的支持">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-7">
              <div className="text-sm text-muted-foreground">所属院校</div>
              <h3 className="mt-1 text-xl font-semibold">XX 大学 · XX 学院</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                项目依托学院创新创业教育平台开展，依托学院实验室资源进行数据收集与模型验证。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-7">
              <div className="text-sm text-muted-foreground">指导老师</div>
              <h3 className="mt-1 text-xl font-semibold">XXX 教授</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                研究方向涵盖电池储能、数据驱动建模与产业应用，为本项目提供学术指导与方向把关。
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section className="bg-secondary/30" eyebrow="项目里程碑" title="一步一步把它做出来">
        <ol className="mx-auto max-w-3xl space-y-6 border-l-2 border-primary/30 pl-6">
          {MILESTONES.map((m) => (
            <li key={m.date} className="relative">
              <span className="absolute -left-[33px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-background" />
              <div className="text-xs font-medium uppercase tracking-wider text-accent">
                {m.date}
              </div>
              <div className="mt-1 text-lg font-semibold">{m.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="荣誉与认证" title="比赛获奖与成果">
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-10 text-center">
          <Award className="mx-auto h-10 w-10 text-accent" />
          <p className="mt-3 text-sm text-muted-foreground">
            正式获奖信息将在大创比赛结果公布后更新。
          </p>
        </div>
      </Section>
    </>
  );
}
