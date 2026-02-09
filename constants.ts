
import { Category, Card } from './types';

export const CATEGORIES: Category[] = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Contas',
  'Saúde',
  'Educação',
  'Compras',
  'Taxas e Impostos',
  'Outros'
];

export const CATEGORY_COLORS: Record<Category, string> = {
  'Alimentação': '#059669', // Emerald 600
  'Transporte': '#6366f1', // Indigo 500
  'Lazer': '#f43f5e',      // Rose 500
  'Contas': '#475569',     // Slate 600
  'Saúde': '#06b6d4',      // Cyan 500
  'Educação': '#8b5cf6',   // Violet 500
  'Compras': '#f59e0b',    // Amber 500
  'Taxas e Impostos': '#94a3b8', // Slate 400
  'Outros': '#71717a'      // Zinc 500
};

export const MONTHS_BR = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const INITIAL_CARDS: Card[] = [
  { id: 'bb', name: 'Banco do Brasil', closingDay: 1, dueDay: 10, color: '#EAB308', limit: 5000 },
  { id: 'mp', name: 'Mercado Pago', closingDay: 5, dueDay: 15, color: '#0EA5E9', limit: 2000 },
  { id: 'pp', name: 'PicPay', closingDay: 10, dueDay: 20, color: '#10B981', limit: 3000 },
  { id: 'it', name: 'Inter', closingDay: 15, dueDay: 25, color: '#F97316', limit: 4000 }
];
