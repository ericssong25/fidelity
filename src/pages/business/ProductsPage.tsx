import { useState } from 'react';
import { Plus, CreditCard as Edit2 } from 'lucide-react';
import { businesses } from '../../data/mockData';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';

const biz = businesses[0]; // Moka Café
const categories = ['All', ...Array.from(new Set(biz.products.map(p => p.category)))];

const gradients = [
  'linear-gradient(135deg, #12173B, #7546ED)',
  'linear-gradient(135deg, #7546ED, #DC89FF)',
  'linear-gradient(135deg, #032C7D, #7546ED)',
  'linear-gradient(135deg, #12173B, #032C7D)',
];

export default function ProductsPage() {
  const { showToast } = useApp();
  const [activeCategory, setActiveCategory] = useState('All');
  const [modal, setModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAvailable, setEditAvailable] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [products, setProducts] = useState(biz.products.map(p => ({ ...p })));

  const filtered = products.filter(p =>
    activeCategory === 'All' || p.category === activeCategory
  );

  function openAdd() {
    setEditingId(null);
    setEditName(''); setEditPrice(''); setEditPoints(''); setEditCategory(''); setEditDescription(''); setEditAvailable(true);
    setModal(true);
  }

  function openEdit(id: string) {
    const p = products.find(x => x.id === id)!;
    setEditingId(id);
    setEditName(p.name); setEditPrice(String(p.price)); setEditPoints(String(p.points || 0)); setEditCategory(p.category);
    setEditDescription(''); setEditAvailable(p.available);
    setModal(true);
  }

  function handleSave() {
    if (editingId) {
      // Edit existing product
      setProducts(prev => prev.map(p => 
        p.id === editingId 
          ? { ...p, name: editName, price: parseFloat(editPrice) || 0, points: parseInt(editPoints) || 0, category: editCategory, available: editAvailable }
          : p
      ));
    } else {
      // Add new product
      const newProduct = {
        id: `p${Date.now()}`,
        name: editName,
        price: parseFloat(editPrice) || 0,
        points: parseInt(editPoints) || 0,
        category: editCategory,
        available: editAvailable
      };
      setProducts(prev => [...prev, newProduct]);
    }
    setModal(false);
    showToast(editingId ? 'Product updated' : 'Product added', 'success');
  }

  function toggleAvailable(id: string) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, available: !p.available } : p));
  }

  return (
    <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-extrabold text-[#12173B] text-xl">Products</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-btn bg-[#7546ED] text-white text-xs font-bold"
        >
          <Plus size={14} />
          Add Product
        </button>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
              activeCategory === cat
                ? 'bg-[#7546ED] border-[#7546ED] text-white'
                : 'bg-white border-[#B1A9E5]/40 text-[#B1A9E5]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((p, i) => (
          <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#B1A9E5]/10">
            <div
              className="h-20 flex items-center justify-center"
              style={{ background: gradients[i % gradients.length] }}
            >
              <span className="text-white font-extrabold text-2xl">{p.name.charAt(0)}</span>
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-1">
                <p className="font-bold text-[#12173B] text-xs leading-tight flex-1">{p.name}</p>
                <button onClick={() => openEdit(p.id)} className="text-[#B1A9E5] hover:text-[#7546ED] transition-colors flex-shrink-0">
                  <Edit2 size={13} />
                </button>
              </div>
              <p className="text-[#B1A9E5] text-[10px] mt-0.5">{p.category}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex flex-col">
                  <span className="text-[#7546ED] font-extrabold text-sm">${p.price.toFixed(2)}</span>
                  <span className="text-[#10B981] font-semibold text-xs">+{p.points || 0} pts</span>
                </div>
                <button
                  onClick={() => toggleAvailable(p.id)}
                  className={`w-9 h-5 rounded-full transition-all duration-300 relative ${
                    p.available ? 'bg-[#10B981]' : 'bg-[#B1A9E5]/30'
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
                    p.available ? 'left-[18px]' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? 'Edit Product' : 'Add Product'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Product name"
              className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Description</label>
            <input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Short description"
              className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Price ($)</label>
              <input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Points</label>
              <input value={editPoints} onChange={e => setEditPoints(e.target.value)} type="number" placeholder="0"
                className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#B1A9E5] mb-1 block">Category</label>
            <input value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="Category"
              className="w-full px-3 py-2.5 rounded-inp border border-[#B1A9E5]/30 text-sm text-[#12173B] outline-none focus:border-[#7546ED] transition-all" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#12173B]">Available</span>
            <button
              onClick={() => setEditAvailable(v => !v)}
              className={`w-11 h-6 rounded-full transition-all duration-300 relative ${editAvailable ? 'bg-[#10B981]' : 'bg-[#B1A9E5]/30'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${editAvailable ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          <button onClick={handleSave} className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm">
            {editingId ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
