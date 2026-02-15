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
  Database
} from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, query, getDocs } from 'firebase/firestore';
import { seedDatabase } from './seed';

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

const Dashboard = ({ tables, onSelectTable }) => {
  const [showReservations, setShowReservations] = useState(false);

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
              onClick={seedDatabase}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
            >
              INICIALIZAR BASE DE DATOS
            </button>
          </div>
        )}
      </div>

      <div className="w-[380px] bg-slate-900 flex flex-col shrink-0 relative transition-all duration-300">
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-800">
          <span className="text-slate-400 font-bold text-sm tracking-wider">PANELES</span>
          <button
            onClick={() => setShowReservations(!showReservations)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${showReservations ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'}`}
          >
            <Calendar size={16} />
            <span className="font-bold text-sm">Reservas</span>
            {!showReservations && (
              <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                {MOCK_RESERVATIONS.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className={`absolute inset-0 p-6 overflow-y-auto transition-transform duration-300 ${showReservations ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Bike className="text-blue-400" /> Delivery Activo
            </h3>
            <div className="space-y-4">
              {MOCK_DELIVERY.map(order => (
                <div key={order.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${getPlatformColor(order.platform)}`}>
                      {order.platform}
                    </span>
                    <span className="text-slate-400 font-mono text-sm">{order.time}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-white font-bold text-lg">{order.orderId}</div>
                      <div className="text-slate-500 text-sm">{order.items} items • {order.status}</div>
                    </div>
                    <button className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`absolute inset-0 p-6 overflow-y-auto bg-slate-900 transition-transform duration-300 ${showReservations ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="text-orange-500" /> Reservas Hoy
            </h3>
            <div className="space-y-3">
              {MOCK_RESERVATIONS.map(res => (
                <div key={res.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                  <div className="flex flex-col items-center bg-slate-700 px-3 py-2 rounded-lg min-w-[60px]">
                    <Clock size={16} className="text-orange-400 mb-1" />
                    <span className="font-bold text-white">{res.time}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-200">{res.name}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1"><User size={12} /> {res.pax}p</span>
                      <span className="flex items-center gap-1"><Phone size={12} /> {res.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
              <button className="w-full py-3 mt-4 border-2 border-dashed border-slate-700 text-slate-500 rounded-xl hover:bg-slate-800 hover:text-slate-300 transition-colors font-bold text-sm">
                + NUEVA RESERVA
              </button>
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
        <img
          src={product.img}
          alt={product.name.es}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=Smile+Burger'; }}
        />
        <div className="absolute bottom-0 right-0 bg-black/70 px-2 py-1 text-white font-bold rounded-tl-lg">
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
            onClick={handleAdd}
            disabled={!isReady}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${isReady
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
          >
            <Plus size={24} />
            AÑADIR AL PEDIDO • {formatPrice(currentTotal)}
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [tables, setTables] = useState([]);
  const [menu, setMenu] = useState({});
  const [activeTableId, setActiveTableId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('burgers');
  const [customizingProduct, setCustomizingProduct] = useState(null);

  // Firestore Subscriptions
  useEffect(() => {
    const unsubTables = onSnapshot(collection(db, 'tables'), (snapshot) => {
      const tablesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setTables(tablesData.sort((a, b) => parseInt(a.id) - parseInt(b.id)));
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
      unsubMenu();
    };
  }, []);

  const activeTable = tables.find(t => t.id === activeTableId);

  const handleSelectTable = async (table) => {
    setActiveTableId(table.id);
    if (table.status === 'free') {
      await updateDoc(doc(db, 'tables', table.id), {
        status: 'occupied',
        stage: 'empty'
      });
    }
  };

  const handleCloseTable = () => {
    setActiveTableId(null);
  };

  const handleProductClick = (product) => {
    if (product.category === 'burgers') {
      setCustomizingProduct(product);
    } else {
      addItemToOrder({
        product,
        finalPrice: parsePrice(product.price),
        variant: null,
        extras: []
      });
    }
  };

  const addItemToOrder = async (itemConfig) => {
    const { product, variant, point, extras, finalPrice } = itemConfig;

    const newItem = {
      orderId: Date.now(),
      id: product.id,
      name: product.name.es,
      variantName: variant?.label || null,
      pointName: point ? COOKING_POINTS.find(p => p.id === point)?.label : null,
      extras: extras,
      price: finalPrice,
      qty: 1
    };

    if (activeTable) {
      await updateDoc(doc(db, 'tables', activeTable.id), {
        items: [...activeTable.items, newItem],
        total: activeTable.total + finalPrice,
        stage: product.category === 'bebidas' ? 'drinks' :
          product.category === 'entrantes' ? 'starters' :
            product.category === 'burgers' ? 'burgers' :
              product.category === 'postres' ? 'desserts' : activeTable.stage
      });
    }

    setCustomizingProduct(null);
  };

  const removeItem = async (orderId) => {
    if (!activeTable) return;
    const itemToRemove = activeTable.items.find(i => i.orderId === orderId);
    if (!itemToRemove) return;

    await updateDoc(doc(db, 'tables', activeTable.id), {
      items: activeTable.items.filter(i => i.orderId !== orderId),
      total: activeTable.total - itemToRemove.price
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

      {!activeTable ? (
        <Dashboard tables={tables} onSelectTable={handleSelectTable} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[350px] md:w-[400px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-20 shadow-2xl">
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-400 uppercase font-bold">MESA ACTUAL</div>
                <div className="text-2xl font-black text-orange-500">{activeTable.name}</div>
              </div>
              <button
                onClick={handleCloseTable}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
              >
                <ArrowLeft size={16} /> Salir
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {activeTable.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                  <ShoppingBag size={48} className="mb-2" />
                  <p>Mesa vacía</p>
                </div>
              ) : (
                activeTable.items.map((item) => (
                  <div key={item.orderId} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between group animate-in slide-in-from-left-2 duration-200">
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-200">{item.name}</span>
                        <span className="font-bold text-slate-200">{formatPrice(item.price)}</span>
                      </div>

                      {(item.variantName || item.pointName || (item.extras && item.extras.length > 0)) && (
                        <div className="text-xs text-slate-400 mt-1 pl-2 border-l-2 border-slate-600 space-y-0.5">
                          {item.variantName && <div className="text-orange-300">• {item.variantName}</div>}
                          {item.pointName && <div>• {item.pointName}</div>}
                          {item.extras?.map(e => (
                            <div key={e.id}>+ {e.label}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeItem(item.orderId)}
                      className="ml-3 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors self-center"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700">
              <div className="flex justify-between items-end mb-4">
                <span className="text-slate-400 font-medium">Total</span>
                <span className="text-4xl font-black text-white">{formatPrice(activeTable.total)}</span>
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
