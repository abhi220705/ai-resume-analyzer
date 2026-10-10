import Link from "next/link";
import { Brand, Icon } from "@/components/ui";
import { HeroBackgroundMedia } from "@/components/hero-background";
import { SmoothAnchor } from "@/components/smooth-anchor";

export default function HomePage() {
  return (
    <main className="public-page">
      <header className="public-header-wrapper">
        <div className="public-container">
          <div className="public-nav">
            <Link
              href="/"
              aria-label="AI Resume Analyzer home"
              className="nav-brand-link"
            >
              <Brand />
            </Link>

            <nav className="public-links" aria-label="Website navigation">
              <SmoothAnchor className="public-nav-link" href="#comparison">
                Examples
              </SmoothAnchor>
              <SmoothAnchor className="public-nav-link" href="#features">
                Features
              </SmoothAnchor>
              <SmoothAnchor className="public-nav-link" href="#faq">
                FAQ
              </SmoothAnchor>
              <Link className="public-nav-link" href="/jobs">
                Jobs
              </Link>
              <div className="nav-divider" aria-hidden="true" />
              <Link className="public-login" href="/login">
                Log in
              </Link>
              <Link className="ui-button ui-button-primary" href="/register">
                Get started <Icon name="arrow" />
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="hero-viewport-section">
        <HeroBackgroundMedia />
        <div className="public-container hero-content-relative">
          <div className="hero-grid-split">
            <div className="hero-text-block">
              <h1 className="hero-title">
                See your resume the way the ATS sees it.
              </h1>
              <p className="hero-copy">
                Upload a PDF. We parse the text layer, read the page as an
                image, and diff the two — then score it against a job listing
                you pick.
              </p>
              <div className="hero-actions">
                <Link
                  className="ui-button ui-button-primary hero-btn-main"
                  href="/register"
                >
                  Analyze your resume <Icon name="arrow" />
                </Link>
                <Link
                  className="ui-button ui-button-secondary-clean hero-btn-secondary"
                  href="/jobs"
                >
                  Browse jobs
                </Link>
              </div>
            </div>

            <div className="hero-visual-card-wrap" aria-hidden="true">
              {/* <div className="hero-mock-card">
                <div className="mock-card-header">
                  <div className="mock-file-pill">
                    <Icon name="document" />
                    <span>resume.pdf</span>
                  </div>
                </div>

                <div className="mock-score-showcase">
                  <div className="mock-score-ring">
                    <svg viewBox="0 0 100 100" className="mock-svg-ring">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="mock-circle-bg"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="mock-circle-fill"
                        style={{ strokeDashoffset: "34" }}
                      />
                    </svg>
                    <div className="mock-score-number">
                      <strong>87</strong>
                      <small>/100</small>
                    </div>
                  </div>
                  <div className="mock-score-details">
                    <h4>Senior Frontend Engineer</h4>
                    <p>8 of 9 required skills matched.</p>
                  </div>
                </div>

                <div className="mock-skills-list">
                  <div className="mock-skill-item">
                    <div className="mock-skill-label">
                      <span>React &amp; Next.js</span>
                    </div>
                    <span className="mock-skill-pct">96%</span>
                    <div className="mock-skill-bar">
                      <div
                        className="mock-skill-bar-fill"
                        style={{ width: "96%" }}
                      />
                    </div>
                  </div>
                  <div className="mock-skill-item">
                    <div className="mock-skill-label">
                      <span>TypeScript</span>
                    </div>
                    <span className="mock-skill-pct">71%</span>
                    <div className="mock-skill-bar">
                      <div
                        className="mock-skill-bar-fill"
                        style={{ width: "71%" }}
                      />
                    </div>
                  </div>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </section>

      <div className="public-container">
        <section id="comparison" className="public-section comparison-section">
          <header className="section-heading">
            <h2>Same experience. Different framing.</h2>
            <p className="section-subtext">
              Two bullets describing the same job. Only one of them survives
              the parser.
            </p>
          </header>

          <div className="comparison-cards-grid">
            <div className="comparison-card comparison-before">
              <div className="comparison-card-top">
                <span className="comparison-pill comparison-pill-before">
                  Before
                </span>
                <div className="comparison-score-pill score-pill-low">
                  <strong>58</strong>/100
                </div>
              </div>
              <div className="comparison-sample-box sample-before">
                &ldquo;Responsible for maintaining web services, fixing bug
                tickets, and collaborating with cross-functional team members
                on features.&rdquo;
              </div>
              <ul className="comparison-critique-list">
                <li className="critique-negative">
                  <Icon name="close" /> No measurable outcome
                </li>
                <li className="critique-negative">
                  <Icon name="close" /> Missing keywords: Node.js, API, latency,
                  Redis
                </li>
                <li className="critique-negative">
                  <Icon name="close" /> Below the threshold for Senior Engineer
                </li>
              </ul>
            </div>

            <div className="comparison-card comparison-after">
              <div className="comparison-card-top">
                <span className="comparison-pill comparison-pill-after">
                  After
                </span>
                <div className="comparison-score-pill score-pill-high">
                  <strong>87</strong>/100
                </div>
              </div>
              <div className="comparison-sample-box sample-after">
                &ldquo;Architected high-throughput microservices using Node.js
                and Redis, reducing API response times by 42% for 200,000+ daily
                active users.&rdquo;
              </div>
              <ul className="comparison-critique-list">
                <li className="critique-positive">
                  <Icon name="check" /> Quantified outcome, strong action verb
                </li>
                <li className="critique-positive">
                  <Icon name="check" /> Four required technologies in one line
                </li>
                <li className="critique-positive">
                  <Icon name="check" /> Clears the ATS filter with room to spare
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="features" className="public-section features-section">
          <header className="section-heading">
            <h2>What the report actually tells you.</h2>
          </header>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon-badge">
                <Icon name="scan" />
              </div>
              <h3>PDF and OCR, cross-checked</h3>
              <p>
                We parse the text layer of your PDF and read the page as an
                image, then diff the two. If a column, font, or text box is
                breaking the parser, you&apos;ll see exactly where.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-badge">
                <Icon name="match" />
              </div>
              <h3>Skill gap against a real job</h3>
              <p>
                Pick a listing from our board. We compare your resume to its
                required and preferred skills and show you which ones you
                already demonstrate and which you don&apos;t.
              </p>
            </article>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-grid">
            <div className="cta-card cta-card-candidate">
              <span className="cta-label">Candidates</span>
              <h2>Analyze your resume.</h2>
              <p>
                Free. No account needed to see your first score. Track every
                application from one workspace.
              </p>
              <Link className="ui-button ui-button-primary" href="/register">
                Create an account <Icon name="arrow" />
              </Link>
            </div>

            <div className="cta-card cta-card-recruiter">
              <span className="cta-label cta-label-recruiter">Recruiters</span>
              <h2>Post a role.</h2>
              <p>
                Set required and preferred skills, then see ranked candidate
                matches as they apply.
              </p>
              <Link
                className="ui-button ui-button-recruiter-cta"
                href="/register"
              >
                Create a recruiter account <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </section>

        <section id="faq" className="public-section faq-section">
          <header className="section-heading">
            <h2>Questions</h2>
          </header>

          <div className="faq-accordion-wrap">
            <details className="faq-item">
              <summary className="faq-summary">
                <span>Is it free for candidates?</span>
                <Icon name="chevron" className="faq-chevron" />
              </summary>
              <div className="faq-content">
                <p>Yes. Uploads, score reports, and job matching are free.</p>
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-summary">
                <span>How is the score calculated?</span>
                <Icon name="chevron" className="faq-chevron" />
              </summary>
              <div className="faq-content">
                <p>
                  We score structural clarity, section ordering, action verb
                  strength, quantified impact, and keyword coverage against the
                  specific job you&apos;re targeting. The report breaks down
                  each dimension so you can see where the score is coming from.
                </p>
              </div>
            </details>

            <details className="faq-item">
              <summary className="faq-summary">
                <span>What is the OCR comparison for?</span>
                <Icon name="chevron" className="faq-chevron" />
              </summary>
              <div className="faq-content">
                <p>
                  Many PDFs contain hidden text, multi-column layouts, or
                  non-standard fonts that look fine to a human but scramble
                  inside an ATS. We render the page as an image and re-read it,
                  then diff against the embedded text. Differences get flagged
                  so you can fix them before you apply.
                </p>
              </div>
            </details>
          </div>
        </section>

        <footer className="public-footer-new">
          <div className="footer-top">
            <div className="footer-brand-col">
              <Brand />
              <p className="footer-tagline">
                Resume analysis, ATS scoring, and job matching.
              </p>
            </div>

            <nav className="footer-nav-grid" aria-label="Footer links">
              <div className="footer-col">
                <strong>Product</strong>
                <SmoothAnchor href="#comparison">Examples</SmoothAnchor>
                <SmoothAnchor href="#features">Features</SmoothAnchor>
                <SmoothAnchor href="#faq">FAQ</SmoothAnchor>
              </div>
              <div className="footer-col">
                <strong>Jobs</strong>
                <Link href="/jobs">Browse listings</Link>
                <Link href="/register">Post a role</Link>
              </div>
              <div className="footer-col">
                <strong>Account</strong>
                <Link href="/login">Sign in</Link>
                <Link href="/register">Sign up</Link>
                <Link href="/dashboard">Dashboard</Link>
              </div>
            </nav>
          </div>

          <div className="footer-bottom">
            <p>Scores support your review. They aren&apos;t a hiring guarantee.</p>
            <p className="footer-copyright">
              © {new Date().getFullYear()} AI Resume Analyzer
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
