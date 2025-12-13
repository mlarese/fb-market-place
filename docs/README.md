# Marketplace Project Documentation

## Panoramica del Progetto

Questo progetto è una piattaforma completa di marketplace denominata Quofind, progettata per gestire annunci di vendita, richieste di acquisto, notifiche in tempo reale e transazioni cashback. L'architettura si basa su servizi AWS per garantire scalabilità e affidabilità:

- **DynamoDB**: Utilizzato come database NoSQL per memorizzare annunci, richieste e dati utente, con tabelle dedicate per isolare i dati. Questo consente un accesso rapido e una gestione efficiente dei dati.
- **AWS Lambda**: Funzioni serverless che elaborano eventi, come la creazione di annunci o la ricerca di corrispondenze. Queste funzioni vengono attivate da eventi specifici, permettendo di ridurre i costi e migliorare la reattività del sistema.
- **Elasticsearch (via AWS OpenSearch)**: Utilizzato per eseguire ricerche efficienti su annunci e richieste. Grazie a indici ottimizzati per campi come categoria, posizione e parole chiave, gli utenti possono trovare rapidamente ciò di cui hanno bisogno.
- **Make (Integromat) Scenarios**: Integra webhook per piattaforme come Facebook e utilizza analisi AI (es. tramite OpenAI) per categorizzare contenuti e inviare notifiche multilingua. Questo consente un'interazione fluida tra il marketplace e le piattaforme esterne.

Lo scopo principale è facilitare transazioni tra utenti, con funzionalità di matching automatico e gestione cashback per incoraggiare l'uso della piattaforma.

## Prerequisiti

Prima di procedere, assicurati di avere tutti i componenti necessari installati e configurati per evitare errori durante il setup. Ecco i dettagli:

