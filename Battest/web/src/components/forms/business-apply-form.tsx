"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  shopName: z.string().min(2, "请填写店铺名称（至少 2 个字）"),
  contactName: z.string().min(2, "请填写联系人姓名"),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请填写有效的手机号"),
  city: z.string().min(2, "请填写所在城市"),
  stockScale: z.string().min(1, "请选择库存规模"),
  note: z.string().max(300, "备注不超过 300 字").optional(),
});

type FormValues = z.infer<typeof schema>;

const STOCK_OPTIONS = [
  "10 台以内",
  "10-50 台",
  "50-200 台",
  "200 台以上",
];

export function BusinessApplyForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { stockScale: "" },
  });

  async function onSubmit(values: FormValues) {
    // TODO: 接入真实提交端点（如 Resend / 自建 API）
    console.log("[B端申请] 表单提交：", values);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    reset();
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-4 text-xl font-semibold">申请已收到</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          我们会在 1-2 个工作日内通过您留下的电话联系您，安排内测开通。
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => setSubmitted(false)}
        >
          再次提交
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="店铺名称" error={errors.shopName?.message} required>
          <Input
            placeholder="例如：阿强二手电动车"
            {...register("shopName")}
            aria-invalid={!!errors.shopName}
          />
        </Field>
        <Field label="联系人" error={errors.contactName?.message} required>
          <Input
            placeholder="您的姓名"
            {...register("contactName")}
            aria-invalid={!!errors.contactName}
          />
        </Field>
        <Field label="手机号" error={errors.phone?.message} required>
          <Input
            placeholder="11 位手机号"
            inputMode="numeric"
            {...register("phone")}
            aria-invalid={!!errors.phone}
          />
        </Field>
        <Field label="所在城市" error={errors.city?.message} required>
          <Input
            placeholder="例如：杭州"
            {...register("city")}
            aria-invalid={!!errors.city}
          />
        </Field>
      </div>

      <Field label="库存规模" error={errors.stockScale?.message} required>
        <div className="flex flex-wrap gap-2">
          {STOCK_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="relative inline-flex cursor-pointer items-center rounded-md border border-input bg-white px-3 py-2 text-sm transition-colors hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary"
            >
              <input
                type="radio"
                value={opt}
                className="peer sr-only"
                {...register("stockScale")}
              />
              {opt}
            </label>
          ))}
        </div>
      </Field>

      <Field label="想了解或希望解决的问题（选填）" error={errors.note?.message}>
        <Textarea
          rows={4}
          placeholder="例如：每月收车 50 台，希望批量评估、出报告，方便挂在车上让客户扫码看…"
          {...register("note")}
        />
      </Field>

      <p className="text-xs text-muted-foreground">
        提交即表示您同意我们使用以上信息与您联系内测合作事宜，我们不会用于其他用途。
      </p>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full sm:w-auto"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "提交中…" : "提交申请"}
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
