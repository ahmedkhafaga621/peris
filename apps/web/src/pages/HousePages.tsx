import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { bespokeSendWhatsAppMessage, phoneHref, whatsappHref } from "@/data/site";
import {
  OrderReceipt,
  trackOrder,
  type PublicOrder,
} from "@/pages/CheckoutPage";
import { requestAppointment } from "@/lib/appointments";
import { sendContactMessage } from "@/lib/messages";
import { useAddress } from "@/hooks/useAddress";
import { useAppointmentEyebrow } from "@/hooks/useAppointmentEyebrow";
import { useAppointmentPrefill } from "@/hooks/useAppointmentPrefill";
import { useBespokeEyebrow } from "@/hooks/useBespokeEyebrow";
import { useBespokeOptionsQuery } from "@/hooks/useBespokeOptions";
import { useBespokeSendPrefill } from "@/hooks/useBespokeSendPrefill";
import { useSendWhatsApp } from "@/hooks/useSendWhatsApp";
import { useWaBoutique } from "@/hooks/useWaBoutique";
import { useFaqEyebrow } from "@/hooks/useFaqEyebrow";
import { useSizeGuideBanner } from "@/hooks/useSizeGuideBanner";
import { useSizeGuideEyebrow } from "@/hooks/useSizeGuideEyebrow";
import { useTrackEyebrow } from "@/hooks/useTrackEyebrow";
import { useNotFoundEyebrow } from "@/hooks/useNotFoundEyebrow";
import { useMaintenanceEyebrow } from "@/hooks/useMaintenanceEyebrow";
import { usePolicyEyebrow } from "@/hooks/usePolicyEyebrow";
import { useContactEyebrow } from "@/hooks/useContactEyebrow";
import { useHours } from "@/hooks/useHours";
import { useMaps } from "@/hooks/useMaps";
import { useParent } from "@/hooks/useParent";
import { useAboutAlt } from "@/hooks/useAboutAlt";
import { useStory } from "@/hooks/useStory";
import { useWelcome } from "@/hooks/useWelcome";
import { usePhone } from "@/hooks/usePhone";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useSeo } from "@/lib/seo";
import { useSession } from "@/store/useSession";
import { ABAYA_LENGTHS, ABAYA_SIZES } from "@peris/shared";

const contactSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(8, "Enter a phone number"),
  message: z.string().min(8, "Write a short message"),
});

type ContactValues = z.infer<typeof contactSchema>;

export function AboutPage() {
  const parent = useParent();
  const story = useStory();
  const aboutAlt = useAboutAlt();
  useSeo("About — PERIS", story);
  return (
    <article className="wrap" style={{ paddingBottom: 80 }}>
      <header className="page-intro">
        <p className="eyebrow">{parent}</p>
        <h1>About PERIS</h1>
      </header>
      <div className="story">
        <img
          src="/media/flowing.jpg"
          alt={aboutAlt}
        />
        <div className="story-copy">
          <p className="lede">{story}</p>
          <Link to="/bespoke" className="link-quiet">
            Commission a piece
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ContactPage() {
  const welcome = useWelcome();
  const contactEyebrow = useContactEyebrow();
  useSeo("Contact — PERIS", welcome);
  const hours = useHours();
  const address = useAddress();
  const phone = usePhone();
  const whatsapp = useWhatsApp();
  const appointmentPrefill = useAppointmentPrefill();
  const waBoutique = useWaBoutique();
  const maps = useMaps();
  const form = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(values: ContactValues) {
    setError("");
    void sendContactMessage(values)
      .then(() => {
        setSaved(true);
        form.reset();
      })
      .catch((reason: unknown) => {
        setSaved(false);
        setError(
          reason instanceof Error
            ? reason.message
            : "The message was not saved.",
        );
      });
  }

  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <header className="page-intro">
        <p className="eyebrow">{contactEyebrow}</p>
        <h1>Contact</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          {welcome}
        </p>
      </header>
      <div className="split">
        <form
          className="stack-form"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <Field label="Full name" error={form.formState.errors.name?.message}>
            <input {...form.register("name")} />
          </Field>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <input type="email" {...form.register("email")} />
          </Field>
          <Field label="Phone" error={form.formState.errors.phone?.message}>
            <input {...form.register("phone")} />
          </Field>
          <Field label="Message" error={form.formState.errors.message?.message}>
            <textarea {...form.register("message")} />
          </Field>
          {error ? <p className="field-error">{error}</p> : null}
          {saved ? (
            <p className="notice">
              The message is on the desk. The boutique is not emailed. For
              today, WhatsApp or call the atelier.
            </p>
          ) : null}
          <button
            type="submit"
            className="btn btn-fill"
            style={{ justifySelf: "start" }}
          >
            Send
          </button>
        </form>
        <aside className="stack-form">
          <p>{address}</p>
          <p>{hours}</p>
          <a className="link-quiet" href={phoneHref(phone)}>
            {phone}
          </a>
          <a
            className="link-quiet"
            href={whatsappHref(appointmentPrefill, whatsapp)}
          >
            {waBoutique}
          </a>
          <a
            className="link-quiet"
            href={maps}
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps
          </a>
          <AppointmentForm />
        </aside>
      </div>
    </div>
  );
}

const appointmentSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  phone: z.string().min(8, "Enter a phone number"),
  when: z.string().min(3, "Suggest a day and time"),
  kind: z.enum(["fitting", "consultation"]),
});

