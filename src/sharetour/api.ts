import { DatabaseState, Trip, Batch, Booking } from "./types";

const API_BASE = "/api";
const LOCAL_STORAGE_KEY = "smart_journey_sharetour_db_v1";

const INITIAL_DB: DatabaseState = {
  trips: [
    {
      id: "trip-2",
      title: "Ancient Java: Bromo Sunrise & Mt. Ijen Blue Fire",
      slug: "bromo-ijen",
      location: "East Java (Probolinggo & Banyuwangi)",
      duration: "3 Days 2 Nights",
      description: "Witness the surreal sea of sand surrounding Mount Bromo, feel the cold mountain air as the sun rises over smoke-venting volcanos, and venture deep inside Mount Ijen to see the magical neon-blue sulfuric fire of Banyuwangi.",
      coverImage: "https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?auto=format&fit=crop&w=1200&q=80",
      included: [
        "AC Transport throughout Java tour (3 days)",
        "4x4 Private Jeep in Mount Bromo",
        "Local mountain guides for Bromo & Ijen",
        "Entrance fees for Bromo and Ijen National Parks",
        "1 Night at Bromo mountain lodge, 1 Night at Banyuwangi hotel",
        "Gas masks for Mt. Ijen sulfuric fumes",
        "Daily mineral water and breakfast"
      ],
      excluded: [
        "Lunch and Dinner meals",
        "Horse riding fees in Bromo",
        "Flights or trains to Surabaya/Malang",
        "Tips for guides and drivers"
      ],
      highlight: "Private 4x4 Jeep sunrise convoy across Bromo's whispering sand sea, and a midnight trek into Ijen crater to see the rare glowing sulfuric blue flame.",
      gallery: [
        "https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format"
      ],
      faq: [
        {
          question: "Do you supply protective equipment?",
          answer: "Yes, we provide professional active-carbon gas masks and headlamps for the Mt. Ijen sulfur hike."
        }
      ],
      status: "published",
      startingPrice: 150,
      price: 150,
      itinerary: [
        {
          day: 1,
          title: "Pick up from Surabaya & Bromo Mountain Check-in",
          description: "Pick up from Surabaya Airport/Train Station. Enjoy a private scenic 4-hour drive to Cemoro Lawang village. Check into your cozy room sitting directly on the rim of the Tengger Caldera. Feel the crisp mountain air and rest early for the pre-dawn expedition.",
          timeSchedules: [
            { time: "12:00", activity: "Surabaya airport pickup & meet private driver" },
            { time: "16:00", activity: "Check-in at mountain caldera overlook lodge" }
          ]
        },
        {
          day: 2,
          title: "Bromo Sunrise, Crater Trek & Banyuwangi Drive",
          description: "Wake up at 3:00 AM. Board your private 4x4 Jeep to Penanjakan viewpoint to witness the world-famous sunrise over Mt. Bromo, Mt. Batok, and Mt. Semeru. Afterward, cross the dramatic Whispering Sand and hike 250 steps to Bromo's active crater rim. Return, check out, and take a 6-hour scenic drive to Banyuwangi.",
          timeSchedules: [
            { time: "03:00", activity: "Board 4x4 Offroad Jeep to sunrise overlook" },
            { time: "08:00", activity: "Volcanic crater rim hike & Whispering Sand crossing" },
            { time: "12:00", activity: "Checkout and transfer drive to Banyuwangi" }
          ]
        },
        {
          day: 3,
          title: "Ijen Midnight Hike, Blue Flame Experience & Bali Ferry Transfer",
          description: "Start at 1:00 AM. Hike 2 hours up Mount Ijen. Descent safely into the crater alongside sulfur miners to see the stunning Neon Blue Acid Flames of Ijen. Walk around the giant turquoise acidic lake at sunrise. Return to base for breakfast, then transfer to Banyuwangi harbor or catch a ferry to Bali.",
          timeSchedules: [
            { time: "01:00", activity: "Midnight departure and trek up Mt. Ijen summit" },
            { time: "03:30", activity: "Sulfur crater descent & glowing blue fire viewing" },
            { time: "06:00", activity: "Sunrise view over toxic acid green lake" },
            { time: "11:00", activity: "Breakfast checkout & ferry transfer drop-off" }
          ]
        }
      ]
    }
  ],
  batches: [
    {
      id: "batch-4",
      tripId: "trip-2",
      departureDate: "2026-07-22",
      quota: 12,
      availableSeats: 12,
      price: 150,
      status: "Open"
    },
    {
      id: "batch-5",
      tripId: "trip-2",
      departureDate: "2026-08-18",
      quota: 12,
      availableSeats: 12,
      price: 150,
      status: "Open"
    }
  ],
  bookings: []
};

