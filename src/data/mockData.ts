export type Level = 'Bronze' | 'Silver' | 'Gold';

export interface Transaction {
  id: string;
  description: string;
  points: number;
  date: string;
}

export interface LoyaltyRecord {
  businessId: string;
  points: number;
  level: Level;
  visits: number;
  transactions: Transaction[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string | null;
  initials: string;
  avatarId: string | null;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  points: number;
  category: string;
  available: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  discount: string;
  dateRange: string;
  status: 'Active' | 'Scheduled' | 'Expired';
  active: boolean;
}

export interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  available: boolean;
}

export interface NewsPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  pinned?: boolean;
}

export interface LevelThreshold {
  level: Level;
  minPoints: number;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  hours: { day: string; hours: string }[];
  products: Product[];
  promotions: Promotion[];
  rewards: Reward[];
  news: NewsPost[];
  levels: LevelThreshold[];
  colorAccent: string;
}

export interface BusinessCustomer {
  id: string;
  name: string;
  username: string;
  initials: string;
  level: Level;
  points: number;
  visits: number;
  lastVisit: string;
  transactions: Transaction[];
}

// ─── Sofia's loyalty data ────────────────────────────────────────────────────

export const sofia: Customer = {
  id: 'sofia',
  name: 'Sofia Martínez',
  email: 'sofia@email.com',
  username: '@sofiamar',
  phone: null,
  initials: 'SM',
  avatarId: null,
};

export const sofiaLoyalty: LoyaltyRecord[] = [
  {
    businessId: 'moka',
    points: 1240,
    level: 'Gold',
    visits: 18,
    transactions: [
      { id: 't1', description: 'Latte + Croissant', points: 8, date: 'Today 9:10am' },
      { id: 't2', description: 'Cold Brew', points: 4, date: 'Yesterday 3:45pm' },
      { id: 't3', description: 'Avocado Toast + Espresso', points: 9, date: '3 days ago' },
      { id: 't4', description: 'Cappuccino', points: 3, date: '5 days ago' },
      { id: 't5', description: 'Pase mensual canjeado', points: -1500, date: '1 week ago' },
      { id: 't6', description: 'Latte', points: 4, date: '1 week ago' },
    ],
  },
  {
    businessId: 'epico',
    points: 380,
    level: 'Silver',
    visits: 7,
    transactions: [
      { id: 't7', description: 'Épica Classic + Papas', points: 13, date: '2 days ago' },
      { id: 't8', description: 'Combo Épico', points: 14, date: '1 week ago' },
      { id: 't9', description: 'Milkshake', points: 5, date: '2 weeks ago' },
      { id: 't10', description: 'Doble Fuego', points: 12, date: '3 weeks ago' },
    ],
  },
  {
    businessId: 'fortuna',
    points: 90,
    level: 'Bronze',
    visits: 2,
    transactions: [
      { id: 't11', description: 'Americano', points: 2, date: '4 days ago' },
      { id: 't12', description: 'Muffin de Arándanos', points: 3, date: '2 weeks ago' },
    ],
  },
  {
    businessId: 'inboga',
    points: 520,
    level: 'Silver',
    visits: 11,
    transactions: [
      { id: 't13', description: 'Corte Clásico', points: 18, date: '1 week ago' },
      { id: 't14', description: 'Corte + Barba', points: 28, date: '3 weeks ago' },
      { id: 't15', description: 'Diseño de Barba gratis canjeado', points: -250, date: '1 month ago' },
      { id: 't16', description: 'Corte Clásico', points: 18, date: '1 month ago' },
    ],
  },
];

// ─── Businesses ──────────────────────────────────────────────────────────────

