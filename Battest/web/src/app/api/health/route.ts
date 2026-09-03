export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    engine: "rules-v1",
    model_loaded: false,
  });
}
