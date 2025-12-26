# 🅿️ Park Ease – Smart Parking Management System

**project demo link**

```

```

**Spring Boot Internship Project**

Park Ease is a **production-grade Smart Parking Management System** built using **Spring Boot 3**, designed to simulate real-world urban parking operations.
It digitizes the complete parking lifecycle—from **remote booking** to **cashless exit**—while supporting **multiple roles**, **dynamic pricing**, **wallet-based payments**, and **real-time updates**.

---

## 📌 Project Highlights

- Stateless **JWT-based Authentication**
- Role-Based Access Control (**ADMIN, AREA_OWNER, GUARD, DRIVER**)
- **FAST MODE simulation** (1 second = 1 minute)
- Real-time updates using **WebSocket (STOMP)**
- Automated **Indore city data seeding**
- Wallet + Outstanding Due system (FASTag model)
- Vehicle-slot compatibility enforcement
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

# recommended

```
git clone https://github.com/chetankhairnar05/Park_Ease_Batch_10.git

cd Park_Ease_Batch_10

.\mvnw.cmd spring-boot:run
# in windows cmd

```

On first startup, **AdminSeeder** automatically populates the database.

### Frontend

Open:

method 1:

```
http://localhost:8080/auth.html
```

method2:

using live server

install live server vs code extention else javascript will not work

```
frontend1/auth.html
#open this using live server
```

using **Live Server** (VS Code) or any static server.

---

# 🌱 Default Seeded Users (Auto-Created)

> All users share the same password for testing.

**Common Password:** `1234`

## 👤 Admin Accounts

| Role  | Email                                       | Password |
| ----- | ------------------------------------------- | -------- |
| ADMIN | [admin1@gmail.com](mailto:admin1@gmail.com) | 1234     |
| ADMIN | [admin2@gmail.com](mailto:admin2@gmail.com) | 1234     |
| ADMIN | [admin3@gmail.com](mailto:admin3@gmail.com) | 1234     |

---

## 🏢 Area Owner Accounts

| Role       | Email                                       | Password |
| ---------- | ------------------------------------------- | -------- |
| AREA_OWNER | [owner1@gmail.com](mailto:owner1@gmail.com) | 1234     |
| AREA_OWNER | [owner2@gmail.com](mailto:owner2@gmail.com) | 1234     |
| AREA_OWNER | [owner3@gmail.com](mailto:owner3@gmail.com) | 1234     |

Each Area Owner controls **2 parking areas**.

---

## 🚗 Driver Accounts

| Role   | Email                                     | Password | Wallet |
| ------ | ----------------------------------------- | -------- | ------ |
| DRIVER | [user1@gmail.com](mailto:user1@gmail.com) | 1234     | ₹2000  |
| DRIVER | [user2@gmail.com](mailto:user2@gmail.com) | 1234     | ₹2000  |
| DRIVER | [user3@gmail.com](mailto:user3@gmail.com) | 1234     | ₹2000  |

Each driver has **2 vehicles**, one marked as **Primary**.

---

## 🛡️ Guard Accounts

Guards are auto-created **per parking area**.

**Email Pattern**

```
guard{AreaId}_{Number}@gmail.com
```

Example:

```
guard1_1@gmail.com
guard1_2@gmail.com
```

**Password:** `1234`

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

| Role       | Capabilities                    |
| ---------- | ------------------------------- |
| ADMIN      | Create Area Owners              |
| AREA_OWNER | Manage areas, slots, guards     |
| GUARD      | Verify entry, force-end parking |
| DRIVER     | Book, park, pay                 |

---

## ⏱️ FAST MODE (IMPORTANT)

### ⚡ Time Acceleration Logic

```
1 Real Second = 1 Virtual Minute
```

### Why FAST MODE?

To **demonstrate real parking behavior quickly** during testing and evaluation.

| Feature         | Real World | Park Ease  |
| --------------- | ---------- | ---------- |
| Grace Period    | 10 minutes | 10 seconds |
| Parking Time    | 60 minutes | 60 seconds |
| No-show Timeout | 30 minutes | 30 seconds |

Implemented in **BookingService** using `Duration.toSeconds()`.

---

# 🚘 Booking Lifecycle (State Machine)

## 1️⃣ Reservation (Remote Booking)

- Status: `RESERVED`
- Slot marked as `RESERVED`
- Grace Period: **10 virtual minutes**
- Auto-cancel after **30 virtual minutes** (Scheduler)

---

## 2️⃣ Arrival (QR Scan)

- Status → `ACTIVE_PARKING`
- Parking timer starts
- Reservation fee waived if arrival ≤ grace time

---

## 3️⃣ Exit & Payment

- User clicks **Stop & Pay**
- Bill calculation:

```
Reservation Fee + Parking Fee + Pending Dues
```

- Wallet deducted
- Slot released
- Status → `COMPLETED`
- Exit token generated

---

# 💳 Wallet & Due System (FASTag Model)

- Drivers maintain a **prepaid wallet**
- Automatic deduction on exit
- If payment fails:

  - Booking marked unpaid
  - Amount added to **Outstanding Due**
  - User blocked from new bookings until dues are cleared

---

# 🚙 Vehicle & Slot Logic

- Vehicles supported: **SMALL, MEDIUM, LARGE**
- Slot compatibility enforced:

  - SUV ❌ Small Slot
  - Bike ✔ Large Slot

- One vehicle marked as **Primary** for faster booking

---

# 🧩 Real-Time Communication (WebSocket)

- Slot updates broadcast to:

```
/topic/area/{areaId}/slots
```

- User booking updates sent to:

```
/user/queue/booking-updates
```

DTOs are used to prevent infinite serialization recursion.

---

# 🧪 Technology Stack

| Layer    | Technology              |
| -------- | ----------------------- |
| Backend  | Spring Boot 3.5.8       |
| Language | Java 21                 |
| ORM      | Hibernate / JPA         |
| Database | MySQL 8                 |
| Security | Spring Security 6 + JWT |
| Realtime | WebSocket (STOMP)       |
| API Docs | SpringDoc OpenAPI       |
| Frontend | HTML, Tailwind CSS, JS  |

---

# ✅ Conclusion

Park Ease demonstrates **real-world backend engineering practices**, including:

- Secure authentication
- Scalable layered architecture
- Transaction safety
- Real-time communication
- Business rule enforcement
