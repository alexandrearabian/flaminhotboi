import { site, t, type Lang } from '@/lib/i18n'

// Booking first: this is where bands and venues land when they want to hire.
export function Footer({ lang }: { lang: Lang }) {
  const tr = t[lang]
  return (
    <footer className="footer" id="contact">
      <div className="footer-book">
        <h2 className="display-xl">{tr.bookings}</h2>
        <p className="footer-line">{tr.bookingLine}</p>
        <a href={`mailto:${site.email}`} className="cta cta-lg glass">
          {tr.emailMe}
          <span className="cta-icon" aria-hidden>↗</span>
        </a>
      </div>
      <div className="footer-contact">
        <a href={`mailto:${site.email}`} className="footer-email">{site.email}</a>
        <ul className="footer-social">
          {site.socials.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="me noopener">{s.label} ↗</a>
            </li>
          ))}
        </ul>
      </div>
      <div className="footer-base">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <a href="#main">{tr.top} ↑</a>
      </div>
    </footer>
  )
}
