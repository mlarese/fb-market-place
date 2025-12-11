# Documentazione di DynamoDB

## Introduzione

Amazon DynamoDB è un servizio di database NoSQL completamente gestito che offre prestazioni elevate e scalabilità automatica. È progettato per gestire qualsiasi volume di traffico e fornisce una latenza di millisecondi a un singolo digit. DynamoDB è ideale per applicazioni che richiedono un accesso rapido ai dati e una gestione flessibile delle informazioni.

## Caratteristiche principali
- **Scalabilità**: DynamoDB può scalare automaticamente per gestire carichi di lavoro variabili, senza la necessità di provisioning manuale delle risorse.
- **Bassa latenza**: offre prestazioni costanti con latenza a livello di millisecondo, rendendolo adatto per applicazioni in tempo reale.
- **Flessibilità dei dati**: supporta strutture di dati flessibili, consentendo di memorizzare documenti JSON e dati in formato chiave-valore.
- **Sicurezza**: fornisce opzioni di crittografia dei dati a riposo e in transito, garantendo la protezione delle informazioni sensibili.
- **Integrazione con altri servizi AWS**: si integra facilmente con altri servizi AWS come Lambda, S3 e CloudWatch.

## Tabelle di DynamoDB

### 1. Listings
- **Descrizione**: Questa tabella memorizza le informazioni relative agli annunci pubblicati dai venditori nel marketplace.
- **Campi principali**:
  - **ListingID** (chiave primaria): identificatore unico per ogni annuncio.
  - **VendorID**: identificatore del venditore che ha pubblicato l'annuncio.
  - **Category**: categoria dell'annuncio (es. elettronica, abbigliamento).
  - **Price**: prezzo dell'articolo.
  - **Location**: località dell'articolo in vendita.
  - **Description**: descrizione dettagliata dell'annuncio.
- **Uso**: Questa tabella è utilizzata per recuperare gli annunci disponibili per gli acquirenti e per gestire le operazioni di pubblicazione e aggiornamento degli annunci.

### 2. Requests
- **Descrizione**: Memorizza le richieste di acquisto degli acquirenti.
- **Campi principali**:
  - **RequestID** (chiave primaria): identificatore unico per ogni richiesta.
  - **BuyerID**: identificatore dell'acquirente che ha effettuato la richiesta.
  - **ListingID**: riferimento all'annuncio corrispondente.
  - **Status**: stato della richiesta (es. attiva, completata, annullata).
  - **CreatedAt**: timestamp di creazione della richiesta.
- **Uso**: Questa tabella consente di gestire le richieste degli acquirenti e di monitorare le interazioni tra acquirenti e venditori.

### 3. Users
- **Descrizione**: Contiene informazioni sugli utenti registrati nel sistema, sia venditori che acquirenti.
- **Campi principali**:
  - **UserID** (chiave primaria): identificatore unico per ogni utente.
  - **UserType**: tipo di utente (es. venditore, acquirente).
  - **Email**: indirizzo email dell'utente.
  - **PasswordHash**: hash della password per l'autenticazione.
  - **CreatedAt**: timestamp di registrazione dell'utente.
- **Uso**: Questa tabella gestisce le informazioni degli utenti, consentendo l'autenticazione e la registrazione nel sistema.

### 4. Transactions
- **Descrizione**: Memorizza le informazioni sulle transazioni effettuate nel marketplace.
- **Campi principali**:
  - **TransactionID** (chiave primaria): identificatore unico per ogni transazione.
  - **BuyerID**: identificatore dell'acquirente coinvolto nella transazione.
  - **ListingID**: riferimento all'annuncio acquistato.
  - **Amount**: importo della transazione.
  - **Timestamp**: data e ora della transazione.
- **Uso**: Questa tabella è utilizzata per tenere traccia delle transazioni effettuate, facilitando la gestione del cashback e delle operazioni finanziarie.

### 5. cashbackConfig

La tabella `cashbackConfig` gestisce la configurazione del sistema di cashback:

- `id`: Identificatore univoco (default: 'default')
- `quofindCommission`: Percentuale della commissione per Quofind (default: 10%)
- `buyerCashback`: Percentuale di cashback per l'acquirente (default: 66%)
- `groupLeaderCashback`: Percentuale di cashback per il capo gruppo (default: 5%)
- `referrerCashback`: Percentuale di cashback per i segnalatori (default: 2%)

### 6. PaybackBalances

La tabella `PaybackBalances` gestisce i saldi di cashback degli utenti:

- `userId`: Identificatore dell'utente
- `balance`: Saldo attuale del cashback
- `pending`: Cashback in attesa di accreditamento
- `lastUpdated`: Timestamp dell'ultimo aggiornamento

### 7. Transactions

La tabella `Transactions` registra tutte le transazioni di cashback:

- `transactionId`: Identificatore univoco della transazione
- `userId`: Identificatore dell'utente
- `amount`: Importo della transazione
- `type`: Tipo di transazione (credit/debit)
- `status`: Stato della transazione (pending/completed)
- `timestamp`: Timestamp della transazione
- `referenceId`: Identificatore della vendita/riferimento

### 8. ChatHistory

La tabella `ChatHistory` registra tutte le interazioni con il bot:

- `messageId`: ID univoco del messaggio
- `userId`: ID dell'utente
- `text`: Testo del messaggio
- `intent`: Intento identificato
- `timestamp`: Timestamp
- `response`: Risposta del bot

### 9. UserPreferences

La tabella `UserPreferences` gestisce le preferenze degli utenti:

- `userId`: ID dell'utente
- `language`: Lingua preferita
- `timezone`: Fuso orario
- `notificationPreferences`: Preferenze di notifica
- `lastUpdate`: Timestamp dell'ultimo aggiornamento

## Relazioni tra le Tabelle

1. **Cashback e Transazioni**
   - Un utente può avere molti saldi
   - Un utente può avere molte transazioni

2. **Chatbot e Storico**
   - Un utente può avere molti messaggi
   - Ogni messaggio ha un intento specifico

## Best Practices

1. **Performance**
   - Utilizzare chiavi composite per le query
   - Implementare il caching per le query comuni
   - Ottimizzare le operazioni di batch

2. **Sicurezza**
   - Validazione dei dati in ingresso
   - Protezione dei dati sensibili
   - Gestione dei permessi

3. **Manutenibilità**
   - Documentazione delle tabelle
   - Nomi di attributi chiari e coerenti
   - Versionamento delle tabelle

## Conclusione

DynamoDB fornisce una base solida per gestire i dati del marketplace Quofind, consentendo un accesso rapido e scalabile alle informazioni necessarie per le operazioni quotidiane. La progettazione delle tabelle è stata effettuata tenendo conto delle esigenze specifiche del sistema, garantendo efficienza e facilità d'uso.
