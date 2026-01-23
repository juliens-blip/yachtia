/**
 * Ajout des nouvelles sources sur radiation/changement de pavillon
 * et sources juridiques internationales
 * 
 * Usage: npm run add-radiation-sources
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { supabaseAdmin } from '../lib/supabase'
import { scrapeWebPage, downloadPDF } from '../lib/web-scraper'
import { extractTextFromPDF } from '../lib/pdf-parser'
import { chunkText } from '../lib/chunker'
import { generateEmbedding } from '../lib/gemini'

// Token Supabase Access
const SUPABASE_ACCESS_TOKEN = 'sbp_v0_0f9c3ce6b2e3a6c8b33155c24f997990dffe3426'

interface NewSource {
  url: string
  name: string
  type: 'pdf' | 'html'
  category: string
  language?: 'fr' | 'en'
  description: string
}

const NEW_SOURCES: NewSource[] = [
  // ═══════════════════════════════════════════════════════════
  // FRANCE (Pavillon FR / RIF)
  // ═══════════════════════════════════════════════════════════
  {
    url: 'https://www.marine-administration.fr/radiation',
    name: 'Radiation navires - Infos pratiques (France)',
    type: 'html',
    category: 'PAVILLON_FRANCE',
    language: 'fr',
    description: 'Pièces, taxes, charges, procédure de radiation pavillon français'
  },
  {
    url: 'https://bateaux-services.com/changement-de-pavillon/',
    name: 'Changement de pavillon - Guide pratique',
    type: 'html',
    category: 'PAVILLON_FRANCE',
    language: 'fr',
    description: 'Certificat de radiation, TVA, aspects pratiques changement pavillon'
  },
  {
    url: 'https://www.village-justice.com/articles/ceder-acquerir-navire-sous-pavillon-etranger-points-attention,54530.html',
    name: 'Céder/acquérir navire sous pavillon étranger - Points d\'attention',
    type: 'html',
    category: 'PAVILLON_FRANCE',
    language: 'fr',
    description: 'Aspects juridiques cession/acquisition navire pavillon étranger'
  },

  // ═══════════════════════════════════════════════════════════
  // DROIT INTERNATIONAL DE LA MER
  // ═══════════════════════════════════════════════════════════
  {
    url: 'https://www.un.org/depts/los/convention_agreements/texts/unclos/unclos_e.pdf',
    name: 'UNCLOS - Convention des Nations Unies sur le droit de la mer',
    type: 'pdf',
    category: 'DROIT_MER_INTERNATIONAL',
    language: 'en',
    description: 'Base juridique internationale du droit de la mer'
  },
  {
    url: 'https://www.samgongustofa.is/media/log-og-reglur/COLREG-Consolidated-2018.pdf',
    name: 'COLREG - Règles internationales de route (2018 Consolidated)',
    type: 'pdf',
    category: 'DROIT_MER_INTERNATIONAL',
    language: 'en',
    description: 'Convention on International Regulations for Preventing Collisions at Sea'
  },
  {
    url: 'https://parismou.org/PMoU-Procedures/Library/memorandum',
    name: 'Paris MoU - Port State Control',
    type: 'html',
    category: 'DROIT_MER_INTERNATIONAL',
    language: 'en',
    description: 'Memorandum Paris MoU contrôle État du port'
  },

  // ═══════════════════════════════════════════════════════════
  // MALTE (Malta Ship & Yacht Registry)
  // ═══════════════════════════════════════════════════════════
  {
    url: 'https://www.transport.gov.mt/maritime/ship-and-yacht-registry/ship-registration/closure-of-registry-130',
    name: 'Malta - Closure of Registry (procédure)',
    type: 'html',
    category: 'PAVILLON_MALTA',
    language: 'en',
    description: 'Procédure fermeture registre, deletion certificate Malta'
  },
  {
    url: 'https://www.transport.gov.mt/maritime/small-ships/small-ship-registration/voluntary-termination-of-registration-of-a-small-ship-',
    name: 'Malta - Termination registration small ships (≤24m)',
    type: 'html',
    category: 'PAVILLON_MALTA',
    language: 'en',
    description: 'Radiation volontaire navires ≤24m Malta'
  },
  {
    url: 'https://www.transport.gov.mt/CYC-2020.pdf-f5742',
    name: 'Malta Commercial Yacht Code (CYC 2020) - PDF',
    type: 'pdf',
    category: 'PAVILLON_MALTA',
    language: 'en',
    description: 'Commercial Yacht Code 2020 officiel Malta'
  },
  {
    url: 'https://www.transport.gov.mt/COMMERCIAL-YACHT-CODE-Synopsis-of-key-elements.pdf-f2840',
    name: 'Malta CYC - Synopsis éléments clés',
    type: 'pdf',
    category: 'PAVILLON_MALTA',
    language: 'en',
    description: 'Résumé des points clés CYC Malta'
  },
  {
    url: 'https://fff-legal.com/app/uploads/2025/06/CYC-2025-1.pdf',
    name: 'Malta Commercial Yacht Code (CYC 2025)',
    type: 'pdf',
    category: 'PAVILLON_MALTA',
    language: 'en',
    description: 'CYC 2025 mise à jour Malta'
  },
  {
    url: 'https://piazzalegal.net/yacht-registration-malta/f/commercial-yacht-code-for-yachts-under-24-metres',
    name: 'Malta CYC yachts <24m - Guide Piazza Legal',
    type: 'html',
    category: 'PAVILLON_MALTA',
    language: 'en',
    description: 'Commercial Yacht Code yachts moins de 24 mètres'
  },

  // ═══════════════════════════════════════════════════════════
  // ÎLES CAÏMANS (Red Ensign)
  // ═══════════════════════════════════════════════════════════
  {
    url: 'https://www.cishipping.com/sites/default/files/resources/CHECKLIST%20Delete%20a%20Vessel%20July2016.pdf',
    name: 'Cayman Islands - Deletion of Vessel Checklist (2016)',
    type: 'pdf',
    category: 'PAVILLON_CAYMAN_REG',
    language: 'en',
    description: 'Checklist radiation navire Caïmans 2016'
  },
  {
    url: 'https://www.cishipping.com/sites/default/files/Checklist%20Deletion%20of%20a%20Vessel%20FINAL%2025NOV2020_0.pdf',
    name: 'Cayman Islands - Deletion of Vessel Checklist (2020)',
    type: 'pdf',
    category: 'PAVILLON_CAYMAN_REG',
    language: 'en',
    description: 'Checklist radiation navire Caïmans 2020 (mis à jour)'
  },
  {
    url: 'http://www.mantamaritime.com/downloads/flag_news/ci/registration_regs.pdf',
    name: 'Cayman - Merchant Shipping Registration Regulations 2002',
    type: 'pdf',
    category: 'PAVILLON_CAYMAN_REG',
    language: 'en',
    description: 'Réglementation registration/termination Caïmans'
  },
  {
    url: 'https://higgsjohnson.com/wp-content/uploads/2017/11/cayman-shipping-guide.pdf',
    name: 'Cayman Shipping Guide (Higgs Johnson)',
    type: 'pdf',
    category: 'PAVILLON_CAYMAN_REG',
    language: 'en',
    description: 'Guide registration, mortgages, deletion Caïmans'
  },
  {
    url: 'https://www.cishipping.com/sites/default/files/others/Large%20Yacht%20Code%20(LY3)%20(2012).pdf',
    name: 'Large Yacht Code (LY3) - 2012',
    type: 'pdf',
    category: 'PAVILLON_CAYMAN_REG',
    language: 'en',
    description: 'Code LY3 yachts de grande taille'
  },
  {
    url: 'https://www.gov.uk/government/publications/ly3-the-large-commercial-yacht-code',
    name: 'LY3 - The Large Commercial Yacht Code (UK Gov)',
    type: 'html',
    category: 'PAVILLON_CAYMAN_REG',
    language: 'en',
    description: 'Large Commercial Yacht Code officiel UK'
  },
  {
    url: 'https://www.redensigngroup.org/media/yzlbtkyi/reg-yc-july-2024-edition-part-a.pdf',
    name: 'REG Yacht Code - Part A (July 2024)',
    type: 'pdf',
    category: 'PAVILLON_CAYMAN_REG',
    language: 'en',
    description: 'Red Ensign Group Yacht Code 2024 Part A'
  },
  {
    url: 'https://www.cayman-boat-registration.com',
    name: 'Cayman Boat & Yacht Registration - Guide complet',
    type: 'html',
    category: 'PAVILLON_CAYMAN_REG',
    language: 'en',
    description: 'Liste docs registration Caïmans (deletion certificate requis)'
  },
  {
    url: 'https://www.b2bhub.ltd/yacht-registration/cayman-islands',
    name: 'B2B Hub - Cayman Yacht Registration Guide',
    type: 'html',
    category: 'PAVILLON_CAYMAN_REG',
    language: 'en',
    description: 'Guide B2B registration Caïmans (deletion certificate)'
  },
  {
    url: 'https://hmscaymanltd.com/blog/a-beginner-s-guide-to-yacht-registration-in-the-cayman-islands',
    name: 'HMS Cayman - Beginner\'s Guide Yacht Registration',
    type: 'html',
    category: 'PAVILLON_CAYMAN_REG',
    language: 'en',
    description: 'Guide débutant registration yachts Caïmans'
  },

  // ═══════════════════════════════════════════════════════════
  // ÎLES MARSHALL (RMI)
  // ═══════════════════════════════════════════════════════════
  {
    url: 'https://faolex.fao.org/docs/pdf/mas67219.pdf',
    name: 'Marshall Islands - Documentation & Identification of Vessels Act (47 MIRC)',
    type: 'pdf',
    category: 'PAVILLON_MARSHALL',
    language: 'en',
    description: 'Loi RMI termination, surrender, cancellation, deletion from registry'
  },
  {
    url: 'https://www.register-iri.com/wp-content/uploads/MI-100.pdf',
    name: 'Marshall Islands - MI-100 Requirements for Vessels',
    type: 'pdf',
    category: 'PAVILLON_MARSHALL',
    language: 'en',
    description: 'MI-100 termination/certificate of cancellation, bareboat charter'
  },
  {
    url: 'https://www.register-iri.com/yacht/yacht-general-information/manning-crew-requirements/',
    name: 'Marshall Islands - Manning & Crew Requirements Yachts',
    type: 'html',
    category: 'PAVILLON_MARSHALL',
    language: 'en',
    description: 'Exigences manning yachts RMI (MSMC, STCW)'
  },
  {
    url: 'https://www.classnk.or.jp/hp/pdf/activities/statutory/isps/flag/marshall/isps_marshall_mi-118_202401.pdf',
    name: 'Marshall Islands - MI-118 Seafarer Certification (2024)',
    type: 'pdf',
    category: 'PAVILLON_MARSHALL',
    language: 'en',
    description: 'MI-118 certification seafarer requirements yachts RMI'
  },
  {
    url: 'https://www.cdinfo.lr.org/cdi/information/documents/countryfiles/Marshall%20Islands/MI_103_2021_amended.pdf',
    name: 'Marshall Islands - MI-103 (2021 Amended)',
    type: 'pdf',
    category: 'PAVILLON_MARSHALL',
    language: 'en',
    description: 'MI-103 document RMI mis à jour 2021'
  },
  {
    url: 'https://www.register-iri.com/wp-content/uploads/The-Marshall-Islands-Registry-Yachts-Printable-1.pdf',
    name: 'Marshall Islands Registry - Yachts Brochure',
    type: 'pdf',
    category: 'PAVILLON_MARSHALL',
    language: 'en',
    description: 'Brochure officielle RMI Registry Yachts'
  },
  {
    url: 'https://www.officialguidetoshipregistries.com/ogsr-ship-registries-database/marshall-islands',
    name: 'Official Guide to Ship Registries - Marshall Islands',
    type: 'html',
    category: 'PAVILLON_MARSHALL',
    language: 'en',
    description: 'Fiche détaillée registre Marshall Islands'
  },
  {
    url: 'https://yacht-flag.com/marshall-islands/',
    name: 'Yacht Flag Services - Marshall Islands Registration',
    type: 'html',
    category: 'PAVILLON_MARSHALL',
    language: 'en',
    description: 'Deletion certificate et certificate of no liens Marshall Islands'
  },

  // ═══════════════════════════════════════════════════════════
  // BRITISH VIRGIN ISLANDS (BVI)
  // ═══════════════════════════════════════════════════════════
  {
    url: 'https://www.boatdelete.com',
    name: 'BoatDelete - BVI Closure Registry Guide',
    type: 'html',
    category: 'PAVILLON_BVI',
    language: 'en',
    description: 'Docs closure transcript BVI registry (Bill of Sale, good standing)'
  },
  {
    url: 'https://www.bvi.gov.vg/department-faqs/57?page=1',
    name: 'BVI Shipping Registry - FAQ Officiel',
    type: 'html',
    category: 'PAVILLON_BVI',
    language: 'en',
    description: 'FAQ BVI deletion certificate requis du registre précédent'
  },
  {
    url: 'https://quijano.com/the-british-virgin-islands-shipping-registry/',
    name: 'Quijano & Associates - BVI Shipping Registry Guide',
    type: 'html',
    category: 'PAVILLON_BVI',
    language: 'en',
    description: 'Article juridique BVI Shipping Registry (deletion certificate)'
  },

  // ═══════════════════════════════════════════════════════════
  // ISLE OF MAN (IoM)
  // ═══════════════════════════════════════════════════════════
  {
    url: 'https://oceanskies.com/guide/the-british-register-of-ships-the-red-ensign-group/',
    name: 'Ocean Skies - British Register & Red Ensign Group',
    type: 'html',
    category: 'PAVILLON_IOM',
    language: 'en',
    description: 'Fonctionnement registres UK (IoM, BVI, Cayman, Bermudes)'
  },
  {
    url: 'https://dixcartairmarine.com/yacht-registration/',
    name: 'Dixcart - Yacht Registration Guide (IoM, Malta)',
    type: 'html',
    category: 'PAVILLON_IOM',
    language: 'en',
    description: 'Avantages yacht registration IoM et Malta'
  },

  // ═══════════════════════════════════════════════════════════
  // MADÈRE / PORTUGAL (MAR)
  // ═══════════════════════════════════════════════════════════
  {
    url: 'https://www.ibc-madeira.com/fr/ship-registration/yachts-et-societes-affretement.html',
    name: 'Madère - Yachts et sociétés d\'affrètement (FR)',
    type: 'html',
    category: 'PAVILLON_MADERE',
    language: 'fr',
    description: 'Yachts commerciaux MIBC Madère, conditions éligibilité, fiscal'
  },
  {
    url: 'https://madeira-management.com/about-madeira/mar-international-shipping-register/',
    name: 'Madère - MAR International Shipping Register',
    type: 'html',
    category: 'PAVILLON_MADERE',
    language: 'en',
    description: 'Présentation MAR registre international Madère'
  },
  {
    url: 'https://madeira-management.com/services/mar-ship-yacht-registration/',
    name: 'Madère - Ship & Yacht Registration Services',
    type: 'html',
    category: 'PAVILLON_MADERE',
    language: 'en',
    description: 'Services registration navires et yachts Madère'
  },
  {
    url: 'https://madeiracompany.com/pt/madeiras-international-shipping-register/',
    name: 'Madeira Company - International Shipping Register',
    type: 'html',
    category: 'PAVILLON_MADERE',
    language: 'en',
    description: 'Informations MAR Madeira International Shipping Register'
  },
  {
    url: 'https://www.newco.pro/en/set-up-a-company/setting-up-a-company-in-madeira/registration-of-ships-in-madeira',
    name: 'NEWCO - Registration of Ships in Madeira',
    type: 'html',
    category: 'PAVILLON_MADERE',
    language: 'en',
    description: 'Décret-loi 192/2003, types yachts admissibles, conditions Madère'
  },
  {
    url: 'https://mcs.pt/the-international-shipping-register-of-madeira/',
    name: 'MCS - International Shipping Register of Madeira',
    type: 'html',
    category: 'PAVILLON_MADERE',
    language: 'en',
    description: 'Présentation MCS registre international Madère'
  },
  {
    url: 'https://www.dgrm.pt/documents/20143/87524/C_46_EN+(1).pdf',
    name: 'Portugal DGRM - Circular n°46 (RO, procédures)',
    type: 'pdf',
    category: 'PAVILLON_MADERE',
    language: 'en',
    description: 'Circulaire technique DGRM n°46 Recognized Organizations'
  },

  // ═══════════════════════════════════════════════════════════
  // GUIDES COMPARATIFS / GÉNÉRAUX
  // ═══════════════════════════════════════════════════════════
  {
    url: 'https://www.obmagazine.media/superyacht-registries/',
    name: 'OB Magazine - Superyacht Registries Overview',
    type: 'html',
    category: 'GUIDES_PAVILLONS',
    language: 'en',
    description: 'Comparatif registres superyachts (incluant Monaco)'
  },
  {
    url: 'https://www.obmagazine.media/superyacht-registration/',
    name: 'OB Magazine - Superyacht Registration Guide',
    type: 'html',
    category: 'GUIDES_PAVILLONS',
    language: 'en',
    description: 'Guide registration superyachts différents pavillons'
  },
  {
    url: 'https://www.manyas.net/en/practice-areas/deletion-of-ship-registration-abroad/',
    name: 'Manyas Law - Deletion of Ship Registration Abroad',
    type: 'html',
    category: 'GUIDES_PAVILLONS',
    language: 'en',
    description: 'Guide juridique radiation navire à l\'étranger'
  },
  {
    url: 'https://www.agplaw.com/top-10-jurisdictions-for-ship-registration/',
    name: 'AGP Law - Top 10 Jurisdictions for Ship Registration',
    type: 'html',
    category: 'GUIDES_PAVILLONS',
    language: 'en',
    description: 'Top 10 juridictions registration navires'
  },
  {
    url: 'https://btmgroupci.com/news/top-5-countries-to-register-your-superyacht-and-why-it-matters',
    name: 'BTM Group - Top 5 Superyacht Flags',
    type: 'html',
    category: 'GUIDES_PAVILLONS',
    language: 'en',
    description: 'Top 5 pavillons superyachts et critères choix'
  },
  {
    url: 'https://yachtownership-solutions.com/en/yacht-registration/current-flag-trends-for-yachts',
    name: 'Yacht Ownership Solutions - Current Flag Trends',
    type: 'html',
    category: 'GUIDES_PAVILLONS',
    language: 'en',
    description: 'Tendances actuelles pavillons yachts'
  },
  {
    url: 'https://qwealthreport.com/business-abroad/what-are-the-best-countries-to-register-a-yacht/',
    name: 'QWealth Report - Best Countries to Register a Yacht',
    type: 'html',
    category: 'GUIDES_PAVILLONS',
    language: 'en',
    description: 'Meilleurs pays registration yacht'
  }
]

// Stats
let totalProcessed = 0
let totalSuccess = 0
let totalFailed = 0
const startTime = Date.now()

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function ingestSource(source: NewSource): Promise<boolean> {
  try {
    console.log(`\n📄 ${source.name}`)
    console.log(`   URL: ${source.url}`)
    console.log(`   Catégorie: ${source.category}`)
    
    // Download/Scrape
    let text: string
    let pages: number | undefined
    
    if (source.type === 'pdf') {
      const buffer = await downloadPDF(source.url)
      const parsed = await extractTextFromPDF(buffer)
      text = parsed.text
      pages = parsed.pages
      console.log(`   📖 ${pages} pages extraites`)
    } else {
      text = await scrapeWebPage(source.url)
      console.log(`   📰 Page HTML extraite`)
    }
    
    if (!text || text.length < 100) {
      throw new Error('Texte trop court (< 100 chars)')
    }
    
    console.log(`   ✂️  ${text.length} caractères`)
    
    // Insert document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        name: source.name,
        category: source.category,
        pages: pages || null,
        file_url: source.url,
        source_url: source.url,
        is_public: true,
        metadata: {
          source: source.url,
          type: source.type,
          language: source.language || 'en',
          description: source.description,
          ingested_at: new Date().toISOString(),
          access_token: SUPABASE_ACCESS_TOKEN
        }
      })
      .select('id')
      .single()
    
    if (docError || !document) {
      throw new Error(`Erreur insertion doc: ${docError?.message}`)
    }
    
    console.log(`   💾 Document ID: ${document.id}`)
    
    // Chunk
    const chunks = chunkText(text, 500, 200)
    console.log(`   ✂️  ${chunks.length} chunks`)
    
    if (chunks.length === 0) {
      console.warn(`   ⚠️  Aucun chunk créé`)
      return true
    }
    
    // Generate embeddings (batch 10)
    const chunkRecords: Array<{
      document_id: string
      chunk_index: number
      chunk_text: string
      chunk_vector: number[]
      page_number: number | null
      token_count: number
    }> = []
    
    const BATCH_SIZE = 10
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      console.log(`   🔢 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`)
      
      const embeddings = await Promise.all(
        batch.map(chunk => generateEmbedding(chunk.text))
      )
      
      batch.forEach((chunk, j) => {
        chunkRecords.push({
          document_id: document.id,
          chunk_index: i + j,
          chunk_text: chunk.text,
          chunk_vector: embeddings[j],
          page_number: null,
          token_count: chunk.tokenCount
        })
      })
      
      // Delay between batches
      if (i + BATCH_SIZE < chunks.length) {
        await sleep(2000)
      }
    }
    
    // Insert chunks
    const { error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .insert(chunkRecords)
    
    if (chunksError) {
      throw new Error(`Erreur insertion chunks: ${chunksError.message}`)
    }
    
    console.log(`   ✅ ${chunkRecords.length} chunks insérés`)
    totalSuccess++
    return true
    
  } catch (error) {
    console.error(`   ❌ Erreur:`, error instanceof Error ? error.message : error)
    totalFailed++
    return false
  } finally {
    totalProcessed++
  }
}

async function main() {
  console.log('╔' + '═'.repeat(70) + '╗')
  console.log('║' + ' '.repeat(70) + '║')
  console.log('║   🚀 AJOUT NOUVELLES SOURCES - RADIATION & PAVILLONS         ║')
  console.log('║' + ' '.repeat(70) + '║')
  console.log('╚' + '═'.repeat(70) + '╝\n')
  
  console.log(`📊 ${NEW_SOURCES.length} nouvelles sources à ingérer\n`)
  
  // Group by category
  const byCategory: Record<string, NewSource[]> = {}
  NEW_SOURCES.forEach(src => {
    if (!byCategory[src.category]) byCategory[src.category] = []
    byCategory[src.category].push(src)
  })
  
  console.log('📁 Par catégorie:')
  Object.entries(byCategory).forEach(([cat, sources]) => {
    console.log(`   ${cat}: ${sources.length}`)
  })
  
  console.log('\n⏳ Début ingestion...\n')
  
  // Process all sources
  for (const source of NEW_SOURCES) {
    await ingestSource(source)
    await sleep(1000) // Delay between docs
  }
  
  // Final report
  const durationMinutes = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  
  console.log('\n\n' + '╔' + '═'.repeat(70) + '╗')
  console.log('║' + ' '.repeat(70) + '║')
  console.log('║              ✅ INGESTION TERMINÉE !                          ║')
  console.log('║' + ' '.repeat(70) + '║')
  console.log('╚' + '═'.repeat(70) + '╝\n')
  
  console.log('📈 Résultats:')
  console.log(`   ✅ Succès: ${totalSuccess}/${totalProcessed}`)
  console.log(`   ❌ Échecs: ${totalFailed}/${totalProcessed}`)
  console.log(`   ⏱️  Durée: ${durationMinutes} minutes`)
  console.log(`   🔑 Token Supabase: ${SUPABASE_ACCESS_TOKEN.substring(0, 20)}...`)
  
  if (totalFailed > 0) {
    console.warn(`\n⚠️  ${totalFailed} erreurs. Vérifiez les logs ci-dessus.`)
  } else {
    console.log('\n🎉 Toutes les sources ont été ingérées avec succès!')
  }
}

main().catch(error => {
  console.error('\n💥 ERREUR FATALE:', error)
  process.exit(1)
})
