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
      url: 'https://www.myba-association.com/en/myba-press-and-documents.cfm',
      name: 'MYBA - Press & Documents (Official)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.myba-association.com/files/index.cfm?id=481&crypt=418013',
      name: 'MYBA - Information for Charter Yacht Captains & Crew (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.myba-association.com/files/index.cfm?id=484&crypt=945943',
      name: 'MYBA - Internal Rules & Regulations (PDF)',
      type: 'pdf',
      language: 'en'
    },
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
      url: 'https://www.ypicrew.com/the-myba-charter-agreement-download-a-free-guide-for-yacht-captains',
      name: 'YPI Crew + Hill Dickinson - Free Guide to the MYBA Charter Agreement',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://yacht-scuderia.com/wp-content/uploads/2014/12/Charter-MYBA-FR.pdf',
      name: 'MYBA Charter Agreement Specimen (French PDF)',
      type: 'pdf',
      language: 'fr'
    },
    {
      url: 'https://ionian-ray.com/wp-content/uploads/2025/04/MYBA-2025-E-Charter-DRAFT.pdf',
      name: 'MYBA 2025 E-Charter Draft (PDF)',
      type: 'pdf',
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
    },
    {
      url: 'https://www.sosyachting.com/the-smartbook',
      name: 'SOS Yachting - The VAT Smartbook 2025 (Med Charter Tax Guide)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.unicoyachting.com/industry-news/corporate-tax-for-commercial-yacht-charters-in-the-mediterranean',
      name: 'Unico Yachting - Corporate Tax for Commercial Yacht Charters in the Mediterranean',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://btmgroupci.com/news/guide-to-vat-and-taxes-on-yacht-charters-what-you-need-to-know',
      name: 'BTM Group - Guide to VAT and Taxes on Yacht Charters',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://yachthunter.com/blog/navigating-vat-in-europe-a-comprehensive-guide-for-superyacht-charter-clients',
      name: 'Yacht Hunter - Navigating VAT in Europe (Superyacht Charter)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://catamaranguru.com/buying-yacht-outside-us-tax-legal-considerations/',
      name: 'Catamaran Guru - Buying a Yacht in Europe: Tax and Legal Considerations',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://iyc.com/charter_taxes_vat/',
      name: 'IYC - Charter Taxes & VAT (Med by Country)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.praxisgroup.com/news-insights/insights/essential-criteria-for-eu-charter-yacht-operation/',
      name: 'Praxis Group - EU Charter Yacht Operation Essentials',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.der-yacht-anwalt.de/en/service-for-yacht-owners/yacht-charter-spain-12-matriculation-tax/',
      name: 'Der Yacht Anwalt - Yacht Charter Spain (Matriculation Tax, Cabotage, VAT)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://marosavat.com/vat-news/eu-challenges-italy-and-cyprus-for-their-vat-rules-on-chartering',
      name: 'Marosa VAT - EU Challenges Italy and Cyprus VAT Rules on Chartering',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.yourboatholiday.com/the-ultimate-guide-to-vat-on-yacht-charters/',
      name: 'Your Boat Holiday - Ultimate Guide to VAT on Yacht Charters (EU rates)',
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
      url: 'https://www.ilo.org/sites/default/files/wcmsp5/groups/public/%40ed_norm/%40normes/documents/publication/wcms_765083.pdf',
      name: 'ILO - Maritime Labour Convention, 2006 (as amended) (PDF)',
      type: 'pdf',
      language: 'en'
    },
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
      url: 'https://www.register-iri.com/wp-content/uploads/Angela-MLC-2006-Yachts-Monaco-v3-Compatibility-Mode.pdf',
      name: 'RMI - MLC 2006 Application to Yachts (Monaco Presentation PDF)',
      type: 'pdf',
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
      url: 'https://krmyacht.com/blog/mlc/',
      name: 'KRM Yacht - What is MLC? Maritime Labour Convention for Yacht Crew',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.boatinternational.com/yachts/luxury-yacht-advice/maritime-labour-convention-2006-the-industry-s-opposition--607',
      name: 'Boat International - MLC 2006: Industry Opposition Analysis',
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
    },
    {
      url: 'https://www.mer.gouv.fr/sites/default/files/2021-02/EN_fact%20sheet_social%20conditions%20workers%20MRE.pdf',
      name: 'France - ENIM Fact Sheet Social Conditions Workers MRE/RIF (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.mer.gouv.fr/sites/default/files/2023-09/Fiche%20EMR%20MAJ%202023%20-%2028%2009%2023_EN.pdf',
      name: 'France - Fiche EMR MAJ 2023 (RIF Crew Social Conditions) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.rif.mer.gouv.fr/social-security-of-workers-residing-in-eu-eea-a338.html?lang=en',
      name: 'France RIF - Social Security of Workers Residing in EU/EEA/Switzerland',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://oceanskies.com/guide/french-social-security-obligations-for-yacht-crew-working-onboard-yachts-flying-the-french-flag-or-residing-in-france/',
      name: 'Ocean Skies - French Social Security Obligations for Yacht Crew',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://dalpolcrewing.files.wordpress.com/2013/12/ccnl-navi-sup-151-english-version-1-aug-2013.pdf',
      name: 'Italy - CCNL Navi Sup >151 GT (National Collective Agreement) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://dadosav.files.wordpress.com/2018/01/ascoma-seafarer-legal-obligation-and-solution-january-2018.pdf',
      name: 'Italy - Seafarer Legal Obligation & Solutions (Decree 9 March 2017) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://marineaccounts.com/spanish-tax-for-yacht-crew',
      name: 'Spain - Spanish Tax for Yacht Crew (Social Security, Tax Residency)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.hfw.com/app/uploads/2024/04/004621-HFW-Comprehensively-Yachts-Dec-22.pdf',
      name: 'HFW - Regulations Applicable to Seafarers Employment Contracts on Yachts (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://cms.law/en/mco/publication/yachting-social-protection',
      name: 'CMS Monaco - Yachting & Social Protection (Crew, ENIM, Residents)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.yacht-zoo.com/news/crew-social-security-where-do-you-stand/',
      name: 'Yacht-zoo - Crew Social Security: Where Do You Stand?',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://theislander.online/2023/09/crew-life/crew-social-security-a-closer-look/',
      name: 'The Islander - Crew Social Security: A Closer Look',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.bluewateryachting.com/_uploads/broadcasts/brokerage/downloads/bluewater-crew-starting-out-guide-2020_20200421203809.pdf',
      name: 'Bluewater - Crew Starting Out Guide (Contracts, MLC) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.crewseekers.net/media/uploads/files/Yacht_Crew_Agreement.pdf',
      name: 'UK - Yacht Crew Agreement (MLC Model, Merchant Shipping Regs 2014) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.etf-europe.org/wp-content/uploads/2022/03/Social-security-rights-of-the-European-resident-seafarers_ETF-WMU-joint-report-web.pdf',
      name: 'ETF/WMU - Social Security Rights of European Resident Seafarers (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.iswan.org.uk/wp-content/uploads/The-Welfare-of-Superyacht-Crew-2.pdf',
      name: 'ISWAN - Welfare of Superyacht Crew (MLC vs Private Yachts) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://cdmo.univ-nantes.fr/medias/fichier/chaumette_1383126689258.pdf',
      name: 'France - Contentieux du Yachting (Droit Social/Fiscal) (PDF)',
      type: 'pdf',
      language: 'fr'
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
      url: 'https://www.rif.mer.gouv.fr/IMG/pdf/choose_france_with_the_rif_for_your_commercial_yacht_-_flyer_2023.pdf',
      name: 'RIF - Choose France with the RIF for your Commercial Yacht (Flyer PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.rif.mer.gouv.fr/yachts-%E2%89%A4-24-metres-lh-a387.html?lang=en',
      name: 'RIF - Yachts <= 24m (Division 241 Regulations)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.rif.mer.gouv.fr/attractive-tax-system-for-shipowners-and-seafarers-a586.html?lang=en',
      name: 'RIF - Attractive Tax System for Shipowners and Seafarers (Official)',
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
      url: 'https://www.scribd.com/document/906227738/RIF-grands-yachts-VA-web-cle56713f',
      name: 'RIF - Grands Yachts (VA) (PDF)',
      type: 'pdf',
      language: 'fr'
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
    // Monaco
    {
      url: 'https://monservicepublic.gouv.mc/en/themes/transport-and-mobility/boats-and-aircrafts/registration/how-to-register-a-boat-under-the-monegasque-flag',
      name: 'Monaco - How to Register a Boat under the Monegasque Flag (Official)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.ports-monaco.com/wp-content/uploads/2023/05/monaco-best-of-yachting-2023.pdf',
      name: 'Ports de Monaco - Monaco Best of Yachting 2023 (Registry Guide PDF)',
      type: 'pdf',
      language: 'en'
    },
    // Bahamas
    {
      url: 'https://www.bahamas.com/getting-here/boating/boat-regulations',
      name: 'Bahamas - Port Department Boat Regulations (Official)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.bahamasmaritime.com/services/yacht-registration/register-a-yacht-in-the-bahamas/',
      name: 'Bahamas Maritime Authority - Register a Yacht in The Bahamas (Official)',
      type: 'html',
      language: 'en'
    },
    // British Virgin Islands (BVI)
    {
      url: 'https://bvimaritime.vg/REGISTRATION/List-of-Jurisdictions-Eligible',
      name: 'BVI - Eligible Jurisdictions for Registration (Official)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.bvi-yacht-registration.com/bvi-yacht-registration-form.html',
      name: 'BVI - Yacht Registration Form/Guide',
      type: 'html',
      language: 'en'
    },
    // Isle of Man / Red Ensign Group
    {
      url: 'https://wwwcdn.imo.org/localresources/en/OurWork/HumanElement/Documents/rptPartyAddresses.pdf',
      name: 'IMO - Maritime Administration Contacts (Party Addresses PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.iomshipregistry.com/',
      name: 'Isle of Man Ship Registry - Official Site',
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
    },
    {
      url: 'https://monservicepublic.gouv.mc/en/themes/transport-and-mobility/boats-and-aircrafts/registration/how-to-register-a-boat-under-the-monegasque-flag',
      name: 'Monaco - How to Register a Boat Under the Monegasque Flag (Official)',
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
  ],

  // ═══════════════════════════════════════════════════════════
  // DROIT INTERNATIONAL DE LA MER / EAUX INTERNATIONALES
  // UNCLOS, COLREG, haute mer, passage innocent, Port State Control
  // ═══════════════════════════════════════════════════════════
  DROIT_MER_INTERNATIONAL: [
    // UNCLOS - Convention des Nations unies sur le droit de la mer
    {
      url: 'https://www.un.org/depts/los/convention_agreements/texts/unclos/unclos_e.pdf',
      name: 'UNCLOS - Texte complet (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.un.org/depts/los/convention_agreements/texts/unclos/part7.htm',
      name: 'UNCLOS Part VII - High Seas (Haute mer, navigation, pavillon)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.imo.org/en/MediaCentre/SecretaryGeneral/Pages/itlos.aspx',
      name: 'IMO - ITLOS & Rôle UNCLOS dans le droit de la mer',
      type: 'html',
      language: 'en'
    },
    // COLREG 1972 - Prévention des abordages
    {
      url: 'https://www.imo.org/en/ourwork/safety/pages/preventing-collisions.aspx',
      name: 'IMO - COLREG 1972 (Preventing Collisions at Sea)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.samgongustofa.is/media/log-og-reglur/COLREG-Consolidated-2018.pdf',
      name: 'COLREG Consolidated 2018 (PDF)',
      type: 'pdf',
      language: 'en'
    },
    // Eaux internationales / Haute mer
    {
      url: 'https://www.yachtbuyer.com/en/advice/what-are-international-waters',
      name: 'YachtBuyer - What Are International Waters?',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.rmg.co.uk/stories/ocean/what-un-high-seas-treaty',
      name: 'Royal Museums Greenwich - UN High Seas Treaty Explained',
      type: 'html',
      language: 'en'
    },
    // Passage innocent / Droit État côtier
    {
      url: 'https://www.rya.org.uk/boating-abroad/law-of-the-sea-and-coastal-state',
      name: 'RYA - Law of the Sea and Coastal State Rights',
      type: 'html',
      language: 'en'
    },
    // Port State Control - Mémorandum de Paris
    {
      url: 'https://parismou.org/PMoU-Procedures/Library/memorandum',
      name: 'Paris MoU - Memorandum Text',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.iaphworldports.org/n-iaph/wp-content/uploads/legal-db/A-24-PARIS-MEMORANDUM-OF-UNDERSTANDING.pdf',
      name: 'Paris MoU - Full Text (PDF IAPH)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://parismou.org/PMoU-Procedures/Lybrary/port-state-control-inspections-paris-mou',
      name: 'Paris MoU - Port State Control Inspections Guide',
      type: 'html',
      language: 'en'
    },
    // Liberté de navigation (doctrine)
    {
      url: 'https://www.iflos.org/wp-content/uploads/blanco-bazan-lecture.pdf',
      name: 'IFLOS - Freedom of Navigation Lecture (Blanco-Bazan PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.itlos.org/fileadmin/itlos/documents/statements_of_president/wolfrum/freedom_navigation_080108_eng.pdf',
      name: 'ITLOS - Freedom of Navigation: New Challenges (PDF)',
      type: 'pdf',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // PAVILLONS OFFICIELS - ÎLES MARSHALL (RMI)
  // Manning, Yacht Code, certificats
  // ═══════════════════════════════════════════════════════════
  PAVILLON_MARSHALL: [
    {
      url: 'https://www.register-iri.com/yacht/yacht-general-information/manning-crew-requirements/',
      name: 'RMI - Manning & Crew Requirements for Yachts',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.register-iri.com/maritime/vessel-registration/eligibility/',
      name: 'RMI - Vessel Registration Eligibility (Official)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.register-iri.com/wp-content/uploads/The-Marshall-Islands-Registry-Yachts-Printable-1.pdf',
      name: 'RMI - Yacht Registry Brochure (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.register-iri.com/wp-content/uploads/MI-100.pdf',
      name: 'RMI MI-100 - Vessel Registration Manual (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.register-iri.com/wp-content/uploads/MI-107.pdf',
      name: 'RMI MI-107 - Maritime Act 1990 (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.register-iri.com/wp-content/uploads/MI-118.pdf',
      name: 'RMI MI-118 - Requirements for Seafarer Certification (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.register-iri.com/wp-content/uploads/MI-103-2021.pdf',
      name: 'RMI Yacht Code MI-103 (2021, amended Aug 2023) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.officialguidetoshipregistries.com/ogsr-ship-registries-database/marshall-islands',
      name: 'Official Guide to Ship Registries - Marshall Islands',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://oceanskies.com/guide/marshall-islands-yacht-registration/',
      name: 'Ocean Skies - Marshall Islands Yacht Registration Guide',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // PAVILLONS OFFICIELS - MALTE (Commercial Yacht Code)
  // CYC 2020, CYC 2025, yachts <24m
  // ═══════════════════════════════════════════════════════════
  PAVILLON_MALTA: [
    {
      url: 'https://www.transport.gov.mt/CYC-2020.pdf-f5742',
      name: 'Malta CYC 2020 - Commercial Yacht Code (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.transport.gov.mt/COMMERCIAL-YACHT-CODE-Synopsis-of-key-elements.pdf-f2840',
      name: 'Malta CYC - Synopsis of Key Elements (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://fff-legal.com/app/uploads/2025/06/CYC-2025-1.pdf',
      name: 'Malta CYC 2025 (FFF Legal PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://piazzalegal.net/yacht-registration-malta/f/commercial-yacht-code-for-yachts-under-24-metres',
      name: 'Piazza Legal - CYC for Yachts Under 24 Metres',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.transport.gov.mt/maritime/ship-and-yacht-registry/ship-registration/registration-process-127',
      name: 'Malta - Registration Process (Transport Malta Official)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.transport.gov.mt/Merchant-Shipping-Act.pdf-f10740',
      name: 'Malta - Merchant Shipping Act (Cap 234) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.transport.gov.mt/TM-Superyacht-Brochure.pdf-f5778',
      name: 'Malta - Superyacht Brochure (Transport Malta PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.tmf-group.com/globalassets/pdfs/factsheets/malta/malta-yacht-registration-jan-2015.pdf',
      name: 'TMF Group - Malta Yacht Registration Factsheet (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.emd.com.mt/wp-content/uploads/2021/07/Registration-of-Ship-Yachts-under-Malta-Flag.pdf',
      name: 'EMD - Registration of Ships/Yachts under Malta Flag (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://griffithsassoc.com/wp-content/uploads/2019/09/Guide-to-Ship-Registration-Malta.pdf',
      name: 'Griffiths + Associates - Guide to Ship Registration Malta (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://factsheets.ccmalta.com/malta-commercial-yacht-registrations.pdf',
      name: 'CCMalta - Malta Commercial Yacht Registration (Factsheet PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://atomfs.com.mt/wp-content/uploads/2020/06/brochure_compressed.pdf',
      name: 'Malta Yachting - Structuring, Fiscality, Leasing (Brochure PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.mitekltd.com/wp-content/uploads/2023/03/mitek-brochure-bandiera-V01-EXE-1_compressed-1.pdf',
      name: 'Mitek - Commercial Yacht Registration in Malta (Brochure PDF)',
      type: 'pdf',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // PAVILLONS OFFICIELS - CAYMAN / RED ENSIGN GROUP
  // LY3, REG Yacht Code, guides pratiques
  // ═══════════════════════════════════════════════════════════
  PAVILLON_CAYMAN_REG: [
    // LY3 - Large Commercial Yacht Code
    {
      url: 'https://www.cishipping.com/sites/default/files/others/Large%20Yacht%20Code%20(LY3)%20(2012).pdf',
      name: 'LY3 - Large Commercial Yacht Code (CI Shipping PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.gov.uk/government/publications/ly3-the-large-commercial-yacht-code',
      name: 'UK MCA - LY3 Official Publication Page',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.dohle-yachts.com/wp-content/uploads/2015/12/MSN-1851-The-Large-Commercial-Yacht-Code-LY3.pdf',
      name: 'LY3 MSN 1851 (Dohle Yachts PDF)',
      type: 'pdf',
      language: 'en'
    },
    // REG Yacht Code (Red Ensign Group)
    {
      url: 'https://www.redensigngroup.org/media/yzlbtkyi/reg-yc-july-2024-edition-part-a.pdf',
      name: 'REG Yacht Code July 2024 - Part A (PDF)',
      type: 'pdf',
      language: 'en'
    },
    // Guides Cayman
    {
      url: 'https://www.stuartslaw.com/cms/document/vessel-registration-in-the-cayman-islands.pdf',
      name: "Stuart's Law - Vessel Registration in the Cayman Islands (PDF)",
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://btmgroupci.com/news/how-to-register-a-yacht-with-the-cayman-islands-shipping-registry-a-step-by-step-guide',
      name: 'BTM Group - How to Register a Yacht with Cayman Registry',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://higgsjohnson.com/wp-content/uploads/2017/11/cayman-shipping-guide.pdf',
      name: 'Higgs & Johnson - Cayman Shipping Guide (PDF)',
      type: 'pdf',
      language: 'en'
    },
    // Red Ensign Group général
    {
      url: 'https://oceanskies.com/guide/the-british-register-of-ships-the-red-ensign-group/',
      name: 'Ocean Skies - British Register of Ships & Red Ensign Group',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.superyachtnews.com/articles/masters_guide.pdf',
      name: "UK / REG - A Master's Guide to the UK Flag (Large Yacht Edition) (PDF)",
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.gov.uk/government/publications/the-yacht-masters-guide-to-the-uk-flag/a-masters-guide-to-the-uk-flag-large-yacht-edition',
      name: "UK / REG - A Master's Guide to the UK Flag (Large Yacht Edition) (GOV.UK HTML)",
      type: 'html',
      language: 'en'
    },
    
  ],

  // ═══════════════════════════════════════════════════════════
  // PAVILLON OFFICIEL - MADÈRE (MAR)
  // Registre international, guides officiels
  // ═══════════════════════════════════════════════════════════
  PAVILLON_MADERE: [
    {
      url: 'https://www.ums.pt/assets/ums_yacth2.pdf',
      name: 'Madeira (MAR) - International Ship Registry Guide for Yachts (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.ums.pt/assets/ums_ship2.pdf',
      name: 'Madeira (MAR) - Ship Registry Guide (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.ibc-madeira.com/images/pdf/en-05-DL_96_89.pdf',
      name: 'Portugal - Decree-Law 96/89 (Madeira Register) (PDF)',
      type: 'pdf',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // PAVILLON OFFICIEL - CHYPRE
  // Registre, leasing, guides
  // ═══════════════════════════════════════════════════════════
  PAVILLON_CHYPRE: [
    {
      url: 'https://kvlaw.eu/wp-content/uploads/christina/2021/02/The-Yacht-Regime.02.12.19.pdf',
      name: 'Cyprus - Yacht Regime (KV Law PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://servco.com.cy/PDF/Yacht_Registration.pdf',
      name: 'Cyprus - Yacht Registration (Servco PDF)',
      type: 'pdf',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // ÉQUIPAGE / MANNING / STCW / TRAVAIL MARITIME
  // Certificats, FAQ, flags of convenience, droit du travail
  // ═══════════════════════════════════════════════════════════
  MANNING_STCW: [
    {
      url: 'https://www.imo.org/en/ourwork/humanelement/pages/stcw-conv-link.aspx',
      name: 'IMO - STCW Convention Overview (Official)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.ics-shipping.org/publication/guidelines-on-the-imo-stcw-convention-and-code/',
      name: 'ICS - Guidelines on the IMO STCW Convention and Code',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.ics-shipping.org/resource/manila-amendments-to-the-stcw-convention-guide/',
      name: 'ICS - Manila Amendments to the STCW Convention (Guide)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.cishipping.com/system/files/resources/documents/Manning%20Policy%20Manual%20-%20Aug%202025%20Rev%2013%20(002S).pdf',
      name: 'Cayman Islands - Manning Policy Manual (PDF)',
      type: 'pdf',
      language: 'en'
    },
    // STCW / Certificats Marshall Islands
    {
      url: 'https://professionalyachttraining.com/announcements/marshall-islands-certification-faqs',
      name: 'Professional Yacht Training - Marshall Islands 350GT/500GT Certification FAQs',
      type: 'html',
      language: 'en'
    },
    // Flags of convenience / Droit du travail
    {
      url: 'https://nautilusshipping.com/news-and-insights/flag-of-convenience-understanding-vessel-registration-and-the-flags-commonly-used',
      name: 'Nautilus Shipping - Flag of Convenience Explained',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.rsijournal.eu/ARTICLES/December_2021/05.pdf',
      name: 'RSI Journal - Open Registers & European Response (Academic PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://windward.ai/glossary/flag-of-convenience/',
      name: 'Windward AI - Flag of Convenience Definition',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // GUIDES SYNTHÈSE PAVILLONS / CHOIX DE PAVILLON
  // Comparatifs, top registries, conseils
  // ═══════════════════════════════════════════════════════════
  GUIDES_PAVILLONS: [
    {
      url: 'https://www.sentientinternational.com/wp-content/uploads/2022/07/Where-Should-I-Register-My-Superyacht.pdf',
      name: 'Sentient International - Where Should I Register My Superyacht? (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.officialguidetoshipregistries.com/ogsr-ship-registries-database/malta',
      name: 'Official Guide to Ship Registries - Malta',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.officialguidetoshipregistries.com/ogsr-ship-registries-database/bahamas',
      name: 'Official Guide to Ship Registries - Bahamas',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.officialguidetoshipregistries.com/ogsr-ship-registries-database/british-virgin-islands-%28red-ensign-group-cat-1%29',
      name: 'Official Guide to Ship Registries - British Virgin Islands',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.officialguidetoshipregistries.com/ogsr-ship-registries-database/cayman-islands-%28red-ensign-group-cat-1%29',
      name: 'Official Guide to Ship Registries - Cayman Islands (Red Ensign Group Cat 1)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.officialguidetoshipregistries.com/ogsr-ship-registries-database/isle-of-man-%28red-ensign-group-cat-1%29',
      name: 'Official Guide to Ship Registries - Isle of Man (Red Ensign Group Cat 1)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.dohle-yachts.com/wp-content/uploads/2015/12/Choosing-a-Registry.pdf',
      name: 'Dohle Yachts - Choosing a Registry (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.register-iri.com/wp-content/uploads/Superyacht_Geneva_April_2012.pdf',
      name: 'RMI - Registration Choices & Practicalities: Flag State View (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://nomadcapitalist.com/expat/lifestyle/ultimate-guide-yacht-registration/',
      name: 'Nomad Capitalist - Ultimate Guide to Offshore Yacht Registration',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.yachting-pages.com/listing/registration-classification-ism',
      name: 'Yachting Pages - Registration, Classification & ISM',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://yachtownership-solutions.com/en/news/how-to-choose-a-flag-for-a-super-yacht',
      name: 'Yacht Ownership Solutions - How to Choose a Flag for a Superyacht',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://btmgroupci.com/news/top-5-countries-to-register-your-superyacht-and-why-it-matters',
      name: 'BTM Group - Top 5 Countries to Register Your Superyacht',
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
      url: 'https://www.obmagazine.media/superyacht-registration/',
      name: 'OB Magazine - Superyacht Registration Overview',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://dixcartairmarine.com/yacht-registration/',
      name: 'Dixcart Air Marine - Yacht Registration Guide (IoM, Malta, etc.)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.gov.je/SiteCollectionDocuments/Government%20and%20administration/R%20MooreStephens2015ReportJerseyShipRegistry20150401KLB.pdf',
      name: 'Moore Stephens - Jersey Ship Registry Report (2015 PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.superyachtseurope.com/legal',
      name: 'Superyachts Europe - Legal Information (Charter, Clauses)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://r.jina.ai/http://wsimg.com/ozu-06k4brr6vwcfpz0zs2dtzactac2qisuhdrm7j7qmwrzh3ycnli2c7caq2xz4cr2rn34ck8i35q9uwdd5ad6bjm12oshbspeejpmmkj4fphjx3wijpdfslicw2iz/OHS2302_Memoire_Logistique_et_transport_LINON.pdf',
      name: 'France/UK - Attractivite Pavillon Britannique Post-Brexit vs RIF (PDF via proxy)',
      type: 'html',
      language: 'fr'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // US / DELAWARE / USCG DOCUMENTATION
  // Coast Guard vessel documentation, Delaware registration
  // ═══════════════════════════════════════════════════════════
  USCG_DELAWARE: [
    {
      url: 'https://www.dco.uscg.mil/Portals/9/DCO%20Documents/NVDC/Instructions/INITIAL%20VESSEL%20DOCUMENTATION%2003-2025.pdf',
      name: 'USCG - Initial Vessel Documentation Instructions (03-2025) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.dco.uscg.mil/Portals/9/DCO%20Documents/NVDC/Instructions/FAQ%20DOCUMENTING%20A%20VESSEL%2003-2025.pdf',
      name: 'USCG - FAQ Documenting a Vessel (03-2025) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.dco.uscg.mil/Our-Organization/Assistant-Commandant-for-Prevention-Policy-CG-5P/Inspections-Compliance-CG-5PC-/National-Vessel-Documentation-Center/NVDC-Instruction-and-Forms/',
      name: 'USCG NVDC - Instructions and Forms (Official)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.mpofcinci.com/blog/complete-guide-to-uscg-documentation-standards-and-requirements-for-boats/',
      name: 'Complete Guide to USCG Documentation Standards and Requirements',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.boatus.com/products-and-services/boat-lettering/uscg-requirements',
      name: 'BoatUS - USCG Requirements (Identification, Marking)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://dnrec.delaware.gov/fish-wildlife/boating/registration/',
      name: 'Delaware DNREC - Boating Registration (Official)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://dmv.de.gov/VehicleServices/faqs/index.shtml?dc=ve_faqs_boat',
      name: 'Delaware DMV - Boat Registration & Titles FAQ',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://boat-registration.us',
      name: 'Boat Registration US - Service Site (Broker Practices)',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // GRÈCE - CHARTERS, LICENCES, RÉFORMES
  // E-Charter, TEPAI, Greek maritime legal reforms
  // ═══════════════════════════════════════════════════════════
  GRECE_CHARTER: [
    {
      url: 'https://www.stephensonharwood.com/media/2riah44v/e-charter-permission-the-digitalization-of-chartering-in-greece-april-2024.pdf',
      name: 'Stephenson Harwood - E-Charter Permission Greece (April 2024) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.roditis.eu/news/charterpermissionplus',
      name: 'Roditis - New Law for Foreign Commercial Yachts in Greece (TEPAI)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://quaynote.com/wp-content/uploads/2024/01/Elisavet-Article.pdf',
      name: 'Quaynote - Navigating Greek Maritime Legal Reforms (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.ecpy.org/web/content/36147?download=true',
      name: 'ECPY - Specified Period Charter License & VAT Rules 2024 (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.hfw.com/app/uploads/2024/04/SLR10_Greece.pdf',
      name: 'HFW - Shipping Law Review Greece (PDF)',
      type: 'pdf',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // TVA / CHARTER MED - HISTORIQUES & COMPARATIFS
  // VAT Mediterranean, Italy, Croatia, Greece, France, Spain
  // ═══════════════════════════════════════════════════════════
  TVA_CHARTER_MED: [
    {
      url: 'https://www.yachtwelfare.it/wp-content/uploads/2018/05/YW_VAT_Guide_2018_R1.pdf',
      name: 'Yacht Welfare - VAT Guide 2018 Italy (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.yachtmaster.hr/wp-content/uploads/2025/09/Icebreaker_Edition8_2025.pdf',
      name: 'Yacht Charter Magazine Icebreaker 2025 - VAT Overview (Croatia, Greece, France, Spain, Italy) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://cruisingclub.org/sites/default/files/article_files/Legalities%20Final%20&%20TOC%203.31.24.pdf',
      name: 'Cruising Club - European Legalities from North American Cruisers Perspective (VAT, Immigration) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://aebre.org/wp-content/uploads/2020/01/Report-Charter-Results-Summer-2019.pdf',
      name: 'AEBRE - Economic Impact Large Yacht Charter Spain (VAT Remarks) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'http://www.magellan.lu/sites/default/files/article_files/vat_yacht_italy.pdf',
      name: 'Italy - VAT Guide for Yachting Business (Circular 43/E 2011) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.yachtwelfare.it/wp-content/uploads/2013/07/YW_VAT_Guide_ITA.pdf',
      name: 'Italy - Fiscal Representative VAT Compliance Guide (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.iru.org/sites/default/files/2017-02/fr-cabotage-survey-spain_0.pdf',
      name: 'Spain - Cabotage Law 15/2009 (IRU Survey PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.boote-magazin.de/en/travel-and-charter/charter/spain-stricter-rules-for-charter-providers/',
      name: 'Spain - Stricter Rules for Charter Providers (Balearic Decree 21/2017)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.lrf.fr/en/your-activities/yacht-chartering-in-france/',
      name: 'France - Yacht Chartering in France (LRF Legal Overview)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.treppides.com/images/publications/newsletters/CyprusVATYachtLeasingScheme.pdf',
      name: 'Cyprus - VAT Yacht Leasing Scheme (Circular PDF)',
      type: 'pdf',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // CROATIE - CHARTER, LICENCES, REGISTRE
  // Contrats, licences, registre des yachts
  // ═══════════════════════════════════════════════════════════
  CROATIE_CHARTER: [
    {
      url: 'https://mmpi.gov.hr/UserDocsImages/arhiva/ORDINANCE%20charteru_EN_final%2019-5_17.pdf',
      name: 'Croatia - Ordinance on Charter Activities (Official PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://mmpi.gov.hr/UserDocsImages/arhiva/2005/041231-guidelines-registration.pdf',
      name: 'Croatia - Guidelines Registration Croatian Register of Yachts (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.croatia-yachting-charter.com/images/documents/acceptable-licences-sailing-croatia.pdf',
      name: 'Croatia - Acceptable Licences for Sailing (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://wiyachts.com/blog/wp-content/uploads/2022/06/WIYachts-Croatia-Sailing-requirements.pdf',
      name: 'Croatia - Sailing Requirements (Skipper/VHF) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://yachting-pro.de/wp-content/uploads/2022/08/BOATING-LICENSES-GUIDE.pdf',
      name: 'Croatia - Boating Licenses Guide (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.adriatic-sailing.hr/Downloads/general-charter-terms-bareboat-yachts.pdf',
      name: 'Croatia - General Charter Terms Bareboat (ACI PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://hdpp.hr/wp-content/uploads/2021/03/4th-AMLC-Book-of-Abstracts-Portoroz-2019.pdf',
      name: 'Croatia - Yacht Charter Party Agreement (Croatian Maritime Code) (Abstracts PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://www.croris.hr/dogadanja/dogadanje/79669',
      name: 'Croatia - Yacht Charter Party Agreement (CroRIS entry)',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // TURQUIE - BLUE CARD SYSTEM
  // Réglementation environnementale / yacht law
  // ═══════════════════════════════════════════════════════════
  TURQUIE_BLUE_CARD: [
    {
      url: 'https://r.jina.ai/http://aksoylaw.com/blue-card-system-in-turkish-yacht-law/',
      name: 'Turkey - Blue Card System in Turkish Yacht Law (Aksoy Law via proxy)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://r.jina.ai/http://www.skipperguru.ru/Files/Turkey_blue_card_regulation_rules.pdf',
      name: 'Turkey - Blue Card Regulation Rules (PDF via proxy)',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // MONTENEGRO - CLEARANCE / VIGNETTE
  // Formalités d'entrée et permis de navigation
  // ═══════════════════════════════════════════════════════════
  MONTENEGRO_CLEARANCE: [
    {
      url: 'https://www.portomontenegro.com/wp-content/uploads/2019/05/CLEARANCE-SHEET.pdf',
      name: 'Montenegro - Vignette / Cruising Permit (Porto Montenegro PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://blog.navily.com/en/wp-content/uploads/sites/3/2025/07/Check-in-procedure-in-Montenegro.pdf',
      name: 'Montenegro - Yacht Clearance Formalities (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://chartermne.com/montenegro-sailing-rules-what-to-know-2025/',
      name: 'Montenegro - Sailing Rules 2025 (Guide)',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // ALBANIE - RÉGLEMENTATION / ASSURANCE
  // STCW, TPL insurance
  // ═══════════════════════════════════════════════════════════
  ALBANIE_REGS: [
    {
      url: 'https://www.facebook.com/ALBANIA.STCW/posts/we-have-created-an-electronic-database-for-albanian-seafarers-skippers-and-yacht/',
      name: 'Albania - STCW Seafarers/Yacht Captain Database (Official FB Page)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://r.jina.ai/http://www.albsig.al/en/motor-liability-insurance-tpl/',
      name: 'Albania - TPL Insurance Overview (via proxy)',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // VISAS / SCHENGEN / IMMIGRATION ÉQUIPAGE
  // Crew visas, B1/B2, Schengen stamps
  // ═══════════════════════════════════════════════════════════
  VISAS_SCHENGEN: [
    {
      url: 'https://seazone.app/news/all-you-wanted-to-know-about-yacht-crew-visa/',
      name: 'Seazone - All About Yacht Crew Schengen Visa & B1/B2 Visa',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.pya.org/news/guidelines-for-being-stamped-in-and-out-of-the-schengen-area-for-visa-holders',
      name: 'PYA - Guidelines for Schengen Area Stamps (Visa Holders)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://theislander.online/2015/02/crew-life/superyacht-crew-visa-requirements-what-you-need-to-know/',
      name: 'The Islander - Superyacht Crew Visa Requirements (Schengen + US B1/B2)',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // ASSURANCE / P&I / OBLIGATIONS PORTUAIRES
  // Hull insurance, P&I clubs, marina requirements
  // ═══════════════════════════════════════════════════════════
  ASSURANCE_PI: [
    {
      url: 'https://www.merrimacins.com/what-are-yacht-club-insurance-requirements/',
      name: 'Merrimac Insurance - Yacht Club Insurance Requirements (Hull + P&I)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://www.theownersclub.org/handbook/insuring/types-of-insurance',
      name: 'The Owners Club - Types of Insurance (Yachts >300 GT, P&I, TPL)',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://firstpolicy.com/understanding-protection-indemnity-pi-insurance-a-guide-for-shipowners-and-operators/',
      name: 'First Policy - P&I Insurance Explained: Guide for Shipowners',
      type: 'html',
      language: 'en'
    },
    {
      url: 'https://jameshallam.co.uk/role-of-p-and-i-clubs-global-shipping/',
      name: 'James Hallam - Role of P&I Clubs in Global Shipping',
      type: 'html',
      language: 'en'
    }
  ],

  // ═══════════════════════════════════════════════════════════
  // COVID / RESTRICTIONS PORTS / MED
  // Travel restrictions, port guidelines, cruise & yachting
  // ═══════════════════════════════════════════════════════════
  COVID_PORTS: [
    {
      url: 'https://www.mooresrowlandpartners.com/wp-content/uploads/2021/03/Yachts_Ports_and_Travel_Restrictions__1616261457.pdf',
      name: 'Moore Stephens - Yachts, Ports and Travel Restrictions (COVID) (PDF)',
      type: 'pdf',
      language: 'en'
    },
    {
      url: 'https://planbleu.org/wp-content/uploads/2022/04/Guidelines_planbleu_Cruise_FINAL.pdf',
      name: 'Plan Bleu - Guidelines Cruise & Yachting Med (Environment, Ports) (PDF)',
      type: 'pdf',
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

// Log stats au chargement (ES Module compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  const stats = getReferenceStats()
  console.log('Statistiques Documents de Reference')
  console.log('-'.repeat(50))
  console.log(`Total: ${stats.totalDocuments} documents`)
  console.log(`  - PDFs: ${stats.totalPDFs}`)
  console.log(`  - Pages HTML: ${stats.totalHTML}`)
  console.log(`  - Categories: ${stats.categories}`)
  console.log('\nPar categorie:')
  for (const [cat, count] of Object.entries(stats.breakdown)) {
    console.log(`  - ${cat}: ${count} documents`)
  }
}
