import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { IconClock, IconEmail, IconFacebook, IconGoogleMaps, IconInstagram, IconPhone } from "@/components/Icons";
import { phoneHref } from "@/data/site";
import { useAddress } from "@/hooks/useAddress";
import { useFacebook } from "@/hooks/useFacebook";
import { useFooter } from "@/hooks/useFooter";
import { useFooterNewsletter } from "@/hooks/useFooterNewsletter";
import { useFooterEmail } from "@/hooks/useFooterEmail";
import { useFooterSubscribe } from "@/hooks/useFooterSubscribe";
import { useFooterListMessage } from "@/hooks/useFooterListMessage";
import { useFooterError } from "@/hooks/useFooterError";
import { useFooterQuickLinks } from "@/hooks/useFooterQuickLinks";
import { useFooterSupport } from "@/hooks/useFooterSupport";
import { useFooterBoutique } from "@/hooks/useFooterBoutique";
import { useHours } from "@/hooks/useHours";
import { useInstagram } from "@/hooks/useInstagram";
import { useMaps } from "@/hooks/useMaps";
import { usePhone } from "@/hooks/usePhone";
import { subscribeToNotes } from "@/lib/newsletter";

export function Footer() {
  const hours = useHours();
  const address = useAddress();
  const phone = usePhone();
  const instagram = useInstagram();
  const facebook = useFacebook();
  const maps = useMaps();
  const footer = useFooter();
  const footerNewsletter = useFooterNewsletter();
  const footerEmail = useFooterEmail();
  const footerSubscribe = useFooterSubscribe();
  const footerListMessage = useFooterListMessage();
  const footerError = useFooterError();
  const footerQuickLinks = useFooterQuickLinks();
  const footerSupport = useFooterSupport();
  const footerBoutique = useFooterBoutique();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function subscribe(event: FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(footerError);
      setDone(false);
      return;
    }
    void subscribeToNotes(email.trim())
      .then(() => {
        setError("");
        setDone(true);
        setEmail("");
      })
      .catch((reason: unknown) => {
        setDone(false);
        setError(
          reason instanceof Error
            ? reason.message
            : "The address was not saved.",
        );
      });
  }

  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <img
            src="/brand/peris-ivory.png"
            alt="PÉRIS"
            style={{ height: 32 }}
          />
          <p
            className="footer-muted"
            style={{ marginTop: 16, maxWidth: "28rem" }}
          >
            {footer}
          </p>
        </div>
        <div>
          <p className="eyebrow">{footerQuickLinks}</p>
          <div className="footer-links">
            <Link to="/shop">Shop</Link>
            <Link to="/new-arrivals">New arrivals</Link>
            <Link to="/collections">Collections</Link>
            <Link to="/bespoke">Bespoke tailoring</Link>
            <Link to="/about">About PERIS</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
        <div>
          <p className="eyebrow">{footerSupport}</p>
          <div className="footer-links">
            <Link to="/faq">FAQ</Link>
            <Link to="/size-guide">Size guide</Link>
            <Link to="/policies/shipping">Shipping policy</Link>
            <Link to="/policies/returns">Returns and exchange</Link>
            <Link to="/policies/privacy">Privacy policy</Link>
            <Link to="/policies/terms">Terms and conditions</Link>
            <Link to="/policies/payment">Payment information</Link>
            <Link to="/track-order">Track an order</Link>
          </div>
        </div>
        <div>
          <p className="eyebrow">{footerBoutique}</p>
          <div className="footer-links">
            <a className="social-icon-link" href={maps} target="_blank" rel="noreferrer">
              <IconGoogleMaps size={16} />
              {address}
            </a>
            <span className="social-icon-link">
              <IconClock size={16} />
              {hours}
            </span>
            <a className="social-icon-link" href={phoneHref(phone)}>
              <IconPhone size={16} />
              {phone}
            </a>
            <a className="social-icon-link" href="mailto:info@ljperis.com">
              <IconEmail size={16} />
              info@ljperis.com
            </a>
            <a className="social-icon-link" href={instagram} target="_blank" rel="noreferrer">
              <IconInstagram size={16} />
              Instagram
            </a>
            <a className="social-icon-link" href={facebook} target="_blank" rel="noreferrer">
              <IconFacebook size={16} />
              Facebook
            </a>
            <a className="social-icon-link" href={maps} target="_blank" rel="noreferrer">
              <IconGoogleMaps size={16} />
              Google Maps
            </a>
          </div>
          <form
            onSubmit={subscribe}
            className="stack-form"
            style={{ marginTop: 22 }}
          >
            <label className="field">
              <span style={{ color: "rgba(248,247,238,0.72)" }}>
                {footerNewsletter}
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={footerEmail}
                style={{ borderBottomColor: "rgba(248,247,238,0.7)" }}
              />
            </label>
            {error ? <p className="field-error">{error}</p> : null}
            {done ? (
              <p>{footerListMessage}</p>
            ) : null}
            <button
              type="submit"
              className="btn btn-ivory"
              style={{ justifySelf: "start" }}
            >
              {footerSubscribe}
            </button>
          </form>
        </div>
      </div>
      <div className="wrap footer-base">
        <div className="pay-marks">
          <span className="pay-mark">
            <img className="pay-visa" src="/brand/visa.svg" alt="" width={48} height={16} />
          </span>
          <span className="pay-mark">
            <svg width="32" height="20" viewBox="0 0 32 20" aria-hidden="true">
              <circle cx="11" cy="10" r="8" fill="#eb001b" />
              <circle cx="21" cy="10" r="8" fill="#f79e1b" />
              <path d="M16 4.2a8 8 0 0 1 0 11.6 8 8 0 0 1 0-11.6z" fill="#ff5f00" />
            </svg>
       
          </span>
          <span className="pay-mark">
            <svg width="14" height="17" viewBox="0 0 16 20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M13.1 10.6c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.7-1.4.1-2.7.8-3.4 2.1-1.5 2.6-.4 6.4 1 8.5.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7s1.6.7 2.8.7 1.8-1 2.5-2c.8-1.2 1.1-2.3 1.1-2.4 0 0-2.1-.8-2.1-3.4zM11 4.3c.6-.7.9-1.7.8-2.7-.8.1-1.8.6-2.4 1.3-.5.6-1 1.6-.9 2.5.9.1 1.8-.4 2.5-1.1z"
              />
            </svg>
             Pay
          </span>
          <span className="pay-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.4c-.3 1.5-1.1 2.7-2.4 3.5v2.9h3.9c2.3-2.1 3.6-5.2 3.6-8.5z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-2.9c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3c2 4 6.1 6.6 10.7 6.6z" />
              <path fill="#FBBC05" d="M5.3 14.4A7.2 7.2 0 0 1 4.9 12c0-.8.1-1.6.4-2.4V6.6H1.3A12 12 0 0 0 0 12c0 1.9.5 3.8 1.3 5.4l4-3z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0 7.4 0 3.3 2.6 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
            </svg>
             Pay
          </span>
          <span className="pay-mark">
            <svg width="22" height="15" viewBox="0 0 24 16" aria-hidden="true">
              <rect x="1" y="1" width="22" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Cash on delivery
          </span>
        </div>
        <span>© PERIS. A house of Lamasat Jawhareya, Dubai.</span>
      </div>
    </footer>
  );
}
