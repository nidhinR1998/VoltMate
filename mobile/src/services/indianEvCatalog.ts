export type IndianEvBrandCategory =
  | "Tata Motors"
  | "MG Motor"
  | "Mahindra"
  | "Hyundai / Kia / Maruti"
  | "BYD / Citroen"
  | "Luxury EV India"
  | "2-Wheeler EV";

export interface IndianEvModelPreset {
  id: string;
  brand: IndianEvBrandCategory;
  manufacturer: string;
  makeModel: string;
  batteryCapacityKwh: number;
  maxRangeKm: number;
  maxDcPowerKw: number;
  connectorType: "CCS2" | "TYPE_2" | "SOCKET_15A";
  connectorLabel: string;
  segment: string;
}

export const INDIAN_EV_BRANDS: IndianEvBrandCategory[] = [
  "Tata Motors",
  "MG Motor",
  "Mahindra",
  "Hyundai / Kia / Maruti",
  "BYD / Citroen",
  "Luxury EV India",
  "2-Wheeler EV",
];

type RawTuple = [
  string, // id
  IndianEvBrandCategory, // brand category
  string, // manufacturer
  string, // makeModel
  number, // batteryCapacityKwh
  number, // maxRangeKm
  number, // maxDcPowerKw
  "CCS2" | "TYPE_2" | "SOCKET_15A", // connectorType
  string, // connectorLabel
  string // segment
];

