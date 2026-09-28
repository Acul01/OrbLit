import { getLocale } from "next-intl/server";
import LegalPage, { proseStyles as p } from "@/components/LegalPage";

export const metadata = { title: "Datenschutzerklärung — OrbLit" };

export default async function DatenschutzPage() {
  const locale = await getLocale();
  return locale === "de" ? <De /> : <En />;
}

function De() {
  return (
    <LegalPage
      title="Datenschutzerklärung"
    >
      <h2 style={p.h2}>1. Verantwortlicher</h2>
      <p style={p.p}>
        Verantwortlich für die Datenverarbeitung auf dieser Website ist:
        <br />
        Luca Rippe
        <br />
        Zur Hoge 32, 27639 Wurster Nordseeküste
        <br />
        E-Mail: rippeluca@gmail.com
      </p>

      <h2 style={p.h2}>2. Übersicht der Verarbeitungen</h2>
      <p style={p.p}>
        Wir verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung der
        Funktionen von OrbLit (Zitationsnetzwerk-Kartierung mit OpenAlex- und
        Zotero-Anbindung) erforderlich ist. Im Einzelnen setzen wir folgende Dienste ein:
      </p>
      <ul style={p.ul}>
        <li style={p.li}>
          <strong>Supabase</strong> — Authentifizierung und Datenbank (Frankfurt, EU)
        </li>
        <li style={p.li}>
          <strong>Vercel</strong> — Hosting der Anwendung
        </li>
        <li style={p.li}>
          <strong>Google</strong> — optionale Anmeldung per Google-Konto (OAuth)
        </li>
        <li style={p.li}>
          <strong>OpenAlex</strong> — Literatursuche (öffentliche API, keine personenbezogenen
          Daten übermittelt)
        </li>
        <li style={p.li}>
          <strong>Zotero</strong> — optionale Synchronisierung Ihrer Literaturverwaltung
        </li>
      </ul>

      <h2 style={p.h2}>3. Hosting und Server-Logfiles (Vercel)</h2>
      <p style={p.p}>
        Diese Website wird bei Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA
        gehostet. Beim Aufruf der Website werden automatisch technische Verbindungsdaten
        (IP-Adresse, Datum/Uhrzeit, aufgerufene Seite, Browsertyp) in Server-Logfiles erfasst.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der sicheren
        und stabilen Bereitstellung der Website). Vercel kann Daten in die USA übertragen; als
        Schutzmaßnahme kommen EU-Standardvertragsklauseln (SCC) zum Einsatz. Mit Vercel besteht
        ein Auftragsverarbeitungsvertrag (Data Processing Addendum), der durch Nutzung des
        Vercel-Pro-Plans automatisch zur Anwendung kommt:{" "}
        <a href="https://vercel.com/legal/dpa" style={p.a} target="_blank" rel="noreferrer">
          vercel.com/legal/dpa
        </a>
        .
      </p>

      <h2 style={p.h2}>4. Konto, Anmeldung und Nutzungsdaten (Supabase)</h2>
      <p style={p.p}>
        Für die Nutzung von OrbLit ist ein Konto erforderlich. Bei der Registrierung erheben
        wir Ihre E-Mail-Adresse und ein verschlüsselt gespeichertes Passwort (bzw. bei Anmeldung
        über Google die von Google übermittelte E-Mail-Adresse). Diese Daten sowie die von Ihnen
        erstellten Zitationskarten (Titel, Notizen, Tags, Kartenstruktur) werden bei unserem
        Auftragsverarbeiter Supabase Inc. auf Servern in der EU (Frankfurt) gespeichert.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Mit Supabase besteht
        ein Auftragsverarbeitungsvertrag:{" "}
        <a href="https://supabase.com/legal/dpa" style={p.a} target="_blank" rel="noreferrer">
          supabase.com/legal/dpa
        </a>
        .
      </p>

      <h2 style={p.h2}>5. Anmeldung mit Google (OAuth)</h2>
      <p style={p.p}>
        Sie können sich alternativ über Ihr Google-Konto anmelden. Dabei erhalten wir von
        Google Ihre E-Mail-Adresse zur Erstellung Ihres OrbLit-Kontos. Es gilt zusätzlich die
        Datenschutzerklärung von Google:{" "}
        <a href="https://policies.google.com/privacy" style={p.a} target="_blank" rel="noreferrer">
          policies.google.com/privacy
        </a>
        . Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (Ihre Einwilligung durch Auswahl dieser
        Anmeldeoption).
      </p>

      <h2 style={p.h2}>6. OpenAlex-Suche</h2>
      <p style={p.p}>
        Die Literatursuche erfolgt über die öffentliche, unauthentifizierte API von OpenAlex.
        Ihre Suchanfragen werden direkt aus Ihrem Browser an OpenAlex gesendet; hierbei werden
        keine Konto- oder sonstige personenbezogenen Daten von uns übermittelt. Es gilt die
        Datenschutzerklärung von OpenAlex/OurResearch.
      </p>

      <h2 style={p.h2}>7. Zotero-Integration</h2>
      <p style={p.p}>
        Wenn Sie Ihre Zotero-Bibliothek verbinden, speichern wir Ihre Zotero-Nutzer-ID und
        Ihren Zotero-API-Schlüssel verschlüsselt (AES-256) auf unseren Servern, um in Ihrem
        Auftrag mit der Zotero-API zu kommunizieren (z. B. Sammlungen abzurufen, Einträge
        hinzuzufügen). Der Schlüssel wird zu keinem Zeitpunkt an Dritte weitergegeben oder im
        Browser gespeichert. Sie können die Verbindung jederzeit in der Anwendung trennen,
        wodurch der gespeicherte Schlüssel gelöscht wird. Rechtsgrundlage ist Art. 6 Abs. 1
        lit. b DSGVO (Vertragserfüllung).
      </p>

      <h2 style={p.h2}>8. Cookies</h2>
      <p style={p.p}>
        Wir verwenden ausschließlich technisch notwendige Cookies (Sitzungs-/Anmeldecookies von
        Supabase, ein Cookie zur Speicherung Ihrer Sprachauswahl). Diese sind gemäß § 25 Abs. 2
        TTDSG von der Einwilligungspflicht ausgenommen. Sollten künftig Analyse- oder
        Marketing-Cookies eingesetzt werden, wird vorab eine Einwilligung über ein
        Cookie-Banner eingeholt.
      </p>

      <h2 style={p.h2}>9. Speicherdauer</h2>
      <p style={p.p}>
        Wir speichern personenbezogene Daten, solange Ihr Konto besteht. Nach Löschung des
        Kontos werden die zugehörigen Daten gelöscht.
      </p>

      <h2 style={p.h2}>10. Ihre Rechte</h2>
      <p style={p.p}>
        Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO),
        Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO),
        Datenübertragbarkeit (Art. 20 DSGVO) sowie Widerspruch gegen die Verarbeitung
        (Art. 21 DSGVO). Zur Ausübung wenden Sie sich an rippeluca@gmail.com. Sie können Ihr Konto und die
        zugehörigen Daten jederzeit über diesen Kontakt löschen lassen. Zudem steht Ihnen ein
        Beschwerderecht bei einer Datenschutzaufsichtsbehörde zu.
      </p>
    </LegalPage>
  );
}

