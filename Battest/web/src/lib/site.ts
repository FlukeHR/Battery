/**
 * 全站文案常量。产品名称当前为占位「电检通」，确定后统一替换。
 * TODO: 替换 PRODUCT_NAME 为最终产品名
 */
export const SITE = {
  productName: "电检通",
  tagline: "让每一辆二手电动车都有一份电池健康报告",
  description:
    "面向二手电动车商家与个人车主的电池健康度评估工具：标准化报告、批量评估、低成本筛查，辅助收车定价与日常管理。",
  url: "https://example.com",
  contactEmail: "contact@example.com",
};

export const NAV_ITEMS = [
  { href: "/assessment", label: "在线评估" },
  { href: "/for-business", label: "B 端方案" },
  { href: "/for-users", label: "C 端方案" },
  { href: "/technology", label: "技术与方法" },
  { href: "/about", label: "关于我们" },
  { href: "/contact", label: "联系合作" },
] as const;
