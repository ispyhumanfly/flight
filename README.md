# Flight

Flight is a modern, high-performance web application server built on Node.js, designed for building scalable, component-driven applications. It represents the evolution of the [Avian](https://github.com/ispyhumanfly/avian) component application server, incorporating modern best practices and improved developer experience.

## Overview

Flight takes the best concepts from Avian and enhances them with modern tooling and practices. It provides a robust foundation for building enterprise-grade applications while maintaining simplicity and developer productivity.

### Key Features

- **Modern Stack**: Built on Koa.js with TypeScript support
- **Component-Based Architecture**: Organize your application into reusable components
- **Built-in Development Server**: Powered by Vite for lightning-fast development
- **Production-Ready**: Includes rate limiting, compression, and caching out of the box
- **Cluster Mode**: Automatic load balancing across CPU cores
- **Redis Integration**: Built-in support for session management and caching
- **TypeScript First**: Native TypeScript support throughout the framework
- **Hot Module Replacement**: Fast development with instant updates
- **CORS Enabled**: Ready for modern web applications
- **Security Features**: Rate limiting, secure session handling, and more

## Installation

```bash
npm install @spytech/flight
# or
yarn add @spytech/flight
```

## Quick Start

1. Create a new project directory and initialize:
```bash
mkdir my-flight-app
cd my-flight-app
npm init -y
```

2. Install Flight and its dependencies:
```bash
npm install @spytech/flight ioredis
```

3. Ensure Redis is running locally or set environment variables:
```bash
# Default values shown below
export FLIGHT_REDIS_HOST=localhost
export FLIGHT_REDIS_PORT=6379
```

4. Create a component with a backend route:
```bash
mkdir -p components/hello
```

Create `components/hello/hello.backend.ts`:
```typescript
import Router from '@koa/router';

const router = new Router();

router.get('/hello', async (ctx) => {
    ctx.body = { message: 'Hello from Flight!' };
});

export default router.routes();
```

5. Start the server:

Development mode:
```bash
node flight.js --mode development --app_home .
# Starts development server on port 3001 with HMR
# Backend API available on port 3000
```

Production mode:
```bash
node flight.js --mode production --app_home .
# Builds and serves application on port 3000
```

Available CLI options:
- `--app_home`: Application root directory (default: current directory)
- `--app_key`: Application key for sessions (default: 'flightApp')
- `--app_secret`: Secret key for session encryption (default: 'the best secret key in the world')
- `--mode`: 'development' or 'production' (default: 'production')

## Project Structure

```
my-app/
├── components/           # Application components
│   ├── Hello/   # Component directory
│   │   ├── Hello.vue    # Vue component view
│   │   └── Hello.backend.ts  # Backend routes and logic
├── assets/              # Static assets
├── dist/                # Production build output
└── package.json
```

Each component follows a simple structure:
- `Index.vue`: Contains the Vue component template, script, and styles
- `Index.backend.ts`: Contains the backend routes and logic for the component

Example component files:

`components/hello/Index.vue`:
```vue
<template>
  <div>
    <h1>{{ message }}</h1>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const message = ref('Hello from Flight!')
</script>
```

`components/hello/Index.backend.ts`:
```typescript
import Router from '@koa/router';

const router = new Router();

router.get('/hello', async (ctx) => {
    ctx.body = { message: 'Hello from Flight!' };
});

export default router.routes();
```

## Configuration

Flight can be configured through environment variables or command-line arguments:

```bash
FLIGHT_MODE=development
FLIGHT_REDIS_HOST=localhost
FLIGHT_REDIS_PORT=6379
FLIGHT_MAX_WORKERS=4
```

## Development Mode

In development mode, Flight provides:
- Hot Module Replacement (HMR)
- Fast refresh for React components
- Detailed error messages
- Development server on port 3001

## Production Mode

Production mode includes:
- Optimized builds
- Rate limiting
- Response compression
- Redis caching
- Cluster mode for load balancing
- Production server on port 3000

## Comparison with Avian

Flight is a modern reimagining of the Avian framework, making several architectural improvements while maintaining the core philosophy of component-driven applications. Here are the key differences:

### Framework Evolution
- **Koa Instead of Express**: Flight uses Koa.js as its foundation instead of Express, providing better async/await support and a more modern middleware architecture
- **Vite Instead of Webpack**: Replaced Webpack bundling with Vite for significantly faster development experience and simpler configuration
- **TypeScript First**: While Avian supported TypeScript, Flight is built with TypeScript from the ground up

### Architectural Improvements
1. **Simplified Component Structure**
   - Avian: Complex component hierarchy with multiple file types (.client, .server, .view, .config)
   - Flight: Streamlined with `.backend.ts` files and modern frontend frameworks
   
2. **Development Experience**
   - Avian: Webpack-based bundling with slower rebuild times
   - Flight: Vite-powered development with instant HMR and no bundle step in development

3. **Session Management**
   - Avian: Express-session with Redis store
   - Flight: Koa-session with Redis store, improved security defaults

4. **Performance Features**
   - Built-in rate limiting
   - Redis-based caching
   - Automatic compression in production
   - Cluster mode for CPU utilization

5. **Configuration**
   - Avian: Complex webpack configuration and multiple build modes
   - Flight: Simplified configuration with sensible defaults and Vite's zero-config approach

### What's Different

1. **Removed Features**
   - Removed Webpack-specific configurations
   - Removed legacy view engine support (EJS, Twig, Pug)
   - Removed Sentry integration (can be added as middleware if needed)
   - Removed built-in cron job scheduler (better handled by dedicated services)

2. **New Features**
   - Native ESM support
   - Built-in CORS support
   - Improved Redis integration
   - Better security defaults
   - Simpler API for backend routes
   - Modern frontend tooling support

3. **Simplified Architecture**
   - Reduced configuration complexity
   - More intuitive component organization
   - Better separation of concerns
   - Modern middleware approach

### Migration from Avian

If you're migrating from Avian, the main changes you'll need to make are:

1. Update your component structure to use `.backend.ts` files
2. Move from Express middleware to Koa middleware
3. Update your frontend bundling to use Vite
4. Adapt to the new session management system
5. Update your static file serving configuration

## Requirements

- Node.js 16.x or higher
- Redis server
- TypeScript 4.x or higher

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

Flight is built upon the solid foundation laid by the [Avian](https://github.com/ispyhumanfly/avian) framework, created by FlyPaper Technologies, LLC. We're grateful for their pioneering work in component-driven architecture.
