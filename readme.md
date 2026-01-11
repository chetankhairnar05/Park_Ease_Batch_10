# 🅿️ Park Ease – Smart Parking Management System

**project demo link**

```
https://www.youtube.com/watch?v=QkjYBcf5kv0
```

**Spring Boot Internship Project**

Park Ease is a **production-grade Smart Parking Management System** built using **Spring Boot 3**, designed to simulate real-world urban parking operations.
It digitizes the complete parking lifecycle—from **remote booking** to **cashless exit**—while supporting **multiple roles**, **dynamic pricing**, **wallet-based payments**, **real-time updates**, **analytics**, and **audit-grade reporting**.

---

## 📌 Project Highlights

- Stateless **JWT-based Authentication**
- Role-Based Access Control (**ADMIN, AREA_OWNER, GUARD, DRIVER**)
- Automated **Indore city data seeding**
- Wallet + Outstanding Due system (FASTag model)
- Vehicle-slot compatibility enforcement
- **Platform-wide & area-level analytics dashboards**
- **CSV-based reporting for admins, owners, and drivers**
- **Audit logs for all booking and payment activities**
- **Approval-based staff onboarding workflow**
- Production-ready architecture (Service / Repository / DTO layers)

---

# ⚙️ Setup & Installation (Read This First)

## 1️⃣ Prerequisites

| Requirement | Version            |
| ----------- | ------------------ |
| Java        | JDK 21             |
| Spring Boot | 3.5.8              |
| Database    | MySQL 8.0+         |
| Build Tool  | Maven              |
| IDE         | IntelliJ / VS Code |

---

## 2️⃣ Database Setup

Create the database manually before running the app:

```sql
CREATE DATABASE park_ease;
```

---

## 3️⃣ Application Configuration

Update `src/main/resources/application.properties`:

```properties
# Server
server.port=8080

# MySQL Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/park_ease?createDatabaseIfNotExist=true
spring.datasource.username=YOUR_MYSQL_USERNAME
spring.datasource.password=YOUR_MYSQL_PASSWORD
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA / Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

# JWT Security
jwt.secret=CHANGE_THIS_SECRET_FOR_PRODUCTION
```

---

## 4️⃣ Run the Application

### Backend

Run:

```
ParkEaseApplication.java
```

**Recommended**

```bash
git clone https://github.com/chetankhairnar05/Park_Ease_Batch_10.git
cd Park_Ease_Batch_10
.\mvnw.cmd spring-boot:run
```

On first startup, **AdminSeeder** automatically populates the database with users, areas, slots, guards, vehicles, and pricing data.

---

### Frontend

Open:

**Method 1**

```
http://localhost:8080/auth.html
```

**Method 2 (Recommended for JS support)**

Use **Live Server** in VS Code:

```
frontend1/auth.html
```

---

# 🌱 Default Seeded Users (Auto-Created)

> All users share the same password for testing.

**Common Password:** `1234`

---

## 👤 Admin Accounts

| Role  | Email                                       | Password |
| ----- | ------------------------------------------- | -------- |
| ADMIN | [admin1@gmail.com](mailto:admin1@gmail.com) | 1234     |
| ADMIN | [admin2@gmail.com](mailto:admin2@gmail.com) | 1234     |
| ADMIN | [admin3@gmail.com](mailto:admin3@gmail.com) | 1234     |

Admins have **platform-wide visibility**, including analytics, revenue reports, and approval controls.

---

## 🏢 Area Owner Accounts

| Role       | Email                                       | Password |
| ---------- | ------------------------------------------- | -------- |
| AREA_OWNER | [owner1@gmail.com](mailto:owner1@gmail.com) | 1234     |
| AREA_OWNER | [owner2@gmail.com](mailto:owner2@gmail.com) | 1234     |
| AREA_OWNER | [owner3@gmail.com](mailto:owner3@gmail.com) | 1234     |

Each Area Owner:

- Controls **2 parking areas**
- Manages slots, guards, and pricing
- Accesses **area-specific analytics**, **audit logs**, and **CSV exports**

---

## 🚗 Driver Accounts

