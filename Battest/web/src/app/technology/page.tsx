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
    "结合 CALB 三元锂、HUST 与 MATR 磷酸铁锂实验模型和使用习惯的电池健康评估方法。",
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
            在线版本根据电池类型选择对应 XGBoost 模型，结合使用习惯进行估算。
            三元锂使用 CALB 数据，磷酸铁锂使用 HUST 与 MATR 数据；暂无对应模型的类型使用规则估算。
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
              <h3 className="text-lg font-semibold">按电池类型匹配实验模型</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                从 273 个电芯提取 288,912 条有效循环记录，并在每个数据来源内部按完整电芯划分训练集与测试集。
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
                同类型 XGBoost 预测与使用习惯规则按 75% 和 25% 融合，并给出衰减因素与使用建议。
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
                <span className="text-sm font-medium">CALB · HUST · MATR 实验数据</span>
              </div>
              <h3 className="text-lg font-semibold">真实充放电循环特征</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                使用充放电时间、温度、电压、电流、充放电深度与循环位置等特征训练模型，容量用于计算 SOH 标签。HUST 缺失温度时使用训练集默认值。
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
              title: "同类型模型与习惯规则融合",
              desc: "官网和小程序共用预测 API，使用同类型实验模型；铅酸和不确定类型明确标注为规则估算。",
            },
            {
              icon: GitBranch,
              tag: "离线基线",
              title: "XGBoost 实验模型",
              desc: "实验测试集上，三元锂 R² 为 0.866、MAE 为 0.0059；磷酸铁锂 R² 为 0.948、MAE 为 0.0094。这些指标不代表实际用车预测准确性。",
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
