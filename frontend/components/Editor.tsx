
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RGL, { WidthProvider } from 'react-grid-layout';
import { 
  Save, Plus, Trash2, X,
  Image as ImageIcon, Type, CloudSun, Clock, Calendar, CalendarDays,
  Settings, Layers, Home, Move, Upload, Link as LinkIcon, CheckCircle2,
  Maximize2, Film, Info, Loader2, MonitorPlay, Rss, Globe, Gift, Search, Palette, Map, Layout, MoveHorizontal
} from 'lucide-react';
import { getDisplays, saveDisplay, uploadMedia, deleteDisplay } from '../services/storage';
import { Display, Page, WidgetType, LayoutItem } from '../types';
import { LiveClock, WeatherWidget, RssFeed, FullInfoWidget } from './Player';
import { SizeInput } from './SizeInput';
import { MediaLibrary } from './MediaLibrary';

const GridLayout = WidthProvider(RGL);


const FEED_CATEGORIES = [
  {
    name: 'Notícias Gerais',
    feeds: [
      { name: 'G1 - Principais', url: 'https://g1.globo.com/rss/g1/' },
      { name: 'G1 - Mundo', url: 'https://g1.globo.com/rss/g1/mundo/' },
      { name: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/' },
      { name: 'UOL Notícias', url: 'https://rss.uol.com.br/feed/noticias.xml' },
      { name: 'Jovem Pan', url: 'https://jovempan.com.br/feed' },
      { name: 'BBC News Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml' },
    ]
  },
  {
    name: 'Futebol & Esportes',
    feeds: [
      { name: 'Globo Esporte', url: 'https://ge.globo.com/rss/ge/' },
      { name: 'ESPN Brasil', url: 'https://www.espn.com.br/rss' },
      { name: 'Lance!', url: 'https://www.lance.com.br/rss' },
    ]
  },
  {
    name: 'Tecnologia & Ciência',
    feeds: [
      { name: 'G1 - Tecnologia', url: 'https://g1.globo.com/rss/g1/tecnologia/' },
      { name: 'Olhar Digital', url: 'https://olhardigital.com.br/feed/' },
      { name: 'TechTudo', url: 'https://techtudo.globo.com/rss/techtudo/' },
      { name: 'Canaltech', url: 'https://canaltech.com.br/rss/' },
    ]
  },
  {
    name: 'Economia & Negócios',
    feeds: [
      { name: 'G1 - Economia', url: 'https://g1.globo.com/rss/g1/economia/' },
      { name: 'Valor Econômico', url: 'https://valor.globo.com/rss/valor' },
      { name: 'Exame', url: 'https://exame.com/feed/' },
      { name: 'Forbes Brasil', url: 'https://forbes.com.br/feed/' },
    ]
  },
  {
    name: 'Arte & Cultura',
    feeds: [
      { name: 'G1 - Pop & Arte', url: 'https://g1.globo.com/rss/g1/pop-arte/' },
      { name: 'Omelete', url: 'https://www.omelete.com.br/rss' },
      { name: 'Rolling Stone', url: 'https://rollingstone.uol.com.br/feed/' },
    ]
  }
];

const isYouTubeUrl = (url: string) => {
  if (!url) return false;
  const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  return regExp.test(url);
};

const getEmbedUrl = (url: string, config?: { autoplay?: boolean, mute?: boolean, loop?: boolean, controls?: boolean, youtubeQuality?: string }) => {
  if (!url) return '';
  const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[1].length === 11) {
    const videoId = match[1];
    const autoplay = config?.autoplay !== false ? 1 : 0;
    const mute = config?.mute !== false ? 1 : 0;
    const loop = config?.loop !== false ? 1 : 0;
    const controls = config?.controls === true ? 1 : 0;
    const quality = config?.youtubeQuality || 'highres';
    
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay}&mute=${mute}&loop=${loop}&playlist=${videoId}&controls=${controls}&disablekb=1&fs=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&showinfo=0&iv_load_policy=3&vq=${quality}`;
  }
  return url;
};

const handleYouTubeIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>, quality: string = 'highres') => {
  const iframe = e.currentTarget;
  // Try to force requested quality
  iframe.contentWindow?.postMessage(JSON.stringify({
    event: 'command',
    func: 'setPlaybackQuality',
    args: [quality]
  }), '*');
  
  // If highres, also set the range
  if (quality === 'highres' || quality === 'hd1080') {
    iframe.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func: 'setPlaybackQualityRange',
      args: ['hd1080', 'highres']
    }), '*');
  } else {
    iframe.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func: 'setPlaybackQualityRange',
      args: [quality, quality]
    }), '*');
  }
};

const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [display, setDisplay] = useState<Display | null>(null);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  const [isClearingScene, setIsClearingScene] = useState(false);
  const [showDeleteDisplayModal, setShowDeleteDisplayModal] = useState(false);
  const [isDeletingDisplay, setIsDeletingDisplay] = useState(false);
  const [showBgAnimModal, setShowBgAnimModal] = useState(false);
  const [mediaLibraryConfig, setMediaLibraryConfig] = useState<{ isOpen: boolean, onSelect: (url: string) => void, allowedTypes: 'image' | 'video' | 'all' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getBackgroundAnimationClass = (anim?: string) => {
    switch (anim) {
      case 'auto-weather': return 'bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-dashed border-cyan-500/30'; // Placeholder visual
      case 'gradient-flow': return 'bg-anim-gradient-flow';
      case 'clouds': return 'bg-anim-clouds';
      case 'rain': return 'bg-anim-rain';
      case 'snow': return 'bg-anim-snow';
      case 'fire': return 'bg-anim-fire';
      case 'tech-grid': return 'bg-anim-tech-grid';
      case 'pulse-red': return 'bg-anim-pulse-red';
      case 'pulse-blue': return 'bg-anim-pulse-blue';
      case 'pulse-green': return 'bg-anim-pulse-green';
      case 'aurora': return 'bg-anim-aurora';
      default: return '';
    }
  };

  const GRID_COLS = 48;


  useEffect(() => {
    const fetchData = async () => {
      const displays = await getDisplays();
      const found = displays.find(d => d.id === id);
      if (found) {
        setDisplay(found);
      } else {
        navigate('/');
      }
    };
    fetchData();
  }, [id, navigate]);

  const rowHeight = containerWidth / GRID_COLS;

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.contentRect.width > 0) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [display]);

  const handleDeleteDisplay = async () => {
    if (!display) return;
    setIsDeletingDisplay(true);
    try {
      await deleteDisplay(display.id);
      navigate('/');
    } catch (e) {
      alert('Erro ao excluir tela.');
      setIsDeletingDisplay(false);
      setShowDeleteDisplayModal(false);
    }
  };

  useEffect(() => {
    console.log('Display updated:', display);
  }, [display]);

  if (!display) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-4">
      <Loader2 className="animate-spin text-cyan-500" size={32} /> 
      <p className="text-xs uppercase tracking-widest font-bold">Carregando estúdio...</p>
    </div>
  );

  const activePage = display.pages[activePageIdx];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveDisplay(display);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      alert('Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLayoutChange = (layout: any[]) => {
    const updatedPages = [...display.pages];
    updatedPages[activePageIdx].layout = updatedPages[activePageIdx].layout.map(w => {
      const item = layout.find(l => l.i === w.i);
      if (item) {
        return { ...w, x: item.x, y: item.y, w: item.w, h: item.h };
      }
      return w;
    });
    setDisplay({ ...display, pages: updatedPages });
  };

  const addWidget = (type: WidgetType) => {
    const newWidget: LayoutItem = {
      i: Math.random().toString(36).substr(2, 9),
      x: 18,
      y: 10,
      w: type === WidgetType.VIDEO || type === WidgetType.IFRAME || type === WidgetType.CALENDAR || type === WidgetType.GIF || type === WidgetType.FULL_INFO ? 12 : (type === WidgetType.RSS ? 12 : 8),
      h: type === WidgetType.VIDEO || type === WidgetType.IFRAME || type === WidgetType.CALENDAR || type === WidgetType.GIF || type === WidgetType.FULL_INFO ? 8 : (type === WidgetType.RSS ? 6 : 6),
      type,
      data: {
        content: type === WidgetType.TEXT ? 'NOVO TEXTO' : '',
        url: type === WidgetType.IMAGE ? 'https://picsum.photos/400/300' : (type === WidgetType.IFRAME ? 'https://www.wikipedia.org' : (type === WidgetType.GIF ? 'https://media.giphy.com/media/3o7TKSjRrfIPjei72E/giphy.gif' : '')),
        videoUrl: type === WidgetType.VIDEO ? 'https://www.youtube.com/watch?v=YhYaHfpz6lo' : '',
        rssUrl: type === WidgetType.RSS ? 'https://g1.globo.com/rss/g1/tecnologia/' : '',
        calendarId: type === WidgetType.CALENDAR ? 'pt.brazilian#holiday@group.v.calendar.google.com' : '',
        city: (type === WidgetType.WEATHER || type === WidgetType.CLOCK || type === WidgetType.FULL_INFO) ? 'Campina Grande' : '',
        model: type === WidgetType.WEATHER ? 'simple' : (type === WidgetType.CLOCK ? 'standard' : undefined),
        color: '#ffffff',
        fontSize: '2vw',
        zIndex: type === WidgetType.FULL_INFO ? 0 : 10
      }
    };

    const updatedPages = [...display.pages];
    updatedPages[activePageIdx].layout.push(newWidget);
    setDisplay({ ...display, pages: updatedPages });
    setSelectedWidget(newWidget.i);
  };


  const removeWidget = (wId: string) => {
    const updatedPages = [...display.pages];
    updatedPages[activePageIdx].layout = updatedPages[activePageIdx].layout.filter(w => w.i !== wId);
    setDisplay({ ...display, pages: updatedPages });
    setSelectedWidget(null);
  };

  const confirmRemovePage = () => {
    if (pageToDelete === null) return;
    
    const updatedPages = display.pages.filter((_, i) => i !== pageToDelete);
    
    let newIdx = activePageIdx;
    if (pageToDelete < activePageIdx) {
        newIdx = activePageIdx - 1;
    } else if (pageToDelete === activePageIdx) {
        newIdx = Math.max(0, pageToDelete - 1);
    }
    // Ensure newIdx is within bounds
    newIdx = Math.min(newIdx, updatedPages.length - 1);
    
    setDisplay({ ...display, pages: updatedPages });
    setActivePageIdx(newIdx);
    setSelectedWidget(null);
    setPageToDelete(null);
  };

  const removePage = (idx: number) => {
    if (display.pages.length <= 1) {
      alert("É necessário ter pelo menos uma cena.");
      return;
    }
    setPageToDelete(idx);
  };

  const clearAllWidgets = () => {
    const updatedPages = [...display.pages];
    updatedPages[activePageIdx].layout = [];
    setDisplay({ ...display, pages: updatedPages });
    setSelectedWidget(null);
    setIsClearingScene(false);
  };

  const updateWidgetData = (wId: string, dataUpdates: any) => {
    const updatedPages = [...display.pages];
    const w = updatedPages[activePageIdx].layout.find(w => w.i === wId);
    if (w) {
      w.data = { ...w.data, ...dataUpdates };
      setDisplay({ ...display, pages: updatedPages });
    }
  };

  const setFullScreen = () => {
    if (!selectedWidget) return;
    
    const updatedPages = [...display.pages];
    const currentPage = updatedPages[activePageIdx];
    
    // Keep only the selected widget
    const currentWidget = currentPage.layout.find(w => w.i === selectedWidget);
    if (!currentWidget) return;
    
    // Calculate required height in grid units to fill the container
    const containerHeight = containerRef.current?.clientHeight || 0;
    const requiredRows = containerHeight > 0 && rowHeight > 0 ? Math.ceil(containerHeight / rowHeight) : 27;
    
    // Update widget to full screen
    const fullScreenWidget = {
      ...currentWidget,
      x: 0,
      y: 0,
      w: GRID_COLS,
      h: requiredRows
    };
    
    currentPage.layout = [fullScreenWidget];
    
    setDisplay({ ...display, pages: updatedPages });
  };

  const currentWidget = activePage.layout.find(w => w.i === selectedWidget);

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden relative text-slate-200 font-sans">
      
      {/* Delete Display Modal */}
      {showDeleteDisplayModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Excluir Tela Inteira?</h3>
            <p className="text-slate-400 text-sm mb-6">Esta ação não pode ser desfeita. A tela <strong>{display.name}</strong> e todas as suas cenas serão apagadas permanentemente.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteDisplayModal(false)}
                disabled={isDeletingDisplay}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteDisplay}
                disabled={isDeletingDisplay}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors text-sm font-bold shadow-lg shadow-rose-900/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingDisplay ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isDeletingDisplay ? 'Excluindo...' : 'Sim, Excluir Tela'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background Animation Selection Modal */}
      {showBgAnimModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-2xl w-full mx-4 animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MonitorPlay className="text-cyan-500" /> Escolher Fundo Animado
              </h3>
              <button onClick={() => setShowBgAnimModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { id: '', label: 'Nenhum', desc: 'Remover animação' },
                { id: 'auto-weather', label: 'Automático (Clima)', desc: 'Muda com o tempo' },
                { id: 'gradient-flow', label: 'Fluxo Gradiente', desc: 'Suave e colorido' },
                { id: 'clouds', label: 'Céu e Nuvens', desc: 'Calmo e relaxante' },
                { id: 'rain', label: 'Chuva Digital', desc: 'Dark mode com chuva' },
                { id: 'snow', label: 'Neve Caindo', desc: 'Inverno suave' },
                { id: 'fire', label: 'Chamas', desc: 'Intenso e quente' },
                { id: 'tech-grid', label: 'Grid Tech', desc: 'Futurista e técnico' },
                { id: 'pulse-red', label: 'Alerta Vermelho', desc: 'Para avisos urgentes' },
                { id: 'pulse-blue', label: 'Pulso Azul', desc: 'Tecnológico suave' },
                { id: 'pulse-green', label: 'Pulso Verde', desc: 'Status positivo' },
                { id: 'aurora', label: 'Aurora Boreal', desc: 'Místico e elegante' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    if (selectedWidget) {
                      updateWidgetData(selectedWidget, { backgroundAnimation: option.id });
                    } else {
                      const updated = [...display.pages];
                      updated[activePageIdx].backgroundAnimation = option.id as any;
                      updated[activePageIdx].backgroundImage = ''; 
                      updated[activePageIdx].backgroundVideoUrl = '';
                      setDisplay({...display, pages: updated});
                    }
                    setShowBgAnimModal(false);
                  }}
                  className={`group relative overflow-hidden rounded-xl border-2 transition-all h-32 flex flex-col items-center justify-center p-4 ${
                    ((selectedWidget ? currentWidget?.data.backgroundAnimation : activePage.backgroundAnimation) || '') === option.id 
                    ? 'border-cyan-500 ring-2 ring-cyan-500/20' 
                    : 'border-slate-800 hover:border-slate-600 hover:scale-[1.02]'
                  }`}
                >
                  {/* Preview Background */}
                  <div className={`absolute inset-0 z-0 opacity-50 group-hover:opacity-80 transition-opacity ${getBackgroundAnimationClass(option.id)}`}></div>
                  
                  <div className="relative z-10 text-center">
                    <span className="block font-bold text-white text-sm drop-shadow-md mb-1">{option.label}</span>
                    <span className="block text-[10px] text-slate-300 drop-shadow-md">{option.desc}</span>
                  </div>
                  
                  {((selectedWidget ? currentWidget?.data.backgroundAnimation : activePage.backgroundAnimation) || '') === option.id && (
                    <div className="absolute top-2 right-2 z-20 bg-cyan-500 text-black rounded-full p-1 shadow-lg">
                      <CheckCircle2 size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isClearingScene && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Limpar Todos os Widgets?</h3>
            <p className="text-slate-400 text-sm mb-6">Todos os widgets desta cena serão removidos permanentemente. Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsClearingScene(false)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={clearAllWidgets}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors text-sm font-bold shadow-lg shadow-rose-900/20"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {pageToDelete !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Excluir Cena {pageToDelete + 1}?</h3>
            <p className="text-slate-400 text-sm mb-6">Esta ação não pode ser desfeita. Todos os widgets desta cena serão perdidos.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setPageToDelete(null)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmRemovePage}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors text-sm font-bold shadow-lg shadow-rose-900/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500/10 backdrop-blur-md text-emerald-400 px-6 py-3 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-3 border border-emerald-500/50">
            <CheckCircle2 size={18} className="fill-emerald-500/20" />
            <span className="font-bold text-sm tracking-wide">SALVO NA NUVEM</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between z-30 shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors">
            <Home size={20} />
          </button>
          <div className="w-px h-6 bg-slate-800"></div>
          <div className="flex items-center gap-2">
            <img 
              src="https://certeirofc.com.br/wp-content/uploads/2026/02/Gemini_Generated_Image_opexl8opexl8opex_upscayl_10x_upscayl-lite-4x_1-removebg-preview.png" 
              alt="Logo" 
              className="w-6 h-6 object-contain"
            />
            <h1 className="font-bold text-slate-100 tracking-tight uppercase text-sm">
              Officecom<span className="text-cyan-400">Display</span> <span className="text-slate-600 mx-2">/</span> {display.name}
            </h1>
          </div>
        </div>

        {/* Scene Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 overflow-x-auto max-w-[40%] scrollbar-hide">
          {display.pages.map((p, idx) => (
            <div 
              key={p.id} 
              className={`flex items-center rounded-lg border transition-all overflow-hidden ${
                activePageIdx === idx 
                ? 'bg-indigo-600 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]' 
                : 'border-slate-800 hover:border-slate-700 bg-slate-900'
              }`}
            >
              <button
                onClick={() => { setActivePageIdx(idx); setSelectedWidget(null); }}
                className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activePageIdx === idx ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p.broadcast_id && <CalendarDays size={12} className="text-cyan-400" />}
                CENA {idx + 1}
              </button>
              
              {display.pages.length > 1 && (
                <button 
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    removePage(idx); 
                  }}
                  className={`px-2 py-1.5 transition-colors border-l ${
                    activePageIdx === idx 
                    ? 'border-indigo-500 text-indigo-200 hover:bg-indigo-700 hover:text-white' 
                    : 'border-slate-800 text-slate-600 hover:bg-rose-500/10 hover:text-rose-500'
                  }`}
                  title="Excluir Cena"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => {
            const newP: Page = { id: 'p'+Date.now(), order: display.pages.length+1, duration: 15, layout: [] };
            setDisplay({...display, pages: [...display.pages, newP]});
            setActivePageIdx(display.pages.length);
          }} className="p-1.5 text-cyan-500 hover:bg-cyan-500/10 rounded-lg transition-colors mx-1">
            <Plus size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowDeleteDisplayModal(true)}
            className="bg-slate-900 border border-slate-800 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 hover:border-rose-500/30 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all mr-2"
            title="Excluir Tela"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">EXCLUIR</span>
          </button>

          <button 
            onClick={() => window.open(`/#/player/${display.slug || display.id}`, '_blank')}
            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
            title="Abrir Player em nova aba"
          >
            <Maximize2 size={16} />
            <span className="hidden sm:inline">VISUALIZAR</span>
          </button>

          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] border border-white/10 active:scale-95 whitespace-nowrap disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            {isSaving ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Left: Tools */}
        <aside className="w-72 bg-slate-900 border-r border-slate-800 overflow-y-auto z-[60] shadow-xl">
          <div className="p-5 border-b border-slate-800">
             <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <Layers size={12} /> Widgets
             </h3>
             <div className="grid grid-cols-2 gap-3">
              <WidgetTool icon={<ImageIcon size={20} />} label="Imagem" onClick={() => addWidget(WidgetType.IMAGE)} />
              <WidgetTool icon={<Film size={20} />} label="Vídeo" onClick={() => addWidget(WidgetType.VIDEO)} />
              <WidgetTool icon={<Type size={20} />} label="Texto" onClick={() => addWidget(WidgetType.TEXT)} />
              <WidgetTool icon={<Clock size={20} />} label="Relógio" onClick={() => addWidget(WidgetType.CLOCK)} />
              <WidgetTool icon={<Calendar size={20} />} label="Agenda" onClick={() => addWidget(WidgetType.CALENDAR)} />
              <WidgetTool icon={<CloudSun size={20} />} label="Clima" onClick={() => addWidget(WidgetType.WEATHER)} />
              <WidgetTool icon={<Layout size={20} />} label="Completo" onClick={() => addWidget(WidgetType.FULL_INFO)} />
              <WidgetTool icon={<Rss size={20} />} label="Notícias" onClick={() => addWidget(WidgetType.RSS)} />
              <WidgetTool icon={<Globe size={20} />} label="Website" onClick={() => addWidget(WidgetType.IFRAME)} />
              <WidgetTool icon={<Gift size={20} />} label="GIF" onClick={() => addWidget(WidgetType.GIF)} />
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-800">
               <button 
                 onClick={() => setIsClearingScene(true)}
                 className="w-full flex items-center justify-center gap-2 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg text-[10px] font-bold transition-colors border border-rose-500/20 uppercase tracking-wider"
               >
                 <Trash2 size={12} /> Limpar Todos os Widgets
               </button>
            </div>
          </div>


          <div className="p-5">
             <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <MonitorPlay size={12} /> Fundo da Cena
             </h3>
             
             <div className="space-y-4">
                <div className="group">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Vídeo de Fundo (YouTube ou MP4)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="https://youtube.com... ou https://.../video.mp4"
                      value={activePage.backgroundVideoUrl || ''}
                      onChange={(e) => {
                        const updated = [...display.pages];
                        updated[activePageIdx].backgroundVideoUrl = e.target.value;
                        updated[activePageIdx].backgroundImage = ''; 
                        setDisplay({...display, pages: updated});
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-8 text-xs text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <Film size={12} className="absolute left-2.5 top-3 text-slate-600" />
                  </div>
                  
                  <div className="relative mt-3 mb-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-slate-900 px-2 text-slate-500 font-bold uppercase text-[9px]">ou</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setMediaLibraryConfig({
                        isOpen: true,
                        allowedTypes: 'video',
                        onSelect: (url) => {
                          const updated = [...display.pages];
                          updated[activePageIdx].backgroundVideoUrl = url;
                          updated[activePageIdx].backgroundImage = ''; 
                          setDisplay({...display, pages: updated});
                        }
                      });
                    }}
                    className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider cursor-pointer transition-all border border-slate-700 hover:border-slate-500 shadow-lg"
                  >
                    <Upload size={14} />
                    Selecionar Vídeo
                  </button>
                  
                  {activePage.backgroundVideoUrl && (
                    <div className="flex flex-col gap-2 mt-2 ml-1">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="bg-video-mute"
                          checked={activePage.backgroundVideoMuted !== false} // Default true
                          onChange={(e) => {
                            const updated = [...display.pages];
                            updated[activePageIdx].backgroundVideoMuted = e.target.checked;
                            setDisplay({...display, pages: updated});
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-offset-0 focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                        />
                        <label htmlFor="bg-video-mute" className="text-[10px] font-bold text-slate-400 uppercase cursor-pointer select-none hover:text-cyan-400 transition-colors">
                          Vídeo Mudo (Sem Áudio)
                        </label>
                      </div>
                      
                      {isYouTubeUrl(activePage.backgroundVideoUrl) && (
                        <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 mt-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Qualidade YouTube</label>
                          <select 
                            value={activePage.backgroundVideoQuality || 'highres'}
                            onChange={(e) => {
                              const updated = [...display.pages];
                              updated[activePageIdx].backgroundVideoQuality = e.target.value;
                              setDisplay({...display, pages: updated});
                            }}
                            className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-2 py-1 outline-none focus:border-cyan-500"
                          >
                            <option value="highres">Máxima (Auto)</option>
                            <option value="hd1080">1080p</option>
                            <option value="hd720">720p</option>
                            <option value="large">480p</option>
                            <option value="medium">360p</option>
                            <option value="small">240p</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="bg-slate-900 px-2 text-[9px] text-slate-600 font-bold">OU</span>
                   </div>
                   <div className="border-t border-slate-800 w-full"></div>
                </div>

                <div className="group">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Imagem de Fundo</label>
                  <div className="relative mb-2">
                    <input 
                      type="text" 
                      placeholder="https://exemplo.com/imagem.jpg"
                      value={activePage.backgroundImage || ''}
                      onChange={(e) => {
                        const updated = [...display.pages];
                        updated[activePageIdx].backgroundImage = e.target.value;
                        updated[activePageIdx].backgroundVideoUrl = ''; 
                        setDisplay({...display, pages: updated});
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pl-8 text-xs text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                    <ImageIcon size={12} className="absolute left-2.5 top-3 text-slate-600" />
                  </div>
                  
                  <button 
                    onClick={() => {
                      setMediaLibraryConfig({
                        isOpen: true,
                        allowedTypes: 'image',
                        onSelect: (url) => {
                          const updated = [...display.pages];
                          updated[activePageIdx].backgroundImage = url;
                          updated[activePageIdx].backgroundVideoUrl = ''; 
                          setDisplay({...display, pages: updated});
                        }
                      });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white transition-all"
                  >
                    <Upload size={12} /> 
                    SELECIONAR IMAGEM
                  </button>

                  <p className="text-[9px] text-slate-600 mt-3 leading-relaxed border-t border-slate-800/50 pt-2">
                    Sugestão: Encontre imagens 4K incríveis em <a href="https://unsplash.com/wallpapers/desktop/4k" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Unsplash</a>, <a href="https://www.pexels.com/search/4k%20wallpaper/" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Pexels</a> ou <a href="https://pixabay.com/images/search/4k%20wallpaper/" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Pixabay</a>.
                  </p>

                  <div className="relative mt-4 mb-4">
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-slate-900 px-2 text-[9px] text-slate-600 font-bold">OU</span>
                     </div>
                     <div className="border-t border-slate-800 w-full"></div>
                  </div>

                  <div className="group">
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Fundo Animado</label>
                    <button
                      onClick={() => {
                        setSelectedWidget(null);
                        setShowBgAnimModal(true);
                      }}
                      className="w-full flex items-center justify-between gap-2 py-2.5 px-3 bg-slate-950 border border-slate-700 hover:border-cyan-500 rounded-lg text-xs text-slate-300 hover:text-white transition-all group-hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    >
                      <span className="flex items-center gap-2">
                        <MonitorPlay size={14} className="text-cyan-500" />
                        {activePage.backgroundAnimation ? 
                          ['Automático (Clima)', 'Fluxo Gradiente', 'Céu e Nuvens', 'Chuva Digital', 'Neve Caindo', 'Chamas', 'Grid Tech', 'Alerta Vermelho', 'Pulso Azul', 'Pulso Verde', 'Aurora Boreal']
                          [['auto-weather', 'gradient-flow', 'clouds', 'rain', 'snow', 'fire', 'tech-grid', 'pulse-red', 'pulse-blue', 'pulse-green', 'aurora'].indexOf(activePage.backgroundAnimation)]
                          : 'Escolher Animação'}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${activePage.backgroundAnimation ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-700'}`}></div>
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-800">
                    <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Move size={12} /> Transições
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Tipo de Transição</label>
                        <select 
                          value={activePage.transitionType || 'none'}
                          onChange={(e) => {
                            const updated = [...display.pages];
                            updated[activePageIdx].transitionType = e.target.value as any;
                            setDisplay({...display, pages: updated});
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        >
                          <option value="none">Nenhuma</option>
                          <option value="fade">Fade</option>
                          <option value="slide-left">Slide Esquerda</option>
                          <option value="slide-right">Slide Direita</option>
                          <option value="slide-up">Slide Cima</option>
                          <option value="slide-down">Slide Baixo</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Duração (ms)</label>
                        <input 
                          type="number"
                          value={activePage.transitionDuration || 500}
                          onChange={(e) => {
                            const updated = [...display.pages];
                            updated[activePageIdx].transitionDuration = parseInt(e.target.value);
                            setDisplay({...display, pages: updated});
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Ajuste da Imagem</label>
                    <select 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                      value={activePage.backgroundFit || 'cover'}
                      onChange={(e) => {
                        const updated = [...display.pages];
                        updated[activePageIdx].backgroundFit = e.target.value as any;
                        setDisplay({...display, pages: updated});
                      }}
                    >
                      <option value="cover">Preencher (Corta bordas se necessário)</option>
                      <option value="fill">Esticar (Preenche 100% ignorando proporção)</option>
                      <option value="contain">Ajustar (Mostra imagem inteira com bordas)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Duração (Segundos)</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg p-1">
                    <Clock size={14} className="ml-2 text-slate-600" />
                    <input 
                      type="number" 
                      value={activePage.duration} 
                      onChange={(e) => {
                        const updated = [...display.pages];
                        updated[activePageIdx].duration = parseInt(e.target.value) || 5;
                        setDisplay({...display, pages: updated});
                      }}
                      className="w-full bg-transparent border-none p-1.5 text-sm font-bold text-slate-200 focus:ring-0 outline-none"
                    />
                  </div>
                </div>
             </div>
             
             {activePage.broadcast_id && (
               <div className="mt-4 p-3 bg-cyan-900/30 border border-cyan-800/50 rounded-xl flex items-start gap-3">
                 <CalendarDays className="text-cyan-400 shrink-0 mt-0.5" size={16} />
                 <div>
                   <p className="text-xs font-bold text-cyan-400 mb-1">Cena Programada</p>
                   <p className="text-[10px] text-cyan-200/70 leading-relaxed">
                     Esta cena foi injetada pela Central de Programação. Alterações feitas aqui afetarão apenas esta tela e poderão ser sobrescritas se a programação for atualizada.
                   </p>
                 </div>
               </div>
             )}
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center p-8">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
               style={{ 
                 backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', 
                 backgroundSize: '20px 20px' 
               }}>
          </div>
          
          <div className="absolute top-4 left-4 flex items-center gap-2 text-slate-600 text-[10px] font-black uppercase tracking-widest bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800 backdrop-blur-sm z-20">
            <Maximize2 size={12} className="text-cyan-500" /> Canvas Livre 16:9
          </div>
          
          <div 
            ref={containerRef}
            className="w-full h-full max-w-[100%] max-h-[100%] aspect-video bg-black shadow-2xl relative border border-slate-800 rounded-sm overflow-hidden"
            onClick={() => setSelectedWidget(null)}
          >
            {activePage.backgroundVideoUrl && (
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black">
                 {isYouTubeUrl(activePage.backgroundVideoUrl) ? (
                   <iframe 
                      src={getEmbedUrl(activePage.backgroundVideoUrl, { autoplay: true, mute: activePage.backgroundVideoMuted !== false, loop: true, controls: false, youtubeQuality: activePage.backgroundVideoQuality })} 
                      className="w-full h-full border-none pointer-events-none" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                      onLoad={(e) => handleYouTubeIframeLoad(e, activePage.backgroundVideoQuality)}
                   />
                 ) : (
                   <video 
                     src={activePage.backgroundVideoUrl} 
                     className="w-full h-full object-cover pointer-events-none" 
                     autoPlay
                     muted={activePage.backgroundVideoMuted !== false}
                     loop
                     playsInline
                   />
                 )}
              </div>
            )}
            {activePage.backgroundImage && (
              <div className="absolute inset-0 z-0 bg-center pointer-events-none" 
                   style={{ 
                     backgroundImage: `url(${activePage.backgroundImage})`,
                     backgroundSize: 'cover',
                     backgroundRepeat: 'no-repeat'
                   }} 
              />
            )}
            
            {activePage.backgroundAnimation && !activePage.backgroundImage && !activePage.backgroundVideoUrl && (
               <div className={`absolute inset-0 z-0 ${getBackgroundAnimationClass(activePage.backgroundAnimation)}`} />
            )}
            
            <div className="absolute inset-0 z-10">
              <GridLayout
                className="layout"
                layout={activePage.layout.map(w => ({ i: w.i, x: w.x, y: w.y, w: w.w, h: w.h }))}
                cols={GRID_COLS}
                rowHeight={rowHeight}
                width={containerWidth}
                margin={[0, 0]}
                isResizable={true}
                isDraggable={true}
                compactType={null} 
                preventCollision={false} 
                allowOverlap={true}
                resizeHandles={['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne']}
                onLayoutChange={handleLayoutChange}
              >
                {activePage.layout.map(w => (
                  <div 
                    key={w.i} 
                    onClick={(e) => { e.stopPropagation(); setSelectedWidget(w.i); }}
                    className={`group transition-all ${selectedWidget === w.i ? 'border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'border border-transparent hover:border-white/20 hover:bg-white/5'} ${w.data.backgroundAnimation ? getBackgroundAnimationClass(w.data.backgroundAnimation) : (selectedWidget === w.i ? 'bg-slate-900/50 backdrop-blur-sm' : '')}`}
                    style={{ zIndex: selectedWidget === w.i ? 999 : (w.data.zIndex !== undefined ? w.data.zIndex : 10) }}
                  >
                    <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                      <div className={`drag-handle absolute cursor-move z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-cyan-500/10 to-transparent ${w.type === WidgetType.IFRAME && w.data.iframeConfig?.interactive ? 'top-0 left-0 right-0 h-8 bg-cyan-500/80 backdrop-blur-sm border-b border-cyan-400 flex items-center justify-center text-[10px] font-bold text-white shadow-lg' : 'inset-0'}`}>
                        {w.type === WidgetType.IFRAME && w.data.iframeConfig?.interactive && 'Arraste ou Clique aqui para selecionar'}
                      </div>
                      
                      {w.type === WidgetType.VIDEO && (
                        <div className="w-full h-full pointer-events-none bg-black flex flex-col items-center justify-center border border-slate-800">
                           {w.data.videoUrl ? (
                             isYouTubeUrl(w.data.videoUrl) ? (
                               <iframe 
                                  src={getEmbedUrl(w.data.videoUrl, w.data.videoConfig)} 
                                  className="w-full h-full border-none opacity-80" 
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                  onLoad={(e) => handleYouTubeIframeLoad(e, w.data.videoConfig?.youtubeQuality)}
                               />
                             ) : (
                               <video 
                                 src={w.data.videoUrl} 
                                 className="w-full h-full object-cover opacity-80" 
                                 autoPlay={w.data.videoConfig?.autoplay !== false}
                                 muted={w.data.videoConfig?.mute !== false}
                                 loop={w.data.videoConfig?.loop !== false}
                                 controls={w.data.videoConfig?.controls === true}
                               />
                             )
                           ) : (
                             <>
                               <Film className="text-slate-700 mb-2" size={32} />
                               <span className="text-[10px] uppercase text-slate-600 font-bold">Vídeo Player</span>
                             </>
                           )}
                           <div className="absolute inset-0 z-10 bg-transparent"></div>
                        </div>
                      )}
                      {w.type === WidgetType.IMAGE && (
                        w.data.url ? (
                          <div className="w-full h-full flex items-center justify-center overflow-hidden">
                            <img 
                              src={w.data.url} 
                              className="pointer-events-none select-none object-cover" 
                              style={{ 
                                width: w.data.width ? `${w.data.width}px` : '100%', 
                                height: w.data.height ? `${w.data.height}px` : '100%' 
                              }} 
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center"><ImageIcon className="text-slate-700 mb-2" size={32} /><span className="text-[10px] text-slate-600 font-bold uppercase">Imagem</span></div>
                        )
                      )}
                      {w.type === WidgetType.GIF && (
                        w.data.url ? (
                          <div className="w-full h-full relative bg-black/20">
                             <img src={w.data.url} className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center"><Gift className="text-slate-700 mb-2" size={32} /><span className="text-[10px] text-slate-600 font-bold uppercase">GIF</span></div>
                        )
                      )}
                      {w.type === WidgetType.TEXT && (
                        <div className="w-full h-full flex items-center justify-center p-2">
                          <p className="text-center font-bold pointer-events-none select-none break-words overflow-hidden leading-tight drop-shadow-lg" style={{ color: w.data.color, fontSize: w.data.fontSize }}>{w.data.content}</p>
                        </div>
                      )}
                      {w.type === WidgetType.CLOCK && (
                        <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none">
                          <LiveClock city={w.data.city} model={w.data.model} fontSize={w.data.fontSize?.replace('vw', '')} />
                        </div>
                      )}
                      {w.type === WidgetType.WEATHER && (
                        <div className="w-full h-full pointer-events-none">
                          <WeatherWidget 
                            city={w.data.city || 'Campina Grande'} 
                            model={w.data.model} 
                            config={w.data.weatherConfig}
                            backgroundImage={w.data.backgroundImage}
                          />
                        </div>
                      )}
                      {w.type === WidgetType.FULL_INFO && (
                        <div className="w-full h-full pointer-events-none">
                          <FullInfoWidget 
                            city={w.data.city || 'Campina Grande'} 
                            backgroundImage={w.data.backgroundImage}
                            backgroundAnimation={w.data.backgroundAnimation}
                            model={w.data.model}
                            textSize={w.data.textSize}
                            numberSize={w.data.numberSize}
                            transparentBackground={w.data.transparentBackground}
                            backgroundColor={w.data.backgroundColor}
                          />
                        </div>
                      )}
                      {w.type === WidgetType.RSS && (
                        <div className="w-full h-full pointer-events-none">
                           <RssFeed url={w.data.rssUrl || ''} config={w.data.rssConfig} />
                        </div>
                      )}
                      {w.type === WidgetType.CALENDAR && (
                        <div 
                          className="w-full h-full relative overflow-hidden p-2 rounded-xl"
                          style={{ 
                            backgroundColor: w.data.calendarConfig?.transparent ? 'transparent' : (w.data.calendarConfig?.backgroundColor || 'rgba(15, 23, 42, 0.5)'),
                            backdropFilter: w.data.calendarConfig?.transparent ? 'none' : 'blur(12px)',
                            border: w.data.calendarConfig?.transparent ? 'none' : '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                           <div className="absolute inset-0 z-10 bg-transparent"></div>
                           {w.data.calendarId ? (
                             <iframe 
                               src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(w.data.calendarId)}&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&bgcolor=${encodeURIComponent(w.data.calendarConfig?.backgroundColor || '#ffffff')}`} 
                               className="w-full h-full border-none pointer-events-none" 
                               style={{
                                 filter: w.data.calendarConfig?.theme === 'dark' ? 'invert(1) hue-rotate(180deg) contrast(1.2)' : 'none',
                                 mixBlendMode: w.data.calendarConfig?.transparent ? (w.data.calendarConfig?.theme === 'dark' ? 'screen' : 'multiply') : 'normal'
                               }}
                             />
                           ) : (
                             <div className="flex flex-col items-center justify-center h-full text-slate-500"><CalendarDays size={32} className="mb-2" /><span className="text-[10px] font-bold">AGENDA</span></div>
                           )}
                        </div>
                      )}
                      {w.type === WidgetType.IFRAME && (
                        <div className="w-full h-full relative bg-white overflow-hidden">
                           {/* Overlay invisível no Editor para permitir arrastar o widget sem interagir com o iframe */}
                           {!w.data.iframeConfig?.interactive && <div className="absolute inset-0 z-10 bg-transparent"></div>}
                           <iframe 
                             src={w.data.url} 
                             className="border-none" 
                             style={{
                               position: 'absolute',
                               top: 0,
                               left: 0,
                               width: w.data.iframeConfig?.viewportWidth ? `${w.data.iframeConfig.viewportWidth}px` : '100%',
                               height: w.data.iframeConfig?.viewportHeight ? `${w.data.iframeConfig.viewportHeight}px` : '100%',
                               transform: `scale(${w.data.iframeConfig?.scale || 1}) translate(${w.data.iframeConfig?.offsetX || 0}px, ${w.data.iframeConfig?.offsetY || 0}px)`,
                               transformOrigin: 'top left',
                               pointerEvents: w.data.iframeConfig?.interactive ? 'auto' : 'none'
                             }}
                             sandbox="allow-scripts allow-same-origin allow-forms"
                             title="Web Widget"
                             onLoad={handleYouTubeIframeLoad}
                           />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </GridLayout>
            </div>
          </div>
        </main>

        {/* Sidebar Right: Properties */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto z-[60] shadow-xl">
          {currentWidget ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="font-bold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider">
                   <Settings size={14} className="text-cyan-500" /> Configuração
                </h3>
                <button onClick={() => removeWidget(selectedWidget!)} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors" title="Remover Widget">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-5">
                
                {/* Background Animation Button */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <MonitorPlay size={12} /> Fundo Animado
                  </h4>
                  <button 
                    onClick={() => setShowBgAnimModal(true)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                  >
                    <MonitorPlay size={14} />
                    {currentWidget.data.backgroundAnimation && currentWidget.data.backgroundAnimation !== 'none' 
                      ? 'Alterar Animação' 
                      : 'Escolher Fundo Animado'}
                  </button>
                  {currentWidget.data.backgroundAnimation && currentWidget.data.backgroundAnimation !== 'none' && (
                    <button 
                      onClick={() => updateWidgetData(selectedWidget!, { backgroundAnimation: 'none' })}
                      className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 border border-slate-800 hover:border-rose-500/30 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      Remover Animação
                    </button>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                    <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-900 p-2 rounded border border-slate-800 hover:border-slate-600 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={currentWidget.data.transparentBackground || false} 
                        onChange={(e) => updateWidgetData(selectedWidget!, { transparentBackground: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      Fundo Transparente
                    </label>
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400">Cor de Fundo</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={currentWidget.data.backgroundColor || '#000000'} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { backgroundColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-none p-0 outline-none"
                        />
                      </div>
                    </div>
                    {/* Z-Index Control Block */}
                    <div className="flex flex-col gap-1 bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400">Camada (Z-Index)</span>
                      <div className="flex items-center gap-2">
                         <input 
                           type="number"
                           value={currentWidget.data.zIndex !== undefined ? currentWidget.data.zIndex : 10}
                           onChange={(e) => updateWidgetData(selectedWidget!, { zIndex: parseInt(e.target.value) || 0 })}
                           className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-cyan-500"
                           min="0"
                           max="999"
                         />
                      </div>
                      <p className="text-[8px] text-slate-500 mt-1 leading-tight">Painéis 'Completo' iniciam no fundo (0). Demais iniciam acima (10). Aumente para trazer para frente.</p>
                      <div className="flex items-center gap-2 mt-1">
                        {currentWidget.data.backgroundColor && (
                          <button 
                            onClick={() => updateWidgetData(selectedWidget!, { backgroundColor: undefined })}
                            className="text-[9px] text-rose-500 hover:text-rose-400"
                          >
                            Limpar Cor
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {currentWidget.type === WidgetType.VIDEO && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Link do Vídeo (YouTube ou MP4)</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.videoUrl} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { videoUrl: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                      placeholder="https://youtu.be/... ou https://.../video.mp4"
                    />
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-800"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-slate-900 px-2 text-slate-500 font-bold uppercase text-[9px]">ou</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setMediaLibraryConfig({
                          isOpen: true,
                          allowedTypes: 'video',
                          onSelect: (url) => {
                            updateWidgetData(selectedWidget!, { videoUrl: url });
                          }
                        });
                      }}
                      className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-all border border-slate-700 hover:border-slate-500 shadow-lg"
                    >
                      <Upload size={16} />
                      Selecionar Vídeo
                    </button>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.videoConfig?.autoplay !== false} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { videoConfig: { ...currentWidget.data.videoConfig, autoplay: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        Autoplay
                      </label>
                      <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.videoConfig?.mute !== false} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { videoConfig: { ...currentWidget.data.videoConfig, mute: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        Mudo
                      </label>
                      <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.videoConfig?.loop !== false} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { videoConfig: { ...currentWidget.data.videoConfig, loop: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        Loop
                      </label>
                      <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.videoConfig?.controls === true} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { videoConfig: { ...currentWidget.data.videoConfig, controls: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        Controles
                      </label>
                    </div>
                    
                    {isYouTubeUrl(currentWidget.data.videoUrl || '') && (
                      <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 mt-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Qualidade YouTube</label>
                        <select 
                          value={currentWidget.data.videoConfig?.youtubeQuality || 'highres'}
                          onChange={(e) => updateWidgetData(selectedWidget!, { videoConfig: { ...currentWidget.data.videoConfig, youtubeQuality: e.target.value } })}
                          className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-2 py-1 outline-none focus:border-cyan-500"
                        >
                          <option value="highres">Máxima (Auto)</option>
                          <option value="hd1080">1080p</option>
                          <option value="hd720">720p</option>
                          <option value="large">480p</option>
                          <option value="medium">360p</option>
                          <option value="small">240p</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
                {currentWidget.type === WidgetType.RSS && (
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <label className="text-[9px] font-black text-cyan-500 uppercase flex items-center gap-1 mb-2"><Rss size={10} /> Configuração de Feeds</label>
                      
                      <div className="mb-4 space-y-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Fonte do Feed</label>
                          <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-400 mb-2 outline-none focus:border-cyan-500 cursor-pointer hover:border-slate-600 transition-colors"
                            onChange={(e) => {
                               if (e.target.value) {
                                 updateWidgetData(selectedWidget!, { rssUrl: e.target.value });
                               }
                            }}
                            value=""
                          >
                            <option value="" disabled>⚡ Escolher Fonte Recomendada...</option>
                            {FEED_CATEGORIES.map((category, idx) => (
                              <optgroup key={idx} label={category.name}>
                                {category.feeds.map(feed => (
                                  <option key={feed.url} value={feed.url}>{feed.name}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>

                          <input 
                            type="text"
                            placeholder="URL do Feed RSS (Ex: https://...)"
                            value={currentWidget.data.rssUrl || currentWidget.data.rssFeeds?.[0]?.url || ''}
                            onChange={(e) => updateWidgetData(selectedWidget!, { rssUrl: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-[10px] text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono break-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1.5">Busca Automática (Google News)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Ex: Inteligência Artificial..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 placeholder:text-slate-600"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                if (target.value) {
                                  const newUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(target.value)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
                                  updateWidgetData(selectedWidget!, { rssUrl: newUrl });
                                }
                              }
                            }}
                            id="rss-search-input"
                          />
                          <button 
                            onClick={() => {
                              const input = document.getElementById('rss-search-input') as HTMLInputElement;
                              if (input && input.value) {
                                const newUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(input.value)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
                                updateWidgetData(selectedWidget!, { rssUrl: newUrl });
                              }
                            }}
                            className="bg-slate-800 hover:bg-cyan-600 text-slate-400 hover:text-white px-3 rounded-lg transition-colors border border-slate-700 hover:border-cyan-500"
                          >
                             <Search size={14} />
                          </button>
                        </div>
                        <p className="text-[8px] text-slate-600 mt-1.5">
                          Digite um tema e pressione Enter. O sistema buscará as últimas notícias sobre o assunto no Google News.
                        </p>
                      </div>

                    <div className="pt-4 border-t border-slate-800">
                       <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mb-2"><Settings size={10} /> Layout & Exibição</label>

                       <div className="mb-4">
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Tipo de Notícia (Imagens)</label>
                          <select 
                            value={currentWidget.data.rssConfig?.feedMode || 'default'}
                            onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, feedMode: e.target.value } })}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                          >
                             <option value="default">Padrão (Misturado - com ou sem imagem)</option>
                             <option value="require-image">Obrigatório Ter Imagem (Pula se não tiver)</option>
                             <option value="text-only">Somente Texto (Oculta imagens, ideal para letreiro)</option>
                          </select>
                       </div>
                       
                       <div className="grid grid-cols-3 gap-2 mb-3">
                          <button 
                            onClick={() => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, layout: 'full-image' } })}
                            className={`p-2 rounded border text-[9px] font-bold uppercase transition-all flex flex-col items-center gap-1 ${currentWidget.data.rssConfig?.layout === 'full-image' || !currentWidget.data.rssConfig?.layout ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                          >
                            <div className="w-full h-4 bg-current opacity-50 rounded-sm"></div>
                            Full Imagem
                          </button>
                          <button 
                            onClick={() => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, layout: 'split' } })}
                            className={`p-2 rounded border text-[9px] font-bold uppercase transition-all flex flex-col items-center gap-1 ${currentWidget.data.rssConfig?.layout === 'split' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                          >
                            <div className="flex flex-col gap-0.5 w-full h-4">
                               <div className="h-2 bg-current opacity-50 rounded-sm w-full"></div>
                               <div className="h-1.5 bg-current opacity-30 rounded-sm w-full"></div>
                            </div>
                            Dividido
                          </button>
                          <button 
                            onClick={() => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, layout: 'ticker' } })}
                            className={`p-2 rounded border text-[9px] font-bold uppercase transition-all flex flex-col items-center gap-1 ${currentWidget.data.rssConfig?.layout === 'ticker' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                          >
                            <div className="w-full h-4 flex items-center justify-center border border-current opacity-50 rounded-sm">
                               <div className="w-full h-1 bg-current rounded-full"></div>
                            </div>
                            Faixa / Banner
                          </button>
                       </div>

                       {/* Typography & Colors - Visible for all RSS layouts */}
                       <div className="mt-3 mb-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
                          <label className="text-[9px] font-black text-indigo-400 uppercase flex items-center gap-1 mb-1"><Palette size={10} /> Estilo do Texto</label>
                          
                          <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="text-[8px] text-slate-500 uppercase block mb-1">Tamanho Título</label>
                                <select 
                                  value={currentWidget.data.rssConfig?.titleSize || 'normal'}
                                  onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, titleSize: e.target.value } })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                                >
                                   <option value="small">Pequeno</option>
                                   <option value="normal">Normal</option>
                                   <option value="large">Grande</option>
                                   <option value="xl">Extra Grande</option>
                                </select>
                             </div>
                             <div>
                                <label className="text-[8px] text-slate-500 uppercase block mb-1">Tamanho Descrição</label>
                                <select 
                                  value={currentWidget.data.rssConfig?.descriptionSize || 'normal'}
                                  onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, descriptionSize: e.target.value } })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                                >
                                   <option value="small">Pequeno</option>
                                   <option value="normal">Normal</option>
                                   <option value="large">Grande</option>
                                   <option value="xl">Extra Grande</option>
                                </select>
                             </div>
                          </div>
                          
                          <div>
                             <label className="text-[8px] text-slate-500 uppercase block mb-1">Fonte / Tipografia</label>
                             <select 
                               value={currentWidget.data.rssConfig?.fontFamily || 'sans'}
                               onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, fontFamily: e.target.value } })}
                               className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                             >
                                <option value="sans">Padrão (Sans)</option>
                                <option value="serif">Serif</option>
                                <option value="mono">Monospace</option>
                                <option value="display">Display (Impact)</option>
                             </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                             <div>
                                <label className="text-[8px] text-slate-500 uppercase block mb-1">Cor Título</label>
                                <div className="flex items-center gap-2">
                                   <input 
                                     type="color" 
                                     value={currentWidget.data.rssConfig?.titleColor || '#ffffff'}
                                     onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, titleColor: e.target.value } })}
                                     className="w-8 h-8 rounded bg-transparent border-none cursor-pointer"
                                   />
                                   <span className="text-[9px] text-slate-400 font-mono">{currentWidget.data.rssConfig?.titleColor || '#ffffff'}</span>
                                </div>
                             </div>
                             <div>
                                <label className="text-[8px] text-slate-500 uppercase block mb-1">Cor Texto</label>
                                <div className="flex items-center gap-2">
                                   <input 
                                     type="color" 
                                     value={currentWidget.data.rssConfig?.textColor || '#94a3b8'}
                                     onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, textColor: e.target.value } })}
                                     className="w-8 h-8 rounded bg-transparent border-none cursor-pointer"
                                   />
                                   <span className="text-[9px] text-slate-400 font-mono">{currentWidget.data.rssConfig?.textColor || '#94a3b8'}</span>
                                </div>
                             </div>
                          </div>
                       </div>

                       {currentWidget.data.rssConfig?.layout === 'split' && (
                          <div className="mt-3 mb-3 p-2 bg-slate-900/50 rounded border border-slate-800 space-y-3">
                             <div className="flex items-center gap-2">
                               <input 
                                 type="checkbox" 
                                 id="rss-show-full"
                                 checked={currentWidget.data.rssConfig?.showFullContent || false} 
                                 onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, showFullContent: e.target.checked } })}
                                 className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 w-3 h-3"
                               />
                               <label htmlFor="rss-show-full" className="text-[9px] font-bold text-slate-400 uppercase cursor-pointer select-none">
                                 Exibir conteúdo completo
                                </label>
                             </div>
                             <p className="text-[8px] text-slate-600 pl-5 leading-tight">
                                Ajusta o card para exibir mais texto e evita cortes, preenchendo o espaço disponível.
                             </p>

                             {/* Marquee Settings */}
                             <div className="pt-2 border-t border-slate-800/50">
                                <div className="flex items-center gap-2 mb-2">
                                   <input 
                                     type="checkbox" 
                                     id="rss-marquee"
                                     checked={currentWidget.data.rssConfig?.enableMarquee || false} 
                                     onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, enableMarquee: e.target.checked } })}
                                     className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 w-3 h-3"
                                   />
                                   <label htmlFor="rss-marquee" className="text-[9px] font-bold text-slate-400 uppercase cursor-pointer select-none flex items-center gap-1">
                                     <MoveHorizontal size={10} /> Animação Lateral (Marquee)
                                   </label>
                                </div>
                                
                                {currentWidget.data.rssConfig?.enableMarquee && (
                                   <div className="pl-5 space-y-2">
                                      <div>
                                         <label className="text-[8px] text-slate-500 uppercase block mb-1">Velocidade: {currentWidget.data.rssConfig?.marqueeSpeed || 50}</label>
                                         <input 
                                           type="range" 
                                           min="10" 
                                           max="100" 
                                           step="5"
                                           value={currentWidget.data.rssConfig?.marqueeSpeed || 50}
                                           onChange={(e) => updateWidgetData(selectedWidget!, { rssConfig: { ...currentWidget.data.rssConfig, marqueeSpeed: parseInt(e.target.value) } })}
                                           className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                         />
                                      </div>
                                   </div>
                                )}
                             </div>
                          </div>
                       )}

                       <p className="text-[8px] text-slate-600 mt-2 leading-relaxed">
                         O modo "Faixa / Banner" utiliza o visual Full Imagem otimizado para ocupar toda a largura da tela (redimensione o widget na grade).
                       </p>

                       <div className="mt-4 pt-4 border-t border-slate-800">
                          <button 
                            onClick={setFullScreen}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                          >
                            <Maximize2 size={14} />
                            Preencher Tela Inteira
                          </button>
                          <p className="text-[8px] text-slate-500 mt-2 text-center leading-relaxed">
                            Atenção: Isso removerá todos os outros widgets desta cena e deixará o widget ocupando 100% da tela como fundo.
                          </p>
                       </div>
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.WEATHER && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><CloudSun size={10} /> Cidade e Estado</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.city || ''} 
                      onChange={(e) => {
                        const newCity = e.target.value;
                        const updates: any = { city: newCity };
                        if (currentWidget.data.model === 'glass' && newCity.length > 3) {
                           updates.backgroundImage = `https://image.pollinations.ai/prompt/view%20of%20${encodeURIComponent(newCity)}%20city%20skyline%20weather%20background`;
                        }
                        updateWidgetData(selectedWidget!, updates);
                      }} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono mb-2" 
                      placeholder="Ex: São Paulo, SP"
                    />
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-400 outline-none focus:border-cyan-500 cursor-pointer mb-2"
                      onChange={(e) => {
                        if (e.target.value) {
                          const newCity = e.target.value;
                          const updates: any = { city: newCity };
                          if (currentWidget.data.model === 'glass') {
                             updates.backgroundImage = `https://image.pollinations.ai/prompt/view%20of%20${encodeURIComponent(newCity)}%20city%20skyline%20weather%20background`;
                          }
                          updateWidgetData(selectedWidget!, updates);
                        }
                      }}
                      value=""
                    >
                      <option value="" disabled>📍 Selecionar cidade popular...</option>
                      <optgroup label="Paraíba">
                        <option value="Campina Grande, PB">Campina Grande, PB</option>
                        <option value="João Pessoa, PB">João Pessoa, PB</option>
                      </optgroup>
                      <optgroup label="Capitais Brasileiras">
                        <option value="São Paulo, SP">São Paulo, SP</option>
                        <option value="Rio de Janeiro, RJ">Rio de Janeiro, RJ</option>
                        <option value="Brasília, DF">Brasília, DF</option>
                        <option value="Salvador, BA">Salvador, BA</option>
                        <option value="Fortaleza, CE">Fortaleza, CE</option>
                        <option value="Belo Horizonte, MG">Belo Horizonte, MG</option>
                        <option value="Manaus, AM">Manaus, AM</option>
                        <option value="Curitiba, PR">Curitiba, PR</option>
                        <option value="Recife, PE">Recife, PE</option>
                        <option value="Porto Alegre, RS">Porto Alegre, RS</option>
                        <option value="Belém, PA">Belém, PA</option>
                        <option value="Goiânia, GO">Goiânia, GO</option>
                        <option value="Florianópolis, SC">Florianópolis, SC</option>
                        <option value="Vitória, ES">Vitória, ES</option>
                      </optgroup>
                      <optgroup label="Mundo">
                        <option value="New York">Nova York, EUA</option>
                        <option value="London">Londres, UK</option>
                        <option value="Paris">Paris, França</option>
                        <option value="Tokyo">Tóquio, Japão</option>
                        <option value="Lisbon">Lisboa, Portugal</option>
                      </optgroup>
                    </select>
                    
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-4"><Settings size={10} /> Modelo Visual</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                      value={currentWidget.data.model || 'simple'}
                      onChange={(e) => {
                        const newModel = e.target.value;
                        const updates: any = { model: newModel };
                        if (newModel === 'glass') {
                           const city = currentWidget.data.city || 'Campina Grande';
                           updates.backgroundImage = `https://image.pollinations.ai/prompt/view%20of%20${encodeURIComponent(city)}%20city%20skyline%20weather%20background`;
                        }
                        updateWidgetData(selectedWidget!, updates);
                      }}
                    >
                      <option value="simple">Simples (Ícone + Temp)</option>
                      <option value="detailed">Detalhado (Completo)</option>
                      <option value="minimal">Minimalista (Texto)</option>
                      <option value="glass">Glassmorphism (Moderno)</option>
                      <option value="forecast">Previsão (3 Dias)</option>
                      <option value="windows">Windows (Gráfico)</option>
                      <option value="weekly">Semanal (7 Dias)</option>
                    </select>
                    
                    {currentWidget.data.model === 'windows' && (
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <label className="block text-xs font-medium text-slate-400 mb-2">Exibição do Gráfico</label>
                        <select
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                          value={currentWidget.data.windowsView || 'precipitation'}
                          onChange={(e) => updateWidgetData(selectedWidget!, { windowsView: e.target.value })}
                        >
                          <option value="precipitation">Precipitação</option>
                          <option value="hourly">De hora em hora (Temperatura)</option>
                          <option value="daily">Diariamente (Máx/Mín)</option>
                        </select>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-slate-800">
                       <SizeInput 
                         label="Escala Geral (Tamanho)"
                         value={currentWidget.data.weatherConfig?.baseFontSize}
                         onChange={(val) => updateWidgetData(selectedWidget!, { weatherConfig: { ...currentWidget.data.weatherConfig, baseFontSize: val } })}
                         placeholder="1cqw"
                         step={0.1}
                       />
                    </div>
                    
                    <p className="text-[9px] text-slate-600 leading-relaxed mt-2">
                      Ajuste o tamanho de todos os elementos do widget de uma só vez. Use 'cqw' para tamanho relativo ou 'px' para fixo.
                    </p>
                  </div>
                )}
                {currentWidget.type === WidgetType.FULL_INFO && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><CloudSun size={10} /> Cidade e Estado</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.city || ''} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { city: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono mb-2" 
                      placeholder="Ex: São Paulo, SP"
                    />
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-400 outline-none focus:border-cyan-500 cursor-pointer mb-2"
                      onChange={(e) => {
                        if (e.target.value) {
                          updateWidgetData(selectedWidget!, { city: e.target.value });
                        }
                      }}
                      value=""
                    >
                      <option value="" disabled>📍 Selecionar cidade popular...</option>
                      <optgroup label="Paraíba">
                        <option value="Campina Grande, PB">Campina Grande, PB</option>
                        <option value="João Pessoa, PB">João Pessoa, PB</option>
                      </optgroup>
                      <optgroup label="Capitais Brasileiras">
                        <option value="São Paulo, SP">São Paulo, SP</option>
                        <option value="Rio de Janeiro, RJ">Rio de Janeiro, RJ</option>
                        <option value="Brasília, DF">Brasília, DF</option>
                        <option value="Salvador, BA">Salvador, BA</option>
                        <option value="Fortaleza, CE">Fortaleza, CE</option>
                        <option value="Belo Horizonte, MG">Belo Horizonte, MG</option>
                        <option value="Manaus, AM">Manaus, AM</option>
                        <option value="Curitiba, PR">Curitiba, PR</option>
                        <option value="Recife, PE">Recife, PE</option>
                        <option value="Porto Alegre, RS">Porto Alegre, RS</option>
                        <option value="Belém, PA">Belém, PA</option>
                        <option value="Goiânia, GO">Goiânia, GO</option>
                        <option value="Florianópolis, SC">Florianópolis, SC</option>
                        <option value="Vitória, ES">Vitória, ES</option>
                      </optgroup>
                    </select>

                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-4"><Settings size={10} /> Modelo Visual</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                      value={currentWidget.data.model || 'standard'}
                      onChange={(e) => updateWidgetData(selectedWidget!, { model: e.target.value })}
                    >
                      <option value="standard">Padrão</option>
                      <option value="minimal">Minimalista</option>
                      <option value="glass">Glassmorphism</option>
                      <option value="modern">Moderno (Dividido)</option>
                    </select>

                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-4"><ImageIcon size={10} /> Imagem de Fundo (Opcional)</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.backgroundImage || ''} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { backgroundImage: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                      placeholder="URL da imagem (ex: https://...)"
                    />
                    <p className="text-[9px] text-slate-600 leading-relaxed mt-1">
                      Dica: Se deixar vazio, usará a animação de fundo selecionada na aba "Aparência".
                    </p>

                    <div className="space-y-4 mt-4 pt-4 border-t border-slate-800">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">Tamanho dos Textos</label>
                          <span className="text-[10px] font-mono text-cyan-500">{currentWidget.data.textSize || 100}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="50" 
                          max="200" 
                          step="5"
                          value={currentWidget.data.textSize || 100} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { textSize: parseInt(e.target.value) })}
                          className="w-full accent-cyan-500"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">Tamanho dos Números</label>
                          <span className="text-[10px] font-mono text-cyan-500">{currentWidget.data.numberSize || 100}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="50" 
                          max="300" 
                          step="5"
                          value={currentWidget.data.numberSize || 100} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { numberSize: parseInt(e.target.value) })}
                          className="w-full accent-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <button 
                        onClick={setFullScreen}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                      >
                        <Maximize2 size={14} />
                        Preencher Tela Inteira
                      </button>
                      <p className="text-[8px] text-slate-500 mt-2 text-center leading-relaxed">
                        Atenção: Isso removerá todos os outros widgets desta cena e deixará o widget ocupando 100% da tela como fundo.
                      </p>
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.CLOCK && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Clock size={10} /> Cidade (Opcional)</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.city || ''} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { city: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono mb-2" 
                      placeholder="Ex: Londres, Tóquio..."
                    />
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-400 outline-none focus:border-cyan-500 cursor-pointer mb-2"
                      onChange={(e) => {
                        if (e.target.value) {
                          updateWidgetData(selectedWidget!, { city: e.target.value });
                        }
                      }}
                      value=""
                    >
                      <option value="" disabled>📍 Selecionar cidade popular...</option>
                      <optgroup label="Nordeste">
                        <option value="João Pessoa, PB">João Pessoa, PB</option>
                        <option value="Recife, PE">Recife, PE</option>
                        <option value="Salvador, BA">Salvador, BA</option>
                        <option value="Fortaleza, CE">Fortaleza, CE</option>
                        <option value="Natal, RN">Natal, RN</option>
                        <option value="Maceió, AL">Maceió, AL</option>
                        <option value="Aracaju, SE">Aracaju, SE</option>
                        <option value="São Luís, MA">São Luís, MA</option>
                        <option value="Teresina, PI">Teresina, PI</option>
                      </optgroup>
                      <optgroup label="Capitais Brasileiras">
                        <option value="São Paulo, SP">São Paulo, SP</option>
                        <option value="Rio de Janeiro, RJ">Rio de Janeiro, RJ</option>
                        <option value="Brasília, DF">Brasília, DF</option>
                        <option value="Belo Horizonte, MG">Belo Horizonte, MG</option>
                        <option value="Manaus, AM">Manaus, AM</option>
                        <option value="Curitiba, PR">Curitiba, PR</option>
                        <option value="Porto Alegre, RS">Porto Alegre, RS</option>
                        <option value="Belém, PA">Belém, PA</option>
                        <option value="Goiânia, GO">Goiânia, GO</option>
                        <option value="Florianópolis, SC">Florianópolis, SC</option>
                        <option value="Vitória, ES">Vitória, ES</option>
                      </optgroup>
                      <optgroup label="Mundo">
                        <option value="New York">Nova York, EUA</option>
                        <option value="London">Londres, UK</option>
                        <option value="Paris">Paris, França</option>
                        <option value="Tokyo">Tóquio, Japão</option>
                        <option value="Lisbon">Lisboa, Portugal</option>
                      </optgroup>
                    </select>
                    
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-4"><Settings size={10} /> Estilo do Relógio</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                      value={currentWidget.data.model || 'standard'}
                      onChange={(e) => updateWidgetData(selectedWidget!, { model: e.target.value })}
                    >
                      <option value="standard">Padrão (HH:MM:SS)</option>
                      <option value="minimal">Minimalista (HH:MM)</option>
                      <option value="date-time">Data e Hora (Completo)</option>
                      <option value="analog">Analógico (Ponteiros)</option>
                      <option value="neon">Neon (Brilhante)</option>
                      <option value="vertical">Vertical (Empilhado)</option>
                    </select>

                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-4"><Type size={10} /> Tamanho da Fonte</label>
                    <input 
                      type="range" 
                      min="2" 
                      max="30" 
                      value={parseInt(currentWidget.data.fontSize?.replace('vw', '') || '8')} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { fontSize: `${e.target.value}vw` })} 
                      className="w-full accent-cyan-500" 
                    />
                    <div className="flex justify-between text-[8px] text-slate-500 mt-1 font-mono">
                      <span>Pequeno</span>
                      <span>Grande</span>
                    </div>

                    <p className="text-[9px] text-slate-600 leading-relaxed mt-2">
                      Se definido, o relógio mostrará o horário local dessa cidade. Caso contrário, mostrará o horário do sistema.
                    </p>
                  </div>
                )}
                {currentWidget.type === WidgetType.CALENDAR && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Calendar size={10} /> ID do Google Calendar</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.calendarId || ''} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { calendarId: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                      placeholder="Ex: pt.brazilian#holiday@group.v.calendar.google.com"
                    />
                    <p className="text-[9px] text-slate-600 leading-relaxed">
                      Para obter o ID: Abra o Google Calendar {'>'} Configurações {'>'} Selecione a agenda {'>'} Integrar agenda {'>'} Copie o "ID da agenda".
                      <br/><span className="text-yellow-600">Importante:</span> A agenda deve estar configurada como "Pública".
                    </p>

                    <div className="border-t border-slate-800 pt-4 mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="show-cal-title"
                          checked={currentWidget.data.calendarConfig?.showTitle ?? !!currentWidget.data.calendarConfig?.customTitle} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, showTitle: e.target.checked } })}
                          className="accent-cyan-500 w-4 h-4 rounded border-slate-700 bg-slate-900 focus:ring-0"
                        />
                        <label htmlFor="show-cal-title" className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 cursor-pointer select-none">
                          <Type size={10} /> Exibir Título Personalizado
                        </label>
                      </div>

                      {(currentWidget.data.calendarConfig?.showTitle ?? !!currentWidget.data.calendarConfig?.customTitle) && (
                        <div className="space-y-3 pl-2 border-l-2 border-slate-800 ml-1">
                          <input 
                            type="text" 
                            value={currentWidget.data.calendarConfig?.customTitle || ''} 
                            onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, customTitle: e.target.value } })} 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                            placeholder="Ex: Reuniões da Diretoria"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                               <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Cor do Título</label>
                               <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded p-1">
                                 <input 
                                   type="color" 
                                   value={currentWidget.data.calendarConfig?.titleColor || '#ffffff'}
                                   onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, titleColor: e.target.value } })}
                                   className="w-6 h-6 bg-transparent border-none rounded cursor-pointer"
                                 />
                                 <span className="text-[10px] font-mono text-slate-400">{currentWidget.data.calendarConfig?.titleColor || '#ffffff'}</span>
                               </div>
                            </div>
                            <div>
                               <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Tamanho Título</label>
                               <select 
                                 className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200 outline-none h-[34px]"
                                 value={currentWidget.data.calendarConfig?.titleSize || '1.5rem'}
                                 onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, titleSize: e.target.value } })}
                               >
                                 <option value="1rem">Pequeno</option>
                                 <option value="1.5rem">Médio</option>
                                 <option value="2rem">Grande</option>
                                 <option value="3rem">Gigante</option>
                               </select>
                            </div>
                          </div>
                        </div>
                      )}

                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-2"><Palette size={10} /> Tema Visual</label>
                      <select 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                        value={currentWidget.data.calendarConfig?.theme || 'light'}
                        onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, theme: e.target.value as any } })}
                      >
                        <option value="light">Claro (Padrão)</option>
                        <option value="dark">Escuro (Invertido)</option>
                        <option value="glass">Glassmorphism (Transparente)</option>
                        <option value="minimal">Minimalista (Limpo)</option>
                        <option value="neon">Neon (Cyberpunk)</option>
                        <option value="card">Cartão (Sombreado)</option>
                      </select>

                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1 mt-2"><Settings size={10} /> Estilização Avançada</label>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.calendarConfig?.transparent || false} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, transparent: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        Modo Transparente (Blend)
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Cor de Fundo (Se não transparente)</label>
                           <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded p-1">
                             <input 
                               type="color" 
                               value={currentWidget.data.calendarConfig?.backgroundColor || '#ffffff'}
                               onChange={(e) => updateWidgetData(selectedWidget!, { calendarConfig: { ...currentWidget.data.calendarConfig, backgroundColor: e.target.value } })}
                               className="w-6 h-6 bg-transparent border-none rounded cursor-pointer"
                             />
                             <span className="text-[10px] font-mono text-slate-400">{currentWidget.data.calendarConfig?.backgroundColor || '#ffffff'}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.IFRAME && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Globe size={10} /> URL do Website</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.url} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { url: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                      placeholder="https://..."
                    />
                    <p className="text-[9px] text-slate-600 leading-relaxed border-l-2 border-yellow-600 pl-2">
                      Nota: Se aparecer um ícone de "erro" ou a tela ficar cinza, o site possui proteção (X-Frame-Options) e não permite ser exibido dentro do player. Isso é uma trava de segurança do próprio site.
                    </p>

                    <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
                      <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Settings size={10} /> Enquadramento e Interação</label>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600 mb-3">
                        <input 
                          type="checkbox" 
                          checked={currentWidget.data.iframeConfig?.interactive || false} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, interactive: e.target.checked } })}
                          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-300">Permitir Interação / Login</span>
                          <span className="text-[8px] text-slate-500">Ative para fazer login ou navegar. O login será salvo no navegador do player.</span>
                        </div>
                      </div>
                      
                      <p className="text-[8px] text-slate-500 leading-relaxed mb-3 pl-1">
                        * Para manter o login salvo, certifique-se de que o navegador do player aceita cookies de terceiros.
                      </p>

                      <p className="text-[8px] text-yellow-500 leading-relaxed bg-yellow-500/10 p-2 rounded border border-yellow-500/20 mb-3">
                        Para enquadrar uma área específica que será salva e exibida na TV, use os controles de <b>Zoom</b> e <b>Posição X/Y</b> abaixo.
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Largura (px)</label>
                           <input 
                             type="number" 
                             className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200 outline-none"
                             value={currentWidget.data.iframeConfig?.viewportWidth || 1920}
                             onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, viewportWidth: parseInt(e.target.value) } })}
                           />
                        </div>
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Altura (px)</label>
                           <input 
                             type="number" 
                             className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200 outline-none"
                             value={currentWidget.data.iframeConfig?.viewportHeight || 1080}
                             onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, viewportHeight: parseInt(e.target.value) } })}
                           />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Zoom (Escala)</label>
                        <input 
                          type="range" 
                          min="0.1" max="3" step="0.1"
                          className="w-full accent-cyan-500"
                          value={currentWidget.data.iframeConfig?.scale || 1}
                          onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, scale: parseFloat(e.target.value) } })}
                        />
                        <div className="text-right text-[9px] font-mono text-cyan-400">{currentWidget.data.iframeConfig?.scale || 1}x</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Posição X</label>
                           <input 
                             type="number" 
                             className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200 outline-none"
                             value={currentWidget.data.iframeConfig?.offsetX || 0}
                             onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, offsetX: parseInt(e.target.value) } })}
                           />
                        </div>
                        <div>
                           <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Posição Y</label>
                           <input 
                             type="number" 
                             className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] text-slate-200 outline-none"
                             value={currentWidget.data.iframeConfig?.offsetY || 0}
                             onChange={(e) => updateWidgetData(selectedWidget!, { iframeConfig: { ...currentWidget.data.iframeConfig, offsetY: parseInt(e.target.value) } })}
                           />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.IMAGE && (
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        setMediaLibraryConfig({
                          isOpen: true,
                          allowedTypes: 'image',
                          onSelect: (url) => {
                            updateWidgetData(selectedWidget!, { url: url });
                          }
                        });
                      }}
                      className="w-full py-3 bg-slate-800 text-slate-300 rounded-lg font-bold text-xs hover:bg-slate-700 hover:text-white transition-all border border-slate-700 hover:border-cyan-500 flex items-center justify-center gap-2"
                    >
                      <Upload size={14} /> 
                      Selecionar Imagem
                    </button>
                    <div className="text-center text-[9px] text-slate-600 font-bold uppercase">- OU -</div>
                    <input type="text" placeholder="URL da imagem..." value={currentWidget.data.url} onChange={(e) => updateWidgetData(selectedWidget!, { url: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-[10px] text-slate-200 outline-none focus:border-cyan-500" />
                    
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Largura (px)</label>
                        <input 
                          type="number" 
                          placeholder="Auto" 
                          value={currentWidget.data.width || ''} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { width: e.target.value })} 
                          className="w-full h-9 bg-slate-950 border border-slate-700 rounded px-2 text-xs text-slate-200 outline-none focus:border-cyan-500" 
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Altura (px)</label>
                        <input 
                          type="number" 
                          placeholder="Auto" 
                          value={currentWidget.data.height || ''} 
                          onChange={(e) => updateWidgetData(selectedWidget!, { height: e.target.value })} 
                          className="w-full h-9 bg-slate-950 border border-slate-700 rounded px-2 text-xs text-slate-200 outline-none focus:border-cyan-500" 
                        />
                      </div>
                    </div>
                  </div>
                )}
                {currentWidget.type === WidgetType.GIF && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Gift size={10} /> URL do GIF</label>
                    <input 
                      type="text" 
                      value={currentWidget.data.url} 
                      onChange={(e) => updateWidgetData(selectedWidget!, { url: e.target.value })} 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 transition-all font-mono" 
                      placeholder="https://media.giphy.com/..."
                    />
                    <div className="flex gap-2">
                      <a 
                        href="https://giphy.com/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold text-[10px] hover:bg-slate-700 hover:text-white transition-all border border-slate-700 hover:border-cyan-500 flex items-center justify-center gap-1 uppercase"
                      >
                        Buscar no Giphy <LinkIcon size={10} />
                      </a>
                    </div>
                    <p className="text-[9px] text-slate-600 leading-relaxed">
                      Copie o "GIF Link" do Giphy ou outra fonte e cole acima.
                    </p>
                  </div>
                )}
                {currentWidget.type === WidgetType.TEXT && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase mb-2 block">Conteúdo</label>
                      <textarea 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-cyan-500 font-medium resize-none" 
                        rows={3} 
                        value={currentWidget.data.content} 
                        onChange={(e) => updateWidgetData(selectedWidget!, { content: e.target.value })} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <SizeInput 
                        label="Tamanho da Fonte"
                        value={currentWidget.data.textConfig?.fontSize || currentWidget.data.fontSize} // Fallback to old fontSize
                        onChange={(val) => updateWidgetData(selectedWidget!, { textConfig: { ...currentWidget.data.textConfig, fontSize: val } })}
                        placeholder="4cqw"
                        step={0.5}
                      />
                      
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase mb-1.5 block">Cor</label>
                        <div className="flex gap-2 h-[34px]">
                           <input 
                             type="color" 
                             value={currentWidget.data.color || '#ffffff'} 
                             onChange={(e) => updateWidgetData(selectedWidget!, { color: e.target.value })} 
                             className="h-full w-10 bg-transparent border-0 cursor-pointer rounded overflow-hidden p-0" 
                           />
                           <input 
                             type="text" 
                             value={currentWidget.data.color || '#ffffff'} 
                             onChange={(e) => updateWidgetData(selectedWidget!, { color: e.target.value })} 
                             className="w-full bg-slate-950 border border-slate-700 rounded text-[10px] text-slate-300 px-2 uppercase font-mono outline-none focus:border-cyan-500" 
                           />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase mb-1.5 block">Fonte</label>
                        <select 
                          className="w-full bg-slate-950 border border-slate-700 rounded h-[34px] px-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                          value={currentWidget.data.textConfig?.fontFamily || 'Inter'}
                          onChange={(e) => updateWidgetData(selectedWidget!, { textConfig: { ...currentWidget.data.textConfig, fontFamily: e.target.value } })}
                        >
                          <optgroup label="Padrão">
                            <option value="Inter">Inter (Padrão)</option>
                            <option value="Roboto">Roboto</option>
                          </optgroup>
                          <optgroup label="Moderno / Minimalista">
                            <option value="Outfit">Outfit</option>
                            <option value="Manrope">Manrope</option>
                            <option value="Syncopate">Syncopate</option>
                          </optgroup>
                          <optgroup label="Tech / Futurista">
                            <option value="Space Grotesk">Space Grotesk</option>
                            <option value="Orbitron">Orbitron</option>
                            <option value="Rajdhani">Rajdhani</option>
                            <option value="Share Tech Mono">Share Tech Mono</option>
                            <option value="JetBrains Mono">JetBrains Mono</option>
                          </optgroup>
                          <optgroup label="Clássico / Serif">
                            <option value="Playfair Display">Playfair Display</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Open Sans">Open Sans</option>
                            <option value="Courier New">Courier New</option>
                          </optgroup>
                        </select>
                      </div>

                      <div>
                         <label className="text-[9px] font-black text-slate-500 uppercase mb-1.5 block">Animação</label>
                         <select 
                           className="w-full bg-slate-950 border border-slate-700 rounded h-[34px] px-2 text-[10px] text-slate-300 outline-none focus:border-cyan-500"
                           value={currentWidget.data.textConfig?.animation || 'none'}
                           onChange={(e) => updateWidgetData(selectedWidget!, { textConfig: { ...currentWidget.data.textConfig, animation: e.target.value as any } })}
                         >
                           <option value="none">Nenhuma</option>
                           <option value="fade">Fade In</option>
                           <option value="slide">Slide Up</option>
                           <option value="typewriter">Datilografia</option>
                           <option value="pulse">Pulsar</option>
                           <option value="bounce">Saltar</option>
                         </select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-800">
                      <button 
                        onClick={() => updateWidgetData(selectedWidget!, { textConfig: { ...currentWidget.data.textConfig, fontWeight: currentWidget.data.textConfig?.fontWeight === 'bold' ? 'normal' : 'bold' } })}
                        className={`flex-1 h-8 rounded text-[10px] font-bold uppercase transition-colors ${currentWidget.data.textConfig?.fontWeight === 'bold' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-950 text-slate-500 border border-slate-800 hover:bg-slate-900'}`}
                      >
                        Negrito
                      </button>
                      <button 
                        onClick={() => updateWidgetData(selectedWidget!, { textConfig: { ...currentWidget.data.textConfig, fontStyle: currentWidget.data.textConfig?.fontStyle === 'italic' ? 'normal' : 'italic' } })}
                        className={`flex-1 h-8 rounded text-[10px] font-bold uppercase transition-colors ${currentWidget.data.textConfig?.fontStyle === 'italic' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-950 text-slate-500 border border-slate-800 hover:bg-slate-900'}`}
                      >
                        Itálico
                      </button>
                    </div>
                    
                    <div className="flex bg-slate-950 rounded border border-slate-800 p-1">
                      {['left', 'center', 'right'].map((align) => (
                        <button
                          key={align}
                          onClick={() => updateWidgetData(selectedWidget!, { textConfig: { ...currentWidget.data.textConfig, textAlign: align as any } })}
                          className={`flex-1 py-1 rounded text-[10px] uppercase font-bold transition-colors ${currentWidget.data.textConfig?.textAlign === align || (!currentWidget.data.textConfig?.textAlign && align === 'center') ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          {align === 'left' ? 'Esq' : align === 'center' ? 'Centro' : 'Dir'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-6 border-t border-slate-800 mt-auto">
                  <h4 className="text-[9px] font-black text-slate-600 uppercase mb-3">Geometria</h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between"><span>W:</span> <span className="text-cyan-500">{currentWidget.w}</span></div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between"><span>H:</span> <span className="text-cyan-500">{currentWidget.h}</span></div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between"><span>X:</span> <span className="text-cyan-500">{currentWidget.x}</span></div>
                    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between"><span>Y:</span> <span className="text-cyan-500">{currentWidget.y}</span></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-700 py-10 opacity-50">
              <Move size={48} className="mb-4 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Selecione um elemento<br/>para editar</p>
            </div>
          )}
        </aside>
      </div>

      {mediaLibraryConfig?.isOpen && (
        <MediaLibrary 
          onClose={() => setMediaLibraryConfig(null)} 
          onSelect={mediaLibraryConfig.onSelect}
          allowedTypes={mediaLibraryConfig.allowedTypes}
        />
      )}
    </div>
  );
};

const WidgetTool = ({ icon, label, onClick }: any) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all group">
    <div className="text-slate-500 group-hover:text-cyan-400 mb-2 transition-colors">{icon}</div>
    <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-200 uppercase tracking-wider transition-colors">{label}</span>
  </button>
);

export default Editor;