export const businesses: Business[] = [
  {
    id: 'moka',
    name: 'Moka Café',
    category: 'Food & Drink',
    description: 'Café especializado en granos de origen único y repostería artesanal.',
    address: 'Calle Principal 14, Local 2',
    phone: '+1 809 555 0101',
    hours: [
      { day: 'Monday', hours: '7:00 – 20:00' },
      { day: 'Tuesday', hours: '7:00 – 20:00' },
      { day: 'Wednesday', hours: '7:00 – 20:00' },
      { day: 'Thursday', hours: '7:00 – 20:00' },
      { day: 'Friday', hours: '7:00 – 20:00' },
      { day: 'Saturday', hours: '8:00 – 18:00' },
      { day: 'Sunday', hours: 'Closed' },
    ],
    products: [
      { id: 'p1', name: 'Espresso', price: 2.50, points: 3, category: 'Coffee', available: true },
      { id: 'p2', name: 'Cappuccino', price: 3.20, points: 3, category: 'Coffee', available: true },
      { id: 'p3', name: 'Croissant', price: 2.00, points: 2, category: 'Pastry', available: true },
      { id: 'p4', name: 'Cold Brew', price: 3.80, points: 4, category: 'Coffee', available: true },
      { id: 'p5', name: 'Avocado Toast', price: 6.50, points: 7, category: 'Food', available: true },
      { id: 'p6', name: 'Latte', price: 3.50, points: 4, category: 'Coffee', available: true },
    ],
    promotions: [
      { id: 'pr1', title: '2x1 en croissants los martes', discount: '2×1', dateRange: 'Every Tuesday', status: 'Active', active: true },
      { id: 'pr2', title: 'Happy Hour –20% de 15:00–17:00', discount: '–20%', dateRange: 'Daily 3–5pm', status: 'Active', active: true },
    ],
    rewards: [
      { id: 'r1', name: 'Espresso gratis', pointsCost: 200, available: true },
      { id: 'r2', name: 'Croissant gratis', pointsCost: 350, available: true },
      { id: 'r3', name: 'Tote Bag Moka', pointsCost: 800, available: true },
      { id: 'r4', name: 'Pase mensual de café', pointsCost: 1500, available: true },
    ],
    news: [
      { id: 'n1', title: '¡Nuevo menú de verano disponible!', excerpt: 'Descubre nuestras nuevas opciones refrescantes para esta temporada.', date: '2 days ago', pinned: true },
      { id: 'n2', title: 'Ahora tenemos leche de avena', excerpt: 'Añadimos leche de avena a todas nuestras bebidas sin costo adicional.', date: '1 week ago' },
    ],
    levels: [
      { level: 'Bronze', minPoints: 0 },
      { level: 'Silver', minPoints: 500 },
      { level: 'Gold', minPoints: 1200 },
    ],
    colorAccent: '#7546ED',
  },
  {
    id: 'epico',
    name: 'Épico',
    category: 'Burgers & Fast Food',
    description: 'Hamburguesas artesanales con ingredientes frescos y combinaciones épicas.',
    address: 'Av. Independencia 88, Local 5',
    phone: '+1 809 555 0202',
    hours: [
      { day: 'Monday', hours: '11:00 – 22:00' },
      { day: 'Tuesday', hours: '11:00 – 22:00' },
      { day: 'Wednesday', hours: '11:00 – 22:00' },
      { day: 'Thursday', hours: '11:00 – 22:00' },
      { day: 'Friday', hours: '11:00 – 23:00' },
      { day: 'Saturday', hours: '11:00 – 23:00' },
      { day: 'Sunday', hours: '12:00 – 21:00' },
    ],
    products: [
      { id: 'p7', name: 'Épica Classic', price: 9.50, points: 10, category: 'Burgers', available: true },
      { id: 'p8', name: 'Doble Fuego', price: 12.00, points: 12, category: 'Burgers', available: true },
      { id: 'p9', name: 'Veggie Épica', price: 9.00, points: 9, category: 'Burgers', available: true },
      { id: 'p10', name: 'Papas Épicas', price: 3.50, points: 3, category: 'Sides', available: true },
      { id: 'p11', name: 'Aros de Cebolla', price: 3.00, points: 3, category: 'Sides', available: true },
      { id: 'p12', name: 'Épica Combo', price: 14.00, points: 15, category: 'Combos', available: true },
      { id: 'p13', name: 'Milkshake', price: 4.50, points: 5, category: 'Drinks', available: true },
    ],
    promotions: [
      { id: 'pr3', title: 'Combo del día –15% de lunes a miércoles', discount: '–15%', dateRange: 'Mon–Wed', status: 'Active', active: true },
      { id: 'pr4', title: 'Lleva 2 combos y el postre es gratis', discount: 'Free dessert', dateRange: 'Always', status: 'Active', active: true },
    ],
    rewards: [
      { id: 'r5', name: 'Papas Épicas gratis', pointsCost: 150, available: true },
      { id: 'r6', name: 'Milkshake gratis', pointsCost: 300, available: true },
      { id: 'r7', name: 'Combo Épico gratis', pointsCost: 700, available: true },
      { id: 'r8', name: 'Merch Épico', pointsCost: 1200, available: true },
    ],
    news: [
      { id: 'n3', title: '¡Nueva Épica BBQ Bacon ya disponible!', excerpt: 'La hamburguesa más pedida llega con nueva receta y sabor ahumado.', date: '3 days ago', pinned: true },
      { id: 'n4', title: 'Abrimos los domingos desde las 12:00', excerpt: 'Ahora puedes disfrutar Épico también los domingos.', date: '1 week ago' },
    ],
    levels: [
      { level: 'Bronze', minPoints: 0 },
      { level: 'Silver', minPoints: 400 },
      { level: 'Gold', minPoints: 1000 },
    ],
    colorAccent: '#032C7D',
  },
  {
    id: 'fortuna',
    name: 'Fortuna Café',
    category: 'Food & Drink',
    description: 'Un espacio acogedor para trabajar, leer o simplemente disfrutar un buen café.',
    address: 'Plaza Fortuna 3, Nivel 1',
    phone: '+1 809 555 0303',
    hours: [
      { day: 'Monday', hours: '7:30 – 21:00' },
      { day: 'Tuesday', hours: '7:30 – 21:00' },
      { day: 'Wednesday', hours: '7:30 – 21:00' },
      { day: 'Thursday', hours: '7:30 – 21:00' },
      { day: 'Friday', hours: '7:30 – 21:00' },
      { day: 'Saturday', hours: '8:00 – 20:00' },
      { day: 'Sunday', hours: '8:00 – 20:00' },
    ],
    products: [
      { id: 'p14', name: 'Americano', price: 2.20, points: 2, category: 'Coffee', available: true },
      { id: 'p15', name: 'Flat White', price: 3.40, points: 3, category: 'Coffee', available: true },
      { id: 'p16', name: 'Matcha Latte', price: 4.00, points: 4, category: 'Specialty', available: true },
      { id: 'p17', name: 'Muffin de Arándanos', price: 2.50, points: 3, category: 'Pastry', available: true },
      { id: 'p18', name: 'Tostada con Mantequilla', price: 2.00, points: 2, category: 'Food', available: true },
      { id: 'p19', name: 'Bowl de Açaí', price: 6.00, points: 6, category: 'Food', available: true },
    ],
    promotions: [
      { id: 'pr5', title: '–10% con tu laptop los lunes', discount: '–10%', dateRange: 'Every Monday', status: 'Active', active: true },
      { id: 'pr6', title: 'Desayuno completo por $7 antes de las 10:00', discount: '$7 combo', dateRange: 'Daily before 10am', status: 'Active', active: true },
    ],
    rewards: [
      { id: 'r9', name: 'Café del día gratis', pointsCost: 120, available: true },
      { id: 'r10', name: 'Muffin gratis', pointsCost: 200, available: true },
      { id: 'r11', name: 'Bowl de Açaí gratis', pointsCost: 450, available: true },
      { id: 'r12', name: 'Membresía Fortuna mensual', pointsCost: 1000, available: true },
    ],
    news: [
      { id: 'n5', title: 'Zona de coworking en el segundo nivel', excerpt: 'Espacios con enchufes, buena luz y wifi ultrarrápido para trabajar.', date: '5 days ago', pinned: true },
      { id: 'n6', title: 'Nueva carta de temporada', excerpt: 'Matcha, bowls y más opciones saludables llegan a nuestra carta.', date: '2 weeks ago' },
    ],
    levels: [
      { level: 'Bronze', minPoints: 0 },
      { level: 'Silver', minPoints: 300 },
      { level: 'Gold', minPoints: 800 },
    ],
    colorAccent: '#10B981',
  },
  {
    id: 'inboga',
    name: 'Inboga Barbería',
    category: 'Beauty & Care',
    description: 'Barbería premium con ambiente urbano, cortes modernos y atención personalizada.',
    address: 'Calle El Conde 57',
    phone: '+1 809 555 0404',
    hours: [
      { day: 'Monday', hours: 'Closed' },
      { day: 'Tuesday', hours: '9:00 – 20:00' },
      { day: 'Wednesday', hours: '9:00 – 20:00' },
      { day: 'Thursday', hours: '9:00 – 20:00' },
      { day: 'Friday', hours: '9:00 – 20:00' },
      { day: 'Saturday', hours: '9:00 – 20:00' },
      { day: 'Sunday', hours: 'Closed' },
    ],
    products: [
      { id: 'p20', name: 'Corte Clásico', price: 18, points: 18, category: 'Haircuts', available: true },
      { id: 'p21', name: 'Corte + Barba', price: 28, points: 28, category: 'Combos', available: true },
      { id: 'p22', name: 'Afeitado con Toalla Caliente', price: 22, points: 22, category: 'Shaving', available: true },
      { id: 'p23', name: 'Diseño de Barba', price: 14, points: 14, category: 'Beard', available: true },
      { id: 'p24', name: 'Corte Infantil', price: 12, points: 12, category: 'Haircuts', available: true },
      { id: 'p25', name: 'Tratamiento Capilar', price: 20, points: 20, category: 'Treatment', available: true },
    ],
    promotions: [
      { id: 'pr7', title: 'Primera visita –30%', discount: '–30%', dateRange: 'First visit', status: 'Active', active: true },
      { id: 'pr8', title: 'Trae un amigo y ambos obtienen 100 pts extra', discount: '+100 pts', dateRange: 'Always', status: 'Active', active: true },
    ],
    rewards: [
      { id: 'r13', name: 'Diseño de Barba gratis', pointsCost: 250, available: true },
      { id: 'r14', name: '50% off en próximo corte', pointsCost: 400, available: true },
      { id: 'r15', name: 'Kit de Grooming Premium', pointsCost: 750, available: true },
      { id: 'r16', name: 'Membresía VIP mensual', pointsCost: 1400, available: true },
    ],
    news: [
      { id: 'n7', title: 'Nuevo barbero senior se une al equipo', excerpt: 'Con más de 10 años de experiencia, Carlos trae técnicas únicas al equipo.', date: '1 week ago', pinned: true },
      { id: 'n8', title: '¡Ya puedes reservar tu turno en línea!', excerpt: 'Ahorra tiempo y reserva tu cita desde la app con un solo clic.', date: '2 weeks ago' },
    ],
    levels: [
      { level: 'Bronze', minPoints: 0 },
      { level: 'Silver', minPoints: 350 },
      { level: 'Gold', minPoints: 900 },
    ],
    colorAccent: '#DC89FF',
  },
];

