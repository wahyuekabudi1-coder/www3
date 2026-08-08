import React, { useEffect } from 'react';
import { useApp } from '../AppContext';

interface PageMetadata {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  schemaType: string;
  schemaData: object;
}

const pageSEOData: Record<string, PageMetadata> = {
  home: {
    title: 'Smart Journey | Paket Tour Bromo Ijen, Sewa Mobil & Transfer Bandara',
    description: 'Smart Journey menyediakan paket tour wisata Bromo Ijen Blue Fire, sewa mobil Innova HiAce, taksi antar kota, dan transfer bandara Juanda/Ngurah Rai terpercaya di Indonesia.',
    keywords: 'paket tour bromo, tour ijen blue fire, sewa mobil surabaya, rental hiace malang, transfer bandara juanda, smart journey, private tour bali',
    canonical: 'https://smartjourney.co.id/',
    schemaType: 'TravelAgency',
    schemaData: {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      'name': 'Smart Journey Indonesia',
      'image': 'https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?auto=format&fit=crop&w=1200&q=80',
      'url': 'https://smartjourney.co.id',
      'telephone': '+6281234567890',
      'priceRange': 'IDR 350.000 - IDR 5.000.000',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': 'Jl. Raya Bromo No. 88',
        'addressLocality': 'Malang',
        'addressRegion': 'Jawa Timur',
        'postalCode': '65111',
        'addressCountry': 'ID'
      },
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': -7.983908,
        'longitude': 112.621391
      },
      'openingHoursSpecification': {
        '@type': 'OpeningHoursSpecification',
        'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        'opens': '00:00',
        'closes': '23:59'
      },
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': '4.9',
        'reviewCount': '1280'
      }
    }
  },
  tours: {
    title: 'Paket Tour Wisata Bromo, Ijen, Malang & Bali | Smart Journey',
    description: 'Pesan paket tour wisata Bromo 4x4 Jeep sunrise, kawah Ijen blue fire, Malang Batu highland, dan keindahan pulau Bali dengan jaminan harga terbaik dan tour guide profesional.',
    keywords: 'paket tour bromo sunrise, kawah ijen midnight tour, paket wisata malang batu, tour bali private, booking tour indonesia',
    canonical: 'https://smartjourney.co.id/#/tours',
    schemaType: 'OfferCatalog',
    schemaData: {
      '@context': 'https://schema.org',
      '@type': 'OfferCatalog',
      'name': 'Katalog Paket Wisata Smart Journey',
      'itemListElement': [
        {
          '@type': 'Offer',
          'itemOffered': {
            '@type': 'TouristTrip',
            'name': 'Bromo Sunrise & Mt. Ijen Blue Fire 3D2N',
            'description': 'Tur eksplorasi kawah Bromo dengan Jeep 4x4 dan penjelajahan fenomena api biru Kawah Ijen.'
          }
        },
        {
          '@type': 'Offer',
          'itemOffered': {
            '@type': 'TouristTrip',
            'name': 'Malang Highland & Air Terjun Tumpak Sewu 2D1N',
            'description': 'Petualangan menyusuri Niagara-nya Indonesia di Tumpak Sewu dan udara sejuk pegunungan Malang.'
          }
        }
      ]
    }
  },
  'share-tour': {
    title: 'Open Trip & Share Tour Bromo Ijen Hemat | Smart Journey',
    description: 'Gabung open trip dan share tour hemat ke Bromo, Ijen, dan Bali. Kuota terbatas, fasilitas lengkap, driver ramah, dan pengalaman berkesan bersama traveler lainnya.',
    keywords: 'open trip bromo, share tour ijen, open trip murah bromo, backpacker bromo ijen, konsorsium tour jawa timur',
    canonical: 'https://smartjourney.co.id/#/share-tour',
    schemaType: 'Event',
    schemaData: {
      '@context': 'https://schema.org',
      '@type': 'Event',
      'name': 'Open Trip Bromo Ijen Share Tour',
      'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
      'eventStatus': 'https://schema.org/EventScheduled',
      'location': {
        '@type': 'Place',
        'name': 'Taman Nasional Bromo Tengger Semeru',
        'address': 'Jawa Timur, Indonesia'
      },
      'organizer': {
        '@type': 'Organization',
        'name': 'Smart Journey Travel',
        'url': 'https://smartjourney.co.id'
      }
    }
  },
  airport: {
    title: 'Transfer Bandara Juanda, Ngurah Rai & Abdulrachman Saleh | Smart Journey',
    description: 'Layanan antar jemput bandara privat 24 jam dengan armadan kendaraan bersih, driver tepat waktu, dan harga transparan di Surabaya, Malang, Banyuwangi, dan Bali.',
    keywords: 'transfer bandara juanda, antar jemput airport ngurah rai, taksi bandara surabaya, airport transfer malang, penjemputan bandara privat',
    canonical: 'https://smartjourney.co.id/#/airport',
    schemaType: 'TaxiService',
    schemaData: {
      '@context': 'https://schema.org',
      '@type': 'TaxiService',
      'name': 'Smart Journey Airport Transfer',
      'provider': {
        '@type': 'LocalBusiness',
        'name': 'Smart Journey Transport'
      },
      'areaServed': ['Surabaya', 'Malang', 'Banyuwangi', 'Denpasar', 'Bali']
    }
  },
  taxi: {
    title: 'Taksi Antar Kota & Private Drop Off 24 Jam | Smart Journey',
    description: 'Layanan taksi privat antar kota di Jawa & Bali. Mobil nyaman (Innova, Avanza, HiAce) dengan pengemudi berpengalaman, tarif pasti, dan layanan door-to-door.',
    keywords: 'taksi antar kota surabaya malang, private drop off bali, sewa mobil lepas kunci, taksi travel jawa bali, car charter indonesia',
    canonical: 'https://smartjourney.co.id/#/taxi',
    schemaType: 'Service',
    schemaData: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'serviceType': 'Private Taxi & Intercity Car Transfer',
      'provider': {
        '@type': 'LocalBusiness',
        'name': 'Smart Journey Indonesia'
      }
    }
  },
  'car-rental': {
    title: 'Sewa Mobil & Rental Innova Zenix HiAce Alphard | Smart Journey',
    description: 'Sewa mobil mewah dan standar untuk wisata, perjalanan bisnis, dan rombongan keluarga. Pilihan unit Toyota Avanza, Innova Reborn, Zenix, HiAce Commuter, Premio, Alphard.',
    keywords: 'sewa mobil surabaya, rental hiace premio malang, rental innova zenix bali, sewa alphard pernikahan, rental mobil dengan supir',
    canonical: 'https://smartjourney.co.id/#/car-rental',
    schemaType: 'AutoRental',
    schemaData: {
      '@context': 'https://schema.org',
      '@type': 'AutoRental',
      'name': 'Smart Journey Premium Car Rental',
      'priceRange': 'IDR 500.000 - IDR 3.500.000',
      'currenciesAccepted': 'IDR, USD',
      'paymentAccepted': 'ArtoPay, Credit Card, Bank Transfer, QRIS'
    }
  },
  about: {
    title: 'Tentang Kami | Smart Journey Travel & Transportasi Indonesia',
    description: 'Mengenal Smart Journey, agen perjalanan dan transportasi resmi terpercaya yang mengedepankan keamanan, kenyamanan, serta kemudahan pembayaran online ArtoPay.',
    keywords: 'tentang smart journey, profil travel smart journey, agen wisata terpercaya jawa timur, legalitas travel indonesia',
    canonical: 'https://smartjourney.co.id/#/about',
    schemaType: 'Organization',
    schemaData: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'Smart Journey',
      'url': 'https://smartjourney.co.id',
      'logo': 'https://smartjourney.co.id/logo.png',
      'sameAs': [
        'https://facebook.com/smartjourney',
        'https://instagram.com/smartjourney',
        'https://tiktok.com/@smartjourney'
      ]
    }
  },
  partnerships: {
    title: 'Kemitraan Driver & Agen Travel | Smart Journey Indonesia',
    description: 'Bergabunglah menjadi mitra pengemudi atau agen perjalanan terverifikasi Smart Journey. Dapatkan komisi transparan, jaringan penumpang luas, dan sistem manajemen canggih.',
    keywords: 'kemitraan travel, gabung driver travel, mitra rental mobil, peluang usaha agen tur, smart journey partner',
    canonical: 'https://smartjourney.co.id/#/partnerships',
    schemaType: 'Service',
    schemaData: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'name': 'Smart Journey Partner Program',
      'provider': {
        '@type': 'Organization',
        'name': 'Smart Journey'
      }
    }
  },
  bookings: {
    title: 'Cek Status Booking & Tiket E-Voucher | Smart Journey',
    description: 'Lacak status reservasi tur, transfer bandara, dan rental mobil Anda. Pembayaran instan via ArtoPay Gateway dan unduh voucher resmi ber-QR Code.',
    keywords: 'cek booking smart journey, lacak tiket travel, e-voucher tur bromo, invoice artopay, status pembayaran travel',
    canonical: 'https://smartjourney.co.id/#/bookings',
    schemaType: 'WebPage',
    schemaData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Booking Status & Verification Console'
    }
  }
};

