# Flight

Flight is a modern, high-performance web application framework built on Node.js, designed for building scalable, component-driven applications. It represents the evolution of the [Avian](https://github.com/ispyhumanfly/avian) framework, incorporating modern best practices and improved developer experience.

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
npm install @ispyhumanfly/flight ioredis
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
│   ├── component-name/
│   │   ├── index.ts     # Component logic
│   │   ├── view.tsx     # Component view
│   │   └── backend.ts   # Backend routes
├── assets/              # Static assets
├── dist/                # Production build output
└── package.json
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

## Improvements Over Avian

Flight builds upon Avian's solid foundation while introducing several key improvements:

1. **Modern Framework**: Switched from Express to Koa.js for better async/await support and middleware handling
2. **Vite Integration**: Replaced Webpack with Vite for faster development and better build performance
3. **TypeScript First**: Native TypeScript support throughout the framework
4. **Simplified Component Structure**: More intuitive component organization
5. **Better Development Experience**: Hot Module Replacement and faster refresh cycles
6. **Enhanced Security**: Built-in rate limiting and improved session handling
7. **Modern Tooling**: Updated dependencies and better integration with current web standards

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
