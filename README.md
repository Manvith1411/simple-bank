# SimpleBank — Full-Stack Banking Simulation (Node.js + Express + Modern UI)
A clean, beginner-friendly yet professional banking simulation system that demonstrates core banking concepts.
This project includes a REST API backend and a smooth, modern frontend with modal output, to simulate real banking operations.

## 🟡 Features
### Account Management
+ Create new accounts
+ List all accounts
+ View account balance

### Banking Operations
+ Deposit money
+ Withdraw money
+ Transfer funds between accounts
+ View transaction history

### Validations & Rules
+ Prevent overdrafts
+ Prevent negative transfers
+ Ensure account exists
+ All operations logged as transactions

### Modern Frontend UI
+ Clean dashboard layout
+ Smooth scroll navigation
+ Beautiful glassy design
+ Modal popup for API responses
+ Toast notifications
+ Fully responsive

### Backend Tech
+ Node.js
+ Express.js
+ File-based persistence (data.json)

## 🟡 API Documentation
### Create Account
```
POST /accounts
Body: { "name": "Alice", "initialDeposit": 2000 }
```
### Get All Accounts
```
GET /accounts
```

### Deposit
```
POST /accounts/:id/deposit
Body: { "amount": 500 }
```
### Withdraw
```
POST /accounts/:id/withdraw
Body: { "amount": 500 }
```
### Transfer
```
POST /transfer
Body: { "fromAccountId": 1, "toAccountId": 2, "amount": 300 }
```
### Transaction History
```
GET /accounts/:id/transactions
```
## 🟡 How to Run Locally
### Install dependencies
```
npm install
```
### Start server
```
npm run dev   # or node index.js
```
Backend runs at:
```
http://localhost:3000
```
### Open the frontend
Open:
```
http://localhost:3000
```
You’ll see the complete UI dashboard.

## 🟡 Screenshots
<img width="1360" height="631" alt="Screenshot (57)" src="https://github.com/user-attachments/assets/cd6f82c3-c485-46d6-b382-3198bf94e37d" />
<img width="1360" height="628" alt="Screenshot (58)" src="https://github.com/user-attachments/assets/1e98f8b1-cbb9-4782-a09b-4a42e9ac39c3" />
<img width="1357" height="634" alt="Screenshot (59)" src="https://github.com/user-attachments/assets/a43bf190-343e-41be-b146-bc45138eb209" />
<img width="1360" height="629" alt="Screenshot (60)" src="https://github.com/user-attachments/assets/76d6ab88-09c8-42db-9f19-d9a6b0a4c5d7" />