// ─── Business dashboard data (Moka Café — business view only) ────────────────

export const mokaKPIs = {
  totalCustomers: 187,
  activeThisMonth: 41,
  pointsIssuedToday: 280,
  redemptions: 9,
};

export const mokaPointsHistory = [
  { day: 'Apr 2', points: 180 },
  { day: 'Apr 5', points: 220 },
  { day: 'Apr 8', points: 195 },
  { day: 'Apr 11', points: 260 },
  { day: 'Apr 14', points: 240 },
  { day: 'Apr 17', points: 310 },
  { day: 'Apr 20', points: 275 },
  { day: 'Apr 23', points: 290 },
  { day: 'Apr 26', points: 320 },
  { day: 'Apr 29', points: 280 },
  { day: 'May 1', points: 280 },
];

export const mokaLevelDistribution = [
  { name: 'Bronze', value: 98, color: '#12173B' },
  { name: 'Silver', value: 63, color: '#032C7D' },
  { name: 'Gold', value: 26, color: '#7546ED' },
];

export const mokaRecentTransactions = [
  { customer: 'Carlos Pérez', amount: 12.50, points: 13, date: 'Today 10:24am' },
  { customer: 'María López', amount: 8.00, points: 8, date: 'Today 9:51am' },
  { customer: 'Juan Rodríguez', amount: 24.00, points: 24, date: 'Yesterday 4:12pm' },
  { customer: 'Andrea Gómez', amount: 6.50, points: 7, date: 'Yesterday 2:30pm' },
  { customer: 'Luis Herrera', amount: 18.00, points: 18, date: 'Yesterday 11:05am' },
];

