import { useState } from "react";
import { staffFetch } from "@/store/useStaffSession";

type ImageUploadFieldProps = {
  label: string;
  value: string;
  kind: "product" | "brand";
  onChange: (url: string) => void;
  required?: boolean;
  className?: string;
};

const maxBytes = 6_000_000;

export function ImageUploadField({
  label,
  value,
  kind,
  onChange,
  required = false,
  className = "",
}: ImageUploadFieldProps) {
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");

  async function onFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNote("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > maxBytes) {
      setNote("Keep the image under 6 MB.");
      return;
    }
    setPending(true);
    setNote("");
    try {
      const data = await readAsDataUrl(file);
      const body = await staffFetch<{ url: string }>("/api/v1/admin/uploads", {
        method: "POST",
        body: JSON.stringify({
          kind,
          filename: file.name,
          contentType: file.type,
          data,
        }),
      });
      onChange(body.url);
    } catch (error: unknown) {
      setNote(error instanceof Error ? error.message : "The image was not uploaded.");
    } finally {
      setPending(false);
    }
  }

  return (
    <label className={`field image-upload ${className}`.trim()}>
      <span>{label}</span>
      {value ? (
        <img className="image-upload__preview" src={value} alt="" />
      ) : (
        <div className="image-upload__empty">No image yet</div>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={pending}
        required={required && !value}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          void onFile(file);
        }}
      />
      {pending ? <small className="field-error">Uploading…</small> : null}
      {note ? <small className="field-error">{note}</small> : null}
    </label>
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("The image could not be read."));
    };
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}
