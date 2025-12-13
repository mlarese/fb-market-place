# Manuale Tecnico del Progetto Quofind Marketplace

## Introduzione

Questo documento descrive in dettaglio l'architettura tecnica e i flussi operativi del progetto Marketplace Quofind, una piattaforma privata di compravendita basata su Facebook. La logica del sistema è orchestrata da Make (precedentemente Integromat), una potente piattaforma di automazione cloud-based, che gestisce l'interazione tra venditori e acquirenti, l'analisi dei contenuti tramite intelligenza artificiale, la gestione del cashback e la persistenza dei dati. Le AWS Lambda fungono esclusivamente da servizi per l'accesso e la modifica dei dati su DynamoDB ed Elasticsearch, garantendo un'architettura scalabile e reattiva.

Make permette di automatizzare processi complessi attraverso scenari visuali, facilitando la creazione e la gestione di workflow che coinvolgono più servizi e API. In questo progetto, Make governa l'intera logica decisionale, effettuando richieste a servizi esterni, come sistemi di intelligenza artificiale, interrogando la Facebook Graph API e coordinando l'uso delle funzioni Lambda per l'elaborazione dei dati.

AWS (Amazon Web Services) è la piattaforma cloud scelta per l'esecuzione delle funzioni serverless. Le AWS Lambda, scritte in Node.js, interagiscono con DynamoDB, un database NoSQL altamente scalabile, ed Elasticsearch, un motore di ricerca full-text che consente di effettuare ricerche rapide e flessibili tramite parole chiave. Le funzioni Lambda vengono esposte tramite AWS API Gateway, che fornisce endpoint HTTP pubblici per l'accesso alle API.

Facebook Graph API consente a Make di leggere e scrivere contenuti nei post e nei messaggi Messenger, facilitando la comunicazione tra utenti e il sistema, e inviando notifiche automatiche quando ci sono aggiornamenti rilevanti.

Il sistema sfrutta gli acquisti eseguiti all'interno di Facebook Marketplace, con pagamenti effettuati tramite metodi integrati come Facebook Pay. Make riceve i dati solo dopo la conferma dell'acquisto per gestire il cashback, garantendo che l'intero processo rimanga interno all'ecosistema Facebook, con una piena integrazione negli scenari automatizzati.

## Tecnologie scelte

- **Workflow Engine**: Make (Integromat) è utilizzato per orchestrare gli scenari di automazione, consentendo l'automazione di processi complessi attraverso un'interfaccia drag-and-drop intuitiva. Questa piattaforma cloud è fondamentale per la gestione delle interazioni tra i vari componenti del sistema e per la logica decisionale, senza necessità di hosting o manutenzione server.

- **Business Logic**: AWS Lambda, scritte in Node.js, gestiscono la logica di business, permettendo di eseguire codice in risposta a eventi senza la necessità di gestire server. Questo approccio serverless riduce i costi operativi e migliora la scalabilità del sistema.

- **AI per l'analisi dei testi**: Un sistema di intelligenza artificiale è integrato per analizzare i contenuti generati dagli utenti, estraendo informazioni chiave come tipo, categoria, prezzo e località, per facilitare la gestione degli annunci e delle richieste.

- **Database**: DynamoDB è utilizzato come database NoSQL per memorizzare i dati in modo scalabile e veloce, consentendo accessi rapidi e gestione efficiente delle informazioni relative a utenti, annunci e richieste.

- **Ricerca**: Elasticsearch è impiegato per fornire funzionalità di ricerca avanzate, permettendo agli utenti di trovare rapidamente ciò di cui hanno bisogno attraverso query basate su parole chiave.

- **Messaggistica**: Facebook Graph API è utilizzata per gestire la comunicazione tra il sistema e gli utenti, permettendo di inviare e ricevere messaggi tramite Messenger e di pubblicare contenuti sui post.

- **Hosting API**: AWS API Gateway, in combinazione con AWS Lambda, fornisce un'infrastruttura robusta per l'hosting delle API, consentendo di esporre le funzioni Lambda come endpoint HTTP pubblici.

