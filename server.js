// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

// src/data/questions.ts
var QUESTION_POOL = [
  // --- Category 1: Public Service Rules (PSR) & Kaduna Civil Service Laws ---
  {
    id: 1,
    text: "According to the Public Service Rules (PSR), what is the compulsory retirement age for civil servants in Kaduna State, excluding special constitutional exceptions?",
    options: [
      { key: "A", text: "55 years of age or 30 years of pensionable service, whichever is earlier" },
      { key: "B", text: "60 years of age or 35 years of pensionable service, whichever is earlier" },
      { key: "C", text: "65 years of age or 40 years of pensionable service, whichever is earlier" },
      { key: "D", text: "60 years of age regardless of the number of years served" }
    ],
    correctAnswer: "B",
    explanation: "PSR 020810 stipulates that the compulsory retirement age for all grades in the Service shall be 60 years of age or 35 years of pensionable service, whichever is earlier.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Public Service Rules, Cap 02, Sec 8"
  },
  {
    id: 2,
    text: "When a formal query is issued to an officer for an act of misconduct, what is the statutory time limit within which the officer must submit a written representation?",
    options: [
      { key: "A", text: "24 hours" },
      { key: "B", text: "48 hours (2 working days)" },
      { key: "C", text: "72 hours (3 working days)" },
      { key: "D", text: "14 working days" }
    ],
    correctAnswer: "C",
    explanation: "Under Kaduna State Civil Service disciplinary guidelines, an officer queried must tender a written defense within 72 hours (3 working days) from the receipt of the query unless an official extension is granted.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Disciplinary Guidelines & PSR 030302"
  },
  {
    id: 3,
    text: "Which of the following acts is classified strictly as 'Serious Misconduct' under the Public Service Rules?",
    options: [
      { key: "A", text: "Occasional unpunctuality to work" },
      { key: "B", text: "Improper dressing during official hours" },
      { key: "C", text: "Absence from duty without leave (AWOL) and falsification of official records" },
      { key: "D", text: "Minor failure to keep a clean desk" }
    ],
    correctAnswer: "C",
    explanation: "Serious Misconduct is defined as a specific act of very serious nature and culpable negligence. Examples include falsification of records, absence from duty without leave (AWOL), corruption, and unauthorized disclosure of official information.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "PSR Chapter 03, Section 4 (Serious Misconduct)"
  },
  {
    id: 4,
    text: "Under Kaduna State Civil Service regulations, what is the duration of paid maternity leave granted to eligible female civil servants?",
    options: [
      { key: "A", text: "8 weeks" },
      { key: "B", text: "12 weeks" },
      { key: "C", text: "16 weeks (4 months)" },
      { key: "D", text: "6 months" }
    ],
    correctAnswer: "C",
    explanation: "Kaduna State Government upgraded maternity leave to 16 weeks (four calendar months) fully paid to encourage exclusive breastfeeding and maternal-child health recovery.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Executive Council Circular on Maternity Leave Policy"
  },
  {
    id: 5,
    text: "What is the annual leave entitlement for senior civil servants on Grade Level 08 and above in the Kaduna State Civil Service?",
    options: [
      { key: "A", text: "14 calendar days" },
      { key: "B", text: "21 calendar days" },
      { key: "C", text: "30 calendar days" },
      { key: "D", text: "42 calendar days" }
    ],
    correctAnswer: "C",
    explanation: "Officers on Grade Level 08 and above are entitled to 30 calendar days of annual leave per fiscal year. Officers on GL 01-07 are entitled to 14 or 21 days depending on grade.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "PSR 100102 - Leave Regulations"
  },
  {
    id: 6,
    text: "An officer on interdiction following criminal allegations or grave disciplinary proceedings is entitled to receive what proportion of their salary pending final determination?",
    options: [
      { key: "A", text: "Zero salary (100% forfeiture)" },
      { key: "B", text: "50% (half) of their monthly salary" },
      { key: "C", text: "75% of their monthly salary" },
      { key: "D", text: "Full salary without allowances" }
    ],
    correctAnswer: "B",
    explanation: "PSR 030404 provides that an officer placed on interdiction shall receive 50% of his/her consolidated salary until the case is disposed of. If exonerated, the withheld half is refunded.",
    category: "Public Service Rules",
    targetGrades: ["12-13"],
    referencePolicy: "PSR 030404 - Rules on Interdiction & Suspension"
  },
  {
    id: 7,
    text: "Which constitutional and statutory body is primarily responsible for appointments, promotions, and disciplinary control of civil servants in Kaduna State?",
    options: [
      { key: "A", text: "Kaduna State House of Assembly Committee on Health" },
      { key: "B", text: "Kaduna State Civil Service Commission (KDSCSC)" },
      { key: "C", text: "Head of Service Disciplinary Taskforce" },
      { key: "D", text: "Ministry of Justice Arbitration Panel" }
    ],
    correctAnswer: "B",
    explanation: "Section 197 of the 1999 Constitution of the Federal Republic of Nigeria establishes the State Civil Service Commission, vested with powers to appoint, promote, and discipline civil servants.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "1999 Constitution of Nigeria (as amended), Section 197"
  },
  {
    id: 8,
    text: "Which of the following declarations must every public officer make and submit before assuming official duties and periodically every four years thereafter?",
    options: [
      { key: "A", text: "Hippocratic Oath Declaration" },
      { key: "B", text: "Assets and Liabilities Declaration to the Code of Conduct Bureau" },
      { key: "C", text: "Public Service Loyalty Bond" },
      { key: "D", text: "Auditor-General Clearance Form" }
    ],
    correctAnswer: "B",
    explanation: "Part I of the Fifth Schedule to the 1999 Constitution mandates every public officer to declare their assets and liabilities to the Code of Conduct Bureau (CCB) upon appointment and every 4 years.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Code of Conduct Bureau and Tribunal Act, Cap C15 LFN 2004"
  },
  {
    id: 9,
    text: "In public service administrative correspondence, an official circular emanating from the Office of the Head of Service (OHOS) is regarded as:",
    options: [
      { key: "A", text: "An advisory guideline that MDAs can disregard" },
      { key: "B", text: "A legally binding policy directive applicable across all State Ministries, Departments, and Agencies" },
      { key: "C", text: "A temporary recommendation valid for only 30 days" },
      { key: "D", text: "A union consultation memorandum" }
    ],
    correctAnswer: "B",
    explanation: "Circulars issued by the Head of Service convey binding administrative policies, executive council resolutions, and interpretations of Service Rules to all MDAs.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Civil Service Handbook, Administrative Procedures"
  },
  {
    id: 10,
    text: "What is the penalty for an officer convicted of a criminal offense involving dishonesty, embezzlement, or felony by a court of competent jurisdiction?",
    options: [
      { key: "A", text: "Written reprimand and withholding of one promotion" },
      { key: "B", text: "Immediate dismissal from the Civil Service" },
      { key: "C", text: "Compulsory redeployment to another ministry" },
      { key: "D", text: "Reduction in grade level by one step" }
    ],
    correctAnswer: "B",
    explanation: "Under PSR 030402, an officer convicted of a criminal offense involving dishonesty or corruption shall be dismissed from the service from the date of conviction.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "PSR 030402 - Dismissal upon Criminal Conviction"
  },
  // --- Category 2: Scheme of Service & Health Cadres ---
  {
    id: 11,
    text: "What is the statutory minimum maturity period (years in post) required for senior healthcare professionals on Grade Level 12 before becoming eligible for promotion to Grade Level 13?",
    options: [
      { key: "A", text: "2 years" },
      { key: "B", text: "3 years" },
      { key: "C", text: "4 years" },
      { key: "D", text: "5 years" }
    ],
    correctAnswer: "B",
    explanation: "Under the Federal and Kaduna State Scheme of Service, the minimum maturity period for promotion between Grade Level 07 and Grade Level 14 is three (3) years. GL 15 to 17 requires four (4) years.",
    category: "Scheme of Service",
    targetGrades: ["12-13"],
    referencePolicy: "Revised Scheme of Service for the Civil Service, Chapter on Promotion Criteria"
  },
  {
    id: 12,
    text: "What is the approved entry Grade Level for a Medical Doctor (MBBS/BDS) who has successfully completed their Housemanship and National Youth Service Corps (NYSC)?",
    options: [
      { key: "A", text: "Grade Level 08" },
      { key: "B", text: "Grade Level 10" },
      { key: "C", text: "Grade Level 12" },
      { key: "D", text: "Grade Level 13" }
    ],
    correctAnswer: "C",
    explanation: "In the public service scheme of service for medical doctors in Nigeria, post-NYSC Medical Officers and Dental Officers enter the service at Grade Level 12 (formerly CONMESS 02).",
    category: "Scheme of Service",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "National Scheme of Service for Doctors / CONMESS Structure"
  },
  {
    id: 13,
    text: "What is the regular entry Grade Level for a Registered Nurse/Midwife possessing a Bachelor of Nursing Science (B.N.Sc.) degree with NYSC discharge certificate?",
    options: [
      { key: "A", text: "Grade Level 07" },
      { key: "B", text: "Grade Level 08" },
      { key: "C", text: "Grade Level 09" },
      { key: "D", text: "Grade Level 10" }
    ],
    correctAnswer: "B",
    explanation: "Graduates holding a Bachelor of Nursing Science (B.N.Sc.) degree enter the Scheme of Service at Grade Level 08 as Nursing Officer II.",
    category: "Scheme of Service",
    targetGrades: ["07-10"],
    referencePolicy: "Scheme of Service for Nursing Officers Cadre"
  },
  {
    id: 14,
    text: "Which cadre in the Ministry of Health is primarily responsible for the custody, quality control, compounding, and dispensing of pharmaceuticals in state hospitals?",
    options: [
      { key: "A", text: "Medical Laboratory Science Cadre" },
      { key: "B", text: "Pharmacist Cadre" },
      { key: "C", text: "Health Information Management Cadre" },
      { key: "D", text: "Community Health Officers Cadre" }
    ],
    correctAnswer: "B",
    explanation: "The Pharmacist cadre is statutory charged with pharmacy practice, rational drug use, compounding, inventory management, and pharmaceutical inspections under the Pharmacy Council of Nigeria standards.",
    category: "Scheme of Service",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Scheme of Service for Pharmacists Cadre"
  },
  {
    id: 15,
    text: "To advance from Principal Medical Officer (GL 12/13) to Assistant Chief Medical Officer / Chief Medical Officer, which evaluation credential is required alongside the promotion examination?",
    options: [
      { key: "A", text: "Recommendation from local trade union only" },
      { key: "B", text: "Satisfactory Annual Performance Evaluation Report (APER) scores for the preceding 3 years and current medical license renewal" },
      { key: "C", text: "Passing an overseas fellowship exam only" },
      { key: "D", text: "Oral endorsement from the hospital patient welfare committee" }
    ],
    correctAnswer: "B",
    explanation: "Promotion requires fulfilling the 3-year minimum maturity period, passing the promotion evaluation, possessing satisfactory APER scores (minimum 60%) for the last 3 years, and maintaining valid professional practicing licenses.",
    category: "Scheme of Service",
    targetGrades: ["12-13"],
    referencePolicy: "KDSCSC Guidelines on Promotion & APER Assessment"
  },
  {
    id: 16,
    text: "What is the designation of an officer on Grade Level 13 in the Administrative or General Health Cadre?",
    options: [
      { key: "A", text: "Senior Officer" },
      { key: "B", text: "Principal Officer" },
      { key: "C", text: "Assistant Chief Officer" },
      { key: "D", text: "Director" }
    ],
    correctAnswer: "C",
    explanation: "In the Nigerian civil service nomenclature, GL 10 is Senior Officer, GL 12 is Principal Officer, GL 13 is Assistant Chief Officer, GL 14 is Chief Officer, GL 15 is Assistant Director, GL 16 is Deputy Director, and GL 17 is Director.",
    category: "Scheme of Service",
    targetGrades: ["12-13"],
    referencePolicy: "Federal & State Civil Service Scheme of Service Nomenclature"
  },
  {
    id: 17,
    text: "Which cadre is statutory mandated to manage patient health records, disease coding (ICD-11), vital statistics, and health data reporting to the DHIS2 portal?",
    options: [
      { key: "A", text: "Health Information Management / Medical Records Cadre" },
      { key: "B", text: "Executive Officer (General Duties)" },
      { key: "C", text: "Biomedical Engineering Cadre" },
      { key: "D", text: "Social Welfare Cadre" }
    ],
    correctAnswer: "A",
    explanation: "The Health Information Management (HIM) Cadre manages clinical record keeping, patient indexing, statistical collation, and routine reporting on the District Health Information Software (DHIS2).",
    category: "Scheme of Service",
    targetGrades: ["07-10"],
    referencePolicy: "HIM Professional Practice & Cadre Guidelines"
  },
  {
    id: 18,
    text: "Can a healthcare professional practicing in a Kaduna State Government facility operate a private clinic during official working hours?",
    options: [
      { key: "A", text: "Yes, provided the officer notifies the hospital head" },
      { key: "B", text: "Yes, if the private clinic is located in the same local government" },
      { key: "C", text: "No. Public Service Rules strictly prohibit engaging in private practice or business that conflicts with official working hours" },
      { key: "D", text: "Yes, as long as it does not exceed 10 hours per week" }
    ],
    correctAnswer: "C",
    explanation: "Code of Conduct rules and PSR 030429 prohibit full-time public officers from engaging in private practice or other gainful private business to the detriment of public health duties.",
    category: "Scheme of Service",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Code of Conduct 5th Schedule & PSR 030429"
  },
  {
    id: 19,
    text: "Which of the following qualifications is required for progression to the position of Chief Medical Laboratory Scientist (GL 14)?",
    options: [
      { key: "A", text: "BMLS / AMLSCN degree with required years of post-qualification experience, maturity period, and current AMLSCN practicing license" },
      { key: "B", text: "National Diploma in Community Health" },
      { key: "C", text: "Certificate in Hospital Administration only" },
      { key: "D", text: "WAEC certificate with 5 credits" }
    ],
    correctAnswer: "A",
    explanation: "Medical Laboratory Scientists must hold professional BMLS/AMLSCN licensure, fulfill the 3-year maturity period from Assistant Chief (GL 13), and maintain up-to-date MLSCN licensure.",
    category: "Scheme of Service",
    targetGrades: ["12-13"],
    referencePolicy: "MLSCN Regulatory Guidelines & Public Scheme of Service"
  },
  {
    id: 20,
    text: "What is the primary role of a Hospital Quality Assurance Committee led by senior medical officers (GL 12/13)?",
    options: [
      { key: "A", text: "Setting medical tariffs and parking fees" },
      { key: "B", text: "Auditing clinical outcomes, infection prevention, patient safety protocols, and rational medication use" },
      { key: "C", text: "Managing staff promotion examination halls" },
      { key: "D", text: "Directing architectural construction of new wards" }
    ],
    correctAnswer: "B",
    explanation: "Quality Assurance Committees oversee clinical governance, infection control standards, mortality reviews, and patient safety compliance across clinical departments.",
    category: "Scheme of Service",
    targetGrades: ["12-13"],
    referencePolicy: "National Quality Assurance Policy for Health Facilities"
  },
  // --- Category 3: Health Policies, KADCHMA & Strategic Planning ---
  {
    id: 21,
    text: "What is the primary mandate of the Kaduna State Contributory Health Management Authority (KADCHMA)?",
    options: [
      { key: "A", text: "To manufacture vaccines locally in Kaduna" },
      { key: "B", text: "To administer and implement social health insurance, guaranteeing access to quality healthcare for all residents without financial hardship" },
      { key: "C", text: "To supervise secondary school health clubs" },
      { key: "D", text: "To enforce international border quarantine" }
    ],
    correctAnswer: "B",
    explanation: "KADCHMA was established by Kaduna State Law No. 3 of 2018 to ensure universal health coverage (UHC) through the Kaduna State Contributory Health Scheme (KSCHS), protecting citizens from catastrophic health spending.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Contributory Health Scheme Law, 2018"
  },
  {
    id: 22,
    text: "Under the Primary Health Care Under One Roof (PHCUOR) policy implemented by the Kaduna State Primary Health Care Development Agency (KSPHCDA), what is the key organizational principle?",
    options: [
      { key: "A", text: "All PHCs must be physically constructed in one single metropolitan roof" },
      { key: "B", text: "Integration of all primary healthcare services, human resources, and financing under a single management authority at the state level" },
      { key: "C", text: "Only general hospitals are allowed to provide immunizations" },
      { key: "D", text: "Primary health centres are privatized to foreign donors" }
    ],
    correctAnswer: "B",
    explanation: "PHCUOR brings all primary healthcare functions (immunization, maternal care, human resources, funding) previously split between State ministries and Local Government Councils under a single agency (KSPHCDA).",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "National Primary Health Care Development Agency (NPHCDA) Guidelines"
  },
  {
    id: 23,
    text: "What is the primary tertiary referral and teaching hospital directly affiliated with the Kaduna State Government?",
    options: [
      { key: "A", text: "National Hospital Abuja" },
      { key: "B", text: "Barau Dikko Teaching Hospital (BDTH), Kaduna" },
      { key: "C", text: "Ahmadu Bello University Teaching Hospital, Zaria" },
      { key: "D", text: "University College Hospital, Ibadan" }
    ],
    correctAnswer: "B",
    explanation: "Barau Dikko Teaching Hospital (BDTH) is the State-owned tertiary teaching institution affiliated with Kaduna State University (KASU) College of Health Sciences.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Health Facilities Directory & KASU BDTH Law"
  },
  {
    id: 24,
    text: "In public health disease surveillance in Kaduna State, what does the acronym 'IDSR' stand for?",
    options: [
      { key: "A", text: "Institutional Disease Sanitary Review" },
      { key: "B", text: "Integrated Disease Surveillance and Response" },
      { key: "C", text: "Internal Drug Supply Record" },
      { key: "D", text: "International Diagnostics Safety Register" }
    ],
    correctAnswer: "B",
    explanation: "IDSR stands for Integrated Disease Surveillance and Response, the WHO-recommended epidemiological framework used by the State Ministry of Health to monitor epidemic-prone diseases.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "WHO / NCDC Integrated Disease Surveillance and Response Technical Guidelines"
  },
  {
    id: 25,
    text: "Which priority goal is anchored in the Kaduna State Health Strategic Development Plan (KD-SHSDP)?",
    options: [
      { key: "A", text: "Eliminating all public hospitals in favor of private dispensaries" },
      { key: "B", text: "Accelerating progress towards Universal Health Coverage (UHC), reducing maternal and under-5 child mortality, and strengthening health systems" },
      { key: "C", text: "Transitioning all medical staff to contract positions" },
      { key: "D", text: "Abolishing health insurance contributions" }
    ],
    correctAnswer: "B",
    explanation: "The Kaduna State Strategic Health Development Plan focuses on reducing maternal, neonatal, and under-5 mortality, strengthening infrastructure, and expanding universal financial protection through KADCHMA.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["12-13"],
    referencePolicy: "Kaduna State Strategic Health Development Plan (KD-SHSDP II)"
  },
  {
    id: 26,
    text: "What is the primary role of the Kaduna State Health Supplies Management Agency (KADHSMA / formerly KADFAMA)?",
    options: [
      { key: "A", text: "Enforcing traffic regulations near hospital zones" },
      { key: "B", text: "Forecasting, warehousing, quality-assuring, and distributing essential medicines and medical consumables to public health facilities" },
      { key: "C", text: "Conducting civil service promotional examinations" },
      { key: "D", text: "Issuing international driving permits to doctors" }
    ],
    correctAnswer: "B",
    explanation: "KADHSMA is the state agency responsible for the end-to-end pharmaceutical supply chain, ensuring availability of high-quality, affordable essential medicines across Kaduna State health facilities.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Health Supplies Management Agency Law"
  },
  {
    id: 27,
    text: "Which of the following diseases is classified as an Immediately Notifiable Disease requiring reporting within 24 hours under the IDSR system in Kaduna State?",
    options: [
      { key: "A", text: "Hypertension" },
      { key: "B", text: "Lassa Fever, Cholera, and Measles" },
      { key: "C", text: "Osteoarthritis" },
      { key: "D", text: "Refractive eye error" }
    ],
    correctAnswer: "B",
    explanation: "Lassa Fever, Cholera, Yellow Fever, Measles, and Acute Flaccid Paralysis (AFP/Polio) are epidemic-prone, immediately reportable diseases requiring notification to the State Epidemiologist within 24 hours.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "NCDC IDSR Technical Guidelines on Priority Diseases"
  },
  {
    id: 28,
    text: "In the context of the Basic Health Care Provision Fund (BHCPF), what percentage of the Consolidated Revenue Fund (CRF) of the Federal Government is allocated by the National Health Act?",
    options: [
      { key: "A", text: "Not less than 1% of the CRF" },
      { key: "B", text: "Exactly 5% of the CRF" },
      { key: "C", text: "10% of the CRF" },
      { key: "D", text: "0.1% of the CRF" }
    ],
    correctAnswer: "A",
    explanation: "Section 11 of the National Health Act 2014 establishes the Basic Health Care Provision Fund (BHCPF) financed with not less than 1% of the Federal Government's Consolidated Revenue Fund.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["12-13"],
    referencePolicy: "National Health Act 2014, Section 11"
  },
  {
    id: 29,
    text: "What is the standard Infection Prevention and Control (IPC) protocol required of healthcare workers between every patient contact?",
    options: [
      { key: "A", text: "Wearing three sets of gloves simultaneously without hand washing" },
      { key: "B", text: "Appropriate hand hygiene (hand washing with soap and running water or alcohol-based hand rub)" },
      { key: "C", text: "Changing lab coats only at the end of the month" },
      { key: "D", text: "Rinsing hands in cold water without soap" }
    ],
    correctAnswer: "B",
    explanation: "Hand hygiene is the single most effective standard precaution in infection prevention and control (IPC) to break the chain of nosocomial infection transmission.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10"],
    referencePolicy: "Kaduna State IPC Guidelines & WHO 5 Moments of Hand Hygiene"
  },
  {
    id: 30,
    text: "What is the legal standing of the Patient's Bill of Rights (PBoR) in public hospitals across Kaduna State?",
    options: [
      { key: "A", text: "It is an internal hospital cafeteria rulebook" },
      { key: "B", text: "A consumer protection charter guaranteeing patients rights to privacy, informed consent, quality care, and emergency medical treatment" },
      { key: "C", text: "It allows patients to prescribe their own medications" },
      { key: "D", text: "An agreement exempting hospitals from keeping medical records" }
    ],
    correctAnswer: "B",
    explanation: "The Patient's Bill of Rights outlines the fundamental rights of healthcare consumers, including dignity, privacy, confidentiality, informed consent, and non-discrimination.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Federal Competition & Consumer Protection Commission (FCCPC) Patient's Bill of Rights"
  },
  // --- Category 4: Human Resource Development & Disciplinary Procedures ---
  {
    id: 31,
    text: "What is the maximum duration an officer may be granted 'Casual Leave' in any single calendar year under the Public Service Rules?",
    options: [
      { key: "A", text: "3 working days" },
      { key: "B", text: "7 working days" },
      { key: "C", text: "14 working days" },
      { key: "D", text: "30 working days" }
    ],
    correctAnswer: "B",
    explanation: "PSR 100201 provides that casual leave is granted for urgent personal matters and must not exceed seven (7) days in one calendar year, deductible from the officer's annual leave entitlement.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "PSR 100201 - Casual Leave Provisions"
  },
  {
    id: 32,
    text: "Under Kaduna State Human Resource policies, what condition must an employee fulfill to be eligible for Study Leave with Pay?",
    options: [
      { key: "A", text: "Must have served for at least two consecutive years with confirmed appointment, and the course must be in high-need professional priority areas" },
      { key: "B", text: "Any staff member can proceed immediately after recruitment without approval" },
      { key: "C", text: "Only officers who have failed promotion exams are eligible" },
      { key: "D", text: "Officers must resign from the civil service first" }
    ],
    correctAnswer: "A",
    explanation: "Study leave with pay requires confirmed appointment, minimum years of service (usually 2-3 years), official sponsorship approval by the Civil Service Commission, and signing a training bond.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State HR Policy Manual, Section on Training & Development"
  },
  {
    id: 33,
    text: "When an officer executes a Training Bond upon receiving state sponsorship for postgraduate medical or nursing fellowship, what does the bond legally mandate?",
    options: [
      { key: "A", text: "The officer must remain permanently on Grade Level 08" },
      { key: "B", text: "The officer must serve the Kaduna State Government for a specified period (e.g. 2 to 5 years) upon completion, or refund the total cost of training" },
      { key: "C", text: "The officer must forfeit all pension rights" },
      { key: "D", text: "The officer must relocate overseas upon graduation" }
    ],
    correctAnswer: "B",
    explanation: "A training bond legally commits the beneficiary officer to render continuous service to the State Government for a specified period (or refund all training salaries, tuition, and allowances) upon graduation.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["12-13"],
    referencePolicy: "Kaduna State Public Service Training Bonding Regulations"
  },
  {
    id: 34,
    text: "What is the primary objective of the Annual Performance Evaluation Report (APER) / Performance Management System (PMS)?",
    options: [
      { key: "A", text: "To identify officers to be demoted every Christmas" },
      { key: "B", text: "To objectively assess staff performance against predetermined work targets, identify training needs, and support promotion decisions" },
      { key: "C", text: "To calculate overtime travel allowances" },
      { key: "D", text: "To track daily biometric clock-ins exclusively" }
    ],
    correctAnswer: "B",
    explanation: "The APER/PMS system evaluates civil servants' competence, target delivery, initiative, and integrity, identifying skill gaps for training and forming a critical component of promotion scoring.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Civil Service Performance Management System Guidelines"
  },
  {
    id: 35,
    text: "If an officer disagrees with the adverse remarks written on their APER form by their immediate reporting officer, what is the required administrative procedure?",
    options: [
      { key: "A", text: "The officer should destroy the form secretly" },
      { key: "B", text: "The adverse remarks must be communicated to the officer in writing, who must sign and is given opportunity to make written representation before the countersigning officer reviews it" },
      { key: "C", text: "The reporting officer can submit it directly to the Governor without notifying the employee" },
      { key: "D", text: "The officer must immediately file a civil suit in court" }
    ],
    correctAnswer: "B",
    explanation: "PSR 050204 dictates that whenever an adverse remark is made on an officer's evaluation, it must be brought to their attention in writing, permitting them to acknowledge and explain their perspective.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["12-13"],
    referencePolicy: "PSR 050204 - Evaluation & Adverse Remarks Procedure"
  },
  {
    id: 36,
    text: "What disciplinary measure entails the temporary forfeiture of salary and temporary removal from active duty while an investigation into alleged gross misconduct is conducted?",
    options: [
      { key: "A", text: "Termination" },
      { key: "B", text: "Suspension" },
      { key: "C", text: "Reprimand" },
      { key: "D", text: "Transfer" }
    ],
    correctAnswer: "B",
    explanation: "Suspension is applied where a prima facie case of serious misconduct has been established against an officer, pending the outcome of formal disciplinary or criminal proceedings.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "PSR 030405 - Suspension Rules"
  },
  {
    id: 37,
    text: "Which of the following officers has the statutory power to dismiss a confirmed civil servant on Grade Level 12 or 13?",
    options: [
      { key: "A", text: "The Medical Director of the hospital alone" },
      { key: "B", text: "The State Civil Service Commission (KDSCSC) in accordance with due process" },
      { key: "C", text: "The Chief Nursing Officer" },
      { key: "D", text: "The Ward Head where the hospital is situated" }
    ],
    correctAnswer: "B",
    explanation: "Only the Civil Service Commission has the constitutional and statutory jurisdiction to dismiss or terminate the appointment of senior confirmed civil servants (GL 07 and above).",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["12-13"],
    referencePolicy: "Kaduna State Civil Service Commission Regulations"
  },
  {
    id: 38,
    text: "What is the minimum passing score generally benchmarked by the Civil Service Commission for candidate progression in promotion assessments?",
    options: [
      { key: "A", text: "40%" },
      { key: "B", text: "50%" },
      { key: "C", text: "60%" },
      { key: "D", text: "75%" }
    ],
    correctAnswer: "C",
    explanation: "The benchmark composite pass mark for civil service promotion examinations in Kaduna State is 60%, incorporating written exam scores, APER ratings, and oral interview where applicable.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Civil Service Commission Promotion Guidelines"
  },
  {
    id: 39,
    text: "Under Kaduna State Civil Service disciplinary guidelines, which committee at the Ministry level investigates allegations against officers before forwarding recommendations to the CSC?",
    options: [
      { key: "A", text: "Junior / Senior Staff Disciplinary Committee (SSDC)" },
      { key: "B", text: "Hospital Cafeteria Oversight Board" },
      { key: "C", text: "Trade Union Action Council" },
      { key: "D", text: "Public Complaints Commission Ombudsman" }
    ],
    correctAnswer: "A",
    explanation: "The Senior Staff Disciplinary Committee (SSDC) chaired by the Permanent Secretary conducts formal investigations, gives the officer fair hearing, and submits findings to the Civil Service Commission.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["12-13"],
    referencePolicy: "Kaduna State Public Service Rules, SSDC Operational Guidelines"
  },
  {
    id: 40,
    text: "What is the approved duration of 'Paternity Leave' granted to male civil servants in Kaduna State upon the delivery of a spouse's child?",
    options: [
      { key: "A", text: "No paternity leave is recognized" },
      { key: "B", text: "14 working days" },
      { key: "C", text: "30 calendar days" },
      { key: "D", text: "60 days" }
    ],
    correctAnswer: "B",
    explanation: "Under the revised civil service regulations adopted by the Federal and progressive State governments including Kaduna, male civil servants are eligible for 14 working days of paternity leave.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Circular on Paternity Leave in Public Service"
  },
  // --- Category 5: Financial Regulations & Public Procurement ---
  {
    id: 41,
    text: "Who is designated as the statutory 'Accounting Officer' of a State Ministry such as the Ministry of Health?",
    options: [
      { key: "A", text: "The Honourable Commissioner" },
      { key: "B", text: "The Permanent Secretary" },
      { key: "C", text: "The Director of Finance and Accounts" },
      { key: "D", text: "The Chief Internal Auditor" }
    ],
    correctAnswer: "B",
    explanation: "Under Financial Regulations and Public Service Law, the Permanent Secretary is the Accounting Officer of the Ministry, legally accountable for all public revenues and expenditures.",
    category: "Financial & Procurement Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Financial Regulations (FR 101) & Kaduna State Public Finance Law"
  },
  {
    id: 42,
    text: "Which statutory body is mandated to regulate, set standards, and issue Certificates of 'No Objection' for public procurement contracts in Kaduna State?",
    options: [
      { key: "A", text: "Kaduna State Public Procurement Authority (KDPPA)" },
      { key: "B", text: "Federal Inland Revenue Service (FIRS)" },
      { key: "C", text: "State Security Service (SSS)" },
      { key: "D", text: "Corporate Affairs Commission (CAC)" }
    ],
    correctAnswer: "A",
    explanation: "The Kaduna State Public Procurement Authority (KDPPA) is the regulatory organ established under the Kaduna State Public Procurement Law to ensure transparency, competition, and value for money.",
    category: "Financial & Procurement Rules",
    targetGrades: ["12-13"],
    referencePolicy: "Kaduna State Public Procurement Law, 2016"
  },
  {
    id: 43,
    text: "What is an 'AIE' in public sector financial management and budget execution?",
    options: [
      { key: "A", text: "Annual Internal Evaluation" },
      { key: "B", text: "Authority to Incur Expenditure" },
      { key: "C", text: "Audited Income Equivalent" },
      { key: "D", text: "Assets Insurance Endorsement" }
    ],
    correctAnswer: "B",
    explanation: "An AIE (Authority to Incur Expenditure) is a formal financial warrant issued by the Ministry of Finance / Accounting Officer authorizing a spending officer or hospital to incur approved expenditures.",
    category: "Financial & Procurement Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Financial Regulations, Chapter on Warrants & Budgetary Control"
  },
  {
    id: 44,
    text: "What is the required procedure when hospital medical equipment costing above the ministerial threshold is to be procured?",
    options: [
      { key: "A", text: "The Chief Medical Director buys it using cash from hospital counter" },
      { key: "B", text: "Competitive public tender/bidding through the Ministerial Tenders Board (MTB) or KDPPA following due process" },
      { key: "C", text: "Awarding the contract directly to any hospital staff's family business" },
      { key: "D", text: "Purchasing without issuing receipts" }
    ],
    correctAnswer: "B",
    explanation: "Procurement exceeding administrative thresholds must go through competitive bidding and evaluation by the Ministerial Tenders Board (MTB) or KDPPA, ensuring value for money.",
    category: "Financial & Procurement Rules",
    targetGrades: ["12-13"],
    referencePolicy: "Kaduna State Public Procurement Regulations"
  },
  {
    id: 45,
    text: "Under Financial Regulations, what is an 'Imprest' in hospital administrative management?",
    options: [
      { key: "A", text: "A permanent loan given to a doctor for housing" },
      { key: "B", text: "A standing advance of cash issued to an officer to meet petty, day-to-day administrative operational expenses, which must be retired regularly" },
      { key: "C", text: "A salary advance that is never refunded" },
      { key: "D", text: "A fee charged to patients for admission cards" }
    ],
    correctAnswer: "B",
    explanation: "An imprest is a petty cash advance given to a designated officer for minor, urgent running expenses, strictly accounted for and retired on or before the end of each financial year.",
    category: "Financial & Procurement Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Financial Regulations, Section on Advances & Imprests"
  },
  {
    id: 46,
    text: "What is the function of the Internal Audit Unit in the Kaduna State Ministry of Health?",
    options: [
      { key: "A", text: "To perform surgical operations in emergency wards" },
      { key: "B", text: "To conduct pre-payment audits, verify vouchers, safeguard government assets, and ensure compliance with financial regulations" },
      { key: "C", text: "To hire permanent nursing staff" },
      { key: "D", text: "To print hospital identity cards" }
    ],
    correctAnswer: "B",
    explanation: "The Internal Audit Unit provides independent appraisal of financial systems, conducts continuous pre-payment audits, and ensures that funds are expended in compliance with the approved budget.",
    category: "Financial & Procurement Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Public Finance Management Regulations"
  },
  {
    id: 47,
    text: "Under the Contributory Pension Scheme (CPS) operational in Kaduna State, what is the mandatory pension contribution rate deducted from employee and employer respectively?",
    options: [
      { key: "A", text: "2% employee, 2% employer" },
      { key: "B", text: "8% employee, 10% employer (minimum total 18%)" },
      { key: "C", text: "15% employee, 0% employer" },
      { key: "D", text: "25% deducted equally" }
    ],
    correctAnswer: "B",
    explanation: "Under the Pension Reform Act and Kaduna State Pension Scheme Law, the minimum contribution rate is 8% of monthly emoluments by the employee and 10% by the employer (totaling 18%).",
    category: "Financial & Procurement Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Pension Reform Law & Pension Reform Act 2014"
  },
  {
    id: 48,
    text: "What is 'Virement' in public sector financial management?",
    options: [
      { key: "A", text: "Transfer of funds from one budget subhead to another within the same ministry with statutory legislative/executive approval" },
      { key: "B", text: "Taking a personal bank overdraft to pay hospital utility bills" },
      { key: "C", text: "Overcharging patients for laboratory investigations" },
      { key: "D", text: "The total forfeiture of a ministry's capital budget" }
    ],
    correctAnswer: "A",
    explanation: "Virement refers to the legal re-allocation of approved budgetary savings from one sub-head of expenditure to another sub-head where a deficit exists, requiring formal approval.",
    category: "Financial & Procurement Rules",
    targetGrades: ["12-13"],
    referencePolicy: "Financial Regulations (FR 308) - Virement Procedures"
  },
  {
    id: 49,
    text: "What is the penalty for a public officer who signs a certificate of completion for medical supplies or civil works that have not been delivered or executed?",
    options: [
      { key: "A", text: "A verbal recommendation to be careful next time" },
      { key: "B", text: "It constitutes false certification and gross misconduct, attracting prosecution, surcharge, and dismissal" },
      { key: "C", text: "A 24-hour suspension with full pay" },
      { key: "D", text: "Automatic transfer to another department" }
    ],
    correctAnswer: "B",
    explanation: "Issuing false certificates of completion violates the Public Procurement Act, Financial Regulations, and Criminal Code, resulting in criminal prosecution, recovery of public funds, and dismissal.",
    category: "Financial & Procurement Rules",
    targetGrades: ["12-13"],
    referencePolicy: "KDPPA Law 2016 & Criminal Code of Kaduna State"
  },
  {
    id: 50,
    text: "What is the role of the Public Accounts Committee (PAC) of the Kaduna State House of Assembly?",
    options: [
      { key: "A", text: "To distribute drugs to primary healthcare centres" },
      { key: "B", text: "To examine the audited accounts of all MDAs as submitted by the Auditor-General and summon Accounting Officers on financial queries" },
      { key: "C", text: "To issue medical certificates of fitness to civil servants" },
      { key: "D", text: "To approve annual leave for permanent secretaries" }
    ],
    correctAnswer: "B",
    explanation: "The Public Accounts Committee (PAC) exercises legislative oversight over public expenditure by reviewing the Auditor-General's statutory audit reports and summoning accounting officers.",
    category: "Financial & Procurement Rules",
    targetGrades: ["12-13"],
    referencePolicy: "Constitution of Nigeria Section 125 & Kaduna State House of Assembly Standing Rules"
  },
  // --- Category 1 Extended (Questions 51-60) ---
  {
    id: 51,
    text: "What is the status of an unconfirmed officer who fails to pass the prescribed Civil Service Confirmation Examination within the statutory probationary period of two years?",
    options: [
      { key: "A", text: "The officer is automatically promoted to the next grade" },
      { key: "B", text: "The probationary period may be extended or the appointment terminated in accordance with PSR provisions" },
      { key: "C", text: "The officer is granted permanent tenure by default" },
      { key: "D", text: "The officer receives double increments" }
    ],
    correctAnswer: "B",
    explanation: "PSR 020301 specifies that probationary appointments are for two years. Failure to achieve confirmation through required examinations may lead to extension or termination of appointment.",
    category: "Public Service Rules",
    targetGrades: ["07-10"],
    referencePolicy: "PSR 020301 - Probationary Service & Confirmation"
  },
  {
    id: 52,
    text: "Under the Kaduna State Public Service Rules, can an officer participate actively in partisan political campaigns while remaining in public service?",
    options: [
      { key: "A", text: "Yes, during weekends only" },
      { key: "B", text: "Yes, if the officer wears traditional attire instead of uniform" },
      { key: "C", text: "No. Civil servants must maintain political neutrality and must resign or retire before contesting or openly campaigning for political office" },
      { key: "D", text: "Yes, provided the political party is registered in Kaduna State" }
    ],
    correctAnswer: "C",
    explanation: "Public Service Rules and Supreme Court jurisprudence uphold that public servants must maintain strict non-partisanship to protect civil service integrity, resigning before seeking partisan office.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "PSR 030422 - Non-Partisan Conduct of Civil Servants"
  },
  {
    id: 53,
    text: "What is the official procedure for resigning from the Kaduna State Civil Service for a confirmed pensionable officer?",
    options: [
      { key: "A", text: "Sending a text message to the department messenger on the day of departure" },
      { key: "B", text: "Submitting one month's written notice through the proper channel or paying one month's salary in lieu of notice" },
      { key: "C", text: "Abandoning duty for 30 consecutive days" },
      { key: "D", text: "Submitting a resignation notice directly to the Governor's personal residence" }
    ],
    correctAnswer: "B",
    explanation: "PSR 020801 provides that a confirmed officer wishing to resign must give one month's formal notice in writing or pay one month's salary in lieu thereof, ensuring orderly handover of government property.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "PSR 020801 - Resignation of Appointment"
  },
  {
    id: 54,
    text: "Which of the following documents is mandatory when an officer applies for sick leave exceeding three consecutive days?",
    options: [
      { key: "A", text: "A handwritten letter from a religious leader" },
      { key: "B", text: "A valid Medical Certificate of Fitness/Illness issued by a registered Government Medical Officer" },
      { key: "C", text: "A receipt from a local pharmacy store" },
      { key: "D", text: "An affidavit from a customary court" }
    ],
    correctAnswer: "B",
    explanation: "Sick leave extending beyond 3 days must be supported by a certified medical report from an approved Government Medical Practitioner or hospital designated by the Ministry.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "PSR Chapter 10, Section 3 - Sick Leave Regulations"
  },
  {
    id: 55,
    text: "Under official civil service protocol, how should an official communication addressed to another Ministry be signed by a Director on behalf of the Permanent Secretary?",
    options: [
      { key: "A", text: "Signing with their own personal business name" },
      { key: "B", text: "Signing their name and designation 'for: Permanent Secretary'" },
      { key: "C", text: "Signing as 'Co-Minister'" },
      { key: "D", text: "Leaving the document unsigned" }
    ],
    correctAnswer: "B",
    explanation: "Letters issuing from a Ministry are legally sent on behalf of the Accounting Officer (Permanent Secretary). Directors and designated officers sign 'for: Permanent Secretary'.",
    category: "Public Service Rules",
    targetGrades: ["12-13"],
    referencePolicy: "Civil Service Handbook, Section on Official Correspondence"
  },
  {
    id: 56,
    text: "What is the maximum period of accumulated sick leave with full pay that a permanent civil servant may be granted before being placed on a Medical Board review?",
    options: [
      { key: "A", text: "1 month" },
      { key: "B", text: "3 months" },
      { key: "C", text: "6 months" },
      { key: "D", text: "2 years" }
    ],
    correctAnswer: "C",
    explanation: "Under PSR 100302, an officer can be granted sick leave on full pay for up to six months. If illness continues, sick leave on half pay may be granted, followed by a Medical Board recommendation.",
    category: "Public Service Rules",
    targetGrades: ["12-13"],
    referencePolicy: "PSR 100302 - Medical Board Provisions"
  },
  {
    id: 57,
    text: "Can a civil servant accept expensive personal gifts, hospitality, or monetary donations from commercial vendors contracting with the Ministry of Health?",
    options: [
      { key: "A", text: "Yes, during festive periods only" },
      { key: "B", text: "No. PSR and the Code of Conduct strictly prohibit receiving gifts that compromise or appear to compromise official objectivity" },
      { key: "C", text: "Yes, if the value is below one hundred thousand Naira" },
      { key: "D", text: "Yes, if shared with colleagues in the department" }
    ],
    correctAnswer: "B",
    explanation: "Code of Conduct Fifth Schedule prohibits public officers from accepting gifts, hospitality, or favors from persons or contractors having official dealings with their agency.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Fifth Schedule, 1999 Constitution (Code of Conduct Bureau)"
  },
  {
    id: 58,
    text: "What does the administrative term 'Gazetting' signify regarding a civil servant's appointment or promotion?",
    options: [
      { key: "A", text: "Publishing the officer's portrait in a weekly newspaper" },
      { key: "B", text: "Formal official publication of the appointment/confirmation in the Government Official Gazette, providing prima facie legal evidence" },
      { key: "C", text: "Issuing a permanent hospital parking sticker" },
      { key: "D", text: "Enrolling the officer in the national health insurance scheme" }
    ],
    correctAnswer: "B",
    explanation: "Gazetting refers to notification in the State or Federal Official Gazette, giving legal and judicial notice to the officer's appointment, confirmation, or status change.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Civil Service Handbook, Section on Gazetting & Documentation"
  },
  {
    id: 59,
    text: "If an officer fails to report to a new duty station after an official posting order has been issued by the Ministry of Health, this constitutes:",
    options: [
      { key: "A", text: "Normal negotiation of posting terms" },
      { key: "B", text: "Refusal of posting and insubordination, an act of misconduct punishable under the Public Service Rules" },
      { key: "C", text: "Automatic entitlement to stay at the old duty station" },
      { key: "D", text: "A ground for an immediate double salary increment" }
    ],
    correctAnswer: "B",
    explanation: "Refusal to accept an official posting is insubordination and disobedience of lawful orders under PSR 030301, subject to disciplinary sanctions.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "PSR 030301 - Misconduct & Insubordination"
  },
  {
    id: 60,
    text: "Under what circumstance may a confidential government medical record be released to an external third party without patient consent?",
    options: [
      { key: "A", text: "Whenever requested by a curious neighbor" },
      { key: "B", text: "Under a subpoena issued by a court of competent jurisdiction or statutory mandatory public health notification laws" },
      { key: "C", text: "Whenever a journalist offers a monetary stipend" },
      { key: "D", text: "Medical records are never confidential under any circumstances" }
    ],
    correctAnswer: "B",
    explanation: "Medical confidentiality can only be breached upon valid patient consent, a court subpoena/order, or statutory public health disease reporting mandates.",
    category: "Public Service Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "National Health Act 2014, Part III (Health Records Confidentiality)"
  },
  // --- Category 2 Extended: Scheme of Service & Health Cadres (Questions 61-70) ---
  {
    id: 61,
    text: "What is the terminal progression Grade Level for a Nursing Officer in the Kaduna State Civil Service who does not attain a Director position?",
    options: [
      { key: "A", text: "Grade Level 10" },
      { key: "B", text: "Grade Level 12" },
      { key: "C", text: "Grade Level 14 (Chief Nursing Officer)" },
      { key: "D", text: "Grade Level 09" }
    ],
    correctAnswer: "C",
    explanation: "In the professional cadre structure, the professional line terminates at Chief Nursing Officer (GL 14) before executive directorate advancements (GL 15-17).",
    category: "Scheme of Service",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "National Scheme of Service for Nursing Cadre"
  },
  {
    id: 62,
    text: "Which health cadre in Kaduna State is primarily deployed to provide comprehensive primary maternal, newborn, and child health care at Primary Health Centres (PHCs)?",
    options: [
      { key: "A", text: "Community Health Extension Workers (CHEWs) and Midwives" },
      { key: "B", text: "Dental Technologists" },
      { key: "C", text: "Orthopedic Cast Technicians" },
      { key: "D", text: "Radiation Therapists" }
    ],
    correctAnswer: "A",
    explanation: "CHEWs, Community Health Officers (CHOs), and certified midwives form the frontline backbone of service delivery at Primary Health Centres across the 23 LGAs of Kaduna State.",
    category: "Scheme of Service",
    targetGrades: ["07-10"],
    referencePolicy: "Community Health Practitioners Registration Board of Nigeria (CHPRBN) Standards"
  },
  {
    id: 63,
    text: "What is the primary role of a Hospital Mortality Review Committee chaired by senior clinical specialists (GL 12/13)?",
    options: [
      { key: "A", text: "To assign monetary fines to grieving families" },
      { key: "B", text: "To clinically audit deaths, identify preventable lapses, optimize clinical pathways, and improve patient survival rates" },
      { key: "C", text: "To fast-track mortuary bills" },
      { key: "D", text: "To cancel post-mortem examinations" }
    ],
    correctAnswer: "B",
    explanation: "Mortality and Morbidity (M&M) reviews provide confidential peer review of patient deaths to identify system bottlenecks, diagnosis delays, and therapeutic deficiencies to prevent future fatalities.",
    category: "Scheme of Service",
    targetGrades: ["12-13"],
    referencePolicy: "Clinical Governance & Quality Improvement Framework"
  },
  {
    id: 64,
    text: "Which of the following professional health regulatory bodies regulates the training and licensure of Radiographers in Kaduna State?",
    options: [
      { key: "A", text: "Radiographers Registration Board of Nigeria (RRBN)" },
      { key: "B", text: "Council of Registered Builders" },
      { key: "C", text: "Nigerian Institute of Quantity Surveyors" },
      { key: "D", text: "Dental Therapists Registration Board" }
    ],
    correctAnswer: "A",
    explanation: "The Radiographers Registration Board of Nigeria (RRBN) is the statutory body regulating the radiography, medical ultrasound, CT, and MRI professionals in Nigeria.",
    category: "Scheme of Service",
    targetGrades: ["07-10"],
    referencePolicy: "RRBN Act, Cap R1 LFN 2004"
  },
  {
    id: 65,
    text: "In managing pharmaceutical inventories at hospital pharmacies, what does the FEFO inventory management rule stand for?",
    options: [
      { key: "A", text: "First Entered, First Ordered" },
      { key: "B", text: "First Expired, First Out" },
      { key: "C", text: "Fastest Emergency Fast Output" },
      { key: "D", text: "Final Expense Fixed Order" }
    ],
    correctAnswer: "B",
    explanation: "FEFO (First Expired, First Out) ensures that pharmaceutical products with the earliest expiration date are dispensed first, preventing stock expiration and financial loss.",
    category: "Scheme of Service",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Logistics & Drug Management SOP"
  },
  {
    id: 66,
    text: "What is the key role of the Biomedical Engineering Cadre within the Ministry of Health?",
    options: [
      { key: "A", text: "Dispensing medicines to outpatients" },
      { key: "B", text: "Installation, preventive maintenance, calibration, and repair of electro-medical equipment in hospitals" },
      { key: "C", text: "Auditing hospital financial accounts" },
      { key: "D", text: "Conducting nursing shift handovers" }
    ],
    correctAnswer: "B",
    explanation: "Biomedical engineers ensure high uptime, preventive calibration, safety checks, and repairs of clinical life-support, diagnostic, and surgical equipment.",
    category: "Scheme of Service",
    targetGrades: ["07-10"],
    referencePolicy: "Scheme of Service for Biomedical Engineering Officers"
  },
  {
    id: 67,
    text: "In clinical governance, what does 'Triage' mean when patients arrive at an accident and emergency (A&E) department?",
    options: [
      { key: "A", text: "Demanding immediate cash payment before any consultation" },
      { key: "B", text: "The sorting and categorization of patients according to the urgency and severity of their medical condition" },
      { key: "C", text: "Referring all patients to distant clinics" },
      { key: "D", text: "Separating patients by their town of origin" }
    ],
    correctAnswer: "B",
    explanation: "Triage is the clinical sorting of patients based on clinical priority (e.g., Red: resuscitation/immediate, Yellow: urgent, Green: non-urgent) to save critical lives first.",
    category: "Scheme of Service",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Emergency Triage Assessment and Treatment (ETAT) Protocols"
  },
  {
    id: 68,
    text: "Which of the following describes the supervisory role of a Chief Medical Officer (GL 14) over junior resident doctors and interns?",
    options: [
      { key: "A", text: "Delegating all major surgical cases to interns without supervision" },
      { key: "B", text: "Conducting clinical ward rounds, reviewing case notes, providing mentorship, ensuring ethical adherence, and evaluating performance" },
      { key: "C", text: "Refusing to sign clinical logbooks" },
      { key: "D", text: "Exempting doctors from attending departmental seminars" }
    ],
    correctAnswer: "B",
    explanation: "Supervisory senior officers are responsible for clinical quality assurance, clinical ward rounds, mentoring juniors, logbook verification, and enforcing patient safety guidelines.",
    category: "Scheme of Service",
    targetGrades: ["12-13"],
    referencePolicy: "Medical and Dental Council of Nigeria (MDCN) Code of Conduct"
  },
  {
    id: 69,
    text: "What does the abbreviation 'SOP' represent in hospital clinical and laboratory operations?",
    options: [
      { key: "A", text: "Special Officer Promotion" },
      { key: "B", text: "Standard Operating Procedure" },
      { key: "C", text: "State Organization Policy" },
      { key: "D", text: "Supplementary Order Protocol" }
    ],
    correctAnswer: "B",
    explanation: "A Standard Operating Procedure (SOP) is an authorized step-by-step written instruction to achieve uniformity and high quality in clinical, diagnostic, and administrative procedures.",
    category: "Scheme of Service",
    targetGrades: ["07-10"],
    referencePolicy: "Hospital Clinical Quality Management Guidelines"
  },
  {
    id: 70,
    text: "In public hospital administration, which department is responsible for managing patient admission registries, medical billing, hospital statistics, and death records?",
    options: [
      { key: "A", text: "Health Information Management / Medical Records Department" },
      { key: "B", text: "Biomedical Maintenance Unit" },
      { key: "C", text: "Catering and Dietary Department" },
      { key: "D", text: "Laundry and Linen Department" }
    ],
    correctAnswer: "A",
    explanation: "The Medical Records / HIM department manages the custody, creation, archiving, statistical analysis, and retrieval of clinical health records.",
    category: "Scheme of Service",
    targetGrades: ["07-10"],
    referencePolicy: "Health Information Management SOP Manual"
  },
  // --- Category 3 Extended: Health Policies, KADCHMA & Strategic Planning (Questions 71-80) ---
  {
    id: 71,
    text: "Under KADCHMA health insurance benefit packages, how are accredited public and private healthcare facilities reimbursed for primary care encounters?",
    options: [
      { key: "A", text: "Through monthly Capitation payments" },
      { key: "B", text: "Through daily pocket cash given by patients" },
      { key: "C", text: "Through barter exchange of supplies" },
      { key: "D", text: "Through annual lotteries" }
    ],
    correctAnswer: "A",
    explanation: "Capitation is the fixed monthly advance sum paid per registered enrollee to primary healthcare providers for delivering the basic healthcare benefit package.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["12-13"],
    referencePolicy: "KADCHMA Operational Guidelines, Provider Payment Mechanisms"
  },
  {
    id: 72,
    text: "What is the 'Formal Sector Programme' under the Kaduna State Contributory Health Scheme (KSCHS)?",
    options: [
      { key: "A", text: "Health insurance for international diplomats only" },
      { key: "B", text: "Mandatory health insurance coverage for all public sector civil servants and organized private sector employees" },
      { key: "C", text: "A scheme for tourists visiting the state" },
      { key: "D", text: "A loan program for hospital construction" }
    ],
    correctAnswer: "B",
    explanation: "The Formal Sector Programme covers state and local government civil servants and organized private sector employees through payroll contributions, providing comprehensive family coverage.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Contributory Health Scheme Operational Manual"
  },
  {
    id: 73,
    text: "What is the specific purpose of the 'Vulnerable Group Fund' administered by KADCHMA?",
    options: [
      { key: "A", text: "To purchase executive vehicles for ministry directors" },
      { key: "B", text: "To provide subsidized or free healthcare coverage for the poorest residents, pregnant women, children under 5, the aged, and persons with disabilities" },
      { key: "C", text: "To pay overseas travel allowances" },
      { key: "D", text: "To construct private shopping plazas" }
    ],
    correctAnswer: "B",
    explanation: "The Vulnerable Group Fund provides health equity by subsidizing full healthcare premiums for indigents, low-income pregnant mothers, orphans, and persons living with disabilities.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "KADCHMA Equity & Vulnerable Group Strategy"
  },
  {
    id: 74,
    text: "Which of the following is considered a core pillar of the WHO 'Building Blocks' of Health Systems followed by the Kaduna State Ministry of Health?",
    options: [
      { key: "A", text: "Service Delivery, Health Workforce, Health Information, Medical Products/Vaccines, Financing, and Leadership/Governance" },
      { key: "B", text: "Commercial Advertising, Billboard Construction, and Television Broadcasting" },
      { key: "C", text: "Stock Trading, Currency Exchange, and Real Estate Development" },
      { key: "D", text: "Diplomatic Immunity, Military Patrols, and Aviation Logistics" }
    ],
    correctAnswer: "A",
    explanation: "The WHO Health System Framework consists of six core building blocks: 1. Service Delivery; 2. Health Workforce; 3. Health Information Systems; 4. Essential Medicines; 5. Financing; 6. Leadership & Governance.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["12-13"],
    referencePolicy: "WHO Health Systems Framework & KD-SHSDP"
  },
  {
    id: 75,
    text: "In public health logistics, what temperature range must the 'Cold Chain' maintain for standard heat-sensitive vaccines (e.g., Pentavalent, OPV, Measles) at facility storage?",
    options: [
      { key: "A", text: "-20\xB0C to -40\xB0C exclusively" },
      { key: "B", text: "+2\xB0C to +8\xB0C" },
      { key: "C", text: "+15\xB0C to +25\xB0C" },
      { key: "D", text: "+37\xB0C" }
    ],
    correctAnswer: "B",
    explanation: "Vaccine cold chain refrigerators at health facility levels must maintain temperatures consistently between +2\xB0C and +8\xB0C to preserve vaccine potency.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10"],
    referencePolicy: "NPHCDA National Vaccine Logistics SOP"
  },
  {
    id: 76,
    text: "What does the maternal and child health intervention acronym 'ANC' stand for?",
    options: [
      { key: "A", text: "African Nursing Congress" },
      { key: "B", text: "Antenatal Care" },
      { key: "C", text: "Advanced Neonatal Card" },
      { key: "D", text: "Annual Nutrition Census" }
    ],
    correctAnswer: "B",
    explanation: "Antenatal Care (ANC) is routine clinical care provided to pregnant women to monitor maternal and fetal well-being and identify complications early.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10"],
    referencePolicy: "Kaduna State Reproductive Health Policy"
  },
  {
    id: 77,
    text: "What is the recommended minimum number of Antenatal Care (ANC) contacts recommended by the updated WHO and Kaduna State clinical guidelines for a positive pregnancy experience?",
    options: [
      { key: "A", text: "1 contact" },
      { key: "B", text: "4 visits" },
      { key: "C", text: "8 contacts" },
      { key: "D", text: "15 contacts" }
    ],
    correctAnswer: "C",
    explanation: "The updated WHO 2016 model adopted in Nigeria increases recommended ANC contacts from 4 to 8 to significantly reduce perinatal mortality and maternal complications.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["12-13"],
    referencePolicy: "WHO Recommendations on Antenatal Care for a Positive Pregnancy Experience"
  },
  {
    id: 78,
    text: "Which of the following bodies is responsible for organizing the emergency response to disease outbreaks (e.g. Diphtheria, Cholera) in Kaduna State?",
    options: [
      { key: "A", text: "Public Health Emergency Operations Centre (PHEOC) / Rapid Response Team (RRT)" },
      { key: "B", text: "Hospital Mortuary Advisory Board" },
      { key: "C", text: "Ministry of Finance Budget Office" },
      { key: "D", text: "Local Government Pension Board" }
    ],
    correctAnswer: "A",
    explanation: "The Public Health Emergency Operations Centre (PHEOC) coordinates incident management, contact tracing, laboratory confirmation, and logistics during disease outbreaks.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Ministry of Health Outbreak Preparedness Plan"
  },
  {
    id: 79,
    text: "What is the primary objective of the Task Shifting and Task Sharing (TSTS) Policy for essential healthcare services?",
    options: [
      { key: "A", text: "To eliminate doctors and pharmacists completely from civil service" },
      { key: "B", text: "To rationally redistribute specific health tasks among available health cadres (such as CHEWs and midwives) to improve access to life-saving care in underserved areas" },
      { key: "C", text: "To transfer all administrative work to hospital guards" },
      { key: "D", text: "To shift hospital equipment from one LGA to another every week" }
    ],
    correctAnswer: "B",
    explanation: "Task Shifting and Task Sharing (TSTS) optimizes available health workforce cadres by delegating defined clinical interventions to trained mid-level workers to address critical human resource shortages.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["12-13"],
    referencePolicy: "National Task-Shifting and Task-Sharing Policy for Essential Health Services"
  },
  {
    id: 80,
    text: "What is the strategic objective of the Kaduna State Primary Health Care Memorandum of Understanding (MoU) with development partners (e.g., BMGF, Aliko Dangote Foundation)?",
    options: [
      { key: "A", text: "To privatize all primary health centres" },
      { key: "B", text: "To strengthen routine immunization systems, maternal-child survival, and sustainable domestic health financing" },
      { key: "C", text: "To build private 5-star hotels for health officials" },
      { key: "D", text: "To abolish health data collection" }
    ],
    correctAnswer: "B",
    explanation: "The Tripartite Primary Health Care MoU focuses on governance, routine immunization coverage, supply chain reliability, and progressive state funding transition.",
    category: "Health Policies & KADCHMA",
    targetGrades: ["12-13"],
    referencePolicy: "Kaduna State Routine Immunization & Primary Health MoU Agreement"
  },
  // --- Category 4 Extended: HR & Disciplinary Procedures (Questions 81-90) ---
  {
    id: 81,
    text: "Under the principles of Natural Justice and Fair Hearing (Section 36 of the Constitution), what must happen before disciplinary sanctions are imposed on an officer?",
    options: [
      { key: "A", text: "The officer must be convicted in secret without viewing the charges" },
      { key: "B", text: "The officer must be informed in writing of the allegations against them and given full opportunity to defend themselves" },
      { key: "C", text: "The department must first freeze the officer's relatives' bank accounts" },
      { key: "D", text: "Sanctions must be imposed first, followed by questioning six months later" }
    ],
    correctAnswer: "B",
    explanation: "Section 36 of the 1999 Constitution (audi alteram partem) requires that no person may be condemned or penalized without being informed of the case against them and given adequate opportunity to defend themselves.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["12-13"],
    referencePolicy: "1999 Constitution of Nigeria, Section 36 & PSR 030302"
  },
  {
    id: 82,
    text: "What is the consequence when an officer continuously receives unsatisfactory APER ratings (below 50%) for three consecutive years?",
    options: [
      { key: "A", text: "The officer is promoted to Director" },
      { key: "B", text: "The officer's increment is withheld or deferred, and the officer may be recommended for retirement or termination on grounds of general inefficiency" },
      { key: "C", text: "The officer is awarded an international study scholarship" },
      { key: "D", text: "The officer's salary is doubled" }
    ],
    correctAnswer: "B",
    explanation: "PSR 030601 provides that where an officer exhibits persistent inefficiency and fails to improve despite counseling and training, their services may be terminated.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["12-13"],
    referencePolicy: "PSR 030601 - General Inefficiency & Increment Withholding"
  },
  {
    id: 83,
    text: "Which of the following actions constitutes an unauthorized absence from duty (AWOL) under the Kaduna State Civil Service Rules?",
    options: [
      { key: "A", text: "Attending an approved official ministerial committee meeting" },
      { key: "B", text: "Leaving one's official post without approved leave or permission for multiple consecutive days" },
      { key: "C", text: "Proceeding on approved statutory annual leave" },
      { key: "D", text: "Resting on a gazetted public holiday" }
    ],
    correctAnswer: "B",
    explanation: "Absence from duty without permission (AWOL) is a serious misconduct. Officers absent without justification forfeit salary for the days missed and face disciplinary dismissal.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["07-10"],
    referencePolicy: "PSR 030402 - Absence Without Leave"
  },
  {
    id: 84,
    text: "Can a superior officer delegate their statutory disciplinary powers (such as issuing queries or suspensions) to a non-civil servant or casual security guard?",
    options: [
      { key: "A", text: "Yes, whenever the superior officer is busy" },
      { key: "B", text: "No. Disciplinary powers in the civil service are statutory and can only be exercised by authorized public officers in accordance with the law" },
      { key: "C", text: "Yes, if the security guard has worked for 5 years" },
      { key: "D", text: "Yes, for verbal queries only" }
    ],
    correctAnswer: "B",
    explanation: "Disciplinary authority derives from the Constitution and Civil Service Commission delegating instruments and cannot be assigned to unauthorized persons.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["12-13"],
    referencePolicy: "Administrative Law & KDSCSC Delegated Powers"
  },
  {
    id: 85,
    text: "What is an 'Official Secret' under the Official Secrets Act applicable to healthcare and administrative workers in Kaduna State?",
    options: [
      { key: "A", text: "The personal recipe of the hospital kitchen" },
      { key: "B", text: "Any classified government document, record, or communication marked Secret, Confidential, or Restricted, unauthorized disclosure of which is a criminal offense" },
      { key: "C", text: "The daily market prices of vegetables" },
      { key: "D", text: "The public list of gazetted holidays" }
    ],
    correctAnswer: "B",
    explanation: "The Official Secrets Act criminalizes the unauthorized disclosure, transmission, or possession of classified official documents and confidential government communications.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Official Secrets Act, Cap O3 LFN 2004"
  },
  {
    id: 86,
    text: "What is the definition of 'Insubordination' in the public service context?",
    options: [
      { key: "A", text: "Politely clarifying an ambiguous work assignment" },
      { key: "B", text: "Deliberate refusal to obey lawful instructions or official directives given by a constituted superior authority" },
      { key: "C", text: "Submitting a leave application through the proper channel" },
      { key: "D", text: "Reporting to work 10 minutes earlier than scheduled" }
    ],
    correctAnswer: "B",
    explanation: "Insubordination involves willful disobedience or contempt of lawful authority, representing serious misconduct under PSR 030401.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "PSR 030401 - Insubordination & Penalties"
  },
  {
    id: 87,
    text: "What is the maximum period within which a newly recruited civil servant must be provided with a formal letter of appointment and job description?",
    options: [
      { key: "A", text: "Immediately upon assumption of duty" },
      { key: "B", text: "After 10 years of service" },
      { key: "C", text: "Only when the officer is about to retire" },
      { key: "D", text: "Civil servants never receive appointment letters" }
    ],
    correctAnswer: "A",
    explanation: "Upon appointment by the Civil Service Commission, the candidate is issued a formal letter specifying grade level, step, probationary terms, and core responsibilities upon reporting.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["07-10"],
    referencePolicy: "Civil Service Handbook, Section on Recruitment & Onboarding"
  },
  {
    id: 88,
    text: "When an officer reaches the age of 60 or completes 35 years of service, how many months of pre-retirement leave is the officer entitled to take prior to the effective date?",
    options: [
      { key: "A", text: "1 week" },
      { key: "B", text: "3 calendar months" },
      { key: "C", text: "6 calendar months" },
      { key: "D", text: "1 year" }
    ],
    correctAnswer: "B",
    explanation: "PSR 100238 provides that officers due to retire are entitled to proceed on three (3) months pre-retirement leave prior to their actual retirement date to facilitate terminal documentation.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["12-13"],
    referencePolicy: "PSR 100238 - Pre-Retirement Leave Provisions"
  },
  {
    id: 89,
    text: "What is the role of the State Joint Public Service Negotiating Council?",
    options: [
      { key: "A", text: "Managing hospital mortuaries" },
      { key: "B", text: "Serving as the collective bargaining forum between government and civil service trade unions regarding terms and conditions of employment" },
      { key: "C", text: "Awarding drug procurement contracts" },
      { key: "D", text: "Conducting nursing licensure exams" }
    ],
    correctAnswer: "B",
    explanation: "The Joint Negotiating Council handles collective bargaining, industrial harmony, salary negotiations, and dispute resolutions between the Government and labor unions.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["12-13"],
    referencePolicy: "Trade Union Act & Kaduna State Industrial Relations Guidelines"
  },
  {
    id: 90,
    text: "What disciplinary sanction entails the reduction of an officer's salary to a lower incremental step within their current salary grade?",
    options: [
      { key: "A", text: "Withholding of Increment" },
      { key: "B", text: "Reduction in Rank / Step Demotion" },
      { key: "C", text: "Formal Reprimand" },
      { key: "D", text: "Interdiction" }
    ],
    correctAnswer: "B",
    explanation: "Demotion or reduction in incremental step lowers an officer's step or grade level as a punitive disciplinary measure ordered by the Civil Service Commission.",
    category: "HR & Disciplinary Procedures",
    targetGrades: ["12-13"],
    referencePolicy: "PSR Chapter 03, Section 5 - Punishments for Misconduct"
  },
  // --- Category 5 Extended: Financial & Procurement Rules (Questions 91-100) ---
  {
    id: 91,
    text: "Under the Kaduna State Public Procurement Law, what constitutes 'Bid Rigging' or 'Collusive Tendering'?",
    options: [
      { key: "A", text: "An open public opening of sealed bids" },
      { key: "B", text: "An illegal agreement among competing vendors to fix prices, allocate contracts, or manipulate the competitive bidding process" },
      { key: "C", text: "Printing tender documents in color" },
      { key: "D", text: "Advertising procurement bids on the official state website" }
    ],
    correctAnswer: "B",
    explanation: "Bid rigging is a corrupt and illegal practice where competitors conspire to manipulate contract prices or determine who wins, violating public procurement legislation.",
    category: "Financial & Procurement Rules",
    targetGrades: ["12-13"],
    referencePolicy: "Kaduna State Public Procurement Law 2016, Anti-Collusion Clauses"
  },
  {
    id: 92,
    text: "What is a 'Payment Voucher' (PV) in government financial accounting?",
    options: [
      { key: "A", text: "A patient's appointment card" },
      { key: "B", text: "The primary accounting document detailing the payee, amount, purpose, vote of charge, and authorizing signatures before government payment is released" },
      { key: "C", text: "A receipt from a private grocery store" },
      { key: "D", text: "A temporary hospital gate pass" }
    ],
    correctAnswer: "B",
    explanation: "A Payment Voucher is the official statutory accounting document authorizing and recording disbursement of public funds, fully referenced with receipts and approvals.",
    category: "Financial & Procurement Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Financial Regulations, Chapter on Payment Vouchers"
  },
  {
    id: 93,
    text: "In public financial management, what does the 'Treasury Single Account' (TSA) system accomplish?",
    options: [
      { key: "A", text: "It allows every doctor to open their own bank account for hospital fees" },
      { key: "B", text: "It consolidates all government revenues and receipts into a unified bank account at the Central Bank/designated bank, eliminating commercial account fragmentation and leakages" },
      { key: "C", text: "It converts government money into foreign cryptocurrency" },
      { key: "D", text: "It terminates all hospital services" }
    ],
    correctAnswer: "B",
    explanation: "TSA is a public accounting system consolidating government cash resources in a single structure, providing comprehensive visibility of government cash resources and minimizing leakage.",
    category: "Financial & Procurement Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Kaduna State Treasury Single Account Policy Directive"
  },
  {
    id: 94,
    text: "What is an 'Unretired Advance' under Financial Regulations?",
    options: [
      { key: "A", text: "A salary payment made 10 days early" },
      { key: "B", text: "Money disbursed to an officer for official duty that has not been accounted for with valid receipts and documentation within the stipulated period" },
      { key: "C", text: "A retirement benefit paid to an ex-director" },
      { key: "D", text: "A grant given by the World Health Organization" }
    ],
    correctAnswer: "B",
    explanation: "Advances must be retired immediately upon completion of the assignment. Unretired advances are recoverable through immediate deductions from the officer's monthly salary.",
    category: "Financial & Procurement Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Financial Regulations (FR 1405) - Retirement of Advances"
  },
  {
    id: 95,
    text: "Under Kaduna State Public Procurement regulations, what is the role of an 'Evaluation Committee'?",
    options: [
      { key: "A", text: "To determine hospital ward bed-making schedules" },
      { key: "B", text: "To objectively analyze and score submitted bids against predetermined technical and financial evaluation criteria, recommending the lowest responsive evaluated bid" },
      { key: "C", text: "To award contracts arbitrarily to the most expensive vendor" },
      { key: "D", text: "To conduct staff fitness exercises" }
    ],
    correctAnswer: "B",
    explanation: "The Evaluation Committee evaluates bids strictly according to criteria stipulated in the tender documents, ensuring fairness, transparency, and value for money.",
    category: "Financial & Procurement Rules",
    targetGrades: ["12-13"],
    referencePolicy: "KDPPA Evaluation Manual & Guidelines"
  },
  {
    id: 96,
    text: "What is a 'Vote of Charge' in government budget administration?",
    options: [
      { key: "A", text: "A ballot cast during general elections" },
      { key: "B", text: "The specific budgetary budget code/subhead against which an expenditure is legally authorized and debited" },
      { key: "C", text: "The electrical charge generated by hospital generators" },
      { key: "D", text: "A disciplinary charge sheet against a nurse" }
    ],
    correctAnswer: "B",
    explanation: "The Vote of Charge is the specific budgetary classification code from which funds are drawn, ensuring expenditures remain within appropriated legislative heads.",
    category: "Financial & Procurement Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Financial Regulations, Head of Expenditure & Vote Accounting"
  },
  {
    id: 97,
    text: "Under Kaduna State financial rules, which document must accompany the delivery of pharmaceuticals to the central medical stores before payment can be cleared?",
    options: [
      { key: "A", text: "A handwritten thank-you note" },
      { key: "B", text: "Store Receipt Voucher (SRV), Delivery Note/Waybill, Purchase Order (LPO), and Certificate of Quality Analysis" },
      { key: "C", text: "A commercial business card only" },
      { key: "D", text: "A personal passport photograph of the driver" }
    ],
    correctAnswer: "B",
    explanation: "Public store accounting requires a Goods Received Note / Store Receipt Voucher (SRV), inspection report, delivery waybill, and valid LPO before processing payment.",
    category: "Financial & Procurement Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Financial Regulations, Stores Administration & SRV Guidelines"
  },
  {
    id: 98,
    text: "What does the term 'Capital Expenditure' represent in the Kaduna State Ministry of Health annual budget?",
    options: [
      { key: "A", text: "Funds expended on acquiring or upgrading physical long-term assets such as hospital construction, operating theatres, and major diagnostic machinery" },
      { key: "B", text: "Daily money spent on tea and office biscuits" },
      { key: "C", text: "Monthly employee basic salary payments" },
      { key: "D", text: "Staff weekend travel per diems" }
    ],
    correctAnswer: "A",
    explanation: "Capital expenditure refers to investment in enduring tangible assets (infrastructure, construction, high-value medical tech) that yield long-term societal and health benefits.",
    category: "Financial & Procurement Rules",
    targetGrades: ["12-13"],
    referencePolicy: "Kaduna State Budget Office Fiscal Responsibility Manual"
  },
  {
    id: 99,
    text: "What is an 'Internal Audit Query' issued to a hospital spending officer?",
    options: [
      { key: "A", text: "An invitation to an annual medical gala dinner" },
      { key: "B", text: "A formal notification of financial irregularity, non-compliance, overpayment, or lack of supporting documentation requiring immediate justification" },
      { key: "C", text: "A letter confirming promotion to Chief Medical Officer" },
      { key: "D", text: "An appointment notice to join the State Executive Council" }
    ],
    correctAnswer: "B",
    explanation: "Audit queries point out discrepancies, non-compliance with Financial Regulations, or unsubstantiated payments, requiring formal prompt rebuttal and corrective action.",
    category: "Financial & Procurement Rules",
    targetGrades: ["07-10", "12-13"],
    referencePolicy: "Financial Regulations, Audit Query Procedures & Auditor-General Powers"
  },
  {
    id: 100,
    text: "What does the concept of 'Value for Money' (VFM) in public health procurement comprise?",
    options: [
      { key: "A", text: "Buying the cheapest possible items regardless of quality or expiry date" },
      { key: "B", text: "Achieving the optimal balance between Economy, Efficiency, and Effectiveness (the 3 Es) in public resource utilization" },
      { key: "C", text: "Spending the entirety of the budget before December 31st at all costs" },
      { key: "D", text: "Awarding contracts exclusively to offshore conglomerates" }
    ],
    correctAnswer: "B",
    explanation: "Value for Money (VFM) is measured through Economy (minimizing cost), Efficiency (maximizing output for given input), and Effectiveness (delivering desired health outcomes).",
    category: "Financial & Procurement Rules",
    targetGrades: ["12-13"],
    referencePolicy: "KDPPA Public Procurement Manual, Value for Money Framework"
  }
];

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
app.use(express.json({ limit: "10mb" }));
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
async function generateWithFallback(params) {
  const candidateModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} unavailable (${err.status || err.message}), trying next candidate...`);
    }
  }
  throw lastError;
}
function generateStructuredDiagnosticFallback(data) {
  const { candidate, score, totalQuestions, percentage, timeSpentSeconds, infractionsCount, categoryBreakdown, missedQuestions } = data;
  const isPassed = percentage >= 60;
  const mins = Math.floor((timeSpentSeconds || 0) / 60);
  const secs = (timeSpentSeconds || 0) % 60;
  const sortedCategories = Object.entries(categoryBreakdown || {}).sort(([, a], [, b]) => a.percentage - b.percentage);
  const weakest = sortedCategories[0];
  const strongest = sortedCategories[sortedCategories.length - 1];
  let missedSection = "";
  if (Array.isArray(missedQuestions) && missedQuestions.length > 0) {
    missedSection = missedQuestions.slice(0, 8).map((m, idx) => {
      return `### Question #${idx + 1}: ${m.text}
