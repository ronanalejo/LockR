# LockR - Locker Reservation System

A comprehensive web-based platform for locker reservation and management at iACADEMY, designed for students, Office of Student Affairs and Services (OSAS), and Finance Department.

## 📋 Project Overview

LockR is a modern locker reservation system that streamlines the process of locker allocation, payment tracking, and administrative management. The system provides different interfaces for students to reserve lockers and for administrators to manage reservations and payments.

### 🎯 Specific Objectives

- Develop a web-based platform where students can log in and access locker reservation features
- Implement a digital interface that displays all available locker slots in real time
- Enable students to select and reserve locker slots through an intuitive, seat-reservation-style interface
- Integrate an admin panel for OSAS for viewing and confirming of locker reservations, and for Finance Department for viewing of pending payments
- Integrate a system that generates digital referral slips to be displayed on OSAS and Finance admin panel respectively
- Provide a dropbox for students to upload their scanned official receipt for confirmation
- Ensure secure storage and retrieval of locker data using a centralized and reliable database
- Evaluate system usability, performance, and effectiveness through user testing and feedback collection

### 🔍 Scope and Limitations

**Scope:**

- Web application for locker reservation and management
- User management for Students, OSAS, and Finance Department
- Real-time locker availability display
- Digital payment advice slip generation
- Administrative dashboard for reservation management
- Receipt upload and verification system
- Floor plan management for locker locations

**Limitations:**

- System limited to iACADEMY internal use
- Requires manual verification of uploaded receipts
- No automated payment processing integration
- Limited to web-based access only

## 🛠️ Technology Stack

### Frontend

- **Framework:** React.js
- **Styling:** CSS3 with custom components
- **Notifications:** SweetAlert2
- **Build Tool:** Create React App / Vite

### Backend

- **API Server:** Node.js with Express.js
- **Server-Side Logic:** PHP
- **Database:** MySQL (XAMPP with phpMyAdmin)
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer (Node.js) / PHP native

### Infrastructure

- **Local Development:** XAMPP
- **Tunneling:** Cloudflare Tunnel (cloudflared)
- **Version Control:** Git
- **Documentation:** Markdown

### Development Tools

- **Design:** Figma
- **Code Editor:** Visual Studio Code
- **API Testing:** Postman
- **Frontend Languages:** HTML/CSS/JavaScript
- **Backend Languages:** PHP/MySQL, Node.js
- **Framework:** React.js, Express.js
- **Automation:** Puppeteer

## 👥 Team Structure

- **2 Full-stack Developers:** Handle integration between frontend/backend and complex features
- **2 Backend Developers:** Focus on API development, database design, and business logic
- **1 Frontend Developer:** Focus on React components, UI/UX, and responsive design

## 📁 Project Architecture

The project follows a modern **Frontend + API** architecture with React.js frontend consuming APIs from both Node.js and PHP backends.

### Architecture Pattern: MVC (Model-View-Controller)

- **Model:** Database models in both Node.js and PHP backends
- **View:** React components and pages in frontend
- **Controller:** API controllers handling business logic in backends

### Key Features by User Role:

**👨‍🎓 Students:**

- Login and authentication
- View available lockers in real-time
- Select and reserve locker slots
- Choose agreement duration
- Upload payment receipts
- View reservation status

**👩‍💼 OSAS (Office of Student Affairs and Services):**

- Admin dashboard with multiple views:
  - For Endorsement
  - For Approval
  - Occupied
  - History
  - Floor Plan management
- Approve/reject reservations
- Manage locker availability
- Generate referral slips

**💰 Finance Department:**

- Financial dashboard with views:
  - For Payment
  - Payment History
- View pending payments
- Verify receipt uploads
- Payment status management

## 🚀 Getting Started

### Prerequisites

