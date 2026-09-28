import { getLocale } from "next-intl/server";
import LegalPage, { proseStyles as p } from "@/components/LegalPage";

export const metadata = { title: "Nutzungsbedingungen — OrbLit" };

export default async function AgbPage() {
  const locale = await getLocale();
  return locale === "de" ? <De /> : <En />;
}

function De() {
  return (
    <LegalPage title="Nutzungsbedingungen">
      <h2 style={p.h2}>§ 1 Geltungsbereich</h2>
      <p style={p.p}>
        Diese Nutzungsbedingungen gelten für die kostenlose Nutzung der Website und der
        gehosteten Anwendung OrbLit, betrieben von Luca Rippe (nachfolgend
        &bdquo;Anbieter&ldquo;). Der Quellcode ist Open Source unter der MIT-Lizenz und
        liegt auf{" "}
        <a href="https://github.com/Acul01/OrbLit" style={p.a} target="_blank" rel="noreferrer">
          github.com/Acul01/OrbLit
        </a>
        .
      </p>

      <h2 style={p.h2}>§ 2 Konto</h2>
      <p style={p.p}>
        Für die gehostete Anwendung ist ein Konto erforderlich. Mit der Registrierung kommt
        eine unentgeltliche Nutzungsvereinbarung zustande. Es gibt kein Abonnement, keinen
        Preis und keine Zahlung. Das Konto kann jederzeit gelöscht werden; dazu genügt eine
        E-Mail an rippeluca@gmail.com.
      </p>

      <h2 style={p.h2}>§ 3 Leistung</h2>
      <p style={p.p}>
        OrbLit ist ein webbasiertes Werkzeug zur Recherche und Visualisierung von
        Zitationsnetzwerken auf Basis der OpenAlex-Datenbank sowie zur optionalen
        Synchronisierung mit der Literaturverwaltung Zotero. Der Anbieter ist bemüht, eine hohe
        Verfügbarkeit sicherzustellen, übernimmt jedoch keine Gewähr für eine ununterbrochene
        Erreichbarkeit, insbesondere bei Wartungsarbeiten oder Störungen bei Drittanbietern
        (z. B. OpenAlex, Zotero).
      </p>

      <h2 style={p.h2}>§ 4 Zulässige Nutzung</h2>
      <p style={p.p}>
        Die Anwendung darf nicht missbraucht werden, insbesondere nicht, um fremde Zugangsdaten
        zu verwenden, den Dienst zu stören oder geltendes Recht zu verletzen. Der Anbieter kann
        ein Konto sperren, wenn die Nutzung den Betrieb für andere beeinträchtigt.
      </p>

      <h2 style={p.h2}>§ 5 Haftung</h2>
      <p style={p.p}>
        Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie nach den
        Vorschriften des Produkthaftungsgesetzes. Für leichte Fahrlässigkeit haftet der Anbieter
        nur bei Verletzung einer wesentlichen Pflicht, begrenzt auf den vorhersehbaren Schaden.
        Die unentgeltliche Bereitstellung erfolgt ohne Gewähr für einen bestimmten Erfolg der
        Recherche.
      </p>

      <h2 style={p.h2}>§ 6 Schlussbestimmungen</h2>
      <p style={p.p}>
        Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
        Zwingende verbraucherschützende Vorschriften des Staates, in dem die Nutzerin oder der
        Nutzer den gewöhnlichen Aufenthalt hat, bleiben unberührt. Sollten einzelne Bestimmungen
        unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
      </p>
    </LegalPage>
  );
}

function En() {
  return (
    <LegalPage title="Terms of use">
      <h2 style={p.h2}>§ 1 Scope</h2>
      <p style={p.p}>
        These terms apply to free use of the OrbLit website and hosted application, operated by
        Luca Rippe (the &quot;Provider&quot;). The source code is open source under the MIT
        License at{" "}
        <a href="https://github.com/Acul01/OrbLit" style={p.a} target="_blank" rel="noreferrer">
          github.com/Acul01/OrbLit
        </a>
        .
      </p>

      <h2 style={p.h2}>§ 2 Account</h2>
      <p style={p.p}>
        The hosted application requires an account. Signing up creates a free agreement to use
        the service. There is no subscription, no price, and no payment. You can delete your
        account at any time by emailing rippeluca@gmail.com.
      </p>

      <h2 style={p.h2}>§ 3 Service</h2>
      <p style={p.p}>
        OrbLit is a web-based tool for researching and visualizing citation networks based on
        the OpenAlex database, with optional synchronization with the Zotero reference manager.
        The Provider strives to ensure high availability but does not guarantee uninterrupted
        access, particularly during maintenance or third-party outages (e.g. OpenAlex, Zotero).
      </p>

      <h2 style={p.h2}>§ 4 Acceptable use</h2>
      <p style={p.p}>
        Do not misuse the application, including by using someone else&apos;s credentials,
        disrupting the service, or breaking the law. The Provider may suspend an account if
        its use interferes with the service for others.
      </p>

      <h2 style={p.h2}>§ 5 Liability</h2>
      <p style={p.p}>
        The Provider is liable without limitation for intent and gross negligence, and under
        the Product Liability Act. For slight negligence, the Provider is only liable for
        breach of a material obligation, limited to foreseeable damage. The free service is
        provided without a warranty of any particular research result.
      </p>

      <h2 style={p.h2}>§ 6 Final provisions</h2>
      <p style={p.p}>
        German law applies, excluding the UN Convention on Contracts for the International Sale
        of Goods. Mandatory consumer-protection provisions of the country in which the user
        has their habitual residence remain unaffected. Should individual provisions be invalid,
        the validity of the remaining provisions is unaffected.
      </p>
    </LegalPage>
  );
}
