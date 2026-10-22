import { chemistryModels } from "@/lib/xgboost";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    engine: "xgboost-v1",
    model_loaded: Object.values(chemistryModels).every(Boolean),
    models: Object.fromEntries(Object.entries(chemistryModels).map(([key, model]) => [key, {
      model_loaded: Boolean(model),
      training_datasets: model?.training_datasets ?? [],
    }])),
  });
}