- XAMPP (Apache, MySQL, PHP)
- Node.js (v16 or higher)
- npm or yarn
- Git
- Cloudflare account (for tunneling)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/lockr-reservation-system.git
   cd lockr-reservation-system
   ```

2. **Create project folder structure**

   ```bash
   mkdir -p config config/environments backend backend/nodejs backend/nodejs/config backend/nodejs/controllers backend/nodejs/models backend/nodejs/routes backend/nodejs/middleware backend/nodejs/services backend/nodejs/utils backend/nodejs/tests backend/nodejs/tests/unit backend/nodejs/tests/integration backend/nodejs/tests/fixtures backend/php backend/php/config backend/php/controllers backend/php/models backend/php/api backend/php/includes backend/php/middleware backend/php/services backend/php/utils backend/php/routes backend/php/tests backend/php/tests/unit backend/php/tests/integration backend/php/tests/fixtures backend/uploads backend/uploads/receipts backend/uploads/profile-pictures backend/uploads/floor-plans backend/uploads/temp backend/logs frontend frontend/public frontend/src frontend/src/components frontend/src/components/common frontend/src/components/auth frontend/src/components/student frontend/src/components/osa frontend/src/components/finance frontend/src/components/ui frontend/src/pages frontend/src/pages/auth frontend/src/pages/student frontend/src/pages/osa frontend/src/pages/finance frontend/src/hooks frontend/src/context frontend/src/services frontend/src/utils frontend/src/constants frontend/src/assets frontend/src/assets/css frontend/src/assets/images frontend/src/assets/images/logos frontend/src/assets/images/icons frontend/src/assets/images/floor-plans frontend/src/assets/images/backgrounds frontend/src/assets/fonts frontend/build frontend/tests frontend/tests/components frontend/tests/pages frontend/tests/hooks frontend/tests/utils database database/migrations database/seeds database/backups shared shared/constants shared/types docs scripts cloudflare testing testing/postman testing/phpunit testing/jest
   ```

3. **Setup XAMPP Database**

   - Start XAMPP (Apache + MySQL)
   - Open phpMyAdmin (http://localhost/phpmyadmin)
   - Create database: `lockr_db`
   - Import schema from `/database/migrations/`
   - Insert initial data from `/database/seeds/`

4. **Install Node.js dependencies**

   ```bash
   cd backend/nodejs
   npm install
   cd ../../frontend
   npm install
   ```

5. **Configure environment variables**

   ```bash
   cp .env.example .env.development
   # Edit .env.development with your database and API settings
   ```

6. **Setup Cloudflare Tunnel**

   ```bash
   # Install cloudflared
   winget install --id Cloudflare.cloudflared

   # Configure tunnel (follow Cloudflare documentation)
   cloudflared tunnel login
   cloudflared tunnel create lockr
   ```

### Development Workflow

1. **Start XAMPP services**

   - Apache (for PHP backend)
   - MySQL (for database)

2. **Start Node.js API server**

   ```bash
   cd backend/nodejs
   npm run dev
   ```

3. **Start React development server**

   ```bash
   cd frontend
   npm start
   ```

4. **Start Cloudflare tunnel** (optional, for external access)
   ```bash
   cloudflared tunnel run lockr
   ```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Student Endpoints

- `GET /api/lockers` - Get available lockers
- `POST /api/reservations` - Create reservation
- `PUT /api/reservations/:id` - Update reservation
- `POST /api/upload/receipt` - Upload payment receipt

### Admin Endpoints (OSAS)

- `GET /api/admin/reservations/endorsement` - Get endorsement queue
- `GET /api/admin/reservations/approval` - Get approval queue
- `PUT /api/admin/reservations/:id/approve` - Approve reservation
- `GET /api/admin/floor-plans` - Get floor plans

### Finance Endpoints

- `GET /api/finance/payments/pending` - Get pending payments
- `GET /api/finance/payments/history` - Get payment history

## 🧪 Testing

### Frontend Testing

```bash
cd frontend
npm test
```

### Backend Testing

```bash
# Node.js tests
cd backend/nodejs
npm test

# PHP tests
cd backend/php
./vendor/bin/phpunit
```

### API Testing

Import Postman collection from `/testing/postman/lockr-api.postman_collection.json`

## 📱 User Interface

### Student Portal Features

- **Dashboard:** Overview of current reservations
- **Locker Selection:** Interactive floor plan with real-time availability
- **Reservation Form:** Agreement selection and booking confirmation
- **Receipt Upload:** Drag-and-drop receipt submission with SweetAlert2 confirmations

### OSAS Admin Panel Features

- **For Endorsement:** Pending reservation approvals
- **For Approval:** Final approval queue
- **Occupied:** Currently occupied locker management
- **History:** Historical reservation data with filters
- **Floor Plan:** Interactive locker management interface

### Finance Admin Panel Features

- **For Payment:** Payment verification queue
- **Payment History:** Complete payment records and reporting

## 🔐 Security Features

- JWT-based authentication
- Role-based access control (Student, OSAS, Finance)
- File upload validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

## 📋 Database Schema

### Main Tables

- `users` - System users (students, admin)
- `students` - Student-specific information
- `lockers` - Locker inventory and locations
- `reservations` - Locker reservations and status
- `receipts` - Uploaded payment receipts
- `agreements` - Locker agreement templates
- `floor_plans` - Floor plan layouts

## 🚀 Deployment

### Production Setup

1. Configure production environment variables
2. Build React application: `npm run build`
3. Setup production database
4. Configure Cloudflare tunnel for external access
5. Setup SSL certificates
6. Configure backup schedules

### Backup Strategy

- Daily database backups stored in `/database/backups/`
- Weekly file system backups
- Automated backup verification

## 🤝 Contributing

### Development Guidelines

1. Follow MVC architecture patterns
2. Use consistent code formatting (Prettier/PSR-12)
3. Write unit tests for new features
4. Update API documentation
5. Follow Git workflow with feature branches

### Code Review Process

1. Create feature branch from `develop`
2. Implement feature with tests
3. Create pull request with description
4. Code review by team members
5. Merge to `develop` after approval

## 📞 Support

### Development Team Contacts

- **Member 1:** [Ronan James Alejo] - [ronanjames.alejo725@gmail.com] - [Full Stack]
- **Member 2:** [Christian Olea] - [] - [Full Stack]
- **Member 3:** [Daniel Gastador] - [daniel.gastador@yahoo.com] - [Full Stack]
- **Member 4:** [Shaun Ivan Bulusan] - [shaunivanmonillas03@gmail.com] - [Front-end]
- **Member 5:** [Leviathan Co] - [leviathan.layek@gmail.com] - [Back-end]

### Documentation

- API Documentation: `/docs/API.md`
- Database Schema: `/docs/DATABASE.md`
- Deployment Guide: `/docs/DEPLOYMENT.md`
- User Guide: `/docs/USER_GUIDE.md`

## 📄 License

This project is proprietary software developed for iACADEMY. All rights reserved.

---

**iACADEMY LockR Reservation System**  
_Streamlining locker management for the digital age_
