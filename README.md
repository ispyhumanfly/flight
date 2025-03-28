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

1. Create a new Flight project:

```bash
npx create-flight-app my-app
cd my-app
```

2. Start the development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
npm start
```

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
