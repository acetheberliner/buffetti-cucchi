import { digitalServices, productCategories, shopFocusAreas } from './catalog';

export const navItems = [
  { label: 'Home', href: '/index.html' },
  {
    label: 'Catalogo prodotti',
    href: '/prodotti/cancelleria.html',
    featured: productCategories,
  },
  {
    label: 'Servizi in negozio',
    href: '/servizi.html',
    featured: digitalServices,
  },
  {
    label: 'Scuola e ufficio',
    href: '/articoli-per-l-ufficio.html',
    featured: shopFocusAreas,
  },
  { label: 'Arredo ufficio', href: '/arredamento.html' },
  { label: 'Idee regalo', href: '/pelletteria-e-regalistica.html' },
  { label: 'Contatti', href: '/contatti.html' },
];
