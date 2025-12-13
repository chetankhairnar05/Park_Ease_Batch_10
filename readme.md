# Park Ease – Smart Parking Management System

Park Ease is a production-grade Spring Boot application engineered to address modern urban parking challenges in India. It simulates a complete real-world parking ecosystem across multiple roles—Drivers, Guards, Area Owners, and Administrators—while featuring dynamic slot management, prepaid wallet payments (FASTag model), automated scheduling, and real-time updates.

---

## 1. Overview

Park Ease provides an end-to-end solution for digital parking management, integrating automated gate operations, QR-based arrival workflows, and role-based access control. The system is designed for scalability, operational efficiency, and fast transactions.

---

## 2. System Roles & Responsibilities

### ADMIN (Super User)

- Platform-level user.
- Creates and manages Area Owners.
- Full system governance.

### AREA OWNER

- Manages a specific parking area (mall, station, hospital, etc.).
- Configures pricing, capacity, and slot status.
- Recruits and manages Guards.

### GUARD

- Responsible for gate operations.
- Scans QR to verify driver arrival.
- Can force-stop parking sessions if required.

### DRIVER

- Books and manages parking.
- Registers vehicles.
- Uses wallet for payments.
- Views bookings and transactions.

---

## 3. Smart Booking Lifecycle

### Reservation

Driver reserves a slot remotely; reservation timer starts.

### Grace Period (10 Minutes)

If the driver arrives within 10 minutes, the reservation fee is waived.

### No-Show Handling (30 Minutes)

If the driver does not arrive:

- Booking auto-cancels.
- Penalty amount is charged.
- Slot returns to AVAILABLE.

### Arrival (QR Scan)

Driver scans QR code at the parking area. Booking becomes **ACTIVE_PARKING**.

### Exit & Billing

Driver ends parking:

- Charges = Reservation Fee + Parking Duration Fee.
- Wallet auto-deducts amount.

---

## 4. Wallet System (FASTag-Style)

- Drivers maintain prepaid balance.
- Auto-debit on exit.
- If insufficient balance:
  - Amount becomes **Outstanding Due**.
  - Account is blocked until dues are cleared.

---

## 5. Vehicle Management

- Drivers can register multiple vehicles (bike, car, etc.).
- One primary vehicle can be selected for one-click booking.
- Supports “Guest Access” for shared vehicles.

---

## 6. Technology Stack

| Layer      | Technology                 |
| ---------- | -------------------------- |
| Backend    | Java 21, Spring Boot 4.0.0 |
| Database   | MySQL                      |
| Security   | Spring Security 6, JWT     |
| Real-time  | WebSocket (STOMP)          |
| Scheduling | Spring Scheduler           |
| Build Tool | Maven                      |

---

## 7. Installation & Setup

### 1. Database Setup (MySQL)

```sql
CREATE DATABASE parking_db;
```

### 2. Configure application.properties

```sql
server.port=8080

spring.datasource.url=jdbc:mysql://localhost:3306/parking_db?createDatabaseIfNotExist=true
spring.datasource.username=YOUR_MYSQL_USERNAME
spring.datasource.password=YOUR_MYSQL_PASSWORD
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect

jwt.secret=YOUR_SECURE_SECRET_KEY

```

### 3. First Run – Super Admin Auto-Creation

- During first startup, the system seeds a default Admin user:

- Email: admin@parkease.com
- Password: admin123

This login ensures immediate access to admin operations.
