# End-to-end flows (F1–F11)

Source: the "E2E Flows" and "GlobalAppFeewaiver use cases" sheets of the workbook
**NAA App - Automation Test flows** (copied here 2026-11-12). Each flow is one applicant
taken through the whole wizard. "Random" means the flow may pick any value.

Terms used in the flow names:

- **Res / NonRes**: U.S. resident or not. U.S. citizens, permanent residents and refugees are
  residents; F-1, J-1, JN, DACA and UD are not.
- **OOS**: on Arizona residency, the first field ("Residency", the permanent home) is set to
  "Outside the U.S. or Not Listed".
- **FGD / PGD**: future / past high school graduation date.
- **ABOR**: the application fee waiver list on Review (tick a reason, then sign).
- **GlobalAppFeewaiver**: the fee is waived without asking; Review shows "Your application fee
  has been waived" and no payment option. Two cases:
  - **PartnerBenefits**: Education benefits = Yes with an active partner (for example Amazon
    DSP); any program location except Tempe.
  - **Location**: in person with the Tempe location and no partner benefits.
- **NDG**: nondegree. **VUS**: visiting university student.

## Pursue-degree flows

| Flow | MOL | Age | Citizenship / visa | Previous ASU affiliation | Military status | Program | Partner benefits | My schools | Grades | Residency | Payment |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **F1** Greater24_Inperson_US_Res_SpouseDependent_FutureGrad_InstateSchool_OOS_ABOR | In person | Over 24 | U.S. citizen | Never affiliated | Spouse/dependent | In-person program | No | Future graduation, in-state school (AZ) | Senior-year grades only, or all grades (random) | OOS | Random: fee waiver signature, or payment |
| **F2** Lessthan18_ASULocal_US_Res_ActiveDuty_FGD_HiSetGED_AZ_GlobalAppFeewaiver_PartnerBenefits | ASU Local | Under 18 | U.S. citizen | Random | Active Duty | Random, ASU Local location | Active partner, e.g. Amazon DSP | Future graduation, HiSet/GED | Self-report with any courses, or transcripts only (random) | Arizona | Fee waived: message shown, no payment option |
| **F3** 18To24_NonUS_Res_Veteran_PastGrad_OOS_GlobalAppFeewaiver_Location | In person | 18 to 24 | Not a citizen; Permanent Resident or Refugee | Never affiliated | Veteran | Tempe | No | Past graduation | Self-report with any courses, or transcripts only (random) | OOS | Fee waived: message shown, no payment option |
| **F4** 18To24_NonUS_Res_Armed Forces Reserve_National Guardian_PastGrad_HiSetGED_OOS | Online | 18 to 24 | Not a citizen; Permanent Resident or Refugee | Random | Armed Forces Reserve or National Guard | Nursing (RN/BSN) | Random | Past graduation, HiSet/GED | Self-report with any courses, or transcripts only (random) | Arizona | Random: waived (Global or ABOR), or payment |
| **F5** Prop308_UD_DACA_NoMilitarystatus | Random | Random | Not a citizen, not resident; DACA or UD | Random | None of these apply | Random | Random | Future graduation, in-state school (AZ) | Defaults to self-report | Prop 308 questions | Random: waived (Global or ABOR), or payment |
| **F6** 18yr_NonUS_NonRes_F1_J1_JN | Random | 18 | Not a citizen, not resident; F-1, J-1 or JN | Random | None of these apply | Random | Random | Past graduation | Not applicable | Not applicable | Random: waived (Global or ABOR), or payment |

## Nondegree and visiting flows

Fee waivers are left random here: an account gets one when it meets the criteria. Previous
ASU affiliation is anything except "I previously attended ASU as an undergraduate
degree-seeking student". Military status is "None of these apply to me". The grades step is
skipped.

| Flow | Type | MOL | Citizenship / visa | Program | My schools | Residency | Payment |
|---|---|---|---|---|---|---|---|
| **F8** NDG_Online_FGD_Resident | Nondegree | Online | U.S. citizen, Arizona home address | ASU Online | Acknowledgment check, future graduation | OOS | Random |
| **F9** NDG_InPerson_PGD_NonResident | Nondegree | In person | Not a citizen, not resident; F-1, J-1 or JN | In-person program | Acknowledgment check, past graduation | Skipped (the non-resident flow) | Random |
| **F10** VUS_Online_PGD_NonResident | Visiting | Online | Not a citizen, not resident; DACA or UD | ASU Online | Acknowledgment check, past graduation | Skipped | Random |
| **F11** VUS_InPerson_FGD_Resident | Visiting | In person | U.S. citizen | In-person program | Acknowledgment check, future graduation | Arizona | Random |

## Still to cover (listed in the workbook)

Kaplan, duplicate-application check on My information, waivers.

CORP (a corporate partner benefit, e.g. Amazon DSP: the fee is waived) is covered by F2
(`tests/TC_15_F2_…`): Education benefits Amazon DSP, Review shows the fee waived and no
payment option.

## Where each flow lives