- **File/Immagini**: Amazon S3 è utilizzato per la gestione e l'archiviazione di file e immagini, garantendo un accesso sicuro e scalabile ai contenuti multimediali.

## Scenari Make

### Handle New Facebook Post
Questo scenario gestisce gli eventi dei post ricevuti da Facebook. Inizia con un webhook che riceve eventi e li elabora per creare annunci o richieste nel marketplace. Include logica per gestire post specifici per gruppo, associando i post al corretto gruppo e gestendo i cashback.

### Periodic Request-Listing Matching
Questo scenario esegue la corrispondenza periodica tra richieste e annunci nel marketplace. Viene eseguito ogni 5 minuti tramite lo scheduler integrato di Make per garantire che gli utenti siano informati delle corrispondenze pertinenti. Include logica per notificare gli utenti in base alla lingua preferita e per gestire le corrispondenze specifiche del gruppo.

Per dettagli completi sulla configurazione degli scenari Make, consulta `docs/MAKE.md`.

## Descrizione generale del flusso

Make si occupa di:

- Intercettare contenuti pubblicati su Facebook, analizzandoli per estrarne informazioni utili.
- Analizzare semanticamente i contenuti tramite OpenAI (GPT-4), per garantire che le informazioni siano correttamente interpretate e utilizzate.
- Decidere le azioni successive in base ai risultati dell'analisi, come la creazione di annunci o la gestione delle richieste.
- Invocare le funzioni Lambda per la lettura e la scrittura dei dati su DynamoDB ed Elasticsearch, assicurando che le informazioni siano sempre aggiornate e disponibili.
- Inviare notifiche agli utenti tramite Facebook Messenger, mantenendo gli utenti informati su aggiornamenti e interazioni.

Le AWS Lambda restano funzioni semplici, senza logica applicativa, limitandosi all'interazione con DynamoDB e Elasticsearch, rendendo il sistema più modulare e facile da gestire.

## Analisi dei contenuti

Quando Make riceve testi da post o messaggi, li inoltra al modulo OpenAI (ChatGPT) con un prompt predefinito che richiede l'estrazione di tipo, categoria, prezzo, località, parole chiave e note. Questo processo è cruciale per garantire che le informazioni siano correttamente interpretate e utilizzate per le operazioni successive. Il risultato, un oggetto JSON, guida l'azione successiva dello scenario Make, permettendo una gestione fluida e automatizzata delle informazioni.

## Flussi principali

### Annuncio di vendita

1. **Ricezione di un post da parte del venditore**: Make intercetta il post pubblicato dal venditore su Facebook, avviando il processo di analisi e gestione dell'annuncio. L'intercettazione avviene tramite webhook configurati per ricevere notifiche in tempo reale.

2. **Invio testo al sistema di intelligenza artificiale**: il testo del post viene inviato al sistema di intelligenza artificiale (AI) per l'analisi, permettendo l'estrazione di informazioni chiave necessarie per la creazione dell'annuncio.

3. **Estrazione dati**: il sistema di intelligenza artificiale analizza il testo e estrae informazioni rilevanti come tipo di annuncio, categoria, prezzo e località. Questi dati vengono strutturati in un formato JSON, facilitando ulteriori elaborazioni.

4. **Salvataggio con Lambda "createListing"**: i dati estratti vengono salvati nel database DynamoDB tramite la funzione Lambda chiamata "createListing", responsabile della creazione di un nuovo record nel database.

5. **Pubblicazione post via Graph API**: una volta che l'annuncio è stato creato e salvato, Make utilizza il modulo Facebook Pages per pubblicare l'annuncio sulla piattaforma, rendendolo visibile agli altri utenti di Facebook.

6. **Conferma via Messenger**: il venditore riceve una conferma dell'avvenuta pubblicazione dell'annuncio tramite Messenger, informandolo sullo stato del proprio annuncio.

**Esempio**: Se un venditore scrive "Vendo aspirapolvere Dyson, zona Milano, 180 euro", il sistema estrarrà e strutturerà queste informazioni in JSON come segue: { tipo: "annuncio", categoria: "elettrodomestici", prezzo: 180, localita: "Milano" }.

