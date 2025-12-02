# Installation Instructions for the Makerspace Inventory Application

## Prerequisites

- **Node.js** (v18 or higher) https://nodejs.org/
- **npm** (comes with Node.js)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YoungKealohi/MakerspaceInventory.git
cd MakerspaceInventory
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages:
- `express` - Web framework
- `express-session` - Session management
- `mysql2` - MySQL database driver
- `pug` - Template engine
- `dotenv` - Environment configuration
- `body-parser` - Request body parsing
- `nodemon` - Development auto-reload (dev dependency)

### 3. Start the Application

**Production mode**:
```bash
npm start
```

The application will start on **http://localhost:3000**