export const mokaCustomers: BusinessCustomer[] = [
  {
    id: 'bc1', name: 'Carlos Pérez', username: '@carlosp', initials: 'CP', level: 'Gold', points: 1380, visits: 21, lastVisit: 'Today',
    transactions: [
      { id: 'bc1t1', description: 'Espresso x2', points: 5, date: 'Today 10:24am' },
      { id: 'bc1t2', description: 'Latte', points: 4, date: '2 days ago' },
      { id: 'bc1t3', description: 'Croissant', points: 2, date: '3 days ago' },
      { id: 'bc1t4', description: 'Avocado Toast', points: 7, date: '1 week ago' },
      { id: 'bc1t5', description: 'Cold Brew', points: 4, date: '2 weeks ago' },
    ],
  },
  {
    id: 'bc2', name: 'María López', username: '@marial', initials: 'ML', level: 'Silver', points: 620, visits: 13, lastVisit: 'Today',
    transactions: [
      { id: 'bc2t1', description: 'Cappuccino', points: 3, date: 'Today 9:51am' },
      { id: 'bc2t2', description: 'Latte', points: 4, date: '4 days ago' },
      { id: 'bc2t3', description: 'Croissant', points: 2, date: '1 week ago' },
      { id: 'bc2t4', description: 'Happy Hour Latte', points: 3, date: '2 weeks ago' },
      { id: 'bc2t5', description: 'Cold Brew', points: 4, date: '3 weeks ago' },
    ],
  },
  {
    id: 'bc3', name: 'Juan Rodríguez', username: '@juanr', initials: 'JR', level: 'Silver', points: 540, visits: 10, lastVisit: 'Yesterday',
    transactions: [
      { id: 'bc3t1', description: 'Avocado Toast', points: 7, date: 'Yesterday 4:12pm' },
      { id: 'bc3t2', description: 'Cold Brew x2', points: 8, date: '1 week ago' },
      { id: 'bc3t3', description: 'Espresso', points: 3, date: '2 weeks ago' },
      { id: 'bc3t4', description: 'Croissant x2', points: 4, date: '3 weeks ago' },
    ],
  },
  {
    id: 'bc4', name: 'Andrea Gómez', username: '@andreg', initials: 'AG', level: 'Bronze', points: 210, visits: 4, lastVisit: '3 days ago',
    transactions: [
      { id: 'bc4t1', description: 'Latte', points: 4, date: 'Yesterday 2:30pm' },
      { id: 'bc4t2', description: 'Muffin', points: 2, date: '1 week ago' },
      { id: 'bc4t3', description: 'Espresso', points: 3, date: '2 weeks ago' },
    ],
  },
  {
    id: 'bc5', name: 'Luis Herrera', username: '@luish', initials: 'LH', level: 'Gold', points: 1560, visits: 24, lastVisit: '5 days ago',
    transactions: [
      { id: 'bc5t1', description: 'Pase mensual canjeado', points: -1500, date: '1 week ago' },
      { id: 'bc5t2', description: 'Latte x3', points: 11, date: '2 weeks ago' },
      { id: 'bc5t3', description: 'Cold Brew', points: 4, date: '3 weeks ago' },
      { id: 'bc5t4', description: 'Croissant', points: 2, date: '3 weeks ago' },
      { id: 'bc5t5', description: 'Espresso x2', points: 5, date: '1 month ago' },
    ],
  },
  {
    id: 'bc6', name: 'Valeria Castro', username: '@valeriac', initials: 'VC', level: 'Bronze', points: 80, visits: 2, lastVisit: '1 week ago',
    transactions: [
      { id: 'bc6t1', description: 'Cappuccino', points: 3, date: '1 week ago' },
      { id: 'bc6t2', description: 'Croissant', points: 2, date: '2 weeks ago' },
    ],
  },
];

export const pendingRedemptions = [
  { id: 'red1', customer: 'María López', reward: 'Espresso gratis', date: 'Today 9:51am', status: 'pending' as const },
  { id: 'red2', customer: 'Juan Rodríguez', reward: 'Croissant gratis', date: 'Yesterday 4:12pm', status: 'pending' as const },
];
