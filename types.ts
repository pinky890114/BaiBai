export enum CommissionStatus {
  CONFIRMING = '確認中',
  QUEUE = '排單中',
  SKETCH = '草稿',
  LINEART = '線稿',
  COLOR = '上色',
  RENDER = '完稿',
  DONE = '結案'
}

export type ThemeMode = 'client' | 'admin';

export interface CommissionType {
  name: string;
  price: number | string;
}

export interface Commission {
  id: string;
  artistId: string;
  clientName: string;
  contactInfo?: string; // Added contact info
  title: string;
  description: string;
  type: string;
  price: number | string;
  status: CommissionStatus;
  dateAdded: string;
  lastUpdated: string;
  thumbnailUrl?: string;
}