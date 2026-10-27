"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import {
  AlertCircle,
  BatteryCharging,
  CheckCircle2,
  Gauge,
  Lightbulb,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { residualBrands, assemblySources } from "@/lib/residual-options";
import { cn } from "@/lib/utils";
import type { PredictionResult, RiskLevel } from "@/lib/battery-prediction";

type HealthStatus = "checking" | "model" | "fallback" | "offline";

const fieldClassName =
  "flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const batteryTypes = [
  ["LFP", "磷酸铁锂"],
  ["NCM", "三元"],
  ["Lead-acid", "铅酸"],
  ["Unknown", "不确定"],
] as const;

const cities = [
  ["Beijing", "北京"],
  ["Shanghai", "上海"],
  ["Guangzhou", "广州"],
  ["Shenzhen", "深圳"],
  ["Chengdu", "成都"],
  ["Chongqing", "重庆"],
  ["Wuhan", "武汉"],
  ["Xian", "西安"],
  ["Nanjing", "南京"],
  ["Hangzhou", "杭州"],
  ["Changsha", "长沙"],
  ["Zhengzhou", "郑州"],
  ["Tianjin", "天津"],
  ["Harbin", "哈尔滨"],
  ["Shenyang", "沈阳"],
  ["Changchun", "长春"],
  ["Jinan", "济南"],
  ["Qingdao", "青岛"],
  ["Hefei", "合肥"],
  ["Fuzhou", "福州"],
  ["Xiamen", "厦门"],
  ["Nanning", "南宁"],
  ["Kunming", "昆明"],
  ["Guiyang", "贵阳"],
  ["Haikou", "海口"],
  ["Urumqi", "乌鲁木齐"],
  ["Lanzhou", "兰州"],
  ["Yinchuan", "银川"],
  ["Xining", "西宁"],
  ["Lhasa", "拉萨"],
] as const;

const riskPresentation: Record<
  RiskLevel,
  { label: string; chip: string; bar: string }
> = {
  low: {
    label: "低风险",
    chip: "border-primary/20 bg-primary/10 text-primary",
    bar: "bg-gradient-to-r from-emerald-500 to-primary",
  },
  medium: {
    label: "中风险",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    bar: "bg-gradient-to-r from-amber-400 to-orange-500",
  },
  high: {
    label: "高风险",
    chip: "border-red-200 bg-red-50 text-red-700",
    bar: "bg-gradient-to-r from-red-400 to-red-600",
  },
};

const statusPresentation: Record<HealthStatus, { label: string; dot: string }> = {
  checking: { label: "模型检查中", dot: "bg-muted-foreground animate-pulse" },
  model: { label: "XGBoost 已加载", dot: "bg-emerald-500" },
  fallback: { label: "规则模型在线", dot: "bg-amber-500" },
  offline: { label: "API 未连接", dot: "bg-red-500" },
};

