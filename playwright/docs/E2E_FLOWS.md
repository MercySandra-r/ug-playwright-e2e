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
| **F7** DuplicateApp_Submission_Check_PSwaiver | Random | Same date of birth as an already-submitted account | Random | Random | Random | Random; the term must be the same as the submitted application | Random | Random | Random | Random | None: a message is shown and no payment option |

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

Kaplan, ASU Local, Starbucks, CORP, duplicate-application check on My information, Review
page validations, multiple applications (prefill, profile editing, the Start new app
accordion), waivers.

## Where each flow lives

| Flow | Spec | State (2026-11-12) |
|---|---|---|
| F1 | `tests/TC_17_F1_…` | Rebuilt |
| F2 | `tests/TC_18_F2_…` | Rebuilt, but it studies **online**: the sheet says ASU Local, which is not a choice on the landing page here |
| F3 | `tests/TC_19_F3_…` | Rebuilt; QA does not waive the fee for Tempe, so the last test fails until it does |
| F4–F11 | `tests/TC_20_…` to `tests/TC_27_…` | Old placeholders, to be rebuilt |
| F12 Nursing RN/BSN with backup | `tests/TC_29_F12_…` | Built earlier (not in the workbook) |

Known app bugs that affect the flows are noted in each spec's header.
