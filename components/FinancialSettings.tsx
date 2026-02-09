
import React, { useState } from 'react';
import { X, DollarSign, Target, Save, User, Plus, Trash2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { UserSettings } from '../types';

interface FinancialSettingsProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onClose: () => void;
}

const FinancialSettings: React.FC<FinancialSettingsProps> = ({ settings, onSave, onClose }) => {
  const [salary, setSalary] = useState(settings.salary.toString());
  const [savingsGoal, setSavingsGoal] = useState(settings.savingsGoalPercentage.toString());
  const [frequentPeople, setFrequentPeople] = useState<string[]>(settings.frequentPeople || ['Eu', 'Pai']);
  const [newPerson, setNewPerson] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      salary: parseFloat(salary) || 0,
      savingsGoalPercentage: parseFloat(savingsGoal) || 0,
      frequentPeople: frequentPeople,
    });
    onClose();
  };

  const addPerson = () => {
    if (newPerson && !frequentPeople.includes(newPerson)) {
      setFrequentPeople([...frequentPeople, newPerson]);
      setNewPerson('');
    }
  };

  const removePerson = (name: string) => {
    setFrequentPeople(frequentPeople.filter(p => p !== name));
  };

  // Função Nuclear: Limpa TUDO
  const handleHardReset = () => {
    const confirm1 = window.confirm("ATENÇÃO: Você está prestes a apagar TODOS os dados (Cartões, Gastos, Configurações).");
    if (confirm1) {
        const confirm2 = window.confirm("Tem certeza absoluta? O aplicativo voltará ao estado original de instalação.");
        if (confirm2) {
            localStorage.clear();
            window.location.reload();
        }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Target size={20} className="text-indigo-500" />
            Configurações
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Orçamento</h3>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <DollarSign size={16} className="text-slate-400" />
                  Salário Mensal Líquido
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-medium">R$</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-slate-900"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Target size={16} className="text-slate-400" />
                  Meta de Economia (%)
                </label>
                <div className="relative">
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-slate-900"
                    value={savingsGoal}
                    onChange={(e) => setSavingsGoal(e.target.value)}
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 font-medium">%</span>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Atalhos de Pessoas</h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Adicionar nome..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                    value={newPerson}
                    onChange={(e) => setNewPerson(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPerson())}
                  />
                  <User className="absolute left-3 top-3 text-slate-400" size={16} />
                </div>
                <button 
                  type="button" 
                  onClick={addPerson}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {frequentPeople.map(person => (
                  <div 
                    key={person}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg group"
                  >
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{person}</span>
                    <button 
                      type="button" 
                      onClick={() => removePerson(person)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
            
            {/* ZONA DE PERIGO */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
               <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertTriangle size={14} /> Zona de Perigo
               </h3>
               <button
                  type="button"
                  onClick={handleHardReset}
                  className="w-full py-3 border border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-900/10 dark:border-rose-900/30 dark:text-rose-400 font-bold rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors flex items-center justify-center gap-2"
               >
                  <RefreshCcw size={18} /> Resetar Todo o App
               </button>
               <p className="text-[10px] text-slate-400 mt-2 text-center">Apaga todos os dados do navegador e recomeça do zero.</p>
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
             <button
              onClick={handleSubmit}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95"
            >
              <Save size={18} />
              Salvar Alterações
            </button>
        </div>

      </div>
    </div>
  );
};

export default FinancialSettings;
