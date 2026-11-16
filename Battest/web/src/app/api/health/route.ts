import { chemistryModels } from "@/lib/xgboost";
import residualModel from "@/lib/models/residual-ridge.json";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    residual_model: {
      loaded: true,
      engine: "residual-ridge-v1",
      training_samples: residualModel.samples,
      supported_chemistries: ["ncm", "lfp"],
    },
    engine: Object.values(chemistryModels).some((model) => model?.model_version === 2) ? "xgboost-v2" : "xgboost-v1",
    model_loaded: Object.values(chemistryModels).every(Boolean),
    models: Object.fromEntries(Object.entries(chemistryModels).map(([key, model]) => [key, {
      model_loaded: Boolean(model),
      training_datasets: model?.training_datasets ?? [],
      model_version: model?.model_version ?? 1,
      remaining_life_model_loaded: Boolean(model?.lifetime),
      remaining_life_training_datasets: model?.lifetime_training_datasets ?? [],
    }])),
  });
}
