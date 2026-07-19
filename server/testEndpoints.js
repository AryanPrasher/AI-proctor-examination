// Express Endpoints Verification Script
import { app } from './server.js';

const listExpressRoutes = (app) => {
  const routes = [];

  const print = (path, layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      methods.forEach((method) => {
        routes.push({
          method,
          path: `${path}${layer.route.path}`
        });
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      let routerPath = path;
      // Extract prefix from regex if standard mount
      if (layer.regexp) {
        const match = layer.regexp.toString().match(/^\/\^\\(.*?)\\\/\?/);
        if (match && match[1]) {
          routerPath = path + match[1].replace(/\\\//g, '/');
        }
      }
      layer.handle.stack.forEach((subLayer) => {
        print(routerPath, subLayer);
      });
    }
  };

  app._router.stack.forEach((layer) => {
    print('', layer);
  });

  return routes;
};

setTimeout(() => {
  console.log('\n==================================================');
  console.log('EXPRESS ROUTE VERIFIER');
  console.log('==================================================');
  
  const allRoutes = listExpressRoutes(app);
  
  // Filter for api routes
  const apiRoutes = allRoutes.filter(r => r.path.startsWith('/api/') && !r.path.startsWith('/api/auth'));
  const authRoutes = allRoutes.filter(r => r.path.startsWith('/api/auth'));

  console.log(`\nFound ${apiRoutes.length} Platform API Routes (Target: 36):`);
  apiRoutes.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.method}] ${r.path}`);
  });

  console.log(`\nFound ${authRoutes.length} core JWT Authentication Routes:`);
  authRoutes.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.method}] ${r.path}`);
  });

  console.log('==================================================');
  const success = apiRoutes.length === 36;
  console.log(`VERIFICATION RESULT: ${success ? 'SUCCESS (Exactly 36 APIs)' : 'COUNT MISMATCH'}`);
  console.log('==================================================\n');

  process.exit(success ? 0 : 1);
}, 2000); // Wait for connection sequence
