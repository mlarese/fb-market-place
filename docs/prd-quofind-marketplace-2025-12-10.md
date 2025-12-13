# Product Requirements Document: Quofind Marketplace

**Date:** 2025-12-10
**Author:** maurolarese
**Version:** 1.0
**Project Type:** web-app
**Project Level:** 4 (Enterprise)
**Status:** Draft

---

## Document Overview

This Product Requirements Document (PRD) defines the functional and non-functional requirements for Quofind Marketplace. It serves as the source of truth for what will be built and provides traceability from requirements through implementation.

**Related Documents:**
- Technical Manual: `docs/MANUALE_TECNICO.md`
- Groups Documentation: `docs/GRUPPI.md`
- Cashback Documentation: `docs/CASHBACK.md`

---

## Executive Summary

**Quofind Marketplace** e una piattaforma di compravendita privata basata su Facebook che facilita transazioni tra utenti attraverso:

- **Gestione annunci e richieste di acquisto** con analisi AI automatica
- **Sistema di matching automatico** che collega domanda e offerta ogni 5 minuti
- **Gruppi di interesse** con leader che gestiscono community tematiche
- **Sistema di cashback multi-livello** che incentiva acquirenti, capi gruppo e segnalatori
- **Chatbot AI via Messenger** per interazioni self-service
- **Integrazione completa con Facebook** (Graph API, Messenger, Marketplace)

L'architettura si basa su:
- **Make** per orchestrazione workflow
- **AWS Lambda** (Node.js) per la business logic
- **DynamoDB** per persistenza dati
- **Elasticsearch/OpenSearch** per ricerche avanzate
- **OpenAI** per analisi semantica dei contenuti

---

## Product Goals

### Business Objectives

1. **Facilitare transazioni C2C** attraverso Facebook con un'esperienza fluida e integrata
2. **Incentivare l'uso della piattaforma** tramite un sistema di cashback competitivo
3. **Creare community** attraverso gruppi di interesse con leader incentivati
4. **Automatizzare** il matching tra domanda e offerta per accelerare le transazioni
5. **Scalare** grazie all'architettura serverless AWS

### Success Metrics

| Metrica | Target | Misurazione |
|---------|--------|-------------|
| Annunci creati/mese | 1.000+ | DynamoDB count |
| Tasso di matching | >30% | Match/Richieste totali |
| Retention utenti | >40% MAU | Utenti attivi mese su mese |
| Tempo medio risposta API | <500ms | CloudWatch metrics |
| Uptime | 99.5% | CloudWatch alarms |
| Cashback distribuito/mese | Crescita 10% MoM | Transazioni cashback |

---

## Functional Requirements

Functional Requirements (FRs) define **what** the system does - specific features and behaviors.

Each requirement includes:
- **ID**: Unique identifier (FR-001, FR-002, etc.)
- **Priority**: Must Have / Should Have / Could Have (MoSCoW)
- **Description**: What the system should do
- **Acceptance Criteria**: How to verify it's complete

---

### Area 1: Gestione Annunci (Listings)

#### FR-001: Creazione Annunci tramite Post Facebook

**Priority:** Must Have

**Description:**
Il sistema deve permettere la creazione di annunci di vendita intercettando post pubblicati su Facebook tramite webhook.

**Acceptance Criteria:**
- [ ] Il webhook riceve eventi di nuovi post da Facebook
- [ ] Il sistema identifica i post di vendita vs altri contenuti
- [ ] Viene creato un record annuncio con i dati estratti
- [ ] Il venditore riceve conferma via Messenger

**Dependencies:** FR-048, FR-002

---

#### FR-002: Analisi AI dei Contenuti

**Priority:** Must Have

**Description:**
Il sistema deve analizzare automaticamente il testo dei post con AI (OpenAI) per estrarre categoria, prezzo, localita e parole chiave.

**Acceptance Criteria:**
- [ ] Il testo viene inviato all'API OpenAI con prompt strutturato
- [ ] Vengono estratti: tipo, categoria, prezzo, localita, keywords
- [ ] Output in formato JSON strutturato
- [ ] Gestione errori per testi non analizzabili

**Dependencies:** Nessuna

---

#### FR-003: Persistenza Annunci

**Priority:** Must Have

**Description:**
Il sistema deve salvare gli annunci in DynamoDB con indicizzazione parallela su Elasticsearch per ricerche efficienti.

**Acceptance Criteria:**
- [ ] Annuncio salvato in tabella DynamoDB `MarketplaceListings`
- [ ] Documento indicizzato in Elasticsearch con mappature corrette
- [ ] ID univoco generato (UUID)
- [ ] Timestamp di creazione registrato

**Dependencies:** FR-002

---

#### FR-004: Ricerca Annunci

**Priority:** Must Have

**Description:**
Il sistema deve permettere la ricerca di annunci per categoria, localita, range di prezzo e parole chiave.

**Acceptance Criteria:**
- [ ] API endpoint per ricerca con parametri multipli
- [ ] Ricerca full-text su titolo e descrizione
- [ ] Filtro per categoria (keyword)
- [ ] Filtro per localita (geo_point o keyword)
- [ ] Filtro per range prezzo
- [ ] Risultati ordinati per rilevanza/data

**Dependencies:** FR-003

---

#### FR-005: Scadenza Automatica Annunci

**Priority:** Should Have

**Description:**
Il sistema deve gestire la scadenza automatica degli annunci dopo un periodo configurabile.

**Acceptance Criteria:**
- [ ] Lambda schedulata per identificare annunci scaduti
- [ ] Annunci scaduti marcati come inattivi
- [ ] Notifica al venditore di scadenza imminente
- [ ] Possibilita di rinnovo

**Dependencies:** FR-003

---

#### FR-006: Eliminazione Annunci

**Priority:** Must Have

**Description:**
Il sistema deve permettere l'eliminazione di annunci da parte del proprietario.

**Acceptance Criteria:**
- [ ] API endpoint per eliminazione con autenticazione
- [ ] Verifica ownership dell'annuncio
- [ ] Rimozione da DynamoDB ed Elasticsearch
- [ ] Conferma eliminazione al venditore

