import { db, type DriveType } from "@/lib/db";

type SeedProduct = {
  name: string;
  manufacturer: string;
  model: string;
  sku: string;
  type: DriveType;
  max_weight_kg: number;
  max_length_m: number | null;
  power_w: number;
  voltage: string;
  duty_cycle: string;
  ip_rating: string;
  price_cents: number;
  pros: string;
  cons: string;
  description: string;
};

const PRODUCTS: SeedProduct[] = [
  {
    name: "GateMax SW-300",
    manufacturer: "GateMax",
    model: "SW-300",
    sku: "GM-SW300",
    type: "skrzydlowy",
    max_weight_kg: 300,
    max_length_m: 2.5,
    power_w: 230,
    voltage: "24V DC",
    duty_cycle: "S3 50%",
    ip_rating: "IP54",
    price_cents: 189900,
    pros: "- Bardzo cichy silnik 24V\n- Plynny start i stop\n- Encoder magnetyczny\n- Dobra cena za parametry",
    cons: "- Brak wbudowanego radia (trzeba dokupic)\n- Skrzynka sterujaca w osobnej obudowie",
    description:
      "Napęd skrzydłowy 24V DC do bram o skrzydle do 2.5m i 300kg. Polecany do domów jednorodzinnych z umiarkowanym natężeniem otwarć.",
  },
  {
    name: "GateMax SW-500 PRO",
    manufacturer: "GateMax",
    model: "SW-500 PRO",
    sku: "GM-SW500P",
    type: "skrzydlowy",
    max_weight_kg: 500,
    max_length_m: 4.0,
    power_w: 350,
    voltage: "24V DC",
    duty_cycle: "S3 70%",
    ip_rating: "IP67",
    price_cents: 329900,
    pros: "- Wytrzymały do 4m i 500kg\n- IP67 — odporny na wodę\n- Wysoki duty cycle (70%)\n- Wbudowany odbiornik radiowy\n- Soft start/stop",
    cons: "- Cena\n- Wymaga mocnego zasilacza 230VAC/24VDC w komplecie (jest dorzucony)",
    description:
      "Topowy model do dużych bram skrzydłowych. Idealny do bram intensywnie używanych (firmy, osiedla).",
  },
  {
    name: "RollPro SL-600",
    manufacturer: "RollPro",
    model: "SL-600",
    sku: "RP-SL600",
    type: "przesuwny",
    max_weight_kg: 600,
    max_length_m: 8.0,
    power_w: 550,
    voltage: "230V AC",
    duty_cycle: "S2 30%",
    ip_rating: "IP44",
    price_cents: 219900,
    pros: "- Stabilny silnik 230V\n- Dobry stosunek cena/jakość\n- Łatwy montaż\n- Sprawdzony na rynku od 10+ lat",
    cons: "- Głośniejszy niż 24V DC\n- Niski duty cycle — nie do bardzo intensywnego ruchu\n- Radio do dokupienia",
    description:
      "Klasyczny napęd przesuwny 230V do bram do 600kg i 8m długości. Klasyk dla domu jednorodzinnego.",
  },
  {
    name: "RollPro SL-1200 Industrial",
    manufacturer: "RollPro",
    model: "SL-1200",
    sku: "RP-SL1200",
    type: "przesuwny",
    max_weight_kg: 1200,
    max_length_m: 12.0,
    power_w: 750,
    voltage: "230V AC",
    duty_cycle: "S3 60%",
    ip_rating: "IP54",
    price_cents: 489900,
    pros: "- Do bram przemysłowych do 1200kg/12m\n- Wysoka intensywność pracy\n- Solidna konstrukcja, żeliwo\n- 5 lat gwarancji producenta",
    cons: "- Cena\n- Duża waga, trudniejszy montaż\n- Zasilanie 230V wymaga elektryka",
    description:
      "Napęd przesuwny do bram przemysłowych. Brama firmy, magazyn, parking.",
  },
  {
    name: "EasyDrive SW-200 Lite",
    manufacturer: "EasyDrive",
    model: "SW-200",
    sku: "ED-SW200",
    type: "skrzydlowy",
    max_weight_kg: 200,
    max_length_m: 2.0,
    power_w: 150,
    voltage: "24V DC",
    duty_cycle: "S2 30%",
    ip_rating: "IP44",
    price_cents: 99900,
    pros: "- Najtańszy w ofercie\n- Wystarczy do lekkich bram (200kg/2m)\n- Łatwy montaż dla DIY",
    cons: "- Małe rezerwy mocy\n- IP44 — woda przeciekająca po dłuższym użytkowaniu\n- Plastik w korpusie\n- Nie do intensywnego użycia",
    description:
      "Tani napęd budżetowy do lekkich bram skrzydłowych. Sprawdza się tylko przy małych bramach.",
  },
  {
    name: "ParkingPro Barrier-3M",
    manufacturer: "ParkingPro",
    model: "Barrier-3M",
    sku: "PP-B3M",
    type: "szlabany",
    max_weight_kg: 0,
    max_length_m: 3.0,
    power_w: 80,
    voltage: "24V DC",
    duty_cycle: "S3 80%",
    ip_rating: "IP54",
    price_cents: 279900,
    pros: "- Ramie do 3m\n- Bardzo wysoki duty cycle (80%)\n- Czas otwarcia 1.5s\n- Magnes wewnątrz — można dorzucić auto-detection",
    cons: "- Tylko ramie — bez fotokomórek (do dokupienia)\n- Wymaga betonowej podstawy",
    description:
      "Szlaban parkingowy do osiedli, parkingów, firm. Bardzo szybki i niezawodny.",
  },
  {
    name: "GarageMax G-700",
    manufacturer: "GarageMax",
    model: "G-700",
    sku: "GMX-G700",
    type: "garazowy",
    max_weight_kg: 100,
    max_length_m: null,
    power_w: 700,
    voltage: "230V AC",
    duty_cycle: "S2 25%",
    ip_rating: "IP44",
    price_cents: 159900,
    pros: "- Specjalnie do bram garażowych segmentowych i uchylnych\n- Pilot 433MHz w komplecie (2 szt)\n- Łatwa instalacja sufitowa",
    cons: "- Tylko do bram garażowych — nie do skrzydłowych\n- Niski duty cycle\n- Hałaśliwy",
    description:
      "Napęd garażowy do bram segmentowych i uchylnych. Standard w domach jednorodzinnych.",
  },
  {
    name: "RollMax R-50 Roleta",
    manufacturer: "RollMax",
    model: "R-50",
    sku: "RM-R50",
    type: "rolety",
    max_weight_kg: 50,
    max_length_m: 4.0,
    power_w: 120,
    voltage: "230V AC",
    duty_cycle: "S2 25%",
    ip_rating: "IP44",
    price_cents: 69900,
    pros: "- Cichy silnik rurowy\n- Bezpośrednio do rolety zewnętrznej\n- Łatwy montaż\n- Z czujnikiem przeszkody",
    cons: "- Tylko do rolet, nie do bram\n- Bez radio (osobno)\n- Brak baterii backup",
    description:
      "Silnik rurowy do rolet zewnętrznych. Dla okien o szerokości do 4m.",
  },
];

