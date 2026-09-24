import { useEffect, useState } from "react";
import { PageHead } from "../../components/shell/PageHead";
import {
  listTemplates,
  createTemplate as createTemplateApi,
  updateTemplate as updateTemplateApi,
  deleteTemplate as deleteTemplateApi,
} from "../../api/templates/templates.api";

export type TemplateLureType = "urgency" | "authority" | "curiosity" | "reward";
export type TemplateCategory =
  | "credential-harvest"
  | "attachment"
  | "link-click"
  | "awareness";
export type TemplateDifficulty = "easy" | "medium" | "hard";

export interface PhishingTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  lureType: TemplateLureType;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  disclaimerEnabled: boolean;
}

type TemplateFormValues = Omit<PhishingTemplate, "id">;
type ModalState =
  | "create"
  | { edit: PhishingTemplate }
  | { preview: PhishingTemplate }
  | { detail: PhishingTemplate }
  | null;

const LURE_TYPES: Array<{ value: TemplateLureType; label: string }> = [
  { value: "urgency", label: "Urgency" },
  { value: "authority", label: "Authority" },
  { value: "curiosity", label: "Curiosity" },
  { value: "reward", label: "Reward" },
];
const CATEGORIES: Array<{ value: TemplateCategory; label: string }> = [
  { value: "credential-harvest", label: "Credential harvest" },
  { value: "attachment", label: "Malicious attachment" },
  { value: "link-click", label: "Link click" },
  { value: "awareness", label: "Security awareness" },
];
const DIFFICULTIES: TemplateDifficulty[] = ["easy", "medium", "hard"];

const SAMPLE_HTML = `<p>Dear employee,</p><p>Your corporate password is about to expire. Please <a href="{{tracking_link}}">click here to reset it immediately</a>.</p><p>If you do not act within 24 hours your account will be locked.</p><img src="{{tracking_pixel}}" width="1" height="1" style="display:none"/>`;
const SAMPLE_TEXT =
  "Your password is about to expire. Reset it at: {{tracking_link}}";

const SEED_TEMPLATES: PhishingTemplate[] = [
  {
    id: "TPL-1001",
    name: "Urgent IT Password Reset",
    subject: "[ACTION REQUIRED] Your password will expire in 24 hours",
    htmlBody: SAMPLE_HTML,
    textBody: SAMPLE_TEXT,
    lureType: "urgency",
    category: "credential-harvest",
    difficulty: "medium",
    disclaimerEnabled: false,
  },
  {
    id: "TPL-1002",
    name: "Finance Invoice Review",
    subject: "Invoice approval needed before close of business",
    htmlBody: "<p>Please review the attached invoice before today’s close.</p>",
    textBody: "Please review the attached invoice before today’s close.",
    lureType: "authority",
    category: "attachment",
    difficulty: "hard",
    disclaimerEnabled: true,
  },
];