**Dependencies:** FR-003, FR-045

---

### Area 2: Gestione Richieste (Requests)

#### FR-007: Creazione Richieste via Messenger

**Priority:** Must Have

**Description:**
Il sistema deve permettere la creazione di richieste di acquisto tramite messaggi Messenger.

**Acceptance Criteria:**
- [ ] Ricezione messaggi via webhook Messenger
- [ ] Identificazione intent "richiesta acquisto"
- [ ] Creazione record richiesta in DynamoDB
- [ ] Conferma al richiedente

**Dependencies:** FR-033, FR-008

---

#### FR-008: Analisi AI Richieste

**Priority:** Must Have

**Description:**
Il sistema deve analizzare le richieste con AI per estrarre criteri di ricerca.

**Acceptance Criteria:**
- [ ] Estrazione: categoria cercata, budget max, localita preferita, keywords
- [ ] Output JSON strutturato
- [ ] Gestione richieste ambigue

**Dependencies:** Nessuna

---

#### FR-009: Gestione Richieste Attive

**Priority:** Must Have

**Description:**
Il sistema deve salvare e gestire le richieste attive degli utenti.

**Acceptance Criteria:**
- [ ] Salvataggio in tabella `MarketplaceRequests`
- [ ] Status: active, matched, expired
- [ ] Tracciamento data creazione e ultima modifica

**Dependencies:** FR-008

---

#### FR-010: Scadenza Automatica Richieste

**Priority:** Should Have

**Description:**
Il sistema deve gestire la scadenza automatica delle richieste dopo un periodo configurabile.

**Acceptance Criteria:**
- [ ] Lambda schedulata per cleanup
- [ ] Notifica scadenza imminente
- [ ] Marcatura come expired

**Dependencies:** FR-009

---

### Area 3: Sistema di Matching

#### FR-011: Matching Periodico

**Priority:** Must Have

**Description:**
Il sistema deve eseguire matching periodico (ogni 5 minuti) tra richieste attive e annunci disponibili.

**Acceptance Criteria:**
- [ ] Make workflow schedulato ogni 5 minuti
- [ ] Query richieste attive
- [ ] Per ogni richiesta, ricerca annunci compatibili
- [ ] Algoritmo di scoring per rilevanza
- [ ] Salvataggio match trovati

**Dependencies:** FR-004, FR-009

---

#### FR-012: Notifica Acquirenti per Match

**Priority:** Must Have

**Description:**
Il sistema deve notificare gli acquirenti quando viene trovata una corrispondenza con la loro richiesta.

**Acceptance Criteria:**
- [ ] Messaggio Messenger con dettagli annuncio
- [ ] Link per visualizzare annuncio
- [ ] Opzione per contattare venditore
- [ ] Messaggio nella lingua preferita

**Dependencies:** FR-011, FR-050

---

#### FR-013: Notifica Venditori Selezionati

**Priority:** Must Have

**Description:**
Il sistema deve notificare i venditori quando esiste una richiesta pertinente ai loro prodotti.

**Acceptance Criteria:**
- [ ] Messaggio anonimo (no dati acquirente)
- [ ] Descrizione generica della richiesta
- [ ] Invito a creare annuncio se non presente

**Dependencies:** FR-011, FR-050

---

#### FR-014: Matching Basato su Gruppo

**Priority:** Should Have

**Description:**
Il sistema deve supportare il matching prioritario all'interno dei gruppi di appartenenza.

**Acceptance Criteria:**
- [ ] Match intra-gruppo valutati per primi
- [ ] Bonus scoring per stesso gruppo
- [ ] Rispetto delle preferenze utente

**Dependencies:** FR-011, FR-015

---

### Area 4: Gestione Gruppi

#### FR-015: Creazione Gruppi

**Priority:** Must Have

**Description:**
Il sistema deve permettere la creazione di gruppi di interesse.

**Acceptance Criteria:**
- [ ] API per creazione gruppo (groupId, groupName, leaderId)
- [ ] Salvataggio in tabella `Groups` DynamoDB
- [ ] Validazione unicita nome gruppo
- [ ] Assegnazione automatica creatore come leader

**Dependencies:** FR-045

---

#### FR-016: Ruolo Capo Gruppo

**Priority:** Must Have

**Description:**
Il sistema deve gestire il ruolo di "capo gruppo" con privilegi speciali.

**Acceptance Criteria:**
- [ ] Campo `leaderId` nel record gruppo
- [ ] Permessi: gestione membri, creazione offerte, visualizzazione stats
- [ ] Un solo leader per gruppo (trasferibile)

**Dependencies:** FR-015

---

#### FR-017: Gestione Membri Gruppo

**Priority:** Must Have

**Description:**
Il sistema deve permettere l'aggiunta e rimozione di membri dal gruppo.

**Acceptance Criteria:**
- [ ] API `addUserToGroup(groupId, userId)`
- [ ] API `removeUserFromGroup(groupId, userId)`
- [ ] Lista membri aggiornata in tempo reale
- [ ] Solo leader puo rimuovere membri

**Dependencies:** FR-015, FR-016

---

#### FR-018: Offerte Esclusive Gruppi

**Priority:** Should Have

**Description:**
Il sistema deve permettere ai capi gruppo di creare offerte esclusive per i membri.

**Acceptance Criteria:**
- [ ] Flag `groupExclusive` sugli annunci
- [ ] Visibilita limitata ai membri del gruppo
- [ ] Notifica ai membri per nuove offerte

**Dependencies:** FR-001, FR-016

---

#### FR-019: Sincronizzazione Facebook Groups

**Priority:** Should Have

**Description:**
Il sistema deve sincronizzare i gruppi interni con Facebook Groups.

**Acceptance Criteria:**
- [ ] Mapping tra gruppo interno e Facebook Group ID
- [ ] Intercettazione post da gruppi Facebook specifici
- [ ] Associazione automatica annuncio a gruppo

**Dependencies:** FR-048

---

#### FR-020: Informazioni Dettagliate Gruppi

**Priority:** Must Have

**Description:**
Il sistema deve recuperare informazioni dettagliate sui gruppi.

