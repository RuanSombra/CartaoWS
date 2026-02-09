
import React, { useState, useMemo } from 'react';
import { 
  Plane, MapPin, Users, Plus, Trash2, Edit2, 
  ChevronRight, ArrowLeft, Calendar, DollarSign, 
  CheckCircle2, AlertCircle, TrendingUp, Hotel, Ticket, Utensils, Map, X
} from 'lucide-react';
import { VacationPlan, VacationExpense } from '../types';
import { formatCurrency, generateUUID } from '../utils/helpers';

interface Props {
  plans: VacationPlan[];
  onUpdatePlans: (plans: VacationPlan[]) => void;
}

const VacationPlanner: React.FC<Props> = ({ plans, onUpdatePlans }) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<VacationExpense | null>(null);

  // Estados dos formulários
  const [planForm, setPlanForm] = useState({ destination: '', country: '', peopleCount: 1, startDate: '' });
  const [expenseForm, setExpenseForm] = useState({ 
    description: '', category: 'Outros', totalAmount: '', paidAmount: '', date: new Date().toISOString().split('T')[0] 
  });

  const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId), [plans, selectedPlanId]);

  // Handlers Viagens
  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const newPlan: VacationPlan = {
      id: generateUUID(),
      destination: planForm.destination,
      country: planForm.country,
      peopleCount: planForm.peopleCount,
      startDate: planForm.startDate,
      expenses: []
    };
    onUpdatePlans([...plans, newPlan]);
    setIsAddingPlan(false);
    setPlanForm({ destination: '', country: '', peopleCount: 1, startDate: '' });
  };

  const handleDeletePlan = (id: string) => {
    if (confirm('Excluir este planejamento de viagem?')) {
      onUpdatePlans(plans.filter(p => p.id !== id));
      setSelectedPlanId(null);
    }
  };

  // Handlers Gastos
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    const total = parseFloat(expenseForm.totalAmount) || 0;
    const paid = parseFloat(expenseForm.paidAmount) || 0;

    const newExpense: VacationExpense = {
      id: editingExpense?.id || generateUUID(),
      description: expenseForm.description,
      category: expenseForm.category as any,
      totalAmount: total,
      paidAmount: paid,
      date: expenseForm.date
    };

    const updatedPlans = plans.map(p => {
      if (p.id === selectedPlanId) {
        const expenses = editingExpense 
          ? p.expenses.map(exp => exp.id === editingExpense.id ? newExpense : exp)
          : [...p.expenses, newExpense];
        return { ...p, expenses };
      }
      return p;
    });

    onUpdatePlans(updatedPlans);
    setIsAddingExpense(false);
    setEditingExpense(null);
    setExpenseForm({ description: '', category: 'Outros', totalAmount: '', paidAmount: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (!selectedPlan) return;
    const updatedPlans = plans.map(p => {
      if (p.id === selectedPlanId) {
        return { ...p, expenses: p.expenses.filter(e => e.id !== expenseId) };
      }
      return p;
    });
    onUpdatePlans(updatedPlans);
  };

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'Hospedagem': return <Hotel size={16} />;
      case 'Passagem': return <Ticket size={16} />;
      case 'Alimentação': return <Utensils size={16} />;
      case 'Passeio': return <Map size={16} />;
      default: return <DollarSign size={16} />;
    }
  };

  // UI LISTA DE VIAGENS
  if (!selectedPlanId && !isAddingPlan) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Plane className="text-primary-600" /> Minhas Próximas Férias
          </h2>
          <button 
            onClick={() => setIsAddingPlan(true)}
            className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Planejar Viagem
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map(plan => {
            const total = plan.expenses.reduce((sum, e) => sum + e.totalAmount, 0);
            const paid = plan.expenses.reduce((sum, e) => sum + e.paidAmount, 0);
            const percent = total > 0 ? (paid / total) * 100 : 0;

            return (
              <button 
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center text-primary-600">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white">{plan.destination}</h3>
                      <p className="text-xs text-slate-400 font-medium">{plan.country} • {plan.peopleCount} {plan.peopleCount === 1 ? 'pessoa' : 'pessoas'}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Pagamento</span>
                    <span>{percent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-primary-500 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(total)}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{plan.startDate ? new Date(plan.startDate).toLocaleDateString() : 'Sem data'}</span>
                  </div>
                </div>
              </button>
            );
          })}
          
          {plans.length === 0 && (
            <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
                <Plane size={32} className="text-slate-300" />
              </div>
              <p className="font-bold text-slate-400">Você ainda não planejou nenhuma viagem.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // UI FORM NOVA VIAGEM
  if (isAddingPlan) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <button onClick={() => setIsAddingPlan(false)} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-primary-600 mb-6 transition-colors">
          <ArrowLeft size={14} /> Voltar para lista
        </button>
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">Planejar Nova Aventura</h2>
          <form onSubmit={handleAddPlan} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Destino / Lugar</label>
              <input required type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white" value={planForm.destination} onChange={e => setPlanForm({...planForm, destination: e.target.value})} placeholder="Ex: Paris, Gramado, Fernando de Noronha..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">País</label>
              <input required type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white" value={planForm.country} onChange={e => setPlanForm({...planForm, country: e.target.value})} placeholder="Brasil, França..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Qtd. Pessoas</label>
                <input required type="number" min="1" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white" value={planForm.peopleCount} onChange={e => setPlanForm({...planForm, peopleCount: parseInt(e.target.value)})} />
               </div>
               <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data Início</label>
                <input required type="date" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white" value={planForm.startDate} onChange={e => setPlanForm({...planForm, startDate: e.target.value})} />
               </div>
            </div>
            <button type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 mt-4">
              Começar Planejamento
            </button>
          </form>
        </div>
      </div>
    );
  }

  // UI DETALHES DA VIAGEM SELECIONADA
  if (selectedPlan) {
    const totalTrip = selectedPlan.expenses.reduce((sum, e) => sum + e.totalAmount, 0);
    const paidTrip = selectedPlan.expenses.reduce((sum, e) => sum + e.paidAmount, 0);
    const remainingTrip = totalTrip - paidTrip;

    return (
      <div className="animate-in fade-in slide-in-from-right-4">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setSelectedPlanId(null)} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-primary-600 transition-colors">
            <ArrowLeft size={14} /> Voltar
          </button>
          <button onClick={() => handleDeletePlan(selectedPlan.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
            <Trash2 size={18} />
          </button>
        </div>

        {/* HEADER VIAGEM */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
           <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-2">
                <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 text-[10px] font-bold rounded-full uppercase tracking-widest">{selectedPlan.country}</span>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white">{selectedPlan.destination}</h1>
                <div className="flex gap-4 text-xs font-bold text-slate-400">
                   <span className="flex items-center gap-1"><Users size={14}/> {selectedPlan.peopleCount} pessoas</span>
                   <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(selectedPlan.startDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-6 md:pt-0 md:pl-8">
                 <div className="col-span-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Custo Total</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(totalTrip)}</p>
                 </div>
                 <div className="col-span-1">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Pago</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(paidTrip)}</p>
                 </div>
                 <div className="col-span-full md:col-span-1">
                    <p className="text-[10px] font-bold text-rose-500 uppercase mb-1">Falta Pagar</p>
                    <p className="text-lg font-bold text-rose-600">{formatCurrency(remainingTrip)}</p>
                 </div>
              </div>
           </div>
        </div>

        {/* LISTA DE GASTOS DA VIAGEM */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Reservas e Gastos</h3>
            <button 
              onClick={() => setIsAddingExpense(true)}
              className="flex items-center gap-2 text-xs font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-3 py-1.5 rounded-lg transition-all"
            >
              <Plus size={16} /> Novo Gasto
            </button>
          </div>

          <div className="space-y-3">
            {selectedPlan.expenses.map(expense => {
              const remains = expense.totalAmount - expense.paidAmount;
              const isPaid = remains <= 0;

              return (
                <div key={expense.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400 dark:bg-slate-800'}`}>
                         {getCategoryIcon(expense.category)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{expense.description}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{expense.category}</p>
                      </div>
                   </div>

                   <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(expense.totalAmount)}</p>
                        {remains > 0 ? (
                          <p className="text-[9px] font-bold text-rose-500">Pendente: {formatCurrency(remains)}</p>
                        ) : (
                          <p className="text-[9px] font-bold text-emerald-500 flex items-center justify-end gap-0.5"><CheckCircle2 size={8}/> Pago</p>
                        )}
                      </div>
                      
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                         <button onClick={() => { setEditingExpense(expense); setExpenseForm({ description: expense.description, category: expense.category, totalAmount: expense.totalAmount.toString(), paidAmount: expense.paidAmount.toString(), date: expense.date }); setIsAddingExpense(true); }} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Edit2 size={16}/></button>
                         <button onClick={() => handleDeleteExpense(expense.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                   </div>
                </div>
              );
            })}

            {selectedPlan.expenses.length === 0 && (
              <p className="text-center text-slate-400 text-xs py-10">Nenhuma reserva adicionada.</p>
            )}
          </div>
        </div>

        {/* MODAL GASTO FÉRIAS */}
        {isAddingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-lg font-bold text-slate-800 dark:text-white">{editingExpense ? 'Editar Gasto' : 'Novo Gasto de Férias'}</h2>
                 <button onClick={() => {setIsAddingExpense(false); setEditingExpense(null);}}><X size={20}/></button>
               </div>

               <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
                    <input required type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="Ex: Hotel Mercure, Passagem LATAM..." />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor Total</label>
                      <input required type="number" step="0.01" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white" value={expenseForm.totalAmount} onChange={e => setExpenseForm({...expenseForm, totalAmount: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor Já Pago</label>
                      <input required type="number" step="0.01" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white" value={expenseForm.paidAmount} onChange={e => setExpenseForm({...expenseForm, paidAmount: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria</label>
                      <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white text-sm" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                        <option>Hospedagem</option>
                        <option>Passagem</option>
                        <option>Passeio</option>
                        <option>Alimentação</option>
                        <option>Seguro</option>
                        <option>Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data</label>
                      <input required type="date" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                    </div>
                  </div>

                  {parseFloat(expenseForm.totalAmount) > 0 && (
                    <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
                       <p className="text-[10px] font-bold text-primary-600 uppercase mb-1">Saldo Devedor Calculado</p>
                       <p className="text-sm font-bold text-primary-700 dark:text-primary-300">
                         {formatCurrency(Math.max(0, (parseFloat(expenseForm.totalAmount) || 0) - (parseFloat(expenseForm.paidAmount) || 0)))}
                       </p>
                    </div>
                  )}

                  <button type="submit" className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 mt-4">
                    {editingExpense ? 'Salvar Alterações' : 'Adicionar ao Plano'}
                  </button>
               </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default VacationPlanner;
