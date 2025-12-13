# Sistema di Cashback

## Panoramica
Il sistema di cashback è un meccanismo di incentivazione per i clienti che effettuano acquisti sulla piattaforma. Il cashback viene calcolato come una percentuale della commissione trattenuta da Quofind su ogni vendita.

## Struttura della Commissione

### Composizione della Commissione
Per ogni vendita, viene applicata una commissione che viene divisa tra diversi partecipanti:

1. **Commissione Base Quofind**
   - Percentuale fissa configurabile nella tabella `cashbackConfig`
   - Trattenuta come guadagno per la piattaforma

2. **Cashback per l'Acquirente**
   - Default: 66% della commissione
   - Accreditato al compratore dopo la conferma del pagamento

3. **Cashback per il Capo Gruppo** (solo per vendite di gruppo)
   - Piccola percentuale della commissione
   - Accreditato al capo gruppo dopo la conferma del pagamento

4. **Cashback per i Segnalatori**
   - Partecipanti che hanno segnalato il venditore a Quofind
   - Ricevono una percentuale della commissione per ogni vendita del venditore segnalato

## Gestione della Tabella di Configurazione
La tabella `cashbackConfig` in DynamoDB contiene le seguenti configurazioni:

- `quofindCommission`: Percentuale della commissione per Quofind
- `buyerCashback`: Percentuale di cashback per l'acquirente (default 66%)
- `groupLeaderCashback`: Percentuale di cashback per il capo gruppo (default 5%)
- `referrerCashback`: Percentuale di cashback per i segnalatori (default 2%)

### Esempio di Calcolo
Supponiamo una vendita di €100 con la seguente configurazione:
- Commissione Quofind: 10% (€10)
- Cashback Buyer: 66% della commissione (€6.60)
- Cashback Group Leader: 5% della commissione (€0.50)
- Cashback Referrer: 2% della commissione (€0.20)

Distribuzione:
- Quofind: €10 (10% del prezzo)
  - Buyer cashback: €6.60 (66% della commissione)
  - Group Leader cashback: €0.50 (5% della commissione)
  - Referrer cashback: €0.20 (2% della commissione)

## Processo di Accreditamento

### Vendite Normali
1. Il pagamento viene confermato
2. Il sistema verifica il ricevimento dei fondi
3. Il sistema calcola la commissione
4. Il cashback per l'acquirente viene accreditato nel saldo
5. Il credito diventa disponibile dopo 30 giorni

### Vendite di Gruppo
1. Il pagamento viene confermato
2. Il sistema verifica il ricevimento dei fondi
3. Il sistema calcola la commissione
4. Il cashback per l'acquirente e il capo gruppo viene accreditato
5. I crediti diventano disponibili dopo 30 giorni

## Sistema di Segnalazione

### Funzionamento
- Gli utenti possono segnalare nuovi venditori a Quofind
- Per ogni vendita effettuata dal venditore segnalato:
  - Il segnalatore riceve una percentuale della commissione
  - La percentuale è configurabile nella tabella `cashbackConfig`
- Il cashback del segnalatore viene accreditato dopo la conferma del pagamento

### Benefici
- Incentivazione per la crescita della piattaforma
- Riconoscimento per l'attività di reclutamento
- Distribuzione equa della commissione tra i partecipanti

## Utilizzo del Cashback

### Regole Generali
- Il cashback può essere utilizzato per qualsiasi acquisto sulla piattaforma
- Non è possibile convertire il cashback in denaro contante

## Monitoraggio e Reporting

### Dashboard Cashback
- Visualizzazione del saldo disponibile
- Cronologia delle transazioni di cashback
- Stato dei cashback in attesa di accreditamento
- Statistiche di utilizzo
- Dettagli sulle vendite segnalate

### Report per Venditori
- Analisi del rendimento del cashback
- Confronto tra cashback generato da vendite normali e gruppo
- Metriche di conversione legate al cashback
- Statistiche sulle vendite segnalate

### Report per Venditori via Messenger

### Architettura del Sistema

1. **Analisi del Testo**
   - AI che analizza la richiesta dell'utente
   - Identifica l'intento principale della domanda
   - Estrae le informazioni rilevanti

2. **Traduzione in Query**
   - Conversione dell'intento in query SQL
   - Gestione delle condizioni di ricerca
   - Ottimizzazione delle query

3. **Risposta AI**
   - Formattazione dei risultati
   - Risposta naturale all'utente
   - Gestione degli errori

### Esempi di Domande

1. **Verifica Saldo**
   - "Quanto è il mio saldo di cashback?"
   - "Quanto cashback ho disponibile?"
   - "Quanto ho in attesa di accreditamento?"

