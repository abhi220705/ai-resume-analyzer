"use client";

import { useState, type ReactNode } from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  PDFDownloadLink,
  PDFViewer,
} from "@react-pdf/renderer";

import type { ResumeBuilderData } from "@/lib/resume-builder";

type Props = {
  resume: ResumeBuilderData;
  photo: string | null;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 46,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.45,
    color: "#1c1917",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1.5,
    borderBottomColor: "#115e59",
    paddingBottom: 13,
    marginBottom: 4,
  },
  headerText: {
    flexGrow: 1,
    flexShrink: 1,
  },
  name: {
    fontSize: 23,
    fontWeight: "bold",
    lineHeight: 1.2,
  },
  headline: {
    fontSize: 11,
    color: "#115e59",
    marginTop: 5,
  },
  contact: {
    fontSize: 9,
    color: "#57534e",
    marginTop: 5,
  },
  photo: {
    width: 68,
    height: 68,
    objectFit: "cover",
    marginLeft: 16,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#115e59",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 15,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d6d3d1",
  },
  item: {
    marginBottom: 9,
  },
  bold: {
    fontWeight: "bold",
  },
  muted: {
    fontSize: 9,
    color: "#57534e",
    marginTop: 2,
  },
  paragraph: {
    marginTop: 3,
  },
  bullet: {
    marginTop: 3,
    paddingLeft: 9,
  },
  link: {
    fontSize: 9,
    color: "#115e59",
    marginTop: 3,
    textDecoration: "none",
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#78716c",
    textAlign: "right",
  },
});

function clean(value: string): string {
  return value.trim();
}

function month(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return "";

  const [year, number] = value.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const label = months[Number(number) - 1];
  return label ? `${label} ${year}` : "";
}

function dates(start: string, end: string): string {
  return [start, end].filter(Boolean).join(" - ");
}

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());

    if (!["https:", "http:"].includes(url.protocol)) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function WebLink({
  label,
  value,
}: {
  label?: string;
  value: string;
}) {
  if (!value.trim()) return null;

  const href = safeUrl(value);
  const text = label ? `${label}: ${value.trim()}` : value.trim();

  return href ? (
    <Link src={href} style={styles.link}>
      {text}
    </Link>
  ) : (
    <Text style={styles.muted}>{text}</Text>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View>
      <Text style={styles.sectionHeading} minPresenceAhead={35}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items
        .map(clean)
        .filter(Boolean)
        .map((item, index) => (
          <Text
            key={index}
            style={styles.bullet}
            orphans={2}
            widows={2}
          >
            • {item}
          </Text>
        ))}
    </>
  );
}

