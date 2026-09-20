#!/usr/bin/env node
/**
 * Test script for MCP Hive
 */

const { MCPHive } = require('./server');

async function testHive() {
  const hive = new MCPHive();
  
  console.log('=== MCP Hive Test ===\n');
  
  // Test 1: Get model for task
  console.log('Test 1: Model routing');
  const contentModel = hive.getModelForTask('content_writing');
  console.log(`  Content writing -> ${contentModel.model_id}`);
  
  const codeModel = hive.getModelForTask('coding');
  console.log(`  Coding -> ${codeModel.model_id}`);
  
  const marketModel = hive.getModelForTask('market_analysis');
  console.log(`  Market analysis -> ${marketModel.model_id}\n`);
  
  // Test 2: Stats
  console.log('Test 2: Hive stats');
  const stats = hive.getStats();
  console.log(`  Total requests: ${stats.total_requests}`);
  console.log(`  Models available: ${stats.models_available}`);
  console.log(`  Routing rules: ${stats.routing_rules}\n`);
  
  // Test 3: Available models
  console.log('Test 3: Available models');
  Object.keys(hive.models).forEach(name => {
    const model = hive.models[name];
    console.log(`  ${name}: ${model.capabilities.join(', ')} (${model.cost})`);
  });
  
  console.log('\n=== All tests passed ===');
}

testHive().catch(console.error);
