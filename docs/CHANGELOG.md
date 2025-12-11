# Changelog

Tutte le modifiche significative al progetto Marketplace Quofind saranno documentate in questo file.

## [1.0.3] - 2025-04-23

### Aggiunto
- **Sistema di Chatbot**
   - Implementazione del sistema di chatbot su Messenger
   - Integrazione con OpenAI per l'analisi del testo
   - Gestione delle domande naturali
   - Sistema di risposta intelligente

- **Nuove Lambda Functions**
   - `messageHandler`: Gestisce i messaggi in entrata
   - `intentAnalyzer`: Analizza il testo e identifica l'intento
   - `queryBuilder`: Costruisce le query SQL
   - `dataFetcher`: Recupera i dati dal database
   - `responseFormatter`: Formatta le risposte

- **Nuove Tabelle DynamoDB**
   - `ChatHistory`: Storico delle interazioni
   - `UserPreferences`: Preferenze degli utenti
   - `cashbackConfig`: Configurazione del sistema di cashback

### Miglioramenti

1. **Sistema di Cashback**
   - Miglioramento della gestione dei saldi
   - Ottimizzazione delle transazioni
   - Aggiornamento della configurazione

2. **Performance**
   - Ottimizzazione delle query
   - Implementazione del caching
   - Miglioramento della gestione dei rate limit

### Bug Fixes

1. **Sicurezza**
   - Correzione dei permessi
   - Miglioramento della validazione dei dati
   - Ottimizzazione della gestione dei token

2. **Gestione Errori**
   - Miglioramento dei messaggi di errore
   - Ottimizzazione della gestione delle eccezioni
   - Aggiornamento del logging

### Documentazione

1. **Aggiornamenti**
   - MANUALE_TECNICO.md: Aggiornamento della documentazione delle Lambda Functions
   - DYNAMODB.md: Aggiornamento della documentazione delle tabelle
   - CASHBACK.md: Aggiornamento della documentazione del sistema di cashback

2. **Esempi**
   - Aggiunti esempi di utilizzo del chatbot
   - Aggiunti esempi di query
   - Aggiunti esempi di risposte

### Configurazione

1. **Nuove Variabili di Ambiente**
   - OPENAI_API_KEY: Chiave API di OpenAI
   - MESSENGER_ACCESS_TOKEN: Token di accesso Messenger
   - DYNAMODB_TABLES: Configurazione delle tabelle DynamoDB

2. **Rate Limiting**
   - Implementazione del rate limiting
   - Configurazione dei limiti di richiesta
   - Gestione dei picchi di carico

### Best Practices

1. **Sicurezza**
   - Validazione dei dati
   - Protezione delle informazioni sensibili
   - Gestione dei permessi

2. **Performance**
   - Ottimizzazione delle query
   - Implementazione del caching
   - Rate limiting

3. **Manutenibilità**
   - Documentazione delle tabelle
   - Nomi di attributi chiari e coerenti
   - Versionamento delle tabelle

### Aggiunto
- Create funzioni Lambda per la gestione dei gruppi:
  - `createGroup`: Gestisce la creazione di un nuovo gruppo nel marketplace.
  - `addUserToGroup`: Consente di aggiungere un utente a un gruppo esistente.
  - `removeUserFromGroup`: Rimuove un utente da un gruppo.
  - `getGroupInfo`: Recupera informazioni su un gruppo specifico.
  - `distributeGroupCashback`: Distribuisce il cashback ai capi gruppo e agli acquirenti in base alle vendite.

- Aggiunti nuovi endpoint all'API per la gestione dei gruppi in `openapi.yaml`:
  - `POST /groups`: Crea un nuovo gruppo.
  - `POST /groups/{groupId}/members`: Aggiunge un utente a un gruppo specificato.

### Aggiornato
- Aggiornata la documentazione per includere dettagli sulle nuove funzioni Lambda e le loro funzionalità.
- Aggiornata la documentazione API in `openapi.yaml` per riflettere i nuovi endpoint di gestione dei gruppi.
- Migliorati i flussi di lavoro n8n per gestire la logica specifica dei gruppi per i post di Facebook e la corrispondenza delle richieste-annunci.