**Acceptance Criteria:**
- [ ] API `getGroupInfo(groupId)`
- [ ] Dati: nome, descrizione, leader, membri count, stats
- [ ] Statistiche vendite del gruppo

**Dependencies:** FR-015

---

### Area 5: Sistema Cashback

#### FR-021: Calcolo Commissione Quofind

**Priority:** Must Have

**Description:**
Il sistema deve calcolare automaticamente la commissione Quofind su ogni vendita (default 10%).

**Acceptance Criteria:**
- [ ] Percentuale configurabile in `cashbackConfig`
- [ ] Calcolo: `commission = salePrice * quofindCommission`
- [ ] Registro transazione commissione

**Dependencies:** FR-029

---

#### FR-022: Cashback Acquirente

**Priority:** Must Have

**Description:**
Il sistema deve accreditare cashback all'acquirente (66% della commissione).

**Acceptance Criteria:**
- [ ] Calcolo: `buyerCashback = commission * 0.66`
- [ ] Accredito nel saldo `PaybackBalances`
- [ ] Status "pending" per 30 giorni

**Dependencies:** FR-021, FR-025

---

#### FR-023: Cashback Capo Gruppo

**Priority:** Must Have

**Description:**
Il sistema deve accreditare cashback al capo gruppo (5% della commissione) per vendite nel gruppo.

**Acceptance Criteria:**
- [ ] Solo per vendite intra-gruppo
- [ ] Calcolo: `leaderCashback = commission * 0.05`
- [ ] Accredito nel saldo del leader

**Dependencies:** FR-021, FR-016

---

#### FR-024: Cashback Segnalatore

**Priority:** Should Have

**Description:**
Il sistema deve accreditare cashback al segnalatore (2% della commissione) per vendite di venditori segnalati.

**Acceptance Criteria:**
- [ ] Tracking relazione segnalatore-venditore
- [ ] Calcolo: `referrerCashback = commission * 0.02`
- [ ] Accredito nel saldo del segnalatore

**Dependencies:** FR-021, FR-030

---

#### FR-025: Periodo Attesa Cashback

**Priority:** Must Have

**Description:**
Il sistema deve gestire il periodo di attesa di 30 giorni prima dell'accreditamento definitivo.

**Acceptance Criteria:**
- [ ] Campo `pending` separato da `balance`
- [ ] Lambda schedulata per sblocco after 30 days
- [ ] Notifica all'utente quando disponibile

**Dependencies:** Nessuna

---

#### FR-026: Consultazione Saldo Cashback

**Priority:** Must Have

**Description:**
Il sistema deve permettere la consultazione del saldo cashback disponibile e in attesa.

**Acceptance Criteria:**
- [ ] API `getPaybackBalance(userId)`
- [ ] Response: balance, pending, lastUpdated
- [ ] Accessibile via chatbot

**Dependencies:** FR-033

---

#### FR-027: Registro Transazioni Cashback

**Priority:** Must Have

**Description:**
Il sistema deve registrare tutte le transazioni di cashback.

**Acceptance Criteria:**
- [ ] Tabella `Transactions` in DynamoDB
- [ ] Campi: transactionId, userId, amount, type, status, timestamp
- [ ] Tracciabilita completa

**Dependencies:** Nessuna

---

#### FR-028: Rollback Cashback per Rimborsi

**Priority:** Should Have

**Description:**
Il sistema deve supportare il rollback del cashback in caso di rimborso della transazione.

**Acceptance Criteria:**
- [ ] API `rollbackPayback(transactionId)`
- [ ] Storno da balance o pending
- [ ] Registro della transazione di storno

**Dependencies:** FR-027

---

#### FR-029: Configurazione Dinamica Percentuali

**Priority:** Should Have

**Description:**
Il sistema deve permettere la configurazione dinamica delle percentuali di cashback.

**Acceptance Criteria:**
- [ ] Tabella `cashbackConfig` in DynamoDB
- [ ] API `getCashbackConfig()`
- [ ] Modifiche senza deploy

**Dependencies:** Nessuna

---

### Area 6: Sistema Segnalazioni

#### FR-030: Segnalazione Venditori

**Priority:** Should Have

**Description:**
Il sistema deve permettere agli utenti di segnalare nuovi venditori a Quofind.

**Acceptance Criteria:**
- [ ] API per registrare segnalazione
- [ ] Validazione venditore non gia presente
- [ ] Creazione relazione referrer-venditore

**Dependencies:** FR-045

---

#### FR-031: Tracking Vendite Segnalati

**Priority:** Should Have

**Description:**
Il sistema deve tracciare le vendite dei venditori segnalati.

**Acceptance Criteria:**
- [ ] Associazione vendita a venditore
- [ ] Lookup referrer del venditore
- [ ] Trigger per calcolo cashback

**Dependencies:** FR-030

---

#### FR-032: Cashback per Segnalazioni

**Priority:** Should Have

**Description:**
Il sistema deve calcolare e accreditare il cashback per segnalazioni.

**Acceptance Criteria:**
- [ ] Calcolo automatico su ogni vendita
- [ ] Accredito al segnalatore
- [ ] Report segnalazioni disponibile

**Dependencies:** FR-031, FR-024

---

### Area 7: Chatbot Messenger

#### FR-033: Ricezione Messaggi Webhook

**Priority:** Must Have

**Description:**
Il sistema deve ricevere messaggi via webhook Messenger.

**Acceptance Criteria:**
- [ ] Endpoint webhook configurato
- [ ] Verifica token Facebook
- [ ] Parsing eventi messaggi
- [ ] Gestione retry/duplicate

**Dependencies:** Nessuna

---

#### FR-034: Analisi Intento con AI

**Priority:** Must Have

**Description:**
Il sistema deve analizzare l'intento dell'utente con AI (OpenAI).

**Acceptance Criteria:**
- [ ] Identificazione intent (balance, transactions, groups, etc.)
- [ ] Estrazione entita rilevanti
- [ ] Confidence score
- [ ] Fallback per intent non riconosciuti

**Dependencies:** Nessuna

---

#### FR-035: Query Saldo Cashback

**Priority:** Must Have

