# Healthcare Backend

## Project Overview

This is the backend application for a healthcare management system. It provides APIs for managing patients, users (with different roles like Admin, Doctor, Nurse, and Receptionist), authentication, appointments, medical records, and analytics.

## Setup Steps

Follow these steps to set up and run the project locally:

### Prerequisites

- **Node.js**: Make sure you have Node.js (v14 or higher recommended) and npm installed.
- **MongoDB**: You need a running MongoDB instance. You can install MongoDB locally or use a cloud service like MongoDB Atlas.

### Installation

1.  Clone the repository to your local machine:
    ```bash
    git clone <repository_url>
    cd healthcare-backend
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Environment Variables

Create a `.env` file in the project root directory with the following variables:

```env
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret_key>
```

- Replace `<your_mongodb_connection_string>` with your MongoDB connection string (e.g., `mongodb://localhost:27017/healthcare` for a local instance or your MongoDB Atlas connection string).
- Replace `<your_jwt_secret_key>` with a strong, random string for JWT token signing.

### Starting the Database

- **Local MongoDB**: If you installed MongoDB locally, start the `mongod` process. The command might vary depending on your installation.
- **MongoDB Atlas**: Ensure your Network Access settings in MongoDB Atlas allow connections from your current IP address.

## Usage Instructions

1.  Start the backend server:

    ```bash
    npm run dev
    ```

    Nodemon will watch for file changes and automatically restart the server.

2.  The server will typically run on `http://localhost:5000`. You will see the confirmation message in your terminal.

3.  Access the API endpoints using a tool like Postman, or connect your frontend application to this backend.

4.  User roles and their permissions are handled by the backend. Ensure you register users with appropriate roles (Admin, Doctor, Nurse, Receptionist) to access specific functionalities.
