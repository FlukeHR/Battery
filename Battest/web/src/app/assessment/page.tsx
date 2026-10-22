import type { Metadata } from "next";
import { Brain, Database, ShieldCheck, Sparkles } from "lucide-react";

import { BatteryAssessment } from "@/components/forms/battery-assessment";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "在线电池健康评估",
  description:
    "填写电池类型、使用年限、充电与骑行习惯，在线估算电动车电池 SOH、剩余寿命并获得保养建议。",
};

export default function AssessmentPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="absolute inset-0 bg-grid-soft opacity-35 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="container relative py-14 sm:py-20">
          <Badge className="mb-4">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> CALB · HUST · MATR 研究数据
          </Badge>
          <h1 className="max-w-3xl text-balance text-3xl font-bold sm:text-5xl">
            在线评估你的<span className="text-primary">电池健康状态</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            无需检测设备，填写日常使用数据，即可获得健康度、剩余寿命、衰减因素和保养建议。
          </p>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-4 w-4 text-primary" /> 288,912 条实验循环数据
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-primary" /> 可解释的使用习惯修正
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> 评估辅助 · 非物理检测
            </span>
          </div>
        </div>
      </section>

      <section className="bg-secondary/20 py-10 sm:py-14">
        <div className="container">
          <BatteryAssessment />
        </div>
      </section>
    </>
  );
}
