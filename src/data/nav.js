import { digitalServices, productCategories } from './catalog';

export const navItems = [
  { label: 'Home', href: '/index.html' },
  {
    label: 'Catalogo prodotti',
    href: '/index.html#catalogo-prodotti',
    featured: productCategories,
  },
  {
    label: 'Servizi in negozio',
    href: '/servizi.html',
    featured: digitalServices,
  },
  { label: 'Idee regalo', href: '/pelletteria-e-regalistica.html' },
  { label: 'Contatti', href: '/contatti.html' },
];
