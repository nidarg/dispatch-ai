# Dispatch AI — explicație tehnică detaliată pe cod

## Scopul documentului

Acest document explică foarte detaliat cum funcționează aplicația **Dispatch AI** la nivel de cod.

Obiectivul este ca un developer nou care intră în proiect să poată înțelege:

- flow-ul complet al aplicației;
- relația dintre fișiere, componente și layere;
- rolul fiecărei pagini;
- rolul fiecărui helper;
- ce responsabilitate are fiecare modul;
- cum circulă datele de la UI la backend și înapoi;
- cum funcționează auth-ul și tenant isolation.

---

# 1. Cum este împărțită aplicația

Aplicația este organizată în câteva zone logice:

## 1.1. `app/`
Conține:

- pagini Next.js;
- route handlers;
- layout-uri;
- punctele de intrare HTTP / UI.

Aici sunt rutele efective pe care utilizatorul sau browserul le accesează.

Exemple:
- `/`
- `/login`
- `/widget/[companySlug]`
- `/dashboard/intakes`
- `/dashboard/[companySlug]/intakes`
- `/api/emergency-intake`
- `/auth/callback`

---

## 1.2. `components/`
Conține componente UI reutilizabile.

Aceste fișiere nu sunt rute. Ele sunt folosite de pagini sau de alte componente.

Exemple:
- `EmergencyIntakeWidget`
- `DashboardUserBar`
- `IntakeList`
- `IntakeCard`
- `LogoutButton`

---

## 1.3. `lib/`
Conține logica reutilizabilă de business și infrastructură.

Aici intră:
- auth helpers;
- query helpers;
- prompt builders;
- service layer;
- repository layer;
- config multi-tenant;
- clienți OpenAI / Supabase.

Aceasta este zona care separă aplicația de detaliile brute ale framework-ului.

---

## 1.4. `middleware.ts`
Conține logica globală care rulează pe request-uri înainte ca pagina sau route-ul să fie procesat.

În cazul tău, middleware-ul este responsabil pentru menținerea sesiunii Supabase.

---

# 2. Flow-ul complet al aplicației

Înainte să intrăm pe fișiere, este important să înțelegem flow-ul mare.

---

## 2.1. Flow widget → API → AI → DB → WhatsApp

### Pasul 1
Utilizatorul intră pe o pagină de widget, de exemplu:

- `/widget/pedrotti`
- `/widget/hotel-lago`

### Pasul 2
Pagina citește slug-ul tenantului din URL și caută configurația asociată.

### Pasul 3
Configul este trimis în `EmergencyIntakeWidget`.

### Pasul 4
Widgetul decide ce formular să afișeze în funcție de:
- `useCase = roadside`
sau
- `useCase = hotel`

### Pasul 5
Utilizatorul completează formularul și apasă submit.

### Pasul 6
Componenta face `fetch("/api/emergency-intake")` și trimite payload-ul.

### Pasul 7
API route-ul:
- citește body-ul;
- validează payload-ul;
- extrage `companySlug`;
- trimite payload-ul curat către service-ul AI.

### Pasul 8
Service-ul AI:
- construiește prompt-ul corect;
- apelează OpenAI;
- parsează răspunsul;
- normalizează limba detectată;
- normalizează prioritatea.

### Pasul 9
Repository-ul salvează rezultatul în tabela `emergency_intakes`.

### Pasul 10
API-ul întoarce JSON-ul înapoi la widget.

### Pasul 11
Widgetul:
- decide dacă trebuie geolocation;
- construiește mesajul final;
- deschide WhatsApp.

---

## 2.2. Flow login → callback → sesiune → redirect tenant

### Pasul 1
Userul intră pe `/login`.

### Pasul 2
Introduce email-ul.

### Pasul 3
Componenta de login apelează `supabase.auth.signInWithOtp`.

### Pasul 4
Supabase trimite magic link-ul pe email.

### Pasul 5
Userul apasă linkul și revine în aplicație la:
- `/auth/callback?code=...`

### Pasul 6
Callback route-ul schimbă codul într-o sesiune reală.

### Pasul 7
Se citește userul autentificat.

### Pasul 8
Se caută membership-ul userului în tabela `tenant_memberships`.

### Pasul 9
Dacă există membership:
- redirect către tenant dashboard.

### Pasul 10
Dacă nu există membership:
- redirect către `/unauthorized`.

---

## 2.3. Flow dashboard tenant

### Pasul 1
Userul accesează:
- `/dashboard/pedrotti/intakes`

### Pasul 2
Pagina extrage slug-ul din URL.

### Pasul 3
Apelează `requireTenantAccess(companySlug)`.

### Pasul 4
Helper-ul verifică:
- dacă există user logat;
- dacă userul aparține tenantului respectiv.

### Pasul 5
Dacă verificarea trece:
- pagina citește datele din DB;
- afișează user bar + listă intake-uri.

### Pasul 6
Dacă verificarea nu trece:
- redirect la `/login`
sau
- redirect la `/unauthorized`.

---

# 3. Explicație detaliată pe fișiere

---

# 4. `middleware.ts`

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
Ce rol are acest fișier

Acest fișier rulează înaintea request-urilor potrivite de matcher.

Scopul lui nu este să facă access control, ci să se asigure că sesiunea Supabase este citită și, dacă este necesar, reîmprospătată.

În aplicațiile Next.js + Supabase SSR, sesiunea nu înseamnă doar că există niște cookie-uri, ci și că acele cookie-uri trebuie menținute corect între request-uri. Middleware-ul este locul potrivit pentru acest refresh.

Explicație linie cu linie
import { NextResponse } from "next/server";

Importă utilitarul prin care construiești răspunsuri în middleware.

import type { NextRequest } from "next/server";

Importă tipul requestului din middleware.

import { createServerClient } from "@supabase/ssr";

Importă constructorul Supabase pentru SSR, adică pentru contexte server-side care au nevoie de integrare cu cookies.

export async function middleware(req: NextRequest)

Aceasta este funcția pe care Next.js o execută pentru request-urile care se potrivesc cu matcher.

req reprezintă requestul curent:

URL
headers
cookies
etc.
const res = NextResponse.next();

Aici creezi răspunsul standard care spune practic:

„continuă normal către ruta cerută”.

Este important că răspunsul este creat înainte de clientul Supabase, deoarece Supabase va avea nevoie să scrie eventuale cookie-uri actualizate în res.

const supabase = createServerClient(...)

Aici construiești clientul Supabase care știe să lucreze în context de middleware.

Primește:

URL-ul proiectului Supabase;
cheia publică;
un adaptor pentru cookies.
De ce cheia publică?

Pentru auth/session flows în browser și SSR, cheia publică este cea potrivită. Nu este o operație admin.

Blocul cookies
cookies: {
  getAll() {
    return req.cookies.getAll();
  },
  setAll(cookiesToSet) {
    cookiesToSet.forEach(({ name, value, options }) =>
      res.cookies.set(name, value, options)
    );
  },
},

Acesta este punctul critic.

getAll()

Spune clientului Supabase cum să citească toate cookie-urile actuale din request.

Supabase are nevoie de ele pentru a ști:

dacă există sesiune;
dacă tokenul este expirat;
dacă trebuie refresh.
setAll(cookiesToSet)

Spune clientului Supabase cum să scrie înapoi cookie-urile noi sau actualizate în response.

Fără acest mecanism, sesiunea poate deveni instabilă.

await supabase.auth.getUser();

Acest apel este esențial.

Nu îl folosești aici ca să afișezi userul, ci pentru efectul său de a obliga Supabase să proceseze sesiunea curentă.

Prin acest apel:

Supabase citește tokenurile din cookies;
verifică dacă sesiunea este validă;
dacă e nevoie, reîmprospătează tokenurile;
scrie cookie-urile actualizate în response.
return res;

Returnezi răspunsul către Next.js, care continuă apoi spre pagina sau API route-ul final.

export const config = { matcher: ... }

Acest matcher spune pe ce rute rulează middleware-ul.

Ai exclus:

_next/static
_next/image
favicon.ico

Asta este corect, pentru că aceste resurse nu au nevoie de auth/session refresh.

Cum se leagă de restul aplicației

Acest fișier este fundația pentru toate paginile care citesc userul din sesiune:

dashboard/intakes/page.tsx
dashboard/[companySlug]/intakes/page.tsx
auth/callback/route.ts
orice helper care folosește createSupabaseServerClient()

Fără middleware, auth-ul poate părea că merge la început, dar poate deveni instabil în timp.

5. app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
Ce rol are

Este layout-ul rădăcină al aplicației. Toate paginile din app/ sunt randate în interiorul lui.

Explicație detaliată
import type { Metadata } from "next";

Permite definirea metadata pentru document.

import { Geist, Geist_Mono } from "next/font/google";

Importă fonturile care vor fi disponibile în aplicație.

import "./globals.css";

Aplică CSS-ul global peste toate paginile.

const geistSans = Geist(...)

Configurează fontul sans și îl expune prin CSS variable:

--font-geist-sans
const geistMono = Geist_Mono(...)

Configurează fontul monospace și îl expune prin:

--font-geist-mono
metadata

Definește metadata default ale aplicației.

Momentan valorile sunt încă cele generate inițial:

Create Next App
Generated by create next app

Acestea ar trebui în timp schimbate în ceva relevant pentru proiect.

RootLayout({ children })

children este conținutul paginii curente.

Orice pagină din aplicație este injectată aici.

<html lang="en" ...>

Setează:

limba documentului;
variabilele de font;
h-full
antialiased
<body className="min-h-full flex flex-col">

Face ca întreg body-ul să ocupe înălțimea completă și să fie organizat vertical.

Este util pentru layout-uri full-height și pagini de tip dashboard.

Legătura cu restul aplicației

Toate paginile depind de acest fișier pentru:

fonturi;
CSS global;
structura HTML de bază.
6. app/globals.css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
Ce rol are

Acest fișier definește stilurile globale ale aplicației.

Explicație bloc cu bloc
@import "tailwindcss";

Activează Tailwind CSS.

:root { ... }

Definește două variabile globale:

--background
--foreground

Acestea controlează culorile de bază ale aplicației.

@theme inline { ... }

Mapează unele variabile de temă:

culori
fonturi

Aceste variabile fac puntea între valorile din CSS și cele folosite de sistemul de stilizare.

@media (prefers-color-scheme: dark) { ... }

Schimbă valorile de background și foreground dacă utilizatorul are preferință de dark mode.

body { ... }

Aplică stilurile implicite pe întreg documentul:

background
culoarea textului
font-family

Observație:
deși ai configurat fonturile Geist în layout, aici body-ul folosește:

Arial, Helvetica, sans-serif

Asta înseamnă că în practică aplicația nu profită complet de fonturile Geist la nivel de text standard.

7. app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        ...
      </div>
    </main>
  );
}
Ce rol are

Aceasta este pagina /.

Nu este pagina publică pentru clienți, ci un Admin / Dev Control Panel.

De ce este important acest lucru

În proiectul tău există două concepte separate:

aplicația Dispatch AI;
site-ul public al clientului.

Această pagină aparține aplicației Dispatch AI și este folosită intern pentru:

navigare rapidă;
testare;
development;
debugging.
Structura internă a paginii

Pagina este împărțită în secțiuni:

1. Header

Arată:

numele produsului
titlul „Admin / Dev Control Panel”
scurtă descriere
2. Widget previews

Conține linkuri rapide către:

/widget/pedrotti
/widget/hotel-lago

Asta permite testarea widgetului fără embed extern.

3. Authentication

Conține linkuri către:

/login
/unauthorized

Util pentru testarea flow-ului de auth și a UX-ului asociat.

4. Dashboards

Conține linkuri către:

/dashboard/intakes
/dashboard/pedrotti/intakes
/dashboard/hotel-lago/intakes

Util pentru verificarea access control-ului și a listărilor din DB.

5. Debug / Testing

Explică ce flow-uri sunt vizate:

login flow
tenant isolation
widget → WhatsApp
database inserts
Legătura cu restul aplicației

Acest fișier nu conține logică de business. Este un hub de intrare către restul sistemului.

El trimite utilizatorul spre zonele unde logica reală se întâmplă.

8. app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        ...
      </div>
    </main>
  );
}
Ce rol are

Aceasta este o pagină placeholder pentru viitorul dashboard operațional.

Ce comunică

Mesajul paginii spune clar că aici va exista în viitor:

operator inbox;
conversații;
traduceri;
răspunsuri;
statusuri.

Asta înseamnă că pagina nu este încă nod funcțional principal, dar documentează direcția viitoare a produsului.

Cum se leagă de arhitectură

În prezent, dashboardurile funcționale sunt:

/dashboard/intakes
/dashboard/[companySlug]/intakes

Această pagină este mai degrabă o ancoră conceptuală pentru roadmap.

9. app/dashboard/intakes/page.tsx
import { redirect } from "next/navigation";
import IntakeList from "@/components/dashboard/IntakeList";
import DashboardUserBar from "@/components/dashboard/DashboardUserBar";
import { getLatestIntakes } from "@/lib/dashboard/intakes";
import { getCurrentUser } from "@/lib/auth/get-user";

export default async function DashboardIntakesPage() {
const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  try {
    const intakes = await getLatestIntakes(50);

    return (
      ...
    );
  } catch (error) {
    ...
  }
}
Ce rol are

Această pagină afișează ultimele intake-uri din toate tenanturile.

Este un dashboard global de admin/dev.

De ce este server component

Fișierul este async și:

citește sesiunea server-side;
citește date din DB server-side;
nu are nevoie de state React local sau efecte client-side.

Asta îl face potrivit pentru server component.

Explicație foarte detaliată
import { redirect } from "next/navigation";

Permite redirect server-side în timpul randării paginii.

import IntakeList ...

Componente UI pentru afișarea listei.

import { getLatestIntakes } ...

Importă query helper-ul care citește ultimele intake-uri din DB.

import { getCurrentUser } ...

Importă helper-ul care citește userul logat din sesiunea Supabase.

const user = await getCurrentUser();

Aici pagina verifică dacă există user logat.

Important:
această verificare nu se face în browser, ci pe server.

Asta înseamnă:

pagina poate bloca accesul înainte de a randă UI-ul;
nu există flicker de tip „vezi pagina o fracțiune de secundă și apoi ești redirectat”.
if (!user) redirect("/login");

Dacă nu există user, pagina nu continuă.

Aceasta este o protecție minimă de auth pentru dashboardul global.

Observație:
acest dashboard global verifică doar existența userului, nu și tenant membership.

Asta este coerent cu ideea că este un admin/dev dashboard global.

const intakes = await getLatestIntakes(50);

Aici pagina cere ultimele 50 de intake-uri.

Logica query-ului este separată în:

lib/dashboard/intakes

Asta este bine pentru că:

pagina nu are SQL / query logic în interior;
query layer-ul poate fi refolosit în alte locuri.
Renderul principal

În succes, pagina randază:

Titlu

Admin dashboard

Descriere

Latest intake requests from all tenants.

DashboardUserBar

Primește emailul userului logat.

În această pagină nu se trimite tenantLabel, ceea ce face componenta să afișeze „Platform admin view”.

IntakeList

Primește toate intakes.

Blocul catch

Dacă apare o eroare la query:

este logată în consolă;
pagina afișează un mesaj vizual de eroare.

Asta este util pentru debugging și UX decent.

Cum se leagă de alte fișiere

Această pagină depinde de:

lib/auth/get-user.ts
lib/dashboard/intakes
components/dashboard/DashboardUserBar.tsx
components/dashboard/IntakeList.tsx
10. app/dashboard/[companySlug]/intakes/page.tsx
import IntakeList from "@/components/dashboard/IntakeList";
import DashboardUserBar from "@/components/dashboard/DashboardUserBar";
import { getIntakesByCompany } from "@/lib/dashboard/intakes";
import { requireTenantAccess } from "@/lib/auth/require-tenant-access";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    companySlug: string;
  }>;
};

export default async function TenantIntakesPage({ params }: PageProps) {
  const { companySlug } = await params;

  if (!companySlug) {
    notFound();
  }

  const result = await requireTenantAccess(companySlug);

  try {
    const intakes = await getIntakesByCompany(companySlug, 50);

    return (
      ...
    );
  } catch (error) {
    ...
  }
}
Ce rol are

Această pagină este dashboardul real scoped pe un tenant.

Aici multi-tenancy devine efectivă.

De ce este o pagină critică

Ea combină trei lucruri foarte importante:

routing dinamic;
access control;
query filtrat pe tenant.
Explicație detaliată
type PageProps = { params: Promise<{ companySlug: string }> }

Tipul declarat arată că pagina așteaptă un companySlug din segmentul dinamic al rutei.

const { companySlug } = await params;

Extrage slug-ul tenantului din URL.

Exemplu:

/dashboard/pedrotti/intakes → companySlug = "pedrotti"
if (!companySlug) { notFound(); }

Este un guard defensiv.
Dacă din orice motiv slug-ul lipsește, pagina returnează 404.