function En() {
  return (
    <LegalPage
      title="Privacy Policy"
    >
      <h2 style={p.h2}>1. Controller</h2>
      <p style={p.p}>
        The controller responsible for data processing on this website is:
        <br />
        Luca Rippe
        <br />
        Zur Hoge 32, 27639 Wurster Nordseeküste, Germany
        <br />
        Email: rippeluca@gmail.com
      </p>

      <h2 style={p.h2}>2. Overview of processing</h2>
      <p style={p.p}>
        We only process personal data to the extent necessary to provide OrbLit&apos;s features
        (citation network mapping with OpenAlex and Zotero integration). Specifically, we use:
      </p>
      <ul style={p.ul}>
        <li style={p.li}>
          <strong>Supabase</strong> — authentication and database (Frankfurt, EU)
        </li>
        <li style={p.li}>
          <strong>Vercel</strong> — application hosting
        </li>
        <li style={p.li}>
          <strong>Google</strong> — optional sign-in via Google account (OAuth)
        </li>
        <li style={p.li}>
          <strong>OpenAlex</strong> — literature search (public API, no personal data transmitted)
        </li>
        <li style={p.li}>
          <strong>Zotero</strong> — optional sync with your reference library
        </li>
      </ul>

      <h2 style={p.h2}>3. Hosting and server logs (Vercel)</h2>
      <p style={p.p}>
        This website is hosted by Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.
        When you access the site, technical connection data (IP address, date/time, page
        accessed, browser type) is automatically recorded in server logs. Legal basis: Art. 6(1)
        (f) GDPR (legitimate interest in secure and stable operation). Vercel may transfer data
        to the US; EU Standard Contractual Clauses (SCCs) apply as a safeguard. A data processing
        agreement (DPA) with Vercel is in effect automatically through use of the Vercel Pro
        plan:{" "}
        <a href="https://vercel.com/legal/dpa" style={p.a} target="_blank" rel="noreferrer">
          vercel.com/legal/dpa
        </a>
        .
      </p>

      <h2 style={p.h2}>4. Account, sign-in, and usage data (Supabase)</h2>
      <p style={p.p}>
        Using OrbLit requires an account. On sign-up we collect your email address and a
        securely hashed password (or, for Google sign-in, the email address provided by
        Google). This data, along with the citation maps you create (titles, notes, tags, map
        structure), is stored with our processor Supabase Inc. on servers in the EU
        (Frankfurt). Legal basis: Art. 6(1)(b) GDPR (contract performance). A data processing
        agreement with Supabase is in effect:{" "}
        <a href="https://supabase.com/legal/dpa" style={p.a} target="_blank" rel="noreferrer">
          supabase.com/legal/dpa
        </a>
        .
      </p>

      <h2 style={p.h2}>5. Google sign-in (OAuth)</h2>
      <p style={p.p}>
        You may alternatively sign in with your Google account. We receive your email address
        from Google to create your OrbLit account. Google&apos;s privacy policy also applies:{" "}
        <a href="https://policies.google.com/privacy" style={p.a} target="_blank" rel="noreferrer">
          policies.google.com/privacy
        </a>
        . Legal basis: Art. 6(1)(a) GDPR (your consent by choosing this sign-in option).
      </p>

      <h2 style={p.h2}>6. OpenAlex search</h2>
      <p style={p.p}>
        Literature search uses OpenAlex&apos;s public, unauthenticated API. Your search queries
        are sent directly from your browser to OpenAlex; no account or other personal data is
        transmitted by us in the process. OpenAlex/OurResearch&apos;s privacy policy applies.
      </p>

      <h2 style={p.h2}>7. Zotero integration</h2>
      <p style={p.p}>
        If you connect your Zotero library, we store your Zotero user ID and API key encrypted
        (AES-256) on our servers to communicate with the Zotero API on your behalf (e.g.
        fetching collections, adding items). The key is never shared with third parties or
        stored in your browser. You can disconnect at any time within the app, which deletes
        the stored key. Legal basis: Art. 6(1)(b) GDPR (contract performance).
      </p>

      <h2 style={p.h2}>8. Cookies</h2>
      <p style={p.p}>
        We use only strictly necessary cookies (Supabase session/login cookies, a cookie
        storing your language preference). These are exempt from consent requirements. Should
        analytics or marketing cookies be added in the future, consent will be requested via a
        cookie banner beforehand.
      </p>

      <h2 style={p.h2}>9. Retention</h2>
      <p style={p.p}>
        We retain personal data for as long as your account exists. When the account is
        deleted, the associated data is deleted.
      </p>

      <h2 style={p.h2}>10. Your rights</h2>
      <p style={p.p}>
        You have the right to access (Art. 15), rectification (Art. 16), erasure (Art. 17),
        restriction of processing (Art. 18), data portability (Art. 20), and objection (Art. 21
        GDPR). To exercise these rights, contact rippeluca@gmail.com. You may have your account and
        associated data deleted at any time via this contact. You also have the right to lodge a
        complaint with a data protection supervisory authority.
      </p>
    </LegalPage>
  );
}
