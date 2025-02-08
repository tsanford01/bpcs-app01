# Beckham Pest Control Management System

A comprehensive pest control business management platform designed to streamline operations through advanced scheduling, customer management, and route optimization technologies.

## Features

- 📅 Appointment Scheduling & Management
- 👥 Customer Relationship Management
- 🗺️ Route Optimization
- 💬 Real-time Customer Communication
- ⭐ Review Management
- 📱 Responsive Design for Mobile Access
- 🔒 Secure Authentication System

## Tech Stack

- **Frontend**:
  - React with TypeScript
  - Tailwind CSS for styling
  - shadcn/ui components
  - React Query for state management
  - Wouter for routing

- **Backend**:
  - Node.js with Express
  - WebSocket for real-time communication
  - PostgreSQL database with Drizzle ORM
  - Passport.js for authentication

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tsanford01/bpcs-app01.git
   cd bpcs-app01
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`.

## Development

- `npm run dev` - Start the development server
- `npm run build` - Build the production version
- `npm run db:push` - Push database schema changes

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