### Aggiornato
- Espanso il documento N8N.md per fornire spiegazioni dettagliate sui flussi di lavoro gestiti da n8n nel progetto Quofind Marketplace.
- Creazione del documento DYNAMODB.md che descrive le caratteristiche del database DynamoDB utilizzato nel progetto, incluse le tabelle e il loro utilizzo specifico.
- Espanso il contenuto del MANUALE_TECNICO.md per fornire spiegazioni dettagliate sui flussi principali e le tecnologie utilizzate nel progetto Quofind Marketplace.
- Migliorata la chiarezza e la scorrevolezza del documento.
- Aggiornata la documentazione nel README.md per riflettere l'uso di Redocly CLI per la visualizzazione della documentazione OpenAPI.
- Sostituiti i riferimenti a Swagger con i nuovi script per il lancio della documentazione.
- Aggiunto un commento all'inizio del file facebookGraph.js che spiega il suo scopo, la funzionalità e come viene richiamato da n8n.
- Aggiunto un commento all'inizio del file aiAnalysis.js che spiega il suo scopo, la funzionalità e come viene richiamato da n8n.
- Aggiornato il manuale tecnico con sezioni su autenticazione utente, gestione degli errori, test e validazione, scalabilità e documentazione per sviluppatori.

## [1.0.2] - 2025-04-22

### Aggiornato
- Aggiornata la documentazione per il flusso di lavoro "Handle New Facebook Post" in formato Markdown.
- Aggiornata la documentazione per il flusso di lavoro "Periodic Request-Listing Matching" in formato Markdown.
- Eliminati i file di commento per i flussi di lavoro non più necessari.
- Implementata la localizzazione degli errori nelle funzioni Lambda (`createListing`, `getPaybackBalance`), restituendo messaggi in base alla lingua dell'utente.
- Aggiunto un parametro `language` nel flusso n8n per garantire che le risposte siano localizzate correttamente.
- Aggiornata la documentazione del README.md per includere dettagli sulla gestione degli errori e sulla localizzazione.
- Modificato il flusso n8n per includere la lingua dell'utente nelle richieste API.
- Corretto il comportamento delle funzioni Lambda per gestire i parametri di input in modo più robusto, restituendo errori localizzati.
- Aggiunta la spec OpenAPI per la documentazione delle API.
- Implementato il webhook Facebook per gestire gli eventi.
- Aggiunta la configurazione del prompt AI per l'analisi del testo.
- Aggiornato il flusso n8n per includere il nuovo webhook e la gestione degli eventi.
- Corretto il comportamento del webhook per verificare il challenge GET.

## [1.0.1] - 2025-04-17

### Aggiunto
- **Supporto multilingue** per il sistema completo
  - Rilevamento automatico della lingua nei messaggi e post degli utenti
  - Supporto per Italiano, Francese, Spagnolo e Tedesco
  - Campo `language` aggiunto ai dati degli annunci e delle richieste
  - Indice `language_keyword` in Elasticsearch per consentire il filtraggio per lingua

### Modificato
- **API di analisi AI** aggiornata per elaborare contenuti in diverse lingue
  - Migliorato il rilevamento del tipo di annuncio/richiesta indipendentemente dalla lingua
  - Aggiunto rilevamento fallback per frasi comuni in diverse lingue
  - Modificati i prompt per essere indipendenti dalla lingua
  - La risposta dell'AI ora include il campo della lingua rilevata

- **Workflow n8n** aggiornati per gestire risposte multilingue
  - Dizionari di traduzione per i messaggi chiave
  - Risposta nelle notifiche nella lingua dell'utente
  - Sistemati i messaggi per "annuncio" e "richiesta" in diverse lingue

- **Lambda Functions** aggiornate per gestire e memorizzare informazioni sulla lingua
  - Controlli di validità aggiuntivi per prevenire errori
  - Lingua di default impostata a Italiano quando non rilevata

## [1.0.0] - 2025-04-15

### Rilascio iniziale
- **Architettura base**
  - Funzioni Lambda per la gestione dei dati
  - Integrazione con DynamoDB ed Elasticsearch
  - Workflow n8n per la logica di business
  
- **Funzionalità principali**
  - Creazione di annunci di vendita
  - Creazione di richieste di acquisto
  - Ricerca e matching automatico tra annunci e richieste
  - Sistema di cashback per gli utenti
  - Integrazioni con Facebook Graph API

- **Analisi AI**
  - Analisi semantica dei contenuti postati
  - Estrazione di informazioni strutturate
  - Generazione di messaggi di conferma