**Description:**
Il sistema deve rispondere a query sul saldo cashback via chatbot.

**Acceptance Criteria:**
- [ ] Riconoscimento domande tipo "Quanto e il mio saldo?"
- [ ] Risposta con balance e pending
- [ ] Formato leggibile

**Dependencies:** FR-034, FR-026

---

#### FR-036: Query Storico Transazioni

**Priority:** Should Have

**Description:**
Il sistema deve rispondere a query sullo storico transazioni.

**Acceptance Criteria:**
- [ ] Riconoscimento domande su transazioni
- [ ] Lista ultime N transazioni
- [ ] Dettagli data, importo, tipo

**Dependencies:** FR-034, FR-027

---

#### FR-037: Query Gruppi

**Priority:** Should Have

**Description:**
Il sistema deve rispondere a query sui gruppi dell'utente.

**Acceptance Criteria:**
- [ ] Lista gruppi di appartenenza
- [ ] Ruolo in ogni gruppo
- [ ] Statistiche cashback per gruppo

**Dependencies:** FR-034, FR-020

---

#### FR-038: Query Segnalazioni

**Priority:** Could Have

**Description:**
Il sistema deve rispondere a query sulle segnalazioni effettuate.

**Acceptance Criteria:**
- [ ] Lista venditori segnalati
- [ ] Cashback guadagnato per segnalazioni

**Dependencies:** FR-034, FR-031

---

#### FR-039: Gestione Richieste Non Autorizzate

**Priority:** Must Have

**Description:**
Il sistema deve gestire richieste di dati non autorizzati con messaggi appropriati.

**Acceptance Criteria:**
- [ ] Riconoscimento richieste su altri utenti
- [ ] Risposta cortese di diniego
- [ ] Suggerimento alternative
- [ ] Nessuna esposizione dati sensibili

**Dependencies:** FR-034

---

#### FR-040: Risposte Multilingua

**Priority:** Should Have

**Description:**
Il sistema deve supportare risposte multilingua (IT/EN).

**Acceptance Criteria:**
- [ ] Rilevamento lingua preferita utente
- [ ] Template risposte in IT e EN
- [ ] Fallback a EN se lingua non supportata

**Dependencies:** FR-046

---

### Area 8: Notifiche

#### FR-041: Conferma Creazione Annuncio

**Priority:** Must Have

**Description:**
Il sistema deve inviare conferme di creazione annuncio via Messenger.

**Acceptance Criteria:**
- [ ] Messaggio immediato dopo creazione
- [ ] Riepilogo dati estratti
- [ ] Link per visualizzare annuncio

**Dependencies:** FR-001, FR-050

---

#### FR-042: Notifiche di Matching

**Priority:** Must Have

**Description:**
Il sistema deve inviare notifiche di matching via Messenger.

**Acceptance Criteria:**
- [ ] Notifica per ogni match rilevante
- [ ] Dettagli dell'annuncio/richiesta
- [ ] Call to action chiara

**Dependencies:** FR-011, FR-050

---

#### FR-043: Notifiche Accreditamento Cashback

**Priority:** Should Have

**Description:**
Il sistema deve inviare notifiche quando il cashback viene accreditato.

**Acceptance Criteria:**
- [ ] Notifica quando pending diventa available
- [ ] Importo e nuovo saldo totale

**Dependencies:** FR-025, FR-050

---

#### FR-044: Notifiche Localizzate

**Priority:** Should Have

**Description:**
Il sistema deve supportare notifiche nella lingua preferita dell'utente.

**Acceptance Criteria:**
- [ ] Template in IT e EN
- [ ] Selezione automatica basata su preferenza
- [ ] Coerenza con chatbot

**Dependencies:** FR-040, FR-046

---

### Area 9: Autenticazione e Utenti

#### FR-045: Facebook Login

**Priority:** Must Have

**Description:**
Il sistema deve autenticare gli utenti tramite Facebook Login.

**Acceptance Criteria:**
- [ ] OAuth flow con Facebook
- [ ] Ottenimento access token
- [ ] Verifica permessi richiesti
- [ ] Gestione refresh token

**Dependencies:** Nessuna

---

#### FR-046: Gestione Profili Utente

**Priority:** Must Have

**Description:**
Il sistema deve memorizzare e gestire i profili utente.

**Acceptance Criteria:**
- [ ] Tabella `MarketplaceUsers` in DynamoDB
- [ ] Campi: userId, facebookId, name, language, createdAt
- [ ] Update preferenze utente

**Dependencies:** FR-045

---

#### FR-047: Gestione Token Facebook

**Priority:** Must Have

**Description:**
Il sistema deve gestire i token di accesso Facebook in modo sicuro.

**Acceptance Criteria:**
- [ ] Storage token in AWS Secrets Manager
- [ ] Refresh automatico token scaduti
- [ ] Nessun token in log o codice

**Dependencies:** FR-045

---

### Area 10: Integrazione Facebook

#### FR-048: Intercettazione Post via Webhook

**Priority:** Must Have

**Description:**
Il sistema deve intercettare post da Facebook tramite webhook.

**Acceptance Criteria:**
- [ ] Webhook endpoint registrato con Facebook
- [ ] Ricezione eventi `feed` per nuovi post
- [ ] Parsing payload Facebook
- [ ] Deduplicazione eventi

**Dependencies:** Nessuna

---

#### FR-049: Pubblicazione Annunci via Graph API

**Priority:** Must Have

**Description:**
Il sistema deve pubblicare annunci su Facebook via Graph API.

**Acceptance Criteria:**
- [ ] Post su pagina/gruppo configurato
- [ ] Formattazione corretta (immagini, testo)
- [ ] Gestione errori API
- [ ] Retry su failure

**Dependencies:** FR-047

---

#### FR-050: Messaggistica via Messenger API

**Priority:** Must Have

**Description:**
Il sistema deve inviare e ricevere messaggi via Messenger API.

**Acceptance Criteria:**
- [ ] Invio messaggi a utenti
- [ ] Supporto rich messages (buttons, quick replies)
- [ ] Gestione rate limits
- [ ] Logging conversazioni

**Dependencies:** FR-047

---

## Non-Functional Requirements

