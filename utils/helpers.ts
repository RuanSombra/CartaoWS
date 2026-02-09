
import { Expense, Card } from '../types';

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const getApiKey = (): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {}
  
  return '';
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

export const getMonthYearString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * LÓGICA DE OURO: Determina a "Fatura de Referência" de uma compra.
 * Se a compra foi feita DEPOIS do fechamento, ela pertence ao mês seguinte.
 */
export const getBillingStartMonth = (purchaseDateStr: string, card: Card): string => {
  const [pYear, pMonth, pDay] = purchaseDateStr.split('-').map(Number);
  // pMonth é 1-12
  
  // Cria data da compra
  const purchaseDate = new Date(pYear, pMonth - 1, pDay);
  
  // Define a data de corte para o MÊS DA COMPRA
  // Se comprar em Janeiro, olhamos o fechamento de Janeiro
  let targetMonthIndex = pMonth - 1; 
  let targetYear = pYear;

  // Se o dia da compra for MAIOR que o fechamento, ela pula para a próxima fatura
  if (pDay > card.closingDay) {
    targetMonthIndex++;
    if (targetMonthIndex > 11) {
      targetMonthIndex = 0;
      targetYear++;
    }
  }

  // Retorna YYYY-MM correspondente à fatura onde cairá a primeira parcela
  return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}`;
};

/**
 * Retorna as datas exatas do ciclo para um mês de visualização específico.
 * Ex: Visualizando Fev/2024 (com fechamento dia 10).
 * Intervalo: 11/Jan a 10/Fev.
 */
export const getCardDates = (card: Card, viewMonthStr: string) => {
  const [year, month] = viewMonthStr.split('-').map(Number);
  // month é 1-12. Date usa 0-11.
  
  // Data de Fechamento desta fatura (ex: 10/Fev)
  const closingDate = new Date(year, month - 1, card.closingDay);
  
  // Data de Vencimento desta fatura (ex: 20/Fev)
  // Nota: Se o vencimento for menor que o fechamento, geralmente é no mês seguinte, 
  // mas para simplificar assumimos que o vencimento segue o mês de referência ou o usuário configurou o "dia".
  // Ajuste fino: Se vencimento < fechamento, assumimos que é no mês seguinte.
  let dueMonthIndex = month - 1;
  let dueYear = year;
  if (card.dueDay < card.closingDay) {
      dueMonthIndex++;
      if(dueMonthIndex > 11) { dueMonthIndex = 0; dueYear++; }
  }
  const dueDate = new Date(dueYear, dueMonthIndex, card.dueDay);

  // Data de Início do Ciclo (Dia seguinte ao fechamento do mês anterior)
  // Ex: Fechamento Jan = 10/Jan. Início Fev = 11/Jan.
  let prevMonthIndex = month - 2;
  let prevYear = year;
  if (prevMonthIndex < 0) { prevMonthIndex = 11; prevYear--; }
  
  const prevClosingDate = new Date(prevYear, prevMonthIndex, card.closingDay);
  const purchaseStartDate = new Date(prevClosingDate);
  purchaseStartDate.setDate(purchaseStartDate.getDate() + 1);

  return {
    closingDate,
    dueDate,
    purchaseStartDate
  };
};

/**
 * Retorna o Status da Fatura baseado na data de hoje.
 */
export const getInvoiceStatus = (dates: { closingDate: Date, dueDate: Date }) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Zera horas para comparação correta
  const closing = new Date(dates.closingDate); closing.setHours(23,59,59,999);
  const due = new Date(dates.dueDate); due.setHours(23,59,59,999);

  // Se a data de início do ciclo é no futuro em relação a hoje
  // Ex: Hoje é Jan, olhando fatura de Março.
  // Lógica simples: Se hoje < closingDate E hoje < dataDeInicio (aproximado), é futuro.
  // Melhor: Se o mês/ano da fatura é maior que o atual.
  
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const viewMonthStart = new Date(dates.closingDate.getFullYear(), dates.closingDate.getMonth(), 1);

  if (viewMonthStart > currentMonthStart) {
      return { status: 'future', text: 'Fatura Futura', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' };
  }
  
  if (viewMonthStart < currentMonthStart) {
      // Fatura passada
      // Se hoje > vencimento, teoricamente está paga ou atrasada. O app não controla "Pago", então chamamos de Fechada/Passada.
      return { status: 'closed', text: 'Fatura Fechada', color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' };
  }

  // Estamos no mês corrente da fatura
  if (today > closing) {
    return { status: 'closed', text: 'Fatura Fechada', color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' };
  } else {
    return { status: 'open', text: 'Fatura Aberta', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' };
  }
};

/**
 * Verifica se um gasto tem parcela ativa na Fatura de Referência (targetMonthStr).
 */
export const getInstallmentInfo = (expense: Expense, card: Card, targetMonthStr: string) => {
  // 1. Descobre quando cai a primeira parcela DE ACORDO COM O FECHAMENTO
  const startMonthStr = expense.firstInstallmentMonth || getBillingStartMonth(expense.date, card);
  
  const [targetYear, targetMonth] = targetMonthStr.split('-').map(Number);
  const [startYear, startMonth] = startMonthStr.split('-').map(Number);

  // Diferença em meses entre a Fatura Atual e a Fatura da 1ª Parcela
  const monthsDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth);

  // Se monthsDiff for 0, é a 1ª parcela. Se for 1, é a 2ª.
  // Deve ser >= 0 e < numero de parcelas
  if (monthsDiff >= 0 && monthsDiff < expense.installments) {
    const installmentValue = expense.totalAmount / expense.installments;
    return {
      current: monthsDiff + 1,
      total: expense.installments,
      value: installmentValue
    };
  }

  return null;
};

export const calculatePersonShare = (person: string, expense: Expense, currentInstallmentValue: number): number => {
  const people = expense.people || [expense.personName || 'Eu'];
  
  if (!people.includes(person)) return 0;

  if (expense.customSplit && Object.keys(expense.customSplit).length > 0) {
    const personTotalShare = expense.customSplit[person] || 0;
    const percentage = personTotalShare / expense.totalAmount;
    return currentInstallmentValue * percentage;
  }

  return currentInstallmentValue / people.length;
};