- **Account AWS**: È necessario avere un account attivo con permessi IAM per accedere a servizi come DynamoDB, Lambda, API Gateway e OpenSearch. Ti consiglio di creare un nuovo utente IAM con policy come 'AmazonDynamoDBFullAccess', 'AWSLambdaFullAccess' e 'AmazonOpenSearchServiceFullAccess' per garantire la sicurezza del tuo ambiente di lavoro.
- **Node.js e npm**: Assicurati di avere installato Node.js nella versione 18.x o superiore. Puoi verificare la tua installazione eseguendo i comandi `node -v` e `npm -v`. Se non hai Node.js installato, puoi scaricarlo dal sito ufficiale [nodejs.org](https://nodejs.org) e seguire le istruzioni per l'installazione.
- **AWS CLI**: Per interagire con i servizi AWS tramite la riga di comando, installa l'AWS CLI utilizzando il comando `curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o AWSCLIV2.pkg` su macOS. Una volta scaricato, esegui `sudo installer -pkg AWSCLIV2.pkg -target /` per completare l'installazione. Dopo l'installazione, configura l'AWS CLI utilizzando il comando `aws configure` e inserisci le tue credenziali IAM.
- **Elasticsearch/OpenSearch**: È fondamentale avere un'istanza di Elasticsearch in esecuzione. Se utilizzi AWS, puoi creare un dominio OpenSearch e ottenere l'endpoint. Per verificare che tutto funzioni correttamente, esegui il comando `curl -X GET endpoint/_cat/indices?v` per controllare gli indici disponibili.
- **Make (Integromat)**: Per la gestione dei workflow, registrati su [make.com](https://www.make.com). Make è una piattaforma cloud che non richiede installazione locale. Il free tier include 1,000 operazioni/mese.
- **Variabili d'Ambiente**: È importante preparare le variabili d'ambiente in un file .env o nella console AWS. Queste variabili includono endpoint Elasticsearch, nomi delle tabelle DynamoDB e chiavi API (ad esempio, per OpenAI). Assicurati di non hardcodare le chiavi API, ma di utilizzare AWS Secrets Manager per una gestione sicura.
- **Altre Dipendenze**: Assicurati di installare pacchetti npm come `aws-sdk`, `uuid` e `elasticsearch` eseguendo `npm install` in ogni directory Lambda per garantire che tutte le funzionalità siano disponibili.

## Guida Passo-Passo per Creare l'Infrastruttura

Segui questi passi dettagliati per impostare l'infrastruttura. Ogni passo include spiegazioni, comandi specifici e consigli per gestire errori comuni.

1. **Configura AWS Account e Servizi:**

   - Accedi alla console AWS e vai su IAM per creare un ruolo per Lambda con policy per DynamoDB e OpenSearch. Questo passaggio è cruciale per garantire che le tue funzioni Lambda abbiano i permessi necessari per accedere ai dati.
   - Crea tabelle DynamoDB: Vai su DynamoDB, clicca 'Crea tabella', nomina 'MarketplaceListings' con chiave primaria 'id' (stringa), e ripeti per 'MarketplaceRequests' e 'MarketplaceUsers'. Questo ti permetterà di gestire gli annunci e le richieste in modo efficiente. Ricorda di controllare che la regione AWS sia consistente per evitare problemi di accesso.
   - Imposta OpenSearch: Crea un dominio, attendi la provisioning (può richiedere 10-15 minuti), e copia l'endpoint. Una volta creato, puoi testare la connessione eseguendo `curl -X GET endpoint/_cat/indices?v` per verificare che il dominio sia attivo e funzionante.

2. **Imposta Variabili d'Ambiente:**

   - Per ogni funzione Lambda, vai alla console AWS, seleziona la funzione e aggiungi variabili come `LISTINGS_TABLE_NAME='MarketplaceListings'` e `ELASTICSEARCH_ENDPOINT='tua-endpoint'`. Queste variabili sono essenziali per il corretto funzionamento delle funzioni Lambda. Utilizza AWS Secrets Manager per gestire le chiavi sensibili in modo sicuro.
   - Errore comune: Se le variabili non sono impostate correttamente, potresti riscontrare errori di runtime. Assicurati di controllare i log in CloudWatch per identificare eventuali problemi.

3. **Sviluppa e Deploya Funzioni Lambda:**

   - Per ogni file in `project/lambda` (es. createListing.js), assicurati che il codice sia in un file index.js o specificato. Questo è importante per garantire che il codice venga eseguito correttamente.
   - Compila e zippa: Esegui il comando `zip -r lambda.zip index.js node_modules` nella directory del file per preparare il pacchetto da caricare.
   - Deploya: Usa il comando `aws lambda create-function --function-name CreateListing --runtime nodejs18.x --role arn:aws:iam::123456789012:role/lambda-role --handler index.handler --zip-file fileb://lambda.zip --environment Variables={...}`. Ricorda di sostituire ARN e variabili con i valori corretti.
   - **Alternativa tramite Pannello di Controllo:**
     - Accedi alla console AWS, vai su Lambda, clicca 'Crea funzione', seleziona 'Author from scratch', imposta il nome (es. CreateListing), runtime (Node.js 18.x), e carica il codice ZIP manualmente. Questo metodo è utile se preferisci una configurazione visiva. Assicurati di assegnare il ruolo IAM e configurare le variabili d'ambiente tramite l'interfaccia. Errore comune: Assicurati che il ruolo IAM sia selezionato correttamente per evitare permessi negati.

4. **Configura e Popola Elasticsearch:**

   - Crea indici: Usa `curl -X PUT endpoint/listings -H 'Content-Type: application/json' -d '{"mappings": {"properties": {"category": {"type": "keyword"}, "location": {"type": "geo_point"}}}'` per definire mappature appropriate per i tuoi dati. Questo è fondamentale per garantire che le ricerche funzionino correttamente.
   - Assicurati che Lambda possa accedere: Potrebbe essere necessario aggiungere policy di rete per consentire l'accesso alle funzioni Lambda. Questo passaggio è cruciale per garantire la comunicazione tra i tuoi servizi.
   - Errore comune: Se gli indici non esistono, potresti ricevere errori 404. Verifica sempre con curl prima di procedere con le operazioni di ricerca.

5. **Imposta Make Scenarios:**

   - Accedi a [make.com](https://www.make.com) e crea un nuovo scenario.
   - Configura le connessioni: Facebook Pages, OpenAI (ChatGPT), HTTP per le chiamate alle Lambda.
   - Crea gli scenari seguendo la documentazione in `docs/MAKE.md`.
   - Per AI, configura la connessione OpenAI con la tua API key nelle impostazioni di Make.
   - Errore comune: Se il webhook non viene attivato, verifica la configurazione e testa con strumenti come Postman per assicurarti che le richieste vengano inviate correttamente.

6. **Testa l'Infrastruttura:**

   - Esegui Lambda manualmente: Usa la console per invocare la funzione e controllare i log in CloudWatch per errori. Questo ti aiuterà a diagnosticare eventuali problemi durante lo sviluppo.
   - Testa integrazioni: Utilizza strumenti come Postman per inviare richieste API a Lambda tramite API Gateway. Questo ti permetterà di verificare che tutto funzioni come previsto.
   - Simula flussi: Crea un annuncio tramite Lambda e verifica in Elasticsearch eseguendo `curl -X GET endpoint/listings/_search`. Questo è un passaggio fondamentale per garantire che i dati vengano memorizzati e recuperati correttamente.
   - Errore comune: Se riscontri dati inconsistenti, aggiungi logging dettagliato nel codice per identificare dove si verifica il problema.

7. **Distribuzione e Monitoraggio:**

   - Configura API Gateway: Crea un'API REST, integra con Lambda e distribuisci per rendere disponibili gli endpoint pubblici. Questo passaggio è essenziale per rendere la tua applicazione accessibile agli utenti.
   - Monitora: Utilizza CloudWatch per impostare allarmi su errori o metriche (es. invio Lambda). Questo ti aiuterà a mantenere il controllo sulla salute della tua applicazione.
   - Aggiornamenti: Se apporti modifiche al codice, ridistribuisci con `aws lambda update-function-code` per garantire che le nuove funzionalità siano disponibili. Questo è un passaggio fondamentale per mantenere la tua applicazione aggiornata e funzionante.
   - Errore comune: Se riscontri timeout con Lambda, aumenta il timeout nelle impostazioni se le operazioni richiedono più tempo del previsto.

## Creazione di API Gateway

In questa sezione, spiegheremo come creare un API Gateway in AWS per esporre le funzioni Lambda come endpoint HTTP. Ogni passaggio include dettagli su come configurare la sicurezza tramite token e la creazione di vari entrypoint.

### Passaggi per Creare un API Gateway

1. **Accedi alla Console AWS**:
   - Vai alla console AWS e cerca 'API Gateway' nella barra di ricerca.
   - Clicca su 'API Gateway' per accedere alla dashboard.

2. **Crea una Nuova API**:
   - Clicca su 'Crea API'. Puoi scegliere tra API REST, WebSocket o HTTP. Per questo esempio, seleziona 'API REST'.
   - Scegli 'Nuova API' e compila i dettagli richiesti:
     - **Nome API**: Dai un nome significativo alla tua API (es. `QuofindAPI`).
     - **Descrizione**: Fornisci una breve descrizione della tua API.
     - **Endpoint Type**: Scegli tra 'Regional', 'Edge-optimized' o 'Private'. Per la maggior parte dei casi, 'Regional' è una buona scelta.
   - Clicca su 'Crea API' per completare il processo.

3. **Creazione di Endpoint (Resource)**:
   - Nella dashboard della tua API, clicca su 'Actions' e seleziona 'Crea risorsa'.
   - Compila i dettagli per la nuova risorsa:
     - **Nome risorsa**: Dai un nome alla risorsa (es. `listings`).
     - **Path**: Questo sarà il percorso dell'endpoint (es. `/listings`).
   - Clicca su 'Crea risorsa'.

4. **Aggiungere Metodi all'Endpoint**:
   - Seleziona la risorsa appena creata e clicca su 'Actions' > 'Crea metodo'.
   - Scegli il metodo HTTP desiderato (es. `GET`, `POST`, `PUT`, `DELETE`) e clicca sulla spunta per confermare.
   - Nella configurazione del metodo:
     - **Integrazione**: Seleziona 'Lambda Function'.
     - **Lambda Function**: Inserisci il nome della funzione Lambda che desideri invocare (es. `createListing`).
     - Assicurati di abilitare 'Use Lambda Proxy integration' se desideri gestire le richieste direttamente nella funzione Lambda.
   - Clicca su 'Salva' e conferma le autorizzazioni richieste per la tua funzione Lambda.

5. **Configurare la Sicurezza con Token**:
   - Per proteggere i tuoi endpoint, puoi utilizzare un token di autenticazione. Puoi configurare un 'Authorizer':
     - Vai su 'Authorizers' nella dashboard della tua API.
     - Clicca su 'Crea Authorizer'.
     - Compila i dettagli:
       - **Nome**: Dai un nome all'authorizer (es. `TokenAuthorizer`).
       - **Tipo**: Scegli 'Cognito' se utilizzi Amazon Cognito per la gestione degli utenti, oppure 'Lambda' se utilizzi una funzione Lambda per la validazione del token.
     - Configura i dettagli richiesti e salva l'authorizer.
   - Torna al metodo creato e seleziona l'authorizer appena creato nella sezione 'Autorizzazione'.

6. **Testare l'API**:
   - Dopo aver configurato i metodi e le risorse, puoi testare l'API direttamente dalla console.
   - Vai su 'Test' e seleziona il metodo che desideri testare. Inserisci i parametri richiesti e invia la richiesta.
   - Controlla la risposta per assicurarti che tutto funzioni correttamente.

7. **Distribuire l'API**:
   - Una volta che sei soddisfatto della configurazione, è importante distribuire l'API per renderla accessibile.
   - Clicca su 'Actions' > 'Deploy API'.
   - Crea una nuova fase di distribuzione (es. `v1`) e clicca su 'Deploy'.
   - Prendi nota dell'URL dell'endpoint fornito, che sarà utilizzato per accedere alla tua API.

### Gestione degli Errori

È importante notare che gli errori restituiti dall'API sono localizzati in base alla lingua impostata dall'utente. Ciò significa che:

- **Lingua di Default**: L'API utilizza la lingua di default dell'applicazione o quella del browser dell'utente per restituire messaggi di errore. Questo aiuta a garantire che gli utenti comprendano chiaramente i problemi che potrebbero verificarsi durante l'interazione con l'API.

- **Esempi di Errori Localizzati**:
  - Se un utente con la lingua impostata su italiano invia una richiesta non valida, l'errore sarà restituito in italiano, come `"Richiesta non valida"`.
  - Analogamente, se un utente ha la lingua impostata su inglese, il messaggio di errore sarà `"Bad Request"`.

Assicurati che il tuo codice gestisca correttamente la localizzazione degli errori, utilizzando le librerie di internazionalizzazione appropriate per il tuo ambiente di sviluppo. Questo migliorerà l'esperienza utente e faciliterà la comprensione degli errori.

Contattaci per ulteriori dettagli o assistenza nella gestione della localizzazione degli errori!

### Esempi di Entry Points

1. **GET /listings**: Recupera tutti gli annunci dal database.
   - **Descrizione**: Questo endpoint restituisce una lista di tutti gli annunci disponibili nel marketplace.
   - **Parametri**: Puoi includere parametri di query per filtrare i risultati:
     - `category`: Filtra gli annunci per categoria.
     - `location`: Filtra gli annunci in base alla posizione.
   - **Esempio di Richiesta**:
     ```http
     GET https://api.quofind.com/listings?category=electronics&location=Rome
     ```
   - **Esempio di Risposta**:
     ```json
     [
       {
         "id": "1",
         "title": "Smartphone XYZ",
         "price": 299.99,
         "category": "electronics",
         "location": "Rome"
       },
       {
         "id": "2",
         "title": "Laptop ABC",
         "price": 799.99,
         "category": "electronics",
         "location": "Rome"
       }
     ]
     ```
   - **Errori Comuni**:
     - `404 Not Found`: Se non ci sono annunci disponibili.
     - `400 Bad Request`: Se i parametri di query non sono validi.

2. **POST /listings**: Crea un nuovo annuncio.
   - **Descrizione**: Questo endpoint consente agli utenti di creare un nuovo annuncio nel marketplace.
   - **Corpo della Richiesta** (JSON):
     ```json
     {
       "title": "Smartwatch DEF",
       "price": 199.99,
       "category": "electronics",
       "location": "Milan"
     }
     ```
   - **Esempio di Richiesta**:
     ```http
     POST https://api.quofind.com/listings
     Content-Type: application/json
     ```
   - **Esempio di Risposta**:
     ```json
     {
       "message": "Annuncio creato con successo!",
       "id": "3"
     }
     ```
   - **Errori Comuni**:
     - `400 Bad Request`: Se il corpo della richiesta non è formattato correttamente o mancano campi obbligatori.
     - `401 Unauthorized`: Se l'utente non è autenticato o non ha i permessi per creare un annuncio.

3. **GET /listings/{id}**: Recupera un annuncio specifico in base all'ID fornito.
   - **Descrizione**: Questo endpoint restituisce i dettagli di un annuncio specifico.
   - **Parametri**:
     - `id`: L'ID dell'annuncio da recuperare.
   - **Esempio di Richiesta**:
     ```http
     GET https://api.quofind.com/listings/1
     ```
   - **Esempio di Risposta**:
     ```json
     {
       "id": "1",
       "title": "Smartphone XYZ",
       "price": 299.99,
       "category": "electronics",
       "location": "Rome"
     }
     ```
   - **Errori Comuni**:
     - `404 Not Found`: Se l'annuncio con l'ID specificato non esiste.

4. **DELETE /listings/{id}**: Elimina un annuncio specifico in base all'ID fornito.
   - **Descrizione**: Questo endpoint consente di eliminare un annuncio dal marketplace.
   - **Parametri**:
     - `id`: L'ID dell'annuncio da eliminare.
   - **Esempio di Richiesta**:
     ```http
     DELETE https://api.quofind.com/listings/1
     ```
   - **Esempio di Risposta**:
     ```json
     {
       "message": "Annuncio eliminato con successo!"
     }
     ```
   - **Errori Comuni**:
     - `404 Not Found`: Se l'annuncio con l'ID specificato non esiste.
     - `401 Unauthorized`: Se l'utente non ha i permessi per eliminare l'annuncio.

Contattaci per ulteriori dettagli o assistenza nella configurazione delle API Gateway!

### Visualizzazione della documentazione OpenAPI

Per accedere alla documentazione OpenAPI per il marketplace Quofind, puoi utilizzare i seguenti script:

1. **Utilizzare lo script Bash**:
   Esegui il seguente comando nel terminale:
   ```bash
   ./preview-docs.sh
   ```

2. **Utilizzare lo script Batch** (per Windows):
   Esegui il seguente comando nel prompt dei comandi:
   ```batch
   preview-docs.bat
   ```

Dopo aver eseguito uno di questi comandi, vai a **Server di anteprima in esecuzione su http://127.0.0.1:8080** per accedere alla documentazione.

Questi passaggi ti permetteranno di interagire con la tua API utilizzando Redocly CLI.

### Localizzazione degli Errori

Le funzioni Lambda e gli scenari Make sono stati aggiornati per gestire la localizzazione degli errori in base alla lingua dell'utente. Questo significa che:

- **Funzioni Lambda**: Gli errori restituiti dalle funzioni Lambda, come `createListing` e `getPaybackBalance`, ora forniscono messaggi di errore localizzati. Ad esempio:
  - Se un campo obbligatorio è mancante, l'errore sarà restituito in italiano se la lingua è impostata su `it` o in inglese se impostata su `en`.

- **Scenari Make**: Gli scenari Make sono stati configurati per includere un parametro `language` quando inviano richieste all'API. Questo parametro garantisce che le risposte siano localizzate in base alla lingua dell'utente, migliorando l'esperienza utente e la comprensione degli errori.

Assicurati di gestire correttamente la lingua dell'utente nel tuo codice per fornire messaggi di errore chiari e comprensibili.

# Quofind Marketplace

Quofind Marketplace è una piattaforma di compravendita che consente agli utenti di creare e gestire gruppi di interesse, facilitando le interazioni tra venditori e acquirenti. La piattaforma offre funzionalità di cashback per incentivare le vendite e migliorare l'esperienza dell'utente.

## Funzionalità Principali
- **Creazione di Gruppi di Interesse**: Gli utenti possono creare gruppi basati su interessi comuni, dove i capi gruppo possono gestire offerte di vendita.
- **Commissioni e Cashback**: Una parte del costo delle vendite viene utilizzata come commissione e distribuita tra i partecipanti:
  - **Commissione di Quofind**: Percentuale trattenuta come guadagno per la piattaforma.
  - **Cashback per il Capo Gruppo**: Percentuale accreditata al capo gruppo.
  - **Cashback per l'Acquirente**: Percentuale accreditata all'acquirente.

## Configurazione Cashback
La configurazione delle commissioni e dei cashback è gestita attraverso la tabella `cashbackConfig` in DynamoDB, che include:
- **quofindCommission**: Percentuale della commissione per Quofind.
- **groupLeaderCashback**: Percentuale di cashback per il capo gruppo.
- **buyerCashback**: Percentuale di cashback per l'acquirente.
- **leaderCashbackPercentage**: Percentuale di cashback per il capo gruppo, ora gestita nella tabella di configurazione.
- **buyerCashbackPercentage**: Percentuale di cashback per l'acquirente, ora gestita nella tabella di configurazione.

Queste configurazioni possono essere modificate per adattarsi alle strategie di business e alle promozioni in corso. La tabella consente una gestione flessibile delle commissioni e dei cashback, garantendo che il sistema rimanga reattivo alle esigenze del marketplace e dei gruppi di interesse.

## Utilizzo
1. **Creare un Gruppo**: Gli utenti possono creare un nuovo gruppo e invitare membri.
2. **Pubblicare Offerte**: I capi gruppo possono pubblicare offerte di vendita all'interno del loro gruppo.
3. **Gestire Cashback**: Il sistema calcola e distribuisce automaticamente il cashback in base al prezzo di vendita e alle percentuali recuperate dalla tabella `cashbackConfig`. Richiede il `groupId` e il `salePrice` come input.

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

## Documentazione
Per ulteriori dettagli sulle API e sull'architettura, consultare il **MANUALE TECNICO** e il documento **GRUPPI.md**.

## Scenari Make

### Handle New Facebook Post
Questo scenario gestisce gli eventi dei post ricevuti da Facebook. Inizia con un webhook che riceve eventi e li elabora per creare annunci o richieste nel marketplace. Include logica per gestire post specifici per gruppo, associando i post al corretto gruppo e gestendo i cashback.

### Periodic Request-Listing Matching
Questo scenario esegue la corrispondenza periodica tra richieste e annunci nel marketplace. Viene eseguito ogni 5 minuti per garantire che gli utenti siano informati delle corrispondenze pertinenti. Include logica per notificare gli utenti in base alla lingua preferita e per gestire le corrispondenze specifiche del gruppo.

Per dettagli completi sulla configurazione degli scenari Make, consulta `docs/MAKE.md`.

## Funzioni Lambda Aggiornate

### getCashbackConfig
Questa funzione recupera la configurazione del cashback da DynamoDB, inclusi i parametri per il cashback del capo gruppo e dell'acquirente.

### updatePayback
Questa funzione aggiorna i saldi di cashback per il capo gruppo e l'acquirente in base ai parametri di configurazione recuperati dalla tabella `cashbackConfig`. Include logica per gestire i gruppi durante l'aggiornamento dei saldi.

## Sistema di Cashback

Il sistema di cashback è un meccanismo di incentivazione per i clienti che effettuano acquisti sulla piattaforma. Il cashback viene calcolato come una percentuale della commissione trattenuta da Quofind su ogni vendita.

### Componenti del Sistema

1. **Tabella di Configurazione** (`cashbackConfig`)
   - Gestisce le percentuali di commissione e cashback
   - Configurabile per adattarsi alle strategie di business

2. **Gestione del Saldo** (`PaybackBalances`)
   - Traccia i saldi di cashback degli utenti
   - Gestisce cashback in attesa di accreditamento

3. **Registro Transazioni** (`Transactions`)
   - Registra tutte le operazioni di cashback
   - Traccia lo stato delle transazioni

### Funzionalità Chiave

1. **Distribuzione della Commissione**
   - Buyer Cashback: 66% della commissione
   - Group Leader Cashback: 5% della commissione (solo per gruppi)
   - Referrer Cashback: 2% della commissione
   - Rimanente per Quofind

2. **Processo di Accreditamento**
   - Verifica del ricevimento dei fondi
   - Calcolo della commissione
   - Distribuzione del cashback
   - Periodo di attesa di 30 giorni

3. **Sistema di Segnalazione**
   - Incentivazione per la segnalazione di nuovi venditori
   - Cashback per le vendite dei venditori segnalati