- **Your Pick:** \`${m.userChoiceKey || "Blank"}\` \u2014 ${m.userChoiceText || "Unanswered"}
- **Statutory Correct Answer:** \`${m.correctAnswerKey}\` \u2014 ${m.correctAnswerText}
- **Regulatory Authority:** *${m.referencePolicy || "Civil Service Regulations"}*
- **Diagnostic Explanation:** ${m.explanation}`;
    }).join("\n\n");
  } else {
    missedSection = `**Perfect Score!** You achieved 100% accuracy with zero incorrect responses across all curriculum sections.`;
  }
  return `## 1. Executive Evaluation & Promotional Readiness

- **Candidate:** **${candidate?.fullName || "Candidate"}** (Grade Level **${candidate?.gradeLevel || "07-10"}** Stream)
- **Score:** **${score}/${totalQuestions} (${percentage}%)** \u2014 **${isPassed ? "READY / PASS BENCHMARK MET" : "TARGETED REVISION REQUIRED"}**
- **Time Allocated:** 60 minutes | **Time Utilized:** ${mins}m ${secs}s (Pacing: ${(timeSpentSeconds / totalQuestions).toFixed(0)} seconds/question)
- **Exam Integrity:** ${infractionsCount === 0 ? "Flawless browser focus (0 infractions)" : `${infractionsCount} tab/window blur alert(s)`}

${isPassed ? `Your performance demonstrates solid competence in civil service administration and healthcare governance. You have crossed the official 60% composite promotional benchmark.` : `Your score is currently below the 60% promotional benchmark. A focused review of statutory regulations and departmental schemes of service will close the knowledge gap.`}

---

## 2. Diagnostic Review of Missed Questions & Statutory Explanations

${missedSection}

---

## 3. Domain Strengths vs Priority Revision Areas

- **Strongest Competency:** **${strongest ? strongest[0] : "General Civil Service"}** (${strongest ? strongest[1].percentage : 100}%)
- **Primary Area for Growth:** **${weakest ? weakest[0] : "Public Service Rules"}** (${weakest ? weakest[1].percentage : 0}%)

### Breakdown Summary:
${sortedCategories.map(([cat, stat]) => `\u2022 **${cat}:** ${stat.correct}/${stat.total} (${stat.percentage}%) \u2014 ${stat.percentage >= 70 ? "Mastered" : stat.percentage >= 50 ? "Moderate" : "Needs Urgent Review"}`).join("\n")}

---

## 4. High-Yield Action Plan for Grade Level ${candidate?.gradeLevel || "07-10"} Promotion

1. **Master Public Service Rules (PSR Chapters 02 & 03):** Review compulsory retirement rules, disciplinary query timelines (72 hours), misconduct vs serious misconduct distinctions, and study leave eligibility.
2. **Memorize Cadre Progression Criteria:** Confirm the approved Scheme of Service progression milestones, terminal grade levels for your health cadre, and administrative reporting chains.
3. **Practice Pacing & Flagging:** Utilize the split-screen matrix grid to immediately flag complex procurement or financial regulation questions for review in the final 10 minutes.
4. **Use the Interactive AI Tutor:** Use the **"Ask AI Tutor"** tab right here to ask specific questions about any of your missed questions or difficult regulatory concepts!`;
}
function generateTutorChatFallback(message, context) {
  const lower = message.toLowerCase();
  const qMatch = lower.match(/(?:question|q)\s*(?:#|\s)?\s*(\d+)/i);
  if (qMatch) {
    const qNum = parseInt(qMatch[1], 10);
    const question = QUESTION_POOL.find((q) => q.id === qNum) || QUESTION_POOL[qNum - 1];
    if (question) {
      return `### Question #${qNum} Statutory Explanation:
**Question:** ${question.text}

- **Correct Answer (${question.correctAnswer}):** ${question.options.find((o) => o.key === question.correctAnswer)?.text}
- **Official Policy Reference:** *${question.referencePolicy}*
- **Regulatory Rationale:** ${question.explanation}

**Exam Tip:** In civil service assessments, always look for exact statutory keywords in the question stem. What else would you like to review?`;
    }
  }
  if (lower.includes("misconduct") || lower.includes("serious misconduct")) {
    return `### Misconduct vs. Serious Misconduct (PSR Chapter 03):
- **Misconduct (PSR 030301):** A specific act of wrongdoing or improper behavior which can be investigated and dealt with at the Ministry level. Examples include: unpunctuality, sleeping on duty, improper dressing, or refusal to obey lawful orders.
- **Serious Misconduct (PSR 030402):** A specific act of very grave nature and culpable negligence. Examples include: **Falsification of official records**, **Absence from Duty Without Leave (AWOL)**, **Corruption/Bribery**, **Embezzlement**, **Engaging in partisan political activities**, and **Unauthorized disclosure of official secrets**.
- **Disciplinary Action:** Serious misconduct may result in interdiction, suspension, reduction in rank, or outright dismissal by the Civil Service Commission.`;
  }
  if (lower.includes("retirement") || lower.includes("age") || lower.includes("35") || lower.includes("60")) {
    return `### Compulsory Retirement Age (PSR 020810):
- **Statutory Rule:** All pensionable civil servants must retire upon reaching **60 years of age** or completing **35 years of pensionable service**, whichever comes earlier.
- **Constitutional Exceptions:** Judicial officers and university professors who have special constitutional retirement provisions.`;
  }
  if (lower.includes("query") || lower.includes("72 hours") || lower.includes("defense")) {
    return `### Disciplinary Query Representation (PSR 030302):
- When an official query is served on an officer alleging misconduct, the officer must submit a written representation within **72 hours (3 working days)**.
- If the officer fails to reply within the statutory 72-hour window, the disciplinary committee may presume that the officer has no defense and proceed to recommendation.`;
  }
  return `### AI Tutor Guidance for Grade Level ${context?.gradeLevel || "07-10"}:
Regarding your question: *"${message}"*

In Civil Service and Healthcare promotion evaluations:
1. **Statutory Primacy:** Answers are judged strictly against the Public Service Rules (PSR), the Scheme of Service, and Financial Regulations.
2. **Disciplinary Strictness:** Always remember the difference between general misconduct and serious misconduct.
3. **Core Health Protocols:** Familiarize yourself with KADCHMA contributory health insurance, essential drug lists, and clinical governance structures.

Would you like me to explain a specific question from your test, or clarify another administrative regulation?`;
}
app.post("/api/ai/analyze-assessment", async (req, res) => {
  const {
    candidate,
    score,
    totalQuestions,
    percentage,
    timeSpentSeconds,
    infractionsCount,
    categoryBreakdown,
    missedQuestions
  } = req.body;
  const missedDetails = Array.isArray(missedQuestions) && missedQuestions.length > 0 ? missedQuestions.slice(0, 15).map(
    (q, i) => `Missed Question #${i + 1}:
- Question: "${q.text}"
- Candidate Chosen: ${q.userChoiceText ? `${q.userChoiceKey}: ${q.userChoiceText}` : "Unanswered / Blank"}
- Correct Answer: ${q.correctAnswerKey}: ${q.correctAnswerText}
- Category: ${q.category}
- Statutory Rule/Citation: ${q.referencePolicy}
- Official Rationale: ${q.explanation}`
  ).join("\n\n") : "None (Candidate achieved 100% score)";
  const prompt = `You are a Senior Civil Service Examination Evaluator and Healthcare Education Specialist.
A candidate has just completed their promotional practice CBT assessment on the platform.

Here is their performance dossier:
- Candidate Name: ${candidate?.fullName || "Candidate"}
- Target Curriculum Stream: Grade Level ${candidate?.gradeLevel || "07-10"}
- Cadre / Speciality: ${candidate?.cadre || "Civil Service"}
- Department / Health Sector: ${candidate?.department || "Health Services"}
- Overall Score: ${score} out of ${totalQuestions} (${percentage}%)
- Standard Promotion Benchmark: 60% (Result: ${percentage >= 60 ? "BENCHMARK MET (READY)" : "BELOW BENCHMARK (NEEDS REVISION)"})
- Time Utilized: ${Math.floor((timeSpentSeconds || 0) / 60)} minutes ${(timeSpentSeconds || 0) % 60} seconds (Allocated: 60 minutes)
- Security Tab/Window Shifts: ${infractionsCount || 0} event(s)

Subject Domain Breakdown:
${Object.entries(categoryBreakdown || {}).map(
    ([cat, stat]) => `\u2022 ${cat}: ${stat.correct}/${stat.total} correct (${stat.percentage}%)`
  ).join("\n")}

Specific Missed Questions and Regulatory References:
${missedDetails}

Please generate an in-depth, structured, encouraging, and pedagogically rich performance analysis for this candidate.
Format your response using clean Markdown with distinct headers and bullet points:

1. **Executive Evaluation & Promotional Readiness**: High-level verdict on their readiness for promotion, pace analysis, and exam temperament.
2. **Diagnostic Review of Missed Questions**: Clear, easy-to-understand explanations of the key statutory concepts (e.g. Public Service Rules, Scheme of Service, financial regulations, or health protocols) they got wrong, explaining *why* the correct answer is statutory standard.
3. **Domain Strengths vs Priority Revision Areas**: Contrast their strongest topics against areas that need urgent brush-up.
4. **Targeted High-Yield Action Plan**: 3 to 4 actionable, practical revision recommendations tailored for Grade Level ${candidate?.gradeLevel || "07-10"} promotional examinations.`;
  try {
    const analysisText = await generateWithFallback({
      contents: prompt,
      config: {
        systemInstruction: "You are an authoritative, encouraging, and precise Civil Service & Healthcare Examination Tutor. Provide clear, accurate statutory and professional guidance without bureaucratic jargon."
      }
    });
    return res.json({ analysis: analysisText });
  } catch (err) {
    console.warn("Gemini API call failed (likely 503 spike). Serving curriculum diagnostic:", err.message);
    const fallbackText = generateStructuredDiagnosticFallback({
      candidate,
      score,
      totalQuestions,
      percentage,
      timeSpentSeconds,
      infractionsCount,
      categoryBreakdown,
      missedQuestions
    });
    return res.json({ analysis: fallbackText });
  }
});
app.post("/api/ai/chat-assessment", async (req, res) => {
  const { assessmentContext, conversationHistory, message } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required." });
  }
  const contextPrompt = `ASSESSMENT CONTEXT:
- Candidate: ${assessmentContext?.candidateName || "Candidate"}
- Stream: Grade Level ${assessmentContext?.gradeLevel || "07-10"}
- Cadre: ${assessmentContext?.cadre || "Healthcare / Admin"}
- Overall Score: ${assessmentContext?.score}/${assessmentContext?.totalQuestions} (${assessmentContext?.percentage}%)
- Weakest Areas: ${assessmentContext?.weakestCategories || "None specified"}
- Missed Topics: ${assessmentContext?.missedTopicsSummary || "None"}`;
  const contents = [];
  contents.push({
    role: "user",
    parts: [
      {
        text: `${contextPrompt}

Candidate has completed the practice CBT assessment. Please assist them as their personal Civil Service & Healthcare study tutor.`
      }
    ]
  });
  contents.push({
    role: "model",
    parts: [
      {
        text: `Understood! I have reviewed your completed assessment for Grade Level ${assessmentContext?.gradeLevel || "07-10"}. I'm ready to answer any questions about the questions you encountered, explain Public Service Rules, clarify healthcare procedures and financial guidelines, or provide revision strategies. What would you like to explore?`
      }
    ]
  });
  if (Array.isArray(conversationHistory)) {
    for (const turn of conversationHistory) {
      if (turn.role === "user" || turn.role === "model") {
        contents.push({
          role: turn.role,
          parts: [{ text: turn.content }]
        });
      }
    }
  }
  contents.push({
    role: "user",
    parts: [{ text: message }]
  });
  try {
    const replyText = await generateWithFallback({
      contents,
      config: {
        systemInstruction: "You are an interactive, articulate AI Examination Tutor for Civil Service & Healthcare promotion candidates. You provide concise, insightful explanations of Public Service Rules (PSR), health cadres, scheme of service, and disciplinary laws. Use formatting, bullet points, and mnemonics where appropriate."
      }
    });
    return res.json({ reply: replyText });
  } catch (err) {
    console.warn("Gemini chat call failed (likely 503 spike). Serving curriculum guidance:", err.message);
    const tutorReply = generateTutorChatFallback(message, assessmentContext);
    return res.json({ reply: tutorReply });
  }
});
async function startServer() {
  const distPath = path.resolve(__dirname, "dist");
  const hasDist = fs.existsSync(path.resolve(distPath, "index.html"));
  const isProd = process.env.NODE_ENV === "production" || Boolean(process.env.K_SERVICE) || Boolean(process.env.K_REVISION) || hasDist && process.env.npm_lifecycle_event !== "dev";
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
startServer();
