UPDATE public.government_schemes
SET
  application_process = '1. Visit the official PM-KMY portal or nearest Common Service Centre (CSC).\n2. Fill in the enrollment form with Aadhaar, bank account, and nominee details.\n3. Submit the form and pay the first contribution.\n4. Receive a pension card and SMS confirmation within 7 working days.\n5. Continue monthly contributions through auto-debit or CSC visit.',
  important_dates = 'Enrollment is open throughout the year.\nContribution due date: 1st of every month.\nGrace period: up to 15th of the month without penalty.',
  contact_info = 'Toll-free helpline: 1800-11-0001\nEmail: pmkmy@gov.in\nNearest CSC: Call 155333 or visit pmkmy.gov.in/csc-locator'
WHERE scheme_name = 'PM Kisan Maandhan Yojana';

UPDATE public.government_schemes
SET
  application_process = '1. Apply online through the Mudra portal or visit a participating bank branch.\n2. Select the loan category: Shishu (up to ₹50,000), Kishore (₹50,001–₹5 lakh), or Tarun (₹5,00,001–₹10 lakh).\n3. Submit business plan, identity proof, and address proof.\n4. Bank reviews and disburses the loan directly to your account within 7–14 days.\n5. Repay in affordable EMI tenure up to 5 years.',
  important_dates = 'Applications accepted year-round.\nLoan disbursement: within 14 working days of complete application.\nInterest subsidy deadlines: apply before 31st March for annual revision.',
  contact_info = 'MUDRA Helpline: 1800-180-1111\nEmail: mudra@sidbi.in\nWebsite: www.mudra.org.in\nGrievance portal: pgportal.gov.in'
WHERE scheme_name = 'PM Mudra Yojana';

UPDATE public.government_schemes
SET
  application_process = '1. Check eligibility on pmjay.gov.in using your mobile number or Aadhaar.\n2. Visit an empaneled hospital with your e-card or Aadhaar.\n3. Hospital verifies your eligibility through the PM-JAY portal.\n4. Cashless treatment is approved for covered procedures.\n5. No paperwork or upfront payment required for eligible beneficiaries.',
  important_dates = 'Enrollment is continuous via SECC 2011 list updates.\nCard validity: lifetime for eligible families.\nHospital empanelement renewals: annual.',
  contact_info = 'PM-JAY Helpline: 14555 / 1800-111-565\nEmail: ayushmanbharat@nha.gov.in\nState nodal officers: listed on pmjay.gov.in/state-contacts'
WHERE scheme_name = 'Ayushman Bharat – PMJAY';

UPDATE public.government_schemes
SET
  application_process = '1. Open an Atal Pension Yojana account at any bank or post office.\n2. Fill the APY registration form with Aadhaar and bank account details.\n3. Choose your monthly pension amount (₹1,000 to ₹5,000).\n4. Set up auto-debit for monthly contributions.\n5. Receive PRAN card and regular SMS updates.',
  important_dates = 'Account opening: any time of the year.\nContribution due: monthly, by the last working day.\nPenalty for delayed payment: ₹1 to ₹10 per month depending on contribution amount.\nGovernment co-contribution eligibility: until 31st December 2025 for eligible subscribers.',
  contact_info = 'PFRDA Helpline: 1800-110-069\nEmail: apy@pfrda.org.in\nWebsite: www.npscra.nsdl.co.in/APY.php'
WHERE scheme_name = 'Atal Pension Yojana';