Non-Functional Requirements (NFRs) define **how** the system performs - quality attributes and constraints.

---

### NFR-001: Performance - Tempo di Risposta API

**Priority:** Must Have

**Description:**
Le API Lambda devono rispondere entro tempi accettabili per garantire un'esperienza utente fluida.

**Acceptance Criteria:**
- [ ] Tempo di risposta < 500ms per il 95% delle richieste API
- [ ] Tempo di risposta < 1000ms per il 99% delle richieste API
- [ ] Query Elasticsearch < 200ms per ricerche standard

**Rationale:**
Gli utenti interagiscono via Messenger dove si aspettano risposte rapide.

---

### NFR-002: Performance - Throughput

**Priority:** Should Have

**Description:**
Il sistema deve gestire il carico previsto di utenti e transazioni.

**Acceptance Criteria:**
- [ ] Supporto per almeno 100 richieste concorrenti
- [ ] Capacita di processare 1.000 annunci/ora durante i picchi
- [ ] Matching batch di 10.000 richieste/esecuzione (ogni 5 min)

**Rationale:**
Essendo un marketplace, il sistema deve scalare con la crescita degli utenti.

---

### NFR-003: Security - Autenticazione

**Priority:** Must Have

**Description:**
Il sistema deve implementare autenticazione sicura tramite Facebook OAuth.

**Acceptance Criteria:**
- [ ] Tutti gli endpoint API richiedono token di autenticazione valido
- [ ] Token Facebook verificati ad ogni richiesta
- [ ] Sessioni con scadenza configurabile
- [ ] Nessun dato sensibile esposto in log o errori

**Rationale:**
Protezione degli account utente e dei dati finanziari (cashback).

---

### NFR-004: Security - Autorizzazione

**Priority:** Must Have

**Description:**
Il sistema deve implementare controlli di accesso basati su ruoli.

**Acceptance Criteria:**
- [ ] Utenti possono accedere solo ai propri dati
- [ ] Capi gruppo hanno accesso alle statistiche del gruppo
- [ ] Il chatbot rifiuta richieste di dati non autorizzati
- [ ] Separazione dei dati tra gruppi

**Rationale:**
Privacy degli utenti e protezione delle informazioni competitive.

---

### NFR-005: Security - Protezione Dati

**Priority:** Must Have

**Description:**
I dati sensibili devono essere protetti in transito e a riposo.

**Acceptance Criteria:**
- [ ] Tutte le comunicazioni API su HTTPS
- [ ] Dati sensibili criptati in DynamoDB (at-rest encryption)
- [ ] Chiavi API e token in AWS Secrets Manager
- [ ] Nessuna chiave hardcoded nel codice

**Rationale:**
Conformita alle best practice di sicurezza e protezione dei dati finanziari.

---

### NFR-006: Scalability - Auto-scaling

**Priority:** Must Have

**Description:**
Il sistema deve scalare automaticamente in base al carico.

**Acceptance Criteria:**
- [ ] Lambda con concorrenza riservata configurata
- [ ] DynamoDB in modalita on-demand o auto-scaling
- [ ] Elasticsearch con nodi scalabili
- [ ] Nessun single point of failure

**Rationale:**
Architettura serverless richiede configurazione corretta per scalare.

---

### NFR-007: Reliability - Uptime

**Priority:** Must Have

**Description:**
Il sistema deve garantire alta disponibilita.

**Acceptance Criteria:**
- [ ] Uptime >= 99.5% (esclusa manutenzione programmata)
- [ ] Downtime massimo pianificato: 4 ore/mese
- [ ] Recovery automatico da failure di singoli componenti

**Rationale:**
Gli utenti si aspettano che il servizio sia sempre disponibile.

---

### NFR-008: Reliability - Error Handling

**Priority:** Must Have

**Description:**
Il sistema deve gestire gli errori in modo robusto.

**Acceptance Criteria:**
- [ ] Tutti gli errori loggati in CloudWatch
- [ ] Errori utente restituiti con messaggi localizzati
- [ ] Retry automatico per errori transienti (3 tentativi)
- [ ] Circuit breaker per servizi esterni

**Rationale:**
Resilienza del sistema e esperienza utente in caso di problemi.

---

### NFR-009: Usability - Localizzazione

**Priority:** Should Have

**Description:**
Il sistema deve supportare piu lingue per utenti internazionali.

**Acceptance Criteria:**
- [ ] Supporto per Italiano e Inglese
- [ ] Messaggi di errore localizzati
- [ ] Notifiche nella lingua preferita dell'utente
- [ ] Chatbot multilingua

**Rationale:**
Base utenti potenzialmente internazionale.

---

### NFR-010: Maintainability - Logging e Monitoring

**Priority:** Must Have

**Description:**
Il sistema deve essere facilmente monitorabile e debuggabile.

**Acceptance Criteria:**
- [ ] Log strutturati in CloudWatch per tutte le Lambda
- [ ] Metriche chiave in CloudWatch Dashboards
- [ ] Allarmi per errori critici (>5% error rate)
- [ ] Tracing distribuito per debug

**Rationale:**
Necessario per operazioni e troubleshooting.

---

### NFR-011: Maintainability - Code Quality

**Priority:** Should Have

**Description:**
Il codice deve seguire standard di qualita per facilitare la manutenzione.

**Acceptance Criteria:**
- [ ] Copertura test unitari >= 70%
- [ ] Documentazione per ogni funzione Lambda
- [ ] Standard di codifica documentati
- [ ] Code review obbligatoria

**Rationale:**
Sostenibilita del progetto nel lungo termine.

---

### NFR-012: Compatibility - Facebook API

**Priority:** Must Have

**Description:**
Il sistema deve mantenere compatibilita con le API Facebook.

**Acceptance Criteria:**
- [ ] Supporto per Facebook Graph API v18.0+
- [ ] Gestione dei cambiamenti breaking delle API
- [ ] Conformita alle policy Facebook Commerce
- [ ] Webhook conformi alle specifiche Messenger

**Rationale:**
Il sistema dipende interamente dall'ecosistema Facebook.

---

## Epics

