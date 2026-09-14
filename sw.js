// Service worker du Convertisseur agricole.
//
// Objectif double :
//   1. l'app démarre et fonctionne sans réseau (cabine de tracteur, champ) ;
//   2. une nouvelle version publiée sur le site est récupérée sans passer
//      par le Play Store.
//
// Stratégie : « cache d'abord » pour tout ce qui est précaché, avec une
// vérification en arrière-plan. Quand un nouveau service worker est installé,
// il attend : la page affiche un bandeau et l'utilisateur décide du moment.
// Rien ne change sous ses doigts pendant qu'il calcule un mélange.
//
// VERSION est réécrite par build.sh à chaque compilation.
const VERSION = "2026.09.14";
const CACHE = `convertisseur-${VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.webmanifest",
  "./icone-192.png",
  "./icone-512.png",
  "./icone-512-maskable.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// La page demande d'installer la version en attente
self.addEventListener("message", (e) => {
  if (e.data === "appliquer-maj") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Play Billing, etc.

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const reseau = fetch(req)
        .then((rep) => {
          if (rep && rep.ok) {
            const copie = rep.clone();
            caches.open(CACHE).then((c) => c.put(req, copie));
          }
          return rep;
        })
        .catch(() => cached);           // hors ligne : on garde la copie
      return cached || reseau;
    })
  );
});