2. **Storico Transazioni**
   - "Mostrami le mie ultime transazioni"
   - "Quali sono le mie transazioni recenti?"
   - "Quali sono le mie ultime operazioni?"

3. **Statistiche**
   - "Come stanno andando le mie vendite?"
   - "Quali sono le mie statistiche?"
   - "Quanto cashback ho generato?"

4. **Informazioni Gruppi**
   - "Quali gruppi faccio parte?"
   - "Quanto ho guadagnato dai gruppi?"
   - "Quali sono i miei gruppi più attivi?"

5. **Informazioni Segnalazioni**
   - "Quali venditori ho segnalato?"
   - "Quanto ho guadagnato dalle segnalazioni?"
   - "Quali sono le mie segnalazioni più recenti?"

### Esempio di Interazione

```
Utente: "Quanto è il mio saldo di cashback?"
Bot: Il tuo saldo attuale di cashback è di €50.00
       Hai €20.00 in attesa di accreditamento

Utente: "Quali sono le mie vendite recenti?"
Bot: Ecco le tue ultime vendite:
     1. €30.00 - 20/04/2025
     2. €20.00 - 18/04/2025
     3. €15.00 - 15/04/2025

Utente: "Come stanno andando le mie vendite?"
Bot: Statistiche del mese:
     - Totale vendite: 10
     - Cashback generato: €150.00
     - Cashback da gruppi: €30.00
     - Cashback da segnalazioni: €10.00
```

### Vantaggi
- Accessibile da Messenger
- Interfaccia semplice e intuitiva
- Aggiornamenti in tempo reale
- Nessun comando da imparare
- Esperienza utente migliorata

## Report per Iscritti via Messenger

### Architettura del Sistema

1. **Analisi del Testo**
   - AI che analizza la richiesta dell'utente
   - Identifica l'intento principale della domanda
   - Estrae le informazioni rilevanti

2. **Traduzione in Query**
   - Conversione dell'intento in query SQL
   - Gestione delle condizioni di ricerca
   - Ottimizzazione delle query

3. **Risposta AI**
   - Formattazione dei risultati
   - Risposta naturale all'utente
   - Gestione degli errori

### Esempi di Report

```
Utente: "Quanto cashback ho ricevuto?"
AI: Analisi della richiesta:
     - Intento: Query cashback
     - Entità: Totale cashback

Bot: Hai ricevuto:
     - Totale: €500.00
     - Da gruppi: €100.00
     - Da segnalazioni: €50.00
     - Media per vendita: €25.00

Utente: "Quali sono le mie vendite recenti?"
AI: Analisi della richiesta:
     - Intento: Query vendite
     - Entità: Vendite recenti

Bot: Ecco le tue ultime vendite:
     1. €50.00 - 20/04/2025 (Gruppo A)
     2. €30.00 - 18/04/2025 (Segnalazione)
     3. €20.00 - 15/04/2025 (Gruppo B)

Utente: "Quali gruppi faccio parte e quanto ho guadagnato?"
AI: Analisi della richiesta:
     - Intento: Query gruppi
     - Entità: Gruppi, guadagno

Bot: Sei membro di:
     - Gruppo A: €100.00 di cashback
     - Gruppo B: €80.00 di cashback
     - Gruppo C: €70.00 di cashback

Utente: "Quali venditori ho segnalato e quanto ho guadagnato?"
AI: Analisi della richiesta:
     - Intento: Query segnalazioni
     - Entità: Venditori, guadagno

Bot: Hai segnalato:
     - Venditore 1: €10.00 di cashback
     - Venditore 2: €15.00 di cashback
     - Venditore 3: €5.00 di cashback
```

## Dashboard per Venditori via Messenger

### Architettura del Sistema

1. **Analisi del Testo**
   - AI che analizza la richiesta dell'utente
   - Identifica l'intento principale della domanda
   - Estrae le informazioni rilevanti

2. **Traduzione in Query**
   - Conversione dell'intento in query SQL
   - Gestione delle condizioni di ricerca
   - Ottimizzazione delle query

3. **Risposta AI**
   - Formattazione dei risultati
   - Risposta naturale all'utente
   - Gestione degli errori

### Esempi di Interazione

