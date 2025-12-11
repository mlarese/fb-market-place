# Guida alla Configurazione di API Gateway per Webhook Facebook

## Indice
1. [Introduzione](#introduzione)
2. [Creazione dell'API Gateway](#creazione-dellapi-gateway)
3. [Configurazione dei Metodi](#configurazione-dei-metodi)
4. [Integrazione con Lambda](#integrazione-con-lambda)
5. [Configurazione del Dominio Personalizzato](#configurazione-del-dominio-personalizzato)
6. [Sicurezza](#sicurezza)
7. [Logging e Monitoraggio](#logging-e-monitoraggio)
8. [Deployment](#deployment)
9. [Test](#test)
10. [Risoluzione dei Problemi](#risoluzione-dei-problemi)

## Introduzione
Questa guida spiega come configurare un API Gateway su AWS per gestire i webhook di Facebook utilizzando AWS Lambda. Questa architettura serverless offre scalabilità e affidabilità senza la necessità di gestire server.

## Prerequisiti

- Un account AWS con i permessi necessari
- Una Lambda Function configurata (vedi guida WEBHOOKS.md)
- Un dominio personalizzato (opzionale ma consigliato)
- Un certificato SSL per il dominio (se si usa dominio personalizzato)

## Creazione dell'API Gateway

1. Accedi alla **Console AWS** e apri il servizio **API Gateway**
2. Clicca su **Crea API**
3. Seleziona **HTTP API** o **REST API** (per questa guida useremo REST API)
4. Scegli **REST** > **Nuova API**
5. Inserisci:
   - Nome API: `FacebookWebhookAPI`
   - Tipo di endpoint: Regionale
6. Clicca su **Crea API**

## Configurazione dei Metodi

### 1. Crea una Risorsa

1. Nel pannello di sinistra, seleziona **Risorse**
2. Clicca su **Crea Risorsa**
3. Inserisci:
   - Nome risorsa: `webhook`
   - Percorso risorsa: `/webhook`
4. Clicca su **Crea Risorsa**

### 2. Configura il Metodo GET

1. Seleziona la risorsa `/webhook`
2. Clicca su **Crea Metodo**
3. Seleziona **GET** dal menu a discesa
4. Clicca sul segno di spunta per confermare
5. Configura l'integrazione:
   - Tipo di integrazione: **Funzione Lambda**
   - Funzione Lambda: seleziona la tua funzione
   - Usa un proxy Lambda: **No**
6. Clicca su **Salva**

### 3. Configura il Metodo POST

1. Ripeti i passaggi precedenti ma seleziona **POST** come metodo
2. Collega la stessa funzione Lambda

## Integrazione con Lambda

### 1. Configurazione del Mapping Template

Per il metodo POST, è necessario configurare un mapping template per passare correttamente il corpo della richiesta:

1. Seleziona il metodo **POST**
2. Vai alla sezione **Integration Request**
3. Espandi **Mapping Templates**
4. Aggiungi un mapping template per `application/json`
5. Inserisci il seguente template:

```json
{
  "body" : $input.json('$'),
  "httpMethod": "$context.httpMethod",
  "headers": {
    #foreach($header in $input.params().header.keySet())
    "$header": "$util.escapeJavaScript($input.params().header.get($header))" #if($foreach.hasNext),#end
    
    #end  
  },
  "queryStringParameters": {
    #foreach($param in $input.params().querystring.keySet())
    "$param": "$util.escapeJavaScript($input.params().querystring.get($param))" #if($foreach.hasNext),#end
    
    #end
  },
  "pathParameters": {
    "proxy": "$input.params('proxy')"
  },
  "requestContext": {
    "resourcePath": "$context.resourcePath",
    "httpMethod": "$context.httpMethod",
    "requestId": "$context.requestId"
  }
}
```

### 2. Configurazione delle Risposte

1. Vai a **Method Response** per il metodo POST
2. Configura i codici di risposta:
   - 200: Successo
   - 401: Non autorizzato
   - 403: Accesso negato
   - 500: Errore interno

## Configurazione del Dominio Personalizzato

### 1. Richiedi un Certificato SSL

1. Vai su **AWS Certificate Manager**
2. Clicca su **Richiedi un certificato**
3. Aggiungi il tuo dominio (es. `api.tuodominio.com`)
4. Segui il processo di verifica

### 2. Configura un Nome di Dominio Personalizzato

1. Vai su **API Gateway** > **Nomi di dominio personalizzati**
2. Clicca su **Crea**
3. Inserisci il tuo dominio personalizzato
4. Seleziona il certificato SSL richiesto in precedenza
5. Clicca su **Salva**

### 3. Configura il Record DNS

1. Crea un record CNAME nel tuo DNS che punti all'URL di destinazione fornito da API Gateway
2. Attendi la propagazione del DNS (potrebbero volerci fino a 48 ore)

## Sicurezza

### 1. Abilita l'Autorizzazione

1. Vai a **Autorizzazioni** > **Autorizzazioni Lambda**
2. Assicurati che l'utente IAM di API Gateway abbia i permessi per richiamare la tua Lambda

### 2. Configura una Web ACL con AWS WAF

1. Vai su **WAF & Shield**
2. Crea una nuova Web ACL
3. Aggiungi regole per proteggerti da attacchi comuni
4. Associa la Web ACL alla tua API

## Logging e Monitoraggio

### 1. Abilita i Log di Accesso

1. Vai alla tua API in API Gateway
2. Seleziona **Impostazioni**
3. Abilita **Log di accesso CloudWatch**
4. Seleziona il livello di log desiderato

### 2. Configura Metriche e Allarmi

1. Vai su **CloudWatch** > **Metriche**
2. Seleziona **API Gateway**
3. Crea un dashboard per monitorare:
   - Conteggio richieste
   - Errori 4XX/5XX
   - Latenza

## Deployment

### 1. Crea uno Stage

1. Vai alla tua API
2. Seleziona **Azioni** > **Deploy API**
3. Seleziona **Nuovo stage**
4. Inserisci un nome (es. `prod` o `staging`)
5. Clicca su **Deploy**

### 2. Configura il Deployment Automatico (Opzionale)

Puoi automatizzare il deployment con AWS CodePipeline o Serverless Framework.

## Test

### 1. Test della Verifica

```bash
curl -X GET "https://tu-api-id.execute-api.regione.amazonaws.com/stage/webhook?hub.verify_token=TOKEN&hub.challenge=CHALLENGE&hub.mode=subscribe"
```

### 2. Test degli Eventi

```bash
curl -X POST \
  https://tu-api-id.execute-api.regione.amazonaws.com/stage/webhook \
  -H 'Content-Type: application/json' \
  -d '{"object": "page", "entry": [{"id": "PAGE_ID", "time": 1587933090623, "messaging": [{"sender": {"id": "USER_ID"}, "recipient": {"id": "PAGE_ID"}, "message": {"text": "Test message"}}]}]}'
```

## Risoluzione dei Problemi

### 1. Errori Comuni

- **403 Forbidden**: Verifica i permessi IAM tra API Gateway e Lambda
- **502 Bad Gateway**: Controlla i log di CloudWatch per la Lambda
- **Timeout**: Aumenta il timeout della Lambda se necessario

### 2. Strumenti di Debug

- **CloudWatch Logs**: Controlla i log della Lambda e di API Gateway
- **X-Ray**: Abilita X-Ray per il tracciamento delle richieste
- **Test in Locale**: Usa AWS SAM per testare localmente

### 3. Controlli di Sicurezza

- Verifica che il token di verifica corrisponda
- Controlla che la firma della richiesta sia valida
- Limita l'accesso all'API tramite politiche IAM

---
*Ultimo aggiornamento: 16 Maggio 2025*
