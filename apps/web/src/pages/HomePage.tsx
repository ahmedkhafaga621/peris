import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { useFabrics } from "@/hooks/useFabrics";
import { useProducts } from "@/hooks/useProducts";
import { useReviews } from "@/hooks/useReviews";
import { whatsappHref } from "@/data/site";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useHeroAlt } from "@/hooks/useHeroAlt";
import { useStoryAlt } from "@/hooks/useStoryAlt";
import { useWhatsAppPrefill } from "@/hooks/useWhatsAppPrefill";
import { IconFacebook, IconInstagram } from "@/components/Icons";
import { useFacebook } from "@/hooks/useFacebook";
import { useInstagram } from "@/hooks/useInstagram";
import { useFitting } from "@/hooks/useFitting";
import { usePrecision } from "@/hooks/usePrecision";
import { useCraftsmanship } from "@/hooks/useCraftsmanship";
import { useDetail } from "@/hooks/useDetail";
import { useHandpick } from "@/hooks/useHandpick";
import { usePremium } from "@/hooks/usePremium";
import { useTailoring } from "@/hooks/useTailoring";
import { useHem } from "@/hooks/useHem";
import { useSketch } from "@/hooks/useSketch";
import { useDay } from "@/hooks/useDay";
import { useNotes } from "@/hooks/useNotes";
import { useList } from "@/hooks/useList";
import { useWays } from "@/hooks/useWays";
import { usePieces } from "@/hooks/usePieces";
import { useFollow } from "@/hooks/useFollow";
import { useCity } from "@/hooks/useCity";
import { useCollect } from "@/hooks/useCollect";
import { useCommission } from "@/hooks/useCommission";
import { useSellers } from "@/hooks/useSellers";
import { useDebut } from "@/hooks/useDebut";
import { useAbode } from "@/hooks/useAbode";
import { useWhy } from "@/hooks/useWhy";
import { useReasonIndex } from "@/hooks/useReasonIndex";
import { useSocial } from "@/hooks/useSocial";
import { useTestimonials } from "@/hooks/useTestimonials";
import { useCorrespondence } from "@/hooks/useCorrespondence";
import { useReviewNote } from "@/hooks/useReviewNote";
import { useInstagramLink } from "@/hooks/useInstagramLink";
import { useFittingRoom } from "@/hooks/useFittingRoom";
import { useExploreCta } from "@/hooks/useExploreCta";
import { useChatCta } from "@/hooks/useChatCta";
import { useBeginCta } from "@/hooks/useBeginCta";
import { useViewEdit } from "@/hooks/useViewEdit";
import { useViewPiece } from "@/hooks/useViewPiece";
import { useReadStory } from "@/hooks/useReadStory";
import { useEmailLabel } from "@/hooks/useEmailLabel";
import { useSubscribeButton } from "@/hooks/useSubscribeButton";
import { useListMessage } from "@/hooks/useListMessage";
import { useEmailError } from "@/hooks/useEmailError";
import { useHeading } from "@/hooks/useHeading";
import { useHero } from "@/hooks/useHero";
import { useIntro } from "@/hooks/useIntro";
import { useSample } from "@/hooks/useSample";
import { useStory } from "@/hooks/useStory";
import { subscribeToNotes } from "@/lib/newsletter";
import { useSeo } from "@/lib/seo";
import { ProductCard } from "@/components/ProductCard";
import type { StoreOutletContext } from "@/layouts/StoreLayout";

const reasons = [
  {
    index: "01",
    title: "Bespoke Tailoring",
    copy: "Abayas custom-tailored to your exact measurements and unique taste with unparalleled precision.",
  },
  {
    index: "02",
    title: "Premium Fabrics",
    copy: "We handpick the finest fabrics and threads from top-tier suppliers to ensure lasting comfort and an unforgettable look.",
  },
  {
    index: "03",
    title: "Master Craftsmanship",
    copy: "Exceptional attention to detail, from the very first pattern cut to the final placement of our signature tag.",
  },
];

