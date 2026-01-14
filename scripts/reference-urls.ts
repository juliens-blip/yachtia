/**
 * Liste complète des URLs de documents de référence
 * pour l'ingestion automatique dans le système RAG
 */

export interface ReferenceDocument {
  url: string
  name: string
  type: 'pdf' | 'html'
  language?: 'fr' | 'en'
}

export const REFERENCE_DOCS: Record<string, ReferenceDocument[]> = {
  // ═══════════════════════════════════════════════════════════
  // MYBA (Mediterranean Yacht Brokers Association)
  // Contrats, guidelines, explications
  // ═══════════════════════════════════════════════════════════
  MYBA: [
    {
      url: 'https://www.charteranddreams.com/wp-content/uploads/2024/06/SPECIMEN-MYBA-2017-E-Contract-original-V9.1b.pdf',
      name: 'MYBA 2017 E-Contract Specimen (V9.1b)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://ionian-ray.com/wp-content/uploads/2024/01/SPECIMEN-MYBA-E-Contract-original.pdf',
      name: 'MYBA E-Contract Specimen (Ionian Ray 2024)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.barcosyeventos.com/wp-content/uploads/2016/03/Contrato-MYBA.pdf',
      name: 'MYBA Charter Agreement Specimen (Barcos y Eventos)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://bomiship.com/upload_data/site_files/specim.pdf',
      name: 'MYBA Charter Agreement Specimen (BomiShip)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://static1.squarespace.com/static/52aa006ce4b0324b1f609fec/t/5de7e2f2c09a8973f9bc155d/1575478012659/SAMPLE+MYBA+E-Contract+Endless+Blue.pdf',
      name: 'SAMPLE MYBA E-Contract (Endless Blue)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://europe-yachts.com/wp-content/uploads/2020/02/Original_MYBA_with_Special_Conditions-min.pdf',
      name: 'MYBA Charter Agreement + Special Conditions (Europe Yachts)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.212-yachts.com/myba-yacht-charter-explained/',
      name: '212 Yachts - Why choose a MYBA Yacht Broker?',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.yourboatholiday.com/the-complete-guide-to-the-myba-e-contract/',
      name: 'Your Boat Holiday - Complete Guide to MYBA E-Contract',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.windwardyachts.com/blog/what-is-myba-charter-agreement/',
      name: 'Windward Yachts - What is the MYBA Charter Agreement?',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://camperandnicholsons.com/magazine/mybacharteragreement',
      name: 'Camper & Nicholsons - The MYBA Charter Agreement Explained',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://mallorcamarinegroup.com/myba-charter-contract/',
      name: 'Mallorca Marine Group - Pros and Cons of MYBA Charter Contract',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.superyachtnews.com/opinion/when-the-myba-charter-contract-evolves',
      name: 'SuperyachtNews - When the MYBA Charter Contract Evolves',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // YET (Yacht Engaged in Trade)
  // Scheme fiscal, regulations, tax updates
  // ═══════════════════════════════════════════════════════════
  YET: [
    {
      url: 'https://www.charteranddreams.com/en/news-and-inspiration/what-is-the-yet-scheme-and-why-it-matters-for-superyacht-charter-in-europe',
      name: 'Charter & Dreams - What is the YET Scheme?',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.yourboatholiday.com/understanding-the-yacht-engaged-in-trade-yet-scheme/',
      name: 'Your Boat Holiday - Understanding the YET Scheme',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://catamaranguru.com/2025-yacht-tax-shake-up-new-rules-and-costs-for-global-cruisers/',
      name: 'Catamaran Guru - 2025 Yacht Tax Shake-Up (YET, TA)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://yachtownership-solutions.com/en/news/superyacht-2025-events-moving-on-from-the-shows-to-the-best-ownership-structuring',
      name: 'Yachtownership Solutions - Superyacht 2025 Events (YET, TA)',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // AML / KYC (Anti-Money Laundering / Know Your Customer)
  // Conformité brokers, obligations France/Monaco/EU
  // ═══════════════════════════════════════════════════════════
  AML_KYC: [
    {
      url: 'https://rosemont-int.com/en/article/news/aml-laws-covering-yacht-brokers-in-the-eu-and-other-key-jurisdictions',
      name: 'Rosemont - AML Laws Covering Yacht Brokers in EU',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://rosemont-int.com/en/article/news/new-aml-obligations-for-yacht-brokers-real-estate-developers-car-and-jet-brokers-in-france',
      name: 'Rosemont - New AML Obligations for Yacht Brokers in France (2025)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://yachtownership-solutions.com/en/news/compliance-obligations-in-the-yachting-industry-requirements-in-monaco-france-and-the-eu',
      name: 'Yachtownership Solutions - Compliance Obligations in Yachting (Monaco/France/EU)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://yachtownership-solutions.com/en/news/amsf-sanctions-2025-critical-lessons-for-monaco-yacht-brokers',
      name: 'Yachtownership Solutions - AMSF Sanctions 2025 (Monaco Yacht Brokers)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://alpassurances.fr/en/article/enhanced-kyc-obligations-what-brokers-need-to-know-2025',
      name: 'ALP Assurances - Enhanced KYC Requirements for Brokers (2025)',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // MLC 2006 (Maritime Labour Convention)
  // Crew rights, working conditions, payroll, visas
  // ═══════════════════════════════════════════════════════════
  MLC_2006: [
    {
      url: 'https://oceanskies.com/guide/maritime-labour-convention-2006-mlc-2006-yachts/',
      name: 'Ocean Skies - Maritime Labour Convention 2006 & Yachts',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.yachting-pages.com/articles/a-crew-guide-to-the-maritime-labour-convention.html',
      name: 'Yachting Pages - Crew Guide to MLC 2006',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.transport.gov.mt/maritime/ship-and-yacht-registry/superyacht-registration/mlc-2006-stcw-157',
      name: 'Malta - MLC 2006 & STCW (Superyacht Registration)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.info.boaton.fr/comprendre-la-maritime-labour-convention?lang=en',
      name: 'BoatOn - Understand and Apply the Maritime Labour Convention',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.itfglobal.org/sites/default/files/node/news/files/20200616SeafarersRightsGuidance.pdf',
      name: 'ITF - Short Guide to Rights Under MLC (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.twwyachts.com/yacht-crew/mlc-2006/',
      name: 'TWW Yachts - Yacht Work Regulations - MLC 2006',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.yachtbuyer.com/en/advice/yacht-crew-payroll',
      name: 'YachtBuyer - Yacht Crew Payroll',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.yachting-pages.com/articles/superyacht-law-for-yacht-crew-training-contracts-and-visas.html',
      name: 'Yachting Pages - Superyacht Law for Crew (Training, Contracts, Visas)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://yachtiecareers.com/yacht-crew-visas-to-work-on-yachts-in-europe/',
      name: 'YachtieCareers - Yacht Crew Visas to Work in Europe',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // PAVILLONS / REGISTRES (Flag Registration)
  // Cayman, Marshall, Malta, IoM, RIF France
  // ═══════════════════════════════════════════════════════════
  PAVILLONS: [
    {
      url: 'https://www.yachter.fr/en/laws-orders-regulations/discover-the-r-i-f-registre-international-francais/',
      name: 'The Yachter - RIF (Registre International Français)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://martylegal.com/register-at-the-rif-the-french-international-register/',
      name: 'Marty Legal - Register at the RIF',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.yachting-pages.com/articles/french-government-announces-tighter-regulations-for-yacht-owners-and-crew.html',
      name: 'Yachting Pages - French Government Tighter Regulations (Owners & Crew)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://blog.captnboat.com/en/seamen/how-can-i-work-in-france-with-a-rya-yachtmaster-offshore-certificate/',
      name: 'CaptnBoat - Work in France with RYA Yachtmaster Offshore',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://yachtownership-solutions.com/en/yacht-registration/current-flag-trends-for-yachts',
      name: 'Yachtownership Solutions - Current Flag Trends for Yachts',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.edmiston.com/superyacht-classification-registration-yacht-flags-guide/',
      name: 'Edmiston - Superyacht Classification, Registration & Yacht Flags Guide',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://btmgroupci.com/news/top-5-countries-to-register-your-superyacht-and-why-it-matters',
      name: 'BTM Group - Top 5 Countries to Register Your Superyacht (Cayman, Marshall, Malta, BVI, IoM)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.yachting-pages.com/articles/yacht-registration-choosing-the-right-flag-state.html',
      name: 'Yachting Pages - Yacht Registration: Choosing the Right Flag State',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://oceantimemarine.com/blog/2017/06/18/how-to-choose-a-flag-of-convenience-for-a-super-yacht/',
      name: 'Ocean Time Marine - How to Choose a Flag of Convenience',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.superyachtinvestor.com/opinion/choosing-the-right-yacht-register-203/',
      name: 'Superyacht Investor - Choosing the Right Yacht Register',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.agplaw.com/top-10-jurisdictions-for-ship-registration/',
      name: 'AGPLAW - Top 10 Jurisdictions for Ship Registration',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.obmagazine.media/the-smart-choice/',
      name: 'OB Magazine - Superyacht Flag Registration & Paris MoU Inspections',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // DROIT SOCIAL / CREW LAW
  // Monaco, EU, choice of applicable law
  // ═══════════════════════════════════════════════════════════
  DROIT_SOCIAL: [
    {
      url: 'https://cms.law/en/mco/publication/yachting-choice-of-labour-law-and-social-security-for-the-crew-a-strategic-issue-for-shipowners',
      name: 'CMS Monaco - Yachting: Choice of Labour Law & Social Security for Crew',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://cms.law/en/mco/global-reach/europe/monaco/expertise/employment-pensions/seafarers-law',
      name: 'CMS Monaco - Seafarers Law (Monaco Code de la mer)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.eesc.europa.eu/en/our-work/opinions-information-reports/opinions/revision-directive-compliance-flag-state-requirements',
      name: 'EESC - Revision of Directive on Compliance with Flag State Requirements',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // IA / AUTOMATISATION / RESPONSABILITÉ LÉGALE
  // RGPD, automated decision-making, disclaimers
  // ═══════════════════════════════════════════════════════════
  IA_RGPD: [
    {
      url: 'https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/dealing-citizens/are-there-restrictions-use-automated-decision-making-and-profiling_en',
      name: 'European Commission - Restrictions on Automated Decision-Making (GDPR)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/automated-decision-making-and-profiling/what-does-the-uk-gdpr-say-about-automated-decision-making-and-profiling/',
      name: 'ICO (UK) - Automated Decision-Making and Profiling',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://resourcehub.bakermckenzie.com/en/resources/global-data-and-cyber-handbook/emea/eu/topics/artificial-intelligence-profiling-and-automated-decision-making',
      name: 'Baker McKenzie - AI, Profiling and Automated Decision Making (EU)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.europeanlawinstitute.eu/fileadmin/user_upload/p_eli/Publications/ELI_Innovation_Paper_on_Guiding_Principles_for_ADM_in_the_EU.pdf',
      name: 'ELI - Guiding Principles for Automated Decision-Making in the EU (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.medialaws.eu/the-rise-of-automated-decision-making-and-its-legal-framework/',
      name: 'Medialaws - The Rise of Automated Decision-Making',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.abmlawservices.com/ai-disclaimer',
      name: 'ABM Law Services - AI Disclaimer (Example)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://danielrosslawfirm.com/2025/07/28/ai-and-contracts-why-you-need-waiver-and-limitation-of-liability-provisions-for-ai-tools/',
      name: 'Daniel Ross Law Firm - AI Contracts: Waivers & Limitation of Liability',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.holdingredlich.com/using-ai-in-your-business-risks-and-liabilities-to-consider',
      name: 'Holding Redlich - Using AI in Business: Risks and Liabilities',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.consultancy.uk/news/40403/three-hidden-risks-of-seeking-legal-advice-from-ai-tools',
      name: 'Consultancy.uk - Hidden Risks of Seeking Legal Advice from AI Tools',
      type: 'html',
      language: 'en'
    }
  ]
}

// Statistiques
export function getReferenceStats() {
  let totalDocs = 0
  let totalPDFs = 0
  let totalHTML = 0
  
  for (const [category, docs] of Object.entries(REFERENCE_DOCS)) {
    totalDocs += docs.length
    totalPDFs += docs.filter(d => d.type === 'pdf').length
    totalHTML += docs.filter(d => d.type === 'html').length
  }
  
  return {
    totalDocuments: totalDocs,
    totalPDFs,
    totalHTML,
    categories: Object.keys(REFERENCE_DOCS).length,
    breakdown: Object.fromEntries(
      Object.entries(REFERENCE_DOCS).map(([cat, docs]) => [cat, docs.length])
    )
  }
}

// Log stats au chargement
if (require.main === module) {
  const stats = getReferenceStats()
  console.log('📊 Statistiques Documents de Référence')
  console.log('─'.repeat(50))
  console.log(`Total: ${stats.totalDocuments} documents`)
  console.log(`  - PDFs: ${stats.totalPDFs}`)
  console.log(`  - Pages HTML: ${stats.totalHTML}`)
  console.log(`  - Catégories: ${stats.categories}`)
  console.log('\nPar catégorie:')
  for (const [cat, count] of Object.entries(stats.breakdown)) {
    console.log(`  - ${cat}: ${count} documents`)
  }
}