export function recalculateBatchSeats(db: DatabaseState): DatabaseState {
  if (!db || !db.batches) return db;
  if (!db.bookings) db.bookings = [];

  db.batches.forEach((batch) => {
    const activeBookings = db.bookings.filter(
      (b) => b.batchId === batch.id && b.status !== "Rejected"
    );
    const totalBooked = activeBookings.reduce(
      (sum, b) => sum + (Number(b.participantsCount) || 1),
      0
    );
    const quota = Number(batch.quota) || 12;
    batch.availableSeats = Math.max(0, quota - totalBooked);

    if (batch.availableSeats <= 0) {
      batch.status = "Closed";
    } else if (batch.status === "Closed" && batch.availableSeats > 0) {
      batch.status = "Open";
    }
  });

  return db;
}

export function getStoredLocalDB(): DatabaseState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      recalculateBatchSeats(INITIAL_DB);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DB));
      return INITIAL_DB;
    }
    const db = JSON.parse(raw) as DatabaseState;
    recalculateBatchSeats(db);
    return db;
  } catch {
    recalculateBatchSeats(INITIAL_DB);
    return INITIAL_DB;
  }
}

export function saveStoredLocalDB(db: DatabaseState): void {
  try {
    recalculateBatchSeats(db);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error("Failed to persist ShareTour local database", err);
  }
}

export async function fetchDB(): Promise<DatabaseState> {
  try {
    const res = await fetch(`${API_BASE}/db`);
    if (res.ok) {
      const db = await res.json();
      saveStoredLocalDB(db);
      return db;
    }
  } catch (error) {
    console.warn("Backend API endpoint unavailable, serving local store fallback:", error);
  }
  return getStoredLocalDB();
}

export async function createTrip(trip: Omit<Trip, "id">): Promise<Trip> {
  const newTrip: Trip = { ...trip, id: "trip-" + Date.now() };
  try {
    const res = await fetch(`${API_BASE}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trip),
    });
    if (res.ok) {
      const serverTrip = await res.ok ? await res.json() : newTrip;
      const db = getStoredLocalDB();
      db.trips.push(serverTrip);
      saveStoredLocalDB(db);
      return serverTrip;
    }
  } catch (e) {
    console.warn("Server API offline, persisting trip locally", e);
  }

  const db = getStoredLocalDB();
  db.trips.push(newTrip);
  saveStoredLocalDB(db);
  return newTrip;
}

export async function updateTrip(id: string, trip: Partial<Trip>): Promise<Trip> {
  try {
    const res = await fetch(`${API_BASE}/trips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trip),
    });
    if (res.ok) {
      const updated = await res.json();
      const db = getStoredLocalDB();
      db.trips = db.trips.map((t) => (t.id === id ? { ...t, ...updated } : t));
      saveStoredLocalDB(db);
      return updated;
    }
  } catch (e) {
    console.warn("Server API offline, updating trip locally", e);
  }

  const db = getStoredLocalDB();
  let updatedTrip: Trip | null = null;
  db.trips = db.trips.map((t) => {
    if (t.id === id) {
      updatedTrip = { ...t, ...trip };
      return updatedTrip;
    }
    return t;
  });
  saveStoredLocalDB(db);
  if (!updatedTrip) throw new Error("Trip not found");
  return updatedTrip;
}

export async function deleteTrip(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/trips/${id}`, { method: "DELETE" });
  } catch (e) {
    console.warn("Server API offline, deleting trip locally", e);
  }
  const db = getStoredLocalDB();
  db.trips = db.trips.filter((t) => t.id !== id);
  db.batches = db.batches.filter((b) => b.tripId !== id);
  saveStoredLocalDB(db);
}

export async function createBatch(batch: Omit<Batch, "id">): Promise<Batch> {
  const newBatch: Batch = {
    ...batch,
    id: "batch-" + Date.now(),
    availableSeats: batch.availableSeats ?? batch.quota
  };
  try {
    const res = await fetch(`${API_BASE}/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (res.ok) {
      const serverBatch = await res.json();
      const db = getStoredLocalDB();
      db.batches.push(serverBatch);
      saveStoredLocalDB(db);
      return serverBatch;
    }
  } catch (e) {
    console.warn("Server API offline, creating batch locally", e);
  }

  const db = getStoredLocalDB();
  db.batches.push(newBatch);
  saveStoredLocalDB(db);
  return newBatch;
}

