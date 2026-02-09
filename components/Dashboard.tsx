
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { TrendingUp, ShieldCheck, User, CalendarClock, CheckCircle2, Lock, LockOpen } from 'lucide-react';
import { Expense, Card, UserSettings, Category } from '../types';
import { CATEGORY_COLORS, CATEGORIES } from '../constants';
import { formatCurrency, getInstallmentInfo, getCardDates, calculatePersonShare, getInvoiceStatus } from '../utils/helpers';

interface Props {
  expenses: Expense[];
  cards: Card[];
  currentMonth: string;
  selectedCardId: string;
  settings: UserSettings;
}

const Dashboard: React.FC<Props> = ({ expenses, cards, currentMonth, selectedCardId, settings }) => {
  
  // Filtragem e Cálculo
  const activeData = React.useMemo(() => {
    return expenses
      .map(e => {
        const card = cards.find(c => c.id === e.cardId);
        if (!card || (selectedCardId !== 'All' && e.cardId !== selectedCardId)) return null;
        
        // A mágica acontece aqui: getInstallmentInfo usa a lógica de fechamento
        const info = getInstallmentInfo(e, card, currentMonth);
        if (!info) return null;
        
        return { expense: e, info };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);
  }, [expenses, cards, currentMonth, selectedCardId]);

  const totalInvoice = activeData.reduce((acc, item) => acc + item.info.value, 0);

  // Dados por Pessoa
  const personData = React.useMemo(() => {
    const stats: Record<string, number> = {};
    activeData.forEach(item => {
      let people = item.expense.people;
      if (!people || people.length === 0) people = [item.expense.personName || 'Eu'];
      
      people.forEach(person => {
        const share = calculatePersonShare(person, item.expense, item.info.value);
        stats[person] = (stats[person] || 0) + share;
      });
    });
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [activeData]);
  
  // Dados por Categoria
  const categoryData = activeData.reduce((acc, item) => {
    let cat = item.expense.category;
    if (!CATEGORIES.includes(cat)) {
        const match = CATEGORIES.find(c => c.toLowerCase() === cat.toLowerCase());
        cat = match || 'Outros';
    }
    acc[cat] = (acc[cat] || 0) + item.info.value;
    return acc;
  }, {} as Record<string, number>);

  const chartData = (Object.entries(categoryData) as [string, number][])
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const myShare = personData.find(p => p.name === 'Eu')?.value || 0;

  // Informações de Ciclo do Cartão (Melhorado)
  const cardCycleInfo = React.useMemo(() => {
    // Se "Visão Geral", não mostramos ciclo específico pois mistura datas
    if (selectedCardId === 'All' || !cards.length) return null;
    
    const card = cards.find(c => c.id === selectedCardId);
    if (!card) return null;

    const dates = getCardDates(card, currentMonth);
    const statusInfo = getInvoiceStatus(dates);

    return { card, dates, ...statusInfo };
  }, [selectedCardId, cards, currentMonth]);

  return (
    <div className="space-y-6">
      
      {/* STATUS DA FATURA (Só aparece se um cartão específico estiver selecionado) */}
      {cardCycleInfo ? (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className={`p-3 rounded-2xl ${cardCycleInfo.color}`}>
              {cardCycleInfo.status === 'open' ? <LockOpen size={24} /> : <Lock size={24} />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Status da Fatura</p>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {cardCycleInfo.text}
                {cardCycleInfo.status === 'closed' && <CheckCircle2 size={16} className="text-rose-500"/>}
              </h3>
            </div>
          </div>

          <div className="flex flex-col w-full md:w-auto flex-1 px-4">
             <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-slate-500">Período de Compras</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                  {cardCycleInfo.dates.purchaseStartDate.getDate()}/{cardCycleInfo.dates.purchaseStartDate.getMonth() + 1} até {cardCycleInfo.dates.closingDate.getDate()}/{cardCycleInfo.dates.closingDate.getMonth() + 1}
                </span>
             </div>
             
             {/* Barra Visual do Tempo */}
             <div className="relative w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`absolute top-0 bottom-0 left-0 w-full ${cardCycleInfo.status === 'open' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
             </div>
             
             <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-slate-400 font-bold">Fecha dia {cardCycleInfo.card.closingDay}</span>
                <span className="text-[10px] text-indigo-500 font-bold">Vence dia {cardCycleInfo.card.dueDay}</span>
             </div>
          </div>
        </div>
      ) : (
        // Visão Geral (Sem info de ciclo específico)
        <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
           <p className="text-xs text-slate-500 font-bold">Selecione um cartão específico acima para ver detalhes de fechamento e vencimento.</p>
        </div>
      )}

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total desta Fatura</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{formatCurrency(totalInvoice)}</p>
          <p className="text-xs text-slate-400 mt-2">Valor acumulado para pagamento no vencimento</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Renda Comprometida</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {settings.salary > 0 ? ((myShare / settings.salary) * 100).toFixed(1) : 0}%
            </p>
            <span className="text-xs text-slate-400 mb-1.5 font-bold">de {formatCurrency(settings.salary)}</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Considerando apenas sua parte ({formatCurrency(myShare)})</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
           <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl">
              <User size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Divisão da Fatura</span>
          </div>
          <div className="flex-1 max-h-[100px] overflow-y-auto custom-scrollbar space-y-2">
             {personData.map(p => (
               <div key={p.name} className="flex justify-between items-center text-sm">
                 <span className="font-bold text-slate-600 dark:text-slate-300">{p.name}</span>
                 <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(p.value)}</span>
               </div>
             ))}
             {personData.length === 0 && <p className="text-slate-400 text-sm">Sem dados</p>}
          </div>
        </div>
      </div>

      {/* Gráfico e Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Por Categoria</h3>
           <div className="h-64 relative w-full min-w-0">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                     {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as Category] || CATEGORY_COLORS['Outros']} stroke="none" />
                     ))}
                   </Pie>
                   <Tooltip 
                      formatter={(val: any) => formatCurrency(Number(val))}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                   />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
                <div className="w-full h-full flex items-center justify-center rounded-full border-4 border-slate-100 dark:border-slate-800 border-dashed opacity-50 scale-75">
                   <div className="w-full h-full rounded-full border-4 border-slate-200 dark:border-slate-700 border-dashed opacity-50"></div>
                </div>
             )}
             
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-700 dark:text-slate-200">{chartData.length}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Categorias</span>
             </div>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Top Gastos</h3>
           <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
             {chartData.map((item) => (
               <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-8 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.name as Category] || CATEGORY_COLORS['Outros'] }}></div>
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                 </div>
                 <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.value)}</span>
               </div>
             ))}
             {chartData.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">Nenhum dado para exibir.</p>}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
