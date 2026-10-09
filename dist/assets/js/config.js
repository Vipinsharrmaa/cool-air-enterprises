/*
  Site-wide configuration - the single place to edit contact details,
  social links, and the contact-form backend endpoint.

  Every page includes this file before main.js. Anything that needs a phone
  number, WhatsApp link, email address, or the form endpoint should read it
  from here rather than hard-coding it again somewhere else in the HTML/JS.
*/

window.CAE_CONFIG = {
  // --- Contact details (source of truth: keep in sync with the footer/
  // contact page HTML, which currently repeats these as static text for
  // SEO/no-JS reasons - if you change a number here, update the HTML too) ---
  phoneDisplay: "+91 97179 46234",
  phoneHref: "tel:+919717946234",

  // Same number as phoneHref above - Call and WhatsApp both go to
  // +91 97179 46234 on purpose (one number for both).
  whatsappDisplay: "+91 97179 46234",
  whatsappNumber: "919717946234", // raw digits, no + or spaces, for wa.me links
  whatsappHref: "https://wa.me/919717946234",

  email: "info.coolairenterprises@gmail.com",

  address: {
    line1: "A-708, Sector 2, Rohini",
    line2: "Delhi – 110085, India",
    full: "A-708, Sector 2, Rohini, Delhi – 110085, India",
  },

  linkedinUrl: "https://www.linkedin.com/company/coool-air-enterprises/posts/?feedView=all",

  // --------------------------------------------------------------------
  // TO CONNECT THE CONTACT FORM TO A REAL BACKEND (Google Forms):
  // submissions are sent straight to a Google Form's own submit endpoint -
  // no server, no script deployment, no OAuth authorization of any kind,
  // so there's nothing here for Google's Advanced Protection Program (or
  // any account security setting) to block. Responses land in the Form's
  // own "Responses" tab (and/or a linked Google Sheet) automatically.
  //
  // 1. Go to forms.google.com and create a new form (under any Google
  //    account - it does NOT need to be the client's; ownership can be
  //    transferred or the client can create their own final version later,
  //    since only the values below need to change, nothing in the code).
  //    Add one question per form field, matching src/pages/contact.html:
  //    Name, Company Name, Phone, Email, Project Location, Service
  //    Required (ideally a dropdown with the same options as the site's
  //    <select>), Message / Requirement.
  // 2. Click the eye icon (Preview), or the "⋮" menu -> "Get pre-filled
  //    link" - fill in one distinct dummy value per question (e.g. type
  //    "NAME_FIELD" into the Name box, "PHONE_FIELD" into Phone, etc.) and
  //    click "Get link". The generated URL contains one "entry.XXXXXXXXX="
  //    parameter per question - match each entry ID to the dummy value you
  //    typed to know which ID belongs to which field, then paste each ID
  //    into GOOGLE_FORM.entryIds below.
  // 3. Take that same form's normal URL, replace the trailing "/viewform"
  //    with "/formResponse", and paste the result into GOOGLE_FORM.action
  //    below (e.g. "https://docs.google.com/forms/d/e/XXXXXXXX/formResponse").
  // 4. In the Google Form itself, open Settings -> Responses and turn on
  //    "Get email notifications for new responses" so whoever owns the
  //    form (you, or later the client) is notified as enquiries arrive.
  // 5. That's it - no other file needs to change. src/js/main.js already
  //    reads GOOGLE_FORM.action to switch from the "not connected yet"
  //    notice to actually submitting the form.
  //
  // Note: because Google Forms' submit endpoint doesn't allow the browser
  // to read back a response (a deliberate cross-origin restriction on
  // Google's side, not something this site's code can work around), the
  // form always shows the success message once it sends without a network
  // error - it can't distinguish "Google accepted it" from "Google rejected
  // it" the way a custom backend could. In practice a well-formed
  // submission to a real, existing form is reliably accepted.
  // --------------------------------------------------------------------
  GOOGLE_FORM: {
    action: "https://docs.google.com/forms/d/e/1FAIpQLSdk9Hd_nmooFDJv514wSkKHsnqSAJZYdaIleq0TQvBLlhP8FA/formResponse",
    entryIds: {
      name: "entry.501160073",
      company: "entry.929169047",
      phone: "entry.655237810",
      email: "entry.1790561078",
      location: "entry.970311897",
      service: "entry.441237905",
      message: "entry.1529129142",
    },
  },
};
