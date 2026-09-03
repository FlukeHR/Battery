import { z } from "zod";

import { predictFromUserInput } from "@/lib/battery-prediction";

const predictionSchema = z
  .object({
    battery_type: z.string().default("LFP"),
    voltage: z.coerce.number().positive().max(120).default(48),
    capacity_ah: z.coerce.number().positive().max(120).default(20),
    battery_age_months: z.coerce.number().min(0).max(240).default(18),
    charge_start_soc: z.coerce.number().min(0).max(100).default(20),
    charge_end_soc: z.coerce.number().min(0).max(100).default(90),
    weekly_charge_times: z.coerce.number().min(0).max(14).default(4),
    driving_style: z.string().default("normal"),
    load_condition: z.string().default("single"),
    long_term_storage: z.string().default("occasionally"),
    city: z.string().default("Chengdu"),
    parking_environment: z.string().default("indoor"),
  })
  .refine((input) => input.charge_end_soc > input.charge_start_soc, {
    message: "充电结束电量必须高于开始充电时的电量。",
    path: ["charge_end_soc"],
  });

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return Response.json({ detail: "请求体必须是有效的 JSON。" }, { status: 400 });
  }

  const parsed = predictionSchema.safeParse(requestBody);
  if (!parsed.success) {
    return Response.json(
      {
        detail: "输入数据无效。",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 }
    );
  }

  return Response.json(predictFromUserInput(parsed.data));
}
