import React, { useState, useMemo, useEffect } from 'react';
import {
  Utensils,
  ChefHat,
  LayoutGrid,
  LogOut,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  X,
  Euro,
  Flame,
  Leaf,
  Drumstick,
  Beef,
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  Beer,
  IceCream,
  Bike,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  MoreHorizontal,
  Database,
  MessageSquare
} from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, query, getDocs } from 'firebase/firestore';
import { seedDatabase } from './seed';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

// --- CONFIGURACIÓN DE BURGER ---
const BURGER_VARIANTS = [
  { id: 'smash', label: 'Smash', price: 0, icon: <Beef size={20} /> },
  { id: 'gourmet', label: 'Gourmet 200g', price: 2.00, icon: <Flame size={20} />, needsPoint: true },
  { id: 'vegan', label: 'Vegana', price: 0, icon: <Leaf size={20} /> },
  { id: 'chicken', label: 'Pollo Crunchy', price: 0, icon: <Drumstick size={20} /> },
];

const COOKING_POINTS = [
  { id: 'poco', label: 'Poco hecha' },
  { id: 'punto', label: 'Al punto' },
  { id: 'hecha', label: 'Muy hecha' },
];

const EXTRAS = [
  { id: 'xtr-cheese', label: 'Extra Queso', price: 1.00 },
  { id: 'xtr-bacon', label: 'Extra Bacon', price: 1.20 },
  { id: 'xtr-egg', label: 'Huevo Frito', price: 1.50 },
  { id: 'xtr-sauce', label: 'Salsa Extra', price: 0.80 },
];

// --- MOCK DATA FOR SIDEBAR (Could be in Firebase too) ---
const MOCK_DELIVERY = [
  { id: 'd1', platform: 'Glovo', orderId: '#GL-8821', items: 3, status: 'kitchen', time: '12m' },
  { id: 'd2', platform: 'Uber', orderId: '#UB-9922', items: 2, status: 'ready', time: '25m' },
  { id: 'd3', platform: 'Smile', orderId: '#SM-1002', items: 5, status: 'kitchen', time: '5m' },
  { id: 'd4', platform: 'JustEat', orderId: '#JE-3321', items: 1, status: 'rider', time: '35m' },
];

const MOCK_RESERVATIONS = [
  { id: 'r1', name: 'Marta G.', time: '21:00', pax: 4, phone: '666...' },
  { id: 'r2', name: 'Grupo Empresa', time: '21:30', pax: 12, phone: '655...' },
  { id: 'r3', name: 'Pareja Aniversario', time: '22:00', pax: 2, phone: '677...' },
  { id: 'r4', name: 'Familia Lopez', time: '22:15', pax: 5, phone: '611...' },
];

// --- HELPER FUNCTIONS ---
const parsePrice = (priceStr) => {
  if (typeof priceStr === 'number') return priceStr;
  return parseFloat(priceStr.replace(',', '.'));
};

const formatPrice = (num) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num);
};

const getPlatformColor = (platform) => {
  switch (platform) {
    case 'Glovo': return 'bg-yellow-400 text-black';
    case 'Uber': return 'bg-green-900 text-white border border-green-700';
    case 'JustEat': return 'bg-red-600 text-white';
    case 'Smile': return 'bg-orange-500 text-white';
    default: return 'bg-slate-700 text-white';
  }
};

// --- COMPONENTES ---

const TableStatusIcon = ({ active, icon: Icon, colorClass }) => (
  <div className={`p-1.5 rounded-full transition-all duration-300 ${active ? colorClass + ' scale-110 shadow-lg' : 'bg-slate-800/50 text-slate-600'}`}>
    <Icon size={14} strokeWidth={active ? 2.5 : 2} />
  </div>
);

