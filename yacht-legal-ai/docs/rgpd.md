# RGPD - Conformite

## Principes
- Logging complet des actions sensibles via `audit_logs`.
- Conservation des logs pendant 2 ans (fonction SQL).
- Droit a l'oubli via `/api/delete-user-data`.

## Donnees traitees
- Documents PDF legal
- Chunks de texte + embeddings
- Conversations (messages)

## Consentement
- Bandeau de consentement (UI) + logs d'acceptation.

## Suppression
- Suppression des documents et conversations associes a un userId.
- Conservation des audit logs (obligation legale).

## Notes
- Pas d'auth phase 1: les donnees peuvent etre anonymes.
- En phase multi-tenant, activer `uploaded_by` et appliquer RLS stricte.
