import { useState, useEffect } from 'react';
import { Plus, Edit2, AlertCircle, RefreshCw } from 'lucide-react';
import Modal from '../../components/Modal';
import { useApp } from '../../context/AppContext';
import { useBusinessData } from '../../context/BusinessDataContext';
import { supabase } from '../../lib/supabase';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  points: number;
  category: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

const gradients = [
  'linear-gradient(135deg, #12173B, #7546ED)',
  'linear-gradient(135deg, #7546ED, #DC89FF)',
  'linear-gradient(135deg, #032C7D, #7546ED)',
  'linear-gradient(135deg, #12173B, #032C7D)',
];

export default function ProductsPage() {
  const { showToast } = useApp();
  const { business } = useBusinessData();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [modal, setModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAvailable, setEditAvailable] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load products from Supabase
  async function loadProducts() {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', business.id)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (supabaseError) {
        console.error('Error loading products:', supabaseError);
        setError('Failed to load products');
      } else {
        setProducts(data || []);
      }
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, [business?.id]);

  // Get unique categories from products
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

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
    setEditName(p.name); 
    setEditPrice(String(p.price)); 
    setEditPoints(String(p.points || 0)); 
    setEditCategory(p.category);
    setEditDescription(p.description || ''); 
    setEditAvailable(p.is_available);
    setModal(true);
  }

  async function handleSave() {
    if (!business?.id) {
      showToast('Business not found', 'error');
      return;
    }

    if (!editName.trim() || !editPrice || !editCategory.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const productData = {
        business_id: business.id,
        name: editName.trim(),
        description: editDescription.trim(),
        price: parseFloat(editPrice) || 0,
        points: parseInt(editPoints) || 0,
        category: editCategory.trim(),
        is_available: editAvailable
      };

      if (editingId) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId);

        if (updateError) {
          console.error('Error updating product:', updateError);
          showToast('Failed to update product', 'error');
          setIsSaving(false);
          return;
        }

        // Update local state
        setProducts(prev => prev.map(p => 
          p.id === editingId 
            ? { ...p, ...productData, id: editingId }
            : p
        ));
        showToast('Product updated', 'success');
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (insertError || !newProduct) {
          console.error('Error creating product:', insertError);
          showToast('Failed to create product', 'error');
          setIsSaving(false);
          return;
        }

        // Add to local state
        setProducts(prev => [...prev, newProduct]);
        showToast('Product created', 'success');
      }

      setModal(false);
    } catch (err: any) {
      console.error('Error saving product:', err);
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleAvailable(id: string) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newAvailability = !product.is_available;

    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({ is_available: newAvailability })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating availability:', updateError);
        showToast('Failed to update availability', 'error');
        return;
      }

      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, is_available: newAvailability } : p
      ));
    } catch (err: any) {
      console.error('Error toggling availability:', err);
      showToast('Failed to update availability', 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <h1 className="font-extrabold text-[#12173B] text-xl mb-4">Products</h1>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[#B1A9E5]/30 border-t-[#7546ED] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#B1A9E5] text-sm">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-5 pb-24 md:pb-8 overflow-y-auto">
        <h1 className="font-extrabold text-[#12173B] text-xl mb-4">Products</h1>
        <div className="text-center py-8">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-sm font-medium mb-2">Error loading products</p>
          <p className="text-[#B1A9E5] text-xs mb-4">{error}</p>
          <button
            onClick={loadProducts}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-[#7546ED] text-white rounded-btn text-sm font-bold"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
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

      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-[#F4F3FB] flex items-center justify-center mx-auto mb-4">
            <Plus size={32} className="text-[#B1A9E5]" />
          </div>
          <p className="text-[#B1A9E5] text-sm">
            {products.length === 0 ? 'No products yet' : 'No products in this category'}
          </p>
          <p className="text-[#B1A9E5] text-xs mt-1">
            {products.length === 0 ? 'Click "Add Product" to create your first product' : 'Try a different category'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p, i) => (
            <div key={p.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-[#B1A9E5]/10 ${!p.is_available ? 'opacity-60' : ''}`}>
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
                      p.is_available ? 'bg-[#10B981]' : 'bg-[#B1A9E5]/30'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
                      p.is_available ? 'left-[18px]' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full py-3 rounded-btn bg-[#7546ED] text-white font-bold text-sm disabled:opacity-50"
          >
            {isSaving ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save Changes' : 'Add Product')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