```
Utente: "Quanto è il mio saldo di cashback?"
AI: Analisi della richiesta:
     - Intento: Verifica saldo
     - Entità: Saldo attuale

Bot: Il tuo saldo attuale di cashback è di €50.00
       Hai €20.00 in attesa di accreditamento

Utente: "Mostrami le mie ultime transazioni"
AI: Analisi della richiesta:
     - Intento: Visualizza storico
     - Entità: Transazioni recenti

Bot: Ecco le tue ultime transazioni:
     1. €30.00 - 20/04/2025
     2. €20.00 - 18/04/2025
     3. €15.00 - 15/04/2025

Utente: "Quanti gruppi ho e quanto ho guadagnato?"
AI: Analisi della richiesta:
     - Intento: Informazioni gruppi
     - Entità: Numero gruppi, guadagno

Bot: Sei membro di 3 gruppi:
     - Gruppo A: €50.00 di cashback
     - Gruppo B: €30.00 di cashback
     - Gruppo C: €20.00 di cashback

Utente: "Quali venditori ho segnalato e quanto ho guadagnato?"
AI: Analisi della richiesta:
     - Intento: Query segnalazioni
     - Entità: Venditori, guadagno

Bot: Hai segnalato:
     - Venditore 1: €10.00 di cashback
     - Venditore 2: €15.00 di cashback
     - Venditore 3: €5.00 di cashback
```

### Vantaggi
- Interazione naturale senza comandi
- Risposte immediate e intuitive
- Nessuna formazione necessaria
- Accessibile a tutti gli utenti
- Esperienza utente migliorata

## Implementazione Tecnica

### Architettura del Sistema

1. **Facebook Messenger Integration**
   - Webhook per ricevere messaggi
   - Gestione degli eventi di Messenger
   - Risposte in tempo reale

2. **AI Processing Layer**
   - Analisi del testo con OpenAI
   - Identificazione dell'intento
   - Estrazione delle entità
   - Gestione delle domande non autorizzate

3. **Lambda Functions**
   - `messageHandler`: Gestisce i messaggi in entrata
   - `intentAnalyzer`: Analizza il testo e identifica l'intento
   - `queryBuilder`: Crea le query SQL basate sull'intento
   - `dataFetcher`: Recupera i dati dal database
   - `responseFormatter`: Formatta la risposta per l'utente

### Struttura del Codice

La struttura del codice è organizzata come segue:

```
lambda/
├── messageHandler.js        # Gestione dei messaggi in entrata
├── intentAnalyzer.js        # Analisi del testo e identificazione dell'intento
├── queryBuilder.js          # Costruzione delle query SQL
├── dataFetcher.js          # Recupero dei dati dal database
├── responseFormatter.js    # Formattazione delle risposte
├── utils.js                # Funzioni di utilità e messaggi
├── config.js              # Configurazioni e costanti
├── queries/              # Query specifiche per ogni tipo di richiesta
│   ├── balance.js        # Query per il saldo
│   ├── transactions.js   # Query per le transazioni
│   ├── groups.js         # Query per i gruppi
│   └── referrals.js      # Query per le segnalazioni
└── formatters/           # Formattatori per le risposte
    ├── balance.js        # Formattatore per il saldo
    ├── transactions.js   # Formattatore per le transazioni
    ├── groups.js         # Formattatore per i gruppi
    └── referrals.js      # Formattatore per le segnalazioni
```

### Lambda Functions - Codice Sorgente

1. **messageHandler.js**
   - Gestisce i messaggi in entrata da Messenger
   - Coordinatore del flusso di lavoro
   - Gestisce errori e risposte

2. **intentAnalyzer.js**
   - Analizza il testo con OpenAI
   - Identifica l'intento dell'utente
   - Estrae le entità rilevanti

3. **queryBuilder.js**
   - Costruisce query SQL basate sull'intento
   - Supporta diversi tipi di richieste
   - Gestisce la sicurezza delle query

4. **dataFetcher.js**
   - Interagisce con DynamoDB
   - Recupera i dati necessari
   - Gestisce errori di database

5. **responseFormatter.js**
   - Formatta le risposte per l'utente
   - Supporta diversi formati di risposta
   - Gestisce i casi di errore

6. **utils.js**
   - Funzioni di utilità comuni
   - Gestione dei messaggi
   - Validazione dei dati

7. **config.js**
   - Configurazioni di sistema
   - Costanti
   - Variabili di ambiente

### Scenari Make

1. **Scenario di Accreditamento Cashback**
   - Trigger: Nuova vendita confermata (Webhook)
   - Step 1: Verifica ricevimento fondi (HTTP → Lambda)
   - Step 2: Calcola commissioni (HTTP → Lambda)
   - Step 3: Accredita cashback (HTTP → Lambda)
   - Step 4: Notifica utente (Facebook Messenger)

2. **Scenario di Segnalazione Venditori**
   - Trigger: Nuova segnalazione (Webhook)
   - Step 1: Verifica validità (HTTP → Lambda)
   - Step 2: Registra venditore (HTTP → Lambda)
   - Step 3: Accredita cashback segnalatore (HTTP → Lambda)
   - Step 4: Notifica segnalatore (Facebook Messenger)

