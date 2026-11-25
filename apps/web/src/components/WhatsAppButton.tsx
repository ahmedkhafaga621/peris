import { useLocation } from "react-router-dom";
import { productWhatsAppMessage, whatsappHref } from "@/data/site";
import { useBespokePrefill } from "@/hooks/useBespokePrefill";
import { useOrderHelpPrefill } from "@/hooks/useOrderHelpPrefill";
import { useOrderNow } from "@/hooks/useOrderNow";
import { useOrderPrefill } from "@/hooks/useOrderPrefill";
import { useProductPrefill } from "@/hooks/useProductPrefill";
import { useProducts } from "@/hooks/useProducts";
import { useWhatsApp } from "@/hooks/useWhatsApp";

export function WhatsAppButton() {
  const whatsapp = useWhatsApp();
  const orderNow = useOrderNow();
  const orderPrefill = useOrderPrefill();
  const bespokePrefill = useBespokePrefill();
  const orderHelpPrefill = useOrderHelpPrefill();
  const productPrefill = useProductPrefill();
  const catalog = useProducts();
  const location = useLocation();
  const productSlug = location.pathname.startsWith("/product/")
    ? location.pathname.replace("/product/", "")
    : "";
  const product = productSlug
    ? catalog.find((item) => item.slug === productSlug)
    : undefined;
  const message = product
    ? productWhatsAppMessage(
        productPrefill,
        product.name,
        `${window.location.origin}/product/${product.slug}`,
      )
    : location.pathname.startsWith("/bespoke")
      ? bespokePrefill
      : location.pathname.startsWith("/account/orders") ||
          location.pathname.startsWith("/track-order")
        ? orderHelpPrefill
        : orderPrefill;

  return (
    <a
      className="whatsapp"
      href={whatsappHref(message, whatsapp)}
      target="_blank"
      rel="noreferrer"
    >
      {orderNow}
    </a>
  );
}
