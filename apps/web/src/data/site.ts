export const site = {
  name: "PERIS",
  whatsapp: "971505406077",
  phoneDisplay: "+971 50 540 6077",
  phoneHref: "tel:+971505406077",
  instagram: "https://www.instagram.com/peris_uae/",
  instagramHandle: "@peris_uae",
  facebook: "https://www.facebook.com/perisdubai",
  maps: "https://maps.app.goo.gl/YdjuY6Nqnad2rpD36",
  address: "Boutique M01, 3 Floor, Abu Hail Center, Dubai, United Arab Emirates.",
  hours: "Daily from 10:00 AM to 10:00 PM.",
  announcement: "The boutique is open daily, 10:00 AM – 10:00 PM",
  parent: "Lamasat Jawhareya",
  hero: "Elegance, Meticulously Tailored.",
  heading: "Wearable art, cut in Dubai",
  fitting: "What the fitting room is built on",
  tailoring: "Bespoke Tailoring",
  precision:
    "Abayas custom-tailored to your exact measurements and unique taste with unparalleled precision.",
  premium: "Premium Fabrics",
  handpick:
    "We handpick the finest fabrics and threads from top-tier suppliers to ensure lasting comfort and an unforgettable look.",
  craftsmanship: "Master Craftsmanship",
  detail:
    "Exceptional attention to detail, from the very first pattern cut to the final placement of our signature tag.",
  sample: "Sample notes",
  hem: "The hem sat exactly where I asked, and the cloth stayed quiet through a long evening.",
  sketch: "I sent a sketch on a Tuesday. The fitting in Abu Hail felt like the drawing had learned how to move.",
  day: "A day abaya I can wear to the office and still want to wear to dinner.",
  notes: "Notes from the house",
  list: "New cloth, private appointments, and the occasional evening piece. The list is kept at the desk until email delivery is connected.",
  footer:
    "Luxury abayas and bespoke tailoring from Dubai, a house of Lamasat Jawhareya.",
  ways: "Three ways to wear the house",
  pieces: "Pieces the boutique keeps close",
  follow: "Follow @peris_uae",
  city: "Dubai",
  collect: "Collections",
  commission: "Commission",
  contactEyebrow: "The boutique",
  shopEyebrow: "The edit",
  appointmentEyebrow: "Appointment",
  bespokeEyebrow: "Atelier",
  policyEyebrow: "The house",
  faqEyebrow: "Questions",
  sizeGuideEyebrow: "Fit",
  trackEyebrow: "Orders",
  notFoundEyebrow: "404",
  maintenanceEyebrow: "PERIS",
  skuLabel: "SKU",
  checkoutEyebrow: "Checkout",
  confirmationEyebrow: "Order",
  bagEyebrow: "Bag",
  summaryEyebrow: "Summary",
  accountEyebrow: "Account",
  wishlistEyebrow: "Wishlist",
  searchEyebrow: "Search",
  searchIcon: "Search",
  searchHouse: "Search the house",
  searchPieces: "Search pieces",
  searchSubmit: "Search",
  orderNow: "Order Now",
  sendWhatsApp: "Send on WhatsApp",
  askPiece: "Ask about this piece on WhatsApp",
  tellBoutique: "Tell the boutique on WhatsApp",
  waBoutique: "WhatsApp the boutique",
  orderPrefill: "Hello PERIS, I would like to place an order.",
  bespokePrefill:
    "Hello PERIS, I would like to enquire about bespoke tailoring.",
  orderHelpPrefill: "Hello PERIS, I need help with an order.",
  productPrefill: "Hello PERIS, I would like to ask about",
  checkoutPrefill: "Hello PERIS, my order is",
  bespokeSendPrefill: "Bespoke request",
  whatsAppPrefill: "Hello PERIS, I would like to talk about an abaya.",
  appointmentPrefill: "Hello PERIS, I would like to book an appointment.",
  sizeGuideBanner:
    "Pending the master tailor's measurements. The ranges below are not a PERIS size chart yet.",
  heroAlt:
    "Placeholder study of a black column abaya in front of a burgundy curtain",
  storyAlt:
    "Placeholder study of embroidery at the neckline of a black abaya",
  aboutAlt: "Placeholder study of a black column abaya",
  policyBanner:
    "Pending approval from the business owner. This is not a final policy.",
  sellers: "Best sellers",
  debut: "New arrival",
  abode: "The house",
  why: "Why PERIS",
  social: "Instagram",
  testimonials: "Testimonials",
  correspondence: "Correspondence",
  reviewNote: "Sample, until verified reviews are published",
  instagramLink: "Open Instagram",
  fittingRoom: "From the fitting room",
  exploreCta: "Explore Our Collections",
  chatCta: "Chat with Us on WhatsApp",
  beginCta: "Begin a commission",
  viewEdit: "View the edit",
  viewPiece: "View the piece",
  readStory: "Read the story",
  emailLabel: "Email address",
  subscribeButton: "Subscribe",
  listMessage: "You are on the list. Email delivery is not connected.",
  emailError: "Enter a valid email address.",
  footerNewsletter: "Newsletter",
  footerEmail: "Email address",
  footerSubscribe: "Subscribe",
  footerListMessage: "You are on the list. Email delivery is not connected.",
  footerError: "Enter a valid email address.",
  footerQuickLinks: "Quick links",
  footerSupport: "Customer support",
  footerBoutique: "The boutique",
  reasonIndex1: "01",
  reasonIndex2: "02",
  reasonIndex3: "03",
} as const;

