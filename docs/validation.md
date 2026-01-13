# Validation & Tests

## Smoke test
```bash
API_BASE=http://localhost:3000 \
PDF_PATH=/path/to/sample.pdf \
./scripts/supabase_smoke_test.sh
```

## Checks manuels
- Upload PDF: 200 + documentId
- Search: resultats non vides
- Signed URL: URL valide et telechargeable
- Chat: reponse + citations
- RGPD delete: suppression effective

## Perf
- Requete search < 100ms (objectif)
- Generation reponse acceptable < 3s pour documents limits
