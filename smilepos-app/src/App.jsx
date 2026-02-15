import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  MessageSquare,
  Lock,
  Users,
  AlertCircle,
  Send,
  Banknote,
  Wallet,
  Divide,
  Move,
  Save,
  PenLine
} from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, query, getDocs, deleteDoc } from 'firebase/firestore';
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

const TableCard = ({ table, onClick, isSelecting, style, isEditing, onPointerDown, onDelete }) => {
  const isOccupied = table.status !== 'free';
  const isBlocked = table.isBlocked;
  const isSeated = isOccupied && (
    (table.stage && table.stage !== 'empty') ||
    (table.items && table.items.length > 0)
  );
  const hasUnsentItems = isOccupied && table.items?.some(i => i.sentToKitchen === false);

  const stages = {
    drinks: { active: table.items?.some(i => i.category === 'bebidas') },
    starters: { active: table.items?.some(i => i.category === 'entrantes') },
    burgers: { active: table.items?.some(i => i.category === 'burgers') },
    desserts: { active: table.items?.some(i => i.category === 'postres') },
  };

  const Component = isEditing ? 'div' : 'button';

  return (
    <Component
      onClick={!isEditing ? onClick : undefined}
      className={`
        absolute w-24 h-24 rounded-xl flex flex-col justify-between p-2 transition-transform duration-200 shadow-lg border-2
        ${isSelecting ? 'ring-4 ring-blue-500 animate-pulse' : ''}
        ${isEditing ? 'cursor-move hover:scale-110 z-50 border-dashed border-slate-400' : 'hover:scale-[1.05] active:scale-95'}
        ${table.status === 'free' ? (isBlocked ? 'bg-yellow-500/10 border-yellow-500 text-yellow-100' : 'bg-slate-800 border-slate-700 hover:border-slate-600 text-slate-400') : ''}
        ${table.status === 'occupied' ? (hasUnsentItems ? 'bg-slate-800 border-red-500 text-slate-100' : 'bg-slate-800 border-orange-500 text-slate-100 shadow-orange-500/10') : ''}
        ${table.status === 'payment' ? 'bg-slate-800 border-emerald-500 text-emerald-100' : ''}
      `}
      style={{ ...style, touchAction: 'none' }}
      onPointerDown={(e) => {
        if (isEditing) {
          onPointerDown(e);
        }
      }}
    >
      {/* Edit Mode Controls */}
      {isEditing && (
        <>
          <div className="absolute inset-0 bg-black/10 z-30 flex items-center justify-center cursor-move rounded-xl backdrop-blur-[1px] pointer-events-none">
            {/* Grip handled by parent mouse events, just visual hint */}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(table);
            }}
            className="absolute -top-2 -right-2 z-50 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:bg-red-700 active:scale-95 transition-all"
          >
            <X size={14} />
          </button>
        </>
      )}

      {/* Warning for un-sent items */}
      {hasUnsentItems && !isEditing && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-slate-950 animate-bounce z-20">
          <AlertCircle size={10} />
        </div>
      )}

      <div className="flex flex-col h-full justify-between items-center text-center relative z-10">
        <span className="text-xl font-black tracking-tighter leading-none">
          {table.name}
        </span>

        {isOccupied && !isEditing ? (
          <>
            <div className="flex gap-1 justify-center w-full my-0.5">
              <TableStatusIcon active={stages.drinks.active} icon={Beer} colorClass="bg-blue-500 text-white" size={10} />
              <TableStatusIcon active={stages.starters.active} icon={Utensils} colorClass="bg-purple-500 text-white" size={10} />
              <TableStatusIcon active={stages.burgers.active} icon={Beef} colorClass="bg-orange-500 text-white" size={10} />
              <TableStatusIcon active={stages.desserts.active} icon={IceCream} colorClass="bg-pink-500 text-white" size={10} />
            </div>

            <div className="flex items-center justify-center gap-2 w-full mt-auto">
              <div className="flex items-center gap-0.5 text-[10px] font-bold bg-slate-900/40 px-1.5 py-0.5 rounded text-slate-300">
                <Euro size={10} /> {formatPrice(table.total)}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-auto text-[10px] font-bold uppercase tracking-wider opacity-60">
            {table.status === 'free' ? 'LIBRE' : table.status}
          </div>
        )}
      </div>
    </Component>
  );
};

const TableStatusIcon = ({ active, icon: Icon, colorClass, size = 14 }) => (
  <div className={`p-1 rounded-full transition-all duration-300 ${active ? colorClass + ' scale-110 shadow-sm' : 'bg-slate-800/50 text-slate-600'}`}>
    <Icon size={size} strokeWidth={active ? 2.5 : 2} />
  </div>
);

