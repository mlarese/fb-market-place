# Guida Completa: Setup Facebook per Quofind Marketplace

**Versione:** 1.0
**Data:** 2025-12-11
**Livello:** Principiante
**Tempo stimato:** 2-3 ore

---

## Indice

1. [Prerequisiti](#1-prerequisiti)
2. [Creare un Account Facebook Developer](#2-creare-un-account-facebook-developer)
3. [Creare una Facebook App](#3-creare-una-facebook-app)
4. [Configurare le Impostazioni Base](#4-configurare-le-impostazioni-base)
5. [Creare una Pagina Facebook](#5-creare-una-pagina-facebook)
6. [Configurare Messenger Platform](#6-configurare-messenger-platform)
7. [Configurare i Webhooks](#7-configurare-i-webhooks)
8. [Ottenere i Token di Accesso](#8-ottenere-i-token-di-accesso)
9. [Configurare i Permessi](#9-configurare-i-permessi)
10. [Test e Verifica](#10-test-e-verifica)
11. [Passaggio in Produzione](#11-passaggio-in-produzione)
12. [Risoluzione Problemi Comuni](#12-risoluzione-problemi-comuni)
13. [Checklist Finale](#13-checklist-finale)

---

## 1. Prerequisiti

Prima di iniziare, assicurati di avere:

### Account e Risorse
- [ ] Un account Facebook personale (non business)
- [ ] Un indirizzo email valido
- [ ] Un numero di telefono per la verifica
- [ ] Un documento d'identita (potrebbe essere richiesto)

### Infrastruttura Tecnica
- [ ] Un dominio web (es. `quofind.com`)
- [ ] Un server con certificato SSL (HTTPS obbligatorio)
- [ ] Accesso alla configurazione DNS del dominio

### Documenti Legali (necessari per la review)
- [ ] Privacy Policy pubblicata (es. `https://quofind.com/privacy`)
- [ ] Termini di Servizio pubblicati (es. `https://quofind.com/terms`)

### Conoscenze Base
- Navigazione web
- Gestione di credenziali (conservare password/token in modo sicuro)
- Accesso base a un terminale (per test)

---

## 2. Creare un Account Facebook Developer

### Passo 2.1: Accedi al Portale Developer

1. Vai su **https://developers.facebook.com/**
2. Clicca su **"Inizia"** o **"Get Started"** in alto a destra
3. Se non sei loggato, effettua il login con il tuo account Facebook

### Passo 2.2: Accetta i Termini

1. Leggi e accetta i **Termini di Servizio di Facebook Platform**
2. Clicca su **"Continua"**

### Passo 2.3: Verifica il tuo Account

Facebook potrebbe chiederti di:
- Verificare il numero di telefono
- Verificare l'email
- In alcuni casi, caricare un documento d'identita

> **IMPORTANTE:** Completa tutte le verifiche richieste. Senza verifica completa, avrai limitazioni sulle funzionalita.

### Passo 2.4: Conferma la Registrazione

Una volta completata la verifica, vedrai la **Dashboard Developer**.

```
URL Dashboard: https://developers.facebook.com/apps/
```

---

## 3. Creare una Facebook App

### Passo 3.1: Avvia la Creazione

1. Dalla Dashboard, clicca su **"Crea App"** (o "Create App")
2. Comparira una schermata per scegliere il tipo di app

### Passo 3.2: Scegli il Tipo di App

Seleziona **"Business"** (o "Altro" > "Business"):

| Tipo | Quando usarlo |
|------|---------------|
| **Business** | Per integrazioni aziendali, Messenger, Webhooks - **SCEGLI QUESTO** |
| Consumer | Per app rivolte ai consumatori (gaming, social login) |
| None | Accesso base alle API |

Clicca **"Avanti"**

### Passo 3.3: Inserisci i Dettagli dell'App

Compila i campi:

| Campo | Valore | Note |
|-------|--------|------|
| **Nome App** | `Quofind Marketplace` | Nome visibile agli utenti |
| **Email di Contatto** | `tua-email@dominio.com` | Per comunicazioni da Facebook |
| **Account Business** | Seleziona o crea nuovo | Opzionale ma consigliato |

Clicca **"Crea App"**

### Passo 3.4: Completa la Verifica di Sicurezza

Facebook potrebbe chiederti di reinserire la password o completare un captcha.

### Passo 3.5: Prendi Nota dell'App ID

Dopo la creazione, verrai reindirizzato alla Dashboard dell'app.

**IMPORTANTE:** Prendi nota di questi valori:

```
App ID: 123456789012345 (esempio)
```

Trovi l'App ID in alto a sinistra nella dashboard.

---

## 4. Configurare le Impostazioni Base

### Passo 4.1: Vai alle Impostazioni

1. Nel menu a sinistra, clicca su **"Impostazioni"**
2. Seleziona **"Base"** (o "Basic")

### Passo 4.2: Compila le Informazioni Obbligatorie

| Campo | Valore | Note |
|-------|--------|------|
| **Nome visualizzato** | `Quofind Marketplace` | Gia compilato |
| **Dominio dell'App** | `quofind.com` | Il tuo dominio |
| **URL Privacy Policy** | `https://quofind.com/privacy` | **OBBLIGATORIO** |
| **URL Termini di Servizio** | `https://quofind.com/terms` | Consigliato |
| **Icona App** | Carica un'icona 1024x1024px | Per branding |

### Passo 4.3: Ottieni l'App Secret

1. Nella stessa pagina, trova **"App Secret"**
2. Clicca su **"Mostra"** (richiede password)
3. **COPIA E CONSERVA IN MODO SICURO** questo valore

```
App Secret: abc123def456... (NON condividere MAI)
```

> **ATTENZIONE SICUREZZA:**
> - L'App Secret e come una password master
> - NON inserirlo MAI nel codice frontend
> - Conservalo in AWS Secrets Manager o variabili ambiente sicure
> - Se compromesso, rigeneralo immediatamente

### Passo 4.4: Configura i Domini

Nella sezione **"Domini dell'app"**, aggiungi:
- `quofind.com`
- `www.quofind.com`
- `api.quofind.com`

### Passo 4.5: Salva le Modifiche

Clicca **"Salva modifiche"** in basso.

---

## 5. Creare una Pagina Facebook

Per usare Messenger e i Webhooks, hai bisogno di una **Pagina Facebook**.

### Passo 5.1: Crea una Nuova Pagina

1. Vai su **https://www.facebook.com/pages/create**
2. Scegli la categoria **"Azienda o brand"**

### Passo 5.2: Compila i Dettagli

| Campo | Valore |
|-------|--------|
| **Nome Pagina** | `Quofind Marketplace` |
| **Categoria** | `App` o `E-commerce` |
| **Descrizione** | Breve descrizione del servizio |

### Passo 5.3: Completa il Setup

1. Aggiungi un'immagine profilo (logo)
2. Aggiungi un'immagine di copertina
3. Compila le informazioni della pagina

### Passo 5.4: Prendi Nota del Page ID

1. Vai sulla pagina appena creata
2. Clicca su **"Impostazioni"** > **"Informazioni sulla pagina"**
3. Trova il **Page ID** (numero lungo)

```
Page ID: 987654321098765 (esempio)
```

Oppure dall'URL: `https://www.facebook.com/quofindmarketplace` > Il Page ID e nel codice sorgente o nelle impostazioni.

---

## 6. Configurare Messenger Platform

### Passo 6.1: Aggiungi il Prodotto Messenger

1. Torna alla **Dashboard dell'App** su developers.facebook.com
2. Nel menu a sinistra, clicca su **"Aggiungi prodotto"**
3. Cerca **"Messenger"**
4. Clicca **"Configura"**

### Passo 6.2: Collega la Pagina

1. Nella sezione **"Token di accesso"** (o "Access Tokens")
2. Clicca **"Aggiungi o rimuovi pagine"**
3. Segui il flusso per collegare la pagina `Quofind Marketplace`
4. Concedi tutti i permessi richiesti

### Passo 6.3: Genera il Page Access Token

1. Dopo aver collegato la pagina, vedrai la pagina nell'elenco
2. Clicca su **"Genera token"**
3. **COPIA E CONSERVA** questo token

```
Page Access Token: EAABcd123...xyz789 (molto lungo, conservalo in modo sicuro)
```

> **NOTA:** Questo token iniziale e di breve durata (~2 ore). Piu avanti lo convertiremo in un token permanente.

### Passo 6.4: Configura le Impostazioni Messenger

Nella sezione Messenger, configura:

| Impostazione | Valore |
|--------------|--------|
| **Messaggi** | Attivato |
| **Risposte automatiche** | Come preferisci |

---

## 7. Configurare i Webhooks

I Webhooks permettono a Facebook di inviare notifiche al tuo server quando avvengono eventi (nuovi messaggi, post, ecc.).

### Passo 7.1: Prepara il tuo Endpoint

Prima di configurare Facebook, il tuo server deve avere un endpoint pronto.

**URL Webhook:** `https://api.quofind.com/webhook/facebook`

Il tuo endpoint deve:
1. Essere raggiungibile pubblicamente
2. Usare HTTPS (certificato SSL valido)
3. Rispondere correttamente alle richieste di verifica

### Passo 7.2: Crea un Verify Token

Crea una stringa segreta casuale che userai per verificare che le richieste vengano da Facebook:

```
VERIFY_TOKEN: quofind_webhook_verify_2025_secure_string
```

Genera una stringa sicura (puoi usare un generatore di password).

### Passo 7.3: Implementa l'Endpoint di Verifica

Il tuo server deve gestire le richieste GET per la verifica:

```javascript
// Esempio Node.js/Express
app.get('/webhook/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verifica che mode e token siano corretti
  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('Webhook verificato!');
    res.status(200).send(challenge);
  } else {
    console.error('Verifica fallita');
    res.sendStatus(403);
  }
});
```

### Passo 7.4: Implementa il Gestore degli Eventi

Il tuo server deve anche gestire le richieste POST con gli eventi:

```javascript
app.post('/webhook/facebook', (req, res) => {
  // Rispondi SUBITO a Facebook (entro 20 secondi)
  res.status(200).send('EVENT_RECEIVED');

  // Processa gli eventi in background
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach((entry) => {
      // Gestisci messaggi Messenger
      if (entry.messaging) {
        entry.messaging.forEach((event) => {
          processMessengerEvent(event);
        });
      }

      // Gestisci post sulla pagina
      if (entry.changes) {
        entry.changes.forEach((change) => {
          processPageChange(change);
        });
      }
    });
  }
});
```

### Passo 7.5: Configura il Webhook su Facebook

1. Nella Dashboard dell'App, vai su **"Messenger"** > **"Impostazioni"**
2. Scorri fino a **"Webhooks"**
3. Clicca **"Aggiungi URL di callback"**

Compila:

| Campo | Valore |
|-------|--------|
| **URL di callback** | `https://api.quofind.com/webhook/facebook` |
| **Token di verifica** | `quofind_webhook_verify_2025_secure_string` |

4. Clicca **"Verifica e salva"**

Se la verifica ha successo, vedrai un messaggio di conferma.

### Passo 7.6: Sottoscrivi agli Eventi

Dopo la verifica, devi selezionare quali eventi ricevere:

#### Eventi Messenger (obbligatori per il chatbot):

| Campo | Descrizione | Seleziona |
|-------|-------------|-----------|
| `messages` | Nuovi messaggi ricevuti | **SI** |
| `messaging_postbacks` | Click su bottoni | **SI** |
| `messaging_optins` | Opt-in al messaging | SI |
| `message_deliveries` | Conferme di consegna | Opzionale |
| `message_reads` | Conferme di lettura | Opzionale |

#### Eventi Pagina (per intercettare post):

| Campo | Descrizione | Seleziona |
|-------|-------------|-----------|
| `feed` | Nuovi post sulla pagina | **SI** |

### Passo 7.7: Collega il Webhook alla Pagina

1. Nella sezione Webhooks, trova la tua pagina
2. Clicca **"Sottoscrivi"** accanto alla pagina `Quofind Marketplace`

---

## 8. Ottenere i Token di Accesso

### Tipi di Token

| Tipo | Durata | Uso |
|------|--------|-----|
| **User Access Token** | ~2 ore | Azioni per conto dell'utente |
| **Page Access Token (breve)** | ~2 ore | Generato dal dashboard |
| **Page Access Token (lungo)** | ~60 giorni | Convertito dal breve |
| **Page Access Token (permanente)** | Mai scade | Per server-to-server |

### Passo 8.1: Ottieni un User Access Token

1. Vai su **https://developers.facebook.com/tools/explorer/**
2. Seleziona la tua app dal menu a tendina
3. Clicca **"Generate Access Token"**
4. Concedi i permessi richiesti

### Passo 8.2: Converti in Token Long-Lived

```bash
# Sostituisci i valori con i tuoi
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=TUO_APP_ID&\
client_secret=TUO_APP_SECRET&\
fb_exchange_token=TOKEN_BREVE"
```

Risposta:
```json
{
  "access_token": "NUOVO_TOKEN_LUNGO",
  "token_type": "bearer",
  "expires_in": 5183999
}
```

### Passo 8.3: Ottieni il Page Access Token Permanente

```bash
# Usa il token lungo per ottenere il page token
curl -X GET "https://graph.facebook.com/v18.0/TUO_PAGE_ID?\
fields=access_token&\
access_token=TOKEN_LUNGO"
```

Risposta:
```json
{
  "access_token": "PAGE_TOKEN_PERMANENTE",
  "id": "TUO_PAGE_ID"
}
```

### Passo 8.4: Verifica il Token

```bash
curl -X GET "https://graph.facebook.com/v18.0/debug_token?\
input_token=TOKEN_DA_VERIFICARE&\
access_token=TUO_APP_ID|TUO_APP_SECRET"
```

Controlla che:
- `is_valid`: true
- `expires_at`: 0 (per token permanenti)

### Passo 8.5: Conserva i Token in Modo Sicuro

**NON salvare mai i token nel codice!**

Opzioni sicure:
1. **AWS Secrets Manager** (consigliato per Quofind)
2. Variabili d'ambiente
3. HashiCorp Vault

Esempio AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
  --name quofind/facebook \
  --secret-string '{
    "app_id": "123456789",
    "app_secret": "abc123...",
    "page_access_token": "EAABcd...",
    "verify_token": "quofind_webhook_verify_2025..."
  }'
```

---

## 9. Configurare i Permessi

### Passo 9.1: Comprendi i Livelli di Permesso

| Livello | Descrizione | Requisiti |
|---------|-------------|-----------|
| **Development** | Solo per test con ruoli dell'app | Nessuno |
| **Standard Access** | Permessi base | App Review |
| **Advanced Access** | Permessi avanzati | App Review + Business Verification |

### Passo 9.2: Permessi Necessari per Quofind

| Permesso | Livello | Uso | Review Richiesta |
|----------|---------|-----|------------------|
| `public_profile` | Standard | Info utente base | NO |
| `email` | Standard | Email utente | NO |
| `pages_messaging` | Advanced | Inviare messaggi Messenger | **SI** |
| `pages_read_engagement` | Advanced | Leggere post pagina | **SI** |
| `pages_manage_posts` | Advanced | Pubblicare sulla pagina | **SI** |
| `pages_read_user_content` | Advanced | Leggere contenuti utente | **SI** |

### Passo 9.3: Aggiungi Ruoli per Test

Durante lo sviluppo, puoi testare con utenti specifici:

1. Vai su **"Ruoli"** nel menu dell'app
2. Clicca **"Aggiungi persone"**
3. Aggiungi gli account Facebook dei tester

| Ruolo | Capacita |
|-------|----------|
| **Amministratore** | Accesso completo |
| **Developer** | Sviluppo e test |
| **Tester** | Solo test dell'app |

### Passo 9.4: Test in Modalita Development

In modalita development:
- Solo gli utenti con ruolo possono usare l'app
- Non serve App Review
- Perfetto per sviluppo e debug

---

## 10. Test e Verifica

### Passo 10.1: Test del Webhook

1. Assicurati che il tuo server sia in esecuzione
2. Usa il **Webhook Tester** di Facebook:
   - Vai su Messenger > Impostazioni > Webhooks
   - Clicca **"Test"** accanto a un evento

3. Verifica nei log del server che l'evento sia arrivato

### Passo 10.2: Test Messenger

1. Apri Messenger (app o web)
2. Cerca la tua pagina `Quofind Marketplace`
3. Invia un messaggio di test
4. Verifica che:
   - Il webhook riceva l'evento
   - Il tuo sistema processi il messaggio
   - (Opzionale) Il bot risponda

### Passo 10.3: Test con Graph API Explorer

1. Vai su **https://developers.facebook.com/tools/explorer/**
2. Seleziona la tua app e il token
3. Prova queste query:

```
# Info sulla pagina
GET /me?fields=id,name

# Invia messaggio di test
POST /me/messages
{
  "recipient": {"id": "TUO_USER_ID"},
  "message": {"text": "Test da Quofind!"}
}
```

### Passo 10.4: Debug con ngrok (per sviluppo locale)

Se stai sviluppando in locale:

```bash
# Installa ngrok
npm install -g ngrok

# Esponi la porta locale
ngrok http 3000

# Ottieni URL tipo: https://abc123.ngrok.io
# Usa questo URL come webhook temporaneo
```

---

## 11. Passaggio in Produzione

### Passo 11.1: Completa l'App Review

Per usare l'app in produzione con tutti gli utenti:

1. Vai su **"App Review"** nel menu
2. Clicca **"Richiedi permessi"**
3. Per ogni permesso:
   - Spiega COME lo usi
   - Spiega PERCHE' ne hai bisogno
   - Fornisci uno **screencast** che mostra l'uso

### Passo 11.2: Prepara lo Screencast

Requisiti per lo screencast:
- Mostra chiaramente come viene usato ogni permesso
- Mostra l'interfaccia utente (anche se via Messenger)
- Spiega vocalmente cosa sta succedendo
- Durata: 2-5 minuti per permesso

### Passo 11.3: Business Verification

Per alcuni permessi avanzati:

1. Vai su **"Impostazioni"** > **"Verifica business"**
2. Fornisci:
   - Documenti aziendali
   - Verifica del dominio
   - Informazioni legali

### Passo 11.4: Attiva la Modalita Live

Dopo l'approvazione:

1. Vai su **"Impostazioni"** > **"Base"**
2. Trova **"Stato app"**
3. Cambia da **"Development"** a **"Live"**

> **ATTENZIONE:** Prima di passare in Live:
> - Testa TUTTO in development
> - Verifica che i webhook siano stabili
> - Assicurati che i token siano configurati correttamente

---

## 12. Risoluzione Problemi Comuni

### Problema: Webhook non riceve eventi

**Cause possibili:**
1. URL non raggiungibile
2. Certificato SSL non valido
3. Timeout nella risposta

**Soluzioni:**
```bash
# Verifica che l'URL sia raggiungibile
curl -I https://api.quofind.com/webhook/facebook

# Verifica il certificato SSL
openssl s_client -connect api.quofind.com:443

# Controlla i log del server
tail -f /var/log/app.log
```

### Problema: Errore 190 - Token Scaduto

**Soluzione:**
```javascript
// Implementa refresh automatico
async function refreshToken() {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `client_id=${APP_ID}&` +
    `client_secret=${APP_SECRET}&` +
    `fb_exchange_token=${currentToken}`
  );
  const data = await response.json();
  // Salva il nuovo token
  await updateTokenInSecretsManager(data.access_token);
}
```

### Problema: Errore 200 - Permesso Mancante

**Soluzione:**
1. Verifica quali permessi hai richiesto
2. Controlla se l'App Review e stata approvata
3. Verifica che l'utente abbia concesso i permessi

### Problema: Rate Limiting (Errore 4)

**Soluzione:**
```javascript
// Implementa retry con backoff
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 4) {
        const waitTime = Math.pow(2, i) * 1000;
        console.log(`Rate limited, waiting ${waitTime}ms`);
        await new Promise(r => setTimeout(r, waitTime));
      } else {
        throw error;
      }
    }
  }
}
```

### Problema: Firma Webhook Non Valida

**Soluzione:**
```javascript
// Assicurati di usare il raw body
const crypto = require('crypto');

function verifySignature(rawBody, signature) {
  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', APP_SECRET)
    .update(rawBody, 'utf8')  // Usa il body RAW, non parsed
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

// In Express, configura il body parser correttamente
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
```

### Problema: Messaggi Non Consegnati

**Cause possibili:**
1. Utente ha bloccato la pagina
2. Finestra 24 ore scaduta
3. Tipo messaggio non permesso

**Regole della 24-Hour Window:**
- Puoi inviare messaggi SOLO entro 24 ore dall'ultimo messaggio dell'utente
- Dopo 24 ore, puoi inviare solo "Message Tags" specifici
- Per notifiche, usa One-Time Notification request

---

## 13. Checklist Finale

### Configurazione Base

- [ ] Account Facebook Developer creato e verificato
- [ ] App Facebook creata con tipo "Business"
- [ ] App ID e App Secret salvati in modo sicuro
- [ ] Privacy Policy e Terms of Service configurati
- [ ] Dominio app configurato

### Pagina Facebook

- [ ] Pagina Facebook creata
- [ ] Page ID annotato
- [ ] Pagina collegata all'app

### Messenger

- [ ] Prodotto Messenger aggiunto all'app
- [ ] Page Access Token generato
- [ ] Token convertito in permanente
- [ ] Token salvato in modo sicuro (AWS Secrets Manager)

### Webhooks

- [ ] Endpoint webhook implementato
- [ ] Verifica GET implementata
- [ ] Gestore eventi POST implementato
- [ ] Verifica firma implementata
- [ ] Webhook configurato su Facebook
- [ ] Sottoscrizione agli eventi completata
- [ ] Test webhook superato

### Permessi

- [ ] Ruoli di test configurati
- [ ] Test in modalita Development completati
- [ ] App Review richiesta (se necessario)
- [ ] Business Verification completata (se necessario)

### Sicurezza

- [ ] App Secret MAI esposto nel frontend
- [ ] Token in AWS Secrets Manager
- [ ] HTTPS su tutti gli endpoint
- [ ] Firma webhook verificata
- [ ] Rate limiting implementato

### Go Live

- [ ] Tutti i test superati
- [ ] App Review approvata
- [ ] Modalita Live attivata
- [ ] Monitoring configurato

---

## Appendice A: Variabili d'Ambiente

```bash
# .env.example (NON committare il file .env reale!)

# Facebook App
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abc123...  # DA AWS SECRETS MANAGER
FACEBOOK_PAGE_ID=987654321098765

# Tokens
FACEBOOK_PAGE_ACCESS_TOKEN=EAABcd...  # DA AWS SECRETS MANAGER
FACEBOOK_VERIFY_TOKEN=quofind_webhook_verify_2025...

# API
FACEBOOK_API_VERSION=v18.0
FACEBOOK_GRAPH_URL=https://graph.facebook.com/v18.0
```

---

## Appendice B: Codice Esempio Completo

### Webhook Handler (Lambda/Node.js)

```javascript
// lambda/webhook/facebook.js
const crypto = require('crypto');

const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

exports.handler = async (event) => {
  // GET = Verifica webhook
  if (event.httpMethod === 'GET') {
    return handleVerification(event);
  }

  // POST = Evento
  if (event.httpMethod === 'POST') {
    return handleEvent(event);
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};

function handleVerification(event) {
  const params = event.queryStringParameters || {};

  const mode = params['hub.mode'];
  const token = params['hub.verify_token'];
  const challenge = params['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificato');
    return {
      statusCode: 200,
      body: challenge
    };
  }

  return { statusCode: 403, body: 'Forbidden' };
}

function handleEvent(event) {
  // Verifica firma
  const signature = event.headers['x-hub-signature-256'];
  if (!verifySignature(event.body, signature)) {
    console.error('Firma non valida');
    return { statusCode: 401, body: 'Invalid signature' };
  }

  // Rispondi subito a Facebook
  // (processa eventi in background)
  const body = JSON.parse(event.body);

  if (body.object === 'page') {
    // Qui invoca un'altra Lambda per processare
    // o metti in coda SQS
    processEventsAsync(body);
  }

  return {
    statusCode: 200,
    body: 'EVENT_RECEIVED'
  };
}

function verifySignature(payload, signature) {
  if (!signature) return false;

  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    );
  } catch {
    return false;
  }
}

async function processEventsAsync(body) {
  body.entry.forEach((entry) => {
    // Messaggi Messenger
    if (entry.messaging) {
      entry.messaging.forEach((event) => {
        if (event.message) {
          console.log('Nuovo messaggio:', event.message.text);
          // Processa messaggio
        }
        if (event.postback) {
          console.log('Postback:', event.postback.payload);
          // Processa postback
        }
      });
    }

    // Post sulla pagina
    if (entry.changes) {
      entry.changes.forEach((change) => {
        if (change.field === 'feed') {
          console.log('Nuovo post:', change.value);
          // Processa post
        }
      });
    }
  });
}
```

### Invio Messaggi Messenger

```javascript
// lib/messenger.js
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const API_VERSION = process.env.FACEBOOK_API_VERSION || 'v18.0';

async function sendTextMessage(recipientId, text) {
  const url = `https://graph.facebook.com/${API_VERSION}/me/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: PAGE_ACCESS_TOKEN
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Facebook API Error: ${error.error?.message}`);
  }

  return response.json();
}

async function sendButtonMessage(recipientId, text, buttons) {
  const url = `https://graph.facebook.com/${API_VERSION}/me/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text,
            buttons: buttons.map(b => ({
              type: 'postback',
              title: b.title,
              payload: b.payload
            }))
          }
        }
      },
      access_token: PAGE_ACCESS_TOKEN
    })
  });

  return response.json();
}

module.exports = { sendTextMessage, sendButtonMessage };
```

---

## Appendice C: Risorse Utili

### Documentazione Ufficiale

- [Facebook for Developers](https://developers.facebook.com/)
- [Messenger Platform Docs](https://developers.facebook.com/docs/messenger-platform)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api/reference)
- [Webhooks Guide](https://developers.facebook.com/docs/graph-api/webhooks)

### Strumenti

- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
- [Webhook Tester](integrato nella dashboard)
- [Postman Collection per Facebook](https://www.postman.com/facebookattic/workspace/facebook-apis)

### Community

- [Facebook Developer Community](https://www.facebook.com/groups/fbdevelopers/)
- [Stack Overflow - facebook-graph-api](https://stackoverflow.com/questions/tagged/facebook-graph-api)

---

## Supporto

Se hai problemi con questa guida o con l'integrazione Facebook:

1. Controlla la sezione [Risoluzione Problemi](#12-risoluzione-problemi-comuni)
2. Consulta la documentazione ufficiale
3. Verifica lo stato dei servizi Facebook: https://metastatus.com/
4. Apri un ticket su Facebook Developer Support

---

*Guida creata per Quofind Marketplace - v1.0 - Dicembre 2025*
