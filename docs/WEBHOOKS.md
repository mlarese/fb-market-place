# Guida ai Webhook di Facebook

## Indice
1. [Introduzione](#introduzione)
2. [Configurazione Iniziale](#configurazione-iniziale)
3. [Flusso di Verifica](#flusso-di-verifica)
4. [Tipi di Eventi](#tipi-di-eventi)
5. [Gestione della Sicurezza](#gestione-della-sicurezza)
6. [Implementazione del Webhook](#implementazione-del-webhook)
7. [Debug e Logging](#debug-e-logging)
8. [Best Practice](#best-practice)
9. [Risoluzione dei Problemi](#risoluzione-dei-problemi)

## Introduzione
I webhook di Facebook permettono alla tua applicazione di ricevere notifiche in tempo reale quando si verificano determinati eventi su Facebook, come nuovi messaggi, commenti o reazioni. Questo documento spiega come configurare e gestire correttamente i webhook per l'integrazione con Facebook.

## Configurazione Iniziale

### Prerequisiti
- Un'app Facebook registrata su [Facebook for Developers](https://developers.facebook.com/)
- Un endpoint HTTPS pubblico per ricevere le notifiche
- Server in grado di gestire richieste POST e GET

### Passi per la Configurazione
1. Vai su [Facebook for Developers](https://developers.facebook.com/)
2. Seleziona la tua app o creane una nuova
3. Nel menu di navigazione, seleziona "Webhook"
4. Clicca su "Setup Webhooks"
5. Inserisci i seguenti dettagli:
   - **URL del callback**: `https://tu-dominio.com/webhook/facebook`
   - **Token di verifica**: Scegli una stringa segreta (es. `il_tuo_token_segreto`)
   - **Campi in abbonamento**: Seleziona gli eventi che vuoi ricevere

## Flusso di Verifica

### Richiesta di Verifica
Quando configuri il webhook, Facebook invia una richiesta GET al tuo endpoint con i seguenti parametri:
- `hub.mode`: Deve essere "subscribe"
- `hub.verify_token`: Deve corrispondere al token di verifica che hai impostato
- `hub.challenge`: Una stringa casuale che devi restituire per verificare la proprietà dell'endpoint

### Implementazione del Verificatore
Ecco un esempio di come gestire la verifica in Node.js:

```javascript
const express = require('express');
const app = express();

// Verifica del webhook
app.get('/webhook/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verifica che il token corrisponda
  if (mode === 'subscribe' && token === 'il_tuo_token_segreto') {
    console.log('Webhook verificato con successo');
    res.status(200).send(challenge);
  } else {
    console.error('Verifica fallita. Token non valido.');
    res.sendStatus(403);
  }
});
```

## Tipi di Eventi

### Messaggi Diretti
- `messages`: Nuovi messaggi nella pagina
- `messaging_postbacks`: Risposte ai pulsanti
- `message_deliveries`: Conferme di consegna
- `message_reads`: Conferme di lettura

### Commenti e Reazioni
- `feed`: Nuovi post nella bacheca
- `comments`: Nuovi commenti
- `reactions`: Nuove reazioni

### Eventi della Pagina
- `messaging_optins`: Iscrizioni al messenger
- `messaging_referrals`: Riferimenti di messaggi
- `messaging_handovers`: Passaggi di conversazione

## Gestione della Sicurezza

### Firma delle Richieste
Facebook invia un'intestazione `X-Hub-Signature` che contiene una firma HMAC-SHA1 del payload della richiesta.

### Validazione della Firma
```javascript
const crypto = require('crypto');

function verifyRequestSignature(req, res, buf) {
  const signature = req.headers['x-hub-signature-256'];
  
  if (!signature) {
    throw new Error('Manca la firma');
  }
  
  const elements = signature.split('=');
  const signatureHash = elements[1];
  const expectedHash = crypto
    .createHmac('sha256', process.env.APP_SECRET)
    .update(buf)
    .digest('hex');

  if (signatureHash !== expectedHash) {
    throw new Error('Firma non valida');
  }
}

// Middleware Express
app.use(express.json({
  verify: verifyRequestSignature
}));
```

## Implementazione del Webhook

### Gestione degli Eventi
```javascript
app.post('/webhook/facebook', (req, res) => {
  // Facebook richiede una risposta 200 OK
  res.status(200).send('EVENT_RECEIVED');

  // Elabora ogni voce (potrebbero esserci più voci in batch)
  req.body.entry.forEach((entry) => {
    // Elabora ogni evento nella voce
    entry.messaging.forEach((event) => {
      if (event.message) {
        handleMessage(event);
      } else if (event.postback) {
        handlePostback(event);
      }
    });
  });
});
```

## Debug e Logging

### Strumenti Utili
1. **Facebook Webhook Tester**: Strumento integrato nel portale sviluppatori
2. **ngrok**: Per esporre il tuo localhost su HTTPS
3. **Logging Esteso**: Registra tutte le richieste in entrata

### Esempio di Logging
```javascript
// Middleware di logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
});
```

## Best Practice

1. **Validazione degli Input**
   - Verifica sempre la firma delle richieste
   - Convalida il formato dei dati ricevuti

2. **Gestione degli Errori**
   - Implementa meccanismi di retry
   - Logga tutti gli errori per il debug

3. **Sicurezza**
   - Usa sempre HTTPS
   - Limita gli IP mittenti a quelli di Facebook
   - Ruota regolarmente i token di verifica

4. **Prestazioni**
   - Rispondi a Facebook entro 20 secondi
   - Implementa una coda per l'elaborazione asincrona

## Risoluzione dei Problemi

### Problemi Comuni
1. **Webhook non verificato**
   - Verifica che l'URL sia accessibile pubblicamente
   - Controlla che il token di verifica sia identico

2. **Errori 403**
   - Verifica i permessi dell'app su Facebook
   - Controlla che l'app sia in modalità pubblica o di test

3. **Mancata ricezione eventi**
   - Verifica di aver sottoscritto gli eventi corretti
   - Controlla i log del server per eventuali errori

### Strumenti di Diagnostica
- **Facebook Webhook Debugger**: Per testare le richieste
- **Log di Sistema**: Per tracciare le richieste in entrata
- **Monitoraggio in Tempo Reale**: Per visualizzare gli eventi in arrivo

### Supporto Facebook
In caso di problemi persistenti, consulta la [documentazione ufficiale](https://developers.facebook.com/docs/messenger-platform/webhook) o apri un ticket di supporto.

---
*Ultimo aggiornamento: 16 Maggio 2025*