type AppointmentValues = z.infer<typeof appointmentSchema>;

function AppointmentForm() {
  const appointmentEyebrow = useAppointmentEyebrow();
  const form = useForm<AppointmentValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { kind: "fitting" },
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="stack-form"
      style={{ marginTop: 12 }}
      onSubmit={form.handleSubmit((values) => {
        setError("");
        void requestAppointment({
          name: values.name,
          phone: values.phone,
          preferredAt: values.when,
          kind: values.kind,
        })
          .then(() => {
            setSaved(true);
            form.reset({ kind: "fitting", name: "", phone: "", when: "" });
          })
          .catch((reason: unknown) => {
            setSaved(false);
            setError(
              reason instanceof Error
                ? reason.message
                : "The request was not saved.",
            );
          });
      })}
    >
      <p className="eyebrow">{appointmentEyebrow}</p>
      <Field label="Name" error={form.formState.errors.name?.message}>
        <input {...form.register("name")} />
      </Field>
      <Field label="Phone" error={form.formState.errors.phone?.message}>
        <input {...form.register("phone")} />
      </Field>
      <Field label="Preferred time" error={form.formState.errors.when?.message}>
        <input {...form.register("when")} placeholder="Sunday, 4:00 PM" />
      </Field>
      <label className="field">
        <span>Visit</span>
        <select {...form.register("kind")}>
          <option value="fitting">Fitting</option>
          <option value="consultation">Design consultation</option>
        </select>
      </label>
      {error ? <p className="field-error">{error}</p> : null}
      {saved ? (
        <p className="notice">
          The request is on the desk. Confirm the time on WhatsApp so the
          boutique sees it today.
        </p>
      ) : null}
      <button
        type="submit"
        className="btn btn-line"
        style={{ justifySelf: "start" }}
      >
        Request a time
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

const steps = [
  "Select the preferred design",
  "Select fabric",
  "Select color",
  "Enter measurements",
  "Add customization notes",
  "Upload inspiration images",
  "Submit the request",
];

function lengthChoice(lengths: readonly number[]) {
  const sorted = [...lengths].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  return low === high
    ? `a length of ${low} inches`
    : `a length from ${low} to ${high} inches`;
}

export function BespokePage() {
  useSeo("Bespoke tailoring — PERIS");
  const bespokeEyebrow = useBespokeEyebrow();
  const bespokeSendPrefill = useBespokeSendPrefill();
  const optionsQuery = useBespokeOptionsQuery();
  const options = optionsQuery.data;
  const designs = options?.designs ?? [];
  const fabrics = options?.fabrics ?? [];
  const colors = options?.colors ?? [];
  const lengths = options?.lengths ?? [];
  const sendWhatsApp = useSendWhatsApp();
  const whatsapp = useWhatsApp();
  const user = useSession((state) => state.user);
  const token = useSession((state) => state.accessToken);
  const [step, setStep] = useState(0);
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState<SavedMeasurement[]>([]);
  const [form, setForm] = useState({
    design: "",
    fabric: "",
    color: "",
    height: "",
    shoulder: "",
    sleeve: "",
    chest: "",
    waist: "",
    length: "",
    notes: "",
    imageName: "",
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (!options) return;
    const nextDesigns = options.designs;
    const nextFabrics = options.fabrics;
    const nextColors = options.colors;
    const nextLengths = options.lengths;
    setForm((current) => ({
      ...current,
      design: nextDesigns.includes(current.design)
        ? current.design
        : (nextDesigns[0] ?? ""),
      fabric: nextFabrics.includes(current.fabric)
        ? current.fabric
        : (nextFabrics[0] ?? ""),
      color: nextColors.includes(current.color)
        ? current.color
        : (nextColors[0] ?? ""),
      length: nextLengths.includes(Number(current.length))
        ? current.length
        : nextLengths[0] != null
          ? String(nextLengths[0])
          : "",
    }));
  }, [options]);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || `${user.firstName} ${user.lastName}`.trim(),
      email: current.email || user.email,
    }));
  }, [user]);

  useEffect(() => {
    if (!token) return;
    void fetch("/api/v1/account/measurements", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((body: { measurements?: SavedMeasurement[] }) =>
        setSaved(body.measurements ?? []),
      )
      .catch(() => setSaved([]));
  }, [token]);

  function update(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function next(event: FormEvent) {
    event.preventDefault();
    if (step === 3) {
      const fields = [
        form.height,
        form.shoulder,
        form.sleeve,
        form.chest,
        form.waist,
      ].map((value) => Number(value.trim()));
      const lengthNumber = Number(form.length.trim());
      const lengthOk = lengths.includes(lengthNumber);
      const valid = fields.every(
        (number) => Number.isFinite(number) && number >= 30 && number <= 250,
      );
      if (!lengths.length) {
        setError("The atelier lengths are not available yet.");
        return;
      }
      if (!valid || !lengthOk) {
        setError(
          `Enter each measurement in centimetres, and choose ${lengthChoice(lengths)}.`,
        );
        return;
      }
    }
    if (step === steps.length - 1) {
      if (
        form.name.trim().length < 2 ||
        !form.email.includes("@") ||
        form.phone.trim().length < 8
      ) {
        setError("Enter your name, email, and phone so the atelier can reply.");
        return;
      }
      setError("");
      setPending(true);
      void fetch("/api/v1/bespoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          design: form.design,
          fabric: form.fabric,
          color: form.color,
          heightCm: Number(form.height),
          shoulderCm: Number(form.shoulder),
          sleeveCm: Number(form.sleeve),
          chestCm: Number(form.chest),
          waistCm: Number(form.waist),
          abayaLengthIn: Number(form.length),
          notes: form.notes.trim() || undefined,
          imageName: form.imageName.trim() || undefined,
        }),
      })
        .then(async (response) => {
          const body = (await response.json().catch(() => ({}))) as {
            request?: { number: string };
            error?: string;
          };
          if (!response.ok || !body.request)
            throw new Error(body.error ?? "The request was not sent.");
          setNumber(body.request.number);
        })
        .catch((reason: unknown) =>
          setError(
            reason instanceof Error
              ? reason.message
              : "The request was not sent.",
          ),
        )
        .finally(() => setPending(false));
      return;
    }
    setError("");
    setStep(step + 1);
  }

  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <header className="page-intro">
        <p className="eyebrow">{bespokeEyebrow}</p>
        <h1>Bespoke tailoring</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          Design your own Abaya, and let our master tailors turn your vision
          into reality.
        </p>
      </header>
      <ol
        className="choices"
        style={{ marginBottom: 28, padding: 0, listStyle: "none" }}
      >
        {steps.map((label, index) => (
          <li
            key={label}
            className="eyebrow"
            style={{ color: index === step ? "#751629" : undefined }}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {number ? (
        <div className="stack-form">
          <p className="lede">
            Request {number} is with the atelier. A price is not quoted yet. You
            can still send the same note on WhatsApp.
          </p>
          <a
            className="btn btn-fill"
            style={{ justifySelf: "start" }}
            href={whatsappHref(
              bespokeSendWhatsAppMessage(
                bespokeSendPrefill,
                number,
                form.design,
                form.fabric,
                form.color,
                form.length,
                form.notes,
              ),
              whatsapp,
            )}
          >
            {sendWhatsApp}
          </a>
        </div>
      ) : (
        <form className="stack-form" onSubmit={next} style={{ maxWidth: 640 }}>
          {step === 0 ? (
            <label className="field">
              <span>Design</span>
              {optionsQuery.isError ? (
                <p>The atelier designs are not available.</p>
              ) : designs.length ? (
                <select
                  aria-label="Bespoke design"
                  value={form.design}
                  onChange={(event) => update({ design: event.target.value })}
                >
                  {designs.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              ) : (
                <p>Opening the designs.</p>
              )}
            </label>
          ) : null}
          {step === 1 ? (
            <label className="field">
              <span>Fabric</span>
              {optionsQuery.isError ? (
                <p>The atelier fabrics are not available.</p>
              ) : fabrics.length ? (
                <select
                  aria-label="Bespoke fabric"
                  value={form.fabric}
                  onChange={(event) => update({ fabric: event.target.value })}
                >
                  {fabrics.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              ) : (
                <p>Opening the fabrics.</p>
              )}
            </label>
          ) : null}
          {step === 2 ? (
            <label className="field">
              <span>Color</span>
              {optionsQuery.isError ? (
                <p>The atelier colors are not available.</p>
              ) : colors.length ? (
                <select
                  aria-label="Bespoke color"
                  value={form.color}
                  onChange={(event) => update({ color: event.target.value })}
                >
                  {colors.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              ) : (
                <p>Opening the colors.</p>
              )}
            </label>
          ) : null}
          {step === 3 ? (
            <div className="stack-form">
              {saved.length > 0 ? (
                <label className="field">
                  <span>Saved measurements</span>
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      const row = saved.find(
                        (item) => item.id === event.target.value,
                      );
                      if (!row) return;
                      update({
                        height:
                          row.heightCm != null
                            ? String(row.heightCm)
                            : form.height,
                        shoulder:
                          row.shoulderCm != null
                            ? String(row.shoulderCm)
                            : form.shoulder,
                        sleeve:
                          row.sleeveCm != null
                            ? String(row.sleeveCm)
                            : form.sleeve,
                        chest:
                          row.chestCm != null
                            ? String(row.chestCm)
                            : form.chest,
                        waist:
                          row.waistCm != null
                            ? String(row.waistCm)
                            : form.waist,
                        length:
                          row.abayaLengthIn != null
                            ? String(row.abayaLengthIn)
                            : form.length,
                      });
                    }}
                  >
                    <option value="">Type measurements</option>
                    {saved.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {(
                [
                  ["height", "Height"],
                  ["shoulder", "Shoulder width"],
                  ["sleeve", "Sleeve length"],
                  ["chest", "Chest"],
                  ["waist", "Waist"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="field">
                  <span>{label}</span>
                  <input
                    value={form[key]}
                    onChange={(event) => update({ [key]: event.target.value })}
                  />
                </label>
              ))}
              <label className="field">
                <span>Desired abaya length (inches)</span>
                {optionsQuery.isError ? (
                  <p>The atelier lengths are not available.</p>
                ) : lengths.length ? (
                  <select
                    aria-label="Bespoke length"
                    value={form.length}
                    onChange={(event) => update({ length: event.target.value })}
                  >
                    {lengths.map((length) => (
                      <option key={length} value={length}>
                        {length}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p>Opening the lengths.</p>
                )}
              </label>
            </div>
          ) : null}
          {step === 4 ? (
            <label className="field">
              <span>Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => update({ notes: event.target.value })}
              />
            </label>
          ) : null}
          {step === 5 ? (
            <label className="field">
              <span>Inspiration image</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  update({ imageName: event.target.files?.[0]?.name ?? "" })
                }
              />
              <small className="notice">
                The file stays on this device. Attach it in WhatsApp when you
                send the request.
              </small>
            </label>
          ) : null}
          {step === 6 ? (
            <div className="stack-form">
              <p>
                {form.design}, {form.fabric}, {form.color}. Length {form.length}{" "}
                in.
                {form.notes ? ` Notes: ${form.notes}` : ""}
              </p>
              <label className="field">
                <span>Name</span>
                <input
                  value={form.name}
                  onChange={(event) => update({ name: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  value={form.email}
                  onChange={(event) => update({ email: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  value={form.phone}
                  onChange={(event) => update({ phone: event.target.value })}
                />
              </label>
            </div>
          ) : null}
          {error ? <p className="field-error">{error}</p> : null}
          <div className="hero-actions">
            {step > 0 ? (
              <button
                type="button"
                className="btn btn-line"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            ) : null}
            <button type="submit" className="btn btn-fill" disabled={pending}>
              {step === steps.length - 1 ? "Submit request" : "Continue"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

type SavedMeasurement = {
  id: string;
  label: string;
  heightCm: number | null;
  shoulderCm: number | null;
  sleeveCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  abayaLengthIn: number | null;
};
function policyLead(text: string) {
  const match = text.match(/^(\d+\.\s+)?([^:]{2,80}:)\s*(.*)$/);
  if (!match) return text;
  return (
    <>
      <strong>
        {match[1]}
        {match[2]}
      </strong>
      {match[3] ? ` ${match[3]}` : null}
    </>
  );
}

function PolicyCopy({ body }: { body: string }) {
  const blocks = body.split(/\n\n+/).filter((block) => block.trim());
  return (
    <div className="policy-copy">
      {blocks.map((block) => {
        const lines = block.split("\n");
        const list = lines.every((line) => /^- |^ {2}- /.test(line));
        if (!list) return <p key={block}>{policyLead(block)}</p>;
        const items: { text: string; children: string[] }[] = [];
        for (const line of lines) {
          if (line.startsWith("  - ")) {
            items.at(-1)?.children.push(line.slice(4));
          } else {
            items.push({ text: line.slice(2), children: [] });
          }
        }
        return (
          <ul key={block}>
            {items.map((item) => (
              <li key={item.text}>
                {policyLead(item.text)}
                {item.children.length > 0 ? (
                  <ul>
                    {item.children.map((child) => (
                      <li key={child}>{child}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

export function PolicyPage() {
  const policyEyebrow = usePolicyEyebrow();
  const { slug = "" } = useParams();
  const [page, setPage] = useState<{ title: string; body: string } | null>(
    null,
  );
  const [missing, setMissing] = useState(false);
  useSeo(page ? `${page.title} — PERIS` : "Policy — PERIS");

  useEffect(() => {
    let gone = false;
    setPage(null);
    setMissing(false);
    void fetch(`/api/v1/pages/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          page?: { title: string; body: string };
        };
        if (!response.ok || !body.page) throw new Error("missing");
        return body.page;
      })
      .then((next) => {
        if (!gone) setPage(next);
      })
      .catch(() => {
        if (!gone) setMissing(true);
      });
    return () => {
      gone = true;
    };
  }, [slug]);

  if (missing) {
    return (
      <div className="wrap page-intro">
        <h1>This page is not in the house</h1>
      </div>
    );
  }
  if (!page) {
    return (
      <div className="wrap page-intro">
        <h1>Opening the page</h1>
      </div>
    );
  }
  return (
    <article className="wrap" style={{ paddingBottom: 80, maxWidth: 860 }}>
      <header className="page-intro">
        <p className="eyebrow">{policyEyebrow}</p>
        <h1>{page.title}</h1>
      </header>
      <PolicyCopy body={page.body} />
    </article>
  );
}

export function FaqPage() {
  const faqEyebrow = useFaqEyebrow();
  useSeo("FAQ — PERIS");
  const hours = useHours();
  const address = useAddress();
  const phone = usePhone();
  const whatsapp = useWhatsApp();
  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <header className="page-intro">
        <p className="eyebrow">{faqEyebrow}</p>
        <h1>FAQ</h1>
      </header>
      <div className="stack-form" style={{ maxWidth: 720 }}>
        <article>
          <h2 style={{ fontWeight: 400 }}>Where is the boutique?</h2>
          <p>{address}</p>
        </article>
        <article>
          <h2 style={{ fontWeight: 400 }}>When are you open?</h2>
          <p>{hours}</p>
        </article>
        <article>
          <h2 style={{ fontWeight: 400 }}>How do I reach the atelier?</h2>
          <p>
            Call {phone} or WhatsApp {whatsapp}. You can also write from the
            contact page.
          </p>
        </article>
      </div>
    </div>
  );
}

function houseList(items: readonly string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function lengthSentence(lengths: readonly number[]) {
  const sorted = [...lengths].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  return low === high
    ? `Length is chosen on the piece, at ${low} inches.`
    : `Length is chosen on the piece, from ${low} to ${high} inches.`;
}

export function SizeGuidePage() {
  const sizeGuideEyebrow = useSizeGuideEyebrow();
  const sizeGuideBanner = useSizeGuideBanner();
  const [fit, setFit] = useState<{ sizes: string[]; lengths: number[] } | null>(
    null,
  );
  useSeo("Size guide — PERIS");
  useEffect(() => {
    void Promise.all([
      fetch("/api/v1/sizes").then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("sizes")),
      ),
      fetch("/api/v1/lengths").then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("lengths")),
      ),
    ])
      .then(
        ([sizesBody, lengthsBody]: [
          { sizes: string[] },
          { lengths: number[] },
        ]) => {
          setFit({
            sizes: sizesBody.sizes.length ? sizesBody.sizes : [...ABAYA_SIZES],
            lengths: lengthsBody.lengths.length
              ? lengthsBody.lengths
              : [...ABAYA_LENGTHS],
          });
        },
      )
      .catch(() =>
        setFit({ sizes: [...ABAYA_SIZES], lengths: [...ABAYA_LENGTHS] }),
      );
  }, []);
  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <header className="page-intro">
        <p className="eyebrow">{sizeGuideEyebrow}</p>
        <h1>Size guide</h1>
      </header>
      <p className="draft-banner">{sizeGuideBanner}</p>
      {fit ? (
        <p className="lede" style={{ marginTop: 24 }}>
          Ready pieces are offered in {houseList(fit.sizes)}.{" "}
          {lengthSentence(fit.lengths)} Bespoke orders use your own height,
          shoulder, sleeve, chest, waist, and desired length.
        </p>
      ) : (
        <p className="lede" style={{ marginTop: 24 }}>
          Opening the size guide.
        </p>
      )}
    </div>
  );
}

export function TrackPage() {
  const trackEyebrow = useTrackEyebrow();
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [order, setOrder] = useState<PublicOrder | null>(null);
  useSeo("Track an order — PERIS");

  return (
    <div className="wrap" style={{ paddingBottom: 80, maxWidth: 720 }}>
      <header className="page-intro">
        <p className="eyebrow">{trackEyebrow}</p>
        <h1>Track an order</h1>
      </header>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault();
          setOrder(null);
          if (!number.trim() || !email.includes("@")) {
            setNote("Enter the order number and the email used at checkout.");
            return;
          }
          setNote("");
          void trackOrder(number, email)
            .then(setOrder)
            .catch((error: unknown) =>
              setNote(
                error instanceof Error
                  ? error.message
                  : "The order could not be opened.",
              ),
            );
        }}
      >
        <label className="field">
          <span>Order number</span>
          <input
            value={number}
            onChange={(event) => setNumber(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {note ? <p className="notice">{note}</p> : null}
        <button
          type="submit"
          className="btn btn-fill"
          style={{ justifySelf: "start" }}
        >
          Look up
        </button>
      </form>
      {order ? (
        <div style={{ marginTop: 28 }}>
          <OrderReceipt order={order} />
        </div>
      ) : null}
    </div>
  );
}

export function NotFoundPage() {
  const notFoundEyebrow = useNotFoundEyebrow();
  useSeo("Page not found — PERIS");
  return (
    <div className="wrap page-intro" style={{ paddingBottom: 100 }}>
      <p className="eyebrow">{notFoundEyebrow}</p>
      <h1>This page is not in the house</h1>
      <Link to="/" className="btn btn-fill" style={{ marginTop: 24 }}>
        Return home
      </Link>
    </div>
  );
}

export function MaintenancePage() {
  const hours = useHours();
  const address = useAddress();
  const maintenanceEyebrow = useMaintenanceEyebrow();
  useSeo("PERIS");
  return (
    <div className="wrap page-intro" style={{ minHeight: "70vh" }}>
      <p className="eyebrow">{maintenanceEyebrow}</p>
      <h1>The house is briefly closed</h1>
      <p className="lede" style={{ marginTop: 16 }}>
        The boutique remains open. {hours} {address}
      </p>
    </div>
  );
}
