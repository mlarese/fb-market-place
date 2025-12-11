# N8N Workflow Documentation

## Introduzione

Questo documento fornisce una panoramica dettagliata di come n8n è utilizzato nel progetto Quofind Marketplace per orchestrare i flussi di lavoro e gestire le interazioni tra i vari componenti del sistema. n8n è un potente workflow engine open-source che consente di automatizzare processi complessi attraverso flussi visuali, facilitando la creazione e la gestione di workflow che coinvolgono più servizi e API. La sua interfaccia intuitiva permette anche a utenti non tecnici di configurare e gestire flussi di lavoro in modo efficace.

## Flussi Principali

### Flusso di Annuncio di Vendita

1. **Ricezione di un post da parte del venditore**: n8n intercetta il post pubblicato dal venditore su Facebook utilizzando webhook. Questo avvia il processo di analisi e gestione dell'annuncio. L'intercettazione avviene in tempo reale, garantendo che ogni nuovo annuncio venga elaborato immediatamente.

2. **Invio testo al sistema di intelligenza artificiale**: il testo del post viene inviato al sistema di intelligenza artificiale (AI) per l'analisi. Questa fase è fondamentale per estrarre informazioni chiave che saranno utilizzate per la creazione dell'annuncio. L'AI utilizza modelli di elaborazione del linguaggio naturale per comprendere il contenuto e il contesto del messaggio.

3. **Estrazione dati**: il sistema di intelligenza artificiale analizza il testo e estrae informazioni rilevanti come tipo di annuncio, categoria, prezzo e località. Questi dati vengono strutturati in un formato JSON, che facilita ulteriori elaborazioni e interazioni con il database.

4. **Salvataggio con Lambda "createListing"**: i dati estratti vengono salvati nel database DynamoDB tramite la funzione Lambda chiamata "createListing". Questa funzione è responsabile della creazione di un nuovo record nel database, assicurando che tutte le informazioni siano correttamente archiviate e pronte per essere consultate.

5. **Pubblicazione post via Graph API**: una volta che l'annuncio è stato creato e salvato, n8n utilizza la Facebook Graph API per pubblicare l'annuncio sulla piattaforma. Questo passaggio rende l'annuncio visibile agli altri utenti di Facebook, aumentando la possibilità di vendita.

6. **Conferma via Messenger**: il venditore riceve una conferma dell'avvenuta pubblicazione dell'annuncio tramite Messenger. Questa notifica serve a garantire che il venditore sia informato sullo stato del proprio annuncio e possa monitorare eventuali interazioni.

**Esempio**: Se un venditore scrive "Vendo aspirapolvere Dyson, zona Milano, 180 euro", il sistema estrarrà e strutturerà queste informazioni in JSON come segue: { tipo: "annuncio", categoria: "elettrodomestici", prezzo: 180, localita: "Milano" }.

### Flusso di Richiesta di Acquisto

1. **Ricezione di un messaggio da parte dell’acquirente**: n8n riceve un messaggio da un potenziale acquirente che esprime interesse per un prodotto. Questo messaggio può contenere dettagli specifici riguardo alla richiesta dell'acquirente, come il tipo di prodotto e le condizioni desiderate.

2. **Invio testo al sistema di intelligenza artificiale**: il testo del messaggio viene inviato al sistema di intelligenza artificiale per l'analisi. L'AI è in grado di identificare le informazioni chiave necessarie per elaborare la richiesta, come il tipo di prodotto e le preferenze di prezzo.

3. **Estrazione dati**: l'AI estrae informazioni come tipo di richiesta, parole chiave e località. Questi dati sono essenziali per cercare annunci che corrispondano alle esigenze dell'acquirente, migliorando l'efficacia del matching.

4. **Salvataggio richiesta**: la richiesta viene salvata nel sistema, creando un record che può essere utilizzato per future elaborazioni e ricerche. Questo passaggio assicura che tutte le richieste siano tracciabili e gestibili.

5. **Ricerca compatibilità**: n8n cerca annunci compatibili utilizzando la funzione "searchListings". Questa funzione interroga il database per trovare annunci che soddisfano i criteri specificati dall'acquirente, aumentando la probabilità di trovare un prodotto desiderato.

6. **Invio risultati o salvataggio richiesta**: i risultati della ricerca vengono inviati all'acquirente, oppure la richiesta viene salvata per future ricerche se non ci sono corrispondenze immediate. Questo permette all'acquirente di essere informato sulle opzioni disponibili.

**Esempio**: Un acquirente che scrive "Cerco bicicletta da città a Bologna sotto i 150 euro" avvia il processo di ricerca e analisi per trovare annunci pertinenti.

### Flusso di Cashback

Il flusso di cashback gestisce la distribuzione del cashback dopo la conferma di un pagamento. Il flusso include:

1. **Verifica del Pagamento**
   - Verifica del ricevimento dei fondi
   - Conferma del completamento della transazione

2. **Calcolo della Commissione**
   - Recupero delle configurazioni dalla tabella `cashbackConfig`
   - Calcolo delle percentuali per ogni partecipante
   - Generazione dei crediti di cashback

3. **Aggiornamento dei Saldi**
   - Aggiornamento della tabella `PaybackBalances`
   - Registrazione delle transazioni in `Transactions`
   - Notifica degli utenti

4. **Gestione dei Gruppi**
   - Identificazione del capo gruppo
   - Calcolo del cashback per il capo gruppo
   - Aggiornamento del saldo del capo gruppo

