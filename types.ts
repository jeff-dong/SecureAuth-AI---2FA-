export interface Account {
  id: string;
  issuer: string;
  accountName: string;
  secret: string; // Base32 encoded secret
  addedAt: number;
}

export interface TOTPResult {
  code: string;
  period: number;
  timeLeft: number;
}

export interface AiInsight {
  serviceName: string;
  content: string;
  isLoading: boolean;
}