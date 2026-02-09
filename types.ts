
export type Category = 'Alimentação' | 'Transporte' | 'Lazer' | 'Contas' | 'Saúde' | 'Educação' | 'Compras' | 'Taxas e Impostos' | 'Outros';

export interface Card {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  color: string;
  limit: number;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: Category;
  totalAmount: number;
  cardId: string;
  people: string[];
  installments: number;
  firstInstallmentMonth?: string;
  customSplit?: Record<string, number>; 
  personName?: string; 
}

export interface UserSettings {
  salary: number;
  savingsGoalPercentage: number;
  frequentPeople: string[];
}

// --- NOVOS TIPOS PARA FÉRIAS ---

export interface VacationExpense {
  id: string;
  description: string;
  category: 'Hospedagem' | 'Passagem' | 'Passeio' | 'Alimentação' | 'Seguro' | 'Outros';
  totalAmount: number;
  paidAmount: number;
  date: string;
}

export interface VacationPlan {
  id: string;
  destination: string;
  country: string;
  peopleCount: number;
  startDate: string;
  expenses: VacationExpense[];
}
