"use client";

import { useEffect, useState, type FormEvent } from "react";
import { authenticatedRequest } from "@/lib/api";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

type CompanyRow = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  description: string | null;
  verificationStatus: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
};

type ListData = {
  users?: UserRow[];
  companies?: CompanyRow[];
  page: number;
  hasMore: boolean;
};

type View = "users" | "companies";

const buttonClass =
  "ui-button";

export function AdminManagement() {
  const [view, setView] = useState<View>("users");

  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-bold">Platform management</h2>

      <div className="ui-segmented">
        {(["users", "companies"] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={view === item}
            onClick={() => setView(item)}
            className={`${buttonClass} ${
              view === item ? "bg-teal-50 text-teal-800" : "bg-white"
            }`}
          >
            {item === "users" ? "Users" : "Companies"}
          </button>
        ))}
      </div>

      <ManagementList key={view} view={view} />
    </section>
  );
}

function ManagementList({ view }: { view: View }) {
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    setLoading(true);
    setData(null);
    setError("");

    void authenticatedRequest<ListData>(`/api/admin/${view}?page=${page}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((error: unknown) => {
        if (active) {
          setError(
            error instanceof Error ? error.message : "Unable to load records.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [view, page, reload]);

  async function updateVerification(
    event: FormEvent<HTMLFormElement>,
    company: CompanyRow,
  ) {
    event.preventDefault();
    if (savingId) return;

    const form = new FormData(event.currentTarget);
    const status = String(form.get("status") ?? "");

    setError("");
    setSuccess("");

    if (status === company.verificationStatus) {
      setSuccess("Choose a different status to make a change.");
      return;
    }

    setSavingId(company.id);

    try {
      await authenticatedRequest(
        `/api/admin/companies/${company.id}/verification`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            expectedUpdatedAt: company.updatedAt,
          }),
        },
      );

      setSuccess(
        `Status updated for ${company.name}. Refresh the statistics above to update the totals.`,
      );
      setLoading(true);
      setReload((value) => value + 1);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to update status.",
      );
    } finally {
      setSavingId("");
    }
  }

  function changePage(nextPage: number) {
    setLoading(true);
    setSuccess("");
    setPage(nextPage);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-stone-600">Page {page} · Up to 20 records</p>
        <button
          type="button"
          disabled={loading || Boolean(savingId)}
          className={buttonClass}
          onClick={() => {
            setLoading(true);
            setSuccess("");
            setReload((value) => value + 1);
          }}
        >
          Refresh list
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">
          {success}
        </p>
      )}

      {loading ? (
        <p role="status">Loading records...</p>
      ) : data ? (
        <>
          {view === "users" ? (
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Registered platform users</caption>
                <thead className="bg-stone-100">
                  <tr>
                    {["Name", "Email", "Role", "Joined"].map((heading) => (
                      <th key={heading} scope="col" className="p-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.users?.map((user) => (
                    <tr key={user.id} className="border-t border-stone-200">
                      <td className="p-3">{user.name}</td>
                      <td className="break-all p-3">{user.email}</td>
                      <td className="p-3">{user.role}</td>
                      <td className="whitespace-nowrap p-3">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {!data.users?.length && (
                    <tr>
                      <td colSpan={4} className="p-4">No users on this page.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {!data.companies?.length && <p>No companies on this page.</p>}

              {data.companies?.map((company) => (
                <article
                  key={`${company.id}-${company.updatedAt}`}
                  className="ui-panel"
                >
                  <h3 className="text-xl font-bold">{company.name}</h3>
                  <p className="mt-2 font-semibold text-teal-700">
                    {company.verificationStatus}
                  </p>

                  <dl className="mt-4 space-y-2 text-sm">
                    <div>
                      <dt className="font-semibold">Owner</dt>
                      <dd className="break-all">
                        {company.owner.name} — {company.owner.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Website</dt>
                      <dd className="break-all">{company.website || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Industry / Location</dt>
                      <dd>
                        {company.industry || "Not provided"} /{" "}
                        {company.location || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Description</dt>
                      <dd className="whitespace-pre-wrap break-words">
                        {company.description || "Not provided"}
                      </dd>
                    </div>
                  </dl>

                  <form
                    className="mt-5"
                    onSubmit={(event) => void updateVerification(event, company)}
                  >
                    <fieldset
                      disabled={Boolean(savingId)}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <label className="block">
                        <span className="block text-sm font-semibold">
                          Verification status
                        </span>
                        <select
                          name="status"
                          defaultValue={company.verificationStatus}
                          className="ui-input mt-2"
                        >
                          <option value="UNVERIFIED">Unverified</option>
                          <option value="PENDING">Pending review</option>
                          <option value="VERIFIED">Verified</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </label>

                      <button type="submit" className={buttonClass}>
                        {savingId === company.id ? "Saving..." : "Save status"}
                      </button>
                    </fieldset>
                  </form>

                  <p className="mt-3 text-xs text-stone-600">
                    Mark verified only after reviewing the company. Editing
                    company details later resets its status to unverified.
                  </p>
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={loading || Boolean(savingId) || page === 1}
          onClick={() => changePage(page - 1)}
          className={buttonClass}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={
            loading || Boolean(savingId) || !data?.hasMore || page >= 9999
          }
          onClick={() => changePage(page + 1)}
          className={buttonClass}
        >
          Next
        </button>
      </div>
    </div>
  );
}