| Role   | Email                                     | Password | Wallet |
| ------ | ----------------------------------------- | -------- | ------ |
| DRIVER | [user1@gmail.com](mailto:user1@gmail.com) | 1234     | ₹2000  |
| DRIVER | [user2@gmail.com](mailto:user2@gmail.com) | 1234     | ₹2000  |
| DRIVER | [user3@gmail.com](mailto:user3@gmail.com) | 1234     | ₹2000  |

Each driver:

- Owns **2 vehicles**
- One vehicle marked as **Primary**
- Can view **active sessions**, **booking history**, and **export CSV reports**

---

## 🛡️ Guard Accounts

Guards are auto-created **per parking area**.

**Email Pattern**

```
guard{AreaId}_{Number}@gmail.com
```

**Password:** `1234`

Guards can verify entry, monitor parking, and force-end sessions when required.

---

# 🧠 Application Architecture

## 🔐 Security (JWT + RBAC)

- Stateless authentication
- JWT returned on login
- Token sent in header:

```
X-Auth-Token: <JWT>
```

### Role Capabilities

| Role       | Capabilities                                  |
| ---------- | --------------------------------------------- |
| ADMIN      | Platform analytics, owner approval, reporting |
| AREA_OWNER | Area & slot management, guard control, logs   |
| GUARD      | Entry verification, forced exit               |
| DRIVER     | Booking, parking, wallet payments             |

---

## 📊 Analytics & Reporting

- **Admin Dashboard**

  - Total platform revenue
  - Booking statistics (Active / Completed / Cancelled)
  - Average parking duration
  - Area-wise performance table
  - Drill-down analytics per area
  - Date-range filtering
  - CSV export

- **Area Owner Dashboard**

  - Revenue & booking trends (24 hours / 30 days)
  - Top-performing slots by revenue and occupancy
  - Downloadable booking and payment logs

---

## 🧾 Audit Logs

- Chronological booking logs per area
- Includes:

  - Booking ID
  - Timestamp
  - User & vehicle details
  - Slot number
  - Final status
  - Amount paid or pending

- Exportable CSV reports for audits and reconciliation

---

## 👥 Staff Management

- Admins and Area Owners are created in a **Disabled** state
- Super Admin approval required before access
- Area Owners can recruit guards using email or phone
- Existing users are promoted automatically
- Strict ownership enforcement for security

---

## 🚘 Booking Lifecycle

### 1️⃣ Reservation

- Status: `RESERVED`
- Grace period applied
- Auto-cancel on no-show

### 2️⃣ Arrival

- Status → `ACTIVE_PARKING`
- Timer starts
- Reservation fee waived if on time

### 3️⃣ Exit & Payment

```
Reservation Fee + Parking Fee + Pending Dues
```

- Wallet auto-deduction
- Outstanding dues tracked
- Slot released
- Exit token generated

---

## 💳 Wallet & Due System

- Prepaid wallet per driver
- Automatic billing on exit
- Failed payment → Outstanding Due
- Users blocked from new bookings until cleared

---

## 🚙 Vehicle & Slot Logic

- Vehicle types: **SMALL, MEDIUM, LARGE**
- Slot compatibility enforced
- Primary vehicle supported for quick booking

---

## 🧩 Real-Time Communication

- Slot updates:

```
/topic/area/{areaId}/slots
```

- Booking updates:

```
/user/queue/booking-updates
```

DTO-based messaging prevents serialization recursion.

---

## 🧪 Technology Stack

| Layer     | Technology              |
| --------- | ----------------------- |
| Backend   | Spring Boot 3.5.8       |
| Language  | Java 21                 |
| ORM       | Hibernate / JPA         |
| Database  | MySQL 8                 |
| Security  | Spring Security 6 + JWT |
| Analytics | Chart.js                |
| Frontend  | HTML, Tailwind CSS, JS  |

---

# ✅ Conclusion

Park Ease demonstrates **real-world backend engineering practices**, including:

- Secure authentication & authorization
- Analytics-driven system design
- Audit-ready financial workflows
- Real-time state synchronization
- Scalable, maintainable architecture

---