Epics are logical groupings of related functionality that will be broken down into user stories during sprint planning (Phase 4).

Each epic maps to multiple functional requirements and will generate 2-10 stories.

---

### EPIC-001: Core Listings Management

**Description:**
Sistema completo per la creazione, gestione e ricerca di annunci di vendita attraverso l'integrazione con Facebook.

**Functional Requirements:**
- FR-001: Creazione annunci tramite post Facebook
- FR-002: Analisi AI per estrazione dati
- FR-003: Persistenza in DynamoDB + Elasticsearch
- FR-004: Ricerca annunci
- FR-005: Scadenza automatica annunci
- FR-006: Eliminazione annunci

**Story Count Estimate:** 8-10

**Priority:** Must Have

**Business Value:**
Funzionalita core del marketplace - senza annunci non c'e piattaforma.

---

### EPIC-002: Requests & Automatic Matching

**Description:**
Sistema per gestire le richieste di acquisto e il matching automatico con annunci disponibili.

**Functional Requirements:**
- FR-007: Creazione richieste via Messenger
- FR-008: Analisi AI richieste
- FR-009: Gestione richieste attive
- FR-010: Scadenza automatica richieste
- FR-011: Matching periodico (ogni 5 min)
- FR-012: Notifica acquirenti per match
- FR-013: Notifica venditori selezionati
- FR-014: Matching basato su gruppo

**Story Count Estimate:** 10-12

**Priority:** Must Have

**Business Value:**
Differenziatore chiave - il matching automatico facilita le transazioni.

---

### EPIC-003: Groups Management

**Description:**
Sistema per creare e gestire gruppi di interesse con funzionalita speciali per i leader.

**Functional Requirements:**
- FR-015: Creazione gruppi
- FR-016: Ruolo capo gruppo
- FR-017: Gestione membri
- FR-018: Offerte esclusive gruppi
- FR-019: Sincronizzazione Facebook Groups
- FR-020: Informazioni dettagliate gruppi

**Story Count Estimate:** 8-10

**Priority:** Must Have

**Business Value:**
Crea community e fidelizzazione, aumenta engagement.

---

### EPIC-004: Cashback System

**Description:**
Sistema completo di cashback per incentivare acquisti e vendite sulla piattaforma.

**Functional Requirements:**
- FR-021: Calcolo commissione Quofind
- FR-022: Cashback acquirente
- FR-023: Cashback capo gruppo
- FR-024: Cashback segnalatore
- FR-025: Periodo attesa 30 giorni
- FR-026: Consultazione saldo
- FR-027: Registro transazioni
- FR-028: Rollback per rimborsi
- FR-029: Configurazione dinamica percentuali

**Story Count Estimate:** 10-12

**Priority:** Must Have

**Business Value:**
Meccanismo principale di monetizzazione e incentivazione.

---

### EPIC-005: Referral System

**Description:**
Sistema per incentivare gli utenti a segnalare nuovi venditori alla piattaforma.

**Functional Requirements:**
- FR-030: Segnalazione venditori
- FR-031: Tracking vendite segnalati
- FR-032: Cashback per segnalazioni

**Story Count Estimate:** 4-5

**Priority:** Should Have

**Business Value:**
Crescita organica della piattaforma tramite incentivi.

---

### EPIC-006: AI Chatbot

**Description:**
Chatbot intelligente via Messenger per interazioni utente e query sul sistema.

**Functional Requirements:**
- FR-033: Ricezione messaggi webhook
- FR-034: Analisi intento con AI
- FR-035: Query saldo cashback
- FR-036: Query storico transazioni
- FR-037: Query gruppi
- FR-038: Query segnalazioni
- FR-039: Gestione richieste non autorizzate
- FR-040: Risposte multilingua

**Story Count Estimate:** 10-12

**Priority:** Must Have

**Business Value:**
Esperienza utente self-service, riduce carico supporto.

---

### EPIC-007: Notification System

**Description:**
Sistema di notifiche per tenere informati gli utenti su eventi rilevanti.

**Functional Requirements:**
- FR-041: Conferma creazione annuncio
- FR-042: Notifiche matching
- FR-043: Notifiche accreditamento cashback
- FR-044: Notifiche localizzate

**Story Count Estimate:** 5-6

**Priority:** Must Have

**Business Value:**
Engagement utente e comunicazione tempestiva.

---

### EPIC-008: User Authentication & Profiles

**Description:**
Sistema di autenticazione tramite Facebook e gestione profili utente.

**Functional Requirements:**
- FR-045: Facebook Login
- FR-046: Gestione profili utente
- FR-047: Gestione token Facebook

**Story Count Estimate:** 4-5

**Priority:** Must Have

**Business Value:**
Prerequisito per tutte le altre funzionalita.

---

### EPIC-009: Facebook Platform Integration

**Description:**
Integrazione profonda con l'ecosistema Facebook (Graph API, Messenger, Webhooks).

**Functional Requirements:**
- FR-048: Intercettazione post via webhook
- FR-049: Pubblicazione annunci via Graph API
- FR-050: Messaggistica via Messenger API

**Story Count Estimate:** 6-8

**Priority:** Must Have

**Business Value:**
Fondamento tecnico dell'intera piattaforma.

---

## User Stories (High-Level)

User stories follow the format: "As a [user type], I want [goal] so that [benefit]."

These are preliminary stories. Detailed stories will be created in Phase 4 (Implementation).

---

### EPIC-001: Core Listings Management

1. **Come venditore**, voglio pubblicare un post su Facebook con la descrizione del mio articolo, **affinche** il sistema crei automaticamente un annuncio nel marketplace.

2. **Come acquirente**, voglio cercare annunci per categoria e localita, **affinche** possa trovare rapidamente cio che cerco.

3. **Come venditore**, voglio ricevere conferma quando il mio annuncio viene pubblicato, **affinche** sappia che e attivo nel marketplace.

---

### EPIC-002: Requests & Automatic Matching

1. **Come acquirente**, voglio inviare un messaggio descrivendo cosa cerco, **affinche** il sistema trovi annunci compatibili per me.

2. **Come acquirente**, voglio essere notificato quando viene pubblicato un annuncio che corrisponde alla mia richiesta, **affinche** possa acquistare rapidamente.

