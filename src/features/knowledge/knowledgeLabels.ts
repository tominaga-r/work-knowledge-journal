import { KnowledgeSource, KnowledgeType } from "./knowledgeSchema";

export const knowledgeTypeLabels: Record<KnowledgeType, string> = {
  PRODUCT_KNOWLEDGE: "商品知識",
  CUSTOMER_SERVICE_PHRASE: "接客フレーズ",
  BUSINESS_PROCEDURE: "業務手順",
  FAQ: "FAQ",
  CAUTION: "注意事項",
  IMPROVEMENT: "改善メモ",
  OTHER: "その他",
};

export const knowledgeSourceLabels: Record<KnowledgeSource, string> = {
  training: "研修",
  experience: "実体験",
  template: "テンプレート",
  imported: "インポート",
  other: "その他",
};
