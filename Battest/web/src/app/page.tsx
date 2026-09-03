import Link from "next/link";
import {
  ArrowRight,
  BatteryCharging,
  ClipboardCheck,
  FileBarChart,
  Gauge,
  LineChart,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UserCircle2,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/site";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-secondary/40 via-background to-background">
        <div className="absolute inset-0 bg-grid-soft opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="container relative grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-2">
          <div className="animate-fade-up">
            <Badge variant="default" className="mb-5">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              基于使用数据的电池健康评估工具
            </Badge>
            <h1 className="text-balance text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              让每一辆二手电动车
              <br />
              都有一份
              <span className="text-primary"> 电池健康报告</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {SITE.productName} 面向二手电动车商家与个人车主，结合公开电池衰减研究与用户使用数据，
              输出标准化的电池健康评估报告，辅助 <strong className="text-foreground">收车定价</strong> 与
              <strong className="text-foreground">日常管理</strong>。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/assessment"
                className={cn(buttonVariants({ variant: "accent", size: "lg" }))}
              >
                立即在线评估
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/for-business#apply"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                申请 B 端试用
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" /> 评估辅助 · 非物理检测
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LineChart className="h-4 w-4 text-primary" /> 衰减曲线 + 使用数据修正
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileBarChart className="h-4 w-4 text-primary" /> 标准化报告输出
              </span>
            </div>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-primary/5 blur-2xl" />
            <Card className="overflow-hidden border-primary/15 shadow-xl shadow-primary/5">
              <div className="flex items-center justify-between border-b border-border/60 bg-primary px-5 py-3 text-primary-foreground">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileBarChart className="h-4 w-4" />
                  电池健康评估报告（示例）
                </div>
                <Badge className="bg-accent text-accent-foreground">DEMO</Badge>
              </div>
              <CardContent className="space-y-5 p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">综合健康度（SOH 估算）</div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-5xl font-bold text-primary">82</span>
                      <span className="text-base text-muted-foreground">/ 100</span>
                    </div>
                    <div className="mt-1 text-xs text-accent">良好 · 建议保留</div>
                  </div>
                  <Gauge className="h-12 w-12 text-primary/40" />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { k: "购入年限", v: "2.3 年" },
                    { k: "累计里程", v: "8,420 km" },
                    { k: "估算剩余寿命", v: "约 1.5 年" },
                    { k: "二手参考价", v: "¥ 1,180" },
                  ].map((i) => (
                    <div key={i.k} className="rounded-md bg-secondary/60 p-3">
                      <div className="text-xs text-muted-foreground">{i.k}</div>
                      <div className="mt-0.5 font-semibold text-foreground">{i.v}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border border-dashed border-border bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                  数据与价格仅为示例，实际报告以系统输出为准。本工具为评估辅助，不替代专业检测。
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Section
        eyebrow="行业痛点"
        title="电池是电动车里最贵也最易衰减的部件"
        description="商家不敢收、用户不敢买、二手市场长期信息不对称。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-secondary/30">
            <CardContent className="p-7">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Store className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">二手商家：收车定价靠经验</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>· 老板凭眼力定价，新店员上手慢、出错率高</li>
                <li>· 客户不信任，缺一份能拿得出手的报告</li>
                <li>· 库存几十上百台，没有批量评估方案</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-secondary/30">
            <CardContent className="p-7">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
                <UserCircle2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">个人车主：买卖与保养都心里没底</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>· 不知道电池还能用多久、什么时候该换</li>
                <li>· 维修店说什么就是什么，话语权不对等</li>
                <li>· 二手买卖容易被信息差坑</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        className="bg-secondary/30"
        eyebrow="产品概览"
        title="一套工具，服务双端"
        description="B 端 Web 工具支持批量评估与报告导出，C 端微信小程序面向个人用户提供轻量评估与建议。"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-7">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                <Store className="h-4 w-4" /> B 端 · 二手商家 Web 工具
              </div>
              <h3 className="text-2xl font-semibold">批量评估 · 标准化报告 · 库存管理</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                录入车辆使用数据，一键生成可打印的电池健康报告与二手参考价区间，挂在车把上扫码即看，
                让客户对价格信服。
              </p>
              <div className="mt-6 flex h-44 items-center justify-center rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground">
                B 端工具截图占位 · 待替换
              </div>
              <Link
                href="/for-business"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                了解 B 端方案 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-7">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-accent">
                <Smartphone className="h-4 w-4" /> C 端 · 微信小程序
              </div>
              <h3 className="text-2xl font-semibold">输入数据 · 获得评分 · 保养建议</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                几步输入即可获得电池健康评分、剩余寿命估算与保养建议，帮助个人车主理解自己的电池状态。
              </p>
              <div className="mt-6 flex h-44 flex-col items-center justify-center rounded-lg border border-primary/15 bg-gradient-to-br from-primary/10 to-background text-primary">
                <Gauge className="h-10 w-10" />
                <span className="mt-3 text-sm font-medium">在线评估工具已开放</span>
                <span className="mt-1 text-xs text-muted-foreground">填写使用习惯，立即生成结果</span>
              </div>
              <Link
                href="/assessment"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                开始在线评估 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        eyebrow="为什么选我们"
        title="不是又一个维修工具，而是一份可信的判断依据"
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ClipboardCheck, title: "标准化报告", desc: "统一评估口径与展示形式，客户、商家、平台都能看懂。" },
            { icon: BatteryCharging, title: "批量评估", desc: "支持库存导入与批量计算，几十台车几分钟出结果。" },
            { icon: Gauge, title: "纯软件低成本", desc: "无需购置物理检测设备，门店即可上手。" },
            { icon: ShieldCheck, title: "双端联动", desc: "商家报告生成二维码，买家扫码即看，闭环建立信任。" },
          ].map((f) => (
            <Card key={f.title} className="border-border/70 transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="bg-secondary/30" eyebrow="使用流程" title="四步完成一次评估">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { step: "01", title: "录入车辆信息", desc: "车型、电池类型、购入时间、累计里程" },
            { step: "02", title: "补充使用数据", desc: "充电习惯、平均日里程、近期续航变化" },
            { step: "03", title: "生成评估报告", desc: "健康度评分、剩余寿命、参考价区间" },
            { step: "04", title: "扫码 / 导出", desc: "门店打印或买家扫码查看报告" },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-border bg-background p-6">
              <div className="text-2xl font-bold text-accent">{s.step}</div>
              <div className="mt-2 font-semibold">{s.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="合作动态"
        title="正在与多家本地商家进行内测合作"
        description="以下为内测期合作意向商家示意，正式案例将在产品上线后陆续披露。"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { name: "示例商家 A", city: "杭州 · 拱墅区", stock: "约 60 台/月" },
            { name: "示例商家 B", city: "南京 · 江宁区", stock: "约 35 台/月" },
            { name: "示例商家 C", city: "合肥 · 蜀山区", stock: "约 80 台/月" },
          ].map((c) => (
            <Card key={c.name} className="bg-secondary/30">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">{c.city}</div>
                <div className="mt-1 text-lg font-semibold">{c.name}</div>
                <div className="mt-2 text-sm text-muted-foreground">月均流转：{c.stock}</div>
                <Badge variant="outline" className="mt-4">内测合作意向 · 示例</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="container flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
          <div>
            <h3 className="text-2xl font-semibold sm:text-3xl">准备好让每一台车都有一份报告？</h3>
            <p className="mt-2 text-primary-foreground/80">内测期免费开放给二手电动车商家，名额有限。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/for-business#apply"
              className={cn(buttonVariants({ variant: "accent", size: "lg" }))}
            >
              申请 B 端试用 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              )}
            >
              联系我们
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
