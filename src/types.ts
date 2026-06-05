export interface ExtractedPropertySpecs {
  propertyName: string;
  rent: string;
  managementFee: string;
  deposit: string;
  keyMoney: string;
  layout: string;
  size: string;
  stationWalkTime: string;
  address: string;
  constructionYear: string;
  keyFeatures: string[];
}

export interface ObiTextConfig {
  companyName: string;
  licenseNumber: string;
  address: string;
  phone: string;
  fax?: string;
  email: string;
  website: string;
  tagline: string;
  primaryColor: string;
  textColor: string;
  layoutType: 'standard' | 'centered' | 'modern';
  showBorders: boolean;
  contactPerson?: string;
  commission?: string;
}

export interface GenerationHistoryItem {
  id: string;
  timestamp: string;
  propertyName: string;
  aiText: string;
  specs: ExtractedPropertySpecs;
}
