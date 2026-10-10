"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { authenticatedRequest } from "@/lib/api";

type Company = {
  id: string;
  ownerId: string;
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  description: string | null;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
};

const fields = [
  { name: "name", label: "Company name", max: 150 },
  { name: "website", label: "Website", max: 500 },
  { name: "industry", label: "Industry", max: 100 },
  { name: "location", label: "Location", max: 150 },
] as const;

export function CompanyForm() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCompany() {
      try {
        const data = await authenticatedRequest<{
          company: Company | null;
        }>("/api/company");

        if (active) setCompany(data.company);
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load company details.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCompany();

    return () => {
      active = false;
    };
  }, []);

  const canEdit = Boolean(
    user?.role === "RECRUITER" &&
      (!company || company.ownerId === user.id),
  );

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || saving) return;

    const form = new FormData(event.currentTarget);
    const creating = company === null;

    function optionalValue(field: string) {
      return String(form.get(field) ?? "").trim() || null;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const data = await authenticatedRequest<{ company: Company }>(
        "/api/company",
        {
          method: creating ? "POST" : "PATCH",
          body: JSON.stringify({
            name: String(form.get("name") ?? "").trim(),
            website: optionalValue("website"),
            industry: optionalValue("industry"),
            location: optionalValue("location"),
            description: optionalValue("description"),
          }),
        },
      );

      setCompany(data.company);
      setSuccess(
        creating
          ? "Company created successfully."
          : "Company updated successfully.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save company details.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p role="status">Loading company details...</p>;
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
        <p>{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="ui-panel">
      <h2 className="text-xl font-bold">
        {company ? "Company details" : "Create your company"}
      </h2>

      {company && (
        <p className="mt-3 text-sm text-stone-600">
          Verification status:{" "}
          <span className="font-semibold">{company.verificationStatus}</span>
        </p>
      )}

      {!canEdit && (
        <p className="mt-3 text-stone-600">
          Only the company owner can edit these details.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="mt-4 text-emerald-700">
          {success}
        </p>
      )}

      <form
        key={company?.id ?? "new-company"}
        onSubmit={saveCompany}
        className="mt-6"
      >
        <fieldset disabled={saving || !canEdit} className="space-y-5">
          {fields.map((field) => (
            <label key={field.name} className="block">
              <span className="font-medium">
                {field.label}
                {field.name === "name" ? " *" : ""}
              </span>
              <input
                name={field.name}
                type={field.name === "website" ? "url" : "text"}
                defaultValue={company?.[field.name] ?? ""}
                required={field.name === "name"}
                minLength={field.name === "name" ? 2 : undefined}
                maxLength={field.max}
                placeholder={
                  field.name === "website" ? "https://example.com" : undefined
                }
                className="ui-input mt-2 w-full"
              />
            </label>
          ))}

          <label className="block">
            <span className="font-medium">Description</span>
            <textarea
              name="description"
              defaultValue={company?.description ?? ""}
              maxLength={2000}
              rows={4}
              className="ui-input mt-2 w-full"
            />
          </label>

          {canEdit && (
            <>
              <p className="text-sm text-stone-600">
                Saving company details sets verification to UNVERIFIED.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="ui-button ui-button-primary"
              >
                {saving
                  ? "Saving..."
                  : company
                    ? "Save company"
                    : "Create company"}
              </button>
            </>
          )}
        </fieldset>
      </form>
    </section>
  );
}