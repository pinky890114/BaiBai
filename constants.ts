import { Commission, CommissionStatus, CommissionType } from './types';

export const STATUS_STEPS = [
  CommissionStatus.QUEUE,
  CommissionStatus.SKETCH,
  CommissionStatus.LINEART,
  CommissionStatus.COLOR,
  CommissionStatus.RENDER,
  CommissionStatus.DONE
];

export const DEFAULT_COMMISSION_TYPES: CommissionType[] = [
  { name: '塗鴉大頭', price: 350 },
  { name: '單人半身塗鴉', price: 600 },
  { name: '雙人半身塗鴉', price: 1000 },
  { name: '塗鴉全身', price: 800 },
  { name: '精緻大頭', price: 850 },
  { name: '雙人滿版', price: 3600 },
  { name: '禮包（包天）', price: 5500 },
  { name: '黑白漫畫', price: 1500 },
  { name: '四格漫畫', price: 1200 },
  { name: '彩色漫畫', price: 2500 },
  { name: '插畫', price: '(自帶價)' },
  { name: '立繪', price: 2000 }
];

export const MOCK_COMMISSIONS: Commission[] = [
  {
    id: 'c-101',
    artistId: '百百嵂',
    clientName: 'StarGazer',
    title: 'OC 星空主題立繪',
    description: '希望背景有銀河的感覺，角色穿著深藍色的洋裝，手持星形法杖。',
    type: '立繪',
    price: 3500,
    status: CommissionStatus.COLOR,
    dateAdded: '2024-03-01',
    lastUpdated: '2024-03-15',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534531173927-aed12895f219?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'c-102',
    artistId: '百百嵂',
    clientName: 'CoffeeLover',
    title: 'Twitch 表情包',
    description: '1. 喝咖啡 2. 驚訝 3. 睡著。風格要Q軟一點。',
    type: '塗鴉大頭',
    price: 1500,
    status: CommissionStatus.QUEUE,
    dateAdded: '2024-03-10',
    lastUpdated: '2024-03-10'
  },
  {
    id: 'c-103',
    artistId: '百百嵂',
    clientName: 'Knight42',
    title: '奇幻角色插畫',
    description: '需要繪製戰鬥場景，角色是拿著大劍的騎士。',
    type: '插畫',
    price: '(自帶價)',
    status: CommissionStatus.SKETCH,
    dateAdded: '2024-03-12',
    lastUpdated: '2024-03-14'
  },
  {
    id: 'c-104',
    artistId: '百百嵂',
    clientName: 'SakuraFan',
    title: '頭貼委託',
    description: '櫻花樹下的少女，色調粉嫩。',
    type: '精緻大頭',
    price: 1200,
    status: CommissionStatus.DONE,
    dateAdded: '2024-02-20',
    lastUpdated: '2024-02-28',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?q=80&w=400&auto=format&fit=crop'
  }
];