function ResumeDocument({ resume, photo }: Props) {
  const personal = resume.personal;

  const education = resume.education.filter(
    (entry) =>
      clean(entry.institution) ||
      clean(entry.qualification) ||
      clean(entry.fieldOfStudy) ||
      clean(entry.grade) ||
      clean(entry.details),
  );

  const experience = resume.experience.filter(
    (entry) =>
      clean(entry.company) ||
      clean(entry.role) ||
      entry.bullets.some(clean),
  );

  const projects = resume.projects.filter(
    (entry) =>
      clean(entry.name) ||
      clean(entry.role) ||
      clean(entry.link) ||
      entry.technologies.some(clean) ||
      entry.bullets.some(clean),
  );

  const skills = resume.skillGroups
    .map((group) => ({
      ...group,
      skills: group.skills.map(clean).filter(Boolean),
    }))
    .filter((group) => group.skills.length > 0);

  const achievements = resume.achievements.filter(
    (entry) =>
      clean(entry.title) ||
      clean(entry.organization) ||
      clean(entry.details),
  );

  return (
    <Document
      title={resume.title.trim() || "Resume"}
      author={personal.fullName.trim()}
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} wrap={false}>
          <View style={styles.headerText}>
            <Text style={styles.name}>
              {personal.fullName.trim() || "Your name"}
            </Text>

            {clean(personal.headline) && (
              <Text style={styles.headline}>
                {personal.headline.trim()}
              </Text>
            )}

            <Text style={styles.contact}>
              {[
                personal.email,
                personal.phone,
                personal.location,
              ]
                .map(clean)
                .filter(Boolean)
                .join(" | ")}
            </Text>

            <WebLink label="LinkedIn" value={personal.linkedin} />
            <WebLink label="GitHub" value={personal.github} />
            <WebLink label="Portfolio" value={personal.portfolio} />
          </View>

          {resume.photo.showOnResume && photo && (
            <Image src={photo} style={styles.photo} />
          )}
        </View>

        {clean(personal.summary) && (
          <Section title="Professional summary">
            <Text style={styles.paragraph} orphans={2} widows={2}>
              {personal.summary.trim()}
            </Text>
          </Section>
        )}

        {education.length > 0 && (
          <Section title="Education">
            {education.map((entry) => {
              const end = entry.currentlyStudying
                ? entry.endDate
                  ? `Expected ${month(entry.endDate)}`
                  : "Present"
                : month(entry.endDate);

              return (
                <View key={entry.id} style={styles.item}>
                  <Text style={styles.bold} minPresenceAhead={25}>
                    {entry.institution.trim()}
                  </Text>

                  <Text>
                    {[entry.qualification, entry.fieldOfStudy]
                      .map(clean)
                      .filter(Boolean)
                      .join(" - ")}
                  </Text>

                  <Text style={styles.muted}>
                    {dates(month(entry.startDate), end)}
                  </Text>

                  {clean(entry.grade) && (
                    <Text style={styles.muted}>
                      {entry.grade.trim()}
                    </Text>
                  )}

                  {clean(entry.details) && (
                    <Text style={styles.paragraph}>
                      {entry.details.trim()}
                    </Text>
                  )}
                </View>
              );
            })}
          </Section>
        )}

        {experience.length > 0 && (
          <Section title="Work experience">
            {experience.map((entry) => (
              <View key={entry.id} style={styles.item}>
                <Text style={styles.bold} minPresenceAhead={25}>
                  {[entry.role, entry.company]
                    .map(clean)
                    .filter(Boolean)
                    .join(" - ")}
                </Text>

                <Text style={styles.muted}>
                  [
                  {/* Content is supplied below as one string. */}
                  {""}
                </Text>
                <Text style={styles.muted}>
                  {[
                    entry.location.trim(),
                    dates(
                      month(entry.startDate),
                      entry.currentlyWorking
                        ? "Present"
                        : month(entry.endDate),
                    ),
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>

                <Bullets items={entry.bullets} />
              </View>
            ))}
          </Section>
        )}

        {projects.length > 0 && (
          <Section title="Projects">
            {projects.map((entry) => (
              <View key={entry.id} style={styles.item}>
                <Text style={styles.bold} minPresenceAhead={25}>
                  {entry.name.trim()}
                </Text>

                {clean(entry.role) && (
                  <Text style={styles.muted}>
                    {entry.role.trim()}
                  </Text>
                )}

                {entry.technologies.some(clean) && (
                  <Text style={styles.muted}>
                    {entry.technologies
                      .map(clean)
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                )}

                <WebLink value={entry.link} />
                <Bullets items={entry.bullets} />
              </View>
            ))}
          </Section>
        )}

        {skills.length > 0 && (
          <Section title="Skills">
            {skills.map((group) => (
              <Text key={group.id} style={styles.paragraph}>
                {clean(group.category) && (
                  <Text style={styles.bold}>
                    {group.category.trim()}:{" "}
                  </Text>
                )}
                {group.skills.join(", ")}
              </Text>
            ))}
          </Section>
        )}

        {achievements.length > 0 && (
          <Section title="Achievements & certifications">
            {achievements.map((entry) => (
              <View key={entry.id} style={styles.item}>
                <Text style={styles.bold} minPresenceAhead={25}>
                  {entry.title.trim()}
                </Text>

                <Text style={styles.muted}>
                  [
                  {/* Content is supplied below as one string. */}
                  {""}
                </Text>
                <Text style={styles.muted}>
                  {[
                    entry.organization.trim(),
                    month(entry.date),
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>

                {clean(entry.details) && (
                  <Text style={styles.paragraph}>
                    {entry.details.trim()}
                  </Text>
                )}
              </View>
            ))}
          </Section>
        )}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}

export default function ResumeBuilderPdf({
  resume,
  photo,
}: Props) {
  const [snapshot, setSnapshot] = useState<Props | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function preparePdf() {
    setSnapshot({
      resume: structuredClone(resume),
      photo,
    });
    setShowPreview(false);
  }

  const fileName = snapshot
    ? `${
        snapshot.resume.title
          .trim()
          .replace(/[^a-zA-Z0-9_-]+/g, "-")
          .replace(/^-+|-+$/g, "") || "Resume"
      }.pdf`
    : "Resume.pdf";

  return (
    <section
      aria-labelledby="pdf-export-heading"
      className="mb-6 rounded-xl border border-stone-200 bg-white p-5"
    >
      <h2 id="pdf-export-heading" className="text-lg font-semibold">
        Preview & download PDF
      </h2>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        Prepare a PDF from the current editor contents. Preparing
        or downloading a PDF does not save your draft.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={preparePdf}
          className="ui-button ui-button-primary"
        >
          {snapshot ? "Update PDF from editor" : "Prepare PDF"}
        </button>

        {snapshot && (
          <>
            <button
              type="button"
              className="ui-button"
              onClick={() => setShowPreview((current) => !current)}
            >
              {showPreview ? "Hide PDF preview" : "Preview PDF"}
            </button>

            <PDFDownloadLink
              document={<ResumeDocument {...snapshot} />}
              fileName={fileName}
              className="ui-button"
            >
              {({ loading, error }) =>
                error
                  ? "PDF failed — try preparing again"
                  : loading
                    ? "Generating PDF..."
                    : "Download PDF"
              }
            </PDFDownloadLink>
          </>
        )}
      </div>

      {snapshot && (
        <p className="mt-3 text-xs leading-5 text-stone-500">
          This PDF uses the details captured when you clicked
          Prepare or Update. After editing, click “Update PDF from
          editor” before downloading again.
        </p>
      )}

      {snapshot && showPreview && (
        <div className="mt-5">
          <PDFViewer
            width="100%"
            height={650}
            showToolbar
            className="rounded-lg border border-stone-200"
          >
            <ResumeDocument {...snapshot} />
          </PDFViewer>

          <p className="mt-2 text-xs text-stone-500">
            If your browser cannot display the preview, download
            the PDF and open it in a PDF viewer.
          </p>
        </div>
      )}
    </section>
  );
}