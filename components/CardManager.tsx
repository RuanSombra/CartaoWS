
import React, { useState } from 'react';
import { X, Plus, CreditCard, Trash2, Edit2, DollarSign } from 'lucide-react';
import { Card } from '../types';
import { formatCurrency } from '../utils/helpers';

interface CardManagerProps {
  cards: Card[];
  onAdd: (card: Omit<Card, 'id'>) => void;
  onUpdate: (id: string, card: Partial<Card>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const CardManager: React.FC<CardManagerProps> = ({ cards, onAdd, onUpdate, onDelete, onClose }) => {
  const [name, setName] = useState('');
  const [closingDay, setClosingDay] = useState(1);
  const [dueDay, setDueDay] = useState(10);
  const [limit, setLimit] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const cardData = { 
      name, 
      closingDay, 
      dueDay, 
      color, 
      limit: parseFloat(limit) || 0 
    };

    if (editingId) {
      onUpdate(editingId, cardData);
      setEditingId(null);
    } else {
      onAdd(cardData);
    }
    
    setName('');
    setClosingDay(1);
    setDueDay(10);
    setLimit('');
  };

  const startEdit = (card: Card) => {
    setEditingId(card.id);
    setName(card.name);
    setClosingDay(card.closingDay);
    setDueDay(card.dueDay);
    setColor(card.color);
    setLimit(card.limit.toString());
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard size={18} className="text-blue-500" /> Cartões e Limites
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{editingId ? 'Editar Cartão' : 'Novo Cartão'}</h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome do Banco</label>
              <input required type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Limite Total do Cartão</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-sm">R$</span>
                <input required type="number" step="0.01" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900" value={limit} onChange={e => setLimit(e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fechamento</label>
                <input required type="number" min="1" max="31" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-white text-slate-900" value={closingDay} onChange={e => setClosingDay(parseInt(e.target.value))} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vencimento</label>
                <input required type="number" min="1" max="31" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-white text-slate-900" value={dueDay} onChange={e => setDueDay(parseInt(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cor</label>
              <input type="color" className="w-full h-10 p-1 border border-slate-200 rounded-lg cursor-pointer bg-white" value={color} onChange={e => setColor(e.target.value)} />
            </div>
            <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
              {editingId ? 'Salvar Alterações' : 'Criar Cartão'}
            </button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setName(''); setLimit(''); }} className="w-full text-xs text-slate-400 hover:text-slate-600">Cancelar Edição</button>}
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Meus Cartões</h3>
            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
              {cards.map(card => (
                <div key={card.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl group transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: card.color }}></div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white text-xs uppercase">{card.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{formatCurrency(card.limit)} • Dia {card.dueDay}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(card)} className="p-1.5 text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button>
                    <button onClick={() => onDelete(card.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
              {cards.length === 0 && <p className="text-center text-slate-400 text-xs py-10">Nenhum cartão cadastrado.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardManager;
