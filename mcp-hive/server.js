#!/usr/bin/env node
/**
 * Joffe Federation MCP Hive Server
 * Routes tasks to free AI models for billion-dollar app development
 */

const http = require('http');
const https = require('https');
const url = require('url');

const HIVE_CONFIG = require('./hive-config.json');

class MCPHive {
  constructor() {
    this.models = HIVE_CONFIG.models;
    this.routing = HIVE_CONFIG.routing;
    this.requestCount = 0;
  }

  getModelForTask(taskType) {
    const modelName = this.routing[taskType] || 'union-alpha';
    return this.models[modelName];
  }

  async callModel(model, messages, options = {}) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: model.model_id,
        messages: messages,
        max_tokens: options.max_tokens || 4096,
        temperature: options.temperature || 0.7,
        ...options
      });

      const req = https.request(model.base_url + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENCODE_API_KEY || 'demo'}`
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ choices: [{ message: { content: data } }] });
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async routeTask(taskType, messages, options = {}) {
    this.requestCount++;
    const model = this.getModelForTask(taskType);
    console.log(`[Hive] Routing ${taskType} to ${model.model_id} (Request #${this.requestCount})`);
    
    try {
      const result = await this.callModel(model, messages, options);
      return {
        model: model.model_id,
        task_type: taskType,
        result: result,
        request_id: this.requestCount
      };
    } catch (error) {
      console.error(`[Hive] Error with ${model.model_id}:`, error.message);
      // Fallback to next model
      const fallbackModel = this.models['union-alpha'];
      const fallbackResult = await this.callModel(fallbackModel, messages, options);
      return {
        model: fallbackModel.model_id,
        task_type: taskType,
        result: fallbackResult,
        request_id: this.requestCount,
        fallback: true
      };
    }
  }

  getStats() {
    return {
      total_requests: this.requestCount,
      models_available: Object.keys(this.models).length,
      routing_rules: Object.keys(this.routing).length
    };
  }
}

// HTTP Server for MCP Hive
const hive = new MCPHive();

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', hive: 'active' }));
    return;
  }

  if (parsedUrl.pathname === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(hive.getStats()));
    return;
  }

  if (parsedUrl.pathname === '/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(hive.models));
    return;
  }

  if (parsedUrl.pathname === '/route' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { task_type, messages, options } = JSON.parse(body);
        const result = await hive.routeTask(task_type, messages, options);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const PORT = process.env.HIVE_PORT || 3001;
server.listen(PORT, () => {
  console.log(`[MCP Hive] Server running on port ${PORT}`);
  console.log(`[MCP Hive] Models: ${Object.keys(hive.models).length}`);
  console.log(`[MCP Hive] Routing rules: ${Object.keys(hive.routing).length}`);
});

module.exports = { MCPHive, hive };
