import type { Metadata } from "next";
import {
  AlertTriangle,
  Brain,
  Database,
  GitBranch,
  LineChart,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "技术与方法 · 我们如何估算电池健康度",
  description:
    "基于 CALB 循环退化研究与用户使用特征映射的在线电池健康评估方法。",
};

export default function TechnologyPage() {
  return (
    <>
      <section className="border-b border-border/60 bg-secondary/30">
        <div className="container py-16 sm:py-24">
          <Badge className="mb-4">
            <Brain className="mr-1 h-3.5 w-3.5" /> 技术与方法
          </Badge>
          <h1 className="max-w-3xl text-balance text-3xl font-bold sm:text-5xl">
            一份诚实的「我们如何评估」说明
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            在线版本采用可解释的规则估算，将 CALB 实验室循环退化研究与用户使用习惯映射结合，
            无需额外预测服务即可输出可复现的评估结果；XGBoost 保留为离线研究基线。
          </p>
        </div>
      </section>

      <Section eyebrow="评估方法" title="电池衰减曲线 + 使用数据修正">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardContent className="p-7">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <LineChart className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">CALB 循环退化基线</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                从 27 个电芯文件提取 2,791 条有效循环记录，并按电芯分组划分训练集与测试集，降低同源数据泄漏。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-7">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Wrench className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">使用习惯物理映射</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                将充电区间、频率、温度、负载与驾驶方式映射为 DOD、等效循环、C-rate 与压力系数。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-7">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Brain className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">可解释的在线评分</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                按日历老化、循环损耗、温度、驾驶和负载压力估算 SOH，并同步给出影响因素与使用建议。
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section className="bg-secondary/30" eyebrow="数据来源" title="实验室循环数据 + 使用场景映射">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-7">
              <div className="mb-4 inline-flex items-center gap-2 text-primary">
                <Database className="h-5 w-5" />
                <span className="text-sm font-medium">CALB 实验数据</span>
              </div>
              <h3 className="text-lg font-semibold">真实充放电循环特征</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                使用容量、充放电时间、温度、电压、电流、DOD 与循环位置等特征训练 XGBoost 基线。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-7">
              <div className="mb-4 inline-flex items-center gap-2 text-primary">
                <Database className="h-5 w-5" />
                <span className="text-sm font-medium">自有数据积累</span>
              </div>
              <h3 className="text-lg font-semibold">B 端商家与 C 端用户数据反馈</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                内测期商家与用户输入的使用数据与实际续航反馈，将用于持续校准模型。所有数据遵守隐私规范。
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section eyebrow="模型架构" title="在线评估与离线研究各司其职">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: GitBranch,
              tag: "当前在线",
              title: "规则估算模型",
              desc: "直接在网站 API 内依据日历老化、等效循环与使用压力完成评估，部署简单且结果可解释。",
            },
            {
              icon: GitBranch,
              tag: "离线基线",
              title: "XGBoost 实验模型",
              desc: "按电芯分组测试的基线 R² 为 0.866、MAE 为 0.0059，用于研究比较与后续在线模型校准。",
            },
            {
              icon: GitBranch,
              tag: "未来",
              title: "Transformer 序列模型",
              desc: "在序列数据与真实车辆反馈充足后，进一步探索更精细的时序 SOH 与剩余寿命预测。",
            },
          ].map((s) => (
            <Card key={s.title}>
              <CardContent className="p-6">
                <Badge variant="outline" className="mb-3">{s.tag}</Badge>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="bg-secondary/30" eyebrow="准确度边界" title="我们也希望你诚实地理解它">
        <Card className="mx-auto max-w-3xl border-accent/30 bg-background">
          <CardContent className="space-y-4 p-7">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm leading-relaxed text-foreground">
                本工具是一种<strong>评估辅助</strong>，并非物理检测仪。
                我们不会使用「精准检测」「权威认证」一类的表述。
              </p>
            </div>
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm leading-relaxed text-foreground">
                评估结果受输入数据准确性影响，<strong>不能替代</strong>专业检测设备或厂商质保流程。
              </p>
            </div>
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm leading-relaxed text-foreground">
                我们持续披露模型迭代版本号与近似准确度区间，
                以便商家与用户合理判断报告的参考价值。
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>
    </>
  );
}