const TableCard = ({ table, onClick }) => {
  const isOccupied = table.status !== 'free';

  const stages = {
    drinks: { active: table.stage === 'drinks' || table.stage === 'starters' || table.stage === 'burgers' || table.stage === 'desserts' },
    starters: { active: table.stage === 'starters' || table.stage === 'burgers' || table.stage === 'desserts' },
    burgers: { active: table.stage === 'burgers' || table.stage === 'desserts' },
    desserts: { active: table.stage === 'desserts' },
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full aspect-[4/3] rounded-xl flex flex-col justify-between p-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-95 shadow-xl border-2
        ${table.status === 'free' ? 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-400' : ''}
        ${table.status === 'occupied' ? 'bg-slate-800 border-orange-500/50 hover:border-orange-500 text-slate-100' : ''}
        ${table.status === 'payment' ? 'bg-slate-800 border-emerald-500 hover:border-emerald-400 text-emerald-100' : ''}
      `}
    >
      <div className="flex justify-between items-start w-full">
        <span className="text-3xl font-black">{table.name}</span>
        {isOccupied && (
          <div className={`px-2 py-1 rounded-md text-sm font-mono font-bold ${table.status === 'payment' ? 'bg-emerald-500 text-white' : 'bg-slate-950 text-orange-400'}`}>
            {formatPrice(table.total)}
          </div>
        )}
      </div>

      {isOccupied ? (
        <div className="w-full">
          <div className="flex justify-between items-center bg-slate-900/50 rounded-full p-1 border border-slate-700/50">
            <TableStatusIcon icon={Beer} active={stages.drinks.active} colorClass="bg-blue-500 text-white" />
            <div className={`h-0.5 flex-1 mx-1 ${stages.starters.active ? 'bg-orange-500' : 'bg-slate-700'}`} />
            <TableStatusIcon icon={Utensils} active={stages.starters.active} colorClass="bg-green-500 text-white" />
            <div className={`h-0.5 flex-1 mx-1 ${stages.burgers.active ? 'bg-orange-500' : 'bg-slate-700'}`} />
            <TableStatusIcon icon={Beef} active={stages.burgers.active} colorClass="bg-orange-500 text-white" />
            <div className={`h-0.5 flex-1 mx-1 ${stages.desserts.active ? 'bg-orange-500' : 'bg-slate-700'}`} />
            <TableStatusIcon icon={IceCream} active={stages.desserts.active} colorClass="bg-pink-500 text-white" />
          </div>
          <div className="text-xs text-center mt-2 text-slate-400 font-medium uppercase tracking-wider">
            {table.status === 'payment' ? 'COBRANDO' : table.stage || 'Esperando'}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center opacity-20">
          <LayoutGrid size={40} />
        </div>
      )}
    </button>
  );
};

const ReservationModal = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    pax: 2,
    date: new Date().toISOString().split('T')[0],
    time: '21:00',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><Calendar className="text-orange-500" /> Nueva Reserva</h3>
          <button onClick={onClose} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors">
            <X size={20} className="text-white" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">1. Teléfono</label>
            <input
              required
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="6xx xxx xxx"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">2. Nombre Cliente</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Juan Pérez"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">3. Personas (PAX)</label>
              <input
                required
                type="number"
                min="1"
                value={formData.pax}
                onChange={(e) => setFormData({ ...formData, pax: parseInt(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">4. Hora</label>
              <input
                required
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">5. Fecha</label>
            <input
              required
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">6. Observaciones</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Alergias, trona, mesa fuera..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none h-20"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl mt-4 transition-all shadow-lg active:scale-95"
          >
            CONFIRMAR RESERVA
          </button>
        </form>
      </div>
    </div>
  );
};

const Dashboard = ({ tables, deliveries, reservations, onSelectTable, onAddDelivery, onAddReservation, activeTab, setActiveTab }) => {
  const [showPlatformSelect, setShowPlatformSelect] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const platforms = [
    { id: 'Glovo', color: 'bg-yellow-400 text-black' },
    { id: 'Uber', color: 'bg-green-900 text-white' },
    { id: 'Smile', color: 'bg-orange-500 text-white' },
    { id: 'JustEat', color: 'bg-red-600 text-white' }
  ];

  return (
    <div className="h-full bg-slate-950 flex overflow-hidden">
      <div className="flex-1 p-6 flex flex-col border-r border-slate-800 overflow-y-auto">
        <div className="flex justify-between items-center mb-8 shrink-0">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <LayoutGrid size={32} className="text-orange-500" />
            Sala Principal
          </h2>
          <div className="flex gap-4 text-xs font-medium text-slate-500 uppercase tracking-widest">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-600"></span> Libre</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Ocupada</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Pago</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 auto-rows-min">
          {tables.map(table => (
            <TableCard key={table.id} table={table} onClick={() => onSelectTable(table)} />
          ))}
        </div>

        {tables.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4">
            <Database size={64} className="opacity-20" />
            <p className="text-xl font-medium">No hay datos en la base de datos</p>
            <button
              onClick={async () => {
                const btn = document.activeElement;
                if (btn) btn.disabled = true;
                await seedDatabase();
                if (btn) btn.disabled = false;
              }}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              INICIALIZAR BASE DE DATOS
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: SIDEBAR (Delivery + Reservas) */}
      <div className="w-[380px] bg-slate-900 flex flex-col shrink-0 relative border-l border-slate-800">

        {/* SWITCH TABS */}
        <div className="flex p-2 bg-slate-800/50 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'orders' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Bike size={18} /> Pedidos
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'reservations' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Calendar size={18} /> Reservas
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {/* DELIVERY PANEL */}
          <div className={`absolute inset-0 flex flex-col transition-all duration-300 ${activeTab !== 'orders' ? 'opacity-0 pointer-events-none translate-x-10' : 'opacity-100 translate-x-0'}`}>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Activos ({deliveries.length})
                </h3>
                <button
                  onClick={() => setShowPlatformSelect(true)}
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-bold"
                >
                  <Plus size={16} /> NUEVO
                </button>
              </div>

              {showPlatformSelect ? (
                <div className="bg-slate-800 p-4 rounded-xl border border-blue-500/30 mb-6 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-blue-400 uppercase">Selecciona Plataforma</span>
                    <button onClick={() => setShowPlatformSelect(false)}><X size={16} className="text-slate-500" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {platforms.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { onAddDelivery(p.id); setShowPlatformSelect(false); }}
                        className={`py-3 rounded-lg font-bold text-sm ${p.color} hover:opacity-90 active:scale-95 transition-all`}
                      >
                        {p.id}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                {deliveries.map(order => (
                  <button
                    key={order.id}
                    onClick={() => onSelectTable(order)} // We re-use select for both types
                    className="w-full text-left bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-orange-500/50 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getPlatformColor(order.platform)}`}>
                        {order.platform}
                      </span>
                      <span className="text-slate-400 font-mono text-xs">{order.time || 'Ahora'}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-white font-bold text-lg group-hover:text-orange-400 transition-colors">{order.name}</div>
                        <div className="text-slate-500 text-xs">{order.items?.length || 0} items • {formatPrice(order.total || 0)}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {order.status || 'Cocina'}
                      </div>
                    </div>
                  </button>
                ))}
                {deliveries.length === 0 && (
                  <div className="text-center py-10 opacity-20">
                    <Bike size={48} className="mx-auto mb-2" />
                    <p className="text-sm font-bold">Sin pedidos activos</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RESERVATIONS PANEL */}
          <div className={`absolute inset-0 flex flex-col transition-all duration-300 ${activeTab !== 'reservations' ? 'opacity-0 pointer-events-none -translate-x-10' : 'opacity-100 translate-x-0'}`}>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Reservas Hoy ({reservations.length})
                </h3>
                <button
                  onClick={() => setShowReservationModal(true)}
                  className="p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-bold shadow-lg"
                >
                  <Plus size={16} /> NUEVA
                </button>
              </div>

              {showReservationModal && (
                <ReservationModal
                  onClose={() => setShowReservationModal(false)}
                  onAdd={(data) => {
                    onAddReservation(data);
                    setShowReservationModal(false);
                  }}
                />
              )}

              <div className="space-y-3">
                {reservations.map(res => (
                  <div key={res.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col gap-2 relative group hover:border-orange-500/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center bg-slate-700 px-3 py-2 rounded-lg min-w-[65px] border border-slate-600">
                        <Clock size={16} className="text-orange-400 mb-0.5" />
                        <span className="font-bold text-white text-sm">{res.time}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-black text-slate-100 uppercase tracking-wide">{res.name}</div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1 font-bold text-orange-400/80"><User size={12} /> {res.pax}p</span>
                          <span className="flex items-center gap-1"><Phone size={12} /> {res.phone}</span>
                        </div>
                      </div>
                    </div>
                    {res.notes && (
                      <div className="mt-1 p-2 bg-slate-900/50 rounded-lg text-xs text-slate-500 border border-slate-700/50 italic">
                        <MessageSquare size={10} className="inline mr-1 opacity-50" /> {res.notes}
                      </div>
                    )}
                  </div>
                ))}
                {reservations.length === 0 && (
                  <div className="text-center py-10 opacity-20">
                    <Calendar size={48} className="mx-auto mb-2" />
                    <p className="text-sm font-bold">Sin reservas registradas</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCard = ({ product, onClick }) => {
  const price = parsePrice(product.price);
  return (
    <button
      onClick={onClick}
      className="bg-slate-800 rounded-xl overflow-hidden shadow-lg group hover:ring-2 hover:ring-orange-500 transition-all text-left flex flex-col h-full"
    >
      <div className="h-32 w-full overflow-hidden relative bg-slate-700">
        <LazyLoadImage
          alt={product.name.es}
          src={product.img}
          effect="blur"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          wrapperClassName="w-full h-full"
          onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=Smile+Burger'; }}
        />
        <div className="absolute bottom-0 right-0 z-10 bg-black/70 px-2 py-1 text-white font-bold rounded-tl-lg">
          {formatPrice(price)}
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <h4 className="font-bold text-slate-100 leading-tight">{product.name.es}</h4>
      </div>
    </button>
  );
};

const BurgerCustomizer = ({ product, onClose, onAdd }) => {
  const basePrice = parsePrice(product.price);
  const [variant, setVariant] = useState(null);
  const [point, setPoint] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);

  const currentTotal = useMemo(() => {
    let total = basePrice;
    if (variant) total += variant.price;
    selectedExtras.forEach(id => {
      const extra = EXTRAS.find(e => e.id === id);
      if (extra) total += extra.price;
    });
    return total;
  }, [basePrice, variant, selectedExtras]);

  const handleAdd = () => {
    onAdd({
      product,
      variant,
      point,
      extras: selectedExtras.map(id => EXTRAS.find(e => e.id === id)),
      finalPrice: currentTotal
    });
  };

  const isReady = variant && (!variant.needsPoint || point);
  console.log('BurgerCustomizer State:', { variant: variant?.id, point, isReady });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-bold text-white">{product.name.es}</h3>
            <p className="text-orange-400 text-lg font-mono mt-1">{formatPrice(currentTotal)}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600">
            <X className="text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          <section>
            <h4 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-3">1. Elige tu base</h4>
            <div className="grid grid-cols-2 gap-3">
              {BURGER_VARIANTS.map(v => (
                <button
                  key={v.id}
                  onClick={() => { setVariant(v); setPoint(null); }}
                  className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${variant?.id === v.id
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                >
                  {v.icon}
                  <div className="text-left">
                    <div className="font-bold">{v.label}</div>
                    {v.price > 0 && <div className="text-xs text-orange-400">+{formatPrice(v.price)}</div>}
                  </div>
                  {variant?.id === v.id && <CheckCircle2 className="ml-auto text-orange-500" size={16} />}
                </button>
              ))}
            </div>
          </section>

          {variant?.needsPoint && (
            <section className="animate-in fade-in slide-in-from-top-4 duration-300">
              <h4 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-3">2. Punto de la carne</h4>
              <div className="flex gap-3">
                {COOKING_POINTS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPoint(p.id)}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${point === p.id
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className={!variant ? 'opacity-50 pointer-events-none' : ''}>
            <h4 className="text-slate-400 uppercase text-xs font-bold tracking-wider mb-3">Extras (Opcional)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {EXTRAS.map(extra => {
                const isSelected = selectedExtras.includes(extra.id);
                return (
                  <button
                    key={extra.id}
                    onClick={() => {
                      setSelectedExtras(prev =>
                        isSelected ? prev.filter(id => id !== extra.id) : [...prev, extra.id]
                      );
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${isSelected
                      ? 'border-orange-500 bg-orange-900/30 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-750'
                      }`}
                  >
                    <span className="font-medium text-sm">{extra.label}</span>
                    <span className="text-xs text-orange-400">+{formatPrice(extra.price)}</span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <button
            onClick={() => {
              console.log('Clicked "AÑADIR AL PEDIDO"');
              handleAdd();
            }}
            disabled={!isReady}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${isReady
              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
              }`}
          >
            {!variant ? 'SELECCIONA BASE' : (variant.needsPoint && !point) ? 'ELIGE PUNTO' : <><Plus size={24} /> AÑADIR AL PEDIDO • {formatPrice(currentTotal)}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [tables, setTables] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [menu, setMenu] = useState({});
  const [activeTableId, setActiveTableId] = useState(null);
  const [activeDeliveryId, setActiveDeliveryId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('burgers');
  const [activeTab, setActiveTab] = useState('orders');
  const [customizingProduct, setCustomizingProduct] = useState(null);

  // Firestore Subscriptions
  useEffect(() => {
    const unsubTables = onSnapshot(collection(db, 'tables'), (snapshot) => {
      const tablesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setTables(tablesData.sort((a, b) => parseInt(a.id) - parseInt(b.id)));
    });

    const unsubDeliveries = onSnapshot(collection(db, 'deliveries'), (snapshot) => {
      const deliveriesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setDeliveries(deliveriesData.sort((a, b) => b.orderId - a.orderId));
    });

    const unsubReservations = onSnapshot(collection(db, 'reservations'), (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      // Sort by time
      setReservations(reservationsData.sort((a, b) => a.time.localeCompare(b.time)));
    });

    const unsubMenu = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const menuData = {};
      snapshot.docs.forEach(doc => {
        const item = doc.data();
        if (!menuData[item.category]) menuData[item.category] = [];
        menuData[item.category].push(item);
      });
      setMenu(menuData);
    });

    return () => {
      unsubTables();
      unsubDeliveries();
      unsubReservations();
      unsubMenu();
    };
  }, []);

  const activeTable = activeTableId ? tables.find(t => t.id === activeTableId) : null;
  const activeDelivery = activeDeliveryId ? deliveries.find(d => d.id === activeDeliveryId) : null;
  const currentOrder = activeTable || activeDelivery;

  const handleSelectTable = async (table) => {
    setActiveDeliveryId(null);
    setActiveTableId(table.id);
    if (table.status === 'free') {
      await updateDoc(doc(db, 'tables', table.id), {
        status: 'occupied',
        stage: 'empty'
      });
    }
  };

  const handleSelectDelivery = (delivery) => {
    setActiveTableId(null);
    setActiveDeliveryId(delivery.id);
  };

  const handleAddDelivery = async (platform) => {
    const id = Date.now().toString();
    const newDelivery = {
      id,
      orderId: Date.now(),
      name: `#${platform.substring(0, 2).toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`,
      platform,
      status: 'cocina',
      total: 0,
      items: [],
      comment: ''
    };
    await setDoc(doc(db, 'deliveries', id), newDelivery);
    setActiveDeliveryId(id);
    setActiveTableId(null);
  };

  const handleAddReservation = async (data) => {
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, 'reservations', id), {
        id,
        ...data,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding reservation:', error);
      alert('Error al añadir reserva: ' + error.message);
    }
  };

  const handleCloseTable = () => {
    setActiveTableId(null);
    setActiveDeliveryId(null);
  };

  const handleProductClick = (product) => {
    console.log('Product clicked:', product.name.es, 'Category:', product.category);
    if (product.category === 'burgers') {
      setCustomizingProduct(product);
    } else {
      const price = parsePrice(product.price);
      console.log('Adding non-burger item. Price:', price);
      addItemToOrder({
        product,
        finalPrice: price,
        variant: null,
        extras: []
      });
    }
  };

  const addItemToOrder = async (itemConfig) => {
    try {
      const { product, variant, point, extras, finalPrice } = itemConfig;
      console.log('Adding item:', product.name.es, itemConfig);

      const newItem = {
        orderId: Date.now(),
        id: product.id,
        name: product.name.es,
        variantName: variant?.label || null,
        pointName: point ? COOKING_POINTS.find(p => p.id === point)?.label : null,
        extras: extras || [],
        price: finalPrice,
        qty: 1,
        comment: ''
      };

      if (!currentOrder) {
        console.error('No active order to add item to');
        return;
      }

      const collectionName = activeTableId ? 'tables' : 'deliveries';
      const currentItems = currentOrder.items || [];

      console.log('Updating Firestore:', collectionName, currentOrder.id);

      await updateDoc(doc(db, collectionName, currentOrder.id), {
        items: [...currentItems, newItem],
        total: (currentOrder.total || 0) + finalPrice,
        stage: collectionName === 'tables' ? (
          product.category === 'bebidas' ? 'drinks' :
            product.category === 'entrantes' ? 'starters' :
              product.category === 'burgers' ? 'burgers' :
                product.category === 'postres' ? 'desserts' : (currentOrder.stage || 'empty')
        ) : (currentOrder.stage || 'cocina')
      });

      console.log('Successfully updated order');
    } catch (error) {
      console.error('Error adding item to order:', error);
      alert('Error al añadir producto: ' + error.message);
    }

    setCustomizingProduct(null);
  };

  const removeItem = async (orderId) => {
    if (!currentOrder) return;
    const itemToRemove = currentOrder.items.find(i => i.orderId === orderId);
    if (!itemToRemove) return;

    const collectionName = activeTableId ? 'tables' : 'deliveries';
    await updateDoc(doc(db, collectionName, currentOrder.id), {
      items: currentOrder.items.filter(i => i.orderId !== orderId),
      total: currentOrder.total - itemToRemove.price
    });
  };

  const updateComment = async (val) => {
    if (!currentOrder) return;
    const collectionName = activeTableId ? 'tables' : 'deliveries';
    await updateDoc(doc(db, collectionName, currentOrder.id), {
      comment: val
    });
  };

  const updateCustomerInfo = async (field, val) => {
    if (!activeDeliveryId) return;
    await updateDoc(doc(db, 'deliveries', activeDeliveryId), {
      [field]: val
    });
  };

  const updateItemComment = async (orderId, comment) => {
    if (!currentOrder) return;
    const collectionName = activeTableId ? 'tables' : 'deliveries';
    const newItems = currentOrder.items.map(item =>
      item.orderId === orderId ? { ...item, comment } : item
    );
    await updateDoc(doc(db, collectionName, currentOrder.id), {
      items: newItems
    });
  };

  const categories = [
    { id: 'entrantes', label: 'Entrantes', icon: <Utensils size={18} /> },
    { id: 'burgers', label: 'Burgers', icon: <Beef size={18} /> },
    { id: 'postres', label: 'Postres', icon: <ChefHat size={18} /> },
    { id: 'bebidas', label: 'Bebidas', icon: <Euro size={18} /> },
  ];

  const filteredProducts = activeCategory ? menu[activeCategory] || [] : [];

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden flex flex-col">
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-1.5 rounded-lg">
            <ChefHat size={20} className="text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">SMILE <span className="text-orange-500">POS</span></h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <button onClick={seedDatabase} className="flex items-center gap-1 hover:text-white transition-colors">
            <Database size={14} /> Sync Data
          </button>
          <span>{new Date().toLocaleDateString()}</span>
          <span>Administrador</span>
        </div>
      </div>

      {!currentOrder ? (
        <Dashboard
          tables={tables}
          deliveries={deliveries}
          onSelectTable={(item) => item.platform ? handleSelectDelivery(item) : handleSelectTable(item)}
          onAddDelivery={handleAddDelivery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[350px] md:w-[400px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20 shadow-2xl">
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-400 uppercase font-bold">{activeTableId ? 'MESA' : 'PEDIDO'}</div>
                <div className="text-2xl font-black text-orange-500">{currentOrder.name}</div>
              </div>
              <button
                onClick={handleCloseTable}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
              >
                <ArrowLeft size={16} /> Salir
              </button>
            </div>

            {/* Client Info (Delivery only) */}
            {activeDeliveryId && (
              <div className="p-3 bg-slate-900/50 border-b border-slate-800 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Cliente</div>
                  <input
                    type="text"
                    value={currentOrder.customerName || ''}
                    onChange={(e) => updateCustomerInfo('customerName', e.target.value)}
                    placeholder="Nombre..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-inner"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Teléfono</div>
                  <input
                    type="text"
                    value={currentOrder.customerPhone || ''}
                    onChange={(e) => updateCustomerInfo('customerPhone', e.target.value)}
                    placeholder="6xx xxx xxx"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-inner"
                  />
                </div>
              </div>
            )}

            {/* Comment area */}
            <div className="p-3 bg-slate-900/50 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <MessageSquare size={14} /> Notas del Pedido
              </div>
              <textarea
                value={currentOrder.comment || ''}
                onChange={(e) => updateComment(e.target.value)}
                placeholder="Añadir nota general..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none h-12 shadow-inner"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {currentOrder.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                  <ShoppingBag size={48} className="mb-2" />
                  <p>Pedido vacío</p>
                </div>
              ) : (
                currentOrder.items.map((item) => (
                  <div key={item.orderId} className="bg-slate-800 p-3 rounded-lg border border-slate-700 animate-in slide-in-from-left-2 duration-200">
                    <div className="flex justify-between group">
                      <button
                        onClick={() => {
                          const com = prompt("Comentario para " + item.name + ":", item.comment || "");
                          if (com !== null) updateItemComment(item.orderId, com);
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-100">{item.name}</span>
                          <span className="font-bold text-slate-100">{formatPrice(item.price)}</span>
                        </div>

                        {(item.variantName || item.pointName || (item.extras && item.extras.length > 0) || item.comment) && (
                          <div className="text-xs mt-1 pl-2 border-l-2 border-slate-600 space-y-0.5">
                            {item.variantName && <div className="text-orange-400 font-medium">• {item.variantName}</div>}
                            {item.pointName && <div className="text-slate-400">• {item.pointName}</div>}
                            {item.extras?.map(e => (
                              <div key={e.id} className="text-slate-400">+ {e.label}</div>
                            ))}
                            {item.comment && <div className="text-blue-400 italic">Nota: {item.comment}</div>}
                          </div>
                        )}
                      </button>

                      <button
                        onClick={() => removeItem(item.orderId)}
                        className="ml-3 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors self-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700">
              <div className="flex justify-between items-end mb-4">
                <span className="text-slate-400 font-medium">Total</span>
                <span className="text-4xl font-black text-white">{formatPrice(currentOrder.total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                  <CheckCircle2 size={20} /> MARCHAR
                </button>
                <button className="py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                  <CreditCard size={20} /> COBRAR
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-slate-950">
            <div className="flex gap-2 p-3 overflow-x-auto bg-slate-900 border-b border-slate-800 hide-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 rounded-xl font-bold whitespace-nowrap transition-all
                    ${activeCategory === cat.id
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
                  `}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                {filteredProducts.map(prod => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onClick={() => handleProductClick(prod)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {customizingProduct && (
        <BurgerCustomizer
          product={customizingProduct}
          onClose={() => setCustomizingProduct(null)}
          onAdd={addItemToOrder}
        />
      )}
    </div>
  );
};

export default App;