const ReservationModal = ({ onClose, onAdd, customers = [] }) => {
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    email: '',
    pax: 2,
    date: new Date().toISOString().split('T')[0],
    time: '21:00',
    notes: ''
  });

  const matchedCustomer = useMemo(() => {
    if (formData.phone.length < 9) return null;
    return customers.find(c => c.phone.replace(/\s/g, '') === formData.phone.replace(/\s/g, ''));
  }, [formData.phone, customers]);

  useEffect(() => {
    if (matchedCustomer) {
      setFormData(prev => ({
        ...prev,
        name: matchedCustomer.name || prev.name,
        email: matchedCustomer.email || prev.email
      }));
    }
  }, [matchedCustomer]);

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
            <div className="relative">
              <input
                required
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="6xx xxx xxx"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {matchedCustomer && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded-lg border border-orange-500/30">
                  {matchedCustomer.orderCount || 0} PEDIDOS
                </div>
              )}
            </div>
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
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail (Opcional)</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="cliente@correo.com"
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

const ConfirmationModal = ({ title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar", icon: Icon = AlertCircle, color = "orange" }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          <div className={`w-20 h-20 bg-${color}-500/10 rounded-full flex items-center justify-center mx-auto mb-6`}>
            <Icon size={40} className={`text-${color}-500`} />
          </div>
          <h3 className="text-2xl font-black text-white mb-3 tracking-tight">{title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 px-4">{message}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className={`w-full py-4 bg-${color === 'red' ? 'red-600' : 'orange-500'} hover:bg-${color === 'red' ? 'red-500' : 'orange-600'} text-white font-black rounded-2xl shadow-xl shadow-${color}-500/20 transition-all active:scale-95`}
            >
              {confirmText}
            </button>
            <button
              onClick={onCancel}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition-all"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ order, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="p-10 text-center">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <Wallet size={48} className="text-emerald-500" />
          </div>

          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Finalizar Cuenta</h3>
          <div className="text-6xl font-black text-white mb-10 tracking-tighter">
            {formatPrice(order.total)}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => onConfirm('tarjeta')}
              className="flex flex-col items-center gap-3 p-6 bg-slate-800 hover:bg-blue-600 text-white rounded-3xl transition-all group active:scale-95 border border-slate-700 hover:border-blue-400 shadow-xl"
            >
              <div className="w-12 h-12 bg-slate-700 group-hover:bg-blue-500 rounded-2xl flex items-center justify-center transition-colors">
                <CreditCard size={24} />
              </div>
              <span className="font-black uppercase text-sm tracking-wide">Tarjeta</span>
            </button>

            <button
              onClick={() => onConfirm('efectivo')}
              className="flex flex-col items-center gap-3 p-6 bg-slate-800 hover:bg-emerald-600 text-white rounded-3xl transition-all group active:scale-95 border border-slate-700 hover:border-emerald-400 shadow-xl"
            >
              <div className="w-12 h-12 bg-slate-700 group-hover:bg-emerald-500 rounded-2xl flex items-center justify-center transition-colors">
                <Banknote size={24} />
              </div>
              <span className="font-black uppercase text-sm tracking-wide">Efectivo</span>
            </button>
          </div>

          <button
            onClick={() => { }} // No actua por ahora
            className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-orange-500 transition-colors mx-auto mb-8 bg-slate-900 px-4 py-2 rounded-full border border-slate-800"
          >
            <Divide size={12} /> Fraccionar Pago
          </button>

          <button
            onClick={onCancel}
            className="w-full py-4 text-slate-500 hover:text-white font-bold transition-colors"
          >
            VOLVER AL PEDIDO
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ tables, deliveries, reservations, customers, assigningReservationId, setAssigningReservationId, onSelectTable, onSelectDelivery, onAddDelivery, onAddReservation, activeTab, setActiveTab, isEditingLayout, setIsEditingLayout, handleDragStart, handleDragMove, handleDragEnd, saveLayout, handleAddTable, handleDeleteTable, draggedTable, containerRef }) => {
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
      <div
        className="flex-1 p-6 flex flex-col border-r border-slate-800 overflow-hidden relative"
      >
        <div className="flex justify-between items-center mb-4 shrink-0 z-20 relative">
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <LayoutGrid size={32} className="text-orange-500" />
              Sala Principal
            </h2>
            {assigningReservationId && (
              <div className="mt-2 text-blue-400 font-bold animate-pulse text-sm flex items-center gap-2">
                <MapPin size={16} /> SELECCIONA UNA MESA PARA LA RESERVA
                <button onClick={() => setAssigningReservationId(null)} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 hover:text-white ml-2">CANCELAR</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-xs font-medium text-slate-500 uppercase tracking-widest mr-4">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-600"></span> Libre</span>
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Bloqueo</span>
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Ocupada</span>
            </div>

            {isEditingLayout && (
              <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-black/80 text-white text-[10px] font-mono rounded z-50">
                DEBUG: {draggedTable ? `Dragging ${draggedTable.id}` : 'Idle'}
              </div>
            )}

            {isEditingLayout && (
              <>
                <button
                  onClick={async () => {
                    if (confirm("¿Estás seguro? Esto borrará todas las posiciones y recargará las mesas por defecto.")) {
                      // Delete all tables
                      const tablesCollectionRef = collection(db, 'tables');
                      const querySnapshot = await getDocs(tablesCollectionRef);
                      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
                      await Promise.all(deletePromises);
                      window.location.reload(); // Reload to trigger seed
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg text-xs"
                >
                  <Trash2 size={14} /> RESET
                </button>
                <button
                  onClick={handleAddTable}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg"
                >
                  <Plus size={18} /> MESA
                </button>
              </>
            )}

            <button
              onClick={() => {
                if (isEditingLayout) {
                  saveLayout();
                } else {
                  setIsEditingLayout(true);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isEditingLayout ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {isEditingLayout ? <><Save size={18} /> GUARDAR</> : <><PenLine size={18} /> EDITAR SALA</>}
            </button>
          </div>
        </div>

        <div className="flex-1 relative mt-4">
          {/* Grid lines for reference when editing */}
          {isEditingLayout && (
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            />
          )}

          {tables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              isSelecting={assigningReservationId !== null}
              isEditing={isEditingLayout}
              onClick={() => onSelectTable(table)}
              onPointerDown={(e) => handleDragStart(e, table)}
              onDelete={handleDeleteTable}
              style={{
                left: `${table.x}%`,
                top: `${table.y}%`
              }}
            />
          ))}

          {tables.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-4 pointer-events-none">
              <Database size={64} className="opacity-20" />
              <p className="text-xl font-medium">No hay datos en la base de datos</p>
              <button
                onClick={async () => {
                  const btn = document.activeElement;
                  if (btn) btn.disabled = true;
                  await seedDatabase();
                  if (btn) btn.disabled = false;
                }}
                className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
              >
                INICIALIZAR BASE DE DATOS
              </button>
            </div>
          )}
        </div>
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
                    onClick={() => onSelectDelivery(order)} // Use specific delivery handler
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
                  customers={customers}
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
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => setAssigningReservationId(res.id)}
                          className={`p-2 rounded-lg transition-all ${res.tableId ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'}`}
                          title="Asignar mesa"
                        >
                          <LayoutGrid size={18} />
                        </button>
                        {res.tableId && (
                          <span className="text-[10px] font-black text-center bg-orange-500 text-white rounded py-0.5">
                            M{res.tableId}
                          </span>
                        )}
                      </div>
                    </div>
                    {res.notes && (
                      <div className="mt-1 p-2 bg-slate-900/50 rounded-lg text-xs text-slate-500 border border-slate-700/50 italic mr-10">
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
    </div >
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
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [menu, setMenu] = useState({});
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('burgers');
  const [activeTab, setActiveTab] = useState('tables'); // Changed from 'orders' to 'tables'
  const [tempOrder, setTempOrder] = useState(null); // New separate state for temp orders
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [assigningReservationId, setAssigningReservationId] = useState(null);
  const [showUnseatConfirm, setShowUnseatConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Firestore Subscriptions
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setOrders(ordersData);
    });

    const unsubReservations = onSnapshot(collection(db, 'reservations'), (snapshot) => {
      const reservationsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setReservations(reservationsData.sort((a, b) => a.time.localeCompare(b.time)));
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setCustomers(customersData);
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
      unsubOrders();
      unsubReservations();
      unsubCustomers();
      unsubMenu();
    };
  }, []);

  const activeOrder = activeOrderId ? (orders.find(o => o.id === activeOrderId) || (tempOrder && tempOrder.id === activeOrderId ? tempOrder : null)) : null;
  const currentOrder = activeOrder;

  /*
     TABLE LAYOUT LOGIC
  */
  const [tablesConfig, setTablesConfig] = useState([]);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [draggedTable, setDraggedTable] = useState(null);
  const containerRef = useRef(null);

  // Load Tables Config from DF
  useEffect(() => {
    const unsubTables = onSnapshot(collection(db, 'tables'), (snapshot) => {
      if (snapshot.empty) {
        // Seed initial 30 tables (21 Sala + 9 Terraza)
        const initial = [];
        // Sala: 3 rows of 7 = 21
        for (let i = 0; i < 21; i++) {
          initial.push({
            id: (i + 1).toString(),
            name: `M${i + 1}`,
            x: 5 + (i % 7) * 13,
            y: 5 + Math.floor(i / 7) * 15,
            type: 'sala'
          });
        }
        // Terraza: 9 tables at bottom
        for (let i = 0; i < 9; i++) {
          initial.push({
            id: `T${i + 1}`,
            name: `T${i + 1}`,
            x: 10 + i * 9,
            y: 70, // Bottom area
            type: 'terraza'
          });
        }

        // Write to DB
        initial.forEach(t => setDoc(doc(db, 'tables', t.id), t));
        setTablesConfig(initial);
      } else {
        const data = snapshot.docs.map(d => {
          const dData = d.data();
          // Sanitize coordinates if missing/NaN
          return {
            ...dData,
            id: d.id,
            x: (typeof dData.x === 'number' && !isNaN(dData.x)) ? dData.x : 0,
            y: (typeof dData.y === 'number' && !isNaN(dData.y)) ? dData.y : 0
          };
        });

        // --- ENSURE FULL SET (M1-M21, T1-T9) ---
        const existingIds = new Set(data.map(t => t.id));
        const missingTables = [];

        // Check Sala (1-21)
        for (let i = 0; i < 21; i++) {
          const id = (i + 1).toString();
          if (!existingIds.has(id)) {
            missingTables.push({
              id,
              name: `M${i + 1}`,
              x: 5 + (i % 7) * 13,
              y: 5 + Math.floor(i / 7) * 15,
              type: 'sala',
              status: 'free'
            });
          }
        }

        // Check Terraza (T1-T9)
        for (let i = 0; i < 9; i++) {
          const id = `T${i + 1}`;
          if (!existingIds.has(id)) {
            missingTables.push({
              id,
              name: `T${i + 1}`,
              x: 10 + i * 9,
              y: 70, // Bottom area
              type: 'terraza',
              status: 'free'
            });
          }
        }

        // Merge existing + missing
        const fullData = [...data, ...missingTables];

        // If we found missing tables, save them to DB so next load is complete
        if (missingTables.length > 0) {
          missingTables.forEach(t => setDoc(doc(db, 'tables', t.id), t));
        }

        // Check if many items are at 0,0 (clumping) -> indicates bad data migration
        // Only check existing 'clumped' ones, new ones are created with valid coords
        const clumped = fullData.filter(t => t.x === 0 && t.y === 0).length;
        if (clumped > 5) {
          // Auto-fix: Redistribute them temporarily in a grid
          const fixedData = fullData.map((t, i) => {
            if (t.x === 0 && t.y === 0) {
              return {
                ...t,
                x: 5 + (i % 8) * 11, // Simple grid
                y: 5 + Math.floor(i / 8) * 12
              };
            }
            return t;
          });
          setTablesConfig(fixedData);

          // Auto-save the fixed positions to DB immediately to persist the un-clumping
          fixedData.forEach(t => {
            if (t.x !== 0 || t.y !== 0) {
              setDoc(doc(db, 'tables', t.id), t);
            }
          });
        } else {
          setTablesConfig(fullData);
        }
      }
    });
    return () => unsubTables();
  }, []);

  /* D&D Logic with Global Listeners (Pointer Events) */
  const draggedTableInstance = useRef(null); // Mutable ref to avoid stale state in listeners

  const handleDragMove = (e) => {
    // Read from ref, not state (state is async/stale in listener closure)
    const currentDrag = draggedTableInstance.current;
    if (!currentDrag) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    // Calculate delta in percentage
    const deltaXPixels = e.clientX - currentDrag.startX;
    const deltaYPixels = e.clientY - currentDrag.startY;

    const deltaXPercent = (deltaXPixels / rect.width) * 100;
    const deltaYPercent = (deltaYPixels / rect.height) * 100;

    const newX = Math.max(0, Math.min(90, currentDrag.initialX + deltaXPercent));
    const newY = Math.max(0, Math.min(90, currentDrag.initialY + deltaYPercent));

    setTablesConfig(prev => prev.map(t =>
      t.id === currentDrag.id ? { ...t, x: newX, y: newY } : t
    ));
  };

  const handleDragEnd = () => {
    draggedTableInstance.current = null;
    setDraggedTable(null); // Clear UI state if needed
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', handleDragEnd);
  };

  const handleDragStart = (e, table) => {
    if (!isEditingLayout) return;

    // Pointer Events preventDefault not needed for simple dragging unless touch scrolling issue
    // but touch-action: none handles that.

    // Set Ref immediately for synchronous access in listeners
    draggedTableInstance.current = {
      id: table.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: (typeof table.x === 'number' && !isNaN(table.x)) ? table.x : 0,
      initialY: (typeof table.y === 'number' && !isNaN(table.y)) ? table.y : 0
    };

    // Set State for UI feedback (e.g. valid 'draggedTable')
    setDraggedTable(draggedTableInstance.current);

    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handleDragEnd);
  };

  const handleAddTable = async () => {
    const newId = Date.now().toString();
    // Find suitable name
    const maxNum = tablesConfig.reduce((max, t) => {
      const num = parseInt(t.name.replace(/\D/g, '')) || 0;
      return num > max ? num : max;
    }, 0);

    const newTable = {
      id: newId,
      name: `M${maxNum + 1}`,
      x: 50,
      y: 50,
      type: 'sala',
      status: 'free'
    };

    // Update local and DB
    setTablesConfig(prev => [...prev, newTable]);
    await setDoc(doc(db, 'tables', newId), newTable);
  };

  const handleDeleteTable = async (table) => {
    if (confirm(`¿Eliminar mesa ${table.name}?`)) {
      setTablesConfig(prev => prev.filter(t => t.id !== table.id));
      await deleteDoc(doc(db, 'tables', table.id));
    }
  };

  const saveLayout = async () => {
    try {
      await Promise.all(tablesConfig.map(t => setDoc(doc(db, 'tables', t.id), t)));
      setIsEditingLayout(false);
    } catch (e) {
      console.error("Error saving layout", e);
    }
  };

  const derivedTables = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tablesConfig.map(t => {
      const order = orders.find(o => o.type === 'sala' && (o.tableId === t.id || o.name === t.name) && o.status !== 'closed');
      // Note: We use t.id to match.

      // Find valid reservation for today
      const res = reservations.find(r => r.tableId === t.id && r.date === todayStr && !r.seated);
      let blocked = false;
      if (res) {
        const [h, m] = res.time.split(':').map(Number);
        const resTime = new Date();
        resTime.setHours(h, m, 0, 0);
        const diff = (resTime - now) / (1000 * 60);
        if (diff <= 30 && diff > -60) blocked = true;
      }

      const isEffectivelyOccupied = order && (
        (order.items && order.items.length > 0) ||
        (order.stage && order.stage !== 'empty') ||
        order.status === 'payment'
      );

      if (isEffectivelyOccupied) {
        // CRITICAL: Preserve table config (x, y, id, name) over order data
        return { ...order, ...t, status: order.status || 'occupied', reservation: res, isBlocked: blocked };
      }
      return { ...t, status: 'free', total: 0, items: [], reservation: res, isBlocked: blocked };
    });
  }, [orders, reservations, tablesConfig, now]);

  const derivedDeliveries = useMemo(() => {
    return orders.filter(o => o.type === 'delivery' && o.status !== 'closed');
  }, [orders]);

  const handleAssignTable = async (reservationId, tableId) => {
    try {
      await updateDoc(doc(db, 'reservations', reservationId), { tableId });
      setAssigningReservationId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectTable = async (table) => {
    if (assigningReservationId) {
      await handleAssignTable(assigningReservationId, table.id);
      return;
    }
    const existingOrder = orders.find(o => o.type === 'sala' && o.tableId === table.id && o.status !== 'closed');

    if (existingOrder) {
      setActiveOrderId(existingOrder.id);
    } else {
      const id = Date.now().toString();
      const newTempOrder = {
        id,
        type: 'sala',
        tableId: table.id,
        name: table.name,
        status: 'occupied',
        stage: 'empty',
        total: 0,
        items: [],
        comment: '',
        _isTemp: true
      };
      setTempOrder(newTempOrder);
      setActiveOrderId(id);
    }
  };

  const handleSelectDelivery = (delivery) => {
    setActiveOrderId(delivery.id);
  };

  const handleAddDelivery = async (platform) => {
    const id = Date.now().toString();
    const newOrder = {
      id,
      orderId: Date.now(),
      type: 'delivery',
      name: `#${platform.substring(0, 2).toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`,
      platform,
      status: 'cocina',
      total: 0,
      items: [],
      comment: ''
    };
    await setDoc(doc(db, 'orders', id), newOrder);
    setActiveOrderId(id);
  };

  const upsertCustomer = async (customerData) => {
    if (!customerData.phone) return;
    const phone = customerData.phone.replace(/\s/g, '');
    const existing = customers.find(c => c.phone.replace(/\s/g, '') === phone);

    if (existing) {
      await updateDoc(doc(db, 'customers', existing.id), {
        name: customerData.name || existing.name,
        email: customerData.email || existing.email,
        orderCount: (existing.orderCount || 0) + 1,
        lastOrder: new Date().toISOString()
      });
    } else {
      const id = Date.now().toString();
      await setDoc(doc(db, 'customers', id), {
        id,
        phone,
        name: customerData.name || 'Cliente Nuevo',
        email: customerData.email || '',
        orderCount: 1,
        firstOrder: new Date().toISOString(),
        lastOrder: new Date().toISOString()
      });
    }
  };

  const handleAddReservation = async (data) => {
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, 'reservations', id), {
        id,
        ...data,
        createdAt: new Date().toISOString()
      });
      // Optionally link customer on reservation too
      await upsertCustomer({ phone: data.phone, name: data.name, email: data.email });
    } catch (error) {
      console.error('Error adding reservation:', error);
      alert('Error al añadir reserva: ' + error.message);
    }
  };

  const handleClearOrders = async () => {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'orders', d.id));
      }
      setShowDeleteAllConfirm(false);
      setActiveOrderId(null);
    } catch (error) {
      console.error('Error clearing orders:', error);
    }
  };

  const handleMarchar = async () => {
    if (!currentOrder) return;
    try {
      console.log('Marchando pedido:', currentOrder.id);
      const newItems = currentOrder.items.map(item => ({
        ...item,
        sentToKitchen: true
      }));

      await updateDoc(doc(db, 'orders', currentOrder.id), {
        items: newItems
      });

      console.log('Pedido marchado con éxito');
      setActiveOrderId(null);
    } catch (error) {
      console.error('Error al marchar pedido:', error);
      alert('Error al marchar pedido: ' + error.message);
    }
  };

  const handleCloseTable = async () => {
    setTempOrder(null); // Clean up any temp order
    setActiveOrderId(null);
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
        category: product.category,
        sentToKitchen: false,
        qty: 1,
        comment: ''
      };

      if (!currentOrder) {
        console.error('No active order to add item to');
        return;
      }

      const currentItems = currentOrder.items || [];
      const isFirstItem = currentItems.length === 0;

      // Determine next stage
      const nextStage = product.category === 'bebidas' ? 'drinks' :
        product.category === 'entrantes' ? 'starters' :
          product.category === 'burgers' ? 'burgers' :
            product.category === 'postres' ? 'desserts' :
              (currentOrder.stage === 'empty' ? 'drinks' : currentOrder.stage);

      // If first item, ensure we mark seated and handle reservation
      if (isFirstItem && currentOrder.type === 'sala') {
        const tableInfo = derivedTables.find(t => t.id === currentOrder.tableId);
        if (tableInfo?.reservation && !tableInfo.reservation.seated) {
          console.log('Marking reservation as seated:', tableInfo.reservation.id);
          await updateDoc(doc(db, 'reservations', tableInfo.reservation.id), { seated: true });
        }
      }

      console.log('Updating Order in Firestore. New Stage:', nextStage);

      const updatedOrderData = {
        items: [...currentItems, newItem],
        total: parseFloat(((currentOrder.total || 0) + finalPrice).toFixed(2)),
        stage: currentOrder.type === 'sala' ? (nextStage === 'empty' ? 'drinks' : nextStage) : (currentOrder.stage || 'cocina')
      };

      if (currentOrder._isTemp) {
        // Promote Temp Order to Real Order
        const { _isTemp, ...baseOrderData } = currentOrder;
        const realOrder = {
          ...baseOrderData,
          ...updatedOrderData
        };

        // Optimistic update: Temporarily keep it in tempOrder but updated, 
        // until onSnapshot picks it up or we switch ID? 
        // Actually, better to just write to DB. 'orders' will update via snapshot.
        // We persist tempOrder locally updated just in case of lag.
        setTempOrder(null); // Clear temp
        // But wait, if we clear temp, activeOrder becomes null until snapshot arrives?
        // Let's add it effectively to 'orders' optimistically? 
        // No, let's keep tempOrder until we are sure? 
        // Easier: Just set activeOrderId to the same ID. 
        // And relying on onSnapshot implies a flicker.

        // Better Strategy: Just write to DB. 
        await setDoc(doc(db, 'orders', currentOrder.id), realOrder);

        // We don't need to manually update 'orders' because onSnapshot will do it.
        // But to avoid flicker, we can add it to 'orders' optimistically.
        setOrders(prev => [...prev, realOrder]);
      } else {
        // Normal update
        await updateDoc(doc(db, 'orders', currentOrder.id), updatedOrderData);
      }

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

    await updateDoc(doc(db, 'orders', currentOrder.id), {
      items: currentOrder.items.filter(i => i.orderId !== orderId),
      total: currentOrder.total - itemToRemove.price
    });
  };

  const updateComment = async (val) => {
    if (!currentOrder) return;
    await updateDoc(doc(db, 'orders', currentOrder.id), {
      comment: val
    });
  };

  const updateCustomerInfo = async (field, val) => {
    if (!activeOrder || activeOrder.type !== 'delivery') return;

    await updateDoc(doc(db, 'orders', activeOrder.id), {
      [field]: val
    });

    // If we're updating phone, try to lookup customer and auto-fill
    if (field === 'customerPhone' && val.length >= 9) {
      const phone = val.replace(/\s/g, '');
      const match = customers.find(c => c.phone.replace(/\s/g, '') === phone);
      if (match) {
        await updateDoc(doc(db, 'orders', activeOrder.id), {
          customerName: match.name,
          customerEmail: match.email || ''
        });
      }
    }
  };

  const updateItemComment = async (orderId, comment) => {
    if (!currentOrder) return;
    const newItems = currentOrder.items.map(item =>
      item.orderId === orderId ? { ...item, comment } : item
    );
    await updateDoc(doc(db, 'orders', currentOrder.id), {
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
          <button
            onClick={() => setShowDeleteAllConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all font-bold text-xs"
          >
            <Trash2 size={14} /> Borrar Pedidos
          </button>
          <button onClick={seedDatabase} className="flex items-center gap-1 hover:text-white transition-colors">
            <Database size={14} /> Sync Data
          </button>
          <span>{new Date().toLocaleDateString()}</span>
          <span>Administrador</span>
        </div>
      </div>

      {!currentOrder ? (
        <Dashboard
          tables={derivedTables}
          deliveries={derivedDeliveries}
          reservations={reservations}
          customers={customers}
          assigningReservationId={assigningReservationId}
          setAssigningReservationId={setAssigningReservationId}
          onSelectTable={handleSelectTable}
          onSelectDelivery={handleSelectDelivery}
          onAddReservation={handleAddReservation}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isEditingLayout={isEditingLayout}
          setIsEditingLayout={setIsEditingLayout}
          handleSaveLayout={saveLayout}
          handleAddTable={handleAddTable}
          handleDeleteTable={handleDeleteTable}
          draggedTable={draggedTable}
          handleDragStart={handleDragStart}
          handleDragMove={handleDragMove}
          handleDragEnd={handleDragEnd}
          containerRef={containerRef}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[350px] md:w-[400px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20 shadow-2xl">
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-400 uppercase font-bold">{currentOrder.type === 'sala' ? 'MESA' : 'PEDIDO'}</div>
                <div className="text-2xl font-black text-orange-500">{currentOrder.name}</div>
              </div>
              <div className="flex gap-2">
                {currentOrder.type === 'sala' && currentOrder.stage !== 'empty' && currentOrder.items?.length === 0 && (
                  <button
                    onClick={() => setShowUnseatConfirm(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-red-900/50 hover:text-red-400 rounded-lg text-xs font-bold transition-all border border-slate-600"
                  >
                    <LogOut size={14} className="rotate-180" /> LEVANTAR
                  </button>
                )}
                <button
                  onClick={handleCloseTable}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors border border-slate-600 shadow-sm"
                >
                  <ArrowLeft size={16} /> Salir
                </button>
              </div>
            </div>

            {/* Client Info (Delivery only) */}
            {currentOrder.type === 'delivery' && (
              <div className="p-3 bg-slate-900/50 border-b border-slate-800 grid grid-cols-2 gap-2">
                <div className="relative">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Teléfono</div>
                  <input
                    type="text"
                    value={currentOrder.customerPhone || ''}
                    onChange={(e) => updateCustomerInfo('customerPhone', e.target.value)}
                    placeholder="6xx xxx xxx"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 shadow-inner"
                  />
                  {currentOrder.customerPhone && (() => {
                    const match = customers.find(c => c.phone.replace(/\s/g, '') === currentOrder.customerPhone.replace(/\s/g, ''));
                    return match ? (
                      <div className="absolute right-2 bottom-1.5 text-[8px] font-bold text-orange-400 bg-orange-400/10 px-1 rounded">
                        {match.orderCount} Pedidos
                      </div>
                    ) : null;
                  })()}
                </div>
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
              {currentOrder.type === 'sala' && currentOrder.items?.length === 0 && currentOrder.stage === 'empty' ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <div className="bg-slate-800 p-8 rounded-3xl border-2 border-dashed border-slate-700 w-full animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users size={40} className="text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">
                      {(() => {
                        const tableInfo = derivedTables.find(t => t.id === currentOrder.tableId);
                        return tableInfo?.reservation
                          ? `¿Desea sentar a la reserva ${tableInfo.reservation.name}?`
                          : '¿Desea sentar a alguien?';
                      })()}
                    </h3>
                    <p className="text-slate-500 text-sm mb-8">Selecciona "SÍ" para abrir la cuenta y empezar el servicio.</p>
                    <button
                      onClick={async () => {
                        try {
                          const tableInfo = derivedTables.find(t => t.id === currentOrder.tableId);
                          if (tableInfo?.reservation) {
                            await updateDoc(doc(db, 'reservations', tableInfo.reservation.id), { seated: true });
                          }

                          if (currentOrder._isTemp) {
                            const { _isTemp, ...baseData } = currentOrder;
                            const realOrder = { ...baseData, stage: 'drinks' };
                            await setDoc(doc(db, 'orders', currentOrder.id), realOrder);
                            setOrders(prev => [...prev, realOrder]);
                            setTempOrder(null);
                          } else {
                            await updateDoc(doc(db, 'orders', currentOrder.id), { stage: 'drinks' });
                          }
                        } catch (error) {
                          console.error("Error seating:", error);
                        }
                      }}
                      className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={24} /> SÍ, EMPEZAR PEDIDO
                    </button>
                  </div>
                </div>
              ) : currentOrder.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 p-10 text-center">
                  <ShoppingBag size={48} className="mb-2 mx-auto" />
                  <p className="font-bold">El pedido está vacío</p>
                  <p className="text-xs">Añade productos de la derecha</p>
                </div>
              ) : (
                currentOrder.items.map((item) => (
                  <div
                    key={item.orderId}
                    className={`p-3 rounded-lg border transition-all animate-in slide-in-from-left-2 duration-200 ${item.sentToKitchen ? 'bg-emerald-900/30 border-emerald-500/50 shadow-inner' : 'bg-slate-800 border-slate-700'}`}
                  >
                    <div className="flex justify-between group">
                      <button
                        onClick={() => {
                          if (item.sentToKitchen) return;
                          const com = prompt("Comentario para " + item.name + ":", item.comment || "");
                          if (com !== null) updateItemComment(item.orderId, com);
                        }}
                        className="flex-1 text-left relative"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {item.sentToKitchen && <ChefHat size={16} className="text-emerald-400" />}
                            <span className={`font-bold ${item.sentToKitchen ? 'text-emerald-100' : 'text-slate-100'}`}>{item.name}</span>
                          </div>
                          <span className={`font-bold ${item.sentToKitchen ? 'text-emerald-400' : 'text-slate-100'}`}>{formatPrice(item.price)}</span>
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
                        disabled={item.sentToKitchen}
                        className={`ml-3 p-2 rounded-md transition-colors self-center ${item.sentToKitchen ? 'text-emerald-800 cursor-not-allowed' : 'text-slate-500 hover:text-red-400 hover:bg-red-400/10'}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700">
              <div className="flex justify-between items-end mb-4 px-1">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Cuenta Total</span>
                <span className="text-4xl font-black text-white">{formatPrice(currentOrder.total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleMarchar}
                  disabled={!currentOrder.items?.some(i => i.sentToKitchen === false)}
                  className={`py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${currentOrder.items?.some(i => i.sentToKitchen === false)
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'}`}
                >
                  <Send size={20} className={currentOrder.items?.some(i => i.sentToKitchen === false) ? "animate-pulse" : ""} /> MARCHAR
                </button>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-600 shadow-sm"
                >
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

      {showUnseatConfirm && (
        <ConfirmationModal
          title="¿Levantar Mesa?"
          message="Se quitará el estado de 'sentados' y la mesa volverá a estar disponible para empezar de nuevo."
          icon={LogOut}
          color="red"
          confirmText="SÍ, LEVANTAR"
          cancelText="MANTENER SENTADOS"
          onCancel={() => setShowUnseatConfirm(false)}
          onConfirm={async () => {
            const tableInfo = derivedTables.find(t => t.id === currentOrder.tableId);
            if (tableInfo?.reservation) {
              await updateDoc(doc(db, 'reservations', tableInfo.reservation.id), { seated: false });
            }
            await updateDoc(doc(db, 'orders', currentOrder.id), { stage: 'empty' });
            setShowUnseatConfirm(false);
          }}
        />
      )}

      {showPaymentModal && currentOrder && (
        <PaymentModal
          order={currentOrder}
          onCancel={() => setShowPaymentModal(false)}
          onConfirm={async (method) => {
            try {
              await updateDoc(doc(db, 'orders', currentOrder.id), {
                status: 'closed',
                paymentMethod: method,
                closedAt: new Date().toISOString()
              });
              setShowPaymentModal(false);
              setActiveOrderId(null);
            } catch (error) {
              console.error('Error paying:', error);
            }
          }}
        />
      )}

      {showDeleteAllConfirm && (
        <ConfirmationModal
          title="¿Borrar Todo?"
          message="Esta acción eliminará todos los pedidos activos (Sala y Delivery) de forma permanente. ¿Desea continuar?"
          icon={Trash2}
          color="red"
          confirmText="SÍ, BORRAR TODO"
          cancelText="CANCELAR"
          onCancel={() => setShowDeleteAllConfirm(false)}
          onConfirm={handleClearOrders}
        />
      )}
    </div>
  );
};

export default App;
