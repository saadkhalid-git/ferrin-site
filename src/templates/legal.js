// Legal pages, in English only. Parts in [brackets] must be filled in before relying on them.
// These are drafts, not legal advice: have them checked by an adviser in the country where the business is registered.

export function legalPages(ctx) {
  const { cfg } = ctx;
  const brand = cfg.brand, email = cfg.orderEmail;
  const mail = `<a href="mailto:${email}">${email}</a>`;

  const terms = `
    <h2>1. Scope</h2>
    <p>These terms apply to all sales by [company legal name] ("${brand}", "we") through this website. We sell only to businesses, such as salons, barbers, nail studios, academies, wholesalers and shops. We don't sell to consumers.</p>
    <h2>2. Orders and contract</h2>
    <p>An order request sent through this website is an offer to buy. A contract is formed only when we accept it by sending an order confirmation or invoice. Prices, stock and delivery times on the website may change until then.</p>
    <h2>3. Prices</h2>
    <p>Prices are in euros per piece and exclude VAT, import VAT and customs duty. Volume discounts and shipping costs are shown in the cart and on the invoice.</p>
    <h2>4. Payment</h2>
    <p>Payment is by bank transfer in advance, within [7] days of the invoice date, unless we agree other terms in writing. We ship once payment is received.</p>
    <h2>5. Delivery and import</h2>
    <p>Goods ship from Pakistan under Incoterms® 2020 DAP (delivered at place) to the address in the order, unless agreed otherwise. The customer is the importer and pays any import VAT, customs duty and clearance fees charged by the carrier. Delivery times are estimates.</p>
    <h2>6. Checking goods and defects</h2>
    <p>Check goods on arrival. Report visible damage or missing items within [7] days of delivery, and other defects within [30] days, with photos. If a defect is confirmed we replace the item or issue a credit, at our choice.</p>
    <h2>7. Intended use and resale</h2>
    <p>Our instruments are for cosmetic, salon and grooming use. They are not medical devices. If you resell them, you are responsible for meeting the product, labelling and safety rules of the markets where you sell.</p>
    <h2>8. Private label orders</h2>
    <p>You confirm that you have the right to use any logo, name or design you send us. Custom-branded products are made to order and can't be returned unless they are defective.</p>
    <h2>9. Liability</h2>
    <p>Our liability for any order is limited to its invoice value, except where the law doesn't allow this limit, such as for intent or gross negligence. [Check this clause with your adviser.]</p>
    <h2>10. Retention of title</h2>
    <p>Goods remain our property until they are paid in full.</p>
    <h2>11. Law and courts</h2>
    <p>These terms are governed by the law of [country]. The courts of [city, country] have jurisdiction. The UN Convention on Contracts for the International Sale of Goods (CISG) [applies / does not apply].</p>
    <p class="muted">Version [date]. Questions: ${mail}</p>`;

  const privacy = `
    <h2>Who is responsible</h2>
    <p>[Company legal name], [address], ${mail}, is responsible for personal data collected through this website.</p>
    <h2>What we collect and why</h2>
    <p>When you send an order request, a quote request or a message, we receive the details you enter: name, company, email, phone, address, VAT number, the products you ask for and your message. We use them to answer you, prepare quotes and invoices, and deliver orders.</p>
    <p>Legal basis: taking steps before and performing a contract (GDPR article 6(1)(b)), and keeping business records required by tax law (article 6(1)(c)).</p>
    <h2>Services that process data for us</h2>
    <ul>
      <li><strong>Web3Forms</strong> delivers form submissions to our email inbox. [Add their location and data processing terms.]</li>
      <li><strong>GitHub Pages</strong> (GitHub, Inc., USA) hosts this website and may log visitors' IP addresses for security. Transfers to the USA rely on the EU–US Data Privacy Framework.</li>
      <li>[Our email provider] stores the messages we receive.</li>
      <li>[Courier name] receives your delivery address to ship orders.</li>
      ${cfg.goatcounter ? "<li><strong>GoatCounter</strong> counts page visits without cookies and without storing IP addresses.</li>" : ""}
    </ul>
    <h2>Cookies and browser storage</h2>
    <p>This site doesn't use cookies or tracking. Your cart and your language choice are saved in your own browser (local storage). The cart is only sent to us when you send an order request.</p>
    <p>On your first visit, the site picks a language from your device's time zone. This happens in your browser; your location isn't looked up or sent anywhere.</p>
    <h2>How long we keep data</h2>
    <p>Orders and invoices: [10] years, as required by tax law. Other messages and quote requests: [2] years after our last contact.</p>
    <h2>Your rights</h2>
    <p>You can ask to see, correct or delete your data, restrict or object to its use, or receive a copy. Email ${mail}. You can also complain to a data protection authority, such as the one in your country [or the CNPD in Luxembourg].</p>
    <p class="muted">Version [date].</p>`;

  const notice = `
    <dl class="specs">
      <div><dt>Company</dt><dd>[Company legal name and legal form]</dd></div>
      <div><dt>Address</dt><dd>[Registered address]</dd></div>
      <div><dt>Registration</dt><dd>[Company register and number]</dd></div>
      <div><dt>Tax number</dt><dd>[VAT or tax number]</dd></div>
      <div><dt>Managed by</dt><dd>[Name of director or owner]</dd></div>
      <div><dt>Business permit</dt><dd>[Permit number, if required]</dd></div>
      <div><dt>Email</dt><dd>${mail}</dd></div>
      <div><dt>Phone</dt><dd>${cfg.phone}</dd></div>
    </dl>
    <p>Responsible for the content of this website: [name, address].</p>`;

  return [
    { path: "terms", title: "Terms of sale", html: terms },
    { path: "privacy", title: "Privacy policy", html: privacy },
    { path: "legal-notice", title: "Legal notice", html: notice }
  ];
}