const RAW_INDIAN_EV_MODELS: RawTuple[] = [
  // ============================================================================
  // 1. TATA MOTORS INDIA (27 Models & Variants)
  // ============================================================================
  ["tata-nexon-cr-mr", "Tata Motors", "Tata", "Tata Nexon.ev Creative+ MR (30 kWh)", 30.0, 215, 30, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-nexon-fl-mr", "Tata Motors", "Tata", "Tata Nexon.ev Fearless MR (30 kWh)", 30.0, 215, 30, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-nexon-flp-mr", "Tata Motors", "Tata", "Tata Nexon.ev Fearless+ S MR (30 kWh)", 30.0, 215, 30, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-nexon-emp-mr", "Tata Motors", "Tata", "Tata Nexon.ev Empowered MR (30 kWh)", 30.0, 220, 30, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-nexon-fl-lr", "Tata Motors", "Tata", "Tata Nexon.ev Fearless LR (40.5 kWh)", 40.5, 290, 50, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-nexon-flps-lr", "Tata Motors", "Tata", "Tata Nexon.ev Fearless+ S LR (40.5 kWh)", 40.5, 295, 50, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-nexon-emp-lr", "Tata Motors", "Tata", "Tata Nexon.ev Empowered+ LR (40.5 kWh)", 40.5, 300, 50, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-nexon-dark-lr", "Tata Motors", "Tata", "Tata Nexon.ev Dark Edition LR (40.5 kWh)", 40.5, 300, 50, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-nexon-45-cr", "Tata Motors", "Tata", "Tata Nexon.ev Creative 45 (45 kWh)", 45.0, 345, 60, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-nexon-45-fl", "Tata Motors", "Tata", "Tata Nexon.ev Fearless 45 (45 kWh)", 45.0, 345, 60, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-nexon-45", "Tata Motors", "Tata", "Tata Nexon.ev Empowered+ 45 (45 kWh)", 45.0, 350, 60, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-nexon-45-red", "Tata Motors", "Tata", "Tata Nexon.ev Red Dark 45 (45 kWh)", 45.0, 350, 60, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["tata-curvv-cr-45", "Tata Motors", "Tata", "Tata Curvv.ev Creative 45 (45 kWh)", 45.0, 330, 60, "CCS2", "CCS2 DC & Type-2 AC", "SUV Coupe"],
  ["tata-curvv-acc-45", "Tata Motors", "Tata", "Tata Curvv.ev Accomplished 45 (45 kWh)", 45.0, 335, 60, "CCS2", "CCS2 DC & Type-2 AC", "SUV Coupe"],
  ["tata-curvv-accs-45", "Tata Motors", "Tata", "Tata Curvv.ev Accomplished+ S 45 (45 kWh)", 45.0, 335, 60, "CCS2", "CCS2 DC & Type-2 AC", "SUV Coupe"],
  ["tata-curvv-acc-55", "Tata Motors", "Tata", "Tata Curvv.ev Accomplished 55 (55 kWh)", 55.0, 420, 70, "CCS2", "CCS2 DC & Type-2 AC", "SUV Coupe"],
  ["tata-curvv-accs-55", "Tata Motors", "Tata", "Tata Curvv.ev Accomplished+ S 55 (55 kWh)", 55.0, 420, 70, "CCS2", "CCS2 DC & Type-2 AC", "SUV Coupe"],
  ["tata-curvv-55", "Tata Motors", "Tata", "Tata Curvv.ev Empowered+ 55 (55 kWh)", 55.0, 425, 70, "CCS2", "CCS2 DC & Type-2 AC", "SUV Coupe"],
  ["tata-curvv-55a", "Tata Motors", "Tata", "Tata Curvv.ev Empowered+ A 55 (55 kWh)", 55.0, 425, 70, "CCS2", "CCS2 DC & Type-2 AC", "SUV Coupe"],
  ["tata-punch-sm-mr", "Tata Motors", "Tata", "Tata Punch.ev Smart MR (25 kWh)", 25.0, 205, 30, "CCS2", "CCS2 DC & Type-2 AC", "Micro SUV"],
  ["tata-punch-adv-mr", "Tata Motors", "Tata", "Tata Punch.ev Adventure MR (25 kWh)", 25.0, 210, 30, "CCS2", "CCS2 DC & Type-2 AC", "Micro SUV"],
  ["tata-punch-emp-mr", "Tata Motors", "Tata", "Tata Punch.ev Empowered MR (25 kWh)", 25.0, 210, 30, "CCS2", "CCS2 DC & Type-2 AC", "Micro SUV"],
  ["tata-punch-adv-lr", "Tata Motors", "Tata", "Tata Punch.ev Adventure LR (35 kWh)", 35.0, 275, 50, "CCS2", "CCS2 DC & Type-2 AC", "Micro SUV"],
  ["tata-punch-lr", "Tata Motors", "Tata", "Tata Punch.ev Empowered+ S LR (35 kWh)", 35.0, 285, 50, "CCS2", "CCS2 DC & Type-2 AC", "Micro SUV"],
  ["tata-tiago-xe-mr", "Tata Motors", "Tata", "Tata Tiago.ev XE MR (19.2 kWh)", 19.2, 155, 25, "CCS2", "CCS2 DC & 15A Socket", "Hatchback"],
  ["tata-tiago-xt-mr", "Tata Motors", "Tata", "Tata Tiago.ev XT MR (19.2 kWh)", 19.2, 155, 25, "CCS2", "CCS2 DC & 15A Socket", "Hatchback"],
  ["tata-tiago-xt-lr", "Tata Motors", "Tata", "Tata Tiago.ev XT LR (24 kWh)", 24.0, 200, 25, "CCS2", "CCS2 DC & Type-2 AC", "Hatchback"],
  ["tata-tiago-lr", "Tata Motors", "Tata", "Tata Tiago.ev XZ+ Tech Lux LR (24 kWh)", 24.0, 205, 25, "CCS2", "CCS2 DC & Type-2 AC", "Hatchback"],
  ["tata-tigor-xe", "Tata Motors", "Tata", "Tata Tigor.ev XE (26 kWh)", 26.0, 210, 25, "CCS2", "CCS2 DC & 15A Socket", "Compact Sedan"],
  ["tata-tigor-xt", "Tata Motors", "Tata", "Tata Tigor.ev XT (26 kWh)", 26.0, 210, 25, "CCS2", "CCS2 DC & 15A Socket", "Compact Sedan"],
  ["tata-tigor-xz", "Tata Motors", "Tata", "Tata Tigor.ev XZ+ Lux (26 kWh)", 26.0, 215, 25, "CCS2", "CCS2 DC & 15A Socket", "Compact Sedan"],
  ["tata-xprest-ev", "Tata Motors", "Tata", "Tata Xpres-T EV Commercial (21.5 kWh)", 21.5, 180, 25, "CCS2", "CCS2 DC & 15A Socket", "Fleet Sedan"],
  ["tata-harrier-ev", "Tata Motors", "Tata", "Tata Harrier.ev Empowered AWD (75 kWh)", 75.0, 500, 120, "CCS2", "CCS2 Ultra-Fast DC", "Full-Size SUV"],
  ["tata-sierra-ev", "Tata Motors", "Tata", "Tata Sierra.ev AWD Lounge (65 kWh)", 65.0, 460, 100, "CCS2", "CCS2 DC & Type-2 AC", "Lifestyle SUV"],

  // ============================================================================
  // 2. MG MOTOR INDIA (14 Models & Variants)
  // ============================================================================
  ["mg-windsor-excite", "MG Motor", "MG", "MG Windsor EV Excite (38 kWh)", 38.0, 300, 45, "CCS2", "CCS2 DC & Type-2 AC", "Crossover CUV"],
  ["mg-windsor-excl", "MG Motor", "MG", "MG Windsor EV Exclusive (38 kWh)", 38.0, 305, 45, "CCS2", "CCS2 DC & Type-2 AC", "Crossover CUV"],
  ["mg-windsor-ev", "MG Motor", "MG", "MG Windsor EV Essence (38 kWh)", 38.0, 308, 45, "CCS2", "CCS2 DC & Type-2 AC", "Crossover CUV"],
  ["mg-windsor-pro", "MG Motor", "MG", "MG Windsor EV Essence Pro (50.6 kWh)", 50.6, 395, 50, "CCS2", "CCS2 DC & Type-2 AC", "Crossover CUV"],
  ["mg-zs-exec", "MG Motor", "MG", "MG ZS EV Executive (50.3 kWh)", 50.3, 370, 50, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["mg-zs-excite", "MG Motor", "MG", "MG ZS EV Excite Pro (50.3 kWh)", 50.3, 370, 50, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["mg-zs-ev", "MG Motor", "MG", "MG ZS EV Exclusive Plus (50.3 kWh)", 50.3, 375, 50, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["mg-zs-essence", "MG Motor", "MG", "MG ZS EV Essence (50.3 kWh)", 50.3, 375, 50, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["mg-zs-100yr", "MG Motor", "MG", "MG ZS EV 100-Year Limited Edition (50.3 kWh)", 50.3, 375, 50, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["mg-comet-exec", "MG Motor", "MG", "MG Comet EV Executive (17.3 kWh)", 17.3, 180, 3.3, "TYPE_2", "Type-2 AC & 15A Socket", "City Micro EV"],
  ["mg-comet-excite", "MG Motor", "MG", "MG Comet EV Excite (17.3 kWh)", 17.3, 180, 3.3, "TYPE_2", "Type-2 AC & 15A Socket", "City Micro EV"],
  ["mg-comet-excite-fc", "MG Motor", "MG", "MG Comet EV Excite FC (17.3 kWh)", 17.3, 185, 7.4, "TYPE_2", "Type-2 AC (7.4 kW) & 15A", "City Micro EV"],
  ["mg-comet-ev", "MG Motor", "MG", "MG Comet EV Exclusive FC (17.3 kWh)", 17.3, 185, 7.4, "TYPE_2", "Type-2 AC (7.4 kW) & 15A", "City Micro EV"],
  ["mg-comet-blackstorm", "MG Motor", "MG", "MG Comet EV Blackstorm Edition (17.3 kWh)", 17.3, 185, 7.4, "TYPE_2", "Type-2 AC (7.4 kW) & 15A", "City Micro EV"],
  ["mg-cyberster-gt", "MG Motor", "MG", "MG Cyberster GT AWD Roadster (77 kWh)", 77.0, 460, 150, "CCS2", "CCS2 Ultra-Fast DC", "Sports Roadster"],

  // ============================================================================
  // 3. MAHINDRA ELECTRIC INDIA (15 Models & Variants)
  // ============================================================================
  ["mahindra-be6-p1", "Mahindra", "Mahindra", "Mahindra BE 6 Pack One (59 kWh)", 59.0, 435, 140, "CCS2", "CCS2 DC Fast & Type-2 AC", "Born Electric SUV"],
  ["mahindra-be6-p2", "Mahindra", "Mahindra", "Mahindra BE 6 Pack Two (59 kWh)", 59.0, 440, 140, "CCS2", "CCS2 DC Fast & Type-2 AC", "Born Electric SUV"],
  ["mahindra-be6", "Mahindra", "Mahindra", "Mahindra BE 6 Pack Three Select (59 kWh)", 59.0, 445, 140, "CCS2", "CCS2 DC Fast & Type-2 AC", "Born Electric SUV"],
  ["mahindra-be6-79", "Mahindra", "Mahindra", "Mahindra BE 6 Pack Three LR (79 kWh)", 79.0, 550, 175, "CCS2", "CCS2 DC Fast & Type-2 AC", "Born Electric SUV"],
  ["mahindra-xev9e-p1", "Mahindra", "Mahindra", "Mahindra XEV 9e Pack One (59 kWh)", 59.0, 420, 140, "CCS2", "CCS2 DC Fast & Type-2 AC", "Flagship Coupe SUV"],
  ["mahindra-xev9e-p2", "Mahindra", "Mahindra", "Mahindra XEV 9e Pack Two (59 kWh)", 59.0, 425, 140, "CCS2", "CCS2 DC Fast & Type-2 AC", "Flagship Coupe SUV"],
  ["mahindra-xev9e-p3s", "Mahindra", "Mahindra", "Mahindra XEV 9e Pack Three Select (59 kWh)", 59.0, 430, 140, "CCS2", "CCS2 DC Fast & Type-2 AC", "Flagship Coupe SUV"],
  ["mahindra-xev-9e", "Mahindra", "Mahindra", "Mahindra XEV 9e Pack Three LR (79 kWh)", 79.0, 535, 175, "CCS2", "CCS2 DC Fast & Type-2 AC", "Flagship Coupe SUV"],
  ["mahindra-xuv400-ec", "Mahindra", "Mahindra", "Mahindra XUV400 EC Pro (34.5 kWh)", 34.5, 255, 50, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["mahindra-xuv400-el34", "Mahindra", "Mahindra", "Mahindra XUV400 EL Pro (34.5 kWh)", 34.5, 260, 50, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["mahindra-xuv400", "Mahindra", "Mahindra", "Mahindra XUV400 EL Pro LR (39.4 kWh)", 39.4, 310, 50, "CCS2", "CCS2 DC & Type-2 AC", "Compact SUV"],
  ["mahindra-xuve8", "Mahindra", "Mahindra", "Mahindra XEV 7e / XUV.e8 AWD (80 kWh)", 80.0, 500, 175, "CCS2", "CCS2 Ultra-Fast DC", "7-Seater Electric SUV"],
  ["mahindra-be05-rall-e", "Mahindra", "Mahindra", "Mahindra BE.05 Rall-E Edition (79 kWh)", 79.0, 510, 175, "CCS2", "CCS2 Ultra-Fast DC", "Off-Road Electric SUV"],
  ["mahindra-everito", "Mahindra", "Mahindra", "Mahindra eVerito D6 Sedan (21.2 kWh)", 21.2, 140, 15, "SOCKET_15A", "15A 3-Pin Socket", "Fleet Sedan"],
  ["mahindra-treo-plus", "Mahindra", "Mahindra", "Mahindra Treo Plus 3W EV (10.2 kWh)", 10.2, 130, 3.3, "SOCKET_15A", "15A 3-Pin Socket", "3-Wheeler EV"],

  // ============================================================================
  // 4. HYUNDAI, KIA & MARUTI SUZUKI INDIA (16 Models & Variants)
  // ============================================================================
  ["hyundai-creta-exec", "Hyundai / Kia / Maruti", "Hyundai", "Hyundai Creta Electric Executive (42 kWh)", 42.0, 330, 50, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["hyundai-creta-smart", "Hyundai / Kia / Maruti", "Hyundai", "Hyundai Creta Electric Smart (42 kWh)", 42.0, 330, 50, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["hyundai-creta-prem", "Hyundai / Kia / Maruti", "Hyundai", "Hyundai Creta Electric Premium (42 kWh)", 42.0, 335, 50, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["hyundai-creta-smarto", "Hyundai / Kia / Maruti", "Hyundai", "Hyundai Creta Electric Smart (O) LR (51.4 kWh)", 51.4, 395, 60, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["hyundai-creta-ev", "Hyundai / Kia / Maruti", "Hyundai", "Hyundai Creta Electric Excellence LR (51.4 kWh)", 51.4, 400, 60, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["hyundai-ioniq5", "Hyundai / Kia / Maruti", "Hyundai", "Hyundai IONIQ 5 RWD (72.6 kWh)", 72.6, 480, 350, "CCS2", "CCS2 Ultra-Fast DC", "Premium Crossover"],
  ["hyundai-ioniq6", "Hyundai / Kia / Maruti", "Hyundai", "Hyundai IONIQ 6 AWD Streamliner (77.4 kWh)", 77.4, 515, 350, "CCS2", "CCS2 Ultra-Fast DC", "Aero Streamliner"],
  ["hyundai-kona-ev", "Hyundai / Kia / Maruti", "Hyundai", "Hyundai Kona Electric Premium (39.2 kWh)", 39.2, 315, 50, "CCS2", "CCS2 DC & Type-2 AC", "Compact Crossover"],
  ["kia-ev6-rwd", "Hyundai / Kia / Maruti", "Kia", "Kia EV6 GT-Line RWD (77.4 kWh)", 77.4, 528, 350, "CCS2", "CCS2 Ultra-Fast DC", "Performance Crossover"],
  ["kia-ev6", "Hyundai / Kia / Maruti", "Kia", "Kia EV6 GT-Line AWD (77.4 kWh)", 77.4, 505, 350, "CCS2", "CCS2 Ultra-Fast DC", "Performance Crossover"],
  ["kia-ev9-gt", "Hyundai / Kia / Maruti", "Kia", "Kia EV9 GT-Line AWD 6-Seater (99.8 kWh)", 99.8, 561, 350, "CCS2", "CCS2 Ultra-Fast DC", "Flagship 3-Row SUV"],
  ["kia-carens-ev", "Hyundai / Kia / Maruti", "Kia", "Kia Carens EV Prestige LR (51.4 kWh)", 51.4, 405, 60, "CCS2", "CCS2 DC & Type-2 AC", "3-Row Recreational EV"],
  ["maruti-evitara-delta", "Hyundai / Kia / Maruti", "Maruti Suzuki", "Maruti Suzuki e Vitara Delta (49 kWh)", 49.0, 355, 60, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["maruti-evitara-zeta", "Hyundai / Kia / Maruti", "Maruti Suzuki", "Maruti Suzuki e Vitara Zeta LR (61 kWh)", 61.0, 430, 70, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["maruti-evitara", "Hyundai / Kia / Maruti", "Maruti Suzuki", "Maruti Suzuki e Vitara Alpha LR (61 kWh)", 61.0, 430, 70, "CCS2", "CCS2 DC & Type-2 AC", "Mid-Size SUV"],
  ["maruti-evitara-awd", "Hyundai / Kia / Maruti", "Maruti Suzuki", "Maruti Suzuki e Vitara Alpha ALLGRIP-e AWD (61 kWh)", 61.0, 415, 70, "CCS2", "CCS2 DC & Type-2 AC", "AWD Electric SUV"],

  // ============================================================================
  // 5. BYD, CITROEN & SKODA / VW INDIA (14 Models & Variants)
  // ============================================================================
  ["byd-atto3-dyn", "BYD / Citroen", "BYD", "BYD Atto 3 Dynamic (49.9 kWh)", 49.9, 345, 70, "CCS2", "CCS2 DC & Type-2 AC", "Blade Battery SUV"],
  ["byd-atto3-prem", "BYD / Citroen", "BYD", "BYD Atto 3 Premium (60.5 kWh)", 60.5, 420, 80, "CCS2", "CCS2 DC & Type-2 AC", "Blade Battery SUV"],
  ["byd-atto3", "BYD / Citroen", "BYD", "BYD Atto 3 Superior (60.5 kWh)", 60.5, 420, 80, "CCS2", "CCS2 DC & Type-2 AC", "Blade Battery SUV"],
  ["byd-emax7-prem", "BYD / Citroen", "BYD", "BYD eMAX 7 Premium 6-Seater (55.4 kWh)", 55.4, 370, 85, "CCS2", "CCS2 DC & Type-2 AC", "3-Row Electric MPV"],
  ["byd-emax7-sup", "BYD / Citroen", "BYD", "BYD eMAX 7 Superior 7-Seater (71.8 kWh)", 71.8, 450, 115, "CCS2", "CCS2 DC & Type-2 AC", "3-Row Electric MPV"],
  ["byd-e6-mpv", "BYD / Citroen", "BYD", "BYD e6 GL Commercial MPV (71.7 kWh)", 71.7, 415, 60, "CCS2", "CCS2 DC & Type-2 AC", "Executive MPV"],
  ["byd-seal-dyn", "BYD / Citroen", "BYD", "BYD Seal Dynamic RWD (61.4 kWh)", 61.4, 420, 110, "CCS2", "CCS2 DC & Type-2 AC", "Electric Sports Sedan"],
  ["byd-seal", "BYD / Citroen", "BYD", "BYD Seal Premium RWD (82.5 kWh)", 82.5, 540, 150, "CCS2", "CCS2 DC & Type-2 AC", "Electric Sports Sedan"],
  ["byd-seal-perf", "BYD / Citroen", "BYD", "BYD Seal Performance AWD (82.5 kWh)", 82.5, 510, 150, "CCS2", "CCS2 DC & Type-2 AC", "AWD Sports Sedan"],
  ["byd-sealion-7", "BYD / Citroen", "BYD", "BYD Sealion 7 Excellence AWD (82.5 kWh)", 82.5, 502, 150, "CCS2", "CCS2 Ultra-Fast DC", "Performance SUV"],
  ["citroen-ec3-live", "BYD / Citroen", "Citroen", "Citroen eC3 Live (29.2 kWh)", 29.2, 225, 30, "CCS2", "CCS2 DC & 15A Socket", "Compact Crossover"],
  ["citroen-ec3-feel", "BYD / Citroen", "Citroen", "Citroen eC3 Feel (29.2 kWh)", 29.2, 230, 30, "CCS2", "CCS2 DC & 15A Socket", "Compact Crossover"],
  ["citroen-ec3-shine", "BYD / Citroen", "Citroen", "Citroen eC3 Shine Vibe Pack (29.2 kWh)", 29.2, 230, 30, "CCS2", "CCS2 DC & 15A Socket", "Compact Crossover"],
  ["skoda-enyaq-iv", "BYD / Citroen", "Skoda", "Skoda Enyaq iV 80x AWD India (77 kWh)", 77.0, 480, 135, "CCS2", "CCS2 Ultra-Fast DC", "European Electric SUV"],

  // ============================================================================
  // 6. LUXURY EVs INDIA — BMW, MERCEDES-BENZ, AUDI, VOLVO, PORSCHE, MINI (26 Models)
  // ============================================================================
  ["bmw-ix1-xdrive30", "Luxury EV India", "BMW", "BMW iX1 xDrive30 M Sport (66.4 kWh)", 66.4, 415, 130, "CCS2", "CCS2 DC & 11 kW Type-2", "Luxury Compact SUV"],
  ["bmw-i4-edrive35", "Luxury EV India", "BMW", "BMW i4 eDrive35 M Sport (70.2 kWh)", 70.2, 450, 180, "CCS2", "CCS2 Ultra-Fast DC", "Gran Coupe"],
  ["bmw-i4-edrive40", "Luxury EV India", "BMW", "BMW i4 eDrive40 M Sport (83.9 kWh)", 83.9, 510, 205, "CCS2", "CCS2 Ultra-Fast DC", "Gran Coupe"],
  ["bmw-ix-xdrive40", "Luxury EV India", "BMW", "BMW iX xDrive40 (76.6 kWh)", 76.6, 390, 150, "CCS2", "CCS2 Ultra-Fast DC", "Luxury SAV"],
  ["bmw-ix-xdrive50", "Luxury EV India", "BMW", "BMW iX xDrive50 (111.5 kWh)", 111.5, 575, 195, "CCS2", "CCS2 Ultra-Fast DC", "Flagship SAV"],
  ["bmw-i5-m60", "Luxury EV India", "BMW", "BMW i5 M60 xDrive (81.2 kWh)", 81.2, 485, 205, "CCS2", "CCS2 Ultra-Fast DC", "Executive Performance Sedan"],
  ["bmw-i7-edrive50", "Luxury EV India", "BMW", "BMW i7 eDrive50 Excellence (101.7 kWh)", 101.7, 560, 195, "CCS2", "CCS2 Ultra-Fast DC", "Luxury Limousine"],
  ["bmw-i7-m70", "Luxury EV India", "BMW", "BMW i7 M70 xDrive (101.7 kWh)", 101.7, 515, 195, "CCS2", "CCS2 Ultra-Fast DC", "Flagship M Limousine"],
  ["mini-countryman-e", "Luxury EV India", "Mini", "Mini Countryman Electric E (66.5 kWh)", 66.5, 420, 130, "CCS2", "CCS2 DC & Type-2 AC", "British Crossover"],
  ["mini-cooper-se", "Luxury EV India", "Mini", "Mini Cooper SE 3-Door Hatch (54.2 kWh)", 54.2, 375, 95, "CCS2", "CCS2 DC & Type-2 AC", "Hot Hatch EV"],
  ["merc-eqa-250", "Luxury EV India", "Mercedes-Benz", "Mercedes-Benz EQA 250+ (70.5 kWh)", 70.5, 490, 100, "CCS2", "CCS2 DC & 11 kW Type-2", "Luxury Compact SUV"],
  ["merc-eqb-250", "Luxury EV India", "Mercedes-Benz", "Mercedes-Benz EQB 250+ 7-Seater (70.5 kWh)", 70.5, 470, 100, "CCS2", "CCS2 DC & 11 kW Type-2", "3-Row Luxury SUV"],
  ["merc-eqb-350", "Luxury EV India", "Mercedes-Benz", "Mercedes-Benz EQB 350 4MATIC (66.5 kWh)", 66.5, 410, 100, "CCS2", "CCS2 DC & 11 kW Type-2", "AMG Line SUV"],
  ["merc-eqe-500", "Luxury EV India", "Mercedes-Benz", "Mercedes-Benz EQE 500 4MATIC SUV (90.6 kWh)", 90.6, 510, 170, "CCS2", "CCS2 Ultra-Fast DC", "Luxury SUV"],
  ["merc-eqs-580-sedan", "Luxury EV India", "Mercedes-Benz", "Mercedes-Benz EQS 580 4MATIC Sedan (107.8 kWh)", 107.8, 670, 200, "CCS2", "CCS2 Ultra-Fast DC", "Made-in-India Flagship"],
  ["merc-eqs-580-suv", "Luxury EV India", "Mercedes-Benz", "Mercedes-Benz EQS 580 4MATIC SUV (122 kWh)", 122.0, 610, 200, "CCS2", "CCS2 Ultra-Fast DC", "Flagship Luxury SUV"],
  ["merc-maybach-eqs680", "Luxury EV India", "Mercedes-Benz", "Mercedes-Maybach EQS 680 SUV (122 kWh)", 122.0, 600, 200, "CCS2", "CCS2 Ultra-Fast DC", "Ultra-Luxury Maybach"],
  ["audi-q8-etron-50", "Luxury EV India", "Audi", "Audi Q8 e-tron 50 Quattro (95 kWh)", 95.0, 450, 150, "CCS2", "CCS2 DC & 22 kW Type-2", "Quattro Luxury SUV"],
  ["audi-q8-etron-55", "Luxury EV India", "Audi", "Audi Q8 e-tron 55 Quattro (114 kWh)", 114.0, 530, 170, "CCS2", "CCS2 DC & 22 kW Type-2", "Quattro Luxury SUV"],
  ["audi-etron-gt", "Luxury EV India", "Audi", "Audi e-tron GT Quattro (93.4 kWh)", 93.4, 440, 270, "CCS2", "CCS2 800V Ultra-Fast", "4-Door Gran Turismo"],
  ["audi-rs-etron-gt", "Luxury EV India", "Audi", "Audi RS e-tron GT (93.4 kWh)", 93.4, 425, 270, "CCS2", "CCS2 800V Ultra-Fast", "RS Supercar EV"],
  ["volvo-ex40-single", "Luxury EV India", "Volvo", "Volvo EX40 (XC40) Single Motor (69 kWh)", 69.0, 430, 150, "CCS2", "CCS2 DC & 11 kW Type-2", "Scandinavian SUV"],
  ["volvo-ex40-twin", "Luxury EV India", "Volvo", "Volvo EX40 Twin Motor AWD (78 kWh)", 78.0, 460, 150, "CCS2", "CCS2 DC & 11 kW Type-2", "AWD Scandinavian SUV"],
  ["volvo-c40-recharge", "Luxury EV India", "Volvo", "Volvo C40 Recharge Twin AWD (78 kWh)", 78.0, 475, 150, "CCS2", "CCS2 DC & 11 kW Type-2", "Coupe Crossover"],
  ["porsche-taycan-4s", "Luxury EV India", "Porsche", "Porsche Taycan 4S Performance+ (93.4 kWh)", 93.4, 450, 270, "CCS2", "CCS2 800V Ultra-Fast", "German Sports EV"],
  ["porsche-macan-ev", "Luxury EV India", "Porsche", "Porsche Macan Electric Turbo (100 kWh)", 100.0, 540, 270, "CCS2", "CCS2 800V Ultra-Fast", "Performance SUV"],
  ["jaguar-ipace-hse", "Luxury EV India", "Jaguar", "Jaguar I-Pace EV400 HSE AWD (90 kWh)", 90.0, 430, 100, "CCS2", "CCS2 DC & Type-2 AC", "British Luxury SUV"],

  // ============================================================================
  // 7. INDIAN 2-WHEELER EVs — ATHER, OLA, TVS, BAJAJ, VIDA, RIVER, UV (30 Models)
  // ============================================================================
  ["ather-450s-29", "2-Wheeler EV", "Ather", "Ather 450S (2.9 kWh)", 2.9, 90, 3.3, "SOCKET_15A", "LECCS Fast Grid & 15A Socket", "Smart Scooter"],
  ["ather-450x-29", "2-Wheeler EV", "Ather", "Ather 450X Gen 3 (2.9 kWh)", 2.9, 90, 3.3, "SOCKET_15A", "LECCS Fast Grid & 15A Socket", "Performance Scooter"],
  ["ather-450x", "2-Wheeler EV", "Ather", "Ather 450X Gen 3 Pro (3.7 kWh)", 3.7, 110, 3.3, "SOCKET_15A", "LECCS Fast Grid & 15A Socket", "Performance Scooter"],
  ["ather-450-apex", "2-Wheeler EV", "Ather", "Ather 450 Apex Warp+ (3.7 kWh)", 3.7, 115, 3.3, "SOCKET_15A", "LECCS Fast Grid & 15A Socket", "Flagship Scooter"],
  ["ather-rizta-s", "2-Wheeler EV", "Ather", "Ather Rizta S (2.9 kWh)", 2.9, 95, 3.3, "SOCKET_15A", "LECCS Fast Grid & 15A Socket", "Family Scooter"],
  ["ather-rizta-z29", "2-Wheeler EV", "Ather", "Ather Rizta Z (2.9 kWh)", 2.9, 95, 3.3, "SOCKET_15A", "LECCS Fast Grid & 15A Socket", "Family Scooter"],
  ["ather-rizta-z37", "2-Wheeler EV", "Ather", "Ather Rizta Z Long Range (3.7 kWh)", 3.7, 125, 3.3, "SOCKET_15A", "LECCS Fast Grid & 15A Socket", "Family Scooter"],
  ["ola-s1-pro", "2-Wheeler EV", "Ola Electric", "Ola S1 Pro Gen 2 (4 kWh)", 4.0, 145, 3.3, "SOCKET_15A", "15A 3-Pin Socket", "Performance Scooter"],
  ["ola-s1-air", "2-Wheeler EV", "Ola Electric", "Ola S1 Air (3 kWh)", 3.0, 110, 3.3, "SOCKET_15A", "15A 3-Pin Socket", "Commuter Scooter"],
  ["ola-s1-x-2", "2-Wheeler EV", "Ola Electric", "Ola S1 X (2 kWh)", 2.0, 75, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "City Scooter"],
  ["ola-s1-x-3", "2-Wheeler EV", "Ola Electric", "Ola S1 X (3 kWh)", 3.0, 115, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "City Scooter"],
  ["ola-s1-xplus", "2-Wheeler EV", "Ola Electric", "Ola S1 X+ (3 kWh)", 3.0, 115, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "Connected Scooter"],
  ["ola-s1-x-4", "2-Wheeler EV", "Ola Electric", "Ola S1 X Long Range (4 kWh)", 4.0, 145, 3.3, "SOCKET_15A", "15A 3-Pin Socket", "Long Range Scooter"],
  ["ola-roadster-x", "2-Wheeler EV", "Ola Electric", "Ola Roadster X Motorcycle (3.5 kWh)", 3.5, 140, 3.3, "SOCKET_15A", "15A 3-Pin Socket", "Electric Motorcycle"],
  ["ola-roadster-pro", "2-Wheeler EV", "Ola Electric", "Ola Roadster Pro Motorcycle (8 kWh)", 8.0, 260, 6.6, "SOCKET_15A", "15A & Type-2 AC", "Sport Motorcycle"],
  ["tvs-iqube-22", "2-Wheeler EV", "TVS", "TVS iQube (2.2 kWh)", 2.2, 75, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "Family Scooter"],
  ["tvs-iqube-34", "2-Wheeler EV", "TVS", "TVS iQube (3.4 kWh)", 3.4, 100, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "Family Scooter"],
  ["tvs-iqube-s", "2-Wheeler EV", "TVS", "TVS iQube S (3.4 kWh)", 3.4, 100, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "Smart Scooter"],
  ["tvs-iqube-st34", "2-Wheeler EV", "TVS", "TVS iQube ST (3.4 kWh)", 3.4, 100, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "Smart Scooter"],
  ["tvs-iqube-st", "2-Wheeler EV", "TVS", "TVS iQube ST Long Range (5.1 kWh)", 5.1, 145, 3.3, "SOCKET_15A", "15A 3-Pin Socket", "Flagship Family Scooter"],
  ["tvs-x-electric", "2-Wheeler EV", "TVS", "TVS X Performance Crossover (4.4 kWh)", 4.4, 140, 3.3, "SOCKET_15A", "15A & 3kW Smart X Home", "Maxi Scooter"],
  ["bajaj-chetak-2901", "2-Wheeler EV", "Bajaj", "Bajaj Chetak 2901 (2.9 kWh)", 2.9, 95, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "Metal Body Scooter"],
  ["bajaj-chetak-3202", "2-Wheeler EV", "Bajaj", "Bajaj Chetak 3202 Urbane (3.2 kWh)", 3.2, 115, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "Metal Body Scooter"],
  ["bajaj-chetak", "2-Wheeler EV", "Bajaj", "Bajaj Chetak 3201 Premium (3.2 kWh)", 3.2, 120, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "Metal Body Scooter"],
  ["hero-vida-v1-plus", "2-Wheeler EV", "Hero Vida", "Hero Vida V1 Plus (3.44 kWh)", 3.44, 100, 3.3, "SOCKET_15A", "LECCS Fast Grid & 15A Socket", "Removable Battery Scooter"],
  ["hero-vida-v1-pro", "2-Wheeler EV", "Hero Vida", "Hero Vida V1 Pro (3.94 kWh)", 3.94, 115, 3.3, "SOCKET_15A", "LECCS Fast Grid & 15A Socket", "Removable Battery Scooter"],
  ["river-indie", "2-Wheeler EV", "River", "River Indie SUV of Scooters (4 kWh)", 4.0, 120, 3.3, "SOCKET_15A", "15A 3-Pin Socket", "Utility Scooter"],
  ["simple-one", "2-Wheeler EV", "Simple Energy", "Simple One Dual-Battery (5 kWh)", 5.0, 165, 3.3, "SOCKET_15A", "15A 3-Pin Socket", "Long Range Scooter"],
  ["ultraviolette-f77", "2-Wheeler EV", "Ultraviolette", "Ultraviolette F77 Mach 2 Recon (10.3 kWh)", 10.3, 265, 6.6, "SOCKET_15A", "15A & UV Supernova Type-2", "Superbike EV"],
  ["revolt-rv400", "2-Wheeler EV", "Revolt", "Revolt RV400 BRZ Electric Bike (3.24 kWh)", 3.24, 120, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "Commuter Motorcycle"],
  ["oben-rorr", "2-Wheeler EV", "Oben Electric", "Oben Rorr LFP Motorcycle (4.4 kWh)", 4.4, 140, 3.3, "SOCKET_15A", "15A 3-Pin Socket", "Street Motorcycle"],
  ["ampere-nexus-st", "2-Wheeler EV", "Ampere", "Ampere Nexus ST (3.3 kWh)", 3.3, 115, 3.0, "SOCKET_15A", "15A 3-Pin Socket", "Family Scooter"],
];

export const INDIAN_EV_CATALOG: IndianEvModelPreset[] = RAW_INDIAN_EV_MODELS.map(
  ([
    id,
    brand,
    manufacturer,
    makeModel,
    batteryCapacityKwh,
    maxRangeKm,
    maxDcPowerKw,
    connectorType,
    connectorLabel,
    segment,
  ]) => ({
    id,
    brand,
    manufacturer,
    makeModel,
    batteryCapacityKwh,
    maxRangeKm,
    maxDcPowerKw,
    connectorType,
    connectorLabel,
    segment,
  })
);