5. **Sistema di Segnalazione**
   - Identificazione dei segnalatori
   - Calcolo del cashback per i segnalatori
   - Aggiornamento dei loro saldi

### Nodi Principali

1. **Get Payment Confirmation**
   - Verifica del stato del pagamento
   - Recupero dei dettagli della transazione

2. **Get Cashback Configuration**
   - Recupero delle configurazioni da DynamoDB
   - Calcolo delle percentuali

3. **Calculate Cashback**
   - Calcolo del cashback per ogni partecipante
   - Generazione dei crediti

4. **Update Balances**
   - Aggiornamento dei saldi degli utenti
   - Registrazione delle transazioni

5. **Send Notifications**
   - Notifica agli utenti del credito
   - Aggiornamento del dashboard

### Matching Periodico

1. **Recupero richieste attive**: n8n esegue una scansione delle richieste per identificare quali siano ancora valide e necessitino di attenzione. Questo processo avviene ogni cinque minuti per garantire che le richieste siano sempre aggiornate.

2. **Ricerca annunci compatibili**: vengono cercati annunci che corrispondono alle richieste attive, utilizzando criteri di corrispondenza basati sulle informazioni estratte. Questo aiuta a mantenere il sistema reattivo e utile per gli utenti.

3. **Notifica acquirente e venditori selezionati**: gli utenti vengono informati delle corrispondenze trovate, consentendo loro di interagire e completare le transazioni. Le notifiche possono avvenire tramite Messenger o tramite notifiche push, a seconda delle preferenze dell'utente.

### Notifica Venditori

1. **Selezione con "getMatchingSellers"**: vengono selezionati i venditori compatibili con le richieste attive, basandosi su criteri di corrispondenza. Questo passaggio è essenziale per garantire che i venditori giusti siano informati delle opportunità.

2. **Invio messaggio anonimo via Messenger**: i venditori ricevono notifiche sulle richieste pertinenti, mantenendo l'anonimato dell'acquirente fino a quando non si avvia una conversazione. Questo approccio protegge la privacy degli utenti.

3. **Se risposta positiva, creazione assistita dell'annuncio**: se il venditore risponde positivamente, n8n assiste nella creazione dell'annuncio tramite un sistema di intelligenza artificiale, facilitando il processo di pubblicazione e riducendo il carico di lavoro per il venditore.

### Gestione Cashback

1. **Proposta utilizzo cashback**: il sistema propone l'uso del cashback disponibile all'acquirente, incentivando l'uso della piattaforma e migliorando l'esperienza utente.

2. **Conferma acquisto da Facebook**: il pagamento viene confermato tramite Facebook, garantendo che tutte le transazioni siano sicure e verificate. Questo passaggio è fondamentale per mantenere la fiducia degli utenti.

3. **Calcolo e aggiornamento saldo**: il saldo cashback dell'utente viene aggiornato in base all'acquisto effettuato, assicurando che i benefici siano sempre correttamente applicati.

4. **Salvataggio transazione**: la transazione viene registrata nel sistema per garantire la tracciabilità e la gestione delle finanze. Questo passaggio è importante per la reportistica e l'analisi delle performance.

5. **Notifiche a utente e venditore**: entrambi gli utenti ricevono notifiche sui dettagli della transazione, mantenendo tutti informati e coinvolti nel processo.

6. **Ripristino saldo con "rollbackPayback"**: se necessario, il saldo cashback viene ripristinato in caso di rimborso, garantendo che il sistema rimanga equo e trasparente.

### Scadenza Richieste

1. **Routine giornaliera**: n8n esegue controlli giornalieri sulle richieste per garantire che il sistema sia sempre aggiornato e privo di richieste obsolete.

2. **Recupero richieste scadute**: le richieste scadute vengono identificate e gestite, assicurando che non ci siano richieste obsolete nel sistema.

3. **Aggiornamento stato su DynamoDB**: lo stato delle richieste viene aggiornato nel database, mantenendo la coerenza dei dati e facilitando la gestione delle informazioni.

4. **Notifica utente con proposta di rinnovo/modifica**: gli utenti vengono informati delle richieste scadute e possono scegliere di rinnovare o modificare le loro richieste, migliorando l'interazione con il sistema.

## Funzioni Lambda disponibili

- **createListing**: gestisce il salvataggio degli annunci nel database, assicurando che tutte le informazioni siano correttamente archiviate e disponibili per le ricerche.
- **createRequest**: gestisce il salvataggio delle richieste di acquisto, permettendo una facile tracciabilità delle richieste degli utenti.
- **searchListings**: esegue ricerche di annunci in base a criteri specifici, facilitando la corrispondenza tra acquirenti e venditori.
- **updatePayback**: aggiorna il saldo cashback degli utenti, garantendo che i benefici siano sempre correttamente applicati.
- **getPaybackBalance**: legge il saldo cashback attuale, permettendo agli utenti di monitorare i loro benefici.
- **rollbackPayback**: ripristina il saldo cashback in caso di rimborso, mantenendo l'equità del sistema.
- **getActiveRequests**: recupera le richieste attive nel sistema, assicurando che gli utenti possano sempre trovare opportunità valide.
- **getExpiredRequests**: recupera le richieste scadute, gestendo il ciclo di vita delle richieste nel sistema.
- **getExpiredListings**: recupera gli annunci scaduti, mantenendo il database pulito e aggiornato.
- **getMatchingSellers**: identifica i venditori compatibili con le richieste attive, facilitando le transazioni tra utenti.

**Nota bene**: le richieste possono essere in qualunque lingua. Trova una soluzione, perché i prompt possono essere in qualunque lingua.
