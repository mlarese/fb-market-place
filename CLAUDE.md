# CLAUDE.md - Regole per Claude Code

Questo file contiene regole e convenzioni che Claude deve seguire quando lavora su questo progetto.

---

## Make (Integromat) Blueprints

**Salva sempre i blueprint nella cartella del progetto:** `make-scenarios/`

Quando crei un **blueprint JSON per Make**:

1. **Aggiungi note verbose a ogni modulo** nel campo `metadata.designer.notes.text`
2. Ogni nota deve spiegare:
   - **Cosa fa** il modulo
   - **Configurazioni richieste** (API keys, URL, etc.)
   - **Input attesi** con esempi di variabili (es: `{{1.entry[].changes[].value.message}}`)
   - **Output prodotti** con i campi accessibili
   - **Errori possibili** e come gestirli
3. Aggiungi anche una **nota generale allo scenario** in `metadata.notes` con:
   - Descrizione generale del flusso
   - Requisiti e prerequisiti
   - Costi stimati
   - Note di manutenzione

### Esempio struttura nota modulo:
```json
"metadata": {
    "designer": {
        "x": 0,
        "y": 0,
        "notes": {
            "text": "NOME MODULO\n\nDescrizione di cosa fa.\n\n⚠️ CONFIGURAZIONE RICHIESTA:\n- Dettagli config\n\nINPUT:\n- {{variabile}}: descrizione\n\nOUTPUT:\n- {{risultato}}: descrizione\n\nERRORI POSSIBILI:\n- Errore: soluzione",
            "position": "bottom"
        }
    }
}
```

---

## AWS SAM Template

- **Non includere CloudWatch Alarms e Dashboard** - disattivati per risparmio costi
- Regione di default: `eu-west-1` (Irlanda)
- Runtime Lambda: `nodejs22.x` (LTS)
- Usare `ARM64` per Lambda (20% più economico)
- Usare `PAY_PER_REQUEST` per DynamoDB

---

## Convenzioni Generali

- Lingua documentazione: Italiano
- LLM preferito: Google Gemini (economico, modulo HTTP in Make)
- Workflow orchestration: Make (non n8n)