export async function seedDatabase() {
  const conn = await db();

  const [existing] = await conn.select<{ n: number }[]>(
    "SELECT COUNT(*) as n FROM products",
  );
  if (existing.n > 0) {
    return { skipped: true, count: 0 };
  }

  let count = 0;
  for (const p of PRODUCTS) {
    await conn.execute(
      `INSERT INTO products (
        name, manufacturer, model, sku, type, max_weight_kg, max_length_m,
        power_w, voltage, duty_cycle, ip_rating, price_cents, currency,
        pros, cons, description, external_links_json, attributes_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLN', ?, ?, ?, '{}', '{}')`,
      [
        p.name,
        p.manufacturer,
        p.model,
        p.sku,
        p.type,
        p.max_weight_kg,
        p.max_length_m,
        p.power_w,
        p.voltage,
        p.duty_cycle,
        p.ip_rating,
        p.price_cents,
        p.pros,
        p.cons,
        p.description,
      ],
    );
    count++;
  }

  await conn.execute(
    "INSERT INTO customers (name, kind, company, nip, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      "Jan Kowalski",
      "b2c",
      null,
      null,
      "jan.kowalski@example.com",
      "+48 600 100 200",
      "ul. Słoneczna 12, 00-001 Warszawa",
      "Pyta o napęd do bramy skrzydłowej 3m, 250kg.",
    ],
  );
  await conn.execute(
    "INSERT INTO customers (name, kind, company, nip, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      "Anna Nowak",
      "b2b",
      "Nowak Logistics Sp. z o.o.",
      "5252222333",
      "biuro@nowak-log.pl",
      "+48 22 345 67 89",
      "ul. Przemysłowa 5, 02-100 Warszawa",
      "Brama przemysłowa 10m, klient powraca co rok po serwis.",
    ],
  );

  return { skipped: false, count };
}

export async function clearAllData() {
  const conn = await db();
  await conn.execute("DELETE FROM interactions");
  await conn.execute("DELETE FROM todos");
  await conn.execute("DELETE FROM notes");
  await conn.execute("DELETE FROM products");
  await conn.execute("DELETE FROM customers");
}
