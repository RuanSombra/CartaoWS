
import React, { useMemo, useState, useEffect } from 'react';
import { Trash2, Edit2, Calendar, Layers, CreditCard, List, AlertTriangle } from 'lucide-react';
import { Expense, Card } from '../types';
import { formatCurrency, formatDate, getInstallmentInfo } from '../utils/helpers';

interface Props {
  expenses: Expense[];
  cards: Card[];
  currentMonth: string;
  selectedCardId: string;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onClearAll: () => void;
}

const ExpenseTable: React.FC<Props> = ({ expenses, cards, currentMonth, selectedCardId, onDelete, onEdit, onClearAll }) => {
  
  // Estado para confirmação visual (Substitui window.confirm que pode falhar)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);

  // Auto-reset dos estados de confirmação após 3 segundos (caso o usuário desista)
  useEffect(() => {
    if (deleteConfirmId) {
      const timer = setTimeout(() => setDeleteConfirmId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirmId]);

  useEffect(() => {
    if (clearAllConfirm) {
      const timer = setTimeout(() => setClearAllConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [clearAllConfirm]);

  // --- LÓGICA DE DADOS ---
  const allItems = useMemo(() => {
    return expenses
      .map(e => {
        const card = cards.find(c => c.id === e.cardId);
        if (!card || (selectedCardId !== 'All' && e.cardId !== selectedCardId)) return null;
        
        const info = getInstallmentInfo(e, card, currentMonth);
        if (!info) return null;
        
        return { expense: e, card, info };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null)
      .sort((a, b) => new Date(b.expense.date).getTime() - new Date(a.expense.date).getTime());
  }, [expenses, cards, currentMonth, selectedCardId]);

  const spotPurchases = useMemo(() => allItems.filter(i => i.expense.installments === 1), [allItems]);
  const installmentPurchases = useMemo(() => allItems.filter(i => i.expense.installments > 1), [allItems]);

  // --- HANDLERS SEGUROS (SEM WINDOW.CONFIRM) ---
  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Impede cliques indesejados no container
    if (deleteConfirmId === id) {
      onDelete(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
    }
  };

  const handleClearAllClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clearAllConfirm) {
      onClearAll();
      setClearAllConfirm(false);
    } else {
      setClearAllConfirm(true);
    }
  };

  // --- RENDERIZAÇÃO ---
  const renderList = (items: typeof allItems) => {
    const grouped = items.reduce((groups, item) => {
      if (!groups[item.expense.date]) groups[item.expense.date] = [];
      groups[item.expense.date].push(item);
      return groups;
    }, {} as Record<string, typeof items>);

    return Object.entries(grouped).map(([date, dayItems]: [string, typeof items]) => {
      return (
        <div key={date} className="mb-6">
          <div className="flex items-center gap-4 mb-3">
             <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
             <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
               {formatDate(date)}
             </span>
             <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {dayItems.map(({ expense, card, info }, idx) => {
              const people = expense.people && expense.people.length > 0 ? expense.people : ['Eu'];
              const isConfirmingDelete = deleteConfirmId === expense.id;

              return (
                <div 
                  key={expense.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 ${idx !== dayItems.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                >
                  {/* Info Esquerda */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm" style={{ backgroundColor: card.color }}>
                       {card.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{expense.description}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-bold">{expense.category}</span>
                        {expense.installments > 1 && (
                          <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                            {info.current}/{info.total}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 truncate max-w-[150px]">
                            {people.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info Direita + Botões */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 pl-12 sm:pl-0">
                    <div className="text-right whitespace-nowrap">
                      <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(info.value)}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
                        className="p-2.5 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-lg transition-colors active:scale-95"
                        title="Editar"
                      >
                        <Edit2 size={18}/>
                      </button>
                      
                      {/* BOTÃO DE DELETE COM ESTADO DE CONFIRMAÇÃO LOCAL */}
                      <button 
                        type="button"
                        onClick={(e) => handleDeleteClick(e, expense.id)}
                        className={`p-2.5 rounded-lg transition-all active:scale-95 flex items-center gap-1 font-bold text-xs ${
                          isConfirmingDelete 
                            ? 'bg-rose-600 text-white w-24 justify-center shadow-md shadow-rose-200' 
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700'
                        }`}
                        title={isConfirmingDelete ? "Clique para confirmar" : "Excluir"}
                      >
                        {isConfirmingDelete ? (
                          <>Confirmar?</>
                        ) : (
                          <Trash2 size={18}/>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="pb-32">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 bg-slate-50 dark:bg-slate-950 pt-2 pb-2">
         <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
           <List className="text-primary-600" /> Extrato
         </h2>
         
         {/* BOTÃO LIMPAR TUDO COM CONFIRMAÇÃO DUPLA */}
         {expenses.length > 0 && (
            <button 
              type="button"
              onClick={handleClearAllClick}
              className={`flex items-center gap-2 px-4 py-2 border font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 ${
                clearAllConfirm 
                  ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                  : 'bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
              }`}
            >
              {clearAllConfirm ? (
                <>
                   <AlertTriangle size={16} /> CONFIRMAR LIMPEZA?
                </>
              ) : (
                <>
                   <Trash2 size={16} /> Limpar Tudo
                </>
              )}
            </button>
         )}
      </div>

      {allItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
            <Calendar size={32} className="text-slate-300" />
          </div>
          <p className="font-bold text-slate-400">Nenhum lançamento neste mês</p>
        </div>
      )}

      {spotPurchases.length > 0 && (
        <section className="mb-8 animate-in slide-in-from-bottom-2 duration-300">
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
            <CreditCard size={16}/> Compras à Vista ({spotPurchases.length})
          </h3>
          {renderList(spotPurchases)}
        </section>
      )}

      {installmentPurchases.length > 0 && (
        <section className="animate-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
            <Layers size={16}/> Compras Parceladas ({installmentPurchases.length})
          </h3>
          {renderList(installmentPurchases)}
        </section>
      )}
    </div>
  );
};

export default ExpenseTable;