export function BatteryAssessment() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("checking");
  const [modelAvailability, setModelAvailability] = useState<Record<string, boolean>>({});
  const [batteryType, setBatteryType] = useState("LFP");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Health check failed");
        const health = (await response.json()) as {
          model_loaded?: boolean;
          models?: Record<string, { model_loaded: boolean }>;
        };
        setModelAvailability(Object.fromEntries(Object.entries(health.models ?? {}).map(
          ([key, value]) => [key, value.model_loaded]
        )));
        setHealthStatus(health.model_loaded ? "model" : "fallback");
      } catch (healthError) {
        if ((healthError as Error).name !== "AbortError") {
          setHealthStatus("offline");
        }
      }
    }

    void checkHealth();
    return () => controller.abort();
  }, []);

  async function submitPrediction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const chargeStart = Number(data.get("charge_start_soc"));
    const chargeEnd = Number(data.get("charge_end_soc"));

    if (chargeEnd <= chargeStart) {
      setError("充电结束电量必须高于开始充电时的电量。");
      return;
    }

    const optionalNumber = (name: string) => {
      const value = data.get(name);
      return value === null || value === "" ? null : Number(value);
    };
    const payload = {
      brand: String(data.get("brand")),
      assembly_source: String(data.get("assembly_source")),
      new_battery_price: optionalNumber("new_battery_price"),
      full_charge_range_km: optionalNumber("full_charge_range_km"),
      charge_cycles: optionalNumber("charge_cycles"),
      original_charger: String(data.get("original_charger")),
      battery_type: String(data.get("battery_type")),
      voltage: Number(data.get("voltage")),
      capacity_ah: Number(data.get("capacity_ah")),
      battery_age_months: Number(data.get("battery_age_months")),
      charge_start_soc: chargeStart,
      charge_end_soc: chargeEnd,
      weekly_charge_times: Number(data.get("weekly_charge_times")),
      driving_style: String(data.get("driving_style")),
      load_condition: String(data.get("load_condition")),
      long_term_storage: String(data.get("long_term_storage")),
      city: String(data.get("city")),
      parking_environment: String(data.get("parking_environment")),
    };

    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseBody = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof responseBody.detail === "string"
            ? responseBody.detail
            : "预测请求失败，请检查输入后重试。"
        );
      }

      setResult(responseBody as PredictionResult);
      setModelAvailability((previous) => ({
        ...previous, [responseBody.battery_chemistry]: responseBody.model_used,
      }));
      setHealthStatus(responseBody.model_used ? "model" : "fallback");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "预测请求失败，请稍后重试。"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const modelStatus = statusPresentation[
    healthStatus === "checking" || healthStatus === "offline" ? healthStatus
      : modelAvailability[batteryType.toLowerCase()] ? "model" : "fallback"
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <Card className="overflow-hidden border-primary/15 shadow-lg shadow-primary/5">
        <CardHeader className="border-b border-border/60 bg-secondary/30">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <CardTitle className="text-xl">填写电池与使用情况</CardTitle>
              <CardDescription className="mt-1.5">
                请按日常真实习惯填写，输入越准确，评估越有参考价值。
              </CardDescription>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80">
              <span className={cn("h-2 w-2 rounded-full", modelStatus.dot)} />
              {modelStatus.label}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-7">
          <form onSubmit={submitPrediction} onChange={() => setResult(null)} className="space-y-8">
            <FormSection number="01" title="电池基础信息">
              <AssessmentField id="brand" label="品牌">
                <select id="brand" name="brand" defaultValue="" required className={fieldClassName}>
                  <option value="" disabled>请选择品牌 / 电芯标签</option>
                  {residualBrands.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </AssessmentField>
              <AssessmentField id="battery_type" label="电池种类">
                <select id="battery_type" name="battery_type" value={batteryType}
                  disabled={isSubmitting} className={fieldClassName}
                  onChange={(event) => {
                    setBatteryType(event.target.value);
                    setResult(null);

                  }}>
                  {batteryTypes.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {batteryType === "LFP" ? "参考 HUST、MATR 磷酸铁锂实验数据。"
                    : batteryType === "NCM" ? "参考 CALB 三元锂实验数据。"
                    : "暂无对应实验模型，使用习惯规则估算。"}
                </p>
              </AssessmentField>
              <AssessmentField id="battery_age_months" label="已使用月份">
                <input
                  id="battery_age_months"
                  name="battery_age_months"
                  type="number"
                  min="0"
                  max="240"
                  step="1"
                  defaultValue="18"
                  required
                  className={fieldClassName}
                />
              </AssessmentField>
              <AssessmentField id="voltage" label="额定电压">
                <select id="voltage" name="voltage" defaultValue="48" className={fieldClassName}>
                  {[48, 60, 72].map((value) => (
                    <option key={value} value={value}>{value}V</option>
                  ))}
                </select>
              </AssessmentField>
              <AssessmentField id="capacity_ah" label="标称容量">
                <select id="capacity_ah" name="capacity_ah" defaultValue="20" className={fieldClassName}>
                  {[12, 20, 24, 30, 32, 40, 50, 60, 70, 80, 90, 100, 120].map((value) => (
                    <option key={value} value={value}>{value}Ah</option>
                  ))}
                </select>
              </AssessmentField>
            </FormSection>

            <FormSection number="02" title="残值估价信息">
              <AssessmentField id="assembly_source" label="组装 / 成组来源">
                <select id="assembly_source" name="assembly_source" defaultValue="" required className={fieldClassName}>
                  <option value="" disabled>请选择来源</option>
                  {assemblySources.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </AssessmentField>
              <AssessmentField id="original_charger" label="是否带原装充电器">
                <select id="original_charger" name="original_charger" defaultValue="未知" className={fieldClassName}>
                  {["未知", "是", "否"].map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </AssessmentField>
              <AssessmentField id="new_battery_price" label="新电参考价（元，可选）">
                <input id="new_battery_price" name="new_battery_price" type="number" min="0.01" max="1000000" step="any" placeholder="填写后显示残值率" className={fieldClassName} />
              </AssessmentField>
              <AssessmentField id="full_charge_range_km" label="当前满电续航（km，可选）">
                <input id="full_charge_range_km" name="full_charge_range_km" type="number" min="0" max="10000" step="any" placeholder="填写实测续航" className={fieldClassName} />
              </AssessmentField>
              <AssessmentField id="charge_cycles" label="累计充电循环次数（可选）">
                <input id="charge_cycles" name="charge_cycles" type="number" min="0" max="100000" step="any" placeholder="不清楚可留空" className={fieldClassName} />
              </AssessmentField>
              <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">残值预测支持三元、磷酸铁锂。可选数值留空时按训练数据中位数处理。</p>
            </FormSection>

            <FormSection number="03" title="充电习惯">
              <AssessmentField id="charge_start_soc" label="通常从多少电开始充">
                <select id="charge_start_soc" name="charge_start_soc" defaultValue="20" className={fieldClassName}>
                  {[10, 20, 30, 40, 50].map((value) => (
                    <option key={value} value={value}>{value}%</option>
                  ))}
                </select>
              </AssessmentField>
              <AssessmentField id="charge_end_soc" label="通常充到多少电">
                <select id="charge_end_soc" name="charge_end_soc" defaultValue="90" className={fieldClassName}>
                  {[80, 90, 100].map((value) => (
                    <option key={value} value={value}>{value}%</option>
                  ))}
                </select>
              </AssessmentField>
              <AssessmentField id="weekly_charge_times" label="每周充电次数">
                <select id="weekly_charge_times" name="weekly_charge_times" defaultValue="4" className={fieldClassName}>
                  {[1, 2, 3, 4, 5, 6, 7, 10].map((value) => (
                    <option key={value} value={value}>
                      {value === 10 ? "10 次以上" : String(value) + " 次"}
                    </option>
                  ))}
                </select>
              </AssessmentField>
            </FormSection>

            <FormSection number="04" title="使用与环境">
              <AssessmentField id="driving_style" label="驾驶习惯">
                <select id="driving_style" name="driving_style" defaultValue="normal" className={fieldClassName}>
                  <option value="gentle">温和</option>
                  <option value="normal">正常</option>
                  <option value="aggressive">激烈驾驶</option>
                </select>
              </AssessmentField>
              <AssessmentField id="load_condition" label="车辆负载">
                <select id="load_condition" name="load_condition" defaultValue="single" className={fieldClassName}>
                  <option value="single">一人</option>
                  <option value="two_people">两人</option>
                  <option value="frequent_heavy_load">经常重载</option>
                </select>
              </AssessmentField>
              <AssessmentField id="long_term_storage" label="长期存放频率">
                <select id="long_term_storage" name="long_term_storage" defaultValue="occasionally" className={fieldClassName}>
                  <option value="rarely">很少</option>
                  <option value="occasionally">偶尔</option>
                  <option value="often">经常</option>
                </select>
              </AssessmentField>
              <AssessmentField id="city" label="所在城市">
                <select id="city" name="city" defaultValue="Chengdu" className={fieldClassName}>
                  {cities.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </AssessmentField>
              <AssessmentField id="parking_environment" label="主要停放环境">
                <select id="parking_environment" name="parking_environment" defaultValue="indoor" className={fieldClassName}>
                  <option value="indoor">室内</option>
                  <option value="underground">地下车库</option>
                  <option value="outdoor_shade">室外遮阴</option>
                  <option value="outdoor_sunlight">室外暴晒</option>
                </select>
              </AssessmentField>
            </FormSection>

            {error ? (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
              {isSubmitting ? "正在生成评估…" : "生成健康与残值评估"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="lg:sticky lg:top-24">
        <AssessmentResult result={result} />
      </div>
    </div>
  );
}

function FormSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-accent">{number}</span>
        {title}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function AssessmentField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function AssessmentResult({ result }: { result: PredictionResult | null }) {
  if (!result) {
    return (
      <Card className="overflow-hidden border-primary/15 shadow-lg shadow-primary/5">
        <div className="bg-primary px-6 py-4 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BatteryCharging className="h-4 w-4" /> 电池健康评估报告
          </div>
        </div>
        <CardContent className="flex min-h-[520px] flex-col items-center justify-center p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Gauge className="h-9 w-9" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">等待生成评估</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            完成左侧信息后，系统会给出 SOH、预计剩余寿命、残值预测、主要衰减因素与针对性建议。
          </p>
          <div className="mt-8 grid w-full max-w-sm grid-cols-3 gap-2 text-xs text-muted-foreground">
            {["健康度", "剩余寿命", "保养建议"].map((label) => (
              <div key={label} className="rounded-md border border-dashed border-border bg-secondary/30 py-3">
                {label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const risk = riskPresentation[result.risk_level];
  const percentage = Math.max(0, Math.min(100, result.soh_percent));

  return (
    <Card aria-live="polite" className="overflow-hidden border-primary/15 shadow-lg shadow-primary/5">
      <div className="flex items-center justify-between gap-3 bg-primary px-6 py-4 text-primary-foreground">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BatteryCharging className="h-4 w-4" /> 电池健康评估报告
        </div>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs">
          {result.model_used ? "XGBoost" : "规则估算"}
        </span>
      </div>

      <CardContent className="space-y-6 p-6 sm:p-7">
        <div className="text-center">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">当前 SOH</div>
          <div className="mt-2 text-6xl font-bold tracking-tight text-primary">
            {result.soh_percent}<span className="text-2xl">%</span>
          </div>
          <div className={cn("mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold", risk.chip)}>
            {risk.label}
          </div>
        </div>

        <div className="flex items-center gap-1.5" aria-label={"电池健康度 " + result.soh_percent + "%"}>
          <div className="relative h-14 flex-1 overflow-hidden rounded-md border-[3px] border-foreground/80 bg-secondary">
            <div
              className={cn("absolute inset-y-0 left-0 transition-[width] duration-500", risk.bar)}
              style={{ width: String(percentage) + "%" }}
            />
          </div>
          <div className="h-7 w-2 rounded-r-sm bg-foreground/80" />
        </div>

        <section aria-label="残值预测" className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h3 className="text-sm font-semibold text-primary">残值预测</h3>
          {result.residual_value?.available ? <>
            <p className="mt-2 text-3xl font-bold tracking-tight text-primary">¥ {result.residual_value.estimated_price_yuan?.toLocaleString("zh-CN")}</p>
            <p className="mt-1 text-xs text-muted-foreground">估算当前残值（挂牌价口径）</p>
            <p className="mt-3 text-sm">{result.residual_value.brand} · {result.residual_value.battery_type}</p>
            {result.residual_value.residual_rate_percent !== null ? <p className="mt-1 text-sm">残值率 {result.residual_value.residual_rate_percent}%（相对新电参考价）</p> : null}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{result.residual_value.note}</p>
            <p className="mt-2 text-xs text-muted-foreground">历史交叉验证平均绝对误差约 {result.residual_value.validation_mae_yuan} 元，非个体误差保证。</p>
            {result.residual_value.warnings.map(warning => <p key={warning} className="mt-2 text-xs text-amber-800">{warning}</p>)}
          </> : <p className="mt-2 text-sm text-muted-foreground">{result.residual_value?.note ?? "补充品牌与残值信息后重新评估。"}</p>}
        </section>

        <dl className="grid grid-cols-2 gap-3">
          <Metric label="预计剩余" value={String(result.estimated_remaining_months) + " 个月"} />
          <Metric label="约合年数" value={String(result.estimated_remaining_years) + " 年"} />
          <Metric
            label="单次 DOD"
            value={String(Math.round((result.mapped_features.single_charge_dod || 0) * 100)) + "%"}
          />
          <Metric
            label="年等效循环"
            value={String(Math.round(result.mapped_features.annual_equivalent_cycles || 0)) + " 次"}
          />
        </dl>

        <div className="rounded-md bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
          {result.model_used ? `训练数据：${result.training_datasets.join(" + ")}。` : "使用习惯规则估算。"}
          {result.prediction_note}
        </div>

        <InsightList
          icon={<AlertCircle className="h-4 w-4 text-accent" />}
          title="主要衰减因素"
          items={result.main_degradation_factors}
        />
        <InsightList
          icon={<Lightbulb className="h-4 w-4 text-primary" />}
          title="使用建议"
          items={result.suggestions}
          positive
        />

        <div className="flex items-start gap-2 rounded-md bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          本结果用于使用管理与初步筛查，不替代专业检测设备、维修判断或厂商质保流程。
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function InsightList({
  icon,
  title,
  items,
  positive = false,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  positive?: boolean;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
      </h3>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            {positive ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
