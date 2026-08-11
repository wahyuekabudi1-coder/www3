import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { Trip, Batch, Booking, DatabaseState } from './src/sharetour/types';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_PATH = path.join(process.cwd(), 'src', 'db.json');

// Helper to generate a unique booking code: SJ-[6 RANDOM ALPHANUMERIC CHARACTERS]
function generateUniqueBookingCode(existingCodes: string[]): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let attempt = 0;
  while (attempt < 1000) {
    let code = 'SJ-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const exists = existingCodes.some(c => c.toUpperCase() === code.toUpperCase());
    if (!exists) {
      return code;
    }
    attempt++;
  }
  return 'SJ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Initial Mock/Pre-seeded DB
const defaultDB: DatabaseState = {
  trips: [
    {
      id: 'trip-2',
      title: 'Ancient Java: Bromo Sunrise & Mt. Ijen Blue Fire',
      slug: 'bromo-ijen',
      location: 'East Java (Probolinggo & Banyuwangi)',
      duration: '3 Days 2 Nights',
      description: 'Witness the surreal sea of sand surrounding Mount Bromo, feel the cold mountain air as the sun rises over smoke-venting volcanos, and venture deep inside Mount Ijen to see the magical neon-blue sulfuric fire of Banyuwangi.',
      coverImage: 'https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?auto=format&fit=crop&w=1200&q=80',
      included: [
        'AC Transport throughout Java tour (3 days)',
        '4x4 Private Jeep in Mount Bromo',
        'Local mountain guides for Bromo & Ijen',
        'Entrance fees for Bromo and Ijen National Parks',
        '1 Night at Bromo mountain lodge, 1 Night at Banyuwangi hotel',
        'Gas masks for Mt. Ijen sulfuric fumes',
        'Daily mineral water and breakfast'
      ],
      excluded: [
        'Lunch and Dinner meals',
        'Horse riding fees in Bromo',
        'Flights or trains to Surabaya/Malang',
        'Tips for guides and drivers'
      ],
      highlight: 'Private 4x4 Jeep sunrise convoy across Bromo\'s whispering sand sea, and a midnight trek into Ijen crater to see the rare glowing sulfuric blue flame.',
      gallery: [
        'https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format'
      ],
      faq: [
        {
          question: 'Do you supply protective equipment?',
          answer: 'Yes, we provide professional active-carbon gas masks and headlamps for the Mt. Ijen sulfur hike.'
        }
      ],
      status: 'published',
      startingPrice: 150,
      price: 150,
      itinerary: [
        {
          day: 1,
          title: 'Pick up from Surabaya & Bromo Mountain Check-in',
          description: 'Pick up from Surabaya Airport/Train Station. Enjoy a private scenic 4-hour drive to Cemoro Lawang village. Check into your cozy room sitting directly on the rim of the Tengger Caldera. Feel the crisp mountain air and rest early for the pre-dawn expedition.',
          timeSchedules: [
            { time: '12:00', activity: 'Surabaya airport pickup & meet private driver' },
            { time: '16:00', activity: 'Check-in at mountain caldera overlook lodge' }
          ]
        },
        {
          day: 2,
          title: 'Bromo Sunrise, Crater Trek & Banyuwangi Drive',
          description: 'Wake up at 3:00 AM. Board your private 4x4 Jeep to Penanjakan viewpoint to witness the world-famous sunrise over Mt. Bromo, Mt. Batok, and Mt. Semeru. Afterward, cross the dramatic Whispering Sand and hike 250 steps to Bromo\'s active crater rim. Return, check out, and take a 6-hour scenic drive to Banyuwangi.',
          timeSchedules: [
            { time: '03:00', activity: 'Board 4x4 Offroad Jeep to sunrise overlook' },
            { time: '08:00', activity: 'Volcanic crater rim hike & Whispering Sand crossing' },
            { time: '12:00', activity: 'Checkout and transfer drive to Banyuwangi' }
          ]
        },
        {
          day: 3,
          title: 'Ijen Midnight Hike, Blue Flame Experience & Bali Ferry Transfer',
          description: 'Start at 1:00 AM. Hike 2 hours up Mount Ijen. Descent safely into the crater alongside sulfur miners to see the stunning Neon Blue Acid Flames of Ijen. Walk around the giant turquoise acidic lake at sunrise. Return to base for breakfast, then transfer to Banyuwangi harbor or catch a ferry to Bali.',
          timeSchedules: [
            { time: '01:00', activity: 'Midnight departure and trek up Mt. Ijen summit' },
            { time: '03:30', activity: 'Sulfur crater descent & glowing blue fire viewing' },
            { time: '06:00', activity: 'Sunrise view over toxic acid green lake' },
            { time: '11:00', activity: 'Breakfast checkout & ferry transfer drop-off' }
          ]
        }
      ]
    }
  ],
  batches: [
    {
      id: 'batch-4',
      tripId: 'trip-2',
      departureDate: '2026-07-22',
      quota: 12,
      availableSeats: 12,
      price: 150,
      status: 'Open'
    },
    {
      id: 'batch-5',
      tripId: 'trip-2',
      departureDate: '2026-08-18',
      quota: 12,
      availableSeats: 12,
      price: 150,
      status: 'Open'
    }
  ],
  bookings: []
};