export function phoneDigits(line: string) {
  const digits = line.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : site.whatsapp;
}

export function phoneHref(line: string) {
  return `tel:+${phoneDigits(line)}`;
}

export function usableInstagram(line: string) {
  try {
    const url = new URL(line);
    if (url.protocol !== "https:") return false;
    if (url.hostname !== "www.instagram.com" && url.hostname !== "instagram.com") return false;
    const handle = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[A-Za-z0-9._]{2,30}$/.test(handle);
  } catch {
    return false;
  }
}

export function usableFacebook(line: string) {
  try {
    const url = new URL(line);
    if (url.protocol !== "https:") return false;
    if (url.hostname !== "www.facebook.com" && url.hostname !== "facebook.com") return false;
    const page = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[A-Za-z0-9.]{2,50}$/.test(page);
  } catch {
    return false;
  }
}

export function instagramHandle(line: string) {
  if (!usableInstagram(line)) return site.instagramHandle;
  const handle = new URL(line).pathname.split("/").filter(Boolean)[0] ?? "";
  return `@${handle}`;
}

export function usableParent(line: string) {
  return /^[A-Za-z][A-Za-z .'-]{1,39}$/.test(line);
}

export function usableStory(line: string) {
  return line.length >= 40 && line.length <= 800 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableWelcome(line: string) {
  return line.length >= 40 && line.length <= 400 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableHero(line: string) {
  return line.length >= 12 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*\.$/.test(line);
}

export function usableIntro(line: string) {
  return line.length >= 40 && line.length <= 400 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableHeading(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line);
}

export function usableFitting(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line);
}

export function usableTailoring(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line);
}

export function usablePrecision(line: string) {
  return line.length >= 40 && line.length <= 400 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usablePremium(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line);
}

export function usableHandpick(line: string) {
  return line.length >= 40 && line.length <= 400 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableCraftsmanship(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line);
}

export function usableDetail(line: string) {
  return line.length >= 40 && line.length <= 400 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSample(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line);
}

export function usableHem(line: string) {
  return line.length >= 40 && line.length <= 400 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSketch(line: string) {
  return line.length >= 40 && line.length <= 400 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableDay(line: string) {
  return line.length >= 40 && line.length <= 400 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableNotes(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line);
}

export function usableList(line: string) {
  return line.length >= 40 && line.length <= 400 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableFooter(line: string) {
  return line.length >= 40 && line.length <= 400 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableWays(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line);
}

export function usablePieces(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line);
}

export function usableFollow(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z0-9, .@'_-]*[A-Za-z0-9]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableCity(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableCollect(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableShopEyebrow(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableCheckoutEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableConfirmationEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableBagEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSummaryEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableAccountEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableWishlistEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSearchEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSearchIcon(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSearchHouse(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSearchPieces(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSearchSubmit(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableOrderNow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSendWhatsApp(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableAskPiece(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableTellBoutique(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableWaBoutique(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableOrderPrefill(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableBespokePrefill(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableOrderHelpPrefill(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableProductPrefill(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function productWhatsAppMessage(
  prefill: string,
  name: string,
  url: string,
) {
  return `${prefill} ${name}. ${url}`;
}

export function usableCheckoutPrefill(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function checkoutWhatsAppMessage(prefill: string, orderNumber: string) {
  return `${prefill} ${orderNumber}.`;
}

export function usableBespokeSendPrefill(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function bespokeSendWhatsAppMessage(
  prefill: string,
  number: string,
  design: string,
  fabric: string,
  color: string,
  length: string,
  notes: string,
) {
  return `${prefill} ${number}: ${design}, ${fabric}, ${color}. Length ${length} in. ${notes}`;
}

export function usableWhatsAppPrefill(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableAppointmentPrefill(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSizeGuideBanner(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableHeroAlt(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableStoryAlt(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableAboutAlt(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function usablePolicyBanner(line: string) {
  return line.length >= 10 && line.length <= 200 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z.]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSkuLabel(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableMaintenanceEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableNotFoundEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z0-9][A-Za-z0-9, .'-]*[A-Za-z0-9]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableTrackEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSizeGuideEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableFaqEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usablePolicyEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableBespokeEyebrow(line: string) {
  return line.length >= 2 && line.length <= 40 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableAppointmentEyebrow(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableContactEyebrow(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableCommission(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSellers(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableDebut(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableAbode(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableWhy(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSocial(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableTestimonials(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableCorrespondence(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableReviewNote(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableInstagramLink(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableFittingRoom(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableExploreCta(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableChatCta(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableBeginCta(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableViewEdit(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableViewPiece(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableReadStory(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableEmailLabel(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableSubscribeButton(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableListMessage(line: string) {
  return line.length >= 20 && line.length <= 120 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableEmailError(line: string) {
  return line.length >= 20 && line.length <= 120 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableFooterNewsletter(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableFooterEmail(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableFooterSubscribe(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableFooterListMessage(line: string) {
  return line.length >= 20 && line.length <= 120 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableFooterError(line: string) {
  return line.length >= 20 && line.length <= 120 && /^[A-Za-z]/.test(line) && /[.!?]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableFooterQuickLinks(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableFooterSupport(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableFooterBoutique(line: string) {
  return line.length >= 8 && line.length <= 80 && /^[A-Za-z][A-Za-z, .'-]*[A-Za-z]$/.test(line) && !/[\r\n]/.test(line);
}

export function usableReasonIndex(line: string) {
  return line.length >= 1 && line.length <= 6 && /^[A-Za-z0-9][A-Za-z0-9 .-]*$/.test(line) && !/[\r\n]/.test(line);
}

export function usableMaps(line: string) {
  try {
    const url = new URL(line);
    if (url.protocol !== "https:") return false;
    const token = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (url.hostname === "share.google" || url.hostname === "maps.app.goo.gl") return /^[A-Za-z0-9_-]{4,80}$/.test(token);
    if (url.hostname === "maps.google.com") return url.pathname.length > 1 || url.search.length > 1;
    if (url.hostname === "www.google.com" || url.hostname === "google.com") return url.pathname.startsWith("/maps");
    return false;
  } catch {
    return false;
  }
}

export function whatsappHref(message: string, line: string = site.phoneDisplay) {
  return `https://wa.me/${phoneDigits(line)}?text=${encodeURIComponent(message)}`;
}

export const aboutCopy =
  "Born in the heart of Dubai under the umbrella of 'Lamasat Jawhareya', PERIS is the ultimate destination for the modern woman seeking refinement and exclusivity. We don’t just tailor Abayas; we craft wearable art that reflects your personality. Guided by our Master Tailors and a steadfast commitment to precision in every cut and stitch, we guarantee a flawless finish that rivals the world’s leading luxury brands. At PERIS, we believe that true essence lies in the details.";

export const contactWelcome =
  "We are always delighted to welcome you at our boutique or answer your inquiries online. Book your appointment today for a fitting or a design consultation.";

export const homeIntro =
  "Welcome to PERIS, where the rich heritage of the Khaleeji Abaya meets contemporary sophistication. Discover exclusive designs and premium fabrics, carefully selected to reflect your unique beauty and individuality.";
