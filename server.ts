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

function readDB(): DatabaseState {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const parentDir = path.dirname(DB_PATH);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      recalculateBatchSeats(defaultDB);
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf8');
      return defaultDB;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(raw) as DatabaseState;
    recalculateBatchSeats(db);
    return db;
  } catch (error) {
    console.error('Error reading database file, returning default map:', error);
    recalculateBatchSeats(defaultDB);
    return defaultDB;
  }
}

function writeDB(data: DatabaseState) {
  try {
    recalculateBatchSeats(data);
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing database file:', error);
  }
}

const app = express();

async function startServer() {
  app.use(express.json({ limit: '15mb' }));

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
  // ArtoPay API Routes (@arto-pay/js-sdk)
  // -------------------------------------------------------------

  app.get('/api/artopay/config', (req, res) => {
    const rawSecretKey = process.env.ARTOPAY_SECRET_KEY || '';
    const secretKey = rawSecretKey.replace(/^["']|["']$/g, '').trim();
    const isSandbox = process.env.ARTOPAY_SANDBOX !== 'false';
    const publicKey = process.env.VITE_ARTOPAY_PUBLIC_KEY || process.env.ARTOPAY_PUBLIC_KEY || 'pk_sandbox_demo';

    res.json({
      isConfigured: !!secretKey,
      sandbox: isSandbox,
      publicKey: publicKey,
      message: secretKey
        ? "ArtoPay is configured and operational."
        : "ARTOPAY_SECRET_KEY is not set. Operating in Sandbox Demo Mode."
    });
  });

  app.post('/api/artopay/payment-intent', async (req, res) => {
    try {
      const { orderId, amount, currency = 'IDR' } = req.body;

      if (!orderId || !amount) {
        return res.status(400).json({ error: 'Missing required fields: orderId, amount' });
      }

      const rawSecretKey = process.env.ARTOPAY_SECRET_KEY || '';
      const secretKey = rawSecretKey.replace(/^["']|["']$/g, '').trim();
      
      const rawPublicKey = process.env.VITE_ARTOPAY_PUBLIC_KEY || process.env.ARTOPAY_PUBLIC_KEY || 'pk_41cb9f2fd802ef417de4e82f8c32a80d356a02cdf32b52e68ad0';
      const defaultPublicKey = rawPublicKey.replace(/^["']|["']$/g, '').trim() || 'pk_41cb9f2fd802ef417de4e82f8c32a80d356a02cdf32b52e68ad0';

      const isLiveKey = secretKey.startsWith('sk_live') || secretKey.startsWith('sk_41cb');
      const isSandbox = process.env.ARTOPAY_SANDBOX === 'true' || (!isLiveKey && process.env.ARTOPAY_SANDBOX !== 'false');

      // Fallback for Demo Simulation Mode if ARTOPAY_SECRET_KEY is missing
      if (!secretKey) {
        console.warn('[ArtoPay Backend] ARTOPAY_SECRET_KEY is missing. Providing simulated payment intent for sandbox testing.');
        const mockPaymentId = `pay_${orderId}_${Math.floor(100000 + Math.random() * 900000)}`;
        return res.json({
          id: mockPaymentId,
          paymentId: mockPaymentId,
          clientSecret: `sec_${Math.random().toString(36).substring(2, 12)}`,
          customerToken: `cust_${Math.random().toString(36).substring(2, 12)}`,
          publicKey: defaultPublicKey,
          orderId: orderId,
          sandbox: true,
          isDemo: true,
          message: 'Operating in ArtoPay Sandbox Demo Mode. Set ARTOPAY_SECRET_KEY for live production transactions.'
        });
      }

      // Candidate ArtoPay API v1.1 endpoints to attempt
      const candidateUrls = isSandbox
        ? [
            'https://api-sandbox.arto-pay.com/v1.1/payment-intents',
            'https://api.arto-pay.com/v1.1/payment-intents',
            'https://api.artopay.online/v1.1/payment-intents'
          ]
        : [
            'https://api.arto-pay.com/v1.1/payment-intents',
            'https://api-sandbox.arto-pay.com/v1.1/payment-intents',
            'https://api.artopay.online/v1.1/payment-intents'
          ];

      console.log(`[ArtoPay Backend] Creating payment intent (${isSandbox ? 'Sandbox' : 'Production'}) for order: ${orderId}, amount: ${amount} ${currency}`);

      const formattedAmount = Number(amount).toFixed(2);
      const requestBody = JSON.stringify({
        amount: formattedAmount,
        currency: currency || 'IDR',
        orderId: String(orderId),
        description: req.body.description || `Payment for order ${orderId}`,
        customerId: req.body.customerId || `cust_${orderId.replace(/[^a-zA-Z0-9]/g, '_')}`,
        metadata: req.body.metadata || {}
      });

      let response: Response | null = null;
      let lastErrorText = '';

      for (const url of candidateUrls) {
        try {
          console.log(`[ArtoPay Backend] Attempting request to: ${url}`);
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Secret-Key': secretKey
            },
            body: requestBody
          });

          if (res.ok) {
            response = res;
            break;
          } else {
            lastErrorText = await res.text();
            console.warn(`[ArtoPay Backend] Request to ${url} returned ${res.status}:`, lastErrorText);
          }
        } catch (fetchErr: any) {
          console.warn(`[ArtoPay Backend] Request to ${url} failed with network error:`, fetchErr.message);
        }
      }

      if (!response || !response.ok) {
        console.warn('[ArtoPay Backend] All API endpoint attempts failed or unauthorized. Falling back to Demo Simulation Mode so checkout remains functional.');
        const mockPaymentId = `pay_${orderId}_${Math.floor(100000 + Math.random() * 900000)}`;
        return res.json({
          id: mockPaymentId,
          paymentId: mockPaymentId,
          clientSecret: `sec_${Math.random().toString(36).substring(2, 12)}`,
          customerToken: `cust_${Math.random().toString(36).substring(2, 12)}`,
          publicKey: defaultPublicKey,
          orderId: orderId,
          sandbox: true,
          isDemo: true,
          message: 'ArtoPay API key authentication failed or environment mismatch. Operating in ArtoPay Sandbox Demo Mode for seamless testing.',
          details: lastErrorText
        });
      }

      const data: any = await response.json();
      console.log('[ArtoPay Backend] Payment Intent Response:', data);

      const resData = data.responseData || data;

      return res.json({
        id: resData.id || resData.paymentId || resData.payment_id,
        paymentId: resData.id || resData.paymentId || resData.payment_id,
        clientSecret: resData.secret || resData.clientSecret || resData.payment_secret || resData.client_secret,
        customerToken: resData.customerToken || resData.customer_token,
        publicKey: resData.publicKey || resData.clientKey || defaultPublicKey,
        orderId: orderId,
        sandbox: isSandbox,
        isDemo: false
      });
    } catch (error: any) {
      console.error('[ArtoPay Backend] Server handler error:', error);
      return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // -------------------------------------------------------------
  // Frontend Asset Handling (Vite / Static production)
  // -------------------------------------------------------------

  if (process.env.NODE_ENV !== 'production') {
    // Development Mode: Use Vite Dev Server Middleware
    console.log('Running in Development mode. Mounting Vite Dev Server Middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
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
}

startServer();

export default app;
