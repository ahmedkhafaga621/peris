import cors from "cors";
import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createAddress, deleteAddress, listAddresses } from "./addresses.js";
import {
  acceptBespoke,
  bespokeOptions,
  convertBespoke,
  createBespoke,
  declineBespoke,
  listAccountBespoke,
  quoteBespoke,
  reviewBespoke,
  staffBespoke,
} from "./bespoke.js";
import { listWishlist, replaceWishlist } from "./wishlist.js";
import {
  createMeasurement,
  deleteMeasurement,
  listMeasurements,
} from "./measurements.js";
import {
  cartBodySchema,
  HttpError,
  mergeCart,
  readCart,
  replaceCart,
} from "./cart.js";
import {
  listAccountOrders,
  placeCheckout,
  placeOrderSchema,
  quoteCheckout,
  trackOrder,
} from "./checkout.js";
import { createStaffUpload, uploadsStaticRoot } from "./uploads.js";
import {
  requestAppointment,
  staffAppointments,
  updateStaffAppointment,
} from "./appointments.js";
import {
  sendContactMessage,
  staffMessages,
  updateStaffMessage,
} from "./messages.js";
import { prisma } from "./db.js";
import {
  publicStorefrontSettings,
  readAdminSettings,
  writeAdminSettings,
} from "./settings.js";
import { staffNewsletter, subscribeNewsletter } from "./newsletter.js";
import {
  leaveReview,
  publishedReviews,
  staffReviews,
  updateStaffReview,
} from "./reviews.js";
import {
  issueSession,
  readAccess,
  requireCustomer,
  revokeSession,
  rotateSession,
} from "./session.js";
import {
  addCustomerNote,
  adjustStock,
  advanceFulfillment,
  cancelOrder,
  exportOrders,
  logoutStaff,
  recordCollection,
  refreshStaff,
  refundOrder,
  setCustomerStatus,
  staffAnnouncements,
  staffAudit,
  staffCategories,
  staffCustomer,
  staffCustomers,
  staffDashboard,
  staffInventory,
  staffLogin,
  staffOrderSheet,
  staffOrders,
  staffProducts,
  createStaffProduct,
  createStaffLength,
  createStaffSize,
  createStaffColor,
  createStaffFabric,
  createStaffCategory,
  updateStaffProductImage,
  createStaffProductImage,
  deleteStaffProductImage,
  addStaffProductColor,
  stockHistory,
  updateStaffAnnouncement,
  updateStaffAnnouncementLine,
  updateStaffArrival,
  updateStaffBestseller,
  updateStaffCategory,
  updateStaffCategoryName,
  updateStaffCategoryLine,
  updateStaffCollection,
  updateStaffCompare,
  updateStaffDescription,
  updateStaffFabric,
  updateStaffAlt,
  updateStaffPlace,
  updateStaffName,
  updateStaffStyleCode,
  updateStaffProduct,
  staffLengths,
  updateStaffLength,
  publicLengths,
  staffSizes,
  updateStaffSize,
  publicSizes,
  staffColors,
  updateStaffColor,
  publicColors,
  staffFabrics,
  updateStaffFabricList,
  publicFabrics,
  staffShipping,
  updateStaffShipping,
  publicPage,
  staffPages,
  updateStaffPage,
  updateStaffPageTitle,
  updateStaffPageLine,
  publicMaintenance,
  staffMaintenance,
  updateStaffMaintenance,
  publicHours,
  staffHours,
  updateStaffHours,
  publicAddress,
  staffAddress,
  updateStaffAddress,
  publicPhone,
  staffPhone,
  updateStaffPhone,
  publicInstagram,
  staffInstagram,
  updateStaffInstagram,
  publicFacebook,
  staffFacebook,
  updateStaffFacebook,
  publicMaps,
  staffMaps,
  updateStaffMaps,
  publicParent,
  staffParent,
  updateStaffParent,
  publicStory,
  staffStory,
  updateStaffStory,
  publicWelcome,
  staffWelcome,
  updateStaffWelcome,
  publicHero,
  staffHero,
  updateStaffHero,
  publicIntro,
  staffIntro,
  updateStaffIntro,
  publicHeading,
  staffHeading,
  updateStaffHeading,
  publicFitting,
  staffFitting,
  updateStaffFitting,
  publicTailoring,
  staffTailoring,
  updateStaffTailoring,
  publicPrecision,
  staffPrecision,
  updateStaffPrecision,
  publicPremium,
  staffPremium,
  updateStaffPremium,
  publicHandpick,
  staffHandpick,
  updateStaffHandpick,
  publicCraftsmanship,
  staffCraftsmanship,
  updateStaffCraftsmanship,
  publicDetail,
  staffDetail,
  updateStaffDetail,
  publicSample,
  staffSample,
  updateStaffSample,
  publicHem,
  staffHem,
  updateStaffHem,
  publicSketch,
  staffSketch,
  updateStaffSketch,
  publicDay,
  staffDay,
  updateStaffDay,
  publicNotes,
  staffNotes,
  updateStaffNotes,
  publicList,
  staffList,
  updateStaffList,
  publicFooter,
  staffFooter,
  updateStaffFooter,
  publicWays,
  staffWays,
  updateStaffWays,
  publicPieces,
  staffPieces,
  updateStaffPieces,
  publicFollow,
  staffFollow,
  updateStaffFollow,
  publicCity,
  staffCity,
  updateStaffCity,
  publicCollect,
  staffCollect,
  updateStaffCollect,
  publicCommission,
  staffCommission,
  updateStaffCommission,
  publicContactEyebrow,
  staffContactEyebrow,
  updateStaffContactEyebrow,
  publicShopEyebrow,
  staffShopEyebrow,
  updateStaffShopEyebrow,
  publicAppointmentEyebrow,
  staffAppointmentEyebrow,
  updateStaffAppointmentEyebrow,
  publicBespokeEyebrow,
  staffBespokeEyebrow,
  updateStaffBespokeEyebrow,
  publicPolicyEyebrow,
  staffPolicyEyebrow,
  updateStaffPolicyEyebrow,
  publicFaqEyebrow,
  staffFaqEyebrow,
  updateStaffFaqEyebrow,
  publicSizeGuideEyebrow,
  staffSizeGuideEyebrow,
  updateStaffSizeGuideEyebrow,
  publicTrackEyebrow,
  staffTrackEyebrow,
  updateStaffTrackEyebrow,
  publicNotFoundEyebrow,
  staffNotFoundEyebrow,
  updateStaffNotFoundEyebrow,
  publicMaintenanceEyebrow,
  staffMaintenanceEyebrow,
  updateStaffMaintenanceEyebrow,
  publicSkuLabel,
  staffSkuLabel,
  updateStaffSkuLabel,
  publicCheckoutEyebrow,
  staffCheckoutEyebrow,
  updateStaffCheckoutEyebrow,
  publicConfirmationEyebrow,
  staffConfirmationEyebrow,
  updateStaffConfirmationEyebrow,
  publicBagEyebrow,
  staffBagEyebrow,
  updateStaffBagEyebrow,
  publicSummaryEyebrow,
  staffSummaryEyebrow,
  updateStaffSummaryEyebrow,
  publicAccountEyebrow,
  staffAccountEyebrow,
  updateStaffAccountEyebrow,
  publicWishlistEyebrow,
  staffWishlistEyebrow,
  updateStaffWishlistEyebrow,
  publicSearchEyebrow,
  staffSearchEyebrow,
  updateStaffSearchEyebrow,
  publicSearchIcon,
  staffSearchIcon,
  updateStaffSearchIcon,
  publicSearchHouse,
  staffSearchHouse,
  updateStaffSearchHouse,
  publicSearchPieces,
  staffSearchPieces,
  updateStaffSearchPieces,
  publicSearchSubmit,
  staffSearchSubmit,
  updateStaffSearchSubmit,
  publicOrderNow,
  staffOrderNow,
  updateStaffOrderNow,
  publicOrderPrefill,
  staffOrderPrefill,
  updateStaffOrderPrefill,
  publicBespokePrefill,
  staffBespokePrefill,
  updateStaffBespokePrefill,
  publicOrderHelpPrefill,
  staffOrderHelpPrefill,
  updateStaffOrderHelpPrefill,
  publicProductPrefill,
  staffProductPrefill,
  updateStaffProductPrefill,
  publicCheckoutPrefill,
  staffCheckoutPrefill,
  updateStaffCheckoutPrefill,
  publicBespokeSendPrefill,
  staffBespokeSendPrefill,
  updateStaffBespokeSendPrefill,
  publicSendWhatsApp,
  staffSendWhatsApp,
  updateStaffSendWhatsApp,
  publicAskPiece,
  staffAskPiece,
  updateStaffAskPiece,
  publicTellBoutique,
  staffTellBoutique,
  updateStaffTellBoutique,
  publicWaBoutique,
  staffWaBoutique,
  updateStaffWaBoutique,
  publicWhatsAppPrefill,
  staffWhatsAppPrefill,
  updateStaffWhatsAppPrefill,
  publicAppointmentPrefill,
  staffAppointmentPrefill,
  updateStaffAppointmentPrefill,
  publicSizeGuideBanner,
  staffSizeGuideBanner,
  updateStaffSizeGuideBanner,
  publicHeroAlt,
  staffHeroAlt,
  updateStaffHeroAlt,
  publicStoryAlt,
  staffStoryAlt,
  updateStaffStoryAlt,
  publicAboutAlt,
  staffAboutAlt,
  updateStaffAboutAlt,
  publicPolicyBanner,
  staffPolicyBanner,
  updateStaffPolicyBanner,
  publicSellers,
  staffSellers,
  updateStaffSellers,
  publicDebut,
  staffDebut,
  updateStaffDebut,
  publicAbode,
  staffAbode,
  updateStaffAbode,
  publicWhy,
  staffWhy,
  updateStaffWhy,
  publicSocial,
  staffSocial,
  updateStaffSocial,
  publicTestimonials,
  staffTestimonials,
  updateStaffTestimonials,
  publicCorrespondence,
  staffCorrespondence,
  updateStaffCorrespondence,
  publicReviewNote,
  staffReviewNote,
  updateStaffReviewNote,
  publicInstagramLink,
  staffInstagramLink,
  updateStaffInstagramLink,
  publicFittingRoom,
  staffFittingRoom,
  updateStaffFittingRoom,
  publicExploreCta,
  staffExploreCta,
  updateStaffExploreCta,
  publicChatCta,
  staffChatCta,
  updateStaffChatCta,
  publicBeginCta,
  publicViewEdit,
  staffViewEdit,
  updateStaffViewEdit,
  publicViewPiece,
  staffViewPiece,
  updateStaffViewPiece,
  publicReadStory,
  staffReadStory,
  updateStaffReadStory,
  publicEmailLabel,
  staffEmailLabel,
  updateStaffEmailLabel,
  publicSubscribeButton,
  staffSubscribeButton,
  updateStaffSubscribeButton,
  publicListMessage,
  staffListMessage,
  updateStaffListMessage,
  publicEmailError,
  staffEmailError,
  updateStaffEmailError,
  publicNewsHeading,
  staffNewsHeading,
  updateStaffNewsHeading,
  publicFootEmail,
  staffFootEmail,
  updateStaffFootEmail,
  publicFootSub,
  staffFootSub,
  updateStaffFootSub,
  publicFootList,
  staffFootList,
  updateStaffFootList,
  publicFootError,
  staffFootError,
  updateStaffFootError,
  publicFootQuick,
  staffFootQuick,
  updateStaffFootQuick,
  publicFootSupport,
  staffFootSupport,
  updateStaffFootSupport,
  publicFootBoutique,
  staffFootBoutique,
  updateStaffFootBoutique,
  publicReasonIndex,
  staffReasonIndex,
  updateStaffReasonIndex,
  staffBeginCta,
  updateStaffBeginCta,
  houseClosed,
} from "./staff.js";

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function createApp() {
  const app = express();
  const origin = process.env.APP_ORIGIN ?? "http://localhost:5173";
  app.use(cors({ origin, credentials: true }));

  app.post(
    "/api/v1/payments/ziina/webhook",
    express.raw({ type: "application/json" }),
    async (req, res, next) => {
      try {
        const { handleZiinaWebhook } = await import("./payments/index.js");
        await handleZiinaWebhook(req, res);
      } catch (error) {
        next(error);
      }
    },
  );

  app.use(express.json({ limit: "8mb" }));
  app.use("/api/v1/files", express.static(uploadsStaticRoot()));

  app.get("/api/v1/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/v1/products", async (_req, res, next) => {
    try {
      res.json({ products: await listProducts() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/reviews", async (_req, res, next) => {
    try {
      res.json({ reviews: await publishedReviews() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/products/:slug/reviews", async (req, res, next) => {
    try {
      res.json({ reviews: await publishedReviews(String(req.params.slug)) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/products/:slug/reviews", async (req, res, next) => {
    try {
      const review = await leaveReview(req, res, String(req.params.slug));
      if (!review) return;
      res.status(201).json(review);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/products/:slug", async (req, res, next) => {
    try {
      const products = await listProducts();
      const product = products.find((item) => item.slug === req.params.slug);
      if (!product) {
        res.status(404).json({ error: "This piece is not published." });
        return;
      }
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/fabrics", async (_req, res, next) => {
    try {
      res.json({ fabrics: await publicFabrics() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/colors", async (_req, res, next) => {
    try {
      res.json({ colors: await publicColors() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/sizes", async (_req, res, next) => {
    try {
      res.json({ sizes: await publicSizes() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/lengths", async (_req, res, next) => {
    try {
      res.json({ lengths: await publicLengths() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/maintenance", async (_req, res, next) => {
    try {
      res.json(await publicMaintenance());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/storefront-settings", async (_req, res, next) => {
    try {
      res.json({ settings: await publicStorefrontSettings() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/hours", async (_req, res, next) => {
    try {
      res.json(await publicHours());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/address", async (_req, res, next) => {
    try {
      res.json(await publicAddress());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/phone", async (_req, res, next) => {
    try {
      res.json(await publicPhone());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/instagram", async (_req, res, next) => {
    try {
      res.json(await publicInstagram());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/facebook", async (_req, res, next) => {
    try {
      res.json(await publicFacebook());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/maps", async (_req, res, next) => {
    try {
      res.json(await publicMaps());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/parent", async (_req, res, next) => {
    try {
      res.json(await publicParent());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/story", async (_req, res, next) => {
    try {
      res.json(await publicStory());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/welcome", async (_req, res, next) => {
    try {
      res.json(await publicWelcome());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/hero", async (_req, res, next) => {
    try {
      res.json(await publicHero());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/intro", async (_req, res, next) => {
    try {
      res.json(await publicIntro());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/heading", async (_req, res, next) => {
    try {
      res.json(await publicHeading());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/fitting", async (_req, res, next) => {
    try {
      res.json(await publicFitting());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/tailoring", async (_req, res, next) => {
    try {
      res.json(await publicTailoring());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/precision", async (_req, res, next) => {
    try {
      res.json(await publicPrecision());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/premium", async (_req, res, next) => {
    try {
      res.json(await publicPremium());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/handpick", async (_req, res, next) => {
    try {
      res.json(await publicHandpick());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/craftsmanship", async (_req, res, next) => {
    try {
      res.json(await publicCraftsmanship());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/detail", async (_req, res, next) => {
    try {
      res.json(await publicDetail());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/sample", async (_req, res, next) => {
    try {
      res.json(await publicSample());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/hem", async (_req, res, next) => {
    try {
      res.json(await publicHem());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/sketch", async (_req, res, next) => {
    try {
      res.json(await publicSketch());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/day", async (_req, res, next) => {
    try {
      res.json(await publicDay());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/notes", async (_req, res, next) => {
    try {
      res.json(await publicNotes());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/list", async (_req, res, next) => {
    try {
      res.json(await publicList());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/footer", async (_req, res, next) => {
    try {
      res.json(await publicFooter());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/ways", async (_req, res, next) => {
    try {
      res.json(await publicWays());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/pieces", async (_req, res, next) => {
    try {
      res.json(await publicPieces());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/follow", async (_req, res, next) => {
    try {
      res.json(await publicFollow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/city", async (_req, res, next) => {
    try {
      res.json(await publicCity());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/collect", async (_req, res, next) => {
    try {
      res.json(await publicCollect());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/commission", async (_req, res, next) => {
    try {
      res.json(await publicCommission());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/contacteyebrow", async (_req, res, next) => {
    try {
      res.json(await publicContactEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/appointmenteyebrow", async (_req, res, next) => {
    try {
      res.json(await publicAppointmentEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/shopeyebrow", async (_req, res, next) => {
    try {
      res.json(await publicShopEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/bespokeeyebrow", async (_req, res, next) => {
    try {
      res.json(await publicBespokeEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/policybanner", async (_req, res, next) => {
    try {
      res.json(await publicPolicyBanner());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/aboutalt", async (_req, res, next) => {
    try {
      res.json(await publicAboutAlt());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/storyalt", async (_req, res, next) => {
    try {
      res.json(await publicStoryAlt());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/heroalt", async (_req, res, next) => {
    try {
      res.json(await publicHeroAlt());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/sizeguidebanner", async (_req, res, next) => {
    try {
      res.json(await publicSizeGuideBanner());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/appointmentprefill", async (_req, res, next) => {
    try {
      res.json(await publicAppointmentPrefill());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/whatsappprefill", async (_req, res, next) => {
    try {
      res.json(await publicWhatsAppPrefill());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/searchsubmit", async (_req, res, next) => {
    try {
      res.json(await publicSearchSubmit());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/ordernow", async (_req, res, next) => {
    try {
      res.json(await publicOrderNow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/orderprefill", async (_req, res, next) => {
    try {
      res.json(await publicOrderPrefill());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/bespokeprefill", async (_req, res, next) => {
    try {
      res.json(await publicBespokePrefill());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/orderhelpprefill", async (_req, res, next) => {
    try {
      res.json(await publicOrderHelpPrefill());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/productprefill", async (_req, res, next) => {
    try {
      res.json(await publicProductPrefill());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/checkoutprefill", async (_req, res, next) => {
    try {
      res.json(await publicCheckoutPrefill());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/bespokesendprefill", async (_req, res, next) => {
    try {
      res.json(await publicBespokeSendPrefill());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/sendwhatsapp", async (_req, res, next) => {
    try {
      res.json(await publicSendWhatsApp());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/askpiece", async (_req, res, next) => {
    try {
      res.json(await publicAskPiece());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/tellboutique", async (_req, res, next) => {
    try {
      res.json(await publicTellBoutique());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/waboutique", async (_req, res, next) => {
    try {
      res.json(await publicWaBoutique());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/searchpieces", async (_req, res, next) => {
    try {
      res.json(await publicSearchPieces());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/searchhouse", async (_req, res, next) => {
    try {
      res.json(await publicSearchHouse());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/searchicon", async (_req, res, next) => {
    try {
      res.json(await publicSearchIcon());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/searcheyebrow", async (_req, res, next) => {
    try {
      res.json(await publicSearchEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/wishlisteyebrow", async (_req, res, next) => {
    try {
      res.json(await publicWishlistEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/accounteyebrow", async (_req, res, next) => {
    try {
      res.json(await publicAccountEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/summaryeyebrow", async (_req, res, next) => {
    try {
      res.json(await publicSummaryEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/bageyebrow", async (_req, res, next) => {
    try {
      res.json(await publicBagEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/confirmationeyebrow", async (_req, res, next) => {
    try {
      res.json(await publicConfirmationEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/checkouteyebrow", async (_req, res, next) => {
    try {
      res.json(await publicCheckoutEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/skulabel", async (_req, res, next) => {
    try {
      res.json(await publicSkuLabel());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/maintenanceeyebrow", async (_req, res, next) => {
    try {
      res.json(await publicMaintenanceEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/notfoundeyebrow", async (_req, res, next) => {
    try {
      res.json(await publicNotFoundEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/trackeyebrow", async (_req, res, next) => {
    try {
      res.json(await publicTrackEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/sizeguideeyebrow", async (_req, res, next) => {
    try {
      res.json(await publicSizeGuideEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/faqeyebrow", async (_req, res, next) => {
    try {
      res.json(await publicFaqEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/policyeyebrow", async (_req, res, next) => {
    try {
      res.json(await publicPolicyEyebrow());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/sellers", async (_req, res, next) => {
    try {
      res.json(await publicSellers());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/debut", async (_req, res, next) => {
    try {
      res.json(await publicDebut());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/abode", async (_req, res, next) => {
    try {
      res.json(await publicAbode());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/why", async (_req, res, next) => {
    try {
      res.json(await publicWhy());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/social", async (_req, res, next) => {
    try {
      res.json(await publicSocial());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/testimonials", async (_req, res, next) => {
    try {
      res.json(await publicTestimonials());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/correspondence", async (_req, res, next) => {
    try {
      res.json(await publicCorrespondence());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/reviewnote", async (_req, res, next) => {
    try {
      res.json(await publicReviewNote());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/instagramlink", async (_req, res, next) => {
    try {
      res.json(await publicInstagramLink());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/fittingroom", async (_req, res, next) => {
    try {
      res.json(await publicFittingRoom());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/explorecta", async (_req, res, next) => {
    try {
      res.json(await publicExploreCta());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/chatcta", async (_req, res, next) => {
    try {
      res.json(await publicChatCta());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/begincta", async (_req, res, next) => {
    try {
      res.json(await publicBeginCta());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/viewedit", async (_req, res, next) => {
    try {
      res.json(await publicViewEdit());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/viewpiece", async (_req, res, next) => {
    try {
      res.json(await publicViewPiece());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/readstory", async (_req, res, next) => {
    try {
      res.json(await publicReadStory());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/emaillabel", async (_req, res, next) => {
    try {
      res.json(await publicEmailLabel());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/subscribebtn", async (_req, res, next) => {
    try {
      res.json(await publicSubscribeButton());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/listmsg", async (_req, res, next) => {
    try {
      res.json(await publicListMessage());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/emailerr", async (_req, res, next) => {
    try {
      res.json(await publicEmailError());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/footnews", async (_req, res, next) => {
    try {
      res.json(await publicNewsHeading());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/footemail", async (_req, res, next) => {
    try {
      res.json(await publicFootEmail());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/footsub", async (_req, res, next) => {
    try {
      res.json(await publicFootSub());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/footlist", async (_req, res, next) => {
    try {
      res.json(await publicFootList());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/footerr", async (_req, res, next) => {
    try {
      res.json(await publicFootError());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/footquick", async (_req, res, next) => {
    try {
      res.json(await publicFootQuick());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/footsupport", async (_req, res, next) => {
    try {
      res.json(await publicFootSupport());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/footboutique", async (_req, res, next) => {
    try {
      res.json(await publicFootBoutique());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/pages/:slug", async (req, res, next) => {
    try {
      res.json({ page: await publicPage(String(req.params.slug)) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/announcements", async (_req, res, next) => {
    try {
      const rows = await prisma.announcement.findMany({
        where: { isActive: true },
        orderBy: { id: "asc" },
      });
      res.json({
        announcements: rows.map((row) => ({
          id: row.id,
          message: row.message,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/messages", async (req, res, next) => {
    try {
      res.json(await sendContactMessage(req));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/appointments", async (req, res, next) => {
    try {
      res.json(await requestAppointment(req));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/newsletter", async (req, res, next) => {
    try {
      res.json(await subscribeNewsletter(req));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/categories", async (_req, res, next) => {
    try {
      const categories = await prisma.category.findMany({
        where: { isPublished: true },
        orderBy: { sortOrder: "asc" },
      });
      res.json({ categories });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/auth/register", async (req, res, next) => {
    try {
      const input = registerSchema.parse(req.body);
      const email = input.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res
          .status(409)
          .json({ error: "An account with this email already exists." });
        return;
      }
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(input.password, 12),
          accountType: "CUSTOMER",
          firstName: input.firstName,
          lastName: input.lastName,
          profile: { create: {} },
          wishlist: { create: {} },
          cart: { create: {} },
        },
      });
      const accessToken = await issueSession(res, user);
      res.status(201).json({ accessToken, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/auth/login", async (req, res, next) => {
    try {
      const input = loginSchema.parse(req.body);
      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
        include: { role: true },
      });
      if (
        !user ||
        user.status !== "ACTIVE" ||
        !(await bcrypt.compare(input.password, user.passwordHash))
      ) {
        res.status(401).json({ error: "Email or password is incorrect." });
        return;
      }
      if (user.accountType !== "CUSTOMER") {
        res
          .status(403)
          .json({ error: "Use the staff entrance for this account." });
        return;
      }
      const accessToken = await issueSession(res, user);
      res.json({ accessToken, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/auth/refresh", async (req, res, next) => {
    try {
      const session = await rotateSession(req, res);
      if (!session) {
        res.status(401).json({ error: "Sign in to continue." });
        return;
      }
      res.json({
        accessToken: session.accessToken,
        user: publicUser(session.user),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/auth/logout", async (req, res, next) => {
    try {
      await revokeSession(req, res);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/account", async (req, res, next) => {
    try {
      const userId = await requireCustomer(req, res);
      if (!userId) return;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.accountType !== "CUSTOMER") {
        res.status(401).json({ error: "Sign in to continue." });
        return;
      }
      res.json({ user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/cart", async (req, res, next) => {
    try {
      if (req.headers.authorization && !readAccess(req)) {
        res.status(401).json({ error: "Sign in again to continue." });
        return;
      }
      res.json({ lines: await readCart(req, res) });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/v1/cart", async (req, res, next) => {
    try {
      const body = cartBodySchema.parse(req.body);
      res.json({ lines: await replaceCart(req, res, body.lines) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/cart/merge", async (req, res, next) => {
    try {
      const userId = await requireCustomer(req, res);
      if (!userId) return;
      const body = cartBodySchema.parse(req.body);
      res.json({ lines: await mergeCart(userId, req, res, body.lines) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/cart/coupon", async (req, res, next) => {
    try {
      const { readCartCoupon } = await import("./coupons.js");
      res.json(await readCartCoupon(req, res));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/cart/coupon", async (req, res, next) => {
    try {
      const { applyCartCoupon } = await import("./coupons.js");
      res.json(await applyCartCoupon(req, res));
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/v1/cart/coupon", async (req, res, next) => {
    try {
      const { removeCartCoupon } = await import("./coupons.js");
      res.json(await removeCartCoupon(req, res));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/checkout/quote", async (req, res, next) => {
    try {
      const city = z.object({ city: z.string().min(2) }).parse(req.body).city;
      res.json(await quoteCheckout(req, res, city));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/checkout/payment-methods", async (_req, res, next) => {
    try {
      const { listPaymentMethods } = await import("./payments/index.js");
      res.json(await listPaymentMethods());
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/checkout", async (req, res, next) => {
    try {
      const input = placeOrderSchema.parse(req.body);
      const placed = await placeCheckout(req, res, input);
      res.status(201).json(placed);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/payments/:id/status", async (req, res, next) => {
    try {
      const { paymentStatus } = await import("./payments/index.js");
      res.json({ payment: await paymentStatus(String(req.params.id)) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/orders/track", async (req, res, next) => {
    try {
      const number = String(req.query.number ?? "");
      const email = String(req.query.email ?? "");
      res.json({ order: await trackOrder(number, email) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/account/wishlist", async (req, res, next) => {
    try {
      const productIds = await listWishlist(req, res);
      if (!productIds) return;
      res.json({ productIds });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/v1/account/wishlist", async (req, res, next) => {
    try {
      const productIds = await replaceWishlist(req, res);
      if (!productIds) return;
      res.json({ productIds });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/account/addresses", async (req, res, next) => {
    try {
      const addresses = await listAddresses(req, res);
      if (!addresses) return;
      res.json({ addresses });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/account/addresses", async (req, res, next) => {
    try {
      const address = await createAddress(req, res);
      if (!address) return;
      res.status(201).json({ address });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/v1/account/addresses/:id", async (req, res, next) => {
    try {
      const result = await deleteAddress(req, res, String(req.params.id));
      if (!result) return;
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/account/measurements", async (req, res, next) => {
    try {
      const measurements = await listMeasurements(req, res);
      if (!measurements) return;
      res.json({ measurements });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/account/measurements", async (req, res, next) => {
    try {
      const measurement = await createMeasurement(req, res);
      if (!measurement) return;
      res.status(201).json({ measurement });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/bespoke/options", async (_req, res, next) => {
    try {
      res.json(await bespokeOptions());
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/bespoke", async (req, res, next) => {
    try {
      const request = await createBespoke(req, res);
      res.json({ request });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/account/bespoke", async (req, res, next) => {
    try {
      const requests = await listAccountBespoke(req, res);
      if (!requests) return;
      res.json({ requests });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/v1/account/bespoke/:number/decline",
    async (req, res, next) => {
      try {
        const request = await declineBespoke(
          req,
          res,
          String(req.params.number),
        );
        if (!request) return;
        res.json({ request });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/api/v1/account/bespoke/:number/accept", async (req, res, next) => {
    try {
      const request = await acceptBespoke(req, res, String(req.params.number));
      if (!request) return;
      res.json({ request });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/account/bespoke/:number/order", async (req, res, next) => {
    try {
      const placed = await convertBespoke(req, res, String(req.params.number));
      if (!placed) return;
      res.status(201).json(placed);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/v1/account/measurements/:id", async (req, res, next) => {
    try {
      const result = await deleteMeasurement(req, res, String(req.params.id));
      if (!result) return;
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/account/orders", async (req, res, next) => {
    try {
      const userId = await requireCustomer(req, res);
      if (!userId) return;
      res.json({ orders: await listAccountOrders(userId) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/auth/login", async (req, res, next) => {
    try {
      res.json(await staffLogin(req, res));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/auth/refresh", async (req, res, next) => {
    try {
      res.json(await refreshStaff(req, res));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/auth/logout", async (req, res, next) => {
    try {
      await logoutStaff(req, res);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/dashboard", async (req, res, next) => {
    try {
      const dashboard = await staffDashboard(req, res);
      if (!dashboard) return;
      res.json({ dashboard });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/products", async (req, res, next) => {
    try {
      const products = await staffProducts(req, res);
      if (!products) return;
      res.json({ products });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products", async (req, res, next) => {
    try {
      const product = await createStaffProduct(req, res);
      if (!product) return;
      res.status(201).json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/uploads", async (req, res, next) => {
    try {
      const upload = await createStaffUpload(req, res);
      if (!upload) return;
      res.status(201).json(upload);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/v1/admin/products/:id", async (req, res, next) => {
    try {
      const product = await updateStaffProduct(req, res, String(req.params.id));
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/bestseller", async (req, res, next) => {
    try {
      const product = await updateStaffBestseller(
        req,
        res,
        String(req.params.id),
      );
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/arrival", async (req, res, next) => {
    try {
      const product = await updateStaffArrival(req, res, String(req.params.id));
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/collection", async (req, res, next) => {
    try {
      const product = await updateStaffCollection(
        req,
        res,
        String(req.params.id),
      );
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/image", async (req, res, next) => {
    try {
      const product = await updateStaffProductImage(
        req,
        res,
        String(req.params.id),
      );
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/images", async (req, res, next) => {
    try {
      const product = await createStaffProductImage(
        req,
        res,
        String(req.params.id),
      );
      if (!product) return;
      res.status(201).json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.delete(
    "/api/v1/admin/products/:id/images/:imageId",
    async (req, res, next) => {
      try {
        const product = await deleteStaffProductImage(
          req,
          res,
          String(req.params.id),
          String(req.params.imageId),
        );
        if (!product) return;
        res.json({ product });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/api/v1/admin/products/:id/colors", async (req, res, next) => {
    try {
      const product = await addStaffProductColor(
        req,
        res,
        String(req.params.id),
      );
      if (!product) return;
      res.status(201).json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/alt", async (req, res, next) => {
    try {
      const product = await updateStaffAlt(req, res, String(req.params.id));
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/place", async (req, res, next) => {
    try {
      const product = await updateStaffPlace(req, res, String(req.params.id));
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/style", async (req, res, next) => {
    try {
      const product = await updateStaffStyleCode(
        req,
        res,
        String(req.params.id),
      );
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/name", async (req, res, next) => {
    try {
      const product = await updateStaffName(req, res, String(req.params.id));
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/fabric", async (req, res, next) => {
    try {
      const product = await updateStaffFabric(req, res, String(req.params.id));
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/description", async (req, res, next) => {
    try {
      const product = await updateStaffDescription(
        req,
        res,
        String(req.params.id),
      );
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/products/:id/compare", async (req, res, next) => {
    try {
      const product = await updateStaffCompare(req, res, String(req.params.id));
      if (!product) return;
      res.json({ product });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/fabrics", async (req, res, next) => {
    try {
      const fabrics = await staffFabrics(req, res);
      if (!fabrics) return;
      res.json({ fabrics });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/fabrics", async (req, res, next) => {
    try {
      const fabric = await createStaffFabric(req, res);
      if (!fabric) return;
      res.status(201).json({ fabric });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/fabrics/:id", async (req, res, next) => {
    try {
      const fabric = await updateStaffFabricList(
        req,
        res,
        String(req.params.id),
      );
      if (!fabric) return;
      res.json({ fabric });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/colors", async (req, res, next) => {
    try {
      const colors = await staffColors(req, res);
      if (!colors) return;
      res.json({ colors });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/colors", async (req, res, next) => {
    try {
      const color = await createStaffColor(req, res);
      if (!color) return;
      res.status(201).json({ color });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/colors/:id", async (req, res, next) => {
    try {
      const color = await updateStaffColor(req, res, String(req.params.id));
      if (!color) return;
      res.json({ color });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/sizes", async (req, res, next) => {
    try {
      const sizes = await staffSizes(req, res);
      if (!sizes) return;
      res.json({ sizes });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/sizes", async (req, res, next) => {
    try {
      const size = await createStaffSize(req, res);
      if (!size) return;
      res.status(201).json({ size });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/sizes/:id", async (req, res, next) => {
    try {
      const size = await updateStaffSize(req, res, String(req.params.id));
      if (!size) return;
      res.json({ size });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/lengths", async (req, res, next) => {
    try {
      const lengths = await staffLengths(req, res);
      if (!lengths) return;
      res.json({ lengths });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/lengths", async (req, res, next) => {
    try {
      const length = await createStaffLength(req, res);
      if (!length) return;
      res.status(201).json({ length });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/lengths/:id", async (req, res, next) => {
    try {
      const length = await updateStaffLength(req, res, String(req.params.id));
      if (!length) return;
      res.json({ length });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/categories", async (req, res, next) => {
    try {
      const categories = await staffCategories(req, res);
      if (!categories) return;
      res.json({ categories });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/categories", async (req, res, next) => {
    try {
      const category = await createStaffCategory(req, res);
      if (!category) return;
      res.status(201).json({ category });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/categories/:id/name", async (req, res, next) => {
    try {
      const category = await updateStaffCategoryName(
        req,
        res,
        String(req.params.id),
      );
      if (!category) return;
      res.json({ category });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/v1/admin/categories/:id/description",
    async (req, res, next) => {
      try {
        const category = await updateStaffCategoryLine(
          req,
          res,
          String(req.params.id),
        );
        if (!category) return;
        res.json({ category });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/api/v1/admin/categories/:id", async (req, res, next) => {
    try {
      const category = await updateStaffCategory(
        req,
        res,
        String(req.params.id),
      );
      if (!category) return;
      res.json({ category });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/coupons", async (req, res, next) => {
    try {
      const { staffCoupons } = await import("./coupons.js");
      const coupons = await staffCoupons(req, res);
      if (!coupons) return;
      res.json({ coupons });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/coupons", async (req, res, next) => {
    try {
      const { createStaffCoupon } = await import("./coupons.js");
      const coupon = await createStaffCoupon(req, res);
      if (!coupon) return;
      res.status(201).json({ coupon });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/coupons/:id", async (req, res, next) => {
    try {
      const { updateStaffCoupon } = await import("./coupons.js");
      const coupon = await updateStaffCoupon(req, res, String(req.params.id));
      if (!coupon) return;
      res.json({ coupon });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/shipping", async (req, res, next) => {
    try {
      const rates = await staffShipping(req, res);
      if (!rates) return;
      res.json({ rates });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/shipping/:id", async (req, res, next) => {
    try {
      const rate = await updateStaffShipping(req, res, String(req.params.id));
      if (!rate) return;
      res.json({ rate });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/maintenance", async (req, res, next) => {
    try {
      const maintenance = await staffMaintenance(req, res);
      if (!maintenance) return;
      res.json(maintenance);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/settings", async (req, res, next) => {
    try {
      const settings = await readAdminSettings(req, res);
      if (!settings) return;
      res.json({ settings });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/settings", async (req, res, next) => {
    try {
      const settings = await writeAdminSettings(req, res);
      if (!settings) return;
      res.json({ settings });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/hours", async (req, res, next) => {
    try {
      const hours = await staffHours(req, res);
      if (!hours) return;
      res.json(hours);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/hours", async (req, res, next) => {
    try {
      const hours = await updateStaffHours(req, res);
      if (!hours) return;
      res.json(hours);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/address", async (req, res, next) => {
    try {
      const address = await staffAddress(req, res);
      if (!address) return;
      res.json(address);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/address", async (req, res, next) => {
    try {
      const address = await updateStaffAddress(req, res);
      if (!address) return;
      res.json(address);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/phone", async (req, res, next) => {
    try {
      const phone = await staffPhone(req, res);
      if (!phone) return;
      res.json(phone);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/phone", async (req, res, next) => {
    try {
      const phone = await updateStaffPhone(req, res);
      if (!phone) return;
      res.json(phone);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/instagram", async (req, res, next) => {
    try {
      const instagram = await staffInstagram(req, res);
      if (!instagram) return;
      res.json(instagram);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/instagram", async (req, res, next) => {
    try {
      const instagram = await updateStaffInstagram(req, res);
      if (!instagram) return;
      res.json(instagram);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/facebook", async (req, res, next) => {
    try {
      const facebook = await staffFacebook(req, res);
      if (!facebook) return;
      res.json(facebook);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/facebook", async (req, res, next) => {
    try {
      const facebook = await updateStaffFacebook(req, res);
      if (!facebook) return;
      res.json(facebook);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/maps", async (req, res, next) => {
    try {
      const maps = await staffMaps(req, res);
      if (!maps) return;
      res.json(maps);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/maps", async (req, res, next) => {
    try {
      const maps = await updateStaffMaps(req, res);
      if (!maps) return;
      res.json(maps);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/parent", async (req, res, next) => {
    try {
      const parent = await staffParent(req, res);
      if (!parent) return;
      res.json(parent);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/parent", async (req, res, next) => {
    try {
      const parent = await updateStaffParent(req, res);
      if (!parent) return;
      res.json(parent);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/story", async (req, res, next) => {
    try {
      const story = await staffStory(req, res);
      if (!story) return;
      res.json(story);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/story", async (req, res, next) => {
    try {
      const story = await updateStaffStory(req, res);
      if (!story) return;
      res.json(story);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/welcome", async (req, res, next) => {
    try {
      const welcome = await staffWelcome(req, res);
      if (!welcome) return;
      res.json(welcome);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/welcome", async (req, res, next) => {
    try {
      const welcome = await updateStaffWelcome(req, res);
      if (!welcome) return;
      res.json(welcome);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/hero", async (req, res, next) => {
    try {
      const hero = await staffHero(req, res);
      if (!hero) return;
      res.json(hero);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/hero", async (req, res, next) => {
    try {
      const hero = await updateStaffHero(req, res);
      if (!hero) return;
      res.json(hero);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/intro", async (req, res, next) => {
    try {
      const intro = await staffIntro(req, res);
      if (!intro) return;
      res.json(intro);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/intro", async (req, res, next) => {
    try {
      const intro = await updateStaffIntro(req, res);
      if (!intro) return;
      res.json(intro);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/heading", async (req, res, next) => {
    try {
      const heading = await staffHeading(req, res);
      if (!heading) return;
      res.json(heading);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/heading", async (req, res, next) => {
    try {
      const heading = await updateStaffHeading(req, res);
      if (!heading) return;
      res.json(heading);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/fitting", async (req, res, next) => {
    try {
      const fitting = await staffFitting(req, res);
      if (!fitting) return;
      res.json(fitting);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/fitting", async (req, res, next) => {
    try {
      const fitting = await updateStaffFitting(req, res);
      if (!fitting) return;
      res.json(fitting);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/tailoring", async (req, res, next) => {
    try {
      const tailoring = await staffTailoring(req, res);
      if (!tailoring) return;
      res.json(tailoring);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/tailoring", async (req, res, next) => {
    try {
      const tailoring = await updateStaffTailoring(req, res);
      if (!tailoring) return;
      res.json(tailoring);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/precision", async (req, res, next) => {
    try {
      const precision = await staffPrecision(req, res);
      if (!precision) return;
      res.json(precision);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/precision", async (req, res, next) => {
    try {
      const precision = await updateStaffPrecision(req, res);
      if (!precision) return;
      res.json(precision);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/premium", async (req, res, next) => {
    try {
      const premium = await staffPremium(req, res);
      if (!premium) return;
      res.json(premium);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/premium", async (req, res, next) => {
    try {
      const premium = await updateStaffPremium(req, res);
      if (!premium) return;
      res.json(premium);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/handpick", async (req, res, next) => {
    try {
      const handpick = await staffHandpick(req, res);
      if (!handpick) return;
      res.json(handpick);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/handpick", async (req, res, next) => {
    try {
      const handpick = await updateStaffHandpick(req, res);
      if (!handpick) return;
      res.json(handpick);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/craftsmanship", async (req, res, next) => {
    try {
      const craftsmanship = await staffCraftsmanship(req, res);
      if (!craftsmanship) return;
      res.json(craftsmanship);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/craftsmanship", async (req, res, next) => {
    try {
      const craftsmanship = await updateStaffCraftsmanship(req, res);
      if (!craftsmanship) return;
      res.json(craftsmanship);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/detail", async (req, res, next) => {
    try {
      const detail = await staffDetail(req, res);
      if (!detail) return;
      res.json(detail);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/detail", async (req, res, next) => {
    try {
      const detail = await updateStaffDetail(req, res);
      if (!detail) return;
      res.json(detail);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/sample", async (req, res, next) => {
    try {
      const sample = await staffSample(req, res);
      if (!sample) return;
      res.json(sample);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/sample", async (req, res, next) => {
    try {
      const sample = await updateStaffSample(req, res);
      if (!sample) return;
      res.json(sample);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/hem", async (req, res, next) => {
    try {
      const hem = await staffHem(req, res);
      if (!hem) return;
      res.json(hem);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/hem", async (req, res, next) => {
    try {
      const hem = await updateStaffHem(req, res);
      if (!hem) return;
      res.json(hem);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/sketch", async (req, res, next) => {
    try {
      const sketch = await staffSketch(req, res);
      if (!sketch) return;
      res.json(sketch);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/sketch", async (req, res, next) => {
    try {
      const sketch = await updateStaffSketch(req, res);
      if (!sketch) return;
      res.json(sketch);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/day", async (req, res, next) => {
    try {
      const day = await staffDay(req, res);
      if (!day) return;
      res.json(day);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/day", async (req, res, next) => {
    try {
      const day = await updateStaffDay(req, res);
      if (!day) return;
      res.json(day);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/notes", async (req, res, next) => {
    try {
      const notes = await staffNotes(req, res);
      if (!notes) return;
      res.json(notes);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/notes", async (req, res, next) => {
    try {
      const notes = await updateStaffNotes(req, res);
      if (!notes) return;
      res.json(notes);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/list", async (req, res, next) => {
    try {
      const list = await staffList(req, res);
      if (!list) return;
      res.json(list);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/list", async (req, res, next) => {
    try {
      const list = await updateStaffList(req, res);
      if (!list) return;
      res.json(list);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/footer", async (req, res, next) => {
    try {
      const footer = await staffFooter(req, res);
      if (!footer) return;
      res.json(footer);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/footer", async (req, res, next) => {
    try {
      const footer = await updateStaffFooter(req, res);
      if (!footer) return;
      res.json(footer);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/ways", async (req, res, next) => {
    try {
      const ways = await staffWays(req, res);
      if (!ways) return;
      res.json(ways);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/ways", async (req, res, next) => {
    try {
      const ways = await updateStaffWays(req, res);
      if (!ways) return;
      res.json(ways);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/pieces", async (req, res, next) => {
    try {
      const pieces = await staffPieces(req, res);
      if (!pieces) return;
      res.json(pieces);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/pieces", async (req, res, next) => {
    try {
      const pieces = await updateStaffPieces(req, res);
      if (!pieces) return;
      res.json(pieces);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/follow", async (req, res, next) => {
    try {
      const follow = await staffFollow(req, res);
      if (!follow) return;
      res.json(follow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/follow", async (req, res, next) => {
    try {
      const follow = await updateStaffFollow(req, res);
      if (!follow) return;
      res.json(follow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/city", async (req, res, next) => {
    try {
      const city = await staffCity(req, res);
      if (!city) return;
      res.json(city);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/city", async (req, res, next) => {
    try {
      const city = await updateStaffCity(req, res);
      if (!city) return;
      res.json(city);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/collect", async (req, res, next) => {
    try {
      const collect = await staffCollect(req, res);
      if (!collect) return;
      res.json(collect);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/collect", async (req, res, next) => {
    try {
      const collect = await updateStaffCollect(req, res);
      if (!collect) return;
      res.json(collect);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/commission", async (req, res, next) => {
    try {
      const commission = await staffCommission(req, res);
      if (!commission) return;
      res.json(commission);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/commission", async (req, res, next) => {
    try {
      const commission = await updateStaffCommission(req, res);
      if (!commission) return;
      res.json(commission);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/contacteyebrow", async (req, res, next) => {
    try {
      const contactEyebrow = await staffContactEyebrow(req, res);
      if (!contactEyebrow) return;
      res.json(contactEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/contacteyebrow", async (req, res, next) => {
    try {
      const contactEyebrow = await updateStaffContactEyebrow(req, res);
      if (!contactEyebrow) return;
      res.json(contactEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/appointmenteyebrow", async (req, res, next) => {
    try {
      const appointmentEyebrow = await staffAppointmentEyebrow(req, res);
      if (!appointmentEyebrow) return;
      res.json(appointmentEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/appointmenteyebrow", async (req, res, next) => {
    try {
      const appointmentEyebrow = await updateStaffAppointmentEyebrow(req, res);
      if (!appointmentEyebrow) return;
      res.json(appointmentEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/shopeyebrow", async (req, res, next) => {
    try {
      const shopEyebrow = await staffShopEyebrow(req, res);
      if (!shopEyebrow) return;
      res.json(shopEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/shopeyebrow", async (req, res, next) => {
    try {
      const shopEyebrow = await updateStaffShopEyebrow(req, res);
      if (!shopEyebrow) return;
      res.json(shopEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/bespokeeyebrow", async (req, res, next) => {
    try {
      const bespokeEyebrow = await staffBespokeEyebrow(req, res);
      if (!bespokeEyebrow) return;
      res.json(bespokeEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/bespokeeyebrow", async (req, res, next) => {
    try {
      const bespokeEyebrow = await updateStaffBespokeEyebrow(req, res);
      if (!bespokeEyebrow) return;
      res.json(bespokeEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/policybanner", async (req, res, next) => {
    try {
      const policyBanner = await staffPolicyBanner(req, res);
      if (!policyBanner) return;
      res.json(policyBanner);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/policybanner", async (req, res, next) => {
    try {
      const policyBanner = await updateStaffPolicyBanner(req, res);
      if (!policyBanner) return;
      res.json(policyBanner);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/aboutalt", async (req, res, next) => {
    try {
      const aboutAlt = await staffAboutAlt(req, res);
      if (!aboutAlt) return;
      res.json(aboutAlt);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/aboutalt", async (req, res, next) => {
    try {
      const aboutAlt = await updateStaffAboutAlt(req, res);
      if (!aboutAlt) return;
      res.json(aboutAlt);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/storyalt", async (req, res, next) => {
    try {
      const storyAlt = await staffStoryAlt(req, res);
      if (!storyAlt) return;
      res.json(storyAlt);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/storyalt", async (req, res, next) => {
    try {
      const storyAlt = await updateStaffStoryAlt(req, res);
      if (!storyAlt) return;
      res.json(storyAlt);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/heroalt", async (req, res, next) => {
    try {
      const heroAlt = await staffHeroAlt(req, res);
      if (!heroAlt) return;
      res.json(heroAlt);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/heroalt", async (req, res, next) => {
    try {
      const heroAlt = await updateStaffHeroAlt(req, res);
      if (!heroAlt) return;
      res.json(heroAlt);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/sizeguidebanner", async (req, res, next) => {
    try {
      const sizeGuideBanner = await staffSizeGuideBanner(req, res);
      if (!sizeGuideBanner) return;
      res.json(sizeGuideBanner);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/sizeguidebanner", async (req, res, next) => {
    try {
      const sizeGuideBanner = await updateStaffSizeGuideBanner(req, res);
      if (!sizeGuideBanner) return;
      res.json(sizeGuideBanner);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/appointmentprefill", async (req, res, next) => {
    try {
      const appointmentPrefill = await staffAppointmentPrefill(req, res);
      if (!appointmentPrefill) return;
      res.json(appointmentPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/appointmentprefill", async (req, res, next) => {
    try {
      const appointmentPrefill = await updateStaffAppointmentPrefill(req, res);
      if (!appointmentPrefill) return;
      res.json(appointmentPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/whatsappprefill", async (req, res, next) => {
    try {
      const whatsAppPrefill = await staffWhatsAppPrefill(req, res);
      if (!whatsAppPrefill) return;
      res.json(whatsAppPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/whatsappprefill", async (req, res, next) => {
    try {
      const whatsAppPrefill = await updateStaffWhatsAppPrefill(req, res);
      if (!whatsAppPrefill) return;
      res.json(whatsAppPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/searchsubmit", async (req, res, next) => {
    try {
      const searchSubmit = await staffSearchSubmit(req, res);
      if (!searchSubmit) return;
      res.json(searchSubmit);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/searchsubmit", async (req, res, next) => {
    try {
      const searchSubmit = await updateStaffSearchSubmit(req, res);
      if (!searchSubmit) return;
      res.json(searchSubmit);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/ordernow", async (req, res, next) => {
    try {
      const orderNow = await staffOrderNow(req, res);
      if (!orderNow) return;
      res.json(orderNow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/ordernow", async (req, res, next) => {
    try {
      const orderNow = await updateStaffOrderNow(req, res);
      if (!orderNow) return;
      res.json(orderNow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/orderprefill", async (req, res, next) => {
    try {
      const orderPrefill = await staffOrderPrefill(req, res);
      if (!orderPrefill) return;
      res.json(orderPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/orderprefill", async (req, res, next) => {
    try {
      const orderPrefill = await updateStaffOrderPrefill(req, res);
      if (!orderPrefill) return;
      res.json(orderPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/bespokeprefill", async (req, res, next) => {
    try {
      const bespokePrefill = await staffBespokePrefill(req, res);
      if (!bespokePrefill) return;
      res.json(bespokePrefill);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/bespokeprefill", async (req, res, next) => {
    try {
      const bespokePrefill = await updateStaffBespokePrefill(req, res);
      if (!bespokePrefill) return;
      res.json(bespokePrefill);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/orderhelpprefill", async (req, res, next) => {
    try {
      const orderHelpPrefill = await staffOrderHelpPrefill(req, res);
      if (!orderHelpPrefill) return;
      res.json(orderHelpPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/orderhelpprefill", async (req, res, next) => {
    try {
      const orderHelpPrefill = await updateStaffOrderHelpPrefill(req, res);
      if (!orderHelpPrefill) return;
      res.json(orderHelpPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/productprefill", async (req, res, next) => {
    try {
      const productPrefill = await staffProductPrefill(req, res);
      if (!productPrefill) return;
      res.json(productPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/productprefill", async (req, res, next) => {
    try {
      const productPrefill = await updateStaffProductPrefill(req, res);
      if (!productPrefill) return;
      res.json(productPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/checkoutprefill", async (req, res, next) => {
    try {
      const checkoutPrefill = await staffCheckoutPrefill(req, res);
      if (!checkoutPrefill) return;
      res.json(checkoutPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/checkoutprefill", async (req, res, next) => {
    try {
      const checkoutPrefill = await updateStaffCheckoutPrefill(req, res);
      if (!checkoutPrefill) return;
      res.json(checkoutPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/bespokesendprefill", async (req, res, next) => {
    try {
      const bespokeSendPrefill = await staffBespokeSendPrefill(req, res);
      if (!bespokeSendPrefill) return;
      res.json(bespokeSendPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/bespokesendprefill", async (req, res, next) => {
    try {
      const bespokeSendPrefill = await updateStaffBespokeSendPrefill(req, res);
      if (!bespokeSendPrefill) return;
      res.json(bespokeSendPrefill);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/sendwhatsapp", async (req, res, next) => {
    try {
      const sendWhatsApp = await staffSendWhatsApp(req, res);
      if (!sendWhatsApp) return;
      res.json(sendWhatsApp);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/sendwhatsapp", async (req, res, next) => {
    try {
      const sendWhatsApp = await updateStaffSendWhatsApp(req, res);
      if (!sendWhatsApp) return;
      res.json(sendWhatsApp);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/askpiece", async (req, res, next) => {
    try {
      const askPiece = await staffAskPiece(req, res);
      if (!askPiece) return;
      res.json(askPiece);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/askpiece", async (req, res, next) => {
    try {
      const askPiece = await updateStaffAskPiece(req, res);
      if (!askPiece) return;
      res.json(askPiece);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/tellboutique", async (req, res, next) => {
    try {
      const tellBoutique = await staffTellBoutique(req, res);
      if (!tellBoutique) return;
      res.json(tellBoutique);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/tellboutique", async (req, res, next) => {
    try {
      const tellBoutique = await updateStaffTellBoutique(req, res);
      if (!tellBoutique) return;
      res.json(tellBoutique);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/waboutique", async (req, res, next) => {
    try {
      const waBoutique = await staffWaBoutique(req, res);
      if (!waBoutique) return;
      res.json(waBoutique);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/waboutique", async (req, res, next) => {
    try {
      const waBoutique = await updateStaffWaBoutique(req, res);
      if (!waBoutique) return;
      res.json(waBoutique);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/searchpieces", async (req, res, next) => {
    try {
      const searchPieces = await staffSearchPieces(req, res);
      if (!searchPieces) return;
      res.json(searchPieces);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/searchpieces", async (req, res, next) => {
    try {
      const searchPieces = await updateStaffSearchPieces(req, res);
      if (!searchPieces) return;
      res.json(searchPieces);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/searchhouse", async (req, res, next) => {
    try {
      const searchHouse = await staffSearchHouse(req, res);
      if (!searchHouse) return;
      res.json(searchHouse);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/searchhouse", async (req, res, next) => {
    try {
      const searchHouse = await updateStaffSearchHouse(req, res);
      if (!searchHouse) return;
      res.json(searchHouse);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/searchicon", async (req, res, next) => {
    try {
      const searchIcon = await staffSearchIcon(req, res);
      if (!searchIcon) return;
      res.json(searchIcon);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/searchicon", async (req, res, next) => {
    try {
      const searchIcon = await updateStaffSearchIcon(req, res);
      if (!searchIcon) return;
      res.json(searchIcon);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/searcheyebrow", async (req, res, next) => {
    try {
      const searchEyebrow = await staffSearchEyebrow(req, res);
      if (!searchEyebrow) return;
      res.json(searchEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/searcheyebrow", async (req, res, next) => {
    try {
      const searchEyebrow = await updateStaffSearchEyebrow(req, res);
      if (!searchEyebrow) return;
      res.json(searchEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/wishlisteyebrow", async (req, res, next) => {
    try {
      const wishlistEyebrow = await staffWishlistEyebrow(req, res);
      if (!wishlistEyebrow) return;
      res.json(wishlistEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/wishlisteyebrow", async (req, res, next) => {
    try {
      const wishlistEyebrow = await updateStaffWishlistEyebrow(req, res);
      if (!wishlistEyebrow) return;
      res.json(wishlistEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/accounteyebrow", async (req, res, next) => {
    try {
      const accountEyebrow = await staffAccountEyebrow(req, res);
      if (!accountEyebrow) return;
      res.json(accountEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/accounteyebrow", async (req, res, next) => {
    try {
      const accountEyebrow = await updateStaffAccountEyebrow(req, res);
      if (!accountEyebrow) return;
      res.json(accountEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/summaryeyebrow", async (req, res, next) => {
    try {
      const summaryEyebrow = await staffSummaryEyebrow(req, res);
      if (!summaryEyebrow) return;
      res.json(summaryEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/summaryeyebrow", async (req, res, next) => {
    try {
      const summaryEyebrow = await updateStaffSummaryEyebrow(req, res);
      if (!summaryEyebrow) return;
      res.json(summaryEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/bageyebrow", async (req, res, next) => {
    try {
      const bagEyebrow = await staffBagEyebrow(req, res);
      if (!bagEyebrow) return;
      res.json(bagEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/bageyebrow", async (req, res, next) => {
    try {
      const bagEyebrow = await updateStaffBagEyebrow(req, res);
      if (!bagEyebrow) return;
      res.json(bagEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/confirmationeyebrow", async (req, res, next) => {
    try {
      const confirmationEyebrow = await staffConfirmationEyebrow(req, res);
      if (!confirmationEyebrow) return;
      res.json(confirmationEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/confirmationeyebrow", async (req, res, next) => {
    try {
      const confirmationEyebrow = await updateStaffConfirmationEyebrow(req, res);
      if (!confirmationEyebrow) return;
      res.json(confirmationEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/checkouteyebrow", async (req, res, next) => {
    try {
      const checkoutEyebrow = await staffCheckoutEyebrow(req, res);
      if (!checkoutEyebrow) return;
      res.json(checkoutEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/checkouteyebrow", async (req, res, next) => {
    try {
      const checkoutEyebrow = await updateStaffCheckoutEyebrow(req, res);
      if (!checkoutEyebrow) return;
      res.json(checkoutEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/skulabel", async (req, res, next) => {
    try {
      const skuLabel = await staffSkuLabel(req, res);
      if (!skuLabel) return;
      res.json(skuLabel);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/skulabel", async (req, res, next) => {
    try {
      const skuLabel = await updateStaffSkuLabel(req, res);
      if (!skuLabel) return;
      res.json(skuLabel);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/maintenanceeyebrow", async (req, res, next) => {
    try {
      const maintenanceEyebrow = await staffMaintenanceEyebrow(req, res);
      if (!maintenanceEyebrow) return;
      res.json(maintenanceEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/maintenanceeyebrow", async (req, res, next) => {
    try {
      const maintenanceEyebrow = await updateStaffMaintenanceEyebrow(req, res);
      if (!maintenanceEyebrow) return;
      res.json(maintenanceEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/notfoundeyebrow", async (req, res, next) => {
    try {
      const notFoundEyebrow = await staffNotFoundEyebrow(req, res);
      if (!notFoundEyebrow) return;
      res.json(notFoundEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/notfoundeyebrow", async (req, res, next) => {
    try {
      const notFoundEyebrow = await updateStaffNotFoundEyebrow(req, res);
      if (!notFoundEyebrow) return;
      res.json(notFoundEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/trackeyebrow", async (req, res, next) => {
    try {
      const trackEyebrow = await staffTrackEyebrow(req, res);
      if (!trackEyebrow) return;
      res.json(trackEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/trackeyebrow", async (req, res, next) => {
    try {
      const trackEyebrow = await updateStaffTrackEyebrow(req, res);
      if (!trackEyebrow) return;
      res.json(trackEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/sizeguideeyebrow", async (req, res, next) => {
    try {
      const sizeGuideEyebrow = await staffSizeGuideEyebrow(req, res);
      if (!sizeGuideEyebrow) return;
      res.json(sizeGuideEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/sizeguideeyebrow", async (req, res, next) => {
    try {
      const sizeGuideEyebrow = await updateStaffSizeGuideEyebrow(req, res);
      if (!sizeGuideEyebrow) return;
      res.json(sizeGuideEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/faqeyebrow", async (req, res, next) => {
    try {
      const faqEyebrow = await staffFaqEyebrow(req, res);
      if (!faqEyebrow) return;
      res.json(faqEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/faqeyebrow", async (req, res, next) => {
    try {
      const faqEyebrow = await updateStaffFaqEyebrow(req, res);
      if (!faqEyebrow) return;
      res.json(faqEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/policyeyebrow", async (req, res, next) => {
    try {
      const policyEyebrow = await staffPolicyEyebrow(req, res);
      if (!policyEyebrow) return;
      res.json(policyEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/policyeyebrow", async (req, res, next) => {
    try {
      const policyEyebrow = await updateStaffPolicyEyebrow(req, res);
      if (!policyEyebrow) return;
      res.json(policyEyebrow);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/sellers", async (req, res, next) => {
    try {
      const sellers = await staffSellers(req, res);
      if (!sellers) return;
      res.json(sellers);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/sellers", async (req, res, next) => {
    try {
      const sellers = await updateStaffSellers(req, res);
      if (!sellers) return;
      res.json(sellers);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/debut", async (req, res, next) => {
    try {
      const debut = await staffDebut(req, res);
      if (!debut) return;
      res.json(debut);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/debut", async (req, res, next) => {
    try {
      const debut = await updateStaffDebut(req, res);
      if (!debut) return;
      res.json(debut);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/abode", async (req, res, next) => {
    try {
      const abode = await staffAbode(req, res);
      if (!abode) return;
      res.json(abode);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/abode", async (req, res, next) => {
    try {
      const abode = await updateStaffAbode(req, res);
      if (!abode) return;
      res.json(abode);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/why", async (req, res, next) => {
    try {
      const why = await staffWhy(req, res);
      if (!why) return;
      res.json(why);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/why", async (req, res, next) => {
    try {
      const why = await updateStaffWhy(req, res);
      if (!why) return;
      res.json(why);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/social", async (req, res, next) => {
    try {
      const social = await staffSocial(req, res);
      if (!social) return;
      res.json(social);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/social", async (req, res, next) => {
    try {
      const social = await updateStaffSocial(req, res);
      if (!social) return;
      res.json(social);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/testimonials", async (req, res, next) => {
    try {
      const testimonials = await staffTestimonials(req, res);
      if (!testimonials) return;
      res.json(testimonials);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/testimonials", async (req, res, next) => {
    try {
      const testimonials = await updateStaffTestimonials(req, res);
      if (!testimonials) return;
      res.json(testimonials);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/correspondence", async (req, res, next) => {
    try {
      const correspondence = await staffCorrespondence(req, res);
      if (!correspondence) return;
      res.json(correspondence);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/correspondence", async (req, res, next) => {
    try {
      const correspondence = await updateStaffCorrespondence(req, res);
      if (!correspondence) return;
      res.json(correspondence);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/reviewnote", async (req, res, next) => {
    try {
      const reviewNote = await staffReviewNote(req, res);
      if (!reviewNote) return;
      res.json(reviewNote);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/reviewnote", async (req, res, next) => {
    try {
      const reviewNote = await updateStaffReviewNote(req, res);
      if (!reviewNote) return;
      res.json(reviewNote);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/instagramlink", async (req, res, next) => {
    try {
      const instagramLink = await staffInstagramLink(req, res);
      if (!instagramLink) return;
      res.json(instagramLink);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/fittingroom", async (req, res, next) => {
    try {
      const fittingRoom = await staffFittingRoom(req, res);
      if (!fittingRoom) return;
      res.json(fittingRoom);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/explorecta", async (req, res, next) => {
    try {
      const exploreCta = await staffExploreCta(req, res);
      if (!exploreCta) return;
      res.json(exploreCta);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/chatcta", async (req, res, next) => {
    try {
      const chatCta = await staffChatCta(req, res);
      if (!chatCta) return;
      res.json(chatCta);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/begincta", async (req, res, next) => {
    try {
      const beginCta = await staffBeginCta(req, res);
      if (!beginCta) return;
      res.json(beginCta);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/begincta", async (req, res, next) => {
    try {
      const beginCta = await updateStaffBeginCta(req, res);
      if (!beginCta) return;
      res.json(beginCta);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/viewedit", async (req, res, next) => {
    try {
      const viewEdit = await staffViewEdit(req, res);
      if (!viewEdit) return;
      res.json(viewEdit);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/viewedit", async (req, res, next) => {
    try {
      const viewEdit = await updateStaffViewEdit(req, res);
      if (!viewEdit) return;
      res.json(viewEdit);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/viewpiece", async (req, res, next) => {
    try {
      const viewPiece = await staffViewPiece(req, res);
      if (!viewPiece) return;
      res.json(viewPiece);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/viewpiece", async (req, res, next) => {
    try {
      const viewPiece = await updateStaffViewPiece(req, res);
      if (!viewPiece) return;
      res.json(viewPiece);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/readstory", async (req, res, next) => {
    try {
      const readStory = await staffReadStory(req, res);
      if (!readStory) return;
      res.json(readStory);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/readstory", async (req, res, next) => {
    try {
      const readStory = await updateStaffReadStory(req, res);
      if (!readStory) return;
      res.json(readStory);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/emaillabel", async (req, res, next) => {
    try {
      const emailLabel = await staffEmailLabel(req, res);
      if (!emailLabel) return;
      res.json(emailLabel);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/emaillabel", async (req, res, next) => {
    try {
      const emailLabel = await updateStaffEmailLabel(req, res);
      if (!emailLabel) return;
      res.json(emailLabel);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/subscribebtn", async (req, res, next) => {
    try {
      const subscribeButton = await staffSubscribeButton(req, res);
      if (!subscribeButton) return;
      res.json(subscribeButton);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/subscribebtn", async (req, res, next) => {
    try {
      const subscribeButton = await updateStaffSubscribeButton(req, res);
      if (!subscribeButton) return;
      res.json(subscribeButton);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/listmsg", async (req, res, next) => {
    try {
      const listMessage = await staffListMessage(req, res);
      if (!listMessage) return;
      res.json(listMessage);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/listmsg", async (req, res, next) => {
    try {
      const listMessage = await updateStaffListMessage(req, res);
      if (!listMessage) return;
      res.json(listMessage);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/emailerr", async (req, res, next) => {
    try {
      const emailError = await staffEmailError(req, res);
      if (!emailError) return;
      res.json(emailError);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/emailerr", async (req, res, next) => {
    try {
      const emailError = await updateStaffEmailError(req, res);
      if (!emailError) return;
      res.json(emailError);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/footnews", async (req, res, next) => {
    try {
      const newsHeading = await staffNewsHeading(req, res);
      if (!newsHeading) return;
      res.json(newsHeading);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/footnews", async (req, res, next) => {
    try {
      const newsHeading = await updateStaffNewsHeading(req, res);
      if (!newsHeading) return;
      res.json(newsHeading);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/footemail", async (req, res, next) => {
    try {
      const footEmail = await staffFootEmail(req, res);
      if (!footEmail) return;
      res.json(footEmail);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/footemail", async (req, res, next) => {
    try {
      const footEmail = await updateStaffFootEmail(req, res);
      if (!footEmail) return;
      res.json(footEmail);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/footsub", async (req, res, next) => {
    try {
      const footSub = await staffFootSub(req, res);
      if (!footSub) return;
      res.json(footSub);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/footsub", async (req, res, next) => {
    try {
      const footSub = await updateStaffFootSub(req, res);
      if (!footSub) return;
      res.json(footSub);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/footlist", async (req, res, next) => {
    try {
      const footList = await staffFootList(req, res);
      if (!footList) return;
      res.json(footList);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/footlist", async (req, res, next) => {
    try {
      const footList = await updateStaffFootList(req, res);
      if (!footList) return;
      res.json(footList);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/footerr", async (req, res, next) => {
    try {
      const footError = await staffFootError(req, res);
      if (!footError) return;
      res.json(footError);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/footerr", async (req, res, next) => {
    try {
      const footError = await updateStaffFootError(req, res);
      if (!footError) return;
      res.json(footError);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/footquick", async (req, res, next) => {
    try {
      const footQuick = await staffFootQuick(req, res);
      if (!footQuick) return;
      res.json(footQuick);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/footquick", async (req, res, next) => {
    try {
      const footQuick = await updateStaffFootQuick(req, res);
      if (!footQuick) return;
      res.json(footQuick);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/footsupport", async (req, res, next) => {
    try {
      const footSupport = await staffFootSupport(req, res);
      if (!footSupport) return;
      res.json(footSupport);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/footsupport", async (req, res, next) => {
    try {
      const footSupport = await updateStaffFootSupport(req, res);
      if (!footSupport) return;
      res.json(footSupport);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/footboutique", async (req, res, next) => {
    try {
      const footBoutique = await staffFootBoutique(req, res);
      if (!footBoutique) return;
      res.json(footBoutique);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/footboutique", async (req, res, next) => {
    try {
      const footBoutique = await updateStaffFootBoutique(req, res);
      if (!footBoutique) return;
      res.json(footBoutique);
    } catch (error) {
      next(error);
    }
  });

  for (const key of ["reasonidx1", "reasonidx2", "reasonidx3"] as const) {
    app.get(`/api/v1/${key}`, async (_req, res, next) => {
      try {
        res.json(await publicReasonIndex(key));
      } catch (error) {
        next(error);
      }
    });

    app.get(`/api/v1/admin/${key}`, async (req, res, next) => {
      try {
        const reasonIndex = await staffReasonIndex(req, res, key);
        if (!reasonIndex) return;
        res.json(reasonIndex);
      } catch (error) {
        next(error);
      }
    });

    app.post(`/api/v1/admin/${key}`, async (req, res, next) => {
      try {
        const reasonIndex = await updateStaffReasonIndex(req, res, key);
        if (!reasonIndex) return;
        res.json(reasonIndex);
      } catch (error) {
        next(error);
      }
    });
  }

  app.post("/api/v1/admin/chatcta", async (req, res, next) => {
    try {
      const chatCta = await updateStaffChatCta(req, res);
      if (!chatCta) return;
      res.json(chatCta);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/explorecta", async (req, res, next) => {
    try {
      const exploreCta = await updateStaffExploreCta(req, res);
      if (!exploreCta) return;
      res.json(exploreCta);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/fittingroom", async (req, res, next) => {
    try {
      const fittingRoom = await updateStaffFittingRoom(req, res);
      if (!fittingRoom) return;
      res.json(fittingRoom);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/instagramlink", async (req, res, next) => {
    try {
      const instagramLink = await updateStaffInstagramLink(req, res);
      if (!instagramLink) return;
      res.json(instagramLink);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/maintenance", async (req, res, next) => {
    try {
      const maintenance = await updateStaffMaintenance(req, res);
      if (!maintenance) return;
      res.json(maintenance);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/pages", async (req, res, next) => {
    try {
      const pages = await staffPages(req, res);
      if (!pages) return;
      res.json({ pages });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/pages/:id/body", async (req, res, next) => {
    try {
      const page = await updateStaffPageLine(req, res, String(req.params.id));
      if (!page) return;
      res.json({ page });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/pages/:id/title", async (req, res, next) => {
    try {
      const page = await updateStaffPageTitle(req, res, String(req.params.id));
      if (!page) return;
      res.json({ page });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/pages/:id", async (req, res, next) => {
    try {
      const page = await updateStaffPage(req, res, String(req.params.id));
      if (!page) return;
      res.json({ page });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/announcements", async (req, res, next) => {
    try {
      const announcements = await staffAnnouncements(req, res);
      if (!announcements) return;
      res.json({ announcements });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/v1/admin/announcements/:id/message",
    async (req, res, next) => {
      try {
        const announcement = await updateStaffAnnouncementLine(
          req,
          res,
          String(req.params.id),
        );
        if (!announcement) return;
        res.json({ announcement });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/api/v1/admin/announcements/:id", async (req, res, next) => {
    try {
      const announcement = await updateStaffAnnouncement(
        req,
        res,
        String(req.params.id),
      );
      if (!announcement) return;
      res.json({ announcement });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/reviews", async (req, res, next) => {
    try {
      const reviews = await staffReviews(req, res);
      if (!reviews) return;
      res.json({ reviews });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/reviews/:id", async (req, res, next) => {
    try {
      const review = await updateStaffReview(req, res, String(req.params.id));
      if (!review) return;
      res.json({ review });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/messages", async (req, res, next) => {
    try {
      const messages = await staffMessages(req, res);
      if (!messages) return;
      res.json({ messages });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/messages/:id", async (req, res, next) => {
    try {
      const message = await updateStaffMessage(req, res, String(req.params.id));
      if (!message) return;
      res.json({ message });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/appointments", async (req, res, next) => {
    try {
      const appointments = await staffAppointments(req, res);
      if (!appointments) return;
      res.json({ appointments });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/appointments/:id", async (req, res, next) => {
    try {
      const appointment = await updateStaffAppointment(
        req,
        res,
        String(req.params.id),
      );
      if (!appointment) return;
      res.json({ appointment });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/newsletter", async (req, res, next) => {
    try {
      const subscribers = await staffNewsletter(req, res);
      if (!subscribers) return;
      res.json({ subscribers });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/customers", async (req, res, next) => {
    try {
      const customers = await staffCustomers(req, res);
      if (!customers) return;
      res.json({ customers });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/customers/:id", async (req, res, next) => {
    try {
      const customer = await staffCustomer(req, res, String(req.params.id));
      if (!customer) return;
      res.json({ customer });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/customers/:id/status", async (req, res, next) => {
    try {
      const customer = await setCustomerStatus(req, res, String(req.params.id));
      if (!customer) return;
      res.json({ customer });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/customers/:id/notes", async (req, res, next) => {
    try {
      const entry = await addCustomerNote(req, res, String(req.params.id));
      if (!entry) return;
      res.status(201).json({ note: entry });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/audit", async (req, res, next) => {
    try {
      const entries = await staffAudit(req, res);
      if (!entries) return;
      res.json({ entries });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/inventory/history", async (req, res, next) => {
    try {
      const movements = await stockHistory(req, res);
      if (!movements) return;
      res.json({ movements });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/inventory", async (req, res, next) => {
    try {
      const inventory = await staffInventory(req, res);
      if (!inventory) return;
      res.json({ inventory });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/inventory/:id", async (req, res, next) => {
    try {
      const row = await adjustStock(req, res, String(req.params.id));
      if (!row) return;
      res.json({ row });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/orders", async (req, res, next) => {
    try {
      const orders = await staffOrders(req, res);
      if (!orders) return;
      res.json({ orders });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/orders/export", async (req, res, next) => {
    try {
      const csv = await exportOrders(req, res);
      if (csv == null) return;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="peris-orders.csv"',
      );
      res.send(csv);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/orders/:number", async (req, res, next) => {
    try {
      const order = await staffOrderSheet(req, res, String(req.params.number));
      if (!order) return;
      res.json({ order });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/orders/:number/collect", async (req, res, next) => {
    try {
      const order = await recordCollection(req, res, String(req.params.number));
      if (!order) return;
      res.json({ order });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/orders/:number/refund", async (req, res, next) => {
    try {
      const order = await refundOrder(req, res, String(req.params.number));
      if (!order) return;
      res.json({ order });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/orders/:number/cancel", async (req, res, next) => {
    try {
      const order = await cancelOrder(req, res, String(req.params.number));
      if (!order) return;
      res.json({ order });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/orders/:number/status", async (req, res, next) => {
    try {
      const order = await advanceFulfillment(
        req,
        res,
        String(req.params.number),
      );
      if (!order) return;
      res.json({ order });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/bespoke", async (req, res, next) => {
    try {
      const requests = await staffBespoke(req, res);
      if (!requests) return;
      res.json({ requests });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/bespoke/:number/review", async (req, res, next) => {
    try {
      const request = await reviewBespoke(req, res, String(req.params.number));
      if (!request) return;
      res.json({ request });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/bespoke/:number/quote", async (req, res, next) => {
    try {
      const request = await quoteBespoke(req, res, String(req.params.number));
      if (!request) return;
      res.json({ request });
    } catch (error) {
      next(error);
    }
  });

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: deskZodMessage(error) });
        return;
      }
      if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ error: "Something went wrong." });
    },
  );

  return app;
}

function publicUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

function deskZodMessage(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Check the form and try again.";
  const path = issue.path.join(".");
  const byPath: Record<string, string> = {
    name: "Enter a name of at least 2 characters.",
    styleCode:
      "Use a style code with letters, numbers, and hyphens only (2–40 characters).",
    description: "Write a description of at least 8 characters.",
    fabric: "Enter a fabric line of at least 2 characters.",
    priceFils: "Enter the price in whole dirhams.",
    collectionSlug: "Choose a collection.",
    images: "Upload at least one photograph.",
    colorNames: "Choose at least one color.",
    colorName: "Choose a color on the desk.",
    alt: "Write a photograph line of at least 8 characters.",
    imageUrl: "Upload a photograph.",
  };
  if (byPath[path]) return byPath[path];
  if (path.startsWith("images.") && path.endsWith(".alt"))
    return "Write a photograph line of at least 2 characters.";
  if (path.startsWith("images.") && path.endsWith(".url"))
    return "Upload a valid photograph.";
  if (path.startsWith("images.") && path.endsWith(".position"))
    return "Choose a photograph place.";
  if (path.startsWith("images.") && path.endsWith(".colorName"))
    return "Choose a color for the photograph, or leave it shared.";
  if (path.startsWith("colorNames"))
    return "Choose at least one color on the desk.";
  if (issue.code === "too_small" && issue.type === "string")
    return `Enter a longer value for ${path || "this field"}.`;
  if (issue.code === "invalid_string")
    return `Check the format of ${path || "this field"}.`;
  return issue.message || "Check the form and try again.";
}

async function listProducts() {
  const rows = await prisma.product.findMany({
    where: { isPublished: true },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        include: { color: true },
      },
      categories: { include: { category: true } },
      lengths: { include: { length: true } },
      variants: {
        where: { isActive: true },
        include: { color: true, size: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((product) => {
    const shown = product.variants.filter(
      (variant) => variant.size.isActive && variant.color.isActive,
    );
    const colors = new Map<
      string,
      { id: string; name: string; hex: string }
    >();
    const sizes = new Map<string, number>();
    for (const variant of shown) {
      colors.set(variant.color.id, {
        id: variant.color.id,
        name: variant.color.name,
        hex: variant.color.hex,
      });
      sizes.set(variant.size.code, variant.size.sortOrder);
    }
    return {
      id: product.id,
      slug: product.slug,
      sku: product.styleCode,
      name: product.name,
      priceFils: product.basePriceFils,
      compareAtFils: product.compareAtFils ?? undefined,
      collection: product.categories[0]?.category.slug ?? "casual-elegance",
      fabric: product.fabricDetails,
      description: product.description,
      colors: [...colors.values()],
      sizes: [...sizes.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([code]) => code),
      lengths: product.lengths
        .filter((row) => row.length.isActive)
        .map((row) => row.length.inches)
        .sort((a, b) => a - b),
      stock: shown.map((variant) => ({
        color: variant.color.name,
        size: variant.size.code,
        available: variant.stockOnHand - variant.stockReserved,
      })),
      images: product.images.map((image) => ({
        id: image.id,
        src: image.url,
        alt: image.alt,
        position: image.position ?? undefined,
        colorId: image.colorId ?? null,
        color: image.color?.name ?? null,
      })),
      isNew: product.isNew,
      isBestseller: product.isBestseller,
      placeholder: product.isPlaceholder,
    };
  });
}
