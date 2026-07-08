const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ResolveHub API Documentation',
      version: '1.0.0',
      description: 'REST API documentation for ResolveHub — AI-Powered Community Complaint Resolution Platform',
      contact: {
        name: 'ResolveHub Support',
        email: 'support@resolvehub.dev',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './routes/*.js',
    './server.js'
  ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
