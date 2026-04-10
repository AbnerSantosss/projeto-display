
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Calendar, Clock, Monitor, Trash2, Edit3, Check, X, 
  ChevronLeft, Loader2, Save, Zap, AlertCircle, Layout,
  CalendarDays, Filter, Search, MoreVertical, Play, Pause, Settings
} from 'lucide-react';
import { getBroadcasts, saveBroadcast, deleteBroadcast, getDisplays, getCurrentUser, saveDisplay } from '../services/storage';
import { Broadcast, Display, Page, User } from '../types';
import SceneEditor from './SceneEditor';

const Scheduler: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBroadcast, setCurrentBroadcast] = useState<Partial<Broadcast> | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [broadcastsData, displaysData, user] = await Promise.all([
          getBroadcasts(),
          getDisplays(),
          getCurrentUser()
        ]);
        setBroadcasts(broadcastsData);
        setDisplays(displaysData);
        setCurrentUser(user);
      } catch (error) {
        console.error("Erro ao carregar dados do agendador:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCreateNew = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    
    const newBroadcast: Partial<Broadcast> = {
      id: crypto.randomUUID(),
      name: '',
      active: true,
      display_ids: [],
      start_time: localISOTime,
      end_time: new Date(Date.now() + 3600000 * 24 - offset).toISOString().slice(0, 16), // +24h local
      is_permanent: false,
      page: {
        id: 'p' + Date.now(),
        order: 1,
        duration: 15,
        layout: []
      },
      created_at: Date.now(),
      created_by: currentUser?.id
    };
    setCurrentBroadcast(newBroadcast);
    setIsEditing(true);
  };

  const handleEdit = (broadcast: Broadcast) => {
    setCurrentBroadcast({ ...broadcast });
    setIsEditing(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [broadcastToDelete, setBroadcastToDelete] = useState<string | null>(null);

  const confirmDelete = (id: string) => {
    setBroadcastToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!broadcastToDelete) return;
    setLoading(true);
    try {
      // 1. Remove from all displays
      for (const display of displays) {
        if (display.pages.some(p => p.broadcast_id === broadcastToDelete)) {
          const updatedPages = display.pages.filter(p => p.broadcast_id !== broadcastToDelete);
          await saveDisplay({ ...display, pages: updatedPages });
        }
      }
      
      // 2. Delete broadcast
      await deleteBroadcast(broadcastToDelete);
      
      setBroadcasts(prev => prev.filter(b => b.id !== broadcastToDelete));
      
      // Update local displays state
      const updatedDisplays = await getDisplays();
      setDisplays(updatedDisplays);
      
      setShowDeleteModal(false);
      setBroadcastToDelete(null);
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir programação.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentBroadcast?.name || !currentBroadcast?.start_time) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!currentBroadcast.is_permanent && !currentBroadcast.end_time) {
      alert('Por favor, defina um horário de término ou marque como permanente.');
      return;
    }

    if (currentBroadcast.display_ids?.length === 0) {
      alert('Selecione pelo menos uma tela para exibição.');
      return;
    }

    setLoading(true);
    try {
      const broadcastToSave = currentBroadcast as Broadcast;
      
      // 1. Save the broadcast record
      await saveBroadcast(broadcastToSave);
      
      // 2. Inject/Update the page in selected displays, remove from unselected
      for (const display of displays) {
        const isSelected = broadcastToSave.display_ids.includes(display.id) && broadcastToSave.active;
        const hasPage = display.pages.some(p => p.broadcast_id === broadcastToSave.id);
        
        let shouldSaveDisplay = false;
        let newPages = [...display.pages];
        
        if (isSelected) {
          const pageToInject: Page = {
            ...broadcastToSave.page,
            broadcast_id: broadcastToSave.id,
            start_time: broadcastToSave.start_time,
            end_time: broadcastToSave.end_time,
            is_permanent: broadcastToSave.is_permanent
          };
          
          if (hasPage) {
            // Update existing injected page
            newPages = newPages.map(p => p.broadcast_id === broadcastToSave.id ? pageToInject : p);
            shouldSaveDisplay = true;
          } else {
            // Inject new page
            newPages.push(pageToInject);
            shouldSaveDisplay = true;
          }
        } else if (hasPage) {
          // Remove page from unselected display
          newPages = newPages.filter(p => p.broadcast_id !== broadcastToSave.id);
          shouldSaveDisplay = true;
        }
        
        if (shouldSaveDisplay) {
          await saveDisplay({ ...display, pages: newPages });
        }
      }

      const updated = await getBroadcasts();
      setBroadcasts(updated);
      
      // Update local displays state
      const updatedDisplays = await getDisplays();
      setDisplays(updatedDisplays);
      
      setIsEditing(false);
      setCurrentBroadcast(null);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar programação.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDisplaySelection = (displayId: string) => {
    if (!currentBroadcast) return;
    const currentIds = currentBroadcast.display_ids || [];
    if (currentIds.includes(displayId)) {
      setCurrentBroadcast({
        ...currentBroadcast,
        display_ids: currentIds.filter(id => id !== displayId)
      });
    } else {
      setCurrentBroadcast({
        ...currentBroadcast,
        display_ids: [...currentIds, displayId]
      });
    }
  };

  const selectAllDisplays = () => {
    if (!currentBroadcast) return;
    setCurrentBroadcast({
      ...currentBroadcast,
      display_ids: displays.map(d => d.id)
    });
  };

  const clearDisplaySelection = () => {
    if (!currentBroadcast) return;
    setCurrentBroadcast({
      ...currentBroadcast,
      display_ids: []
    });
  };

  if (loading && broadcasts.length === 0 && !isEditing) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-cyan-500" size={32} />
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Carregando Central...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => isEditing ? setIsEditing(false) : navigate('/')}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                <Calendar className="text-indigo-500" size={32} />
                Central de <span className="text-cyan-400">Programação</span>
              </h1>
              <p className="text-slate-500 text-sm font-medium">Agendamento mestre e distribuição de conteúdo</p>
            </div>
          </div>
          
          {!isEditing && (
            <button 
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              <Plus size={20} strokeWidth={3} /> Nova Programação
            </button>
          )}
        </header>

        {isEditing ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* FORMULÁRIO DE CONFIGURAÇÃO */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
                <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-400">
                  <Settings className="w-5 h-5" /> Configurações
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Nome da Programação</label>
                    <input 
                      type="text" 
                      value={currentBroadcast?.name || ''}
                      onChange={e => setCurrentBroadcast({...currentBroadcast!, name: e.target.value})}
                      placeholder="Ex: Aviso de Feriado, Aniversariante..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder:text-slate-700 focus:border-cyan-500 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Início da Exibição</label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                        <input 
                          type="datetime-local" 
                          value={currentBroadcast?.start_time || ''}
                          onChange={e => setCurrentBroadcast({...currentBroadcast!, start_time: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pl-10 text-slate-100 focus:border-cyan-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Fim da Exibição</label>
                      <div className="relative">
                        <CalendarDays className={`absolute left-3 top-1/2 -translate-y-1/2 ${currentBroadcast?.is_permanent ? 'text-slate-800' : 'text-slate-600'}`} size={16} />
                        <input 
                          type="datetime-local" 
                          disabled={currentBroadcast?.is_permanent}
                          value={currentBroadcast?.is_permanent ? '' : (currentBroadcast?.end_time || '')}
                          onChange={e => setCurrentBroadcast({...currentBroadcast!, end_time: e.target.value})}
                          className={`w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pl-10 text-slate-100 focus:border-cyan-500 outline-none transition-all ${currentBroadcast?.is_permanent ? 'opacity-30 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-10 h-5 rounded-full relative transition-all ${currentBroadcast?.is_permanent ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${currentBroadcast?.is_permanent ? 'left-5.5' : 'left-0.5'}`}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">Deixar permanente</span>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={currentBroadcast?.is_permanent || false}
                          onChange={e => setCurrentBroadcast({...currentBroadcast!, is_permanent: e.target.checked})}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-12 h-6 rounded-full relative transition-all ${currentBroadcast?.active ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${currentBroadcast?.active ? 'left-7' : 'left-1'}`}></div>
                      </div>
                      <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Programação Ativa</span>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={currentBroadcast?.active || false}
                        onChange={e => setCurrentBroadcast({...currentBroadcast!, active: e.target.checked})}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-cyan-400">
                    <Monitor className="w-5 h-5" /> Selecionar Telas
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={selectAllDisplays} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase">Todas</button>
                    <button onClick={clearDisplaySelection} className="text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase">Limpar</button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {displays.map(display => (
                    <div 
                      key={display.id}
                      onClick={() => toggleDisplaySelection(display.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        currentBroadcast?.display_ids?.includes(display.id)
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-100'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Monitor size={16} className={currentBroadcast?.display_ids?.includes(display.id) ? 'text-cyan-400' : 'text-slate-600'} />
                        <span className="text-sm font-medium">{display.name}</span>
                      </div>
                      {currentBroadcast?.display_ids?.includes(display.id) && <Check size={16} className="text-cyan-400" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 bg-slate-900 border border-slate-800 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Salvar Programação
                </button>
              </div>
            </div>

            {/* EDITOR DE CENA INTEGRADO */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-full flex flex-col min-h-[600px]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-purple-400">
                    <Layout className="w-5 h-5" /> Designer de Conteúdo
                  </h2>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded uppercase">Modo Agendamento</span>
                  </div>
                </div>

                <div className="flex-1">
                   <SceneEditor 
                     page={currentBroadcast?.page || { id: 'temp', order: 1, duration: 15, layout: [] }} 
                     onChange={(newPage) => setCurrentBroadcast({...currentBroadcast!, page: newPage})}
                   />
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* LISTA DE PROGRAMAÇÕES */
          <div className="space-y-6 animate-in fade-in duration-500">
            
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end mb-8">
               <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input type="text" placeholder="Buscar programações..." className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-indigo-500 outline-none transition-all w-64" />
                  </div>
                  <button className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2 rounded-xl text-sm font-bold hover:text-white transition-all">
                    <Filter size={16} /> Filtros
                  </button>
               </div>
               <div className="text-xs text-slate-500 font-medium">
                 Total: <span className="text-slate-300 font-bold">{broadcasts.length}</span> programações agendadas
               </div>
            </div>

            {broadcasts.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                <CalendarDays size={64} className="mx-auto text-slate-800 mb-6" />
                <h3 className="text-xl font-bold text-slate-300 mb-2">Nenhuma programação encontrada</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">Comece criando sua primeira programação mestre para distribuir conteúdo em suas telas.</p>
                <button 
                  onClick={handleCreateNew}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg"
                >
                  Criar Agora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {broadcasts.map(broadcast => {
                  const now = new Date();
                  const start = new Date(broadcast.start_time);
                  const end = new Date(broadcast.end_time);
                  const isLive = broadcast.active && now >= start && now <= end;
                  const isExpired = now > end;
                  const isScheduled = now < start;

                  return (
                    <div key={broadcast.id} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all group">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        
                        <div className="flex gap-6 items-start">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isLive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 
                            isScheduled ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 
                            'bg-slate-800/50 border-slate-700 text-slate-500'
                          }`}>
                            {isLive ? <Play size={28} fill="currentColor" /> : 
                             isScheduled ? <Clock size={28} /> : 
                             <Pause size={28} />}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">{broadcast.name}</h3>
                              {isLive && <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">AO VIVO</span>}
                              {isScheduled && <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-black px-2 py-0.5 rounded-full">AGENDADO</span>}
                              {isExpired && <span className="bg-slate-800 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-full">EXPIRADO</span>}
                            </div>
                            
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-600" />
                                <span>{new Date(broadcast.start_time).toLocaleDateString()} - {new Date(broadcast.end_time).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-slate-600" />
                                <span>{new Date(broadcast.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} até {new Date(broadcast.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Monitor size={14} className="text-slate-600" />
                                <span>{broadcast.display_ids.length} {broadcast.display_ids.length === 1 ? 'tela' : 'telas'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-center">
                          <button 
                            onClick={() => handleEdit(broadcast)}
                            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700"
                            title="Editar"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => confirmDelete(broadcast.id)}
                            className="p-3 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-500 rounded-xl transition-all border border-slate-700 hover:border-rose-500/30"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="text-rose-500" />
              Excluir Programação
            </h3>
            <p className="text-slate-400 mb-6">
              Tem certeza que deseja excluir esta programação? Ela será removida de todas as telas selecionadas. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setBroadcastToDelete(null);
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scheduler;
