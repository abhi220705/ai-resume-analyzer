"use client";

import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

type Props = {
  value: string | null;
  showOnResume: boolean;
  onChange: (value: string | null) => void;
  onShowChange: (show: boolean) => void;
};

async function cropPhoto(
  source: string,
  area: Area,
): Promise<string> {
  const image = new Image();
  image.src = source;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Your browser could not process the photo.");
  }

  // Give transparent PNGs a white background in the JPEG output.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas.toDataURL("image/jpeg", 0.9);
}

export function ResumeBuilderPhoto({
  value,
  showOnResume,
  onChange,
  onShowChange,
}: Props) {
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!source) return;

    return () => {
      URL.revokeObjectURL(source);
    };
  }, [source]);

  async function selectPhoto(file: File) {
    setError("");

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Choose a JPG or PNG image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Choose an image smaller than 2 MB.");
      return;
    }

    setBusy(true);

    const nextSource = URL.createObjectURL(file);

    try {
      const image = new Image();
      image.src = nextSource;
      await image.decode();

      if (
        image.naturalWidth < 100 ||
        image.naturalHeight < 100
      ) {
        throw new Error(
          "Choose a photo at least 100 × 100 pixels.",
        );
      }

      if (
        image.naturalWidth > 8000 ||
        image.naturalHeight > 8000 ||
        image.naturalWidth * image.naturalHeight > 16000000
      ) {
        throw new Error(
          "This image is too large in dimensions. Resize it and try again.",
        );
      }

      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setArea(null);
      setSource(nextSource);
    } catch (err) {
      URL.revokeObjectURL(nextSource);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to open this photo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function applyCrop() {
    if (!source || !area || busy) return;

    setBusy(true);
    setError("");

    try {
      const croppedPhoto = await cropPhoto(source, area);
      onChange(croppedPhoto);
      setSource(null);
    } catch {
      setError("Unable to crop the photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function removePhoto() {
    onChange(null);
    onShowChange(false);
    setSource(null);
    setError("");
  }

  return (
    <section
      aria-labelledby="photo-editor-heading"
      className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4"
    >
      <h3
        id="photo-editor-heading"
        className="text-sm font-semibold"
      >
        Profile photo — optional
      </h3>

      <p className="mt-2 text-xs leading-5 text-stone-600">
        JPG or PNG, up to 2 MB. Your photo is not sent to AI.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {value ? (
          <img
            src={value}
            alt="Your cropped profile photo"
            width={80}
            height={80}
            className="h-20 w-20 rounded-lg border border-stone-200 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white text-xs text-stone-500">
            No photo
          </div>
        )}

        <label className="block min-w-0 flex-1 text-sm font-medium">
          {value ? "Choose a replacement photo" : "Choose a photo"}
          <input
            type="file"
            accept="image/jpeg,image/png"
            disabled={busy}
            className="mt-2 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-teal-800 file:px-3 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";

              if (file) {
                void selectPhoto(file);
              }
            }}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {busy && (
        <p role="status" className="mt-3 text-sm text-stone-600">
          Processing photo...
        </p>
      )}

      {source && (
        <div className="mt-5">
          <p className="mb-3 text-sm text-stone-600">
            Drag to reposition, then adjust the zoom.
          </p>

          <div
            className="relative h-72 overflow-hidden rounded-lg bg-stone-900"
            aria-label="Photo cropping area"
          >
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              aspect={1}
              minZoom={1}
              maxZoom={3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
              zoomWithScroll={false}
            />
          </div>

          <label className="mt-4 block text-sm font-medium">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              disabled={busy}
              onChange={(event) =>
                setZoom(Number(event.target.value))
              }
              className="mt-2 block w-full accent-teal-800"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="ui-button ui-button-primary"
              disabled={busy || !area}
              onClick={() => void applyCrop()}
            >
              Apply crop
            </button>

            <button
              type="button"
              className="ui-button"
              disabled={busy}
              onClick={() => {
                setSource(null);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {value && (
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={showOnResume}
              onChange={(event) =>
                onShowChange(event.target.checked)
              }
              className="h-4 w-4 accent-teal-800"
            />
            Show photo on resume
          </label>

          <button
            type="button"
            disabled={busy}
            onClick={removePhoto}
            className="rounded px-2 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"
          >
            Remove photo
          </button>
        </div>
      )}
    </section>
  );
}