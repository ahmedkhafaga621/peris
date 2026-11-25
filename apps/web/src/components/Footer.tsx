import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
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

export function Footer({ contactEmail }: { contactEmail: string }) {
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
            <span>{address}</span>
            <span>{hours}</span>
            <a href={phoneHref(phone)}>{phone}</a>
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            <a href={instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href={facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
            <a href={maps} target="_blank" rel="noreferrer">
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
        <span>
          Visa · Mastercard · Apple Pay · Google Pay · Cash on delivery
        </span>
        <span>
          Sample photography via Unsplash. Sample prices, until the PERIS
          archive is published.
        </span>
      </div>
    </footer>
  );
}
