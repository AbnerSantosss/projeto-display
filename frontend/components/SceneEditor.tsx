
import React, { useState, useEffect, useRef } from 'react';
import RGL, { WidthProvider } from 'react-grid-layout';
import { 
  Plus, Trash2, X,
  Image as ImageIcon, Type, CloudSun, Clock, Calendar, CalendarDays,
  Settings, Layers, Move, Upload, Link as LinkIcon, CheckCircle2,
  Maximize2, Film, Info, Loader2, MonitorPlay, Rss, Globe, Gift, Search, Palette, Map, Layout, MoveHorizontal
} from 'lucide-react';
import { uploadMedia } from '../services/storage';
import { Page, WidgetType, LayoutItem, WidgetData } from '../types';
import { LiveClock, WeatherWidget, RssFeed, FullInfoWidget } from './Player';
import { SizeInput } from './SizeInput';
import { MediaLibrary } from './MediaLibrary';

const GridLayout = WidthProvider(RGL);

interface SceneEditorProps {
  page: Page;
  onChange: (page: Page) => void;
}

const SceneEditor: React.FC<SceneEditorProps> = ({ page, onChange }) => {
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [showBgAnimModal, setShowBgAnimModal] = useState(false);
  const [mediaLibraryConfig, setMediaLibraryConfig] = useState<{ isOpen: boolean, onSelect: (url: string) => void, allowedTypes: 'image' | 'video' | 'all' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const GRID_COLS = 48;
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
  }, []);

  const handleLayoutChange = (layout: any[]) => {
    const updatedLayout = page.layout.map(w => {
      const item = layout.find(l => l.i === w.i);
      if (item) {
        return { ...w, x: item.x, y: item.y, w: item.w, h: item.h };
      }
      return w;
    });
    onChange({ ...page, layout: updatedLayout });
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
        fontSize: '2vw'
      }
    };

    onChange({ ...page, layout: [...page.layout, newWidget] });
    setSelectedWidget(newWidget.i);
  };

  const removeWidget = (wId: string) => {
    onChange({ ...page, layout: page.layout.filter(w => w.i !== wId) });
    setSelectedWidget(null);
  };

  const updateWidgetData = (wId: string, dataUpdates: Partial<WidgetData>) => {
    const updatedLayout = page.layout.map(w => {
      if (w.i === wId) {
        return { ...w, data: { ...w.data, ...dataUpdates } };
      }
      return w;
    });
    onChange({ ...page, layout: updatedLayout });
  };

  const setFullScreen = (wId: string) => {
    const widget = page.layout.find(w => w.i === wId);
    if (!widget) return;
    
    // Calculate required height in grid units to fill the container
    const containerHeight = containerRef.current?.clientHeight || 0;
    const requiredRows = containerHeight > 0 && rowHeight > 0 ? Math.ceil(containerHeight / rowHeight) : 27;
    
    const fullScreenWidget = {
      ...widget,
      x: 0,
      y: 0,
      w: GRID_COLS,
      h: requiredRows
    };
    
    onChange({ ...page, layout: [fullScreenWidget] });
  };

  const currentWidget = page.layout.find(w => w.i === selectedWidget);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl">
      
      {/* TOOLBAR */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <WidgetTool icon={<ImageIcon size={18} />} label="Imagem" onClick={() => addWidget(WidgetType.IMAGE)} />
          <WidgetTool icon={<Type size={18} />} label="Texto" onClick={() => addWidget(WidgetType.TEXT)} />
          <WidgetTool icon={<Clock size={18} />} label="Relógio" onClick={() => addWidget(WidgetType.CLOCK)} />
          <WidgetTool icon={<CloudSun size={18} />} label="Clima" onClick={() => addWidget(WidgetType.WEATHER)} />
          <WidgetTool icon={<Layout size={18} />} label="Completo" onClick={() => addWidget(WidgetType.FULL_INFO)} />
          <WidgetTool icon={<Film size={18} />} label="Vídeo" onClick={() => addWidget(WidgetType.VIDEO)} />
          <WidgetTool icon={<Rss size={18} />} label="RSS" onClick={() => addWidget(WidgetType.RSS)} />
          <WidgetTool icon={<Calendar size={18} />} label="Agenda" onClick={() => addWidget(WidgetType.CALENDAR)} />
          <WidgetTool icon={<Globe size={18} />} label="Web" onClick={() => addWidget(WidgetType.IFRAME)} />
          <WidgetTool icon={<Gift size={18} />} label="GIF" onClick={() => addWidget(WidgetType.GIF)} />
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => {
               setMediaLibraryConfig({
                 isOpen: true,
                 allowedTypes: 'image',
                 onSelect: (url) => {
                   onChange({ ...page, backgroundImage: url, backgroundVideoUrl: '' });
                 }
               });
             }}
             className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all flex items-center gap-2 text-xs font-bold border border-slate-700"
             title="Mudar Fundo"
           >
             <Layers size={14} /> <span className="hidden sm:inline">Fundo</span>
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* CANVAS AREA */}
        <div className="flex-1 overflow-auto bg-slate-950 p-8 flex items-center justify-center custom-scrollbar relative">
           {/* Grid Background */}
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
             backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`,
             backgroundSize: `${rowHeight}px ${rowHeight}px`
           }}></div>

           <div 
             ref={containerRef}
             className="relative bg-black shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-slate-800 overflow-hidden shrink-0"
             style={{ 
               width: '100%', 
               maxWidth: '1200px',
               aspectRatio: '16/9',
               backgroundImage: page.backgroundImage ? `url(${page.backgroundImage})` : 'none',
               backgroundSize: 'cover',
               backgroundPosition: 'center'
             }}
           >
             <GridLayout
               className="layout"
               layout={page.layout.map(w => ({ i: w.i, x: w.x, y: w.y, w: w.w, h: w.h }))}
               cols={GRID_COLS}
               rowHeight={rowHeight}
               margin={[0, 0]}
               onLayoutChange={handleLayoutChange}
               draggableHandle=".drag-handle"
               resizeHandle={<div className="absolute bottom-0 right-0 p-1 cursor-se-resize text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"><MoveHorizontal size={12} /></div>}
             >
               {page.layout.map(w => (
                 <div 
                   key={w.i} 
                   className={`group relative border transition-all ${selectedWidget === w.i ? 'border-cyan-500 ring-2 ring-cyan-500/20 z-20' : 'border-transparent hover:border-slate-700'}`}
                   onClick={(e) => { e.stopPropagation(); setSelectedWidget(w.i); }}
                 >
                   <div className="drag-handle absolute top-0 left-0 w-full h-4 bg-slate-900/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 cursor-move flex items-center justify-center z-10 transition-opacity">
                      <div className="w-8 h-1 bg-slate-700 rounded-full"></div>
                   </div>

                   <div className="w-full h-full overflow-hidden pointer-events-none select-none">
                      {renderWidgetPreview(w)}
                   </div>

                   {selectedWidget === w.i && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); removeWidget(w.i); }}
                       className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full shadow-lg hover:bg-rose-500 transition-all z-30"
                     >
                       <Trash2 size={12} />
                     </button>
                   )}
                 </div>
               ))}
             </GridLayout>
           </div>
        </div>

        {/* PROPERTIES PANEL */}
        {selectedWidget && currentWidget && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-right duration-300 z-40">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                   <Settings size={14} className="text-cyan-500" /> Propriedades
                </h3>
                <button onClick={() => setSelectedWidget(null)} className="text-slate-500 hover:text-white transition-colors">
                   <X size={18} />
                </button>
             </div>

             <div className="space-y-6">
                {/* Common Properties */}
                {renderWidgetControls(currentWidget, updateWidgetData, setMediaLibraryConfig, setFullScreen)}
             </div>
          </div>
        )}
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

// Helper Components
const WidgetTool: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-1 p-2 min-w-[60px] bg-slate-800/50 hover:bg-indigo-600 hover:text-white text-slate-400 rounded-xl transition-all border border-slate-800 hover:border-indigo-500 group"
  >
    <div className="group-hover:scale-110 transition-transform">{icon}</div>
    <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

const renderWidgetPreview = (w: LayoutItem) => {
  switch (w.type) {
    case WidgetType.TEXT:
      return (
        <div className="w-full h-full flex items-center justify-center p-2 text-center break-words" style={{ 
          color: w.data.color, 
          fontSize: w.data.fontSize || '2vw',
          fontFamily: w.data.textConfig?.fontFamily || 'sans-serif',
          fontWeight: w.data.textConfig?.fontWeight || 'bold',
          textAlign: w.data.textConfig?.textAlign || 'center'
        }}>
          {w.data.content}
        </div>
      );
    case WidgetType.IMAGE:
      return <img src={w.data.url} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />;
    case WidgetType.CLOCK:
      return <div className="scale-50 origin-center w-[200%] h-[200%] flex items-center justify-center"><LiveClock city={w.data.city || ''} model={w.data.model || 'standard'} /></div>;
    case WidgetType.WEATHER:
      return <div className="scale-50 origin-center w-[200%] h-[200%] flex items-center justify-center"><WeatherWidget city={w.data.city || ''} model={w.data.model || 'simple'} /></div>;
    case WidgetType.FULL_INFO:
      return <div className="scale-50 origin-center w-[200%] h-[200%] flex items-center justify-center"><FullInfoWidget city={w.data.city || ''} backgroundImage={w.data.backgroundImage} backgroundAnimation={w.data.backgroundAnimation} model={w.data.model} textSize={w.data.textSize} numberSize={w.data.numberSize} transparentBackground={w.data.transparentBackground} backgroundColor={w.data.backgroundColor} /></div>;
    case WidgetType.VIDEO:
      return <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Film className="text-slate-700" size={32} /></div>;
    case WidgetType.RSS:
      return <div className="w-full h-full bg-slate-900/50 p-2 overflow-hidden text-[8px] text-slate-500">RSS Feed: {w.data.rssUrl}</div>;
    default:
      return <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[10px] text-slate-600 uppercase font-bold">{w.type}</div>;
  }
};

const renderWidgetControls = (
  w: LayoutItem, 
  updateData: (id: string, updates: any) => void, 
  setMediaLibraryConfig: (config: any) => void,
  setFullScreen: (id: string) => void
) => {
  // Simplified controls for the prototype
  return (
    <div className="space-y-4">
      {w.type === WidgetType.TEXT && (
        <>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Conteúdo</label>
            <textarea 
              value={w.data.content} 
              onChange={e => updateData(w.i, { content: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 h-24"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Cor do Texto</label>
            <input 
              type="color" 
              value={w.data.color} 
              onChange={e => updateData(w.i, { color: e.target.value })}
              className="w-full h-8 bg-transparent border-none cursor-pointer"
            />
          </div>
        </>
      )}
      {w.type === WidgetType.IMAGE && (
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL da Imagem</label>
          <input 
            type="text" 
            value={w.data.url} 
            onChange={e => updateData(w.i, { url: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 mb-2"
          />
          <button 
            onClick={() => {
              setMediaLibraryConfig({
                isOpen: true,
                allowedTypes: 'image',
                onSelect: (url: string) => {
                  updateData(w.i, { url: url });
                }
              });
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={12} />
            Selecionar Imagem
          </button>
        </div>
      )}
      {w.type === WidgetType.VIDEO && (
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL do Vídeo</label>
          <input 
            type="text" 
            value={w.data.videoUrl} 
            onChange={e => updateData(w.i, { videoUrl: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 mb-2"
          />
          <button 
            onClick={() => {
              setMediaLibraryConfig({
                isOpen: true,
                allowedTypes: 'video',
                onSelect: (url: string) => {
                  updateData(w.i, { videoUrl: url });
                }
              });
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={12} />
            Selecionar Vídeo
          </button>
        </div>
      )}
      {(w.type === WidgetType.WEATHER || w.type === WidgetType.CLOCK || w.type === WidgetType.FULL_INFO) && (
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Cidade</label>
          <input 
            type="text" 
            value={w.data.city} 
            onChange={e => updateData(w.i, { city: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 mb-2"
          />
          {w.type === WidgetType.FULL_INFO && (
            <>
              <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Modelo Visual</label>
              <select 
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500 mb-2"
                value={w.data.model || 'standard'}
                onChange={(e) => updateData(w.i, { model: e.target.value })}
              >
                <option value="standard">Padrão</option>
                <option value="minimal">Minimalista</option>
                <option value="glass">Glassmorphism</option>
                <option value="modern">Moderno (Dividido)</option>
              </select>

              <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Imagem de Fundo (Opcional)</label>
              <input 
                type="text" 
                value={w.data.backgroundImage || ''} 
                onChange={e => updateData(w.i, { backgroundImage: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
                placeholder="URL da imagem (ex: https://...)"
              />

              <div className="mt-4 pt-4 border-t border-slate-800">
                <button 
                  onClick={() => setFullScreen(w.i)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
                >
                  <Maximize2 size={14} />
                  Preencher Tela Inteira
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {w.type === WidgetType.VIDEO && (
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Link YouTube</label>
          <input 
            type="text" 
            value={w.data.videoUrl} 
            onChange={e => updateData(w.i, { videoUrl: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
          />
          
          <div className="mt-3">
            <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">Qualidade YouTube</label>
            <select 
              value={w.data.videoConfig?.youtubeQuality || 'highres'}
              onChange={(e) => updateData(w.i, { videoConfig: { ...w.data.videoConfig, youtubeQuality: e.target.value } })}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
            >
              <option value="highres">Máxima (Auto)</option>
              <option value="hd1080">1080p</option>
              <option value="hd720">720p</option>
              <option value="large">480p</option>
              <option value="medium">360p</option>
              <option value="small">240p</option>
            </select>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <button 
              onClick={() => setFullScreen(w.i)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
            >
              <Maximize2 size={14} />
              Preencher Tela Inteira
            </button>
          </div>
        </div>
      )}
      {w.type === WidgetType.RSS && (
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase mb-1 block">URL do Feed RSS</label>
          <input 
            type="text" 
            value={w.data.rssUrl} 
            onChange={e => updateData(w.i, { rssUrl: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-cyan-500"
          />
          <div className="mt-4 pt-4 border-t border-slate-800">
            <button 
              onClick={() => setFullScreen(w.i)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
            >
              <Maximize2 size={14} />
              Preencher Tela Inteira
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneEditor;
