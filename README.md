# 🚀 BrightLoop – Subscription & Recurring Billing Management

<p align="center">
  <strong>Smart Subscription Management. Simplified Recurring Billing.</strong>
</p>

<p align="center">
  A modern web-based platform designed to simplify subscription management, organize recurring payments, and provide better visibility into billing activities.
</p>

<p align="center">
  🌐 **Live Demo:** https://oddo-26.vercel.app/
</p>

---

## 📌 About The Project

**BrightLoop** is a Subscription and Recurring Billing Management System developed as part of the ODDO-26 Hackathon.

The platform aims to make subscription management easier by providing a centralized solution for managing subscription-related information, tracking recurring billing activities, and improving the overall billing management experience.

Our goal is to reduce manual work, simplify subscription-related operations, and create a user-friendly digital experience for managing recurring services.

## 🎯 Problem Statement

Managing multiple subscriptions and recurring billing activities can become complicated, time-consuming, and difficult to track.

Traditional manual methods may lead to:
- Difficulty tracking active subscriptions.
- Missed billing dates and payment deadlines.
- Lack of centralized subscription information.
- Complicated billing management.
- Poor visibility into recurring expenses.

## 💡 Our Solution

BrightLoop provides a centralized platform that aims to simplify subscription and recurring billing management through a modern and intuitive web interface.

It focuses on improving accessibility, organization, and efficiency in subscription-related operations.

## ✨ Key Features

- **Subscription Management:** Centralized management of subscription information.
- **Recurring Billing:** Designed to simplify recurring billing operations.
- **User-Friendly Interface:** Clean and intuitive user experience.
- **Dashboard:** A centralized interface for accessing important information.
- **Authentication:** User authentication and account management.
- **Responsive Design:** Accessible across different screen sizes.
- **Database Integration:** Structured data management for application operations.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend and application framework |
| JavaScript | Application logic |
| Tailwind CSS | Styling and responsive UI |
| Shadcn UI | Reusable UI components |
| NextAuth.js | Authentication |
| Prisma ORM | Database management |
| PostgreSQL / SQLite | Database (depending on configuration) |
| Vercel | Deployment and hosting |

## 🏗️ Project Architecture

The application follows a modern web application architecture:

1. **Frontend Layer:** Provides the user interface and user interactions.
2. **Application Layer:** Handles application logic, authentication, and requests.
3. **Backend/API Layer:** Processes application operations.
4. **Database Layer:** Stores and manages application data.

## 🚀 Live Application

Experience BrightLoop here:

👉 https://oddo-26.vercel.app/

## 💻 Installation & Setup

Follow these steps to run the project locally.

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Navigate to the Project Directory

```bash
cd YOUR_PROJECT_FOLDER
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` or `.env.local` file in the project root and configure the required environment variables.

Example:

```env
DATABASE_URL="YOUR_DATABASE_CONNECTION_STRING"
NEXTAUTH_SECRET="YOUR_SECRET_KEY"
NEXTAUTH_URL="http://localhost:3000"
```

Add any additional variables required by your application.

### 5. Configure the Database

Generate the Prisma client:

```bash
npx prisma generate
```

Synchronize the database schema:

```bash
npx prisma db push
```

### 6. Start the Development Server

```bash
npm run dev
```

Open your browser and visit:

```text
http://localhost:3000
```

## 📂 Project Structure

```text
BrightLoop/
│
├── app/                  # Application routes and pages
│   ├── api/              # API endpoints
│   ├── auth/             # Authentication pages
│   └── dashboard/        # Dashboard pages
│
├── components/           # Reusable UI components
│   └── ui/               # UI component library
│
├── hooks/                # Custom React hooks
│
├── lib/                  # Utility functions and configurations
│
├── prisma/               # Database schema and configuration
│
├── styles/               # Global styling
│
├── public/               # Static assets
│
├── package.json          # Project dependencies
│
└── README.md             # Project documentation
```

*Note: Adjust the folder structure according to the final repository.*

## 🌍 Deployment

The project is deployed using **Vercel**.

Deployment URL:

https://oddo-26.vercel.app/

To deploy your own version:

1. Push the project to GitHub.
2. Connect your repository to Vercel.
3. Configure the required environment variables.
4. Deploy the application.
5. Access your live application through the generated URL.

## 🔮 Future Enhancements

- Integration with secure online payment gateways.
- Automated payment reminders and notifications.
- Advanced billing analytics and reports.
- Subscription renewal automation.
- Invoice generation and management.
- Improved subscription spending insights.
- Enhanced administrative controls.

## 👨‍💻 Team & Contributors

Developed with dedication and teamwork as part of **ODDO-26 Hackathon**.

We believe in building technology that makes everyday digital operations simpler and smarter.

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome!

1. Fork the repository.
2. Create a new feature branch.
3. Commit your changes.
4. Push the branch.
5. Open a Pull Request.

## 📄 License

This project is developed for hackathon and educational purposes.

---

<p align="center">
  <strong>Built with ❤️ by Team BrightLoop</strong>
</p>

<p align="center">
  🚀 Simplifying Subscriptions. Streamlining Billing.
</p>