3. **Come venditore**, voglio ricevere notifiche anonime su richieste pertinenti ai miei prodotti, **affinche** possa proporre i miei articoli.

---

### EPIC-003: Groups Management

1. **Come utente**, voglio creare un gruppo di interesse (es. "Fotografi Milano"), **affinche** possa vendere/acquistare con persone con interessi simili.

2. **Come capo gruppo**, voglio gestire i membri del mio gruppo, **affinche** possa mantenere la qualita della community.

3. **Come membro di un gruppo**, voglio vedere offerte esclusive pubblicate dal capo gruppo, **affinche** possa approfittare di deals speciali.

---

### EPIC-004: Cashback System

1. **Come acquirente**, voglio ricevere cashback sugli acquisti effettuati, **affinche** sia incentivato a usare la piattaforma.

2. **Come capo gruppo**, voglio ricevere una commissione sulle vendite nel mio gruppo, **affinche** sia ricompensato per il mio lavoro di community management.

3. **Come utente**, voglio consultare il mio saldo cashback e lo storico transazioni, **affinche** possa tenere traccia dei miei guadagni.

---

### EPIC-005: Referral System

1. **Come utente**, voglio segnalare un nuovo venditore a Quofind, **affinche** possa guadagnare cashback sulle sue future vendite.

2. **Come segnalatore**, voglio vedere quanto ho guadagnato dalle vendite dei venditori che ho segnalato, **affinche** possa monitorare i miei referral.

---

### EPIC-006: AI Chatbot

1. **Come utente**, voglio chiedere al chatbot "Quanto e il mio saldo cashback?", **affinche** possa ottenere informazioni rapidamente senza navigare.

2. **Come utente**, voglio chiedere al chatbot informazioni sui miei gruppi, **affinche** possa gestire la mia partecipazione.

3. **Come utente**, voglio che il chatbot mi risponda nella mia lingua preferita, **affinche** l'esperienza sia naturale.

---

### EPIC-007: Notification System

1. **Come venditore**, voglio ricevere una notifica quando qualcuno e interessato al mio annuncio, **affinche** possa rispondere prontamente.

2. **Come utente**, voglio essere notificato quando il mio cashback viene accreditato, **affinche** sappia quando posso usarlo.

---

### EPIC-008: User Authentication & Profiles

1. **Come nuovo utente**, voglio accedere con il mio account Facebook, **affinche** non debba creare un nuovo account.

2. **Come utente**, voglio che il sistema ricordi la mia lingua preferita, **affinche** le comunicazioni siano sempre nella lingua giusta.

---

### EPIC-009: Facebook Platform Integration

1. **Come venditore**, voglio che i miei post su un gruppo Facebook vengano automaticamente rilevati, **affinche** non debba fare doppio lavoro.

2. **Come utente**, voglio ricevere tutte le comunicazioni via Messenger, **affinche** possa interagire dove sono gia attivo.

---

## User Personas

### Venditore Occasionale

**Nome:** Marco, 35 anni
**Descrizione:** Vende occasionalmente oggetti usati (elettronica, abbigliamento)
**Obiettivi:** Vendere rapidamente, ottenere un buon prezzo
**Pain Points:** Gestione di piu canali, rispondere a molti messaggi
**Come usa Quofind:** Pubblica post su Facebook, riceve notifiche di interesse

### Acquirente Attivo

**Nome:** Laura, 28 anni
**Descrizione:** Cerca regolarmente affari su marketplace
**Obiettivi:** Trovare buoni prezzi, risparmiare tempo
**Pain Points:** Cercare su piu piattaforme, perdere offerte
**Come usa Quofind:** Invia richieste, riceve notifiche di match, accumula cashback

### Capo Gruppo

**Nome:** Alessandro, 42 anni
**Descrizione:** Gestisce un gruppo Facebook di appassionati di fotografia
**Obiettivi:** Monetizzare la community, offrire valore ai membri
**Pain Points:** Gestione manuale delle vendite, nessun incentivo
**Come usa Quofind:** Crea offerte esclusive, guadagna cashback sulle vendite del gruppo

### Segnalatore

**Nome:** Giulia, 30 anni
**Descrizione:** Ha una rete di contatti venditori
**Obiettivi:** Guadagnare passivamente dalle segnalazioni
**Pain Points:** Nessun sistema di tracking referral
**Come usa Quofind:** Segnala venditori, monitora guadagni

---

## User Flows

### Flow 1: Pubblicazione Annuncio

```
1. Venditore pubblica post su gruppo Facebook
2. Webhook intercetta il post
3. AI analizza testo ed estrae: categoria, prezzo, localita
4. Sistema crea annuncio in DynamoDB + Elasticsearch
5. Venditore riceve conferma via Messenger
6. Annuncio visibile nelle ricerche
```

### Flow 2: Richiesta e Matching

```
1. Acquirente invia messaggio "Cerco iPhone sotto 500 euro a Milano"
2. AI analizza e crea richiesta
3. Sistema salva richiesta attiva
4. Ogni 5 minuti: matching con annunci
5. Se match trovato: notifica acquirente via Messenger
6. Acquirente contatta venditore
```

### Flow 3: Acquisto con Cashback

```
1. Transazione completata su Facebook Marketplace
2. Make riceve conferma pagamento
3. Sistema calcola commissione (10%)
4. Distribuzione cashback:
   - 66% ad acquirente
   - 5% a capo gruppo (se applicabile)
   - 2% a segnalatore (se applicabile)
5. Cashback in stato "pending" per 30 giorni
6. Dopo 30 giorni: accredito definitivo + notifica
```

---

## Dependencies

### Internal Dependencies

| Componente | Dipende da |
|------------|------------|
| FR-001 (Creazione annunci) | FR-048 (Webhook), FR-002 (AI) |
| FR-011 (Matching) | FR-004 (Ricerca), FR-009 (Richieste) |
| FR-022 (Cashback acquirente) | FR-021 (Commissione), FR-025 (Periodo attesa) |
| FR-035 (Query saldo chatbot) | FR-034 (Analisi intento), FR-026 (Saldo) |
| Tutti gli FR utente | FR-045 (Autenticazione) |