3. **Scenario di Gestione Domande**
   - Trigger: Messaggio Messenger (Webhook)
   - Step 1: Analisi intento (OpenAI)
   - Step 2: Verifica autorizzazione (Router + Filter)
   - Step 3: Recupero dati (HTTP → Lambda)
   - Step 4: Formattazione risposta (Tools)
   - Step 5: Invio risposta (Facebook Messenger)

### Esempio di Flusso

```
1. Utente invia messaggio: "Quanto è il mio saldo di cashback?"
2. messageHandler riceve il messaggio
3. intentAnalyzer analizza il testo
4. queryBuilder costruisce la query
5. dataFetcher recupera i dati
6. responseFormatter formatta la risposta
7. messageHandler invia la risposta all'utente
```

### Considerazioni di Sicurezza

1. **Autenticazione**
   - Verifica dell'identità dell'utente
   - Gestione dei permessi
   - Protezione dei dati sensibili

2. **Rate Limiting**
   - Limite sul numero di richieste
   - Gestione dei picchi di carico
   - Prevenzione degli abusi

3. **Caching**
   - Cache delle risposte comuni
   - Ottimizzazione delle performance
   - Riduzione del carico sul database

### Monitoraggio e Logging

1. **Metriche Chiave**
   - Tempo di risposta
   - Numero di richieste
   - Errori
   - Utilizzo delle risorse

2. **Logging**
   - Log delle interazioni
   - Tracciamento degli errori
   - Monitoraggio delle performance

3. **Alert**
   - Notifiche per errori critici
   - Avviso per picchi di carico
   - Monitoraggio della disponibilità

## Gestione delle Domande Non Autorizzate

Quando un utente chiede informazioni che non gli competono o non può accedere, il bot risponde con messaggi cordiali e professionali:

```
Utente: "Quante vendite ha fatto il mio concorrente?"
Bot: Mi dispiace, ma non posso condividere informazioni dettagliate sui tuoi concorrenti. Queste informazioni sono riservate ai singoli venditori.

Utente: "Quali sono i dati personali del venditore X?"
Bot: Per motivi di privacy, non posso condividere dati personali di altri utenti. Se hai bisogno di contattare un venditore, usa il sistema di messaggistica della piattaforma.

Utente: "Quali sono le commissioni degli altri venditori?"
Bot: Le commissioni e i guadagni sono informazioni riservate. Puoi vedere le tue statistiche personali usando le domande appropriate.

Utente: "Quali sono i dati di pagamento di un altro utente?"
Bot: Per motivi di sicurezza, non posso condividere informazioni di pagamento. Se hai bisogno di assistenza, contatta il supporto clienti.
```

### Principi di Gestione

1. **Risposta Cordiale**
   - Il bot mantiene un tono professionale e amichevole
   - Spiega il motivo del diniego
   - Suggerisce alternative quando possibile

2. **Rispetto della Privacy**
   - Protezione dei dati personali
   - Riservatezza delle informazioni finanziarie
   - Rispetto delle politiche di privacy

3. **Sicurezza**
   - Protezione delle informazioni sensibili
   - Prevenzione degli abusi
   - Rispetto dei termini di servizio

4. **Guida all'Utente**
   - Suggerimenti su come ottenere le informazioni necessarie
   - Indirizzamento al supporto clienti quando appropriato
   - Spiegazione delle alternative disponibili

### Esempi di Messaggi

```
1. Per domande su concorrenti:
   "Mi dispiace, ma non posso condividere informazioni dettagliate sui tuoi concorrenti. Queste informazioni sono riservate ai singoli venditori."

2. Per domande su dati personali:
   "Per motivi di privacy, non posso condividere dati personali di altri utenti. Se hai bisogno di contattare un venditore, usa il sistema di messaggistica della piattaforma."

3. Per domande su commissioni:
   "Le commissioni e i guadagni sono informazioni riservate. Puoi vedere le tue statistiche personali usando le domande appropriate."

4. Per domande su dati di pagamento:
   "Per motivi di sicurezza, non posso condividere informazioni di pagamento. Se hai bisogno di assistenza, contatta il supporto clienti."
```

## Note Importanti
- Le percentuali di cashback sono configurabili nella tabella `cashbackConfig`
- Il sistema di cashback può essere modificato per adattarsi alle strategie di business
- Le configurazioni possono essere aggiornate senza interrompere il servizio
- Il cashback è soggetto a revisione periodica basata sulle prestazioni della piattaforma