export async function updateBatch(id: string, batch: Partial<Batch>): Promise<Batch> {
  try {
    const res = await fetch(`${API_BASE}/batches/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (res.ok) {
      const updated = await res.json();
      const db = getStoredLocalDB();
      db.batches = db.batches.map((b) => (b.id === id ? { ...b, ...updated } : b));
      saveStoredLocalDB(db);
      return updated;
    }
  } catch (e) {
    console.warn("Server API offline, updating batch locally", e);
  }

  const db = getStoredLocalDB();
  let updatedBatch: Batch | null = null;
  db.batches = db.batches.map((b) => {
    if (b.id === id) {
      updatedBatch = { ...b, ...batch };
      return updatedBatch;
    }
    return b;
  });
  saveStoredLocalDB(db);
  if (!updatedBatch) throw new Error("Batch not found");
  return updatedBatch;
}

export async function deleteBatch(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/batches/${id}`, { method: "DELETE" });
  } catch (e) {
    console.warn("Server API offline, deleting batch locally", e);
  }
  const db = getStoredLocalDB();
  db.batches = db.batches.filter((b) => b.id !== id);
  saveStoredLocalDB(db);
}

export async function createBooking(
  booking: Omit<Booking, "id" | "bookingCode" | "status" | "createdAt" | "tripTitle" | "departureDate">
): Promise<Booking> {
  const code = "SJ-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  const db = getStoredLocalDB();
  const trip = db.trips.find((t) => t.id === booking.tripId);
  const batch = db.batches.find((b) => b.id === booking.batchId);

  const localBooking: Booking = {
    ...booking,
    id: "booking-" + Date.now(),
    bookingCode: code,
    status: "Pending",
    createdAt: new Date().toISOString(),
    tripTitle: trip?.title || "Open Trip Package",
    departureDate: batch?.departureDate || new Date().toISOString().split("T")[0]
  };

  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    });
    if (res.ok) {
      const serverBooking = await res.json();
      db.bookings.unshift(serverBooking);
      saveStoredLocalDB(db);
      return serverBooking;
    }
  } catch (e) {
    console.warn("Server API offline, creating booking locally", e);
  }

  db.bookings.unshift(localBooking);
  saveStoredLocalDB(db);
  return localBooking;
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
  try {
    const res = await fetch(`${API_BASE}/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      const db = getStoredLocalDB();
      db.bookings = db.bookings.map((b) => (b.id === id ? { ...b, ...updated } : b));
      saveStoredLocalDB(db);
      return updated;
    }
  } catch (e) {
    console.warn("Server API offline, updating booking locally", e);
  }

  const db = getStoredLocalDB();
  let updatedBooking: Booking | null = null;
  db.bookings = db.bookings.map((b) => {
    if (b.id === id) {
      updatedBooking = { ...b, ...updates };
      return updatedBooking;
    }
    return b;
  });
  saveStoredLocalDB(db);
  if (!updatedBooking) throw new Error("Booking not found");
  return updatedBooking;
}

export async function adminLogin(email: string, password: string): Promise<{ token: string; success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      return res.json();
    }
  } catch (e) {
    console.warn("Server auth API offline, validating against admin passcodes locally", e);
  }

  const validEmails = ["sawahjayagroup@gmail.com", "admin@smartjourney.com"];
  if (validEmails.includes(email.trim().toLowerCase()) && password === "smartjourney2026") {
    return {
      token: "admin-smart-journey-token",
      success: true
    };
  }

  throw new Error("Email atau password administrator tidak valid.");
}

export async function purgeAllBookings(): Promise<void> {
  try {
    await fetch(`${API_BASE}/bookings/purge`, { method: "POST" });
  } catch (e) {
    console.warn("Server API offline, purging bookings locally", e);
  }
  const db = getStoredLocalDB();
  db.bookings = [];
  saveStoredLocalDB(db);
}

export async function importBulk(data: { trips: Trip[]; batches: Batch[]; mode: "append" | "overwrite" }): Promise<{ success: boolean; tripsCount: number; batchesCount: number }> {
  try {
    const res = await fetch(`${API_BASE}/import-bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const result = await res.json();
      const freshDB = await fetchDB();
      return { success: true, tripsCount: freshDB.trips.length, batchesCount: freshDB.batches.length };
    }
  } catch (e) {
    console.warn("Server API offline, performing bulk import locally", e);
  }

  const db = getStoredLocalDB();
  if (data.mode === "overwrite") {
    db.trips = data.trips || [];
    db.batches = data.batches || [];
  } else {
    if (data.trips && data.trips.length > 0) db.trips.push(...data.trips);
    if (data.batches && data.batches.length > 0) db.batches.push(...data.batches);
  }
  saveStoredLocalDB(db);
  return { success: true, tripsCount: db.trips.length, batchesCount: db.batches.length };
}

