/**
 * Script to create agent API credentials
 * 
 * Usage:
 *   npx tsx scripts/create-agent-key.ts --name "My Bot" --endpoints "/api/agents/query,/api/agents/search" --limit 5000
 */

import { createAgentCredential } from '../lib/agent-auth'

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const nameIdx = args.indexOf('--name')
  const endpointsIdx = args.indexOf('--endpoints')
  const limitIdx = args.indexOf('--limit')
  const descIdx = args.indexOf('--description')

  if (nameIdx === -1 || !args[nameIdx + 1]) {
    console.error('❌ Missing --name parameter')
    console.log('\nUsage:')
    console.log('  npx tsx scripts/create-agent-key.ts --name "My Bot" [options]')
    console.log('\nOptions:')
    console.log('  --name <name>              Agent name (required)')
    console.log('  --description <desc>       Agent description')
    console.log('  --endpoints <endpoints>    Comma-separated allowed endpoints (default: /api/agents/query,/api/agents/search)')
    console.log('  --limit <number>           Daily rate limit (default: 1000)')
    console.log('\nExample:')
    console.log('  npx tsx scripts/create-agent-key.ts --name "Production Bot" --description "Main chatbot" --limit 5000')
    process.exit(1)
  }

  const agentName = args[nameIdx + 1]
  const agentDescription = descIdx !== -1 ? args[descIdx + 1] : undefined
  const allowedEndpoints = endpointsIdx !== -1 
    ? args[endpointsIdx + 1].split(',').map(e => e.trim())
    : ['/api/agents/query', '/api/agents/search']
  const maxRequestsPerDay = limitIdx !== -1 
    ? parseInt(args[limitIdx + 1])
    : 1000

  console.log('\n📋 Creating agent credential...\n')
  console.log(`Name: ${agentName}`)
  console.log(`Description: ${agentDescription || 'N/A'}`)
  console.log(`Allowed Endpoints: ${allowedEndpoints.join(', ')}`)
  console.log(`Rate Limit: ${maxRequestsPerDay} requests/day`)
  console.log('')

  try {
    const result = await createAgentCredential({
      agentName,
      agentDescription,
      allowedEndpoints,
      maxRequestsPerDay,
      createdBy: 'CLI Script'
    })

    if (!result) {
      console.error('❌ Failed to create credential')
      process.exit(1)
    }

    console.log('✅ Agent credential created successfully!\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  SAVE THIS API KEY - IT WILL NOT BE SHOWN AGAIN')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log(`API Key: ${result.apiKey}`)
    console.log(`Credential ID: ${result.credentialId}\n`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('📝 Next steps:')
    console.log(`   1. Store this API key securely (e.g., .env file)`)
    console.log(`   2. Test with: curl -H "Authorization: Bearer ${result.apiKey}" https://your-domain.com/api/agents/query`)
    console.log('   3. See API_AGENTS.md for full documentation\n')

  } catch (error) {
    console.error('❌ Error creating credential:', error)
    process.exit(1)
  }
}

main()
