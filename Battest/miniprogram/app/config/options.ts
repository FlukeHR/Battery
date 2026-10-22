import type {
  AssessmentDraft,
  AssessmentScenario,
  SelectOption,
  SummaryItem,
} from "../types/prediction";

export const DEFAULT_DRAFT: AssessmentDraft = {
  scenario: "",
  battery_type: "LFP",
  voltage: 48,
  capacity_ah: 20,
  battery_age_months: 18,
  charge_start_soc: 20,
  charge_end_soc: 90,
  weekly_charge_times: 4,
  driving_style: "normal",
  load_condition: "single",
  long_term_storage: "occasionally",
  city: "Chengdu",
  parking_environment: "indoor",
};

export const SCENARIOS: ReadonlyArray<{
  value: AssessmentScenario;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    value: "daily",
    title: "日常体检",
    description: "了解当前衰减水平与复检时机",
    icon: "◉",
  },
  {
    value: "range_issue",
    title: "续航异常",
    description: "排查充电、环境与负载影响",
    icon: "↘",
  },
  {
    value: "resale",
    title: "二手交易",
    description: "生成一份现场辅助评估摘要",
    icon: "◇",
  },
];

export const BATTERY_TYPES: ReadonlyArray<SelectOption> = [
  { value: "LFP", label: "磷酸铁锂" },
  { value: "NCM", label: "三元锂" },
  { value: "Lead-acid", label: "铅酸" },
  { value: "Unknown", label: "不确定" },
];

export const VOLTAGES: ReadonlyArray<SelectOption<number>> = [48, 60, 72].map(
  (value) => ({ value, label: `${value}V` }),
);

export const CAPACITIES: ReadonlyArray<SelectOption<number>> = [12, 20, 24, 32, 40].map(
  (value) => ({ value, label: `${value}Ah` }),
);

export const CHARGE_START_LEVELS: ReadonlyArray<SelectOption<number>> = [
  10, 20, 30, 40, 50,
].map((value) => ({ value, label: `${value}%` }));

export const CHARGE_END_LEVELS: ReadonlyArray<SelectOption<number>> = [80, 90, 100].map(
  (value) => ({ value, label: `${value}%` }),
);

export const WEEKLY_CHARGE_TIMES: ReadonlyArray<SelectOption<number>> = [
  1, 2, 3, 4, 5, 6, 7, 10,
].map((value) => ({ value, label: value === 10 ? "10 次以上" : `${value} 次` }));

export const DRIVING_STYLES: ReadonlyArray<SelectOption> = [
  { value: "gentle", label: "温和" },
  { value: "normal", label: "正常" },
  { value: "aggressive", label: "激烈驾驶" },
];

export const LOAD_CONDITIONS: ReadonlyArray<SelectOption> = [
  { value: "single", label: "一人" },
  { value: "two_people", label: "两人" },
  { value: "frequent_heavy_load", label: "经常重载" },
];

export const STORAGE_FREQUENCIES: ReadonlyArray<SelectOption> = [
  { value: "rarely", label: "很少" },
  { value: "occasionally", label: "偶尔" },
  { value: "often", label: "经常" },
];

const CITY_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["Beijing", "北京"], ["Shanghai", "上海"], ["Guangzhou", "广州"],
  ["Shenzhen", "深圳"], ["Chengdu", "成都"], ["Chongqing", "重庆"],
  ["Wuhan", "武汉"], ["Xian", "西安"], ["Nanjing", "南京"],
  ["Hangzhou", "杭州"], ["Changsha", "长沙"], ["Zhengzhou", "郑州"],
  ["Tianjin", "天津"], ["Harbin", "哈尔滨"], ["Shenyang", "沈阳"],
  ["Changchun", "长春"], ["Jinan", "济南"], ["Qingdao", "青岛"],
  ["Hefei", "合肥"], ["Fuzhou", "福州"], ["Xiamen", "厦门"],
  ["Nanning", "南宁"], ["Kunming", "昆明"], ["Guiyang", "贵阳"],
  ["Haikou", "海口"], ["Urumqi", "乌鲁木齐"], ["Lanzhou", "兰州"],
  ["Yinchuan", "银川"], ["Xining", "西宁"], ["Lhasa", "拉萨"],
];

export const CITIES: ReadonlyArray<SelectOption> = CITY_PAIRS.map(
  ([value, label]) => ({ value, label }),
);

export const PARKING_ENVIRONMENTS: ReadonlyArray<SelectOption> = [
  { value: "indoor", label: "室内" },
  { value: "underground", label: "地下车库" },
  { value: "outdoor_shade", label: "室外遮阴" },
  { value: "outdoor_sunlight", label: "室外暴晒" },
];

export function optionLabel(
  options: ReadonlyArray<SelectOption>,
  value: string | number,
): string {
  return options.find((option) => option.value === value)?.label ?? String(value);
}

export function scenarioLabel(value: AssessmentScenario): string {
  return SCENARIOS.find((scenario) => scenario.value === value)?.title ?? "日常体检";
}

export function buildDraftSummary(draft: AssessmentDraft): SummaryItem[] {
  return [
    { label: "评估场景", value: draft.scenario ? scenarioLabel(draft.scenario) : "未选择" },
    { label: "电池类型", value: optionLabel(BATTERY_TYPES, draft.battery_type) },
    { label: "电池规格", value: `${draft.voltage}V · ${draft.capacity_ah}Ah` },
    { label: "使用时间", value: `${draft.battery_age_months} 个月` },
    { label: "充电区间", value: `${draft.charge_start_soc}% → ${draft.charge_end_soc}%` },
    { label: "充电频率", value: `每周 ${draft.weekly_charge_times} 次` },
    { label: "驾驶与负载", value: `${optionLabel(DRIVING_STYLES, draft.driving_style)} · ${optionLabel(LOAD_CONDITIONS, draft.load_condition)}` },
    { label: "存放与停放", value: `${optionLabel(STORAGE_FREQUENCIES, draft.long_term_storage)}长期存放 · ${optionLabel(PARKING_ENVIRONMENTS, draft.parking_environment)}` },
    { label: "所在城市", value: optionLabel(CITIES, draft.city) },
  ];
}