export function HomePage() {
  const { openQuickView, homeHero, homeStory } =
    useOutletContext<StoreOutletContext>();
  const catalog = useProducts();
  const published = useCategories();
  const fabrics = useFabrics();
  const bespoke = published.find((collection) => collection.slug === "bespoke-designs");
  const bestSellers = catalog.filter((product) => product.isBestseller);
  const newArrivals = catalog.filter((product) => product.isNew);
  const reviews = useReviews();
  const sample = useSample();
  const hem = useHem();
  const sketch = useSketch();
  const day = useDay();
  const ways = useWays();
  const pieces = usePieces();
  const follow = useFollow();
  const city = useCity();
  const collect = useCollect();
  const commission = useCommission();
  const sellers = useSellers();
  const debut = useDebut();
  const abode = useAbode();
  const why = useWhy();
  const reasonIndexes = [
    useReasonIndex(1),
    useReasonIndex(2),
    useReasonIndex(3),
  ];
  const social = useSocial();
  const testimonials = useTestimonials();
  const reviewNote = useReviewNote();
  const instagramLink = useInstagramLink();
  const fittingRoom = useFittingRoom();
  const exploreCta = useExploreCta();
  const chatCta = useChatCta();
  const beginCta = useBeginCta();
  const viewEdit = useViewEdit();
  const viewPiece = useViewPiece();
  const readStory = useReadStory();
  const whatsapp = useWhatsApp();
  const whatsAppPrefill = useWhatsAppPrefill();
  const heroAlt = useHeroAlt();
  const storyAlt = useStoryAlt();
  const instagram = useInstagram();
  const facebook = useFacebook();
  const story = useStory();
  const heading = useHeading();
  const fitting = useFitting();
  const tailoring = useTailoring();
  const precision = usePrecision();
  const premium = usePremium();
  const handpick = useHandpick();
  const craftsmanship = useCraftsmanship();
  const detail = useDetail();
  const hero = useHero();
  const intro = useIntro();
  const products = catalog;
  useSeo(
    `PERIS — ${hero.replace(/\.$/, "")}`,
    "Welcome to PERIS, where the rich heritage of the Khaleeji Abaya meets contemporary sophistication.",
  );
  const featuredNew = newArrivals[0];

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{city}</p>
          <h1 className="display">{hero}</h1>
          <p className="lede">{intro}</p>
          <div className="hero-actions">
            <Link to="/collections" className="btn btn-fill">
              {exploreCta}
            </Link>
            <a
              className="btn btn-line"
              href={whatsappHref(whatsAppPrefill, whatsapp)}
              target="_blank"
              rel="noreferrer"
            >
              {chatCta}
            </a>
          </div>
        </div>
        <div className="hero-media">
          <img
            src={homeHero}
            alt={heroAlt}
          />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">{collect}</p>
              <h2>{ways}</h2>
            </div>
          </div>
          <div className="collection-grid">
            {published
              .filter((collection) => collection.image)
              .map((collection) => (
                <Link
                  key={collection.slug}
                  to={`/collections/${collection.slug}`}
                  className="collection-tile"
                >
                  <img
                    src={collection.image}
                    alt=""
                    style={{ objectPosition: collection.position }}
                  />
                  <div className="collection-copy">
                    <h3>{collection.name}</h3>
                    <p>{collection.description}</p>
                  </div>
                </Link>
              ))}
            {bespoke ? (
              <Link
                to="/bespoke"
                className="collection-tile collection-bespoke"
              >
                <p className="eyebrow">{commission}</p>
                <h3>{bespoke.name}</h3>
                <p>{bespoke.description}</p>
                <span className="link-quiet">{beginCta}</span>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {fabrics.length > 0 ? (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">{premium}</p>
                <h2>The cloth we cut</h2>
              </div>
              <Link to="/bespoke" className="link-quiet">
                {beginCta}
              </Link>
            </div>
            <p className="lede fabric-lede">{handpick}</p>
            <div className="fabric-grid">
              {fabrics.map((fabric) => (
                <Link key={fabric.name} to="/bespoke" className="fabric-card">
                  {fabric.imageUrl ? (
                    <img src={fabric.imageUrl} alt="" />
                  ) : (
                    <span className="fabric-card__plain" aria-hidden="true" />
                  )}
                  <div className="fabric-card__copy">
                    <h3>{fabric.name}</h3>
                    {fabric.description ? <p>{fabric.description}</p> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">{sellers}</p>
              <h2>{pieces}</h2>
            </div>
            <Link to="/shop" className="link-quiet">
              {viewEdit}
            </Link>
          </div>
          <div className="product-grid">
            {bestSellers.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={openQuickView}
              />
            ))}
          </div>
        </div>
      </section>

      {featuredNew ? (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap story">
            <img
              src={featuredNew.images[0].src}
              alt={featuredNew.images[0].alt}
              style={{ objectPosition: featuredNew.images[0].position }}
            />
            <div className="story-copy">
              <p className="eyebrow">{debut}</p>
              <h2 className="page-title">{featuredNew.name}</h2>
              <p className="lede">{featuredNew.description}</p>
              <Link to={`/product/${featuredNew.slug}`} className="link-quiet">
                {viewPiece}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section" style={{ background: "#f3f1e6" }}>
        <div className="wrap story">
          <img
            src={homeStory}
            alt={storyAlt}
          />
          <div className="story-copy">
            <p className="eyebrow">{abode}</p>
            <h2 className="page-title">{heading}</h2>
            <p className="lede">{story}</p>
            <Link to="/about" className="link-quiet">
              {readStory}
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">{why}</p>
              <h2>{fitting}</h2>
            </div>
          </div>
          <div className="reasons">
            {reasons.map((reason, position) => (
              <article key={reason.index} className="reason">
                <p className="eyebrow">{reasonIndexes[position]}</p>
                <strong>
                  {reason.index === "01"
                    ? tailoring
                    : reason.index === "02"
                      ? premium
                      : craftsmanship}
                </strong>
                <p>
                  {reason.index === "01"
                    ? precision
                    : reason.index === "02"
                      ? handpick
                      : detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">{social}</p>
              <h2>{follow}</h2>
            </div>
            <div className="social-icons">
              <a
                href={instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                <IconInstagram />
              </a>
              <a
                href={facebook}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
              >
                <IconFacebook />
              </a>
              <a
                className="link-quiet"
                href={instagram}
                target="_blank"
                rel="noreferrer"
              >
                {instagramLink}
              </a>
            </div>
          </div>
          <div className="instagram-grid">
            {products.map((product) => (
              <a
                key={product.id}
                href={instagram}
                target="_blank"
                rel="noreferrer"
              >
                <img src={product.images[0].src} alt={product.images[0].alt} />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">{testimonials}</p>
              <h2>{reviews.length > 0 ? fittingRoom : sample}</h2>
            </div>
          </div>
          <div className="quotes">
            {reviews.length > 0
              ? reviews.map((review) => (
                  <article key={review.id}>
                    <p>{review.body}</p>
                    <span className="eyebrow">
                      {review.name}, {review.productName}
                    </span>
                  </article>
                ))
              : [hem, sketch, day].map((note) => (
                  <article key={note}>
                    <p>{note}</p>
                    <span className="eyebrow">{reviewNote}</span>
                  </article>
                ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <NewsletterBand />
      </section>
    </>
  );
}

function NewsletterBand() {
  const notes = useNotes();
  const list = useList();
  const correspondence = useCorrespondence();
  return (
    <div className="wrap newsletter">
      <div>
        <p className="eyebrow">{correspondence}</p>
        <h2 className="page-title">{notes}</h2>
        <p className="lede" style={{ marginTop: 12 }}>
          {list}
        </p>
      </div>
      <HomeSubscribe />
    </div>
  );
}

function HomeSubscribe() {
  const emailLabel = useEmailLabel();
  const subscribeButton = useSubscribeButton();
  const listMessage = useListMessage();
  const emailError = useEmailError();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError(emailError);
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
      }}
    >
      <label className="field">
        <span>{emailLabel}</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      {error ? <p className="field-error">{error}</p> : null}
      {done ? (
        <p>{listMessage}</p>
      ) : null}
      <button
        type="submit"
        className="btn btn-fill"
        style={{ justifySelf: "start" }}
      >
        {subscribeButton}
      </button>
    </form>
  );
}
