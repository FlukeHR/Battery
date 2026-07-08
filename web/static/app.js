const form = document.querySelector("#predictForm");
const modelStatus = document.querySelector("#modelStatus");
const batteryFill = document.querySelector("#batteryFill");
const sohValue = document.querySelector("#sohValue");
const riskChip = document.querySelector("#riskChip");
const rulValue = document.querySelector("#rulValue");
const dodValue = document.querySelector("#dodValue");
const cyclesValue = document.querySelector("#cyclesValue");
const modelUsed = document.querySelector("#modelUsed");
const factorsList = document.querySelector("#factorsList");
const suggestionsList = document.querySelector("#suggestionsList");

const numericFields = new Set([
  "voltage",
  "capacity_ah",
  "battery_age_months",
  "charge_start_soc",
  "charge_end_soc",
  "weekly_charge_times",
]);

function formPayload() {
  const data = new FormData(form);
  const payload = {};
  for (const [key, value] of data.entries()) {
    payload[key] = numericFields.has(key) ? Number(value) : value;
  }
  return payload;
}

function setList(node, items) {
  node.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    node.appendChild(li);
  }
}

function setRisk(level) {
  riskChip.className = "risk-chip";
  riskChip.classList.add(`risk-${level}`);
  const labels = { low: "低风险", medium: "中风险", high: "高风险" };
  riskChip.textContent = labels[level] || level;
}

function renderResult(result) {
  sohValue.textContent = `${result.soh_percent}%`;
  const fillWidth = Math.max(0, Math.min(100, result.soh_percent));
  batteryFill.style.width = `${fillWidth}%`;
  batteryFill.style.background =
    result.risk_level === "high"
      ? "linear-gradient(90deg, #df6b61, #b8403a)"
      : result.risk_level === "medium"
        ? "linear-gradient(90deg, #dfa853, #bd6a1f)"
        : "linear-gradient(90deg, #30b785, #0f8f7a)";
  setRisk(result.risk_level);
  rulValue.textContent = `${result.estimated_remaining_months} 个月`;
  dodValue.textContent = `${Math.round(result.mapped_features.single_charge_dod * 100)}%`;
  cyclesValue.textContent = `${result.mapped_features.annual_equivalent_cycles}`;
  modelUsed.textContent = result.model_used ? "XGBoost" : "规则兜底";
  setList(factorsList, result.main_degradation_factors);
  setList(suggestionsList, result.suggestions);
}

async function refreshHealth() {
  try {
    const response = await fetch("/health");
    const health = await response.json();
    modelStatus.textContent = health.model_loaded ? "XGBoost 已加载" : "规则兜底";
  } catch (error) {
    modelStatus.textContent = "API 未连接";
  }
}

async function submitPrediction(event) {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
    button.textContent = "预测中";
  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formPayload()),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    renderResult(await response.json());
  } catch (error) {
    setList(factorsList, ["预测请求失败"]);
    setList(suggestionsList, ["确认 FastAPI 服务正在运行后重试。"]);
  } finally {
    button.disabled = false;
    button.textContent = "开始预测";
  }
}

form.addEventListener("submit", submitPrediction);
refreshHealth();
form.requestSubmit();
