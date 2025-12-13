# Make (Integromat) - Guida Completa alla Configurazione

## Indice

1. [Introduzione](#introduzione)
2. [Setup Iniziale](#setup-iniziale)
3. [Configurazione Connessioni](#configurazione-connessioni)
4. [Scenario 1: Handle New Facebook Post](#scenario-1-handle-new-facebook-post)
5. [Scenario 2: Gestione Messaggi Messenger](#scenario-2-gestione-messaggi-messenger)
6. [Scenario 3: Matching Periodico](#scenario-3-matching-periodico)
7. [Scenario 4: Gestione Cashback](#scenario-4-gestione-cashback)
8. [Scenario 5: Pulizia Giornaliera](#scenario-5-pulizia-giornaliera)
9. [Testing e Debug](#testing-e-debug)
10. [Troubleshooting](#troubleshooting)

---

## Introduzione

Make (precedentemente Integromat) orchestra tutti i workflow di Quofind Marketplace. Questa guida fornisce istruzioni passo-passo per configurare ogni scenario.

### Vantaggi di Make

- **Zero hosting**: Piattaforma cloud, nessun server da gestire
- **Moduli nativi**: Facebook, OpenAI, HTTP pronti all'uso
- **Free tier**: 1,000 operazioni/mese gratuite
- **Visual builder**: Interfaccia drag-and-drop intuitiva

### Prerequisiti

Prima di iniziare, assicurati di avere:

- [ ] Account Make (registrati su [make.com](https://www.make.com))
- [ ] Facebook App creata su [developers.facebook.com](https://developers.facebook.com)
- [ ] Page Access Token (long-lived, 60 giorni)
- [ ] OpenAI API Key da [platform.openai.com](https://platform.openai.com/api-keys)
- [ ] API Gateway URL del deploy AWS (es: `https://xxx.execute-api.eu-south-1.amazonaws.com/dev`)

---

## Setup Iniziale

### Step 1: Creare Account Make

1. Vai su [make.com](https://www.make.com)
2. Click **Get started free**
3. Registrati con email o Google
4. Conferma email
5. Scegli piano **Free** (1,000 ops/mese)

### Step 2: Creare Organizzazione

1. Dopo il login, click sul nome in alto a destra
2. **Organizations** → **Create organization**
3. Nome: `Quofind Marketplace`
4. Click **Create**

### Step 3: Creare Team (opzionale)

1. Vai su **Organization settings** → **Teams**
2. **Create team** → Nome: `Development`
3. Invita membri se necessario

---

## Configurazione Connessioni

Prima di creare gli scenari, configura tutte le connessioni necessarie.

### Connessione 1: Facebook Pages

**Dove**: Scenarios → Connections → Create a connection

1. Cerca **Facebook Pages**
2. Click **Create a connection**
3. **Connection name**: `Quofind Facebook Page`
4. Click **Sign in with Facebook**
5. Accedi con l'account admin della pagina
6. Seleziona la pagina Quofind
7. Concedi tutti i permessi richiesti:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_messaging`
8. Click **Done**

### Connessione 2: Facebook Messenger

1. Cerca **Facebook Messenger**
2. Click **Create a connection**
3. **Connection name**: `Quofind Messenger`
4. **Page Access Token**: incolla il tuo long-lived token
5. **App Secret**: incolla il Facebook App Secret
6. Click **Save**

> **Come ottenere il Page Access Token**:
> 1. Vai su [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
> 2. Seleziona la tua app
> 3. Click **Generate Access Token**
> 4. Seleziona permessi: `pages_messaging`, `pages_manage_metadata`
> 5. Converti in long-lived token usando l'API

### Connessione 3: OpenAI (ChatGPT)

1. Cerca **OpenAI (ChatGPT)**
2. Click **Create a connection**
3. **Connection name**: `Quofind OpenAI`
4. **API Key**: incolla la tua API key (inizia con `sk-`)
5. Click **Save**

### Connessione 4: HTTP (per Lambda API)

La connessione HTTP non richiede credenziali globali - le configurerai per ogni richiesta.

---

## Scenario 1: Handle New Facebook Post

Questo scenario intercetta nuovi post Facebook e crea automaticamente annunci nel marketplace.

### Step 1: Creare lo Scenario

1. Vai su **Scenarios** → **Create a new scenario**
2. Nome: `Quofind - Handle New Facebook Post`
3. Click **Create**

### Step 2: Aggiungere Webhook Trigger

1. Click sul **?** al centro dello scenario
2. Cerca **Webhooks**
3. Seleziona **Custom webhook**
4. Click **Add**
5. **Webhook name**: `Facebook Events Webhook`
6. Click **Save**
7. **IMPORTANTE**: Copia l'URL del webhook (es: `https://hook.eu1.make.com/abc123xyz`)

### Step 3: Configurare Facebook Webhook

Ora configura Facebook per inviare eventi a questo webhook:

1. Vai su [Facebook Developers](https://developers.facebook.com)
2. Seleziona la tua App → **Webhooks**
3. Click **Add Subscription** per **Page**
4. **Callback URL**: incolla l'URL Make del webhook
5. **Verify Token**: `quofind_make_2024`
6. **Subscription Fields**: seleziona `feed`
7. Click **Verify and Save**

### Step 4: Aggiungere Router

1. Click sul **+** dopo il webhook
2. Cerca **Flow Control** → **Router**
3. Click **Add**

Il Router crea automaticamente 2 route. Ne useremo 3:

**Route 1: Nuovo Post**
- Click sulla prima route
- **Label**: `Nuovo Post`

**Route 2: Post Modificato**
- Click sulla seconda route
- **Label**: `Post Modificato`

**Route 3: Post Eliminato**
- Click sul Router → **Add another route**
- **Label**: `Post Eliminato`

### Step 5: Configurare Filtri per ogni Route

**Filtro Route 1 (Nuovo Post)**:
1. Click sulla linea tra Router e il modulo successivo
2. **Set up a filter**
3. **Label**: `Is New Post`
4. **Condition**:
   ```
   {{1.entry[].changes[].value.verb}} Equal to add
   AND
   {{1.entry[].changes[].value.item}} Equal to post
   ```
5. Click **OK**

**Filtro Route 2 (Post Modificato)**:
```
{{1.entry[].changes[].value.verb}} Equal to edit
AND
{{1.entry[].changes[].value.item}} Equal to post
```

**Filtro Route 3 (Post Eliminato)**:
```
{{1.entry[].changes[].value.verb}} Equal to remove
```

### Step 6: Aggiungere OpenAI per Analisi (Route 1)

1. Nella Route 1, click **+**
2. Cerca **OpenAI (ChatGPT)**
3. Seleziona **Create a Completion**
4. Configura:

**Connection**: Seleziona `Quofind OpenAI`

**Model**: `gpt-4-turbo`

**Messages**:

Click **Add item** e configura:

**Role**: `system`

**Message Content**:
```
Sei un assistente che analizza annunci di vendita pubblicati su Facebook per un marketplace italiano.

Analizza il testo dell'utente e restituisci SOLO un oggetto JSON valido (senza markdown, senza spiegazioni) con questi campi:

{
  "type": "listing" | "request" | "other",
  "title": "titolo breve dell'articolo",
  "description": "descrizione completa",
  "category": "elettronica" | "abbigliamento" | "casa" | "auto" | "sport" | "altro",
  "price": numero o null se non specificato,
  "currency": "EUR",
  "location": "città o zona",
  "keywords": ["parola1", "parola2"],
  "condition": "nuovo" | "usato" | "come_nuovo" | null
}

Se il testo non è un annuncio di vendita, imposta type: "other".
```

Click **Add item** di nuovo:

**Role**: `user`

**Message Content**: `{{1.entry[].changes[].value.message}}`

**Advanced Settings**:
- **Temperature**: `0.3` (per output più consistente)
- **Max Tokens**: `500`

---

#### Alternativa A: Usare Google Gemini invece di OpenAI

Make ha un [modulo nativo per Gemini AI](https://www.make.com/en/integrations/gemini-ai). Ecco come configurarlo:

**Step 6-ALT-A: Configurare Connessione Gemini**

1. Vai su **Connections** → **Create a connection**
2. Cerca **Gemini AI** (by Synergetic) o **Google Vertex AI (Gemini)**
3. **Connection name**: `Quofind Gemini`
4. **API Key**: Ottieni da [Google AI Studio](https://aistudio.google.com/app/apikey)
5. Click **Save**

**Step 6-ALT-A: Aggiungere Modulo Gemini**

1. Nella Route 1, click **+**
2. Cerca **Gemini AI** → **Create a Completion**
3. Configura:

**Connection**: Seleziona `Quofind Gemini`

**Model**: `gemini-1.5-flash` (veloce e economico) o `gemini-1.5-pro` (più potente)

**System Instruction**:
```
Sei un assistente che analizza annunci di vendita pubblicati su Facebook per un marketplace italiano.

Analizza il testo dell'utente e restituisci SOLO un oggetto JSON valido (senza markdown, senza spiegazioni) con questi campi:

{
  "type": "listing" | "request" | "other",
  "title": "titolo breve dell'articolo",
  "description": "descrizione completa",
  "category": "elettronica" | "abbigliamento" | "casa" | "auto" | "sport" | "altro",
  "price": numero o null se non specificato,
  "currency": "EUR",
  "location": "città o zona",
  "keywords": ["parola1", "parola2"],
  "condition": "nuovo" | "usato" | "come_nuovo" | null
}

Se il testo non è un annuncio di vendita, imposta type: "other".
```

**User Input**: `{{1.entry[].changes[].value.message}}`

**Advanced Settings**:
- **Temperature**: `0.3`
- **Max Output Tokens**: `500`

**Costi Gemini** (Dicembre 2024):
| Modello | Input | Output |
|---------|-------|--------|
| gemini-1.5-flash | $0.075/1M tokens | $0.30/1M tokens |
| gemini-1.5-pro | $1.25/1M tokens | $5.00/1M tokens |

> **Nota**: Gemini 1.5 Flash è ~10x più economico di GPT-4 Turbo per task semplici come l'analisi di annunci.

---

#### Alternativa B: Usare Qwen (Alibaba) invece di OpenAI

Qwen non ha un modulo nativo su Make, ma supporta [API OpenAI-compatibili](https://www.alibabacloud.com/help/en/model-studio/use-qwen-by-calling-api). Usa il modulo HTTP.

**Step 6-ALT-B: Ottenere API Key Qwen**

1. Registrati su [Alibaba Cloud](https://www.alibabacloud.com/)
2. Vai su [Model Studio](https://bailian.console.alibabacloud.com/)
3. Crea un'API Key in **API Keys** → **Create API Key**
4. Copia la chiave (inizia con `sk-`)

**Step 6-ALT-B: Aggiungere Modulo HTTP per Qwen**

1. Nella Route 1, click **+**
2. Cerca **HTTP** → **Make a request**
3. Configura:

**URL**:
```
https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions
```

> Per utenti in Cina, usa: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`

**Method**: `POST`

**Headers**:
| Key | Value |
|-----|-------|
| Content-Type | application/json |
| Authorization | Bearer YOUR_QWEN_API_KEY |

**Body type**: `Raw`

**Content type**: `JSON (application/json)`

**Request content**:
```json
{
  "model": "qwen-plus",
  "messages": [
    {
      "role": "system",
      "content": "Sei un assistente che analizza annunci di vendita pubblicati su Facebook per un marketplace italiano.\n\nAnalizza il testo dell'utente e restituisci SOLO un oggetto JSON valido (senza markdown, senza spiegazioni) con questi campi:\n\n{\n  \"type\": \"listing\" | \"request\" | \"other\",\n  \"title\": \"titolo breve dell'articolo\",\n  \"description\": \"descrizione completa\",\n  \"category\": \"elettronica\" | \"abbigliamento\" | \"casa\" | \"auto\" | \"sport\" | \"altro\",\n  \"price\": numero o null se non specificato,\n  \"currency\": \"EUR\",\n  \"location\": \"città o zona\",\n  \"keywords\": [\"parola1\", \"parola2\"],\n  \"condition\": \"nuovo\" | \"usato\" | \"come_nuovo\" | null\n}\n\nSe il testo non è un annuncio di vendita, imposta type: \"other\"."
    },
    {
      "role": "user",
      "content": "{{1.entry[].changes[].value.message}}"
    }
  ],
  "temperature": 0.3,
  "max_tokens": 500
}
```

**Parse response**: `Yes`

**Modelli Qwen disponibili**:
| Modello | Descrizione | Prezzo (approx) |
|---------|-------------|-----------------|
| `qwen-turbo` | Veloce, economico | ~$0.0008/1K tokens |
| `qwen-plus` | Bilanciato | ~$0.004/1K tokens |
| `qwen-max` | Più potente | ~$0.02/1K tokens |
| `qwen-long` | Contesto 10M tokens | ~$0.0005/1K tokens |

> **Nota**: Qwen è significativamente più economico di OpenAI e Gemini. `qwen-turbo` costa circa 1/100 di GPT-4 Turbo.

**Mapping risposta Qwen**:

Dopo il modulo HTTP, la risposta è in `{{2.data.choices[].message.content}}` (stesso formato OpenAI).

---

#### Confronto LLM per Quofind

| Aspetto | OpenAI GPT-4 | Google Gemini | Alibaba Qwen |
|---------|--------------|---------------|--------------|
| **Modulo Make** | Nativo | Nativo | HTTP custom |
| **Setup** | Facile | Facile | Medio |
| **Costo** | Alto | Medio | Basso |
| **Qualità italiano** | Eccellente | Molto buona | Buona |
| **Velocità** | Media | Veloce | Veloce |
| **Free tier** | No | Sì (limitato) | Sì (generoso) |

**Raccomandazione**:
- **Budget limitato**: Usa **Qwen Turbo** (costa quasi nulla)
- **Semplicità**: Usa **Gemini 1.5 Flash** (modulo nativo, economico)
- **Massima qualità**: Usa **GPT-4 Turbo** (migliore per italiano)

---

### Step 7: Aggiungere JSON Parser

1. Click **+** dopo OpenAI
2. Cerca **JSON** → **Parse JSON**
3. **JSON string**: `{{2.choices[].message.content}}`

### Step 8: Aggiungere Filtro "Is Listing"

1. Click sulla linea dopo JSON Parser
2. **Set up a filter**
3. **Label**: `Is Listing`
4. **Condition**: `{{3.type}} Equal to listing`

### Step 9: Chiamata HTTP per Creare Listing

1. Click **+**
2. Cerca **HTTP** → **Make a request**
3. Configura:

**URL**: `https://YOUR-API-GATEWAY.execute-api.eu-south-1.amazonaws.com/dev/listings`

**Method**: `POST`

**Headers**:
| Key | Value |
|-----|-------|
| Content-Type | application/json |

**Body type**: `Raw`

**Content type**: `JSON (application/json)`

**Request content**:
```json
{
  "userId": "{{1.entry[].changes[].value.from.id}}",
  "facebookPostId": "{{1.entry[].changes[].value.post_id}}",
  "title": "{{3.title}}",
  "description": "{{3.description}}",
  "category": "{{3.category}}",
  "price": {{3.price}},
  "currency": "{{3.currency}}",
  "location": "{{3.location}}",
  "keywords": {{3.keywords}},
  "condition": "{{3.condition}}",
  "source": "facebook_post"
}
```

**Parse response**: `Yes`

### Step 10: Inviare Conferma via Messenger

1. Click **+**
2. Cerca **Facebook Messenger** → **Send a Message**
3. Configura:

**Connection**: Seleziona `Quofind Messenger`

**Recipient ID**: `{{1.entry[].changes[].value.from.id}}`

**Message Type**: `Response`

**Message**:
```
Annuncio creato con successo!

{{3.title}}
Prezzo: {{3.price}}€
Categoria: {{3.category}}
Località: {{3.location}}

ID: {{4.data.id}}
```

### Step 11: Salvare e Attivare

1. Click **Save** (icona disco in basso a sinistra)
2. Click **ON** per attivare lo scenario
3. **Scheduling**: Lascia su "Immediately" per webhook

### Schema Completo Scenario 1

```
[Webhook: Facebook Events]
        │
        ▼
    [Router]
        │
        ├── Route 1: Nuovo Post
        │       │
        │       ▼
        │   [Filter: Is New Post]
        │       │
        │       ▼
        │   [OpenAI: Analizza Testo]
        │       │
        │       ▼
        │   [JSON: Parse Response]
        │       │
        │       ▼
        │   [Filter: Is Listing]
        │       │
        │       ▼
        │   [HTTP: POST /listings]
        │       │
        │       ▼
        │   [Messenger: Conferma]
        │
        ├── Route 2: Post Modificato
        │       │
        │       ▼
        │   [HTTP: PUT /listings/{id}]
        │
        └── Route 3: Post Eliminato
                │
                ▼
            [HTTP: DELETE /listings/{id}]
```

---

## Scenario 2: Gestione Messaggi Messenger

Questo scenario gestisce i messaggi degli utenti via Messenger (ricerche, domande cashback, ecc.)

### Step 1: Creare Scenario

1. **Scenarios** → **Create a new scenario**
2. Nome: `Quofind - Messenger Handler`

### Step 2: Webhook Trigger

1. Aggiungi **Webhooks** → **Custom webhook**
2. **Webhook name**: `Messenger Messages Webhook`
3. Copia l'URL e configuralo su Facebook (Webhooks → Page → `messages`)

### Step 3: OpenAI per Intent Detection

1. Aggiungi **OpenAI** → **Create a Completion**

**System Message**:
```
Sei un assistente per un marketplace. Analizza il messaggio dell'utente e determina l'intent.

Restituisci SOLO un JSON valido:

{
  "intent": "search" | "balance" | "transactions" | "help" | "contact_seller" | "other",
  "keywords": ["parola1", "parola2"],
  "category": "categoria se menzionata" | null,
  "maxPrice": numero se menzionato | null,
  "location": "località se menzionata" | null,
  "language": "it" | "en"
}
```

**User Message**: `{{1.messaging[].message.text}}`

### Step 4: JSON Parser

Aggiungi **JSON** → **Parse JSON**

### Step 5: Router per Intent

Aggiungi **Router** con 4 route:

**Route 1: Search**
- Filter: `{{3.intent}} Equal to search`

**Route 2: Balance**
- Filter: `{{3.intent}} Equal to balance`

**Route 3: Transactions**
- Filter: `{{3.intent}} Equal to transactions`

**Route 4: Help/Other**
- Filter: (nessun filtro - fallback)

### Step 6: Route Search - Cerca e Rispondi

**6a. Crea Richiesta**:
1. **HTTP** → **Make a request**
2. **URL**: `https://API/requests`
3. **Method**: `POST`
4. **Body**:
```json
{
  "userId": "{{1.messaging[].sender.id}}",
  "keywords": {{3.keywords}},
  "category": "{{3.category}}",
  "maxPrice": {{3.maxPrice}},
  "location": "{{3.location}}"
}
```

**6b. Cerca Listings**:
1. **HTTP** → **Make a request**
2. **URL**: `https://API/listings?q={{join(3.keywords; ",")}}&category={{3.category}}&maxPrice={{3.maxPrice}}`
3. **Method**: `GET`

**6c. Router Risultati**:
- Route A: Risultati trovati → `{{length(5.data)}} Greater than 0`
- Route B: Nessun risultato

**6d. Invia Carousel (Route A)**:
1. **Facebook Messenger** → **Send a Message**
2. **Attachment Type**: `Template`
3. **Template Type**: `Generic`
4. **Elements**: Mappa su `{{5.data}}`
   - Title: `{{item.title}}`
   - Subtitle: `{{item.price}}€ - {{item.location}}`
   - Image URL: `{{item.imageUrl}}`
   - Buttons:
     - `{"type": "postback", "title": "Contatta", "payload": "CONTACT_{{item.id}}"}`

**6e. Invia Messaggio "Nessun risultato" (Route B)**:
```
Non ho trovato annunci corrispondenti alla tua ricerca.

Ho salvato la tua richiesta e ti avviserò quando ci saranno nuovi annunci!

Cercavi: {{join(3.keywords; ", ")}}
```

### Step 7: Route Balance

1. **HTTP** → **Make a request**
2. **URL**: `https://API/cashback/balance?userId={{1.messaging[].sender.id}}`
3. **Method**: `GET`

4. **Messenger** → **Send a Message**:
```
Il tuo saldo cashback:

Disponibile: {{4.data.available}}€
In attesa: {{4.data.pending}}€

Il cashback in attesa diventerà disponibile dopo 30 giorni dalla transazione.
```

### Step 8: Route Help

**Messenger** → **Send a Message**:
```
Ciao! Ecco cosa posso fare per te:

Cerca prodotti - Scrivi cosa cerchi (es: "cerco iPhone a Milano")

Saldo cashback - Scrivi "saldo" o "quanto ho?"

Storico - Scrivi "transazioni" o "storico"

Per vendere, pubblica un post nel gruppo Facebook!
```

**Quick Replies**:
```json
[
  {"content_type": "text", "title": "Cerca prodotto", "payload": "SEARCH"},
  {"content_type": "text", "title": "Il mio saldo", "payload": "BALANCE"},
  {"content_type": "text", "title": "Aiuto", "payload": "HELP"}
]
```

---

## Scenario 3: Matching Periodico

Questo scenario gira ogni 5 minuti e cerca match tra richieste e annunci.

### Step 1: Creare Scenario

Nome: `Quofind - Periodic Matching`

### Step 2: Scheduler Trigger

1. Aggiungi **Flow Control** → **Scheduler**
2. **Run scenario**: `At regular intervals`
3. **Minutes**: `5`
4. **Time restrictions** (opzionale):
   - **Time from**: `08:00`
   - **Time to**: `23:00`
   - **Days**: Lun-Dom

### Step 3: Recupera Richieste Attive

1. **HTTP** → **Make a request**
2. **URL**: `https://API/requests/active`
3. **Method**: `GET`
4. **Parse response**: `Yes`

### Step 4: Iterator

1. Aggiungi **Flow Control** → **Iterator**
2. **Array**: `{{1.data}}`

### Step 5: Cerca Match per ogni Richiesta

1. **HTTP** → **Make a request**
2. **URL**: `https://API/listings?q={{join(2.keywords; ",")}}&category={{2.category}}&maxPrice={{2.maxPrice}}&location={{2.location}}`
3. **Method**: `GET`

### Step 6: Filtra Match Già Notificati

1. **Tools** → **Set variable**
2. **Variable name**: `newMatches`
3. **Variable value**:
```
{{filter(3.data; "id"; "NOT IN"; 2.notifiedListings)}}
```

### Step 7: Condizione "Ci sono nuovi match?"

1. **Flow Control** → **Router**
2. **Route 1 Filter**: `{{length(4.newMatches)}} Greater than 0`

### Step 8: Notifica Buyer

1. **Facebook Messenger** → **Send a Message**
2. **Recipient ID**: `{{2.userId}}`
3. **Message**:
```
Abbiamo trovato {{length(4.newMatches)}} annunci che potrebbero interessarti!
```

4. Aggiungi un altro **Messenger** per il carousel dei risultati

### Step 9: Notifica Seller (opzionale)

1. **Iterator** sui `newMatches`
2. Per ogni match, invia messaggio al seller

### Step 10: Aggiorna Richiesta con Match Notificati

1. **HTTP** → **Make a request**
2. **URL**: `https://API/requests/{{2.id}}`
3. **Method**: `PATCH`
4. **Body**:
```json
{
  "notifiedListings": {{add(2.notifiedListings; map(4.newMatches; "id"))}}
}
```

### Step 11: Attivare Scheduling

1. **Save** lo scenario
2. **Scheduling** → **ON**
3. Verifica che mostri "Runs every 5 minutes"

---

## Scenario 4: Gestione Cashback

Gestisce la distribuzione del cashback dopo conferma pagamento.

### Step 1: Creare Scenario

Nome: `Quofind - Cashback Distribution`

### Step 2: Webhook Trigger

1. **Webhooks** → **Custom webhook**
2. **Webhook name**: `Payment Confirmed Webhook`

Questo webhook sarà chiamato dalla Lambda Payments quando un pagamento è confermato.

### Step 3: Recupera Dettagli Pagamento

1. **HTTP** → **GET** `https://API/payments/{{1.paymentId}}`

### Step 4: Recupera Config Cashback

1. **HTTP** → **GET** `https://API/cashback/config`

### Step 5: Calcola Commissioni

1. **Tools** → **Set multiple variables**

| Variable | Value |
|----------|-------|
| `commission` | `{{2.data.amount * 3.data.commissionRate}}` |
| `buyerCashback` | `{{4.commission * 3.data.buyerCashbackRate}}` |
| `leaderCashback` | `{{4.commission * 3.data.leaderCashbackRate}}` |
| `referrerCashback` | `{{4.commission * 3.data.referrerCashbackRate}}` |

### Step 6: Accredita Cashback Buyer

1. **HTTP** → **POST** `https://API/cashback/credit`
2. **Body**:
```json
{
  "userId": "{{2.data.buyerId}}",
  "amount": {{4.buyerCashback}},
  "type": "purchase_cashback",
  "referenceId": "{{1.paymentId}}"
}
```

### Step 7: Accredita Cashback Group Leader (se applicabile)

1. **Router** → Filter: `{{2.data.groupId}} Not equal to (empty)`
2. **HTTP** → **POST** `https://API/cashback/credit`
3. **Body** con `leaderCashback` e `leaderId` dal gruppo

### Step 8: Notifiche

Per ogni beneficiario, invia messaggio Messenger con dettaglio del credito ricevuto.

---

## Scenario 5: Pulizia Giornaliera

Gestisce scadenza annunci/richieste e rilascio cashback pending.

### Step 1: Creare Scenario

Nome: `Quofind - Daily Cleanup`

### Step 2: Scheduler

1. **Scheduler** trigger
2. **Time**: `03:00`
3. **Days**: Ogni giorno

### Step 3: Trigger Lambda Scheduler

1. **HTTP** → **POST** `https://API/internal/scheduler`
2. Questo chiama la Lambda che:
   - Scade listing > 30 giorni
   - Scade richieste > 7 giorni
   - Rilascia cashback pending > 30 giorni

### Step 4: Recupera Items Scaduti

1. **HTTP** → **GET** `https://API/listings?status=expired&since=yesterday`
2. **HTTP** → **GET** `https://API/requests?status=expired&since=yesterday`

### Step 5: Notifica Utenti

Per ogni item scaduto:

1. **Iterator**
2. **Messenger** → **Send a Message** con Quick Replies:
```
Il tuo annuncio "{{item.title}}" è scaduto.

Vuoi rinnovarlo per altri 30 giorni?
```

Quick Replies:
```json
[
  {"content_type": "text", "title": "Rinnova", "payload": "RENEW_{{item.id}}"},
  {"content_type": "text", "title": "Elimina", "payload": "DELETE_{{item.id}}"}
]
```

---

## Testing e Debug

### Testare uno Scenario

1. Apri lo scenario
2. Click **Run once** (play button)
3. Per webhook: invia un test payload
4. Osserva il flusso dei dati in tempo reale

### Testare Webhook Manualmente

Usa curl o Postman:

```bash
curl -X POST https://hook.eu1.make.com/YOUR-WEBHOOK-ID \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "PAGE_ID",
      "time": 1234567890,
      "changes": [{
        "field": "feed",
        "value": {
          "item": "post",
          "verb": "add",
          "post_id": "123_456",
          "message": "Vendo iPhone 13, Milano, 500 euro",
          "from": {"id": "USER_123", "name": "Test User"}
        }
      }]
    }]
  }'
```

### Vedere Execution History

1. Vai su **Scenarios** → seleziona scenario
2. Tab **History**
3. Click su una esecuzione per vedere dettagli
4. Espandi ogni modulo per vedere input/output

### Debug Errori

1. In History, le esecuzioni fallite sono in rosso
2. Click per vedere quale modulo ha fallito
3. Controlla:
   - Input ricevuto
   - Errore restituito
   - Response body (per HTTP)

---

## Troubleshooting

### Errore: "Webhook verification failed"

**Causa**: Facebook non riesce a verificare il webhook

**Soluzione**:
1. Verifica che l'URL Make sia corretto
2. Il verify token deve essere esattamente `quofind_make_2024`
3. Assicurati che lo scenario sia **ON**

### Errore: "Invalid OAuth access token"

**Causa**: Token Facebook scaduto

**Soluzione**:
1. Vai su Connections → Facebook
2. Click **Reauthorize**
3. Se long-lived token scaduto (60 giorni), generane uno nuovo

### Errore: "Rate limit exceeded"

**Causa**: Troppi messaggi Messenger

**Soluzione**:
1. Aggiungi **Sleep** (Tools → Sleep) tra le iterazioni
2. Imposta 200ms di pausa
3. Usa **Array Aggregator** per batch

### Errore: "OpenAI API error"

**Causa**: API key invalida o quota esaurita

**Soluzione**:
1. Verifica API key su platform.openai.com
2. Controlla usage/billing
3. Riduci `max_tokens` se necessario

### Scenario non si attiva

**Causa**: Scenario disattivato o scheduling errato

**Soluzione**:
1. Verifica che lo scenario sia **ON** (toggle verde)
2. Per webhook: verifica configurazione su Facebook
3. Per scheduler: verifica orari e timezone

### Dati non passano tra moduli

**Causa**: Mapping variabili errato

**Soluzione**:
1. Click sul modulo problematico
2. Verifica che le variabili usino il numero corretto del modulo sorgente
3. Esempio: `{{1.data}}` = dati dal modulo 1
4. Usa il **Data picker** (icona {}) invece di scrivere manualmente

---

## API Reference

### Endpoints Lambda Disponibili

| Endpoint | Method | Descrizione | Body/Params |
|----------|--------|-------------|-------------|
| `/listings` | POST | Crea annuncio | `{userId, title, description, category, price, location}` |
| `/listings` | GET | Cerca annunci | `?q=keywords&category=X&maxPrice=N&location=Y` |
| `/listings/{id}` | GET | Dettaglio annuncio | - |
| `/listings/{id}` | DELETE | Elimina annuncio | - |
| `/requests` | POST | Crea richiesta | `{userId, keywords, category, maxPrice, location}` |
| `/requests/active` | GET | Richieste attive | - |
| `/cashback/balance` | GET | Saldo utente | `?userId=X` |
| `/cashback/credit` | POST | Accredita cashback | `{userId, amount, type, referenceId}` |
| `/cashback/config` | GET | Config commissioni | - |
| `/payments/{id}/confirm` | POST | Conferma pagamento | - |
| `/internal/scheduler` | POST | Trigger pulizia | - |
| `/internal/matching` | POST | Trigger matching | - |

---

## Checklist Finale

Prima di andare in produzione, verifica:

- [ ] Tutti e 5 gli scenari creati e attivi
- [ ] Connessione Facebook con token long-lived
- [ ] Connessione OpenAI con API key valida
- [ ] Webhook Facebook configurati (feed, messages)
- [ ] API Gateway URL corretto in tutti gli HTTP module
- [ ] Error handler configurati su ogni scenario
- [ ] Email notifiche errori attive
- [ ] Test manuale di ogni scenario completato
- [ ] Monitoring dashboard configurata
