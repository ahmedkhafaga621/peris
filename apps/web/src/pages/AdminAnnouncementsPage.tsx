import { useEffect, useState } from "react";
import {
  usableCraftsmanship,
  usableDetail,
  usableFitting,
  usableHeading,
  usableHem,
  usableHero,
  usableIntro,
  usableHandpick,
  usablePrecision,
  usablePremium,
  usableSample,
  usableSketch,
  usableDay,
  usableNotes,
  usableList,
  usableFooter,
  usableWays,
  usablePieces,
  usableFollow,
  usableCity,
  usableCollect,
  usableCommission,
  usableContactEyebrow,
  usableShopEyebrow,
  usableAppointmentEyebrow,
  usableBespokeEyebrow,
  usablePolicyEyebrow,
  usableFaqEyebrow,
  usableSizeGuideEyebrow,
  usableTrackEyebrow,
  usableNotFoundEyebrow,
  usableMaintenanceEyebrow,
  usableSkuLabel,
  usableCheckoutEyebrow,
  usableConfirmationEyebrow,
  usableBagEyebrow,
  usableSummaryEyebrow,
  usableAccountEyebrow,
  usableWishlistEyebrow,
  usableSearchEyebrow,
  usableSearchIcon,
  usableSearchHouse,
  usableSearchPieces,
  usableSearchSubmit,
  usableOrderNow,
  usableOrderPrefill,
  usableBespokePrefill,
  usableOrderHelpPrefill,
  usableProductPrefill,
  usableCheckoutPrefill,
  usableBespokeSendPrefill,
  usableSendWhatsApp,
  usableAskPiece,
  usableTellBoutique,
  usableWaBoutique,
  usableWhatsAppPrefill,
  usableAppointmentPrefill,
  usableSizeGuideBanner,
  usableHeroAlt,
  usableStoryAlt,
  usableAboutAlt,
  usablePolicyBanner,
  usableSellers,
  usableDebut,
  usableAbode,
  usableWhy,
  usableSocial,
  usableTestimonials,
  usableCorrespondence,
  usableReviewNote,
  usableInstagramLink,
  usableFittingRoom,
  usableExploreCta,
  usableChatCta,
  usableBeginCta,
  usableViewEdit,
  usableViewPiece,
  usableReadStory,
  usableEmailLabel,
  usableSubscribeButton,
  usableListMessage,
  usableEmailError,
  usableFooterNewsletter,
  usableFooterEmail,
  usableFooterSubscribe,
  usableFooterListMessage,
  usableFooterError,
  usableFooterQuickLinks,
  usableFooterSupport,
  usableFooterBoutique,
  usableReasonIndex,
  usableStory,
  usableTailoring,
  usableWelcome,
} from "@/data/site";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type DeskNotice = {
  id: string;
  message: string;
  isActive: boolean;
};