function recalculateBatchSeats(db: DatabaseState): void {
  if (!db || !db.batches) return;
  if (!db.bookings) db.bookings = [];

  db.batches.forEach((batch) => {
    const activeBookings = db.bookings.filter(
      (b) => b.batchId === batch.id && b.status !== 'Rejected'
    );
    const totalBooked = activeBookings.reduce(
      (sum, b) => sum + (Number(b.participantsCount) || 1),
      0
    );
    const quota = Number(batch.quota) || 12;
    batch.availableSeats = Math.max(0, quota - totalBooked);

    if (batch.availableSeats <= 0) {
      batch.status = 'Closed';
    } else if (batch.status === 'Closed' && batch.availableSeats > 0) {
      batch.status = 'Open';
    }
  });
}

let memoryDB: DatabaseState | null = null;

function readDB(): DatabaseState {
  if (memoryDB) {
    return memoryDB;
  }
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      memoryDB = JSON.parse(raw) as DatabaseState;
      recalculateBatchSeats(memoryDB!);
      return memoryDB!;
    }
  } catch (error) {
    console.error('Error reading database file, using default map:', error);
  }
  memoryDB = JSON.parse(JSON.stringify(defaultDB));
  recalculateBatchSeats(memoryDB!);
  return memoryDB!;
}

function writeDB(data: DatabaseState) {
  memoryDB = data;
  try {
    recalculateBatchSeats(data);
    if (!process.env.VERCEL) {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    }
  } catch (error) {
    console.error('Error writing database file:', error);
  }
}

const app = express();

// CORS Middleware for Vercel & Cross-Origin Requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Secret-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '15mb' }));

// -------------------------------------------------------------
// SEO Crawlers Endpoints: Robots.txt & Dynamic Sitemap.xml
// -------------------------------------------------------------

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: https://smartjourney.co.id/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  const baseUrl = 'https://smartjourney.co.id';
  const currentDate = new Date().toISOString().split('T')[0];

  let tripsXml = '';
  try {
    const db = readDB();
    if (db && db.trips) {
      tripsXml = db.trips.map((t: any) => `
<url>
  <loc>${baseUrl}/#/tours?id=${t.id || t.slug}</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>daily</changefreq>
  <priority>0.8</priority>
</url>`).join('');
    }
  } catch {
    // ignore
  }

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
<url>
  <loc>${baseUrl}/</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>daily</changefreq>
  <priority>1.0</priority>
</url>
<url>
  <loc>${baseUrl}/#/tours</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>daily</changefreq>
  <priority>0.9</priority>
</url>
<url>
  <loc>${baseUrl}/#/car-rental</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>daily</changefreq>
  <priority>0.9</priority>
</url>
<url>
  <loc>${baseUrl}/#/share-tour</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>daily</changefreq>
  <priority>0.85</priority>
</url>
<url>
  <loc>${baseUrl}/#/airport</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>${baseUrl}/#/taxi</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>${baseUrl}/#/about</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.6</priority>
</url>
<url>
  <loc>${baseUrl}/#/partnerships</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>${baseUrl}/#/bookings</loc>
  <lastmod>${currentDate}</lastmod>
  <changefreq>daily</changefreq>
  <priority>0.5</priority>
