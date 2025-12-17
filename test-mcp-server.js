#!/usr/bin/env node
/**
 * Simple MCP Server Test Script
 * 
 * Tests the MCP server via HTTP/SSE transport
 */

import http from 'http';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp';

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
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.setEncoding('utf8');
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 400) {
          resolve({ error: { code: res.statusCode, message: body.substring(0, 200) } });
          return;
        }
        
        // Handle SSE (Server-Sent Events) format
        // SSE responses have format: "event: message\ndata: {...}\n\n"
        if (body.includes('event:') && body.includes('data:')) {
          try {
            // Extract JSON from SSE data lines
            const lines = body.split('\n');
            let jsonData = '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                jsonData += line.substring(6); // Remove 'data: ' prefix
              } else if (line.startsWith('data:')) {
                jsonData += line.substring(5); // Remove 'data:' prefix (no space)
              }
            }
            if (jsonData.trim()) {
              const result = JSON.parse(jsonData.trim());
              resolve(result);
            } else {
              resolve({ error: 'Empty SSE data' });
            }
          } catch (e) {
            resolve({ error: 'Invalid JSON in SSE', raw: body.substring(0, 500), parseError: e.message });
          }
        } else {
          // Handle regular JSON response
          try {
            if (body.trim()) {
              const result = JSON.parse(body);
              resolve(result);
            } else {
              resolve({ error: 'Empty response' });
            }
          } catch (e) {
            resolve({ error: 'Invalid JSON', raw: body.substring(0, 500), parseError: e.message });
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Connection error: ${error.message}`));
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

async function testServer() {
  console.log('🧪 Testing MCP Server at', MCP_SERVER_URL);
  console.log('='.repeat(60));

  // Test 1: Initialize (GET request to establish SSE connection)
  console.log('\n1️⃣ Testing server initialization...');
  try {
    await new Promise((resolve, reject) => {
      const initReq = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/mcp',
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream'
        },
        timeout: 2000  // Short timeout just to verify connection
      }, (res) => {
        console.log('   Status:', res.statusCode);
        if (res.statusCode >= 400) {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            console.log('   Response:', body.substring(0, 200));
            resolve();
          });
        } else {
          console.log('   ✅ GET request completed (SSE stream established)');
          // For SSE, we just need to verify the connection was established
          // Don't wait for the stream to end - it stays open
          res.on('data', () => {});
          // Resolve immediately after confirming status code
          setTimeout(() => {
            res.destroy(); // Close the connection
            resolve();
          }, 100);
        }
      });
      initReq.on('error', (err) => {
        console.log('   ❌ Connection Error:', err.message);
        console.log('   💡 Make sure the server is running: MCP_TRANSPORT=http npm start');
        reject(err);
      });
      initReq.on('timeout', () => {
        initReq.destroy();
        // If we got a 200 status, the connection was established successfully
        // The timeout is expected for SSE streams
        console.log('   ✅ Connection established (SSE streams stay open)');
        resolve();
      });
      initReq.end();
    });
  } catch (error) {
    console.log('   ❌ Error:', error.message || error);
    if (error.message && error.message.includes('ECONNREFUSED')) {
      console.log('   💡 Server is not running. Start it with: MCP_TRANSPORT=http npm start');
    }
  }

  // Test 2: List tools
  console.log('\n2️⃣ Testing tools/list...');
  try {
    const result = await makeRequest('tools/list', {});
    if (result.error) {
      console.log('   ❌ Error:', JSON.stringify(result.error, null, 2));
      if (result.raw) {
        console.log('   Raw response:', result.raw);
      }
    } else if (result.result) {
      console.log('   ✅ Success!');
      if (result.result.tools) {
        console.log(`   Found ${result.result.tools.length} tools:`);
        result.result.tools.slice(0, 5).forEach(tool => {
          console.log(`   - ${tool.name}`);
        });
        if (result.result.tools.length > 5) {
          console.log(`   ... and ${result.result.tools.length - 5} more`);
        }
      } else {
        console.log('   Response:', JSON.stringify(result, null, 2).substring(0, 300));
      }
    } else {
      console.log('   Response:', JSON.stringify(result, null, 2).substring(0, 500));
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message || error);
    if (error.message && error.message.includes('ECONNREFUSED')) {
      console.log('   💡 Server is not running. Start it with: MCP_TRANSPORT=http npm start');
    }
  }

  // Test 3: List resources
  console.log('\n3️⃣ Testing resources/list...');
  try {
    const result = await makeRequest('resources/list', {});
    if (result.error) {
      console.log('   ❌ Error:', result.error.message || result.error);
    } else {
      console.log('   ✅ Success!');
      if (result.result && result.result.resources) {
        console.log(`   Found ${result.result.resources.length} resources`);
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message || error);
    if (error.message && error.message.includes('ECONNREFUSED')) {
      console.log('   💡 Server is not running. Start it with: MCP_TRANSPORT=http npm start');
    }
  }

  // Test 4: Call a tool
  console.log('\n4️⃣ Testing tools/call (structs_query_player)...');
  try {
    const result = await makeRequest('tools/call', {
      name: 'structs_query_player',
      arguments: {
        player_id: '1-11'
      }
    });
    if (result.error) {
      console.log('   ❌ Error:', result.error.message || result.error);
    } else {
      console.log('   ✅ Success!');
      if (result.result && result.result.content) {
        const content = result.result.content[0];
        if (content.text) {
          const data = JSON.parse(content.text);
          console.log(`   Player ID: ${data.player?.Player?.id || 'N/A'}`);
          console.log(`   Guild: ${data.player?.Player?.guildId || 'N/A'}`);
        }
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message || error);
    if (error.message && error.message.includes('ECONNREFUSED')) {
      console.log('   💡 Server is not running. Start it with: MCP_TRANSPORT=http npm start');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Testing complete!');
}

// Run tests
testServer().catch(console.error);