### External Dependencies

| Servizio | Utilizzo | Rischio |
|----------|----------|---------|
| Facebook Graph API | Post, messaggi, autenticazione | Alto - piattaforma core |
| Facebook Messenger API | Chatbot, notifiche | Alto - canale comunicazione principale |
| OpenAI API | Analisi testi | Medio - fallback possibile |
| AWS Lambda | Business logic | Basso - infrastruttura affidabile |
| AWS DynamoDB | Database | Basso - SLA 99.99% |
| AWS Elasticsearch | Ricerca | Medio - complessita gestione |

---

## Assumptions

1. **Facebook API Stability:** Le API Facebook rimarranno disponibili e backward-compatible
2. **User Adoption:** Gli utenti sono disposti a usare Facebook per transazioni
3. **Payment via Facebook:** I pagamenti avvengono tramite Facebook Pay/Marketplace
4. **OpenAI Availability:** Il servizio OpenAI rimarra disponibile con costi accettabili
5. **Make Scalability:** Make puo gestire il volume di workflow previsto
6. **AWS Region:** Tutti i servizi AWS saranno nella stessa region (eu-south-1)
7. **Single Currency:** Il sistema opera inizialmente solo in EUR

---

## Out of Scope

1. **App mobile nativa** - L'interazione avviene tramite Facebook/Messenger
2. **Web dashboard** - Nessuna interfaccia web dedicata in questa fase
3. **Pagamenti diretti** - I pagamenti sono gestiti da Facebook, non da Quofind
4. **Supporto multi-currency** - Solo EUR nella prima versione
5. **Spedizioni e logistica** - Gestite direttamente tra compratore e venditore
6. **Dispute resolution** - Delegato a Facebook
7. **KYC/AML** - Non richiesto per cashback non convertibile
8. **Integrazione con altri marketplace** - Solo Facebook in questa fase

---

## Open Questions

1. **Rate limits Facebook:** Quali sono i limiti di chiamate API per la nostra app?
2. **Costo OpenAI:** Qual e il costo previsto per analisi AI per volume di traffico?
3. **Compliance GDPR:** Come gestire le richieste di cancellazione dati?
4. **Scadenza cashback:** Il cashback scade dopo 12 mesi - confermare policy
5. **Multi-country:** Espansione fuori Italia richiede considerazioni legali?
6. **Facebook Commerce Policy:** Siamo compliant con tutte le policy?

---

## Approval & Sign-off

### Stakeholders

| Ruolo | Nome | Responsabilita |
|-------|------|----------------|
| Product Owner | maurolarese | Decisioni prodotto, priorita |
| Tech Lead | TBD | Architettura, decisioni tecniche |
| Business Owner | TBD | Strategia, metriche business |

### Approval Status

- [ ] Product Owner
- [ ] Engineering Lead
- [ ] Design Lead
- [ ] QA Lead

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-10 | maurolarese | Initial PRD |

---

## Next Steps

### Phase 3: Architecture

Run `/architecture` to create system architecture based on these requirements.

The architecture will address:
- All functional requirements (FRs)
- All non-functional requirements (NFRs)
- Technical stack decisions
- Data models and APIs
- System components

### Phase 4: Sprint Planning

After architecture is complete, run `/sprint-planning` to:
- Break epics into detailed user stories
- Estimate story complexity
- Plan sprint iterations
- Begin implementation

---

**This document was created using BMAD Method v6 - Phase 2 (Planning)**

*To continue: Run `/workflow-status` to see your progress and next recommended workflow.*

---

## Appendix A: Requirements Traceability Matrix

| Epic ID | Epic Name | Functional Requirements | Story Count (Est.) |
|---------|-----------|-------------------------|-------------------|
| EPIC-001 | Core Listings Management | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006 | 8-10 |
| EPIC-002 | Requests & Automatic Matching | FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014 | 10-12 |
| EPIC-003 | Groups Management | FR-015, FR-016, FR-017, FR-018, FR-019, FR-020 | 8-10 |
| EPIC-004 | Cashback System | FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029 | 10-12 |
| EPIC-005 | Referral System | FR-030, FR-031, FR-032 | 4-5 |
| EPIC-006 | AI Chatbot | FR-033, FR-034, FR-035, FR-036, FR-037, FR-038, FR-039, FR-040 | 10-12 |
| EPIC-007 | Notification System | FR-041, FR-042, FR-043, FR-044 | 5-6 |
| EPIC-008 | User Authentication & Profiles | FR-045, FR-046, FR-047 | 4-5 |
| EPIC-009 | Facebook Platform Integration | FR-048, FR-049, FR-050 | 6-8 |

**Total:** 50 FRs, 9 Epics, 65-80 Stories (estimated)

---

## Appendix B: Prioritization Details

### Functional Requirements by Priority

| Priority | Count | Percentage |
|----------|-------|------------|
| Must Have | 35 | 70% |
| Should Have | 12 | 24% |
| Could Have | 3 | 6% |

### Must Have FRs (35)
FR-001, FR-002, FR-003, FR-004, FR-006, FR-007, FR-008, FR-009, FR-011, FR-012, FR-013, FR-015, FR-016, FR-017, FR-020, FR-021, FR-022, FR-023, FR-025, FR-026, FR-027, FR-033, FR-034, FR-035, FR-039, FR-041, FR-042, FR-045, FR-046, FR-047, FR-048, FR-049, FR-050

### Should Have FRs (12)
FR-005, FR-010, FR-014, FR-018, FR-019, FR-024, FR-028, FR-029, FR-036, FR-037, FR-040, FR-043, FR-044

### Could Have FRs (3)
FR-030, FR-031, FR-032, FR-038

### Non-Functional Requirements by Priority

| Priority | Count |
|----------|-------|
| Must Have | 9 |
| Should Have | 3 |

### Epic Priority

| Priority | Epics |
|----------|-------|
| Must Have | EPIC-001, EPIC-002, EPIC-003, EPIC-004, EPIC-006, EPIC-007, EPIC-008, EPIC-009 |
| Should Have | EPIC-005 |