const ICON_PLUS = (
  <svg
    className="ax-btn__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const ICON_EYE = (
  <svg
    className="ax-btn__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);
const ICON_EDIT = (
  <svg
    className="ax-btn__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m4 16 0 4 4 0 11-11a2.8 2.8 0 0 0-4-4L4 16Z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);
const ICON_DELETE = (
  <svg
    className="ax-btn__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12h12l1-12M9 7V4h6v3" />
  </svg>
);
const ICON_CLOSE = (
  <svg
    className="ax-btn__icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

const labelFor = <T extends string>(
  options: Array<{ value: T; label: string }>,
  value: T,
) => options.find((option) => option.value === value)?.label ?? value;

function TemplateForm({
  initial,
  mode,
  onCancel,
  onSubmit,
}: {
  initial?: PhishingTemplate;
  mode: "create" | "edit";
  onCancel: () => void;
  onSubmit: (values: TemplateFormValues) => void;
}) {
  const [form, setForm] = useState<TemplateFormValues>(
    initial ?? {
      name: "",
      subject: "",
      htmlBody: SAMPLE_HTML,
      textBody: SAMPLE_TEXT,
      lureType: "urgency",
      category: "credential-harvest",
      difficulty: "medium",
      disclaimerEnabled: false,
    },
  );
  const set = <K extends keyof TemplateFormValues>(
    key: K,
    value: TemplateFormValues[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(form);
  };
  const previewHtml = form.htmlBody
    .replaceAll("{{tracking_link}}", "#preview-link")
    .replaceAll(
      "{{tracking_pixel}}",
      "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
    );

  return (
    <div
      role="presentation"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onCancel()
      }
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--ax-space-4)",
        background: "rgba(15,18,25,.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="ax-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-form-title"
        style={{
          width: "100%",
          maxWidth: 760,
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div className="ax-card__header">
          <div className="ax-card__titles">
            <h2 className="ax-card__title" id="template-form-title">
              {mode === "create"
                ? "Create phishing template"
                : "Edit phishing template"}
            </h2>
            <p className="ax-card__subtitle">
              Define the message and simulation metadata.
            </p>
          </div>
          <button
            type="button"
            className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
            aria-label="Close"
            onClick={onCancel}
          >
            {ICON_CLOSE}
          </button>
        </div>
        <form onSubmit={submit}>
          <div
            className="ax-card__body"
            style={{ display: "grid", gap: "var(--ax-space-4)" }}
          >
            <div className="ax-field">
              <label className="ax-label" htmlFor="template-name">
                Name
              </label>
              <input
                id="template-name"
                className="ax-input"
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="Urgent IT Password Reset"
                required
              />
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="template-subject">
                Subject
              </label>
              <input
                id="template-subject"
                className="ax-input"
                value={form.subject}
                onChange={(event) => set("subject", event.target.value)}
                placeholder="[ACTION REQUIRED] Your password will expire"
                required
              />
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="template-html">
                HTML body
              </label>
              <textarea
                id="template-html"
                className="ax-textarea"
                rows={8}
                value={form.htmlBody}
                onChange={(event) => set("htmlBody", event.target.value)}
                required
              />
              <div style={{ marginBlockStart: "var(--ax-space-3)" }}>
                <span className="ax-label">Live preview</span>
                <iframe
                  title="Live phishing template preview"
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  srcDoc={`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#17202a;padding:20px;line-height:1.5">${previewHtml}</body></html>`}
                  style={{
                    display: "block",
                    width: "100%",
                    minHeight: 220,
                    marginBlockStart: "var(--ax-space-2)",
                    border: "1px solid var(--ax-border)",
                    borderRadius: "var(--ax-radius-md)",
                    background: "#fff",
                  }}
                />
              </div>
            </div>
            <div className="ax-field">
              <label className="ax-label" htmlFor="template-text">
                Text body
              </label>
              <textarea
                id="template-text"
                className="ax-textarea"
                rows={4}
                value={form.textBody}
                onChange={(event) => set("textBody", event.target.value)}
                required
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "var(--ax-space-3)",
              }}
            >
              <div className="ax-field">
                <label className="ax-label" htmlFor="template-lure">
                  Lure type
                </label>
                <select
                  id="template-lure"
                  className="ax-select"
                  value={form.lureType}
                  onChange={(event) =>
                    set("lureType", event.target.value as TemplateLureType)
                  }
                >
                  {LURE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ax-field">
                <label className="ax-label" htmlFor="template-category">
                  Category
                </label>
                <select
                  id="template-category"
                  className="ax-select"
                  value={form.category}
                  onChange={(event) =>
                    set("category", event.target.value as TemplateCategory)
                  }
                >
                  {CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ax-field">
                <label className="ax-label" htmlFor="template-difficulty">
                  Difficulty
                </label>
                <select
                  id="template-difficulty"
                  className="ax-select"
                  value={form.difficulty}
                  onChange={(event) =>
                    set("difficulty", event.target.value as TemplateDifficulty)
                  }
                >
                  {DIFFICULTIES.map((value) => (
                    <option key={value} value={value}>
                      {value[0].toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="ax-check">
              <input
                type="checkbox"
                className="ax-checkbox"
                checked={form.disclaimerEnabled}
                onChange={(event) =>
                  set("disclaimerEnabled", event.target.checked)
                }
              />
              <span>Include organisation disclaimer</span>
            </label>
          </div>
          <div
            className="ax-card__footer ax-cluster"
            style={{ justifyContent: "flex-end", gap: "var(--ax-space-3)" }}
          >
            <button
              type="button"
              className="ax-btn ax-btn--secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button type="submit" className="ax-btn ax-btn--primary">
              {mode === "create" ? "Create template" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TemplatePreview({
  template,
  onClose,
}: {
  template: PhishingTemplate;
  onClose: () => void;
}) {
  const renderedHtml = template.htmlBody
    .replaceAll("{{tracking_link}}", "#preview-link")
    .replaceAll(
      "{{tracking_pixel}}",
      "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
    );
  return (
    <div
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--ax-space-4)",
        background: "rgba(15,18,25,.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="ax-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-preview-title"
        style={{
          width: "100%",
          maxWidth: 760,
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div className="ax-card__header">
          <div className="ax-card__titles">
            <span className="ax-card__eyebrow">Template preview</span>
            <h2 className="ax-card__title" id="template-preview-title">
              {template.subject}
            </h2>
            <p className="ax-card__subtitle">
              Preview tokens are rendered as safe preview values.
            </p>
          </div>
          <button
            type="button"
            className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
            aria-label="Close preview"
            onClick={onClose}
          >
            {ICON_CLOSE}
          </button>
        </div>
        <div
          className="ax-card__body"
          style={{ display: "grid", gap: "var(--ax-space-5)" }}
        >
          <iframe
            title={`${template.name} HTML preview`}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#17202a;padding:24px;line-height:1.5">${renderedHtml}</body></html>`}
            style={{
              width: "100%",
              minHeight: 280,
              border: "1px solid var(--ax-border)",
              borderRadius: "var(--ax-radius-md)",
              background: "#fff",
            }}
          />
          <div>
            <h3 className="ax-card__title">Plain-text fallback</h3>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                color: "var(--ax-text-muted)",
                fontFamily: "var(--ax-font-mono)",
                fontSize: "var(--ax-text-sm)",
              }}
            >
              {template.textBody}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateDetails({
  template,
  onClose,
}: {
  template: PhishingTemplate;
  onClose: () => void;
}) {
  return (
    <div
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--ax-space-4)",
        background: "rgba(15,18,25,.5)",
      }}
    >
      <div
        className="ax-card"
        role="dialog"
        aria-modal="true"
        style={{ width: "100%", maxWidth: 620 }}
      >
        <div className="ax-card__header">
          <div className="ax-card__titles">
            <span className="ax-card__eyebrow">{template.id}</span>
            <h2 className="ax-card__title">{template.name}</h2>
          </div>
          <button
            type="button"
            className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
            aria-label="Close details"
            onClick={onClose}
          >
            {ICON_CLOSE}
          </button>
        </div>
        <dl
          className="ax-card__body"
          style={{ display: "grid", gap: "var(--ax-space-3)", margin: 0 }}
        >
          {[
            ["Subject", template.subject],
            ["Lure type", labelFor(LURE_TYPES, template.lureType)],
            ["Category", labelFor(CATEGORIES, template.category)],
            ["Difficulty", template.difficulty],
            [
              "Disclaimer enabled",
              template.disclaimerEnabled ? "True" : "False",
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="ax-cluster"
              style={{
                justifyContent: "space-between",
                gap: "var(--ax-space-4)",
              }}
            >
              <dt style={{ color: "var(--ax-text-muted)" }}>{label}</dt>
              <dd style={{ margin: 0, color: "var(--ax-text-strong)" }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function Templates() {
  const [templates, setTemplates] = useState(SEED_TEMPLATES);
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    listTemplates().then((data) => { if (data.length) setTemplates(data); });
  }, []);

  const createTemplate = async (values: TemplateFormValues) => {
    try {
      const created = await createTemplateApi(values);
      setTemplates((current) => [created, ...current]);
    } catch {
      setTemplates((current) => [{ ...values, id: `TPL-${Date.now()}` }, ...current]);
    }
    setModal(null);
  };
  const updateTemplate = async (values: TemplateFormValues) => {
    if (modal && typeof modal === "object" && "edit" in modal) {
      try {
        const updated = await updateTemplateApi(modal.edit.id, values);
        setTemplates((current) => current.map((t) => t.id === modal.edit.id ? updated : t));
      } catch {
        setTemplates((current) => current.map((t) => t.id === modal.edit.id ? { ...values, id: t.id } : t));
      }
    }
    setModal(null);
  };
  const deleteTemplate = async (template: PhishingTemplate) => {
    if (window.confirm(`Delete template "${template.name}"?`)) {
      try { await deleteTemplateApi(template.id); } catch { /* ignore */ }
      setTemplates((current) => current.filter((t) => t.id !== template.id));
    }
  };

  return (
    <>
      <PageHead
        title="Templates"
        subtitle="Create, inspect, and preview authorised phishing simulation templates."
      />
      <div
        className="ax-cluster"
        style={{
          gap: "var(--ax-space-2)",
          marginBlockEnd: "var(--ax-space-5)",
        }}
      >
        <button
          type="button"
          className="ax-btn ax-btn--primary"
          onClick={() => setModal("create")}
        >
          {ICON_PLUS}
          <span className="ax-btn__label">Create Template</span>
        </button>
      </div>
      <div className="ax-dash-grid">
        <section
          className="ax-card ax-col--12"
          role="region"
          aria-label="Phishing templates"
        >
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">Phishing templates</h2>
              <p className="ax-card__subtitle">
                {templates.length} template{templates.length === 1 ? "" : "s"}{" "}
                available for campaign creation.
              </p>
            </div>
          </div>
          <div className="ax-table-wrap" style={{ overflowX: "auto" }}>
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  {[
                    "Name",
                    "Subject",
                    "Lure type",
                    "Category",
                    "Difficulty",
                    "Disclaimer",
                    "Actions",
                  ].map((heading) => (
                    <th className="ax-table__th" scope="col" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr className="ax-table__row" key={template.id}>
                    <td
                      className="ax-table__td"
                      style={{
                        color: "var(--ax-text-strong)",
                        fontWeight: "var(--ax-weight-medium)",
                      }}
                    >
                      {template.name}
                    </td>
                    <td className="ax-table__td" style={{ minWidth: 280 }}>
                      {template.subject}
                    </td>
                    <td className="ax-table__td">
                      {labelFor(LURE_TYPES, template.lureType)}
                    </td>
                    <td className="ax-table__td">
                      {labelFor(CATEGORIES, template.category)}
                    </td>
                    <td className="ax-table__td">
                      <span className="ax-badge ax-badge--soft ax-badge--pill">
                        {template.difficulty}
                      </span>
                    </td>
                    <td className="ax-table__td">
                      {template.disclaimerEnabled ? "True" : "False"}
                    </td>
                    <td className="ax-table__td">
                      <div
                        className="ax-cluster"
                        style={{ gap: "var(--ax-space-1)" }}
                      >
                        <button
                          type="button"
                          className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                          aria-label={`Preview ${template.name}`}
                          onClick={() => setModal({ preview: template })}
                        >
                          {ICON_EYE}
                        </button>
                        <button
                          type="button"
                          className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                          aria-label={`Edit ${template.name}`}
                          onClick={() => setModal({ edit: template })}
                        >
                          {ICON_EDIT}
                        </button>
                        <button
                          type="button"
                          className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                          aria-label={`Delete ${template.name}`}
                          onClick={() => deleteTemplate(template)}
                        >
                          {ICON_DELETE}
                        </button>
                        <button
                          type="button"
                          className="ax-btn ax-btn--ghost ax-btn--sm"
                          onClick={() => setModal({ detail: template })}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {modal === "create" && (
        <TemplateForm
          mode="create"
          onCancel={() => setModal(null)}
          onSubmit={createTemplate}
        />
      )}
      {modal && typeof modal === "object" && "edit" in modal && (
        <TemplateForm
          mode="edit"
          initial={modal.edit}
          onCancel={() => setModal(null)}
          onSubmit={updateTemplate}
        />
      )}
      {modal && typeof modal === "object" && "preview" in modal && (
        <TemplatePreview
          template={modal.preview}
          onClose={() => setModal(null)}
        />
      )}
      {modal && typeof modal === "object" && "detail" in modal && (
        <TemplateDetails
          template={modal.detail}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

export default Templates;
