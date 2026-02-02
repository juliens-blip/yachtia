# 🚀 Démarrage Rapide - 3 Étapes

## 1️⃣ Appliquer les migrations Supabase (5 min)

**Via Supabase Dashboard:**
1. Aller sur https://supabase.com/dashboard/project/hmbattewtlmjbufiwuxt
2. Menu **SQL Editor** (icône base de données à gauche)
3. Copier-coller et exécuter **DANS L'ORDRE** les 7 fichiers SQL:

```bash
# Fichiers à exécuter (copier le contenu et exécuter un par un):
yacht-legal-ai/database/migrations/001_enable_pgvector.sql
yacht-legal-ai/database/migrations/002_create_documents.sql
yacht-legal-ai/database/migrations/003_create_document_chunks.sql
yacht-legal-ai/database/migrations/004_create_conversations.sql
yacht-legal-ai/database/migrations/005_create_audit_logs.sql
yacht-legal-ai/database/migrations/006_create_search_function.sql
yacht-legal-ai/database/migrations/007_create_rls_policies.sql
```

**Important:** Exécuter UN fichier à la fois, dans l'ordre numérique (001 → 007)

---

## 2️⃣ Démarrer l'application (1 min)

```bash
cd /home/julien/Documents/iayacht/yacht-legal-ai
npm run dev
```

**Ouvrir dans votre navigateur:** http://localhost:3000

Vous devriez voir la page d'accueil du Yacht Legal AI Assistant.

---

## 3️⃣ Tester avec un PDF maritime (5 min)

### Uploader un document:
1. Aller sur http://localhost:3000/documents
2. Glisser-déposer un PDF maritime (MYBA, AML, MLC, etc.)
3. Attendre l'upload + vectorisation (~30 secondes)

### Poser une question:
1. Aller sur http://localhost:3000/chat
2. Poser une question (exemples ci-dessous)
3. L'IA va chercher dans vos documents et répondre avec sources

**Exemples de questions:**
- "Qu'est-ce que la MYBA ?"
- "Quelles sont les obligations AML pour les yachts ?"
- "Résume les clauses importantes du contrat MYBA"
- "Quels sont les pavillons les plus utilisés pour les superyachts ?"

---

## ✅ C'est tout !

Votre assistant juridique IA est maintenant opérationnel.

**Note:** Si vous n'avez pas de PDF maritime sous la main, vous pouvez:
- Télécharger un contrat MYBA type: https://www.myba.com
- Utiliser n'importe quel PDF de test pour commencer

---

## 🐛 Problèmes fréquents

### "Migration échoue dans Supabase"
→ Vérifier que vous exécutez les fichiers **dans l'ordre** (001 → 007)

### "npm run dev ne démarre pas"
→ Vérifier que `.env.local` existe avec les bonnes clés API

### "Upload PDF échoue"
→ Vérifier que les migrations Supabase sont appliquées (Étape 1)

### "Chat ne répond pas"
→ Vérifier la clé API Gemini dans `.env.local`

---

## 📞 Besoin d'aide ?

Consulter:
- [PROJET_TERMINE.md](file:///home/julien/Documents/iayacht/PROJET_TERMINE.md) - Documentation complète
- [claude.md](file:///home/julien/Documents/iayacht/claude.md) - Mémoire du projet
- [yacht-legal-ai/README.md](file:///home/julien/Documents/iayacht/yacht-legal-ai/README.md) - Documentation technique