### Richiesta di acquisto

1. **Ricezione di un messaggio da parte dellʼacquirente**: Make riceve un messaggio da un potenziale acquirente che esprime interesse per un prodotto, contenente dettagli specifici riguardo alla richiesta.

2. **Invio testo al sistema di intelligenza artificiale**: il testo del messaggio viene inviato al sistema di intelligenza artificiale per l'analisi, consentendo l'identificazione delle informazioni chiave necessarie per elaborare la richiesta.

3. **Estrazione dati**: l'AI estrae informazioni come tipo di richiesta, parole chiave e località, essenziali per cercare annunci che corrispondano alle esigenze dell'acquirente.

4. **Salvataggio richiesta**: la richiesta viene salvata nel sistema, creando un record utilizzabile per future elaborazioni e ricerche.

5. **Ricerca compatibilità**: Make cerca annunci compatibili utilizzando il modulo HTTP per chiamare la funzione "searchListings", interrogando il database per trovare annunci che soddisfano i criteri specificati dall'acquirente.

6. **Invio risultati o salvataggio richiesta**: i risultati della ricerca vengono inviati all'acquirente, oppure la richiesta viene salvata per future ricerche se non ci sono corrispondenze immediate.

**Esempio**: Un acquirente che scrive "Cerco bicicletta da città a Bologna sotto i 150 euro" avvia il processo di ricerca e analisi per trovare annunci pertinenti.

### Matching periodico (ogni 5 minuti)

1. **Recupero richieste attive**: Make esegue una scansione delle richieste attive nel sistema tramite lo scheduler integrato per identificare quali siano ancora valide e necessitino di attenzione.

2. **Ricerca annunci compatibili**: vengono cercati annunci che corrispondono alle richieste attive, utilizzando criteri di corrispondenza basati sulle informazioni estratte.

3. **Notifica acquirente e venditori selezionati**: gli utenti vengono informati delle corrispondenze trovate, consentendo loro di interagire e completare le transazioni.

### Notifica venditori

1. **Selezione con "getMatchingSellers"**: vengono selezionati i venditori compatibili con le richieste attive, basandosi su criteri di corrispondenza.

2. **Invio messaggio anonimo via Messenger**: i venditori ricevono notifiche sulle richieste pertinenti, mantenendo l'anonimato dell'acquirente fino a quando non si avvia una conversazione.

3. **Se risposta positiva, creazione assistita dell'annuncio**: se il venditore risponde positivamente, Make assiste nella creazione dell'annuncio tramite il modulo OpenAI, facilitando il processo di pubblicazione.

### Gestione cashback

1. **Prima dell'acquisto, proposta utilizzo cashback**: il sistema propone l'uso del cashback disponibile all'acquirente, incentivando l'uso della piattaforma.

2. **Conferma acquisto da Facebook**: il pagamento viene confermato tramite Facebook, garantendo che tutte le transazioni siano sicure e verificate.

3. **Calcolo e aggiornamento saldo**: il saldo cashback dell'utente viene aggiornato in base all'acquisto effettuato.

4. **Salvataggio transazione**: la transazione viene registrata nel sistema per garantire la tracciabilità e la gestione delle finanze.

5. **Notifiche a utente e venditore**: entrambi gli utenti ricevono notifiche sui dettagli della transazione, mantenendo tutti informati.

6. **In caso di rimborso: ripristino saldo con "rollbackPayback"**: se necessario, il saldo cashback viene ripristinato in caso di rimborso, garantendo che il sistema rimanga equo e trasparente.

### Distribuzione del Cashback

Quando una vendita avviene nel marketplace o in un gruppo di interesse, una parte del costo viene utilizzata come commissione e distribuita tra i partecipanti coinvolti. La struttura di distribuzione del cashback è la seguente:

1. **Commissione di Quofind**: Una percentuale del prezzo di vendita (definita nella tabella `cashbackConfig`) viene trattenuta come commissione per Quofind. Questo rappresenta il guadagno per la piattaforma.

