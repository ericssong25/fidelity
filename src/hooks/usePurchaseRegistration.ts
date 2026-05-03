import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  points: number;
  category: string;
  is_available: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

interface CustomerInfo {
  loyaltyCardId: string;
  userId: string;
  name: string;
  points: number;
  visits: number;
}

interface UsePurchaseRegistrationOptions {
  businessId: string | undefined;
  showToast: (message: string, type: 'success' | 'error') => void;
  onSuccess?: () => void;
  refreshCards?: () => Promise<void>;
}

export function usePurchaseRegistration({
  businessId,
  showToast,
  onSuccess,
  refreshCards,
}: UsePurchaseRegistrationOptions) {
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Multiplier / discount info for the current customer
  const [customerMultiplier, setCustomerMultiplier] = useState(1);
  const [customerDiscount, setCustomerDiscount] = useState(0);
  const [customerLevelName, setCustomerLevelName] = useState('');

  async function loadProducts() {
    if (!businessId) return;

    setIsLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_available', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading products:', error);
        showToast('Error al cargar productos', 'error');
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      showToast('Failed to load products', 'error');
    } finally {
      setIsLoadingProducts(false);
    }
  }

  async function openPurchase(info: CustomerInfo) {
    setCustomer(info);
    setCart([]);
    setProductSearch('');
    setFilteredProducts([]);
    setCustomerMultiplier(1);
    setCustomerDiscount(0);
    setCustomerLevelName('');
    setPurchaseModal(true);
    loadProducts();

    // Fetch multiplier and discount for this customer's current level
    if (!businessId) return;

    try {
      const { data: card } = await supabase
        .from('loyalty_cards')
        .select('current_level, business_id')
        .eq('id', info.loyaltyCardId)
        .maybeSingle();

      if (card?.current_level) {
        const { data: biz } = await supabase
          .from('businesses')
          .select('loyalty_levels')
          .eq('id', card.business_id)
          .maybeSingle();

        const levels = biz?.loyalty_levels as Array<{
          name: string; multiplier: number; discount_percent: number;
        }> | undefined;

        const level = levels?.find(l => l.name === card.current_level);
        if (level) {
          setCustomerMultiplier(level.multiplier || 1);
          setCustomerDiscount(level.discount_percent || 0);
          setCustomerLevelName(level.name);
        }
      }
    } catch {
      // Silently fail — multiplier info is cosmetic
    }
  }

  function closePurchase() {
    setPurchaseModal(false);
    setCart([]);
    setProductSearch('');
    setCustomer(null);
  }

  // Filter products based on search
  useEffect(() => {
    if (!productSearch.trim()) {
      setFilteredProducts([]);
      return;
    }

    const search = productSearch.toLowerCase();
    const filtered = products
      .filter(
        p =>
          p.name.toLowerCase().includes(search) ||
          (p.category || '').toLowerCase().includes(search)
      )
      .slice(0, 5);

    setFilteredProducts(filtered);
  }, [productSearch, products]);

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(item => item.id !== productId));
  }

  function updateQuantity(productId: string, delta: number) {
    setCart(prev =>
      prev.map(item => {
        if (item.id === productId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartPoints = cart.reduce((sum, item) => sum + item.points * item.quantity, 0);
  const cartMultipliedPoints = Math.round(cartPoints * customerMultiplier);

  async function handleSubmitPurchase() {
    if (!businessId || !customer) {
      showToast('Falta información de negocio o cliente', 'error');
      return;
    }

    if (cart.length === 0) {
      showToast('Agrega al menos un producto', 'error');
      return;
    }

    setIsProcessingPurchase(true);

    try {
      const { data: loyaltyCard, error: cardError } = await supabase
        .from('loyalty_cards')
        .select('id, user_id, current_points, total_points_earned, total_visits')
        .eq('id', customer.loyaltyCardId)
        .single();

      if (cardError || !loyaltyCard) {
        console.error('Card error:', cardError);
        showToast('El cliente no tiene tarjeta de lealtad', 'error');
        setIsProcessingPurchase(false);
        return;
      }

      const totalAmount = cartTotal;
      const basePoints = cartPoints;

      // 1. Create the purchase record (trigger applies multiplier to total_points)
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          loyalty_card_id: loyaltyCard.id,
          business_id: businessId,
          total_amount: totalAmount,
          total_points: basePoints,
          status: 'completed',
          payment_method: 'cash',
          notes: '',
          created_by: customer.userId,
        })
        .select()
        .single();

      if (purchaseError || !purchase) {
        console.error('Purchase creation error:', purchaseError);
        showToast('Error al crear compra', 'error');
        setIsProcessingPurchase(false);
        return;
      }

      // purchase.total_points is already multiplied by the DB trigger
      const earnedPoints = purchase.total_points;

      // 2. Create purchase items
      const purchaseItems = cart.map(item => ({
        purchase_id: purchase.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        points_per_unit: item.points,
        total_points: item.points * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(purchaseItems);

      if (itemsError) {
        console.error('Purchase items error:', itemsError);
        showToast('Error al agregar items', 'error');
        setIsProcessingPurchase(false);
        return;
      }

      // 3. Create point transaction (with multiplied points)
      const itemDescriptions = cart
        .map(item => `${item.quantity} ${item.name}${item.quantity > 1 ? 's' : ''}`)
        .join(', ');

      const { error: transactionError } = await supabase
        .from('point_transactions')
        .insert({
          loyalty_card_id: loyaltyCard.id,
          type: 'earned',
          points: earnedPoints,
          description: itemDescriptions,
          reference_id: purchase.id,
          reference_type: 'purchase',
          created_by: customer.userId,
        });

      if (transactionError) {
        console.error('Point transaction error:', transactionError);
      }

      // 4. Update loyalty card (with multiplied points)
      const { error: updateError } = await supabase
        .from('loyalty_cards')
        .update({
          current_points: (loyaltyCard.current_points || 0) + earnedPoints,
          total_points_earned: (loyaltyCard.total_points_earned || 0) + earnedPoints,
          total_visits: (loyaltyCard.total_visits || 0) + 1,
          last_visit: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', loyaltyCard.id);

      if (updateError) {
        console.error('Card update error:', updateError);
      }

      const multiplierMsg = customerMultiplier > 1 ? ` (×${customerMultiplier} ${customerLevelName})` : '';
      showToast(`¡Compra completada! +${earnedPoints} puntos agregados${multiplierMsg}`, 'success');

      setCart([]);
      setPurchaseModal(false);
      setCustomer(null);

      if (refreshCards) await refreshCards();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Purchase processing error:', err);
      showToast('Ocurrió un error inesperado', 'error');
    } finally {
      setIsProcessingPurchase(false);
    }
  }

  return {
    purchaseModal,
    customer,
    products,
    cart,
    isLoadingProducts,
    isProcessingPurchase,
    productSearch,
    setProductSearch,
    filteredProducts,
    cartTotal,
    cartPoints: cartMultipliedPoints,
    cartBasePoints: cartPoints,
    customerMultiplier,
    customerDiscount,
    customerLevelName,
    openPurchase,
    closePurchase,
    addToCart,
    removeFromCart,
    updateQuantity,
    handleSubmitPurchase,
  };
}
