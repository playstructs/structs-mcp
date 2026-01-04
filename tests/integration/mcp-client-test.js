#!/usr/bin/env node
/**
 * MCP Client Integration Test Suite
 * 
 * Comprehensive integration tests for MCP server functionality
 * Tests resource access, tool discovery, and tool execution
 */

import http from 'http';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp';
const TIMEOUT = 10000; // 10 seconds

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function makeRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.setEncoding('utf8');
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 200)}`));
        } else {
          try {
            const json = JSON.parse(body);
            resolve(json);
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${body.substring(0, 200)}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

async function test(name, testFn) {
  process.stdout.write(`\n🧪 ${name}... `);
  try {
    await testFn();
    console.log('✅ PASSED');
    testResults.passed++;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    testResults.failed++;
    testResults.errors.push({ test: name, error: error.message });
  }
}

async function testServerHealth() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/mcp',
      method: 'GET',
      headers: { 'Accept': 'text/event-stream' },
      timeout: 2000
    }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 405) {
        // 200 = SSE stream, 405 = method not allowed (but server is up)
        resolve();
      } else {
        reject(new Error(`Unexpected status: ${res.statusCode}`));
      }
      res.destroy();
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      resolve(); // Timeout is OK for SSE
    });
    req.end();
  });
}

async function runTests() {
  console.log('🚀 MCP Client Integration Test Suite');
  console.log('='.repeat(60));
  console.log(`Server URL: ${MCP_SERVER_URL}`);
  console.log('='.repeat(60));

  // Test A: Resource Access
  console.log('\n📚 A. Resource Access Tests');
  
  await test('A1: List Resources', async () => {
    const response = await makeRequest('resources/list', {});
    if (!response.result || !response.result.resources) {
      throw new Error('Missing resources in response');
    }
    if (!Array.isArray(response.result.resources)) {
      throw new Error('Resources is not an array');
    }
    if (response.result.resources.length === 0) {
      throw new Error('No resources found');
    }
  });

  await test('A2: Read Schema Resource', async () => {
    // First get list of resources
    const listResponse = await makeRequest('resources/list', {});
    const schemaResource = listResponse.result.resources.find(
      r => r.uri && r.uri.startsWith('structs://schemas/')
    );
    
    if (!schemaResource) {
      throw new Error('No schema resources found');
    }

    const readResponse = await makeRequest('resources/read', {
      uri: schemaResource.uri
    });
    
    if (!readResponse.result || !readResponse.result.contents) {
      throw new Error('Missing contents in resource response');
    }
  });

  // Test B: Tool Discovery
  console.log('\n🔧 B. Tool Discovery Tests');
  
  await test('B1: List Tools', async () => {
    const response = await makeRequest('tools/list', {});
    if (!response.result || !response.result.tools) {
      throw new Error('Missing tools in response');
    }
    if (!Array.isArray(response.result.tools)) {
      throw new Error('Tools is not an array');
    }
    if (response.result.tools.length === 0) {
      throw new Error('No tools found');
    }
  });

  await test('B2: Verify Tool Schemas', async () => {
    const response = await makeRequest('tools/list', {});
    const tools = response.result.tools;
    
    for (const tool of tools.slice(0, 5)) { // Check first 5 tools
      if (!tool.name) throw new Error(`Tool missing name: ${JSON.stringify(tool)}`);
      if (!tool.description) throw new Error(`Tool ${tool.name} missing description`);
      if (!tool.inputSchema) throw new Error(`Tool ${tool.name} missing inputSchema`);
    }
  });

  // Test C: Query Tools
  console.log('\n🔍 C. Query Tool Execution Tests');
  
  await test('C1: List Players', async () => {
    const response = await makeRequest('tools/call', {
      name: 'structs_list_players',
      arguments: {}
    });
    
    if (!response.result) {
      throw new Error('Missing result in response');
    }
    if (response.error) {
      throw new Error(`Tool error: ${JSON.stringify(response.error)}`);
    }
  });

  await test('C2: Query Player (if available)', async () => {
    // First try to get a player list
    const listResponse = await makeRequest('tools/call', {
      name: 'structs_list_players',
      arguments: {}
    });
    
    // If we have players, query one
    if (listResponse.result && listResponse.result.players && listResponse.result.players.length > 0) {
      const playerId = listResponse.result.players[0].id;
      const queryResponse = await makeRequest('tools/call', {
        name: 'structs_query_player',
        arguments: { player_id: playerId }
      });
      
      if (queryResponse.error) {
        throw new Error(`Query error: ${JSON.stringify(queryResponse.error)}`);
      }
    } else {
      // Skip if no players available
      console.log('(skipped - no players available)');
    }
  });

  await test('C3: List Struct Types', async () => {
    const response = await makeRequest('tools/call', {
      name: 'structs_list_struct_types',
      arguments: {}
    });
    
    if (response.error) {
      throw new Error(`Tool error: ${JSON.stringify(response.error)}`);
    }
    if (!response.result) {
      throw new Error('Missing result in response');
    }
  });

  // Test D: Calculation Tools
  console.log('\n📊 D. Calculation Tool Tests');
  
  await test('D1: Calculate Power', async () => {
    const response = await makeRequest('tools/call', {
      name: 'structs_calculate_power',
      arguments: {
        alpha_matter: 100,
        generator_type: 'reactor'
      }
    });
    
    if (response.error) {
      throw new Error(`Calculation error: ${JSON.stringify(response.error)}`);
    }
    if (!response.result || typeof response.result.power !== 'number') {
      throw new Error('Invalid power calculation result');
    }
  });

  await test('D2: Calculate Cost', async () => {
    const response = await makeRequest('tools/call', {
      name: 'structs_calculate_cost',
      arguments: {
        struct_type: 14,
        location_type: 'planet'
      }
    });
    
    if (response.error) {
      throw new Error(`Calculation error: ${JSON.stringify(response.error)}`);
    }
    if (!response.result) {
      throw new Error('Missing result in response');
    }
  });

  // Test E: Validation Tools
  console.log('\n✅ E. Validation Tool Tests');
  
  await test('E1: Validate Entity ID', async () => {
    const response = await makeRequest('tools/call', {
      name: 'structs_validate_entity_id',
      arguments: {
        id: '1-11'
      }
    });
    
    if (response.error) {
      throw new Error(`Validation error: ${JSON.stringify(response.error)}`);
    }
    if (response.result.valid !== true) {
      throw new Error('Valid entity ID was marked as invalid');
    }
  });

  await test('E2: Validate Invalid Entity ID', async () => {
    const response = await makeRequest('tools/call', {
      name: 'structs_validate_entity_id',
      arguments: {
        id: 'invalid-id'
      }
    });
    
    if (response.error) {
      throw new Error(`Validation error: ${JSON.stringify(response.error)}`);
    }
    if (response.result.valid !== false) {
      throw new Error('Invalid entity ID was marked as valid');
    }
  });

  // Test F: Error Handling
  console.log('\n⚠️  F. Error Handling Tests');
  
  await test('F1: Invalid Tool Name', async () => {
    const response = await makeRequest('tools/call', {
      name: 'nonexistent_tool',
      arguments: {}
    });
    
    if (!response.error) {
      throw new Error('Expected error for invalid tool name');
    }
  });

  await test('F2: Invalid Parameters', async () => {
    const response = await makeRequest('tools/call', {
      name: 'structs_query_player',
      arguments: {
        player_id: '' // Invalid empty ID
      }
    });
    
    // Should either return error or validation error
    if (!response.error && !response.result?.error) {
      throw new Error('Expected error for invalid parameters');
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`   ${test}: ${error}`);
    });
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Check server health first
testServerHealth()
  .then(() => {
    console.log('✅ Server is running');
    return runTests();
  })
  .catch((error) => {
    console.error('\n❌ Server is not running or not accessible');
    console.error(`   Error: ${error.message}`);
    console.error('\n💡 Start the server with:');
    console.error('   MCP_TRANSPORT=http npm start');
    process.exit(1);
  });

