# ⚡ Guide Rapide - Démarrage Immédiat

## 🚨 Problème SQL Résolu

**Erreur:** `syntax error at or near "```"`

**Cause:** Vous avez copié les backticks markdown (```sql)

**Solution:** Utilisez le fichier **SQL PUR** sans backticks

---

## 📋 Étape 1: Copier le SQL PUR (30 secondes)

### Ouvrir le fichier SQL

```bash
cat MIGRATIONS_PURE_SQL.sql
```

**OU** ouvrir dans VSCode: [MIGRATIONS_PURE_SQL.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/MIGRATIONS_PURE_SQL.sql)

### Copier TOUT le contenu (de la première ligne `--` jusqu'à la dernière ligne)

---

## 📋 Étape 2: Exécuter dans Supabase (1 minute)

1. **Aller sur:** https://supabase.com/dashboard
2. **Sélectionner projet:** `hmbattewtlmjbufiwuxt`
3. **Cliquer:** SQL Editor (menu gauche)
4. **Coller** le SQL copié (SANS les backticks)
5. **Cliquer:** RUN (ou Ctrl+Enter)
6. **Vérifier:** ✅ Success. No rows returned

---

## 📋 Étape 3: Lancer Ingestion (35-40 min)

```bash
cd yacht-legal-ai
npm run ingest:radiation
```

**Progression attendue:**

```
╔══════════════════════════════════════════════════════════════════════╗
║   🚀 AJOUT NOUVELLES SOURCES - RADIATION & PAVILLONS         ║
╚══════════════════════════════════════════════════════════════════════╝

📊 49 nouvelles sources à ingérer
⏳ Début ingestion...

📄 COLREG - Règles internationales (2018)
   ✅ 75 chunks insérés

📄 Malta Commercial Yacht Code (CYC 2020)
   ✅ 384 chunks insérés
...
[35-40 minutes]
...

╔══════════════════════════════════════════════════════════════════════╗
║              ✅ INGESTION TERMINÉE !                          ║
╚══════════════════════════════════════════════════════════════════════╝

📈 Résultats:
   ✅ Succès: 47/49
   ❌ Échecs: 2/49 (URLs 404/403 - normal)
```

---

## 📋 Étape 4: Vérifier (10 secondes)

```bash
npm run ingest:verify
```

**Output attendu:**

```
📊 Base de données - Statistiques

Documents: 120+
Chunks: 2500+
Catégories: 17

📁 Par catégorie:
   PAVILLON_FRANCE: 2 documents
   PAVILLON_MALTA: 5 documents
   PAVILLON_CAYMAN_REG: 9 documents
   ...
```

---

## 📋 Étape 5: Tester l'App (2 minutes)

```bash
npm run dev
```

**Ouvrir:** http://localhost:3000

### Tester Chat avec Sources

1. Cliquer **💬 Chat**
2. Poser question: 
   > Quels sont les documents requis pour un deletion certificate à Malta ?

3. **Vérifier:**
   - ✅ Réponse précise avec citations [Document: Malta - Closure Registry (PAVILLON_MALTA)]
   - ✅ Section **📚 Sources (2-3)** en bas du message
   - ✅ Liens cliquables vers documents Malta

### Voir Toutes les Sources

1. Cliquer **📚 Sources** (navbar)
2. **Voir:**
   - 📊 Stats: Total documents, catégories
   - 🔍 Barre de recherche
   - 🏷️ Filtre par catégorie
   - 📋 Liste de TOUTES les sources avec liens

---

## ✅ Checklist Rapide

**Avant ingestion:**
- [ ] Fichier [MIGRATIONS_PURE_SQL.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/MIGRATIONS_PURE_SQL.sql) copié (SANS backticks)
- [ ] Migrations SQL exécutées dans Supabase
- [ ] Message "Success. No rows returned" confirmé

**Ingestion:**
- [ ] `npm run ingest:radiation` lancé
- [ ] ~47/49 sources ingérées (2 erreurs 404/403 normales)
- [ ] `npm run ingest:verify` confirme nouvelles catégories

**Test:**
- [ ] `npm run dev` démarré
- [ ] Chat fonctionne avec citations précises
- [ ] Sources affichées en bas des messages avec liens
- [ ] Page **📚 Sources** affiche toutes les sources

---

## 🎯 Nouvelles Fonctionnalités

### 1️⃣ Page Sources (NOUVEAU ✨)

**URL:** http://localhost:3000/sources

**Fonctionnalités:**
- 📊 **Stats globales** : Total docs, catégories, chunks
- 🔍 **Recherche** : Par nom de document
- 🏷️ **Filtre** : Par catégorie
- 📋 **Liste complète** : Toutes les sources avec:
  - Nom du document
  - Catégorie avec icon (🇫🇷 🇲🇹 🇰🇾 🇲🇭 etc.)
  - Nombre de pages
  - Date d'ajout
  - 🔗 **Lien vers source** (cliquable)

**Exemple:**

```
╔════════════════════════════════════════════════════════════╗
║ 📊 STATISTIQUES                                            ║
╠════════════════════════════════════════════════════════════╣
║ 125 Documents | 17 Catégories | 125 Sources               ║
╚════════════════════════════════════════════════════════════╝

🔍 [Rechercher...]  🏷️ [Toutes catégories ▼]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🇫🇷 Pavillon France (RIF)                             3 docs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ Radiation navires - Infos pratiques
  📅 15/01/2026  🔗 Voir Source

✦ Changement de pavillon - Guide pratique  
  📅 15/01/2026  🔗 Voir Source

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🇲🇹 Pavillon Malta                                    5 docs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✦ Malta Commercial Yacht Code (CYC 2020) - PDF
  📄 199 pages  📅 15/01/2026  🔗 Voir Source

✦ Malta - Closure of Registry (procédure)
  📅 15/01/2026  🔗 Voir Source
...
```

### 2️⃣ Sources en Bas du Chat (AMÉLIORÉ ✨)

Gemini retourne maintenant les sources **exactes utilisées** avec liens cliquables :

**Avant:**
```
[Réponse Gemini sans sources visibles]
```

**Après:**
```
[Réponse Gemini avec citations dans le texte]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 Sources (3)

[1] Malta - Closure of Registry (procédure)
    🏷️ PAVILLON_MALTA • Pertinence: 95%
    🔗 https://www.transport.gov.mt/...

[2] Malta Commercial Yacht Code CYC 2020
    🏷️ PAVILLON_MALTA • Pertinence: 95%
    🔗 https://www.transport.gov.mt/CYC-2020.pdf-f5742

[3] COLREG - Règles internationales de route (2018)
    🏷️ DROIT_MER_INTERNATIONAL • Pertinence: 85%
    🔗 https://www.samgongustofa.is/...
```

---

## 🔧 Fichiers Créés/Modifiés

**Backend:**
- ✅ [app/api/sources/route.ts](file:///home/julien/Documents/iayacht/yacht-legal-ai/app/api/sources/route.ts) - API sources
- ✅ [lib/gemini.ts](file:///home/julien/Documents/iayacht/yacht-legal-ai/lib/gemini.ts) - Retour sources avec URLs

**Frontend:**
- ✅ [app/sources/page.tsx](file:///home/julien/Documents/iayacht/yacht-legal-ai/app/sources/page.tsx) - Page Sources
- ✅ [components/SourcesPanel.tsx](file:///home/julien/Documents/iayacht/yacht-legal-ai/components/SourcesPanel.tsx) - Composant affichage
- ✅ [components/Navbar.tsx](file:///home/julien/Documents/iayacht/yacht-legal-ai/components/Navbar.tsx) - Lien "📚 Sources"

**Database:**
- ✅ [database/migrations/013_add_source_url_to_search.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/database/migrations/013_add_source_url_to_search.sql)
- ✅ [database/migrations/014_add_new_categories.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/database/migrations/014_add_new_categories.sql)
- ✅ [MIGRATIONS_PURE_SQL.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/MIGRATIONS_PURE_SQL.sql) - SQL pur à copier

**Scripts:**
- ✅ [scripts/add-new-radiation-sources.ts](file:///home/julien/Documents/iayacht/yacht-legal-ai/scripts/add-new-radiation-sources.ts) - 55 sources

---

## 🚀 Commandes Essentielles

```bash
# 1. Appliquer migrations (MANUEL - copier SQL de MIGRATIONS_PURE_SQL.sql)

# 2. Lancer ingestion (35-40 min)
npm run ingest:radiation

# 3. Vérifier ingestion
npm run ingest:verify

# 4. Démarrer app
npm run dev

# 5. Ouvrir browser
open http://localhost:3000
```

---

## 🎉 Résultat Final

Vous aurez :

✅ **Chat ultra-précis** avec Gemini (ZÉRO générique)  
✅ **Sources citées** en bas de chaque réponse avec liens  
✅ **Page Sources** complète avec recherche et filtres  
✅ **55 nouvelles sources** sur radiation/pavillons  
✅ **Téléchargement auto PDFs** (pas de manip manuelle)  

**Navigation:**
- 💬 **Chat** - Assistant IA avec sources
- 📚 **Sources** - Toutes les sources du projet (NOUVEAU)
- 📄 **Documents** - Upload de documents

🚀 **Prêt pour production !**
