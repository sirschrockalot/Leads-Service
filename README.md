# Leads Service

A microservice for managing leads in the Presidential Digs CRM system.

## Features

- **Lead Management**: Full CRUD operations for leads
- **Advanced Filtering**: Search, filter, and sort leads by various criteria
- **Bulk Operations**: Bulk update and delete operations
- **Statistics**: Comprehensive lead analytics and reporting
- **Authentication**: JWT-based authentication
- **API Documentation**: Swagger/OpenAPI documentation
- **Health Checks**: Service health monitoring

## API Endpoints

### Leads
- `GET /api/v1/leads` - Get all leads with filtering and pagination
- `POST /api/v1/leads` - Create a new lead
- `GET /api/v1/leads/:id` - Get a specific lead
- `PATCH /api/v1/leads/:id` - Update a lead
- `DELETE /api/v1/leads/:id` - Delete a lead
- `POST /api/v1/leads/bulk-update` - Bulk update leads
- `POST /api/v1/leads/bulk-delete` - Bulk delete leads

### Statistics
- `GET /api/v1/leads/stats` - Get lead statistics

### Health
- `GET /api/v1/health` - Health check endpoint

## Lead Schema

```typescript
{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  jobTitle?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  source: 'website' | 'referral' | 'social_media' | 'advertising' | 'cold_call' | 'email_campaign' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  customFields?: Record<string, any>;
  assignedTo?: ObjectId;
  createdBy: ObjectId;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  score: number;
  isActive: boolean;
  tags?: string[];
  estimatedValue?: number;
  actualValue?: number;
  conversionDate?: Date;
  lostReason?: string;
}
```

## Environment Variables

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/dealcycle
DATABASE_NAME=dealcycle

# Server Configuration
PORT=3002
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## Quick Start

### Using Docker Compose

```bash
# Start the service with MongoDB
docker-compose up -d

# View logs
docker-compose logs -f leads-service
```

### Manual Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example env.development

# Build the application
npm run build

# Start the service
npm start
```

### Development

```bash
# Start in development mode
npm run start:dev

# Start with watch mode
npm run start:watch
```

## API Documentation

Once the service is running, visit:
- Swagger UI: http://localhost:3002/api/docs
- Health Check: http://localhost:3002/api/v1/health

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Filtering and Search

The leads endpoint supports extensive filtering:

- **Search**: Search by name, email, phone, or company
- **Status**: Filter by lead status
- **Source**: Filter by lead source
- **Priority**: Filter by lead priority
- **Assigned To**: Filter by assigned user
- **Date Ranges**: Filter by creation date, last contact date, or follow-up date
- **Score Range**: Filter by lead score
- **Value Range**: Filter by estimated value
- **Tags**: Filter by tags
- **Pagination**: Page and limit results
- **Sorting**: Sort by any field in ascending or descending order

Example query:
```
GET /api/v1/leads?search=john&status=qualified&priority=high&page=1&limit=10&sortBy=createdAt&sortOrder=desc
```