2. **Cashback per il Capo Gruppo**: Una percentuale del prezzo di vendita (anch'essa definita nella tabella `cashbackConfig`) viene accreditata come cashback per il capo gruppo. Questo incentivo incoraggia i leader a promuovere attivamente le vendite all'interno del loro gruppo.

3. **Cashback per l'Acquirente**: Una percentuale del prezzo di vendita viene accreditata come cashback per l'acquirente, incentivando ulteriormente gli acquisti nel marketplace.

### Regole Generali del Cashback

1. **Utilizzo del Cashback**
   - Il cashback può essere utilizzato per qualsiasi acquisto sulla piattaforma
   - Non è possibile convertire il cashback in denaro contante

2. **Periodo di Validità**
   - Il cashback scade dopo 12 mesi dall'accorso
   - Non è possibile accumulare cashback da più acquisti

3. **Limiti di Utilizzo**
   - Non è applicabile su prodotti già in offerta
   - Non è cumulabile con altri buoni sconto

### Tabella `cashbackConfig`

La tabella `cashbackConfig` gestisce le configurazioni del sistema di cashback:

- `id`: Identificatore univoco (default: 'default')
- `quofindCommission`: Percentuale della commissione per Quofind (default: 10%)
- `buyerCashback`: Percentuale di cashback per l'acquirente (default: 66%)
- `groupLeaderCashback`: Percentuale di cashback per il capo gruppo (default: 5%)
- `referrerCashback`: Percentuale di cashback per i segnalatori (default: 2%)

### Tabella `PaybackBalances`

La tabella `PaybackBalances` gestisce i saldi di cashback degli utenti:

- `userId`: Identificatore dell'utente
- `balance`: Saldo attuale del cashback
- `pending`: Cashback in attesa di accreditamento
- `lastUpdated`: Timestamp dell'ultimo aggiornamento

### Tabella `Transactions`

La tabella `Transactions` registra tutte le transazioni di cashback:

- `transactionId`: Identificatore univoco della transazione
- `userId`: Identificatore dell'utente
- `amount`: Importo della transazione
- `type`: Tipo di transazione (credit/debit)
- `status`: Stato della transazione (pending/completed)
- `timestamp`: Timestamp della transazione
- `referenceId`: Identificatore della vendita/riferimento

## Funzioni Lambda disponibili

### Gestione Annunci e Richieste
- **createListing**: gestisce il salvataggio degli annunci nel database
- **createRequest**: gestisce il salvataggio delle richieste di acquisto
- **searchListings**: esegue ricerche di annunci in base a criteri specifici
- **getActiveRequests**: recupera le richieste attive nel sistema
- **getExpiredRequests**: recupera le richieste scadute
- **getExpiredListings**: recupera gli annunci scaduti
- **getMatchingSellers**: identifica i venditori compatibili con le richieste attive

### Gestione Cashback
- **getPaybackBalance**: legge il saldo cashback attuale
- **updatePayback**: aggiorna il saldo cashback degli utenti
- **rollbackPayback**: ripristina il saldo cashback in caso di rimborso
- **getCashbackConfig**: recupera la configurazione del cashback
- **distributeGroupCashback**: distribuisce il cashback ai membri del gruppo

### Gestione Gruppi
- **createGroup**: gestisce la creazione di un nuovo gruppo
- **addUserToGroup**: aggiunge un utente a un gruppo esistente
- **removeUserFromGroup**: rimuove un utente da un gruppo
- **getGroupInfo**: recupera le informazioni su un gruppo

### Sistema di Chatbot
- **messageHandler**: gestisce i messaggi in entrata da Messenger
- **intentAnalyzer**: analizza il testo e identifica l'intento dell'utente
- **queryBuilder**: costruisce le query SQL basate sull'intento
- **dataFetcher**: recupera i dati dal database
- **responseFormatter**: formatta le risposte per l'utente

### Funzioni di Utilità
- **utils**: funzioni di utilità comuni
- **config**: configurazioni di sistema

### Esempio di Utilizzo

```javascript
// Esempio di utilizzo di messageHandler
const response = await messageHandler({
    message: {
        text: "Quanto è il mio saldo di cashback?"
    },
    sender: {
        id: "user123"
    }
});
```

## Funzioni Lambda per la Gestione dei Gruppi

### createGroup
Questa funzione gestisce la creazione di un nuovo gruppo nel marketplace. Accetta come input il `groupId`, il `groupName` e il `leaderId`, e memorizza queste informazioni in DynamoDB.

### addUserToGroup
Questa funzione consente di aggiungere un utente a un gruppo esistente. Richiede il `groupId` e il `userId`, aggiornando il gruppo per includere il nuovo membro.

### removeUserFromGroup
Questa funzione rimuove un utente da un gruppo esistente. Accetta il `groupId` e il `userId`, aggiornando il gruppo per escludere il membro specificato.

### getGroupInfo
Questa funzione recupera le informazioni di un gruppo specifico da DynamoDB, inclusi i membri e i dettagli del gruppo. Richiede il `groupId` come input.

### distributeGroupCashback
Questa funzione distribuisce il cashback al capo gruppo e agli acquirenti in base al prezzo di vendita e alle percentuali recuperate dalla tabella `cashbackConfig`. Richiede il `groupId` e il `salePrice` come input.

## Funzionamento del Chatbot in Messenger

### 1. Setup Iniziale

1. **Webhook Configuration**
   - Il sistema si connette al webhook di Messenger
   - Configura i token di accesso e verifica
   - Imposta gli eventi da monitorare

2. **Autenticazione**
   - Verifica dell'identità dell'utente
   - Gestione dei permessi
   - Protezione dei dati sensibili

3. **Inizializzazione del Chatbot**
   - Quando un utente apre la chat su Messenger:
     1. Messenger invia un evento `messages` al webhook
     2. Il webhook verifica l'autenticità del token
     3. Il sistema verifica se è la prima interazione dell'utente
     4. Se è la prima volta:
        - Salva l'ID dell'utente nel database
        - Invia un messaggio di benvenuto
        - Suggerisce comandi utili
     5. Se non è la prima volta:
        - Carica il profilo dell'utente
        - Attiva il listener per i messaggi

4. **Flusso di Comunicazione**

1. **Ricezione del Messaggio**
   ```javascript
   // Esempio di evento di Messenger
   {
       object: 'page',
       entry: [
           {
               id: 'PAGE_ID',
               time: 123456789,
               messaging: [
                   {
                       message: {
                           text: "Quanto è il mio saldo?"
                       },
                       sender: {
                           id: "USER_ID"
                       }
                   }
               ]
           }
       ]
   }
   ```

2. **Analisi del Testo**
   - Il `messageHandler` riceve il messaggio
   - Estrae il testo e l'ID del mittente
   - Invia il testo all'`intentAnalyzer`

3. **Identificazione dell'Intento**
   - Utilizza l'API di OpenAI per l'analisi
   - Identifica l'intento dell'utente
   - Estrae le entità rilevanti
   ```javascript
   // Esempio di output dell'intentAnalyzer
   {
       intent: 'balance',
       entities: {},
       confidence: 0.95
   }
   ```

4. **Costruzione della Query**
   - Il `queryBuilder` crea la query SQL
   - Utilizza l'intento identificato
   - Aggiunge filtri di sicurezza
   ```javascript
   // Esempio di query
   {
       TableName: 'PaybackBalances',
       KeyConditionExpression: 'userId = :userId',
       ExpressionAttributeValues: {
           ':userId': 'USER_ID'
       }
   }
   ```

5. **Recupero dei Dati**
   - Il `dataFetcher` interroga DynamoDB
   - Recupera i dati richiesti
   - Gestisce eventuali errori

6. **Formattazione della Risposta**
   - Il `responseFormatter` prepara la risposta
   - Adatta il formato al contesto
   - Gestisce i casi di errore
   ```javascript
   // Esempio di risposta formattata
   {
       text: "Il tuo saldo attuale è di €50.00"
   }
   ```

7. **Invio della Risposta**
   - Il `messageHandler` invia la risposta
   - Utilizza l'API di Messenger
   - Gestisce la consegna

### 3. Gestione degli Errori

1. **Errori di Analisi**
   - Messaggi ambigui
   - Testo non comprensibile
   - Richieste non supportate

2. **Errori di Database**
   - Timeout
   - Connessione persa
   - Dati non trovati

3. **Errori di Autorizzazione**
   - Accesso a dati riservati
   - Azioni non consentite
   - Violazione dei termini di servizio

### 4. Esempi di Interazione

1. **Richiesta di Saldo**
   ```
   Utente: "Quanto è il mio saldo?"
   Bot: "Il tuo saldo attuale è di €50.00"
   ```

2. **Richiesta di Storico**
   ```
   Utente: "Quando ho fatto l'ultima transazione?"
   Bot: "L'ultima transazione è stata effettuata il 2025-04-23 alle 15:00"
   ```

3. **Richiesta di Cashback**
   ```
   Utente: "Quanto cashback ho guadagnato?"
   Bot: "Hai guadagnato €15.00 di cashback questo mese"
   ```

4. **Richiesta Non Autorizzata**
   ```
   Utente: "Quanto ha guadagnato il mio concorrente?"
   Bot: "Mi dispiace, ma non posso condividere informazioni sui tuoi concorrenti. Queste informazioni sono riservate ai singoli venditori."
   ```

### 5. Best Practices

1. **Sicurezza**
   - Validazione dei dati
   - Protezione delle informazioni sensibili
   - Gestione dei token

2. **Performance**
   - Caching delle risposte comuni
   - Ottimizzazione delle query
   - Rate limiting

3. **Usabilità**
   - Risposte chiare e concise
   - Gestione del contesto
   - Feedback utente

## Autenticazione Utente

Per garantire la sicurezza e la protezione dei dati, il sistema implementa un meccanismo di autenticazione degli utenti. Gli utenti devono registrarsi e accedere tramite Facebook, utilizzando il Facebook Login per ottenere un token di accesso. Questo token viene utilizzato per autenticare le richieste API e garantire che solo gli utenti autorizzati possano accedere a funzionalità sensibili.

## Gestione degli Errori

Il sistema implementa una gestione degli errori robusta per garantire che eventuali problemi durante l'esecuzione dei workflow siano gestiti in modo appropriato. Gli errori vengono registrati e segnalati agli amministratori, mentre gli utenti ricevono messaggi chiari e comprensibili in caso di problemi. Le funzioni Lambda includono logiche di gestione degli errori per garantire che le operazioni siano sicure e affidabili.

## Test e Validazione

Per garantire l'affidabilità del sistema, vengono implementati test unitari e di integrazione per le funzioni Lambda e gli scenari Make. Questi test aiutano a identificare eventuali problemi prima del rilascio e garantiscono che le modifiche future non introducano regressioni nel sistema.

## Considerazioni sulla Scalabilità

Il sistema è progettato per essere scalabile, sfruttando le funzionalità di AWS per gestire un aumento del carico di lavoro. Le funzioni Lambda possono scalare automaticamente in base alla domanda, e DynamoDB offre una gestione elastica delle risorse per supportare un numero crescente di utenti e dati.

## Documentazione per Sviluppatori

Per facilitare la manutenzione e l'estensione del sistema, è disponibile una documentazione per sviluppatori che include:
- **Standard di Codifica**: Linee guida su come scrivere codice chiaro e mantenibile.
- **Best Practices**: Raccomandazioni su come gestire le dipendenze, scrivere test e documentare il codice.
- **Guida all'Estensione**: Informazioni su come aggiungere nuove funzionalità o modificare quelle esistenti senza compromettere la stabilità del sistema.

## Conclusione

Questo documento fornisce una panoramica completa dell'architettura e delle operazioni del progetto Quofind Marketplace. Con l'aggiunta di sezioni su autenticazione, gestione degli errori, test, scalabilità e documentazione per sviluppatori, il progetto è ora meglio attrezzato per affrontare le sfide future e garantire un'esperienza utente sicura e fluida.