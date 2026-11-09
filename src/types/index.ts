export interface CategoryLevel1 {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CategoryLevel2 {
  id: string;
  parentId: string;
  name: string;
  description?: string;
  sortOrder: number;
  viewType: 'prompt' | 'board';
}

export interface PromptTemplate {
  id: string;
  categoryLevel2Id: string;
  title: string;
  subtitle: string;
  agentName: string;
  agentDescription: string;
  content: string;
  tags: string[];
}

export type AppViewMode = 'dashboard' | 'prompts';

export type HelpBoardView = 'list' | 'detail' | 'create';

export interface HelpPost {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  attachments: HelpAttachment[];
  attachmentCount?: number;
}

export interface HelpAttachment {
  id: string;
  postId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export type EconomicProvider = 'ECOS' | 'EIA' | 'IMF';
export type EconomicFrequency = 'daily' | 'monthly' | 'other';
export type EconomicCategory =
  | 'inflation'
  | 'fx'
  | 'interest_rate'
  | 'energy'
  | 'nonferrous_metal'
  | 'steel_proxy';

export interface NormalizedIndicatorPoint {
  indicatorKey: string;
  provider: EconomicProvider;
  indicatorName: string;
  category: EconomicCategory;
  period: string;
  frequency: EconomicFrequency;
  value: number;
  unit: string;
  currency?: string;
  sourceTimestamp: string;
  fetchedAt: string;
  sourceReference: string;
  isEstimated: boolean;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface IndicatorSummary {
  indicatorKey: string;
  provider: EconomicProvider;
  displayNameKo: string;
  category: EconomicCategory;
  frequency: EconomicFrequency;
  unit: string;
  currency?: string;
  latest: NormalizedIndicatorPoint | null;
  changes: {
    m1: number | null;
    m3: number | null;
    m6: number | null;
    m12: number | null;
  };
  averages?: {
    d30: number | null;
    d90: number | null;
  };
  stale: boolean;
  status: 'ok' | 'missing' | 'error' | 'stale';
  statusMessage?: string;
  sourceLabel: string;
  series?: Array<{ period: string; value: number }>;
}

export interface SeriesPoint {
  period: string;
  value: number;
}

export interface BidCostItemInput {
  id: string;
  name: string;
  weightPct: number;
  indicatorKeys: string[];
}

export interface BidCostScenario {
  id: string;
  name: string;
  baseCost: number | null;
  baseFx: number | null;
  weights: BidCostItemInput[];
  riskWeights?: {
    commodity: number;
    fx: number;
    ppi: number;
    rate: number;
  };
}

export interface BidCostItemResult {
  id: string;
  name: string;
  weightPct: number;
  impactPct: number | null;
  contributionPct: number | null;
  drivers: string[];
  incomplete: boolean;
}

export interface BidCostResult {
  status: 'ok' | 'partial' | 'incomplete';
  totalChangePct: number | null;
  estimatedCost: number | null;
  riskLevel: RiskLevel | null;
  riskScore: number | null;
  weightSum: number;
  weightWarning: boolean;
  items: BidCostItemResult[];
  notes: string[];
}
