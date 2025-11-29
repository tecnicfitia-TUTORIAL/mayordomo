
import React, { useState } from 'react';
import { Plus, DollarSign, Calendar, Tag, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export const ExpensesPanel: React.FC = () => {
  // In a real app, this would come from Firestore/Supabase
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: '1', amount: 45.50, category: 'Comida', description: 'Cena de trabajo', date: new Date().toISOString().split('T')[0] },
    { id: '2', amount: 120.00, category: 'Transporte', description: 'Abono mensual', date: '2025-11-20' },
  ]);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Comida');
  const [description, setDescription] = useState('');

  const categories = ['Comida', 'Transporte', 'Ocio', 'Hogar', 'Salud', 'Suscripciones', 'Otros'];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category,
      description,
      date: new Date().toISOString().split('T')[0]
    };

    setExpenses([newExpense, ...expenses]);
    setAmount('');
    setDescription('');
  };

  const handleDelete = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="h-full flex flex-col gap-6">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-dark-900 p-5 rounded-sm border border-stone-800 flex flex-col justify-between">
            <span className="text-xs font-serif text-stone-500 uppercase tracking-widest">Total Mes</span>
            <div className="text-2xl font-serif text-emerald-400 font-bold mt-2">{total.toFixed(2)}€</div>
        </div>
        <div className="bg-dark-900 p-5 rounded-sm border border-stone-800 flex flex-col justify-between">
            <span className="text-xs font-serif text-stone-500 uppercase tracking-widest">Tendencia</span>
            <div className="text-sm font-serif text-stone-300 mt-2 flex items-center gap-2">
                <TrendingUp size={16} className="text-red-400" /> +12% vs mes pasado
            </div>
        </div>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAdd} className="bg-dark-900 p-6 rounded-sm border border-double border-4 border-stone-800/50">
        <h3 className="text-sm font-bold text-stone-200 mb-4 uppercase tracking-widest flex items-center gap-2">
            <Plus size={16} /> Registrar Gasto
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-3.5 text-stone-500" />
                <input 
                    type="number" 
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black border border-stone-700 rounded-sm pl-8 pr-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none font-mono"
                />
            </div>
            <div className="relative">
                <Tag size={14} className="absolute left-3 top-3.5 text-stone-500" />
                <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black border border-stone-700 rounded-sm pl-8 pr-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none appearance-none"
                >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
        </div>
        
        <input 
            type="text" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (Opcional)"
            className="w-full bg-black border border-stone-700 rounded-sm px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none mb-4"
        />

        <button type="submit" className="w-full bg-emerald-900/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-900/40 py-2 rounded-sm text-xs font-bold uppercase tracking-widest transition-colors">
            Guardar Registro
        </button>
      </form>

      {/* List */}
      <div className="flex-1 bg-dark-900 border border-stone-800 rounded-sm flex flex-col overflow-hidden">
        <div className="p-3 border-b border-stone-800 bg-stone-900/50 text-[10px] font-bold text-stone-500 uppercase tracking-widest flex justify-between">
            <span>Historial Reciente</span>
            <span>{expenses.length} registros</span>
        </div>
        <div className="overflow-y-auto custom-scrollbar p-2 space-y-1">
            {expenses.map(expense => (
                <div key={expense.id} className="flex items-center justify-between p-3 hover:bg-stone-800/30 rounded-sm group transition-colors border border-transparent hover:border-stone-800">
                    <div className="flex flex-col">
                        <span className="text-sm font-serif text-stone-200">{expense.category}</span>
                        <span className="text-[10px] text-stone-500 italic">{expense.description || 'Sin descripción'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-emerald-400">{expense.amount.toFixed(2)}€</span>
                        <button onClick={() => handleDelete(expense.id)} className="text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>

    </div>
  );
};
