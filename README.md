MillMate

Traditional Milling, Smarter Management

MillMate is a flour mill and rice mill management application designed to simplify daily business operations through a single admin dashboard.

It helps manage billing, customer credit, products, electricity records and business reports in one place.

Features

- Dashboard – View important business information.
- Billing – Create and manage customer bills.
- Customer Credit – Maintain customer credit records.
- Products – Manage product information.
- Electricity – Record electricity-related details.
- Reports – View business reports.

Technology Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Python, FastAPI
- Database: PostgreSQL
- Server: Uvicorn

Project Structure

MillMate/
│
├── public/
├── website/
├── main.py
├── schema.sql
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md

Local Setup

1. Clone the Repository

git clone https://github.com/Mathi1406/MillMate.git

2. Open the Project Folder

cd MillMate

3. Install Dependencies

py -m pip install -r requirements.txt

4. Configure Environment Variables

Create a ".env" file using ".env.example" as a reference.

Configure your PostgreSQL database connection and admin login credentials in ".env".

Keep your actual ".env" file private. Never upload it to GitHub.

5. Configure PostgreSQL

Create a PostgreSQL database and configure the connection details in ".env".

Run the database schema from "schema.sql" to create the required tables.

6. Start the Application

py -m uvicorn main:app --host 127.0.0.1 --port 3000

Open the application in your browser:

http://127.0.0.1:3000

Access Control

MillMate provides a single-admin access system to protect the management dashboard and business data.

Admin credentials are configured through environment variables.

Project Goal

The goal of MillMate is to make everyday flour mill and rice mill management simpler, more organized and easier to maintain.

---

MillMate – Traditional Milling, Smarter Management.