export function AdminAnnouncementsPage() {
  const user = useStaffSession((state) => state.user);
  const [notices, setNotices] = useState<DeskNotice[]>([]);
  const [lines, setLines] = useState<Record<string, string>>({});
  const [hours, setHours] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [instagram, setInstagram] = useState<string | null>(null);
  const [facebook, setFacebook] = useState<string | null>(null);
  const [maps, setMaps] = useState<string | null>(null);
  const [parent, setParent] = useState<string | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);
  const [hero, setHero] = useState<string | null>(null);
  const [intro, setIntro] = useState<string | null>(null);
  const [heading, setHeading] = useState<string | null>(null);
  const [fitting, setFitting] = useState<string | null>(null);
  const [tailoring, setTailoring] = useState<string | null>(null);
  const [precision, setPrecision] = useState<string | null>(null);
  const [premium, setPremium] = useState<string | null>(null);
  const [handpick, setHandpick] = useState<string | null>(null);
  const [craftsmanship, setCraftsmanship] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [sample, setSample] = useState<string | null>(null);
  const [hem, setHem] = useState<string | null>(null);
  const [sketch, setSketch] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [list, setList] = useState<string | null>(null);
  const [footer, setFooter] = useState<string | null>(null);
  const [ways, setWays] = useState<string | null>(null);
  const [pieces, setPieces] = useState<string | null>(null);
  const [follow, setFollow] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [collect, setCollect] = useState<string | null>(null);
  const [commission, setCommission] = useState<string | null>(null);
  const [contactEyebrow, setContactEyebrow] = useState<string | null>(null);
  const [shopEyebrow, setShopEyebrow] = useState<string | null>(null);
  const [appointmentEyebrow, setAppointmentEyebrow] = useState<string | null>(null);
  const [bespokeEyebrow, setBespokeEyebrow] = useState<string | null>(null);
  const [policyEyebrow, setPolicyEyebrow] = useState<string | null>(null);
  const [faqEyebrow, setFaqEyebrow] = useState<string | null>(null);
  const [sizeGuideEyebrow, setSizeGuideEyebrow] = useState<string | null>(null);
  const [trackEyebrow, setTrackEyebrow] = useState<string | null>(null);
  const [notFoundEyebrow, setNotFoundEyebrow] = useState<string | null>(null);
  const [maintenanceEyebrow, setMaintenanceEyebrow] = useState<string | null>(null);
  const [skuLabel, setSkuLabel] = useState<string | null>(null);
  const [checkoutEyebrow, setCheckoutEyebrow] = useState<string | null>(null);
  const [confirmationEyebrow, setConfirmationEyebrow] = useState<string | null>(null);
  const [bagEyebrow, setBagEyebrow] = useState<string | null>(null);
  const [summaryEyebrow, setSummaryEyebrow] = useState<string | null>(null);
  const [accountEyebrow, setAccountEyebrow] = useState<string | null>(null);
  const [wishlistEyebrow, setWishlistEyebrow] = useState<string | null>(null);
  const [searchEyebrow, setSearchEyebrow] = useState<string | null>(null);
  const [searchIcon, setSearchIcon] = useState<string | null>(null);
  const [searchHouse, setSearchHouse] = useState<string | null>(null);
  const [searchPieces, setSearchPieces] = useState<string | null>(null);
  const [searchSubmit, setSearchSubmit] = useState<string | null>(null);
  const [orderNow, setOrderNow] = useState<string | null>(null);
  const [orderPrefill, setOrderPrefill] = useState<string | null>(null);
  const [bespokePrefill, setBespokePrefill] = useState<string | null>(null);
  const [orderHelpPrefill, setOrderHelpPrefill] = useState<string | null>(null);
  const [productPrefill, setProductPrefill] = useState<string | null>(null);
  const [checkoutPrefill, setCheckoutPrefill] = useState<string | null>(null);
  const [bespokeSendPrefill, setBespokeSendPrefill] = useState<string | null>(
    null,
  );
  const [sendWhatsApp, setSendWhatsApp] = useState<string | null>(null);
  const [askPiece, setAskPiece] = useState<string | null>(null);
  const [tellBoutique, setTellBoutique] = useState<string | null>(null);
  const [waBoutique, setWaBoutique] = useState<string | null>(null);
  const [whatsAppPrefill, setWhatsAppPrefill] = useState<string | null>(null);
  const [appointmentPrefill, setAppointmentPrefill] = useState<string | null>(
    null,
  );
  const [sizeGuideBanner, setSizeGuideBanner] = useState<string | null>(null);
  const [heroAlt, setHeroAlt] = useState<string | null>(null);
  const [storyAlt, setStoryAlt] = useState<string | null>(null);
  const [aboutAlt, setAboutAlt] = useState<string | null>(null);
  const [policyBanner, setPolicyBanner] = useState<string | null>(null);
  const [sellers, setSellers] = useState<string | null>(null);
  const [debut, setDebut] = useState<string | null>(null);
  const [abode, setAbode] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [social, setSocial] = useState<string | null>(null);
  const [testimonials, setTestimonials] = useState<string | null>(null);
  const [correspondence, setCorrespondence] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<string | null>(null);
  const [instagramLink, setInstagramLink] = useState<string | null>(null);
  const [fittingRoom, setFittingRoom] = useState<string | null>(null);
  const [exploreCta, setExploreCta] = useState<string | null>(null);
  const [chatCta, setChatCta] = useState<string | null>(null);
  const [beginCta, setBeginCta] = useState<string | null>(null);
  const [viewEdit, setViewEdit] = useState<string | null>(null);
  const [viewPiece, setViewPiece] = useState<string | null>(null);
  const [readStory, setReadStory] = useState<string | null>(null);
  const [emailLabel, setEmailLabel] = useState<string | null>(null);
  const [subscribeButton, setSubscribeButton] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [footerNewsletter, setFooterNewsletter] = useState<string | null>(null);
  const [footerEmail, setFooterEmail] = useState<string | null>(null);
  const [footerSubscribe, setFooterSubscribe] = useState<string | null>(null);
  const [footerListMessage, setFooterListMessage] = useState<string | null>(
    null,
  );
  const [footerError, setFooterError] = useState<string | null>(null);
  const [footerQuickLinks, setFooterQuickLinks] = useState<string | null>(
    null,
  );
  const [footerSupport, setFooterSupport] = useState<string | null>(null);
  const [footerBoutique, setFooterBoutique] = useState<string | null>(null);
  const [reasonIndex1, setReasonIndex1] = useState<string | null>(null);
  const [reasonIndex2, setReasonIndex2] = useState<string | null>(null);
  const [reasonIndex3, setReasonIndex3] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState("");
  useSeo("Notice — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ announcements: DeskNotice[] }>(
      "/api/v1/admin/announcements",
    )
      .then((body) => {
        setNotices(body.announcements);
        setLines((current) => {
          const next = { ...current };
          for (const item of body.announcements) {
            if (next[item.id] === undefined) next[item.id] = item.message;
          }
          return next;
        });
      })
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The notice could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/hours")
      .then((body) => setHours(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The hours could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/address")
      .then((body) => setAddress(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The address could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/phone")
      .then((body) => setPhone(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The phone could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/instagram")
      .then((body) => setInstagram(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Instagram could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/facebook")
      .then((body) => setFacebook(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Facebook could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/maps")
      .then((body) => setMaps(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The map could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/parent")
      .then((body) => setParent(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The parent house could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/story")
      .then((body) => setStory(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The about story could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/welcome")
      .then((body) => setWelcome(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The contact welcome could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/hero")
      .then((body) => setHero(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The homepage line could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/intro")
      .then((body) => setIntro(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The homepage introduction could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/heading")
      .then((body) => setHeading(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The story heading could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/fitting")
      .then((body) => setFitting(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The fitting heading could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/tailoring")
      .then((body) => setTailoring(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The tailoring title could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/precision")
      .then((body) => setPrecision(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The tailoring line could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/premium")
      .then((body) => setPremium(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The premium title could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/handpick")
      .then((body) => setHandpick(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The premium line could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/craftsmanship")
      .then((body) => setCraftsmanship(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The craftsmanship title could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/detail")
      .then((body) => setDetail(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The craftsmanship line could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/sample")
      .then((body) => setSample(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The sample notes could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/hem")
      .then((body) => setHem(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The first note could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/sketch")
      .then((body) => setSketch(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The second note could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/day")
      .then((body) => setDay(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The third note could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/notes")
      .then((body) => setNotes(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The notes heading could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/list")
      .then((body) => setList(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The notes line could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/footer")
      .then((body) => setFooter(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The footer line could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/ways")
      .then((body) => setWays(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The collection heading could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/pieces")
      .then((body) => setPieces(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The pieces heading could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/follow")
      .then((body) => setFollow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The follow heading could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/city")
      .then((body) => setCity(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The city line could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/collect")
      .then((body) => setCollect(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The collections eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/commission")
      .then((body) => setCommission(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The commission eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/contacteyebrow")
      .then((body) => setContactEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Contact eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/appointmenteyebrow")
      .then((body) => setAppointmentEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Appointment eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/checkouteyebrow")
      .then((body) => setCheckoutEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Checkout eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/confirmationeyebrow")
      .then((body) => setConfirmationEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Confirmation eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/bageyebrow")
      .then((body) => setBagEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Bag eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/summaryeyebrow")
      .then((body) => setSummaryEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Summary eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/policybanner")
      .then((body) => setPolicyBanner(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Policy draft banner could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/accounteyebrow")
      .then((body) => setAccountEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Account eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/wishlisteyebrow")
      .then((body) => setWishlistEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Wishlist eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/searcheyebrow")
      .then((body) => setSearchEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Search eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/searchicon")
      .then((body) => setSearchIcon(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Header Search icon label could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/searchhouse")
      .then((body) => setSearchHouse(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Search the house label could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/searchpieces")
      .then((body) => setSearchPieces(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Search pieces placeholder could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/searchsubmit")
      .then((body) => setSearchSubmit(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Search submit button could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/ordernow")
      .then((body) => setOrderNow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Order Now label could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/orderprefill")
      .then((body) => setOrderPrefill(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Order WhatsApp prefill could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/bespokeprefill")
      .then((body) => setBespokePrefill(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Bespoke WhatsApp prefill could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/orderhelpprefill")
      .then((body) => setOrderHelpPrefill(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Order help WhatsApp prefill could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/productprefill")
      .then((body) => setProductPrefill(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Product WhatsApp prefill could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/checkoutprefill")
      .then((body) => setCheckoutPrefill(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Checkout WhatsApp prefill could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/bespokesendprefill")
      .then((body) => setBespokeSendPrefill(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Bespoke send WhatsApp prefill could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/sendwhatsapp")
      .then((body) => setSendWhatsApp(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Send on WhatsApp label could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/askpiece")
      .then((body) => setAskPiece(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Ask about this piece on WhatsApp label could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/tellboutique")
      .then((body) => setTellBoutique(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Tell the boutique on WhatsApp label could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/waboutique")
      .then((body) => setWaBoutique(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The WhatsApp the boutique label could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/whatsappprefill")
      .then((body) => setWhatsAppPrefill(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The WhatsApp prefill could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/appointmentprefill")
      .then((body) => setAppointmentPrefill(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Appointment WhatsApp prefill could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/sizeguidebanner")
      .then((body) => setSizeGuideBanner(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Size guide draft banner could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/heroalt")
      .then((body) => setHeroAlt(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Homepage hero alt could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/storyalt")
      .then((body) => setStoryAlt(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Homepage story alt could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/aboutalt")
      .then((body) => setAboutAlt(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The About page alt could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/skulabel")
      .then((body) => setSkuLabel(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The SKU label could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/maintenanceeyebrow")
      .then((body) => setMaintenanceEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Maintenance page eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/notfoundeyebrow")
      .then((body) => setNotFoundEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The 404 page eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/trackeyebrow")
      .then((body) => setTrackEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Track page eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/sizeguideeyebrow")
      .then((body) => setSizeGuideEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Size guide eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/faqeyebrow")
      .then((body) => setFaqEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The FAQ eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/policyeyebrow")
      .then((body) => setPolicyEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Policy page eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/bespokeeyebrow")
      .then((body) => setBespokeEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Bespoke eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/shopeyebrow")
      .then((body) => setShopEyebrow(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Shop eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/sellers")
      .then((body) => setSellers(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The best sellers eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/debut")
      .then((body) => setDebut(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The new arrival eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/abode")
      .then((body) => setAbode(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The house eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/why")
      .then((body) => setWhy(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The why PERIS eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/social")
      .then((body) => setSocial(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Instagram eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/testimonials")
      .then((body) => setTestimonials(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Testimonials eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/correspondence")
      .then((body) => setCorrespondence(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Correspondence eyebrow could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/reviewnote")
      .then((body) => setReviewNote(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The sample review note could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/instagramlink")
      .then((body) => setInstagramLink(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Open Instagram link text could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/fittingroom")
      .then((body) => setFittingRoom(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The testimonials heading could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/explorecta")
      .then((body) => setExploreCta(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Explore Our Collections button text could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/chatcta")
      .then((body) => setChatCta(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Chat with Us button text could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/begincta")
      .then((body) => setBeginCta(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Begin a commission link text could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/viewedit")
      .then((body) => setViewEdit(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The View the edit link text could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/viewpiece")
      .then((body) => setViewPiece(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The View the piece link text could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/readstory")
      .then((body) => setReadStory(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Read the story link text could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/emaillabel")
      .then((body) => setEmailLabel(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Newsletter email label could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/subscribebtn")
      .then((body) => setSubscribeButton(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Newsletter subscribe button could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/listmsg")
      .then((body) => setListMessage(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Newsletter list message could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/emailerr")
      .then((body) => setEmailError(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Newsletter email error could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/footnews")
      .then((body) => setFooterNewsletter(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Footer newsletter heading could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/footemail")
      .then((body) => setFooterEmail(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Footer email placeholder could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/footsub")
      .then((body) => setFooterSubscribe(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Footer subscribe button could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/footlist")
      .then((body) => setFooterListMessage(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Footer list message could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/footerr")
      .then((body) => setFooterError(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Footer email error could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/footquick")
      .then((body) => setFooterQuickLinks(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Footer quick links heading could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/footsupport")
      .then((body) => setFooterSupport(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Footer customer support heading could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/footboutique")
      .then((body) => setFooterBoutique(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Footer boutique heading could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/reasonidx1")
      .then((body) => setReasonIndex1(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Why reason 01 number could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/reasonidx2")
      .then((body) => setReasonIndex2(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Why reason 02 number could not be opened.",
        ),
      );
    void staffFetch<{ line: string }>("/api/v1/admin/reasonidx3")
      .then((body) => setReasonIndex3(body.line))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The Why reason 03 number could not be opened.",
        ),
      );
  }, [user]);

  function setActive(notice: DeskNotice, isActive: boolean) {
    setSaving(notice.id);
    setNote("");
    void staffFetch<{ announcement: DeskNotice }>(
      `/api/v1/admin/announcements/${encodeURIComponent(notice.id)}`,
      {
        method: "POST",
        body: JSON.stringify({ isActive }),
      },
    )
      .then((body) => {
        setNotices((current) =>
          current.map((item) =>
            item.id === body.announcement.id ? body.announcement : item,
          ),
        );
      })
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The notice was not changed.",
        ),
      )
      .finally(() => setSaving(""));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Notice</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          A hidden notice leaves the top of the shop. The line appears at the
          top of the shop. The hours appear on the boutique pages. The address
          appears on the boutique pages. The phone appears on the boutique
          pages. WhatsApp uses the number from Store Settings. Instagram appears
          on the boutique pages. Facebook appears on the boutique pages. The map
          appears on the boutique pages. The parent house appears on the
          boutique pages. The about story appears on the boutique pages. The
          contact welcome appears on the boutique pages. The homepage line
          appears on the boutique pages. The homepage introduction appears on
          the boutique pages. The story heading appears on the boutique pages.
          The fitting heading appears on the boutique pages. The tailoring title
          appears on the boutique pages. The tailoring line appears on the
          boutique pages. The premium title appears on the boutique pages. The
          premium line appears on the boutique pages. The craftsmanship title
          appears on the boutique pages. The craftsmanship line appears on the
          boutique pages. The sample notes appear on the boutique pages. The
          first note appears on the boutique pages. The second note appears on
          the boutique pages. The third note appears on the boutique pages. The
          notes heading appears on the boutique pages. The notes line appears on the boutique pages.
          The footer line appears on the boutique pages. The collection heading
          appears on the boutique pages. The pieces heading appears on the
          boutique pages. The follow heading appears on the boutique pages. The
          city line appears on the boutique pages. The collections eyebrow
          appears on the boutique pages. The commission eyebrow appears on the
          boutique pages. The best sellers eyebrow appears on the boutique
          pages. The new arrival eyebrow appears on the boutique pages. The house
          eyebrow appears on the boutique pages. The why PERIS eyebrow appears on
          the boutique pages. The Instagram eyebrow appears on the boutique
          pages. The Testimonials eyebrow appears on the boutique pages. The
          Correspondence eyebrow appears on the boutique pages. The Contact eyebrow appears on the boutique pages. The Shop eyebrow appears on the shop pages, except the collections index. The Appointment eyebrow appears on the boutique pages. The Bespoke eyebrow appears on the bespoke page. The Policy page eyebrow appears on each policy page. The FAQ eyebrow appears on the FAQ page. The Size guide eyebrow appears on the size guide page. The Track page eyebrow appears on the track order page. The 404 page eyebrow appears on the not found page. The Maintenance page eyebrow appears on the maintenance page. The SKU label appears before each piece's SKU on the piece page. The Checkout eyebrow appears on the checkout pages. The Confirmation eyebrow appears on the order confirmation page. The Bag eyebrow appears on the cart page. The Summary eyebrow appears on the cart summary. The Account eyebrow appears on the account pages. The Wishlist eyebrow appears on the wishlist page. The Search eyebrow appears on the search page. The Header Search icon label appears on the header Search button. The Search the house label appears on the header search panel. The Search pieces placeholder appears on the header search input. The Search submit button appears on the header search panel. The Order Now label appears on the floating WhatsApp control. The Order WhatsApp prefill appears on the floating WhatsApp control. The Bespoke WhatsApp prefill appears on the floating WhatsApp control on the bespoke page. The Order help WhatsApp prefill appears on the floating WhatsApp control on the orders and track order pages. The Product WhatsApp prefill appears on the piece page and floating WhatsApp control, before the piece name and link. The Checkout WhatsApp prefill appears on the order receipt WhatsApp link, before the order number. The Bespoke send WhatsApp prefill appears on the bespoke success WhatsApp link, before the request number and form details. The Send on WhatsApp label appears on the bespoke success WhatsApp link. The Ask about this piece on WhatsApp label appears on the piece page. The Tell the boutique on WhatsApp label appears on the order receipt. The WhatsApp the boutique label appears on the contact page. The WhatsApp prefill appears on the homepage Chat with Us link. The Appointment WhatsApp prefill appears on the contact page WhatsApp link. The Size guide draft banner appears on the size guide page. The Homepage hero alt appears on the homepage hero image. The Homepage story alt appears on the homepage story image. The About page alt appears on the about page image. The Policy draft banner appears on each policy page.
          Open Instagram link text appears on the homepage. The testimonials
          heading appears on the homepage when reviews are published. The
          Explore Our Collections button text appears on the homepage. The
          Chat with Us button text appears on the homepage. The Begin a
          commission link text appears on the homepage. The View the edit link
          text appears on the homepage. The View the piece link text appears
          on the homepage. The Read the story link text appears on the
          homepage. The Newsletter email label appears on the homepage. The
          Newsletter subscribe button text appears on the homepage. The
          Newsletter list message appears after a homepage sign-up. The
          Newsletter email error appears when the homepage address is not
          valid. The Footer newsletter heading and the Footer email
          placeholder and the Footer subscribe button appear in the site footer.
          The Footer list message appears in the site footer after a sign-up.
          The Footer email error appears in the site footer when the address is
          not valid. The Footer quick links heading appears above the footer
          quick links. The Footer customer support heading appears above the
          footer support links. The Footer boutique heading appears above the
          footer boutique details. The Why reason 01, 02, and 03 numbers appear above
          each reason on the homepage.
          The closure note uses the
          address.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Notice</th>
            <th>Shop</th>
          </tr>
        </thead>
        <tbody>
          {notices.length === 0 ? (
            <tr>
              <td colSpan={2}>No notice is on the desk.</td>
            </tr>
          ) : (
            notices.map((notice) => (
              <tr key={notice.id}>
                <td>
                  <label className="field">
                    <span>Line</span>
                    <textarea
                      aria-label="Notice line"
                      value={lines[notice.id] ?? notice.message}
                      onChange={(event) =>
                        setLines((current) => ({
                          ...current,
                          [notice.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label="Save the notice line"
                    disabled={saving === `${notice.id}:line`}
                    onClick={() => {
                      const message = (
                        lines[notice.id] ?? notice.message
                      ).trim();
                      if (message.length < 8) {
                        setNote("Write the notice in a full sentence.");
                        return;
                      }
                      setSaving(`${notice.id}:line`);
                      setNote("");
                      void staffFetch<{ announcement: DeskNotice }>(
                        `/api/v1/admin/announcements/${encodeURIComponent(notice.id)}/message`,
                        {
                          method: "POST",
                          body: JSON.stringify({ message }),
                        },
                      )
                        .then((body) => {
                          setNotices((current) =>
                            current.map((item) =>
                              item.id === body.announcement.id
                                ? body.announcement
                                : item,
                            ),
                          );
                          setLines((current) => ({
                            ...current,
                            [body.announcement.id]: body.announcement.message,
                          }));
                        })
                        .catch((error: unknown) =>
                          setNote(
                            error instanceof Error
                              ? error.message
                              : "The notice was not saved.",
                          ),
                        )
                        .finally(() => setSaving(""));
                    }}
                  >
                    Save line
                  </button>
                </td>
                <td>
                  <p>{notice.isActive ? "Shown" : "Hidden"}</p>
                  <button
                    type="button"
                    className="btn btn-line"
                    aria-label={`${notice.isActive ? "Hide" : "Show"} boutique hours`}
                    disabled={saving === notice.id}
                    onClick={() => setActive(notice, !notice.isActive)}
                  >
                    {notice.isActive ? "Hide notice" : "Show notice"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <section style={{ marginTop: 28 }}>
        <h2>Hours</h2>
        {hours == null ? (
          <p>Opening the hours.</p>
        ) : (
          <label className="field">
            <span>Boutique hours</span>
            <textarea
              aria-label="Boutique hours"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save boutique hours"
              disabled={saving === "hours"}
              onClick={() => {
                const line = hours.trim();
                if (line.length < 8) {
                  setNote("Write the hours in a full sentence.");
                  return;
                }
                setSaving("hours");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/hours", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setHours(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The hours were not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save hours
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Address</h2>
        {address == null ? (
          <p>Opening the address.</p>
        ) : (
          <label className="field">
            <span>Boutique address</span>
            <textarea
              aria-label="Boutique address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save boutique address"
              disabled={saving === "address"}
              onClick={() => {
                const line = address.trim();
                if (line.length < 8) {
                  setNote("Write the address in a full sentence.");
                  return;
                }
                setSaving("address");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/address", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setAddress(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The address was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save address
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Phone</h2>
        {phone == null ? (
          <p>Opening the phone.</p>
        ) : (
          <label className="field">
            <span>Boutique phone</span>
            <textarea
              aria-label="Boutique phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save boutique phone"
              disabled={saving === "phone"}
              onClick={() => {
                const line = phone.trim();
                const digits = line.replace(/\D/g, "");
                if (
                  line.length < 8 ||
                  digits.length < 8 ||
                  digits.length > 15
                ) {
                  setNote("Write the phone with the country code.");
                  return;
                }
                setSaving("phone");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/phone", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setPhone(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The phone was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save phone
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Instagram</h2>
        {instagram == null ? (
          <p>Opening the Instagram.</p>
        ) : (
          <label className="field">
            <span>Boutique Instagram</span>
            <textarea
              aria-label="Boutique Instagram"
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save boutique Instagram"
              disabled={saving === "instagram"}
              onClick={() => {
                const line = instagram.trim();
                let accepted = false;
                try {
                  const url = new URL(line);
                  const handle =
                    url.pathname.split("/").filter(Boolean)[0] ?? "";
                  accepted =
                    url.protocol === "https:" &&
                    (url.hostname === "www.instagram.com" ||
                      url.hostname === "instagram.com") &&
                    /^[A-Za-z0-9._]{2,30}$/.test(handle);
                } catch {
                  accepted = false;
                }
                if (!accepted) {
                  setNote("Write the Instagram address.");
                  return;
                }
                setSaving("instagram");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/instagram", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setInstagram(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Instagram was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Instagram
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Facebook</h2>
        {facebook == null ? (
          <p>Opening the Facebook.</p>
        ) : (
          <label className="field">
            <span>Boutique Facebook</span>
            <textarea
              aria-label="Boutique Facebook"
              value={facebook}
              onChange={(event) => setFacebook(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save boutique Facebook"
              disabled={saving === "facebook"}
              onClick={() => {
                const line = facebook.trim();
                let accepted = false;
                try {
                  const url = new URL(line);
                  const page = url.pathname.split("/").filter(Boolean)[0] ?? "";
                  accepted =
                    url.protocol === "https:" &&
                    (url.hostname === "www.facebook.com" ||
                      url.hostname === "facebook.com") &&
                    /^[A-Za-z0-9.]{2,50}$/.test(page);
                } catch {
                  accepted = false;
                }
                if (!accepted) {
                  setNote("Write the Facebook address.");
                  return;
                }
                setSaving("facebook");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/facebook", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFacebook(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Facebook was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Facebook
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Map</h2>
        {maps == null ? (
          <p>Opening the map.</p>
        ) : (
          <label className="field">
            <span>Boutique map</span>
            <textarea
              aria-label="Boutique map"
              value={maps}
              onChange={(event) => setMaps(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save boutique map"
              disabled={saving === "maps"}
              onClick={() => {
                const line = maps.trim();
                let accepted = false;
                try {
                  const url = new URL(line);
                  const token =
                    url.pathname.split("/").filter(Boolean)[0] ?? "";
                  accepted =
                    url.protocol === "https:" &&
                    (((url.hostname === "share.google" ||
                      url.hostname === "maps.app.goo.gl") &&
                      /^[A-Za-z0-9_-]{4,80}$/.test(token)) ||
                      (url.hostname === "maps.google.com" &&
                        (url.pathname.length > 1 || url.search.length > 1)) ||
                      ((url.hostname === "www.google.com" ||
                        url.hostname === "google.com") &&
                        url.pathname.startsWith("/maps")));
                } catch {
                  accepted = false;
                }
                if (!accepted) {
                  setNote("Write the Google Maps address.");
                  return;
                }
                setSaving("maps");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/maps", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setMaps(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The map was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save map
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Parent</h2>
        {parent == null ? (
          <p>Opening the parent house.</p>
        ) : (
          <label className="field">
            <span>Parent house</span>
            <textarea
              aria-label="Parent house"
              value={parent}
              onChange={(event) => setParent(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save parent house"
              disabled={saving === "parent"}
              onClick={() => {
                const line = parent.trim();
                if (!/^[A-Za-z][A-Za-z .'-]{1,39}$/.test(line)) {
                  setNote("Write the parent house.");
                  return;
                }
                setSaving("parent");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/parent", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setParent(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The parent house was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save parent
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Story</h2>
        {story == null ? (
          <p>Opening the about story.</p>
        ) : (
          <label className="field">
            <span>About story</span>
            <textarea
              aria-label="About story"
              value={story}
              onChange={(event) => setStory(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save about story"
              disabled={saving === "story"}
              onClick={() => {
                const line = story.trim();
                if (!usableStory(line)) {
                  setNote("Write the about story.");
                  return;
                }
                setSaving("story");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/story", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setStory(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The about story was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save story
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Welcome</h2>
        {welcome == null ? (
          <p>Opening the contact welcome.</p>
        ) : (
          <label className="field">
            <span>Contact welcome</span>
            <textarea
              aria-label="Contact welcome"
              value={welcome}
              onChange={(event) => setWelcome(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save contact welcome"
              disabled={saving === "welcome"}
              onClick={() => {
                const line = welcome.trim();
                if (!usableWelcome(line)) {
                  setNote("Write the contact welcome.");
                  return;
                }
                setSaving("welcome");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/welcome", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setWelcome(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The contact welcome was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save welcome
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Homepage</h2>
        {hero == null ? (
          <p>Opening the homepage line.</p>
        ) : (
          <label className="field">
            <span>Homepage line</span>
            <textarea
              aria-label="Homepage line"
              value={hero}
              onChange={(event) => setHero(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save homepage line"
              disabled={saving === "hero"}
              onClick={() => {
                const line = hero.trim();
                if (!usableHero(line)) {
                  setNote("Write the homepage line.");
                  return;
                }
                setSaving("hero");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/hero", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setHero(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The homepage line was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save homepage
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Introduction</h2>
        {intro == null ? (
          <p>Opening the homepage introduction.</p>
        ) : (
          <label className="field">
            <span>Homepage introduction</span>
            <textarea
              aria-label="Homepage introduction"
              value={intro}
              onChange={(event) => setIntro(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save homepage introduction"
              disabled={saving === "intro"}
              onClick={() => {
                const line = intro.trim();
                if (!usableIntro(line)) {
                  setNote("Write the homepage introduction.");
                  return;
                }
                setSaving("intro");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/intro", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setIntro(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The homepage introduction was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save introduction
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Heading</h2>
        {heading == null ? (
          <p>Opening the story heading.</p>
        ) : (
          <label className="field">
            <span>Story heading</span>
            <textarea
              aria-label="Story heading"
              value={heading}
              onChange={(event) => setHeading(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save story heading"
              disabled={saving === "heading"}
              onClick={() => {
                const line = heading.trim();
                if (!usableHeading(line)) {
                  setNote("Write the story heading.");
                  return;
                }
                setSaving("heading");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/heading", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setHeading(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The story heading was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save heading
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Fitting</h2>
        {fitting == null ? (
          <p>Opening the fitting heading.</p>
        ) : (
          <label className="field">
            <span>Fitting heading</span>
            <textarea
              aria-label="Fitting heading"
              value={fitting}
              onChange={(event) => setFitting(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save fitting heading"
              disabled={saving === "fitting"}
              onClick={() => {
                const line = fitting.trim();
                if (!usableFitting(line)) {
                  setNote("Write the fitting heading.");
                  return;
                }
                setSaving("fitting");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/fitting", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFitting(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The fitting heading was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save fitting
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Tailoring</h2>
        {tailoring == null ? (
          <p>Opening the tailoring title.</p>
        ) : (
          <label className="field">
            <span>Tailoring title</span>
            <textarea
              aria-label="Tailoring title"
              value={tailoring}
              onChange={(event) => setTailoring(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save tailoring title"
              disabled={saving === "tailoring"}
              onClick={() => {
                const line = tailoring.trim();
                if (!usableTailoring(line)) {
                  setNote("Write the tailoring title.");
                  return;
                }
                setSaving("tailoring");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/tailoring", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setTailoring(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The tailoring title was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save tailoring
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Line</h2>
        {precision == null ? (
          <p>Opening the tailoring line.</p>
        ) : (
          <label className="field">
            <span>Tailoring line</span>
            <textarea
              aria-label="Tailoring line"
              value={precision}
              onChange={(event) => setPrecision(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save tailoring line"
              disabled={saving === "precision"}
              onClick={() => {
                const line = precision.trim();
                if (!usablePrecision(line)) {
                  setNote("Write the tailoring line.");
                  return;
                }
                setSaving("precision");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/precision", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setPrecision(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The tailoring line was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save line
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Premium</h2>
        {premium == null ? (
          <p>Opening the premium title.</p>
        ) : (
          <label className="field">
            <span>Premium title</span>
            <textarea
              aria-label="Premium title"
              value={premium}
              onChange={(event) => setPremium(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save premium title"
              disabled={saving === "premium"}
              onClick={() => {
                const line = premium.trim();
                if (!usablePremium(line)) {
                  setNote("Write the premium title.");
                  return;
                }
                setSaving("premium");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/premium", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setPremium(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The premium title was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save premium
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Handpick</h2>
        {handpick == null ? (
          <p>Opening the premium line.</p>
        ) : (
          <label className="field">
            <span>Premium line</span>
            <textarea
              aria-label="Premium line"
              value={handpick}
              onChange={(event) => setHandpick(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save premium line"
              disabled={saving === "handpick"}
              onClick={() => {
                const line = handpick.trim();
                if (!usableHandpick(line)) {
                  setNote("Write the premium line.");
                  return;
                }
                setSaving("handpick");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/handpick", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setHandpick(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The premium line was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save handpick
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Craftsmanship</h2>
        {craftsmanship == null ? (
          <p>Opening the craftsmanship title.</p>
        ) : (
          <label className="field">
            <span>Craftsmanship title</span>
            <textarea
              aria-label="Craftsmanship title"
              value={craftsmanship}
              onChange={(event) => setCraftsmanship(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save craftsmanship title"
              disabled={saving === "craftsmanship"}
              onClick={() => {
                const line = craftsmanship.trim();
                if (!usableCraftsmanship(line)) {
                  setNote("Write the craftsmanship title.");
                  return;
                }
                setSaving("craftsmanship");
                setNote("");
                void staffFetch<{ line: string }>(
                  "/api/v1/admin/craftsmanship",
                  {
                    method: "POST",
                    body: JSON.stringify({ line }),
                  },
                )
                  .then((body) => setCraftsmanship(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The craftsmanship title was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save craftsmanship
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Detail</h2>
        {detail == null ? (
          <p>Opening the craftsmanship line.</p>
        ) : (
          <label className="field">
            <span>Craftsmanship line</span>
            <textarea
              aria-label="Craftsmanship line"
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save craftsmanship line"
              disabled={saving === "detail"}
              onClick={() => {
                const line = detail.trim();
                if (!usableDetail(line)) {
                  setNote("Write the craftsmanship line.");
                  return;
                }
                setSaving("detail");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/detail", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setDetail(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The craftsmanship line was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save detail
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Sample</h2>
        {sample == null ? (
          <p>Opening the sample notes.</p>
        ) : (
          <label className="field">
            <span>Sample notes</span>
            <textarea
              aria-label="Sample notes"
              value={sample}
              onChange={(event) => setSample(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save sample notes"
              disabled={saving === "sample"}
              onClick={() => {
                const line = sample.trim();
                if (!usableSample(line)) {
                  setNote("Write the sample notes.");
                  return;
                }
                setSaving("sample");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/sample", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSample(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The sample notes were not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save sample
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Hem</h2>
        {hem == null ? (
          <p>Opening the first note.</p>
        ) : (
          <label className="field">
            <span>First note</span>
            <textarea
              aria-label="First note"
              value={hem}
              onChange={(event) => setHem(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save first note"
              disabled={saving === "hem"}
              onClick={() => {
                const line = hem.trim();
                if (!usableHem(line)) {
                  setNote("Write the first note.");
                  return;
                }
                setSaving("hem");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/hem", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setHem(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The first note was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save hem
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Sketch</h2>
        {sketch == null ? (
          <p>Opening the second note.</p>
        ) : (
          <label className="field">
            <span>Second note</span>
            <textarea
              aria-label="Second note"
              value={sketch}
              onChange={(event) => setSketch(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save second note"
              disabled={saving === "sketch"}
              onClick={() => {
                const line = sketch.trim();
                if (!usableSketch(line)) {
                  setNote("Write the second note.");
                  return;
                }
                setSaving("sketch");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/sketch", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSketch(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The second note was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save sketch
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Day</h2>
        {day == null ? (
          <p>Opening the third note.</p>
        ) : (
          <label className="field">
            <span>Third note</span>
            <textarea
              aria-label="Third note"
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save third note"
              disabled={saving === "day"}
              onClick={() => {
                const line = day.trim();
                if (!usableDay(line)) {
                  setNote("Write the third note.");
                  return;
                }
                setSaving("day");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/day", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setDay(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The third note was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save day
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Notes</h2>
        {notes == null ? (
          <p>Opening the notes heading.</p>
        ) : (
          <label className="field">
            <span>Notes heading</span>
            <textarea
              aria-label="Notes heading"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save notes heading"
              disabled={saving === "notes"}
              onClick={() => {
                const line = notes.trim();
                if (!usableNotes(line)) {
                  setNote("Write the notes heading.");
                  return;
                }
                setSaving("notes");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/notes", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setNotes(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The notes heading was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save notes
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>List</h2>
        {list == null ? (
          <p>Opening the notes line.</p>
        ) : (
          <label className="field">
            <span>Notes line</span>
            <textarea
              aria-label="Notes line"
              value={list}
              onChange={(event) => setList(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save notes line"
              disabled={saving === "list"}
              onClick={() => {
                const line = list.trim();
                if (!usableList(line)) {
                  setNote("Write the notes line.");
                  return;
                }
                setSaving("list");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/list", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setList(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The notes line was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save list
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Footer</h2>
        {footer == null ? (
          <p>Opening the footer line.</p>
        ) : (
          <label className="field">
            <span>Footer line</span>
            <textarea
              aria-label="Footer line"
              value={footer}
              onChange={(event) => setFooter(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save footer line"
              disabled={saving === "footer"}
              onClick={() => {
                const line = footer.trim();
                if (!usableFooter(line)) {
                  setNote("Write the footer line.");
                  return;
                }
                setSaving("footer");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/footer", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFooter(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The footer line was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save footer
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Ways</h2>
        {ways == null ? (
          <p>Opening the collection heading.</p>
        ) : (
          <label className="field">
            <span>Collection heading</span>
            <textarea
              aria-label="Collection heading"
              value={ways}
              onChange={(event) => setWays(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save collection heading"
              disabled={saving === "ways"}
              onClick={() => {
                const line = ways.trim();
                if (!usableWays(line)) {
                  setNote("Write the collection heading.");
                  return;
                }
                setSaving("ways");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/ways", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setWays(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The collection heading was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save ways
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Pieces</h2>
        {pieces == null ? (
          <p>Opening the pieces heading.</p>
        ) : (
          <label className="field">
            <span>Pieces heading</span>
            <textarea
              aria-label="Pieces heading"
              value={pieces}
              onChange={(event) => setPieces(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save pieces heading"
              disabled={saving === "pieces"}
              onClick={() => {
                const line = pieces.trim();
                if (!usablePieces(line)) {
                  setNote("Write the pieces heading.");
                  return;
                }
                setSaving("pieces");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/pieces", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setPieces(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The pieces heading was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save pieces
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Follow</h2>
        {follow == null ? (
          <p>Opening the follow heading.</p>
        ) : (
          <label className="field">
            <span>Follow heading</span>
            <textarea
              aria-label="Follow heading"
              value={follow}
              onChange={(event) => setFollow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save follow heading"
              disabled={saving === "follow"}
              onClick={() => {
                const line = follow.trim();
                if (!usableFollow(line)) {
                  setNote("Write the follow heading.");
                  return;
                }
                setSaving("follow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/follow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFollow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The follow heading was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save follow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>City</h2>
        {city == null ? (
          <p>Opening the city line.</p>
        ) : (
          <label className="field">
            <span>City line</span>
            <textarea
              aria-label="City line"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save city line"
              disabled={saving === "city"}
              onClick={() => {
                const line = city.trim();
                if (!usableCity(line)) {
                  setNote("Write the city line.");
                  return;
                }
                setSaving("city");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/city", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setCity(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The city line was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save city
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Collect</h2>
        {collect == null ? (
          <p>Opening the collections eyebrow.</p>
        ) : (
          <label className="field">
            <span>Collections eyebrow</span>
            <textarea
              aria-label="Collections eyebrow"
              value={collect}
              onChange={(event) => setCollect(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save collections eyebrow"
              disabled={saving === "collect"}
              onClick={() => {
                const line = collect.trim();
                if (!usableCollect(line)) {
                  setNote("Write the collections eyebrow.");
                  return;
                }
                setSaving("collect");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/collect", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setCollect(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The collections eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save collect
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Commission</h2>
        {commission == null ? (
          <p>Opening the commission eyebrow.</p>
        ) : (
          <label className="field">
            <span>Commission eyebrow</span>
            <textarea
              aria-label="Commission eyebrow"
              value={commission}
              onChange={(event) => setCommission(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save commission eyebrow"
              disabled={saving === "commission"}
              onClick={() => {
                const line = commission.trim();
                if (!usableCommission(line)) {
                  setNote("Write the commission eyebrow.");
                  return;
                }
                setSaving("commission");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/commission", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setCommission(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The commission eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save commission
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Contact eyebrow</h2>
        {contactEyebrow == null ? (
          <p>Opening the Contact eyebrow.</p>
        ) : (
          <label className="field">
            <span>Contact page eyebrow</span>
            <textarea
              aria-label="Contact eyebrow"
              value={contactEyebrow}
              onChange={(event) => setContactEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Contact eyebrow"
              disabled={saving === "contacteyebrow"}
              onClick={() => {
                const line = contactEyebrow.trim();
                if (!usableContactEyebrow(line)) {
                  setNote("Write the Contact page eyebrow.");
                  return;
                }
                setSaving("contacteyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/contacteyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setContactEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Contact eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Contact eyebrow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Appointment eyebrow</h2>
        {appointmentEyebrow == null ? (
          <p>Opening the Appointment eyebrow.</p>
        ) : (
          <label className="field">
            <span>Appointment form eyebrow</span>
            <textarea
              aria-label="Appointment eyebrow"
              value={appointmentEyebrow}
              onChange={(event) => setAppointmentEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Appointment eyebrow"
              disabled={saving === "appointmenteyebrow"}
              onClick={() => {
                const line = appointmentEyebrow.trim();
                if (!usableAppointmentEyebrow(line)) {
                  setNote("Write the Appointment eyebrow.");
                  return;
                }
                setSaving("appointmenteyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/appointmenteyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setAppointmentEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Appointment eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Appointment eyebrow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Policy draft banner</h2>
        {policyBanner == null ? (
          <p>Opening the Policy draft banner.</p>
        ) : (
          <label className="field">
            <span>Policy page draft banner</span>
            <textarea
              aria-label="Policy draft banner"
              value={policyBanner}
              onChange={(event) => setPolicyBanner(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Policy draft banner"
              disabled={saving === "policybanner"}
              onClick={() => {
                const line = policyBanner.trim();
                if (!usablePolicyBanner(line)) {
                  setNote("Write the Policy draft banner.");
                  return;
                }
                setSaving("policybanner");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/policybanner", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setPolicyBanner(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Policy draft banner was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Policy draft banner
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>About page alt</h2>
        {aboutAlt == null ? (
          <p>Opening the About page alt.</p>
        ) : (
          <label className="field">
            <span>About page image alt text</span>
            <textarea
              aria-label="About page alt"
              value={aboutAlt}
              onChange={(event) => setAboutAlt(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save About page alt"
              disabled={saving === "aboutalt"}
              onClick={() => {
                const line = aboutAlt.trim();
                if (!usableAboutAlt(line)) {
                  setNote("Write the About page alt.");
                  return;
                }
                setSaving("aboutalt");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/aboutalt", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setAboutAlt(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The About page alt was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save About page alt
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Homepage story alt</h2>
        {storyAlt == null ? (
          <p>Opening the Homepage story alt.</p>
        ) : (
          <label className="field">
            <span>Homepage story image alt text</span>
            <textarea
              aria-label="Homepage story alt"
              value={storyAlt}
              onChange={(event) => setStoryAlt(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Homepage story alt"
              disabled={saving === "storyalt"}
              onClick={() => {
                const line = storyAlt.trim();
                if (!usableStoryAlt(line)) {
                  setNote("Write the Homepage story alt.");
                  return;
                }
                setSaving("storyalt");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/storyalt", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setStoryAlt(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Homepage story alt was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Homepage story alt
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Homepage hero alt</h2>
        {heroAlt == null ? (
          <p>Opening the Homepage hero alt.</p>
        ) : (
          <label className="field">
            <span>Homepage hero image alt text</span>
            <textarea
              aria-label="Homepage hero alt"
              value={heroAlt}
              onChange={(event) => setHeroAlt(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Homepage hero alt"
              disabled={saving === "heroalt"}
              onClick={() => {
                const line = heroAlt.trim();
                if (!usableHeroAlt(line)) {
                  setNote("Write the Homepage hero alt.");
                  return;
                }
                setSaving("heroalt");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/heroalt", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setHeroAlt(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Homepage hero alt was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Homepage hero alt
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Size guide draft banner</h2>
        {sizeGuideBanner == null ? (
          <p>Opening the Size guide draft banner.</p>
        ) : (
          <label className="field">
            <span>Size guide page draft banner</span>
            <textarea
              aria-label="Size guide draft banner"
              value={sizeGuideBanner}
              onChange={(event) => setSizeGuideBanner(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Size guide draft banner"
              disabled={saving === "sizeguidebanner"}
              onClick={() => {
                const line = sizeGuideBanner.trim();
                if (!usableSizeGuideBanner(line)) {
                  setNote("Write the Size guide draft banner.");
                  return;
                }
                setSaving("sizeguidebanner");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/sizeguidebanner", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSizeGuideBanner(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Size guide draft banner was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Size guide draft banner
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Appointment WhatsApp prefill</h2>
        {appointmentPrefill == null ? (
          <p>Opening the Appointment WhatsApp prefill.</p>
        ) : (
          <label className="field">
            <span>Contact page appointment WhatsApp prefill</span>
            <textarea
              aria-label="Appointment WhatsApp prefill"
              value={appointmentPrefill}
              onChange={(event) => setAppointmentPrefill(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Appointment WhatsApp prefill"
              disabled={saving === "appointmentprefill"}
              onClick={() => {
                const line = appointmentPrefill.trim();
                if (!usableAppointmentPrefill(line)) {
                  setNote("Write the Appointment WhatsApp prefill.");
                  return;
                }
                setSaving("appointmentprefill");
                setNote("");
                void staffFetch<{ line: string }>(
                  "/api/v1/admin/appointmentprefill",
                  {
                    method: "POST",
                    body: JSON.stringify({ line }),
                  },
                )
                  .then((body) => setAppointmentPrefill(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Appointment WhatsApp prefill was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Appointment WhatsApp prefill
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>WhatsApp prefill</h2>
        {whatsAppPrefill == null ? (
          <p>Opening the WhatsApp prefill.</p>
        ) : (
          <label className="field">
            <span>Homepage Chat with Us prefill</span>
            <textarea
              aria-label="WhatsApp prefill"
              value={whatsAppPrefill}
              onChange={(event) => setWhatsAppPrefill(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save WhatsApp prefill"
              disabled={saving === "whatsappprefill"}
              onClick={() => {
                const line = whatsAppPrefill.trim();
                if (!usableWhatsAppPrefill(line)) {
                  setNote("Write the WhatsApp prefill.");
                  return;
                }
                setSaving("whatsappprefill");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/whatsappprefill", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setWhatsAppPrefill(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The WhatsApp prefill was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save WhatsApp prefill
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Search submit button</h2>
        {searchSubmit == null ? (
          <p>Opening the Search submit button.</p>
        ) : (
          <label className="field">
            <span>Header search submit button text</span>
            <textarea
              aria-label="Search submit button"
              value={searchSubmit}
              onChange={(event) => setSearchSubmit(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Search submit button"
              disabled={saving === "searchsubmit"}
              onClick={() => {
                const line = searchSubmit.trim();
                if (!usableSearchSubmit(line)) {
                  setNote("Write the Search submit button.");
                  return;
                }
                setSaving("searchsubmit");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/searchsubmit", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSearchSubmit(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Search submit button was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Search submit button
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Order Now label</h2>
        {orderNow == null ? (
          <p>Opening the Order Now label.</p>
        ) : (
          <label className="field">
            <span>Floating WhatsApp control text</span>
            <textarea
              aria-label="Order Now label"
              value={orderNow}
              onChange={(event) => setOrderNow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Order Now label"
              disabled={saving === "ordernow"}
              onClick={() => {
                const line = orderNow.trim();
                if (!usableOrderNow(line)) {
                  setNote("Write the Order Now label.");
                  return;
                }
                setSaving("ordernow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/ordernow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setOrderNow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Order Now label was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Order Now label
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Order WhatsApp prefill</h2>
        {orderPrefill == null ? (
          <p>Opening the Order WhatsApp prefill.</p>
        ) : (
          <label className="field">
            <span>Floating WhatsApp control default prefill</span>
            <textarea
              aria-label="Order WhatsApp prefill"
              value={orderPrefill}
              onChange={(event) => setOrderPrefill(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Order WhatsApp prefill"
              disabled={saving === "orderprefill"}
              onClick={() => {
                const line = orderPrefill.trim();
                if (!usableOrderPrefill(line)) {
                  setNote("Write the Order WhatsApp prefill.");
                  return;
                }
                setSaving("orderprefill");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/orderprefill", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setOrderPrefill(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Order WhatsApp prefill was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Order WhatsApp prefill
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Bespoke WhatsApp prefill</h2>
        {bespokePrefill == null ? (
          <p>Opening the Bespoke WhatsApp prefill.</p>
        ) : (
          <label className="field">
            <span>Floating WhatsApp control bespoke prefill</span>
            <textarea
              aria-label="Bespoke WhatsApp prefill"
              value={bespokePrefill}
              onChange={(event) => setBespokePrefill(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Bespoke WhatsApp prefill"
              disabled={saving === "bespokeprefill"}
              onClick={() => {
                const line = bespokePrefill.trim();
                if (!usableBespokePrefill(line)) {
                  setNote("Write the Bespoke WhatsApp prefill.");
                  return;
                }
                setSaving("bespokeprefill");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/bespokeprefill", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setBespokePrefill(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Bespoke WhatsApp prefill was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Bespoke WhatsApp prefill
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Order help WhatsApp prefill</h2>
        {orderHelpPrefill == null ? (
          <p>Opening the Order help WhatsApp prefill.</p>
        ) : (
          <label className="field">
            <span>Floating WhatsApp control order help prefill</span>
            <textarea
              aria-label="Order help WhatsApp prefill"
              value={orderHelpPrefill}
              onChange={(event) => setOrderHelpPrefill(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Order help WhatsApp prefill"
              disabled={saving === "orderhelpprefill"}
              onClick={() => {
                const line = orderHelpPrefill.trim();
                if (!usableOrderHelpPrefill(line)) {
                  setNote("Write the Order help WhatsApp prefill.");
                  return;
                }
                setSaving("orderhelpprefill");
                setNote("");
                void staffFetch<{ line: string }>(
                  "/api/v1/admin/orderhelpprefill",
                  {
                    method: "POST",
                    body: JSON.stringify({ line }),
                  },
                )
                  .then((body) => setOrderHelpPrefill(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Order help WhatsApp prefill was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Order help WhatsApp prefill
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Product WhatsApp prefill</h2>
        {productPrefill == null ? (
          <p>Opening the Product WhatsApp prefill.</p>
        ) : (
          <label className="field">
            <span>
              Piece WhatsApp prefill. The piece name and link follow this line.
            </span>
            <textarea
              aria-label="Product WhatsApp prefill"
              value={productPrefill}
              onChange={(event) => setProductPrefill(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Product WhatsApp prefill"
              disabled={saving === "productprefill"}
              onClick={() => {
                const line = productPrefill.trim();
                if (!usableProductPrefill(line)) {
                  setNote("Write the Product WhatsApp prefill.");
                  return;
                }
                setSaving("productprefill");
                setNote("");
                void staffFetch<{ line: string }>(
                  "/api/v1/admin/productprefill",
                  {
                    method: "POST",
                    body: JSON.stringify({ line }),
                  },
                )
                  .then((body) => setProductPrefill(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Product WhatsApp prefill was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Product WhatsApp prefill
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Checkout WhatsApp prefill</h2>
        {checkoutPrefill == null ? (
          <p>Opening the Checkout WhatsApp prefill.</p>
        ) : (
          <label className="field">
            <span>
              Order receipt WhatsApp prefill. The order number follows this
              line.
            </span>
            <textarea
              aria-label="Checkout WhatsApp prefill"
              value={checkoutPrefill}
              onChange={(event) => setCheckoutPrefill(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Checkout WhatsApp prefill"
              disabled={saving === "checkoutprefill"}
              onClick={() => {
                const line = checkoutPrefill.trim();
                if (!usableCheckoutPrefill(line)) {
                  setNote("Write the Checkout WhatsApp prefill.");
                  return;
                }
                setSaving("checkoutprefill");
                setNote("");
                void staffFetch<{ line: string }>(
                  "/api/v1/admin/checkoutprefill",
                  {
                    method: "POST",
                    body: JSON.stringify({ line }),
                  },
                )
                  .then((body) => setCheckoutPrefill(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Checkout WhatsApp prefill was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Checkout WhatsApp prefill
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Bespoke send WhatsApp prefill</h2>
        {bespokeSendPrefill == null ? (
          <p>Opening the Bespoke send WhatsApp prefill.</p>
        ) : (
          <label className="field">
            <span>
              Bespoke success WhatsApp prefill. The request number and form
              details follow this line.
            </span>
            <textarea
              aria-label="Bespoke send WhatsApp prefill"
              value={bespokeSendPrefill}
              onChange={(event) => setBespokeSendPrefill(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Bespoke send WhatsApp prefill"
              disabled={saving === "bespokesendprefill"}
              onClick={() => {
                const line = bespokeSendPrefill.trim();
                if (!usableBespokeSendPrefill(line)) {
                  setNote("Write the Bespoke send WhatsApp prefill.");
                  return;
                }
                setSaving("bespokesendprefill");
                setNote("");
                void staffFetch<{ line: string }>(
                  "/api/v1/admin/bespokesendprefill",
                  {
                    method: "POST",
                    body: JSON.stringify({ line }),
                  },
                )
                  .then((body) => setBespokeSendPrefill(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Bespoke send WhatsApp prefill was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Bespoke send WhatsApp prefill
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Send on WhatsApp label</h2>
        {sendWhatsApp == null ? (
          <p>Opening the Send on WhatsApp label.</p>
        ) : (
          <label className="field">
            <span>Bespoke success WhatsApp link text</span>
            <textarea
              aria-label="Send on WhatsApp label"
              value={sendWhatsApp}
              onChange={(event) => setSendWhatsApp(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Send on WhatsApp label"
              disabled={saving === "sendwhatsapp"}
              onClick={() => {
                const line = sendWhatsApp.trim();
                if (!usableSendWhatsApp(line)) {
                  setNote("Write the Send on WhatsApp label.");
                  return;
                }
                setSaving("sendwhatsapp");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/sendwhatsapp", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSendWhatsApp(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Send on WhatsApp label was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Send on WhatsApp label
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Ask about this piece on WhatsApp label</h2>
        {askPiece == null ? (
          <p>Opening the Ask about this piece on WhatsApp label.</p>
        ) : (
          <label className="field">
            <span>Piece page WhatsApp link text</span>
            <textarea
              aria-label="Ask about this piece on WhatsApp label"
              value={askPiece}
              onChange={(event) => setAskPiece(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Ask about this piece on WhatsApp label"
              disabled={saving === "askpiece"}
              onClick={() => {
                const line = askPiece.trim();
                if (!usableAskPiece(line)) {
                  setNote("Write the Ask about this piece on WhatsApp label.");
                  return;
                }
                setSaving("askpiece");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/askpiece", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setAskPiece(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Ask about this piece on WhatsApp label was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Ask about this piece on WhatsApp label
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Tell the boutique on WhatsApp label</h2>
        {tellBoutique == null ? (
          <p>Opening the Tell the boutique on WhatsApp label.</p>
        ) : (
          <label className="field">
            <span>Order receipt WhatsApp link text</span>
            <textarea
              aria-label="Tell the boutique on WhatsApp label"
              value={tellBoutique}
              onChange={(event) => setTellBoutique(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Tell the boutique on WhatsApp label"
              disabled={saving === "tellboutique"}
              onClick={() => {
                const line = tellBoutique.trim();
                if (!usableTellBoutique(line)) {
                  setNote("Write the Tell the boutique on WhatsApp label.");
                  return;
                }
                setSaving("tellboutique");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/tellboutique", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setTellBoutique(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Tell the boutique on WhatsApp label was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Tell the boutique on WhatsApp label
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>WhatsApp the boutique label</h2>
        {waBoutique == null ? (
          <p>Opening the WhatsApp the boutique label.</p>
        ) : (
          <label className="field">
            <span>Contact page WhatsApp link text</span>
            <textarea
              aria-label="WhatsApp the boutique label"
              value={waBoutique}
              onChange={(event) => setWaBoutique(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save WhatsApp the boutique label"
              disabled={saving === "waboutique"}
              onClick={() => {
                const line = waBoutique.trim();
                if (!usableWaBoutique(line)) {
                  setNote("Write the WhatsApp the boutique label.");
                  return;
                }
                setSaving("waboutique");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/waboutique", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setWaBoutique(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The WhatsApp the boutique label was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save WhatsApp the boutique label
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Search pieces placeholder</h2>
        {searchPieces == null ? (
          <p>Opening the Search pieces placeholder.</p>
        ) : (
          <label className="field">
            <span>Header search input placeholder</span>
            <textarea
              aria-label="Search pieces placeholder"
              value={searchPieces}
              onChange={(event) => setSearchPieces(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Search pieces placeholder"
              disabled={saving === "searchpieces"}
              onClick={() => {
                const line = searchPieces.trim();
                if (!usableSearchPieces(line)) {
                  setNote("Write the Search pieces placeholder.");
                  return;
                }
                setSaving("searchpieces");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/searchpieces", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSearchPieces(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Search pieces placeholder was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Search pieces placeholder
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Search the house label</h2>
        {searchHouse == null ? (
          <p>Opening the Search the house label.</p>
        ) : (
          <label className="field">
            <span>Header search panel label</span>
            <textarea
              aria-label="Search the house label"
              value={searchHouse}
              onChange={(event) => setSearchHouse(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Search the house label"
              disabled={saving === "searchhouse"}
              onClick={() => {
                const line = searchHouse.trim();
                if (!usableSearchHouse(line)) {
                  setNote("Write the Search the house label.");
                  return;
                }
                setSaving("searchhouse");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/searchhouse", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSearchHouse(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Search the house label was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Search the house label
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Header Search icon label</h2>
        {searchIcon == null ? (
          <p>Opening the Header Search icon label.</p>
        ) : (
          <label className="field">
            <span>Header Search icon aria-label</span>
            <textarea
              aria-label="Header Search icon label"
              value={searchIcon}
              onChange={(event) => setSearchIcon(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Header Search icon label"
              disabled={saving === "searchicon"}
              onClick={() => {
                const line = searchIcon.trim();
                if (!usableSearchIcon(line)) {
                  setNote("Write the Header Search icon label.");
                  return;
                }
                setSaving("searchicon");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/searchicon", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSearchIcon(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Header Search icon label was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Header Search icon label
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Search eyebrow</h2>
        {searchEyebrow == null ? (
          <p>Opening the Search eyebrow.</p>
        ) : (
          <label className="field">
            <span>Search page eyebrow</span>
            <textarea
              aria-label="Search eyebrow"
              value={searchEyebrow}
              onChange={(event) => setSearchEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Search eyebrow"
              disabled={saving === "searcheyebrow"}
              onClick={() => {
                const line = searchEyebrow.trim();
                if (!usableSearchEyebrow(line)) {
                  setNote("Write the Search eyebrow.");
                  return;
                }
                setSaving("searcheyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/searcheyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSearchEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Search eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Search eyebrow
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Wishlist eyebrow</h2>
        {wishlistEyebrow == null ? (
          <p>Opening the Wishlist eyebrow.</p>
        ) : (
          <label className="field">
            <span>Wishlist page eyebrow</span>
            <textarea
              aria-label="Wishlist eyebrow"
              value={wishlistEyebrow}
              onChange={(event) => setWishlistEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Wishlist eyebrow"
              disabled={saving === "wishlisteyebrow"}
              onClick={() => {
                const line = wishlistEyebrow.trim();
                if (!usableWishlistEyebrow(line)) {
                  setNote("Write the Wishlist eyebrow.");
                  return;
                }
                setSaving("wishlisteyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/wishlisteyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setWishlistEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Wishlist eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Wishlist eyebrow
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Account eyebrow</h2>
        {accountEyebrow == null ? (
          <p>Opening the Account eyebrow.</p>
        ) : (
          <label className="field">
            <span>Account page eyebrow</span>
            <textarea
              aria-label="Account eyebrow"
              value={accountEyebrow}
              onChange={(event) => setAccountEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Account eyebrow"
              disabled={saving === "accounteyebrow"}
              onClick={() => {
                const line = accountEyebrow.trim();
                if (!usableAccountEyebrow(line)) {
                  setNote("Write the Account eyebrow.");
                  return;
                }
                setSaving("accounteyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/accounteyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setAccountEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Account eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Account eyebrow
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Summary eyebrow</h2>
        {summaryEyebrow == null ? (
          <p>Opening the Summary eyebrow.</p>
        ) : (
          <label className="field">
            <span>Cart summary eyebrow</span>
            <textarea
              aria-label="Summary eyebrow"
              value={summaryEyebrow}
              onChange={(event) => setSummaryEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Summary eyebrow"
              disabled={saving === "summaryeyebrow"}
              onClick={() => {
                const line = summaryEyebrow.trim();
                if (!usableSummaryEyebrow(line)) {
                  setNote("Write the Summary eyebrow.");
                  return;
                }
                setSaving("summaryeyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/summaryeyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSummaryEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Summary eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Summary eyebrow
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Bag eyebrow</h2>
        {bagEyebrow == null ? (
          <p>Opening the Bag eyebrow.</p>
        ) : (
          <label className="field">
            <span>Cart page eyebrow</span>
            <textarea
              aria-label="Bag eyebrow"
              value={bagEyebrow}
              onChange={(event) => setBagEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Bag eyebrow"
              disabled={saving === "bageyebrow"}
              onClick={() => {
                const line = bagEyebrow.trim();
                if (!usableBagEyebrow(line)) {
                  setNote("Write the Bag eyebrow.");
                  return;
                }
                setSaving("bageyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/bageyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setBagEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Bag eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Bag eyebrow
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Checkout eyebrow</h2>
        {checkoutEyebrow == null ? (
          <p>Opening the Checkout eyebrow.</p>
        ) : (
          <label className="field">
            <span>Checkout page eyebrow</span>
            <textarea
              aria-label="Checkout eyebrow"
              value={checkoutEyebrow}
              onChange={(event) => setCheckoutEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Checkout eyebrow"
              disabled={saving === "checkouteyebrow"}
              onClick={() => {
                const line = checkoutEyebrow.trim();
                if (!usableCheckoutEyebrow(line)) {
                  setNote("Write the Checkout eyebrow.");
                  return;
                }
                setSaving("checkouteyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/checkouteyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setCheckoutEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Checkout eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Checkout eyebrow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Confirmation eyebrow</h2>
        {confirmationEyebrow == null ? (
          <p>Opening the Confirmation eyebrow.</p>
        ) : (
          <label className="field">
            <span>Order confirmation page eyebrow</span>
            <textarea
              aria-label="Confirmation eyebrow"
              value={confirmationEyebrow}
              onChange={(event) => setConfirmationEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Confirmation eyebrow"
              disabled={saving === "confirmationeyebrow"}
              onClick={() => {
                const line = confirmationEyebrow.trim();
                if (!usableConfirmationEyebrow(line)) {
                  setNote("Write the Confirmation eyebrow.");
                  return;
                }
                setSaving("confirmationeyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/confirmationeyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setConfirmationEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Confirmation eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Confirmation eyebrow
            </button>
          </label>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>SKU label</h2>
        {skuLabel == null ? (
          <p>Opening the SKU label.</p>
        ) : (
          <label className="field">
            <span>Product SKU label</span>
            <textarea
              aria-label="SKU label"
              value={skuLabel}
              onChange={(event) => setSkuLabel(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save SKU label"
              disabled={saving === "skulabel"}
              onClick={() => {
                const line = skuLabel.trim();
                if (!usableSkuLabel(line)) {
                  setNote("Write the SKU label.");
                  return;
                }
                setSaving("skulabel");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/skulabel", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSkuLabel(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The SKU label was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save SKU label
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Maintenance page eyebrow</h2>
        {maintenanceEyebrow == null ? (
          <p>Opening the Maintenance page eyebrow.</p>
        ) : (
          <label className="field">
            <span>Maintenance page eyebrow</span>
            <textarea
              aria-label="Maintenance page eyebrow"
              value={maintenanceEyebrow}
              onChange={(event) => setMaintenanceEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Maintenance page eyebrow"
              disabled={saving === "maintenanceeyebrow"}
              onClick={() => {
                const line = maintenanceEyebrow.trim();
                if (!usableMaintenanceEyebrow(line)) {
                  setNote("Write the Maintenance page eyebrow.");
                  return;
                }
                setSaving("maintenanceeyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/maintenanceeyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setMaintenanceEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Maintenance page eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Maintenance page eyebrow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>404 page eyebrow</h2>
        {notFoundEyebrow == null ? (
          <p>Opening the 404 page eyebrow.</p>
        ) : (
          <label className="field">
            <span>Not found page eyebrow</span>
            <textarea
              aria-label="404 page eyebrow"
              value={notFoundEyebrow}
              onChange={(event) => setNotFoundEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save 404 page eyebrow"
              disabled={saving === "notfoundeyebrow"}
              onClick={() => {
                const line = notFoundEyebrow.trim();
                if (!usableNotFoundEyebrow(line)) {
                  setNote("Write the 404 page eyebrow.");
                  return;
                }
                setSaving("notfoundeyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/notfoundeyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setNotFoundEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The 404 page eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save 404 page eyebrow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Track page eyebrow</h2>
        {trackEyebrow == null ? (
          <p>Opening the Track page eyebrow.</p>
        ) : (
          <label className="field">
            <span>Track order page eyebrow</span>
            <textarea
              aria-label="Track page eyebrow"
              value={trackEyebrow}
              onChange={(event) => setTrackEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Track page eyebrow"
              disabled={saving === "trackeyebrow"}
              onClick={() => {
                const line = trackEyebrow.trim();
                if (!usableTrackEyebrow(line)) {
                  setNote("Write the Track page eyebrow.");
                  return;
                }
                setSaving("trackeyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/trackeyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setTrackEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Track page eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Track page eyebrow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Size guide eyebrow</h2>
        {sizeGuideEyebrow == null ? (
          <p>Opening the Size guide eyebrow.</p>
        ) : (
          <label className="field">
            <span>Size guide page eyebrow</span>
            <textarea
              aria-label="Size guide eyebrow"
              value={sizeGuideEyebrow}
              onChange={(event) => setSizeGuideEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Size guide eyebrow"
              disabled={saving === "sizeguideeyebrow"}
              onClick={() => {
                const line = sizeGuideEyebrow.trim();
                if (!usableSizeGuideEyebrow(line)) {
                  setNote("Write the Size guide eyebrow.");
                  return;
                }
                setSaving("sizeguideeyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/sizeguideeyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSizeGuideEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Size guide eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Size guide eyebrow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>FAQ eyebrow</h2>
        {faqEyebrow == null ? (
          <p>Opening the FAQ eyebrow.</p>
        ) : (
          <label className="field">
            <span>FAQ page eyebrow</span>
            <textarea
              aria-label="FAQ eyebrow"
              value={faqEyebrow}
              onChange={(event) => setFaqEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save FAQ eyebrow"
              disabled={saving === "faqeyebrow"}
              onClick={() => {
                const line = faqEyebrow.trim();
                if (!usableFaqEyebrow(line)) {
                  setNote("Write the FAQ eyebrow.");
                  return;
                }
                setSaving("faqeyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/faqeyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFaqEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The FAQ eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save FAQ eyebrow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Policy page eyebrow</h2>
        {policyEyebrow == null ? (
          <p>Opening the Policy page eyebrow.</p>
        ) : (
          <label className="field">
            <span>Policy page eyebrow</span>
            <textarea
              aria-label="Policy page eyebrow"
              value={policyEyebrow}
              onChange={(event) => setPolicyEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Policy page eyebrow"
              disabled={saving === "policyeyebrow"}
              onClick={() => {
                const line = policyEyebrow.trim();
                if (!usablePolicyEyebrow(line)) {
                  setNote("Write the Policy page eyebrow.");
                  return;
                }
                setSaving("policyeyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/policyeyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setPolicyEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Policy page eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Policy page eyebrow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Bespoke eyebrow</h2>
        {bespokeEyebrow == null ? (
          <p>Opening the Bespoke eyebrow.</p>
        ) : (
          <label className="field">
            <span>Bespoke page eyebrow</span>
            <textarea
              aria-label="Bespoke eyebrow"
              value={bespokeEyebrow}
              onChange={(event) => setBespokeEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Bespoke eyebrow"
              disabled={saving === "bespokeeyebrow"}
              onClick={() => {
                const line = bespokeEyebrow.trim();
                if (!usableBespokeEyebrow(line)) {
                  setNote("Write the Bespoke page eyebrow.");
                  return;
                }
                setSaving("bespokeeyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/bespokeeyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setBespokeEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Bespoke eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Bespoke eyebrow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Shop eyebrow</h2>
        {shopEyebrow == null ? (
          <p>Opening the Shop eyebrow.</p>
        ) : (
          <label className="field">
            <span>Shop page eyebrow</span>
            <textarea
              aria-label="Shop eyebrow"
              value={shopEyebrow}
              onChange={(event) => setShopEyebrow(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Shop eyebrow"
              disabled={saving === "shopeyebrow"}
              onClick={() => {
                const line = shopEyebrow.trim();
                if (!usableShopEyebrow(line)) {
                  setNote("Write the Shop page eyebrow.");
                  return;
                }
                setSaving("shopeyebrow");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/shopeyebrow", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setShopEyebrow(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Shop eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Shop eyebrow
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Sellers</h2>
        {sellers == null ? (
          <p>Opening the best sellers eyebrow.</p>
        ) : (
          <label className="field">
            <span>Best sellers eyebrow</span>
            <textarea
              aria-label="Best sellers eyebrow"
              value={sellers}
              onChange={(event) => setSellers(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save best sellers eyebrow"
              disabled={saving === "sellers"}
              onClick={() => {
                const line = sellers.trim();
                if (!usableSellers(line)) {
                  setNote("Write the best sellers eyebrow.");
                  return;
                }
                setSaving("sellers");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/sellers", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSellers(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The best sellers eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save sellers
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Debut</h2>
        {debut == null ? (
          <p>Opening the new arrival eyebrow.</p>
        ) : (
          <label className="field">
            <span>New arrival eyebrow</span>
            <textarea
              aria-label="New arrival eyebrow"
              value={debut}
              onChange={(event) => setDebut(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save new arrival eyebrow"
              disabled={saving === "debut"}
              onClick={() => {
                const line = debut.trim();
                if (!usableDebut(line)) {
                  setNote("Write the new arrival eyebrow.");
                  return;
                }
                setSaving("debut");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/debut", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setDebut(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The new arrival eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save debut
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Abode</h2>
        {abode == null ? (
          <p>Opening the house eyebrow.</p>
        ) : (
          <label className="field">
            <span>The house eyebrow</span>
            <textarea
              aria-label="The house eyebrow"
              value={abode}
              onChange={(event) => setAbode(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save the house eyebrow"
              disabled={saving === "abode"}
              onClick={() => {
                const line = abode.trim();
                if (!usableAbode(line)) {
                  setNote("Write the house eyebrow.");
                  return;
                }
                setSaving("abode");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/abode", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setAbode(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The house eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save abode
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Why</h2>
        {why == null ? (
          <p>Opening the why PERIS eyebrow.</p>
        ) : (
          <label className="field">
            <span>Why PERIS eyebrow</span>
            <textarea
              aria-label="Why PERIS eyebrow"
              value={why}
              onChange={(event) => setWhy(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save why PERIS eyebrow"
              disabled={saving === "why"}
              onClick={() => {
                const line = why.trim();
                if (!usableWhy(line)) {
                  setNote("Write the why PERIS eyebrow.");
                  return;
                }
                setSaving("why");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/why", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setWhy(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The why PERIS eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save why
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Social</h2>
        {social == null ? (
          <p>Opening the Instagram eyebrow.</p>
        ) : (
          <label className="field">
            <span>Instagram eyebrow</span>
            <textarea
              aria-label="Instagram eyebrow"
              value={social}
              onChange={(event) => setSocial(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Instagram eyebrow"
              disabled={saving === "social"}
              onClick={() => {
                const line = social.trim();
                if (!usableSocial(line)) {
                  setNote("Write the Instagram eyebrow.");
                  return;
                }
                setSaving("social");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/social", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSocial(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Instagram eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save social
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Testimonials</h2>
        {testimonials == null ? (
          <p>Opening the Testimonials eyebrow.</p>
        ) : (
          <label className="field">
            <span>Testimonials eyebrow</span>
            <textarea
              aria-label="Testimonials eyebrow"
              value={testimonials}
              onChange={(event) => setTestimonials(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Testimonials eyebrow"
              disabled={saving === "testimonials"}
              onClick={() => {
                const line = testimonials.trim();
                if (!usableTestimonials(line)) {
                  setNote("Write the Testimonials eyebrow.");
                  return;
                }
                setSaving("testimonials");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/testimonials", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setTestimonials(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Testimonials eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save testimonials
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Correspondence</h2>
        {correspondence == null ? (
          <p>Opening the Correspondence eyebrow.</p>
        ) : (
          <label className="field">
            <span>Correspondence eyebrow</span>
            <textarea
              aria-label="Correspondence eyebrow"
              value={correspondence}
              onChange={(event) => setCorrespondence(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Correspondence eyebrow"
              disabled={saving === "correspondence"}
              onClick={() => {
                const line = correspondence.trim();
                if (!usableCorrespondence(line)) {
                  setNote("Write the Correspondence eyebrow.");
                  return;
                }
                setSaving("correspondence");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/correspondence", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setCorrespondence(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Correspondence eyebrow was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save correspondence
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Sample review note</h2>
        {reviewNote == null ? (
          <p>Opening the sample review note.</p>
        ) : (
          <label className="field">
            <span>Sample review note</span>
            <textarea
              aria-label="Sample review note"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save sample review note"
              disabled={saving === "reviewnote"}
              onClick={() => {
                const line = reviewNote.trim();
                if (!usableReviewNote(line)) {
                  setNote("Write the sample review note.");
                  return;
                }
                setSaving("reviewnote");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/reviewnote", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setReviewNote(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The sample review note was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save review note
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Open Instagram link</h2>
        {instagramLink == null ? (
          <p>Opening the Open Instagram link text.</p>
        ) : (
          <label className="field">
            <span>Open Instagram link text</span>
            <textarea
              aria-label="Open Instagram link text"
              value={instagramLink}
              onChange={(event) => setInstagramLink(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Open Instagram link text"
              disabled={saving === "instagramlink"}
              onClick={() => {
                const line = instagramLink.trim();
                if (!usableInstagramLink(line)) {
                  setNote("Write the Open Instagram link text.");
                  return;
                }
                setSaving("instagramlink");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/instagramlink", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setInstagramLink(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Open Instagram link text was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Instagram link
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Testimonials heading</h2>
        {fittingRoom == null ? (
          <p>Opening the testimonials heading.</p>
        ) : (
          <label className="field">
            <span>Testimonials heading text</span>
            <textarea
              aria-label="Testimonials heading"
              value={fittingRoom}
              onChange={(event) => setFittingRoom(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Testimonials heading"
              disabled={saving === "fittingroom"}
              onClick={() => {
                const line = fittingRoom.trim();
                if (!usableFittingRoom(line)) {
                  setNote("Write the fitting room heading.");
                  return;
                }
                setSaving("fittingroom");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/fittingroom", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFittingRoom(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The testimonials heading was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save testimonials heading
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Explore Our Collections button</h2>
        {exploreCta == null ? (
          <p>Opening the Explore Our Collections button text.</p>
        ) : (
          <label className="field">
            <span>Explore Our Collections button text</span>
            <textarea
              aria-label="Explore Our Collections button"
              value={exploreCta}
              onChange={(event) => setExploreCta(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Explore Our Collections button"
              disabled={saving === "explorecta"}
              onClick={() => {
                const line = exploreCta.trim();
                if (!usableExploreCta(line)) {
                  setNote("Write the Explore Our Collections button text.");
                  return;
                }
                setSaving("explorecta");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/explorecta", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setExploreCta(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Explore Our Collections button text was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Explore Our Collections button
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Chat with Us button</h2>
        {chatCta == null ? (
          <p>Opening the Chat with Us button text.</p>
        ) : (
          <label className="field">
            <span>Chat with Us button text</span>
            <textarea
              aria-label="Chat with Us button"
              value={chatCta}
              onChange={(event) => setChatCta(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Chat with Us button"
              disabled={saving === "chatcta"}
              onClick={() => {
                const line = chatCta.trim();
                if (!usableChatCta(line)) {
                  setNote("Write the Chat with Us on WhatsApp button text.");
                  return;
                }
                setSaving("chatcta");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/chatcta", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setChatCta(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Chat with Us button text was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Chat with Us button
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Begin a commission link</h2>
        {beginCta == null ? (
          <p>Opening the Begin a commission link text.</p>
        ) : (
          <label className="field">
            <span>Begin a commission link text</span>
            <textarea
              aria-label="Begin a commission link"
              value={beginCta}
              onChange={(event) => setBeginCta(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Begin a commission link"
              disabled={saving === "begincta"}
              onClick={() => {
                const line = beginCta.trim();
                if (!usableBeginCta(line)) {
                  setNote("Write the Begin a commission link text.");
                  return;
                }
                setSaving("begincta");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/begincta", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setBeginCta(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Begin a commission link text was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Begin a commission link
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>View the piece link</h2>
        {viewPiece == null ? (
          <p>Opening the View the piece link text.</p>
        ) : (
          <label className="field">
            <span>View the piece link text</span>
            <textarea
              aria-label="View the piece link"
              value={viewPiece}
              onChange={(event) => setViewPiece(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save View the piece link"
              disabled={saving === "viewpiece"}
              onClick={() => {
                const line = viewPiece.trim();
                if (!usableViewPiece(line)) {
                  setNote("Write the View the piece link text.");
                  return;
                }
                setSaving("viewpiece");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/viewpiece", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setViewPiece(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The View the piece link text was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save View the piece link
            </button>
          </label>
        )}
      </section>
      {(
        [
          ["Why reason 01 number", reasonIndex1, setReasonIndex1, "reasonidx1"],
          ["Why reason 02 number", reasonIndex2, setReasonIndex2, "reasonidx2"],
          ["Why reason 03 number", reasonIndex3, setReasonIndex3, "reasonidx3"],
        ] as const
      ).map(([label, value, setValue, key]) => (
        <section key={key} style={{ marginTop: 28 }}>
          <h2>{label}</h2>
          {value == null ? (
            <p>Opening the {label}.</p>
          ) : (
            <label className="field">
              <span>{label} text</span>
              <textarea
                aria-label={label}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-line"
                aria-label={`Save ${label}`}
                disabled={saving === key}
                onClick={() => {
                  const line = value.trim();
                  if (!usableReasonIndex(line)) {
                    setNote(`Write the ${label}.`);
                    return;
                  }
                  setSaving(key);
                  setNote("");
                  void staffFetch<{ line: string }>(`/api/v1/admin/${key}`, {
                    method: "POST",
                    body: JSON.stringify({ line }),
                  })
                    .then((body) => setValue(body.line))
                    .catch((error: unknown) =>
                      setNote(
                        error instanceof Error
                          ? error.message
                          : `The ${label} was not saved.`,
                      ),
                    )
                    .finally(() => setSaving(""));
                }}
              >
                Save {label}
              </button>
            </label>
          )}
        </section>
      ))}
      <section style={{ marginTop: 28 }}>
        <h2>Footer boutique heading</h2>
        {footerBoutique == null ? (
          <p>Opening the Footer boutique heading.</p>
        ) : (
          <label className="field">
            <span>Footer boutique heading text</span>
            <textarea
              aria-label="Footer boutique heading"
              value={footerBoutique}
              onChange={(event) => setFooterBoutique(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Footer boutique heading"
              disabled={saving === "footboutique"}
              onClick={() => {
                const line = footerBoutique.trim();
                if (!usableFooterBoutique(line)) {
                  setNote("Write the Footer boutique heading.");
                  return;
                }
                setSaving("footboutique");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/footboutique", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFooterBoutique(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Footer boutique heading was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Footer boutique heading
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Footer customer support heading</h2>
        {footerSupport == null ? (
          <p>Opening the Footer customer support heading.</p>
        ) : (
          <label className="field">
            <span>Footer customer support heading text</span>
            <textarea
              aria-label="Footer customer support heading"
              value={footerSupport}
              onChange={(event) => setFooterSupport(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Footer customer support heading"
              disabled={saving === "footsupport"}
              onClick={() => {
                const line = footerSupport.trim();
                if (!usableFooterSupport(line)) {
                  setNote("Write the Footer customer support heading.");
                  return;
                }
                setSaving("footsupport");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/footsupport", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFooterSupport(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Footer customer support heading was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Footer customer support heading
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Footer quick links heading</h2>
        {footerQuickLinks == null ? (
          <p>Opening the Footer quick links heading.</p>
        ) : (
          <label className="field">
            <span>Footer quick links heading text</span>
            <textarea
              aria-label="Footer quick links heading"
              value={footerQuickLinks}
              onChange={(event) => setFooterQuickLinks(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Footer quick links heading"
              disabled={saving === "footquick"}
              onClick={() => {
                const line = footerQuickLinks.trim();
                if (!usableFooterQuickLinks(line)) {
                  setNote("Write the Footer quick links heading.");
                  return;
                }
                setSaving("footquick");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/footquick", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFooterQuickLinks(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Footer quick links heading was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Footer quick links heading
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Footer email error</h2>
        {footerError == null ? (
          <p>Opening the Footer email error.</p>
        ) : (
          <label className="field">
            <span>Footer email error text</span>
            <textarea
              aria-label="Footer email error"
              value={footerError}
              onChange={(event) => setFooterError(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Footer email error"
              disabled={saving === "footerr"}
              onClick={() => {
                const line = footerError.trim();
                if (!usableFooterError(line)) {
                  setNote("Write the Footer email error.");
                  return;
                }
                setSaving("footerr");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/footerr", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFooterError(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Footer email error was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Footer email error
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Footer list message</h2>
        {footerListMessage == null ? (
          <p>Opening the Footer list message.</p>
        ) : (
          <label className="field">
            <span>Footer list message text</span>
            <textarea
              aria-label="Footer list message"
              value={footerListMessage}
              onChange={(event) => setFooterListMessage(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Footer list message"
              disabled={saving === "footlist"}
              onClick={() => {
                const line = footerListMessage.trim();
                if (!usableFooterListMessage(line)) {
                  setNote("Write the Footer list message.");
                  return;
                }
                setSaving("footlist");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/footlist", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFooterListMessage(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Footer list message was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Footer list message
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Footer subscribe button</h2>
        {footerSubscribe == null ? (
          <p>Opening the Footer subscribe button text.</p>
        ) : (
          <label className="field">
            <span>Footer subscribe button text</span>
            <textarea
              aria-label="Footer subscribe button"
              value={footerSubscribe}
              onChange={(event) => setFooterSubscribe(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Footer subscribe button"
              disabled={saving === "footsub"}
              onClick={() => {
                const line = footerSubscribe.trim();
                if (!usableFooterSubscribe(line)) {
                  setNote("Write the Footer subscribe button.");
                  return;
                }
                setSaving("footsub");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/footsub", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFooterSubscribe(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Footer subscribe button was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Footer subscribe button
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Footer email placeholder</h2>
        {footerEmail == null ? (
          <p>Opening the Footer email placeholder.</p>
        ) : (
          <label className="field">
            <span>Footer email placeholder text</span>
            <textarea
              aria-label="Footer email placeholder"
              value={footerEmail}
              onChange={(event) => setFooterEmail(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Footer email placeholder"
              disabled={saving === "footemail"}
              onClick={() => {
                const line = footerEmail.trim();
                if (!usableFooterEmail(line)) {
                  setNote("Write the Footer email placeholder.");
                  return;
                }
                setSaving("footemail");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/footemail", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFooterEmail(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Footer email placeholder was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Footer email placeholder
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Footer newsletter heading</h2>
        {footerNewsletter == null ? (
          <p>Opening the Footer newsletter heading.</p>
        ) : (
          <label className="field">
            <span>Footer newsletter heading text</span>
            <textarea
              aria-label="Footer newsletter heading"
              value={footerNewsletter}
              onChange={(event) => setFooterNewsletter(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Footer newsletter heading"
              disabled={saving === "footnews"}
              onClick={() => {
                const line = footerNewsletter.trim();
                if (!usableFooterNewsletter(line)) {
                  setNote("Write the Footer newsletter heading.");
                  return;
                }
                setSaving("footnews");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/footnews", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setFooterNewsletter(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Footer newsletter heading was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Footer newsletter heading
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Newsletter email error</h2>
        {emailError == null ? (
          <p>Opening the Newsletter email error.</p>
        ) : (
          <label className="field">
            <span>Newsletter email error text</span>
            <textarea
              aria-label="Newsletter email error"
              value={emailError}
              onChange={(event) => setEmailError(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Newsletter email error"
              disabled={saving === "emailerr"}
              onClick={() => {
                const line = emailError.trim();
                if (!usableEmailError(line)) {
                  setNote("Write the Newsletter email error.");
                  return;
                }
                setSaving("emailerr");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/emailerr", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setEmailError(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Newsletter email error was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Newsletter email error
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Newsletter list message</h2>
        {listMessage == null ? (
          <p>Opening the Newsletter list message.</p>
        ) : (
          <label className="field">
            <span>Newsletter list message text</span>
            <textarea
              aria-label="Newsletter list message"
              value={listMessage}
              onChange={(event) => setListMessage(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Newsletter list message"
              disabled={saving === "listmsg"}
              onClick={() => {
                const line = listMessage.trim();
                if (!usableListMessage(line)) {
                  setNote("Write the Newsletter list message.");
                  return;
                }
                setSaving("listmsg");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/listmsg", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setListMessage(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Newsletter list message was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Newsletter list message
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Newsletter subscribe button</h2>
        {subscribeButton == null ? (
          <p>Opening the Newsletter subscribe button text.</p>
        ) : (
          <label className="field">
            <span>Newsletter subscribe button text</span>
            <textarea
              aria-label="Newsletter subscribe button"
              value={subscribeButton}
              onChange={(event) => setSubscribeButton(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Newsletter subscribe button"
              disabled={saving === "subscribebtn"}
              onClick={() => {
                const line = subscribeButton.trim();
                if (!usableSubscribeButton(line)) {
                  setNote("Write the Newsletter subscribe button.");
                  return;
                }
                setSaving("subscribebtn");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/subscribebtn", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setSubscribeButton(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Newsletter subscribe button was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Newsletter subscribe button
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Newsletter email label</h2>
        {emailLabel == null ? (
          <p>Opening the Newsletter email label.</p>
        ) : (
          <label className="field">
            <span>Newsletter email label text</span>
            <textarea
              aria-label="Newsletter email label"
              value={emailLabel}
              onChange={(event) => setEmailLabel(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Newsletter email label"
              disabled={saving === "emaillabel"}
              onClick={() => {
                const line = emailLabel.trim();
                if (!usableEmailLabel(line)) {
                  setNote("Write the Newsletter email label.");
                  return;
                }
                setSaving("emaillabel");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/emaillabel", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setEmailLabel(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Newsletter email label was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Newsletter email label
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>Read the story link</h2>
        {readStory == null ? (
          <p>Opening the Read the story link text.</p>
        ) : (
          <label className="field">
            <span>Read the story link text</span>
            <textarea
              aria-label="Read the story link"
              value={readStory}
              onChange={(event) => setReadStory(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save Read the story link"
              disabled={saving === "readstory"}
              onClick={() => {
                const line = readStory.trim();
                if (!usableReadStory(line)) {
                  setNote("Write the Read the story link text.");
                  return;
                }
                setSaving("readstory");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/readstory", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setReadStory(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The Read the story link text was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save Read the story link
            </button>
          </label>
        )}
      </section>
      <section style={{ marginTop: 28 }}>
        <h2>View the edit link</h2>
        {viewEdit == null ? (
          <p>Opening the View the edit link text.</p>
        ) : (
          <label className="field">
            <span>View the edit link text</span>
            <textarea
              aria-label="View the edit link"
              value={viewEdit}
              onChange={(event) => setViewEdit(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-line"
              aria-label="Save View the edit link"
              disabled={saving === "viewedit"}
              onClick={() => {
                const line = viewEdit.trim();
                if (!usableViewEdit(line)) {
                  setNote("Write the View the edit link text.");
                  return;
                }
                setSaving("viewedit");
                setNote("");
                void staffFetch<{ line: string }>("/api/v1/admin/viewedit", {
                  method: "POST",
                  body: JSON.stringify({ line }),
                })
                  .then((body) => setViewEdit(body.line))
                  .catch((error: unknown) =>
                    setNote(
                      error instanceof Error
                        ? error.message
                        : "The View the edit link text was not saved.",
                    ),
                  )
                  .finally(() => setSaving(""));
              }}
            >
              Save View the edit link
            </button>
          </label>
        )}
      </section>
    </AdminChrome>
  );
}
