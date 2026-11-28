import { Link } from "react-router-dom";
import { IconWhatsApp } from "@/components/Icons";
import { whatsappHref } from "@/data/site";
import { useOrderNow } from "@/hooks/useOrderNow";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useWhatsAppPrefill } from "@/hooks/useWhatsAppPrefill";

export function WhatsAppButton() {
  const whatsapp = useWhatsApp();
  const askPrefill = useWhatsAppPrefill();
  const orderNow = useOrderNow();

  return (
    <div className="whatsapp-stack">
      <a
        className="whatsapp-ask"
        href={whatsappHref(askPrefill, whatsapp)}
        target="_blank"
        rel="noreferrer"
        aria-label="Ask on WhatsApp"
      >
        <IconWhatsApp />
      </a>
      <Link className="whatsapp" to="/shop">
        {orderNow}
      </Link>
    </div>
  );
}
