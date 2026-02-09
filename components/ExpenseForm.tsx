
import React, { useState, useEffect } from 'react';
import { X, Tag, Calendar, Repeat, CreditCard, Save, AlertCircle, Users, Calculator, DollarSign } from 'lucide-react';
import { Expense, Category, Card } from '../types';
import { CATEGORIES } from '../constants';
import { formatCurrency } from '../utils/helpers';

interface Props {
  cards: Card[];
  frequentPeople: string[];
  currentViewDate: Date; // Nova prop para saber qual mês o usuário está olhando
  onClose: () => void;
  onAdd: (data: Omit<Expense, 'id'>) => void;
  onUpdate: (id: string, data: Partial<Expense>) => void;
  editingExpense: Expense | null;
}

const ExpenseForm: React.FC<Props> = ({ cards, frequentPeople, currentViewDate, onClose, onAdd, onUpdate, editingExpense }) => {
  const initialPeople = frequentPeople && frequentPeople.length > 0 ? [frequentPeople[0]] : ['Eu'];

  // Define a data inicial como a data atual SE estiver dentro do mês visualizado, 
  // senão usa o dia 1 do mês visualizado.
  const getInitialDate = () => {
    if (editingExpense) return editingExpense.date;
    
    const today = new Date();
    const isSameMonth = today.getMonth() === currentViewDate.getMonth() && today.getFullYear() === currentViewDate.getFullYear();
    
    if (isSameMonth) {
      return today.toISOString().split('T')[0];
    } else {
      // Retorna dia 1 do mês que está sendo visualizado para evitar que o gasto "suma"
      const year = currentViewDate.getFullYear();
      const month = String(currentViewDate.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}-01`;
    }
  };

  const [formData, setFormData] = useState({
    description: '',
    amount: '', // String pura para input type="number"
    date: getInitialDate(),
    category: 'Outros' as Category,
    cardId: cards[0]?.id || '',
    people: initialPeople, 
    installments: '1',
    isCustomSplit: false,
    customSplit: {} as Record<string, number> // Mudado para number direto para simplificar
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formData.cardId && cards.length > 0) {
      setFormData(prev => ({ ...prev, cardId: cards[0].id }));
    }
  }, [cards, formData.cardId]);

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        description: editingExpense.description,
        amount: editingExpense.totalAmount.toString(),
        date: editingExpense.date,
        category: editingExpense.category,
        cardId: editingExpense.cardId,
        people: editingExpense.people && editingExpense.people.length > 0 
                ? editingExpense.people 
                : [editingExpense.personName || 'Eu'],
        installments: editingExpense.installments.toString(),
        isCustomSplit: !!editingExpense.customSplit,
        customSplit: editingExpense.customSplit || {}
      });
    }
  }, [editingExpense]);

  // --- LÓGICA SIMPLIFICADA (SEM MÁSCARAS COMPLEXAS) ---
  
  const distributeEvenly = () => {
    const total = parseFloat(formData.amount) || 0;
    const count = formData.people.length;
    if (count === 0) return;
    
    const share = Number((total / count).toFixed(2));
    const newSplit: Record<string, number> = {};
    
    let distributed = 0;
    formData.people.forEach((p, idx) => {
      if (idx === count - 1) {
        newSplit[p] = Number((total - distributed).toFixed(2));
      } else {
        newSplit[p] = share;
        distributed += share;
      }
    });
    setFormData(prev => ({ ...prev, customSplit: newSplit }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.description.trim()) return setError("Informe a descrição.");
    
    const totalAmount = parseFloat(formData.amount);
    if (isNaN(totalAmount) || totalAmount <= 0) return setError("Valor inválido.");
    
    if (!formData.cardId) return setError("Selecione um cartão.");
    if (formData.people.length === 0) return setError("Selecione alguém.");

    // Validação Rateio
    let finalCustomSplit: Record<string, number> | undefined = undefined;

    if (formData.isCustomSplit) {
      let sumSplit = 0;
      const parsedSplit: Record<string, number> = {};
      
      formData.people.forEach(p => {
        const val = formData.customSplit[p] || 0;
        parsedSplit[p] = val;
        sumSplit += val;
      });

      if (Math.abs(sumSplit - totalAmount) > 0.1) {
        return setError(`A soma da divisão (${sumSplit.toFixed(2)}) não bate com o total (${totalAmount.toFixed(2)}).`);
      }
      finalCustomSplit = parsedSplit;
    }

    const payload = {
      description: formData.description,
      totalAmount: totalAmount,
      date: formData.date,
      category: formData.category,
      cardId: formData.cardId,
      people: formData.people,
      installments: parseInt(formData.installments) || 1,
      customSplit: finalCustomSplit
    };

    try {
      if (editingExpense) {
        onUpdate(editingExpense.id, payload);
      } else {
        onAdd(payload);
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar.");
    }
  };

  const togglePerson = (person: string) => {
    setFormData(prev => {
      const exists = prev.people.includes(person);
      let newPeople;
      if (exists) {
        if (prev.people.length === 1) return prev; 
        newPeople = prev.people.filter(p => p !== person);
      } else {
        newPeople = [...prev.people, person];
      }
      return { ...prev, people: newPeople };
    });
  };

  if (cards.length === 0) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl text-center max-w-sm">
        <AlertCircle size={40} className="mx-auto text-amber-500 mb-4"/>
        <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">Sem Cartões</h3>
        <p className="text-slate-500 mb-6">Cadastre um cartão primeiro.</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl">Fechar</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300 flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {editingExpense ? 'Editar Gasto' : 'Novo Gasto'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {error && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-rose-100"><AlertCircle size={16}/> {error}</div>}

          {/* INPUT VALOR SIMPLIFICADO (TYPE NUMBER) */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Valor Total</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">R$</span>
              <input 
                autoFocus
                type="number" 
                step="0.01"
                min="0.01"
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-primary-500 rounded-2xl text-2xl font-bold text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-300"
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                onBlur={() => {
                   if (formData.isCustomSplit && Object.keys(formData.customSplit).length === 0) distributeEvenly();
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 ml-1">Use ponto para centavos (Ex: 10.50)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descrição</label>
            <div className="relative">
              <Tag className="absolute left-4 top-3.5 text-slate-400" size={18}/>
              <input 
                type="text"
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900 dark:text-white"
                placeholder="Onde você gastou?"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data da Compra</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                <input 
                  type="date"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900 dark:text-white"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
             </div>
             <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Parcelas</label>
              <div className="relative">
                <Repeat className="absolute left-4 top-3.5 text-slate-400" size={18}/>
                <input 
                  type="number" min="1" max="48"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-primary-500 transition-all text-slate-900 dark:text-white"
                  value={formData.installments}
                  onChange={e => setFormData({...formData, installments: e.target.value})}
                />
              </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cartão</label>
               <div className="relative">
                 <select 
                   className="w-full pl-3 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none text-slate-900 dark:text-white text-sm"
                   value={formData.cardId}
                   onChange={e => setFormData({...formData, cardId: e.target.value})}
                 >
                   {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
                 <CreditCard className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16}/>
               </div>
             </div>
             <div>
               <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Categoria</label>
               <select 
                  className="w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none text-slate-900 dark:text-white text-sm"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value as Category})}
               >
                 {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
          </div>

          <div>
             <div className="flex justify-between items-center mb-2">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                 <Users size={12} />
                 Quem paga?
               </label>
               
               {formData.people.length > 1 && (
                 <button 
                  type="button"
                  onClick={() => {
                     const willBeCustom = !formData.isCustomSplit;
                     setFormData(prev => ({ ...prev, isCustomSplit: willBeCustom }));
                     if (willBeCustom) distributeEvenly();
                  }}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${formData.isCustomSplit ? 'bg-primary-100 text-primary-700' : 'text-slate-400 hover:bg-slate-100'}`}
                 >
                   <Calculator size={12} />
                   {formData.isCustomSplit ? 'Personalizar' : 'Dividir Igual'}
                 </button>
               )}
             </div>

             <div className="flex flex-wrap gap-2 mb-3 p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/50">
               {frequentPeople.map(p => {
                 const isSelected = formData.people.includes(p);
                 return (
                  <button 
                    type="button"
                    key={p} 
                    onClick={() => togglePerson(p)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                      isSelected 
                      ? 'bg-primary-600 border-primary-600 text-white' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary-300'
                    }`}
                  >
                    {p} {isSelected && '✓'}
                  </button>
                 );
               })}
             </div>

             {/* CAMPOS DE VALOR PERSONALIZADO */}
             {formData.isCustomSplit && formData.people.length > 1 && (
               <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-dashed border-primary-200 dark:border-primary-900/30 space-y-2 animate-in slide-in-from-top-2">
                 {formData.people.map(person => (
                   <div key={person} className="flex items-center gap-3">
                     <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-20 truncate text-right">{person}</span>
                     <div className="relative flex-1">
                       <span className="absolute left-3 top-2 text-slate-400 text-xs">R$</span>
                       <input 
                        type="number"
                        step="0.01"
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-900"
                        value={formData.customSplit[person] || ''}
                        onChange={(e) => setFormData(prev => ({
                            ...prev, 
                            customSplit: {...prev.customSplit, [person]: parseFloat(e.target.value) || 0}
                        }))}
                       />
                     </div>
                   </div>
                 ))}
                 <div className="text-center pt-1">
                    <button type="button" onClick={distributeEvenly} className="text-[10px] text-primary-600 font-bold hover:underline">Distribuir Igualmente</button>
                 </div>
               </div>
             )}
          </div>

          <div className="pt-2">
             <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-2 text-lg">
                <Save size={20} />
                {editingExpense ? 'Salvar' : 'Adicionar Gasto'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