| Flow | Spec | State (2026-11-12) |
|---|---|---|
| F1 | `tests/TC_14_F1_…` | Rebuilt |
| F2 | `tests/TC_15_F2_…` | Rebuilt: ASU Local, opened through the landing link `/?asulocal=`; program at ASU Local at Los Angeles |
| F3 | `tests/TC_16_F3_…` | Rebuilt; the Tempe waiver shows only as no payment (dollar) option on Review, with no "waived" message |
| F4 | `tests/TC_17_F4_…` | Rebuilt (2026-11-17): online, Nursing RN/BSN with a backup, HiSet, OOS (the flow name says OOS; the residency column says Arizona) |
| F5 | `tests/TC_18_F5_…` | Rebuilt (2026-11-19): in person, DACA, no uniformed services, Tempe High School with a future graduation. Grades open straight on self-report (no question). Residency asks only the permanent home and the Arizona high school questions (Prop 308): Arizona, Yes, Yes |
| F6 | `tests/TC_19_F6_…` | Rebuilt (2026-11-19): online, aged 18, JN visa (F-1 is not offered for online study), no uniformed services, past graduation. Grades and residency both say "not necessary". Review offered payment (Pay later) |
| F7 | `tests/TC_20_F7_…` | Rebuilt (2026-11-19), replacing the earlier single duplicate check on My program: same name and birthday as a submitted application, same program and term; random SSN to Review, then Edit My information from Review with TEST_SSN: Review lists "Application already submitted for the selected term" and My program's Continue shows the duplicate start date error; a new SSN clears both; submitted. The payment option still shows alongside the duplicate error, which is expected (the sheet's "no payment option" is out of date) |
| F8 | `tests/TC_21_F8_…` | Rebuilt (2026-11-19): landing "individual classes" with No to "already earned a bachelor's degree?" and No to "previously started courses ... at ASU"; nondegree form (not visiting, ASU Online); no transcript acknowledgement on My schools; grades "not necessary" and no grades section on Review; OOS; Review words the term "Spring 2027 - (Session A)" |
| F9 | `tests/TC_22_F9_…` | Rebuilt (2026-11-19): in person, nondegree, Exchange Visitor (J-1) from Canada (No to "... currently in the United States on any kind of Student Visa?", which F-1 and J-1 must answer); no location is preselected in person (the first, Downtown Phoenix, is chosen); past graduation, no transcript acknowledgement; grades and residency "not necessary"; Review shows only Profile, My information, My program and My schools |
| F10 | `tests/TC_23_F10_…` | Rebuilt (2026-11-19): online, visiting (Yes to "Are you visiting ASU from another college or university?"; Review: "Visiting University Student"), DACA, past graduation, no colleges, no transcript acknowledgement; grades "not necessary". The sheet says residency is skipped, but a DACA applicant with an Arizona high school is asked the Prop 308 questions (tester confirmed the app is right): Arizona, Yes, Yes |
| F11 | `tests/TC_24_F11_…` | Rebuilt (2026-11-19): in person, visiting, U.S. citizen with an Arizona address; first in-person location; future graduation, no colleges, no transcript acknowledgement; grades "not necessary"; residency Arizona |
| ASU Local (partner) | `tests/TC_26_ASULocal_…` | Built (2026-11-19) from "ASU Local_Automation_Testcases.xlsx": landing `/?asulocal=`; My program starts filtered to the six ASU Local sites ("Location (6)", chip "ASU Local"); program at ASU Local at Los Angeles; Review offers only "Pay later"; submitted; a second application started with ASU Local is filtered the same way. Not as the sheet says (recorded, not asserted): no ASU Local question on My information, no "You're an ASU Local student" guideline, and the program's location list also offers Tempe and ASU Online |
| Starbucks (partner) | `tests/TC_27_Starbucks_…` | Built (2026-11-19) as the tester described: first application with Education benefits Starbucks (bachelor's degree No, "Starbucks partner", partner number from STARBUCKS_PARTNER_NUMBER, verified; SCAP terms "I accept"; manager disclosure Accept), My program locked to "pursue a degree" at ASU Online, submitted; second application on the same account with My information unchanged, another start term (the submitted one's term is disabled), a college with "Bachelor of Arts" showing "You cannot use the Starbucks College Achievement Plan education benefit..." then "Continue with no partner benefit"; Review: Pay now / Pay later; submitted |
| Multiple applications | `tests/TC_29_MultipleApplications_…` | Built (2026-11-19): on one account, applications are submitted one after another (Start a new application on the main dashboard, My information prefilled and unchanged, the next open start term) until the dashboard says "Only one application can be sent for each start date. You cannot submit an application until additional start dates are announced." Two tests: pursue a degree (a different program each time) and NDG / VUS in turn. On 2026-11-19 that was two applications each (Spring 2027, Summer 2027) |
| Prefill and profile (multiple applications) | `tests/TC_30_MultipleApplications_…` | Built (2026-11-19): a second application is prefilled on My information and Arizona residency only (My schools empty); profile: nothing editable with none in progress, everything with the only one in progress, legal name and birthday read-only with several on the account; one application in progress at a time |
| F12 Nursing RN/BSN with backup | `tests/TC_25_F12_…` | Built earlier (not in the workbook) |

Known app bugs that affect the flows are noted in each spec's header.
