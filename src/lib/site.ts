// Site-wide navigation and service copy.

export type NavLink = { label: string; href: string };

export const announcement = "Complimentary shipping and returns";

export const primaryNav: NavLink[] = [
  { label: "New In", href: "/new-in" },
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Bags", href: "/bags" },
  { label: "Shoes", href: "/shoes" },
  { label: "Jewelry", href: "/jewelry" },
  { label: "Gifts", href: "/gifts" },
];

export const secondaryNav: NavLink[] = [
  { label: "My account", href: "/account" },
  { label: "Saved items", href: "/saved" },
  { label: "Client services", href: "/client-services" },
  { label: "Store locator", href: "/stores" },
];

export const services = [
  { title: "Complimentary shipping", body: "Express delivery on every order, packed in our signature box." },
  { title: "Easy returns", body: "Return or exchange within 30 days, collected from your door." },
  { title: "Gift wrapping", body: "Every piece can be wrapped by hand with a personal note." },
  { title: "Book an appointment", body: "Shop privately with an advisor in store or by video call." },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Client services",
    links: [
      { label: "Contact us", href: "/client-services" },
      { label: "Shipping", href: "/client-services/shipping" },
      { label: "Returns", href: "/client-services/returns" },
      { label: "FAQ", href: "/client-services/faq" },
    ],
  },
  {
    title: "The house",
    links: [
      { label: "About us", href: "/about" },
      { label: "Craftsmanship", href: "/craftsmanship" },
      { label: "Sustainability", href: "/sustainability" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Shop",
    links: [
      { label: "Women", href: "/women" },
      { label: "Men", href: "/men" },
      { label: "Bags", href: "/bags" },
      { label: "Gifts", href: "/gifts" },
    ],
  },
];

export const legalNav: NavLink[] = [
  { label: "Privacy policy", href: "/legal/privacy" },
  { label: "Terms of sale", href: "/legal/terms" },
  { label: "Cookie settings", href: "/legal/cookies" },
];
