import { useState } from "react";
import "./landing-ink-edition.css";

const Arrow = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className="ink-arrow">
    <path d="M2 10h14M11 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Play = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="ink-play">
    <path d="M8.2 5.8v12.4L18.1 12 8.2 5.8Z" fill="currentColor" />
  </svg>
);

export default function LandingInkEdition() {
  const [joined, setJoined] = useState(false);
  const [liked, setLiked] = useState<number | null>(null);
  const [activeForum, setActiveForum] = useState<string | null>(null);

  const join = () => setJoined(true);

  return (
    <main className="ink-page">
      <header className="ink-nav">
        <button className="ink-masthead" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="ink-mark">DL</span>
          <span>The Digital Ledger</span>
        </button>
        <nav aria-label="Primary navigation">
          {["Articles", "Podcasts", "Forums", "Library"].map((item) => (
            <button key={item} onClick={() => document.getElementById(item === "Articles" ? "articles" : item === "Podcasts" ? "podcasts" : "forums")?.scrollIntoView({ behavior: "smooth" })}>
              {item}
            </button>
          ))}
        </nav>
        <button className="ink-login" onClick={() => alert("Login would open here.")}>Member login</button>
      </header>

      <section className="ink-hero">
        <div className="ink-edition">The Wednesday edition <span>Vol. 04 / 2026</span></div>
        <div className="ink-hero-grid">
          <div>
            <p className="ink-kicker">Finance, after the noise</p>
            <h1>The numbers<br />are learning<br /><em>to speak.</em></h1>
          </div>
          <div className="ink-hero-note">
            <div className="ink-rule" />
            <p>The calm, clear brief for finance leaders building what comes next.</p>
            <p className="ink-small">Two considered reads and one unhurried conversation, delivered every Wednesday.</p>
            <button className={`ink-subscribe ${joined ? "is-joined" : ""}`} onClick={join}>
              {joined ? "You're on the list" : "Receive the brief"} <Arrow />
            </button>
          </div>
        </div>
        <div className="ink-scroll">Scroll to read <span>↓</span></div>
      </section>

      <section id="articles" className="ink-articles">
        <div className="ink-section-heading">
          <div><span>01</span> From the desk</div>
          <p>Ideas worth putting down your coffee for.</p>
        </div>
        <article className="ink-lead">
          <div className="ink-photo ink-photo-main"><span>ILLUSTRATION / LEDGER 01</span></div>
          <div className="ink-lead-copy">
            <p className="ink-meta">AI OPERATIONS <i /> 7 MIN READ</p>
            <h2>What the close looks like when the work starts answering back.</h2>
            <p className="ink-dek">The most interesting automation is not the kind that moves faster. It is the kind that gives the finance team a better question to ask.</p>
            <div className="ink-action-row">
              <button onClick={() => setLiked(liked === 0 ? null : 0)} className={liked === 0 ? "is-liked" : ""}>{liked === 0 ? "Saved to reading" : "Save for later"}</button>
              <button className="ink-read" onClick={() => alert("Opening article: What the close looks like...")}>Read the piece <Arrow /></button>
            </div>
          </div>
        </article>

        <div className="ink-story-grid">
          {[
            ["GOVERNANCE", "The policy gap hiding inside every bright new tool."],
            ["THE PRACTICE", "Five conversations a finance leader should have this quarter."],
          ].map(([tag, title], index) => (
            <article className="ink-mini-story" key={title}>
              <div className={`ink-photo ink-photo-${index + 2}`} />
              <p className="ink-meta">{tag} <i /> {index === 0 ? "5" : "6"} MIN READ</p>
              <h3>{title}</h3>
              <button onClick={() => alert(`Opening article: ${title}`)} aria-label={`Read ${title}`}><Arrow /></button>
            </article>
          ))}
        </div>
        <button className="ink-index" onClick={() => alert("Article archive would open here.")}>Browse the article index <Arrow /></button>
      </section>

      <section id="podcasts" className="ink-audio">
        <div className="ink-audio-top"><span>02</span><span>THE LEDGER, LISTENING</span><span>NEW EVERY THURSDAY</span></div>
        <div className="ink-audio-grid">
          <div className="ink-record"><div className="ink-record-label">DL<br /><small>EP. 48</small></div></div>
          <div>
            <p className="ink-meta">EPISODE 48 <i /> 38:21</p>
            <h2>“The good teams aren’t using AI as a shortcut.”</h2>
            <p>A conversation with Mara Liu on building trust before a model enters the room.</p>
            <button className="ink-listen" onClick={() => alert("Podcast player would start here.")}><Play /> Listen to the conversation</button>
          </div>
        </div>
      </section>

      <section id="forums" className="ink-forums">
        <div className="ink-section-heading">
          <div><span>03</span> The table</div>
          <p>Where practitioners compare notes.</p>
        </div>
        <div className="ink-forum-list">
          {[
            ["Implementation notes", "1,247 conversations", "Mina asked about exception handling"],
            ["Compliance, without theatre", "856 conversations", "New guidance on model documentation"],
            ["The working practice", "624 conversations", "How teams are teaching prompt review"],
          ].map(([name, count, update], index) => (
            <button className={`ink-forum ${activeForum === name ? "is-active" : ""}`} key={name} onClick={() => setActiveForum(activeForum === name ? null : name)}>
              <span className="ink-forum-num">0{index + 1}</span>
              <span><strong>{name}</strong><small>{count}</small></span>
              <span className="ink-forum-update">{activeForum === name ? "Following this table" : update}</span>
              <Arrow />
            </button>
          ))}
        </div>
      </section>

      <section className="ink-closure">
        <p className="ink-kicker">A quieter way to keep up</p>
        <h2>Good work deserves<br />a little <em>room.</em></h2>
        <p>Wednesday morning. One considered delivery. No feed to keep feeding.</p>
        <button className={`ink-subscribe ink-subscribe-light ${joined ? "is-joined" : ""}`} onClick={join}>
          {joined ? "You're on the list" : "Get the Wednesday edition"} <Arrow />
        </button>
      </section>

      <footer className="ink-footer">
        <span>THE DIGITAL LEDGER</span>
        <span>FOR PEOPLE RESPONSIBLE FOR THE NUMBERS</span>
        <span>© 2026</span>
      </footer>
    </main>
  );
}