const result = await requireTenantAccess(companySlug);

Aici se întâmplă partea esențială de autorizare.

Această funcție:

verifică dacă există user logat;
verifică dacă userul aparține tenantului cerut.

Deci nu este doar auth. Este auth + tenant authorization.

result întoarce:

user
membership
const intakes = await getIntakesByCompany(companySlug, 50);

După ce accesul este confirmat, pagina citește doar datele relevante tenantului curent.

Asta înseamnă că:

UI-ul este scoped;
datele sunt scoped;
accesul este scoped.

Acesta este modelul corect de tenant isolation.

Renderul principal

Pagina afișează:

titlu

{companySlug} dashboard

descriere

Latest intake requests for this tenant.

DashboardUserBar

Primește:

email user;
tenantLabel = membership.company_slug

Deci user bar-ul arată clar cine este logat și în ce tenant se află.

IntakeList

Primește lista de intake-uri filtrată deja pe tenant.

Blocul catch

Dacă apare eroare la query:

log în consolă;
UI de eroare vizibil.
Cum se leagă de restul aplicației

Depinde de:

lib/auth/require-tenant-access.ts
lib/dashboard/intakes
components/dashboard/DashboardUserBar.tsx
components/dashboard/IntakeList.tsx

11. app/login/page.tsx
"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setSuccess("");

    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (!error) {
      setSuccess("Check your email for the login link.");
    }

    setLoading(false);
  };

  return (
    ...
  );
}

Ce rol are

Aceasta este pagina de autentificare prin magic link.

De ce este client component

Fișierul începe cu:

"use client";

Asta este necesar deoarece:

folosește useState;
interacționează direct cu formularul;
folosește window.location.origin;
apelează Supabase din browser.
State-urile locale
email

Ține valoarea introdusă de user în input.

loading

Controlează starea butonului în timpul requestului.

success

Ține mesajul de feedback pozitiv după trimiterea magic link-ului.

handleLogin

Aceasta este funcția principală a paginii.

e.preventDefault();

Împiedică reload-ul implicit al formularului.

setLoading(true);

Butonul intră în stare de încărcare.

setSuccess("");

Resetează eventualul mesaj pozitiv anterior.

const supabase = createSupabaseBrowserClient();

Construiește clientul Supabase pentru browser.

Asta înseamnă că login-ul este inițiat din frontend, ceea ce este normal pentru magic link.

supabase.auth.signInWithOtp(...)

Aceasta este operația de trimitere a emailului.

Ce primește:
email
emailRedirectTo
emailRedirectTo

Spune Supabase unde să aducă userul după click pe link:

/auth/callback

Acesta este un punct critic al flow-ului.

if (!error) { setSuccess(...) }

Dacă requestul reușește:

UI-ul îi spune userului să verifice emailul.

Observație:
momentan nu există un branch explicit de eroare afișată în UI, doar succes.
Asta poate fi îmbunătățit mai târziu.

Renderul UI

Pagina afișează:

titlu „Sign in”
descriere
input email
buton submit
mesaj de succes, dacă există
Cum se leagă de restul aplicației

Se leagă direct de:

lib/supabase/browser.ts
app/auth/callback/route.ts

Este începutul flow-ului de auth.

12. app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { data } = await supabaseAdmin
    .from("tenant_memberships")
    .select("company_slug")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!data) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.redirect(
    new URL(`/dashboard/${data.company_slug}/intakes`, req.url)
  );
}
Ce rol are

Acesta este endpointul care finalizează autentificarea.

Este una dintre cele mai importante piese din tot flow-ul de auth.

Explicație completă
const requestUrl = new URL(req.url);

Construiește un obiect URL din requestul primit.

const code = requestUrl.searchParams.get("code");

Extrage codul trimis de Supabase în query string.

Acest cod vine din magic link.

if (!code) { redirect("/login") }

Dacă ruta este accesată fără cod valid:

nu se poate finaliza login-ul;
userul este trimis înapoi la login.
const supabase = await createSupabaseServerClient();

Construiește clientul Supabase pentru SSR, legat de cookies.

Aici nu vrei browser client, pentru că te afli într-un route handler server-side.

await supabase.auth.exchangeCodeForSession(code);

Această linie este esența callback-ului.

Ea face conversia:

din cod temporar
în
sesiune reală autenticată

După acest pas, Supabase setează cookie-urile necesare.

if (error) redirect("/login")

Dacă schimbul code → session eșuează, flow-ul nu poate continua.

const { user } = await supabase.auth.getUser();

După ce sesiunea există, citești userul logat.

Aceasta este dovada că login-ul chiar s-a materializat într-o identitate autenticată.

if (!user) redirect("/login")

Un guard suplimentar defensiv.

Query în tenant_memberships
const { data } = await supabaseAdmin
  .from("tenant_memberships")
  .select("company_slug")
  .eq("user_id", user.id)
  .limit(1)
  .maybeSingle();

Aici începe partea de autorizare.

Important:
magic link-ul nu spune nimic despre tenant.
Magic link-ul doar autentifică utilizatorul.

Tenantul este dedus intern din tabela tenant_memberships.

Asta este corect arhitectural, pentru că separă:

autentificarea
de
autorizarea per tenant
if (!data) redirect("/unauthorized")

Dacă userul este autenticat, dar nu este asociat niciunui tenant:

nu are acces;
merge la /unauthorized.
Redirect final
return NextResponse.redirect(
  new URL(`/dashboard/${data.company_slug}/intakes`, req.url)
);

Acesta este redirectul inteligent după login.

Userul nu ajunge generic într-un dashboard neutru, ci direct în dashboardul tenantului său.

Cum se leagă de restul aplicației

Acest fișier conectează:

login page
sesiunea Supabase
tabela tenant_memberships
dashboardul tenantului

Este podul dintre auth și multi-tenancy.

13. app/unauthorized/page.tsx
export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-zinc-900">
          Access denied
        </h1>

        <p className="mt-4 text-zinc-600">
          You do not have access to this dashboard.
        </p>

        <a
          href="/login"
          className="mt-6 inline-block rounded-2xl bg-zinc-900 px-6 py-3 text-white text-sm font-semibold"
        >
          Go to login
        </a>
      </div>
    </main>
  );
}
Ce rol are

Aceasta este o pagină UX pentru cazurile în care userul:

este autentificat sau ajunge într-un flow valid de auth;
dar nu are dreptul să acceseze tenantul sau dashboardul respectiv.
De ce este importantă

Este mai bună decât:

404
redirect arbitrar
blank page

Pentru că spune clar:

accesul există la nivel de aplicație;
dar nu există la nivel de resursă.
14. app/widget/page.tsx
import Link from "next/link";
import { widgetConfigs } from "@/lib/widget-config";

export default function WidgetIndexPage() {
  return (
    ...
  );
}
Ce rol are

Această pagină este un index intern al tuturor config-urilor de widget disponibile.

Ce face concret

Iterează prin:

widgetConfigs.map((config) => ...)

și pentru fiecare tenant generează un link către:

/widget/{slug}

Exemplu:

/widget/pedrotti
/widget/hotel-lago
De ce este utilă

Înainte de productizarea widgetului într-un embed script real, această pagină oferă:

preview rapid;
testare internă;
verificare vizuală pe fiecare tenant.
Cum se leagă de restul aplicației

Depinde de:

lib/widget-config.ts

și trimite utilizatorul mai departe la:

app/widget/[companySlug]/page.tsx
15. app/widget/[companySlug]/page.tsx
import EmergencyIntakeWidget from "@/components/widget/EmergencyIntakeWidget";
import { getWidgetConfigBySlug, widgetConfigs } from "@/lib/widget-config";
import { notFound } from "next/navigation";

type WidgetCompanyPageProps = {
  params: Promise<{
    companySlug: string;
  }>;
};

export async function generateStaticParams() {
  return widgetConfigs.map((config) => ({
    companySlug: config.slug,
  }));
}

export default async function WidgetCompanyPage({
  params,
}: WidgetCompanyPageProps) {
  const { companySlug } = await params;
  const config = getWidgetConfigBySlug(companySlug);

  if (!config) {
    notFound();
  }

  return (
    ...
  );
}
Ce rol are

Aceasta este pagina dinamică de widget pe tenant.

generateStaticParams()

Această funcție spune lui Next.js ce slug-uri cunoscute există.

În cazul tău, ele vin din:

widgetConfigs

Practic, pentru fiecare config:

se produce un companySlug
const { companySlug } = await params;

Extrage slug-ul din URL.

Acest slug este cheia după care selectezi tenantul.

const config = getWidgetConfigBySlug(companySlug);

Aici pagina traduce URL-ul în configurație operațională.

Acest pas este foarte important, pentru că el leagă:

routarea;
brandingul;
comportamentul widgetului;
numărul de WhatsApp;
use case-ul.
if (!config) { notFound(); }

Dacă slug-ul nu corespunde niciunui tenant cunoscut:

pagina întoarce 404.
Renderul

Pagina nu implementează formularul direct.
În schimb, trimite configul în:

<EmergencyIntakeWidget config={config} />

Asta este o separare bună:

pagina se ocupă de contextul route-ului;
componenta se ocupă de logica widgetului.


16. components/widget/EmergencyIntakeWidget.tsx

Acesta este cel mai important fișier din partea publică a produsului.

Ce rol are

Este componenta care:

afișează formularul;
adaptează formularul la tenant/useCase;
trimite datele către backend;
tratează răspunsul AI;
tratează geolocation;
deschide WhatsApp.

Este practic engine-ul widgetului.

Props
type EmergencyIntakeWidgetProps = {
  config: WidgetConfig;
  onClose?: () => void;
};
config

Este obiectul de configurare al tenantului curent.

Acest obiect decide:

ce companie este;
ce număr WhatsApp se folosește;
ce culoare de accent se folosește;
ce use case rulează;
dacă se folosește geolocation.
onClose

Permite reutilizarea componentei într-un modal în viitor.
Dacă există, componenta afișează buton de închidere.

Asta arată că widgetul este deja gândit într-o direcție productizabilă.

Tipul răspunsului AI
type IntakeResponse = {
  summary: string;
  detectedLanguage: string;
  priority: "low" | "normal" | "high";
  useCase: "roadside" | "hotel";
};

Acesta este contractul așteptat din API.

vehicleOptions
const vehicleOptions = [
  { value: "car", label: "Car", icon: Car },
  ...
] as const;

Aceasta este lista de opțiuni pentru use case-ul roadside.

Este definită static și folosită pentru a genera UI-ul de selecție a vehiculului.

Beneficiul:

UI-ul este declarativ;
dacă adaugi un nou tip de vehicul, modifici lista, nu markup-ul.
Extracția din config
const { slug, whatsappNumber, companyName, useCase, enableLocation } = config;
const accentColor = config.accentColor ?? "#dc2626";

Aceasta este prima operație importantă.

Widgetul devine tenant-aware prin simplul fapt că primește acest config.

Stiluri dinamice
const badgeStyle = {
  backgroundColor: `${accentColor}14`,
  color: accentColor,
};

Ai 4 stiluri dinamice:

badge
primary button
active option
active icon

Acestea fac branding per tenant fără a scrie componente separate.

State-urile
State comun
const [message, setMessage] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
State pentru roadside
const [vehicleType, setVehicleType] = useState("car");
const [canMove, setCanMove] = useState("no");
const [needsTowing, setNeedsTowing] = useState("yes");
const [needsHeavyRecovery, setNeedsHeavyRecovery] = useState("no");
State pentru hotel
const [roomNumber, setRoomNumber] = useState("");
const [issueType, setIssueType] = useState("maintenance");
const [urgency, setUrgency] = useState("normal");
De ce este bine organizat așa

Această componentă are două formulare în unul singur, dar ele sunt controlate prin:

useCase
state-uri separate pe workflow

Asta permite reutilizare puternică fără a multiplica fișierele.

handleSubmit

Aceasta este funcția centrală.

16.1. Validarea de bază
if (!message.trim()) {
  setError("Please describe the problem.");
  return;
}

Aici se blochează submitul dacă mesajul este gol.

Deși backendul validează și el, această verificare este bună pentru UX.

16.2. Intrarea în loading state
setLoading(true);
setError("");
activează spinner/text de loading;
resetează eroarea anterioară.
16.3. Detectarea device-ului mobil
const isMobile =
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

Această detectare este folosită doar pentru strategia de deschidere WhatsApp.

De ce?
Pentru că pe mobil deep link-ul whatsapp:// este preferabil.

16.4. Requestul către backend
const res = await fetch("/api/emergency-intake", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    companySlug: slug,
    message,
    useCase,
    vehicleType: useCase === "roadside" ? vehicleType : undefined,
    canMove: useCase === "roadside" ? canMove : undefined,
    needsTowing: useCase === "roadside" ? needsTowing : undefined,
    needsHeavyRecovery:
      useCase === "roadside" ? needsHeavyRecovery : undefined,
    roomNumber: useCase === "hotel" ? roomNumber : undefined,
    issueType: useCase === "hotel" ? issueType : undefined,
    urgency: useCase === "hotel" ? urgency : undefined,
  }),
});

Aici componenta construiește payload-ul.

Ce este foarte bine aici

Payload-ul este condițional în funcție de useCase.

Asta înseamnă:

pentru roadside nu trimiți câmpuri inutile de hotel;
pentru hotel nu trimiți câmpuri inutile de roadside.

Rezultatul este un request mai curat și mai coerent semantic.

16.5. Tratarea erorilor API
if (!res.ok) {
  const errorData = await res.json().catch(() => null);
  console.error("Emergency intake API error:", errorData);
  throw new Error(errorData?.error || "Request failed");
}

Dacă backendul răspunde cu status diferit de 2xx:

încerci să extragi eroarea;
o loghezi;
arunci o excepție.

Asta mută flow-ul în catch, unde eroarea este afișată în UI.

16.6. Parsarea răspunsului
const data: IntakeResponse = await res.json();

Acum componenta deține rezultatul AI.

openWhatsapp(finalMessage)

Aceasta este funcția care traduce mesajul final într-un link WhatsApp.

const encodedMessage = encodeURIComponent(finalMessage);
const waWebLink = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
const waAppLink = `whatsapp://send?phone=${whatsappNumber}&text=${encodedMessage}`;
encodedMessage

Asigură că textul este sigur pentru URL.

waWebLink

Fallback web standard.

waAppLink

Deep link pentru aplicația nativă WhatsApp.

Strategia mobil
if (isMobile) {
  window.location.href = waAppLink;

  setTimeout(() => {
    window.location.href = waWebLink;
  }, 1200);

  return;
}

Pe mobil:

încerci întâi aplicația;
dacă nu merge, după un scurt delay mergi pe web fallback.

Aceasta este o alegere pragmatică bazată pe comportament real al device-urilor mobile.

Strategia desktop
window.open(waWebLink, "_blank", "noreferrer");

Pe desktop deschizi wa.me în tab nou.

Decizia pe geolocation
Dacă enableLocation === false
if (!enableLocation) {
  openWhatsapp(data.summary);
  return;
}

Asta se aplică în special pentru hotel.

Dacă browserul nu suportă geolocation
if (!navigator.geolocation) {
  openWhatsapp(data.summary);
  return;
}

Flow-ul nu se blochează. Continuă fără GPS.

navigator.geolocation.getCurrentPosition(...)

Aceasta este ramura în care aplicația încearcă să obțină poziția reală.

