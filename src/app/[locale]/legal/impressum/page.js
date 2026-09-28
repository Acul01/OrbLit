import { getLocale } from "next-intl/server";
import LegalPage, { proseStyles as p } from "@/components/LegalPage";

export const metadata = { title: "Impressum — OrbLit" };

export default async function ImpressumPage() {
  const locale = await getLocale();
  return locale === "de" ? <De /> : <En />;
}

function De() {
  return (
    <LegalPage
      title="Impressum"
    >
      <h2 style={p.h2}>Angaben gemäß § 5 DDG</h2>
      <p style={p.p}>
        Luca Rippe
        <br />
        Zur Hoge 32
        <br />
        27639 Wurster Nordseeküste
        <br />
        Deutschland
      </p>

      <h2 style={p.h2}>Kontakt</h2>
      <p style={p.p}>E-Mail: rippeluca@gmail.com</p>

      <h2 style={p.h2}>Umsatzsteuer</h2>
      <p style={p.p}>
        Gemäß § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet
        (Kleinunternehmerregelung).
      </p>

      <h2 style={p.h2}>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p style={p.p}>Luca Rippe, Anschrift wie oben.</p>

      <h2 style={p.h2}>Streitschlichtung</h2>
      <p style={p.p}>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
        bereit:{" "}
        <a href="https://ec.europa.eu/consumers/odr/" style={p.a} target="_blank" rel="noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Unsere E-Mail-Adresse finden Sie oben unter Kontakt.
      </p>
      <p style={p.p}>
        Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2 style={p.h2}>Haftung für Inhalte</h2>
      <p style={p.p}>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten
        nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
        Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
        Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
        Tätigkeit hinweisen.
      </p>

      <h2 style={p.h2}>Haftung für Links</h2>
      <p style={p.p}>
        Unser Angebot enthält Links zu externen Websites Dritter (z. B. OpenAlex, Zotero), auf
        deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets
        der jeweilige Anbieter verantwortlich.
      </p>
    </LegalPage>
  );
}

function En() {
  return (
    <LegalPage
      title="Legal Notice (Impressum)"
    >
      <h2 style={p.h2}>Information pursuant to § 5 DDG (German Digital Services Act)</h2>
      <p style={p.p}>
        Luca Rippe
        <br />
        Zur Hoge 32
        <br />
        27639 Wurster Nordseeküste
        <br />
        Germany
      </p>

      <h2 style={p.h2}>Contact</h2>
      <p style={p.p}>Email: rippeluca@gmail.com</p>

      <h2 style={p.h2}>VAT</h2>
      <p style={p.p}>
        No VAT is charged pursuant to § 19 (1) of the German VAT Act (Umsatzsteuergesetz) —
        small business regulation (Kleinunternehmerregelung).
      </p>

      <h2 style={p.h2}>Responsible for content pursuant to § 18 (2) MStV</h2>
      <p style={p.p}>Luca Rippe, address as above.</p>

      <h2 style={p.h2}>Dispute resolution</h2>
      <p style={p.p}>
        The European Commission provides a platform for online dispute resolution (ODR):{" "}
        <a href="https://ec.europa.eu/consumers/odr/" style={p.a} target="_blank" rel="noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Our email address can be found above under Contact.
      </p>
      <p style={p.p}>
        We are not obliged and not willing to participate in dispute resolution proceedings
        before a consumer arbitration board.
      </p>

      <h2 style={p.h2}>Liability for content</h2>
      <p style={p.p}>
        As a service provider, we are responsible for our own content on these pages in
        accordance with general laws. However, we are not obliged to monitor transmitted or
        stored third-party information or to investigate circumstances that indicate illegal
        activity.
      </p>

      <h2 style={p.h2}>Liability for links</h2>
      <p style={p.p}>
        Our offering contains links to external third-party websites (e.g. OpenAlex, Zotero)
        over whose content we have no influence. The respective provider is always responsible
        for the content of linked pages.
      </p>
    </LegalPage>
  );
}
