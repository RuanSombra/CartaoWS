
import React, { useState, useMemo, useEffect } from 'react';
import { X, Upload, Loader2, Check, ArrowRight, Receipt, Key, AlertCircle, ExternalLink } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { Expense, Card, Category } from '../types';
import { CATEGORIES, MONTHS_BR } from '../constants';
import { formatCurrency, formatDate, getMonthYearString, generateUUID, getApiKey } from '../utils/helpers';

interface StatementScannerProps {
  cards: Card[];
  onAddExpenses: (expenses: Omit<Expense, 'id'>[], targetMonth: string) => void;
  onClose: () => void;
  frequentPeople: string[];
}

const StatementScanner: React.FC<StatementScannerProps> = ({ cards, onAddExpenses, onClose, frequentPeople }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedExpenses, setExtractedExpenses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || '');
  const [selectedPeople, setSelectedPeople] = useState<string[]>([frequentPeople[0] || 'Eu']);
  
  // Estado para Chave Manual (Caso não esteja no .env/Vercel)
  const [manualApiKey, setManualApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    // Tenta pegar do ambiente, se falhar, tenta do localStorage
    const envKey = getApiKey();
    if (!envKey) {
      const storedKey = localStorage.getItem('cw_user_api_key');
      if (storedKey) setManualApiKey(storedKey);
      setShowKeyInput(true);
    }
  }, []);
  
  const [referenceMonth, setReferenceMonth] = useState(() => {
    const today = new Date();
    if (today.getDate() > 20) {
      today.setMonth(today.getMonth() + 1);
    }
    return getMonthYearString(today);
  });

  const [yearRef, monthRef] = referenceMonth.split('-').map(Number);

  const totalExtracted = useMemo(() => {
    return extractedExpenses.reduce((sum, exp) => {
      const installments = exp.installments || 1;
      return sum + (exp.totalAmount / installments);
    }, 0);
  }, [extractedExpenses]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Garante que pega apenas a parte base64 após a vírgula
        const base64String = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const togglePerson = (person: string) => {
    setSelectedPeople(prev => {
      if (prev.includes(person)) {
        if (prev.length === 1) return prev; 
        return prev.filter(p => p !== person);
      }
      return [...prev, person];
    });
  };

  const handleMonthChange = (offset: number) => {
    const date = new Date(yearRef, monthRef - 1 + offset, 1);
    setReferenceMonth(getMonthYearString(date));
  };

  const handleManualKeySave = (val: string) => {
    setManualApiKey(val);
    localStorage.setItem('cw_user_api_key', val);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Prioridade: Chave Manual > Chave do Ambiente
    const apiKey = manualApiKey || getApiKey();
    
    if (!apiKey) {
      setError("É necessário informar uma API Key do Google Gemini para usar este recurso.");
      setShowKeyInput(true);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const base64Data = await fileToBase64(file);
      
      // Validação básica do arquivo
      if (file.size > 4 * 1024 * 1024) {
         throw new Error("O arquivo é muito grande (Máx 4MB). Tente cortar a imagem.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const validCategoriesList = CATEGORIES.join(', ');

      const prompt = `ATENÇÃO: Você é um extrator de dados financeiros. Analise esta imagem/PDF de fatura de cartão.
      
      Extraia APENAS a lista de compras. Ignore saldos anteriores, pagamentos efetuados e juros.
      
      REGRAS:
      1. 'date': Formato YYYY-MM-DD. Se não tiver ano, assuma ${yearRef}.
      2. 'description': Nome do estabelecimento. Limpe códigos estranhos.
      3. 'totalAmount': Valor TOTAL da compra. Se for parcelado (ex: 1/10), pegue o valor cheio total, não a parcela.
      4. 'installments': Número total de parcelas. Se for à vista, use 1.
      5. 'category': Escolha UMA destas: [${validCategoriesList}]. Se não souber, use 'Outros'.

      Retorne JSON puro.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest', // Modelo mais estável para visão atualmente
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                description: { type: Type.STRING },
                totalAmount: { type: Type.NUMBER },
                category: { type: Type.STRING },
                installments: { type: Type.INTEGER }
              },
              required: ["date", "description", "totalAmount", "category", "installments"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("A IA não retornou nenhum texto. A imagem pode estar ilegível.");

      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        console.error("Erro parsing JSON:", text);
        throw new Error("Erro ao processar resposta da IA. Tente novamente.");
      }
      
      if (!Array.isArray(data)) throw new Error("Formato de dados inválido.");
      if (data.length === 0) throw new Error("Nenhuma compra identificada na imagem.");

      setExtractedExpenses(data);
    } catch (err: any) {
      console.error(err);
      // Tratamento de erros comuns do Gemini
      if (err.message?.includes('400')) {
         setError("Erro na requisição (400). A imagem pode estar corrompida ou o formato não é aceito.");
      } else if (err.message?.includes('403') || err.message?.includes('API key')) {
         setError("Chave de API inválida ou expirada. Verifique suas configurações.");
         setShowKeyInput(true);
      } else {
         setError(err.message || "Erro desconhecido ao processar.");
      }
    } finally {
      setIsProcessing(false);
      // Limpa o input para permitir enviar o mesmo arquivo novamente se falhar
      e.target.value = '';
    }
  };

  const handleConfirm = () => {
    if (selectedPeople.length === 0) {
      alert("Selecione pelo menos uma pessoa.");
      return;
    }

    const finalExpenses = extractedExpenses.map(exp => ({
      ...exp,
      id: generateUUID(),
      cardId: selectedCardId,
      people: selectedPeople, 
      category: CATEGORIES.includes(exp.category as Category) ? exp.category : 'Outros',
      firstInstallmentMonth: referenceMonth 
    }));
    
    onAddExpenses(finalExpenses as any, referenceMonth);
    onClose();
  };

  const removeItem = (idxToRemove: number) => {
      setExtractedExpenses(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
               <Receipt size={20} />
             </div>
             <div>
               <h2 className="text-lg font-bold text-slate-800 dark:text-white">Importar Fatura</h2>
               <p className="text-xs text-slate-500 font-medium">Reconhecimento via IA (Gemini)</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 dark:bg-slate-900/50">
          
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-xl flex items-start gap-2 border border-rose-100 dark:border-rose-900/50">
               <AlertCircle size={18} className="shrink-0 mt-0.5" /> 
               <span>{error}</span>
            </div>
          )}

          {/* CONFIGURAÇÃO DE API KEY (SE NECESSÁRIO) */}
          {showKeyInput && extractedExpenses.length === 0 && (
             <div className="mb-6 p-5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                   <Key size={18} className="text-amber-600 dark:text-amber-500" />
                   <h3 className="text-sm font-bold text-amber-700 dark:text-amber-500 uppercase">Falta a Chave do Google</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                   Para usar a Inteligência Artificial, você precisa de uma chave gratuita do Google (Gemini API). 
                   Como você está usando o site online (Vercel), precisa colar a chave abaixo.
                </p>
                
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-500 rounded-xl text-xs font-bold hover:bg-amber-50 transition-colors mb-4"
                >
                   <ExternalLink size={14} /> 1. Clique aqui para pegar sua chave (Criar API Key)
                </a>

                <div className="relative">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">2. Cole a chave aqui (Começa com AIza...)</label>
                   <input 
                     type="text" 
                     placeholder="Cole sua API Key aqui..."
                     className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                     value={manualApiKey}
                     onChange={(e) => handleManualKeySave(e.target.value)}
                   />
                </div>
                <p className="text-[10px] text-slate-400 mt-2">A chave será salva apenas no seu navegador.</p>
             </div>
          )}

          {/* STEP 1: UPLOAD */}
          {extractedExpenses.length === 0 && !isProcessing && (
            <div className="text-center space-y-6 py-4">
              <div className="max-w-xs mx-auto mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Para qual fatura estes gastos vão?</label>
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500"><ArrowRight size={16} className="rotate-180"/></button>
                  <span className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                    {MONTHS_BR[monthRef - 1]} {yearRef}
                  </span>
                  <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500"><ArrowRight size={16}/></button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Os gastos importados aparecerão obrigatoriamente neste mês.</p>
              </div>

              <div className="relative group mx-auto w-full max-w-sm">
                <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-3xl cursor-pointer transition-all shadow-sm hover:shadow-md ${!manualApiKey && !getApiKey() ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50' : 'border-blue-300/50 dark:border-blue-700/30 bg-white dark:bg-slate-800 hover:border-blue-500'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-3 text-blue-500">
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Carregar PDF ou Imagem</p>
                  </div>
                  <input 
                     type="file" 
                     className="hidden" 
                     accept="application/pdf,image/*" 
                     onChange={handleFileUpload}
                     disabled={!manualApiKey && !getApiKey()}
                  />
                </label>
              </div>
            </div>
          )}

          {/* LOADING */}
          {isProcessing && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="text-blue-600 animate-spin mb-4" size={40} />
              <h3 className="font-bold text-slate-800 dark:text-white">Lendo Fatura...</h3>
              <p className="text-xs text-slate-400 mt-1">Identificando datas, valores e parcelas com IA.</p>
            </div>
          )}

          {/* RESULTS */}
          {extractedExpenses.length > 0 && !isProcessing && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              
              {/* CONFIGURAÇÃO GLOBAL */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Mês de Destino (Fatura)</label>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button onClick={() => handleMonthChange(-1)} className="text-slate-400 hover:text-blue-500"><ArrowRight size={14} className="rotate-180"/></button>
                      <span className="text-xs font-bold text-slate-800 dark:text-white">{MONTHS_BR[monthRef - 1]} {yearRef}</span>
                      <button onClick={() => handleMonthChange(1)} className="text-slate-400 hover:text-blue-500"><ArrowRight size={14}/></button>
                    </div>
                 </div>
                 
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cartão</label>
                    <select 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                      value={selectedCardId}
                      onChange={(e) => setSelectedCardId(e.target.value)}
                    >
                      {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>

                 <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dividir com</label>
                    <div className="flex gap-2">
                      {frequentPeople.map(p => (
                        <button
                          key={p}
                          onClick={() => togglePerson(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedPeople.includes(p) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                 </div>
              </div>

              {/* LISTA DE ITENS */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Itens Identificados ({extractedExpenses.length})</h3>
                  <p className="text-xs font-bold text-blue-600">Total Fatura: {formatCurrency(totalExtracted)}</p>
                </div>
                
                <div className="space-y-2">
                  {extractedExpenses.map((exp, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 group">
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{exp.description}</p>
                            <span className="text-[10px] text-slate-400">{formatDate(exp.date)}</span>
                         </div>
                         <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 font-bold">{exp.category}</span>
                           {exp.installments > 1 && (
                             <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded font-bold">
                               {exp.installments}x
                             </span>
                           )}
                         </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          {formatCurrency(exp.totalAmount / (exp.installments || 1))}
                        </p>
                        {exp.installments > 1 && (
                          <p className="text-[9px] text-slate-400">Total: {formatCurrency(exp.totalAmount)}</p>
                        )}
                      </div>

                      <button 
                        onClick={() => removeItem(idx)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remover item"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setExtractedExpenses([])} className="flex-1 py-3 text-slate-500 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                <button 
                  onClick={handleConfirm}
                  className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check size={18} /> Confirmar Importação
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatementScanner;
