import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  Coins,
  Download,
  FileBarChart,
  Layers,
  QrCode,
  ShieldCheck,
  Tag,
  Users,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BusinessApplyForm } from "@/components/forms/business-apply-form";

export const metadata: Metadata = {
  title: "B 端方案 · 二手电动车商家批量评估",
  description:
    "面向二手电动车商家的电池健康评估工具：批量录入、标准化报告、定价建议、扫码背书，帮助门店建立客户信任。",
};

export default function ForBusinessPage() {
  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-secondary/40 to-background">
        <div className="container py-16 sm:py-24">
          <Badge className="mb-4">
            <Tag className="mr-1 h-3.5 w-3.5" /> 面向二手电动车商家
          </Badge>
          <h1 className="max-w-3xl text-balance text-3xl font-bold sm:text-5xl">
            从「靠经验定价」到「凭报告说话」
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            一套面向二手电动车门店的电池健康评估工具，批量录入车辆数据，
            一键生成可打印的标准化报告，挂上车把扫码即看，让客户对价格信服。
          </p>
          <div className="mt-8">
            <a
              href="#apply"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-medium text-accent-foreground shadow-sm transition hover:bg-accent/90"
            >
              立即申请内测试用 <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <Section eyebrow="商家痛点" title="收车、定价、卖车，每一步都缺一份依据">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "收车定价靠经验",
              desc: "老板凭眼力定价，新店员上手慢；遇到不同电池类型、不同里程的车，判断容易出错。",
            },
            {
              title: "客户问起说不清",
              desc: "客户怀疑电池续航，老板只能口头保证，缺一份能拿得出手的电池健康报告。",
            },
            {
              title: "库存评估没工具",
              desc: "门店几十上百台车，每台车都靠人盯，没办法批量评估、统一管理。",
            },
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
        eyebrow="我们如何解决"
        title="一套工具，覆盖收车 → 定价 → 卖车全流程"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              icon: Layers,
              title: "批量录入与评估",
              desc: "支持单车录入或批量导入车辆使用数据，库存几十台车几分钟出结果。",
            },
            {
              icon: FileBarChart,
              title: "标准化电池健康报告",
              desc: "统一口径输出健康度评分、剩余寿命估算、保养建议，PDF / 网页两种形式。",
            },
            {
              icon: Coins,
              title: "二手参考价建议",
              desc: "根据车型基线与电池状态给出参考价区间，作为门店定价的辅助依据。",
            },
            {
              icon: QrCode,
              title: "扫码看报告 · 建立信任",
              desc: "每份报告生成专属二维码，挂在车把上买家扫码即看，价格更有说服力。",
            },
          ].map((f) => (
            <Card key={f.title}>
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="产品功能" title="一站式 Web 工作台">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="flex h-64 items-center justify-center border-b border-border bg-secondary/30 text-xs text-muted-foreground">
              评估录入界面截图占位 · 待替换
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-primary">
                <ClipboardCheck className="h-4 w-4" /> 评估录入
              </div>
              <h3 className="mt-2 text-lg font-semibold">录入车辆 · 5 分钟出报告</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                按表单填写车型、电池类型、购入时间、累计里程、充电习惯，系统自动生成评估结果。
              </p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <div className="flex h-64 items-center justify-center border-b border-border bg-secondary/30 text-xs text-muted-foreground">
              报告导出界面截图占位 · 待替换
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-primary">
                <Download className="h-4 w-4" /> 报告导出
              </div>
              <h3 className="mt-2 text-lg font-semibold">一键打印 · 扫码即看</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                PDF 一键导出、专属二维码自动生成，挂在车上让客户扫码查看完整报告。
              </p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <div className="flex h-64 items-center justify-center border-b border-border bg-secondary/30 text-xs text-muted-foreground">
              库存管理界面截图占位 · 待替换
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-primary">
                <BarChart3 className="h-4 w-4" /> 库存管理
              </div>
              <h3 className="mt-2 text-lg font-semibold">所有车辆状态一目了然</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                库存列表展示每台车的健康度、库存时长、建议售价，帮助门店把握周转节奏。
              </p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <div className="flex h-64 items-center justify-center border-b border-border bg-secondary/30 text-xs text-muted-foreground">
              报告样例 PDF 缩略图占位 · 待替换
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-primary">
                <FileBarChart className="h-4 w-4" /> 报告样例
              </div>
              <h3 className="mt-2 text-lg font-semibold">模拟报告示例可下载</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                想先看效果？我们会在试用开通后发送一份模拟评估报告样例供您参考。
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        className="bg-secondary/30"
        eyebrow="价格方案"
        title="内测期免费开放"
        description="产品处于内测阶段，向合作商家提供完整功能免费使用，正式定价方案将在产品发布时同步公布。"
      >
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <Card className="border-primary/30 bg-background">
            <CardContent className="p-7">
              <Badge className="mb-3">内测期</Badge>
              <div className="text-3xl font-bold">免费</div>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> 不限车辆数评估</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> 标准化报告 + PDF 导出</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> 扫码二维码</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> 一对一对接群</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-background">
            <CardContent className="p-7">
              <Badge variant="outline" className="mb-3">未来商业版（规划中）</Badge>
              <div className="text-3xl font-bold text-muted-foreground">待发布</div>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> 多门店账号体系</li>
                <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> 经营数据看板</li>
                <li className="flex items-center gap-2"><FileBarChart className="h-4 w-4 text-primary" /> 高级报告模板</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> 平台联动与背书</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </Section>

      <section id="apply" className="border-t border-border/60 scroll-mt-24">
        <div className="container py-20">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <Badge variant="accent" className="mb-3">申请内测</Badge>
              <h2 className="text-3xl font-semibold sm:text-4xl">填写联系方式 · 我们尽快回拨</h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                内测期免费开放，每周限量开通，工作人员会在 1-2 个工作日内联系您。
              </p>
            </div>
            <Card className="mt-10">
              <CardContent className="p-6 sm:p-8">
                <BusinessApplyForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