</url>${tripsXml}
</urlset>`;

  res.send(sitemapContent);
});

  // -------------------------------------------------------------
  // Share Tour Database & Core API Routes
  // -------------------------------------------------------------

  app.get('/api/db', (req, res) => {
    try {
      const db = readDB();
      res.json(db);
    } catch {
      res.status(500).json({ error: 'Failed to read database state' });
    }
  });

  app.post('/api/import-bulk', (req, res) => {
    try {
      const { trips: newTrips, batches: newBatches, mode } = req.body;
      const db = readDB();

      if (mode === 'overwrite') {
        db.trips = newTrips || [];
        db.batches = newBatches || [];
      } else {
        if (newTrips && newTrips.length > 0) {
          db.trips = [...db.trips, ...newTrips];
        }
        if (newBatches && newBatches.length > 0) {
          db.batches = [...db.batches, ...newBatches];
        }
      }

      writeDB(db);
      res.json({ success: true, tripsCount: db.trips.length, batchesCount: db.batches.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to process bulk import of trips and batches' });
    }
  });

  app.post('/api/trips', (req, res) => {
    try {
      const db = readDB();
      const newTrip: Trip = {
        ...req.body,
        id: 'trip-' + Date.now().toString()
      };
      db.trips.push(newTrip);
      writeDB(db);
      res.status(201).json(newTrip);
    } catch {
      res.status(500).json({ error: 'Failed to save trip' });
    }
  });

  app.put('/api/trips/:id', (req, res) => {
    try {
      const db = readDB();
      const index = db.trips.findIndex((t) => t.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Trip not found' });
      }
      db.trips[index] = { ...db.trips[index], ...req.body };
      writeDB(db);
      res.json(db.trips[index]);
    } catch {
      res.status(500).json({ error: 'Failed to update trip' });
    }
  });

  app.delete('/api/trips/:id', (req, res) => {
    try {
      const db = readDB();
      db.trips = db.trips.filter((t) => t.id !== req.params.id);
      db.batches = db.batches.filter((b) => b.tripId !== req.params.id);
      writeDB(db);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete trip' });
    }
  });

  app.post('/api/batches', (req, res) => {
    try {
      const db = readDB();
      const newBatch: Batch = {
        ...req.body,
        id: 'batch-' + Date.now().toString()
      };
      db.batches.push(newBatch);
      writeDB(db);
      res.status(201).json(newBatch);
    } catch {
      res.status(500).json({ error: 'Failed to create batch' });
    }
  });

  app.put('/api/batches/:id', (req, res) => {
    try {
      const db = readDB();
      const index = db.batches.findIndex((b) => b.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Batch not found' });
      }
      db.batches[index] = { ...db.batches[index], ...req.body };
      writeDB(db);
      res.json(db.batches[index]);
    } catch {
      res.status(500).json({ error: 'Failed to update batch' });
    }
  });

  app.delete('/api/batches/:id', (req, res) => {
    try {
      const db = readDB();
      db.batches = db.batches.filter((b) => b.id !== req.params.id);
      writeDB(db);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete batch' });
    }
  });

  app.post('/api/bookings', (req, res) => {
    try {
      const db = readDB();
      const payload = req.body;
      
      const batchIndex = db.batches.findIndex((b) => b.id === payload.batchId);
      if (batchIndex === -1) {
        return res.status(404).json({ error: 'Departure batch not found' });
      }
      
      const batch = db.batches[batchIndex];
      const count = Number(payload.participantsCount);

      if (batch.status === 'Closed' || batch.availableSeats < count) {
        return res.status(400).json({ error: 'Requested batch quota is insufficient' });
      }

      batch.availableSeats -= count;
      if (batch.availableSeats <= 0) {
        batch.status = 'Closed';
      }

      const trip = db.trips.find((t) => t.id === payload.tripId);

      const newBooking: Booking = {
        id: 'book-' + Date.now().toString(),
        bookingCode: generateUniqueBookingCode(db.bookings.map(b => b.bookingCode)),
        tripId: payload.tripId,
        tripTitle: trip ? trip.title : 'Unknown Trip',
        batchId: payload.batchId,
        departureDate: batch.departureDate,
        fullName: payload.fullName || payload.participantData?.name || 'Unknown traveler',
        email: payload.email || payload.participantData?.email || 'unknown@example.com',
        phone: payload.phone || payload.participantData?.whatsapp || 'N/A',
        participantsCount: count || 1,
        participantsNames: payload.participantsNames || [payload.fullName || payload.participantData?.name || 'Unknown traveler'],
        proofOfPayment: payload.proofOfPayment || 'NOT_APPLICABLE_SLEEK_THEME',
        status: 'Pending',
        totalPrice: payload.totalPrice || (batch ? batch.price : 0),
        createdAt: new Date().toISOString(),
        participantData: payload.participantData,
        adminNotes: payload.adminNotes || ''
      };

      db.bookings.push(newBooking);
      writeDB(db);

      res.status(201).json(newBooking);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to register booking' });
    }
  });

  app.put('/api/bookings/:id', (req, res) => {
    try {
      const db = readDB();
      const index = db.bookings.findIndex((b) => b.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Booking code not found' });
      }

      const originalBooking = db.bookings[index];
      const nextBooking = { ...originalBooking, ...req.body };

      if (nextBooking.status === 'Rejected' && originalBooking.status !== 'Rejected') {
        const bIdx = db.batches.findIndex((b) => b.id === originalBooking.batchId);
        if (bIdx !== -1) {
          db.batches[bIdx].availableSeats += originalBooking.participantsCount;
          if (db.batches[bIdx].availableSeats > 0) {
            db.batches[bIdx].status = 'Open';
          }
        }
      }
      if (originalBooking.status === 'Rejected' && nextBooking.status !== 'Rejected') {
        const bIdx = db.batches.findIndex((b) => b.id === originalBooking.batchId);
        if (bIdx !== -1) {
          db.batches[bIdx].availableSeats -= originalBooking.participantsCount;
          if (db.batches[bIdx].availableSeats < 0) db.batches[bIdx].availableSeats = 0;
          if (db.batches[bIdx].availableSeats <= 0) {
            db.batches[bIdx].status = 'Closed';
          }
        }
      }

      db.bookings[index] = nextBooking;
      writeDB(db);
      res.json(db.bookings[index]);
    } catch {
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  app.post('/api/bookings/purge', (req, res) => {
    try {
      const db = readDB();
      db.bookings = [];
      db.batches.forEach((b) => {
        b.availableSeats = b.quota;
        b.status = 'Open';
      });
      writeDB(db);
      res.json({ success: true, message: 'All bookings cleared and batch quotas reset.' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to purge bookings database' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const validEmails = ['sawahjayagroup@gmail.com', 'admin@smartjourney.com'];
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are both required.' });
    }

    if (validEmails.includes(email.trim().toLowerCase()) && password === 'smartjourney2026') {
      res.json({ token: 'admin-smart-journey-token', success: true });
    } else {
      res.status(401).json({ error: 'Invalid email or passcode. Please try again.' });
    }
  });

  // -------------------------------------------------------------
  // ArtoPay Official Production Gateway API Routes
  // -------------------------------------------------------------

  app.get('/api/artopay/config', (req, res) => {
    const rawSecretKey = process.env.ARTOPAY_SECRET_KEY || '';
    const secretKey = rawSecretKey.replace(/^["']|["']$/g, '').trim();
    const envMode = process.env.ARTOPAY_ENV || (process.env.ARTOPAY_SANDBOX === 'false' ? 'production' : 'sandbox');
    const baseUrl = process.env.ARTOPAY_API_BASE_URL || (envMode === 'production' ? 'https://api.arto-pay.com' : 'https://api-sandbox.arto-pay.com');
    const publicKey = process.env.VITE_ARTOPAY_PUBLIC_KEY || process.env.ARTOPAY_PUBLIC_KEY || '';

    res.json({
      isConfigured: !!secretKey,
      env: envMode,
      apiBaseUrl: baseUrl,
      publicKey: publicKey ? `${publicKey.substring(0, 6)}...` : '',
      message: secretKey
        ? "ArtoPay Server Secret Key is configured."
        : "ARTOPAY_SECRET_KEY is missing. Please add ARTOPAY_SECRET_KEY in Vercel/Environment Variables."
    });
  });

  app.post(['/api/artopay/payment-intent', '/artopay/payment-intent'], async (req, res) => {
    try {
      let { orderId, amount, currency = 'IDR', description, customerId, metadata, customerName, customerEmail, customerPhone } = req.body || {};

      if (!orderId) {
        return res.status(400).json({ error: 'orderId parameter is required' });
      }

      let numericAmount = Number(amount);
      if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a valid positive number' });
      }

      const rawSecretKey = process.env.ARTOPAY_SECRET_KEY || '';
      const secretKey = rawSecretKey.replace(/^["']|["']$/g, '').trim();

      // SECURITY RULE: Reject request if Secret Key is missing. DO NOT produce fake/mock payment!
      if (!secretKey) {
        console.error('[ArtoPay Server Error] ARTOPAY_SECRET_KEY environment variable is not configured.');
        return res.status(400).json({
          error: 'Integrasi ArtoPay belum siap. ARTOPAY_SECRET_KEY belum diisi di Environment Variables Vercel/Server. Pembayaran tidak dapat diproses.'
        });
      }

      const envMode = process.env.ARTOPAY_ENV || (process.env.ARTOPAY_SANDBOX === 'false' ? 'production' : 'sandbox');
      const baseUrl = process.env.ARTOPAY_API_BASE_URL || (envMode === 'production' ? 'https://api.artopay.online' : 'https://api-sandbox.arto-pay.com');

      const rawPublicKey = process.env.VITE_ARTOPAY_PUBLIC_KEY || process.env.ARTOPAY_PUBLIC_KEY || '';
      const publicKey = rawPublicKey.replace(/^["']|["']$/g, '').trim();

      // Check DB for existing order to avoid double payment or amount tampering
      const db = readDB();
      if (!db.bookings) db.bookings = [];

      let existingOrderIndex = db.bookings.findIndex(b => b.bookingCode === orderId || b.id === orderId);
      let existingOrder = existingOrderIndex !== -1 ? db.bookings[existingOrderIndex] : null;

      if (existingOrder) {
        if (existingOrder.paymentStatus === 'Paid' || existingOrder.status === 'Confirmed') {
          return res.status(400).json({ error: 'Pesanan ini sudah lunas (PAID). Pembayaran ulang tidak diperlukan.' });
        }
        if (existingOrder.totalPriceIDR || existingOrder.totalPrice) {
          numericAmount = Number(existingOrder.totalPriceIDR || existingOrder.totalPrice);
        }
      } else {
        // Register initial order in DB with PENDING_PAYMENT status
        existingOrder = {
          id: String(orderId),
          bookingCode: String(orderId),
          tripId: 'General',
          tripTitle: description || 'SmartJourney Booking',
          batchId: '',
          fullName: customerName || 'Customer',
          customerName: customerName || 'Customer',
          email: customerEmail || 'customer@example.com',
          customerEmail: customerEmail || 'customer@example.com',
          phone: customerPhone || 'N/A',
          customerPhone: customerPhone || 'N/A',
          participantsCount: 1,
          participantsNames: [customerName || 'Customer'],
          proofOfPayment: 'ARTOPAY_GATEWAY',
          status: 'Pending',
          paymentStatus: 'Pending',
          totalPrice: numericAmount,
          totalPriceIDR: numericAmount,
          createdAt: new Date().toISOString()
        };
        db.bookings.push(existingOrder);
        existingOrderIndex = db.bookings.length - 1;
        writeDB(db);
      }

      const endpoint = `${baseUrl.replace(/\/+$/, '')}/v1.1/payment-intents`;
      console.log(`[ArtoPay Backend] Creating Official Payment Intent via ${endpoint} for Order: ${orderId}, Amount: ${numericAmount} ${currency}`);

      const formattedAmount = Number(numericAmount).toFixed(2);
      const requestBody = JSON.stringify({
        amount: formattedAmount,
        currency: currency || 'IDR',
        orderId: String(orderId),
        description: description || `Payment for order ${orderId}`,
        customerId: customerId || `cust_${String(orderId).replace(/[^a-zA-Z0-9]/g, '_')}`,
        metadata: metadata || {}
      });

      const candidateHeaders = {
        'Content-Type': 'application/json',
        'X-Secret-Key': secretKey
      };

      console.log(`[ArtoPay Backend] Sending Payment Intent POST to ${endpoint} with X-Secret-Key authentication`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: candidateHeaders,
        body: requestBody
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ArtoPay API Gateway Error ${response.status}]:`, errorText);

        let userFriendlyError = `Gagal membuat transaksi ArtoPay (${response.status}). Periksa kredensial API key atau koneksi ArtoPay.`;

        if (response.status === 401) {
          userFriendlyError = 'Autentikasi ArtoPay gagal (401 Unauthorized). Silakan periksa kembali ARTOPAY_SECRET_KEY di Environment Variables Vercel/Server Anda.';
        } else if (response.status === 403) {
          userFriendlyError = 'Akses ArtoPay ditolak (403 Forbidden). Pastikan IP server atau domain Anda diizinkan di dashboard ArtoPay.';
        }

        return res.status(response.status >= 400 && response.status < 600 ? response.status : 500).json({
          error: userFriendlyError,
          details: errorText
        });
      }

      const data: any = await response.json();
      console.log('[ArtoPay API Gateway Response]:', data);

      const resData = data.responseData || data;

      const paymentId = resData.id || resData.paymentId;
      const secret = resData.secret || resData.clientSecret;
      const customerToken = resData.customerToken;
      const checkoutUrl = resData.checkoutUrl || resData.paymentUrl || resData.redirectUrl;

      // Update DB with active paymentIntentId
      if (existingOrderIndex !== -1 && db.bookings[existingOrderIndex]) {
        db.bookings[existingOrderIndex].paymentIntentId = paymentId;
        db.bookings[existingOrderIndex].paymentStatus = 'Pending';
        db.bookings[existingOrderIndex].status = 'Pending';
        writeDB(db);
      }

      return res.json({
        success: true,
        id: paymentId,
        paymentId: paymentId,
        secret: secret,
        clientSecret: secret,
        customerToken: customerToken,
        checkoutUrl: checkoutUrl,
        orderId: String(orderId),
        publicKey: publicKey || resData.publicKey || ''
      });

    } catch (error: any) {
      console.error('[ArtoPay Payment Intent Exception]:', error);
      return res.status(500).json({
        error: 'Terjadi kesalahan sistem saat menghubungi ArtoPay Payment Gateway.',
        details: error.message
      });
    }
  });

  // Official ArtoPay Webhook / Callback Handler Endpoint
  app.post(['/api/artopay/webhook', '/artopay/webhook'], (req, res) => {
    try {
      const body = req.body || {};
      console.log('[ArtoPay Webhook Callback Received]:', JSON.stringify(body));

      const orderId = body.orderId || body.order_id || body.orderID || body.metadata?.orderId;
      const paymentId = body.id || body.paymentId || body.payment_id || body.transaction_id;
      const rawStatus = String(body.status || body.transaction_status || body.payment_status || '').toUpperCase();

      if (!orderId && !paymentId) {
        return res.status(400).json({ error: 'Missing orderId or paymentId in webhook payload' });
      }

      const db = readDB();
      if (!db.bookings) db.bookings = [];

      const index = db.bookings.findIndex(b =>
        (orderId && (b.bookingCode === orderId || b.id === orderId)) ||
        (paymentId && b.paymentIntentId === paymentId)
      );

      if (index === -1) {
        console.warn(`[ArtoPay Webhook] Order ${orderId || paymentId} not found in database.`);
        return res.status(200).json({ success: true, message: 'Webhook received but order not in DB.' });
      }

      const booking = db.bookings[index];

      // IDEMPOTENCY CHECK: If already confirmed and paid, do not re-process!
      if (booking.paymentStatus === 'Paid' && booking.status === 'Confirmed') {
        console.log(`[ArtoPay Webhook IDEMPOTENT] Order ${orderId} is already Paid & Confirmed.`);
        return res.status(200).json({
          success: true,
          message: 'Order status is already Paid (Idempotent call).'
        });
      }

      const successStatuses = ['SUCCESS', 'PAID', 'SETTLEMENT', 'COMPLETED', '00', 'SUCCESSFUL', 'APPROVED'];
      const failureStatuses = ['FAILED', 'CANCELLED', 'DENIED', 'EXPIRED', 'EXPIRE', 'REJECTED'];

      if (successStatuses.includes(rawStatus)) {
        booking.paymentStatus = 'Paid';
        booking.status = 'Confirmed';
        booking.paidAt = new Date().toISOString();
        booking.paymentId = paymentId || booking.paymentIntentId;
        console.log(`[ArtoPay Webhook SUCCESS] Order ${orderId} status set to PAID & CONFIRMED.`);
      } else if (failureStatuses.includes(rawStatus)) {
        booking.paymentStatus = (rawStatus === 'EXPIRED' || rawStatus === 'EXPIRE') ? 'Expired' : 'Failed';
        booking.status = 'Rejected';
        console.log(`[ArtoPay Webhook FAILURE] Order ${orderId} status set to ${booking.paymentStatus}.`);

        // Restore batch seats if applicable
        if (booking.batchId) {
          const bIdx = db.batches.findIndex(b => b.id === booking.batchId);
          if (bIdx !== -1) {
            db.batches[bIdx].availableSeats += (booking.participantsCount || 1);
            if (db.batches[bIdx].availableSeats > 0) {
              db.batches[bIdx].status = 'Open';
            }
          }
        }
      } else {
        booking.paymentStatus = 'Pending';
        booking.status = 'Pending';
      }

      db.bookings[index] = booking;
      writeDB(db);

      return res.status(200).json({
        success: true,
        orderId: booking.bookingCode || booking.id,
        paymentStatus: booking.paymentStatus,
        orderStatus: booking.status
      });

    } catch (error: any) {
      console.error('[ArtoPay Webhook Error]:', error);
      return res.status(500).json({ error: 'Webhook processing error', details: error.message });
    }
  });

  // Server-verified Payment Status Query Endpoint (Polling & Verification)
  app.get(['/api/orders/:orderId/payment-status', '/api/artopay/status/:orderId'], async (req, res) => {
    try {
      const { orderId } = req.params;
      const db = readDB();
      if (!db.bookings) db.bookings = [];

      const booking = db.bookings.find(b => b.bookingCode === orderId || b.id === orderId || b.paymentIntentId === orderId);

      if (!booking) {
        return res.status(404).json({
          found: false,
          paymentStatus: 'Pending',
          orderStatus: 'Pending',
          message: 'Order ID tidak ditemukan.'
        });
      }

      // Out-of-band active status check against ArtoPay API if still pending
      if (booking.paymentStatus === 'Pending' && booking.paymentIntentId) {
        const rawSecretKey = process.env.ARTOPAY_SECRET_KEY || '';
        const secretKey = rawSecretKey.replace(/^["']|["']$/g, '').trim();

        if (secretKey) {
          const envMode = process.env.ARTOPAY_ENV || (process.env.ARTOPAY_SANDBOX === 'false' ? 'production' : 'sandbox');
          const baseUrl = process.env.ARTOPAY_API_BASE_URL || (envMode === 'production' ? 'https://api.artopay.online' : 'https://api-sandbox.arto-pay.com');
          const checkUrl = `${baseUrl.replace(/\/+$/, '')}/v1.1/payment-intents/${booking.paymentIntentId}`;

          try {
            const verifyRes = await fetch(checkUrl, {
              headers: {
                'X-Secret-Key': secretKey
              }
            });

            if (verifyRes.ok) {
              const statusData: any = await verifyRes.json();
              const resData = statusData.responseData || statusData;
              const remoteStatus = String(resData.status || resData.transaction_status || '').toUpperCase();

              if (['SUCCESS', 'PAID', 'SETTLEMENT', 'COMPLETED', '00'].includes(remoteStatus)) {
                booking.paymentStatus = 'Paid';
                booking.status = 'Confirmed';
                booking.paidAt = new Date().toISOString();
                writeDB(db);
              } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(remoteStatus)) {
                booking.paymentStatus = remoteStatus === 'EXPIRED' ? 'Expired' : 'Failed';
                booking.status = 'Rejected';
                writeDB(db);
              }
            }
          } catch (vErr) {
            console.warn('[Server Status Check Warning]:', vErr);
          }
        }
      }

      return res.json({
        found: true,
        orderId: booking.bookingCode || booking.id,
        paymentStatus: booking.paymentStatus || 'Pending',
        orderStatus: booking.status || 'Pending',
        paidAt: booking.paidAt || null,
        booking
      });

    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to retrieve payment status', details: error.message });
    }
  });

  // -------------------------------------------------------------
  // Frontend Asset Handling (Vite / Static production)
  // -------------------------------------------------------------

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    // Development Mode: Use Vite Dev Server Middleware
    console.log('Running in Development mode. Mounting Vite Dev Server Middleware...');
    createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    }).then(vite => {
      app.use(vite.middlewares);
    }).catch(err => {
      console.error('Failed to create Vite server middleware:', err);
    });
  } else {
    // Production Mode: Serve Compiled Frontend Assets from /dist
    console.log('Running in Production mode. Serving static assets from /dist...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[SmartJourney Fullstack Engine] Server listening on http://0.0.0.0:${PORT}`);
    });
  }

export default app;
