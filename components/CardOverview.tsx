import React from 'react';
import { Card, Expense } from '../types';
import { formatCurrency, getInstallmentInfo } from '../utils/helpers';
import { CreditCard, Lock, LockOpen } from 'lucide-react';

interface Props {
  cards: Card[];
  expenses: Expense[];
  currentMonth: string;
  selectedCardId: string;
  onSelectCard: (id: string) => void;
}

const CardOverview: React.FC<Props> = ({ cards, expenses, currentMonth, selectedCardId, onSelectCard }) => {
  const today = new Date();
  const todayDay = today.getDate();

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
        <p className="text-slate-400 text-sm font-bold">Nenhum cartão cadastrado</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 hide-scrollbar snap-x snap-mandatory px-1">
      {cards.map(card => {
        // Correção de Tipo: Realizamos o map e reduce diretamente checando nulidade, 
        // evitando conflitos de predicados de tipo do TypeScript.
        const cardTotal = expenses
          .filter(e => e.cardId === card.id)
          .map(e => getInstallmentInfo(e, card, currentMonth))
          .reduce((sum, info) => {
            if (!info) return sum;
            return sum + info.value;
          }, 0);

        const isSelected = selectedCardId === card.id;
        const available = card.limit - cardTotal;
        const percentUsed = card.limit > 0 ? (cardTotal / card.limit) * 100 : 0;

        // Lógica de Status da Fatura
        const isInvoiceClosed = todayDay > card.closingDay;

        return (
          <button
            key={card.id}
            onClick={() => onSelectCard(isSelected ? 'All' : card.id)}
            className={`snap-center shrink-0 w-80 h-44 rounded-2xl p-5 relative transition-all text-left flex flex-col justify-between group ${
              isSelected 
                ? 'shadow-xl scale-[1.02] ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-slate-950' 
                : 'shadow-lg hover:-translate-y-1 hover:shadow-xl opacity-90 hover:opacity-100'
            }`}
            style={{ 
              backgroundColor: card.color,
              color: '#FFF',
              boxShadow: isSelected ? `0 10px 25px -5px ${card.color}80` : `0 4px 6px -1px ${card.color}40`
            }}
          >
            {/* Header Clean */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                 <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                   <CreditCard size={16} className="text-white" />
                 </div>
                 <span className="font-bold text-sm tracking-wide text-white">{card.name}</span>
              </div>
              
              {/* Badge de Status */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-md border border-white/20 ${
                  isInvoiceClosed 
                    ? 'bg-rose-500/30 text-white' 
                    : 'bg-emerald-500/30 text-white'
              }`}>
                {isInvoiceClosed ? <Lock size={10} /> : <LockOpen size={10} />}
                <span className="text-[10px] font-bold uppercase">
                  {isInvoiceClosed ? 'Fechada' : 'Aberta'}
                </span>
              </div>
            </div>

            {/* Valor Principal */}
            <div>
              <p className="text-[10px] font-medium text-white/80 uppercase mb-0.5">Fatura Atual</p>
              <div className="flex items-baseline gap-1">
                 <span className="text-sm font-medium text-white/80">R$</span>
                 <p className="text-3xl font-bold tracking-tight">
                    {formatCurrency(cardTotal).replace('R$', '').trim()}
                 </p>
              </div>
            </div>
            
            {/* Footer / Barra de Progresso */}
            <div>
              <div className="flex justify-between text-[10px] font-medium text-white/90 mb-1.5">
                <span>Limite Utilizado</span>
                <span>{percentUsed.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-white/70">Disp: {formatCurrency(available)}</span>
                  <span className="text-[10px] text-white/70">Vence dia {card.dueDay}</span>
              </div>
            </div>
          </button>
        );
      })}
      
      {/* Espaçador final */}
      <div className="w-2 shrink-0"></div>
    </div>
  );
};

export default CardOverview;