export const SEOHead: React.FC = () => {
  const { activePage } = useApp();

  useEffect(() => {
    const metaConfig = pageSEOData[activePage] || pageSEOData.home;

    // 1. Update Document Title
    document.title = metaConfig.title;

    // 2. Helper to set or create meta tag
    const setMetaTag = (selector: string, attrName: string, attrValue: string, content: string) => {
      let element = document.head.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Helper to set link tag
    const setLinkTag = (rel: string, href: string) => {
      let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    // Standard Meta Tags
    setMetaTag('meta[name="description"]', 'name', 'description', metaConfig.description);
    setMetaTag('meta[name="keywords"]', 'name', 'keywords', metaConfig.keywords);
    setMetaTag('meta[name="robots"]', 'name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMetaTag('meta[name="author"]', 'name', 'author', 'Smart Journey Indonesia');
    setMetaTag('meta[name="theme-color"]', 'name', 'theme-color', '#315B4F');

    // Geo Location Tags
    setMetaTag('meta[name="geo.region"]', 'name', 'geo.region', 'ID-JI');
    setMetaTag('meta[name="geo.placename"]', 'name', 'geo.placename', 'Malang');

    // Open Graph Tags
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', metaConfig.title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', metaConfig.description);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', 'website');
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', metaConfig.canonical);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', 'Smart Journey');
    setMetaTag('meta[property="og:locale"]', 'property', 'og:locale', 'id_ID');
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', 'https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?auto=format&fit=crop&w=1200&q=80');

    // Twitter Tags
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', metaConfig.title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', metaConfig.description);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', 'https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?auto=format&fit=crop&w=1200&q=80');

    // Canonical URL
    setLinkTag('canonical', metaConfig.canonical);

    // JSON-LD Structured Data Injection
    let schemaScript = document.head.querySelector('#json-ld-seo-schema') as HTMLScriptElement;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'json-ld-seo-schema';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(metaConfig.schemaData);

  }, [activePage]);

  return null;
};
export default SEOHead;
