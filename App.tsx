
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, List, Plus, Settings, Moon, Sun, 
  Wallet, ChevronLeft, ChevronRight, Receipt, LayoutGrid,
  Plane
} from 'lucide-react';
import { Expense, Card, UserSettings, VacationPlan } from './types';
import { getMonthYearString, generateUUID } from './utils/helpers';
import { MONTHS_BR, INITIAL_CARDS } from './constants';

// Componentes
import Dashboard from './components/Dashboard';
import ExpenseTable from './components/ExpenseTable';
import ExpenseForm from './components/ExpenseForm';
import CardManager from './components/CardManager';
import FinancialSettings from './components/FinancialSettings';
import CardOverview from './components/CardOverview';
import StatementScanner from './components/StatementScanner';
import VacationPlanner from './components/VacationPlanner';

// --- HOOK DE PERSISTÊNCIA ---
function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      console.error("Erro ao ler localStorage:", e);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error("Erro ao salvar localStorage:", e);
    }
  }, [key, state]);

  return [state, setState] as const;
}

const App: React.FC = () => {
  // --- ESTADO GLOBAL ---
  const [expenses, setExpenses] = usePersistentState<Expense[]>('cw_v2_expenses', []);
  const [cards, setCards] = usePersistentState<Card[]>('cw_v2_cards', INITIAL_CARDS);
  const [settings, setSettings] = usePersistentState<UserSettings>('cw_v2_settings', {
    salary: 0, savingsGoalPercentage: 20, frequentPeople: ['Eu', 'Cônjuge']
  });
  const [vacationPlans, setVacationPlans] = usePersistentState<VacationPlan[]>('cw_v2_vacations', []);
  const [darkMode, setDarkMode] = usePersistentState<boolean>('cw_v2_theme', false);

  // --- MIGRAÇÃO DE DADOS ---
  useEffect(() => {
    const hasLegacyData = expenses.some(e => e.personName && (!e.people || e.people.length === 0));
    if (hasLegacyData) {
      const migrated = expenses.map(e => ({
        ...e,
        people: e.people && e.people.length > 0 ? e.people : [e.personName || 'Eu'],
        personName: undefined
      }));
      setExpenses(migrated);
    }
  }, [expenses.length]); 

  // --- ESTADO DE NAVEGAÇÃO & UI ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'extract' | 'vacation'>('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCardId, setSelectedCardId] = useState<string>('All');
  
  // --- MODAIS ---
  const [modalOpen, setModalOpen] = useState<'form' | 'cards' | 'settings' | 'scanner' | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // --- EFEITOS ---
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // --- HELPERS ---
  const currentMonthStr = getMonthYearString(currentDate);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  // --- HANDLERS (GASTOS) ---
  const handleAddExpense = (data: Omit<Expense, 'id'>) => {
    const newExpense = { ...data, id: generateUUID() };
    setExpenses(prev => [newExpense, ...prev]);
    
    // CRÍTICO: Atualiza a data visualizada para o mês do gasto recém-adicionado
    // Isso evita a sensação de que o gasto "sumiu" se a data for diferente do mês atual
    const expenseDate = new Date(data.date);
    // Adiciona timezone offset para evitar pular dia
    const userTimezoneOffset = expenseDate.getTimezoneOffset() * 60000;
    const correctedDate = new Date(expenseDate.getTime() + userTimezoneOffset);
    
    // Se o mês do gasto for diferente do atual visualizado, muda a visualização
    if (correctedDate.getMonth() !== currentDate.getMonth() || correctedDate.getFullYear() !== currentDate.getFullYear()) {
       setCurrentDate(correctedDate);
       // Se o usuário não estiver na aba de extrato/dashboard, leva ele pro dashboard
       if (activeTab === 'vacation') setActiveTab('dashboard');
    }

    setModalOpen(null);
  };

  const handleUpdateExpense = (id: string, data: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    setEditingExpense(null);
    setModalOpen(null);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleClearAllExpenses = () => {
    setExpenses([]);
  };

  // Funções que faltavam para o Scanner funcionar
  const handleAddExpensesBatch = (batch: Omit<Expense, 'id'>[], _targetMonth: string) => {
    const withIds = batch.map(e => ({ ...e, id: (e as any).id || generateUUID() }));
    setExpenses(prev => [...withIds, ...prev]);
    setModalOpen(null);
  };

  // --- HANDLERS (CARTÕES) ---
  const handleAddCard = (data: Omit<Card, 'id'>) => {
    const newCard = { ...data, id: generateUUID() };
    setCards(prev => [...prev, newCard]);
  };

  const handleUpdateCard = (id: string, data: Partial<Card>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const handleDeleteCard = (id: string) => {
    if (window.confirm("Deseja excluir este cartão?")) {
      setCards(prev => prev.filter(c => c.id !== id));
    }
  };

  // --- HANDLERS (FÉRIAS) ---
  const handleUpdateVacations = (plans: VacationPlan[]) => {
    setVacationPlans(plans);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-2 rounded-xl text-white shadow-lg shadow-primary-500/30">
              <Wallet size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-tight hidden sm:block">
              Cartão<span className="text-primary-600">Wise</span>
            </h1>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
            <button onClick={() => handleMonthChange('prev')} className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-primary-600 transition-all"><ChevronLeft size={16}/></button>
            <div className="px-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 w-32 text-center">
              {MONTHS_BR[currentDate.getMonth()]} {currentDate.getFullYear().toString().slice(2)}
            </div>
            <button onClick={() => handleMonthChange('next')} className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-primary-600 transition-all"><ChevronRight size={16}/></button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setModalOpen('scanner')} className="p-2 text-slate-400 hover:text-primary-600 transition-colors" title="Importar Extrato">
              <Receipt size={20} />
            </button>
            <button onClick={() => setModalOpen('settings')} className="p-2 text-slate-400 hover:text-primary-600 transition-colors">
              <Settings size={20} />
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-400 hover:text-primary-600 transition-colors">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-8 pb-32">
        
        {/* CARDS CAROUSEL (Oculto se for aba de férias para focar na viagem) */}
        {activeTab !== 'vacation' && (
          <section>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Minha Carteira</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedCardId('All')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${selectedCardId === 'All' ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
                  >
                    <LayoutGrid size={14} /> Visão Geral
                  </button>
                </div>
              </div>
              <button onClick={() => setModalOpen('cards')} className="text-xs font-bold text-primary-600 hover:text-primary-500 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/10 rounded-lg transition-colors">
                + Gerenciar Cartões
              </button>
            </div>

            <CardOverview 
              cards={cards} 
              expenses={expenses} 
              currentMonth={currentMonthStr} 
              selectedCardId={selectedCardId} 
              onSelectCard={setSelectedCardId} 
            />
          </section>
        )}

        {/* TABS NAVIGATION */}
        <div className="flex p-1 bg-slate-200 dark:bg-slate-800/50 rounded-2xl mx-auto w-full max-w-lg">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
          >
            <LayoutDashboard size={14} /> Dash
          </button>
          <button 
            onClick={() => setActiveTab('extract')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'extract' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
          >
            <List size={14} /> Extrato
          </button>
          <button 
            onClick={() => setActiveTab('vacation')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'vacation' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
          >
            <Plane size={14} /> Férias
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeTab === 'dashboard' && (
            <Dashboard 
              expenses={expenses} 
              cards={cards} 
              currentMonth={currentMonthStr} 
              selectedCardId={selectedCardId}
              settings={settings}
            />
          )}
          {activeTab === 'extract' && (
            <ExpenseTable 
              expenses={expenses}
              cards={cards}
              currentMonth={currentMonthStr}
              selectedCardId={selectedCardId}
              onDelete={handleDeleteExpense}
              onEdit={(exp) => { setEditingExpense(exp); setModalOpen('form'); }}
              onClearAll={handleClearAllExpenses}
            />
          )}
          {activeTab === 'vacation' && (
            <VacationPlanner 
              plans={vacationPlans} 
              onUpdatePlans={handleUpdateVacations}
            />
          )}
        </div>

      </main>

      {/* --- FLOATING ACTION BUTTON (FAB) --- */}
      {activeTab !== 'vacation' && (
        <div className="fixed bottom-6 right-6 z-30">
          <button 
            onClick={() => { setEditingExpense(null); setModalOpen('form'); }}
            className="group flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-5 py-4 rounded-full shadow-xl shadow-primary-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={24} />
            <span className="font-bold text-sm pr-1">Novo Gasto</span>
          </button>
        </div>
      )}

      {/* MODALS */}
      {modalOpen === 'form' && (
        <ExpenseForm 
          cards={cards}
          frequentPeople={settings.frequentPeople}
          currentViewDate={currentDate}
          onClose={() => { setModalOpen(null); setEditingExpense(null); }}
          onAdd={handleAddExpense}
          onUpdate={handleUpdateExpense}
          editingExpense={editingExpense}
        />
      )}
      {modalOpen === 'cards' && <CardManager cards={cards} onClose={() => setModalOpen(null)} onAdd={handleAddCard} onUpdate={handleUpdateCard} onDelete={handleDeleteCard} />}
      {modalOpen === 'settings' && <FinancialSettings settings={settings} onClose={() => setModalOpen(null)} onSave={setSettings} />}
      {modalOpen === 'scanner' && <StatementScanner cards={cards} onAddExpenses={handleAddExpensesBatch} onClose={() => setModalOpen(null)} frequentPeople={settings.frequentPeople} />}

    </div>
  );
};

export default App;