Cazul de succes
(position) => {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const accuracy = position.coords.accuracy;

  const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

Extragi coordonatele și construiești un link Google Maps.

Decizia pe acuratețe
const locationText =
  accuracy <= 80
    ? `GPS location: ${mapsLink}`
    : `Approximate GPS location: ${mapsLink}
Estimated accuracy: ${Math.round(accuracy)} meters.
If possible, also share your location manually on WhatsApp.`;

Aici componenta face ceva foarte bine:
nu tratează orice poziție ca fiind „precise GPS”.

Dacă acuratețea este slabă, transmite explicit că poziția este aproximativă.

Construirea mesajului final
const finalMessage = `${data.summary}

${locationText}`;

Acesta este textul care ajunge în WhatsApp.

Cazul de eroare la geolocation
() => {
  openWhatsapp(
    `${data.summary}

Precise GPS location could not be detected. If possible, please share your location manually on WhatsApp.`
  );
}

Dacă geolocation eșuează:

nu blochezi flow-ul;
nu arăți error fatal;
continui totuși spre WhatsApp, dar cu un mesaj clar.

Asta este foarte bun pentru UX.

Valorile derivate pentru UI
badgeLabel

Determină eticheta de sus în funcție de use case.

title

Determină titlul widgetului.

description

Explică utilizatorului ce se va întâmpla după submit.

placeholder

Adaptează exemplul din textarea la contextul use case-ului.

Aceste valori fac componenta să se simtă diferit pentru tenanturi diferite, fără a schimba structura de bază.

Renderul formularului
Zona de header

Afișează:

badge-ul colorat cu accent;
titlul;
descrierea;
butonul de close, dacă onClose există.
Textarea message

Este câmpul principal și obligatoriu.

Este comun ambelor use case-uri.

Ramura useCase === "roadside"

Aici se afișează:

Vehicle type

Folosește vehicleOptions.map(...).

Fiecare opțiune este un buton.
Dacă opțiunea este activă:

primește activeOptionStyle
icon-ul primește activeIconStyle

Asta creează un UI clar de selecție vizuală.

Select-uri auxiliare
canMove
needsTowing
needsHeavyRecovery

Aceste câmpuri oferă context operațional clar AI-ului și ulterior operatorului.

Ramura useCase === "hotel"

Aici se afișează:

roomNumber
issueType
urgency

Aceasta este o configurație logică pentru hospitality workflow.

Submit button
<button
  type="submit"
  disabled={loading}
  style={primaryButtonStyle}
  ...
>
folosește accent color;
intră în loading state;
textul se schimbă în funcție de loading.
GPS hint
{enableLocation ? (
  <div ...>
    <MapPinned ... />
    GPS location will be attached if allowed
  </div>
) : null}

Este un hint UX foarte util.
Spune utilizatorului dinainte că locația va fi cerută doar dacă se aplică.

Afișarea erorii
{error ? (
  <div ...>{error}</div>
) : null}

Asta leagă catch-ul și validarea locală de un feedback vizibil.

Cum se leagă de restul aplicației

Această componentă stă în centrul zonei publice și se conectează la:

app/widget/[companySlug]/page.tsx
lib/widget-config.ts
app/api/emergency-intake/route.ts

17. app/api/emergency-intake/route.ts
import { NextResponse } from "next/server";
import { generateEmergencySummary } from "@/lib/emergency-intake/service";
import { validateEmergencyIntakePayload } from "@/lib/emergency-intake/validate";
import { saveEmergencyIntake } from "@/lib/emergency-intake/repository";
import type { EmergencyIntakeErrorResponse } from "@/lib/emergency-intake/types";

export async function POST(req: Request) {
  try {
    const rawBody: unknown = await req.json();
    const validation = validateEmergencyIntakePayload(rawBody);

    if (!validation.ok) {
      const errorResponse: EmergencyIntakeErrorResponse = {
        error: validation.error,
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { companySlug, payload } = validation.data;

    const result = await generateEmergencySummary(payload);

    await saveEmergencyIntake({
      companySlug,
      payload,
      result,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Emergency intake route failed:", error);

    const errorResponse: EmergencyIntakeErrorResponse = {
      error: "Failed to generate summary",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
Ce rol are

Acesta este endpointul backend care procesează intake-ul.

Este punctul de intrare API pentru widget.

Cum trebuie privit acest fișier

Acest fișier este orchestratorul HTTP.

Nu conține:

prompt logic;
AI parsing;
DB insert logic detaliat;
validare complexă.

Toate acestea sunt mutate în module dedicate.

Asta este bine pentru maintainability.

Explicație în detaliu
const rawBody: unknown = await req.json();

Citește body-ul requestului.

Este tipat ca unknown intenționat, pentru că datele venite din exterior nu trebuie tratate direct ca sigure.

const validation = validateEmergencyIntakePayload(rawBody);

Trimite datele brute către stratul de validare.

Aici nu presupui nimic despre forma payload-ului. Lași validatorul să decidă dacă este bun sau nu.

if (!validation.ok) { ... }

Dacă payload-ul este invalid:

construiești răspuns de eroare;
întorci status 400 Bad Request.

Asta este corect, pentru că problema este în requestul clientului, nu în server.

const { companySlug, payload } = validation.data;

Validatorul îți întoarce două lucruri:

companySlug
payload

Această separare este importantă.

companySlug este context multi-tenant.
payload este conținutul semantic al cererii.

const result = await generateEmergencySummary(payload);

Aici endpointul delegă logica AI service-ului.

Nu construiește el promptul și nu parsează răspunsul direct.

await saveEmergencyIntake({ companySlug, payload, result })

După ce AI-ul a generat summary-ul structurat:

requestul este salvat în DB.

Important:
salvarea se face după AI, nu înainte.
Asta înseamnă că fiecare rând din DB conține deja datele finale procesate.

return NextResponse.json(result);

Rezultatul AI este întors către widget.

Widgetul nu trebuie să știe despre DB intern.
El are nevoie doar de răspunsul operațional pentru WhatsApp flow.

Blocul catch

Dacă orice pas eșuează:

body parse;
AI;
DB;
orice altă eroare;

endpointul:

loghează eroarea;
întoarce 500;
oferă un mesaj generic către client.
Cum se leagă de restul aplicației

Depinde de:

validate.ts
service.ts
repository.ts
types.ts

Este podul dintre frontend și business logic.

18. lib/emergency-intake/types.ts
export type EmergencyUseCase = "roadside" | "hotel";

export type EmergencyPriority = "low" | "normal" | "high";

export type RoadsideIntakePayload = {
  message: string;
  useCase: "roadside";
  vehicleType?: string;
  canMove?: string;
  needsTowing?: string;
  needsHeavyRecovery?: string;
};

export type HotelIntakePayload = {
  message: string;
  useCase: "hotel";
  roomNumber?: string;
  issueType?: string;
  urgency?: string;
};

export type EmergencyIntakePayload =
  | RoadsideIntakePayload
  | HotelIntakePayload;

export type EmergencyIntakeSuccessResponse = {
  summary: string;
  detectedLanguage: string;
  priority: EmergencyPriority;
  useCase: EmergencyUseCase;
};

export type EmergencyIntakeErrorResponse = {
  error: string;
};

export type EmergencyIntakeRequestBody = EmergencyIntakePayload & {
  companySlug: string;
};
Ce rol are

Acest fișier definește contractele de date pentru întregul flow de intake.

De ce este foarte important

Într-o aplicație cu mai multe layere, tipurile sunt limbajul comun dintre ele.

Aceste tipuri conectează:

widgetul;
validatorul;
service-ul AI;
route handler-ul;
repository-ul;
răspunsul către client.


Tipuri explicate

EmergencyUseCase

Definește ce tip de workflow există.

Momentan:

roadside
hotel

Acest tip controlează foarte mult comportamentul aplicației.

EmergencyPriority

Definește nivelurile standard de prioritate.

Acest tip este folosit atât în AI result, cât și în UI dashboard.

RoadsideIntakePayload

Este forma payload-ului semantic pentru serviciile de roadside.

Câmpuri:

message
useCase
vehicleType
canMove
needsTowing
needsHeavyRecovery


HotelIntakePayload

Este forma payload-ului semantic pentru servicii hotel.

Câmpuri:

message
useCase
roomNumber
issueType
urgency
EmergencyIntakePayload

Union type între cele două de mai sus.

Asta spune TypeScript-ului:

payload-ul este fie roadside, fie hotel.

Este foarte util mai ales în buildEmergencyPrompt(payload).


EmergencyIntakeSuccessResponse

Forma standard de răspuns de succes întorsă de backend către frontend.

EmergencyIntakeErrorResponse

Forma standard de eroare întoarsă de backend.

EmergencyIntakeRequestBody

Reprezintă payload-ul complet trimis de widget.

Diferența față de EmergencyIntakePayload este că include și:

companySlug

Asta este important pentru că slug-ul este util backendului pentru tenancy și DB, dar nu face parte din semnificația cererii către AI.

19. lib/emergency-intake/validate.ts
import type {
  EmergencyIntakePayload,
  EmergencyIntakeRequestBody,
} from "./types";

type ValidationResult =
  | {
      ok: true;
      data: {
        companySlug: string;
        payload: EmergencyIntakePayload;
      };
    }
  | { ok: false; error: string };

export function validateEmergencyIntakePayload(
  input: unknown
): ValidationResult {
  ...
}
Ce rol are

Acesta este stratul de validare și normalizare pentru requestul primit de la widget.

De ce este necesar

Datele venite din request sunt nesigure prin definiție.

Trebuie verificat:

că există body;
că body-ul are forma corectă;
că companySlug este valid;
că message există;
că useCase este valid;
că payload-ul rezultat este coerent.
ValidationResult

Acest tip definește două rezultate posibile:

succes
{
  ok: true;
  data: {
    companySlug: string;
    payload: EmergencyIntakePayload;
  };
}
eroare
{ ok: false; error: string }

Acesta este un pattern foarte bun, pentru că evită aruncarea de excepții pentru invalidări simple de input.

Explicația funcției validateEmergencyIntakePayload
Pasul 1: verifică dacă inputul este obiect
if (!input || typeof input !== "object") {
  return { ok: false, error: "Invalid request body." };
}

Dacă body-ul nu este obiect JSON valid, funcția oprește procesarea.

Pasul 2: convertește în Record<string, unknown>
const body = input as Record<string, unknown>;

Asta permite accesarea dinamică a câmpurilor.

Pasul 3: validează companySlug
if (typeof body.companySlug !== "string" || !body.companySlug.trim()) {
  return { ok: false, error: "Company slug is required." };
}

Slug-ul este obligatoriu pentru:

multi-tenancy;
salvare în DB;
tracking.
Pasul 4: validează message
if (typeof body.message !== "string" || !body.message.trim()) {
  return { ok: false, error: "Message is required." };
}

Mesajul este singurul câmp cu adevărat obligatoriu semantic în ambele use case-uri.

Pasul 5: validează useCase
if (body.useCase !== "roadside" && body.useCase !== "hotel") {
  return { ok: false, error: "Invalid use case." };
}

Asta protejează backendul și prompt logic-ul de valori necunoscute.

Pasul 6: normalizează slug-ul
const companySlug = body.companySlug.trim();

Curăță spațiile de la margini.

Ramura roadside
if (body.useCase === "roadside") {
  const payload: EmergencyIntakeRequestBody = {
    companySlug,
    message: body.message.trim(),
    useCase: "roadside",
    vehicleType:
      typeof body.vehicleType === "string" ? body.vehicleType : undefined,
    canMove: typeof body.canMove === "string" ? body.canMove : undefined,
    needsTowing:
      typeof body.needsTowing === "string" ? body.needsTowing : undefined,
    needsHeavyRecovery:
      typeof body.needsHeavyRecovery === "string"
        ? body.needsHeavyRecovery
        : undefined,
  };

  const { companySlug: _, ...cleanPayload } = payload;

  return {
    ok: true,
    data: {
      companySlug,
      payload: cleanPayload,
    },
  };
}
Ce face

Construiește payload-ul complet pentru roadside și apoi separă:

companySlug
de
payload-ul semantic.
De ce scoate companySlug

Pentru că companySlug nu trebuie trimis la AI ca parte a cererii.

Este context intern de tenancy, nu conținut operațional al incidentului.

Ramura hotel

Face exact aceeași logică, dar pentru câmpurile hotel:

roomNumber
issueType
urgency

Observație:
roomNumber este și el trimis prin trim() dacă este string.

De ce este bun acest fișier

Separă clar:

validarea de input;
normalizarea;
curățarea payload-ului.

Astfel:

route-ul rămâne simplu;
AI-ul primește date curate;
DB-ul primește companySlug separat.
20. lib/emergency-intake/prompts.ts
import type {
  EmergencyIntakePayload,
  HotelIntakePayload,
  RoadsideIntakePayload,
} from "./types";

function buildRoadsidePrompt(payload: RoadsideIntakePayload) {
  return `
You are an emergency roadside dispatch assistant.
...
`;
}

function buildHotelPrompt(payload: HotelIntakePayload) {
  return `
You are a multilingual hotel concierge dispatch assistant.
...
`;
}

export function buildEmergencyPrompt(payload: EmergencyIntakePayload) {
  if (payload.useCase === "roadside") {
    return buildRoadsidePrompt(payload);
  }

  return buildHotelPrompt(payload);
}
Ce rol are

Acest fișier este responsabil pentru prompt engineering.

El traduce payload-ul aplicației într-un prompt clar pentru model.

De ce este separat

Prompturile sunt o formă de logică de business.

Nu vrei prompt text direct în route handler și nici direct în componentă.

Separarea este bună pentru:

claritate;
testare;
modificare ușoară;
adăugare de noi use case-uri.
buildRoadsidePrompt(payload)

Construiește promptul pentru cereri de asistență rutieră.

Ce îi spune modelului
că este un emergency roadside dispatch assistant;
că clientul poate scrie în orice limbă;
că trebuie detectată limba;
că trebuie întors JSON valid într-o formă fixă.
Shape-ul cerut
{
  "summary": string,
  "detectedLanguage": string,
  "priority": "low" | "normal" | "high"
}
Reguli pentru limbă

Promptul cere explicit:

numele complet al limbii;
în engleză;
fără coduri gen en, de, it.

Asta este o decizie foarte bună, pentru că reduce inconsistența în DB.

Reguli pentru prioritate

Promptul definește clar ce înseamnă:

high
normal
low

Asta este important pentru consecvența semantică a modelului.

Reguli pentru output
doar JSON;
fără markdown;
fără code fences;
summary max 300 caractere;
summary în engleză;
summary dispatch-ready.
Contextul efectiv trimis

Promptul include:

mesajul userului;
vehicle type;
can move;
needs towing;
heavy recovery.

Deci modelul nu rezumă doar textul liber, ci îl combină cu metadate operaționale.

buildHotelPrompt(payload)

Este aceeași idee, dar pentru context hotelier.

Diferențe

Promptul descrie modelul ca:

multilingual hotel concierge dispatch assistant

Include:

guest message
room number
issue type
urgency

Regulile de prioritate sunt adaptate pentru context de hotel.

buildEmergencyPrompt(payload)

Aceasta este funcția publică din fișier.

Ea face dispatch intern:

dacă useCase === roadside → buildRoadsidePrompt
altfel → buildHotelPrompt

Este un mic router semantic.

21. lib/emergency-intake/service.ts
import { openai } from "@/lib/openai";
import { buildEmergencyPrompt } from "./prompts";
import type {
  EmergencyIntakePayload,
  EmergencyIntakeSuccessResponse,
  EmergencyPriority,
} from "./types";

type ModelStructuredOutput = {
  summary?: unknown;
  detectedLanguage?: unknown;
  priority?: unknown;
};
...
export async function generateEmergencySummary(
  payload: EmergencyIntakePayload
): Promise<EmergencyIntakeSuccessResponse> {
  ...
}
Ce rol are

Acesta este service layer-ul pentru AI.

Este unul dintre cele mai importante fișiere din aplicație.

De ce există acest layer

Pentru că vrei să separi:

route handling;
prompt building;
apelul la model;
parsarea;
normalizarea.

Fără acest layer, toate acestea ar ajunge în route handler și codul ar deveni greu de întreținut.

type ModelStructuredOutput
type ModelStructuredOutput = {
  summary?: unknown;
  detectedLanguage?: unknown;
  priority?: unknown;
};

Acest tip descrie forma brută a ceea ce te aștepți să parsezi din JSON-ul modelului.

Observația importantă:
valorile sunt unknown.

Asta este bine, pentru că modelul nu este o sursă 100% sigură de tipuri. Chiar dacă îi ceri JSON, trebuie să tratezi datele defensiv.

normalizePriority(value)
function normalizePriority(value: unknown): EmergencyPriority {
  if (value === "low" || value === "normal" || value === "high") {
    return value;
  }

  return "normal";
}
Ce face

Asigură că prioritatea finală este una validă.

De ce este necesar

Modelul poate întoarce:

ceva greșit;
o valoare neașteptată;
literă mare;
altă convenție.

Tu vrei ca aplicația și DB-ul să aibă un set strict de valori.

Fallback

Dacă nu recunoaște valoarea:

întoarce normal.

Aceasta este o alegere pragmatică și sigură.

normalizeDetectedLanguage(value)
function normalizeDetectedLanguage(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "Unknown";
  }

  const normalized = value.trim().toLowerCase();

  const languageMap: Record<string, string> = {
    en: "English",
    english: "English",
    de: "German",
    german: "German",
    it: "Italian",
    italian: "Italian",
    ro: "Romanian",
    romanian: "Romanian",
    pl: "Polish",
    polish: "Polish",
    nl: "Dutch",
    dutch: "Dutch",
    fr: "French",
    french: "French",
    es: "Spanish",
    spanish: "Spanish",
  };

  return languageMap[normalized] ?? value.trim();
}
Ce face

Normalizează limba detectată într-un format consistent.

De ce este necesar

Modelul poate întoarce:

English
english
en
IT
etc.

DB-ul și dashboardul au nevoie de consistență.

Ce se întâmplă dacă valoarea nu este mapată

Se întoarce value.trim().

Asta păstrează flexibilitate pentru limbi noi sau mai rare.

safeParseStructuredOutput(text)
function safeParseStructuredOutput(text: string): ModelStructuredOutput | null {
  try {
    return JSON.parse(text) as ModelStructuredOutput;
  } catch {
    return null;
  }
}
Ce face

Încearcă să parseze textul întors de model ca JSON.

De ce este necesar

Chiar dacă promptul cere strict JSON, modelul poate răspunde uneori imperfect.

În loc să crape tot flow-ul, parse-ul sigur întoarce null și service-ul poate aplica fallback.

generateEmergencySummary(payload)

Aceasta este funcția principală.

Pasul 1: construiește promptul
const prompt = buildEmergencyPrompt(payload);

Alege automat promptul corect pe baza useCase.

Pasul 2: apelează OpenAI
const completion = await openai.responses.create({
  model: "gpt-5.4-mini",
  input: prompt,
});

Aici se face requestul real către model.

De ce gpt-5.4-mini

Este modelul ales pentru acest flow de intake.

Pasul 3: extrage textul brut
const rawText = completion.output_text.trim();

Acesta este răspunsul textual al modelului.

Pasul 4: încearcă parse JSON
const parsed = safeParseStructuredOutput(rawText);
Pasul 5: fallback dacă parse-ul eșuează
if (!parsed || typeof parsed.summary !== "string") {
  return {
    summary: rawText,
    detectedLanguage: "Unknown",
    priority: "normal",
    useCase: payload.useCase,
  };
}

Dacă modelul nu a returnat JSON valid sau nu are summary string:

nu oprești complet flow-ul;
folosești rawText ca summary brut;
limba devine Unknown;
prioritatea devine normal.

Asta este o alegere foarte bună pentru reziliență.

Pasul 6: răspunsul normalizat
return {
  summary: parsed.summary.trim(),
  detectedLanguage: normalizeDetectedLanguage(parsed.detectedLanguage),
  priority: normalizePriority(parsed.priority),
  useCase: payload.useCase,
};

Aici service-ul livrează răspunsul final curat către route handler.

Cum se leagă de restul aplicației

Depinde de:

lib/openai.ts
lib/emergency-intake/prompts.ts
lib/emergency-intake/types.ts

Este folosit de:

app/api/emergency-intake/route.ts


22. lib/emergency-intake/repository.ts
import { supabaseAdmin } from "@/lib/supabase";
import type {
  EmergencyIntakePayload,
  EmergencyIntakeSuccessResponse,
} from "./types";

type SaveEmergencyIntakeParams = {
  companySlug: string;
  payload: EmergencyIntakePayload;
  result: EmergencyIntakeSuccessResponse;
};

export async function saveEmergencyIntake({
  companySlug,
  payload,
  result,
}: SaveEmergencyIntakeParams) {
  const { data, error } = await supabaseAdmin
    .from("emergency_intakes")
    .insert({
      company_slug: companySlug,
      use_case: payload.useCase,
      original_message: payload.message,
      summary: result.summary,
      detected_language: result.detectedLanguage,
      priority: result.priority,
      payload,
    })
    .select("id, company_slug, use_case, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
Ce rol are

Acesta este repository layer-ul pentru salvarea intake-urilor.

De ce este bine că există separat

Persistența în DB este o responsabilitate diferită de:

AI;
validare;
routing.

Separarea într-un repository face codul mai clar și mai ușor de modificat.

SaveEmergencyIntakeParams

Acest tip explică foarte clar ce are nevoie repository-ul:

companySlug
payload
result

Repository-ul nu trebuie să știe nimic despre requestul HTTP. Primește deja datele pregătite.

Query-ul .insert(...)

Se scrie în tabela emergency_intakes:

company_slug

Slug-ul tenantului.

use_case

Vine din payload.

original_message

Mesajul original al userului.

summary

Rezultatul AI procesat.

detected_language

Limba detectată și normalizată.

priority

Prioritatea normalizată.

payload

Payload-ul complet curat, util pentru audit și evoluții viitoare.

.select(...).single()

După insert:

selectezi câteva câmpuri;
ceri un singur rând.

Asta îți permite să primești un obiect util înapoi.

if (error) { throw error; }

Repository-ul nu ascunde eroarea.
O propagă mai sus, ca route handler-ul să o gestioneze.

Asta este ok pentru că route handler-ul este locul potrivit pentru transformarea erorii într-un răspuns HTTP.

23. lib/openai.ts
import OpenAI from "openai";

const key = process.env.OPENAI_API_KEY;

export const openai = new OpenAI({
  apiKey: key,
});
Ce rol are

Acest fișier centralizează clientul OpenAI.

De ce este util

În loc să construiești clientul OpenAI în mai multe fișiere:

îl definești o singură dată;
îl imporți unde ai nevoie.

Asta simplifică:

configurarea;
debugging;
schimbările viitoare.
Cum se leagă de restul aplicației

Este folosit de:

lib/emergency-intake/service.ts


24. lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseSecretKey) {
  throw new Error("Missing SUPABASE_SECRET_KEY");
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);
Ce rol are

Acest fișier definește clientul Supabase cu privilegii administrative.

De ce folosește cheia secretă

Pentru operații server-side de încredere:

query-uri administrative;
inserturi;
lookup în tenant_memberships.

Această cheie nu trebuie expusă în browser.

Guard-urile de env

Fișierul verifică imediat dacă lipsesc variabilele critice.

Asta este bine pentru că:

eroarea apare devreme;
nu ajungi la bug-uri mai subtile în runtime.
Cine îl folosește
app/auth/callback/route.ts
lib/auth/get-user-tenant.ts
lib/dashboard/intakes
lib/emergency-intake/repository.ts


25. lib/supabase/browser.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
Ce rol are

Creează clientul Supabase pentru cod care rulează în browser.

De ce are "use client"

Pentru că este folosit doar de componente client-side.

De ce folosește cheia publică

Pentru browser auth flows:

login;
logout.

Este exact contextul potrivit pentru cheia publică.

Cine îl folosește
app/login/page.tsx
components/dashboard/LogoutButton.tsx


26. lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
Ce rol are

Acesta este helper-ul standard pentru a crea clientul Supabase server-side, legat de cookies.

De ce este esențial

Fără el, paginile server-side și route handlers nu ar putea:

citi sesiunea corect;
identifica userul logat;
opera în context auth SSR.
Explicație
const cookieStore = await cookies();

Ia store-ul de cookies din contextul requestului curent.

createServerClient(...)

Construiește clientul Supabase SSR.

blocul cookies

Face exact legătura dintre Supabase și sistemul de cookies al Next.js.

Cine îl folosește
lib/auth/get-user.ts
app/auth/callback/route.ts


27. lib/auth/get-user.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
Ce rol are

Helper simplu pentru a obține userul curent din sesiune.

De ce există

Pentru a nu repeta de fiecare dată:

crearea clientului server;
apelul auth.getUser().
Cum funcționează
construiește clientul server;
apelează supabase.auth.getUser();
întoarce user.
Cine îl folosește
dashboard/intakes/page.tsx
lib/auth/get-user-tenant.ts


28. lib/auth/get-user-tenant.ts
import { getCurrentUser } from "./get-user";
import { supabaseAdmin } from "@/lib/supabase";

export async function getCurrentUserTenant() {
  const user = await getCurrentUser();

  if (!user) return null;

  const { data, error } = await supabaseAdmin
    .from("tenant_memberships")
    .select("company_slug, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  return {
    user,
    membership: data,
  };
}
Ce rol are

Acest helper transformă un user autentificat într-un rezultat tenant-aware.

De ce este important

În sistemul tău, auth singur nu este suficient.
Trebuie și apartenență la tenant.

Acest fișier este puntea dintre:

sesiunea Supabase;
modelul de membership intern.
Explicație
const user = await getCurrentUser();

Ia userul curent din sesiune.

if (!user) return null;

Dacă nu există user logat, nu ai ce căuta în membership-uri.

Query în tenant_memberships

Caută rândul asociat user.id.

if (error) throw error;

DB errors sunt propagate în sus.

if (!data) return null;

Dacă userul nu are membership, helper-ul întoarce null.

return { user, membership: data }

Acum ai atât identitatea userului, cât și contextul tenantului.

Cine îl folosește
lib/auth/require-tenant-access.ts


29. lib/auth/require-tenant-access.ts
import { redirect } from "next/navigation";
import { getCurrentUserTenant } from "./get-user-tenant";

export async function requireTenantAccess(companySlug: string) {
  const result = await getCurrentUserTenant();

  if (!result) {
    redirect("/login");
  }

  const { membership } = result;

  if (membership.company_slug !== companySlug) {
    redirect("/unauthorized");
  }

  return result;
}
Ce rol are

Acesta este helper-ul principal de autorizare per tenant.

De ce este foarte important

El implementează efectiv tenant isolation.

Nu este suficient:

că userul este logat;
că există o sesiune.

Trebuie verificat explicit:

dacă slug-ul tenantului din URL corespunde tenantului userului.
Explicație pas cu pas
const result = await getCurrentUserTenant();

Citește userul și membership-ul.

if (!result) redirect("/login");

Dacă nu există user sau membership, merge la login.

Observație:
în implementarea actuală, getCurrentUserTenant() întoarce null și dacă nu există membership.
Asta înseamnă că lipsa membership-ului ajunge tot la /login, nu la /unauthorized.

În cazul tău flow-ul din callback separă deja lipsa membership-ului și o duce la unauthorized, dar aici helper-ul tratează null generic.

if (membership.company_slug !== companySlug) redirect("/unauthorized")

Dacă userul aparține altui tenant decât cel cerut în URL, accesul este refuzat.

return result

Dacă totul este valid, pagina primește înapoi:

user
membership
Cine îl folosește
app/dashboard/[companySlug]/intakes/page.tsx


30. lib/dashboard/intakes
import { supabaseAdmin } from "@/lib/supabase";

export type IntakeRow = {
  id: number;
  company_slug: string;
  use_case: "roadside" | "hotel";
  original_message: string;
  summary: string;
  detected_language: string;
  priority: "low" | "normal" | "high";
  payload: Record<string, unknown>;
  created_at: string;
};

export async function getLatestIntakes(limit = 50): Promise<IntakeRow[]> {
  const { data, error } = await supabaseAdmin
    .from("emergency_intakes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as IntakeRow[];
}

export async function getIntakesByCompany(
  companySlug: string,
  limit = 50
): Promise<IntakeRow[]> {
  const { data, error } = await supabaseAdmin
    .from("emergency_intakes")
    .select("*")
    .eq("company_slug", companySlug)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as IntakeRow[];
}
Ce rol are

Acesta este query layer-ul pentru dashboard.

De ce este bine separat

Paginile dashboard nu trebuie să conțină query logic direct.

Acest fișier:

centralizează query-urile;
tipizează rândurile;
simplifică paginile.
IntakeRow

Acest tip descrie forma unui rând din emergency_intakes așa cum este consumat în UI.

Este folosit mai ales de:

IntakeCard
IntakeList
getLatestIntakes(limit)
Ce face

Citește ultimele intake-uri din toate tenanturile.

Query
.from("emergency_intakes")
.select("*")
.order("created_at", { ascending: false })
.limit(limit)
De ce ordonare descrescătoare

Pentru dashboard este logic să vezi mai întâi cele mai noi intrări.

getIntakesByCompany(companySlug, limit)
Ce face

Citește intake-urile filtrate pe un anumit tenant.

Query suplimentar
.eq("company_slug", companySlug)

Asta face ca pagina tenant dashboard să vadă doar datele relevante.


31. lib/widget-config.ts
export type WidgetUseCase = "roadside" | "hotel";

export type WidgetConfig = {
  slug: string;
  companyName: string;
  whatsappNumber: string;
  operatorLanguage: string;
  accentColor?: string;
  useCase: WidgetUseCase;
  enableLocation: boolean;
};

export const widgetConfigs: WidgetConfig[] = [
{
  slug: "pedrotti",
  companyName: "Pedrotti",
  whatsappNumber: "40755741335",
  operatorLanguage: "Italian",
  accentColor: "#dc2626",
  useCase: "roadside",
  enableLocation: true,

},
{
  slug: "hotel-lago",
  companyName: "Hotel Lago",
  whatsappNumber: "40755741335",
  operatorLanguage: "Italian",
  accentColor: "#2563eb",
  useCase: "hotel",
  enableLocation:false,
},
];

export function getWidgetConfigBySlug(slug: string) {
  return widgetConfigs.find((config) => config.slug === slug);
}
Ce rol are

Acest fișier definește configurarea multi-tenant a widgetului.

De ce este foarte important

Acesta este punctul în care aceleași componente devin dinamice pe client / tenant.

Pe baza configului se schimbă:

slug-ul;
compania;
numărul WhatsApp;
limba operatorului;
culoarea de accent;
use case-ul;
geolocation on/off.
WidgetConfig

Tipul standard pentru orice tenant.

widgetConfigs

Lista actuală de tenanturi configurate static în cod.

În prezent:

pedrotti
hotel-lago

În viitor, această logică poate migra în DB.

getWidgetConfigBySlug(slug)

Helper simplu de lookup după slug.

Este folosit de:

app/widget/[companySlug]/page.tsx


32. components/dashboard/DashboardUserBar.tsx
import LogoutButton from "./LogoutButton";

type DashboardUserBarProps = {
  email: string;
  tenantLabel?: string;
};

export default function DashboardUserBar({
  email,
  tenantLabel,
}: DashboardUserBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{email}</p>
        {tenantLabel ? (
          <p className="mt-1 text-xs text-zinc-500">
            Tenant: <span className="font-medium text-zinc-700">{tenantLabel}</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">Platform admin view</p>
        )}
      </div>

      <LogoutButton />
    </div>
  );
}
Ce rol are

Această componentă afișează contextul userului logat în dashboard.

Props
email

Emailul userului curent.

tenantLabel?

Slug-ul tenantului, dacă pagina este scoped pe tenant.

Comportament
Dacă tenantLabel există

Componenta afișează:

emailul;
tenantul curent.
Dacă tenantLabel nu există

Componenta afișează:

emailul;
mesajul Platform admin view.

Asta face componenta reutilizabilă atât pentru dashboard global, cât și pentru dashboard tenant.

LogoutButton

Componentei îi este delegată complet responsabilitatea pentru delogare.

Asta este bine, pentru că păstrează DashboardUserBar ca prezentational component cu compoziție simplă.



33. components/dashboard/LogoutButton.tsx

"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Signing out..." : "Logout"}
    </button>
  );
}

Ce rol are
Componentă client-side care deloghează userul.

De ce este client component
Are nevoie de:


useState


browser Supabase client


window.location.href



loading
Controlează:


textul butonului;


disabled state.



handleLogout
setLoading(true)
Intră în loading state.
const supabase = createSupabaseBrowserClient();
Construiește clientul Supabase pentru browser.
await supabase.auth.signOut();
Șterge sesiunea curentă.
window.location.href = "/login";
Redirecționează explicit la login.
Deși poți imagina și alte strategii, această abordare este directă și clară.
finally { setLoading(false) }
Resetează loading-ul chiar dacă apare o eroare.


34. components/dashboard/IntakeList.tsx
import type { IntakeRow } from "@/lib/dashboard/intakes";
import IntakeCard from "./IntakeCard";
type IntakeListProps = {  
  intakes: IntakeRow[];  
  emptyMessage?: string;};
  export default function IntakeList({  intakes,  emptyMessage = "No intakes yet.",}: IntakeListProps) { 
     if (intakes.length === 0) {   
       return (     
         <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">        {emptyMessage}     
          </div>    
         );  
         }
       return (    
        <div className="space-y-4">  
            {intakes.map((intake) => 
            (        <IntakeCard key={intake.id} intake={intake} />      )
            )}   
             </div>  );
             }
Ce rol are
Randare a unei colecții de intake-uri.

Props
intakes
Lista de rânduri din DB.
emptyMessage
Mesaj personalizabil pentru cazul în care lista este goală.

Comportament
Dacă lista este goală
Afișează un card simplu cu mesaj.
Dacă lista are elemente
Face map() și randează câte un IntakeCard pentru fiecare.

De ce este util acest nivel intermediar
Separă:


logica listei;
de


logica de card individual.


Asta păstrează paginile mai curate.


35. components/dashboard/IntakeCard.tsx
import type { IntakeRow } from "@/lib/dashboard/intakes";
type IntakeCardProps = {  intake: IntakeRow;};
function getPriorityClasses(priority: IntakeRow["priority"]) { 
   switch (priority) 
   {    case "high":      return "bg-red-100 text-red-700";    
   case "normal":      return "bg-yellow-100 text-yellow-700";    
   case "low":      return "bg-green-100 text-green-700";   
    default:      return "bg-zinc-100 text-zinc-700";  }}
    export default function IntakeCard({ intake }: IntakeCardProps)
     {  return (    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">     
      ...   
      </article>  );}
Ce rol are
Aceasta este componenta care randază un singur intake.

getPriorityClasses(priority)
Această funcție map-ează prioritatea la stil vizual.
high
roșu
normal
galben
low
verde
default
gri
Această separare face componenta mai curată și păstrează logica de prezentare într-un helper mic și lizibil.

Renderul cardului
Cardul afișează:
linia de sus


company_slug


use_case


priority


created_at


secțiunea „Original message”
Textul brut introdus de user.
secțiunea „AI summary”
Rezumatul operațional generat.
language
Limba detectată.

De ce este utilă această structură
Separă clar:


inputul original;


outputul AI;


metadatele operaționale.


Pentru debugging și operator UX, această separare este foarte bună.


36. Relația exactă dintre fișiere
Flow widget
app/widget/[companySlug]/page.tsx  → getWidgetConfigBySlug(slug)  → EmergencyIntakeWidget(config)  → fetch("/api/emergency-intake")  → validateEmergencyIntakePayload()  → generateEmergencySummary()  → buildEmergencyPrompt()  → openai.responses.create()  → normalize result  → saveEmergencyIntake()  → response JSON  → open WhatsApp

Flow auth
login/page.tsx  → createSupabaseBrowserClient()  → supabase.auth.signInWithOtp()  → email magic link  → /auth/callback?code=...  → createSupabaseServerClient()  → exchangeCodeForSession()  → getUser()  → tenant_memberships lookup  → redirect /dashboard/[companySlug]/intakes

Flow dashboard tenant
/dashboard/[companySlug]/intakes  → requireTenantAccess(companySlug)  → getCurrentUserTenant()  → getCurrentUser()  → Supabase session  → tenant_memberships lookup  → getIntakesByCompany(companySlug)  → DashboardUserBar  → IntakeList  → IntakeCard

37. Concluzie tehnică
Din punct de vedere al codului, aplicația este bine structurată pentru stadiul actual.
Punctele foarte bune sunt:


separare clară pe layere;


route handler curat;


service layer pentru AI;


repository separat pentru DB;


config multi-tenant clar;


auth separat de tenant authorization;


widget reutilizabil;


dashboard scoped corect;


middleware pentru stabilitatea sesiunii.


Pe scurt, codul este deja organizat suficient de bine încât:


să poată fi înțeles;


să poată fi extins;


să poată fi productizat mai departe spre widget embedabil și operator inbox.


Dacă vrei, în mesajul următor îți scriu și **partea a doua** în același nivel de detaliu pentru:- `README.md` complet, gata de lipit,- secțiunea **Environment Variables**,- secțiunea **Database Tables**,- secțiunea **How to run locally**,- secțiunea **Future roadmap**.

# Dispatch AI — partea a doua a documentației tehnice

## 38. Variabile de mediu

Aplicația se bazează pe trei zone externe critice:

- Supabase public auth/session
- Supabase admin DB access
- OpenAI API

Pentru ca aplicația să funcționeze corect, trebuie definite variabilele de mediu de mai jos.

---

## 38.1. Variabile necesare

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SECRET_KEY=...
OPENAI_API_KEY=...

38.2. Explicația fiecărei variabile
NEXT_PUBLIC_SUPABASE_URL

URL-ul proiectului Supabase.

Este folosit atât:

în browser;
cât și în server-side auth flows.

Apare în:

lib/supabase/browser.ts
lib/supabase/server.ts
lib/supabase.ts

Deși numele este NEXT_PUBLIC, valoarea este sigură pentru a fi expusă client-side. Nu este un secret.


NEXT_PUBLIC_SUPABASE_ANON_KEY

Cheia publică Supabase pentru:

login;
logout;
sesiuni SSR;
browser auth flows.

Este folosită în:

lib/supabase/browser.ts
lib/supabase/server.ts
middleware.ts

Aceasta nu este cheia de admin.


SUPABASE_SECRET_KEY

Cheia secretă pentru operații administrative în baza de date.

Este folosită în:

lib/supabase.ts

Prin acest client se fac:

inserturi în emergency_intakes
query-uri în tenant_memberships
query-uri globale pentru dashboard

Această cheie nu trebuie expusă niciodată în browser.


OPENAI_API_KEY

Cheia de acces către OpenAI.

Este folosită în:

lib/openai.ts

Prin ea se face:

generarea de summary AI pentru intake-uri.
38.3. Cum sunt împărțite responsabilitățile între chei
Chei publice

Acestea sunt folosite pentru:

autentificare în browser;
sesiuni SSR;
citirea userului logat.

Exemple:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
Chei secrete

Acestea sunt folosite pentru:

operații administrative;
acces elevat în DB;
query-uri care nu trebuie executate din browser.

Exemple:

SUPABASE_SECRET_KEY
OPENAI_API_KEY
39. Modelul bazei de date

În forma actuală, două tabele sunt esențiale pentru aplicație:

emergency_intakes
tenant_memberships
39.1. Tabela emergency_intakes

Aceasta este tabela principală care stochează cererile venite din widget.

Rolul tabelei

Tabela există pentru a:

salva fiecare intake;
alimenta dashboardul global;
alimenta dashboardurile per tenant;
păstra istoric;
permite analytics;
deveni bază pentru operator inbox și conversații în viitor.
Câmpuri importante
id
company_slug
use_case
original_message
summary
detected_language
priority
payload
created_at
Explicația câmpurilor
id

Identificatorul unic al rândului.

Este folosit în UI ca key pentru list rendering.

company_slug

Slug-ul tenantului căruia îi aparține requestul.

Exemple:

pedrotti
hotel-lago

Acest câmp este critic pentru:

dashboard tenant filtering;
analytics per client;
multi-tenancy.
use_case

Tipul workflow-ului:

roadside
hotel

Acest câmp este util pentru:

filtrare;
UI;
viitoare branching logic în dashboard.
original_message

Mesajul original scris de user.

Este important pentru:

audit;
debugging;
operator review.
summary

Rezumatul operațional generat de AI.

Este câmpul care va fi cel mai des consumat de operatori.

detected_language

Limba detectată și normalizată.

Exemple:

English
German
Italian
Romanian

Acest câmp va deveni important pentru:

filtrare;
traduceri bidirecționale;
inbox multilingv.
priority

Prioritatea estimată de AI:

low
normal
high

Este folosită deja în dashboard pentru highlight vizual.

În viitor poate fi folosită pentru:

SLA-uri;
sortare;
alerting;
assignment rules.
payload

Payload-ul complet validat și curățat.

Acesta este foarte util pentru:

audit intern;
debugging;
extindere de business logic;
reconstruirea contextului cererii.
created_at

Timestamp-ul creării rândului.

Este folosit pentru:

ordonarea dashboardurilor;
observabilitate;
analytics.


39.2. Tabela tenant_memberships

Aceasta este tabela care leagă userii autentificați de tenanturile lor.

Rolul tabelei

Tabela există pentru:

determinarea tenantului după login;
tenant isolation;
control de acces;
posibil suport viitor pentru roluri.
Câmpuri importante
user_id
company_slug
role
Explicația câmpurilor
user_id

ID-ul userului din Supabase Auth.

Este cheia prin care aplicația află cine este userul logat.

company_slug

Tenantul de care aparține userul.

Exemplu:

un user poate avea company_slug = "pedrotti"
role

Rolul userului în tenant.

Momentan nu este exploatat masiv în UI, dar este important pentru extinderea viitoare:

admin
operator
manager
etc.


39.3. Relația logică dintre tabele
Supabase Auth user
   ↓ user.id
tenant_memberships
   ↓ company_slug
dashboard access / redirect / tenant scoping
   ↓
emergency_intakes.company_slug


39.4. Cum circulă datele în DB
La login
userul este autentificat prin Supabase;
apoi se caută în tenant_memberships pentru a afla tenantul.
La intake
widgetul trimite companySlug;
AI procesează cererea;
repository-ul scrie în emergency_intakes.
La dashboard
pagina globală citește toate rândurile;
pagina tenant citește doar rândurile filtrate pe company_slug.


40. Cum rulezi aplicația local

Această secțiune explică setup-ul local pentru development.

40.1. Cerințe

Ai nevoie de:

Node.js
npm / pnpm / yarn
un proiect Supabase configurat
o cheie OpenAI validă
40.2. Instalare dependențe
npm install

sau echivalentul cu managerul tău de pachete.

40.3. Configurează fișierul .env.local

Exemplu:

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-key
SUPABASE_SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-key
40.4. Pornește aplicația
npm run dev

Apoi deschide:

http://localhost:3000
40.5. Ce poți testa local
Homepage intern
/
Widget preview
/widget/pedrotti
/widget/hotel-lago
Login
/login
Dashboard global
/dashboard/intakes
Dashboard tenant
/dashboard/pedrotti/intakes
/dashboard/hotel-lago/intakes
41. Cum se testează flow-ul complet

Mai jos este un ghid practic pentru un developer nou care vrea să verifice că tot sistemul merge.

41.1. Test login flow
Pasul 1

Intră pe:

/login
Pasul 2

Introdu un email care există în sistemul tău Supabase Auth.

Pasul 3

Apasă Send magic link.

Pasul 4

Deschide emailul și accesează linkul.

Pasul 5

Verifică:

dacă ajungi în /dashboard/[companySlug]/intakes
sau în /unauthorized dacă nu ai membership
41.2. Test tenant isolation
Pasul 1

Autentifică-te cu un user care aparține unui tenant anume.

Pasul 2

Accesează dashboardul tenantului corect.

Pasul 3

Încearcă manual să schimbi URL-ul pe alt tenant:

de exemplu din /dashboard/pedrotti/intakes
în /dashboard/hotel-lago/intakes
Pasul 4

Verifică dacă ești redirecționat la:

/unauthorized

Dacă da, tenant isolation funcționează corect.

41.3. Test widget flow
Pasul 1

Intră pe:

/widget/pedrotti
sau
/widget/hotel-lago
Pasul 2

Completează formularul.

Pasul 3

Trimite cererea.

Pasul 4

Verifică:

dacă se apelează /api/emergency-intake
dacă rezultatul este salvat în emergency_intakes
dacă se deschide WhatsApp cu summary-ul AI
41.4. Test geolocation flow

Test relevant doar pentru tenant / use case unde:

enableLocation = true
Verificări
dacă browserul cere permisiunea de locație;
dacă în WhatsApp ajunge un mesaj cu link Maps;
dacă, în caz de eșec, apare fallback text pentru locație manuală.
41.5. Test dashboard flow
Dashboard global

Verifică:

dacă vezi toate intake-urile.
Dashboard tenant

Verifică:

dacă vezi doar intake-urile tenantului tău.
UI

Verifică:

DashboardUserBar
emailul userului
tenant label
butonul de logout
42. Convenții și principii de arhitectură folosite în proiect

Această secțiune este foarte utilă pentru orice developer care va continua proiectul.

42.1. Route handlers doar pentru orchestration HTTP

Fișierele din app/api/.../route.ts nu trebuie să conțină toată logica de business.

Ele trebuie să facă doar:

parse request;
validate;
call service;
return response.

Asta este deja respectat în:

app/api/emergency-intake/route.ts

42.2. Validation separată

Validarea inputului nu se face direct în componentă și nici direct în service.

Ea se face în:

lib/emergency-intake/validate.ts

Acest lucru păstrează:

claritate;
testabilitate;
responsabilități separate.


42.3. Prompt logic separată

Prompturile AI stau în:

lib/emergency-intake/prompts.ts

Asta este important pentru că prompturile sunt parte din business logic, nu doar text oarecare.

42.4. AI service separat

Apelul OpenAI și normalizarea răspunsului stau în:

lib/emergency-intake/service.ts

Asta izolează:

model handling;
fallback logic;
parsing;
normalization.


42.5. Repository separat pentru DB writes

Persistența se face în:

lib/emergency-intake/repository.ts

Acest lucru permite în viitor:

schimbări de schemă;
logging suplimentar;
audit trail;
retries / queues.


42.6. Query layer separat pentru dashboard

Citirea datelor pentru dashboard se face în:

lib/dashboard/intakes

Paginile nu ar trebui să conțină query-uri brute.


42.7. Auth separat de tenant authorization

Proiectul face o distincție foarte bună între:

autentificare

„cine este userul?”

și

autorizare per tenant

„la ce tenant are voie userul?”

Această separare se vede clar în:

getCurrentUser()
getCurrentUserTenant()
requireTenantAccess()
42.8. Config multi-tenant separat de UI

Tenant configul nu este hardcodificat direct în componenta widgetului.

El este definit în:

lib/widget-config.ts

Asta este foarte sănătos pentru evoluția spre un sistem de configuri în DB.

43. Ce ar trebui să știe un developer nou înainte să modifice aplicația
43.1. Widgetul nu este încă embed script

În forma actuală:

widgetul este randat în pagini interne Next.js;
nu este încă injectat prin <script> în site extern.

Asta înseamnă că orice dezvoltare pe „productizare widget” trebuie să pornească de la componenta existentă și să o împacheteze într-un container embedabil.

43.2. widgetConfigs este static

Momentan tenanturile sunt configurate în cod.

Avantaj:

simplu;
rapid pentru MVP.

Limitare:

orice tenant nou cere schimbare de cod și deploy.
43.3. Dashboardul nu este încă operator inbox

Dashboardul actual este de tip:

listă de intake-uri;
observabilitate.

Nu există încă:

thread-uri;
conversații;
assignment;
status transitions;
traduceri inline.
43.4. WhatsApp nu este încă integrat prin Cloud API

Momentan flow-ul este:

AI summary
deschidere WhatsApp prin deep link / wa.me

Nu există încă:

inbound webhook
outbound messaging API
operator inbox live
44. Posibile îmbunătățiri tehnice pe termen scurt

Această secțiune este utilă pentru backlog tehnic.

44.1. Îmbunătățire UI / UX login

Momentan login-ul afișează doar mesaj de succes.

Posibile îmbunătățiri:

mesaj de eroare explicit;
validare email mai clară;
stări de retry;
branding mai bun.
44.2. Îmbunătățire metadata și branding app

Momentan:

layout.tsx are metadata default;
homepage-ul este încă foarte dev-centric.

Poate fi rafinat fără a schimba logica produsului.

44.3. Mai bună tipizare și validare

În viitor se poate introduce o bibliotecă de validare tip:

Zod

pentru:

request bodies;
env validation;
DB payload schemas.

Momentan validarea custom este suficientă pentru MVP.

44.4. Unificare mai clară a rolurilor

tenant_memberships.role există deja, dar nu este încă folosit pentru policies UI sau access levels mai fine.

În viitor pot exista:

admin tenant
operator
manager
readonly
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
44.5. Externalizare config tenant

widgetConfigs poate fi mutat în DB pentru:

onboarding mai rapid;
configurare din dashboard;
fără redeploy la tenant nou.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

45. Roadmap tehnic recomandat

Aceasta este ordinea corectă, în acord cu direcția deja stabilită.

45.1. Finalizare UX real în dashboard

Obiective:

DashboardUserBar consistent peste tot
polish logout
polish unauthorized page
eventual mai clar global vs tenant dashboard
45.2. Productizare widget

Acesta este următorul pas mare.

Obiective:

floating trigger button
widget în modal
embed script real
configurare pe baza slug-ului / tokenului
integrare reală în site extern

Aceasta este etapa care transformă produsul din „preview intern” în „produs instalabil”.

45.3. Abia apoi: WhatsApp complet

După ce widgetul devine embedabil și produsizabil, urmează:

inbound WhatsApp webhook
outbound handling
inbox operator
traducere bidirecțională
multi-language conversation layer
46. Exemplu de structură README recomandată

Mai jos este o structură foarte bună pentru varianta finală a fișierului README.md.

# Dispatch AI

## Overview
## Product direction
## Tech stack
## Architecture
## App flows
### Widget flow
### Auth flow
### Tenant isolation flow
## Project structure
## File-by-file breakdown
## Environment variables
## Database model
## Local development
## Testing flows
## Current limitations
## Roadmap
47. Rezumat final pentru developer onboarding

Dacă un developer nou intră pe acest proiect, ar trebui să înțeleagă rapid următoarele:

aplicația este un SaaS multi-tenant separat;
homepage-ul este intern, nu public;
widgetul este entry point-ul pentru useri finali;
widgetul trimite date la API;
API-ul validează, apelează AI și salvează în DB;
dashboardul global afișează toate intake-urile;
dashboardul tenant afișează doar datele tenantului autorizat;
auth-ul se face prin magic link;
tenantul este dedus din tenant_memberships, nu din magic link;
middleware-ul menține sesiunea Supabase stabilă;
următorul mare pas de produs este widgetul embedabil real.
48. Concluzie

În stadiul actual, Dispatch AI este deja o fundație tehnică solidă pentru un produs SaaS real.

Are separarea corectă între:

UI
routing
validation
AI service
persistence
auth
tenant access

Are deja implementate:

dynamic widget per tenant
AI intake processing
Supabase persistence
magic link auth
tenant isolation
dashboard global și tenant-scoped

Din acest punct, produsul poate evolua sănătos spre:

widget embedabil;
operator inbox;
WhatsApp Business Platform complet;
multilingual conversations.

-------------------------------------------------------------------------------------------
!!!! de vazut metadata din layout --ACTUALIZARE pt SEO
!!!! Observație:
deși ai configurat fonturile Geist în layout, aici body-ul folosește:

Arial, Helvetica, sans-serif

Asta înseamnă că în practică aplicația nu profită complet de fonturile Geist la nivel de text standard.
Observație:
momentan nu există un branch explicit de eroare afișată în UI, doar succes.
Asta poate fi îmbunătățit mai târziu.
Observație:
în implementarea actuală, getCurrentUserTenant() întoarce null și dacă nu există membership.
Asta înseamnă că lipsa membership-ului ajunge tot la /login, nu la /unauthorized.

În cazul tău flow-ul din callback separă deja lipsa membership-ului și o duce la unauthorized, dar aici helper-ul tratează null generic.
export function getWidgetConfigBySlug(slug: string) {
  return widgetConfigs.find((config) => config.slug === slug);
}
Ce rol are

Acest fișier definește configurarea multi-tenant a widgetului.

De ce este foarte important

Acesta este punctul în care aceleași componente devin dinamice pe client / tenant.

Pe baza configului se schimbă:

slug-ul;
compania;
numărul WhatsApp;
limba operatorului;
culoarea de accent;
use case-ul;
geolocation on/off.
WidgetConfig

Tipul standard pentru orice tenant.

widgetConfigs

Lista actuală de tenanturi configurate static în cod.

În prezent:

pedrotti
hotel-lago

În viitor, această logică poate migra în DB.

          PART II

În stadiul actual, Dispatch AI este deja o fundație tehnică solidă pentru un produs SaaS real.
Are separarea corectă între:


UI


routing


validation


AI service


persistence


auth


tenant access


Are deja implementate:


dynamic widget per tenant


AI intake processing


Supabase persistence


magic link auth


tenant isolation


dashboard global și tenant-scoped


Din acest punct, produsul poate evolua sănătos spre:


widget embedabil


operator inbox


WhatsApp Business Platform complet


multilingual conversations



Ce s-a făcut după această etapă
După fundația inițială, au fost adăugate mai multe straturi importante care transformă aplicația dintr-un MVP intern într-un produs mai apropiat de SaaS real.
Cele mai importante direcții finalizate sau începute sunt:


polish UX / auth dashboard


protejarea homepage-ului intern


separarea clară între user nelogat și user fără membership


protecție admin dashboard pe bază de rol


status workflow pentru intake-uri


admin UI pentru tenant_memberships


pregătirea widgetului pentru embed real


script public dispatch-widget.js


comunicare iframe → parent cu postMessage



1. Metadata și fonturi
Problema inițială
În app/layout.tsx, metadata era încă default:
export const metadata: Metadata = {  title: "Create Next App",  description: "Generated by create next app",};
Asta însemna că aplicația încă arăta ca boilerplate Next.js la nivel de browser title / SEO / branding.
În plus, deși fonturile Geist erau configurate în layout, în globals.css exista:
body {  background: var(--background);  color: var(--foreground);  font-family: Arial, Helvetica, sans-serif;}
Asta anula practic fontul Geist.
Ce s-a decis
Metadata trebuie schimbată în ceva specific produsului:
export const metadata: Metadata = {  title: "Dispatch AI",  description:    "Multi-tenant multilingual intake and dispatch platform for WhatsApp-based operations.",};
Iar globals.css trebuie să nu mai forțeze Arial:
body {  background: var(--background);  color: var(--foreground);}
Rolul acestei modificări
Această modificare nu schimbă logica aplicației, dar este importantă pentru maturizarea produsului.
Aplicația nu mai arată ca un proiect generat automat. Devine mai coerentă ca produs.

2. Login UX polish
Problema inițială
Pagina login/page.tsx funcționa, dar era minimă.
Avea:


input email


submit magic link


mesaj de succes


Dar lipseau:


afișare eroare


validare email


loading state mai clar


feedback dacă Supabase returnează eroare


Ce s-a făcut
Login-ul a fost refactorizat ca să includă:


success


errorMessage


validare basic email


resetarea mesajelor la schimbarea inputului


disabled state pe input și button


try/catch în jurul flow-ului Supabase


Flow-ul logic devine:
user introduce email↓se validează emailul↓se trimite magic link prin Supabase↓dacă reușește → mesaj de succes↓dacă eșuează → mesaj de eroare vizibil
Importanță
Asta face login-ul utilizabil real, nu doar funcțional tehnic.

3. Separarea corectă între user nelogat și user fără membership
Problema inițială
În getCurrentUserTenant(), situațiile erau tratate generic:
if (!user) return null;if (!data) return null;
Asta însemna că două cazuri complet diferite arătau identic:
user nelogatuser logat, dar fără membership
În requireTenantAccess(), orice null ducea la:
redirect("/login");
Asta era incorect.
Un user logat, dar fără tenant, nu trebuie trimis la login. Trebuie trimis la /unauthorized.
Noua logică
getCurrentUserTenant() a fost schimbat conceptual să întoarcă statusuri clare:
return {  status: "no-user" as const,};
sau:
return {  status: "no-membership" as const,  user,};
sau:
return {  status: "ok" as const,  user,  membership: data,};
Ce înseamnă asta
Acum aplicația poate diferenția corect:
no-user        → /loginno-membership → /unauthorizedok            → continuă
Rolul în arhitectură
Acesta este un pas foarte important pentru tenant isolation.
Nu mai există ambiguitate între:


autentificare


autorizare


membership tenant



4. requireTenantAccess() refactorizat
Rolul lui
requireTenantAccess(companySlug) este helperul care protejează dashboardul per tenant:
/dashboard/pedrotti/intakes/dashboard/hotel-lago/intakes
Logica actuală corectă
Helperul trebuie să facă:
1. dacă userul nu este logat → /login2. dacă userul e logat dar nu are membership → /unauthorized3. dacă userul are membership, dar pentru alt tenant → /unauthorized4. dacă userul are acces la tenant → return result
Cod conceptual:
if (result.status === "no-user") {  redirect("/login");}if (result.status === "no-membership") {  redirect("/unauthorized");}if (result.membership.company_slug !== companySlug) {  redirect("/unauthorized");}return result;
De ce este important
Asta face ca tenant dashboardul să nu fie doar „filtrat vizual”, ci protejat real.
Un user Pedrotti nu poate accesa dashboardul Hotel Lago doar schimbând URL-ul.

5. Protecție admin dashboard pe bază de rol
Problema inițială
Pagina globală:
/dashboard/intakes
afișa toate intake-urile din toți tenantii.
Inițial, ea era protejată doar cu:
const user = await getCurrentUser();if (!user) {  redirect("/login");}
Asta însemna că orice user logat putea vedea toate requesturile globale dacă știa ruta.
Ce s-a decis
Pentru dashboard global trebuie verificat:
role === "admin"
din tabela:
tenant_memberships
Noua logică
/dashboard/intakes folosește getCurrentUserTenant():
no-user        → /loginno-membership → /unauthorizedrole !== admin → /unauthorizedrole === admin → acces permis
Importanță
Asta separă clar:
platform admin dashboardtenant dashboard
și pregătește terenul pentru roluri mai avansate:


admin


operator


manager


readonly



6. Redirect după login și rolul de admin
Situația observată
După login, chiar dacă userul avea:
role = admin
era trimis la:
/dashboard/pedrotti/intakes
De ce?
Pentru că app/auth/callback/route.ts citea doar:
.select("company_slug")
și apoi redirecționa mereu spre tenant dashboard:
/dashboard/${company_slug}/intakes
Corecția necesară
Callback-ul trebuie să citească și rolul:
.select("company_slug, role")
Apoi:
if (data.role === "admin") {  return NextResponse.redirect(new URL("/dashboard/intakes", req.url));}return NextResponse.redirect(  new URL(`/dashboard/${data.company_slug}/intakes`, req.url));
Flow corect
magic link login↓Supabase exchangeCodeForSession↓get user↓lookup tenant_memberships↓dacă role admin → /dashboard/intakes↓altfel → /dashboard/[companySlug]/intakes
De ce contează
Adminul trebuie să ajungă natural în zona globală, nu în dashboardul unui singur tenant.

7. Homepage-ul intern nu mai trebuie să fie public
Problema
URL-ul public al deploymentului:
https://multilingual-dispatch-flow.vercel.app/
afișa direct pagina:
Admin / Dev Control Panel
Oricine avea URL-ul putea vedea hub-ul intern.
Chiar dacă linkurile spre dashboard cereau auth, homepage-ul în sine era public.
Ce trebuie făcut
app/page.tsx trebuie protejat cu getCurrentUserTenant().
Flow:
no-user        → /loginno-membership → /unauthorizedok            → afișează Admin / Dev Control Panel
Rolul acestei modificări
Aplicația Dispatch AI este produsul intern/admin, nu site public.
Widgetul rămâne public, dar hub-ul intern trebuie protejat.

8. Supabase Auth redirect URL în producție
Problema observată
După login în producție, magic link-ul ducea la:
http://localhost:3000/?code=...
în loc de:
https://multilingual-dispatch-flow.vercel.app/auth/callback
Cauza
În Supabase Auth URL Configuration, redirect URL-ul era încă setat pentru development.
Config corect
În Supabase:
Authentication → URL Configuration
Trebuie setat:
Site URL:https://multilingual-dispatch-flow.vercel.app
și în redirect URLs:
https://multilingual-dispatch-flow.vercel.app/auth/callbackhttp://localhost:3000/auth/callback
Relația cu codul
În login/page.tsx, magic link-ul folosește:
emailRedirectTo: `${window.location.origin}/auth/callback`
În producție, window.location.origin devine:
https://multilingual-dispatch-flow.vercel.app
Deci codul este bun. Problema era în configul Supabase.

9. Cum se leagă emailul de tenant_memberships
Clarificare importantă
Emailul nu este cheia principală în tenant_memberships.
Legătura se face prin:
Supabase Auth user.id
Nu prin email.
Flow:
user introduce email↓Supabase Auth autentifică userul↓Supabase returnează user.id↓aplicația caută tenant_memberships.user_id = user.id↓găsește company_slug + role
Exemplu
În DB:
{  "user_id": "48ca461e-bf47-4273-80f7-75020e578c90",  "company_slug": "pedrotti",  "role": "admin"}
Acel user_id trebuie să fie identic cu id din:
Supabase → Authentication → Users
Ce înseamnă practic
Pentru MVP, userul trebuie:


să facă login o dată, ca să existe în Supabase Auth


adminul să îi creeze membership în tenant_memberships



10. Admin UI pentru tenant_memberships
De ce a fost necesar
Inițial, adăugarea unui user în tenant se făcea manual din Supabase SQL/Table Editor.
Asta este ok pentru development, dar nu este ok pentru produs.
De aceea s-a propus un Admin UI:
/dashboard/admin/memberships
Scopul lui
Permite unui admin să:


vadă membership-urile existente


adauge useri în tenant


seteze roluri


evite inserări manuale în Supabase


Structură propusă
Helper admin guard
Fișier:
lib/auth/require-platform-admin.ts
Rol:
permite acces doar dacă userul este logat și are role admin
Flow:
no-user        → /loginno-membership → /unauthorizedrole !== admin → /unauthorizedrole === admin → ok
API route
Fișier:
app/api/admin/tenant-memberships/route.ts
Rol:


GET listează membership-urile


POST creează/updat-ează membership


Cum funcționează POST-ul
Primește:
{  "email": "operator@company.com",  "companySlug": "pedrotti",  "role": "operator"}
Apoi:


verifică dacă userul curent este admin


validează email, companySlug, role


caută userul în Supabase Auth după email


dacă există, ia authUser.id


face upsert în tenant_memberships


De ce userul trebuie să fi făcut login o dată
Pentru că userul trebuie să existe în Supabase Auth.
Altfel nu avem user.id.
Constraint DB necesar
Pentru upsert corect:
alter table tenant_membershipsadd constraint tenant_memberships_user_company_uniqueunique (user_id, company_slug);
Asta previne duplicate de tip:
același user + același tenant de mai multe ori

11. Admin tools în dashboardul global
Problema
Chiar dacă există ruta:
/dashboard/admin/memberships
nu este UX bun ca adminul să trebuiască să o țină minte manual.
Soluția
În:
/dashboard/intakes
se adaugă secțiunea:
Admin tools
cu link spre:
Manage memberships
Flow nou
login ca admin↓/dashboard/intakes↓Admin tools↓Manage memberships↓/dashboard/admin/memberships
De ce nu redirect direct spre memberships?
Pentru că admin dashboardul va conține mai multe zone:


global intakes


memberships


tenant settings


widget config


analytics


operator management


Deci /dashboard/intakes rămâne un hub mai bun pentru admin.

12. Status workflow pentru intake-uri
Problema inițială
Dashboardul lista intake-uri, dar nu puteai face nimic cu ele.
Era util pentru debugging, dar nu era încă un instrument operațional.
Ce s-a adăugat
S-a introdus conceptul de status pentru fiecare intake.
Statusuri minime:
newin_progressresolved
Modificare DB
În Supabase SQL Editor:
alter table emergency_intakesadd column status text not null default 'new';alter table emergency_intakesadd column updated_at timestamptz default now();alter table emergency_intakesadd column resolved_at timestamptz;
Rolul fiecărei coloane
status
Indică etapa curentă a requestului:
new          → tocmai primitin_progress  → operatorul a început să lucrezeresolved     → cazul a fost închis
updated_at
Când a fost modificat ultima dată statusul.
resolved_at
Când a fost rezolvat intake-ul.
Este null până la status resolved.

13. Update TypeScript pentru IntakeRow
În lib/dashboard/intakes.ts, tipul IntakeRow trebuie extins:
status: "new" | "in_progress" | "resolved";updated_at: string | null;resolved_at: string | null;
De ce contează
Dashboardul are nevoie să știe statusul pentru:


badge UI


butoane


filtrare viitoare


analytics


operator workflow



14. API pentru update status
Fișier nou
app/api/intakes/[id]/status/route.ts
Rol
Primește un request PATCH și schimbă statusul unui intake.
Flow API
client apasă Start / Resolve↓fetch PATCH /api/intakes/[id]/status↓API validează statusul↓update în Supabase↓return { ok: true }
Validare status
API-ul acceptă doar:
newin_progressresolved
Dacă primește altceva:
return NextResponse.json(  { error: "Invalid status" },  { status: 400 });
Update DB
Pentru orice status:
updated_at: new Date().toISOString()
Pentru resolved:
resolved_at: new Date().toISOString()
Observație importantă
În forma MVP, API-ul folosește supabaseAdmin.
Asta funcționează, dar trebuie protejat cu auth/tenant/role înainte de producție serioasă.
Corect ar fi:


admin poate modifica orice intake


operator poate modifica doar intake-urile tenantului său


readonly nu poate modifica



15. IntakeCard refactorizat în client component
De ce a devenit client component
Inițial IntakeCard era server component simplu.
Pentru butoane interactive:


Mark new


Start


Resolve


a trebuit să devină client component:
"use client";
State-uri noi
Componenta are acum:
const [status, setStatus] = useState<IntakeStatus>(intake.status);const [loadingStatus, setLoadingStatus] = useState<IntakeStatus | null>(null);const [errorMessage, setErrorMessage] = useState("");
Ce face fiecare
status
Ține statusul local al cardului după update, fără reload.
loadingStatus
Știe care status se actualizează în momentul respectiv.
Ex:
loadingStatus = "resolved"
înseamnă că butonul Resolve poate afișa:
Updating...
errorMessage
Afișează eroarea local pe card dacă API-ul eșuează.

16. updateStatus() în IntakeCard
Funcția:
const updateStatus = async (nextStatus: IntakeStatus) => {  if (nextStatus === status) return;  setLoadingStatus(nextStatus);  setErrorMessage("");  try {    const res = await fetch(`/api/intakes/${intake.id}/status`, {      method: "PATCH",      headers: {        "Content-Type": "application/json",      },      body: JSON.stringify({ status: nextStatus }),    });    if (!res.ok) {      const errorData = await res.json().catch(() => null);      throw new Error(errorData?.error || "Failed to update status.");    }    setStatus(nextStatus);  } catch (error) {    setErrorMessage(...);  } finally {    setLoadingStatus(null);  }};
Rol
Schimbă statusul în DB și actualizează UI-ul local.
Nu mai folosește:
window.location.reload()
Deci UX-ul este mai bun.

17. Status badge în IntakeCard
S-a adăugat badge vizual pentru status.
Funcție:
function getStatusClasses(status: IntakeStatus) {  switch (status) {    case "new":      return "bg-blue-100 text-blue-700";    case "in_progress":      return "bg-yellow-100 text-yellow-700";    case "resolved":      return "bg-green-100 text-green-700";    default:      return "bg-zinc-100 text-zinc-700";  }}
Rol
Operatorul vede rapid starea fiecărui intake.

18. Widget embed — conceptul final
Situația inițială
Widgetul era disponibil doar ca pagină internă:
/widget/pedrotti/widget/hotel-lago
Asta era bun pentru preview, dar nu pentru SaaS instalabil.
Ce se dorește
Un client precum Pedrotti să poată pune în site-ul lui:
<Script  src="https://multilingual-dispatch-flow.vercel.app/dispatch-widget.js"  data-company="pedrotti"  data-button-text="Need roadside help?"  data-accent-color="#dc2626"  strategy="afterInteractive"/>
și automat să apară:


floating button


modal


iframe cu widgetul


AI intake flow


WhatsApp deep link



19. Embed mode pentru widget page
Ruta normală
/widget/pedrotti
Afișează pagina de preview internă:


heading


descriere


container mare


widget


Ruta embed
/widget/pedrotti?embed=true
Afișează doar widgetul, fără wrapper mare.
De ce este necesar
Iframe-ul din site-ul Pedrotti trebuie să încarce o versiune compactă, nu pagina internă de preview.
Flow:
dispatch-widget.js↓creează iframe↓iframe.src = /widget/pedrotti?embed=true↓se afișează doar widgetul

20. public/dispatch-widget.js
Rol
Acesta este scriptul instalabil pe site-ul clientului.
Este fișier static servit din public.
URL:
https://multilingual-dispatch-flow.vercel.app/dispatch-widget.js
Ce face scriptul
La încărcare:


citește <script>-ul curent


citește data-company


detectează baseUrl


creează floating button


creează overlay/modal


creează iframe către widget


atașează evenimente open/close


ascultă postMessage din iframe



21. De ce baseUrl se deduce din script.src
Problema
Pedrotti este pe:
https://pedrotti-demo.vercel.app
Dispatch AI este pe:
https://multilingual-dispatch-flow.vercel.app
Dacă scriptul ar folosi:
window.location.origin
atunci, pe site-ul Pedrotti, ar primi:
https://pedrotti-demo.vercel.app
și ar încerca să deschidă:
https://pedrotti-demo.vercel.app/widget/pedrotti
Greșit.
Soluția corectă
Scriptul citește propriul său URL:
var scriptUrl = new URL(script.src);var defaultBaseUrl = scriptUrl.origin;
Dacă scriptul este încărcat din:
https://multilingual-dispatch-flow.vercel.app/dispatch-widget.js
atunci defaultBaseUrl devine:
https://multilingual-dispatch-flow.vercel.app
Deci iframe-ul corect este:
https://multilingual-dispatch-flow.vercel.app/widget/pedrotti?embed=true
Concluzie
Pedrotti este doar site-ul gazdă.
Dispatch AI este motorul real.

22. Parametrii scriptului embed
Exemplu pentru Pedrotti:
<Script  src="https://multilingual-dispatch-flow.vercel.app/dispatch-widget.js"  data-company="pedrotti"  data-button-text="Need roadside help?"  data-accent-color="#dc2626"  strategy="afterInteractive"/>
src
De unde se încarcă loaderul.
În producție:
https://multilingual-dispatch-flow.vercel.app/dispatch-widget.js
data-company
Alege tenantul:
pedrottihotel-lago
Scriptul va deschide:
/widget/pedrotti?embed=true
data-button-text
Textul butonului floating.
Ex:
Need roadside help?
data-accent-color
Culoarea butonului.
Pentru Pedrotti:
#dc2626
data-base-url
Nu mai este necesar în mod normal.
Poate rămâne doar ca override pentru debugging.

23. Integrare în Pedrotti Next.js
Pentru că Pedrotti este făcut în Next.js, nu este ideal să folosești direct tag HTML <script>.
Corect este să folosești:
import Script from "next/script";
și apoi în layout:
<Script  src="https://multilingual-dispatch-flow.vercel.app/dispatch-widget.js"  data-company="pedrotti"  data-button-text="Need roadside help?"  data-accent-color="#dc2626"  strategy="afterInteractive"/>
Unde se pune
În Pedrotti:
app/layout.tsx
dacă vrei widgetul pe tot site-ul.
Sau într-o pagină specifică dacă vrei doar pe anumite pagini.
Recomandare
Pentru Pedrotti, varianta globală este cea mai bună.
Widgetul trebuie să fie accesibil de oriunde.

24. Modal + iframe architecture
De ce iframe
S-a ales varianta iframe pentru MVP.
Avantaje:


izolare CSS


izolare JS


site-ul Pedrotti nu interferează cu widgetul


widgetul rămâne în aplicația Dispatch AI


deployment independent


Flow complet
user intră pe pedrotti-demo.vercel.app↓Next.js încarcă Script↓scriptul creează floating button↓user apasă buton↓se deschide overlay/modal↓iframe încarcă:https://multilingual-dispatch-flow.vercel.app/widget/pedrotti?embed=true↓user completează formularul↓Dispatch AI API procesează intake-ul↓OpenAI generează summary↓Supabase salvează intake-ul↓se deschide WhatsApp

25. Close button în iframe cu postMessage
Problema
Widgetul are buton X, dar în embed mode el trăiește în iframe.
Iframe-ul nu poate modifica direct DOM-ul părintelui în mod sigur.
Deci widgetul trebuie să trimită un mesaj către pagina părinte.
În EmergencyIntakeWidget.tsx
Se adaugă un helper:
const handleClose = () => {  if (onClose) {    onClose();    return;  }  if (typeof window !== "undefined" && window.parent !== window) {    window.parent.postMessage(      { type: "dispatch-ai-close-widget" },      "*"    );  }};
Ce face


Dacă widgetul este folosit intern cu onClose, folosește callback-ul.


Dacă este în iframe, trimite mesaj la parent.


Parentul primește mesajul și închide modalul.


În dispatch-widget.js
Există listener:
window.addEventListener("message", function (event) {  if (event.data && event.data.type === "dispatch-ai-close-widget") {    closeWidget();  }});
Flow
user apasă X în widget↓iframe trimite postMessage↓dispatch-widget.js primește mesajul↓rulează closeWidget()↓overlay dispare↓floating button reapare

26. Observație de securitate pentru postMessage
În MVP, mesajul folosește:
"*"
Este ok temporar, dar în producție se poate îmbunătăți prin verificarea originului.
Mai târziu:


widgetul poate primi allowedOrigin


scriptul poate valida event.origin


embed config poate controla domeniile permise


Pentru MVP, scopul este funcționalitatea.

27. Rute publice vs rute private
Rute care trebuie să rămână publice
Acestea sunt necesare pentru vizitatorii Pedrotti:
/dispatch-widget.js/widget/pedrotti/widget/pedrotti?embed=true/api/emergency-intake
Vizitatorul final nu trebuie să se logheze.
Rute care trebuie protejate
Acestea sunt interne:
//dashboard/dashboard/intakes/dashboard/[companySlug]/intakes/dashboard/admin/memberships
De ce contează
Dacă protejezi tot site-ul indiscriminat, widgetul nu va mai merge pe site-uri externe.
Trebuie separare clară:
public intake surfaceprivate operator/admin surface

28. Rolurile actuale
Momentan tenant_memberships.role poate susține:
adminoperatormanagerreadonly
Dar în cod, rolul este folosit în principal pentru:
admin dashboard accessadmin memberships UI
Ce va urma
Mai târziu se poate face:
admin


vede toate tenanturile


gestionează users


gestionează config


vede global analytics


operator


vede doar tenantul lui


poate marca intake-uri ca in_progress/resolved


manager


vede tenant dashboard


vede analytics tenant


poate gestiona operatori din tenant


readonly


vede date


nu poate modifica status



29. Stadiul actual al dashboardului
Dashboardul este acum mai mult decât o listă.
Are:


intake list


priority badge


language


AI summary


status badge


status update actions


admin tools


user bar


logout


Ce încă nu este
Nu este încă operator inbox complet.
Lipsesc:


filtre status


assignment operator


timeline / notes


thread-uri conversaționale


WhatsApp inbound messages


translation inline


Dar acum există primul workflow operațional:
new → in_progress → resolved

30. Ce urmează imediat după widget embed
După finalizarea completă a embedului, backlogul corect este:
Tenant settings
UI unde adminul poate configura:


company name


company slug


WhatsApp number


operator language


accent color


use case


geolocation on/off


Asta ar înlocui treptat widgetConfigs static.
Widget config
Setări specifice embedului:


button text


position bottom-right / bottom-left


accent color


allowed domains


embed enabled/disabled


custom greeting


use case fields


Analytics
Metrics utile:


total intakes


intakes per tenant


intakes by language


high priority count


resolved vs unresolved


average time to resolve


Operator management
Admin UI pentru:


adăugare operatori


roluri


tenant access


deactivate user


schimbare role



31. Concluzie actualizată
În acest moment, Dispatch AI a depășit faza de simplu demo.
Produsul are deja:


aplicație Next.js structurată


intake AI flow


prompturi diferite pe use case


Supabase persistence


dashboard global


dashboard tenant-scoped


magic link auth


tenant isolation


role-based access pentru admin


status workflow pentru intake-uri


admin UI planificat/în curs pentru memberships


homepage intern protejat


embed mode pentru widget


script public pentru instalare pe site extern


iframe modal architecture


postMessage pentru close behavior


Cea mai importantă tranziție făcută după etapa inițială este aceasta:
/widget/pedrotti ca pagină internă↓dispatch-widget.js ca script instalabil↓iframe embed în site extern
Aceasta este tranziția care transformă proiectul din:
aplicație internă de test
în:
produs SaaS instalabil pe site-uri reale
Următorul milestone major este finalizarea și testarea completă a widgetului embed pe:
https://pedrotti-demo.vercel.app
iar după aceea urmează mutarea treptată a configurației din cod în DB, prin:


Tenant settings


Widget config


Operator management


Analytics

32. Schimbare importantă: trecere la model enterprise de roluri
După discuția despre roluri, s-a decis că modelul inițial nu era suficient de curat.
Inițial, tenant_memberships.role conținea inclusiv:
adminmanageroperatorreadonly
Problema era că admin era folosit cu două sensuri diferite:
admin al platformei Dispatch AI
și
admin / manager al unui client, de exemplu Pedrotti
Asta nu este ideal pentru un SaaS multi-tenant.

Decizia luată
S-a trecut la model enterprise cu două niveluri separate:
platform_admins
și
tenant_memberships

33. Tabela platform_admins
Această tabelă este pentru tine / echipa Dispatch AI.
Ea controlează cine are acces global la platformă.
SQL:
create table platform_admins (  id bigserial primary key,  user_id uuid not null unique,  role text not null check (    role in ('owner', 'admin', 'support')  ),  created_at timestamptz not null default now());
Exemplu:
{  "user_id": "48ca461e-bf47-4273-80f7-75020e578c90",  "role": "owner"}

Rolul acestei tabele
Un user din platform_admins poate avea acces la:


dashboard global


toate intake-urile


tenant settings


membership management


widget configuration viitor


analytics globale viitoare


suport tehnic pentru clienți


Acest user nu este „manager Pedrotti”.
Este:
platform owner / platform admin

34. Tabela tenant_memberships după separare
Această tabelă rămâne pentru clienți.
Ea spune:
ce user aparține cărui tenant și cu ce rol
Exemplu:
{  "user_id": "48ca461e-bf47-4273-80f7-75020e578c90",  "company_slug": "pedrotti",  "role": "manager"}

Roluri permise acum în tenant_memberships
După separare, tenant_memberships nu mai trebuie să folosească admin.
Rolurile corecte sunt:
manageroperatorreadonly

Diferența clară
platform_admins.role = owner/admin/support
înseamnă acces la platforma Dispatch AI.
tenant_memberships.role = manager/operator/readonly
înseamnă acces la un tenant concret, cum ar fi Pedrotti.

35. Userul tău poate exista în ambele tabele
S-a clarificat că este perfect posibil ca același user_id să existe în ambele tabele.
Exemplu:
platform_admins:gradin_g@yahoo.com → owner
și:
tenant_memberships:gradin_g@yahoo.com → pedrotti → manager
Asta înseamnă:


ai acces global ca owner al platformei


ai și acces tenant Pedrotti, dacă vrei să testezi experiența tenantului


Dar cele două accesuri sunt conceptual diferite.

36. Helper nou: getCurrentPlatformAdmin
A fost introdus conceptul de helper separat pentru platform admin.
Fișier:
lib/auth/get-platform-admin.ts
Cod:
import { getCurrentUser } from "./get-user";import { supabaseAdmin } from "@/lib/supabase";export async function getCurrentPlatformAdmin() {  const user = await getCurrentUser();  if (!user) {    return {      status: "no-user" as const,    };  }  const { data, error } = await supabaseAdmin    .from("platform_admins")    .select("role")    .eq("user_id", user.id)    .maybeSingle();  if (error) {    throw error;  }  if (!data) {    return {      status: "not-platform-admin" as const,      user,    };  }  return {    status: "ok" as const,    user,    platformAdmin: data,  };}

Ce face acest helper
Acest helper răspunde la întrebarea:
userul logat este admin al platformei Dispatch AI?
Nu răspunde la întrebarea:
userul are acces la tenantul Pedrotti?
Aceasta este o separare importantă.

Cazurile tratate
1. User nelogat
status: "no-user"
Asta înseamnă redirect la:
/login

2. User logat, dar nu este platform admin
status: "not-platform-admin"
Exemplu:
manager Pedrotti
Acest user nu poate vedea dashboard global.

3. User logat și platform admin
status: "ok"
Exemplu:
tu ca owner Dispatch AI
Acest user poate vedea zona globală.

37. Refactor requirePlatformAdmin
Fișier:
lib/auth/require-platform-admin.ts
Cod:
import { redirect } from "next/navigation";import { getCurrentPlatformAdmin } from "./get-platform-admin";export async function requirePlatformAdmin() {  const result = await getCurrentPlatformAdmin();  if (result.status === "no-user") {    redirect("/login");  }  if (result.status === "not-platform-admin") {    redirect("/unauthorized");  }  return result;}

Rol
Acest helper protejează toate paginile globale ale platformei.
Exemple:
/dashboard/intakes/dashboard/admin/memberships/dashboard/admin/tenant-settings/dashboard/admin/analytics

Ce NU protejează
Nu este folosit pentru dashboard tenant-scoped:
/dashboard/pedrotti/intakes
Acolo rămâne corect:
requireTenantAccess(companySlug)

38. Refactor flow login în auth/callback
După modelul enterprise, callback-ul de auth trebuie să decidă între două tipuri de acces:
platform admin
sau
tenant member

Flow nou
user apasă magic link↓/auth/callback primește code↓exchangeCodeForSession(code)↓getUser()↓verifică platform_admins↓dacă există → /dashboard/intakes↓dacă nu există → verifică tenant_memberships↓dacă există → /dashboard/[companySlug]/intakes↓dacă nu există → /unauthorized

Cod relevant
const { data: platformAdmin } = await supabaseAdmin  .from("platform_admins")  .select("role")  .eq("user_id", user.id)  .maybeSingle();if (platformAdmin) {  return NextResponse.redirect(    new URL("/dashboard/intakes", req.url)  );}
Asta înseamnă:
dacă userul este owner/admin/support al platformei, merge în dashboard global
Apoi:
const { data: membership } = await supabaseAdmin  .from("tenant_memberships")  .select("company_slug, role")  .eq("user_id", user.id)  .limit(1)  .maybeSingle();if (!membership) {  return NextResponse.redirect(    new URL("/unauthorized", req.url)  );}
Dacă nu este platform admin, se caută membership tenant.
Dacă există:
return NextResponse.redirect(  new URL(    `/dashboard/${membership.company_slug}/intakes`,    req.url  ));

Importanță
Această logică face separarea completă:
tu ca platform owner → dashboard globalPedrotti manager → dashboard PedrottiPedrotti operator → dashboard Pedrottiuser fără acces → unauthorized

39. Refactor /dashboard/intakes
Dashboardul global nu mai trebuie să folosească tenant_memberships.role === admin.
Acum trebuie să folosească:
requirePlatformAdmin()

Rolul paginii
Ruta:
/dashboard/intakes
este acum:
Platform Admin Dashboard
Nu este dashboard de client.

Ce vede platform admin-ul


toate intake-urile din toate tenanturile


admin tools


manage memberships


tenant settings


viitor analytics


viitor widget config



Cod relevant
const result = await requirePlatformAdmin();
Asta blochează orice user care nu există în platform_admins.

User bar
În dashboard global, DashboardUserBar primește:
<DashboardUserBar  email={result.user.email ?? "Unknown user"}  tenantLabel={`Platform ${result.platformAdmin.role}`}/>
Exemplu afișare:
gradin_g@yahoo.comTenant: Platform owner
Deși textul spune Tenant, conceptual aici este mai degrabă contextul curent. Mai târziu ar fi bine ca DashboardUserBar să fie redenumit sau extins cu contextLabel.

40. Admin tools în dashboard global
În /dashboard/intakes a fost adăugată secțiunea:
Admin tools
Cu linkuri către:
/dashboard/admin/memberships/dashboard/admin/tenant-settings

De ce este important
Nu mai trebuie să ții minte rute manual.
Flow corect:
login ca platform owner↓/dashboard/intakes↓Admin tools↓Manage memberships / Tenant settings

41. Problema descoperită la memberships API după separarea enterprise
După trecerea la platform_admins, pagina UI afișa corect:
gradin_g@yahoo.comTenant: Platform Admin
Dar când încercai să creezi membership pentru Gmail, API-ul răspundea:
Unauthorized

Cauza
UI-ul era protejat corect cu requirePlatformAdmin.
Dar API-ul:
app/api/admin/tenant-memberships/route.ts
încă folosea vechea logică:
getCurrentUserTenant()
și verifica:
tenant_memberships.role === admin
Dar în noua arhitectură:
admin nu mai există în tenant_memberships
De aceea API-ul refuza requestul.

Fix corect
În API-ul de memberships trebuie folosit:
getCurrentPlatformAdmin()
nu:
getCurrentUserTenant()
Conceptual:
async function requireAdminApi() {  const current = await getCurrentPlatformAdmin();  if (current.status !== "ok") {    return null;  }  return current;}
Apoi în GET și POST:
const admin = await requireAdminApi();if (!admin) {  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });}

42. Membership management: problemă cu userii inexistenți
Inițial, admin UI pentru memberships cerea ca userul să fi fost logat măcar o dată.
Motivul era că membership-ul se creează pe baza:
user_id
nu pe email.
Dacă userul nu exista în Supabase Auth, nu aveam user_id.

Limitarea inițială
Flow vechi:
admin introduce email↓API caută user în Supabase Auth↓dacă userul există → creează membership↓dacă nu există → eroare:"The user must log in once first."

De ce nu e ideal
Pentru un SaaS real, clientul nu trebuie să știe acest detaliu tehnic.
Adminul ar trebui să poată adăuga un operator direct din UI.

43. Decizia: folosim inviteUserByEmail
S-a decis să implementăm logica corectă:
admin introduce email + tenant + role↓dacă userul există deja în Supabase Auth → creează membership↓dacă userul nu există → trimite invite email prin Supabase↓Supabase creează userul↓API creează membership pentru user_id-ul nou

Metoda folosită
supabaseAdmin.auth.admin.inviteUserByEmail(email, {  redirectTo: `${appUrl}/auth/callback`,});

Avantaj
Adminul poate invita useri fără ca aceștia să fi făcut login înainte.

Limitare temporară
Pentru că încă nu există SMTP custom pe domeniu propriu, invite email poate lovi în continuare:
email rate limit exceeded
Dar codul este corect și va rămâne valabil și după configurarea SMTP.

44. Rate limit email și SMTP
A apărut eroarea:
email rate limit exceeded
Aceasta vine de la Supabase Auth.

Cauza
Emailurile default Supabase sunt bune pentru development, dar au limitări stricte.
Magic links și invite emails consumă din aceleași limite de email.

Soluție corectă pe termen lung
Configurare custom SMTP cu un provider precum:


Resend


Postmark


SendGrid


Mailgun



De ce nu s-a făcut încă
Momentan proiectul este pe domeniu Vercel:
https://multilingual-dispatch-flow.vercel.app
Nu există încă domeniu propriu.
Iar pentru SMTP profesional ai nevoie de domeniu propriu, de exemplu:
dispatchflow.app
ca să poți trimite email de la:
no-reply@dispatchflow.app

Decizia luată
S-a decis să amânăm configurarea SMTP până la cumpărarea unui domeniu propriu.
Între timp, codul pentru invite user poate fi implementat, dar testarea trebuie făcută cu atenție pentru a nu lovi rate limit-ul.

45. Tenant settings: mutarea configului din cod în DB
După finalizarea widget embed, următorul pas a fost mutarea configurației tenantului din cod în DB.
Inițial exista:
lib/widget-config.ts
cu:
export const widgetConfigs: WidgetConfig[] = [  {    slug: "pedrotti",    companyName: "Pedrotti",    whatsappNumber: "40755741335",    operatorLanguage: "Italian",    accentColor: "#dc2626",    useCase: "roadside",    enableLocation: true,  },  ...];

Limitarea configurației statice
Pentru fiecare tenant nou trebuia:
modificare cod↓git push↓redeploy
Asta nu este SaaS real.

46. Tabela tenant_settings
S-a introdus tabela:
tenant_settings
SQL:
create table tenant_settings (  id bigserial primary key,  company_slug text not null unique,  company_name text not null,  whatsapp_number text not null,  operator_language text not null default 'English',  accent_color text,  use_case text not null check (    use_case in ('roadside', 'hotel')  ),  enable_location boolean not null default false,  created_at timestamptz not null default now());

Rolul fiecărui câmp
company_slug
Identificatorul tenantului.
Este folosit în rute:
/widget/pedrotti/dashboard/pedrotti/intakes
și în embed script:
data-company="pedrotti"

company_name
Numele vizibil în UI.
Exemplu:
Pedrotti

whatsapp_number
Numărul către care se deschide WhatsApp.
Format recomandat:
40755741335
fără +.

operator_language
Limba operatorului.
Momentan este păstrată ca metadata.
Mai târziu poate influența traduceri outbound/inbound.

accent_color
Culoarea de brand pentru widget.
Exemplu:
#dc2626

use_case
Controlează workflow-ul formularului.
Valori:
roadsidehotel

enable_location
Controlează dacă widgetul cere geolocation.
Pentru roadside:
true
Pentru hotel:
false

47. Seed pentru tenant_settings
Datele existente au fost migrate conceptual în DB:
insert into tenant_settings (  company_slug,  company_name,  whatsapp_number,  operator_language,  accent_color,  use_case,  enable_location)values(  'pedrotti',  'Pedrotti',  '40755741335',  'Italian',  '#dc2626',  'roadside',  true),(  'hotel-lago',  'Hotel Lago',  '40755741335',  'Italian',  '#2563eb',  'hotel',  false);

48. Refactor getWidgetConfigBySlug
Inițial:
export function getWidgetConfigBySlug(slug: string) {  return widgetConfigs.find((config) => config.slug === slug);}

Noua direcție
Funcția devine async și caută întâi în DB:
tenant_settings
Dacă nu găsește nimic, folosește fallback static.

De ce păstrăm fallback temporar
Pentru siguranță.
Dacă DB query eșuează sau tenantul nu există încă în DB, aplicația poate folosi în continuare widgetConfigs.
Este o tranziție safe.

Cod conceptual
export async function getWidgetConfigBySlug(  slug: string): Promise<WidgetConfig | undefined> {  const cleanSlug = slug.trim();  const { data, error } = await supabaseAdmin    .from("tenant_settings")    .select(      "company_slug, company_name, whatsapp_number, operator_language, accent_color, use_case, enable_location"    )    .eq("company_slug", cleanSlug)    .maybeSingle();  if (error) {    console.error("Failed to load tenant settings:", error);  }  if (data) {    return mapTenantSettingsToWidgetConfig(data as TenantSettingsRow);  }  return widgetConfigs.find((config) => config.slug === cleanSlug);}

Maparea DB → WidgetConfig
DB folosește snake_case:
company_slugcompany_namewhatsapp_number
Dar aplicația folosește camelCase:
slugcompanyNamewhatsappNumber
De aceea există o funcție de mapare:
function mapTenantSettingsToWidgetConfig(  row: TenantSettingsRow): WidgetConfig {  return {    slug: row.company_slug,    companyName: row.company_name,    whatsappNumber: row.whatsapp_number,    operatorLanguage: row.operator_language,    accentColor: row.accent_color ?? undefined,    useCase: row.use_case,    enableLocation: row.enable_location,  };}

49. app/widget/[companySlug]/page.tsx devine complet dinamic
Pentru că tenanturile vin din DB, nu mai are sens:
generateStaticParams()
Inițial, pagina putea fi static generată doar pentru tenanturile din widgetConfigs.
Dar acum un tenant poate fi creat în DB fără redeploy.

Modificare făcută
S-a scos:
export async function generateStaticParams() {  return widgetConfigs.map((config) => ({    companySlug: config.slug,  }));}
și s-a adăugat:
export const dynamic = "force-dynamic";

De ce este important
Acum ruta:
/widget/noul-tenant
poate funcționa imediat după ce tenantul este creat în DB.
Fără redeploy.

Flow nou
request /widget/pedrotti↓Next.js rulează server-side↓getWidgetConfigBySlug("pedrotti")↓query tenant_settings↓render widget

50. Admin UI pentru tenant_settings
După mutarea configului în DB, s-a creat planul și codul pentru UI de administrare:
/dashboard/admin/tenant-settings

Scop
Platform admin-ul poate configura tenantul fără să modifice codul.
Poate seta:


company slug


company name


WhatsApp number


operator language


accent color


use case


geolocation on/off



51. API pentru tenant settings
Fișier:
app/api/admin/tenant-settings/route.ts

GET
Listează toate tenant settings.
Protejat cu platform admin.
Flow:
request GET /api/admin/tenant-settings↓verifică platform admin↓query tenant_settings↓return tenants

POST
Creează sau actualizează un tenant.
Primește:
{  "companySlug": "pedrotti",  "companyName": "Pedrotti",  "whatsappNumber": "40755741335",  "operatorLanguage": "Italian",  "accentColor": "#dc2626",  "useCase": "roadside",  "enableLocation": true}
Face:
validare input↓upsert după company_slug↓return tenant

De ce upsert
Pentru că același formular servește atât pentru creare, cât și pentru update.
Dacă company_slug există deja:
update
Dacă nu există:
insert

52. Pagina dashboard/admin/tenant-settings
Fișier:
app/dashboard/admin/tenant-settings/page.tsx
Rol:


protejează pagina cu requirePlatformAdmin


afișează user bar


încarcă componenta client TenantSettingsAdmin



Flow
platform admin intră pe /dashboard/admin/tenant-settings↓requirePlatformAdmin()↓dacă ok → render page↓TenantSettingsAdmin se ocupă de listă + formular

53. Componenta TenantSettingsAdmin
Fișier:
components/admin/TenantSettingsAdmin.tsx
Este client component.

State principal
const [tenants, setTenants] = useState<TenantSetting[]>([]);const [companySlug, setCompanySlug] = useState("");const [companyName, setCompanyName] = useState("");const [whatsappNumber, setWhatsappNumber] = useState("");const [operatorLanguage, setOperatorLanguage] = useState("Italian");const [accentColor, setAccentColor] = useState("#dc2626");const [useCase, setUseCase] = useState<"roadside" | "hotel">("roadside");const [enableLocation, setEnableLocation] = useState(true);

Ce face
1. Listează tenant settings existente
Prin:
fetch("/api/admin/tenant-settings")

2. Permite editarea unui tenant
Când apeși pe un tenant din listă:
editTenant(tenant)
formularul se precompletează.

3. Permite creare/update
La submit:
fetch("/api/admin/tenant-settings", {  method: "POST",  body: JSON.stringify(...)})

De ce este important
Acum configurarea widgetului nu mai depinde de cod.
Platform admin-ul poate schimba rapid:


numărul WhatsApp


culoarea


tipul de workflow


geolocation



54. Link către Tenant Settings în Admin tools
În dashboardul global s-a adăugat link spre:
/dashboard/admin/tenant-settings
Alături de:
/dashboard/admin/memberships

Admin tools actuale
Manage membershipsTenant settings

Admin tools viitoare
Widget configAnalyticsOperator management

55. Clarificare despre Pedrotti site vs Dispatch AI dashboard
A existat o confuzie importantă:
Dacă widgetul este embedat pe site-ul Pedrotti, de ce nu apare și dashboardul acolo?
Răspuns:
nu trebuie să apară dashboardul pe site-ul Pedrotti

Cele două aplicații
Pedrotti site
https://pedrotti-demo.vercel.app
Aici există:


site public


floating widget button


modal iframe


intake form


Nu există:


dashboard


login operator


admin tools



Dispatch AI
https://multilingual-dispatch-flow.vercel.app
Aici există:


login


dashboard global


tenant dashboard


memberships


tenant settings


operator tools



Flow corect
Clientul final:
intră pe Pedrotti↓deschide widget↓trimite cerere↓nu se loghează
Operatorul:
intră pe Dispatch AI↓se loghează↓vede intake-uri↓lucrează requesturile
Aceasta este arhitectura corectă SaaS.

56. Problema cu dispatch-widget.js și base URL
A apărut o eroare:
GET https://pedrotti-demo.vercel.app/widget/pedrotti?embed=true 404

Cauza
Scriptul vechi folosea:
window.location.origin
Pe site-ul Pedrotti, asta înseamnă:
https://pedrotti-demo.vercel.app
Dar widgetul nu locuiește pe Pedrotti.
Widgetul locuiește pe:
https://multilingual-dispatch-flow.vercel.app

Soluția
Scriptul trebuie să deducă baza din propriul său URL:
var scriptUrl = new URL(script.src);var defaultBaseUrl = scriptUrl.origin;
Dacă scriptul este încărcat din:
https://multilingual-dispatch-flow.vercel.app/dispatch-widget.js
atunci defaultBaseUrl devine:
https://multilingual-dispatch-flow.vercel.app

Rezultatul corect
Iframe-ul trebuie să deschidă:
https://multilingual-dispatch-flow.vercel.app/widget/pedrotti?embed=true
nu:
https://pedrotti-demo.vercel.app/widget/pedrotti?embed=true

57. Integrare Pedrotti cu next/script
În Pedrotti, scriptul trebuie pus cu:
import Script from "next/script";
și în layout:
<Script  src="https://multilingual-dispatch-flow.vercel.app/dispatch-widget.js"  data-company="pedrotti"  data-button-text="Need roadside help?"  data-accent-color="#dc2626"  strategy="afterInteractive"/>

Observație importantă
Scriptul trebuie pus în interiorul <body>, nu după </body>.
Corect:
<body>  {children}  <Script    src="https://multilingual-dispatch-flow.vercel.app/dispatch-widget.js"    data-company="pedrotti"    data-button-text="Need roadside help?"    data-accent-color="#dc2626"    strategy="afterInteractive"  /></body>

58. Stadiu actual după toate modificările
În acest moment, produsul are o arhitectură mult mai clară.

Public surface
Accesibil pentru vizitatorii finali:
/dispatch-widget.js/widget/[companySlug]/widget/[companySlug]?embed=true/api/emergency-intake

Private tenant surface
Accesibil doar pentru useri din tenant_memberships:
/dashboard/[companySlug]/intakes

Private platform surface
Accesibil doar pentru useri din platform_admins:
/dashboard/intakes/dashboard/admin/memberships/dashboard/admin/tenant-settings

59. Model final actual
Tu / Dispatch AI owner
platform_admins:user_id = turole = owner
Acces:
/dashboard/intakes/dashboard/admin/*

Pedrotti manager
tenant_memberships:user_id = manager_pedrotticompany_slug = pedrottirole = manager
Acces:
/dashboard/pedrotti/intakes
Viitor:
/dashboard/pedrotti/users/dashboard/pedrotti/analytics

Pedrotti operator
tenant_memberships:user_id = operator_pedrotticompany_slug = pedrottirole = operator
Acces:
/dashboard/pedrotti/intakes
Poate marca statusuri.

Pedrotti readonly
tenant_memberships:user_id = readonly_usercompany_slug = pedrottirole = readonly
Acces viitor:
vede datenu modifică status

60. Ce mai trebuie ajustat în continuare
60.1 API memberships
Trebuie să fie complet refactorizat pe noua arhitectură:


platform admin poate crea membership pentru orice tenant


tenant manager va putea, în viitor, crea operatori doar pentru tenantul lui


admin nu mai trebuie să fie rol valid în tenant_memberships


dacă userul nu există, folosim inviteUserByEmail



60.2 API status intake
În forma actuală, status update trebuie întărit cu roluri:


platform admin poate modifica orice intake


manager/operator poate modifica doar tenantul lui


readonly nu poate modifica



60.3 Tenant manager UI
Trebuie creată o versiune tenant-scoped de user management.
Exemplu:
/dashboard/pedrotti/users
Acolo managerul Pedrotti poate adăuga:
operatorreadonly
dar nu poate adăuga:
platform admin
și nu poate crea users pentru:
hotel-lago

60.4 Tenant settings permissions
Momentan tenant_settings este platform-admin-only.
Mai târziu se poate decide dacă managerul tenantului poate edita anumite setări:


button text


culoare


maybe WhatsApp number


Dar probabil nu:


company slug


use case critic


billing


allowed domains



61. Concluzie actualizată după modelul enterprise
Dispatch AI a trecut de la un MVP multi-tenant funcțional la o arhitectură mult mai aproape de un SaaS enterprise.
Cea mai importantă schimbare a fost separarea între:
platform_admins
și:
tenant_memberships
Această separare clarifică:
cine administrează platforma
versus:
cine lucrează în tenantul unui client
Produsul are acum următoarele straturi:


public widget layer


AI intake layer


persistence layer


tenant dashboard layer


platform admin layer


role-based auth layer


DB-driven tenant settings


embeddable widget script


status workflow pentru intake-uri


Următorul pas tehnic logic este finalizarea/refactorizarea completă a:
app/api/admin/tenant-memberships/route.ts
ca să respecte noul model enterprise:
platform_admins → admin globaltenant_memberships → manager/operator/readonly tenant-scopedinviteUserByEmail → user onboarding fără login inițial